/**
 * MassEventSystem - Phase 9: World Impact
 *
 * Handles large-scale divine events that affect many believers or the world.
 * Mass events include:
 * - Plagues and blessings
 * - Mass healings
 * - Divine revelations
 * - Apocalyptic events
 * - Golden ages
 * - Festivals and celebrations
 */

import { BaseSystem, type SystemContext } from '../ecs/SystemContext.js';
import type { World } from '../ecs/World.js';
import { ComponentType as CT } from '../types/ComponentType.js';
import { DeityComponent } from '../components/DeityComponent.js';
import type { SpiritualComponent } from '../components/SpiritualComponent.js';

// ============================================================================
// Mass Event Types
// ============================================================================

export interface MassEvent {
  id: string;

  /** Deity who triggered the event */
  deityId: string;

  /** Event type */
  type: MassEventType;

  /** Event name */
  name: string;

  /** When triggered */
  triggeredAt: number;

  /** Duration in ticks */
  duration: number;

  /** Belief cost */
  cost: number;

  /** Target group */
  target: EventTarget;

  /** Affected entities */
  affectedEntities: string[];

  /** Event intensity (0-1) */
  intensity: number;

  /** Purpose */
  purpose?: EventPurpose;

  /** Status */
  status: 'pending' | 'active' | 'completed' | 'failed';

  /** Results */
  results?: EventResults;
}

export type MassEventType =
  | 'divine_blessing'      // Mass blessing for all believers
  | 'plague'               // Disease outbreak
  | 'famine'               // Food scarcity
  | 'prosperity'           // Economic boom
  | 'mass_healing'         // Heal all sick believers
  | 'revelation'           // Divine message to all
  | 'pilgrimage'           // Call believers to sacred site
  | 'festival'             // Large celebration
  | 'divine_test'          // Challenge for believers
  | 'apocalypse'           // World-ending event
  | 'golden_age'           // Period of peace and plenty
  | 'divine_judgment'      // Evaluate all believers
  | 'mass_conversion';     // Inspire many to convert

export type EventTarget =
  | 'all_believers'        // Only deity's believers
  | 'all_mortals'          // Everyone in world
  | 'specific_group'       // Defined group
  | 'geographic_area'      // Area-based
  | 'rival_believers';     // Believers of rival deity

export type EventPurpose =
  | 'blessing'
  | 'punishment'
  | 'demonstration'
  | 'recruitment'
  | 'consolidation'
  | 'warfare'
  | 'testing';

export interface EventResults {
  entitiesAffected: number;
  beliefGenerated: number;
  believersGained: number;
  believersLost: number;
  mortality: number;
  faithChanges: { entityId: string; change: number }[];
}

// ============================================================================
// Mass Event Configuration
// ============================================================================

export interface MassEventConfig {
  /** How often to update events (ticks) */
  updateInterval: number;

  /** Base costs for each event type */
  eventCosts: Record<MassEventType, number>;

  /** Minimum belief required */
  minBeliefRequired: number;
}

export const DEFAULT_MASS_EVENT_CONFIG: MassEventConfig = {
  updateInterval: 200, // ~10 seconds at 20 TPS
  minBeliefRequired: 2000,
  eventCosts: {
    divine_blessing: 1000,
    plague: 800,
    famine: 1200,
    prosperity: 1500,
    mass_healing: 2000,
    revelation: 800,
    pilgrimage: 600,
    festival: 500,
    divine_test: 1000,
    apocalypse: 10000,
    golden_age: 5000,
    divine_judgment: 1500,
    mass_conversion: 2500,
  },
};

// ============================================================================
// MassEventSystem
// ============================================================================

export class MassEventSystem extends BaseSystem {
  public readonly id = 'MassEventSystem';
  public readonly priority = 73;
  public readonly requiredComponents = [];

  private config: MassEventConfig;
  private massEvents: Map<string, MassEvent> = new Map();
  private lastUpdate: number = 0;

  constructor(config: Partial<MassEventConfig> = {}) {
    super();
    this.config = {
      ...DEFAULT_MASS_EVENT_CONFIG,
      ...config,
      eventCosts: { ...DEFAULT_MASS_EVENT_CONFIG.eventCosts, ...config.eventCosts },
    };
  }

  protected onUpdate(ctx: SystemContext): void {
    const currentTick = ctx.tick;

    if (currentTick - this.lastUpdate < this.config.updateInterval) {
      return;
    }

    this.lastUpdate = currentTick;

    // Process active events
    this.processEvents(ctx.world, currentTick);
  }

