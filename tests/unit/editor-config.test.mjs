// SPDX-License-Identifier: GPL-3.0-only

import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeConfig } from '../../src/model/config.js';

// The pure editor patch helper does not construct a browser element.
globalThis.HTMLElement = class {};
const { patchConfig, ThermalIntelligenceCardEditor } = await import('../../src/editor/config-editor.js');

test('editor field changes retain unknown configuration and leave caller data untouched', () => {
  const source = {
    type: 'custom:thermal-intelligence-beta-card', entity: 'climate.example',
    future_option: { nested: ['retained'] },
    telemetry: [{ kind: 'humidity', entity: 'sensor.example_humidity', future_source: { enabled: true } }],
    humidity_bands: { low: 35, high: 65, future_band: { colour: 'muted' } },
    preset_labels: { frost: 'Frost protection', future_preset: 'Custom' },
  };
  const before = structuredClone(source);
  const edited = normalizeConfig(patchConfig(source, ['telemetry', 0, 'label'], 'Room humidity'));
  assert.deepEqual(source, before);
  assert.deepEqual(edited.future_option, source.future_option);
  assert.deepEqual(edited.telemetry[0].future_source, source.telemetry[0].future_source);
  assert.deepEqual(edited.humidity_bands.future_band, source.humidity_bands.future_band);
  assert.deepEqual(edited.preset_labels, source.preset_labels);
  assert.equal(edited.telemetry[0].label, 'Room humidity');
  edited.future_option.nested.push('local');
  edited.telemetry[0].future_source.enabled = false;
  assert.deepEqual(source, before);
});

test('clearing an optional field retains neighbouring fields and custom mappings', () => {
  const source = { entity: '', name: 'Draft', telemetry: [], preset_labels: { frost: 'Frost', comfort: 'Comfort' } };
  const noName = patchConfig(source, ['name'], undefined);
  const noFrost = normalizeConfig(patchConfig(noName, ['preset_labels', 'frost'], undefined));
  assert.equal(Object.hasOwn(noFrost, 'name'), false);
  assert.deepEqual(noFrost.preset_labels, { comfort: 'Comfort' });
  assert.equal(source.name, 'Draft');
  assert.equal(source.preset_labels.frost, 'Frost');
});

test('partial display preferences stay editable until both bounds are valid', () => {
  const start = normalizeConfig({ entity: '', future_option: true });
  const draft = patchConfig(start, ['humidity_bands', 'low'], 35);
  assert.throws(() => normalizeConfig(draft), /Humidity/);
  const complete = normalizeConfig(patchConfig(draft, ['humidity_bands', 'high'], 65));
  assert.deepEqual(complete.humidity_bands, { low: 35, high: 65 });
  assert.equal(complete.future_option, true);
  assert.equal(Object.hasOwn(start, 'humidity_bands'), false);
});

test('new empty telemetry source is a valid disabled row and cloned values are independent', () => {
  const added = [{ kind: 'custom', entity: '', future_source: { mode: 'display' } }];
  const updated = normalizeConfig(patchConfig({ entity: '' }, ['telemetry'], added));
  added[0].future_source.mode = 'changed';
  assert.equal(updated.telemetry[0].future_source.mode, 'display');
  assert.equal(updated.telemetry[0].entity, '');
});

test('editor rejects prototype mutation paths', () => {
  for (const path of [['__proto__', 'polluted'], ['preset_labels', 'constructor'], ['preset_labels', 'prototype']]) {
    assert.throws(() => patchConfig({}, path, 'unsafe'), /Invalid editor field/);
  }
  assert.equal({}.polluted, undefined);
});

