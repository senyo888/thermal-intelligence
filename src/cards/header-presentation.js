// SPDX-License-Identifier: GPL-3.0-only
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const states=new Set(['window','motion','presence','power_management','follow']);
const colours={eco:'#7dc39c',comfort:'#e3b778',boost:'#e78e76',frost:'#9bcbe9',window:'#efb86b',motion:'#b9a1e6',presence:'#7dc39c',follow:'#73c9bd',power_management:'#efb86b'};
const colour=(value,fallback)=>/^#[0-9a-f]{6}$/i.test(value??'')?value:fallback;
const presetColour=key=>Object.hasOwn(colours,key)?colours[key]:null;

/** One visual slot, with ownership and preset evidence retained as separate facts. */
export function compactHeader(model) {
  const rows=model.headerTelemetry??[],isControl=row=>row.group==='control'||!!row.preset;
  const selected=rows.filter(isControl);
  if(!selected.length)return rows;
  const owner=selected.find(row=>row.key==='control:ownership');
  // The existing ownership visibility setting now gates the shared slot.
  if(!owner)return rows.filter(row=>!isControl(row));
  const manual=!model.ownership?.source&&selected.find(row=>row.key==='control:manual_adjustment'&&row.status==='available');
  const primary=manual||owner;
  const known=owner.status==='available'&&!['Unknown','Pending'].includes(owner.value);
  const house=selected.find(row=>row.key==='control:house'&&row.status==='available');
  // An explicit schedule-mode mapping owns this badge even when hidden or degraded.
  const scheduled=(model.headerOptions??rows).some(row=>row.key==='control:schedule_preset');
  const scheduleMode=selected.find(row=>row.key==='control:schedule_preset'&&row.status==='available');
  const preset=known||manual?(owner.value==='House'&&!manual?house:owner.value==='Schedule'&&scheduled?scheduleMode:selected.find(row=>row.preset&&row.status==='available')):null;
  const presetLabel=owner.value==='House'||preset?.schedulePreset?preset?.value:(model.headerOptions??rows).find(row=>row.key===`preset:${preset?.preset}`)?.value||model.presetReadings?.[preset?.preset]?.label||preset?.shortLabel||preset?.value;
  const presetKind=owner.value==='House'?'House policy':preset?.schedulePreset?'Last confirmed schedule mode':'Thermostat preset';
  const title=`${manual?'Last confirmed card action: Manual adjustment; ':''}Control source: ${owner.value}${preset?`; ${presetKind}: ${presetLabel}`:''}`;
  const facts=(model.headerOptions??rows).filter(row=>
    row.group==='control'&&!row.preset&&row.key!=='control:manual_adjustment'
    ||row.preset&&row.headerEligible!==false
    ||row.key==='control:manual_adjustment'&&row.headerEligible);
  const summary={...primary,key:'control:summary',label:'Control source and preset',title,value:manual?'Manual adjustment (last action)':owner.value,topic:'entity',group:'control',activity:known||manual?'active':'unknown',lastAction:!!manual,
    source:manual?manual.source:model.ownership?.source,
    secondary:preset?{icon:preset.icon,preset:owner.value==='House'?String(preset.value).toLowerCase():preset.schedulePreset||preset.preset}:null,
    detail:'The source, thermostat preset, House policy, last confirmed schedule mode and schedule activity are independent reported facts. A confirmed schedule mode records accepted intent, not a running period or Boost timer. Provider identity and matching temperatures do not establish ownership. Unknown means no confirmed control source is available.',
    detailRows:facts.map(row=>({label:row.label,value:row.value??row.status})),
  };
  const first=rows.findIndex(isControl);
  return rows.flatMap((row,index)=>index===first?[summary]:isControl(row)?[]:[row]);
}

/** Compact visual content; full state and source stay in the accessible name and dialog. */
export function headerPresentation(item) {
  const binary=typeof item.rawValue==='boolean'||['on','On','off','Off','true','false'].includes(item.rawValue);
  const iconOnly=!!item.preset||item.group==='control'||states.has(item.kind)||item.vtKey==='auto_start_stop'||binary;
  const title=item.title||`${item.label??'Telemetry'}: ${item.value??'Unavailable'}${item.activityLabel?` · ${item.activityLabel}`:''}`;
  const uncertain=['unknown','unavailable','invalid','stale','unsupported'].includes(item.status);
  const preset=item.preset||(item.key==='control:house'?String(item.value).toLowerCase():null);
  const tint=uncertain?'#8795a8':item.key==='control:provider'?'#8abfda':iconOnly
    ?item.activity==='active'?colour(item.colour,presetColour(preset)||presetColour(item.kind)||'#8abfda'):'#a9b8cb'
    :colour(item.colour,item.activity==='active'?'#8abfda':'#a9b8cb');
  const glyph=item.monogram?`<b class="provider-monogram ${item.monogram==='P'?'policy-monogram':''}">${esc(item.monogram)}</b>`:`<ha-icon icon="${esc(item.icon||'mdi:information-outline')}"></ha-icon>`;
  const source=item.secondary?`<ha-icon class="preset-mark" style="color:${presetColour(item.secondary.preset)||'#8abfda'}" icon="${esc(item.secondary.icon)}"></ha-icon>`:item.badge==='House'?'<ha-icon class="source-mark" icon="mdi:home"></ha-icon>':'';
  const action=item.lastAction?'<ha-icon class="action-mark" icon="mdi:history"></ha-icon>':'';
  const issue=uncertain&&!['control:ownership','control:summary'].includes(item.key)?`<ha-icon class="state-mark" icon="${item.status==='unknown'?'mdi:help-circle-outline':'mdi:alert-circle-outline'}"></ha-icon>`:'';
  const content=`<span class="header-glyph" aria-hidden="true">${glyph}${source}${issue}${action}</span>${iconOnly?'':`<span aria-hidden="true">${esc(item.value??'Unavailable')}</span>`}`;
  return {title,colour:tint,iconOnly,content};
}

export const headerGlyphStyles=`
.header-glyph{position:relative;display:inline-flex;align-items:center;justify-content:center;width:24px;height:24px;flex:none;color:var(--telemetry-colour,#a9b8cb)}
.header-glyph>ha-icon{width:16px;height:16px;--mdc-icon-size:16px;color:inherit}
.header-glyph>ha-icon.source-mark,.header-glyph>ha-icon.state-mark{position:absolute;right:-2px;width:10px;height:10px;--mdc-icon-size:10px;background:#0b111b;border-radius:50%}
.header-glyph>.source-mark{bottom:-1px}.header-glyph>.state-mark{top:-2px}
.header-glyph>ha-icon.preset-mark{position:absolute;right:-5px;bottom:-3px;width:13px;height:13px;--mdc-icon-size:13px;background:#0b111b;border-radius:50%;box-shadow:0 0 0 2px #0b111b}
.header-glyph>ha-icon.action-mark{position:absolute;left:-3px;top:-3px;width:10px;height:10px;--mdc-icon-size:10px;background:#0b111b;border-radius:50%}
.provider-monogram{display:inline-grid;place-items:center;width:20px;height:20px;font-size:10px;letter-spacing:-.5px;border:1px solid currentColor;border-radius:6px;color:inherit;flex:none}
.provider-monogram.policy-monogram{border-radius:50%;letter-spacing:0}
`;
