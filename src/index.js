// SPDX-License-Identifier: GPL-3.0-only
import { ThermalIntelligenceCard } from './cards/thermostat-card.js';
import { ThermalIntelligenceCardEditor } from './editor/config-editor.js';

const version = typeof __TI_VERSION__ === 'undefined' ? 'development' : __TI_VERSION__;
for (const [name, constructor] of [
  ['thermal-intelligence-card', ThermalIntelligenceCard],
  ['thermal-intelligence-card-editor', ThermalIntelligenceCardEditor],
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
if (!window.customCards.some(card => card.type === 'thermal-intelligence-card')) {
  window.customCards.push({
    type: 'thermal-intelligence-card', name: 'Thermal Intelligence Thermostat',
    description: 'A capability-aware thermostat with a visual editor. Standalone development preview.',
    preview: true,
    documentationURL: 'https://github.com/senyo888/thermal-intelligence#readme',
  });
}
