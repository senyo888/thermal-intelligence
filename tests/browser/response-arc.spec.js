// SPDX-License-Identifier: GPL-3.0-only
import { test, expect } from '@playwright/test';

const card = page => page.locator('thermal-intelligence-beta-card');
const surface = page => card(page).locator('ha-card');
const arc = page => card(page).locator('[data-response-arc]');
const marker = page => card(page).locator('[data-marker="temperature"]');
const calls = page => page.evaluate(() => responseArcFixture.calls);
const colors = { warming: '#ff9459', below: '#50c8ff', target: '#62e3b0', above: '#c4a7ff', off: '#7c8ba2', cooling: '#66cfff', unknown: '#94a3b8' };

async function load(page, scenario = 'native_warming') {
  await page.goto(`/tests/fixtures/response-arc.html?scenario=${scenario}`);
  await expect(card(page)).toBeVisible();
  await expect.poll(() => page.evaluate(() => responseArcFixture.card.model().provider.status)).toBe('verified');
}

async function scenario(page, name) {
  await page.evaluate(name => responseArcFixture.scenario(name), name);
}

async function expectArc(page, color, responding = false, reason) {
  await expect(arc(page)).toHaveCount(2);
  for (const segment of await arc(page).all()) await expect(segment).toHaveAttribute('stroke', color);
  await expect(surface(page)).toHaveAttribute('data-arc-state', responding ? 'responding' : 'not-responding');
  if (reason) await expect(surface(page)).toHaveAttribute('data-arc-reason', reason);
}

async function pausedClock(page) {
  await page.clock.install({ time: new Date('2026-10-25T12:00:00Z') });
  await page.clock.pauseAt(new Date('2026-10-25T12:00:01Z'));
}

