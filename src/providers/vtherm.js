// SPDX-License-Identifier: GPL-3.0-only
import { readOwnPath } from '../model/telemetry.js';
import { finiteNumber } from '../model/config.js';

function regulationDetails(attributes, observable) {
  const type = readOwnPath(attributes, 'configuration.type').value;
  const proportional = ['over_switch', 'over_valve', 'over_climate_valve'];
  const fields = [
    { label: 'Regulation mode', path: 'vtherm_over_climate.regulation.auto_regulation_mode', types: ['over_climate'], flag: 'vtherm_over_climate.is_regulated', detail: 'Provider-selected climate regulation mode; observation only.' },
    { label: 'Regulated target', path: 'vtherm_over_climate.regulation.regulated_target_temperature', types: ['over_climate'], flag: 'vtherm_over_climate.is_regulated', numeric: true, temperature: true, detail: 'Internal regulated target in the provider-declared unit; this is not a measured temperature.' },
    { label: 'Proportional function', path: 'configuration.proportional_function', types: proportional, detail: 'Provider-declared regulation function; no algorithm is reconstructed.' },
    { label: 'Regulation demand', path: 'on_percent', types: proportional, numeric: true, max: 1, scale: 100, unit: '%', detail: 'Provider demand after its safety and maximum-output adjustments; not measured power or heat delivery.' },
    { label: 'Requested valve opening', path: 'valve_open_percent', types: ['over_valve', 'over_climate_valve'], numeric: true, max: 100, unit: '%', detail: 'Provider-requested opening; not independently observed valve position or heat delivery.' },
  ];
  return fields.map((field) => {
    const row = { label: field.label, value: null, status: 'unknown', unit: field.unit ?? null, source: `Versatile Thermostat: ${field.path}`, detail: field.detail };
    const finish = (status) => ({ ...row, value: status === 'available' ? row.value : null, status });
    if (!observable) return finish('unavailable');
    if (typeof type !== 'string' || !type.trim() || ['unknown', 'unavailable'].includes(type)) return finish('unknown');
    if (!field.types.includes(type)) return finish('unsupported');
    if (field.flag) {
      const flag = readOwnPath(attributes, field.flag).value;
      if (typeof flag !== 'boolean') return finish('unknown');
      if (!flag) return finish('disabled');
    }
    const found = readOwnPath(attributes, field.path);
    if (!found.found || found.value === 'unavailable') return finish('unavailable');
    if (found.value === null || found.value === undefined || found.value === 'unknown') return finish('unknown');
    if (field.numeric) {
      const number = finiteNumber(found.value);
      if (number === null || (field.max !== undefined && (number < 0 || number > field.max))) return finish('invalid');
      row.value = field.scale ? Number((number * field.scale).toPrecision(12)) : number;
      if (field.temperature) {
        const unit = readOwnPath(attributes, 'configuration.temperature_unit').value;
        if (!['°C', '°F'].includes(unit)) return finish('unknown');
        row.unit = unit;
      }
    } else {
      if (typeof found.value !== 'string' || !found.value.trim()) return finish('invalid');
      row.value = found.value;
    }
    return finish('available');
  });
}

/** VT 10.5.1 observations; no entity discovery or writes are performed here. */
export function vthermDetails(attributes, observable) {
  const fields = [
    ['Readiness', 'is_ready'], ['Initialized', 'specific_states.is_initialized'],
    ['Device active', 'specific_states.is_device_active'], ['Activity requested', 'specific_states.should_device_be_active'],
    ['Off reason', 'specific_states.hvac_off_reason'], ['Mode reason', 'specific_states.hvac_mode_reason'],
    ['Locked', 'specific_states.is_locked'], ['Sleeping', 'specific_states.is_sleeping'],
    ['Window', 'window_manager.window_state', 'is_window_configured'],
    ['Automatic window detection', 'window_manager.window_auto_state', 'is_window_auto_configured'],
    ['Presence', 'presence_manager.presence_state', 'is_presence_configured'],
    ['Motion', 'motion_manager.motion_state', 'is_motion_configured'],
    ['Safety', 'safety_manager.safety_state', 'is_safety_configured'],
    ['Power limiting', 'power_manager.overpowering_state', 'is_power_configured'],
  ];
  const rows = fields.map(([label, path, flag]) => {
    const found = readOwnPath(attributes, path);
    const configured = flag ? readOwnPath(attributes, flag) : null;
    const value = found.value;
    const scalar = ['string', 'number', 'boolean'].includes(typeof value) && (typeof value !== 'number' || Number.isFinite(value));
    let status = !found.found || value === 'unavailable' ? 'unavailable' : !scalar || value === 'unknown' ? 'unknown' : 'available';
    if (configured && (!configured.found || typeof configured.value !== 'boolean')) status = 'unknown';
    if (configured?.value === false) status = 'disabled';
    if (!observable) status = 'unavailable';
    return { label, value: status === 'available' ? value : null, status, source: `Versatile Thermostat: ${path}` };
  });
  return [...rows, ...regulationDetails(attributes, observable)];
}
