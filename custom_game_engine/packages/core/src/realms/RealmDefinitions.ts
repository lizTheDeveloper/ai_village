import type { RealmProperties } from './RealmTypes.js';
import realmsData from '../../data/realms.json';

/**
 * Predefined realm definitions
 *
 * These are the canonical mythological realms that can be created in the game.
 * Data is loaded from realms.json to separate configuration from code.
 */

/**
 * The Underworld - Death realm where souls go after dying
 *
 * Simplest realm to implement first:
 * - Accessed by death (automatic) or ritual (advanced)
 * - Time crawls slowly (4x slower than mortal world)
 * - Dead cannot leave without permission
 */
export const UnderworldRealm: RealmProperties = realmsData.realms.underworld as RealmProperties;

/**
 * Celestial Realm - Divine court, heaven
 *
 * For future implementation:
 * - Accessed by invitation, ascension, or pilgrimage
 * - Time flows slower (10 years outside = 1 year inside)
 * - Enhanced beauty and order
 */
export const CelestialRealm: RealmProperties = realmsData.realms.celestial as RealmProperties;

/**
 * Dream Realm - Consciousness and imagination
 *
 * For future implementation:
 * - Accessed through sleep
 * - Subjective time flow
 * - Malleable reality
 */
export const DreamRealm: RealmProperties = realmsData.realms.dream_realm as RealmProperties;

/**
 * Registry of all defined realms
 */
export const REALM_REGISTRY: Record<string, RealmProperties> = realmsData.realms as Record<string, RealmProperties>;

/**
 * Get realm definition by ID
 */
export function getRealmDefinition(realmId: string): RealmProperties | undefined {
  return REALM_REGISTRY[realmId];
}

/**
 * Get all realm definitions
 */
export function getAllRealmDefinitions(): RealmProperties[] {
  return Object.values(REALM_REGISTRY);
}
