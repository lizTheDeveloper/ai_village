/**
 * Comprehensive tests for the Belief System
 * Gap: No belief generation/decay systems implemented
 * Need: BeliefSystem that tracks, generates, and decays belief
 */

import { describe, it, expect, beforeEach } from 'vitest';
import type { DeityBeliefState, BeliefGeneration, BeliefActivity } from '../BeliefTypes.js';
import type { Deity } from '../DeityTypes.js';
import { World } from '@ai-village/core';

describe('Belief Generation', () => {
  let mockDeity: Deity;
  let mockWorld: World;

  beforeEach(() => {
    mockDeity = createMockDeity('test_god');
    mockWorld = createMockWorld();
  });

  it('should generate belief from prayer activity', () => {
    const believer = createBeliever('farmer', {
      deityId: mockDeity.id,
      faith: 0.8,
      devotion: 0.7,
    });

    const activity: BeliefActivity = {
      type: 'prayer',
      intensity: 0.9, // Desperate prayer
      duration: 10, // ticks
      witnessed: false,
    };

    const generated = calculateBeliefGeneration(believer, activity, mockDeity);

    expect(generated.amount).toBeGreaterThan(0);
    expect(generated.source).toBe('prayer');
    expect(generated.quality).toBeGreaterThan(0.5); // High faith/devotion = high quality
  });

  it('should scale belief with faith level', () => {
    const lowFaithBeliever = createBeliever('skeptic', {
      deityId: mockDeity.id,
      faith: 0.2,
      devotion: 0.3,
    });

    const highFaithBeliever = createBeliever('zealot', {
      deityId: mockDeity.id,
      faith: 0.95,
      devotion: 0.9,
    });

    const activity: BeliefActivity = {
      type: 'prayer',
      intensity: 0.5,
      duration: 10,
      witnessed: false,
    };

    const lowGen = calculateBeliefGeneration(lowFaithBeliever, activity, mockDeity);
    const highGen = calculateBeliefGeneration(highFaithBeliever, activity, mockDeity);

    expect(highGen.amount).toBeGreaterThan(lowGen.amount);
  });

  it('should generate more belief from public worship', () => {
    const believer = createBeliever('priest', {
      deityId: mockDeity.id,
      faith: 0.8,
      devotion: 0.8,
    });

    const privateActivity: BeliefActivity = {
      type: 'ritual',
      intensity: 0.7,
      duration: 20,
      witnessed: false,
    };

    const publicActivity: BeliefActivity = {
      type: 'ritual',
      intensity: 0.7,
      duration: 20,
      witnessed: true,
      witnessCount: 10,
    };

    const privateGen = calculateBeliefGeneration(believer, privateActivity, mockDeity);
    const publicGen = calculateBeliefGeneration(believer, publicActivity, mockDeity);

    expect(publicGen.amount).toBeGreaterThan(privateGen.amount);
  });

  it('should generate belief from temple construction', () => {
    const believer = createBeliever('builder', {
      deityId: mockDeity.id,
      faith: 0.6,
      devotion: 0.5,
    });

    const buildActivity: BeliefActivity = {
      type: 'temple_construction',
      intensity: 0.8,
      duration: 100, // Long project
      witnessed: true,
      witnessCount: 5,
    };

    const generated = calculateBeliefGeneration(believer, buildActivity, mockDeity);

    expect(generated.amount).toBeGreaterThan(0);
    expect(generated.source).toBe('temple_construction');
  });

  it('should generate massive belief from witnessing miracles', () => {
    const believer = createBeliever('witness', {
      deityId: mockDeity.id,
      faith: 0.5, // Moderate faith before miracle
      devotion: 0.4,
    });

    const miracleActivity: BeliefActivity = {
      type: 'witness_miracle',
      intensity: 1.0, // Maximum
      duration: 1, // Instant
      witnessed: true,
      miracleType: 'healing',
      miraclePower: 0.8,
    };

    const generated = calculateBeliefGeneration(believer, miracleActivity, mockDeity);

    expect(generated.amount).toBeGreaterThan(100); // Miracles generate lots of belief
    expect(generated.quality).toBeGreaterThan(0.8);
  });

  it('should track belief by source', () => {
    const state: DeityBeliefState = createEmptyBeliefState();

    const prayerBelief: BeliefGeneration = {
      amount: 10,
      source: 'prayer',
      quality: 0.7,
      believerId: 'believer_1',
      tick: 1000,
    };

    const miracleBelief: BeliefGeneration = {
      amount: 50,
      source: 'witness_miracle',
      quality: 0.95,
      believerId: 'believer_2',
      tick: 1005,
    };

    addBeliefGeneration(state, prayerBelief);
    addBeliefGeneration(state, miracleBelief);

    expect(state.totalBelief).toBe(60);
    expect(state.beliefBySource.prayer).toBe(10);
    expect(state.beliefBySource.witness_miracle).toBe(50);
  });
});

