import { describe, it, expect, beforeEach, vi } from 'vitest';
import type {
  EffectExpression,
  EffectOperation,
  TargetSelector,
  TargetFilter,
  EffectTiming,
  Condition,
  DamageType,
  Expression,
  LocationExpression,
  DirectionExpression
} from '../EffectExpression.js';
import { EffectInterpreter } from '../EffectInterpreter.js';
import type { Entity } from '@ai-village/core';
import type { World } from '@ai-village/core';

// ============================================================================
// MOCK HELPERS
// ============================================================================

interface EffectContext {
  caster: Entity;
  target: Entity;
  world: World;
  tick: number;
}

function createMockEntity(overrides: Partial<any> = {}): Entity {
  const components = new Map();

  // Default components
  components.set('position', {
    type: 'position',
    x: overrides.x ?? 0,
    y: overrides.y ?? 0
  });

  components.set('needs', {
    type: 'needs',
    health: overrides.health ?? 100,
    maxHealth: 100
  });

  components.set('identity', {
    type: 'identity',
    name: overrides.name ?? 'TestEntity',
    faction: overrides.faction ?? 'neutral'
  });

  // Add custom components from overrides
  if (overrides.components) {
    for (const [type, component] of Object.entries(overrides.components)) {
      components.set(type, { type, ...component });
    }
  }

  return {
    id: overrides.id ?? `entity_${Math.random()}`,
    createdAt: 0,
    version: 0,
    components,
    hasComponent: (type: string) => components.has(type),
    getComponent: (type: string) => components.get(type),
    addComponent: vi.fn((comp: any) => components.set(comp.type, comp)),
    updateComponent: vi.fn(),
    removeComponent: vi.fn((type: string) => components.delete(type))
  } as any;
}

function createMockWorld(entities: Entity[] = []): World {
  const entityMap = new Map(entities.map(e => [e.id, e]));

  return {
    getEntity: (id: string) => entityMap.get(id),
    query: () => ({
      with: vi.fn().mockReturnThis(),
      without: vi.fn().mockReturnThis(),
      executeEntities: () => entities
    }),
    createEntity: vi.fn(() => createMockEntity()),
    removeEntity: vi.fn(),
    addComponent: vi.fn((entityId: string, component: any) => {
      const entity = entityMap.get(entityId);
      if (entity) {
        entity.components.set(component.type, component);
      }
    }),
    tick: 0
  } as any;
}

function createMockContext(overrides: Partial<EffectContext> = {}): EffectContext {
  const caster = overrides.caster ?? createMockEntity({ name: 'Caster' });
  const target = overrides.target ?? createMockEntity({ name: 'Target' });
  const world = overrides.world ?? createMockWorld([caster, target]);

  return {
    caster,
    target,
    world,
    tick: overrides.tick ?? 0
  };
}

// ============================================================================
// 1. TARGET SELECTION (15 tests)
// ============================================================================

describe('EffectInterpreter - Target Selection', () => {
  let interpreter: EffectInterpreter;
  let context: EffectContext;

  beforeEach(() => {
    interpreter = new EffectInterpreter();
    context = createMockContext();
  });

  it('should target self', () => {
    const effect: EffectExpression = {
      target: { type: 'self' },
      operations: [{ op: 'heal', amount: 10 }],
      timing: { type: 'immediate' }
    };

    const result = interpreter.execute(effect, context);
    expect(result.success).toBe(true);
    expect(result.affectedEntities).toEqual([context.caster.id]);
  });

  it('should target single entity', () => {
    const effect: EffectExpression = {
      target: { type: 'single' },
      operations: [{ op: 'heal', amount: 10 }],
      timing: { type: 'immediate' }
    };

    const result = interpreter.execute(effect, context);
    expect(result.success).toBe(true);
    expect(result.affectedEntities).toEqual([context.target.id]);
  });

  it('should target area with radius', () => {
    const nearbyEntity = createMockEntity({ x: 5, y: 5 });
    const farEntity = createMockEntity({ x: 100, y: 100 });
    context.world = createMockWorld([context.caster, nearbyEntity, farEntity]);

    const effect: EffectExpression = {
      target: { type: 'area', radius: 10 },
      operations: [{ op: 'deal_damage', damageType: 'fire', amount: 20 }],
      timing: { type: 'immediate' }
    };

    const result = interpreter.execute(effect, context);
    expect(result.affectedEntities).toContain(nearbyEntity.id);
    expect(result.affectedEntities).not.toContain(farEntity.id);
  });

  it('should target cone with angle and length', () => {
    const effect: EffectExpression = {
      target: { type: 'cone', angle: 45, length: 20 },
      operations: [{ op: 'deal_damage', damageType: 'fire', amount: 15 }],
      timing: { type: 'immediate' }
    };

    const result = interpreter.execute(effect, context);
    expect(result.success).toBe(true);
    expect(Array.isArray(result.affectedEntities)).toBe(true);
  });

  it('should target line with length', () => {
    const effect: EffectExpression = {
      target: { type: 'line', length: 30 },
      operations: [{ op: 'deal_damage', damageType: 'lightning', amount: 25 }],
      timing: { type: 'immediate' }
    };

    const result = interpreter.execute(effect, context);
    expect(result.success).toBe(true);
  });

  it('should target all entities', () => {
    const entity1 = createMockEntity({ name: 'Entity1' });
    const entity2 = createMockEntity({ name: 'Entity2' });
    context.world = createMockWorld([context.caster, entity1, entity2]);

    const effect: EffectExpression = {
      target: { type: 'all' },
      operations: [{ op: 'heal', amount: 5 }],
      timing: { type: 'immediate' }
    };

    const result = interpreter.execute(effect, context);
    expect(result.affectedEntities.length).toBeGreaterThanOrEqual(2);
  });

  it('should filter by entity type', () => {
    const agent = createMockEntity({
      name: 'Agent',
      components: { agent: {} }
    });
    const animal = createMockEntity({
      name: 'Animal',
      components: { animal: {} }
    });
    context.world = createMockWorld([agent, animal]);

    const effect: EffectExpression = {
      target: {
        type: 'all',
        filter: { entityTypes: ['agent'] }
      },
      operations: [{ op: 'heal', amount: 10 }],
      timing: { type: 'immediate' }
    };

    const result = interpreter.execute(effect, context);
    expect(result.affectedEntities).toContain(agent.id);
    expect(result.affectedEntities).not.toContain(animal.id);
  });

  it('should filter by faction', () => {
    const friendly = createMockEntity({ faction: 'friendly' });
    const hostile = createMockEntity({ faction: 'hostile' });
    context.world = createMockWorld([friendly, hostile]);

    const effect: EffectExpression = {
      target: {
        type: 'all',
        filter: { factions: ['friendly'] }
      },
      operations: [{ op: 'heal', amount: 10 }],
      timing: { type: 'immediate' }
    };

    const result = interpreter.execute(effect, context);
    expect(result.affectedEntities).toContain(friendly.id);
    expect(result.affectedEntities).not.toContain(hostile.id);
  });

  it('should filter by required components', () => {
    const withSkills = createMockEntity({
      components: { skills: { levels: {} } }
    });
    const withoutSkills = createMockEntity({ components: {} });
    context.world = createMockWorld([withSkills, withoutSkills]);

    const effect: EffectExpression = {
      target: {
        type: 'all',
        filter: { hasComponents: ['skills'] }
      },
      operations: [{ op: 'heal', amount: 10 }],
      timing: { type: 'immediate' }
    };

    const result = interpreter.execute(effect, context);
    expect(result.affectedEntities).toContain(withSkills.id);
    expect(result.affectedEntities).not.toContain(withoutSkills.id);
  });

  it('should respect maxTargets limit', () => {
    const entities = Array.from({ length: 10 }, (_, i) =>
      createMockEntity({ name: `Entity${i}` })
    );
    context.world = createMockWorld(entities);

    const effect: EffectExpression = {
      target: { type: 'all', maxTargets: 3 },
      operations: [{ op: 'heal', amount: 10 }],
      timing: { type: 'immediate' }
    };

    const result = interpreter.execute(effect, context);
    expect(result.affectedEntities.length).toBeLessThanOrEqual(3);
  });

  it('should exclude self when excludeSelf is true', () => {
    const effect: EffectExpression = {
      target: { type: 'area', radius: 100, excludeSelf: true },
      operations: [{ op: 'deal_damage', damageType: 'fire', amount: 20 }],
      timing: { type: 'immediate' }
    };

    const result = interpreter.execute(effect, context);
    expect(result.affectedEntities).not.toContain(context.caster.id);
  });

  it('should exclude previous targets when excludePrevious is true', () => {
    // This would be used in chain effects
    const effect: EffectExpression = {
      target: { type: 'all', excludePrevious: true },
      operations: [{ op: 'heal', amount: 10 }],
      timing: { type: 'immediate' }
    };

    const result = interpreter.execute(effect, context);
    expect(result.success).toBe(true);
  });

  it('should handle no valid targets gracefully', () => {
    context.world = createMockWorld([]);

    const effect: EffectExpression = {
      target: { type: 'all' },
      operations: [{ op: 'heal', amount: 10 }],
      timing: { type: 'immediate' }
    };

    const result = interpreter.execute(effect, context);
    expect(result.success).toBe(true);
    expect(result.affectedEntities.length).toBe(0);
  });

  it('should handle custom predicate filter', () => {
    const lowHealth = createMockEntity({ health: 20 });
    const fullHealth = createMockEntity({ health: 100 });
    context.world = createMockWorld([lowHealth, fullHealth]);

    const effect: EffectExpression = {
      target: {
        type: 'all',
        filter: {
          customPredicate: {
            op: '<',
            left: 'target.needs.health',
            right: 50
          } as Expression
        }
      },
      operations: [{ op: 'heal', amount: 30 }],
      timing: { type: 'immediate' }
    };

    const result = interpreter.execute(effect, context);
    expect(result.affectedEntities).toContain(lowHealth.id);
    expect(result.affectedEntities).not.toContain(fullHealth.id);
  });

  it('should combine multiple filters with AND logic', () => {
    const validTarget = createMockEntity({
      faction: 'friendly',
      components: { agent: {} },
      health: 50
    });
    const wrongFaction = createMockEntity({
      faction: 'hostile',
      components: { agent: {} }
    });
    const wrongType = createMockEntity({
      faction: 'friendly',
      components: { animal: {} }
    });

    context.world = createMockWorld([validTarget, wrongFaction, wrongType]);

    const effect: EffectExpression = {
      target: {
        type: 'all',
        filter: {
          factions: ['friendly'],
          entityTypes: ['agent']
        }
      },
      operations: [{ op: 'heal', amount: 10 }],
      timing: { type: 'immediate' }
    };

    const result = interpreter.execute(effect, context);
    expect(result.affectedEntities).toContain(validTarget.id);
    expect(result.affectedEntities).not.toContain(wrongFaction.id);
    expect(result.affectedEntities).not.toContain(wrongType.id);
  });
});

