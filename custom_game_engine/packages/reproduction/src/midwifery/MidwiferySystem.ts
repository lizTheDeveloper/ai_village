/**
 * MidwiferySystem - Orchestrates pregnancy, labor, birth, and postpartum care
 *
 * This system manages the complete reproductive lifecycle:
 * 1. Pregnancy tracking and prenatal care
 * 2. Labor onset and progression
 * 3. Complication generation and treatment
 * 4. Birth outcomes
 * 5. Postpartum recovery
 * 6. Infant care and nursing
 */

import { BaseSystem, type SystemContext } from '@ai-village/core';
import type { World } from '@ai-village/core';
import type { Entity } from '@ai-village/core';
import type { EntityImpl } from '@ai-village/core';
import type { EventBus } from '@ai-village/core';
import type { SystemId, Tick } from '@ai-village/core';
import { ReproductionSystem } from '@ai-village/core';
import { ComponentType } from '@ai-village/core';
import type { IdentityComponent, PositionComponent } from '@ai-village/core';

import {
  PregnancyComponent,
  createPregnancyComponent,
  type PregnancyRiskFactor,
  type FetalPosition,
  type PrenatalCheckup,
} from './PregnancyComponent.js';
import {
  LaborComponent,
  createLaborComponent,
  type BirthComplication,
  type DeliveryMethod,
} from './LaborComponent.js';
import {
  PostpartumComponent,
  createPostpartumComponent,
} from './PostpartumComponent.js';
import {
  InfantComponent,
  createInfantComponent,
} from './InfantComponent.js';
import {
  NursingComponent,
  createNursingComponent,
} from './NursingComponent.js';
import type { ReproductiveMorphComponent } from '../ReproductiveMorphComponent.js';

// ============================================================================
// Configuration
// ============================================================================

/** Default gestation length in ticks (5 minutes at 20 TPS for testing - was 270 days) */
const DEFAULT_GESTATION_TICKS = 5 * 20 * 60; // 6000 ticks = 5 minutes real time

/** Base complication rate for unassisted births */
const BASE_COMPLICATION_RATE = 0.15; // 15%

/** Mortality rate for untreated critical complications */
const UNTREATED_MORTALITY_RATE = 0.03; // 3%

/** How much skilled assistance reduces complication rate */
const MIDWIFE_COMPLICATION_REDUCTION = 0.6; // 60% reduction

/** Configuration for the midwifery system */
export interface MidwiferyConfig {
  /** Gestation length in ticks */
  gestationTicks: number;
  /** Base complication rate for unassisted births (0-1) */
  baseComplicationRate: number;
  /** Mortality rate for untreated critical complications (0-1) */
  untreatedMortalityRate: number;
  /** How much skilled assistance reduces complication rate (0-1) */
  midwifeComplicationReduction: number;
  /** Enable premature birth risks */
  enablePrematureRisks: boolean;
  /** Enable maternal mortality */
  enableMaternalMortality: boolean;
}

/** Default midwifery configuration */
export const DEFAULT_MIDWIFERY_CONFIG: MidwiferyConfig = {
  gestationTicks: DEFAULT_GESTATION_TICKS,
  baseComplicationRate: BASE_COMPLICATION_RATE,
  untreatedMortalityRate: UNTREATED_MORTALITY_RATE,
  midwifeComplicationReduction: MIDWIFE_COMPLICATION_REDUCTION,
  enablePrematureRisks: true,
  enableMaternalMortality: true,
};

// ============================================================================
// Birth Outcome
// ============================================================================

export interface BirthOutcome {
  success: boolean;
  motherId: string;
  fatherId: string;
  childIds: string[];
  complications: BirthComplication[];
  deliveryMethod: DeliveryMethod;
  attendedBy: string | null;
  maternalSurvived: boolean;
  infantsSurvived: number;
  premature: boolean;
  gestationalAgeWeeks: number;
}

// ============================================================================
// The System
// ============================================================================

export class MidwiferySystem extends BaseSystem {
  public readonly id: SystemId = 'midwifery';
  public readonly priority = 45; // Run before general NeedsSystem
  public readonly requiredComponents = [] as const;
  protected readonly throttleInterval = 100; // SLOW - 5 seconds

  private reproductionSystem: ReproductionSystem | null = null;
  private lastMidwiferyUpdateTick: Tick = 0;

  // =========================================================================
  // Performance Optimizations - GC Reduction
  // =========================================================================

  /** Update interval: every 100 ticks (5 seconds at 20 TPS) */
  private readonly UPDATE_INTERVAL = 100;
  private lastUpdate = 0;

