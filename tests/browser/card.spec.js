// SPDX-License-Identifier: GPL-3.0-only
import { test, expect } from '@playwright/test';
const card = page => page.locator('thermal-intelligence-card').first();
const increase = page => card(page).getByRole('button',{name:'Increase target temperature'});
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
  await expect(card(page).getByText('Choose a climate entity')).toBeVisible();
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
  await card(page).getByRole('combobox',{name:'Preset',exact:true}).selectOption('frost');
  expect((await calls(page))[0]).toEqual({domain:'climate',service:'set_preset_mode',payload:{preset_mode:'frost',entity_id:'climate.fixture_thermostat'}});
  await card(page).getByRole('button',{name:'Thermostat details',exact:true}).click();
  await expect(card(page).locator('.details')).toContainText('presets and temperatures do not establish ownership');
  await expect(card(page).locator('.details')).not.toContainText('[object Object]');
  await expect(card(page).getByRole('combobox',{name:'Fan',exact:true})).toHaveCount(0);
});

test('known VT cannot bypass unready gating with standard configuration',async({page})=>{
  await reset(page,'vt-unready',{adapter:'standard'});
  await expect(increase(page)).toBeDisabled();
  await expect(card(page)).toContainText('Versatile Thermostat is not ready');
  await page.evaluate(()=>fixture.cards[0]._temperature(23));
  await expect(card(page)).toContainText('Heat requested');
  await card(page).getByRole('button',{name:'Thermostat details',exact:true}).click();
  await expect(card(page).locator('.details')).toContainText('VT readiness restrictions remain active');
  await expect(card(page).locator('.details')).toContainText('disabled');
  await expect(card(page).locator('.details')).toContainText('unavailable');
  expect(await calls(page)).toEqual([]);
});

test('Fahrenheit and dual range preserve units and the other endpoint',async({page})=>{
  await reset(page,'fahrenheit');await increase(page).click();
  expect((await calls(page))[0].payload.temperature).toBe(71);
  await reset(page,'range');await increase(page).click();
  expect((await calls(page))[0].payload).toEqual({target_temp_low:19.5,target_temp_high:24,entity_id:'climate.fixture_thermostat'});
  await expect(increase(page)).toBeEnabled();
  await card(page).getByRole('combobox',{name:'Horizontal swing',exact:true}).selectOption('horizontal');
  expect((await calls(page))[1].service).toBe('set_swing_horizontal_mode');
});

test('invalid numeric data disables temperature independently of supported mode',async({page})=>{
  await page.evaluate(()=>{fixture.hass.states['climate.fixture_thermostat'].attributes.target_temp_step=0;fixture.refresh();});
  await expect(increase(page)).toBeDisabled();
  await expect(card(page).getByRole('combobox',{name:'HVAC mode',exact:true})).toBeEnabled();
  await card(page).getByRole('combobox',{name:'HVAC mode',exact:true}).selectOption('off');
  expect((await calls(page))[0].service).toBe('set_hvac_mode');
});

test('keyboard draft commits once on release and cancels on concurrent state change',async({page})=>{
  const dial=card(page).getByRole('slider');await dial.focus();await page.keyboard.down('ArrowUp');
  expect(await calls(page)).toEqual([]);
  await page.keyboard.up('ArrowUp');await expect.poll(async()=> (await calls(page)).length).toBe(1);
  await expect(increase(page)).toBeEnabled();await dial.focus();await page.keyboard.down('ArrowUp');
  await page.evaluate(()=>{fixture.hass.states['climate.fixture_thermostat'].attributes.temperature=25;fixture.refresh();});
  await page.keyboard.up('ArrowUp');expect((await calls(page)).length).toBe(1);
  await expect(card(page)).toContainText('draft was cancelled');
});

for(const change of ['user','socket','connection','unit','mode']) test(`keyboard draft cancels when ${change} changes`,async({page})=>{
  const dial=card(page).getByRole('slider');await dial.focus();await page.keyboard.down('ArrowUp');
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
  const dial=card(page).getByRole('slider');await dial.focus();await page.keyboard.down('ArrowUp');
  await page.evaluate(()=>{fixture.hass.user={id:'second-user'};fixture.refresh();});
  await expect(increase(page)).toBeEnabled();await page.keyboard.down('ArrowUp');await page.keyboard.up('ArrowUp');
  expect(await calls(page)).toEqual([]);
  await dial.focus();await page.keyboard.press('ArrowUp');expect((await calls(page)).length).toBe(1);
});

