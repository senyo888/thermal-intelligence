// SPDX-License-Identifier: GPL-3.0-only
import { test, expect } from '@playwright/test';
const card = page => page.locator('thermal-intelligence-card').first();
const increase = (page,key='temperature') => card(page).locator(`[data-adjust="${key}"][data-delta="1"]`);
const marker = (page,key='temperature') => card(page).locator(`[data-marker="${key}"]`);
const target = (page,key='temperature') => card(page).locator(`[data-value="${key}"]`);
async function expand(page) {
  const toggle=card(page).locator('[data-expand]');
  if(await toggle.getAttribute('aria-expanded')!=='true')await toggle.click();
  await expect(toggle).toHaveAttribute('aria-expanded','true');
}
async function overview(page) {
  await card(page).locator('[data-device]').click();
  const dialog=card(page).getByRole('dialog');await expect(dialog).toBeVisible();return dialog;
}
async function openSection(dialog,name) {
  const section=dialog.locator(`#section-${name}`);
  if(await section.getAttribute('open')===null)await section.locator('summary').click();
  await expect(section).toHaveAttribute('open','');return section;
}
async function svgPoint(page,x,y) {
  return card(page).locator('.dial > svg').evaluate((svg,{x,y})=>{
    const point=new DOMPoint(x,y).matrixTransform(svg.getScreenCTM());return {x:point.x,y:point.y};
  },{x,y});
}
async function markerCenter(page,key='temperature') {
  const box=await marker(page,key).boundingBox();expect(box).not.toBeNull();
  return {x:box.x+box.width/2,y:box.y+box.height/2};
}
async function pointAtTarget(page,value,min=7,max=30) {
  const angle=(135+270*(value-min)/(max-min))*Math.PI/180;
  return svgPoint(page,100+72*Math.cos(angle),100+72*Math.sin(angle));
}
const editor = page => page.locator('thermal-intelligence-card-editor');
const field = (page,name) => editor(page).locator(`[data-field="${name}"]`);
const calls = page => page.evaluate(()=>fixture.calls);
async function reset(page,scenario='standard',config={}) {
  await page.evaluate(({scenario,config})=>fixture.reset(scenario,config),{scenario,config});
  await expect.poll(()=>page.evaluate(()=>fixture.cards[0]._registryStatus)).not.toBe('loading');
}
async function edit(page,name,value) { await field(page,name).fill(value); await field(page,name).press('Tab'); }
test.beforeEach(async({page})=>{page.runtimeErrors=[];page.on('pageerror',error=>page.runtimeErrors.push(error.message));await page.goto('/');await expect(increase(page)).toBeEnabled();});
test.afterEach(async({page})=>{expect(page.runtimeErrors).toEqual([]);});

test('picker, empty setup, editor, reopen and duplicate resource never dispatch',async({page})=>{
  await reset(page,'empty');
  await expect(card(page).getByText(/(?:Choose|Select) a climate entity/).first()).toBeVisible();
  await expect(editor(page).getByText(/No climate entities are available/)).toBeVisible();
  const stub=await page.evaluate(()=>customElements.get('thermal-intelligence-card').getStubConfig({states:{}}));
  expect(stub.entity).toBe('');
  await page.evaluate(async()=>{await import('/dist/thermal-intelligence.js?duplicate');fixture.cards[0].setConfig(fixture.config);fixture.cards[0].hass=fixture.hass;});
  expect(await page.evaluate(()=>window.customCards.filter(row=>row.type==='thermal-intelligence-card').length)).toBe(1);
  expect(await calls(page)).toEqual([]);
});

test('preview property and HA preview host both disable every command',async({page})=>{
  await page.locator('#preview').check();
  await expect(increase(page)).toBeDisabled();
  await page.evaluate(()=>fixture.cards[0]._temperature(23));
  await page.locator('#preview').uncheck();
  await expect(increase(page)).toBeEnabled();
  await page.evaluate(()=>{const host=document.createElement('hui-card-preview');fixture.cards[0].before(host);host.append(fixture.cards[0]);});
  await expect(increase(page)).toBeDisabled();
  await page.evaluate(()=>fixture.cards[0]._request('set_hvac_mode',{hvac_mode:'off'}));
  expect(await calls(page)).toEqual([]);
});

test('intentional target command retains target and distinguishes observation',async({page})=>{
  await page.evaluate(()=>fixture.behavior='accept');
  await increase(page).click();
  expect(await calls(page)).toEqual([{domain:'climate',service:'set_temperature',payload:{temperature:21.5,entity_id:'climate.fixture_thermostat'}}]);
  await expect(card(page).locator('[data-request-status]')).toContainText('accepted');
  await expect(increase(page)).toBeDisabled();
  await page.evaluate(()=>fixture.apply(fixture.calls[0]));
  await expect(card(page).locator('[data-request-status]')).toContainText('observed');
  await expect(card(page).locator('[data-request-status]')).toContainText('does not establish physical heating');
  await expect(increase(page)).toBeEnabled();
});

