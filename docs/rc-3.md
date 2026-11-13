# Release candidate 0.1.0-rc.3

RC.3 is an unpublished candidate for the standalone thermostat card. It corrects request tracking and presentation defects found after RC.2 was released. The [RC.2 package](https://github.com/senyo888/thermal-intelligence/blob/256e59d262ae759469e3d605cc61c1378ee5156b/docs/rc.md), its assets and its dated installation and heating evidence remain unchanged. The corrected candidate passed the bounded manual Lab checks described below; named-release installer acceptance remains separate.

## Changes from RC.2

- Climate and VT lock request tracking retains submillisecond timestamp precision. If a matching report is followed by a newer contrary report before service acknowledgement, the old match cannot produce an **Observed** result. Acknowledgement alone remains **Accepted**; later matching evidence is still required.
- An explicitly blank valve mapping leaves the thermostat's reported activity visible. Missing, unknown, stale or invalid configured valve observations retain their own degraded states; another valve is never selected implicitly.
- A long heading remains within the card beside a read-only lock indicator when header telemetry is empty, including phone, tablet and desktop layouts.
- The general humidity dialog follows its configured humidity source; individual header readings retain their own sources. Resetting humidity guides clears their edited fields while preserving unrelated and unknown configuration.
- Failed provider identity reads can recover through matching cache evidence or at most two later, delayed reads. Session isolation and provider restrictions remain enforced; recovery sends no commands.
- Home and End respect the selected range endpoint's valid step bounds. The unchanged sibling and complete request still pass the existing final validation.
- Valid measured trend remains visible under user locking or unavailable control readiness. Connection, climate and sensor validity still govern observation availability; command permissions are unchanged.

The synthetic fixture also discards observations from a scenario replaced by reset, and the registry regression completes both pending reads before testing stale-session rejection. These test corrections do not change runtime services.

## Configuration and installation boundary

The card type remains `custom:thermal-intelligence-beta-card`; the editor and supported schema-1/schema-2 configurations are unchanged. Commands still require explicit intent, a captured target and current provider permission/readiness. Rendering, editor cancellation and reconnect do not dispatch or replay commands. No TI backend/controller is required.

After a separately approved publication, Home Assistant 2026.11 and later uses the [Marketplace route](https://github.com/senyo888/thermal-intelligence/blob/256e59d262ae759469e3d605cc61c1378ee5156b/docs/marketplace.md); earlier installations use [HACS](https://github.com/senyo888/thermal-intelligence/blob/256e59d262ae759469e3d605cc61c1378ee5156b/docs/hacs.md). For RC.3, select `v0.1.0-rc.3` explicitly once it is published and verify the served module against this release’s manifest. The linked frozen guides use RC.2 installation examples; those version examples are historical and do not override this RC.3 selection. This candidate branch is not a published installer version. Keep one trial resource, retain the previous module/configuration, and preserve legacy TI separately. Reverting a resource only restores the frontend; it cannot undo a device command. See [migration](https://github.com/senyo888/thermal-intelligence/blob/256e59d262ae759469e3d605cc61c1378ee5156b/docs/migration.md).

## Reproduce the candidate

Use a clean checkout of the reviewed candidate commit `256e59d262ae759469e3d605cc61c1378ee5156b`. Do not substitute a merge or main-promotion commit: the manifest records the exact source identity.

```sh
npm ci --no-audit --no-fund
npm test
npm run build
git diff --exit-code -- dist/
npx playwright install --with-deps chromium
npm run test:browser
python3 -B tests/package_test.py
python3 -B tests/marketplace_test.py
python3 -B scripts/check_marketplace.py --commit 256e59d262ae759469e3d605cc61c1378ee5156b
python3 -B scripts/package_beta.py --commit 256e59d262ae759469e3d605cc61c1378ee5156b --marketplace --output /tmp/ti-rc3-candidate
```

The output directory must not exist. Packaging reads committed blobs and emits only `thermal-intelligence.js`, `LICENSE` and `manifest.json`. The manifest binds version, source commit/tree, sizes and SHA-256 hashes. No source maps or third-party runtime downloads are included.

## Validation limits

Regression coverage includes the climate/lock match-then-contrary ordering boundary, disabled direct and typed valve mappings, read-only heading geometry at 390/768/1440 pixels, fixture resets, bounded registry recovery and stale replies, humidity source/reset behavior, range Home/End and locked trend observations. The corrected candidate passed 171 unit tests, 118 Chromium browser tests, 13 package tests, eight distribution tests and fourteen foundation regressions. Foundation/link, public-data and whitespace checks passed. These are source and synthetic browser results, not installation acceptance.

An earlier RC.3 build rendered in a bounded passive Lab trial, but independent observation lost freshness during browser work. It was rolled back to RC.2. The failed coverage and that build's partial results do not establish acceptance of the corrected candidate.

On 13 November, the corrected module passed bounded manual Lab acceptance on Home Assistant 2026.11.0: six inert-fixture cards rendered, humidity details followed their source, an unsaved guide reset cleared its draft value, an explicitly blank valve mapping retained thermostat activity, and passive browser reconnect succeeded. Independent authenticated observers recorded no service calls, errors or connection gaps during the two recorded test segments. Saved dashboards, requested settings, legacy files and the existing Marketplace package were preserved. The candidate remains selected through a manual resource overlay; Marketplace still records RC.2. This was a passive trial, with a recorded interval between segments, not continuous soak or physical-control evidence.

RC.2's Marketplace installation, bounded controls and maintainer-observed heating are historical RC.2 results. RC.3 still needs its own named-release installer acceptance. Physical mobile/Companion coverage, wider provider qualification, installer update/removal/recovery, backup restore rehearsal and a formal soak remain separate gaps. Service acknowledgement, provider observation, valve position and physical heating are distinct evidence.

Repository Wiki sources frozen at candidate `256e59d262ae759469e3d605cc61c1378ee5156b` link to its retained candidate branch. Main documentation uses its own reviewed links. Publishing this source does not itself update the live Wiki.
