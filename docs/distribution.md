# Distribution

[Thermal Intelligence v1.0.1](https://github.com/senyo888/thermal-intelligence/releases/tag/v1.0.1) was published on 27 November 2026. The [release manifest](https://github.com/senyo888/thermal-intelligence/releases/download/v1.0.1/manifest.json) identifies commit `b9150b7`. All three downloads matched the package built from that commit. [Checksums and Marketplace upgrade](compatibility.md#101-package).

Use [Marketplace](marketplace.md) on Home Assistant 2026.11 and later, or [HACS](hacs.md) on older installations. For an existing installation, follow [update and rollback](migration.md).

| Branch | Contents |
| --- | --- |
| `main` | Public documentation, website and the promoted stable card and licence |
| `develop` | Release-candidate source, tests and reproducible candidate package |
| `senyo888-patch-1` | Branch for beta development and packages; verify its current commit before use |

The package contains the JavaScript module, software licence and a manifest identifying its source and hashes. Website content, images, development tools and private records are excluded. The bundle is self-contained and does not download runtime dependencies.

## Marketplace and older HACS installations

Search for **Thermal Intelligence** in Marketplace or HACS and open the **Dashboard** card by **senyo888**. The [default catalogue entry](https://github.com/hacs/default/pull/14872) was accepted on 26 November 2026.

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

The destination must not exist. This produces separate `thermal-intelligence.js`, `LICENSE` and `manifest.json` files locally. The manifest records the immutable source, package hashes and distribution metadata. These are candidate release assets; the command does not publish or install them. `hacs.json` stays at the repository root of the selected source revision.

The distribution check rejects wrong filenames, root modules that would shadow `dist/`, missing or changed licence text, extra payload files, symlinks, executable files, source maps and mismatched module versions. It deliberately accepts only TI's reviewed manifest options. CI checks the committed input and reproduces both manual and Marketplace candidate packages.

### Prepare a stable package

Build from the exact commit whose package and generated module identify the intended stable version. Complete the [compulsory documentation review](../CONTRIBUTING.md#required-release-documentation-review) before tagging or publication. To prepare the files locally, run

```sh
python3 -B scripts/package_release.py --commit REVIEWED_STABLE_COMMIT --marketplace --output /tmp/ti-stable-candidate
```

Omit `--marketplace` for the manual package. Both routes produce the same three asset filenames and preserve `custom:thermal-intelligence-beta-card` and its editor registration for existing configurations. New stable cards and exports use `custom:thermal-intelligence-thermostat`. The stable picker name is **Thermal Intelligence Thermostat**. The older `custom:thermal-intelligence-card` remains independently owned and is never replaced.

`package_beta.py` continues to accept only beta and RC versions; `package_release.py` accepts only stable versions. CI uses `package_candidate.py` for all three validated channels. Every route reads committed files, checks the exact generated version and channel, and rejects an existing output directory. A stable manifest's `delivery_branch: main` records its intended destination only. These commands do not promote a branch, create a tag, publish a release or install the module.

Changing the version or picker changes the module bytes. Validate that resulting package and its upgrade and rollback paths separately; acceptance of an RC does not establish acceptance of a different stable module.

### Installation and release checks

The [1.0.1 package record](compatibility.md#101-package) covers both delivery and the saved-card upgrade. The [1.0.0 record](v1.0.0-package.md) preserves the earlier installation and rollback results.

| Check | Status |
| --- | --- |
| Repository description, topics, README images and software licence | Present |
| Dashboard metadata, bounded install directory and repeatable candidate assets | The v1.0.1 package reproduces from the tagged commit and contains the card, GPL licence and manifest. |
| Published files | All three [v1.0.1 downloads](https://github.com/senyo888/thermal-intelligence/releases/tag/v1.0.1) matched their [recorded checksums](compatibility.md#101-package). |
| HACS plugin validation | The official [Dashboard plugin validation](https://github.com/senyo888/thermal-intelligence/actions/runs/46037190950) passed for the v1.0.1 tag. |
| Installer coverage | Marketplace installed v1.0.0 from the default catalogue and upgraded the saved dashboard to v1.0.1 on HA 2026.11.2. The earlier candidate covered rollback, reinstall and removal. Older HACS installation and full backup restoration remain unverified. [Coverage by version](compatibility.md). |
| Default catalogue | [Accepted on 26 November 2026](https://github.com/hacs/default/pull/14872). Search for **Thermal Intelligence** by **senyo888** in the Dashboard catalogue. |

Use the manifest attached to the published release to verify downloads. The v1.0.1 release note also links to the preparation manifest from `0d2075b`. It identified the tested card and licence before publication. The [published manifest](https://github.com/senyo888/thermal-intelligence/releases/download/v1.0.1/manifest.json) identifies the actual tagged commit, `b9150b7`.

### Existing installations and migration

Check file and resource ownership before an installer manages `www/community/thermal-intelligence/`. Stop if that directory or its resource prefix contains existing TI or unrelated files. The [reviewed Marketplace resource manager](https://github.com/home-assistant/core/blob/74cf5a49c63ed8d4d87717844bf14f79c28c9cea/homeassistant/components/marketplace/repositories/plugin.py) updates resources by repository-folder prefix and removes entries in that prefix on uninstall. Renaming a card does not isolate those resources.

The resource-manager source above is from HA 2026.11.0; source review alone does not establish installer acceptance; the version-specific results above identify the routes exercised in Home Assistant. Test storage-mode resources, YAML resources, `frontend.extra_module_url`, legacy `/hacsfiles/` paths, `/local/community/` paths, duplicate loading and fresh-document caching separately. Preserve genuine unknown and unavailable provider states. An HA/HACS migration may require a full backup restore; reverting a JS resource only rolls back the frontend.

## Resource loading

Add the module once as a **JavaScript module** resource. After updating its versioned URL, open a fresh browser document before checking the card and editor. A custom element already registered in an open page cannot be replaced in place.

The v1.0.1 module supports the original standalone card and editor aliases used by saved dashboards. Update the existing standalone resource and open a fresh tab. Keep the separately owned legacy TI resource in place. [Update and rollback](migration.md).

`scripts/package_beta.py` packages both explicit `-beta.N` and `-rc.N` versions from an immutable commit. Its manifest records the version, channel, delivery branch, exact commit/tree and file hashes. It rejects stable versions and mismatched bundles. The script name is retained for existing beta tooling.

## Default-branch discovery and release selection

The default branch carries its separately reviewed module and licence for repository discovery, with a strict hash check. For the stable card, select the version listed on the [latest release](https://github.com/senyo888/thermal-intelligence/releases/latest). The installation record identifies the version Marketplace actually selected. Both Marketplace and HACS read `hacs.json`; branch inspection or matching bytes alone do not prove named-release selection. Capture the selected version and installer origin as well as the served bytes. Reproduce published assets from their original release commit; a later promotion commit would change manifest provenance and is not a replacement release.
