# Distribution

Thermal Intelligence is available as a manually installed frontend prerelease. Use the [RC guide](rc.md) for the candidate prepared through `develop`, or the retained [beta.4 guide](beta.md).

| Branch | Contents |
| --- | --- |
| `main` | Public documentation, images and website |
| `develop` | Release-candidate source, tests and installable RC.1 |
| `senyo888-patch-1` | Standalone thermostat source, tests and installable beta |

The package contains the JavaScript module, software licence and a manifest identifying its source and hashes. Website content, images, development tools and private records are excluded. The bundle is self-contained and does not download runtime dependencies.

## HACS

HACS installation and catalogue inclusion are not available or validated for this beta. Manual resource installation is the current route. Future HACS support will require a tested Dashboard/frontend package and installation, update, removal and cache-refresh checks.

## Resource loading

Add the module once as a **JavaScript module** resource. After updating its versioned URL, open a fresh browser document before checking the card and editor. A custom element already registered in an open page cannot be replaced in place.

RC.1 retains `custom:thermal-intelligence-beta-card`, with the picker name **Thermal Intelligence Thermostat · RC**. Beta.4 and RC.1 share their trial registrations; load only one of those modules in a document. Keep existing legacy TI resources and card types in place. See [upgrade and rollback](migration.md).

`scripts/package_beta.py` packages both explicit `-beta.N` and `-rc.N` versions from an immutable commit. Its manifest records the version, channel, delivery branch, exact commit/tree and file hashes. It rejects stable versions and mismatched bundles. The script name is retained for existing beta tooling.
