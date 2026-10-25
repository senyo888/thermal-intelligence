// SPDX-License-Identifier: GPL-3.0-only
// Adapted from the Thermal Intelligence visual baseline.
// Source geometry and finishing styles are preserved; provenance is recorded in docs/source-provenance.md.

const esc = value => String(value ?? '').replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character]));
const polar = (radius, angle) => [100 + radius * Math.cos(angle * Math.PI / 180), 100 + radius * Math.sin(angle * Math.PI / 180)];
const fmt = value => Number.isFinite(value) ? new Intl.NumberFormat(undefined, { maximumSignificantDigits: 12 }).format(value) : '—';
const colorValue = (value, fallback = '#94a3b8') => /^#[0-9a-f]{6}$/i.test(value ?? '') ? value : /^#[0-9a-f]{6}$/i.test(fallback) ? fallback : '#94a3b8';
const number = value => typeof value === 'number' && Number.isFinite(value) ? value : typeof value === 'string' && /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(value.trim()) && Number.isFinite(Number(value)) ? Number(value) : null;
const targetKeys = new Set(['temperature', 'target_temp_low', 'target_temp_high']);

function telemetryColour(item) {
  if (item.topic === 'window' && item.attribute && item.attribute !== 'window_manager.window_state' && item.attribute !== 'window_manager.window_auto_state') return item.activity === 'active' ? '#b9a1e6' : '#a9b8cb';
  if (item.activity === 'unknown') return '#8795a8';
  if (item.activity !== 'active') return '#a9b8cb';
  return ({ eco: '#7dc39c', comfort: '#e3b778', boost: '#e78e76', frost: '#9bcbe9' }[item.preset]
    || { window: '#efb86b', power_management: '#efb86b', motion: '#b9a1e6', presence: '#7dc39c', follow: '#73c9bd', energy: '#c6a2eb', humidity: '#73c9bd', temperature: '#8abfda' }[item.topic] || '#cad6e3');
}

