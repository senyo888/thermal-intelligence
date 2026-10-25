// SPDX-License-Identifier: GPL-3.0-only
import { finiteNumber } from './config.js';

const LABELS = { humidity: 'Humidity', trend: 'Temperature trend', valve: 'Valve', energy: 'Energy', power: 'Power', custom: 'Telemetry' };
const UNITS = {
  humidity: ['%'], valve: ['%'],
  trend: ['°C/h', '°F/h', '°C/min', '°F/min'],
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
export function buildTelemetry(hass, config, now, connected = true) {
  return config.telemetry.map((entry) => {
    const source = { entity: entry.entity, attribute: entry.attribute ?? null, evidence: 'Reported by configured Home Assistant entity' };
    const row = { kind: entry.kind, label: entry.label || LABELS[entry.kind], status: 'unknown', value: null, unit: entry.unit ?? null, source, detail: '' };
    const result = (status, detail) => ({ ...row, status, detail });
    if (!entry.entity) return result('disabled', 'No source configured.');
    if (!connected) return result('unavailable', 'Home Assistant is disconnected; this source cannot be refreshed.');
    const state = Object.hasOwn(hass?.states ?? {}, entry.entity) ? hass.states[entry.entity] : null;
    if (!state || state.state === 'unavailable') return result('unavailable', 'Configured source is unavailable.');
    if (state.state === 'unknown') return result('unknown', 'Configured source has no known state.');
    const attrs = state.attributes ?? {};
    const resolved = entry.attribute ? readOwnPath(attrs, entry.attribute) : { found: true, value: state.state };
    if (!resolved.found) return result('unavailable', 'Configured attribute is missing.');
    if (resolved.value === 'unavailable') return result('unavailable', 'Configured value is unavailable.');
    if (resolved.value === null || resolved.value === undefined || resolved.value === 'unknown') return result('unknown', 'Configured value is unknown.');
    // A sensor's unit describes its state, never every arbitrary nested attribute.
    const sourceUnit = !entry.attribute && Object.hasOwn(attrs, 'unit_of_measurement') && typeof attrs.unit_of_measurement === 'string' ? attrs.unit_of_measurement : null;
    if (sourceUnit && entry.unit && sourceUnit !== entry.unit) return result('invalid', `Source unit ${sourceUnit} does not match configured unit ${entry.unit}; no conversion was applied.`);
    row.unit = sourceUnit || entry.unit || null;
    if (entry.kind !== 'custom' && (!row.unit || !UNITS[entry.kind].includes(row.unit))) return result('invalid', 'A compatible unit is required; no unit is inferred.');
    const value = finiteNumber(resolved.value);
    if (entry.kind === 'custom' && typeof resolved.value === 'string' && value === null) {
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
    if (entry.kind === 'humidity' && config.humidity_bands) {
      row.band = value < config.humidity_bands.low ? 'below' : value > config.humidity_bands.high ? 'above' : 'within';
      row.bandLabel = 'Local display band';
    }
    return result('available', 'Reported observation; no controller decision is inferred.');
  });
}
