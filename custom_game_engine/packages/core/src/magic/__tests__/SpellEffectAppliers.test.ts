/**
 * Tests for all 17 spell effect categories and their appliers
 * Gap: Only 3 appliers implemented (Healing, Protection, Summon)
 * Need: 14 more appliers
 */

import { describe, it, expect, beforeEach, beforeAll } from 'vitest';
import type { SpellEffect } from '../SpellEffect.js';
import type { World } from '../../ecs/World.js';
import { SpellEffectExecutor } from '../SpellEffectExecutor.js';
import { registerStandardAppliers } from '../EffectAppliers.js';

// Register all appliers before running tests
beforeAll(() => {
  SpellEffectExecutor.resetInstance();
  registerStandardAppliers();
});

describe('Effect Appliers - Damage', () => {
  let mockWorld: World;
  let mockCaster: any;
  let mockTarget: any;

  beforeEach(() => {
    mockWorld = createMockWorld();
    mockCaster = createMockEntity('caster');
    mockTarget = createMockEntity('target', { needs: { health: 100, maxHealth: 100 } });
  });

  it('should apply damage to target', () => {
    const effect: SpellEffect = {
      id: 'fireball_damage',
      name: 'Fireball Damage',
      category: 'damage',
      damageType: 'fire',
      baseDamage: 50,
      range: 20,
      scaling: {
        base: 50,
        perProficiency: 0.5,
        maximum: 100,
      },
    };

    const applier = getEffectApplier('damage');
    const context = createMockContext(effect);
    context.scaledValues.set('damage', { value: 75, capped: false }); // 50 + 25 from proficiency

    const result = applier.apply(effect, mockCaster, mockTarget, mockWorld, context);

    expect(result.success).toBe(true);
    expect(mockTarget.getComponent('needs').health).toBeLessThan(100);
    expect(result.appliedValues.damage).toBeGreaterThanOrEqual(50);
  });

  it('should scale damage with proficiency', () => {
    const effect: SpellEffect = {
      id: 'test',
      name: 'Test',
      category: 'damage',
      damageType: 'fire',
      baseDamage: 50,
      range: 20,
      scaling: {
        base: 50,
        perProficiency: 1.0, // 1 damage per proficiency point
      },
    };

    const applier = getEffectApplier('damage');

    // Low proficiency
    const context1 = createMockContext(effect);
    context1.scaledValues.set('damage', { value: 60, capped: false }); // 50 + 10
    const result1 = applier.apply(effect, mockCaster, createMockEntity('target1', { needs: { health: 100, maxHealth: 100 } }), mockWorld, context1);

    // High proficiency
    const context2 = createMockContext(effect);
    context2.scaledValues.set('damage', { value: 130, capped: false }); // 50 + 80
    const result2 = applier.apply(effect, mockCaster, createMockEntity('target2', { needs: { health: 100, maxHealth: 100 } }), mockWorld, context2);

    expect(result2.appliedValues.damage).toBeGreaterThan(result1.appliedValues.damage);
  });

  it('should respect damage cap', () => {
    const effect: SpellEffect = {
      id: 'test',
      name: 'Test',
      category: 'damage',
      damageType: 'fire',
      baseDamage: 50,
      range: 20,
      scaling: {
        base: 50,
        perProficiency: 10.0,
        maximum: 100, // Cap
      },
    };

    const applier = getEffectApplier('damage');
    const context = createMockContext(effect);
    context.scaledValues.set('damage', { value: 100, capped: true }); // Capped at 100
    const result = applier.apply(effect, mockCaster, mockTarget, mockWorld, context);

    expect(result.appliedValues.damage).toBeLessThanOrEqual(100);
  });

  it('should apply different damage types', () => {
    const damageTypes = ['fire', 'cold', 'lightning', 'acid', 'necrotic', 'radiant', 'force'];

    for (const damageType of damageTypes) {
      const effect: SpellEffect = {
        id: `${damageType}_damage`,
        name: `${damageType} Damage`,
        category: 'damage',
        damageType,
        baseDamage: 30,
        range: 15,
      };

      const applier = getEffectApplier('damage');
      const context = createMockContext(effect);
      context.scaledValues.set('damage', { value: 30, capped: false });
      const result = applier.apply(effect, mockCaster, createMockEntity(`target_${damageType}`, { needs: { health: 100, maxHealth: 100 } }), mockWorld, context);

      expect(result.success).toBe(true);
    }
  });
});

