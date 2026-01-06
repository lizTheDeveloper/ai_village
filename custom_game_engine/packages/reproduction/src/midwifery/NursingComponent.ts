/**
 * NursingComponent - Tracks lactating mothers who can nurse infants
 *
 * Added after birth, removed when infant is weaned or if milk dries up.
 * Handles:
 * - Milk production and capacity
 * - Increased nutritional needs
 * - Multiple nursing assignments (wet nurse)
 */

import { ComponentBase } from '@ai-village/core';
import type { Tick } from '@ai-village/core';

// ============================================================================
// The Component
// ============================================================================

/**
 * NursingComponent tracks a mother's ability to nurse infants.
 */
export class NursingComponent extends ComponentBase {
  public readonly type = 'nursing';

  // =========================================================================
  // Basic State
  // =========================================================================

  /** When nursing began (birth tick) */
  public startedAt: Tick = 0;

  /** Is actively producing milk? */
  public lactating: boolean = true;

  /** Current milk supply level (0-1) */
  public milkSupply: number = 1.0;

  // =========================================================================
  // Nursing Assignments
  // =========================================================================

  /** Primary infant being nursed (own child) */
  public primaryInfantId: string | null = null;

  /** Additional infants being nursed (wet nurse) */
  public additionalInfantIds: string[] = [];

  /** Maximum infants that can be nursed */
  public maxNursingCapacity: number = 2;

  // =========================================================================
  // Nutritional Needs
  // =========================================================================

  /** Food need modifier while nursing */
  public foodNeedModifier: number = 1.5; // 50% more food needed

  /** Water need modifier while nursing */
  public waterNeedModifier: number = 1.3; // 30% more water needed

  /** Is mother getting adequate nutrition? */
  public adequateNutrition: boolean = true;

  // =========================================================================
  // Health
  // =========================================================================

  /** Has mastitis (breast infection)? */
  public hasMastitis: boolean = false;

  /** Pain level from nursing issues (0-1) */
  public painLevel: number = 0;

  /** Quality of milk being produced (0-1) */
  public milkQuality: number = 1.0;

  // =========================================================================
  // Timing
  // =========================================================================

  /** Tick of last nursing session */
  public lastNursedAt: Tick = 0;

  /** Days since nursing started */
  public nursingDays: number = 0;

  /** Is ready to wean? */
  public readyToWean: boolean = false;

  // =========================================================================
  // Methods
  // =========================================================================

  /**
   * Initialize nursing for a new mother
   */
  public initialize(startedAt: Tick, infantId: string): void {
    this.startedAt = startedAt;
    this.primaryInfantId = infantId;
    this.lactating = true;
    this.milkSupply = 0.8; // Starts lower, builds up
    this.lastNursedAt = startedAt;
    this.nursingDays = 0;
    this.additionalInfantIds = [];
  }

  /**
   * Update nursing state
   */
  public update(currentTick: Tick, deltaDays: number, motherHunger: number): void {
    this.nursingDays += deltaDays;

    // Update adequate nutrition based on mother's hunger
    this.adequateNutrition = motherHunger > 0.5;

    // Milk supply depends on nutrition and demand
    this.updateMilkSupply(currentTick);

    // Milk quality depends on nutrition
    this.updateMilkQuality();

    // Check if ready to wean (after ~6 months)
    if (this.nursingDays >= 180) {
      this.readyToWean = true;
    }

    // Mastitis risk if not nursing regularly
    const hoursSinceNursed = (currentTick - this.lastNursedAt) / (20 * 60);
    if (hoursSinceNursed > 12 && Math.random() < 0.01) {
      this.developMastitis();
    }
  }

  /**
   * Update milk supply based on demand
   */
  private updateMilkSupply(currentTick: Tick): void {
    const infantCount = this.getInfantCount();

    // Milk supply increases with demand (up to capacity)
    const demandFactor = Math.min(1, infantCount / this.maxNursingCapacity);

    // Regular nursing maintains/increases supply
    const hoursSinceNursed = (currentTick - this.lastNursedAt) / (20 * 60);

    if (hoursSinceNursed < 4) {
      // Good nursing frequency
      this.milkSupply = Math.min(1, this.milkSupply + 0.01 * demandFactor);
    } else if (hoursSinceNursed > 12) {
      // Supply decreases without demand
      this.milkSupply = Math.max(0, this.milkSupply - 0.02);
    }

    // Poor nutrition reduces supply
    if (!this.adequateNutrition) {
      this.milkSupply = Math.max(0, this.milkSupply - 0.01);
    }

    // Mastitis reduces supply
    if (this.hasMastitis) {
      this.milkSupply *= 0.7;
    }

    // If supply drops too low, stop lactating
    if (this.milkSupply < 0.1) {
      this.lactating = false;
    }
  }

