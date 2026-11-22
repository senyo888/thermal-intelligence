// SPDX-License-Identifier: GPL-3.0-only
import {test,expect} from '@playwright/test';
const card=page=>page.locator('thermal-intelligence-beta-card').first();
const editor=page=>page.locator('#editor thermal-intelligence-beta-card-editor');
async function section(page,key) {
  const node=editor(page).locator(`[data-section="${key}"]`);
  if(await node.getAttribute('open')===null)await node.locator(':scope > summary').click();
}
test.beforeEach(async({page})=>{
  page.errors=[];page.on('pageerror',error=>page.errors.push(error.message));
  await page.goto('/');
});
test.afterEach(async({page})=>expect(page.errors).toEqual([]));

test('1000 switches search by name and exact ID without selecting, enrolling or sending commands',async({page})=>{
  await page.evaluate(()=>{
    for(let i=0;i<1000;i++) fixture.hass.states['switch.example_'+i]={entity_id:'switch.example_'+i,state:'off',attributes:{friendly_name:i<2?'Duplicate name':'Example '+i}};
    fixture.refresh();
  });
  await section(page,'mapped-control');
  const query=editor(page).getByRole('searchbox',{name:'Search switches'}),select=editor(page).getByLabel('Switch entity',{exact:true});
  await expect(editor(page)).toContainText('1000 matching switches');
  await expect(select.locator('option')).toHaveCount(101);
  await query.fill('duplicate');await expect(select.locator('option')).toHaveCount(3);
  await query.fill('switch.example_999');await query.press('ArrowDown');await expect(select).toBeFocused();
  await select.selectOption('switch.example_999');
  await expect(editor(page)).toContainText('Selected target: switch.example_999');
  expect(await page.evaluate(()=>fixture.config.mapped_controls)).toBeUndefined();
  await query.fill('no-match');await expect(select).toHaveValue('switch.example_999');
  await expect(editor(page)).toContainText('0 matching switches');
  expect(await page.evaluate(()=>fixture.calls)).toEqual([]);
  expect(await page.evaluate(()=>fixture.events)).toEqual([]);
});

test('search query and focus survive inventory updates, missing saved targets stay visible',async({page})=>{
  await page.evaluate(()=>{
    fixture.reset('standard',{schema_version:2,mapped_controls:{version:1,enabled:false,items:[{kind:'switch_on_off',entity:'switch.missing',label:'Saved switch'}]}});
  });
  await section(page,'mapped-control');
  const query=editor(page).getByRole('searchbox',{name:'Search switches'});
  await query.fill('saved');
  await page.evaluate(()=>{window.searchNode=fixture.editor.shadowRoot.querySelector('[data-field="mapped.search"]');fixture.hass.states['switch.new']={state:'off',attributes:{friendly_name:'New switch'}};fixture.refresh();});
  await expect(query).toHaveValue('saved');await expect(query).toBeFocused();
  expect(await query.evaluate(node=>node===window.searchNode)).toBe(true);
  await expect(editor(page).getByLabel('Switch entity',{exact:true})).toHaveValue('switch.missing');
  await page.locator('h1').click();
  await query.fill('switch.new');
  await expect(editor(page).getByLabel('Switch entity',{exact:true}).locator('option[value="switch.new"]')).toHaveCount(1);
  expect(await page.evaluate(()=>fixture.config.mapped_controls.enabled)).toBe(false);
  expect(await page.evaluate(()=>fixture.calls)).toEqual([]);
});

test('outside weather reading follows actual units and degrades without changing the indoor dial',async({page})=>{
  await page.evaluate(()=>{fixture.hass.states['weather.example']={entity_id:'weather.example',state:'sunny',attributes:{friendly_name:'Example weather',temperature:8,temperature_unit:'°C'},last_updated:new Date().toISOString()};fixture.refresh();});
  await section(page,'sources');
  await editor(page).getByLabel('Outside temperature source',{exact:true}).selectOption('weather.example');
  await editor(page).getByRole('button',{name:'Add outside reading'}).click();
  await expect(card(page).locator('[data-header-telemetry]')).toContainText('8 °C');
  await expect(card(page).locator('[data-current-value]')).toHaveText('19.8');
  const row=await page.evaluate(()=>fixture.config.telemetry.find(row=>row.kind==='temperature'));
  expect(row).toEqual({kind:'temperature',entity:'weather.example',attribute:'temperature',unit_attribute:'temperature_unit',label:'Outside'});
  await page.evaluate(()=>{fixture.hass.states['weather.example'].attributes={temperature:46.4,temperature_unit:'°F'};fixture.refresh();});
  await expect(card(page).locator('[data-header-telemetry]')).toContainText('46.4 °F');
  await page.evaluate(()=>{delete fixture.hass.states['weather.example'].attributes.temperature_unit;fixture.refresh();});
  await expect(card(page).locator('[data-header-telemetry]')).toContainText('Invalid');
  await expect(editor(page).locator('[data-reading-preview]')).toContainText('unit attribute is missing or invalid');
  expect(await page.evaluate(()=>fixture.calls)).toEqual([]);
  expect(await page.evaluate(()=>fixture.config.schema_version)).toBe(1);
});

