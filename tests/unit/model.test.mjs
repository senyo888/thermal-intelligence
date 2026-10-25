// SPDX-License-Identifier: GPL-3.0-only
import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeConfig, finiteNumber } from '../../src/model/config.js';
import { buildModel, quantize, targetPayload, FEATURES } from '../../src/model/climate.js';
import { readOwnPath } from '../../src/model/telemetry.js';
import { HUMIDITY_DEFAULTS, humidityBands, humidityBand, humidityGradient, moveHumidityBoundary, validHumidityBands, legacyHumidityBands } from '../../src/model/humidity.js';

const entity = 'climate.example';
const identity = { entity_id: entity, platform: 'generic_thermostat' };
const vtIdentity = { entity_id: entity, platform: 'versatile_thermostat' };
const config = { entity };
function fixture(attributes = {}, options = {}) {
  return {
    connected: true,
    config: { unit_system: { temperature: '°C' } },
    services: { climate: Object.fromEntries(['set_temperature', 'set_hvac_mode', 'set_preset_mode', 'set_fan_mode', 'set_swing_mode', 'set_swing_horizontal_mode'].map((key) => [key, {}])) },
    states: { [entity]: { state: 'heat', attributes: { supported_features: 17, hvac_modes: ['off', 'heat'], preset_modes: ['none', 'eco', 'comfort'], preset_mode: 'none', temperature: 20, current_temperature: 19.8, min_temp: 5, max_temp: 30, target_temp_step: 0.5, hvac_action: 'idle', ...attributes } } },
    ...options,
  };
}

test('setup config has public defaults and preserves unknown nested fields without mutation', () => {
  const raw = { custom: { future: true }, preset_labels: { frost: 'Frost protection', private_provider_preset: 'Provider option' }, humidity_bands: { low: 35, high: 65, future: 'retained' }, telemetry: [{ kind: 'custom', entity: '', future: 'retained' }] };
  const before = JSON.stringify(raw);
  const c = normalizeConfig(raw);
  assert.equal(c.entity, ''); assert.equal(c.adapter, 'auto'); assert.equal(c.background, 'blue'); assert.equal(Object.hasOwn(c, 'theme'), false);
  assert.equal(c.show_activity, true); assert.equal(c.show_details, true); assert.equal(c.schema_version, 1);
  assert.equal(c.custom.future, true); assert.equal(c.humidity_bands.future, 'retained'); assert.equal(c.telemetry[0].future, 'retained');
  assert.equal(c.preset_labels.frost, 'Frost protection'); assert.equal(JSON.stringify(raw), before);
  assert.equal(buildModel(fixture(), c, null).canSet, false);
});

test('invalid config is rejected rather than silently normalised to control defaults', () => {
  for (const bad of [null, [], { schema_version: 2 }, { schema_version: '1' }, { entity: null }, { entity: 'sensor.example' }, { entity: 'climate.' }, { adapter: null }, { adapter: 'guess' }, { theme: null }, { step: 0 }, { step: -1 }, { step: NaN }, { step: '0.5' }, { show_details: 'false' }, { preset_labels: [] }, { preset_labels: { eco: '<script>' } }, { telemetry: [{ kind: 'humidity', entity: 'sensor.example', attribute: '__proto__.x' }] }, { humidity_bands: { low: 70, high: 20 } }]) {
    assert.throws(() => normalizeConfig(bad), undefined, JSON.stringify(bad));
  }
});

test('numeric parsing rejects coercion and non-finite states', () => {
  for (const value of [null, undefined, true, false, '', ' ', 'NaN', 'Infinity', NaN, Infinity, {}, [], ['20'], '0x10']) assert.equal(finiteNumber(value), null);
  for (const value of [20, '20', ' 20.25 ', '-1.5', '1e2']) assert.equal(finiteNumber(value), Number(value));
});

test('auto needs matching registry evidence; names never identify providers', () => {
  const h = fixture({ friendly_name: 'VTherm example', is_ready: true });
  assert.equal(buildModel(h, config, null).canSet, false);
  assert.equal(buildModel(h, config, identity).provider.kind, 'standard');
  assert.equal(buildModel(h, { ...config, adapter: 'standard' }, null).canSet, true);
  assert.equal(buildModel(h, { ...config, adapter: 'vtherm' }, null).canSet, true);
  for (const adapter of ['auto', 'standard', 'vtherm']) {
    const m = buildModel(h, { ...config, adapter }, { ...vtIdentity, entity_id: 'climate.other' });
    assert.equal(m.canSet, false); assert.equal(m.provider.status, 'invalid');
  }
  assert.equal(buildModel(h, { ...config, adapter: 'vtherm' }, identity).canSet, false);
});

test('known VT cannot bypass missing, false or malformed readiness with standard adapter', () => {
  for (const is_ready of [undefined, null, false, 'true', 1]) {
    const m = buildModel(fixture({ is_ready }), { ...config, adapter: 'standard' }, vtIdentity);
    assert.equal(m.provider.kind, 'vtherm'); assert.equal(m.canSet, false); assert.ok(m.choices.every((c) => !c.enabled));
  }
  const m = buildModel(fixture({ is_ready: true }), { ...config, adapter: 'standard' }, vtIdentity);
  assert.equal(m.canSet, true); assert.equal(m.readiness.status, 'ready');
});

test('VT lock restrictions distinguish user locks from automation-only locks', () => {
  const h = fixture({ is_ready: true, is_lock_configured: true, specific_states: { is_locked: true } });
  assert.equal(buildModel(h, config, vtIdentity).canSet, false);
  assert.equal(buildModel(h, config, vtIdentity).lock.status, 'locked');
  h.states[entity].attributes.lock_manager = { lock_users: false };
  assert.equal(buildModel(h, config, vtIdentity).canSet, true);
  assert.equal(buildModel(h, config, vtIdentity).lock.status, 'locked');
  delete h.states[entity].attributes.specific_states.is_locked;
  assert.equal(buildModel(h, config, vtIdentity).canSet, false);
  assert.equal(buildModel(h, config, vtIdentity).lock.status, 'unknown');
});

