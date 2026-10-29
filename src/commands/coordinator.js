// SPDX-License-Identifier: GPL-3.0-only
import { readLockFacts } from '../providers/lock-control.js';

const CHOICE_FIELDS = Object.freeze({
  set_hvac_mode: "hvac_mode",
  set_preset_mode: "preset_mode",
  set_fan_mode: "fan_mode",
  set_swing_mode: "swing_mode",
  set_swing_horizontal_mode: "swing_horizontal_mode",
});
const HVAC_MODES = new Set(["off", "heat", "cool", "heat_cool", "auto", "dry", "fan_only"]);
const ENTITY = /^climate\.[a-z0-9_]+$/;

function copyValues(service, values) {
  if (!values || typeof values !== "object" || Array.isArray(values)) throw Error("Invalid command values.");
  const prototype = Object.getPrototypeOf(values);
  if (prototype !== Object.prototype && prototype !== null) throw Error("Invalid command values.");
  const descriptors = Object.getOwnPropertyDescriptors(values);
  const keys = Reflect.ownKeys(descriptors);
  if (keys.some(key => typeof key !== "string" || !Object.hasOwn(descriptors[key], "value"))) {
    throw Error("Command values must be plain data.");
  }
  const result = Object.fromEntries(keys.map(key => [key, descriptors[key].value]));
  if (service === "set_temperature") {
    const single = keys.length === 1 && keys[0] === "temperature";
    const ranged = keys.length === 2 && keys.includes("target_temp_low") && keys.includes("target_temp_high");
    if (!single && !ranged) throw Error("Choose a single target or a complete target range.");
    if (keys.some(key => typeof result[key] !== "number" || !Number.isFinite(result[key]))) {
      throw Error("Target temperatures must be finite numbers.");
    }
    if (ranged && result.target_temp_low > result.target_temp_high) throw Error("Lower target exceeds upper target.");
  } else {
    const field = CHOICE_FIELDS[service];
    if (!field || keys.length !== 1 || keys[0] !== field) throw Error("Unsupported command fields.");
    const value = result[field];
    if (typeof value !== "string" || !value.trim() || value.length > 128 || /[\u0000-\u001f\u007f]/.test(value)) {
      throw Error("Choose a supported non-empty value.");
    }
    if (field === "hvac_mode" && !HVAC_MODES.has(value)) throw Error("Unsupported HVAC mode.");
  }
  return Object.freeze(result);
}

function context({ hass, entity, preview, contextKey, model }) {
  return {
    hass,
    entity,
    preview: preview !== false,
    contextKey,
    connected: hass?.connected === true,
    user: hass?.user?.id,
    admin: hass?.user?.is_admin === true,
    connection: hass?.connection,
    socket: hass?.connection?.socket,
    ready: model?.ready !== false,
    lockReady: model?.lockReady === true,
  };
}

function usable(value, kind = 'climate') {
  return value.connected && !value.preview && (kind === 'lock' ? value.lockReady && value.admin : value.ready)
    && typeof value.user === "string" && value.user.length > 0
    && value.connection !== null && typeof value.connection === "object";
}

function sameContext(a, b, kind = 'climate') {
  return usable(a, kind) && usable(b, kind)
    && a.entity === b.entity && a.user === b.user
    && a.connection === b.connection && a.socket === b.socket
    && a.contextKey === b.contextKey;
}

function serviceAvailable(hass, service, domain = 'climate') {
  return typeof hass?.callService === "function" && Object.hasOwn(hass?.services?.[domain] ?? {}, service);
}

function lockSettings(facts) {
  return JSON.stringify([facts.configured, facts.codeRequired, facts.lockUsers, facts.lockAutomations, facts.autoRelockSec]);
}

function timestamp(state) {
  const raw = state?.last_updated ?? state?.last_changed;
  if (typeof raw !== "string") return null;
  const value = Date.parse(raw);
  return Number.isFinite(value) ? value : null;
}

function matches(state, service, values, kind) {
  if (!state || ["unknown", "unavailable"].includes(state.state)) return false;
  if (kind === 'lock') {
    const facts = readLockFacts(state);
    return facts.available && facts.ready && facts.configured && facts.known && facts.locked === values.locked;
  }
  return Object.entries(values).every(([key, value]) => {
    const observed = service === "set_hvac_mode" ? state.state : state.attributes?.[key];
    return typeof value === "number"
      ? typeof observed === "number" && Number.isFinite(observed) && Math.abs(observed - value) < 1e-6
      : observed === value;
  });
}

