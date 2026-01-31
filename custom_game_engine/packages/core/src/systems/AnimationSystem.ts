import { BaseSystem, type SystemContext } from '../ecs/SystemContext.js';
import type { AnimationComponent } from '../components/AnimationComponent.js';
import type { RenderableComponent } from '../components/RenderableComponent.js';
import { STAGGER } from '../ecs/SystemThrottleConfig.js';

/**
 * AnimationSystem - Updates frame-based animations
 *
 * For each entity with animation + renderable components:
 * - Advances the animation frame based on elapsed time
 * - Updates the renderable.spriteId to match the current frame
 *
 * Priority: 100 (runs before rendering)
 */
export class AnimationSystem extends BaseSystem {
  readonly id = 'animation' as const;
  readonly priority = 100;
  readonly requiredComponents = ['animation', 'renderable'] as const;
  // Only run when animation components exist (O(1) activation check)
  readonly activationComponents = ['animation'] as const;
  protected readonly throttleInterval = 100; // SLOW - 5 seconds
  protected readonly throttleOffset = STAGGER.SLOW_GROUP_C; // Stagger group C (tick 50, 150, 250...)

  protected onUpdate(ctx: SystemContext): void {
    // Query entities with animation and renderable components
    const animatedEntities = ctx.world
      .query()
      .with('animation')
      .with('renderable')
      .executeEntities();

    for (const entity of animatedEntities) {
      const animation = entity.getComponent('animation') as AnimationComponent;
      const renderable = entity.getComponent('renderable') as RenderableComponent;

      if (!animation || !renderable || !animation.playing) {
        continue;
      }

      // Validate frames array
      if (!animation.frames || animation.frames.length === 0) {
        continue;
      }

      // Accumulate frame time
      animation.frameTime += ctx.deltaTime;

      // Check if it's time to advance to next frame
      if (animation.frameTime >= animation.frameDuration) {
        // Advance frame
        animation.currentFrame++;

        // Handle looping
        if (animation.currentFrame >= animation.frames.length) {
          if (animation.loop) {
            animation.currentFrame = 0;
          } else {
            // Stop at last frame
            animation.currentFrame = animation.frames.length - 1;
            animation.playing = false;
          }
        }

        // Reset frame time (preserve overflow for smooth timing)
        animation.frameTime -= animation.frameDuration;
      }

      // Ensure currentFrame is within bounds
      if (animation.currentFrame < 0) {
        animation.currentFrame = 0;
      }
      if (animation.currentFrame >= animation.frames.length) {
        animation.currentFrame = animation.frames.length - 1;
      }

      // Update renderable sprite to match current frame
      const frameSprite = animation.frames[animation.currentFrame];
      if (frameSprite) {
        renderable.spriteId = frameSprite;
      }

      // Components are mutated in place - no need to update
    }
  }
}
