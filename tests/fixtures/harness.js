// SPDX-License-Identifier: GPL-3.0-only
import './icons.js';
import '/dist/thermal-intelligence.js';

const TYPE = 'custom:thermal-intelligence-card';
const ENTITY = 'climate.fixture_thermostat';
const OTHER = 'climate.fixture_secondary';
const SERVICES = ['set_temperature','set_hvac_mode','set_preset_mode','set_fan_mode','set_swing_mode','set_swing_horizontal_mode'];
let sequence = 0;
const timestamp = () => new Date(Date.now() + ++sequence).toISOString();
const state = (id, value, attributes) => ({ entity_id:id, state:value, attributes, last_changed:timestamp(), last_updated:timestamp() });
const fixture = window.fixture = {
  calls: [], registryCalls: [], cards: [], events: [], registryFailure:false, behavior:'observe', pending:[],
  makeHass(scenario = 'standard') {
    const fahrenheit = scenario === 'fahrenheit';
    const attributes = {
      friendly_name:'Example thermostat', supported_features:17, hvac_modes:['off','heat'], hvac_action:'idle',
      temperature:fahrenheit?70:21, current_temperature:fahrenheit?68.5:19.8,
      min_temp:fahrenheit?45:7, max_temp:fahrenheit?90:30, target_temp_step:fahrenheit?1:0.5,
      preset_modes:['none','eco','comfort','frost'], preset_mode:'none',
    };
    const isVT = scenario.startsWith('vt');
    if (isVT) Object.assign(attributes, { friendly_name:'Example Versatile Thermostat', is_ready:scenario==='vt', version:'10.5.1', hvac_action:'heating', is_window_configured:true, window_manager:{window_state:'off'}, is_presence_configured:false, is_motion_configured:true });
    if (scenario==='range') Object.assign(attributes, {supported_features:2+8+16+32+512,hvac_modes:['off','heat_cool'],target_temp_low:19,target_temp_high:24,fan_modes:['auto','low','high'],fan_mode:'auto',swing_modes:['off','vertical'],swing_mode:'off',swing_horizontal_modes:['off','horizontal'],swing_horizontal_mode:'off'});
    const states = scenario === 'empty' ? {} : {
      [ENTITY]:state(ENTITY,scenario==='unavailable'?'unavailable':scenario==='range'?'heat_cool':'heat',attributes),
      [OTHER]:state(OTHER,'heat',{...attributes,friendly_name:'Second example thermostat'}),
      'sensor.fixture_humidity':state('sensor.fixture_humidity','48',{friendly_name:'Example humidity',unit_of_measurement:'%'}),
      'sensor.fixture_valve':state('sensor.fixture_valve','0',{friendly_name:'Example valve position',unit_of_measurement:'%'}),
    };
    const hass = {
      connected:true, connection:{connected:true,socket:{}}, user:{id:'synthetic-preview-user'},
      config:{unit_system:{temperature:fahrenheit?'°F':'°C'}},
      services:{climate:Object.fromEntries(SERVICES.map(key=>[key,{}]))}, states,
      async callWS(message) {
        fixture.registryCalls.push(structuredClone(message));
        if (fixture.registryFailure) throw new Error('Synthetic registry unavailable');
        return {entity_id:message.entity_id,platform:isVT?'versatile_thermostat':'generic_thermostat'};
      },
      callService(domain, service, payload) {
        const call = {domain,service,payload:structuredClone(payload)};
        fixture.calls.push(call); fixture.audit();
        if (fixture.behavior==='pending') return new Promise((resolve,reject)=>fixture.pending.push({resolve,reject,call}));
        if (fixture.behavior==='reject') return Promise.reject(new Error('Synthetic service rejection'));
        if (fixture.behavior==='observe') setTimeout(()=>fixture.apply(call),30);
        return Promise.resolve();
      },
    };
    return hass;
  },
  audit() { document.querySelector('#audit').textContent=JSON.stringify(this.calls,null,2); document.querySelector('#call-count').textContent=this.calls.length; },
  apply(call) {
    const {entity_id,...values}=call.payload;
    if (!this.hass.states[entity_id]) return;
    const old=this.hass.states[entity_id];
    this.hass.states={...this.hass.states,[entity_id]:{...old,state:values.hvac_mode??old.state,attributes:{...old.attributes,...values},last_updated:timestamp()}};
    this.refresh();
  },
  refresh() { this.hass={...this.hass}; for(const card of this.cards)card.hass=this.hass; if(this.editor)this.editor.hass=this.hass; },
  configure(config,index=0) { this.cards[index].setConfig(config); if(index===0){this.config=structuredClone(config);document.querySelector('#configuration').textContent=JSON.stringify(config,null,2);} },
  addCard(config=this.config) { const card=document.createElement('thermal-intelligence-card'); card.setConfig(config);card.hass=this.hass;this.cards.push(card);document.querySelector('#cards').append(card);return card; },
  reset(scenario='standard',overrides={}) {
    for(const card of this.cards)card.remove();this.cards=[];this.calls=[];this.events=[];this.registryCalls=[];this.pending=[];this.registryFailure=false;this.behavior='observe';
    this.hass=this.makeHass(scenario);
    this.config={type:TYPE,entity:scenario==='empty'?'':ENTITY,adapter:'auto',background:'blue',preset_labels:{frost:'Frost'},telemetry:[{kind:'humidity',entity:'sensor.fixture_humidity'},{kind:'valve',entity:'sensor.fixture_valve'}],...overrides};
    const card=this.addCard(this.config);card.preview=document.querySelector('#preview').checked;
    this.editor=document.createElement('thermal-intelligence-card-editor');this.editor.setConfig(this.config);this.editor.hass=this.hass;
    this.editor.addEventListener('config-changed',event=>{this.events.push(structuredClone(event.detail.config));this.configure(event.detail.config);});
    document.querySelector('#editor').replaceChildren(this.editor);this.configure(this.config);this.audit();
  },
};
document.querySelector('#scenario').onchange=event=>fixture.reset(event.target.value);
document.querySelector('#preview').onchange=event=>{for(const card of fixture.cards)card.preview=event.target.checked;};
const parameters = new URLSearchParams(location.search);
const scenario = [...document.querySelector('#scenario').options].some(option=>option.value===parameters.get('scenario')) ? parameters.get('scenario') : 'standard';
document.querySelector('#scenario').value = scenario;
const background = ['blue','plum','black'].includes(parameters.get('background')) ? parameters.get('background') : 'blue';
const fidelity = parameters.get('fidelity') === '1';
fixture.reset(scenario, fidelity ? { adapter:'standard', background, preset_labels:{frost:'Frost',eco:'Eco',comfort:'Comfort',boost:'Boost'}, valve_position_entity:'sensor.fixture_valve', features:[{entity:'sensor.fixture_humidity',label:'Humidity',icon:'mdi:water-percent'}], telemetry:[] } : {background});
if(parameters.get('expanded') === '1') {fixture.cards[0]._open=true;fixture.cards[0].render();}
if(parameters.get('capture') === '1') {
  document.body.dataset.capture='true';
  const width=['237','280','334','460'].includes(parameters.get('width')) ? parameters.get('width') : '334';
  document.documentElement.style.setProperty('--fixture-width',`${width}px`);
}