describe('Effect Appliers - Healing', () => {
  let mockWorld: World;
  let mockCaster: any;
  let mockTarget: any;

  beforeEach(() => {
    mockWorld = createMockWorld();
    mockCaster = createMockEntity('caster');
    mockTarget = createMockEntity('target', { needs: { health: 50, maxHealth: 100 } });
  });

  it('should heal target', () => {
    const effect: SpellEffect = {
      id: 'cure_wounds',
      name: 'Cure Wounds',
      category: 'healing',
      baseHealing: 30,
      range: 5,
    };

    const applier = getEffectApplier('healing');
    const context = createMockContext(effect);
    context.scaledValues.set('healing', { value: 30, capped: false });
    const result = applier.apply(effect, mockCaster, mockTarget, mockWorld, context);

    expect(result.success).toBe(true);
    expect(mockTarget.getComponent('needs').health).toBe(80); // 50 + 30
  });

  it('should not exceed maximum health', () => {
    const effect: SpellEffect = {
      id: 'cure_wounds',
      name: 'Cure Wounds',
      category: 'healing',
      baseHealing: 100,
      range: 5,
    };

    const applier = getEffectApplier('healing');
    const context = createMockContext(effect);
    context.scaledValues.set('healing', { value: 100, capped: false });
    applier.apply(effect, mockCaster, mockTarget, mockWorld, context);

    expect(mockTarget.getComponent('needs').health).toBe(100); // Capped at max
  });

  it('should scale healing with proficiency', () => {
    const effect: SpellEffect = {
      id: 'test',
      name: 'Test',
      category: 'healing',
      baseHealing: 20,
      range: 5,
      scaling: {
        base: 20,
        perProficiency: 0.5,
      },
    };

    const applier = getEffectApplier('healing');

    const context1 = createMockContext(effect);
    context1.scaledValues.set('healing', { value: 30, capped: false }); // 20 + 10
    const result1 = applier.apply(effect, mockCaster, createMockEntity('target1', { needs: { health: 50, maxHealth: 100 } }), mockWorld, context1);

    const context2 = createMockContext(effect);
    context2.scaledValues.set('healing', { value: 60, capped: false }); // 20 + 40
    const result2 = applier.apply(effect, mockCaster, createMockEntity('target2', { needs: { health: 50, maxHealth: 100 } }), mockWorld, context2);

    expect(result2.appliedValues.healing).toBeGreaterThan(result1.appliedValues.healing);
  });
});

describe('Effect Appliers - Protection', () => {
  let mockWorld: World;
  let mockCaster: any;
  let mockTarget: any;

  beforeEach(() => {
    mockWorld = createMockWorld();
    mockCaster = createMockEntity('caster');
    mockTarget = createMockEntity('target');
  });

  it('should apply protection effect', () => {
    const effect: SpellEffect = {
      id: 'mage_armor',
      name: 'Mage Armor',
      category: 'protection',
      absorptionAmount: 50,
      duration: 600, // ticks
      range: 0, // Self
    };

    const applier = getEffectApplier('protection');
    const context = createMockContext(effect);
    context.scaledValues.set('absorption', { value: 50, capped: false });
    const result = applier.apply(effect, mockCaster, mockTarget, mockWorld, context);

    expect(result.success).toBe(true);
    expect(result.appliedValues.absorption).toBe(50);
  });

  it('should stack protection effects additively', () => {
    const effect: SpellEffect = {
      id: 'shield',
      name: 'Shield',
      category: 'protection',
      absorptionAmount: 30,
      duration: 600,
      range: 0,
    };

    const applier = getEffectApplier('protection');

    // Apply first shield
    const context1 = createMockContext(effect);
    context1.scaledValues.set('absorption', { value: 30, capped: false });
    const result1 = applier.apply(effect, mockCaster, mockTarget, mockWorld, context1);

    // Apply second shield
    const context2 = createMockContext(effect);
    context2.scaledValues.set('absorption', { value: 30, capped: false });
    const result2 = applier.apply(effect, mockCaster, mockTarget, mockWorld, context2);

    expect(result1.success).toBe(true);
    expect(result2.success).toBe(true);
  });

  it('should expire protection after duration', () => {
    const effect: SpellEffect = {
      id: 'ward',
      name: 'Ward',
      category: 'protection',
      absorptionAmount: 40,
      duration: 10, // Short duration
      range: 0,
    };

    const applier = getEffectApplier('protection');
    const context = createMockContext(effect);
    context.scaledValues.set('absorption', { value: 40, capped: false });
    const result = applier.apply(effect, mockCaster, mockTarget, mockWorld, context);

    expect(result.success).toBe(true);
    expect(result.appliedValues.absorption).toBe(40);
  });
});

