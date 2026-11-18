// SPDX-License-Identifier: GPL-3.0-only
import test from 'node:test';
import assert from 'node:assert/strict';
import { compactHeader, headerPresentation } from '../../src/cards/header-presentation.js';

function fixture(owner='House',status='available') {
  const rows=[
    {key:'temperature',group:'primary',value:'12 °C'},
    {key:'feature:eco',group:'primary',preset:'eco',icon:'mdi:leaf',shortLabel:'sensor.eco',value:'17 °C',status:'available',headerEligible:true},
    {key:'control:provider',group:'control',label:'VT provider',value:'Provider',monogram:'VT'},
    {key:'control:ownership',group:'control',label:'Control source',value:owner,status,icon:owner==='House'?'mdi:home-thermometer':'mdi:help-circle-outline'},
    {key:'control:house',group:'control',label:'House preset',value:'Boost',status:'available',icon:'mdi:fire'},
    {key:'control:schedule',group:'control',label:'Schedule',value:'Active',status:'available'},
  ];
  return {headerTelemetry:rows,headerOptions:[...rows,{key:'preset:eco',group:'control',preset:'eco',value:'Eco',headerEligible:false}]};
}
test('a single House composite uses House policy without borrowing the different room preset',()=>{
  const model=fixture(),before=structuredClone(model),rows=compactHeader(model),summary=rows[1];
  assert.equal(rows.length,2);assert.equal(rows[0].key,'temperature');assert.equal(summary.secondary.preset,'boost');
  assert.equal(summary.title,'Control source: House; House policy: Boost');
  assert(summary.detailRows.some(row=>row.value==='17 °C'));assert.deepEqual(model,before);
  model.headerTelemetry[4].status='stale';assert.equal(compactHeader(model)[1].secondary,null);
});
test('unknown, pending and invalid ownership suppress every other control glyph and preset',()=>{
  for(const [owner,status]of [['Unknown','unknown'],['Unknown','available'],['Pending','available'],['Unavailable','unavailable'],['Invalid','invalid']]){
    const summary=compactHeader(fixture(owner,status))[1];
    assert.equal(summary.secondary,null);assert.equal(summary.monogram,undefined);
    assert.equal(headerPresentation(summary).iconOnly,true);assert(!headerPresentation(summary).content.includes('Provider'));
  }
});
test('known room ownership combines only with an available selected preset',()=>{
  for(const owner of ['Manual','VT','Policy','Schedule']){
    const model=fixture(owner),summary=compactHeader(model)[1];assert.equal(summary.secondary.preset,'eco');
    assert.equal(summary.title,`Control source: ${owner}; Thermostat preset: Eco`);
    model.headerTelemetry=model.headerTelemetry.filter(row=>!row.preset);assert.equal(compactHeader(model)[1].secondary,null);
  }
});
test('hiding the combined control indicator suppresses the slot without losing its observations',()=>{
  const model=fixture();model.headerTelemetry=model.headerTelemetry.filter(row=>row.key!=='control:ownership');
  assert.deepEqual(compactHeader(model).map(row=>row.key),['temperature']);assert(model.headerOptions.some(row=>row.key==='control:ownership'));
});
test('confirmed local adjustment has a history marker, never overrides a mapped unknown source',()=>{
  const model=fixture('Unknown','unknown');model.ownership={label:'Unknown'};
  const manual={key:'control:manual_adjustment',group:'control',status:'available',headerEligible:true,icon:'mdi:hand-back-right',value:'Manual input'};
  model.headerTelemetry.push(manual);model.headerOptions.push(manual);
  let summary=compactHeader(model)[1];assert.equal(summary.lastAction,true);assert.match(summary.title,/Last confirmed card action.*Control source: Unknown/);assert.match(headerPresentation(summary).content,/mdi:history/);
  model.ownership.source={entity:'sensor.owner'};summary=compactHeader(model)[1];assert.equal(summary.lastAction,false);assert.equal(summary.secondary,null);
});
test('binary custom mappings omit words while numbers and arbitrary custom text survive',()=>{
  for(const rawValue of [true,false,'on','off'])assert.equal(headerPresentation({kind:'custom',rawValue,value:String(rawValue)}).iconOnly,true);
  for(const rawValue of [12,'Guest room','ON','True'])assert.equal(headerPresentation({kind:'custom',rawValue,value:String(rawValue)}).iconOnly,false);
});
