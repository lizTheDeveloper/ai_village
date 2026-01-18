import { BaseSystem, type SystemContext } from '../ecs/SystemContext.js';
import type { SystemId, ComponentType } from '../types.js';
import { ComponentType as CT } from '../types/ComponentType.js';
import type { Entity } from '../ecs/Entity.js';
import type { BeliefType, EvidenceType } from '../components/BeliefComponent.js';
import type { EpisodicMemory } from '../components/EpisodicMemoryComponent.js';
import { getAgent, getEpisodicMemory, getBelief, getTrustNetwork } from '../utils/componentHelpers.js';

/**
 * BeliefFormationSystem detects patterns in episodic memories and forms beliefs
 * Tracks: character beliefs (trustworthiness), world beliefs (resource patterns), social beliefs
 */
export class BeliefFormationSystem extends BaseSystem {
  public readonly id: SystemId = 'belief_formation';
  public readonly priority: number = 110; // After memory systems
  public readonly requiredComponents: ReadonlyArray<ComponentType> = [CT.Belief, CT.EpisodicMemory, CT.Agent];
  protected readonly throttleInterval: number = 100; // Only run every 5 seconds (at 20 TPS)

  // Lazy activation: Skip entire system when no belief components exist in world
  public readonly activationComponents = [CT.Belief] as const;

  private readonly patternThreshold: number = 3; // Require 3 observations to form belief

  protected onUpdate(ctx: SystemContext): void {
    // ctx.activeEntities already filtered to entities with Belief, EpisodicMemory, Agent (from requiredComponents)
    // OPTIMIZATION: Belief formation only happens during sleep (memory consolidation)
    for (const entity of ctx.activeEntities) {
      try {
        const agent = getAgent(entity);

        // Only process beliefs during sleep (when brain consolidates memories)
        if (agent && agent.behavior === 'forced_sleep') {
          this._updateBeliefs(entity, ctx.activeEntities, ctx.tick);
        }
      } catch (error) {
        throw new Error(`BeliefFormationSystem failed for entity ${entity.id}: ${error}`);
      }
    }
  }

  private _updateBeliefs(entity: Entity, _entities: ReadonlyArray<Entity>, currentTick: number): void {
    const belief = getBelief(entity);
    if (!belief) {
      throw new Error('Belief component missing');
    }

    const episodicMemory = getEpisodicMemory(entity);
    if (!episodicMemory) {
      throw new Error('EpisodicMemory component missing');
    }

    // Analyze memories for patterns
    this._analyzeCharacterPatterns(entity, episodicMemory.episodicMemories, currentTick);
    this._analyzeWorldPatterns(entity, episodicMemory.episodicMemories, currentTick);
    this._analyzeSocialPatterns(entity, episodicMemory.episodicMemories, currentTick);
  }

  /**
   * Analyze character patterns (trustworthiness of other agents)
   */
  private _analyzeCharacterPatterns(entity: Entity, memories: readonly EpisodicMemory[], _currentTick: number): void {
    const trustNetwork = getTrustNetwork(entity);
    if (!trustNetwork) {
      return; // Need trust network to form character beliefs
    }

    const belief = getBelief(entity);
    if (!belief) return;

    // Get all verification memories from episodic memory
    const verificationMemories = memories.filter(m =>
      m.eventType === 'trust_verified' || m.eventType === 'trust_violated'
    );

    // Group by agent ID (stored in participants array)
    const agentMemories = new Map<string, EpisodicMemory[]>();
    for (const memory of verificationMemories) {
      // Agent ID should be in participants array
      const agentId = memory.participants?.[0];
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
        const evidenceType: EvidenceType = memory.eventType === 'trust_verified'
          ? 'accurate_claim'
          : 'false_claim';

        belief.recordEvidence(
          'character' as BeliefType,
          agentId,
          evidenceType,
          memory.timestamp
        );
      }

      // Emit event when belief forms
      const existingBelief = belief.getBeliefAbout('character', agentId);
      if (!existingBelief) {
        this.events.emit('belief:formed', {
          agentId: entity.id,
          entityId: entity.id,
          beliefType: 'character',
          content: `Observed agent ${agentId}`,
          confidence: 0.5,
        });
      }
    }
  }

  /**
   * Analyze world patterns (resource locations, terrain features)
   */
  private _analyzeWorldPatterns(entity: Entity, memories: readonly EpisodicMemory[], currentTick: number): void {
    const belief = getBelief(entity);
    if (!belief) return;

    // Get resource gathering memories
    const resourceMemories = memories.filter(m =>
      m.eventType === 'resource:gathered' || m.eventType === 'resource_location'
    );

    // Detect patterns like "stone near mountains", "wood near water"
    // For simplicity, we'll detect if a resource type is consistently found in similar locations

    // Group by resource type (extract from summary)
    const resourcePatterns = new Map<string, EpisodicMemory[]>();
    for (const memory of resourceMemories) {
      // Try to extract resource type from summary
      const summaryLower = memory.summary.toLowerCase();
      let resourceType: string | undefined;

      // Common resource types to look for
      const resourceTypes = ['wood', 'stone', 'food', 'water', 'berries', 'meat'];
      for (const type of resourceTypes) {
        if (summaryLower.includes(type)) {
          resourceType = type;
          break;
        }
      }

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
  private _analyzeSocialPatterns(entity: Entity, memories: readonly EpisodicMemory[], currentTick: number): void {
    const belief = getBelief(entity);
    if (!belief) return;

    // Get social interaction memories
    const socialMemories = memories.filter(m =>
      m.eventType === CT.Conversation ||
      m.eventType === 'cooperation' ||
      m.eventType === 'resource:shared'
    );

    if (socialMemories.length < this.patternThreshold) {
      return; // Not enough social interactions
    }

    // Detect patterns of cooperation vs competition
    const cooperationCount = socialMemories.filter(m =>
      m.eventType === 'cooperation' || m.eventType === 'resource:shared'
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