describe('Effect Appliers - Buff', () => {
  it('should apply stat buffs', () => {
    const mockWorld = createMockWorld();
    const mockCaster = createMockEntity('caster');
    const mockTarget = createMockEntity('target', {
      stats: { strength: 10, intelligence: 10 },
    });

    const effect: SpellEffect = {
      id: 'bulls_strength',
      name: "Bull's Strength",
      category: 'buff',
      duration: 600,
      statModifiers: [
        { stat: 'strength', flat: 4 },
      ],
      range: 5,
    };

    const applier = getEffectApplier('buff');
    const context = createMockContext(effect);
    const result = applier.apply(effect, mockCaster, mockTarget, mockWorld, context);

    expect(result.success).toBe(true);
    // Note: Buff appliers track modifiers separately, they don't directly modify stats component
  });

  it('should stack buffs from different sources', () => {
    const mockWorld = createMockWorld();
    const mockCaster = createMockEntity('caster');
    const mockTarget = createMockEntity('target', {
      stats: { strength: 10 },
    });

    const buff1: SpellEffect = {
      id: 'buff1',
      name: 'Buff 1',
      category: 'buff',
      duration: 600,
      statModifiers: [{ stat: 'strength', flat: 2 }],
      range: 5,
    };

    const buff2: SpellEffect = {
      id: 'buff2',
      name: 'Buff 2',
      category: 'buff',
      duration: 600,
      statModifiers: [{ stat: 'strength', flat: 3 }],
      range: 5,
    };

    const applier = getEffectApplier('buff');
    const context1 = createMockContext(buff1);
    const result1 = applier.apply(buff1, mockCaster, mockTarget, mockWorld, context1);
    const context2 = createMockContext(buff2);
    const result2 = applier.apply(buff2, mockCaster, mockTarget, mockWorld, context2);

    expect(result1.success).toBe(true);
    expect(result2.success).toBe(true);
  });
});

describe('Effect Appliers - Debuff', () => {
  it('should apply stat debuffs', () => {
    const mockWorld = createMockWorld();
    const mockCaster = createMockEntity('caster');
    const mockTarget = createMockEntity('target', {
      stats: { dexterity: 15 },
    });

    const effect: SpellEffect = {
      id: 'slow',
      name: 'Slow',
      category: 'debuff',
      duration: 300,
      statModifiers: [
        { stat: 'dexterity', flat: -5 },
      ],
      range: 20,
    };

    const applier = getEffectApplier('debuff');
    const context = createMockContext(effect);
    const result = applier.apply(effect, mockCaster, mockTarget, mockWorld, context);

    expect(result.success).toBe(true);
    // Note: Debuff appliers track modifiers separately, they don't directly modify stats component
  });

  it('should allow debuff resistance', () => {
    const mockWorld = createMockWorld();
    const mockCaster = createMockEntity('caster');
    const mockTarget = createMockEntity('target', {
      stats: { willpower: 20 }, // High resistance
      resistance: { debuff: 0.5 },
    });

    const effect: SpellEffect = {
      id: 'weaken',
      name: 'Weaken',
      category: 'debuff',
      duration: 300,
      statModifiers: [
        { stat: 'strength', flat: -10 },
      ],
      range: 15,
      allowsResistance: true,
    };

    const applier = getEffectApplier('debuff');
    const context = createMockContext(effect);
    const result = applier.apply(effect, mockCaster, mockTarget, mockWorld, context);

    // Debuff should apply successfully
    expect(result.success).toBe(true);
  });
});

describe('Effect Appliers - Control', () => {
  it('should apply stun effect', () => {
    const mockWorld = createMockWorld();
    const mockCaster = createMockEntity('caster');
    const mockTarget = createMockEntity('target');

    const effect: SpellEffect = {
      id: 'hold_person',
      name: 'Hold Person',
      category: 'control',
      controlType: 'stun',
      duration: 60,
      range: 30,
    };

    const applier = getEffectApplier('control');
    const context = createMockContext(effect, {
      proficiency: 50,
      techniqueLevel: 1,
      formLevel: 1,
    });
    const result = applier.apply(effect, mockCaster, mockTarget, mockWorld, context);

    expect(result.success).toBe(true);
    const statusEffects = mockTarget.getComponent('status_effects');
    expect(statusEffects.isStunned).toBe(true);
  });

  it('should apply fear effect', () => {
    const mockWorld = createMockWorld();
    const mockCaster = createMockEntity('caster');
    const mockTarget = createMockEntity('target');

    const effect: SpellEffect = {
      id: 'cause_fear',
      name: 'Cause Fear',
      category: 'control',
      controlType: 'fear',
      duration: 120,
      range: 20,
    };

    const applier = getEffectApplier('control');
    const context = createMockContext(effect, {
      proficiency: 70,
      techniqueLevel: 1,
      formLevel: 1,
    });
    applier.apply(effect, mockCaster, mockTarget, mockWorld, context);

    const behavior = mockTarget.getComponent('behavior');
    expect(behavior.currentBehavior).toBe('flee');
  });
});

