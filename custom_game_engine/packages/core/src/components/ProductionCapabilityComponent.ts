/**
 * ProductionCapabilityComponent - Tracks civilization-level production scaling
 *
 * Phase 5: Grand Strategy - Production Scaling System
 *
 * This component enables production to scale from hand-crafting at a forge to
 * Dyson-sphere-powered mega-industry. It tracks:
 * - Technology level (1-10)
 * - Population and industrialization
 * - Dyson swarm progress
 * - Production tier and multipliers
 * - Resource bottlenecks
 *
 * Production Tiers:
 * - Tier 0: Manual Crafting (Tech 1-3) - single agent at forge
 * - Tier 1: Workshop Production (Tech 4-6) - 5 workers, 2× efficiency
 * - Tier 2: Factory Automation (Tech 7-8) - 90% automated, 50× efficiency
 * - Tier 3: Planetary Industry (Tech 8-9) - entire planet, 1000× efficiency
 * - Tier 4: Dyson-Powered (Tech 9-10) - star system, 1,000,000× efficiency
 *
 * Scaling Formula:
 * ```typescript
 * itemsPerDay = (1 / baseCraftingTime) * techMultiplier * popMultiplier * industryMultiplier * dysonMultiplier * 86400
 * where:
 *   techMultiplier = 10^(techLevel - 1)
 *   popMultiplier = log10(population + 1)
 *   industryMultiplier = 1 + industrialization
 *   dysonMultiplier = 1 + dysonSwarmProgress * 1000
 * ```
 *
 * See: openspec/specs/grand-strategy/05-PRODUCTION-SCALING.md
 */

import type { Component } from '../ecs/Component.js';

/**
 * Production tier from manual crafting to Dyson-powered mega-industry.
 */
export type ProductionTier = 0 | 1 | 2 | 3 | 4;

/**
 * Resource bottleneck tracking for scarce materials.
 * Some resources have hard limits regardless of production tier.
 */
export interface ResourceBottleneck {
  /** Maximum production per year */
  maxPerYear: number;
  /** Current production rate */
  currentProduction: number;
  /** What limits this resource (e.g., "soul_fragment_scarcity", "void_essence_rarity") */
  limitedBy: string;
}

/**
 * ProductionCapabilityComponent - Civilization-level production scaling
 *
 * Typically attached to:
 * - City meta-entities (city-level production)
 * - Province entities (regional industry)
 * - Civilization entities (empire-wide manufacturing)
 */
export interface ProductionCapabilityComponent extends Component {
  type: 'production_capability';
  version: 1;

  // ========== Production Tier ==========

  /** Current production tier (0 = Manual, 4 = Dyson-powered) */
  tier: ProductionTier;

  // ========== Civilization Stats ==========

  /** Technology level (1-10) from TechnologyEraComponent */
  techLevel: number;

  /** Total population (used for workforce multiplier) */
  population: number;

  /** Industrialization level (0-10)
   * 0 = Pre-industrial, 5 = Industrial revolution, 10 = Fully automated
   */
  industrialization: number;

  /** Dyson swarm completion progress (0-1)
   * 0 = No Dyson infrastructure
   * 0.5 = Half-complete Dyson swarm
   * 1.0 = Complete Dyson sphere
   */
  dysonSwarmProgress: number;

  // ========== Production Factors ==========

  /** Cached total production multiplier
   * Recomputed when stats change.
   * Formula: techMultiplier * popMultiplier * industryMultiplier * dysonMultiplier
   */
  totalMultiplier: number;

  // ========== Bottleneck Resources ==========

  /** Resources with hard production limits
   * Example: soul_fragment, void_essence, antimatter
   * These have maximum annual production regardless of tier
   */
  bottleneckResources: Record<string, ResourceBottleneck>;

  // ========== Factory Stats ==========

  /** Number of factory buildings */
  factories: number;

  /** Number of workers assigned to production */
  workers: number;

  /** Automation level (0-1)
   * 0 = All manual labor
   * 0.5 = 50% automated
   * 1.0 = Fully automated (lights-out factory)
   */
  automationLevel: number;

  // ========== Metadata ==========

  /** Tick when multipliers were last calculated */
  lastCalculatedAt: number;
}

// ============================================================================
// FACTORY FUNCTIONS
// ============================================================================

/**
 * Create a production capability component with default values.
 *
 * @param techLevel - Technology level (1-10)
 * @param population - Total population
 * @returns New production capability component
 */
export function createProductionCapabilityComponent(
  techLevel: number = 1,
  population: number = 0
): ProductionCapabilityComponent {
  const tier = getTierFromTechLevel(techLevel);

  return {
    type: 'production_capability',
    version: 1,
    tier,
    techLevel,
    population,
    industrialization: 0,
    dysonSwarmProgress: 0,
    totalMultiplier: 1,
    bottleneckResources: {},
    factories: 0,
    workers: 0,
    automationLevel: 0,
    lastCalculatedAt: 0,
  };
}

// ============================================================================
// TIER CALCULATION
// ============================================================================

