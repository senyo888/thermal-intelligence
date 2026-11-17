// SPDX-License-Identifier: GPL-3.0-only
const text=value=>typeof value==='string'&&value.trim().length>0;
const enabled=entry=>entry.disabled_by==null&&entry.hidden_by==null;

/** Registry-defined VT switch identity, never an entity-name guess. Navigation only. */
export function autoStartStopSwitch(entries,entity) {
  if(!Array.isArray(entries))return null;
  const climates=entries.filter(row=>row?.entity_id===entity);
  if(climates.length!==1)return null;
  const climate=climates[0];
  if(climate.platform!=='versatile_thermostat'||!enabled(climate)||!text(climate.device_id)||!text(climate.config_entry_id))return null;
  const matches=entries.filter(row=>row&&/^switch\.[a-z0-9_]+$/.test(row.entity_id)&&row.platform==='versatile_thermostat'&&enabled(row)
    &&row.device_id===climate.device_id&&row.config_entry_id===climate.config_entry_id
    &&typeof row.unique_id==='string'&&/^.+_enable_auto_start_stop$/.test(row.unique_id));
  return matches.length===1?matches[0].entity_id:null;
}
