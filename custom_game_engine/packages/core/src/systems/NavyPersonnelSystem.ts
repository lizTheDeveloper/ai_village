/**
 * NavyPersonnelSystem - Manages navy crew payroll, training costs, and retention
 *
 * This system handles:
 * - Crew payroll calculation and payment
 * - Officer academy training costs
 * - NCO (non-commissioned officer) training costs
 * - Veteran retention bonuses
 * - Morale effects from adequate/inadequate pay
 *
 * Priority: 175 (after ShipyardProductionSystem at 170, before fleet operations)
 *
 * Personnel Cost Model:
 * - Base salary: 10 currency per crew member per year
 * - Rank multipliers:
 *   - Captain: 5.0× (50 per year)
 *   - Navigator: 3.0× (30 per year)
 *   - Engineer: 2.0× (20 per year)
 *   - Marine: 1.5× (15 per year)
 *   - Crew: 1.0× (10 per year)
 * - Officer academy: 1000 per officer per year × quality (0.5-2.0)
 * - NCO training: 500 per NCO per year × quality (0.5-2.0)
 * - Veteran bonuses: 500 per veteran per year (improves retention)
 */

import { BaseSystem, type SystemContext } from '../ecs/SystemContext.js';
import type { SystemId, ComponentType } from '../types.js';
import { ComponentType as CT } from '../types/ComponentType.js';
import type { World } from '../ecs/World.js';
import { EntityImpl } from '../ecs/Entity.js';
import type { NavyComponent } from '../components/NavyComponent.js';

// ============================================================================
// Types
// ============================================================================

export interface PersonnelCostBreakdown {
  baseSalaries: number;
  officerTraining: number;
  ncoTraining: number;
  veteranBonuses: number;
  totalCost: number;
}

export interface CrewRankDistribution {
  captains: number;
  navigators: number;
  engineers: number;
  marines: number;
  crew: number;
}

const RANK_MULTIPLIERS = {
  captain: 5.0,
  navigator: 3.0,
  engineer: 2.0,
  marine: 1.5,
  crew: 1.0,
};

const BASE_SALARY_PER_CREW_PER_YEAR = 10;
const OFFICER_ACADEMY_COST_PER_OFFICER_PER_YEAR = 1000;
const NCO_TRAINING_COST_PER_NCO_PER_YEAR = 500;
const VETERAN_RETENTION_BONUS_PER_YEAR = 500;

// ============================================================================
// System
// ============================================================================

export class NavyPersonnelSystem extends BaseSystem {
  public readonly id: SystemId = 'navy_personnel' as SystemId;
  public readonly priority: number = 175;
  public readonly requiredComponents: ReadonlyArray<ComponentType> = [CT.Navy];
  public readonly activationComponents = ['navy'] as const;
  public readonly metadata = {
    category: 'economy',
    description: 'Manages navy personnel payroll, training costs, and retention',
    dependsOn: ['shipyard_production' as SystemId],
    writesComponents: [CT.Navy] as const,
  } as const;

  protected readonly throttleInterval = 1200; // Every 60 seconds at 20 TPS (monthly payroll)

  // ========================================================================
  // State
  // ========================================================================

  private lastPayrollTick: Map<string, number> = new Map();

  protected onUpdate(ctx: SystemContext): void {
    const tick = ctx.tick;

    // Process each navy's personnel costs
    for (const navyEntity of ctx.activeEntities) {
      const navy = navyEntity.getComponent<NavyComponent>(CT.Navy);
      if (!navy) continue;

      // Check if payroll is due
      const lastPayroll = this.lastPayrollTick.get(navy.navyId) || 0;
      const timeSinceLastPayroll = tick - lastPayroll;

      if (timeSinceLastPayroll >= this.throttleInterval) {
        this.processPersonnelCosts(ctx.world, navyEntity as EntityImpl, navy, tick);
        this.lastPayrollTick.set(navy.navyId, tick);
      }
    }
  }

  // ========================================================================
  // Personnel Cost Processing
  // ========================================================================

