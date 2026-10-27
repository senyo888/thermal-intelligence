# Distribution

Thermal Intelligence is currently available as a manually installed frontend beta. Use the [beta installation guide](beta.md) for the exact module, source commit and SHA-256 digest.

| Branch | Contents |
| --- | --- |
| `main` | Public documentation, images and website |
| `develop` | Contribution and integration branch; no installable package yet |
| `senyo888-patch-1` | Standalone thermostat source, tests and installable beta |

The package contains the JavaScript module, software licence and a manifest identifying its source and hashes. Website content, images, development tools and private records are excluded. The bundle is self-contained and does not download runtime dependencies.

## HACS

HACS installation and catalogue inclusion are not available or validated for this beta. Manual resource installation is the current route. Future HACS support will require a tested Dashboard/frontend package and installation, update, removal and cache-refresh checks.

## Resource loading

Add the module once as a **JavaScript module** resource. After updating its versioned URL, open a fresh browser document before checking the card and editor. A custom element already registered in an open page cannot be replaced in place.

The beta uses `custom:thermal-intelligence-beta-card`, with the picker name **Thermal Intelligence Thermostat · Beta**. Keep existing TI resources and card types in place. See [upgrade and rollback](migration.md).
