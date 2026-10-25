# Install and test the beta

Version **0.1.0-beta.1**, source commit `84033aa94b23d54391b2c2d2628b570b8b7134dc`. This is a frontend module for controlled testing, with no TI backend required.

## Get the exact package

Use the [reviewed source commit](https://github.com/senyo888/thermal-intelligence/tree/84033aa94b23d54391b2c2d2628b570b8b7134dc) on `senyo888-patch-1`. The [compiled module](https://raw.githubusercontent.com/senyo888/thermal-intelligence/84033aa94b23d54391b2c2d2628b570b8b7134dc/dist/thermal-intelligence.js) is **151,607 bytes**, SHA-256:

```text
64abb7965a46047ec551eb347ba41ad6c78c27cca7ba2de3bbdeb82e566c201d
```

The [software licence](https://github.com/senyo888/thermal-intelligence/blob/84033aa94b23d54391b2c2d2628b570b8b7134dc/LICENSE) and editable source accompany that commit. From a checkout, the deterministic package command is:

```sh
python3 scripts/package_beta.py \
  --commit 84033aa94b23d54391b2c2d2628b570b8b7134dc \
  --output /tmp/thermal-intelligence-beta-1
```

Choose an unused output directory. The package contains `thermal-intelligence.js`, `LICENSE` and `manifest.json`; the manifest records the exact source tree, version, file sizes and hashes. To rebuild the module, use Node 22+, `npm ci` and `npm run build` in that checkout. Verify the digest before copying it to Home Assistant.

## Install alongside existing cards

1. Back up the affected dashboard configuration and list its resources. Keep any existing TI resource and `custom:thermal-intelligence-card` instances unchanged.
2. Copy the verified module to `config/www/thermal-intelligence-beta/thermal-intelligence-beta-64abb7965a46.js` using your normal HA file transfer method.
3. Add a **JavaScript module** resource at `/local/thermal-intelligence-beta/thermal-intelligence-beta-64abb7965a46.js`. Add it once.
4. Reload the frontend or open a fresh browser session. In Add Card, select **Thermal Intelligence Thermostat · Beta** and choose a test thermostat in the visual editor.
5. Check current readings, source details, readiness and available controls before making an intentional thermostat change.

The beta type is `custom:thermal-intelligence-beta-card`; its editor is `thermal-intelligence-beta-card-editor`. No legacy alias is registered. Separate technical names preserve coexistence; the canonical customer layout is retained, with a smaller lock and icon/text alignment correction. Private backend-dependent schedules, holds, cutoff and recovery controls remain with the existing installation.

## Roll back

For a first installation, remove only the beta cards/test view you added and its beta resource registration. Reload into a new browser document and verify the existing cards. Retain the downloaded bundle and the original configuration for recovery. Do not restore an entire old dashboard over intervening edits.

For a later beta update, retain the previous bundle and resource URL before updating. Restore that URL and reload to return to the previous version; restore saved card configuration only if the version's documented migration requires it. A browser cannot replace an already registered custom element without a fresh document. No Core restart is expected for this frontend-only procedure.

## Testing and limits

See [Compatibility](compatibility.md) for the tested versions and scenario limits. Synthetic checks and reported activity do not prove physical heating. HACS installation and a minimum supported version range remain unverified.