test('VT lock indication requires provider evidence and never invents an unlocked state', () => {
  const h = fixture({ is_ready: true, is_lock_configured: true, specific_states: { is_locked: false } });
  const read = () => buildModel(h, config, vtIdentity).lock;
  assert.equal(read().status, 'unlocked');
  assert.equal(buildModel(h, config, identity).lock, null);
  for (const value of [undefined, null, 'false', 0, 'true']) {
    h.states[entity].attributes.specific_states.is_locked = value;
    assert.equal(read().status, 'unknown');
  }
  h.states[entity].attributes.specific_states.is_locked = false;
  h.connected = false; assert.equal(read().status, 'unavailable');
  h.connected = true; h.states[entity].state = 'unavailable'; assert.equal(read().status, 'unavailable');
  h.states[entity].state = 'heat'; h.states[entity].attributes.is_lock_configured = false;
  assert.equal(read(), null);
  delete h.states[entity].attributes.is_lock_configured;
  delete h.states[entity].attributes.specific_states;
  assert.equal(read(), null);
});

test('categorical header telemetry uses canonical labels, changing icons and active colours', () => {
  const h = fixture();
  const id = 'binary_sensor.example';
  h.states[id] = { state: 'on', attributes: {} };
  for (const [kind, active, inactive, icon, colour] of [
    ['window','Open','Closed','mdi:window-closed-variant','#efb86b'],
    ['motion','Detected','Clear','mdi:motion-sensor-off','#b9a1e6'],
    ['presence','Home','Away','mdi:home-account','#7dc39c'],
    ['power_management','Limiting','Normal','mdi:transmission-tower','#efb86b'],
    ['follow','On','Off','mdi:link-variant','#73c9bd'],
  ]) {
    const read = () => buildModel(h, { ...config, telemetry: [{ kind, entity: id }] }, identity).headerTelemetry[0];
    h.states[id].state = 'on'; assert.equal(read().value, active); assert.equal(read().colour, colour);
    h.states[id].state = 'off'; assert.equal(read().value, inactive); assert.equal(read().icon, icon); assert.equal(read().activity, 'neutral');
    h.states[id].state = 'unknown'; assert.equal(read().value, 'Unknown'); assert.equal(read().activity, 'unknown');
    h.states[id].state = 'unavailable'; assert.equal(read().value, 'Unavailable'); assert.equal(read().colour, '#8795a8');
    h.states[id].state = 'unexpected'; assert.equal(read().status, 'invalid');
  }
  h.states[id].state = 'on'; h.states[id].attributes.unit_of_measurement = '%';
  assert.equal(buildModel(h, { ...config, telemetry: [{ kind: 'window', entity: id }] }, identity).telemetry[0].status, 'invalid');
});

test('VT categorical telemetry respects configured flags and never enables a feature', () => {
  const h = fixture({ is_ready: true, is_window_configured: false, window_manager: { window_state: 'on' } });
  const c = { ...config, telemetry: [{ kind: 'window', entity, attribute: 'window_manager.window_state' }] };
  const read = () => buildModel(h, c, vtIdentity);
  assert.equal(read().headerTelemetry[0].value, 'Not configured'); assert.equal(read().canSet, true);
  delete h.states[entity].attributes.is_window_configured;
  assert.equal(read().headerTelemetry[0].status, 'unknown');
  h.states[entity].attributes.is_window_configured = true;
  assert.equal(read().headerTelemetry[0].value, 'Open');
  delete h.states[entity].attributes.window_manager.window_state;
  assert.equal(read().headerTelemetry[0].status, 'unavailable'); assert.equal(read().canSet, true);
});

test('connection and entity availability gate every command', () => {
  for (const state of ['unknown', 'unavailable', '']) {
    const h = fixture(); h.states[entity].state = state;
    const m = buildModel(h, config, identity); assert.equal(m.canSet, false); assert.ok(m.choices.every((c) => !c.enabled));
  }
  const h = fixture({}, { connected: false });
  assert.equal(buildModel(h, config, identity).canSet, false);
  delete h.connected; h.connection = { connected: true };
  assert.equal(buildModel(h, config, identity).canSet, true);
  delete h.states[entity]; assert.equal(buildModel(h, config, identity).available, false);
});

test('temperature capability uses HA display units and provider limits', () => {
  const h = fixture();
  const m = buildModel(h, config, identity);
  assert.equal(m.unit, '°C'); assert.equal(m.step, 0.5); assert.equal(m.canSet, true);
  assert.deepEqual(targetPayload(m, 'temperature', 20.26), { temperature: 20.5 });
  const f = fixture({ min_temp: 40, max_temp: 90, target_temp_step: 1, temperature: 68, current_temperature: 66.5, configuration: { temperature_unit: '°C' } });
  f.config.unit_system.temperature = '°F';
  const fm = buildModel(f, config, identity);
  assert.equal(fm.unit, '°F'); assert.equal(fm.current, 66.5); assert.deepEqual(targetPayload(fm, 'temperature', 69.6), { temperature: 70 });
});

test('step fallback is explicit and invalid advertised steps cannot silently fall back', () => {
  const h = fixture(); delete h.states[entity].attributes.target_temp_step;
  assert.equal(buildModel(h, config, identity).step, 0.5);
  assert.equal(buildModel(h, { ...config, step: 0.25 }, identity).step, 0.25);
  h.config.unit_system.temperature = '°F'; assert.equal(buildModel(h, config, identity).step, 1);
  for (const invalid of [null, 0, -0.1, true, NaN, 'bad', 100]) {
    h.states[entity].attributes.target_temp_step = invalid;
    assert.equal(buildModel(h, { ...config, step: 1 }, identity).canSet, false);
  }
});

test('bad temperature data disables temperature independently of valid modes', () => {
  for (const attrs of [{ temperature: null }, { temperature: 'unavailable' }, { temperature: true }, { min_temp: 30 }, { max_temp: 'bad' }, { temperature: 100 }]) {
    const m = buildModel(fixture(attrs), config, identity); assert.equal(m.canSet, false); assert.equal(m.choices[0].enabled, true);
  }
  const h = fixture(); delete h.config.unit_system.temperature;
  assert.equal(buildModel(h, config, identity).canSet, false);
  assert.equal(buildModel(fixture({ supported_features: 0 }), config, identity).canSet, false);
});