test('humidity editor gives matching slider, exact fields and preserved unknown preferences',async({page})=>{
  await page.evaluate(()=>fixture.reset('standard',{humidity_bands:{dry_below:30,good_min:40,good_max:60,wet_above:70,future:{retained:true}}}));
  await section(page,'humidity');
  const slider=editor(page).getByRole('slider',{name:'Too dry below humidity slider'});
  const bar=editor(page).locator('[data-humidity-preview] .bar');
  await expect(bar.getByRole('slider')).toHaveCount(4);
  const tracks=await bar.getByRole('slider').evaluateAll(nodes=>nodes.map(node=>{
    const {left,top,width}=node.getBoundingClientRect();
    return [left,top,width];
  }));
  expect(tracks.every(rect=>rect.every((value,index)=>value===tracks[0][index]))).toBe(true);
  await slider.focus();await slider.press('ArrowRight');
  await expect(editor(page).getByLabel('Humidity too dry below (%)',{exact:true})).toHaveValue('31');
  await expect(editor(page).locator('[data-humidity-preview]')).toContainText('48% · Good range');
  await editor(page).getByLabel('Humidity good range maximum (%)',{exact:true}).fill('45');
  await editor(page).getByLabel('Humidity good range maximum (%)',{exact:true}).press('Tab');
  await expect(editor(page).locator('[data-humidity-preview]')).toContainText('High humidity');
  expect(await page.evaluate(()=>fixture.config.humidity_bands.future)).toEqual({retained:true});
  expect(await page.evaluate(()=>fixture.calls)).toEqual([]);
});

