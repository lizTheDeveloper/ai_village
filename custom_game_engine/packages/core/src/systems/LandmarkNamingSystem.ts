/**
 * LandmarkNamingSystem
 *
 * Allows agents to discover and name significant terrain features (peaks, cliffs, lakes, etc.).
 * When an agent first sees a major landmark, they use their personality and memories to
 * create a memorable name for it.
 *
 * Named landmarks become part of the cultural geography - agents can share names
 * with each other and refer to places by their names in conversation.
 */

import { BaseSystem, type SystemContext } from '../ecs/SystemContext.js';
import type { EntityImpl } from '../ecs/Entity.js';
import type { AgentComponent } from '../components/AgentComponent.js';
import type { SpatialMemoryComponent, SpatialMemory } from '../components/SpatialMemoryComponent.js';
import { getSpatialMemoriesByType } from '../components/SpatialMemoryComponent.js';
import type { PersonalityComponent } from '../components/PersonalityComponent.js';
import type { MemoryComponent } from '../components/MemoryComponent.js';
import { NamedLandmarksComponent } from '../components/NamedLandmarksComponent.js';
import { ComponentType } from '../types/ComponentType.js';
import type { ComponentType as CT } from '../types.js';
import type { LLMDecisionQueue } from '../decision/LLMDecisionProcessor.js';
import type { TerrainFeature, TerrainFeatureType } from '../types/TerrainTypes.js';

/**
 * Pending naming request (waiting for LLM response)
 */
interface PendingNaming {
  agentId: string;
  feature: TerrainFeature;
  requestedAt: number; // Tick when request was made
}

/**
 * Significant terrain types that agents can name
 */
const NAMEABLE_TERRAIN_TYPES = new Set([
  'peak',
  'cliff',
  'lake',
  'ridge',
  'valley',
  'plateau',
]);

/**
 * LandmarkNamingSystem
 *
 * Detects when agents discover significant terrain features for the first time
 * and prompts them to name the landmarks based on their personality and memories.
 */
export class LandmarkNamingSystem extends BaseSystem {
  public readonly id = 'landmark-naming';
  public readonly priority = 45; // After exploration (40), before other social systems
  public readonly requiredComponents: ReadonlyArray<CT> = [];
  // Only run when spatial_memory components exist (O(1) activation check)
  public readonly activationComponents = ['spatial_memory'] as const;
  protected readonly throttleInterval = 200; // VERY_SLOW - 10 seconds

  /** LLM decision queue for naming prompts */
  private llmQueue: LLMDecisionQueue;

  /** Pending naming requests (entityId -> pending request) */
  private pendingNamings = new Map<string, PendingNaming>();

  /** Cooldown to prevent naming spam (entityId -> last naming tick) */
  private namingCooldowns = new Map<string, number>();

  /** Cooldown duration in ticks (10 minutes at 20 TPS) */
  private readonly NAMING_COOLDOWN_TICKS = 12000;

  /** World reference for event-driven processing */
  private worldRef: import('../ecs/World.js').World | null = null;

  /**
   * Create a LandmarkNamingSystem.
   *
   * @param llmQueue LLM decision queue for generating names
   */
  constructor(llmQueue: LLMDecisionQueue) {
    super();
    this.llmQueue = llmQueue;
  }

  /**
   * Initialize event listeners for sleep-triggered landmark naming.
   */
  protected onInitialize(world: import('../ecs/World.js').World, eventBus: import('../events/EventBus.js').EventBus): void {
    this.worldRef = world;

    // Subscribe to agent sleep start - this is when agents reflect and name landmarks
    eventBus.subscribe('agent:sleep_start', (event) => {
      const agentId = event.data?.agentId as string | undefined;
      if (agentId) {
        this.onAgentSleepStart(agentId, world.tick);
      }
    });
  }

