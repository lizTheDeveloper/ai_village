/**
 * MultiverseCrossing - Divine Inter-Universe Travel
 *
 * Universe crossing is RIDICULOUSLY EXPENSIVE but has MANY PATHWAYS.
 *
 * CORE DESIGN:
 * - Cold crossing (first time) costs astronomical amounts of attention
 * - Passages (semi-permanent connections) dramatically reduce subsequent costs
 * - 10+ different methods, each suited to different situations
 * - Higher spectrum positions unlock more/better options
 *
 * See: specs/multiverse-divinity-crossing.md
 */

import type { Presence } from './PresenceSpectrum.js';

// ============================================================================
// Base Crossing Costs
// ============================================================================

/** Base attention cost for cold crossing (first time, no passage) */
export const BASE_CROSSING_COSTS = {
  mortal: 10_000,
  spirit: 50_000,          // 0.15-0.45
  kami: 200_000,           // 0.45-0.75
  deity: 1_000_000,        // 0.75-0.90
  transcendent: 5_000_000, // 0.90+
} as const;

export type CrossingEntityType = keyof typeof BASE_CROSSING_COSTS;

/** Get entity type for crossing cost purposes */
export function getEntityTypeForCrossing(spectrumPosition: number): CrossingEntityType {
  if (spectrumPosition < 0.15) return 'mortal';
  if (spectrumPosition < 0.45) return 'spirit';
  if (spectrumPosition < 0.75) return 'kami';
  if (spectrumPosition < 0.90) return 'deity';
  return 'transcendent';
}

// ============================================================================
// Universe Compatibility
// ============================================================================

export interface UniverseCompatibility {
  sourceUniverseId: string;
  targetUniverseId: string;

  /** Overall compatibility score (0.0 = identical, 5.0 = utterly hostile) */
  score: number;

  /** Individual compatibility factors */
  factors: CompatibilityFactors;
}

export interface CompatibilityFactors {
  /** How similar are magic paradigms? (0-5) */
  magicParadigm: number;

  /** How similar are divine systems? (0-5) */
  divineSystem: number;

  /** How similar are physical laws? (0-5) */
  physicalLaws: number;

  /** How similar is time flow? (0-5) */
  timeFlow: number;

  /** How aligned are moral frameworks? (0-5) */
  morality: number;
}

