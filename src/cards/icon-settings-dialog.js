// SPDX-License-Identifier: GPL-3.0-only
import { normalizeConfig } from '../model/config.js';
import { buildModel } from '../model/climate.js';
import { IconSettingsSession, canonical } from '../model/icon-settings-session.js';
import { IconOptions, iconOptionsStyles } from '../editor/icon-options.js';
import { settingsDialogStyles } from './dialog-styles.js';
import { feedbackStyles } from './interaction-feedback.js';

const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

export class IconSettingsDialog {
  constructor(owner,root) {
    this.owner=owner;this.root=root;this.draft=owner._displayDraft;this.original=canonical(this.draft);this.message='Loading saved card…';
    this.session=new IconSettingsSession(()=>({hass:owner.hass,config:owner.config,pathname:window.location.pathname,attached:owner.isConnected,preview:owner._isPreview(),commandBusy:owner._coordinator.busy}));
    root.innerHTML=`<style>${settingsDialogStyles}${iconOptionsStyles}${feedbackStyles}footer{flex-wrap:wrap}</style><dialog data-view="icons" aria-labelledby="ti-icons-title"><header><div><small>${esc(owner.config.name||owner.model().name||'Thermostat')} · this card</small><h2 id="ti-icons-title">Top row icon settings</h2></div><button data-icon-close aria-label="Close icon settings">×</button></header><div class="body"><p>Choose the readings beside the card name. Drag the handles, use the arrows, or focus a handle and press Up or Down. Primary icons appear first.</p><div data-icon-options></div><details class="add"><summary>Add reading</summary><p>Add a reported entity value. For typed sources, freshness limits and other display settings, use advanced configuration.</p>${[['entity','Entity'],['label','Label (optional)'],['attribute','Attribute (optional)'],['unit','Unit (optional)'],['icon','Icon (optional)']].map(([key,label])=>`<label>${label}<input data-icon-add="${key}" ${key==='entity'?'list="ti-icon-entities"':''} ${key==='icon'?'placeholder="mdi:thermometer"':''}></label>`).join('')}<datalist id="ti-icon-entities"></datalist><button data-icon-add-reading>Add to draft</button><p data-icon-add-error role="alert"></p></details><p class="scope">Save applies to this card only. Heating settings stay unchanged. Avoid editing this dashboard elsewhere while saving.</p><button data-icon-advanced>Advanced configuration and export</button> ${owner.model().provider.kind==='vtherm'?'<button data-vt-settings>Open VT device settings</button>':''}</div><footer><p data-icon-status class="status" role="status" style="flex-basis:100%;margin:0"></p><button data-icon-cancel>Cancel</button><button data-save-icons>Save icons</button></footer></dialog>`;
    this.dialog=root.querySelector('dialog');
    this.options=new IconOptions(root.querySelector('[data-icon-options]'),next=>{this.draft=normalizeConfig(next);this.update();});
    this.dialog.addEventListener('cancel',event=>{event.preventDefault();if(!this.session.busy||!this.session.original)owner._closeDialog();});
    for(const button of root.querySelectorAll('[data-icon-close],[data-icon-cancel]'))button.onclick=()=>{if(!this.session.busy||!this.session.original)owner._closeDialog();};
    root.querySelector('[data-save-icons]').onclick=()=>this.save();
    root.querySelector('[data-icon-advanced]').onclick=()=>{owner._openDialog('settings',undefined,owner._displayExportComplete?this.draft:undefined);owner._dialogHost?.shadowRoot.querySelector('#advanced-export')?.setAttribute('open','');};
    root.querySelector('[data-vt-settings]')?.addEventListener('click',()=>owner._deviceSettings());
    root.querySelector('[data-icon-add-reading]').onclick=()=>this.add();
    const list=root.querySelector('datalist');
    for(const id of Object.keys(owner.hass?.states??{}).sort()){const option=document.createElement('option');option.value=id;list.append(option);}
  }
  current() {return this.owner._iconSettings===this&&this.owner.isConnected;}
  async open() {
    this.dialog.showModal();this.root.querySelector('[data-icon-close]').focus();this.update();
    try{const loading=this.session.load();this.update();await loading;this.message='';}
    catch(error){this.message=error.message;}
    if(this.current())this.update();
  }
  update() {
    const disabled=this.session.busy||this.session.saved||!this.owner._displayExportComplete;
    const model=buildModel(this.owner.hass??{},this.draft,this.owner._identity);
    this.options.update(model,this.draft,disabled);
    let reason='';if(!this.session.saved)try{this.session.guard();}catch(error){reason=error.message;}
    const save=this.root.querySelector('[data-save-icons]');
    save.disabled=disabled||this.session.blocked||!this.session.original||!!reason||this.original===canonical(this.draft);
    save.textContent=this.session.busy&&this.session.original?'Saving…':'Save icons';
    for(const control of this.root.querySelectorAll('[data-icon-add],[data-icon-add-reading]'))control.disabled=disabled;
    for(const button of this.root.querySelectorAll('[data-icon-close],[data-icon-cancel],[data-icon-advanced],[data-vt-settings]'))button.disabled=this.session.busy&&!!this.session.original;
    this.root.querySelector('[data-icon-cancel]').textContent=this.session.saved?'Done':'Cancel';
    const status=this.root.querySelector('[data-icon-status]');
    status.textContent=!this.owner._displayExportComplete?'This configuration cannot be copied safely. Use the Home Assistant card editor.':reason||this.message;status.hidden=!status.textContent;
  }
  add() {
    if(this.session.busy||this.session.saved||!this.owner._displayExportComplete)return;
    const error=this.root.querySelector('[data-icon-add-error]');
    try {
      const feature=Object.fromEntries([...this.root.querySelectorAll('[data-icon-add]')].map(node=>[node.dataset.iconAdd,node.value.trim()]).filter(([,value])=>value));
      if(!feature.entity||!Object.hasOwn(this.owner.hass?.states??{},feature.entity))throw Error('Choose an existing entity.');
      const next=normalizeConfig({...this.draft,features:[...(this.draft.features??[]),feature]});
      this.draft=next;error.textContent='';for(const node of this.root.querySelectorAll('[data-icon-add]'))node.value='';this.update();
    }catch(problem){error.textContent=problem.message;}
  }
  async save() {
    if(this.root.querySelector('[data-save-icons]').disabled)return;
    this.message='Saving icons…';const pending=this.session.save(this.draft);this.update();
    try {
      const result=await pending;
      if(!this.current())return;
      try{this.session.guard();}catch{throw Error('Icons were saved, but the card context changed. Refresh the dashboard to load its current settings.');}
      // Only after a verified storage readback and unchanged captured context.
      this.owner.config=normalizeConfig(result.config);this.owner._configRevision++;
      this.owner._updateContext();this.owner._scheduleRender();
      this.message='Icons saved for this card.';
    }catch(error){this.message=error.message;}
    if(this.current()){this.update();this.root.querySelector('[data-icon-cancel]').focus();}
  }
  close() {this.options.close();this.session.close();}
}
