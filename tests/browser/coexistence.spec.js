// SPDX-License-Identifier: GPL-3.0-only
import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { build } from 'esbuild';
const version = JSON.parse(readFileSync(new URL('../../package.json', import.meta.url), 'utf8')).version;

const current = 'thermal-intelligence-thermostat';
const legacy = 'thermal-intelligence-beta-card';
const identities = new Map([[version, current], ['1.0.1-beta.1', current], ['1.0.1-rc.1', current],
  ['1.0.0', current], ['0.1.0-rc.4', legacy], ['1.0.0-beta.1', legacy]]);
for (const [identity, tag] of identities) {
for (const order of ['legacy-first', 'beta-first']) {
  test(`${identity} card and editor coexist with legacy registrations: ${order}`, async ({ page }) => {
    if (identity !== version) {
      const result = await build({ entryPoints: ['src/index.js'], bundle: true, format: 'esm', write: false,
        define: { __TI_VERSION__: JSON.stringify(identity) } });
      await page.route('**/dist/thermal-intelligence.js*', route => route.fulfill({ contentType: 'text/javascript', body: result.outputFiles[0].text }));
    }
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto('/tests/fixtures/index.html');
    // A fresh document avoids the fixture's automatic module registration.
    await page.goto('/tests/fixtures/coexistence.html');
    const result = await page.evaluate(async ({order,tag}) => {
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
      const Editor = customElements.get(tag + '-editor');
      if (order === 'beta-first') legacy();
      await import('/dist/thermal-intelligence.js?duplicate=1');
      const element = new Card();
      element.preview = true;
      let calls = 0;
      element.hass = { states: {}, callService: () => { calls++; }, connected: true };
      document.body.append(element);
      const configEditor = await Card.getConfigElement();
      const stub = Card.getStubConfig({states:{}});
      const fromYaml = document.createElement(stub.type.slice('custom:'.length));
      fromYaml.setConfig({...stub, future_option:{preserved:true}});
      const alias = new Card();
      alias.setConfig({type:'custom:thermal-intelligence-beta-card', future_option:{preserved:true}});
      const exportable = fromYaml.config.type === stub.type && fromYaml.config.future_option.preserved
        && alias.config.type === stub.type && alias.config.future_option.preserved;

      return {
        legacyPreserved: customElements.get('thermal-intelligence-card') === LegacyCard && customElements.get('thermal-intelligence-card-editor') === LegacyEditor,
        betaPreserved: customElements.get('thermal-intelligence-beta-card') === Card,
        editorCorrect: configEditor instanceof Editor, exportable,
        stub: Card.getStubConfig({ states: {} }).type,
        picker: window.customCards.map(card => card.type), calls,
        version: Card.tiVersion,
        pickerName: window.customCards.find(card => card.type === tag).name,
      };
    }, {order,tag});
    expect(result).toEqual({
      legacyPreserved: true, betaPreserved: true, editorCorrect: true, exportable:true,
      version: identity, pickerName: `Thermal Intelligence Thermostat${identity.includes('-') ? ` · ${identity.includes('-rc.') ? 'RC' : 'Beta'}` : ''}`,
      stub: 'custom:'+tag,
      picker: order === 'legacy-first' ? ['thermal-intelligence-card', tag] : [tag, 'thermal-intelligence-card'], calls: 0,
    });
    expect(errors).toEqual([]);
  });
}
}

test('stable resource detects an already registered RC without replacing it', async ({ page }) => {
  const warnings = [];
  page.on('console', message => { if (message.type() === 'warning') warnings.push(message.text()); });
  const rc = await build({ entryPoints: ['src/index.js'], bundle: true, format: 'esm', write: false,
    define: { __TI_VERSION__: JSON.stringify('0.1.0-rc.4') } });
  await page.route('**/dist/thermal-intelligence.js', route => route.fulfill({ contentType: 'text/javascript', body: rc.outputFiles[0].text }));
  await page.goto('/tests/fixtures/coexistence.html');
  await page.evaluate(async () => { await import('/dist/thermal-intelligence.js'); window.originalCard = customElements.get('thermal-intelligence-beta-card'); });
  const result = await build({ entryPoints: ['src/index.js'], bundle: true, format: 'esm', write: false,
    define: { __TI_VERSION__: JSON.stringify('1.0.0') } });
  await page.route('**/stable-identity.js', route => route.fulfill({ contentType: 'text/javascript', body: result.outputFiles[0].text }));
  const preserved = await page.evaluate(async () => {
    await import('/stable-identity.js');
    return customElements.get('thermal-intelligence-beta-card') === window.originalCard &&
      window.customCards.filter(card => card.type === 'thermal-intelligence-beta-card').length === 1;
  });
  expect(preserved).toBe(true);
  expect(warnings.filter(message => message.includes('already registered by another version'))).toHaveLength(2);
});
