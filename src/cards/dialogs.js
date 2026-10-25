// SPDX-License-Identifier: GPL-3.0-only
// Adapted from the Thermal Intelligence dialog surfaces.
// Source shells, declarations and finishing styles are retained; variant selectors are isolated.
// Provenance is recorded in docs/source-provenance.md. This module has no service or persistence path.
import { renderHumidity } from './humidity-dialog.js';
import { overviewDialogStyles, humidityDialogStyles, settingsDialogStyles } from './dialog-styles.js';
export const dialogStyles = overviewDialogStyles;

const esc = value => String(value ?? '').replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character]));
const fmt = value => Number.isFinite(value) ? new Intl.NumberFormat(undefined, { maximumSignificantDigits: 12 }).format(value) : 'Unavailable';
const finite = value => typeof value === 'number' && Number.isFinite(value) ? value : typeof value === 'string' && /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(value.trim()) && Number.isFinite(Number(value)) ? Number(value) : null;
const entityId = value => typeof value === 'string' && /^[a-z0-9_]+\.[a-z0-9_]+$/.test(value) ? value : '';
const nativeButton = (entity, label = 'Open source details') => entityId(entity) ? `<button data-dialog-info="${esc(entity)}">${esc(label)}</button>` : '';
const plainRows = rows => `<dl>${rows.map(row => `<div><dt>${row.entity && entityId(row.entity) ? `<button data-dialog-info="${esc(row.entity)}">${esc(row.label)}</button>` : esc(row.label)}</dt><dd>${esc(row.value ?? 'Unavailable')}</dd></div>`).join('')}</dl>`;
const sourceText = source => source?.entity ? `${source.entity}${source.attribute ? ` · ${source.attribute}` : ''}` : 'No source configured';
const message = value => value ? `<p class="note" data-dialog-status role="status" aria-live="polite">${esc(value)}</p>` : '';

function standardShell({ view, title, eyebrow, content, footer = '', tone = 'neutral' }) {
  return `<dialog data-view="${esc(view)}" data-tone="${esc(tone)}" aria-labelledby="ti-dialog-title"><div class="shell"><header><div><p class="eyebrow">${esc(eyebrow)}</p><h2 id="ti-dialog-title">${esc(title)}</h2></div><button class="close" data-close data-dialog-close aria-label="Close ${esc(title)}" autofocus>×</button></header><div class="content">${content}</div><footer ${footer ? '' : 'hidden'}>${footer}</footer></div></dialog>`;
}

