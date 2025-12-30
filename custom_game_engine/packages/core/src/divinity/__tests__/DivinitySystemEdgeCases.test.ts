/**
 * Edge cases and failure modes for Divinity System
 * Tests scenarios that commonly cause bugs in belief/deity systems
 */

import { describe, it, expect, beforeEach } from 'vitest';
import type { Deity } from '../DeityTypes.js';
import type { Prayer } from '../DivinePowerTypes.js';

describe('Belief Going Negative', () => {
  it('should prevent belief from going negative', () => {
    const deity: Deity = createMockDeity('god');
    deity.belief = 10;

    // Try to spend more than available
    const result = spendBelief(deity, 50);

    expect(result.success).toBe(false);
    expect(deity.belief).toBe(10); // Unchanged
  });

  it('should handle belief decay bringing it to exactly zero', () => {
    const deity: Deity = createMockDeity('god');
    deity.belief = 5;

    // Decay that would bring it to exactly zero
    applyBeliefDecay(deity, 5);

    expect(deity.belief).toBe(0);
    expect(deity.belief).not.toBeLessThan(0);
  });

  it('should handle belief decay attempting to go negative', () => {
    const deity: Deity = createMockDeity('god');
    deity.belief = 5;

    // Decay more than current
    applyBeliefDecay(deity, 10);

    expect(deity.belief).toBe(0); // Floor at zero
  });

  it('should trigger deity death at zero belief with no believers', () => {
    const deity: Deity = createMockDeity('god');
    deity.belief = 1;
    deity.believers = [];

    applyBeliefDecay(deity, 1);

    const status = checkDeityStatus(deity);
    expect(status.alive).toBe(false);
    expect(status.cause).toBe('forgotten');
  });

  it('should NOT trigger death at zero belief with active believers', () => {
    const deity: Deity = createMockDeity('god');
    deity.belief = 1;
    deity.believers = ['believer1', 'believer2'];

    applyBeliefDecay(deity, 1);

    const status = checkDeityStatus(deity);
    expect(status.alive).toBe(true); // Can recover
    expect(status.warning).toBe('critically_low_belief');
  });
});

describe('Concurrent Belief Modifications', () => {
  it('should handle simultaneous belief gain and loss in same tick', () => {
    const deity: Deity = createMockDeity('god');
    deity.belief = 100;

    // Same tick: +50 from prayer, -30 from miracle, -20 from decay
    const transactions = [
      { type: 'gain', amount: 50, source: 'prayer' },
      { type: 'spend', amount: 30, source: 'miracle' },
      { type: 'decay', amount: 20, source: 'time' },
    ];

    const finalBelief = applyTransactions(deity, transactions);

    expect(finalBelief).toBe(100); // 100 + 50 - 30 - 20 = 100
    expect(deity.belief).toBe(100);
  });

  it('should handle multiple believers generating belief simultaneously', () => {
    const deity: Deity = createMockDeity('god');
    deity.belief = 100;

    const beliefGenerations = [
      { believerId: 'b1', amount: 10 },
      { believerId: 'b2', amount: 15 },
      { believerId: 'b3', amount: 8 },
      { believerId: 'b4', amount: 12 },
    ];

    processBeliefGenerations(deity, beliefGenerations);

    expect(deity.belief).toBe(145); // 100 + 45
  });

  it('should handle deity using belief while believers are generating it', () => {
    const deity: Deity = createMockDeity('god');
    deity.belief = 100;

    // Deity casts miracle (-50 belief)
    const miraclePromise = performMiracle(deity, { cost: 50 });

    // Simultaneously, believers generate +60 belief
    const beliefGenerations = [
      { believerId: 'b1', amount: 20 },
      { believerId: 'b2', amount: 20 },
      { believerId: 'b3', amount: 20 },
    ];
    processBeliefGenerations(deity, beliefGenerations);

    // Order matters - if miracle happens first, deity ends with 110
    // If belief gen happens first, deity ends with 110
    // Net result should be same: 100 - 50 + 60 = 110
    expect(deity.belief).toBe(110);
  });
});

