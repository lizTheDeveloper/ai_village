/**
 * EighthChildDetectorSystem - Detects "presence-over-power" behavioral patterns
 *
 * The "eighth child" pattern describes a player who nurtures, witnesses, and
 * partners with the world rather than extracting, controlling, or intervening.
 *
 * Detection:
 *   presence_ratio = presence_actions / (presence_actions + power_actions)
 *
 * When presence_ratio > 0.67 is sustained over a rolling 60-tick window AND
 * at least 2 distinct presence categories appear, emit `eighth_child_moment`.
 *
 * Priority: 855 (utility tier 850–899)
 * Throttle: 20 ticks (1 second at 20 TPS)
 */

import { BaseSystem } from '../ecs/SystemContext.js';
import type { SystemContext } from '../ecs/SystemContext.js';
import type { WorldMutator } from '../ecs/World.js';
import type { EventBus } from '../events/EventBus.js';
import type { SystemId, ComponentType } from '../types.js';
import { EntityImpl } from '../ecs/Entity.js';

// ============================================================================
// Internal Types
// ============================================================================

interface ActionRecord {
  tick: number;
  classification: 'presence' | 'power';
  category: string;
}

interface CompanionInteractionData {
  type?: string;
  [key: string]: unknown;
}

// ============================================================================
// Classification Tables
// ============================================================================

/**
 * Straight event-type → classification mappings (no payload inspection needed).
 */
const PRESENCE_EVENTS: ReadonlyMap<string, string> = new Map([
  ['hand:speak',      'aria_partnership'],
  ['hand:pet',        'species_preservation'],
  ['hand:carry',      'species_preservation'],
  ['action:water',    'species_preservation'],
  ['action:plant',    'species_preservation'],
  ['action:fertilize','species_preservation'],
  ['animal_tamed',    'witness_civilizational'],
]);

const POWER_EVENTS: ReadonlyMap<string, string> = new Map([
  ['hand:slap',                          'species_exploitation'],
  ['action:harvest',                     'species_exploitation'],
  ['action:demolish',                    'outcome_intervention'],
  ['action:assign_worker',               'outcome_intervention'],
  ['action:set_priority',                'outcome_intervention'],
  ['civilization:resource_extracted',    'species_exploitation'],
  ['exploration:mining_operation_started','species_exploitation'],
]);

// ============================================================================
// Constants
// ============================================================================

const WINDOW_TICKS = 60;
const PRESENCE_RATIO_THRESHOLD = 0.67;
const MIN_ACTIONS_FOR_DETECTION = 3;
const MIN_DISTINCT_PRESENCE_CATEGORIES = 2;

// ============================================================================
// EighthChildDetectorSystem
// ============================================================================

export class EighthChildDetectorSystem extends BaseSystem {
  public readonly id: SystemId = 'eighth_child_detector' as const;
  public readonly priority: number = 855;
  public readonly requiredComponents: ReadonlyArray<ComponentType> = [] as const;

  protected readonly throttleInterval: number = 20;
  protected readonly skipSimulationFiltering: boolean = true;

  private actionWindow: ActionRecord[] = [];

  // ============================================================================
  // Initialization — subscribe to all tracked events
  // ============================================================================

  protected onInitialize(_world: WorldMutator, _eventBus: EventBus): void {
    // Presence: simple event-type mappings
    for (const [eventType, category] of PRESENCE_EVENTS) {
      this.events.onGeneric(eventType, () => {
        this.recordAction('presence', category);
      });
    }

    // Power: simple event-type mappings
    for (const [eventType, category] of POWER_EVENTS) {
      this.events.onGeneric(eventType, () => {
        this.recordAction('power', category);
      });
    }

    // companion:interaction — classification depends on payload 'type' field
    this.events.onGeneric('companion:interaction', (data: unknown) => {
      const interaction = data as CompanionInteractionData;
      const interactionType = interaction?.type;

      if (
        interactionType === 'talk' ||
        interactionType === 'play' ||
        interactionType === 'pet' ||
        interactionType === 'feed'
      ) {
        this.recordAction('presence', 'aria_partnership');
      } else if (interactionType === 'command') {
        this.recordAction('power', 'aria_delegation');
      }
      // Unknown interaction types are silently ignored — no data means no signal
    });
  }

  // ============================================================================
  // Update — prune window and check ratio
  // ============================================================================

  protected onUpdate(ctx: SystemContext): void {
    const currentTick = ctx.tick;

    // 0. Expire stale eighth_child_insight components (MUL-4527)
    this.expireInsights(ctx, currentTick);

    // 1. Prune actions older than the rolling window
    const cutoff = currentTick - WINDOW_TICKS;
    this.actionWindow = this.actionWindow.filter((r) => r.tick > cutoff);

    const total = this.actionWindow.length;

    // 2. Not enough data — skip
    if (total < MIN_ACTIONS_FOR_DETECTION) {
      return;
    }

    // 3. Count presence vs power
    let presenceCount = 0;
    const presenceCategories = new Set<string>();

    for (const record of this.actionWindow) {
      if (record.classification === 'presence') {
        presenceCount++;
        presenceCategories.add(record.category);
      }
    }

    const presenceRatio = presenceCount / total;

    // 4. Check thresholds
    if (
      presenceRatio > PRESENCE_RATIO_THRESHOLD &&
      presenceCategories.size >= MIN_DISTINCT_PRESENCE_CATEGORIES
    ) {
      this.events.emitGeneric('eighth_child_moment', {
        presenceRatio,
        windowTicks: WINDOW_TICKS,
        timestamp: currentTick,
        activeCategories: Array.from(presenceCategories),
      });
    }
  }

  // ============================================================================
  // Private helpers
  // ============================================================================

  private expireInsights(ctx: SystemContext, currentTick: number): void {
    const agents = ctx.world.query().with('agent' as ComponentType).executeEntities();
    for (const agent of agents) {
      if (!agent.hasComponent('eighth_child_insight' as ComponentType)) continue;
      const insight = agent.getComponent<any>('eighth_child_insight' as ComponentType);
      if (insight && typeof insight.expiresAt === 'number' && currentTick >= insight.expiresAt) {
        (agent as EntityImpl).removeComponent('eighth_child_insight' as ComponentType);
      }
    }
  }

  private recordAction(classification: 'presence' | 'power', category: string): void {
    // world.tick is available via this.world (set by BaseSystem.initialize)
    const tick = this.world?.tick ?? 0;
    this.actionWindow.push({ tick, classification, category });
  }
}
