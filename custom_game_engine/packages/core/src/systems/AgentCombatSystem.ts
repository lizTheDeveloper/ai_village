import type { System } from '../ecs/System.js';
import type { SystemId, ComponentType } from '../types.js';
import type { World } from '../ecs/World.js';
import type { Entity } from '../ecs/Entity.js';
import { EntityImpl } from '../ecs/Entity.js';
import type { ConflictComponent } from '../components/ConflictComponent.js';
import type { CombatStatsComponent } from '../components/CombatStatsComponent.js';
import { createInjuryComponent, type InjuryComponent } from '../components/InjuryComponent.js';

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

// interface LegalStatusComponent {
//   type: 'legal_status';
//   version: number;
//   crime: string;
//   wanted: boolean;
// }

interface LawsComponent {
  type: 'laws';
  version: number;
  murderIllegal?: boolean;
  assaultIllegal?: boolean;
  selfDefenseLegal?: boolean;
}

interface LLMProvider {
  generateNarrative(prompt: any): Promise<{ narrative: string; memorable_details?: string[] }>;
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
interface EventBus {
  emit(event: string, data: any): void;
  on(event: string, handler: (data: any) => void): void;
}

export class AgentCombatSystem implements System {
  public readonly id: SystemId = 'agent_combat';
  public readonly priority = 46; // After hunting, before injury
  public readonly requiredComponents: ReadonlyArray<ComponentType> = ['conflict'];

  private llmProvider?: LLMProvider;
  private eventBus?: EventBus;

  constructor(llmProvider?: LLMProvider, eventBus?: EventBus) {
    this.llmProvider = llmProvider;
    this.eventBus = eventBus;
  }

  update(world: World, entities: ReadonlyArray<Entity>, _deltaTime: number): void {
    for (const entity of entities) {
      const conflict = world.getComponent<ConflictComponent>(entity.id, 'conflict');
      if (!conflict || conflict.conflictType !== 'agent_combat') {
        continue;
      }

      if (conflict.state === 'initiated') {
        // Emit combat:started event
        if (this.eventBus) {
          this.eventBus.emit('combat:started', {
            attackerId: entity.id,
            defenderId: conflict.target,
            cause: conflict.cause,
            startTime: conflict.startTime,
          });
        }

        this.processCombat(world, entity, conflict);
      }
    }
  }

  private processCombat(world: World, attacker: Entity, conflict: ConflictComponent): void {
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
    const outcome = this.rollOutcome(attackerPower, defenderPower, conflict.lethal);

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
    if (this.eventBus) {
      this.eventBus.emit('combat:ended', {
        attackerId: attacker.id,
        defenderId: defender.id,
        outcome,
        attackerPower,
        defenderPower,
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

    // Base power from combat skill
    let attackerPower = attackerStats.combatSkill;
    let defenderPower = defenderStats.combatSkill;

    // Equipment bonuses
    const weaponBonus = this.getWeaponBonus(attackerStats.weapon);
    const armorBonus = this.getArmorBonus(attackerStats.armor);
    attackerPower += weaponBonus + armorBonus;

    const defenderWeaponBonus = this.getWeaponBonus(defenderStats.weapon);
    const defenderArmorBonus = this.getArmorBonus(defenderStats.armor);
    defenderPower += defenderWeaponBonus + defenderArmorBonus;

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
        const env = world.getComponent(firstEnvEntity.id, 'environment') as any;
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

  private getTerrainModifier(terrain: string): number {
    switch (terrain) {
      case 'forest': return 1; // Cover advantage
      case 'plains': return 0;
      case 'mountains': return -1; // Difficult footing
      default: return 0;
    }
  }

  private rollOutcome(
    attackerPower: number,
    defenderPower: number,
    lethal?: boolean
  ): ConflictComponent['outcome'] {
    const powerDiff = attackerPower - defenderPower;
    const roll = Math.random() * 20;

    // Adjust probabilities based on power difference
    const attackerChance = 0.5 + (powerDiff * 0.05); // Each point of power diff = 5% swing
    const adjustedRoll = roll / 20; // Normalize to 0-1

    if (lethal) {
      // Lethal combat - death is possible
      if (adjustedRoll < attackerChance * 0.7) {
        return 'attacker_victory'; // Could lead to death
      } else if (adjustedRoll < attackerChance * 0.85) {
        return 'defender_victory';
      } else if (adjustedRoll < 0.95) {
        return 'mutual_injury';
      } else {
        return 'death'; // Mutual death
      }
    } else {
      // Non-lethal combat
      if (adjustedRoll < attackerChance) {
        return 'attacker_victory';
      } else if (adjustedRoll < attackerChance + 0.3) {
        return 'defender_victory';
      } else if (adjustedRoll < 0.9) {
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

    switch (outcome) {
      case 'attacker_victory':
        // Defender injured
        this.inflictInjury(defenderImpl, powerDiff);
        break;

      case 'defender_victory':
        // Attacker injured
        this.inflictInjury(attackerImpl, powerDiff);
        break;

      case 'mutual_injury':
        // Both injured
        this.inflictInjury(attackerImpl, powerDiff * 0.5);
        this.inflictInjury(defenderImpl, powerDiff * 0.5);
        break;

      case 'stalemate':
        // No injuries
        break;

      case 'death':
        // Both die
        if (world.hasComponent(attacker.id, 'needs')) {
          attackerImpl.updateComponent('needs' as any, (needs: any) => {
            if (typeof needs.clone === 'function') {
              const updated = needs.clone();
              updated.health = 0;
              return updated;
            }
            return { ...needs, health: 0 };
          });
        }
        if (world.hasComponent(defender.id, 'needs')) {
          defenderImpl.updateComponent('needs' as any, (needs: any) => {
            if (typeof needs.clone === 'function') {
              const updated = needs.clone();
              updated.health = 0;
              return updated;
            }
            return { ...needs, health: 0 };
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
          const distance = Math.sqrt(
            Math.pow(pos.x - attackerPos.x, 2) +
            Math.pow(pos.y - attackerPos.y, 2)
          );

          if (distance < 20) {
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

      const distance = Math.sqrt(
        Math.pow(pos.x - attackerPos.x, 2) +
        Math.pow(pos.y - attackerPos.y, 2)
      );

      if (distance < 20) {
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
}
