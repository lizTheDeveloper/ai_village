/**
 * LaborComponent - Tracks active labor and delivery
 *
 * Added when labor begins, removed after delivery is complete.
 * Handles:
 * - Labor stages (early → active → transition → delivery)
 * - Complications and their severity
 * - Midwife attendance and intervention
 * - Birth outcomes
 */

import { ComponentBase } from '../../ecs/Component.js';
import type { Tick } from '../../types.js';
import type { FetalPosition, PregnancyRiskFactor } from './PregnancyComponent.js';

// ============================================================================
// Labor Types
// ============================================================================

/** Stages of labor */
export type LaborStage =
  | 'early'        // Contractions starting, cervix dilating 0-3cm
  | 'active'       // Regular contractions, cervix 4-7cm
  | 'transition'   // Intense contractions, cervix 8-10cm
  | 'delivery'     // Pushing, baby being born
  | 'afterbirth';  // Placenta delivery

/** Severity of complications */
export type ComplicationSeverity =
  | 'minor'        // Manageable without intervention
  | 'major'        // Requires skilled assistance
  | 'critical'     // Life-threatening without treatment
  | 'emergency';   // Immediate intervention or death

/** Types of birth complications */
export type BirthComplication =
  | 'hemorrhage'       // Excessive bleeding (critical)
  | 'dystocia'         // Difficult/obstructed labor (major)
  | 'cord_prolapse'    // Umbilical cord ahead of baby (emergency)
  | 'cord_compression' // Cord wrapped around baby (major)
  | 'placental_abruption' // Placenta detaching early (critical)
  | 'uterine_rupture'  // Uterus tearing (emergency)
  | 'shoulder_dystocia' // Shoulder stuck (major)
  | 'fetal_distress'   // Baby in distress (critical)
  | 'prolonged_labor'  // Labor lasting too long (major)
  | 'failure_to_progress' // Labor stalling (minor→major)
  | 'perineal_tear'    // Tearing during delivery (minor→major)
  | 'infection'        // Chorioamnionitis (major)
  | 'exhaustion';      // Mother too exhausted (minor→major)

/** Complication with metadata */
export interface ActiveComplication {
  type: BirthComplication;
  severity: ComplicationSeverity;
  onset: Tick;
  treated: boolean;
  treatmentSuccess: boolean | null;
  treatedBy: string | null;
}

/** Delivery method */
export type DeliveryMethod =
  | 'natural'          // Normal vaginal delivery
  | 'assisted'         // Vaginal with midwife intervention
  | 'breech'           // Breech vaginal delivery
  | 'turned_to_cephalic' // Baby turned before delivery
  | 'emergency';       // Emergency intervention needed

// ============================================================================
// The Component
// ============================================================================

/**
 * LaborComponent tracks active labor and delivery process.
 */
export class LaborComponent extends ComponentBase {
  public readonly type = 'labor';

  // =========================================================================
  // Basic Tracking
  // =========================================================================

  /** When labor started */
  public startedAt: Tick = 0;

  /** Current labor stage */
  public stage: LaborStage = 'early';

  /** Progress within current stage (0-1) */
  public stageProgress: number = 0;

  /** Overall labor progress (0-1) */
  public overallProgress: number = 0;

  /** Is this a premature labor? */
  public premature: boolean = false;

  /** Gestational age in weeks at labor onset */
  public gestationalAgeWeeks: number = 40;

  // =========================================================================
  // Fetal State
  // =========================================================================

  /** Baby's position */
  public fetalPosition: FetalPosition = 'cephalic';

  /** Is baby in distress? */
  public fetalDistress: boolean = false;

  /** Fetal heart rate (normal: 110-160 BPM) */
  public fetalHeartRate: number = 140;

  // =========================================================================
  // Maternal State
  // =========================================================================

  /** Blood loss in arbitrary units (0 = none, 10+ = critical) */
  public bloodLoss: number = 0;

  /** Maternal exhaustion level (0-1) */
  public exhaustion: number = 0;

  /** Pain level (0-1) */
  public painLevel: number = 0;

  /** Contraction intensity (0-1) */
  public contractionIntensity: number = 0;

  /** Minutes between contractions */
  public contractionInterval: number = 15;

  // =========================================================================
  // Risk & Complications
  // =========================================================================

  /** Risk factors inherited from pregnancy */
  public riskFactors: PregnancyRiskFactor[] = [];

  /** Overall risk modifier (1.0 = normal) */
  public riskModifier: number = 1.0;

  /** Active complications */
  public complications: ActiveComplication[] = [];

  /** Overall severity of worst complication */
  public severity: ComplicationSeverity | null = null;

  // =========================================================================
  // Assistance
  // =========================================================================

  /** Is a midwife attending? */
  public attended: boolean = false;

  /** ID of attending midwife */
  public attendingMidwifeId: string | null = null;

  /** Midwife's skill level (1-5) */
  public midwifeSkillLevel: number = 0;

  /** Progress rate modifier (higher = faster labor) */
  public progressRate: number = 1.0;

