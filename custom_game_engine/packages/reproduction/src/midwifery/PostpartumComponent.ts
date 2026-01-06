/**
 * PostpartumComponent - Tracks maternal recovery after birth
 *
 * Added after delivery is complete, removed after full recovery.
 * Handles:
 * - Physical recovery period (6 weeks default)
 * - Work capacity limitations
 * - Postpartum complications (infection, hemorrhage)
 * - Emotional state
 */

import { ComponentBase } from '@ai-village/core';
import type { Tick } from '@ai-village/core';

// ============================================================================
// Postpartum Types
// ============================================================================

/** Postpartum complications */
export type PostpartumComplication =
  | 'anemia'            // From blood loss during birth
  | 'infection'         // Puerperal fever
  | 'hemorrhage'        // Delayed postpartum bleeding
  | 'mastitis'          // Breast infection
  | 'perineal_pain'     // From tearing during delivery
  | 'uterine_prolapse'  // Weakened pelvic floor
  | 'blood_clots';      // DVT risk

/** Emotional state tracking */
export interface PostpartumMood {
  /** Normal adjustment period (baby blues) */
  babyBlues: boolean;
  /** More serious depression */
  depression: boolean;
  /** Bonding with infant */
  bondingStrength: number; // 0-1
}

// ============================================================================
// The Component
// ============================================================================

/**
 * PostpartumComponent tracks maternal recovery after birth.
 */
export class PostpartumComponent extends ComponentBase {
  public readonly type = 'postpartum';

  // =========================================================================
  // Recovery Tracking
  // =========================================================================

  /** When recovery period started (birth tick) */
  public startedAt: Tick = 0;

  /** Total recovery period in days */
  public recoveryPeriodDays: number = 42; // 6 weeks

  /** Days remaining until full recovery */
  public recoveryDaysRemaining: number = 42;

  /** Recovery progress (0-1) */
  public recoveryProgress: number = 0;

  /** Is recovery complete? */
  public fullyRecovered: boolean = false;

  // =========================================================================
  // Capacity
  // =========================================================================

  /** Current work capacity (0-1, 1 = full capacity) */
  public workCapacity: number = 0.3;

  /** Movement speed modifier */
  public speedModifier: number = 0.8;

  /** Can carry heavy items? */
  public canCarryHeavy: boolean = false;

  // =========================================================================
  // Physical Health
  // =========================================================================

  /** Complications from birth carrying over */
  public complications: PostpartumComplication[] = [];

  /** Infection risk (0-1) */
  public infectionRisk: number = 0.1;

  /** Blood loss severity still affecting (0 = none) */
  public anemiaLevel: number = 0;

  /** Pain level (0-1) */
  public painLevel: number = 0.5;

  /** Sleep quality impact (0-1, 0 = poor) */
  public sleepQuality: number = 0.5;

  // =========================================================================
  // Emotional State
  // =========================================================================

  /** Mood tracking */
  public mood: PostpartumMood = {
    babyBlues: true,
    depression: false,
    bondingStrength: 0.5,
  };

  /** ID of newborn infant */
  public infantId: string | null = null;

  // =========================================================================
  // Birth Context
  // =========================================================================

  /** Was birth complicated? */
  public complicatedBirth: boolean = false;

  /** Number of offspring from this birth */
  public offspringCount: number = 1;

  // =========================================================================
  // Methods
  // =========================================================================

  /**
   * Initialize postpartum recovery
   */
  public initialize(
    startedAt: Tick,
    infantId: string,
    complicatedBirth: boolean,
    offspringCount: number = 1
  ): void {
    this.startedAt = startedAt;
    this.infantId = infantId;
    this.complicatedBirth = complicatedBirth;
    this.offspringCount = offspringCount;

    // Extended recovery for complicated births
    if (complicatedBirth) {
      this.recoveryPeriodDays = 56; // 8 weeks
      this.workCapacity = 0.2;
      this.infectionRisk = 0.15;
      this.painLevel = 0.7;
    }

    // Multiple births are harder
    if (offspringCount > 1) {
      this.recoveryPeriodDays += 7 * (offspringCount - 1);
      this.workCapacity -= 0.1;
    }

    this.recoveryDaysRemaining = this.recoveryPeriodDays;
    this.recoveryProgress = 0;
    this.fullyRecovered = false;
  }