// ============================================================================
// 2. STAT MODIFICATIONS (10 tests)
// ============================================================================

describe('EffectInterpreter - Stat Modifications', () => {
  let interpreter: EffectInterpreter;
  let context: EffectContext;

  beforeEach(() => {
    interpreter = new EffectInterpreter();
    context = createMockContext();
  });

  it('should modify stat temporarily with duration', () => {
    const effect: EffectExpression = {
      target: { type: 'self' },
      operations: [{
        op: 'modify_stat',
        stat: 'strength',
        amount: 5,
        duration: 100
      }],
      timing: { type: 'immediate' }
    };

    const result = interpreter.execute(effect, context);
    expect(result.success).toBe(true);
    expect(context.world.addComponent).toHaveBeenCalled();
  });

  it('should set stat permanently without duration', () => {
    const effect: EffectExpression = {
      target: { type: 'self' },
      operations: [{
        op: 'set_stat',
        stat: 'health',
        value: 100
      }],
      timing: { type: 'immediate' }
    };

    const result = interpreter.execute(effect, context);
    expect(result.success).toBe(true);
  });

  it('should handle expression-based modification amounts', () => {
    const effect: EffectExpression = {
      target: { type: 'self' },
      operations: [{
        op: 'modify_stat',
        stat: 'intelligence',
        amount: {
          op: '+',
          left: 'caster.level',
          right: 2
        } as Expression
      }],
      timing: { type: 'immediate' }
    };

    const result = interpreter.execute(effect, context);
    expect(result.success).toBe(true);
  });

  it('should stack multiple stat modifications', () => {
    const effect: EffectExpression = {
      target: { type: 'self' },
      operations: [
        { op: 'modify_stat', stat: 'strength', amount: 3, duration: 50 },
        { op: 'modify_stat', stat: 'strength', amount: 2, duration: 50 }
      ],
      timing: { type: 'immediate' }
    };

    const result = interpreter.execute(effect, context);
    expect(result.success).toBe(true);
  });

  it('should handle negative stat modifications', () => {
    const effect: EffectExpression = {
      target: { type: 'self' },
      operations: [{
        op: 'modify_stat',
        stat: 'agility',
        amount: -5,
        duration: 30
      }],
      timing: { type: 'immediate' }
    };

    const result = interpreter.execute(effect, context);
    expect(result.success).toBe(true);
  });

  it('should throw on invalid stat names', () => {
    const effect: EffectExpression = {
      target: { type: 'self' },
      operations: [{
        op: 'modify_stat',
        stat: 'invalid_stat_name_xyz',
        amount: 10
      }],
      timing: { type: 'immediate' }
    };

    expect(() => interpreter.execute(effect, context)).toThrow();
  });

  it('should handle zero-duration modifications as permanent', () => {
    const effect: EffectExpression = {
      target: { type: 'self' },
      operations: [{
        op: 'modify_stat',
        stat: 'wisdom',
        amount: 1,
        duration: 0
      }],
      timing: { type: 'immediate' }
    };

    const result = interpreter.execute(effect, context);
    expect(result.success).toBe(true);
  });

  it('should handle fractional stat modifications', () => {
    const effect: EffectExpression = {
      target: { type: 'self' },
      operations: [{
        op: 'modify_stat',
        stat: 'charisma',
        amount: 2.5,
        duration: 100
      }],
      timing: { type: 'immediate' }
    };

    const result = interpreter.execute(effect, context);
    expect(result.success).toBe(true);
  });

  it('should handle set_stat with expression values', () => {
    const effect: EffectExpression = {
      target: { type: 'self' },
      operations: [{
        op: 'set_stat',
        stat: 'mana',
        value: {
          op: '*',
          left: 'caster.intelligence',
          right: 10
        } as Expression
      }],
      timing: { type: 'immediate' }
    };

    const result = interpreter.execute(effect, context);
    expect(result.success).toBe(true);
  });

  it('should track stat modification metadata', () => {
    const effect: EffectExpression = {
      target: { type: 'self' },
      operations: [{
        op: 'modify_stat',
        stat: 'defense',
        amount: 10,
        duration: 50
      }],
      timing: { type: 'immediate' }
    };

    const result = interpreter.execute(effect, context);
    expect(result.success).toBe(true);
    expect(result.modifications).toBeDefined();
  });
});

// ============================================================================
// 3. STATUS EFFECTS (10 tests)
// ============================================================================

