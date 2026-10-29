// SPDX-License-Identifier: GPL-3.0-only
import { validHumidityBands, legacyHumidityBands } from './humidity.js';

export const CARD_TAG = 'thermal-intelligence-beta-card';
export const EDITOR_TAG = 'thermal-intelligence-beta-card-editor';
export const CARD_TYPE = `custom:${CARD_TAG}`;
export const SCHEMA_VERSION = 1;
export const TELEMETRY_KINDS = ['humidity', 'trend', 'valve', 'energy', 'power', 'window', 'motion', 'presence', 'power_management', 'follow', 'custom'];
export const BACKGROUNDS = ['blue', 'plum', 'black'];
const FORBIDDEN_KEYS = new Set(['__proto__', 'prototype', 'constructor']);
const ENTITY = /^[a-z0-9_]+\.[a-z0-9_]+$/;

export function isRecord(value) {
  return value !== null && typeof value === 'object'
    && (Object.getPrototypeOf(value) === Object.prototype || Object.getPrototypeOf(value) === null);
}

export function finiteNumber(value) {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value !== 'string' || !value.trim() || !/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i.test(value.trim())) return null;
  const result = Number(value);
  return Number.isFinite(result) ? result : null;
}

function numberOption(value, name, positive = false) {
  if (typeof value !== 'number' || !Number.isFinite(value) || (positive && value <= 0)) {
    throw new Error(`${name} must be a finite${positive ? ' positive' : ''} number.`);
  }
  return value;
}

function safeText(value, name, { empty = false } = {}) {
  if (typeof value !== 'string' || (!empty && !value.trim()) || /[\u0000-\u001f\u007f<>]/u.test(value)) {
    throw new Error(`${name} must be plain text.`);
  }
  return value;
}