/**
 * Determine production tier from technology level.
 *
 * Tier 0: Tech 1-3 (Manual Crafting)
 * Tier 1: Tech 4-6 (Workshop Production)
 * Tier 2: Tech 7-8 (Factory Automation)
 * Tier 3: Tech 8-9 (Planetary Industry)
 * Tier 4: Tech 9-10 (Dyson-Powered)
 */
export function getTierFromTechLevel(techLevel: number): ProductionTier {
  if (techLevel >= 9) return 4; // Dyson-powered
  if (techLevel >= 8) return 3; // Planetary industry
  if (techLevel >= 7) return 2; // Factory automation
  if (techLevel >= 4) return 1; // Workshop production
  return 0; // Manual crafting
}

// ============================================================================
// MULTIPLIER CALCULATION
// ============================================================================

/**
 * Calculate total production multiplier from civilization stats.
 *
 * Formula:
 * totalMultiplier = techMultiplier * popMultiplier * industryMultiplier * dysonMultiplier
 *
 * Where:
 * - techMultiplier = 10^(techLevel - 1)
 * - popMultiplier = log10(population + 1)
 * - industryMultiplier = 1 + industrialization
 * - dysonMultiplier = 1 + dysonSwarmProgress * 1000
 *
 * @param component - Production capability component
 * @returns Total production multiplier
 */
export function calculateProductionMultiplier(
  component: ProductionCapabilityComponent
): number {
  const techMultiplier = Math.pow(10, component.techLevel - 1);
  const popMultiplier = Math.log10(component.population + 1);
  const industryMultiplier = 1 + component.industrialization;
  const dysonMultiplier = 1 + component.dysonSwarmProgress * 1000;

  return techMultiplier * popMultiplier * industryMultiplier * dysonMultiplier;
}

/**
 * Calculate items per day from base crafting time and production stats.
 *
 * @param baseCraftingTime - Base crafting time in seconds
 * @param component - Production capability component
 * @returns Items produced per day
 */
export function calculateItemsPerDay(
  baseCraftingTime: number,
  component: ProductionCapabilityComponent
): number {
  const baseItemsPerSecond = 1 / baseCraftingTime;
  const itemsPerSecond = baseItemsPerSecond * component.totalMultiplier;
  return itemsPerSecond * 86400; // Convert to items/day
}

// ============================================================================
// BOTTLENECK RESOURCES
// ============================================================================

/**
 * Add a bottleneck resource with hard production limits.
 *
 * Example: Soul fragments, void essence, antimatter
 *
 * @param component - Production capability component
 * @param resourceId - Resource identifier
 * @param maxPerYear - Maximum annual production
 * @param limitedBy - Reason for limitation
 */
export function addBottleneckResource(
  component: ProductionCapabilityComponent,
  resourceId: string,
  maxPerYear: number,
  limitedBy: string
): void {
  component.bottleneckResources[resourceId] = {
    maxPerYear,
    currentProduction: 0,
    limitedBy,
  };
}

/**
 * Check if a resource is bottlenecked.
 *
 * @param component - Production capability component
 * @param resourceId - Resource identifier
 * @returns True if resource has production limits
 */
export function isBottleneckedResource(
  component: ProductionCapabilityComponent,
  resourceId: string
): boolean {
  return resourceId in component.bottleneckResources;
}

/**
 * Get effective production rate for a resource (accounting for bottlenecks).
 *
 * @param component - Production capability component
 * @param resourceId - Resource identifier
 * @param baseProduction - Base production rate (items/day)
 * @returns Effective production rate (clamped by bottleneck if applicable)
 */
export function getEffectiveProductionRate(
  component: ProductionCapabilityComponent,
  resourceId: string,
  baseProduction: number
): number {
  const bottleneck = component.bottleneckResources[resourceId];
  if (!bottleneck) {
    return baseProduction; // No bottleneck, use base production
  }

  // Convert annual limit to daily limit
  const maxPerDay = bottleneck.maxPerYear / 365;
  return Math.min(baseProduction, maxPerDay);
}

// ============================================================================
// FACTORY MANAGEMENT
// ============================================================================

/**
 * Update factory statistics.
 *
 * @param component - Production capability component
 * @param factories - Number of factory buildings
 * @param workers - Number of workers
 * @param automationLevel - Automation level (0-1)
 */
export function updateFactoryStats(
  component: ProductionCapabilityComponent,
  factories: number,
  workers: number,
  automationLevel: number
): void {
  component.factories = factories;
  component.workers = workers;
  component.automationLevel = Math.max(0, Math.min(1, automationLevel));
}

/**
 * Get effective workforce (accounting for automation).
 *
 * Automation reduces worker requirement:
 * - 0% automation: 1 worker required per task
 * - 50% automation: 0.5 workers required per task
 * - 100% automation: 0 workers required (lights-out factory)
 *
 * @param component - Production capability component
 * @returns Effective workforce multiplier
 */
export function getEffectiveWorkforce(
  component: ProductionCapabilityComponent
): number {
  const manualWorkers = component.workers * (1 - component.automationLevel);
  const automatedCapacity = component.factories * component.automationLevel * 10; // 10 workers equivalent per automated factory
  return manualWorkers + automatedCapacity;
}
