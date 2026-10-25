// SPDX-License-Identifier: GPL-3.0-only
// Synthetic values/scenarios preserved from the source active-presets.html and polish.html.
// See docs/ui-fidelity.md for fixture transport additions and explicit scope differences.
import './icons.js';
import '/dist/thermal-intelligence.js';
const parameters=new URLSearchParams(location.search);
const surface=parameters.get('surface')==='polish'?'polish':'active-presets';
document.documentElement.style.setProperty('--fixture-width',surface==='polish'?'320px':'280px');
document.body.dataset.capture=String(parameters.get('capture')==='1');
const config={type:'custom:thermal-intelligence-beta-card',entity:'climate.room',name:'Example room',adapter:'vtherm',
  features:['boost','comfort','eco'].map(preset=>({entity:`number.room_preset_${preset}_temp`,label:preset[0].toUpperCase()+preset.slice(1),preset})),
  humidity_entity:'sensor.room_humidity'};
const thermostat={entity_id:'climate.room',state:'heat',attributes:{is_ready:true,current_temperature:20,temperature:21,min_temp:7,max_temp:30,target_temp_step:.1,supported_features:401,hvac_modes:['off','heat'],preset_modes:['none','eco','comfort','boost'],preset_mode:'comfort',humidity_manager:{humidity_sensor_entity_id:'sensor.room_humidity'}}};
const states={'climate.room':thermostat,'sensor.room_humidity':{entity_id:'sensor.room_humidity',state:'58.5',attributes:{friendly_name:'Example FP300 humidity',unit_of_measurement:'%',icon:'mdi:water-percent'}}};
for(const [preset,value] of Object.entries({eco:17,comfort:21,boost:23}))states[`number.room_preset_${preset}_temp`]={entity_id:`number.room_preset_${preset}_temp`,state:String(value),attributes:{unit_of_measurement:'°C'}};
const calls=[];
const hass={connected:true,connection:{socket:{}},user:{id:'synthetic-canonical-user'},config:{unit_system:{temperature:'°C'}},states,
  entities:{'climate.room':{entity_id:'climate.room',platform:'versatile_thermostat'}},
  services:{climate:{set_temperature:{},set_hvac_mode:{},set_preset_mode:{}}},
  async callService(domain,service,payload){calls.push({domain,service,payload:structuredClone(payload)});document.querySelector('#calls').textContent=`Service calls: ${calls.length}`;},
};
const card=document.createElement('thermal-intelligence-beta-card');card.setConfig(config);document.querySelector('main').append(card);
function scenario(mode){
  hass.connected=mode!=='Disconnected';thermostat.state=mode==='Off'?'off':'heat';
  thermostat.attributes.preset_mode=['eco','comfort','boost'].includes(mode)?mode:'none';
  thermostat.attributes.temperature=mode==='Manual'?20.3:21;
  card.hass={...hass,states:{...states,'climate.room':structuredClone(thermostat)}};
}
for(const mode of ['eco','comfort','boost','Manual','Off','Disconnected']){const button=document.createElement('button');button.textContent=mode;button.onclick=()=>scenario(mode);document.querySelector('nav').append(button);}
for(const value of [20,35,50,65,80]){const button=document.createElement('button');button.textContent=`Humidity ${value}%`;button.onclick=()=>{states['sensor.room_humidity'].state=String(value);card.hass={...hass,states:{...states,'climate.room':structuredClone(thermostat)}};};document.querySelector('nav').append(button);}
const longer=document.createElement('button');longer.textContent='Long room name';longer.onclick=()=>{config.name='A longer room name for layout verification';card.setConfig(config);card.hass={...hass,states:{...states}};};document.querySelector('nav').append(longer);
if(surface==='polish')document.querySelector('#scope').textContent='The source polish fixture also exercises private ownership controls. Those require the deferred public backend contract; they are not simulated here.';
scenario(parameters.get('scenario')||'comfort');
if(parameters.get('expanded')==='1'){card._open=true;card.render();}
window.canonicalFixture={card,hass,states,config,calls,scenario,surface,sourceCommit:'5f96a3b6fefefb59346713a442cd534b4de77f26'};
