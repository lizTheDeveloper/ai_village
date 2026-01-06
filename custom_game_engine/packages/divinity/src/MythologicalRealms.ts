/**
 * MythologicalRealms - Divine Pocket Dimensions
 *
 * Realms are NOT universes. They're pocket dimensions attached to a parent
 * universe - places like Avalon, Faerie, Olympus, the Underworld.
 *
 * Key differences from universes:
 * - Inherit physics/magic from parent (with modifications)
 * - Much cheaper to access than universe crossing
 * - Can be created by mid-level presences (0.50+)
 * - Where gods actually live, where souls go after death
 * - Where mythological journeys happen
 *
 * See: specs/mythological-realms.md
 */

import type { Presence } from './PresenceSpectrum.js';

// ============================================================================
// Realm Categories
// ============================================================================

export type RealmCategory =
  | 'celestial'     // Divine courts, heavens, paradises
  | 'underworld'    // Death realms, afterlives
  | 'elemental'     // Pure elemental manifestations
  | 'dream'         // Consciousness, imagination
  | 'liminal'       // Boundary spaces, crossroads
  | 'personal'      // Individual domains
  | 'wild';         // Untamed, unclaimed

export type RealmSize =
  | 'pocket'        // Single room/location (0.50+)
  | 'domain'        // Village-scale (0.60+)
  | 'territory'     // Region-scale (0.70+)
  | 'kingdom'       // Nation-scale (0.80+)
  | 'infinite';     // Unbounded (0.90+)

/** Spectrum position required to create realm of each size */
export const REALM_SIZE_REQUIREMENTS: Record<RealmSize, number> = {
  pocket: 0.50,
  domain: 0.60,
  territory: 0.70,
  kingdom: 0.80,
  infinite: 0.90,
};

/** Base attention cost to create realm of each size */
export const REALM_CREATION_COSTS: Record<RealmSize, number> = {
  pocket: 10_000,
  domain: 50_000,
  territory: 200_000,
  kingdom: 500_000,
  infinite: 1_000_000,
};

// ============================================================================
// Time Flow
// ============================================================================

export type TimeFlowType =
  | 'frozen'      // No time passes (ratio: 0)
  | 'crawling'    // 100-10 years outside per year inside (ratio: 0.01-0.1)
  | 'slow'        // 10-2 years outside per year inside (ratio: 0.1-0.5)
  | 'normal'      // Same as parent (ratio: 1.0)
  | 'fast'        // 1 year inside = weeks outside (ratio: 2-10)
  | 'rushing'     // 1 year inside = days outside (ratio: 10-100)
  | 'subjective'; // Depends on perception (dreams)

export interface TimeFlowConfig {
  type: TimeFlowType;
  /** Ratio: 1.0 = same as parent, 0.1 = realm is 10x slower */
  ratio: number;
}

export const DEFAULT_TIME_FLOWS: Record<TimeFlowType, number> = {
  frozen: 0,
  crawling: 0.05,
  slow: 0.2,
  normal: 1.0,
  fast: 5.0,
  rushing: 50.0,
  subjective: 1.0, // Varies
};

// ============================================================================
// Environment & Topology
// ============================================================================

export type EnvironmentType =
  // Natural
  | 'eternal_spring'
  | 'eternal_summer'
  | 'eternal_autumn'
  | 'eternal_winter'
  | 'eternal_twilight'
  | 'eternal_night'
  | 'eternal_day'
  // Elemental
  | 'fire_dominant'
  | 'water_dominant'
  | 'earth_dominant'
  | 'air_dominant'
  | 'void'
  // Abstract
  | 'dream_shifting'
  | 'memory_landscape'
  | 'emotional_reflection'
  // Constructed
  | 'divine_architecture'
  | 'impossible_geometry'
  | 'crystalline'
  // Hazardous
  | 'toxic'
  | 'chaotic'
  | 'entropic';

export type TopologyType =
  | 'bounded'         // Has clear borders
  | 'unbounded'       // Extends infinitely
  | 'looping'         // Wraps around
  | 'nested'          // Contains sub-realms
  | 'shifting'        // Changes over time
  | 'layered'         // Multiple overlapping planes
  | 'fractured'       // Disconnected pieces
  | 'singular';       // Single location, no "outside"

// ============================================================================
// Access Methods
// ============================================================================

