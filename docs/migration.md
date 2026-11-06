# Update and rollback

Beta.7 retains existing **schema-1** and **schema-2** configurations. Explicit enrollment of the optional switch control, introduced in beta.6, uses **schema 2**; keep the original configuration for rollback. The beta card type is `custom:thermal-intelligence-beta-card`; its editor is `thermal-intelligence-beta-card-editor`.

## Keep existing TI alongside the beta

Keep existing `custom:thermal-intelligence-card` instances and their resources in place. Add new beta cards through **Thermal Intelligence Thermostat · Beta**. The standalone beta does not provide the wider system's schedules, holds, ownership, cutoff or recovery controls; do not replace backend-dependent cards by changing their type.

## Update an existing beta

1. Retain the previous bundle, resource URL and saved card configuration.
2. Download the [exact beta.7 candidate](beta-7.md) and verify its digest.
3. Save it under a new versioned filename and change only the beta resource URL. Do not register a second copy.
4. Open a fresh browser document, reopen the visual editor and check the thermostat, provider details and source mappings.

A frontend-only resource update does not require a Home Assistant Core restart. Saving or reopening card configuration sends no thermostat command.

## Roll back

Restore the previous beta resource URL and open a fresh browser document. A custom element already registered in an open page cannot be replaced in place. Restore saved card configuration separately if you intentionally changed it; avoid overwriting newer dashboard edits.

For a first installation, remove only the added beta cards/view and its resource registration. Keep existing resources and dashboards in place. Frontend rollback does not undo thermostat settings or a deliberate VT lock command; check the provider's reported state separately.

## Version notes

| Update | Configuration and rollback behaviour |
| --- | --- |
| beta.6 → beta.7 | No new settings or schema changes. Corrects a false registry mismatch for absent device IDs. Returning to beta.6 can restore the block. |
| beta.1 → beta.2 | Adds administrator lock controls without a new option. Codes are entered at runtime and never saved in card configuration. |
| beta.2 → beta.3 | Adds optional `response_arc` settings. Unmapped cards retain their existing fallback. Beta.2 preserves the unknown object but cannot display corroborated warming. |
| beta.5 → beta.6 | Optional switch enrollment requires schema 2. Older modules reject it; restore both the saved schema-1 configuration and its module when rolling back. |
| beta.4 → beta.5 | No new settings. Explicitly disabled VT locking no longer shows a residual lock or blocks ordinary controls. Rolling back can restore that false lock block. |
| beta.3 → beta.4 | No new settings. Explicitly null VT Off/Mode reasons show **None reported**. Returning to beta.3 can restore the false amber warning. |

Unknown top-level options and nested feature, telemetry, humidity and response fields survive editor round trips; preservation does not make an unknown option operational. Unsupported explicit schema versions are rejected.

For early development configurations, `background` selects `blue`, `plum` or `black`; the prototype `theme` field is preserved but inactive. Explicit legacy two-boundary humidity guides keep their three-band meaning until you choose the four-boundary format. See [configuration](card-configuration.md) for mappings, precedence and visual settings.

## Beta.6 optional switch configuration

The optional switch control is available in the untagged beta.6 candidate; it is absent from beta.5 and RC.1. Existing schema-1 cards stay unchanged. Explicit enrollment uses schema 2; older modules reject that schema. Retain the original schema-1 card configuration before enabling it. To roll back, restore both the original configuration and its matching module/resource, then open a fresh browser document. Removing the optional row does not send Off or undo external effects. See [optional switch setup and limits](optional-switch-control.md).

## RC.1 coexistence

All betas and the published RC.1 use the same trial card and editor registrations. Load only one trial module in a browser document; changing the trial resource requires a fresh document. Keep the separate legacy TI resources and cards unchanged. Untagged beta updates do not change the RC.1 tag or its release assets.
