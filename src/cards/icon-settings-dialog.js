// SPDX-License-Identifier: GPL-3.0-only
import { normalizeConfig } from '../model/config.js';
import { buildModel } from '../model/climate.js';
import { IconOptions, iconOptionsStyles } from '../editor/icon-options.js';
import { settingsDialogStyles } from './dialog-styles.js';
import { feedbackStyles } from './interaction-feedback.js';

const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

export class IconSettingsDialog {
  constructor(owner,root) {
    this.owner=owner;this.root=root;this.draft=owner._displayDraft;this.message='';this.copying=false;
    root.innerHTML=`<style>${settingsDialogStyles}${iconOptionsStyles}${feedbackStyles}footer{flex-wrap:wrap}</style><dialog data-view="icons" aria-labelledby="ti-icons-title"><header><div><small>${esc(owner.config.name||owner.model().name||'Thermostat')} · this card</small><h2 id="ti-icons-title">Top row icon settings</h2></div><button data-icon-close aria-label="Close icon settings">×</button></header><div class="body"><p>Changes here are a draft; save them in Home Assistant. Choose the readings beside the card name. Drag the handles, use the arrows, or focus a handle and press Up or Down. Primary icons appear first.</p><div data-icon-options></div><details class="add"><summary>Add reading</summary><p>Add a reported entity value. For typed sources, freshness limits and other display settings, use advanced configuration.</p>${[['entity','Entity'],['label','Label (optional)'],['attribute','Attribute (optional)'],['unit','Unit (optional)'],['icon','Icon (optional)']].map(([key,label])=>`<label>${label}<input data-icon-add="${key}" ${key==='entity'?'list="ti-icon-entities"':''} ${key==='icon'?'placeholder="mdi:thermometer"':''}></label>`).join('')}<datalist id="ti-icon-entities"></datalist><button data-icon-add-reading>Add to draft</button><p data-icon-add-error role="alert"></p></details><p class="scope">To save, open Edit dashboard → Edit this card → Readings and icons → Top row icon settings. Or copy this draft into that card’s configuration editor. Changes here remain a preview until saved in Home Assistant.</p><button data-icon-advanced>Advanced configuration and export</button> ${owner.model().provider.kind==='vtherm'?'<button data-vt-settings>Open VT device settings</button>':''}</div><footer><p data-icon-status class="status" role="status" style="flex-basis:100%;margin:0"></p><button data-icon-cancel>Cancel</button><button data-copy-icons>Copy configuration</button></footer></dialog>`;
    this.dialog=root.querySelector('dialog');
    this.options=new IconOptions(root.querySelector('[data-icon-options]'),next=>{this.draft=normalizeConfig(next);this.message='';this.update();});
    this.dialog.addEventListener('cancel',event=>{event.preventDefault();owner._closeDialog();});
    for(const button of root.querySelectorAll('[data-icon-close],[data-icon-cancel]'))button.onclick=()=>{owner._closeDialog();};
    root.querySelector('[data-copy-icons]').onclick=()=>this.copy();
    root.querySelector('[data-icon-advanced]').onclick=()=>{owner._openDialog('settings',undefined,owner._displayExportComplete?this.draft:undefined);owner._dialogHost?.shadowRoot.querySelector('#advanced-export')?.setAttribute('open','');};
    root.querySelector('[data-vt-settings]')?.addEventListener('click',()=>owner._deviceSettings());
    root.querySelector('[data-icon-add-reading]').onclick=()=>this.add();
    const list=root.querySelector('datalist');
    for(const id of Object.keys(owner.hass?.states??{}).sort()){const option=document.createElement('option');option.value=id;list.append(option);}
  }
  current() {return this.owner._iconSettings===this&&this.owner.isConnected;}
  open() {
    this.dialog.showModal();this.root.querySelector('[data-icon-close]').focus();this.update();
  }
  update() {
    const disabled=!this.owner._displayExportComplete;
    const model=buildModel(this.owner.hass??{},this.draft,this.owner._identity);
    this.options.update(model,this.draft,disabled);
    const copy=this.root.querySelector('[data-copy-icons]');
    copy.disabled=disabled;copy.setAttribute('aria-disabled',String(disabled||this.copying));copy.setAttribute('aria-busy',String(this.copying));copy.textContent=this.copying?'Copying…':'Copy configuration';
    for(const control of this.root.querySelectorAll('[data-icon-add],[data-icon-add-reading]'))control.disabled=disabled;
    const output=this.root.querySelector('[data-icon-export]');
    if(output)output.value=disabled?'':JSON.stringify(this.draft,null,2);
    const status=this.root.querySelector('[data-icon-status]');
    status.textContent=disabled?'This configuration cannot be copied safely. Use the Home Assistant card editor.':this.message;status.hidden=!status.textContent;
  }
  add() {
    if(!this.owner._displayExportComplete)return;
    const error=this.root.querySelector('[data-icon-add-error]');
    try {
      const feature=Object.fromEntries([...this.root.querySelectorAll('[data-icon-add]')].map(node=>[node.dataset.iconAdd,node.value.trim()]).filter(([,value])=>value));
      if(!feature.entity||!Object.hasOwn(this.owner.hass?.states??{},feature.entity))throw Error('Choose an existing entity.');
      const next=normalizeConfig({...this.draft,features:[...(this.draft.features??[]),feature]});
      this.draft=next;this.message='';error.textContent='';for(const node of this.root.querySelectorAll('[data-icon-add]'))node.value='';this.update();
    }catch(problem){error.textContent=problem.message;}
  }
  async copy() {
    if(!this.owner._displayExportComplete||this.copying)return;
    // Export is explicit; no dashboard lookup, inferred target or write authority.
    const text=JSON.stringify(this.draft,null,2);
    this.copying=true;this.update();
    try {
      await navigator.clipboard.writeText(text);
      if(!this.current())return;
      this.message=text===JSON.stringify(this.draft,null,2)?'Configuration copied. Nothing has been saved yet. Paste it into this card’s Home Assistant configuration editor, then save.':'Earlier draft copied. Copy again to include your latest changes. Nothing has been saved yet.';
    } catch {
      if(!this.current())return;
      let output=this.root.querySelector('[data-icon-export]');
      if(!output){output=document.createElement('textarea');output.dataset.iconExport='';output.readOnly=true;output.setAttribute('aria-label','Draft icon configuration');output.style.cssText='width:100%;min-height:150px;color:inherit;background:#0b1420';this.root.querySelector('.body').append(output);}
      output.value=JSON.stringify(this.draft,null,2);output.focus();output.select();
      this.message='Select and copy the configuration shown. Paste it into this card’s Home Assistant configuration editor, then save.';
    } finally {this.copying=false;if(this.current())this.update();}
  }
  close() {this.options.close();}
}
