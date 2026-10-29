// SPDX-License-Identifier: GPL-3.0-only
import test from 'node:test';
import assert from 'node:assert/strict';
import { vthermDetails } from '../../src/providers/vtherm.js';

for (const [key, label] of [['hvac_off_reason', 'Off reason'], ['hvac_mode_reason', 'Mode reason']]) {
  test(`${label}: explicit null means no optional reason, not missing telemetry`, () => {
    const read = (states, observable = true) => vthermDetails({ specific_states: states }, observable).find(row => row.label === label);
    assert.equal(read({ [key]: null }).status, 'available');
    assert.equal(read({ [key]: null }).value, 'None reported');
    assert.equal(read({ [key]: 'Window detection' }).value, 'Window detection');
    assert.equal(read({}).status, 'unavailable');
    assert.equal(read(Object.create({ [key]: null })).status, 'unavailable');
    assert.equal(vthermDetails({}, true).find(row => row.label === label).status, 'unavailable');
    for (const value of [undefined, 'unknown', {}, [], NaN, false, true, 0, 2, '', ' ']) assert.equal(read({ [key]: value }).status, 'unknown');
    assert.equal(read({ [key]: 'unavailable' }).status, 'unavailable');
    assert.equal(read({ [key]: null }, false).status, 'unavailable');
    assert.equal(read({ [key]: null }, false).value, null);
  });
}

test('null readiness, restrictions and regulation retain their uncertainty', () => {
  const rows = vthermDetails({ is_ready: null, specific_states: { is_locked: null, is_initialized: null },
    is_window_configured: true, window_manager: { window_state: null },
    configuration: { type: 'over_climate' }, vtherm_over_climate: { is_regulated: true, regulation: { auto_regulation_mode: null } },
  }, true);
  for (const label of ['Readiness', 'Initialized', 'Locked', 'Window', 'Regulation mode']) {
    assert.equal(rows.find(row => row.label === label).status, 'unknown', label);
  }
});
