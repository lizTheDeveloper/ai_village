/**
 * BackgroundUniverseTypes - Type definitions for background universe simulation
 *
 * Supports Dwarf Fortress-style world generation and RimWorld-style faction invasions
 * across multiple universes, timelines, and planets.
 */

import type { AbstractPlanet } from '@ai-village/hierarchy-simulator';
import type { UniverseInstance } from './MultiverseCoordinator.js';

/**
 * Type of background universe being simulated
 */
export type BackgroundUniverseType =
  | 'other_planet'        // Alien world in different solar system
  | 'future_timeline'     // Player's world N years in the future
  | 'past_timeline'       // Player's world N years in the past
  | 'parallel_universe'   // Alternate timeline (diverged from player's history)
  | 'pocket_dimension'    // Small isolated reality (magical realm, simulation, etc.)
  | 'extradimensional';   // Reality with different physical laws

/**
 * Cultural traits that influence faction AI behavior
 */
export interface CulturalTraits {
  /** How likely to initiate conflict (0-1) */
  aggressiveness: number;

  /** Desire to expand territory (0-1) */
  expansionism: number;

  /** Hostility toward aliens/outsiders (0-1) */
  xenophobia: number;

  /** Collectivism vs individualism (0=individual, 1=collective) */
  collectivism: number;

  /** Technological focus vs tradition (0=tradition, 1=tech) */
  technophilia: number;

  /** Mystical/magical focus (0-1) */
  mysticism: number;

  /** Economic cooperation vs competition (0=competitive, 1=cooperative) */
  cooperation: number;
}

/**
 * Stop conditions for background simulation
 */
export interface SimulationStopConditions {
  /** Stop after reaching this tech level */
  maxTechLevel?: number;

  /** Stop after this many years simulated */
  maxSimulatedYears?: number;

  /** Stop after invasion is triggered */
  invasionTriggered?: boolean;

  /** Stop if population drops below this */
  minPopulation?: number;

  /** Stop if population exceeds this */
  maxPopulation?: number;

  /** Stop if civilization collapses */
  civilizationCollapse?: boolean;
}

/**
 * Parameters for spawning a background universe
 */
export interface BackgroundUniverseParams {
  /** Type of universe */
  type: BackgroundUniverseType;

  /** Human-readable description */
  description: string;

  /** Base universe to fork from (optional, uses template if not provided) */
  baseUniverseId?: string;

  /** Starting tech level bias (0-10) */
  techBias?: number;

  /** Cultural traits for AI faction decision-making */
  culturalTraits: CulturalTraits;

  /** Time scale multiplier (1000 = 1 year per second) */
  timeScale?: number;

  /** When AI faction decides to invade (0-1, higher = more aggressive) */
  invasionThreshold?: number;

  /** Stop conditions for simulation */
  stopConditions?: SimulationStopConditions;

  /** For future/past timelines: how many years offset */
  timeOffset?: number;

  /** For other planets: distance in light-years */
  distanceLightYears?: number;

  /** Initial population (overrides random generation) */
  initialPopulation?: number;

  /** Seed for deterministic generation */
  seed?: number;
}

/**
 * Faction AI decision types
 */
export type FactionDecisionType =
  | 'develop'              // Continue internal development
  | 'explore'              // Search for other worlds
  | 'discovered_player'    // Just discovered player's world
  | 'prepare'              // Building forces for invasion
  | 'invade'               // Launch invasion
  | 'retreat'              // Pull back forces
  | 'negotiate'            // Attempt diplomacy
  | 'trade';               // Establish trade routes

/**
 * Invasion method/type
 */
export type InvasionType =
  | 'military'             // Direct military assault
  | 'cultural'             // Cultural assimilation (soft power)
  | 'economic'             // Economic takeover
  | 'dimensional'          // Portal/wormhole invasion
  | 'temporal'             // Time paradox attack
  | 'viral'                // Biological/memetic warfare
  | 'swarm';               // Overwhelming numbers

/**
 * Faction AI decision output
 */
export interface FactionDecision {
  /** Type of decision */
  type: FactionDecisionType;

  /** Reasoning for decision */
  reason: string;

  /** For invasion decisions: type of invasion */
  invasionType?: InvasionType;

