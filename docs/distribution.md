# Distribution

Version [1.0.1](v1.0.1.md) adds the confirmed control-source glow. The [releases page](https://github.com/senyo888/thermal-intelligence/releases/latest) lists the latest downloadable stable package.

[Thermal Intelligence 1.0.0](https://github.com/senyo888/thermal-intelligence/releases/tag/v1.0.0) was published on 24 November 2026 from `main` at `4e6b941`. A clean Marketplace installation on Home Assistant 2026.11.2 selected the public tag and served the card, GPL licence and manifest with matching SHA-256 hashes. [Package identity and verification](v1.0.0-package.md)

Use [Marketplace](marketplace.md) on Home Assistant 2026.11 and later, or [HACS](hacs.md) on older installations. Users maintaining a prerelease can find its original files and rollback guidance in the [RC.3](rc-3.md), [RC.2](rc.md), [RC.1](rc-1.md) and [beta.7](beta-7.md) records.

[RC.4](rc-4.md) was tested by commit during development of 1.0.0. It had no named release.

| Branch | Contents |
| --- | --- |
| `main` | Public documentation, website and the promoted stable card and licence |
| `develop` | Release-candidate source, tests and reproducible candidate package |
| `senyo888-patch-1` | Branch for beta development and packages; verify its current commit before use |

The package contains the JavaScript module, software licence and a manifest identifying its source and hashes. Website content, images, development tools and private records are excluded. The bundle is self-contained and does not download runtime dependencies.

## Marketplace and older HACS installations

Search for **Thermal Intelligence** in Marketplace or HACS and open the **Dashboard** card by **senyo888**. The [default catalogue entry](https://github.com/hacs/default/pull/14872) was accepted on 26 November 2026. The older [RC.2 installation record](rc2-validation.md) applies only to that prerelease.

The root [`hacs.json`](../hacs.json) names `thermal-intelligence.js`, uses the `dist/` layout and hides the default branch as a download choice. Stable releases follow the patch → develop → main pull request sequence. Package the tagged commit to reproduce its published manifest.

The build writes `thermal-intelligence.js` and a copy of the software `LICENSE` to `dist/`. The distribution check rejects any extra files, including leftovers from earlier builds. There are no runtime dependencies to fetch. No minimum Home Assistant or HACS version is declared until the supported range is established. The manifest does not use integration-only ZIP or persistent-directory options. See the official [Dashboard requirements](https://www.hacs.xyz/docs/publish/plugin/) and [manifest guidance](https://www.hacs.xyz/docs/publish/start/).

### Check and prepare a candidate

From a clean source checkout of the exact reviewed commit, replacing `REVIEWED_COMMIT` below with that same SHA:

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
python3 -B scripts/package_candidate.py --commit REVIEWED_COMMIT --marketplace --output /tmp/ti-marketplace-candidate
```

The destination must not exist. This produces separate `thermal-intelligence.js`, `LICENSE` and `manifest.json` files locally. The manifest records the immutable source, package hashes and distribution metadata. These are candidate release assets; the command does not publish or install them. `hacs.json` stays at the repository root of the selected source revision. The released RC.1 source already contains its own metadata; preparing or promoting RC.3 does not change that release.

The distribution check rejects wrong filenames, root modules that would shadow `dist/`, missing or changed licence text, extra payload files, symlinks, executable files, source maps and mismatched module versions. It deliberately accepts only TI's reviewed manifest options. CI checks the committed input and reproduces both manual and Marketplace candidate packages.

### Prepare a stable package

The stable packaging route is available for release preparation. It requires an immutable commit whose package version and generated module both identify the same stable version, such as `1.0.0`:

```sh
python3 -B scripts/package_release.py --commit REVIEWED_STABLE_COMMIT --marketplace --output /tmp/ti-stable-candidate
```

Omit `--marketplace` for the manual package. Both routes produce the same three asset filenames and preserve `custom:thermal-intelligence-beta-card` and its editor registration for existing configurations. New stable cards and exports use `custom:thermal-intelligence-thermostat`. The stable picker name is **Thermal Intelligence Thermostat**. The older `custom:thermal-intelligence-card` remains independently owned and is never replaced.

`package_beta.py` continues to accept only beta and RC versions; `package_release.py` accepts only stable versions. CI uses `package_candidate.py` for all three validated channels. Every route reads committed files, checks the exact generated version and channel, and rejects an existing output directory. A stable manifest's `delivery_branch: main` records its intended destination only. These commands do not promote a branch, create a tag, publish a release or install the module.

Changing the version or picker changes the module bytes. Validate that resulting package and its upgrade and rollback paths separately; acceptance of an RC does not establish acceptance of a different stable module.

### Installation and release checks

[1.0.1 dashboard and package checks](compatibility.md#101-package) cover the final card module. The published installation results below were recorded for 1.0.0.

| Check | Status |
| --- | --- |
| Repository description, topics, README images and software licence | Present |
| Dashboard metadata, bounded install directory and repeatable candidate assets | Reproducible 1.0.0 packages contain the reviewed card, GPL licence and manifest. See the [package record](v1.0.0-package.md). |
| Published files | [v1.0.0](https://github.com/senyo888/thermal-intelligence/releases/tag/v1.0.0) includes the card, licence and [manifest](https://github.com/senyo888/thermal-intelligence/releases/download/v1.0.0/manifest.json). All three public downloads matched the release checksums. |
| HACS plugin validation | All eight applicable [checks on v1.0.0](https://github.com/senyo888/thermal-intelligence/actions/runs/45459007561) passed with none disabled. |
| Installer coverage | The v1.0.0 Marketplace clean install and upgrade were verified on HA 2026.11.2. The earlier candidate covered rollback, reinstall and removal. Older HACS installation and full backup restoration remain unverified. [Coverage by version](compatibility.md). |
| Default catalogue | [Accepted on 26 November 2026](https://github.com/hacs/default/pull/14872). Search for **Thermal Intelligence** by **senyo888** in the Dashboard catalogue. |

The intended versioned route uses a reviewed GitHub release with the standalone JS asset, software licence and package manifest. A manual ZIP or a bare tag is not that route. Keep internal reports, prompts and raw evidence out of release assets. Catalogue submission has [additional requirements](https://www.hacs.xyz/docs/publish/include/), including upstream validation and a published release; preparing the files does not complete those steps.

The RC.1 validation used the unmodified upstream action entry point at [`0704ffc6e790b9714c82384d8c564266434ff6f9`](https://github.com/hacs/integration/tree/0704ffc6e790b9714c82384d8c564266434ff6f9) in an isolated macOS Python environment, with no ignored checks. It was not a Docker run or a Home Assistant installation. Genuine update acceptance still needs two approved, installer-visible versions; reinstalling the same version does not prove an update.

### Existing installations and migration

Check file and resource ownership before an installer manages `www/community/thermal-intelligence/`. Stop if that directory or its resource prefix contains existing TI or unrelated files. The [reviewed Marketplace resource manager](https://github.com/home-assistant/core/blob/74cf5a49c63ed8d4d87717844bf14f79c28c9cea/homeassistant/components/marketplace/repositories/plugin.py) updates resources by repository-folder prefix and removes entries in that prefix on uninstall. Renaming a card does not isolate those resources.

The resource-manager source above is from HA 2026.11.0; source review alone does not establish installer acceptance; the version-specific results above identify the routes exercised in Home Assistant. Test storage-mode resources, YAML resources, `frontend.extra_module_url`, legacy `/hacsfiles/` paths, `/local/community/` paths, duplicate loading and fresh-document caching separately. Preserve genuine unknown and unavailable provider states. An HA/HACS migration may require a full backup restore; reverting a JS resource only rolls back the frontend. Keep these checks separate from the recorded RC.1 observation and from physical heating claims.

## Resource loading

Add the module once as a **JavaScript module** resource. After updating its versioned URL, open a fresh browser document before checking the card and editor. A custom element already registered in an open page cannot be replaced in place.

RC.3 retains `custom:thermal-intelligence-beta-card`, with the picker name **Thermal Intelligence Thermostat · RC**. The stable module also supports the beta and RC card and editor registrations; load only one of those modules in a document. A stable upgrade replaces the selected beta/RC resource; do not add it alongside that resource. Keep existing legacy TI resources and card types in place. See [upgrade and rollback](migration.md).

`scripts/package_beta.py` packages both explicit `-beta.N` and `-rc.N` versions from an immutable commit. Its manifest records the version, channel, delivery branch, exact commit/tree and file hashes. It rejects stable versions and mismatched bundles. The script name is retained for existing beta tooling.

## Default-branch discovery and release selection

The default branch carries its separately reviewed module and licence for repository discovery, with a strict hash check. For the stable card, select the version listed on the [latest release](https://github.com/senyo888/thermal-intelligence/releases/latest). The installation record identifies the version Marketplace actually selected. Both Marketplace and HACS read `hacs.json`; branch inspection or matching bytes alone do not prove named-release selection. Capture the selected version and installer origin as well as the served bytes. Reproduce published assets from their original release commit; a later promotion commit would change manifest provenance and is not a replacement release.
