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

import type { System } from '../ecs/System.js';
import type { SystemId } from '../types.js';
import type { World } from '../ecs/World.js';

interface AnimationJob {
  soulId: string;
  characterId: string;
  animationType: 'walking-8-frames' | 'idle' | 'combat';
  spriteFolderId: string;
  incarnationCount: number;
  requestedTick: number;
  status: 'pending' | 'generating' | 'complete' | 'failed';
}

export class SoulAnimationProgressionSystem implements System {
  readonly id: SystemId = 'soul_animation_progression';
  readonly priority = 905; // Run after PixelLabSpriteGenerationSystem (900)
  readonly requiredComponents = [] as const; // Event-driven

  private animationJobs: Map<string, AnimationJob> = new Map();
  private readonly MIN_INCARNATION_FOR_WALKING = 10;

  onInit(world: World): void {
    // Subscribe to soul creation completion
    world.eventBus.subscribe('soul:ceremony_complete', (event: any) => {
      this.checkAnimationEligibility(world, event.data);
    });

    // Subscribe to reincarnation events
    world.eventBus.subscribe('agent:reincarnated', (event: any) => {
      this.checkAnimationEligibility(world, event.data);
    });
  }

  /**
   * Check if a soul is eligible for animation generation
   */
  private checkAnimationEligibility(world: World, eventData: any): void {
    const soulId = eventData.soulId;
    if (!soulId) return;

    const soulEntity = world.getEntity(soulId);
    if (!soulEntity) return;

    const soulIdentity = soulEntity.components.get('soul_identity') as any;
    if (!soulIdentity) return;

    const incarnationCount = soulIdentity.incarnationHistory?.length || 1;

    // Check if soul needs walking animation
    if (incarnationCount >= this.MIN_INCARNATION_FOR_WALKING) {
      this.requestWalkingAnimation(world, soulId, soulIdentity, incarnationCount);
    }
  }

  /**
   * Request walking animation generation for a soul
   */
  private requestWalkingAnimation(
    world: World,
    soulId: string,
    soulIdentity: any,
    incarnationCount: number
  ): void {
    // Get sprite folder ID from agent's appearance component
    // Note: The agent entity should have appearance with spriteFolderId set
    const agentId = soulIdentity.currentAgentId || this.findAgentBySoulId(world, soulId);
    if (!agentId) {
      console.warn(`[SoulAnimation] Cannot find agent for soul ${soulId}`);
      return;
    }

    const agent = world.getEntity(agentId);
    if (!agent) return;

    const appearance = agent.components.get('appearance') as any;
    const spriteFolderId = appearance?.spriteFolderId || appearance?.spriteFolder;

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
    world.eventBus.emit({
      type: 'soul:animation_requested',
      source: 'soul_animation_progression',
      data: {
        soulId,
        spriteFolderId,
        animationType: 'walking-8-frames',
        incarnationCount,
        soulName: soulIdentity.soulName,
      },
    });
  }

  /**
   * Find agent entity by soul ID
   */
  private findAgentBySoulId(world: World, soulId: string): string | null {
    for (const entity of world.entities.values()) {
      const soulLink = entity.components.get('soul_link') as any;
      if (soulLink && soulLink.soulId === soulId) {
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

  update(_world: World, _deltaTime: number): void {
    // System is event-driven, no per-tick updates needed
  }
}