async function geometry(page) {
  return card(page).evaluate(host => {
    const root = host.shadowRoot;
    const attributes = (node, keys) => Object.fromEntries(keys.map(key => [key, node.getAttribute(key)]));
    return {
      viewBox: root.querySelector('.dial > svg').getAttribute('viewBox'),
      arcs: [...root.querySelectorAll('[data-response-arc]')].map(node => attributes(node, ['cx', 'cy', 'r', 'stroke-width', 'stroke-dasharray', 'transform'])),
      target: root.querySelector('[data-marker-visual]').getAttribute('transform'),
      ticks: [...root.querySelectorAll('.diamond')].map(node => ({ path: node.querySelector('path').getAttribute('d'), duration: getComputedStyle(node).animationDuration, delay: getComputedStyle(node).animationDelay, repeat: getComputedStyle(node).animationIterationCount })),
      halo: { radius: root.querySelector('.trend-halo').getAttribute('r'), duration: getComputedStyle(root.querySelector('.trend-halo')).animationDuration },
      led: { width: getComputedStyle(root.querySelector('.status-led')).width, height: getComputedStyle(root.querySelector('.status-led')).height, animation: getComputedStyle(root.querySelector('.status-led')).animationName },
    };
  });
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

test('the built bundle restores orange for both accepted native and confirmed TRV warming', async ({ page }) => {
  const requests = [];
  page.on('request', request => requests.push(new URL(request.url()).pathname));
  await load(page);
  // This checks the original visible arc circle too: old beta cannot pass merely by adding semantic attributes.
  await expect(card(page).locator('.dial > svg > circle').nth(2)).toHaveAttribute('stroke', colors.warming);
  await expectArc(page, colors.warming, true, 'warming');
  await expect(card(page).locator('[data-status-overview]')).toHaveText('Heat requested');
  await card(page).locator('[data-device]').click();
  const response = card(page).getByRole('dialog').locator('#section-response');
  await response.locator('summary').click();
  await expect(response).toContainText('Temperature response');
  await expect(response).toContainText('Recent warming with an accepted request');
  await expect(response.locator('.note')).toContainText(/warming/i);
  await expect(response.locator('.note')).toContainText(/boiler|flow|heat delivery/i);
  await page.keyboard.press('Escape');
  await scenario(page, 'trv_warming');
  await expectArc(page, colors.warming, true, 'warming');
  await expect(card(page).locator('[data-status-overview]')).toHaveText('TRV Open · 42%');
  expect(requests).toContain('/dist/thermal-intelligence.js');
  expect(requests.some(path => path.startsWith('/src/'))).toBe(false);
});

test('canonical distinctions survive cooling, idle, target, Off and insufficient warming evidence', async ({ page }) => {
  await load(page);
  const cases = [
    ['idle', colors.below], ['cooling', colors.cooling], ['at_target', colors.target], ['above_target', colors.above], ['off', colors.off],
    ['restricted', colors.below], ['stale_room', colors.below], ['stale_slope', colors.below], ['native_mismatch', colors.below],
    ['output_unconfirmed', colors.below], ['room_mismatch', colors.below], ['slope_mismatch', colors.below],
    ['flat', colors.below], ['falling', colors.below], ['rapid', colors.below], ['room_unavailable', colors.unknown],
  ];
  for (const [name, color] of cases) {
    await scenario(page, name);
    await expectArc(page, color);
  }
  await scenario(page, 'unit_unknown');
  await expect(surface(page)).toHaveAttribute('data-arc-state', 'not-responding');
  await expect(arc(page).first()).not.toHaveAttribute('stroke', colors.warming);
});

test('open valve, positive trend halo and health indication remain separate from accepted warming', async ({ page }) => {
  await load(page, 'trv_warming');
  await expectArc(page, colors.warming, true);
  const baseline = await card(page).evaluate(host => ({ halo: host.shadowRoot.querySelector('.trend-halo').getAttribute('stroke'), health: host.shadowRoot.querySelector('[data-device]').getAttribute('data-health') }));
  expect(baseline.halo).toBe('#ff962e80');
  await scenario(page, 'output_unconfirmed');
  await expectArc(page, colors.below);
  await expect(card(page).locator('[data-status-overview]')).toHaveText('TRV Open · 42%');
  await expect(card(page).locator('[data-status-overview]')).toHaveAttribute('data-output', 'open');
  await expect(card(page).locator('.trend-halo')).toHaveAttribute('stroke', baseline.halo);
  await expect(card(page).locator('[data-device]')).toHaveAttribute('data-health', baseline.health);
  await scenario(page, 'rapid');
  await expectArc(page, colors.below);
  await expect(card(page).locator('.trend-halo')).toHaveAttribute('stroke', '#ff525280');
  await expect(card(page).locator('[data-device]')).toHaveAttribute('data-health', baseline.health);
});

test('rounding tolerance and native target agreement do not accept contradictory observations', async ({ page }) => {
  await load(page);
  for (const [room, nativeTarget, expected] of [[20.04, 22.25, colors.warming], [20.06, 22, colors.below], [20, 22.251, colors.below]]) {
    await scenario(page, 'native_warming');
    await page.evaluate(({ room, nativeTarget }) => {
      const f = responseArcFixture;
      f.hass.states[f.ids.room].state = String(room);
      f.hass.states[f.ids.native].attributes.temperature = nativeTarget;
      f.refresh();
    }, { room, nativeTarget });
    await expectArc(page, expected, expected === colors.warming);
  }
  await scenario(page, 'native_warming');
  await page.evaluate(() => {
    const f = responseArcFixture;
    f.hass.states[f.ids.room].last_changed = new Date(Date.now() + 60000).toISOString();
    f.refresh();
  });
  await expectArc(page, colors.below);
});

test('response expiry is inclusive, passive and visible in the open overview without a new HA update', async ({ page }) => {
  await pausedClock(page);
  await load(page);
  await expectArc(page, colors.warming, true);
  await card(page).locator('[data-device]').click();
  const response = card(page).getByRole('dialog').locator('#section-response');
  await response.locator('summary').click();
  const initial = await page.evaluate(() => ({ deadline: responseArcFixture.card.model().arc.expiresAt, now: Date.now(), refreshCount: responseArcFixture.refreshCount }));
  expect(initial.deadline - initial.now).toBe(8 * 60000);
  await page.clock.runFor(initial.deadline - initial.now);
  await expectArc(page, colors.warming, true);
  await page.clock.runFor(1);
  await expectArc(page, colors.below, false, 'response_expired');
  await expect(response).toContainText('Not established');
  expect(await page.evaluate(() => responseArcFixture.refreshCount)).toBe(initial.refreshCount);
  await page.evaluate(() => {
    const f = responseArcFixture;
    f.hass.states[f.ids.trend].last_updated = new Date(Date.now()).toISOString();
    f.hass.states[f.ids.thermostat].last_updated = new Date(Date.now()).toISOString();
    f.refresh();
  });
  await expectArc(page, colors.below, false, 'response_expired');
});

test('passive expiry preserves the captured target draft and never submits it', async ({ page }) => {
  await pausedClock(page);
  await load(page);
  await expect(marker(page)).toBeEnabled();
  const box = await marker(page).boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2 + 12, box.y + box.height / 2 + 6, { steps: 3 });
  const draft = await page.evaluate(() => {
    const f = responseArcFixture;
    window.responseCapturedMarker = f.card.shadowRoot.querySelector('[data-marker]');
    return { value: f.card._draft, pointer: f.card._drag?.pointer, wait: f.card.model().arc.expiresAt - Date.now() + 1 };
  });
  expect(draft.pointer).toEqual(expect.any(Number));
  expect(draft.value).not.toBe(21);
  await page.clock.runFor(draft.wait);
  await expectArc(page, colors.below, false, 'response_expired');
  expect(await page.evaluate(() => {
    const f = responseArcFixture, node = f.card.shadowRoot.querySelector('[data-marker]');
    return { same: node === window.responseCapturedMarker, value: f.card._draft, pointer: f.card._drag?.pointer, captured: node.hasPointerCapture(f.card._drag?.pointer) };
  })).toEqual({ same: true, value: draft.value, pointer: draft.pointer, captured: true });
  await expect(marker(page)).toHaveAttribute('aria-valuenow', String(draft.value));
  expect(await calls(page)).toEqual([]);
  await page.keyboard.press('Escape');
  await page.mouse.up();
  await expect(marker(page)).toHaveAttribute('aria-valuenow', '21');
});