export function normalizeConfig(raw) {
  if (!isRecord(raw)) throw new Error('Card configuration must be an object.');
  if (raw.type !== undefined && raw.type !== CARD_TYPE) throw new Error(`Card type must be ${CARD_TYPE}.`);
  if (raw.schema_version !== undefined && raw.schema_version !== SCHEMA_VERSION) throw new Error('Unsupported configuration schema_version.');
  const entity = raw.entity === undefined ? '' : raw.entity;
  if (typeof entity !== 'string' || (entity !== '' && (!ENTITY.test(entity) || !entity.startsWith('climate.')))) {
    throw new Error('Select a climate entity.');
  }
  const adapter = raw.adapter === undefined ? 'auto' : raw.adapter;
  if (!['auto', 'standard', 'vtherm'].includes(adapter)) throw new Error('Adapter must be auto, standard or vtherm.');
  const background = raw.background === undefined ? 'blue' : raw.background;
  if (!BACKGROUNDS.includes(background)) throw new Error('Background must be blue, plum or black.');
  // Retain a saved prototype setting for round trips; the source UI uses background.
  if (raw.theme !== undefined && !['auto', 'light', 'dark'].includes(raw.theme)) throw new Error('Legacy theme must be auto, light or dark.');
  const result = { ...raw, type: CARD_TYPE, schema_version: SCHEMA_VERSION, entity, adapter, background };
  for (const key of ['trend_entity', 'humidity_entity', 'valve_position_entity']) {
    if (raw[key] !== undefined && (typeof raw[key] !== 'string' || (raw[key] !== '' && (!ENTITY.test(raw[key]) || !raw[key].startsWith('sensor.'))))) {
      throw new Error(`${key} must be a sensor entity ID or empty.`);
    }
  }
  if (raw.response_arc !== undefined) {
    if (!isRecord(raw.response_arc)) throw new Error('response_arc must be an object.');
    const response = { ...raw.response_arc };
    for (const [key, domain] of [['room_sensor', 'sensor'], ['native_thermostat', 'climate'], ['confirmed_output', 'climate'], ['heat_source', 'climate']]) {
      const value = response[key];
      if (value !== undefined && (typeof value !== 'string' || (value !== '' && (!ENTITY.test(value) || !value.startsWith(`${domain}.`))))) {
        throw new Error(`response_arc.${key} must be a ${domain} entity ID or empty.`);
      }
    }
    if (response.freshness_minutes !== undefined) {
      numberOption(response.freshness_minutes, 'response_arc.freshness_minutes', true);
      if (response.freshness_minutes > 30) throw new Error('response_arc.freshness_minutes must be at most 30 minutes.');
    }
    result.response_arc = response;
  }
  if (raw.name !== undefined) result.name = safeText(raw.name, 'Name', { empty: true });
  if (raw.step !== undefined) result.step = numberOption(raw.step, 'Step', true);
  for (const key of ['show_activity', 'show_details']) {
    if (raw[key] !== undefined && typeof raw[key] !== 'boolean') throw new Error(`${key} must be true or false.`);
    result[key] = raw[key] ?? true;
  }
  if (raw.preset_labels !== undefined && !isRecord(raw.preset_labels)) throw new Error('preset_labels must be an object.');
  result.preset_labels = {};
  for (const [key, label] of Object.entries(raw.preset_labels ?? {})) {
    if (FORBIDDEN_KEYS.has(key)) throw new Error('Invalid preset label key.');
    safeText(key, 'Preset key');
    result.preset_labels[key] = safeText(label, 'Preset label');
  }
  if (raw.telemetry !== undefined && !Array.isArray(raw.telemetry)) throw new Error('telemetry must be an array.');
  result.telemetry = (raw.telemetry ?? []).map((entry) => {
    if (!isRecord(entry) || !TELEMETRY_KINDS.includes(entry.kind)) throw new Error('Unsupported telemetry kind.');
    if (typeof entry.entity !== 'string' || (entry.entity !== '' && !ENTITY.test(entry.entity))) throw new Error('Telemetry entity must be an entity ID or empty.');
    const copy = { ...entry };
    if (entry.attribute !== undefined) {
      safeText(entry.attribute, 'Telemetry attribute');
      if (entry.attribute.split('.').some((part) => !part || FORBIDDEN_KEYS.has(part))) throw new Error('Invalid telemetry attribute path.');
    }
    for (const key of ['label', 'unit']) if (entry[key] !== undefined) safeText(entry[key], `Telemetry ${key}`);
    if (entry.max_age_seconds !== undefined) numberOption(entry.max_age_seconds, 'Telemetry max_age_seconds', true);
    return copy;
  });
  if (raw.features !== undefined && !Array.isArray(raw.features)) throw new Error('features must be an array.');
  result.features = (raw.features ?? []).map((entry) => {
    if (!isRecord(entry) || typeof entry.entity !== 'string' || (entry.entity !== '' && !ENTITY.test(entry.entity))) throw new Error('A feature requires an entity ID or an empty setup source.');
    const copy = { ...entry };
    for (const key of ['label', 'unit']) if (entry[key] !== undefined) safeText(entry[key], `Feature ${key}`, { empty: true });
    if (entry.attribute !== undefined && entry.attribute !== '') {
      safeText(entry.attribute, 'Feature attribute');
      if (entry.attribute.split('.').some((part) => !/^\w+$/.test(part) || FORBIDDEN_KEYS.has(part))) throw new Error('Invalid feature attribute path.');
    }
    if (entry.icon !== undefined && (typeof entry.icon !== 'string' || !/^[a-z0-9_-]+:[a-z0-9_-]+$/i.test(entry.icon))) throw new Error('Feature icon must be a named icon, such as mdi:thermometer.');
    if (entry.preset !== undefined) {
      safeText(entry.preset, 'Feature preset');
      if (FORBIDDEN_KEYS.has(entry.preset)) throw new Error('Invalid feature preset value.');
    }
    return copy;
  });
  if (raw.humidity_bands !== undefined) {
    if (!isRecord(raw.humidity_bands)) throw new Error('humidity_bands must be an object.');
    if (!validHumidityBands(raw.humidity_bands) && !legacyHumidityBands(raw.humidity_bands)) throw new Error('Humidity guides require ordered integer dry_below < good_min < good_max < wet_above within 0–100, or explicit legacy low < high bounds. Do not mix the formats.');
    result.humidity_bands = { ...raw.humidity_bands };
  }
  return result;
}
