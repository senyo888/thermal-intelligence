# Thermal Intelligence architecture contract

Status: architecture contract with a local standalone frontend implementation. The optional backend and later cards remain planned.

## Ownership and layers

```text
Home Assistant state + entity registry + explicit card configuration
                           │
             Provider adapters (standard / VT / future TI)
                           │
       Capability + evidence model (pure, attributable, versioned)
                           │
           Presentation + visual editor + accessible interaction
                           │ explicit user action only
                Validated command dispatcher
                           │
            Home Assistant supported service + explicit target
```

The frontend presents provider truth and dispatches explicit actions. It does not schedule, independently enforce house policy, reconstruct a controller's selected mode, or become a second autonomous writer. Removing the card cannot disable a backend. Later backend contracts must define their own deterministic decision, ownership, persistence and failure behavior.

## Evidence model

Keep HVAC mode, preset, control ownership and activity as separate fields. Each optional datum needs a source and status; where relevant also units, timestamp/freshness, provider/schema version and whether it is measured, estimated or reported. Do not use arbitrary freshness timeouts to make stable values appear stale: establish provider-appropriate freshness semantics.

Distinguish unsupported, disabled/unconfigured, expected-but-unavailable, unknown, stale, invalid and available. Missing humidity must not disable valid temperature control. Missing readiness for a known readiness-gated provider must disable dependent writes. Unknown readiness must not trigger fallback to a less restrictive adapter.

Standard adapters derive capabilities from verified HA state, supported features, modes and services. Provider selection uses registry identity or explicit configuration. Do not recognise VT by entity name, infer manual ownership from preset `none`, or infer Comfort from a target temperature. Preserve manual schedules and provider-specific Frost mapping.

Activity can include demand, service dispatch, integration-reported `hvac_action` and physical-device observation as separate evidence. An observed valve opening does not prove heat transfer; successful dispatch and state convergence do not prove physical response or causal confirmation.

## Command contract

1. Capture the explicit target entity/provider/action and values at user intent.
2. Validate capability, range, units, step, readiness, connection and applicable provider restrictions.
3. Dispatch only a supported service to that captured target. A subsequent entity selection cannot retarget an in-flight request.
4. Track dispatch result separately from observed state. Bound pending state and expose uncertainty/timeouts honestly.
5. Reconcile fresh provider evidence without replaying requests on reconnect, render, resource reload or editor reopening.

Define coalescing/cancellation behavior for rapid inputs and stale completions. UI pending state does not lock out an authoritative backend writer. Concurrent changes need visible reconciliation, not repeated corrective commands. Configuration saves affect card configuration only; no incidental heating call.

## Configuration and editor

Use a versioned, validated card configuration with documented migrations. All declared first-release options must be available visually, including optional telemetry/provider details where retained. Preserve unknown/advanced fields during edits. Scope settings to a card instance unless the user explicitly selects a broader operation.

Separate a no-entity setup state from operational validation. Stub generation, editor construction and preview have no device side effects. Escape dynamic text at DOM sinks. No unsafe HTML from entities, provider reason text or imported config. The beta registers only `thermal-intelligence-beta-card` and its editor, preserving legacy registrations. Guard duplicate resource loading without masking incompatible versions; see [migration](docs/migration.md).

## Optional Humidity Intelligence interoperability

HI remains the authority for its seasonal humidity targets, Stability, selected lanes and reasons. TI may display an explicit supported HI contract with attribution; it must not reconstruct those semantics, add HI commands, or require HI installation. Local TI humidity colours are presentation preferences with separate labels.

## Proposed repository layout

| Path | Responsibility |
| --- | --- |
| `README.md`, `ARCHITECTURE.md`, `AGENTS.md` | Product entry point and contributor contracts |
| `docs/` | Decisions, support, compatibility, migration, distribution and release evidence |
| `src/cards/`, `src/editor/`, `src/providers/`, `src/model/`, `src/commands/` | Frontend code with distinct responsibilities |
| `tests/fixtures/`, `tests/unit/`, `tests/browser/` | Synthetic provider contracts, behavior and onboarding tests |
| `dist/thermal-intelligence.js` | Reproducible installable module, with verified required companions only |
| `site/` | Responsive discovery website; no private operational records |
| `assets/` | Selected brand masters/exports, illustrations, public-safe screenshots and provenance |
| `ui-gallery/` | Canonical portable examples with dependency/version notes and previews |
| `.github/` | Issue forms, PR template, ownership and validated CI/release workflows |

The standalone frontend, visual editor and test harness are implemented. The optional backend, website and later cards remain planned; do not add a backend stub merely to fill the proposed tree. HACS packaging has its own [distribution contract](docs/distribution.md).