  /**
   * Trigger a mass event
   */
  triggerEvent(
    deityId: string,
    world: World,
    type: MassEventType,
    name: string,
    target: EventTarget,
    duration: number = 2400, // ~2 minutes default
    intensity: number = 1.0,
    purpose?: EventPurpose
  ): MassEvent | null {
    // Find deity
    const deityEntity = world.getEntity(deityId);
    if (!deityEntity) return null;

    const deity = deityEntity.components.get(CT.Deity) as DeityComponent | undefined;
    if (!deity) return null;

    // Calculate cost
    const cost = this.calculateEventCost(type, target, duration, intensity);

    // Check belief
    if (!deity.spendBelief(cost)) {
      return null;
    }

    // Find affected entities
    const affected = this.findAffectedEntities(world, deityId, target);

    // Create event
    const event: MassEvent = {
      id: `mass_event_${Date.now()}`,
      deityId,
      type,
      name,
      triggeredAt: world.tick,
      duration,
      cost,
      target,
      affectedEntities: affected.map(e => e.id),
      intensity,
      purpose,
      status: 'pending',
    };

    this.massEvents.set(event.id, event);

    // Start event execution
    this.executeEvent(world, event);

    return event;
  }

  /**
   * Calculate event cost
   */
  private calculateEventCost(
    type: MassEventType,
    target: EventTarget,
    duration: number,
    intensity: number
  ): number {
    const baseCost = this.config.eventCosts[type];

    // Scale by target scope
    let scopeMultiplier = 1.0;
    switch (target) {
      case 'all_mortals':
        scopeMultiplier = 3.0;
        break;
      case 'all_believers':
        scopeMultiplier = 1.5;
        break;
      case 'specific_group':
      case 'geographic_area':
        scopeMultiplier = 1.2;
        break;
      case 'rival_believers':
        scopeMultiplier = 2.0;
        break;
    }

    // Scale by duration
    const durationMultiplier = 1 + (duration / 2400) * 0.5;

    // Scale by intensity
    const totalCost = baseCost * scopeMultiplier * durationMultiplier * intensity;

    return Math.floor(totalCost);
  }

  /**
   * Find entities affected by event
   */
  private findAffectedEntities(
    world: World,
    deityId: string,
    target: EventTarget
  ): Array<{ id: string }> {
    const affected: Array<{ id: string }> = [];

    for (const entity of world.entities.values()) {
      let shouldAffect = false;

      switch (target) {
        case 'all_believers':
          // Only deity's believers
          if (entity.components.has(CT.Spiritual)) {
            const spiritual = entity.components.get(CT.Spiritual) as SpiritualComponent | undefined;
            shouldAffect = spiritual?.believedDeity === deityId;
          }
          break;

        case 'all_mortals':
          // All agents
          shouldAffect = entity.components.has(CT.Agent);
          break;

        case 'specific_group':
        case 'geographic_area':
          // In full implementation, would use group/location criteria
          shouldAffect = false;
          break;

        case 'rival_believers':
          // Believers of other deities
          if (entity.components.has(CT.Spiritual)) {
            const spiritual = entity.components.get(CT.Spiritual) as SpiritualComponent | undefined;
            shouldAffect = spiritual?.believedDeity !== deityId && spiritual?.believedDeity !== undefined;
          }
          break;
      }

      if (shouldAffect) {
        affected.push({ id: entity.id });
      }
    }

    return affected;
  }

  /**
   * Execute event effects
   */
  private executeEvent(world: World, event: MassEvent): void {
    event.status = 'active';

    const results: EventResults = {
      entitiesAffected: event.affectedEntities.length,
      beliefGenerated: 0,
      believersGained: 0,
      believersLost: 0,
      mortality: 0,
      faithChanges: [],
    };

    // Apply effects based on event type
    switch (event.type) {
      case 'divine_blessing':
        results.beliefGenerated = this.applyDivineBlessing(world, event);
        break;

      case 'mass_healing':
        results.beliefGenerated = this.applyMassHealing(world, event);
        break;

      case 'plague':
        results.mortality = this.applyPlague(world, event);
        break;

      case 'revelation':
        results.believersGained = this.applyRevelation(world, event);
        break;

      case 'festival':
        results.beliefGenerated = this.applyFestival(world, event);
        break;

      case 'divine_judgment':
        results.faithChanges = this.applyDivineJudgment(world, event);
        break;

      default:
        break;
    }

    event.results = results;

    // Emit mass event triggered
    this.events.emitGeneric('mass_event_triggered', {
      eventId: event.id,
      deityId: event.deityId,
      eventType: event.type,
      target: event.target,
      affectedCount: event.affectedEntities.length,
      intensity: event.intensity,
    });
  }

