import { BaseSystem, type SystemContext } from '../ecs/SystemContext.js';
import { ComponentType as CT } from '../types/ComponentType.js';
import type { World } from '../ecs/World.js';
import type { Entity } from '../ecs/Entity.js';
import { EntityImpl } from '../ecs/Entity.js';
import type { EventBus } from '../events/EventBus.js';
import type { Myth, MythologyComponent } from '../components/MythComponent.js';
import { tellMyth } from '../components/MythComponent.js';
import type { SpiritualComponent } from '../components/SpiritualComponent.js';
import type { PersonalityComponent } from '../components/PersonalityComponent.js';
import type { DeityComponent } from '../components/DeityComponent.js';
import type { PositionComponent } from '../components/PositionComponent.js';
import {
  selectMutation,
  applyMutation,
  type MutationContext,
  type MutationResult,
} from '../divinity/MythMutationTypes.js';

/**
 * MythRetellingSystem - Handles automatic myth spreading and mutation
 *
 * Agents naturally retell myths to each other over time.
 * Each retelling can introduce mutations (including attribution changes).
 * This creates theological diversity and conflict in multi-deity environments.
 */
export class MythRetellingSystem extends BaseSystem {
  public readonly id = 'myth_retelling';
  public readonly priority = 119; // After myth generation
  public readonly requiredComponents = [] as const;

  private retellingCooldown: Map<string, number> = new Map(); // agentId → lastTelling tick

  protected async onInitialize(_world: World, eventBus: EventBus): Promise<void> {
    // Listen for attribution events
    eventBus.subscribe('myth:attribution_changed', (event) => {
      console.log('[MythRetellingSystem] Myth attribution changed:', event.data);
    });
  }

  protected onUpdate(ctx: SystemContext): void {
    const currentTick = ctx.tick;
    // Find agents with spiritual beliefs
    const believers = ctx.world.query()
      .with(CT.Agent)
      .with(CT.Spiritual)
      .executeEntities();

    if (believers.length === 0) return;

    // Get all deities for context
    const deities = ctx.world.query()
      .with(CT.Deity)
      .executeEntities();
    const deityInfo = deities.map(d => {
      const deity = d.components.get(CT.Deity) as DeityComponent;
      return {
        id: d.id,
        name: deity.identity.primaryName,
        domain: deity.identity.domain || 'unknown',
        popularity: deity.believers.size,
      };
    });

    // Process each believer for potential myth retelling
    for (const believer of believers) {
      // Check cooldown (don't retell too often)
      const lastRetelling = this.retellingCooldown.get(believer.id) || 0;
      const RETELLING_COOLDOWN = 3600; // 1 hour in ticks (assuming 60 ticks/min)

      if (currentTick - lastRetelling < RETELLING_COOLDOWN) {
        continue;
      }

      // 10% chance each hour to retell a myth
      if (Math.random() > 0.1) {
        continue;
      }

      // Find myths this agent knows
      const myths = this._findKnownMyths(believer, deities);
      if (myths.length === 0) continue;

      // Pick a random myth to retell
      const mythToRetell = myths[Math.floor(Math.random() * myths.length)]!;

      // Find nearby agents to tell it to
      const nearby = this._findNearbyAgents(believer, believers);
      if (nearby.length === 0) continue;

      // Retell the myth (with possible mutation)
      this._retellMyth(
        believer,
        mythToRetell,
        nearby,
        deities,
        deityInfo,
        currentTick,
        ctx.world
      );

      // Update cooldown
      this.retellingCooldown.set(believer.id, currentTick);
    }
  }