export type AccessMethod =
  | 'death'           // Die to enter (underworlds)
  | 'dream'           // Enter while sleeping (dream realms)
  | 'ritual'          // Perform specific ritual
  | 'portal'          // Find/use a portal
  | 'invitation'      // Be invited by inhabitant
  | 'pilgrimage'      // Physical/spiritual journey
  | 'ascension'       // Earn entry through deeds
  | 'trance'          // Shamanic/meditative state
  | 'physical_gate'   // Walk through a physical door
  | 'summoning'       // Be called by someone inside
  | 'birth'           // Be born there
  | 'transformation'; // Transform into appropriate form

export type AccessRestrictionType =
  | 'identity'        // Only certain beings
  | 'state'           // Only dead/dreaming/etc.
  | 'action'          // Must complete trial
  | 'permission'      // Must have approval
  | 'knowledge'       // Must know the way
  | 'time'            // Only at certain moments
  | 'offering'        // Must bring/sacrifice something
  | 'purity';         // Must meet spiritual standard

export interface AccessRestriction {
  type: AccessRestrictionType;
  requirement: string;
  description: string;
}

/** Base costs for different access methods (for living mortals) */
export const ACCESS_COSTS: Record<AccessMethod, { min: number; max: number }> = {
  death: { min: 0, max: 0 },           // Free but permanent
  dream: { min: 10, max: 100 },        // Easy but temporary
  ritual: { min: 100, max: 1000 },     // Requires preparation
  portal: { min: 50, max: 500 },       // If you find one
  invitation: { min: 0, max: 0 },      // Free (relationship-based)
  pilgrimage: { min: 500, max: 5000 }, // Journey IS the cost
  ascension: { min: 0, max: 0 },       // Earned through life
  trance: { min: 50, max: 500 },       // Skill-based
  physical_gate: { min: 10, max: 100 }, // Walk through
  summoning: { min: 100, max: 1000 },  // Someone else pays
  birth: { min: 0, max: 0 },           // Natural
  transformation: { min: 500, max: 5000 }, // Change yourself
};

// ============================================================================
// Realm Laws
// ============================================================================

export type RealmLawType =
  | 'no_violence'           // Combat impossible
  | 'truth_binding'         // Lies impossible
  | 'time_dilation'         // Time flows differently
  | 'memory_fading'         // Visitors forget
  | 'emotional_amplification' // Feelings intensified
  | 'physical_transformation' // Bodies change
  | 'dream_logic'           // Causality weakened
  | 'judgment'              // Past deeds visible
  | 'binding_contracts'     // Deals enforced
  | 'no_exit'               // Cannot leave without permission
  | 'hospitality_sacred'    // Guests protected
  | 'hierarchy_enforced'    // Ruler's word is law
  | 'element_dominant'      // One element has power
  | 'mortal_aging'          // Mortals age rapidly
  | 'immortal_stasis'       // No aging at all
  | 'silence'               // Sound cannot exist
  | 'visibility'            // Nothing can hide
  | 'shapeshifting_easy'    // Form is fluid
  | 'shapeshifting_locked'; // Form is fixed

export type LawEnforcementType =
  | 'automatic'   // Reality itself enforces
  | 'environmental' // Realm reacts
  | 'guardians'   // Entities enforce
  | 'ruler';      // Presence intervenes

export interface RealmLaw {
  type: RealmLawType;
  enforcement: LawEnforcementType;
  strength: number; // 0-1, how strictly enforced
  description: string;
}

// ============================================================================
// Realm Inhabitants
// ============================================================================

export type InhabitantType =
  | 'native'      // Born/created in realm
  | 'ascended'    // Mortals who earned entry
  | 'dead'        // Souls of deceased
  | 'visitor'     // Living travelers
  | 'prisoner'    // Trapped by force
  | 'servant'     // Created by ruler
  | 'wild';       // Uncontrolled beings

export interface RealmInhabitant {
  id: string;
  type: InhabitantType;
  name?: string;
  speciesOrForm: string;

  /** How permanent is their presence? */
  permanence: 'permanent' | 'until_freed' | 'temporary' | 'at_will';

  /** Can they leave? */
  canLeave: boolean;

  /** What happens if they leave? */
  exitConsequences?: string;
}

// ============================================================================
// The Realm Data Structure
// ============================================================================

