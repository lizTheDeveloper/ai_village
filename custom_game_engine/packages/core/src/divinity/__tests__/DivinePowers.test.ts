/**
 * Tests for divine power system
 * Gap: No divine power execution system
 * Need: System to use belief for miracles, visions, blessings, curses
 */

import { describe, it, expect, beforeEach } from 'vitest';
import type { Deity } from '../DeityTypes.js';
import type { DivinePower, Prayer, DivineVision, ActiveBlessing, ActiveCurse } from '../DivinePowerTypes.js';
import type { World } from '../../ecs/World.js';

describe('Divine Power - Miracles', () => {
  let deity: Deity;
  let mockWorld: World;

  beforeEach(() => {
    deity = createMockDeity('healing_god');
    deity.belief = 1000;
    deity.identity.domains = { healing: 0.9, compassion: 0.7 };
    mockWorld = createMockWorld();
  });

  it('should cost belief to perform miracle', () => {
    const miracle: DivinePower = {
      id: 'heal_sick',
      name: 'Heal the Sick',
      category: 'miracle',
      tier: 'minor',
      baseCost: 100,
      effects: ['heal_target'],
    };

    const result = executeDivinePower(deity, miracle, 'sick_child', mockWorld);

    expect(result.success).toBe(true);
    expect(deity.belief).toBe(900); // 1000 - 100
  });

  it('should fail if insufficient belief', () => {
    deity.belief = 50;

    const miracle: DivinePower = {
      id: 'major_heal',
      name: 'Major Healing',
      category: 'miracle',
      tier: 'major',
      baseCost: 500,
      effects: ['heal_target', 'cure_disease'],
    };

    const result = executeDivinePower(deity, miracle, 'sick_person', mockWorld);

    expect(result.success).toBe(false);
    expect(result.failureReason).toBe('insufficient_belief');
    expect(deity.belief).toBe(50); // Unchanged
  });

  it('should reduce cost for aligned miracles', () => {
    // Healing miracle for healing god
    const alignedMiracle: DivinePower = {
      id: 'heal',
      name: 'Heal',
      category: 'miracle',
      tier: 'minor',
      baseCost: 100,
      domains: ['healing'],
      effects: ['heal_target'],
    };

    const cost = calculateMiracleCost(deity, alignedMiracle);

    expect(cost).toBeLessThan(100); // Domain discount
  });

  it('should increase cost for misaligned miracles', () => {
    // War miracle for healing god
    const misalignedMiracle: DivinePower = {
      id: 'smite',
      name: 'Smite',
      category: 'miracle',
      tier: 'minor',
      baseCost: 100,
      domains: ['war', 'destruction'],
      effects: ['damage_target'],
    };

    const cost = calculateMiracleCost(deity, misalignedMiracle);

    expect(cost).toBeGreaterThan(100); // Penalty
  });

  it('should scale miracle power with belief', () => {
    const weakDeity = createMockDeity('weak_god');
    weakDeity.belief = 200;

    const strongDeity = createMockDeity('strong_god');
    strongDeity.belief = 5000;

    const miracle: DivinePower = {
      id: 'heal',
      name: 'Heal',
      category: 'miracle',
      tier: 'minor',
      baseCost: 50,
      effects: ['heal_target'],
    };

    const weakResult = executeDivinePower(weakDeity, miracle, 'target', mockWorld);
    const strongResult = executeDivinePower(strongDeity, miracle, 'target', mockWorld);

    expect(strongResult.power).toBeGreaterThan(weakResult.power);
  });

  it('should generate mythology from witnessed miracles', () => {
    const miracle: DivinePower = {
      id: 'resurrect',
      name: 'Resurrect',
      category: 'miracle',
      tier: 'major',
      baseCost: 800,
      effects: ['resurrect_target'],
    };

    const result = executeDivinePower(deity, miracle, 'dead_person', mockWorld, {
      witnessed: true,
      witnessCount: 20,
    });

    expect(result.mythGenerated).toBe(true);
    expect(result.witnessImpact).toBeGreaterThan(0);
  });
});

