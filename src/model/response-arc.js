// SPDX-License-Identifier: GPL-3.0-only
// Read-only response presentation adapted from the approved TI source baseline.
import { finiteNumber, isRecord } from './config.js';

const COLORS = { unknown: '#94a3b8', off: '#7c8ba2', cooling: '#66cfff', above: '#c4a7ff', at: '#62e3b0', below: '#50c8ff', warming: '#ff9459' };
const MODES = ['off', 'heat', 'cool', 'heat_cool', 'auto', 'dry', 'fan_only'];
const LABELS = { warming: 'Recent warming', above_target: 'Above target', at_target: 'At target', below_target: 'Below target', off: 'Off', cooling: 'Cooling reported', response_expired: 'Response evidence expired', not_rising: 'Not rising', rapid_change: 'Rapid temperature change' };
const result = (color, reason, explanation, delta = null, expiresAt = null, responding = false) => ({ color, reason, label: LABELS[reason] || 'Response unverified', explanation, responding, delta, expiresAt });
const live = (state) => !!state && typeof state.state === 'string' && state.state.trim() !== '' && !['unknown', 'unavailable'].includes(state.state);
const source = (hass, id) => typeof id === 'string' && Object.hasOwn(hass?.states ?? {}, id) ? hass.states[id] : null;

/** Standard/unmapped cards retain the selected climate's display-unit comparison. */
function targetComparisonArc(climate, connected) {
  if (!connected || !climate.ready || !climate.available || !Number.isFinite(climate.current)) {
    return result(COLORS.unknown, 'unavailable', 'Target comparison is unavailable because connection, readiness or current temperature is unavailable. Physical heating is unverified.');
  }
  if (!['°C', '°F'].includes(climate.unit)) return result(COLORS.unknown, 'unit_unknown', 'Target comparison requires a known climate display unit. Physical heating is unverified.');
  if (climate.ranged || climate.keys?.length !== 1 || climate.keys[0] !== 'temperature') return result(COLORS.unknown, 'target_unknown', 'Target comparison requires one selected climate target; a temperature range is not reduced to an invented single target. Physical heating is unverified.');
  const target = climate.targets?.temperature, { min, max } = climate;
  if (![target, min, max].every(Number.isFinite) || min >= max || !Number.isFinite(max - min) || target < min || target > max) return result(COLORS.unknown, 'target_invalid', 'Target comparison requires a finite selected climate target within valid reported limits. Physical heating is unverified.');
  const delta = climate.current - target;
  if (!Number.isFinite(delta)) return result(COLORS.unknown, 'target_invalid', 'Target comparison could not produce a finite temperature difference. Physical heating is unverified.');
  if (!MODES.includes(climate.state)) return result(COLORS.unknown, 'mode_unknown', 'Target comparison is unavailable because the climate mode is unrecognized. Physical heating is unverified.', delta);
  if (climate.state === 'off') return result(COLORS.off, 'off', 'The selected climate mode is Off. Its target comparison does not establish physical heating.', delta);
  if (climate.action === 'cooling') return result(COLORS.cooling, 'cooling', 'The selected climate reports cooling. The target comparison and reported activity do not establish physical heat delivery.', delta);
  if (delta > 0.2 + 1e-9) return result(COLORS.above, 'above_target', 'Current temperature is above the selected climate target. This target comparison does not establish physical heating.', delta);
  if (delta >= -1e-9) return result(COLORS.at, 'at_target', 'Current temperature is at the selected climate target or no more than 0.2 display degrees above it. This target comparison does not establish physical heating.', delta);
  return result(COLORS.below, 'below_target', 'Current temperature is below the selected climate target. Accepted-output and fresh warming-response evidence are not established; this is a target comparison only.', delta);
}

function hourlyTrend(row, unit) {
  if (row?.status !== 'available' || !Number.isFinite(row.value)) return null;
  const units = unit === '°C' ? ['°C/h', '°C/hour', '°C/hr', 'degC/h'] : ['°F/h', '°F/hour', '°F/hr'];
  const value = units.includes(row.unit) ? row.value : row.unit === `${unit}/min` ? row.value * 60 : null;
  return Number.isFinite(value) ? value : null;
}