  /**
   * Update recovery state
   */
  public update(deltaDays: number): void {
    this.recoveryDaysRemaining = Math.max(0, this.recoveryDaysRemaining - deltaDays);
    this.recoveryProgress = 1 - (this.recoveryDaysRemaining / this.recoveryPeriodDays);

    // Gradually improve capacity
    this.updateCapacity();

    // Reduce risks over time
    this.updateRisks();

    // Update mood
    this.updateMood();

    // Check for full recovery
    if (this.recoveryDaysRemaining <= 0) {
      this.fullyRecovered = true;
      this.workCapacity = 1.0;
      this.speedModifier = 1.0;
      this.canCarryHeavy = true;
      this.painLevel = 0;
      this.infectionRisk = 0;
    }
  }

  /**
   * Update work capacity based on recovery progress
   */
  private updateCapacity(): void {
    if (this.fullyRecovered) return;

    // Capacity increases in stages
    if (this.recoveryProgress < 0.25) {
      // First week - very limited
      this.workCapacity = 0.3;
      this.canCarryHeavy = false;
    } else if (this.recoveryProgress < 0.5) {
      // Weeks 2-3
      this.workCapacity = 0.5;
      this.canCarryHeavy = false;
    } else if (this.recoveryProgress < 0.75) {
      // Weeks 3-4
      this.workCapacity = 0.7;
      this.canCarryHeavy = true;
    } else {
      // Weeks 5-6
      this.workCapacity = 0.9;
      this.canCarryHeavy = true;
    }

    // Complications reduce capacity
    if (this.anemiaLevel > 0.3) {
      this.workCapacity *= 0.7;
    }
    if (this.complications.includes('infection')) {
      this.workCapacity *= 0.5;
    }

    // Speed improves with recovery
    this.speedModifier = 0.8 + (this.recoveryProgress * 0.2);
  }

  /**
   * Update health risks over time
   */
  private updateRisks(): void {
    // Infection risk decreases rapidly in first week
    if (this.recoveryProgress > 0.15) {
      this.infectionRisk = Math.max(0, this.infectionRisk - 0.02);
    }

    // Anemia slowly resolves
    this.anemiaLevel = Math.max(0, this.anemiaLevel - 0.01);

    // Pain decreases
    this.painLevel = Math.max(0, this.painLevel - 0.02);

    // Sleep quality improves
    this.sleepQuality = Math.min(1, 0.3 + this.recoveryProgress * 0.7);
  }

  /**
   * Update emotional state
   */
  private updateMood(): void {
    // Baby blues typically resolve in 2 weeks
    if (this.recoveryProgress > 0.33) {
      this.mood.babyBlues = false;
    }

    // Bonding strengthens over time with care
    this.mood.bondingStrength = Math.min(1, 0.3 + this.recoveryProgress * 0.7);

    // Depression risk if isolated or complications
    if (this.complications.length >= 2 || this.sleepQuality < 0.3) {
      // 10% chance of postpartum depression in difficult circumstances
      if (this.recoveryProgress > 0.15 && !this.mood.depression) {
        if (Math.random() < 0.1) {
          this.mood.depression = true;
        }
      }
    }
  }

  /**
   * Add a postpartum complication
   */
  public addComplication(complication: PostpartumComplication): void {
    if (!this.complications.includes(complication)) {
      this.complications.push(complication);
    }

    // Effect of specific complications
    switch (complication) {
      case 'anemia':
        this.anemiaLevel = 0.5;
        break;
      case 'infection':
        this.workCapacity *= 0.5;
        this.recoveryPeriodDays += 14;
        break;
      case 'hemorrhage':
        this.anemiaLevel = 0.7;
        this.workCapacity *= 0.4;
        break;
      case 'mastitis':
        this.painLevel = Math.min(1, this.painLevel + 0.3);
        break;
    }
  }

  /**
   * Treat a complication
   */
  public treatComplication(complication: PostpartumComplication): boolean {
    const index = this.complications.indexOf(complication);
    if (index === -1) return false;

    // Treatment success based on complication type
    const successChance = complication === 'infection' ? 0.7 : 0.9;

    if (Math.random() < successChance) {
      this.complications.splice(index, 1);
      return true;
    }
    return false;
  }

  /**
   * Check if mother can nurse
   */
  public canNurse(): boolean {
    // Mastitis makes nursing painful but possible
    return !this.complications.includes('mastitis') || Math.random() > 0.5;
  }
}

// ============================================================================
// Factory Function
// ============================================================================

/**
 * Create a new PostpartumComponent
 */
export function createPostpartumComponent(
  startedAt: Tick,
  infantId: string,
  complicatedBirth: boolean,
  offspringCount?: number
): PostpartumComponent {
  const component = new PostpartumComponent();
  component.initialize(startedAt, infantId, complicatedBirth, offspringCount);
  return component;
}
