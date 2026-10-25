// SPDX-License-Identifier: GPL-3.0-only
import { test, expect } from '@playwright/test';

// Exercise the built module served by the shared browser fixture.
const card = page => page.locator('thermal-intelligence-beta-card').first();
const trigger = page => card(page).locator('[data-lock-controls]');
const dialog = page => card(page).locator('[data-lock-dialog]');
const action = page => dialog(page).locator('[data-lock-submit]');
const input = page => dialog(page).locator('[data-lock-code]');
const calls = page => page.evaluate(()=>fixture.calls);
const marker = 'synthetic-lock-code-Z9';

async function setup(page,{locked=true,codeRequired=false,admin=true,lockUsers=true,lockAutomations=true,relock=30}={}) {
  await page.evaluate(options=>{
    fixture.reset('vt');
    fixture.hass.user={id:'synthetic-preview-user',is_admin:options.admin};
    fixture.hass.services.versatile_thermostat={lock:{},unlock:{}};
    for (const id of ['climate.fixture_thermostat','climate.fixture_secondary']) Object.assign(fixture.hass.states[id].attributes,{
      is_lock_configured:true, specific_states:{is_locked:options.locked},
      lock_manager:{is_locked:options.locked,lock_code:options.codeRequired,lock_users:options.lockUsers,lock_automations:options.lockAutomations,auto_relock_sec:options.relock},
    });
    fixture.applyLock=(locked,entity='climate.fixture_thermostat')=>{
      const old=fixture.hass.states[entity];
      fixture.lockSequence=(fixture.lockSequence||0)+1;
      fixture.hass.states={...fixture.hass.states,[entity]:{...old,attributes:{...old.attributes,specific_states:{...old.attributes.specific_states,is_locked:locked},lock_manager:{...old.attributes.lock_manager,is_locked:locked}},last_updated:new Date(Date.now()+1000+fixture.lockSequence).toISOString()}};
      fixture.refresh();
    };
    fixture.hass.callService=(domain,service,payload)=>{
      const call={domain,service,payload:structuredClone(payload)};fixture.calls.push(call);
      if(fixture.behavior==='pending')return new Promise((resolve,reject)=>fixture.pending.push({resolve,reject,call}));
      if(fixture.behavior==='reject')return Promise.reject(new Error(`Lock code validation failed: ${payload.code}`));
      if(fixture.behavior==='observe')setTimeout(()=>fixture.applyLock(service==='lock',payload.entity_id),30);
      return Promise.resolve();
    };
    fixture.refresh();
  },{locked,codeRequired,admin,lockUsers,lockAutomations,relock});
  await expect.poll(()=>page.evaluate(()=>fixture.cards[0]._registryStatus)).toBe('verified');
}

test.beforeEach(async({page})=>{
  page.runtimeErrors=[];page.on('pageerror',error=>page.runtimeErrors.push(error.message));
  await page.goto('/');await expect(card(page)).toBeVisible();
});
test.afterEach(async({page})=>{expect(page.runtimeErrors).toEqual([]);});

test('eligible administrator has an aligned 14px glyph and separate 44px keyboard/touch target',async({page})=>{
  await setup(page);
  for(const width of [237,334,460]) {
    await page.evaluate(width=>{document.documentElement.style.setProperty('--fixture-width',`${width}px`);fixture.configure({...fixture.config,name:'A very long thermostat display name for the narrow card'});},width);
    await expect(trigger(page)).toBeEnabled();
    const geometry=await trigger(page).evaluate(button=>{
      const b=button.getBoundingClientRect(),i=button.querySelector('ha-icon').getBoundingClientRect(),name=button.previousElementSibling.getBoundingClientRect(),next=button.nextElementSibling.getBoundingClientRect();
      return {width:b.width,height:b.height,iconWidth:i.width,iconHeight:i.height,left:b.left,nameRight:name.right,right:b.right,nextLeft:next.left,center:b.y+b.height/2,iconCenter:i.y+i.height/2};
    });
    expect(geometry.width).toBe(44);expect(geometry.height).toBe(44);expect(geometry.iconWidth).toBe(14);expect(geometry.iconHeight).toBe(14);
    expect(geometry.left).toBeGreaterThanOrEqual(geometry.nameRight);expect(geometry.right).toBeLessThanOrEqual(geometry.nextLeft);expect(geometry.iconCenter).toBeCloseTo(geometry.center,1);
  }
  await trigger(page).focus();await trigger(page).press('Enter');await expect(dialog(page)).toBeVisible();
  await expect(dialog(page)).toContainText('Locks changes from users and automations.');await expect(dialog(page)).toContainText('VT relocks 30 seconds after unlocking.');
  await page.keyboard.press('Escape');await expect(dialog(page)).toHaveCount(0);await expect(trigger(page)).toBeFocused();expect(await calls(page)).toEqual([]);
});