export interface Realm {
  id: string;
  name: string;
  description: string;

  // Classification
  category: RealmCategory;
  size: RealmSize;

  // Hierarchy
  parentUniverseId: string;
  parentRealmId?: string; // If nested within another realm
  subRealmIds: string[];

  // Properties
  topology: TopologyType;
  environment: EnvironmentType;
  timeFlow: TimeFlowConfig;
  stability: number; // 0-1

  // Access
  accessMethods: AccessMethod[];
  accessRestrictions: AccessRestriction[];

  // Governance
  rulerId?: string; // Presence ID
  contested: boolean;
  laws: RealmLaw[];

  // Status
  selfSustaining: boolean;
  attentionMaintenance: number; // Cost per tick if not self-sustaining
  currentInhabitants: number;
  peakInhabitants: number;

  // Connections
  connectedRealmIds: string[];
  portalLocations: PortalLocation[];

  // History
  createdAt: number;
  creatorId?: string;
  majorEvents: RealmEvent[];
}

export interface PortalLocation {
  id: string;
  targetRealmId: string;
  locationDescription: string;
  bidirectional: boolean;
  restrictions: AccessRestriction[];
  activationCondition?: string; // "full moon", "blood sacrifice", etc.
}

export interface RealmEvent {
  type: RealmEventType;
  timestamp: number;
  description: string;
  participants?: string[];
}

export type RealmEventType =
  | 'created'
  | 'ruler_changed'
  | 'expanded'
  | 'contracted'
  | 'merged'
  | 'split'
  | 'invaded'
  | 'defended'
  | 'law_added'
  | 'law_removed'
  | 'portal_opened'
  | 'portal_closed'
  | 'became_self_sustaining'
  | 'began_fading';

// ============================================================================
// Realm Creation
// ============================================================================

export interface RealmCreationConfig {
  name: string;
  category: RealmCategory;
  size: RealmSize;
  parentUniverseId: string;
  parentRealmId?: string;

  topology?: TopologyType;
  environment?: EnvironmentType;
  timeFlow?: TimeFlowConfig;

  initialLaws?: RealmLaw[];
  accessMethods?: AccessMethod[];
  accessRestrictions?: AccessRestriction[];
}

export interface RealmCreationCost {
  baseCost: number;
  sizeMultiplier: number;
  complexityMultiplier: number;
  totalCost: number;
  canAfford: boolean;
  spectrumRequirement: number;
  meetsRequirement: boolean;
}

/** Calculate the cost to create a realm */
export function calculateRealmCreationCost(
  presence: Presence,
  config: RealmCreationConfig
): RealmCreationCost {
  const baseCost = REALM_CREATION_COSTS[config.size];
  const spectrumRequirement = REALM_SIZE_REQUIREMENTS[config.size];

  // Size multiplier is 1.0 (already in base cost)
  const sizeMultiplier = 1.0;

  // Complexity based on features
  let complexityMultiplier = 1.0;

  // Time dilation adds cost
  if (config.timeFlow && config.timeFlow.type !== 'normal') {
    complexityMultiplier += 0.2;
  }

  // Unusual environments add cost
  if (config.environment && ['void', 'chaotic', 'entropic'].includes(config.environment)) {
    complexityMultiplier += 0.3;
  }

  // Many laws add cost
  if (config.initialLaws && config.initialLaws.length > 3) {
    complexityMultiplier += 0.1 * (config.initialLaws.length - 3);
  }

  const totalCost = Math.ceil(baseCost * sizeMultiplier * complexityMultiplier);

  return {
    baseCost,
    sizeMultiplier,
    complexityMultiplier,
    totalCost,
    canAfford: presence.attention >= totalCost,
    spectrumRequirement,
    meetsRequirement: presence.spectrumPosition >= spectrumRequirement,
  };
}

/** Check if a presence can create a realm */
export function canCreateRealm(
  presence: Presence,
  config: RealmCreationConfig
): { allowed: boolean; reason?: string } {
  const cost = calculateRealmCreationCost(presence, config);

  if (!cost.meetsRequirement) {
    return {
      allowed: false,
      reason: `Requires spectrum position ${cost.spectrumRequirement}, current: ${presence.spectrumPosition.toFixed(2)}`,
    };
  }

  if (!cost.canAfford) {
    return {
      allowed: false,
      reason: `Requires ${cost.totalCost} attention, have ${Math.floor(presence.attention)}`,
    };
  }

  return { allowed: true };
}