test('presets retain provider service values and never establish ownership',async({page})=>{
  await expand(page);await card(page).locator('[data-preset="frost"]').click();
  expect((await calls(page))[0]).toEqual({domain:'climate',service:'set_preset_mode',payload:{preset_mode:'frost',entity_id:'climate.fixture_thermostat'}});
  const details=await overview(page);
  const ownership=await openSection(details,'control');
  await expect(ownership.locator('.note')).toBeVisible();
  await expect(ownership).toContainText('presets and temperatures do not establish ownership');
  await expect(details).not.toContainText('[object Object]');
  await expect(card(page).getByRole('combobox',{name:'Fan',exact:true})).toHaveCount(0);
});

test('live overview refresh preserves the disclosure and keyboard focus being inspected',async({page})=>{
  const details=await overview(page);const provider=await openSection(details,'provider');
  const summary=provider.locator('summary');await summary.focus();await expect(summary).toBeFocused();
  await page.evaluate(()=>{fixture.hass.states['sensor.fixture_humidity'].state='49';fixture.refresh();});
  await expect(provider).toHaveAttribute('open','');await expect(summary).toBeFocused();
  await expect(provider.getByText('Home Assistant climate',{exact:true})).toBeVisible();
  expect(await calls(page)).toEqual([]);
});

test('known VT cannot bypass unready gating with standard configuration',async({page})=>{
  await reset(page,'vt-unready',{adapter:'standard',telemetry:[]});
  await expect(increase(page)).toBeDisabled();
  await expect(card(page)).toContainText('Versatile Thermostat is not ready');
  await page.evaluate(()=>fixture.cards[0]._temperature(23));
  await expect(card(page)).toContainText('Heat requested');
  const details=await overview(page);
  const provider=await openSection(details,'provider');
  await expect(provider).toContainText('VT readiness restrictions remain active');
  const evidence=await openSection(details,'provider-details');
  await expect(evidence.getByText('disabled',{exact:true})).toBeVisible();
  await expect(evidence.getByText('unavailable',{exact:true}).first()).toBeVisible();
  expect(await calls(page)).toEqual([]);
});

test('VT lock icon follows reported state and lock scope without issuing commands',async({page})=>{
  await reset(page,'vt');
  const indicator=card(page).locator('[data-lock-state]');
  await expect(indicator).toHaveCount(0);
  await page.evaluate(()=>{Object.assign(fixture.hass.states['climate.fixture_thermostat'].attributes,{is_lock_configured:true,specific_states:{is_locked:false},lock_manager:{lock_users:true}});fixture.refresh();});
  await expect(indicator).toHaveAttribute('aria-label','VT unlocked');
  await expect(indicator.locator('ha-icon')).toHaveAttribute('icon','mdi:lock-open-variant-outline');
  await expect(increase(page)).toBeEnabled();
  await page.evaluate(()=>{fixture.hass.states['climate.fixture_thermostat'].attributes.specific_states.is_locked=true;fixture.refresh();});
  await expect(indicator).toHaveAttribute('aria-label','VT locked');
  await expect(indicator.locator('ha-icon')).toHaveAttribute('icon','mdi:lock-outline');
  await expect(card(page).locator('[data-request-status]')).toBeHidden();
  await expect(card(page).locator('.condition')).not.toContainText('locked');
  await expect(increase(page)).toBeDisabled();
  await expand(page);
  await expect(card(page).getByRole('combobox',{name:'HVAC mode',exact:true})).toBeDisabled();
  await indicator.click();
  await page.evaluate(()=>{fixture.hass.states['climate.fixture_thermostat'].attributes.lock_manager.lock_users=false;fixture.refresh();});
  await expect(indicator).toHaveAttribute('data-lock-state','locked');
  await expect(increase(page)).toBeEnabled();
  await page.evaluate(()=>{delete fixture.hass.states['climate.fixture_thermostat'].attributes.specific_states.is_locked;fixture.refresh();});
  await expect(indicator).toHaveAttribute('aria-label','VT lock state unknown');
  await expect(increase(page)).toBeDisabled();
  await page.evaluate(()=>{fixture.hass.connected=false;fixture.refresh();});
  await expect(indicator).toHaveAttribute('aria-label','VT lock state unavailable');
  await page.evaluate(()=>{fixture.hass.connected=true;fixture.hass.states['climate.fixture_thermostat'].attributes.specific_states.is_locked=false;fixture.refresh();});
  await expect(indicator).toHaveAttribute('aria-label','VT unlocked');
  await expect(increase(page)).toBeEnabled();
  expect(await calls(page)).toEqual([]);
});

