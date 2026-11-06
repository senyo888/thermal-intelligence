// SPDX-License-Identifier: GPL-3.0-only
import { test, expect } from '@playwright/test';
const card = p => p.locator('thermal-intelligence-beta-card').first();
const button = p => card(p).locator('[data-mapped-control]');
const dialog = p => card(p).locator('[data-mapped-dialog]');
const submit = p => dialog(p).locator('[data-mapped-submit]');
const editor = p => p.locator('thermal-intelligence-beta-card-editor').first();
const calls = p => p.evaluate(() => fixture.calls);

async function setup(page, options = {}) {
  await page.evaluate(options => {
    fixture.reset(options.vt ? 'vt' : 'standard');
    fixture.registryListeners = new Set();
    fixture.hass.connection.subscribeEvents = async fn => { fixture.registryListeners.add(fn); return () => fixture.registryListeners.delete(fn); };
    fixture.hass.entities = {};
    fixture.registry = {
      'climate.fixture_thermostat': { entity_id:'climate.fixture_thermostat', platform:options.vt ? 'versatile_thermostat' : 'honeywell', id:'example-anchor' },
      'switch.fixture_aux': { entity_id:'switch.fixture_aux', platform:options.platform || 'honeywell', id:'example-switch' },
    };
    fixture.hass.callWS = async message => { if(fixture.registryFailure) throw Error('Unavailable');return structuredClone(fixture.registry[message.entity_id]); };
    fixture.hass.states['switch.fixture_aux'] = {entity_id:'switch.fixture_aux',state:options.on ? 'on' : 'off',last_updated:'2026-01-01T00:00:00.000Z',attributes:{friendly_name:'Example emergency heat'}};
    fixture.hass.services.switch = {turn_on:{},turn_off:{}};
    Object.assign(fixture.hass.states['climate.fixture_thermostat'].attributes,{supported_features:25,fan_mode:'auto',fan_modes:['auto','on']});
    fixture.applySwitch = on => {
      const old=fixture.hass.states['switch.fixture_aux']; fixture.switchSequence=(fixture.switchSequence||0)+1;
      fixture.hass.states={...fixture.hass.states,'switch.fixture_aux':{...old,state:on?'on':'off',last_updated:new Date(Date.UTC(2026,0,1,0,0,fixture.switchSequence)).toISOString()}};
      fixture.hass.states['climate.fixture_thermostat']={...fixture.hass.states['climate.fixture_thermostat'],state:on?'heat':'off'};
      fixture.refresh();
    };
    fixture.hass.callService = (domain,service,payload) => {
      const call={domain,service,payload:structuredClone(payload)};fixture.calls.push(call);
      if(fixture.behavior==='pending')return new Promise((resolve,reject)=>fixture.pending.push({resolve,reject,call}));
      if(fixture.behavior==='reject')return Promise.reject(Error('synthetic private refusal'));
      if(domain==='switch'&&fixture.behavior==='observe')setTimeout(()=>fixture.applySwitch(service==='turn_on'),30);
      return Promise.resolve();
    };
    fixture.configure({...fixture.config,schema_version:options.schema || 2,show_details:options.details !== false,mapped_controls:{version:1,enabled:true,extra:{keep:true},items:[{kind:'switch_on_off',entity:'switch.fixture_aux',label:options.label || 'Emergency heat',icon:'mdi:radiator',future:'keep'}]}});
    fixture.editor.setConfig(fixture.config);fixture.refresh();fixture.cards[0]._open=true;fixture.cards[0].render();
  }, options);
  if(!options.vt && options.schema !== 1) await expect.poll(()=>page.evaluate(()=>fixture.cards[0]._mappedRegistry.proof.status)).toBe('verified');
}

test.beforeEach(async({page}) => {page.errors=[];page.on('pageerror',e=>page.errors.push(e.message));await page.goto('/');await expect(card(page)).toBeVisible();});
test.afterEach(async({page})=>expect(page.errors).toEqual([]));

test('both explicit directions confirm the exact switch, then follow Honeywell mode effects without compensation', async({page}) => {
  for(const on of [false,true]){
    await setup(page,{on});await button(page).click();await expect(dialog(page)).toContainText('switch.fixture_aux');
    await expect(dialog(page)).toContainText('Turning it off may stop heating');expect(await calls(page)).toEqual([]);
    await expect(submit(page)).toHaveText(on?'Turn off':'Turn on');await submit(page).click();
    await expect(dialog(page).locator('[data-mapped-message]')).toContainText('Requested switch state reported');
    expect(await calls(page)).toEqual([{domain:'switch',service:on?'turn_off':'turn_on',payload:{entity_id:'switch.fixture_aux'}}]);
    expect(await page.evaluate(()=>fixture.hass.states['climate.fixture_thermostat'].state)).toBe(on?'off':'heat');
    await expect(submit(page)).toBeDisabled();
  }
});

