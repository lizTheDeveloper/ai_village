/**
 * BodySystem - Manages body parts, injuries, healing, and magic modifications
 *
 * Responsibilities:
 * - Process bleeding damage from injuries
 * - Natural healing over time
 * - Infection progression
 * - Consciousness checks
 * - Vital part death checks
 * - Pain → stress integration
 * - Magic modification duration tracking
 */

import type { System } from '../ecs/System.js';
import type { World } from '../ecs/World.js';
import type { Entity } from '../ecs/Entity.js';
import type { SystemId } from '../types.js';
import { ComponentType } from '../types/ComponentType.js';
import type {
  BodyComponent,
  BodyPart,
  Injury,
} from '../components/BodyComponent.js';
import {
  calculateTotalPain,
  calculateOverallHealth,
  hasDestroyedVitalParts,
} from '../components/BodyComponent.js';
import type { NeedsComponent } from '../components/NeedsComponent.js';
import type { MoodComponent } from '../components/MoodComponent.js';
import type { AnimalComponent } from '../components/AnimalComponent.js';

export class BodySystem implements System {
  public readonly id: SystemId = 'body';
  public readonly priority: number = 13; // After NeedsSystem (15), before AI
  public readonly requiredComponents: ReadonlyArray<ComponentType> = [ComponentType.Body];

  update(world: World, entities: ReadonlyArray<Entity>, deltaTime: number): void {
    for (const entity of entities) {
      const body = entity.components.get('body') as BodyComponent;
      if (!body) continue;

      // 1. Process bleeding from injuries
      this.processBleedingDamage(entity, body, deltaTime);

      // 2. Natural healing over time
      this.processNaturalHealing(entity, body, deltaTime);

      // 3. Infection progression
      this.processInfections(entity, body, deltaTime, world);

      // 4. Update derived stats
      this.updateDerivedStats(entity, body);

      // 5. Check consciousness
      this.checkConsciousness(entity, body, world);

      // 6. Check vital part destruction (death)
      this.checkVitalParts(entity, body, world);

      // 7. Apply pain to stress
      this.applyPainToStress(entity, body);

      // 8. Process temporary modifications (magic duration)
      this.processModifications(entity, body, world.tick, world);
    }
  }

  // ==========================================================================
  // Bleeding
  // ==========================================================================

  private processBleedingDamage(
    entity: Entity,
    body: BodyComponent,
    deltaTime: number
  ): void {
    let totalBleedRate = 0;

    for (const part of Object.values(body.parts)) {
      for (const injury of part.injuries) {
        // Bandaging stops bleeding
        if (!part.bandaged && injury.bleedRate > 0) {
          totalBleedRate += injury.bleedRate;
        }
      }
    }

    // Apply blood loss
    if (totalBleedRate > 0) {
      body.bloodLoss = Math.min(100, body.bloodLoss + totalBleedRate * deltaTime);

      // Blood loss affects overall health
      if (body.bloodLoss > 50) {
        const needs = entity.components.get('needs') as NeedsComponent;
        if (needs) {
          // Start taking health damage from blood loss
          const bleedDamage = (body.bloodLoss - 50) * 0.02 * deltaTime;
          needs.health = Math.max(0, needs.health - bleedDamage);
        }
      }
    }

    // Natural blood recovery (when not bleeding)
    if (totalBleedRate === 0 && body.bloodLoss > 0) {
      body.bloodLoss = Math.max(0, body.bloodLoss - 0.5 * deltaTime);
    }
  }

  // ==========================================================================
  // Natural Healing
  // ==========================================================================