async function registryFixture(page) {
  await page.evaluate(()=>{
    fixture.reset('vt',{telemetry:[]});
    fixture.hass.states['sensor.renamed_rate']={entity_id:'sensor.renamed_rate',state:'0.3',attributes:{unit_of_measurement:'°C/hour'},last_updated:new Date().toISOString()};
    window.sourceRegistry=[
      {entity_id:fixture.config.entity,platform:'versatile_thermostat',unique_id:'entry-1',config_entry_id:'entry-1',device_id:'device-1'},
      {entity_id:'sensor.renamed_rate',platform:'versatile_thermostat',unique_id:'Old name_temperature_slope',translation_key:'temperature_slope',config_entry_id:'entry-1',device_id:'device-1',disabled_by:null}
    ];
    const original=fixture.hass.callWS;window.registryListCalls=0;
    fixture.hass.callWS=async message=>{
      if(message.type==='config/entity_registry/list'){window.registryListCalls++;return structuredClone(window.sourceRegistry);}
      return original(message);
    };
    fixture.refresh();
  });
  await section(page,'sources');
}
test('VT source adoption rechecks exact registry identity and never enables automatically',async({page})=>{
  await registryFixture(page);
  await editor(page).getByRole('button',{name:'Find VT sources'}).click();
  await expect(editor(page)).toContainText('sensor.renamed_rate');
  expect(await page.evaluate(()=>fixture.config.telemetry)).toEqual([]);
  await editor(page).getByRole('button',{name:'Use this source'}).first().click();
  expect(await page.evaluate(()=>registryListCalls)).toBe(2);
  expect(await page.evaluate(()=>fixture.config.telemetry)).toEqual([{kind:'trend',entity:'sensor.renamed_rate'}]);
  expect(await page.evaluate(()=>fixture.calls)).toEqual([]);
});
test('registry reassignment between preview and adoption cannot change configuration',async({page})=>{
  await registryFixture(page);
  await editor(page).getByRole('button',{name:'Find VT sources'}).click();
  await page.evaluate(()=>{sourceRegistry[1].device_id='different-device';});
  await editor(page).getByRole('button',{name:'Use this source'}).first().click();
  await expect(editor(page)).toContainText('no longer available');
  expect(await page.evaluate(()=>fixture.config.telemetry)).toEqual([]);
  expect(await page.evaluate(()=>fixture.calls)).toEqual([]);
});
test('late registry replies cannot populate another thermostat or replay after reconnect',async({page})=>{
  await registryFixture(page);
  await page.evaluate(()=>{fixture.hass.callWS=()=>new Promise(resolve=>{window.finishRegistry=resolve;});fixture.refresh();});
  await editor(page).getByRole('button',{name:'Find VT sources'}).click();
  await editor(page).getByLabel('Thermostat entity',{exact:true}).selectOption('climate.fixture_secondary');
  await page.evaluate(()=>{finishRegistry(sourceRegistry);fixture.hass={...fixture.hass,connection:{connected:true,socket:{}}};fixture.refresh();});
  await expect(editor(page).getByRole('button',{name:'Use this source'})).toHaveCount(0);
  expect(await page.evaluate(()=>fixture.config.telemetry)).toEqual([]);
  expect(await page.evaluate(()=>fixture.calls)).toEqual([]);
});
test('runtime settings favour HA editing and keep export explicit and isolated',async({page})=>{
  await card(page).locator('[data-expand]').click();await card(page).locator('[data-icon-settings]').click();await card(page).getByRole('button',{name:'Advanced configuration and export',exact:true}).click();
  const dialog=card(page).getByRole('dialog');
  await expect(dialog).toContainText('Edit this card in Home Assistant');
  await expect(dialog.locator('#advanced-export')).toHaveAttribute('open');
  if(await dialog.locator('#advanced-export').getAttribute('open')===null)await dialog.locator('#advanced-export > summary').click();
  await dialog.getByLabel('Card name',{exact:true}).fill('Export draft');
  await dialog.getByLabel('Card name',{exact:true}).press('Tab');
  expect(await page.evaluate(()=>fixture.config.name)).toBeUndefined();
  await expect(dialog.locator('[data-dialog-editor]')).toContainText('Advanced draft');
  await page.keyboard.press('Escape');
  expect(await page.evaluate(()=>fixture.calls)).toEqual([]);
});
for(const clipboard of ['absent','rejected','delayed'])test(`settings export reveals and selects the latest draft with ${clipboard} clipboard`,async({page})=>{
  await page.evaluate(mode=>Object.defineProperty(navigator,'clipboard',{configurable:true,value:mode==='absent'?undefined:{writeText:mode==='delayed'?()=>new Promise((resolve,reject)=>{window.rejectClipboard=reject;}):async()=>{throw Error('Clipboard denied');}}}),clipboard);
  const saved=await page.evaluate(()=>structuredClone(fixture.config));
  await card(page).locator('[data-expand]').click();await card(page).locator('[data-icon-settings]').click();await card(page).getByRole('button',{name:'Advanced configuration and export',exact:true}).click();
  const dialog=card(page).getByRole('dialog'),output=dialog.locator('[data-settings-export]');
  if(await dialog.locator('#advanced-export').getAttribute('open')===null)await dialog.locator('#advanced-export > summary').click();
  await dialog.getByLabel('Card name',{exact:true}).fill('Manual export draft');
  await dialog.getByLabel('Card name',{exact:true}).press('Tab');
  await expect(output).not.toBeVisible();
  await dialog.getByRole('button',{name:'Copy configuration',exact:true}).click();
  if(clipboard==='delayed'){
    await dialog.getByLabel('Card name',{exact:true}).fill('Latest export draft');
    await dialog.getByLabel('Card name',{exact:true}).press('Tab');
    await dialog.locator('#advanced-export > summary').click();
    await page.evaluate(()=>window.rejectClipboard(Error('Clipboard denied')));
  }
  await expect(output).toBeVisible();await expect(output).toBeFocused();
  expect(await output.evaluate(node=>[node.selectionStart,node.selectionEnd])).toEqual([0,(await output.inputValue()).length]);
  expect(JSON.parse(await output.inputValue()).type).toBe('custom:thermal-intelligence-thermostat');
  expect(JSON.parse(await output.inputValue()).name).toBe(clipboard==='delayed'?'Latest export draft':'Manual export draft');
  await page.keyboard.press('Escape');
  expect(await page.evaluate(()=>fixture.config)).toEqual(saved);
  expect(await page.evaluate(()=>fixture.calls)).toEqual([]);
});
for(const reopen of [false,true])test(`late settings copy failure leaves ${reopen?'reopened settings':'another dialog'} unchanged`,async({page})=>{
  await page.evaluate(()=>Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:()=>new Promise((resolve,reject)=>{window.rejectClipboard=reject;})}}));
  await card(page).locator('[data-expand]').click();await card(page).locator('[data-icon-settings]').click();await card(page).getByRole('button',{name:'Advanced configuration and export',exact:true}).click();
  if(await card(page).getByRole('dialog').locator('#advanced-export').getAttribute('open')===null)await card(page).getByRole('dialog').locator('#advanced-export > summary').click();
  await card(page).getByRole('dialog').getByRole('button',{name:'Copy configuration',exact:true}).click();
  await page.keyboard.press('Escape');
  if(reopen){await card(page).locator('[data-icon-settings]').click();await card(page).getByRole('button',{name:'Advanced configuration and export',exact:true}).click();}
  else await card(page).locator('[data-telemetry-topic="humidity"]').first().click();
  const dialog=card(page).getByRole('dialog'),before=await dialog.innerHTML();
  await page.evaluate(async()=>{window.rejectClipboard(Error('Clipboard denied'));await new Promise(resolve=>setTimeout(resolve,0));});
  expect(await dialog.innerHTML()).toBe(before);
  expect(await page.evaluate(()=>fixture.calls)).toEqual([]);
});
test('button press is visible; provider selection and uncertain transport remain distinct',async({page})=>{
  await card(page).locator('[data-expand]').click();
  const plus=card(page).locator('[data-delta="1"]');
  const old=await plus.evaluate(node=>getComputedStyle(node).backgroundColor);
  const rect=await plus.boundingBox();await page.mouse.move(rect.x+rect.width/2,rect.y+rect.height/2);await page.mouse.down();
  await expect.poll(()=>plus.evaluate(node=>getComputedStyle(node).backgroundColor)).not.toBe(old);
  expect(await page.evaluate(()=>fixture.calls)).toEqual([]);
  await page.mouse.move(0,0);await page.mouse.up();
  await page.evaluate(()=>{fixture.behavior='pending';});
  const comfort=card(page).locator('[data-preset="comfort"]');
  await comfort.focus();await comfort.press('Enter');
  await expect(comfort).toHaveAttribute('aria-pressed','false');
  await expect(card(page).getByRole('status')).toContainText('Requesting');
  await expect(card(page).locator('[data-request-status]')).toBeHidden();
  await expect(card(page).locator('.targets')).toHaveAttribute('aria-busy','true');
  await page.evaluate(()=>{fixture.cards[0]._coordinator.cancel('Outcome uncertain.');fixture.cards[0].render();});
  await expect(card(page).locator('.targets')).toHaveAttribute('aria-busy','false');
  await expect(card(page).locator('[data-request-status]')).toContainText('uncertain');
  expect(await page.evaluate(()=>fixture.calls.length)).toBe(1);
});
for(const width of [390,768,1440])test(`editor and dialogs fit ${width}px with reduced motion`,async({page},info)=>{
  await page.setViewportSize({width,height:1000});await page.emulateMedia({reducedMotion:'reduce'});
  await section(page,'sources');await section(page,'humidity');
  expect(await editor(page).evaluate(node=>node.shadowRoot.querySelector('form').scrollWidth<=node.clientWidth+1)).toBe(true);
  await editor(page).screenshot({path:info.outputPath('editor.png')});
  await card(page).locator('[data-telemetry-topic="humidity"]').first().click();
  const dialog=card(page).getByRole('dialog');
  await expect(dialog.locator('#humidity-advanced')).not.toHaveAttribute('open');
  await expect(dialog).toContainText('Saved display guide');
  expect(await dialog.evaluate(node=>node.scrollWidth<=node.clientWidth+1)).toBe(true);
  await dialog.screenshot({path:info.outputPath('humidity.png')});
  expect(await page.evaluate(()=>fixture.calls)).toEqual([]);
});


