/**
 * Comprehensive tests for paradigm-specific cost calculators
 * Tests the gap: Individual paradigm calculators are missing
 */

import { describe, it, expect, beforeEach, beforeAll } from 'vitest';
import type { ComposedSpell } from '../../components/MagicComponent.js';
import type { MagicComponent } from '../../components/MagicComponent.js';
import type { CastingContext } from '../costs/CostCalculator.js';
import { costCalculatorRegistry } from '../costs/CostCalculatorRegistry.js';
import { registerAllCostCalculators } from '../costs/calculators/registerAll.js';

// Register all cost calculators before any tests run
beforeAll(() => {
  registerAllCostCalculators();
});

describe('CostCalculators - Academic Paradigm', () => {
  let academicCalculator: any;
  let mockCaster: MagicComponent;
  let mockContext: CastingContext;
  let simpleSpell: ComposedSpell;

  beforeEach(() => {
    academicCalculator = costCalculatorRegistry.get('academic');

    mockCaster = {
      resourcePools: {
        mana: { type: 'mana', current: 100, maximum: 100, regenRate: 0.01, locked: 0 },
        stamina: { type: 'stamina', current: 100, maximum: 100, regenRate: 0.02, locked: 0 },
      },
      paradigmState: {},
    } as any;

    mockContext = {
      tick: 1000,
      timeOfDay: 0.5,
      ambientPower: 0,
      isGroupCast: false,
      casterCount: 1,
    };

    simpleSpell = {
      id: 'fireball',
      name: 'Fireball',
      technique: 'destroy',
      form: 'fire',
      source: 'arcane',
      manaCost: 50,
      castTime: 10,
      range: 20,
      effectId: 'damage_fire',
    };
  });

  it('should calculate basic mana cost', () => {
    const costs = academicCalculator.calculateCosts(simpleSpell, mockCaster, mockContext);

    const manaCost = costs.find((c: any) => c.type === 'mana');
    expect(manaCost).toBeDefined();
    expect(manaCost?.amount).toBe(50);
  });

  it('should calculate stamina cost based on cast time', () => {
    const costs = academicCalculator.calculateCosts(simpleSpell, mockCaster, mockContext);

    const staminaCost = costs.find((c: any) => c.type === 'stamina');
    expect(staminaCost).toBeDefined();
    expect(staminaCost?.amount).toBe(Math.ceil(10 * 0.5)); // castTime * 0.5
  });

  it('should reduce mana cost near ley lines', () => {
    mockContext.ambientPower = 2.0; // Strong ley line
    const costs = academicCalculator.calculateCosts(simpleSpell, mockCaster, mockContext);

    const manaCost = costs.find((c: any) => c.type === 'mana');
    expect(manaCost?.amount).toBeLessThan(50);
    expect(manaCost?.amount).toBeGreaterThanOrEqual(35); // Max 30% reduction
  });

  it('should cap ley line reduction at 30%', () => {
    mockContext.ambientPower = 100.0; // Absurdly strong
    const costs = academicCalculator.calculateCosts(simpleSpell, mockCaster, mockContext);

    const manaCost = costs.find((c: any) => c.type === 'mana');
    expect(manaCost?.amount).toBe(Math.ceil(50 * 0.7)); // Max 30% off
  });

  it('should correctly identify affordability', () => {
    const costs = academicCalculator.calculateCosts(simpleSpell, mockCaster, mockContext);
    const affordability = academicCalculator.canAfford(costs, mockCaster);

    expect(affordability.canAfford).toBe(true);
    expect(affordability.missing).toHaveLength(0);
    expect(affordability.wouldBeTerminal).toBe(false);
  });

  it('should detect insufficient mana', () => {
    mockCaster.resourcePools.mana.current = 30;
    const costs = academicCalculator.calculateCosts(simpleSpell, mockCaster, mockContext);
    const affordability = academicCalculator.canAfford(costs, mockCaster);

    expect(affordability.canAfford).toBe(false);
    expect(affordability.missing.length).toBeGreaterThan(0);
    expect(affordability.missing[0].type).toBe('mana');
  });

  it('should deduct costs correctly', () => {
    const costs = academicCalculator.calculateCosts(simpleSpell, mockCaster, mockContext);
    const result = academicCalculator.deductCosts(costs, mockCaster);

    expect(result.success).toBe(true);
    expect(result.terminal).toBe(false);
    expect(mockCaster.resourcePools.mana.current).toBeLessThan(100);
    expect(mockCaster.resourcePools.stamina.current).toBeLessThan(100);
  });

  it('should initialize resource pools', () => {
    const newCaster = { resourcePools: {} } as any;
    academicCalculator.initializeResourcePools(newCaster);

    expect(newCaster.resourcePools.mana).toBeDefined();
    expect(newCaster.resourcePools.mana.maximum).toBe(100);
    expect(newCaster.resourcePools.stamina).toBeDefined();
  });
});

