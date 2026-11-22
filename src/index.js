// SPDX-License-Identifier: GPL-3.0-only
import { ThermalIntelligenceCard } from './cards/thermostat-card.js';
import { ThermalIntelligenceCardEditor } from './editor/config-editor.js';

import { CARD_TAG, EDITOR_TAG, LEGACY_CARD_TAG, LEGACY_EDITOR_TAG } from './model/config.js';

const version = typeof __TI_VERSION__ === 'undefined' ? 'development' : __TI_VERSION__;
const channel = /^\d+\.\d+\.\d+$/.test(version) ? '' : /-rc\.\d+$/.test(version) ? 'RC' : 'Beta';
for (const [name, constructor] of [
  [CARD_TAG, ThermalIntelligenceCard],
  [EDITOR_TAG, ThermalIntelligenceCardEditor],
  ...(CARD_TAG === LEGACY_CARD_TAG ? [] : [
    [LEGACY_CARD_TAG, class extends ThermalIntelligenceCard {}],
    [LEGACY_EDITOR_TAG, class extends ThermalIntelligenceCardEditor {}],
  ]),
]) {
  const previous = customElements.get(name);
  if (!previous) {
    constructor.tiVersion = version;
    constructor.tiCardType = CARD_TAG;
    customElements.define(name, constructor);
  } else if (previous.tiVersion !== version || previous.tiCardType !== CARD_TAG) {
    console.warn(`Thermal Intelligence: ${name} is already registered by another version or build. Check duplicate resources and refresh the browser.`);
  }
}
window.customCards ??= [];
if (!window.customCards.some(card => card.type === CARD_TAG || card.type === LEGACY_CARD_TAG)) {
  window.customCards.push({
    type: CARD_TAG, name: `Thermal Intelligence Thermostat${channel ? ` · ${channel}` : ''}`,
    description: `A capability-aware thermostat with a visual editor. ${channel ? `${channel}; installs` : 'Installs'} alongside existing Thermal Intelligence cards.`,
    preview: true,
    documentationURL: 'https://github.com/senyo888/thermal-intelligence#readme',
  });
}
