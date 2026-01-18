/**
 * ColonizationSystem
 *
 * Handles the mechanics of parasitic colonization:
 * - Infection attempts
 * - Integration progress
 * - Host resistance
 * - Detection and camouflage
 * - Decolonization events
 *
 * This is the creepy Body Snatchers stuff happening in the background.
 */

import { BaseSystem, type SystemContext } from '@ai-village/core';
import type { World } from '@ai-village/core';
import type { Entity } from '@ai-village/core';
import type { EntityId, Tick, SystemId } from '@ai-village/core';
import { EntityImpl } from '@ai-village/core';
import { ComponentType as CT } from '@ai-village/core';
import type { PositionComponent } from '@ai-village/core';
import {
  ParasiticColonizationComponent,
  type ColonizationMethod,
  type ControlLevel,
} from './ParasiticColonizationComponent.js';
import { CollectiveMindComponent } from './CollectiveMindComponent.js';

// ============================================================================
// Configuration
// ============================================================================

export interface ColonizationConfig {
  /** Base chance of colonization success (0-1) */
  baseColonizationChance: number;

  /** How often integration progresses (in ticks) */
  integrationUpdateInterval: number;

  /** Resistance recovery rate per tick when not actively being colonized */
  resistanceRecoveryRate: number;

  /** Chance per tick of detection when camouflage is low */
  detectionChance: number;

  /** How often hosts attempt resistance (in ticks) */
  resistanceAttemptInterval: number;

  /** Distance within which colonized entities exert hive pressure */
  hivePressureRadius: number;

  /** Number of nearby colonized for maximum pressure */
  maxPressureAt: number;
}

export const DEFAULT_COLONIZATION_CONFIG: ColonizationConfig = {
  baseColonizationChance: 0.7,
  integrationUpdateInterval: 10,
  resistanceRecoveryRate: 0.001,
  detectionChance: 0.05,
  resistanceAttemptInterval: 50,
  hivePressureRadius: 10, // Map units
  maxPressureAt: 5, // 5 nearby = max pressure
};

// ============================================================================
// Events
// ============================================================================

export interface ColonizationAttemptEvent {
  type: 'colonization_attempt';
  targetId: EntityId;
  collectiveId: string;
  method: ColonizationMethod;
  success: boolean;
  reason?: string;
  tick: Tick;
}

export interface IntegrationProgressEvent {
  type: 'integration_progress';
  hostId: EntityId;
  collectiveId: string;
  previousLevel: number;
  newLevel: number;
  controlLevel: ControlLevel;
  tick: Tick;
}

export interface ResistanceAttemptEvent {
  type: 'resistance_attempt';
  hostId: EntityId;
  success: boolean;
  result: string;
  tick: Tick;
}

export interface DecolonizationEvent {
  type: 'decolonization';
  hostId: EntityId;
  collectiveId: string;
  reason: 'rejection' | 'death' | 'external_intervention' | 'host_transfer';
  parasiteSurvived: boolean;
  tick: Tick;
}

export interface DetectionEvent {
  type: 'colonization_detected';
  hostId: EntityId;
  detectedById: EntityId;
  certainty: number; // 0-1
  tick: Tick;
}

// ============================================================================
// System
// ============================================================================

export class ColonizationSystem implements System {
  public readonly id: SystemId = 'ColonizationSystem';
  public readonly priority = 48; // Run before reproduction systems
  public readonly requiredComponents = [] as const;

  private config: ColonizationConfig;
  private lastResistanceAttempt: Map<EntityId, Tick> = new Map();

  constructor(config: Partial<ColonizationConfig> = {}) {
    this.config = {
      ...DEFAULT_COLONIZATION_CONFIG,
      ...config,
    };
  }

  update(world: World, entities: ReadonlyArray<Entity>): void {
    const currentTick = world.tick;

    for (const entity of entities) {
      const impl = entity as EntityImpl;
      const colonization = impl.getComponent<ParasiticColonizationComponent>('parasitic_colonization');

      if (!colonization) continue;

      if (colonization.isColonized) {
        this.processColonizedHost(world, entity, colonization, currentTick);
      } else if (colonization.previouslyColonized) {
        this.processRecoveringHost(colonization);
      }
    }
  }