test('ordinary hass updates leave a pending source lookup intact',async({page})=>{
  await registryFixture(page);
  await page.evaluate(()=>{fixture.hass.callWS=()=>new Promise(resolve=>{window.finishRegistry=resolve;});fixture.refresh();});
  await editor(page).getByRole('button',{name:'Find VT sources'}).click();
  await page.evaluate(()=>{fixture.hass={...fixture.hass};fixture.refresh();finishRegistry(sourceRegistry);});
  await expect(editor(page)).toContainText('Review each source before adding it');
  await expect(editor(page).getByRole('button',{name:'Use this source'}).first()).toBeEnabled();
  expect(await page.evaluate(()=>fixture.config.telemetry)).toEqual([]);
});

test('reusing both entity IDs for a different VT requires a fresh review',async({page})=>{
  await registryFixture(page);
  await editor(page).getByRole('button',{name:'Find VT sources'}).click();
  await page.evaluate(()=>{for(const [index,row] of sourceRegistry.entries()) Object.assign(row,{id:'new-'+index,config_entry_id:'new-entry',device_id:'new-device',unique_id:index?'New name_temperature_slope':'new-entry'});});
  await editor(page).getByRole('button',{name:'Use this source'}).first().click();
  await expect(editor(page)).toContainText('no longer available');
  expect(await page.evaluate(()=>fixture.config.telemetry)).toEqual([]);
});