  /** Map-based caching for O(1) component access */
  private readonly pregnancyCache = new Map<string, PregnancyComponent>();
  private readonly laborCache = new Map<string, LaborComponent>();
  private readonly postpartumCache = new Map<string, PostpartumComponent>();
  private readonly infantCache = new Map<string, InfantComponent>();
  private readonly nursingCache = new Map<string, NursingComponent>();

  /** Precomputed constants */
  private readonly ticksPerDay = 20 * 60 * 24;
  private readonly ticksPerMinute = 20 * 60;

  /** Reusable working objects (zero allocations in hot paths) */
  private readonly workingRiskFactors: PregnancyRiskFactor[] = [];
  private readonly workingComplications: BirthComplication[] = [];

  protected onInitialize(world: World, eventBus: EventBus): void {
    // Get reference to ReproductionSystem for creating offspring with proper genetics
    // Note: world.getSystem may not be available in all contexts (e.g., tests)
    try {
      // Type-safe system access with proper error handling
      const worldWithSystems = world as World & { getSystem?: (name: string) => unknown };
      const system = worldWithSystems.getSystem?.('ReproductionSystem');
      this.reproductionSystem = system instanceof ReproductionSystem ? system : null;
    } catch {
      this.reproductionSystem = null;
    }

    // Subscribe to conception events using the events manager
    this.events.subscribe('conception', (event: unknown) => {
      const e = event as { data?: { pregnantAgentId: string; otherParentId: string; conceptionTick: number; expectedOffspringCount?: number } };
      if (e.data) {
        this.handleConception(e.data);
      }
    });

    // Build initial caches for O(1) component access
    this.rebuildCaches(world);
  }

  /**
   * Rebuild all component caches for O(1) access
   * Called on initialize and periodically to sync with entity changes
   */
  private rebuildCaches(world: World): void {
    this.pregnancyCache.clear();
    this.laborCache.clear();
    this.postpartumCache.clear();
    this.infantCache.clear();
    this.nursingCache.clear();

    // PERFORMANCE: Use ECS queries instead of scanning all entities
    // Build pregnancy cache
    for (const entity of world.query().with(ComponentType.Pregnancy).executeEntities()) {
      const impl = entity as EntityImpl;
      const pregnancy = impl.getComponent<PregnancyComponent>('pregnancy');
      if (pregnancy) this.pregnancyCache.set(entity.id, pregnancy);
    }

    // Build labor cache
    for (const entity of world.query().with(ComponentType.Labor).executeEntities()) {
      const impl = entity as EntityImpl;
      const labor = impl.getComponent<LaborComponent>('labor');
      if (labor) this.laborCache.set(entity.id, labor);
    }

    // Build postpartum cache
    for (const entity of world.query().with(ComponentType.Postpartum).executeEntities()) {
      const impl = entity as EntityImpl;
      const postpartum = impl.getComponent<PostpartumComponent>('postpartum');
      if (postpartum) this.postpartumCache.set(entity.id, postpartum);
    }

    // Build infant cache
    for (const entity of world.query().with(ComponentType.Infant).executeEntities()) {
      const impl = entity as EntityImpl;
      const infant = impl.getComponent<InfantComponent>('infant');
      if (infant) this.infantCache.set(entity.id, infant);
    }

    // Build nursing cache
    for (const entity of world.query().with(ComponentType.Nursing).executeEntities()) {
      const impl = entity as EntityImpl;
      const nursing = impl.getComponent<NursingComponent>('nursing');
      if (nursing) this.nursingCache.set(entity.id, nursing);
    }
  }

  protected onUpdate(ctx: SystemContext): void {
    const currentTick = ctx.tick;

    // OPTIMIZATION 1: Throttling - only update every UPDATE_INTERVAL ticks
    if (currentTick - this.lastUpdate < this.UPDATE_INTERVAL) return;

    const deltaTicks = currentTick - this.lastUpdate;
    this.lastUpdate = currentTick;

    if (deltaTicks <= 0) return;

    // OPTIMIZATION 2: Early exit - skip if no reproductive activity
    if (
      this.pregnancyCache.size === 0 &&
      this.laborCache.size === 0 &&
      this.postpartumCache.size === 0 &&
      this.infantCache.size === 0 &&
      this.nursingCache.size === 0
    ) {
      return;
    }

    // Rebuild caches periodically to sync with entity changes (every 10 updates = 50 seconds)
    if (currentTick % (this.UPDATE_INTERVAL * 10) === 0) {
      this.rebuildCaches(ctx.world);
    }

    // Update all pregnant entities
    if (this.pregnancyCache.size > 0) {
      this.updatePregnancies(ctx.world, currentTick, deltaTicks);
    }

    // Update all entities in labor
    if (this.laborCache.size > 0) {
      this.updateLabors(ctx.world, currentTick, deltaTicks);
    }

    // Update postpartum recovery
    if (this.postpartumCache.size > 0) {
      this.updatePostpartum(ctx.world, deltaTicks);
    }

    // Update infants
    if (this.infantCache.size > 0) {
      this.updateInfants(ctx.world, currentTick, deltaTicks);
    }

    // Update nursing mothers
    if (this.nursingCache.size > 0) {
      this.updateNursing(ctx.world, currentTick, deltaTicks);
    }
  }

