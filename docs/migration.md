# Configuration, upgrade and rollback design

No public configuration schema or migration is released yet. This file records the local candidate's configuration changes and requirements before a supported upgrade path can be claimed.

- Preserve `custom:thermal-intelligence-card` unless a reviewed migration explicitly changes it.
- Separate library version, configuration schema and optional provider schema. Define defaults and migration functions in one owned location.
- Preserve unknown advanced fields through the visual editor. Removing or changing an option requires a documented migration and regression case.
- Installation instructions must distinguish HACS download, JavaScript module resource registration, loaded browser bytes and saved card configuration. Document cache refresh and duplicate-resource resolution without indiscriminate deletion.
- Test update with a saved configuration and reopen it visually. Record what changed and which old provider/library combinations remain supported.
- Preserve the previous known-good bundle, exact resource configuration and saved card config before a test upgrade. Rollback restores those independently where required.
- Do not promise lossless downgrade across schema changes. State known unsupported combinations and export/recovery steps before release.
- Later backend rollback must additionally cover persistent schedules, holds, Boost, helper/schema state and authoritative writer identity. A frontend rollback is not a backend rollback.

## Local schema 1 candidate

Candidate `0.1.0-dev.1` uses configuration `schema_version: 1`; omission selects schema 1. Unsupported explicit versions are rejected. The element identity is unchanged, but this is not a drop-in migration of the existing card: existing schedules, ownership helpers, cutoff and recovery controls remain in the existing system. Recreate only the standalone fields through the [visual editor](card-configuration.md); unknown keys survive round trips but do not imply implemented runtime behavior.

The synthetic browser suite covers configuration save/reopen, independent instances, unknown fields and duplicate registration. It has not established HACS upgrades or lossless downgrade. Before an installation, retain the existing resource list, dashboard configuration and exact previous bundle; restore those independently if needed. No supported predecessor exists for this new public library yet.

## Source UI configuration correction

The local candidate preserves the existing TI card's visual structure and uses its original `background` setting: `blue` (Midnight Blue, default), `plum` or `black`. The visual editor exposes **Background**, replacing the earlier prototype's **Appearance** selector.

A saved generic-preview `theme: auto`, `theme: light` or `theme: dark` remains preserved as inert legacy data. It no longer controls the source UI. There is no assumed mapping from those values to a TI palette; select a background explicitly. Omitted `background` uses Midnight Blue. Changing this presentation setting sends no thermostat command.

The restored portable source fields are `trend_entity`, `humidity_entity`, `valve_position_entity` and `features`. The three direct mappings accept explicit sensor IDs or empty strings. `features` preserves the original array of `{entity, label?, attribute?, unit?, icon?, preset?}` observations. No helper ID, provider identity, ownership, schedule, preset or backend control is inferred from an entity name.

Preset-temperature features need an explicit `preset` association selected in the visual editor. Source-specific name recognition and target-coincidence activation are not migrated. Use the exact provider preset value and a finite temperature source with a compatible unit; the selected preset indicator appears only when the ready, connected climate reports that exact preset in Heat mode. Previously unassociated feature rows remain observations until intentionally associated. Saved unsupported associations and unknown row fields remain editable; duplicates are reported invalid.

Humidity presentation restores the original four-boundary defaults: `dry_below: 30`, `good_min: 40`, `good_max: 60`, `wet_above: 70`, producing the original five display bands. Omitted configuration uses these source defaults. Existing local-preview `{low, high}` configuration retains its explicit legacy three-band meaning and is labelled as legacy in the editor. No missing boundary is inferred. **Reset humidity guides to source defaults** intentionally replaces known guide fields with the original format while preserving unknown nested fields. Mixed formats are rejected. Both forms are local display guides only, never HI or thermostat control thresholds.

Existing typed `telemetry` rows remain supported and editable. When a direct mapping is absent, the first matching typed row may supply its surface. A direct mapping takes precedence over a different source; a matching typed observation of the same entity state retains its explicit metadata and freshness rule. Invalid or unavailable explicit mappings do not fall back to alternative entities.

Unknown top-level keys and unknown fields inside feature rows, telemetry rows and humidity bands survive editor round trips. Their preservation is not evidence that private features have been implemented. The existing card's backend-dependent ownership, timetable, cutoff, recovery and corroborated heating-response behavior still require their own public contracts; visual preservation does not silently activate those control paths.

Schema version remains `1` for this unpublished local candidate. Reopen saved configurations in the visual editor, verify the selected background and all explicit source mappings, then exercise the synthetic preview with an empty setup state, unavailable sources and separate card instances. Configuration changes and reopening must produce zero service writes. Keep the previous candidate bundle and saved configuration if comparing or rolling back local preview work.
