// SPDX-License-Identifier: GPL-3.0-only
import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeConfig } from '../../src/model/config.js';
import { mappedControl, mappedCapability, switchTimestamp } from '../../src/model/mapped-control.js';
import { MappedRegistry } from '../../src/providers/mapped-registry.js';
import { CommandCoordinator } from '../../src/commands/coordinator.js';
import { renderCard } from '../../src/cards/source-view.js';

const anchor = 'climate.example', target = 'switch.example';
const config = () => normalizeConfig({ entity:anchor, schema_version:2, mapped_controls:{ version:1, enabled:true, items:[{kind:'switch_on_off', entity:target, label:'Emergency heat'}] } });
const stamp = n => new Date(Date.UTC(2026,0,1,0,0,n)).toISOString();
const switchState = (on=false, n=0) => ({ entity_id:target, state:on ? 'on' : 'off', last_updated:stamp(n) });
const tick = () => new Promise(resolve => setImmediate(resolve));
const allow = () => ({ allowed:true });
const proof = () => ({ status:'verified', generation:1, anchor:{entity_id:anchor,platform:'honeywell'},target:{entity_id:target,platform:'honeywell'} });
function setup() {
  const calls = [], timers = [];
  let resolve, reject;
  const transport = new Promise((yes,no) => { resolve=yes; reject=no; });
  const hass = { connected:true, connection:{socket:{}},user:{id:'example-user'},states:{[anchor]:{entity_id:anchor,state:'off'},[target]:switchState()},services:{switch:{turn_on:{},turn_off:{}},climate:{set_hvac_mode:{}}},callService(domain, service, payload) { calls.push({domain,service,payload}); return transport; } };
  const c = config(), p = proof(), model = {available:true,ready:true,provider:{kind:'standard'}};
  const cap = () => mappedCapability({config:c,hass,proof:p,model,preview:false,attached:true});
  const coordinator = new CommandCoordinator({setTimer:fn => (timers.push(fn),timers.length),clearTimer:()=>{}});
  const update = () => coordinator.updateContext({hass,entity:anchor,preview:false,contextKey:1,model:{ready:true,mapped:cap()}});
  update();
  const request = overrides => coordinator.requestMapped({hass,entity:anchor,target,on:true,preview:false,validate:allow,...overrides});
  const observe = (on,n) => { const s=switchState(on,n); hass.states[target]=s; coordinator.observe(s); };
  return {hass,c,p,model,cap,coordinator,update,request,calls,timers,resolve,reject,observe};
}

test('schema 1 optional-looking and legacy controls stay inert; schema 2 is explicit and unknown fields survive', () => {
  const raw=config(); raw.schema_version=1; raw.controls=[{entity:target}]; raw.extra={future:true}; raw.mapped_controls.extra={future:1}; raw.mapped_controls.items[0].future='preserved';
  const next=normalizeConfig({...raw,name:'Edited name'});
  assert.equal(next.schema_version,1); assert.equal(mappedControl(next).visible,false);
  assert.deepEqual(next.mapped_controls,raw.mapped_controls); assert.deepEqual(next.extra,raw.extra);
  assert.equal(mappedControl({...next,schema_version:2}).status,'enabled');
  assert.throws(()=>normalizeConfig({...raw,schema_version:3}));
  const accessor={...raw};Object.defineProperty(accessor,'schema_version',{get(){throw Error('Do not invoke schema getter');}});
  assert.throws(()=>normalizeConfig(accessor),/plain configuration data/);
});

test('normalization cannot materialize getter or inherited enrollment authority', () => {
  let getters=0;
  for(const key of ['schema_version','mapped_controls']) {
    const raw={...config()};Object.defineProperty(raw,key,{enumerable:true,get(){getters++;return key==='schema_version'?2:config().mapped_controls;}});
    assert.throws(()=>mappedControl(normalizeConfig(raw)),/plain configuration data/);
  }
  for(const path of [['version'],['enabled'],['items'],['items','0'],['items','0','kind'],['items','0','entity'],['items','0','label'],['items','0','icon']]){
    const raw=config();let parent=raw.mapped_controls;for(const key of path.slice(0,-1))parent=parent[key];
    const key=path.at(-1),value=parent[key];Object.defineProperty(parent,key,{enumerable:true,get(){getters++;return value;}});
    assert.throws(()=>normalizeConfig(raw),/plain configuration data/);
  }
  for(const row of [false,true]) {
    const raw=config();if(row)Object.setPrototypeOf(raw.mapped_controls.items[0],{future:true});else Object.setPrototypeOf(raw.mapped_controls,{future:true});
    assert.throws(()=>normalizeConfig(raw),/plain configuration objects/);
  }
  assert.equal(getters,0);
  assert.throws(()=>normalizeConfig(Object.assign(Object.create({schema_version:2,mapped_controls:config().mapped_controls}),{entity:anchor})),/must be an object/);
  const raw={entity:anchor,mapped_controls:config().mapped_controls,extra:{future:true}}, normalized=normalizeConfig(raw);
  assert.equal(mappedControl(normalized).status,'disabled');assert.deepEqual(normalized.mapped_controls,raw.mapped_controls);assert.deepEqual(normalized.extra,raw.extra);
});

