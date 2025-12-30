import type { Component } from '../ecs/Component.js';

/**
 * RealmLocationComponent - Tracks which realm an entity is in
 *
 * All entities have this component. By default, they're in 'mortal_world'.
 * When transitioning through a portal, this component is updated to track
 * their current realm and time dilation effects.
 */
export interface RealmLocationComponent extends Component {
  type: 'realm_location';
  currentRealmId: string;  // Default to 'mortal_world'
  enteredAt: number;  // Tick when entered current realm
  totalTimeInRealm: number;  // Total ticks spent in current realm
  timeDilation: number;  // Current time ratio
  canExit: boolean;  // Can leave realm?
  exitPortalId?: string;  // Portal used to enter (for return)
  transformations: string[];  // Realm-applied effects
}

/**
 * Create a realm location component
 */
export function createRealmLocationComponent(
  realmId: string = 'mortal_world'
): RealmLocationComponent {
  return {
    type: 'realm_location',
    version: 1,
    currentRealmId: realmId,
    enteredAt: 0,
    totalTimeInRealm: 0,
    timeDilation: 1.0,
    canExit: true,
    transformations: [],
  };
}
