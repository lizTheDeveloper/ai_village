/**
 * PregnancyComponent - Detailed pregnancy tracking for midwifery system
 *
 * Extends the basic GestationState from ReproductiveMorphComponent with:
 * - Trimester tracking and symptoms
 * - Fetal health monitoring
 * - Risk factors and complications
 * - Prenatal care history
 *
 * This component is added to a pregnant entity alongside their ReproductiveMorphComponent.
 */

import { ComponentBase } from '../../ecs/Component.js';
import type { Tick } from '../../types.js';

// ============================================================================
// Pregnancy Types
// ============================================================================

/** Pregnancy trimester */
export type Trimester = 1 | 2 | 3;

/** Fetal position - matters for delivery */
export type FetalPosition =
  | 'unknown'       // Too early to tell
  | 'cephalic'      // Head down (normal)
  | 'breech'        // Feet/bottom down
  | 'transverse'    // Sideways
  | 'oblique';      // Diagonal

/** Pregnancy symptoms */
export interface PregnancySymptoms {
  morningSickness: boolean;
  fatigue: boolean;
  backPain: boolean;
  swelling: boolean;
  cravings: boolean;
  moodSwings: boolean;
}

/** Risk factors that increase complication chance */
export type PregnancyRiskFactor =
  | 'advanced_maternal_age'  // Mother > 35
  | 'young_maternal_age'     // Mother < 18
  | 'first_pregnancy'        // Primigravida
  | 'multiple_gestation'     // Twins, triplets
  | 'previous_complications' // History of difficult births
  | 'malnutrition'          // Insufficient nutrition
  | 'chronic_illness'       // Pre-existing health issues
  | 'breech_presentation'   // Baby not head-down
  | 'placenta_previa'       // Placenta blocking cervix
  | 'preeclampsia'          // High blood pressure
  | 'gestational_diabetes'  // Pregnancy diabetes
  | 'small_pelvis'          // Birth canal concerns
  | 'large_baby'            // Macrosomia
  | 'premature';            // Early labor risk

/** Prenatal checkup record */
export interface PrenatalCheckup {
  tick: Tick;
  midwifeId: string | null;
  fetalHeartbeat: boolean;
  fetalPosition: FetalPosition;
  maternalHealth: number;
  fetalHealth: number;
  notes: string[];
  riskFactorsIdentified: PregnancyRiskFactor[];
}

/** Recommended level of care */
export type CareLevel = 'normal' | 'moderate_risk' | 'high_risk';

// ============================================================================
// The Component
// ============================================================================

/**
 * PregnancyComponent tracks detailed pregnancy state.
 * Added when conception occurs, removed after birth.
 */
export class PregnancyComponent extends ComponentBase {
  public readonly type = 'pregnancy';

  // =========================================================================
  // Basic Tracking
  // =========================================================================

  /** ID of the entity who fertilized (father) */
  public fatherId: string = '';

  /** When conception occurred */
  public conceptionTick: Tick = 0;

  /** Expected due date (tick) */
  public expectedDueDate: Tick = 0;

  /** Species-specific gestation length in ticks */
  public gestationLength: number = 270 * 20 * 60; // 270 days at 20 TPS

  /** Current gestational progress (0-1) */
  public gestationProgress: number = 0;

  /** Days remaining until due date */
  public daysRemaining: number = 270;

  /** Has this pregnancy been detected/confirmed? */
  public detected: boolean = false;

  /** Tick when pregnancy was detected */
  public detectedAt: Tick | null = null;

  // =========================================================================
  // Trimester & Symptoms
  // =========================================================================

  /** Current trimester (1, 2, or 3) */
  public trimester: Trimester = 1;

  /** Current symptoms */
  public symptoms: PregnancySymptoms = {
    morningSickness: false,
    fatigue: false,
    backPain: false,
    swelling: false,
    cravings: false,
    moodSwings: false,
  };

  // =========================================================================
  // Fetal Health
  // =========================================================================

  /** Fetal health (0-1, 1 = perfect health) */
  public fetalHealth: number = 1.0;

  /** Is fetal heartbeat detectable? */
  public fetalHeartbeat: boolean = true;

  /** Fetal position (important in late pregnancy) */
  public fetalPosition: FetalPosition = 'unknown';

  /** Expected number of offspring */
  public expectedOffspringCount: number = 1;

  // =========================================================================
  // Risk Assessment
  // =========================================================================

  /** Identified risk factors */
  public riskFactors: PregnancyRiskFactor[] = [];

  /** Current complications */
  public complications: string[] = [];

  /** Overall risk modifier (1.0 = normal, higher = more risk) */
  public riskModifier: number = 1.0;

  /** Recommended care level */
  public recommendedCare: CareLevel = 'normal';

  // =========================================================================
  // Prenatal Care
  // =========================================================================

  /** History of prenatal checkups */
  public checkupHistory: PrenatalCheckup[] = [];

  /** Tick of last checkup */
  public lastCheckupTick: Tick | null = null;

  /** Has received adequate prenatal care? */
  public adequatePrenatalCare: boolean = false;

  // =========================================================================
  // Modifiers
  // =========================================================================

  /** Food need modifier during pregnancy (e.g., 1.25 = 25% more) */
  public foodNeedModifier: number = 1.25;

  /** Energy need modifier during pregnancy */
  public energyNeedModifier: number = 1.15;

  /** Movement speed modifier (decreases in third trimester) */
  public speedModifier: number = 1.0;

  // =========================================================================
  // Methods
  // =========================================================================