test('Cancel, Escape, editor saves, render and passive reconnect produce no switch or climate writes', async({page}) => {
  await setup(page);
  for(const method of ['cancel','escape']){
    await button(page).click();if(method==='escape')await page.keyboard.press('Escape');else{await dialog(page).locator('[data-mapped-close]').focus();await page.keyboard.press('Enter');}
    await expect(dialog(page)).toHaveCount(0);await expect(button(page)).toBeFocused();
  }
  await editor(page).getByLabel('Card name',{exact:true}).fill('Edited thermostat');await editor(page).getByLabel('Card name',{exact:true}).press('Tab');
  await page.evaluate(()=>{fixture.hass.connected=false;fixture.refresh();fixture.hass.connected=true;fixture.hass.connection.socket={};fixture.refresh();});
  await expect(button(page)).toBeEnabled();expect(await calls(page)).toEqual([]);
});

test('card setConfig rejects accessor and inherited enrollment without invoking getters or enabling a row', async({page}) => {
  await setup(page,{schema:1});
  const result=await page.evaluate(()=>{
    let getters=0,refused=0;
    for(const key of ['schema_version','mapped_controls']){
      const raw={...fixture.config,schema_version:2};Object.defineProperty(raw,key,{enumerable:true,get(){getters++;return key==='schema_version'?2:fixture.config.mapped_controls;}});
      try{fixture.cards[0].setConfig(raw);}catch{refused++;}
      fixture.editor.setConfig(raw);
    }
    try{fixture.cards[0].setConfig(Object.assign(Object.create({schema_version:2,mapped_controls:fixture.config.mapped_controls}),{entity:fixture.config.entity}));}catch{refused++;}
    const raw={...fixture.config};delete raw.schema_version;fixture.cards[0].setConfig(raw);
    return {getters,refused,schema:fixture.cards[0].config.schema_version,preserved:fixture.cards[0].config.mapped_controls};
  });
  expect(result.getters).toBe(0);expect(result.refused).toBe(3);expect(result.schema).toBe(1);expect(result.preserved.items).toHaveLength(1);
  await expect(button(page)).toHaveCount(0);expect(await calls(page)).toEqual([]);
});

test('editor cloning and an unrelated edit cannot enroll nested accessor or inherited mapping authority', async({page}) => {
  await setup(page,{schema:1});
  const result=await page.evaluate(()=>{
    let getters=0,rejected=0;
    const paths=[['version'],['enabled'],['items'],['items','0'],['items','0','kind'],['items','0','entity'],['items','0','label'],['items','0','icon']];
    for(const path of paths){
      const raw=structuredClone(fixture.config);raw.schema_version=2;let parent=raw.mapped_controls;for(const key of path.slice(0,-1))parent=parent[key];
      const key=path.at(-1),value=parent[key];Object.defineProperty(parent,key,{enumerable:true,get(){getters++;return value;}});
      try{fixture.cards[0].setConfig(raw);}catch{rejected++;}fixture.editor.setConfig(raw);
    }
    for(const row of [false,true]){
      const raw=structuredClone(fixture.config);raw.schema_version=2;
      Object.setPrototypeOf(row?raw.mapped_controls.items[0]:raw.mapped_controls,{future:true});
      try{fixture.cards[0].setConfig(raw);}catch{rejected++;}fixture.editor.setConfig(raw);
    }
    return {getters,rejected};
  });
  expect(result).toEqual({getters:0,rejected:10});
  await editor(page).getByLabel('Card name',{exact:true}).fill('Ordinary edit after rejected mapping');await editor(page).getByLabel('Card name',{exact:true}).press('Tab');
  expect(await page.evaluate(()=>fixture.config.schema_version)).toBe(1);await expect(button(page)).toHaveCount(0);expect(await calls(page)).toEqual([]);
});

