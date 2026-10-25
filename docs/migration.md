# Configuration, upgrade and rollback design

No public configuration schema or migration is released yet. This file records requirements for the first implementation.

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
