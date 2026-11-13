// SPDX-License-Identifier: GPL-3.0-only

export const ownValue = (object, key) => object && typeof object === 'object'
  ? Object.getOwnPropertyDescriptor(object, key)?.value : undefined;
const plain = value => value !== null && typeof value === 'object'
  && [Object.prototype, null].includes(Object.getPrototypeOf(value));
const text = value => typeof value === 'string' && value.trim().length > 0
  && value.length <= 160 && !/[\u0000-\u001f\u007f<>]/u.test(value);

/** Schema-1 unknown data remains inert. A malformed new row never disables climate controls. */
export function mappedControl(config) {
  const off = { status: 'disabled', visible: false, reason: '', item: null };
  if (ownValue(config, 'schema_version') !== 2 || !Object.hasOwn(config, 'mapped_controls')) return off;
  const value = ownValue(config, 'mapped_controls');
  const invalid = reason => ({ status: 'invalid', visible: true, reason, item: null });
  if (!plain(value) || ownValue(value, 'version') !== 1 || typeof ownValue(value, 'enabled') !== 'boolean') {
    return invalid('Optional control needs version 1 and an explicit enabled setting.');
  }
  if (value.enabled === false) return off;
  const items = ownValue(value, 'items');
  if (!Array.isArray(items) || items.length !== 1) return invalid('Configure exactly one optional switch.');
  const item = ownValue(items, '0');
  if (!plain(item) || ownValue(item, 'kind') !== 'switch_on_off'
      || typeof ownValue(item, 'entity') !== 'string' || !/^switch\.[a-z0-9_]+$/.test(item.entity)) {
    return invalid('Optional control requires one explicit switch entity and switch_on_off kind.');
  }
  if (Object.hasOwn(item, 'label') && !text(ownValue(item, 'label'))) return invalid('Optional control label must be plain text, up to 160 characters.');
  if (Object.hasOwn(item, 'icon') && (typeof ownValue(item, 'icon') !== 'string' || !/^[a-z0-9_-]+:[a-z0-9_-]+$/i.test(item.icon))) {
    return invalid('Optional control icon must be a named icon.');
  }
  return { status: 'enabled', visible: true, reason: '', item: Object.freeze({
    entity: item.entity, kind: item.kind, label: ownValue(item, 'label') || 'Optional switch', icon: ownValue(item, 'icon') || 'mdi:power',
  }) };
}

export function switchTimestamp(state) {
  const raw = ownValue(state, 'last_updated');
  if (typeof raw !== 'string') return null;
  const parts = /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2})(?:\.(\d{1,9}))?(Z|[+-]\d{2}:\d{2})$/.exec(raw);
  if (!parts) return null;
  const calendar = Date.parse(parts[1] + 'Z');
  if (!Number.isFinite(calendar) || new Date(calendar).toISOString().slice(0, 19) !== parts[1]) return null;
  const seconds = Date.parse(parts[1] + parts[3]);
  // HA microseconds must not collapse to the same Date.parse millisecond.
  return Number.isFinite(seconds) ? BigInt(seconds) * 1000000n + BigInt((parts[2] || '').padEnd(9, '0')) : null;
}

/** This is UI eligibility, not backend permission or physical-device evidence. */
export function mappedCapability({ config, hass, proof, model, preview, attached, knownVT = false } = {}) {
  const mapping = mappedControl(config);
  const entity = mapping.item?.entity;
  const state = ownValue(hass?.states, entity);
  const value = ownValue(state, 'state');
  const reported = value === 'on' || value === 'off' ? value : value === 'unavailable' ? 'unavailable'
    : value === undefined ? 'unavailable' : value === 'unknown' ? 'unknown' : 'invalid';
  const services = hass?.services?.switch;
  const serviceReady = typeof hass?.callService === 'function' && Object.hasOwn(services ?? {}, 'turn_on') && Object.hasOwn(services ?? {}, 'turn_off');
  const result = (allowed, reason = '') => Object.freeze({
    ...mapping, entity, reported, allowed, reason,
    // The identity key deliberately excludes state, timestamp and climate mode.
    // Expected post-dispatch changes must not retire their own request.
    identityKey: JSON.stringify([config.entity, entity, proof?.generation, proof?.anchor, proof?.target]),
    signature: JSON.stringify([config.entity, entity, proof?.generation, reported, allowed, reason, serviceReady]),
  });
  if (mapping.status !== 'enabled') return result(false, mapping.reason);
  if (attached !== true) return result(false, 'Card is detached.');
  if (preview !== false) return result(false, 'Optional control is disabled while previewing or editing.');
  if (hass?.connected !== true || !hass?.connection || typeof hass.user?.id !== 'string' || !hass.user.id) return result(false, 'Home Assistant connection is unavailable.');
  if (knownVT || model?.provider?.kind === 'vtherm' || config.adapter === 'vtherm') return result(false, 'Optional switch controls are not supported for VT in this version.');
  if (proof?.status !== 'verified' || proof.anchor?.entity_id !== config.entity || proof.target?.entity_id !== entity) return result(false, 'Checking registered thermostat and switch identities, or registry unavailable.');
  if (proof.anchor.platform === 'versatile_thermostat') return result(false, 'Optional switch controls are not supported for VT in this version.');
  if (['group', 'template'].includes(proof.target.platform)) return result(false, 'Group and template switches are not supported.');
  if (ownValue(hass?.states?.[config.entity], 'entity_id') !== config.entity || model?.available !== true || model?.ready !== true) return result(false, 'The thermostat is unavailable or not ready.');
  if (ownValue(state, 'entity_id') !== entity || !['on', 'off'].includes(reported)) return result(false, 'The switch state is unknown, unavailable or invalid.');
  if (!serviceReady) return result(false, 'Switch On and Off services are unavailable.');
  return result(true);
}