test('unrelated registry events preserve confirmation and pending tracking; selected renames still invalidate', async({page}) => {
  await setup(page);await button(page).click();
  const unrelated=()=>{for(const fn of fixture.registryListeners)fn({data:{action:'update',entity_id:'sensor.unrelated',changes:{name:'New name'}}});};
  await page.evaluate(unrelated);await expect(submit(page)).toBeEnabled();expect(await calls(page)).toEqual([]);
  await page.evaluate(()=>fixture.behavior='pending');await submit(page).click();await page.evaluate(unrelated);
  await expect(dialog(page)).not.toContainText('uncertain');await page.evaluate(()=>{fixture.applySwitch(true);fixture.pending[0].resolve();});
  await expect(dialog(page)).toContainText('Requested switch state reported');expect((await calls(page)).length).toBe(1);
  for(const old of ['switch.fixture_aux','climate.fixture_thermostat']){
    await setup(page);await button(page).click();await page.evaluate(old=>{for(const fn of fixture.registryListeners)fn({data:{action:'update',entity_id:old.split('.')[0]+'.renamed',old_entity_id:old,changes:{entity_id:old}}});},old);
    await expect(submit(page)).toBeDisabled();expect(await calls(page)).toEqual([]);
  }
});

test('meaningful state, session, registry and config changes invalidate confirmation; telemetry refresh does not', async({page}) => {
  for(const change of ['state','socket','user','registry','metadata','unavailable','preview']){
    await setup(page);await button(page).click();
    await page.evaluate(change=>{
      if(change==='state')fixture.applySwitch(true);
      if(change==='socket')fixture.hass.connection.socket={};
      if(change==='user')fixture.hass.user={id:'different-user'};
      if(change==='registry')for(const fn of fixture.registryListeners)fn({data:{entity_id:'switch.fixture_aux',action:'update'}});
      if(change==='metadata')fixture.hass.entities={'switch.fixture_aux':{entity_id:'switch.fixture_aux',platform:'template'}};
      if(change==='unavailable')fixture.hass.states['switch.fixture_aux'].state='unavailable';
      if(change==='preview')fixture.cards[0].preview=true;
      fixture.refresh();
    },change);
    await expect(submit(page)).toBeDisabled();await page.evaluate(()=>fixture.cards[0]._submitMapped());expect(await calls(page)).toEqual([]);
  }
  await setup(page);await button(page).click();
  await page.evaluate(()=>{const id='switch.fixture_aux';fixture.hass.states[id]={...fixture.hass.states[id],last_updated:'2026-01-01T00:00:00.500Z',attributes:{friendly_name:'Refreshed label'}};fixture.hass.states['climate.fixture_thermostat'].attributes.current_temperature=18;fixture.refresh();});
  await expect(submit(page)).toBeEnabled();await submit(page).click();await expect(dialog(page).locator('[data-mapped-message]')).toContainText('reported after');expect((await calls(page)).length).toBe(1);
});

test('unknown or unsupported optional rows do not disable ordinary climate controls', async({page}) => {
  for(const platform of ['group','template']){await setup(page,{platform});await expect(button(page)).toBeDisabled();await expect(card(page).locator('[data-choice="hvac_mode"]')).toBeEnabled();}
  await setup(page,{vt:true});await expect(button(page)).toBeDisabled();await expect(card(page).locator('[data-mapped-reason]')).toContainText('not supported for VT');
  await setup(page);await page.evaluate(()=>{fixture.hass.states['switch.fixture_aux'].state='unknown';fixture.refresh();});
  await expect(button(page)).toBeDisabled();await expect(button(page)).toContainText('Unknown');await expect(card(page).locator('[data-adjust][data-delta="1"]')).toBeEnabled();
  await page.evaluate(()=>{fixture.configure({...fixture.config,mapped_controls:{version:99,enabled:true,items:[]}});});await expect(card(page).locator('[data-mapped-reason]')).toContainText('version 1');await expect(card(page).locator('[data-choice="hvac_mode"]')).toBeEnabled();expect(await calls(page)).toEqual([]);
});

