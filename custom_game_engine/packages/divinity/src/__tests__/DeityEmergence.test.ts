/**
 * Tests for deity emergence and identity formation
 * Gap: No deity emergence system implemented
 * Need: System that creates deities from agent belief patterns
 */

import { describe, it, expect, beforeEach } from 'vitest';
import type { Deity, DeityIdentity, DivineDomain, EmergencePhase } from '../DeityTypes.js';
import { World } from '@ai-village/core';

describe('Deity Emergence', () => {
  let mockWorld: World;

  beforeEach(() => {
    mockWorld = createMockWorld();
  });

  it('should detect when belief threshold is met', () => {
    const beliefPatterns = [
      { agentId: 'a1', concept: 'harvest', strength: 0.7, tick: 100 },
      { agentId: 'a2', concept: 'harvest', strength: 0.8, tick: 105 },
      { agentId: 'a3', concept: 'harvest', strength: 0.6, tick: 110 },
      { agentId: 'a4', concept: 'harvest', strength: 0.75, tick: 115 },
    ];

    const shouldEmerge = checkEmergenceThreshold(beliefPatterns, {
      minBelievers: 3,
      minAverageStrength: 0.6,
      minCohesion: 0.7,
    });

    expect(shouldEmerge).toBe(true);
  });

  it('should not emerge with insufficient believers', () => {
    const beliefPatterns = [
      { agentId: 'a1', concept: 'harvest', strength: 0.9, tick: 100 },
      { agentId: 'a2', concept: 'harvest', strength: 0.85, tick: 105 },
    ];

    const shouldEmerge = checkEmergenceThreshold(beliefPatterns, {
      minBelievers: 3,
      minAverageStrength: 0.6,
      minCohesion: 0.7,
    });

    expect(shouldEmerge).toBe(false);
  });

  it('should create deity from belief patterns', () => {
    const beliefPatterns = [
      { agentId: 'a1', concept: 'harvest', attributes: { benevolent: 0.8, patient: 0.7 }, tick: 100 },
      { agentId: 'a2', concept: 'harvest', attributes: { benevolent: 0.7, wise: 0.6 }, tick: 105 },
      { agentId: 'a3', concept: 'harvest', attributes: { patient: 0.8, generous: 0.7 }, tick: 110 },
    ];

    const deity = emergeDeity(beliefPatterns, mockWorld);

    expect(deity).toBeDefined();
    expect(deity.controller).toBe('emergent');
    expect(deity.identity.perceivedName).toContain('harvest');
    expect(deity.believers.length).toBe(3);
    expect(deity.emergencePhase).toBe('nascent');
  });

  it('should synthesize identity from believer perceptions', () => {
    const perceptions = [
      {
        agentId: 'a1',
        name: 'Giver of Grain',
        domains: { harvest: 0.9, agriculture: 0.7 },
        personality: { generous: 0.8, patient: 0.7 },
      },
      {
        agentId: 'a2',
        name: 'Grain Mother',
        domains: { harvest: 0.85, fertility: 0.6 },
        personality: { generous: 0.7, nurturing: 0.8 },
      },
      {
        agentId: 'a3',
        name: 'Harvest Lord',
        domains: { harvest: 0.95, seasons: 0.5 },
        personality: { patient: 0.9, wise: 0.6 },
      },
    ];

    const identity = synthesizeIdentity(perceptions);

    expect(identity.perceivedName).toBeDefined();
    expect(identity.domains.harvest).toBeGreaterThan(0.8); // Strong consensus
    expect(identity.personality.generous).toBeGreaterThan(0);
    expect(identity.personality.patient).toBeGreaterThan(0);
  });

  it('should progress through emergence phases', () => {
    const deity = createMockDeity('test_god');
    deity.emergencePhase = 'nascent';
    deity.belief = 50;

    // Nascent -> Forming (100 belief)
    deity.belief = 120;
    let phase = updateEmergencePhase(deity);
    expect(phase).toBe('forming');

    // Forming -> Established (500 belief)
    deity.belief = 600;
    phase = updateEmergencePhase(deity);
    expect(phase).toBe('established');

    // Established -> Mature (2000 belief)
    deity.belief = 2500;
    phase = updateEmergencePhase(deity);
    expect(phase).toBe('mature');
  });

  it('should allow belief to shape nascent deity', () => {
    const deity = createMockDeity('test_god');
    deity.emergencePhase = 'nascent';
    deity.identity.domains = { harvest: 0.6 };

    // New believer perceives war aspect
    const newPerception = {
      agentId: 'warrior',
      name: 'War God',
      domains: { war: 0.9, victory: 0.7 },
      personality: { fierce: 0.8 },
    };

    const updated = incorporateNewPerception(deity, newPerception, mockWorld);

    // Nascent deity should be flexible
    expect(updated.identity.domains.war).toBeGreaterThan(0);
    expect(updated.identity.personality.fierce).toBeGreaterThan(0);
  });

  it('should resist identity changes in mature deity', () => {
    const deity = createMockDeity('test_god');
    deity.emergencePhase = 'mature';
    deity.identity.domains = { harvest: 0.95, agriculture: 0.8 };
    deity.belief = 3000;

    // New believer perceives war aspect (contradictory)
    const newPerception = {
      agentId: 'warrior',
      name: 'War God',
      domains: { war: 0.9, violence: 0.8 },
      personality: { wrathful: 0.9 },
    };

    const updated = incorporateNewPerception(deity, newPerception, mockWorld);

    // Mature deity resists radical change
    expect(updated.identity.domains.harvest).toBeGreaterThan(0.9); // Mostly unchanged
    expect(updated.identity.domains.war || 0).toBeLessThan(0.2); // Weak or absent
  });
});