/** Create a new realm */
export function createRealm(
  id: string,
  config: RealmCreationConfig,
  creatorId: string,
  currentTime: number
): Realm {
  return {
    id,
    name: config.name,
    description: `A ${config.size} ${config.category} realm`,
    category: config.category,
    size: config.size,
    parentUniverseId: config.parentUniverseId,
    parentRealmId: config.parentRealmId,
    subRealmIds: [],
    topology: config.topology ?? 'bounded',
    environment: config.environment ?? 'eternal_twilight',
    timeFlow: config.timeFlow ?? { type: 'normal', ratio: 1.0 },
    stability: 0.8,
    accessMethods: config.accessMethods ?? ['ritual', 'invitation'],
    accessRestrictions: config.accessRestrictions ?? [],
    rulerId: creatorId,
    contested: false,
    laws: config.initialLaws ?? [],
    selfSustaining: false,
    attentionMaintenance: getMaintenanceCost(config.size),
    currentInhabitants: 0,
    peakInhabitants: 0,
    connectedRealmIds: [],
    portalLocations: [],
    createdAt: currentTime,
    creatorId,
    majorEvents: [
      {
        type: 'created',
        timestamp: currentTime,
        description: `${config.name} was created`,
      },
    ],
  };
}

/** Get maintenance cost per tick for non-self-sustaining realm */
function getMaintenanceCost(size: RealmSize): number {
  const costs: Record<RealmSize, number> = {
    pocket: 10,
    domain: 50,
    territory: 100,
    kingdom: 200,
    infinite: 500,
  };
  return costs[size];
}

// ============================================================================
// Realm Access
// ============================================================================

export interface RealmAccessAttempt {
  realmId: string;
  entityId: string;
  entityType: 'mortal' | 'spirit' | 'presence';
  method: AccessMethod;
  meetsRestrictions: boolean;
  restrictionsFailed: string[];
  cost: number;
  canAfford: boolean;
}

/** Check if an entity can access a realm */
export function checkRealmAccess(
  realm: Realm,
  entityId: string,
  entityType: 'mortal' | 'spirit' | 'presence',
  method: AccessMethod,
  entityAttributes: Record<string, unknown>
): RealmAccessAttempt {
  // Check if method is available
  if (!realm.accessMethods.includes(method)) {
    return {
      realmId: realm.id,
      entityId,
      entityType,
      method,
      meetsRestrictions: false,
      restrictionsFailed: [`Method '${method}' not available for this realm`],
      cost: 0,
      canAfford: false,
    };
  }

  // Check restrictions
  const failedRestrictions: string[] = [];
  for (const restriction of realm.accessRestrictions) {
    // In real implementation, would check entityAttributes against restriction
    // For now, just track that restrictions exist
    if (!meetsRestriction(restriction, entityAttributes)) {
      failedRestrictions.push(restriction.description);
    }
  }

  const costRange = ACCESS_COSTS[method];
  const cost = (costRange.min + costRange.max) / 2;

  return {
    realmId: realm.id,
    entityId,
    entityType,
    method,
    meetsRestrictions: failedRestrictions.length === 0,
    restrictionsFailed: failedRestrictions,
    cost,
    canAfford: true, // Would check entity's resources
  };
}

function meetsRestriction(
  restriction: AccessRestriction,
  attributes: Record<string, unknown>
): boolean {
  // Simplified - would have real logic per restriction type
  switch (restriction.type) {
    case 'identity':
      return attributes.identity === restriction.requirement;
    case 'state':
      return attributes.state === restriction.requirement;
    case 'permission':
      return !!attributes.hasPermission;
    default:
      return true;
  }
}

// ============================================================================
// Realm Maintenance & Self-Sustenance
// ============================================================================

/** Check if realm has become self-sustaining */
export function checkSelfSustenance(realm: Realm): {
  isSelfSustaining: boolean;
  attentionGenerated: number;
  maintenanceRequired: number;
} {
  // Self-sustaining when: attention from inhabitants + belief >= maintenance × 1.5
  const baseFromInhabitants = realm.currentInhabitants * 0.1;
  const beliefBonus = realm.category === 'celestial' || realm.category === 'underworld' ? 50 : 0;
  const attentionGenerated = baseFromInhabitants + beliefBonus;

  const maintenanceRequired = realm.attentionMaintenance;
  const threshold = maintenanceRequired * 1.5;

  return {
    isSelfSustaining: attentionGenerated >= threshold,
    attentionGenerated,
    maintenanceRequired,
  };
}

