// SPDX-License-Identifier: GPL-3.0-only
import test from 'node:test';
import assert from 'node:assert/strict';
import { buildModel } from '../../src/model/climate.js';
import { normalizeConfig } from '../../src/model/config.js';
import { autoStartStopSwitch } from '../../src/providers/vt-feature-link.js';
import { compactHeader } from '../../src/cards/header-presentation.js';
const entity='climate.example',now=Date.parse('2026-11-17T12:00:00Z');
function fixture() {
  const config={entity,adapter:'vtherm',vt_telemetry:['external_temperature','auto_start_stop']};
  const attrs={supported_features:17,hvac_modes:['heat','off'],preset_modes:['none','frost','eco','comfort','boost'],preset_mode:'comfort',temperature:20,current_temperature:20,min_temp:7,max_temp:30,target_temp_step:.5,is_ready:true,is_lock_configured:false,configuration:{type:'over_climate',have_valve_regulation:false,temperature_unit:'°C'},specific_states:{ext_current_temperature:-4.5,last_ext_temperature_datetime:'2026-11-17T11:00:00Z'},is_auto_start_stop_configured:true,auto_start_stop_manager:{auto_start_stop_enable:false,is_auto_stop_detected:false,auto_start_stop_level:'slow',auto_start_stop_stop_mode:'fan_only'}};
  const hass={connected:true,config:{unit_system:{temperature:'°C'}},states:{[entity]:{entity_id:entity,state:'heat',attributes:attrs,last_updated:new Date(now).toISOString()}},services:{climate:{set_temperature:{},set_hvac_mode:{},set_preset_mode:{}}}};
  const model=()=>buildModel(hass,config,null,{now});
  return {hass,config,attrs,model,row:key=>model().headerOptions.find(row=>row.key===key)};
}
test('all four advertised presets work without temperature mappings and only exact active Heat is shown',()=>{
  const f=fixture();
  for(const preset of ['frost','eco','comfort','boost']){f.attrs.preset_mode=preset;assert.deepEqual(f.model().headerTelemetry.filter(row=>row.preset).map(row=>row.preset),[preset]);}
  for(const preset of ['none','COMFORT','away']){f.attrs.preset_mode=preset;assert.equal(f.model().headerTelemetry.some(row=>row.preset),false);}
  f.attrs.preset_mode='comfort';f.attrs.preset_modes=['none','eco'];assert.equal(f.model().headerTelemetry.some(row=>row.preset),false);
  f.attrs.preset_modes.push('comfort');f.attrs.is_ready=false;assert.equal(f.model().headerTelemetry.some(row=>row.preset),false);
});
test('House policy, provider preset, schedule activity and request owner can disagree without inference',()=>{
  const f=fixture();Object.assign(f.config,{control_source:{entity:'sensor.owner',climate_attribute:'climate_entity',ready_attribute:'intent_ready'},house_preset:{entity:'sensor.policy'},schedule:{entity:'schedule.example'}});
  Object.assign(f.hass.states,{'sensor.owner':{state:'Manual',attributes:{climate_entity:entity,intent_ready:true,confirmed_at:1}},'sensor.policy':{state:'Eco',attributes:{}},'schedule.example':{state:'on',attributes:{}}});
  assert.equal(f.model().ownership.label,'Manual');assert.equal(f.row('control:house').value,'Eco');assert.equal(f.row('control:schedule').value,'Active');assert.equal(f.row('preset:comfort').headerEligible,true);
  f.hass.states['sensor.owner'].attributes.climate_entity='climate.other';assert.equal(f.model().ownership.status,'invalid');assert.equal(f.model().ownership.label,'Unknown');
  f.hass.states['sensor.owner'].attributes.climate_entity=entity;f.hass.states['sensor.owner'].attributes.intent_ready=false;assert.equal(f.model().ownership.label,'Unknown');
  f.hass.states['sensor.owner'].attributes.intent_ready=true;
  for(const owner of ['House','Schedule','Manual','VT','Pending','Unknown']){f.hass.states['sensor.owner'].state=owner;assert.equal(f.model().ownership.label,owner);}
  f.hass.states['sensor.owner'].state='unavailable';assert.equal(f.row('control:ownership').value,'Unavailable');
  delete f.config.control_source;assert.equal(f.model().ownership.label,'Unknown');
});
test('configured source age limits preserve stale and future evidence without imposing an ownership heartbeat',()=>{
  const f=fixture();f.config.control_source={entity:'sensor.owner'};f.hass.states['sensor.owner']={state:'House',attributes:{},last_updated:'2020-01-01T00:00:00Z'};
  assert.equal(f.model().ownership.label,'House');f.config.control_source.max_age_seconds=30;assert.equal(f.model().ownership.status,'stale');
  f.hass.states['sensor.owner'].last_updated='2099-01-01T00:00:00Z';assert.equal(f.model().ownership.status,'unknown');
  f.hass.connected=false;assert.equal(f.model().ownership.status,'unavailable');
});
test('outside temperature retains negative values, provider units and independent receipt time',()=>{
  const f=fixture();assert.equal(f.row('vt:external_temperature').rawValue,-4.5);assert.equal(f.row('vt:external_temperature').unit,'°C');
  assert.equal(f.row('vt:external_temperature').detailRows[0].value,'2026-11-17T11:00:00Z');
  f.hass.states[entity].last_updated='2026-11-17T12:01:00Z';assert.equal(f.row('vt:external_temperature').detailRows[0].value,'2026-11-17T11:00:00Z');
  f.attrs.configuration.temperature_unit='%';assert.equal(f.row('vt:external_temperature').status,'invalid');
  f.attrs.configuration.temperature_unit='°F';assert.equal(f.row('vt:external_temperature').unit,'°F');
  f.attrs.specific_states.ext_current_temperature=null;assert.equal(f.row('vt:external_temperature').status,'unknown');
});
test('auto start/stop distinguishes unsupported, unconfigured, disabled, enabled and active stop',()=>{
  const f=fixture();assert.equal(f.row('vt:auto_start_stop').value,'Disabled');f.attrs.auto_start_stop_manager.auto_start_stop_enable=true;assert.equal(f.row('vt:auto_start_stop').value,'Enabled');
  f.attrs.auto_start_stop_manager.is_auto_stop_detected=true;assert.equal(f.row('vt:auto_start_stop').value,'Auto-stopped');
  f.attrs.is_auto_start_stop_configured=false;assert.equal(f.row('vt:auto_start_stop').status,'disabled');
  f.attrs.is_auto_start_stop_configured=true;f.attrs.auto_start_stop_manager.auto_start_stop_enable='true';assert.equal(f.row('vt:auto_start_stop').status,'unknown');
  f.attrs.configuration.have_valve_regulation=true;assert.equal(f.row('vt:auto_start_stop').status,'unsupported');
  delete f.attrs.configuration.have_valve_regulation;assert.equal(f.row('vt:auto_start_stop').status,'unknown');
  f.attrs.configuration.type='over_switch';assert.equal(f.row('vt:auto_start_stop').status,'unsupported');
});
test('native switch links require a unique enabled VT identity on the same device and config entry',()=>{
  const climate={entity_id:entity,platform:'versatile_thermostat',config_entry_id:'entry',device_id:'device',disabled_by:null,hidden_by:null};
  const sw={...climate,entity_id:'switch.arbitrary_renamed_id',unique_id:'Example_enable_auto_start_stop'};
  assert.equal(autoStartStopSwitch([climate,sw],entity),sw.entity_id);
  for(const change of [{platform:'template'},{device_id:'other'},{config_entry_id:'other'},{unique_id:'Example_follow_underlying_temp_change'},{disabled_by:'user'},{hidden_by:'user'},{entity_id:'light.wrong'}])assert.equal(autoStartStopSwitch([climate,{...sw,...change}],entity),null);
  assert.equal(autoStartStopSwitch([climate,sw,{...sw,entity_id:'switch.duplicate'}],entity),null);
  assert.equal(autoStartStopSwitch([{...climate,device_id:null},{...sw,device_id:null}],entity),null);
  assert.equal(autoStartStopSwitch([climate,climate,sw],entity),null);
});
test('read-only mapping validation preserves unknown options and rejects malformed source paths',()=>{
  const mapping={entity:'sensor.owner',climate_attribute:'climate_entity',ready_attribute:'intent_ready',future:{keep:true}};
  assert.deepEqual(normalizeConfig({control_source:mapping}).control_source,mapping);
  const f=fixture();f.config.control_source={...mapping,unit:'not a supported mapping field'};f.hass.states['sensor.owner']={state:'House',attributes:{climate_entity:entity,intent_ready:true}};
  assert.equal(f.row('control:ownership').unit,null);
  for(const bad of [{entity:'bad'},{entity:'sensor.owner',attribute:'__proto__.x'},{entity:'sensor.owner',ready_attribute:'constructor'},{entity:'sensor.owner',max_age_seconds:-1}])assert.throws(()=>normalizeConfig({control_source:bad}));
});
test('other providers and policies use P while unknown ownership remains a question mark',()=>{
  const f=fixture();f.config.adapter='standard';
  assert.equal(f.row('control:provider').monogram,'P');assert.equal(f.row('control:ownership').icon,'mdi:help-circle-outline');
  f.config.control_source={entity:'sensor.owner'};f.hass.states['sensor.owner']={state:'Policy',attributes:{}};
  assert.equal(f.row('control:ownership').monogram,'P');assert.equal(f.model().ownership.label,'Policy');
  f.hass.states['sensor.owner'].state='Unexpected policy name';assert.equal(f.row('control:ownership').monogram,null);assert.equal(f.model().ownership.label,'Unknown');
});
test('display labels survive in preset icons and hiding a mapped indicator reveals the builtin alternative',()=>{
  const f=fixture();f.config.preset_labels={comfort:'Cosy'};assert.equal(f.row('preset:comfort').value,'Cosy');
  f.config.features=[{entity:'sensor.comfort',preset:'comfort',unit:'°C'}];f.hass.states['sensor.comfort']={state:'21',attributes:{unit_of_measurement:'°C'}};
  assert.equal(f.row('preset:comfort').headerEligible,false);
  const mapped=f.model().headerOptions.find(row=>row.feature);f.config.header_icons={hidden:[mapped.key]};assert.equal(f.row('preset:comfort').headerEligible,true);
});

