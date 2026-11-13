# Release candidate 0.1.0-rc.3

RC.3 is an unpublished candidate for the standalone thermostat card. It corrects request tracking and presentation defects found after RC.2 was released. The [RC.2 package](https://github.com/senyo888/thermal-intelligence/blob/f93fb6489f87fbf9c393dd8cd03e85e5718277ef/docs/rc.md), its assets and its dated installation and heating evidence remain unchanged. The corrected candidate still requires its own Lab acceptance.

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

After a separately approved publication, Home Assistant 2026.11 and later uses the [Marketplace route](https://github.com/senyo888/thermal-intelligence/blob/f93fb6489f87fbf9c393dd8cd03e85e5718277ef/docs/marketplace.md); earlier installations use [HACS](https://github.com/senyo888/thermal-intelligence/blob/f93fb6489f87fbf9c393dd8cd03e85e5718277ef/docs/hacs.md). For RC.3, select `v0.1.0-rc.3` explicitly once it is published and verify the served module against this release’s manifest. The linked frozen guides use RC.2 installation examples; those version examples are historical and do not override this RC.3 selection. This candidate branch is not a published installer version. Keep one trial resource, retain the previous module/configuration, and preserve legacy TI separately. Reverting a resource only restores the frontend; it cannot undo a device command. See [migration](https://github.com/senyo888/thermal-intelligence/blob/f93fb6489f87fbf9c393dd8cd03e85e5718277ef/docs/migration.md).

## Reproduce the candidate

Use a clean checkout of the reviewed candidate commit `f93fb6489f87fbf9c393dd8cd03e85e5718277ef`. Do not substitute a merge or main-promotion commit: the manifest records the exact source identity.

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

An earlier RC.3 build rendered in a bounded passive Lab trial, but independent observation lost freshness during browser work. It was rolled back to RC.2. The failed coverage and that build's partial results do not establish acceptance of the corrected candidate.

The later candidate `256e59d262ae759469e3d605cc61c1378ee5156b` passed bounded passive Lab checks on 13 November and remains selected there through a manual resource overlay. That dated result covers its own bytes; it does not cover the subsequent range-boundary and manual-copy corrections described here. The latest corrected package requires fresh Lab acceptance. Marketplace still records RC.2.

RC.2's Marketplace installation, bounded controls and maintainer-observed heating are historical RC.2 results. RC.3 still needs its own named-release installation and bounded acceptance. Physical mobile/Companion coverage, wider provider qualification, installer update/removal/recovery, backup restore rehearsal and a formal soak remain separate gaps. Service acknowledgement, provider observation, valve position and physical heating are distinct evidence.

Repository Wiki sources frozen at candidate `f93fb6489f87fbf9c393dd8cd03e85e5718277ef` link to its retained candidate branch. Main documentation uses its own reviewed links. Publishing this source does not itself update the live Wiki.