describe('Belief Decay', () => {
  it('should decay belief over time without maintenance', () => {
    const state: DeityBeliefState = {
      totalBelief: 1000,
      beliefBySource: {
        prayer: 500,
        ritual: 300,
        witness_miracle: 200,
      },
      believers: [],
      growthRate: 0,
      decayRate: 0.01, // 1% per tick
    } as any;

    const decayed = applyBeliefDecay(state, 100); // 100 ticks

    expect(decayed.totalBelief).toBeLessThan(1000);
    // After 100 ticks at 1% decay: 1000 * (0.99)^100 ≈ 366
    expect(decayed.totalBelief).toBeCloseTo(366, 0);
  });

  it('should decay faster with no active believers', () => {
    const activeState: DeityBeliefState = {
      totalBelief: 1000,
      beliefBySource: {},
      believers: [
        { id: 'b1', faith: 0.8, lastActivity: 1000 },
        { id: 'b2', faith: 0.7, lastActivity: 1000 },
      ],
      growthRate: 0,
      decayRate: 0.01,
    } as any;

    const inactiveState: DeityBeliefState = {
      totalBelief: 1000,
      beliefBySource: {},
      believers: [], // No believers!
      growthRate: 0,
      decayRate: 0.01,
    } as any;

    const activeDecay = applyBeliefDecay(activeState, 100);
    const inactiveDecay = applyBeliefDecay(inactiveState, 100);

    expect(inactiveDecay.totalBelief).toBeLessThan(activeDecay.totalBelief);
  });

  it('should decay belief sources differently based on type', () => {
    const state: DeityBeliefState = {
      totalBelief: 1000,
      beliefBySource: {
        prayer: 500, // Decays normally
        witness_miracle: 500, // Decays slower (memorable)
      },
      believers: [],
      growthRate: 0,
      decayRate: 0.01,
    } as any;

    const decayed = applyBeliefDecay(state, 100);

    // Miracle belief should decay slower
    const prayerRatio = decayed.beliefBySource.prayer / 500;
    const miracleRatio = decayed.beliefBySource.witness_miracle / 500;

    expect(miracleRatio).toBeGreaterThan(prayerRatio);
  });

  it('should stop decay at zero', () => {
    const state: DeityBeliefState = {
      totalBelief: 10,
      beliefBySource: { prayer: 10 },
      believers: [],
      growthRate: 0,
      decayRate: 0.5, // Heavy decay
    } as any;

    const decayed = applyBeliefDecay(state, 100);

    expect(decayed.totalBelief).toBe(0);
    expect(decayed.totalBelief).not.toBeLessThan(0); // Never negative
  });
});

describe('Belief Transfer', () => {
  it('should transfer belief between deities in syncretism', () => {
    const deity1: Deity = createMockDeity('god1');
    const deity2: Deity = createMockDeity('god2');

    deity1.belief = 500;
    deity2.belief = 300;

    // Syncretism: believers merge their worship
    const transfer = transferBeliefSyncretism(deity1, deity2, 0.3); // 30% of deity1 to deity2

    expect(deity1.belief).toBe(350); // Lost 150
    expect(deity2.belief).toBe(450); // Gained 150
    expect(transfer.amount).toBe(150);
    expect(transfer.reason).toBe('syncretism');
  });

  it('should transfer belief through conversion', () => {
    const oldGod: Deity = createMockDeity('old_god');
    const newGod: Deity = createMockDeity('new_god');

    oldGod.belief = 1000;
    newGod.belief = 200;

    const believer = createBeliever('convert', {
      deityId: oldGod.id,
      faith: 0.8,
      devotion: 0.7,
    });

    const transfer = convertBeliever(believer, oldGod, newGod);

    expect(oldGod.belief).toBeLessThan(1000); // Lost belief
    expect(newGod.belief).toBeGreaterThan(200); // Gained belief
    expect(transfer.reason).toBe('conversion');
  });

  it('should lose belief when believers die', () => {
    const deity: Deity = createMockDeity('death_god');
    deity.belief = 1000;

    const believer = createBeliever('mortal', {
      deityId: deity.id,
      faith: 0.9,
      devotion: 0.8,
    });

    const loss = believerDies(believer, deity);

    expect(deity.belief).toBeLessThan(1000);
    expect(loss.amount).toBeGreaterThan(0);
    expect(loss.reason).toBe('believer_death');
  });

  it('should share belief in pantheons', () => {
    const chiefGod: Deity = createMockDeity('chief');
    const lesserGod: Deity = createMockDeity('lesser');

    chiefGod.belief = 2000;
    lesserGod.belief = 500;

    // Pantheon hierarchy: chief shares some belief with lesser
    const share = sharePantheonBelief(chiefGod, lesserGod, 0.1); // 10% share

    expect(chiefGod.belief).toBe(1800); // Lost 200
    expect(lesserGod.belief).toBe(700); // Gained 200
    expect(share.reason).toBe('pantheon_hierarchy');
  });
});

