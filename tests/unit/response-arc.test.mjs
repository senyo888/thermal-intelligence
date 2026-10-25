// SPDX-License-Identifier: GPL-3.0-only
import test from 'node:test';
import assert from 'node:assert/strict';
import { buildModel } from '../../src/model/climate.js';

const NOW = Date.parse('2026-10-25T12:00:00Z');
const ago = (minutes) => new Date(NOW - minutes * 60000).toISOString();
const ENTITY = 'climate.response_fixture';
const identity = { entity_id: ENTITY, platform: 'versatile_thermostat' };

function fixture(trv = false) {
  const config = {
    entity: ENTITY, adapter: 'auto', trend_entity: 'sensor.response_trend',
    response_arc: { room_sensor: 'sensor.response_room', heat_source: 'climate.response_native', freshness_minutes: 10 },
  };
  if (trv) { config.valve_position_entity = 'sensor.response_valve'; config.response_arc.confirmed_output = 'climate.response_adapter'; }
  else config.response_arc.native_thermostat = 'climate.response_native';
  const attrs = {
    is_ready: true, supported_features: 1, min_temp: 7, max_temp: 35, target_temp_step: 0.5,
    current_temperature: 20, temperature: 21, hvac_action: 'heating',
    configuration: { temperature_unit: '°C', type: 'over_climate' },
    current_state: { hvac_mode: 'heat', target_temperature: 21 },
    is_safety_configured: true, is_window_configured: false, is_power_configured: false,
    safety_manager: { safety_state: 'off', safety_delay_min: 60 },
    specific_states: { temperature_slope: 0.4 },
    vtherm_over_climate: { underlying_entities: [trv ? 'climate.response_adapter' : 'climate.response_native'], regulation: { regulated_target_temperature: 22 } },
  };
  const hass = {
    connected: true, config: { unit_system: { temperature: '°C' } }, services: { climate: { set_temperature: {} } },
    states: {
      [ENTITY]: { entity_id: ENTITY, state: 'heat', attributes: attrs, last_updated: ago(0) },
      'sensor.response_room': { state: '20', attributes: { unit_of_measurement: '°C' }, last_changed: ago(2), last_updated: ago(1) },
      'sensor.response_trend': { state: '0.4', attributes: { unit_of_measurement: '°C/hour' }, last_updated: ago(1) },
      'sensor.response_valve': { state: '42', attributes: { unit_of_measurement: '%' }, last_updated: ago(1) },
      'climate.response_native': { state: 'heat', attributes: { temperature: 22, target_temp_step: 0.5 } },
      'climate.response_adapter': { state: 'heat', attributes: { command_confirmed: true, native_write_unconfirmed: false, control_fault: null, warm_cutoff_inhibited: false, manual_reconciliation_pending: false, physical_override_unadopted: false } },
    },
  };
  return { config, hass, attrs, adapter: hass.states['climate.response_adapter'].attributes };
}
const read = (f, now = NOW, provider = identity) => buildModel(f.hass, f.config, provider, { now }).arc;

for (const trv of [false, true]) test(`configured ${trv ? 'TRV' : 'native'} response is deterministic, read-only and expires inclusively`, () => {
  const f = fixture(trv), before = structuredClone(f);
  let writes = 0; f.hass.callService = () => { writes++; throw new Error('Unexpected write'); };
  const arc = read(f);
  assert.equal(arc.color, '#ff9459'); assert.equal(arc.reason, 'warming'); assert.equal(arc.responding, true);
  assert.equal(arc.expiresAt, NOW + 8 * 60000); assert.equal(arc.delta, -1);
  assert.match(arc.explanation, /does not prove boiler firing or radiator flow/);
  assert.deepEqual(read(f), arc); assert.equal(writes, 0);
  delete f.hass.callService; assert.deepEqual(f, before);
  assert.equal(read(f, arc.expiresAt).responding, true);
  assert.equal(read(f, arc.expiresAt + 1).reason, 'response_expired');
});