  /**
   * Process all personnel costs for a navy
   *
   * Calculates and tracks:
   * 1. Crew payroll (based on rank distribution)
   * 2. Officer academy training costs
   * 3. NCO training costs
   * 4. Veteran retention bonuses
   */
  private processPersonnelCosts(
    world: World,
    navyEntity: EntityImpl,
    navy: NavyComponent,
    tick: number
  ): void {
    const totalCrew = navy.assets.totalCrew;

    if (totalCrew === 0) {
      // No crew, no costs
      return;
    }

    // Calculate crew rank distribution (estimated from total crew)
    const rankDistribution = this.estimateRankDistribution(navy);

    // Calculate payroll
    const payroll = this.calculateCrewPayroll(rankDistribution);

    // Calculate training costs
    const trainingCosts = this.calculateTrainingCosts(navy, rankDistribution);

    // Calculate retention costs
    const retentionCosts = this.calculateRetentionCosts(navy);

    // Total personnel cost
    const totalCost = payroll + trainingCosts.officerAcademy + trainingCosts.ncoTraining + retentionCosts;

    // Create cost breakdown
    const costBreakdown: PersonnelCostBreakdown = {
      baseSalaries: payroll,
      officerTraining: trainingCosts.officerAcademy,
      ncoTraining: trainingCosts.ncoTraining,
      veteranBonuses: retentionCosts,
      totalCost,
    };

    // Update navy component with personnel costs
    navyEntity.updateComponent<NavyComponent>(CT.Navy, (n) => ({
      ...n,
      economy: {
        ...n.economy,
        personnelCost: totalCost,
      },
    }));

    // Emit personnel cost event
    world.eventBus.emit({
      type: 'navy:personnel_costs_calculated',
      source: navyEntity.id,
      data: {
        navyId: navy.navyId,
        totalCrew,
        costBreakdown,
        tick,
      },
    });

    // Check if personnel budget is adequate
    const personnelBudget = navy.economy.annualBudget * navy.economy.budgetAllocation.personnel;
    if (totalCost > personnelBudget) {
      // Insufficient personnel budget - morale crisis
      const shortfall = totalCost - personnelBudget;
      world.eventBus.emit({
        type: 'navy:personnel_budget_shortfall',
        source: navyEntity.id,
        data: {
          navyId: navy.navyId,
          personnelBudget,
          requiredBudget: totalCost,
          shortfall,
          unpaidPercentage: shortfall / totalCost,
        },
      });
    }
  }

  // ========================================================================
  // Crew Payroll
  // ========================================================================

  /**
   * Calculate crew payroll based on rank distribution
   *
   * Each rank has different salary multipliers
   */
  private calculateCrewPayroll(ranks: CrewRankDistribution): number {
    const baseSalary = BASE_SALARY_PER_CREW_PER_YEAR;

    const captainSalaries = ranks.captains * baseSalary * RANK_MULTIPLIERS.captain;
    const navigatorSalaries = ranks.navigators * baseSalary * RANK_MULTIPLIERS.navigator;
    const engineerSalaries = ranks.engineers * baseSalary * RANK_MULTIPLIERS.engineer;
    const marineSalaries = ranks.marines * baseSalary * RANK_MULTIPLIERS.marine;
    const crewSalaries = ranks.crew * baseSalary * RANK_MULTIPLIERS.crew;

    return captainSalaries + navigatorSalaries + engineerSalaries + marineSalaries + crewSalaries;
  }

  /**
   * Estimate rank distribution from total crew
   *
   * Typical navy rank structure:
   * - Captains: 1 per ship (assuming ~100 crew per ship)
   * - Navigators: 1 per ship
   * - Engineers: 10% of crew
   * - Marines: 15% of crew
   * - Regular crew: Remaining
   */
  private estimateRankDistribution(navy: NavyComponent): CrewRankDistribution {
    const totalCrew = navy.assets.totalCrew;
    const totalShips = navy.assets.totalShips;

    if (totalCrew === 0 || totalShips === 0) {
      return {
        captains: 0,
        navigators: 0,
        engineers: 0,
        marines: 0,
        crew: 0,
      };
    }

    const captains = totalShips; // 1 captain per ship
    const navigators = totalShips; // 1 navigator per ship
    const engineers = Math.floor(totalCrew * 0.1); // 10% engineers
    const marines = Math.floor(totalCrew * 0.15); // 15% marines
    const crew = totalCrew - captains - navigators - engineers - marines;

    return {
      captains,
      navigators,
      engineers,
      marines,
      crew: Math.max(0, crew),
    };
  }

  // ========================================================================
  // Training Costs
  // ========================================================================

  /**
   * Calculate training costs for officers and NCOs
   *
   * Training quality affects costs:
   * - Higher quality academies = higher costs
   * - Better training = better ship performance
   */
  private calculateTrainingCosts(
    navy: NavyComponent,
    ranks: CrewRankDistribution
  ): { officerAcademy: number; ncoTraining: number } {
    const officerCount = ranks.captains + ranks.navigators; // Officers are captains and navigators
    const ncoCount = ranks.engineers; // NCOs are engineers

    const academyQuality = navy.doctrine.officerAcademyQuality; // 0.5 (poor) to 2.0 (elite)
    const ncoQuality = navy.doctrine.NCOTraining; // 0.5 (poor) to 2.0 (elite)

    const officerAcademyCost = officerCount * OFFICER_ACADEMY_COST_PER_OFFICER_PER_YEAR * academyQuality;
    const ncoTrainingCost = ncoCount * NCO_TRAINING_COST_PER_NCO_PER_YEAR * ncoQuality;

    return {
      officerAcademy: officerAcademyCost,
      ncoTraining: ncoTrainingCost,
    };
  }