test('strict closed mapping rejects malformed authority, arrays, extra items, inherited fields and accessors', () => {
  const edits=[m=>m.enabled='true',m=>m.version='1',m=>m.items.push({...m.items[0]}),m=>m.items=[],m=>m.items[0].entity='input_boolean.example',m=>m.items[0].entity=[target],m=>m.items[0].kind='toggle',m=>m.items[0].label='<b>Heat</b>',m=>m.items[0].icon='https://example.com/icon',m=>{m.items[0]=Object.create(m.items[0]);},m=>{Object.defineProperty(m.items[0],'entity',{get(){throw Error('must not invoke');}});}];
  for(const edit of edits){const c=config();edit(c.mapped_controls);assert.equal(mappedControl(c).status,'invalid');}
  const c=config();c.mapped_controls.enabled=false;assert.equal(mappedControl(c).visible,false);
});

test('eligibility allows Off without temperature data, but refuses VT, unregistered/group/template, preview and unknown states', () => {
  const s=setup(); assert.equal(s.cap().allowed,true);
  for(const platform of ['group','template']){s.p.target.platform=platform;assert.equal(s.cap().allowed,false);}
  s.p.target.platform='honeywell';s.p.anchor.platform='versatile_thermostat';assert.equal(s.cap().allowed,false);
  s.p.anchor.platform='honeywell';s.p.status='unavailable';assert.equal(s.cap().allowed,false);
  s.p.status='verified';
  for(const state of ['unknown','unavailable','ON',true,'']){s.hass.states[target].state=state;assert.equal(s.cap().allowed,false);}
  s.hass.states[target]=switchState();assert.equal(s.cap().allowed,true);
  for(const change of [{preview:true},{attached:false},{knownVT:true}]) assert.equal(mappedCapability({config:s.c,hass:s.hass,proof:s.p,model:s.model,preview:false,attached:true,...change}).allowed,false);
});

test('mapped requests dispatch exactly one switch entity and tolerate Honeywell mode effects in either state/ack order', async () => {
  for(const on of [true,false]) for(const stateFirst of [true,false]) {
    const s=setup();s.hass.states[target]=switchState(!on);s.update();const result=s.request({on});
    assert.deepEqual(s.calls,[{domain:'switch',service:on?'turn_on':'turn_off',payload:{entity_id:target}}]);
    s.hass.states[anchor]={entity_id:anchor,state:on?'heat':'off'};s.update();
    if(stateFirst)s.observe(on,1);s.resolve();await tick();
    if(!stateFirst){assert.equal(s.coordinator.status.phase,'accepted');s.observe(on,1);}
    assert.equal((await result).phase,'observed');assert.equal(s.coordinator.status.target,target);assert.equal(s.calls.length,1);
  }
});

test('switch observation requires a valid dispatch baseline and strictly newer mapped last_updated, never climate or last_changed', async () => {
  for(const baseline of [undefined,'bad',null,stamp(0)]) {
    const s=setup();s.hass.states[target].last_updated=baseline;s.hass.states[target].last_changed=stamp(0);const result=s.request();
    s.resolve();await tick();s.coordinator.observe({entity_id:anchor,state:'on',last_updated:stamp(3)});
    for(const timestamp of [undefined,'bad',stamp(0),stamp(-1)]) {
      s.coordinator.observe({...switchState(true,1),last_updated:timestamp,last_changed:stamp(3)});
      assert.equal(s.coordinator.status.phase,'accepted');
    }
    s.observe(true,2);
    if(baseline===stamp(0))assert.equal((await result).phase,'observed');
    else {assert.equal(s.coordinator.status.phase,'accepted');s.timers[0]();assert.equal((await result).phase,'uncertain');}
  }
});

