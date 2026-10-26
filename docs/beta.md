# Install and test the beta

Version **0.1.0-beta.4**, source commit `ea1268ac7a8dc5aa7f54723870808bf24a92cdc0`. This is a frontend module for controlled testing, with no TI backend required. Manual installation and rollback were tested; see Compatibility for coverage.

## Get the exact package

Use the [reviewed source commit](https://github.com/senyo888/thermal-intelligence/tree/ea1268ac7a8dc5aa7f54723870808bf24a92cdc0) on `senyo888-patch-1`. The [compiled module](https://raw.githubusercontent.com/senyo888/thermal-intelligence/ea1268ac7a8dc5aa7f54723870808bf24a92cdc0/dist/thermal-intelligence.js) is **176,381 bytes**, SHA-256:

```text
3d58fcddbeaf72b9f9927e67b04269f78d6e69d0b09460cfd06b12b1ed575a2c
```

The [software licence](https://github.com/senyo888/thermal-intelligence/blob/ea1268ac7a8dc5aa7f54723870808bf24a92cdc0/LICENSE) and editable source accompany that commit. From a checkout, the deterministic package command is:

```sh
python3 scripts/package_beta.py \
  --commit ea1268ac7a8dc5aa7f54723870808bf24a92cdc0 \
  --output /tmp/thermal-intelligence-beta-4
```

Choose an unused output directory. The package contains `thermal-intelligence.js`, `LICENSE` and `manifest.json`; the manifest records the exact source tree, version, file sizes and hashes. To rebuild the module, use Node 22+, `npm ci` and `npm run build` in that checkout. Verify the digest before copying it to Home Assistant.

## Install alongside existing cards

1. Back up the affected dashboard configuration and list its resources. Keep any existing TI resource and `custom:thermal-intelligence-card` instances unchanged.
2. Copy the verified module to `config/www/thermal-intelligence-beta/thermal-intelligence-beta-3d58fcddbeaf.js` using your normal HA file transfer method.
3. Add a **JavaScript module** resource at `/local/thermal-intelligence-beta/thermal-intelligence-beta-3d58fcddbeaf.js`. Add it once.
4. Reload the frontend or open a fresh browser session. In Add Card, select **Thermal Intelligence Thermostat · Beta** and choose a test thermostat in the visual editor.
5. Check current readings, source details, readiness and available controls before making an intentional thermostat change.

The beta type is `custom:thermal-intelligence-beta-card`; its editor is `thermal-intelligence-beta-card-editor`. No legacy alias is registered. Separate technical names preserve coexistence. The beta includes an explicit administrator [lock dialog](lock-control.md) in the canonical customer layout; ordinary accounts retain the read-only indicator. The beta retains the [canonical response arc](card-configuration.md#temperature-response-arc) through optional, read-only VT evidence mappings. Private backend-dependent schedules, holds, cutoff and recovery controls remain with the existing installation.

When updating an existing beta, retain its versioned file and change only its beta resource URL to the new file. Do not add a second registration or overwrite the legacy TI resource. Saved schema-1 card configurations need no migration. Reload into a fresh browser document after changing the resource.

## Roll back

For a first installation, remove only the beta cards/test view you added and its beta resource registration. Reload into a new browser document and verify the existing cards. Retain the downloaded bundle and the original configuration for recovery. Do not restore an entire old dashboard over intervening edits.

For a beta update, retain the previous bundle and resource URL before updating. The tested beta.4 predecessor is beta.3 at `de09d16ee62474d83c5d94b20b734d871351eb20`, SHA-256 `4b9e26a2fa7746a9bf895e4630cd507408d0acc995390c8f02e612efdea267d0`. Restore its URL and reload to return to that frontend. Saved schema-1 configurations need no migration. Beta.3 retains response mappings but can show the false amber warning for VT’s explicitly null reason fields. A browser cannot replace an already registered custom element without a fresh document; no Core restart is expected.

Frontend rollback does not undo a deliberate VT lock/unlock command. Check the provider's actual state and restore it intentionally where required; VT continues to own automatic relocking.

## Testing and limits

See [Compatibility](compatibility.md) for the tested versions and scenario limits. Synthetic checks and reported activity do not prove physical heating. HACS installation and a minimum supported version range remain unverified.