  // ========================================================================
  // Retention Costs
  // ========================================================================

  /**
   * Calculate retention bonuses for veteran soul agents
   *
   * Veterans are valuable (experienced) - keep them with bonuses
   * Reduces resignations and improves morale
   */
  private calculateRetentionCosts(navy: NavyComponent): number {
    const veteranCount = navy.politics.veteranSoulAgents;
    return veteranCount * VETERAN_RETENTION_BONUS_PER_YEAR;
  }

  // ========================================================================
  // Public API
  // ========================================================================

  /**
   * Get detailed personnel cost breakdown for a navy
   */
  public getPersonnelCostBreakdown(navy: NavyComponent): PersonnelCostBreakdown {
    const ranks = this.estimateRankDistribution(navy);
    const payroll = this.calculateCrewPayroll(ranks);
    const training = this.calculateTrainingCosts(navy, ranks);
    const retention = this.calculateRetentionCosts(navy);

    return {
      baseSalaries: payroll,
      officerTraining: training.officerAcademy,
      ncoTraining: training.ncoTraining,
      veteranBonuses: retention,
      totalCost: payroll + training.officerAcademy + training.ncoTraining + retention,
    };
  }

  /**
   * Upgrade officer academy quality
   *
   * Improves officer skill but increases costs
   */
  public upgradeOfficerAcademy(
    world: World,
    navyId: string,
    newQuality: number
  ): { success: boolean; reason?: string } {
    if (newQuality < 0.5 || newQuality > 2.0) {
      return { success: false, reason: 'Academy quality must be between 0.5 and 2.0' };
    }

    const navyEntity = world
      .query()
      .with(CT.Navy)
      .executeEntities()
      .find((e) => {
        const n = e.getComponent<NavyComponent>(CT.Navy);
        return n?.navyId === navyId;
      });

    if (!navyEntity) {
      return { success: false, reason: 'Navy not found' };
    }

    const navy = navyEntity.getComponent<NavyComponent>(CT.Navy);
    if (!navy) {
      return { success: false, reason: 'Invalid navy component' };
    }

    const oldQuality = navy.doctrine.officerAcademyQuality;

    (navyEntity as EntityImpl).updateComponent<NavyComponent>(CT.Navy, (n) => ({
      ...n,
      doctrine: {
        ...n.doctrine,
        officerAcademyQuality: newQuality,
      },
    }));

    world.eventBus.emit({
      type: 'navy:academy_upgraded',
      source: navyEntity.id,
      data: {
        navyId,
        oldQuality,
        newQuality,
        costIncrease: (newQuality - oldQuality) * OFFICER_ACADEMY_COST_PER_OFFICER_PER_YEAR,
      },
    });

    return { success: true };
  }

  /**
   * Upgrade NCO training quality
   */
  public upgradeNCOTraining(
    world: World,
    navyId: string,
    newQuality: number
  ): { success: boolean; reason?: string } {
    if (newQuality < 0.5 || newQuality > 2.0) {
      return { success: false, reason: 'NCO training quality must be between 0.5 and 2.0' };
    }

    const navyEntity = world
      .query()
      .with(CT.Navy)
      .executeEntities()
      .find((e) => {
        const n = e.getComponent<NavyComponent>(CT.Navy);
        return n?.navyId === navyId;
      });

    if (!navyEntity) {
      return { success: false, reason: 'Navy not found' };
    }

    const navy = navyEntity.getComponent<NavyComponent>(CT.Navy);
    if (!navy) {
      return { success: false, reason: 'Invalid navy component' };
    }

    const oldQuality = navy.doctrine.NCOTraining;

    (navyEntity as EntityImpl).updateComponent<NavyComponent>(CT.Navy, (n) => ({
      ...n,
      doctrine: {
        ...n.doctrine,
        NCOTraining: newQuality,
      },
    }));

    world.eventBus.emit({
      type: 'navy:nco_training_upgraded',
      source: navyEntity.id,
      data: {
        navyId,
        oldQuality,
        newQuality,
        costIncrease: (newQuality - oldQuality) * NCO_TRAINING_COST_PER_NCO_PER_YEAR,
      },
    });

    return { success: true };
  }
}

// ============================================================================
// Singleton Factory
// ============================================================================

let systemInstance: NavyPersonnelSystem | null = null;

export function getNavyPersonnelSystem(): NavyPersonnelSystem {
  if (!systemInstance) {
    systemInstance = new NavyPersonnelSystem();
  }
  return systemInstance;
}