  /**
   * Apply divine blessing effects
   */
  private applyDivineBlessing(world: World, event: MassEvent): number {
    let beliefGenerated = 0;

    for (const entityId of event.affectedEntities) {
      const entity = world.getEntity(entityId);
      if (!entity) continue;

      const spiritual = entity.components.get(CT.Spiritual) as SpiritualComponent | undefined;
      if (!spiritual) continue;

      // Increase faith
      spiritual.faith = Math.min(1, spiritual.faith + 0.1 * event.intensity);

      // Generate belief
      beliefGenerated += 10 * event.intensity;
    }

    return beliefGenerated;
  }

  /**
   * Apply mass healing
   */
  private applyMassHealing(world: World, event: MassEvent): number {
    let beliefGenerated = 0;

    for (const entityId of event.affectedEntities) {
      const entity = world.getEntity(entityId);
      if (!entity) continue;

      // In full implementation, would heal health component
      // For now, just generate belief

      beliefGenerated += 20 * event.intensity;
    }

    return beliefGenerated;
  }

  /**
   * Apply plague effects
   */
  private applyPlague(_world: World, event: MassEvent): number {
    // Simulate mortality rate
    const mortalityRate = 0.1 * event.intensity; // 10% at full intensity

    const casualties = Math.floor(event.affectedEntities.length * mortalityRate);

    // In full implementation, would actually remove/damage entities

    return casualties;
  }

  /**
   * Apply revelation effects
   */
  private applyRevelation(world: World, event: MassEvent): number {
    let conversions = 0;

    for (const entityId of event.affectedEntities) {
      const entity = world.getEntity(entityId);
      if (!entity) continue;

      const spiritual = entity.components.get(CT.Spiritual) as SpiritualComponent | undefined;
      if (!spiritual) continue;

      // Chance to convert based on intensity
      if (Math.random() < 0.2 * event.intensity) {
        // In full implementation, would change deity allegiance
        conversions++;
      }
    }

    return conversions;
  }

  /**
   * Apply festival effects
   */
  private applyFestival(world: World, event: MassEvent): number {
    let beliefGenerated = 0;

    for (const entityId of event.affectedEntities) {
      const entity = world.getEntity(entityId);
      if (!entity) continue;

      // Generate joy and belief
      beliefGenerated += 15 * event.intensity;
    }

    return beliefGenerated;
  }

  /**
   * Apply divine judgment
   */
  private applyDivineJudgment(
    world: World,
    event: MassEvent
  ): Array<{ entityId: string; change: number }> {
    const changes: Array<{ entityId: string; change: number }> = [];

    for (const entityId of event.affectedEntities) {
      const entity = world.getEntity(entityId);
      if (!entity) continue;

      const spiritual = entity.components.get(CT.Spiritual) as SpiritualComponent | undefined;
      if (!spiritual) continue;

      // Evaluate based on current faith
      const change = spiritual.faith > 0.7 ? 0.1 : -0.1;
      spiritual.faith = Math.max(0, Math.min(1, spiritual.faith + change));

      changes.push({ entityId, change });
    }

    return changes;
  }

  /**
   * Process active events
   */
  private processEvents(_world: World, currentTick: number): void {
    for (const event of this.massEvents.values()) {
      if (event.status !== 'active') continue;

      // Check if event should end
      const elapsed = currentTick - event.triggeredAt;

      if (elapsed >= event.duration) {
        event.status = 'completed';

        // Emit mass event completed
        this.events.emitGeneric('mass_event_completed', {
          eventId: event.id,
          deityId: event.deityId,
          eventType: event.type,
          results: event.results,
        });
      }
    }
  }

  /**
   * Get event
   */
  getEvent(eventId: string): MassEvent | undefined {
    return this.massEvents.get(eventId);
  }

  /**
   * Get all events by a deity
   */
  getEventsBy(deityId: string): MassEvent[] {
    return Array.from(this.massEvents.values())
      .filter(e => e.deityId === deityId);
  }

  /**
   * Get active events
   */
  getActiveEvents(): MassEvent[] {
    return Array.from(this.massEvents.values())
      .filter(e => e.status === 'active');
  }
}