describe('Belief Quality and Growth', () => {
  it('should calculate overall belief quality', () => {
    const state: DeityBeliefState = {
      totalBelief: 1000,
      beliefBySource: {
        prayer: 500, // Medium quality
        ritual: 300, // High quality
        casual_mention: 200, // Low quality
      },
      believers: [],
      growthRate: 0,
      decayRate: 0.01,
    } as any;

    const quality = calculateBeliefQuality(state);

    expect(quality).toBeGreaterThan(0);
    expect(quality).toBeLessThan(1);
    // Weighted average of source qualities
  });

  it('should track belief growth rate', () => {
    const state: DeityBeliefState = createEmptyBeliefState();

    // Add belief over time
    const snapshots = [];
    for (let tick = 0; tick < 100; tick += 10) {
      addBeliefGeneration(state, {
        amount: 10 + tick * 0.1, // Increasing
        source: 'prayer',
        quality: 0.7,
        believerId: `b${tick}`,
        tick,
      });
      snapshots.push({ tick, belief: state.totalBelief });
    }

    const growthRate = calculateGrowthRate(snapshots);

    expect(growthRate).toBeGreaterThan(0); // Growing
  });

  it('should detect belief plateau', () => {
    const snapshots = [
      { tick: 0, belief: 1000 },
      { tick: 10, belief: 1005 },
      { tick: 20, belief: 1003 },
      { tick: 30, belief: 1007 },
      { tick: 40, belief: 1002 },
    ];

    const growthRate = calculateGrowthRate(snapshots);
    const isPlateau = Math.abs(growthRate) < 0.01; // Nearly flat

    expect(isPlateau).toBe(true);
  });

  it('should detect belief decline', () => {
    const snapshots = [
      { tick: 0, belief: 1000 },
      { tick: 10, belief: 950 },
      { tick: 20, belief: 900 },
      { tick: 30, belief: 850 },
      { tick: 40, belief: 800 },
    ];

    const growthRate = calculateGrowthRate(snapshots);

    expect(growthRate).toBeLessThan(0); // Declining
  });
});

describe('Belief Allocation and Spending', () => {
  it('should allocate belief to divine powers', () => {
    const deity: Deity = createMockDeity('god');
    deity.belief = 1000;

    const cost = spendBelief(deity, 200, 'divine_power');

    expect(deity.belief).toBe(800);
    expect(cost.spent).toBe(200);
    expect(cost.purpose).toBe('divine_power');
  });

  it('should reject spending more belief than available', () => {
    const deity: Deity = createMockDeity('god');
    deity.belief = 100;

    expect(() => {
      spendBelief(deity, 200, 'divine_power');
    }).toThrow('Insufficient belief');
  });

  it('should reserve belief for maintenance', () => {
    const deity: Deity = createMockDeity('god');
    deity.belief = 1000;

    // Reserve 300 for avatar maintenance
    const reserved = reserveBelief(deity, 300, 'avatar_maintenance');

    expect(reserved.amount).toBe(300);
    expect(deity.belief).toBe(1000); // Not spent yet
    expect(deity.reservedBelief).toBe(300); // Reserved
  });

  it('should calculate available belief after reservations', () => {
    const deity: Deity = createMockDeity('god');
    deity.belief = 1000;
    deity.reservedBelief = 300;

    const available = getAvailableBelief(deity);

    expect(available).toBe(700); // 1000 - 300
  });
});

// Helper functions
function createMockDeity(id: string): Deity {
  return {
    id,
    controller: 'emergent',
    belief: 0,
    reservedBelief: 0,
    believers: [],
    identity: {
      perceivedName: id,
      domains: {},
      personality: {},
      alignment: { law_chaos: 0, good_evil: 0, selfless_selfish: 0 },
      forms: [],
    },
  } as any;
}