  /**
   * Update milk quality
   */
  private updateMilkQuality(): void {
    if (this.adequateNutrition) {
      this.milkQuality = Math.min(1, this.milkQuality + 0.01);
    } else {
      this.milkQuality = Math.max(0.3, this.milkQuality - 0.02);
    }

    // Mastitis affects quality
    if (this.hasMastitis) {
      this.milkQuality *= 0.5;
    }
  }

  /**
   * Develop mastitis
   */
  private developMastitis(): void {
    this.hasMastitis = true;
    this.painLevel = 0.6;
    this.milkQuality *= 0.5;
  }

  /**
   * Treat mastitis
   */
  public treatMastitis(skillLevel: number): boolean {
    // Treatment success based on skill
    const success = Math.random() < (0.5 + skillLevel * 0.1);

    if (success) {
      this.hasMastitis = false;
      this.painLevel = Math.max(0, this.painLevel - 0.4);
      this.milkQuality = Math.min(1, this.milkQuality * 1.5);
      return true;
    }
    return false;
  }

  /**
   * Perform nursing session
   */
  public nurse(tick: Tick, _infantId: string): number {
    if (!this.lactating) return 0;

    this.lastNursedAt = tick;

    // Return milk quality for infant
    const effectiveness = this.milkSupply * this.milkQuality;

    // Nursing slightly reduces current supply (replenishes over time)
    this.milkSupply = Math.max(0, this.milkSupply - 0.05);

    // Reduce pain slightly (nursing helps with engorgement)
    this.painLevel = Math.max(0, this.painLevel - 0.05);

    return effectiveness;
  }

  /**
   * Add an additional infant to nurse (wet nurse)
   */
  public addNursingAssignment(infantId: string): boolean {
    if (this.getInfantCount() >= this.maxNursingCapacity) {
      return false;
    }

    if (!this.additionalInfantIds.includes(infantId)) {
      this.additionalInfantIds.push(infantId);
    }

    // Increase food needs for additional infant
    this.foodNeedModifier += 0.25;

    return true;
  }

  /**
   * Remove a nursing assignment
   */
  public removeNursingAssignment(infantId: string): void {
    if (infantId === this.primaryInfantId) {
      this.primaryInfantId = null;
    } else {
      const index = this.additionalInfantIds.indexOf(infantId);
      if (index !== -1) {
        this.additionalInfantIds.splice(index, 1);
        this.foodNeedModifier = Math.max(1.25, this.foodNeedModifier - 0.25);
      }
    }

    // If no infants, prepare to stop lactating
    if (this.getInfantCount() === 0) {
      this.readyToWean = true;
    }
  }

  /**
   * Get total number of infants being nursed
   */
  public getInfantCount(): number {
    let count = this.primaryInfantId ? 1 : 0;
    count += this.additionalInfantIds.length;
    return count;
  }

  /**
   * Stop lactating (weaning)
   */
  public stopLactating(): void {
    this.lactating = false;
    this.milkSupply = 0;
    this.primaryInfantId = null;
    this.additionalInfantIds = [];
    this.foodNeedModifier = 1.0;
    this.waterNeedModifier = 1.0;
  }

  /**
   * Check if can nurse another infant
   */
  public canNurseAnother(): boolean {
    return (
      this.lactating &&
      this.getInfantCount() < this.maxNursingCapacity &&
      this.milkSupply > 0.3
    );
  }
}

// ============================================================================
// Factory Function
// ============================================================================

/**
 * Create a new NursingComponent
 */
export function createNursingComponent(
  startedAt: Tick,
  infantId: string
): NursingComponent {
  const component = new NursingComponent();
  component.initialize(startedAt, infantId);
  return component;
}
