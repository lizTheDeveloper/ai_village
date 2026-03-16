import type { Component } from '../ecs/Component.js';

export type DamageType =
  | 'roof_leak'
  | 'cracked_wall'
  | 'rotting_wood'
  | 'broken_window'
  | 'foundation_shift'
  | 'pest_infestation'
  | 'mold_growth';

export interface CriticalDamage {
  type: DamageType;
  severity: number;        // 0-100
  location: string;        // e.g. 'roof', 'walls', 'foundation'
  ticksPresent: number;    // How long this damage has existed
  repairMaterialType: string;
  repairMaterialQuantity: number;
  repairTimeTicks: number;
}

export type MaintenanceType =
  | 'cleaning'
  | 'minor_repairs'
  | 'weatherproofing'
  | 'structural_inspection'
  | 'pest_control'
  | 'major_overhaul';

export interface ScheduledMaintenance {
  taskType: MaintenanceType;
  frequencyTicks: number;     // How often it must be done
  lastPerformedTick: number;  // 0 = never performed
  materialType: string | null;
  materialQuantity: number;
  laborCost: number;          // Agent-hours (not enforced, informational)
  urgency: number;            // 0-100, used for agent prioritization
  /** Durability/cleanliness loss per tick if not maintained */
  decayRateIfNeglected: number;
  /** Condition value below which critical damage can appear */
  failureThreshold: number;
}

/**
 * BuildingConditionComponent – richer building state tracking.
 *
 * Extends the single `condition` field on BuildingComponent with:
 *  - Separate quality axes (durability, cleanliness, functionality, aesthetics)
 *  - Causal decay factors (age, weather, usage, neglect)
 *  - A list of critical damage instances with cascade potential
 *  - A maintenance schedule
 *
 * This component is OPTIONAL. If absent, BuildingMaintenanceSystem falls
 * back to the legacy single `condition` field on BuildingComponent.
 */
export interface BuildingConditionComponent extends Component {
  type: 'building_condition';

  // ── Quality axes (0-100 each) ───────────────────────────────────────
  durability: number;      // Structural integrity
  cleanliness: number;     // Habitability / hygiene
  functionality: number;   // How well the building performs its purpose
  aesthetics: number;      // Visual appeal

  // ── Decay factors (0-100 each, higher = more damage) ───────────────
  /** Age in ticks since construction completed */
  ageTicks: number;
  weatherExposure: number;  // Cumulative weather-driven damage factor
  usageWear: number;        // From occupants and usage activity
  neglect: number;          // Time-since-maintenance factor (rises without care)

  // ── Critical damage ─────────────────────────────────────────────────
  criticalDamage: CriticalDamage[];

  // ── Maintenance schedule ─────────────────────────────────────────────
  maintenanceTasks: ScheduledMaintenance[];
}

export function createBuildingConditionComponent(
  maintenanceTasks: ScheduledMaintenance[] = []
): BuildingConditionComponent {
  return {
    type: 'building_condition',
    version: 1,
    durability: 100,
    cleanliness: 100,
    functionality: 100,
    aesthetics: 100,
    ageTicks: 0,
    weatherExposure: 0,
    usageWear: 0,
    neglect: 0,
    criticalDamage: [],
    maintenanceTasks,
  };
}

/**
 * Default maintenance schedules per building type.
 * Ticks are at 20 TPS. 1 game-day ≈ 1200 ticks (1 min real time).
 */
export const DEFAULT_MAINTENANCE_SCHEDULES: Record<string, ScheduledMaintenance[]> = {
  // Residential / generic
  default: [
    {
      taskType: 'cleaning',
      frequencyTicks: 7 * 1200,    // Weekly
      lastPerformedTick: 0,
      materialType: null,
      materialQuantity: 0,
      laborCost: 5,
      urgency: 20,
      decayRateIfNeglected: 0.002, // cleanliness per tick
      failureThreshold: 20,
    },
    {
      taskType: 'minor_repairs',
      frequencyTicks: 30 * 1200,   // Monthly
      lastPerformedTick: 0,
      materialType: 'wood',
      materialQuantity: 2,
      laborCost: 10,
      urgency: 40,
      decayRateIfNeglected: 0.001, // durability per tick
      failureThreshold: 50,
    },
    {
      taskType: 'weatherproofing',
      frequencyTicks: 365 * 1200,  // Yearly
      lastPerformedTick: 0,
      materialType: 'tar',
      materialQuantity: 5,
      laborCost: 20,
      urgency: 60,
      decayRateIfNeglected: 0.0005,
      failureThreshold: 40,
    },
  ],
  stone_house: [
    {
      taskType: 'cleaning',
      frequencyTicks: 7 * 1200,
      lastPerformedTick: 0,
      materialType: null,
      materialQuantity: 0,
      laborCost: 5,
      urgency: 20,
      decayRateIfNeglected: 0.001,
      failureThreshold: 20,
    },
    {
      taskType: 'minor_repairs',
      frequencyTicks: 60 * 1200,   // Every 2 months (stone is more durable)
      lastPerformedTick: 0,
      materialType: 'stone',
      materialQuantity: 3,
      laborCost: 15,
      urgency: 35,
      decayRateIfNeglected: 0.0005,
      failureThreshold: 50,
    },
  ],
  workshop: [
    {
      taskType: 'cleaning',
      frequencyTicks: 3 * 1200,    // Every 3 days (busy workplace)
      lastPerformedTick: 0,
      materialType: null,
      materialQuantity: 0,
      laborCost: 3,
      urgency: 25,
      decayRateIfNeglected: 0.003,
      failureThreshold: 30,
    },
    {
      taskType: 'structural_inspection',
      frequencyTicks: 90 * 1200,
      lastPerformedTick: 0,
      materialType: null,
      materialQuantity: 0,
      laborCost: 8,
      urgency: 50,
      decayRateIfNeglected: 0.001,
      failureThreshold: 60,
    },
  ],
};

/**
 * Get the overall condition score as the minimum of the four axes.
 * Used for backward-compatible display and threshold logic.
 */
export function getOverallCondition(comp: BuildingConditionComponent): number {
  return Math.min(comp.durability, comp.cleanliness, comp.functionality, comp.aesthetics);
}

/**
 * Return true if any critical damage severity exceeds the given threshold.
 */
export function hasCriticalDamage(comp: BuildingConditionComponent, minSeverity = 50): boolean {
  return comp.criticalDamage.some((d) => d.severity >= minSeverity);
}

/**
 * Total repair cost as material quantities grouped by type.
 */
export function totalRepairCost(comp: BuildingConditionComponent): Record<string, number> {
  const totals: Record<string, number> = {};
  for (const damage of comp.criticalDamage) {
    totals[damage.repairMaterialType] = (totals[damage.repairMaterialType] ?? 0) + damage.repairMaterialQuantity;
  }
  return totals;
}
