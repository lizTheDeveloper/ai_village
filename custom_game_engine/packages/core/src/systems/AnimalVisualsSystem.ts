import type { World } from '../ecs/World.js';
import type { System } from '../ecs/System.js';
import type { Entity } from '../ecs/Entity.js';
import type { AnimalComponent } from '../components/AnimalComponent.js';
import type { RenderableComponent } from '../components/RenderableComponent.js';

/**
 * AnimalVisualsSystem - Computes visual metadata for animals based on size and life stage
 *
 * Updates renderable.sizeMultiplier and renderable.alpha based on:
 * - Animal size field (species genetics + individual variation)
 * - Life stage (juvenile animals are smaller)
 * - Health state (dying animals fade)
 *
 * Priority: 301 (runs after AnimalGrowthSystem, before rendering)
 */
export class AnimalVisualsSystem implements System {
  id = 'animal_visuals' as const;
  name = 'animal_visuals';
  priority = 301;
  requiredComponents = ['animal', 'renderable'] as const;

  /**
   * Calculate size multiplier based on animal size and life stage
   */
  private calculateSizeMultiplier(animal: AnimalComponent): number {
    // Base size from animal's size field (already includes genetics + age factors)
    let sizeMultiplier = animal.size ?? 1.0;

    // Apply life stage modifier for younger animals
    switch (animal.lifeStage) {
      case 'infant':
        sizeMultiplier *= 0.3; // Infants are 30% of adult size
        break;
      case 'juvenile':
        sizeMultiplier *= 0.6; // Juveniles are 60% of adult size
        break;
      case 'adult':
        // Full size, no modifier
        break;
      case 'elder':
        sizeMultiplier *= 0.95; // Elders slightly smaller (stooped)
        break;
    }

    // Clamp to reasonable bounds (0.1 to 10.0 as per spec)
    return Math.max(0.1, Math.min(10.0, sizeMultiplier));
  }

  /**
   * Calculate alpha (opacity) based on animal health
   */
  private calculateAlpha(animal: AnimalComponent): number {
    // Most animals are fully opaque
    // Could add logic for dying/ghost animals later

    // Very low health = fading out
    if (animal.health < 20) {
      return 0.5 + (animal.health / 20) * 0.5; // 0.5 to 1.0 based on health
    }

    return 1.0;
  }

  update(world: World, _entities: readonly Entity[], _deltaTime: number): void {
    // Query entities with animal and renderable components
    const animalEntities = world
      .query()
      .with('animal')
      .with('renderable')
      .executeEntities();

    for (const entity of animalEntities) {
      const animal = entity.getComponent('animal') as AnimalComponent;
      const renderable = entity.getComponent('renderable') as RenderableComponent;

      if (!animal || !renderable) {
        continue;
      }

      const newSize = this.calculateSizeMultiplier(animal);
      const newAlpha = this.calculateAlpha(animal);

      // Only update if changed (avoid unnecessary mutations)
      if (renderable.sizeMultiplier !== newSize || renderable.alpha !== newAlpha) {
        renderable.sizeMultiplier = newSize;
        renderable.alpha = newAlpha;
      }
    }
  }
}