function observationDeadline(row, config) {
  const entry = config.telemetry?.find((item) => item.kind === row?.kind && item.entity === row.source?.entity && (item.attribute ?? null) === (row.source?.attribute ?? null));
  const stamp = Date.parse(row?.source?.timestamp);
  return entry && Number.isFinite(entry.max_age_seconds) && entry.max_age_seconds > 0 && Number.isFinite(stamp) ? stamp + entry.max_age_seconds * 1000 : Infinity;
}

/** Pure observation: no command results, cached response, entity discovery or writes. */
export function buildResponseArc({ hass, config, climate, trendSource, valve, now, connected }) {
  const comparison = targetComparisonArc(climate, connected);
  if (config.response_arc === undefined) return comparison;
  if (!isRecord(config.response_arc)) return result(COLORS.unknown, 'response_configuration_invalid', 'Response sources must be explicitly configured.');
  if (climate.provider?.kind !== 'vtherm') return { ...comparison, explanation: `${comparison.explanation} Corroborated warming response is supported only by the documented VT observation contract; a standard climate heating action is insufficient.` };
  if (['unavailable', 'unit_unknown', 'target_unknown', 'target_invalid', 'mode_unknown'].includes(comparison.reason)) return comparison;

  const mapping = config.response_arc, a = climate.attrs ?? {};
  // VT's internal temperatures/rate are not guaranteed to use HA's display unit.
  const internalUnit = a.configuration?.temperature_unit;
  if (!['°C', '°F'].includes(internalUnit)) return result(COLORS.unknown, 'response_unit_unknown', 'VT must declare its internal temperature unit before response evidence can be compared.');
  if (internalUnit !== climate.unit) return result(COLORS.unknown, 'response_unit_mismatch', 'VT internal and Home Assistant display temperature units differ; no response conversion is assumed.');
  const effective = a.current_state?.hvac_mode ?? climate.state;
  if (!MODES.includes(effective)) return result(COLORS.unknown, 'mode_unknown', 'The effective VT mode is unknown.');
  const target = a.current_state && Object.hasOwn(a.current_state, 'target_temperature') ? finiteNumber(a.current_state.target_temperature) : climate.targets.temperature;
  if (target === null || !Number.isFinite(target) || target < climate.min || target > climate.max || !Number.isFinite(climate.current - target)) return result(COLORS.unknown, 'target_invalid', 'A valid effective VT target in the declared unit is unavailable.');
  const delta = climate.current - target;
  const blue = (reason, explanation, expiresAt = null) => result(COLORS.below, reason, explanation, delta, expiresAt);
  if (effective === 'off') return result(COLORS.off, 'off', 'Room heating is switched off.', delta);

  const trv = valve !== null && valve !== undefined || !!mapping.confirmed_output;
  const native = source(hass, mapping.native_thermostat);
  const nativeAction = mapping.native_thermostat ? live(native) && native.state !== 'off' ? native.attributes?.hvac_action : null : climate.action;
  // Canonical TRV output has no cooling action: valve opening is distinct evidence.
  if (!trv && nativeAction === 'cooling') return result(COLORS.cooling, 'cooling', 'The thermostat reports cooling.', delta);
  const room = source(hass, mapping.room_sensor), roomValue = live(room) ? finiteNumber(room.state) : null;
  if (!mapping.room_sensor || roomValue === null || room.attributes?.unit_of_measurement !== climate.unit) return result(COLORS.unknown, 'room_source_unavailable', 'The mapped room-temperature source is unavailable or uses different units.', delta);
  if (delta > 0.2 + 1e-9) return result(COLORS.above, 'above_target', 'The room is above its effective target.', delta);
  if (delta >= -1e-9) return result(COLORS.at, 'at_target', 'The room is at its effective target.', delta);
  if (effective !== 'heat') return blue('no_heat_request', 'The room is below target; effective Heat is not enabled.');
  if (climate.action !== 'heating') return blue('no_heat_request', 'The room is below target; VT is not reporting a current heating request.');

  const safety = a.safety_manager, window = a.window_manager, power = a.power_manager;
  if ([a.is_safety_configured, a.is_window_configured, a.is_power_configured].some((value) => typeof value !== 'boolean')) return blue('restricted', 'VT restriction configuration is unknown; response evidence is not confirmed.');
  if (a.is_safety_configured && safety?.safety_state !== 'off' || a.is_window_configured && window?.window_state !== 'off' && window?.is_window_bypass !== true || a.is_power_configured && power?.overpowering_state !== 'off') return blue('restricted', 'A configured VT restriction is active or its state is unknown.');
  const heatSourceId = mapping.heat_source || mapping.native_thermostat, heatSource = source(hass, heatSourceId);
  if (heatSourceId && (!live(heatSource) || heatSource.state !== 'heat')) return blue('heat_source_unavailable', 'The mapped heat source is not available in Heat mode.');
  if (trv) {
    if (valve?.status !== 'available' || valve.unit !== '%' || !Number.isFinite(valve.value) || valve.value <= 0 || valve.value > 100) return blue('trv_not_open', 'The room is below target; a current open TRV observation is not reported.');
    const ids = a.vtherm_over_climate?.underlying_entities, id = mapping.confirmed_output, adapter = source(hass, id), d = adapter?.attributes ?? {}, recovery = d.automatic_recovery;
    if (!id || !Array.isArray(ids) || !ids.includes(id) || !live(adapter) || adapter.state !== 'heat' || d.command_confirmed !== true || d.native_write_unconfirmed !== false || d.control_fault !== null || d.warm_cutoff_inhibited !== false || d.manual_reconciliation_pending !== false || d.physical_override_unadopted !== false || recovery !== undefined && !(isRecord(recovery) && recovery.active === false && ['idle', 'recovered'].includes(recovery.phase) && (recovery.phase !== 'recovered' || recovery.verified === true))) return blue('output_unconfirmed', 'The current TRV output is not confirmed, or control is restricted.');
  } else {
    const regulation = a.vtherm_over_climate?.regulation;
    // An invalid present current-schema value must not fall back to older evidence.
    const expected = finiteNumber(regulation && Object.hasOwn(regulation, 'regulated_target_temperature') ? regulation.regulated_target_temperature : a.regulated_target_temperature);
    const actual = live(native) ? finiteNumber(native.attributes?.temperature) : null, step = finiteNumber(native?.attributes?.target_temp_step);
    if (!live(native) || native.state !== 'heat' || expected === null || actual === null || Math.abs(actual - expected) > (step !== null && step > 0 ? step / 2 : 0.05) + 1e-9) return blue('output_unconfirmed', 'The native thermostat has not confirmed the current regulated target.');
  }

  const slope = hourlyTrend(trendSource, climate.unit), vtSlope = finiteNumber(a.specific_states?.temperature_slope);
  if (Math.abs(roomValue - climate.current) > 0.05 + 1e-6 || slope === null || vtSlope === null || Math.abs(vtSlope - slope) > 0.01) return blue('response_unverified', 'Room temperature and shared VT trend do not provide matching response evidence.');
  const configured = finiteNumber(mapping.freshness_minutes), delay = finiteNumber(safety?.safety_delay_min);
  const minutes = Math.min(configured !== null && configured > 0 && configured <= 30 ? configured : 10, delay !== null && delay > 0 ? delay : Infinity);
  const roomStamp = Date.parse(room.last_changed), trendStamp = Date.parse(trendSource?.source?.timestamp);
  const fresh = (stamp) => Number.isFinite(now) && Number.isFinite(stamp) && stamp <= now && now - stamp <= minutes * 60000;
  if (!fresh(roomStamp) || !fresh(trendStamp)) return blue('response_expired', `Recent warming cannot be established: the room value change and trend must both be within ${minutes} minutes. A VT attribute refresh does not renew this evidence.`);
  const expiresAt = Math.min(roomStamp + minutes * 60000, trendStamp + minutes * 60000, observationDeadline(trendSource, config), trv ? observationDeadline(valve, config) : Infinity);
  if (!Number.isFinite(expiresAt) || expiresAt < now) return blue('response_expired', 'A configured observation age limit has expired.');
  const stable = climate.unit === '°F' ? 0.09 : 0.05, rapid = climate.unit === '°F' ? 4.5 : 2.5;
  if (slope <= stable) return blue('not_rising', 'The room is below target, but its recent measured trend is flat or falling.', expiresAt);
  if (slope > rapid) return blue('rapid_change', 'The temperature change is unusually fast; it is not used as ordinary warming evidence.', expiresAt);
  return result(COLORS.warming, 'warming', `Recent room readings show warming while the current heat request is accepted. Orange describes these observations together; it does not prove boiler firing or radiator flow. Evidence expires after ${minutes} minutes without a room value change.`, delta, expiresAt, true);
}