/** Update realm for one tick */
export function updateRealm(
  realm: Realm,
  rulerAttention: number,
  deltaTime: number
): { realm: Realm; attentionDrained: number; events: RealmEvent[] } {
  const events: RealmEvent[] = [];
  let attentionDrained = 0;

  // Check self-sustenance
  const sustenance = checkSelfSustenance(realm);

  if (sustenance.isSelfSustaining && !realm.selfSustaining) {
    // Became self-sustaining
    events.push({
      type: 'became_self_sustaining',
      timestamp: Date.now(),
      description: `${realm.name} has become self-sustaining`,
    });
    return {
      realm: { ...realm, selfSustaining: true },
      attentionDrained: 0,
      events,
    };
  }

  if (!realm.selfSustaining) {
    // Drain attention from ruler
    attentionDrained = realm.attentionMaintenance * deltaTime;

    if (rulerAttention < attentionDrained) {
      // Realm starts fading
      events.push({
        type: 'began_fading',
        timestamp: Date.now(),
        description: `${realm.name} begins to fade due to lack of maintenance`,
      });
      return {
        realm: { ...realm, stability: Math.max(0, realm.stability - 0.1) },
        attentionDrained: rulerAttention,
        events,
      };
    }
  }

  return { realm, attentionDrained, events };
}

// ============================================================================
// Realm Connections
// ============================================================================