/** Pure presentation. The host owns all events, command guards, dialogs and configuration persistence. */
export function renderCard({ config = {}, model = {}, open = false, allowed = false, busy = false, draftValues = null, statusMessage = '', preview = false, expanderId = 'thermal-features', animationOffset = 0 } = {}) {
  const m = {
    ...model,
    attrs: model.attrs ?? {},
    keys: (model.keys ?? []).filter(key => targetKeys.has(key)),
    targets: model.targets ?? {},
    choices: model.choices ?? [],
    current: model.available ? number(model.current) : null,
    min: number(model.min), max: number(model.max), unit: model.unit ?? '',
  };
  m.bounds = m.min !== null && m.max !== null && m.min < m.max;
  const a = m.attrs;
  const values = Object.fromEntries(m.keys.map(key => [key, Number.isFinite(draftValues?.[key]) ? draftValues[key] : m.targets[key]]));
  const editable = allowed && !busy && !preview && m.canSet === true;
  const view = { config, open: open === true, expanderId: /^[a-zA-Z][\w-]*$/.test(expanderId) ? expanderId : 'thermal-features', message: String(statusMessage ?? ''), targetEditable: () => editable };
  const state = m.state ?? m.choices.find(choice => choice.key === 'hvac_mode')?.value;
  m.state = state;
  const delta = m.current !== null && Number.isFinite(m.targets.temperature) ? m.current - m.targets.temperature : null;
  const condition = !config.entity ? 'Select a climate entity in the card editor' : !m.available ? 'Unavailable' : !m.ready ? 'Thermostat not ready' : m.current === null ? 'Temperature unavailable' : state === 'off' ? 'Switched off' : m.ranged ? 'Temperature range' : delta === null ? 'Target unavailable' : Math.abs(delta) <= .2 ? 'Near target' : `${Math.abs(delta).toFixed(1)}° ${delta > 0 ? 'above' : 'below'} target`;
  const output = { tone: 'unknown', text: m.activity?.label || 'Activity unknown', icon: null, kind: 'thermostat', ...(m.output ?? {}) };
  const overview = { brief: m.output?.brief || '', title: m.reason || condition };
  const permission = null;
  // The model preserves directly evidenced target-comparison colours. Warming
  // orange still requires the deferred accepted-output/freshness contract.
  const color = colorValue(m.arc?.color);
  const telemetry = Array.isArray(m.headerTelemetry) ? m.headerTelemetry : [];
  const ownership = null;
  const ownerIcon = '';
  const lock = m.lock;
  const lockIcon = lock ? `<span class="lock-indicator" data-lock-state="${esc(lock.status)}" role="img" aria-label="${esc(lock.label)}" title="${esc(lock.label)}"><ha-icon icon="${esc(lock.icon)}" aria-hidden="true"></ha-icon></span>` : '';
  const headerItems = telemetry.map(item => {
    const title = `${item.label ?? 'Telemetry'}: ${item.value ?? 'Unavailable'}${item.activityLabel ? ` · ${item.activityLabel}` : ''}`;
    const action = ['frost', 'eco', 'comfort', 'boost'].includes(item.preset) ? 'data-presets aria-haspopup="dialog"'
      : item.topic ? `data-telemetry-topic="${esc(item.topic)}" aria-haspopup="dialog"` : `data-info="${esc(item.entity)}"`;
    return `<button class="telemetry-item" style="--telemetry-colour:${colorValue(item.colour, telemetryColour(item))}" data-activity="${esc(item.activity ?? 'unknown')}" data-telemetry-key="${esc(item.key)}" ${action} data-focus="header-${esc(item.key)}" aria-label="${esc(title)}" title="${esc(title)}"><ha-icon icon="${esc(item.icon || 'mdi:information-outline')}" aria-hidden="true"></ha-icon><span aria-hidden="true">${esc(item.value ?? 'Unavailable')}</span></button>`;
  }).join('');
  const timetable = '';
  const pct = m.bounds && m.current !== null ? Math.max(0, Math.min(1, (m.current - m.min) / (m.max - m.min))) : 0;
  const circ = 2 * Math.PI * 72;
  const trendData = m.trend ?? { available: false, value: null, color: '#8795a8', text: 'Trend unavailable' };
  const trendOK = trendData.available === true && Number.isFinite(trendData.value);
  const sv = trendOK ? trendData.value : 0;
  const trendColor = colorValue(trendData.color, '#8795a8');
  const haloStrength = trendOK ? Math.min(1, Math.abs(sv) / 1.375) : 0;
  const haloAlpha = Math.round(90 + 90 * haloStrength).toString(16).padStart(2, '0');
  const haloSpread = Math.min(28, 6 + Math.abs(sv) * 16);
  const haloLow = `drop-shadow(0 0 ${haloSpread * (.8 - .25 * haloStrength)}px ${trendColor}${haloAlpha})`;
  const haloHigh = `drop-shadow(0 0 ${haloSpread}px ${trendColor}${haloAlpha})`;
  const halo = trendOK && m.current !== null ? `drop-shadow(0 0 ${Math.min(28, 6 + Math.abs(sv) * 16)}px ${trendColor}${haloAlpha})` : 'none';
  const trend = trendData.text || 'Trend unavailable';
  const ticks = Array.from({ length: 21 }, (_, index) => {
    const [x, y] = polar(85, 135 + index * 13.5), radius = index % 5 === 0 ? 1.35 : .75;
    return `<g class="diamond" style="animation-delay:-${index * 7.31}s;--base:${index % 5 === 0 ? .52 : .30}"><path d="M ${x} ${y - radius} l ${radius * .65} ${radius} l ${-radius * .65} ${radius} l ${-radius * .65} ${-radius} Z"/><path d="M ${x} ${y - radius} L ${x + radius * .65} ${y} L ${x} ${y} Z" fill="#e6f5ff"/><circle cx="${x}" cy="${y}" r="${index % 5 === 0 ? .34 : .2}" fill="#f4fbff"/></g>`;
  }).join('');
  const markerKeys = m.available && m.bounds ? m.keys.filter(key => Number.isFinite(values[key]) && values[key] >= m.min && values[key] <= m.max) : [];
  const markers = markerKeys.map(key => {
    const [x, y] = polar(72, 135 + 270 * (values[key] - m.min) / (m.max - m.min));
    return `<g data-marker-visual="${key}" transform="translate(${x} ${y})" aria-hidden="true"><circle class="target-dot" r="3.3" fill="url(#pearl)" stroke="#e2edf5" stroke-opacity=".75" stroke-width=".5"/></g>`;
  }).join('');
  const markerControls = markerKeys.map(key => {
    const [x, y] = polar(72, 135 + 270 * (values[key] - m.min) / (m.max - m.min));
    return `<button type="button" data-marker="${key}" data-focus="${key}" role="slider" style="left:${(x - 10) / 180 * 100}%;top:${y / 184 * 100}%" aria-label="${key === 'temperature' ? 'Target temperature' : key === 'target_temp_low' ? 'Lower target' : 'Upper target'}" aria-valuemin="${m.ranged && key === 'target_temp_high' ? (number(m.targets.target_temp_low) ?? m.min) : m.min}" aria-valuemax="${m.ranged && key === 'target_temp_low' ? (number(m.targets.target_temp_high) ?? m.max) : m.max}" aria-valuenow="${values[key]}" aria-valuetext="${esc(fmt(values[key]) + m.unit)}" aria-disabled="${!editable}" tabindex="${editable ? '0' : '-1'}" ${editable ? '' : 'disabled'}></button>`;
  }).join('');
  const preset = m.choices.find(choice => choice.key === 'preset_mode' && choice.status !== 'unsupported');
  const isVT = m.provider?.kind === 'vtherm';
  const presetReading = value => {
    if (!isVT || !['frost', 'eco', 'comfort', 'boost'].includes(value)) return '';
    const explicit = m.presetReadings?.[value];
    const unit = explicit?.status === 'available' ? explicit.unit : ['°C','°F'].includes(a.configuration?.temperature_unit) ? a.configuration.temperature_unit : '';
    const reading = explicit && explicit.status !== 'disabled' ? explicit.status === 'available' ? explicit.value : null : m.available && m.connected && unit ? number(a.preset_temperatures?.[`${value}_temp`]) : null;
    return `<small class="preset-temperature">${esc(fmt(reading) + unit)}</small>`;
  };
  const presets = preset ? `<div class="rows presets">${preset.options.map(value => `<button data-preset="${esc(value)}" data-focus="preset-${esc(value)}" aria-pressed="${value === preset.value}" ${!allowed || busy || preview || !preset.enabled ? 'disabled' : ''}>${esc(value === 'none' ? 'No preset' : (Object.hasOwn(config.preset_labels ?? {}, value) ? config.preset_labels[value] : value))}${presetReading(value)}</button>`).join('')}</div>${isVT ? '<p class="hint preset-hint">Change preset temperatures in settings.</p>' : ''}` : '';
  const ownershipControls = '';
  const choices = m.choices.filter(choice => choice.key !== 'preset_mode' && choice.status !== 'unsupported').map(choice => `<label>${esc(choice.key==='hvac_mode'?'Mode':choice.label)}<span class="choice-field"><select aria-label="${esc(choice.label)}" data-choice="${esc(choice.key)}" data-focus="${esc(choice.key)}" ${!allowed || busy || preview || !choice.enabled ? 'disabled' : ''}>${!choice.options.includes(choice.value) ? '<option selected disabled>Unknown</option>' : ''}${choice.options.map(value => `<option value="${esc(value)}" ${value === choice.value ? 'selected' : ''}>${esc(choice.key === 'hvac_mode' ? ({ heat: 'Heat', cool: 'Cool', heat_cool: 'Heat & cool', off: 'Off', auto: 'Auto', fan_only: 'Fan only', dry: 'Dry' }[value] || value) : value)}</option>`).join('')}</select><span class="choice-chevron" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M 6 9 L 12 15 L 18 9"/></svg></span></span></label>`).join('');
  const caption = draftValues ? 'Draft' : busy ? 'Pending' : '';
  const targetStatus = { text: String(statusMessage || (m.canSet ? 'Target reported by thermostat.' : m.reason || 'Thermostat target is unavailable.')) };
  const uncertainDetails = m.details?.some(row=>['unknown','unavailable','invalid','stale'].includes(row.status));
  const level = busy || !m.ready || !m.canSet || uncertainDetails ? 'amber' : 'green';
  const health = { level: m.connected === false || !m.available ? 'red' : level };
  health.color = { green: '#62e3b0', amber: '#efb86b', red: '#ef7777' }[health.level];
  const info = config.show_details === false || !isVT ? [] : [
    ['Readiness', m.attrs.is_ready === true ? 'Ready' : m.attrs.is_ready === false ? 'Not initialised' : 'Unknown'],
    ...[['Window','is_window_configured','Window'],['Presence','is_presence_configured','Presence'],['Motion','is_motion_configured','Motion'],['Power','is_power_configured','Power limiting'],['Safety','is_safety_configured','Safety']]
      .filter(([,flag])=>m.attrs[flag]===true).map(([label,,detailLabel])=>[label,m.details?.find(row=>row.label===detailLabel)?.value ?? 'Unknown']),
  ];
  const iconButton = '<button data-icon-settings data-focus="icon-settings" aria-haspopup="dialog"><ha-icon icon="mdi:tune-variant" aria-hidden="true"></ha-icon> Top row icon settings</button>';
  const followValue = m.connected && m.available ? m.attrs.vtherm_over_climate?.follow_underlying_temp_change : null;
  const followButton = isVT ? `<button data-telemetry-topic="follow" data-focus="follow-settings" aria-haspopup="dialog">Follow underlying target<small>${followValue===true?'On':followValue===false?'Off':'Unavailable'}</small></button>` : '';
  const settingsRow = `<div class="rows information icon-controls">${followButton}${iconButton}</div>`;
  const presetChart = isVT && (Object.values(m.presetReadings ?? {}).some(row=>row.status!=='disabled') || Object.keys(a.preset_temperatures ?? {}).length) ? '<div class="rows information"><button data-presets data-focus="preset-temperatures" aria-haspopup="dialog">Preset temperatures<small>Compare Frost, Eco, Comfort and Boost</small></button></div>' : '';
  const mappedRows = telemetry.filter(item=>!item.preset && (item.feature || (config.telemetry ?? []).some(row=>row.entity===item.entity && (row.attribute||null)===(item.attribute||null))));
  const mapped = config.show_details === false ? '' : mappedRows.map(item => `<button data-telemetry-key="${esc(item.key)}" ${item.topic ? `data-telemetry-topic="${esc(item.topic)}" aria-haspopup="dialog"` : `data-info="${esc(item.entity)}"`} data-focus="info-${esc(item.key)}">${esc(item.label)}<small>${esc(item.value ?? 'Unavailable')}</small></button>`).join('');
  const healthButton = `<button data-device data-focus="device-settings" aria-label="Thermostat overview" data-health="${health.level}" style="--health-color:${health.color}" title="${esc(m.reason || (busy ? 'A thermostat request is pending.' : uncertainDetails ? 'Some provider observations are unknown or unavailable. Open for details.' : 'Thermostat connection and readiness. Open for details.'))}" aria-haspopup="dialog"><span class="status-led" aria-hidden="true"></span></button>`;
  return `<ha-card class="${esc(['blue','plum','black'].includes(view.config.background)?view.config.background:'blue')}" style="--accent:${color}"><header><div class="heading ${telemetry.length||ownership?'':'no-telemetry'}"><strong title="${esc(view.config.name||a.friendly_name||view.config.entity)}">${esc(view.config.name||a.friendly_name||view.config.entity)}</strong>${lockIcon}<div class="header-telemetry" data-header-telemetry data-focus="header-telemetry" role="group" aria-label="Selected telemetry" ${telemetry.length||ownership?'':'hidden'}>${ownerIcon}${headerItems}</div></div></header>${preview?'<p class="hint" data-preview>Preview — thermostat controls are disabled.</p>':''}<div class="dial"><svg viewBox="10 0 180 184">${ticks}<defs><radialGradient id="arc-glass" gradientUnits="userSpaceOnUse" cx="100" cy="100" r="75"><stop offset=".934566" stop-color="#000" stop-opacity=".25"/><stop offset=".945066" stop-color="#000" stop-opacity=".1"/><stop offset=".957816" stop-color="#fff" stop-opacity=".02"/><stop offset=".972066" stop-color="#fff" stop-opacity=".28"/><stop offset=".980316" stop-color="#fff" stop-opacity=".04"/><stop offset="1" stop-color="#06101c" stop-opacity=".25"/></radialGradient><radialGradient id="pearl" cx="32%" cy="24%" r="75%"><stop stop-color="#fff"/><stop offset=".36" stop-color="#d7e7f2"/><stop offset=".72" stop-color="#9ab2c6"/><stop offset="1" stop-color="#50687f"/></radialGradient></defs><circle cx="100" cy="100" r="72" fill="none" stroke="#02060c" stroke-width="4.125" stroke-opacity=".55" stroke-linecap="round" stroke-dasharray="${circ*.75} ${circ}" transform="rotate(135 100 100)"/><circle cx="100" cy="100" r="72" fill="none" stroke="#8cb0cb" stroke-opacity=".09" stroke-width="4.125" stroke-linecap="round" stroke-dasharray="${circ*.75} ${circ}" transform="rotate(135 100 100)"/><circle cx="100" cy="100" r="72" fill="none" stroke="${color}" stroke-opacity=".8" stroke-width="3.375" stroke-linecap="round" stroke-dasharray="${circ*.75*pct} ${circ}" transform="rotate(135 100 100)"/><circle cx="100" cy="100" r="72" fill="none" stroke="${color}" stroke-opacity=".65" stroke-width=".825" stroke-linecap="round" stroke-dasharray="${circ*.75*pct} ${circ}" transform="rotate(135 100 100)"/><circle cx="100" cy="100" r="72" fill="none" stroke="url(#arc-glass)" stroke-width="3.375" stroke-linecap="round" stroke-dasharray="${circ*.75} ${circ}" transform="rotate(135 100 100)"/><circle cx="100" cy="100" r="73.125" fill="none" stroke="#cde2f0" stroke-opacity=".1" stroke-width=".3" stroke-linecap="round" stroke-dasharray="${2*Math.PI*73.125*.73} ${2*Math.PI*73.125}" transform="rotate(139 100 100)"/><defs><linearGradient id="rim" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#d1e8ff" stop-opacity=".36"/><stop offset=".5" stop-color="#62788c" stop-opacity=".06"/><stop offset="1" stop-color="#000" stop-opacity=".65"/></linearGradient><radialGradient id="dome" cx="35%" cy="18%" r="85%"><stop stop-color="#c6e6ff" stop-opacity=".22"/><stop offset=".42" stop-color="#69859e" stop-opacity=".035"/><stop offset="1" stop-color="#000" stop-opacity=".48"/></radialGradient></defs><circle cx="100" cy="100" r="58" fill="none" stroke="${trendColor}80" class="${trendOK?'trend-halo':''}" style="--halo-low:${haloLow};--halo-high:${haloHigh};filter:${halo};animation-delay:-${animationOffset}ms"/><circle cx="100" cy="100" r="58" fill="#030509" stroke="${trendColor}80"/><circle cx="100" cy="100" r="57" fill="url(#dome)" stroke="url(#rim)" stroke-width="1.2"/><path d="M 62 70 Q 97 39 137 70" fill="none" stroke="#e2f3ff" stroke-opacity=".10" stroke-width="1"/><text x="100" y="103" text-anchor="middle" class="reading" data-current-value>${fmt(m.current)}</text><text x="100" y="122" text-anchor="middle" class="unit">${esc(m.unit)}</text><text x="34" y="171" class="limit" text-anchor="middle">${fmt(m.min)}</text><text x="166" y="171" class="limit" text-anchor="middle">${fmt(m.max)}</text><path id="arrow" stroke="white" fill="none" stroke-width="1.8"/>${markers}</svg><div class="marker-controls">${markerControls}</div><button class="centre" data-details data-focus="entity-details" aria-label="Open thermostat details"></button></div><div class="summary"><div class="trend" ${config.show_activity===false?'hidden':''}>${esc(trend)}</div><button class="status" ${config.show_activity===false?'hidden style="display:none"':''} data-status-overview data-focus="output-overview" aria-haspopup="dialog" title="Open thermostat status details" data-output="${esc(output.tone)}">${output.icon?`<ha-icon icon="${esc(output.icon)}" aria-hidden="true"></ha-icon>`:''}${esc(permission&&m.state!=='off'?permission.label:output.text)}</button><div class="condition">${esc(output.kind==='trv'&&output.percentage===null?'':overview.brief||(!m.ready?overview.title:condition))}</div><div class="summary-space" aria-hidden="true"></div></div><div class="targets ${m.ranged?'range-targets':''}">${m.keys.map(k=>`<div class="target ${k==='target_temp_low'?'lower':k==='target_temp_high'?'upper':''}">${m.ranged?`<small>${k==='target_temp_low'?'Lower':'Upper'}</small>`:''}<div><button data-adjust="${k}" data-delta="-1" data-focus="minus-${k}" aria-label="Decrease ${k}" ${!view.targetEditable()?'disabled':''}>−</button><strong><span data-value="${k}" data-target-value>${esc(fmt(values[k])+m.unit)}</span><small data-target-edit="${k}" ${caption?'':'hidden'}>${esc(caption)}</small></strong><button data-adjust="${k}" data-delta="1" data-focus="plus-${k}" aria-label="Increase ${k}" ${!view.targetEditable()?'disabled':''}>+</button></div></div>`).join('')}</div><div class="control-footer">${view.open?'':healthButton}<span class="sr-only" role="status">${esc(targetStatus.text)}${view.message.includes('cancelled')?' '+esc(view.message):''}</span><button class="disclosure" data-expand data-focus="expand" aria-expanded="${view.open}" aria-controls="${view.expanderId}" aria-label="Controls & features"><span aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M 6 9 L 12 15 L 18 9"/></svg></span></button></div>${statusMessage?`<p class="hint" data-request-status role="status" aria-live="polite">${esc(statusMessage)}</p>`:'<span data-request-status hidden></span>'}<section id="${view.expanderId}" ${view.open?'':'hidden'}>${ownershipControls}${presets}${presetChart}${timetable}<div class="rows">${choices}</div>${info.length?`<div class="rows information">${info.map(([k,v])=>`<div>${esc(k)}<small>${esc(m.available?v:'Unavailable')}</small></div>`).join('')}</div>`:''}${settingsRow}${mapped?`<div class="rows information">${mapped}</div>`:''}${Number.isInteger(a.supported_features)&&(a.supported_features&4)?'<button data-telemetry-topic="humidity" data-focus="humidity-details" aria-haspopup="dialog">Humidity details and display settings</button>':''}<p class="hint">Device configuration and advanced settings remain in thermostat details.</p>${view.open?`<div class="expanded-health">${healthButton}</div>`:''}</section></ha-card>`;
}
