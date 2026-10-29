// SPDX-License-Identifier: GPL-3.0-only
import { test, expect } from '@playwright/test';

async function healthy(page) {
  await page.goto('/tests/fixtures/response-arc.html');
  await page.evaluate(() => {
    const f = responseArcFixture, a = f.hass.states[f.ids.thermostat].attributes;
    Object.assign(a, { is_window_auto_configured: false, is_presence_configured: false, is_motion_configured: false });
    Object.assign(a.specific_states, { is_initialized: true, is_device_active: true, should_device_be_active: true,
      hvac_off_reason: null, hvac_mode_reason: null, is_locked: false, is_sleeping: false });
    a.vtherm_over_climate.is_regulated = false;
    f.refresh();
  });
}

test('null optional reasons show green in the built card and overview without service writes', async ({ page }) => {
  await healthy(page);
  const card = page.locator('thermal-intelligence-beta-card');
  await expect(card.locator('[data-device]')).toHaveAttribute('data-health', 'green');
  await card.locator('[data-device]').click();
  await expect(card.locator('.health')).toHaveAttribute('data-level', 'green');
  await card.locator('#section-provider-details summary').click();
  await expect(card.locator('#section-provider-details')).toContainText('None reported');
  expect(await card.locator('#section-provider-details dd').allTextContents()).toContain('None reported');
  expect(await page.evaluate(() => responseArcFixture.calls)).toEqual([]);
});

test('missing and unknown observations remain amber; unavailable and disconnected stay red', async ({ page }) => {
  await healthy(page);
  const card = page.locator('thermal-intelligence-beta-card');
  for (const state of ['missing', 'unknown', 'unavailable', 'malformed', 'readiness', 'window']) {
    await healthy(page);
    await page.evaluate(state => {
      const f = responseArcFixture, a = f.hass.states[f.ids.thermostat].attributes;
      if (state === 'missing') delete a.specific_states.hvac_off_reason;
      else if (state === 'readiness') a.is_ready = null;
      else if (state === 'window') { a.is_window_configured = true; a.window_manager = { window_state: 'unknown' }; }
      else a.specific_states.hvac_off_reason = state === 'malformed' ? {} : state;
      f.refresh();
    }, state);
    await expect(card.locator('[data-device]')).toHaveAttribute('data-health', 'amber');
    await card.locator('[data-device]').click();
    await expect(card.locator('.health')).toHaveAttribute('data-level', 'amber');
    if (state === 'readiness') expect(await page.evaluate(() => responseArcFixture.card.model().canSet)).toBe(false);
    expect(await page.evaluate(() => responseArcFixture.calls)).toEqual([]);
  }
  for (const state of ['unavailable', 'disconnected']) {
    await healthy(page);
    await page.evaluate(state => {
      const f = responseArcFixture;
      if (state === 'unavailable') f.hass.states[f.ids.thermostat].state = 'unavailable';
      else f.hass.connected = false;
      f.refresh();
    }, state);
    await expect(card.locator('[data-device]')).toHaveAttribute('data-health', 'red');
    expect(await page.evaluate(() => responseArcFixture.card.model().canSet)).toBe(false);
    expect(await page.evaluate(() => responseArcFixture.calls)).toEqual([]);
  }
});
