// SPDX-License-Identifier: GPL-3.0-only
import assert from 'node:assert/strict';
import test from 'node:test';
import { CommandCoordinator } from '../../src/commands/coordinator.js';

const ENTITY = 'climate.synthetic_vt';
const SECRET = '0007-synthetic-private-code';
const allow = () => ({ allowed: true });
const tick = () => new Promise(resolve => queueMicrotask(resolve));

function state(locked = true, revision = 0, codeRequired = false) {
  return { entity_id: ENTITY, state: 'off', last_updated: `2026-01-01T00:00:${String(revision).padStart(2, '0')}.000Z`, attributes: {
    is_ready: true, is_lock_configured: true, temperature: 18, specific_states: { is_locked: locked },
    lock_manager: { is_locked: locked, lock_code: codeRequired, lock_users: true, lock_automations: false, auto_relock_sec: 30 },
  } };
}

function setup({ codeRequired = false, locked = true, ...options } = {}) {
  let resolve, reject;
  const transport = new Promise((yes, no) => { resolve = yes; reject = no; });
  const calls = [], notifications = [], callbacks = new Set();
  const hass = {
    connected: true, connection: { socket: {} }, user: { id: 'synthetic-admin', is_admin: true },
    services: { versatile_thermostat: { lock: {}, unlock: {} }, climate: { set_temperature: {} } },
    states: { [ENTITY]: state(locked, 0, codeRequired) },
    callService(domain, service, payload) { calls.push({ domain, service, payload, receiver: this }); return transport; },
  };
  const coordinator = new CommandCoordinator({
    setTimer(fn) { callbacks.add(fn); return fn; }, clearTimer(fn) { callbacks.delete(fn); },
    onChange(status) { notifications.push(status); }, ...options,
  });
  const update = (overrides = {}) => coordinator.updateContext({ hass, entity: ENTITY, preview: false, contextKey: 1,
    model: { ready: false, lockReady: true }, ...overrides });
  update();
  const request = (overrides = {}) => coordinator.requestLock({ hass, entity: ENTITY, locked: !locked,
    preview: false, validate: allow, contextKey: 1, ...(codeRequired ? { code: SECRET } : {}), ...overrides });
  const observe = next => { hass.states[ENTITY] = next; coordinator.observe(next); };
  return { hass, coordinator, calls, notifications, callbacks, request, update, observe, resolve, reject,
    timeout() { for (const fn of [...callbacks]) fn(); } };
}

test('explicit lock and unlock use only VT services, retain targets, and wait for fresh state plus acknowledgement', async () => {
  for (const locked of [true, false]) {
    const f = setup({ locked });
    const result = f.request();
    assert.deepEqual(f.calls[0], { domain: 'versatile_thermostat', service: locked ? 'unlock' : 'lock', payload: { entity_id: ENTITY }, receiver: f.hass });
    assert.deepEqual(f.coordinator.status.values, { locked: !locked });
    assert.equal(f.coordinator.status.domain, 'versatile_thermostat');
    f.resolve(); await tick();
    assert.equal(f.coordinator.status.phase, 'accepted');
    f.observe(state(!locked, 1));
    assert.equal((await result).phase, 'observed');
    assert.match(f.coordinator.status.message, /automatic relocking/);
    assert.equal(f.coordinator.busy, false);
  }
});

test('code is exact dispatch-only data, absent from job, public status, callbacks and validation input', async () => {
  const f = setup({ codeRequired: true }), validated = [];
  const result = f.request({ validate(value) { validated.push(value); return { allowed: true }; } });
  assert.equal(f.calls[0].payload.code, SECRET);
  assert.deepEqual(Object.keys(f.calls[0].payload).sort(), ['code', 'entity_id']);
  assert.equal(JSON.stringify(f.coordinator).includes(SECRET), false);
  assert.equal(JSON.stringify([f.notifications, validated]).includes(SECRET), false);
  assert.equal(Object.hasOwn(f.coordinator._job, 'code'), false);
  assert.equal(Object.hasOwn(f.coordinator._job.values, 'code'), false);
  f.reject(Error(`upstream echoed ${SECRET}`));
  const outcome = await result;
  assert.equal(outcome.phase, 'failed');
  assert.equal(JSON.stringify([f.coordinator, f.notifications, outcome]).includes(SECRET), false);
});

