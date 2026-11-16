// SPDX-License-Identifier: GPL-3.0-only
// Source presentation semantics are adapted from the approved TI visual baseline.
// Public provenance is recorded in docs/source-provenance.md.
import { finiteNumber } from './config.js';
import { humidityBands, humidityBand, legacyHumidityBands } from './humidity.js';
import { STATE_TELEMETRY, stateTelemetryValue } from './state-telemetry.js';

const LABELS = { temperature: 'Temperature', humidity: 'Humidity', trend: 'Temperature trend', valve: 'Valve', energy: 'Energy', power: 'Power', custom: 'Telemetry' };
const UNITS = {
  temperature: ['°C', '°F'], humidity: ['%'], valve: ['%'],
  trend: ['°C/h', '°F/h', '°C/hour', '°C/hr', 'degC/h', '°F/hour', '°F/hr', '°C/min', '°F/min'],
  power: ['W', 'kW', 'MW'], energy: ['Wh', 'kWh', 'MWh', 'J', 'kJ', 'MJ', 'GJ'],
};
const FORBIDDEN = new Set(['__proto__', 'prototype', 'constructor']);

export function readOwnPath(object, path) {
  let value = object;
  for (const key of path.split('.')) {
    if (FORBIDDEN.has(key) || value === null || typeof value !== 'object' || !Object.hasOwn(value, key)) return { found: false, value: undefined };
    value = value[key];
  }
  return { found: true, value };
}