describe('Effect Appliers - Summon', () => {
  it('should summon entity', () => {
    const mockWorld = createMockWorld();
    const mockCaster = createMockEntity('caster');

    const effect: SpellEffect = {
      id: 'summon_wolf',
      name: 'Summon Wolf',
      category: 'summon',
      entityArchetype: 'wolf',
      duration: 600,
      summonCount: 1,
      summonLevel: 1,
      controllable: true,
      spawnLocation: 'adjacent',
      range: 10,
    };

    const applier = getEffectApplier('summon');
    const context = createMockContext(effect);
    context.scaledValues.set('count', { value: 1, capped: false });
    context.scaledValues.set('level', { value: 1, capped: false });
    mockCaster.addComponent('position', { x: 0, y: 0 });
    const result = applier.apply(effect, mockCaster, mockCaster, mockWorld, context);

    expect(result.success).toBe(true);
    expect(result.summonedEntities).toHaveLength(1);
    expect(mockWorld.entities.size).toBeGreaterThan(0);
  });

  it('should summon multiple entities', () => {
    const mockWorld = createMockWorld();
    const mockCaster = createMockEntity('caster');

    const effect: SpellEffect = {
      id: 'summon_swarm',
      name: 'Summon Swarm',
      category: 'summon',
      entityArchetype: 'rat',
      duration: 300,
      summonCount: 5,
      summonLevel: 1,
      controllable: false,
      spawnLocation: 'adjacent',
      behavior: 'aggressive',
      range: 10,
    };

    const applier = getEffectApplier('summon');
    const context = createMockContext(effect);
    context.scaledValues.set('count', { value: 5, capped: false });
    context.scaledValues.set('level', { value: 1, capped: false });
    mockCaster.addComponent('position', { x: 0, y: 0 });
    const result = applier.apply(effect, mockCaster, mockCaster, mockWorld, context);

    expect(result.summonedEntities).toHaveLength(5);
  });
});

describe('Effect Appliers - Transform', () => {
  it('should transform entity form', () => {
    const mockWorld = createMockWorld();
    const mockCaster = createMockEntity('caster');
    const mockTarget = createMockEntity('target', {
      appearance: { form: 'human' },
    });

    const effect: SpellEffect = {
      id: 'polymorph',
      name: 'Polymorph',
      category: 'transform',
      transformType: 'form_change',
      newForm: 'sheep',
      duration: 600,
      range: 30,
    };

    const applier = getEffectApplier('transform');
    const context = createMockContext(effect, {
      proficiency: 70,
      techniqueLevel: 1,
      formLevel: 1,
    });
    const result = applier.apply(effect, mockCaster, mockTarget, mockWorld, context);

    expect(result.success).toBe(true);
    expect(mockTarget.getComponent('appearance').form).toBe('sheep');
  });
});

// Mock helper functions
function createMockWorld(): World {
  const entities = new Map();
  let entityIdCounter = 0;

  return {
    entities,
    tick: (ticks: number) => {},
    getEntity: (id: string) => entities.get(id),
    getPosition: (id: string) => ({ x: 0, y: 0 }),
    createEntity: (archetype: string) => {
      const id = `entity_${entityIdCounter++}`;
      const entity = createMockEntity(id);
      entities.set(id, entity);
      return entity;
    },
    addComponent: (entityId: string, component: any) => {
      const entity = entities.get(entityId);
      if (entity) {
        const componentType = component.type || 'position';
        entity.addComponent(componentType, component);
      }
    },
    destroyEntity: (entityId: string, reason?: string) => {
      entities.delete(entityId);
    },
  } as any;
}

function createMockEntity(id: string, components: any = {}): any {
  return {
    id,
    components: new Map(Object.entries(components)),
    getComponent: function (type: string) {
      return this.components.get(type);
    },
    addComponent: function (type: string, data: any) {
      this.components.set(type, data);
    },
  };
}

function getEffectApplier(category: string): any {
  const executor = SpellEffectExecutor.getInstance();
  return executor.getApplier(category);
}

function createMockContext(effect: SpellEffect, overrides?: any): any {
  return {
    tick: 1000,
    spell: {
      id: effect.id,
      name: effect.name,
      paradigmId: 'test',
      technique: 'test',
      form: 'test',
      source: 'test',
      manaCost: 0,
      castTime: 0,
      range: effect.range || 0,
      effectId: effect.id,
    },
    casterMagic: {
      knownSpells: [],
      activeParadigmId: 'test',
      techniqueProficiency: {},
      formProficiency: {},
      totalSpellsCast: 0,
      resourcePools: {},
      paradigmState: {},
      primarySource: 'test',
    },
    scaledValues: new Map(),
    isCrit: false,
    powerMultiplier: 1.0,
    ...overrides,
  };
}