test('a newer contrary state or a late rejection cannot become a false observed success', async () => {
  for(const reject of [false,true]){
    const s=setup(),result=s.request();s.observe(true,1);s.observe(false,2);
    if(reject)s.reject(Error('private backend detail'));else s.resolve();await tick();
    assert.equal(s.coordinator.status.phase,reject?'failed':'accepted');
    if(!reject)s.timers[0]();assert.equal((await result).phase,reject?'failed':'uncertain');
    assert.doesNotMatch(JSON.stringify(s.coordinator.status),/private backend/);
  }
});

test('switch timestamps retain submillisecond ordering and equal-time conflicts cannot prove a result', async () => {
  const at=(on,fraction)=>({...switchState(on),last_updated:`2026-01-01T00:00:00.${fraction}Z`});
  assert.ok(switchTimestamp(at(false,'001100')) < switchTimestamp(at(false,'001900')));
  assert.equal(switchTimestamp({last_updated:'2026-01-01T01:00:00.001900+01:00'}),switchTimestamp(at(false,'001900')));
  for(const value of ['2026-02-30T00:00:00Z','2026-01-01T24:00:00Z','2026-01-01T00:00:00.1234567891Z'])assert.equal(switchTimestamp({last_updated:value}),null);
  for(const later of ['001900','001100']) {
    const s=setup(),result=s.request();
    for(const state of [at(true,'001100'),at(false,later)]){s.hass.states[target]=state;s.coordinator.observe(state);}
    s.resolve();await tick();assert.equal(s.coordinator.status.phase,'accepted');
    const equal=at(true,later);s.hass.states[target]=equal;s.coordinator.observe(equal);assert.equal(s.coordinator.status.phase,'accepted');
    s.timers[0]();assert.equal((await result).phase,'uncertain');assert.equal(s.calls.length,1);
  }
  // Older contrary delivery cannot displace the more recent admitted match.
  const reverse=setup(),done=reverse.request();reverse.hass.states[target]=at(true,'001900');reverse.coordinator.observe(reverse.hass.states[target]);
  reverse.coordinator.observe(at(false,'001100'));reverse.resolve();assert.equal((await done).phase,'observed');
  // Reconcile a current contrary update even if observe has not yet been called for it.
  const current=setup(),pending=current.request();current.hass.states[target]=at(true,'001100');current.coordinator.observe(current.hass.states[target]);
  current.hass.states[target]=at(false,'001900');current.resolve();await tick();assert.equal(current.coordinator.status.phase,'accepted');current.timers[0]();assert.equal((await pending).phase,'uncertain');
  // With acknowledgement first, only a later matching update completes the request.
  const ack=setup(),accepted=ack.request();ack.resolve();await tick();ack.hass.states[target]=at(false,'001100');ack.coordinator.observe(ack.hass.states[target]);assert.equal(ack.coordinator.status.phase,'accepted');
  ack.hass.states[target]=at(true,'001900');ack.coordinator.observe(ack.hass.states[target]);assert.equal((await accepted).phase,'observed');
});

test('same-state requests are explicit no-ops and cannot retarget or widen the payload', async () => {
  const s=setup();assert.equal((await s.request({on:false})).phase,'observed');assert.match(s.coordinator.status.message,/No command/);
  for(const input of [{on:'true'},{target:[target]},{target:'switch.other'},{target:'input_boolean.example'},{entity:'climate.other'},{preview:true}]) assert.equal((await s.request(input)).phase,'failed');
  assert.deepEqual(s.calls,[]);
});

test('shared gate reserves before validation and keeps unresolved transports busy through timeout/disconnect/disposal', async () => {
  for(const end of ['timeout','disconnect','identity','dispose']) {
    const s=setup();let reentrant;
    const result=s.request({validate:()=>{reentrant=s.coordinator.request({hass:s.hass,entity:anchor,service:'set_hvac_mode',values:{hvac_mode:'heat'},preview:false,validate:allow});return {allowed:true};}});
    assert.equal((await reentrant).phase,'failed');
    if(end==='timeout')s.timers[0]();
    if(end==='disconnect'){s.hass.connected=false;s.update();}
    if(end==='identity'){s.p.generation++;s.update();}
    if(end==='dispose')s.coordinator.dispose();
    assert.equal((await result).phase,'uncertain');
    assert.equal((await s.request()).phase,'failed');assert.equal(s.calls.length,1);
    s.resolve();await tick();assert.equal(s.calls.length,1);assert.equal(s.coordinator.status.phase,'uncertain');
  }
});

