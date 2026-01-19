import type { SystemId, ComponentType } from '../types.js';
import type { World } from '../ecs/World.js';
import type { Entity } from '../ecs/Entity.js';
import { EntityImpl } from '../ecs/Entity.js';
import type { InjuryComponent } from '../components/InjuryComponent.js';
import type { CombatStatsComponent } from '../components/CombatStatsComponent.js';
import { NeedsComponent } from '../components/NeedsComponent.js';
import { BaseSystem, type SystemContext } from '../ecs/SystemContext.js';

interface MovementComponent {
  type: 'movement';
  version: number;
  baseSpeed: number;
  currentSpeed: number;
  penalty?: number;
}

interface EpisodicMemoryComponent {
  type: 'episodic_memory';
  version: number;
  canFormMemories?: boolean;
}

/**
 * InjurySystem - Handles injury effects and healing
 *
 * Implements REQ-CON-008 and REQ-CON-009:
 * - Applies skill penalties based on injury type and location
 * - Applies movement penalties for leg/foot injuries
 * - Modifies needs (hunger, energy) based on injuries
 * - Handles healing over time
 * - Requires treatment for major/critical injuries
 */
export class InjurySystem extends BaseSystem {
  public readonly id: SystemId = 'injury';
  public readonly priority = 25; // After combat, before movement
  public readonly requiredComponents: ReadonlyArray<ComponentType> = ['injury'];
  // Only run when injury components exist (O(1) activation check)
  public readonly activationComponents = ['injury'] as const;
  protected readonly throttleInterval = 10; // FAST - 0.5 seconds

  protected onUpdate(ctx: SystemContext): void {
    for (const entity of ctx.activeEntities) {
      const world = ctx.world;
      const deltaTime = ctx.deltaTime;
      const comps = ctx.components(entity);
      const injury = comps.optional<InjuryComponent>('injury');
      if (!injury) continue;

      // Validate injury
      this.validateInjury(injury);

      // Initialize injury fields if not set
      if (injury.requiresTreatment === undefined || injury.healingTime === undefined) {
        const entityImpl = entity as EntityImpl;
        entityImpl.updateComponent<InjuryComponent>('injury', (inj) => ({
          ...inj,
          requiresTreatment: inj.requiresTreatment !== undefined ? inj.requiresTreatment : (inj.severity === 'major' || inj.severity === 'critical'),
          treated: inj.treated || false,
          healingTime: inj.healingTime !== undefined ? inj.healingTime : this.calculateHealingTime(inj),
          elapsed: inj.elapsed || 0,
          untreatedDuration: inj.untreatedDuration || 0,
        }));
      }

      // Apply effects for primary injury
      this.applySkillPenalties(world, entity, injury);
      this.applyMovementPenalties(world, entity, injury);
      this.applyNeedsModifiers(world, entity, injury);
      this.handleMemoryEffects(world, entity, injury);

      // Apply effects for additional injuries in array
      if (injury.injuries && Array.isArray(injury.injuries)) {
        for (const additionalInjury of injury.injuries) {
          // Create a temporary injury component for processing
          const tempInjury: InjuryComponent = {
            type: 'injury',
            version: 1,
            injuryType: additionalInjury.injuryType,
            severity: additionalInjury.severity,
            location: additionalInjury.location,
          };
          this.applySkillPenalties(world, entity, tempInjury);
          this.applyMovementPenalties(world, entity, tempInjury);
          this.applyNeedsModifiers(world, entity, tempInjury);
        }
      }

      // Handle healing
      this.handleHealing(world, entity, injury, deltaTime);
    }
  }

  private validateInjury(injury: InjuryComponent): void {
    const validTypes = ['laceration', 'puncture', 'blunt', 'burn', 'bite', 'exhaustion', 'psychological'];
    const validSeverities = ['minor', 'major', 'critical'];
    const validLocations = ['head', 'torso', 'arms', 'legs', 'hands', 'feet'];

    // Handle both proper InjuryComponent (has injuryType) and raw test data (has type instead)
    // The 'type' field in raw data represents the injury type (not the component type)
    const injuryType = 'injuryType' in injury ? injury.injuryType : 'type' in injury ? (injury as { type: string }).type : undefined;
    const severity = injury.severity;
    const location = injury.location;

    if (!injuryType || !validTypes.includes(injuryType)) {
      throw new Error(`Invalid injury type: ${injuryType}`);
    }
    if (!severity || !validSeverities.includes(severity)) {
      throw new Error(`Invalid injury severity: ${severity}`);
    }
    if (!location || !validLocations.includes(location)) {
      throw new Error(`Invalid injury location: ${location}`);
    }
  }

  private applySkillPenalties(world: World, entity: Entity, injury: InjuryComponent): void {
    if (!world.hasComponent(entity.id, 'combat_stats')) return;

    const entityImpl = entity as EntityImpl;
    const severityPenalty = injury.severity === 'minor' ? -1 : injury.severity === 'major' ? -2 : -3;

    entityImpl.updateComponent<CombatStatsComponent>('combat_stats', (stats) => {
      const updated = { ...stats };

      // Location-specific penalties
      switch (injury.location) {
        case 'arms':
          updated.combatSkill = Math.max(0, stats.combatSkill + severityPenalty);
          if (stats.craftingSkill !== undefined) {
            updated.craftingSkill = Math.max(0, stats.craftingSkill + severityPenalty);
          }
          break;

        case 'hands':
          if (stats.craftingSkill !== undefined) {
            updated.craftingSkill = Math.max(0, stats.craftingSkill + severityPenalty * 2); // More severe
          }
          updated.combatSkill = Math.max(0, stats.combatSkill + severityPenalty);
          break;

        case 'head':
          // Head injuries affect all skills slightly
          updated.combatSkill = Math.max(0, stats.combatSkill + severityPenalty * 0.5);
          if (stats.socialSkill !== undefined) {
            updated.socialSkill = Math.max(0, stats.socialSkill + severityPenalty * 0.5);
          }
          break;
      }

      // Psychological injuries reduce social skill
      const injuryType = 'injuryType' in injury ? injury.injuryType : 'type' in injury ? (injury as { type: string }).type : undefined;
      if (injuryType === 'psychological' && stats.socialSkill !== undefined) {
        updated.socialSkill = Math.max(0, stats.socialSkill + severityPenalty * 2);
      }

      return updated;
    });
  }