function overview({ model, config, statusMessage }) {
  const title = config.name || model.name || 'Thermostat';
  const hvac = model.choices?.find(choice => choice.key === 'hvac_mode');
  const preset = model.choices?.find(choice => choice.key === 'preset_mode');
  const unit = model.unit || '';
  const current = model.available && model.connected ? model.current : null;
  const readiness = model.ready ? 'Ready' : model.readiness?.status === 'unknown' ? 'Unknown' : 'Not ready';
  const reason = model.reason || model.readiness?.reason || 'Readiness is not reported.';
  const output = model.output ?? { text: model.activity?.label || 'Activity unknown', detail: model.activity?.detail || 'No activity evidence is available.', tone: 'unknown' };
  const tone = !model.ready ? 'warning' : ['heat','cool'].includes(output.tone) ? output.tone : 'neutral';
  const uncertainDetails=model.details?.some(row=>['unknown','unavailable','invalid','stale'].includes(row.status));
  const level = !model.connected || !model.available ? 'red' : !model.ready || !model.canSet || uncertainDetails ? 'amber' : 'green';
  const healthColor = { green: '#62e3b0', amber: '#efb86b', red: '#ef7777' }[level];
  const healthPanel = `<section class="health" data-level="${level}" aria-label="Connection and readiness" style="--health-color:${healthColor}"><h3>${esc(level === 'green' ? 'Thermostat connection and readiness reported' : 'Thermostat needs attention')}</h3>${level === 'green' ? '' : `<p>${esc(model.ready&&uncertainDetails?'Some provider observations are unknown or unavailable. Inspect provider details below.':reason)}</p>`}</section>`;
  const summary = `<section class="summary" aria-label="Current explanation"><div class="state"><i aria-hidden="true"></i><h3>${esc(output.text)}</h3></div><p>${esc(output.detail || model.activity?.detail)}</p>${statusMessage ? `<div class="notices"><p data-dialog-status role="status">${esc(statusMessage)}</p></div>` : ''}</section>`;
  const targetRows = (model.keys ?? []).map(key => ({ label: key === 'target_temp_low' ? 'Lower target' : key === 'target_temp_high' ? 'Upper target' : 'Target temperature', value: model.available && Number.isFinite(model.targets?.[key]) ? `${fmt(model.targets[key])} ${unit}` : 'Unavailable' }));
  const sections = [
    { id: 'temperatures', title: 'Temperatures', rows: [
      { label: 'Current temperature', value: Number.isFinite(current) ? `${fmt(current)} ${unit}` : 'Unavailable' }, ...targetRows,
      { label: 'Reported limits', value: Number.isFinite(model.min) && Number.isFinite(model.max) ? `${fmt(model.min)}–${fmt(model.max)} ${unit}` : 'Unavailable' },
      { label: 'Temperature step', value: Number.isFinite(model.step) ? `${fmt(model.step)} ${unit} · ${model.stepSource || 'Unknown source'}` : 'Unavailable' },
    ] },
    { id: 'control', title: 'Control source and modes', rows: [
      { label: 'HVAC mode', value: hvac?.value ?? model.state ?? 'Unknown' },
      { label: 'Preset', value: preset?.value ?? 'Not reported' },
      { label: 'Control ownership', value: model.ownership?.label || 'Unknown' },
    ], note: model.ownership?.detail || 'No authoritative ownership contract is configured. Presets and matching target temperatures do not identify ownership.' },
    { id: 'provider', title: 'Provider and readiness', rows: [
      { label: 'Provider', value: model.provider?.label || 'Unknown' },
      { label: 'Provider identity', value: model.provider?.evidence || 'Not verified' },
      { label: 'Provider restrictions', value: model.provider?.reason || 'No additional provider restrictions reported.' },
      { label: 'Connection', value: model.connected ? 'Connected' : 'Disconnected or unknown' },
      { label: 'Readiness', value: `${readiness} · ${reason}` },
      { label: 'Climate entity', value: config.entity || 'Not configured', entity: config.entity },
    ] },
    { id: 'activity', title: 'Activity and confirmation', rows: [
      { label: 'Reported output', value: output.text },
      { label: 'Output source', value: sourceText(output.source), entity: output.source?.entity },
      { label: 'Request status', value: statusMessage || 'No active card request is reported.' },
    ], note: 'This view shows the signals available to the card. It does not verify physical heat delivery, sensor accuracy or device response.' },
  ];
  if (model.details?.length) sections.push({ id: 'provider-details', title: 'Provider details', rows: model.details.map(row => ({ label: row.label, value: `${row.value ?? row.status ?? 'Unavailable'}${row.unit ? ` ${row.unit}` : ''}${row.detail ? ` · ${row.detail}` : ''}` })) });
  const groups = `<div class="groups">${sections.map(section => `<details id="section-${section.id}"><summary>${esc(section.title)}<span aria-hidden="true">⌄</span></summary>${plainRows(section.rows)}${section.note ? `<p class="note">${esc(section.note)}</p>` : ''}</details>`).join('')}</div>`;
  const footer = `<button data-dialog-settings>Card settings</button>${nativeButton(config.entity, 'Thermostat details')}<p>Thermostat details open in Home Assistant.</p>`;
  return { title, html: standardShell({ view: 'overview', title, eyebrow: 'Thermal intelligence · overview', content: (level === 'green' ? summary + healthPanel : healthPanel + summary) + groups, footer, tone }) };
}