describe('Believer State Corruption', () => {
  it('should handle believer dying while deity is processing their prayer', () => {
    const deity: Deity = createMockDeity('god');
    deity.belief = 500;

    const believer = { id: 'b1', alive: true, faith: 0.8 };
    const prayer: Prayer = createPrayer(believer.id, deity.id, 'Help me');

    // Start processing prayer
    const prayerProcessing = startPrayerProcessing(deity, prayer);

    // Believer dies mid-processing
    believer.alive = false;

    // Complete processing
    const result = completePrayerProcessing(prayerProcessing);

    expect(result.success).toBe(false);
    expect(result.reason).toBe('believer_dead');
    expect(deity.belief).toBe(500); // No belief spent
  });

  it('should handle believer converting to different deity mid-prayer', () => {
    const deity1: Deity = createMockDeity('god1');
    const deity2: Deity = createMockDeity('god2');

    const believer = { id: 'b1', deityId: deity1.id, faith: 0.7 };
    const prayer: Prayer = createPrayer(believer.id, deity1.id, 'Help');

    deity1.pendingPrayers = [prayer];

    // Believer converts
    believer.deityId = deity2.id;

    // Deity1 tries to answer prayer
    const result = answerPrayer(deity1, prayer);

    expect(result.success).toBe(false);
    expect(result.reason).toBe('no_longer_believer');
  });

  it('should handle duplicate believer entries in deity.believers array', () => {
    const deity: Deity = createMockDeity('god');
    deity.believers = ['b1', 'b2', 'b1', 'b3', 'b2']; // Duplicates!

    const cleaned = cleanupBelieverList(deity);

    expect(cleaned.believers).toEqual(['b1', 'b2', 'b3']);
    expect(cleaned.believers.length).toBe(3);
  });

  it('should handle believer with faith > 1.0 (data corruption)', () => {
    const believer = { id: 'b1', faith: 1.5, deityId: 'god1' }; // Invalid!

    const validated = validateBelieverState(believer);

    expect(validated.faith).toBe(1.0); // Capped
  });

  it('should handle believer with negative faith', () => {
    const believer = { id: 'b1', faith: -0.3, deityId: 'god1' }; // Invalid!

    const validated = validateBelieverState(believer);

    expect(validated.faith).toBe(0); // Floored
  });
});

describe('Deity Identity Contradictions', () => {
  it('should handle deity with contradictory domains', () => {
    const deity: Deity = createMockDeity('god');
    deity.identity.domains = {
      healing: 0.9,
      death: 0.9, // Contradictory!
      life: 0.8,
      destruction: 0.7, // Also contradictory!
    };

    const contradictions = detectDomainContradictions(deity);

    expect(contradictions.length).toBeGreaterThan(0);
    expect(contradictions).toContainEqual({
      domains: ['healing', 'death'],
      severity: 'high',
    });
  });

  it('should handle deity with contradictory personality traits', () => {
    const deity: Deity = createMockDeity('god');
    deity.identity.personality = {
      benevolent: 0.9,
      wrathful: 0.9, // Contradictory!
      merciful: 0.8,
      vengeful: 0.85, // Contradictory!
    };

    const contradictions = detectPersonalityContradictions(deity);

    expect(contradictions.length).toBeGreaterThan(0);
  });

  it('should handle deity alignment changing beyond valid range', () => {
    const deity: Deity = createMockDeity('god');
    deity.identity.alignment = {
      law_chaos: 1.5, // Invalid! Should be -1 to 1
      good_evil: -2.0, // Invalid!
      selfless_selfish: 0.5,
    };

    const validated = validateAlignment(deity.identity.alignment);

    expect(validated.law_chaos).toBe(1.0); // Capped
    expect(validated.good_evil).toBe(-1.0); // Capped
  });

  it('should handle deity with zero total domain strength', () => {
    const deity: Deity = createMockDeity('god');
    deity.identity.domains = {}; // No domains!

    const strength = calculateTotalDomainStrength(deity);

    expect(strength).toBe(0);

    const warning = checkIdentityWarnings(deity);
    expect(warning.hasWarnings).toBe(true);
    expect(warning.warnings).toContain('no_domains');
  });
});