describe('Domain Development', () => {
  it('should strengthen domains with consistent belief', () => {
    const deity = createMockDeity('test_god');
    deity.identity.domains = { healing: 0.5 };

    const prayers = [
      { agentId: 'a1', domain: 'healing', tick: 100 },
      { agentId: 'a2', domain: 'healing', tick: 105 },
      { agentId: 'a3', domain: 'healing', tick: 110 },
      { agentId: 'a4', domain: 'healing', tick: 115 },
    ];

    const updated = reinforceDomain(deity, 'healing', prayers);

    expect(updated.identity.domains.healing).toBeGreaterThan(0.5);
  });

  it('should weaken domains without belief', () => {
    const deity = createMockDeity('test_god');
    deity.identity.domains = { war: 0.7, healing: 0.3 };

    // Only war prayers
    const prayers = [
      { agentId: 'a1', domain: 'war', tick: 100 },
      { agentId: 'a2', domain: 'war', tick: 105 },
    ];

    const updated = updateDomainsFromPrayers(deity, prayers, 1000); // Many ticks passed

    expect(updated.identity.domains.war).toBeGreaterThanOrEqual(0.7); // Maintained
    expect(updated.identity.domains.healing).toBeLessThan(0.3); // Weakened
  });

  it('should add new domains through stories', () => {
    const deity = createMockDeity('test_god');
    deity.identity.domains = { harvest: 0.8 };

    const story = {
      content: 'The god blessed the sick child with healing',
      domains: { healing: 0.6 },
      retoldCount: 10,
      believedBy: ['a1', 'a2', 'a3', 'a4', 'a5'],
    };

    const updated = addDomainFromMythology(deity, story);

    expect(updated.identity.domains.healing).toBeGreaterThan(0);
  });

  it('should cap maximum domain strength at 1.0', () => {
    const deity = createMockDeity('test_god');
    deity.identity.domains = { death: 0.95 };

    const prayers = Array(100)
      .fill(null)
      .map((_, i) => ({
        agentId: `a${i}`,
        domain: 'death',
        tick: i,
      }));

    const updated = reinforceDomain(deity, 'death', prayers);

    expect(updated.identity.domains.death).toBeLessThanOrEqual(1.0);
  });

  it('should remove domains that reach zero', () => {
    const deity = createMockDeity('test_god');
    deity.identity.domains = { forgotten: 0.05 };

    // No prayers for this domain
    const updated = updateDomainsFromPrayers(deity, [], 5000);

    expect(updated.identity.domains.forgotten).toBeUndefined();
  });
});