test('ordinary accounts, unknown admin status and preview stay read-only with zero writes',async({page})=>{
  await setup(page,{admin:false});await expect(trigger(page)).toHaveCount(0);await expect(card(page).locator('span.lock-indicator')).toBeVisible();
  await card(page).locator('span.lock-indicator').click();await expect(dialog(page)).toHaveCount(0);
  await page.evaluate(()=>{delete fixture.hass.user.is_admin;fixture.refresh();fixture.cards[0]._openDialog('lock');});await expect(dialog(page)).toHaveCount(0);
  await page.evaluate(()=>{fixture.hass.user.is_admin=true;fixture.refresh();});await expect(trigger(page)).toBeEnabled();
  await page.locator('#preview').check();await expect(trigger(page)).toHaveCount(0);await page.evaluate(()=>fixture.cards[0]._openDialog('lock'));await expect(dialog(page)).toHaveCount(0);
  await page.locator('#preview').uncheck();await expect(trigger(page)).toBeEnabled();
  await page.evaluate(()=>{delete fixture.hass.services.versatile_thermostat.unlock;fixture.refresh();});await expect(trigger(page)).toHaveCount(0);expect(await calls(page)).toEqual([]);
});

test('code stays mounted across updates and an explicit unlock clears it and waits for observation',async({page})=>{
  await setup(page,{codeRequired:true});await trigger(page).click();await expect(input(page)).toHaveAttribute('type','password');await expect(action(page)).toBeDisabled();
  await input(page).fill(marker);await input(page).evaluate(node=>{window.originalLockInput=node;});
  await page.evaluate(()=>{fixture.hass.states['sensor.fixture_humidity'].state='51';fixture.hass.states['climate.fixture_thermostat'].attributes.current_temperature=20.2;fixture.refresh();});
  await expect(input(page)).toHaveValue(marker);await expect(input(page)).toBeFocused();expect(await input(page).evaluate(node=>node===window.originalLockInput)).toBe(true);
  await page.evaluate(()=>fixture.behavior='accept');await action(page).click();
  expect(await calls(page)).toEqual([{domain:'versatile_thermostat',service:'unlock',payload:{entity_id:'climate.fixture_thermostat',code:marker}}]);
  await expect(input(page)).toHaveValue('');await expect(input(page)).toBeDisabled();await expect(action(page)).toBeDisabled();await expect(dialog(page).locator('[data-lock-dismiss]')).toHaveText('Close');
  await expect(card(page).locator('[data-adjust][data-delta="1"]')).toBeDisabled();await expect(dialog(page).locator('[data-lock-message]')).toContainText(/accepted|waiting/i);
  await page.evaluate(()=>fixture.applyLock(false));await expect(dialog(page).locator('[data-lock-current]')).toHaveText('VT reports: Unlocked');await expect(dialog(page).locator('[data-lock-message]')).toContainText(/observed|reports/i);
  await expect(action(page)).toHaveText('Unlock thermostat');await expect(action(page)).toBeDisabled();
  const retained=await page.evaluate(()=>{const c=fixture.cards[0];return JSON.stringify({status:c._coordinator.status,intent:c._lockIntent,config:c.config,markup:c._dialogHost.shadowRoot.innerHTML,storage:{...localStorage,...sessionStorage}});});expect(retained).not.toContain(marker);
});

test('both lock directions work without code and configured code also applies to locking',async({page})=>{
  for(const locked of [false,true]) {
    await setup(page,{locked});await trigger(page).click();await expect(input(page)).toBeHidden();await action(page).click();
    expect(await calls(page)).toEqual([{domain:'versatile_thermostat',service:locked?'unlock':'lock',payload:{entity_id:'climate.fixture_thermostat'}}]);
    await expect(dialog(page).locator('[data-lock-current]')).toHaveText(`VT reports: ${locked?'Unlocked':'Locked'}`);
    await expect(card(page).locator('[data-adjust][data-delta="1"]'))[locked?'toBeEnabled':'toBeDisabled']();
  }
  await setup(page,{locked:false,codeRequired:true});await trigger(page).click();await expect(action(page)).toHaveText('Lock thermostat');await expect(action(page)).toBeDisabled();await input(page).fill(marker);await action(page).click();
  expect((await calls(page))[0]).toEqual({domain:'versatile_thermostat',service:'lock',payload:{entity_id:'climate.fixture_thermostat',code:marker}});
});

test('external state or capability changes clear code and permanently invalidate the open intent',async({page})=>{
  for(const change of ['state','admin','scope','disconnect','user','socket','readiness','service','code']) {
    await setup(page,{codeRequired:true});await trigger(page).click();await input(page).fill(marker);
    await page.evaluate(change=>{
      if(change==='state')fixture.applyLock(false);
      if(change==='admin')fixture.hass.user.is_admin=false;
      if(change==='scope')fixture.hass.states['climate.fixture_thermostat'].attributes.lock_manager.auto_relock_sec=60;
      if(change==='disconnect')fixture.hass.connected=false;
      if(change==='user')fixture.hass.user={id:'another-synthetic-admin',is_admin:true};
      if(change==='socket')fixture.hass.connection.socket={};
      if(change==='readiness')delete fixture.hass.states['climate.fixture_thermostat'].attributes.is_ready;
      if(change==='service')delete fixture.hass.services.versatile_thermostat.unlock;
      if(change==='code')fixture.hass.states['climate.fixture_thermostat'].attributes.lock_manager.lock_code=false;
      fixture.refresh();
    },change);
    await expect(input(page)).toHaveValue('');await expect(action(page)).toBeDisabled();await expect(action(page)).toHaveText('Unlock thermostat');
    await page.evaluate(()=>{fixture.hass.user.is_admin=true;fixture.hass.connected=true;fixture.refresh();fixture.cards[0]._submitLock();});expect(await calls(page)).toEqual([]);
  }
});