  // ==========================================================================
  // Colonized Host Processing
  // ==========================================================================

  private processColonizedHost(
    world: World,
    entity: Entity,
    colonization: ParasiticColonizationComponent,
    currentTick: Tick,
  ): void {
    // Update hive pressure from nearby colonized entities
    this.updateHivePressure(world, entity, colonization);

    // Update integration progress
    if (colonization.integration && !colonization.integration.integrationStalled) {
      colonization.updateIntegration(currentTick);
    }

    // Process host resistance attempts
    if (colonization.isResisting || colonization.hostPersonalityState === 'intact') {
      this.processResistanceAttempts(entity, colonization, currentTick);
    }

    // Process detection chances
    if (colonization.camouflageLevel < 0.5) {
      this.processDetectionRisk(world, entity, colonization, currentTick);
    }
  }

  private processResistanceAttempts(
    entity: Entity,
    colonization: ParasiticColonizationComponent,
    currentTick: Tick,
  ): void {
    const lastAttempt = this.lastResistanceAttempt.get(entity.id) ?? 0;

    if (currentTick - lastAttempt < this.config.resistanceAttemptInterval) return;

    // Hosts with intact personalities occasionally try to resist
    if (colonization.hostPersonalityState === 'intact' && colonization.resistanceStamina > 20) {
      const resistanceChance = colonization.currentResistance * 0.3;

      if (Math.random() < resistanceChance) {
        colonization.attemptResistance();
        this.lastResistanceAttempt.set(entity.id, currentTick);
      }
    }
  }

  private processDetectionRisk(
    world: World,
    entity: Entity,
    colonization: ParasiticColonizationComponent,
    _currentTick: Tick,
  ): void {
    // Check if any nearby entities might detect the colonization
    const detectionRisk = this.config.detectionChance * (1 - colonization.camouflageLevel);

    if (Math.random() < detectionRisk) {
      // Find a nearby entity to potentially detect this
      const nearbyEntity = this.findNearbyUncolonizedEntity(world, entity.id);
      if (nearbyEntity) {
        colonization.detectedBy.push(nearbyEntity.id);
        colonization.camouflageLevel = Math.max(0, colonization.camouflageLevel - 0.1);
      }
    }
  }

  // ==========================================================================
  // Recovering Host Processing
  // ==========================================================================

  private processRecoveringHost(colonization: ParasiticColonizationComponent): void {
    // Slowly recover resistance
    if (colonization.currentResistance < colonization.baseResistance + 0.2) {
      colonization.currentResistance = Math.min(
        1.0,
        colonization.currentResistance + this.config.resistanceRecoveryRate,
      );
    }

    // Slowly recover resistance stamina
    if (colonization.resistanceStamina < 100) {
      colonization.resistanceStamina = Math.min(100, colonization.resistanceStamina + 0.5);
    }
  }

  // ==========================================================================
  // Hive Pressure Calculation
  // ==========================================================================

  /**
   * Calculate and update hive pressure for a colonized host based on nearby colonized entities.
   * The more colonized entities nearby, the harder it is to resist.
   */
  private updateHivePressure(
    world: World,
    entity: Entity,
    colonization: ParasiticColonizationComponent,
  ): void {
    const impl = entity as EntityImpl;
    const position = impl.getComponent<PositionComponent>(CT.Position);

    if (!position) {
      // No position - can't calculate spatial pressure
      colonization.updateHivePressure(0, this.config.maxPressureAt);
      return;
    }

    // Count nearby colonized entities within pressure radius
    let nearbyColonizedCount = 0;

    for (const otherEntity of world.entities.values()) {
      if (otherEntity.id === entity.id) continue;

      const otherImpl = otherEntity as EntityImpl;
      const otherColonization = otherImpl.getComponent<ParasiticColonizationComponent>('parasitic_colonization');

      // Only count colonized entities from the SAME collective
      if (!otherColonization?.isColonized) continue;
      if (otherColonization.parasite?.collectiveId !== colonization.parasite?.collectiveId) continue;

      const otherPosition = otherImpl.getComponent<PositionComponent>(CT.Position);
      if (!otherPosition) continue;

      // Calculate distance
      const dx = position.x - otherPosition.x;
      const dy = position.y - otherPosition.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance <= this.config.hivePressureRadius) {
        nearbyColonizedCount++;
      }
    }

