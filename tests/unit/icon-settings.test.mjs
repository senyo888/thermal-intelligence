// SPDX-License-Identifier: GPL-3.0-only
import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeConfig } from '../../src/model/config.js';
import { buildModel } from '../../src/model/climate.js';
import { setHeaderVisible, moveHeaderIcon } from '../../src/model/header-icons.js';
import { VT_READINGS } from '../../src/model/vt-catalog.js';

const entity='climate.example',now=Date.parse('2026-11-16T12:00:00Z');
const attrs={friendly_name:'Example',supported_features:17,hvac_modes:['heat','off'],preset_modes:['none','eco'],preset_mode:'eco',temperature:20,current_temperature:19,min_temp:7,max_temp:30,target_temp_step:.5,is_ready:true,is_lock_configured:false,
  configuration:{type:'over_climate',temperature_unit:'°C'},specific_states:{last_temperature_datetime:'2026-11-16T11:55:00Z',total_energy:2},
  power_manager:{energy_unit:'kWh',power_unit:'W',mean_cycle_power:300,device_power:1000,overpowering_state:'off'},is_power_configured:false,
  is_window_configured:false,is_window_auto_configured:true,window_manager:{window_auto_state:'on'},
  is_motion_configured:true,motion_manager:{motion_state:'on',motion_sensor_entity_id:'binary_sensor.motion'},
  vtherm_over_climate:{follow_underlying_temp_change:true},current_humidity:48};
