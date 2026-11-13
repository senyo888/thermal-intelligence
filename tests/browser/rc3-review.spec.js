// SPDX-License-Identifier: GPL-3.0-only
import { test, expect } from '@playwright/test';

const card = page => page.locator('thermal-intelligence-beta-card').first();
const editor = page => page.locator('thermal-intelligence-beta-card-editor');
const field = (page, key) => editor(page).locator(`[data-field="${key}"]`);
const marker = (page, key) => card(page).locator(`[data-marker="${key}"]`);
const status = page => page.evaluate(() => fixture.cards[0]._registryStatus);
const calls = page => page.evaluate(() => fixture.calls);
const registryCount = page => page.evaluate(() => fixture.registryCalls.length);
async function reset(page, scenario = 'standard', config = {}) {
  await page.evaluate(({ scenario, config }) => fixture.reset(scenario, config), { scenario, config });
  await expect.poll(() => status(page)).toBe('verified');
}
async function failRegistry(page) {
  await page.evaluate(() => {
    fixture.registryCalls = []; fixture.registryFailure = true;
    fixture.hass.connection = { connected: true, socket: {} }; fixture.refresh();
  });
  await expect.poll(() => status(page)).toBe('unavailable');
}
test.beforeEach(async ({ page }) => {
  page.runtimeErrors = []; page.on('pageerror', e => page.runtimeErrors.push(e.message));
  await page.goto('/'); await expect.poll(() => status(page)).toBe('verified');
});
test.afterEach(async ({ page }) => expect(page.runtimeErrors).toEqual([]));

test('generic humidity follows its explicit source while keyed headers retain their own source', async ({ page }) => {
  await reset(page, 'standard', { humidity_entity: 'sensor.second_humidity', telemetry: [
    { kind: 'humidity', entity: 'sensor.fixture_humidity' }, { kind: 'humidity', entity: 'sensor.second_humidity' },
  ] });
  await page.evaluate(() => {
    fixture.hass.states['sensor.second_humidity'] = { state: '65', attributes: { unit_of_measurement: '%' } };
    fixture.refresh(); fixture.cards[0]._openDialog('humidity');
  });
  const dialog = card(page).getByRole('dialog');
  await expect(dialog.locator('.preview')).toContainText('65 %');
  await expect(dialog.getByRole('button', { name: 'Humidity history', exact: true })).toHaveAttribute('data-dialog-info', 'sensor.second_humidity');
  await page.keyboard.press('Escape');
  await card(page).locator('.header-telemetry [data-telemetry-topic="humidity"]').first().click();
  await expect(dialog.locator('.preview')).toContainText('48 %');
  await page.keyboard.press('Escape');
  await page.evaluate(() => {
    fixture.hass.states['sensor.second_humidity'].state = 'unavailable'; fixture.refresh(); fixture.cards[0]._openDialog('humidity');
  });
  await expect(dialog).toHaveAttribute('data-reading-status', 'unavailable');
  await expect(dialog.locator('.preview')).not.toContainText('48 %');
  expect(await calls(page)).toEqual([]);
});

for (const legacy of [false, true]) test(`humidity reset clears ${legacy ? 'legacy' : 'canonical'} boundary edits without clearing unrelated drafts`, async ({ page }) => {
  await reset(page, 'standard', { humidity_bands: { ...(legacy ? { low: 35, high: 65 } : { dry_below: 30, good_min: 40, good_max: 60, wet_above: 70 }), future: { kept: true } } });
  await editor(page).locator('[data-section="advanced"] summary').click();
  const key = legacy ? 'low' : 'dry_below';
  await field(page, `humidity_bands.${key}`).fill('25'); await field(page, `humidity_bands.${key}`).press('Tab');
  await page.evaluate(() => { fixture.editor._buffers.set('name', 'Unrelated draft'); });
  await editor(page).getByRole('button', { name: 'Reset humidity guides to source defaults' }).click();
  await expect(field(page, 'humidity_bands.dry_below')).toHaveValue('30');
  await expect(field(page, 'humidity_bands.good_min')).toHaveValue('40');
  await expect(field(page, 'name')).toHaveValue('Unrelated draft');
  expect(await page.evaluate(() => fixture.config.humidity_bands)).toEqual({ dry_below: 30, good_min: 40, good_max: 60, wet_above: 70, future: { kept: true } });
  expect(await calls(page)).toEqual([]);
});

