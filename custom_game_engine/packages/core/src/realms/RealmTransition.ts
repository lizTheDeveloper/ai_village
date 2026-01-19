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
  entity: any,
  realm: RealmComponent,
  accessMethod: AccessMethod
): { allowed: boolean; reason?: string } {
  for (const restriction of realm.properties.accessRestrictions) {
    switch (restriction.type) {
      case 'state': {
        // Check entity state (e.g., dead_or_sponsored)
        const requirement = restriction.requirement;

        if (requirement === 'dead_or_sponsored') {
          const isDead = entity.components.has('afterlife');
          const hasDeathBargain = entity.components.has('death_bargain');
          const deathBargain = hasDeathBargain
            ? entity.components.get('death_bargain')
            : undefined;

          // Allow if dead, or has divine sponsorship (successful death bargain)
          const sponsored = deathBargain && deathBargain.succeeded === true;

          if (!isDead && !sponsored) {
            return {
              allowed: false,
              reason: restriction.description || 'Must be dead or divinely sponsored',
            };
          }
        } else if (requirement === 'pure_of_heart') {
          // Check moral alignment or spiritual purity
          const spiritual = entity.components.get('spiritual');
          if (spiritual && spiritual.sin > 0.5) {
            return {
              allowed: false,
              reason: restriction.description || 'Only the virtuous may enter',
            };
          }
        }
        break;
      }

      case 'permission': {
        // Check if entity has permission (e.g., divine_invitation)
        const requirement = restriction.requirement;

        if (requirement === 'divine_invitation') {
          // Check for divine invitation via death_bargain or deity component
          const hasDeathBargain = entity.components.has('death_bargain');
          const deathBargain = hasDeathBargain
            ? entity.components.get('death_bargain')
            : undefined;

          // Check for successful bargain or divine marking
          const hasInvitation =
            (deathBargain && deathBargain.succeeded === true) ||
            entity.components.has('deity') ||
            (entity.components.has('tags') &&
              entity.components.get('tags').tags.includes('divinely_invited'));

          if (!hasInvitation) {
            return {
              allowed: false,
              reason: restriction.description || 'Requires divine invitation',
            };
          }
        } else if (requirement.startsWith('realm_permission:')) {
          // Check for specific realm permission token
          const permissionType = requirement.substring('realm_permission:'.length);
          const tags = entity.components.get('tags');

          if (!tags || !tags.tags.includes(`realm_access:${permissionType}`)) {
            return {
              allowed: false,
              reason: restriction.description || `Requires permission: ${permissionType}`,
            };
          }
        }
        break;
      }

      case 'identity': {
        // Check entity identity requirements (species, deity status, etc.)
        const requirement = restriction.requirement;

        if (requirement === 'deity_only') {
          if (!entity.components.has('deity')) {
            return {
              allowed: false,
              reason: restriction.description || 'Only divine beings may enter',
            };
          }
        } else if (requirement === 'spirit_only') {
          if (!entity.components.has('spirit')) {
            return {
              allowed: false,
              reason: restriction.description || 'Only spirits may enter',
            };
          }
        } else if (requirement.startsWith('species:')) {
          const requiredSpecies = requirement.substring('species:'.length);
          const species = entity.components.get('species');
          if (!species || species.name !== requiredSpecies) {
            return {
              allowed: false,
              reason: restriction.description || `Only ${requiredSpecies} may enter`,
            };
          }
        }
        break;
      }

      case 'action': {
        // Check if entity performed required action
        const requirement = restriction.requirement;

        if (requirement.startsWith('completed_quest:')) {
          const questId = requirement.substring('completed_quest:'.length);
          const tags = entity.components.get('tags');

          if (!tags || !tags.tags.includes(`quest_completed:${questId}`)) {
            return {
              allowed: false,
              reason: restriction.description || 'Must complete required quest',
            };
          }
        } else if (requirement === 'ritual_performed') {
          // Check if entity has performed the entry ritual (tracked via tags or memory)
          const memory = entity.components.get('semantic_memory');
          if (!memory || !memory.memories.some((m: any) => m.includes('performed realm entry ritual'))) {
            return {
              allowed: false,
              reason: restriction.description || 'Must perform entry ritual first',
            };
          }
        }
        break;
      }

      case 'knowledge': {
        // Check if entity knows required information
        const requirement = restriction.requirement;

        if (requirement === 'knows_true_name') {
          // Check if entity knows realm ruler's true name
          const memory = entity.components.get('semantic_memory');
          if (!memory || !memory.memories.some((m: any) => m.includes(`true name of ${realm.properties.name}`))) {
            return {
              allowed: false,
              reason: restriction.description || 'Must know the true name to enter',
            };
          }
        } else if (requirement.startsWith('knows_secret:')) {
          const secretId = requirement.substring('knows_secret:'.length);
          const tags = entity.components.get('tags');

          if (!tags || !tags.tags.includes(`secret_known:${secretId}`)) {
            return {
              allowed: false,
              reason: restriction.description || 'Must know the secret',
            };
          }
        }
        break;
      }

      case 'time': {
        // Check time-based restrictions
        const requirement = restriction.requirement;
        const realmLocation = entity.components.get('realm_location') as RealmLocationComponent | undefined;

        if (requirement === 'first_visit_only' && realmLocation) {
          const tags = entity.components.get('tags');
          if (tags && tags.tags.includes(`visited_realm:${realm.properties.id}`)) {
            return {
              allowed: false,
              reason: restriction.description || 'Can only enter once',
            };
          }
        } else if (requirement.startsWith('time_of_day:')) {
          const timeOfDay = requirement.substring('time_of_day:'.length);
          const timeEntity = findTimeEntity(entity.world);
          if (timeEntity) {
            const time = timeEntity.components.get('time');
            const currentHour = time ? time.hour : 12;

            // Simple day/night check
            const isDay = currentHour >= 6 && currentHour < 18;
            const isNight = !isDay;

            if (timeOfDay === 'day' && !isDay) {
              return {
                allowed: false,
                reason: restriction.description || 'Can only enter during daytime',
              };
            } else if (timeOfDay === 'night' && !isNight) {
              return {
                allowed: false,
                reason: restriction.description || 'Can only enter at night',
              };
            }
          }
        } else if (requirement.startsWith('after_tick:')) {
          const requiredTick = parseInt(requirement.substring('after_tick:'.length), 10);
          if (realm.currentTick < requiredTick) {
            return {
              allowed: false,
              reason: restriction.description || 'Not yet time to enter',
            };
          }
        }
        break;
      }

      default:
        // Unknown restriction type - deny access by default (fail-safe)
        console.error(`[RealmTransition] Unknown restriction type: ${restriction.type}`);
        return {
          allowed: false,
          reason: `Unknown restriction type: ${restriction.type}`,
        };
    }
  }

  return { allowed: true };
}

/**
 * Helper to find time entity (singleton)
 */
function findTimeEntity(world: any): any | undefined {
  const entities = world.query().executeEntities();
  for (const entity of entities) {
    if (entity.components.has('time')) {
      return entity;
    }
  }
  return undefined;
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
