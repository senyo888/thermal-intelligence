// SPDX-License-Identifier: GPL-3.0-only
import assert from "node:assert/strict";
import test from "node:test";
import { CommandCoordinator } from "../../src/commands/coordinator.js";

const ENTITY = "climate.test_thermostat";
const allow = () => ({ allowed: true });
const tick = () => new Promise(resolve => queueMicrotask(resolve));

function deferred() {
  let resolve, reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}

function state(temperature = 19, revision = 0, other = {}) {
  return {
    entity_id: ENTITY,
    state: "heat",
    attributes: { temperature, preset_mode: "eco" },
    last_updated: `2026-01-01T00:00:${String(revision).padStart(2, "0")}.000Z`,
    ...other,
  };
}

function setup(options = {}) {
  const transport = deferred();
  const calls = [];
  const notifications = [];
  const callbacks = new Map();
  let sequence = 0;
  const hass = {
    connected: true,
    connection: { socket: {} },
    user: { id: "synthetic-user" },
    services: { climate: Object.fromEntries([
      "set_temperature", "set_hvac_mode", "set_preset_mode", "set_fan_mode",
      "set_swing_mode", "set_swing_horizontal_mode",
    ].map(name => [name, {}])) },
    states: { [ENTITY]: state() },
    callService(domain, service, payload) {
      calls.push({ domain, service, payload, receiver: this });
      return transport.promise;
    },
  };
  const coordinator = new CommandCoordinator({
    timeoutMs: 25,
    setTimer(callback) { const id = ++sequence; callbacks.set(id, callback); return id; },
    clearTimer(id) { callbacks.delete(id); },
    onChange(status) { notifications.push(status); },
    ...options,
  });
  coordinator.updateContext({ hass, entity: ENTITY, preview: false });
  const request = overrides => coordinator.request({
    hass, entity: ENTITY, service: "set_temperature", values: { temperature: 21 },
    preview: false, validate: allow, ...overrides,
  });
  const timeout = () => { for (const callback of [...callbacks.values()]) callback(); };
  return { hass, transport, calls, notifications, callbacks, coordinator, request, timeout };
}

test("default timers retain the browser global receiver when scheduling and clearing", async t => {
  const activeTimers = new Map();
  let scheduled = 0, cleared = 0;
  t.mock.method(globalThis, "setTimeout", function(callback, delay) {
    assert.equal(this, globalThis, "browser timer requires its global receiver");
    assert.equal(delay, 25);
    activeTimers.set(++scheduled, callback);
    return scheduled;
  });
  t.mock.method(globalThis, "clearTimeout", function(id) {
    assert.equal(this, globalThis, "browser timer cleanup requires its global receiver");
    cleared++;
    activeTimers.delete(id);
  });
  const f = setup({ setTimer: undefined, clearTimer: undefined });
  const pending = f.request();
  assert.equal(scheduled, 1);
  assert.equal(f.calls.length, 1, "timer binding must not block a valid request");
  f.transport.resolve();
  await tick();
  f.coordinator.observe(state(21, 1));
  assert.equal((await pending).phase, "observed");
  assert.equal(cleared, 1);
  assert.equal(activeTimers.size, 0);
});

test("dispatch retains target and source function; acceptance waits for fresh observation", async () => {
  const f = setup();
  const pending = f.request();
  assert.equal(f.calls.length, 1);
  assert.deepEqual(f.calls[0].payload, { temperature: 21, entity_id: ENTITY });
  assert.equal(f.calls[0].domain, "climate");
  assert.equal(f.calls[0].receiver, f.hass);
  f.transport.resolve();
  await tick();
  assert.equal(f.coordinator.status.phase, "accepted");
  assert.equal(f.coordinator.busy, true);
  f.coordinator.observe(state(21, 1));
  const outcome = await pending;
  assert.equal(outcome.phase, "observed");
  assert.match(outcome.message, /does not establish physical heating/);
  assert.equal(f.coordinator.busy, false);
  assert.equal(f.callbacks.size, 0);
});

test("an observation before service response is not acceptance; late rejection wins", async () => {
  const f = setup();
  const pending = f.request();
  f.coordinator.observe(state(21, 1));
  assert.equal(f.coordinator.status.phase, "pending");
  assert.match(f.coordinator.status.message, /waiting for the service response/);
  f.transport.reject(Error("synthetic rejection"));
  const result = await pending;
  assert.equal(result.phase, "failed");
  assert.match(result.message, /effect is unknown/);
  assert.equal(f.calls.length, 1);
});

