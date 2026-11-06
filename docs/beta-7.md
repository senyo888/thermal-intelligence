# Beta.7 registry compatibility correction

Version **0.1.0-beta.7** fixes a false unavailable status in the optional switch control. Home Assistant can represent an absent device ID as `undefined` in frontend metadata and `null` in its registry response. TI now treats those two absent values as equivalent for `device_id` only. Real identity differences still block the control.

No new settings, controller or backend are required. Existing schema-1 and schema-2 configurations are retained. VT, helpers, group/template switches and multiple mappings remain unsupported for the optional row. Each eligible On or Off action still requires confirmation; setup, rendering and reconnect do not send commands. See [optional switch setup and limits](optional-switch-control.md).

## Exact package

- Source commit: [`9196b9e77b9403b4dde953f136fc84aca9a6331a`](https://github.com/senyo888/thermal-intelligence/commit/9196b9e77b9403b4dde953f136fc84aca9a6331a).
- [Download the exact module](https://raw.githubusercontent.com/senyo888/thermal-intelligence/9196b9e77b9403b4dde953f136fc84aca9a6331a/dist/thermal-intelligence.js): **195,985 bytes**.
- SHA256: `3349ffd936bfb4e1cff4e91d8ac9894a712bfac07d62cbdab15f612b4731a614`.

This is an untagged beta on `senyo888-patch-1`. It does not change the RC.1 tag or release assets. The [beta.6 package](beta-6.md) remains available at its recorded commit.

From a source checkout containing the exact commit, create a package in an unused directory:

```sh
python3 scripts/package_beta.py \
  --commit 9196b9e77b9403b4dde953f136fc84aca9a6331a \
  --output /tmp/thermal-intelligence-beta-7
```

The package includes the module, licence and manifest with source commit/tree and file hashes. Each package format is reproducible, and both contain the same module bytes. The card and editor retain their existing trial registrations.

## Validation and limits

**152 unit tests, 94 synthetic browser checks, 13 packaging tests and 8 distribution tests passed.** The added regression fails on beta.6. It checks absent device IDs on either selected entity and preserves real device/other identity mismatches. Browser fixtures use HA's device-less metadata shape and verify that a real identity change invalidates confirmation without sending or replaying a request. Existing provider exclusions and command guards remain covered. Foundation, public-data, whitespace and redacted secret checks passed.

Beta.7 has not yet been installed or accepted with a live eligible switch. Its correction follows a beta.6 test on HA 2026.11.0; that finding and the separate inert VT disabled-lock check are recorded in [Compatibility](compatibility.md). Synthetic tests do not prove physical response, real Honeywell behavior, backend permissions, HACS/Marketplace installation or a minimum supported HA version.

## Update and rollback

Keep the current trial resource, module and card configuration. Verify the downloaded digest, use a new versioned filename, change only the trial resource and open a fresh browser document. Load one trial module per document; retain separate legacy TI cards and resources. A frontend resource update does not need a Core restart.

Beta.6 and beta.7 accept the same configuration schemas. Returning to beta.6 can restore the false registry block. Returning to RC.1 or beta.5 after optional-switch enrollment requires restoring both the original schema-1 configuration and matching module. Removing a mapping or changing the module does not send Off or undo a deliberate provider action. See [migration](migration.md).