function makeStatus(phase, message, job) {
  return Object.freeze({
    phase,
    message,
    ...(job ? { target: job.context.entity, service: job.service, values: job.values,
      ...(job.kind === 'lock' ? { domain: job.domain } : {}) } : {}),
  });
}

/** Explicit climate/VT lock requests only; observing or changing context never dispatches. */
export class CommandCoordinator {
  constructor({
    onChange = () => {}, timeoutMs = 10000,
    setTimer = (callback, delay) => globalThis.setTimeout(callback, delay),
    clearTimer = id => globalThis.clearTimeout(id),
  } = {}) {
    if (!Number.isFinite(timeoutMs) || timeoutMs <= 0 || timeoutMs > 60000) throw RangeError("Invalid request timeout.");
    if (typeof setTimer !== "function" || typeof clearTimer !== "function") throw TypeError("Invalid timer functions.");
    this._onChange = typeof onChange === "function" ? onChange : () => {};
    this._timeoutMs = timeoutMs;
    this._setTimer = setTimer;
    this._clearTimer = clearTimer;
    this._context = null;
    this._job = null;
    this._flight = null;
    this._disposed = false;
    this._status = makeStatus("idle", "");
  }

  get status() { return this._status; }

  // An uncertain transport can still be in flight. Do not overlap another call.
  get busy() { return !this._disposed && (this._job !== null || this._flight !== null); }

  _notify(status = this._status) {
    if (this._disposed) return;
    try { this._onChange(status); } catch { /* Presentation failures cannot replay or corrupt a request. */ }
  }

  _publish(phase, message, job) {
    const status = makeStatus(phase, message, job);
    this._status = status;
    this._notify(status);
    return status;
  }

  _clearJobTimer(job) {
    if (job.timer === null) return;
    try { this._clearTimer(job.timer); } catch { /* Retired callbacks are harmless. */ }
    job.timer = null;
  }

  _finish(job, phase, message) {
    if (this._job !== job || job.finished) return;
    job.finished = true;
    this._clearJobTimer(job);
    this._job = null;
    const status = makeStatus(phase, message, job);
    this._status = status;
    job.resolve(status);
    this._notify(status);
  }

  _retire(job, reason) {
    this._finish(job, job.dispatched ? "uncertain" : "failed", job.dispatched
      ? `${reason} The request will not be repeated.`
      : "The request was cancelled before it was sent.");
  }

  _contextStillMatches(job) {
    const same = this._context && sameContext(job.context, this._context, job.kind)
      && sameContext(job.context, context({
        hass: job.context.hass,
        entity: job.context.entity,
        preview: false,
        contextKey: job.context.contextKey,
        model: { ready: job.context.ready, lockReady: job.context.lockReady },
      }), job.kind);
    if (!same || job.kind !== 'lock') return same;
    const state = this._context.hass?.states?.[job.context.entity];
    const facts = readLockFacts(state);
    return state?.entity_id === job.context.entity && facts.available && facts.ready
      && facts.configured && facts.known && lockSettings(facts) === job.lockSettings;
  }

  _validation(job) {
    if (!this._contextStillMatches(job)) return { allowed: false, reason: "Control context changed." };
    if (!serviceAvailable(this._context.hass, job.service, job.domain)) return { allowed: false, reason: "The selected service is unavailable." };
    if (job.kind === 'lock' && !job.dispatched
        && readLockFacts(this._context.hass?.states?.[job.context.entity]).locked !== job.baselineLocked) {
      return { allowed: false, reason: 'The lock state changed. Review the current state before trying again.' };
    }
    try {
      const result = job.validate({ entity: job.context.entity, service: job.service, values: job.values });
      if (result && typeof result.then === "function") {
        // An unsupported asynchronous validator must not leave an unhandled rejection.
        Promise.resolve(result).catch(() => {});
        return { allowed: false, reason: "A synchronous capability check is required." };
      }
      if (result?.allowed === true) return { allowed: true };
      // Lock validation can only publish fixed text: no raw input or provider error may escape.
      const reason = job.kind !== 'lock' && typeof result?.reason === "string"
        ? result.reason.replace(/[\u0000-\u001f\u007f]/g, " ").trim().slice(0, 240)
        : "";
      return { allowed: false, reason: reason || "Controls are not available." };
    } catch {
      return { allowed: false, reason: "Control validation could not complete." };
    }
  }

