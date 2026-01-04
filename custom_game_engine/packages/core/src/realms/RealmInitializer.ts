import type { World } from '../ecs/World.js';
import type { RealmProperties } from './RealmTypes.js';
import { EntityImpl } from '../ecs/Entity.js';
import { createRealmComponent } from '../components/RealmComponent.js';
import { UnderworldRealm, CelestialRealm, DreamRealm } from './RealmDefinitions.js';

/**
 * RealmInitializer - Helper functions to create and initialize realms in the game world
 */

/**
 * Create a realm entity from realm properties
 *
 * @param world - The game world
 * @param properties - Realm properties (from RealmDefinitions or custom)
 * @returns The created realm entity ID
 */
export function createRealmEntity(world: World, properties: RealmProperties): string {
  const realmEntity = world.createEntity();
  const realmComponent = createRealmComponent(properties);
  (realmEntity as EntityImpl).addComponent(realmComponent);

  return realmEntity.id;
}

/**
 * Initialize the Underworld realm
 *
 * The Underworld is the first and simplest realm - where souls go after death.
 */
export function initializeUnderworld(world: World): string {
  const realmEntityId = createRealmEntity(world, UnderworldRealm);
  return realmEntityId;
}

/**
 * Initialize the Celestial realm (optional - for future use)
 */
export function initializeCelestialRealm(world: World): string {
  const realmEntityId = createRealmEntity(world, CelestialRealm);
  return realmEntityId;
}

/**
 * Initialize the Dream realm (optional - for future use)
 */
export function initializeDreamRealm(world: World): string {
  const realmEntityId = createRealmEntity(world, DreamRealm);
  return realmEntityId;
}

/**
 * Initialize all predefined realms
 */
export function initializeAllRealms(world: World): {
  underworld: string;
  celestial: string;
  dream: string;
} {
  return {
    underworld: initializeUnderworld(world),
    celestial: initializeCelestialRealm(world),
    dream: initializeDreamRealm(world),
  };
}
