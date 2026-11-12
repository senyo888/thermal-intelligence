# Beta.6 optional switch candidate

Version **0.1.0-beta.6** adds one optional switch control to the standalone thermostat card. For a registered standard thermostat, select a registered switch in the visual editor and explicitly enable it. Each On or Off request needs confirmation. No TI controller, integration or add-on is required.

The switch may affect thermostat modes or trigger other automations. Honeywell emergency-heat On requests emergency heat; turning active emergency heat Off can turn the system Off. TI does not restore Heat, previous targets or modes. VT anchors, helpers, known group/template switches and multiple mappings are outside this version. Read [setup and provider limits](optional-switch-control.md) before enabling it.

## Exact package

- Source commit: [`cb8d285aa116a52c1da5ee7669ab2874592f2363`](https://github.com/senyo888/thermal-intelligence/commit/cb8d285aa116a52c1da5ee7669ab2874592f2363).
- [Download the exact module](https://raw.githubusercontent.com/senyo888/thermal-intelligence/cb8d285aa116a52c1da5ee7669ab2874592f2363/dist/thermal-intelligence.js): **195,917 bytes**.
- SHA256: `3e66911e9c371991da09b3105d961650567fdabc6cf52352f4b250f236b1ee2f`.

This untagged beta was published through `senyo888-patch-1`, not a GitHub release. RC.1 keeps its original tag and assets. The [beta.5 package](beta-5.md) remains available at its recorded commit.

From a source checkout containing that commit, create a package in an unused directory:

```sh
python3 scripts/package_beta.py \
  --commit cb8d285aa116a52c1da5ee7669ab2874592f2363 \
  --output /tmp/thermal-intelligence-beta-6
```

The package contains the module, licence and a manifest binding the exact source commit/tree and file hashes. Repeated builds and both package formats reproduced identical bytes. The module retains `custom:thermal-intelligence-beta-card` and `thermal-intelligence-beta-card-editor`.

## Validation and limits

**151 unit tests, 93 synthetic browser checks, 13 packaging tests and 8 distribution tests passed.** Coverage includes enrollment and unknown configuration preservation, both confirmation directions, captured target/session changes, registry events, timestamp ordering, unresolved requests, no automatic retries, keyboard controls and phone/tablet/desktop layouts. Existing disabled-lock behavior from beta.5 is retained. Public-file, privacy, whitespace and redacted secret checks passed.

This candidate has not been installed or tested against a real Honeywell/provider device. Browser fixtures do not establish physical response, backend permission behavior, HACS/Marketplace acceptance or a minimum supported Home Assistant version. See [Compatibility](compatibility.md).

## Install, update and rollback

For a manual trial, retain the current trial module, resource URL and saved card configuration. Verify the downloaded digest, save it under a new versioned filename and change only the trial JavaScript-module resource. Register the module once and open a fresh browser document before checking the card and editor. A frontend resource update does not require a Core restart. Preserve separate legacy TI resources and cards.

Beta.6, earlier betas and RC.1 share trial registrations: load only one trial module per document. Existing schema-1 settings stay unchanged. Enabling the optional switch explicitly enrolls schema 2; older modules reject that schema.

To roll back after enrollment, restore both the saved schema-1 configuration and its matching module/resource, then open a fresh document. Avoid overwriting unrelated dashboard edits. Removing the optional row or rolling back the frontend sends no Off command and does not undo a deliberate provider command or downstream automation. See [migration](migration.md).