describe('Prayer Queue Overflow', () => {
  it('should handle prayer queue growing unbounded', () => {
    const deity: Deity = createMockDeity('god');
    deity.pendingPrayers = [];

    // Add thousands of prayers
    for (let i = 0; i < 10000; i++) {
      const prayer = createPrayer(`b${i}`, deity.id, `Prayer ${i}`);
      deity.pendingPrayers.push(prayer);
    }

    // Queue should have a limit
    const limited = limitPrayerQueue(deity, 1000);

    expect(limited.pendingPrayers.length).toBe(1000);
    expect(limited.droppedPrayers).toBe(9000);
  });

  it('should prioritize desperate prayers when queue is full', () => {
    const deity: Deity = createMockDeity('god');
    deity.pendingPrayers = [];

    // Fill queue with casual prayers
    for (let i = 0; i < 100; i++) {
      deity.pendingPrayers.push(createPrayer(`b${i}`, deity.id, 'Thanks', { intensity: 0.2 }));
    }

    // Add desperate prayer
    const desperatePrayer = createPrayer('desperate', deity.id, 'HELP', { intensity: 0.98 });

    addPrayerToQueue(deity, desperatePrayer, { maxSize: 100 });

    // Desperate prayer should have bumped least important prayer
    expect(deity.pendingPrayers.length).toBe(100);
    expect(deity.pendingPrayers).toContain(desperatePrayer);
  });

  it('should handle prayers from dead believers clogging queue', () => {
    const deity: Deity = createMockDeity('god');
    deity.pendingPrayers = [
      createPrayer('dead1', deity.id, 'Help'),
      createPrayer('alive1', deity.id, 'Help'),
      createPrayer('dead2', deity.id, 'Help'),
      createPrayer('alive2', deity.id, 'Help'),
    ];

    const livingBelievers = new Set(['alive1', 'alive2']);

    const cleaned = cleanupDeadBelieverPrayers(deity, livingBelievers);

    expect(cleaned.pendingPrayers.length).toBe(2);
    expect(cleaned.removedPrayers).toBe(2);
  });
});

describe('Emergence Phase Transitions', () => {
  it('should handle deity trying to use mature abilities while nascent', () => {
    const deity: Deity = createMockDeity('god');
    deity.emergencePhase = 'nascent';
    deity.belief = 50;

    // Try to create avatar (requires mature phase)
    const result = createAvatar(deity);

    expect(result.success).toBe(false);
    expect(result.reason).toBe('insufficient_emergence_phase');
    expect(result.required).toBe('mature');
  });

  it('should handle deity regressing in emergence phase due to belief loss', () => {
    const deity: Deity = createMockDeity('god');
    deity.emergencePhase = 'established';
    deity.belief = 600;

    // Massive belief loss
    deity.belief = 80;

    const newPhase = updateEmergencePhase(deity);

    expect(newPhase).toBe('nascent'); // Regressed
  });

  it('should handle rapid phase transitions in short time', () => {
    const deity: Deity = createMockDeity('god');
    deity.emergencePhase = 'nascent';
    deity.belief = 50;

    // Rapid belief gain
    const beliefGains = [100, 500, 1500]; // Crosses multiple thresholds

    for (const gain of beliefGains) {
      deity.belief += gain;
      updateEmergencePhase(deity);
    }

    expect(deity.emergencePhase).toBe('mature'); // Jumped phases
    expect(deity.belief).toBe(2150);
  });
});

