import { BaseSystem, type SystemContext } from '../ecs/SystemContext.js';
import type { SystemId, ComponentType } from '../types.js';
import type { World } from '../ecs/World.js';
import type { Entity } from '../ecs/Entity.js';
import { EntityImpl } from '../ecs/Entity.js';
import type { ConflictComponent } from '../components/ConflictComponent.js';
import type { CombatStatsComponent } from '../components/CombatStatsComponent.js';
import { createInjuryComponent, type InjuryComponent } from '../components/InjuryComponent.js';
import type { EquipmentComponent } from '../components/EquipmentComponent.js';
import type { SoulLinkComponent } from '../components/SoulLinkComponent.js';
import type { SoulIdentityComponent } from '../components/SoulIdentityComponent.js';
import { NeedsComponent } from '../components/NeedsComponent.js';
import { itemRegistry } from '../items/index.js';
import {
  TICKS_PER_SECOND,
  COMBAT_DURATION_MIN,
  COMBAT_DURATION_BASE,
  COMBAT_DURATION_EXTENDED,
  COMBAT_DURATION_LETHAL,
} from '../constants/index.js';
import type { EventBus } from '../events/EventBus.js';
import type { LLMProvider } from '../types/LLMTypes.js';

interface PositionComponent {
  type: 'position';
  version: number;
  x: number;
  y: number;
  z: number;
}

interface AgentComponent {
  type: 'agent';
  version: number;
  name?: string;
}

interface RelationshipComponent {
  type: 'relationship';
  version: number;
  relationships: Record<string, { opinion: number; trust?: number }>;
}

interface ReputationComponent {
  type: 'reputation';
  version: number;
  honor: number;
  violence: number;
}

interface LawsComponent {
  type: 'laws';
  version: number;
  murderIllegal?: boolean;
  assaultIllegal?: boolean;
  selfDefenseLegal?: boolean;
}

interface EnvironmentComponent {
  type: 'environment';
  version: number;
  terrain?: string;
  weather?: string;
  timeOfDay?: string;
}

/**
 * AgentCombatSystem - Handles agent vs agent combat
 *
 * Implements REQ-CON-003:
 * - Combat with various causes
 * - Skill and equipment comparison
 * - Modifiers (surprise, terrain, injuries)
 * - Outcome rolling
 * - Injury determination
 * - LLM narrative generation
 * - Social consequences
 * - Legal consequences
 */
export class AgentCombatSystem extends BaseSystem {
  public readonly id: SystemId = 'agent_combat';
  public readonly priority = 46; // After hunting, before injury
  public readonly requiredComponents: ReadonlyArray<ComponentType> = ['conflict'];
  // Only run when conflict components exist (O(1) activation check)
  public readonly activationComponents = ['conflict'] as const;
  protected readonly throttleInterval = 0; // EVERY_TICK - critical responsiveness

  private llmProvider?: LLMProvider;

  /**
   * Sigmoid lookup table for performance optimization.
   * Pre-calculated for power differences -50 to +50 (101 values).
   * Avoids expensive Math.exp() calls in combat calculations.
   * ~10x faster than calculating sigmoid each time.
   */
  private static readonly SIGMOID_LUT = AgentCombatSystem.buildSigmoidLookupTable();

  private static buildSigmoidLookupTable(): Float32Array {
    const lut = new Float32Array(101); // -50 to +50 = 101 values
    for (let i = 0; i <= 100; i++) {
      const powerDiff = i - 50; // Map index to power diff
      lut[i] = 1 / (1 + Math.exp(-0.2 * powerDiff));
    }
    return lut;
  }

  /**
   * Fast sigmoid lookup (avoids Math.exp).
   * Falls back to calculation only for extreme values outside LUT range.
   */
  private getSigmoid(powerDiff: number): number {
    // Round to nearest integer for lookup
    const index = Math.round(powerDiff) + 50;

    // Use lookup table for common cases (-50 to +50)
    if (index >= 0 && index <= 100) {
      return AgentCombatSystem.SIGMOID_LUT[index]!;
    }

    // Fallback for extreme values (rare, e.g. god vs peasant)
    return 1 / (1 + Math.exp(-0.2 * powerDiff));
  }

  constructor(llmProvider?: LLMProvider) {
    super();
    this.llmProvider = llmProvider;
  }

