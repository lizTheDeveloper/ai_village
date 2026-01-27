/**
 * CanonEventRecorder - Records major universe milestones with full state snapshots
 *
 * Enables intra-multiverse capabilities by capturing complete universe state at
 * critical moments. Each canon event includes:
 * - Full world snapshot (entities, components, relationships)
 * - Runtime definitions (LLM-generated names, recipes, beliefs, etc.)
 * - Cultural/emergent content (sacred sites, landmarks, customs)
 * - Genealogical data (family trees, soul lineages)
 *
 * This allows universe forking, time travel, and cross-universe comparisons.
 */

import type { World, WorldMutator } from '@ai-village/core';
import type { Entity } from '@ai-village/core';
import type { UniverseSnapshot } from '@ai-village/persistence';
import { worldSerializer } from '@ai-village/persistence';
import { ComponentType as CT } from '@ai-village/core';

/**
 * Types of canon events that trigger state snapshots
 */
export type CanonEventType =
  | 'universe:start'          // Game begins
  | 'time:milestone'          // 1 month, 1 year, etc.
  | 'soul:created'            // Ensoulment ceremony
  | 'agent:born'              // Physical birth
  | 'union:formed'            // Marriage/partnership
  | 'agent:died'              // Death of ensouled being
  | 'soul:reincarnated'       // Reincarnation
  | 'culture:emerged'         // First sacred site, major discovery
  | 'crisis:occurred'         // Rebellion, disaster, divine intervention
  | 'lineage:founded';        // First generation of a family line

/**
 * Canon event with complete universe snapshot
 */
export interface CanonEvent {
  /** Unique ID for this event */
  id: string;

  /** Event type */
  type: CanonEventType;

  /** When this occurred (real time) */
  timestamp: number;

  /** Game tick when this occurred */
  tick: number;

  /** In-game day */
  day: number;

  /** Human-readable description */
  description: string;

  /** Primary agent(s) involved (only ensouled beings) */
  agentIds: string[];

  /** Agent names for display */
  agentNames: string[];

  /** Event-specific data */
  eventData: Record<string, unknown>;

  /** Complete universe snapshot at this moment */
  snapshot: UniverseSnapshot;

  /** Runtime definitions needed to reconstruct this universe */
  runtimeDefinitions: RuntimeDefinitions;

  /** Genealogical context */
  genealogy: GenealogicalContext;
}

/**
 * Runtime-generated content that must travel with the universe
 */
export interface RuntimeDefinitions {
  /** LLM-generated or discovered recipes */
  recipes: Array<{
    id: string;
    name: string;
    discoveredBy?: string;
    discoveredAt?: number;
    definition: unknown;
  }>;

  /** LLM-generated or custom items */
  items: Array<{
    id: string;
    name: string;
    createdBy?: string;
    createdAt?: number;
    definition: unknown;
  }>;

  /** Sacred sites and their names */
  sacredSites: Array<{
    id: string;
    name: string;
    namedBy?: string;
    namedAt?: number;
    position: { x: number; y: number };
    significance: string;
  }>;

  /** Named landmarks */
  landmarks: Array<{
    id: string;
    name: string;
    namedBy?: string;
    namedAt?: number;
    position: { x: number; y: number };
  }>;

  /** Collective beliefs/myths */
  culturalBeliefs: Array<{
    content: string;
    emergedAt: number;
    believedBy: string[];  // Agent IDs
  }>;

  /** Custom building variants */
  customBuildings: Array<{
    id: string;
    name: string;
    baseType: string;
    modifications: unknown;
  }>;
}

/**
 * Genealogical context for this moment in time
 */
export interface GenealogicalContext {
  /** Total ensouled beings ever created */
  totalSoulsCreated: number;

  /** Currently living ensouled beings */
  livingEnsouled: number;

  /** Total deaths */
  totalDeaths: number;

  /** Total births */
  totalBirths: number;

  /** Total unions/marriages */
  totalUnions: number;

  /** Active family lineages */
  lineages: Array<{
    founderId: string;
    founderName: string;
    generation: number;
    livingMembers: number;
  }>;

  /** Reincarnation chains */
  reincarnationChains: Array<{
    originalSoulId: string;
    incarnations: Array<{
      entityId: string;
      name: string;
      bornAt: number;
      diedAt?: number;
    }>;
  }>;
}

/**
 * Configuration for canon event recording
 */
export interface CanonEventConfig {
  /** Enable automatic snapshots at canon events */
  enabled: boolean;

  /** Time milestones to snapshot (in days) */
  timeMilestones: number[];  // e.g., [30, 90, 365] for 1mo, 3mo, 1yr

  /** Capture snapshot on every ensouled birth */
  snapshotBirths: boolean;

