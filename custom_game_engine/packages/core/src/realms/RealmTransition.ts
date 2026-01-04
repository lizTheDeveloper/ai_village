import type { World } from '../ecs/World.js';
import type { RealmLocationComponent } from '../components/RealmLocationComponent.js';
import type { RealmComponent } from '../components/RealmComponent.js';
import type { AccessMethod, RealmTransitionResult, TransitionEffect as _TransitionEffect } from './RealmTypes.js';
import { getRealmDefinition } from './RealmDefinitions.js';
import { createRealmEntity } from './RealmInitializer.js';

// TransitionEffect type used inline in function signatures
type TransitionEffect = _TransitionEffect;

/**
 * Core realm transition logic
 *
 * Handles transitioning entities between realms:
 * - Validates access permissions
 * - Checks realm laws and restrictions
 * - Updates entity realm location
 * - Tracks inhabitants
 * - Applies time dilation
 */

/**
 * Transition an entity to a target realm
 */
export function transitionToRealm(
  world: World,
  entityId: string,
  targetRealmId: string,
  accessMethod: AccessMethod,
  portalId?: string
): RealmTransitionResult {
  const entity = world.getEntity(entityId);
  if (!entity) {
    return {
      success: false,
      reason: 'Entity not found',
    };
  }

  const realmLocation = entity.components.get('realm_location') as RealmLocationComponent | undefined;
  if (!realmLocation) {
    return {
      success: false,
      reason: 'Entity missing realm_location component',
    };
  }

  // Find target realm entity, lazily creating if needed
  let realmEntity = findRealmEntity(world, targetRealmId);

  // Lazy initialization: if realm doesn't exist but is defined, create it now
  if (!realmEntity) {
    const realmDefinition = getRealmDefinition(targetRealmId);
    if (realmDefinition) {
      createRealmEntity(world, realmDefinition);
      realmEntity = findRealmEntity(world, targetRealmId);
    }
  }

  if (!realmEntity) {
    return {
      success: false,
      reason: `Realm ${targetRealmId} not found and no definition exists`,
    };
  }

  const realm = realmEntity.components.get('realm') as RealmComponent | undefined;
  if (!realm) {
    return {
      success: false,
      reason: `Realm ${targetRealmId} missing realm component`,
    };
  }

  // Check if realm is active
  if (!realm.active) {
    return {
      success: false,
      reason: 'Realm is not active',
    };
  }

  // Validate access method
  if (!realm.properties.accessMethods.includes(accessMethod)) {
    return {
      success: false,
      reason: `Access method ${accessMethod} not allowed for this realm`,
    };
  }

  // Check access restrictions
  const restrictionCheck = checkAccessRestrictions(entity, realm, accessMethod);
  if (!restrictionCheck.allowed) {
    return {
      success: false,
      reason: restrictionCheck.reason || 'Access denied by realm restrictions',
    };
  }

  // Check if entity can exit current realm
  if (!realmLocation.canExit) {
    return {
      success: false,
      reason: 'Cannot exit current realm',
    };
  }

  const currentRealmId = realmLocation.currentRealmId;

  // Remove from current realm inhabitants
  if (currentRealmId !== 'mortal_world') {
    const currentRealmEntity = findRealmEntity(world, currentRealmId);
    if (currentRealmEntity) {
      const currentRealm = currentRealmEntity.components.get('realm') as RealmComponent | undefined;
      if (currentRealm) {
        const index = currentRealm.inhabitants.indexOf(entityId);
        if (index !== -1) {
          currentRealm.inhabitants.splice(index, 1);
        }
      }
    }
  }

  // Update realm location
  realmLocation.currentRealmId = targetRealmId;
  realmLocation.enteredAt = realm.currentTick;
  realmLocation.timeDilation = realm.properties.timeRatio;
  realmLocation.exitPortalId = portalId;
  realmLocation.canExit = true;  // Reset exit permission

  // Add to target realm inhabitants
  if (!realm.inhabitants.includes(entityId)) {
    realm.inhabitants.push(entityId);
  }

  // Apply realm transformations/effects
  const effects = applyRealmEffects(entity, realm);


  return {
    success: true,
    effects,
  };
}

/**
 * Return entity to mortal world
 */