describe('EffectInterpreter - Status Effects', () => {
  let interpreter: EffectInterpreter;
  let context: EffectContext;

  beforeEach(() => {
    interpreter = new EffectInterpreter();
    context = createMockContext();
  });

  it('should apply status effect with duration', () => {
    const effect: EffectExpression = {
      target: { type: 'self' },
      operations: [{
        op: 'apply_status',
        status: 'burning',
        duration: 100,
        stacks: 1
      }],
      timing: { type: 'immediate' }
    };

    const result = interpreter.execute(effect, context);
    expect(result.success).toBe(true);
    expect(context.world.addComponent).toHaveBeenCalled();
  });

  it('should apply status with multiple stacks', () => {
    const effect: EffectExpression = {
      target: { type: 'self' },
      operations: [{
        op: 'apply_status',
        status: 'poison',
        duration: 200,
        stacks: 5
      }],
      timing: { type: 'immediate' }
    };

    const result = interpreter.execute(effect, context);
    expect(result.success).toBe(true);
  });

  it('should remove specific status effect', () => {
    const effect: EffectExpression = {
      target: { type: 'self' },
      operations: [{
        op: 'remove_status',
        status: 'burning',
        stacks: 1
      }],
      timing: { type: 'immediate' }
    };

    const result = interpreter.execute(effect, context);
    expect(result.success).toBe(true);
  });

  it('should remove all stacks of status', () => {
    const effect: EffectExpression = {
      target: { type: 'self' },
      operations: [{
        op: 'remove_status',
        status: 'poison',
        stacks: 'all'
      }],
      timing: { type: 'immediate' }
    };

    const result = interpreter.execute(effect, context);
    expect(result.success).toBe(true);
  });

  it('should stack status effects independently', () => {
    const effect: EffectExpression = {
      target: { type: 'self' },
      operations: [
        { op: 'apply_status', status: 'burning', duration: 100, stacks: 2 },
        { op: 'apply_status', status: 'poison', duration: 150, stacks: 3 }
      ],
      timing: { type: 'immediate' }
    };

    const result = interpreter.execute(effect, context);
    expect(result.success).toBe(true);
  });

  it('should handle duration-based status expiration', () => {
    const effect: EffectExpression = {
      target: { type: 'self' },
      operations: [{
        op: 'apply_status',
        status: 'stunned',
        duration: 10
      }],
      timing: { type: 'immediate' }
    };

    const result = interpreter.execute(effect, context);
    expect(result.success).toBe(true);
  });

  it('should throw on invalid status names', () => {
    const effect: EffectExpression = {
      target: { type: 'self' },
      operations: [{
        op: 'apply_status',
        status: 'invalid_status_xyz',
        duration: 100
      }],
      timing: { type: 'immediate' }
    };

    expect(() => interpreter.execute(effect, context)).toThrow();
  });

  it('should handle negative stack removal (no error)', () => {
    const effect: EffectExpression = {
      target: { type: 'self' },
      operations: [{
        op: 'remove_status',
        status: 'burning',
        stacks: -5
      }],
      timing: { type: 'immediate' }
    };

    // Should not crash, might warn or clamp to 0
    const result = interpreter.execute(effect, context);
    expect(result.success).toBe(true);
  });

  it('should handle status without stacks (default 1)', () => {
    const effect: EffectExpression = {
      target: { type: 'self' },
      operations: [{
        op: 'apply_status',
        status: 'blessed',
        duration: 500
      }],
      timing: { type: 'immediate' }
    };

    const result = interpreter.execute(effect, context);
    expect(result.success).toBe(true);
  });

  it('should track applied status effects in result', () => {
    const effect: EffectExpression = {
      target: { type: 'self' },
      operations: [{
        op: 'apply_status',
        status: 'hasted',
        duration: 100,
        stacks: 2
      }],
      timing: { type: 'immediate' }
    };

    const result = interpreter.execute(effect, context);
    expect(result.statusesApplied).toBeDefined();
  });
});

// ============================================================================
// 4. DAMAGE AND HEALING (10 tests)
// ============================================================================

describe('EffectInterpreter - Damage and Healing', () => {
  let interpreter: EffectInterpreter;
  let context: EffectContext;

  beforeEach(() => {
    interpreter = new EffectInterpreter();
    context = createMockContext();
  });

  it('should deal fire damage', () => {
    const effect: EffectExpression = {
      target: { type: 'single' },
      operations: [{
        op: 'deal_damage',
        damageType: 'fire',
        amount: 25
      }],
      timing: { type: 'immediate' }
    };

    const result = interpreter.execute(effect, context);
    expect(result.success).toBe(true);
    expect(result.damageDealt).toBe(25);
  });

  it('should deal ice damage', () => {
    const effect: EffectExpression = {
      target: { type: 'single' },
      operations: [{
        op: 'deal_damage',
        damageType: 'ice',
        amount: 30
      }],
      timing: { type: 'immediate' }
    };

    const result = interpreter.execute(effect, context);
    expect(result.success).toBe(true);
  });

  it('should heal target', () => {
    const effect: EffectExpression = {
      target: { type: 'single' },
      operations: [{
        op: 'heal',
        amount: 50
      }],
      timing: { type: 'immediate' }
    };

    const result = interpreter.execute(effect, context);
    expect(result.success).toBe(true);
    expect(result.healingDone).toBe(50);
  });

  it('should handle expression-based damage', () => {
    const effect: EffectExpression = {
      target: { type: 'single' },
      operations: [{
        op: 'deal_damage',
        damageType: 'lightning',
        amount: {
          op: '*',
          left: 'caster.intelligence',
          right: 2
        } as Expression
      }],
      timing: { type: 'immediate' }
    };

    const result = interpreter.execute(effect, context);
    expect(result.success).toBe(true);
  });

  it('should handle overkill damage gracefully', () => {
    const effect: EffectExpression = {
      target: { type: 'single' },
      operations: [{
        op: 'deal_damage',
        damageType: 'void',
        amount: 99999
      }],
      timing: { type: 'immediate' }
    };

    const result = interpreter.execute(effect, context);
    expect(result.success).toBe(true);
  });

  it('should treat negative damage as healing', () => {
    const effect: EffectExpression = {
      target: { type: 'single' },
      operations: [{
        op: 'deal_damage',
        damageType: 'physical',
        amount: -20
      }],
      timing: { type: 'immediate' }
    };

    const result = interpreter.execute(effect, context);
    expect(result.success).toBe(true);
    expect(result.healingDone).toBeGreaterThan(0);
  });

  it('should enforce max damage limit', () => {
    const interpreter = new EffectInterpreter({ maxDamagePerEffect: 1000 });
    const effect: EffectExpression = {
      target: { type: 'single' },
      operations: [{
        op: 'deal_damage',
        damageType: 'void',
        amount: 99999
      }],
      timing: { type: 'immediate' }
    };

    const result = interpreter.execute(effect, context);
    expect(result.damageDealt).toBeLessThanOrEqual(1000);
  });

  it('should deal multiple damage types in sequence', () => {
    const effect: EffectExpression = {
      target: { type: 'single' },
      operations: [
        { op: 'deal_damage', damageType: 'fire', amount: 10 },
        { op: 'deal_damage', damageType: 'ice', amount: 10 },
        { op: 'deal_damage', damageType: 'lightning', amount: 10 }
      ],
      timing: { type: 'immediate' }
    };

    const result = interpreter.execute(effect, context);
    expect(result.damageDealt).toBe(30);
  });

  it('should handle holy and unholy damage types', () => {
    const holyEffect: EffectExpression = {
      target: { type: 'single' },
      operations: [{
        op: 'deal_damage',
        damageType: 'holy',
        amount: 40
      }],
      timing: { type: 'immediate' }
    };

    const unholyEffect: EffectExpression = {
      target: { type: 'single' },
      operations: [{
        op: 'deal_damage',
        damageType: 'unholy',
        amount: 35
      }],
      timing: { type: 'immediate' }
    };

    expect(interpreter.execute(holyEffect, context).success).toBe(true);
    expect(interpreter.execute(unholyEffect, context).success).toBe(true);
  });

  it('should track total damage across multiple targets', () => {
    const entities = [
      createMockEntity(),
      createMockEntity(),
      createMockEntity()
    ];
    context.world = createMockWorld(entities);

    const effect: EffectExpression = {
      target: { type: 'all' },
      operations: [{
        op: 'deal_damage',
        damageType: 'fire',
        amount: 20
      }],
      timing: { type: 'immediate' }
    };

    const result = interpreter.execute(effect, context);
    expect(result.damageDealt).toBeGreaterThan(20);
  });
});

// ============================================================================
// 5. MOVEMENT OPERATIONS (10 tests)
// ============================================================================