test('unavailable observations never keep old lock details looking current in an open dialog',async({page})=>{
  for(const change of ['disconnect','unavailable','identity']) {
    await setup(page,{locked:false,codeRequired:true});await trigger(page).click();await input(page).fill(marker);
    await page.evaluate(change=>{if(change==='disconnect')fixture.hass.connected=false;else if(change==='identity'){fixture.registryFailure=true;fixture.hass.connection.socket={};}else fixture.hass.states['climate.fixture_thermostat'].state='unavailable';fixture.refresh();},change);
    await expect(dialog(page).locator('[data-lock-current]')).toHaveText('VT reports: Unavailable');await expect(dialog(page).locator('[data-lock-scope]')).toHaveText('Lock details are unavailable.');await expect(dialog(page).locator('[data-lock-relock]')).toBeEmpty();await expect(input(page)).toHaveValue('');await expect(action(page)).toBeDisabled();
    await page.evaluate(()=>{fixture.hass.connected=true;fixture.hass.states['climate.fixture_thermostat'].state='heat';fixture.refresh();});await expect(action(page)).toBeDisabled();expect(await calls(page)).toEqual([]);
  }
});

test('Enter on Cancel or close only dismisses and never submits a lock request',async({page})=>{
  await setup(page);
  for(const selector of ['[data-lock-dismiss]','button.close']) {
    await trigger(page).click();const close=dialog(page).locator(selector);await close.focus();await close.press('Enter');await expect(dialog(page)).toHaveCount(0);await expect(trigger(page)).toBeFocused();
  }
  expect(await calls(page)).toEqual([]);
});

test('an unresolved lock request stays uncertain through reconnect and never replays',async({page})=>{
  await setup(page);await page.clock.install();await page.evaluate(()=>fixture.behavior='pending');await trigger(page).click();await action(page).click();
  await page.clock.fastForward(11000);await expect(dialog(page).locator('[data-lock-message]')).toContainText(/uncertain/i);await expect(action(page)).toBeDisabled();
  await page.evaluate(()=>{fixture.hass.connected=false;fixture.refresh();fixture.hass.connected=true;fixture.hass.connection.socket={};fixture.refresh();fixture.pending[0].resolve();});
  await expect(action(page)).toBeDisabled();expect((await calls(page)).length).toBe(1);await dialog(page).locator('[data-lock-dismiss]').click();await trigger(page).click();expect((await calls(page)).length).toBe(1);
});

test('a changed entity closes and clears the original dialog without retargeting',async({page})=>{
  await setup(page,{codeRequired:true});await trigger(page).click();await input(page).fill(marker);await input(page).evaluate(node=>window.oldLockInput=node);
  await page.evaluate(()=>fixture.configure({...fixture.config,entity:'climate.fixture_secondary'}));await expect(dialog(page)).toHaveCount(0);expect(await page.evaluate(()=>window.oldLockInput.value)).toBe('');expect(await calls(page)).toEqual([]);
});

test('duplicate submits are suppressed and provider errors never expose the code',async({page})=>{
  await setup(page,{codeRequired:true});await page.evaluate(()=>fixture.behavior='pending');await trigger(page).click();await input(page).fill(marker);await action(page).click();
  await page.evaluate(()=>{fixture.cards[0]._submitLock();fixture.cards[0]._submitLock();});expect((await calls(page)).length).toBe(1);
  await page.evaluate(()=>fixture.pending[0].reject(new Error(`Lock code validation failed: ${fixture.pending[0].call.payload.code}`)));
  await expect(dialog(page).locator('[data-lock-message]')).toContainText(/failed|unknown|could not/i);
  const visible=await card(page).innerText();expect(visible).not.toContain(marker);expect(visible).not.toContain('Lock code validation failed');
  const retained=await page.evaluate(()=>{const c=fixture.cards[0];return JSON.stringify({status:c._coordinator.status,intent:c._lockIntent,html:c._dialogHost.shadowRoot.innerHTML,config:c.config});});expect(retained).not.toContain(marker);
  await dialog(page).locator('[data-lock-dismiss]').click();await trigger(page).click();await expect(input(page)).toHaveValue('');expect((await calls(page)).length).toBe(1);
});

test('automation-only scope and disabled relock are explained without changing the provider',async({page})=>{
  await setup(page,{lockUsers:false,lockAutomations:true,relock:0});await expect(card(page).locator('[data-adjust][data-delta="1"]')).toBeEnabled();await trigger(page).click();
  await expect(dialog(page)).toContainText('Locks changes from automations. User controls remain available.');await expect(dialog(page)).toContainText('Automatic relocking is off.');expect(await calls(page)).toEqual([]);
});
