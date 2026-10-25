// SPDX-License-Identifier: GPL-3.0-only
import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeConfig, finiteNumber } from '../../src/model/config.js';
import { buildModel, quantize, targetPayload, FEATURES } from '../../src/model/climate.js';
import { readOwnPath } from '../../src/model/telemetry.js';

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
  assert.equal(c.entity, ''); assert.equal(c.adapter, 'auto'); assert.equal(c.theme, 'auto');
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
  h.states[entity].attributes.lock_manager = { lock_users: false };
  assert.equal(buildModel(h, config, vtIdentity).canSet, true);
  delete h.states[entity].attributes.specific_states.is_locked;
  assert.equal(buildModel(h, config, vtIdentity).canSet, false);
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
