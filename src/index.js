// SPDX-License-Identifier: GPL-3.0-only
import { ThermalIntelligenceCard } from './cards/thermostat-card.js';
import { ThermalIntelligenceCardEditor } from './editor/config-editor.js';

import { CARD_TAG, EDITOR_TAG } from './model/config.js';

const version = typeof __TI_VERSION__ === 'undefined' ? 'development' : __TI_VERSION__;
for (const [name, constructor] of [
  [CARD_TAG, ThermalIntelligenceCard],
  [EDITOR_TAG, ThermalIntelligenceCardEditor],
]) {
  const previous = customElements.get(name);
  if (!previous) {
    constructor.tiVersion = version;
    customElements.define(name, constructor);
  } else if (previous.tiVersion !== version) {
    console.warn(`Thermal Intelligence: ${name} is already registered by another version. Check duplicate resources and refresh the browser.`);
  }
}
window.customCards ??= [];
if (!window.customCards.some(card => card.type === CARD_TAG)) {
  window.customCards.push({
    type: CARD_TAG, name: 'Thermal Intelligence Thermostat · Beta',
    description: 'A capability-aware thermostat with a visual editor. Beta; installs alongside existing Thermal Intelligence cards.',
    preview: true,
    documentationURL: 'https://github.com/senyo888/thermal-intelligence#readme',
  });
}
