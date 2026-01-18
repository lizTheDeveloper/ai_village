/**
 * ControlEffectApplier - Handles buff, debuff, and control effects
 *
 * This module implements three effect appliers:
 * - BuffEffectApplier: Positive stat/ability modifiers
 * - DebuffEffectApplier: Negative stat/ability modifiers, DoT
 * - ControlEffectApplier: Movement control and status effects
 */

import type { Entity } from '../../ecs/Entity.js';
import type { World } from '../../ecs/World.js';
import type {
  BuffEffect,
  DebuffEffect,
  ControlEffect,
  StatModifier,
  EffectApplicationResult,
  ActiveEffect,
} from '../SpellEffect.js';
import type { EffectApplier, EffectContext } from '../SpellEffectExecutor.js';
import { registerEffect } from '../SpellEffectRegistry.js';
import { createBuffEffect, createDebuffEffect, calculateScaledValue } from '../SpellEffect.js';
import type { VelocityComponent } from '../../components/VelocityComponent.js';
import type { PositionComponent } from '../../components/PositionComponent.js';
import type { NeedsComponent } from '../../components/NeedsComponent.js';
import type { AgentComponent } from '../../components/AgentComponent.js';

// ============================================================================
// Effect State Storage
// ============================================================================

/**
 * Stores stat modifications applied by active buff/debuff effects.
 * Key: entityId, Value: Map of stat name -> accumulated modifiers
 */
const statModifiers: Map<string, Map<string, AppliedStatModifier[]>> = new Map();

/**
 * Stores control effect state for active control effects.
 * Key: entityId, Value: active control states
 */
const controlStates: Map<string, ControlState> = new Map();

interface AppliedStatModifier {
  instanceId: string;
  flat: number;
  percent: number;
  stacking: 'additive' | 'multiplicative' | 'highest' | 'lowest';
}

interface ControlState {
  stunned: boolean;
  rooted: boolean;
  charmed: boolean;
  feared: boolean;
  sleeping: boolean;
  polymorphed?: string; // Target archetype if polymorphed
}

// ============================================================================
// BuffEffectApplier
// ============================================================================

export class BuffEffectApplier implements EffectApplier<BuffEffect> {
  readonly category = 'buff' as const;

  apply(
    effect: BuffEffect,
    caster: Entity,
    target: Entity,
    _world: World,
    context: EffectContext
  ): EffectApplicationResult {
    const result: EffectApplicationResult = {
      success: true,
      effectId: effect.id,
      targetId: target.id,
      appliedValues: {},
      resisted: false,
      appliedAt: context.tick,
      casterId: caster.id,
      spellId: context.spell.id,
    };

    // Apply stat modifiers
    for (const modifier of effect.statModifiers) {
      this.applyStatModifier(target.id, modifier, result, 'buff_instance');
    }

    // Apply speed modifiers
    if (effect.movementSpeedModifier !== undefined) {
      result.appliedValues['movementSpeed'] = effect.movementSpeedModifier;
    }
    if (effect.attackSpeedModifier !== undefined) {
      result.appliedValues['attackSpeed'] = effect.attackSpeedModifier;
    }
    if (effect.castSpeedModifier !== undefined) {
      result.appliedValues['castSpeed'] = effect.castSpeedModifier;
    }

    // Grant abilities (future implementation)
    if (effect.grantsAbilities && effect.grantsAbilities.length > 0) {
      result.appliedValues['grantedAbilities'] = effect.grantsAbilities.length;
    }

    return result;
  }

  tick(
    _activeEffect: ActiveEffect,
    _effect: BuffEffect,
    _target: Entity,
    _world: World,
    _context: EffectContext
  ): void {
    // Buffs don't have tick behavior (no HoT in buffs)
    // Modifiers are continuously applied while effect is active
  }

  remove(
    activeEffect: ActiveEffect,
    effect: BuffEffect,
    target: Entity,
    _world: World
  ): void {
    // Remove stat modifiers
    for (const modifier of effect.statModifiers) {
      this.removeStatModifier(target.id, modifier.stat, activeEffect.instanceId);
    }
  }