  /**
   * Handle agent starting to sleep - check for landmarks to name.
   */
  private onAgentSleepStart(agentId: string, tick: number): void {
    if (!this.worldRef) return;

    const entity = this.worldRef.getEntity(agentId) as EntityImpl | undefined;
    if (!entity) return;

    const agent = entity.getComponent<AgentComponent>(ComponentType.Agent);
    if (!agent || !agent.useLLM) return; // Only LLM agents name landmarks

    const spatialMemory = entity.getComponent<SpatialMemoryComponent>(ComponentType.SpatialMemory);
    if (!spatialMemory) return;

    // Get or create landmarks registry
    const landmarksComponent = this.getOrCreateLandmarksComponent(this.worldRef);
    if (!landmarksComponent) return;

    // Check naming cooldown
    const lastNaming = this.namingCooldowns.get(entity.id);
    if (lastNaming && tick - lastNaming < this.NAMING_COOLDOWN_TICKS) {
      return; // Still on cooldown
    }

    // Skip if already has a pending naming request
    if (this.pendingNamings.has(entity.id)) {
      return;
    }

    // Check for unnamed landmarks in memory
    this.checkAgentForLandmarks(entity, spatialMemory, landmarksComponent, tick);
  }

  /**
   * Get or create the world-level landmarks component.
   */
  private getOrCreateLandmarksComponent(world: import('../ecs/World.js').World): NamedLandmarksComponent | undefined {
    const worldEntities = world.query().with(ComponentType.NamedLandmarks).executeEntities();

    for (const worldEntity of worldEntities) {
      const comp = (worldEntity as EntityImpl).getComponent<NamedLandmarksComponent>(ComponentType.NamedLandmarks);
      if (comp) return comp;
    }

    // Create on first available entity if not found
    // Use iterator to get first entity in O(1) instead of querying ALL entities
    const firstEntityResult = world.entities.values().next();
    if (!firstEntityResult.done) {
      const firstEntity = firstEntityResult.value as EntityImpl;
      const newComp = new NamedLandmarksComponent();
      firstEntity.addComponent(newComp);
      return newComp;
    }
    return undefined;
  }

  /**
   * Update - only processes pending naming responses (no per-tick queries).
   */
  protected onUpdate(ctx: SystemContext): void {
    // Only process pending LLM responses - no expensive queries
    if (this.pendingNamings.size === 0) return;

    const landmarksComponent = this.getOrCreateLandmarksComponent(ctx.world);
    if (!landmarksComponent) return;

    this.processPendingNamings(ctx, landmarksComponent);
  }

  /**
   * Check a specific agent for landmarks they discovered but haven't named.
   */
  private checkAgentForLandmarks(
    entity: EntityImpl,
    spatialMemory: SpatialMemoryComponent,
    landmarksComponent: NamedLandmarksComponent,
    tick: number
  ): void {
    const recentLandmarks = this.getRecentTerrainLandmarks(spatialMemory, tick);

    for (const landmarkMemory of recentLandmarks) {
      const featureType = landmarkMemory.metadata?.featureType as string | undefined;
      if (!featureType || !NAMEABLE_TERRAIN_TYPES.has(featureType)) continue;

      if (landmarksComponent.isNamed(landmarkMemory.x, landmarkMemory.y)) {
        // Already named - agent learns the existing name
        const namedLandmark = landmarksComponent.getLandmark(landmarkMemory.x, landmarkMemory.y);
        if (namedLandmark) {
          this.learnExistingName(entity, landmarkMemory, namedLandmark.name, tick);
        }
        continue;
      }

      // Found an unnamed landmark - initiate naming
      this.requestLandmarkNameOnSleep(entity, landmarkMemory, tick);
      return; // Only name one landmark per sleep
    }
  }

  /**
   * Request a landmark name during agent sleep (event-driven, no SystemContext).
   */
  private requestLandmarkNameOnSleep(
    entity: EntityImpl,
    landmarkMemory: SpatialMemory,
    tick: number
  ): void {
    const personality = entity.getComponent<PersonalityComponent>(ComponentType.Personality);
    const memory = entity.getComponent<MemoryComponent>(ComponentType.Memory);
    const agent = entity.getComponent<AgentComponent>(ComponentType.Agent);

    if (!personality || !memory || !agent) return;

    // Build naming prompt
    const prompt = this.buildNamingPrompt(entity, landmarkMemory, personality, memory, null);

    // Queue the naming request
    this.llmQueue.requestDecision(entity.id, prompt).catch(err => {
      console.error(`[LandmarkNamingSystem] Failed to request name for ${entity.id}:`, err);
    });

    // Track pending request
    const featureType = (landmarkMemory.metadata?.featureType as string) || 'unknown';
    const feature: TerrainFeature = {
      type: featureType as TerrainFeatureType,
      x: landmarkMemory.x,
      y: landmarkMemory.y,
      elevation: (landmarkMemory.metadata?.elevation as number | undefined) ?? 0,
      size: (landmarkMemory.metadata?.size as number | undefined) ?? 1,
      description: landmarkMemory.metadata?.description as string || 'a terrain feature',
    };

    this.pendingNamings.set(entity.id, {
      agentId: entity.id,
      feature,
      requestedAt: tick,
    });

    // Set cooldown
    this.namingCooldowns.set(entity.id, tick);
  }