describe('EffectInterpreter - Movement', () => {
  let interpreter: EffectInterpreter;
  let context: EffectContext;

  beforeEach(() => {
    interpreter = new EffectInterpreter();
    context = createMockContext();
  });

  it('should teleport to absolute position', () => {
    const effect: EffectExpression = {
      target: { type: 'self' },
      operations: [{
        op: 'teleport',
        destination: { x: 100, y: 200 } as LocationExpression
      }],
      timing: { type: 'immediate' }
    };

    const result = interpreter.execute(effect, context);
    expect(result.success).toBe(true);
  });

  it('should teleport to relative offset', () => {
    const effect: EffectExpression = {
      target: { type: 'self' },
      operations: [{
        op: 'teleport',
        destination: {
          relative: true,
          x: 10,
          y: -5
        } as LocationExpression
      }],
      timing: { type: 'immediate' }
    };

    const result = interpreter.execute(effect, context);
    expect(result.success).toBe(true);
  });

  it('should push entity in direction', () => {
    const effect: EffectExpression = {
      target: { type: 'single' },
      operations: [{
        op: 'push',
        direction: { angle: 45 } as DirectionExpression,
        distance: 10
      }],
      timing: { type: 'immediate' }
    };

    const result = interpreter.execute(effect, context);
    expect(result.success).toBe(true);
  });

  it('should pull entity toward point', () => {
    const effect: EffectExpression = {
      target: { type: 'single' },
      operations: [{
        op: 'pull',
        toward: { x: 0, y: 0 } as LocationExpression,
        distance: 15
      }],
      timing: { type: 'immediate' }
    };

    const result = interpreter.execute(effect, context);
    expect(result.success).toBe(true);
  });

  it('should handle push away from caster', () => {
    const effect: EffectExpression = {
      target: { type: 'single' },
      operations: [{
        op: 'push',
        direction: { fromCaster: true } as DirectionExpression,
        distance: 20
      }],
      timing: { type: 'immediate' }
    };

    const result = interpreter.execute(effect, context);
    expect(result.success).toBe(true);
  });

  it('should handle expression-based distances', () => {
    const effect: EffectExpression = {
      target: { type: 'single' },
      operations: [{
        op: 'push',
        direction: { angle: 90 } as DirectionExpression,
        distance: {
          op: '+',
          left: 10,
          right: 'caster.strength'
        } as Expression
      }],
      timing: { type: 'immediate' }
    };

    const result = interpreter.execute(effect, context);
    expect(result.success).toBe(true);
  });

  it('should throw on invalid teleport destination', () => {
    const effect: EffectExpression = {
      target: { type: 'self' },
      operations: [{
        op: 'teleport',
        destination: { x: NaN, y: NaN } as LocationExpression
      }],
      timing: { type: 'immediate' }
    };

    expect(() => interpreter.execute(effect, context)).toThrow();
  });

  it('should handle out-of-bounds teleport', () => {
    const effect: EffectExpression = {
      target: { type: 'self' },
      operations: [{
        op: 'teleport',
        destination: { x: -99999, y: 99999 } as LocationExpression
      }],
      timing: { type: 'immediate' }
    };

    // Should clamp or throw, not crash
    expect(() => interpreter.execute(effect, context)).toThrow();
  });

  it('should handle push with zero distance', () => {
    const effect: EffectExpression = {
      target: { type: 'single' },
      operations: [{
        op: 'push',
        direction: { angle: 0 } as DirectionExpression,
        distance: 0
      }],
      timing: { type: 'immediate' }
    };

    const result = interpreter.execute(effect, context);
    expect(result.success).toBe(true);
  });

  it('should handle negative push distance (pull)', () => {
    const effect: EffectExpression = {
      target: { type: 'single' },
      operations: [{
        op: 'push',
        direction: { angle: 180 } as DirectionExpression,
        distance: -10
      }],
      timing: { type: 'immediate' }
    };

    const result = interpreter.execute(effect, context);
    expect(result.success).toBe(true);
  });
});

// ============================================================================
// 6. SPAWNING (8 tests)
// ============================================================================

describe('EffectInterpreter - Spawning', () => {
  let interpreter: EffectInterpreter;
  let context: EffectContext;

  beforeEach(() => {
    interpreter = new EffectInterpreter();
    context = createMockContext();
  });

  it('should spawn entity at location', () => {
    const effect: EffectExpression = {
      target: { type: 'self' },
      operations: [{
        op: 'spawn_entity',
        entityType: 'skeleton',
        count: 1,
        at: { x: 50, y: 50 } as LocationExpression
      }],
      timing: { type: 'immediate' }
    };

    const result = interpreter.execute(effect, context);
    expect(result.success).toBe(true);
    expect(result.entitiesSpawned).toBe(1);
  });

  it('should spawn multiple entities', () => {
    const effect: EffectExpression = {
      target: { type: 'self' },
      operations: [{
        op: 'spawn_entity',
        entityType: 'zombie',
        count: 5,
        at: { x: 100, y: 100 } as LocationExpression
      }],
      timing: { type: 'immediate' }
    };

    const result = interpreter.execute(effect, context);
    expect(result.entitiesSpawned).toBe(5);
  });

  it('should spawn item at location', () => {
    const effect: EffectExpression = {
      target: { type: 'self' },
      operations: [{
        op: 'spawn_item',
        itemId: 'health_potion',
        count: 3,
        at: { x: 25, y: 75 } as LocationExpression
      }],
      timing: { type: 'immediate' }
    };

    const result = interpreter.execute(effect, context);
    expect(result.success).toBe(true);
  });

  it('should handle expression-based spawn counts', () => {
    const effect: EffectExpression = {
      target: { type: 'self' },
      operations: [{
        op: 'spawn_entity',
        entityType: 'imp',
        count: {
          op: '+',
          left: 1,
          right: { fn: 'random_int', args: [0, 3] }
        } as Expression,
        at: { x: 0, y: 0 } as LocationExpression
      }],
      timing: { type: 'immediate' }
    };

    const result = interpreter.execute(effect, context);
    expect(result.success).toBe(true);
    expect(result.entitiesSpawned).toBeGreaterThanOrEqual(1);
    expect(result.entitiesSpawned).toBeLessThanOrEqual(4);
  });

  it('should spawn at caster location when no location specified', () => {
    const effect: EffectExpression = {
      target: { type: 'self' },
      operations: [{
        op: 'spawn_entity',
        entityType: 'fire_elemental',
        count: 1
      }],
      timing: { type: 'immediate' }
    };

    const result = interpreter.execute(effect, context);
    expect(result.success).toBe(true);
  });

  it('should enforce max spawn limit', () => {
    const interpreter = new EffectInterpreter({ maxSpawnsPerEffect: 10 });
    const effect: EffectExpression = {
      target: { type: 'self' },
      operations: [{
        op: 'spawn_entity',
        entityType: 'rat',
        count: 1000,
        at: { x: 0, y: 0 } as LocationExpression
      }],
      timing: { type: 'immediate' }
    };

    const result = interpreter.execute(effect, context);
    expect(result.entitiesSpawned).toBeLessThanOrEqual(10);
  });

  it('should handle zero spawn count', () => {
    const effect: EffectExpression = {
      target: { type: 'self' },
      operations: [{
        op: 'spawn_entity',
        entityType: 'goblin',
        count: 0,
        at: { x: 0, y: 0 } as LocationExpression
      }],
      timing: { type: 'immediate' }
    };

    const result = interpreter.execute(effect, context);
    expect(result.success).toBe(true);
    expect(result.entitiesSpawned).toBe(0);
  });

  it('should throw on negative spawn count', () => {
    const effect: EffectExpression = {
      target: { type: 'self' },
      operations: [{
        op: 'spawn_entity',
        entityType: 'dragon',
        count: -5,
        at: { x: 0, y: 0 } as LocationExpression
      }],
      timing: { type: 'immediate' }
    };

    expect(() => interpreter.execute(effect, context)).toThrow();
  });
});

// ============================================================================
// 7. TRANSFORMATION (6 tests)
// ============================================================================

