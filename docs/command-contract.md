# Standalone climate command lifecycle

Implemented in `src/commands/coordinator.js`; unit fixtures establish the cases below. This is a frontend request contract, not live Home Assistant/provider compatibility or physical-device validation.

## Explicit action boundary

The card calls `CommandCoordinator.request()` only from a deliberate runtime control interaction. Picker creation, setup, render, editor saves, preview, observation and reconnection never request a command. Each request must explicitly pass `preview: false`; an omitted, unknown or true preview flag fails closed. A known preview context cannot be bypassed with a contradictory request flag.

`CommandCoordinator.request()` accepts only the climate services `set_temperature`, `set_hvac_mode`, `set_preset_mode`, `set_fan_mode`, `set_swing_mode` and `set_swing_horizontal_mode`. The selected service must appear in Home Assistant's current climate service registry. Targets must be explicit climate entity IDs. Payloads contain only the service's own fields; callers cannot inject another `entity_id`, extra mode changes or arbitrary service data.

Temperature payloads are either one finite numeric target or a complete ordered numeric range. Choices are non-empty provider values; HVAC mode is restricted to the validated HA mode vocabulary. The caller's synchronous `validate` function must also return `{allowed: true}` after checking the current provider identity, capabilities, values, bounds/step, readiness and service. It is checked again immediately before dispatch. That callback cannot override preview, identity, connection or payload restrictions.

## Captured identity and no replay

A request captures its entity, authenticated user, connection, socket, configuration context and immutable values, plus the original bound `hass.callService` function. It requires `hass.connected === true`, a user ID and a connection object. A later selected entity cannot retarget that request.

The card updates context whenever HA state, selection, preview or configuration changes. Pass the card configuration object or a monotonic revision as `contextKey`, and the current capability model when available. Loss of readiness, disconnect, user/connection/socket replacement, preview activation or configuration change retires pending tracking as uncertain. No state update or reconnect dispatches/replays a command.

Only one request may be in flight per card. Rapid subsequent attempts are refused rather than queued. The card may retain an unsubmitted local draft, but must require deliberate interaction to submit it later. Concurrent backend changes are observed; they do not trigger corrective writes from the card.

## Status and evidence

| Phase | Meaning |
| --- | --- |
| `idle` | No tracked request. |
| `pending` | The explicit request was sent and its service outcome is not yet known. A matching state alone does not end this phase. |
| `accepted` | The service promise resolved, but a fresh matching setting has not been observed. |
| `observed` | The service promise resolved and a fresh matching setting was observed for the captured entity. This does not prove causation or physical heating. |
| `uncertain` | Tracking ended because of timeout, changed context, cancellation or detachment; the request is not replayed. |
| `failed` | Validation prevented dispatch or the service call failed. A transport error does not establish whether the remote setting changed; check current state. |

Observations require the captured entity ID and a different state snapshot. When the baseline has a valid `last_updated`/`last_changed`, only a later valid timestamp is admitted; older or duplicate states cannot complete a request. Without provider timestamps, a new snapshot can establish observed setting equality, without claiming freshness by elapsed time. Unknown/unavailable states cannot match. A later external change replaces an earlier match while awaiting acknowledgement. Late rejection after a matching observation still yields failure.

The default timeout is ten seconds, bounded to at most sixty seconds by constructor validation. Timeout is uncertainty, not permission to retry. If the original service promise is still unsettled, `busy` remains true even after the status becomes uncertain, preventing overlapping requests. A late service settlement releases that local gate only; it cannot turn a retired outcome into success. Once the gate clears, a new deliberate, freshly validated action may be sent.

`cancel()` stops local tracking; it does not cancel remote work. `dispose()` additionally prevents all future requests and ignores late results. Local timers are cleared. Presentation callback exceptions cannot corrupt the coordinator or cause another write. The busy gate is reserved before invoking caller validation, preventing reentrant requests; asynchronous validators are rejected without leaving unhandled promise rejections.

## Integration API

```js
const commands = new CommandCoordinator({ onChange: render, timeoutMs: 10000 });
commands.updateContext({ hass, entity: config.entity, preview, contextKey: config, model });
commands.observe(hass.states[config.entity]);

// Inside an explicit runtime interaction only:
const result = await commands.request({
  hass,
  entity: config.entity,
  service: "set_temperature",
  values: { temperature: requestedTarget },
  preview,
  validate: () => validateCurrentTarget(requestedTarget),
});
```

`status` is an immutable snapshot containing phase/message and, for tracked requests, target/service/values. `busy` is separate because a timed-out transport may remain unsettled. Context updates and observations are synchronous and perform no I/O. The request promise resolves with its terminal tracked outcome; it does not reject merely because a command fails. A busy attempt returns a failed result without replacing the existing request's status.

Run `node --test tests/unit/commands.test.mjs`. Fixtures cover both acknowledgement/observation orders, late rejection, external changes, stale state, preview, context replacement, disconnected/authentication/service gaps, payload mutation, unsupported writes, rapid attempts, timeout, cancellation, disposal and rendering exceptions. Live Generic Thermostat/VT evidence remains a separate gate.

## Administrator VT lock requests

Beta.2 adds a closed lock-request entry to the existing command coordinator. It permits only native `versatile_thermostat.lock` or `versatile_thermostat.unlock` for one captured climate entity and shares the same busy gate as climate commands. Ordinary climate readiness remains unchanged; lock eligibility is checked separately so an authorised unlock can be requested while user climate controls remain locked.

A lock request requires a confirmed administrator, a live authenticated session, an attached non-preview card, verified VT registry identity, provider availability and literal readiness, a configured lock, boolean lock/code and user/automation scope capabilities, a known nonnegative relock delay, at least one enabled scope, and both native lock/unlock services. This conservative beta gate keeps capabilities well-defined across the requested transition; it still sends only the single intended service. The dialog captures its entity, session, relevant capabilities and desired state. Changes before dispatch invalidate that intention rather than reversing it or retargeting it. A request for an already-observed desired state sends nothing.

Public request status contains the desired boolean lock state, never the entered code. Code text is transient input for the dispatch only; validation/status messages and rejected-service handling do not retain or display raw exceptions. UI restrictions do not create backend authorization or fix upstream logging. [Code-handling limits](lock-control.md#code-handling-and-provider-limits) remain explicit.

Service acknowledgement and a fresh matching provider observation are both required to report an observed result. Stale observations, reconnect, context changes, timeout and later automatic relocking must not manufacture success or retry. The latest provider state remains authoritative. Rendering, opening/dismissing a dialog, setup, preview, editor saves and reconnect never dispatch commands.
