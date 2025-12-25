import type { System } from '../ecs/System.js';
import type { SystemId, ComponentType } from '../types.js';
import type { World } from '../ecs/World.js';
import type { Entity } from '../ecs/Entity.js';
import { EntityImpl } from '../ecs/Entity.js';
import type { EventBus } from '../events/EventBus.js';
import type { BeliefType, EvidenceType } from '../components/BeliefComponent.js';

/**
 * BeliefFormationSystem detects patterns in episodic memories and forms beliefs
 * Tracks: character beliefs (trustworthiness), world beliefs (resource patterns), social beliefs
 */
export class BeliefFormationSystem implements System {
  public readonly id: SystemId = 'belief_formation';
  public readonly priority: number = 110; // After memory systems
  public readonly requiredComponents: ReadonlyArray<ComponentType> = [];

  private eventBus?: EventBus;
  private readonly patternThreshold: number = 3; // Require 3 observations to form belief
  private lastUpdateTick: number = 0;
  private readonly updateInterval: number = 100; // Only run every 5 seconds (at 20 TPS)

  initialize(_world: World, eventBus: EventBus): void {
    this.eventBus = eventBus;
  }

  update(_world: World, entities: ReadonlyArray<Entity>, currentTick: number): void {
    // Throttle: Only check every 5 seconds for sleeping agents
    if (currentTick - this.lastUpdateTick < this.updateInterval) {
      return;
    }
    this.lastUpdateTick = currentTick;

    // OPTIMIZATION: Belief formation only happens during sleep (memory consolidation)
    const believers = entities.filter(e =>
      e.components.has('Belief') &&
      e.components.has('EpisodicMemory') &&
      e.components.has('agent')
    );

    for (const entity of believers) {
      try {
        const impl = entity as any;
        const agent = impl.getComponent('agent');

        // Only process beliefs during sleep (when brain consolidates memories)
        if (agent && agent.behavior === 'forced_sleep') {
          this._updateBeliefs(entity, entities, currentTick);
        }
      } catch (error) {
        throw new Error(`BeliefFormationSystem failed for entity ${entity.id}: ${error}`);
      }
    }
  }

  private _updateBeliefs(entity: Entity, _entities: ReadonlyArray<Entity>, currentTick: number): void {
    const impl = entity as EntityImpl;

    const belief = impl.getComponent('Belief') as any;
    if (!belief) {
      throw new Error('Belief component missing');
    }

    const episodicMemory = impl.getComponent('EpisodicMemory') as any;
    if (!episodicMemory) {
      throw new Error('EpisodicMemory component missing');
    }

    // Analyze memories for patterns
    this._analyzeCharacterPatterns(impl, episodicMemory, currentTick);
    this._analyzeWorldPatterns(impl, episodicMemory, currentTick);
    this._analyzeSocialPatterns(impl, episodicMemory, currentTick);
  }

  /**
   * Analyze character patterns (trustworthiness of other agents)
   */
  private _analyzeCharacterPatterns(entity: EntityImpl, episodicMemory: any, currentTick: number): void {
    if (!entity.hasComponent('TrustNetwork')) {
      return; // Need trust network to form character beliefs
    }

    const trustNetwork = entity.getComponent('TrustNetwork') as any;
    if (!trustNetwork) return;

    const belief = entity.getComponent('Belief') as any;
    if (!belief) return;

    // Get all verification memories from episodic memory
    const memories = episodicMemory.memories ?? [];
    const verificationMemories = memories.filter((m: any) =>
      m.type === 'trust_verified' || m.type === 'trust_violated'
    );

    // Group by agent ID
    const agentMemories = new Map<string, any[]>();
    for (const memory of verificationMemories) {
      const agentId = memory.agentId ?? memory.data?.agentId;
      if (!agentId) continue;

      if (!agentMemories.has(agentId)) {
        agentMemories.set(agentId, []);
      }
      agentMemories.get(agentId)!.push(memory);
    }

    // Form beliefs about agents with enough evidence
    for (const [agentId, memories] of agentMemories.entries()) {
      if (memories.length < this.patternThreshold) {
        continue; // Not enough observations
      }

      // Record evidence from verification memories
      for (const memory of memories) {
        const evidenceType: EvidenceType = memory.result === 'correct' || memory.type === 'trust_verified'
          ? 'accurate_claim'
          : 'false_claim';

        belief.recordEvidence(
          'character' as BeliefType,
          agentId,
          evidenceType,
          memory.tick ?? currentTick
        );
      }

      // Emit event when belief forms
      const existingBelief = belief.getBeliefAbout('character', agentId);
      if (!existingBelief && this.eventBus) {
        this.eventBus.emit({
          type: 'belief:formed',
          source: 'belief_formation',
          data: {
            entityId: entity.id,
            beliefType: 'character',
            subject: agentId,
            tick: currentTick,
          },
        });
      }
    }
  }

  /**
   * Analyze world patterns (resource locations, terrain features)
   */
  private _analyzeWorldPatterns(entity: EntityImpl, episodicMemory: any, currentTick: number): void {
    const belief = entity.getComponent('Belief') as any;
    if (!belief) return;

    // Get resource gathering memories
    const memories = episodicMemory.memories ?? [];
    const resourceMemories = memories.filter((m: any) =>
      m.type === 'resource:gathered' || m.type === 'resource_location'
    );

    // Detect patterns like "stone near mountains", "wood near water"
    // For simplicity, we'll detect if a resource type is consistently found in similar locations

    // Group by resource type
    const resourcePatterns = new Map<string, any[]>();
    for (const memory of resourceMemories) {
      const resourceType = memory.resourceType ?? memory.data?.resourceType;
      if (!resourceType) continue;

      if (!resourcePatterns.has(resourceType)) {
        resourcePatterns.set(resourceType, []);
      }
      resourcePatterns.get(resourceType)!.push(memory);
    }

    for (const [resourceType, memories] of resourcePatterns.entries()) {
      if (memories.length < this.patternThreshold) {
        continue;
      }

      // Check if there's a spatial pattern (e.g., all wood found in similar area)
      // For now, we'll just record that this resource has been found multiple times
      const patternDescription = `${resourceType} can be found in this region`;

      belief.recordEvidence(
        'world' as BeliefType,
        patternDescription,
        'observation' as EvidenceType,
        currentTick
      );
    }
  }

  /**
   * Analyze social patterns (cooperation, sharing behavior)
   */
  private _analyzeSocialPatterns(entity: EntityImpl, episodicMemory: any, currentTick: number): void {
    const belief = entity.getComponent('Belief') as any;
    if (!belief) return;

    // Get social interaction memories
    const memories = episodicMemory.memories ?? [];
    const socialMemories = memories.filter((m: any) =>
      m.type === 'conversation' ||
      m.type === 'cooperation' ||
      m.type === 'resource:shared'
    );

    if (socialMemories.length < this.patternThreshold) {
      return; // Not enough social interactions
    }

    // Detect patterns of cooperation vs competition
    const cooperationCount = socialMemories.filter((m: any) =>
      m.type === 'cooperation' || m.type === 'resource:shared'
    ).length;

    if (cooperationCount >= this.patternThreshold) {
      belief.recordEvidence(
        'social' as BeliefType,
        'Cooperation leads to better outcomes',
        'experience' as EvidenceType,
        currentTick
      );
    }
  }

  // Future: Add _checkSelfBeliefs method for epistemic humility features
}
