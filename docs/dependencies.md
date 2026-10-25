# Build and dependency inventory

Candidate `0.1.0-dev.1` uses native custom elements, DOM, CSS and Home Assistant's supplied `hass` API. The JavaScript bundle has **no third-party runtime modules, remote fonts, runtime downloads or generated brand assets**. The small thermometer glyph is project code; selected branding remains separate. The build rejects non-`src/` inputs and external module imports.

| Development dependency | Pinned version | Package licence | Role |
| --- | --- | --- | --- |
| esbuild and its platform binary | 0.28.2 | MIT | Bundle/minify source |
| @playwright/test | 1.64.1 | Apache-2.0 | Browser regression runner |
| playwright / playwright-core | 1.64.1 | Apache-2.0 | Test browser control |

Versions and integrity hashes are in [package-lock.json](../package-lock.json). Licence fields and installed package notices were inspected for these exact versions. Optional `fsevents` is MIT. Browser binaries and their notices remain in Playwright's development cache; neither they nor `node_modules` enter the bundle. This inventory describes actual inclusion, not a blanket legal determination about unrelated future dependencies.

Build with Node 22 or newer and `npm ci`, then `npm run build`. Source, lockfile, build scripts and the GPL-3.0-only licence must accompany a distributed version. Source maps are disabled. CI rebuilds and compares the checked-in bundle, runs model/editor/command tests, and runs the synthetic Chromium suite. CI is configured locally; a successful local run does not establish a successful GitHub run for an unpublished branch.

See [source provenance](source-provenance.md), [licence scope](licensing-options.md) and [distribution](distribution.md). Marketing concepts and documentation remain subject to their separate, unselected reuse terms.
