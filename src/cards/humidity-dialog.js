// SPDX-License-Identifier: GPL-3.0-only
// Adapted from the Thermal Intelligence humidity surface.
// Source structure, four-boundary controls and display semantics are preserved.
// Provenance is recorded in docs/source-provenance.md; the host owns draft edits and copying.
import {
  HUMIDITY_KEYS,
  humidityBands,
  humidityBand,
  humidityGradient,
  validHumidityBands,
  legacyHumidityBands,
} from '../model/humidity.js';

const LABELS = {
  dry_below: 'Too dry below',
  good_min: 'Good range starts',
  good_max: 'Good range ends',
  wet_above: 'Too wet above',
  low: 'Legacy lower boundary',
  high: 'Legacy upper boundary',
};
const esc = value => String(value ?? '').replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character]));
const fmt = value => Number.isFinite(value) ? new Intl.NumberFormat(undefined, { maximumSignificantDigits: 12 }).format(value) : 'Unavailable';
const own = (object, key) => object !== null && typeof object === 'object' && Object.hasOwn(object, key);
const inputValue = value => typeof value === 'number' && Number.isFinite(value) ? String(value) : '';
const entityId = value => typeof value === 'string' && /^[a-z0-9_]+\.[a-z0-9_]+$/.test(value) ? value : '';

/** Pure source-shaped humidity dialog. Values are a local draft, never a dashboard save. */
export function renderHumidity({ model = {}, config = {}, row, statusMessage = '' } = {}) {
  const current = row ?? model.humidity ?? model.headerTelemetry?.find(item => item.kind === 'humidity' || item.topic === 'humidity');
  const source = current?.source ?? {};
  const rawValue = current?.rawValue ?? current?.value;
  const value = current?.status === 'available' && current?.unit === '%' && model.connected !== false
    && typeof rawValue === 'number' && Number.isFinite(rawValue) && rawValue >= 0 && rawValue <= 100 ? rawValue : null;
  const selected = value === null ? 'Unavailable' : `${fmt(value)} %`;
  const explicit = config.humidity_bands;
  const legacy = explicit !== undefined && (own(explicit, 'low') || own(explicit, 'high'))
    && !HUMIDITY_KEYS.some(key => own(explicit, key));
  const bands = humidityBands(config);
  const valid = bands !== null && (legacy ? legacyHumidityBands(bands) : validHumidityBands(bands));
  // Invalid drafts remain visible in their own form; never map two old bounds into four.
  const draft = bands ?? (explicit && typeof explicit === 'object' && !Array.isArray(explicit) ? explicit : {});
  const keys = legacy ? ['low', 'high'] : HUMIDITY_KEYS;
  const band = humidityBand(value, bands);
  const gradient = humidityGradient(bands);
  const entity = entityId(source.entity || current?.entity);
  const rows = [
    ['Selected reading (raw)', selected],
    ['Source', source.name || source.entity || current?.entity || 'Not configured'],
    ...(source.attribute ? [['Source attribute', source.attribute]] : []),
    ['Source last reported', source.timestamp || 'Unavailable'],
    ...(current?.status==='available'&&value!==null ? [] : [['Reading status', value === null && current?.status === 'available' ? 'Unavailable' : current?.status || 'Not configured']]),
  ];
  const reading = `<dl>${rows.map(([label, readingValue]) => `<div><dt>${esc(label)}</dt><dd>${esc(readingValue)}</dd></div>`).join('')}</dl>${entity ? `<button data-dialog-info="${esc(entity)}">Humidity history</button>` : ''}`;
  const ranges = legacy ? '' : keys.map(key => `<input type="range" min="0" max="100" step="1" data-humidity-boundary="${key}" data-boundary="${key}" value="${esc(inputValue(draft[key]))}" aria-label="${LABELS[key]} humidity percentage" aria-valuetext="${esc(inputValue(draft[key]))} percent" ${valid ? '' : 'disabled'}>`).join('');
  const fields = keys.map(key => `<label>${LABELS[key]}<span><input type="number" min="0" max="100" step="${legacy ? 'any' : '1'}" inputmode="numeric" data-humidity-boundary="${key}" data-number="${key}" value="${esc(inputValue(draft[key]))}" aria-label="${LABELS[key]} exact percentage" aria-invalid="${!valid}"> %</span></label>`).join('');
  const legend = !valid ? '' : legacy
    ? `<div class="legend"><span style="color:#79b8ed">Below ${esc(fmt(draft.low))}%</span><span style="color:#7dc39c">Within ${esc(fmt(draft.low))}–${esc(fmt(draft.high))}%</span><span style="color:#eb7777">Above ${esc(fmt(draft.high))}%</span></div>`
    : `<div class="legend"><span style="color:#79b8ed">Dry &lt;${draft.dry_below}%</span><span style="color:#7dc39c">Good ${draft.good_min}–${draft.good_max}%</span><span style="color:#eb7777">Wet &gt;${draft.wet_above}%</span></div>`;
  const preview = `<strong style="color:${band.colour}">${esc(selected)} · ${esc(band.label)}</strong>${legend}`;
  const explanation = legacy
    ? 'This card has a legacy two-boundary colour preference. Its original lower and upper values are retained; they have not been converted into four boundaries.'
    : 'Slide the four markers, or enter exact percentages. Amber fills the gaps around the good range.';
  const validation = valid ? 'Draft only — nothing has been saved.' : legacy
    ? 'Keep two increasing percentages between 0 and 100.' : 'Keep four increasing whole percentages between 0 and 100.';
  const footerStyle = valid ? 'background:#24483f;border-color:#79bfa15e;color:#e1fff2' : 'background:#274b44';
  const html = `<dialog data-view="humidity" data-reading-status="${esc(value===null&&current?.status==='available'?'unavailable':current?.status||'disabled')}" aria-labelledby="humidity-title"><header><div><small>${esc(config.name || model.name || 'Room')} · display</small><h2 id="humidity-title">Humidity</h2></div><button data-close data-dialog-close aria-label="Close humidity" autofocus>×</button></header><div class="body"><div class="reading">${reading}</div><h3>${legacy ? 'Legacy colour preference' : 'Colour boundaries'}</h3><p>${explanation}</p><div class="bar"><div class="track" style="background:${gradient}"></div>${ranges}</div><div class="scale"><span>0%</span><span>100%</span></div><div class="fields">${fields}</div><div class="preview" role="status">${preview}</div><p class="scope">These colours are visual guides only. They do not control heating, humidifiers or dehumidifiers. Draft only; copy into this card’s Home Assistant editor to save.</p><p class="message" data-dialog-status role="status">${esc(statusMessage || validation)}</p></div><footer><button data-cancel data-dialog-close>Close</button><button data-copy-humidity style="${footerStyle}" ${valid ? '' : 'disabled'}>Copy configuration</button></footer></dialog>`;
  return { title: 'Humidity', html };
}