test('services are required separately for temperature and each choice', () => {
  const h = fixture(); delete h.services.climate.set_temperature;
  let m = buildModel(h, config, identity); assert.equal(m.canSet, false); assert.equal(m.choices[0].enabled, true);
  h.services.climate = {}; m = buildModel(h, config, identity); assert.ok(m.choices.every((c) => !c.enabled));
  h.services.climate = Object.create({ set_temperature: {}, set_hvac_mode: {} });
  m = buildModel(h, config, identity); assert.equal(m.canSet, false); assert.equal(m.choices[0].enabled, false);
});

test('only supported advertised presets including Frost are offered; ownership stays unknown', () => {
  const m = buildModel(fixture({ preset_modes: ['none', 'frost', 'eco', 'frost'], preset_mode: 'none', temperature: 20 }), config, identity);
  assert.deepEqual(m.choices.find((c) => c.key === 'preset_mode').options, ['none', 'frost', 'eco']);
  assert.equal(m.ownership.label, 'Unknown');
  const unsupported = buildModel(fixture({ supported_features: 1, preset_modes: ['frost'] }), config, identity);
  assert.deepEqual(unsupported.choices.find((c) => c.key === 'preset_mode').options, []);
  assert.equal(unsupported.choices.find((c) => c.key === 'preset_mode').status, 'unsupported');
});

test('fan and both swing directions require their independent flags and option lists', () => {
  const h = fixture({ supported_features: 1 | FEATURES.FAN_MODE | FEATURES.SWING_MODE | FEATURES.SWING_HORIZONTAL_MODE, fan_modes: ['auto', 'low'], swing_modes: ['off', 'on'], swing_horizontal_modes: ['left', 'right'] });
  let m = buildModel(h, config, identity);
  for (const key of ['fan_mode', 'swing_mode', 'swing_horizontal_mode']) assert.equal(m.choices.find((c) => c.key === key).enabled, true);
  h.states[entity].attributes.fan_modes = []; m = buildModel(h, config, identity);
  assert.equal(m.choices.find((c) => c.key === 'fan_mode').enabled, false);
});

test('ranges preserve the other endpoint and reject crossing, bad partners or unsupported keys', () => {
  const h = fixture({ supported_features: 3, target_temp_low: 18, target_temp_high: 24 }); h.states[entity].state = 'heat_cool';
  const m = buildModel(h, config, identity);
  assert.equal(m.ranged, true); assert.deepEqual(targetPayload(m, 'target_temp_low', 19.3), { target_temp_low: 19.5, target_temp_high: 24 });
  assert.throws(() => targetPayload(m, 'target_temp_low', 25));
  assert.throws(() => targetPayload(m, 'temperature', 20));
  h.states[entity].attributes.target_temp_high = null; assert.equal(buildModel(h, config, identity).canSet, false);
  h.states[entity].state = 'heat'; assert.equal(buildModel(h, config, identity).ranged, false);
});

test('quantization stays on the min-anchored grid, bounds values and rejects invalid numbers', () => {
  assert.equal(quantize(21.19, 7.1, 30, 0.2), 21.1);
  assert.equal(quantize(100, 7.1, 30, 0.2), 29.9); assert.equal(quantize(-20, 7.1, 30, 0.2), 7.1);
  assert.equal(quantize(20.3, 5, 30, 0.1), 20.3);
  assert.equal(quantize(2e-11, 1e-11, 1e-10, 1e-11), 2e-11);
  for (const value of [NaN, Infinity, null, true, '20']) assert.throws(() => quantize(value, 5, 30, 0.5));
  assert.throws(() => quantize(20, 30, 5, 0.5)); assert.throws(() => quantize(20, 5, 30, 0));
  assert.throws(() => quantize(20, -1e308, 1e308, 1)); assert.throws(() => quantize(20, 5, 30, 1e-308));
});

test('activity remains attributable and never claims physical heat delivery', () => {
  assert.equal(buildModel(fixture({ hvac_action: 'heating' }), config, identity).activity.label, 'Heating (reported)');
  const vt = buildModel(fixture({ is_ready: true, hvac_action: 'heating' }), config, vtIdentity);
  assert.equal(vt.activity.label, 'Heat requested'); assert.match(vt.activity.detail, /not verified/);
  assert.equal(buildModel(fixture({ hvac_action: null }), config, identity).activity.label, 'Unknown');
});

test('VT feature evidence distinguishes disabled, expected missing and unknown configuration', () => {
  const m = buildModel(fixture({ is_ready: true, is_window_configured: true, is_motion_configured: false, is_safety_configured: true, safety_manager: { safety_state: 'unknown' }, is_presence_configured: true, presence_manager: { presence_state: 'on' } }), config, vtIdentity);
  const status = (label) => m.details.find((r) => r.label === label).status;
  assert.equal(status('Window'), 'unavailable'); assert.equal(status('Motion'), 'disabled'); assert.equal(status('Safety'), 'unknown'); assert.equal(status('Presence'), 'available'); assert.equal(status('Power limiting'), 'unknown');
});

test('VT climate regulation uses its declared internal unit and respects configuration evidence', () => {
  const attrs = { is_ready: true, configuration: { type: 'over_climate', temperature_unit: '°F' }, vtherm_over_climate: { is_regulated: true, regulation: { auto_regulation_mode: 'Light', regulated_target_temperature: 72.5 } } };
  const h = fixture(attrs);
  const detail = (label) => buildModel(h, config, vtIdentity).details.find((row) => row.label === label);
  assert.equal(buildModel(h, config, vtIdentity).unit, '°C');
  assert.equal(detail('Regulated target').unit, '°F'); assert.equal(detail('Regulated target').value, 72.5); assert.equal(detail('Regulation mode').value, 'Light');
  assert.equal(detail('Regulation demand').status, 'unsupported');
  delete attrs.configuration.temperature_unit; assert.equal(detail('Regulated target').status, 'unknown');
  attrs.vtherm_over_climate.is_regulated = false; assert.equal(detail('Regulated target').status, 'disabled');
  attrs.vtherm_over_climate.is_regulated = true; delete attrs.vtherm_over_climate.regulation; assert.equal(detail('Regulated target').status, 'unavailable');
  delete attrs.vtherm_over_climate.is_regulated; assert.equal(detail('Regulated target').status, 'unknown');
});

