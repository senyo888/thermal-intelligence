// SPDX-License-Identifier: GPL-3.0-only
import { test,expect } from '@playwright/test';
const card=page=>page.locator('thermal-intelligence-beta-card').first();
const badge=page=>card(page).locator('[data-telemetry-key="control:summary"]');
async function setup(page) {
  await page.goto('/');await page.evaluate(()=>{
    fixture.reset('vt');
    Object.assign(fixture.hass.states[fixture.config.entity].attributes,{preset_modes:['none','frost','eco','comfort','boost'],preset_mode:'none',is_lock_configured:false});
    fixture.hass.states['sensor.owner']={state:'Schedule',attributes:{climate_entity:fixture.config.entity,intent_ready:true,mode:'Eco'},last_updated:new Date().toISOString()};
    fixture.hass.states['sensor.policy']={state:'Comfort',attributes:{}};
    fixture.configure({...fixture.config,control_source:{entity:'sensor.owner',climate_attribute:'climate_entity',ready_attribute:'intent_ready'},schedule_preset:{entity:'sensor.owner',attribute:'mode',climate_attribute:'climate_entity',ready_attribute:'intent_ready',future:{keep:true}},house_preset:{entity:'sensor.policy'}});fixture.refresh();fixture.editor.setConfig(fixture.config);
  });
}
test.beforeEach(async({page})=>{page.errors=[];page.on('pageerror',error=>page.errors.push(error.message));});
test.afterEach(async({page})=>{expect(page.errors).toEqual([]);expect(await page.evaluate(()=>fixture.calls)).toEqual([]);});
for(const width of [390,768,1440])test(`confirmed source and mode combinations stay compact at ${width}px`,async({page},info)=>{
  await page.setViewportSize({width,height:1000});await setup(page);
  for(const source of ['House','Manual','VT','Schedule'])for(const [mode,icon] of Object.entries({Frost:'mdi:snowflake',Eco:'mdi:leaf',Comfort:'mdi:sofa',Boost:'mdi:fire'})) {
    await page.evaluate(({source,mode})=>{
      fixture.hass.states['sensor.owner'].state=source;fixture.hass.states['sensor.owner'].attributes.mode=source==='Schedule'?mode:'Boost';
      fixture.hass.states['sensor.policy'].state=source==='House'?mode:'Comfort';
      fixture.hass.states[fixture.config.entity].attributes.preset_mode=['Manual','VT'].includes(source)?mode.toLowerCase():'none';fixture.refresh();
    },{source,mode});
    await expect(badge(page)).toHaveAccessibleName(`Control source: ${source}; ${source==='House'?'House policy':source==='Schedule'?'Last confirmed schedule mode':'Thermostat preset'}: ${mode}`);
    await expect(badge(page).locator('.preset-mark')).toHaveAttribute('icon',icon);await expect(badge(page)).toHaveText(source==='VT'?'VT':'');
    expect(await card(page).evaluate(node=>{const card=node.shadowRoot.querySelector('ha-card');return card.scrollWidth<=card.clientWidth+1;})).toBe(true);
  }
  await card(page).screenshot({path:info.outputPath(`schedule-boost-${width}.png`)});
  await badge(page).click();const dialog=card(page).getByRole('dialog');await expect(dialog).toContainText('Last confirmed schedule mode');await expect(dialog).toContainText('Boost');await expect(dialog).toContainText('VT provider');
});
test('confirmed schedule mode wins conflicting VT and House presets and retires without fallback',async({page})=>{
  await setup(page);await page.evaluate(()=>{fixture.hass.states['sensor.owner'].attributes.mode='Boost';fixture.hass.states[fixture.config.entity].attributes.preset_mode='eco';fixture.refresh();});
  await expect(badge(page)).toHaveAccessibleName('Control source: Schedule; Last confirmed schedule mode: Boost');
  await page.evaluate(()=>{fixture.hass.states['sensor.owner'].attributes.intent_ready=false;fixture.refresh();});
  await expect(badge(page)).toHaveAccessibleName('Control source: Unknown');await expect(badge(page).locator('.preset-mark')).toHaveCount(0);
  await page.evaluate(()=>{fixture.hass.states['sensor.owner'].attributes.intent_ready=true;fixture.hass.states['sensor.owner'].attributes.mode='none';fixture.refresh();});
  await expect(badge(page)).toHaveAccessibleName('Control source: Schedule');await expect(badge(page).locator('.preset-mark')).toHaveCount(0);
  await page.evaluate(()=>{fixture.hass.states['sensor.owner'].attributes.mode='Comfort';fixture.hass.states['sensor.owner'].state='House';fixture.refresh();});
  await badge(page).click();await expect(card(page).getByRole('dialog')).toContainText('Not controlling');await page.keyboard.press('Escape');
});
test('schedule mode can be hidden without borrowing the thermostat preset and stays in export',async({page})=>{
  await setup(page);await page.evaluate(()=>{fixture.hass.states[fixture.config.entity].attributes.preset_mode='comfort';fixture.refresh();});
  await card(page).locator('[data-expand]').click();await card(page).getByRole('button',{name:'Top row icon settings',exact:true}).click();
  const dialog=card(page).getByRole('dialog');await dialog.getByRole('checkbox',{name:'Show Last confirmed schedule mode',exact:true}).uncheck();
  await expect(dialog.getByLabel('Draft top row preview').getByRole('img',{name:'Control source: Schedule',exact:true})).toBeVisible();
  expect(await page.evaluate(()=>fixture.cards[0]._iconSettings.draft.schedule_preset.future)).toEqual({keep:true});
  await page.evaluate(()=>fixture.cards[0].setConfig(fixture.cards[0]._iconSettings.draft));await expect(badge(page).locator('.preset-mark')).toHaveCount(0);
});
test('schedule mode editor preserves unknown fields and source freshness expires without a new HA update',async({page})=>{
  await setup(page);const editor=page.locator('#editor thermal-intelligence-beta-card-editor');
  await editor.locator('[data-section="control-sources"] > summary').click();
  await expect(editor.getByLabel('Schedule mode value attribute',{exact:true})).toHaveValue('mode');
  const age=editor.getByLabel('Schedule mode maximum age (seconds)',{exact:true});await age.fill('30');await age.press('Tab');
  expect(await page.evaluate(()=>fixture.config.schedule_preset.future)).toEqual({keep:true});
  const clear=editor.getByLabel('Schedule mode clear attributes',{exact:true});await clear.fill('pending, storage');await clear.press('Tab');
  expect(await page.evaluate(()=>fixture.config.schedule_preset.clear_attributes)).toEqual(['pending','storage']);await expect(badge(page).locator('.preset-mark')).toHaveCount(0);
  await clear.fill('');await clear.press('Tab');expect(await page.evaluate(()=>fixture.config.schedule_preset.clear_attributes)).toBeUndefined();
  await age.fill('');await age.press('Tab');expect(await page.evaluate(()=>fixture.config.schedule_preset.max_age_seconds)).toBeUndefined();
  await page.evaluate(()=>{fixture.hass.states['sensor.owner'].last_updated=new Date().toISOString();fixture.configure({...fixture.config,schedule_preset:{...fixture.config.schedule_preset,max_age_seconds:1}});fixture.refresh();});
  await expect(badge(page)).toHaveAccessibleName('Control source: Schedule; Last confirmed schedule mode: Eco');
  await expect(badge(page)).toHaveAccessibleName('Control source: Schedule',{timeout:5000});await expect(badge(page).locator('.preset-mark')).toHaveCount(0);
});
