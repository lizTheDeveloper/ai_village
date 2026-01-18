/**
 * SoulAnimationProgressionSystem
 *
 * Automatically generates walking animations for souls that have reached
 * their 10th incarnation or higher. This implements Tier 2 of the soul
 * sprite evolution system.
 *
 * Animation Unlock Progression:
 * - Incarnation 10+: Walking animation (all 8 directions generated at once)
 * - Future: Idle, combat, and action animations at higher incarnation counts
 */

import { BaseSystem, type SystemContext } from '../ecs/SystemContext.js';
import type { World } from '../ecs/World.js';
import type { EventBus } from '../events/EventBus.js';
import type { SoulIdentityComponent } from '../components/SoulIdentityComponent.js';
import type { SoulLinkComponent } from '../components/SoulLinkComponent.js';
import type { AppearanceComponent } from '../components/AppearanceComponent.js';
import type { GameEventMap } from '../events/EventMap.js';

interface AnimationJob {
  soulId: string;
  characterId: string;
  animationType: 'walking-8-frames' | 'idle' | 'combat';
  spriteFolderId: string;
  incarnationCount: number;
  requestedTick: number;
  status: 'pending' | 'generating' | 'complete' | 'failed';
}

export class SoulAnimationProgressionSystem extends BaseSystem {
  readonly id = 'soul_animation_progression';
  readonly priority = 905; // Run after PixelLabSpriteGenerationSystem (900)
  readonly requiredComponents = [] as const;
  protected readonly throttleInterval = 100; // SLOW - 5 seconds // Event-driven

  private animationJobs: Map<string, AnimationJob> = new Map();
  private readonly MIN_INCARNATION_FOR_WALKING = 10;

  protected async onInitialize(world: World, _eventBus: EventBus): Promise<void> {
    // Subscribe to soul creation completion
    world.eventBus.subscribe<'soul:ceremony_complete'>('soul:ceremony_complete', (event) => {
      this.checkAnimationEligibilityForNewSoul(world, event.data);
    });

    // Subscribe to reincarnation events
    world.eventBus.subscribe<'soul:reincarnated'>('soul:reincarnated', (event) => {
      this.checkAnimationEligibilityForReincarnation(world, event.data);
    });
  }

  /**
   * Check if a newly created soul is eligible for animation generation
   */
  private checkAnimationEligibilityForNewSoul(
    world: World,
    eventData: GameEventMap['soul:ceremony_complete']
  ): void {
    const soulId = eventData.soulId;
    if (!soulId) return;

    const soulEntity = world.getEntity(soulId);
    if (!soulEntity) return;

    const soulIdentity = soulEntity.components.get('soul_identity') as SoulIdentityComponent | undefined;
    if (!soulIdentity) return;

    const incarnationCount = soulIdentity.incarnationHistory.length || 1;

    // Check if soul needs walking animation
    if (incarnationCount >= this.MIN_INCARNATION_FOR_WALKING) {
      this.requestWalkingAnimation(world, soulId, soulIdentity, incarnationCount);
    }
  }

  /**
   * Check if a reincarnated soul is eligible for animation generation
   */
  private checkAnimationEligibilityForReincarnation(
    world: World,
    eventData: GameEventMap['soul:reincarnated']
  ): void {
    // For reincarnation, we need to find the soul entity via the new agent
    const newAgentEntity = world.getEntity(eventData.newEntityId);
    if (!newAgentEntity) return;

    const soulLink = newAgentEntity.components.get('soul_link') as SoulLinkComponent | undefined;
    if (!soulLink) return;

    const soulEntity = world.getEntity(soulLink.soulEntityId);
    if (!soulEntity) return;

    const soulIdentity = soulEntity.components.get('soul_identity') as SoulIdentityComponent | undefined;
    if (!soulIdentity) return;

    const incarnationCount = soulIdentity.incarnationHistory.length || 1;

    // Check if soul needs walking animation
    if (incarnationCount >= this.MIN_INCARNATION_FOR_WALKING) {
      this.requestWalkingAnimation(world, soulLink.soulEntityId, soulIdentity, incarnationCount);
    }
  }

  /**
   * Request walking animation generation for a soul
   */
  private requestWalkingAnimation(
    world: World,
    soulId: string,
    soulIdentity: SoulIdentityComponent,
    incarnationCount: number
  ): void {
    // Get sprite folder ID from agent's appearance component
    // Note: The agent entity should have appearance with spriteFolderId set
    const currentIncarnation = soulIdentity.incarnationHistory[soulIdentity.incarnationHistory.length - 1];
    const agentId = currentIncarnation ? this.findAgentBySoulId(world, soulId) : null;
    if (!agentId) {
      console.warn(`[SoulAnimation] Cannot find agent for soul ${soulId}`);
      return;
    }

    const agent = world.getEntity(agentId);
    if (!agent) return;

    const appearance = agent.components.get('appearance') as AppearanceComponent | undefined;
    const spriteFolderId = appearance?.spriteFolderId;

    if (!spriteFolderId) {
      console.warn(`[SoulAnimation] No sprite folder for soul ${soulId}`);
      return;
    }

    // Check if animation already exists
    if (this.animationExists(spriteFolderId, 'walking-8-frames')) {
      console.log(`[SoulAnimation] Walking animation already exists for ${spriteFolderId}`);
      return;
    }

    // Check if job already queued
    if (this.animationJobs.has(soulId)) {
      console.log(`[SoulAnimation] Animation job already queued for soul ${soulId}`);
      return;
    }

    // Queue animation generation job
    const job: AnimationJob = {
      soulId,
      characterId: spriteFolderId,
      animationType: 'walking-8-frames',
      spriteFolderId,
      incarnationCount,
      requestedTick: world.tick,
      status: 'pending',
    };

    this.animationJobs.set(soulId, job);

    console.log(
      `[SoulAnimation] Queued walking animation for soul ${soulIdentity.soulName} ` +
      `(${incarnationCount} incarnations) - sprite: ${spriteFolderId}`
    );

    // Emit event for external animation generation (daemon or manual process)
    world.eventBus.emit<'soul:animation_requested'>({
      type: 'soul:animation_requested',
      source: 'soul_animation_progression',
      data: {
        soulId,
        spriteFolderId,
        animationType: 'walking-8-frames' as const,
        incarnationCount,
        soulName: soulIdentity.soulName,
      },
    });
  }

  /**
   * Find agent entity by soul ID
   * Note: This is event-driven and queries at specific moments (soul creation/reincarnation)
   * Using targeted query is acceptable here as it's not in the hot path
   */
  private findAgentBySoulId(world: World, soulId: string): string | null {
    // This is a targeted query triggered by soul events, not a per-tick iteration
    for (const entity of world.entities.values()) {
      const soulLink = entity.components.get('soul_link') as SoulLinkComponent | undefined;
      if (soulLink && soulLink.soulEntityId === soulId) {
        return entity.id;
      }
    }
    return null;
  }

  /**
   * Check if animation already exists on disk
   * Note: In production, this would check the filesystem or a sprite registry
   */
  private animationExists(spriteFolderId: string, animationType: string): boolean {
    // For now, return false to allow generation
    // TODO: Implement actual filesystem/registry check
    return false;
  }

  protected onUpdate(_ctx: SystemContext): void {
    // System is event-driven, no per-tick updates needed
  }
}
