// SPDX-License-Identifier: GPL-3.0-only
import {test,expect} from '@playwright/test';
const card=page=>page.locator('thermal-intelligence-beta-card').first();
const dialog=page=>card(page).getByRole('dialog');
async function setup(page,{duplicate=false}={}) {
  await page.goto('/');
  await page.evaluate(({duplicate})=>{
    fixture.reset('vt',{future:{keep:['unchanged']},header_icons:{future:'preserve'}});
    const a=fixture.hass.states[fixture.config.entity].attributes;
    Object.assign(a,{configuration:{type:'over_climate',temperature_unit:'°C'},specific_states:{last_temperature_datetime:new Date(Date.now()-300000).toISOString(),total_energy:2.5},power_manager:{energy_unit:'kWh',power_unit:'W',mean_cycle_power:200,device_power:1000},is_window_configured:false,is_window_auto_configured:true,window_manager:{window_auto_state:'on',is_window_bypass:false,window_action:'window_turn_off',window_delay_sec:30,window_off_delay_sec:60},vtherm_over_climate:{follow_underlying_temp_change:true}});
    const other={...structuredClone(fixture.config),...duplicate?{}:{name:'Independent card'}};
    window.savedDashboard={views:[{cards:[structuredClone(fixture.config),other]}],unknown:{keep:true}};
    window.dashboardCalls=[];window.saveMode='normal';
    history.replaceState(null,'','/example/0');
    fixture.hass.user.is_admin=true;fixture.hass.panels={example:{component_name:'lovelace',url_path:'example',config:{mode:'storage'}}};
    const original=fixture.hass.callWS;
    fixture.hass.callWS=async message=>{
      if(message.type==='lovelace/config'){dashboardCalls.push(structuredClone(message));return structuredClone(savedDashboard);}
      if(message.type==='lovelace/config/save'){
        dashboardCalls.push(structuredClone(message));
        if(saveMode==='reject')throw Error('Synthetic rejection');
        if(saveMode==='deferred')return new Promise(resolve=>{window.finishSave=()=>{savedDashboard=structuredClone(message.config);resolve();};});
        savedDashboard=structuredClone(message.config);return null;
      }
      return original(message);
    };
    fixture.addCard(other);fixture.refresh();
  },{duplicate});
  await expect.poll(()=>page.evaluate(()=>fixture.cards[0]._registryStatus)).toBe('verified');
}
async function open(page) {
  const expand=card(page).locator('[data-expand]');if(await expand.getAttribute('aria-expanded')!=='true')await expand.click();
  await card(page).getByRole('button',{name:'Top row icon settings',exact:true}).click();
  await expect(dialog(page)).toHaveAttribute('data-view','icons');
  await expect(dialog(page).getByText('Loading saved card…',{exact:true})).toHaveCount(0);
}
test.beforeEach(async({page})=>{page.errors=[];page.on('pageerror',error=>page.errors.push(error.message));});
test.afterEach(async({page})=>expect(page.errors).toEqual([]));