test('unknown or missing configured code cannot dispatch; no-code operations omit unsolicited credentials', async () => {
  for (const code of [undefined, null, '', 1234, {}]) {
    const f = setup({ codeRequired: true });
    assert.equal((await f.request({ code })).phase, 'failed'); assert.equal(f.calls.length, 0);
  }
  const f = setup(), result = f.request({ code: SECRET });
  assert.equal(Object.hasOwn(f.calls[0].payload, 'code'), false);
  f.resolve(); f.observe(state(false, 1)); await result;
});

test('already reported desired lock state is a no-op even when a code is configured', async () => {
  const f = setup({ codeRequired: true });
  const result = await f.request({ locked: true, code: undefined });
  assert.equal(result.phase, 'observed'); assert.match(result.message, /No command was sent/);
  assert.equal(f.calls.length, 0); assert.equal(f.callbacks.size, 0); assert.equal(f.coordinator.busy, false);
  const g = setup();
  const changed = await g.request({ locked: true, validate() {
    g.hass.states[ENTITY] = state(false, 1); return { allowed: true };
  } });
  assert.equal(changed.phase, 'failed'); assert.equal(g.calls.length, 0);
});

test('lock controls do not enable the climate lane and both kinds share one in-flight gate', async () => {
  const f = setup();
  const climate = () => f.coordinator.request({ hass: f.hass, entity: ENTITY, service: 'set_temperature', values: { temperature: 21 }, preview: false, validate: allow, contextKey: 1 });
  assert.equal((await climate()).phase, 'failed'); assert.equal(f.calls.length, 0);
  const pending = f.request();
  assert.equal((await climate()).phase, 'failed'); assert.equal((await f.request()).phase, 'failed');
  assert.equal(f.calls.length, 1);
  f.timeout(); await pending;
  assert.equal(f.coordinator.busy, true); assert.equal((await f.request()).phase, 'failed');
  f.resolve(); await tick(); assert.equal(f.coordinator.busy, false);
  const g = setup();
  g.update({ model: { ready: true, lockReady: true } });
  const climatePending = g.coordinator.request({ hass: g.hass, entity: ENTITY, service: 'set_temperature', values: { temperature: 21 }, preview: false, validate: allow, contextKey: 1 });
  assert.equal((await g.request()).phase, 'failed'); assert.equal(g.calls.length, 1);
  g.reject(Error('test completion')); await climatePending;
});

test('unprivileged, missing-context, preview, invalid intent and absent service requests fail closed', async () => {
  const cases = [
    f => { f.hass.user.is_admin = false; }, f => { delete f.hass.user.is_admin; },
    f => { f.hass.connected = false; }, f => { f.update({ model: { ready: true } }); },
    f => { f.update({ preview: true }); }, f => { delete f.hass.services.versatile_thermostat.unlock; },
    f => { f.hass.states[ENTITY].attributes.is_ready = false; },
  ];
  for (const change of cases) {
    const f = setup(); change(f);
    assert.equal((await f.request()).phase, 'failed', change.toString()); assert.equal(f.calls.length, 0);
  }
  for (const override of [{ preview: true }, { preview: undefined }, { locked: 'false' }, { entity: 'sensor.other' }, { validate: undefined }]) {
    const f = setup(); assert.equal((await f.request(override)).phase, 'failed'); assert.equal(f.calls.length, 0);
  }
});

test('role, session, selection, preview, readiness and configuration changes retire tracking without retargeting', async () => {
  const changes = [
    f => { f.hass.user.is_admin = false; return {}; },
    f => ({ hass: { ...f.hass, user: { id: 'other-admin', is_admin: true } } }),
    f => ({ hass: { ...f.hass, connection: { socket: {} } } }),
    f => { f.hass.connection.socket = {}; return {}; },
    () => ({ entity: 'climate.other' }), () => ({ preview: true }),
    () => ({ model: { ready: true, lockReady: false } }), () => ({ contextKey: 2 }),
  ];
  for (const change of changes) {
    const f = setup(), result = f.request();
    f.update(change(f)); assert.equal((await result).phase, 'uncertain', change.toString());
    assert.equal(f.coordinator.busy, true); assert.equal(f.calls[0].payload.entity_id, ENTITY);
    f.resolve(); await tick(); assert.equal(f.coordinator.status.phase, 'uncertain'); assert.equal(f.calls.length, 1);
  }
});

test('in-place admin revocation and lock setting changes are caught even without a context update', async () => {
  const changes = [
    f => { f.hass.user.is_admin = false; },
    f => { f.hass.states[ENTITY].attributes.lock_manager.lock_code = true; },
    f => { f.hass.states[ENTITY].attributes.lock_manager.auto_relock_sec = 60; },
  ];
  for (const change of changes) {
    const f = setup(), result = f.request(); change(f); f.resolve();
    assert.equal((await result).phase, 'uncertain'); assert.equal(f.calls.length, 1);
  }
});

