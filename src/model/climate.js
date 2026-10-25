// SPDX-License-Identifier: GPL-3.0-only
import { finiteNumber, normalizeConfig } from './config.js';
import { buildTelemetry } from './telemetry.js';
import { providerReadiness, resolveProvider } from '../providers/identity.js';
import { vthermDetails } from '../providers/vtherm.js';

export const FEATURES = Object.freeze({ TARGET_TEMPERATURE: 1, TARGET_TEMPERATURE_RANGE: 2, FAN_MODE: 8, PRESET_MODE: 16, SWING_MODE: 32, SWING_HORIZONTAL_MODE: 512 });
const own = (object, key) => object != null && Object.hasOwn(object, key);
const attr = (attributes, key) => own(attributes, key) ? attributes[key] : undefined;
const number = (attributes, key) => finiteNumber(attr(attributes, key));
const strings = (value) => Array.isArray(value) ? [...new Set(value.filter((item) => typeof item === 'string' && item.trim()))] : [];
const serviceAvailable = (hass, name) => own(hass?.services?.climate, name) && hass.services.climate[name] !== null && hass.services.climate[name] !== undefined;

function activityFor(state, provider, available, connected) {
  if (!connected) return { label: 'Disconnected', detail: 'Activity cannot be refreshed.' };
  if (!available) return { label: 'Unavailable', detail: 'The climate entity has no available state.' };
  const reported = attr(state.attributes, 'hvac_action');
  if (typeof reported !== 'string' || !reported.trim() || ['unknown', 'unavailable'].includes(reported)) return { label: 'Unknown', detail: 'No integration-reported activity is available.' };
  if (provider.kind === 'vtherm' && reported === 'heating') return { label: 'Heat requested', detail: 'Versatile Thermostat reports heating; physical heat delivery is not verified.' };
  return { label: `${reported.charAt(0).toUpperCase()}${reported.slice(1)} (reported)`, detail: 'Thermostat-reported activity; physical heat delivery is not verified.' };
}