/** Explicitly configured observations do not affect climate readiness. */
export function buildTelemetry(hass, config, now, connected = true, climate = {}) {
  return config.telemetry.map((entry) => {
    const source = { entity: entry.entity, attribute: entry.attribute ?? null, evidence: 'Reported by configured Home Assistant entity' };
    const semantic = STATE_TELEMETRY[entry.kind];
    const row = { kind: entry.kind, label: entry.label || semantic?.label || LABELS[entry.kind], status: 'unknown', value: null, unit: entry.unit ?? null, source, detail: '', ...(semantic ? { icon: semantic.icon, topic: entry.kind } : {}) };
    if (entry.kind === 'humidity') {
      row.guides = humidityBands(config);
      row.guideMode = legacyHumidityBands(row.guides) ? 'legacy' : 'canonical';
      row.band = 'unknown'; row.bandLabel = 'Local display band';
      row.bandStatus = humidityBand(null, row.guides); row.colour = row.bandStatus.colour;
    }
    const result = (status, detail) => ({ ...row, status, detail });
    if (!entry.entity) return result('disabled', 'No source configured.');
    if (!connected) return result('unavailable', 'Home Assistant is disconnected; this source cannot be refreshed.');
    const state = Object.hasOwn(hass?.states ?? {}, entry.entity) ? hass.states[entry.entity] : null;
    if (!state || state.state === 'unavailable') return result('unavailable', 'Configured source is unavailable.');
    if (state.state === 'unknown') return result('unknown', 'Configured source has no known state.');
    const attrs = state.attributes ?? {};
    if(typeof attrs.friendly_name==='string' && attrs.friendly_name.trim()) row.source.name=attrs.friendly_name;
    if (semantic?.flag && climate.provider?.kind === 'vtherm' && entry.entity === config.entity && (entry.attribute === semantic.path || entry.kind === 'window' && entry.attribute === 'window_manager.window_auto_state')) {
      const flag = entry.attribute === 'window_manager.window_auto_state' ? 'is_window_auto_configured' : semantic.flag;
      const configured = readOwnPath(attrs, flag).value;
      if (configured === false) return result('disabled', 'This feature is not configured in VT. Selecting its icon does not enable it.');
      if (configured !== true) return result('unknown', 'VT does not report whether this feature is configured.');
      // VT can retain an accepted motion/window state after its input fails.
      // Only follow the source ID explicitly reported for this exact manager.
      if (['window', 'motion', 'presence'].includes(entry.kind) && entry.attribute === semantic.path) {
        const input = readOwnPath(attrs, `${entry.kind}_manager.${entry.kind}_sensor_entity_id`).value;
        if (typeof input === 'string' && input.trim()) {
          const inputState = Object.hasOwn(hass.states, input) ? hass.states[input] : null;
          if (!inputState || ['unknown', 'unavailable'].includes(inputState.state)) {
            const status = inputState?.state === 'unknown' ? 'unknown' : 'unavailable';
            return result(status, `VT's configured ${entry.kind} input is ${status}. Its retained detector state is not a current observation; this does not change VT's control behaviour.`);
          }
        }
      }
    }
    const resolved = entry.attribute ? readOwnPath(attrs, entry.attribute) : { found: true, value: state.state };
    if (!resolved.found) return result('unavailable', 'Configured attribute is missing.');
    if (resolved.value === 'unavailable') return result('unavailable', 'Configured value is unavailable.');
    if (resolved.value === null || resolved.value === undefined || resolved.value === 'unknown') return result('unknown', 'Configured value is unknown.');
    // A sensor's unit describes its state, never every arbitrary nested attribute.
    let sourceUnit = !entry.attribute && Object.hasOwn(attrs, 'unit_of_measurement') && typeof attrs.unit_of_measurement === 'string' ? attrs.unit_of_measurement : null;
    if (UNITS[entry.kind] && entry.unit_attribute !== undefined) {
      const reportedUnit = readOwnPath(attrs, entry.unit_attribute);
      row.source.unitAttribute = entry.unit_attribute;
      if (!reportedUnit.found || !UNITS[entry.kind]?.includes(reportedUnit.value)) return result('invalid', `The configured ${entry.kind} unit attribute is missing or invalid.`);
      sourceUnit = reportedUnit.value;
    }
    if (entry.kind === 'temperature' && !entry.attribute && !UNITS.temperature.includes(sourceUnit)) return result('invalid', 'A temperature sensor must report °C or °F.');
    if (sourceUnit && entry.unit && sourceUnit !== entry.unit) return result('invalid', `Source unit ${sourceUnit} does not match configured unit ${entry.unit}; no conversion was applied.`);
    row.unit = sourceUnit || entry.unit || null;
    if (!semantic && entry.kind !== 'custom' && (!row.unit || !UNITS[entry.kind].includes(row.unit))) return result('invalid', 'A compatible unit is required; no unit is inferred.');
    const value = finiteNumber(resolved.value);
    if (semantic) {
      if (row.unit) return result('invalid', 'A categorical state must not have a measurement unit.');
      const active = stateTelemetryValue(entry.kind, resolved.value);
      if (active === null) return result('invalid', 'The source does not report a recognised state for this telemetry type.');
      row.value = active ? semantic.active : semantic.inactive;
      row.icon = !active && semantic.inactiveIcon ? semantic.inactiveIcon : semantic.icon;
      row.activity = active ? 'active' : 'neutral';
      row.colour = active ? semantic.colour : '#a9b8cb';
    } else if (entry.kind === 'custom' && typeof resolved.value === 'boolean') {
      row.value = resolved.value;
    } else if (entry.kind === 'custom' && typeof resolved.value === 'string' && value === null && resolved.value.trim()) {
      row.value = resolved.value;
    } else if (value === null) {
      return result('invalid', 'Source value is not a finite number.');
    } else {
      row.value = value;
      if ((entry.kind === 'humidity' || entry.kind === 'valve') && (value < 0 || value > 100)) return result('invalid', 'Percentage must be between 0 and 100.');
    }
    const stamp = typeof state.last_updated === 'string' ? Date.parse(state.last_updated) : NaN;
    row.source.timestamp = Number.isFinite(stamp) ? state.last_updated : null;
    if (entry.max_age_seconds !== undefined) {
      if (!Number.isFinite(stamp) || !Number.isFinite(now) || stamp > now) return result('unknown', 'Freshness cannot be established from the source timestamp.');
      if (now - stamp > entry.max_age_seconds * 1000) return result('stale', 'Older than the configured maximum age.');
    }
    if (entry.kind === 'humidity') {
      row.bandStatus = humidityBand(value, row.guides);
      row.band = row.bandStatus.key; row.colour = row.bandStatus.colour;
    }
    if (semantic && climate.provider?.kind === 'unknown' && entry.entity === config.entity && (entry.attribute === semantic.path || entry.attribute === 'window_manager.window_auto_state')) return result('unknown', 'Provider identity has not been checked. Verify the provider before interpreting its accepted feature state.');
    return result('available', semantic?.note || 'Reported observation; no controller decision is inferred.');
  });
}
