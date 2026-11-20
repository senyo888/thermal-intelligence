// SPDX-License-Identifier: GPL-3.0-only
import { buildTelemetry, readOwnPath } from './readings.js';

const PRESETS = { frost:'mdi:snowflake', eco:'mdi:leaf', comfort:'mdi:sofa', boost:'mdi:fire' };
const OWNERS = { House:'mdi:home-thermometer', Schedule:'mdi:calendar-clock', Manual:'mdi:hand-back-right', VT:'mdi:thermostat', Provider:'mdi:thermostat', Policy:'mdi:thermostat', Other:'mdi:thermostat', Pending:'mdi:progress-clock', Unknown:'mdi:help-circle-outline' };
const label = value => value.charAt(0).toUpperCase()+value.slice(1);

function mapped(hass,config,key,now,connected) {
  const mapping=config[key];
  if(!mapping?.entity)return null;
  const entry={kind:'custom',entity:mapping.entity};
  for(const key of ['attribute','max_age_seconds'])if(Object.hasOwn(mapping,key))entry[key]=mapping[key];
  let row=buildTelemetry(hass,{telemetry:[entry]},now,connected)[0];
  const attrs=hass.states?.[mapping.entity]?.attributes??{};
  if(row.status==='available'&&mapping.climate_attribute&&readOwnPath(attrs,mapping.climate_attribute).value!==config.entity)
    row={...row,status:'invalid',value:null,detail:'The mapped source does not identify this thermostat.'};
  if(row.status==='available'&&mapping.ready_attribute&&readOwnPath(attrs,mapping.ready_attribute).value!==true)
    row={...row,status:'unknown',value:null,detail:'The mapped source has not confirmed that its report is ready.'};
  if(row.status==='available'&&mapping.clear_attributes?.some(path=>{const field=readOwnPath(attrs,path);return field.value!==null;}))
    row={...row,status:'unknown',value:null,detail:'A required source guard is missing or has not cleared.'};
  return row;
}

/** Reported policy, preset and provider identity are independent observations. */
export function buildControlIndicators(hass,config,climate,now,connected) {
  const base={kind:'custom',group:'control',unit:null,source:{entity:config.entity,attribute:null},topic:'entity'};
  const choice=climate.choices?.find(row=>row.key==='preset_mode'),vt=climate.provider?.kind==='vtherm';
  const rows=Object.entries(PRESETS).filter(([preset])=>choice?.options.includes(preset)).map(([preset,icon])=>({
    ...base,key:`preset:${preset}`,label:`${vt?'VT':'Thermostat'} ${Object.hasOwn(config.preset_labels,preset)?config.preset_labels[preset]:label(preset)}`,icon,preset,
    status:connected&&climate.available?'available':'unavailable',value:Object.hasOwn(config.preset_labels,preset)?config.preset_labels[preset]:label(preset),badge:vt?'VT':'Thermostat',
    headerEligible:connected&&climate.available&&climate.ready&&climate.state==='heat'&&choice.value===preset,
    activity:'active',source:{entity:config.entity,attribute:'preset_mode'},
    detail:'Preset reported by this thermostat. It does not identify the household policy or control owner.',
  }));
  if(['vtherm','standard'].includes(climate.provider?.kind))rows.push({...base,key:'control:provider',label:vt?'VT provider':'Thermostat provider',icon:'mdi:thermostat',monogram:vt?'VT':'P',value:connected&&climate.available?'Provider':'Unavailable',status:connected&&climate.available?'available':'unavailable',activity:'neutral',detail:`${climate.provider.evidence}. Provider identity does not establish control ownership.`});
  rows.push({...base,key:'control:manual_adjustment',label:'Manual adjustment reported',icon:'mdi:hand-back-right',value:'No adjustment reported',status:'disabled',activity:'neutral',headerEligible:false,detail:'Appears after a temperature adjustment from this card is acknowledged and a matching target is observed. It describes that action, not continuing control ownership.'});
  const source=mapped(hass,config,'control_source',now,connected);
  const owner=source?.status==='available'&&typeof source.value==='string'&&Object.hasOwn(OWNERS,source.value)?source.value:'Unknown';
  const ownership={label:owner,status:source?.status??'unknown',detail:source?.status==='available'?'Control source reported by the explicitly mapped entity. Provider identity and presets are separate.':source?.detail||'No control-source entity is mapped. Presets, matching targets and schedule activation do not establish ownership.',source:source?.source};
  if(source?.status==='available'&&owner==='Unknown'&&source.value!=='Unknown'){ownership.status='unknown';ownership.detail='The mapped source does not report a recognised control source.';}
  rows.push({...base,...source,key:'control:ownership',label:'Control source',icon:OWNERS[owner],monogram:owner==='VT'?'VT':['Provider','Policy','Other'].includes(owner)?'P':null,value:['available','unknown'].includes(ownership.status)?owner:label(ownership.status),status:ownership.status,activity:owner==='Unknown'||owner==='Pending'?'unknown':'active',detail:ownership.detail});
  const house=mapped(hass,config,'house_preset',now,connected);
  if(house) {
    const preset=typeof house.value==='string'?house.value.toLowerCase():'';
    const known=house.status==='available'&&Object.hasOwn(PRESETS,preset);
    rows.push({...base,...house,key:'control:house',label:'House preset',icon:known?PRESETS[preset]:'mdi:home-thermometer',value:known?label(preset):house.status==='available'?'Unknown':label(house.status),badge:'House',activity:known?'active':'unknown',status:known?house.status:house.status==='available'?'unknown':house.status,detail:'Reported household policy preset. This does not establish that this room is following it.'});
  }
  const scheduled=mapped(hass,config,'schedule_preset',now,connected)||(config.schedule_preset?{status:'disabled',value:null,source:{entity:'',attribute:null}}:null);
  if(scheduled) {
    const preset=typeof scheduled.value==='string'?scheduled.value.toLowerCase():'';
    const known=scheduled.status==='available'&&Object.hasOwn(PRESETS,preset);
    const confirmed=ownership.status==='available'&&owner==='Schedule';
    rows.push({...base,...scheduled,key:'control:schedule_preset',label:'Last confirmed schedule mode',icon:known&&confirmed?PRESETS[preset]:'mdi:calendar-clock',schedulePreset:known&&confirmed?preset:null,
      value:known?confirmed?label(preset):'Not controlling':scheduled.status==='available'?'Unknown':label(scheduled.status),status:known?confirmed?scheduled.status:'disabled':scheduled.status==='available'?'unknown':scheduled.status,
      headerEligible:known&&confirmed&&connected&&climate.available&&climate.ready&&climate.state==='heat',
      activity:known?confirmed?'active':'neutral':'unknown',detail:'Last accepted mode reported by the mapped schedule controller while Schedule owns this thermostat. This is confirmed intent, not proof that a schedule period or Boost timer is still running. It does not establish physical heating.'});
  }
  const schedule=mapped(hass,config,'schedule',now,connected);
  if(schedule) {
    const active=[true,'on','active'].includes(schedule.value),inactive=[false,'off','inactive'].includes(schedule.value);
    const known=schedule.status==='available'&&(active||inactive);
    rows.push({...base,...schedule,key:'control:schedule',label:'Schedule',icon:'mdi:calendar-clock',value:known?active?'Active':'Inactive':schedule.status==='available'?'Unknown':label(schedule.status),status:known?'available':schedule.status==='available'?'unknown':schedule.status,activity:known?active?'active':'neutral':'unknown',detail:'Mapped schedule activity only. An active schedule does not prove it owns or has changed this thermostat.'});
  }
  return {rows,ownership};
}
