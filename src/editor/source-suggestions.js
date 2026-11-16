// SPDX-License-Identifier: GPL-3.0-only
import { buildTelemetry, readOwnPath } from '../model/telemetry.js';
import { STATE_TELEMETRY } from '../model/state-telemetry.js';

const nonempty = value => typeof value === 'string' && value.length > 0;
const direct = { trend:'trend_entity', humidity:'humidity_entity', valve:'valve_position_entity' };
const identity = row => ['id','entity_id','platform','config_entry_id','device_id','unique_id','translation_key','disabled_by'].map(key => row?.[key] ?? null);

/** Explicit registry roles, never entity-name guesses. Returns observations only. */
export function sourceSuggestions(hass, config, registry) {
  const rows = [];
  const anchors = Array.isArray(registry) ? registry.filter(row => row.entity_id === config.entity) : [];
  const anchor = anchors.length === 1 ? anchors[0] : null;
  if (!anchor || anchor.platform !== 'versatile_thermostat' || !nonempty(anchor.config_entry_id)
      || !nonempty(anchor.device_id) || anchor.unique_id !== anchor.config_entry_id) return rows;
  const attrs = hass?.states?.[config.entity]?.attributes ?? {};
  const occupied = kind => (direct[kind] && Object.hasOwn(config, direct[kind]))
    || config.telemetry?.some(row => row.kind === kind);
  const offer = (kind, entry, reason, candidate = anchor) => {
    if (occupied(kind) || config.features?.some(row => row.entity === entry.entity && (row.attribute || '') === (entry.attribute || ''))) return;
    const observation = buildTelemetry(hass, {...config,telemetry:[entry]}, Date.now(), hass?.connected !== false,
      {provider:{kind:'vtherm'}})[0];
    rows.push({kind,entry,reason,identity:JSON.stringify([identity(anchor),identity(candidate)]),status:observation.status,detail:observation.detail,value:observation.value,unit:observation.unit});
  };
  const slopes = registry.filter(row => row.entity_id?.startsWith('sensor.') && row.platform === 'versatile_thermostat'
    && row.config_entry_id === anchor.config_entry_id && row.device_id === anchor.device_id
    && row.translation_key === 'temperature_slope' && typeof row.unique_id === 'string'
    && row.unique_id.endsWith('_temperature_slope') && row.unique_id.length > '_temperature_slope'.length);
  if (!occupied('trend') && slopes.length === 1) {
    if (slopes[0].disabled_by === null) offer('trend',{kind:'trend',entity:slopes[0].entity_id},'VT temperature slope · matched through its registry role and device.',slopes[0]);
    else rows.push({kind:'trend',status:'disabled',detail:'Enable the VT slope sensor in Home Assistant, or choose another trend sensor.',reason:'VT temperature slope',entry:null});
  } else if (!occupied('trend') && slopes.length > 1) {
    rows.push({kind:'trend',status:'unknown',detail:'More than one VT slope sensor matches. Choose the source explicitly.',reason:'VT temperature slope',entry:null});
  }
  const humidity = readOwnPath(attrs,'humidity_manager.humidity_sensor_entity_id').value;
  if (attrs.is_humidity_configured === true && typeof humidity === 'string' && /^sensor\.[a-z0-9_]+$/.test(humidity)) {
    offer('humidity',{kind:'humidity',entity:humidity},'Humidity sensor explicitly reported by VT.');
  }
  for (const kind of ['window','motion','presence','power_management']) {
    const semantic = STATE_TELEMETRY[kind];
    if (attrs[semantic.flag] === true) offer(kind,{kind,entity:config.entity,attribute:semantic.path},'Accepted feature state reported by VT; separate from the raw input.');
  }
  if (attrs.is_window_auto_configured === true) offer('window',{kind:'window',entity:config.entity,attribute:'window_manager.window_auto_state',label:'Automatic window detection'},'Automatic window state reported by VT; distinct from its physical window input.');
  if (typeof readOwnPath(attrs,'vtherm_over_climate.follow_underlying_temp_change').value === 'boolean') offer('follow',{kind:'follow',entity:config.entity,attribute:STATE_TELEMETRY.follow.path},'VT-reported Follow setting; selecting this reading does not change it.');
  return rows;
}