test('Fahrenheit and dual range preserve units and the other endpoint',async({page})=>{
  await reset(page,'fahrenheit');await increase(page).click();
  expect((await calls(page))[0].payload.temperature).toBe(71);
  await reset(page,'range');await increase(page,'target_temp_low').click();
  expect((await calls(page))[0].payload).toEqual({target_temp_low:19.5,target_temp_high:24,entity_id:'climate.fixture_thermostat'});
  await expect(increase(page,'target_temp_low')).toBeEnabled();await expand(page);
  await card(page).getByRole('combobox',{name:'Horizontal swing',exact:true}).selectOption('horizontal');
  expect((await calls(page))[1].service).toBe('set_swing_horizontal_mode');
});

test('invalid numeric data disables temperature independently of supported mode',async({page})=>{
  await page.evaluate(()=>{fixture.hass.states['climate.fixture_thermostat'].attributes.target_temp_step=0;fixture.refresh();});
  await expect(increase(page)).toBeDisabled();await expand(page);
  await expect(card(page).getByRole('combobox',{name:'HVAC mode',exact:true})).toBeEnabled();
  await card(page).getByRole('combobox',{name:'HVAC mode',exact:true}).selectOption('off');
  expect((await calls(page))[0].service).toBe('set_hvac_mode');
});

test('unrelated HA updates preserve a mode selector, while availability changes still gate it',async({page})=>{
  await expand(page);
  const mode=card(page).getByRole('combobox',{name:'HVAC mode',exact:true});
  await mode.focus();
  await mode.evaluate(node=>{window.retainedModeSelector=node;});
  for(let update=0;update<3;update++) {
    await page.evaluate(()=>{
      fixture.hass.states['climate.fixture_secondary'].attributes.current_temperature+=0.1;
      fixture.refresh();
    });
    expect(await mode.evaluate(node=>node===window.retainedModeSelector)).toBe(true);
    await expect(mode).toBeFocused();
  }
  expect(await calls(page)).toEqual([]);
  await page.evaluate(()=>{fixture.hass.states['climate.fixture_thermostat'].state='unavailable';fixture.refresh();});
  await expect(mode).toBeDisabled();
  await page.evaluate(()=>fixture.cards[0]._request('set_hvac_mode',{hvac_mode:'heat'}));
  expect(await calls(page)).toEqual([]);
});

test('a cancelled marker draft restores the reported target without a service call',async({page})=>{
  const dial=marker(page);await dial.focus();
  await page.keyboard.down('ArrowUp');
  await expect(target(page)).toHaveText('21.5°C');
  await page.keyboard.press('Escape');await page.keyboard.up('ArrowUp');
  await expect(target(page)).toHaveText('21°C');
  await expect(dial).toHaveAttribute('aria-valuenow','21');
  expect(await calls(page)).toEqual([]);
});

test('keyboard draft commits once on release and cancels on concurrent state change',async({page})=>{
  const dial=marker(page);await dial.focus();await page.keyboard.down('ArrowUp');
  expect(await calls(page)).toEqual([]);
  await page.keyboard.up('ArrowUp');await expect.poll(async()=> (await calls(page)).length).toBe(1);
  await expect(increase(page)).toBeEnabled();await dial.focus();await page.keyboard.down('ArrowUp');
  await page.evaluate(()=>{fixture.hass.states['climate.fixture_thermostat'].attributes.temperature=25;fixture.refresh();});
  await page.keyboard.up('ArrowUp');expect((await calls(page)).length).toBe(1);
  await expect(card(page)).toContainText('draft was cancelled');
});

for(const change of ['user','socket','connection','unit','mode']) test(`keyboard draft cancels when ${change} changes`,async({page})=>{
  const dial=marker(page);await dial.focus();await page.keyboard.down('ArrowUp');
  await page.evaluate(change=>{
    if(change==='user')fixture.hass.user={id:'different-synthetic-user'};
    if(change==='socket')fixture.hass.connection.socket={};
    if(change==='connection')fixture.hass.connection={connected:true,socket:{}};
    if(change==='unit')fixture.hass.config.unit_system.temperature='°F';
    if(change==='mode')fixture.hass.states['climate.fixture_thermostat'].state='off';
    fixture.refresh();
  },change);
  await page.keyboard.up('ArrowUp');expect(await calls(page)).toEqual([]);
});

