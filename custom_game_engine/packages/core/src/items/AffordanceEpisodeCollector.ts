/**
 * AffordanceEpisodeCollector — captures item interaction episodes for affordance network training.
 *
 * Records which items were crafted/used together and derives a reward signal
 * from how much the agent's needs improved after the interaction.
 *
 * Reward signal (Steps 4–5 from MUL-299):
 *   - Cooking/crafting completes → snapshot needs before/after
 *   - Reward = weighted sum of need improvements (hunger↑, energy↑, social↑)
 *   - Episodes feed AffordanceNetwork.recordEpisode() for online learning
 *
 * Usage:
 *   const collector = new AffordanceEpisodeCollector(network);
 *   collector.setEnabled(true);
 *   // Then call recordCraftingEpisode() from CraftBehavior/FarmBehaviors
 */

import type { AffordanceNetwork, InteractionEpisode } from './AffordanceNetwork.js';

/** Snapshot of agent needs used to compute reward deltas. */
export interface NeedsSnapshot {
  /** 0–1; higher = more satisfied (not hungry) */
  hunger: number;
  /** 0–1; higher = more rested */
  energy: number;
  /** 0–1; higher = more socially satisfied */
  social: number;
}

/** A recorded item interaction episode (for persistence / analysis). */
export interface RecordedEpisode {
  id: string;
  timestamp: number;
  agentId: string;
  itemIdA: string;
  itemIdB: string;
  needsBefore: NeedsSnapshot;
  needsAfter: NeedsSnapshot;
  reward: number;
  networkScoreBefore: number;
}

/**
 * Compute a reward in [-1, 1] from the delta between two needs snapshots.
 *
 * Positive reward when:
 *   - hunger increases (agent felt less hungry)
 *   - energy increases (agent felt less tired)
 *   - social increases (social need improved)
 *
 * Negative reward when those needs drop (item was harmful/useless).
 */
export function computeNeedsReward(before: NeedsSnapshot, after: NeedsSnapshot): number {
  const hungerDelta  = after.hunger  - before.hunger;
  const energyDelta  = after.energy  - before.energy;
  const socialDelta  = after.social  - before.social;

  // Weighted sum — hunger improvement is most important
  const raw = hungerDelta * 0.6 + energyDelta * 0.3 + socialDelta * 0.1;

  // Clamp to [-1, 1]
  return Math.max(-1, Math.min(1, raw));
}

export class AffordanceEpisodeCollector {
  private enabled = false;
  private episodes: RecordedEpisode[] = [];
  private counter = 0;
  /** Max episodes before auto-flush */
  private readonly maxBuffer: number;

  constructor(
    private readonly network: AffordanceNetwork,
    options: { maxBuffer?: number } = {},
  ) {
    this.maxBuffer = options.maxBuffer ?? 200;
  }

  setEnabled(on: boolean): void {
    this.enabled = on;
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  get bufferedCount(): number {
    return this.episodes.length;
  }

  /**
   * Record a crafting episode: two input items were combined to produce a result.
   *
   * Call this when CraftBehavior completes: pass in the two primary ingredients,
   * the agent's needs snapshot before the crafting started, and the snapshot after
   * the item was delivered to their inventory.
   *
   * @param agentId     Entity ID of the crafting agent
   * @param itemIdA     First ingredient item ID
   * @param itemIdB     Second ingredient item ID
   * @param needsBefore Needs snapshot taken before craft started
   * @param needsAfter  Needs snapshot taken after craft delivered
   */
  recordCraftingEpisode(
    agentId: string,
    itemIdA: string,
    itemIdB: string,
    needsBefore: NeedsSnapshot,
    needsAfter: NeedsSnapshot,
  ): void {
    if (!this.enabled) return;

    const reward = computeNeedsReward(needsBefore, needsAfter);
    const networkScoreBefore = this.network.scoreCompatibility(itemIdA, itemIdB);

    const episode: RecordedEpisode = {
      id: `aep_${++this.counter}_${Date.now()}`,
      timestamp: Date.now(),
      agentId,
      itemIdA,
      itemIdB,
      needsBefore,
      needsAfter,
      reward,
      networkScoreBefore,
    };

    this.episodes.push(episode);

    // Online learning: teach the network from this episode
    const interaction: InteractionEpisode = {
      itemA: itemIdA,
      itemB: itemIdB,
      reward,
    };
    this.network.recordEpisode(interaction);

    if (this.episodes.length >= this.maxBuffer) {
      this.flush();
    }
  }

  /**
   * Record a cooking episode: food item was consumed, improving agent hunger.
   *
   * The cooking case is simpler — itemIdB is the cooking station or fuel.
   * If only one item is relevant, pass the same id for both.
   */
  recordCookingEpisode(
    agentId: string,
    foodItemId: string,
    needsBefore: NeedsSnapshot,
    needsAfter: NeedsSnapshot,
  ): void {
    // For cooking, treat food item paired with itself (single-item operation)
    this.recordCraftingEpisode(agentId, foodItemId, foodItemId, needsBefore, needsAfter);
  }

  /**
   * Export episodes as a plain array for offline analysis or persistence.
   */
  exportEpisodes(): RecordedEpisode[] {
    return this.episodes.slice();
  }

  /**
   * Clear the episode buffer (does not affect trained weights).
   */
  flush(): void {
    this.episodes = [];
  }
}

/** Global singleton episode collector. Set network via init(). */
let _globalCollector: AffordanceEpisodeCollector | null = null;

/**
 * Initialize the global episode collector with the shared affordance network.
 * Call once at startup (e.g., from registerAllSystems).
 */
export function initAffordanceEpisodeCollector(
  network: AffordanceNetwork,
  options?: { maxBuffer?: number; enabled?: boolean },
): AffordanceEpisodeCollector {
  _globalCollector = new AffordanceEpisodeCollector(network, options);
  if (options?.enabled) {
    _globalCollector.setEnabled(true);
  }
  return _globalCollector;
}

/**
 * Get the global episode collector (throws if not initialized).
 */
export function getAffordanceEpisodeCollector(): AffordanceEpisodeCollector {
  if (!_globalCollector) {
    throw new Error(
      'AffordanceEpisodeCollector not initialized. Call initAffordanceEpisodeCollector() first.',
    );
  }
  return _globalCollector;
}

/**
 * Check whether the global collector has been initialized.
 */
export function isAffordanceEpisodeCollectorInitialized(): boolean {
  return _globalCollector !== null;
}
