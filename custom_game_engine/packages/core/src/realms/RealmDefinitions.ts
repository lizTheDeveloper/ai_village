import type { RealmProperties } from './RealmTypes.js';

/**
 * Predefined realm definitions
 *
 * These are the canonical mythological realms that can be created in the game.
 */

/**
 * The Underworld - Death realm where souls go after dying
 *
 * Simplest realm to implement first:
 * - Accessed by death (automatic) or ritual (advanced)
 * - Time flows normally
 * - Dead cannot leave without permission
 */
export const UnderworldRealm: RealmProperties = {
  id: 'underworld',
  name: 'The Underworld',
  category: 'underworld',
  parentUniverseId: 'main',
  size: 'infinite',
  topology: 'underground_cavern',
  timeFlow: 'normal',
  timeRatio: 1.0,
  environment: 'eternal_twilight',
  stability: 0.99,
  accessMethods: ['death', 'ritual'],
  accessRestrictions: [
    {
      type: 'state',
      requirement: 'dead_or_sponsored',
      description: 'Only the dead or those with divine sponsorship may enter'
    }
  ],
  ruler: undefined,  // No ruler initially
  contested: false,
  laws: [
    {
      name: 'no_return',
      effect: 'dead_cannot_leave',
      enforcement: 'automatic',
      description: 'The dead cannot leave the Underworld without divine intervention or resurrection'
    },
    {
      name: 'memory_fading',
      effect: 'mortal_memories_fade',
      enforcement: 'environmental',
      description: 'Memories of mortal life slowly fade in the Underworld'
    }
  ],
  selfSustaining: true,  // Underworld is ancient and self-sustaining
  maintenanceCost: 0,
  subRealms: []  // Could add Elysium, Asphodel, Tartarus later
};

/**
 * Celestial Realm - Divine court, heaven
 *
 * For future implementation:
 * - Accessed by invitation, ascension, or pilgrimage
 * - Time flows slower (10 years outside = 1 year inside)
 * - Enhanced beauty and order
 */
export const CelestialRealm: RealmProperties = {
  id: 'celestial',
  name: 'The Celestial Realm',
  category: 'celestial',
  parentUniverseId: 'main',
  size: 'kingdom',
  topology: 'floating_islands',
  timeFlow: 'slow',
  timeRatio: 0.1,  // Time passes slower here
  environment: 'eternal_spring',
  stability: 0.98,
  accessMethods: ['invitation', 'ascension', 'pilgrimage'],
  accessRestrictions: [
    {
      type: 'permission',
      requirement: 'divine_invitation',
      description: 'Must be invited by a celestial being'
    },
    {
      type: 'state',
      requirement: 'pure_of_heart',
      description: 'Only the virtuous may enter'
    }
  ],
  ruler: undefined,
  contested: false,
  laws: [
    {
      name: 'no_violence',
      effect: 'combat_impossible',
      enforcement: 'automatic',
      description: 'Violence is impossible in the Celestial Realm'
    },
    {
      name: 'truth_binding',
      effect: 'lies_impossible',
      enforcement: 'automatic',
      description: 'Lies cannot be spoken here'
    }
  ],
  selfSustaining: true,
  maintenanceCost: 0,
  subRealms: []
};

/**
 * Dream Realm - Consciousness and imagination
 *
 * For future implementation:
 * - Accessed through sleep
 * - Subjective time flow
 * - Malleable reality
 */
export const DreamRealm: RealmProperties = {
  id: 'dream_realm',
  name: 'The Dreaming',
  category: 'dream',
  parentUniverseId: 'main',
  size: 'infinite',
  topology: 'shifting_landscape',
  timeFlow: 'subjective',
  timeRatio: 1.0,  // Base ratio, but varies per dreamer
  environment: 'ever_changing',
  stability: 0.5,  // Low stability, reality shifts
  accessMethods: ['dream', 'trance'],
  accessRestrictions: [],  // Anyone can dream
  ruler: undefined,
  contested: false,
  laws: [
    {
      name: 'thought_manifestation',
      effect: 'thoughts_become_real',
      enforcement: 'environmental',
      description: 'Strong thoughts can become temporarily real'
    },
    {
      name: 'dream_logic',
      effect: 'causality_weakened',
      enforcement: 'automatic',
      description: 'Logic and causality work differently here'
    }
  ],
  selfSustaining: true,
  maintenanceCost: 0,
  subRealms: []
};

/**
 * Registry of all defined realms
 */
export const REALM_REGISTRY: Record<string, RealmProperties> = {
  underworld: UnderworldRealm,
  celestial: CelestialRealm,
  dream_realm: DreamRealm,
};

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