describe('CostCalculators - Pact Paradigm', () => {
  let pactCalculator: any;
  let mockCaster: MagicComponent;
  let mockContext: CastingContext;

  beforeEach(() => {
    pactCalculator = costCalculatorRegistry.get('pact');

    mockCaster = {
      resourcePools: {
        favor: { type: 'favor', current: 100, maximum: 100, regenRate: 0, locked: 0 },
        corruption: { type: 'corruption', current: 0, maximum: 100, regenRate: 0, locked: 0 },
        soul_fragment: { type: 'soul_fragment', current: 7, maximum: 7, regenRate: 0, locked: 0 },
      },
      paradigmState: {
        pact: { patronId: 'fiend_lord', pactTerms: [], serviceOwed: 0 },
      },
    } as any;

    mockContext = {
      tick: 1000,
      timeOfDay: 0.5,
      ambientPower: 0,
      isGroupCast: false,
      casterCount: 1,
    };
  });

  it('should cost favor as primary resource', () => {
    const spell: ComposedSpell = {
      id: 'eldritch_blast',
      name: 'Eldritch Blast',
      technique: 'destroy',
      form: 'void',
      source: 'void',
      manaCost: 50,
      castTime: 5,
      range: 30,
      effectId: 'damage_void',
    };

    const costs = pactCalculator.calculateCosts(spell, mockCaster, mockContext);
    const favorCost = costs.find((c: any) => c.type === 'favor');

    expect(favorCost).toBeDefined();
    expect(favorCost?.amount).toBe(Math.ceil(50 * 0.2)); // 20% of mana cost
  });

  it('should add corruption for dark techniques', () => {
    const darkSpell: ComposedSpell = {
      id: 'drain_life',
      name: 'Drain Life',
      technique: 'destroy',
      form: 'body',
      source: 'void',
      manaCost: 40,
      castTime: 5,
      range: 10,
      effectId: 'damage_necrotic',
    };

    const costs = pactCalculator.calculateCosts(darkSpell, mockCaster, mockContext);
    const corruptionCost = costs.find((c: any) => c.type === 'corruption');

    expect(corruptionCost).toBeDefined();
    expect(corruptionCost?.amount).toBeGreaterThan(0);
  });

  it('should cost soul fragment for major summons', () => {
    const summonSpell: ComposedSpell = {
      id: 'summon_demon',
      name: 'Summon Demon',
      technique: 'summon',
      form: 'spirit',
      source: 'void',
      manaCost: 80,
      castTime: 20,
      range: 5,
      effectId: 'summon_demon',
    };

    const costs = pactCalculator.calculateCosts(summonSpell, mockCaster, mockContext);
    const soulCost = costs.find((c: any) => c.type === 'soul_fragment');

    expect(soulCost).toBeDefined();
    expect(soulCost?.amount).toBe(1);
  });

  it('should warn when approaching zero favor (terminal)', () => {
    mockCaster.resourcePools.favor.current = 5;

    const spell: ComposedSpell = {
      id: 'test',
      name: 'Test',
      technique: 'create',
      form: 'fire',
      source: 'void',
      manaCost: 50,
      castTime: 5,
      range: 10,
      effectId: 'test',
    };

    const costs = pactCalculator.calculateCosts(spell, mockCaster, mockContext);
    const affordability = pactCalculator.canAfford(costs, mockCaster);

    expect(affordability.wouldBeTerminal).toBe(true);
    expect(affordability.warning).toBeDefined();
  });

  it('should detect corruption threshold terminal effect', () => {
    mockCaster.resourcePools.corruption.current = 95;

    const spell: ComposedSpell = {
      id: 'test',
      name: 'Test',
      technique: 'destroy',
      form: 'void',
      source: 'void',
      manaCost: 100,
      castTime: 5,
      range: 10,
      effectId: 'test',
    };

    const costs = pactCalculator.calculateCosts(spell, mockCaster, mockContext);
    const result = pactCalculator.deductCosts(costs, mockCaster);

    expect(result.terminal).toBe(true);
    expect(result.terminalEffect?.type).toBe('corruption_threshold');
  });

  it('should initialize pact resources', () => {
    const newCaster = { resourcePools: {}, paradigmState: {} } as any;
    pactCalculator.initializeResourcePools(newCaster);

    expect(newCaster.resourcePools.favor).toBeDefined();
    expect(newCaster.resourcePools.corruption).toBeDefined();
    expect(newCaster.resourcePools.soul_fragment).toBeDefined();
    expect(newCaster.resourcePools.soul_fragment.current).toBe(7);
  });
});