test('harmless validation refresh sets the dispatch baseline; direction and material state drift stay guarded', async () => {
  const s=setup();const result=s.request({validate:()=>{s.hass.states[target]=switchState(false,5);return {allowed:true};}});
  s.resolve();await tick();s.observe(true,4);assert.equal(s.coordinator.status.phase,'accepted');s.observe(true,6);assert.equal((await result).phase,'observed');
  const t=setup();const failed=t.request({validate:()=>{t.hass.states[target]=switchState(true,5);return {allowed:true};}});
  assert.equal((await failed).phase,'failed');assert.deepEqual(t.calls,[]);
  const u=setup();let validations=0;
  const last=u.request({validate:()=>{if(++validations===3)u.hass.states[target]=switchState(true,7);return {allowed:true};}});
  assert.equal((await last).phase,'failed');assert.deepEqual(u.calls,[]);
});

test('optional row supports one, two or three displayed controls without changing the settings grid or details option', () => {
  const s=setup();
  for(const count of [0,1,2]){
    const choices=[{key:'hvac_mode',service:'set_hvac_mode',label:'Mode',value:'heat',options:['heat'],enabled:true},{key:'fan_mode',service:'set_fan_mode',label:'Fan',value:'auto',options:['auto'],enabled:true}].slice(0,count);
    const html=renderCard({config:{...s.c,show_details:false},model:{...s.model,choices},optionalControl:s.cap(),open:true,allowed:true});
    assert.equal((html.match(/data-choice=/g)||[]).length,count);assert.equal((html.match(/data-mapped-control/g)||[]).length,1);
    assert.match(html,/Top row icon settings/);
  }
});

test('registry proof subscribes before reads, invalidates current-session changes and never trusts old session replies', async () => {
  const callbacks=[],unsubscribed=[],reads=[];let held;
  const h={connected:true,user:{id:'user'},connection:{socket:{},async subscribeEvents(fn,type){assert.equal(type,'entity_registry_updated');callbacks.push(fn);return()=>unsubscribed.push(true);}},callWS(msg){reads.push(msg);return Promise.resolve({entity_id:msg.entity_id,platform:'honeywell',id:msg.entity_id});}};
  const r=new MappedRegistry(()=>{});r.sync(h,config(),true);assert.equal(reads.length,0);await tick();assert.equal(r.proof.status,'verified');assert.equal(reads.length,2);
  const verified=r.proof;
  for(const action of ['create','update','remove'])callbacks[0]({data:{action,entity_id:'sensor.unrelated',changes:{name:'New name'}}});
  assert.equal(r.proof,verified);assert.equal(reads.length,2);
  for(const data of [{action:'remove',entity_id:target},{action:'update',entity_id:anchor},{action:'update',entity_id:'switch.renamed',old_entity_id:target},{action:'update',entity_id:'climate.renamed',changes:{entity_id:anchor}}]) {
    callbacks[0]({data});assert.equal(r.proof.status,'loading');await tick();assert.equal(r.proof.status,'verified');
  }
  callbacks[0]();assert.equal(r.proof.status,'loading');await tick();assert.equal(r.proof.status,'verified');
  h.entities={[target]:{entity_id:target,platform:'template'}};r.sync(h,config(),true);assert.equal(r.proof.status,'loading');await tick();assert.equal(r.proof.status,'unavailable');
  h.entities=undefined;h.callWS=msg=>new Promise(resolve=>{held=()=>resolve({entity_id:msg.entity_id,platform:'honeywell'});});callbacks[0]();
  h.connected=false;r.sync(h,config(),true);held();await tick();assert.notEqual(r.proof.status,'verified');assert.equal(unsubscribed.length,1);
  r.stop();
});

test('registry subscription failure or missing registration cannot authorize the optional row', async () => {
  for(const failure of ['subscription','entry']) {
    const r=new MappedRegistry(()=>{}),h={connected:true,user:{id:'user'},connection:{socket:{},subscribeEvents:async()=>{if(failure==='subscription')throw Error();return()=>{};}},callWS:async()=>null};
    r.sync(h,config(),true);await tick();assert.equal(r.proof.status,'unavailable');r.stop();
  }
});

