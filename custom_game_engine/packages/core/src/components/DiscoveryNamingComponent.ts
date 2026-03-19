import { ComponentBase } from '../ecs/Component.js';
import type { Tick } from '../types.js';

/**
 * Category of nameable world-first discovery.
 */
export type DiscoveryCategory =
  | 'first_settlement'
  | 'first_deity'
  | 'first_death'
  | 'first_building'
  | 'first_disaster'
  | 'first_magic'
  | 'first_legend'
  | 'first_consciousness';

/**
 * A player-named discovery.
 */
export interface NamedDiscovery {
  /** Discovery category */
  readonly category: DiscoveryCategory;
  /** Player-given name */
  readonly name: string;
  /** Default/auto-generated description */
  readonly description: string;
  /** Tick when the event occurred */
  readonly eventTick: Tick;
  /** Tick when the player named it */
  readonly namedAtTick: Tick;
  /** Day when the event occurred */
  readonly eventDay: number;
  /** Related entity IDs */
  readonly entityIds: string[];
}

/** Human-readable labels for each category */
export const DISCOVERY_CATEGORY_LABELS: Record<DiscoveryCategory, string> = {
  first_settlement: 'First Settlement',
  first_deity: 'First Deity',
  first_death: 'First Death',
  first_building: 'First Building',
  first_disaster: 'First Catastrophe',
  first_magic: 'First Spell',
  first_legend: 'First Legend',
  first_consciousness: 'First Awakening',
};

/** Prompt text shown to the player for each category */
export const DISCOVERY_NAMING_PROMPTS: Record<DiscoveryCategory, string> = {
  first_settlement: 'A settlement has been founded — the first mark of civilization in this world. What shall it be called?',
  first_deity: 'A divine being has emerged from the beliefs of your people. Name this deity for the ages.',
  first_death: 'The first soul has departed this world. Name this moment of passing.',
  first_building: 'The first structure rises from the earth. What shall this achievement be remembered as?',
  first_disaster: 'Catastrophe has struck for the first time. Name this dark chapter.',
  first_magic: 'The first spell has been woven into reality. Name this magical awakening.',
  first_legend: 'A legend has been born among your people. Name this tale for posterity.',
  first_consciousness: 'A new consciousness has awakened. Name this moment of becoming.',
};

/**
 * DiscoveryNamingComponent
 *
 * World-level singleton registry of player-named discoveries (world firsts).
 * Tracks which milestone events have been named by the player.
 * Persists through save/load via generic serializer (plain data).
 */
export class DiscoveryNamingComponent extends ComponentBase {
  public readonly type = 'discovery_naming';

  /** Named discoveries by category */
  discoveries: Map<DiscoveryCategory, NamedDiscovery> = new Map();

  /** Categories pending player naming (event occurred, awaiting input) */
  pendingNaming: Map<DiscoveryCategory, {
    description: string;
    eventTick: Tick;
    eventDay: number;
    entityIds: string[];
  }> = new Map();

  /**
   * Check if a category has been named.
   */
  isNamed(category: DiscoveryCategory): boolean {
    return this.discoveries.has(category);
  }

  /**
   * Check if a category has a pending naming prompt.
   */
  isPending(category: DiscoveryCategory): boolean {
    return this.pendingNaming.has(category);
  }

  /**
   * Queue a discovery for player naming.
   */
  queueForNaming(
    category: DiscoveryCategory,
    description: string,
    eventTick: Tick,
    eventDay: number,
    entityIds: string[] = []
  ): void {
    if (this.isNamed(category) || this.isPending(category)) return;
    this.pendingNaming.set(category, { description, eventTick, eventDay, entityIds });
  }

  /**
   * Apply a player-given name to a pending discovery.
   */
  nameDiscovery(
    category: DiscoveryCategory,
    name: string,
    namedAtTick: Tick
  ): NamedDiscovery | null {
    const pending = this.pendingNaming.get(category);
    if (!pending) return null;

    const discovery: NamedDiscovery = {
      category,
      name,
      description: pending.description,
      eventTick: pending.eventTick,
      namedAtTick,
      eventDay: pending.eventDay,
      entityIds: pending.entityIds,
    };

    this.discoveries.set(category, discovery);
    this.pendingNaming.delete(category);
    return discovery;
  }

  /**
   * Get all named discoveries.
   */
  getAllDiscoveries(): NamedDiscovery[] {
    return Array.from(this.discoveries.values());
  }

  /**
   * Get a specific named discovery.
   */
  getDiscovery(category: DiscoveryCategory): NamedDiscovery | undefined {
    return this.discoveries.get(category);
  }

  /**
   * Get the next pending discovery (oldest first).
   */
  getNextPending(): { category: DiscoveryCategory; description: string; eventTick: Tick; eventDay: number; entityIds: string[] } | null {
    const first = this.pendingNaming.entries().next();
    if (first.done) return null;
    return { category: first.value[0], ...first.value[1] };
  }
}

export function createDiscoveryNamingComponent(): DiscoveryNamingComponent {
  return new DiscoveryNamingComponent();
}