test("fresh matching observation then acceptance produces observed state", async () => {
  const f = setup();
  const pending = f.request();
  f.coordinator.observe(state(21, 1));
  f.transport.resolve();
  assert.equal((await pending).phase, "observed");
});

test("a later external change replaces an earlier match before acknowledgement", async () => {
  const f = setup();
  const pending = f.request();
  f.coordinator.observe(state(21, 1));
  f.coordinator.observe(state(18, 2));
  f.transport.resolve();
  await tick();
  assert.equal(f.coordinator.status.phase, "accepted");
  f.timeout();
  assert.equal((await pending).phase, "uncertain");
  assert.equal(f.calls.length, 1);
});

test("baseline, stale timestamp and other entity cannot establish observed result", async () => {
  const f = setup();
  f.hass.states[ENTITY] = state(21, 3);
  const pending = f.request();
  f.transport.resolve();
  await tick();
  f.coordinator.observe(f.hass.states[ENTITY]);
  f.coordinator.observe(state(21, 2));
  f.coordinator.observe(state(21, 3));
  f.coordinator.observe(state(21, 4, { entity_id: "climate.other_test" }));
  assert.equal(f.coordinator.status.phase, "accepted");
  f.timeout();
  assert.equal((await pending).phase, "uncertain");
});

for (const change of ["entity", "user", "connection", "socket", "preview", "readiness", "config"]) {
  test(`pending request is retired when ${change} changes; original dispatch is never retargeted`, async () => {
    const f = setup();
    const original = f.hass.connection;
    const pending = f.request();
    let hass = { ...f.hass }, entity = ENTITY, preview = false, model, contextKey;
    if (change === "entity") entity = "climate.other_test";
    if (change === "user") hass = { ...hass, user: { id: "different-synthetic-user" } };
    if (change === "connection") hass = { ...hass, connection: { socket: {} } };
    if (change === "socket") original.socket = {};
    if (change === "preview") preview = true;
    if (change === "readiness") model = { ready: false };
    if (change === "config") contextKey = {};
    f.coordinator.updateContext({ hass, entity, preview, model, contextKey });
    assert.equal((await pending).phase, "uncertain");
    assert.equal(f.coordinator.busy, true);
    assert.equal((await f.request({ hass, entity, preview })).phase, "failed");
    assert.equal(f.calls.length, 1);
    assert.equal(f.calls[0].payload.entity_id, ENTITY);
    f.transport.resolve();
    await tick();
    assert.equal(f.coordinator.status.phase, "uncertain");
    assert.equal(f.coordinator.busy, false);
  });
}

test("disconnect and reconnect never replay or revive an old command", async () => {
  const f = setup();
  const pending = f.request();
  f.coordinator.updateContext({ hass: { ...f.hass, connected: false }, entity: ENTITY, preview: false });
  assert.equal((await pending).phase, "uncertain");
  f.coordinator.updateContext({ hass: f.hass, entity: ENTITY, preview: false });
  f.coordinator.observe(state(21, 1));
  f.transport.resolve();
  await tick();
  assert.equal(f.calls.length, 1);
  assert.equal(f.coordinator.status.phase, "uncertain");
});

test("rapid requests are refused while a request or transport is unresolved", async () => {
  const f = setup();
  const first = f.request();
  const second = await f.request({ values: { temperature: 22 } });
  assert.equal(second.phase, "failed");
  assert.equal(f.coordinator.status.phase, "pending");
  assert.equal(f.calls.length, 1);
  f.timeout();
  assert.equal((await first).phase, "uncertain");
  assert.equal(f.coordinator.busy, true);
  await f.request({ values: { temperature: 23 } });
  assert.equal(f.calls.length, 1);
  f.transport.reject(Error("late response"));
  await tick();
  assert.equal(f.coordinator.busy, false);
  assert.equal(f.coordinator.status.phase, "uncertain");
});

test("timeout after acceptance is uncertain and does not repeat the command", async () => {
  const f = setup();
  const pending = f.request();
  f.transport.resolve();
  await tick();
  f.timeout();
  const result = await pending;
  assert.equal(result.phase, "uncertain");
  assert.match(result.message, /setting was not observed/);
  assert.equal(f.coordinator.busy, false);
  f.coordinator.observe(state(21, 1));
  assert.equal(f.coordinator.status, result);
  assert.equal(f.calls.length, 1);
});