test('legacy config remains inert and standard climates retain reported comparison behavior', () => {
  const f = fixture(true);
  delete f.config.response_arc; f.config.overview = { room_sensor: 'sensor.response_room' }; f.config.recovery_entity = 'climate.response_adapter';
  assert.equal(read(f).reason, 'below_target'); assert.equal(read(f).responding, false); assert.equal(read(f).expiresAt, null);
  const standard = { entity_id: ENTITY, platform: 'generic_thermostat' };
  f.config.response_arc = { room_sensor: 'sensor.response_room' };
  let arc = read(f, NOW, standard); assert.equal(arc.color, '#50c8ff'); assert.match(arc.explanation, /supported only.*VT observation contract/);
  f.hass.states[ENTITY].state = 'cool'; f.attrs.hvac_action = 'cooling';
  arc = read(f, NOW, standard); assert.equal(arc.color, '#66cfff'); assert.equal(arc.responding, false);
});

test('known readiness, identity, unit, scalar target and range guards cannot be bypassed by response mappings', () => {
  const changes = [
    (f) => { f.hass.connected = false; }, (f) => { f.attrs.is_ready = undefined; }, (f) => { f.attrs.is_ready = false; },
    (f) => { f.hass.states[ENTITY].state = 'unavailable'; }, (f) => { f.attrs.current_temperature = null; },
    (f) => { f.hass.config.unit_system.temperature = undefined; }, (f) => { f.attrs.min_temp = 35; },
    (f) => { f.attrs.temperature = null; }, (f) => { f.attrs.temperature = 36; },
    (f) => { f.attrs.supported_features = 2; f.attrs.target_temp_low = 18; f.attrs.target_temp_high = 24; },
    (f) => { f.attrs.specific_states.is_locked = true; },
  ];
  for (const change of changes) { const f = fixture(); change(f); assert.equal(read(f).color, '#94a3b8'); assert.equal(read(f).responding, false); }
  assert.equal(read(fixture(), NOW, null).color, '#94a3b8');
  assert.equal(read(fixture(), NOW, { ...identity, entity_id: 'climate.other' }).color, '#94a3b8');
  const selected = fixture(); selected.config.entity = 'climate.other'; assert.equal(read(selected).color, '#94a3b8');
});

test('effective VT mode and target are unit-bound and never silently replace invalid evidence', () => {
  const f = fixture(); f.attrs.current_state.hvac_mode = 'off'; assert.equal(read(f).reason, 'off');
  f.attrs.current_state.hvac_mode = 'heat'; f.hass.states[ENTITY].state = 'off'; assert.equal(read(f).responding, true);
  f.attrs.current_state.target_temperature = 20; assert.equal(read(f).reason, 'at_target'); assert.equal(read(f).delta, 0);
  for (const target of [null, 'unknown', 36, Infinity]) { f.attrs.current_state.target_temperature = target; assert.equal(read(f).reason, 'target_invalid'); }
  f.attrs.current_state.target_temperature = 21; f.attrs.current_state.hvac_mode = 'unknown'; assert.equal(read(f).reason, 'mode_unknown');
  f.attrs.current_state.hvac_mode = 'heat'; f.attrs.configuration.temperature_unit = '°F'; assert.equal(read(f).reason, 'response_unit_mismatch');
  delete f.attrs.configuration.temperature_unit; assert.equal(read(f).reason, 'response_unit_unknown');
});

test('canonical target colors and native-versus-TRV cooling semantics are retained', () => {
  for (const trv of [false, true]) for (const [delta, color] of [[0, '#62e3b0'], [0.2, '#62e3b0'], [0.21, '#c4a7ff'], [-0.1, '#ff9459']]) {
    const f = fixture(trv); f.attrs.current_temperature = 21 + delta; f.hass.states['sensor.response_room'].state = String(21 + delta);
    assert.equal(read(f).color, color);
  }
  const native = fixture(); native.hass.states['climate.response_native'].state = 'cool'; native.hass.states['climate.response_native'].attributes.hvac_action = 'cooling';
  assert.equal(read(native).color, '#66cfff');
  native.hass.states['climate.response_native'].state = 'off'; assert.notEqual(read(native).color, '#66cfff');
  const trv = fixture(true); trv.attrs.current_state.hvac_mode = 'cool'; trv.attrs.hvac_action = 'cooling';
  assert.equal(read(trv).color, '#50c8ff'); assert.equal(read(trv).responding, false);
});