test('VT proportional and valve observations stay separate from physical device evidence', () => {
  for (const type of ['over_switch', 'over_valve', 'over_climate_valve']) {
    const attrs = { is_ready: true, configuration: { type, proportional_function: 'tpi' }, on_percent: 0.425, valve_open_percent: 37 };
    const h = fixture(attrs); const detail = (label) => buildModel(h, config, vtIdentity).details.find((row) => row.label === label);
    assert.equal(detail('Proportional function').value, 'tpi'); assert.equal(detail('Regulation demand').value, 42.5); assert.equal(detail('Regulation demand').unit, '%');
    assert.match(detail('Regulation demand').detail, /not measured/); assert.equal(detail('Regulation mode').status, 'unsupported');
    assert.equal(detail('Requested valve opening').status, type === 'over_switch' ? 'unsupported' : 'available');
    h.states[entity].attributes.on_percent = null; assert.equal(detail('Regulation demand').status, 'unknown');
    h.states[entity].attributes.on_percent = 1.2; assert.equal(detail('Regulation demand').status, 'invalid');
    delete h.states[entity].attributes.on_percent; assert.equal(detail('Regulation demand').status, 'unavailable');
    delete attrs.configuration.type; assert.equal(detail('Regulation demand').status, 'unknown');
  }
});

test('optional telemetry degrades independently and respects units and explicit freshness', () => {
  const now = Date.parse('2026-10-25T12:00:00Z');
  const h = fixture(); h.states['sensor.humidity'] = { state: '48.2', attributes: { unit_of_measurement: '%' }, last_updated: '2026-10-25T10:00:00Z' };
  const base = { kind: 'humidity', entity: 'sensor.humidity' };
  let m = buildModel(h, { ...config, humidity_bands: { low: 35, high: 65 }, telemetry: [base] }, identity, { now });
  assert.equal(m.telemetry[0].status, 'available'); assert.equal(m.telemetry[0].value, 48.2); assert.equal(m.telemetry[0].band, 'within'); assert.equal(m.canSet, true);
  m = buildModel(h, { ...config, telemetry: [{ ...base, max_age_seconds: 60 }] }, identity, { now });
  assert.equal(m.telemetry[0].status, 'stale'); assert.equal(m.canSet, true);
  m = buildModel(h, { ...config, telemetry: [{ ...base, unit: '°C' }] }, identity, { now }); assert.equal(m.telemetry[0].status, 'invalid');
  h.states['sensor.humidity'].state = 'unavailable'; m = buildModel(h, { ...config, telemetry: [base] }, identity, { now }); assert.equal(m.telemetry[0].status, 'unavailable'); assert.equal(m.canSet, true);
  assert.equal(buildModel(h, { ...config, telemetry: [{ ...base, entity: '' }] }, identity).telemetry[0].status, 'disabled');
});

test('telemetry own-property paths do not inherit values or unrelated sensor units', () => {
  const h = fixture(); h.states['sensor.example'] = { state: '20', attributes: { unit_of_measurement: '°C', diagnostics: { humidity: 45 } } };
  const base = { kind: 'humidity', entity: 'sensor.example', attribute: 'diagnostics.humidity' };
  assert.equal(buildModel(h, { ...config, telemetry: [base] }, identity).telemetry[0].status, 'invalid');
  assert.equal(buildModel(h, { ...config, telemetry: [{ ...base, unit: '%' }] }, identity).telemetry[0].status, 'available');
  h.states['sensor.example'].attributes.diagnostics = Object.create({ humidity: 45 });
  assert.equal(buildModel(h, { ...config, telemetry: [{ ...base, unit: '%' }] }, identity).telemetry[0].status, 'unavailable');
  assert.equal(readOwnPath({}, 'constructor.prototype').found, false);
});

test('invalid telemetry and missing/future timestamps retain uncertainty', () => {
  const now = Date.parse('2026-10-25T12:00:00Z');
  const h = fixture(); const base = { kind: 'valve', entity: 'sensor.example' };
  h.states['sensor.example'] = { state: '120', attributes: { unit_of_measurement: '%' } };
  assert.equal(buildModel(h, { ...config, telemetry: [base] }, identity).telemetry[0].status, 'invalid');
  h.states['sensor.example'].state = true;
  assert.equal(buildModel(h, { ...config, telemetry: [base] }, identity).telemetry[0].status, 'invalid');
  h.states['sensor.example'].state = '25';
  const c = { ...config, telemetry: [{ ...base, max_age_seconds: 300 }] };
  assert.equal(buildModel(h, c, identity, { now }).telemetry[0].status, 'unknown');
  h.states['sensor.example'].last_updated = '2026-10-25T12:01:00Z';
  assert.equal(buildModel(h, c, identity, { now }).telemetry[0].status, 'unknown');
  h.states['sensor.example'].last_updated = '2026-10-25T11:59:00Z';
  assert.equal(buildModel(h, c, identity, { now }).telemetry[0].status, 'available');
});

test('telemetry unit families cover signed trend, power, energy and custom reported values', () => {
  const h = fixture();
  h.states['sensor.trend'] = { state: '-0.25', attributes: { unit_of_measurement: '°C/h' } };
  h.states['sensor.power'] = { state: '1500', attributes: { unit_of_measurement: 'W' } };
  h.states['sensor.energy'] = { state: '3.2', attributes: { unit_of_measurement: 'kWh' } };
  h.states['sensor.reason'] = { state: 'Provider reported standby', attributes: {} };
  const telemetry = [{ kind: 'trend', entity: 'sensor.trend' }, { kind: 'power', entity: 'sensor.power' }, { kind: 'energy', entity: 'sensor.energy' }, { kind: 'custom', entity: 'sensor.reason' }];
  const m = buildModel(h, { ...config, telemetry }, identity);
  assert.ok(m.telemetry.every((r) => r.status === 'available')); assert.equal(m.telemetry[0].value, -0.25); assert.equal(m.telemetry[3].value, 'Provider reported standby');
});

