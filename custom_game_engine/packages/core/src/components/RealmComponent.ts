import type { Component } from '../ecs/Component.js';
import type { RealmProperties } from '../realms/RealmTypes.js';

/**
 * RealmComponent - Marks an entity as a realm
 *
 * Attached to entities that represent entire pocket dimensions.
 * Contains all properties and state for the realm.
 */
export interface RealmComponent extends Component {
  type: 'realm';
  properties: RealmProperties;
  active: boolean;
  currentTick: number;
  timeSinceCreation: number;
  attentionReserve: number;
  inhabitants: string[];  // Entity IDs in this realm
}

/**
 * Create a realm component
 */
export function createRealmComponent(properties: RealmProperties): RealmComponent {
  return {
    type: 'realm',
    version: 1,
    properties,
    active: true,
    currentTick: 0,
    timeSinceCreation: 0,
    attentionReserve: 100000,
    inhabitants: [],
  };
}