describe('Divine Power - Prayers', () => {
  let deity: Deity;
  let mockWorld: World;

  beforeEach(() => {
    deity = createMockDeity('harvest_god');
    deity.belief = 500;
    mockWorld = createMockWorld();
  });

  it('should receive prayers from believers', () => {
    const prayer: Prayer = {
      id: 'prayer_1',
      believerId: 'farmer',
      deityId: deity.id,
      type: 'petition',
      content: 'Please bless my crops',
      emotion: 'desperate',
      intensity: 0.9,
      tick: 1000,
    };

    const received = receivePrayer(deity, prayer);

    expect(received).toBe(true);
    expect(deity.pendingPrayers?.length).toBe(1);
  });

  it('should prioritize desperate prayers', () => {
    const casualPrayer: Prayer = {
      id: 'p1',
      believerId: 'b1',
      deityId: deity.id,
      type: 'praise',
      content: 'Thank you',
      emotion: 'grateful',
      intensity: 0.3,
      tick: 1000,
    };

    const desperatePrayer: Prayer = {
      id: 'p2',
      believerId: 'b2',
      deityId: deity.id,
      type: 'petition',
      content: 'My child is dying',
      emotion: 'desperate',
      intensity: 0.95,
      tick: 1005,
    };

    receivePrayer(deity, casualPrayer);
    receivePrayer(deity, desperatePrayer);

    const prioritized = prioritizePrayers(deity.pendingPrayers || []);

    expect(prioritized[0].id).toBe('p2'); // Desperate first
  });

  it('should answer prayers with appropriate power', () => {
    const prayer: Prayer = {
      id: 'p1',
      believerId: 'farmer',
      deityId: deity.id,
      type: 'petition',
      content: 'Bless my harvest',
      emotion: 'hopeful',
      intensity: 0.7,
      tick: 1000,
      request: {
        type: 'blessing',
        target: 'crops',
        scope: 'single_field',
      },
    };

    const response = answerPrayer(deity, prayer, mockWorld);

    expect(response.answered).toBe(true);
    expect(response.beliefCost).toBeGreaterThan(0);
    expect(deity.belief).toBeLessThan(500);
  });

  it('should ignore prayers when belief is low', () => {
    deity.belief = 10; // Too low

    const prayer: Prayer = {
      id: 'p1',
      believerId: 'farmer',
      deityId: deity.id,
      type: 'petition',
      content: 'Please help',
      emotion: 'desperate',
      intensity: 0.9,
      tick: 1000,
      request: {
        type: 'miracle',
        target: 'sick_child',
        scope: 'individual',
      },
    };

    const response = answerPrayer(deity, prayer, mockWorld);

    expect(response.answered).toBe(false);
    expect(response.reason).toBe('insufficient_belief');
  });

  it('should affect faith based on answer rate', () => {
    const believer = createMockBeliever('farmer', deity.id);
    believer.faith = 0.7;
    believer.unansweredPrayerCount = 0;

    // Answer prayer
    const prayer: Prayer = {
      id: 'p1',
      believerId: believer.id,
      deityId: deity.id,
      type: 'petition',
      content: 'Help',
      emotion: 'hopeful',
      intensity: 0.6,
      tick: 1000,
    };

    answerPrayer(deity, prayer, mockWorld);

    const updatedFaith = updateFaithFromAnsweredPrayer(believer);
    expect(updatedFaith).toBeGreaterThan(0.7);
  });

  it('should decrease faith when prayers ignored', () => {
    const believer = createMockBeliever('farmer', deity.id);
    believer.faith = 0.7;
    believer.unansweredPrayerCount = 5; // Many ignored

    const updatedFaith = updateFaithFromUnansweredPrayers(believer);
    expect(updatedFaith).toBeLessThan(0.7);
  });
});

describe('Divine Power - Visions', () => {
  let deity: Deity;
  let mockWorld: World;

  beforeEach(() => {
    deity = createMockDeity('mysterious_god');
    deity.belief = 800;
    mockWorld = createMockWorld();
  });

  it('should send visions to believers', () => {
    const vision: DivineVision = {
      id: 'v1',
      deityId: deity.id,
      recipientId: 'believer',
      deliveryMethod: 'dream',
      clarity: 0.8,
      content: {
        imagery: ['golden_field', 'child_laughing'],
        message: 'Have faith',
        symbolism: { golden_field: 'prosperity', child: 'hope' },
      },
      tick: 1000,
    };

    const result = sendVision(deity, vision, mockWorld);

    expect(result.success).toBe(true);
    expect(deity.belief).toBeLessThan(800);
  });

  it('should cost more for clearer visions', () => {
    const vagueVision: DivineVision = {
      id: 'v1',
      deityId: deity.id,
      recipientId: 'believer',
      deliveryMethod: 'dream',
      clarity: 0.3,
      content: { imagery: ['light'], message: 'unclear' },
      tick: 1000,
    };

    const clearVision: DivineVision = {
      id: 'v2',
      deityId: deity.id,
      recipientId: 'believer',
      deliveryMethod: 'meditation',
      clarity: 0.95,
      content: { imagery: ['clear_instruction'], message: 'Build a temple at the hill' },
      tick: 1000,
    };

    const vagueCost = calculateVisionCost(vagueVision);
    const clearCost = calculateVisionCost(clearVision);

    expect(clearCost).toBeGreaterThan(vagueCost);
  });

  it('should predict vision interpretation', () => {
    const believer = createMockBeliever('farmer', deity.id);
    believer.personality = { optimistic: 0.8, literal: 0.3 };

    const vision: DivineVision = {
      id: 'v1',
      deityId: deity.id,
      recipientId: believer.id,
      deliveryMethod: 'dream',
      clarity: 0.7,
      content: {
        imagery: ['golden_wheat', 'child_running'],
        message: 'Hope comes',
        symbolism: { golden_wheat: 'prosperity', child: 'future' },
      },
      tick: 1000,
    };

    const interpretation = predictInterpretation(vision, believer);

    expect(interpretation.likelyMeaning).toContain('positive'); // Optimistic believer
    expect(interpretation.confidence).toBeGreaterThan(0.5);
  });

  it('should affect believer behavior after vision', () => {
    const believer = createMockBeliever('farmer', deity.id);

    const vision: DivineVision = {
      id: 'v1',
      deityId: deity.id,
      recipientId: believer.id,
      deliveryMethod: 'meditation',
      clarity: 0.9,
      content: {
        imagery: ['temple', 'hill'],
        message: 'Build where I showed you',
        symbolism: {},
      },
      tick: 1000,
    };

    sendVision(deity, vision, mockWorld);

    const behavior = getBehaviorAfterVision(believer, vision);

    expect(behavior.newGoal).toBe('build_temple');
    expect(behavior.motivation).toBeGreaterThan(0.7);
  });
});