test('model building is pure and performs no writes', () => {
  const h = fixture(); h.callService = () => assert.fail('A model must never dispatch.');
  const before = JSON.stringify(h); const c = normalizeConfig(config); const cBefore = JSON.stringify(c);
  for (let i = 0; i < 3; i++) buildModel(h, c, identity);
  assert.equal(JSON.stringify(h), before); assert.equal(JSON.stringify(c), cBefore);
});

test('source backgrounds and explicit mappings preserve existing telemetry and legacy fields', () => {
  for (const background of ['blue', 'plum', 'black']) assert.equal(normalizeConfig({ background }).background, background);
  const raw = { entity, background: 'plum', theme: 'dark', trend_entity: 'sensor.trend', humidity_entity: 'sensor.humidity', valve_position_entity: 'sensor.valve', telemetry: [{ kind: 'custom', entity: 'sensor.other' }], features: [{ entity: 'sensor.feature', attribute: 'diagnostics.value', label: 'Feature', unit: '%', icon: 'mdi:water-percent', future: { keep: true } }] };
  const c = normalizeConfig(raw);
  assert.equal(c.theme, 'dark'); assert.equal(c.background, 'plum'); assert.deepEqual(c.features, raw.features); assert.deepEqual(c.telemetry, raw.telemetry);
  for (const bad of [{ background: 'dark' }, { background: null }, { trend_entity: 'climate.example' }, { humidity_entity: 3 }, { valve_position_entity: 'sensor.' }, { features: {} }, { features: [{ entity: 'bad' }] }, { features: [{ entity: 'sensor.feature', attribute: 'constructor.prototype' }] }, { features: [{ entity: 'sensor.feature', icon: '<svg>' }] }]) assert.throws(() => normalizeConfig(bad));
});

test('portable features use own-property readings and never infer preset or ownership semantics', () => {
  const h = fixture({ preset_mode: 'none', temperature: 20 });
  h.states['sensor.example_preset_comfort_temp'] = { state: '20', attributes: { friendly_name: 'Comfort temperature', unit_of_measurement: '°C' } };
  h.states['binary_sensor.example'] = { state: 'on', attributes: { diagnostics: { ready: true }, icon: 'mdi:check' } };
  const features = [{ entity: 'sensor.example_preset_comfort_temp' }, { entity: 'binary_sensor.example', attribute: 'diagnostics.ready', label: 'Reported readiness' }];
  const m = buildModel(h, { ...config, features }, identity);
  assert.equal(m.state, 'heat'); assert.equal(m.attrs.preset_mode, 'none'); assert.equal(m.headerTelemetry[0].value, '20 °C');
  assert.equal(m.headerTelemetry[0].preset, null); assert.equal(m.headerTelemetry[0].activity, 'neutral'); assert.equal(m.ownership.label, 'Unknown');
  assert.equal(m.headerTelemetry[1].value, 'On'); assert.equal(m.headerTelemetry[1].activity, 'active'); assert.equal(m.headerTelemetry[1].icon, 'mdi:check');
  h.states['binary_sensor.example'].attributes.diagnostics = Object.create({ ready: true });
  assert.equal(buildModel(h, { ...config, features }, identity).headerTelemetry[1].status, 'unavailable');
});

test('direct mappings take precedence over declared typed telemetry without guessing a replacement', () => {
  const h = fixture();
  h.states['sensor.humidity'] = { state: '48', attributes: { unit_of_measurement: '%' } };
  h.states['sensor.valve'] = { state: '12.5', attributes: { unit_of_measurement: '%' } };
  const telemetry = [{ kind: 'humidity', entity: 'sensor.humidity' }, { kind: 'valve', entity: 'sensor.valve' }];
  const fallback = buildModel(h, { ...config, telemetry }, identity);
  assert.equal(fallback.humidity.value, 48); assert.equal(fallback.output.percentage, 12.5); assert.equal(fallback.output.text, 'TRV Open · 12.5%');
  const direct = buildModel(h, { ...config, telemetry, humidity_entity: 'sensor.missing', valve_position_entity: 'sensor.missing' }, identity);
  assert.equal(direct.humidity.status, 'unavailable'); assert.equal(direct.output.percentage, null); assert.equal(direct.output.text, 'TRV unavailable'); assert.equal(direct.canSet, true);
  const blank = buildModel(h, { ...config, telemetry, valve_position_entity: '' }, identity);
  assert.equal(blank.output.status, 'disabled'); assert.equal(blank.output.percentage, null);
});

test('source trend presentation preserves original hourly colours and labels across supported units', () => {
  const h = fixture(); h.states['sensor.trend'] = { state: '0.40', attributes: { unit_of_measurement: '°C/hour' } };
  const c = { ...config, trend_entity: 'sensor.trend' };
  let m = buildModel(h, c, identity);
  assert.equal(m.trend.text, 'Rising · +0.40 °C/hour'); assert.equal(m.trend.color, '#ff962e');
  h.states['sensor.trend'].state = '-3'; m = buildModel(h, c, identity); assert.equal(m.trend.label, 'Falling'); assert.equal(m.trend.color, '#4169ff');
  h.states['sensor.trend'] = { state: '0.08', attributes: { unit_of_measurement: '°F/hr' } }; m = buildModel(h, c, identity); assert.equal(m.trend.label, 'Stable'); assert.equal(m.trend.color, '#62e3b0');
  h.states['sensor.trend'] = { state: '0.01', attributes: { unit_of_measurement: '°C/min' } }; m = buildModel(h, c, identity); assert.equal(m.trend.label, 'Rising');
  h.states['sensor.trend'].attributes.unit_of_measurement = 'W'; m = buildModel(h, c, identity); assert.equal(m.trend.available, false); assert.equal(m.trend.status, 'invalid'); assert.equal(m.canSet, true);
});

