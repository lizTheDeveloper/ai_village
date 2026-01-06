/**
 * InfantComponent - Tracks newborn health and needs
 *
 * Added at birth, removed when child matures (around 1 year game time).
 * Handles:
 * - Feeding/nursing dependency
 * - Health vulnerabilities
 * - Growth and development
 * - Bonding with caregivers
 */

import { ComponentBase } from '@ai-village/core';
import type { Tick } from '@ai-village/core';

// ============================================================================
// Infant Types
// ============================================================================

/** Birth weight category */
export type BirthWeight = 'very_low' | 'low' | 'normal' | 'high';

/** Infant vulnerabilities */
export type InfantVulnerability =
  | 'respiratory'     // Premature lungs
  | 'feeding'         // Difficulty nursing
  | 'temperature'     // Can't regulate body temp
  | 'infection'       // Weak immune system
  | 'jaundice';       // Bilirubin issues

/** Developmental milestones */
export interface DevelopmentalMilestones {
  eyeContact: boolean;
  socialSmile: boolean;
  holdHeadUp: boolean;
  rollOver: boolean;
  sitUp: boolean;
  crawl: boolean;
  walk: boolean;
}

// ============================================================================
// The Component
// ============================================================================

/**
 * InfantComponent tracks newborn health, feeding, and development.
 */
export class InfantComponent extends ComponentBase {
  public readonly type = 'infant';

  // =========================================================================
  // Birth Data
  // =========================================================================

  /** Birth tick */
  public bornAt: Tick = 0;

  /** Was this a premature birth? */
  public premature: boolean = false;

  /** Gestational age at birth in weeks */
  public gestationalAge: number = 40;

  /** Birth weight category */
  public birthWeight: BirthWeight = 'normal';

  /** Mother's entity ID */
  public motherId: string = '';

  /** Father's entity ID */
  public fatherId: string = '';

  // =========================================================================
  // Health
  // =========================================================================

  /** Overall health (0-1) */
  public health: number = 1.0;

  /** Vulnerabilities from premature/difficult birth */
  public vulnerabilities: InfantVulnerability[] = [];

  /** Is infant currently sick? */
  public sick: boolean = false;

  /** Current illness if any */
  public illness: string | null = null;

  // =========================================================================
  // Feeding
  // =========================================================================

  /** Entity ID providing nursing (mother or wet nurse) */
  public nursingSource: string | null = null;

  /** Hunger level (0-1, 0 = starving) */
  public hunger: number = 1.0;

  /** Last fed tick */
  public lastFedAt: Tick = 0;

  /** How well is infant feeding? (0-1) */
  public feedingSuccess: number = 1.0;

  /** Has been weaned? */
  public weaned: boolean = false;

  // =========================================================================
  // Care
  // =========================================================================

  /** Primary caregiver ID (usually mother) */
  public primaryCaregiverId: string | null = null;

  /** Bonding strength with primary caregiver (0-1) */
  public bondingStrength: number = 0.5;

  /** Temperature comfort (0-1, 0.5 = comfortable) */
  public temperatureComfort: number = 0.5;

  /** Sleep quality (0-1) */
  public sleepQuality: number = 0.7;

  // =========================================================================
  // Development
  // =========================================================================

  /** Age in game days */
  public ageDays: number = 0;

  /** Developmental milestones achieved */
  public milestones: DevelopmentalMilestones = {
    eyeContact: false,
    socialSmile: false,
    holdHeadUp: false,
    rollOver: false,
    sitUp: false,
    crawl: false,
    walk: false,
  };

  /** Growth rate modifier (1.0 = normal) */
  public growthRate: number = 1.0;

  // =========================================================================
  // Methods
  // =========================================================================

  /**
   * Initialize infant at birth
   */
  public initialize(
    bornAt: Tick,
    motherId: string,
    fatherId: string,
    premature: boolean,
    gestationalAge: number
  ): void {
    this.bornAt = bornAt;
    this.motherId = motherId;
    this.fatherId = fatherId;
    this.premature = premature;
    this.gestationalAge = gestationalAge;
    this.ageDays = 0;

    // Set initial nursing source to mother
    this.nursingSource = motherId;
    this.primaryCaregiverId = motherId;

    // Determine birth weight based on gestation and nutrition
    this.determineBirthWeight();

    // Set vulnerabilities for premature infants
    if (premature) {
      this.setupPrematureVulnerabilities();
    }

    // Initial health
    this.health = this.premature ? 0.7 : 1.0;
    this.hunger = 1.0;
    this.lastFedAt = bornAt;
  }

  /**
   * Determine birth weight category
   */
  private determineBirthWeight(): void {
    if (this.gestationalAge < 32) {
      this.birthWeight = 'very_low';
    } else if (this.gestationalAge < 37) {
      this.birthWeight = 'low';
    } else if (this.gestationalAge > 42) {
      this.birthWeight = 'high'; // Post-term babies tend to be larger
    } else {
      this.birthWeight = 'normal';
    }
  }

  /**
   * Set up vulnerabilities for premature infants
   */
  private setupPrematureVulnerabilities(): void {
    // Earlier = more vulnerabilities
    if (this.gestationalAge < 34) {
      this.vulnerabilities.push('respiratory');
    }
    if (this.gestationalAge < 36) {
      this.vulnerabilities.push('temperature');
      this.vulnerabilities.push('feeding');
    }
    if (this.gestationalAge < 37) {
      this.vulnerabilities.push('infection');
    }

    // Premature infants grow slower initially
    this.growthRate = 0.8;
    this.feedingSuccess = 0.7;
  }