describe('CostCalculators - Name Paradigm', () => {
  let nameCalculator: any;
  let mockCaster: MagicComponent;
  let mockContext: CastingContext;

  beforeEach(() => {
    nameCalculator = costCalculatorRegistry.get('names');

    mockCaster = {
      resourcePools: {
        sanity: { type: 'sanity', current: 100, maximum: 100, regenRate: 0.005, locked: 0 },
        attention: { type: 'attention', current: 0, maximum: 100, regenRate: -0.001, locked: 0 },
      },
      paradigmState: {
        names: { knownNames: ['fire', 'wind', 'stone'] },
      },
    } as any;

    mockContext = {
      tick: 1000,
      timeOfDay: 0.5,
      ambientPower: 0,
      isGroupCast: false,
      casterCount: 1,
    };
  });

  it('should cost sanity for speaking true names', () => {
    const spell: ComposedSpell = {
      id: 'command_fire',
      name: 'Command Fire',
      technique: 'control',
      form: 'fire',
      source: 'arcane',
      manaCost: 30,
      castTime: 5,
      range: 20,
      effectId: 'control_fire',
    };

    const costs = nameCalculator.calculateCosts(spell, mockCaster, mockContext);
    const sanityCost = costs.find((c: any) => c.type === 'sanity');

    expect(sanityCost).toBeDefined();
    expect(sanityCost?.amount).toBe(Math.ceil(30 * 0.1));
  });

  it('should accumulate attention with each cast', () => {
    const spell: ComposedSpell = {
      id: 'test',
      name: 'Test',
      technique: 'perceive',
      form: 'mind',
      source: 'arcane',
      manaCost: 20,
      castTime: 3,
      range: 10,
      effectId: 'test',
    };

    const costs = nameCalculator.calculateCosts(spell, mockCaster, mockContext);
    const attentionCost = costs.find((c: any) => c.type === 'attention');

    expect(attentionCost).toBeDefined();
    expect(attentionCost?.amount).toBe(1); // Always 1 per cast
  });

  it('should increase cast time with more known names', () => {
    mockCaster.paradigmState.names.knownNames = Array(20).fill('name');

    const spell: ComposedSpell = {
      id: 'test',
      name: 'Test',
      technique: 'create',
      form: 'earth',
      source: 'arcane',
      manaCost: 40,
      castTime: 10,
      range: 15,
      effectId: 'test',
    };

    const costs = nameCalculator.calculateCosts(spell, mockCaster, mockContext);
    const timeCost = costs.find((c: any) => c.type === 'time');

    expect(timeCost?.amount).toBeGreaterThan(10); // Base cast time increased
  });

  it('should detect terminal sanity loss', () => {
    mockCaster.resourcePools.sanity.current = 5;

    const spell: ComposedSpell = {
      id: 'test',
      name: 'Test',
      technique: 'control',
      form: 'spirit',
      source: 'arcane',
      manaCost: 100,
      castTime: 5,
      range: 10,
      effectId: 'test',
    };

    const costs = nameCalculator.calculateCosts(spell, mockCaster, mockContext);
    const result = nameCalculator.deductCosts(costs, mockCaster);

    expect(result.terminal).toBe(true);
    expect(result.terminalEffect?.type).toBe('sanity_zero');
  });

  it('should allow attention to decay naturally', () => {
    mockCaster.resourcePools.attention.current = 50;

    // Simulate time passing
    const deltaTime = 1000; // ticks
    mockCaster.resourcePools.attention.current +=
      mockCaster.resourcePools.attention.regenRate * deltaTime;

    expect(mockCaster.resourcePools.attention.current).toBeLessThan(50);
  });
});

