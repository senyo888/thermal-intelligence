<img src="https://raw.githubusercontent.com/senyo888/thermal-intelligence/main/assets/presentation/wiki-installing-the-release-candidate.png" alt="Thermal Intelligence Wiki — Install RC.1" width="100%">

# Release candidate 0.1.0-rc.1

RC.1 is the standalone thermostat frontend prepared through `develop`. It retains beta.4's thermostat behaviour, response-arc rules, health LED, command guards and schema-1 configurations. Release identity, package metadata and the card-picker label are updated. This candidate provides the standalone frontend; stable release acceptance is tracked separately.

Prerelease [v0.1.0-rc.1](https://github.com/senyo888/thermal-intelligence/releases/tag/v0.1.0-rc.1) is the controlled HACS trial package, targeting `9d9ed9744c29a494d45501a8bb1359edd465c5c4`. Its module matches the manual package below byte for byte; its distribution metadata and packaging checks have separate offline validation. Upstream HACS validation and installation acceptance remain pending. See the release notes for the exact assets and trial gates.

## Package

Reviewed source: [`74d7be46a7657f65f77e0dde346fae9e15212154`](https://github.com/senyo888/thermal-intelligence/tree/74d7be46a7657f65f77e0dde346fae9e15212154). [Download the exact module](https://raw.githubusercontent.com/senyo888/thermal-intelligence/74d7be46a7657f65f77e0dde346fae9e15212154/dist/thermal-intelligence.js).

The module is **176,421 bytes**. Verify its SHA-256 before installation:

```text
763814e1e797c72a8960fec2b928d945dc6fc1056d7ced366d4241ae81304117
```

To reproduce it, use a clean checkout of that revision:

```sh
git switch --detach 74d7be46a7657f65f77e0dde346fae9e15212154
npm ci --no-audit --no-fund
npm run build
git diff --exit-code -- dist/thermal-intelligence.js
python3 scripts/package_beta.py --commit 74d7be46a7657f65f77e0dde346fae9e15212154 --output /tmp/ti-rc1
```

The destination must not already exist. The package contains `thermal-intelligence.js`, `LICENSE` and `manifest.json`. The manifest records the source commit/tree, version, `rc` channel, `develop` delivery branch, sizes and SHA-256 hashes. Packaging reads committed blobs, never uncommitted working files.

## Installation and rollback

1. Back up the affected card configuration and resource list. For a trial update, retain the previous module and resource URL.
2. Copy the verified RC module to `/config/www/thermal-intelligence/thermal-intelligence-rc1-763814e1e797.js`.
3. Add `/local/thermal-intelligence/thermal-intelligence-rc1-763814e1e797.js` once as a **JavaScript module** resource, or replace the previous beta trial resource URL with it. Do not register beta.4 and RC.1 together: they use the same trial custom elements.
4. Open a fresh browser document. Select **Thermal Intelligence Thermostat · RC** in Add Card, or open an existing trial card.

The card type remains `custom:thermal-intelligence-beta-card`. Its name deliberately remains compatible with saved trial configurations. Existing legacy TI card types and resources remain separate. No Core restart or saved-configuration migration is required.

For a first installation, remove only the RC trial cards or test view and resource registration you added, then open a fresh browser document and verify the existing cards. Retain the module and original configuration for recovery.

For a trial update, restore the previous trial resource URL retained in step 1 and open a fresh browser document. If your previous version was beta.4, the [beta.4 guide](https://github.com/senyo888/thermal-intelligence/blob/main/docs/beta.md) gives its exact module and hash. Do not restore a whole dashboard over unrelated edits.

## Validation and limits

RC.1 passed 135 unit tests, 81 Chromium browser tests and eight packaging tests. The build reproduced, and public-file, local-link and redacted secret checks passed. Browser coverage includes preserved legacy registrations, the RC picker/version identity, unknown and unavailable states, command guards and no replay. These checks are separate from native-device acceptance and timed Lab observation.

Manual RC installation, rollback to beta.4 and RC reapplication passed on HA **2026.10.0** with VT **10.5.1**. The existing TI resource, dashboard configuration and eleven fixture thermostat settings remained unchanged. Six trial cards rendered alongside the legacy card, and the RC picker entry was verified.

The 48-hour RC.1 controller observation completed on 2 November 2026. All nine scheduled checkpoints passed Home Assistant Core, served-module identity, VT provider and reported-version checks on Home Assistant 2026.10.0 with VT 10.5.1. UI coverage was recorded at the initial checkpoint; the eight later UI observations, including the final retained-page and fresh-render checks, were unavailable. Those gaps remain part of the result. Periodic checkpoints do not establish continuous uptime, browser execution or physical heating response. See [Compatibility](Compatibility) for the recorded baseline and remaining coverage.

The backend, schedules, holds, cutoff and recovery control remain planned work. HACS installation requires separate validation. Stable release acceptance includes package, compatibility and installation checks alongside the reviewed observation result.