  private applyStatModifier(
    entityId: string,
    modifier: StatModifier,
    result: EffectApplicationResult,
    instanceId: string
  ): void {
    if (!statModifiers.has(entityId)) {
      statModifiers.set(entityId, new Map());
    }

    const entityMods = statModifiers.get(entityId)!;
    if (!entityMods.has(modifier.stat)) {
      entityMods.set(modifier.stat, []);
    }

    const statMods = entityMods.get(modifier.stat)!;
    statMods.push({
      instanceId,
      flat: modifier.flat ?? 0,
      percent: modifier.percent ?? 0,
      stacking: modifier.stacking,
    });

    // Calculate total modifier for this stat
    const total = this.calculateTotalModifier(statMods);
    result.appliedValues[modifier.stat] = total;
  }

  private removeStatModifier(entityId: string, stat: string, instanceId: string): void {
    const entityMods = statModifiers.get(entityId);
    if (!entityMods) return;

    const statMods = entityMods.get(stat);
    if (!statMods) return;

    const index = statMods.findIndex(m => m.instanceId === instanceId);
    if (index !== -1) {
      statMods.splice(index, 1);
    }

    if (statMods.length === 0) {
      entityMods.delete(stat);
    }

    if (entityMods.size === 0) {
      statModifiers.delete(entityId);
    }
  }

  private calculateTotalModifier(modifiers: AppliedStatModifier[]): number {
    if (modifiers.length === 0) return 0;

    // Separate by stacking type
    const additive = modifiers.filter(m => m.stacking === 'additive');
    const multiplicative = modifiers.filter(m => m.stacking === 'multiplicative');
    const highest = modifiers.filter(m => m.stacking === 'highest');
    const lowest = modifiers.filter(m => m.stacking === 'lowest');

    let total = 0;

    // Additive: sum all flat and percent values
    for (const mod of additive) {
      total += mod.flat + mod.percent;
    }

    // Multiplicative: multiply percent values
    let multTotal = 1;
    for (const mod of multiplicative) {
      multTotal *= (1 + mod.percent / 100);
      total += mod.flat;
    }
    total *= multTotal;

    // Highest: take highest value
    if (highest.length > 0) {
      const max = Math.max(...highest.map(m => m.flat + m.percent));
      total = Math.max(total, max);
    }

    // Lowest: take lowest value
    if (lowest.length > 0) {
      const min = Math.min(...lowest.map(m => m.flat + m.percent));
      total = Math.min(total, min);
    }

    return total;
  }
}

// ============================================================================
// DebuffEffectApplier
// ============================================================================

export class DebuffEffectApplier implements EffectApplier<DebuffEffect> {
  readonly category = 'debuff' as const;

  apply(
    effect: DebuffEffect,
    caster: Entity,
    target: Entity,
    _world: World,
    context: EffectContext
  ): EffectApplicationResult {
    const result: EffectApplicationResult = {
      success: true,
      effectId: effect.id,
      targetId: target.id,
      appliedValues: {},
      resisted: false,
      appliedAt: context.tick,
      casterId: caster.id,
      spellId: context.spell.id,
    };

    // Apply stat modifiers (negative)
    for (const modifier of effect.statModifiers) {
      this.applyStatModifier(target.id, modifier, result, 'debuff_instance');
    }

    // Apply movement speed reduction
    if (effect.movementSpeedModifier !== undefined) {
      result.appliedValues['movementSpeed'] = effect.movementSpeedModifier;
    }

    // Apply status flags
    if (effect.slowed) {
      result.appliedValues['slowed'] = 1;
    }
    if (effect.rooted) {
      result.appliedValues['rooted'] = 1;
      // Immediately stop movement if rooted
      const velocity = target.getComponent<VelocityComponent>('velocity');
      if (velocity) {
        velocity.vx = 0;
        velocity.vy = 0;
      }
    }
    if (effect.silenced) {
      result.appliedValues['silenced'] = 1;
    }
    if (effect.blinded) {
      result.appliedValues['blinded'] = 1;
    }

    // Calculate DoT damage if applicable
    if (effect.dotDamage && effect.dotType) {
      const dotValue = calculateScaledValue(effect.dotDamage, {
        proficiency: context.casterMagic.totalSpellsCast > 0 ? 50 : 0,
        level: Math.floor(Math.log2(context.casterMagic.totalSpellsCast + 1)),
      });
      result.appliedValues['dotDamage'] = dotValue.value;
      result.appliedValues[`dotType_${effect.dotType}`] = 1; // Store as numeric flag
    }

    return result;
  }