test('host configuration echoes preserve drafts, while external undo loads the requested config', () => {
  const editor = Object.create(ThermalIntelligenceCardEditor.prototype);
  Object.assign(editor, {
    _sourceSignature: null, _lastEmittedSignature: null, _buffers: new Map(),
    _render() {}, dispatchEvent() {},
  });
  editor.setConfig({ entity: '', name: 'First' });
  editor._commit({ entity: '', name: 'Second' });
  const emitted = structuredClone(editor._draft);
  editor._draft = patchConfig(editor._draft, ['humidity_bands', 'low'], 35);
  editor._buffers.set('name', 'Typing');
  editor.setConfig(emitted);
  assert.equal(editor._draft.humidity_bands.low, 35);
  assert.equal(editor._buffers.get('name'), 'Typing');
  editor.setConfig({ entity: '', name: 'External change' });
  assert.equal(editor._draft.name, 'External change');
  assert.equal(editor._buffers.size, 0);
  editor.setConfig(emitted);
  assert.equal(editor._draft.name, 'Second');
  assert.equal(Object.hasOwn(editor._draft, 'humidity_bands'), false);
});

test('editor emits a complete isolated configuration only after a valid intentional edit', () => {
  const events = [];
  const editor = Object.create(ThermalIntelligenceCardEditor.prototype);
  Object.assign(editor, {
    _sourceSignature: null, _lastEmittedSignature: null, _buffers: new Map(),
    _render() {}, _refreshFieldState() {}, dispatchEvent(event) { events.push(event); },
  });
  const input = { entity: '', future_option: { keep: true } };
  editor.setConfig(input);
  assert.equal(events.length, 0);
  editor._change(['step'], 0);
  assert.equal(events.length, 0);
  assert.match(editor._error, /not been applied/);
  editor._change(['step'], 0.5);
  assert.equal(events.length, 1);
  assert.equal(events[0].type, 'config-changed');
  assert.equal(events[0].bubbles, true);
  assert.equal(events[0].composed, true);
  assert.equal(events[0].detail.config.type, 'custom:thermal-intelligence-beta-card');
  assert.equal(events[0].detail.config.step, 0.5);
  assert.deepEqual(events[0].detail.config.future_option, { keep: true });
  events[0].detail.config.future_option.keep = false;
  assert.equal(editor._draft.future_option.keep, true);
  assert.deepEqual(input, { entity: '', future_option: { keep: true } });
});

test('the rendered add-source action retains edits committed since it was rendered', () => {
  const previousDocument = globalThis.document;
  const node = () => ({ dataset: {}, children: [], append(...children) { this.children.push(...children); } });
  globalThis.document = { createElement: node };
  try {
    const actions = new Map();
    const events = [];
    const editor = Object.create(ThermalIntelligenceCardEditor.prototype);
    Object.assign(editor, {
      _sourceSignature: null, _lastEmittedSignature: null, _buffers: new Map(),
      _render() {}, _refreshFieldState() {}, _details: node, _field: node,
      _button(label, action, callback) { actions.set(action, callback); return node(); },
      dispatchEvent(event) { events.push(event); },
    });
    const source = { entity: '', telemetry: [
      { kind: 'humidity', entity: 'sensor.example_humidity', future_source: { retained: true } },
      { kind: 'valve', entity: 'sensor.example_valve' },
    ] };
    editor.setConfig(source);
    editor._telemetry({});
    // Native change fires on blur before the already-rendered Add button's click.
    editor._change(['telemetry', 0, 'label'], 'Typed label');
    editor._change(['telemetry', 1, 'attribute'], 'position');
    actions.get('add-telemetry')();
    const saved = events.at(-1).detail.config;
    assert.equal(saved.telemetry.length, 3);
    assert.equal(saved.telemetry[0].label, 'Typed label');
    assert.equal(saved.telemetry[1].attribute, 'position');
    assert.deepEqual(saved.telemetry[0].future_source, { retained: true });
    assert.deepEqual(saved.telemetry[2], { kind: 'custom', entity: '' });
    assert.equal(Object.hasOwn(source.telemetry[0], 'label'), false);
  } finally {
    if (previousDocument === undefined) delete globalThis.document;
    else globalThis.document = previousDocument;
  }
});