for (const preview of [true, undefined, null, 0]) {
  test(`preview flag ${String(preview)} cannot write even when capability validation permits`, async () => {
    const f = setup();
    assert.equal((await f.request({ preview })).phase, "failed");
    assert.equal(f.calls.length, 0);
  });
}

test("known preview context cannot be bypassed by passing preview:false", async () => {
  const f = setup();
  f.coordinator.updateContext({ hass: f.hass, entity: ENTITY, preview: true });
  assert.equal((await f.request()).phase, "failed");
  assert.equal(f.calls.length, 0);
});

test("missing connection, user, service or capability permission fail closed", async () => {
  for (const change of ["connection", "user", "connected", "service", "validate", "deny"]) {
    const f = setup();
    if (change === "connection") f.hass.connection = undefined;
    if (change === "user") f.hass.user = undefined;
    if (change === "connected") f.hass.connected = undefined;
    if (change === "service") delete f.hass.services.climate.set_temperature;
    f.coordinator.updateContext({ hass: f.hass, entity: ENTITY, preview: false });
    const validate = change === "validate" ? undefined : change === "deny" ? () => ({ allowed: false, reason: "Not ready" }) : allow;
    assert.equal((await f.request({ validate })).phase, "failed", change);
    assert.equal(f.calls.length, 0, change);
  }
});

test("command schemas prevent service injection, target override and malformed values", async () => {
  const cases = [
    { entity: "switch.test_actuator" },
    { service: "turn_on", values: {} },
    { values: { temperature: 21, entity_id: "climate.other_test" } },
    { values: { temperature: "21" } },
    { values: { temperature: NaN } },
    { values: { temperature: Infinity } },
    { values: { target_temp_low: 20 } },
    { values: { target_temp_low: 23, target_temp_high: 20 } },
    { values: { temperature: 21, target_temp_low: 20, target_temp_high: 22 } },
    { service: "set_preset_mode", values: { preset_mode: "" } },
    { service: "set_preset_mode", values: { preset_mode: "\nboost" } },
    { service: "set_hvac_mode", values: { hvac_mode: "unsupported" } },
    { service: "set_fan_mode", values: { fan_mode: "auto", temperature: 21 } },
    { values: Object.create({ temperature: 21 }) },
    { values: Object.defineProperty({}, "temperature", { get() { throw Error("must not read"); }, enumerable: true }) },
  ];
  for (const override of cases) {
    const f = setup();
    assert.equal((await f.request(override)).phase, "failed");
    assert.equal(f.calls.length, 0);
  }
});

test("captured values and published status cannot be changed by the caller", async () => {
  const f = setup();
  const values = { temperature: 21 };
  const pending = f.request({ values });
  values.temperature = 30;
  assert.equal(f.calls[0].payload.temperature, 21);
  assert.equal(f.coordinator.status.values.temperature, 21);
  assert.throws(() => { f.coordinator.status.values.temperature = 31; }, TypeError);
  assert.throws(() => { f.coordinator.status.target = "climate.other_test"; }, TypeError);
  f.transport.resolve();
  await tick();
  f.coordinator.observe(state(21, 1));
  assert.equal((await pending).phase, "observed");
});

test("callback exceptions cannot poison command state", async () => {
  const f = setup({ onChange() { throw Error("synthetic render error"); } });
  const pending = f.request();
  f.transport.resolve();
  await tick();
  f.coordinator.observe(state(21, 1));
  assert.equal((await pending).phase, "observed");
  assert.equal(f.coordinator.busy, false);
});

test("reentrant preview change during notification prevents dispatch", async () => {
  let f;
  f = setup({ onChange(status) {
    if (status.phase === "pending") f.coordinator.updateContext({ hass: f.hass, entity: ENTITY, preview: true });
  } });
  assert.equal((await f.request()).phase, "failed");
  assert.equal(f.calls.length, 0);
});

test("capability is rechecked immediately before dispatch", async () => {
  const f = setup();
  let checks = 0;
  const outcome = await f.request({ validate() { return { allowed: ++checks === 1, reason: "Readiness changed" }; } });
  assert.equal(outcome.phase, "failed");
  assert.equal(f.calls.length, 0);
});

