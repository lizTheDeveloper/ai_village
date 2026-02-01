/**
 * Types and interfaces for LiveEntityAPI modules
 *
 * This file contains all type definitions and type guards used
 * across the LiveEntityAPI handlers.
 */

import type { World, Entity } from '@ai-village/core';
import type { QueryRequest, QueryResponse, ActionRequest, ActionResponse } from '../MetricsStreamClient.js';

/**
 * Interface for the prompt builder (from @ai-village/llm)
 */
export interface PromptBuilder {
  buildPrompt(agent: Entity, world: World): string;
}

/**
 * Entity summary for the entities list
 */
export interface EntitySummary {
  id: string;
  name: string;
  type: 'agent' | 'animal' | 'building' | 'plant' | 'resource' | 'other';
  position?: { x: number; y: number };
  behavior?: string;
}

/**
 * Detailed entity data
 */
export interface EntityDetails {
  id: string;
  name?: string;
  components: Record<string, unknown>;
}

/**
 * Interface for the LLM scheduler (from @ai-village/llm)
 */
export interface LLMScheduler {
  getMetricsWithAverages(): unknown;
}

/**
 * Extended World interface with runtime properties
 */
export interface WorldWithRuntimeProps extends World {
  speedMultiplier?: number;
  paused?: boolean;
}

/**
 * Extended World interface with mutator methods
 */
export interface WorldWithMutator extends World {
  addComponent(entityId: string, component: unknown): void;
}

/**
 * Common component interfaces for type safety
 */
export interface IdentityComponent {
  type: 'identity';
  name?: string;
}

export interface PositionComponent {
  type: 'position';
  x?: number;
  y?: number;
}

export interface AgentComponent {
  type: 'agent';
  currentBehavior?: string;
  behavior?: string;
  name?: string;
  generation?: number;
  birthTick?: number;
  customLLM?: unknown;
}

export interface SkillsComponent {
  type: 'skills';
  levels?: Record<string, number>;
}

export interface NeedsComponent {
  type: 'needs';
  [key: string]: unknown;
}

export interface InventoryComponent {
  type: 'inventory';
  slots?: Array<{ itemId: string; quantity: number } | null>;
  maxSlots?: number;
  items?: Array<{ resourceType?: string; quantity?: number }>;
}

export interface PlantComponent {
  type: 'plant';
  species?: string;
  age?: number;
  health?: number;
  growthStage?: string;
  waterLevel?: number;
  plantType?: string;
  stage?: string;
  [key: string]: unknown;
}

export interface RenderableComponent {
  type: 'renderable';
  sprite?: string;
  spriteId?: string;
  sizeMultiplier?: number;
  alpha?: number;
  [key: string]: unknown;
}

export interface FederationComponent {
  type: 'federation_governance';
  federationName?: string;
  governanceType?: string;
  memberEmpireIds?: string[];
  memberCount?: number;
  memberEmpires?: string[];
  foundedTick?: number;
  [key: string]: unknown;
}

export interface GalacticCouncilComponent {
  type: 'galactic_council';
  councilName?: string;
  governanceType?: string;
  memberFederationIds?: string[];
  memberCount?: number;
  memberEmpires?: string[];
  chairEmpireId?: string;
  [key: string]: unknown;
}

export interface ShippingLaneComponent {
  type: 'shipping_lane';
  laneName?: string;
  ownerEmpireId?: string;
  sourceId?: string;
  destinationId?: string;
  active?: boolean;
  tradedGoods?: string[];
  tradeVolume?: number;
  endpoints?: Array<{ x: number; y: number }>;
  [key: string]: unknown;
}

export interface NavyComponent {
  type: 'navy';
  ownerEmpireId?: string;
  navyName?: string;
  fleetIds?: string[];
  budget?: number;
  assets?: {
    armadaIds?: string[];
    totalShips?: number;
    totalCrew?: number;
  };
  [key: string]: unknown;
}

