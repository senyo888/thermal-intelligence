# Optional switch control

From beta.6, the card offers one optional switch beside the thermostat's Mode and Fan choices. It uses an existing Home Assistant switch and needs no TI controller, integration or add-on. It is not included in released RC.1 or beta.5. Beta.7 corrected a false registry mismatch for device-less entities. RC.2 retains this feature and its eligibility rules.

## Set up the control

Open **Optional switch control** in the visual editor. Select the exact switch, choose its label and icon, then select **Enable selected switch control**. The thermostat and switch must both have current entity-registry entries. The first version supports standard climate integrations; VT, helpers, group switches and template switches are not supported. It does not discover or prove an association between the two devices.

Enabling deliberately opts this card into schema 2. Other cards and ordinary edits retain schema 1. A saved schema-1 `controls` or `mapped_controls` section remains inert. If a saved section conflicts, the editor requires **Replace saved optional-control section** before enrollment. Unknown fields elsewhere, including unknown nested fields on an already supported mapping, survive ordinary edits.

The equivalent explicit YAML configuration uses synthetic entities:

```yaml
type: custom:thermal-intelligence-beta-card
schema_version: 2
entity: climate.example_thermostat
adapter: auto
mapped_controls:
  version: 1
  enabled: true
  items:
    - kind: switch_on_off
      entity: switch.example_emergency_heat
      label: Emergency heat
      icon: mdi:radiator
```

Only one item is supported. `version`, `enabled`, `kind` and `entity` must have the shown types and values; `enabled: false` hides the row without sending Off. Labels are plain text up to 160 characters; icons are named icons. Invalid enabled mappings display a reason and cannot send commands. Existing climate controls keep their own eligibility rules. This control remains visible with **Show details** disabled; that option only governs observations.

## Use and reported results

The button shows the switch's reported state. Select it to review the exact target and requested direction, then confirm **Turn on** or **Turn off**. Both directions require confirmation. Changed state, identity, configuration or connection invalidates an open confirmation; close it and review a new action. There is no automatic retry, generic toggle, alternate target or compensating thermostat command.

The card sends only `switch.turn_on` or `switch.turn_off` with one entity ID. Home Assistant remains responsible for authorization. Reading the switch or seeing its registry entry does not grant permission to control it; backend refusals produce a generic failure message. This is not an emergency-stop path, a global lock or a guarantee against other automations and users changing the system.

**Check your integration's effects.** In Home Assistant 2026.11.0, the [Honeywell emergency-heat switch](https://github.com/home-assistant/core/blob/2026.11.0/homeassistant/components/honeywell/switch.py) requests emergency heat when turned on. Turning it off while active requests system **Off**, not ordinary Heat. TI displays the resulting climate state and does not restore a previous mode, target or preset. Other switches can have other integration or automation effects.

Service acceptance and reported state are separate. The new path reports an observed result only after acknowledgement and a matching switch update with a valid `last_updated` later than the baseline captured at dispatch. Missing timestamps can leave an accepted request unconfirmed. Reported equality does not prove command causation or physical heating. A long-unchanged valid state is not automatically stale; TI adds no arbitrary expiry.

Unknown or unavailable state, unavailable registry proof, an unsupported provider, preview or disconnection disables the optional row. Registry proof is refreshed on connection/user changes and registry notifications. If the registry lookup or subscription is unavailable to the account, the optional control remains disabled. A thermostat in Off can still have an eligible switch; invalid temperature-step data alone does not disable it.

Setup, rendering, editor changes, cancellation, reconnect and removing/disabling the mapping send no switch or thermostat commands. Unresolved requests share the existing per-card command gate with climate and VT-lock requests; other cards and automations are independent.

## Update and rollback

Keep the pre-enrollment card configuration and its previous module. RC.1 and beta.5 do not accept schema 2, so rollback requires restoring **both configuration and module**. Removing a mapping or restoring an older module does not turn the switch off or reverse integration/automation effects.

Beta.7 has synthetic coverage and a bounded real-HA trial on **6 November 2026** using a registered generic thermostat and an inert Command Line switch. Corrected registry proof, confirmed On/Off, cancellation and passive reconnect passed; the fixture reported state optimistically. This does not establish physical response, real Honeywell behavior, broader backend permissions, HACS/Marketplace installation or a minimum HA version. See [dated acceptance and limits](compatibility.md#beta7-lab-acceptance--6-november-2026). Publication, manual installation and installer lifecycle remain separate.