test('pointer tap has no effect, drag commits once, lost capture cancels',async({page})=>{
  const dial=card(page).getByRole('slider');await dial.click();expect(await calls(page)).toEqual([]);
  const box=await dial.boundingBox();const x=box.x+box.width/2,y=box.y+box.height/2;
  await page.mouse.move(x,y-90);await page.mouse.down();await page.mouse.move(x+90,y,{steps:5});
  expect(await calls(page)).toEqual([]);await page.mouse.up();await expect.poll(async()=> (await calls(page)).length).toBe(1);
  await expect(increase(page)).toBeEnabled();
  await page.mouse.move(x,y-90);await page.mouse.down();await page.mouse.move(x+60,y,{steps:3});
  await page.evaluate(()=>{const c=fixture.cards[0];c.shadowRoot.querySelector('.dial').releasePointerCapture(c._drag.pointer);});
  await page.mouse.up();
  expect(await page.evaluate(()=>fixture.cards[0]._draftContext)).toBeNull();
  expect((await calls(page)).length).toBe(1);
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
  await expect(card(page)).toContainText('Provider unverified');
  await page.evaluate(()=>fixture.cards[0]._temperature(23));expect(await calls(page)).toEqual([]);
});

test('pending target change and reconnect never retarget or replay',async({page})=>{
  await page.evaluate(()=>fixture.behavior='pending');await increase(page).click();
  await page.evaluate(()=>{fixture.configure({...fixture.config,entity:'climate.fixture_secondary'});fixture.hass.connected=false;fixture.refresh();fixture.hass.connected=true;fixture.refresh();fixture.pending[0].resolve();});
  await expect(card(page).locator('[data-request-status]')).toContainText('uncertain');
  expect((await calls(page)).length).toBe(1);expect((await calls(page))[0].payload.entity_id).toBe('climate.fixture_thermostat');
});

test('visual editor preserves unknown fields and changes only its card',async({page})=>{
  await reset(page,'standard',{future:{enabled:true},telemetry:[{kind:'humidity',entity:'sensor.fixture_humidity',future:'retained'}]});
  await page.evaluate(()=>fixture.addCard(fixture.config));
  await edit(page,'name','Review thermostat');await field(page,'theme').selectOption('light');
  await field(page,'show_activity').uncheck();await field(page,'show_details').uncheck();
  await expect(card(page)).toContainText('Review thermostat');
  await expect(page.locator('thermal-intelligence-card').nth(1)).not.toContainText('Review thermostat');
  await editor(page).locator('[data-section="telemetry"] summary').click();
  await edit(page,'telemetry.0.label','Room humidity');await editor(page).locator('[data-action="add-telemetry"]').click();
  await edit(page,'telemetry.1.entity','sensor.fixture_valve');await field(page,'telemetry.1.kind').selectOption('valve');
  await edit(page,'telemetry.1.attribute','position');await edit(page,'telemetry.1.unit','%');await edit(page,'telemetry.1.max_age_seconds','60');
  await editor(page).locator('[data-action="move-telemetry-up"][data-row="1"]').click();
  await editor(page).locator('[data-section="advanced"] summary').click();
  const count=await page.evaluate(()=>fixture.events.length);await edit(page,'humidity_bands.low','40');
  expect(await page.evaluate(()=>fixture.events.length)).toBe(count);
  await edit(page,'humidity_bands.high','60');await edit(page,'step','0.25');
  const saved=await page.evaluate(()=>fixture.config);
  expect(saved.future).toEqual({enabled:true});expect(saved.telemetry[1].future).toBe('retained');expect(saved.humidity_bands).toEqual({low:40,high:60});expect(saved.step).toBe(.25);
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

test('optional telemetry failure and freshness do not block climate controls',async({page})=>{
  await reset(page,'standard',{humidity_bands:{low:40,high:60},telemetry:[{kind:'humidity',entity:'sensor.fixture_humidity',max_age_seconds:.2},{kind:'power',entity:'sensor.missing',unit:'W'}]});
  await expect(card(page)).toContainText('Local display band: within');
  await expect(card(page)).toContainText('Configured source is unavailable');
  await expect(card(page).locator('.metric').first()).toHaveAttribute('data-status','stale');
  await expect(increase(page)).toBeEnabled();expect(await calls(page)).toEqual([]);
});

test('provider text is escaped and fine numeric increments stay visible',async({page})=>{
  await page.evaluate(()=>{const attrs=fixture.hass.states['climate.fixture_thermostat'].attributes;attrs.friendly_name='<img src=x onerror="window.injected=1">';attrs.temperature=21.001;attrs.target_temp_step=.001;fixture.refresh();});
  await expect(card(page).locator('[data-target-value]')).toHaveText('21.001');
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
  await card(page).getByRole('button',{name:'Thermostat details',exact:true}).click();
  await expect(card(page).locator('.details')).toContainText('22.5 °C');
  await expect(card(page).locator('.details')).toContainText('this is not a measured temperature');
  expect(await calls(page)).toEqual([]);
});

for(const width of [390,820,1440]) test(`responsive layout and keyboard at ${width}px`,async({page})=>{
  await page.setViewportSize({width,height:1000});await page.emulateMedia({reducedMotion:'reduce'});
  await reset(page,'standard',{name:'A long provider thermostat name with enough detail to wrap safely across narrow screens'});
  await expect(increase(page)).toBeVisible();await expect(editor(page)).toBeVisible();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
  await card(page).getByRole('slider').focus();await page.keyboard.press('ArrowUp');
  expect((await calls(page)).length).toBe(1);
});