  // =========================================================================
  // Pregnancy Management
  // =========================================================================

  /**
   * Handle conception event - create PregnancyComponent
   */
  private handleConception(data: {
    pregnantAgentId: string;
    otherParentId: string;
    conceptionTick: Tick;
    expectedOffspringCount?: number;
  }): void {
    if (!this.world) return;

    const mother = this.world.getEntity(data.pregnantAgentId);
    if (!mother) return;

    const impl = mother as EntityImpl;

    // Don't add if already pregnant
    if (impl.hasComponent(ComponentType.Pregnancy)) return;

    // Create pregnancy component
    const pregnancy = createPregnancyComponent(
      data.otherParentId,
      data.conceptionTick,
      DEFAULT_GESTATION_TICKS
    );

    if (data.expectedOffspringCount) {
      pregnancy.expectedOffspringCount = data.expectedOffspringCount;
      if (data.expectedOffspringCount > 1) {
        pregnancy.riskFactors.push('multiple_gestation');
      }
    }

    // Check for age-related risk factors
    const age = this.getEntityAge(mother);
    if (age && age > 35) {
      pregnancy.riskFactors.push('advanced_maternal_age');
    } else if (age && age < 18) {
      pregnancy.riskFactors.push('young_maternal_age');
    }

    // Check if first pregnancy
    const morphComp = impl.getComponent<ReproductiveMorphComponent>('reproductive_morph');
    if (morphComp && morphComp.history && morphComp.history.gestationCount === 0) {
      pregnancy.riskFactors.push('first_pregnancy');
    }

    impl.addComponent(pregnancy);

    // Add to pregnancy cache
    this.pregnancyCache.set(mother.id, pregnancy);

    this.events.emitGeneric('midwifery:pregnancy_started', {
      motherId: data.pregnantAgentId,
      fatherId: data.otherParentId,
      expectedDueDate: pregnancy.expectedDueDate,
      riskFactors: pregnancy.riskFactors,
    }, data.pregnantAgentId);
  }

  /**
   * Update all pregnancies (OPTIMIZED: uses cache for O(1) access)
   */
  private updatePregnancies(world: World, currentTick: Tick, deltaTicks: number): void {
    // OPTIMIZATION: Iterate over cached pregnancies instead of all entities
    for (const [entityId, pregnancy] of this.pregnancyCache) {
      const entity = world.getEntity(entityId);
      if (!entity) {
        // Entity was deleted, remove from cache
        this.pregnancyCache.delete(entityId);
        continue;
      }

      const impl = entity as EntityImpl;

      // Update pregnancy state using updateComponent (defensive against deserialized components)
      impl.updateComponent<PregnancyComponent>('pregnancy', (current) => {
        // Calculate updated values (from PregnancyComponent.update method)
        const elapsed = currentTick - current.conceptionTick;
        const gestationProgress = Math.min(1, elapsed / current.gestationLength);
        const daysRemaining = Math.max(0, Math.floor((current.expectedDueDate - currentTick) / (20 * 60)));

        // Determine trimester
        let trimester: 1 | 2 | 3;
        if (gestationProgress < 0.33) {
          trimester = 1;
        } else if (gestationProgress < 0.67) {
          trimester = 2;
        } else {
          trimester = 3;
        }

        // Update symptoms based on trimester
        const symptoms = { ...current.symptoms };
        switch (trimester) {
          case 1:
            symptoms.morningSickness = true;
            symptoms.fatigue = true;
            symptoms.backPain = false;
            symptoms.swelling = false;
            break;
          case 2:
            symptoms.morningSickness = false;
            symptoms.fatigue = false;
            symptoms.backPain = true;
            symptoms.cravings = true;
            break;
          case 3:
            symptoms.fatigue = true;
            symptoms.backPain = true;
            symptoms.swelling = true;
            symptoms.cravings = true;
            break;
        }

        // Update speed modifier
        const speedModifier = trimester === 3 ? 0.8 : 1.0;

        // Check for malnutrition damage
        const needs = impl.components.get('needs') as { hunger?: number } | undefined;
        let fetalHealth = current.fetalHealth;
        let fetalHeartbeat = current.fetalHeartbeat;
        const complications = [...current.complications];

        if (needs && needs.hunger !== undefined && needs.hunger < 0.3) {
          const damage = 0.01 * deltaTicks / (20 * 60);
          fetalHealth = Math.max(0, fetalHealth - damage);

          if (!complications.includes('malnutrition')) {
            complications.push('malnutrition');
          }

          // Critical damage
          if (fetalHealth < 0.3) {
            fetalHeartbeat = false;
          }
        }

        // Return updated component (defensive instantiation)
        const updated = new PregnancyComponent();
        Object.assign(updated, current, {
          gestationProgress,
          daysRemaining,
          trimester,
          symptoms,
          speedModifier,
          fetalHealth,
          fetalHeartbeat,
          complications,
        });
        return updated;
      });

      // Get updated pregnancy for labor check
      const updatedPregnancy = impl.getComponent<PregnancyComponent>('pregnancy')!;

      // Check for labor onset (isReadyForLabor is a simple getter, works on plain objects)
      const isReadyForLabor = updatedPregnancy.gestationProgress >= 0.95;
      if (isReadyForLabor && !impl.hasComponent(ComponentType.Labor)) {
        this.startLabor(impl, updatedPregnancy, currentTick);
      }

      // Update cache with latest component state
      this.pregnancyCache.set(entityId, updatedPregnancy);
    }
  }