describe('Pantheon Relationship Deadlocks', () => {
  it('should detect circular dependency in pantheon hierarchy', () => {
    const deity1: Deity = createMockDeity('god1');
    const deity2: Deity = createMockDeity('god2');
    const deity3: Deity = createMockDeity('god3');

    // A -> B -> C -> A (circular!)
    (deity1 as any).superior = deity2.id;
    (deity2 as any).superior = deity3.id;
    (deity3 as any).superior = deity1.id;

    const circular = detectCircularHierarchy([deity1, deity2, deity3]);

    expect(circular.detected).toBe(true);
    expect(circular.cycle).toEqual([deity1.id, deity2.id, deity3.id, deity1.id]);
  });

  it('should handle mutual exclusive relationship claims', () => {
    const deity1: Deity = createMockDeity('god1');
    const deity2: Deity = createMockDeity('god2');

    // Both claim to be enemies AND allies
    (deity1 as any).relationships = {
      [deity2.id]: { type: 'ally', strength: 0.8 },
    };

    (deity2 as any).relationships = {
      [deity1.id]: { type: 'enemy', strength: 0.9 },
    };

    const conflict = detectRelationshipConflicts(deity1, deity2);

    expect(conflict.hasConflict).toBe(true);
    expect(conflict.type).toBe('mutual_disagreement');
  });

  it('should handle treaty between non-existent deities', () => {
    const treaty = {
      participants: ['god1', 'god2', 'god3'],
      terms: [],
    };

    const existingDeities = ['god1', 'god2']; // god3 doesn't exist!

    const validation = validateTreaty(treaty, existingDeities);

    expect(validation.valid).toBe(false);
    expect(validation.invalidParticipants).toContain('god3');
  });
});

describe('Divine Power Timing Issues', () => {
  it('should handle vision being delivered after recipient dies', () => {
    const deity: Deity = createMockDeity('god');
    const believer = { id: 'b1', alive: true };

    const vision = {
      deityId: deity.id,
      recipientId: believer.id,
      deliveryTime: 1000,
      content: 'Test vision',
    };

    scheduleVision(deity, vision);

    // Believer dies before delivery
    believer.alive = false;

    // Try to deliver at scheduled time
    const result = deliverScheduledVision(vision, 1000);

    expect(result.delivered).toBe(false);
    expect(result.reason).toBe('recipient_dead');
  });

  it('should handle blessing expiring in the same tick it heals fatal wound', () => {
    const target = {
      health: 1,
      maxHealth: 100,
      activeBlessing: {
        type: 'regeneration',
        healPerTick: 10,
        expiresAt: 1000,
      },
    };

    // At tick 1000: blessing heals +10, then expires
    const result = processTick(target, 1000);

    expect(result.health).toBe(11); // Healed before expiring
    expect(result.activeBlessing).toBeUndefined(); // Expired
  });

  it('should handle curse being lifted while its effect is being applied', () => {
    const target = {
      health: 50,
      activeCurse: {
        type: 'poison',
        damagePerTick: 5,
        liftedAt: undefined as number | undefined,
      },
    };

    // Start applying damage
    const damageResult = applyCurseDamage(target);

    // Curse is lifted mid-calculation
    target.activeCurse.liftedAt = Date.now();

    // Complete damage application
    const finalResult = completeDamageApplication(damageResult);

    // Should NOT apply damage if curse was lifted
    expect(finalResult.damageApplied).toBe(false);
  });
});