test('holding a key across a session change cannot start a new command draft',async({page})=>{
  const dial=marker(page);await dial.focus();await page.keyboard.down('ArrowUp');
  await page.evaluate(()=>{fixture.hass.user={id:'second-user'};fixture.refresh();});
  await expect(increase(page)).toBeEnabled();await page.keyboard.down('ArrowUp');await page.keyboard.up('ArrowUp');
  expect(await calls(page)).toEqual([]);
  await dial.focus();await page.keyboard.press('ArrowUp');expect((await calls(page)).length).toBe(1);
});

test('source dial keeps its geometry, glass details, central current and lower target',async({page})=>{
  const svg=card(page).locator('.dial > svg');
  await expect(svg).toHaveAttribute('viewBox','10 0 180 184');
  await expect(svg.locator('g.diamond')).toHaveCount(21);
  await expect(svg.locator('g.diamond > path')).toHaveCount(42);
  await expect(svg.locator('g.diamond > circle')).toHaveCount(21);
  await expect(svg.locator('radialGradient#arc-glass')).toHaveCount(1);
  await expect(svg.locator('radialGradient#pearl')).toHaveCount(1);
  await expect(svg.locator('circle[r="57"][fill="url(#dome)"]')).toHaveCount(1);
  const current=svg.locator('[data-current-value]');
  await expect(current).toHaveAttribute('x','100');await expect(current).toHaveAttribute('y','103');
  await expect(current).toHaveText('19.8');await expect(target(page)).toHaveText('21°C');
  const readingBox=await current.boundingBox(),targetBox=await target(page).boundingBox();
  expect(targetBox.y).toBeGreaterThan(readingBox.y+readingBox.height);
  await expect(card(page).locator('.targets [data-target-value]')).toHaveCount(1);
  await expect(marker(page)).toHaveAttribute('role','slider');
  await expect(card(page).locator('[data-expand]')).toHaveAttribute('aria-expanded','false');
  await expect(card(page).locator('[data-preset="frost"]')).toBeHidden();
  expect(await calls(page)).toEqual([]);
});

test('source centre opens native details without acting as a target gesture',async({page})=>{
  await page.evaluate(()=>{window.nativeDetails=[];fixture.cards[0].addEventListener('hass-more-info',event=>window.nativeDetails.push(event.detail));});
  await card(page).locator('[data-details]').click();
  expect(await page.evaluate(()=>window.nativeDetails)).toEqual([{entityId:'climate.fixture_thermostat'}]);
  expect(await calls(page)).toEqual([]);expect(await page.evaluate(()=>fixture.cards[0]._draftContext)).toBeFalsy();
});

test('LED hold cancellation and the 600ms device gesture never issue heating commands',async({page})=>{
  await page.clock.install({time:new Date('2026-10-25T12:00:00Z')});await page.clock.pauseAt(new Date('2026-10-25T12:00:01Z'));
  await page.evaluate(()=>{
    fixture.hass.entities={'climate.fixture_thermostat':{entity_id:'climate.fixture_thermostat',platform:'generic_thermostat',device_id:'synthetic-device-123'}};
    fixture.configure({...fixture.config});fixture.refresh();window.deviceNavigations=0;
    window.addEventListener('location-changed',()=>window.deviceNavigations++);
  });
  const led=card(page).locator('[data-device]');
  await led.click();await expect(card(page).getByRole('dialog')).toBeVisible();
  await page.keyboard.press('Escape');await expect(led).toBeFocused();
  const box=await led.boundingBox(),point={x:box.x+box.width/2,y:box.y+box.height/2};
  await page.mouse.move(point.x,point.y);await page.mouse.down();await page.mouse.move(point.x+11,point.y);
  await page.clock.fastForward(601);await page.mouse.up();
  expect(await page.evaluate(()=>window.deviceNavigations)).toBe(0);
  await page.keyboard.press('Escape');
  await page.mouse.move(point.x,point.y);await page.mouse.down();
  await led.dispatchEvent('pointercancel',{pointerId:1,isPrimary:true,button:0});
  await page.clock.fastForward(601);await page.mouse.up();
  expect(await page.evaluate(()=>window.deviceNavigations)).toBe(0);
  await page.keyboard.press('Escape');
  await page.mouse.move(point.x,point.y);await page.mouse.down();
  await page.clock.fastForward(599);expect(await page.evaluate(()=>window.deviceNavigations)).toBe(0);
  await page.clock.fastForward(1);await expect(page).toHaveURL(/\/config\/devices\/device\/synthetic-device-123$/);
  await page.mouse.up();expect(await page.evaluate(()=>window.deviceNavigations)).toBe(1);
  await expect(card(page).getByRole('dialog')).toHaveCount(0);expect(await calls(page)).toEqual([]);
});