/** Connect two realms with a portal */
export function createPortal(
  sourceRealm: Realm,
  targetRealmId: string,
  locationDescription: string,
  bidirectional: boolean,
  restrictions: AccessRestriction[] = []
): Realm {
  const portal: PortalLocation = {
    id: `portal_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    targetRealmId,
    locationDescription,
    bidirectional,
    restrictions,
  };

  return {
    ...sourceRealm,
    portalLocations: [...sourceRealm.portalLocations, portal],
    connectedRealmIds: sourceRealm.connectedRealmIds.includes(targetRealmId)
      ? sourceRealm.connectedRealmIds
      : [...sourceRealm.connectedRealmIds, targetRealmId],
    majorEvents: [
      ...sourceRealm.majorEvents,
      {
        type: 'portal_opened',
        timestamp: Date.now(),
        description: `Portal opened to ${targetRealmId}`,
      },
    ],
  };
}

// ============================================================================
// Common Realm Presets
// ============================================================================

export type RealmPreset =
  | 'olympus'       // Greek celestial court
  | 'asgard'        // Norse celestial realm
  | 'heaven'        // Monotheistic paradise
  | 'hades'         // Greek underworld
  | 'valhalla'      // Norse warrior afterlife
  | 'faerie'        // Fae wild realm
  | 'avalon'        // Celtic otherworld
  | 'dreaming'      // Dream realm
  | 'elemental_fire' // Fire plane
  | 'crossroads';   // Liminal deal-making space

export function getRealmPreset(preset: RealmPreset): Partial<RealmCreationConfig> {
  switch (preset) {
    case 'olympus':
      return {
        category: 'celestial',
        size: 'kingdom',
        topology: 'bounded',
        environment: 'eternal_spring',
        timeFlow: { type: 'slow', ratio: 0.1 },
        accessMethods: ['ascension', 'invitation', 'pilgrimage'],
        initialLaws: [
          { type: 'hospitality_sacred', enforcement: 'automatic', strength: 0.9, description: 'Guests are protected' },
          { type: 'hierarchy_enforced', enforcement: 'ruler', strength: 1.0, description: 'Ruler\'s word is law' },
        ],
      };

    case 'asgard':
      return {
        category: 'celestial',
        size: 'kingdom',
        topology: 'bounded',
        environment: 'eternal_day',
        timeFlow: { type: 'slow', ratio: 0.2 },
        accessMethods: ['ascension', 'invitation', 'pilgrimage', 'death'],
        accessRestrictions: [
          { type: 'identity', requirement: 'norse_worthy', description: 'Only the worthy may enter' },
        ],
        initialLaws: [
          { type: 'no_violence', enforcement: 'automatic', strength: 0.0, description: 'Violence is permitted in Asgard' },
        ],
      };

    case 'heaven':
      return {
        category: 'celestial',
        size: 'infinite',
        topology: 'layered',
        environment: 'divine_architecture',
        timeFlow: { type: 'frozen', ratio: 0 },
        accessMethods: ['death', 'ascension'],
        accessRestrictions: [
          { type: 'purity', requirement: 'righteous', description: 'Only the righteous may enter' },
        ],
        initialLaws: [
          { type: 'no_violence', enforcement: 'automatic', strength: 1.0, description: 'Violence is impossible' },
          { type: 'emotional_amplification', enforcement: 'environmental', strength: 0.8, description: 'Joy is amplified' },
        ],
      };

    case 'hades':
      return {
        category: 'underworld',
        size: 'infinite',
        topology: 'nested',
        environment: 'eternal_twilight',
        timeFlow: { type: 'normal', ratio: 1.0 },
        accessMethods: ['death', 'pilgrimage', 'ritual'],
        accessRestrictions: [
          { type: 'state', requirement: 'dead_or_hero', description: 'Must be dead or a hero' },
        ],
        initialLaws: [
          { type: 'no_exit', enforcement: 'automatic', strength: 0.95, description: 'The dead cannot leave' },
          { type: 'binding_contracts', enforcement: 'automatic', strength: 1.0, description: 'Oaths on the Styx are absolute' },
        ],
      };

    case 'valhalla':
      return {
        category: 'celestial',
        size: 'territory',
        topology: 'bounded',
        environment: 'eternal_autumn',
        timeFlow: { type: 'slow', ratio: 0.5 },
        accessMethods: ['death'],
        accessRestrictions: [
          { type: 'action', requirement: 'died_in_battle', description: 'Must die gloriously in battle' },
        ],
        initialLaws: [
          { type: 'immortal_stasis', enforcement: 'automatic', strength: 1.0, description: 'Warriors cannot truly die' },
        ],
      };

    case 'faerie':
      return {
        category: 'wild',
        size: 'infinite',
        topology: 'shifting',
        environment: 'dream_shifting',
        timeFlow: { type: 'crawling', ratio: 0.01 },
        accessMethods: ['ritual', 'portal', 'invitation', 'dream'],
        initialLaws: [
          { type: 'binding_contracts', enforcement: 'automatic', strength: 1.0, description: 'All deals are binding' },
          { type: 'truth_binding', enforcement: 'environmental', strength: 0.5, description: 'Fae cannot directly lie' },
          { type: 'time_dilation', enforcement: 'automatic', strength: 1.0, description: 'Time flows strangely' },
        ],
      };

    case 'avalon':
      return {
        category: 'liminal',
        size: 'territory',
        topology: 'bounded',
        environment: 'eternal_spring',
        timeFlow: { type: 'slow', ratio: 0.1 },
        accessMethods: ['pilgrimage', 'invitation', 'ritual'],
        accessRestrictions: [
          { type: 'knowledge', requirement: 'knows_the_way', description: 'Must know the path' },
        ],
        initialLaws: [
          { type: 'immortal_stasis', enforcement: 'environmental', strength: 0.7, description: 'Wounds heal, aging slows' },
        ],
      };

    case 'dreaming':
      return {
        category: 'dream',
        size: 'infinite',
        topology: 'shifting',
        environment: 'dream_shifting',
        timeFlow: { type: 'subjective', ratio: 1.0 },
        accessMethods: ['dream', 'trance'],
        initialLaws: [
          { type: 'dream_logic', enforcement: 'automatic', strength: 1.0, description: 'Causality is suggestions' },
          { type: 'shapeshifting_easy', enforcement: 'environmental', strength: 0.8, description: 'Form follows thought' },
        ],
      };

    case 'elemental_fire':
      return {
        category: 'elemental',
        size: 'infinite',
        topology: 'unbounded',
        environment: 'fire_dominant',
        timeFlow: { type: 'fast', ratio: 3.0 },
        accessMethods: ['ritual', 'portal', 'transformation'],
        accessRestrictions: [
          { type: 'state', requirement: 'fire_resistant', description: 'Must survive the flames' },
        ],
        initialLaws: [
          { type: 'element_dominant', enforcement: 'automatic', strength: 1.0, description: 'Fire pervades all' },
        ],
      };

    case 'crossroads':
      return {
        category: 'liminal',
        size: 'pocket',
        topology: 'singular',
        environment: 'eternal_twilight',
        timeFlow: { type: 'frozen', ratio: 0 },
        accessMethods: ['ritual', 'portal'],
        accessRestrictions: [
          { type: 'time', requirement: 'liminal_hour', description: 'Only accessible at dawn, dusk, or midnight' },
        ],
        initialLaws: [
          { type: 'binding_contracts', enforcement: 'automatic', strength: 1.0, description: 'All deals made here are absolute' },
          { type: 'truth_binding', enforcement: 'automatic', strength: 0.8, description: 'Lies are difficult' },
        ],
      };

    default:
      return {};
  }
}

// ============================================================================
// Soul/Afterlife Integration
// ============================================================================

export type AfterlifeDestination =
  | 'judgment'       // Goes to judgment realm first
  | 'direct'         // Goes directly to appropriate afterlife
  | 'reincarnation'  // Returns to mortal world
  | 'dissolution'    // Ceases to exist
  | 'wandering';     // Becomes a ghost/shade

export interface SoulJourney {
  soulId: string;
  originUniverseId: string;
  deathCause: string;
  deathTime: number;

  /** Path taken through realms */
  path: SoulJourneyStep[];

  /** Final destination */
  destination?: string; // Realm ID
  destinationType?: AfterlifeDestination;

  /** Current status */
  status: 'traveling' | 'judged' | 'settled' | 'reincarnated' | 'dissolved' | 'lost';
}

export interface SoulJourneyStep {
  realmId: string;
  enteredAt: number;
  exitedAt?: number;
  experience: string;
}

/** Determine afterlife destination for a soul */
export function determineAfterlife(
  soul: { id: string; religiousAffiliation?: string; moralState?: number; deathType?: string },
  availableRealms: Realm[]
): { realmId: string; reason: string } | null {
  // Check religious affiliation first
  if (soul.religiousAffiliation) {
    const affiliatedRealm = availableRealms.find(r =>
      r.category === 'underworld' || r.category === 'celestial'
    );
    if (affiliatedRealm) {
      return {
        realmId: affiliatedRealm.id,
        reason: `Religious affiliation: ${soul.religiousAffiliation}`,
      };
    }
  }

  // Check death type (battle death → warrior afterlife)
  if (soul.deathType === 'battle') {
    const warriorRealm = availableRealms.find(r =>
      r.name.toLowerCase().includes('valhalla') ||
      r.name.toLowerCase().includes('warrior')
    );
    if (warriorRealm) {
      return {
        realmId: warriorRealm.id,
        reason: 'Died gloriously in battle',
      };
    }
  }

  // Default to nearest underworld
  const underworld = availableRealms.find(r => r.category === 'underworld');
  if (underworld) {
    return {
      realmId: underworld.id,
      reason: 'Default afterlife destination',
    };
  }

  return null;
}

// ============================================================================
// Query Functions
// ============================================================================

/** Get all realms a presence can create */
export function getCreatableRealmSizes(spectrumPosition: number): RealmSize[] {
  return (Object.entries(REALM_SIZE_REQUIREMENTS) as [RealmSize, number][])
    .filter(([, req]) => spectrumPosition >= req)
    .map(([size]) => size);
}

/** Get realms connected to a given realm */
export function getConnectedRealms(realm: Realm, allRealms: Realm[]): Realm[] {
  return allRealms.filter(r => realm.connectedRealmIds.includes(r.id));
}

/** Get all portals from a realm */
export function getPortalsFrom(realm: Realm): PortalLocation[] {
  return realm.portalLocations;
}

/** Check if realm is fading */
export function isRealmFading(realm: Realm): boolean {
  return realm.stability < 0.5 && !realm.selfSustaining;
}

/** Get realm hierarchy (parent realms up to universe) */
export function getRealmHierarchy(realm: Realm, allRealms: Realm[]): Realm[] {
  const hierarchy: Realm[] = [realm];

  let current = realm;
  while (current.parentRealmId) {
    const parent = allRealms.find(r => r.id === current.parentRealmId);
    if (parent) {
      hierarchy.unshift(parent);
      current = parent;
    } else {
      break;
    }
  }

  return hierarchy;
}
