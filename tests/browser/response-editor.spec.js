// SPDX-License-Identifier: GPL-3.0-only
import { test, expect } from '@playwright/test';

const editor = page => page.locator('thermal-intelligence-beta-card-editor');
const section = page => editor(page).locator('[data-section="response-arc"]');
const field = (page,key) => editor(page).locator(`[data-field="response_arc.${key}"]`);
const saved = page => page.evaluate(()=>structuredClone(fixture.config));
const eventCount = page => page.evaluate(()=>fixture.events.length);
async function open(page) {
  const response=section(page);
  if(await response.getAttribute('open')===null)await response.locator('summary').click();
  await expect(response).toHaveAttribute('open','');
}
async function edit(page,key,value) { await field(page,key).fill(value);await field(page,key).press('Tab'); }
async function reset(page,config={}) {
  await page.evaluate(config=>fixture.reset('vt',config),config);
  await open(page);
}
async function reopen(page) {
  await page.evaluate(()=>{
    const next=document.createElement('thermal-intelligence-beta-card-editor');
    next.setConfig(structuredClone(fixture.config));next.hass=fixture.hass;
    next.addEventListener('config-changed',event=>{fixture.events.push(structuredClone(event.detail.config));fixture.configure(event.detail.config);});
    fixture.editor=next;document.querySelector('#editor').replaceChildren(next);
  });
  await open(page);
}

test.beforeEach(async({page})=>{
  page.runtimeErrors=[];page.on('pageerror',error=>page.runtimeErrors.push(error.message));
  await page.goto('/');await expect(editor(page)).toBeVisible();
});
test.afterEach(async({page})=>{
  expect(page.runtimeErrors).toEqual([]);
  expect(await page.evaluate(()=>fixture.calls)).toEqual([]);
});

test('optional response setup stays empty and does not activate saved legacy mappings',async({page})=>{
  const legacy={overview:{room_sensor:'sensor.legacy_room',activity_entity:'climate.legacy_native'},recovery_entity:'climate.legacy_output',response_freshness_minutes:15};
  await reset(page,legacy);await page.locator('#preview').check();
  await expect(section(page).locator('summary')).toHaveText('Temperature response');
  await expect(section(page)).toContainText('read-only evidence');await expect(section(page)).toContainText('Versatile Thermostat');await expect(section(page)).toContainText('never send heating commands');
  for(const key of ['room_sensor','native_thermostat','confirmed_output','heat_source','freshness_minutes'])await expect(field(page,key)).toHaveValue('');
  await expect(field(page,'freshness_minutes')).toHaveAttribute('placeholder','10 minutes (default)');
  expect(await eventCount(page)).toBe(0);expect((await saved(page)).response_arc).toBeUndefined();
  await editor(page).locator('[data-field="name"]').fill('Unrelated card label');await editor(page).locator('[data-field="name"]').press('Tab');
  let config=await saved(page);expect(config.response_arc).toBeUndefined();for(const key of Object.keys(legacy))expect(config[key]).toEqual(legacy[key]);
  await reopen(page);expect((await saved(page)).response_arc).toBeUndefined();await expect(field(page,'room_sensor')).toHaveValue('');
  await page.setViewportSize({width:390,height:844});
  expect(await section(page).evaluate(node=>node.scrollWidth<=node.clientWidth)).toBe(true);
});

test('response mappings save and reopen per card while preserving unknown nested fields',async({page})=>{
  const advanced={future:{contract:'retained',details:[1,2]},future_flag:true};
  await reset(page,{response_arc:advanced,future_option:{keep:true},overview:{room_sensor:'sensor.legacy_room'}});
  await page.evaluate(()=>{fixture.addCard({...fixture.config,name:'Independent second card',response_arc:{room_sensor:'sensor.secondary_room',future:{keep:'secondary'}}});window.responseSecondBefore=structuredClone(fixture.cards[1].config);});
  const mappings={room_sensor:'sensor.fixture_room',native_thermostat:'climate.fixture_secondary',confirmed_output:'climate.fixture_output',heat_source:'climate.fixture_source'};
  for(const [key,value] of Object.entries(mappings))await edit(page,key,value);
  await edit(page,'freshness_minutes','12.5');
  const config=await saved(page);expect(config.response_arc).toEqual({...advanced,...mappings,freshness_minutes:12.5});expect(config.future_option).toEqual({keep:true});expect(config.overview).toEqual({room_sensor:'sensor.legacy_room'});
  expect(await page.evaluate(()=>fixture.cards[1].config)).toEqual(await page.evaluate(()=>window.responseSecondBefore));
  await reopen(page);for(const [key,value] of Object.entries(mappings))await expect(field(page,key)).toHaveValue(value);await expect(field(page,'freshness_minutes')).toHaveValue('12.5');
  await edit(page,'native_thermostat','');await edit(page,'freshness_minutes','');
  const cleared=(await saved(page)).response_arc;expect(cleared.native_thermostat).toBe('');expect(cleared.room_sensor).toBe(mappings.room_sensor);expect(cleared.freshness_minutes).toBeUndefined();expect(cleared.future).toEqual(advanced.future);
  await reopen(page);await expect(field(page,'native_thermostat')).toHaveValue('');await expect(field(page,'freshness_minutes')).toHaveValue('');
});