  updateContext({ hass, entity, preview, contextKey, model } = {}) {
    if (this._disposed) return this.status;
    this._context = context({ hass, entity, preview, contextKey, model });
    if (this._job && !this._contextStillMatches(this._job)) {
      this._retire(this._job, "Control context changed; the outcome is uncertain.");
    }
    return this.status;
  }

  request({ hass, entity, service, values, preview, validate, contextKey } = {}) {
    if (this._disposed) return Promise.resolve(makeStatus("failed", "This card is no longer active."));
    if (this.busy) return Promise.resolve(makeStatus("failed", "A previous request is still unresolved."));
    const reject = message => Promise.resolve(this._publish("failed", message));
    if (preview !== false) return reject("Controls are disabled during setup and preview.");
    if (typeof entity !== "string" || !ENTITY.test(entity)) return reject("Select a climate entity before controlling it.");
    if (service !== "set_temperature" && !Object.hasOwn(CHOICE_FIELDS, service)) return reject("Unsupported climate service.");
    if (typeof validate !== "function") return reject("A current capability check is required.");

    let copied;
    try { copied = copyValues(service, values); } catch (error) { return reject(error.message); }
    const prepared = this._prepareRequest({ hass, entity, service, values: copied, preview, validate, contextKey, kind: 'climate', domain: 'climate' });
    if (prepared.job) this._dispatch(prepared.job, { ...copied, entity_id: prepared.job.context.entity });
    return prepared.result;
  }

  requestLock({ hass, entity, locked, code, preview, validate, contextKey } = {}) {
    // This method creates no retained callbacks. The credential is used only for the immediate call.
    try {
      if (this._disposed) return Promise.resolve(makeStatus('failed', 'This card is no longer active.'));
      if (this.busy) return Promise.resolve(makeStatus('failed', 'A previous request is still unresolved.'));
      if (preview !== false) return this._rejectRequest('Controls are disabled during setup and preview.');
      if (typeof entity !== 'string' || !ENTITY.test(entity)) return this._rejectRequest('Select a climate entity before controlling it.');
      if (typeof locked !== 'boolean') return this._rejectRequest('Choose an explicit lock state.');
      if (typeof validate !== 'function') return this._rejectRequest('A current capability check is required.');
      const facts = readLockFacts(hass?.states?.[entity]);
      if (!facts.available || !facts.ready || !facts.configured || !facts.known) {
        return this._rejectRequest('Versatile Thermostat lock details are unavailable.');
      }
      if (facts.locked !== locked && facts.codeRequired && (typeof code !== 'string' || code.length === 0)) {
        return this._rejectRequest('Enter the configured lock code.');
      }
      const prepared = this._prepareRequest({
        hass, entity, service: locked ? 'lock' : 'unlock', values: Object.freeze({ locked }),
        preview, validate, contextKey, kind: 'lock', domain: 'versatile_thermostat', facts,
      });
      if (prepared.job) this._dispatch(prepared.job, facts.codeRequired
        ? { code, entity_id: prepared.job.context.entity } : { entity_id: prepared.job.context.entity });
      return prepared.result;
    } finally {
      code = undefined;
    }
  }

  _rejectRequest(message) { return Promise.resolve(this._publish('failed', message)); }

