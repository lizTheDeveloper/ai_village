import type { World } from '../ecs/World.js';
import type { System } from '../ecs/System.js';
import type { Entity } from '../ecs/Entity.js';
import type { AnimationComponent } from '../components/AnimationComponent.js';
import type { RenderableComponent } from '../components/RenderableComponent.js';

/**
 * AnimationSystem - Updates frame-based animations
 *
 * For each entity with animation + renderable components:
 * - Advances the animation frame based on elapsed time
 * - Updates the renderable.spriteId to match the current frame
 *
 * Priority: 100 (runs before rendering)
 */
export class AnimationSystem implements System {
  id = 'animation' as const;
  name = 'animation';
  priority = 100;
  requiredComponents = ['animation', 'renderable'] as const;

  update(world: World, _entities: readonly Entity[], deltaTime: number): void {
    // Query entities with animation and renderable components
    const animatedEntities = world
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
      animation.frameTime += deltaTime;

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