test('LED Shift+Enter uses verified device identity and falls back to native entity details',async({page})=>{
  await page.evaluate(()=>{
    fixture.hass.entities={'climate.fixture_thermostat':{entity_id:'climate.fixture_thermostat',platform:'generic_thermostat',device_id:'synthetic-device-456'}};
    fixture.configure({...fixture.config});fixture.refresh();window.deviceNavigations=0;window.nativeDeviceDetails=[];
    window.addEventListener('location-changed',()=>window.deviceNavigations++);
    fixture.cards[0].addEventListener('hass-more-info',event=>window.nativeDeviceDetails.push(event.detail));
  });
  const led=card(page).locator('[data-device]');await led.focus();await page.keyboard.press('Shift+Enter');
  await expect(page).toHaveURL(/\/config\/devices\/device\/synthetic-device-456$/);
  expect(await page.evaluate(()=>window.deviceNavigations)).toBe(1);
  expect(await page.evaluate(()=>window.nativeDeviceDetails)).toEqual([]);
  await page.evaluate(()=>{
    history.replaceState(null,'','/');
    fixture.hass.entities={'climate.fixture_thermostat':{entity_id:'climate.fixture_thermostat',platform:'generic_thermostat'}};
    fixture.configure({...fixture.config});fixture.refresh();
  });
  await led.focus();await page.keyboard.press('Shift+Enter');
  expect(await page.evaluate(()=>window.nativeDeviceDetails)).toEqual([{entityId:'climate.fixture_thermostat'}]);
  expect(await page.evaluate(()=>window.deviceNavigations)).toBe(1);
  await expect(card(page).getByRole('dialog')).toHaveCount(0);expect(await calls(page)).toEqual([]);
});

test('marker pickup retains its exact target even away from the pearl centre',async({page})=>{
  const box=await marker(page).boundingBox();
  const picked={x:box.x+box.width*.75,y:box.y+box.height*.35};
  const centre=await svgPoint(page,100,100);
  await page.mouse.move(picked.x,picked.y);await page.mouse.down();
  await expect(marker(page)).toHaveAttribute('aria-valuenow','21');await expect(target(page)).toHaveText('21°C');
  expect(await calls(page)).toEqual([]);
  const dx=picked.x-centre.x,dy=picked.y-centre.y,scale=(Math.hypot(dx,dy)+10)/Math.hypot(dx,dy);
  await page.mouse.move(centre.x+dx*scale,centre.y+dy*scale,{steps:3});
  await expect(marker(page)).toHaveAttribute('aria-valuenow','21');await expect(target(page)).toHaveText('21°C');
  expect(await calls(page)).toEqual([]);await page.mouse.up();expect(await calls(page)).toEqual([]);
});

test('marker tap has no effect, angular drag commits the exact target once, lost capture cancels',async({page})=>{
  await marker(page).click();expect(await calls(page)).toEqual([]);
  let from=await markerCenter(page),to=await pointAtTarget(page,23);
  await page.mouse.move(from.x,from.y);await page.mouse.down();await page.mouse.move(to.x,to.y,{steps:5});
  await expect(marker(page)).toHaveAttribute('aria-valuenow','23');expect(await calls(page)).toEqual([]);
  await page.mouse.up();await expect.poll(async()=> (await calls(page)).length).toBe(1);
  expect((await calls(page))[0]).toEqual({domain:'climate',service:'set_temperature',payload:{temperature:23,entity_id:'climate.fixture_thermostat'}});
  await expect(increase(page)).toBeEnabled();
  from=await markerCenter(page);to=await pointAtTarget(page,24);
  await page.mouse.move(from.x,from.y);await page.mouse.down();await page.mouse.move(to.x,to.y,{steps:3});
  await page.evaluate(()=>{const c=fixture.cards[0];c.shadowRoot.querySelector('[data-marker="temperature"]').releasePointerCapture(c._drag.pointer);});
  await page.mouse.up();expect(await page.evaluate(()=>fixture.cards[0]._draftContext)).toBeNull();
  expect((await calls(page)).length).toBe(1);await expect(target(page)).toHaveText('23°C');
});

