# Release candidate 0.1.0-rc.3

RC.3 is an unpublished candidate for the standalone thermostat card. It corrects three defects found after RC.2 was released. The [RC.2 package](rc.md), its assets and its dated installation and heating evidence remain unchanged. No RC.3 installation or live control test is claimed.

## Changes from RC.2

- Climate and VT lock request tracking retains submillisecond timestamp precision. If a matching report is followed by a newer contrary report before service acknowledgement, the old match cannot produce an **Observed** result. Acknowledgement alone remains **Accepted**; later matching evidence is still required.
- An explicitly blank valve mapping leaves the thermostat's reported activity visible. Missing, unknown, stale or invalid configured valve observations retain their own degraded states; another valve is never selected implicitly.
- A long heading remains within the card beside a read-only lock indicator when header telemetry is empty, including phone, tablet and desktop layouts.

The synthetic fixture also discards observations from a scenario replaced by reset, and the registry regression completes both pending reads before testing stale-session rejection. These test corrections do not change runtime services.

## Configuration and installation boundary

The card type remains `custom:thermal-intelligence-beta-card`; the editor and supported schema-1/schema-2 configurations are unchanged. Commands still require explicit intent, a captured target and current provider permission/readiness. Rendering, editor cancellation and reconnect do not dispatch or replay commands. No TI backend/controller is required.

After a separately approved publication, Home Assistant 2026.11 and later uses the [Marketplace route](marketplace.md); earlier installations use [HACS](hacs.md). Select the exact named release and verify the served module against its manifest. This candidate branch is not a published installer version. Keep one trial resource, retain the previous module/configuration, and preserve legacy TI separately. Reverting a resource only restores the frontend; it cannot undo a device command. See [migration](migration.md).

## Reproduce the candidate

Use a clean checkout of the exact reviewed commit and replace `REVIEWED_COMMIT` with that SHA:

```sh
npm ci --no-audit --no-fund
npm test
npm run build
git diff --exit-code -- dist/
npm run test:browser
python3 -B tests/package_test.py
python3 -B tests/marketplace_test.py
python3 -B scripts/check_marketplace.py --commit REVIEWED_COMMIT
python3 -B scripts/package_beta.py --commit REVIEWED_COMMIT --marketplace --output /tmp/ti-rc3-candidate
```

The output directory must not exist. Packaging reads committed blobs and emits only `thermal-intelligence.js`, `LICENSE` and `manifest.json`. The manifest binds version, source commit/tree, sizes and SHA-256 hashes. No source maps or third-party runtime downloads are included.

## Validation limits

Regression coverage includes the climate/lock match-then-contrary ordering boundary, disabled direct and typed valve mappings, read-only heading geometry at 390/768/1440 pixels, fixture resets and stale registry replies. The prepared candidate passed 169 unit tests, 104 Chromium browser tests, 13 package tests, eight distribution tests and fourteen foundation regressions. Foundation/link, public-data, whitespace and redacted tracked/history secret checks passed. These are source and synthetic browser results, not installation acceptance.

RC.2's Marketplace installation, bounded controls and maintainer-observed heating are historical RC.2 results. RC.3 still needs its own named-release installation and bounded acceptance. Physical mobile/Companion coverage, wider provider qualification, installer update/removal/recovery, backup restore rehearsal and a formal soak remain separate gaps. Service acknowledgement, provider observation, valve position and physical heating are distinct evidence.

Repository Wiki sources in this candidate link to its retained candidate branch so the guides remain reviewable before main promotion or live Wiki synchronization. Publishing this source does not itself update the live Wiki.
