/**
 * BackgroundUniverseSystem - Integrates BackgroundUniverseManager into game loop
 *
 * Priority: 15 (very early, before most game logic)
 * Throttle: 1000 ticks (10 seconds - background simulation is infrequent)
 *
 * Responsibilities:
 * - Update background universes each tick
 * - Forward invasion events to game systems
 * - Handle portal connections to background universes
 */

import { BaseSystem, type SystemContext } from '../ecs/SystemContext.js';
import type { SystemId, ComponentType } from '../types.js';
import { BackgroundUniverseManager } from '../multiverse/BackgroundUniverseManager.js';
import { multiverseCoordinator } from '../multiverse/MultiverseCoordinator.js';

/**
 * BackgroundUniverseSystem - Updates background simulations
 *
 * This system is optional - only activates if background universes exist
 * Otherwise has zero overhead
 */
export class BackgroundUniverseSystem extends BaseSystem {
  public readonly id: SystemId = 'background_universe';
  public readonly priority: number = 15;
  public readonly requiredComponents: ReadonlyArray<ComponentType> = [];
  protected readonly throttleInterval = 1000; // Every 10 seconds

  private manager: BackgroundUniverseManager | null = null;
  private initialized = false;

  protected onInit(ctx: SystemContext): void {
    const { world, events } = ctx;

    if (!events) {
      console.warn('[BackgroundUniverseSystem] No EventBus available');
      return;
    }

    // Create BackgroundUniverseManager
    this.manager = new BackgroundUniverseManager(
      multiverseCoordinator,
      world,
      events
    );

    this.initialized = true;

    console.log('[BackgroundUniverseSystem] Initialized');
  }

  protected onUpdate(ctx: SystemContext): void {
    if (!this.initialized || !this.manager) {
      return;
    }

    const { tick } = ctx;

    // Update all background universes
    this.manager.update(BigInt(tick)).catch((error) => {
      console.error('[BackgroundUniverseSystem] Update error:', error);
    });
  }

  /**
   * Get manager for external access (e.g., from plot systems)
   */
  getManager(): BackgroundUniverseManager | null {
    return this.manager;
  }

  protected onCleanup(ctx: SystemContext): void {
    // Cleanup handled by MultiverseCoordinator
    console.log('[BackgroundUniverseSystem] Cleaned up');
  }
}