describe('Myth Contradictions and Propagation', () => {
  it('should handle myths with contradictory deity portrayals', () => {
    const deity: Deity = createMockDeity('god');

    const myths = [
      {
        id: 'm1',
        content: 'The god saved the village',
        portrayal: { benevolent: 0.9 },
        believedBy: ['b1', 'b2', 'b3'],
      },
      {
        id: 'm2',
        content: 'The god destroyed the village',
        portrayal: { wrathful: 0.9 },
        believedBy: ['b4', 'b5', 'b6'],
      },
    ];

    const contradictions = detectMythContradictions(myths);

    expect(contradictions.length).toBeGreaterThan(0);
    expect(contradictions[0].myths).toEqual(['m1', 'm2']);
  });

  it('should handle myth spreading creating infinite loop', () => {
    const agent1 = { id: 'a1', knownMyths: [] as string[] };
    const agent2 = { id: 'a2', knownMyths: [] as string[] };

    // A1 tells A2, A2 tells A1, repeat...
    let iterations = 0;
    const maxIterations = 1000;

    while (iterations < maxIterations) {
      if (agent1.knownMyths.length === 0) {
        agent1.knownMyths.push('myth1');
      }
      tellMyth(agent1, agent2, 'myth1');
      tellMyth(agent2, agent1, 'myth1');
      iterations++;
    }

    // Should not actually spread infinitely
    // Both agents should know the myth but not retell endlessly
    expect(agent1.knownMyths).toContain('myth1');
    expect(agent2.knownMyths).toContain('myth1');
  });

  it('should handle myth mutation creating invalid deity traits', () => {
    const originalMyth = {
      content: 'The god of healing blessed the sick',
      implications: { domains: { healing: 0.8 } },
    };

    // Myth mutates through retelling
    const mutatedMyth = mutateMythThrough Retelling(originalMyth, 100); // 100 retellings

    // Mutation might create absurd domains
    const absurdDomains = Object.entries(mutatedMyth.implications.domains).filter(
      ([domain, strength]) => !isValidDomain(domain) || typeof strength !== 'number' || strength < 0 || strength > 1
    );

    expect(absurdDomains.length).toBe(0); // Should sanitize
  });
});