test('range dial exposes both markers and each gesture preserves the other endpoint',async({page})=>{
  await reset(page,'range');
  await expect(card(page).locator('[data-marker]')).toHaveCount(2);
  await expect(marker(page,'target_temp_low')).toHaveAttribute('aria-valuenow','19');
  await expect(marker(page,'target_temp_high')).toHaveAttribute('aria-valuenow','24');
  await expect(card(page).locator('[data-marker-visual]')).toHaveCount(2);
  let from=await markerCenter(page,'target_temp_low'),to=await pointAtTarget(page,20);
  await page.mouse.move(from.x,from.y);await page.mouse.down();await page.mouse.move(to.x,to.y,{steps:4});
  await expect(marker(page,'target_temp_low')).toHaveAttribute('aria-valuenow','20');
  await expect(marker(page,'target_temp_high')).toHaveAttribute('aria-valuenow','24');expect(await calls(page)).toEqual([]);
  await page.mouse.up();await expect(increase(page,'target_temp_low')).toBeEnabled();
  expect((await calls(page))[0].payload).toEqual({target_temp_low:20,target_temp_high:24,entity_id:'climate.fixture_thermostat'});
  await marker(page,'target_temp_high').focus();await page.keyboard.press('ArrowUp');
  expect((await calls(page))[1].payload).toEqual({target_temp_low:20,target_temp_high:24.5,entity_id:'climate.fixture_thermostat'});
});

test('registry lookup retries after same-connection reconnect',async({page})=>{
  await page.evaluate(()=>{fixture.hass.connected=false;fixture.configure({...fixture.config,name:'Reconnecting'});fixture.refresh();});
  await expect(increase(page)).toBeDisabled();
  await page.evaluate(()=>{fixture.hass.connected=true;fixture.refresh();});
  await expect(increase(page)).toBeEnabled();expect(await calls(page)).toEqual([]);
});

test('failed registry lookup on a new session cannot reuse standard evidence',async({page})=>{
  await page.evaluate(()=>{fixture.registryFailure=true;fixture.hass.connection={connected:true,socket:{}};fixture.refresh();});
  await expect(increase(page)).toBeDisabled();
  const details=await overview(page);const provider=await openSection(details,'provider');await expect(provider.getByText('Provider unverified',{exact:true})).toBeVisible();await page.keyboard.press('Escape');
  await page.evaluate(()=>fixture.cards[0]._temperature(23));expect(await calls(page)).toEqual([]);
});

test('pending target change and reconnect never retarget or replay',async({page})=>{
  await page.evaluate(()=>fixture.behavior='pending');await increase(page).click();
  await page.evaluate(()=>{fixture.configure({...fixture.config,entity:'climate.fixture_secondary'});fixture.hass.connected=false;fixture.refresh();fixture.hass.connected=true;fixture.refresh();fixture.pending[0].resolve();});
  await expect(card(page).locator('[data-request-status]')).toContainText('uncertain');
  expect((await calls(page)).length).toBe(1);expect((await calls(page))[0].payload.entity_id).toBe('climate.fixture_thermostat');
});

test('visual editor preserves unknown fields and changes only its card',async({page})=>{
  await reset(page,'standard',{theme:'dark',future:{enabled:true},telemetry:[{kind:'humidity',entity:'sensor.fixture_humidity',future:'retained'}]});
  await page.evaluate(()=>fixture.addCard(fixture.config));
  await edit(page,'name','Review thermostat');await field(page,'background').selectOption('plum');
  await field(page,'show_activity').uncheck();await field(page,'show_details').uncheck();
  await expect(card(page)).toContainText('Review thermostat');
  await expect(page.locator('thermal-intelligence-card').nth(1)).not.toContainText('Review thermostat');
  await editor(page).locator('[data-section="telemetry"] summary').click();
  await edit(page,'telemetry.0.label','Room humidity');await editor(page).locator('[data-action="add-telemetry"]').click();
  await edit(page,'telemetry.1.entity','sensor.fixture_valve');await field(page,'telemetry.1.kind').selectOption('valve');
  await edit(page,'telemetry.1.attribute','position');await edit(page,'telemetry.1.unit','%');await edit(page,'telemetry.1.max_age_seconds','60');
  await editor(page).locator('[data-action="move-telemetry-up"][data-row="1"]').click();
  await editor(page).locator('[data-section="advanced"] summary').click();
  const count=await page.evaluate(()=>fixture.events.length);await edit(page,'humidity_bands.dry_below','40');
  expect(await page.evaluate(()=>fixture.events.length)).toBe(count);
  await edit(page,'humidity_bands.dry_below','30');await edit(page,'humidity_bands.good_min','42');
  await edit(page,'humidity_bands.good_max','62');await edit(page,'humidity_bands.wet_above','72');await edit(page,'step','0.25');
  const saved=await page.evaluate(()=>fixture.config);
  expect(saved.background).toBe('plum');expect(saved.theme).toBe('dark');expect(saved.future).toEqual({enabled:true});expect(saved.telemetry[1].future).toBe('retained');expect(saved.humidity_bands).toEqual({dry_below:30,good_min:42,good_max:62,wet_above:72});expect(saved.step).toBe(.25);
  await page.evaluate(()=>{fixture.editor.setConfig(fixture.config);fixture.cards[0].setConfig(fixture.config);fixture.refresh();});
  expect(await calls(page)).toEqual([]);
});

