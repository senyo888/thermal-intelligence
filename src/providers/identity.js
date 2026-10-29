// SPDX-License-Identifier: GPL-3.0-only
import { readOwnPath } from '../model/telemetry.js';

const own = (object, key) => object != null && Object.hasOwn(object, key);

/** Identity is supplied only after a successful entity-registry lookup. */
export function resolveProvider(config, identity) {
  const unknown = (status, reason) => ({ kind: 'unknown', status, label: 'Provider unverified', evidence: 'No matching registry evidence', reason });
  if (!config.entity) return unknown('unconfigured', 'Select a climate entity.');
  if (identity !== null && identity !== undefined) {
    if (!own(identity, 'entity_id') || identity.entity_id !== config.entity || !own(identity, 'platform') || typeof identity.platform !== 'string' || !identity.platform.trim()) {
      return unknown('invalid', 'Registry identity does not match the selected entity.');
    }
    const isVT = identity.platform === 'versatile_thermostat';
    if (!isVT && config.adapter === 'vtherm') return unknown('invalid', 'The selected VT adapter conflicts with the entity registry.');
    return {
      kind: isVT ? 'vtherm' : 'standard', status: 'verified',
      label: isVT ? 'Versatile Thermostat' : 'Home Assistant climate',
      evidence: `Entity registry: ${identity.platform}`,
      reason: isVT && config.adapter === 'standard' ? 'Registry identifies VT; VT readiness restrictions remain active.' : '',
    };
  }
  if (config.adapter === 'auto') return unknown('unknown', 'Provider lookup is pending or unavailable. Select an adapter explicitly if this entity is not registered.');
  return {
    kind: config.adapter, status: 'configured',
    label: config.adapter === 'vtherm' ? 'Versatile Thermostat' : 'Home Assistant climate',
    evidence: 'Explicit card configuration; registry unavailable', reason: '',
  };
}

export function providerReadiness(provider, attributes) {
  if (provider.kind === 'unknown') return { status: 'unknown', ready: false, reason: provider.reason };
  if (provider.kind === 'standard') return { status: 'not_applicable', ready: true, reason: 'No additional readiness contract is declared for standard climate entities.' };
  if (!own(attributes, 'is_ready') || typeof attributes.is_ready !== 'boolean') {
    return { status: 'unknown', ready: false, reason: 'Versatile Thermostat readiness is unknown.' };
  }
  if (attributes.is_ready) {
    const locked = readOwnPath(attributes, 'specific_states.is_locked');
    const lockUsers = readOwnPath(attributes, 'lock_manager.lock_users');
    if (locked.value === true && lockUsers.value !== false) return { status: 'locked', ready: false, reason: 'Versatile Thermostat is locked for user control, or the lock scope is unknown.' };
    if (own(attributes, 'is_lock_configured') && attributes.is_lock_configured === true && typeof locked.value !== 'boolean') return { status: 'unknown', ready: false, reason: 'Versatile Thermostat lock state is unknown.' };
  }
  return attributes.is_ready
    ? { status: 'ready', ready: true, reason: 'Versatile Thermostat reports initialization complete.' }
    : { status: 'not_ready', ready: false, reason: 'Versatile Thermostat is not ready.' };
}