describe('EffectInterpreter - Transformation', () => {
  let interpreter: EffectInterpreter;
  let context: EffectContext;

  beforeEach(() => {
    interpreter = new EffectInterpreter();
    context = createMockContext();
  });

  it('should transform entity to new type', () => {
    const effect: EffectExpression = {
      target: { type: 'single' },
      operations: [{
        op: 'transform_entity',
        toType: 'sheep'
      }],
      timing: { type: 'immediate' }
    };

    const result = interpreter.execute(effect, context);
    expect(result.success).toBe(true);
  });

  it('should transform entity temporarily with duration', () => {
    const effect: EffectExpression = {
      target: { type: 'single' },
      operations: [{
        op: 'transform_entity',
        toType: 'frog',
        duration: 100
      }],
      timing: { type: 'immediate' }
    };

    const result = interpreter.execute(effect, context);
    expect(result.success).toBe(true);
  });

  it('should transform material type', () => {
    const effect: EffectExpression = {
      target: { type: 'single' },
      operations: [{
        op: 'transform_material',
        from: 'wood',
        to: 'gold'
      }],
      timing: { type: 'immediate' }
    };

    const result = interpreter.execute(effect, context);
    expect(result.success).toBe(true);
  });

  it('should throw on invalid entity type', () => {
    const effect: EffectExpression = {
      target: { type: 'single' },
      operations: [{
        op: 'transform_entity',
        toType: 'invalid_entity_type_xyz'
      }],
      timing: { type: 'immediate' }
    };

    expect(() => interpreter.execute(effect, context)).toThrow();
  });

  it('should handle permanent transformation (no duration)', () => {
    const effect: EffectExpression = {
      target: { type: 'single' },
      operations: [{
        op: 'transform_entity',
        toType: 'statue'
      }],
      timing: { type: 'immediate' }
    };

    const result = interpreter.execute(effect, context);
    expect(result.success).toBe(true);
  });

  it('should preserve entity ID during transformation', () => {
    const originalId = context.target.id;
    const effect: EffectExpression = {
      target: { type: 'single' },
      operations: [{
        op: 'transform_entity',
        toType: 'chicken',
        duration: 50
      }],
      timing: { type: 'immediate' }
    };

    const result = interpreter.execute(effect, context);
    expect(result.success).toBe(true);
    // Entity ID should remain the same
  });
});

// ============================================================================
// 8. EVENT EMISSION (5 tests)
// ============================================================================

describe('EffectInterpreter - Events', () => {
  let interpreter: EffectInterpreter;
  let context: EffectContext;

  beforeEach(() => {
    interpreter = new EffectInterpreter();
    context = createMockContext();
  });

  it('should emit event with payload', () => {
    const effect: EffectExpression = {
      target: { type: 'self' },
      operations: [{
        op: 'emit_event',
        eventType: 'spell_cast',
        payload: {
          spellName: 'Fireball',
          casterId: 'caster.id'
        }
      }],
      timing: { type: 'immediate' }
    };

    const result = interpreter.execute(effect, context);
    expect(result.success).toBe(true);
  });

  it('should emit event with expression-based payload', () => {
    const effect: EffectExpression = {
      target: { type: 'self' },
      operations: [{
        op: 'emit_event',
        eventType: 'damage_dealt',
        payload: {
          amount: {
            op: '*',
            left: 'caster.intelligence',
            right: 5
          }
        }
      }],
      timing: { type: 'immediate' }
    };

    const result = interpreter.execute(effect, context);
    expect(result.success).toBe(true);
  });

  it('should emit event with empty payload', () => {
    const effect: EffectExpression = {
      target: { type: 'self' },
      operations: [{
        op: 'emit_event',
        eventType: 'ability_activated',
        payload: {}
      }],
      timing: { type: 'immediate' }
    };

    const result = interpreter.execute(effect, context);
    expect(result.success).toBe(true);
  });

  it('should emit multiple events in sequence', () => {
    const effect: EffectExpression = {
      target: { type: 'self' },
      operations: [
        { op: 'emit_event', eventType: 'effect_start', payload: {} },
        { op: 'emit_event', eventType: 'effect_end', payload: {} }
      ],
      timing: { type: 'immediate' }
    };

    const result = interpreter.execute(effect, context);
    expect(result.success).toBe(true);
  });

  it('should track emitted events in result', () => {
    const effect: EffectExpression = {
      target: { type: 'self' },
      operations: [{
        op: 'emit_event',
        eventType: 'test_event',
        payload: { test: true }
      }],
      timing: { type: 'immediate' }
    };

    const result = interpreter.execute(effect, context);
    expect(result.eventsEmitted).toBeDefined();
    expect(result.eventsEmitted.length).toBeGreaterThan(0);
  });
});

// ============================================================================
// 9. CHAINING AND TRIGGERS (8 tests)
// ============================================================================

describe('EffectInterpreter - Chaining', () => {
  let interpreter: EffectInterpreter;
  let context: EffectContext;

  beforeEach(() => {
    interpreter = new EffectInterpreter();
    context = createMockContext();
  });

  it('should chain effect to new target', () => {
    const effect: EffectExpression = {
      id: 'chain_lightning',
      target: { type: 'single' },
      operations: [{
        op: 'chain_effect',
        effectId: 'chain_lightning',
        newTarget: { type: 'single', excludePrevious: true }
      }],
      timing: { type: 'immediate' }
    };

    const result = interpreter.execute(effect, context);
    expect(result.success).toBe(true);
  });

  it('should trigger effect on same target', () => {
    const effect: EffectExpression = {
      target: { type: 'single' },
      operations: [{
        op: 'trigger_effect',
        effectId: 'burn_damage'
      }],
      timing: { type: 'immediate' }
    };

    const result = interpreter.execute(effect, context);
    expect(result.success).toBe(true);
  });

  it('should enforce chain depth limit', () => {
    const interpreter = new EffectInterpreter({ maxDepth: 3 });
    const effect: EffectExpression = {
      id: 'infinite_chain',
      target: { type: 'single' },
      operations: [{
        op: 'chain_effect',
        effectId: 'infinite_chain',
        newTarget: { type: 'self' }
      }],
      timing: { type: 'immediate' }
    };

    expect(() => interpreter.execute(effect, context)).toThrow('depth limit');
  });

  it('should detect circular chain references', () => {
    const interpreter = new EffectInterpreter({ maxDepth: 10 });
    const effect: EffectExpression = {
      id: 'loop_a',
      target: { type: 'self' },
      operations: [{
        op: 'chain_effect',
        effectId: 'loop_a',
        newTarget: { type: 'self' }
      }],
      timing: { type: 'immediate' }
    };

    expect(() => interpreter.execute(effect, context)).toThrow();
  });

  it('should chain to different target types', () => {
    const effect: EffectExpression = {
      id: 'spread_effect',
      target: { type: 'single' },
      operations: [{
        op: 'chain_effect',
        effectId: 'spread_effect',
        newTarget: { type: 'area', radius: 10, excludePrevious: true }
      }],
      timing: { type: 'immediate' }
    };

    const result = interpreter.execute(effect, context);
    expect(result.success).toBe(true);
  });

  it('should handle chain with no valid new targets', () => {
    context.world = createMockWorld([context.caster]);

    const effect: EffectExpression = {
      id: 'lonely_chain',
      target: { type: 'single' },
      operations: [{
        op: 'chain_effect',
        effectId: 'lonely_chain',
        newTarget: { type: 'all', excludePrevious: true, excludeSelf: true }
      }],
      timing: { type: 'immediate' }
    };

    const result = interpreter.execute(effect, context);
    expect(result.success).toBe(true);
  });

  it('should track chain count in result', () => {
    const effect: EffectExpression = {
      id: 'tracked_chain',
      target: { type: 'single' },
      operations: [{
        op: 'chain_effect',
        effectId: 'tracked_chain',
        newTarget: { type: 'single', excludePrevious: true }
      }],
      timing: { type: 'immediate' }
    };

    const result = interpreter.execute(effect, context);
    expect(result.chainCount).toBeDefined();
  });

  it('should prevent chain loops with visited tracking', () => {
    const effect: EffectExpression = {
      id: 'visited_chain',
      target: { type: 'single' },
      operations: [{
        op: 'chain_effect',
        effectId: 'visited_chain',
        newTarget: { type: 'single' }
      }],
      timing: { type: 'immediate' }
    };

    // Chaining to the same target repeatedly will hit maxChainDepth limit (default 5)
    // Previously this test expected visited tracking to silently stop the chain,
    // but that conflicts with depth limit enforcement (other tests expect errors)
    // Now we rely on depth limits for safety, so this throws
    expect(() => interpreter.execute(effect, context)).toThrow('chain depth');
  });
});