export interface MegastructureComponent {
  type: 'megastructure';
  megastructureId?: string;
  name?: string;
  category?: string;
  structureType?: string;
  tier?: string;
  operational?: boolean;
  integrity?: number;
  powerOutput?: number;
  crewCount?: number;
  currentTask?: string;
  taskProgress?: number;
  megastructureName?: string;
  megastructureType?: string;
  [key: string]: unknown;
}

export interface ConflictComponent {
  type: 'conflict';
  version: 1;
  conflictType: 'hunting' | 'agent_combat';
  target?: string;
  state?: string;
  startTime?: number;
  cause?: string;
  lethal?: boolean;
  surprise?: boolean;
  [key: string]: unknown;
}

/**
 * Nation component interface
 */
export interface NationComponent {
  type: 'nation';
  nationName?: string;
  governmentType?: string;
  economy?: {
    population?: number;
    gdp?: number;
  };
}

/**
 * Fleet component interface
 */
export interface FleetComponent {
  type: 'fleet';
  fleetName?: string;
  admiralId?: string;
  squadronIds?: string[];
  stats?: {
    totalShips?: number;
    combatStrength?: number;
  };
  navigation?: {
    targetPosition?: { x: number; y: number };
    status?: string;
  };
}

/**
 * Squadron component interface
 */
export interface SquadronComponent {
  type: 'squadron';
  squadronName?: string;
  commanderId?: string;
  shipIds?: string[];
  stats?: {
    totalShips?: number;
    combatStrength?: number;
  };
}

/**
 * Empire component interface
 */
export interface EmpireComponent {
  type: 'empire';
  empireName?: string;
  governmentType?: string;
  territory?: { nations?: string[]; totalPopulation?: number };
  nationRecords?: Array<{ nationId: string }>;
  economy?: { gdp?: number; imperialTreasury?: number };
  diplomacy?: {
    relations?: Map<string, unknown>;
  };
}

/**
 * Extended Entity interface with mutable addComponent
 */
export interface MutableEntity extends Entity {
  addComponent(component: unknown): void;
}

/**
 * Universe properties that may exist on World at runtime
 */
export interface UniverseProps {
  universeId?: { id: string; name: string; createdAt: number };
  divineConfig?: {
    name?: string;
    description?: string;
    coreParams?: {
      divinePresence?: number;
      divineReliability?: number;
      mortalSignificance?: number;
      maxActiveDeities?: number;
    };
  };
  getMagicSystemState?: () => {
    getAllParadigms?: () => unknown[];
  };
  forkMetadata?: {
    parentUniverseId?: string;
    forkTick?: number;
    forkReason?: string;
  };
}

/**
 * Terrain access properties that may exist on World at runtime
 */
export interface TerrainProps {
  getTileAt?: (x: number, y: number) => TileData | null | undefined;
  getChunkManager?: () => unknown;
}

/**
 * Tile data interface
 */
export interface TileData {
  terrain?: string;
  elevation?: number;
  biome?: string;
  wall?: { material?: string };
}

/**
 * Magic component interface
 */
export interface MagicComponent {
  type: 'magic';
  magicUser?: boolean;
  homeParadigmId?: string;
  knownParadigmIds?: string[];
  activeParadigmId?: string;
  knownSpells?: unknown[];
  totalSpellsCast?: number;
  totalMishaps?: number;
  manaPools?: Array<{
    source: string;
    current: number;
    maximum: number;
    locked: number;
    regenRate: number;
  }>;
  resourcePools?: Record<string, {
    type: string;
    current: number;
    maximum: number;
    locked: number;
  }>;
  casting?: boolean;
  activeEffects?: string[];
  techniqueProficiency?: Record<string, number>;
  formProficiency?: Record<string, number>;
  paradigmState?: Record<string, unknown>;
  corruption?: number;
  attentionLevel?: number;
  favorLevel?: number;
  addictionLevel?: number;
  primarySource?: string;
}

/**
 * Deity component interface
 */