  private processNaturalHealing(
    entity: Entity,
    body: BodyComponent,
    deltaTime: number
  ): void {
    const needs = entity.components.get('needs') as NeedsComponent;
    const isResting = this.isAgentResting(entity);

    // Healing rate factors
    let healingMultiplier = 1.0;
    if (needs) {
      if (needs.hunger < 30) healingMultiplier *= 0.5;  // Hungry = slow healing
      if (needs.energy < 30) healingMultiplier *= 0.5;  // Tired = slow healing
    }
    if (isResting) healingMultiplier *= 2.0;           // Resting = faster healing
    if (body.bloodLoss > 30) healingMultiplier *= 0.5; // Blood loss = slow healing

    for (const part of Object.values(body.parts)) {
      // Infected parts don't heal naturally
      if (part.infected) continue;

      // Heal the part itself
      if (part.health < part.maxHealth) {
        const baseHealRate = 0.1;  // HP per second
        const healAmount = baseHealRate * healingMultiplier * deltaTime;
        part.health = Math.min(part.maxHealth, part.health + healAmount);
      }

      // Process injury healing
      for (let i = part.injuries.length - 1; i >= 0; i--) {
        const injury = part.injuries[i];
        if (!injury) continue;

        // Base healing: 1% per in-game hour
        const baseHealRate = 1.0 / 3600; // Per second
        injury.healingProgress += baseHealRate * healingMultiplier * deltaTime * 100;

        // Fully healed injuries are removed
        if (injury.healingProgress >= 100) {
          part.injuries.splice(i, 1);

          // Restore some part health based on injury severity
          const healthRestore = this.getHealthRestoreFromHealing(injury);
          part.health = Math.min(part.maxHealth, part.health + healthRestore);
        }
      }
    }
  }

  private getHealthRestoreFromHealing(injury: Injury): number {
    switch (injury.severity) {
      case 'minor': return 5;
      case 'moderate': return 15;
      case 'severe': return 35;
      case 'critical': return 60;
    }
  }

  private isAgentResting(entity: Entity): boolean {
    // Check if agent is sleeping or idle
    const needs = entity.components.get('needs') as NeedsComponent;
    return needs ? needs.energy < 20 : false;  // Simplified check
  }

  // ==========================================================================
  // Infections
  // ==========================================================================

  private processInfections(
    __entity: Entity,
    body: BodyComponent,
    deltaTime: number,
    __world: World
  ): void {
    for (const part of Object.values(body.parts)) {
      if (part.infected) {
        // Infection causes pain
        // (already handled in pain calculation)

        // Infection spreads if untreated
        // TODO: Implement infection spreading logic
      } else {
        // Check if any untreated wounds might get infected
        const hasUntreatedWounds = part.injuries.some(
          inj => !inj.treatedBy && inj.type === 'puncture' && !part.bandaged
        );

        if (hasUntreatedWounds) {
          // Small chance of infection per tick
          const infectionChance = 0.0001 * deltaTime;
          if (Math.random() < infectionChance) {
            part.infected = true;
          }
        }
      }
    }
  }

  // ==========================================================================
  // Derived Stats
  // ==========================================================================

  private updateDerivedStats(_entity: Entity, body: BodyComponent): void {
    body.totalPain = calculateTotalPain(body);
    body.overallHealth = calculateOverallHealth(body);
  }

  // ==========================================================================
  // Consciousness
  // ==========================================================================

  private checkConsciousness(
    entity: Entity,
    body: BodyComponent,
    world: World
  ): void {
    const wasConscious = body.consciousness;

    // Lose consciousness if:
    // - Head critically damaged
    // - Blood loss > 80%
    // - Total pain > 95

    const headPart = Object.values(body.parts).find(p => p.type === 'head');
    const headCritical = headPart && headPart.health < headPart.maxHealth * 0.2;

    if (headCritical || body.bloodLoss > 80 || body.totalPain > 95) {
      body.consciousness = false;
    } else if (body.bloodLoss < 60 && body.totalPain < 80) {
      // Regain consciousness if conditions improve
      body.consciousness = true;
    }

    // Event when consciousness changes
    if (wasConscious && !body.consciousness) {
      world.eventBus.emit({
        type: 'agent:unconscious',
        source: 'system',
        data: { entityId: entity.id },
      });
    } else if (!wasConscious && body.consciousness) {
      world.eventBus.emit({
        type: 'agent:regained_consciousness',
        source: 'system',
        data: { entityId: entity.id },
      });
    }
  }

