import type { System } from '../ecs/System.js';
import type { SystemId } from '../types.js';
import type { World } from '../ecs/World.js';
import type { Entity } from '../ecs/Entity.js';
import type { NeedsComponent } from '../components/NeedsComponent.js';
import type { RealmLocationComponent } from '../components/RealmLocationComponent.js';
import { transitionToRealm } from '../realms/RealmTransition.js';

/**
 * DeathTransitionSystem - Handles transitioning dead entities to the Underworld
 *
 * Responsible for:
 * - Detecting when entities die (health <= 0)
 * - Transitioning dead entities to the Underworld realm
 * - Marking entities as dead in their realm location
 *
 * This implements the core "death portal" mechanic where dying automatically
 * sends entities to the Underworld.
 */
export class DeathTransitionSystem implements System {
  readonly id: SystemId = 'death_transition';
  readonly priority: number = 110;  // Run after needs/combat systems
  readonly requiredComponents = ['needs', 'realm_location'] as const;

  private processedDeaths: Set<string> = new Set();

  update(world: World, entities: ReadonlyArray<Entity>, _deltaTime: number): void {
    // Check for newly dead entities
    for (const entity of entities) {
      const needs = entity.components.get('needs') as NeedsComponent | undefined;
      const realmLocation = entity.components.get('realm_location') as RealmLocationComponent | undefined;

      if (!needs || !realmLocation) continue;

      // Check if entity just died (health <= 0 and not already processed)
      const isDead = needs.health <= 0;
      const alreadyProcessed = this.processedDeaths.has(entity.id);

      if (isDead && !alreadyProcessed) {
        this.handleDeath(world, entity.id, realmLocation);
        this.processedDeaths.add(entity.id);
      }

      // Clean up processed deaths list for resurrected entities
      if (!isDead && alreadyProcessed) {
        this.processedDeaths.delete(entity.id);
      }
    }
  }

  /**
   * Handle entity death by transitioning to Underworld
   */
  private handleDeath(world: World, entityId: string, realmLocation: RealmLocationComponent): void {
    // Skip if already in the Underworld
    if (realmLocation.currentRealmId === 'underworld') {
      console.log(`Entity ${entityId} died in the Underworld (already there)`);
      return;
    }

    console.log(`Entity ${entityId} died in ${realmLocation.currentRealmId}, transitioning to Underworld...`);

    // Attempt transition to Underworld via death access method
    const result = transitionToRealm(
      world,
      entityId,
      'underworld',
      'death'
    );

    if (result.success) {
      console.log(`Entity ${entityId} successfully transitioned to Underworld`);

      // Prevent entity from leaving the Underworld unless resurrected/allowed by gods
      realmLocation.canExit = false;

      // Add death transformation marker
      if (!realmLocation.transformations.includes('dead')) {
        realmLocation.transformations.push('dead');
      }
    } else {
      console.error(`Failed to transition entity ${entityId} to Underworld: ${result.reason}`);
      // Fall back to mortal world if Underworld doesn't exist yet
      console.warn(`Entity ${entityId} remains in ${realmLocation.currentRealmId} (Underworld not initialized?)`);
    }
  }

  /**
   * Clear processed deaths (useful for testing/debugging)
   */
  clearProcessedDeaths(): void {
    this.processedDeaths.clear();
  }

  /**
   * Check if an entity's death has been processed
   */
  hasProcessedDeath(entityId: string): boolean {
    return this.processedDeaths.has(entityId);
  }
}