  /**
   * Start labor for a pregnant entity
   */
  private startLabor(
    mother: EntityImpl,
    pregnancy: PregnancyComponent,
    currentTick: Tick
  ): void {
    // Remove pregnancy component, add labor component
    const labor = createLaborComponent(
      currentTick,
      pregnancy.fetalPosition,
      pregnancy.isPremature(),
      Math.floor(pregnancy.gestationProgress * 40), // weeks
      pregnancy.riskFactors
    );

    mother.addComponent(labor);

    // Update caches: remove from pregnancy, add to labor
    this.pregnancyCache.delete(mother.id);
    this.laborCache.set(mother.id, labor);

    this.events.emitGeneric('midwifery:labor_started', {
      motherId: mother.id,
      premature: labor.premature,
      riskFactors: labor.riskFactors,
      fetalPosition: labor.fetalPosition,
    }, mother.id);
  }

  // =========================================================================
  // Labor Management
  // =========================================================================

  /**
   * Update all active labors (OPTIMIZED: uses cache for O(1) access)
   */
  private updateLabors(world: World, currentTick: Tick, deltaTicks: number): void {
    // OPTIMIZATION: Iterate over cached labors instead of all entities
    for (const [entityId, labor] of this.laborCache) {
      const entity = world.getEntity(entityId);
      if (!entity) {
        // Entity was deleted, remove from cache
        this.laborCache.delete(entityId);
        continue;
      }

      const impl = entity as EntityImpl;

      // Update labor progression using updateComponent (defensive against deserialized components)
      impl.updateComponent<LaborComponent>('labor', (current) => {
        // Create a proper LaborComponent instance from current data
        const tempLabor = Object.assign(new LaborComponent(), current);

        // Call update method on the instance
        tempLabor.update(deltaTicks);

        // Return the updated instance
        return tempLabor;
      });

      // Get updated labor component for checks
      const updatedLabor = impl.getComponent<LaborComponent>('labor')!;

      // Check for complications
      if (Math.random() < updatedLabor.getComplicationChance() * deltaTicks) {
        this.generateComplication(impl, updatedLabor, currentTick);
      }

      // Check for delivery
      if (updatedLabor.isReadyForDelivery()) {
        this.completeDelivery(impl, updatedLabor, currentTick);
      }

      // Check for maternal death from untreated complications
      if (updatedLabor.severity === 'emergency' || updatedLabor.severity === 'critical') {
        const untreatedCritical = updatedLabor.complications.some(
          c => !c.treated && (c.severity === 'emergency' || c.severity === 'critical')
        );

        if (untreatedCritical && Math.random() < UNTREATED_MORTALITY_RATE * deltaTicks / this.ticksPerMinute) {
          this.handleMaternalDeath(impl, updatedLabor, 'untreated_complication');
          this.laborCache.delete(entityId); // Remove from cache
          return;
        }
      }

      // Update cache with latest component state
      this.laborCache.set(entityId, updatedLabor);
    }
  }