test('each source combines with its own confirmed mode, including Schedule with no VT preset',()=>{
  const f=fixture();Object.assign(f.config,{control_source:{entity:'sensor.owner',climate_attribute:'climate_entity',ready_attribute:'intent_ready'},house_preset:{entity:'sensor.policy'},schedule_preset:{entity:'sensor.owner',attribute:'mode',climate_attribute:'climate_entity',ready_attribute:'intent_ready'}});
  f.hass.states['sensor.owner']={state:'Schedule',attributes:{climate_entity:entity,intent_ready:true,mode:'Comfort'}};
  f.hass.states['sensor.policy']={state:'Boost',attributes:{}};
  const icons={frost:'mdi:snowflake',eco:'mdi:leaf',comfort:'mdi:sofa',boost:'mdi:fire'};
  for(const owner of ['House','Manual','VT','Schedule'])for(const [preset,icon] of Object.entries(icons)) {
    f.hass.states['sensor.owner'].state=owner;
    f.hass.states['sensor.owner'].attributes.mode=owner==='Schedule'?preset:'boost';
    f.hass.states['sensor.policy'].state=owner==='House'?preset:'frost';
    f.attrs.preset_mode=['Manual','VT'].includes(owner)?preset:'none';
    const row=compactHeader(f.model()).find(row=>row.key==='control:summary');
    assert.equal(row.value,owner);assert.deepEqual(row.secondary,{icon,preset});
    assert.match(row.title,new RegExp(owner==='House'?'House policy:':owner==='Schedule'?'Last confirmed schedule mode:':'Thermostat preset:'));
  }
});