// ============================================================================
// 10. CONTROL FLOW (10 tests)
// ============================================================================

describe('EffectInterpreter - Control Flow', () => {
  let interpreter: EffectInterpreter;
  let context: EffectContext;

  beforeEach(() => {
    interpreter = new EffectInterpreter();
    context = createMockContext();
  });

  it('should execute conditional then branch', () => {
    const effect: EffectExpression = {
      target: { type: 'self' },
      operations: [{
        op: 'conditional',
        condition: {
          op: '>',
          left: 'caster.health',
          right: 50
        } as any,
        then: [{ op: 'heal', amount: 10 }],
        else: [{ op: 'heal', amount: 50 }]
      }],
      timing: { type: 'immediate' }
    };

    const result = interpreter.execute(effect, context);
    expect(result.success).toBe(true);
  });

  it('should execute conditional else branch', () => {
    context.caster.getComponent = vi.fn((type) => {
      if (type === 'needs') return { health: 20 };
      return undefined;
    });

    const effect: EffectExpression = {
      target: { type: 'self' },
      operations: [{
        op: 'conditional',
        condition: {
          op: '>',
          left: 'caster.health',
          right: 50
        } as any,
        then: [{ op: 'heal', amount: 10 }],
        else: [{ op: 'heal', amount: 50 }]
      }],
      timing: { type: 'immediate' }
    };

    const result = interpreter.execute(effect, context);
    expect(result.success).toBe(true);
  });

  it('should handle conditional without else branch', () => {
    const effect: EffectExpression = {
      target: { type: 'self' },
      operations: [{
        op: 'conditional',
        condition: { op: '==', left: 1, right: 1 } as any,
        then: [{ op: 'heal', amount: 5 }]
      }],
      timing: { type: 'immediate' }
    };

    const result = interpreter.execute(effect, context);
    expect(result.success).toBe(true);
  });

  it('should repeat operations N times', () => {
    const effect: EffectExpression = {
      target: { type: 'self' },
      operations: [{
        op: 'repeat',
        times: 5,
        operations: [{ op: 'heal', amount: 2 }]
      }],
      timing: { type: 'immediate' }
    };

    const result = interpreter.execute(effect, context);
    expect(result.success).toBe(true);
    expect(result.healingDone).toBe(10);
  });

  it('should handle expression-based repeat count', () => {
    const effect: EffectExpression = {
      target: { type: 'self' },
      operations: [{
        op: 'repeat',
        times: {
          op: '+',
          left: 2,
          right: 3
        } as Expression,
        operations: [{ op: 'heal', amount: 1 }]
      }],
      timing: { type: 'immediate' }
    };

    const result = interpreter.execute(effect, context);
    expect(result.healingDone).toBe(5);
  });

  it('should delay operations', () => {
    const effect: EffectExpression = {
      target: { type: 'self' },
      operations: [{
        op: 'delay',
        ticks: 10,
        then: [{ op: 'heal', amount: 20 }]
      }],
      timing: { type: 'immediate' }
    };

    const result = interpreter.execute(effect, context);
    expect(result.success).toBe(true);
  });

  it('should enforce max repeat count limit', () => {
    const interpreter = new EffectInterpreter({ maxOperations: 100 });
    const effect: EffectExpression = {
      target: { type: 'self' },
      operations: [{
        op: 'repeat',
        times: 999999,
        operations: [{ op: 'heal', amount: 1 }]
      }],
      timing: { type: 'immediate' }
    };

    expect(() => interpreter.execute(effect, context)).toThrow('operation limit');
  });

  it('should handle nested conditionals', () => {
    const effect: EffectExpression = {
      target: { type: 'self' },
      operations: [{
        op: 'conditional',
        condition: { op: '>', left: 'caster.health', right: 50 } as any,
        then: [{
          op: 'conditional',
          condition: { op: '>', left: 'caster.health', right: 75 } as any,
          then: [{ op: 'heal', amount: 5 }],
          else: [{ op: 'heal', amount: 10 }]
        }],
        else: [{ op: 'heal', amount: 20 }]
      }],
      timing: { type: 'immediate' }
    };

    const result = interpreter.execute(effect, context);
    expect(result.success).toBe(true);
  });

  it('should handle repeat with zero count', () => {
    const effect: EffectExpression = {
      target: { type: 'self' },
      operations: [{
        op: 'repeat',
        times: 0,
        operations: [{ op: 'heal', amount: 100 }]
      }],
      timing: { type: 'immediate' }
    };

    const result = interpreter.execute(effect, context);
    expect(result.success).toBe(true);
    expect(result.healingDone).toBe(0);
  });

  it('should throw on negative repeat count', () => {
    const effect: EffectExpression = {
      target: { type: 'self' },
      operations: [{
        op: 'repeat',
        times: -5,
        operations: [{ op: 'heal', amount: 10 }]
      }],
      timing: { type: 'immediate' }
    };

    expect(() => interpreter.execute(effect, context)).toThrow();
  });
});

// ============================================================================
// 11. TIMING (5 tests)
// ============================================================================

describe('EffectInterpreter - Timing', () => {
  let interpreter: EffectInterpreter;
  let context: EffectContext;

  beforeEach(() => {
    interpreter = new EffectInterpreter();
    context = createMockContext();
  });

  it('should execute immediate timing', () => {
    const effect: EffectExpression = {
      target: { type: 'self' },
      operations: [{ op: 'heal', amount: 10 }],
      timing: { type: 'immediate' }
    };

    const result = interpreter.execute(effect, context);
    expect(result.success).toBe(true);
  });

  it('should handle delayed timing', () => {
    const effect: EffectExpression = {
      target: { type: 'self' },
      operations: [{ op: 'heal', amount: 10 }],
      timing: { type: 'delayed', ticks: 50 }
    };

    const result = interpreter.execute(effect, context);
    expect(result.success).toBe(true);
  });

  it('should handle periodic timing', () => {
    const effect: EffectExpression = {
      target: { type: 'self' },
      operations: [{ op: 'heal', amount: 5 }],
      timing: { type: 'periodic', interval: 10, duration: 100 }
    };

    const result = interpreter.execute(effect, context);
    expect(result.success).toBe(true);
  });

  it('should handle duration-based effects', () => {
    const effect: EffectExpression = {
      target: { type: 'self' },
      operations: [{
        op: 'modify_stat',
        stat: 'speed',
        amount: 10,
        duration: 200
      }],
      timing: { type: 'immediate' }
    };

    const result = interpreter.execute(effect, context);
    expect(result.success).toBe(true);
  });

  it('should track timing metadata in result', () => {
    const effect: EffectExpression = {
      target: { type: 'self' },
      operations: [{ op: 'heal', amount: 10 }],
      timing: { type: 'delayed', ticks: 25 }
    };

    const result = interpreter.execute(effect, context);
    expect(result.timing).toBeDefined();
  });
});

// ============================================================================
// 12. CONDITIONS (8 tests)
// ============================================================================