  /**
   * Generate a random complication
   */
  private generateComplication(
    mother: EntityImpl,
    labor: LaborComponent,
    currentTick: Tick
  ): void {
    // Weighted complication selection
    const complications: Array<[BirthComplication, number]> = [
      ['failure_to_progress', 0.25],
      ['exhaustion', 0.20],
      ['perineal_tear', 0.15],
      ['prolonged_labor', 0.10],
      ['dystocia', 0.10],
      ['fetal_distress', 0.08],
      ['hemorrhage', 0.05],
      ['cord_compression', 0.04],
      ['shoulder_dystocia', 0.02],
      ['cord_prolapse', 0.01],
    ];

    // Adjust for breech
    if (labor.fetalPosition === 'breech') {
      complications.push(['dystocia', 0.15]);
    }

    // Select complication
    const roll = Math.random();
    let cumulative = 0;
    let selected: BirthComplication = 'exhaustion';

    for (const [comp, weight] of complications) {
      cumulative += weight;
      if (roll < cumulative) {
        selected = comp;
        break;
      }
    }

    // Don't duplicate complications
    if (labor.complications.some(c => c.type === selected)) return;

    const complication = labor.addComplication(selected);
    complication.onset = currentTick;

    this.events.emitGeneric('midwifery:complication', {
      motherId: mother.id,
      complication: selected,
      severity: complication.severity,
    }, mother.id);
  }

  /**
   * Complete the delivery
   */
  private completeDelivery(
    mother: EntityImpl,
    labor: LaborComponent,
    currentTick: Tick
  ): void {
    if (!this.world) return;

    const pregnancy = mother.getComponent<PregnancyComponent>('pregnancy');
    const fatherId = pregnancy?.fatherId ?? '';
    const offspringCount = pregnancy?.expectedOffspringCount ?? 1;

    const childIds: string[] = [];
    let infantsSurvived = 0;

    // Create offspring
    for (let i = 0; i < offspringCount; i++) {
      const child = this.createOffspring(
        mother,
        fatherId,
        labor.premature,
        labor.gestationalAgeWeeks,
        currentTick
      );

      if (child) {
        childIds.push(child.id);

        // Check infant survival (premature/fetal distress risk)
        if (labor.fetalDistress && Math.random() < 0.1) {
          // 10% stillbirth for fetal distress
          this.handleInfantDeath(child, 'fetal_distress');
        } else {
          infantsSurvived++;
        }
      }
    }

    // Determine delivery method
    let method: DeliveryMethod = 'natural';
    if (labor.attended) {
      method = 'assisted';
    }
    if (labor.fetalPosition === 'breech') {
      method = 'breech';
    }
    if (labor.complications.some(c => c.severity === 'emergency')) {
      method = 'emergency';
    }

    // Complete labor
    labor.completeDelivery(childIds, method);

    // Transition to postpartum
    this.transitionToPostpartum(
      mother,
      childIds[0] ?? '',
      labor.complications.length > 0,
      offspringCount,
      currentTick
    );

    // Emit birth event
    const outcome: BirthOutcome = {
      success: infantsSurvived > 0,
      motherId: mother.id,
      fatherId,
      childIds,
      complications: labor.complications.map(c => c.type),
      deliveryMethod: method,
      attendedBy: labor.attendingMidwifeId,
      maternalSurvived: true,
      infantsSurvived,
      premature: labor.premature,
      gestationalAgeWeeks: labor.gestationalAgeWeeks,
    };

    this.events.emitGeneric('midwifery:birth', outcome, mother.id);

    // Also emit the standard birth event for canon tracking
    this.events.emitGeneric('agent:born', {
      agentId: childIds[0] ?? '',
      parentIds: [mother.id, fatherId],
    }, mother.id);

    // Remove pregnancy and labor components
    mother.removeComponent('pregnancy');
    mother.removeComponent('labor');

    // Update caches: remove from labor
    this.laborCache.delete(mother.id);
    this.pregnancyCache.delete(mother.id); // Just to be safe
  }

  /**
   * Create an offspring entity using ReproductionSystem for proper genetic inheritance
   */
  private createOffspring(
    mother: EntityImpl,
    fatherId: string,
    premature: boolean,
    gestationalAgeWeeks: number,
    bornAt: Tick
  ): Entity | null {
    if (!this.world) return null;

    // Get father entity
    const father = this.world.getEntity(fatherId);

    // Use ReproductionSystem for proper genetic inheritance if available
    let child: Entity | null = null;
    if (this.reproductionSystem && father) {
      child = this.reproductionSystem.createOffspring(mother, father, this.world);
    }

    // Fallback to basic creation if ReproductionSystem not available
    if (!child) {
      child = this.world.createEntity();
      const childImpl = child as EntityImpl;

      // Get mother's name for child naming
      const motherIdentity = mother.components.get('identity') as { name?: string } | undefined;
      const childName = `Child of ${motherIdentity?.name ?? 'Unknown'}`;

      // Add identity component with proper typing
      const identityComponent: IdentityComponent = {
        type: 'identity',
        version: 1,
        name: childName,
        age: 0,
        species: 'human', // Inherit from mother in full implementation
      };
      childImpl.addComponent(identityComponent);
    }

    const childImpl = child as EntityImpl;

    // Add position near mother
    const motherPos = mother.components.get(ComponentType.Position) as PositionComponent | undefined;
    if (!childImpl.hasComponent(ComponentType.Position)) {
      const positionComponent: PositionComponent = {
        type: 'position',
        version: 1,
        x: (motherPos?.x ?? 0) + Math.random() * 2 - 1,
        y: (motherPos?.y ?? 0) + Math.random() * 2 - 1,
        z: motherPos?.z ?? 0,
        chunkX: Math.floor(((motherPos?.x ?? 0) + Math.random() * 2 - 1) / 32),
        chunkY: Math.floor(((motherPos?.y ?? 0) + Math.random() * 2 - 1) / 32),
      };
      childImpl.addComponent(positionComponent);
    } else {
      // Update position to be near mother
      const pos = childImpl.components.get(ComponentType.Position) as PositionComponent | undefined;
      if (pos) {
        pos.x = (motherPos?.x ?? 0) + Math.random() * 2 - 1;
        pos.y = (motherPos?.y ?? 0) + Math.random() * 2 - 1;
      }
    }

    // Add infant component for tracking newborn-specific needs
    const infantComp = createInfantComponent(
      bornAt,
      mother.id,
      fatherId,
      premature,
      gestationalAgeWeeks
    );
    childImpl.addComponent(infantComp);

    // Add to infant cache
    this.infantCache.set(child.id, infantComp);

    return child;
  }