describe('Personality Formation', () => {
  it('should form personality from believer perceptions', () => {
    const perceptions = [
      { agentId: 'a1', personality: { benevolent: 0.8, wise: 0.7, patient: 0.6 } },
      { agentId: 'a2', personality: { benevolent: 0.9, mysterious: 0.7, wise: 0.5 } },
      { agentId: 'a3', personality: { patient: 0.8, benevolent: 0.7, stern: 0.4 } },
    ];

    const personality = synthesizePersonality(perceptions);

    expect(personality.benevolent).toBeGreaterThan(0.7); // Strong consensus
    expect(personality.wise).toBeGreaterThan(0);
    expect(personality.patient).toBeGreaterThan(0);
  });

  it('should update personality from divine actions', () => {
    const deity = createMockDeity('test_god');
    deity.identity.personality = { benevolent: 0.6, mysterious: 0.5 };

    const action = {
      type: 'blessing',
      target: 'sick_child',
      outcome: 'healed',
      witnessed: true,
      witnessCount: 20,
    };

    const updated = updatePersonalityFromAction(deity, action);

    expect(updated.identity.personality.benevolent).toBeGreaterThan(0.6); // Increased
  });

  it('should develop contradictory traits from actions', () => {
    const deity = createMockDeity('test_god');
    deity.identity.personality = { benevolent: 0.8 };

    const harshAction = {
      type: 'curse',
      target: 'blasphemer',
      outcome: 'struck_down',
      witnessed: true,
      witnessCount: 15,
    };

    const updated = updatePersonalityFromAction(deity, harshAction);

    expect(updated.identity.personality.benevolent).toBeLessThan(0.8); // Decreased
    expect(updated.identity.personality.wrathful || 0).toBeGreaterThan(0); // Added
  });

  it('should average conflicting perceptions', () => {
    const perceptions = [
      { agentId: 'a1', personality: { benevolent: 0.9 } },
      { agentId: 'a2', personality: { wrathful: 0.9 } }, // Opposite
      { agentId: 'a3', personality: { benevolent: 0.8 } },
      { agentId: 'a4', personality: { wrathful: 0.7 } },
    ];

    const personality = synthesizePersonality(perceptions);

    // Both traits should exist but be moderated
    expect(personality.benevolent).toBeGreaterThan(0);
    expect(personality.wrathful).toBeGreaterThan(0);
    expect(personality.benevolent + personality.wrathful).toBeLessThan(1.8); // Not max on both
  });
});

describe('Alignment Calculation', () => {
  it('should calculate alignment from actions', () => {
    const deity = createMockDeity('test_god');

    const actions = [
      { type: 'blessing', target: 'good_person', outcome: 'prospered' },
      { type: 'blessing', target: 'innocent', outcome: 'protected' },
      { type: 'curse', target: 'evil_person', outcome: 'punished' },
      { type: 'blessing', target: 'generous_person', outcome: 'rewarded' },
    ];

    const alignment = calculateAlignmentFromActions(actions);

    expect(alignment.good_evil).toBeGreaterThan(0); // More good actions
    expect(alignment.law_chaos).toBeGreaterThan(0); // Consistent reward/punishment
  });

  it('should detect chaotic neutral deity', () => {
    const deity = createMockDeity('test_god');

    const actions = [
      { type: 'blessing', target: 'random_person', outcome: 'prospered' },
      { type: 'curse', target: 'random_person', outcome: 'struck_down' },
      { type: 'blessing', target: 'evil_person', outcome: 'prospered' }, // No pattern
      { type: 'curse', target: 'good_person', outcome: 'cursed' },
    ];

    const alignment = calculateAlignmentFromActions(actions);

    expect(Math.abs(alignment.good_evil)).toBeLessThan(0.3); // Neutral
    expect(alignment.law_chaos).toBeLessThan(0); // Chaotic
  });

  it('should detect lawful evil deity', () => {
    const deity = createMockDeity('test_god');

    const actions = [
      { type: 'curse', target: 'oath_breaker', outcome: 'struck_down' },
      { type: 'curse', target: 'oath_breaker', outcome: 'cursed' },
      { type: 'curse', target: 'rebel', outcome: 'punished' },
      { type: 'blessing', target: 'tyrant', outcome: 'empowered' }, // Rewards evil authority
    ];

    const alignment = calculateAlignmentFromActions(actions);

    expect(alignment.good_evil).toBeLessThan(0); // Evil
    expect(alignment.law_chaos).toBeGreaterThan(0); // Lawful
  });
});