  /** Complication risk modifier from assistance */
  public complicationRiskModifier: number = 1.0;

  // =========================================================================
  // Location
  // =========================================================================

  /** Is labor happening in a birthing hut? */
  public inBirthingHut: boolean = false;

  /** Building bonus from location */
  public buildingBonus: number = 0;

  /** Available supplies for treatment */
  public availableSupplies: string[] = [];

  // =========================================================================
  // Outcome (filled after delivery)
  // =========================================================================

  /** How delivery was accomplished */
  public deliveryMethod: DeliveryMethod | null = null;

  /** Was the delivery successful? */
  public deliverySuccess: boolean | null = null;

  /** IDs of offspring born */
  public offspringIds: string[] = [];

  // =========================================================================
  // Methods
  // =========================================================================

  /**
   * Initialize labor
   */
  public initialize(
    startedAt: Tick,
    fetalPosition: FetalPosition,
    premature: boolean,
    gestationalAgeWeeks: number,
    riskFactors: PregnancyRiskFactor[]
  ): void {
    this.startedAt = startedAt;
    this.stage = 'early';
    this.stageProgress = 0;
    this.overallProgress = 0;
    this.fetalPosition = fetalPosition;
    this.premature = premature;
    this.gestationalAgeWeeks = gestationalAgeWeeks;
    this.riskFactors = [...riskFactors];
    this.complications = [];
    this.severity = null;
    this.attended = false;
    this.attendingMidwifeId = null;

    // Calculate risk modifier
    this.calculateRiskModifier();

    // Initial contraction settings
    this.contractionInterval = 15; // Minutes
    this.contractionIntensity = 0.2;
    this.painLevel = 0.2;
  }

  /**
   * Calculate overall risk modifier
   */
  public calculateRiskModifier(): void {
    let risk = 1.0;

    // Premature adds significant risk
    if (this.premature) {
      risk += 0.5;
    }

    // Breech adds risk
    if (this.fetalPosition === 'breech') {
      risk += 0.3;
    } else if (this.fetalPosition === 'transverse') {
      risk += 0.5;
    }

    // Each risk factor adds to risk
    risk += this.riskFactors.length * 0.1;

    this.riskModifier = risk;
  }

  /**
   * Update labor progress
   */
  public update(deltaTicks: number): void {
    // Calculate progress rate
    const baseProgressRate = 0.0001; // Per tick
    const adjustedRate = baseProgressRate * this.progressRate;

    // Update stage progress
    this.stageProgress += adjustedRate * deltaTicks;

    // Check for stage transitions
    if (this.stageProgress >= 1.0) {
      this.advanceStage();
    }

    // Update overall progress
    this.updateOverallProgress();

    // Update contractions
    this.updateContractions();

    // Update exhaustion
    this.exhaustion = Math.min(1, this.exhaustion + 0.0001 * deltaTicks);

    // Check fetal heart rate
    if (this.fetalDistress) {
      this.fetalHeartRate = Math.max(80, this.fetalHeartRate - 0.1);
    }
  }

  /**
   * Advance to next labor stage
   */
  private advanceStage(): void {
    this.stageProgress = 0;

    switch (this.stage) {
      case 'early':
        this.stage = 'active';
        this.progressRate *= 1.2; // Active labor often faster
        break;
      case 'active':
        this.stage = 'transition';
        this.painLevel = 0.9;
        this.contractionIntensity = 0.9;
        break;
      case 'transition':
        this.stage = 'delivery';
        this.contractionInterval = 2;
        break;
      case 'delivery':
        this.stage = 'afterbirth';
        break;
    }
  }

  /**
   * Update overall progress based on stage
   */
  private updateOverallProgress(): void {
    const stageWeights = {
      early: 0.3,
      active: 0.3,
      transition: 0.2,
      delivery: 0.15,
      afterbirth: 0.05,
    };

    const stageOrder: LaborStage[] = ['early', 'active', 'transition', 'delivery', 'afterbirth'];
    const currentIndex = stageOrder.indexOf(this.stage);

    let progress = 0;
    for (let i = 0; i < currentIndex; i++) {
      const stage = stageOrder[i];
      if (stage) {
        progress += stageWeights[stage];
      }
    }
    progress += this.stageProgress * stageWeights[this.stage];

    this.overallProgress = Math.min(1, progress);
  }

  /**
   * Update contraction state
   */
  private updateContractions(): void {
    // Contractions get closer together as labor progresses
    switch (this.stage) {
      case 'early':
        this.contractionInterval = 15 - (this.stageProgress * 10);
        this.contractionIntensity = 0.2 + (this.stageProgress * 0.2);
        this.painLevel = 0.2 + (this.stageProgress * 0.2);
        break;
      case 'active':
        this.contractionInterval = 5 - (this.stageProgress * 2);
        this.contractionIntensity = 0.4 + (this.stageProgress * 0.3);
        this.painLevel = 0.4 + (this.stageProgress * 0.3);
        break;
      case 'transition':
        this.contractionInterval = 3 - (this.stageProgress * 1);
        this.contractionIntensity = 0.7 + (this.stageProgress * 0.3);
        this.painLevel = 0.7 + (this.stageProgress * 0.3);
        break;
      case 'delivery':
        this.contractionInterval = 2;
        this.contractionIntensity = 1.0;
        break;
    }
  }

