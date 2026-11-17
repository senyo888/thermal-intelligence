# Release candidate 0.1.0-rc.2

This is the historical RC.2 release record. For the current prerelease and installation instructions, use [RC.3](rc-3.md).

RC.2 is a published prerelease of the standalone thermostat card. It brings the beta.5–beta.7 changes: explicitly disabled VT locking no longer blocks ordinary controls, and eligible standard thermostats can expose one deliberately enrolled switch with confirmation before On or Off. It also retires completed request notices after context loss or a contrary provider report. No TI controller is required.

[Release v0.1.0-rc.2](https://github.com/senyo888/thermal-intelligence/releases/tag/v0.1.0-rc.2) was published on 9 November 2026 from `6d0833f20e9e071d94d2f09f00c1a4d4a34f1805`. [RC.3](rc-3.md) was published separately on 14 November 2026; this RC.2 package remains unchanged. Documentation updates do not change either released tag or its assets. [RC.1](rc-1.md) and the [beta.7 record](beta-7.md) retain their historical identities.

## Installation route

For Home Assistant 2026.11 and later, follow [Marketplace installation](marketplace.md) and explicitly select `v0.1.0-rc.2`. Its bounded custom-repository Lab installation passed; update, removal and recovery acceptance remain incomplete. Earlier Home Assistant installations use the [HACS route](hacs.md).

Retain the prior trial module and card configuration. The card type remains `custom:thermal-intelligence-beta-card`, with **Thermal Intelligence Thermostat · RC** in the picker. Beta and RC packages share trial registrations; load one trial module per document and preserve legacy TI separately.

Schema-1 cards remain supported. Optional switch enrollment uses schema 2; returning to RC.1 requires both the original schema-1 configuration and its matching module. See [configuration](card-configuration.md), [optional switch behavior](optional-switch-control.md) and [migration](migration.md).

## Manual installation and rollback

Use this route only for a manually managed trial. Keep Marketplace/HACS-managed resources with their owning installer.

1. Take and verify a fresh backup. Save the affected card configuration and resource list; retain the previous trial module and URL if updating. Check that the example directory below is unowned or belongs only to this trial; choose a different dedicated directory if it conflicts with existing TI.
2. Download the three [RC.2 release assets](https://github.com/senyo888/thermal-intelligence/releases/tag/v0.1.0-rc.2). Verify the sizes and SHA-256 hashes below. Copy the module and accompanying `LICENSE` into the dedicated manual directory, naming the module `/config/www/thermal-intelligence-trial/thermal-intelligence-rc2-626f426b213d.js`. Retain the manifest with your recovery record.
3. Register `/local/thermal-intelligence-trial/thermal-intelligence-rc2-626f426b213d.js` once as a **JavaScript module** resource. For an update, change only the existing trial resource URL instead of adding another. Preserve legacy resources and do not load a second beta/RC trial module.
4. Open a fresh browser document. Select **Thermal Intelligence Thermostat · RC** in Add Card or open the existing trial card. Check the version, selected thermostat, observations and editor open/cancel before deliberate controls. If Home Assistant requires a restart because `www` did not exist at startup, stop and plan that separately.

For a first-install rollback, remove only the trial cards/view and resource registration you added, then open a fresh document and verify existing cards. For an update rollback, restore the retained trial URL and matching saved configuration, preserving newer unrelated dashboard edits. Retain the files for recovery. A frontend rollback neither restores installer state nor undoes thermostat commands; see [update and rollback](migration.md).

## Reproduce a reviewed candidate

From a clean checkout of its exact reviewed commit:

```sh
npm ci --no-audit --no-fund
npm run build
git diff --exit-code -- dist/
python3 -B scripts/check_marketplace.py --commit REVIEWED_COMMIT
python3 -B scripts/package_beta.py --commit REVIEWED_COMMIT --marketplace --output /tmp/ti-rc2-candidate
```

To reproduce the published assets, replace `REVIEWED_COMMIT` with `6d0833f20e9e071d94d2f09f00c1a4d4a34f1805`. Packaging a later documentation/promotion commit produces different source metadata and must not replace the published manifest. The destination must not exist. Packaging reads committed blobs and emits `thermal-intelligence.js`, `LICENSE` and `manifest.json`. The manifest records version, `rc` channel, `develop` delivery route, source commit/tree, sizes and SHA-256 digests. Building or packaging does not publish or install the candidate.

## Exact published assets

| Asset | Bytes | SHA-256 |
| --- | ---: | --- |
| `thermal-intelligence.js` | 199166 | `626f426b213d58cf142201fb3f97e5e5887e0f795d2b55c02229d663c5c13624` |
| `manifest.json` | 1438 | `c30c6dfaeeacf2bc8bfc2ece61e9d472d811ef4120fb50dd57a0bf4aefa0d55c` |
| `LICENSE` | 34674 | `fb981668c18a279e285fc4d83fba1e836cc84dd4daa73c9697d3cfd2d8aca6e0` |

## Validation and limits

[Post-publication checks](rc2-validation.md) record the 9 November Marketplace installation and 12 November bounded two-card controls, natural Boost expiry, longer observation and maintainer-confirmed physical heating. They also retain a recovered external controller incident. No formal RC.2 soak or broad physical-client acceptance is claimed.

Local candidate checks passed 166 unit tests, 102 Chromium browser tests, 13 packaging tests, eight distribution tests and fourteen foundation regression tests. These checks cover synthetic behavior and packaging, not a live installation. Candidate results must be bound to the reviewed commit and package. Historical beta checks do not count as RC.2 installation, physical-device acceptance or soak completion. Service acceptance, reported setting, native-device output and room warming remain separate evidence. See [Compatibility](compatibility.md).

The card sends no requests during setup, rendering, editor cancellation or reconnect. A completed request’s stored result remains historical evidence; its success notice is removed when context or current provider evidence no longer supports displaying it. Failed and unresolved outcomes retain their uncertainty, and late replies cannot replay a request.

Schedules, persistent holds and automatic recovery remain outside this standalone frontend. Any future TI backend would be a separately installed component.

## Corrections released in RC.3

RC.2 retains three confirmed issues: submillisecond report ordering can preserve an obsolete Observed result, an explicitly disabled valve mapping can hide thermostat activity, and a long read-only-lock heading can overflow. The [RC.3 release](rc-3.md) corrects these with regression tests. These corrections do not change this RC.2 release or its historical acceptance.