export interface DeityComponentData {
  type: 'deity';
  identity?: {
    primaryName?: string;
    domain?: string;
  };
  belief?: {
    currentBelief?: number;
    beliefPerTick?: number;
    totalBeliefEarned?: number;
    totalBeliefSpent?: number;
  };
  believers?: Set<string> | { size?: number };
  sacredSites?: Set<string> | { size?: number };
  controller?: string;
  prayerQueue?: unknown[];
}

/**
 * Spiritual component interface
 */
export interface SpiritualComponent {
  type: 'spiritual';
  totalPrayers?: number;
  answeredPrayers?: number;
  believedDeity?: string;
}

/**
 * Research state component interface
 */
export interface ResearchStateComponent {
  type: 'research_state';
  completed?: Set<string>;
  inProgress?: Map<string, {
    researchId: string;
    totalRequired: number;
    currentProgress: number;
    assignedAgents: string[];
    startedAt: number;
    researchers?: string[];
    insights?: Array<{ agentId: string; contribution: number }>;
  }>;
}

/**
 * Interface for SaveLoadService (from @ai-village/core)
 */
export interface SaveLoadServiceInterface {
  listSaves(): Promise<Array<{ key: string; name?: string; tick?: number; timestamp?: number }>>;
  save(world: World, options: { name?: string; description?: string }): Promise<void>;
  load(key: string, world: World): Promise<{ success: boolean; error?: string }>;
}

/**
 * Interface for BackgroundUniverseManager (from @ai-village/core)
 */
export interface BackgroundUniverseManagerInterface {
  getAllBackgroundUniverses(): ReadonlyMap<string, {
    id: string;
    name?: string;
    type: string;
    createdAtTick: bigint;
    currentTick: bigint;
    population: number;
    isPaused: boolean;
    lastActivity?: string;
  }>;
  getBackgroundUniverse(id: string): unknown | undefined;
  getStats(): { totalSpawned: number; activeCount: number; invasionsTriggered: number };
}

/**
 * Interface for AgentDebugManager (from @ai-village/core)
 */
export interface AgentDebugManagerInterface {
  startLogging(agentId: string, agentName: string): void;
  stopLogging(agentId: string): void;
  getTrackedAgents(): string[];
  getRecentEntries(agentIdOrName: string, limit?: number): unknown[];
  analyzeAgent(agentIdOrName: string): {
    totalEntries: number;
    maxDistanceFromHome: number;
    avgDistanceFromHome: number;
    behaviorChanges: number;
    behaviors: Map<string, number>;
    recentThoughts: string[];
    currentPosition: { x: number; y: number } | null;
    currentTarget: { x: number; y: number } | null;
  };
  listLogFiles(): string[];
}

// ============================================================================
// Type Guard Functions
// ============================================================================

/**
 * Type guard for universe props
 */
export function hasUniverseProps(world: World): world is World & UniverseProps {
  return true; // All properties are optional, so any World could have them
}

/**
 * Type guard for terrain access
 */
export function hasTerrain(world: World): world is World & TerrainProps {
  return 'getTileAt' in world && typeof world.getTileAt === 'function';
}

/**
 * Type guard for magic component
 */
export function isMagicComponent(component: unknown): component is MagicComponent {
  if (!component || typeof component !== 'object') return false;
  return 'type' in component && (component as { type?: string }).type === 'magic';
}

/**
 * Type guard for deity component
 */
export function isDeityComponent(component: unknown): component is DeityComponentData {
  if (!component || typeof component !== 'object') return false;
  return 'type' in component && (component as { type?: string }).type === 'deity';
}

/**
 * Type guard for spiritual component
 */
export function isSpiritualComponent(component: unknown): component is SpiritualComponent {
  if (!component || typeof component !== 'object') return false;
  return 'type' in component && (component as { type?: string }).type === 'spiritual';
}

/**
 * Type guard for research state component
 */
export function isResearchStateComponent(component: unknown): component is ResearchStateComponent {
  if (!component || typeof component !== 'object') return false;
  return 'type' in component && (component as { type?: string }).type === 'research_state';
}

/**
 * Type guard for tile data
 */
