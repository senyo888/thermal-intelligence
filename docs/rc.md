# Release candidate 0.1.0-rc.2

RC.2 is being prepared through `develop`. It brings the beta.5–beta.7 changes into the standalone thermostat card: explicitly disabled VT locking no longer blocks ordinary controls, and eligible standard thermostats can expose one deliberately enrolled switch with confirmation before On or Off. It also retires completed request notices after context loss or a contrary provider report. No TI controller is required.

**This candidate is not published or installed yet.** [RC.1](rc-1.md) remains the published prerelease, and the [beta.7 record](beta-7.md) retains its exact package and historical checks. RC.1 assets are unchanged.

## Installation route

For Home Assistant 2026.11 and later, follow [Marketplace installation](marketplace.md). Select the exact named RC.2 release only after publication; do not substitute a branch download. Earlier Home Assistant installations use the [HACS route](hacs.md). Installer lifecycle acceptance remains pending.

Retain the prior trial module and card configuration. The card type remains `custom:thermal-intelligence-beta-card`, with **Thermal Intelligence Thermostat · RC** in the picker. Beta and RC packages share trial registrations; load one trial module per document and preserve legacy TI separately.

Schema-1 cards remain supported. Optional switch enrollment uses schema 2; returning to RC.1 requires both the original schema-1 configuration and its matching module. See [configuration](card-configuration.md), [optional switch behavior](optional-switch-control.md) and [migration](migration.md).

## Reproduce a reviewed candidate

From a clean checkout of its exact reviewed commit:

```sh
npm ci --no-audit --no-fund
npm run build
git diff --exit-code -- dist/
python3 -B scripts/check_marketplace.py --commit REVIEWED_COMMIT
python3 -B scripts/package_beta.py --commit REVIEWED_COMMIT --marketplace --output /tmp/ti-rc2-candidate
```

Replace `REVIEWED_COMMIT` with the selected immutable SHA. The destination must not exist. Packaging reads committed blobs and emits `thermal-intelligence.js`, `LICENSE` and `manifest.json`. The manifest records version, `rc` channel, `develop` delivery route, source commit/tree, sizes and SHA-256 digests. Building or packaging does not publish or install the candidate.

## Validation and limits

Local candidate checks passed 158 unit tests, 97 Chromium browser tests, 13 packaging tests, eight distribution tests and ten foundation regression tests. These checks cover synthetic behavior and packaging, not a live installation. Candidate results must be bound to the reviewed commit and package. Historical beta checks do not count as RC.2 installation, physical-device acceptance or soak completion. Service acceptance, reported setting, native-device output and room warming remain separate evidence. See [Compatibility](compatibility.md).

The card sends no requests during setup, rendering, editor cancellation or reconnect. A completed request’s stored result remains historical evidence; its success notice is removed when context or current provider evidence no longer supports displaying it. Failed and unresolved outcomes retain their uncertainty, and late replies cannot replay a request.

Schedules, persistent holds and automatic recovery remain outside this standalone frontend. Any future TI backend would be a separately installed component.
