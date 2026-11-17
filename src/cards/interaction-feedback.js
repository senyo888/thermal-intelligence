// SPDX-License-Identifier: GPL-3.0-only
// Activation feedback is presentation only. It never dispatches or reports success.
export const feedbackStyles = `
button:not([data-marker]):not([data-device]):not([data-details]):enabled:active,
button:not([data-marker]):not([data-device]):not([data-details])[data-activated] {
  background-color:var(--ti-press-background,#36516b);
  border-color:var(--ti-press-border,#add9ff);
  box-shadow:inset 0 2px 5px #0005,0 0 0 2px #9fcfff35;
}
button[data-marker]:active,button[data-device]:active,button[data-details]:active { filter:brightness(1.35); }
button[aria-pressed=true] { border-color:#99dbbf; box-shadow:inset 0 0 0 1px #99dbbf88; }
.presets button[aria-pressed=true] { background:#284c43;color:#edfff6; }
.selection-mark { display:inline-block;width:1em;margin-right:3px;visibility:hidden; }
[aria-pressed=true]>.selection-mark { visibility:visible; }
.request-feedback { padding:8px 10px;border:1px solid #7eabd057;border-radius:9px;background:#15283a; }
.request-feedback[data-phase=uncertain],.request-feedback[data-phase=failed] { border-color:#dcb07b; }
@media(prefers-reduced-motion:reduce) { button { transition:none!important; } }
`;

export function bindActivationFeedback(root) {
  if (root.__tiActivationFeedback) return;
  root.__tiActivationFeedback = true;
  root.addEventListener('click', event => {
    const button = event.composedPath().find(node => node?.tagName === 'BUTTON');
    if (!button || button.disabled || button.hasAttribute('data-marker') || button.hasAttribute('aria-pressed')) return;
    button.setAttribute('data-activated', '');
    setTimeout(() => button.removeAttribute('data-activated'), 400);
  }, { capture:true });
}
