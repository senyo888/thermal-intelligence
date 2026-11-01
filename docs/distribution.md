# Distribution

Thermal Intelligence is available as a manually installed frontend prerelease. Use the [RC guide](rc.md) for the candidate prepared through `develop`, or the retained [beta.4 guide](beta.md).

| Branch | Contents |
| --- | --- |
| `main` | Public documentation, images, website and a reviewed frontend distribution snapshot for HACS discovery |
| `develop` | Release-candidate source, tests and installable RC.1 |
| `senyo888-patch-1` | Standalone thermostat source, tests and installable beta |

The package contains the JavaScript module, software licence and a manifest identifying its source and hashes. Website content, images, development tools and private records are excluded. The bundle is self-contained and does not download runtime dependencies.

## HACS custom repository and future Marketplace distribution

Manual resource installation remains the available route. Dashboard package metadata and offline checks are present on `develop`. The next route is a versioned HACS custom Dashboard repository; see [HACS preparation](hacs.md). Installation, migration and catalogue inclusion need separate validation. Home Assistant Marketplace is a later distribution target.

The root [`hacs.json`](../hacs.json) names `thermal-intelligence.js`, uses the `dist/` layout and hides the default branch as a download choice. The same metadata accompanies the candidate source on `develop`.

### Default-branch discovery and release selection

For TI's first-prerelease setup, with no stable release or selected visible version, HACS 2.0.5 initially checks the default branch when adding the repository. Prereleases become available through the added repository's version-visibility controls. A first prerelease alone therefore does not supply the structure needed by that initial check. See the pinned [version-selection logic](https://github.com/hacs/integration/blob/c0dfd8b44297c3673c21973e2539375a53687a9c/custom_components/hacs/repositories/base.py#L1304) and [Dashboard structure check](https://github.com/hacs/integration/blob/c0dfd8b44297c3673c21973e2539375a53687a9c/custom_components/hacs/repositories/plugin.py#L39).

The default-branch snapshot contains `dist/thermal-intelligence.js` and `dist/LICENSE`, copied unchanged from candidate source [`9d9ed9744c29a494d45501a8bb1359edd465c5c4`](https://github.com/senyo888/thermal-intelligence/tree/9d9ed9744c29a494d45501a8bb1359edd465c5c4). The module is **176,421 bytes**, SHA-256 `763814e1e797c72a8960fec2b928d945dc6fc1056d7ced366d4241ae81304117`. Source, tests and package generation stay on the candidate branch; update the snapshot from a reviewed immutable candidate rather than editing it in place.

This snapshot makes the repository structure available for discovery. It does not establish a published release or a tested HACS installation. `hide_default_branch` controls a displayed download choice, not backend access: the files remain publicly retrievable once promoted. The intended route enables prereleases and explicitly selects the approved version before downloading. If that version is absent or selection is ambiguous, stop and retain the manual installation route. Live onboarding and installed-file verification remain pending.

The build writes `thermal-intelligence.js` and a copy of the software `LICENSE` to `dist/`. The distribution check rejects any extra files, including leftovers from earlier builds. There are no runtime dependencies to fetch. No minimum Home Assistant or HACS version is declared until the supported range is established. The manifest does not use integration-only ZIP or persistent-directory options. See the official [Dashboard requirements](https://www.hacs.xyz/docs/publish/plugin/) and [manifest guidance](https://www.hacs.xyz/docs/publish/start/).

### Check and prepare a candidate

Run these commands from the reviewed immutable candidate checkout on `develop`, where the source and packaging tools live:

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

The source-branch distribution check rejects wrong filenames, root modules that would shadow `dist/`, missing or changed licence text, extra payload files, symlinks, executable files, source maps and mismatched module versions. It deliberately accepts only TI's reviewed manifest options. Candidate CI on `develop` checks the committed input and reproduces both manual and Marketplace candidate packages. The foundation check on `main` instead verifies the promoted snapshot's exact hashes, metadata, file modes and allowed payload files.

### Remaining installation and release checks

| Check | Status |
| --- | --- |
| Repository description, topics, README images and software licence | Present |
| Dashboard metadata and reviewed default-branch snapshot | Prepared for discovery; offline validation only |
| Repeatable versioned candidate assets | Prepared on `develop`; publication pending |
| Named prerelease selection through HACS | Pending in an isolated test environment |
| Upstream HACS validation with no ignored checks | Pending against the published candidate |
| HACS and Marketplace install, update, removal, migration and recovery | Pending in an isolated test environment |
| Default catalogue inclusion | Not submitted or claimed |

The intended versioned route uses a reviewed GitHub release with the standalone JS asset, software licence and package manifest. A manual ZIP or a bare tag is not that route. Keep internal reports, prompts and raw evidence out of release assets. Catalogue submission has [additional requirements](https://www.hacs.xyz/docs/publish/include/), including upstream validation and a published release; preparing the files does not complete those steps.

### Existing installations and migration

Check file and resource ownership before an installer manages `www/community/thermal-intelligence/`. Inspect every resource URL beginning with `/hacsfiles/thermal-intelligence`, including similarly prefixed names, query variants and duplicates. The [HACS 2.0.5 resource manager](https://github.com/hacs/integration/blob/c0dfd8b44297c3673c21973e2539375a53687a9c/custom_components/hacs/repositories/plugin.py#L204) updates or removes the first raw-prefix match, without requiring a trailing slash. Stop before installer writes if the directory or any matching resource belongs to existing TI or unrelated content, or if trial registrations are duplicated. Renaming a card or using a similarly named directory does not isolate those resources.

The later [Marketplace resource manager](https://github.com/home-assistant/core/blob/6cfd47af9851a1552ad6f58c926b5814689a9f1d/homeassistant/components/marketplace/repositories/plugin.py) has its own prefix-based resource handling. Validate that migration separately.

HA 2026.11.0b1 is a prerelease source-review baseline, not a tested TI installation. Test storage-mode resources, YAML resources, `frontend.extra_module_url`, legacy `/hacsfiles/` paths, `/local/community/` paths, duplicate loading and fresh-document caching separately. Preserve genuine unknown and unavailable provider states. An HA/HACS migration may require a full backup restore; reverting a JS resource only rolls back the frontend. Keep these checks separate from the running RC observation and from physical heating claims.

## Resource loading

Add the module once as a **JavaScript module** resource. After updating its versioned URL, open a fresh browser document before checking the card and editor. A custom element already registered in an open page cannot be replaced in place.

RC.1 retains `custom:thermal-intelligence-beta-card`, with the picker name **Thermal Intelligence Thermostat · RC**. Beta.4 and RC.1 share their trial registrations; load only one of those modules in a document. Keep existing legacy TI resources and card types in place. See [upgrade and rollback](migration.md).

`scripts/package_beta.py` packages both explicit `-beta.N` and `-rc.N` versions from an immutable commit. Its manifest records the version, channel, delivery branch, exact commit/tree and file hashes. It rejects stable versions and mismatched bundles. The script name is retained for existing beta tooling.
