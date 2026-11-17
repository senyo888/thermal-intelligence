// SPDX-License-Identifier: GPL-3.0-only
import {test,expect} from '@playwright/test';
const card=page=>page.locator('thermal-intelligence-beta-card').first();
const dialog=page=>card(page).getByRole('dialog');
async function setup(page,scenario='vt') {
  await page.goto('/');await page.evaluate(scenario=>{
    fixture.reset(scenario,{vt_telemetry:scenario==='vt'?['external_temperature','auto_start_stop']:[]});
    const attrs=fixture.hass.states[fixture.config.entity].attributes;
    Object.assign(attrs,{preset_modes:['none','frost','eco','comfort','boost'],preset_mode:'comfort',configuration:{type:'over_climate',temperature_unit:'°C',have_valve_regulation:false},specific_states:{ext_current_temperature:-2,last_ext_temperature_datetime:'2026-11-17T10:00:00Z'},is_auto_start_stop_configured:true,auto_start_stop_manager:{auto_start_stop_enable:false,is_auto_stop_detected:false},is_lock_configured:false});
    window.nativeDetails=[];fixture.cards[0].addEventListener('hass-more-info',event=>nativeDetails.push(event.detail));
    fixture.refresh();
  },scenario);
  await expect.poll(()=>page.evaluate(()=>fixture.cards[0]._registryStatus)).toBe('verified');
}
test.beforeEach(async({page})=>{page.errors=[];page.on('pageerror',error=>page.errors.push(error.message));});
test.afterEach(async({page})=>expect(page.errors).toEqual([]));
test('provider preset indicator changes only with provider state and keeps House and schedule distinct',async({page})=>{
  await setup(page);await page.evaluate(()=>{
    Object.assign(fixture.hass.states,{'sensor.example_owner':{state:'Manual',attributes:{climate_entity:fixture.config.entity,intent_ready:true}},'sensor.example_policy':{state:'Eco',attributes:{}},'schedule.example':{state:'on',attributes:{}}});
    fixture.configure({...fixture.config,control_source:{entity:'sensor.example_owner',climate_attribute:'climate_entity',ready_attribute:'intent_ready'},house_preset:{entity:'sensor.example_policy'},schedule:{entity:'schedule.example'}});fixture.refresh();
  });
  const header=card(page).locator('[data-header-telemetry]');
  await expect(header.locator('[data-telemetry-key="preset:comfort"]')).toContainText('VTComfort');
  await expect(header.locator('[data-telemetry-key="control:house"]')).toContainText('HouseEco');
  await expect(header.locator('[data-telemetry-key="control:ownership"]')).toContainText('Manual');
  await expect(header.locator('[data-telemetry-key="control:schedule"]')).toContainText('Active');
  await page.evaluate(()=>{fixture.hass.states['sensor.example_owner'].attributes.intent_ready=false;fixture.hass.states[fixture.config.entity].attributes.preset_mode='none';fixture.refresh();});
  await expect(header.locator('[data-telemetry-key^="preset:"]')).toHaveCount(0);await expect(header.locator('[data-telemetry-key="control:ownership"]')).toContainText('Unknown');
  expect(await page.evaluate(()=>fixture.calls)).toEqual([]);
});
test('manual hand requires observation and retires on contrary preset without revival',async({page})=>{
  await setup(page,'standard');await page.evaluate(()=>{fixture.behavior='pending';});
  const hand=card(page).locator('[data-header-telemetry] [data-telemetry-key="control:manual_adjustment"]');
  await expect(hand).toHaveCount(0);await card(page).getByRole('button',{name:'Increase temperature',exact:true}).click();await expect(hand).toHaveCount(0);
  await page.evaluate(()=>fixture.pending[0].resolve());await expect(hand).toHaveCount(0);
  await page.evaluate(()=>fixture.apply(fixture.calls[0]));await expect(hand).toBeVisible();await expect(hand).toContainText('Manual input');
  await page.evaluate(()=>{fixture.hass.states[fixture.config.entity].attributes.preset_mode='eco';fixture.refresh();});await expect(hand).toHaveCount(0);
  await page.evaluate(()=>{fixture.hass.states[fixture.config.entity].attributes.preset_mode='comfort';fixture.refresh();});await expect(hand).toHaveCount(0);
  expect(await page.evaluate(()=>fixture.calls.length)).toBe(1);
});
test('native auto start/stop navigation verifies registry identity and never calls a service',async({page})=>{
  await setup(page);await page.evaluate(()=>{
    const base={platform:'versatile_thermostat',device_id:'example-device',config_entry_id:'example-entry',disabled_by:null,hidden_by:null};
    const registry=[{...base,entity_id:fixture.config.entity},{...base,entity_id:'switch.renamed_feature',unique_id:'Example_enable_auto_start_stop'}];
    const original=fixture.hass.callWS;fixture.hass.callWS=async message=>message.type==='config/entity_registry/list'?registry:original(message);
    fixture.hass.states['switch.renamed_feature']={entity_id:'switch.renamed_feature',state:'off',attributes:{}};fixture.refresh();
  });
  await card(page).locator('[data-header-telemetry] [data-telemetry-key="vt:auto_start_stop"]').click();await expect(dialog(page)).toContainText('Disabled');
  await dialog(page).getByRole('button',{name:'Open VT auto start/stop controls'}).click();
  await expect.poll(()=>page.evaluate(()=>nativeDetails)).toEqual([{entityId:'switch.renamed_feature'}]);expect(await page.evaluate(()=>fixture.calls)).toEqual([]);
});
test('late feature registry reply cannot open controls after target or session changes',async({page})=>{
  await setup(page);await page.evaluate(()=>{fixture.hass.callWS=message=>message.type==='config/entity_registry/list'?new Promise(resolve=>{window.finishFeatureLookup=resolve;}):Promise.resolve({entity_id:message.entity_id,platform:'versatile_thermostat'});fixture.refresh();});
  await card(page).locator('[data-header-telemetry] [data-telemetry-key="vt:auto_start_stop"]').click();await dialog(page).getByRole('button',{name:'Open VT auto start/stop controls'}).click();
  await page.evaluate(()=>{fixture.configure({...fixture.config,entity:'climate.fixture_secondary'});finishFeatureLookup([]);});
  await expect(dialog(page)).toHaveCount(0);expect(await page.evaluate(()=>nativeDetails)).toEqual([]);expect(await page.evaluate(()=>fixture.calls)).toEqual([]);
});
test('hidden readings remain reachable and disclosure focus survives new observations',async({page})=>{
  await setup(page);await card(page).locator('[data-expand]').click();await card(page).getByRole('button',{name:'Readings',exact:true}).click();
  const summary=dialog(page).locator('summary').filter({hasText:'VT outside temperature'});await summary.click();await summary.focus();
  await page.evaluate(()=>{fixture.hass.states[fixture.config.entity].attributes.specific_states.ext_current_temperature=-3;fixture.refresh();});
  await expect(summary).toBeFocused();await expect(summary.locator('..')).toHaveAttribute('open','');await expect(summary).toContainText('-3 °C');
  expect(await page.evaluate(()=>fixture.calls)).toEqual([]);
});
test('circled P and optional ownership mappings survive native editor round trips without control writes',async({page})=>{
  await setup(page,'standard');await expect(card(page).locator('.policy-monogram')).toHaveText('P');
  const editor=page.locator('#editor thermal-intelligence-beta-card-editor');
  await editor.locator('[data-section="control-sources"] > summary').click();
  await editor.getByLabel('Control source entity',{exact:true}).fill('sensor.owner');await editor.getByLabel('Control source entity',{exact:true}).press('Tab');
  await editor.getByLabel('Control source thermostat attribute',{exact:true}).fill('climate_entity');await editor.getByLabel('Control source thermostat attribute',{exact:true}).press('Tab');
  await editor.getByLabel('Control source readiness attribute',{exact:true}).fill('intent_ready');await editor.getByLabel('Control source readiness attribute',{exact:true}).press('Tab');
  expect(await page.evaluate(()=>fixture.config.control_source)).toEqual({entity:'sensor.owner',climate_attribute:'climate_entity',ready_attribute:'intent_ready'});
  await page.evaluate(()=>fixture.editor.setConfig(fixture.config));await expect(editor.getByLabel('Control source readiness attribute',{exact:true})).toHaveValue('intent_ready');
  const age=editor.getByLabel('Control source maximum age (seconds)',{exact:true});await age.fill('60');await age.press('Tab');
  expect(await page.evaluate(()=>fixture.config.control_source.max_age_seconds)).toBe(60);await age.fill('');await age.press('Tab');
  expect(await page.evaluate(()=>fixture.config.control_source)).toEqual({entity:'sensor.owner',climate_attribute:'climate_entity',ready_attribute:'intent_ready'});
  expect(await page.evaluate(()=>fixture.calls)).toEqual([]);
});
test('closing a pending feature lookup allows a fresh explicit lookup and ignores the old result',async({page})=>{
  await setup(page);await page.evaluate(()=>{window.featureLookups=[];const original=fixture.hass.callWS;fixture.hass.callWS=message=>message.type==='config/entity_registry/list'?new Promise(resolve=>featureLookups.push(resolve)):original(message);fixture.refresh();});
  const icon=card(page).locator('[data-header-telemetry] [data-telemetry-key="vt:auto_start_stop"]');
  await icon.click();await dialog(page).getByRole('button',{name:'Open VT auto start/stop controls'}).click();await page.keyboard.press('Escape');
  await icon.click();await dialog(page).getByRole('button',{name:'Open VT auto start/stop controls'}).click();
  expect(await page.evaluate(()=>featureLookups.length)).toBe(2);
  await page.evaluate(()=>{featureLookups[0]([]);featureLookups[1]([]);});await expect(dialog(page)).toContainText('could not be verified');
  expect(await page.evaluate(()=>nativeDetails)).toEqual([]);expect(await page.evaluate(()=>fixture.calls)).toEqual([]);
});
for(const reason of ['preview','readiness','feature'])test(`feature lookup is retired after a temporary ${reason} loss`,async({page})=>{
  await setup(page);await page.evaluate(()=>{fixture.hass.callWS=message=>message.type==='config/entity_registry/list'?new Promise(resolve=>{window.finishFeatureLookup=resolve;}):Promise.resolve({entity_id:message.entity_id,platform:'versatile_thermostat'});fixture.refresh();});
  await card(page).locator('[data-header-telemetry] [data-telemetry-key="vt:auto_start_stop"]').click();await dialog(page).getByRole('button',{name:'Open VT auto start/stop controls'}).click();
  await page.evaluate(reason=>{
    const c=fixture.cards[0],a=fixture.hass.states[fixture.config.entity].attributes;
    if(reason==='preview'){c.preview=true;c.preview=false;}
    else {const key=reason==='readiness'?'is_ready':'is_auto_start_stop_configured';a[key]=false;fixture.refresh();a[key]=true;fixture.refresh();}
    const base={platform:'versatile_thermostat',device_id:'device',config_entry_id:'entry'};
    fixture.hass.states['switch.feature']={entity_id:'switch.feature',state:'off',attributes:{}};
    finishFeatureLookup([{...base,entity_id:fixture.config.entity},{...base,entity_id:'switch.feature',unique_id:'Example_enable_auto_start_stop'}]);
  },reason);
  await expect(dialog(page)).toHaveAttribute('data-view','telemetry');expect(await page.evaluate(()=>nativeDetails)).toEqual([]);expect(await page.evaluate(()=>fixture.calls)).toEqual([]);
});
for(const scenario of ['standard','vt'])for(const width of [390,768,1440])test(`${scenario} expanded layout at ${width}px keeps order and compact accessible controls`,async({page},info)=>{
  await page.setViewportSize({width,height:1100});await setup(page,scenario);
  await page.evaluate(()=>{document.body.dataset.capture='true';document.documentElement.style.setProperty('--fixture-width','334px');});
  await card(page).locator('[data-expand]').click();
  const measurements=await card(page).evaluate(node=>{
    const root=node.shadowRoot,rect=selector=>{const r=root.querySelector(selector).getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height,right:r.right};};
    return {presets:rect('.presets'),mode:rect('.control-choices'),pair:rect('.settings-pair'),left:rect('.settings-pair [data-presets]'),right:rect('[data-icon-settings]'),tools:rect('.utility-actions'),fit:root.querySelector('ha-card').scrollWidth<=root.querySelector('ha-card').clientWidth+1};
  });
  expect(measurements.mode.y).toBeGreaterThan(measurements.presets.y);expect(measurements.pair.y).toBeGreaterThan(measurements.mode.y);expect(measurements.left.y).toBe(measurements.right.y);expect(measurements.right.x).toBeGreaterThan(measurements.left.x);expect(measurements.fit).toBe(true);
  await expect(card(page).locator('.utility-actions button')).toHaveCount(3);
  await card(page).screenshot({path:info.outputPath(`expanded-${scenario}-${width}.png`)});
  await card(page).getByRole('button',{name:'Top row icon settings',exact:true}).click();await expect(dialog(page).getByRole('group',{name:'Presets and control source'})).toBeVisible();
  expect(await page.evaluate(()=>fixture.calls)).toEqual([]);
});

 test('narrow cards use the compact layout with every utility still inside the card',async({page},info)=>{
  await setup(page);await page.evaluate(()=>{document.body.dataset.capture='true';document.documentElement.style.setProperty('--fixture-width','250px');});
  await card(page).locator('[data-expand]').click();
  const geometry=await card(page).evaluate(node=>{const root=node.shadowRoot,outer=root.querySelector('ha-card'),pair=root.querySelector('.settings-pair button');return {direction:getComputedStyle(pair).flexDirection,fit:outer.scrollWidth<=outer.clientWidth+1,targets:[...root.querySelectorAll('.settings-pair button,.utility-actions button')].every(button=>button.getBoundingClientRect().height>=44)};});
  expect(geometry).toEqual({direction:'column',fit:true,targets:true});await card(page).screenshot({path:info.outputPath('narrow-expanded.png')});expect(await page.evaluate(()=>fixture.calls)).toEqual([]);
});