export function returnToMortalWorld(
  world: World,
  entityId: string
): RealmTransitionResult {
  const entity = world.getEntity(entityId);
  if (!entity) {
    return {
      success: false,
      reason: 'Entity not found',
    };
  }

  const realmLocation = entity.components.get('realm_location') as RealmLocationComponent | undefined;
  if (!realmLocation) {
    return {
      success: false,
      reason: 'Entity missing realm_location component',
    };
  }

  if (realmLocation.currentRealmId === 'mortal_world') {
    return {
      success: false,
      reason: 'Entity already in mortal world',
    };
  }

  // Check if entity can exit current realm
  if (!realmLocation.canExit) {
    return {
      success: false,
      reason: 'Cannot exit current realm',
    };
  }

  const currentRealmId = realmLocation.currentRealmId;

  // Remove from current realm inhabitants
  const currentRealmEntity = findRealmEntity(world, currentRealmId);
  if (currentRealmEntity) {
    const currentRealm = currentRealmEntity.components.get('realm') as RealmComponent | undefined;
    if (currentRealm) {
      const index = currentRealm.inhabitants.indexOf(entityId);
      if (index !== -1) {
        currentRealm.inhabitants.splice(index, 1);
      }
    }
  }

  // Update realm location
  realmLocation.currentRealmId = 'mortal_world';
  realmLocation.enteredAt = 0;
  realmLocation.timeDilation = 1.0;
  realmLocation.canExit = true;
  realmLocation.exitPortalId = undefined;

  // Clear realm transformations
  realmLocation.transformations = [];


  return {
    success: true,
  };
}

/**
 * Find realm entity by realm ID
 */
function findRealmEntity(world: World, realmId: string): any | undefined {
  const entities = world.query().executeEntities();
  for (const entity of entities) {
    const realm = entity.components.get('realm') as RealmComponent | undefined;
    if (realm && realm.properties.id === realmId) {
      return entity;
    }
  }
  return undefined;
}

/**
 * Check if entity meets realm access restrictions
 */
function checkAccessRestrictions(
  _entity: any,
  realm: RealmComponent,
  _accessMethod: AccessMethod
): { allowed: boolean; reason?: string } {
  for (const restriction of realm.properties.accessRestrictions) {
    switch (restriction.type) {
      case 'state':
        // Check entity state (e.g., dead_or_sponsored)
        // For now, we'll allow all state-based access
        // TODO: Implement proper state checking
        break;

      case 'permission':
        // Check if entity has permission (e.g., divine_invitation)
        // TODO: Implement permission checking
        break;

      case 'identity':
      case 'action':
      case 'knowledge':
      case 'time':
        // Other restriction types - not yet implemented
        // TODO: Implement these restriction types
        break;
    }
  }

  return { allowed: true };
}

/**
 * Apply realm-specific effects to entity
 */
function applyRealmEffects(entity: any, realm: RealmComponent): TransitionEffect[] {
  const effects: TransitionEffect[] = [];
  const realmLocation = entity.components.get('realm_location') as RealmLocationComponent | undefined;
  if (!realmLocation) return effects;

  const transformations: string[] = [];

  // Apply realm laws as transformations
  for (const law of realm.properties.laws) {
    let effectType: 'transformation' | 'memory' | 'time' | 'status' = 'transformation';
    let description = '';
    let magnitude = 1.0;

    switch (law.effect) {
      case 'combat_impossible':
        effectType = 'status';
        description = 'Combat disabled in this realm';
        transformations.push('combat_disabled');
        break;
      case 'lies_impossible':
        effectType = 'status';
        description = 'Cannot speak falsehoods';
        transformations.push('truthbound');
        break;
      case 'mortal_memories_fade':
        effectType = 'memory';
        description = 'Mortal memories slowly fade';
        magnitude = 0.01;  // Slow fade rate
        transformations.push('memory_fading');
        break;
      case 'thoughts_become_real':
        effectType = 'transformation';
        description = 'Thoughts can manifest as reality';
        transformations.push('thought_manifestation');
        break;
      case 'causality_weakened':
        effectType = 'transformation';
        description = 'Logic and causality work differently';
        transformations.push('dream_logic');
        break;
      default:
        continue;
    }

    effects.push({
      type: effectType,
      description,
      magnitude,
    });
  }

  // Store transformation strings in realm location
  realmLocation.transformations = transformations;

  return effects;
}