test('typing then clicking an editor action commits without losing the click',async({page})=>{
  await editor(page).locator('[data-section="telemetry"] summary').click();
  await field(page,'telemetry.0.label').fill('Typed label');
  await editor(page).locator('[data-action="add-telemetry"]').click();
  expect(await page.evaluate(()=>fixture.config.telemetry.length)).toBe(3);
  expect(await page.evaluate(()=>fixture.config.telemetry[0].label)).toBe('Typed label');
  await field(page,'name').fill('A name');
  await page.evaluate(()=>{window.savedInput=fixture.editor.shadowRoot.querySelector('[data-field="name"]');fixture.refresh();});
  expect(await page.evaluate(()=>window.savedInput===fixture.editor.shadowRoot.querySelector('[data-field="name"]'))).toBe(true);
  expect(await calls(page)).toEqual([]);
});

test('source settings dialog retains a local draft without changing dashboard configuration',async({page})=>{
  const before=await page.evaluate(()=>({dashboard:structuredClone(fixture.config),card:structuredClone(fixture.cards[0].config)}));
  await expand(page);await card(page).locator('[data-icon-settings]').click();
  const dialog=card(page).getByRole('dialog');await expect(dialog).toHaveAttribute('data-view','settings');
  await expect(dialog.locator('.scope')).toContainText('does not save dashboard configuration');
  const nested=dialog.locator('[data-dialog-editor]'),name=nested.locator('[data-field="name"]');
  await name.fill('Unsaved source settings');await name.press('Tab');
  await page.evaluate(()=>{const c=fixture.cards[0];window.settingsInput=c._dialogHost.shadowRoot.querySelector('[data-dialog-editor]').shadowRoot.querySelector('[data-field="name"]');fixture.hass.states['sensor.fixture_humidity'].state='49';fixture.refresh();});
  await expect(name).toHaveValue('Unsaved source settings');
  expect(await page.evaluate(()=>window.settingsInput===fixture.cards[0]._dialogHost.shadowRoot.querySelector('[data-dialog-editor]').shadowRoot.querySelector('[data-field="name"]'))).toBe(true);
  const draft=JSON.parse(await dialog.locator('[data-settings-export]').inputValue());expect(draft.name).toBe('Unsaved source settings');
  expect(await page.evaluate(()=>({dashboard:fixture.config,card:fixture.cards[0].config}))).toEqual(before);
  expect(await calls(page)).toEqual([]);
  await dialog.locator('[data-dialog-close]').first().click();
  await card(page).locator('[data-icon-settings]').click();
  await expect(card(page).getByRole('dialog').locator('[data-dialog-editor] [data-field="name"]')).toHaveValue(before.dashboard.name||'');
  expect(await calls(page)).toEqual([]);
});

test('optional telemetry failure and freshness do not block climate controls',async({page})=>{
  await page.clock.install({time:new Date('2026-10-25T10:00:00Z')});
  await page.clock.pauseAt(new Date('2026-10-25T10:00:01Z'));
  await reset(page,'standard',{humidity_bands:{low:40,high:60},telemetry:[{kind:'humidity',entity:'sensor.fixture_humidity',max_age_seconds:.2},{kind:'power',entity:'sensor.missing',unit:'W'}]});
  await page.evaluate(()=>{fixture.hass.states['sensor.fixture_humidity'].last_updated=new Date(Date.now()-50).toISOString();fixture.refresh();});
  const humidity=card(page).locator('.header-telemetry [data-telemetry-topic="humidity"]');
  const power=card(page).locator('.header-telemetry [data-telemetry-topic="entity"]');
  await expect(humidity).toContainText('48 %');await expect(power).toContainText('Unavailable');
  await humidity.click();
  const humidityDialog=card(page).getByRole('dialog');
  await expect(humidityDialog).toHaveAttribute('data-view','humidity');
  await expect(humidityDialog.locator('.preview')).toContainText('48 % · Within legacy display band');
  await expect(humidityDialog).toContainText('original lower and upper values are retained');
  await expect(humidityDialog.locator('input[type="number"]')).toHaveCount(2);
  await expect(humidityDialog.locator('input[type="range"]')).toHaveCount(0);
  await expect(humidityDialog.locator('.scope')).toContainText('visual guides only');
  await expect(humidityDialog.locator('.scope')).toContainText('do not control heating, humidifiers or dehumidifiers');
  await expect(humidityDialog).toHaveAttribute('data-reading-status','available');
  await expect(humidityDialog.locator('dl > div').filter({hasText:'Selected reading (raw)'}).locator('dd')).toHaveText('48 %');
  await page.clock.fastForward(201);
  await expect(humidity).toContainText('Stale');
  await expect(humidityDialog.locator('dl > div').filter({hasText:'Reading status'}).locator('dd')).toHaveText('stale');
  await expect(humidityDialog.locator('.preview')).toContainText('Unavailable');
  await page.keyboard.press('Escape');
  await power.click();
  const powerDialog=card(page).getByRole('dialog');await expect(powerDialog).toHaveAttribute('data-view','telemetry');
  await expect(powerDialog).toContainText('Configured source is unavailable');
  await expect(powerDialog.locator('dl > div').filter({hasText:'Status'}).locator('dd')).toHaveText('unavailable');
  await page.keyboard.press('Escape');
  await expect(increase(page)).toBeEnabled();expect(await calls(page)).toEqual([]);
});

