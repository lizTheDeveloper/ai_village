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

import type { SystemId, ComponentType } from '../types.js';
import { ComponentType as CT } from '../types/ComponentType.js';
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
import type { StateMutatorSystem } from './StateMutatorSystem.js';
import { BaseSystem, type SystemContext, type ComponentAccessor } from '../ecs/SystemContext.js';

export class BodySystem extends BaseSystem {
  public readonly id: SystemId = 'body';
  public readonly priority: number = 13; // After NeedsSystem (15), before AI
  public readonly requiredComponents: ReadonlyArray<ComponentType> = [CT.Body];
  // Only run when body components exist (O(1) activation check)
  public readonly activationComponents = [CT.Body] as const;
  protected readonly throttleInterval = 100; // SLOW - 5 seconds

  /**
   * Systems that must run before this one.
   * @see StateMutatorSystem - handles batched blood loss/recovery and health damage
   */
  public readonly dependsOn = ['state_mutator'] as const;

  // StateMutatorSystem integration for batched blood loss and healing
  private stateMutator: StateMutatorSystem | null = null;
  private lastDeltaUpdateTick = 0;
  private readonly DELTA_UPDATE_INTERVAL = 1200; // 1 game minute at 20 TPS
  private deltaCleanups = new Map<string, {
    bloodLoss?: () => void;
    bloodRecovery?: () => void;
    healthDamage?: () => void;
  }>();
  private healingCleanups = new Map<string, {
    partHealing: Map<string, () => void>; // partId -> cleanup
    injuryHealing: Map<string, () => void>; // "partId:injuryIndex" -> cleanup
  }>();

  /**
   * Set the StateMutatorSystem reference (called during system registration)
   */
  setStateMutatorSystem(stateMutator: StateMutatorSystem): void {
    this.stateMutator = stateMutator;
  }

  protected onUpdate(ctx: SystemContext): void {
    if (!this.stateMutator) {
      throw new Error('[BodySystem] StateMutatorSystem not set - call setStateMutatorSystem() during initialization');
    }

    const currentTick = ctx.tick;
    const shouldUpdateDeltas = currentTick - this.lastDeltaUpdateTick >= this.DELTA_UPDATE_INTERVAL;

    for (const entity of ctx.activeEntities) {
      const comps = ctx.components(entity);
      const body = comps.optional<BodyComponent>(CT.Body);
      if (!body) continue;

      // Update blood loss/recovery and healing delta rates once per game minute
      if (shouldUpdateDeltas) {
        this.updateBloodLossDeltas(entity, body);
        this.updateHealingDeltas(entity, body, comps);
      }

      // 1. Natural healing over time (handles injury removal when fully healed)
      this.processNaturalHealing(entity, body, ctx.deltaTime);

      // 3. Infection progression
      this.processInfections(entity, body, ctx.deltaTime);

      // 4. Update derived stats
      this.updateDerivedStats(entity, body);

      // 5. Check consciousness
      this.checkConsciousness(entity, body, ctx.world);

      // 6. Check vital part destruction (death)
      this.checkVitalParts(entity, body, ctx.world);

      // 7. Apply pain to stress
      this.applyPainToStress(entity, body, comps);

      // 8. Process temporary modifications (magic duration)
      this.processModifications(entity, body, ctx.tick, ctx.world);
    }

    // Mark delta rates as updated
    if (shouldUpdateDeltas) {
      this.lastDeltaUpdateTick = currentTick;
    }
  }

  // ==========================================================================
  // Delta Registration (Blood Loss & Health Damage)
  // ==========================================================================

