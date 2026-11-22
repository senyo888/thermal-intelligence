// SPDX-License-Identifier: GPL-3.0-only
// Native range thumbs share one track in the dashboard editor and the card dialog.
export const humidityTrackStyles = `
.bar{--thumb-width:22px;position:relative;direction:ltr;touch-action:none;height:52px;margin:12px 10px 0}
.bar:has(input:enabled){cursor:ew-resize}
.track{position:absolute;top:20px;height:12px;left:0;right:0;border-radius:8px;box-shadow:inset 0 1px 3px #0007}
.bar input{position:absolute;inset:0;margin:0;width:100%;height:52px;padding:0;appearance:none;-webkit-appearance:none;background:transparent;border:0;pointer-events:none;touch-action:none;min-height:0}
.bar input::-webkit-slider-thumb{appearance:none;-webkit-appearance:none;box-sizing:border-box;width:var(--thumb-width);height:40px;border:2px solid #e8f2ff;border-radius:7px;background:#20334a;pointer-events:none;box-shadow:0 2px 7px #0008}
.bar input::-moz-range-thumb{box-sizing:border-box;width:var(--thumb-width);height:40px;border:2px solid #e8f2ff;border-radius:7px;background:#20334a;pointer-events:auto;cursor:ew-resize}
.bar input:focus-visible{outline:none}
.bar input:focus-visible::-webkit-slider-thumb{box-shadow:0 0 0 3px #8ac9f1}
.bar input:focus-visible::-moz-range-thumb{box-shadow:0 0 0 3px #8ac9f1}
.scale{display:flex;justify-content:space-between;font-size:10px;color:#93a8bd;margin:0 3px 15px}
`;

/** Stacked native thumbs overlap at adjacent percentages. Pick by horizontal
 * distance so the last input in DOM order cannot steal an earlier boundary.
 * Keyboard edits still use the native range inputs.
 */
export function bindHumidityTrack(bar) {
  let drag;
  bar.addEventListener('pointerdown', event => {
    if (drag || event.button !== 0 || !event.isPrimary) return;
    const inputs = [...bar.querySelectorAll('input[type=range]:enabled')];
    if (!inputs.length) return;
    const rect = inputs[0].getBoundingClientRect();
    const thumbWidth = parseFloat(getComputedStyle(bar).getPropertyValue('--thumb-width'));
    const travel = rect.width - thumbWidth;
    if (!(travel > 0)) return;
    const position = 100 * (event.clientX - rect.left - thumbWidth / 2) / travel;
    const nearest = inputs.reduce((a,b) => Math.abs(a.valueAsNumber-position) <= Math.abs(b.valueAsNumber-position) ? a : b);
    event.preventDefault();
    nearest.focus({preventScroll:true});
    drag = { id:event.pointerId, input:nearest, startX:event.clientX, startValue:nearest.valueAsNumber, travel };
    bar.setPointerCapture(event.pointerId);
  });
  function move(event) {
    if (drag?.id !== event.pointerId || drag.input.disabled) return;
    const next = Math.round(drag.startValue + 100 * (event.clientX - drag.startX) / drag.travel);
    if (next === drag.input.valueAsNumber) return;
    drag.input.valueAsNumber = next;
    drag.input.dispatchEvent(new Event('input', {bubbles:true}));
  }
  bar.addEventListener('pointermove', move);
  bar.addEventListener('pointerup', event => {
    if (drag?.id !== event.pointerId) return;
    move(event);
    drag = null;
  });
  for (const name of ['pointercancel','lostpointercapture']) {
    bar.addEventListener(name, event => { if (drag?.id === event.pointerId) drag = null; });
  }
}
