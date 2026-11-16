// SPDX-License-Identifier: GPL-3.0-only
import { finiteNumber } from './config.js';
import { buildResponseArc } from './response-arc.js';
import { buildTelemetry } from './readings.js';
import { buildVTReadings } from './vt-readings.js';
import { selectHeaderIcons } from './header-icons.js';
export { buildTelemetry, readOwnPath } from './readings.js';

const ICONS = { temperature: 'mdi:thermometer', humidity: 'mdi:water-percent', trend: 'mdi:trending-up', valve: 'mdi:pipe-valve', energy: 'mdi:lightning-bolt', power: 'mdi:flash', custom: 'mdi:information-outline' };
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
  const identities = new Map();
  const keyFor = (group, parts) => {
    const base = `${group}:${JSON.stringify(parts)}`;
    const occurrence = identities.get(base) || 0; identities.set(base, occurrence + 1);
    return `${base}:${occurrence}`;
  };
  telemetry.forEach(row=>{row.key=keyFor('telemetry',[row.kind,row.source.entity,row.source.attribute||'']);row.group='primary';});
  const featureRows = config.features.map((feature) => {
    const state = Object.hasOwn(hass?.states ?? {}, feature.entity) ? hass.states[feature.entity] : null;
    const label = feature.label || (feature.attribute ? feature.attribute.split('.').at(-1).replaceAll('_', ' ') : state?.attributes?.friendly_name) || feature.entity || 'Unconfigured feature';
    const entry = { kind: 'custom', entity: feature.entity, label };
    if (feature.attribute) entry.attribute = feature.attribute;
    if (feature.unit) entry.unit = feature.unit;
    return { ...buildTelemetry(hass, { ...config, telemetry: [entry] }, now, connected)[0], icon: feature.icon, feature, group:'primary', key:keyFor('feature',[feature.entity,feature.attribute||'',feature.preset||'']) };
  });
  const presetReadings = buildPresetReadings(featureRows, config, climate, connected);
  const vtReadings = buildVTReadings(hass,config,climate,now,connected);
  const headerRows = [...featureRows, ...telemetry];
  if (humidity && !headerRows.some((row) => row.kind === 'humidity' && row.source.entity === humidity.source.entity && row.source.attribute === humidity.source.attribute)) headerRows.splice(featureRows.length, 0, {...humidity,group:'primary',key:'direct:humidity'});
  headerRows.push(...vtReadings);
  const headerOptions = headerRows.map((row) => {
    const preset = row.feature?.preset ?? null;
    const presetReading = preset ? presetReadings[preset] : null;
    const headerEligible = !preset || (presetReading?.selected && presetReading.status === 'available');
    const sourceState = Object.hasOwn(hass?.states ?? {}, row.source.entity) ? hass.states[row.source.entity] : null;
    const sourceIcon = sourceState?.attributes?.icon;
    const value = row.status === 'available' ? (row.estimated?'≈ ':'') + display(row.value) + (row.unit ? ` ${row.unit}` : '') : row.status === 'disabled' ? 'Not configured' : row.status.charAt(0).toUpperCase() + row.status.slice(1);
    return {
      ...row, headerEligible,
      entity: row.source.entity, attribute: row.source.attribute, rawValue: row.value, value,
      shortLabel: presetReading?.label ?? row.label, icon: validIcon(row.icon) ? row.icon : preset && Object.hasOwn(PRESET_ICONS, preset) ? PRESET_ICONS[preset] : validIcon(sourceIcon) ? sourceIcon : ICONS[row.kind],
      colour: row.status === 'available' ? row.colour : '#8795a8',
      activity: preset ? 'active' : row.status !== 'available' ? 'unknown' : row.activity || ([true, 'on', 'On', 'true'].includes(row.value) ? 'active' : 'neutral'),
      activityLabel: preset ? 'Preset selected' : row.kind === 'humidity' ? row.status === 'available' ? row.bandStatus.label : row.status.charAt(0).toUpperCase() + row.status.slice(1) : '', topic: row.topic || (row.kind === 'humidity' ? 'humidity' : 'entity'), preset,
    };
  });
  const headerTelemetry = selectHeaderIcons(headerOptions,config);
  const trend = trendPresentation(trendSource, climate, connected);
  const output = outputPresentation(valve, climate, connected);
  const arc = buildResponseArc({ hass, config, climate, trendSource, valve, now, connected });
  return { telemetry, vtReadings, humidity, features: featureRows, headerOptions, headerTelemetry, presetReadings, trend, output, arc };
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

function trendPresentation(row, climate, connected) {
  const value = row?.value ?? null, unit = row?.unit ?? null;
  const fahrenheit = typeof unit === 'string' && unit.startsWith('°F');
  const hourly = typeof unit === 'string' && unit.endsWith('/min') ? value * 60 : value;
  const validRate = Number.isFinite(hourly);
  const available = row?.status === 'available' && validRate && connected && climate.available && Number.isFinite(climate.current);
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
  if (valve && valve.status !== 'disabled') {
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
