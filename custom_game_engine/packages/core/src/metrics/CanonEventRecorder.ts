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

import type { World } from '../ecs/World.js';
import type { Entity } from '../ecs/Entity.js';
import type { UniverseSnapshot } from '../persistence/types.js';
import { worldSerializer } from '../persistence/WorldSerializer.js';
import { ComponentType as CT } from '../types/ComponentType.js';
import type { MetricsCollector } from './MetricsCollector.js';

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
  private metricsCollector: MetricsCollector | null = null;

  constructor(config: Partial<CanonEventConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Inject MetricsCollector for accessing historical metrics
   * Called by MetricsCollectionSystem during initialization
   */
  setMetricsCollector(collector: MetricsCollector): void {
    this.metricsCollector = collector;
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
  private extractRuntimeDefinitions(_world: World): RuntimeDefinitions {
    // TODO: Implement extraction from:
    // - RecipeRegistry for discovered recipes
    // - ItemRegistry for custom items
    // - LandmarkNamingSystem for named landmarks
    // - Sacred site entities
    // - Cultural belief components

    return {
      recipes: [],
      items: [],
      sacredSites: [],
      landmarks: [],
      culturalBeliefs: [],
      customBuildings: [],
    };
  }

  /**
   * Extract genealogical context from world
   */
  private extractGenealogy(world: World): GenealogicalContext {
    const ensouledAgents = this.getEnsouledAgents(world);

    // Count unions (relationship components with union type)
    const unionCount = world
      .query()
      .with(CT.Relationship)
      .execute()
      .filter((id) => {
        const rel = world.getComponent(id, CT.Relationship) as { type?: string; isMarried?: boolean } | undefined;
        return rel?.type === 'union' || rel?.isMarried;
      }).length;

    // Track lineages
    const lineages = new Map<string, {
      founderId: string;
      founderName: string;
      generation: number;
      livingMembers: number;
    }>();

    for (const agent of ensouledAgents) {
      const agentComp = agent.getComponent(CT.Agent) as { name?: string; generation?: number } | undefined;
      const generation = agentComp?.generation ?? 0;

      // Find founder (generation 0 ancestor)
      // TODO: Implement proper lineage tracking
      const founderId = agent.id;
      const founderName = agentComp?.name ?? 'Unknown';

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

    // Get historical metrics from MetricsCollector if available
    const sessionMetrics = this.metricsCollector?.getMetric('session_metrics');
    const totalDeaths = sessionMetrics?.totalDeaths ?? 0;
    const totalBirths = sessionMetrics?.totalBirths ?? 0;

    // Total souls created = living + dead
    const totalSoulsCreated = ensouledAgents.length + totalDeaths;

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
    world: World,
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