test('source background and feature edits preserve independent mappings and unknown row fields', () => {
  const source = { entity: '', background: 'blue', theme: 'dark', trend_entity: 'sensor.trend', humidity_entity: 'sensor.humidity', valve_position_entity: 'sensor.valve', features: [{ entity: 'sensor.feature', icon: 'mdi:thermometer', future: { keep: true } }], telemetry: [{ kind: 'custom', entity: 'sensor.other' }] };
  const next = normalizeConfig(patchConfig(patchConfig(source, ['background'], 'plum'), ['features', 0, 'label'], 'Mapped reading'));
  assert.equal(next.background, 'plum'); assert.equal(next.theme, 'dark'); assert.equal(source.background, 'blue');
  for (const key of ['trend_entity', 'humidity_entity', 'valve_position_entity']) assert.equal(next[key], source[key]);
  assert.deepEqual(next.telemetry, source.telemetry); assert.deepEqual(next.features[0].future, { keep: true }); assert.equal(next.features[0].label, 'Mapped reading');
  assert.equal(Object.hasOwn(source.features[0], 'label'), false);
});

test('rendered source mapping and feature controls expose every restored public field', () => {
  const previousDocument = globalThis.document;
  const node = () => ({ dataset: {}, children: [], append(...children) { this.children.push(...children); } });
  globalThis.document = { createElement: node };
  try {
    const fields = [], actions = new Map(), events = [];
    const editor = Object.create(ThermalIntelligenceCardEditor.prototype);
    Object.assign(editor, {
      _draft: { entity: '', features: [{ entity: 'sensor.feature', future: true }] }, _buffers: new Map(),
      _render() {}, _refreshFieldState() {}, _details: node,
      _field(label, key, value, options) { fields.push({ label, key, value, options }); return node(); },
      _button(label, action, callback) { actions.set(action, callback); return node(); },
      dispatchEvent(event) { events.push(event); },
    });
    editor._sourceMappings({}); editor._features({});
    for (const key of ['trend_entity', 'humidity_entity', 'valve_position_entity', 'features.0.entity', 'features.0.label', 'features.0.attribute', 'features.0.unit', 'features.0.icon', 'features.0.preset']) assert.ok(fields.some((field) => field.key === key), key);
    fields.find((field) => field.key === 'features.0.label').options.onChange('Latest label');
    actions.get('add-feature')();
    assert.equal(events.at(-1).detail.config.features[0].label, 'Latest label');
    assert.equal(events.at(-1).detail.config.features[0].future, true);
    assert.deepEqual(events.at(-1).detail.config.features[1], { entity: '' });
  } finally {
    if (previousDocument === undefined) delete globalThis.document;
    else globalThis.document = previousDocument;
  }
});

test('preset association dropdown exposes advertised and saved values and unsets without losing fields', () => {
  const previousDocument = globalThis.document;
  const node = () => ({ dataset: {}, children: [], append(...children) { this.children.push(...children); } });
  globalThis.document = { createElement: node };
  try {
    const fields = [], events = [];
    const editor = Object.create(ThermalIntelligenceCardEditor.prototype);
    Object.assign(editor, {
      _draft: { entity: 'climate.example', features: [{ entity: 'number.example', preset: 'custom', future: { retained: true } }], telemetry: [{ kind: 'custom', entity: 'sensor.example' }] }, _buffers: new Map(),
      _render() {}, _refreshFieldState() {}, _details: node, _button: node,
      _field(label, key, value, options) { fields.push({ key, value, options }); return node(); },
      dispatchEvent(event) { events.push(event); },
    });
    editor._features({ 'climate.example': { attributes: { preset_modes: ['none', 'eco', 'frost', 'eco'] } } });
    const association = fields.find((field) => field.key === 'features.0.preset');
    assert.deepEqual(association.options.options.map((option) => option[0]), ['', 'none', 'eco', 'frost', 'custom']);
    assert.equal(association.value, 'custom');
    association.options.onChange('frost'); assert.equal(events.at(-1).detail.config.features[0].preset, 'frost');
    association.options.onChange(''); const saved = events.at(-1).detail.config;
    assert.equal(Object.hasOwn(saved.features[0], 'preset'), false); assert.deepEqual(saved.features[0].future, { retained: true });
    assert.deepEqual(saved.telemetry, [{ kind: 'custom', entity: 'sensor.example' }]);
  } finally {
    if (previousDocument === undefined) delete globalThis.document; else globalThis.document = previousDocument;
  }
});