function fixture(extra={}) {
  const config=normalizeConfig({entity,adapter:'vtherm',vt_telemetry:Object.keys(VT_READINGS),...extra});
  const hass={connected:true,config:{unit_system:{temperature:'°C'}},states:{[entity]:{state:'heat',attributes:structuredClone(attrs),last_updated:new Date(now).toISOString()},'binary_sensor.motion':{state:'on',attributes:{}}},services:{climate:{set_temperature:{},set_hvac_mode:{},set_preset_mode:{}}}};
  const model=()=>buildModel(hass,config,null,{now});
  const row=key=>model().vtReadings.find(item=>item.vtKey===key);
  return {config,hass,model,row};
}
test('VT catalogue preserves estimate attribution, live units and configured power with limiting disabled',()=>{
  const f=fixture();assert.equal(f.row('energy').value,2);assert.equal(f.row('energy').estimated,true);
  assert.equal(f.row('power').status,'available');assert.equal(f.row('power_management').status,'disabled');assert.equal(f.row('device_power').estimated,false);
  f.hass.states[entity].attributes.power_manager.power_unit='kW';assert.equal(f.row('power').unit,'kW');
  delete f.hass.states[entity].attributes.power_manager.power_unit;assert.equal(f.row('power').status,'invalid');
  f.hass.states[entity].attributes.power_manager.energy_unit='°C';assert.equal(f.row('energy').status,'invalid');
  assert.equal(f.model().canSet,true);
});
test('temperature age uses the receipt timestamp, handles invalid/future evidence and disconnected state',()=>{
  const f=fixture();assert.equal(f.row('temperature_seen').value,'5 min');
  f.hass.states[entity].last_updated=new Date(now+100000).toISOString();assert.equal(f.row('temperature_seen').value,'5 min');
  f.hass.states[entity].attributes.specific_states.last_temperature_datetime='2026-11-16T12:02:00Z';assert.equal(f.row('temperature_seen').status,'invalid');
  f.hass.states[entity].attributes.specific_states.last_temperature_datetime='42';assert.equal(f.row('temperature_seen').status,'invalid');
  delete f.hass.states[entity].attributes.specific_states.last_temperature_datetime;assert.equal(f.row('temperature_seen').status,'unknown');
  f.hass.connected=false;assert.equal(f.row('temperature_seen').status,'unavailable');
});
test('manual/auto window, failed raw input and explicit empty humidity remain distinct',()=>{
  const f=fixture({humidity_entity:''});assert.equal(f.row('window').status,'disabled');assert.equal(f.row('window_auto').value,'Open');
  assert.equal(f.row('humidity').status,'disabled');assert.equal(f.row('motion').value,'Detected');
  f.hass.states['binary_sensor.motion'].state='unavailable';assert.equal(f.row('motion').status,'unavailable');
  delete f.hass.states[entity].attributes.is_window_auto_configured;assert.equal(f.row('window_auto').status,'unknown');
  f.hass.states[entity].attributes.configuration.type='over_switch';assert.equal(f.row('follow').status,'unsupported');
});
test('VT humidity retains explicit source freshness; source renames cannot revive hidden icons',()=>{
  const f=fixture({humidity_entity:'sensor.room',telemetry:[{kind:'humidity',entity:'sensor.room',max_age_seconds:30}],features:[{entity:'sensor.room'}]});
  f.hass.states['sensor.room']={state:'48',attributes:{unit_of_measurement:'%',friendly_name:'Original name'},last_updated:new Date(now-60000).toISOString()};
  assert.equal(f.model().humidity.status,'stale');assert.equal(f.row('humidity').status,'stale');
  const row=f.model().headerOptions.find(row=>row.feature),hidden=setHeaderVisible(f.config,row,false);
  f.hass.states['sensor.room'].attributes.friendly_name='Renamed';
  const assertHidden=()=>{const model=buildModel(f.hass,hidden,null,{now});assert.equal(model.headerOptions.find(item=>item.feature&&item.source.entity==='sensor.room').key,row.key);assert(!model.headerTelemetry.some(item=>item.feature&&item.source.entity==='sensor.room'));};
  assertHidden();delete f.hass.states['sensor.room'];assertHidden();
});
test('display hiding/order retains mappings, preset readings, dial sources and independent duplicate rows',()=>{
  const f=fixture({telemetry:[{kind:'trend',entity:'sensor.a'},{kind:'trend',entity:'sensor.b'},{kind:'valve',entity:'sensor.valve'}],features:[{entity:'sensor.eco',preset:'eco',unit:'°C'},{entity:'sensor.eco',label:'Other',unit:'°C'}]});
  Object.assign(f.hass.states,{'sensor.a':{state:'0.2',attributes:{unit_of_measurement:'°C/h'}},'sensor.b':{state:'-1',attributes:{unit_of_measurement:'°C/h'}},'sensor.valve':{state:'30',attributes:{unit_of_measurement:'%'}},'sensor.eco':{state:'18',attributes:{unit_of_measurement:'°C'}}});
  const before=f.model(),rows=before.headerOptions;
  assert.equal(new Set(rows.map(row=>row.key)).size,rows.length);
  let next=setHeaderVisible(f.config,rows[0],false);next=moveHeaderIcon(next,rows,rows.find(row=>row.source.entity==='sensor.b').key,-1);
  const after=buildModel(f.hass,next,null,{now});
  assert.deepEqual(after.presetReadings,before.presetReadings);assert.deepEqual(after.trend,before.trend);assert.deepEqual(after.output,before.output);assert.deepEqual(next.telemetry,f.config.telemetry);assert.deepEqual(next.features,f.config.features);
  assert(!after.headerTelemetry.some(row=>row.key===rows[0].key));assert(after.headerOptions.some(row=>row.key===rows[0].key));
});

test('numeric unit paths coexist with inert custom metadata and negative temperature details',()=>{
  const f=fixture({telemetry:[{kind:'custom',entity:'sensor.room',unit_attribute:{future:'inert'}}]});
  f.hass.states['sensor.room']={state:'example',attributes:{}};
  assert.deepEqual(f.config.telemetry[0].unit_attribute,{future:'inert'});assert.equal(f.model().telemetry[0].status,'available');
  f.hass.states[entity].attributes.is_power_configured=true;f.hass.states[entity].attributes.power_manager.power_temp=-5;
  assert.equal(f.row('power_management').detailRows.find(row=>row.label==='Limited temperature').value,'-5 °C');
});
