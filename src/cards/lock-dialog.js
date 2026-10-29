// SPDX-License-Identifier: GPL-3.0-only
import { overviewDialogStyles } from './dialog-styles.js';

const esc = value => String(value ?? '').replace(/[&<>"']/g, character => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[character]));

/** This shell never receives a code. Its input stays mounted until the dialog closes. */
export function lockDialog({ name, locked, codeRequired }) {
  return `<style>${overviewDialogStyles}
dialog{width:min(400px,calc(100vw - 24px))}.lock-state{font-size:15px;color:#eff5ff;margin:0 0 8px}.lock-code{display:block;margin-top:16px;font-size:12px;color:#c4d0df}.lock-code input{display:block;width:100%;margin-top:6px;min-height:44px;border:1px solid #607d9e66;border-radius:10px;padding:9px 12px;font:inherit;color:#eff5ff;background:#152234}.lock-code[hidden]{display:none}.lock-message{min-height:19px;margin-top:14px}footer [data-lock-submit]:enabled{background:#24483f;border-color:#79bfa15e;color:#e1fff2}input:disabled{opacity:.5}
</style><dialog aria-labelledby="lock-title" data-lock-dialog><form class="shell">
<header><div><p class="eyebrow">THERMOSTAT LOCK</p><h2 id="lock-title">${esc(name)}</h2></div><button type="button" class="close" data-lock-close aria-label="Close lock controls">×</button></header>
<div class="content"><p class="lock-state" data-lock-current></p><p data-lock-scope></p><p data-lock-relock></p>
<label class="lock-code" ${codeRequired ? '' : 'hidden'}>Lock code<input type="password" data-lock-code autocomplete="off" autocapitalize="none" spellcheck="false" ${codeRequired ? 'required' : 'disabled'}></label>
<p class="lock-message" data-lock-message role="status" aria-live="polite"></p></div>
<footer><button type="button" data-lock-close data-lock-dismiss>Cancel</button><button type="submit" data-lock-submit>${locked ? 'Lock thermostat' : 'Unlock thermostat'}</button></footer>
</form></dialog>`;
}

export function lockScope(capability) {
  if (capability.lockUsers === true && capability.lockAutomations === true) return 'Locks changes from users and automations.';
  if (capability.lockUsers === true && capability.lockAutomations === false) return 'Locks changes from users. Automations remain available.';
  if (capability.lockUsers === false && capability.lockAutomations === true) return 'Locks changes from automations. User controls remain available.';
  return 'Lock scope is unavailable.';
}

export function lockRelock(capability) {
  if (capability.autoRelockSec === 0) return 'Automatic relocking is off.';
  if (Number.isFinite(capability.autoRelockSec) && capability.autoRelockSec > 0) return `VT relocks ${capability.autoRelockSec} seconds after unlocking.`;
  return 'Automatic relock timing is unavailable.';
}