test('dedicated VT catalogue previews drafts; Cancel preserves storage and controls',async({page})=>{
  await setup(page);const before=await page.evaluate(()=>structuredClone(savedDashboard));await open(page);
  await expect(dialog(page).getByRole('group',{name:'VT readings'}).getByRole('checkbox')).toHaveCount(11);
  await dialog(page).getByRole('checkbox',{name:'Show Estimated energy',exact:true}).check();
  await expect(dialog(page).getByLabel('Draft top row preview')).toContainText('Estimated energy · ≈ 2.5 kWh');
  await expect(card(page).locator('[data-header-telemetry]')).not.toContainText('2.5 kWh');
  await dialog(page).getByRole('button',{name:'Cancel',exact:true}).click();
  expect(await page.evaluate(()=>savedDashboard)).toEqual(before);expect(await page.evaluate(()=>fixture.calls)).toEqual([]);
  await open(page);await expect(dialog(page).getByRole('checkbox',{name:'Show Estimated energy',exact:true})).not.toBeChecked();
});
test('Save icons persists exact card, display-only visibility and order; independent copy survives',async({page})=>{
  await setup(page);const other=await page.evaluate(()=>structuredClone(savedDashboard.views[0].cards[1]));await open(page);
  const primary=dialog(page).getByRole('group',{name:'Primary icons'});
  await primary.getByRole('checkbox',{name:'Show Valve',exact:true}).uncheck();
  await dialog(page).getByRole('checkbox',{name:'Show Estimated energy',exact:true}).check();
  await dialog(page).getByRole('button',{name:'Reorder Estimated energy',exact:true}).focus();await page.keyboard.press('ArrowUp');
  await expect(dialog(page).getByRole('button',{name:'Reorder Estimated energy',exact:true})).toBeFocused();
  await dialog(page).getByRole('button',{name:'Save icons',exact:true}).click();
  await expect(dialog(page)).toContainText('Icons saved for this card.');
  await expect(dialog(page).getByRole('button',{name:'Done',exact:true})).toBeFocused();
  expect(await page.evaluate(()=>dashboardCalls.filter(call=>call.type.endsWith('/save')).length)).toBe(1);
  expect(await page.evaluate(()=>savedDashboard.views[0].cards[1])).toEqual(other);
  expect(await page.evaluate(()=>savedDashboard.views[0].cards[0].future)).toEqual({keep:['unchanged']});
  expect(await page.evaluate(()=>savedDashboard.views[0].cards[0].header_icons.future)).toBe('preserve');
  expect(await page.evaluate(()=>fixture.cards[0].model().output.text)).toContain('TRV Closed');
  await dialog(page).getByRole('button',{name:'Done',exact:true}).click();
  await expect(card(page).locator('[data-header-telemetry]')).toContainText('≈ 2.5 kWh');
  await page.evaluate(()=>fixture.cards[0].setConfig(structuredClone(savedDashboard.views[0].cards[0])));await open(page);
  await expect(dialog(page).getByRole('checkbox',{name:'Show Estimated energy',exact:true})).toBeChecked();
  await expect(dialog(page).getByRole('group',{name:'Primary icons'}).getByRole('checkbox',{name:'Show Valve',exact:true})).not.toBeChecked();
  expect(await page.evaluate(()=>fixture.calls)).toEqual([]);
});
test('boundary arrow moves retain focus in the popup and HA editor; hidden readings keep expanded details',async({page})=>{
  await setup(page);await open(page);
  await expect(dialog(page).getByRole('button',{name:'Close icon settings',exact:true})).toBeFocused();
  await dialog(page).getByRole('group',{name:'Primary icons'}).getByRole('checkbox',{name:'Show Valve',exact:true}).uncheck();
  await dialog(page).getByRole('button',{name:'Move Estimated energy up',exact:true}).click();
  await expect(dialog(page).getByRole('button',{name:'Reorder Estimated energy',exact:true})).toBeFocused();
  await dialog(page).getByRole('button',{name:'Save icons',exact:true}).click();await expect(dialog(page)).toContainText('Icons saved');await dialog(page).getByRole('button',{name:'Done',exact:true}).click();
  await expect(card(page).locator('[data-focus^="info-"]').filter({hasText:'Valve'})).toBeVisible();
  await page.evaluate(()=>{fixture.editor.setConfig({...fixture.cards[0].config,adapter:'vtherm'});});
  const editor=page.locator('#editor thermal-intelligence-beta-card-editor');
  await editor.locator('[data-section="sources"] > summary').click();await editor.locator('[data-section="header-icons"] > summary').click();
  await editor.getByRole('button',{name:'Move Room temperature last received up',exact:true}).click();
  await expect(editor.getByRole('button',{name:'Reorder Room temperature last received',exact:true})).toBeFocused();
  expect(await page.evaluate(()=>fixture.calls)).toEqual([]);
});
test('drag ordering and live updates retain selected draft, control identity and focus',async({page})=>{
  await setup(page);await open(page);
  const checkbox=dialog(page).getByRole('checkbox',{name:'Show Follow underlying target',exact:true});await checkbox.check();
  await checkbox.focus();await checkbox.evaluate(node=>window.focusedIconInput=node);
  await page.evaluate(()=>{fixture.hass.states[fixture.config.entity].attributes.vtherm_over_climate.follow_underlying_temp_change=false;fixture.refresh();});
  await expect(checkbox).toBeFocused();expect(await checkbox.evaluate(node=>node===window.focusedIconInput)).toBe(true);await expect(checkbox).toBeChecked();
  const group=dialog(page).getByRole('group',{name:'VT readings'}),grip=group.getByRole('button',{name:'Reorder Estimated mean power',exact:true});
  await grip.scrollIntoViewIfNeeded();const box=await grip.boundingBox(),destination=await group.getByRole('button',{name:'Reorder Estimated energy',exact:true}).boundingBox();
  await page.mouse.move(box.x+box.width/2,box.y+box.height/2);await page.mouse.down();await page.mouse.move(destination.x+destination.width/2,destination.y+3,{steps:5});await page.mouse.up();
  const order=await group.locator('[data-icon-row]').evaluateAll(nodes=>nodes.map(node=>node.dataset.iconRow));expect(order.indexOf('vt:power')).toBeLessThan(order.indexOf('vt:energy'));
  expect(await page.evaluate(()=>fixture.calls)).toEqual([]);
});
test('ambiguous card and dashboard conflict keep honest editor/export fallback with no write',async({page})=>{
  await setup(page,{duplicate:true});await open(page);await expect(dialog(page)).toContainText('More than one saved card matches');
  await dialog(page).getByRole('checkbox',{name:'Show Estimated energy',exact:true}).check();await expect(dialog(page).getByRole('button',{name:'Save icons',exact:true})).toBeDisabled();
  await dialog(page).getByRole('button',{name:'Advanced configuration and export',exact:true}).click();
  await expect(dialog(page).locator('[data-settings-export]')).toHaveValue(/"energy"/);
  await page.keyboard.press('Escape');
  await page.evaluate(()=>{savedDashboard.views[0].cards[1].name='Different';});await open(page);
  await dialog(page).getByRole('checkbox',{name:'Show Estimated energy',exact:true}).check();await page.evaluate(()=>{savedDashboard.unknown.concurrent='keep';});
  await dialog(page).getByRole('button',{name:'Save icons',exact:true}).click();await expect(dialog(page)).toContainText('dashboard changed');
  expect(await page.evaluate(()=>dashboardCalls.filter(call=>call.type.endsWith('/save')).length)).toBe(0);expect(await page.evaluate(()=>fixture.calls)).toEqual([]);
});
test('late save after card reselection cannot apply returned config or replay',async({page})=>{
  await setup(page);await open(page);await dialog(page).getByRole('checkbox',{name:'Show Estimated energy',exact:true}).check();
  await page.evaluate(()=>window.saveMode='deferred');await dialog(page).getByRole('button',{name:'Save icons',exact:true}).click();await expect.poll(()=>page.evaluate(()=>typeof finishSave)).toBe('function');
  await page.evaluate(()=>{fixture.cards[0].setConfig({...fixture.config,entity:'climate.fixture_secondary'});finishSave();});
  await expect(dialog(page)).toHaveCount(0);expect(await page.evaluate(()=>fixture.cards[0].config.entity)).toBe('climate.fixture_secondary');
  expect(await page.evaluate(()=>fixture.cards[0].config.vt_telemetry)).toBeUndefined();expect(await page.evaluate(()=>dashboardCalls.filter(call=>call.type.endsWith('/save')).length)).toBe(1);expect(await page.evaluate(()=>fixture.calls)).toEqual([]);
});
test('add reading is draft-only until verified save; VT details and device link send no commands',async({page})=>{
  await setup(page);await open(page);await dialog(page).getByText('Add reading',{exact:true}).click();
  await dialog(page).getByLabel('Entity',{exact:true}).fill('sensor.fixture_valve');await dialog(page).getByLabel('Label (optional)',{exact:true}).fill('Reported valve');
  await dialog(page).getByRole('button',{name:'Add to draft',exact:true}).click();await expect(dialog(page).getByLabel('Draft top row preview')).toContainText('Reported valve');
  expect(await page.evaluate(()=>savedDashboard.views[0].cards[0].features)).toBeUndefined();
  await dialog(page).getByRole('checkbox',{name:'Show Automatic window detection',exact:true}).check();await dialog(page).getByRole('button',{name:'Save icons',exact:true}).click();
  await expect(dialog(page)).toContainText('Icons saved');await dialog(page).getByRole('button',{name:'Done',exact:true}).click();
  await card(page).locator('[data-telemetry-key="vt:window_auto"]').click();await expect(dialog(page)).toContainText('Open delay');await expect(dialog(page)).toContainText('30 s');
  await page.keyboard.press('Escape');await open(page);
  await page.evaluate(()=>fixture.cards[0].addEventListener('hass-more-info',event=>{window.moreInfoEntity=event.detail.entityId;}));
  await dialog(page).getByRole('button',{name:'Open VT device settings',exact:true}).click();expect(await page.evaluate(()=>moreInfoEntity)).toBe('climate.fixture_thermostat');
  expect(await page.evaluate(()=>fixture.calls)).toEqual([]);
});
for(const width of [390,768,1440])test(`dedicated icon page fits ${width}px`,async({page},info)=>{
  await page.setViewportSize({width,height:900});await setup(page);await open(page);
  await expect(dialog(page).getByRole('button',{name:'Cancel',exact:true})).toBeInViewport();
  expect(await dialog(page).evaluate(node=>node.scrollWidth<=node.clientWidth+1)).toBe(true);
  await page.screenshot({path:info.outputPath(`icon-settings-${width}.png`),fullPage:true});
});

test('context is rechecked between verified save resolution and applying its result',async({page})=>{
  await setup(page);await open(page);
  await dialog(page).getByRole('checkbox',{name:'Show Estimated energy',exact:true}).check();
  await page.evaluate(()=>{const session=fixture.cards[0]._iconSettings.session,save=session.save.bind(session);session.save=async draft=>{const result=await save(draft);fixture.hass.connection.socket={};return result;};});
  await dialog(page).getByRole('button',{name:'Save icons',exact:true}).click();
  await expect(dialog(page)).toContainText('Icons were saved, but the card context changed');
  expect(await page.evaluate(()=>fixture.cards[0].config.vt_telemetry)).toBeUndefined();
  expect(await page.evaluate(()=>savedDashboard.views[0].cards[0].vt_telemetry)).toEqual(['energy']);
  expect(await page.evaluate(()=>dashboardCalls.filter(call=>call.type.endsWith('/save')).length)).toBe(1);expect(await page.evaluate(()=>fixture.calls)).toEqual([]);
});
