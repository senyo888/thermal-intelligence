// SPDX-License-Identifier: GPL-3.0-only
/** Opt-in observations, never provider configuration or commands. */
export const VT_READINGS = Object.freeze({
  temperature_seen: {label:'Room temperature last received',icon:'mdi:thermometer-check'},
  energy: {label:'Estimated energy',icon:'mdi:lightning-bolt',kind:'energy',path:'specific_states.total_energy',unitPath:'power_manager.energy_unit'},
  power: {label:'Estimated mean power',icon:'mdi:flash',kind:'power',path:'power_manager.mean_cycle_power',unitPath:'power_manager.power_unit'},
  device_power: {label:'Configured device power',icon:'mdi:gauge',kind:'power',path:'power_manager.device_power',unitPath:'power_manager.power_unit'},
  window: {label:'Window detection',icon:'mdi:window-open-variant',kind:'window',path:'window_manager.window_state'},
  window_auto: {label:'Automatic window detection',icon:'mdi:window-open-variant',kind:'window',path:'window_manager.window_auto_state'},
  motion: {label:'Motion detection',icon:'mdi:motion-sensor',kind:'motion',path:'motion_manager.motion_state'},
  presence: {label:'Presence detection',icon:'mdi:home-account',kind:'presence',path:'presence_manager.presence_state'},
  power_management: {label:'Power management',icon:'mdi:transmission-tower',kind:'power_management',path:'power_manager.overpowering_state'},
  follow: {label:'Follow underlying target',icon:'mdi:link-variant',kind:'follow',path:'vtherm_over_climate.follow_underlying_temp_change'},
  humidity: {label:'Humidity',icon:'mdi:water-percent',kind:'humidity'},
  external_temperature: {label:'VT outside temperature',icon:'mdi:thermometer',kind:'temperature',path:'specific_states.ext_current_temperature',unitPath:'configuration.temperature_unit'},
  auto_start_stop: {label:'Auto start/stop',icon:'mdi:power-sleep',path:'auto_start_stop_manager.auto_start_stop_enable'},
});