test('source output preserves TRV observation wording and separates VT demand from physical heating', () => {
  const h = fixture({ is_ready: true, hvac_action: 'heating' });
  assert.equal(buildModel(h, config, vtIdentity).output.text, 'Heat requested');
  assert.equal(buildModel(h, config, vtIdentity).output.tone, 'request');
  h.states['sensor.valve'] = { state: '0', attributes: { unit_of_measurement: '%' } };
  const c = { ...config, valve_position_entity: 'sensor.valve' };
  let m = buildModel(h, c, vtIdentity); assert.equal(m.output.text, 'TRV Closed · 0%'); assert.equal(m.output.tone, 'neutral');
  h.states['sensor.valve'].state = '0.4'; m = buildModel(h, c, vtIdentity); assert.equal(m.output.text, 'TRV Open · <1%'); assert.match(m.output.detail, /does not establish/);
  h.connected = false; m = buildModel(h, c, vtIdentity); assert.equal(m.output.status, 'unavailable'); assert.equal(m.output.percentage, null);
});

test('all direct sources enforce finite data, compatible units and independently degraded evidence', () => {
  for (const [key, unit, read] of [
    ['trend_entity', '°C/hour', (m) => m.trend],
    ['humidity_entity', '%', (m) => m.humidity],
    ['valve_position_entity', '%', (m) => m.output],
  ]) {
    const h = fixture(), c = { ...config, [key]: 'sensor.source' };
    const check = (state, units = unit) => {
      h.states['sensor.source'] = { state, attributes: { unit_of_measurement: units } };
      const model = buildModel(h, c, identity); assert.equal(model.canSet, true);
      return read(model).status;
    };
    assert.equal(check('12'), 'available', key);
    for (const state of [NaN, Infinity, '', ' ', true, false, {}, [], 'NaN', 'Infinity']) assert.equal(check(state), 'invalid', `${key}: ${String(state)}`);
    assert.equal(check(null), 'unknown', key); assert.equal(check('unknown'), 'unknown', key); assert.equal(check('unavailable'), 'unavailable', key);
    assert.equal(check('12', 'W'), 'invalid', key);
    h.states['sensor.source'].attributes = {}; assert.equal(read(buildModel(h, c, identity)).status, 'invalid', key);
    if (unit === '%') { assert.equal(check(-1), 'invalid', key); assert.equal(check(101), 'invalid', key); }
    delete h.states['sensor.source']; assert.equal(read(buildModel(h, c, identity)).status, 'unavailable', key);
  }
  const h = fixture(); h.states['sensor.trend'] = { state: '1e308', attributes: { unit_of_measurement: '°C/min' } };
  assert.equal(buildModel(h, { ...config, trend_entity: 'sensor.trend' }, identity).trend.status, 'invalid');
});

test('direct sources retain an explicitly configured age limit for the same typed state source', () => {
  const h = fixture(), now = Date.parse('2026-10-25T12:00:00Z');
  h.states['sensor.humidity'] = { state: '48', attributes: { unit_of_measurement: '%' }, last_updated: '2026-10-25T10:00:00Z' };
  const c = { ...config, humidity_entity: 'sensor.humidity', telemetry: [{ kind: 'humidity', entity: 'sensor.humidity', label: 'Measured humidity', max_age_seconds: 300 }] };
  const m = buildModel(h, c, identity, { now });
  assert.equal(m.humidity.status, 'stale'); assert.equal(m.headerTelemetry.length, 1); assert.equal(m.headerTelemetry[0].status, 'stale'); assert.equal(m.headerTelemetry[0].label, 'Measured humidity'); assert.equal(m.canSet, true);
});

test('target comparison arc preserves original below, at and above colours in display units', () => {
  for (const unit of ['°C', '°F']) {
    const h = fixture({ temperature: 20 }); h.config.unit_system.temperature = unit;
    for (const [current, color, reason] of [[19.9, '#50c8ff', 'below_target'], [20, '#62e3b0', 'at_target'], [20.2, '#62e3b0', 'at_target'], [20.21, '#c4a7ff', 'above_target']]) {
      h.states[entity].attributes.current_temperature = current;
      const arc = buildModel(h, config, identity).arc;
      assert.equal(arc.color, color, `${unit}: ${current}`); assert.equal(arc.reason, reason); assert.equal(arc.responding, false);
      assert.ok(Math.abs(arc.delta - (current - 20)) < 1e-9); assert.match(arc.explanation, /target comparison/i);
    }
  }
});

test('target comparison arc uses selected climate mode and reported cooling without claiming warming', () => {
  const h = fixture({ is_ready: true, current_temperature: 19, temperature: 20, hvac_action: 'heating', current_state: { hvac_mode: 'off', target_temperature: 70 }, configuration: { temperature_unit: '°F' } });
  let m = buildModel(h, config, vtIdentity);
  assert.equal(m.arc.color, '#50c8ff'); assert.equal(m.arc.delta, -1); assert.equal(m.arc.responding, false);
  h.states[entity].state = 'off'; m = buildModel(h, config, vtIdentity); assert.equal(m.arc.color, '#7c8ba2'); assert.equal(m.arc.reason, 'off');
  h.states[entity].state = 'cool'; h.states[entity].attributes.hvac_action = 'cooling'; m = buildModel(h, config, vtIdentity); assert.equal(m.arc.color, '#66cfff'); assert.equal(m.arc.reason, 'cooling'); assert.equal(m.arc.responding, false);
  for (const mode of ['heat', 'auto', 'dry', 'fan_only']) {
    h.states[entity].state = mode; h.states[entity].attributes.hvac_action = 'idle'; m = buildModel(h, config, vtIdentity); assert.equal(m.arc.color, '#50c8ff', mode);
  }
  h.states[entity].state = 'unrecognized_mode'; assert.equal(buildModel(h, config, vtIdentity).arc.reason, 'mode_unknown');
});

