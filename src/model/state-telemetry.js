// SPDX-License-Identifier: GPL-3.0-only
// Labels, icons and colours follow the approved TI telemetry baseline.
export const STATE_TELEMETRY = Object.freeze({
  window: { label: 'Window detection', active: 'Open', inactive: 'Closed', icon: 'mdi:window-open-variant', inactiveIcon: 'mdi:window-closed-variant', colour: '#efb86b', flag: 'is_window_configured', path: 'window_manager.window_state', note: 'This is the selected window detector’s state. Selecting its icon does not enable window protection or establish that a radiator valve is closed.' },
  motion: { label: 'Motion detection', active: 'Detected', inactive: 'Clear', icon: 'mdi:motion-sensor', inactiveIcon: 'mdi:motion-sensor-off', colour: '#b9a1e6', flag: 'is_motion_configured', path: 'motion_manager.motion_state', note: 'This is the selected motion detector’s state. Thermostat behaviour depends on its configured motion rules; selecting this icon does not change them.' },
  presence: { label: 'Presence detection', active: 'Home', inactive: 'Away', icon: 'mdi:home-account', colour: '#7dc39c', flag: 'is_presence_configured', path: 'presence_manager.presence_state', note: 'This is the selected presence source. It is separate from control ownership, household policy and alarm state.' },
  power_management: { label: 'Power management', active: 'Limiting', inactive: 'Normal', icon: 'mdi:transmission-tower', colour: '#efb86b', flag: 'is_power_configured', path: 'power_manager.overpowering_state', note: 'This reports the selected power-management state. Limiting is a control restriction, not a power measurement or proof that heating has stopped.' },
  follow: { label: 'Follow underlying target', active: 'On', inactive: 'Off', icon: 'mdi:link-variant', colour: '#73c9bd', path: 'vtherm_over_climate.follow_underlying_temp_change', note: 'When On, VT can adopt target changes made on its underlying device. Off does not disable temperature regulation. Selecting this icon does not change the setting.' },
});

export function stateTelemetryValue(kind, value) {
  const spec = STATE_TELEMETRY[kind];
  if (!spec) return null;
  const text = typeof value === 'string' ? value.trim().toLowerCase() : null;
  const active = value === true || ['on', spec.active.toLowerCase()].includes(text);
  const inactive = value === false || ['off', spec.inactive.toLowerCase(), ...(kind === 'presence' ? ['not_home'] : [])].includes(text);
  return active === inactive ? null : active;
}
