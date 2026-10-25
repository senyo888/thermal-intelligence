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

Publish concrete versioned procedures after the first artifact and schema are chosen.