  /**
   * Get recent terrain landmarks from spatial memory.
   */
  private getRecentTerrainLandmarks(spatialMemory: SpatialMemoryComponent, currentTick: number): SpatialMemory[] {
    const memories = getSpatialMemoriesByType(spatialMemory, 'terrain_landmark');
    // Only consider landmarks seen in the last 100 ticks (5 seconds at 20 TPS)
    return memories.filter((m: SpatialMemory) => currentTick - m.createdAt < 100);
  }

  /**
   * Check if agent has already named a landmark at this position.
   */
  private hasAgentNamedLandmark(spatialMemory: SpatialMemoryComponent, x: number, y: number): boolean {
    const memories = getSpatialMemoriesByType(spatialMemory, 'terrain_landmark');
    return memories.some((m: SpatialMemory) =>
      Math.floor(m.x) === Math.floor(x) &&
      Math.floor(m.y) === Math.floor(y) &&
      m.metadata?.namedBy
    );
  }

  /**
   * Build the LLM prompt for naming a landmark.
   */
  private buildNamingPrompt(
    __entity: EntityImpl,
    landmarkMemory: SpatialMemory,
    personality: PersonalityComponent,
    memory: MemoryComponent,
    __ctx: SystemContext | null
  ): string {
    const featureType = landmarkMemory.metadata?.featureType || 'terrain feature';
    const description = landmarkMemory.metadata?.description || 'a notable place';
    const elevation = landmarkMemory.metadata?.elevation;

    let prompt = `You've discovered a significant ${featureType}!\n\n`;
    prompt += `Description: ${description}\n`;
    if (elevation !== undefined) {
      prompt += `Elevation: ${elevation} units\n`;
    }
    prompt += `\n`;

    // Add personality context
    prompt += `Your personality:\n`;
    prompt += `- Openness: ${personality.openness.toFixed(2)} (${personality.openness > 0.7 ? 'imaginative' : personality.openness > 0.3 ? 'balanced' : 'traditional'})\n`;
    // TODO: Add humor trait to PersonalityComponent if needed
    // prompt += `- Humor: ${personality.humor.toFixed(2)} (${personality.humor > 0.7 ? 'very funny' : personality.humor > 0.3 ? 'moderately humorous' : 'serious'})\n`;

    // Add recent memories for context
    const recentMemories = memory.getRecentMemories(5);
    if (recentMemories.length > 0) {
      prompt += `\nRecent experiences:\n`;
      for (const mem of recentMemories) {
        prompt += `- ${mem.content}\n`;
      }
    }

    prompt += `\nGive this ${featureType} a memorable name. Be creative and let your personality shine through.\n`;
    prompt += `Some agents are funny and whimsical (naming a mountain "Bear Mountain" or a river "The Long Leak").\n`;
    prompt += `Others are more serious or poetic. What feels right for you?\n\n`;
    prompt += `Respond with ONLY the name, nothing else. Keep it short (1-4 words).\n`;
    prompt += `Example responses: "Bear Mountain", "The Long Leak", "Whispering Cliffs", "Thunder Lake"\n`;

    return prompt;
  }