  /**
   * Update infant state
   */
  public update(currentTick: Tick, deltaDays: number): void {
    this.ageDays += deltaDays;

    // Update hunger
    this.updateHunger(currentTick);

    // Update health
    this.updateHealth();

    // Check developmental milestones
    this.checkMilestones();

    // Recover from premature vulnerabilities over time
    if (this.premature && this.ageDays > 60) {
      this.recoverFromPrematurity();
    }
  }

  /**
   * Update hunger level
   */
  private updateHunger(currentTick: Tick): void {
    const ticksSinceFed = currentTick - this.lastFedAt;
    const hoursSinceFed = ticksSinceFed / (20 * 60); // Assuming 20 TPS

    // Infants need to eat every 2-3 hours
    if (hoursSinceFed > 3) {
      this.hunger = Math.max(0, this.hunger - 0.1);
    }

    // Prolonged hunger damages health
    if (this.hunger < 0.3) {
      this.health = Math.max(0, this.health - 0.01);
    }
  }

  /**
   * Update health based on conditions
   */
  private updateHealth(): void {
    // Good care improves health
    if (this.hunger > 0.7 && this.bondingStrength > 0.6) {
      this.health = Math.min(1, this.health + 0.01);
    }

    // Vulnerabilities can cause health issues
    for (const vuln of this.vulnerabilities) {
      if (Math.random() < 0.001) { // Small chance per update
        this.triggerVulnerabilityIssue(vuln);
      }
    }
  }

  /**
   * Trigger health issue from vulnerability
   */
  private triggerVulnerabilityIssue(vulnerability: InfantVulnerability): void {
    switch (vulnerability) {
      case 'respiratory':
        this.sick = true;
        this.illness = 'breathing_difficulty';
        this.health -= 0.1;
        break;
      case 'infection':
        this.sick = true;
        this.illness = 'fever';
        this.health -= 0.15;
        break;
      case 'feeding':
        this.feedingSuccess *= 0.9;
        break;
      case 'temperature':
        this.temperatureComfort -= 0.2;
        break;
    }
  }

  /**
   * Check for developmental milestones based on age
   */
  private checkMilestones(): void {
    // Milestones are approximate; premature babies may be delayed
    const adjustedAge = this.premature
      ? this.ageDays - ((40 - this.gestationalAge) * 7)
      : this.ageDays;

    if (adjustedAge >= 14 && !this.milestones.eyeContact) {
      this.milestones.eyeContact = true;
    }
    if (adjustedAge >= 42 && !this.milestones.socialSmile) {
      this.milestones.socialSmile = true;
    }
    if (adjustedAge >= 90 && !this.milestones.holdHeadUp) {
      this.milestones.holdHeadUp = true;
    }
    if (adjustedAge >= 120 && !this.milestones.rollOver) {
      this.milestones.rollOver = true;
    }
    if (adjustedAge >= 180 && !this.milestones.sitUp) {
      this.milestones.sitUp = true;
    }
    if (adjustedAge >= 270 && !this.milestones.crawl) {
      this.milestones.crawl = true;
    }
    if (adjustedAge >= 365 && !this.milestones.walk) {
      this.milestones.walk = true;
    }
  }

  /**
   * Recover from premature vulnerabilities over time
   */
  private recoverFromPrematurity(): void {
    // Gradually remove vulnerabilities
    if (this.vulnerabilities.length > 0 && Math.random() < 0.01) {
      this.vulnerabilities.pop();
    }

    // Normalize growth rate
    this.growthRate = Math.min(1, this.growthRate + 0.01);
    this.feedingSuccess = Math.min(1, this.feedingSuccess + 0.01);
  }

  /**
   * Feed the infant
   */
  public feed(tick: Tick, sourceQuality: number = 1.0): void {
    this.lastFedAt = tick;
    const feedAmount = 0.4 * this.feedingSuccess * sourceQuality;
    this.hunger = Math.min(1, this.hunger + feedAmount);

    // Good feeding improves bonding
    this.bondingStrength = Math.min(1, this.bondingStrength + 0.02);
  }

  /**
   * Assign a wet nurse
   */
  public assignWetNurse(wetNurseId: string): void {
    this.nursingSource = wetNurseId;
  }

  /**
   * Check if infant needs feeding
   */
  public needsFeeding(): boolean {
    return this.hunger < 0.5;
  }

  /**
   * Check if infant is ready to be weaned
   */
  public canBeWeaned(): boolean {
    return this.ageDays >= 180; // ~6 months
  }

  /**
   * Wean the infant
   */
  public wean(): void {
    this.weaned = true;
    this.nursingSource = null;
  }

  /**
   * Check if infant has matured out of infancy
   */
  public hasMaturated(): boolean {
    return this.ageDays >= 365 && this.milestones.walk;
  }
}

// ============================================================================
// Factory Function
// ============================================================================

/**
 * Create a new InfantComponent
 */
export function createInfantComponent(
  bornAt: Tick,
  motherId: string,
  fatherId: string,
  premature: boolean = false,
  gestationalAge: number = 40
): InfantComponent {
  const component = new InfantComponent();
  component.initialize(bornAt, motherId, fatherId, premature, gestationalAge);
  return component;
}