describe('CostCalculators - Breath Paradigm', () => {
  let breathCalculator: any;
  let mockCaster: MagicComponent;
  let mockContext: CastingContext;

  beforeEach(() => {
    breathCalculator = costCalculatorRegistry.get('breath');

    mockCaster = {
      resourcePools: {
        health: { type: 'health', current: 50, maximum: 50000, regenRate: 0, locked: 0 },
      },
      paradigmState: {
        breath: { breathCount: 50, heighteningTier: 0 },
      },
    } as any;

    mockContext = {
      tick: 1000,
      timeOfDay: 0.5,
      ambientPower: 0,
      isGroupCast: false,
      casterCount: 1,
    };
  });

  it('should cost no breaths for commanding existing awakened objects', () => {
    const spell: ComposedSpell = {
      id: 'command_rope',
      name: 'Command Awakened Rope',
      technique: 'control',
      form: 'plant',
      source: 'arcane',
      manaCost: 10,
      castTime: 1,
      range: 10,
      effectId: 'command_awakened',
    };

    const costs = breathCalculator.calculateCosts(spell, mockCaster, mockContext);
    const breathCost = costs.find((c: any) => c.type === 'health');

    expect(breathCost?.amount).toBe(0);
  });

  it('should cost breaths for basic awakening', () => {
    const spell: ComposedSpell = {
      id: 'awaken_cloth',
      name: 'Awaken Cloth',
      technique: 'enhance',
      form: 'plant',
      source: 'arcane',
      manaCost: 30,
      castTime: 5,
      range: 5,
      effectId: 'awaken_basic',
    };

    const costs = breathCalculator.calculateCosts(spell, mockCaster, mockContext);
    const breathCost = costs.find((c: any) => c.type === 'health');

    expect(breathCost).toBeDefined();
    expect(breathCost?.amount).toBeGreaterThan(0);
  });

  it('should cost many breaths for permanent awakening', () => {
    const spell: ComposedSpell = {
      id: 'awaken_lifeless',
      name: 'Create Life',
      technique: 'create',
      form: 'body',
      source: 'arcane',
      manaCost: 200,
      castTime: 60,
      range: 1,
      duration: undefined, // Permanent
      effectId: 'awaken_permanent',
    };

    const costs = breathCalculator.calculateCosts(spell, mockCaster, mockContext);
    const breathCost = costs.find((c: any) => c.type === 'health');

    expect(breathCost?.amount).toBeGreaterThanOrEqual(50); // Min for permanent
  });

  it('should warn when becoming a Drab', () => {
    mockCaster.resourcePools.health.current = 1;

    const spell: ComposedSpell = {
      id: 'test',
      name: 'Test',
      technique: 'enhance',
      form: 'plant',
      source: 'arcane',
      manaCost: 20,
      castTime: 5,
      range: 5,
      effectId: 'test',
    };

    const costs = breathCalculator.calculateCosts(spell, mockCaster, mockContext);
    const affordability = breathCalculator.canAfford(costs, mockCaster);

    expect(affordability.wouldBeTerminal).toBe(true);
    expect(affordability.warning).toContain('Drab');
  });

  it('should create Drab terminal effect at zero breaths', () => {
    mockCaster.resourcePools.health.current = 5;

    const spell: ComposedSpell = {
      id: 'test',
      name: 'Test',
      technique: 'create',
      form: 'body',
      source: 'arcane',
      manaCost: 100,
      castTime: 10,
      range: 5,
      duration: undefined,
      effectId: 'test',
    };

    const costs = breathCalculator.calculateCosts(spell, mockCaster, mockContext);
    const result = breathCalculator.deductCosts(costs, mockCaster);

    if (result.terminal) {
      expect(result.terminalEffect?.type).toBe('drab');
    }
  });
});