  protected onUpdate(ctx: SystemContext): void {
    const ticksElapsed = ctx.deltaTime * TICKS_PER_SECOND;

    for (const entity of ctx.activeEntities) {
      const conflict = ctx.world.getComponent<ConflictComponent>(entity.id, 'conflict');
      if (!conflict || conflict.conflictType !== 'agent_combat') {
        continue;
      }

      if (conflict.state === 'initiated') {
        // Validate inputs before starting combat
        if (!conflict.cause) {
          throw new Error('Combat cause is required');
        }

        if (!ctx.world.hasComponent(entity.id, 'combat_stats')) {
          throw new Error('Attacker missing required component: combat_stats');
        }

        // Get defender
        const defender = ctx.world.getEntity(conflict.target);
        if (!defender) {
          throw new Error('Combat target entity not found');
        }

        if (!ctx.world.hasComponent(defender.id, 'agent')) {
          throw new Error('Combat target is not an agent');
        }

        if (!ctx.world.hasComponent(defender.id, 'combat_stats')) {
          throw new Error('Defender missing required component: combat_stats');
        }

        // Calculate combat duration and start fighting
        const duration = this.calculateCombatDuration(ctx.world, entity, conflict);

        // Calculate combat power for both combatants
        const attackerStats = ctx.world.getComponent<CombatStatsComponent>(entity.id, 'combat_stats');
        const defenderStats = ctx.world.getComponent<CombatStatsComponent>(defender.id, 'combat_stats');
        if (!attackerStats || !defenderStats) {
          // This should never happen after validation above, but keep for safety
          continue;
        }

        const { attackerPower, defenderPower, modifiers } = this.calculateCombatPower(
          ctx.world,
          entity,
          defender,
          attackerStats,
          defenderStats,
          conflict
        );

        const attackerImpl = entity as EntityImpl;
        attackerImpl.updateComponent<ConflictComponent>('conflict', (c) => ({
          ...c,
          state: 'fighting',
          endTime: duration, // Store remaining ticks until combat ends
          attackerPower,
          defenderPower,
          modifiers,
        }));

        // Emit combat:started event
        const pos = ctx.world.getComponent<PositionComponent>(entity.id, 'position');
        ctx.emit('combat:started', {
          participants: [entity.id, conflict.target],
          initiator: entity.id,
          position: pos ? { x: pos.x, y: pos.y } : { x: 0, y: 0 },
        });
      } else if (conflict.state === 'fighting') {
        // Decrement remaining combat time
        const remainingTicks = (conflict.endTime ?? 0) - ticksElapsed;

        if (remainingTicks <= 0) {
          // Combat is over, resolve it
          this.resolveCombat(ctx.world, entity, conflict, ctx);
        } else {
          // Update remaining time
          const attackerImpl = entity as EntityImpl;
          attackerImpl.updateComponent<ConflictComponent>('conflict', (c) => ({
            ...c,
            endTime: remainingTicks,
          }));
        }
      }
    }
  }

  /**
   * Calculate how long combat should last based on combat parameters.
   * Duration scales with lethality and power difference.
   */
  private calculateCombatDuration(world: World, attacker: Entity, conflict: ConflictComponent): number {
    // Get defender to calculate power difference
    const defender = world.getEntity(conflict.target);
    if (!defender) {
      return COMBAT_DURATION_MIN; // Fallback
    }

    const attackerStats = world.getComponent<CombatStatsComponent>(attacker.id, 'combat_stats');
    const defenderStats = world.getComponent<CombatStatsComponent>(defender.id, 'combat_stats');

    if (!attackerStats || !defenderStats) {
      return COMBAT_DURATION_MIN; // Fallback
    }

    // Base duration on lethality
    let baseDuration = conflict.lethal ? COMBAT_DURATION_LETHAL : COMBAT_DURATION_BASE;

    // Calculate power difference (simplified version of calculateCombatPower)
    const attackerPower = attackerStats.combatSkill * 3;
    const defenderPower = defenderStats.combatSkill * 3;
    const powerDiff = Math.abs(attackerPower - defenderPower);

    // Very one-sided fights are quicker
    if (powerDiff > 15) {
      baseDuration = COMBAT_DURATION_MIN;
    }
    // Evenly matched fights take longer
    else if (powerDiff < 5) {
      baseDuration = COMBAT_DURATION_EXTENDED;
    }

    // Add some randomness (±20%)
    const variance = baseDuration * 0.2;
    const duration = baseDuration + (Math.random() * variance * 2 - variance);

    return Math.max(COMBAT_DURATION_MIN, duration);
  }