  tick(
    activeEffect: ActiveEffect,
    effect: DebuffEffect,
    target: Entity,
    _world: World,
    context: EffectContext
  ): void {
    // Process DoT damage
    if (effect.dotDamage && effect.dotType && effect.dotInterval) {
      const timeSinceApplied = context.tick - activeEffect.appliedAt;
      const intervalsPassed = Math.floor(timeSinceApplied / effect.dotInterval);
      const lastInterval = Math.floor((timeSinceApplied - 1) / effect.dotInterval);

      // Only apply damage on interval ticks
      if (intervalsPassed > lastInterval) {
        const damage = activeEffect.appliedValues['dotDamage'] ?? 0;
        this.applyDoTDamage(target, damage, effect.dotType);
      }
    }
  }

  remove(
    activeEffect: ActiveEffect,
    effect: DebuffEffect,
    target: Entity,
    _world: World
  ): void {
    // Remove stat modifiers
    for (const modifier of effect.statModifiers) {
      this.removeStatModifier(target.id, modifier.stat, activeEffect.instanceId);
    }

    // Clear status flags (no need to track, they're implicit while effect exists)
  }

  private applyStatModifier(
    entityId: string,
    modifier: StatModifier,
    result: EffectApplicationResult,
    instanceId: string
  ): void {
    if (!statModifiers.has(entityId)) {
      statModifiers.set(entityId, new Map());
    }

    const entityMods = statModifiers.get(entityId)!;
    if (!entityMods.has(modifier.stat)) {
      entityMods.set(modifier.stat, []);
    }

    const statMods = entityMods.get(modifier.stat)!;
    statMods.push({
      instanceId,
      flat: modifier.flat ?? 0,
      percent: modifier.percent ?? 0,
      stacking: modifier.stacking,
    });

    const total = this.calculateTotalModifier(statMods);
    result.appliedValues[modifier.stat] = total;
  }

  private removeStatModifier(entityId: string, stat: string, instanceId: string): void {
    const entityMods = statModifiers.get(entityId);
    if (!entityMods) return;

    const statMods = entityMods.get(stat);
    if (!statMods) return;

    const index = statMods.findIndex(m => m.instanceId === instanceId);
    if (index !== -1) {
      statMods.splice(index, 1);
    }

    if (statMods.length === 0) {
      entityMods.delete(stat);
    }

    if (entityMods.size === 0) {
      statModifiers.delete(entityId);
    }
  }

  private calculateTotalModifier(modifiers: AppliedStatModifier[]): number {
    if (modifiers.length === 0) return 0;

    const additive = modifiers.filter(m => m.stacking === 'additive');
    const multiplicative = modifiers.filter(m => m.stacking === 'multiplicative');
    const highest = modifiers.filter(m => m.stacking === 'highest');
    const lowest = modifiers.filter(m => m.stacking === 'lowest');

    let total = 0;

    for (const mod of additive) {
      total += mod.flat + mod.percent;
    }

    let multTotal = 1;
    for (const mod of multiplicative) {
      multTotal *= (1 + mod.percent / 100);
      total += mod.flat;
    }
    total *= multTotal;

    if (highest.length > 0) {
      const max = Math.max(...highest.map(m => m.flat + m.percent));
      total = Math.max(total, max);
    }

    if (lowest.length > 0) {
      const min = Math.min(...lowest.map(m => m.flat + m.percent));
      total = Math.min(total, min);
    }

    return total;
  }

  private applyDoTDamage(target: Entity, damage: number, _damageType: string): void {
    // Apply damage to target's health
    const needs = target.getComponent<NeedsComponent>('needs');
    if (needs && 'health' in needs) {
      const currentHealth = needs.health;
      needs.health = Math.max(0, currentHealth - damage);
    }
  }
}