test('explicit valve observation keeps TRV state distinct from thermostat heat request',async({page})=>{
  await reset(page,'vt');
  await expect(card(page).locator('[data-status-overview]')).toHaveText('TRV Closed · 0%');
  const details=await overview(page);await openSection(details,'activity');
  await expect(details.locator('.summary')).toContainText('Reported valve opening');
  await expect(details.locator('.summary')).toContainText('does not establish boiler heating or heat delivery');
  await expect(details.locator('#section-activity')).toContainText('sensor.fixture_valve');
  await page.keyboard.press('Escape');
  await page.evaluate(()=>{fixture.hass.states['sensor.fixture_valve'].state='55';fixture.refresh();});
  await expect(card(page).locator('[data-status-overview]')).toHaveText('TRV Open · 55%');
  expect(await calls(page)).toEqual([]);
});

test('provider text is escaped and fine numeric increments stay visible',async({page})=>{
  await page.evaluate(()=>{const attrs=fixture.hass.states['climate.fixture_thermostat'].attributes;attrs.friendly_name='<img src=x onerror="window.injected=1">';attrs.temperature=21.001;attrs.target_temp_step=.001;fixture.refresh();});
  await expect(target(page)).toHaveText('21.001°C');
  await expect(card(page).locator('img')).toHaveCount(0);expect(await page.evaluate(()=>window.injected)).toBeUndefined();
  await increase(page).click();expect((await calls(page))[0].payload.temperature).toBeCloseTo(21.002,6);
});

test('real browser timer expiry and rejection preserve uncertainty without replay',async({page})=>{
  await page.clock.install();await page.evaluate(()=>fixture.behavior='accept');await increase(page).click();
  await expect(card(page).locator('[data-request-status]')).toContainText('accepted');
  await page.clock.fastForward(10001);
  await expect(card(page).locator('[data-request-status]')).toContainText('not observed before timeout');
  await page.evaluate(()=>{fixture.hass.connected=false;fixture.refresh();fixture.hass.connected=true;fixture.refresh();});
  expect((await calls(page)).length).toBe(1);
  await page.evaluate(()=>fixture.behavior='reject');await increase(page).click();
  await expect(card(page).locator('[data-request-status]')).toContainText('effect is unknown');
  expect((await calls(page)).length).toBe(2);
});

test('VT internal regulated target retains provider units and evidence',async({page})=>{
  await reset(page,'vt');
  await page.evaluate(()=>{const a=fixture.hass.states['climate.fixture_thermostat'].attributes;a.configuration={type:'over_climate',temperature_unit:'°C'};a.vtherm_over_climate={is_regulated:true,regulation:{auto_regulation_mode:'Light',regulated_target_temperature:22.5}};fixture.refresh();});
  const details=await overview(page);
  const evidence=await openSection(details,'provider-details');
  await expect(evidence.getByText(/22\.5 °C/)).toBeVisible();
  await expect(evidence.getByText(/this is not a measured temperature/)).toBeVisible();
  expect(await calls(page)).toEqual([]);
});

for(const width of [390,820,1440]) test(`responsive layout and keyboard at ${width}px`,async({page})=>{
  await page.setViewportSize({width,height:1000});await page.emulateMedia({reducedMotion:'reduce'});
  await reset(page,'standard',{name:'A long provider thermostat name with enough detail to wrap safely across narrow screens'});
  await expect(increase(page)).toBeVisible();await expect(editor(page)).toBeVisible();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
  await marker(page).focus();await page.keyboard.press('ArrowUp');
  expect((await calls(page)).length).toBe(1);
});
