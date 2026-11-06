// SPDX-License-Identifier: GPL-3.0-only
import { mappedControl, ownValue } from '../model/mapped-control.js';

const fields = ['entity_id', 'platform', 'id', 'unique_id', 'config_entry_id', 'device_id'];
const identity = (entry, entity) => {
  if (ownValue(entry, 'entity_id') !== entity || typeof ownValue(entry, 'platform') !== 'string' || !entry.platform.trim()) throw Error('Invalid registry entry');
  return Object.freeze(Object.fromEntries(fields.filter(key => Object.hasOwn(entry, key)).map(key => [key, ownValue(entry, key)])));
};
const metadata = (hass, ids) => JSON.stringify(ids.map(id => fields.map(key => ownValue(hass?.entities?.[id], key))));
const entityId = value => typeof value === 'string' && /^[a-z0-9_]+\.[a-z0-9_]+$/.test(value);
function affectsMapping(event, ids) {
  const data = ownValue(event, 'data');
  const action = ownValue(data, 'action'), entity = ownValue(data, 'entity_id');
  const oldEntity = ownValue(data, 'old_entity_id');
  const changedEntity = ownValue(ownValue(data, 'changes'), 'entity_id');
  // Core rename events carry entity_id and old_entity_id; changes may also name the predecessor.
  // Ignore only positively identified unrelated events. Ambiguity still invalidates proof.
  if (!['create', 'update', 'remove'].includes(action) || !entityId(entity)
      || (oldEntity !== undefined && !entityId(oldEntity)) || (changedEntity !== undefined && !entityId(changedEntity))) return true;
  return [entity, oldEntity, changedEntity].some(id => ids.includes(id));
}

/** Session-scoped, subscribed registry proof for the optional path only. No service writes. */
export class MappedRegistry {
  constructor(onChange) { this.onChange = onChange; this.generation = 0; this.proof = { status: 'idle', generation: 0 }; }
  sync(hass, config, attached) {
    const mapping = mappedControl(config);
    const ids = mapping.status === 'enabled' && config.entity ? [config.entity, mapping.item.entity] : null;
    const session = [hass?.connection, hass?.connection?.socket, hass?.user?.id, hass?.connected === true, attached === true, ids?.join('|')];
    this.hass = hass;
    if (this.session?.every((v, i) => v === session[i])) {
      if (ids && this.metadata !== metadata(hass, ids)) {
        this.metadata = metadata(hass, ids); this._reload();
      }
      return this.proof;
    }
    this.stop(); this.session = session; this.ids = ids;
    this.metadata = ids ? metadata(hass, ids) : '';
    if (!ids || !session[3] || !session[4] || !session[2]) return this.proof;
    this.proof = { status: 'loading', generation: this.generation };
    const token = this.generation;
    if (typeof hass?.connection?.subscribeEvents !== 'function' || typeof hass?.callWS !== 'function') {
      this.proof = { status: 'unavailable', generation: token }; return this.proof;
    }
    Promise.resolve().then(() => hass.connection.subscribeEvents(event => {
      // Invalidate synchronously, including rename/removal; old answers cannot restore proof.
      if (this.session !== session || !affectsMapping(event, ids)) return;
      this._reload();
    }, 'entity_registry_updated')).then(unsubscribe => {
      if (this.session !== session) { unsubscribe?.(); return; }
      if (typeof unsubscribe !== 'function') throw Error('Subscription unavailable');
      this.unsubscribe = unsubscribe;
      this._reload();
    }).catch(() => {
      if (this.session !== session) return;
      this.proof = { status: 'unavailable', generation: ++this.generation }; this.onChange();
    });
    return this.proof;
  }
  _reload() {
    const token = ++this.generation, hass = this.hass, ids = this.ids;
    this.proof = { status: 'loading', generation: token }; this.onChange();
    if (!this.unsubscribe || !ids) return;
    Promise.all(ids.map(entity => hass.callWS({ type: 'config/entity_registry/get', entity_id: entity }))).then(entries => {
      if (token !== this.generation) return;
      const [anchor, target] = entries.map((entry, i) => identity(entry, ids[i]));
      for (const [i, entry] of [anchor, target].entries()) {
        const current = hass.entities?.[ids[i]];
        if (current && fields.some(key => Object.hasOwn(current, key) && Object.hasOwn(entry, key) && ownValue(current, key) !== entry[key])) throw Error('Registry metadata changed');
      }
      this.proof = Object.freeze({ status: 'verified', generation: token, anchor, target }); this.onChange();
    }).catch(() => {
      if (token !== this.generation) return;
      this.proof = { status: 'unavailable', generation: token }; this.onChange();
    });
  }
  stop() {
    ++this.generation;
    try { Promise.resolve(this.unsubscribe?.()).catch(() => {}); } catch { /* Old subscription cannot restore proof. */ }
    this.unsubscribe = null; this.session = null; this.ids = null;
    this.proof = { status: 'idle', generation: this.generation };
  }
}