function telemetry({ model, config, rowKey, statusMessage }) {
  const rows = model.headerTelemetry ?? [];
  let row = rows.find(item => item.key === rowKey) ?? rows.find(item => item.topic === rowKey) ?? (rowKey === 'humidity' ? model.humidity : null);
  if(rowKey==='follow' && !row && model.provider?.kind==='vtherm') {
    const value=model.connected&&model.available?model.attrs?.vtherm_over_climate?.follow_underlying_temp_change:null;
    row={label:'Follow underlying temperature',status:typeof value==='boolean'?'available':'unknown',value:value===true?'On':value===false?'Off':'Unavailable',source:{entity:config.entity,attribute:'vtherm_over_climate.follow_underlying_temp_change'},detail:'This is the provider-reported follow setting. Selecting its icon does not change thermostat configuration.'};
  }
  if (rowKey === 'humidity' || row?.kind === 'humidity' || row?.topic === 'humidity') return humidity({ model, config, row, statusMessage });
  const title = row?.label || (rowKey === 'follow' ? 'Follow underlying target' : 'Telemetry');
  const reading = row?.status === 'available' ? row.value ?? fmt(row.rawValue) : row?.status || 'Unavailable';
  const values = [
    { label: 'Selected reading', value: reading },
    { label: 'Status', value: row?.status || 'Not configured' },
    { label: 'Source', value: sourceText(row?.source), entity: row?.source?.entity },
    { label: 'Unit', value: row?.unit || 'Not reported' },
  ];
  const content = `<section aria-label="${esc(title)}">${plainRows(values)}<p class="note">${esc(row?.detail || 'No matching configured source is available. No source is inferred from an entity name.')}</p><div class="topic-links">${nativeButton(row?.source?.entity)}<button data-dialog-settings>Card display settings</button></div>${message(statusMessage)}</section>`;
  return { title, html: standardShell({ view: 'telemetry', title, eyebrow: config.name || model.name || 'Thermostat', content }) };
}

const humidity = options => renderHumidity(options);

function presets({ model, config, allowed, busy, preview, statusMessage }) {
  const title = config.name || model.name || 'Thermostat';
  const choice = model.choices?.find(item => item.key === 'preset_mode');
  const options = choice?.options ?? [];
  const providerUnit = ['°C','°F'].includes(model.attrs?.configuration?.temperature_unit) ? model.attrs.configuration.temperature_unit : null;
  const chartUnit = Object.values(model.presetReadings??{}).some(row=>row.status==='available') ? model.unit : providerUnit || model.unit || '';
  const chartKeys = model.provider?.kind==='vtherm' ? [...new Set(['frost','eco','comfort','boost',...options.filter(key=>key!=='none')])] : options.filter(key=>key!=='none');
  const rows = chartKeys.map(key => {
    const mapped=model.presetReadings?.[key];
    const reading = mapped && mapped.status !== 'disabled' ? mapped.status==='available'?mapped.value:null : model.connected && model.available && model.provider?.kind === 'vtherm' && providerUnit===chartUnit && ['frost','eco','comfort','boost'].includes(key) ? finite(model.attrs?.preset_temperatures?.[`${key}_temp`]) : null;
    return { key, label: Object.hasOwn(config.preset_labels ?? {}, key) ? config.preset_labels[key] : key.charAt(0).toUpperCase() + key.slice(1), value: reading, selected: model.connected&&model.ready&&model.state==='heat'&&choice?.value===key, entity:mapped?.source?.entity||(reading!==null?config.entity:'') };
  });
  const values = rows.map(row => row.value).filter(value => value !== null);
  let min = Math.floor(Math.min(0, ...values) / 5) * 5;
  let max = Math.ceil(Math.max(chartUnit === '°F' ? 90 : 30, ...values) / 5) * 5;
  if (!Number.isFinite(min) || !Number.isFinite(max) || !Number.isFinite(max - min) || max <= min) { min = 0; max = chartUnit === '°F' ? 90 : 30; }
  const span = max - min, zero = -min / span * 100;
  const chart = `<section class="preset-chart" aria-label="Preset temperature comparison">${!model.connected ? '<p class="chart-notice">Connection lost. Current preset temperatures are unavailable.</p>' : ''}<div class="chart-rows">${rows.map(row => `<div class="chart-row" data-selected="${row.selected}"><div class="chart-label"><strong>${esc(row.label)}</strong><span>${row.selected ? 'Preset selected' : ''}</span></div><div class="bar-track" aria-hidden="true" style="--zero:${zero}%">${row.value === null || row.value < min || row.value > max ? '' : `<span class="bar bar-${['frost','eco','comfort','boost'].includes(row.key) ? row.key : 'eco'}" style="left:${Math.min(zero, (row.value - min) / span * 100)}%;width:${Math.abs(row.value) / span * 100}%"></span>`}</div><button data-dialog-info="${esc(entityId(row.entity))}" aria-label="${esc(row.label)}: ${esc(row.value === null ? 'Unavailable' : `${fmt(row.value)} ${chartUnit}`)}. Open thermostat settings" ${entityId(row.entity) ? '' : 'disabled'}>${esc(row.value === null ? 'Unavailable' : `${fmt(row.value)} ${chartUnit}`)}</button></div>`).join('')}</div>${rows.length ? `<div class="chart-scale"><span>Scale ${esc(`${min} ${chartUnit}`)}</span><span>${esc(`${max} ${chartUnit}`)}</span></div>` : '<p>No presets are advertised by this thermostat.</p>'}<p class="chart-hint">Tap a temperature to edit its preset.</p>${message(statusMessage)}</section>`;
  return { title, html: standardShell({ view: 'presets', title, eyebrow: 'Preset temperatures', content: chart }) };
}

