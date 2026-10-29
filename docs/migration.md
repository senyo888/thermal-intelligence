# Update and rollback

Beta.4 uses **schema 1**. Existing beta.1–beta.3 card configurations need no migration. The beta card type is `custom:thermal-intelligence-beta-card`; its editor is `thermal-intelligence-beta-card-editor`.

## Keep existing TI alongside the beta

Keep existing `custom:thermal-intelligence-card` instances and their resources in place. Add new beta cards through **Thermal Intelligence Thermostat · Beta**. The standalone beta does not provide the wider system's schedules, holds, ownership, cutoff or recovery controls; do not replace backend-dependent cards by changing their type.

## Update an existing beta

1. Retain the previous bundle, resource URL and saved card configuration.
2. Download the [exact beta.4 package](beta.md) and verify its digest.
3. Save it under a new versioned filename and change only the beta resource URL. Do not register a second copy.
4. Open a fresh browser document, reopen the visual editor and check the thermostat, provider details and source mappings.

A frontend-only resource update does not require a Home Assistant Core restart. Saving or reopening card configuration sends no thermostat command.

## Roll back

Restore the previous beta resource URL and open a fresh browser document. A custom element already registered in an open page cannot be replaced in place. Restore saved card configuration separately if you intentionally changed it; avoid overwriting newer dashboard edits.

For a first installation, remove only the added beta cards/view and its resource registration. Keep existing resources and dashboards in place. Frontend rollback does not undo thermostat settings or a deliberate VT lock command; check the provider's reported state separately.

## Version notes

| Update | Configuration and rollback behaviour |
| --- | --- |
| beta.1 → beta.2 | Adds administrator lock controls without a new option. Codes are entered at runtime and never saved in card configuration. |
| beta.2 → beta.3 | Adds optional `response_arc` settings. Unmapped cards retain their existing fallback. Beta.2 preserves the unknown object but cannot display corroborated warming. |
| beta.3 → beta.4 | No new settings. Explicitly null VT Off/Mode reasons show **None reported**. Returning to beta.3 can restore the false amber warning. |

Unknown top-level options and nested feature, telemetry, humidity and response fields survive editor round trips; preservation does not make an unknown option operational. Unsupported explicit schema versions are rejected.

For early development configurations, `background` selects `blue`, `plum` or `black`; the prototype `theme` field is preserved but inactive. Explicit legacy two-boundary humidity guides keep their three-band meaning until you choose the four-boundary format. See [configuration](card-configuration.md) for mappings, precedence and visual settings.

## Beta.4 to RC.1

RC.1 retains `custom:thermal-intelligence-beta-card`, its editor registration and schema-1 configurations. The picker label becomes **Thermal Intelligence Thermostat · RC**. Change the existing trial resource URL to the verified RC module, then open a fresh browser document; do not load beta.4 and RC.1 together because they share registrations. Keep legacy TI resources unchanged. Retain the beta.4 file and URL for rollback. No Home Assistant Core restart is required. See the [RC guide](rc.md).
