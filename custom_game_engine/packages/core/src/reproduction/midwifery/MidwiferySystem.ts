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

import type { System } from '../../ecs/System.js';
import type { World } from '../../ecs/World.js';
import type { Entity } from '../../ecs/Entity.js';
import type { EntityImpl } from '../../ecs/Entity.js';
import type { EventBus } from '../../events/EventBus.js';
import type { SystemId, Tick } from '../../types.js';
import { ReproductionSystem } from '../../systems/ReproductionSystem.js';
import { ComponentType } from '../../types/ComponentType.js';

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

/** Default gestation length in ticks (270 days at 20 TPS, 60 ticks/min) */
const DEFAULT_GESTATION_TICKS = 270 * 20 * 60;

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

export class MidwiferySystem implements System {
  public readonly id: SystemId = 'midwifery';
  public readonly priority = 45; // Run before general NeedsSystem
  public readonly requiredComponents = [] as const;

  private world: World | null = null;
  private eventBus: EventBus | null = null;
  private reproductionSystem: ReproductionSystem | null = null;
  private lastUpdateTick: Tick = 0;

  public initialize(world: World, eventBus: EventBus): void {
    this.world = world;
    this.eventBus = eventBus;

    // Get reference to ReproductionSystem for creating offspring with proper genetics
    this.reproductionSystem = (world as any).getSystem('ReproductionSystem') as ReproductionSystem | null;

    // Subscribe to conception events
    this.eventBus.subscribe('reproduction:conception' as any, (event: any) => {
      this.handleConception(event.data);
    });
  }

  public update(world: World): void {
    const currentTick = world.tick;
    const deltaTicks = currentTick - this.lastUpdateTick;
    this.lastUpdateTick = currentTick;

    if (deltaTicks <= 0) return;

    // Update all pregnant entities
    this.updatePregnancies(world, currentTick, deltaTicks);

    // Update all entities in labor
    this.updateLabors(world, currentTick, deltaTicks);

    // Update postpartum recovery
    this.updatePostpartum(world, deltaTicks);

    // Update infants
    this.updateInfants(world, currentTick, deltaTicks);

    // Update nursing mothers
    this.updateNursing(world, currentTick, deltaTicks);
  }

  // =========================================================================
  // Pregnancy Management
  // =========================================================================

