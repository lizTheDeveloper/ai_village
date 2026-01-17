/**
 * CompanionSystem - Manages the Ophanim companion AI
 *
 * Responsibilities:
 * - Track civilization milestones
 * - Trigger evolution at session end
 * - Update emotional state based on events
 * - Manage companion needs
 * - Detect patterns and offer advice
 *
 * Phase 1: Stub implementation (basic structure)
 * Later phases will add full functionality
 */

import type { System } from '../ecs/System.js';
import type { World } from '../ecs/World.js';
import { ComponentType as CT } from '../types/ComponentType.js';
import { CompanionComponent } from '../components/CompanionComponent.js';
import { createOphanimimCompanion, findCompanion } from '../companions/OphanimimCompanionEntity.js';

export class CompanionSystem implements System {
  public readonly id = 'companion_system';
  public readonly priority = 950; // Low priority - runs after most systems
  public readonly requiredComponents = []; // Global system
  public enabled = true;

  private companionEntityId: string | null = null;
  private lastUpdateTick = 0;
  private updateInterval = 60; // Update every 3 seconds (60 ticks at 20 TPS)

  constructor() {
    // Stub constructor
  }

  /**
   * Initialize the system
   */
  public init(world: World): void {
    // Ensure companion exists
    this.ensureCompanionExists(world);
  }

  /**
   * Update the companion
   */
  public update(world: World): void {
    // Throttle updates
    if (world.tick - this.lastUpdateTick < this.updateInterval) {
      return;
    }
    this.lastUpdateTick = world.tick;

    // Ensure companion exists
    if (!this.companionEntityId) {
      this.ensureCompanionExists(world);
      return;
    }

    const companionEntity = world.getEntity(this.companionEntityId);
    if (!companionEntity) {
      console.error('[CompanionSystem] Companion entity not found, recreating');
      this.companionEntityId = null;
      this.ensureCompanionExists(world);
      return;
    }

    const companionComp = companionEntity.getComponent<CompanionComponent>(CT.Companion);
    if (!companionComp) {
      console.error('[CompanionSystem] Companion entity missing CompanionComponent');
      return;
    }

    // Phase 1: Stub - just log that we're running
    // Later phases will add:
    // - Milestone detection
    // - Emotion updates
    // - Needs management
    // - Pattern detection
    // - Advice generation
  }

  /**
   * Ensure companion entity exists
   */
  private ensureCompanionExists(world: World): void {
    if (this.companionEntityId) {
      return;
    }

    // Try to find existing companion
    const existing = findCompanion(world);
    if (existing) {
      this.companionEntityId = existing.id;
      return;
    }

    // Create new companion
    const companion = createOphanimimCompanion(world, world.tick);
    this.companionEntityId = companion.id;
  }
}
