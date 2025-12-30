import type { Component } from '../ecs/Component.js';
import type { AccessMethod } from '../realms/RealmTypes.js';

/**
 * PortalComponent - Marks an entity as a portal to a realm
 *
 * Portals are gateways between the mortal world and realms.
 * When an entity interacts with a portal, they can transition to the target realm.
 */
export interface PortalComponent extends Component {
  type: 'portal';
  targetRealmId: string;
  accessMethod: AccessMethod;
  bidirectional: boolean;
  exitRealmId?: string;  // If bidirectional, where does it lead back to?
  active: boolean;
  usesRemaining?: number;  // Optional: limited use portal
  visualEffect: string;  // Visual indicator
}

/**
 * Create a portal component
 */
export function createPortalComponent(
  targetRealmId: string,
  accessMethod: AccessMethod = 'portal',
  options: Partial<Omit<PortalComponent, 'type' | 'version' | 'targetRealmId' | 'accessMethod'>> = {}
): PortalComponent {
  return {
    type: 'portal',
    version: 1,
    targetRealmId,
    accessMethod,
    bidirectional: options.bidirectional ?? false,
    exitRealmId: options.exitRealmId,
    active: options.active ?? true,
    usesRemaining: options.usesRemaining,
    visualEffect: options.visualEffect ?? 'swirling_energy',
  };
}