  /**
   * Transition mother to postpartum recovery
   */
  private transitionToPostpartum(
    mother: EntityImpl,
    infantId: string,
    complicatedBirth: boolean,
    offspringCount: number,
    currentTick: Tick
  ): void {
    // Add postpartum component
    const postpartum = createPostpartumComponent(
      currentTick,
      infantId,
      complicatedBirth,
      offspringCount
    );
    mother.addComponent(postpartum);

    // Add nursing component
    const nursing = createNursingComponent(currentTick, infantId);
    mother.addComponent(nursing);

    // Update caches
    this.postpartumCache.set(mother.id, postpartum);
    this.nursingCache.set(mother.id, nursing);
  }

  /**
   * Handle maternal death
   */
  private handleMaternalDeath(
    mother: EntityImpl,
    labor: LaborComponent,
    cause: string
  ): void {
    this.events.emitGeneric('midwifery:maternal_death', {
      motherId: mother.id,
      cause,
      complications: labor.complications.map(c => c.type),
    }, mother.id);

    // Emit death event
    this.events.emitGeneric('death:occurred', {
      entityId: mother.id,
      cause: `childbirth_${cause}`,
      location: { x: 0, y: 0, z: 0 }, // Position would be from mother's position component
      time: this.world?.tick ?? 0,
    }, mother.id);

    // The actual death handling should be done by the death system
  }

  /**
   * Handle infant death
   */
  private handleInfantDeath(child: Entity, cause: string): void {
    this.events.emitGeneric('midwifery:infant_death', {
      childId: child.id,
      cause,
    }, child.id);

    this.events.emitGeneric('death:occurred', {
      entityId: child.id,
      cause: `stillbirth_${cause}`,
      location: { x: 0, y: 0, z: 0 }, // Position would be from child's position component
      time: this.world?.tick ?? 0,
    }, child.id);
  }

  // =========================================================================
  // Postpartum & Nursing
  // =========================================================================

  /**
   * Update postpartum recovery (OPTIMIZED: uses cache + precomputed ticksPerDay)
   */
  private updatePostpartum(world: World, deltaTicks: number): void {
    const deltaDays = deltaTicks / this.ticksPerDay; // Use precomputed constant

    // OPTIMIZATION: Iterate over cached postpartum instead of all entities
    for (const [entityId, postpartum] of this.postpartumCache) {
      const entity = world.getEntity(entityId);
      if (!entity) {
        // Entity was deleted, remove from cache
        this.postpartumCache.delete(entityId);
        continue;
      }

      const impl = entity as EntityImpl;

      // Update postpartum using updateComponent (defensive against deserialized components)
      impl.updateComponent<PostpartumComponent>('postpartum', (current) => {
        const temp = Object.assign(new PostpartumComponent(), current);
        temp.update(deltaDays);
        return temp;
      });

      // Get updated component
      const updatedPostpartum = impl.getComponent<PostpartumComponent>('postpartum')!;

      // Check for full recovery
      if (updatedPostpartum.fullyRecovered) {
        impl.removeComponent('postpartum');
        this.postpartumCache.delete(entityId); // Remove from cache

        this.events.emitGeneric('midwifery:recovery_complete', { motherId: entity.id }, entity.id);
      } else {
        // Update cache with latest component state
        this.postpartumCache.set(entityId, updatedPostpartum);
      }
    }
  }