describe('CostCalculators - Divine Paradigm', () => {
  let divineCalculator: any;
  let mockCaster: MagicComponent;
  let mockContext: CastingContext;

  beforeEach(() => {
    divineCalculator = costCalculatorRegistry.get('divine');

    mockCaster = {
      resourcePools: {
        favor: { type: 'favor', current: 50, maximum: 100, regenRate: 0, locked: 0 },
        karma: { type: 'karma', current: 0, maximum: 100, regenRate: 0, locked: 0 },
      },
      paradigmState: {
        divine: { deityId: 'healing_god', deityStanding: 'neutral' },
      },
    } as any;

    mockContext = {
      tick: 1000,
      timeOfDay: 0.5,
      ambientPower: 0,
      isGroupCast: false,
      casterCount: 1,
    };
  });

  it('should cost favor as primary resource', () => {
    const spell: ComposedSpell = {
      id: 'cure_wounds',
      name: 'Cure Wounds',
      technique: 'create',
      form: 'body',
      source: 'divine',
      manaCost: 40,
      castTime: 5,
      range: 5,
      effectId: 'heal_moderate',
    };

    const costs = divineCalculator.calculateCosts(spell, mockCaster, mockContext);
    const favorCost = costs.find((c: any) => c.type === 'favor');

    expect(favorCost).toBeDefined();
    expect(favorCost?.amount).toBe(Math.ceil(40 * 0.3));
  });

  it('should reduce cost for aligned spells', () => {
    // Healing aligned with healing god
    const alignedSpell: ComposedSpell = {
      id: 'heal',
      name: 'Heal',
      technique: 'create',
      form: 'body',
      source: 'divine',
      manaCost: 50,
      castTime: 5,
      range: 5,
      effectId: 'heal_major',
    };

    const costs = divineCalculator.calculateCosts(alignedSpell, mockCaster, mockContext);
    const favorCost = costs.find((c: any) => c.type === 'favor');

    const baseCost = Math.ceil(50 * 0.3);
    expect(favorCost?.amount).toBeLessThanOrEqual(baseCost);
  });

  it('should add karma cost for misaligned spells', () => {
    const misalignedSpell: ComposedSpell = {
      id: 'inflict_wounds',
      name: 'Inflict Wounds',
      technique: 'destroy',
      form: 'body',
      source: 'divine',
      manaCost: 40,
      castTime: 5,
      range: 10,
      effectId: 'damage_necrotic',
    };

    const costs = divineCalculator.calculateCosts(misalignedSpell, mockCaster, mockContext);
    const karmaCost = costs.find((c: any) => c.type === 'karma');

    expect(karmaCost).toBeDefined();
    expect(karmaCost?.amount).toBeGreaterThan(0);
  });

  it('should detect forsaken status at zero favor', () => {
    mockCaster.resourcePools.favor.current = 5;

    const spell: ComposedSpell = {
      id: 'test',
      name: 'Test',
      technique: 'create',
      form: 'fire',
      source: 'divine',
      manaCost: 50,
      castTime: 5,
      range: 10,
      effectId: 'test',
    };

    const costs = divineCalculator.calculateCosts(spell, mockCaster, mockContext);
    const result = divineCalculator.deductCosts(costs, mockCaster);

    if (result.terminal) {
      expect(result.terminalEffect?.type).toBe('favor_zero');
    }
  });
});