test('target comparison arc remains unknown for unavailable readiness, ranges, units and target evidence', () => {
  const cases = [
    fixture({}, { connected: false }),
    fixture({ current_temperature: null }),
    fixture({ current_temperature: NaN }),
    fixture({ temperature: null }),
    fixture({ temperature: 31 }),
    fixture({ min_temp: 30 }),
    fixture({ min_temp: -1e308, max_temp: 1e308 }),
    fixture({ supported_features: 0 }),
    fixture({ supported_features: 2, target_temp_low: 18, target_temp_high: 24 }),
  ];
  const unavailable = fixture(); unavailable.states[entity].state = 'unavailable'; cases.push(unavailable);
  const unknownUnit = fixture(); unknownUnit.config.unit_system.temperature = undefined; cases.push(unknownUnit);
  for (const h of cases) {
    const arc = buildModel(h, config, identity).arc; assert.equal(arc.color, '#94a3b8'); assert.equal(arc.responding, false); assert.equal(arc.delta, null);
  }
  const vt = buildModel(fixture({ is_ready: false }), config, vtIdentity); assert.equal(vt.arc.color, '#94a3b8'); assert.equal(vt.arc.reason, 'unavailable');
  const registryUnknown = buildModel(fixture(), config, null); assert.equal(registryUnknown.arc.color, '#94a3b8');
});

function presetFixture(unit = '°C') {
  const h = fixture({ preset_modes: ['none', 'eco', 'comfort', 'boost'], preset_mode: 'comfort', temperature: 21 });
  h.config.unit_system.temperature = unit;
  const features = ['boost', 'comfort', 'eco'].map((preset, index) => {
    const id = `number.fixture_${index}`;
    h.states[id] = { state: String([23, 21, 17][index]), attributes: { unit_of_measurement: unit } };
    return { entity: id, label: preset.toUpperCase(), preset, future: { retained: true } };
  });
  return { h, c: { ...config, features } };
}

test('preset associations are explicit exact strings and retain unknown fields', () => {
  const raw = { features: [{ entity: 'number.fixture', preset: 'Provider Frost', future: { retained: true } }] };
  assert.deepEqual(normalizeConfig(raw).features, raw.features);
  for (const preset of ['', ' ', null, true, 7, '<eco>', '__proto__', 'constructor', 'prototype']) assert.throws(() => normalizeConfig({ features: [{ entity: 'number.fixture', preset }] }));
});

test('only the exact selected preset contributes an active header source', () => {
  for (const unit of ['°C', '°F']) {
    const { h, c } = presetFixture(unit);
    const m = buildModel(h, c, identity);
    assert.equal(m.headerTelemetry.length, 1); assert.equal(m.headerTelemetry[0].preset, 'comfort');
    assert.equal(m.headerTelemetry[0].value, `21 ${unit}`); assert.equal(m.headerTelemetry[0].icon, 'mdi:sofa');
    assert.equal(m.presetReadings.eco.value, 17); assert.equal(m.presetReadings.boost.value, 23);
    assert.equal(m.presetReadings.comfort.source.entity, c.features[1].entity); assert.equal(m.presetReadings.comfort.selected, true);
    assert.equal(m.presetReadings.eco.selected, false); assert.equal(m.presetReadings.none.status, 'disabled');
    h.states['sensor.humidity'] = { state: '58.5', attributes: { unit_of_measurement: '%' } };
    const withHumidity = buildModel(h, { ...c, humidity_entity: 'sensor.humidity' }, identity);
    assert.equal(withHumidity.headerTelemetry[0].preset, 'comfort'); assert.equal(withHumidity.headerTelemetry[1].kind, 'humidity'); assert.equal(withHumidity.headerTelemetry[1].colour, '#7dc39c');
    h.states[entity].attributes.preset_mode = 'eco';
    const renamed = buildModel(h, { ...c, preset_labels: { eco: 'Comfort' } }, identity);
    assert.equal(renamed.headerTelemetry[0].preset, 'eco'); assert.equal(renamed.headerTelemetry[0].shortLabel, 'Comfort');
  }
});

test('preset header suppression follows ready Heat and exact selection, never temperature coincidence', () => {
  const { h, c } = presetFixture();
  h.states['sensor.feature'] = { state: '42', attributes: {} }; c.features.push({ entity: 'sensor.feature', label: 'Unassociated' });
  const expectNoPreset = (model) => { assert.equal(model.headerTelemetry.some((row) => row.preset), false); assert.equal(model.headerTelemetry.some((row) => row.label === 'Unassociated'), true); };
  h.states[entity].attributes.preset_mode = 'none'; expectNoPreset(buildModel(h, c, identity));
  h.states[entity].attributes.preset_mode = 'COMFORT'; expectNoPreset(buildModel(h, c, identity));
  h.states[entity].attributes.preset_mode = 'comfort';
  for (const mode of ['off', 'cool', 'auto', 'unavailable']) { h.states[entity].state = mode; expectNoPreset(buildModel(h, c, identity)); }
  h.states[entity].state = 'heat'; h.connected = false; expectNoPreset(buildModel(h, c, identity));
  h.connected = true; h.states[entity].attributes.is_ready = false; expectNoPreset(buildModel(h, c, vtIdentity));
  expectNoPreset(buildModel(h, c, null));
});

test('preset readings reject unsupported, duplicate, unavailable, nonfinite and incompatible evidence', () => {
  const { h, c } = presetFixture(); const id = c.features[1].entity;
  const read = (overrides = c) => buildModel(h, overrides, identity);
  for (const value of [NaN, Infinity, 'Infinity', 'not numeric', true, {}, []]) {
    h.states[id].state = value; assert.equal(read().presetReadings.comfort.status, 'invalid'); assert.equal(read().headerTelemetry.length, 0);
  }
  h.states[id].state = '21';
  for (const unit of ['°F', '%', undefined]) { h.states[id].attributes.unit_of_measurement = unit; assert.equal(read().presetReadings.comfort.status, 'invalid'); }
  h.states[id].attributes.unit_of_measurement = '°C';
  const duplicate = { ...c, features: [...c.features, { entity: id, preset: 'comfort' }] };
  assert.equal(read(duplicate).presetReadings.comfort.status, 'invalid'); assert.equal(read(duplicate).headerTelemetry.length, 0);
  h.states[id].state = 'unavailable'; assert.equal(read().presetReadings.comfort.status, 'unavailable');
  h.states[id].state = '21'; h.states[entity].attributes.preset_modes = ['none', 'eco'];
  assert.equal(read().presetReadings.comfort.status, 'unsupported'); assert.equal(read().headerTelemetry.length, 0);
  h.states[entity].attributes.preset_modes.push('comfort'); h.config.unit_system.temperature = undefined;
  assert.equal(read().presetReadings.comfort.status, 'unknown');
});

