/**
 * ParadigmEffectApplier Tests
 *
 * Tests for paradigm manipulation effects:
 * - Paradigm shifts
 * - Granting paradigm access
 * - Paradigm suppression/nullification
 * - Cross-paradigm adaptations
 * - Paradigm teaching
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ParadigmEffectApplier } from '../appliers/ParadigmEffectApplier.js';
import type { ParadigmEffect } from '../SpellEffect.js';
import type { EffectContext } from '../SpellEffectExecutor.js';
import type { Entity, MagicComponent, World } from '@ai-village/core';

// =============================================================================
// Mock Helpers
// =============================================================================

function createMockWorld(): World {
  return {
    entities: new Map(),
    getEntity: (id: string) => undefined,
    tick: () => {},
  } as any;
}

function createMockEntity(id: string, hasMagic: boolean = true): Entity {
  const components = new Map();

  if (hasMagic) {
    const magic: MagicComponent = {
      type: 'magic',
      magicUser: true,
      homeParadigmId: 'academic',
      knownParadigmIds: ['academic'],
      activeParadigmId: 'academic',
      paradigmState: {},
      manaPools: [],
      resourcePools: {},
      knownSpells: [],
      sustainedEffects: [],
      castingState: 'idle',
      activeEffects: [],
      totalSpellsCast: 0,
      spellcastingProficiency: 50,
      techniqueProficiency: {},
      formProficiency: {},
      paradigmAlignment: 0,
    };
    components.set('magic', magic);
  }

  return {
    id,
    components,
    getComponent: function(type: string) {
      return this.components.get(type);
    },
    addComponent: function(type: string, data: any) {
      this.components.set(type, data);
    },
  } as any;
}

function createMockContext(tick: number = 1000): EffectContext {
  return {
    tick,
    spell: {
      id: 'test_spell',
      name: 'Test Spell',
      paradigmId: 'test',
      technique: 'transform' as any,
      form: 'body' as any,
      source: 'arcane' as any,
      manaCost: 10,
      castTime: 5,
      range: 10,
      effectId: 'test_effect',
    },
    casterMagic: {
      activeParadigmId: 'academic',
      totalSpellsCast: 10,
      spellcastingProficiency: 50,
    } as any,
    scaledValues: new Map(),
    isCrit: false,
    powerMultiplier: 1.0,
  };
}

function createParadigmEffect(
  operation: string,
  paradigmId?: string,
  extraParams: Record<string, any> = {}
): ParadigmEffect {
  return {
    id: 'paradigm_effect',
    name: 'Paradigm Effect',
    description: 'Test paradigm effect',
    category: 'paradigm',
    targetType: 'single',
    targetFilter: 'any',
    range: 10,
    dispellable: true,
    stackable: false,
    tags: ['paradigm'],
    paradigmId: paradigmId || 'test',
    paradigmEffectType: operation,
    parameters: {
      operation,
      paradigmId,
      ...extraParams,
    },
  };
}

// =============================================================================
// Tests
// =============================================================================

describe('ParadigmEffectApplier', () => {
  let applier: ParadigmEffectApplier;
  let world: World;
  let caster: Entity;
  let target: Entity;
  let context: EffectContext;

  beforeEach(() => {
    applier = new ParadigmEffectApplier();
    world = createMockWorld();
    caster = createMockEntity('caster');
    target = createMockEntity('target');
    context = createMockContext();
  });

  describe('Paradigm Shifts', () => {
    it('should shift caster to new paradigm', () => {
      const effect = createParadigmEffect('shift', 'divine');
      const targetMagic = target.getComponent('magic') as MagicComponent;

      const result = applier.apply(effect, caster, target, world, context);

      expect(result.success).toBe(true);
      expect(targetMagic.activeParadigmId).toBe('divine');
      expect(targetMagic.knownParadigmIds).toContain('divine');
      expect(result.appliedValues.paradigmShift).toBe(1);
    });

    it('should prevent shifting to same paradigm', () => {
      const effect = createParadigmEffect('shift', 'academic');

      const result = applier.apply(effect, caster, target, world, context);

      expect(result.success).toBe(false);
      expect(result.error).toContain('already using paradigm');
    });
  });

  describe('Granting Paradigm Access', () => {
    it('should grant target access to paradigm', () => {
      const effect = createParadigmEffect('grant', 'pact');
      const targetMagic = target.getComponent('magic') as MagicComponent;

      const result = applier.apply(effect, caster, target, world, context);

      expect(result.success).toBe(true);
      expect(targetMagic.knownParadigmIds).toContain('pact');
      expect(result.appliedValues.paradigmsGranted).toBe(1);
    });

    it('should handle granting already-known paradigm gracefully', () => {
      const effect = createParadigmEffect('grant', 'academic');

      const result = applier.apply(effect, caster, target, world, context);

      expect(result.success).toBe(true);
      expect(result.appliedValues.alreadyKnown).toBe(1);
    });
  });

  describe('Paradigm Suppression', () => {
    it('should suppress target paradigm temporarily', () => {
      const effect = createParadigmEffect('suppress', 'academic');
      effect.duration = 100;
      const targetMagic = target.getComponent('magic') as MagicComponent;

      const result = applier.apply(effect, caster, target, world, context);

      expect(result.success).toBe(true);
      expect(targetMagic.paradigmState.academic).toBeDefined();
      expect((targetMagic.paradigmState.academic as any).suppressed).toBe(true);
      expect(result.appliedValues.paradigmsSuppressed).toBe(1);
    });

    it('should nullify specific paradigm', () => {
      const effect = createParadigmEffect('nullify', 'academic');
      const targetMagic = target.getComponent('magic') as MagicComponent;

      // Add another paradigm first
      targetMagic.knownParadigmIds.push('divine');

      const result = applier.apply(effect, caster, target, world, context);

      expect(result.success).toBe(true);
      expect(targetMagic.knownParadigmIds).not.toContain('academic');
      expect(targetMagic.activeParadigmId).toBeUndefined();
      expect(result.appliedValues.paradigmsNullified).toBe(1);
    });
  });

  describe('Cross-Paradigm Adaptation', () => {
    it('should enable cross-paradigm adaptation', () => {
      const effect = createParadigmEffect('adapt', undefined, {
        spellId: 'fireball',
        adaptationType: 'translated',
        costModifier: 1.5,
      });
      const targetMagic = target.getComponent('magic') as MagicComponent;

      const result = applier.apply(effect, caster, target, world, context);

      expect(result.success).toBe(true);
      expect(targetMagic.adaptations).toBeDefined();
      expect(targetMagic.adaptations).toHaveLength(1);
      expect(targetMagic.adaptations![0].spellId).toBe('fireball');
      expect(targetMagic.adaptations![0].adaptationType).toBe('translated');
      expect(targetMagic.adaptations![0].modifications.costModifier).toBe(1.5);
    });

    it('should transfer paradigm knowledge', () => {
      const effect = createParadigmEffect('grant', 'void');
      const targetMagic = target.getComponent('magic') as MagicComponent;

      const result = applier.apply(effect, caster, target, world, context);

      expect(result.success).toBe(true);
      expect(targetMagic.knownParadigmIds).toContain('void');
    });
  });

  describe('Paradigm Teaching', () => {
    it('should teach paradigm to target', () => {
      const effect = createParadigmEffect('teach', 'blood');
      const targetMagic = target.getComponent('magic') as MagicComponent;

      const result = applier.apply(effect, caster, target, world, context);

      expect(result.success).toBe(true);
      expect(targetMagic.knownParadigmIds).toContain('blood');
      expect(result.appliedValues.paradigmsGranted).toBe(1);
    });

    it('should not teach if target lacks magic component', () => {
      const nonMagicTarget = createMockEntity('non_magic', false);
      const effect = createParadigmEffect('teach', 'divine');

      const result = applier.apply(effect, caster, nonMagicTarget, world, context);

      expect(result.success).toBe(false);
      expect(result.error).toContain('no magic component');
    });
  });

  describe('Paradigm-Specific State', () => {
    it('should reset corruption when shifting from void', () => {
      const targetMagic = target.getComponent('magic') as MagicComponent;

      // Set up void paradigm with corruption
      targetMagic.activeParadigmId = 'void';
      targetMagic.corruption = 50;
      targetMagic.knownParadigmIds.push('void');

      const effect = createParadigmEffect('shift', 'divine');
      const result = applier.apply(effect, caster, target, world, context);

      expect(result.success).toBe(true);
      expect(targetMagic.activeParadigmId).toBe('divine');
      expect(targetMagic.corruption).toBe(0);
    });

    it('should preserve patron favor on paradigm shift', () => {
      const targetMagic = target.getComponent('magic') as MagicComponent;

      // Set up pact paradigm with patron favor
      targetMagic.activeParadigmId = 'pact';
      targetMagic.paradigmState.pact = { patronFavor: 75 };
      targetMagic.knownParadigmIds.push('pact');

      const effect = createParadigmEffect('shift', 'divine');
      const result = applier.apply(effect, caster, target, world, context);

      expect(result.success).toBe(true);
      expect(targetMagic.activeParadigmId).toBe('divine');
      // Favor should be preserved (not reset)
      expect((targetMagic.paradigmState.pact as any).patronFavor).toBe(75);
    });
  });

  describe('Edge Cases', () => {
    it('should handle entities without magic component', () => {
      const nonMagicTarget = createMockEntity('non_magic', false);
      const effect = createParadigmEffect('shift', 'divine');

      const result = applier.apply(effect, caster, nonMagicTarget, world, context);

      expect(result.success).toBe(false);
      expect(result.error).toContain('no magic component');
    });

    it('should handle unknown paradigm IDs gracefully', () => {
      const effect = createParadigmEffect('grant', 'unknown_paradigm_xyz');
      const targetMagic = target.getComponent('magic') as MagicComponent;

      const result = applier.apply(effect, caster, target, world, context);

      // Gracefully accepts unknown paradigms (validation happens elsewhere)
      expect(result.success).toBe(true);
      expect(targetMagic.knownParadigmIds).toContain('unknown_paradigm_xyz');
    });

    it('should prevent shifting to same paradigm', () => {
      const effect = createParadigmEffect('shift', 'academic');

      const result = applier.apply(effect, caster, target, world, context);

      expect(result.success).toBe(false);
      expect(result.error).toContain('already using');
    });
  });
});
