// SPDX-License-Identifier: GPL-3.0-only
import { test, expect } from '@playwright/test';

const card = page => page.locator('thermal-intelligence-beta-card');
const target = page => card(page).locator('[data-value="temperature"]');
const marker = page => card(page).locator('[data-marker="temperature"]');
const activePreset = page => card(page).locator('.header-telemetry [data-presets]');
const calls = page => page.evaluate(() => canonicalFixture.calls);

async function load(page, surface = 'active-presets') {
  await page.goto(`/tests/fixtures/canonical.html?surface=${surface}`);
  await expect(marker(page)).toHaveAttribute('aria-valuenow', '21');
}

async function scenario(page, name) {
  await page.locator('nav').getByRole('button', { name, exact: true }).click();
}

async function expand(page) {
  const button = card(page).locator('[data-expand]');
  if (await button.getAttribute('aria-expanded') !== 'true') await button.click();
  await expect(button).toHaveAttribute('aria-expanded', 'true');
}

test.beforeEach(async ({ page }) => {
  page.runtimeErrors = [];
  page.on('pageerror', error => page.runtimeErrors.push(error.message));
});

test.afterEach(async ({ page }) => {
  expect(page.runtimeErrors).toEqual([]);
  expect(await calls(page)).toEqual([]);
  await expect(page.locator('#calls')).toHaveText('Service calls: 0');
});

for (const surface of ['active-presets', 'polish']) {
  test(`${surface} preserves canonical observations, limits and preset source readings`, async ({ page }) => {
    await load(page, surface);
    await expect(card(page).locator('[data-current-value]')).toHaveText('20');
    await expect(target(page)).toHaveText('21°C');
    await expect(marker(page)).toHaveAttribute('aria-valuemin', '7');
    await expect(marker(page)).toHaveAttribute('aria-valuemax', '30');
    expect(await page.evaluate(() => canonicalFixture.card.model().step)).toBe(.1);
    await expect(activePreset(page)).toHaveCount(1);
    await expect(activePreset(page)).toHaveAttribute('aria-label', /^Comfort: 21 °C.*Preset selected/);
    await activePreset(page).click();
    const dialog = card(page).getByRole('dialog');
    await expect(dialog).toHaveAttribute('data-view', 'presets');
    await expect(dialog.locator('.chart-row')).toHaveCount(4);
    const frost = dialog.locator('.chart-row').filter({ has: page.locator('.chart-label strong', { hasText: /^Frost$/ }) });
    await expect(frost.locator('button[data-dialog-info]')).toHaveText('Unavailable');
    await expect(frost.locator('button[data-dialog-info]')).toBeDisabled();
    await expect(frost).toHaveAttribute('data-selected', 'false');
    await expect(frost.locator('.bar-frost')).toHaveCount(0);
    for (const [name, value] of [['Eco', 17], ['Comfort', 21], ['Boost', 23]]) {
      const row = dialog.locator('.chart-row').filter({ has: page.locator('.chart-label strong', { hasText: new RegExp(`^${name}$`) }) });
      await expect(row.locator('button[data-dialog-info]')).toHaveText(`${value} °C`);
      await expect(row).toHaveAttribute('data-selected', String(name === 'Comfort'));
    }
    await page.keyboard.press('Escape');
    await expand(page);
    await expect(card(page).locator('[data-preset="frost"]')).toHaveCount(0);
    await expect(target(page)).toHaveText('21°C');
    expect(await page.evaluate(() => canonicalFixture.hass.states['climate.room'].attributes.temperature)).toBe(21);
  });
}

test('supplemental advertised Frost uses its explicit 10 degree observation without changing the canonical target', async ({ page }) => {
  await load(page);
  await page.evaluate(() => {
    const f = canonicalFixture;
    f.states['number.room_preset_frost_temp'] = { entity_id: 'number.room_preset_frost_temp', state: '10', attributes: { unit_of_measurement: '°C' } };
    f.states['climate.room'].attributes.preset_modes = ['none', 'eco', 'comfort', 'boost', 'frost'];
    f.states['climate.room'].attributes.preset_mode = 'frost';
    f.card.setConfig({ ...f.config, features: [...f.config.features, { entity: 'number.room_preset_frost_temp', label: 'Frost', preset: 'frost' }] });
    f.card.hass = { ...f.hass, states: { ...f.states, 'climate.room': structuredClone(f.states['climate.room']) } };
  });
  await expect(activePreset(page)).toHaveCount(1);
  await expect(activePreset(page)).toHaveAttribute('aria-label', /^Frost: 10 °C.*Preset selected/);
  await expect(target(page)).toHaveText('21°C');
  await activePreset(page).click();
  const frost = card(page).getByRole('dialog').locator('.chart-row').filter({ has: page.locator('.chart-label strong', { hasText: /^Frost$/ }) });
  await expect(frost.locator('button[data-dialog-info]')).toHaveText('10 °C');
  await expect(frost.locator('button[data-dialog-info]')).toHaveAttribute('data-dialog-info', 'number.room_preset_frost_temp');
  await expect(frost).toHaveAttribute('data-selected', 'true');
  await page.keyboard.press('Escape');await expand(page);
  await expect(card(page).locator('[data-preset="frost"]')).toHaveAttribute('aria-pressed', 'true');
  await expect(target(page)).toHaveText('21°C');
});