for(const change of ['disconnect','user','socket','detach'])test(`pending adoption is discarded on ${change}`,async({page})=>{
  await registryFixture(page);
  await editor(page).getByRole('button',{name:'Find VT sources'}).click();
  await page.evaluate(()=>{fixture.hass.callWS=()=>new Promise(resolve=>{window.finishRegistry=resolve;});});
  await editor(page).getByRole('button',{name:'Use this source'}).first().click();
  await page.evaluate(change=>{
    if(change==='detach')fixture.editor.remove();
    else {
      if(change==='disconnect')fixture.hass.connected=false;
      if(change==='user')fixture.hass={...fixture.hass,user:{id:'another-user'}};
      if(change==='socket')fixture.hass.connection.socket={};
      fixture.refresh();
    }
    finishRegistry(sourceRegistry);
  },change);
  await page.waitForTimeout(20);
  expect(await page.evaluate(()=>fixture.config.telemetry)).toEqual([]);
  expect(await page.evaluate(()=>fixture.calls)).toEqual([]);
});

for(const configured of [false,true])test(`editor withholds unverified VT feature interpretation then shows configured=${configured}`,async({page})=>{
  await registryFixture(page);
  await page.evaluate(configured=>{
    fixture.configure({...fixture.config,adapter:'auto',telemetry:[{kind:'window',entity:fixture.config.entity,attribute:'window_manager.window_state'}]});
    fixture.editor.setConfig(fixture.config);
    Object.assign(fixture.hass.states[fixture.config.entity].attributes,{is_window_configured:configured,window_manager:{window_state:'on',window_sensor_entity_id:'binary_sensor.missing'}});
    fixture.refresh();
  },configured);
  await section(page,'sources');
  const row=editor(page).locator('[data-reading-preview] .reading-preview').filter({hasText:'window_manager.window_state'});
  await expect(row).toHaveAttribute('data-status','unknown');
  await expect(row).toContainText('Provider identity has not been checked');
  await editor(page).getByRole('button',{name:'Find VT sources'}).click();
  await expect(row).toHaveAttribute('data-status',configured?'unavailable':'disabled');
  await expect(row.locator('ha-icon')).toHaveAttribute('icon',/mdi:/);
});

test('humidity saved guide stays fixed while the advanced draft changes',async({page})=>{
  await card(page).locator('[data-telemetry-topic="humidity"]').first().click();
  const dialog=card(page).getByRole('dialog');
  await expect(dialog.locator('.saved-guide')).toContainText('Good 40–60%');
  await dialog.locator('#humidity-advanced > summary').click();
  await dialog.locator('[data-number="good_max"]').fill('45');
  await dialog.locator('[data-number="good_max"]').press('Tab');
  await expect(dialog.locator('.preview')).toContainText('High humidity');
  await expect(dialog.locator('.saved-guide')).toContainText('48 % · Good range');
  await expect(dialog.locator('.saved-guide')).toContainText('Good 40–60%');
  expect(await page.evaluate(()=>fixture.config.humidity_bands)).toBeUndefined();
  expect(await page.evaluate(()=>fixture.calls)).toEqual([]);
});

