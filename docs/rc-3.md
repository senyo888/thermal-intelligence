# Release candidate 0.1.0-rc.3

[RC.3 is published](https://github.com/senyo888/thermal-intelligence/releases/tag/v0.1.0-rc.3) as a prerelease of the standalone thermostat card, dated 14 November 2026. It corrects request tracking, configuration editing and presentation defects found after RC.2. No TI backend or controller is required. The [RC.2 record](rc.md), released assets and dated heating evidence remain separate.

## Changes from RC.2

- Climate and VT lock request tracking retains submillisecond timestamp precision. If a matching report is followed by a newer contrary report before service acknowledgement, the old match cannot produce an **Observed** result. Acknowledgement alone remains **Accepted**; later matching evidence is still required.
- An explicitly blank valve mapping leaves the thermostat's reported activity visible. Missing, unknown, stale or invalid configured valve observations retain their own degraded states; another valve is never selected implicitly.
- A long heading remains within the card beside a read-only lock indicator when header telemetry is empty, including phone, tablet and desktop layouts.
- The general humidity dialog follows its configured humidity source; individual header readings retain their own sources. Resetting humidity guides clears their edited fields while preserving unrelated and unknown configuration.
- Failed provider identity reads can recover through matching cache evidence or at most two later, delayed reads. Session isolation and provider restrictions remain enforced; recovery sends no commands.
- Range drags and repeated keyboard adjustments stop at the selected endpoint's valid step bounds, preserving the draft when it reaches its sibling. Home and End use the same bounds. The unchanged sibling and complete request still pass the existing final validation.
- If clipboard access is denied, the manual humidity copy field follows the current draft, including edits made while clipboard access was pending. Invalid boundaries clear and disable that field until corrected. Draft editing never saves configuration or sends a command.
- Valid measured trend remains visible under user locking or unavailable control readiness. Connection, climate and sensor validity still govern observation availability; command permissions are unchanged.

The synthetic fixture also discards observations from a scenario replaced by reset, and the registry regression completes both pending reads before testing stale-session rejection. These test corrections do not change runtime services.

## Configuration and installation boundary

The card type remains `custom:thermal-intelligence-beta-card`; the editor and supported schema-1/schema-2 configurations are unchanged. Commands still require explicit intent, a captured target and current provider permission/readiness. Rendering, editor cancellation and reconnect do not dispatch or replay commands. No TI backend/controller is required.

For Home Assistant 2026.11 and later, use the [Marketplace route](marketplace.md); earlier installations use [HACS](hacs.md). Select `v0.1.0-rc.3` explicitly and verify the served module against the release manifest. Keep one trial resource, retain the previous module/configuration, and preserve legacy TI separately. Before a manual-to-installer transition, check ownership of `www/community/thermal-intelligence/` and every resource using that prefix. Keep affected dashboard clients closed until the transition is complete. See [migration and recovery](migration.md).

## Exact release

Release `v0.1.0-rc.3` uses source commit `f93fb6489f87fbf9c393dd8cd03e85e5718277ef`, tree `0758e5e9acc724c123a9b2e4ec38018255219ac9`. All three public downloads were verified against the reproducible package on 14 November 2026.

| Asset | Bytes | SHA-256 |
| --- | ---: | --- |
| `thermal-intelligence.js` | 200699 | `750be9cc7acc0f1a6449be0a578c90d73d771372a106e2af9d31d8d5d45a45be` |
| `LICENSE` | 34674 | `fb981668c18a279e285fc4d83fba1e836cc84dd4daa73c9697d3cfd2d8aca6e0` |
| `manifest.json` | 1438 | `99f0023b96ac479e3462666b196854c41210db41a7a15029645880fb6324f283` |

[Download the release assets](https://github.com/senyo888/thermal-intelligence/releases/tag/v0.1.0-rc.3). The manifest identifies the original source; a later documentation or merge commit is not a replacement package.

## Manually managed trial

Use this route only if an installer does not already own the trial resource.

1. Take and verify a fresh backup. Save the card configuration and resource list, and retain the previous module and URL. Confirm that the example directory belongs only to this trial or choose another dedicated directory.
2. Verify the three downloads above. Place the module at `/config/www/thermal-intelligence-trial/thermal-intelligence-rc3-750be9cc7acc.js` with the accompanying `LICENSE`. Retain the manifest with your recovery record.
3. Add `/local/thermal-intelligence-trial/thermal-intelligence-rc3-750be9cc7acc.js` once as a **JavaScript module** resource. For an update, change only the existing trial URL. Keep legacy resources unchanged and do not load a second beta/RC module.
4. Open a fresh browser document and verify the version, selected thermostat, readings, editor open/cancel and passive reconnect before deliberate controls. A frontend resource update does not need a Core restart; if Home Assistant requires one because `www` did not exist at startup, plan it separately.

For a manual update rollback, restore the previous trial URL and matching saved configuration without overwriting newer dashboard edits. For a first-install rollback, remove only the trial cards and registration you added. Retain the files. A frontend rollback does not restore installer metadata or undo device commands.

## Reproduce the release

Use a clean checkout of the released source commit `f93fb6489f87fbf9c393dd8cd03e85e5718277ef`. Do not substitute a merge or main-promotion commit: the manifest records the exact source identity.

```sh
npm ci --no-audit --no-fund
npm test
npm run build
git diff --exit-code -- dist/
npx playwright install --with-deps chromium
npm run test:browser
python3 -B tests/package_test.py
python3 -B tests/marketplace_test.py
python3 -B scripts/check_marketplace.py --commit f93fb6489f87fbf9c393dd8cd03e85e5718277ef
python3 -B scripts/package_beta.py --commit f93fb6489f87fbf9c393dd8cd03e85e5718277ef --marketplace --output /tmp/ti-rc3-candidate
```

The output directory must not exist. Packaging reads committed blobs and emits only `thermal-intelligence.js`, `LICENSE` and `manifest.json`. The manifest binds version, source commit/tree, sizes and SHA-256 hashes. No source maps or third-party runtime downloads are included.

## Validation limits

Regression coverage includes the climate/lock match-then-contrary ordering boundary, disabled direct and typed valve mappings, read-only heading geometry at 390/768/1440 pixels, fixture resets, bounded registry recovery and stale replies, humidity source/reset and manual-copy behavior, range keyboard/drag boundaries and locked trend observations. The corrected candidate passed 171 unit tests, 127 Chromium browser tests, 13 package tests, eight distribution tests and fourteen foundation regressions. These are source and synthetic browser results, not installation acceptance.

An earlier RC.3 build rendered in a bounded passive Lab trial, but independent observation lost freshness during browser work. It was rolled back to RC.2. A later `256e59d` candidate passed its own passive checks; those earlier results do not validate different bytes.

On 13 November, the exact released module above passed fresh passive manual Lab checks on HA 2026.11.0: six inert fixture renders, humidity editing and manual export, clearing a visual valve mapping, browser reconnect, and preservation of existing configuration and files. No thermostat commands or observation gaps were recorded. The independent observation lasted about 10 minutes 43 seconds, exceeding the planned five-minute limit. This is a pass for the completed checks, not full compliance with that timing plan or a soak.

The Lab used a manual candidate overlay while Marketplace retained RC.2. Named-release RC.3 Marketplace installation and wider installer lifecycle testing remain incomplete. Explicitly empty YAML valve sources, range controls, delayed clipboard failures and stale-registry cases retain synthetic or historical coverage. Physical clients, wider providers, backup restore rehearsal and a formal soak remain separate checks. RC.2's heating trial does not establish RC.3 physical acceptance.

Service acknowledgement, provider observation, valve position and physical heating remain distinct evidence. The [release notes](https://github.com/senyo888/thermal-intelligence/releases/tag/v0.1.0-rc.3) preserve the publication-time scope. Documentation inside the immutable tag predates the final Lab result; this current guide records the later evidence without rewriting that history.