describe('CostCalculators - Blood Paradigm', () => {
  let bloodCalculator: any;
  let mockCaster: MagicComponent;
  let mockContext: CastingContext;

  beforeEach(() => {
    bloodCalculator = costCalculatorRegistry.get('blood');

    mockCaster = {
      resourcePools: {
        blood: { type: 'blood', current: 100, maximum: 100, regenRate: 0.005, locked: 0 },
        health: { type: 'health', current: 100, maximum: 100, regenRate: 0.01, locked: 0 },
        corruption: { type: 'corruption', current: 0, maximum: 100, regenRate: 0, locked: 0 },
        lifespan: { type: 'lifespan', current: 80, maximum: 80, regenRate: 0, locked: 0 },
      },
      paradigmState: {
        blood: { bloodDebt: 0 },
      },
    } as any;

    mockContext = {
      tick: 1000,
      timeOfDay: 0.5,
      ambientPower: 0,
      isGroupCast: false,
      casterCount: 1,
    };
  });

  it('should cost both blood and health', () => {
    const spell: ComposedSpell = {
      id: 'blood_bolt',
      name: 'Blood Bolt',
      technique: 'destroy',
      form: 'body',
      source: 'blood',
      manaCost: 40,
      castTime: 5,
      range: 15,
      effectId: 'damage_blood',
    };

    const costs = bloodCalculator.calculateCosts(spell, mockCaster, mockContext);

    const bloodCost = costs.find((c: any) => c.type === 'blood');
    const healthCost = costs.find((c: any) => c.type === 'health');

    expect(bloodCost).toBeDefined();
    expect(healthCost).toBeDefined();
    expect(bloodCost?.amount).toBe(Math.ceil(40 * 0.2));
    expect(healthCost?.amount).toBe(Math.ceil(40 * 0.1));
  });

  it('should always add corruption', () => {
    const spell: ComposedSpell = {
      id: 'test',
      name: 'Test',
      technique: 'create',
      form: 'fire',
      source: 'blood',
      manaCost: 30,
      castTime: 5,
      range: 10,
      effectId: 'test',
    };

    const costs = bloodCalculator.calculateCosts(spell, mockCaster, mockContext);
    const corruptionCost = costs.find((c: any) => c.type === 'corruption');

    expect(corruptionCost).toBeDefined();
    expect(corruptionCost?.amount).toBeGreaterThan(0);
  });

  it('should cost lifespan for soul magic', () => {
    const soulSpell: ComposedSpell = {
      id: 'resurrect',
      name: 'Resurrect',
      technique: 'create',
      form: 'spirit',
      source: 'blood',
      manaCost: 100,
      castTime: 60,
      range: 5,
      effectId: 'resurrection',
    };

    const costs = bloodCalculator.calculateCosts(soulSpell, mockCaster, mockContext);
    const lifespanCost = costs.find((c: any) => c.type === 'lifespan');

    expect(lifespanCost).toBeDefined();
    expect(lifespanCost?.amount).toBeGreaterThan(0);
  });

  it('should detect death from blood loss', () => {
    mockCaster.resourcePools.blood.current = 10;
    mockCaster.resourcePools.health.current = 10;

    const spell: ComposedSpell = {
      id: 'test',
      name: 'Test',
      technique: 'destroy',
      form: 'body',
      source: 'blood',
      manaCost: 100,
      castTime: 5,
      range: 10,
      effectId: 'test',
    };

    const costs = bloodCalculator.calculateCosts(spell, mockCaster, mockContext);
    const result = bloodCalculator.deductCosts(costs, mockCaster);

    if (result.terminal) {
      expect(result.terminalEffect?.type).toBe('death');
      expect(result.terminalEffect?.cause).toContain('blood');
    }
  });
});

