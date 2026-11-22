// SPDX-License-Identifier: GPL-3.0-only
import { compactHeader, headerPresentation, headerGlyphStyles } from '../cards/header-presentation.js';
import { HEADER_GROUPS, orderHeaderIcons, moveHeaderIcon, setHeaderVisible } from '../model/header-icons.js';

const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const iconOptionsStyles=`${headerGlyphStyles}
.ti-icon-options{min-width:0}.ti-icon-options fieldset{border:1px solid #8096ad40;border-radius:14px;margin:16px 0;padding:10px;min-width:0}
.ti-icon-options legend{padding:0 6px;font-size:13px}.ti-icon-options p{font-size:12px;line-height:1.5;color:var(--secondary-text-color,#aebed0)}
.ti-icon-options .icon-choice{display:flex;align-items:center;gap:8px;min-height:64px;padding:7px 2px;border-bottom:1px solid #8096ad20}.ti-icon-options .icon-choice:last-child{border:0}
.ti-icon-options label{display:flex;align-items:center;gap:8px;flex:1;min-width:0;cursor:pointer}.ti-icon-options label>span{min-width:0;overflow-wrap:anywhere;font-size:13px}
.ti-icon-options small{display:block;font-size:11px;color:var(--secondary-text-color,#aebed0);margin-top:4px;line-height:1.4}
.ti-icon-options input[type=checkbox]{accent-color:#8dc4af;min-width:20px;width:20px;height:20px;min-height:20px;padding:0;margin:0}
.ti-icon-options ha-icon{--mdc-icon-size:18px;width:18px;height:18px;flex:none}
.ti-icon-options .icon-order{display:flex;align-items:center;gap:2px}.ti-icon-options .icon-arrows{display:flex;flex-direction:column}
.ti-icon-options button{color:inherit;background:#8096ad12;border:1px solid #8096ad40;border-radius:8px;cursor:pointer;min-height:28px;width:30px;padding:4px}
.ti-icon-options [data-icon-grip]{touch-action:none;user-select:none;cursor:grab;width:32px;height:44px;border:0;background:transparent}.ti-icon-options .dragging{background:#8ac9f11c;border-radius:8px}
.ti-icon-options :focus-visible{outline:2px solid #8ac9f1;outline-offset:2px}.ti-icon-options :disabled{opacity:.45;cursor:default}
.ti-icon-options .icon-preview{display:flex;gap:12px;overflow:auto;min-height:48px;align-items:center;padding:10px;border:1px solid #8096ad40;border-radius:12px}
.ti-icon-options .icon-preview>span{display:inline-flex;gap:5px;align-items:center;white-space:nowrap;font-size:12px}.ti-icon-options .icon-sr{position:absolute;width:1px;height:1px;margin:-1px;padding:0;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap}
`;