  /**
   * Update nursing mothers (OPTIMIZED: uses cache + precomputed ticksPerDay)
   */
  private updateNursing(world: World, currentTick: Tick, deltaTicks: number): void {
    const deltaDays = deltaTicks / this.ticksPerDay; // Use precomputed constant

    // OPTIMIZATION: Iterate over cached nursing instead of all entities
    for (const [entityId, nursing] of this.nursingCache) {
      const entity = world.getEntity(entityId);
      if (!entity) {
        // Entity was deleted, remove from cache
        this.nursingCache.delete(entityId);
        continue;
      }

      const impl = entity as EntityImpl;

      // Get mother's hunger for nutrition calculation
      const needs = impl.components.get('needs') as { hunger?: number } | undefined;
      const motherHunger = needs?.hunger ?? 1.0;

      // Update nursing using updateComponent (defensive against deserialized components)
      impl.updateComponent<NursingComponent>('nursing', (current) => {
        const temp = Object.assign(new NursingComponent(), current);
        temp.update(currentTick, deltaDays, motherHunger);
        return temp;
      });

      // Get updated component
      const updatedNursing = impl.getComponent<NursingComponent>('nursing')!;

      // If no longer lactating, remove component
      if (!updatedNursing.lactating && updatedNursing.getInfantCount() === 0) {
        impl.removeComponent('nursing');
        this.nursingCache.delete(entityId); // Remove from cache
      } else {
        // Update cache with latest component state
        this.nursingCache.set(entityId, updatedNursing);
      }
    }
  }

  /**
   * Update infants (OPTIMIZED: uses cache + precomputed ticksPerDay)
   */
  private updateInfants(world: World, currentTick: Tick, deltaTicks: number): void {
    const deltaDays = deltaTicks / this.ticksPerDay; // Use precomputed constant

    // OPTIMIZATION: Iterate over cached infants instead of all entities
    for (const [entityId, infant] of this.infantCache) {
      const entity = world.getEntity(entityId);
      if (!entity) {
        // Entity was deleted, remove from cache
        this.infantCache.delete(entityId);
        continue;
      }

      const impl = entity as EntityImpl;

      // Update infant using updateComponent (defensive against deserialized components)
      impl.updateComponent<InfantComponent>('infant', (current) => {
        const temp = Object.assign(new InfantComponent(), current);
        temp.update(currentTick, deltaDays);
        return temp;
      });

      // Get updated component
      const updatedInfant = impl.getComponent<InfantComponent>('infant')!;

      // Check if infant needs feeding
      if (updatedInfant.needsFeeding() && updatedInfant.nursingSource) {
        this.feedInfant(world, impl, updatedInfant, currentTick);
      }

      // Check if infant has matured
      if (updatedInfant.hasMaturated()) {
        impl.removeComponent('infant');
        this.infantCache.delete(entityId); // Remove from cache

        this.events.emitGeneric('midwifery:infant_matured', { childId: entity.id, ageDays: infant.ageDays }, entity.id);
      } else {
        // Update cache with latest component state
        this.infantCache.set(entityId, updatedInfant);
      }
    }
  }

  /**
   * Feed an infant from nursing source
   */
  private feedInfant(
    world: World,
    infant: EntityImpl,
    infantComp: InfantComponent,
    currentTick: Tick
  ): void {
    if (!infantComp.nursingSource) return;

    const nurse = world.getEntity(infantComp.nursingSource);
    if (!nurse) return;

    const nurseImpl = nurse as EntityImpl;
    const nursingComp = nurseImpl.getComponent<NursingComponent>('nursing');

    if (!nursingComp || !nursingComp.lactating) return;

    // Perform nursing
    const milkQuality = nursingComp.nurse(currentTick, infant.id);
    infantComp.feed(currentTick, milkQuality);
  }

  // =========================================================================
  // Midwife Actions (Public API)
  // =========================================================================

  /**
   * Have a midwife attend a birth
   */
  public attendBirth(midwifeId: string, motherId: string): boolean {
    if (!this.world) return false;

    const mother = this.world.getEntity(motherId);
    if (!mother) return false;

    const impl = mother as EntityImpl;
    const labor = impl.getComponent<LaborComponent>('labor');

    if (!labor) return false;

    // Get midwife's skill level
    const midwife = this.world.getEntity(midwifeId);
    const skillLevel = this.getMedicineSkill(midwife);

    labor.setAttendance(midwifeId, skillLevel);

    this.events.emitGeneric('midwifery:midwife_attending', {
      midwifeId,
      motherId,
      skillLevel,
    }, midwifeId);

    return true;
  }

