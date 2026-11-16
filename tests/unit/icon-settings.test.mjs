// SPDX-License-Identifier: GPL-3.0-only
import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeConfig, CARD_TYPE } from '../../src/model/config.js';
import { buildModel } from '../../src/model/climate.js';
import { setHeaderVisible, moveHeaderIcon } from '../../src/model/header-icons.js';
import { IconSettingsSession } from '../../src/model/icon-settings-session.js';
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

function storage({duplicate=false,timeout=25}={}) {
  const raw={type:CARD_TYPE,entity,adapter:'vtherm',future:{kept:[1]},header_icons:{future:'kept'}};
  const second={...structuredClone(raw),name:'Independent'};
  let dashboard={future:{untouched:true},views:[{cards:[raw,duplicate?structuredClone(raw):second]}]};
  const calls=[],hass={connected:true,connection:{socket:{}},user:{id:'admin',is_admin:true},panels:{example:{component_name:'lovelace',url_path:'example',config:{mode:'storage'}}},async callWS(message){calls.push(structuredClone(message));if(message.type==='lovelace/config/save'){dashboard=structuredClone(message.config);return null;}return structuredClone(dashboard);}};
  const context={hass,config:normalizeConfig(raw),pathname:'/example/0',attached:true,preview:false,commandBusy:false};
  const session=new IconSettingsSession(()=>context,{timeout});
  return {raw,second,context,hass,calls,session,get dashboard(){return dashboard;},set dashboard(value){dashboard=value;}};
}
test('direct save changes one exact card and preserves raw defaults, other cards and unknown fields',async()=>{
  const f=storage();await f.session.load();
  const draft={...f.context.config,vt_telemetry:['energy'],header_icons:{...f.context.config.header_icons,hidden:['direct:humidity']}};
  const result=await f.session.save(draft);
  assert.equal(result.changed,true);assert.equal(f.calls.filter(call=>call.type==='lovelace/config/save').length,1);
  assert.deepEqual(f.dashboard.views[0].cards[1],f.second);assert.deepEqual(f.dashboard.views[0].cards[0],{...f.raw,vt_telemetry:['energy'],header_icons:{future:'kept',hidden:['direct:humidity']}});
  assert.deepEqual(f.dashboard.future,{untouched:true});
});
test('ambiguous copies, preview, non-admin, command in flight, unsafe snapshot and session changes refuse save',async()=>{
  await assert.rejects(storage({duplicate:true}).session.load(),/More than one/);
  for(const mutate of [f=>f.context.preview=true,f=>f.hass.user.is_admin=false,f=>f.context.commandBusy=true,f=>{Object.defineProperty(f.context.config,'future',{enumerable:true,get(){throw Error('Must not evaluate');}});}]) {
    const f=storage();mutate(f);await assert.rejects(f.session.load());assert.equal(f.calls.length,0);
  }
  const f=storage();await f.session.load();f.hass.connection.socket={};await assert.rejects(f.session.save({...f.context.config,vt_telemetry:['energy']}),/changed/);assert.equal(f.calls.filter(call=>call.type.endsWith('/save')).length,0);
});
test('known layout stacks are eligible; unknown wrappers and matching template copies cannot target another card',async()=>{
  const f=storage();f.dashboard.views[0].cards=[{type:'vertical-stack',cards:[f.raw]}];await f.session.load();
  const g=storage();g.dashboard.views[0].cards=[{type:'custom:unknown-wrapper',card:g.raw}];await assert.rejects(g.session.load(),/wrapper is not supported/);
  const h=storage();h.dashboard.views[0].cards.push({type:'custom:unknown-wrapper',card:structuredClone(h.raw)});await assert.rejects(h.session.load(),/More than one/);
  const i=storage();i.dashboard.templates={copy:structuredClone(i.raw)};await assert.rejects(i.session.load(),/More than one/);
});
test('dashboard conflicts and non-display changes never dispatch; failure never replays',async()=>{
  const f=storage();await f.session.load();f.dashboard.future.new='concurrent';await assert.rejects(f.session.save({...f.context.config,vt_telemetry:['energy']}),/dashboard changed/);assert.equal(f.calls.filter(call=>call.type.endsWith('/save')).length,0);
  const g=storage();await g.session.load();await assert.rejects(g.session.save({...g.context.config,entity:'climate.other'}),/Other draft settings/);assert.equal(g.calls.filter(call=>call.type.endsWith('/save')).length,0);
  const h=storage();await h.session.load();const original=h.hass.callWS;h.hass.callWS=message=>{if(message.type.endsWith('/save')){h.calls.push(message);return Promise.reject(Error('Rejected'));}return original(message);};
  await assert.rejects(h.session.save({...h.context.config,vt_telemetry:['energy']}),/Save unconfirmed/);
  await assert.rejects(h.session.save({...h.context.config,vt_telemetry:['energy']}),/Reopen/);assert.equal(h.calls.filter(call=>call.type.endsWith('/save')).length,1);
});
test('unresolved write holds dashboard latch beyond UI timeout and cannot replay',async()=>{
  const f=storage({timeout:5});await f.session.load();const original=f.hass.callWS;let resolve;
  f.hass.callWS=message=>{if(message.type.endsWith('/save')){f.calls.push(message);return new Promise(done=>{resolve=done;});}return original(message);};
  await assert.rejects(f.session.save({...f.context.config,vt_telemetry:['energy']}),/unconfirmed/);
  const other=new IconSettingsSession(()=>f.context,{timeout:5});await other.load();await assert.rejects(other.save({...f.context.config,vt_telemetry:['power']}),/unresolved/);
  assert.equal(f.calls.filter(call=>call.type.endsWith('/save')).length,1);resolve();
});

test('numeric unit paths coexist with inert custom metadata and negative temperature details',()=>{
  const f=fixture({telemetry:[{kind:'custom',entity:'sensor.room',unit_attribute:{future:'inert'}}]});
  f.hass.states['sensor.room']={state:'example',attributes:{}};
  assert.deepEqual(f.config.telemetry[0].unit_attribute,{future:'inert'});assert.equal(f.model().telemetry[0].status,'available');
  f.hass.states[entity].attributes.is_power_configured=true;f.hass.states[entity].attributes.power_manager.power_temp=-5;
  assert.equal(f.row('power_management').detailRows.find(row=>row.label==='Limited temperature').value,'-5 °C');
});
