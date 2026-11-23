// SPDX-License-Identifier: GPL-3.0-only
import { finiteNumber } from './config.js';
import { buildTelemetry, readOwnPath } from './readings.js';
import { VT_READINGS } from './vt-catalog.js';

const get = (object,path) => readOwnPath(object,path).value;
const present = value => ![null,undefined,'','unknown','unavailable'].includes(value);
const entity = value => typeof value==='string' && /^[a-z0-9_]+\.[a-z0-9_]+$/.test(value);

/** Current provider-reported settings; no inference about execution or heat delivery. */
function details(key, attrs, usable) {
  const rows=[];
  const add=(label,path,{unit,units,unitPath,numeric=false,nonnegative=true,boolean=false,link=false}={})=>{
    const raw=get(attrs,path),number=finiteNumber(raw),resolvedUnit=unitPath?get(attrs,unitPath):unit;
    const valid=usable && (numeric?number!==null&&(!nonnegative||number>=0)&&(!units||units.includes(resolvedUnit)):boolean?typeof raw==='boolean':present(raw)&&['string','number','boolean'].includes(typeof raw));
    rows.push({label,value:valid?(boolean?raw?'On':'Off':numeric?`${number}${resolvedUnit?` ${resolvedUnit}`:''}`:String(raw)):'Unavailable',...(link&&valid&&entity(raw)?{entity:raw}:{})});
  };
  if(['window','window_auto'].includes(key)) {
    add('Bypass','window_manager.is_window_bypass',{boolean:true});
    add('Window action','window_manager.window_action');
    add('Open delay','window_manager.window_delay_sec',{numeric:true,unit:'s'});
    add('Close delay','window_manager.window_off_delay_sec',{numeric:true,unit:'s'});
    if(key==='window')add('Window input','window_manager.window_sensor_entity_id',{link:true});
  } else if(key==='motion') {
    add('Motion delay','motion_manager.motion_delay_sec',{numeric:true,unit:'s'});
    add('No-motion delay','motion_manager.motion_off_delay_sec',{numeric:true,unit:'s'});
    add('With motion','motion_manager.motion_preset');add('Without motion','motion_manager.no_motion_preset');
    add('Motion input','motion_manager.motion_sensor_entity_id',{link:true});
  } else if(key==='presence')add('Presence input','presence_manager.presence_sensor_entity_id',{link:true});
  else if(key==='power_management') {
    for(const [label,path] of [['Current power','current_power'],['Power limit','current_max_power']])add(label,`power_manager.${path}`,{numeric:true,unitPath:'power_manager.central_power_unit',units:['W','kW']});
    add('Limited temperature','power_manager.power_temp',{numeric:true,nonnegative:false,unitPath:'configuration.temperature_unit',units:['°C','°F']});
    add('Power input','power_manager.power_sensor_entity_id',{link:true});add('Power limit input','power_manager.max_power_sensor_entity_id',{link:true});
  } else if(key==='external_temperature') {
    add('Last received','specific_states.last_ext_temperature_datetime');
  } else if(key==='auto_start_stop') {
    add('Automatic stop detected','auto_start_stop_manager.is_auto_stop_detected',{boolean:true});
    add('Detection level','auto_start_stop_manager.auto_start_stop_level');
    add('Stop mode','auto_start_stop_manager.auto_start_stop_stop_mode');
  }
  return rows;
}

