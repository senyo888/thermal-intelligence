// SPDX-License-Identifier: GPL-3.0-only
import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeConfig} from '../../src/model/config.js';
import {buildModel} from '../../src/model/climate.js';
import {buildTelemetry} from '../../src/model/telemetry.js';
import {sourceSuggestions} from '../../src/editor/source-suggestions.js';
import {renderCard} from '../../src/cards/source-view.js';

const stamp='2026-11-15T08:00:00Z', now=Date.parse(stamp);
const state=(entity_id,value,attributes={})=>({entity_id,state:value,attributes,last_updated:stamp});
function reading(entry,source) {
  const config=normalizeConfig({entity:'climate.example',telemetry:[entry]});
  return buildTelemetry({states:{[entry.entity]:source}},config,now)[0];
}
test('temperature uses the actual sensor unit and rejects non-temperature drift',()=>{
  const entry={kind:'temperature',entity:'sensor.outside'};
  for(const [value,unit,status] of [['-4.2','°C','available'],['0','°F','available'],[true,'°C','invalid'],['sunny','°C','invalid'],['Infinity','°C','invalid'],['12','%','invalid'],['12',undefined,'invalid'],['unknown','°C','unknown'],['unavailable','°C','unavailable']]) {
    assert.equal(reading(entry,state(entry.entity,value,{unit_of_measurement:unit})).status,status);
  }
  assert.equal(reading({...entry,unit:'°C'},state(entry.entity,'50',{unit_of_measurement:'°F'})).status,'invalid');
  assert.equal(reading(entry,state(entry.entity,'50',{unit_of_measurement:'°F'})).value,50);
});
test('weather temperature follows its unit attribute and never uses condition or unrelated units',()=>{
  const entry={kind:'temperature',entity:'weather.example',attribute:'temperature',unit_attribute:'temperature_unit'};
  const source=state(entry.entity,'rainy',{temperature:8,temperature_unit:'°C',unit_of_measurement:'km/h'});
  assert.deepEqual([reading(entry,source).value,reading(entry,source).unit],[8,'°C']);
  source.attributes.temperature=46.4;source.attributes.temperature_unit='°F';
  assert.deepEqual([reading(entry,source).value,reading(entry,source).unit],[46.4,'°F']);
  assert.equal(reading({...entry,unit:'°C'},source).status,'invalid');
  delete source.attributes.temperature_unit;
  assert.equal(reading({...entry,unit:'°C'},source).status,'invalid');
  source.attributes.temperature_unit='°C';source.attributes.temperature='unknown';
  assert.equal(reading(entry,source).status,'unknown');
});
test('temperature mappings retain age limits, unknown fields and control-schema independence',()=>{
  const entry={kind:'temperature',entity:'sensor.outside',max_age_seconds:30,future:{kept:true}};
  const config=normalizeConfig({entity:'',telemetry:[entry],future:{kept:true}});
  assert.equal(config.schema_version,1);assert.deepEqual(config.telemetry[0].future,{kept:true});
  const source=state(entry.entity,'8',{unit_of_measurement:'°C'});
  assert.equal(buildTelemetry({states:{[entry.entity]:source}},config,now+31000)[0].status,'stale');
  assert.equal(buildTelemetry({states:{[entry.entity]:source}},config,now,false)[0].status,'unavailable');
  for(const path of ['__proto__.unit','constructor.unit','a..b','']) assert.throws(()=>normalizeConfig({telemetry:[{kind:'temperature',entity:'weather.example',attribute:'temperature',unit_attribute:path}]}));
});
const anchor={entity_id:'climate.example',platform:'versatile_thermostat',unique_id:'config-1',config_entry_id:'config-1',device_id:'device-1'};
const slope={entity_id:'sensor.renamed_rate',platform:'versatile_thermostat',unique_id:'Old name_temperature_slope',translation_key:'temperature_slope',config_entry_id:'config-1',device_id:'device-1',disabled_by:null};
const slopeHass={connected:true,states:{'climate.example':state('climate.example','heat',{}),'sensor.renamed_rate':state('sensor.renamed_rate','0.3',{unit_of_measurement:'°C/hour'})}};
test('VT suggestion binds role, device and config entry instead of entity names',()=>{
  const config=normalizeConfig({entity:anchor.entity_id});
  const suggestions=sourceSuggestions(slopeHass,config,[anchor,slope]);
  assert.equal(suggestions.length,1);assert.equal(suggestions[0].entry.entity,'sensor.renamed_rate');assert.equal(suggestions[0].status,'available');
  for(const change of [{device_id:'other'},{config_entry_id:'other'},{translation_key:null},{unique_id:'other'},{platform:'template'}]) {
    assert.equal(sourceSuggestions(slopeHass,config,[anchor,{...slope,...change}]).length,0);
  }
  assert.equal(sourceSuggestions(slopeHass,config,[{...anchor,unique_id:'wrong'},slope]).length,0);
});
test('VT suggestions preserve explicit disables, existing rows, unavailable and ambiguous sources',()=>{
  for(const extra of [{trend_entity:''},{trend_entity:'sensor.existing'},{telemetry:[{kind:'trend',entity:''}]},{features:[{entity:slope.entity_id}]}]) {
    assert.equal(sourceSuggestions(slopeHass,normalizeConfig({entity:anchor.entity_id,...extra}),[anchor,slope]).length,0);
  }
  const config=normalizeConfig({entity:anchor.entity_id});
  assert.equal(sourceSuggestions(slopeHass,config,[anchor,slope,{...slope,entity_id:'sensor.second'}])[0].status,'unknown');
  assert.equal(sourceSuggestions(slopeHass,config,[anchor,{...slope,disabled_by:'user'}])[0].status,'disabled');
  assert.equal(sourceSuggestions({...slopeHass,states:{}},config,[anchor,slope])[0].status,'unavailable');
  assert.equal(sourceSuggestions(slopeHass,config,[]).length,0);
});
test('VT accepted feature suggestions respect explicit feature flags and raw input availability',()=>{
  const hass=structuredClone(slopeHass),config=normalizeConfig({entity:anchor.entity_id,trend_entity:''});
  hass.states[anchor.entity_id].attributes={is_window_configured:true,window_manager:{window_state:'on',window_sensor_entity_id:'binary_sensor.window'}};
  let result=sourceSuggestions(hass,config,[anchor]);
  assert.equal(result[0].entry.attribute,'window_manager.window_state');assert.equal(result[0].status,'unavailable');
  hass.states['binary_sensor.window']=state('binary_sensor.window','on');
  assert.equal(sourceSuggestions(hass,config,[anchor])[0].status,'available');
  hass.states[anchor.entity_id].attributes.is_window_configured=false;
  assert.equal(sourceSuggestions(hass,config,[anchor]).length,0);
});
test('unresolved transport does not relabel an uncertain request as pending',()=>{
  const config=normalizeConfig({entity:'climate.example',adapter:'standard'});
  const model=buildModel({connected:true,states:{'climate.example':state('climate.example','heat',{current_temperature:20,temperature:21,min_temp:7,max_temp:30,supported_features:1})},config:{unit_system:{temperature:'°C'}}},config);
  const html=renderCard({config,model,busy:true,requestPhase:'uncertain',statusMessage:'Outcome uncertain.'});
  assert.match(html,/aria-busy="false"/);assert.match(html,/>Uncertain<\/small>/);assert.doesNotMatch(html,/>Pending<\/small>/);
});