test('humidity editor exposes source defaults or legacy fields and resets without losing unknown keys', () => {
  const previousDocument = globalThis.document;
  const node = () => ({ dataset: {}, children: [], append(...children) { this.children.push(...children); } });
  globalThis.document = { createElement: node };
  try {
    const fields = [], actions = new Map(), events = [];
    const editor = Object.create(ThermalIntelligenceCardEditor.prototype);
    Object.assign(editor, {
      _draft: { entity: '' }, _buffers: new Map(), _render() {}, _refreshFieldState() {}, _details: node,
      _field(label, key, value, options) { fields.push({ key, value, options }); return node(); },
      _button(label, action, callback) { actions.set(action, callback); return node(); },
      dispatchEvent(event) { events.push(event); },
    });
    editor._advanced();
    for (const [key, expected] of [['dry_below', 30], ['good_min', 40], ['good_max', 60], ['wet_above', 70]]) assert.equal(fields.find((field) => field.key === `humidity_bands.${key}`).value, expected);
    assert.equal(events.length, 0); assert.equal(editor._draft.humidity_bands, undefined);
    fields.find((field) => field.key === 'humidity_bands.dry_below').options.onChange(25);
    assert.deepEqual(events.at(-1).detail.config.humidity_bands, { dry_below: 25, good_min: 40, good_max: 60, wet_above: 70 });
    editor._draft.humidity_bands = { low: 35.5, high: 65.5, future: { retained: true } };
    fields.length = 0; editor._advanced();
    assert.deepEqual(fields.filter((field) => field.key.startsWith('humidity_bands.')).map((field) => field.key), ['humidity_bands.low', 'humidity_bands.high']);
    fields.find((field) => field.key === 'humidity_bands.low').options.onChange(36.5);
    assert.deepEqual(events.at(-1).detail.config.humidity_bands, { low: 36.5, high: 65.5, future: { retained: true } });
    actions.get('clear-humidity-bands')();
    assert.deepEqual(events.at(-1).detail.config.humidity_bands, { future: { retained: true }, dry_below: 30, good_min: 40, good_max: 60, wet_above: 70 });
  } finally {
    if (previousDocument === undefined) delete globalThis.document; else globalThis.document = previousDocument;
  }
});

test('response evidence config remains optional and never promotes legacy mappings', () => {
  const source = { entity:'climate.example', overview:{room_sensor:'sensor.legacy_room',activity_entity:'climate.legacy_native'}, recovery_entity:'climate.legacy_output', response_freshness_minutes:15 };
  const normalized = normalizeConfig(source);
  assert.equal(Object.hasOwn(normalized, 'response_arc'), false);
  assert.deepEqual(normalized.overview, source.overview);
  assert.equal(normalized.recovery_entity, source.recovery_entity);
  assert.equal(normalized.response_freshness_minutes, 15);
  for (const response_arc of [{}, {room_sensor:'',native_thermostat:'',confirmed_output:'',heat_source:''}, {room_sensor:'sensor.room',native_thermostat:'climate.native',confirmed_output:'climate.output',heat_source:'climate.source',freshness_minutes:.25}]) {
    assert.deepEqual(normalizeConfig({entity:'',response_arc}).response_arc, response_arc);
  }
  assert.equal(Object.hasOwn(normalizeConfig({entity:'',response_arc:{}}).response_arc, 'freshness_minutes'), false);
});

