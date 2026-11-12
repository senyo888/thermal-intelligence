// SPDX-License-Identifier: GPL-3.0-only
import assert from 'node:assert/strict';
import test from 'node:test';
import { lockCapability, readLockFacts } from '../../src/providers/lock-control.js';

const entity = 'climate.synthetic_vt';
function fixture() {
  return {
    entity, identity: { entity_id: entity, platform: 'versatile_thermostat' },
    registryStatus: 'verified', preview: false, attached: true,
    hass: {
      connected: true, connection: { socket: {} }, user: { id: 'synthetic-admin', is_admin: true },
      services: { versatile_thermostat: { lock: {}, unlock: {} } }, callService() {},
      states: { [entity]: { entity_id: entity, state: 'off', attributes: {
        is_ready: true, is_lock_configured: true, specific_states: { is_locked: true },
        lock_manager: { is_locked: true, lock_code: false, lock_users: true, lock_automations: false, auto_relock_sec: 30 },
      } } },
    },
  };
}

test('a ready locked VT can expose admin lock control without weakening climate readiness', () => {
  const f = fixture(), capability = lockCapability(f);
  assert.equal(capability.allowed, true);
  assert.deepEqual([capability.locked, capability.codeRequired, capability.lockUsers, capability.lockAutomations, capability.autoRelockSec], [true, false, true, false, 30]);
  assert.equal(Object.isFrozen(capability), true);
  const attributes = f.hass.states[entity].attributes;
  attributes.specific_states.is_locked = false; attributes.lock_manager.is_locked = false;
  assert.equal(lockCapability(f).allowed, true);
  assert.notEqual(lockCapability(f).signature, capability.signature);
});

test('known admin, attached live card, authenticated connection and current registry proof are all required', () => {
  const changes = [
    f => { f.hass.user.is_admin = false; }, f => { delete f.hass.user.is_admin; },
    f => { f.hass.user.is_admin = 'true'; }, f => { f.hass.user.id = ''; },
    f => { f.hass.connected = false; }, f => { f.hass.connection = null; },
    f => { f.attached = false; }, f => { delete f.attached; },
    f => { f.preview = true; }, f => { delete f.preview; },
    f => { f.registryStatus = 'loading'; }, f => { f.registryStatus = 'unavailable'; },
    f => { f.identity = null; }, f => { f.identity.entity_id = 'climate.other'; },
    f => { f.identity.platform = 'generic_thermostat'; }, f => { f.entity = 'sensor.synthetic'; },
    f => { f.hass.states[entity].entity_id = 'climate.other'; },
    f => { delete f.hass.services.versatile_thermostat.lock; },
    f => { delete f.hass.services.versatile_thermostat.unlock; }, f => { delete f.hass.callService; },
  ];
  for (const change of changes) {
    const f = fixture(); change(f);
    assert.equal(lockCapability(f).allowed, false, change.toString());
    assert.ok(lockCapability(f).reason);
  }
});

test('unknown, unavailable, disabled or contradictory provider evidence fails closed', () => {
  const changes = [
    s => { s.state = 'unknown'; }, s => { s.state = 'unavailable'; },
    s => { delete s.attributes.is_ready; }, s => { s.attributes.is_ready = false; },
    s => { s.attributes.is_ready = 'true'; }, s => { s.attributes.is_lock_configured = false; },
    s => { delete s.attributes.specific_states.is_locked; },
    s => { s.attributes.lock_manager.is_locked = false; },
    s => { s.attributes.lock_manager.lock_code = 'credential-must-not-escape'; },
    s => { delete s.attributes.lock_manager.lock_code; },
    s => { delete s.attributes.lock_manager.lock_users; },
    s => { delete s.attributes.lock_manager.lock_automations; },
    s => { s.attributes.lock_manager.lock_users = false; },
    s => { s.attributes.lock_manager.auto_relock_sec = -1; },
    s => { s.attributes.lock_manager.auto_relock_sec = '30'; },
    s => { s.attributes.lock_manager.auto_relock_sec = Infinity; },
  ];
  for (const change of changes) {
    const f = fixture(); change(f.hass.states[entity]);
    const result = lockCapability(f);
    assert.equal(result.allowed, false, change.toString());
    assert.equal(JSON.stringify(result).includes('credential-must-not-escape'), false);
  }
});

test('signature invalidates dialog intent when public scope, code, relock, user or service evidence changes', () => {
  const changes = [
    f => { f.hass.states[entity].attributes.lock_manager.lock_code = true; },
    f => { f.hass.states[entity].attributes.lock_manager.lock_automations = true; },
    f => { f.hass.states[entity].attributes.lock_manager.auto_relock_sec = 0; },
    f => { f.hass.user.id = 'different-admin'; }, f => { f.hass.user.is_admin = false; },
    f => { delete f.hass.services.versatile_thermostat.unlock; },
  ];
  for (const change of changes) {
    const f = fixture(), original = lockCapability(f).signature;
    change(f); assert.notEqual(lockCapability(f).signature, original);
  }
  const f = fixture(), original = lockCapability(f).signature;
  f.hass.states[entity].attributes.current_temperature = 22;
  assert.equal(lockCapability(f).signature, original, 'unrelated telemetry does not discard the dialog');
});

test('lock observations do not trust inherited values or invoke attribute getters', () => {
  const f = fixture(), state = f.hass.states[entity];
  state.attributes.lock_manager = Object.create(state.attributes.lock_manager);
  assert.equal(readLockFacts(state).known, false);
  state.attributes.lock_manager = {};
  Object.defineProperty(state.attributes.lock_manager, 'lock_code', { get() { throw Error('must not execute'); } });
  assert.equal(lockCapability(f).allowed, false);
});
