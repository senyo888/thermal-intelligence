// SPDX-License-Identifier: GPL-3.0-only
import { test, expect } from '@playwright/test';

const card = page => page.locator('thermal-intelligence-beta-card').first();
const marker = (page, key) => card(page).locator(`[data-marker="${key}"]`);
const calls = page => page.evaluate(() => fixture.calls);
async function reset(page, scenario = 'standard', config = {}) {
  await page.evaluate(({ scenario, config }) => fixture.reset(scenario, config), { scenario, config });
  await expect.poll(() => page.evaluate(() => fixture.cards[0]._registryStatus)).toBe('verified');
}
test.beforeEach(async ({ page }) => {
  page.runtimeErrors = []; page.on('pageerror', error => page.runtimeErrors.push(error.message));
  await page.goto('/'); await reset(page);
});
test.afterEach(async ({ page }) => expect(page.runtimeErrors).toEqual([]));

for (const [key, direction, expected] of [['target_temp_low', 'ArrowRight', 24], ['target_temp_high', 'ArrowLeft', 19]]) {
  test(`repeated ${direction} preserves the ${key} draft at its sibling boundary`, async ({ page }) => {
    await reset(page, 'range'); await marker(page, key).focus();
    for (let i = 0; i < 14; i++) await page.keyboard.down(direction);
    await expect(marker(page, key)).toHaveAttribute('aria-valuenow', String(expected));
    expect(await calls(page)).toEqual([]);
    await page.keyboard.up(direction); await expect.poll(async () => (await calls(page)).length).toBe(1);
    expect((await calls(page))[0].payload).toEqual({ entity_id: 'climate.fixture_thermostat', target_temp_low: expected, target_temp_high: expected });
  });
}

for (const [key, beyond, expected] of [['target_temp_low', 26, 24], ['target_temp_high', 17, 19]]) {
  test(`dragging ${key} beyond its sibling retains one valid request on release`, async ({ page }) => {
    await reset(page, 'range');
    const box = await marker(page, key).boundingBox();
    const end = await card(page).locator('.dial > svg').evaluate((svg, value) => {
      const angle = (135 + 270 * (value - 7) / 23) * Math.PI / 180;
      const point = new DOMPoint(100 + 72 * Math.cos(angle), 100 + 72 * Math.sin(angle)).matrixTransform(svg.getScreenCTM());
      return { x: point.x, y: point.y };
    }, beyond);
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2); await page.mouse.down();
    await page.mouse.move(end.x, end.y, { steps: 12 });
    await expect(marker(page, key)).toHaveAttribute('aria-valuenow', String(expected)); expect(await calls(page)).toEqual([]);
    await page.mouse.up(); await expect.poll(async () => (await calls(page)).length).toBe(1);
    expect((await calls(page))[0].payload).toEqual({ entity_id: 'climate.fixture_thermostat', target_temp_low: expected, target_temp_high: expected });
  });
}

for (const legacy of [false, true]) test(`manual humidity export follows ${legacy ? 'legacy' : 'canonical'} edits and clears invalid drafts`, async ({ page }) => {
  const bands = legacy ? { low: 35, high: 65 } : { dry_below: 30, good_min: 40, good_max: 60, wet_above: 70 };
  await reset(page, 'standard', { humidity_bands: { ...bands, future: { kept: true } }, future_option: { kept: true } });
  await page.evaluate(() => {
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: async () => { throw Error('Clipboard denied'); } } });
  });
  await card(page).locator('[data-telemetry-topic="humidity"]').first().click();
  const dialog = card(page).getByRole('dialog'), output = dialog.locator('[data-humidity-export]');
  const key = legacy ? 'low' : 'dry_below';
  const input = dialog.locator(`input[type="number"][data-humidity-boundary="${key}"]`);
  await dialog.getByRole('button', { name: 'Copy configuration' }).click(); await expect(output).toBeVisible();
  await input.fill('31');
  await expect.poll(async () => JSON.parse(await output.inputValue()).humidity_bands[key]).toBe(31);
  expect(JSON.parse(await output.inputValue()).future_option).toEqual({ kept: true });
  expect(JSON.parse(await output.inputValue()).humidity_bands.future).toEqual({ kept: true });
  await input.fill('90'); await expect(output).toHaveValue(''); await expect(output).toBeDisabled();
  await input.fill('25'); await expect(output).toBeEnabled();
  expect(JSON.parse(await output.inputValue()).humidity_bands[key]).toBe(25);
  await page.keyboard.press('Escape');
  expect(await page.evaluate(() => fixture.config.humidity_bands)).toEqual({ ...bands, future: { kept: true } });
  expect(await calls(page)).toEqual([]);
});

test('a delayed clipboard rejection exposes the current humidity draft', async ({ page }) => {
  await page.evaluate(() => {
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: () => new Promise((resolve, reject) => { window.rejectClipboard = reject; }) } });
  });
  await card(page).locator('[data-telemetry-topic="humidity"]').first().click();
  const dialog = card(page).getByRole('dialog');
  await dialog.getByRole('button', { name: 'Copy configuration' }).click();
  await dialog.locator('input[type="number"][data-humidity-boundary="dry_below"]').fill('31');
  await page.evaluate(() => window.rejectClipboard(Error('Clipboard denied')));
  const output = dialog.locator('[data-humidity-export]'); await expect(output).toBeVisible();
  expect(JSON.parse(await output.inputValue()).humidity_bands.dry_below).toBe(31);
  expect(await calls(page)).toEqual([]);
});

for (const reopenHumidity of [false, true]) test(`late clipboard failure does not affect a ${reopenHumidity ? 'reopened humidity' : 'different'} dialog`, async ({ page }) => {
  await page.evaluate(() => Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: () => new Promise((resolve, reject) => { window.rejectClipboard = reject; }) } }));
  await card(page).locator('[data-telemetry-topic="humidity"]').first().click();
  await card(page).getByRole('dialog').getByRole('button', { name: 'Copy configuration' }).click();
  await page.keyboard.press('Escape');
  if (reopenHumidity) await card(page).locator('[data-telemetry-topic="humidity"]').first().click();
  else await card(page).locator('[data-status-overview]').first().click();
  const dialog = card(page).getByRole('dialog');
  await expect(dialog).toBeVisible();
  const before = await dialog.innerHTML();
  await page.evaluate(async () => { window.rejectClipboard(Error('Clipboard denied')); await new Promise(resolve => setTimeout(resolve, 0)); });
  await expect(dialog.locator('[data-humidity-export]')).toHaveCount(0);
  expect(await dialog.innerHTML()).toBe(before);
  expect(await calls(page)).toEqual([]);
});