  /** Capture snapshot on every ensouled death */
  snapshotDeaths: boolean;

  /** Capture snapshot on unions */
  snapshotUnions: boolean;

  /** Maximum number of canon events to keep in memory */
  maxEventsInMemory: number;
}

const DEFAULT_CONFIG: CanonEventConfig = {
  enabled: true,
  timeMilestones: [30, 90, 180, 365, 730],  // 1mo, 3mo, 6mo, 1yr, 2yr
  snapshotBirths: true,
  snapshotDeaths: true,
  snapshotUnions: true,
  maxEventsInMemory: 100,
};

/**
 * Records canon events with full universe snapshots
 */
export class CanonEventRecorder {
  private config: CanonEventConfig;
  private events: CanonEvent[] = [];
  private eventIdCounter = 0;
  private milestoneDaysRecorded = new Set<number>();

  constructor(config: Partial<CanonEventConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Check if an entity is ensouled (has a soul)
   */
  private isEnsouled(entity: Entity): boolean {
    return entity.hasComponent(CT.SoulIdentity);
  }

  /**
   * Get ensouled agents from world
   */
  private getEnsouledAgents(world: World): Entity[] {
    return [...world
      .query()
      .with(CT.Agent)
      .with(CT.SoulIdentity)
      .executeEntities()];
  }

  /**
   * Extract runtime definitions from world
   */
  private extractRuntimeDefinitions(world: World): RuntimeDefinitions {
    // Extract runtime-generated/discovered content
    // Note: Static registries (RecipeRegistry, ItemRegistry, ResearchRegistry) are populated
    // at startup and don't track "discovery" metadata. Future enhancement would be to track
    // when agents discover/create recipes, items, research in separate discovery tracking.
    // For now, we capture what's registered but can't distinguish runtime-generated from static.

    const recipes: RuntimeDefinitions['recipes'] = [];
    const items: RuntimeDefinitions['items'] = [];

    // RecipeRegistry and ItemRegistry are global singletons, but they don't track
    // discovery metadata (discoveredBy, discoveredAt). This would require enhancement
    // to those systems to track when agents discover/create recipes.
    // TODO: Add discovery tracking to RecipeRegistry/ItemRegistry for proper runtime extraction

    // Extract sacred sites (from relevant components if they exist)
    // Sacred sites may be stored in various ways - as tagged buildings, special entities, etc.
    // Without a dedicated SacredSite component, we rely on tags or building types
    const sacredSites: RuntimeDefinitions['sacredSites'] = [];
    const sacredBuildings = world.query().with(CT.Building).executeEntities();
    for (const entity of sacredBuildings) {
      const buildingComp = entity.getComponent(CT.Building) as { buildingType?: string; name?: string } | undefined;
      const tags = entity.getComponent(CT.Tags) as { tags?: string[] } | undefined;
      const posComp = entity.getComponent(CT.Position) as { x?: number; y?: number } | undefined;

      // Check if this is a sacred site (temple, shrine, or tagged as sacred)
      const isSacred = buildingComp?.buildingType?.includes('temple') ||
                       buildingComp?.buildingType?.includes('shrine') ||
                       tags?.tags?.includes('sacred');

      if (isSacred && posComp) {
        sacredSites.push({
          id: entity.id,
          name: buildingComp?.name ?? 'Sacred Site',
          namedBy: undefined, // Not tracked currently
          namedAt: undefined, // Not tracked currently
          position: { x: posComp.x ?? 0, y: posComp.y ?? 0 },
          significance: `Sacred building: ${buildingComp?.buildingType ?? 'unknown'}`,
        });
      }
    }

    // Extract landmarks (from NamedLandmarks singleton if it exists)
    const landmarks: RuntimeDefinitions['landmarks'] = [];
    const namedLandmarksEntities = world.query().with(CT.NamedLandmarks).executeEntities();
    if (namedLandmarksEntities.length > 0) {
      const namedLandmarks = namedLandmarksEntities[0]?.getComponent(CT.NamedLandmarks) as {
        landmarks?: Array<{ id: string; name: string; position: { x: number; y: number }; namedBy?: string; namedAt?: number }>;
      } | undefined;

      if (namedLandmarks?.landmarks) {
        for (const landmark of namedLandmarks.landmarks) {
          landmarks.push({
            id: landmark.id,
            name: landmark.name,
            namedBy: landmark.namedBy,
            namedAt: landmark.namedAt,
            position: landmark.position,
          });
        }
      }
    }

    // Extract cultural beliefs (from belief components on agents)
    const culturalBeliefs: RuntimeDefinitions['culturalBeliefs'] = [];
    const beliefEntities = world.query().with(CT.Belief).executeEntities();
    for (const entity of beliefEntities) {
      const beliefComp = entity.getComponent(CT.Belief) as { content?: string; emergedAt?: number; believedBy?: string[] } | undefined;

      if (beliefComp?.content) {
        culturalBeliefs.push({
          content: beliefComp.content,
          emergedAt: beliefComp.emergedAt ?? 0,
          believedBy: beliefComp.believedBy ?? [],
        });
      }
    }

    // Extract custom building variants (from building entities with custom data)
    const customBuildings: RuntimeDefinitions['customBuildings'] = [];
    const buildingEntities = world.query().with(CT.Building).executeEntities();
    for (const entity of buildingEntities) {
      const buildingComp = entity.getComponent(CT.Building) as { customVariant?: boolean; name?: string; baseType?: string; modifications?: unknown } | undefined;

      if (buildingComp?.customVariant) {
        customBuildings.push({
          id: entity.id,
          name: buildingComp.name ?? 'Custom Building',
          baseType: buildingComp.baseType ?? 'unknown',
          modifications: buildingComp.modifications ?? {},
        });
      }
    }

    return {
      recipes,
      items,
      sacredSites,
      landmarks,
      culturalBeliefs,
      customBuildings,
    };
  }

  /**
   * Extract genealogical context from world
   */
  private extractGenealogy(world: World): GenealogicalContext {
    const ensouledAgents = this.getEnsouledAgents(world);

    // Historical tracking: Try to get from various sources
    // 1. Try CensusBureau component (tracks population stats)
    let totalSoulsCreated = ensouledAgents.length;
    let totalDeaths = 0;
    let totalBirths = ensouledAgents.length;

    const censusBureauEntities = world.query().with(CT.CensusBureau).executeEntities();
    if (censusBureauEntities.length > 0) {
      const censusBureau = censusBureauEntities[0]?.getComponent(CT.CensusBureau) as {
        totalBirths?: number;
        totalDeaths?: number;
        totalSoulsCreated?: number;
      } | undefined;

      if (censusBureau) {
        totalBirths = censusBureau.totalBirths ?? totalBirths;
        totalDeaths = censusBureau.totalDeaths ?? totalDeaths;
        totalSoulsCreated = censusBureau.totalSoulsCreated ?? totalBirths;
      }
    }

    // Count unions (relationship components with union type)
    const unionCount = world
      .query()
      .with(CT.Relationship)
      .execute()
      .filter((id) => {
        const rel = world.getComponent(id, CT.Relationship) as { type?: string; isMarried?: boolean } | undefined;
        return rel?.type === 'union' || rel?.isMarried;
      }).length;

    // Track lineages by finding generation 0 ancestors
    const lineages = new Map<string, {
      founderId: string;
      founderName: string;
      generation: number;
      livingMembers: number;
    }>();

    // Helper to find the founder (generation 0 ancestor) by walking parent chain
    const findFounder = (agent: Entity): { id: string; name: string } | null => {
      const geneticComp = agent.getComponent(CT.Genetic) as { generation?: number; parentIds?: [string, string] } | undefined;

      // If generation 0, this agent is the founder
      if (geneticComp?.generation === 0) {
        const agentComp = agent.getComponent(CT.Agent) as { name?: string } | undefined;
        return {
          id: agent.id,
          name: agentComp?.name ?? 'Unknown Founder',
        };
      }

      // If has parents, walk up the parent chain
      if (geneticComp?.parentIds && geneticComp.parentIds[0]) {
        const parent = world.getEntity(geneticComp.parentIds[0]);
        if (parent) {
          return findFounder(parent);
        }
      }

      // Fallback: this agent is treated as founder if we can't find parent
      const agentComp = agent.getComponent(CT.Agent) as { name?: string } | undefined;
      return {
        id: agent.id,
        name: agentComp?.name ?? 'Unknown Founder',
      };
    };

    for (const agent of ensouledAgents) {
      const geneticComp = agent.getComponent(CT.Genetic) as { generation?: number } | undefined;
      const generation = geneticComp?.generation ?? 0;

      // Find founder (generation 0 ancestor)
      const founder = findFounder(agent);
      const founderId = founder?.id ?? agent.id;
      const founderName = founder?.name ?? 'Unknown Founder';

      if (!lineages.has(founderId)) {
        lineages.set(founderId, {
          founderId,
          founderName,
          generation,
          livingMembers: 1,
        });
      } else {
        const lineage = lineages.get(founderId)!;
        lineage.livingMembers++;
        lineage.generation = Math.max(lineage.generation, generation);
      }
    }

    // Track reincarnation chains
    const reincarnationChains: GenealogicalContext['reincarnationChains'] = [];
    for (const agent of ensouledAgents) {
      const soulComp = agent.getComponent(CT.SoulIdentity) as { soulId?: string } | undefined;
      const incarnationComp = agent.getComponent(CT.Incarnation) as { previousLives?: unknown[] } | undefined;

      if (incarnationComp?.previousLives && incarnationComp.previousLives.length > 0) {
        const agentComp = agent.getComponent(CT.Agent) as { name?: string; birthTick?: number } | undefined;
        reincarnationChains.push({
          originalSoulId: soulComp?.soulId ?? agent.id,
          incarnations: [
            {
              entityId: agent.id,
              name: agentComp?.name ?? 'Unknown',
              bornAt: agentComp?.birthTick ?? 0,
              diedAt: undefined,
            },
          ],
        });
      }
    }

    return {
      totalSoulsCreated,
      livingEnsouled: ensouledAgents.length,
      totalDeaths,
      totalBirths,
      totalUnions: unionCount,
      lineages: Array.from(lineages.values()),
      reincarnationChains,
    };
  }

  /**
   * Record a canon event with full snapshot
   */
  async recordEvent(
    type: CanonEventType,
    world: WorldMutator,
    options: {
      description: string;
      agentIds?: string[];
      eventData?: Record<string, unknown>;
    }
  ): Promise<CanonEvent> {
    if (!this.config.enabled) {
      throw new Error('Canon event recording is disabled');
    }

    const tick = this.getCurrentTick(world);
    const day = this.getCurrentDay(world);

    // Get agent names
    const agentNames: string[] = [];
    for (const agentId of options.agentIds ?? []) {
      const entity = world.getEntity(agentId);
      if (entity && this.isEnsouled(entity)) {
        const agentComp = entity.getComponent(CT.Agent) as { name?: string } | undefined;
        agentNames.push(agentComp?.name ?? 'Unknown');
      }
    }

    // Create snapshot
    const snapshot = await worldSerializer.serializeWorld(
      world,
      `universe:canon_${this.eventIdCounter}`,
      `Canon Event ${this.eventIdCounter}: ${options.description}`
    );

    // Extract runtime definitions
    const runtimeDefinitions = this.extractRuntimeDefinitions(world);

    // Extract genealogy
    const genealogy = this.extractGenealogy(world);

    // Create event
    const event: CanonEvent = {
      id: `canon_${this.eventIdCounter++}`,
      type,
      timestamp: Date.now(),
      tick,
      day,
      description: options.description,
      agentIds: options.agentIds ?? [],
      agentNames,
      eventData: options.eventData ?? {},
      snapshot,
      runtimeDefinitions,
      genealogy,
    };

    // Add to history
    this.events.push(event);

    // Prune old events if over limit
    if (this.events.length > this.config.maxEventsInMemory) {
      this.events.shift();
    }


    return event;
  }

  /**
   * Check if a time milestone should be recorded
   */
  shouldRecordTimeMilestone(day: number): boolean {
    if (this.milestoneDaysRecorded.has(day)) {
      return false;
    }

    for (const milestone of this.config.timeMilestones) {
      if (day === milestone) {
        this.milestoneDaysRecorded.add(day);
        return true;
      }
    }

    return false;
  }

  /**
   * Get all recorded events
   */
  getEvents(): CanonEvent[] {
    return [...this.events];
  }

  /**
   * Get event by ID
   */
  getEvent(id: string): CanonEvent | undefined {
    return this.events.find(e => e.id === id);
  }

  /**
   * Get events by type
   */
  getEventsByType(type: CanonEventType): CanonEvent[] {
    return this.events.filter(e => e.type === type);
  }

  /**
   * Get events for a specific agent
   */
  getEventsForAgent(agentId: string): CanonEvent[] {
    return this.events.filter(e => e.agentIds.includes(agentId));
  }

  /**
   * Clear all events
   */
  clear(): void {
    this.events = [];
    this.eventIdCounter = 0;
    this.milestoneDaysRecorded.clear();
  }

  /**
   * Export events to JSON
   */
  exportEvents(): string {
    return JSON.stringify(this.events, null, 2);
  }

  /**
   * Get current tick from world
   */
  private getCurrentTick(world: World): number {
    const timeEntities = world.query().with(CT.Time).execute();
    if (timeEntities.length === 0) return 0;

    const timeComp = world.getComponent(timeEntities[0]!, CT.Time) as { tick?: number } | undefined;
    return timeComp?.tick ?? 0;
  }

  /**
   * Get current day from world
   */
  private getCurrentDay(world: World): number {
    const timeEntities = world.query().with(CT.Time).execute();
    if (timeEntities.length === 0) return 1;

    const timeComp = world.getComponent(timeEntities[0]!, CT.Time) as { day?: number } | undefined;
    return timeComp?.day ?? 1;
  }
}
