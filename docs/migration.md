# Update and rollback

RC.2 retains existing **schema-1** and **schema-2** configurations. Explicit enrollment of the optional switch control, introduced in beta.6, uses **schema 2**; keep the original configuration for rollback. The trial card type is `custom:thermal-intelligence-beta-card`; its editor is `thermal-intelligence-beta-card-editor`.

## Keep existing TI alongside the trial card

Keep existing `custom:thermal-intelligence-card` instances and their resources in place. Add new trial cards through **Thermal Intelligence Thermostat · RC**. The wider system keeps responsibility for schedules, holds, ownership, cutoff and recovery controls. Preserve its backend-dependent cards and their types.

## Update an existing trial card

1. Retain the previous bundle, resource URL and saved card configuration.
2. Use the [candidate package record](rc.md) and verify its digest. RC.2 is not yet published; do not substitute a branch download for an unavailable named release.
3. Save it under a new versioned filename and change only the beta resource URL. Do not register a second copy.
4. Open a fresh browser document, reopen the visual editor and check the thermostat, provider details and source mappings.

A frontend-only resource update does not require a Home Assistant Core restart. Saving or reopening card configuration sends no thermostat command.

## Roll back

Restore the previous trial resource URL and open a fresh browser document. A custom element already registered in an open page cannot be replaced in place. Restore saved card configuration separately if you intentionally changed it; avoid overwriting newer dashboard edits.

For a first installation, remove only the added trial cards/view and its resource registration. Keep existing resources and dashboards in place. Frontend rollback does not undo thermostat settings or a deliberate VT lock command; check the provider's reported state separately.

## Version notes

| Update | Configuration and rollback behaviour |
| --- | --- |
| RC.1 → RC.2 | Schema 1 remains supported. Optional switch enrollment uses schema 2; returning to RC.1 requires the original schema-1 configuration and module. |
| beta.7 → RC.2 | Existing schema 1 and 2 settings remain supported. RC picker/version identity and current request-status presentation change. |
| beta.6 → beta.7 | No new settings or schema changes. Corrects a false registry mismatch for absent device IDs. Returning to beta.6 can restore the block. |
| beta.1 → beta.2 | Adds administrator lock controls without a new option. Codes are entered at runtime and never saved in card configuration. |
| beta.2 → beta.3 | Adds optional `response_arc` settings. Unmapped cards retain their existing fallback. Beta.2 preserves the unknown object but cannot display corroborated warming. |
| beta.5 → beta.6 | Optional switch enrollment requires schema 2. Older modules reject it; restore both the saved schema-1 configuration and its module when rolling back. |
| beta.4 → beta.5 | No new settings. Explicitly disabled VT locking no longer shows a residual lock or blocks ordinary controls. Rolling back can restore that false lock block. |
| beta.3 → beta.4 | No new settings. Explicitly null VT Off/Mode reasons show **None reported**. Returning to beta.3 can restore the false amber warning. |

Unknown top-level options and nested feature, telemetry, humidity and response fields survive editor round trips; preservation does not make an unknown option operational. Unsupported explicit schema versions are rejected.

For early development configurations, `background` selects `blue`, `plum` or `black`; the prototype `theme` field is preserved but inactive. Explicit legacy two-boundary humidity guides keep their three-band meaning until you choose the four-boundary format. See [configuration](card-configuration.md) for mappings, precedence and visual settings.

## Beta.6 optional switch configuration

The optional switch control is available from beta.6 and retained in RC.2; it is absent from beta.5 and RC.1. Existing schema-1 cards stay unchanged. Explicit enrollment uses schema 2; older modules reject that schema. Retain the original schema-1 card configuration before enabling it. To roll back, restore both the original configuration and its matching module/resource, then open a fresh browser document. Removing the optional row does not send Off or undo external effects. See [optional switch setup and limits](optional-switch-control.md).

## RC.1 coexistence

All betas and the published RC.1 use the same trial card and editor registrations. Load only one trial module in a browser document; changing the trial resource requires a fresh document. Keep the separate legacy TI resources and cards unchanged. Untagged beta updates do not change the RC.1 tag or its release assets.

## Marketplace-managed installations

On Home Assistant 2026.11 and later, follow [Marketplace installation and recovery](marketplace.md). Keep the generated resource URL and installer ownership intact. The manual resource procedure above is not an installer downgrade or a full environment restore. Save the card configuration as well as its module before changing schema or installation method.