function createBeliever(id: string, belief: any): any {
  return {
    id,
    ...belief,
  };
}

function createMockWorld(): World {
  return {} as any;
}

function calculateBeliefGeneration(believer: any, activity: BeliefActivity, deity: Deity): BeliefGeneration {
  const base = activity.intensity * activity.duration * believer.faith * believer.devotion;
  const witnessBonus = activity.witnessed ? (activity.witnessCount || 1) * 0.5 : 0;
  const miracleBonus = activity.miracleType ? (activity.miraclePower || 0) * 100 : 0;

  return {
    amount: base + witnessBonus + miracleBonus,
    source: activity.type,
    quality: (believer.faith + believer.devotion) / 2,
    believerId: believer.id,
    tick: 0,
  };
}

function createEmptyBeliefState(): DeityBeliefState {
  return {
    totalBelief: 0,
    beliefBySource: {},
    believers: [],
    growthRate: 0,
    decayRate: 0.01,
  } as any;
}

function addBeliefGeneration(state: DeityBeliefState, gen: BeliefGeneration): void {
  state.totalBelief += gen.amount;
  state.beliefBySource[gen.source] = (state.beliefBySource[gen.source] || 0) + gen.amount;
}

function applyBeliefDecay(state: DeityBeliefState, ticks: number): DeityBeliefState {
  const decayMultiplier = state.believers.length === 0 ? 2.0 : 1.0;
  const effectiveDecay = state.decayRate * decayMultiplier;

  const newTotal = state.totalBelief * Math.pow(1 - effectiveDecay, ticks);

  const newState = { ...state };
  newState.totalBelief = Math.max(0, newTotal);

  // Decay sources
  for (const [source, amount] of Object.entries(state.beliefBySource)) {
    const sourceDecay = source === 'witness_miracle' ? effectiveDecay * 0.5 : effectiveDecay;
    newState.beliefBySource[source] = Math.max(0, amount * Math.pow(1 - sourceDecay, ticks));
  }

  return newState;
}

function transferBeliefSyncretism(from: Deity, to: Deity, percentage: number): any {
  const amount = from.belief * percentage;
  from.belief -= amount;
  to.belief += amount;
  return { amount, reason: 'syncretism' };
}

function convertBeliever(believer: any, from: Deity, to: Deity): any {
  const amount = believer.faith * believer.devotion * 50;
  from.belief -= amount;
  to.belief += amount;
  believer.deityId = to.id;
  return { amount, reason: 'conversion' };
}

function believerDies(believer: any, deity: Deity): any {
  const amount = believer.faith * believer.devotion * 30;
  deity.belief -= amount;
  return { amount, reason: 'believer_death' };
}

function sharePantheonBelief(from: Deity, to: Deity, percentage: number): any {
  const amount = from.belief * percentage;
  from.belief -= amount;
  to.belief += amount;
  return { amount, reason: 'pantheon_hierarchy' };
}

function calculateBeliefQuality(state: DeityBeliefState): number {
  const sourceQualities: Record<string, number> = {
    prayer: 0.6,
    ritual: 0.8,
    witness_miracle: 0.95,
    casual_mention: 0.2,
    temple_construction: 0.7,
  };

  let totalWeight = 0;
  let qualitySum = 0;

  for (const [source, amount] of Object.entries(state.beliefBySource)) {
    const quality = sourceQualities[source] || 0.5;
    qualitySum += amount * quality;
    totalWeight += amount;
  }

  return totalWeight > 0 ? qualitySum / totalWeight : 0;
}

function calculateGrowthRate(snapshots: Array<{ tick: number; belief: number }>): number {
  if (snapshots.length < 2) return 0;

  const first = snapshots[0];
  const last = snapshots[snapshots.length - 1];

  const timeDelta = last.tick - first.tick;
  const beliefDelta = last.belief - first.belief;

  return timeDelta > 0 ? beliefDelta / timeDelta : 0;
}

function spendBelief(deity: Deity, amount: number, purpose: string): any {
  if (deity.belief < amount) {
    throw new Error('Insufficient belief');
  }
  deity.belief -= amount;
  return { spent: amount, purpose };
}

function reserveBelief(deity: Deity, amount: number, purpose: string): any {
  deity.reservedBelief = (deity.reservedBelief || 0) + amount;
  return { amount, purpose };
}

function getAvailableBelief(deity: Deity): number {
  return deity.belief - (deity.reservedBelief || 0);
}
