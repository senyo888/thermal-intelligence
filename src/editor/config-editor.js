// SPDX-License-Identifier: GPL-3.0-only

import { normalizeConfig, assertConfigAuthorityData, TELEMETRY_KINDS } from '../model/config.js';
import { HUMIDITY_DEFAULTS, HUMIDITY_KEYS, humidityBands, humidityBand, humidityGradient, moveHumidityBoundary } from '../model/humidity.js';
import { STATE_TELEMETRY } from '../model/state-telemetry.js';
import { mappedControl } from '../model/mapped-control.js';
import { buildModel } from '../model/climate.js';
import { sourceSuggestions } from './source-suggestions.js';
import { IconOptions, iconOptionsStyles } from './icon-options.js';
import { bindActivationFeedback, feedbackStyles } from '../cards/interaction-feedback.js';

const UNSAFE_KEYS = new Set(['__proto__', 'prototype', 'constructor']);
const KIND_LABELS = { temperature: 'Temperature', humidity: 'Humidity', trend: 'Temperature trend', valve: 'Valve position', energy: 'Energy', power: 'Power', custom: 'Custom telemetry', ...Object.fromEntries(Object.entries(STATE_TELEMETRY).map(([key, value]) => [key, value.label])) };
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
  :host { display:block; color:var(--primary-text-color,#263342); --ti-press-background:var(--secondary-background-color,#dbeaf4); --ti-press-border:var(--primary-color,#168cbb); font-family:var(--paper-font-body1_-_font-family,system-ui,sans-serif); }
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
  .reading-list { display:grid;gap:8px; }
  .reading-preview { display:grid;gap:5px;padding:12px;border:1px solid var(--divider-color,#abb7c4);border-radius:10px;overflow-wrap:anywhere;font-size:13px; }
  .reading-preview strong { display:flex;gap:8px;justify-content:space-between;flex-wrap:wrap; }
  .reading-preview .reading-label { display:inline-flex;gap:8px;align-items:center; }
  .reading-preview ha-icon { width:20px;height:20px;--mdc-icon-size:20px;flex:none; }
  .reading-preview small { color:var(--secondary-text-color,#566575);line-height:1.5; }
  .reading-preview[data-status=invalid],.reading-preview[data-status=unavailable] { border-left:3px solid var(--warning-color,#b87225); }
  .humidity-gradient { height:14px;border-radius:7px; }
  .humidity-preview { display:grid;gap:10px;padding:14px;background:var(--secondary-background-color,#f4f6f8);border-radius:10px; }
  .humidity-slider { display:grid;gap:5px;font-size:13px; }
  input[type=range] { padding:0;accent-color:var(--primary-color,#168cbb); }
  .search-results { min-height:44px; }
  .editor-route { padding:12px 14px;border-left:3px solid var(--primary-color,#168cbb);border-radius:6px;background:var(--secondary-background-color,#f4f6f8);font-size:13px; }
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
    this._newSwitch = { entity: '', label: '', icon: 'mdi:power' };
    this._pendingInventory = false;
    this._switchQuery = '';
    this._registry = null;
    this._registryContext = null;
    this._suggestionGeneration = 0;
    this._suggestionMessage = '';
    bindActivationFeedback(this.shadowRoot);
    this.shadowRoot.addEventListener('focusout', event => this._flushInventory(event));
  }

  set hass(value) {
    this._hass = value;
    const contextChanged = this._registryContext && !this._sameSuggestionContext(this._registryContext);
    if (contextChanged) {
      this._registry = null;
      this._registryContext = null;
      this._suggestionGeneration++;
      this._suggestionMessage = 'Home Assistant or this draft changed. Check sources again before adding one.';
    }
    const signature = this._inventory();
    if (!contextChanged && signature === this._inventorySignature && this.shadowRoot.childElementCount) { this._refreshPreviews(); return; }
    this._inventorySignature = signature;
    if (this.shadowRoot.activeElement) {
      this._pendingInventory = true;
      return;
    }
    this._render();
  }

  get hass() { return this._hass; }

  setConfig(config) {
    try {
      assertConfigAuthorityData(config ?? {});
      const copy = clone(config ?? {});
      const signature = JSON.stringify(copy);
      if (signature === this._sourceSignature || signature === this._lastEmittedSignature) {
        this._sourceSignature = signature;
        return;
      }
      this._sourceSignature = signature;
      this._lastEmittedSignature = null;
      this._suggestionGeneration++;
      this._registry=null;this._registryContext=null;this._suggestionMessage='';
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

  disconnectedCallback() { this._suggestionGeneration++; this._registry = null; this._registryContext = null; }

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
    this._suggestionGeneration++;
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
    this._refreshPreviews();
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
    wrapper.append(control);
    if (help) wrapper.append(element('small', '', help));
    return wrapper;
  }

  _flushInventory(event) {
    // A null relatedTarget can be an in-progress pointer focus transition. Do not
    // replace its button or summary before the click/default action completes.
    const next = event?.relatedTarget;
    if (!this._pendingInventory || !next || next.getRootNode() === this.shadowRoot) return;
    queueMicrotask(() => {
      if (this.shadowRoot.activeElement) return;
      this._pendingInventory = false;
      this._render();
    });
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
    style.textContent = STYLES + feedbackStyles + iconOptionsStyles;
    const form = element('form');
    form.addEventListener('submit', (event) => event.preventDefault());
    form.append(element('p', 'editor-route', this.exportOnly ? 'Advanced draft — changes here are not saved. Copy the configuration, then save it in Home Assistant’s Edit card.' : 'Configure this card, then choose Save in Home Assistant. Cancel keeps the saved configuration.'));
    form.append(element('p', 'intro', 'Display settings and source selection do not send thermostat or switch commands.'));

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

    const readings = this._sourceMappings(states);
    readings.append(this._outsideTemperature(states), this._sourcePreviewPanel(), this._suggestionPanel());
    readings.append(this._iconDisplay(), this._features(states), this._telemetry(states));
    form.append(readings, this._controlSources(states), this._humidityDisplay(), this._optionalSwitch(states), this._responseArc(states), this._presets(states), this._advanced());
    form.append(element('p', 'hint', 'Save the card in Home Assistant when you are finished. Unknown advanced options are preserved.'));
    this.shadowRoot.replaceChildren(style, form);
    this._refreshPreviews();
    this._restore(snapshot, focus);
  }

  _iconDisplay() {
    const section=this._details('header-icons','Top row icon settings');
    const host=element('div');section.append(host);
    this._iconOptions=new IconOptions(host,next=>this._commit(next,{rerender:false}));
    return section;
  }

  _controlSources(states) {
    const section=this._details('control-sources','Control source, House policy and schedule');
    section.append(element('p','hint','Optional observations only. A provider preset, a House policy and an active schedule are different signals. These mappings never select a controller or run a schedule.'));
    const list=element('datalist');list.id='ti-control-source-entities';
    for(const id of Object.keys(states).sort()){const option=element('option');option.value=id;list.append(option);}section.append(list);
    for(const [key,title,note] of [
      ['control_source','Control source','Exact reported values: House, Schedule, Manual, VT, Provider, Policy, Other, Pending or Unknown. For a confirmed ownership source, set its thermostat and readiness attributes below.'],
      ['house_preset','House preset','Map the effective policy, not a command selector. Frost, Eco, Comfort and Boost are shown with a House label; this does not mean this room follows House.'],
      ['schedule_preset','Schedule mode','Map the last confirmed Frost, Eco, Comfort or Boost intent from the schedule controller. Set its thermostat and readiness attributes when available. It joins the calendar only during confirmed Schedule ownership; it does not prove that a period or Boost timer is running.'],
      ['schedule','Schedule activity','An on/off or true/false source, including a schedule entity. Activity does not establish control ownership.'],
    ]) {
      const mapping=this._draft[key]??{},grid=element('div','grid');
      section.append(element('h3','',title),element('p','hint',note));
      for(const [field,name,help] of [['entity','entity',key==='schedule_preset'?'Leave empty to disable this badge. Removing the entire mapping in YAML restores the thermostat-preset fallback.':'Leave empty to remove this observation.'],['attribute','value attribute','Leave empty to read the entity state.'],['climate_attribute','thermostat attribute','Optional attribute that must equal this card’s climate entity, such as climate_entity.'],['ready_attribute','readiness attribute','Optional attribute that must be literal true, such as intent_ready.']]) {
        grid.append(this._field(`${title} ${name}`,`${key}.${field}`,mapping[field]??'',{...(field==='entity'?{list:list.id}:{}),help,onChange:value=>{
          const next=clone(this._draft);next[key]={...next[key],entity:next[key]?.entity??''};
          if(value||field==='entity')next[key][field]=value;else delete next[key][field];
          this._commit(next);
        }}));
      }
      grid.append(this._field(`${title} maximum age (seconds)`,`${key}.max_age_seconds`,mapping.max_age_seconds??'',{type:'number',help:'Optional. Use only a timeout defined by this source’s contract; an unchanged value need not be stale.',onChange:value=>{
        const next=clone(this._draft);next[key]={...next[key],entity:next[key]?.entity??''};
        if(value===undefined)delete next[key].max_age_seconds;else next[key].max_age_seconds=value;
        this._commit(next);
      }}));
      const guards=mapping.clear_attributes;
      const guardText=Array.isArray(guards)&&guards.every(path=>typeof path==='string')?guards.join(', '):typeof guards==='string'?guards:guards===undefined?'':JSON.stringify(guards);
      grid.append(this._field(`${title} clear attributes`,`${key}.clear_attributes`,guardText,{help:'Optional comma-separated attribute paths that must each exist and be null, such as a pending transaction or storage error. Use only fields defined by this source.',onChange:value=>{
        const next=clone(this._draft);next[key]={...next[key],entity:next[key]?.entity??''};
        if(value.trim())next[key].clear_attributes=value.split(',').map(path=>path.trim());else delete next[key].clear_attributes;
        this._commit(next);
      }}));
      section.append(grid);
    }
    return section;
  }

  _previewIdentity() {
    const context=this._displayProvider?.context;
    if(context&&this._sameSuggestionContext({...context,signature:JSON.stringify(this._draft)}))return this._displayProvider.identity;
    const cached=this._hass?.entities?.[this._draft.entity];
    return cached?.entity_id===this._draft.entity?cached:undefined;
  }

  _sourceMappings(states) {
    const section = this._details('sources', 'Readings and icons');
    const stack = element('div', 'stack');
    stack.append(element('p', 'hint', 'Choose the sources shown on this card. A label or icon changes presentation; it does not select or enable a thermostat feature. Existing typed sources can supply an unset direct mapping.'));
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

  _sourcePreviewPanel() {
    const panel = element('div', 'stack');
    panel.append(element('h3', '', 'Preview and source details'));
    const rows = element('div', 'reading-list');
    rows.dataset.readingPreview = '';
    rows.setAttribute('aria-label', 'Reading preview');
    panel.append(rows);
    return panel;
  }

  _refreshPreviews() {
    let model;
    try { model = buildModel(this._hass ?? {}, this._draft, this._previewIdentity()); }
    catch { /* Invalid drafts keep their fields without inventing a preview. */ }
    this._iconOptions?.update(model,this._draft,!model);
    const container = this.shadowRoot.querySelector('[data-reading-preview]');
    if (container) {
      const rows = model?.headerTelemetry ?? [];
      container.replaceChildren();
      if (!model) container.append(element('p','hint','Correct the draft to preview its readings.'));
      else if (!rows.length) container.append(element('p','hint','No top-row readings configured. Add Outside temperature or a named reading below.'));
      for (const original of rows) {
        // A provider-dependent accepted state must not look healthy before identity is checked.
        const semantic = STATE_TELEMETRY[original.kind];
        const unverified = original.status === 'available' && model.provider.kind === 'unknown' && semantic && original.source.entity === this._draft.entity
          && (original.source.attribute === semantic.path || original.source.attribute === 'window_manager.window_auto_state');
        const row = unverified ? {...original,status:'unknown',value:'Unknown',detail:'Provider identity has not been checked in this editor. Use Find VT sources to verify this accepted feature state.'} : original;
        const item = element('div','reading-preview'); item.dataset.status = row.status;
        const heading = element('strong');
        const label = element('span','reading-label');
        const icon = element('ha-icon'); icon.setAttribute('icon',row.icon); icon.setAttribute('aria-hidden','true');
        label.append(icon,element('span','',row.label));heading.append(label);
        heading.append(element('span','',row.value ?? row.status));
        const source = row.source;
        item.append(heading,element('small','',`${source.entity || 'No source'}${source.attribute ? ' → ' + source.attribute : ''}${source.unitAttribute ? ' · unit: ' + source.unitAttribute : ''}`));
        item.append(element('small','',row.detail));
        if (source.timestamp) item.append(element('small','','HA entity update: ' + source.timestamp));
        container.append(item);
      }
      if (model?.trend?.source) container.append(element('p','hint','Dial trend: ' + model.trend.text));
    }
    const bands = humidityBands(this._draft), preview = this.shadowRoot.querySelector('[data-humidity-preview]');
    if (preview) {
      const humidity = model?.humidity;
      const value = humidity?.status === 'available' ? humidity.value : null;
      const band = humidityBand(value,bands);
      preview.querySelector('[data-humidity-gradient]').style.background = humidityGradient(bands);
      preview.querySelector('[data-humidity-reading]').textContent = bands
        ? `${value === null ? 'Reading unavailable' : value + '% · ' + band.label} · local display guide`
        : 'Correct the boundaries to preview the display guide.';
      for (const input of this.shadowRoot.querySelectorAll('[data-humidity-slider]')) {
        const key = input.dataset.humiditySlider;
        input.disabled = !bands;
        if (bands) { input.value = String(bands[key]); input.setAttribute('aria-valuetext',bands[key] + ' percent'); }
        const text = input.parentElement.querySelector('output');
        if (text) text.textContent = bands ? bands[key] + '%' : 'Invalid';
      }
    }
  }

  _outsideTemperature(states) {
    const section = element('section','section stack');
    section.append(element('h3','','Outside temperature'),element('p','hint','Show an outdoor sensor or the temperature reported by a weather entity. The dial keeps the thermostat’s indoor temperature.'));
    const candidates = Object.keys(states).filter(id => id.startsWith('weather.') || id.startsWith('sensor.') && ['°C','°F'].includes(states[id]?.attributes?.unit_of_measurement)).sort();
    const options = [['','Choose an outside source'],...candidates.map(id=>[id,`${states[id]?.attributes?.friendly_name || id} · ${id}`])];
    section.append(this._field('Outside temperature source','outside.entity',this._outsideSource ?? '',{
      options,onChange:value=>{this._outsideSource=value; this._render({open:'sources',focus:'outside.entity'});},
      help:'Only you can confirm which sensor measures outside. Weather uses its temperature attribute and live temperature unit.',
    }));
    section.append(this._button('Add outside reading','add-outside',()=>{
      const id=this._outsideSource, weather=id?.startsWith('weather.');
      if (!id) return;
      const row={kind:'temperature',entity:id,label:'Outside',...(weather?{attribute:'temperature',unit_attribute:'temperature_unit'}:{})};
      const duplicates=[...(this._draft.telemetry??[]),...(this._draft.features??[])].some(item=>item.entity===id&&(item.attribute||'')===(row.attribute||''));
      if (duplicates) {this._error='This source is already mapped. Edit its existing row below instead of adding it twice.';this._refreshFieldState();return;}
      this._commit({...clone(this._draft),telemetry:[...(this._draft.telemetry??[]),row]},{open:'sources'});
    },{disabled:!this._outsideSource,className:'add'}));
    section.append(element('p','hint','Temperature readings require this newer card module. Keep the previous configuration with its module for rollback.'));
    return section;
  }

  _suggestionContext() {
    return {connection:this._hass?.connection,socket:this._hass?.connection?.socket,user:this._hass?.user?.id,entity:this._draft.entity,signature:JSON.stringify(this._draft)};
  }

  _sameSuggestionContext(context) {
    const now=this._suggestionContext();
    return !!context && this.isConnected && this._hass?.connected !== false && now.connection && now.connection.connected !== false
      && now.connection===context.connection && now.socket===context.socket && typeof now.user==='string' && now.user.length>0
      && now.user===context.user && now.entity===context.entity && now.signature===context.signature;
  }

  async _findSuggestions(adopt = null) {
    const context=this._suggestionContext(), generation=++this._suggestionGeneration;
    if (!this._sameSuggestionContext(context) || typeof this._hass?.callWS !== 'function') {
      this._suggestionMessage='Connect to Home Assistant to check provider sources. Your mappings are unchanged.';
      this._render({open:'sources'});return;
    }
    this._suggestionMessage='Checking VT source identity…';
    this._registry=null;this._registryContext=context;this._render({open:'sources'});
    try {
      const registry=await this._hass.callWS({type:'config/entity_registry/list'});
      if (generation!==this._suggestionGeneration || !this._sameSuggestionContext(context)) return;
      if (!Array.isArray(registry)) throw new Error('Unavailable registry');
      this._registry=registry;this._registryContext=context;
      this._displayProvider={context,identity:registry.find(row=>row.entity_id===this._draft.entity)};
      const suggestions=sourceSuggestions(this._hass,this._draft,registry);
      if (adopt) {
        const fresh=suggestions.find(item=>item.status==='available' && JSON.stringify(item.entry)===JSON.stringify(adopt.entry) && item.identity===adopt.identity);
        if (!fresh) this._suggestionMessage='That source changed or is no longer available. Review the sources again.';
        else {
          this._suggestionMessage='Source added to this card’s draft. Save in Home Assistant to keep it.';
          this._commit({...clone(this._draft),telemetry:[...(this._draft.telemetry??[]),fresh.entry]},{open:'sources'});
          return;
        }
      } else this._suggestionMessage=suggestions.length ? 'Review each source before adding it. Existing and explicitly disabled mappings stay unchanged.' : 'No additional verified VT sources found. Keep your mappings or select sources manually.';
    } catch {
      if (generation!==this._suggestionGeneration || !this._sameSuggestionContext(context)) return;
      this._registry=null;
      this._suggestionMessage='Provider source identity could not be checked. Choose sources manually; existing mappings are unchanged.';
    }
    this._render({open:'sources'});
  }

  _suggestionPanel() {
    const panel=element('section','section stack');
    panel.append(element('h3','','Sources reported by VT'),element('p','hint','Find associated sensors and accepted VT feature states. Suggestions never enable a sensor or change thermostat settings.'));
    panel.append(this._button('Find VT sources','find-sources',()=>this._findSuggestions(),{disabled:!this._draft.entity}));
    const message=element('p','hint',this._suggestionMessage);message.setAttribute('role','status');panel.append(message);
    if (this._sameSuggestionContext(this._registryContext)) for (const row of sourceSuggestions(this._hass,this._draft,this._registry)) {
      const item=element('div','reading-preview');
      item.append(element('strong','',KIND_LABELS[row.kind]),element('small','',row.reason),element('small','',row.entry?.entity || row.detail));
      item.append(element('small','',row.status==='available' ? `${row.value}${row.unit?' '+row.unit:''}` : row.detail));
      if(row.entry)item.append(this._button('Use this source','use-source',()=>this._findSuggestions(row),{row:row.kind,disabled:row.status!=='available'}));
      panel.append(item);
    }
    return panel;
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
        onChange: (value) => this._change(['telemetry', index, key], value === '' && key !== 'entity' ? undefined : value, {rerender:key === 'kind',open:'sources'}),
      });
      grid.append(field(`Source ${index + 1} kind`, 'kind', { options: TELEMETRY_KINDS.map((kind) => [kind, KIND_LABELS[kind]]) }));
      grid.append(field(`Source ${index + 1} entity`, 'entity', { list: datalist.id, placeholder: 'Select or enter an entity', help: 'Suggestions come from Home Assistant; the configured ID is never guessed.' }));
      grid.append(field(`Source ${index + 1} attribute`, 'attribute', { placeholder: 'Entity state', help: 'Optional nested attribute path, such as power_manager.current_power.' }));
      grid.append(field(`Source ${index + 1} label`, 'label', { placeholder: 'Use source name' }));
      grid.append(field(`Source ${index + 1} unit`, 'unit', { placeholder: 'Use reported unit', help: 'For an attribute with no unit metadata. Known telemetry kinds still validate units.' }));
      if (['temperature','humidity','trend','valve','energy','power'].includes(row.kind)) grid.append(field(`Source ${index + 1} unit attribute`, 'unit_attribute', { placeholder: 'For example: power_manager.power_unit', help: 'Read the live unit from this entity. A missing or conflicting unit makes the reading invalid.' }));
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

  _optionalSwitch(states) {
    const section = this._details('mapped-control', 'Optional switch control');
    const stack = element('div', 'stack');
    stack.append(element('p', 'hint', 'Add one registered switch for a standard thermostat. Both On and Off require confirmation. Configuring, disabling or removing this control sends no command. Features remain read-only.'));
    const present = own(this._draft, 'mapped_controls');
    const candidate = present && record(this._draft.mapped_controls) ? mappedControl({ ...this._draft, mapped_controls: { ...this._draft.mapped_controls, enabled: true } }) : null;
    const editable = this._draft.schema_version === 2 && candidate?.status === 'enabled';
    if (present && !editable) {
      stack.append(element('p', 'status info', 'A saved optional-control section is not enrolled or has an unsupported shape. It stays unchanged and cannot be enabled here. Replace that section deliberately to configure a new switch.'));
      stack.append(this._button('Replace saved optional-control section', 'replace-mapped', () => {
        const next = clone(this._draft); delete next.mapped_controls;
        this._commit(next, { open:'mapped-control' });
      }));
      section.append(stack); return section;
    }
    const item = editable ? this._draft.mapped_controls.items[0] : this._newSwitch;
    const switchOptions = () => {
      const current = this._hass?.states ?? states;
      const switches = Object.keys(current).filter(id => /^switch\.[a-z0-9_]+$/.test(id)).sort();
      const rows = [['', 'Select one switch'], ...switches.map(id => [id, `${current[id]?.attributes?.friendly_name || id} · ${id}`])];
      if (item.entity && !switches.includes(item.entity)) rows.push([item.entity, `${item.entity} · currently unavailable`]);
      return rows;
    };
    const options = switchOptions();
    const change = (key, value) => {
      if (!editable) { this._newSwitch[key] = value; this._buffers.delete(`mapped.${key}`); if (key === 'entity') this._render({ open:'mapped-control' }); return; }
      const next = patchConfig(this._draft, ['mapped_controls', 'items', 0, key], value || undefined);
      const checked = mappedControl({ ...next, mapped_controls:{ ...next.mapped_controls, enabled:true } });
      if (checked.status !== 'enabled') {
        this._buffers.delete(`mapped.${key}`);
        this._error = `${checked.reason} This change was not applied; the saved value has been restored.`;
        this._invalidField = '';
        this._render({ open:'mapped-control', focus:`mapped.${key}` });
        return;
      }
      this._commit(next, { field:`mapped.${key}`, open:'mapped-control', rerender:key === 'entity' });
    };
    const search = element('input');
    search.type='search';search.dataset.field='mapped.search';search.value=this._switchQuery;
    search.placeholder='Search name or entity ID';search.setAttribute('aria-label','Search switches');
    const searchLabel=element('label','field');searchLabel.append(element('span','','Search switches'),search);
    const switchField=this._field('Switch entity', 'mapped.entity', item.entity, { options, onChange:value => change('entity', value) });
    const select=switchField.querySelector('select'), count=element('p','hint');
    count.setAttribute('role','status');
    const filter=()=>{
      const options = switchOptions();
      const query=this._switchQuery.trim().toLocaleLowerCase(), selected=select.value;
      const matches=options.slice(1).filter(([id,name])=>name.toLocaleLowerCase().includes(query)||id.toLocaleLowerCase().includes(query));
      const shown=matches.slice(0,100);
      if (selected && !shown.some(([id])=>id===selected)) {
        const retained=options.find(([id])=>id===selected);
        if(retained)shown.unshift([retained[0],'Selected · '+retained[1]]);
      }
      select.replaceChildren();
      for(const [value,label] of [['',matches.length?'Select one switch':'No matching switches'],...shown]) {
        const option=element('option','',label);option.value=value;select.append(option);
      }
      select.value=selected;
      count.textContent=`${matches.length} matching switch${matches.length===1?'':'es'}${matches.length>100?' · showing the first 100; refine your search':''}. Searching does not change the selected target.`;
    };
    search.addEventListener('focus',filter);
    search.addEventListener('input',()=>{this._switchQuery=search.value;filter();});
    search.addEventListener('keydown',event=>{if(event.key==='ArrowDown'){event.preventDefault();select.focus();}});
    filter();stack.append(searchLabel,count,switchField);
    stack.append(this._field('Switch label', 'mapped.label', item.label, { placeholder:'Optional switch', onChange:value => change('label', value) }));
    stack.append(this._field('Switch icon', 'mapped.icon', item.icon, { placeholder:'mdi:power', onChange:value => change('icon', value) }));
    stack.append(element('p', 'hint', `Selected target: ${item.entity || 'none'}. The switch may change thermostat mode or trigger automations. Turning it off may stop heating; TI does not restore a previous mode.`));
    if (editable) {
      stack.append(this._checkbox('Enable this switch control', 'mapped.enabled', this._draft.mapped_controls.enabled === true, value => this._change(['mapped_controls', 'enabled'], value, { rerender:true, open:'mapped-control' })));
      stack.append(this._button('Remove switch control', 'remove-mapped', () => {
        const next = clone(this._draft); delete next.mapped_controls;
        this._commit(next, { open:'mapped-control' });
      }));
    } else {
      stack.append(this._button('Enable selected switch control', 'enroll-mapped', () => {
        const selected = { ...this._newSwitch };
        for (const key of ['entity','label','icon']) if (this._buffers.has(`mapped.${key}`)) selected[key] = this._buffers.get(`mapped.${key}`);
        for (const key of ['label','icon']) if (!selected[key]) delete selected[key];
        const next = { ...clone(this._draft), schema_version:2, mapped_controls:{version:1, enabled:true, items:[{ kind:'switch_on_off', ...selected }] } };
        const checked = mappedControl(next);
        if (checked.status !== 'enabled') { this._error = checked.reason; this._refreshFieldState(); return; }
        for (const key of ['entity','label','icon']) this._buffers.delete(`mapped.${key}`);
        this._commit(next, { open:'mapped-control' });
      }));
      stack.append(element('p', 'hint', 'Enabling opts this card into configuration schema 2. Keep the previous saved configuration with the previous card module for rollback.'));
    }
    section.append(stack); return section;
  }

  _humidityDisplay() {
    const section=this._details('humidity','Humidity display');
    const stack=element('div','stack');
    const bands = record(this._draft.humidity_bands) ? this._draft.humidity_bands : { ...HUMIDITY_DEFAULTS };
    const legacy = own(bands, 'low') || own(bands, 'high');
    const bandGrid = element('div', 'grid');
    const labels = { dry_below: 'Too dry below', good_min: 'Good range minimum', good_max: 'Good range maximum', wet_above: 'Too wet above', low: 'Legacy low', high: 'Legacy high' };
    for (const key of legacy ? ['low', 'high'] : HUMIDITY_KEYS) bandGrid.append(this._field(`Humidity ${labels[key].toLowerCase()} (%)`, `humidity_bands.${key}`, bands[key], {
      type: 'number', min: 0, max: 100, step: legacy ? 'any' : 1,
      onChange: (value) => {
        const current = this._draft.humidity_bands === undefined ? { ...HUMIDITY_DEFAULTS } : this._draft.humidity_bands;
        this._change(['humidity_bands'], { ...current, [key]: value }, { field: `humidity_bands.${key}`, open: 'humidity' });
      },
    }));
    stack.append(element('p', 'hint', legacy ? 'Legacy two-bound format is preserved explicitly. Reset to source defaults to use the original five display bands. These are local display guides, not HI targets or control thresholds.' : 'Original five-band humidity display guides default to 30, 40, 60 and 70%. All four ordered integer boundaries must be valid. These are local display guides, not HI targets or control thresholds.'));
    const preview=element('div','humidity-preview');preview.dataset.humidityPreview='';
    const gradient=element('div','humidity-gradient');gradient.dataset.humidityGradient='';gradient.setAttribute('aria-hidden','true');
    const reading=element('p','hint');reading.dataset.humidityReading='';reading.setAttribute('role','status');
    preview.append(gradient,reading);stack.append(preview);
    if (!legacy) for (const key of HUMIDITY_KEYS) {
      const wrapper=element('label','humidity-slider');
      const line=element('span','',labels[key]+' · ');line.append(element('output','',bands[key]+'%'));
      const input=element('input');input.type='range';input.min='0';input.max='100';input.step='1';input.value=String(bands[key]);
      input.dataset.humiditySlider=key;input.dataset.field='humidity-slider.'+key;input.setAttribute('aria-label',labels[key]+' humidity slider');
      input.addEventListener('input',()=>{
        const current=humidityBands(this._draft);if(!current)return;
        const next=moveHumidityBoundary(current,key,Number(input.value));
        this._change(['humidity_bands'],next,{rerender:false});
        const number=this.shadowRoot.querySelector('[data-field="humidity_bands.'+key+'"]');if(number){number.value=String(next[key]);this._buffers.delete('humidity_bands.'+key);}
      });
      wrapper.append(line,input);stack.append(wrapper);
    }
    stack.append(bandGrid);
    stack.append(this._button('Reset humidity guides to source defaults', 'clear-humidity-bands', () => {
      const preserved = { ...(this._draft.humidity_bands ?? {}) };
      for (const key of [...HUMIDITY_KEYS, 'low', 'high']) {
        delete preserved[key];
        this._buffers.delete(`humidity_bands.${key}`);
      }
      this._change(['humidity_bands'], Object.keys(preserved).length ? { ...preserved, ...HUMIDITY_DEFAULTS } : undefined, { open: 'humidity', rerender: true, focus: 'humidity_bands.dry_below' });
    }, { disabled: this._draft.humidity_bands === undefined }));
    section.append(stack);return section;
  }

  _advanced() {
    const section = this._details('advanced', 'Advanced display settings');
    const stack = element('div', 'stack');
    stack.append(this._field('Temperature step override', 'step', this._draft.step, {
      type: 'number', min: 0, placeholder: 'Use provider step',
      help: 'Used only when the provider omits its step. The provider limits and reported step remain authoritative.',
      onChange: (value) => this._change(['step'], value),
    }));
    section.append(stack);
    return section;
  }
}