test('unknown and active VT restrictions fail closed, with only explicit window bypass accepted', () => {
  for (const key of ['is_safety_configured', 'is_window_configured', 'is_power_configured']) for (const value of [undefined, null, 'false', 'unknown']) {
    const f = fixture(); f.attrs[key] = value; assert.equal(read(f).reason, 'restricted');
  }
  for (const value of [undefined, 'unknown', 'on', null]) { const f = fixture(); f.attrs.safety_manager.safety_state = value; assert.equal(read(f).reason, 'restricted'); }
  const window = fixture(); window.attrs.is_window_configured = true; window.attrs.window_manager = { window_state: 'on' };
  assert.equal(read(window).reason, 'restricted'); window.attrs.window_manager.is_window_bypass = true; assert.equal(read(window).responding, true);
  const power = fixture(); power.attrs.is_power_configured = true; power.attrs.power_manager = { overpowering_state: 'on' }; assert.equal(read(power).reason, 'restricted');
});

test('native acceptance requires current matching regulated target and current mapped heat source', () => {
  const f = fixture(); f.attrs.regulated_target_temperature = 22;
  f.attrs.vtherm_over_climate.regulation.regulated_target_temperature = null; assert.equal(read(f).reason, 'output_unconfirmed');
  delete f.attrs.vtherm_over_climate.regulation.regulated_target_temperature; assert.equal(read(f).responding, true);
  f.hass.states['climate.response_native'].attributes.temperature = 22.25; assert.equal(read(f).responding, true);
  f.hass.states['climate.response_native'].attributes.temperature = 22.251; assert.equal(read(f).reason, 'output_unconfirmed');
  for (const state of ['off', 'unknown', 'unavailable']) { const x = fixture(); x.hass.states['climate.response_native'].state = state; assert.equal(read(x).responding, false); }
  const x = fixture(); x.config.response_arc.native_thermostat = 'climate.missing'; assert.equal(read(x).reason, 'output_unconfirmed');
});

test('TRV acceptance binds exact declared output and rejects uncertain confirmation/recovery states', () => {
  for (const [key, bad] of Object.entries({ command_confirmed: false, native_write_unconfirmed: true, control_fault: 'failed', warm_cutoff_inhibited: true, manual_reconciliation_pending: true, physical_override_unadopted: true })) {
    for (const value of [bad, undefined, null, 'unknown']) { const f = fixture(true); f.adapter[key] = value; if (key === 'control_fault' && value === null) continue; assert.equal(read(f).reason, 'output_unconfirmed', `${key}=${value}`); }
  }
  for (const recovery of [null, [], { active: true, phase: 'idle' }, { active: false, phase: 'waiting' }, { active: 'false', phase: 'idle' }, { active: false, phase: 'recovered', verified: false }]) {
    const f = fixture(true); f.adapter.automatic_recovery = recovery; assert.equal(read(f).reason, 'output_unconfirmed');
  }
  for (const recovery of [{ active: false, phase: 'idle' }, { active: false, phase: 'recovered', verified: true }]) { const f = fixture(true); f.adapter.automatic_recovery = recovery; assert.equal(read(f).responding, true); }
  const unrelated = fixture(true); unrelated.attrs.vtherm_over_climate.underlying_entities = ['climate.other']; assert.equal(read(unrelated).reason, 'output_unconfirmed');
  const missing = fixture(true); delete missing.config.response_arc.confirmed_output; assert.equal(read(missing).reason, 'output_unconfirmed');
  for (const value of [0, -1, 101, 'unknown', 'unavailable']) { const f = fixture(true); f.hass.states['sensor.response_valve'].state = String(value); assert.equal(read(f).reason, 'trv_not_open'); }
});

