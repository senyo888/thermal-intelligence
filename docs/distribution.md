# Distribution

[RC.2](rc.md) is the current published prerelease. Its source and exact distribution snapshot are promoted to `main`; future candidates use `develop`. [RC.1](rc-1.md) and [beta.7](beta-7.md) remain dated historical packages. Use [Marketplace](marketplace.md) for Home Assistant 2026.11 and later, or [HACS](hacs.md) on older installations.

| Branch | Contents |
| --- | --- |
| `main` | Promoted RC.2 source, tests, documentation, website and frozen published distribution snapshot |
| `develop` | Release-candidate source, tests and reproducible candidate package |
| `senyo888-patch-1` | Branch for beta development and packages; verify its current commit before use |

The package contains the JavaScript module, software licence and a manifest identifying its source and hashes. Website content, images, development tools and private records are excluded. The bundle is self-contained and does not download runtime dependencies.

## Marketplace and older HACS installations

RC.2 passed a bounded manual-to-Marketplace custom-repository installation and passive Lab checks on 9 November. The [validation record](rc2-validation.md) distinguishes that result from incomplete two-version update, removal, recovery and catalogue acceptance. Historical beta.7 manual-installation evidence remains scoped to beta.7.

The root [`hacs.json`](../hacs.json) names `thermal-intelligence.js`, uses the `dist/` layout and hides the default branch as a download choice. The [published RC.2](https://github.com/senyo888/thermal-intelligence/releases/tag/v0.1.0-rc.2) has its own versioned tag, Dashboard metadata and three release assets. Beta.7 is an untagged branch candidate; its metadata does not make it a named GitHub release or establish installer acceptance.

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

The destination must not exist. This produces separate `thermal-intelligence.js`, `LICENSE` and `manifest.json` files locally. The manifest records the immutable source, package hashes and distribution metadata. These are candidate release assets; the command does not publish or install them. `hacs.json` stays at the repository root of the selected source revision. The released RC.1 source already contains its own metadata; promoting RC.2 does not change that release.

The distribution check rejects wrong filenames, root modules that would shadow `dist/`, missing or changed licence text, extra payload files, symlinks, executable files, source maps and mismatched module versions. It deliberately accepts only TI's reviewed manifest options. CI checks the committed input and reproduces both manual and Marketplace candidate packages.

### Remaining installation and release checks

| Check | Status |
| --- | --- |
| Repository description, topics, README images and software licence | Present |
| Dashboard metadata, bounded install directory and repeatable candidate assets | RC.2 offline validation and exact installed/served hashes verified |
| Published release containing the metadata and module | RC.2 and RC.1 published; beta.7 has no named release |
| Upstream HACS validation with no ignored checks | RC.1 passed all 8 applicable checks on 3 November 2026; no beta.7 installer acceptance implied |
| HACS and Marketplace install, update, removal, migration and recovery | RC.2 Marketplace manual-to-installer Lab installation passed; broader lifecycle and older HACS acceptance remain incomplete |
| Default catalogue inclusion | Not submitted or claimed |

The intended versioned route uses a reviewed GitHub release with the standalone JS asset, software licence and package manifest. A manual ZIP or a bare tag is not that route. Keep internal reports, prompts and raw evidence out of release assets. Catalogue submission has [additional requirements](https://www.hacs.xyz/docs/publish/include/), including upstream validation and a published release; preparing the files does not complete those steps.

The RC.1 validation used the unmodified upstream action entry point at [`0704ffc6e790b9714c82384d8c564266434ff6f9`](https://github.com/hacs/integration/tree/0704ffc6e790b9714c82384d8c564266434ff6f9) in an isolated macOS Python environment, with no ignored checks. It was not a Docker run or a Home Assistant installation. Genuine update acceptance still needs two approved, installer-visible versions; reinstalling the same version does not prove an update.

### Existing installations and migration

Check file and resource ownership before an installer manages `www/community/thermal-intelligence/`. Stop if that directory or its resource prefix contains existing TI or unrelated files. The [reviewed Marketplace resource manager](https://github.com/home-assistant/core/blob/74cf5a49c63ed8d4d87717844bf14f79c28c9cea/homeassistant/components/marketplace/repositories/plugin.py) updates resources by repository-folder prefix and removes entries in that prefix on uninstall. Renaming a card does not isolate those resources.

The resource-manager source above is from HA 2026.11.0; source review alone does not establish installer acceptance; the separate RC.2 Lab result covers only the recorded route. Test storage-mode resources, YAML resources, `frontend.extra_module_url`, legacy `/hacsfiles/` paths, `/local/community/` paths, duplicate loading and fresh-document caching separately. Preserve genuine unknown and unavailable provider states. An HA/HACS migration may require a full backup restore; reverting a JS resource only rolls back the frontend. Keep these checks separate from the recorded RC.1 observation and from physical heating claims.

## Resource loading

Add the module once as a **JavaScript module** resource. After updating its versioned URL, open a fresh browser document before checking the card and editor. A custom element already registered in an open page cannot be replaced in place.

RC.2 retains `custom:thermal-intelligence-beta-card`, with the picker name **Thermal Intelligence Thermostat · RC**. Beta and RC packages share their trial registrations; load only one of those modules in a document. Keep existing legacy TI resources and card types in place. See [upgrade and rollback](migration.md).

`scripts/package_beta.py` packages both explicit `-beta.N` and `-rc.N` versions from an immutable commit. Its manifest records the version, channel, delivery branch, exact commit/tree and file hashes. It rejects stable versions and mismatched bundles. The script name is retained for existing beta tooling.

## Default-branch discovery and release selection

The default branch carries the exact published RC.2 module and licence for repository discovery, with a strict hash check. The RC.1 release remains unchanged. Both Marketplace and HACS read `hacs.json`; branch inspection or matching bytes alone do not prove named-release selection. Capture the selected version and installer origin as well as the served bytes. Reproduce published assets from their original release commit; packaging the promotion commit would change manifest provenance and is not a replacement release.
