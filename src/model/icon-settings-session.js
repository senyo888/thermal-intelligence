// SPDX-License-Identifier: GPL-3.0-only
import { CARD_TYPE, normalizeConfig, snapshotDialogConfig } from './config.js';

export const canonical = value => JSON.stringify(value,(_,item)=>item&&typeof item==='object'&&!Array.isArray(item)?Object.fromEntries(Object.keys(item).sort().map(key=>[key,item[key]])):item);
const clone = value => {
  const snapshot=snapshotDialogConfig(value);
  if(!snapshot.complete)throw Error('This configuration cannot be copied safely. Use the Home Assistant card editor.');
  return snapshot.config;
};

/** Visit rendered card trees only. Unknown wrappers cannot acquire write authority. */
export function dashboardCards(dashboard) {
  const found=[];
  const walk=(value,path)=>{
    if(!value||typeof value!=='object')return;
    if(!Array.isArray(value)&&value.type===CARD_TYPE){found.push({path,config:value});return;}
    const fields=Array.isArray(value)?Object.keys(value):['vertical-stack','horizontal-stack','grid'].includes(value.type)?['cards']:['conditional','entity-filter'].includes(value.type)?['card']:[];
    for(const key of fields)if(Object.hasOwn(value,key))walk(value[key],[...path,Array.isArray(value)?Number(key):key]);
  };
  for(const [index,view] of (dashboard?.views??[]).entries()) {
    if(Array.isArray(view.cards))walk(view.cards,['views',index,'cards']);
    for(const [sectionIndex,section] of (view.sections??[]).entries())if(Array.isArray(section.cards))walk(section.cards,['views',index,'sections',sectionIndex,'cards']);
  }
  return found;
}

const writers = new WeakMap();
function writerMap(connection) {
  if(!writers.has(connection))writers.set(connection,new Map());
  return writers.get(connection);
}

