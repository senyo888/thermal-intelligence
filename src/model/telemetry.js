// SPDX-License-Identifier: GPL-3.0-only
// Source presentation semantics are adapted from the approved TI visual baseline.
// Public provenance is recorded in docs/source-provenance.md.
import { finiteNumber } from './config.js';
import { humidityBands, humidityBand, legacyHumidityBands } from './humidity.js';
import { STATE_TELEMETRY, stateTelemetryValue } from './state-telemetry.js';
import { buildResponseArc } from './response-arc.js';

const LABELS = { humidity: 'Humidity', trend: 'Temperature trend', valve: 'Valve', energy: 'Energy', power: 'Power', custom: 'Telemetry' };
const UNITS = {
  humidity: ['%'], valve: ['%'],
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
    const sourceUnit = !entry.attribute && Object.hasOwn(attrs, 'unit_of_measurement') && typeof attrs.unit_of_measurement === 'string' ? attrs.unit_of_measurement : null;
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
    return result('available', semantic?.note || 'Reported observation; no controller decision is inferred.');
  });
}

const ICONS = { humidity: 'mdi:water-percent', trend: 'mdi:trending-up', valve: 'mdi:pipe-valve', energy: 'mdi:lightning-bolt', power: 'mdi:flash', custom: 'mdi:information-outline' };
const PRESET_ICONS = { frost: 'mdi:snowflake', eco: 'mdi:leaf', comfort: 'mdi:sofa', boost: 'mdi:fire' };
const validIcon = (value) => typeof value === 'string' && /^[a-z0-9_-]+:[a-z0-9_-]+$/i.test(value);
const display = (value) => typeof value === 'boolean' ? value ? 'On' : 'Off' : typeof value === 'number' ? String(Number(value.toPrecision(12))) : String(value ?? '');

/** Public source mappings only: no name matching or implicit entity discovery. */
export function buildSourceTelemetry(hass, config, climate, now, connected) {
  const telemetry = buildTelemetry(hass, config, now, connected, climate);
  const mapped = (key, kind) => {
    if (Object.hasOwn(config, key)) {
      // Reuse explicit metadata for the same state source, including its age limit.
      const sameSource = telemetry.find((row) => row.kind === kind && row.source.entity === config[key] && row.source.attribute === null);
      return sameSource ?? buildTelemetry(hass, { ...config, telemetry: [{ kind, entity: config[key] }] }, now, connected)[0];
    }
    return telemetry.find((row) => row.kind === kind) ?? null;
  };
  const humidity = mapped('humidity_entity', 'humidity');
  const trendSource = mapped('trend_entity', 'trend');
  const valve = mapped('valve_position_entity', 'valve');
  const featureRows = config.features.map((feature) => {
    const state = Object.hasOwn(hass?.states ?? {}, feature.entity) ? hass.states[feature.entity] : null;
    const label = feature.label || (feature.attribute ? feature.attribute.split('.').at(-1).replaceAll('_', ' ') : state?.attributes?.friendly_name) || feature.entity || 'Unconfigured feature';
    const entry = { kind: 'custom', entity: feature.entity, label };
    if (feature.attribute) entry.attribute = feature.attribute;
    if (feature.unit) entry.unit = feature.unit;
    return { ...buildTelemetry(hass, { ...config, telemetry: [entry] }, now, connected)[0], icon: feature.icon, feature };
  });
  const presetReadings = buildPresetReadings(featureRows, config, climate, connected);
  const headerRows = [...featureRows, ...telemetry];
  if (humidity && !headerRows.some((row) => row.kind === 'humidity' && row.source.entity === humidity.source.entity && row.source.attribute === humidity.source.attribute)) headerRows.splice(featureRows.length, 0, humidity);
  const headerTelemetry = headerRows.map((row, index) => {
    const preset = row.feature?.preset ?? null;
    const presetReading = preset ? presetReadings[preset] : null;
    if (preset && (!presetReading?.selected || presetReading.status !== 'available')) return null;
    const sourceState = Object.hasOwn(hass?.states ?? {}, row.source.entity) ? hass.states[row.source.entity] : null;
    const sourceIcon = sourceState?.attributes?.icon;
    const value = row.status === 'available' ? display(row.value) + (row.unit ? ` ${row.unit}` : '') : row.status === 'disabled' ? 'Not configured' : row.status.charAt(0).toUpperCase() + row.status.slice(1);
    return {
      ...row, key: `extra-${index}-${row.source.entity}-${row.source.attribute || 'state'}`,
      entity: row.source.entity, attribute: row.source.attribute, rawValue: row.value, value,
      shortLabel: presetReading?.label ?? row.label, icon: validIcon(row.icon) ? row.icon : preset && Object.hasOwn(PRESET_ICONS, preset) ? PRESET_ICONS[preset] : validIcon(sourceIcon) ? sourceIcon : ICONS[row.kind],
      colour: row.status === 'available' ? row.colour : '#8795a8',
      activity: preset ? 'active' : row.status !== 'available' ? 'unknown' : row.activity || ([true, 'on', 'On', 'true'].includes(row.value) ? 'active' : 'neutral'),
      activityLabel: preset ? 'Preset selected' : row.kind === 'humidity' ? row.status === 'available' ? row.bandStatus.label : row.status.charAt(0).toUpperCase() + row.status.slice(1) : '', topic: row.topic || (row.kind === 'humidity' ? 'humidity' : 'entity'), preset,
    };
  }).filter(Boolean);
  const trend = trendPresentation(trendSource, climate);
  const output = outputPresentation(valve, climate, connected);
  const arc = buildResponseArc({ hass, config, climate, trendSource, valve, now, connected });
  return { telemetry, humidity, features: featureRows, headerTelemetry, presetReadings, trend, output, arc };
}