test('failed identity lookup accepts later exact same-session cache without retrying commands', async ({ page }) => {
  await failRegistry(page);
  await page.evaluate(() => {
    fixture.hass.entities = { [fixture.config.entity]: { entity_id: 'climate.wrong', platform: 'generic_thermostat' } }; fixture.refresh();
  });
  expect(await status(page)).toBe('unavailable');
  await page.evaluate(() => {
    fixture.hass.entities[fixture.config.entity].entity_id = fixture.config.entity; fixture.refresh();
  });
  await expect.poll(() => status(page)).toBe('verified');
  expect(await registryCount(page)).toBe(1); expect(await calls(page)).toEqual([]);
});

test('identity retry has cooldown, finite attempts and cache recovery after exhaustion', async ({ page }) => {
  const now = new Date('2026-11-13T12:00:00Z');
  await page.clock.install({ time: now }); await page.clock.pauseAt(now); await failRegistry(page);
  for (const [delay, expected] of [[999, 1], [1, 2], [1999, 2], [1, 3], [100000, 3]]) {
    await page.clock.runFor(delay);
    await page.evaluate(() => { for (let i = 0; i < 20; i++) fixture.refresh(); });
    await expect.poll(() => status(page)).toBe('unavailable');
    expect(await registryCount(page)).toBe(expected);
  }
  await page.evaluate(() => {
    fixture.hass.entities = { [fixture.config.entity]: { entity_id: fixture.config.entity, platform: 'generic_thermostat' } }; fixture.refresh();
  });
  await expect.poll(() => status(page)).toBe('verified'); expect(await calls(page)).toEqual([]);
});

test('same-session network retry succeeds and missing registry API can recover', async ({ page }) => {
  await page.clock.install(); await failRegistry(page);
  await page.evaluate(() => { fixture.registryFailure = false; });
  await page.clock.runFor(1000); await page.evaluate(() => fixture.refresh());
  await expect.poll(() => status(page)).toBe('verified'); expect(await registryCount(page)).toBe(2);
  await page.evaluate(() => { window.registryAPI = fixture.hass.callWS; delete fixture.hass.callWS; fixture.hass.connection.socket = {}; fixture.refresh(); });
  expect(await status(page)).toBe('unavailable');
  await page.evaluate(() => { fixture.hass.callWS = window.registryAPI; fixture.refresh(); });
  await expect.poll(() => status(page)).toBe('verified'); expect(await calls(page)).toEqual([]);
});

test('blank registry platforms remain unverified and can recover within the same session', async ({ page }) => {
  await page.clock.install();
  await page.evaluate(() => {
    fixture.registryCalls = [];
    fixture.hass.entities = { [fixture.config.entity]: { entity_id: fixture.config.entity, platform: '   ' } };
    fixture.hass.callWS = async message => { fixture.registryCalls.push(message); return { entity_id: message.entity_id, platform: '' }; };
    fixture.hass.connection.socket = {}; fixture.refresh();
  });
  await expect.poll(() => status(page)).toBe('unavailable');
  expect(await page.evaluate(() => fixture.cards[0].model().canSet)).toBe(false);
  await page.evaluate(() => { fixture.hass.entities[fixture.config.entity].platform = 'generic_thermostat'; fixture.refresh(); });
  await expect.poll(() => status(page)).toBe('verified'); expect(await registryCount(page)).toBe(1);
  await page.evaluate(() => { delete fixture.hass.entities; fixture.hass.connection.socket = {}; fixture.refresh(); });
  await expect.poll(() => status(page)).toBe('unavailable');
  await page.evaluate(() => { fixture.hass.callWS = async message => { fixture.registryCalls.push(message); return { entity_id: message.entity_id, platform: 'generic_thermostat' }; }; });
  await page.clock.runFor(1000); await page.evaluate(() => fixture.refresh());
  await expect.poll(() => status(page)).toBe('verified'); expect(await calls(page)).toEqual([]);
});

