// SPDX-License-Identifier: GPL-3.0-only
const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));

export function mappedDialog(item, on) {
  return `<style>
    dialog{color:#eff5ff;background:#0d1622;border:1px solid #34465c;border-radius:20px;padding:24px;width:min(440px,calc(100vw - 32px));box-sizing:border-box;font:14px/1.5 system-ui;max-height:calc(100dvh - 32px);overflow:auto}
    dialog::backdrop{background:#0009}h2{margin:0;font-size:20px}p{overflow-wrap:anywhere}.target{color:#a9b8cb}footer{display:flex;flex-wrap:wrap;gap:12px;margin-top:24px}button{font:inherit;min-height:44px;padding:10px 16px;border:1px solid #536782;border-radius:12px;background:#152234;color:inherit;cursor:pointer}button:disabled{opacity:.5;cursor:default}button:focus-visible{outline:3px solid #8ac9f1;outline-offset:3px}[data-mapped-submit]{background:#26465b}
  </style><dialog data-mapped-dialog aria-labelledby="mapped-title" aria-describedby="mapped-warning"><h2 id="mapped-title">Turn ${on ? 'on' : 'off'} ${esc(item.label)}?</h2><p class="target">${esc(item.entity)}</p><p data-mapped-current></p><p id="mapped-warning">This switch can change thermostat mode or trigger other automations. Turning it off may stop heating. TI will not restore a previous mode or temperature.</p><p data-mapped-message role="status" aria-live="polite"></p><footer><button type="button" data-mapped-close autofocus>Cancel</button><button type="button" data-mapped-submit>Turn ${on ? 'on' : 'off'}</button></footer></dialog>`;
}