test('canonical preset scenarios change selected preset only and expose exactly its observation', async ({ page }) => {
  await load(page);
  for (const [preset, name, value] of [['eco', 'Eco', 17], ['boost', 'Boost', 23], ['comfort', 'Comfort', 21]]) {
    await scenario(page, preset);
    await expect(activePreset(page)).toHaveCount(1);
    await expect(activePreset(page)).toHaveAttribute('aria-label', new RegExp(`^${name}: ${value} °C.*Preset selected`));
    await expect(activePreset(page)).toHaveAttribute('data-activity', 'active');
    await expect(target(page)).toHaveText('21°C');
    await expect(card(page).locator('[data-current-value]')).toHaveText('20');
    const observed = await page.evaluate(() => {
      const attributes = canonicalFixture.card.hass.states['climate.room'].attributes;
      return { target: attributes.temperature, preset: attributes.preset_mode, ownership: canonicalFixture.card.model().ownership.label };
    });
    expect(observed).toEqual({ target: 21, preset, ownership: 'Unknown' });
    await expand(page);
    await expect(card(page).locator('[data-preset][aria-pressed="true"]')).toHaveCount(1);
    await expect(card(page).locator(`[data-preset="${preset}"]`)).toHaveAttribute('aria-pressed', 'true');
  }
});

test('canonical Manual target remains 20.3 with no inferred preset or control ownership', async ({ page }) => {
  await load(page);
  await scenario(page, 'Manual');
  await expect(target(page)).toHaveText('20.3°C');
  await expect(marker(page)).toHaveAttribute('aria-valuenow', '20.3');
  await expect(activePreset(page)).toHaveCount(0);
  await expand(page);
  await expect(card(page).locator('[data-preset][aria-pressed="true"]')).toHaveCount(1);
  await expect(card(page).locator('[data-preset="none"]')).toHaveAttribute('aria-pressed', 'true');
  expect(await page.evaluate(() => canonicalFixture.card.hass.states['climate.room'].attributes.preset_mode)).toBe('none');
  await card(page).locator('[data-device]').click();
  const control = card(page).getByRole('dialog').locator('#section-control');
  await control.locator('summary').click();
  await expect(control.locator('dl > div').filter({ hasText: 'Control ownership' }).locator('dd')).toHaveText('Unknown');
  await expect(control.locator('.note')).toBeVisible();
  await expect(control.locator('.note')).toContainText('presets and temperatures do not establish ownership');
});

for (const mode of ['Off', 'Disconnected']) {
  test(`${mode} suppresses the active preset header even when a selected preset is retained`, async ({ page }) => {
    await load(page);
    await scenario(page, mode);
    await expect(activePreset(page)).toHaveCount(0);
    await page.evaluate(() => {
      const f = canonicalFixture;
      f.states['climate.room'].attributes.preset_mode = 'comfort';
      f.card.hass = { ...f.hass, states: { ...f.states, 'climate.room': structuredClone(f.states['climate.room']) } };
    });
    expect(await page.evaluate(() => canonicalFixture.card.hass.states['climate.room'].attributes.preset_mode)).toBe('comfort');
    await expect(activePreset(page)).toHaveCount(0);
    if (mode === 'Disconnected') await expect(marker(page)).toBeDisabled();
    await scenario(page, 'comfort');
    await expect(activePreset(page)).toHaveCount(1);
    await expect(activePreset(page)).toHaveAttribute('aria-label', /^Comfort: 21 °C.*Preset selected/);
    await expect(target(page)).toHaveText('21°C');
  });
}

test('canonical humidity samples retain the original five display bands and colours', async ({ page }) => {
  await load(page);
  const humidity = card(page).locator('.header-telemetry [data-telemetry-topic="humidity"]');
  // Original display guides: 30 / 40 / 60 / 70. The two warning bands share amber.
  for (const [value, colour] of [[20, '#79b8ed'], [35, '#efb86b'], [50, '#7dc39c'], [65, '#efb86b'], [80, '#eb7777']]) {
    await scenario(page, `Humidity ${value}%`);
    await expect(humidity).toContainText(`${value} %`);
    await expect.poll(() => humidity.evaluate(node => getComputedStyle(node).getPropertyValue('--telemetry-colour').trim())).toBe(colour);
    await expect(target(page)).toHaveText('21°C');
    await expect(activePreset(page)).toHaveAttribute('aria-label', /^Comfort: 21 °C.*Preset selected/);
  }
});