test('stale retry results cannot replace a newer session or erase known VT restrictions', async ({ page }) => {
  await reset(page, 'vt');
  await page.evaluate(() => {
    fixture.hass.callWS = () => new Promise((resolve, reject) => { window.oldIdentity = { resolve, reject }; });
    fixture.hass.connection.socket = {}; fixture.refresh();
  });
  expect(await status(page)).toBe('loading');
  await page.evaluate(() => {
    fixture.hass.connected = false; fixture.refresh();
    fixture.hass.connected = true; fixture.hass.callWS = async () => { throw Error('Unavailable'); };
    delete fixture.hass.states[fixture.config.entity].attributes.is_ready; fixture.refresh();
    window.oldIdentity.resolve({ entity_id: fixture.config.entity, platform: 'generic_thermostat' });
  });
  await expect.poll(() => status(page)).toBe('unavailable');
  expect(await page.evaluate(() => ({ kind: fixture.cards[0].model().provider.kind, ready: fixture.cards[0].model().ready }))).toEqual({ kind: 'vtherm', ready: false });
  await page.evaluate(() => fixture.cards[0]._temperature(23)); expect(await calls(page)).toEqual([]);
});

for (const [key, press, expected] of [['target_temp_low', 'Home', 7], ['target_temp_low', 'End', 24], ['target_temp_high', 'Home', 19], ['target_temp_high', 'End', 30]]) {
  test(`range ${key} ${press} respects its sibling and commits only on keyup`, async ({ page }) => {
    await reset(page, 'range'); await marker(page, key).focus(); await page.keyboard.down(press);
    await expect(marker(page, key)).toHaveAttribute('aria-valuenow', String(expected)); expect(await calls(page)).toEqual([]);
    await page.keyboard.up(press); await expect.poll(async () => (await calls(page)).length).toBe(1);
    expect((await calls(page))[0].payload).toEqual({ target_temp_low: key === 'target_temp_low' ? expected : 19, target_temp_high: key === 'target_temp_high' ? expected : 24, entity_id: 'climate.fixture_thermostat' });
  });
}

test('off-grid range siblings constrain the keyboard draft without bypassing final payload validation', async ({ page }) => {
  await reset(page, 'range');
  await page.evaluate(() => { Object.assign(fixture.hass.states[fixture.config.entity].attributes, { target_temp_low: 18.2, target_temp_high: 22.3 }); fixture.refresh(); });
  await marker(page, 'target_temp_high').focus(); await page.keyboard.down('Home');
  await expect(marker(page, 'target_temp_high')).toHaveAttribute('aria-valuenow', '18.5'); await page.keyboard.up('Home');
  expect(await calls(page)).toEqual([]);
  await marker(page, 'target_temp_low').focus(); await page.keyboard.down('End');
  await expect(marker(page, 'target_temp_low')).toHaveAttribute('aria-valuenow', '22'); await page.keyboard.up('End');
  expect(await calls(page)).toEqual([]);
});

test('valid trend remains observable while VT user lock still blocks commands', async ({ page }) => {
  await reset(page, 'vt', { trend_entity: 'sensor.trend' });
  await page.evaluate(() => {
    fixture.hass.states['sensor.trend'] = { state: '0.4', attributes: { unit_of_measurement: '°C/hour' } };
    Object.assign(fixture.hass.states[fixture.config.entity].attributes, { is_lock_configured: true, specific_states: { is_locked: true } }); fixture.refresh();
  });
  await expect(card(page)).toContainText('Rising');
  expect(await page.evaluate(() => ({ trend: fixture.cards[0].model().trend.available, ready: fixture.cards[0].model().ready }))).toEqual({ trend: true, ready: false });
  await page.evaluate(() => fixture.cards[0]._temperature(23)); expect(await calls(page)).toEqual([]);
  await page.evaluate(() => { fixture.hass.connected = false; fixture.refresh(); });
  expect(await page.evaluate(() => fixture.cards[0].model().trend.available)).toBe(false);
});