export function buildModel(hass, rawConfig, identity = null, { now = Date.now() } = {}) {
  const config = normalizeConfig(rawConfig);
  const state = own(hass?.states, config.entity) ? hass.states[config.entity] : null;
  const attributes = state?.attributes ?? {};
  const connected = hass?.connected === true || (hass?.connected !== false && hass?.connection?.connected === true);
  const available = !!state && typeof state.state === 'string' && !['unknown', 'unavailable', ''].includes(state.state);
  const provider = resolveProvider(config, identity);
  const readiness = providerReadiness(provider, attributes);
  const ready = connected && available && readiness.ready;
  const unitValue = hass?.config?.unit_system?.temperature;
  const unit = ['°C', '°F'].includes(unitValue) ? unitValue : null;
  const min = number(attributes, 'min_temp');
  const max = number(attributes, 'max_temp');
  const advertisedStep = attr(attributes, 'target_temp_step');
  const step = advertisedStep !== undefined ? finiteNumber(advertisedStep) : config.step ?? (unit === '°C' ? 0.5 : unit === '°F' ? 1 : null);
  const stepSource = advertisedStep !== undefined ? 'entity' : config.step !== undefined ? 'configuration' : 'display increment';
  const flags = number(attributes, 'supported_features');
  const supported = Number.isSafeInteger(flags) && flags >= 0 ? flags : 0;
  const has = (flag) => (supported & flag) === flag;
  const ranged = has(FEATURES.TARGET_TEMPERATURE_RANGE) && (state?.state === 'heat_cool' || !has(FEATURES.TARGET_TEMPERATURE));
  const keys = ranged ? ['target_temp_low', 'target_temp_high'] : has(FEATURES.TARGET_TEMPERATURE) ? ['temperature'] : [];
  const targets = Object.fromEntries(keys.map((key) => [key, number(attributes, key)]));
  const boundsValid = min !== null && max !== null && min < max && Number.isFinite(max - min);
  const stepValid = step !== null && step > 0 && boundsValid && step <= max - min && Number.isSafeInteger(Math.floor((max - min) / step));
  const targetsValid = keys.length > 0 && keys.every((key) => targets[key] !== null && targets[key] >= min && targets[key] <= max)
    && (!ranged || targets.target_temp_low <= targets.target_temp_high);
  let reason = !config.entity ? 'Select a climate entity.' : !connected ? 'Home Assistant is disconnected.' : !available ? 'The climate entity is unavailable or unknown.' : !readiness.ready ? readiness.reason : '';
  const controlReason = reason;
  if (!reason) reason = !keys.length ? 'Temperature setting is unsupported.' : !unit ? 'Temperature unit is unknown.' : !boundsValid ? 'Temperature limits are invalid or unavailable.' : !stepValid ? 'Temperature step is invalid.' : !targetsValid ? 'The current target is invalid or unavailable.' : !serviceAvailable(hass, 'set_temperature') ? 'The set_temperature service is unavailable.' : '';
  const canSet = ready && !reason;
  const choiceSpecs = [
    ['hvac_mode', 'HVAC mode', 'hvac_modes', null, 'set_hvac_mode'],
    ['preset_mode', 'Preset', 'preset_modes', FEATURES.PRESET_MODE, 'set_preset_mode'],
    ['fan_mode', 'Fan', 'fan_modes', FEATURES.FAN_MODE, 'set_fan_mode'],
    ['swing_mode', 'Swing', 'swing_modes', FEATURES.SWING_MODE, 'set_swing_mode'],
    ['swing_horizontal_mode', 'Horizontal swing', 'swing_horizontal_modes', FEATURES.SWING_HORIZONTAL_MODE, 'set_swing_horizontal_mode'],
  ];
  const choices = choiceSpecs.map(([key, label, list, flag, service]) => {
    const options = strings(attr(attributes, list));
    const capability = flag === null || has(flag);
    const enabled = ready && capability && options.length > 0 && serviceAvailable(hass, service);
    const value = key === 'hvac_mode' ? state?.state ?? null : attr(attributes, key) ?? null;
    const reason = controlReason || (!capability ? 'Unsupported by this climate entity.' : !options.length ? 'No supported options reported.' : !serviceAvailable(hass, service) ? `The ${service} service is unavailable.` : '');
    return { key, label, options: capability ? options : [], value, service, enabled, status: !capability ? 'unsupported' : enabled ? 'available' : 'unavailable', reason };
  });
  if (provider.kind === 'vtherm') {
    const version = attr(attributes, 'version');
    if (typeof version === 'string' && version.trim()) provider.version = version;
  }
  return {
    entity: config.entity, name: config.name || attr(attributes, 'friendly_name') || config.entity || 'Thermal Intelligence',
    provider, connected, available, ready, readiness, unit, min, max, step, stepSource,
    keys, targets, ranged, current: number(attributes, 'current_temperature'), choices, canSet, reason,
    activity: activityFor(state, provider, available, connected),
    ownership: { label: 'Unknown', detail: 'No authoritative ownership contract is configured; presets and temperatures do not establish ownership.' },
    telemetry: buildTelemetry(hass, config, now, connected), details: provider.kind === 'vtherm' ? vthermDetails(attributes, connected && available) : [],
  };
}

/** Clamp to the valid min-anchored grid; never manufacture a non-grid maximum. */
export function quantize(value, min, max, step) {
  if (![value, min, max, step].every((item) => typeof item === 'number' && Number.isFinite(item)) || min >= max || !Number.isFinite(max - min) || step <= 0 || step > max - min || !Number.isSafeInteger(Math.floor((max - min) / step))) throw new Error('Invalid temperature value, limits or step.');
  const last = Math.floor((max - min) / step + 1e-9);
  const position = Math.max(0, Math.min(last, Math.round((Math.max(min, Math.min(max, value)) - min) / step)));
  const result = min + position * step;
  // Remove binary floating-point noise without erasing a small valid increment.
  const digits = Math.max(0, Math.min(100, Math.ceil(-Math.log10(step)) + 10));
  return Number(result.toFixed(digits));
}

/** Return temperature parameters only. The dispatcher owns the captured entity ID. */
export function targetPayload(model, key, proposedValue) {
  if (!model?.canSet || !model.keys?.includes(key)) throw new Error(model?.reason || 'Temperature control is unavailable.');
  const value = quantize(proposedValue, model.min, model.max, model.step);
  const values = { ...model.targets, [key]: value };
  if (model.ranged && (values.target_temp_low === null || values.target_temp_high === null || values.target_temp_low > values.target_temp_high)) throw new Error('The low target must not exceed the high target.');
  return values;
}
