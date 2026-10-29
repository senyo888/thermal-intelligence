# Release candidate 0.1.0-rc.1

RC.1 is the standalone thermostat frontend prepared through `develop`. It retains beta.4's thermostat behaviour, response-arc rules, health LED, command guards and schema-1 configurations. Release identity, package metadata and the card-picker label are updated. No TI backend is included, and there is no stable release yet.

## Package

Build from the reviewed RC commit on `develop`, then package that immutable revision:

```sh
npm ci --no-audit --no-fund
npm run build
git diff --exit-code -- dist/thermal-intelligence.js
python3 scripts/package_beta.py --commit HEAD --output /tmp/ti-rc1
```

The destination must not already exist. The package contains `thermal-intelligence.js`, `LICENSE` and `manifest.json`. The manifest records the source commit/tree, version, `rc` channel, `develop` delivery branch, sizes and SHA-256 hashes. Packaging reads committed blobs, never uncommitted working files.

## Installation and rollback

1. Retain the previous trial module, resource URL and card configuration.
2. Copy the verified RC module to a distinct versioned filename under `/config/www/thermal-intelligence/`.
3. Add it once as a **JavaScript module** resource, or replace the previous beta trial resource URL. Do not register beta.4 and RC.1 together: they use the same trial custom elements.
4. Open a fresh browser document. Select **Thermal Intelligence Thermostat · RC** in Add Card, or open an existing trial card.

The card type remains `custom:thermal-intelligence-beta-card`. Its name deliberately remains compatible with saved trial configurations. Existing legacy TI card types and resources remain separate. No Core restart or saved-configuration migration is required.

To roll back, restore the retained beta.4 resource URL and open a fresh browser document. The [beta.4 guide](https://github.com/senyo888/thermal-intelligence/blob/develop/docs/beta.md) gives its exact immutable module and hash. Do not restore a whole dashboard over unrelated edits.

## Validation and limits

RC.1 passed 135 unit tests, 81 Chromium browser tests and eight packaging tests. The build reproduced, and public-file, local-link and redacted secret checks passed. Browser coverage includes preserved legacy registrations, the RC picker/version identity, unknown and unavailable states, command guards and no replay. These checks are separate from native-device acceptance and timed Lab observation.

Candidate checks are recorded against the exact RC commit and bundle. A timed Lab observation needs its own start, checkpoints and final result; beta.4's earlier installation and rollback checks do not constitute an RC soak. See [Compatibility](https://github.com/senyo888/thermal-intelligence/blob/develop/docs/compatibility.md) for the existing baseline and remaining device/provider coverage.

RC.1 does not include the planned backend, schedules, holds, cutoff or recovery control. HACS installation remains unverified. An RC package or a completed observation does not make it a stable release.
