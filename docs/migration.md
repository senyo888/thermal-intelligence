# Configuration, upgrade and rollback design

The beta uses schema 1 and a separate card registration for coexistence with existing TI.

- Keep existing `custom:thermal-intelligence-card` instances and their resources unchanged. The standalone beta uses `custom:thermal-intelligence-beta-card` and `thermal-intelligence-beta-card-editor`.
- Separate library version, configuration schema and optional provider schema. Define defaults and migration functions in one owned location.
- Preserve unknown advanced fields through the visual editor. Removing or changing an option requires a documented migration and regression case.
- Installation instructions must distinguish HACS download, JavaScript module resource registration, loaded browser bytes and saved card configuration. Document cache refresh and duplicate-resource resolution without indiscriminate deletion.
- Test update with a saved configuration and reopen it visually. Record what changed and which old provider/library combinations remain supported.
- Preserve the previous known-good bundle, exact resource configuration and saved card config before a test upgrade. Rollback restores those independently where required.
- Do not promise lossless downgrade across schema changes. State known unsupported combinations and export/recovery steps before release.
- Later backend rollback must additionally cover persistent schedules, holds, Boost, helper/schema state and authoritative writer identity. A frontend rollback is not a backend rollback.

## Beta schema 1

Candidate `0.1.0-beta.1` uses configuration `schema_version: 1`; omission selects schema 1. Unsupported explicit versions are rejected. The separate beta identity is deliberate; this is not a drop-in migration of the existing card: existing schedules, ownership helpers, cutoff and recovery controls remain in the existing system. Recreate only the standalone fields through the [visual editor](card-configuration.md); unknown keys survive round trips but do not imply implemented runtime behavior.

The synthetic browser suite covers configuration save/reopen, independent instances, unknown fields and duplicate registration. It has not established HACS upgrades or lossless downgrade. For each installation, retain the existing resource list, dashboard configuration and exact previous bundle; restore those independently if needed. No supported predecessor exists for this new public library yet.

## Source UI configuration correction

The local candidate preserves the existing TI card's visual structure and uses its original `background` setting: `blue` (Midnight Blue, default), `plum` or `black`. The visual editor exposes **Background**, replacing the earlier prototype's **Appearance** selector.

A saved generic-preview `theme: auto`, `theme: light` or `theme: dark` remains preserved as inert legacy data. It no longer controls the source UI. There is no assumed mapping from those values to a TI palette; select a background explicitly. Omitted `background` uses Midnight Blue. Changing this presentation setting sends no thermostat command.

The restored portable source fields are `trend_entity`, `humidity_entity`, `valve_position_entity` and `features`. The three direct mappings accept explicit sensor IDs or empty strings. `features` preserves the original array of `{entity, label?, attribute?, unit?, icon?, preset?}` observations. No helper ID, provider identity, ownership, schedule, preset or backend control is inferred from an entity name.

Preset-temperature features need an explicit `preset` association selected in the visual editor. Source-specific name recognition and target-coincidence activation are not migrated. Use the exact provider preset value and a finite temperature source with a compatible unit; the selected preset indicator appears only when the ready, connected climate reports that exact preset in Heat mode. Previously unassociated feature rows remain observations until intentionally associated. Saved unsupported associations and unknown row fields remain editable; duplicates are reported invalid.

Humidity presentation restores the original four-boundary defaults: `dry_below: 30`, `good_min: 40`, `good_max: 60`, `wet_above: 70`, producing the original five display bands. Omitted configuration uses these source defaults. Existing local-preview `{low, high}` configuration retains its explicit legacy three-band meaning and is labelled as legacy in the editor. No missing boundary is inferred. **Reset humidity guides to source defaults** intentionally replaces known guide fields with the original format while preserving unknown nested fields. Mixed formats are rejected. Both forms are local display guides only, never HI or thermostat control thresholds.

Existing typed `telemetry` rows remain supported and editable. When a direct mapping is absent, the first matching typed row may supply its surface. A direct mapping takes precedence over a different source; a matching typed observation of the same entity state retains its explicit metadata and freshness rule. Invalid or unavailable explicit mappings do not fall back to alternative entities.

Unknown top-level keys and unknown fields inside feature rows, telemetry rows and humidity bands survive editor round trips. Their preservation is not evidence that private features have been implemented. The existing card's backend-dependent ownership, timetable, cutoff and recovery behavior still require their own public contracts; visual preservation does not silently activate those control paths.

Schema version remains `1` for the initial beta. Reopen saved configurations in the visual editor, verify the selected background and all explicit source mappings, then exercise the synthetic preview with an empty setup state, unavailable sources and separate card instances. Configuration changes and reopening must produce zero service writes. Keep the previous candidate bundle and saved configuration if comparing or rolling back local preview work.

## Coexistence and rollback

The beta does not register aliases for the legacy card or its editor. Keep the existing resource loaded and create new beta cards through **Thermal Intelligence Thermostat · Beta** in Add Card. Old configurations are not rewritten automatically.

For an existing standalone development fixture only, duplicate its configuration and change `type` to `custom:thermal-intelligence-beta-card`. Schema 1 and other fields remain unchanged. Do not apply this shortcut to a private backend-dependent card.

For beta updates, retain the previous bundle and resource URL, install verified bytes under a new versioned filename, update only the beta resource, and reload the frontend. Validate the loaded class version and saved configuration. To roll back, restore the prior beta resource URL and reload into a new document; a custom element already registered in an open page cannot be replaced in place.

To roll back the first beta installation, remove only its new test view/cards and its own resource registration after checking they have not changed since preparation. Retain the beta file as a recovery artifact. Existing resources and dashboards remain in place; never restore a whole stale dashboard over newer user changes. A frontend-only change does not require a Core restart.

## beta.1 to beta.2: administrator lock interaction

Saved card configuration and beta card/editor names are unchanged. Beta.2 adds automatic lock-dialog access for verified administrators when the selected VT reports complete lock capabilities. Ordinary accounts remain read-only. The code, if configured, is entered at runtime and is never a card option. Normal user-lock restrictions still apply to temperature, mode and preset controls. See [lock control](lock-control.md) for provider scope and code-handling limits.

Retain the tested beta.1 bundle and its resource URL. To roll back, restore that URL and open a fresh browser document; no dashboard schema migration or Core restart is required. Reverting the frontend does not undo a deliberate provider lock command: check VT's actual reported state and restore it intentionally where required.

## beta.2 to beta.3: canonical response arc

Schema 1, card identity and existing saved mappings are unchanged. Optional `response_arc` fields are additive and preserved with their unknown nested fields by the visual editor. Existing cards keep their comparison fallback until explicit response sources are selected; legacy `overview` or `recovery_entity` keys are not repurposed. The source-dependent orange response is now implemented under the [public evidence contract](provider-contracts.md#temperature-response-evidence).

Retain the beta.2 bytes, resource URL and saved configuration before updating. Beta.2 preserves the new object as unknown configuration but cannot display the corroborated warming state. Restoring the beta.2 resource and opening a fresh document rolls back the frontend; no provider settings or heating state are changed by these display mappings.
