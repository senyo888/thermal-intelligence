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
test('runtime copy retains display-only draft and unknown fields without changing either card',async({page})=>{
  await setup(page);const before=await page.evaluate(()=>structuredClone(savedDashboard));
  await page.evaluate(()=>Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async text=>{window.copiedIcons=text;}}}));
  await open(page);const primary=dialog(page).getByRole('group',{name:'Primary icons'});
  await primary.getByRole('checkbox',{name:'Show Valve',exact:true}).uncheck();
  await dialog(page).getByRole('checkbox',{name:'Show Estimated energy',exact:true}).check();
  await dialog(page).getByRole('button',{name:'Reorder Estimated energy',exact:true}).focus();await page.keyboard.press('ArrowUp');
  await expect(dialog(page).getByRole('button',{name:'Reorder Estimated energy',exact:true})).toBeFocused();
  await dialog(page).getByRole('button',{name:'Copy configuration',exact:true}).click();
  await expect(dialog(page)).toContainText('Configuration copied');
  const copied=await page.evaluate(()=>JSON.parse(copiedIcons));expect(copied.vt_telemetry).toEqual(['energy']);expect(copied.future).toEqual({keep:['unchanged']});expect(copied.header_icons.future).toBe('preserve');
  expect(await page.evaluate(()=>savedDashboard)).toEqual(before);expect(await page.evaluate(()=>dashboardCalls)).toEqual([]);expect(await page.evaluate(()=>fixture.calls)).toEqual([]);
  await expect(card(page).locator('[data-header-telemetry]')).not.toContainText('2.5 kWh');
});
test('boundary arrow moves retain focus in the popup and HA editor; hidden readings keep expanded details',async({page})=>{
  await setup(page);await open(page);
  await expect(dialog(page).getByRole('button',{name:'Close icon settings',exact:true})).toBeFocused();
  await dialog(page).getByRole('group',{name:'Primary icons'}).getByRole('checkbox',{name:'Show Valve',exact:true}).uncheck();
  await dialog(page).getByRole('button',{name:'Move Estimated energy up',exact:true}).click();
  await expect(dialog(page).getByRole('button',{name:'Reorder Estimated energy',exact:true})).toBeFocused();
  await page.evaluate(()=>{const c=fixture.cards[0],draft=structuredClone(c._iconSettings.draft);c.setConfig(draft);});
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
for(const mode of ['duplicate','stale'])test(`${mode} saved copies cannot turn runtime drafts into dashboard writes`,async({page})=>{
  await setup(page,{duplicate:true});
  if(mode==='stale')await page.evaluate(()=>{savedDashboard.views[0].cards[0].name='Changed elsewhere';});
  const before=await page.evaluate(()=>structuredClone(savedDashboard));
  await page.evaluate(()=>Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async()=>{throw Error('Denied');}}}));
  await open(page);await dialog(page).getByRole('checkbox',{name:'Show Estimated energy',exact:true}).check();
  await dialog(page).getByRole('button',{name:'Copy configuration',exact:true}).click();
  await expect(dialog(page).getByLabel('Draft icon configuration')).toHaveValue(/"energy"/);
  await expect(dialog(page).getByLabel('Draft icon configuration')).toBeFocused();
  expect(await page.evaluate(()=>savedDashboard)).toEqual(before);expect(await page.evaluate(()=>dashboardCalls)).toEqual([]);expect(await page.evaluate(()=>fixture.calls)).toEqual([]);
});
test('late clipboard failure cannot reopen or change a reselected card',async({page})=>{
  await setup(page);await page.evaluate(()=>Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:()=>new Promise((resolve,reject)=>{window.rejectIconCopy=reject;})}}));
  await open(page);await dialog(page).getByRole('checkbox',{name:'Show Estimated energy',exact:true}).check();
  await dialog(page).getByRole('button',{name:'Copy configuration',exact:true}).click();
  await page.evaluate(()=>{fixture.cards[0].setConfig({...fixture.config,entity:'climate.fixture_secondary'});rejectIconCopy(Error('Denied'));});
  await expect(dialog(page)).toHaveCount(0);expect(await page.evaluate(()=>fixture.cards[0].config.entity)).toBe('climate.fixture_secondary');
  expect(await page.evaluate(()=>fixture.cards[0].config.vt_telemetry)).toBeUndefined();expect(await page.evaluate(()=>dashboardCalls)).toEqual([]);expect(await page.evaluate(()=>fixture.calls)).toEqual([]);
});
test('add reading remains a draft; accepted editor configuration exposes VT details without commands',async({page})=>{
  await setup(page);await open(page);await dialog(page).getByText('Add reading',{exact:true}).click();
  await dialog(page).getByLabel('Entity',{exact:true}).fill('sensor.fixture_valve');await dialog(page).getByLabel('Label (optional)',{exact:true}).fill('Reported valve');
  await dialog(page).getByRole('button',{name:'Add to draft',exact:true}).click();await expect(dialog(page).getByLabel('Draft top row preview')).toContainText('Reported valve');
  expect(await page.evaluate(()=>savedDashboard.views[0].cards[0].features)).toBeUndefined();
  await dialog(page).getByRole('checkbox',{name:'Show Automatic window detection',exact:true}).check();
  await page.evaluate(()=>{const c=fixture.cards[0],draft=structuredClone(c._iconSettings.draft);c.setConfig(draft);});
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

test('HA editor emits icon choices through the native card editing contract',async({page})=>{
  await setup(page);await page.evaluate(()=>fixture.editor.setConfig({...fixture.config,adapter:'vtherm'}));const editor=page.locator('#editor thermal-intelligence-beta-card-editor');
  await editor.locator('[data-section="sources"] > summary').click();await editor.locator('[data-section="header-icons"] > summary').click();
  await editor.getByRole('checkbox',{name:'Show Estimated energy',exact:true}).check();
  await expect(card(page).locator('[data-header-telemetry]')).toContainText('≈ 2.5 kWh');
  expect(await page.evaluate(()=>fixture.events.at(-1).vt_telemetry)).toEqual(['energy']);
  expect(await page.evaluate(()=>fixture.events.at(-1).future)).toEqual({keep:['unchanged']});
  expect(await page.evaluate(()=>dashboardCalls)).toEqual([]);expect(await page.evaluate(()=>fixture.calls)).toEqual([]);
});
for(const mode of ['absent','delayed'])test(`icon export preserves the latest draft with ${mode} clipboard`,async({page})=>{
  await setup(page);await page.evaluate(mode=>Object.defineProperty(navigator,'clipboard',{configurable:true,value:mode==='absent'?undefined:{writeText:()=>new Promise((resolve,reject)=>{window.rejectIconCopy=reject;})}}),mode);
  await open(page);await dialog(page).getByRole('checkbox',{name:'Show Estimated energy',exact:true}).check();await dialog(page).getByRole('button',{name:'Copy configuration',exact:true}).click();
  if(mode==='delayed'){await dialog(page).getByRole('checkbox',{name:'Show Estimated mean power',exact:true}).check();await page.evaluate(()=>rejectIconCopy(Error('Denied')));}
  const output=dialog(page).getByLabel('Draft icon configuration');await expect(output).toBeVisible();await expect(output).toBeFocused();await expect(output).toBeInViewport({ratio:1});
  const draft=JSON.parse(await output.inputValue());expect(draft.vt_telemetry).toContain('energy');if(mode==='delayed')expect(draft.vt_telemetry).toContain('power');
  expect(await output.evaluate(node=>node.selectionStart===0&&node.selectionEnd===node.value.length)).toBe(true);
  expect(await page.evaluate(()=>dashboardCalls)).toEqual([]);expect(await page.evaluate(()=>fixture.calls)).toEqual([]);
});

test('delayed clipboard success identifies an earlier draft and later edits retire copy confirmation',async({page})=>{
  await setup(page);await page.evaluate(()=>Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:text=>new Promise(resolve=>{window.copiedIcons=text;window.resolveIconCopy=resolve;})}}));
  await open(page);await dialog(page).getByRole('checkbox',{name:'Show Estimated energy',exact:true}).check();
  await dialog(page).getByRole('button',{name:'Copy configuration',exact:true}).click();
  await dialog(page).getByRole('checkbox',{name:'Show Estimated mean power',exact:true}).check();await page.evaluate(()=>resolveIconCopy());
  await expect(dialog(page)).toContainText('Earlier draft copied');expect(await page.evaluate(()=>JSON.parse(copiedIcons).vt_telemetry)).toEqual(['energy']);
  await dialog(page).getByRole('button',{name:'Copy configuration',exact:true}).click();await page.evaluate(()=>resolveIconCopy());
  await expect(dialog(page)).toContainText('Configuration copied. Nothing has been saved yet.');await expect(dialog(page).getByRole('button',{name:'Copy configuration',exact:true})).toBeFocused();expect(await page.evaluate(()=>JSON.parse(copiedIcons).vt_telemetry)).toEqual(['energy','power']);
  await dialog(page).getByRole('checkbox',{name:'Show Estimated energy',exact:true}).uncheck();await expect(dialog(page).locator('[data-icon-status]')).toBeHidden();
  expect(await page.evaluate(()=>dashboardCalls)).toEqual([]);expect(await page.evaluate(()=>fixture.calls)).toEqual([]);
});