/** Supported HA API, one captured card, one write, readback; never an atomic CAS. */
export class IconSettingsSession {
  constructor(context,{timeout=15000}={}) {this.context=context;this.timeout=timeout;this.busy=false;this.blocked=false;this.closed=false;this.saved=false;}
  identity() {
    const {hass,config,pathname,attached,preview,commandBusy}=this.context();
    if(this.closed||!attached)throw Error('Card detached. Reopen icon settings.');
    if(preview)throw Error('Save this draft with Home Assistant’s card editor while editing or previewing.');
    if(commandBusy)throw Error('Wait for the current control request before saving display settings.');
    if(hass?.connected!==true||!hass.connection||!hass.user?.id||typeof hass.callWS!=='function')throw Error('Reconnect to Home Assistant before saving icons.');
    if(hass.user.is_admin!==true)throw Error('An administrator is required to save icons here.');
    const path=pathname?.split('/')[1],panel=hass.panels?.[path];
    if(!path||panel?.component_name!=='lovelace'||panel.url_path!==path||panel.config?.mode!=='storage')throw Error('Direct save requires a storage dashboard. Use the card editor or advanced export.');
    return {path,pathname,connection:hass.connection,socket:hass.connection.socket,user:hass.user.id,source:canonical(normalizeConfig(clone(config)))};
  }
  guard() {
    const next=this.identity();
    if(this.bound&&Object.keys(next).some(key=>next[key]!==this.bound[key]))throw Error('Dashboard, connection or card settings changed. Reopen icon settings.');
    return this.context().hass;
  }
  bounded(promise) {
    let timer;
    return Promise.race([promise,new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('The dashboard did not respond. Reopen icon settings before trying again.')),this.timeout);})]).finally(()=>clearTimeout(timer));
  }
  async read(hass=this.guard()) {return clone(await this.bounded(hass.callWS({type:'lovelace/config',url_path:this.bound.path})));}
  async load() {
    this.busy=true;
    try {
      this.bound=this.identity();const original=await this.read();this.guard();
      const matches=[];
      const inspect=(value,path=[])=>{
        if(!value||typeof value!=='object')return;
        if(value.type===CARD_TYPE) {
          try{if(canonical(normalizeConfig(value))===this.bound.source)matches.push({path,config:value});}catch{/* Invalid stored candidates cannot match. */}
        }
        for(const [key,child] of Object.entries(value))if(child&&typeof child==='object')inspect(child,[...path,Array.isArray(value)?Number(key):key]);
      };
      // Detect copies in unknown wrappers/templates too, without granting them write authority.
      inspect(original);
      if(matches.length!==1)throw Error(matches.length?'More than one saved card matches. Use Home Assistant’s editor to change this card only.':'This card differs from its saved dashboard. Refresh it or use Home Assistant’s editor.');
      if(!dashboardCards(original).some(row=>canonical(row.path)===canonical(matches[0].path)))throw Error('This card’s dashboard wrapper is not supported for direct saving. Use Home Assistant’s editor or advanced export.');
      this.original=original;this.path=matches[0].path;this.savedCard=clone(matches[0].config);
    } finally {this.busy=false;}
  }
  async save(draft) {
    if(this.busy||this.blocked||!this.original)throw Error('Reopen icon settings before saving.');
    const hass=this.guard(),map=writerMap(this.bound.connection);
    if(map.has(this.bound.path))throw Error('Another icon save is unresolved. Wait, then reopen these settings.');
    const accepted=normalizeConfig(clone(draft));
    const source=normalizeConfig(this.savedCard);
    // Only display metadata and appended custom readings belong to this dialog.
    const added=accepted.features.slice(source.features.length);
    if(canonical(accepted.features.slice(0,source.features.length))!==canonical(source.features)||added.some(row=>row.preset!==undefined))throw Error('Source mappings changed. Save those changes in Home Assistant’s editor.');
    const display=clone(this.savedCard);
    for(const key of ['vt_telemetry','header_icons'])if(canonical(accepted[key])!==canonical(source[key])) {
      if(accepted[key]===undefined)delete display[key];else display[key]=clone(accepted[key]);
    }
    if(added.length)display.features=[...(display.features??[]),...clone(added)];
    const remaining=clone(accepted),expected=normalizeConfig(display);
    if(canonical(remaining)!==canonical(expected))throw Error('Other draft settings changed. Use advanced export or Home Assistant’s editor.');
    const latch={settled:true,finished:false};map.set(this.bound.path,latch);this.busy=true;
    const release=()=>{if(latch.settled&&latch.finished&&map.get(this.bound.path)===latch)map.delete(this.bound.path);};
    try {
      const fresh=await this.read();this.guard();
      if(canonical(fresh)!==canonical(this.original))throw Error('The dashboard changed while you were editing. Reopen icon settings.');
      if(canonical(display)===canonical(this.savedCard)){this.saved=true;return {config:display,changed:false};}
      const candidate=clone(fresh);let parent=candidate;
      for(const key of this.path.slice(0,-1))parent=parent[key];
      parent[this.path.at(-1)]=display;
      const check=await this.read();this.guard();
      if(canonical(check)!==canonical(fresh))throw Error('The dashboard changed before saving. Reopen icon settings.');
      // HA has no revision/CAS parameter. Recheck captured intent at dispatch.
      const pending=Promise.resolve().then(()=>{
        this.guard();this.submitted=true;
        return hass.callWS({type:'lovelace/config/save',url_path:this.bound.path,config:candidate});
      });
      latch.settled=false;
      const settled=()=>{latch.settled=true;release();};pending.then(settled,settled);
      let failed=false;try{await this.bounded(pending);}catch{failed=true;}
      if(!this.submitted){this.guard();throw Error('The save was cancelled before dispatch.');}
      let after;
      try{after=await this.read(hass);}catch{throw Error('Save unconfirmed. Refresh the dashboard to check; do not repeat Save.');}
      if(canonical(after)!==canonical(candidate))throw Error(failed?'Save unconfirmed. Refresh the dashboard to check; do not repeat Save.':'The dashboard changed during saving. Refresh to inspect its current settings.');
      this.guard();this.saved=true;return {config:display,changed:true};
    } finally {this.blocked=true;this.busy=false;latch.finished=true;release();}
  }
  close() {this.closed=true;}
}