// ============================================================================
// ControlEffectApplier
// ============================================================================

export class ControlEffectApplier implements EffectApplier<ControlEffect> {
  readonly category = 'control' as const;

  apply(
    effect: ControlEffect,
    caster: Entity,
    target: Entity,
    _world: World,
    context: EffectContext
  ): EffectApplicationResult {
    const result: EffectApplicationResult = {
      success: true,
      effectId: effect.id,
      targetId: target.id,
      appliedValues: {},
      resisted: false,
      appliedAt: context.tick,
      casterId: caster.id,
      spellId: context.spell.id,
    };

    // Initialize control state
    if (!controlStates.has(target.id)) {
      controlStates.set(target.id, {
        stunned: false,
        rooted: false,
        charmed: false,
        feared: false,
        sleeping: false,
      });
    }

    const controlState = controlStates.get(target.id)!;

    // Apply control type
    switch (effect.controlType) {
      case 'stun':
        controlState.stunned = true;
        result.appliedValues['stunned'] = 1;
        this.stopMovement(target);
        break;

      case 'root':
        controlState.rooted = true;
        result.appliedValues['rooted'] = 1;
        this.stopMovement(target);
        break;

      case 'knockback':
        this.applyKnockback(target, caster, effect.forceAmount ?? 5, effect.direction ?? 'away');
        result.appliedValues['knockback'] = effect.forceAmount ?? 5;
        break;

      case 'pull':
        this.applyKnockback(target, caster, effect.forceAmount ?? 5, 'toward');
        result.appliedValues['pull'] = effect.forceAmount ?? 5;
        break;

      case 'levitate':
        this.applyLevitate(target, effect.forceAmount ?? 1);
        result.appliedValues['levitate'] = effect.forceAmount ?? 1;
        break;

      case 'charm':
        controlState.charmed = true;
        result.appliedValues['charmed'] = 1;
        break;

      case 'fear':
        controlState.feared = true;
        result.appliedValues['feared'] = 1;
        this.applyFear(target, caster);
        break;

      case 'sleep':
        controlState.sleeping = true;
        result.appliedValues['sleeping'] = 1;
        this.stopMovement(target);
        break;

      case 'polymorph':
        if (effect.polymorphInto) {
          controlState.polymorphed = effect.polymorphInto;
          result.appliedValues['polymorphed'] = 1;
        }
        break;
    }

    return result;
  }

  tick(
    activeEffect: ActiveEffect,
    effect: ControlEffect,
    target: Entity,
    world: World,
    _context: EffectContext
  ): void {
    const controlState = controlStates.get(target.id);
    if (!controlState) return;

    // Maintain control states
    switch (effect.controlType) {
      case 'stun':
      case 'root':
      case 'sleep':
        // Keep target immobile
        this.stopMovement(target);
        break;

      case 'fear':
        // Keep target fleeing
        const caster = world.getEntity(activeEffect.casterId);
        if (caster) {
          this.applyFear(target, caster);
        }
        break;

      case 'levitate':
        // Maintain levitation height
        this.applyLevitate(target, effect.forceAmount ?? 1);
        break;
    }
  }

  remove(
    _activeEffect: ActiveEffect,
    effect: ControlEffect,
    target: Entity,
    _world: World
  ): void {
    const controlState = controlStates.get(target.id);
    if (!controlState) return;

    // Clear control state
    switch (effect.controlType) {
      case 'stun':
        controlState.stunned = false;
        break;
      case 'root':
        controlState.rooted = false;
        break;
      case 'charm':
        controlState.charmed = false;
        break;
      case 'fear':
        controlState.feared = false;
        break;
      case 'sleep':
        controlState.sleeping = false;
        break;
      case 'polymorph':
        controlState.polymorphed = undefined;
        break;
    }

    // Clean up if no active control effects remain
    if (
      !controlState.stunned &&
      !controlState.rooted &&
      !controlState.charmed &&
      !controlState.feared &&
      !controlState.sleeping &&
      !controlState.polymorphed
    ) {
      controlStates.delete(target.id);
    }
  }