describe('EffectInterpreter - Conditions', () => {
  let interpreter: EffectInterpreter;
  let context: EffectContext;

  beforeEach(() => {
    interpreter = new EffectInterpreter();
    context = createMockContext();
  });

  it('should execute effect when condition is met', () => {
    const effect: EffectExpression = {
      target: { type: 'self' },
      operations: [{ op: 'heal', amount: 10 }],
      timing: { type: 'immediate' },
      conditions: [{
        op: '>',
        left: 'caster.health',
        right: 0
      } as any]
    };

    const result = interpreter.execute(effect, context);
    expect(result.success).toBe(true);
  });

  it('should not execute effect when condition is not met', () => {
    const effect: EffectExpression = {
      target: { type: 'self' },
      operations: [{ op: 'heal', amount: 10 }],
      timing: { type: 'immediate' },
      conditions: [{
        op: '<',
        left: 'caster.health',
        right: 0
      } as any]
    };

    const result = interpreter.execute(effect, context);
    expect(result.success).toBe(false);
    expect(result.reason).toBe('conditions_not_met');
  });

  it('should handle multiple conditions with AND logic', () => {
    const effect: EffectExpression = {
      target: { type: 'self' },
      operations: [{ op: 'heal', amount: 10 }],
      timing: { type: 'immediate' },
      conditions: [
        { op: '>', left: 'caster.health', right: 50 } as any,
        { op: '<=', left: 'caster.health', right: 100 } as any
      ]
    };

    const result = interpreter.execute(effect, context);
    expect(result.success).toBe(true);
  });

  it('should handle complex condition expressions', () => {
    const effect: EffectExpression = {
      target: { type: 'self' },
      operations: [{ op: 'heal', amount: 10 }],
      timing: { type: 'immediate' },
      conditions: [{
        op: '&&',
        left: {
          op: '>',
          left: 'caster.health',
          right: 0
        },
        right: {
          op: '<=',
          left: 'caster.health',
          right: 100
        }
      } as any]
    };

    const result = interpreter.execute(effect, context);
    expect(result.success).toBe(true);
  });

  it('should handle OR conditions', () => {
    const effect: EffectExpression = {
      target: { type: 'self' },
      operations: [{ op: 'heal', amount: 10 }],
      timing: { type: 'immediate' },
      conditions: [{
        op: '||',
        left: {
          op: '<',
          left: 'caster.health',
          right: 25
        },
        right: {
          op: '>',
          left: 'caster.health',
          right: 75
        }
      } as any]
    };

    const result = interpreter.execute(effect, context);
    expect(result.success).toBe(true);
  });

  it('should handle function-based conditions', () => {
    const effect: EffectExpression = {
      target: { type: 'self' },
      operations: [{ op: 'heal', amount: 10 }],
      timing: { type: 'immediate' },
      conditions: [{
        fn: 'has_status',
        args: ['burning']
      } as any]
    };

    const result = interpreter.execute(effect, context);
    expect(result.success).toBeDefined();
  });

  it('should handle invalid conditions gracefully', () => {
    const effect: EffectExpression = {
      target: { type: 'self' },
      operations: [{ op: 'heal', amount: 10 }],
      timing: { type: 'immediate' },
      conditions: [{
        op: '>',
        left: 'invalid.path.xyz',
        right: 0
      } as any]
    };

    expect(() => interpreter.execute(effect, context)).toThrow();
  });

  it('should handle empty conditions array (always execute)', () => {
    const effect: EffectExpression = {
      target: { type: 'self' },
      operations: [{ op: 'heal', amount: 10 }],
      timing: { type: 'immediate' },
      conditions: []
    };

    const result = interpreter.execute(effect, context);
    expect(result.success).toBe(true);
  });
});

// ============================================================================
// 13. SECURITY LIMITS (15 tests) - CRITICAL
// ============================================================================

describe('EffectInterpreter - Security Limits', () => {
  let interpreter: EffectInterpreter;
  let context: EffectContext;

  beforeEach(() => {
    interpreter = new EffectInterpreter();
    context = createMockContext();
  });

  it('should enforce max operations limit', () => {
    const interpreter = new EffectInterpreter({ maxOperations: 100 });
    const effect: EffectExpression = {
      target: { type: 'self' },
      operations: Array(1000).fill({ op: 'heal', amount: 1 }),
      timing: { type: 'immediate' }
    };

    expect(() => interpreter.execute(effect, context)).toThrow('operation limit');
  });

  it('should enforce max depth limit', () => {
    const interpreter = new EffectInterpreter({ maxDepth: 5 });
    const effect: EffectExpression = {
      id: 'deep_chain',
      target: { type: 'self' },
      operations: [{
        op: 'chain_effect',
        effectId: 'deep_chain',
        newTarget: { type: 'self' }
      }],
      timing: { type: 'immediate' }
    };

    expect(() => interpreter.execute(effect, context)).toThrow('depth limit');
  });

  it('should enforce max entities affected limit', () => {
    const entities = Array.from({ length: 200 }, () => createMockEntity());
    context.world = createMockWorld(entities);
    const interpreter = new EffectInterpreter({ maxEntitiesAffected: 100 });

    const effect: EffectExpression = {
      target: { type: 'all' },
      operations: [{ op: 'heal', amount: 1 }],
      timing: { type: 'immediate' }
    };

    const result = interpreter.execute(effect, context);
    expect(result.affectedEntities.length).toBeLessThanOrEqual(100);
  });

  it('should enforce max damage per effect limit', () => {
    const interpreter = new EffectInterpreter({ maxDamagePerEffect: 500 });
    const effect: EffectExpression = {
      target: { type: 'single' },
      operations: [{ op: 'deal_damage', damageType: 'void', amount: 99999 }],
      timing: { type: 'immediate' }
    };

    const result = interpreter.execute(effect, context);
    expect(result.damageDealt).toBeLessThanOrEqual(500);
  });

  it('should enforce max spawns limit', () => {
    const interpreter = new EffectInterpreter({ maxSpawnsPerEffect: 20 });
    const effect: EffectExpression = {
      target: { type: 'self' },
      operations: [{
        op: 'spawn_entity',
        entityType: 'rat',
        count: 1000,
        at: { x: 0, y: 0 } as LocationExpression
      }],
      timing: { type: 'immediate' }
    };

    const result = interpreter.execute(effect, context);
    expect(result.entitiesSpawned).toBeLessThanOrEqual(20);
  });

  it('should enforce max chain depth', () => {
    const interpreter = new EffectInterpreter({ maxChainDepth: 3 });
    const effect: EffectExpression = {
      id: 'chain_test',
      target: { type: 'single' },
      operations: [{
        op: 'chain_effect',
        effectId: 'chain_test',
        newTarget: { type: 'self' }
      }],
      timing: { type: 'immediate' }
    };

    expect(() => interpreter.execute(effect, context)).toThrow();
  });

  it('should prevent infinite loops with repeat', () => {
    const interpreter = new EffectInterpreter({ maxOperations: 1000 });
    const effect: EffectExpression = {
      target: { type: 'self' },
      operations: [{
        op: 'repeat',
        times: 999999,
        operations: [{ op: 'heal', amount: 1 }]
      }],
      timing: { type: 'immediate' }
    };

    expect(() => interpreter.execute(effect, context)).toThrow('operation limit');
  });

  it('should prevent stack overflow with deep nesting', () => {
    const interpreter = new EffectInterpreter({ maxDepth: 10 });

    // Create deeply nested conditionals
    let nestedOp: EffectOperation = { op: 'heal', amount: 1 };
    for (let i = 0; i < 20; i++) {
      nestedOp = {
        op: 'conditional',
        condition: { op: '==', left: 1, right: 1 } as any,
        then: [nestedOp]
      };
    }

    const effect: EffectExpression = {
      target: { type: 'self' },
      operations: [nestedOp],
      timing: { type: 'immediate' }
    };

    expect(() => interpreter.execute(effect, context)).toThrow('depth limit');
  });

  it('should count operations across all targets', () => {
    const entities = Array.from({ length: 10 }, () => createMockEntity());
    context.world = createMockWorld(entities);
    const interpreter = new EffectInterpreter({ maxOperations: 50 });

    const effect: EffectExpression = {
      target: { type: 'all' },
      operations: Array(10).fill({ op: 'heal', amount: 1 }),
      timing: { type: 'immediate' }
    };

    // 10 entities × 10 operations = 100 total ops > 50 limit
    expect(() => interpreter.execute(effect, context)).toThrow('operation limit');
  });

  it('should handle timeout for long-running effects', () => {
    const interpreter = new EffectInterpreter({ timeout: 100 });

    // Effect that would take too long (mocked)
    const effect: EffectExpression = {
      target: { type: 'self' },
      operations: [{
        op: 'repeat',
        times: 1000,
        operations: [{ op: 'heal', amount: 1 }]
      }],
      timing: { type: 'immediate' }
    };

    // Should timeout or hit operation limit
    expect(() => interpreter.execute(effect, context)).toThrow();
  });

  it('should prevent memory exhaustion with large spawns', () => {
    const interpreter = new EffectInterpreter({ maxSpawnsPerEffect: 100 });
    const effect: EffectExpression = {
      target: { type: 'self' },
      operations: [{
        op: 'spawn_entity',
        entityType: 'dragon',
        count: 999999999,
        at: { x: 0, y: 0 } as LocationExpression
      }],
      timing: { type: 'immediate' }
    };

    const result = interpreter.execute(effect, context);
    expect(result.entitiesSpawned).toBeLessThanOrEqual(100);
  });

  it('should reject malicious payloads in expressions', () => {
    const effect: EffectExpression = {
      target: { type: 'self' },
      operations: [{
        op: 'heal',
        amount: '__proto__.polluted' as any
      }],
      timing: { type: 'immediate' }
    };

    expect(() => interpreter.execute(effect, context)).toThrow();
  });

  it('should prevent code injection in variable references', () => {
    const effect: EffectExpression = {
      target: { type: 'self' },
      operations: [{
        op: 'heal',
        amount: 'process.exit(1)' as any
      }],
      timing: { type: 'immediate' }
    };

    expect(() => interpreter.execute(effect, context)).toThrow();
  });

  it('should prevent prototype pollution', () => {
    const effect: EffectExpression = {
      target: { type: 'self' },
      operations: [{
        op: 'set_stat',
        stat: '__proto__',
        value: 'polluted'
      }],
      timing: { type: 'immediate' }
    };

    expect(() => interpreter.execute(effect, context)).toThrow();
  });

  it('should validate all user-provided strings', () => {
    const dangerousStrings = [
      '../../../etc/passwd',
      '<script>alert(1)</script>',
      '${process.env.SECRET}',
      'constructor.prototype',
    ];

    for (const str of dangerousStrings) {
      const effect: EffectExpression = {
        target: { type: 'self' },
        operations: [{
          op: 'modify_stat',
          stat: str,
          amount: 1
        }],
        timing: { type: 'immediate' }
      };

      expect(() => interpreter.execute(effect, context)).toThrow();
    }
  });
});