describe('Divine Form Development', () => {
  it('should develop forms from believer visions', () => {
    const deity = createMockDeity('test_god');
    deity.identity.forms = [];

    const visions = [
      {
        believerId: 'a1',
        description: 'A towering figure wreathed in golden light',
        features: { height: 'tall', aura: 'golden', presence: 'majestic' },
      },
      {
        believerId: 'a2',
        description: 'A being of pure radiance',
        features: { aura: 'golden', form: 'indistinct', presence: 'overwhelming' },
      },
      {
        believerId: 'a3',
        description: 'A king with a crown of stars',
        features: { height: 'tall', crown: 'stars', presence: 'regal' },
      },
    ];

    const forms = synthesizeFormsFromVisions(visions);

    expect(forms.length).toBeGreaterThan(0);
    expect(forms[0].features).toContain('golden'); // Common feature
  });

  it('should allow multiple forms for mature deities', () => {
    const deity = createMockDeity('test_god');
    deity.emergencePhase = 'mature';
    deity.identity.forms = [
      { description: 'Old man with staff', features: { age: 'old', item: 'staff' } },
    ];

    const newVision = {
      believerId: 'a1',
      description: 'Young warrior with sword',
      features: { age: 'young', item: 'sword', demeanor: 'fierce' },
    };

    const updated = addFormFromVision(deity, newVision);

    expect(updated.identity.forms.length).toBe(2); // Multiple forms
  });

  it('should prefer consistent forms for nascent deities', () => {
    const deity = createMockDeity('test_god');
    deity.emergencePhase = 'nascent';
    deity.identity.forms = [
      { description: 'Kind shepherd', features: { role: 'shepherd', demeanor: 'kind' } },
    ];

    const newVision = {
      believerId: 'a1',
      description: 'Shepherd with golden crook',
      features: { role: 'shepherd', item: 'crook', material: 'gold' },
    };

    const updated = addFormFromVision(deity, newVision);

    // Should merge with existing form rather than create new
    expect(updated.identity.forms.length).toBe(1);
    expect(updated.identity.forms[0].features).toContain('shepherd');
    expect(updated.identity.forms[0].features).toContain('crook');
  });
});

// Helper functions
function createMockWorld(): World {
  return {} as any;
}

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
    emergencePhase: 'nascent',
  } as any;
}

function checkEmergenceThreshold(patterns: any[], config: any): boolean {
  if (patterns.length < config.minBelievers) return false;
  const avgStrength = patterns.reduce((sum, p) => sum + p.strength, 0) / patterns.length;
  if (avgStrength < config.minAverageStrength) return false;
  return true;
}

function emergeDeity(patterns: any[], world: World): Deity {
  const deity = createMockDeity(`deity_${Date.now()}`);
  deity.believers = patterns.map((p: any) => p.agentId);
  deity.identity.perceivedName = patterns[0].concept;
  deity.emergencePhase = 'nascent';
  return deity;
}

function synthesizeIdentity(perceptions: any[]): DeityIdentity {
  const identity: DeityIdentity = {
    perceivedName: perceptions[0].name,
    domains: {},
    personality: {},
    alignment: { law_chaos: 0, good_evil: 0, selfless_selfish: 0 },
    forms: [],
  };

  // Average domains
  for (const p of perceptions) {
    for (const [domain, strength] of Object.entries(p.domains)) {
      identity.domains[domain as keyof typeof identity.domains] =
        ((identity.domains[domain as keyof typeof identity.domains] as number) || 0) + (strength as number) / perceptions.length;
    }
  }

  // Average personality
  for (const p of perceptions) {
    for (const [trait, strength] of Object.entries(p.personality)) {
      (identity.personality as any)[trait] = ((identity.personality as any)[trait] || 0) + strength / perceptions.length;
    }
  }

  return identity;
}

function updateEmergencePhase(deity: Deity): EmergencePhase {
  if (deity.belief >= 2000) return 'mature';
  if (deity.belief >= 500) return 'established';
  if (deity.belief >= 100) return 'forming';
  return 'nascent';
}

function incorporateNewPerception(deity: Deity, perception: any, world: World): Deity {
  const flexibility = deity.emergencePhase === 'nascent' ? 0.8 : deity.emergencePhase === 'forming' ? 0.5 : 0.2;

  const updated = { ...deity };
  for (const [domain, strength] of Object.entries(perception.domains)) {
    const current = (updated.identity.domains as any)[domain] || 0;
    (updated.identity.domains as any)[domain] = current + (strength as number) * flexibility;
  }

  return updated;
}

