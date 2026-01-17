/**
 * Emotional Navigation System
 *
 * Handles navigation through β-space using emotional topology.
 * Ships navigate by guiding crew through emotional state transitions.
 */

import type { System } from '../ecs/System.js';
import type { World } from '../ecs/World.js';
import type { Entity } from '../ecs/Entity.js';
import type { EventBus } from '../events/EventBus.js';
import { SystemEventManager } from '../events/TypedEventEmitter.js';
import { ComponentType as CT } from '../types/ComponentType.js';
import type { SystemId } from '../types.js';
import type { SpaceshipComponent } from './SpaceshipComponent.js';

// ============================================================================
// System Implementation
// ============================================================================

export class EmotionalNavigationSystem implements System {
  public readonly id: SystemId = 'emotional_navigation' as SystemId;
  public readonly priority: number = 150;
  public readonly requiredComponents: ReadonlyArray<typeof CT[keyof typeof CT]> = [
    CT.Spaceship,
    CT.Position,
  ];

  private events!: SystemEventManager;
  private lastUpdateTick = 0;
  private static readonly UPDATE_INTERVAL = 20; // Every 1 second at 20 TPS

  public initialize(_world: World, eventBus: EventBus): void {
    this.events = new SystemEventManager(eventBus, this.id);
  }

  public cleanup(): void {
    this.events.cleanup();
  }

  public update(
    world: World,
    entities: ReadonlyArray<Entity>,
    _deltaTime: number
  ): void {
    const currentTick = world.tick;
    
    // Throttle updates
    if (currentTick - this.lastUpdateTick < EmotionalNavigationSystem.UPDATE_INTERVAL) {
      return;
    }
    this.lastUpdateTick = currentTick;

    for (const entity of entities) {
      const spaceship = entity.getComponent('spaceship') as SpaceshipComponent;
      if (!spaceship) continue;

      // Only process ships that can navigate β-space
      if (!spaceship.navigation.can_navigate_beta_space) {
        continue;
      }

      this.processShipNavigation(world, entity, spaceship);
    }
  }

  /**
   * Process navigation for a single ship
   */
  private processShipNavigation(
    world: World,
    _ship: Entity,
    spaceship: SpaceshipComponent
  ): void {
    // Calculate crew coherence
    const coherence = this.calculateCrewCoherence(spaceship);

    // Update crew collective emotional state
    this.updateCrewEmotionalState(world, spaceship);

    // Calculate narrative weight accumulation
    this.updateNarrativeWeight(spaceship, coherence);
  }

  /**
   * Calculate how emotionally coherent the crew is
   * High coherence = easier navigation
   * Low coherence = difficulty maintaining course
   */
  private calculateCrewCoherence(spaceship: SpaceshipComponent): number {
    const crewSize = spaceship.crew.member_ids.length;
    if (crewSize === 0) return 0;

    // Base coherence on ship personality alignment
    // This is a simplified calculation - can be expanded
    const baseCoherence = 0.5;
    
    // Adjust based on recent significant events
    const recentEvents = spaceship.narrative.significant_events.slice(-5);
    const eventCoherence = recentEvents.length > 0 ? 0.2 : 0;
    
    return Math.min(1.0, baseCoherence + eventCoherence);
  }

  /**
   * Update the collective emotional state of the crew
   */
  private updateCrewEmotionalState(
    world: World,
    spaceship: SpaceshipComponent
  ): void {
    if (spaceship.crew.member_ids.length === 0) {
      spaceship.crew.collective_emotional_state = { emotions: {} };
      return;
    }

    // Aggregate emotions from all crew members
    const aggregateEmotions: Record<string, number> = {};
    let crewCount = 0;

    for (const crewMemberId of spaceship.crew.member_ids) {
      const crewMember = world.getEntity(crewMemberId);
      if (!crewMember) continue;

      // Get crew member's emotional state (simplified - would integrate with emotion system)
      // For now, use placeholder logic
      crewCount++;
    }

    if (crewCount > 0) {
      // Normalize aggregate emotions
      for (const emotion in aggregateEmotions) {
        const value = aggregateEmotions[emotion];
        if (value !== undefined) {
          aggregateEmotions[emotion] = value / crewCount;
        }
      }
    }

    spaceship.crew.collective_emotional_state = { emotions: aggregateEmotions };
  }

  /**
   * Update narrative weight based on crew activity and coherence
   */
  private updateNarrativeWeight(
    spaceship: SpaceshipComponent,
    coherence: number
  ): void {
    // Coherent crews generate more narrative weight
    const weightIncrease = coherence * 0.1;
    spaceship.narrative.accumulated_weight += weightIncrease;
  }
}
