# Standalone climate command lifecycle

The [published RC.3](rc-3.md) preserves RC.2 configuration and control boundaries while correcting request ordering, configuration editing and presentation. RC.2 acceptance remains dated evidence for RC.2; see the [RC.3 validation limits](rc-3.md#validation-limits) for the current release.

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

From a clean checkout of released RC.3 commit `f93fb6489f87fbf9c393dd8cd03e85e5718277ef`, run `node --test tests/unit/commands.test.mjs`. Fixtures cover both acknowledgement/observation orders, late rejection, external changes, stale state, preview, context replacement, disconnected/authentication/service gaps, payload mutation, unsupported writes, rapid attempts, timeout, cancellation, disposal and rendering exceptions. Live Generic Thermostat/VT evidence remains a separate gate.

## Administrator VT lock requests

Beta.2 adds a closed lock-request entry to the existing command coordinator. It permits only native `versatile_thermostat.lock` or `versatile_thermostat.unlock` for one captured climate entity and shares the same busy gate as climate commands. Ordinary climate readiness remains unchanged; lock eligibility is checked separately so an authorised unlock can be requested while user climate controls remain locked.

A lock request requires a confirmed administrator, a live authenticated session, an attached non-preview card, verified VT registry identity, provider availability and literal readiness, a configured lock, boolean lock/code and user/automation scope capabilities, a known nonnegative relock delay, at least one enabled scope, and both native lock/unlock services. This conservative lock gate keeps capabilities well-defined across the requested transition; it still sends only the single intended service. The dialog captures its entity, session, relevant capabilities and desired state. Changes before dispatch invalidate that intention rather than reversing it or retargeting it. A request for an already-observed desired state sends nothing.

Public request status contains the desired boolean lock state, never the entered code. Code text is transient input for the dispatch only; validation/status messages and rejected-service handling do not retain or display raw exceptions. UI restrictions do not create backend authorization or fix upstream logging. [Code-handling limits](lock-control.md#code-handling-and-provider-limits) remain explicit.

Service acknowledgement and a fresh matching provider observation are both required to report an observed result. Stale observations, reconnect, context changes, timeout and later automatic relocking must not manufacture success or retry. The latest provider state remains authoritative. Rendering, opening/dismissing a dialog, setup, preview, editor saves and reconnect never dispatch commands.

## Optional mapped-switch requests (beta.6)

`requestMapped()` is a closed third entry point in the same coordinator, with `entity` for the climate anchor, `target` for the registered switch, and boolean `on`. It never widens `request()` or `requestLock()`. Only `switch.turn_on`/`switch.turn_off` and a scalar `entity_id` payload are constructed. All three request kinds share the unresolved-transport gate. Current-session proof and explicit schema-2 enrollment are required by the card. No administrator-only rule is added; HA enforces backend permissions.

Confirmation captures both identities, direction, meaningful switch state, session, configuration revision and eligibility. Known identity/registry/configuration changes invalidate it. Harmless telemetry refreshes do not. Expected switch and integration-induced climate transitions after dispatch do not invalidate themselves; identity/eligibility loss retires tracking as uncertain. Labels and backend rejection objects cannot create payloads or raw error messages.

This path requires acknowledgement plus a valid mapped `last_updated` baseline immediately before dispatch and a strictly later matching mapped update. It never substitutes `last_changed`, a climate timestamp or zero for a missing baseline. Newer contrary states replace a match while awaiting acknowledgement. A valid same-state request is an explicit no-op. Missing evidence, timeout and disconnect remain unconfirmed/uncertain; no retry, compensation or mode restoration occurs. Existing climate and lock observation semantics are unchanged. See [configuration, integration effects and rollback](optional-switch-control.md).

## Completed-result presentation

The stored terminal result describes one captured request. Successful actions do not leave a visible banner under the card. Press feedback, selected controls and pending target captions remain distinct from the provider's reported state. The full request status is available in the thermostat overview and one accessible live region.

Failed or uncertain requests, cancelled drafts and current availability problems can show a brief notice below the card. It disappears after ten seconds without clearing the underlying issue. Routine state updates do not extend that window; a new request failure receives its own window, even when the wording is unchanged. Each card owns its notice timer. Expiry does not interrupt a draft, move focus, release an unresolved transport, change command evidence or send another request.

Failed and uncertain request outcomes retain an amber LED and an explanation in the overview after the notice disappears. Disconnection or an unavailable thermostat retains red precedence. A later successful request can replace the earlier request outcome; dismissing a notice cannot claim recovery.

Selecting another thermostat clears the previous thermostat’s request warning from the card. If a service call is still pending, controls stay disabled until it settles. The overview explains that the card is waiting for an earlier request. Switching thermostats sends no request.

Successful detail presentation is removed after a selected-entity, configuration, session, readiness or preview change, detachment, or a contrary provider report. Returning to the previous context does not revive it. Current degradation takes precedence on the card and general dialogs.

Retiring successful presentation notifies consumers with the current presentation status while preserving the stored result. Newer matching reports advance its ordering timestamp; delayed older contradictions cannot remove it. Equal-time contradictions or unknown/unavailable observations still retire successful presentation. Mapped switch no-op results use the same timestamp precision as later reports.

## Display-only icon configuration

The RC.4 top-row chooser changes a local display draft. Runtime selection, ordering, Add reading and Copy configuration do not read or write Lovelace storage or dispatch thermostat services. Copying exports the complete draft, including preserved unknown fields; it does not claim a save. Clipboard failure exposes selected text for manual copying, and late callbacks cannot affect another dialog or reselected card.

The same chooser in Home Assistant’s card editor emits the ordinary `config-changed` event. Home Assistant owns that editor’s selected card and Save/Cancel operation. Runtime configuration equality is not treated as proof of a saved card’s identity: stale or generated copies can match unrelated saved cards. No runtime dashboard writer is shipped.

## Control-source display and native feature navigation

Optional ownership, House-preset and schedule mappings are observations only. They never add ownership services or trigger scheduling. A hand marked Manual input uses the existing acknowledged-and-observed temperature-request result; it does not infer ownership from `none` or a target match. A contrary mode/preset also retires that local indication permanently.

Before recording the manual-action indication, the card checks that every current target still matches the captured request. Conflicting reports with an equal timestamp cannot attach that indication to a contrary target. This presentation check does not send a correction or change the stored request result.

Opening VT auto start/stop controls verifies a fresh registry target and opens native Home Assistant more-info after explicit intent. It does not widen the coordinator's service allowlist or mapped-switch eligibility. Readiness/preview/session guards apply before navigation; subsequent actions inside the native dialog belong to Home Assistant.
