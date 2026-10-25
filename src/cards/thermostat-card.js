// SPDX-License-Identifier: GPL-3.0-only
import { normalizeConfig } from '../model/config.js';
import { buildModel, targetPayload, quantize } from '../model/climate.js';
import { CommandCoordinator } from '../commands/coordinator.js';
import { styles } from './styles.js';

const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const format = value => Number.isFinite(value) ? new Intl.NumberFormat(undefined, { maximumSignificantDigits: 12 }).format(value) : '—';
const previewHosts = new Set(['hui-card-preview', 'hui-dialog-edit-card', 'hui-dialog-create-card', 'hui-card-element-editor']);

export class ThermalIntelligenceCard extends HTMLElement {
  constructor() {
    super(); this.attachShadow({ mode: 'open' });
    this.config = normalizeConfig({}); this._preview = false; this._editMode = false;
    this._identity = null; this._identityToken = 0; this._knownVT = new Set(); this._vtByConnection = new WeakMap(); this._configRevision = 0;
    this._detailsOpen = false; this._activeTarget = 'temperature'; this._registryStatus = 'idle';
    this._coordinator = new CommandCoordinator({ onChange: () => this._scheduleRender() });
  }
  static getStubConfig(hass, entities = [], fallback = []) {
    const candidates = [...entities, ...fallback, ...Object.keys(hass?.states ?? {})];
    return { type: 'custom:thermal-intelligence-card', entity: candidates.find(id => typeof id === 'string' && id.startsWith('climate.')) ?? '', adapter: 'auto' };
  }
  static async getConfigElement() { return document.createElement('thermal-intelligence-card-editor'); }
  getCardSize() { return this._detailsOpen ? 8 : 6; }
  getGridOptions() { return { columns: 6, min_columns: 4, rows: 'auto' }; }
  setConfig(config) {
    this._cancelDraft(); this.config = normalizeConfig(config); this._configRevision++;
    this._registryKey = null; this._identityToken++; this._identity = null;
    this._refreshIdentity(); this._updateContext(); this._scheduleRender();
  }
  set hass(value) {
    this._hass = value;
    this._syncIdentityContext();
    this._refreshIdentity();
    const model = this.model();
    if (this._draftContext && !this._draftStillValid(model)) this._cancelDraft('Thermostat context changed. The draft was cancelled.');
    this._updateContext(model);
    this._coordinator.observe(value?.states?.[this.config.entity]);
    this._scheduleRender();
  }
  get hass() { return this._hass; }
  set preview(value) { this._preview = value === true; this._cancelDraft(); this._updateContext(); this._scheduleRender(); }
  get preview() { return this._preview; }
  set editMode(value) { this._editMode = value === true; this._cancelDraft(); this._updateContext(); this._scheduleRender(); }
  get editMode() { return this._editMode; }
  connectedCallback() { this._refreshIdentity(); this._updateContext(); this._scheduleRender(); }
  disconnectedCallback() { clearTimeout(this._freshnessTimer); this._identityToken++; this._registryKey = null; this._cancelDraft(); this._coordinator.cancel('Card detached. Any remote outcome remains unverified.'); }
  _isPreview() {
    if (this._preview || this._editMode || this.config.preview === true) return true;
    let node = this;
    while (node) {
      if (previewHosts.has(node.localName)) return true;
      node = node.parentElement ?? node.getRootNode?.().host ?? null;
    }
    return false;
  }
  _updateContext(model = this.model()) {
    this._coordinator.updateContext({ hass: this._hass, entity: this.config.entity, preview: this._isPreview(), contextKey: this._configRevision, model: { ready: model.ready && this._registryStatus !== 'loading' } });
  }
  _session() {
    return { connection:this._hass?.connection, socket:this._hass?.connection?.socket, user:this._hass?.user?.id, connected:this._hass?.connected === true };
  }
  _sameSession(a, b) { return !!a && Object.keys(b).every(key => a[key] === b[key]); }
  _syncIdentityContext() {
    const next = this._session();
    if (this._sameSession(this._identityContext, next)) return;
    this._identityContext = next; this._identityToken++; this._registryKey = null; this._identity = null; this._registryStatus = 'idle';
    if (next.connection && typeof next.connection === 'object') {
      if (!this._vtByConnection.has(next.connection)) this._vtByConnection.set(next.connection, new Set());
      this._knownVT = this._vtByConnection.get(next.connection);
    } else this._knownVT = new Set();
  }
  async _refreshIdentity() {
    const hass = this._hass, entity = this.config.entity;
    if (!hass || !entity) { this._registryStatus = 'idle'; return; }
    this._syncIdentityContext();
    const key = `${entity}|${this._configRevision}`;
    if (this._registryKey === key) return;
    if (this._knownVT.has(entity)) this._identity = { entity_id: entity, platform: 'versatile_thermostat' };
    if (hass.connected !== true) { this._registryStatus = 'unavailable'; return; }
    this._registryKey = key;
    const cached = hass.entities?.[entity];
    if (cached?.entity_id === entity && typeof cached.platform === 'string') {
      this._acceptIdentity(cached); return;
    }
    if (typeof hass.callWS !== 'function') { this._registryStatus = 'unavailable'; return; }
    const session = this._session();
    const token = ++this._identityToken; this._registryStatus = 'loading';
    try {
      const entry = await hass.callWS({ type: 'config/entity_registry/get', entity_id: entity });
      if (token !== this._identityToken || !this._sameSession(session, this._session()) || this.config.entity !== entity) return;
      if (entry?.entity_id !== entity || typeof entry.platform !== 'string') throw new Error('Invalid identity');
      this._acceptIdentity(entry);
    } catch {
      if (token !== this._identityToken || !this._sameSession(session, this._session())) return;
      this._registryStatus = 'unavailable';
    }
    this._updateContext(); this._scheduleRender();
  }
  _acceptIdentity(entry) {
    this._identity = { entity_id: entry.entity_id, platform: entry.platform };
    if (entry.platform === 'versatile_thermostat') this._knownVT.add(entry.entity_id);
    else this._knownVT.delete(entry.entity_id);
    this._registryStatus = 'verified';
  }
  model() { return buildModel(this._hass ?? {}, this.config, this._identity); }
  _guard(model = this.model()) {
    if (!this.isConnected) return { allowed: false, reason: 'Card is detached.' };
    if (this._isPreview()) return { allowed: false, reason: 'Controls are disabled while previewing or editing.' };
    if (this._hass?.connected !== true || !this._hass?.user?.id || !this._hass?.connection) return { allowed:false, reason:'An active authenticated Home Assistant connection is required.' };
    if (this._registryStatus === 'loading') return { allowed: false, reason: 'Checking thermostat provider identity.' };
    return { allowed: model.ready === true, reason: model.reason || 'Thermostat control is unavailable.' };
  }
  async _request(service, values) {
    this._draftMessage = ''; this._updateContext();
    return this._coordinator.request({
      hass: this._hass, entity: this.config.entity, service, values,
      preview: this._isPreview(),
      validate: ({ values: captured }) => {
        const model = this.model(), gate = this._guard(model);
        if (!gate.allowed) return gate;
        if (service === 'set_temperature') {
          const keys = Object.keys(captured);
          const valid = model.canSet && keys.length === model.keys.length && keys.every(key => model.keys.includes(key)
            && captured[key] >= model.min && captured[key] <= model.max && Math.abs(quantize(captured[key], model.min, model.max, model.step) - captured[key]) < 1e-8)
            && (!model.ranged || captured.target_temp_low <= captured.target_temp_high);
          return { allowed: valid === true, reason: model.reason || 'The requested targets no longer match the current limits or step.' };
        }
        const choice = model.choices.find(row => row.service === service);
        return { allowed: choice?.enabled === true && choice.options.includes(captured[choice.key]), reason: 'This control is not supported or available.' };
      },
    });
  }
  _temperature(value) {
    const model = this.model();
    try { return this._request('set_temperature', targetPayload(model, this._targetKey(model), value)); }
    catch (error) { this._draftMessage = error.message; this._scheduleRender(); return Promise.resolve(); }
  }
  _targetKey(model) { return model.keys.includes(this._activeTarget) ? this._activeTarget : model.keys[0]; }
  _signature(model) { return JSON.stringify([this.config.entity, this._configRevision, this._isPreview(), this._targetKey(model), model.ready, model.canSet, model.unit, model.min, model.max, model.step, model.keys, model.targets, model.choices.find(row=>row.key==='hvac_mode')?.value, model.provider]); }
  _startDraft(model = this.model()) { this._draftContext = { session:this._session(), signature:this._signature(model) }; }
  _draftStillValid(model = this.model()) { return !!this._draftContext && this._sameSession(this._draftContext.session, this._session()) && this._draftContext.signature === this._signature(model) && this._guard(model).allowed && !this._coordinator.busy; }
  _cancelDraft(message = '') { this._drag = null; this._draft = null; this._draftContext = null; if (message) this._draftMessage = message; }
  _scheduleRender() {
    if (this._renderQueued) return;
    this._renderQueued = true;
    queueMicrotask(() => { this._renderQueued = false; if (this.isConnected && !this._draftContext) this.render(); });
  }
  _dialValue(event, dial, model) {
    const rect = dial.getBoundingClientRect();
    const angle = (Math.atan2(event.clientY - rect.top - rect.height / 2, event.clientX - rect.left - rect.width / 2) * 180 / Math.PI + 360) % 360;
    let arc = (angle - 135 + 360) % 360;
    if (arc > 270) arc = arc < 315 ? 270 : 0;
    const raw = model.min + (arc / 270) * (model.max - model.min);
    return targetPayload(model, this._targetKey(model), raw)[this._targetKey(model)];
  }
  _paintDraft(value) {
    const node = this.shadowRoot.querySelector('[data-target-value]');
    if (node) node.textContent = format(value);
    const dial = this.shadowRoot.querySelector('.dial');
    if (dial) { dial.setAttribute('aria-valuenow', value); dial.setAttribute('aria-valuetext', `${format(value)} ${this.model().unit}, draft`); }
  }
  _bindDial(dial, model) {
    if (!dial || !model.canSet || !this._guard(model).allowed || this._coordinator.busy) return;
    dial.onpointerdown = event => {
      if (event.button !== 0 || event.isPrimary === false) return;
      event.preventDefault(); dial.focus();
      this._startDraft();
      this._drag = { pointer: event.pointerId, x: event.clientX, y: event.clientY, moved: false };
      dial.setPointerCapture(event.pointerId);
    };
    dial.onpointermove = event => {
      if (!this._drag || this._drag.pointer !== event.pointerId) return;
      if (!this._draftStillValid()) { this._cancelDraft('Thermostat context changed. The draft was cancelled.'); this._scheduleRender(); return; }
      if (Math.hypot(event.clientX - this._drag.x, event.clientY - this._drag.y) < 6 && !this._drag.moved) return;
      this._drag.moved = true;
      try { this._draft = this._dialValue(event, dial, this.model()); this._paintDraft(this._draft); }
      catch { this._cancelDraft('The temperature draft is no longer valid.'); this._scheduleRender(); }
    };
    dial.onpointerup = event => {
      if (!this._drag || this._drag.pointer !== event.pointerId) return;
      const value = this._drag.moved && this._draftStillValid() ? this._draft : null; this._cancelDraft();
      if (dial.hasPointerCapture(event.pointerId)) dial.releasePointerCapture(event.pointerId);
      if (value !== null) this._temperature(value);
      this._scheduleRender();
    };
    dial.onpointercancel = () => { this._cancelDraft(); this._scheduleRender(); };
    dial.onlostpointercapture = () => { if(this._drag) { this._cancelDraft(); this._scheduleRender(); } };
    dial.onkeydown = event => {
      const current = this.model(), key = this._targetKey(current), value = this._draft ?? current.targets[key];
      if (event.key === 'Escape') { this._cancelDraft(); this._scheduleRender(); return; }
      const amounts = { ArrowUp: current.step, ArrowRight: current.step, ArrowDown: -current.step, ArrowLeft: -current.step, PageUp: current.step * 5, PageDown: -current.step * 5 };
      if (!(event.key in amounts) && !['Home', 'End'].includes(event.key)) return;
      event.preventDefault();
      // A held key is not a fresh intent after its original context was retired.
      if (event.repeat && !this._draftContext) return;
      if (!this._draftContext) this._startDraft(current);
      if (!this._draftStillValid(current)) { this._cancelDraft(); this._scheduleRender(); return; }
      const next = event.key === 'Home' ? current.min : event.key === 'End' ? current.max : value + amounts[event.key];
      try { this._draft = targetPayload(current, key, next)[key]; this._paintDraft(this._draft); } catch { this._cancelDraft(); }
    };
    dial.onkeyup = event => {
      if (!['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','PageUp','PageDown','Home','End','Enter'].includes(event.key)) return;
      if (this._draft !== null && this._draft !== undefined) { const value = this._draft, valid = this._draftStillValid(); this._cancelDraft(); if(valid)this._temperature(value); this._scheduleRender(); }
    };
    dial.onblur = () => { if(this._draftContext) { this._cancelDraft(); this._scheduleRender(); } };
  }
  _scheduleFreshness() {
    clearTimeout(this._freshnessTimer);
    const now = Date.now();
    const deadlines = this.config.telemetry.filter(row=>row.max_age_seconds && row.entity).map(row=>{
      const stamp = Date.parse(this._hass?.states?.[row.entity]?.last_updated);
      return stamp > now ? stamp + 1 : stamp + row.max_age_seconds * 1000 + 1;
    }).filter(deadline=>Number.isFinite(deadline) && deadline > now);
    if(this.isConnected && deadlines.length) this._freshnessTimer = setTimeout(()=>this._scheduleRender(), Math.min(30000, Math.max(1, Math.min(...deadlines)-now)));
  }
  render() {
    const model = this.model(), key = this._targetKey(model), target = model.targets[key];
    const allowed = this._guard(model).allowed, busy = this._coordinator.busy;
    const disabled = !allowed || busy || !model.canSet, status = this._coordinator.status;
    const focused = this.shadowRoot.activeElement?.getAttribute('data-focus');
    this.dataset.theme = this.config.theme;
    const notice = this._registryStatus === 'loading' ? 'Checking thermostat provider identity…' : model.reason;
    const value = this._draft ?? target;
    const ratio = model.max > model.min && Number.isFinite(value) ? Math.max(0, Math.min(1, (value-model.min)/(model.max-model.min))) : 0;
    const circumference = 2*Math.PI*90, arc = circumference*.75, angle = (135+ratio*270)*Math.PI/180;
    const choiceRows = model.choices.filter(choice=>choice.status !== 'unsupported').map(choice => `<label>${escape(choice.label)}<select data-choice="${escape(choice.key)}" data-focus="${escape(choice.key)}" aria-label="${escape(choice.label)}" title="${escape(choice.reason)}" ${!allowed || busy || !choice.enabled ? 'disabled' : ''}>
      ${!choice.options.includes(choice.value) ? '<option value="" selected>Unknown</option>' : ''}
      ${choice.options.map(option => `<option value="${escape(option)}" ${option===choice.value?'selected':''}>${escape(choice.key==='preset_mode' ? this.config.preset_labels?.[option] || option : option)}</option>`).join('')}</select></label>`).join('');
    const telemetry = (model.telemetry ?? []).map(row => `<div class="metric" data-status="${escape(row.status)}"><div class="metric-label">${escape(row.label)}</div><div class="metric-value">${row.status==='available'?escape(typeof row.value==='number'?format(row.value):row.value):escape(row.status)} ${row.status==='available'?escape(row.unit):''}</div><div class="metric-note">${escape(row.detail)}${row.band?` ${escape(row.bandLabel)}: ${escape(row.band)}.`:''}</div><div class="metric-note" data-telemetry-source>${escape(row.source.entity || 'No source')}${row.source.attribute?` · ${escape(row.source.attribute)}`:''}</div></div>`).join('');
    this.shadowRoot.innerHTML = `<style>${styles}</style><ha-card><div class="body">
      <header class="header"><span class="mark" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M9 14.3V5a3 3 0 0 1 6 0v9.3a5 5 0 1 1-6 0Z"/><path d="M12 8v10"/><circle cx="12" cy="18" r="1.5"/></svg></span><div class="heading"><h2 class="name">${escape(model.name || this.config.name || 'Thermal Intelligence')}</h2><p class="provider"><span class="status-dot ${model.ready?'ready':''}"></span>${escape(model.provider?.label || 'Choose a thermostat')}</p></div>${this.config.show_details?`<button class="info-button" data-details data-focus="details" aria-label="Thermostat details" aria-expanded="${this._detailsOpen}">ⓘ</button>`:''}</header>
      ${this._isPreview()?'<div class="notice preview">Preview — thermostat controls are disabled.</div>':''}
      ${!this.config.entity ? '<div class="empty"><h3>Choose a climate entity</h3><p>Open the visual editor and select a thermostat. If no climate entities are available, add one in Home Assistant first. This card does not need a TI backend.</p></div>' : `
      ${notice?`<div class="notice warning" role="status">${escape(notice)}</div>`:''}
      ${model.ranged?`<div class="range-tabs">${model.keys.map(k=>`<button data-target-key="${escape(k)}" data-focus="${escape(k)}" aria-pressed="${key===k}">${k==='target_temp_low'?'Low':'High'} · ${escape(format(model.targets[k]))}°</button>`).join('')}</div>`:''}
      <div class="climate"><div class="dial" role="slider" tabindex="${disabled?'-1':'0'}" data-focus="dial" aria-label="${model.ranged?(key==='target_temp_low'?'Low target temperature':'High target temperature'):'Target temperature'}" aria-disabled="${disabled}" ${Number.isFinite(model.min)?`aria-valuemin="${model.min}"`:''} ${Number.isFinite(model.max)?`aria-valuemax="${model.max}"`:''} ${Number.isFinite(value)?`aria-valuenow="${value}"`:''} aria-valuetext="${escape(format(value))} ${escape(model.unit)}">
      <svg viewBox="0 0 240 240" aria-hidden="true"><circle class="track" cx="120" cy="120" r="90" stroke-dasharray="${arc} ${circumference-arc}" transform="rotate(135 120 120)"/><circle class="progress" cx="120" cy="120" r="90" stroke-dasharray="${ratio*arc} ${circumference-ratio*arc}" transform="rotate(135 120 120)"/><circle class="knob" cx="${120+90*Math.cos(angle)}" cy="${120+90*Math.sin(angle)}" r="6"/><text class="ticks" x="45" y="202" text-anchor="middle">${escape(format(model.min))}°</text><text class="ticks" x="195" y="202" text-anchor="middle">${escape(format(model.max))}°</text></svg>
      <div class="reading"><span class="eyebrow">${model.ranged?(key==='target_temp_low'?'Low target':'High target'):'Target temperature'}</span><div class="target"><span data-target-value>${escape(format(value))}</span><sup>${escape(model.unit)}</sup></div><div class="current">Current · ${escape(format(model.current))} ${escape(model.unit)}</div></div></div>
      <div class="adjust"><button data-adjust="-1" data-focus="decrease" aria-label="Decrease target temperature" ${disabled?'disabled':''}>−</button><span class="hint">${disabled?'Controls unavailable':'Drag to adjust'}</span><button data-adjust="1" data-focus="increase" aria-label="Increase target temperature" ${disabled?'disabled':''}>+</button></div></div>
      ${this.config.show_activity?`<div class="activity">${escape(model.activity?.label || 'Activity unknown')}<small>${escape(model.activity?.detail)}</small></div>`:''}
      <div class="notice" role="status" aria-live="polite" data-request-status>${escape(this._draftMessage || (status.phase !== 'idle' ? status.message : ''))}</div>
      ${choiceRows?`<div class="choices">${choiceRows}</div>`:''}
      ${telemetry?`<div class="telemetry">${telemetry}</div>`:''}
      ${this._detailsOpen && this.config.show_details ? `<section class="details"><h3>Thermostat evidence</h3><dl><dt>Provider</dt><dd>${escape(model.provider?.label)} · ${escape(model.provider?.evidence)}${model.provider?.reason?` · ${escape(model.provider.reason)}`:''}</dd><dt>Readiness</dt><dd>${escape(model.ready?model.readiness.reason:model.reason || model.readiness.reason)}</dd><dt>Ownership</dt><dd>${escape(model.ownership?.detail || 'Not reported. A preset or target does not establish who owns control.')}</dd><dt>Temperature step</dt><dd>${escape(format(model.step))} ${escape(model.unit)} · ${escape(model.stepSource || 'Provider')}</dd><dt>Activity evidence</dt><dd>${escape(model.activity?.detail || 'No physical heating observation is available.')}</dd>${(model.details??[]).map(row=>`<dt>${escape(row.label)}</dt><dd>${escape(row.value ?? row.status)}${row.unit?` ${escape(row.unit)}`:''} · ${escape(row.status)}${row.detail?` · ${escape(row.detail)}`:''}${row.source?` (${escape(row.source)})`:''}</dd>`).join('')}</dl><button class="native" data-more-info>Open Home Assistant entity details</button></section>`:''}`}
      <div class="footer">Thermal Intelligence · Development preview</div>
    </div></ha-card>`;
    this.shadowRoot.querySelector('[data-details]')?.addEventListener('click', () => { this._detailsOpen=!this._detailsOpen; this.render(); });
    this.shadowRoot.querySelector('[data-more-info]')?.addEventListener('click', () => this.dispatchEvent(new CustomEvent('hass-more-info', {detail:{entityId:this.config.entity},bubbles:true,composed:true})));
    for (const button of this.shadowRoot.querySelectorAll('[data-adjust]')) button.onclick=()=>{const latest=this.model();this._temperature(latest.targets[this._targetKey(latest)]+Number(button.dataset.adjust)*latest.step);};
    for (const button of this.shadowRoot.querySelectorAll('[data-target-key]')) button.onclick=()=>{this._cancelDraft();this._activeTarget=button.dataset.targetKey;this.render();};
    for (const select of this.shadowRoot.querySelectorAll('[data-choice]')) select.onchange=()=>{const choice=this.model().choices.find(row=>row.key===select.dataset.choice);if(choice)this._request(choice.service,{[choice.key]:select.value});};
    this._bindDial(this.shadowRoot.querySelector('.dial'),model);
    if (focused) this.shadowRoot.querySelector(`[data-focus="${CSS.escape(focused)}"]`)?.focus({preventScroll:true});
    this._scheduleFreshness();
  }
}