test('four humidity sliders keep an editable local draft through passive updates and reject invalid numbers', async ({ page }) => {
  await load(page);
  const before = await page.evaluate(() => ({ fixture: structuredClone(canonicalFixture.config), card: structuredClone(canonicalFixture.card.config) }));
  await card(page).locator('.header-telemetry [data-telemetry-topic="humidity"]').click();
  const dialog = card(page).getByRole('dialog');
  await expect(dialog).toHaveAttribute('data-view', 'humidity');
  await expect(dialog.locator('input[type="range"]')).toHaveCount(4);
  await expect(dialog.locator('input[type="number"]')).toHaveCount(4);
  for (const [key, value] of [['dry_below', 30], ['good_min', 40], ['good_max', 60], ['wet_above', 70]]) {
    await expect(dialog.locator(`input[type="range"][data-humidity-boundary="${key}"]`)).toHaveValue(String(value));
    await expect(dialog.locator(`input[type="number"][data-humidity-boundary="${key}"]`)).toHaveValue(String(value));
  }
  const slider = dialog.locator('input[type="range"][data-humidity-boundary="dry_below"]');
  const numeric = dialog.locator('input[type="number"][data-humidity-boundary="dry_below"]');
  await slider.focus();
  await slider.evaluate(node => { window.canonicalHumiditySlider = node; });
  await page.keyboard.press('ArrowRight');
  await expect(slider).toHaveValue('31');await expect(numeric).toHaveValue('31');
  await page.evaluate(() => {
    const f = canonicalFixture;
    f.states['sensor.room_humidity'].state = '57';
    f.card.hass = { ...f.hass, states: { ...f.states, 'climate.room': structuredClone(f.states['climate.room']) } };
  });
  await expect(slider).toBeFocused();await expect(slider).toHaveValue('31');
  expect(await slider.evaluate(node => node === window.canonicalHumiditySlider)).toBe(true);
  await expect(dialog.locator('.reading')).toContainText('57 %');
  await expect(dialog.locator('[data-copy-humidity]')).toBeEnabled();
  await numeric.fill('99');
  await expect(numeric).toHaveValue('99');await expect(numeric).toHaveAttribute('aria-invalid', 'true');
  await expect(dialog.locator('[data-copy-humidity]')).toBeDisabled();
  await expect(dialog.locator('[data-dialog-status]')).toContainText('four increasing whole percentages');
  expect(await page.evaluate(() => ({ fixture: canonicalFixture.config, card: canonicalFixture.card.config }))).toEqual(before);
  expect(await calls(page)).toEqual([]);
  await numeric.fill('31');await expect(dialog.locator('[data-copy-humidity]')).toBeEnabled();
  await page.keyboard.press('Escape');
  await card(page).locator('.header-telemetry [data-telemetry-topic="humidity"]').click();
  await expect(card(page).getByRole('dialog').locator('input[type="range"][data-humidity-boundary="dry_below"]')).toHaveValue('30');
  expect(await page.evaluate(() => ({ fixture: canonicalFixture.config, card: canonicalFixture.card.config }))).toEqual(before);
});

for (const [surface, width] of [['active-presets', 280], ['polish', 320]]) {
  test(`${surface} keeps its ${width}px card and canonical scaled dial without overflow`, async ({ page }) => {
    await page.setViewportSize({ width: 480, height: 1100 });
    await load(page, surface);
    const cardBox = await card(page).locator('ha-card').boundingBox();
    expect(cardBox.width).toBeCloseTo(width, 1);
    const svg = card(page).locator('.dial > svg');
    await expect(svg).toHaveAttribute('viewBox', '10 0 180 184');
    const dialBox = await svg.boundingBox();
    expect(dialBox.width).toBeCloseTo(260, 1);
    expect(dialBox.height).toBeCloseTo(260 * 184 / 180, 1);
    expect(dialBox.x + dialBox.width / 2).toBeCloseTo(cardBox.x + cardBox.width / 2, 1);
    await scenario(page, 'Long room name');
    await expand(page);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    expect(await card(page).locator('ha-card').evaluate(node => node.scrollWidth <= node.clientWidth)).toBe(true);
    await expect(card(page).locator('header strong')).toHaveText('A longer room name for layout verification');
    await expect(marker(page)).toBeVisible();
  });
}
