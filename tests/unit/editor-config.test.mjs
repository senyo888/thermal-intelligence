// SPDX-License-Identifier: GPL-3.0-only

import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeConfig } from '../../src/model/config.js';

// The pure editor patch helper does not construct a browser element.
globalThis.HTMLElement = class {};
const { patchConfig, ThermalIntelligenceCardEditor } = await import('../../src/editor/config-editor.js');

test('editor field changes retain unknown configuration and leave caller data untouched', () => {
  const source = {
    type: 'custom:thermal-intelligence-card', entity: 'climate.example',
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
  assert.equal(events[0].detail.config.type, 'custom:thermal-intelligence-card');
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