  private resolveCombat(world: World, attacker: Entity, conflict: ConflictComponent, ctx?: SystemContext): void {
    // Validate inputs
    if (!conflict.cause) {
      throw new Error('Combat cause is required');
    }

    if (!world.hasComponent(attacker.id, 'combat_stats')) {
      throw new Error('Attacker missing required component: combat_stats');
    }

    // Get defender
    const defender = world.getEntity(conflict.target);
    if (!defender) {
      throw new Error('Combat target entity not found');
    }

    if (!world.hasComponent(defender.id, 'agent')) {
      throw new Error('Combat target is not an agent');
    }

    if (!world.hasComponent(defender.id, 'combat_stats')) {
      throw new Error('Defender missing required component: combat_stats');
    }

    const attackerStats = world.getComponent<CombatStatsComponent>(attacker.id, 'combat_stats')!;
    const defenderStats = world.getComponent<CombatStatsComponent>(defender.id, 'combat_stats')!;

    // Calculate combat power
    const { attackerPower, defenderPower, modifiers } = this.calculateCombatPower(
      world,
      attacker,
      defender,
      attackerStats,
      defenderStats,
      conflict
    );

    // Roll outcome
    const outcome = this.rollOutcome(world, attacker, defender, attackerPower, defenderPower, conflict.lethal);

    // Apply injuries
    this.applyInjuries(world, attacker, defender, outcome, attackerPower, defenderPower);

    // Generate narrative
    this.generateNarrative(world, attacker, defender, conflict, outcome);

    // Apply social consequences
    this.applySocialConsequences(world, attacker, defender, conflict, outcome);

    // Apply legal consequences
    this.applyLegalConsequences(world, attacker, conflict);

    // Update conflict component
    const attackerImpl = attacker as EntityImpl;
    attackerImpl.updateComponent<ConflictComponent>('conflict', (c) => ({
      ...c,
      state: 'resolved',
      attackerPower,
      defenderPower,
      modifiers,
      outcome,
    }));

    // Emit combat:ended event
    if (ctx) {
      const winner = outcome === 'attacker_victory' ? attacker.id :
                     outcome === 'defender_victory' ? defender.id : undefined;
      ctx.emit('combat:ended', {
        participants: [attacker.id, defender.id],
        winner,
        duration: conflict.endTime ?? 0,
      });
    }
  }