  /**
   * Update blood loss and health damage delta rates.
   * Called once per game minute to register/update delta rates with StateMutatorSystem.
   */
  private updateBloodLossDeltas(entity: any, body: BodyComponent): void {
    if (!this.stateMutator) {
      throw new Error('[BodySystem] StateMutatorSystem not set');
    }

    // Clean up old deltas
    if (this.deltaCleanups.has(entity.id)) {
      const cleanups = this.deltaCleanups.get(entity.id)!;
      cleanups.bloodLoss?.();
      cleanups.bloodRecovery?.();
      cleanups.healthDamage?.();
    }

    const cleanupFuncs: {
      bloodLoss?: () => void;
      bloodRecovery?: () => void;
      healthDamage?: () => void;
    } = {};

    // Calculate total bleed rate from all injuries
    let totalBleedRate = 0;
    for (const part of Object.values(body.parts)) {
      for (const injury of part.injuries) {
        // Bandaging stops bleeding
        if (!part.bandaged && injury.bleedRate > 0) {
          totalBleedRate += injury.bleedRate;
        }
      }
    }

    // Register blood loss or recovery delta
    if (totalBleedRate > 0) {
      // Bleeding: blood loss accumulates
      // Convert per-second rate to per-game-minute
      const bloodLossPerMinute = totalBleedRate * 60;

      cleanupFuncs.bloodLoss = this.stateMutator.registerDelta({
        entityId: entity.id,
        componentType: CT.Body,
        field: 'bloodLoss',
        deltaPerMinute: bloodLossPerMinute,
        min: 0,
        max: 100,
        source: 'body_blood_loss',
      });

      // If blood loss > 50, register health damage
      if (body.bloodLoss > 50) {
        // Health damage from blood loss: (bloodLoss - 50) * 0.02 per second
        // Convert to per-game-minute: (bloodLoss - 50) * 0.02 * 60
        const healthDamagePerMinute = -((body.bloodLoss - 50) * 0.02 * 60);

        cleanupFuncs.healthDamage = this.stateMutator.registerDelta({
          entityId: entity.id,
          componentType: CT.Needs,
          field: 'health',
          deltaPerMinute: healthDamagePerMinute,
          min: 0,
          max: 100,
          source: 'body_bleed_damage',
        });
      }
    } else if (body.bloodLoss > 0) {
      // Not bleeding: natural blood recovery
      // 0.5 per second → 30 per game minute
      const bloodRecoveryPerMinute = -(0.5 * 60);

      cleanupFuncs.bloodRecovery = this.stateMutator.registerDelta({
        entityId: entity.id,
        componentType: CT.Body,
        field: 'bloodLoss',
        deltaPerMinute: bloodRecoveryPerMinute,
        min: 0,
        max: 100,
        source: 'body_blood_recovery',
      });
    }

    // Store cleanup functions
    this.deltaCleanups.set(entity.id, cleanupFuncs);
  }

  /**
   * Update healing delta rates for body parts and injuries.
   * Called once per game minute to register/update delta rates with StateMutatorSystem.
   */
  private updateHealingDeltas(entity: any, body: BodyComponent, comps: ComponentAccessor): void {
    if (!this.stateMutator) {
      throw new Error('[BodySystem] StateMutatorSystem not set');
    }

    const needs = comps.optional<NeedsComponent>(CT.Needs);
    const isResting = needs ? needs.energy < 20 : false;

    // Calculate healing multiplier
    let healingMultiplier = 1.0;
    if (needs) {
      if (needs.hunger < 30) healingMultiplier *= 0.5;  // Hungry = slow healing
      if (needs.energy < 30) healingMultiplier *= 0.5;  // Tired = slow healing
    }
    if (isResting) healingMultiplier *= 2.0;           // Resting = faster healing
    if (body.bloodLoss > 30) healingMultiplier *= 0.5; // Blood loss = slow healing

    // Clean up old healing deltas
    if (this.healingCleanups.has(entity.id)) {
      const cleanups = this.healingCleanups.get(entity.id)!;
      for (const cleanup of cleanups.partHealing.values()) {
        cleanup();
      }
      for (const cleanup of cleanups.injuryHealing.values()) {
        cleanup();
      }
    }

    const partHealingCleanups = new Map<string, () => void>();
    const injuryHealingCleanups = new Map<string, () => void>();

    // Register healing deltas for each body part
    for (const [partId, part] of Object.entries(body.parts)) {
      // Infected parts don't heal naturally
      if (part.infected) continue;

      // Register part health healing if damaged
      if (part.health < part.maxHealth) {
        // Base heal rate: 0.1 HP/sec → 6 HP/game minute
        const healRatePerMinute = 0.1 * healingMultiplier * 60;

        const cleanup = this.stateMutator.registerDelta({
          entityId: entity.id,
          componentType: CT.Body,
          field: `parts.${partId}.health`,
          deltaPerMinute: healRatePerMinute,
          min: 0,
          max: part.maxHealth,
          source: `body_part_healing_${partId}`,
        });

        partHealingCleanups.set(partId, cleanup);
      }

      // Register injury healing progress deltas
      for (let i = 0; i < part.injuries.length; i++) {
        const injury = part.injuries[i];
        if (!injury) continue;

        // Base healing: 1% per in-game hour = 1/3600 per second
        // Convert to per-game-minute: (1/3600) * 60 * 100 = 1.67% per game minute
        const healRatePerMinute = (1.0 / 3600) * healingMultiplier * 60 * 100;

        const injuryKey = `${partId}:${i}`;
        const cleanup = this.stateMutator.registerDelta({
          entityId: entity.id,
          componentType: CT.Body,
          field: `parts.${partId}.injuries.${i}.healingProgress`,
          deltaPerMinute: healRatePerMinute,
          min: 0,
          max: 100,
          source: `body_injury_healing_${injuryKey}`,
        });

        injuryHealingCleanups.set(injuryKey, cleanup);
      }
    }

    // Store cleanup functions
    this.healingCleanups.set(entity.id, {
      partHealing: partHealingCleanups,
      injuryHealing: injuryHealingCleanups,
    });
  }