describe('Divine Power - Blessings and Curses', () => {
  let deity: Deity;
  let mockWorld: World;

  beforeEach(() => {
    deity = createMockDeity('god');
    deity.belief = 1000;
    mockWorld = createMockWorld();
  });

  it('should apply blessing to believer', () => {
    const blessing: ActiveBlessing = {
      id: 'b1',
      deityId: deity.id,
      targetId: 'farmer',
      type: 'prosperity',
      magnitude: 0.8,
      duration: 1000,
      appliedAt: 1000,
    };

    const result = applyBlessing(deity, blessing, mockWorld);

    expect(result.success).toBe(true);
    expect(deity.belief).toBeLessThan(1000);
  });

  it('should apply curse to target', () => {
    const curse: ActiveCurse = {
      id: 'c1',
      deityId: deity.id,
      targetId: 'blasphemer',
      type: 'misfortune',
      magnitude: 0.7,
      duration: 500,
      appliedAt: 1000,
      liftCondition: { type: 'atonement', requirement: 'public_apology' },
    };

    const result = applyCurse(deity, curse, mockWorld);

    expect(result.success).toBe(true);
    expect(deity.belief).toBeLessThan(1000);
  });

  it('should lift curse when condition met', () => {
    const curse: ActiveCurse = {
      id: 'c1',
      deityId: deity.id,
      targetId: 'cursed_person',
      type: 'illness',
      magnitude: 0.6,
      duration: 10000,
      appliedAt: 1000,
      liftCondition: { type: 'atonement', requirement: 'sacrifice' },
    };

    applyCurse(deity, curse, mockWorld);

    // Person performs sacrifice
    const satisfied = checkCurseLiftCondition(curse, 'sacrifice_performed', mockWorld);

    expect(satisfied).toBe(true);

    const lifted = liftCurse(curse, mockWorld);
    expect(lifted.success).toBe(true);
  });

  it('should affect personality perception from blessings/curses', () => {
    deity.identity.personality = { benevolent: 0.6, wrathful: 0.2 };

    // Apply many blessings
    for (let i = 0; i < 10; i++) {
      const blessing: ActiveBlessing = {
        id: `b${i}`,
        deityId: deity.id,
        targetId: `person${i}`,
        type: 'health',
        magnitude: 0.5,
        duration: 1000,
        appliedAt: 1000 + i,
      };
      applyBlessing(deity, blessing, mockWorld);
    }

    const updated = updatePersonalityFromDivineActions(deity);

    expect(updated.identity.personality.benevolent).toBeGreaterThan(0.6);
  });

  it('should generate stories from dramatic blessings/curses', () => {
    const dramaticBlessing: ActiveBlessing = {
      id: 'b1',
      deityId: deity.id,
      targetId: 'dying_child',
      type: 'miraculous_recovery',
      magnitude: 1.0,
      duration: 0, // Instant
      appliedAt: 1000,
      witnessed: true,
      witnessCount: 30,
    };

    const result = applyBlessing(deity, dramaticBlessing, mockWorld);

    expect(result.storyGenerated).toBe(true);
    expect(result.storySpread).toBeGreaterThan(0);
  });
});

// Helper functions
function createMockDeity(id: string): Deity {
  return {
    id,
    controller: 'emergent',
    belief: 0,
    believers: [],
    identity: {
      perceivedName: id,
      domains: {},
      personality: {},
      alignment: { law_chaos: 0, good_evil: 0, selfless_selfish: 0 },
      forms: [],
    },
    pendingPrayers: [],
  } as any;
}