/** Calculate overall compatibility score */
export function calculateCompatibilityScore(factors: CompatibilityFactors): number {
  const values = Object.values(factors);
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

/** Get compatibility level from score */
export function getCompatibilityLevel(
  score: number
): 'compatible' | 'neutral' | 'incompatible' | 'hostile' {
  if (score < 1.0) return 'compatible';
  if (score < 2.5) return 'neutral';
  if (score < 4.0) return 'incompatible';
  return 'hostile';
}

// ============================================================================
// Passage Types
// ============================================================================

export type PassageType = 'thread' | 'bridge' | 'gate' | 'confluence';

export interface PassageTypeConfig {
  type: PassageType;

  /** Cost to create as percentage of cold crossing cost */
  creationCostPercent: number;

  /** Crossing cost once established as percentage of cold crossing */
  crossingCostPercent: number;

  /** Typical duration without maintenance (in years) */
  durationYears: number;

  /** How many entities can cross at once */
  capacityDescription: 'one' | 'small_group' | 'army' | 'unlimited';

  /** How visible is this passage? */
  detectability: 'invisible' | 'subtle' | 'visible' | 'obvious';

  /** How hard is it to destroy? */
  vulnerability: 'fragile' | 'moderate' | 'defended' | 'nearly_indestructible';

  /** Maintenance interval (in years, 0 = never) */
  maintenanceIntervalYears: number;

  /** Maintenance cost as percentage of creation cost */
  maintenanceCostPercent: number;
}

export const PASSAGE_CONFIGS: Record<PassageType, PassageTypeConfig> = {
  thread: {
    type: 'thread',
    creationCostPercent: 5,
    crossingCostPercent: 20,
    durationYears: 5,
    capacityDescription: 'one',
    detectability: 'invisible',
    vulnerability: 'fragile',
    maintenanceIntervalYears: 1,
    maintenanceCostPercent: 1,
  },
  bridge: {
    type: 'bridge',
    creationCostPercent: 20,
    crossingCostPercent: 5,
    durationYears: 50,
    capacityDescription: 'small_group',
    detectability: 'subtle',
    vulnerability: 'moderate',
    maintenanceIntervalYears: 10,
    maintenanceCostPercent: 2,
  },
  gate: {
    type: 'gate',
    creationCostPercent: 50,
    crossingCostPercent: 1,
    durationYears: 500,
    capacityDescription: 'army',
    detectability: 'visible',
    vulnerability: 'defended',
    maintenanceIntervalYears: 100,
    maintenanceCostPercent: 5,
  },
  confluence: {
    type: 'confluence',
    creationCostPercent: 100, // But shared by both sides
    crossingCostPercent: 0.1,
    durationYears: Infinity,
    capacityDescription: 'unlimited',
    detectability: 'obvious',
    vulnerability: 'nearly_indestructible',
    maintenanceIntervalYears: 0, // Never needs maintenance
    maintenanceCostPercent: 0,
  },
};

// ============================================================================
// Passage Data Structure
// ============================================================================

export interface MultiversePassage {
  id: string;
  type: PassageType;

  /** Universe IDs */
  sourceUniverseId: string;
  targetUniverseId: string;

  /** Anchor locations (if any) */
  sourceLocation?: { x: number; y: number; z?: number };
  targetLocation?: { x: number; y: number; z?: number };

  // Ownership
  creatorId: string;
  owners: string[];
  accessPolicy: PassageAccessPolicy;

  // Status
  health: number; // 0.0 - 1.0
  capacity: number; // Current capacity (affected by health)
  createdAt: number;
  lastMaintenance: number;
  missedMaintenanceCount: number;

  // Costs (current, affected by health and other factors)
  currentCrossingCost: number; // Actual attention cost to cross
  maintenanceCost: number; // Cost for next maintenance

  // Traffic
  totalCrossings: number;
  recentCrossings: CrossingRecord[];
}

export type PassageAccessPolicy =
  | 'private'   // Only owners can use
  | 'shared'    // Owners and designated entities
  | 'public'    // Anyone can use
  | 'contested'; // Ownership disputed

export interface CrossingRecord {
  entityId: string;
  entityType: CrossingEntityType;
  timestamp: number;
  direction: 'forward' | 'reverse';
  costPaid: number;
  success: boolean;
}

// ============================================================================
// Crossing Methods
// ============================================================================

export type CrossingMethod =
  | 'presence_extension'    // 0.60+ - Extend into new universe while maintaining home
  | 'divine_projection'     // 0.75+ - Send a weaker fragment
  | 'divine_conveyance'     // 0.85+ - Carry lesser entities across
  | 'worship_tunnel'        // 0.70+ - Use synchronized worship
  | 'cosmic_wound'          // 0.50+ - Exploit existing rifts
  | 'death_passage'         // Any - Die and be reborn
  | 'anchor_transfer'       // 0.80+ - Move the anchor, presence follows
  | 'collective_passage'    // 0.60+ - Multiple presences cooperate
  | 'transcendent_carving'  // 0.95+ - Raw reality manipulation
  | 'syncretism_absorption' // Passive - Natural manifestation in similar worship
  | 'passage_crossing';     // Any with passage access

export interface CrossingMethodConfig {
  method: CrossingMethod;
  minimumPosition: number;

  /** Base cost as multiplier of cold crossing cost */
  costMultiplier: number;

  /** Base risk (0-1, chance of serious problems) */
  baseRisk: number;

  /** Can this method create passages? */
  canCreatePassage: boolean;

  /** What passage types can it create? */
  creatablePassageTypes: PassageType[];

  /** Description */
  description: string;
}

export const CROSSING_METHODS: Record<CrossingMethod, CrossingMethodConfig> = {
  presence_extension: {
    method: 'presence_extension',
    minimumPosition: 0.60,
    costMultiplier: 0.3, // Gradual, so cheaper overall but slow
    baseRisk: 0.1,
    canCreatePassage: false,
    creatablePassageTypes: [],
    description: 'Extend presence into target universe while maintaining home base',
  },
  divine_projection: {
    method: 'divine_projection',
    minimumPosition: 0.75,
    costMultiplier: 0.3, // 20% for creation + 10% for crossing
    baseRisk: 0.15,
    canCreatePassage: true,
    creatablePassageTypes: ['thread', 'bridge'],
    description: 'Send a weaker fragment to scout and establish presence',
  },
  divine_conveyance: {
    method: 'divine_conveyance',
    minimumPosition: 0.85,
    costMultiplier: 1.1, // Full cost + 10% per conveyed
    baseRisk: 0.25,
    canCreatePassage: true,
    creatablePassageTypes: ['bridge', 'gate'],
    description: 'Carry lesser entities across within your divine protection',
  },
  worship_tunnel: {
    method: 'worship_tunnel',
    minimumPosition: 0.70,
    costMultiplier: 0.0, // No direct cost to deity
    baseRisk: 0.3,
    canCreatePassage: false,
    creatablePassageTypes: [],
    description: 'Traverse when synchronized worship creates natural tunnel',
  },
  cosmic_wound: {
    method: 'cosmic_wound',
    minimumPosition: 0.50,
    costMultiplier: 0.1, // Cheap but dangerous
    baseRisk: 0.5,
    canCreatePassage: false,
    creatablePassageTypes: [],
    description: 'Exploit existing tears in reality',
  },
  death_passage: {
    method: 'death_passage',
    minimumPosition: 0.0, // Any can attempt
    costMultiplier: 0.0, // Free but you die
    baseRisk: 0.9, // Extremely risky
    canCreatePassage: false,
    creatablePassageTypes: [],
    description: 'Die in home universe, potentially reborn in target',
  },
  anchor_transfer: {
    method: 'anchor_transfer',
    minimumPosition: 0.80,
    costMultiplier: 0.4, // Object crossing + re-anchoring
    baseRisk: 0.2,
    canCreatePassage: false,
    creatablePassageTypes: [],
    description: 'Transfer your anchor object, follow it across',
  },
  collective_passage: {
    method: 'collective_passage',
    minimumPosition: 0.60,
    costMultiplier: 0.4, // Shared cost
    baseRisk: 0.15,
    canCreatePassage: true,
    creatablePassageTypes: ['bridge', 'gate'],
    description: 'Multiple presences pool resources for crossing',
  },
  transcendent_carving: {
    method: 'transcendent_carving',
    minimumPosition: 0.95,
    costMultiplier: 2.0, // Expensive but creates best passage
    baseRisk: 0.1,
    canCreatePassage: true,
    creatablePassageTypes: ['gate', 'confluence'],
    description: 'Carve a passage through reality with pure power',
  },
  syncretism_absorption: {
    method: 'syncretism_absorption',
    minimumPosition: 0.0,
    costMultiplier: 0.0, // Free
    baseRisk: 0.0,
    canCreatePassage: false,
    creatablePassageTypes: [],
    description: 'Naturally manifest where identical worship exists',
  },
  passage_crossing: {
    method: 'passage_crossing',
    minimumPosition: 0.0,
    costMultiplier: 0.0, // Depends on passage
    baseRisk: 0.05,
    canCreatePassage: false,
    creatablePassageTypes: [],
    description: 'Use existing passage',
  },
};

/** Get available crossing methods for a presence */
export function getAvailableCrossingMethods(spectrumPosition: number): CrossingMethod[] {
  return Object.values(CROSSING_METHODS)
    .filter(config => spectrumPosition >= config.minimumPosition)
    .map(config => config.method);
}

// ============================================================================
// Crossing Attempt
// ============================================================================

export interface CrossingAttempt {
  id: string;
  entityId: string;
  entityType: CrossingEntityType;
  spectrumPosition: number;

  sourceUniverseId: string;
  targetUniverseId: string;

  method: CrossingMethod;
  passageId?: string;

  // Cost calculation
  baseCost: number;
  compatibilityMultiplier: number;
  methodMultiplier: number;
  totalCost: number;

  // Status
  status: CrossingStatus;
  initiatedAt: number;
  completedAt?: number;

  // Transit
  transitDuration?: number;
  hazardsEncountered: TransitHazard[];

  // Results
  arrivalPosition?: number;
  attentionLost?: number;
  narrative: string[];
}

export type CrossingStatus =
  | 'planning'
  | 'initiating'
  | 'in_transit'
  | 'arrived'
  | 'failed'
  | 'lost'; // Entity lost in transit

// ============================================================================
// Transit Hazards
// ============================================================================

export type TransitHazardType =
  | 'attention_leech'
  | 'void_shepherd'
  | 'passage_parasite'
  | 'reality_fragment'
  | 'the_hungry'
  | 'paradigm_shock'
  | 'time_distortion';

export interface TransitHazard {
  type: TransitHazardType;
  severity: number; // 0-1
  attentionDrain: number;
  description: string;
  avoidable: boolean;
  avoidCost?: number;
}

export const HAZARD_TEMPLATES: Record<TransitHazardType, Omit<TransitHazard, 'severity' | 'avoidable' | 'avoidCost'>> = {
  attention_leech: {
    type: 'attention_leech',
    attentionDrain: 0.1, // 10% of current attention
    description: 'Parasitic entity draining your presence',
  },
  void_shepherd: {
    type: 'void_shepherd',
    attentionDrain: 0.05, // Small toll
    description: 'Guide offering passage for a price',
  },
  passage_parasite: {
    type: 'passage_parasite',
    attentionDrain: 0.03, // Small ongoing tax
    description: 'Entity attached to passage, taking its cut',
  },
  reality_fragment: {
    type: 'reality_fragment',
    attentionDrain: 0.2, // Dangerous
    description: 'Broken piece of a failed universe, toxic to touch',
  },
  the_hungry: {
    type: 'the_hungry',
    attentionDrain: 0.3, // Very dangerous
    description: 'Former presences that died in transit, now predatory',
  },
  paradigm_shock: {
    type: 'paradigm_shock',
    attentionDrain: 0.15,
    description: 'Your essence struggles to translate between paradigms',
  },
  time_distortion: {
    type: 'time_distortion',
    attentionDrain: 0.0,
    description: 'Time flows strangely - you may arrive at unexpected moments',
  },
};

// ============================================================================
// Crossing Cost Calculation
// ============================================================================

export interface CrossingCostCalculation {
  baseCost: number;
  entityTypeMultiplier: number;
  universeDistanceMultiplier: number;
  compatibilityMultiplier: number;
  methodMultiplier: number;
  passageDiscount: number; // 0-1, how much passage reduces cost

  totalCost: number;
  canAfford: boolean;
  shortfall: number;
}

/** Calculate the full cost of a crossing attempt */
export function calculateCrossingCost(
  presence: Presence,
  _sourceUniverseId: string,
  _targetUniverseId: string,
  compatibility: UniverseCompatibility,
  method: CrossingMethod,
  passage?: MultiversePassage
): CrossingCostCalculation {
  const entityType = getEntityTypeForCrossing(presence.spectrumPosition);
  const baseCost = BASE_CROSSING_COSTS[entityType];
  const entityTypeMultiplier = 1.0; // Already factored into base cost

  // Universe distance (would need universe metadata, default to 1.0)
  const universeDistanceMultiplier = 1.0;

  // Compatibility affects cost
  const compatibilityMultiplier = Math.max(0.5, Math.pow(compatibility.score, 1.5));

  // Method multiplier
  const methodConfig = CROSSING_METHODS[method];
  const methodMultiplier = methodConfig.costMultiplier;

  // Passage discount
  let passageDiscount = 0;
  if (passage) {
    const passageConfig = PASSAGE_CONFIGS[passage.type];
    passageDiscount = 1 - (passageConfig.crossingCostPercent / 100);
  }

  const preCost = baseCost * entityTypeMultiplier * universeDistanceMultiplier *
                  compatibilityMultiplier * methodMultiplier;
  const totalCost = Math.ceil(preCost * (1 - passageDiscount));

  return {
    baseCost,
    entityTypeMultiplier,
    universeDistanceMultiplier,
    compatibilityMultiplier,
    methodMultiplier,
    passageDiscount,
    totalCost,
    canAfford: presence.attention >= totalCost,
    shortfall: Math.max(0, totalCost - presence.attention),
  };
}

// ============================================================================
// Passage Creation
// ============================================================================

export interface PassageCreationCost {
  baseCost: number;
  passageTypeCost: number;
  compatibilityMultiplier: number;
  totalCost: number;
  canAfford: boolean;
}

/** Calculate cost to create a passage */
export function calculatePassageCreationCost(
  presence: Presence,
  passageType: PassageType,
  compatibility: UniverseCompatibility
): PassageCreationCost {
  const entityType = getEntityTypeForCrossing(presence.spectrumPosition);
  const baseCost = BASE_CROSSING_COSTS[entityType];

  const passageConfig = PASSAGE_CONFIGS[passageType];
  const passageTypeCost = baseCost * (passageConfig.creationCostPercent / 100);

  const compatibilityMultiplier = Math.max(0.5, compatibility.score);
  const totalCost = Math.ceil(passageTypeCost * compatibilityMultiplier);

  return {
    baseCost,
    passageTypeCost,
    compatibilityMultiplier,
    totalCost,
    canAfford: presence.attention >= totalCost,
  };
}

/** Create a new passage */
export function createPassage(
  id: string,
  type: PassageType,
  sourceUniverseId: string,
  targetUniverseId: string,
  creatorId: string,
  currentTime: number
): MultiversePassage {
  return {
    id,
    type,
    sourceUniverseId,
    targetUniverseId,
    creatorId,
    owners: [creatorId],
    accessPolicy: 'private',
    health: 1.0,
    capacity: 100, // Percentage
    createdAt: currentTime,
    lastMaintenance: currentTime,
    missedMaintenanceCount: 0,
    currentCrossingCost: 0, // Set after creation based on crossing cost calc
    maintenanceCost: 0, // Set based on creation cost
    totalCrossings: 0,
    recentCrossings: [],
  };
}

// ============================================================================
// Passage Maintenance
// ============================================================================

/** Check if passage needs maintenance */
export function needsMaintenance(
  passage: MultiversePassage,
  currentTime: number
): boolean {
  const config = PASSAGE_CONFIGS[passage.type];
  if (config.maintenanceIntervalYears === 0) return false;

  const intervalMs = config.maintenanceIntervalYears * 365.25 * 24 * 60 * 60 * 1000;
  return (currentTime - passage.lastMaintenance) >= intervalMs;
}

/** Apply missed maintenance effects */
export function applyMaintenanceNeglect(passage: MultiversePassage): MultiversePassage {
  const missCount = passage.missedMaintenanceCount + 1;

  let healthLoss = 0;
  let capacityLoss = 0;

  if (missCount === 1) {
    healthLoss = 0.1;
    capacityLoss = 10;
  } else if (missCount === 2) {
    healthLoss = 0.4;
    capacityLoss = 50;
  } else {
    // Third miss = collapse
    return {
      ...passage,
      health: 0,
      capacity: 0,
      missedMaintenanceCount: missCount,
    };
  }

  return {
    ...passage,
    health: Math.max(0, passage.health - healthLoss),
    capacity: Math.max(0, passage.capacity - capacityLoss),
    missedMaintenanceCount: missCount,
  };
}

/** Perform maintenance on passage */
export function maintainPassage(
  passage: MultiversePassage,
  currentTime: number
): MultiversePassage {
  return {
    ...passage,
    health: Math.min(1.0, passage.health + 0.2),
    capacity: Math.min(100, passage.capacity + 20),
    lastMaintenance: currentTime,
    missedMaintenanceCount: 0,
  };
}

// ============================================================================
// Crossing Execution
// ============================================================================

export interface CrossingResult {
  success: boolean;
  arrivalPosition: number;
  attentionSpent: number;
  attentionLost: number; // Additional loss from hazards
  transitDuration: number;
  hazards: TransitHazard[];
  narrative: string[];
}

/** Execute a crossing attempt */
export function executeCrossing(
  presence: Presence,
  attempt: CrossingAttempt
): CrossingResult {
  const narrative: string[] = [];
  const hazards: TransitHazard[] = [];

  // Base success chance depends on method
  const methodConfig = CROSSING_METHODS[attempt.method];
  let successChance = 1 - methodConfig.baseRisk;

  // Adjust for spectrum position (higher = safer)
  successChance += (presence.spectrumPosition - 0.5) * 0.2;
  successChance = Math.max(0.1, Math.min(0.99, successChance));

  // Roll for success
  const roll = Math.random();
  const success = roll < successChance;

  // Calculate base transit duration (affected by method and position)
  let transitDuration = 1000; // Base: 1000 ticks
  transitDuration *= (1 + attempt.compatibilityMultiplier);
  transitDuration *= (1 / (1 + presence.spectrumPosition)); // Higher position = faster

  // Generate hazards (more likely with cheaper/riskier methods)
  let additionalLoss = 0;
  const hazardChance = methodConfig.baseRisk * 2;

  if (Math.random() < hazardChance) {
    const hazardType = selectRandomHazard();
    const hazard = generateHazard(hazardType);
    hazards.push(hazard);
    additionalLoss += hazard.attentionDrain * presence.attention;
    narrative.push(`Encountered ${hazard.description}`);
  }

  // Calculate arrival position
  let arrivalPosition = presence.spectrumPosition;
  if (success) {
    // Position loss on arrival depends on method
    const positionLoss = methodConfig.costMultiplier * 0.1;
    arrivalPosition = Math.max(0.10, arrivalPosition - positionLoss);
    narrative.push(`Arrived in target universe at spectrum position ${arrivalPosition.toFixed(2)}`);
  } else {
    // Failed crossing - significant position loss, may be stranded
    arrivalPosition = Math.max(0.05, arrivalPosition * 0.5);
    narrative.push('Crossing failed. Lost in transit.');
  }

  return {
    success,
    arrivalPosition,
    attentionSpent: attempt.totalCost,
    attentionLost: Math.ceil(additionalLoss),
    transitDuration: Math.ceil(transitDuration),
    hazards,
    narrative,
  };
}

function selectRandomHazard(): TransitHazardType {
  const types: TransitHazardType[] = [
    'attention_leech',
    'void_shepherd',
    'reality_fragment',
    'paradigm_shock',
    'time_distortion',
  ];
  return types[Math.floor(Math.random() * types.length)]!;
}

function generateHazard(type: TransitHazardType): TransitHazard {
  const template = HAZARD_TEMPLATES[type];
  const severity = 0.3 + Math.random() * 0.7;

  return {
    ...template,
    severity,
    attentionDrain: template.attentionDrain * severity,
    avoidable: Math.random() > 0.5,
    avoidCost: Math.random() > 0.5 ? Math.floor(1000 * severity) : undefined,
  };
}

// ============================================================================
// Special Crossing Methods
// ============================================================================

/**
 * Presence Extension - Gradually extend into target universe
 */
export interface PresenceExtensionState {
  presenceId: string;
  sourceUniverseId: string;
  targetUniverseId: string;

  /** How much presence has been seeded (0-1) */
  seedProgress: number;

  /** Attention invested so far */
  attentionInvested: number;

  /** Target presence position in new universe */
  targetPosition: number;

  /** Decay penalty from maintaining dual presence */
  dualPresenceDecayMultiplier: number;
}

/** Start a presence extension */
export function startPresenceExtension(
  presenceId: string,
  sourceUniverseId: string,
  targetUniverseId: string
): PresenceExtensionState {
  return {
    presenceId,
    sourceUniverseId,
    targetUniverseId,
    seedProgress: 0,
    attentionInvested: 0,
    targetPosition: 0.10,
    dualPresenceDecayMultiplier: 1.1, // 10% faster decay
  };
}

/**
 * Divine Projection - Send a fragment
 */
export interface DivineProjection {
  id: string;
  parentPresenceId: string;
  targetUniverseId: string;

  /** Projection's position in target universe */
  spectrumPosition: number;

  /** Attention pool (separate from parent) */
  attention: number;

  /** Is projection still connected to parent? */
  connected: boolean;

  /** Has projection gone independent? */
  independent: boolean;
}

/** Create a divine projection */
export function createDivineProjection(
  id: string,
  parentPresence: Presence,
  targetUniverseId: string
): DivineProjection {
  // Projection starts much weaker
  const startPosition = Math.max(0.30, parentPresence.spectrumPosition * 0.4);
  const startAttention = parentPresence.attention * 0.2;

  return {
    id,
    parentPresenceId: parentPresence.id,
    targetUniverseId,
    spectrumPosition: startPosition,
    attention: startAttention,
    connected: true,
    independent: false,
  };
}

/**
 * Collective Passage - Multiple presences cooperate
 */
export interface CollectivePassageContribution {
  presenceId: string;
  attentionContributed: number;
  minimumContribution: number;
  shareOfControl: number;
}

/** Calculate contributions for collective passage */
export function calculateCollectiveContributions(
  participants: Presence[],
  totalCost: number
): CollectivePassageContribution[] {
  const minParticipants = 3;
  if (participants.length < minParticipants) {
    throw new Error(`Collective passage requires at least ${minParticipants} participants`);
  }

  const equalShare = totalCost / participants.length;
  const minimumShare = equalShare * 0.25; // Must contribute at least 25%

  return participants.map(p => ({
    presenceId: p.id,
    attentionContributed: 0, // To be filled
    minimumContribution: Math.ceil(minimumShare),
    shareOfControl: 1 / participants.length,
  }));
}

// ============================================================================
// Universe Compatibility Helpers
// ============================================================================

/** Create compatibility between two universes */
export function createUniverseCompatibility(
  sourceId: string,
  targetId: string,
  factors: Partial<CompatibilityFactors>
): UniverseCompatibility {
  const fullFactors: CompatibilityFactors = {
    magicParadigm: factors.magicParadigm ?? 2.5,
    divineSystem: factors.divineSystem ?? 2.5,
    physicalLaws: factors.physicalLaws ?? 2.5,
    timeFlow: factors.timeFlow ?? 2.5,
    morality: factors.morality ?? 2.5,
  };

  return {
    sourceUniverseId: sourceId,
    targetUniverseId: targetId,
    score: calculateCompatibilityScore(fullFactors),
    factors: fullFactors,
  };
}

/** Preset compatibility profiles */
export const COMPATIBILITY_PRESETS = {
  identical: { magicParadigm: 0, divineSystem: 0, physicalLaws: 0, timeFlow: 0, morality: 0 },
  sibling: { magicParadigm: 1, divineSystem: 1, physicalLaws: 0.5, timeFlow: 0.5, morality: 1 },
  distant: { magicParadigm: 2, divineSystem: 2, physicalLaws: 2, timeFlow: 2, morality: 2 },
  alien: { magicParadigm: 3.5, divineSystem: 3.5, physicalLaws: 3, timeFlow: 3, morality: 3.5 },
  hostile: { magicParadigm: 5, divineSystem: 5, physicalLaws: 4, timeFlow: 4, morality: 5 },
} as const;

// ============================================================================
// Query Functions
// ============================================================================

/** Can a presence attempt to cross universes? */
export function canAttemptCrossing(
  presence: Presence,
  method: CrossingMethod
): { allowed: boolean; reason?: string } {
  const config = CROSSING_METHODS[method];

  if (presence.spectrumPosition < config.minimumPosition) {
    return {
      allowed: false,
      reason: `Requires spectrum position ${config.minimumPosition}, current: ${presence.spectrumPosition.toFixed(2)}`,
    };
  }

  return { allowed: true };
}

/** Can a presence create a specific passage type? */
export function canCreatePassageType(
  _presence: Presence,
  passageType: PassageType,
  method: CrossingMethod
): { allowed: boolean; reason?: string } {
  const methodConfig = CROSSING_METHODS[method];

  if (!methodConfig.canCreatePassage) {
    return { allowed: false, reason: `Method ${method} cannot create passages` };
  }

  if (!methodConfig.creatablePassageTypes.includes(passageType)) {
    return {
      allowed: false,
      reason: `Method ${method} can only create: ${methodConfig.creatablePassageTypes.join(', ')}`,
    };
  }

  return { allowed: true };
}

/** Get all crossing options for a presence */
export function getCrossingOptions(
  presence: Presence,
  compatibility: UniverseCompatibility,
  availablePassages: MultiversePassage[]
): Array<{
  method: CrossingMethod;
  cost: CrossingCostCalculation;
  risk: number;
  passage?: MultiversePassage;
}> {
  const options: Array<{
    method: CrossingMethod;
    cost: CrossingCostCalculation;
    risk: number;
    passage?: MultiversePassage;
  }> = [];

  // Check each method
  for (const config of Object.values(CROSSING_METHODS)) {
    if (presence.spectrumPosition >= config.minimumPosition) {
      const cost = calculateCrossingCost(
        presence,
        compatibility.sourceUniverseId,
        compatibility.targetUniverseId,
        compatibility,
        config.method,
        undefined
      );

      options.push({
        method: config.method,
        cost,
        risk: config.baseRisk,
      });
    }
  }

  // Add passage options
  for (const passage of availablePassages) {
    const cost = calculateCrossingCost(
      presence,
      compatibility.sourceUniverseId,
      compatibility.targetUniverseId,
      compatibility,
      'passage_crossing',
      passage
    );

    options.push({
      method: 'passage_crossing',
      cost,
      risk: CROSSING_METHODS.passage_crossing.baseRisk,
      passage,
    });
  }

  // Sort by cost
  return options.sort((a, b) => a.cost.totalCost - b.cost.totalCost);
}