  /**
   * Initialize pregnancy with conception data
   */
  public initialize(
    fatherId: string,
    conceptionTick: Tick,
    gestationLength: number = 270 * 20 * 60
  ): void {
    this.fatherId = fatherId;
    this.conceptionTick = conceptionTick;
    this.gestationLength = gestationLength;
    this.expectedDueDate = conceptionTick + gestationLength;
    this.gestationProgress = 0;
    this.daysRemaining = Math.floor(gestationLength / (20 * 60)); // ticks to days
    this.trimester = 1;
    this.fetalHealth = 1.0;
    this.fetalHeartbeat = true;
    this.fetalPosition = 'unknown';
    this.riskFactors = [];
    this.complications = [];
    this.riskModifier = 1.0;
    this.symptoms.morningSickness = true; // Common in first trimester
    this.symptoms.fatigue = true;
  }

  /**
   * Update pregnancy state based on current tick
   */
  public update(currentTick: Tick): void {
    const elapsed = currentTick - this.conceptionTick;
    this.gestationProgress = Math.min(1, elapsed / this.gestationLength);
    this.daysRemaining = Math.max(0, Math.floor((this.expectedDueDate - currentTick) / (20 * 60)));

    // Update trimester
    if (this.gestationProgress < 0.33) {
      this.trimester = 1;
    } else if (this.gestationProgress < 0.67) {
      this.trimester = 2;
    } else {
      this.trimester = 3;
    }

    // Update symptoms based on trimester
    this.updateSymptoms();

    // Update movement modifier in third trimester
    if (this.trimester === 3) {
      this.speedModifier = 0.8; // 20% slower
    } else {
      this.speedModifier = 1.0;
    }
  }

  /**
   * Update symptoms based on trimester
   */
  private updateSymptoms(): void {
    switch (this.trimester) {
      case 1:
        this.symptoms.morningSickness = true;
        this.symptoms.fatigue = true;
        this.symptoms.backPain = false;
        this.symptoms.swelling = false;
        break;
      case 2:
        this.symptoms.morningSickness = false; // Usually subsides
        this.symptoms.fatigue = false;
        this.symptoms.backPain = true;
        this.symptoms.cravings = true;
        break;
      case 3:
        this.symptoms.fatigue = true;
        this.symptoms.backPain = true;
        this.symptoms.swelling = true;
        this.symptoms.cravings = true;
        break;
    }
  }

  /**
   * Record a prenatal checkup
   */
  public recordCheckup(checkup: PrenatalCheckup): void {
    this.checkupHistory.push(checkup);
    this.lastCheckupTick = checkup.tick;

    // Merge newly identified risk factors
    for (const factor of checkup.riskFactorsIdentified) {
      if (!this.riskFactors.includes(factor)) {
        this.riskFactors.push(factor);
      }
    }

    // Update fetal data
    this.fetalHeartbeat = checkup.fetalHeartbeat;
    this.fetalPosition = checkup.fetalPosition;
    this.fetalHealth = checkup.fetalHealth;

    // Adequate care = at least 4 checkups during pregnancy
    if (this.checkupHistory.length >= 4) {
      this.adequatePrenatalCare = true;
    }

    // Recalculate risk modifier
    this.calculateRiskModifier();
  }

  /**
   * Calculate overall risk modifier based on risk factors and care
   */
  public calculateRiskModifier(): void {
    let risk = 1.0;

    // Each risk factor increases risk
    for (const factor of this.riskFactors) {
      switch (factor) {
        case 'advanced_maternal_age':
        case 'young_maternal_age':
          risk += 0.2;
          break;
        case 'multiple_gestation':
          risk += 0.4;
          break;
        case 'previous_complications':
          risk += 0.3;
          break;
        case 'malnutrition':
          risk += 0.5;
          break;
        case 'breech_presentation':
          risk += 0.3;
          break;
        case 'preeclampsia':
        case 'placenta_previa':
          risk += 0.6;
          break;
        default:
          risk += 0.15;
      }
    }

    // Good prenatal care reduces risk
    if (this.adequatePrenatalCare) {
      risk *= 0.6; // 40% reduction
    }

    this.riskModifier = risk;

    // Update recommended care level
    if (risk >= 2.0) {
      this.recommendedCare = 'high_risk';
    } else if (risk >= 1.3) {
      this.recommendedCare = 'moderate_risk';
    } else {
      this.recommendedCare = 'normal';
    }
  }

  /**
   * Apply damage to fetal health (e.g., from malnutrition)
   */
  public damageFetalHealth(amount: number, cause: string): void {
    this.fetalHealth = Math.max(0, this.fetalHealth - amount);

    if (!this.complications.includes(cause)) {
      this.complications.push(cause);
    }

    // Critical damage
    if (this.fetalHealth < 0.3) {
      this.fetalHeartbeat = false;
    }
  }

  /**
   * Check if pregnancy is ready for labor
   */
  public isReadyForLabor(): boolean {
    return this.gestationProgress >= 0.95; // 95% through gestation
  }

  /**
   * Check if labor would be premature
   */
  public isPremature(): boolean {
    return this.gestationProgress < 0.85; // Less than 37 weeks equivalent
  }
}

// ============================================================================
// Factory Function
// ============================================================================

/**
 * Create a new PregnancyComponent
 */
export function createPregnancyComponent(
  fatherId: string,
  conceptionTick: Tick,
  gestationLength?: number
): PregnancyComponent {
  const component = new PregnancyComponent();
  component.initialize(fatherId, conceptionTick, gestationLength);
  return component;
}