test('explicit schedule mode never falls back on unknown, unready, mismatched, hidden or stale evidence',()=>{
  const f=fixture();Object.assign(f.config,{control_source:{entity:'sensor.owner'},schedule_preset:{entity:'sensor.mode',attribute:'mode',climate_attribute:'climate_entity',ready_attribute:'intent_ready'}});
  f.hass.states['sensor.owner']={state:'Schedule',attributes:{}};
  const good={state:'confirmed',attributes:{mode:'Eco',climate_entity:entity,intent_ready:true},last_updated:new Date(now).toISOString()};
  const badge=()=>compactHeader(f.model()).find(row=>row.key==='control:summary').secondary;
  for(const bad of [undefined,{...good,state:'unavailable'},{...good,attributes:{...good.attributes,mode:'none'}},{...good,attributes:{...good.attributes,mode:'<script>'}},{...good,attributes:{...good.attributes,intent_ready:false}},{...good,attributes:{...good.attributes,climate_entity:'climate.other'}}]) {
    f.hass.states['sensor.mode']=bad;assert.equal(badge(),null);
  }
  f.hass.states['sensor.mode']=good;assert.equal(badge().preset,'eco');
  f.config.header_icons={hidden:['control:schedule_preset']};assert.equal(badge(),null);delete f.config.header_icons;
  f.config.schedule_preset.max_age_seconds=30;good.last_updated='2020-01-01T00:00:00Z';assert.equal(f.row('control:schedule_preset').status,'stale');assert.equal(badge(),null);
  good.last_updated='2099-01-01T00:00:00Z';assert.equal(badge(),null);delete f.config.schedule_preset.max_age_seconds;
  for (const owner of ['Unknown','Pending']) {
    f.hass.states['sensor.owner'].state = owner;
    const row = f.row('control:schedule_preset');
    assert.equal(row.status, 'available');
    assert.equal(row.value, `Control source ${owner.toLowerCase()}`);
    assert.equal(row.schedulePreset, null);
    assert.equal(badge(), null);
  }
  f.hass.states['sensor.owner'].state='House';assert.equal(f.row('control:schedule_preset').value,'Not controlling');
  f.hass.states['sensor.owner'].state='Schedule';f.attrs.is_ready=false;assert.equal(badge(),null);f.attrs.is_ready=true;
  f.hass.states[entity].state='off';assert.equal(badge(),null);f.hass.states[entity].state='heat';
  f.hass.connected=false;assert.equal(badge(),null);f.hass.connected=true;
  f.config.schedule_preset.entity='';assert.equal(badge(),null);
  delete f.config.schedule_preset;assert.equal(badge().preset,'comfort');
});

