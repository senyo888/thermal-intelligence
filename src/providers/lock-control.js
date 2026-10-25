// SPDX-License-Identifier: GPL-3.0-only

const ENTITY = /^climate\.[a-z0-9_]+$/;
const own = (object, key) => object && typeof object === 'object'
  ? Object.getOwnPropertyDescriptor(object, key)?.value : undefined;
const boolean = value => typeof value === 'boolean' ? value : null;

/** Public VT observations only. A configured code is a boolean, never a credential. */
export function readLockFacts(state) {
  const attributes = own(state, 'attributes');
  const manager = own(attributes, 'lock_manager');
  const locked = boolean(own(own(attributes, 'specific_states'), 'is_locked'));
  const duplicate = own(manager, 'is_locked');
  const codeRequired = boolean(own(manager, 'lock_code'));
  const lockUsers = boolean(own(manager, 'lock_users'));
  const lockAutomations = boolean(own(manager, 'lock_automations'));
  const rawRelock = own(manager, 'auto_relock_sec');
  const autoRelockSec = Number.isSafeInteger(rawRelock) && rawRelock >= 0 ? rawRelock : null;
  const configured = own(attributes, 'is_lock_configured') === true;
  const ready = own(attributes, 'is_ready') === true;
  const value = own(state, 'state');
  const available = typeof value === 'string' && value.length > 0 && !['unknown', 'unavailable'].includes(value);
  const known = locked !== null && codeRequired !== null && lockUsers !== null
    && lockAutomations !== null && autoRelockSec !== null
    && (duplicate === undefined || duplicate === locked) && (lockUsers || lockAutomations);
  return Object.freeze({ available, configured, ready, known, locked, codeRequired, lockUsers, lockAutomations, autoRelockSec });
}

/** UI capability, not backend authorization. Unknown evidence never enables a write. */
export function lockCapability({ hass, entity, identity, registryStatus, preview, attached } = {}) {
  const state = own(hass?.states, entity);
  const facts = readLockFacts(state);
  const services = hass?.services?.versatile_thermostat;
  const lockService = Object.hasOwn(services ?? {}, 'lock');
  const unlockService = Object.hasOwn(services ?? {}, 'unlock');
  const publicState = {
    locked: facts.locked, codeRequired: facts.codeRequired, lockUsers: facts.lockUsers,
    lockAutomations: facts.lockAutomations, autoRelockSec: facts.autoRelockSec,
  };
  const signature = JSON.stringify([
    'vt-lock-1', typeof entity === 'string' ? entity : null,
    identity?.entity_id ?? null, identity?.platform ?? null, registryStatus ?? null,
    hass?.user?.id ?? null, hass?.user?.is_admin === true,
    facts.configured, facts.ready, facts.available, facts.known,
    facts.locked, facts.codeRequired, facts.lockUsers, facts.lockAutomations, facts.autoRelockSec,
    lockService, unlockService,
  ]);
  const result = (allowed, reason = '') => Object.freeze({ allowed, reason, ...publicState, signature });
  if (attached !== true) return result(false, 'Card is detached.');
  if (preview !== false) return result(false, 'Lock controls are disabled while previewing or editing.');
  if (hass?.connected !== true || typeof hass?.user?.id !== 'string' || !hass.user.id
      || !hass.connection || typeof hass.connection !== 'object') {
    return result(false, 'An active authenticated Home Assistant connection is required.');
  }
  if (hass.user.is_admin !== true) return result(false, 'Lock control is available to Home Assistant administrators.');
  if (typeof entity !== 'string' || !ENTITY.test(entity) || registryStatus !== 'verified'
      || identity?.entity_id !== entity || identity?.platform !== 'versatile_thermostat') {
    return result(false, 'Verified Versatile Thermostat identity is required.');
  }
  if (own(state, 'entity_id') !== entity || !facts.available) return result(false, 'The thermostat is unavailable.');
  if (!facts.ready) return result(false, 'Versatile Thermostat readiness is unknown or not ready.');
  if (!facts.configured) return result(false, 'Versatile Thermostat lock configuration is unavailable.');
  if (!facts.known) return result(false, 'Versatile Thermostat lock details are unknown or inconsistent.');
  if (typeof hass.callService !== 'function' || !lockService || !unlockService) {
    return result(false, 'Versatile Thermostat lock services are unavailable.');
  }
  return result(true);
}
