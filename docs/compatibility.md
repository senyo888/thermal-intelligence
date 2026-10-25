# Compatibility and validation matrix

Current beta: **0.1.0-beta.1**, HA **2026.10.0**, VT **10.5.1**. [The beta guide](beta.md) identifies the exact artifact and installation/rollback evidence. Earlier development rows below retain their own scope; physical hardware, broad version support and HACS installation are unverified.

Development preview, 25 October 2026. Local model, command, editor and Chromium fixture tests exercise candidate `0.1.0-dev.1`. Dedicated Lab checks now cover HA 2026.10.0 Generic Thermostat and VT 10.5.1 through switch, climate, direct-valve and combined climate/valve paths. This is scoped validation with inert outputs, not a support guarantee or minimum-version claim.

## Target matrix

| Target | Initial intent | Evidence required |
| --- | --- | --- |
| HA Generic Thermostat | First-release validated target | Exact HA version, heat/cool modes actually exposed, units/step/range, available presets including Frost when exposed, empty and degraded fixtures |
| Versatile Thermostat | First-release validated target | Exact provider and HA versions, registry/config identity, readiness contract, enabled feature telemetry, gated command tests |
| Other standard climate integrations | Provisional | Named integration/version and equivalent capability/command checks before a support claim |
| TI optional backend | Later stage | Versioned semantics, portable setup, startup/restart/persistence/ownership/failure tests |
| Optional HI telemetry | Later explicit adapter | Exact schema/version/source and display-only behavior; no dependency for ordinary TI use |

Select the minimum HA and HACS versions from API availability and actual testing. Test the supported minimum, current target and relevant upgrade boundary; keep untested combinations visibly untested. Do not invent a compatibility floor from current docs. Track browser/OS/Companion versions separately from viewport dimensions.

## Behavior acceptance

| Area | Required scenarios | Pass evidence |
| --- | --- | --- |
| Clean onboarding | No TI helpers; with/without climate entity; install/module/picker/editor/preview/save/reopen | Correct starting/setup state; every first-release option visual; zero service calls throughout |
| Config preservation | Defaults, optional and advanced keys, unknown future keys, YAML/editor changes, two instances | Intentional keys change only; independent cards; explicit migrations |
| Capability model | Missing features, unsupported modes, range/fan/swing, long provider labels | Unsupported controls absent/disabled with correct explanation; no fabricated values |
| Numeric handling | °C/°F, min/max/step, invalid/missing/unit-mismatched values, range limits | Correct formatting and bounded intentional commands without silent coercion |
| Presets and ownership | Frost/Eco/Comfort/Boost/provider names; `none`; matching temperatures; manual schedules, hold/override | Preset/ownership distinction retained; source-backed status or unknown |
| Optional telemetry | Independent humidity/trend/energy/valve/presence/window/power/safety/regulation cases | Unsupported vs disabled vs expected-unavailable vs stale distinguishable; unrelated UI stays usable |
| VT readiness | Ready, initialising, unavailable, stale/unknown readiness, explicit and detected identity | No permissive standard fallback or unready write; configured expected telemetry remains honest |
| Command races | Rapid edits, multiple cards, entity/provider change while pending, concurrent backend update | Request retains original target; stale completion cannot overwrite new context; no hidden corrective writer |
| Network lifecycle | Disconnect before/during/after dispatch, timeout, reconnect, reload | No replay; uncertainty visible; fresh observation distinguished from acknowledgement |
| Activity | Demand, reported heating, valve closed/open/percentage, unknown | “Heat requested”, integration report and “TRV Open/Closed” preserve evidence level |
| Layout/accessibility | Narrow phone, tablet, desktop, long labels, zoom, keyboard/focus, contrast, reduced motion | No clipping/hidden critical controls; understandable status without colour/motion alone |
| Real device interaction | Actual touch phone/iPad and relevant Companion app | Separate recorded device evidence; browser fixture pass is not a substitute |
| Distribution | HACS custom install/update/uninstall, manual resource path, duplicate/cache/module collision | Intended exact bytes load; clear recovery; no extra website/private payload |
| Migration/rollback | Saved config upgrade, supported predecessor rollback, version skew | Documented reversible path and known limitations; no universal lossless downgrade claim |
| Privacy/rights | Bundle, maps, fixtures, screenshots, dependencies and notices | No private sources/defaults or secret leakage; release rights inventory complete |

## Evidence record

For each run record source revision and clean/dirty identity, artifact SHA-256, library version, HA/HACS/provider versions, fixture/profile version, environment identity, browser/OS/Companion, time and result. Record source-only inspection, unit tests, browser simulation, live HA observation and physical-device evidence distinctly.

Synthetic fixtures must cover independent unknown/unavailable/stale transitions and source timestamps, not only happy-path snapshots. Test assertions should validate meaningful contracts and regressions, not repeat implementation expressions. Keep raw private evidence local; publish redacted conclusions with reproducible fixture tests.

## Later backend gates

Require restart and reconnect persistence for schedules, manual schedules, holds and Boost; safe startup before provider readiness; explicit writer arbitration; cutoff hysteresis/failure/recovery; provider disconnect and ambiguous command outcomes; no writes while VT is unready. Establish exact-package rollback custody and a quiescent test fixture before active cases. Lab availability alone is not a passed test.
