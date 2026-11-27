# Update and rollback

Updating from 1.0.0 to 1.0.1 keeps your saved dashboard card type and configuration. If Marketplace or HACS manages the card, update the existing entry and open a fresh dashboard tab. The stable picker reads **Thermal Intelligence Thermostat**. On Home Assistant 2026.11.2, the Marketplace update preserved the saved dashboard and its resource ID. [Verified upgrade and downloads](compatibility.md#101-package).

The 1.0.1-rc.1 picker reads **Thermal Intelligence Thermostat · RC**. Beta 1 uses the **· Beta** suffix. Dashboards saved with the 1.0.0 thermostat type or the earlier beta-card type open with this build. Keep a single standalone TI module registered.

The 1.0.0 picker reads **Thermal Intelligence Thermostat**. Beta builds add **· Beta** and RC builds add **· RC**. New 1.0.0 cards and exports use `custom:thermal-intelligence-thermostat`. Saved beta and RC cards continue to load using `custom:thermal-intelligence-beta-card`. Loading two standalone builds, even two marked 1.0.0, can leave an old picker or duplicate entries. Keep one standalone resource and reload the dashboard in a fresh browser tab. If you return to an older module, use the previous YAML type and the configuration saved with that module. Replace the existing standalone resource when moving between them. Keep the previous module, resource URL and matching card configuration for rollback. [1.0.0 package](v1.0.0-package.md).

RC.3 retains existing **schema-1** and **schema-2** configurations. Explicit enrollment of the optional switch control, introduced in beta.6, uses **schema 2**; keep the original configuration for rollback. The trial card type is `custom:thermal-intelligence-beta-card`; its editor is `thermal-intelligence-beta-card-editor`.

## Unreleased RC.4 candidate

[RC.4](rc-4.md) carries the beta.8 usability changes and the reviewed request-tooltip correction. It retains the trial card/editor names and schema-1/schema-2 support. RC.4 was tested by commit during development of 1.0.0. An immutable-commit Marketplace trial has passed; no named RC.4 release or automatic installer update is available.

The `temperature` kind and optional `unit_attribute` are supported by beta.8 and RC.4, but rejected by RC.3 and earlier. Before adopting them, retain the older module and compatible saved configuration together. A return to the older module requires restoring that configuration without discarding unrelated dashboard edits. Advanced export remains available and does not save the dashboard.

The later RC.4 working revision adds `vt_telemetry`, display-only `header_icons` and live `unit_attribute` for other numeric telemetry kinds. Earlier modules do not implement these displays. Keep the prior module and compatible card configuration together for rollback. Save through Home Assistant’s selected-card editor; runtime icon drafts and export do not migrate or synchronize other room copies.

The confirmed Schedule-mode mapping (`schedule_preset`) and null-valued `clear_attributes` guards require [source `61c299a`](https://github.com/senyo888/thermal-intelligence/commit/61c299a9f0acf4a1ced4698fa3e0b0e531e18489) or a later build containing that change. Earlier RC.4 modules preserve these unknown fields but do not implement the mode or enforce those guards. Retain the previous compatible module and configuration before adopting them; do not rely on these fields when rolling back. Unknown-field preservation does not establish feature support.

RC.4 has its own synthetic, package, bounded manual Lab and [immutable-commit Stable checks](rc-4.md#stable-marketplace-and-schedule-checks--1819-november-2026). Each result applies to its recorded module. Named-release installation, full installer update/removal/recovery, physical heating and broader device acceptance remain unverified.

## Unreleased beta.8 candidate

Existing schema-1 and schema-2 configurations remain supported. The new `temperature` telemetry kind and its optional `unit_attribute` first appeared in beta.8 and are included in 1.0.0. RC.3 and earlier reject that kind. Retain the earlier configuration and module together before adding temperature rows. Returning to the older module requires restoring compatible configuration too; preserve unrelated newer dashboard edits deliberately.

Humidity editor sliders, search and source suggestions do not change schema or enroll controls. Runtime advanced export remains available and does not save the dashboard. Synthetic checks and bounded manual Lab checks cover the identified beta.8 modules; see [coverage and exact module limits](compatibility.md#unreleased-beta8-usability-candidate). Those results do not establish acceptance of different bytes, installer lifecycle, physical response or a formal soak. Beta.8 is a development-channel identity, not a higher semantic version than RC.3 and not an automatic installer update from it.

## Keep existing TI alongside the trial card

The 1.0.0 module supports the earlier registrations `custom:thermal-intelligence-beta-card` and `thermal-intelligence-beta-card-editor`. Existing schema-1 and schema-2 card configurations therefore keep their type; no rename to the legacy `custom:thermal-intelligence-card` is required. A stable build uses **Thermal Intelligence Thermostat** in the picker, while beta and RC builds retain their channel suffix. The [1.0.0 package notes](v1.0.0-package.md#validation-boundaries) record the verified Marketplace upgrade and the earlier rollback trial.

Keep existing `custom:thermal-intelligence-card` instances and their resources in place. For a new 1.0.0 card choose **Thermal Intelligence Thermostat**. Use **Thermal Intelligence Thermostat · RC** with RC.3. The wider system keeps responsibility for schedules, holds, ownership, cutoff and recovery controls. Preserve its backend-dependent cards and their types.

## Update an existing trial card

Use the installer that owns the existing trial. On Home Assistant 2026.11 and later, update a Marketplace-managed installation through Marketplace; on older systems with HACS, update through HACS. Retain its generated resource URL and installer ownership, then verify the selected version and served hash. Do not replace a managed resource with a manually copied file. See the [Marketplace](marketplace.md) or [HACS](hacs.md) guide.

### Update a manually installed trial card

1. Retain the previous bundle, resource URL and saved card configuration.
2. Download the module attached to the version you chose on the [releases page](https://github.com/senyo888/thermal-intelligence/releases) and verify its digest. Use the checksums for your version. [v1.0.1](compatibility.md#101-package) · [v1.0.0](v1.0.0-package.md) · [RC.3](rc-3.md).
3. Save it under a new versioned filename and update the existing standalone resource URL. Do not register a second copy.
4. Open a fresh browser document, reopen the visual editor and check the thermostat, provider details and source mappings.

A frontend-only resource update does not require a Home Assistant Core restart. Saving or reopening card configuration sends no thermostat command.

## Roll back a manually installed trial card

Restore the previous trial resource URL and open a fresh browser document. A custom element already registered in an open page cannot be replaced in place. Restore saved card configuration separately if you intentionally changed it; avoid overwriting newer dashboard edits.

For a first installation, remove only the added trial cards/view and its resource registration. Keep existing resources and dashboards in place. Frontend rollback does not undo thermostat settings or a deliberate VT lock command; check the provider's reported state separately.

## Version notes

| Update | Configuration and rollback behaviour |
| --- | --- |
| RC.2 → RC.3 | No schema or card-type change. Keep the saved configuration and previous module; returning to RC.2 restores its known request-status and presentation defects. |
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

The optional switch control is available from beta.6 and retained in RC.3; it is absent from beta.5 and RC.1. Existing schema-1 cards stay unchanged. Explicit enrollment uses schema 2; older modules reject that schema. Retain the original schema-1 card configuration before enabling it. To roll back, restore both the original configuration and its matching module/resource, then open a fresh browser document. Removing the optional row does not send Off or undo external effects. See [optional switch setup and limits](optional-switch-control.md).

## Trial and legacy coexistence

The stable package also registers the beta and RC names for backwards compatibility. Load only one of those modules in a browser document. A stable upgrade replaces the selected beta/RC resource, and changing that resource requires a fresh document. Keep the separate legacy TI resources and cards unchanged. Untagged beta updates do not change the RC.1 tag or its release assets.

## Installer-managed recovery

On Home Assistant 2026.11 and later, follow [Marketplace installation and recovery](marketplace.md); older installations retain their [HACS](hacs.md) ownership. Use the saved recovery or backup procedure for the affected installer. The manual resource procedure above is not an installer downgrade or a full environment restore. Save the card configuration as well as its module before changing schema or installation method. A documented migration route does not establish tested migration acceptance.