  /**
   * Handle conception event - create PregnancyComponent
   */
  private handleConception(data: {
    motherId: string;
    fatherId: string;
    conceptionTick: Tick;
    expectedOffspringCount?: number;
  }): void {
    if (!this.world) return;

    const mother = this.world.getEntity(data.motherId);
    if (!mother) return;

    const impl = mother as EntityImpl;

    // Don't add if already pregnant
    if (impl.hasComponent(ComponentType.Pregnancy)) return;

    // Create pregnancy component
    const pregnancy = createPregnancyComponent(
      data.fatherId,
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

    this.eventBus?.emit({
      type: 'midwifery:pregnancy_started',
      source: data.motherId,
      data: {
        motherId: data.motherId,
        fatherId: data.fatherId,
        expectedDueDate: pregnancy.expectedDueDate,
        riskFactors: pregnancy.riskFactors,
      },
    } as any);
  }

  /**
   * Update all pregnancies
   */
  private updatePregnancies(world: World, currentTick: Tick, deltaTicks: number): void {
    for (const entity of world.entities.values()) {
      const impl = entity as EntityImpl;
      const pregnancy = impl.getComponent<PregnancyComponent>('pregnancy');

      if (!pregnancy) continue;

      // Update pregnancy state
      pregnancy.update(currentTick);

      // Check for malnutrition damage
      const needs = impl.components.get('needs') as { hunger?: number } | undefined;
      if (needs && needs.hunger !== undefined && needs.hunger < 0.3) {
        pregnancy.damageFetalHealth(0.01 * deltaTicks / (20 * 60), 'malnutrition');
      }

      // Check for labor onset
      if (pregnancy.isReadyForLabor() && !impl.hasComponent(ComponentType.Labor)) {
        this.startLabor(impl, pregnancy, currentTick);
      }
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

    this.eventBus?.emit({
      type: 'midwifery:labor_started',
      source: mother.id,
      data: {
        motherId: mother.id,
        premature: labor.premature,
        riskFactors: labor.riskFactors,
        fetalPosition: labor.fetalPosition,
      },
    } as any);
  }

  // =========================================================================
  // Labor Management
  // =========================================================================

  /**
   * Update all active labors
   */
  private updateLabors(world: World, currentTick: Tick, deltaTicks: number): void {
    for (const entity of world.entities.values()) {
      const impl = entity as EntityImpl;
      const labor = impl.getComponent<LaborComponent>('labor');

      if (!labor) continue;

      // Update labor progression
      labor.update(deltaTicks);

      // Check for complications
      if (Math.random() < labor.getComplicationChance() * deltaTicks) {
        this.generateComplication(impl, labor, currentTick);
      }

      // Check for delivery
      if (labor.isReadyForDelivery()) {
        this.completeDelivery(impl, labor, currentTick);
      }

      // Check for maternal death from untreated complications
      if (labor.severity === 'emergency' || labor.severity === 'critical') {
        const untreatedCritical = labor.complications.some(
          c => !c.treated && (c.severity === 'emergency' || c.severity === 'critical')
        );

        if (untreatedCritical && Math.random() < UNTREATED_MORTALITY_RATE * deltaTicks / (20 * 60)) {
          this.handleMaternalDeath(impl, labor, 'untreated_complication');
          return;
        }
      }
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

    this.eventBus?.emit({
      type: 'midwifery:complication',
      source: mother.id,
      data: {
        motherId: mother.id,
        complication: selected,
        severity: complication.severity,
      },
    } as any);
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

    this.eventBus?.emit({
      type: 'midwifery:birth',
      source: mother.id,
      data: outcome,
    } as any);

    // Also emit the standard birth event for canon tracking
    this.eventBus?.emit({
      type: 'birth',
      source: mother.id,
      data: {
        motherId: mother.id,
        fatherId,
        childId: childIds[0],
        childIds,
        gestationalAge: labor.gestationalAgeWeeks,
        birthWeight: labor.premature ? 'low' : 'normal',
        complications: labor.complications.map(c => c.type),
        attendedBy: labor.attendingMidwifeId,
      },
    } as any);

    // Remove pregnancy and labor components
    mother.removeComponent('pregnancy');
    mother.removeComponent('labor');
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

      // Add identity component
      childImpl.addComponent({
        type: 'identity',
        version: 1,
        name: childName,
        parents: [mother.id, fatherId],
      } as any);
    }

    const childImpl = child as EntityImpl;

    // Add position near mother
    const motherPos = mother.components.get(ComponentType.Position) as { x?: number; y?: number } | undefined;
    if (!childImpl.hasComponent(ComponentType.Position)) {
      childImpl.addComponent({
        type: ComponentType.Position,
        version: 1,
        x: (motherPos?.x ?? 0) + Math.random() * 2 - 1,
        y: (motherPos?.y ?? 0) + Math.random() * 2 - 1,
        z: 0,
      } as any);
    } else {
      // Update position to be near mother
      const pos = childImpl.components.get(ComponentType.Position) as unknown as { x: number; y: number; z: number } | undefined;
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
  }

  /**
   * Handle maternal death
   */
  private handleMaternalDeath(
    mother: EntityImpl,
    labor: LaborComponent,
    cause: string
  ): void {
    this.eventBus?.emit({
      type: 'midwifery:maternal_death',
      source: mother.id,
      data: {
        motherId: mother.id,
        cause,
        complications: labor.complications.map(c => c.type),
      },
    } as any);

    // Emit death event
    this.eventBus?.emit({
      type: 'death',
      source: mother.id,
      data: {
        entityId: mother.id,
        cause: `childbirth_${cause}`,
      },
    } as any);

    // The actual death handling should be done by the death system
  }

  /**
   * Handle infant death
   */
  private handleInfantDeath(child: Entity, cause: string): void {
    this.eventBus?.emit({
      type: 'midwifery:infant_death',
      source: child.id,
      data: {
        childId: child.id,
        cause,
      },
    } as any);

    this.eventBus?.emit({
      type: 'death',
      source: child.id,
      data: {
        entityId: child.id,
        cause: `stillbirth_${cause}`,
      },
    } as any);
  }

  // =========================================================================
  // Postpartum & Nursing
  // =========================================================================

  /**
   * Update postpartum recovery
   */
  private updatePostpartum(world: World, deltaTicks: number): void {
    const deltaDays = deltaTicks / (20 * 60 * 24); // Rough conversion

    for (const entity of world.entities.values()) {
      const impl = entity as EntityImpl;
      const postpartum = impl.getComponent<PostpartumComponent>('postpartum');

      if (!postpartum) continue;

      postpartum.update(deltaDays);

      // Check for full recovery
      if (postpartum.fullyRecovered) {
        impl.removeComponent('postpartum');

        this.eventBus?.emit({
          type: 'midwifery:recovery_complete',
          source: entity.id,
          data: { motherId: entity.id },
        } as any);
      }
    }
  }

  /**
   * Update nursing mothers
   */
  private updateNursing(world: World, currentTick: Tick, deltaTicks: number): void {
    const deltaDays = deltaTicks / (20 * 60 * 24);

    for (const entity of world.entities.values()) {
      const impl = entity as EntityImpl;
      const nursing = impl.getComponent<NursingComponent>('nursing');

      if (!nursing) continue;

      // Get mother's hunger for nutrition calculation
      const needs = impl.components.get('needs') as { hunger?: number } | undefined;
      const motherHunger = needs?.hunger ?? 1.0;

      nursing.update(currentTick, deltaDays, motherHunger);

      // If no longer lactating, remove component
      if (!nursing.lactating && nursing.getInfantCount() === 0) {
        impl.removeComponent('nursing');
      }
    }
  }

  /**
   * Update infants
   */
  private updateInfants(world: World, currentTick: Tick, deltaTicks: number): void {
    const deltaDays = deltaTicks / (20 * 60 * 24);

    for (const entity of world.entities.values()) {
      const impl = entity as EntityImpl;
      const infant = impl.getComponent<InfantComponent>('infant');

      if (!infant) continue;

      infant.update(currentTick, deltaDays);

      // Check if infant needs feeding
      if (infant.needsFeeding() && infant.nursingSource) {
        this.feedInfant(world, impl, infant, currentTick);
      }

      // Check if infant has matured
      if (infant.hasMaturated()) {
        impl.removeComponent('infant');

        this.eventBus?.emit({
          type: 'midwifery:infant_matured',
          source: entity.id,
          data: { childId: entity.id, ageDays: infant.ageDays },
        } as any);
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

    this.eventBus?.emit({
      type: 'midwifery:midwife_attending',
      source: midwifeId,
      data: {
        midwifeId,
        motherId,
        skillLevel,
      },
    } as any);

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
    if (pregnancy.trimester === 3 && skillLevel >= 2) {
      // Actually determine position if not already known
      if (pregnancy.fetalPosition === 'unknown') {
        const roll = Math.random();
        if (roll < 0.95) {
          pregnancy.fetalPosition = 'cephalic';
        } else if (roll < 0.98) {
          pregnancy.fetalPosition = 'breech';
        } else {
          pregnancy.fetalPosition = 'transverse';
        }
      }
      detectedPosition = pregnancy.fetalPosition;
    }

    // Identify risk factors based on skill
    const identifiedFactors: PregnancyRiskFactor[] = [];
    if (skillLevel >= 3 && pregnancy.fetalPosition === 'breech') {
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

    pregnancy.recordCheckup(checkup);

    // Mark pregnancy as detected if first checkup
    if (!pregnancy.detected) {
      pregnancy.detected = true;
      pregnancy.detectedAt = currentTick;
    }

    this.eventBus?.emit({
      type: 'midwifery:prenatal_checkup',
      source: midwifeId,
      data: {
        midwifeId,
        motherId,
        checkup,
      },
    } as any);

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

    this.eventBus?.emit({
      type: 'midwifery:complication_treated',
      source: midwifeId,
      data: {
        midwifeId,
        motherId,
        complication: complicationType,
        success,
      },
    } as any);

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