  private calculateCombatPower(
    world: World,
    attacker: Entity,
    _defender: Entity,
    attackerStats: CombatStatsComponent,
    defenderStats: CombatStatsComponent,
    conflict: ConflictComponent
  ): { attackerPower: number; defenderPower: number; modifiers: Array<{ type: string; value: number }> } {
    const modifiers: Array<{ type: string; value: number }> = [];

    // Get magical skill bonuses from equipment (Phase 36: Combat Integration)
    let attackerCombatSkill = attackerStats.combatSkill;
    let defenderCombatSkill = defenderStats.combatSkill;

    // Apply magical skill bonuses from equipment
    const attackerEquipment = world.hasComponent(attacker.id, 'equipment')
      ? (world.getComponent(attacker.id, 'equipment') as EquipmentComponent)
      : null;
    const defenderEquipment = world.hasComponent(_defender.id, 'equipment')
      ? (world.getComponent(_defender.id, 'equipment') as EquipmentComponent)
      : null;

    if (attackerEquipment?.cached?.skillModifiers?.combat) {
      const skillBonus = attackerEquipment.cached.skillModifiers.combat;
      attackerCombatSkill += skillBonus;
      modifiers.push({ type: 'magical_skill_bonus', value: skillBonus });
    }

    if (defenderEquipment?.cached?.skillModifiers?.combat) {
      const skillBonus = defenderEquipment.cached.skillModifiers.combat;
      defenderCombatSkill += skillBonus;
    }

    // Base power from combat skill (scaled 3x to make skill more important)
    // Skill should matter more than equipment
    let attackerPower = attackerCombatSkill * 3;
    let defenderPower = defenderCombatSkill * 3;

    // Attacker equipment bonuses (scaled down to 40% to balance with skill)
    if (attackerEquipment) {
      const weaponBonus = this.getEquipmentWeaponBonus(attackerEquipment) * 0.4;
      const armorBonus = this.getEquipmentDefenseBonus(attackerEquipment) * 0.4;
      attackerPower += weaponBonus + armorBonus;
      modifiers.push({ type: 'weapon', value: weaponBonus });
      modifiers.push({ type: 'armor', value: armorBonus });
    } else {
      // Fallback to old CombatStatsComponent strings
      const weaponBonus = this.getWeaponBonus(attackerStats.weapon);
      const armorBonus = this.getArmorBonus(attackerStats.armor);
      attackerPower += weaponBonus + armorBonus;
    }

    // Defender equipment bonuses (scaled down to 40% to balance with skill)
    if (defenderEquipment) {
      const defenderWeaponBonus = this.getEquipmentWeaponBonus(defenderEquipment) * 0.4;
      const defenderArmorBonus = this.getEquipmentDefenseBonus(defenderEquipment) * 0.4;
      defenderPower += defenderWeaponBonus + defenderArmorBonus;
    } else {
      // Fallback to old CombatStatsComponent strings
      const defenderWeaponBonus = this.getWeaponBonus(defenderStats.weapon);
      const defenderArmorBonus = this.getArmorBonus(defenderStats.armor);
      defenderPower += defenderWeaponBonus + defenderArmorBonus;
    }

    // Surprise modifier
    if (conflict.surprise) {
      const surpriseBonus = 3;
      attackerPower += surpriseBonus;
      modifiers.push({ type: 'surprise', value: surpriseBonus });
    }

    // Terrain modifier
    const envEntities = world.query().with('environment').executeEntities();
    if (envEntities.length > 0) {
      const firstEnvEntity = envEntities[0];
      if (firstEnvEntity) {
        const env = world.getComponent<EnvironmentComponent>(firstEnvEntity.id, 'environment');
        if (env?.terrain) {
          const terrainMod = this.getTerrainModifier(env.terrain);
          attackerPower += terrainMod;
          modifiers.push({ type: 'terrain', value: terrainMod });
        }
      }
    }

    // Injury penalties
    if (world.hasComponent(attacker.id, 'injury')) {
      const injury = world.getComponent<InjuryComponent>(attacker.id, 'injury');
      if (injury?.skillPenalties?.combat) {
        attackerPower += injury.skillPenalties.combat;
        modifiers.push({ type: 'injury', value: injury.skillPenalties.combat });
      }
    }

    return { attackerPower, defenderPower, modifiers };
  }

  private getWeaponBonus(weapon?: string | null): number {
    if (!weapon) return 0;
    switch (weapon) {
      case 'sword': return 3;
      case 'spear': return 2;
      case 'axe': return 2;
      case 'club': return 1;
      default: return 0;
    }
  }

  private getArmorBonus(armor?: string | null): number {
    if (!armor) return 0;
    switch (armor) {
      case 'chainmail': return 2;
      case 'leather': return 1;
      case 'plate': return 3;
      default: return 0;
    }
  }

  /**
   * Get weapon attack bonus from EquipmentComponent.
   * Returns weapon damage value or 0 if no weapon equipped.
   */
  private getEquipmentWeaponBonus(equipment: EquipmentComponent): number {
    const mainHandSlot = equipment.weapons.mainHand;
    if (!mainHandSlot) return 0;

    const weapon = itemRegistry.tryGet(mainHandSlot.itemId);
    if (!weapon?.traits?.weapon) return 0;

    return weapon.traits.weapon.damage;
  }

  /**
   * Get defense bonus from EquipmentComponent.
   * Uses cached totalDefense from EquipmentSystem.
   */
  private getEquipmentDefenseBonus(equipment: EquipmentComponent): number {
    // EquipmentSystem caches total defense for performance
    return equipment.cached?.totalDefense ?? 0;
  }

  private getTerrainModifier(terrain: string): number {
    switch (terrain) {
      case 'forest': return 1; // Cover advantage
      case 'plains': return 0;
      case 'mountains': return -1; // Difficult footing
      default: return 0;
    }
  }

