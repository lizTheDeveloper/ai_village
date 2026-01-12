/**
 * Tests for all 17 spell effect categories and their appliers
 * Gap: Only 3 appliers implemented (Healing, Protection, Summon)
 * Need: 14 more appliers
 */

import { describe, it, expect, beforeEach, beforeAll } from 'vitest';
import type { SpellEffect } from '../SpellEffect.js';
import { World } from '@ai-village/core';
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

    // Add entities to the world's entities map so world.addComponent can find them
    (mockWorld.entities as Map<string, any>).set(mockCaster.id, mockCaster);
    (mockWorld.entities as Map<string, any>).set(mockTarget.id, mockTarget);

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

    // Add entities to the world's entities map so world.addComponent can find them
    (mockWorld.entities as Map<string, any>).set(mockCaster.id, mockCaster);
    (mockWorld.entities as Map<string, any>).set(mockTarget.id, mockTarget);

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

    // Add entities to the world's entities map so world.addComponent can find them
    (mockWorld.entities as Map<string, any>).set(mockCaster.id, mockCaster);
    (mockWorld.entities as Map<string, any>).set(mockTarget.id, mockTarget);

    const effect: SpellEffect = {
      id: 'polymorph',
      name: 'Polymorph',
      category: 'transform',
      transformType: 'form',
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

describe('Effect Appliers - Perception', () => {
  let mockWorld: World;
  let mockCaster: any;
  let mockTarget: any;

  beforeEach(() => {
    mockWorld = createMockWorld();
    mockCaster = createMockEntity('caster', {
      position: { x: 0, y: 0 },
      perception: { visionRange: 10, detectionTypes: [] },
    });
    mockTarget = createMockEntity('target', {
      position: { x: 5, y: 5 },
      status_effects: { isInvisible: true },
    });
  });

  describe('Detection', () => {
    it('should detect invisible entities', () => {
      const effect: SpellEffect = {
        id: 'detect_invisibility',
        name: 'Detect Invisibility',
        category: 'perception',
        perceptionType: 'detect_invisible',
        duration: 300,
        range: 0, // Self-buff
        detectionRange: 30,
      };

      const applier = getEffectApplier('perception');
      const context = createMockContext(effect);
      context.scaledValues.set('detection_range', { value: 30, capped: false });
      const result = applier.apply(effect, mockCaster, mockCaster, mockWorld, context);

      expect(result.success).toBe(true);
      expect(result.appliedValues.detectionRange).toBe(30);
      const perception = mockCaster.getComponent('perception');
      expect(perception.detectionTypes).toContain('invisible');
    });

    it('should detect hidden entities', () => {
      const hiddenTarget = createMockEntity('hidden_target', {
        position: { x: 3, y: 3 },
        status_effects: { isHidden: true },
      });

      const effect: SpellEffect = {
        id: 'detect_hidden',
        name: 'Detect Hidden',
        category: 'perception',
        perceptionType: 'detect_hidden',
        duration: 240,
        range: 0,
        detectionRange: 25,
      };

      const applier = getEffectApplier('perception');
      const context = createMockContext(effect);
      context.scaledValues.set('detection_range', { value: 25, capped: false });
      const result = applier.apply(effect, mockCaster, mockCaster, mockWorld, context);

      expect(result.success).toBe(true);
      const perception = mockCaster.getComponent('perception');
      expect(perception.detectionTypes).toContain('hidden');
    });

    it('should detect specific entity types', () => {
      const effect: SpellEffect = {
        id: 'detect_evil',
        name: 'Detect Evil',
        category: 'perception',
        perceptionType: 'detect_alignment',
        duration: 180,
        range: 0,
        detectionRange: 20,
        detectionFilter: { alignment: 'evil' },
      };

      const applier = getEffectApplier('perception');
      const context = createMockContext(effect);
      context.scaledValues.set('detection_range', { value: 20, capped: false });
      const result = applier.apply(effect, mockCaster, mockCaster, mockWorld, context);

      expect(result.success).toBe(true);
      expect(result.appliedValues.detectionType).toBe('alignment');
    });
  });

  describe('Vision Enhancement', () => {
    it('should enhance vision range', () => {
      const effect: SpellEffect = {
        id: 'far_sight',
        name: 'Far Sight',
        category: 'perception',
        perceptionType: 'enhanced_vision',
        duration: 600,
        range: 0,
        visionRangeBonus: 20,
        scaling: {
          base: 20,
          perProficiency: 0.5,
          maximum: 50,
        },
      };

      const applier = getEffectApplier('perception');
      const context = createMockContext(effect);
      context.scaledValues.set('vision_range', { value: 30, capped: false }); // 20 + 10 from proficiency
      const result = applier.apply(effect, mockCaster, mockCaster, mockWorld, context);

      expect(result.success).toBe(true);
      expect(result.appliedValues.visionRangeBonus).toBe(30);
    });

    it('should provide darkvision', () => {
      const effect: SpellEffect = {
        id: 'darkvision',
        name: 'Darkvision',
        category: 'perception',
        perceptionType: 'darkvision',
        duration: 480,
        range: 0,
        visionRangeBonus: 15,
      };

      const applier = getEffectApplier('perception');
      const context = createMockContext(effect);
      context.scaledValues.set('vision_range', { value: 15, capped: false });
      const result = applier.apply(effect, mockCaster, mockCaster, mockWorld, context);

      expect(result.success).toBe(true);
      const perception = mockCaster.getComponent('perception');
      expect(perception.hasDarkvision).toBe(true);
    });

    it('should provide truesight', () => {
      const effect: SpellEffect = {
        id: 'true_seeing',
        name: 'True Seeing',
        category: 'perception',
        perceptionType: 'truesight',
        duration: 360,
        range: 0,
        detectionRange: 30,
      };

      const applier = getEffectApplier('perception');
      const context = createMockContext(effect);
      context.scaledValues.set('detection_range', { value: 30, capped: false });
      const result = applier.apply(effect, mockCaster, mockCaster, mockWorld, context);

      expect(result.success).toBe(true);
      const perception = mockCaster.getComponent('perception');
      expect(perception.hasTruesight).toBe(true);
      expect(perception.detectionTypes).toContain('invisible');
      expect(perception.detectionTypes).toContain('illusion');
      expect(perception.detectionTypes).toContain('shapeshifter');
    });
  });

  describe('Magic Sensing', () => {
    it('should detect magic auras', () => {
      const effect: SpellEffect = {
        id: 'detect_magic',
        name: 'Detect Magic',
        category: 'perception',
        perceptionType: 'detect_magic',
        duration: 300,
        range: 0,
        detectionRange: 25,
      };

      const applier = getEffectApplier('perception');
      const context = createMockContext(effect);
      context.scaledValues.set('detection_range', { value: 25, capped: false });
      const result = applier.apply(effect, mockCaster, mockCaster, mockWorld, context);

      expect(result.success).toBe(true);
      const perception = mockCaster.getComponent('perception');
      expect(perception.detectionTypes).toContain('magic');
    });

    it('should identify magic schools', () => {
      const effect: SpellEffect = {
        id: 'identify_magic',
        name: 'Identify Magic',
        category: 'perception',
        perceptionType: 'identify_magic',
        duration: 120,
        range: 0,
        detectionRange: 10,
        identifyDetails: true,
      };

      const applier = getEffectApplier('perception');
      const context = createMockContext(effect);
      context.scaledValues.set('detection_range', { value: 10, capped: false });
      const result = applier.apply(effect, mockCaster, mockCaster, mockWorld, context);

      expect(result.success).toBe(true);
      expect(result.appliedValues.identifyDetails).toBe(true);
    });
  });

  describe('Scaling', () => {
    it('should scale detection range with proficiency', () => {
      const effect: SpellEffect = {
        id: 'detect_test',
        name: 'Detect Test',
        category: 'perception',
        perceptionType: 'detect_invisible',
        duration: 300,
        range: 0,
        detectionRange: 20,
        scaling: {
          base: 20,
          perProficiency: 0.5,
          maximum: 50,
        },
      };

      const applier = getEffectApplier('perception');

      // Low proficiency
      const context1 = createMockContext(effect);
      context1.scaledValues.set('detection_range', { value: 25, capped: false }); // 20 + 5
      const result1 = applier.apply(effect, mockCaster, createMockEntity('caster1', { perception: { visionRange: 10 } }), mockWorld, context1);

      // High proficiency
      const context2 = createMockContext(effect);
      context2.scaledValues.set('detection_range', { value: 50, capped: true }); // 20 + 30, capped
      const result2 = applier.apply(effect, mockCaster, createMockEntity('caster2', { perception: { visionRange: 10 } }), mockWorld, context2);

      expect(result2.appliedValues.detectionRange).toBeGreaterThan(result1.appliedValues.detectionRange);
      expect(result2.appliedValues.detectionRange).toBeLessThanOrEqual(50);
    });

    it('should scale duration with proficiency', () => {
      const effect: SpellEffect = {
        id: 'long_sight',
        name: 'Long Sight',
        category: 'perception',
        perceptionType: 'enhanced_vision',
        duration: 300,
        range: 0,
        visionRangeBonus: 10,
        scaling: {
          base: 300,
          perProficiency: 5,
          attribute: 'duration',
        },
      };

      const applier = getEffectApplier('perception');
      const context = createMockContext(effect);
      context.scaledValues.set('duration', { value: 400, capped: false }); // 300 + 100
      const result = applier.apply(effect, mockCaster, mockCaster, mockWorld, context);

      expect(result.success).toBe(true);
      expect(result.appliedValues.duration).toBe(400);
    });
  });

  describe('Edge Cases', () => {
    it('should fail if target lacks perception component', () => {
      const noPerception = createMockEntity('no_perception');

      const effect: SpellEffect = {
        id: 'detect_invisible',
        name: 'Detect Invisibility',
        category: 'perception',
        perceptionType: 'detect_invisible',
        duration: 300,
        range: 0,
        detectionRange: 30,
      };

      const applier = getEffectApplier('perception');
      const context = createMockContext(effect);
      const result = applier.apply(effect, mockCaster, noPerception, mockWorld, context);

      expect(result.success).toBe(false);
      expect(result.error).toContain('perception');
    });

    it('should handle multiple detection types simultaneously', () => {
      const effect: SpellEffect = {
        id: 'omniscience',
        name: 'Omniscience',
        category: 'perception',
        perceptionType: 'multi_detection',
        duration: 600,
        range: 0,
        detectionRange: 40,
        detectionTypes: ['invisible', 'hidden', 'magic', 'shapeshifter'],
      };

      const applier = getEffectApplier('perception');
      const context = createMockContext(effect);
      context.scaledValues.set('detection_range', { value: 40, capped: false });
      const result = applier.apply(effect, mockCaster, mockCaster, mockWorld, context);

      expect(result.success).toBe(true);
      const perception = mockCaster.getComponent('perception');
      expect(perception.detectionTypes).toContain('invisible');
      expect(perception.detectionTypes).toContain('hidden');
      expect(perception.detectionTypes).toContain('magic');
    });

    it('should stack detection effects from different sources', () => {
      const effect1: SpellEffect = {
        id: 'detect_invisible',
        name: 'Detect Invisibility',
        category: 'perception',
        perceptionType: 'detect_invisible',
        duration: 300,
        range: 0,
        detectionRange: 20,
      };

      const effect2: SpellEffect = {
        id: 'detect_magic',
        name: 'Detect Magic',
        category: 'perception',
        perceptionType: 'detect_magic',
        duration: 300,
        range: 0,
        detectionRange: 25,
      };

      const applier = getEffectApplier('perception');
      const context1 = createMockContext(effect1);
      context1.scaledValues.set('detection_range', { value: 20, capped: false });
      const result1 = applier.apply(effect1, mockCaster, mockCaster, mockWorld, context1);

      const context2 = createMockContext(effect2);
      context2.scaledValues.set('detection_range', { value: 25, capped: false });
      const result2 = applier.apply(effect2, mockCaster, mockCaster, mockWorld, context2);

      expect(result1.success).toBe(true);
      expect(result2.success).toBe(true);
      const perception = mockCaster.getComponent('perception');
      expect(perception.detectionTypes).toContain('invisible');
      expect(perception.detectionTypes).toContain('magic');
    });
  });

  describe('Expiration', () => {
    it('should remove perception effects after duration expires', () => {
      const effect: SpellEffect = {
        id: 'brief_sight',
        name: 'Brief Sight',
        category: 'perception',
        perceptionType: 'enhanced_vision',
        duration: 10, // Short duration
        range: 0,
        visionRangeBonus: 15,
      };

      const applier = getEffectApplier('perception');
      const context = createMockContext(effect);
      context.scaledValues.set('vision_range', { value: 15, capped: false });
      const result = applier.apply(effect, mockCaster, mockCaster, mockWorld, context);

      expect(result.success).toBe(true);
      expect(result.appliedValues.duration).toBe(10);
      // Note: Actual expiration would be handled by a timed effects system
    });
  });
});

describe('Effect Appliers - Dispel', () => {
  let mockWorld: World;
  let mockCaster: any;
  let mockTarget: any;

  beforeEach(() => {
    mockWorld = createMockWorld();
    mockCaster = createMockEntity('caster', {
      magic: { techniqueProficiency: { dispel: 50 } },
    });
    mockTarget = createMockEntity('target', {
      active_effects: {
        effects: [
          { id: 'buff1', category: 'buff', power: 30, source: 'external' },
          { id: 'debuff1', category: 'debuff', power: 40, source: 'external' },
          { id: 'protection1', category: 'protection', power: 50, source: 'external' },
        ],
      },
    });
  });

  describe('Basic Dispel', () => {
    it('should remove single magic effect', () => {
      const effect: SpellEffect = {
        id: 'dispel_magic',
        name: 'Dispel Magic',
        category: 'dispel',
        dispelType: 'single_effect',
        range: 30,
        dispelPower: 50,
      };

      const applier = getEffectApplier('dispel');
      const context = createMockContext(effect);
      context.scaledValues.set('dispel_power', { value: 50, capped: false });
      const result = applier.apply(effect, mockCaster, mockTarget, mockWorld, context);

      expect(result.success).toBe(true);
      expect(result.appliedValues.effectsRemoved).toBeGreaterThan(0);
    });

    it('should remove all effects from target', () => {
      const effect: SpellEffect = {
        id: 'greater_dispel',
        name: 'Greater Dispel',
        category: 'dispel',
        dispelType: 'all_effects',
        range: 20,
        dispelPower: 100,
      };

      const applier = getEffectApplier('dispel');
      const context = createMockContext(effect);
      context.scaledValues.set('dispel_power', { value: 100, capped: false });
      const result = applier.apply(effect, mockCaster, mockTarget, mockWorld, context);

      expect(result.success).toBe(true);
      const activeEffects = mockTarget.getComponent('active_effects');
      expect(activeEffects.effects).toHaveLength(0);
    });

    it('should remove only specific effect category', () => {
      const effect: SpellEffect = {
        id: 'remove_curse',
        name: 'Remove Curse',
        category: 'dispel',
        dispelType: 'category_specific',
        targetCategory: 'debuff',
        range: 5,
        dispelPower: 60,
      };

      const applier = getEffectApplier('dispel');
      const context = createMockContext(effect);
      context.scaledValues.set('dispel_power', { value: 60, capped: false });
      const result = applier.apply(effect, mockCaster, mockTarget, mockWorld, context);

      expect(result.success).toBe(true);
      const activeEffects = mockTarget.getComponent('active_effects');
      const debuffs = activeEffects.effects.filter((e: any) => e.category === 'debuff');
      expect(debuffs).toHaveLength(0);
    });
  });

  describe('Suppression', () => {
    it('should temporarily suppress magic effects', () => {
      const effect: SpellEffect = {
        id: 'suppress_magic',
        name: 'Suppress Magic',
        category: 'dispel',
        dispelType: 'suppress',
        duration: 120,
        range: 25,
        suppressionPower: 40,
      };

      const applier = getEffectApplier('dispel');
      const context = createMockContext(effect);
      context.scaledValues.set('suppression_power', { value: 40, capped: false });
      const result = applier.apply(effect, mockCaster, mockTarget, mockWorld, context);

      expect(result.success).toBe(true);
      expect(result.appliedValues.suppressionDuration).toBe(120);
      const activeEffects = mockTarget.getComponent('active_effects');
      expect(activeEffects.suppressed).toBe(true);
    });

    it('should create antimagic field (area effect)', () => {
      const effect: SpellEffect = {
        id: 'antimagic_field',
        name: 'Antimagic Field',
        category: 'dispel',
        dispelType: 'antimagic_field',
        duration: 300,
        range: 0, // Self
        areaRadius: 15,
        suppressionPower: 100,
      };

      const applier = getEffectApplier('dispel');
      const context = createMockContext(effect);
      context.scaledValues.set('suppression_power', { value: 100, capped: false });
      const result = applier.apply(effect, mockCaster, mockCaster, mockWorld, context);

      expect(result.success).toBe(true);
      expect(result.appliedValues.areaRadius).toBe(15);
    });
  });

  describe('Counterspell', () => {
    it('should counter incoming spell', () => {
      const incomingSpell = {
        id: 'fireball',
        power: 60,
        caster: 'enemy_mage',
      };

      const effect: SpellEffect = {
        id: 'counterspell',
        name: 'Counterspell',
        category: 'dispel',
        dispelType: 'counterspell',
        range: 40,
        dispelPower: 70,
        instantaneous: true,
      };

      const applier = getEffectApplier('dispel');
      const context = createMockContext(effect);
      context.scaledValues.set('dispel_power', { value: 70, capped: false });
      context.incomingSpell = incomingSpell;
      const result = applier.apply(effect, mockCaster, mockCaster, mockWorld, context);

      expect(result.success).toBe(true);
      expect(result.appliedValues.spellCountered).toBe(1);
    });

    it('should fail to counter if power too low', () => {
      const incomingSpell = {
        id: 'meteor_swarm',
        power: 150,
        caster: 'archmage',
      };

      const effect: SpellEffect = {
        id: 'weak_counterspell',
        name: 'Weak Counterspell',
        category: 'dispel',
        dispelType: 'counterspell',
        range: 30,
        dispelPower: 40,
      };

      const applier = getEffectApplier('dispel');
      const context = createMockContext(effect);
      context.scaledValues.set('dispel_power', { value: 40, capped: false });
      context.incomingSpell = incomingSpell;
      const result = applier.apply(effect, mockCaster, mockCaster, mockWorld, context);

      expect(result.success).toBe(false);
      expect(result.error).toContain('insufficient power');
    });
  });

  describe('Selective Dispel', () => {
    it('should only remove harmful effects', () => {
      const effect: SpellEffect = {
        id: 'cleanse',
        name: 'Cleanse',
        category: 'dispel',
        dispelType: 'selective',
        targetCategory: 'debuff',
        range: 10,
        dispelPower: 50,
      };

      const applier = getEffectApplier('dispel');
      const context = createMockContext(effect);
      context.scaledValues.set('dispel_power', { value: 50, capped: false });
      const result = applier.apply(effect, mockCaster, mockTarget, mockWorld, context);

      expect(result.success).toBe(true);
      const activeEffects = mockTarget.getComponent('active_effects');
      const buffs = activeEffects.effects.filter((e: any) => e.category === 'buff');
      expect(buffs.length).toBeGreaterThan(0); // Buffs preserved
    });

    it('should only remove beneficial effects (offensive dispel)', () => {
      const effect: SpellEffect = {
        id: 'purge',
        name: 'Purge',
        category: 'dispel',
        dispelType: 'selective',
        targetCategory: 'buff',
        range: 25,
        dispelPower: 60,
      };

      const applier = getEffectApplier('dispel');
      const context = createMockContext(effect);
      context.scaledValues.set('dispel_power', { value: 60, capped: false });
      const result = applier.apply(effect, mockCaster, mockTarget, mockWorld, context);

      expect(result.success).toBe(true);
      const activeEffects = mockTarget.getComponent('active_effects');
      const buffs = activeEffects.effects.filter((e: any) => e.category === 'buff');
      expect(buffs).toHaveLength(0);
    });
  });

  describe('Scaling', () => {
    it('should scale dispel power with proficiency', () => {
      const effect: SpellEffect = {
        id: 'scaling_dispel',
        name: 'Scaling Dispel',
        category: 'dispel',
        dispelType: 'single_effect',
        range: 30,
        dispelPower: 30,
        scaling: {
          base: 30,
          perProficiency: 1.0,
          maximum: 100,
        },
      };

      const applier = getEffectApplier('dispel');

      // Low proficiency
      const context1 = createMockContext(effect);
      context1.scaledValues.set('dispel_power', { value: 40, capped: false }); // 30 + 10
      const result1 = applier.apply(effect, mockCaster, mockTarget, mockWorld, context1);

      // High proficiency
      const context2 = createMockContext(effect);
      context2.scaledValues.set('dispel_power', { value: 80, capped: false }); // 30 + 50
      const target2 = createMockEntity('target2', {
        active_effects: {
          effects: [{ id: 'strong_buff', category: 'buff', power: 70, source: 'external' }],
        },
      });
      const result2 = applier.apply(effect, mockCaster, target2, mockWorld, context2);

      expect(result2.appliedValues.dispelPower).toBeGreaterThan(result1.appliedValues.dispelPower);
    });
  });

  describe('Edge Cases', () => {
    it('should fail on target without active effects', () => {
      const cleanTarget = createMockEntity('clean_target', {
        active_effects: { effects: [] },
      });

      const effect: SpellEffect = {
        id: 'dispel_magic',
        name: 'Dispel Magic',
        category: 'dispel',
        dispelType: 'single_effect',
        range: 30,
        dispelPower: 50,
      };

      const applier = getEffectApplier('dispel');
      const context = createMockContext(effect);
      const result = applier.apply(effect, mockCaster, cleanTarget, mockWorld, context);

      expect(result.success).toBe(false);
      expect(result.error).toContain('no effects');
    });

    it('should fail on target out of range', () => {
      const farTarget = createMockEntity('far_target', {
        position: { x: 100, y: 100 },
        active_effects: {
          effects: [{ id: 'buff1', category: 'buff', power: 30 }],
        },
      });

      const effect: SpellEffect = {
        id: 'dispel_magic',
        name: 'Dispel Magic',
        category: 'dispel',
        dispelType: 'single_effect',
        range: 30,
        dispelPower: 50,
      };

      const applier = getEffectApplier('dispel');
      const context = createMockContext(effect);
      const result = applier.apply(effect, mockCaster, farTarget, mockWorld, context);

      expect(result.success).toBe(false);
      expect(result.error).toContain('range');
    });

    it('should handle effects with different power levels', () => {
      const targetWithMixedEffects = createMockEntity('mixed_target', {
        active_effects: {
          effects: [
            { id: 'weak_buff', category: 'buff', power: 20, source: 'external' },
            { id: 'medium_buff', category: 'buff', power: 50, source: 'external' },
            { id: 'strong_buff', category: 'buff', power: 80, source: 'external' },
          ],
        },
      });

      const effect: SpellEffect = {
        id: 'moderate_dispel',
        name: 'Moderate Dispel',
        category: 'dispel',
        dispelType: 'all_effects',
        range: 30,
        dispelPower: 55,
      };

      const applier = getEffectApplier('dispel');
      const context = createMockContext(effect);
      context.scaledValues.set('dispel_power', { value: 55, capped: false });
      const result = applier.apply(effect, mockCaster, targetWithMixedEffects, mockWorld, context);

      expect(result.success).toBe(true);
      // Should remove weak (20) and medium (50) but not strong (80)
      const activeEffects = targetWithMixedEffects.getComponent('active_effects');
      const remaining = activeEffects.effects.filter((e: any) => e.power > 55);
      expect(remaining.length).toBeGreaterThan(0);
    });

    it('should not dispel permanent effects', () => {
      const targetWithPermanent = createMockEntity('permanent_target', {
        active_effects: {
          effects: [
            { id: 'curse', category: 'debuff', power: 40, permanent: true },
            { id: 'temp_debuff', category: 'debuff', power: 30, permanent: false },
          ],
        },
      });

      const effect: SpellEffect = {
        id: 'dispel_magic',
        name: 'Dispel Magic',
        category: 'dispel',
        dispelType: 'all_effects',
        range: 30,
        dispelPower: 100,
      };

      const applier = getEffectApplier('dispel');
      const context = createMockContext(effect);
      context.scaledValues.set('dispel_power', { value: 100, capped: false });
      const result = applier.apply(effect, mockCaster, targetWithPermanent, mockWorld, context);

      expect(result.success).toBe(true);
      const activeEffects = targetWithPermanent.getComponent('active_effects');
      const permanent = activeEffects.effects.filter((e: any) => e.permanent);
      expect(permanent.length).toBeGreaterThan(0); // Permanent effect remains
    });
  });
});

describe('Effect Appliers - Teleport', () => {
  let mockWorld: World;
  let mockCaster: any;
  let mockTarget: any;

  beforeEach(() => {
    mockWorld = createMockWorld();
    mockCaster = createMockEntity('caster', {
      position: { x: 0, y: 0 },
    });
    mockTarget = createMockEntity('target', {
      position: { x: 10, y: 10 },
    });
  });

  describe('Self Teleport', () => {
    it('should teleport caster to target location', () => {
      const effect: SpellEffect = {
        id: 'dimension_door',
        name: 'Dimension Door',
        category: 'teleport',
        teleportType: 'self',
        range: 50,
        targetLocation: { x: 25, y: 25 },
      };

      const applier = getEffectApplier('teleport');
      const context = createMockContext(effect);
      context.targetLocation = { x: 25, y: 25 };
      const result = applier.apply(effect, mockCaster, mockCaster, mockWorld, context);

      expect(result.success).toBe(true);
      const position = mockCaster.getComponent('position');
      expect(position.x).toBe(25);
      expect(position.y).toBe(25);
    });

    it('should respect maximum teleport range', () => {
      const effect: SpellEffect = {
        id: 'short_blink',
        name: 'Short Blink',
        category: 'teleport',
        teleportType: 'self',
        range: 10,
        targetLocation: { x: 50, y: 50 },
      };

      const applier = getEffectApplier('teleport');
      const context = createMockContext(effect);
      context.targetLocation = { x: 50, y: 50 }; // Too far
      const result = applier.apply(effect, mockCaster, mockCaster, mockWorld, context);

      expect(result.success).toBe(false);
      expect(result.error).toContain('range');
    });

    it('should allow random teleport within range', () => {
      const effect: SpellEffect = {
        id: 'random_blink',
        name: 'Random Blink',
        category: 'teleport',
        teleportType: 'self_random',
        range: 15,
      };

      const applier = getEffectApplier('teleport');
      const context = createMockContext(effect);
      const result = applier.apply(effect, mockCaster, mockCaster, mockWorld, context);

      expect(result.success).toBe(true);
      const position = mockCaster.getComponent('position');
      const distance = Math.sqrt(position.x ** 2 + position.y ** 2);
      expect(distance).toBeLessThanOrEqual(15);
    });
  });

  describe('Target Teleport', () => {
    it('should teleport target to specified location', () => {
      const effect: SpellEffect = {
        id: 'banishment',
        name: 'Banishment',
        category: 'teleport',
        teleportType: 'target',
        range: 40,
        targetLocation: { x: 100, y: 100 },
      };

      const applier = getEffectApplier('teleport');
      const context = createMockContext(effect);
      context.targetLocation = { x: 100, y: 100 };
      const result = applier.apply(effect, mockCaster, mockTarget, mockWorld, context);

      expect(result.success).toBe(true);
      const position = mockTarget.getComponent('position');
      expect(position.x).toBe(100);
      expect(position.y).toBe(100);
    });

    it('should teleport target to caster location', () => {
      const effect: SpellEffect = {
        id: 'summon_ally',
        name: 'Summon Ally',
        category: 'teleport',
        teleportType: 'target_to_caster',
        range: 100,
      };

      const applier = getEffectApplier('teleport');
      const context = createMockContext(effect);
      const result = applier.apply(effect, mockCaster, mockTarget, mockWorld, context);

      expect(result.success).toBe(true);
      const targetPos = mockTarget.getComponent('position');
      const casterPos = mockCaster.getComponent('position');
      expect(targetPos.x).toBe(casterPos.x);
      expect(targetPos.y).toBe(casterPos.y);
    });

    it('should allow resistance to forced teleport', () => {
      const resistantTarget = createMockEntity('resistant', {
        position: { x: 20, y: 20 },
        stats: { willpower: 80 },
        resistance: { teleport: 0.7 },
      });

      const effect: SpellEffect = {
        id: 'banishment',
        name: 'Banishment',
        category: 'teleport',
        teleportType: 'target',
        range: 50,
        targetLocation: { x: 100, y: 100 },
        allowsResistance: true,
      };

      const applier = getEffectApplier('teleport');
      const context = createMockContext(effect);
      context.targetLocation = { x: 100, y: 100 };
      const result = applier.apply(effect, mockCaster, resistantTarget, mockWorld, context);

      // May succeed or fail based on resistance roll
      if (!result.success) {
        expect(result.error).toContain('resisted');
      }
    });
  });

  describe('Swap Teleport', () => {
    it('should swap positions of caster and target', () => {
      const effect: SpellEffect = {
        id: 'swap_places',
        name: 'Swap Places',
        category: 'teleport',
        teleportType: 'swap',
        range: 30,
      };

      const applier = getEffectApplier('teleport');
      const context = createMockContext(effect);

      const originalCasterPos = { ...mockCaster.getComponent('position') };
      const originalTargetPos = { ...mockTarget.getComponent('position') };

      const result = applier.apply(effect, mockCaster, mockTarget, mockWorld, context);

      expect(result.success).toBe(true);
      const casterPos = mockCaster.getComponent('position');
      const targetPos = mockTarget.getComponent('position');
      expect(casterPos.x).toBe(originalTargetPos.x);
      expect(casterPos.y).toBe(originalTargetPos.y);
      expect(targetPos.x).toBe(originalCasterPos.x);
      expect(targetPos.y).toBe(originalCasterPos.y);
    });
  });

  describe('Teleport with Direction', () => {
    it('should teleport in cardinal direction', () => {
      const effect: SpellEffect = {
        id: 'dash_north',
        name: 'Dash North',
        category: 'teleport',
        teleportType: 'directional',
        range: 0,
        distance: 20,
        direction: 'north',
      };

      const applier = getEffectApplier('teleport');
      const context = createMockContext(effect);
      context.direction = 'north';
      const result = applier.apply(effect, mockCaster, mockCaster, mockWorld, context);

      expect(result.success).toBe(true);
      const position = mockCaster.getComponent('position');
      expect(position.y).toBe(-20); // North = negative Y
    });

    it('should teleport in facing direction', () => {
      mockCaster.addComponent('orientation', { facing: Math.PI / 2 }); // East

      const effect: SpellEffect = {
        id: 'blink_forward',
        name: 'Blink Forward',
        category: 'teleport',
        teleportType: 'forward',
        range: 0,
        distance: 15,
      };

      const applier = getEffectApplier('teleport');
      const context = createMockContext(effect);
      const result = applier.apply(effect, mockCaster, mockCaster, mockWorld, context);

      expect(result.success).toBe(true);
      const position = mockCaster.getComponent('position');
      expect(position.x).toBeGreaterThan(0); // Moved east
    });
  });

  describe('Scaling', () => {
    it('should scale teleport range with proficiency', () => {
      const effect: SpellEffect = {
        id: 'scaling_teleport',
        name: 'Scaling Teleport',
        category: 'teleport',
        teleportType: 'self',
        range: 20,
        scaling: {
          base: 20,
          perProficiency: 0.5,
          maximum: 60,
        },
      };

      const applier = getEffectApplier('teleport');

      // Low proficiency
      const context1 = createMockContext(effect);
      context1.scaledValues.set('range', { value: 25, capped: false }); // 20 + 5
      context1.targetLocation = { x: 24, y: 0 };
      const result1 = applier.apply(effect, createMockEntity('caster1', { position: { x: 0, y: 0 } }), mockCaster, mockWorld, context1);

      // High proficiency
      const context2 = createMockContext(effect);
      context2.scaledValues.set('range', { value: 60, capped: true }); // 20 + 40, capped
      context2.targetLocation = { x: 55, y: 0 };
      const result2 = applier.apply(effect, createMockEntity('caster2', { position: { x: 0, y: 0 } }), mockCaster, mockWorld, context2);

      expect(result1.success).toBe(true);
      expect(result2.success).toBe(true);
    });
  });

  describe('Edge Cases', () => {
    it('should fail if target lacks position component', () => {
      const noPosition = createMockEntity('no_position');

      const effect: SpellEffect = {
        id: 'teleport',
        name: 'Teleport',
        category: 'teleport',
        teleportType: 'target',
        range: 50,
        targetLocation: { x: 10, y: 10 },
      };

      const applier = getEffectApplier('teleport');
      const context = createMockContext(effect);
      const result = applier.apply(effect, mockCaster, noPosition, mockWorld, context);

      expect(result.success).toBe(false);
      expect(result.error).toContain('position');
    });

    it('should fail if teleporting to blocked location', () => {
      const effect: SpellEffect = {
        id: 'teleport',
        name: 'Teleport',
        category: 'teleport',
        teleportType: 'self',
        range: 50,
        targetLocation: { x: 30, y: 30 },
        checkTerrain: true,
      };

      const applier = getEffectApplier('teleport');
      const context = createMockContext(effect);
      context.targetLocation = { x: 30, y: 30 };
      context.terrainBlocked = true; // Simulated blocked terrain
      const result = applier.apply(effect, mockCaster, mockCaster, mockWorld, context);

      expect(result.success).toBe(false);
      expect(result.error).toContain('blocked');
    });

    it('should handle teleport to same location gracefully', () => {
      const effect: SpellEffect = {
        id: 'teleport',
        name: 'Teleport',
        category: 'teleport',
        teleportType: 'self',
        range: 50,
        targetLocation: { x: 0, y: 0 },
      };

      const applier = getEffectApplier('teleport');
      const context = createMockContext(effect);
      context.targetLocation = { x: 0, y: 0 };
      const result = applier.apply(effect, mockCaster, mockCaster, mockWorld, context);

      // Should succeed but essentially do nothing
      expect(result.success).toBe(true);
    });

    it('should trigger teleport events', () => {
      const effect: SpellEffect = {
        id: 'dimension_door',
        name: 'Dimension Door',
        category: 'teleport',
        teleportType: 'self',
        range: 50,
        targetLocation: { x: 20, y: 20 },
        triggersEvents: true,
      };

      const applier = getEffectApplier('teleport');
      const context = createMockContext(effect);
      context.targetLocation = { x: 20, y: 20 };
      const result = applier.apply(effect, mockCaster, mockCaster, mockWorld, context);

      expect(result.success).toBe(true);
      expect(result.eventsTriggered).toContain('teleport_departure');
      expect(result.eventsTriggered).toContain('teleport_arrival');
    });

    it('should handle mass teleport (multiple targets)', () => {
      const allies = [
        createMockEntity('ally1', { position: { x: 5, y: 5 } }),
        createMockEntity('ally2', { position: { x: 7, y: 7 } }),
        createMockEntity('ally3', { position: { x: 9, y: 9 } }),
      ];

      const effect: SpellEffect = {
        id: 'mass_teleport',
        name: 'Mass Teleport',
        category: 'teleport',
        teleportType: 'mass',
        range: 20,
        targetLocation: { x: 50, y: 50 },
        maxTargets: 5,
      };

      const applier = getEffectApplier('teleport');
      const context = createMockContext(effect);
      context.targetLocation = { x: 50, y: 50 };
      context.additionalTargets = allies;
      const result = applier.apply(effect, mockCaster, mockCaster, mockWorld, context);

      expect(result.success).toBe(true);
      expect(result.targetsTeleported).toBe(4); // Caster + 3 allies
    });

    it('should allow teleport anchors (marked locations)', () => {
      mockCaster.addComponent('teleport_anchors', {
        anchors: [
          { name: 'home', x: 100, y: 100 },
          { name: 'workshop', x: 200, y: 200 },
        ],
      });

      const effect: SpellEffect = {
        id: 'recall',
        name: 'Recall',
        category: 'teleport',
        teleportType: 'anchor',
        range: 999, // Unlimited for anchors
        anchorName: 'home',
      };

      const applier = getEffectApplier('teleport');
      const context = createMockContext(effect);
      context.anchorName = 'home';
      const result = applier.apply(effect, mockCaster, mockCaster, mockWorld, context);

      expect(result.success).toBe(true);
      const position = mockCaster.getComponent('position');
      expect(position.x).toBe(100);
      expect(position.y).toBe(100);
    });
  });

  describe('Special Teleport Types', () => {
    it('should handle planar teleport (dimension shift)', () => {
      const effect: SpellEffect = {
        id: 'plane_shift',
        name: 'Plane Shift',
        category: 'teleport',
        teleportType: 'planar',
        range: 0,
        targetPlane: 'ethereal',
        targetLocation: { x: 10, y: 10 },
      };

      const applier = getEffectApplier('teleport');
      const context = createMockContext(effect);
      context.targetPlane = 'ethereal';
      context.targetLocation = { x: 10, y: 10 };
      const result = applier.apply(effect, mockCaster, mockCaster, mockWorld, context);

      expect(result.success).toBe(true);
      expect(result.appliedValues.targetPlane).toBe('ethereal');
    });

    it('should handle blink (repeated micro-teleports)', () => {
      const effect: SpellEffect = {
        id: 'blink',
        name: 'Blink',
        category: 'teleport',
        teleportType: 'blink',
        duration: 120,
        range: 0,
        blinkDistance: 5,
        blinkInterval: 10, // Every 10 ticks
      };

      const applier = getEffectApplier('teleport');
      const context = createMockContext(effect);
      const result = applier.apply(effect, mockCaster, mockCaster, mockWorld, context);

      expect(result.success).toBe(true);
      expect(result.appliedValues.duration).toBe(120);
      expect(result.appliedValues.blinkInterval).toBe(10);
    });
  });
});

describe('Effect Appliers - Mental', () => {
  let mockWorld: World;
  let mockCaster: any;
  let mockTarget: any;

  beforeEach(() => {
    mockWorld = createMockWorld();
    mockCaster = createMockEntity('caster');
    mockTarget = createMockEntity('target', {
      stats: { willpower: 10, intelligence: 10 },
    });
  });

  it('should apply fear effect with resistance check', () => {
    const effect: SpellEffect = {
      id: 'cause_fear',
      name: 'Cause Fear',
      category: 'mental',
      mentalType: 'fear',
      mentalStrength: { base: 50, perProficiency: 1.0 },
      duration: 100,
      subtle: false,
      range: 20,
    };

    const applier = getEffectApplier('mental');
    const context = createMockContext(effect, {
      proficiency: 50,
      techniqueLevel: 1,
      formLevel: 1,
    });
    context.scaledValues.set('strength', { value: 100, capped: false });

    const result = applier.apply(effect, mockCaster, mockTarget, mockWorld, context);

    // Should succeed against low willpower
    expect(result.success).toBe(true);
    const behavior = mockTarget.getComponent('behavior');
    expect(behavior.currentBehavior).toBe('flee');
    expect(behavior.fleeFrom).toBe(mockCaster.id);
  });

  it('should allow willpower resistance against mental effects', () => {
    const effect: SpellEffect = {
      id: 'dominate_mind',
      name: 'Dominate Mind',
      category: 'mental',
      mentalType: 'dominate',
      mentalStrength: { base: 30, perProficiency: 0.5 },
      duration: 200,
      subtle: false,
      range: 15,
    };

    // High willpower target
    const strongTarget = createMockEntity('strong_target', {
      stats: { willpower: 80 },
    });

    const applier = getEffectApplier('mental');
    const context = createMockContext(effect, {
      proficiency: 30,
      techniqueLevel: 1,
      formLevel: 1,
    });
    context.scaledValues.set('strength', { value: 45, capped: false });

    const result = applier.apply(effect, mockCaster, strongTarget, mockWorld, context);

    // Strong willpower should resist
    expect(result.resisted).toBe(true);
  });

  it('should apply charm with subtle flag', () => {
    const effect: SpellEffect = {
      id: 'charm_person',
      name: 'Charm Person',
      category: 'mental',
      mentalType: 'charm',
      mentalStrength: { base: 40, perProficiency: 0.8 },
      duration: 300,
      subtle: true, // Target doesn't know they're charmed
      range: 10,
    };

    const applier = getEffectApplier('mental');
    const context = createMockContext(effect);
    context.scaledValues.set('strength', { value: 40, capped: false });

    const result = applier.apply(effect, mockCaster, mockTarget, mockWorld, context);

    expect(result.success).toBe(true);
    const mentalEffect = mockTarget.getComponent('mental_effects');
    expect(mentalEffect.charmedBy).toBe(mockCaster.id);
    expect(mentalEffect.aware).toBe(false); // Subtle
  });

  it('should create illusions with illusionContent', () => {
    const effect: SpellEffect = {
      id: 'phantom_image',
      name: 'Phantom Image',
      category: 'mental',
      mentalType: 'illusion',
      mentalStrength: { base: 60, perProficiency: 1.2 },
      duration: 150,
      subtle: true,
      illusionContent: 'dragon',
      range: 25,
    };

    const applier = getEffectApplier('mental');
    const context = createMockContext(effect);
    context.scaledValues.set('strength', { value: 60, capped: false });

    const result = applier.apply(effect, mockCaster, mockTarget, mockWorld, context);

    expect(result.success).toBe(true);
    const perception = mockTarget.getComponent('perception_effects');
    expect(perception.illusions).toContainEqual({
      content: 'dragon',
      strength: 60,
      casterId: mockCaster.id,
    });
  });

  it('should apply confusion effect', () => {
    const effect: SpellEffect = {
      id: 'confusion',
      name: 'Confusion',
      category: 'mental',
      mentalType: 'confuse',
      mentalStrength: { base: 50, perProficiency: 0.9 },
      duration: 80,
      subtle: false,
      range: 20,
    };

    const applier = getEffectApplier('mental');
    const context = createMockContext(effect);
    context.scaledValues.set('strength', { value: 50, capped: false });

    const result = applier.apply(effect, mockCaster, mockTarget, mockWorld, context);

    expect(result.success).toBe(true);
    const behavior = mockTarget.getComponent('behavior');
    expect(behavior.confused).toBe(true);
    expect(behavior.confusedUntil).toBeGreaterThan(context.tick);
  });

  it('should handle telepathy mental effect', () => {
    const effect: SpellEffect = {
      id: 'telepathy',
      name: 'Telepathy',
      category: 'mental',
      mentalType: 'telepathy',
      mentalStrength: { base: 70, perProficiency: 1.5 },
      duration: 600,
      subtle: true,
      range: 50,
    };

    const applier = getEffectApplier('mental');
    const context = createMockContext(effect);
    context.scaledValues.set('strength', { value: 70, capped: false });

    const result = applier.apply(effect, mockCaster, mockTarget, mockWorld, context);

    expect(result.success).toBe(true);
    const mentalEffect = mockTarget.getComponent('mental_effects');
    expect(mentalEffect.linkedTo).toContain(mockCaster.id);
    expect(mentalEffect.linkType).toBe('telepathy');
  });

  it('should modify memory with memory type', () => {
    const effect: SpellEffect = {
      id: 'modify_memory',
      name: 'Modify Memory',
      category: 'mental',
      mentalType: 'memory',
      mentalStrength: { base: 90, perProficiency: 2.0 },
      duration: undefined, // Permanent
      subtle: true,
      range: 5,
    };

    const applier = getEffectApplier('mental');
    const context = createMockContext(effect);
    context.scaledValues.set('strength', { value: 90, capped: false });

    const result = applier.apply(effect, mockCaster, mockTarget, mockWorld, context);

    expect(result.success).toBe(true);
    const memory = mockTarget.getComponent('memory');
    expect(memory.modified).toBe(true);
    expect(memory.modifiedBy).toBe(mockCaster.id);
  });

  it('should fail on mindless targets', () => {
    const mindlessTarget = createMockEntity('mindless', {
      tags: ['mindless', 'construct'],
    });

    const effect: SpellEffect = {
      id: 'charm_person',
      name: 'Charm Person',
      category: 'mental',
      mentalType: 'charm',
      mentalStrength: { base: 50, perProficiency: 1.0 },
      duration: 300,
      subtle: false,
      range: 10,
    };

    const applier = getEffectApplier('mental');
    const context = createMockContext(effect);

    const result = applier.apply(effect, mockCaster, mindlessTarget, mockWorld, context);

    expect(result.success).toBe(false);
    expect(result.error).toContain('mindless');
  });

  it('should scale mental strength with proficiency', () => {
    const effect: SpellEffect = {
      id: 'dominate',
      name: 'Dominate',
      category: 'mental',
      mentalType: 'dominate',
      mentalStrength: { base: 20, perProficiency: 2.0, maximum: 100 },
      duration: 200,
      subtle: false,
      range: 15,
    };

    const applier = getEffectApplier('mental');

    // Low proficiency
    const context1 = createMockContext(effect, { proficiency: 10 });
    context1.scaledValues.set('strength', { value: 40, capped: false }); // 20 + 20
    const result1 = applier.apply(effect, mockCaster, createMockEntity('t1', { stats: { willpower: 10 } }), mockWorld, context1);

    // High proficiency
    const context2 = createMockContext(effect, { proficiency: 40 });
    context2.scaledValues.set('strength', { value: 100, capped: true }); // 20 + 80 = 100 (capped)
    const result2 = applier.apply(effect, mockCaster, createMockEntity('t2', { stats: { willpower: 10 } }), mockWorld, context2);

    // Higher strength should have better success rate
    expect(result1.success).toBe(true);
    expect(result2.success).toBe(true);
    expect(result2.appliedValues.strength).toBeGreaterThan(result1.appliedValues.strength);
  });

  it('should expire mental effects after duration', () => {
    const effect: SpellEffect = {
      id: 'short_charm',
      name: 'Short Charm',
      category: 'mental',
      mentalType: 'charm',
      mentalStrength: { base: 30, perProficiency: 0.5 },
      duration: 50, // Short duration
      subtle: false,
      range: 10,
    };

    const applier = getEffectApplier('mental');
    const context = createMockContext(effect);
    context.scaledValues.set('strength', { value: 30, capped: false });

    const result = applier.apply(effect, mockCaster, mockTarget, mockWorld, context);

    expect(result.success).toBe(true);
    expect(result.remainingDuration).toBe(50);
  });
});

describe('Effect Appliers - Soul', () => {
  let mockWorld: World;
  let mockCaster: any;
  let mockTarget: any;

  beforeEach(() => {
    mockWorld = createMockWorld();
    mockCaster = createMockEntity('caster');
    mockTarget = createMockEntity('target', {
      soul: { integrity: 100, bound: false },
      needs: { health: 100, maxHealth: 100 },
    });
  });

  it('should damage soul integrity', () => {
    const effect: SpellEffect = {
      id: 'soul_drain',
      name: 'Soul Drain',
      category: 'soul',
      soulType: 'damage',
      soulDamage: { base: 30, perProficiency: 1.0 },
      affectsUndead: false,
      canResurrect: false,
      range: 15,
    };

    const applier = getEffectApplier('soul');
    const context = createMockContext(effect);
    context.scaledValues.set('damage', { value: 30, capped: false });

    const result = applier.apply(effect, mockCaster, mockTarget, mockWorld, context);

    expect(result.success).toBe(true);
    const soul = mockTarget.getComponent('soul');
    expect(soul.integrity).toBeLessThan(100);
    expect(soul.integrity).toBe(70); // 100 - 30
  });

  it('should bind souls', () => {
    const effect: SpellEffect = {
      id: 'soul_bind',
      name: 'Soul Bind',
      category: 'soul',
      soulType: 'bind',
      affectsUndead: false,
      canResurrect: false,
      duration: 600,
      range: 10,
    };

    const applier = getEffectApplier('soul');
    const context = createMockContext(effect);

    const result = applier.apply(effect, mockCaster, mockTarget, mockWorld, context);

    expect(result.success).toBe(true);
    const soul = mockTarget.getComponent('soul');
    expect(soul.bound).toBe(true);
    expect(soul.boundTo).toBe(mockCaster.id);
    expect(soul.bindExpires).toBeGreaterThan(context.tick);
  });

  it('should free bound souls', () => {
    // First bind the soul
    mockTarget.getComponent('soul').bound = true;
    mockTarget.getComponent('soul').boundTo = 'evil_wizard';

    const effect: SpellEffect = {
      id: 'soul_free',
      name: 'Soul Free',
      category: 'soul',
      soulType: 'free',
      affectsUndead: false,
      canResurrect: false,
      range: 20,
    };

    const applier = getEffectApplier('soul');
    const context = createMockContext(effect);

    const result = applier.apply(effect, mockCaster, mockTarget, mockWorld, context);

    expect(result.success).toBe(true);
    const soul = mockTarget.getComponent('soul');
    expect(soul.bound).toBe(false);
    expect(soul.boundTo).toBeUndefined();
  });

  it('should transfer souls between bodies', () => {
    const sourceBody = createMockEntity('source', {
      soul: { integrity: 100, essence: 'original_soul' },
    });
    const targetBody = createMockEntity('target_body', {
      soul: { integrity: 100, essence: 'empty' },
    });

    const effect: SpellEffect = {
      id: 'soul_transfer',
      name: 'Soul Transfer',
      category: 'soul',
      soulType: 'transfer',
      affectsUndead: false,
      canResurrect: false,
      range: 5,
    };

    const applier = getEffectApplier('soul');
    const context = createMockContext(effect);

    const result = applier.apply(effect, sourceBody, targetBody, mockWorld, context);

    expect(result.success).toBe(true);
    expect(targetBody.getComponent('soul').essence).toBe('original_soul');
    expect(sourceBody.getComponent('soul').essence).toBe('empty');
  });

  it('should heal soul damage', () => {
    // Damage the soul first
    mockTarget.getComponent('soul').integrity = 40;

    const effect: SpellEffect = {
      id: 'soul_heal',
      name: 'Soul Heal',
      category: 'soul',
      soulType: 'heal',
      soulDamage: { base: -30, perProficiency: -0.8 }, // Negative = healing
      affectsUndead: false,
      canResurrect: false,
      range: 10,
    };

    const applier = getEffectApplier('soul');
    const context = createMockContext(effect);
    context.scaledValues.set('healing', { value: 30, capped: false });

    const result = applier.apply(effect, mockCaster, mockTarget, mockWorld, context);

    expect(result.success).toBe(true);
    const soul = mockTarget.getComponent('soul');
    expect(soul.integrity).toBe(70); // 40 + 30
  });

  it('should detect souls', () => {
    const effect: SpellEffect = {
      id: 'detect_soul',
      name: 'Detect Soul',
      category: 'soul',
      soulType: 'detect',
      affectsUndead: true,
      canResurrect: false,
      duration: 300,
      range: 50,
    };

    const applier = getEffectApplier('soul');
    const context = createMockContext(effect);

    const result = applier.apply(effect, mockCaster, mockCaster, mockWorld, context);

    expect(result.success).toBe(true);
    const perception = mockCaster.getComponent('perception_effects');
    expect(perception.detectsSouls).toBe(true);
    expect(perception.soulDetectionRange).toBe(50);
  });

  it('should resurrect dead entities', () => {
    const corpse = createMockEntity('corpse', {
      soul: { integrity: 50, departed: true, timeOfDeath: 1000 },
      needs: { health: 0, maxHealth: 100 },
      status_effects: { isDead: true },
    });

    const effect: SpellEffect = {
      id: 'resurrect',
      name: 'Resurrect',
      category: 'soul',
      soulType: 'resurrect',
      affectsUndead: false,
      canResurrect: true,
      range: 1,
    };

    const applier = getEffectApplier('soul');
    const context = createMockContext(effect, { proficiency: 80 });

    const result = applier.apply(effect, mockCaster, corpse, mockWorld, context);

    expect(result.success).toBe(true);
    const soul = corpse.getComponent('soul');
    expect(soul.departed).toBe(false);
    const needs = corpse.getComponent('needs');
    expect(needs.health).toBeGreaterThan(0);
    const status = corpse.getComponent('status_effects');
    expect(status.isDead).toBe(false);
  });

  it('should fail on soulless targets for soul damage', () => {
    const soullessTarget = createMockEntity('construct', {
      tags: ['construct', 'soulless'],
    });

    const effect: SpellEffect = {
      id: 'soul_drain',
      name: 'Soul Drain',
      category: 'soul',
      soulType: 'damage',
      soulDamage: { base: 50, perProficiency: 1.0 },
      affectsUndead: false,
      canResurrect: false,
      range: 15,
    };

    const applier = getEffectApplier('soul');
    const context = createMockContext(effect);

    const result = applier.apply(effect, mockCaster, soullessTarget, mockWorld, context);

    expect(result.success).toBe(false);
    expect(result.error).toContain('soulless');
  });

  it('should affect undead with affectsUndead flag', () => {
    const undeadTarget = createMockEntity('undead', {
      soul: { integrity: 80, undead: true },
      tags: ['undead'],
    });

    const effect: SpellEffect = {
      id: 'soul_purge',
      name: 'Soul Purge',
      category: 'soul',
      soulType: 'damage',
      soulDamage: { base: 60, perProficiency: 1.5 },
      affectsUndead: true, // Can affect undead
      canResurrect: false,
      range: 20,
    };

    const applier = getEffectApplier('soul');
    const context = createMockContext(effect);
    context.scaledValues.set('damage', { value: 60, capped: false });

    const result = applier.apply(effect, mockCaster, undeadTarget, mockWorld, context);

    expect(result.success).toBe(true);
    const soul = undeadTarget.getComponent('soul');
    expect(soul.integrity).toBeLessThan(80);
  });

  it('should not affect undead without affectsUndead flag', () => {
    const undeadTarget = createMockEntity('undead', {
      soul: { integrity: 80, undead: true },
      tags: ['undead'],
    });

    const effect: SpellEffect = {
      id: 'soul_heal',
      name: 'Soul Heal',
      category: 'soul',
      soulType: 'heal',
      soulDamage: { base: -30, perProficiency: -0.8 },
      affectsUndead: false, // Cannot affect undead
      canResurrect: false,
      range: 10,
    };

    const applier = getEffectApplier('soul');
    const context = createMockContext(effect);

    const result = applier.apply(effect, mockCaster, undeadTarget, mockWorld, context);

    expect(result.success).toBe(false);
    expect(result.error).toContain('undead');
  });

  it('should respect paradigm restrictions on soul magic', () => {
    // Some paradigms may prohibit soul manipulation
    const effect: SpellEffect = {
      id: 'soul_bind',
      name: 'Soul Bind',
      category: 'soul',
      soulType: 'bind',
      affectsUndead: false,
      canResurrect: false,
      duration: 600,
      range: 10,
    };

    const applier = getEffectApplier('soul');
    const context = createMockContext(effect);
    context.casterMagic.activeParadigmId = 'scientific'; // Science paradigm may prohibit soul magic

    const result = applier.apply(effect, mockCaster, mockTarget, mockWorld, context);

    // Should fail or be restricted based on paradigm
    expect(result.success).toBe(false);
    expect(result.error).toContain('paradigm');
  });
});

describe('Effect Appliers - Paradigm', () => {
  let mockWorld: World;
  let mockCaster: any;
  let mockTarget: any;

  beforeEach(() => {
    mockWorld = createMockWorld();
    mockCaster = createMockEntity('caster');
    mockTarget = createMockEntity('target');
  });

  it.skip('should apply narrative paradigm effect', () => {
    const effect: SpellEffect = {
      id: 'story_twist',
      name: 'Story Twist',
      category: 'paradigm',
      paradigmId: 'narrative',
      paradigmEffectType: 'plot_device',
      parameters: {
        narrativeType: 'coincidence',
        storyImpact: 'major',
        duration: 100,
      },
      range: 0,
    };

    const applier = getEffectApplier('paradigm');
    const context = createMockContext(effect);
    context.casterMagic.activeParadigmId = 'narrative';

    const result = applier.apply(effect, mockCaster, mockTarget, mockWorld, context);

    expect(result.success).toBe(true);
    expect(result.appliedValues.narrativeType).toBe('coincidence');
    expect(result.appliedValues.storyImpact).toBe('major');
  });

  it.skip('should apply luck paradigm effect', () => {
    const effect: SpellEffect = {
      id: 'twist_fate',
      name: 'Twist Fate',
      category: 'paradigm',
      paradigmId: 'luck',
      paradigmEffectType: 'probability_shift',
      parameters: {
        luckModifier: 0.3, // 30% increase in favorable outcomes
        duration: 200,
      },
      range: 5,
    };

    const applier = getEffectApplier('paradigm');
    const context = createMockContext(effect);
    context.casterMagic.activeParadigmId = 'luck';

    const result = applier.apply(effect, mockCaster, mockTarget, mockWorld, context);

    expect(result.success).toBe(true);
    const luck = mockTarget.getComponent('luck_effects');
    expect(luck.modifier).toBe(0.3);
    expect(luck.expiresAt).toBeGreaterThan(context.tick);
  });

  it.skip('should apply symbolic paradigm effect', () => {
    const effect: SpellEffect = {
      id: 'invoke_symbol',
      name: 'Invoke Symbol',
      category: 'paradigm',
      paradigmId: 'symbolic',
      paradigmEffectType: 'symbol_power',
      parameters: {
        symbol: 'fire_rune',
        symbolPower: 75,
        duration: 300,
      },
      range: 10,
    };

    const applier = getEffectApplier('paradigm');
    const context = createMockContext(effect);
    context.casterMagic.activeParadigmId = 'symbolic';

    const result = applier.apply(effect, mockCaster, mockTarget, mockWorld, context);

    expect(result.success).toBe(true);
    const symbols = mockTarget.getComponent('symbolic_effects');
    expect(symbols.activeSymbols).toContainEqual({
      symbol: 'fire_rune',
      power: 75,
      casterId: mockCaster.id,
    });
  });

  it.skip('should apply divine paradigm effect', () => {
    const effect: SpellEffect = {
      id: 'divine_blessing',
      name: 'Divine Blessing',
      category: 'paradigm',
      paradigmId: 'divine',
      paradigmEffectType: 'divine_favor',
      parameters: {
        deity: 'sun_god',
        favorAmount: 50,
        blessingType: 'protection',
        duration: 600,
      },
      range: 20,
    };

    const applier = getEffectApplier('paradigm');
    const context = createMockContext(effect);
    context.casterMagic.activeParadigmId = 'divine';

    const result = applier.apply(effect, mockCaster, mockTarget, mockWorld, context);

    expect(result.success).toBe(true);
    const divine = mockTarget.getComponent('divine_effects');
    expect(divine.blessedBy).toBe('sun_god');
    expect(divine.favorAmount).toBe(50);
    expect(divine.blessingType).toBe('protection');
  });

  it.skip('should apply elemental paradigm effect', () => {
    const effect: SpellEffect = {
      id: 'elemental_infusion',
      name: 'Elemental Infusion',
      category: 'paradigm',
      paradigmId: 'elemental',
      paradigmEffectType: 'element_imbue',
      parameters: {
        element: 'lightning',
        infusionStrength: 60,
        duration: 150,
      },
      range: 0,
    };

    const applier = getEffectApplier('paradigm');
    const context = createMockContext(effect);
    context.casterMagic.activeParadigmId = 'elemental';

    const result = applier.apply(effect, mockCaster, mockTarget, mockWorld, context);

    expect(result.success).toBe(true);
    const elemental = mockTarget.getComponent('elemental_infusion');
    expect(elemental.element).toBe('lightning');
    expect(elemental.strength).toBe(60);
  });

  it.skip('should apply scientific paradigm effect', () => {
    const effect: SpellEffect = {
      id: 'probability_collapse',
      name: 'Probability Collapse',
      category: 'paradigm',
      paradigmId: 'scientific',
      paradigmEffectType: 'quantum_effect',
      parameters: {
        quantumState: 'superposition',
        collapseChance: 0.5,
        duration: 50,
      },
      range: 15,
    };

    const applier = getEffectApplier('paradigm');
    const context = createMockContext(effect);
    context.casterMagic.activeParadigmId = 'scientific';

    const result = applier.apply(effect, mockCaster, mockTarget, mockWorld, context);

    expect(result.success).toBe(true);
    const quantum = mockTarget.getComponent('quantum_effects');
    expect(quantum.state).toBe('superposition');
    expect(quantum.collapseChance).toBe(0.5);
  });

  it.skip('should apply chaos paradigm effect', () => {
    const effect: SpellEffect = {
      id: 'chaos_surge',
      name: 'Chaos Surge',
      category: 'paradigm',
      paradigmId: 'chaos',
      paradigmEffectType: 'entropy_increase',
      parameters: {
        entropyLevel: 80,
        unpredictability: 0.9,
        duration: 100,
      },
      range: 25,
    };

    const applier = getEffectApplier('paradigm');
    const context = createMockContext(effect);
    context.casterMagic.activeParadigmId = 'chaos';

    const result = applier.apply(effect, mockCaster, mockTarget, mockWorld, context);

    expect(result.success).toBe(true);
    const chaos = mockTarget.getComponent('chaos_effects');
    expect(chaos.entropy).toBe(80);
    expect(chaos.unpredictability).toBe(0.9);
  });

  it.skip('should fail if paradigm does not match', () => {
    const effect: SpellEffect = {
      id: 'divine_blessing',
      name: 'Divine Blessing',
      category: 'paradigm',
      paradigmId: 'divine',
      paradigmEffectType: 'divine_favor',
      parameters: {
        deity: 'sun_god',
        favorAmount: 50,
      },
      range: 20,
    };

    const applier = getEffectApplier('paradigm');
    const context = createMockContext(effect);
    context.casterMagic.activeParadigmId = 'scientific'; // Wrong paradigm

    const result = applier.apply(effect, mockCaster, mockTarget, mockWorld, context);

    expect(result.success).toBe(false);
    expect(result.error).toContain('paradigm mismatch');
  });

  it.skip('should handle custom parameters for paradigm effects', () => {
    const effect: SpellEffect = {
      id: 'custom_paradigm',
      name: 'Custom Paradigm Effect',
      category: 'paradigm',
      paradigmId: 'custom',
      paradigmEffectType: 'unique_mechanic',
      parameters: {
        customValue1: 'test',
        customValue2: 123,
        customValue3: true,
        nestedObject: {
          innerValue: 456,
        },
      },
      range: 30,
    };

    const applier = getEffectApplier('paradigm');
    const context = createMockContext(effect);
    context.casterMagic.activeParadigmId = 'custom';

    const result = applier.apply(effect, mockCaster, mockTarget, mockWorld, context);

    expect(result.success).toBe(true);
    expect(result.appliedValues.customValue1).toBe('test');
    expect(result.appliedValues.customValue2).toBe(123);
    expect(result.appliedValues.customValue3).toBe(true);
  });

  it.skip('should validate required parameters', () => {
    const effect: SpellEffect = {
      id: 'incomplete_paradigm',
      name: 'Incomplete Effect',
      category: 'paradigm',
      paradigmId: 'narrative',
      paradigmEffectType: 'plot_device',
      parameters: {}, // Missing required parameters
      range: 10,
    };

    const applier = getEffectApplier('paradigm');
    const context = createMockContext(effect);
    context.casterMagic.activeParadigmId = 'narrative';

    const result = applier.apply(effect, mockCaster, mockTarget, mockWorld, context);

    expect(result.success).toBe(false);
    expect(result.error).toContain('missing required parameters');
  });

  it.skip('should stack paradigm effects when stackable', () => {
    const effect: SpellEffect = {
      id: 'luck_boost',
      name: 'Luck Boost',
      category: 'paradigm',
      paradigmId: 'luck',
      paradigmEffectType: 'probability_shift',
      parameters: {
        luckModifier: 0.2,
        duration: 200,
      },
      range: 5,
    };

    const applier = getEffectApplier('paradigm');
    const context = createMockContext(effect);
    context.casterMagic.activeParadigmId = 'luck';

    // Apply first effect
    const result1 = applier.apply(effect, mockCaster, mockTarget, mockWorld, context);

    // Apply second effect
    const result2 = applier.apply(effect, mockCaster, mockTarget, mockWorld, context);

    expect(result1.success).toBe(true);
    expect(result2.success).toBe(true);

    const luck = mockTarget.getComponent('luck_effects');
    expect(luck.modifier).toBe(0.4); // 0.2 + 0.2 (stacked)
  });

  it.skip('should handle paradigm-specific duration modifiers', () => {
    const effect: SpellEffect = {
      id: 'narrative_twist',
      name: 'Narrative Twist',
      category: 'paradigm',
      paradigmId: 'narrative',
      paradigmEffectType: 'plot_device',
      parameters: {
        narrativeType: 'deus_ex_machina',
        storyImpact: 'critical',
        duration: 'until_resolution', // Special duration
      },
      range: 0,
    };

    const applier = getEffectApplier('paradigm');
    const context = createMockContext(effect);
    context.casterMagic.activeParadigmId = 'narrative';

    const result = applier.apply(effect, mockCaster, mockTarget, mockWorld, context);

    expect(result.success).toBe(true);
    expect(result.remainingDuration).toBeUndefined(); // Special duration handling
    const narrative = mockTarget.getComponent('narrative_effects');
    expect(narrative.durationType).toBe('until_resolution');
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
        (entity as any).addComponent(component.type, component);
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

// ============================================================================
// CreationEffectApplier Tests - 18 tests covering conjuring, scaling, temp/permanent
// ============================================================================

describe('Effect Appliers - Creation', () => {
  let mockWorld: World;
  let mockCaster: any;

  beforeEach(() => {
    mockWorld = createMockWorld();
    mockCaster = createMockEntity('caster');
    mockCaster.addComponent('position', { x: 10, y: 10 });
  });

  describe('Basic Creation', () => {
    it('should create basic object with quantity and quality', () => {
      const effect: SpellEffect = {
        id: 'conjure_water',
        name: 'Conjure Water',
        description: 'Creates water',
        category: 'creation',
        targetType: 'self',
        targetFilter: 'any',
        range: 0,
        dispellable: false,
        stackable: true,
        tags: ['creation', 'water'],
        createdItem: 'water',
        quantity: { base: 1, perProficiency: 0.1, maximum: 10 },
        quality: { base: 50, perProficiency: 0.5, maximum: 100 },
        permanent: true,
      };

      const applier = getEffectApplier('creation');
      const context = createMockContext(effect);
      context.scaledValues.set('quantity', { value: 1, capped: false });
      context.scaledValues.set('quality', { value: 50, capped: false });

      const result = applier.apply(effect, mockCaster, mockCaster, mockWorld, context);

      expect(result.success).toBe(true);
      expect(result.appliedValues.quantity).toBe(1);
      expect(result.appliedValues.quality).toBe(50);
      expect(mockWorld.entities.size).toBeGreaterThan(0);
    });

    it('should create multiple items at once', () => {
      const effect: SpellEffect = {
        id: 'conjure_food',
        name: 'Conjure Food',
        description: 'Creates food',
        category: 'creation',
        targetType: 'self',
        targetFilter: 'any',
        range: 0,
        dispellable: false,
        stackable: true,
        tags: ['creation', 'food'],
        createdItem: 'bread',
        quantity: { base: 5 },
        quality: { base: 60 },
        permanent: true,
      };

      const applier = getEffectApplier('creation');
      const context = createMockContext(effect);
      context.scaledValues.set('quantity', { value: 5, capped: false });
      context.scaledValues.set('quality', { value: 60, capped: false });

      const result = applier.apply(effect, mockCaster, mockCaster, mockWorld, context);

      expect(result.success).toBe(true);
      expect(result.appliedValues.quantity).toBe(5);
    });
  });

  describe('Proficiency Scaling', () => {
    it('should scale quantity with proficiency', () => {
      const effect: SpellEffect = {
        id: 'conjure_items',
        name: 'Conjure Items',
        description: 'Creates items',
        category: 'creation',
        targetType: 'self',
        targetFilter: 'any',
        range: 0,
        dispellable: false,
        stackable: true,
        tags: ['creation'],
        createdItem: 'stone',
        quantity: { base: 1, perProficiency: 0.1, maximum: 10 },
        quality: { base: 50 },
        permanent: true,
      };

      const applier = getEffectApplier('creation');

      const context1 = createMockContext(effect);
      context1.scaledValues.set('quantity', { value: 2, capped: false });
      context1.scaledValues.set('quality', { value: 50, capped: false });
      const result1 = applier.apply(effect, mockCaster, mockCaster, createMockWorld(), context1);

      const context2 = createMockContext(effect);
      context2.scaledValues.set('quantity', { value: 6, capped: false });
      context2.scaledValues.set('quality', { value: 50, capped: false });
      const result2 = applier.apply(effect, mockCaster, mockCaster, createMockWorld(), context2);

      expect(result2.appliedValues.quantity).toBeGreaterThan(result1.appliedValues.quantity);
    });

    it('should scale quality with proficiency', () => {
      const effect: SpellEffect = {
        id: 'conjure_weapon',
        name: 'Conjure Weapon',
        description: 'Creates a weapon',
        category: 'creation',
        targetType: 'self',
        targetFilter: 'any',
        range: 0,
        dispellable: false,
        stackable: false,
        tags: ['creation', 'weapon'],
        createdItem: 'sword',
        quantity: { base: 1 },
        quality: { base: 30, perProficiency: 1.0, maximum: 100 },
        permanent: true,
      };

      const applier = getEffectApplier('creation');

      const context1 = createMockContext(effect);
      context1.scaledValues.set('quantity', { value: 1, capped: false });
      context1.scaledValues.set('quality', { value: 50, capped: false });
      const result1 = applier.apply(effect, mockCaster, mockCaster, createMockWorld(), context1);

      const context2 = createMockContext(effect);
      context2.scaledValues.set('quantity', { value: 1, capped: false });
      context2.scaledValues.set('quality', { value: 100, capped: true });
      const result2 = applier.apply(effect, mockCaster, mockCaster, createMockWorld(), context2);

      expect(result2.appliedValues.quality).toBeGreaterThan(result1.appliedValues.quality);
      expect(result2.appliedValues.quality).toBeLessThanOrEqual(100);
    });

    it('should respect quantity cap', () => {
      const effect: SpellEffect = {
        id: 'mass_conjure',
        name: 'Mass Conjure',
        description: 'Creates many items',
        category: 'creation',
        targetType: 'self',
        targetFilter: 'any',
        range: 0,
        dispellable: false,
        stackable: false,
        tags: ['creation'],
        createdItem: 'arrow',
        quantity: { base: 10, perProficiency: 1.0, maximum: 50 },
        quality: { base: 50 },
        permanent: true,
      };

      const applier = getEffectApplier('creation');
      const context = createMockContext(effect);
      context.scaledValues.set('quantity', { value: 50, capped: true });
      context.scaledValues.set('quality', { value: 50, capped: false });

      const result = applier.apply(effect, mockCaster, mockCaster, mockWorld, context);

      expect(result.appliedValues.quantity).toBeLessThanOrEqual(50);
    });
  });

  describe('Temporary vs Permanent', () => {
    it('should create temporary items with duration', () => {
      const effect: SpellEffect = {
        id: 'conjure_temporary_wall',
        name: 'Conjure Wall',
        description: 'Creates a temporary wall',
        category: 'creation',
        targetType: 'self',
        targetFilter: 'any',
        range: 10,
        duration: 600,
        dispellable: true,
        stackable: false,
        tags: ['creation', 'wall'],
        createdItem: 'stone_wall',
        quantity: { base: 1 },
        quality: { base: 70 },
        permanent: false,
      };

      const applier = getEffectApplier('creation');
      const context = createMockContext(effect);
      context.scaledValues.set('quantity', { value: 1, capped: false });
      context.scaledValues.set('quality', { value: 70, capped: false });

      const result = applier.apply(effect, mockCaster, mockCaster, mockWorld, context);

      expect(result.success).toBe(true);
      expect(result.remainingDuration).toBe(600);
    });

    it('should create permanent items without duration', () => {
      const effect: SpellEffect = {
        id: 'create_matter',
        name: 'Create Matter',
        description: 'Permanently creates matter',
        category: 'creation',
        targetType: 'self',
        targetFilter: 'any',
        range: 0,
        dispellable: false,
        stackable: false,
        tags: ['creation', 'permanent'],
        createdItem: 'gold',
        quantity: { base: 1, perProficiency: 0.05, maximum: 5 },
        quality: { base: 100 },
        permanent: true,
      };

      const applier = getEffectApplier('creation');
      const context = createMockContext(effect);
      context.scaledValues.set('quantity', { value: 1, capped: false });
      context.scaledValues.set('quality', { value: 100, capped: false });

      const result = applier.apply(effect, mockCaster, mockCaster, mockWorld, context);

      expect(result.success).toBe(true);
      expect(result.remainingDuration).toBeUndefined();
    });
  });

  describe('Edge Cases', () => {
    it('should fail when trying to create impossible items', () => {
      const effect: SpellEffect = {
        id: 'conjure_impossible',
        name: 'Conjure Impossibility',
        description: 'Tries to create something impossible',
        category: 'creation',
        targetType: 'self',
        targetFilter: 'any',
        range: 0,
        dispellable: false,
        stackable: false,
        tags: ['creation', 'impossible'],
        createdItem: 'philosopher_stone',
        quantity: { base: 1 },
        quality: { base: 100 },
        permanent: true,
      };

      const applier = getEffectApplier('creation');
      const context = createMockContext(effect);
      context.scaledValues.set('quantity', { value: 1, capped: false });
      context.scaledValues.set('quality', { value: 100, capped: false });

      const result = applier.apply(effect, mockCaster, mockCaster, mockWorld, context);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should handle zero quantity gracefully', () => {
      const effect: SpellEffect = {
        id: 'weak_conjure',
        name: 'Weak Conjure',
        description: 'Barely creates anything',
        category: 'creation',
        targetType: 'self',
        targetFilter: 'any',
        range: 0,
        dispellable: false,
        stackable: false,
        tags: ['creation'],
        createdItem: 'dust',
        quantity: { base: 0, perProficiency: 0.1, minimum: 0 },
        quality: { base: 10 },
        permanent: true,
      };

      const applier = getEffectApplier('creation');
      const context = createMockContext(effect);
      context.scaledValues.set('quantity', { value: 0, capped: false });
      context.scaledValues.set('quality', { value: 10, capped: false });

      const result = applier.apply(effect, mockCaster, mockCaster, mockWorld, context);

      expect(result.success).toBe(true);
      expect(result.appliedValues.quantity).toBe(0);
    });
  });
});

// ============================================================================
// EnvironmentalEffectApplier Tests - 16 tests covering weather, terrain, light, temp, zones
// ============================================================================

describe('Effect Appliers - Environmental', () => {
  let mockWorld: World;
  let mockCaster: any;

  beforeEach(() => {
    mockWorld = createMockWorld();
    mockCaster = createMockEntity('caster');
    mockCaster.addComponent('position', { x: 50, y: 50 });
  });

  describe('Weather Control', () => {
    it('should change weather to rain', () => {
      const effect: SpellEffect = {
        id: 'control_weather_rain',
        name: 'Summon Rain',
        description: 'Makes it rain',
        category: 'environmental',
        targetType: 'area',
        targetFilter: 'any',
        range: 0,
        duration: 1200,
        dispellable: true,
        stackable: false,
        tags: ['environmental', 'weather', 'rain'],
        environmentType: 'weather',
        weatherType: 'rain',
        areaRadius: 100,
        areaShape: 'circle',
      };

      const applier = getEffectApplier('environmental');
      const context = createMockContext(effect);

      const result = applier.apply(effect, mockCaster, mockCaster, mockWorld, context);

      expect(result.success).toBe(true);
      expect(result.appliedValues.weatherType).toBe('rain');
      expect(result.remainingDuration).toBe(1200);
    });

    it('should create fog/mist', () => {
      const effect: SpellEffect = {
        id: 'fog_cloud',
        name: 'Fog Cloud',
        description: 'Creates obscuring fog',
        category: 'environmental',
        targetType: 'area',
        targetFilter: 'any',
        range: 30,
        duration: 600,
        dispellable: true,
        stackable: false,
        tags: ['environmental', 'weather', 'fog'],
        environmentType: 'weather',
        weatherType: 'fog',
        areaRadius: 20,
        areaShape: 'sphere',
        areaEffects: ['obscurement', 'reduced_vision'],
      };

      const applier = getEffectApplier('environmental');
      const context = createMockContext(effect);

      const result = applier.apply(effect, mockCaster, mockCaster, mockWorld, context);

      expect(result.success).toBe(true);
      expect(result.appliedValues.areaRadius).toBe(20);
    });

    it('should create thunderstorm', () => {
      const effect: SpellEffect = {
        id: 'call_lightning_storm',
        name: 'Call Lightning Storm',
        description: 'Summons a thunderstorm',
        category: 'environmental',
        targetType: 'area',
        targetFilter: 'any',
        range: 0,
        duration: 1800,
        dispellable: true,
        stackable: false,
        tags: ['environmental', 'weather', 'storm'],
        environmentType: 'weather',
        weatherType: 'thunderstorm',
        areaRadius: 150,
        areaShape: 'circle',
        areaEffects: ['lightning_strikes', 'rain', 'wind'],
      };

      const applier = getEffectApplier('environmental');
      const context = createMockContext(effect);

      const result = applier.apply(effect, mockCaster, mockCaster, mockWorld, context);

      expect(result.success).toBe(true);
      expect(result.appliedValues.weatherType).toBe('thunderstorm');
    });
  });

  describe('Terrain Modification', () => {
    it('should modify terrain to grass', () => {
      const effect: SpellEffect = {
        id: 'plant_growth',
        name: 'Plant Growth',
        description: 'Grows grass and plants',
        category: 'environmental',
        targetType: 'area',
        targetFilter: 'terrain',
        range: 10,
        duration: undefined,
        dispellable: false,
        stackable: false,
        tags: ['environmental', 'terrain', 'growth'],
        environmentType: 'terrain',
        terrainType: 'grass',
        areaRadius: 15,
        areaShape: 'circle',
      };

      const applier = getEffectApplier('environmental');
      const context = createMockContext(effect);

      const result = applier.apply(effect, mockCaster, mockCaster, mockWorld, context);

      expect(result.success).toBe(true);
      expect(result.appliedValues.terrainType).toBe('grass');
    });

    it('should create wall of stone', () => {
      const effect: SpellEffect = {
        id: 'wall_of_stone',
        name: 'Wall of Stone',
        description: 'Creates a stone wall',
        category: 'environmental',
        targetType: 'area',
        targetFilter: 'terrain',
        range: 30,
        duration: undefined,
        dispellable: false,
        stackable: false,
        tags: ['environmental', 'terrain', 'wall'],
        environmentType: 'terrain',
        terrainType: 'stone',
        areaRadius: 0,
        areaShape: 'wall',
      };

      const applier = getEffectApplier('environmental');
      const context = createMockContext(effect);

      const result = applier.apply(effect, mockCaster, mockCaster, mockWorld, context);

      expect(result.success).toBe(true);
      expect(result.appliedValues.terrainType).toBe('stone');
    });

    it('should create ice terrain', () => {
      const effect: SpellEffect = {
        id: 'ice_floor',
        name: 'Ice Floor',
        description: 'Freezes the ground',
        category: 'environmental',
        targetType: 'area',
        targetFilter: 'terrain',
        range: 20,
        duration: 600,
        dispellable: true,
        stackable: false,
        tags: ['environmental', 'terrain', 'ice'],
        environmentType: 'terrain',
        terrainType: 'ice',
        areaRadius: 10,
        areaShape: 'circle',
        areaEffects: ['slippery', 'cold_damage'],
      };

      const applier = getEffectApplier('environmental');
      const context = createMockContext(effect);

      const result = applier.apply(effect, mockCaster, mockCaster, mockWorld, context);

      expect(result.success).toBe(true);
      expect(result.appliedValues.terrainType).toBe('ice');
    });
  });

  describe('Light and Darkness', () => {
    it('should create magical light', () => {
      const effect: SpellEffect = {
        id: 'daylight',
        name: 'Daylight',
        description: 'Creates bright light',
        category: 'environmental',
        targetType: 'area',
        targetFilter: 'any',
        range: 10,
        duration: 1200,
        dispellable: true,
        stackable: false,
        tags: ['environmental', 'light'],
        environmentType: 'light',
        areaRadius: 30,
        areaShape: 'sphere',
      };

      const applier = getEffectApplier('environmental');
      const context = createMockContext(effect);

      const result = applier.apply(effect, mockCaster, mockCaster, mockWorld, context);

      expect(result.success).toBe(true);
      expect(result.appliedValues.lightLevel).toBeGreaterThan(0);
    });

    it('should create magical darkness', () => {
      const effect: SpellEffect = {
        id: 'darkness',
        name: 'Darkness',
        description: 'Creates magical darkness',
        category: 'environmental',
        targetType: 'area',
        targetFilter: 'any',
        range: 20,
        duration: 600,
        dispellable: true,
        stackable: false,
        tags: ['environmental', 'darkness'],
        environmentType: 'light',
        areaRadius: 15,
        areaShape: 'sphere',
        areaEffects: ['blindness', 'obscurement'],
      };

      const applier = getEffectApplier('environmental');
      const context = createMockContext(effect);

      const result = applier.apply(effect, mockCaster, mockCaster, mockWorld, context);

      expect(result.success).toBe(true);
      expect(result.appliedValues.lightLevel).toBeLessThan(0);
    });
  });

  describe('Temperature Control', () => {
    it('should increase area temperature', () => {
      const effect: SpellEffect = {
        id: 'heat_metal',
        name: 'Heat Metal',
        description: 'Heats the area',
        category: 'environmental',
        targetType: 'area',
        targetFilter: 'any',
        range: 15,
        duration: 300,
        dispellable: true,
        stackable: false,
        tags: ['environmental', 'temperature', 'heat'],
        environmentType: 'temperature',
        areaRadius: 10,
        areaShape: 'circle',
        areaEffects: ['fire_damage', 'discomfort'],
      };

      const applier = getEffectApplier('environmental');
      const context = createMockContext(effect);

      const result = applier.apply(effect, mockCaster, mockCaster, mockWorld, context);

      expect(result.success).toBe(true);
      expect(result.appliedValues.temperatureChange).toBeGreaterThan(0);
    });

    it('should decrease area temperature', () => {
      const effect: SpellEffect = {
        id: 'chill_area',
        name: 'Chill Area',
        description: 'Freezes the area',
        category: 'environmental',
        targetType: 'area',
        targetFilter: 'any',
        range: 15,
        duration: 300,
        dispellable: true,
        stackable: false,
        tags: ['environmental', 'temperature', 'cold'],
        environmentType: 'temperature',
        areaRadius: 10,
        areaShape: 'circle',
        areaEffects: ['cold_damage', 'slowed'],
      };

      const applier = getEffectApplier('environmental');
      const context = createMockContext(effect);

      const result = applier.apply(effect, mockCaster, mockCaster, mockWorld, context);

      expect(result.success).toBe(true);
      expect(result.appliedValues.temperatureChange).toBeLessThan(0);
    });
  });

  describe('Zone Effects', () => {
    it('should create silence zone', () => {
      const effect: SpellEffect = {
        id: 'silence_zone',
        name: 'Zone of Silence',
        description: 'Creates area where no sound exists',
        category: 'environmental',
        targetType: 'area',
        targetFilter: 'any',
        range: 30,
        duration: 600,
        dispellable: true,
        stackable: false,
        tags: ['environmental', 'zone', 'silence'],
        environmentType: 'zone',
        areaRadius: 20,
        areaShape: 'sphere',
        areaEffects: ['silence', 'no_verbal_casting'],
      };

      const applier = getEffectApplier('environmental');
      const context = createMockContext(effect);

      const result = applier.apply(effect, mockCaster, mockCaster, mockWorld, context);

      expect(result.success).toBe(true);
      expect(result.appliedValues.areaRadius).toBe(20);
    });

    it('should create anti-magic zone', () => {
      const effect: SpellEffect = {
        id: 'antimagic_field',
        name: 'Antimagic Field',
        description: 'Suppresses all magic in area',
        category: 'environmental',
        targetType: 'area',
        targetFilter: 'magical',
        range: 0,
        duration: 600,
        dispellable: false,
        stackable: false,
        tags: ['environmental', 'zone', 'antimagic'],
        environmentType: 'zone',
        areaRadius: 10,
        areaShape: 'sphere',
        areaEffects: ['suppress_magic', 'dispel_ongoing'],
      };

      const applier = getEffectApplier('environmental');
      const context = createMockContext(effect);

      const result = applier.apply(effect, mockCaster, mockCaster, mockWorld, context);

      expect(result.success).toBe(true);
    });
  });

  describe('Edge Cases', () => {
    it('should handle conflicting environmental effects', () => {
      const rain: SpellEffect = {
        id: 'rain',
        name: 'Rain',
        description: 'Makes it rain',
        category: 'environmental',
        targetType: 'area',
        targetFilter: 'any',
        range: 0,
        duration: 1200,
        dispellable: true,
        stackable: false,
        tags: ['environmental', 'weather', 'rain'],
        environmentType: 'weather',
        weatherType: 'rain',
        areaRadius: 100,
        areaShape: 'circle',
      };

      const drought: SpellEffect = {
        id: 'drought',
        name: 'Drought',
        description: 'Clears all moisture',
        category: 'environmental',
        targetType: 'area',
        targetFilter: 'any',
        range: 0,
        duration: 1200,
        dispellable: true,
        stackable: false,
        tags: ['environmental', 'weather', 'drought'],
        environmentType: 'weather',
        weatherType: 'clear',
        areaRadius: 100,
        areaShape: 'circle',
      };

      const applier = getEffectApplier('environmental');

      const context1 = createMockContext(rain);
      const result1 = applier.apply(rain, mockCaster, mockCaster, mockWorld, context1);

      const context2 = createMockContext(drought);
      const result2 = applier.apply(drought, mockCaster, mockCaster, mockWorld, context2);

      expect(result1.success).toBe(true);
      expect(result2.success).toBe(true);
    });

    it('should handle area shape variations', () => {
      const shapes: AreaShape[] = ['circle', 'square', 'sphere', 'cube', 'cone', 'line', 'ring', 'wall'];

      for (const shape of shapes) {
        const effect: SpellEffect = {
          id: `shape_${shape}`,
          name: `Shape ${shape}`,
          description: `Environmental effect with ${shape} shape`,
          category: 'environmental',
          targetType: 'area',
          targetFilter: 'any',
          range: 10,
          duration: 300,
          dispellable: true,
          stackable: false,
          tags: ['environmental'],
          environmentType: 'zone',
          areaRadius: 15,
          areaShape: shape,
        };

        const applier = getEffectApplier('environmental');
        const context = createMockContext(effect);
        const result = applier.apply(effect, mockCaster, mockCaster, mockWorld, context);

        expect(result.success).toBe(true);
      }
    });

    it('should handle permanent terrain changes', () => {
      const effect: SpellEffect = {
        id: 'transmute_rock',
        name: 'Transmute Rock',
        description: 'Permanently changes rock to mud',
        category: 'environmental',
        targetType: 'area',
        targetFilter: 'terrain',
        range: 20,
        duration: undefined,
        dispellable: false,
        stackable: false,
        tags: ['environmental', 'terrain', 'permanent'],
        environmentType: 'terrain',
        terrainType: 'mud',
        areaRadius: 10,
        areaShape: 'square',
      };

      const applier = getEffectApplier('environmental');
      const context = createMockContext(effect);

      const result = applier.apply(effect, mockCaster, mockCaster, mockWorld, context);

      expect(result.success).toBe(true);
      expect(result.remainingDuration).toBeUndefined();
    });

    it('should handle global environmental effects', () => {
      const effect: SpellEffect = {
        id: 'global_warming',
        name: 'Global Climate Change',
        description: 'Affects entire world climate',
        category: 'environmental',
        targetType: 'global',
        targetFilter: 'any',
        range: 0,
        duration: 12000,
        dispellable: true,
        stackable: false,
        tags: ['environmental', 'global', 'climate'],
        environmentType: 'weather',
        weatherType: 'heat_wave',
        areaRadius: 999999,
        areaShape: 'circle',
      };

      const applier = getEffectApplier('environmental');
      const context = createMockContext(effect);

      const result = applier.apply(effect, mockCaster, mockCaster, mockWorld, context);

      expect(result.success).toBe(true);
    });
  });
});

// ============================================================================
// TemporalEffectApplier Tests - 21 tests covering slow, haste, time stop, aging, rewind
// ============================================================================

describe('Effect Appliers - Temporal', () => {
  let mockWorld: World;
  let mockCaster: any;
  let mockTarget: any;

  beforeEach(() => {
    mockWorld = createMockWorld();
    mockCaster = createMockEntity('caster');
    mockTarget = createMockEntity('target', {
      stats: { agility: 10, intelligence: 10 },
      status_effects: { timeScale: 1.0 },
    });
  });

  describe('Slow Effects', () => {
    it('should slow target to half speed', () => {
      const effect: SpellEffect = {
        id: 'slow',
        name: 'Slow',
        description: 'Slows target to half speed',
        category: 'temporal',
        targetType: 'single',
        targetFilter: 'enemies',
        range: 30,
        duration: 600,
        dispellable: true,
        stackable: false,
        tags: ['temporal', 'slow', 'debuff'],
        temporalType: 'slow',
        timeFactor: 0.5,
        actionSpeedOnly: true,
      };

      const applier = getEffectApplier('temporal');
      const context = createMockContext(effect);

      const result = applier.apply(effect, mockCaster, mockTarget, mockWorld, context);

      expect(result.success).toBe(true);
      expect(result.appliedValues.timeFactor).toBe(0.5);
      expect(mockTarget.getComponent('status_effects').timeScale).toBe(0.5);
    });

    it('should apply severe slow (quarter speed)', () => {
      const effect: SpellEffect = {
        id: 'mass_slow',
        name: 'Mass Slow',
        description: 'Drastically slows targets',
        category: 'temporal',
        targetType: 'area',
        targetFilter: 'enemies',
        range: 20,
        duration: 300,
        dispellable: true,
        stackable: false,
        tags: ['temporal', 'slow', 'area'],
        temporalType: 'slow',
        timeFactor: 0.25,
        actionSpeedOnly: false,
      };

      const applier = getEffectApplier('temporal');
      const context = createMockContext(effect);

      const result = applier.apply(effect, mockCaster, mockTarget, mockWorld, context);

      expect(result.success).toBe(true);
      expect(result.appliedValues.timeFactor).toBe(0.25);
    });
  });

  describe('Haste Effects', () => {
    it('should haste target to double speed', () => {
      const effect: SpellEffect = {
        id: 'haste',
        name: 'Haste',
        description: 'Doubles target speed',
        category: 'temporal',
        targetType: 'single',
        targetFilter: 'allies',
        range: 10,
        duration: 600,
        dispellable: true,
        stackable: false,
        tags: ['temporal', 'haste', 'buff'],
        temporalType: 'haste',
        timeFactor: 2.0,
        actionSpeedOnly: true,
      };

      const applier = getEffectApplier('temporal');
      const context = createMockContext(effect);

      const result = applier.apply(effect, mockCaster, mockTarget, mockWorld, context);

      expect(result.success).toBe(true);
      expect(result.appliedValues.timeFactor).toBe(2.0);
      expect(mockTarget.getComponent('status_effects').timeScale).toBe(2.0);
    });

    it('should apply extreme haste', () => {
      const effect: SpellEffect = {
        id: 'time_acceleration',
        name: 'Time Acceleration',
        description: 'Massively speeds up time for target',
        category: 'temporal',
        targetType: 'single',
        targetFilter: 'allies',
        range: 5,
        duration: 120,
        dispellable: true,
        stackable: false,
        tags: ['temporal', 'haste', 'extreme'],
        temporalType: 'haste',
        timeFactor: 4.0,
        actionSpeedOnly: false,
      };

      const applier = getEffectApplier('temporal');
      const context = createMockContext(effect);

      const result = applier.apply(effect, mockCaster, mockTarget, mockWorld, context);

      expect(result.success).toBe(true);
      expect(result.appliedValues.timeFactor).toBe(4.0);
    });
  });

  describe('Time Stop', () => {
    it('should completely stop time for target', () => {
      const effect: SpellEffect = {
        id: 'time_stop',
        name: 'Time Stop',
        description: 'Freezes target in time',
        category: 'temporal',
        targetType: 'single',
        targetFilter: 'enemies',
        range: 15,
        duration: 60,
        dispellable: true,
        stackable: false,
        tags: ['temporal', 'stop', 'control'],
        temporalType: 'stop',
        timeFactor: 0.0,
        actionSpeedOnly: false,
      };

      const applier = getEffectApplier('temporal');
      const context = createMockContext(effect);

      const result = applier.apply(effect, mockCaster, mockTarget, mockWorld, context);

      expect(result.success).toBe(true);
      expect(result.appliedValues.timeFactor).toBe(0.0);
      expect(mockTarget.getComponent('status_effects').timeScale).toBe(0.0);
    });

    it('should stop time in area', () => {
      const effect: SpellEffect = {
        id: 'temporal_stasis_field',
        name: 'Temporal Stasis Field',
        description: 'Freezes time in area',
        category: 'temporal',
        targetType: 'area',
        targetFilter: 'any',
        range: 20,
        duration: 120,
        dispellable: true,
        stackable: false,
        tags: ['temporal', 'stop', 'area'],
        temporalType: 'stop',
        timeFactor: 0.0,
        actionSpeedOnly: false,
      };

      const applier = getEffectApplier('temporal');
      const context = createMockContext(effect);

      const result = applier.apply(effect, mockCaster, mockTarget, mockWorld, context);

      expect(result.success).toBe(true);
    });
  });

  describe('Aging Effects', () => {
    it('should age target forward', () => {
      const effect: SpellEffect = {
        id: 'age_creature',
        name: 'Age Creature',
        description: 'Ages target rapidly',
        category: 'temporal',
        targetType: 'single',
        targetFilter: 'living',
        range: 10,
        duration: undefined,
        dispellable: false,
        stackable: true,
        tags: ['temporal', 'age', 'attack'],
        temporalType: 'age',
        ageChange: 10,
        actionSpeedOnly: false,
      };

      const applier = getEffectApplier('temporal');
      const context = createMockContext(effect);

      const result = applier.apply(effect, mockCaster, mockTarget, mockWorld, context);

      expect(result.success).toBe(true);
      expect(result.appliedValues.ageChange).toBe(10);
    });

    it('should reverse aging (make younger)', () => {
      const effect: SpellEffect = {
        id: 'reverse_aging',
        name: 'Reverse Aging',
        description: 'Makes target younger',
        category: 'temporal',
        targetType: 'single',
        targetFilter: 'allies',
        range: 1,
        duration: undefined,
        dispellable: false,
        stackable: false,
        tags: ['temporal', 'age', 'restoration'],
        temporalType: 'age',
        ageChange: -5,
        actionSpeedOnly: false,
      };

      const applier = getEffectApplier('temporal');
      const context = createMockContext(effect);

      const result = applier.apply(effect, mockCaster, mockTarget, mockWorld, context);

      expect(result.success).toBe(true);
      expect(result.appliedValues.ageChange).toBe(-5);
    });

    it('should age target to dust (extreme aging)', () => {
      const effect: SpellEffect = {
        id: 'disintegrate_time',
        name: 'Temporal Disintegration',
        description: 'Ages target to dust',
        category: 'temporal',
        targetType: 'single',
        targetFilter: 'enemies',
        range: 15,
        duration: undefined,
        dispellable: false,
        stackable: false,
        tags: ['temporal', 'age', 'death'],
        temporalType: 'age',
        ageChange: 1000,
        actionSpeedOnly: false,
      };

      const applier = getEffectApplier('temporal');
      const context = createMockContext(effect);

      const result = applier.apply(effect, mockCaster, mockTarget, mockWorld, context);

      expect(result.success).toBe(true);
      expect(result.appliedValues.ageChange).toBeGreaterThanOrEqual(1000);
    });
  });

  describe('Time Rewind', () => {
    it('should rewind target state', () => {
      const effect: SpellEffect = {
        id: 'rewind_time',
        name: 'Rewind Time',
        description: 'Reverts target to earlier state',
        category: 'temporal',
        targetType: 'single',
        targetFilter: 'any',
        range: 10,
        duration: undefined,
        dispellable: false,
        stackable: false,
        tags: ['temporal', 'rewind', 'utility'],
        temporalType: 'rewind',
        timeFactor: -60,
        actionSpeedOnly: false,
      };

      const applier = getEffectApplier('temporal');
      const context = createMockContext(effect);

      const result = applier.apply(effect, mockCaster, mockTarget, mockWorld, context);

      expect(result.success).toBe(true);
      expect(result.appliedValues.rewindTicks).toBe(60);
    });
  });

  describe('Proficiency Scaling', () => {
    it('should scale time factor with proficiency for slow', () => {
      const effect: SpellEffect = {
        id: 'scaling_slow',
        name: 'Scaling Slow',
        description: 'Slow that scales with power',
        category: 'temporal',
        targetType: 'single',
        targetFilter: 'enemies',
        range: 20,
        duration: 600,
        dispellable: true,
        stackable: false,
        tags: ['temporal', 'slow'],
        temporalType: 'slow',
        timeFactor: 0.7,
        actionSpeedOnly: true,
      };

      const applier = getEffectApplier('temporal');

      const context1 = createMockContext(effect, { proficiency: 20 });
      const result1 = applier.apply(effect, mockCaster, createMockEntity('target1', { stats: {}, status_effects: { timeScale: 1.0 } }), mockWorld, context1);

      const context2 = createMockContext(effect, { proficiency: 80 });
      const result2 = applier.apply(effect, mockCaster, createMockEntity('target2', { stats: {}, status_effects: { timeScale: 1.0 } }), mockWorld, context2);

      expect(result1.success).toBe(true);
      expect(result2.success).toBe(true);
      expect(result2.appliedValues.timeFactor).toBeLessThan(result1.appliedValues.timeFactor);
    });

    it('should scale duration with proficiency', () => {
      const effect: SpellEffect = {
        id: 'long_haste',
        name: 'Enduring Haste',
        description: 'Haste with scaling duration',
        category: 'temporal',
        targetType: 'single',
        targetFilter: 'allies',
        range: 10,
        duration: 300,
        dispellable: true,
        stackable: false,
        tags: ['temporal', 'haste'],
        temporalType: 'haste',
        timeFactor: 2.0,
        actionSpeedOnly: true,
      };

      const applier = getEffectApplier('temporal');

      const context1 = createMockContext(effect, { proficiency: 30 });
      const result1 = applier.apply(effect, mockCaster, createMockEntity('target1', { stats: {}, status_effects: { timeScale: 1.0 } }), mockWorld, context1);

      const context2 = createMockContext(effect, { proficiency: 90 });
      const result2 = applier.apply(effect, mockCaster, createMockEntity('target2', { stats: {}, status_effects: { timeScale: 1.0 } }), mockWorld, context2);

      expect(result1.success).toBe(true);
      expect(result2.success).toBe(true);
    });
  });

  describe('Edge Cases', () => {
    it('should handle conflicting temporal effects', () => {
      const slow: SpellEffect = {
        id: 'slow',
        name: 'Slow',
        description: 'Slows target',
        category: 'temporal',
        targetType: 'single',
        targetFilter: 'any',
        range: 20,
        duration: 600,
        dispellable: true,
        stackable: false,
        tags: ['temporal', 'slow'],
        temporalType: 'slow',
        timeFactor: 0.5,
        actionSpeedOnly: true,
      };

      const haste: SpellEffect = {
        id: 'haste',
        name: 'Haste',
        description: 'Hastes target',
        category: 'temporal',
        targetType: 'single',
        targetFilter: 'any',
        range: 20,
        duration: 600,
        dispellable: true,
        stackable: false,
        tags: ['temporal', 'haste'],
        temporalType: 'haste',
        timeFactor: 2.0,
        actionSpeedOnly: true,
      };

      const applier = getEffectApplier('temporal');

      const context1 = createMockContext(slow);
      const result1 = applier.apply(slow, mockCaster, mockTarget, mockWorld, context1);

      const context2 = createMockContext(haste);
      const result2 = applier.apply(haste, mockCaster, mockTarget, mockWorld, context2);

      expect(result1.success).toBe(true);
      expect(result2.success).toBe(true);
    });

    it('should prevent time factor below 0', () => {
      const effect: SpellEffect = {
        id: 'reverse_time',
        name: 'Reverse Time',
        description: 'Attempts to reverse time flow',
        category: 'temporal',
        targetType: 'single',
        targetFilter: 'any',
        range: 10,
        duration: 300,
        dispellable: true,
        stackable: false,
        tags: ['temporal', 'experimental'],
        temporalType: 'slow',
        timeFactor: -1.0,
        actionSpeedOnly: false,
      };

      const applier = getEffectApplier('temporal');
      const context = createMockContext(effect);

      const result = applier.apply(effect, mockCaster, mockTarget, mockWorld, context);

      expect(result.success).toBe(false);
    });

    it('should prevent extreme time acceleration', () => {
      const effect: SpellEffect = {
        id: 'ludicrous_speed',
        name: 'Ludicrous Speed',
        description: 'Impossibly fast',
        category: 'temporal',
        targetType: 'single',
        targetFilter: 'any',
        range: 5,
        duration: 60,
        dispellable: true,
        stackable: false,
        tags: ['temporal', 'haste', 'extreme'],
        temporalType: 'haste',
        timeFactor: 100.0,
        actionSpeedOnly: true,
      };

      const applier = getEffectApplier('temporal');
      const context = createMockContext(effect);

      const result = applier.apply(effect, mockCaster, mockTarget, mockWorld, context);

      expect(result.success).toBe(true);
      expect(result.appliedValues.timeFactor).toBeLessThanOrEqual(10);
    });

    it('should handle aging on immortal entities', () => {
      const immortalTarget = createMockEntity('immortal', {
        stats: {},
        immortal: true,
      });

      const effect: SpellEffect = {
        id: 'age_immortal',
        name: 'Age Immortal',
        description: 'Tries to age immortal being',
        category: 'temporal',
        targetType: 'single',
        targetFilter: 'any',
        range: 10,
        duration: undefined,
        dispellable: false,
        stackable: false,
        tags: ['temporal', 'age'],
        temporalType: 'age',
        ageChange: 100,
        actionSpeedOnly: false,
      };

      const applier = getEffectApplier('temporal');
      const context = createMockContext(effect);

      const result = applier.apply(effect, mockCaster, immortalTarget, mockWorld, context);

      expect(result.success).toBe(false);
      expect(result.error).toContain('immortal');
    });

    it('should handle action speed vs all time distinction', () => {
      const actionOnly: SpellEffect = {
        id: 'quick_hands',
        name: 'Quick Hands',
        description: 'Speeds only actions',
        category: 'temporal',
        targetType: 'single',
        targetFilter: 'allies',
        range: 5,
        duration: 600,
        dispellable: true,
        stackable: false,
        tags: ['temporal', 'haste'],
        temporalType: 'haste',
        timeFactor: 1.5,
        actionSpeedOnly: true,
      };

      const allTime: SpellEffect = {
        id: 'full_haste',
        name: 'Full Haste',
        description: 'Speeds all time',
        category: 'temporal',
        targetType: 'single',
        targetFilter: 'allies',
        range: 5,
        duration: 600,
        dispellable: true,
        stackable: false,
        tags: ['temporal', 'haste'],
        temporalType: 'haste',
        timeFactor: 1.5,
        actionSpeedOnly: false,
      };

      const applier = getEffectApplier('temporal');

      const context1 = createMockContext(actionOnly);
      const result1 = applier.apply(actionOnly, mockCaster, createMockEntity('target1', { stats: {}, status_effects: { timeScale: 1.0 } }), mockWorld, context1);

      const context2 = createMockContext(allTime);
      const result2 = applier.apply(allTime, mockCaster, createMockEntity('target2', { stats: {}, status_effects: { timeScale: 1.0 } }), mockWorld, context2);

      expect(result1.success).toBe(true);
      expect(result2.success).toBe(true);
    });

    it('should handle time stop expiration', () => {
      const effect: SpellEffect = {
        id: 'brief_stop',
        name: 'Brief Stop',
        description: 'Very short time stop',
        category: 'temporal',
        targetType: 'single',
        targetFilter: 'enemies',
        range: 10,
        duration: 10,
        dispellable: true,
        stackable: false,
        tags: ['temporal', 'stop'],
        temporalType: 'stop',
        timeFactor: 0.0,
        actionSpeedOnly: false,
      };

      const applier = getEffectApplier('temporal');
      const context = createMockContext(effect);

      const result = applier.apply(effect, mockCaster, mockTarget, mockWorld, context);

      expect(result.success).toBe(true);
      expect(result.remainingDuration).toBe(10);
    });
  });
});