  /**
   * Add a complication
   */
  public addComplication(type: BirthComplication): ActiveComplication {
    const severityMap: Record<BirthComplication, ComplicationSeverity> = {
      hemorrhage: 'critical',
      dystocia: 'major',
      cord_prolapse: 'emergency',
      cord_compression: 'major',
      placental_abruption: 'critical',
      uterine_rupture: 'emergency',
      shoulder_dystocia: 'major',
      fetal_distress: 'critical',
      prolonged_labor: 'major',
      failure_to_progress: 'minor',
      perineal_tear: 'minor',
      infection: 'major',
      exhaustion: 'minor',
    };

    const complication: ActiveComplication = {
      type,
      severity: severityMap[type],
      onset: 0, // Caller should set this
      treated: false,
      treatmentSuccess: null,
      treatedBy: null,
    };

    this.complications.push(complication);

    // Update overall severity
    this.updateSeverity();

    // Certain complications cause immediate effects
    if (type === 'hemorrhage') {
      this.bloodLoss += 5;
    }
    if (type === 'fetal_distress' || type === 'cord_compression') {
      this.fetalDistress = true;
    }

    return complication;
  }

  /**
   * Update overall severity to worst complication
   */
  private updateSeverity(): void {
    const severityOrder: ComplicationSeverity[] = ['minor', 'major', 'critical', 'emergency'];

    let worstIndex = -1;
    for (const comp of this.complications) {
      if (!comp.treated || !comp.treatmentSuccess) {
        const index = severityOrder.indexOf(comp.severity);
        if (index > worstIndex) {
          worstIndex = index;
        }
      }
    }

    this.severity = worstIndex >= 0 ? (severityOrder[worstIndex] || null) : null;
  }

  /**
   * Treat a complication
   */
  public treatComplication(
    complicationType: BirthComplication,
    midwifeId: string,
    skillLevel: number,
    hasSupplies: boolean
  ): boolean {
    const complication = this.complications.find(c => c.type === complicationType && !c.treated);
    if (!complication) return false;

    complication.treated = true;
    complication.treatedBy = midwifeId;

    // Calculate success chance based on skill and supplies
    let successChance = 0.5 + (skillLevel * 0.1); // 60-100% based on skill

    if (hasSupplies) {
      successChance += 0.1;
    }

    // Emergency complications are harder
    if (complication.severity === 'emergency') {
      successChance -= 0.2;
    } else if (complication.severity === 'critical') {
      successChance -= 0.1;
    }

    complication.treatmentSuccess = Math.random() < successChance;

    // If treatment succeeds, reduce effects
    if (complication.treatmentSuccess) {
      if (complicationType === 'hemorrhage') {
        this.bloodLoss = Math.max(0, this.bloodLoss - 3);
      }
      if (complicationType === 'fetal_distress') {
        this.fetalDistress = false;
        this.fetalHeartRate = 130;
      }
    }

    this.updateSeverity();
    return complication.treatmentSuccess;
  }

  /**
   * Set midwife attendance
   */
  public setAttendance(midwifeId: string, skillLevel: number): void {
    this.attended = true;
    this.attendingMidwifeId = midwifeId;
    this.midwifeSkillLevel = skillLevel;

    // Skilled attendance improves outcomes
    this.progressRate = 1.0 + (skillLevel * 0.1); // Up to 50% faster with skill 5
    this.complicationRiskModifier = 1.0 - (skillLevel * 0.1); // Up to 50% reduction
  }

  /**
   * Check if labor is stalling
   */
  public isStalling(): boolean {
    // If in same stage for too long with no progress
    return this.stageProgress < 0.1 && this.exhaustion > 0.5;
  }

  /**
   * Check if ready for delivery
   */
  public isReadyForDelivery(): boolean {
    return this.stage === 'delivery' && this.stageProgress >= 0.8;
  }

  /**
   * Complete delivery
   */
  public completeDelivery(offspringIds: string[], method: DeliveryMethod): void {
    this.deliverySuccess = true;
    this.offspringIds = offspringIds;
    this.deliveryMethod = method;
    this.stage = 'afterbirth';
  }

  /**
   * Calculate complication probability for this tick
   */
  public getComplicationChance(): number {
    const baseChance = 0.0001; // Per tick
    return baseChance * this.riskModifier * this.complicationRiskModifier;
  }
}

// ============================================================================
// Factory Function
// ============================================================================

/**
 * Create a new LaborComponent
 */
export function createLaborComponent(
  startedAt: Tick,
  fetalPosition: FetalPosition,
  premature: boolean,
  gestationalAgeWeeks: number,
  riskFactors: PregnancyRiskFactor[]
): LaborComponent {
  const component = new LaborComponent();
  component.initialize(startedAt, fetalPosition, premature, gestationalAgeWeeks, riskFactors);
  return component;
}
