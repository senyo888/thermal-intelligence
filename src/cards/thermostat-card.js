// SPDX-License-Identifier: GPL-3.0-only
import { normalizeConfig } from '../model/config.js';
import { buildModel, targetPayload, quantize } from '../model/climate.js';
import { CommandCoordinator } from '../commands/coordinator.js';
import { styles } from './styles.js';
import { renderCard } from './source-view.js';
import { renderDialog, dialogStyles } from './dialogs.js';
import { humidityBands, moveHumidityBoundary } from '../model/humidity.js';

const format = value => Number.isFinite(value) ? new Intl.NumberFormat(undefined, { maximumSignificantDigits: 12 }).format(value) : '—';
const previewHosts = new Set(['hui-card-preview', 'hui-dialog-edit-card', 'hui-dialog-create-card', 'hui-card-element-editor']);

export class ThermalIntelligenceCard extends HTMLElement {
  constructor() {
    super(); this.attachShadow({ mode: 'open' });
    this._view = document.createElement('div'); this.shadowRoot.append(this._view);
    this._animationOffset = Date.now() % 4000;
    this.config = normalizeConfig({}); this._preview = false; this._editMode = false;
    this._identity = null; this._identityToken = 0; this._knownVT = new Set(); this._vtByConnection = new WeakMap(); this._configRevision = 0;
    this._open = false; this._activeTarget = 'temperature'; this._registryStatus = 'idle';
    this._coordinator = new CommandCoordinator({ onChange: () => this._scheduleRender() });
  }
  static getStubConfig(hass, entities = [], fallback = []) {
    const candidates = [...entities, ...fallback, ...Object.keys(hass?.states ?? {})];
    return { type: 'custom:thermal-intelligence-card', entity: candidates.find(id => typeof id === 'string' && id.startsWith('climate.')) ?? '', adapter: 'auto' };
  }
  static async getConfigElement() { return document.createElement('thermal-intelligence-card-editor'); }
  getCardSize() { return this._open ? 10 : 6; }
  getGridOptions() { return { columns: 6, min_columns: 4, rows: 'auto' }; }
  setConfig(config) {
    this._closeDialog(); this._cancelDraft(); this.config = normalizeConfig(config); this._configRevision++;
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
  disconnectedCallback() { this._closeDialog(); clearTimeout(this._collapseTimer); clearTimeout(this._freshnessTimer); this._identityToken++; this._registryKey = null; this._cancelDraft(); this._coordinator.cancel('Card detached. Any remote outcome remains unverified.'); }
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
    this._identity = { entity_id: entry.entity_id, platform: entry.platform, device_id:entry.device_id };
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
  _temperature(value, key = this._targetKey(this.model())) {
    const model = this.model();
    try {
      const payload = targetPayload(model, key, value);
      if (Object.entries(payload).every(([name, target]) => model.targets[name] === target)) return Promise.resolve();
      return this._request('set_temperature', payload);
    }
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
  _pointerAngle(event) {
    try {
      const svg = this.shadowRoot.querySelector('.dial > svg'), matrix = svg?.getScreenCTM();
      if (!matrix || !Number.isFinite(event.clientX) || !Number.isFinite(event.clientY)) return null;
      const point = new DOMPoint(event.clientX, event.clientY).matrixTransform(matrix.inverse());
      if (!Number.isFinite(point.x) || !Number.isFinite(point.y) || Math.hypot(point.x - 100, point.y - 100) < 1) return null;
      return Math.atan2(point.y - 100, point.x - 100) * 180 / Math.PI;
    } catch { return null; }
  }
  _paintDraft(value) {
    // Draft painting changes the mounted DOM independently of the rendered model.
    // Always restore authoritative markup when the gesture ends or is cancelled.
    this._viewHTML = null;
    const model = this.model(), key = this._targetKey(model);
    const polar = (radius, angle) => [100 + radius * Math.cos(angle * Math.PI / 180), 100 + radius * Math.sin(angle * Math.PI / 180)];
    const angle = 135 + 270 * (value - model.min) / (model.max - model.min), [x, y] = polar(72, angle);
    const output = this.shadowRoot.querySelector(`[data-value="${key}"]`);
    if (output) output.textContent = format(value) + model.unit;
    const node = this.shadowRoot.querySelector(`[data-marker="${key}"]`);
    if (node) {
      node.style.left = `${(x - 10) / 180 * 100}%`; node.style.top = `${y / 184 * 100}%`;
      node.setAttribute('aria-valuenow', value); node.setAttribute('aria-valuetext', `${format(value)} ${model.unit}, draft`); node.dataset.active = 'true';
    }
    const visual = this.shadowRoot.querySelector(`[data-marker-visual="${key}"]`);
    if (visual) {
      visual.setAttribute('transform', `translate(${x} ${y})`);
      visual.querySelector('.target-dot')?.setAttribute('r', '4');
      visual.classList.toggle('keyboard-focus', !!node?.matches(':focus-visible'));
    }
    const caption = this.shadowRoot.querySelector(`[data-target-edit="${key}"]`);
    if (caption) { caption.textContent = 'Draft'; caption.hidden = false; caption.title = 'Adjustment has not been sent.'; }
    const arrow = this.shadowRoot.querySelector('#arrow');
    if (arrow) { arrow.style.display = ''; arrow.setAttribute('d', `M ${polar(76, angle)} L ${polar(84, angle)} M ${polar(80, angle-2.4)} L ${polar(84, angle)} L ${polar(80, angle+2.4)}`); }
    const selected = 20 * (value - model.min) / (model.max - model.min);
    this.shadowRoot.querySelectorAll('.diamond').forEach((tick, i) => {
      tick.classList.toggle('selected', i <= Math.round(selected));
      const distance = Math.abs(i-selected), lift = distance < 1.5 ? 2.5*(1+Math.cos(Math.PI*distance/1.5)) : 0, radians = (135+i*13.5)*Math.PI/180;
      tick.style.setProperty('--tick-x', `${(Math.cos(radians)*lift).toFixed(3)}px`);
      tick.style.setProperty('--tick-y', `${(Math.sin(radians)*lift).toFixed(3)}px`);
    });
    this.shadowRoot.querySelector('.dial > svg')?.classList.add('adjusting');
  }
  _bindMarker(marker, model) {
    if (!model.canSet || !this._guard(model).allowed || this._coordinator.busy) return;
    const key = marker.dataset.marker;
    marker.onpointerdown = event => {
      if (event.button !== 0 || event.isPrimary === false || this._drag) return;
      event.preventDefault(); marker.focus({preventScroll:true}); this._activity();
      this._activeTarget = key; this._startDraft();
      const current = this.model(), value = current.targets[key];
      this._draft = value;
      this._drag = { pointer:event.pointerId, x:event.clientX, y:event.clientY, moved:false, initial:value,
        lastAngle:this._pointerAngle(event), offset:270*(value-current.min)/(current.max-current.min) };
      try { marker.setPointerCapture(event.pointerId); this._paintDraft(value); }
      catch { this._cancelDraft('Adjustment could not start. Try again.'); this._scheduleRender(); }
    };
    const move = event => {
      const drag = this._drag;
      if (!drag || drag.pointer !== event.pointerId) return false;
      if (!this._draftStillValid()) { this._cancelDraft('Thermostat context changed. The draft was cancelled.'); this._scheduleRender(); return false; }
      const angle = this._pointerAngle(event); if (angle === null) return false;
      if (!drag.moved && Math.hypot(event.clientX-drag.x,event.clientY-drag.y) < 2) return true;
      if (drag.lastAngle === null) { drag.lastAngle = angle; return true; }
      drag.moved = true;
      drag.offset = Math.max(0,Math.min(270,drag.offset+(angle-drag.lastAngle+540)%360-180)); drag.lastAngle = angle;
      const current = this.model();
      try {
        this._draft = targetPayload(current,key,current.min+drag.offset/270*(current.max-current.min))[key];
        this._paintDraft(this._draft); return true;
      } catch { this._cancelDraft('The temperature draft is no longer valid.'); this._scheduleRender(); return false; }
    };
    marker.onpointermove = move;
    marker.onpointerup = event => {
      if (!this._drag || this._drag.pointer !== event.pointerId) return;
      const initial = this._drag.initial;
      const valid = move(event) && this._draftStillValid(), value = this._draft;
      this._cancelDraft();
      if (marker.hasPointerCapture(event.pointerId)) marker.releasePointerCapture(event.pointerId);
      if (valid && value !== null && value !== initial) this._temperature(value,key);
      this._activity(); this._scheduleRender();
    };
    marker.onpointercancel = () => { this._cancelDraft('Adjustment cancelled.'); this._scheduleRender(); };
    marker.onlostpointercapture = () => { if (this._drag) { this._cancelDraft('Adjustment cancelled.'); this._scheduleRender(); } };
    marker.onkeydown = event => {
      const current = this.model(), value = this._draft ?? current.targets[key];
      if (event.key === 'Escape') { this._cancelDraft(); this._scheduleRender(); return; }
      const amounts = { ArrowUp:current.step, ArrowRight:current.step, ArrowDown:-current.step, ArrowLeft:-current.step, PageUp:current.step*5, PageDown:-current.step*5 };
      if (!(event.key in amounts) && !['Home','End'].includes(event.key)) return;
      event.preventDefault();
      if (this._drag || (event.repeat && !this._draftContext)) return;
      if (!this._draftContext) { this._activeTarget = key; this._startDraft(current); }
      if (!this._draftStillValid(current)) { this._cancelDraft(); this._scheduleRender(); return; }
      const next = event.key === 'Home' ? current.min : event.key === 'End' ? current.max : value+amounts[event.key];
      try { this._draft = targetPayload(current,key,next)[key]; this._paintDraft(this._draft); this._activity(); }
      catch { this._cancelDraft(); this._scheduleRender(); }
    };
    marker.onkeyup = event => {
      if (!['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','PageUp','PageDown','Home','End','Enter'].includes(event.key)) return;
      if (this._draft !== null && this._draft !== undefined && !this._drag) {
        const value = this._draft, valid = this._draftStillValid(); this._cancelDraft();
        if (valid) this._temperature(value,key); this._scheduleRender();
      }
    };
    marker.onfocus = () => this.shadowRoot.querySelector(`[data-marker-visual="${key}"]`)?.classList.add('keyboard-focus');
    marker.onblur = () => {
      this.shadowRoot.querySelector(`[data-marker-visual="${key}"]`)?.classList.remove('keyboard-focus');
      if (this._draftContext) { this._cancelDraft(); this._scheduleRender(); }
    };
  }
  _activity() {
    clearTimeout(this._collapseTimer);
    if (!this._open || !this.isConnected) return;
    this._collapseTimer = setTimeout(() => {
      if (this._draftContext || this._coordinator.busy || this._dialogHost || this.shadowRoot.activeElement) { this._activity(); return; }
      this._open = false; this._scheduleRender();
    }, 30000);
  }
  _moreInfo(entity = this.config.entity) {
    this._closeDialog();
    if (entity) this.dispatchEvent(new CustomEvent('hass-more-info', { detail:{entityId:entity}, bubbles:true, composed:true }));
  }
  _deviceSettings() {
    const id=this._identity?.device_id;
    if(this._registryStatus!=='verified'||typeof id!=='string'||!/^[-a-z0-9_]{1,128}$/i.test(id)) {this._moreInfo();return;}
    this._closeDialog();
    history.pushState(null,'',`/config/devices/device/${encodeURIComponent(id)}`);
    window.dispatchEvent(new CustomEvent('location-changed'));
  }
  _bindDevice(button) {
    let timer=null,start=null,held=false;
    const clear=()=>{clearTimeout(timer);timer=null;start=null;};
    button.onpointerdown=event=>{
      if(event.button!==0||event.isPrimary===false)return;clear();held=false;
      start={x:event.clientX,y:event.clientY};
      timer=setTimeout(()=>{clear();if(button.isConnected){held=true;this._deviceSettings();}},600);
    };
    button.onpointermove=event=>{if(start&&Math.hypot(event.clientX-start.x,event.clientY-start.y)>10)clear();};
    button.onpointerup=clear;button.onpointercancel=clear;button.onlostpointercapture=clear;
    button.onclick=()=>{clear();if(held){held=false;return;}this._openDialog('overview');};
    button.onkeydown=event=>{if(event.key==='Enter'&&event.shiftKey){event.preventDefault();clear();this._deviceSettings();}};
  }
  _closeDialog() {
    const host = this._dialogHost,returnFocus=this._dialogReturnFocus; this._dialogHost = null; this._dialogSpec = null; this._dialogMarkup = null; this._settingsDraft = null; this._displayDraft = null;this._dialogReturnFocus=null;
    host?.shadowRoot.querySelector('dialog')?.close(); host?.remove(); this._activity();
    if(host&&returnFocus)this.shadowRoot.querySelector(`[data-focus="${CSS.escape(returnFocus)}"]`)?.focus({preventScroll:true});
  }
  _openDialog(kind='overview',rowKey) {
    const returnFocus=this._dialogReturnFocus||this.shadowRoot.activeElement?.getAttribute('data-focus');
    this._closeDialog(); this._cancelDraft(); this._dialogSpec = {kind,rowKey}; this._displayDraft = structuredClone(this.config);this._dialogReturnFocus=returnFocus;
    this._dialogHost = document.createElement('div'); this._dialogHost.attachShadow({mode:'open'});
    this._dialogHost.style.cssText='--primary-text-color:#eff5ff;--secondary-text-color:#a9b8cb;--card-background-color:#0d1622;--divider-color:#34465c;--primary-color:#8ac9f1;color-scheme:dark';
    this.shadowRoot.append(this._dialogHost); this._renderDialog(true);
  }
  _renderDialog(show=false) {
    if (!this._dialogHost || !this._dialogSpec) return;
    // Keep the actual editor node and its draft while telemetry changes.
    if (!show && this._dialogSpec.kind === 'settings') {
      const editor = this._dialogHost.shadowRoot.querySelector('[data-dialog-editor]'); if (editor) editor.hass = this._hass;
      return;
    }
    const root = this._dialogHost.shadowRoot, model = this.model();
    const active = root.activeElement;
    const focus = active?.getAttribute('data-focus');
    const summaryId = active?.tagName === 'SUMMARY' ? active.parentElement.id : null;
    const actionAttribute = ['data-dialog-close','data-dialog-info','data-dialog-preset','data-dialog-settings'].find(name=>active?.hasAttribute(name));
    const actionValue = actionAttribute ? active.getAttribute(actionAttribute) : null;
    const openSections = [...root.querySelectorAll('details[open][id]')].map(node=>node.id);
    const scroll = root.querySelector('.content,.body')?.scrollTop || 0;
    const result = renderDialog({...this._dialogSpec,model,config:this._displayDraft||this.config,allowed:this._guard(model).allowed,busy:this._coordinator.busy,preview:this._isPreview(),statusMessage:this._draftMessage || (this._coordinator.status.phase==='idle'?'':this._coordinator.status.message)});
    const old = root.querySelector('dialog'), wasOpen = old?.open;
    if (!show && old?.dataset.view==='humidity' && active?.hasAttribute('data-humidity-boundary')) {this._paintHumidityDraft(result.html);return;}
    if (!show && result.html === this._dialogMarkup) return;
    this._dialogMarkup = result.html;
    old?.close(); root.innerHTML = `<style>${result.styles||dialogStyles}</style>${result.html}`;
    const dialog = root.querySelector('dialog');
    dialog.addEventListener('cancel', event=>{event.preventDefault();this._closeDialog();});
    for (const button of root.querySelectorAll('[data-dialog-close]')) button.onclick=()=>this._closeDialog();
    for (const button of root.querySelectorAll('[data-dialog-info]')) button.onclick=()=>this._moreInfo(button.dataset.dialogInfo);
    for (const button of root.querySelectorAll('[data-dialog-preset]')) button.onclick=()=>this._request('set_preset_mode',{preset_mode:button.dataset.dialogPreset});
    for (const button of root.querySelectorAll('[data-dialog-settings]')) button.onclick=()=>this._openDialog('settings');
    const editor = root.querySelector('[data-dialog-editor]');
    if (editor) {
      editor.setConfig(this.config); editor.hass = this._hass;
      editor.addEventListener('config-changed',event=>{
        event.stopPropagation(); this._settingsDraft=event.detail.config;
        const output=root.querySelector('[data-settings-export]');if(output)output.value=JSON.stringify(this._settingsDraft,null,2);
      });
      const output=root.querySelector('[data-settings-export]');if(output)output.value=JSON.stringify(this.config,null,2);
      root.querySelector('[data-copy-settings]')?.addEventListener('click',async()=>{
        const statusNode=root.querySelector('[data-dialog-status]');
        try {await navigator.clipboard.writeText(JSON.stringify(this._settingsDraft||this.config,null,2));if(statusNode)statusNode.textContent='Configuration copied. Paste it into this card’s Home Assistant configuration editor, then save.';}
        catch {output?.focus();output?.select();if(statusNode)statusNode.textContent='Select and copy the configuration below. Save it in this card’s Home Assistant configuration editor.';}
      });
    }
    for(const input of root.querySelectorAll('[data-humidity-boundary]'))input.oninput=()=>{
      const key=input.dataset.humidityBoundary, current=humidityBands(this._displayDraft)||this._displayDraft.humidity_bands||{};
      const number=input.value.trim()===''?NaN:Number(input.value);
      this._displayDraft={...this._displayDraft,humidity_bands:input.type==='range'?moveHumidityBoundary(current,key,number):{...current,[key]:number}};
      const update=renderDialog({...this._dialogSpec,model:this.model(),config:this._displayDraft});this._paintHumidityDraft(update.html);
    };
    root.querySelector('[data-copy-humidity]')?.addEventListener('click',async()=>{
      if(!humidityBands(this._displayDraft))return;
      const statusNode=root.querySelector('[data-dialog-status]');
      const text=JSON.stringify(this._displayDraft,null,2);
      try{await navigator.clipboard.writeText(text);if(statusNode)statusNode.textContent='Configuration copied. Paste it into this card’s Home Assistant configuration editor, then save.';}
      catch{
        let output=root.querySelector('[data-humidity-export]');
        if(!output){output=document.createElement('textarea');output.dataset.humidityExport='';output.readOnly=true;output.setAttribute('aria-label','Draft humidity configuration');output.style.cssText='width:100%;min-height:150px;color:inherit;background:#0b1420';root.querySelector('.body').append(output);}
        output.value=text;output.focus();output.select();if(statusNode)statusNode.textContent='Select and copy the configuration shown below, then save it in this card’s Home Assistant editor.';
      }
    });
    for (const id of openSections) root.querySelector(`#${CSS.escape(id)}`)?.setAttribute('open','');
    if (show || wasOpen) dialog.showModal();
    const content=root.querySelector('.content,.body');if(content)content.scrollTop=scroll;
    if (focus) root.querySelector(`[data-focus="${CSS.escape(focus)}"]`)?.focus({preventScroll:true});
    else if(summaryId)root.querySelector(`#${CSS.escape(summaryId)} > summary`)?.focus({preventScroll:true});
    else if(actionAttribute)root.querySelector(`[${actionAttribute}="${CSS.escape(actionValue)}"]`)?.focus({preventScroll:true});
  }
  _paintHumidityDraft(html) {
    const root=this._dialogHost?.shadowRoot;if(!root)return;
    const template=document.createElement('template');template.innerHTML=html;const next=template.content;
    const status=next.querySelector('dialog')?.getAttribute('data-reading-status');if(status)root.querySelector('dialog')?.setAttribute('data-reading-status',status);
    // Update the source preview without replacing focused fields or a captured slider.
    for(const selector of ['.track','.preview','.reading','[data-dialog-status]']) {
      const current=root.querySelector(selector), replacement=next.querySelector(selector);
      if(current&&replacement){current.innerHTML=replacement.innerHTML;const style=replacement.getAttribute('style');if(style!==null)current.setAttribute('style',style);}
    }
    for(const input of root.querySelectorAll('[data-humidity-boundary]')){
      const selector=`input[type="${input.type}"][data-humidity-boundary="${CSS.escape(input.dataset.humidityBoundary)}"]`, replacement=next.querySelector(selector);
      if(!replacement)continue;
      if(input!==root.activeElement||input.type==='range')input.value=replacement.value;
      input.disabled=replacement.disabled;
      for(const attribute of ['aria-invalid','aria-valuetext'])if(replacement.hasAttribute(attribute))input.setAttribute(attribute,replacement.getAttribute(attribute));
    }
    const copy=root.querySelector('[data-copy-humidity]'), newCopy=next.querySelector('[data-copy-humidity]');if(copy&&newCopy)copy.disabled=newCopy.disabled;
    for(const button of root.querySelectorAll('[data-dialog-info]'))button.onclick=()=>this._moreInfo(button.dataset.dialogInfo);
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
    const model = this.model(), status = this._coordinator.status;
    const focused = this.shadowRoot.activeElement?.getAttribute('data-focus');
    const headerScroll = this.shadowRoot.querySelector('[data-header-telemetry]')?.scrollLeft || 0;
    const statusMessage = this._draftMessage || (status.phase !== 'idle' ? status.message : this._registryStatus === 'loading' ? 'Checking thermostat provider identity…' : model.reason || '');
    // Unrelated HA updates must not replace an open native select or its focus.
    // Readiness, capabilities and command status still participate in this markup.
    const html = `<style>${styles}</style>` + renderCard({ config:this.config,model,open:this._open,allowed:this._guard(model).allowed,busy:this._coordinator.busy,
      draftValues:this._draftContext?{...model.targets,[this._targetKey(model)]:this._draft}:null,statusMessage,preview:this._isPreview(),animationOffset:this._animationOffset });
    if (html === this._viewHTML) {
      this._renderDialog(); this._scheduleFreshness(); return;
    }
    this._view.innerHTML = html; this._viewHTML = html;
    this.shadowRoot.querySelector('[data-expand]')?.addEventListener('click',()=>{this._open=!this._open;this._activity();this.render();});
    for (const button of this.shadowRoot.querySelectorAll('[data-details]')) button.onclick=()=>this._moreInfo();
    for (const button of this.shadowRoot.querySelectorAll('[data-info]')) button.onclick=()=>this._moreInfo(button.dataset.info);
    for (const button of this.shadowRoot.querySelectorAll('[data-device]')) this._bindDevice(button);
    for (const button of this.shadowRoot.querySelectorAll('[data-status-overview]')) button.onclick=()=>this._openDialog('overview');
    for (const button of this.shadowRoot.querySelectorAll('[data-presets]')) button.onclick=()=>this._openDialog('presets');
    for (const button of this.shadowRoot.querySelectorAll('[data-icon-settings]')) button.onclick=()=>this._openDialog('settings');
    for (const button of this.shadowRoot.querySelectorAll('[data-telemetry-topic]')) button.onclick=()=>this._openDialog('telemetry',button.dataset.telemetryKey||button.dataset.telemetryTopic);
    for (const button of this.shadowRoot.querySelectorAll('[data-adjust]')) button.onclick=()=>{const current=this.model(),key=button.dataset.adjust;this._temperature(current.targets[key]+Number(button.dataset.delta)*current.step,key);this._activity();};
    for (const button of this.shadowRoot.querySelectorAll('[data-preset]')) button.onclick=()=>{this._request('set_preset_mode',{preset_mode:button.dataset.preset});this._activity();};
    for (const select of this.shadowRoot.querySelectorAll('[data-choice]')) select.onchange=()=>{const choice=this.model().choices.find(row=>row.key===select.dataset.choice);if(choice)this._request(choice.service,{[choice.key]:select.value});this._activity();};
    for (const marker of this.shadowRoot.querySelectorAll('[data-marker]')) this._bindMarker(marker,model);
    const strip=this.shadowRoot.querySelector('[data-header-telemetry]');
    if(strip){strip.scrollLeft=headerScroll;strip.onkeydown=event=>{if(event.target!==strip)return;const moves={ArrowLeft:-120,ArrowRight:120};if(event.key in moves){event.preventDefault();strip.scrollLeft+=moves[event.key];}else if(['Home','End'].includes(event.key)){event.preventDefault();strip.scrollLeft=event.key==='Home'?0:strip.scrollWidth;}};strip.onfocusin=event=>{if(event.target===strip||!event.target.matches(':focus-visible'))return;const box=strip.getBoundingClientRect(),item=event.target.getBoundingClientRect();if(item.left<box.left)strip.scrollLeft-=box.left-item.left;else if(item.right>box.right)strip.scrollLeft+=item.right-box.right;};}
    if (focused) this.shadowRoot.querySelector(`[data-focus="${CSS.escape(focused)}"]`)?.focus({preventScroll:true});
    this._renderDialog(); this._scheduleFreshness();
  }
}
