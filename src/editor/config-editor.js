// SPDX-License-Identifier: GPL-3.0-only

import { normalizeConfig, TELEMETRY_KINDS } from '../model/config.js';
import { HUMIDITY_DEFAULTS, HUMIDITY_KEYS } from '../model/humidity.js';
import { STATE_TELEMETRY } from '../model/state-telemetry.js';

const UNSAFE_KEYS = new Set(['__proto__', 'prototype', 'constructor']);
const KIND_LABELS = { humidity: 'Humidity', trend: 'Temperature trend', valve: 'Valve position', energy: 'Energy', power: 'Power', custom: 'Custom telemetry', ...Object.fromEntries(Object.entries(STATE_TELEMETRY).map(([key, value]) => [key, value.label])) };
const own = (object, key) => Object.prototype.hasOwnProperty.call(object, key);
const record = (value) => value && typeof value === 'object' && !Array.isArray(value);

function clone(value) {
  return structuredClone(value);
}

/** Update one known field without discarding unknown surrounding configuration. */
export function patchConfig(config, path, value) {
  if (!Array.isArray(path) || !path.length || path.some((key) => UNSAFE_KEYS.has(String(key)))) {
    throw new Error('Invalid editor field.');
  }
  const result = clone(config);
  let target = result;
  for (let index = 0; index < path.length - 1; index += 1) {
    const key = path[index];
    if (!own(target, key) || target[key] === null || typeof target[key] !== 'object') {
      target[key] = typeof path[index + 1] === 'number' ? [] : {};
    }
    target = target[key];
  }
  const key = path.at(-1);
  if (value === undefined) delete target[key];
  else target[key] = clone(value);
  return result;
}

