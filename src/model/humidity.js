// SPDX-License-Identifier: GPL-3.0-only
// Adapted from the approved TI visual baseline; see docs/source-provenance.md.
// Display guides only. No thermostat, humidifier or HI control thresholds.
export const HUMIDITY_DEFAULTS = Object.freeze({ dry_below: 30, good_min: 40, good_max: 60, wet_above: 70 });
export const HUMIDITY_KEYS = Object.freeze(Object.keys(HUMIDITY_DEFAULTS));
const LEGACY_KEYS = ['low', 'high'];
const record = (value) => !!value && typeof value === 'object' && !Array.isArray(value);
const number = (bands, key) => Object.hasOwn(bands, key) && typeof bands[key] === 'number' && Number.isFinite(bands[key]) && bands[key] >= 0 && bands[key] <= 100;

export function validHumidityBands(bands) {
  return record(bands) && !LEGACY_KEYS.some((key) => Object.hasOwn(bands, key))
    && HUMIDITY_KEYS.every((key) => number(bands, key) && Number.isInteger(bands[key]))
    && bands.dry_below < bands.good_min && bands.good_min < bands.good_max && bands.good_max < bands.wet_above;
}

export function legacyHumidityBands(bands) {
  return record(bands) && !HUMIDITY_KEYS.some((key) => Object.hasOwn(bands, key))
    && LEGACY_KEYS.every((key) => number(bands, key)) && bands.low < bands.high;
}

export function humidityBands(config = {}) {
  const bands = config.humidity_bands;
  return bands === undefined ? { ...HUMIDITY_DEFAULTS } : validHumidityBands(bands) || legacyHumidityBands(bands) ? { ...bands } : null;
}

export function humidityBand(value, bands) {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || value > 100) return { key: 'unknown', label: 'Unavailable', colour: '#8795a8' };
  if (legacyHumidityBands(bands)) {
    if (value < bands.low) return { key: 'below', label: 'Below legacy display band', colour: '#79b8ed' };
    if (value > bands.high) return { key: 'above', label: 'Above legacy display band', colour: '#eb7777' };
    return { key: 'within', label: 'Within legacy display band', colour: '#7dc39c' };
  }
  if (!validHumidityBands(bands)) return { key: 'unknown', label: 'Unavailable', colour: '#8795a8' };
  if (value < bands.dry_below) return { key: 'dry', label: 'Too dry', colour: '#79b8ed' };
  if (value < bands.good_min) return { key: 'low', label: 'Low humidity · warning', colour: '#efb86b' };
  if (value <= bands.good_max) return { key: 'good', label: 'Good range', colour: '#7dc39c' };
  if (value <= bands.wet_above) return { key: 'high', label: 'High humidity · warning', colour: '#efb86b' };
  return { key: 'wet', label: 'Too wet', colour: '#eb7777' };
}

export function humidityGradient(bands) {
  if (legacyHumidityBands(bands)) return `linear-gradient(to right,#79b8ed 0% ${bands.low}%,#7dc39c ${bands.low}% ${bands.high}%,#eb7777 ${bands.high}% 100%)`;
  return validHumidityBands(bands) ? `linear-gradient(to right,#79b8ed 0% ${bands.dry_below}%,#efb86b ${bands.dry_below}% ${bands.good_min}%,#7dc39c ${bands.good_min}% ${bands.good_max}%,#efb86b ${bands.good_max}% ${bands.wet_above}%,#eb7777 ${bands.wet_above}% 100%)` : 'none';
}

export function moveHumidityBoundary(bands, key, value) {
  const keys = validHumidityBands(bands) ? HUMIDITY_KEYS : legacyHumidityBands(bands) ? LEGACY_KEYS : [];
  if (!keys.includes(key) || !Number.isFinite(value)) return bands;
  const index = keys.indexOf(key), min = index ? bands[keys[index - 1]] + 1 : 0, max = index < keys.length - 1 ? bands[keys[index + 1]] - 1 : 100;
  if (min > max) return bands;
  return { ...bands, [key]: Math.max(min, Math.min(max, Math.round(value))) };
}