  private stopMovement(target: Entity): void {
    const velocity = target.getComponent<VelocityComponent>('velocity');
    if (velocity) {
      velocity.vx = 0;
      velocity.vy = 0;
    }
  }

  private applyKnockback(
    target: Entity,
    source: Entity,
    force: number,
    direction: 'away' | 'toward' | 'up' | 'down'
  ): void {
    const targetPos = target.getComponent<PositionComponent>('position');
    const sourcePos = source.getComponent<PositionComponent>('position');
    const velocity = target.getComponent<VelocityComponent>('velocity');

    if (!targetPos || !sourcePos || !velocity) return;

    if (direction === 'away' || direction === 'toward') {
      const dx = targetPos.x - sourcePos.x;
      const dy = targetPos.y - sourcePos.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist > 0) {
        const dirMultiplier = direction === 'away' ? 1 : -1;
        velocity.vx = (dx / dist) * force * dirMultiplier;
        velocity.vy = (dy / dist) * force * dirMultiplier;
      }
    } else if (direction === 'up') {
      // Apply vertical force (changes z coordinate)
      targetPos.z += force;
    } else if (direction === 'down') {
      targetPos.z -= force;
    }
  }

  private applyLevitate(target: Entity, height: number): void {
    const position = target.getComponent<PositionComponent>('position');
    if (position) {
      // Set z-level to levitation height
      position.z = height;
    }
  }

  private applyFear(target: Entity, source: Entity): void {
    const targetPos = target.getComponent<PositionComponent>('position');
    const sourcePos = source.getComponent<PositionComponent>('position');
    const velocity = target.getComponent<VelocityComponent>('velocity');
    const agent = target.getComponent<AgentComponent>('agent');

    if (!targetPos || !sourcePos || !velocity) return;

    // Flee away from source
    const dx = targetPos.x - sourcePos.x;
    const dy = targetPos.y - sourcePos.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist > 0) {
      const fleeSpeed = 2.0;
      velocity.vx = (dx / dist) * fleeSpeed;
      velocity.vy = (dy / dist) * fleeSpeed;
    }

    // Set behavior to flee if agent component exists
    // Note: AgentComponent doesn't have currentBehavior - this is handled by BehaviorComponent
    // This code is legacy and should be refactored to use BehaviorComponent
    if (agent && 'currentBehavior' in agent) {
      // Type guard ensures safe access to dynamic property
      (agent as { currentBehavior: string }).currentBehavior = 'flee';
    }
  }
}

// ============================================================================
// Built-in Effect Definitions
// ============================================================================

/**
 * Register all built-in buff, debuff, and control effects.
 */