  /**
   * Find all myths known by this agent
   */
  private _findKnownMyths(
    agent: Entity,
    deities: ReadonlyArray<Entity>
  ): Array<{ myth: Myth; deityEntity: Entity; mythology: MythologyComponent }> {
    const knownMyths: Array<{ myth: Myth; deityEntity: Entity; mythology: MythologyComponent }> = [];

    for (const deity of deities) {
      const mythology = deity.components.get(CT.Mythology) as MythologyComponent | undefined;
      if (!mythology) continue;

      for (const myth of mythology.myths) {
        if (myth.knownBy.includes(agent.id)) {
          knownMyths.push({ myth, deityEntity: deity, mythology });
        }
      }
    }

    return knownMyths;
  }

  /**
   * Find agents near the speaker
   */
  private _findNearbyAgents(
    agent: Entity,
    allAgents: ReadonlyArray<Entity>
  ): Entity[] {
    const position = agent.components.get(CT.Position) as PositionComponent | undefined;
    if (!position) return [];

    const nearby: Entity[] = [];
    const CONVERSATION_RADIUS = 30; // Grid units

    for (const other of allAgents) {
      if (other.id === agent.id) continue;

      const otherPos = other.components.get(CT.Position) as PositionComponent | undefined;
      if (!otherPos) continue;

      const dx = otherPos.x - position.x;
      const dy = otherPos.y - position.y;
      const distSq = dx * dx + dy * dy;

      if (distSq <= CONVERSATION_RADIUS * CONVERSATION_RADIUS) {
        nearby.push(other);
      }
    }

    return nearby;
  }

  /**
   * Retell a myth to nearby agents (with possible mutation)
   */
  private _retellMyth(
    narrator: Entity,
    mythData: { myth: Myth; deityEntity: Entity; mythology: MythologyComponent },
    listeners: Entity[],
    allDeities: ReadonlyArray<Entity>,
    deityInfo: Array<{ id: string; name: string; domain: string; popularity: number }>,
    currentTick: number,
    world: World
  ): void {
    const { myth, deityEntity, mythology } = mythData;

    // Get narrator info
    const narratorPersonality = narrator.components.get(CT.Personality) as PersonalityComponent | undefined;
    const narratorSpiritual = narrator.components.get(CT.Spiritual) as SpiritualComponent | undefined;

    // Build mutation context
    const context: MutationContext = {
      narratorId: narrator.id,
      narratorPersonality,
      audienceIds: listeners.map(l => l.id),
      currentTick,
      timeSinceOriginal: currentTick - myth.creationTime,
      retellingCount: myth.tellingCount,
      availableDeities: deityInfo,
      narratorBeliefs: narratorSpiritual ? {
        believedDeity: narratorSpiritual.believedDeity,
        faithLevel: narratorSpiritual.faith,
      } : undefined,
    };

    // Check if mutation should occur
    const mutationType = selectMutation(myth, context);

    let finalMyth: Myth;
    let mutationResult: MutationResult | null = null;

    if (mutationType) {
      // Apply mutation
      mutationResult = applyMutation(myth, mutationType, context);
      finalMyth = mutationResult.mutatedMyth;

      console.log(`[MythRetellingSystem] Myth "${myth.title}" mutated (${mutationType}): ${mutationResult.changeDescription}`);
    } else {
      // No mutation
      finalMyth = {
        ...myth,
        tellingCount: myth.tellingCount + 1,
        lastToldTime: currentTick,
      };
    }

    // Handle attribution change
    if (mutationResult?.attributionChanged && mutationResult.newDeityId) {
      this._handleAttributionChange(
        myth,
        finalMyth,
        mutationResult.newDeityId,
        allDeities,
        world,
        currentTick,
        narrator.id
      );
    } else {
      // No attribution change - update original deity's mythology
      const updatedMythology = this._updateMythology(mythology, myth.id, finalMyth);
      (deityEntity as EntityImpl).addComponent(updatedMythology);
    }

    // Spread to listeners
    const mythologyToUpdate = mutationResult?.attributionChanged && mutationResult.newDeityId
      ? allDeities.find(d => d.id === mutationResult.newDeityId)?.components.get(CT.Mythology) as MythologyComponent
      : mythology;

    if (mythologyToUpdate) {
      for (const listener of listeners) {
        const updatedMythology = tellMyth(mythologyToUpdate, finalMyth.id, listener.id, currentTick);

        // Update the appropriate deity
        const targetDeityId = mutationResult?.newDeityId || deityEntity.id;
        const targetDeity = allDeities.find(d => d.id === targetDeityId);
        if (targetDeity) {
          (targetDeity as EntityImpl).addComponent(updatedMythology);
        }
      }
    }
  }