  private rollOutcome(
    world: World,
    attacker: Entity,
    defender: Entity,
    attackerPower: number,
    defenderPower: number,
    lethal?: boolean
  ): ConflictComponent['outcome'] {
    const powerDiff = attackerPower - defenderPower;

    // Use sigmoid for smooth probability curve with diminishing returns
    // k=0.2 gives ~5% change per point near 50/50, with diminishing returns at extremes
    // Uses pre-calculated lookup table for performance (~10x faster than Math.exp)
    let attackerChance = this.getSigmoid(powerDiff);

    // Apply destiny luck modifiers (Phase 36: Hero Protection)
    const attackerLuck = this.getDestinyLuckModifier(world, attacker.id);
    const defenderLuck = this.getDestinyLuckModifier(world, defender.id);

    if (attackerLuck !== 0 || defenderLuck !== 0) {
      attackerChance += attackerLuck - defenderLuck;

      // Explicit bounds at 5%-95% (game design: never 100% certain outcomes)
      if (attackerChance > 0.95) {
        attackerChance = 0.95;
      } else if (attackerChance < 0.05) {
        attackerChance = 0.05;
      }

      // Note: Destiny intervention event emission would go here, but ctx is not available
      // in rollOutcome method. Event emission handled at higher level in resolveCombat.
    }

    const roll = Math.random();

    if (lethal) {
      // Lethal combat - death is possible
      if (roll < attackerChance * 0.7) {
        return 'attacker_victory'; // Could lead to death
      } else if (roll < attackerChance * 0.85) {
        return 'defender_victory';
      } else if (roll < 0.95) {
        return 'mutual_injury';
      } else {
        return 'death'; // Mutual death
      }
    } else {
      // Non-lethal combat
      if (roll < attackerChance) {
        return 'attacker_victory';
      } else if (roll < attackerChance + 0.3) {
        return 'defender_victory';
      } else if (roll < 0.9) {
        return 'mutual_injury';
      } else {
        return 'stalemate';
      }
    }
  }

  private applyInjuries(
    world: World,
    attacker: Entity,
    defender: Entity,
    outcome: ConflictComponent['outcome'],
    attackerPower: number,
    defenderPower: number
  ): void {
    const attackerImpl = attacker as EntityImpl;
    const defenderImpl = defender as EntityImpl;
    const powerDiff = Math.abs(attackerPower - defenderPower);

    // Check for destiny protection against instant death (Phase 36: Hero Protection)
    // Normally: power difference >20 = instant death
    // With destiny: death threshold increases by (destinyLuck × 50)
    const applyDeathProtection = (entity: Entity, entityPower: number, opponentPower: number): boolean => {
      const diff = Math.abs(opponentPower - entityPower);

      if (diff > 20) {
        const destinyLuck = this.getDestinyLuckModifier(world, entity.id);

        if (destinyLuck > 0) {
          // Positive destiny luck provides death resistance
          // +0.1 luck = need 25 power diff for instant death
          // +0.2 luck = need 30 power diff for instant death
          const deathThreshold = 20 + (destinyLuck * 50);

          if (diff < deathThreshold) {
            // Destiny saved them from instant death!
            // Apply severe injury instead
            const entityImpl = entity as EntityImpl;
            this.inflictInjury(entityImpl, diff);

            // Emit destiny intervention event - note: this won't work outside update() call
            // since ctx is not available in resolveCombat when called from outside update
            // For now, skip event emission in this rare case

            return true; // Protected from death
          }
        }
      }

      return false; // No protection
    };

    switch (outcome) {
      case 'attacker_victory':
        // Check if defender protected from instant death
        if (!applyDeathProtection(defender, defenderPower, attackerPower)) {
          // Defender injured (or dies if power diff too high)
          this.inflictInjury(defenderImpl, powerDiff);
        }
        break;

      case 'defender_victory':
        // Check if attacker protected from instant death
        if (!applyDeathProtection(attacker, attackerPower, defenderPower)) {
          // Attacker injured (or dies if power diff too high)
          this.inflictInjury(attackerImpl, powerDiff);
        }
        break;

      case 'mutual_injury':
        // Both injured (destiny protection doesn't apply to mutual injury)
        this.inflictInjury(attackerImpl, powerDiff * 0.5);
        this.inflictInjury(defenderImpl, powerDiff * 0.5);
        break;

      case 'stalemate':
        // No injuries
        break;

      case 'death':
        // Both die (destiny protection doesn't apply to mutual death)
        if (world.hasComponent(attacker.id, 'needs')) {
          attackerImpl.updateComponent<NeedsComponent>('needs', (needs) => {
            const updated = needs.clone();
            updated.health = 0;
            return updated;
          });
        }
        if (world.hasComponent(defender.id, 'needs')) {
          defenderImpl.updateComponent<NeedsComponent>('needs', (needs) => {
            const updated = needs.clone();
            updated.health = 0;
            return updated;
          });
        }
        break;
    }
  }