test('registry proof equates only null and undefined device IDs on either selected entity', async () => {
  const cases = [
    ['device_id', undefined, null, 'verified'],
    ['device_id', null, undefined, 'verified'],
    ['device_id', null, null, 'verified'],
    ['device_id', undefined, undefined, 'verified'],
    ['device_id', 'device-a', 'device-a', 'verified'],
    ['device_id', 'device-a', 'device-b', 'unavailable'],
    ['device_id', undefined, 'device-a', 'unavailable'],
    ['device_id', 'device-a', null, 'unavailable'],
    ['device_id', '', null, 'unavailable'],
    ['device_id', false, undefined, 'unavailable'],
    ...['id', 'unique_id', 'config_entry_id'].map(key => [key, undefined, null, 'unavailable']),
    ['entity_id', 'climate.changed', anchor, 'unavailable'],
    ['platform', 'template', 'honeywell', 'unavailable'],
  ];
  for (const selected of [anchor, target]) for (const [key, frontend, api, expected] of cases) {
    const entries = Object.fromEntries([anchor, target].map(entity => [entity, {entity_id:entity, platform:'honeywell'}]));
    entries[selected][key] = api;
    const h = {
      connected:true, user:{id:'user'},
      connection:{socket:{}, subscribeEvents:async () => () => {}},
      entities:{[selected]:{...entries[selected], [key]:frontend}},
      callWS:async msg => entries[msg.entity_id],
    };
    const r = new MappedRegistry(() => {});
    r.sync(h, config(), true); await tick();
    assert.equal(r.proof.status, expected, `${selected} ${key}: ${String(frontend)} / ${String(api)}`);
    r.stop();
  }
});

test('later switch change retires only the completed presentation', async () => {
  const f = setup(), pending = f.request();
  f.resolve(); await tick(); f.observe(true, 1);
  const outcome = await pending;
  assert.equal(f.coordinator.presentationStatus, outcome);
  f.observe(false, 2);
  assert.equal(f.coordinator.presentationStatus.phase, 'idle');
  assert.equal(f.coordinator.status, outcome);
  assert.equal(f.calls.length, 1);
});

test('newer matching reports advance success ordering without accepting delayed contrary evidence', async () => {
  const f=setup(), pending=f.request();
  f.resolve(); await tick(); f.observe(true, 1);
  const outcome=await pending;
  f.observe(true, 3); f.observe(false, 2);
  assert.equal(f.coordinator.presentationStatus, outcome);
  f.observe(false, 3);
  assert.equal(f.coordinator.presentationStatus.phase, 'idle', 'equal-time contradiction remains uncertain');
  assert.equal(f.coordinator.status, outcome);
  assert.equal(f.calls.length, 1);
});

test('mapped no-op success uses the same timestamp precision as later switch reports', async () => {
  const f=setup(); f.observe(true,3); f.update();
  const outcome=await f.request();
  assert.equal(outcome.phase,'observed');
  assert.equal(f.calls.length,0);
  f.observe(false,2);
  assert.equal(f.coordinator.presentationStatus,outcome);
  f.observe(true,5); f.observe(false,4);
  assert.equal(f.coordinator.presentationStatus,outcome);
  f.observe(false,6);
  assert.equal(f.coordinator.presentationStatus.phase,'idle');
  assert.equal(f.coordinator.status,outcome);
  assert.equal(f.calls.length,0);
});

test('normalization snapshots mapping data so caller mutations require a new configuration', () => {
  const raw=config(); raw.mapped_controls.extra={nested:{kept:true}};
  const saved=normalizeConfig(raw);
  raw.mapped_controls.enabled=false;
  raw.mapped_controls.items[0].entity='switch.changed';
  raw.mapped_controls.items.push({kind:'switch_on_off',entity:'switch.another'});
  raw.mapped_controls.extra.nested.kept=false;
  assert.equal(mappedControl(saved).status,'enabled');
  assert.equal(mappedControl(saved).item.entity,target);
  assert.equal(saved.mapped_controls.items.length,1);
  assert.equal(saved.mapped_controls.extra.nested.kept,true);
  const disabled=normalizeConfig(raw);
  assert.equal(mappedControl(disabled).status,'disabled');
  raw.mapped_controls.enabled=true; raw.mapped_controls.items.pop();
  assert.equal(mappedControl(disabled).status,'disabled','caller cannot re-enable the saved mapping');
  assert.equal(mappedControl(normalizeConfig(raw)).item.entity,'switch.changed');
});

test('mapping snapshots retain inert future data without invoking nested getters', () => {
  let reads=0;
  const raw=config(); raw.schema_version=1;
  raw.mapped_controls.extra={nested:['kept']};
  Object.defineProperty(raw.mapped_controls.extra,'future',{enumerable:true,get(){reads++;return 'not data';}});
  const saved=normalizeConfig(raw);
  raw.mapped_controls.items[0].entity='switch.changed';
  raw.mapped_controls.extra.nested[0]='changed';
  assert.equal(mappedControl(saved).status,'disabled');
  assert.equal(saved.mapped_controls.items[0].entity,target);
  assert.equal(saved.mapped_controls.extra.nested[0],'kept');
  assert.equal(Object.getOwnPropertyDescriptor(saved.mapped_controls.extra,'future').get,
    Object.getOwnPropertyDescriptor(raw.mapped_controls.extra,'future').get);
  assert.equal(reads,0);
});