  /** For invasion decisions: size of invasion force */
  fleetSize?: number;

  /** For invasion decisions: estimated arrival time in ticks */
  estimatedTicks?: number;

  /** For invasion decisions: which faction is invading */
  factionId?: string;

  /** Confidence in decision (0-1) */
  confidence?: number;
}

/**
 * Background universe state
 */
export interface BackgroundUniverse {
  /** Unique ID */
  id: string;

  /** Type of universe */
  type: BackgroundUniverseType;

  /** Universe instance from MultiverseCoordinator */
  universe: UniverseInstance;

  /** Abstract planet being simulated */
  planet: AbstractPlanet;

  /** Faction AI decision maker */
  factionAI: any; // Will be PlanetFactionAI after we define it

  /** Worker thread handle (if using workers) */
  worker: any | null;

  /** Whether this universe is visible to player */
  visible: boolean;

  /** How many ticks have been simulated */
  ticksSimulated: bigint;

  /** Last time this universe was updated */
  lastUpdateTime: number;

  /** Stop conditions */
  stopConditions?: SimulationStopConditions;

  /** Whether simulation has stopped */
  stopped: boolean;

  /** Stop reason (if stopped) */
  stopReason?: string;
}

/**
 * Planet state snapshot for faction AI
 */
export interface PlanetState {
  /** Current population */
  population: number;

  /** Current tech level */
  techLevel: number;

  /** Population pressure (0-1, based on carrying capacity) */
  populationPressure: number;

  /** Military power (relative score) */
  militaryPower: number;

  /** Economic strength */
  economicStrength: number;

  /** Stability (0-1) */
  stability: number;

  /** Resource stockpiles */
  resources: {
    food: number;
    metal: number;
    energy: number;
  };

  /** Active wars count */
  activeWars: number;

  /** Has discovered player's world */
  hasDiscoveredPlayer: boolean;

  /** Has interstellar travel capability */
  hasInterstellarTech: boolean;

  /** Current tick */
  currentTick: bigint;
}

/**
 * Invasion event data emitted when faction decides to invade
 */
export interface InvasionTriggeredEvent {
  /** ID of invading universe */
  invaderUniverse: string;

  /** ID of invading faction */
  invaderFaction: string;

  /** ID of target universe (usually 'player_universe') */
  targetUniverse: string;

  /** Type of invasion */
  invasionType: InvasionType;

  /** Size of invasion force */
  fleetSize: number;

  /** Tech level of invaders */
  techLevel: number;

  /** Estimated arrival time in ticks */
  estimatedArrival: bigint;

  /** Cultural traits of invaders */
  culturalTraits: CulturalTraits;

  /** Distance to target (light-years, if applicable) */
  distance?: number;
}

/**
 * Background universe discovered event (player opened portal/traveled there)
 */
export interface BackgroundUniverseDiscoveredEvent {
  /** Universe ID that was discovered */
  universeId: string;

  /** Type of universe */
  type: BackgroundUniverseType;

  /** How player discovered it */
  discoveryMethod: 'portal' | 'time_machine' | 'wormhole' | 'telescope' | 'magic';

  /** Player entity that discovered it */
  discoveredBy?: string;

  /** Current state of discovered universe */
  state: PlanetState;
}

/**
 * Configuration for instantiating full ECS world from AbstractPlanet
 */
export interface WorldInstantiationConstraints {
  /** Target population to generate */
  targetPopulation: number;

  /** Number of cities to generate */
  cityCount: number;

  /** Belief distribution (deity ID -> follower count) */
  beliefDistribution: Map<string, number>;

  /** Average tech level */
  avgTechLevel: number;

  /** Average skill level */
  avgSkillLevel: number;

  /** Building type distribution (building type -> count) */
  buildingDistribution: Map<string, number>;

  /** Named NPCs that must be included */
  namedNPCs: Array<{
    id: string;
    name: string;
    role: string;
    location?: { x: number; y: number };
  }>;

  /** Major structures that must be included */
  majorStructures: Array<{
    type: string;
    location: { x: number; y: number };
  }>;

  /** Faction relationships */
  factions: Array<{
    id: string;
    name: string;
    population: number;
    hostility: number; // -1 to 1 (toward player)
  }>;
}