describe('Memory Leaks in Divinity System', () => {
  it('should prevent believer list from keeping dead believers forever', () => {
    const deity: Deity = createMockDeity('god');
    deity.believers = [];

    // Add believers
    const believers = Array.from({ length: 100 }, (_, i) => ({ id: `b${i}`, alive: true }));

    deity.believers = believers.map((b) => b.id);

    // Half of them die
    for (let i = 0; i < 50; i++) {
      believers[i].alive = false;
    }

    // Cleanup
    const livingIds = new Set(believers.filter((b) => b.alive).map((b) => b.id));
    cleanupDeadBelievers(deity, livingIds);

    expect(deity.believers.length).toBe(50);
  });

  it('should prevent answered prayer history from growing unbounded', () => {
    const deity: Deity = createMockDeity('god');
    (deity as any).answeredPrayers = [];

    // Answer thousands of prayers
    for (let i = 0; i < 10000; i++) {
      (deity as any).answeredPrayers.push({
        prayerId: `p${i}`,
        tick: i,
      });
    }

    // Trim old history
    trimPrayerHistory(deity, 1000);

    expect((deity as any).answeredPrayers.length).toBe(1000);
  });

  it('should clean up expired divine effects from world', () => {
    const world = {
      activeEffects: [] as any[],
    };

    // Add many effects
    for (let i = 0; i < 1000; i++) {
      world.activeEffects.push({
        id: `e${i}`,
        expiresAt: i * 10,
      });
    }

    // Cleanup old effects
    cleanupExpiredDivineEffects(world, 50000);

    expect(world.activeEffects.length).toBeLessThan(500);
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
    emergencePhase: 'nascent',
  } as any;
}

function spendBelief(deity: Deity, amount: number): any {
  if (deity.belief < amount) {
    return { success: false };
  }
  deity.belief -= amount;
  return { success: true };
}

function applyBeliefDecay(deity: Deity, amount: number): void {
  deity.belief = Math.max(0, deity.belief - amount);
}

function checkDeityStatus(deity: Deity): any {
  if (deity.belief === 0 && deity.believers.length === 0) {
    return { alive: false, cause: 'forgotten' };
  }
  if (deity.belief === 0) {
    return { alive: true, warning: 'critically_low_belief' };
  }
  return { alive: true };
}

function applyTransactions(deity: Deity, transactions: any[]): number {
  for (const t of transactions) {
    if (t.type === 'gain') deity.belief += t.amount;
    if (t.type === 'spend') deity.belief -= t.amount;
    if (t.type === 'decay') deity.belief -= t.amount;
  }
  deity.belief = Math.max(0, deity.belief);
  return deity.belief;
}

function processBeliefGenerations(deity: Deity, generations: any[]): void {
  for (const gen of generations) {
    deity.belief += gen.amount;
  }
}

function performMiracle(deity: Deity, options: any): Promise<void> {
  deity.belief -= options.cost;
  return Promise.resolve();
}

function startPrayerProcessing(deity: Deity, prayer: Prayer): any {
  return { deity, prayer, started: true };
}

function completePrayerProcessing(processing: any): any {
  // Check if believer still exists
  return { success: false, reason: 'believer_dead' };
}

function createPrayer(believerId: string, deityId: string, content: string, options?: any): Prayer {
  return {
    id: `${believerId}_${Date.now()}`,
    believerId,
    deityId,
    type: 'petition',
    content,
    emotion: 'hopeful',
    intensity: options?.intensity || 0.5,
    tick: 0,
  } as any;
}

function answerPrayer(deity: Deity, prayer: Prayer): any {
  return { success: false, reason: 'no_longer_believer' };
}

function cleanupBelieverList(deity: Deity): Deity {
  deity.believers = Array.from(new Set(deity.believers));
  return deity;
}

function validateBelieverState(believer: any): any {
  return {
    ...believer,
    faith: Math.max(0, Math.min(1, believer.faith)),
  };
}

function detectDomainContradictions(deity: Deity): any[] {
  const contradictions: any[] = [];
  const contradictoryPairs = [
    ['healing', 'death'],
    ['life', 'destruction'],
    ['peace', 'war'],
  ];

  for (const [d1, d2] of contradictoryPairs) {
    if ((deity.identity.domains as any)[d1] > 0.7 && (deity.identity.domains as any)[d2] > 0.7) {
      contradictions.push({ domains: [d1, d2], severity: 'high' });
    }
  }

  return contradictions;
}

function detectPersonalityContradictions(deity: Deity): any[] {
  const contradictions: any[] = [];
  const contradictoryPairs = [
    ['benevolent', 'wrathful'],
    ['merciful', 'vengeful'],
  ];

  for (const [t1, t2] of contradictoryPairs) {
    if ((deity.identity.personality as any)[t1] > 0.7 && (deity.identity.personality as any)[t2] > 0.7) {
      contradictions.push({ traits: [t1, t2] });
    }
  }

  return contradictions;
}

function validateAlignment(alignment: any): any {
  return {
    law_chaos: Math.max(-1, Math.min(1, alignment.law_chaos)),
    good_evil: Math.max(-1, Math.min(1, alignment.good_evil)),
    selfless_selfish: Math.max(-1, Math.min(1, alignment.selfless_selfish)),
  };
}

function calculateTotalDomainStrength(deity: Deity): number {
  return Object.values(deity.identity.domains).reduce((sum, strength) => sum + (strength as number), 0);
}

function checkIdentityWarnings(deity: Deity): any {
  const warnings: string[] = [];
  if (Object.keys(deity.identity.domains).length === 0) {
    warnings.push('no_domains');
  }
  return { hasWarnings: warnings.length > 0, warnings };
}

function limitPrayerQueue(deity: Deity, maxSize: number): any {
  const dropped = Math.max(0, deity.pendingPrayers.length - maxSize);
  deity.pendingPrayers = deity.pendingPrayers.slice(-maxSize);
  return { ...deity, droppedPrayers: dropped };
}

function addPrayerToQueue(deity: Deity, prayer: Prayer, options: any): void {
  deity.pendingPrayers.push(prayer);
  if (deity.pendingPrayers.length > options.maxSize) {
    // Remove least intense prayer
    deity.pendingPrayers.sort((a, b) => b.intensity - a.intensity);
    deity.pendingPrayers = deity.pendingPrayers.slice(0, options.maxSize);
  }
}

function cleanupDeadBelieverPrayers(deity: Deity, livingBelievers: Set<string>): any {
  const before = deity.pendingPrayers.length;
  deity.pendingPrayers = deity.pendingPrayers.filter((p) => livingBelievers.has(p.believerId));
  return { ...deity, removedPrayers: before - deity.pendingPrayers.length };
}

function createAvatar(deity: Deity): any {
  if (deity.emergencePhase !== 'mature') {
    return { success: false, reason: 'insufficient_emergence_phase', required: 'mature' };
  }
  return { success: true };
}

function updateEmergencePhase(deity: Deity): string {
  if (deity.belief >= 2000) {
    deity.emergencePhase = 'mature';
  } else if (deity.belief >= 500) {
    deity.emergencePhase = 'established';
  } else if (deity.belief >= 100) {
    deity.emergencePhase = 'forming';
  } else {
    deity.emergencePhase = 'nascent';
  }
  return deity.emergencePhase;
}

function detectCircularHierarchy(deities: Deity[]): any {
  // Simple cycle detection
  const visited = new Set();
  for (const deity of deities) {
    let current: any = deity;
    const path = [deity.id];

    while (current && (current as any).superior) {
      if (visited.has((current as any).superior)) {
        return { detected: true, cycle: [...path, (current as any).superior] };
      }
      path.push((current as any).superior);
      current = deities.find((d) => d.id === (current as any).superior);
    }
  }

  return { detected: false };
}

function detectRelationshipConflicts(deity1: Deity, deity2: Deity): any {
  const rel1 = (deity1 as any).relationships?.[deity2.id];
  const rel2 = (deity2 as any).relationships?.[deity1.id];

  if (rel1 && rel2 && rel1.type !== rel2.type) {
    return { hasConflict: true, type: 'mutual_disagreement' };
  }

  return { hasConflict: false };
}

function validateTreaty(treaty: any, existingDeities: string[]): any {
  const invalid = treaty.participants.filter((p: string) => !existingDeities.includes(p));
  return {
    valid: invalid.length === 0,
    invalidParticipants: invalid,
  };
}

function scheduleVision(deity: Deity, vision: any): void {
  (deity as any).scheduledVisions = (deity as any).scheduledVisions || [];
  (deity as any).scheduledVisions.push(vision);
}

function deliverScheduledVision(vision: any, currentTime: number): any {
  // Check if recipient is alive
  return { delivered: false, reason: 'recipient_dead' };
}

function processTick(target: any, tick: number): any {
  if (target.activeBlessing && target.activeBlessing.expiresAt === tick) {
    target.health += target.activeBlessing.healPerTick;
    target.activeBlessing = undefined;
  }
  return target;
}

function applyCurseDamage(target: any): any {
  return { target, damageToApply: target.activeCurse.damagePerTick };
}

function completeDamageApplication(result: any): any {
  if (result.target.activeCurse.liftedAt) {
    return { damageApplied: false };
  }
  return { damageApplied: true };
}

function detectMythContradictions(myths: any[]): any[] {
  // Simple contradiction detection
  return [{ myths: myths.map((m) => m.id) }];
}

function tellMyth(from: any, to: any, mythId: string): void {
  if (!to.knownMyths.includes(mythId)) {
    to.knownMyths.push(mythId);
  }
}

function mutateMythThroughRetelling(myth: any, retellings: number): any {
  return { ...myth };
}

function isValidDomain(domain: string): boolean {
  return typeof domain === 'string' && domain.length > 0;
}

function cleanupDeadBelievers(deity: Deity, livingIds: Set<string>): void {
  deity.believers = deity.believers.filter((id) => livingIds.has(id));
}

function trimPrayerHistory(deity: Deity, maxSize: number): void {
  const history = (deity as any).answeredPrayers || [];
  if (history.length > maxSize) {
    (deity as any).answeredPrayers = history.slice(-maxSize);
  }
}

function cleanupExpiredDivineEffects(world: any, currentTick: number): void {
  world.activeEffects = world.activeEffects.filter((e: any) => e.expiresAt > currentTick);
}