export function registerBuiltInControlEffects(): void {
  // Buff: Strength (+20% damage, +10 strength stat)
  registerEffect(
    createBuffEffect(
      'strength_buff',
      'Strength',
      600, // 10 minute duration
      [
        { stat: 'strength', flat: 10, percent: 0, stacking: 'additive' },
        { stat: 'damage', flat: 0, percent: 20, stacking: 'multiplicative' },
      ],
      {
        description: 'Increases strength and damage dealt.',
        tags: ['buff', 'strength', 'combat'],
        stackable: false,
        form: 'body',
      }
    )
  );

  // Buff: Haste (+50% movement speed, +30% attack speed)
  registerEffect(
    createBuffEffect(
      'haste',
      'Haste',
      300, // 5 minute duration
      [],
      {
        description: 'Increases movement and attack speed.',
        tags: ['buff', 'speed', 'movement'],
        movementSpeedModifier: 50,
        attackSpeedModifier: 30,
        stackable: false,
        form: 'body',
      }
    )
  );

  // Debuff: Weakness (-30% damage dealt)
  registerEffect(
    createDebuffEffect(
      'weakness',
      'Weakness',
      600, // 10 minute duration
      {
        description: 'Reduces damage dealt by the target.',
        tags: ['debuff', 'weakness', 'combat'],
        statModifiers: [
          { stat: 'damage', flat: 0, percent: -30, stacking: 'multiplicative' },
        ],
        slowed: false,
        rooted: false,
        silenced: false,
        blinded: false,
        stackable: false,
        form: 'body',
      }
    )
  );

  // Debuff: Slow (-40% movement speed)
  registerEffect(
    createDebuffEffect(
      'slow',
      'Slow',
      300, // 5 minute duration
      {
        description: 'Reduces movement speed.',
        tags: ['debuff', 'slow', 'movement'],
        movementSpeedModifier: -40,
        slowed: true,
        rooted: false,
        silenced: false,
        blinded: false,
        stackable: false,
        form: 'body',
      }
    )
  );

  // Debuff: Poison (DoT: 5 damage every 2 seconds)
  registerEffect(
    createDebuffEffect(
      'poison',
      'Poison',
      600, // 10 minute duration
      {
        description: 'Deals poison damage over time.',
        tags: ['debuff', 'poison', 'dot'],
        slowed: false,
        rooted: false,
        silenced: false,
        blinded: false,
        dotDamage: {
          base: 5,
          perProficiency: 0.1,
          maximum: 20,
        },
        dotType: 'poison',
        dotInterval: 120, // Every 2 seconds (assuming 60 ticks/sec)
        stackable: true,
        maxStacks: 3,
        form: 'body',
      }
    )
  );

  // Control: Stun (prevents all actions)
  registerEffect({
    id: 'stun',
    name: 'Stun',
    description: 'Prevents all actions and movement.',
    category: 'control',
    targetType: 'single',
    targetFilter: 'enemies',
    range: 10,
    duration: 180, // 3 seconds
    dispellable: true,
    stackable: false,
    tags: ['control', 'stun', 'disable'],
    controlType: 'stun',
    technique: 'control',
    form: 'body',
  });

  // Control: Fear (target flees)
  registerEffect({
    id: 'fear',
    name: 'Fear',
    description: 'Causes target to flee in terror.',
    category: 'control',
    targetType: 'single',
    targetFilter: 'enemies',
    range: 10,
    duration: 300, // 5 seconds
    dispellable: true,
    stackable: false,
    tags: ['control', 'fear', 'mental'],
    controlType: 'fear',
    technique: 'control',
    form: 'mind',
  });

  // Control: Root (prevents movement)
  registerEffect({
    id: 'root',
    name: 'Root',
    description: 'Prevents target from moving.',
    category: 'control',
    targetType: 'single',
    targetFilter: 'enemies',
    range: 10,
    duration: 240, // 4 seconds
    dispellable: true,
    stackable: false,
    tags: ['control', 'root', 'immobilize'],
    controlType: 'root',
    technique: 'control',
    form: 'body',
  });
}

// ============================================================================
// Exports
// ============================================================================

export const buffEffectApplier = new BuffEffectApplier();
export const debuffEffectApplier = new DebuffEffectApplier();
export const controlEffectApplier = new ControlEffectApplier();

/**
 * Get accumulated stat modifier for an entity's stat.
 * Used by systems to query total buff/debuff effects.
 */
export function getStatModifier(entityId: string, stat: string): number {
  const entityMods = statModifiers.get(entityId);
  if (!entityMods) return 0;

  const statMods = entityMods.get(stat);
  if (!statMods) return 0;

  // Use BuffEffectApplier's calculation (same logic for both buff/debuff)
  return buffEffectApplier['calculateTotalModifier'](statMods);
}

/**
 * Check if entity has a specific control effect active.
 */
export function hasControlEffect(
  entityId: string,
  controlType: 'stunned' | 'rooted' | 'charmed' | 'feared' | 'sleeping'
): boolean {
  const state = controlStates.get(entityId);
  return state?.[controlType] ?? false;
}

/**
 * Get the target archetype if entity is polymorphed.
 */
export function getPolymorphTarget(entityId: string): string | undefined {
  return controlStates.get(entityId)?.polymorphed;
}

/**
 * Clear all stat modifiers and control states (for testing/cleanup).
 */
export function clearAllEffectState(): void {
  statModifiers.clear();
  controlStates.clear();
}
