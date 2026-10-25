# Install and test the beta

Version **0.1.0-beta.2**, source commit `b0807f18a4add0ebcd5d8b9c43a4a08644a24e3b`. This is a frontend module for controlled testing, with no TI backend required.

## Get the exact package

Use the [reviewed source commit](https://github.com/senyo888/thermal-intelligence/tree/b0807f18a4add0ebcd5d8b9c43a4a08644a24e3b) on `senyo888-patch-1`. The [compiled module](https://raw.githubusercontent.com/senyo888/thermal-intelligence/b0807f18a4add0ebcd5d8b9c43a4a08644a24e3b/dist/thermal-intelligence.js) is **164,966 bytes**, SHA-256:

```text
11c36a583402386493a87d7c30b62cab08c299b09332d03558942ad41db59d5a
```

The [software licence](https://github.com/senyo888/thermal-intelligence/blob/b0807f18a4add0ebcd5d8b9c43a4a08644a24e3b/LICENSE) and editable source accompany that commit. From a checkout, the deterministic package command is:

```sh
python3 scripts/package_beta.py \
  --commit b0807f18a4add0ebcd5d8b9c43a4a08644a24e3b \
  --output /tmp/thermal-intelligence-beta-2
```

Choose an unused output directory. The package contains `thermal-intelligence.js`, `LICENSE` and `manifest.json`; the manifest records the exact source tree, version, file sizes and hashes. To rebuild the module, use Node 22+, `npm ci` and `npm run build` in that checkout. Verify the digest before copying it to Home Assistant.

## Install alongside existing cards

1. Back up the affected dashboard configuration and list its resources. Keep any existing TI resource and `custom:thermal-intelligence-card` instances unchanged.
2. Copy the verified module to `config/www/thermal-intelligence-beta/thermal-intelligence-beta-11c36a583402.js` using your normal HA file transfer method.
3. Add a **JavaScript module** resource at `/local/thermal-intelligence-beta/thermal-intelligence-beta-11c36a583402.js`. Add it once.
4. Reload the frontend or open a fresh browser session. In Add Card, select **Thermal Intelligence Thermostat · Beta** and choose a test thermostat in the visual editor.
5. Check current readings, source details, readiness and available controls before making an intentional thermostat change.

The beta type is `custom:thermal-intelligence-beta-card`; its editor is `thermal-intelligence-beta-card-editor`. No legacy alias is registered. Separate technical names preserve coexistence. Beta.2 adds an explicit administrator [lock dialog](lock-control.md) to the canonical customer layout; ordinary accounts retain the read-only indicator. Private backend-dependent schedules, holds, cutoff and recovery controls remain with the existing installation.

## Roll back

For a first installation, remove only the beta cards/test view you added and its beta resource registration. Reload into a new browser document and verify the existing cards. Retain the downloaded bundle and the original configuration for recovery. Do not restore an entire old dashboard over intervening edits.

For a beta update, retain the previous bundle and resource URL before updating. The tested beta.2 predecessor is beta.1 at `84033aa94b23d54391b2c2d2628b570b8b7134dc`, SHA-256 `64abb7965a46047ec551eb347ba41ad6c78c27cca7ba2de3bbdeb82e566c201d`. Restore its URL and reload to return to that frontend. Saved schema-1 configurations need no migration. A browser cannot replace an already registered custom element without a fresh document; no Core restart is expected.

Frontend rollback does not undo a deliberate VT lock/unlock command. Check the provider's actual state and restore it intentionally where required; VT continues to own automatic relocking.

## Testing and limits

See [Compatibility](compatibility.md) for the tested versions and scenario limits. Synthetic checks and reported activity do not prove physical heating. HACS installation and a minimum supported version range remain unverified.
