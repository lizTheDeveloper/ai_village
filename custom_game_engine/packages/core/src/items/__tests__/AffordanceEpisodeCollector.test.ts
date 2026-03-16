import { describe, it, expect, beforeEach } from 'vitest';
import { ItemRegistry } from '../ItemRegistry.js';
import { defineItem } from '../ItemDefinition.js';
import { AffordanceNetwork } from '../AffordanceNetwork.js';
import {
  AffordanceEpisodeCollector,
  computeNeedsReward,
  type NeedsSnapshot,
} from '../AffordanceEpisodeCollector.js';

// ─── Fixtures ─────────────────────────────────────────────────────────────────

function makeRegistry(): ItemRegistry {
  const r = new ItemRegistry();
  r.register(defineItem('berry', 'Berry', 'food', {
    isEdible: true, isGatherable: true, weight: 0.1, stackSize: 100, baseValue: 1, rarity: 'common',
    traits: { edible: { hungerRestored: 20, quality: 40, flavors: ['sweet'], hydrating: true } },
  }));
  r.register(defineItem('bread', 'Bread', 'food', {
    isEdible: true, isStorable: true, weight: 0.5, stackSize: 50, baseValue: 5, rarity: 'common',
    traits: { edible: { hungerRestored: 50, quality: 70, flavors: ['savory'], hydrating: false } },
  }));
  r.register(defineItem('axe', 'Axe', 'tool', {
    isStorable: true, weight: 3.0, stackSize: 1, baseValue: 15, rarity: 'common',
    traits: { tool: { toolType: 'axe', efficiency: 1.5, durabilityLoss: 0.02 } },
  }));
  return r;
}

// ─── computeNeedsReward tests ─────────────────────────────────────────────────

describe('computeNeedsReward', () => {
  it('returns positive reward when hunger improves', () => {
    const before: NeedsSnapshot = { hunger: 0.3, energy: 0.7, social: 0.7 };
    const after:  NeedsSnapshot = { hunger: 0.8, energy: 0.7, social: 0.7 };
    const reward = computeNeedsReward(before, after);
    expect(reward).toBeGreaterThan(0);
  });

  it('returns negative reward when hunger drops', () => {
    const before: NeedsSnapshot = { hunger: 0.8, energy: 0.7, social: 0.7 };
    const after:  NeedsSnapshot = { hunger: 0.3, energy: 0.7, social: 0.7 };
    const reward = computeNeedsReward(before, after);
    expect(reward).toBeLessThan(0);
  });

  it('returns 0 when needs are unchanged', () => {
    const snap: NeedsSnapshot = { hunger: 0.5, energy: 0.5, social: 0.5 };
    expect(computeNeedsReward(snap, snap)).toBeCloseTo(0);
  });

  it('clamps to [-1, 1]', () => {
    const before: NeedsSnapshot = { hunger: 0.0, energy: 0.0, social: 0.0 };
    const after:  NeedsSnapshot = { hunger: 1.0, energy: 1.0, social: 1.0 };
    const reward = computeNeedsReward(before, after);
    expect(reward).toBeLessThanOrEqual(1);
    expect(reward).toBeGreaterThanOrEqual(-1);
  });
});

// ─── AffordanceEpisodeCollector tests ────────────────────────────────────────

describe('AffordanceEpisodeCollector', () => {
  let registry: ItemRegistry;
  let network: AffordanceNetwork;
  let collector: AffordanceEpisodeCollector;

  beforeEach(() => {
    registry  = makeRegistry();
    network   = new AffordanceNetwork(registry);
    collector = new AffordanceEpisodeCollector(network);
  });

  it('is disabled by default and ignores records', () => {
    collector.recordCraftingEpisode('agent1', 'berry', 'bread',
      { hunger: 0.3, energy: 0.7, social: 0.7 },
      { hunger: 0.8, energy: 0.7, social: 0.7 },
    );
    expect(collector.bufferedCount).toBe(0);
  });

  it('records episodes when enabled', () => {
    collector.setEnabled(true);
    collector.recordCraftingEpisode('agent1', 'berry', 'bread',
      { hunger: 0.3, energy: 0.7, social: 0.7 },
      { hunger: 0.8, energy: 0.7, social: 0.7 },
    );
    expect(collector.bufferedCount).toBe(1);
  });

  it('updates network weights after positive episode', () => {
    collector.setEnabled(true);
    const before = network.scoreCompatibility('berry', 'bread');
    collector.recordCraftingEpisode('agent1', 'berry', 'bread',
      { hunger: 0.2, energy: 0.7, social: 0.7 },
      { hunger: 0.9, energy: 0.7, social: 0.7 },
    );
    const after = network.scoreCompatibility('berry', 'bread');
    expect(after).toBeGreaterThan(before);
  });

  it('recordCookingEpisode buffers an episode', () => {
    collector.setEnabled(true);
    collector.recordCookingEpisode('agent1', 'berry',
      { hunger: 0.2, energy: 0.7, social: 0.7 },
      { hunger: 0.8, energy: 0.7, social: 0.7 },
    );
    expect(collector.bufferedCount).toBe(1);
  });

  it('flush clears buffer', () => {
    collector.setEnabled(true);
    collector.recordCraftingEpisode('agent1', 'berry', 'bread',
      { hunger: 0.3, energy: 0.7, social: 0.7 },
      { hunger: 0.8, energy: 0.7, social: 0.7 },
    );
    expect(collector.bufferedCount).toBe(1);
    collector.flush();
    expect(collector.bufferedCount).toBe(0);
  });

  it('auto-flushes when buffer reaches maxBuffer', () => {
    const smallCollector = new AffordanceEpisodeCollector(network, { maxBuffer: 3 });
    smallCollector.setEnabled(true);

    for (let i = 0; i < 3; i++) {
      smallCollector.recordCraftingEpisode('agent1', 'berry', 'axe',
        { hunger: 0.3, energy: 0.7, social: 0.7 },
        { hunger: 0.4, energy: 0.7, social: 0.7 },
      );
    }
    // Should have auto-flushed
    expect(smallCollector.bufferedCount).toBe(0);
  });

  it('exportEpisodes returns a copy', () => {
    collector.setEnabled(true);
    collector.recordCraftingEpisode('agent1', 'berry', 'bread',
      { hunger: 0.3, energy: 0.7, social: 0.7 },
      { hunger: 0.7, energy: 0.7, social: 0.7 },
    );
    const exported = collector.exportEpisodes();
    expect(exported).toHaveLength(1);
    expect(exported[0]!.itemIdA).toBe('berry');
    expect(exported[0]!.itemIdB).toBe('bread');
    expect(typeof exported[0]!.reward).toBe('number');
  });

  it('isEnabled reflects setEnabled calls', () => {
    expect(collector.isEnabled()).toBe(false);
    collector.setEnabled(true);
    expect(collector.isEnabled()).toBe(true);
    collector.setEnabled(false);
    expect(collector.isEnabled()).toBe(false);
  });
});