export function buildVTReadings(hass, config, climate, now, connected) {
  if(climate.provider?.kind!=='vtherm' && !(config.vt_telemetry?.length))return [];
  const state=hass?.states?.[config.entity],attrs=state?.attributes??{};
  return Object.entries(VT_READINGS).map(([key,spec])=>{
    let entry={kind:spec.kind||'custom',entity:config.entity,label:spec.label,...spec.path?{attribute:spec.path}:{},...spec.unitPath?{unit_attribute:spec.unitPath}:{}};
    if(key==='humidity') {
      if(Object.hasOwn(config,'humidity_entity')) {
        const mapped=config.telemetry?.find(row=>row.kind==='humidity'&&row.entity===config.humidity_entity&&!row.attribute);
        entry={...(mapped||entry),entity:config.humidity_entity,label:spec.label};
      }
      else {
        const explicit=config.telemetry?.find(row=>row.kind==='humidity');
        const declared=get(attrs,'humidity_manager.humidity_sensor_entity_id')??get(attrs,'specific_states.humidity_sensor_entity_id');
        entry=explicit?{...explicit,label:spec.label}:entity(declared)?{...entry,entity:declared}:{...entry,attribute:'current_humidity',unit:'%'};
      }
    }
    let row=buildTelemetry(hass,{...config,telemetry:[entry]},now,connected,climate)[0];
    if(key==='external_temperature') {
      row.detail='Outside temperature last accepted by VT, in its declared temperature unit. The receipt time is separate from other thermostat updates; this is not a new sensor measurement.';
    }
    if(key==='auto_start_stop') {
      const type=get(attrs,'configuration.type'),configured=get(attrs,'is_auto_start_stop_configured');
      const valve=get(attrs,'configuration.have_valve_regulation');
      const enabled=get(attrs,spec.path),stopped=get(attrs,'auto_start_stop_manager.is_auto_stop_detected');
      const status=!connected||!climate.available?'unavailable':typeof type!=='string'?'unknown':type!=='over_climate'||valve===true?'unsupported':valve!==false?'unknown':configured===false?'disabled':configured!==true?'unknown':typeof enabled!=='boolean'?'unknown':'available';
      row={...row,status,value:status==='available'?(enabled?'Enabled':'Disabled'):null,activity:status==='available'?(enabled?'active':'neutral'):'unknown',detail:'VT auto start/stop is available for over-climate thermostats without valve regulation. Enabled permits the provider feature; it does not mean an automatic stop is active. Open the linked VT switch to change it in Home Assistant.',detailRows:details(key,attrs,connected&&status==='available')};
      if(status==='available'&&enabled&&stopped===true)row.value='Auto-stopped';
    }
    if(key==='temperature_seen') {
      const value=get(attrs,'specific_states.last_temperature_datetime');
      const stamp=typeof value==='string'&&/T.*(?:Z|[+-]\d\d:\d\d)$/.test(value)?Date.parse(value):NaN;
      const status=!connected||!state||state.state==='unavailable'?'unavailable':state.state==='unknown'||!present(value)?'unknown':!Number.isFinite(stamp)||stamp>now+60000?'invalid':'available';
      const minutes=Math.max(0,Math.floor((now-stamp)/60000));
      row={kind:'custom',label:spec.label,status,value:status==='available'?minutes<1?'<1 min':minutes<60?`${minutes} min`:`${Math.floor(minutes/60)} h ${minutes%60} min`:null,unit:null,source:{entity:config.entity,attribute:'specific_states.last_temperature_datetime',timestamp:status==='available'?value:null},detail:'Time since VT last received room-temperature evidence. Other thermostat updates do not refresh it.',detailRows:[{label:'Received at',value:status==='available'?value:'Unavailable'}]};
    }
    if(['energy','power','device_power'].includes(key)) {
      const note=key==='device_power'?'Configured device power reported by VT; not measured consumption.':'VT estimates this reading from configured device power and activity. It is not a meter reading or proof of heat delivery. No billing period is inferred.';
      row.detail=row.status==='available'?note:`${row.detail} ${note}`;
      if(row.status==='available' && row.value<0)row={...row,status:'invalid',value:null};
      row.estimated=key!=='device_power';
    }
    if(key==='follow') {
      const type=get(attrs,'configuration.type');
      if(typeof type==='string'&&!['over_climate','over_climate_valve'].includes(type))row={...row,status:'unsupported',value:null,detail:'Follow underlying target applies to a VT controlling a climate entity.'};
    }
    if(climate.provider?.kind!=='vtherm')row={...row,status:'unsupported',value:null,detail:'These readings require a Versatile Thermostat provider.'};
    row.detailRows??=details(key,attrs,connected&&row.status==='available');
    return {...row,icon:row.icon||spec.icon,vtKey:key,group:'vt',key:`vt:${key}`,topic:row.topic||'entity'};
  });
}