test('preview, render, overview and reconnect observe response without issuing commands', async ({ page }) => {
  await load(page);
  await page.evaluate(() => { responseArcFixture.card.preview = true; });
  await expect(card(page).locator('[data-preview]')).toBeVisible();
  await expect(marker(page)).toBeDisabled();
  await expectArc(page, colors.warming, true);
  await card(page).locator('[data-device]').click();
  await expect(card(page).getByRole('dialog')).toBeVisible();
  await page.evaluate(() => { const f = responseArcFixture; f.card.render(); f.hass.connected = false; f.refresh(); });
  await expectArc(page, colors.unknown);
  await page.evaluate(() => { const f = responseArcFixture; f.hass.connected = true; f.refresh(); });
  await expectArc(page, colors.warming, true);
  await page.keyboard.press('Escape');
  await page.evaluate(() => { const f = responseArcFixture; f.card.preview = false; f.card.setConfig(f.config); f.refresh(); });
  await expectArc(page, colors.warming, true);
});

for (const [name, viewport, width] of [['phone', { width: 390, height: 844 }, 280], ['tablet', { width: 834, height: 1194 }, 320], ['desktop', { width: 1440, height: 1000 }, 460]]) {
  test(`${name} keeps canonical dial geometry, glint timing and health LED while response changes`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await load(page);
    await page.evaluate(width => document.documentElement.style.setProperty('--fixture-width', `${width}px`), width);
    await expectArc(page, colors.warming, true);
    const before = await geometry(page);
    expect(before.viewBox).toBe('10 0 180 184');
    expect(before.arcs.map(item => [item.r, item['stroke-width']])).toEqual([['72', '3.375'], ['72', '.825']]);
    expect(before.ticks).toHaveLength(21);
    expect(before.ticks.every(tick => tick.duration === '19s' && tick.repeat === 'infinite')).toBe(true);
    expect(before.ticks[1].delay).toBe('-7.31s');
    expect(before.halo).toEqual({ radius: '58', duration: '4s' });
    expect(before.led).toEqual({ width: '6px', height: '6px', animation: 'none' });
    await scenario(page, 'idle');
    await expectArc(page, colors.below);
    expect(await geometry(page)).toEqual(before);
    const bounds = await surface(page).boundingBox();
    expect(bounds.x).toBeGreaterThanOrEqual(0);
    expect(bounds.x + bounds.width).toBeLessThanOrEqual(viewport.width);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  });
}