export function isTileData(data: unknown): data is TileData {
  if (!data || typeof data !== 'object') return false;
  return true; // TileData has all optional properties, so any object could be valid
}

/**
 * Type guard for agent component
 */
export function isAgentComponent(component: unknown): component is AgentComponent {
  if (!component || typeof component !== 'object') return false;
  return 'type' in component && (component as { type?: string }).type === 'agent';
}

/**
 * Type guard for skills component
 */
export function isSkillsComponent(component: unknown): component is SkillsComponent {
  if (!component || typeof component !== 'object') return false;
  return 'type' in component && (component as { type?: string }).type === 'skills';
}

/**
 * Type guard for identity component
 */
export function isIdentityComponent(component: unknown): component is IdentityComponent {
  if (!component || typeof component !== 'object') return false;
  return 'type' in component && (component as { type?: string }).type === 'identity';
}

/**
 * Type guard for position component
 */
export function isPositionComponent(component: unknown): component is PositionComponent {
  if (!component || typeof component !== 'object') return false;
  return 'type' in component && (component as { type?: string }).type === 'position';
}

/**
 * Type guard for needs component
 */
export function isNeedsComponent(component: unknown): component is NeedsComponent {
  if (!component || typeof component !== 'object') return false;
  return 'type' in component && (component as { type?: string }).type === 'needs';
}

/**
 * Type guard for inventory component
 */
export function isInventoryComponent(component: unknown): component is InventoryComponent {
  if (!component || typeof component !== 'object') return false;
  return 'type' in component && (component as { type?: string }).type === 'inventory';
}

/**
 * Type guard for plant component
 */
export function isPlantComponent(component: unknown): component is PlantComponent {
  if (!component || typeof component !== 'object') return false;
  return 'type' in component && (component as { type?: string }).type === 'plant';
}

/**
 * Type guard for renderable component
 */
export function isRenderableComponent(component: unknown): component is RenderableComponent {
  if (!component || typeof component !== 'object') return false;
  return 'type' in component && (component as { type?: string }).type === 'renderable';
}

/**
 * Type guard for nation component
 */
export function isNationComponent(component: unknown): component is NationComponent {
  if (!component || typeof component !== 'object') return false;
  return 'type' in component && (component as { type?: string }).type === 'nation';
}

/**
 * Type guard for fleet component
 */
export function isFleetComponent(component: unknown): component is FleetComponent {
  if (!component || typeof component !== 'object') return false;
  return 'type' in component && (component as { type?: string }).type === 'fleet';
}

/**
 * Type guard for squadron component
 */
export function isSquadronComponent(component: unknown): component is SquadronComponent {
  if (!component || typeof component !== 'object') return false;
  return 'type' in component && (component as { type?: string }).type === 'squadron';
}

/**
 * Type guard for empire component
 */
export function isEmpireComponent(component: unknown): component is EmpireComponent {
  if (!component || typeof component !== 'object') return false;
  return 'type' in component && (component as { type?: string }).type === 'empire';
}

/**
 * Type guard for megastructure component
 */
export function isMegastructureComponent(component: unknown): component is MegastructureComponent {
  if (!component || typeof component !== 'object') return false;
  return 'type' in component && (component as { type?: string }).type === 'megastructure';
}

/**
 * Type guard for navy component
 */
export function isNavyComponent(component: unknown): component is NavyComponent {
  if (!component || typeof component !== 'object') return false;
  return 'type' in component && (component as { type?: string }).type === 'navy';
}

/**
 * Type guard for world with mutator
 */
export function hasMutator(world: World): world is WorldWithMutator {
  return 'addComponent' in world && typeof (world as WorldWithMutator).addComponent === 'function';
}

/**
 * Type guard for mutable entity
 */
export function isMutableEntity(entity: Entity): entity is MutableEntity {
  return 'addComponent' in entity && typeof (entity as MutableEntity).addComponent === 'function';
}

// Re-export request/response types for convenience
export type { QueryRequest, QueryResponse, ActionRequest, ActionResponse };