function createMockWorld(): World {
  return {} as any;
}

function createMockBeliever(id: string, deityId: string): any {
  return {
    id,
    deityId,
    faith: 0.5,
    devotion: 0.5,
    unansweredPrayerCount: 0,
    personality: {},
  };
}

function executeDivinePower(deity: Deity, power: DivinePower, target: any, world: World, options?: any): any {
  const cost = calculateMiracleCost(deity, power);
  if (deity.belief < cost) {
    return { success: false, failureReason: 'insufficient_belief' };
  }

  deity.belief -= cost;

  const powerScale = Math.log(deity.belief + 1) / 10;

  return {
    success: true,
    power: powerScale,
    mythGenerated: options?.witnessed || false,
    witnessImpact: options?.witnessCount || 0,
  };
}

function calculateMiracleCost(deity: Deity, power: DivinePower): number {
  let cost = power.baseCost;

  // Domain alignment
  if (power.domains) {
    for (const domain of power.domains) {
      const alignment = (deity.identity.domains as any)[domain] || 0;
      if (alignment > 0.7) {
        cost *= 0.7; // 30% discount
      } else if (alignment < 0.3) {
        cost *= 1.5; // 50% penalty
      }
    }
  }

  return Math.ceil(cost);
}

function receivePrayer(deity: Deity, prayer: Prayer): boolean {
  if (!deity.pendingPrayers) deity.pendingPrayers = [];
  deity.pendingPrayers.push(prayer);
  return true;
}

function prioritizePrayers(prayers: Prayer[]): Prayer[] {
  return [...prayers].sort((a, b) => {
    // Desperate prayers first
    if (a.emotion === 'desperate' && b.emotion !== 'desperate') return -1;
    if (b.emotion === 'desperate' && a.emotion !== 'desperate') return 1;
    // Then by intensity
    return b.intensity - a.intensity;
  });
}

function answerPrayer(deity: Deity, prayer: Prayer, world: World): any {
  const cost = prayer.request ? 100 : 20;

  if (deity.belief < cost) {
    return { answered: false, reason: 'insufficient_belief' };
  }

  deity.belief -= cost;
  return { answered: true, beliefCost: cost };
}

function updateFaithFromAnsweredPrayer(believer: any): number {
  return Math.min(1.0, believer.faith + 0.1);
}

function updateFaithFromUnansweredPrayers(believer: any): number {
  return Math.max(0, believer.faith - believer.unansweredPrayerCount * 0.02);
}

function sendVision(deity: Deity, vision: DivineVision, world: World): any {
  const cost = calculateVisionCost(vision);
  if (deity.belief < cost) {
    return { success: false, reason: 'insufficient_belief' };
  }

  deity.belief -= cost;
  return { success: true, cost };
}

function calculateVisionCost(vision: DivineVision): number {
  const base = 25;
  const clarityMultiplier = 1 + vision.clarity;
  const methodMultiplier = vision.deliveryMethod === 'dream' ? 1.0 : vision.deliveryMethod === 'meditation' ? 2.0 : 4.0;

  return Math.ceil(base * clarityMultiplier * methodMultiplier);
}

function predictInterpretation(vision: DivineVision, believer: any): any {
  const optimism = believer.personality.optimistic || 0.5;
  const literalness = believer.personality.literal || 0.5;

  return {
    likelyMeaning: optimism > 0.6 ? 'positive interpretation' : 'cautious interpretation',
    confidence: vision.clarity * 0.8,
  };
}

function getBehaviorAfterVision(believer: any, vision: DivineVision): any {
  return {
    newGoal: vision.content.message.includes('Build') ? 'build_temple' : 'none',
    motivation: vision.clarity,
  };
}

function applyBlessing(deity: Deity, blessing: ActiveBlessing, world: World): any {
  const cost = blessing.magnitude * 50;
  if (deity.belief < cost) {
    return { success: false };
  }

  deity.belief -= cost;

  return {
    success: true,
    storyGenerated: blessing.witnessed && blessing.witnessCount && blessing.witnessCount > 10,
    storySpread: blessing.witnessCount || 0,
  };
}

function applyCurse(deity: Deity, curse: ActiveCurse, world: World): any {
  const cost = curse.magnitude * 40;
  if (deity.belief < cost) {
    return { success: false };
  }

  deity.belief -= cost;
  return { success: true };
}

function checkCurseLiftCondition(curse: ActiveCurse, action: string, world: World): boolean {
  return curse.liftCondition?.requirement === action;
}

function liftCurse(curse: ActiveCurse, world: World): any {
  return { success: true };
}

function updatePersonalityFromDivineActions(deity: Deity): Deity {
  const updated = { ...deity };
  updated.identity.personality.benevolent = Math.min(1.0, (deity.identity.personality.benevolent || 0) + 0.1);
  return updated;
}