  _prepareRequest({ hass, entity, service, values, preview, validate, contextKey, kind, domain, facts }) {
    const reject = message => ({ result: this._rejectRequest(message) });
    const captured = context({
      hass, entity, preview,
      contextKey: contextKey === undefined ? this._context?.contextKey : contextKey,
      model: kind === 'lock' ? { lockReady: this._context?.lockReady } : undefined,
    });
    if (!usable(captured, kind)) return reject(kind === 'lock'
      ? 'An eligible administrator lock-control context is required.' : 'An active authenticated Home Assistant connection is required.');
    if (!this._context) this._context = captured;
    if (!sameContext(captured, this._context, kind)) return reject("The selected control context has changed.");
    if (!serviceAvailable(hass, service, domain)) return reject("The selected service is unavailable.");

    const baseline = hass.states?.[entity];
    const job = {
      context: captured, service, values, validate, kind, domain,
      ...(kind === 'lock' ? { lockSettings: lockSettings(facts), baselineLocked: facts.locked } : {}),
      call: hass.callService.bind(hass), baseline,
      lastObservation: baseline, lastTimestamp: timestamp(baseline),
      accepted: false, observedMatch: false, dispatched: false,
      timer: null, finished: false, resolve: null,
    };
    const result = new Promise(resolve => { job.resolve = resolve; });
    // Reserve the gate before calling user-supplied validation to prevent reentrant writes.
    this._job = job;
    const initial = this._validation(job);
    if (this._job !== job) return { result };
    if (!initial.allowed) {
      this._finish(job, "failed", initial.reason);
      return { result };
    }
    if (kind === 'lock' && facts.locked === values.locked) {
      if (!this._contextStillMatches(job) || readLockFacts(this._context.hass?.states?.[entity]).locked !== values.locked) {
        this._finish(job, 'failed', 'The lock state changed. Review the current state before trying again.');
      } else {
        this._finish(job, 'observed', 'The requested lock state is already reported. No command was sent.');
      }
      return { result };
    }
    this._publish("pending", "Requesting the selected setting…", job);
    if (this._job !== job) return { result };

    // A presentation callback can change selection or readiness synchronously.
    const current = this._validation(job);
    if (!current.allowed || !this._contextStillMatches(job)) {
      this._finish(job, "failed", current.reason || "Control context changed before dispatch.");
      return { result };
    }
    try {
      job.timer = this._setTimer(() => {
        const message = job.accepted
          ? "Request accepted, but the setting was not observed before timeout. It will not be repeated."
          : job.observedMatch
            ? "A matching setting was observed, but the service response is missing. The request will not be repeated."
            : "The request outcome is uncertain. It will not be repeated.";
        this._finish(job, "uncertain", message);
      }, this._timeoutMs);
    } catch {
      this._finish(job, "failed", "The request could not be tracked safely.");
      return { result };
    }
    if (this._job !== job) return { result };

    return { result, job };
  }

  _dispatch(job, payload) {
    this._flight = job;
    job.dispatched = true;
    try {
      const call = job.call(job.domain, job.service, payload);
      payload = undefined;
      this._trackTransport(job, call);
    } catch {
      this._transportSettled(job, false);
    } finally {
      payload = undefined;
    }
  }

  _trackTransport(job, call) {
    // These callbacks capture public job state, never the service payload or rejection object.
    Promise.resolve(call).then(
      () => this._transportSettled(job, true),
      () => this._transportSettled(job, false),
    );
  }

  _observedMessage(job) {
    return job.kind === 'lock' ? 'Requested lock state observed. Versatile Thermostat owns any automatic relocking.'
      : 'Setting observed. This does not establish physical heating.';
  }

  _transportSettled(job, accepted) {
    if (this._flight === job) this._flight = null;
    if (this._disposed) return;
    if (this._job !== job) {
      // Releasing the local busy gate is not a new outcome for a retired request.
      this._notify();
      return;
    }
    if (!this._contextStillMatches(job)) {
      this._retire(job, "Control context changed; the outcome is uncertain.");
      return;
    }
    if (!accepted) {
      this._finish(job, "failed", "The service call failed; its effect is unknown. Check the current setting.");
      return;
    }
    job.accepted = true;
    if (job.observedMatch) {
      this._finish(job, "observed", this._observedMessage(job));
    } else {
      this._publish("accepted", "Request accepted; waiting for the setting to be observed.", job);
    }
  }

  observe(state) {
    const job = this._job;
    if (this._disposed || !job?.dispatched || state?.entity_id !== job.context.entity) return this.status;
    if (!this._contextStillMatches(job)) {
      this._retire(job, "Control context changed; the outcome is uncertain.");
      return this.status;
    }
    if (state === job.lastObservation) return this.status;
    const nextTimestamp = timestamp(state);
    if (job.lastTimestamp !== null && (nextTimestamp === null || nextTimestamp <= job.lastTimestamp)) return this.status;
    job.lastObservation = state;
    if (nextTimestamp !== null) job.lastTimestamp = nextTimestamp;
    job.observedMatch = matches(state, job.service, job.values, job.kind);
    if (job.accepted && job.observedMatch) {
      this._finish(job, "observed", this._observedMessage(job));
    } else if (!job.accepted) {
      this._publish("pending", job.observedMatch
        ? "A matching setting was observed; waiting for the service response."
        : "Requesting the selected setting…", job);
    }
    return this.status;
  }

  cancel(reason = "Tracking stopped; the request outcome is uncertain.") {
    if (this._job) this._retire(this._job, reason);
    return this.status;
  }

  dispose() {
    if (this._disposed) return;
    this._disposed = true;
    if (this._job) this._retire(this._job, "The card was detached; the request outcome is uncertain.");
    this._onChange = () => {};
    this._context = null;
  }
}