  /**
   * Handle attribution change - move myth to new deity
   */
  private _handleAttributionChange(
    originalMyth: Myth,
    mutatedMyth: Myth,
    newDeityId: string,
    allDeities: ReadonlyArray<Entity>,
    world: World,
    currentTick: number,
    narratorId: string
  ): void {
    const originalDeity = allDeities.find(d => d.id === originalMyth.deityId);
    const newDeity = allDeities.find(d => d.id === newDeityId);

    if (!newDeity) {
      console.error('[MythRetellingSystem] New deity not found for attribution');
      return;
    }

    // Add to new deity's mythology
    const newDeityMythology = newDeity.components.get(CT.Mythology) as MythologyComponent | undefined;
    if (newDeityMythology) {
      const updatedMythology = {
        ...newDeityMythology,
        myths: [...newDeityMythology.myths, mutatedMyth],
        totalMythsCreated: newDeityMythology.totalMythsCreated + 1,
      };

      (newDeity as EntityImpl).addComponent(updatedMythology);
    }

    // Mark original version as disputed (if it exists)
    if (originalDeity) {
      const originalMythology = originalDeity.components.get(CT.Mythology) as MythologyComponent | undefined;
      if (originalMythology) {
        const updatedMythology = {
          ...originalMythology,
          myths: originalMythology.myths.map(m =>
            m.id === originalMyth.id
              ? { ...m, status: 'disputed' as const }
              : m
          ),
        };

        (originalDeity as EntityImpl).addComponent(updatedMythology);
      }
    }

    // Emit attribution change event
    world.eventBus?.emit({
      type: 'myth:attribution_changed',
      source: narratorId,
      data: {
        mythId: mutatedMyth.id,
        mythTitle: mutatedMyth.title,
        originalDeityId: originalMyth.deityId,
        newDeityId,
        timestamp: currentTick,
      },
    });

    // Update deity components for dashboard
    if (originalDeity) {
      const originalDeityComp = originalDeity.components.get(CT.Deity) as DeityComponent | undefined;
      if (originalDeityComp) {
        // Mark myth as disputed
        const mythIndex = originalDeityComp.myths.findIndex(m => m.id === originalMyth.id);
        if (mythIndex !== -1) {
          originalDeityComp.myths[mythIndex] = {
            ...originalDeityComp.myths[mythIndex]!,
            variants: (originalDeityComp.myths[mythIndex]!.variants || 1) + 1,
          };
        }
      }
    }

    const newDeityComp = newDeity.components.get(CT.Deity) as DeityComponent | undefined;
    if (newDeityComp) {
      // Add new myth
      newDeityComp.myths.push({
        id: mutatedMyth.id,
        title: mutatedMyth.title,
        category: 'miracle',
        content: mutatedMyth.fullText,
        believerCount: 1,
        variants: 1,
        createdAt: mutatedMyth.creationTime,
      });

      // Keep only last 20
      if (newDeityComp.myths.length > 20) {
        newDeityComp.myths.shift();
      }
    }
  }

  /**
   * Update a mythology component with a modified myth
   */
  private _updateMythology(
    mythology: MythologyComponent,
    mythId: string,
    updatedMyth: Myth
  ): MythologyComponent {
    return {
      ...mythology,
      myths: mythology.myths.map(m =>
        m.id === mythId ? updatedMyth : m
      ),
    };
  }
}