function buildPresetReadings(features, config, climate, connected) {
  const choice = climate.choices?.find((item) => item.key === 'preset_mode');
  const advertised = choice?.options ?? [];
  const keys = [...new Set([...advertised, ...features.map((row) => row.feature.preset).filter((preset) => typeof preset === 'string')])];
  return Object.fromEntries(keys.map((preset) => {
    const matches = features.filter((row) => row.feature.preset === preset);
    const row = matches.length === 1 ? matches[0] : null;
    const label = Object.hasOwn(config.preset_labels, preset) ? config.preset_labels[preset] : row?.label || preset.charAt(0).toUpperCase() + preset.slice(1);
    const selected = connected && climate.ready && climate.available && climate.state === 'heat' && preset !== 'none' && advertised.includes(preset) && choice?.value === preset;
    const result = { preset, label, status: 'unknown', value: null, unit: row?.unit ?? null, source: row?.source ?? null, selected: !!selected, reason: '' };
    const finish = (status, reason, value = null) => [preset, { ...result, status, value, reason }];
    if (!advertised.includes(preset)) return finish('unsupported', 'This preset is not advertised by the selected climate entity.');
    if (!matches.length) return finish('disabled', 'No explicit temperature source is associated with this preset.');
    if (matches.length > 1) return finish('invalid', 'Multiple temperature sources are associated with this preset; no source is selected.');
    if (row.status !== 'available') return finish(row.status, row.detail);
    const number = finiteNumber(row.value);
    if (number === null) return finish('invalid', 'The associated preset reading must be a finite number.');
    if (!['°C', '°F'].includes(row.unit)) return finish('invalid', 'The associated preset reading requires a reported or explicit temperature unit.');
    if (!['°C', '°F'].includes(climate.unit)) return finish('unknown', 'The selected climate temperature unit is unknown.');
    if (row.unit !== climate.unit) return finish('invalid', 'The preset reading and selected climate use different temperature units; no conversion was applied.');
    return finish('available', 'Explicit preset-temperature observation; only the provider-selected preset controls its active indicator.', number);
  }));
}

function trendPresentation(row, climate) {
  const value = row?.value ?? null, unit = row?.unit ?? null;
  const fahrenheit = typeof unit === 'string' && unit.startsWith('°F');
  const hourly = typeof unit === 'string' && unit.endsWith('/min') ? value * 60 : value;
  const validRate = Number.isFinite(hourly);
  const available = row?.status === 'available' && validRate && climate.ready && climate.current !== null;
  const stable = fahrenheit ? 0.09 : 0.05, rapid = fahrenheit ? 4.5 : 2.5;
  const label = !available ? 'Trend unavailable' : Math.abs(hourly) <= stable ? 'Stable' : hourly > 0 ? 'Rising' : 'Falling';
  const color = !available ? '#8795a8' : hourly === 0 ? '#c4d4e7' : Math.abs(hourly) <= stable ? '#62e3b0' : hourly > rapid ? '#ff5252' : hourly > 0 ? '#ff962e' : hourly < -rapid ? '#4169ff' : '#32bfff';
  const reading = available ? value !== 0 && Number(value.toFixed(2)) === 0 ? value.toPrecision(3) : value.toFixed(2) : '';
  return {
    available: !!available, value, unit, label, color,
    text: available ? `${label} · ${value > 0 ? '+' : ''}${reading} ${unit}` : label,
    status: available ? 'available' : row?.status === 'available' ? validRate ? 'unavailable' : 'invalid' : row?.status ?? 'disabled',
    source: row?.source ?? null,
    detail: row?.detail || 'No temperature-trend source is configured.',
  };
}

function outputPresentation(valve, climate, connected) {
  if (valve) {
    const percentage = valve.status === 'available' ? valve.value : null;
    const value = percentage === null ? 'Unavailable' : percentage > 0 && percentage < 1 ? '<1%' : `${Number(percentage.toFixed(1))}%`;
    return { kind: 'trv', icon: 'mdi:pipe-valve', percentage, display: value,
      text: percentage === null ? 'TRV unavailable' : `TRV ${percentage > 0 ? 'Open' : 'Closed'} · ${value}`,
      tone: !connected || percentage === null ? 'unknown' : percentage > 0 ? 'open' : 'neutral',
      status: valve.status, source: valve.source,
      detail: 'Reported valve opening; this does not establish boiler heating or heat delivery.' };
  }
  const mode = climate.state, action = climate.action;
  const inconsistent = mode === 'off' && ['heating', 'cooling', 'fan', 'drying'].includes(action);
  const unavailable = !connected || !climate.available || inconsistent;
  const vt = climate.provider.kind === 'vtherm';
  const reported = ({ heating: vt ? 'Heat requested' : 'Heating (reported)', cooling: 'Cooling (reported)', idle: 'Idle', off: 'Off', fan: 'Fan running', drying: 'Drying', preheating: 'Preheating (reported)', defrosting: 'Defrosting (reported)' })[action];
  return { kind: 'thermostat', icon: null, action: unavailable ? null : action, mode,
    text: unavailable ? inconsistent ? 'Activity uncertain' : 'Thermostat unavailable' : mode === 'off' ? 'Off' : reported || (mode === 'heat' ? 'Heat enabled' : 'Activity unavailable'),
    tone: unavailable ? 'unknown' : action === 'heating' ? vt ? 'request' : 'heat' : action === 'cooling' ? 'cool' : 'neutral',
    status: unavailable ? 'unavailable' : reported || mode === 'off' ? 'available' : 'unknown',
    source: { entity: climate.entity, attribute: 'hvac_action', evidence: 'Selected climate entity reports its activity' },
    detail: 'Thermostat-reported activity; physical heat delivery is not verified.' };
}