test('mapped room and rate observations must agree, and same-unit rate aliases normalize explicitly', () => {
  for (const unit of ['°C/h', '°C/hour', '°C/hr', 'degC/h', '°C/min']) {
    const f = fixture(); f.hass.states['sensor.response_trend'].attributes.unit_of_measurement = unit;
    if (unit === '°C/min') f.hass.states['sensor.response_trend'].state = String(0.4 / 60);
    assert.equal(read(f).responding, true, unit);
  }
  for (const value of ['20.04', '19.95']) { const f = fixture(); f.hass.states['sensor.response_room'].state = value; assert.equal(read(f).responding, true); }
  const badRoom = fixture(); badRoom.hass.states['sensor.response_room'].state = '20.06'; assert.equal(read(badRoom).reason, 'response_unverified');
  for (const value of ['unknown', 'unavailable']) { const f = fixture(); f.hass.states['sensor.response_room'].state = value; assert.equal(read(f).reason, 'room_source_unavailable'); }
  const wrongRoomUnit = fixture(); wrongRoomUnit.hass.states['sensor.response_room'].attributes.unit_of_measurement = '°F'; assert.equal(read(wrongRoomUnit).reason, 'room_source_unavailable');
  const wrongRateUnit = fixture(); wrongRateUnit.hass.states['sensor.response_trend'].attributes.unit_of_measurement = '°F/hour'; assert.equal(read(wrongRateUnit).reason, 'response_unverified');
  const wrongRate = fixture(); wrongRate.hass.states['sensor.response_trend'].state = '0.3'; assert.equal(read(wrongRate).reason, 'response_unverified');
  for (const [slope, reason] of [[0, 'not_rising'], [0.05, 'not_rising'], [-0.1, 'not_rising'], [2.5, 'warming'], [2.51, 'rapid_change']]) {
    const f = fixture(); f.attrs.specific_states.temperature_slope = slope; f.hass.states['sensor.response_trend'].state = String(slope); assert.equal(read(f).reason, reason);
  }
});

test('Fahrenheit evidence uses Fahrenheit slope thresholds without inferring conversion', () => {
  for (const [slope, responds] of [[0.09, false], [0.1, true], [4.5, true], [4.51, false]]) {
    const f = fixture(); f.hass.config.unit_system.temperature = f.attrs.configuration.temperature_unit = '°F';
    f.hass.states['sensor.response_room'].attributes.unit_of_measurement = '°F'; f.hass.states['sensor.response_trend'].attributes.unit_of_measurement = '°F/hour';
    f.attrs.specific_states.temperature_slope = slope; f.hass.states['sensor.response_trend'].state = String(slope); assert.equal(read(f).responding, responds);
  }
});

test('room value-change and trend update timestamps expire separately; VT refresh cannot renew them', () => {
  for (const [entity, key] of [['sensor.response_room', 'last_changed'], ['sensor.response_trend', 'last_updated']]) {
    for (const stamp of [ago(10.001), ago(-0.01), undefined, 'invalid']) { const f = fixture(); f.hass.states[entity][key] = stamp; assert.equal(read(f).reason, 'response_expired'); }
    const exact = fixture(); exact.hass.states[entity][key] = ago(10); assert.equal(read(exact).responding, true);
  }
  const f = fixture(); f.hass.states['sensor.response_room'].last_changed = ago(11); f.attrs.specific_states.last_temperature_datetime = ago(0);
  assert.equal(read(f).reason, 'response_expired'); f.config.response_arc.freshness_minutes = 15; assert.equal(read(f).responding, true);
  f.attrs.safety_manager.safety_delay_min = 5; assert.equal(read(f).reason, 'response_expired');
  assert.equal(read(fixture(), NaN).reason, 'response_expired');
});

test('resolved telemetry age limits and stale status shorten response evidence', () => {
  const f = fixture(true); f.config.telemetry = [{ kind: 'valve', entity: 'sensor.response_valve', max_age_seconds: 120 }, { kind: 'trend', entity: 'sensor.response_trend', max_age_seconds: 300 }];
  assert.equal(read(f).expiresAt, NOW + 60000);
  assert.equal(read(f, NOW + 60000).responding, true); assert.equal(read(f, NOW + 60001).reason, 'trv_not_open');
  f.config.telemetry.shift(); assert.equal(read(f).expiresAt, NOW + 4 * 60000);
  assert.equal(read(f, NOW + 4 * 60000 + 1).reason, 'response_unverified');
  f.hass.states['sensor.response_trend'].last_updated = ago(-1); assert.equal(read(f).reason, 'response_unverified');
});

test('independent source selections and reconnect evaluation never retain previous response proof', () => {
  const f = fixture(), other = fixture(); other.config.response_arc.room_sensor = 'sensor.other';
  assert.equal(read(f).responding, true); assert.equal(read(other).reason, 'room_source_unavailable');
  f.hass.connected = false; assert.equal(read(f).reason, 'unavailable');
  f.hass.connected = true; delete f.hass.states['sensor.response_room']; assert.equal(read(f).reason, 'room_source_unavailable');
  const noMapping = fixture(); delete noMapping.config.response_arc; assert.equal(read(noMapping).responding, false);
});
