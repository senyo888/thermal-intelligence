// SPDX-License-Identifier: GPL-3.0-only
import { test, expect } from '@playwright/test';

for (const order of ['legacy-first', 'beta-first']) {
  test(`beta card and editor coexist with legacy registrations: ${order}`, async ({ page }) => {
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto('/tests/fixtures/index.html');
    // A fresh document avoids the fixture's automatic module registration.
    await page.goto('/tests/fixtures/coexistence.html');
    const result = await page.evaluate(async order => {
      class LegacyCard extends HTMLElement {}
      class LegacyEditor extends HTMLElement {}
      const legacy = () => {
        customElements.define('thermal-intelligence-card', LegacyCard);
        customElements.define('thermal-intelligence-card-editor', LegacyEditor);
        window.customCards ??= [];
        window.customCards.push({ type: 'thermal-intelligence-card', name: 'Existing TI' });
      };
      if (order === 'legacy-first') legacy();
      await import('/dist/thermal-intelligence.js');
      const Card = customElements.get('thermal-intelligence-beta-card');
      const Editor = customElements.get('thermal-intelligence-beta-card-editor');
      if (order === 'beta-first') legacy();
      await import('/dist/thermal-intelligence.js?duplicate=1');
      const element = new Card();
      element.preview = true;
      let calls = 0;
      element.hass = { states: {}, callService: () => { calls++; }, connected: true };
      document.body.append(element);
      const configEditor = await Card.getConfigElement();
      return {
        legacyPreserved: customElements.get('thermal-intelligence-card') === LegacyCard && customElements.get('thermal-intelligence-card-editor') === LegacyEditor,
        betaPreserved: customElements.get('thermal-intelligence-beta-card') === Card,
        editorCorrect: configEditor instanceof Editor,
        stub: Card.getStubConfig({ states: {} }).type,
        picker: window.customCards.map(card => card.type), calls,
      };
    }, order);
    expect(result).toEqual({
      legacyPreserved: true, betaPreserved: true, editorCorrect: true,
      stub: 'custom:thermal-intelligence-beta-card',
      picker: order === 'legacy-first' ? ['thermal-intelligence-card', 'thermal-intelligence-beta-card'] : ['thermal-intelligence-beta-card', 'thermal-intelligence-card'], calls: 0,
    });
    expect(errors).toEqual([]);
  });
}
