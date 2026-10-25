// SPDX-License-Identifier: GPL-3.0-only
// Public-safe observations exercise the installed bundle, including its expiry timer.
import './icons.js';
import '/dist/thermal-intelligence.js';

const parameters = new URLSearchParams(location.search);
document.body.dataset.capture = String(parameters.get('capture') === '1');
const card = document.createElement('thermal-intelligence-beta-card');
const calls = [];
const ids = Object.freeze({ thermostat: 'climate.response_room', room: 'sensor.response_temperature', trend: 'sensor.response_trend', native: 'climate.response_native', output: 'climate.response_output', valve: 'sensor.response_valve', source: 'climate.response_heat_source' });
const scenarios = ['native_warming', 'trv_warming', 'idle', 'cooling', 'at_target', 'above_target', 'off', 'restricted', 'stale_room', 'stale_slope', 'native_mismatch', 'output_unconfirmed', 'room_mismatch', 'slope_mismatch', 'flat', 'falling', 'rapid', 'unit_unknown', 'room_unavailable'];
const fixture = { card, calls, ids, scenarios, config: null, hass: null, refreshCount: 0 };
const age = minutes => new Date(Date.now() - minutes * 60000).toISOString();
const state = (entity_id, value, attributes = {}, minutes = 0) => ({ entity_id, state: String(value), attributes, last_changed: age(minutes), last_updated: age(minutes) });

function scenario(name = 'native_warming') {
  if (!scenarios.includes(name)) throw new Error('Unknown synthetic response scenario');
  const trv = name === 'trv_warming' || name === 'output_unconfirmed';
  fixture.config = { type: 'custom:thermal-intelligence-beta-card', entity: ids.thermostat, name: 'Example room', adapter: 'vtherm', trend_entity: ids.trend,
    response_arc: { room_sensor: ids.room, native_thermostat: ids.native, heat_source: ids.source, freshness_minutes: 10, ...(trv ? { confirmed_output: ids.output } : {}) },
    ...(trv ? { valve_position_entity: ids.valve } : {}),
  };
  const states = {
    [ids.thermostat]: state(ids.thermostat, 'heat', { friendly_name: 'Example thermostat', is_ready: true, current_temperature: 20, temperature: 21, min_temp: 7, max_temp: 30, target_temp_step: .1, supported_features: 401, hvac_modes: ['off', 'heat', 'cool'], preset_modes: ['none', 'eco', 'comfort', 'boost'], preset_mode: 'none', hvac_action: 'heating',
      configuration: { temperature_unit: '°C', type: 'over_climate' }, current_state: { hvac_mode: 'heat', target_temperature: 21 },
      is_safety_configured: true, safety_manager: { safety_state: 'off', safety_delay_min: 60 }, is_window_configured: false, is_power_configured: false,
      specific_states: { temperature_slope: .4 }, vtherm_over_climate: { underlying_entities: [trv ? ids.output : ids.native], regulation: { regulated_target_temperature: 22 } },
    }),
    [ids.room]: state(ids.room, 20, { friendly_name: 'Example room temperature', unit_of_measurement: '°C' }, 2),
    [ids.trend]: state(ids.trend, .4, { friendly_name: 'Example temperature trend', unit_of_measurement: '°C/hour' }, 1),
    [ids.native]: state(ids.native, 'heat', { temperature: 22, target_temp_step: .5, hvac_action: 'heating' }),
    [ids.output]: state(ids.output, 'heat', { command_confirmed: true, native_write_unconfirmed: false, control_fault: null, warm_cutoff_inhibited: false, manual_reconciliation_pending: false, physical_override_unadopted: false }),
    [ids.valve]: state(ids.valve, 42, { unit_of_measurement: '%' }),
    [ids.source]: state(ids.source, 'heat'),
  };
  const a = states[ids.thermostat].attributes;
  if (name === 'idle') a.hvac_action = 'idle';
  if (name === 'cooling') { a.hvac_action = 'cooling'; states[ids.native].attributes.hvac_action = 'cooling'; }
  if (name === 'at_target' || name === 'above_target') { a.current_temperature = name === 'at_target' ? 21 : 21.3; states[ids.room].state = String(a.current_temperature); }
  if (name === 'off') { states[ids.thermostat].state = 'off'; a.current_state.hvac_mode = 'off'; }
  if (name === 'restricted') a.safety_manager.safety_state = 'on';
  if (name === 'stale_room') states[ids.room].last_changed = age(10.01);
  if (name === 'stale_slope') states[ids.trend].last_updated = age(10.01);
  if (name === 'native_mismatch') states[ids.native].attributes.temperature = 19;
  if (name === 'output_unconfirmed') states[ids.output].attributes.command_confirmed = false;
  if (name === 'room_mismatch') states[ids.room].state = '20.2';
  if (name === 'slope_mismatch') a.specific_states.temperature_slope = .8;
  if (['flat', 'falling', 'rapid'].includes(name)) { const rate = { flat: .05, falling: -.4, rapid: 2.51 }[name]; states[ids.trend].state = String(rate); a.specific_states.temperature_slope = rate; }
  if (name === 'unit_unknown') delete a.configuration.temperature_unit;
  if (name === 'room_unavailable') states[ids.room].state = 'unavailable';
  fixture.hass = { connected: true, connection: { socket: {} }, user: { id: 'synthetic-response-user', is_admin: false }, config: { unit_system: { temperature: '°C' } }, states,
    entities: { [ids.thermostat]: { entity_id: ids.thermostat, platform: 'versatile_thermostat' } },
    services: { climate: { set_temperature: {}, set_hvac_mode: {}, set_preset_mode: {} } },
    async callService(domain, service, payload) { calls.push({ domain, service, payload: structuredClone(payload) }); document.querySelector('#calls').textContent = `Service calls: ${calls.length}`; },
  };
  fixture.scenarioName = name;
  card.setConfig(fixture.config);
  refresh();
}

function refresh() { fixture.refreshCount++; card.hass = { ...fixture.hass, states: { ...fixture.hass.states } }; }
Object.assign(fixture, { scenario, refresh });
window.responseArcFixture = fixture;
document.querySelector('main').append(card);
for (const name of scenarios) { const button = document.createElement('button'); button.textContent = name.replaceAll('_', ' '); button.onclick = () => scenario(name); document.querySelector('nav').append(button); }
scenario(parameters.get('scenario') || 'native_warming');
