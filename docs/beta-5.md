# Beta.5 disabled-lock candidate

Version **0.1.0-beta.5** is an untagged frontend candidate on `senyo888-patch-1`. It fixes VT locking reported disabled while an older locked flag remains. The published `v0.1.0-rc.1` and its assets are unchanged. No new controller or backend is required.

## Behavior

A lock icon requires explicitly configured locking. Explicitly disabled locking no longer blocks ordinary controls from a residual locked flag; connection, availability, readiness and other command checks still apply. Unknown configuration never clears a reported user lock. Removing configuration invalidates an open lock action, clears its code and shows **Lock not configured**, without an unlock or automatic dialog dismissal. Restoring configuration does not revive that action.

## Package and testing

The exact immutable source, module digest and completed validation will be recorded here after candidate verification. This preparation is not installation or physical-device acceptance. Do not substitute the moving branch name for an exact package identity.

The module retains `custom:thermal-intelligence-beta-card`, `thermal-intelligence-beta-card-editor` and schema-1 settings. Beta.4, beta.5 and RC.1 share these trial registrations: use one trial module per document and open a fresh document after changing its resource. The separate legacy TI card and resource remain untouched.

## Update and rollback boundaries

For a separately authorized trial, retain the current trial module, resource URL and card configuration. Use a new versioned filename, change only the existing trial resource URL and verify the served module before deliberate controls. No Core restart is required by a frontend resource change.

Rollback restores the retained trial resource URL and opens a fresh browser document. Do not overwrite a full dashboard or restore stale thermostat values. Returning to beta.4 or RC.1 can restore the disabled-lock defect. Frontend rollback does not undo a deliberate provider command. See the [migration guide](migration.md) and [historical beta.4 artifact](beta.md).

HACS installation/update behavior, physical devices and real heating response for beta.5 remain unverified. This candidate has not been deployed.