function reinforceDomain(deity: Deity, domain: string, prayers: any[]): Deity {
  const updated = { ...deity };
  const current = (updated.identity.domains as any)[domain] || 0;
  const increase = Math.min(prayers.length * 0.01, 0.3);
  (updated.identity.domains as any)[domain] = Math.min(1.0, current + increase);
  return updated;
}

function updateDomainsFromPrayers(deity: Deity, prayers: any[], ticksPassed: number): Deity {
  const updated = { ...deity };
  const decay = Math.min(ticksPassed * 0.0001, 0.5);

  for (const domain of Object.keys(updated.identity.domains)) {
    const prayerCount = prayers.filter((p) => p.domain === domain).length;
    if (prayerCount === 0) {
      const current = (updated.identity.domains as any)[domain];
      (updated.identity.domains as any)[domain] = Math.max(0, current - decay);
      if ((updated.identity.domains as any)[domain] === 0) {
        delete (updated.identity.domains as any)[domain];
      }
    }
  }

  return updated;
}

function addDomainFromMythology(deity: Deity, story: any): Deity {
  const updated = { ...deity };
  const influence = (story.retoldCount / 10) * (story.believedBy.length / deity.believers.length);

  for (const [domain, strength] of Object.entries(story.domains)) {
    const current = (updated.identity.domains as any)[domain] || 0;
    (updated.identity.domains as any)[domain] = Math.min(1.0, current + (strength as number) * influence * 0.5);
  }

  return updated;
}

function synthesizePersonality(perceptions: any[]): any {
  const personality: any = {};

  for (const p of perceptions) {
    for (const [trait, strength] of Object.entries(p.personality)) {
      personality[trait] = (personality[trait] || 0) + (strength as number) / perceptions.length;
    }
  }

  return personality;
}

function updatePersonalityFromAction(deity: Deity, action: any): Deity {
  const updated = { ...deity };
  const impact = action.witnessed ? (action.witnessCount / deity.believers.length) * 0.1 : 0.02;

  if (action.type === 'blessing') {
    const current = updated.identity.personality.benevolent || 0;
    updated.identity.personality.benevolent = Math.min(1.0, current + impact);
  } else if (action.type === 'curse') {
    const currentBenevolent = updated.identity.personality.benevolent || 0;
    updated.identity.personality.benevolent = Math.max(0, currentBenevolent - impact);
    const currentWrathful = (updated.identity.personality as any).wrathful || 0;
    (updated.identity.personality as any).wrathful = Math.min(1.0, currentWrathful + impact);
  }

  return updated;
}

function calculateAlignmentFromActions(actions: any[]): any {
  let goodEvil = 0;
  let lawChaos = 0;

  for (const action of actions) {
    if (action.type === 'blessing') goodEvil += 0.1;
    if (action.type === 'curse') goodEvil -= 0.1;

    // Check for consistency (law) vs randomness (chaos)
    const isConsistent = actions.filter((a) => a.target === action.target && a.outcome === action.outcome).length > 1;
    if (isConsistent) lawChaos += 0.05;
  }

  return {
    good_evil: Math.max(-1, Math.min(1, goodEvil)),
    law_chaos: Math.max(-1, Math.min(1, lawChaos)),
    selfless_selfish: 0,
  };
}

function synthesizeFormsFromVisions(visions: any[]): any[] {
  const commonFeatures: any = {};

  for (const vision of visions) {
    for (const [feature, value] of Object.entries(vision.features)) {
      commonFeatures[feature] = (commonFeatures[feature] || 0) + 1;
    }
  }

  const form = {
    description: visions[0].description,
    features: Object.keys(commonFeatures).filter((f) => commonFeatures[f] >= 2),
  };

  return [form];
}

function addFormFromVision(deity: Deity, vision: any): Deity {
  const updated = { ...deity };

  if (deity.emergencePhase === 'nascent') {
    // Merge with existing form
    if (updated.identity.forms.length > 0) {
      const existing = updated.identity.forms[0];
      for (const [feature, value] of Object.entries(vision.features)) {
        if (!existing.features.includes(feature)) {
          existing.features.push(feature);
        }
      }
    }
  } else {
    // Add new form
    updated.identity.forms.push({
      description: vision.description,
      features: Object.keys(vision.features),
    });
  }

  return updated;
}