test('editor action activation feedback clears without a device request',async({page})=>{
  await registryFixture(page);
  await page.evaluate(()=>{fixture.hass.callWS=()=>new Promise(()=>{});});
  const button=editor(page).getByRole('button',{name:'Find VT sources'});
  await button.click();
  // The action rerenders its own status; use a stable draft action for feedback lifetime.
  await section(page,'mapped-control');
  const enroll=editor(page).getByRole('button',{name:'Enable selected switch control'});
  await enroll.click();
  await expect(enroll).toHaveAttribute('data-activated','');
  await expect(enroll).not.toHaveAttribute('data-activated','',{timeout:1500});
  expect(await page.evaluate(()=>fixture.calls)).toEqual([]);
});


for(const activation of ['pointer','keyboard'])test(`inventory refresh does not swallow ${activation} enrollment`,async({page})=>{
  await page.evaluate(()=>{fixture.hass.states['switch.example']={state:'off',attributes:{friendly_name:'Example switch'}};fixture.refresh();});
  await section(page,'mapped-control');
  await editor(page).getByLabel('Switch entity',{exact:true}).selectOption('switch.example');
  const search=editor(page).getByRole('searchbox',{name:'Search switches'});
  await search.fill('example');
  await page.evaluate(()=>{fixture.hass.states['switch.added']={state:'off',attributes:{friendly_name:'Added switch'}};fixture.refresh();});
  const button=editor(page).getByRole('button',{name:'Enable selected switch control'});
  if(activation==='pointer')await button.click({delay:150});
  else { await button.focus();await button.press('Enter'); }
  expect(await page.evaluate(()=>fixture.events.length)).toBe(1);
  expect(await page.evaluate(()=>fixture.config.mapped_controls.items[0].entity)).toBe('switch.example');
  expect(await page.evaluate(()=>fixture.calls)).toEqual([]);
});

test('inventory refresh preserves disclosure clicks and live search without replacing the focused input',async({page})=>{
  await section(page,'mapped-control');
  const search=editor(page).getByRole('searchbox',{name:'Search switches'});
  await search.focus();
  await page.evaluate(()=>{window.searchNode=fixture.editor.shadowRoot.activeElement;fixture.hass.states['switch.added']={state:'off',attributes:{friendly_name:'Added switch'}};fixture.refresh();});
  await search.fill('added');
  await expect(editor(page).getByLabel('Switch entity',{exact:true}).locator('option[value="switch.added"]')).toHaveCount(1);
  expect(await search.evaluate(node=>node===window.searchNode)).toBe(true);
  const humidity=editor(page).locator('[data-section="humidity"]');
  await humidity.locator(':scope > summary').click({delay:150});
  await expect(humidity).toHaveAttribute('open','');
  expect(await page.evaluate(()=>fixture.events)).toEqual([]);
});

for(const state of ['disconnected','invalid','stale'])test(`unverified preview preserves ${state} evidence`,async({page})=>{
  await registryFixture(page);
  await page.evaluate(state=>{
    const entity=fixture.config.entity, attributes=fixture.hass.states[entity].attributes;
    attributes.window_manager={window_state:state==='invalid'?'unrecognised':'on'};
    fixture.hass.states[entity].last_updated='2020-01-01T00:00:00Z';
    fixture.configure({...fixture.config,adapter:'auto',telemetry:[{kind:'window',entity,attribute:'window_manager.window_state',...(state==='stale'?{max_age_seconds:1}:{})}]});
    fixture.editor.setConfig(fixture.config);
    if(state==='disconnected')fixture.hass.connected=false;
    fixture.refresh();
  },state);
  await section(page,'sources');
  const row=editor(page).locator('[data-reading-preview] .reading-preview').filter({hasText:'window_manager.window_state'});
  await expect(row).toHaveAttribute('data-status',state==='disconnected'?'unavailable':state);
});