test('preset attribute observations use only own fields and explicit units', () => {
  const { h, c } = presetFixture(), id = c.features[1].entity;
  c.features[1].attribute = 'diagnostics.value'; h.states[id].attributes.diagnostics = { value: 21 };
  assert.equal(buildModel(h, c, identity).presetReadings.comfort.status, 'invalid');
  c.features[1].unit = '°C'; assert.equal(buildModel(h, c, identity).presetReadings.comfort.value, 21);
  h.states[id].attributes.diagnostics = Object.create({ value: 21 });
  assert.equal(buildModel(h, c, identity).presetReadings.comfort.status, 'unavailable');
});

test('original humidity guide defaults preserve five colours and exact boundary inclusivity', () => {
  assert.deepEqual(humidityBands({}), { dry_below: 30, good_min: 40, good_max: 60, wet_above: 70 });
  for (const [value, key, colour] of [[20, 'dry', '#79b8ed'], [30, 'low', '#efb86b'], [35, 'low', '#efb86b'], [40, 'good', '#7dc39c'], [50, 'good', '#7dc39c'], [60, 'good', '#7dc39c'], [60.1, 'high', '#efb86b'], [65, 'high', '#efb86b'], [70, 'high', '#efb86b'], [70.1, 'wet', '#eb7777'], [80, 'wet', '#eb7777']]) {
    const band = humidityBand(value, HUMIDITY_DEFAULTS); assert.equal(band.key, key, String(value)); assert.equal(band.colour, colour);
  }
  for (const value of [null, undefined, '50', NaN, Infinity, -1, 101]) assert.equal(humidityBand(value, HUMIDITY_DEFAULTS).key, 'unknown');
  assert.equal(humidityGradient(HUMIDITY_DEFAULTS), 'linear-gradient(to right,#79b8ed 0% 30%,#efb86b 30% 40%,#7dc39c 40% 60%,#efb86b 60% 70%,#eb7777 70% 100%)');
});

test('humidity format validation preserves unknown fields and explicit legacy format without conversion', () => {
  const canonical = { ...HUMIDITY_DEFAULTS, future: { retained: true } };
  assert.deepEqual(normalizeConfig({ humidity_bands: canonical }).humidity_bands, canonical); assert.equal(validHumidityBands(canonical), true);
  const legacy = { low: 35.5, high: 65.5, future: { retained: true } };
  assert.equal(legacyHumidityBands(legacy), true); assert.equal(validHumidityBands(legacy), false); assert.deepEqual(humidityBands({ humidity_bands: legacy }), legacy);
  for (const [value, key] of [[35, 'below'], [35.5, 'within'], [65.5, 'within'], [66, 'above']]) assert.equal(humidityBand(value, legacy).key, key);
  for (const bad of [{}, { ...canonical, low: 35, high: 65 }, { ...canonical, good_min: 30 }, { ...canonical, good_max: 40 }, { ...canonical, wet_above: 60 }, { ...canonical, dry_below: -1 }, { ...canonical, wet_above: 101 }, { ...canonical, dry_below: 30.1 }, { ...canonical, good_min: NaN }, { ...canonical, good_min: '40' }]) {
    assert.throws(() => normalizeConfig({ humidity_bands: bad })); assert.equal(humidityBands({ humidity_bands: bad }), null);
  }
  const moved = moveHumidityBoundary(canonical, 'good_min', 100); assert.equal(moved.good_min, 59); assert.deepEqual(moved.future, canonical.future); assert.equal(canonical.good_min, 40);
  assert.equal(moveHumidityBoundary(canonical, 'unrecognized', 42), canonical); assert.equal(moveHumidityBoundary(canonical, 'good_min', Infinity), canonical);
});

test('humidity header uses original guide colour and label while degraded evidence stays unknown', () => {
  const h = fixture(); const c = { ...config, humidity_entity: 'sensor.humidity' };
  h.states['sensor.humidity'] = { state: '50', attributes: { unit_of_measurement: '%' } };
  for (const value of [20, 35, 50, 65, 80]) {
    h.states['sensor.humidity'].state = String(value); const m = buildModel(h, c, identity), expected = humidityBand(value, HUMIDITY_DEFAULTS);
    assert.equal(m.humidity.band, expected.key); assert.equal(m.humidity.guideMode, 'canonical'); assert.equal(m.headerTelemetry[0].colour, expected.colour); assert.equal(m.headerTelemetry[0].activityLabel, expected.label); assert.equal(m.canSet, true);
  }
  for (const state of ['unknown', 'unavailable', 'Infinity', '101']) {
    h.states['sensor.humidity'].state = state; const m = buildModel(h, c, identity); assert.equal(m.humidity.band, 'unknown'); assert.equal(m.headerTelemetry[0].colour, '#8795a8'); assert.equal(m.canSet, true);
  }
  h.states['sensor.humidity'].state = '50'; h.states['sensor.humidity'].last_updated = '2026-10-25T10:00:00Z';
  const stale = buildModel(h, { ...c, telemetry: [{ kind: 'humidity', entity: 'sensor.humidity', max_age_seconds: 1 }] }, identity, { now: Date.parse('2026-10-25T11:00:00Z') });
  assert.equal(stale.humidity.band, 'unknown'); assert.equal(stale.headerTelemetry[0].activityLabel, 'Stale');
  const legacy = buildModel(h, { ...c, humidity_bands: { low: 35, high: 65 } }, identity); assert.equal(legacy.humidity.guideMode, 'legacy'); assert.equal(legacy.humidity.band, 'within');
});