test('editor refuses inert schema-1 collision, then explicitly enrolls and preserves unknown nested fields', async({page}) => {
  await setup(page,{schema:1});await expect(button(page)).toHaveCount(0);
  await editor(page).getByLabel('Card name',{exact:true}).fill('Unrelated save');await editor(page).getByLabel('Card name',{exact:true}).press('Tab');
  expect(await page.evaluate(()=>fixture.config.schema_version)).toBe(1);await expect(button(page)).toHaveCount(0);
  await editor(page).locator('[data-section="mapped-control"] > summary').click();
  await expect(editor(page).getByRole('button',{name:'Enable selected switch control'})).toHaveCount(0);
  await editor(page).getByRole('button',{name:'Replace saved optional-control section'}).click();
  await editor(page).getByLabel('Switch entity',{exact:true}).selectOption('switch.fixture_aux');
  expect(await page.evaluate(()=>fixture.config.schema_version)).toBe(1);
  await editor(page).getByLabel('Switch label',{exact:true}).fill('Auxiliary heating');
  await editor(page).getByRole('button',{name:'Enable selected switch control'}).click();
  expect(await page.evaluate(()=>fixture.config.schema_version)).toBe(2);await expect(button(page)).toBeEnabled();
  expect(await calls(page)).toEqual([]);
  await setup(page);await editor(page).locator('[data-section="mapped-control"] > summary').click();
  await editor(page).getByLabel('Switch label',{exact:true}).fill('Changed label');await editor(page).getByLabel('Switch label',{exact:true}).press('Tab');
  expect(await page.evaluate(()=>fixture.config.mapped_controls.extra)).toEqual({keep:true});expect(await page.evaluate(()=>fixture.config.mapped_controls.items[0].future)).toBe('keep');
  await editor(page).getByLabel('Enable this switch control',{exact:true}).uncheck();await expect(button(page)).toHaveCount(0);
  await editor(page).getByRole('button',{name:'Remove switch control'}).click();expect(await calls(page)).toEqual([]);
});

test('accepted, uncertain and refused switch outcomes stay separate from reported state and never replay', async({page}) => {
  await setup(page);await page.clock.install();await page.evaluate(()=>fixture.behavior='pending');await button(page).click();await submit(page).click();
  await page.evaluate(()=>{fixture.cards[0]._submitMapped();fixture.cards[0]._request('set_hvac_mode',{hvac_mode:'off'});});
  expect((await calls(page)).length).toBe(1);await page.clock.fastForward(11000);await expect(dialog(page)).toContainText('uncertain');
  await page.evaluate(()=>{fixture.hass.connected=false;fixture.refresh();fixture.hass.connected=true;fixture.hass.connection.socket={};fixture.refresh();fixture.pending[0].resolve();});
  await expect(submit(page)).toBeDisabled();expect((await calls(page)).length).toBe(1);
  await setup(page);await page.evaluate(()=>fixture.behavior='reject');await button(page).click();await submit(page).click();await expect(dialog(page)).toContainText('service call failed');await expect(dialog(page)).not.toContainText('private refusal');
  expect((await calls(page)).length).toBe(1);
});

test('choices wrap at card width and retain keyboard targets, long labels and details-off visibility', async({page},info) => {
  await setup(page,{details:false,label:'Emergency heating with a long but readable descriptive label'});
  for(const width of [390,768,1440]){
    await page.setViewportSize({width,height:1100});
    for(const cardWidth of [237,334,460]){
      await page.evaluate(w=>{document.body.dataset.capture='true';document.documentElement.style.setProperty('--fixture-width',`${w}px`);},cardWidth);
      const geometry=await button(page).evaluate(node=>{const rect=node.getBoundingClientRect(),row=node.closest('.rows');return {width:rect.width,height:rect.height,overflow:row.scrollWidth>row.clientWidth+1};});
      expect(geometry.width).toBeGreaterThanOrEqual(44);expect(geometry.height).toBeGreaterThanOrEqual(44);expect(geometry.overflow).toBe(false);
    }
    await page.screenshot({path:info.outputPath(`optional-${width}.png`),fullPage:true});
  }
  await button(page).focus();await page.keyboard.press('Enter');await expect(dialog(page)).toBeVisible();await page.keyboard.press('Escape');await expect(button(page)).toBeFocused();
  for(const count of [1,0]){
    await page.evaluate(count=>{const a=fixture.hass.states['climate.fixture_thermostat'].attributes;a.supported_features=1;delete a.fan_modes;if(!count)a.hvac_modes=[];fixture.refresh();},count);
    // Existing mode-unknown presentation stays visible when the provider omits modes.
    await expect(button(page)).toBeEnabled();await expect(card(page).locator('.control-choices [data-choice]')).toHaveCount(1);
    if(!count)await expect(card(page).locator('[data-choice="hvac_mode"]')).toBeDisabled();
  }
  expect(await calls(page)).toEqual([]);
});

test('saved configuration rollback removes the new row without an Off command or changing another card', async({page}) => {
  await setup(page);await page.evaluate(()=>{fixture.addCard({...fixture.config,schema_version:1});fixture.configure({type:'custom:thermal-intelligence-beta-card',entity:'climate.fixture_thermostat',adapter:'auto',schema_version:1});});
  await expect(page.locator('[data-mapped-control]')).toHaveCount(0);expect(await calls(page)).toEqual([]);
});