test('invalid response domains and freshness keep the last valid configuration until corrected',async({page})=>{
  await reset(page,{response_arc:{room_sensor:'sensor.fixture_room',freshness_minutes:10,future:{keep:true}}});
  const initial=await saved(page);const baseline=await eventCount(page);
  await edit(page,'room_sensor','climate.fixture_secondary');await expect(field(page,'room_sensor')).toHaveAttribute('aria-invalid','true');await expect(editor(page).getByRole('alert')).toContainText('must be a sensor entity ID');expect(await saved(page)).toEqual(initial);expect(await eventCount(page)).toBe(baseline);
  await edit(page,'room_sensor','sensor.fixture_room');await expect(editor(page).getByRole('alert')).toBeHidden();
  for(const key of ['native_thermostat','confirmed_output','heat_source']) {
    const before=await eventCount(page);await edit(page,key,'sensor.fixture_room');await expect(field(page,key)).toHaveAttribute('aria-invalid','true');expect(await eventCount(page)).toBe(before);
    await edit(page,key,'');await expect(editor(page).getByRole('alert')).toBeHidden();
  }
  for(const value of ['0','-1','30.01']) {
    const before=await eventCount(page);await edit(page,'freshness_minutes',value);await expect(field(page,'freshness_minutes')).toHaveAttribute('aria-invalid','true');expect(await eventCount(page)).toBe(before);expect((await saved(page)).response_arc.freshness_minutes).toBe(10);
  }
  await edit(page,'freshness_minutes','30');await expect(editor(page).getByRole('alert')).toBeHidden();expect((await saved(page)).response_arc.freshness_minutes).toBe(30);expect((await saved(page)).response_arc.future).toEqual({keep:true});
});

test('suggestions are domain-specific and live inventory updates preserve the field being typed',async({page})=>{
  await reset(page);
  const room=field(page,'room_sensor');await room.fill('sensor.typed_room');
  await room.evaluate(node=>{window.responseTypingNode=node;});
  await page.evaluate(()=>{
    fixture.hass.states['sensor.new_room']={entity_id:'sensor.new_room',state:'20',attributes:{friendly_name:'New room reading',unit_of_measurement:'°C'}};
    fixture.hass.states['climate.new_native']={entity_id:'climate.new_native',state:'heat',attributes:{friendly_name:'New native thermostat'}};
    fixture.refresh();
  });
  await expect(room).toBeFocused();await expect(room).toHaveValue('sensor.typed_room');expect(await room.evaluate(node=>node===window.responseTypingNode)).toBe(true);expect(await eventCount(page)).toBe(0);
  await room.press('Tab');expect((await saved(page)).response_arc).toEqual({room_sensor:'sensor.typed_room'});
  await reopen(page);
  const sensors=await section(page).locator('#ti-response-sensor-entities option').evaluateAll(nodes=>nodes.map(node=>node.value));
  const climates=await section(page).locator('#ti-response-climate-entities option').evaluateAll(nodes=>nodes.map(node=>node.value));
  expect(sensors).toContain('sensor.new_room');expect(sensors.every(id=>id.startsWith('sensor.'))).toBe(true);expect(climates).toContain('climate.new_native');expect(climates.every(id=>id.startsWith('climate.'))).toBe(true);
  await expect(field(page,'room_sensor')).toHaveValue('sensor.typed_room');
});