function element(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

const STYLES = `
  :host { display:block; color:var(--primary-text-color,#263342); font-family:var(--paper-font-body1_-_font-family,system-ui,sans-serif); }
  * { box-sizing:border-box; }
  form { display:grid; gap:16px; margin:0; }
  h3 { margin:0; font-size:16px; font-weight:650; }
  p { margin:0; line-height:1.5; }
  .intro { color:var(--secondary-text-color,#566575); font-size:13px; }
  .section { border:1px solid var(--divider-color,rgba(128,145,163,.28)); border-radius:12px; padding:16px; min-width:0; }
  .section > .grid, .section > .stack { margin-top:14px; }
  .grid { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:14px; }
  .stack { display:grid; gap:14px; }
  .field { display:grid; align-content:start; gap:6px; min-width:0; font-size:14px; font-weight:550; }
  .field.wide { grid-column:1/-1; }
  .field small,.hint,.empty { color:var(--secondary-text-color,#566575); font-size:12px; font-weight:400; line-height:1.5; overflow-wrap:anywhere; }
  input,select,button { min-height:44px; font:inherit; color:inherit; border-radius:8px; }
  input,select { width:100%; min-width:0; padding:10px; border:1px solid var(--divider-color,#abb7c4); background:var(--input-fill-color,var(--secondary-background-color,#f4f6f8)); }
  input[aria-invalid=true] { border-color:var(--error-color,#b3261e); }
  input:focus-visible,select:focus-visible,button:focus-visible,summary:focus-visible { outline:3px solid var(--primary-color,#168cbb); outline-offset:2px; }
  input[type=checkbox] { width:22px; height:22px; min-height:22px; margin:0; accent-color:var(--primary-color,#168cbb); flex:none; }
  .check { display:flex; gap:10px; align-items:center; min-height:44px; font-size:14px; }
  .check span { overflow-wrap:anywhere; }
  button { cursor:pointer; padding:9px 14px; background:transparent; border:1px solid var(--divider-color,#abb7c4); font-size:13px; font-weight:600; }
  button:hover { background:var(--secondary-background-color,rgba(128,145,163,.12)); }
  button:disabled { cursor:default; opacity:.45; }
  .add { justify-self:start; color:var(--primary-color,#087aa9); }
  .actions { display:flex; gap:8px; flex-wrap:wrap; align-items:center; }
  .actions button { min-width:44px; }
  .remove { margin-left:auto; }
  details > summary { cursor:pointer; min-height:44px; display:list-item; padding:10px 2px; font-size:15px; font-weight:650; }
  details.section { padding-top:4px; padding-bottom:4px; }
  details[open].section { padding-bottom:16px; }
  .telemetry-row,.feature-row { display:grid; gap:12px; border:1px solid var(--divider-color,rgba(128,145,163,.28)); border-radius:10px; padding:14px; }
  .row-heading { display:flex; justify-content:space-between; gap:12px; align-items:center; font-size:14px; font-weight:650; }
  .preset-row { display:grid; grid-template-columns:minmax(0,1fr) auto; gap:8px; align-items:end; }
  .status { padding:12px 14px; border-radius:9px; font-size:13px; line-height:1.5; overflow-wrap:anywhere; }
  .status[hidden] { display:none; }
  .status.error { color:var(--error-color,#b3261e); background:var(--error-background-color,rgba(179,38,30,.08)); border:1px solid currentColor; }
  .status.info { color:var(--secondary-text-color,#566575); background:var(--secondary-background-color,#f4f6f8); }
  @media(max-width:480px) { .grid { grid-template-columns:minmax(0,1fr); } .section { padding-left:12px; padding-right:12px; } }
  @media(prefers-reduced-motion:reduce) { * { scroll-behavior:auto; } }
`;

export class ThermalIntelligenceCardEditor extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._draft = {};
    this._hass = null;
    this._sourceSignature = null;
    this._lastEmittedSignature = null;
    this._inventorySignature = null;
    this._error = '';
    this._invalidField = '';
    this._buffers = new Map();
    this._sections = new Map();
    this._newPreset = { key: '', label: '' };
    this._pendingInventory = false;
  }

  set hass(value) {
    this._hass = value;
    const signature = this._inventory();
    if (signature === this._inventorySignature && this.shadowRoot.childElementCount) return;
    this._inventorySignature = signature;
    if (this.shadowRoot.activeElement?.matches('input,select')) {
      this._pendingInventory = true;
      return;
    }
    this._render();
  }

  get hass() { return this._hass; }

  setConfig(config) {
    try {
      const copy = clone(config ?? {});
      const signature = JSON.stringify(copy);
      if (signature === this._sourceSignature || signature === this._lastEmittedSignature) {
        this._sourceSignature = signature;
        return;
      }
      this._sourceSignature = signature;
      this._lastEmittedSignature = null;
      this._buffers.clear();
      this._draft = copy;
      try {
        normalizeConfig(copy);
        this._error = '';
        this._invalidField = '';
      } catch (error) {
        this._error = error.message;
      }
    } catch {
      this._error = 'Card configuration must contain serializable values.';
    }
    this._render();
  }

  connectedCallback() {
    if (!this.shadowRoot.childElementCount) this._render();
  }

  _inventory() {
    const states = this._hass?.states ?? {};
    const entities = Object.keys(states).sort().map((id) => [id, states[id]?.attributes?.friendly_name]);
    const presets = states[this._draft?.entity]?.attributes?.preset_modes;
    return JSON.stringify([entities, Array.isArray(presets) ? presets : []]);
  }

  _capture() {
    for (const section of this.shadowRoot.querySelectorAll('details[data-section]')) {
      this._sections.set(section.dataset.section, section.open);
    }
    const active = this.shadowRoot.activeElement;
    if (!active?.dataset.field && !active?.dataset.action) return null;
    return {
      field: active.dataset.field,
      action: active.dataset.action,
      row: active.dataset.row,
      start: active.selectionStart,
      end: active.selectionEnd,
    };
  }

  _restore(snapshot, focusField) {
    const wanted = focusField ?? snapshot?.field;
    const control = wanted
      ? [...this.shadowRoot.querySelectorAll('[data-field]')].find((node) => node.dataset.field === wanted)
      : snapshot?.action
        ? [...this.shadowRoot.querySelectorAll('[data-action]')].find((node) => node.dataset.action === snapshot.action && node.dataset.row === snapshot.row)
        : null;
    if (!control) return;
    control.focus({ preventScroll: true });
    if (!focusField && snapshot?.start != null && typeof control.setSelectionRange === 'function') {
      try { control.setSelectionRange(snapshot.start, snapshot.end); } catch { /* Number/select controls have no caret. */ }
    }
  }

  _commit(next, { field, focus, open, rerender = true } = {}) {
    if (field) this._buffers.delete(field);
    this._draft = next;
    let accepted;
    try {
      accepted = normalizeConfig(next);
      this._draft = clone(accepted);
      this._error = '';
      this._invalidField = '';
    } catch (error) {
      this._error = `${error.message} This draft has not been applied.`;
      this._invalidField = field ?? '';
    }
    if (rerender) this._render({ focus, open });
    else this._refreshFieldState();
    if (!accepted) return;
    this._lastEmittedSignature = JSON.stringify(accepted);
    this.dispatchEvent(new CustomEvent('config-changed', {
      detail: { config: clone(accepted) },
      bubbles: true,
      composed: true,
    }));
  }

  _change(path, value, options = {}) {
    try {
      this._commit(patchConfig(this._draft, path, value), { field: path.join('.'), rerender: false, ...options });
    } catch (error) {
      this._error = error.message;
      this._render();
    }
  }

  _refreshFieldState() {
    const error = this.shadowRoot.querySelector('.status.error');
    if (error) {
      error.textContent = this._error;
      error.hidden = !this._error;
    }
    for (const control of this.shadowRoot.querySelectorAll('[data-field]')) {
      if (control.dataset.field === this._invalidField) control.setAttribute('aria-invalid', 'true');
      else control.removeAttribute('aria-invalid');
    }
    const labels = record(this._draft.preset_labels) ? this._draft.preset_labels : {};
    for (const button of this.shadowRoot.querySelectorAll('[data-action="remove-preset"]')) {
      button.disabled = !own(labels, button.dataset.row);
    }
    const clearBands = this.shadowRoot.querySelector('[data-action="clear-humidity-bands"]');
    if (clearBands) clearBands.disabled = this._draft.humidity_bands === undefined;
    for (const panel of this.shadowRoot.querySelectorAll('.telemetry-row')) {
      const index = Number(panel.dataset.row);
      const kind = this._draft.telemetry?.[index]?.kind;
      panel.querySelector('.row-heading').textContent = `Source ${index + 1} · ${KIND_LABELS[kind] || 'Choose a kind'}`;
    }
  }

  _field(label, key, value, { type = 'text', help, placeholder, options, min, max, step = 'any', list, wide = false, onChange } = {}) {
    const wrapper = element('label', `field${wide ? ' wide' : ''}`);
    wrapper.append(element('span', '', label));
    const control = element(options ? 'select' : 'input');
    control.dataset.field = key;
    control.setAttribute('aria-label', label);
    if (options) {
      for (const [optionValue, optionLabel] of options) {
        const option = element('option', '', optionLabel);
        option.value = optionValue;
        control.append(option);
      }
    } else {
      control.type = type;
      if (type === 'number') control.step = String(step);
      if (placeholder) control.placeholder = placeholder;
      if (min !== undefined) control.min = String(min);
      if (max !== undefined) control.max = String(max);
      if (list) control.setAttribute('list', list);
      control.addEventListener('input', () => this._buffers.set(key, control.value));
    }
    control.value = this._buffers.has(key) ? this._buffers.get(key) : value == null ? '' : String(value);
    if (this._invalidField === key) control.setAttribute('aria-invalid', 'true');
    control.addEventListener('change', () => {
      if (type === 'number' && control.validity.badInput) {
        this._error = 'Enter a valid number. This draft has not been applied.';
        this._invalidField = key;
        this._refreshFieldState();
        return;
      }
      const next = type === 'number' ? control.value === '' ? undefined : Number(control.value) : control.value;
      onChange?.(next);
    });
    control.addEventListener('blur', () => {
      if (!this._pendingInventory) return;
      this._pendingInventory = false;
      queueMicrotask(() => {
        if (!this.shadowRoot.activeElement?.matches('input,select')) this._render();
      });
    });
    wrapper.append(control);
    if (help) wrapper.append(element('small', '', help));
    return wrapper;
  }

  _checkbox(label, key, checked, onChange) {
    const wrapper = element('label', 'check');
    const control = element('input');
    control.type = 'checkbox';
    control.checked = checked;
    control.dataset.field = key;
    control.addEventListener('change', () => onChange(control.checked));
    wrapper.append(control, element('span', '', label));
    return wrapper;
  }

  _button(label, action, callback, { row, disabled = false, className = '', title } = {}) {
    const button = element('button', className, label);
    button.type = 'button';
    button.dataset.action = action;
    if (row !== undefined) button.dataset.row = String(row);
    button.disabled = disabled;
    if (title) button.setAttribute('aria-label', title);
    button.addEventListener('click', callback);
    return button;
  }

  _details(key, title) {
    const details = element('details', 'section');
    details.dataset.section = key;
    details.open = this._sections.get(key) ?? false;
    details.append(element('summary', '', title));
    details.addEventListener('toggle', () => this._sections.set(key, details.open));
    return details;
  }

  _render({ focus, open } = {}) {
    const snapshot = this._capture();
    if (open) this._sections.set(open, true);
    const style = element('style');
    style.textContent = STYLES;
    const form = element('form');
    form.addEventListener('submit', (event) => event.preventDefault());
    form.append(element('p', 'intro', 'These settings belong to this card. Configuring or previewing it does not send heating commands.'));

    const error = element('div', 'status error', this._error);
    error.setAttribute('role', 'alert');
    error.hidden = !this._error;
    form.append(error);

    const basic = element('section', 'section');
    basic.append(element('h3', '', 'Thermostat'));
    const grid = element('div', 'grid');
    const states = this._hass?.states ?? {};
    const climates = Object.keys(states).filter((id) => id.startsWith('climate.')).sort();
    const climateOptions = [['', 'Select a thermostat'], ...climates.map((id) => [id, `${states[id]?.attributes?.friendly_name || id} · ${id}`])];
    const currentEntity = typeof this._draft.entity === 'string' ? this._draft.entity : '';
    if (currentEntity && !climates.includes(currentEntity)) climateOptions.push([currentEntity, `${currentEntity} · currently unavailable`]);
    grid.append(this._field('Thermostat entity', 'entity', currentEntity, {
      options: climateOptions,
      wide: true,
      onChange: (value) => this._change(['entity'], value, { rerender: true }),
    }));
    grid.append(this._field('Provider', 'adapter', this._draft.adapter ?? 'auto', {
      options: [['auto', 'Automatic'], ['standard', 'Standard climate'], ['vtherm', 'Versatile Thermostat']],
      help: 'Detect the provider automatically, or choose it explicitly. Versatile Thermostat must report that it is ready before controls are enabled.',
      onChange: (value) => this._change(['adapter'], value),
    }));
    grid.append(this._field('Card name', 'name', this._draft.name, {
      placeholder: 'Use thermostat name',
      onChange: (value) => this._change(['name'], value || undefined),
    }));
    grid.append(this._field('Background', 'background', this._draft.background ?? 'blue', {
      options: [['blue', 'Midnight Blue'], ['plum', 'Plum'], ['black', 'Black']],
      onChange: (value) => this._change(['background'], value),
    }));
    const display = element('div', 'stack');
    display.append(
      this._checkbox('Show activity', 'show_activity', this._draft.show_activity !== false, (value) => this._change(['show_activity'], value)),
      this._checkbox('Show details', 'show_details', this._draft.show_details !== false, (value) => this._change(['show_details'], value)),
    );
    grid.append(display);
    basic.append(grid);
    if (!climates.length) basic.append(element('p', 'status info', this._hass ? 'No climate entities are available. Add or enable a thermostat in Home Assistant, then select it here. This setup state sends no commands.' : 'Waiting for Home Assistant to provide the thermostat list.'));
    form.append(basic);

    form.append(this._sourceMappings(states), this._responseArc(states), this._features(states), this._telemetry(states), this._presets(states), this._advanced());
    form.append(element('p', 'hint', 'Save the card in Home Assistant when you are finished. Unknown advanced options are preserved.'));
    this.shadowRoot.replaceChildren(style, form);
    this._restore(snapshot, focus);
  }

  _sourceMappings(states) {
    const section = this._details('sources', 'Temperature trend, humidity and valve sources');
    const stack = element('div', 'stack');
    stack.append(element('p', 'hint', 'Map the original card surfaces to explicit sensors. No entity names are guessed. If unset, a matching explicitly configured typed telemetry source can be used.'));
    const datalist = element('datalist');
    datalist.id = 'ti-direct-source-entities';
    for (const id of Object.keys(states).filter((id) => id.startsWith('sensor.')).sort()) {
      const option = element('option'); option.value = id; option.label = states[id]?.attributes?.friendly_name || id; datalist.append(option);
    }
    stack.append(datalist);
    const fields = [
      ['Optional trend entity', 'trend_entity', 'Measured temperature change with a reported temperature-per-time unit.'],
      ['Optional humidity entity', 'humidity_entity', 'A reported percentage, displayed independently of thermostat control.'],
      ['Optional TRV opening sensor (%)', 'valve_position_entity', 'Reported valve opening from 0 to 100%; this does not confirm heating.'],
    ];
    for (const [label, key, help] of fields) stack.append(this._field(label, key, this._draft[key], {
      list: datalist.id, placeholder: 'No direct mapping', help,
      onChange: (value) => this._change([key], value || undefined),
    }));
    section.append(stack);
    return section;
  }

  _responseArc(states) {
    const section = this._details('response-arc', 'Temperature response');
    const stack = element('div', 'stack');
    stack.append(element('p', 'hint', 'Optional, read-only evidence for the Versatile Thermostat response arc. Orange combines an accepted heat request with recent measured warming; it does not confirm physical heat delivery. These mappings use the temperature trend source above and never send heating commands.'));
    const sources = record(this._draft.response_arc) ? this._draft.response_arc : {};
    const lists = {};
    for (const domain of ['sensor', 'climate']) {
      const datalist = element('datalist'); datalist.id = `ti-response-${domain}-entities`; lists[domain] = datalist.id;
      for (const id of Object.keys(states).filter(id=>id.startsWith(`${domain}.`)).sort()) {
        const option = element('option'); option.value = id; option.label = states[id]?.attributes?.friendly_name || id; datalist.append(option);
      }
      stack.append(datalist);
    }
    stack.append(this._field('Room temperature sensor', 'response_arc.room_sensor', sources.room_sensor, {
      list:lists.sensor, placeholder:'No response mapping', help:'The actual room-temperature source must agree with VT’s reading and temperature unit. Leave blank to disable this mapping.',
      onChange:value=>this._change(['response_arc', 'room_sensor'], value),
    }));
    stack.append(element('p', 'hint', 'Choose the evidence route for this thermostat: native target confirmation, or confirmed TRV output with the valve opening sensor configured above. Missing evidence cannot produce an orange response.'));
    const grid = element('div', 'grid');
    for (const [label, key, help] of [
      ['Native thermostat (target confirmation)', 'native_thermostat', 'Use the native thermostat whose reported target confirms VT’s regulated target. Leave blank for the TRV output route.'],
      ['Confirmed TRV output controller', 'confirmed_output', 'Use a controller exposing the supported TRV output-confirmation contract. This is not inferred from its name or an open valve.'],
      ['Optional heat-source thermostat', 'heat_source', 'Reads the mapped thermostat’s mode and reported activity. This does not control it or prove heat delivery.'],
    ]) grid.append(this._field(label, `response_arc.${key}`, sources[key], {
      list:lists.climate, placeholder:'No mapping', help,
      onChange:value=>this._change(['response_arc', key], value),
    }));
    grid.append(this._field('Response evidence freshness (minutes)', 'response_arc.freshness_minutes', sources.freshness_minutes, {
      type:'number', min:0, max:30, placeholder:'10 minutes (default)',
      help:'Greater than 0, up to 30. Limits the age of the room value change and trend update; a shorter VT safety delay still applies. This does not change sensor reporting or heating.',
      onChange:value=>this._change(['response_arc', 'freshness_minutes'], value),
    }));
    stack.append(grid); section.append(stack); return section;
  }

  _features(states) {
    const rows = Array.isArray(this._draft.features) ? this._draft.features : [];
    const section = this._details('features', `Custom telemetry & features${rows.length ? ` · ${rows.length}` : ''}`);
    const stack = element('div', 'stack');
    stack.append(element('p', 'hint', 'Choose named extras for the header and Controls & features. Associate a temperature reading with an exact provider preset to show its header indicator only when that preset is selected. Names and target matches never select presets.'));
    const datalist = element('datalist'); datalist.id = 'ti-feature-entities';
    for (const id of Object.keys(states).sort()) {
      const option = element('option'); option.value = id; option.label = states[id]?.attributes?.friendly_name || id; datalist.append(option);
    }
    stack.append(datalist);
    if (!rows.length) stack.append(element('p', 'empty', 'No custom features configured.'));
    rows.forEach((entry, index) => {
      const row = record(entry) ? entry : {};
      const panel = element('div', 'feature-row'); panel.dataset.row = String(index);
      panel.append(element('div', 'row-heading', `Feature ${index + 1}`));
      const grid = element('div', 'grid');
      const fields = [
        ['Entity', 'entity', { list: datalist.id, placeholder: 'Select or enter an entity' }],
        ['Display label', 'label', { placeholder: 'Use source name' }],
        ['Attribute path', 'attribute', { placeholder: 'Entity state', help: 'Own-property paths only, such as safety_manager.safety_state.' }],
        ['Unit', 'unit', { placeholder: 'Use reported state unit', help: 'Supply attribute units explicitly. This setting does not convert values.' }],
        ['Icon', 'icon', { placeholder: 'mdi:information-outline', help: 'A named icon, such as mdi:thermometer.' }],
      ];
      for (const [label, key, options] of fields) grid.append(this._field(`Feature ${index + 1} ${label.toLowerCase()}`, `features.${index}.${key}`, row[key], {
        ...options, onChange: (value) => this._change(['features', index, key], value === '' && key !== 'entity' ? undefined : value),
      }));
      const suppliedPresets = states[this._draft.entity]?.attributes?.preset_modes;
      const advertisedPresets = Array.isArray(suppliedPresets) ? suppliedPresets.filter((value) => typeof value === 'string' && value.trim()) : [];
      const presetOptions = [['', 'Unassociated'], ...[...new Set(advertisedPresets)].map((value) => [value, value])];
      if (typeof row.preset === 'string' && !advertisedPresets.includes(row.preset)) presetOptions.push([row.preset, `${row.preset} · not currently advertised`]);
      grid.append(this._field(`Feature ${index + 1} preset association`, `features.${index}.preset`, row.preset ?? '', {
        options: presetOptions, help: 'The exact provider preset value. Requires a compatible numeric temperature source; this setting never selects a preset.',
        onChange: (value) => this._change(['features', index, 'preset'], value || undefined),
      }));
      panel.append(grid);
      const actions = element('div', 'actions');
      const move = (offset) => {
        const next = clone(this._draft);
        [next.features[index], next.features[index + offset]] = [next.features[index + offset], next.features[index]];
        this._buffers.clear(); this._commit(next, { focus: `features.${index + offset}.entity`, open: 'features' });
      };
      actions.append(
        this._button('↑', 'move-feature-up', () => move(-1), { row: index, disabled: index === 0, title: `Move feature ${index + 1} up` }),
        this._button('↓', 'move-feature-down', () => move(1), { row: index, disabled: index === rows.length - 1, title: `Move feature ${index + 1} down` }),
        this._button('Remove', 'remove-feature', () => {
          const next = clone(this._draft); next.features.splice(index, 1); this._buffers.clear();
          this._commit(next, { focus: next.features.length ? `features.${Math.min(index, next.features.length - 1)}.entity` : undefined, open: 'features' });
          if (!next.features.length) this.shadowRoot.querySelector('[data-action="add-feature"]').focus({ preventScroll: true });
        }, { row: index, className: 'remove', title: `Remove feature ${index + 1}` }),
      );
      panel.append(actions); stack.append(panel);
    });
    stack.append(this._button('Add feature', 'add-feature', () => {
      const next = clone(this._draft), currentRows = Array.isArray(next.features) ? next.features : [];
      next.features = [...currentRows, { entity: '' }];
      this._commit(next, { focus: `features.${currentRows.length}.entity`, open: 'features' });
    }, { className: 'add' }));
    section.append(stack);
    return section;
  }

  _telemetry(states) {
    const rows = Array.isArray(this._draft.telemetry) ? this._draft.telemetry : [];
    const section = this._details('telemetry', `Optional telemetry${rows.length ? ` · ${rows.length}` : ''}`);
    const stack = element('div', 'stack');
    stack.append(element('p', 'hint', 'Each source degrades independently. Leave a source blank to disable that row; labels and colours do not define thermostat policy.'));
    const datalist = element('datalist');
    datalist.id = 'ti-telemetry-entities';
    for (const id of Object.keys(states).sort()) {
      const option = element('option');
      option.value = id;
      option.label = states[id]?.attributes?.friendly_name || id;
      datalist.append(option);
    }
    stack.append(datalist);
    if (!rows.length) stack.append(element('p', 'empty', 'No optional sources configured.'));
    rows.forEach((entry, index) => {
      const row = record(entry) ? entry : {};
      const panel = element('div', 'telemetry-row');
      panel.dataset.row = String(index);
      panel.append(element('div', 'row-heading', `Source ${index + 1} · ${KIND_LABELS[row.kind] || 'Choose a kind'}`));
      const grid = element('div', 'grid');
      const field = (label, key, options = {}) => this._field(label, `telemetry.${index}.${key}`, row[key], {
        ...options,
        onChange: (value) => this._change(['telemetry', index, key], value === '' && key !== 'entity' ? undefined : value),
      });
      grid.append(field(`Source ${index + 1} kind`, 'kind', { options: TELEMETRY_KINDS.map((kind) => [kind, KIND_LABELS[kind]]) }));
      grid.append(field(`Source ${index + 1} entity`, 'entity', { list: datalist.id, placeholder: 'Select or enter an entity', help: 'Suggestions come from Home Assistant; the configured ID is never guessed.' }));
      grid.append(field(`Source ${index + 1} attribute`, 'attribute', { placeholder: 'Entity state', help: 'Optional nested attribute path, such as power_manager.current_power.' }));
      grid.append(field(`Source ${index + 1} label`, 'label', { placeholder: 'Use source name' }));
      grid.append(field(`Source ${index + 1} unit`, 'unit', { placeholder: 'Use reported unit', help: 'For an attribute with no unit metadata. Known telemetry kinds still validate units.' }));
      grid.append(field(`Source ${index + 1} maximum age (seconds)`, 'max_age_seconds', { type: 'number', min: 0, placeholder: 'No age limit', help: 'Set only when the source has a known reporting interval. Old readings become stale.' }));
      panel.append(grid);
      const actions = element('div', 'actions');
      const move = (offset) => {
        const next = clone(this._draft);
        [next.telemetry[index], next.telemetry[index + offset]] = [next.telemetry[index + offset], next.telemetry[index]];
        this._buffers.clear();
        this._commit(next, { focus: `telemetry.${index + offset}.kind`, open: 'telemetry' });
      };
      actions.append(
        this._button('↑', 'move-telemetry-up', () => move(-1), { row: index, disabled: index === 0, title: `Move source ${index + 1} up` }),
        this._button('↓', 'move-telemetry-down', () => move(1), { row: index, disabled: index === rows.length - 1, title: `Move source ${index + 1} down` }),
        this._button('Remove', 'remove-telemetry', () => {
          const next = clone(this._draft);
          next.telemetry.splice(index, 1);
          this._buffers.clear();
          this._commit(next, { focus: next.telemetry.length ? `telemetry.${Math.min(index, next.telemetry.length - 1)}.kind` : undefined, open: 'telemetry' });
          if (!next.telemetry.length) this.shadowRoot.querySelector('[data-action="add-telemetry"]').focus({ preventScroll: true });
        }, { row: index, className: 'remove', title: `Remove source ${index + 1}` }),
      );
      panel.append(actions);
      stack.append(panel);
    });
    stack.append(this._button('Add telemetry source', 'add-telemetry', () => {
      const next = clone(this._draft);
      const currentRows = Array.isArray(next.telemetry) ? next.telemetry : [];
      next.telemetry = [...currentRows, { kind: 'custom', entity: '' }];
      this._commit(next, { focus: `telemetry.${currentRows.length}.entity`, open: 'telemetry' });
    }, { className: 'add' }));
    section.append(stack);
    return section;
  }

  _presets(states) {
    const section = this._details('presets', 'Preset display labels');
    const stack = element('div', 'stack');
    stack.append(element('p', 'hint', 'Change display labels only. Service values remain provider-owned, including Frost where exposed. A matching target temperature never selects a preset.'));
    const supplied = states[this._draft.entity]?.attributes?.preset_modes;
    const available = Array.isArray(supplied) ? supplied.filter((value) => typeof value === 'string') : [];
    const labels = record(this._draft.preset_labels) ? this._draft.preset_labels : {};
    const keys = [...new Set([...available, ...Object.keys(labels)])];
    for (const key of keys) {
      const row = element('div', 'preset-row');
      row.append(this._field(`Label for ${key}`, `preset_labels.${key}`, labels[key], {
        placeholder: key,
        help: available.includes(key) ? 'Provider preset value' : 'Saved mapping; not currently advertised by this provider.',
        onChange: (value) => this._change(['preset_labels', key], value || undefined),
      }));
      row.append(this._button('Reset', 'remove-preset', () => this._change(['preset_labels', key], undefined, { focus: available.includes(key) ? `preset_labels.${key}` : 'new-preset-key', rerender: true }), { row: key, disabled: !own(labels, key), title: `Reset label for ${key}` }));
      stack.append(row);
    }
    if (!keys.length) stack.append(element('p', 'empty', 'The selected thermostat has not advertised any presets. You can add a display mapping for a known provider value.'));
    const grid = element('div', 'grid');
    grid.append(this._field('Provider preset value', 'new-preset-key', this._newPreset.key, {
      placeholder: 'Exact provider value', onChange: (value) => { this._newPreset.key = value; },
    }));
    grid.append(this._field('Display label', 'new-preset-label', this._newPreset.label, {
      placeholder: 'Display label', onChange: (value) => { this._newPreset.label = value; },
    }));
    stack.append(grid);
    stack.append(this._button('Add preset label', 'add-preset', () => {
      const key = (this._buffers.get('new-preset-key') ?? this._newPreset.key).trim();
      const label = (this._buffers.get('new-preset-label') ?? this._newPreset.label).trim();
      if (!key || !label) {
        this._error = 'Enter both the exact provider preset value and its display label.';
        this._render({ focus: !key ? 'new-preset-key' : 'new-preset-label', open: 'presets' });
        return;
      }
      this._newPreset = { key: '', label: '' };
      this._buffers.delete('new-preset-key');
      this._buffers.delete('new-preset-label');
      this._change(['preset_labels', key], label, { focus: `preset_labels.${key}`, open: 'presets', rerender: true });
    }, { className: 'add' }));
    section.append(stack);
    return section;
  }

  _advanced() {
    const section = this._details('advanced', 'Advanced display settings');
    const stack = element('div', 'stack');
    stack.append(this._field('Temperature step override', 'step', this._draft.step, {
      type: 'number', min: 0, placeholder: 'Use provider step',
      help: 'Used only when the provider omits its step. The provider limits and reported step remain authoritative.',
      onChange: (value) => this._change(['step'], value),
    }));
    const bands = record(this._draft.humidity_bands) ? this._draft.humidity_bands : { ...HUMIDITY_DEFAULTS };
    const legacy = own(bands, 'low') || own(bands, 'high');
    const bandGrid = element('div', 'grid');
    const labels = { dry_below: 'Too dry below', good_min: 'Good range minimum', good_max: 'Good range maximum', wet_above: 'Too wet above', low: 'Legacy low', high: 'Legacy high' };
    for (const key of legacy ? ['low', 'high'] : HUMIDITY_KEYS) bandGrid.append(this._field(`Humidity ${labels[key].toLowerCase()} (%)`, `humidity_bands.${key}`, bands[key], {
      type: 'number', min: 0, max: 100, step: legacy ? 'any' : 1,
      onChange: (value) => {
        const current = this._draft.humidity_bands === undefined ? { ...HUMIDITY_DEFAULTS } : this._draft.humidity_bands;
        this._change(['humidity_bands'], { ...current, [key]: value }, { open: 'advanced' });
      },
    }));
    stack.append(element('p', 'hint', legacy ? 'Legacy two-bound format is preserved explicitly. Reset to source defaults to use the original five display bands. These are local display guides, not HI targets or control thresholds.' : 'Original five-band humidity display guides default to 30, 40, 60 and 70%. All four ordered integer boundaries must be valid. These are local display guides, not HI targets or control thresholds.'));
    stack.append(bandGrid);
    stack.append(this._button('Reset humidity guides to source defaults', 'clear-humidity-bands', () => {
      const preserved = { ...(this._draft.humidity_bands ?? {}) };
      for (const key of [...HUMIDITY_KEYS, 'low', 'high']) delete preserved[key];
      this._change(['humidity_bands'], Object.keys(preserved).length ? { ...preserved, ...HUMIDITY_DEFAULTS } : undefined, { open: 'advanced', rerender: true, focus: 'humidity_bands.dry_below' });
    }, { disabled: this._draft.humidity_bands === undefined }));
    section.append(stack);
    return section;
  }
}