test("reentrant validation cannot dispatch overlapping commands", async () => {
  const f = setup();
  const attempts = [];
  const pending = f.request({ validate() {
    attempts.push(f.request({ values: { temperature: 25 } }));
    return { allowed: true };
  } });
  assert.equal(f.calls.length, 1);
  assert.equal(f.calls[0].payload.temperature, 21);
  for (const attempt of attempts) assert.equal((await attempt).phase, "failed");
  f.transport.resolve();
  await tick();
  f.coordinator.observe(state(21, 1));
  assert.equal((await pending).phase, "observed");
});

test("the original call function is used even if presentation replaces the live function", async () => {
  let f;
  f = setup({ onChange(status) {
    if (status.phase === "pending") f.hass.callService = () => { throw Error("replacement must not dispatch"); };
  } });
  const pending = f.request();
  assert.equal(f.calls.length, 1);
  f.transport.resolve();
  await tick();
  f.coordinator.observe(state(21, 1));
  assert.equal((await pending).phase, "observed");
});

test("validation exceptions and asynchronous permission do not grant control", async () => {
  for (const validate of [
    () => { throw Error("bad model"); },
    async () => ({ allowed: true }),
    async () => { throw Error("asynchronous validator failed"); },
  ]) {
    const f = setup();
    assert.equal((await f.request({ validate })).phase, "failed");
    assert.equal(f.calls.length, 0);
  }
});

test("in-place connection mutation before service settlement retires tracking", async () => {
  const f = setup();
  const pending = f.request();
  f.hass.connection.socket = {};
  f.transport.resolve();
  assert.equal((await pending).phase, "uncertain");
  assert.equal(f.calls.length, 1);
});

test("a synchronous service throw fails without replay or leaving the busy gate locked", async () => {
  const f = setup();
  f.hass.callService = () => { throw Error("synthetic transport error"); };
  const outcome = await f.request();
  assert.equal(outcome.phase, "failed");
  assert.match(outcome.message, /effect is unknown/);
  assert.equal(f.coordinator.busy, false);
  assert.equal(f.callbacks.size, 0);
});

test("cancel and dispose retire tracking without claiming remote cancellation", async () => {
  for (const action of ["cancel", "dispose"]) {
    const f = setup();
    const pending = f.request();
    f.coordinator[action]();
    assert.equal((await pending).phase, "uncertain");
    const before = f.coordinator.status;
    f.transport.resolve();
    await tick();
    f.coordinator.observe(state(21, 1));
    assert.equal(f.coordinator.status, before);
    assert.equal(f.calls.length, 1);
    assert.equal(f.callbacks.size, 0);
    if (action === "dispose") {
      assert.equal((await f.request()).phase, "failed");
      assert.equal(f.coordinator.busy, false);
    }
  }
});

test("complete ranges and provider-exposed Frost are dispatched without reinterpretation", async () => {
  const cases = [
    { service: "set_temperature", values: { target_temp_low: 18, target_temp_high: 23 }, attributes: { target_temp_low: 18, target_temp_high: 23 } },
    { service: "set_preset_mode", values: { preset_mode: "frost" }, attributes: { preset_mode: "frost" } },
    { service: "set_fan_mode", values: { fan_mode: "auto" }, attributes: { fan_mode: "auto" } },
    { service: "set_swing_mode", values: { swing_mode: "on" }, attributes: { swing_mode: "on" } },
    { service: "set_swing_horizontal_mode", values: { swing_horizontal_mode: "auto" }, attributes: { swing_horizontal_mode: "auto" } },
  ];
  for (const item of cases) {
    const f = setup();
    const pending = f.request(item);
    f.transport.resolve();
    await tick();
    f.coordinator.observe(state(19, 1, { attributes: item.attributes }));
    assert.equal((await pending).phase, "observed");
    assert.deepEqual(f.calls[0].payload, { ...item.values, entity_id: ENTITY });
  }
});

test("HVAC mode observation reads state, not a coincidental attribute", async () => {
  const f = setup();
  const pending = f.request({ service: "set_hvac_mode", values: { hvac_mode: "off" } });
  f.transport.resolve();
  await tick();
  f.coordinator.observe(state(19, 1, { attributes: { hvac_mode: "off" } }));
  assert.equal(f.coordinator.status.phase, "accepted");
  f.coordinator.observe(state(19, 2, { state: "off" }));
  assert.equal((await pending).phase, "observed");
});