  private inflictInjury(entity: EntityImpl, powerDiff: number): void {
    const severity: InjuryComponent['severity'] =
      powerDiff > 5 ? 'critical' :
      powerDiff > 2 ? 'major' :
      'minor';

    const locations: Array<InjuryComponent['location']> = ['head', 'torso', 'arms', 'legs'];
    const location = locations[Math.floor(Math.random() * locations.length)]!;

    const types: Array<InjuryComponent['injuryType']> = ['laceration', 'puncture', 'blunt'];
    const type = types[Math.floor(Math.random() * types.length)]!;

    const injury = createInjuryComponent({
      injuryType: type,
      severity,
      location,
    });

    entity.addComponent(injury);
  }

  private async generateNarrative(
    world: World,
    attacker: Entity,
    defender: Entity,
    conflict: ConflictComponent,
    outcome: ConflictComponent['outcome']
  ): Promise<void> {
    if (!this.llmProvider) return;

    const attackerAgent = world.getComponent<AgentComponent>(attacker.id, 'agent');
    const defenderAgent = world.getComponent<AgentComponent>(defender.id, 'agent');

    // Find witnesses
    const attackerPos = world.getComponent<PositionComponent>(attacker.id, 'position');
    const witnesses: Array<{ id: string; name: string }> = [];

    if (attackerPos) {
      const nearbyEntities = world.query()
        .with('agent')
        .with('position')
        .executeEntities();

      for (const entity of nearbyEntities) {
        if (entity.id === attacker.id || entity.id === defender.id) continue;

        const pos = world.getComponent<PositionComponent>(entity.id, 'position');
        if (pos) {
          const dx = pos.x - attackerPos.x;
          const dy = pos.y - attackerPos.y;
          const distanceSquared = dx * dx + dy * dy;

          if (distanceSquared < 20 * 20) {
            const agent = world.getComponent<AgentComponent>(entity.id, 'agent');
            witnesses.push({
              id: entity.id,
              name: agent?.name || entity.id,
            });
          }
        }
      }
    }

    try {
      await this.llmProvider.generateNarrative({
        type: 'agent_combat',
        attacker: {
          id: attacker.id,
          name: attackerAgent?.name || 'Attacker',
        },
        defender: {
          id: defender.id,
          name: defenderAgent?.name || 'Defender',
        },
        cause: conflict.cause,
        outcome,
        witnesses,
      });
    } catch (error) {
      console.error('[AgentCombatSystem] LLM narrative generation failed:', error);
    }
  }

  private applySocialConsequences(
    world: World,
    attacker: Entity,
    defender: Entity,
    conflict: ConflictComponent,
    outcome: ConflictComponent['outcome']
  ): void {
    const attackerImpl = attacker as EntityImpl;
    const defenderImpl = defender as EntityImpl;

    // Find witnesses
    const attackerPos = world.getComponent<PositionComponent>(attacker.id, 'position');
    if (!attackerPos) return;

    const nearbyEntities = world.query()
      .with('agent')
      .with('position')
      .with('relationship')
      .executeEntities();

    for (const witness of nearbyEntities) {
      if (witness.id === attacker.id || witness.id === defender.id) continue;

      const pos = world.getComponent<PositionComponent>(witness.id, 'position');
      if (!pos) continue;

      const dx = pos.x - attackerPos.x;
      const dy = pos.y - attackerPos.y;
      const distanceSquared = dx * dx + dy * dy;

      if (distanceSquared < 20 * 20) {
        const witnessImpl = witness as EntityImpl;

        // Judge the attacker based on cause
        const isJustCause = ['defense', 'honor_duel'].includes(conflict.cause || '');
        const opinionChange = isJustCause ? -10 : -30;

        witnessImpl.updateComponent<RelationshipComponent>('relationship', (rel) => ({
          ...rel,
          relationships: {
            ...rel.relationships,
            [attacker.id]: {
              opinion: opinionChange,
              trust: opinionChange * 0.5,
            },
          },
        }));
      }
    }

    // Update reputation
    if (world.hasComponent(attacker.id, 'reputation')) {
      attackerImpl.updateComponent<ReputationComponent>('reputation', (rep) => {
        const honorChange = conflict.cause === 'honor_duel' && outcome === 'attacker_victory' ? 10 : -5;
        return {
          ...rep,
          honor: rep.honor + honorChange,
          violence: rep.violence + 5,
        };
      });
    }

    // Update relationships between combatants
    if (world.hasComponent(attacker.id, 'relationship')) {
      attackerImpl.updateComponent<RelationshipComponent>('relationship', (rel) => {
        const existing = rel.relationships[defender.id] || { opinion: 0, trust: 0 };
        return {
          ...rel,
          relationships: {
            ...rel.relationships,
            [defender.id]: {
              opinion: existing.opinion - 20,
              trust: (existing.trust || 0) - 30,
            },
          },
        };
      });
    }

    if (world.hasComponent(defender.id, 'relationship')) {
      defenderImpl.updateComponent<RelationshipComponent>('relationship', (rel) => {
        const existing = rel.relationships[attacker.id] || { opinion: 0, trust: 0 };
        return {
          ...rel,
          relationships: {
            ...rel.relationships,
            [attacker.id]: {
              opinion: existing.opinion - 20,
              trust: (existing.trust || 0) - 30,
            },
          },
        };
      });
    }
  }