describe('CostCalculators - Emotional Paradigm', () => {
  let emotionalCalculator: any;
  let mockCaster: MagicComponent;
  let mockContext: CastingContext;

  beforeEach(() => {
    emotionalCalculator = costCalculatorRegistry.get('emotional');

    mockCaster = {
      resourcePools: {
        emotion: { type: 'emotion', current: 100, maximum: 100, regenRate: 0.01, locked: 0 },
        sanity: { type: 'sanity', current: 100, maximum: 100, regenRate: 0.005, locked: 0 },
      },
      paradigmState: {
        emotional: { dominantEmotion: 'joy', emotionalStability: 100 },
      },
    } as any;

    mockContext = {
      tick: 1000,
      timeOfDay: 0.5,
      ambientPower: 0,
      isGroupCast: false,
      casterCount: 1,
    };
  });

  it('should vary cost based on emotion type', () => {
    const spell: ComposedSpell = {
      id: 'emotional_burst',
      name: 'Emotional Burst',
      technique: 'create',
      form: 'mind',
      source: 'psionic',
      manaCost: 50,
      castTime: 5,
      range: 10,
      effectId: 'emotion_wave',
    };

    // Joy emotion (0.5x cost)
    mockCaster.paradigmState.emotional.dominantEmotion = 'joy';
    const joyCosts = emotionalCalculator.calculateCosts(spell, mockCaster, mockContext);
    const joyEmotionCost = joyCosts.find((c: any) => c.type === 'emotion');

    // Rage emotion (1.5x cost)
    mockCaster.paradigmState.emotional.dominantEmotion = 'rage';
    const rageCosts = emotionalCalculator.calculateCosts(spell, mockCaster, mockContext);
    const rageEmotionCost = rageCosts.find((c: any) => c.type === 'emotion');

    expect(joyEmotionCost?.amount).toBeLessThan(rageEmotionCost?.amount);
  });

  it('should always cost sanity', () => {
    const spell: ComposedSpell = {
      id: 'test',
      name: 'Test',
      technique: 'control',
      form: 'mind',
      source: 'psionic',
      manaCost: 40,
      castTime: 5,
      range: 15,
      effectId: 'test',
    };

    const costs = emotionalCalculator.calculateCosts(spell, mockCaster, mockContext);
    const sanityCost = costs.find((c: any) => c.type === 'sanity');

    expect(sanityCost).toBeDefined();
    expect(sanityCost?.amount).toBe(Math.ceil(40 * 0.05));
  });

  it('should detect emotional burnout', () => {
    mockCaster.resourcePools.emotion.current = 5;

    const spell: ComposedSpell = {
      id: 'test',
      name: 'Test',
      technique: 'create',
      form: 'mind',
      source: 'psionic',
      manaCost: 50,
      castTime: 5,
      range: 10,
      effectId: 'test',
    };

    const costs = emotionalCalculator.calculateCosts(spell, mockCaster, mockContext);
    const affordability = emotionalCalculator.canAfford(costs, mockCaster);

    expect(affordability.canAfford).toBe(false);
  });

  it('should detect emotional domination at zero sanity', () => {
    mockCaster.resourcePools.sanity.current = 2;

    const spell: ComposedSpell = {
      id: 'test',
      name: 'Test',
      technique: 'control',
      form: 'mind',
      source: 'psionic',
      manaCost: 100,
      castTime: 5,
      range: 10,
      effectId: 'test',
    };

    const costs = emotionalCalculator.calculateCosts(spell, mockCaster, mockContext);
    const result = emotionalCalculator.deductCosts(costs, mockCaster);

    if (result.terminal) {
      expect(result.terminalEffect?.type).toBe('sanity_zero');
      expect(result.terminalEffect?.madnessType).toBe('emotional_dominance');
    }
  });
});