    // Update the colonization component with the pressure
    colonization.updateHivePressure(nearbyColonizedCount, this.config.maxPressureAt);
  }

  // ==========================================================================
  // Public API: Colonization Attempts
  // ==========================================================================

  /**
   * Attempt to colonize a target entity.
   */
  public attemptColonization(
    world: World,
    targetId: EntityId,
    collectiveId: string,
    method: ColonizationMethod,
    currentTick: Tick,
    attackerStrength: number = 1.0,
  ): { success: boolean; reason: string } {
    const target = world.entities.get(targetId);
    if (!target) {
      return { success: false, reason: 'Target not found' };
    }

    const impl = target as EntityImpl;

    // Get or create colonization component
    let colonization = impl.getComponent<ParasiticColonizationComponent>('parasitic_colonization');

    if (!colonization) {
      colonization = new ParasiticColonizationComponent();
      impl.addComponent(colonization);
    }

    // Check if already colonized
    if (colonization.isColonized) {
      return { success: false, reason: 'Target already colonized' };
    }

    // Calculate success chance
    const baseChance = this.config.baseColonizationChance;
    const resistanceModifier = 1 - colonization.currentResistance;
    const strengthModifier = attackerStrength;
    const previouslyColonizedBonus = colonization.previouslyColonized ? -0.2 : 0;
    const methodModifier = this.getMethodModifier(method);

    const successChance = Math.min(
      0.95,
      Math.max(0.05, baseChance * resistanceModifier * strengthModifier * methodModifier + previouslyColonizedBonus),
    );

    const success = Math.random() < successChance;

    if (success) {
      // Find collective to get lineage
      const collectiveEntity = this.findCollective(world, collectiveId);
      const collectiveImpl = collectiveEntity ? collectiveEntity as EntityImpl : undefined;
      const collective = collectiveImpl?.getComponent<CollectiveMindComponent>('collective_mind');

      const lineage = collective?.createLineage(currentTick);
      const lineageId = lineage?.lineageId ?? `${collectiveId}-orphan-${currentTick}`;

      // Execute colonization
      colonization.colonize(collectiveId, method, lineageId, currentTick);

      // Register with collective
      if (collective) {
        collective.registerHost(targetId, lineageId, currentTick, {
          hostSpecies: 'unknown',
          strategicValue: 0.5,
        });
      }

      return { success: true, reason: 'Colonization successful' };
    } else {
      // Failed - target may become more resistant
      colonization.currentResistance = Math.min(1.0, colonization.currentResistance + 0.1);
      return { success: false, reason: 'Target resisted colonization' };
    }
  }

  /**
   * Force colonization (for newborns or special circumstances).
   */
  public forceColonization(
    world: World,
    targetId: EntityId,
    collectiveId: string,
    method: ColonizationMethod,
    currentTick: Tick,
  ): boolean {
    const target = world.entities.get(targetId);
    if (!target) return false;

    const impl = target as EntityImpl;

    let colonization = impl.getComponent<ParasiticColonizationComponent>('parasitic_colonization');

    if (!colonization) {
      colonization = new ParasiticColonizationComponent();
      impl.addComponent(colonization);
    }

    if (colonization.isColonized) return false;

    const collectiveEntity = this.findCollective(world, collectiveId);
    const collectiveImpl = collectiveEntity ? collectiveEntity as EntityImpl : undefined;
    const collective = collectiveImpl?.getComponent<CollectiveMindComponent>('collective_mind');

    const lineage = collective?.createLineage(currentTick);
    const lineageId = lineage?.lineageId ?? `${collectiveId}-forced-${currentTick}`;

    colonization.colonize(collectiveId, method, lineageId, currentTick);

    if (collective) {
      collective.registerHost(targetId, lineageId, currentTick, {
        hostSpecies: 'unknown',
        strategicValue: 0.7,
      });
    }

    return true;
  }

  /**
   * Remove a parasite from a host (decolonization).
   */
  public decolonize(
    world: World,
    hostId: EntityId,
    reason: 'rejection' | 'death' | 'external_intervention' | 'host_transfer',
    currentTick: Tick,
  ): boolean {
    const host = world.entities.get(hostId);
    if (!host) return false;

    const impl = host as EntityImpl;
    const colonization = impl.getComponent<ParasiticColonizationComponent>('parasitic_colonization');

    if (!colonization?.isColonized) return false;

    const collectiveId = colonization.parasite?.collectiveId ?? 'unknown';

    // Remove from collective
    const collectiveEntity = this.findCollective(world, collectiveId);
    if (collectiveEntity) {
      const collectiveImpl = collectiveEntity as EntityImpl;
      const collective = collectiveImpl.getComponent<CollectiveMindComponent>('collective_mind');
      const parasiteSurvives = reason === 'host_transfer' || reason === 'death';
      collective?.removeHost(hostId, reason === 'rejection' ? 'rejection' : 'death', currentTick, parasiteSurvives);
    }

    // Decolonize the host
    colonization.decolonize(reason === 'host_transfer' ? 'host_transfer' : 'rejection');

    return true;
  }

  // ==========================================================================
  // Utility Methods
  // ==========================================================================

  private getMethodModifier(method: ColonizationMethod): number {
    const modifiers: Record<ColonizationMethod, number> = {
      ear_entry: 1.0,
      spore_inhalation: 0.8,
      pod_replacement: 1.2,
      injection: 1.1,
      consumption: 1.3,
      psychic_override: 0.7,
      birth_colonization: 1.5,
      gradual_infiltration: 0.9,
    };
    return modifiers[method] ?? 1.0;
  }

  private findCollective(world: World, collectiveId: string): Entity | null {
    for (const entity of world.entities.values()) {
      const impl = entity as EntityImpl;
      const collective = impl.getComponent<CollectiveMindComponent>('collective_mind');
      if (collective?.collectiveId === collectiveId) return entity;
    }
    return null;
  }

  private findNearbyUncolonizedEntity(world: World, excludeId: EntityId): Entity | null {
    for (const entity of world.entities.values()) {
      if (entity.id === excludeId) continue;

      const impl = entity as EntityImpl;
      const colonization = impl.getComponent<ParasiticColonizationComponent>('parasitic_colonization');

      // Return first uncolonized entity (in production would check proximity)
      if (!colonization?.isColonized) {
        return entity;
      }
    }
    return null;
  }

  // ==========================================================================
  // Query Methods
  // ==========================================================================

  /**
   * Get all colonized hosts for a collective.
   */
  public getColonizedHosts(world: World, collectiveId: string): Entity[] {
    const hosts: Entity[] = [];

    for (const entity of world.entities.values()) {
      const impl = entity as EntityImpl;
      const colonization = impl.getComponent<ParasiticColonizationComponent>('parasitic_colonization');

      if (colonization?.isColonized && colonization.parasite?.collectiveId === collectiveId) {
        hosts.push(entity);
      }
    }

    return hosts;
  }

  /**
   * Get hosts that are actively resisting.
   */
  public getResistingHosts(world: World): Entity[] {
    const resisting: Entity[] = [];

    for (const entity of world.entities.values()) {
      const impl = entity as EntityImpl;
      const colonization = impl.getComponent<ParasiticColonizationComponent>('parasitic_colonization');

      if (colonization?.isColonized && colonization.isResisting) {
        resisting.push(entity);
      }
    }

    return resisting;
  }

  /**
   * Get hosts that have been detected.
   */
  public getDetectedHosts(world: World): Array<{ host: Entity; detectedBy: EntityId[] }> {
    const detected: Array<{ host: Entity; detectedBy: EntityId[] }> = [];

    for (const entity of world.entities.values()) {
      const impl = entity as EntityImpl;
      const colonization = impl.getComponent<ParasiticColonizationComponent>('parasitic_colonization');

      if (colonization?.isColonized && colonization.detectedBy.length > 0) {
        detected.push({ host: entity, detectedBy: colonization.detectedBy });
      }
    }

    return detected;
  }
}