  private applyLegalConsequences(
    world: World,
    attacker: Entity,
    conflict: ConflictComponent
  ): void {
    // Check if laws exist
    const lawEntities = world.query().with('laws').executeEntities();
    if (lawEntities.length === 0) return;

    const firstLawEntity = lawEntities[0];
    if (!firstLawEntity) return;

    const laws = world.getComponent<LawsComponent>(firstLawEntity.id, 'laws');
    if (!laws) return;

    // Skip if self-defense
    if (conflict.cause === 'defense' && laws.selfDefenseLegal) {
      return;
    }

    // Check if assault is illegal
    if (laws.assaultIllegal) {
      const attackerImpl = attacker as EntityImpl;

      const legalStatus: any = {
        type: 'legal_status',
        crime: 'assault',
        wanted: true,
      };

      attackerImpl.addComponent(legalStatus);
    }
  }

  /**
   * Calculate destiny luck modifier for combat rolls (Phase 36: Hero Protection).
   * Returns a modifier to combat rolls (-0.2 to +0.2).
   *
   * Heroes with destiny get luck modifiers based on:
   * - Has destiny? If `destiny` field is set
   * - Destiny fulfilled? Protection fades after `destinyRealized = true`
   * - Cosmic alignment: Multiplies luck (blessed souls get more protection)
   *
   * Examples:
   * - Blessed hero (alignment +0.8, has destiny): +0.08 luck (8% to rolls)
   * - Neutral hero (alignment 0, has destiny): 0 luck
   * - Cursed soul (alignment -1.0, has destiny): -0.10 luck (anti-luck!)
   */
  private getDestinyLuckModifier(world: World, agentId: string): number {
    // Get soul link
    if (!world.hasComponent(agentId, 'soul_link')) {
      return 0;
    }

    const soulLink = world.getComponent<SoulLinkComponent>(agentId, 'soul_link');
    if (!soulLink?.soulEntityId) {
      return 0;
    }

    // Get soul identity
    if (!world.hasComponent(soulLink.soulEntityId, 'soul_identity')) {
      return 0;
    }

    const soulIdentity = world.getComponent<SoulIdentityComponent>(
      soulLink.soulEntityId,
      'soul_identity'
    );

    if (!soulIdentity) {
      return 0;
    }

    // No protection if destiny is fulfilled
    if (soulIdentity.destinyRealized) {
      return 0;
    }

    // No protection if no destiny
    if (!soulIdentity.destiny) {
      return 0;
    }

    // Base luck from having a destiny: +10% to combat rolls
    let luckModifier = 0.10;

    // Multiply by cosmic alignment (-1 to +1)
    // Blessed souls (alignment +1.0): +10% luck
    // Neutral souls (alignment 0): +0% luck
    // Cursed souls (alignment -1.0): -10% luck (anti-luck!)
    luckModifier *= soulIdentity.cosmicAlignment;

    // Explicit saturation at ±20% (game balance limit)
    if (luckModifier > 0.2) {
      console.warn(`[Combat] Luck modifier ${luckModifier} exceeds cap, saturating to 0.2`);
      return 0.2;
    }
    if (luckModifier < -0.2) {
      console.warn(`[Combat] Luck modifier ${luckModifier} below floor, saturating to -0.2`);
      return -0.2;
    }

    return luckModifier;
  }

  protected onCleanup(): void {
    // Custom cleanup if needed
  }
}