test('pre-dispatch races cannot reverse intent, bypass roles, add code or inject another request', async () => {
  const changes = [
    f => { f.hass.user.is_admin = false; },
    f => { f.hass.states[ENTITY] = state(false, 1); },
    f => { f.hass.states[ENTITY].attributes.lock_manager.lock_code = true; },
    f => { f.update({ preview: true }); },
  ];
  for (const change of changes) {
    let f;
    f = setup({ onChange(status) { if (status.phase === 'pending') change(f); } });
    assert.equal((await f.request()).phase, 'failed'); assert.equal(f.calls.length, 0);
  }
  const f = setup(), attempts = [];
  const pending = f.request({ validate() { attempts.push(f.request()); return { allowed: true }; } });
  for (const attempt of attempts) assert.equal((await attempt).phase, 'failed');
  assert.equal(f.calls.length, 1); f.reject(Error('finish')); await pending;
});

test('validation and synchronous transport errors never publish raw sensitive text', async () => {
  for (const validate of [() => ({ allowed: false, reason: SECRET }), () => { throw Error(SECRET); }, async () => { throw Error(SECRET); }]) {
    const f = setup({ codeRequired: true });
    const result = await f.request({ validate });
    assert.equal(result.phase, 'failed'); assert.equal(f.calls.length, 0);
    assert.equal(JSON.stringify([result, f.notifications]).includes(SECRET), false);
  }
  const f = setup({ codeRequired: true }); f.hass.callService = () => { throw Error(SECRET); };
  const result = await f.request();
  assert.equal(result.phase, 'failed'); assert.equal(f.coordinator.busy, false); assert.equal(f.callbacks.size, 0);
  assert.equal(JSON.stringify([f.coordinator, result, f.notifications]).includes(SECRET), false);
});

test('observation before acknowledgement succeeds only if a matching fresh state is still the latest', async () => {
  const f = setup(), success = f.request(); f.observe(state(false, 1));
  assert.equal(f.coordinator.status.phase, 'pending'); f.resolve(); assert.equal((await success).phase, 'observed');
  const g = setup(), relocked = g.request();
  g.observe(state(false, 1)); g.observe(state(true, 2)); g.resolve(); await tick();
  assert.equal(g.coordinator.status.phase, 'accepted'); g.timeout(); assert.equal((await relocked).phase, 'uncertain');
  assert.equal(g.calls.length, 1, 'auto-relock never schedules a corrective unlock');
});

test('late rejection wins over an observed unlock, without exposing a provider exception', async () => {
  const f = setup({ codeRequired: true }), result = f.request();
  f.observe(state(false, 1, true)); f.reject(Error(SECRET));
  assert.equal((await result).phase, 'failed'); assert.equal(JSON.stringify(f.notifications).includes(SECRET), false);
});

test('baseline, stale, mismatched, malformed and unavailable observations cannot complete a lock request', async () => {
  const f = setup(), result = f.request(); f.resolve(); await tick();
  const bad = [state(false, 0), { ...state(false, 1), entity_id: 'climate.other' },
    { ...state(false, 1), state: 'unavailable' }, state(false, 1)];
  bad[3].attributes.specific_states.is_locked = 'false';
  for (const observation of bad) f.coordinator.observe(observation);
  assert.equal(f.coordinator.status.phase, 'accepted');
  f.timeout(); assert.equal((await result).phase, 'uncertain'); assert.equal(f.calls.length, 1);
});

test('disconnect, timeout and late settlement never replay; a new deliberate action is needed after recovery', async () => {
  const f = setup(), result = f.request();
  f.update({ hass: { ...f.hass, connected: false } }); assert.equal((await result).phase, 'uncertain');
  f.update(); f.observe(state(false, 1)); f.resolve(); await tick();
  assert.equal(f.coordinator.status.phase, 'uncertain'); assert.equal(f.calls.length, 1);
  const g = setup(), timed = g.request(); g.timeout(); assert.equal((await timed).phase, 'uncertain');
  assert.equal(g.coordinator.busy, true); g.observe(state(false, 1)); g.resolve(); await tick();
  assert.equal(g.coordinator.status.phase, 'uncertain'); assert.equal(g.coordinator.busy, false); assert.equal(g.calls.length, 1);
});