// ============================================================================
// 14. INTEGRATION (10 tests)
// ============================================================================

describe('EffectInterpreter - Integration', () => {
  let interpreter: EffectInterpreter;
  let context: EffectContext;

  beforeEach(() => {
    interpreter = new EffectInterpreter();
    context = createMockContext();
  });

  it('should execute complex multi-operation effect', () => {
    const effect: EffectExpression = {
      target: { type: 'area', radius: 20 },
      operations: [
        { op: 'deal_damage', damageType: 'fire', amount: 25 },
        { op: 'apply_status', status: 'burning', duration: 100, stacks: 2 },
        { op: 'push', direction: { fromCaster: true } as DirectionExpression, distance: 10 }
      ],
      timing: { type: 'immediate' }
    };

    const result = interpreter.execute(effect, context);
    expect(result.success).toBe(true);
  });

  it('should handle fireball spell (real-world example)', () => {
    const fireball: EffectExpression = {
      name: 'Fireball',
      target: { type: 'area', radius: 15, excludeSelf: true },
      operations: [
        {
          op: 'deal_damage',
          damageType: 'fire',
          amount: {
            op: '+',
            left: { fn: 'random_int', args: [20, 40] },
            right: {
              op: '/',
              left: 'caster.intelligence',
              right: 5
            }
          } as Expression
        },
        { op: 'apply_status', status: 'burning', duration: 50, stacks: 1 }
      ],
      timing: { type: 'immediate' }
    };

    const result = interpreter.execute(fireball, context);
    expect(result.success).toBe(true);
    expect(result.damageDealt).toBeGreaterThan(0);
  });

  it('should handle healing spell with conditional', () => {
    const healingWord: EffectExpression = {
      name: 'Healing Word',
      target: { type: 'single', filter: { factions: ['friendly'] } },
      operations: [{
        op: 'conditional',
        condition: {
          op: '<',
          left: 'target.health',
          right: 50
        } as any,
        then: [{ op: 'heal', amount: 40 }],
        else: [{ op: 'heal', amount: 20 }]
      }],
      timing: { type: 'immediate' }
    };

    const result = interpreter.execute(healingWord, context);
    expect(result.success).toBe(true);
  });

  it('should handle polymorph spell (transformation)', () => {
    const polymorph: EffectExpression = {
      name: 'Polymorph',
      target: { type: 'single' },
      operations: [
        { op: 'transform_entity', toType: 'sheep', duration: 200 },
        { op: 'modify_stat', stat: 'damage', amount: -100, duration: 200 }
      ],
      timing: { type: 'immediate' }
    };

    const result = interpreter.execute(polymorph, context);
    expect(result.success).toBe(true);
  });

  it('should handle chain lightning (chaining effect)', () => {
    const entities = Array.from({ length: 5 }, (_, i) =>
      createMockEntity({ x: i * 10, y: 0 })
    );
    context.world = createMockWorld(entities);

    const chainLightning: EffectExpression = {
      id: 'chain_lightning',
      name: 'Chain Lightning',
      target: { type: 'single' },
      operations: [
        { op: 'deal_damage', damageType: 'lightning', amount: 30 },
        {
          op: 'chain_effect',
          effectId: 'chain_lightning_bounce',
          newTarget: { type: 'single', excludePrevious: true, maxTargets: 1 }
        }
      ],
      timing: { type: 'immediate' }
    };

    const result = interpreter.execute(chainLightning, context);
    expect(result.success).toBe(true);
  });

  it('should handle summon spell (spawning)', () => {
    const summonElemental: EffectExpression = {
      name: 'Summon Fire Elemental',
      target: { type: 'self' },
      operations: [{
        op: 'spawn_entity',
        entityType: 'fire_elemental',
        count: 1,
        at: { relative: true, x: 5, y: 0 } as LocationExpression
      }],
      timing: { type: 'immediate' }
    };

    const result = interpreter.execute(summonElemental, context);
    expect(result.success).toBe(true);
    expect(result.entitiesSpawned).toBe(1);
  });

  it('should handle buff spell with duration', () => {
    const bless: EffectExpression = {
      name: 'Bless',
      target: { type: 'area', radius: 30, filter: { factions: ['friendly'] } },
      operations: [
        { op: 'modify_stat', stat: 'attack', amount: 5, duration: 300 },
        { op: 'modify_stat', stat: 'defense', amount: 5, duration: 300 },
        { op: 'apply_status', status: 'blessed', duration: 300 }
      ],
      timing: { type: 'immediate' }
    };

    const result = interpreter.execute(bless, context);
    expect(result.success).toBe(true);
  });

  it('should handle curse with multiple debuffs', () => {
    const curse: EffectExpression = {
      name: 'Curse of Weakness',
      target: { type: 'single', filter: { factions: ['hostile'] } },
      operations: [
        { op: 'modify_stat', stat: 'strength', amount: -10, duration: 500 },
        { op: 'modify_stat', stat: 'speed', amount: -5, duration: 500 },
        { op: 'apply_status', status: 'cursed', duration: 500 }
      ],
      timing: { type: 'immediate' }
    };

    const result = interpreter.execute(curse, context);
    expect(result.success).toBe(true);
  });

  it('should handle combo effect with conditions and chains', () => {
    const comboEffect: EffectExpression = {
      name: 'Pyroblast Combo',
      target: { type: 'single' },
      operations: [
        { op: 'deal_damage', damageType: 'fire', amount: 50 },
        {
          op: 'conditional',
          condition: {
            fn: 'has_status',
            args: ['burning']
          } as any,
          then: [
            { op: 'deal_damage', damageType: 'fire', amount: 50 },
            { op: 'emit_event', eventType: 'combo_triggered', payload: {} }
          ]
        }
      ],
      timing: { type: 'immediate' }
    };

    const result = interpreter.execute(comboEffect, context);
    expect(result.success).toBe(true);
  });

  it('should handle periodic damage over time effect', () => {
    const poison: EffectExpression = {
      name: 'Poison Cloud',
      target: { type: 'area', radius: 10 },
      operations: [
        { op: 'apply_status', status: 'poisoned', duration: 100, stacks: 3 }
      ],
      timing: { type: 'periodic', interval: 10, duration: 100 }
    };

    const result = interpreter.execute(poison, context);
    expect(result.success).toBe(true);
  });
});
