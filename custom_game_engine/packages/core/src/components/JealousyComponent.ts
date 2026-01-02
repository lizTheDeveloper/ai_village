/**
 * JealousyComponent - Tracks jealousy triggers for romantic competition
 *
 * NOT ALL SPECIES/INDIVIDUALS EXPERIENCE JEALOUSY:
 * - Some species are naturally polyamorous (no jealousy)
 * - Some species have hive/collective bonding (no individual jealousy)
 * - Within jealousy-capable species, individuals vary in jealousy intensity
 *
 * Jealousy is determined by:
 * 1. Species mating paradigm (can this species feel jealousy?)
 * 2. Individual variation (jealousyIntensity field in SexualityComponent)
 * 3. Personality.neuroticism (modulates response intensity)
 *
 * Types of jealousy:
 * - Ex-lover's new partner (they moved on)
 * - Current mate's infidelity (showing affection to others)
 * - Rival affection (someone courting my desired person)
 * - Mate attention (competing for a lover's attention)
 */

import { ComponentBase } from '../ecs/Component.js';
import type { EntityId, Tick } from '../types.js';

/**
 * Type of jealousy trigger
 */
export type JealousyType =
  | 'rival_affection'      // Someone else is courting my desired person
  | 'mate_infidelity'      // My current mate shows affection to another
  | 'ex_moved_on'          // My ex-lover has a new partner
  | 'mate_attention';      // Competing for my mate's attention with someone

/**
 * A detected jealousy situation
 */
export interface JealousyTrigger {
  /** Type of jealousy */
  type: JealousyType;

  /** The person I'm jealous OF (the rival) */
  rivalId: EntityId;

  /** The person I want/love (object of desire or current mate) */
  desiredId: EntityId;

  /** Intensity of jealousy (0-1, based on personality.neuroticism) */
  intensity: number;

  /** When this jealousy was first detected */
  discoveredAt: Tick;

  /** Has this been resolved? (rival defeated, gave up, etc.) */
  resolved: boolean;

  /** Optional: reason for resolution */
  resolutionReason?: string;

  /** Optional: notes/context */
  notes?: string;
}

/**
 * Component tracking an agent's jealousy triggers
 */
export class JealousyComponent extends ComponentBase {
  public readonly type = 'jealousy';

  /** Active jealousy situations */
  public activeJealousies: JealousyTrigger[] = [];

  /** Resolved jealousies (for memory/narrative) */
  public resolvedJealousies: JealousyTrigger[] = [];

  constructor() {
    super();
  }

  /**
   * Add a new jealousy trigger
   */
  addJealousy(trigger: Omit<JealousyTrigger, 'resolved'>): void {
    // Check if this exact jealousy already exists
    const exists = this.activeJealousies.some(
      j => j.type === trigger.type &&
           j.rivalId === trigger.rivalId &&
           j.desiredId === trigger.desiredId
    );

    if (!exists) {
      this.activeJealousies.push({
        ...trigger,
        resolved: false,
      });
    }
  }

  /**
   * Resolve a jealousy trigger
   */
  resolveJealousy(rivalId: EntityId, reason: string): void {
    const index = this.activeJealousies.findIndex(j => j.rivalId === rivalId);
    if (index >= 0) {
      const jealousy = this.activeJealousies[index]!;
      jealousy.resolved = true;
      jealousy.resolutionReason = reason;

      this.resolvedJealousies.push(jealousy);
      this.activeJealousies.splice(index, 1);
    }
  }

  /**
   * Get strongest active jealousy (highest intensity)
   */
  getStrongestJealousy(): JealousyTrigger | null {
    if (this.activeJealousies.length === 0) return null;

    return this.activeJealousies.reduce((strongest, current) =>
      current.intensity > strongest.intensity ? current : strongest
    );
  }

  /**
   * Check if jealous of a specific rival
   */
  isJealousOf(rivalId: EntityId): boolean {
    return this.activeJealousies.some(j => j.rivalId === rivalId);
  }

  /**
   * Get all jealousies about a specific desired person
   */
  getJealousiesAbout(desiredId: EntityId): JealousyTrigger[] {
    return this.activeJealousies.filter(j => j.desiredId === desiredId);
  }

  clone(): JealousyComponent {
    const cloned = new JealousyComponent();
    cloned.activeJealousies = this.activeJealousies.map(j => ({ ...j }));
    cloned.resolvedJealousies = this.resolvedJealousies.map(j => ({ ...j }));
    return cloned;
  }
}

/**
 * Create a new JealousyComponent
 */
export function createJealousyComponent(): JealousyComponent {
  return new JealousyComponent();
}