test('response evidence validates domains and finite positive freshness through 30 minutes', () => {
  for (const response_arc of [null, [], true, 'sensor.example']) assert.throws(()=>normalizeConfig({entity:'',response_arc}), /response_arc must be an object/);
  for (const [key, wrong] of [['room_sensor','climate.room'],['native_thermostat','sensor.native'],['confirmed_output','sensor.output'],['heat_source','switch.boiler']]) {
    for (const value of [wrong, null, 1, {}, [], ' ', 'sensor.', 'climate.bad-id']) assert.throws(()=>normalizeConfig({entity:'',response_arc:{[key]:value}}), new RegExp(`response_arc.${key}`));
  }
  for (const value of [0,-1,30.01,Infinity,NaN,'10',true,null]) assert.throws(()=>normalizeConfig({entity:'',response_arc:{freshness_minutes:value}}), /freshness_minutes/);
  for (const value of [.01,10,30]) assert.equal(normalizeConfig({entity:'',response_arc:{freshness_minutes:value}}).response_arc.freshness_minutes,value);
});

test('response editor edits and clears one mapping without losing nested advanced fields', () => {
  const events = [], source = {entity:'climate.example',response_arc:{room_sensor:'sensor.room',native_thermostat:'climate.native',freshness_minutes:12,future:{keep:['safe']}},future_top:{keep:true},overview:{room_sensor:'sensor.legacy'}};
  const before = structuredClone(source);
  const editor = Object.create(ThermalIntelligenceCardEditor.prototype);
  Object.assign(editor,{_sourceSignature:null,_lastEmittedSignature:null,_buffers:new Map(),_render(){},_refreshFieldState(){},dispatchEvent(event){events.push(event);}});
  editor.setConfig(source);assert.equal(events.length,0);
  editor._change(['response_arc','freshness_minutes'],0);assert.equal(events.length,0);assert.match(editor._error,/not been applied/);
  editor._change(['response_arc','freshness_minutes'],30);assert.equal(events.length,1);
  editor._change(['response_arc','room_sensor'],'');
  editor._change(['response_arc','freshness_minutes'],undefined);
  const saved = events.at(-1).detail.config;
  assert.equal(saved.response_arc.room_sensor,'');assert.equal(saved.response_arc.native_thermostat,'climate.native');assert.equal(Object.hasOwn(saved.response_arc,'freshness_minutes'),false);
  assert.deepEqual(saved.response_arc.future,{keep:['safe']});assert.deepEqual(saved.future_top,{keep:true});assert.deepEqual(saved.overview,{room_sensor:'sensor.legacy'});assert.deepEqual(source,before);
  saved.response_arc.future.keep.push('external');assert.deepEqual(editor._draft.response_arc.future,{keep:['safe']});
});

test('response visual section exposes all optional mappings without writing defaults', () => {
  const previousDocument = globalThis.document;
  const node = () => ({dataset:{},children:[],append(...children){this.children.push(...children);}});
  globalThis.document={createElement:node};
  try {
    const fields=[],events=[];
    const editor=Object.create(ThermalIntelligenceCardEditor.prototype);
    Object.assign(editor,{_draft:{entity:''},_buffers:new Map(),_render(){},_refreshFieldState(){},_details:node,
      _field(label,key,value,options){fields.push({label,key,value,options});return node();},dispatchEvent(event){events.push(event);}});
    editor._responseArc({'sensor.room':{attributes:{}},'climate.native':{attributes:{}},'switch.other':{attributes:{}}});
    assert.deepEqual(fields.map(field=>field.key),['response_arc.room_sensor','response_arc.native_thermostat','response_arc.confirmed_output','response_arc.heat_source','response_arc.freshness_minutes']);
    assert.equal(events.length,0);assert.equal(editor._draft.response_arc,undefined);
    const freshness=fields.find(field=>field.key==='response_arc.freshness_minutes');assert.equal(freshness.value,undefined);assert.equal(freshness.options.placeholder,'10 minutes (default)');
    fields.find(field=>field.key==='response_arc.room_sensor').options.onChange('sensor.room');
    assert.deepEqual(events.at(-1).detail.config.response_arc,{room_sensor:'sensor.room'});
  } finally {if(previousDocument===undefined)delete globalThis.document;else globalThis.document=previousDocument;}
});