  /**
   * Perform a prenatal checkup
   */
  public prenatalCheckup(midwifeId: string, motherId: string): PrenatalCheckup | null {
    if (!this.world) return null;

    const mother = this.world.getEntity(motherId);
    if (!mother) return null;

    const impl = mother as EntityImpl;
    const pregnancy = impl.getComponent<PregnancyComponent>('pregnancy');

    if (!pregnancy) return null;

    const skillLevel = this.getMedicineSkill(this.world.getEntity(midwifeId));
    const currentTick = this.world.tick;

    // Detect fetal position if third trimester and skilled enough
    let detectedPosition: FetalPosition = 'unknown';
    let updatedFetalPosition = pregnancy.fetalPosition;

    if (pregnancy.trimester === 3 && skillLevel >= 2) {
      // Actually determine position if not already known
      if (pregnancy.fetalPosition === 'unknown') {
        const roll = Math.random();
        if (roll < 0.95) {
          updatedFetalPosition = 'cephalic';
        } else if (roll < 0.98) {
          updatedFetalPosition = 'breech';
        } else {
          updatedFetalPosition = 'transverse';
        }
      }
      detectedPosition = updatedFetalPosition;
    }

    // Identify risk factors based on skill
    const identifiedFactors: PregnancyRiskFactor[] = [];
    if (skillLevel >= 3 && updatedFetalPosition === 'breech') {
      identifiedFactors.push('breech_presentation');
    }

    const checkup: PrenatalCheckup = {
      tick: currentTick,
      midwifeId,
      fetalHeartbeat: pregnancy.fetalHeartbeat,
      fetalPosition: detectedPosition,
      maternalHealth: 1.0, // Would check actual health
      fetalHealth: pregnancy.fetalHealth,
      notes: [],
      riskFactorsIdentified: identifiedFactors,
    };

    // Update pregnancy component with checkup data (defensive against deserialized components)
    impl.updateComponent<PregnancyComponent>('pregnancy', (current) => {
      const checkupHistory = [...current.checkupHistory, checkup];
      const riskFactors = [...current.riskFactors];

      // Merge newly identified risk factors
      for (const factor of checkup.riskFactorsIdentified) {
        if (!riskFactors.includes(factor)) {
          riskFactors.push(factor);
        }
      }

      // Return updated component
      const updated = Object.assign(new PregnancyComponent(), current);
      updated.fetalPosition = updatedFetalPosition;
      updated.checkupHistory = checkupHistory;
      updated.lastCheckupTick = checkup.tick;
      updated.riskFactors = riskFactors;
      updated.detected = true;
      updated.detectedAt = current.detected ? current.detectedAt : currentTick;
      return updated;
    });

    this.events.emitGeneric('midwifery:prenatal_checkup', {
      midwifeId,
      motherId,
      checkup,
    }, midwifeId);

    return checkup;
  }

  /**
   * Treat a birth complication
   */
  public treatComplication(
    midwifeId: string,
    motherId: string,
    complicationType: BirthComplication
  ): boolean {
    if (!this.world) return false;

    const mother = this.world.getEntity(motherId);
    if (!mother) return false;

    const impl = mother as EntityImpl;
    const labor = impl.getComponent<LaborComponent>('labor');

    if (!labor) return false;

    const skillLevel = this.getMedicineSkill(this.world.getEntity(midwifeId));
    const hasSupplies = labor.availableSupplies.length > 0;

    const success = labor.treatComplication(complicationType, midwifeId, skillLevel, hasSupplies);

    this.events.emitGeneric('midwifery:complication_treated', {
      midwifeId,
      motherId,
      complication: complicationType,
      success,
    }, midwifeId);

    return success;
  }

  /**
   * Assign a wet nurse to an infant
   */
  public assignWetNurse(wetNurseId: string, infantId: string): boolean {
    if (!this.world) return false;

    const infant = this.world.getEntity(infantId);
    const wetNurse = this.world.getEntity(wetNurseId);

    if (!infant || !wetNurse) return false;

    const infantImpl = infant as EntityImpl;
    const nurseImpl = wetNurse as EntityImpl;

    const infantComp = infantImpl.getComponent<InfantComponent>('infant');
    const nursingComp = nurseImpl.getComponent<NursingComponent>('nursing');

    if (!infantComp || !nursingComp) return false;

    if (!nursingComp.canNurseAnother()) return false;

    nursingComp.addNursingAssignment(infantId);
    infantComp.assignWetNurse(wetNurseId);

    return true;
  }

  // =========================================================================
  // Helper Methods
  // =========================================================================

  private getEntityAge(entity: Entity): number | null {
    const age = (entity as EntityImpl).components.get('age') as { years?: number } | undefined;
    return age?.years ?? null;
  }

  private getMedicineSkill(entity: Entity | null | undefined): number {
    if (!entity) return 0;
    const skills = (entity as EntityImpl).components.get('skills') as { medicine?: number } | undefined;
    return skills?.medicine ?? 0;
  }
}