function settings({ model, config, statusMessage }) {
  const title = `${config.name || model.name || 'Thermostat'} · Card settings`;
  const preview = (model.headerTelemetry ?? []).map(row => `<span><ha-icon icon="${esc(row.icon || 'mdi:information-outline')}" aria-hidden="true"></ha-icon>${esc(row.value ?? 'Unavailable')}</span>`).join('') || '<small>No configured header readings.</small>';
  return { title, html: `<dialog data-view="settings" aria-labelledby="ti-dialog-title"><header><div><small>Thermal intelligence · display</small><h2 id="ti-dialog-title">${esc(title)}</h2></div><button data-close data-dialog-close aria-label="Close card settings" autofocus>×</button></header><div class="body"><p>Choose the readings beside the card name and the display settings for this card.</p><div class="preview" aria-label="Current header preview">${preview}</div><div class="options"><thermal-intelligence-card-editor data-dialog-editor></thermal-intelligence-card-editor></div><details><summary>Configuration to copy</summary><textarea data-settings-export readonly aria-label="Draft card configuration" spellcheck="false" style="width:100%;min-height:180px;color:inherit;background:#0b1420;border:1px solid #34465c;padding:10px;border-radius:8px"></textarea></details><p class="scope">Draft only. This dialog does not save dashboard configuration. Copy the configuration below into this card’s Home Assistant editor, or make the same changes directly in its visual editor, then save.</p><p class="status" data-dialog-status role="status">${esc(statusMessage || '')}</p></div><footer><button data-dialog-close>Close draft</button><button data-copy-settings>Copy configuration</button></footer></dialog>` };
}

/** Pure dialog rendering. The host attaches the editor and owns every user action. */
export function renderDialog({ kind = 'overview', model = {}, config = {}, rowKey, settingsDraft, statusMessage = '', allowed = false, busy = false, preview = false } = {}) {
  const options = { model, config: kind === 'settings' && settingsDraft ? settingsDraft : config, rowKey, statusMessage, allowed, busy, preview };
  const result = kind === 'telemetry' || kind === 'humidity' ? telemetry({ ...options, rowKey: kind === 'humidity' ? 'humidity' : rowKey })
    : kind === 'presets' ? presets(options) : kind === 'settings' ? settings(options) : overview(options);
  const styles=result.html.startsWith('<dialog data-view="humidity"')?humidityDialogStyles:kind==='settings'?settingsDialogStyles:overviewDialogStyles;
  return {...result,styles};
}