  private applyMovementPenalties(world: World, entity: Entity, injury: InjuryComponent): void {
    if (!world.hasComponent(entity.id, 'movement')) return;
    if (injury.location !== 'legs' && injury.location !== 'feet') return;

    const entityImpl = entity as EntityImpl;
    const severityMultiplier = injury.severity === 'minor' ? 0.8 : injury.severity === 'major' ? 0.5 : 0.3;
    const footMultiplier = injury.location === 'feet' ? 0.5 : 1.0; // Foot injuries more severe

    entityImpl.updateComponent<MovementComponent>('movement', (movement) => {
      const penalty = movement.baseSpeed * (1 - severityMultiplier * footMultiplier);
      return {
        ...movement,
        currentSpeed: movement.baseSpeed - penalty,
        penalty,
      };
    });
  }

  private applyNeedsModifiers(world: World, entity: Entity, injury: InjuryComponent): void {
    if (!world.hasComponent(entity.id, 'needs')) return;

    const entityImpl = entity as EntityImpl;
    const needs = world.getComponent<NeedsComponent>(entity.id, 'needs');
    if (!needs) return;

    // Calculate rate multipliers based on injury
    let hungerRateMultiplier = 1.0;
    let energyRateMultiplier = 1.0;

    // Blood loss injuries increase hunger decay rate
    const injuryType = 'injuryType' in injury ? injury.injuryType : 'type' in injury ? (injury as { type: string }).type : undefined;
    if (injuryType === 'laceration' || injuryType === 'puncture') {
      hungerRateMultiplier = injury.severity === 'minor' ? 1.2 : injury.severity === 'major' ? 1.5 : 2.0;
    }

    // All injuries increase energy consumption
    energyRateMultiplier = injury.severity === 'minor' ? 1.1 : injury.severity === 'major' ? 1.3 : 1.5;

    // Update component with new rates
    entityImpl.updateComponent<NeedsComponent>('needs', (currentNeeds) => {
      // Handle both class instances (with clone method) and plain deserialized objects
      const updated = typeof currentNeeds.clone === 'function'
        ? currentNeeds.clone()
        : new NeedsComponent(currentNeeds);
      updated.hungerDecayRate = (currentNeeds.hungerDecayRate || 1.0) * hungerRateMultiplier;
      updated.energyDecayRate = (currentNeeds.energyDecayRate || 1.0) * energyRateMultiplier;
      return updated;
    });
  }

  private handleMemoryEffects(world: World, entity: Entity, injury: InjuryComponent): void {
    if (injury.location !== 'head') return;
    if (!world.hasComponent(entity.id, 'episodic_memory')) return;

    const entityImpl = entity as EntityImpl;

    entityImpl.updateComponent<EpisodicMemoryComponent>('episodic_memory', (memory) => ({
      ...memory,
      canFormMemories: injury.severity === 'critical' ? false : true,
    }));
  }

  private handleHealing(_world: World, entity: Entity, _injury: InjuryComponent, deltaTime: number): void {
    const entityImpl = entity as EntityImpl;

    // Update elapsed time
    entityImpl.updateComponent<InjuryComponent>('injury', (inj) => {
      const currentElapsed = inj.elapsed || 0;
      const newElapsed = currentElapsed + deltaTime;

      // Check if injury requires treatment
      if (inj.requiresTreatment && !inj.treated) {
        // Don't heal without treatment, but only increment untreatedDuration after first update
        const currentUntreated = inj.untreatedDuration || 0;
        return {
          ...inj,
          elapsed: newElapsed,
          untreatedDuration: currentElapsed > 0 ? currentUntreated + deltaTime : 0,
        };
      }

      // Check if healed
      const healingTime = inj.healingTime || this.calculateHealingTime(inj);
      if (newElapsed >= healingTime) {
        // Injury is healed - remove component
        entityImpl.removeComponent('injury');
        return inj; // Won't matter, component is being removed
      }

      return {
        ...inj,
        elapsed: newElapsed,
        healingTime,
      };
    });
  }

  private calculateHealingTime(injury: InjuryComponent): number {
    // Base healing time in ticks (20 TPS)
    const baseTime = injury.severity === 'minor' ? 1200 : // 1 minute
                     injury.severity === 'major' ? 6000 :  // 5 minutes
                     12000; // 10 minutes for critical

    // Type modifiers
    const injuryType = 'injuryType' in injury ? injury.injuryType : 'type' in injury ? (injury as { type: string }).type : undefined;
    const typeMultiplier = injuryType === 'burn' ? 1.5 :
                           injuryType === 'bite' ? 1.3 :
                           injuryType === 'psychological' ? 2.0 :
                           1.0;

    return baseTime * typeMultiplier;
  }
}