test('schedule mode mapping preserves extensions and validates every supported path',()=>{
  const mapping={entity:'sensor.mode',attribute:'confirmed.mode',climate_attribute:'climate_entity',ready_attribute:'intent_ready',clear_attributes:['transaction_token','storage_problem'],max_age_seconds:30,future:{keep:true}};
  assert.deepEqual(normalizeConfig({schedule_preset:mapping}).schedule_preset,mapping);
  for(const change of [{entity:'bad'},{attribute:'__proto__.mode'},{ready_attribute:'constructor'},{climate_attribute:'prototype'},{max_age_seconds:-1},{clear_attributes:'pending'},{clear_attributes:['__proto__.x']},{clear_attributes:[null]}])assert.throws(()=>normalizeConfig({schedule_preset:{...mapping,...change}}));
});
test('required clear attributes reject missing, inherited or uncleared guards',()=>{
  const f=fixture();Object.assign(f.config,{control_source:{entity:'sensor.owner'},schedule_preset:{entity:'sensor.owner',attribute:'mode',clear_attributes:['pending','storage']}});
  const source={state:'Schedule',attributes:{mode:'Boost',pending:null,storage:null}};f.hass.states['sensor.owner']=source;
  assert.equal(f.row('control:schedule_preset').value,'Boost');
  for(const value of [undefined,false,'error',0]) {source.attributes.storage=value;assert.equal(f.row('control:schedule_preset').status,'unknown');assert.equal(compactHeader(f.model()).find(r=>r.key==='control:summary').secondary,null);}
  source.attributes=Object.assign(Object.create({storage:null}),{mode:'Boost',pending:null});assert.equal(f.row('control:schedule_preset').status,'unknown');
});