test('a dashboard-style host can cancel or save one card draft without commands',async({page})=>{
  await page.evaluate(()=>{
    fixture.addCard({...fixture.config,name:'Second card'});
    window.hostSaved=structuredClone(fixture.config);
    window.hostDraft=null;
    window.hostEditor=document.createElement('thermal-intelligence-beta-card-editor');
    hostEditor.id='host-editor';hostEditor.setConfig(hostSaved);hostEditor.hass=fixture.hass;
    hostEditor.addEventListener('config-changed',event=>{window.hostDraft=event.detail.config;});
    document.body.append(hostEditor);
  });
  const host=page.locator('#host-editor');
  await host.getByLabel('Card name',{exact:true}).fill('Cancelled draft');
  await host.getByLabel('Card name',{exact:true}).press('Tab');
  expect(await page.evaluate(()=>fixture.config.name)).toBeUndefined();
  await page.evaluate(()=>{
    hostEditor.remove();window.hostDraft=null;
    window.hostEditor=document.createElement('thermal-intelligence-beta-card-editor');
    hostEditor.id='host-editor';hostEditor.setConfig(hostSaved);hostEditor.hass=fixture.hass;
    hostEditor.addEventListener('config-changed',event=>{window.hostDraft=event.detail.config;});
    document.body.append(hostEditor);
  });
  await expect(host.getByLabel('Card name',{exact:true})).toHaveValue('');
  await host.getByLabel('Card name',{exact:true}).fill('Saved draft');
  await host.getByLabel('Card name',{exact:true}).press('Tab');
  await page.evaluate(()=>{fixture.configure(hostDraft);hostEditor.remove();});
  await expect(card(page)).toContainText('Saved draft');
  await expect(page.locator('thermal-intelligence-beta-card').nth(1)).toContainText('Second card');
  expect(await page.evaluate(()=>fixture.calls)).toEqual([]);
});

test('outside choices track unit eligibility and deferred inventory appears after blur',async({page})=>{
  await section(page,'sources');
  const select=editor(page).locator('[data-field="outside.entity"]');
  const option=select.locator('option[value="sensor.garden"]');
  await page.evaluate(()=>fixture.editor.shadowRoot.activeElement?.blur());
  async function report(unit) {
    await page.evaluate(unit=>{
      fixture.hass.states['sensor.garden']={state:'18',attributes:{friendly_name:'Garden',unit_of_measurement:unit}};
      fixture.refresh();
    },unit);
  }
  await report('%');await expect(option).toHaveCount(0);
  await report('°C');await expect(option).toHaveCount(1);
  await select.selectOption('sensor.garden');
  await report('°F');await expect(select).toHaveValue('sensor.garden');
  await select.focus();await report('%');
  await select.evaluate(node=>node.blur());
  await expect(option).toHaveCount(0);
  await expect(editor(page).getByRole('button',{name:'Add outside reading'})).toBeDisabled();
  expect(await page.evaluate(()=>fixture.calls)).toEqual([]);
});

for(const surface of ['editor','dialog'])test(`adjacent humidity thumbs can each be selected by touch in the ${surface}`,async({browser})=>{
  const page=await browser.newPage({viewport:{width:390,height:844},hasTouch:true,isMobile:true});
  try {
    await page.goto('/');
    await page.evaluate(()=>fixture.reset('standard',{humidity_bands:{dry_below:40,good_min:41,good_max:42,wet_above:43}}));
    let bar;
    if(surface==='editor'){
      await section(page,'humidity');bar=editor(page).locator('[data-humidity-preview] .bar');
    } else {
      await card(page).locator('[data-telemetry-topic="humidity"]').click();
      await card(page).locator('#humidity-advanced summary').click();
      bar=card(page).locator('dialog .bar');
    }
    await bar.scrollIntoViewIfNeeded();
    const rect=await bar.boundingBox();
    const x=percent=>rect.x+11+(rect.width-22)*percent/100,y=rect.y+rect.height/2;
    const inputs=bar.getByRole('slider');
    for(const [index,value] of [40,41,42,43].entries()){
      await page.touchscreen.tap(x(value),y);
      await expect(inputs.nth(index)).toBeFocused();
    }
    const touch=await page.context().newCDPSession(page);
    const expected=[40,41,42,43];
    for(const [index,to] of [30,35,37,50].entries()){
      const from=expected[index];
      await touch.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:x(from),y}]});
      await touch.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x(to),y}]});
      await touch.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
      expected[index]=to;
      await expect.poll(()=>inputs.evaluateAll(nodes=>nodes.map(node=>node.valueAsNumber))).toEqual(expected);
    }
    expect(await page.evaluate(()=>fixture.calls)).toEqual([]);
  } finally {await page.close();}
});