  // ==========================================================================
  // Natural Healing
  // ==========================================================================

  private processNaturalHealing(
    _entity: any,
    body: BodyComponent,
    _deltaTime: number
  ): void {
    // Healing rates are now handled by StateMutatorSystem deltas
    // This method only handles removal of fully healed injuries

    for (const part of Object.values(body.parts)) {
      // Process injury removal when fully healed
      for (let i = part.injuries.length - 1; i >= 0; i--) {
        const injury = part.injuries[i];
        if (!injury) continue;

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

  // ==========================================================================
  // Infections
  // ==========================================================================

  private processInfections(
    __entity: any,
    body: BodyComponent,
    deltaTime: number
  ): void {
    for (const part of Object.values(body.parts)) {
      if (part.infected) {
        // Infection causes pain (already handled in pain calculation)

        // Infection spreads if untreated
        // Spread chance increases with time and severity
        const spreadChance = 0.00005 * deltaTime; // ~0.5% per 100 ticks

        if (Math.random() < spreadChance) {
          // Find adjacent parts to spread to (parent or children)
          const adjacentParts = this.getAdjacentParts(body, part.id);

          for (const adjacentPart of adjacentParts) {
            if (!adjacentPart.infected && !adjacentPart.bandaged) {
              // Spread to adjacent part
              adjacentPart.infected = true;
            }
          }
        }

        // Infection damages the part over time if untreated
        if (!part.bandaged) {
          const infectionDamage = 0.1 * deltaTime; // Slow damage over time
          part.health = Math.max(0, part.health - infectionDamage);
        }
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

  /**
   * Get adjacent body parts for infection spread.
   * Adjacency is determined by parent/child relationships.
   * @returns Array of adjacent BodyPart objects (parent and children)
   */
  private getAdjacentParts(body: BodyComponent, partId: string): BodyPart[] {
    const adjacentParts: BodyPart[] = [];
    const currentPart = body.parts[partId];
    if (!currentPart) return adjacentParts;

    // Add parent part if exists
    if (currentPart.parent) {
      const parentPart = body.parts[currentPart.parent];
      if (parentPart) {
        adjacentParts.push(parentPart);
      }
    }

    // Add child parts (parts that have this part as parent)
    for (const [otherId, otherPart] of Object.entries(body.parts)) {
      if (otherId !== partId && otherPart.parent === partId) {
        adjacentParts.push(otherPart);
      }
    }

    return adjacentParts;
  }

  // ==========================================================================
  // Derived Stats
  // ==========================================================================

  private updateDerivedStats(_entity: any, body: BodyComponent): void {
    body.totalPain = calculateTotalPain(body);
    body.overallHealth = calculateOverallHealth(body);
  }

  // ==========================================================================
  // Consciousness
  // ==========================================================================

  private checkConsciousness(
    entity: any,
    body: BodyComponent,
    world: any
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
    entity: any,
    body: BodyComponent,
    world: any
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

  private applyPainToStress(entity: any, body: BodyComponent, comps: ComponentAccessor): void {
    const mood = comps.optional<MoodComponent>(CT.Mood);
    const totalPain = body.totalPain;

    if (mood) {
      // Pain reduces physical satisfaction factor
      mood.factors.physical = Math.max(-100, mood.factors.physical - totalPain * 0.5);
    }

    // For animals (AnimalComponent has stress directly)
    const animal = comps.optional<AnimalComponent>(CT.Animal);
    if (animal) {
      // Pain increases stress
      animal.stress = Math.min(100, animal.stress + totalPain * 0.1);
    }
  }

  // ==========================================================================
  // Magic Modification Duration
  // ==========================================================================

  private processModifications(
    entity: any,
    body: BodyComponent,
    currentTick: number,
    world: any
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
