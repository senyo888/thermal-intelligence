# Distribution

Thermal Intelligence is currently available as a manually installed frontend beta. Use the [beta installation guide](beta.md) for the exact module, source commit and SHA-256 digest.

| Branch | Contents |
| --- | --- |
| `main` | Public documentation, images and website |
| `develop` | Release-candidate source, tests and installable RC.1 |
| `senyo888-patch-1` | Standalone thermostat source, tests and installable beta |

The package contains the JavaScript module, software licence and a manifest identifying its source and hashes. Website content, images, development tools and private records are excluded. The bundle is self-contained and does not download runtime dependencies.

## HACS and Home Assistant Marketplace

Manual resource installation remains the available route. Dashboard package metadata and offline checks are prepared on `senyo888-patch-1` for review into `develop`; HACS and Home Assistant Marketplace installation, migration and catalogue inclusion remain unverified.

The root [`hacs.json`](../hacs.json) names `thermal-intelligence.js`, uses the `dist/` layout and hides the default branch as a download choice. `main` currently contains documentation rather than an installable package. Metadata on a source branch does not make that branch a selectable release or make the repository installable from the default branch.

The build writes `thermal-intelligence.js` and a copy of the software `LICENSE` to `dist/`. The distribution check rejects any extra files, including leftovers from earlier builds. There are no runtime dependencies to fetch. No minimum Home Assistant or HACS version is declared until the supported range is established. The manifest does not use integration-only ZIP or persistent-directory options. See the official [Dashboard requirements](https://www.hacs.xyz/docs/publish/plugin/) and [manifest guidance](https://www.hacs.xyz/docs/publish/start/).

### Check and prepare a candidate

From a source checkout:

```sh
npm ci --no-audit --no-fund
npm run build
python3 -B scripts/check_marketplace.py
python3 -B tests/marketplace_test.py
python3 -B tests/package_test.py
```

For a reviewed commit containing the metadata and licence copy, replace `REVIEWED_COMMIT` below with its exact SHA:

```sh
python3 -B scripts/check_marketplace.py --commit REVIEWED_COMMIT
python3 -B scripts/package_beta.py --commit REVIEWED_COMMIT --marketplace --output /tmp/ti-marketplace-candidate
```

The destination must not exist. This produces separate `thermal-intelligence.js`, `LICENSE` and `manifest.json` files locally. The manifest records the immutable source, package hashes and distribution metadata. These are candidate release assets; the command does not publish or install them. `hacs.json` stays at the repository root of the selected source revision. The original RC.1 source predates this metadata and remains available through the manual package route.

The distribution check rejects wrong filenames, root modules that would shadow `dist/`, missing or changed licence text, extra payload files, symlinks, executable files, source maps and mismatched module versions. It deliberately accepts only TI's reviewed manifest options. CI checks the committed input and reproduces both manual and Marketplace candidate packages.

### Remaining installation and release checks

| Check | Status |
| --- | --- |
| Repository description, topics, README images and software licence | Present |
| Dashboard metadata, bounded install directory and repeatable candidate assets | Prepared on `senyo888-patch-1`; offline validation only |
| Installable default branch or published release containing the metadata and module | Pending |
| Upstream HACS validation with no ignored checks | Pending against the published candidate |
| HACS and Marketplace install, update, removal, migration and recovery | Pending in an isolated test environment |
| Default catalogue inclusion | Not submitted or claimed |

The intended versioned route uses a reviewed GitHub release with the standalone JS asset, software licence and package manifest. A manual ZIP or a bare tag is not that route. Keep internal reports, prompts and raw evidence out of release assets. Catalogue submission has [additional requirements](https://www.hacs.xyz/docs/publish/include/), including upstream validation and a published release; preparing the files does not complete those steps.

### Existing installations and migration

Check file and resource ownership before an installer manages `www/community/thermal-intelligence/`. Stop if that directory or its resource prefix contains existing TI or unrelated files. The [reviewed Marketplace resource manager](https://github.com/home-assistant/core/blob/6cfd47af9851a1552ad6f58c926b5814689a9f1d/homeassistant/components/marketplace/repositories/plugin.py) updates resources by repository-folder prefix and removes entries in that prefix on uninstall. Renaming a card does not isolate those resources.

HA 2026.11.0b1 is a prerelease source-review baseline, not a tested TI installation. Test storage-mode resources, YAML resources, `frontend.extra_module_url`, legacy `/hacsfiles/` paths, `/local/community/` paths, duplicate loading and fresh-document caching separately. Preserve genuine unknown and unavailable provider states. An HA/HACS migration may require a full backup restore; reverting a JS resource only rolls back the frontend. Keep these checks separate from the running RC observation and from physical heating claims.

## Resource loading

Add the module once as a **JavaScript module** resource. After updating its versioned URL, open a fresh browser document before checking the card and editor. A custom element already registered in an open page cannot be replaced in place.

The beta uses `custom:thermal-intelligence-beta-card`, with the picker name **Thermal Intelligence Thermostat · Beta**. Keep existing TI resources and card types in place. See [upgrade and rollback](migration.md).