/** Shared display-only editor. Live observations update without replacing controls. */
export class IconOptions {
  constructor(host,onChange) {
    this.host=host;this.onChange=onChange;host.classList.add('ti-icon-options');
    host.addEventListener('change',event=>{
      const key=event.target.dataset.iconVisible,row=this.rows?.find(item=>item.key===key);
      if(row&&!this.disabled)this.onChange(setHeaderVisible(this.config,row,event.target.checked));
    });
    host.addEventListener('click',event=>{
      const button=event.target.closest('[data-icon-move]');
      if(button&&!this.disabled)this.move(button.closest('[data-icon-row]').dataset.iconRow,Number(button.dataset.iconMove));
    });
    host.addEventListener('keydown',event=>{
      if(!event.target.hasAttribute('data-icon-grip')||this.disabled)return;
      if(['ArrowUp','ArrowDown'].includes(event.key)){event.preventDefault();this.move(event.target.closest('[data-icon-row]').dataset.iconRow,event.key==='ArrowUp'?-1:1);}
      if(event.key==='Escape'&&this.drag){event.preventDefault();event.stopPropagation();this.endDrag(false);}
    });
    host.addEventListener('pointerdown',event=>{
      const handle=event.target.closest('[data-icon-grip]');
      if(!handle||this.disabled||event.button!==0||event.isPrimary===false)return;
      const row=handle.closest('[data-icon-row]');
      this.drag={handle,row,key:row.dataset.iconRow,id:event.pointerId,y:event.clientY,start:event.clientY};
      handle.setPointerCapture(event.pointerId);handle.focus();
    });
    host.addEventListener('pointermove',event=>{
      if(this.drag?.id!==event.pointerId)return;
      this.drag.y=event.clientY;this.drag.row.classList.toggle('dragging',Math.abs(this.drag.y-this.drag.start)>5);
    });
    host.addEventListener('pointerup',event=>{if(this.drag?.id===event.pointerId)this.endDrag(true);});
    for(const name of ['pointercancel','lostpointercapture'])host.addEventListener(name,event=>{if(this.drag?.id===event.pointerId)this.endDrag(false);});
  }
  move(key,offset) {
    const next=moveHeaderIcon(this.config,this.rows,key,offset);
    if(next===this.config)return;
    const active=this.host.getRootNode().activeElement;
    const action=active?.dataset.iconMove??'grip';
    this.onChange(next);
    const row=[...this.host.querySelectorAll('[data-icon-row]')].find(node=>node.dataset.iconRow===key);
    const target=row?.querySelector(action==='grip'?'[data-icon-grip]':`[data-icon-move="${action}"]`);
    (target?.disabled?row?.querySelector('[data-icon-grip]'):target)?.focus({preventScroll:true});
    const message=this.host.querySelector('[data-icon-announcement]');if(message)message.textContent=`${this.rows.find(item=>item.key===key)?.label} moved.`;
  }
  endDrag(commit) {
    const drag=this.drag;if(!drag)return;this.drag=null;drag.row.classList.remove('dragging');
    if(drag.handle.hasPointerCapture(drag.id))drag.handle.releasePointerCapture(drag.id);
    if(commit&&Math.abs(drag.y-drag.start)>5) {
      const group=drag.row.closest('fieldset');
      const nodes=[...group.querySelectorAll('[data-icon-row]')],from=nodes.indexOf(drag.row);
      const others=nodes.filter(node=>node!==drag.row);
      const before=others.findIndex(node=>{const r=node.getBoundingClientRect();return drag.y<r.top+r.height/2;});
      this.move(drag.key,(before<0?others.length:before)-from);
    }
  }
  update(model,config,disabled=false) {
    this.model=model;this.config=config;this.disabled=disabled;
    this.rows=HEADER_GROUPS.flatMap(group=>orderHeaderIcons((model?.headerOptions??[]).filter(row=>row.group===group&&!['control:provider','control:schedule'].includes(row.key)),config.header_icons?.order))
      .map(row=>row.key==='control:ownership'?{...row,label:'Combined control indicator'}:row);
    const signature=JSON.stringify(this.rows.map(row=>[row.key,row.group]));
    if(this.drag&&(disabled||signature!==this.signature))this.endDrag(false);
    if(signature!==this.signature&&!this.drag) {
      this.signature=signature;
      const group=(kind,title,note)=>{
        const rows=this.rows.filter(row=>row.group===kind);
        if(kind==='vt'&&!rows.length)return '<p>VT readings appear when the Versatile Thermostat provider is selected or verified. Use Find VT sources in advanced settings if identity is not yet known.</p>';
        return `<fieldset><legend>${title}</legend><p>${note}</p>${rows.map((row,index)=>`<div class="icon-choice" data-icon-row="${esc(row.key)}"><label><input type="checkbox" data-icon-visible="${esc(row.key)}" aria-label="Show ${esc(row.label)}"><ha-icon icon="${esc(row.icon)}" aria-hidden="true"></ha-icon><span><span data-icon-label>${esc(row.label)}</span><small data-icon-reading></small></span></label><div class="icon-order"><button data-icon-grip aria-label="Reorder ${esc(row.label)}" title="Drag or use arrow keys"><ha-icon icon="mdi:menu" aria-hidden="true"></ha-icon></button><div class="icon-arrows"><button data-icon-move="-1" data-edge="${index===0}" aria-label="Move ${esc(row.label)} up">↑</button><button data-icon-move="1" data-edge="${index===rows.length-1}" aria-label="Move ${esc(row.label)} down">↓</button></div></div></div>`).join('')||'<p>No mapped readings yet. Add a reading below.</p>'}</fieldset>`;
      };
      this.host.innerHTML=`<div class="icon-preview" aria-label="Draft top row preview"></div>${group('control','Presets and control source','One icon combines the reported source and selected preset. The combined control indicator switch hides the whole slot. Unknown source evidence hides the other control symbols. Provider identity and schedule activity remain in its details. Add source mappings in the card editor.')}${group('primary','Primary icons','Show or hide existing readings.')}${group('vt','VT readings','Optional provider observations. Selecting an icon does not enable or change a VT feature.')}<p class="icon-sr" data-icon-announcement role="status"></p>`;
    }
    const hidden=new Set(config.header_icons?.hidden??[]),selected=new Set(config.vt_telemetry??[]);
    for(const node of this.host.querySelectorAll('[data-icon-row]')) {
      const row=this.rows.find(item=>item.key===node.dataset.iconRow);if(!row)continue;
      node.querySelector('[data-icon-label]').textContent=row.label;
      const input=node.querySelector('input');input.setAttribute('aria-label',`Show ${row.label}`);
      node.querySelector('[data-icon-grip]').setAttribute('aria-label',`Reorder ${row.label}`);
      for(const button of node.querySelectorAll('[data-icon-move]'))button.setAttribute('aria-label',`Move ${row.label} ${button.dataset.iconMove==='-1'?'up':'down'}`);
      input.checked=row.group==='vt'?selected.has(row.vtKey):!hidden.has(row.key);
      const reading=node.querySelector('[data-icon-reading]');reading.textContent=`${row.value??row.status}${row.preset?' · when selected':''}`;reading.title=`${row.source.entity}${row.source.attribute?' · '+row.source.attribute:''}. ${row.detail||''}`;
      node.querySelector('ha-icon').setAttribute('icon',row.icon);
      for(const control of node.querySelectorAll('button,input'))control.disabled=disabled||control.dataset.edge==='true';
    }
    const preview=this.host.querySelector('.icon-preview');
    if(preview)preview.innerHTML=compactHeader(model??{}).map(row=>{const p=headerPresentation(row);return `<span role="img" aria-label="${esc(p.title)}" title="${esc(p.title)}" style="--telemetry-colour:${p.colour}">${p.content}</span>`;}).join('')||'<small>No visible top-row readings.</small>';
  }
  close() {this.endDrag(false);}
}