  // ==========================================================================
  // Vital Parts & Death
  // ==========================================================================

  private checkVitalParts(
    entity: Entity,
    body: BodyComponent,
    world: World
  ): void {
    if (hasDestroyedVitalParts(body)) {
      // Vital part destroyed → death
      // Emit event for now, actual death handled elsewhere
      world.eventBus.emit({
        type: 'combat:death',
        source: 'system',
        data: {
          entityId: entity.id,
          cause: 'vital_part_destroyed',
        },
      });
    }
  }

  // ==========================================================================
  // Pain → Stress Integration
  // ==========================================================================

  private applyPainToStress(entity: Entity, body: BodyComponent): void {
    const mood = entity.components.get('mood') as MoodComponent;
    const totalPain = body.totalPain;

    if (mood) {
      // Pain reduces physical satisfaction factor
      mood.factors.physical = Math.max(-100, mood.factors.physical - totalPain * 0.5);
    }

    // For animals (AnimalComponent has stress directly)
    const animal = entity.components.get('animal') as AnimalComponent;
    if (animal) {
      // Pain increases stress
      animal.stress = Math.min(100, animal.stress + totalPain * 0.1);
    }
  }

  // ==========================================================================
  // Magic Modification Duration
  // ==========================================================================

  private processModifications(
    entity: Entity,
    body: BodyComponent,
    currentTick: number,
    world: World
  ): void {
    // Remove expired global modifications
    const expiredGlobal: string[] = [];
    for (let i = body.modifications.length - 1; i >= 0; i--) {
      const mod = body.modifications[i];
      if (!mod) continue;
      if (!mod.permanent && mod.duration) {
        const elapsed = currentTick - mod.createdAt;
        if (elapsed >= mod.duration) {
          expiredGlobal.push(mod.id);
          body.modifications.splice(i, 1);

          // Reverse modification effects
          this.reverseGlobalModification(body, mod);
        }
      }
    }

    // Remove expired part-specific modifications
    for (const part of Object.values(body.parts)) {
      for (let i = part.modifications.length - 1; i >= 0; i--) {
        const mod = part.modifications[i];
        if (!mod) continue;
        if (!mod.permanent && mod.duration) {
          const elapsed = currentTick - mod.createdAt;
          if (elapsed >= mod.duration) {
            part.modifications.splice(i, 1);

            // Reverse modification effects
            this.reversePartModification(part, mod);
          }
        }
      }
    }

    // Emit event if any modifications expired
    if (expiredGlobal.length > 0) {
      world.eventBus.emit({
        type: 'body:modifications_expired',
        source: 'system',
        data: {
          entityId: entity.id,
          modificationIds: expiredGlobal,
        },
      });
    }
  }

  private reverseGlobalModification(
    body: BodyComponent,
    mod: BodyComponent['modifications'][0]
  ): void {
    if (mod.effects.partTypeAdded) {
      // Remove added parts
      const { type, count } = mod.effects.partTypeAdded;
      const partsToRemove = Object.entries(body.parts)
        .filter(([_, part]) => part.type === type)
        .slice(0, count)
        .map(([id]) => id);

      for (const partId of partsToRemove) {
        delete body.parts[partId];
      }
    }

    if (mod.effects.partTypeRemoved) {
      // Cannot easily reverse removal - would need to regenerate parts
      // This is a limitation of temporary modifications that remove parts
    }
  }

  private reversePartModification(
    part: BodyPart,
    mod: BodyPart['modifications'][0]
  ): void {
    if (mod.effects.healthModifier) {
      part.maxHealth -= mod.effects.healthModifier;
      part.health = Math.min(part.health, part.maxHealth);
    }

    if (mod.effects.functionsAdded) {
      part.functions = part.functions.filter(
        f => !mod.effects.functionsAdded?.includes(f)
      );
    }

    if (mod.effects.functionsRemoved) {
      // Re-add removed functions
      for (const func of mod.effects.functionsRemoved) {
        if (!part.functions.includes(func)) {
          part.functions.push(func);
        }
      }
    }
  }
}