  /**
   * Process pending naming requests and store approved names.
   */
  private processPendingNamings(ctx: SystemContext, landmarksComponent: NamedLandmarksComponent): void {
    const completedNamings: string[] = [];

    for (const [entityId, pending] of this.pendingNamings.entries()) {
      // Check if LLM response is ready
      const response = this.llmQueue.getDecision(entityId);
      if (!response) continue; // Still waiting

      // Parse the name from the response
      const name = this.parseLandmarkName(response);
      if (!name) {
        completedNamings.push(entityId);
        continue; // Invalid response
      }

      // Register the named landmark
      const landmark = landmarksComponent.nameLandmark(
        pending.feature.x,
        pending.feature.y,
        pending.feature.type,
        name,
        entityId,
        ctx.tick,
        {
          elevation: pending.feature.elevation,
          size: pending.feature.size,
          description: pending.feature.description,
        }
      );

      // Update agent's spatial memory with the name
      const entity = ctx.world.entities.get(entityId) as EntityImpl | undefined;
      if (entity) {
        const spatialMemory = entity.getComponent<SpatialMemoryComponent>(ComponentType.SpatialMemory);
        if (spatialMemory) {
          // Find the existing terrain landmark memory and update it
          this.updateLandmarkMemoryWithName(
            spatialMemory,
            pending.feature.x,
            pending.feature.y,
            name,
            entityId,
            ctx.tick
          );
        }

        // Record in episodic memory
        const memory = entity.getComponent<MemoryComponent>(ComponentType.Memory);
        if (memory) {
          memory.addMemory({
            id: `naming_${landmark.id}`,
            type: 'episodic',
            content: `I discovered and named ${landmark.featureType} "${name}"`,
            timestamp: ctx.tick,
            importance: 80, // High importance for discovery
            location: { x: landmark.x, y: landmark.y },
          });
        }
      }

      // Set cooldown
      this.namingCooldowns.set(entityId, ctx.tick);

      completedNamings.push(entityId);
    }

    // Remove completed namings
    for (const entityId of completedNamings) {
      this.pendingNamings.delete(entityId);
    }
  }

  /**
   * Parse landmark name from LLM response.
   */
  private parseLandmarkName(response: string): string | null {
    // Clean up the response
    let name = response.trim();

    // Remove common prefix patterns
    name = name.replace(/^(I (would )?call it|I name it|The name is):?\s*/i, '');
    name = name.replace(/^["']|["']$/g, ''); // Remove quotes

    // Validate: should be 1-4 words, reasonable length
    const words = name.split(/\s+/);
    if (words.length < 1 || words.length > 4) return null;
    if (name.length > 50) return null;

    // Capitalize properly (Title Case)
    name = words.map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');

    return name;
  }

  /**
   * Update an existing terrain landmark memory with a name.
   */
  private updateLandmarkMemoryWithName(
    spatialMemory: SpatialMemoryComponent,
    x: number,
    y: number,
    name: string,
    namedBy: string,
    currentTick: number
  ): void {
    // Find the landmark memory
    const memories = getSpatialMemoriesByType(spatialMemory, 'terrain_landmark');
    for (const mem of memories) {
      if (Math.floor(mem.x) === Math.floor(x) && Math.floor(mem.y) === Math.floor(y)) {
        // Update metadata
        mem.metadata = {
          ...mem.metadata,
          name,
          namedBy,
        };
        // Reinforce the memory since it's now named
        mem.strength = Math.min(100, mem.strength + 20);
        mem.lastReinforced = currentTick;
        break;
      }
    }
  }

  /**
   * When an agent sees a landmark that someone else named, they learn the existing name.
   */
  private learnExistingName(
    entity: EntityImpl,
    landmarkMemory: SpatialMemory,
    existingName: string,
    currentTick: number
  ): void {
    const spatialMemory = entity.getComponent<SpatialMemoryComponent>(ComponentType.SpatialMemory);
    if (!spatialMemory) return;

    // Check if agent already knows this name
    if (landmarkMemory.metadata?.name === existingName) return;

    // Update their spatial memory with the learned name
    this.updateLandmarkMemoryWithName(
      spatialMemory,
      landmarkMemory.x,
      landmarkMemory.y,
      existingName,
      landmarkMemory.metadata?.namedBy as string || 'unknown',
      currentTick
    );

    // Add to episodic memory
    const memory = entity.getComponent<MemoryComponent>(ComponentType.Memory);
    if (memory) {
      const featureType = landmarkMemory.metadata?.featureType || 'place';
      memory.addMemory({
        id: `learned_${existingName}_${currentTick}`,
        type: 'knowledge',
        content: `I learned that this ${featureType} is called "${existingName}"`,
        timestamp: currentTick,
        importance: 60,
        location: { x: landmarkMemory.x, y: landmarkMemory.y },
      });
    }
  }
}
