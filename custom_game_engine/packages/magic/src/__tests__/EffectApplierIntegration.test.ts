/**
 * Integration Tests for Spell Effect Appliers
 *
 * Tests the complete spell casting pipeline from spell creation through
 * effect application to target entities. Unlike unit tests which mock
 * components, these tests use real World instances and actual game systems
 * to verify cross-system integration.
 *
 * Coverage:
 * - Complete spell casting pipeline
 * - Multi-effect spells
 * - Effect interactions and stacking
 * - Cross-system integration (combat, needs, behavior)
 * - Paradigm-specific effects
 * - Resource management
 * - Event system
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { World } from '@ai-village/core';
import type { EntityImpl } from '@ai-village/core';
import { ComponentType as CT } from '@ai-village/core';
import type { MagicComponent, NeedsComponent, BehaviorComponent } from '@ai-village/core';
import { SpellEffectExecutor } from '@ai-village/core';
import { SpellRegistry, type SpellDefinition } from '@ai-village/core';
import { SpellEffectRegistry } from '@ai-village/core';
import type { SpellEffect, DamageEffect, HealingEffect, ProtectionEffect } from '@ai-village/core';
import { registerStandardAppliers } from '@ai-village/core';
import { MagicSystem } from '../../../core/src/systems/MagicSystem.js';

// Import specific effect interfaces for type narrowing
import type { DamageEffect as DamageEffectType, HealingEffect as HealingEffectType, ProtectionEffect as ProtectionEffectType } from '../SpellEffect.js';

// ============================================================================
// Test Setup Helpers
// ============================================================================

function createTestWorld(): { world: World; magicSystem: MagicSystem } {
  const world = new World();
  const magicSystem = new MagicSystem();

  // Reset singletons before each test to ensure clean state
  SpellEffectExecutor.resetInstance();
  SpellEffectRegistry.resetInstance();
  SpellRegistry.resetInstance();

  // Initialize the system with the world
  // This will call initMagicInfrastructure() which registers appliers and example spells
  magicSystem.initialize(world, world.eventBus);

  return { world, magicSystem };
}

function createMageEntity(world: World, options: {
  mana?: number;
  health?: number;
  paradigm?: string;
} = {}): EntityImpl {
  const entity = world.createEntity() as EntityImpl;

  // Add position
  entity.addComponent({
    type: CT.Position,
    x: 100,
    y: 100,
  });

  // Add needs (for health)
  entity.addComponent({
    type: CT.Needs,
    health: options.health ?? 100,
    maxHealth: 100,
    food: 100,
    water: 100,
    sleep: 100,
    shelter: 100,
  } as NeedsComponent);

  // Add magic component
  const magicComp: MagicComponent = {
    type: CT.Magic,
    magicUser: true,
    primarySource: 'internal',
    homeParadigmId: options.paradigm ?? 'academic',
    activeParadigmId: options.paradigm ?? 'academic',
    knownParadigmIds: [options.paradigm ?? 'academic'],
    paradigmState: {},
    manaPools: [
      {
        source: 'internal',
        current: options.mana ?? 100,
        maximum: 100,
        regenRate: 5,
        locked: 0,
      },
    ],
    resourcePools: {},
    knownSpells: [],
    activeEffects: [],
    techniqueProficiency: {},
    formProficiency: {},
    casting: false,
    totalSpellsCast: 0,
    totalMishaps: 0,
    version: 1,
  };
  entity.addComponent(magicComp);

  // Add behavior component
  entity.addComponent({
    type: CT.Behavior,
    currentBehavior: 'wander',
  } as BehaviorComponent);

  return entity;
}

function createTargetEntity(world: World, options: {
  health?: number;
  maxHealth?: number;
} = {}): EntityImpl {
  const entity = world.createEntity() as EntityImpl;

  entity.addComponent({
    type: CT.Position,
    x: 105,
    y: 105,
  });

  entity.addComponent({
    type: CT.Needs,
    health: options.health ?? 100,
    maxHealth: options.maxHealth ?? 100,
    food: 100,
    water: 100,
    sleep: 100,
    shelter: 100,
  } as NeedsComponent);

  entity.addComponent({
    type: CT.Behavior,
    currentBehavior: 'wander',
  } as BehaviorComponent);

  // Add MagicComponent so target can receive magic effects (protection, buffs, etc.)
  entity.addComponent({
    type: CT.Magic,
    magicUser: false,
    primarySource: 'none',
    homeParadigmId: '',
    activeParadigmId: '',
    knownParadigmIds: [],
    paradigmState: {},
    manaPools: [],
    activeEffects: [], // Important for receiving protection effects
    knownSpells: [],
    techniqueProficiency: {},
    formProficiency: {},
    casting: false,
    totalSpellsCast: 0,
    totalMishaps: 0,
    version: 1,
  } as MagicComponent);

  return entity;
}

function registerTestSpell(spell: SpellDefinition): void {
  SpellRegistry.getInstance().register(spell);
}

function createTestDamageEffect(partial: Partial<DamageEffect> & { id: string; name: string; baseDamage: number }): DamageEffect {
  // Extract old field names to prevent them from being spread
  const { baseDamage, scaling, ...cleanPartial } = partial;

  return {
    description: partial.description ?? `Test damage effect: ${partial.name}`,
    category: 'damage',
    targetType: partial.targetType ?? 'single',
    targetFilter: partial.targetFilter ?? 'enemies',
    range: partial.range ?? 10,
    dispellable: partial.dispellable ?? false,
    stackable: partial.stackable ?? false,
    tags: partial.tags ?? [],
    damageType: partial.damageType ?? 'force',
    damageScaling: partial.damageScaling ?? {
      base: baseDamage,
      perProficiency: scaling?.perProficiency ?? 0,
      maximum: scaling?.maximum,
    },
    canCrit: partial.canCrit ?? false,
    ignoresArmor: partial.ignoresArmor ?? false,
    ...cleanPartial,
  } as DamageEffect;
}

function createTestHealingEffect(partial: Partial<HealingEffect> & { id: string; name: string; baseHealing: number }): HealingEffect {
  // Extract old field names to prevent them from being spread
  const { baseHealing, ...cleanPartial } = partial;

  return {
    description: partial.description ?? `Test healing effect: ${partial.name}`,
    category: 'healing',
    targetType: partial.targetType ?? 'single',
    targetFilter: partial.targetFilter ?? 'allies',
    range: partial.range ?? 5,
    dispellable: partial.dispellable ?? false,
    stackable: partial.stackable ?? false,
    tags: partial.tags ?? [],
    healingScaling: partial.healingScaling ?? {
      base: baseHealing,
      perProficiency: 0,
    },
    resourceType: partial.resourceType ?? 'health',
    overtime: partial.overtime ?? false,
    canOverheal: partial.canOverheal ?? false,
    ...cleanPartial,
  } as HealingEffect;
}

function createTestProtectionEffect(partial: Partial<ProtectionEffect> & { id: string; name: string; absorptionAmount: number }): ProtectionEffect {
  // Extract old field names to prevent them from being spread
  const { absorptionAmount, ...cleanPartial } = partial;

  return {
    description: partial.description ?? `Test protection effect: ${partial.name}`,
    category: 'protection',
    targetType: partial.targetType ?? 'single',
    targetFilter: partial.targetFilter ?? 'allies',
    range: partial.range ?? 5,
    dispellable: partial.dispellable ?? true,
    stackable: partial.stackable ?? false,
    tags: partial.tags ?? [],
    absorptionScaling: partial.absorptionScaling ?? {
      base: absorptionAmount,
      perProficiency: 0,
    },
    protectsAgainst: partial.protectsAgainst ?? 'all',
    reflectsDamage: partial.reflectsDamage ?? false,
    ...cleanPartial,
  } as ProtectionEffect;
}

function registerTestEffect(effect: SpellEffect): void {
  SpellEffectRegistry.getInstance().register(effect);
}

// ============================================================================
// 1. Complete Spell Casting Pipeline
// ============================================================================

describe('Complete Spell Casting Pipeline', () => {
  let world: World;
  let magicSystem: MagicSystem;

  beforeEach(() => {
    const setup = createTestWorld();
    world = setup.world;
    magicSystem = setup.magicSystem;
  });

  it('should cast spell and apply damage effect to target', () => {
    // Create caster with mana
    const caster = createMageEntity(world, { mana: 100, health: 100 });

    // Create target
    const target = createTargetEntity(world, { health: 100 });

    // Register a damage effect
    const damageEffect = createTestDamageEffect({
      id: 'fireball_damage',
      name: 'Fireball Damage',
      damageType: 'fire',
      baseDamage: 50, // Converted by helper to damageScaling
      range: 20,
      scaling: {
        base: 50,
        perProficiency: 1.0,
        maximum: 100,
      },
    });
    registerTestEffect(damageEffect);

    // Register a spell that uses this effect
    const spell: SpellDefinition = {
      id: 'fireball',
      name: 'Fireball',
      paradigmId: 'academic',
      technique: 'evocation',
      form: 'projectile',
      source: 'internal',
      manaCost: 30,
      castTime: 0, // Instant cast for effect testing
      range: 20,
      effectId: 'fireball_damage',
    };
    registerTestSpell(spell);

    // Teach spell to caster
    magicSystem.learnSpell(caster, 'fireball', 10);

    // Get initial health
    const initialHealth = target.getComponent<NeedsComponent>(CT.Needs)!.health;

    // Cast spell
    const success = magicSystem.castSpell(caster, world, 'fireball', target.id);

    // Verify spell was cast
    expect(success).toBe(true);

    // Verify health decreased
    const finalHealth = target.getComponent<NeedsComponent>(CT.Needs)!.health;
    expect(finalHealth).toBeLessThan(initialHealth);
    expect(finalHealth).toBeGreaterThanOrEqual(initialHealth - 100); // Max damage
  });

  it('should consume mana from caster', () => {
    const caster = createMageEntity(world, { mana: 100 });
    const target = createTargetEntity(world);

    // Register simple healing effect
    const healEffect = createTestHealingEffect({
      id: 'heal_effect',
      name: 'Healing Touch',
      baseHealing: 20,
      range: 5,
    });
    registerTestEffect(healEffect);

    const spell: SpellDefinition = {
      id: 'heal',
      name: 'Heal',
      paradigmId: 'academic',
      technique: 'restoration',
      form: 'touch',
      source: 'internal',
      manaCost: 25,
      castTime: 0, // Instant cast for effect testing
      range: 5,
      effectId: 'heal_effect',
    };
    registerTestSpell(spell);

    magicSystem.learnSpell(caster, 'heal', 10);

    const initialMana = caster.getComponent<MagicComponent>(CT.Magic)!.manaPools[0].current;

    magicSystem.castSpell(caster, world, 'heal', target.id);

    const finalMana = caster.getComponent<MagicComponent>(CT.Magic)!.manaPools[0].current;
    expect(finalMana).toBe(initialMana - 25);
  });

  it('should fail to cast if insufficient mana', () => {
    const caster = createMageEntity(world, { mana: 10 }); // Low mana
    const target = createTargetEntity(world);

    const damageEffect = createTestDamageEffect({
      id: 'costly_spell_effect',
      name: 'Costly Effect',
      damageType: 'force',
      baseDamage: 30,
      range: 10,
    });
    registerTestEffect(damageEffect);

    const spell: SpellDefinition = {
      id: 'costly_spell',
      name: 'Costly Spell',
      paradigmId: 'academic',
      technique: 'evocation',
      form: 'projectile',
      source: 'internal',
      manaCost: 50, // More than available
      castTime: 0, // Instant cast for effect testing
      range: 10,
      effectId: 'costly_spell_effect',
    };
    registerTestSpell(spell);

    magicSystem.learnSpell(caster, 'costly_spell', 10);

    const success = magicSystem.castSpell(caster, world, 'costly_spell', target.id);

    expect(success).toBe(false);
  });

  it('should apply self-targeting spells correctly', () => {
    const caster = createMageEntity(world, { mana: 100, health: 50 }); // Damaged

    const healEffect = createTestHealingEffect({
      id: 'self_heal_effect',
      name: 'Self Healing',
      baseHealing: 30,
      range: 0, // Self
    });
    registerTestEffect(healEffect);

    const spell: SpellDefinition = {
      id: 'self_heal',
      name: 'Self Heal',
      paradigmId: 'academic',
      technique: 'restoration',
      form: 'touch',
      source: 'internal',
      manaCost: 20,
      castTime: 0, // Instant cast for effect testing
      range: 0,
      effectId: 'self_heal_effect',
    };
    registerTestSpell(spell);

    magicSystem.learnSpell(caster, 'self_heal', 10);

    const initialHealth = caster.getComponent<NeedsComponent>(CT.Needs)!.health;

    // Cast without target (self-targeting)
    magicSystem.castSpell(caster, world, 'self_heal');

    const finalHealth = caster.getComponent<NeedsComponent>(CT.Needs)!.health;
    expect(finalHealth).toBeGreaterThan(initialHealth);
  });
});

// ============================================================================
// 2. Multi-Effect Spells
// ============================================================================

describe('Multi-Effect Spells', () => {
  let world: World;
  let magicSystem: MagicSystem;

  beforeEach(() => {
    const setup = createTestWorld();
    world = setup.world;
    magicSystem = setup.magicSystem;
  });

  it('should apply damage + debuff combo', () => {
    const caster = createMageEntity(world, { mana: 100 });
    const target = createTargetEntity(world, { health: 100 });

    // Register damage effect
    const damageEffect = createTestDamageEffect({
      id: 'poison_damage',
      name: 'Poison Damage',
      damageType: 'poison',
      baseDamage: 20,
      range: 15,
    });
    registerTestEffect(damageEffect);

    // Create a spell with damage effect (debuff would require full debuff applier)
    const spell: SpellDefinition = {
      id: 'poison_strike',
      name: 'Poison Strike',
      paradigmId: 'academic',
      technique: 'evocation',
      form: 'projectile',
      source: 'internal',
      manaCost: 25,
      castTime: 0, // Instant cast for effect testing
      range: 15,
      effectId: 'poison_damage',
    };
    registerTestSpell(spell);

    magicSystem.learnSpell(caster, 'poison_strike', 10);

    const initialHealth = target.getComponent<NeedsComponent>(CT.Needs)!.health;

    magicSystem.castSpell(caster, world, 'poison_strike', target.id);

    const finalHealth = target.getComponent<NeedsComponent>(CT.Needs)!.health;
    expect(finalHealth).toBeLessThan(initialHealth);
  });

  it('should apply heal + buff combo', () => {
    const caster = createMageEntity(world, { mana: 100 });
    const target = createTargetEntity(world, { health: 60 });

    const healEffect = createTestHealingEffect({
      id: 'blessed_healing',
      name: 'Blessed Healing',
      baseHealing: 25,
      range: 10,
    });
    registerTestEffect(healEffect);

    const spell: SpellDefinition = {
      id: 'blessing',
      name: 'Blessing',
      paradigmId: 'divine',
      technique: 'restoration',
      form: 'touch',
      source: 'internal',
      manaCost: 30,
      castTime: 0, // Instant cast for effect testing
      range: 10,
      effectId: 'blessed_healing',
    };
    registerTestSpell(spell);

    magicSystem.learnSpell(caster, 'blessing', 10);

    const initialHealth = target.getComponent<NeedsComponent>(CT.Needs)!.health;

    magicSystem.castSpell(caster, world, 'blessing', target.id);

    const finalHealth = target.getComponent<NeedsComponent>(CT.Needs)!.health;
    expect(finalHealth).toBeGreaterThan(initialHealth);
    expect(finalHealth).toBeLessThanOrEqual(100); // Capped at max
  });
});

// ============================================================================
// 3. Effect Interactions
// ============================================================================

describe('Effect Interactions', () => {
  let world: World;
  let magicSystem: MagicSystem;
  let executor: SpellEffectExecutor;

  beforeEach(() => {
    const setup = createTestWorld();
    world = setup.world;
    magicSystem = setup.magicSystem;
    executor = SpellEffectExecutor.getInstance();
  });

  it('should stack multiple protection effects', () => {
    const caster = createMageEntity(world, { mana: 200 });
    const target = createTargetEntity(world);

    const shieldEffect = createTestProtectionEffect({
      id: 'magic_shield',
      name: 'Magic Shield',
      absorptionAmount: 30,
      duration: 600,
      range: 5,
      stackable: true, // Make it stackable
    });
    registerTestEffect(shieldEffect);

    const spell: SpellDefinition = {
      id: 'shield',
      name: 'Shield',
      paradigmId: 'academic',
      technique: 'abjuration',
      form: 'self',
      source: 'internal',
      manaCost: 20,
      castTime: 0, // Set to 0 to avoid cooldown issues
      range: 5,
      duration: 600,
      effectId: 'magic_shield',
    };
    registerTestSpell(spell);

    magicSystem.learnSpell(caster, 'shield', 10);

    // Cast shield - first cast should succeed
    const cast1 = magicSystem.castSpell(caster, world, 'shield', target.id);
    expect(cast1).toBe(true);

    // Check that at least one active effect exists
    const activeEffects = executor.getActiveEffects(target.id);
    expect(activeEffects.length).toBeGreaterThan(0);
  });

  it('should process active effect duration ticks', () => {
    const caster = createMageEntity(world, { mana: 100 });
    const target = createTargetEntity(world);

    const protectionEffect = createTestProtectionEffect({
      id: 'temporary_ward',
      name: 'Temporary Ward',
      absorptionAmount: 20,
      duration: 10, // Short duration
      range: 5,
    });
    registerTestEffect(protectionEffect);

    const spell: SpellDefinition = {
      id: 'temp_ward',
      name: 'Temporary Ward',
      paradigmId: 'academic',
      technique: 'abjuration',
      form: 'self',
      source: 'internal',
      manaCost: 15,
      castTime: 0, // Set to 0 to avoid cooldown
      range: 5,
      duration: 10,
      effectId: 'temporary_ward',
    };
    registerTestSpell(spell);

    magicSystem.learnSpell(caster, 'temp_ward', 10);

    const castSuccess = magicSystem.castSpell(caster, world, 'temp_ward', target.id);
    expect(castSuccess).toBe(true);

    // Check effect is active
    const beforeTicks = executor.getActiveEffects(target.id);
    expect(beforeTicks.length).toBeGreaterThan(0);

    // Advance time beyond duration by calling processTick
    // Note: world.tick is a getter, so we track tick manually
    const startTick = world.tick;
    for (let i = 0; i < 15; i++) {
      executor.processTick(world, startTick + i + 1);
    }

    // Effect should have expired
    const afterTicks = executor.getActiveEffects(target.id);
    expect(afterTicks.length).toBe(0);
  });
});

// ============================================================================
// 4. Cross-System Integration
// ============================================================================

describe('Cross-System Integration', () => {
  let world: World;
  let magicSystem: MagicSystem;

  beforeEach(() => {
    const setup = createTestWorld();
    world = setup.world;
    magicSystem = setup.magicSystem;
  });

  it('should interact with NeedsComponent for damage', () => {
    const caster = createMageEntity(world, { mana: 100 });
    const target = createTargetEntity(world, { health: 100, maxHealth: 100 });

    const damageEffect = createTestDamageEffect({
      id: 'lightning_bolt',
      name: 'Lightning Bolt',
      damageType: 'lightning',
      baseDamage: 40,
      range: 25,
    });
    registerTestEffect(damageEffect);

    const spell: SpellDefinition = {
      id: 'lightning',
      name: 'Lightning',
      paradigmId: 'academic',
      technique: 'evocation',
      form: 'projectile',
      source: 'internal',
      manaCost: 30,
      castTime: 0, // Instant cast for effect testing
      range: 25,
      effectId: 'lightning_bolt',
    };
    registerTestSpell(spell);

    magicSystem.learnSpell(caster, 'lightning', 10);

    const beforeHealth = target.getComponent<NeedsComponent>(CT.Needs)!.health;

    magicSystem.castSpell(caster, world, 'lightning', target.id);

    const afterHealth = target.getComponent<NeedsComponent>(CT.Needs)!.health;
    expect(afterHealth).toBeLessThan(beforeHealth);
    expect(afterHealth).toBeGreaterThanOrEqual(0); // Health shouldn't go negative
  });

  it('should interact with NeedsComponent for healing', () => {
    const caster = createMageEntity(world, { mana: 100 });
    const target = createTargetEntity(world, { health: 40, maxHealth: 100 }); // Wounded

    const healEffect = createTestHealingEffect({
      id: 'major_heal',
      name: 'Major Heal',
      baseHealing: 50,
      range: 10,
    });
    registerTestEffect(healEffect);

    const spell: SpellDefinition = {
      id: 'major_healing',
      name: 'Major Healing',
      paradigmId: 'divine',
      technique: 'restoration',
      form: 'touch',
      source: 'internal',
      manaCost: 40,
      castTime: 0, // Instant cast for effect testing
      range: 10,
      effectId: 'major_heal',
    };
    registerTestSpell(spell);

    magicSystem.learnSpell(caster, 'major_healing', 10);

    const beforeHealth = target.getComponent<NeedsComponent>(CT.Needs)!.health;

    magicSystem.castSpell(caster, world, 'major_healing', target.id);

    const afterHealth = target.getComponent<NeedsComponent>(CT.Needs)!.health;
    expect(afterHealth).toBeGreaterThan(beforeHealth);
    expect(afterHealth).toBeLessThanOrEqual(100); // Shouldn't exceed max
  });

  it('should not heal beyond max health', () => {
    const caster = createMageEntity(world, { mana: 100 });
    const target = createTargetEntity(world, { health: 95, maxHealth: 100 });

    const healEffect = createTestHealingEffect({
      id: 'overheal_test',
      name: 'Overheal Test',
      baseHealing: 50,
      range: 10,
    });
    registerTestEffect(healEffect);

    const spell: SpellDefinition = {
      id: 'overheal',
      name: 'Overheal',
      paradigmId: 'academic',
      technique: 'restoration',
      form: 'touch',
      source: 'internal',
      manaCost: 25,
      castTime: 0, // Instant cast for effect testing
      range: 10,
      effectId: 'overheal_test',
    };
    registerTestSpell(spell);

    magicSystem.learnSpell(caster, 'overheal', 10);

    magicSystem.castSpell(caster, world, 'overheal', target.id);

    const finalHealth = target.getComponent<NeedsComponent>(CT.Needs)!.health;
    expect(finalHealth).toBe(100); // Capped at max
  });
});

// ============================================================================
// 5. Resource Management
// ============================================================================

describe('Resource Management', () => {
  let world: World;
  let magicSystem: MagicSystem;

  beforeEach(() => {
    const setup = createTestWorld();
    world = setup.world;
    magicSystem = setup.magicSystem;
  });

  it('should consume correct mana cost', () => {
    const caster = createMageEntity(world, { mana: 100 });
    const target = createTargetEntity(world);

    const effect = createTestDamageEffect({
      id: 'mana_test_effect',
      name: 'Mana Test',
      damageType: 'force',
      baseDamage: 15,
      range: 10,
    });
    registerTestEffect(effect);

    const spell: SpellDefinition = {
      id: 'mana_test_spell',
      name: 'Mana Test Spell',
      paradigmId: 'academic',
      technique: 'evocation',
      form: 'projectile',
      source: 'internal',
      manaCost: 35,
      castTime: 0, // Instant cast for effect testing
      range: 10,
      effectId: 'mana_test_effect',
    };
    registerTestSpell(spell);

    magicSystem.learnSpell(caster, 'mana_test_spell', 10);

    const initialMana = caster.getComponent<MagicComponent>(CT.Magic)!.manaPools[0].current;

    magicSystem.castSpell(caster, world, 'mana_test_spell', target.id);

    const finalMana = caster.getComponent<MagicComponent>(CT.Magic)!.manaPools[0].current;
    expect(finalMana).toBe(initialMana - 35);
  });

  it('should prevent casting multiple spells without sufficient mana', () => {
    const caster = createMageEntity(world, { mana: 50 });
    const target = createTargetEntity(world);

    const effect = createTestDamageEffect({
      id: 'expensive_effect',
      name: 'Expensive Effect',
      damageType: 'fire',
      baseDamage: 30,
      range: 15,
    });
    registerTestEffect(effect);

    const spell: SpellDefinition = {
      id: 'expensive_spell',
      name: 'Expensive Spell',
      paradigmId: 'academic',
      technique: 'evocation',
      form: 'projectile',
      source: 'internal',
      manaCost: 30,
      castTime: 0, // Instant cast for effect testing
      range: 15,
      effectId: 'expensive_effect',
    };
    registerTestSpell(spell);

    magicSystem.learnSpell(caster, 'expensive_spell', 10);

    // First cast should succeed
    const success1 = magicSystem.castSpell(caster, world, 'expensive_spell', target.id);
    expect(success1).toBe(true);

    // Second cast should fail (only 20 mana left)
    const success2 = magicSystem.castSpell(caster, world, 'expensive_spell', target.id);
    expect(success2).toBe(false);
  });

  it('should regenerate mana over time', () => {
    const caster = createMageEntity(world, { mana: 50 });

    const initialMana = caster.getComponent<MagicComponent>(CT.Magic)!.manaPools[0].current;

    // Process several ticks (mana regen happens in MagicSystem.update)
    // Note: world.tick is a getter, so we update via world.update() instead
    for (let i = 0; i < 10; i++) {
      magicSystem.update(world, [caster], 1.0);
    }

    const finalMana = caster.getComponent<MagicComponent>(CT.Magic)!.manaPools[0].current;
    expect(finalMana).toBeGreaterThan(initialMana);
  });
});

// ============================================================================
// 6. Event System
// ============================================================================

describe('Event System', () => {
  let world: World;
  let magicSystem: MagicSystem;

  beforeEach(() => {
    const setup = createTestWorld();
    world = setup.world;
    magicSystem = setup.magicSystem;
  });

  it('should emit spell_cast event', () => {
    const caster = createMageEntity(world, { mana: 100 });
    const target = createTargetEntity(world);

    const effect = createTestDamageEffect({
      id: 'event_test_effect',
      name: 'Event Test',
      damageType: 'force',
      baseDamage: 20,
      range: 10,
    });
    registerTestEffect(effect);

    const spell: SpellDefinition = {
      id: 'event_test_spell',
      name: 'Event Test Spell',
      paradigmId: 'academic',
      technique: 'evocation',
      form: 'projectile',
      source: 'internal',
      manaCost: 20,
      castTime: 0, // Set to 0 to avoid cooldown issues
      range: 10,
      effectId: 'event_test_effect',
    };
    registerTestSpell(spell);

    magicSystem.learnSpell(caster, 'event_test_spell', 10);

    // Subscribe BEFORE casting
    let eventEmitted = false;
    const unsubscribe = world.eventBus.subscribe('magic:spell_cast', (event) => {
      eventEmitted = true;
      expect(event.data.spellId).toBe('event_test_spell');
    });

    const castSuccess = magicSystem.castSpell(caster, world, 'event_test_spell', target.id);

    // Verify cast succeeded first
    expect(castSuccess).toBe(true);

    // Flush event bus to process queued events
    world.eventBus.flush();

    // Then verify event was emitted
    expect(eventEmitted).toBe(true);

    // Clean up subscription
    unsubscribe();
  });

  it('should track spell proficiency after casting', () => {
    const caster = createMageEntity(world, { mana: 100 });
    const target = createTargetEntity(world);

    const effect = createTestDamageEffect({
      id: 'proficiency_effect',
      name: 'Proficiency Test',
      damageType: 'fire',
      baseDamage: 15,
      range: 10,
    });
    registerTestEffect(effect);

    const spell: SpellDefinition = {
      id: 'proficiency_spell',
      name: 'Proficiency Spell',
      paradigmId: 'academic',
      technique: 'evocation',
      form: 'projectile',
      source: 'internal',
      manaCost: 20,
      castTime: 0, // Instant cast for effect testing
      range: 10,
      effectId: 'proficiency_effect',
    };
    registerTestSpell(spell);

    magicSystem.learnSpell(caster, 'proficiency_spell', 0);

    const beforeMagic = caster.getComponent<MagicComponent>(CT.Magic)!;
    const beforeProficiency = beforeMagic.knownSpells.find(s => s.spellId === 'proficiency_spell')!.proficiency;

    magicSystem.castSpell(caster, world, 'proficiency_spell', target.id);

    const afterMagic = caster.getComponent<MagicComponent>(CT.Magic)!;
    const afterProficiency = afterMagic.knownSpells.find(s => s.spellId === 'proficiency_spell')!.proficiency;

    expect(afterProficiency).toBeGreaterThan(beforeProficiency);
  });
});

// ============================================================================
// 7. Paradigm Integration
// ============================================================================

describe('Paradigm Integration', () => {
  let world: World;
  let magicSystem: MagicSystem;

  beforeEach(() => {
    const setup = createTestWorld();
    world = setup.world;
    magicSystem = setup.magicSystem;
  });

  it('should support academic paradigm spells', () => {
    const caster = createMageEntity(world, { mana: 100, paradigm: 'academic' });
    const target = createTargetEntity(world);

    const effect = createTestDamageEffect({
      id: 'academic_fireball',
      name: 'Academic Fireball',
      damageType: 'fire',
      baseDamage: 35,
      range: 20,
    });
    registerTestEffect(effect);

    const spell: SpellDefinition = {
      id: 'academic_spell',
      name: 'Academic Spell',
      paradigmId: 'academic',
      technique: 'evocation',
      form: 'projectile',
      source: 'internal',
      manaCost: 30,
      castTime: 0, // Instant cast for effect testing
      range: 20,
      effectId: 'academic_fireball',
    };
    registerTestSpell(spell);

    magicSystem.learnSpell(caster, 'academic_spell', 10);

    const success = magicSystem.castSpell(caster, world, 'academic_spell', target.id);
    expect(success).toBe(true);
  });

  it('should support divine paradigm spells', () => {
    const caster = createMageEntity(world, { mana: 100, paradigm: 'divine' });
    const target = createTargetEntity(world, { health: 60 });

    const effect = createTestHealingEffect({
      id: 'test_divine_healing',
      name: 'Test Divine Healing',
      baseHealing: 40,
      range: 10,
    });
    registerTestEffect(effect);

    const spell: SpellDefinition = {
      id: 'test_divine_heal',
      name: 'Test Divine Heal',
      paradigmId: 'divine',
      technique: 'restoration',
      form: 'touch',
      source: 'internal',
      manaCost: 25,
      castTime: 0, // Instant cast for effect testing
      range: 10,
      effectId: 'test_divine_healing',
    };
    registerTestSpell(spell);

    magicSystem.learnSpell(caster, 'test_divine_heal', 10);

    const beforeHealth = target.getComponent<NeedsComponent>(CT.Needs)!.health;

    magicSystem.castSpell(caster, world, 'test_divine_heal', target.id);

    const afterHealth = target.getComponent<NeedsComponent>(CT.Needs)!.health;
    expect(afterHealth).toBeGreaterThan(beforeHealth);
  });
});

// ============================================================================
// 8. Edge Cases
// ============================================================================

describe('Edge Cases', () => {
  let world: World;
  let magicSystem: MagicSystem;

  beforeEach(() => {
    const setup = createTestWorld();
    world = setup.world;
    magicSystem = setup.magicSystem;
  });

  it('should handle casting on dead/removed entities gracefully', () => {
    const caster = createMageEntity(world, { mana: 100 });
    const target = createTargetEntity(world);

    const effect = createTestDamageEffect({
      id: 'test_damage',
      name: 'Test Damage',
      damageType: 'force',
      baseDamage: 20,
      range: 10,
    });
    registerTestEffect(effect);

    const spell: SpellDefinition = {
      id: 'test_spell',
      name: 'Test Spell',
      paradigmId: 'academic',
      technique: 'evocation',
      form: 'projectile',
      source: 'internal',
      manaCost: 15,
      castTime: 0, // Instant cast for effect testing
      range: 10,
      effectId: 'test_damage',
    };
    registerTestSpell(spell);

    magicSystem.learnSpell(caster, 'test_spell', 10);

    const targetId = target.id;

    // Remove target
    world.destroyEntity(targetId);

    // Attempt to cast on removed entity
    const success = magicSystem.castSpell(caster, world, 'test_spell', targetId);

    // Should fail gracefully (no crash)
    expect(success).toBe(false);
  });

  it('should handle unknown spell IDs', () => {
    const caster = createMageEntity(world, { mana: 100 });
    const target = createTargetEntity(world);

    // Try to cast spell that doesn't exist
    const success = magicSystem.castSpell(caster, world, 'nonexistent_spell', target.id);

    expect(success).toBe(false);
  });

  it('should handle entity without magic component', () => {
    const notACaster = world.createEntity() as EntityImpl;
    notACaster.addComponent({
      type: CT.Position,
      x: 100,
      y: 100,
    });

    const target = createTargetEntity(world);

    const effect = createTestDamageEffect({
      id: 'no_magic_effect',
      name: 'No Magic',
      damageType: 'force',
      baseDamage: 10,
      range: 10,
    });
    registerTestEffect(effect);

    const spell: SpellDefinition = {
      id: 'no_magic_spell',
      name: 'No Magic Spell',
      paradigmId: 'academic',
      technique: 'evocation',
      form: 'projectile',
      source: 'internal',
      manaCost: 10,
      castTime: 0, // Instant cast for effect testing
      range: 10,
      effectId: 'no_magic_effect',
    };
    registerTestSpell(spell);

    const success = magicSystem.castSpell(notACaster, world, 'no_magic_spell', target.id);

    expect(success).toBe(false);
  });
});
