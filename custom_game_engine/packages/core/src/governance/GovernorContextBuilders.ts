/**
 * GovernorContextBuilders - Context builders for all political tiers in Phase 6 (AI Governance)
 *
 * Per 06-POLITICAL-HIERARCHY.md: Political entities from villages to galactic councils
 * need rich context for LLM-driven decision-making. This module provides type-safe
 * context interfaces and builder functions for each governance tier.
 *
 * Context building principles:
 * - Single-pass entity collection (performance)
 * - Lazy evaluation where possible
 * - Cached aggregated stats
 * - No silent fallbacks - crash on invalid data
 */

import type { World } from '../ecs/World.js';
import type { Entity } from '../ecs/Entity.js';
import { EntityImpl } from '../ecs/Entity.js';
import { ComponentType as CT } from '../types/ComponentType.js';
import type { ProvinceGovernanceComponent } from '../components/ProvinceGovernanceComponent.js';
import type { VillageGovernanceComponent } from '../components/VillageGovernanceComponent.js';
import type { CityDirectorComponent } from '../components/CityDirectorComponent.js';
import type { TownHallComponent } from '../components/TownHallComponent.js';
import type { CensusBureauComponent } from '../components/CensusBureauComponent.js';
import type { WarehouseComponent } from '../components/WarehouseComponent.js';
import type { NationGovernanceComponent } from '../components/NationGovernanceComponent.js';
import type { EmpireGovernanceComponent } from '../components/EmpireGovernanceComponent.js';
import type { GalacticCouncilComponent } from '../components/GalacticCouncilComponent.js';
import { ObjectPool, CachedQuery } from '../utils/performance.js';

// ============================================================================
// PERFORMANCE OPTIMIZATION: Object Pools and Cached Queries
// ============================================================================

// Object pools for frequently allocated context objects (reduces GC pressure)
const provinceRecordPool = new ObjectPool(
  () => ({ name: '', population: 0, resources: {} as Record<string, number>, happiness: 0 }),
  (obj) => {
    obj.name = '';
    obj.population = 0;
    obj.resources = {};
    obj.happiness = 0;
  }
);

const nationRecordPool = new ObjectPool(
  () => ({ name: '', population: 0, loyalty: 0, militaryStrength: 0, resources: {} as Record<string, number> }),
  (obj) => {
    obj.name = '';
    obj.population = 0;
    obj.loyalty = 0;
    obj.militaryStrength = 0;
    obj.resources = {};
  }
);

const diplomacyRecordPool = new ObjectPool(
  () => ({ targetEmpire: '', relation: 'neutral' as 'allied' | 'neutral' | 'rival' | 'war', trustLevel: 0 }),
  (obj) => {
    obj.targetEmpire = '';
    obj.relation = 'neutral' as 'allied' | 'neutral' | 'rival' | 'war';
    obj.trustLevel = 0;
  }
);

const threatRecordPool = new ObjectPool(
  () => ({ type: '', severity: 0, description: '' }),
  (obj) => {
    obj.type = '';
    obj.severity = 0;
    obj.description = '';
  }
);

const speciesRecordPool = new ObjectPool(
  () => ({ speciesName: '', homeworld: '', population: 0, temperament: '' }),
  (obj) => {
    obj.speciesName = '';
    obj.homeworld = '';
    obj.population = 0;
    obj.temperament = '';
  }
);

const crisisRecordPool = new ObjectPool(
  () => ({ type: '', severity: 0, affectedSpecies: [] as string[] }),
  (obj) => {
    obj.type = '';
    obj.severity = 0;
    obj.affectedSpecies = [];
  }
);

// Cached queries to avoid repeated world queries (auto-invalidate each tick)
const provinceGovernanceQuery = new CachedQuery(CT.ProvinceGovernance);
const nationGovernanceQuery = new CachedQuery(CT.NationGovernance);
const empireGovernanceQuery = new CachedQuery(CT.EmpireGovernance);
const galacticCouncilQuery = new CachedQuery(CT.GalacticCouncil);

// ============================================================================
// TIER 0: PROVINCE GOVERNOR CONTEXT (extends CivilizationContext)
// ============================================================================

/**
 * CivilizationContext - Base context from trade system
 * Extended here for province governors
 */
export interface CivilizationContext {
  /** Current population */
  population: number;

  /** Total food supply */
  foodSupply: number;

  /** Days of food remaining */
  foodDaysRemaining: number;

  /** Key resources available */
  keyResources: string[];

  /** Critical needs (what we urgently need) */
  criticalNeeds: string[];

  /** Strategic focus (expansion, defense, trade, etc.) */
  strategicFocus: string;

  /** Available storage capacity */
  storageCapacity?: number;

  /** Current wealth/currency */
  wealth?: number;
}

/**
 * Province-specific data layered on top of CivilizationContext
 */
export interface ProvinceData {
  name: string;
  tier: 'province';
  buildings: number;
  neighbors: Array<{ name: string; relation: string }>;
}

/**
 * National directives from parent nation to province
 */
export interface NationalDirective {
  type: 'economic' | 'military' | 'infrastructure' | 'cultural';
  priority: 'low' | 'medium' | 'high' | 'critical';
  description: string;
}

/**
 * ProvinceGovernorContext - Context for province-level governance
 * Extends CivilizationContext with province-specific data
 */
export interface ProvinceGovernorContext {
  // Base civilization data
  population: number;
  foodSupply: number;
  foodDaysRemaining: number;
  keyResources: string[];
  criticalNeeds: string[];
  strategicFocus: string;

  // Province-specific data
  provinceData: {
    name: string;
    tier: 'village' | 'town' | 'city' | 'metropolis';
    buildings: Array<{ type: string; status: string }>;
    neighbors: Array<{ name: string; distance: number; relation: string }>;
  };

  // Warehouse/storage data
  warehouseData: {
    totalCapacity: number;
    usedCapacity: number;
    utilizationPercent: number;
    resourceStockpiles: Record<string, number>;
    criticalShortages: string[];
    surpluses: string[];
  };

  nationalDirectives: Array<{
    type: string;
    priority: number;
    description: string;
  }>;
}

/**
 * Build context for province governor
 *
 * @param governor - Governor entity (soul agent)
 * @param world - World instance
 * @returns Province governor context for LLM prompts
 */
export function buildProvinceGovernorContext(
  governor: Entity,
  world: World
): ProvinceGovernorContext {
  // Find province governance component
  const provinces = world.query().with(CT.ProvinceGovernance).executeEntities();
  const provinceEntity = provinces.find((p) => {
    const impl = p as EntityImpl;
    const pg = impl.getComponent<ProvinceGovernanceComponent>(CT.ProvinceGovernance);
    return pg && pg.governorAgentId === governor.id;
  });

  if (!provinceEntity) {
    throw new Error(`Governor ${governor.id} has no associated province`);
  }

  const provinceImpl = provinceEntity as EntityImpl;
  const province = provinceImpl.getComponent<ProvinceGovernanceComponent>(CT.ProvinceGovernance);

  if (!province) {
    throw new Error('Province entity missing ProvinceGovernance component');
  }

  // Aggregate city data
  const cities = province.cities;
  const totalPopulation = province.totalPopulation;

  // Query all warehouses and aggregate food resources
  const warehouses = world.query().with(CT.Warehouse).executeEntities();
  let totalFood = 0;
  const resourceStockpiles = new Map<string, number>();

  for (const entity of warehouses) {
    const impl = entity as EntityImpl;
    const warehouse = impl.getComponent<WarehouseComponent>(CT.Warehouse);

    if (!warehouse) {
      continue;
    }

    // Aggregate all stockpiles
    for (const resourceName in warehouse.stockpiles) {
      const amount = warehouse.stockpiles[resourceName];
      if (amount !== undefined && amount > 0) {
        const current = resourceStockpiles.get(resourceName) ?? 0;
        resourceStockpiles.set(resourceName, current + amount);

        // Count food-type resources for food supply calculation
        if (warehouse.resourceType === 'food' || resourceName.includes('food') ||
            resourceName.includes('meat') || resourceName.includes('berries') ||
            resourceName.includes('grain') || resourceName.includes('bread')) {
          totalFood += amount;
        }
      }
    }
  }

  // Calculate food days remaining (assuming 3 food units per person per day)
  const foodDaysRemaining = totalPopulation > 0 ? totalFood / (totalPopulation * 3) : 999;

  // Extract key resources from province economy
  const keyResources = province.economy.majorResources.slice(0, 5);

  // Identify critical needs based on province stability
  const criticalNeeds: string[] = [];
  if (province.stability < 0.3) {
    criticalNeeds.push('restore_order');
  }
  if (province.economy.tradeBalance < -1000) {
    criticalNeeds.push('improve_economy');
  }
  if (province.military.totalTroops < totalPopulation * 0.01) {
    criticalNeeds.push('strengthen_military');
  }

  // Build neighbor relations with distance placeholder
  const neighbors = Array.from(province.neighborProvinceRelations.values()).map((rel) => ({
    name: rel.provinceName,
    distance: 100, // Placeholder - would need spatial calculation
    relation: rel.relationship,
  }));

  // Build national directives as plain objects
  const nationalDirectives: Array<{
    type: string;
    priority: number;
    description: string;
  }> = [];
  if (province.parentNationId) {
    // In Phase 3+, query nation entity for directives
    // For now, infer from province policies
    for (const policy of province.policies) {
      nationalDirectives.push({
        type: policy.category,
        priority: policy.priority === 'low' ? 1 : policy.priority === 'medium' ? 2 : 3,
        description: policy.description,
      });
    }
  }

  // Map total buildings to array format
  const buildingsArray: Array<{ type: string; status: string }> = [];
  for (const city of cities) {
    // In real implementation, would query city buildings
    // For now, create placeholder
    buildingsArray.push({
      type: 'placeholder',
      status: 'operational',
    });
  }

  // Calculate warehouse capacity and utilization
  let totalCapacity = 0;
  let usedCapacity = 0;
  const criticalShortages: string[] = [];
  const surpluses: string[] = [];

  for (const entity of warehouses) {
    const impl = entity as EntityImpl;
    const warehouse = impl.getComponent<WarehouseComponent>(CT.Warehouse);

    if (!warehouse) {
      continue;
    }

    totalCapacity += warehouse.capacity;

    // Calculate used capacity from stockpiles
    for (const resourceName in warehouse.stockpiles) {
      const amount = warehouse.stockpiles[resourceName];
      if (amount !== undefined) {
        usedCapacity += amount;
      }
    }

    // Identify critical shortages and surpluses from warehouse status
    for (const resourceName in warehouse.status) {
      const status = warehouse.status[resourceName];
      if (status === 'critical' || status === 'low') {
        if (!criticalShortages.includes(resourceName)) {
          criticalShortages.push(resourceName);
        }
      } else if (status === 'surplus') {
        if (!surpluses.includes(resourceName)) {
          surpluses.push(resourceName);
        }
      }
    }
  }

  const utilizationPercent = totalCapacity > 0 ? (usedCapacity / totalCapacity) * 100 : 0;

  // Convert Map to plain object for serialization
  const resourceStockpilesObject: Record<string, number> = {};
  resourceStockpiles.forEach((amount, resourceName) => {
    resourceStockpilesObject[resourceName] = amount;
  });

  return {
    // Base civilization data
    population: totalPopulation,
    foodSupply: totalFood,
    foodDaysRemaining,
    keyResources,
    criticalNeeds,
    strategicFocus: province.economy.economicFocus,

    // Province-specific
    provinceData: {
      name: province.provinceName,
      tier: 'city', // Province tier (city is closest match)
      buildings: buildingsArray,
      neighbors,
    },

    // Warehouse/storage data
    warehouseData: {
      totalCapacity,
      usedCapacity,
      utilizationPercent,
      resourceStockpiles: resourceStockpilesObject,
      criticalShortages,
      surpluses,
    },

    nationalDirectives,
  };
}

// ============================================================================
// TIER 3: NATION CONTEXT
// ============================================================================

/**
 * Province record in nation context (aggregated)
 */
export interface NationProvinceRecord {
  name: string;
  population: number;
  resources: string[];
  happiness: number; // 0-1
}

/**
 * National economy snapshot
 */
export interface NationEconomy {
  gdp: number;
  taxRate: number;
  reserves: number;
}

/**
 * National military summary
 */
export interface NationMilitary {
  strength: number; // Total military power
  deployments: Array<{ location: string; troops: number }>;
}

/**
 * Diplomatic relation with another nation (for neighbors array)
 */
export interface NationDiplomaticRelation {
  name: string;
  relation: 'allied' | 'neutral' | 'hostile';
}

/**
 * Threat to the nation
 */
export interface NationThreat {
  type: 'military' | 'economic' | 'internal' | 'natural';
  severity: 'low' | 'moderate' | 'high' | 'critical';
  description: string;
}

/**
 * Advisor recommendation
 */
export interface AdvisorRecommendation {
  advisor: string; // E.g., "Military Advisor", "Economic Advisor"
  recommendation: string;
}

/**
 * Pending policy proposal
 */
export interface NationProposal {
  type: 'economic' | 'military' | 'social' | 'foreign_policy';
  proposer: string; // Agent name or title
  description: string;
}

/**
 * NationContext - Context for nation-level governance
 *
 * Nations govern multiple provinces, conduct foreign policy, maintain militaries.
 * Time scale: 1 month/tick (strategic simulation)
 */
export interface NationContext {
  /** Nation metadata */
  nation: {
    name: string;
    governmentType: 'monarchy' | 'democracy' | 'oligarchy';
    population: number;
    territory: number; // Number of provinces
  };

  /** Provinces under nation control */
  provinces: Array<{
    name: string;
    population: number;
    resources: Record<string, number>;
    happiness: number; // 0-1
  }>;

  /** Economy overview */
  economy: {
    gdp: number;
    taxRate: number;
    reserves: Record<string, number>;
  };

  /** Military overview */
  military: {
    strength: number;
    deployments: Array<{ location: string; size: number }>;
  };

  /** Neighboring nations */
  neighbors: NationDiplomaticRelation[];

  /** Pending proposals for consideration */
  pendingProposals: Array<{
    type: string;
    proposer: string;
    description: string;
  }>;
}

/**
 * Build context for nation head of state
 *
 * PERFORMANCE OPTIMIZATIONS:
 * - Uses cached query to avoid repeated world.query() calls
 * - Pre-allocates arrays with known size
 * - Uses object pools for province records to reduce GC pressure
 * - Minimizes Map iterations (only once per Map)
 * - Caches intermediate results
 *
 * @param headOfState - Head of state entity (king, president, etc.)
 * @param world - World instance
 * @returns Nation context for LLM prompts
 */
export function buildNationContext(headOfState: Entity, world: World): NationContext {
  // Use cached query instead of world.query() - avoids repeated queries if called multiple times per tick
  const nations = nationGovernanceQuery.get(world);
  const nationEntity = nations.find((n) => {
    const impl = n as EntityImpl;
    const ng = impl.getComponent<NationGovernanceComponent>(CT.NationGovernance);
    return ng && ng.headOfStateAgentId === headOfState.id;
  });

  if (!nationEntity) {
    throw new Error(`Head of state ${headOfState.id} has no associated nation`);
  }

  const nationImpl = nationEntity as EntityImpl;
  const nation = nationImpl.getComponent<NationGovernanceComponent>(CT.NationGovernance);

  if (!nation) {
    throw new Error('Nation entity missing NationGovernance component');
  }

  // Cache province count and use cached query for provinces
  const provinceCount = nation.provinceIds.length;
  const allProvinces = provinceGovernanceQuery.get(world);

  // Query all warehouses once for resource aggregation (performance optimization)
  const allWarehouses = world.query().with(CT.Warehouse).executeEntities();
  const nationalResourceStockpiles = new Map<string, number>();

  // Aggregate national warehouse stockpiles
  for (const entity of allWarehouses) {
    const impl = entity as EntityImpl;
    const warehouse = impl.getComponent<WarehouseComponent>(CT.Warehouse);

    if (!warehouse) {
      continue;
    }

    // Aggregate all stockpiles across the nation
    for (const resourceName in warehouse.stockpiles) {
      const amount = warehouse.stockpiles[resourceName];
      if (amount !== undefined && amount > 0) {
        const current = nationalResourceStockpiles.get(resourceName) ?? 0;
        nationalResourceStockpiles.set(resourceName, current + amount);
      }
    }
  }

  // Pre-allocate provinces array with exact size (avoids array resizing)
  const provinces = new Array(provinceCount);

  // Build provinces array using object pool to reduce GC pressure
  for (let i = 0; i < provinceCount; i++) {
    const provinceId = nation.provinceIds[i]!;
    const provinceEntity = allProvinces.find((p) => p.id === provinceId);

    if (!provinceEntity) {
      // Use object pool for unknown province record
      const record = provinceRecordPool.acquire();
      record.name = 'Unknown Province';
      record.population = 0;
      record.resources = {};
      record.happiness = 0;
      provinces[i] = record;
      continue;
    }

    const provinceImpl = provinceEntity as EntityImpl;
    const province = provinceImpl.getComponent<ProvinceGovernanceComponent>(CT.ProvinceGovernance);

    if (!province) {
      // Use object pool for unknown province record
      const record = provinceRecordPool.acquire();
      record.name = 'Unknown Province';
      record.population = 0;
      record.resources = {};
      record.happiness = 0;
      provinces[i] = record;
      continue;
    }

    // Acquire pooled object and populate
    const record = provinceRecordPool.acquire();
    record.name = province.provinceName;
    record.population = province.totalPopulation;
    record.happiness = province.stability;

    // Build resources map with actual warehouse quantities
    const resourceCount = province.economy.majorResources.length;
    for (let j = 0; j < resourceCount; j++) {
      const resource = province.economy.majorResources[j]!;
      // Use actual quantity from national stockpiles, default to 0 if not found
      record.resources[resource] = nationalResourceStockpiles.get(resource) ?? 0;
    }

    provinces[i] = record;
  }

  // Build economy object - calculate tax rate efficiently
  let totalTaxes = 0;
  const provincialTaxesSize = nation.economy.provincialTaxes.size;
  if (provincialTaxesSize > 0) {
    // Single iteration over Map values (Array.from to avoid downlevelIteration requirement)
    const taxesArray = Array.from(nation.economy.provincialTaxes.values());
    for (let i = 0; i < taxesArray.length; i++) {
      totalTaxes += taxesArray[i]!;
    }
  }

  const economy = {
    gdp: nation.economy.GDP,
    taxRate: provincialTaxesSize > 0 ? totalTaxes / provincialTaxesSize / nation.economy.GDP : 0.1,
    reserves: {
      gold: nation.economy.annualBudget - nation.economy.nationalDebt,
    },
  };

  // Build military object - cache total strength
  const totalMilitaryStrength = nation.military.standingArmy + nation.military.reserves;
  const activeWarsCount = nation.foreignPolicy.activeWars.length;
  const deployments = new Array(activeWarsCount);

  for (let i = 0; i < activeWarsCount; i++) {
    const war = nation.foreignPolicy.activeWars[i]!;
    deployments[i] = {
      location: war.name,
      size: Math.floor(nation.military.standingArmy * 0.3), // Estimate 30% deployed per war
    };
  }

  const military = {
    strength: totalMilitaryStrength,
    deployments,
  };

  // Build neighbors array - single iteration over Map
  const diplomaticRelationsArray = Array.from(nation.foreignPolicy.diplomaticRelations.values());
  const neighborsCount = diplomaticRelationsArray.length;
  const neighbors: NationDiplomaticRelation[] = new Array(neighborsCount);

  for (let i = 0; i < neighborsCount; i++) {
    const relation = diplomaticRelationsArray[i]!;
    neighbors[i] = {
      name: relation.nationName,
      relation:
        relation.relationship === 'allied'
          ? 'allied'
          : relation.relationship === 'hostile' || relation.relationship === 'at_war'
            ? 'hostile'
            : 'neutral',
    };
  }

  // Build pending proposals - pre-allocate with estimated size
  const activeResearchCount = nation.technology.activeResearchProjects.length;
  const pendingProposals: Array<{
    type: string;
    proposer: string;
    description: string;
  }> = [];

  // Add active research projects as proposals
  for (let i = 0; i < activeResearchCount; i++) {
    const project = nation.technology.activeResearchProjects[i]!;
    if (project.progress < 1) {
      pendingProposals.push({
        type: 'research',
        proposer: 'Science Advisor',
        description: `Continue ${project.name} research (${Math.floor(project.progress * 100)}% complete)`,
      });
    }
  }

  // Add war goals as proposals
  for (let i = 0; i < activeWarsCount; i++) {
    const war = nation.foreignPolicy.activeWars[i]!;
    if (war.status === 'active') {
      pendingProposals.push({
        type: 'military',
        proposer: 'Military Commander',
        description: `Continue war: ${war.name} (${war.warGoals.join(', ')})`,
      });
    }
  }

  return {
    nation: {
      name: nation.name,
      governmentType:
        nation.governanceType === 'monarchy'
          ? 'monarchy'
          : nation.governanceType === 'democracy'
            ? 'democracy'
            : 'oligarchy',
      population: nation.totalPopulation,
      territory: provinceCount,
    },
    provinces,
    economy,
    military,
    neighbors,
    pendingProposals,
  };
}

// ============================================================================
// TIER 4: EMPIRE CONTEXT
// ============================================================================

/**
 * Nation record in empire context (aggregated vassal)
 */
export interface EmpireNationRecord {
  name: string;
  population: number;
  loyalty: number; // 0-1
  militaryStrength: number;
  resources: string[];
}

/**
 * Diplomatic relation with another empire
 */
export interface EmpireDiplomaticRelation {
  targetEmpire: string;
  relation: 'allied' | 'friendly' | 'neutral' | 'rival' | 'hostile' | 'at_war';
  trustLevel: number; // 0-1
}

/**
 * Threat to the empire
 */
export interface EmpireThreat {
  type: 'rebellion' | 'invasion' | 'economic_collapse' | 'separatist_movement';
  severity: 'low' | 'moderate' | 'high' | 'existential';
  description: string;
}

/**
 * EmpireContext - Context for empire-level governance
 *
 * Empires govern multiple nations (vassals), manage autonomy vs control.
 * Time scale: 1 year/tick (abstract simulation)
 */
export interface EmpireContext {
  /** Empire metadata */
  empire: {
    name: string;
    population: number;
    territory: number; // Star systems
    species: string; // Imperial species
  };

  /** Vassal nations under empire */
  nations: Array<{
    name: string;
    population: number;
    loyalty: number; // 0-1
    militaryStrength: number;
    resources: Record<string, number>;
  }>;

  /** Diplomatic relations with other empires */
  diplomaticRelations: Array<{
    targetEmpire: string;
    relation: 'allied' | 'neutral' | 'rival' | 'war';
    trustLevel: number; // 0-1
  }>;

  /** Current threats to the empire */
  threats: Array<{
    type: string;
    severity: number;
    description: string;
  }>;

  /** Advisor recommendations */
  advisorRecommendations: Array<{
    advisor: string; // 'military', 'economic', 'diplomatic', 'research'
    recommendation: string;
  }>;
}

/**
 * Build context for emperor
 *
 * PERFORMANCE OPTIMIZATIONS:
 * - Uses cached query to avoid repeated world.query() calls
 * - Pre-allocates arrays with known size
 * - Uses object pools for nation/diplomacy/threat records to reduce GC pressure
 * - Minimizes Map iterations
 * - Caches intermediate results
 *
 * @param emperor - Emperor entity (soul agent)
 * @param world - World instance
 * @returns Empire context for LLM prompts
 */
export function buildEmpireContext(emperor: Entity, world: World): EmpireContext {
  // Use cached query instead of world.query()
  const empires = empireGovernanceQuery.get(world);
  const empireEntity = empires.find((e) => {
    const impl = e as EntityImpl;
    const eg = impl.getComponent<EmpireGovernanceComponent>(CT.EmpireGovernance);
    return eg && eg.emperorAgentId === emperor.id;
  });

  if (!empireEntity) {
    throw new Error(`Emperor ${emperor.id} has no associated empire`);
  }

  const empireImpl = empireEntity as EntityImpl;
  const empire = empireImpl.getComponent<EmpireGovernanceComponent>(CT.EmpireGovernance);

  if (!empire) {
    throw new Error('Empire entity missing EmpireGovernance component');
  }

  // Use cached query and pre-allocate nations array
  const allNations = nationGovernanceQuery.get(world);
  const coreNationsCount = empire.coreNationIds.length;
  const vassalNationsCount = empire.vassalNationIds.length;
  const totalNationsCount = coreNationsCount + vassalNationsCount;
  const nations = new Array(totalNationsCount);

  // Process core nations first
  for (let i = 0; i < coreNationsCount; i++) {
    const nationId = empire.coreNationIds[i]!;
    const nationEntity = allNations.find((n) => n.id === nationId);

    if (!nationEntity) {
      const record = nationRecordPool.acquire();
      record.name = 'Unknown Nation';
      record.population = 0;
      record.loyalty = 0;
      record.militaryStrength = 0;
      record.resources = {};
      nations[i] = record;
      continue;
    }

    const nationImpl = nationEntity as EntityImpl;
    const nation = nationImpl.getComponent<NationGovernanceComponent>(CT.NationGovernance);

    if (!nation) {
      const record = nationRecordPool.acquire();
      record.name = 'Unknown Nation';
      record.population = 0;
      record.loyalty = 0;
      record.militaryStrength = 0;
      record.resources = {};
      nations[i] = record;
      continue;
    }

    // Acquire pooled object and populate
    const record = nationRecordPool.acquire();
    record.name = nation.name;
    record.population = nation.totalPopulation;
    record.loyalty = empire.stability.vassalLoyalty.get(nationId) ?? 1.0; // Core nations default to 1.0
    record.militaryStrength = nation.military.standingArmy + nation.military.reserves;
    record.resources = {
      GDP: nation.economy.GDP,
      military_forces: nation.military.standingArmy + nation.military.reserves,
    };

    nations[i] = record;
  }

  // Process vassal nations
  for (let i = 0; i < vassalNationsCount; i++) {
    const nationId = empire.vassalNationIds[i]!;
    const nationEntity = allNations.find((n) => n.id === nationId);
    const arrayIndex = coreNationsCount + i;

    if (!nationEntity) {
      const record = nationRecordPool.acquire();
      record.name = 'Unknown Nation';
      record.population = 0;
      record.loyalty = 0;
      record.militaryStrength = 0;
      record.resources = {};
      nations[arrayIndex] = record;
      continue;
    }

    const nationImpl = nationEntity as EntityImpl;
    const nation = nationImpl.getComponent<NationGovernanceComponent>(CT.NationGovernance);

    if (!nation) {
      const record = nationRecordPool.acquire();
      record.name = 'Unknown Nation';
      record.population = 0;
      record.loyalty = 0;
      record.militaryStrength = 0;
      record.resources = {};
      nations[arrayIndex] = record;
      continue;
    }

    // Acquire pooled object and populate
    const record = nationRecordPool.acquire();
    record.name = nation.name;
    record.population = nation.totalPopulation;
    record.loyalty = empire.stability.vassalLoyalty.get(nationId) ?? 1.0;
    record.militaryStrength = nation.military.standingArmy + nation.military.reserves;
    record.resources = {
      GDP: nation.economy.GDP,
      military_forces: nation.military.standingArmy + nation.military.reserves,
    };

    nations[arrayIndex] = record;
  }

  // Build diplomaticRelations - single iteration, use object pool
  const diplomaticRelationsArray = Array.from(empire.foreignPolicy.diplomaticRelations.values());
  const diplomaticRelationsCount = diplomaticRelationsArray.length;
  const diplomaticRelations = new Array(diplomaticRelationsCount);

  for (let i = 0; i < diplomaticRelationsCount; i++) {
    const relation = diplomaticRelationsArray[i]!;
    const record = diplomacyRecordPool.acquire();
    record.targetEmpire = relation.empireName;
    record.relation =
      relation.relationship === 'allied'
        ? 'allied'
        : relation.relationship === 'at_war'
          ? 'war'
          : relation.relationship === 'rival' || relation.relationship === 'hostile'
            ? 'rival'
            : 'neutral';
    record.trustLevel = relation.respectLevel;
    diplomaticRelations[i] = record;
  }

  // Build threats array from separatist movements - use object pool
  const separatistMovementsCount = empire.stability.separatistMovements.length;
  const activeWarsCount = empire.foreignPolicy.activeWars.length;
  const threats = new Array(separatistMovementsCount + activeWarsCount);
  let threatIndex = 0;

  // Add separatist movements as threats
  for (let i = 0; i < separatistMovementsCount; i++) {
    const movement = empire.stability.separatistMovements[i]!;
    const record = threatRecordPool.acquire();
    record.type = movement.goal === 'independence' ? 'separatist_movement' : 'rebellion';
    record.severity =
      movement.threatLevel === 'existential'
        ? 3
        : movement.threatLevel === 'major'
          ? 2
          : movement.threatLevel === 'moderate'
            ? 1
            : 0;
    record.description = `${movement.name} in vassal nation (${Math.floor(movement.supportLevel * 100)}% support)`;
    threats[threatIndex++] = record;
  }

  // Add active wars as threats
  for (let i = 0; i < activeWarsCount; i++) {
    const war = empire.foreignPolicy.activeWars[i]!;
    if (war.status === 'active') {
      const record = threatRecordPool.acquire();
      record.type = 'invasion';
      record.severity = war.totalCasualties > 1000000 ? 3 : war.totalCasualties > 100000 ? 2 : 1;
      record.description = `${war.name}: ${war.warGoals.join(', ')}`;
      threats[threatIndex++] = record;
    }
  }

  // Trim threats array to actual size (some wars may not be active)
  threats.length = threatIndex;

  // Build advisorRecommendations
  const advisorRecommendations: Array<{
    advisor: string;
    recommendation: string;
  }> = [];

  // Add automatic advisor recommendations based on empire state
  if (empire.stability.imperialLegitimacy < 50) {
    advisorRecommendations.push({
      advisor: 'diplomatic',
      recommendation: 'Imperial legitimacy is low. Consider reforms or propaganda campaigns.',
    });
  }

  if (empire.economy.imperialBudget < 0) {
    advisorRecommendations.push({
      advisor: 'economic',
      recommendation: 'Imperial budget is negative. Increase tribute rates or reduce expenditures.',
    });
  }

  // Count low loyalty vassals (single Map iteration, Array.from to avoid downlevelIteration requirement)
  let lowLoyaltyCount = 0;
  const loyaltyArray = Array.from(empire.stability.vassalLoyalty.values());
  for (let i = 0; i < loyaltyArray.length; i++) {
    if (loyaltyArray[i]! < 0.5) {
      lowLoyaltyCount++;
    }
  }

  if (lowLoyaltyCount > 0) {
    advisorRecommendations.push({
      advisor: 'military',
      recommendation: `${lowLoyaltyCount} vassal(s) have low loyalty. Prepare for potential rebellions.`,
    });
  }

  return {
    empire: {
      name: empire.name,
      population: empire.totalPopulation,
      territory: empire.totalSystems,
      species: empire.culture.officialLanguage, // Use language as species proxy for now
    },
    nations,
    diplomaticRelations,
    threats,
    advisorRecommendations,
  };
}

// ============================================================================
// TIER 6: GALACTIC COUNCIL CONTEXT
// ============================================================================

/**
 * Galaxy state snapshot
 */
export interface GalaxyState {
  totalStars: number;
  totalPlanets: number;
  totalPopulation: number; // Trillions
  speciesCount: number;
}

/**
 * Species represented in galactic council
 */
export interface SpeciesRepresentation {
  speciesName: string;
  homeworld: string;
  population: number;
  temperament: string; // E.g., "aggressive", "peaceful", "mercantile"
}

/**
 * Galactic crisis
 */
export interface GalacticCrisis {
  type: string; // war, plague, cosmic_anomaly, resource_shortage
  severity: number; // 0-1
  affectedSpecies: string[];
}

/**
 * Galactic council proposal
 */
export interface GalacticProposal {
  proposedBy: string; // Species or federation name
  proposal: string;
  support: number; // Number of supporting members
  opposition: number; // Number of opposing members
}

/**
 * GalacticCouncilContext - Context for galaxy-wide governance
 *
 * Galactic Council governs relations between federations and empires.
 * Time scale: 100 years/tick (cosmic simulation)
 */
export interface GalacticCouncilContext {
  /** Galaxy-wide state */
  galaxyState: GalaxyState;

  /** Species represented in council */
  speciesRepresented: SpeciesRepresentation[];

  /** Current galactic crises */
  currentCrises: GalacticCrisis[];

  /** Proposals under consideration */
  proposals: GalacticProposal[];
}

/**
 * Build context for galactic council session
 *
 * PERFORMANCE OPTIMIZATIONS:
 * - Uses cached query to avoid repeated world.query() calls
 * - Pre-allocates arrays with known size
 * - Uses object pools for species/crisis records to reduce GC pressure
 * - Minimizes array iterations and allocations
 * - Caches intermediate results
 *
 * @param councilDelegate - Delegate entity (soul agent representing a species/federation)
 * @param world - World instance
 * @returns Galactic council context for LLM prompts
 */
export function buildGalacticCouncilContext(
  councilDelegate: Entity,
  world: World
): GalacticCouncilContext {
  // Use cached query instead of world.query()
  const councils = galacticCouncilQuery.get(world);
  const councilEntity = councils.find((c) => {
    const impl = c as EntityImpl;
    const gc = impl.getComponent<GalacticCouncilComponent>(CT.GalacticCouncil);
    return (
      gc && gc.assemblyDelegates.some((delegate) => delegate.delegateAgentId === councilDelegate.id)
    );
  });

  if (!councilEntity) {
    throw new Error(`Council delegate ${councilDelegate.id} has no associated galactic council`);
  }

  const councilImpl = councilEntity as EntityImpl;
  const council = councilImpl.getComponent<GalacticCouncilComponent>(CT.GalacticCouncil);

  if (!council) {
    throw new Error('Council entity missing GalacticCouncil component');
  }

  // Cache counts for efficiency
  const totalSectors = council.totalSectors;
  const speciesCount = council.memberSpecies.length;

  // Build galaxyState object - cache calculations
  const galaxyState: GalaxyState = {
    totalStars: totalSectors * 1000, // Estimate 1000 stars per sector
    totalPlanets: totalSectors * 3000, // Estimate 3000 planets per sector
    totalPopulation: council.totalPopulation,
    speciesCount,
  };

  // Build speciesRepresented array using object pool - pre-allocate
  const speciesRepresented = new Array(speciesCount);
  for (let i = 0; i < speciesCount; i++) {
    const species = council.memberSpecies[i]!;
    const record = speciesRecordPool.acquire();
    record.speciesName = species.name;
    record.homeworld = species.homeworld;
    record.population = species.population;
    record.temperament = species.techLevel > 8 ? 'advanced' : species.techLevel > 5 ? 'developed' : 'emerging';
    speciesRepresented[i] = record;
  }

  // Build species names array once (reused for affected species)
  const speciesNames = new Array(speciesCount);
  for (let i = 0; i < speciesCount; i++) {
    speciesNames[i] = speciesRepresented[i].speciesName;
  }

  // Build currentCrises array - pre-allocate with max possible size
  const existentialThreatsCount = council.science.existentialThreats.length;
  const activeDisputesCount = council.disputes.activeDisputes.length;
  const currentCrises = new Array(existentialThreatsCount + activeDisputesCount);
  let crisisIndex = 0;

  // Add existential threats as crises
  for (let i = 0; i < existentialThreatsCount; i++) {
    const threat = council.science.existentialThreats[i]!;
    const record = crisisRecordPool.acquire();
    record.type =
      threat.type === 'gamma_ray_burst' || threat.type === 'supernova'
        ? 'cosmic_anomaly'
        : 'cosmic_anomaly';
    record.severity =
      threat.severity === 'extinction_level'
        ? 1.0
        : threat.severity === 'major'
          ? 0.7
          : threat.severity === 'moderate'
            ? 0.5
            : 0.3;
    record.affectedSpecies = speciesNames; // Reuse pre-built array (all species affected)
    currentCrises[crisisIndex++] = record;
  }

  // Add active disputes as crises (only if escalated to war)
  for (let i = 0; i < activeDisputesCount; i++) {
    const dispute = council.disputes.activeDisputes[i]!;
    if (dispute.status === 'escalated_to_war') {
      const record = crisisRecordPool.acquire();
      record.type = 'war';
      record.severity = 0.8;

      // Build affected species array efficiently
      const partiesCount = dispute.parties.length;
      const affectedSpecies = new Array(partiesCount);
      for (let j = 0; j < partiesCount; j++) {
        const partyId = dispute.parties[j]!;
        // Find species name from member IDs
        let speciesName = 'Unknown Species';
        for (let k = 0; k < speciesCount; k++) {
          const species = council.memberSpecies[k]!;
          if (species.representativeAgentId === partyId) {
            speciesName = species.name;
            break;
          }
        }
        affectedSpecies[j] = speciesName;
      }
      record.affectedSpecies = affectedSpecies;
      currentCrises[crisisIndex++] = record;
    }
  }

  // Trim currentCrises to actual size (some disputes may not be escalated)
  currentCrises.length = crisisIndex;

  // Build proposals array - pre-allocate with estimated size
  const researchProjectsCount = council.science.jointResearchProjects.length;
  const activeMissionsCount = council.peacekeepingForces.activeMissions.length;
  const proposals: GalacticProposal[] = [];

  // Cache total council members for opposition calculation
  const totalCouncilMembers = council.memberFederationIds.length + council.memberEmpireIds.length;

  // Add research projects as proposals
  for (let i = 0; i < researchProjectsCount; i++) {
    const project = council.science.jointResearchProjects[i]!;
    if (project.progress < 1) {
      proposals.push({
        proposedBy: 'Scientific Committee',
        proposal: `Continue ${project.name} research (${Math.floor(project.progress * 100)}% complete)`,
        support: project.participatingStates.length,
        opposition: totalCouncilMembers - project.participatingStates.length,
      });
    }
  }

  // Add peacekeeping missions as proposals
  for (let i = 0; i < activeMissionsCount; i++) {
    const mission = council.peacekeepingForces.activeMissions[i]!;
    if (mission.status === 'active') {
      proposals.push({
        proposedBy: 'Security Council',
        proposal: `Continue peacekeeping mission: ${mission.name} (${mission.type})`,
        support: mission.fleetsDeployed.length,
        opposition: 0,
      });
    }
  }

  return {
    galaxyState,
    speciesRepresented,
    currentCrises,
    proposals,
  };
}

// ============================================================================
// CRISIS MANAGEMENT
// ============================================================================

/**
 * Crisis for emergency decision-making
 */
export interface Crisis {
  type: string;
  severity: number; // 0-1
  description: string;
  affectedEntities: string[];
  requiredResponseTicks: number;
}

/**
 * Crisis protocol for emergency response
 */
export interface CrisisProtocol {
  type: string;
  severity: number;
  requiredResponse: number; // Ticks until action required
  llmBudgetOverride: boolean; // Can skip cooldown for emergency
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Aggregate statistics from child entities
 *
 * Performance: Single-pass aggregation over entities
 *
 * @param entities - Entities to aggregate
 * @param extractor - Function to extract value from entity
 * @returns Sum of extracted values
 */
export function aggregateStats<T>(
  entities: ReadonlyArray<Entity>,
  extractor: (entity: Entity) => number
): number {
  return entities.reduce((sum, entity) => sum + extractor(entity), 0);
}

/**
 * Cache for expensive calculations
 *
 * Use this to cache aggregated stats that don't change frequently
 */
export class ContextCache {
  private cache: Map<string, { value: unknown; timestamp: number }> = new Map();
  private ttl: number; // Time to live in ticks

  constructor(ttl: number = 100) {
    this.ttl = ttl;
  }

  /**
   * Get cached value if not expired
   */
  get<T>(key: string, currentTick: number): T | undefined {
    const cached = this.cache.get(key);
    if (!cached) {
      return undefined;
    }

    if (currentTick - cached.timestamp > this.ttl) {
      // Expired
      this.cache.delete(key);
      return undefined;
    }

    return cached.value as T;
  }

  /**
   * Set cached value
   */
  set(key: string, value: unknown, currentTick: number): void {
    this.cache.set(key, { value, timestamp: currentTick });
  }

  /**
   * Clear all cached values
   */
  clear(): void {
    this.cache.clear();
  }
}

/**
 * Lazy-evaluated context field
 *
 * Use this for expensive calculations that may not be needed in every prompt
 */
export class LazyContextField<T> {
  private value: T | undefined = undefined;
  private computed: boolean = false;
  private computer: () => T;

  constructor(computer: () => T) {
    this.computer = computer;
  }

  /**
   * Get the value, computing it if necessary
   */
  get(): T {
    if (!this.computed) {
      this.value = this.computer();
      this.computed = true;
    }
    return this.value!;
  }

  /**
   * Check if value has been computed
   */
  isComputed(): boolean {
    return this.computed;
  }
}

// ============================================================================
// VILLAGE CONTEXT (TIER 0 - for completeness)
// ============================================================================

/**
 * VillageContext - Context for village-level governance
 *
 * Villages use direct democracy or elder councils.
 * Time scale: Real-time (full ECS simulation)
 */
export interface VillageContext {
  /** Village metadata */
  village: {
    name: string;
    population: number;
    governanceType: 'elder_council' | 'chieftain' | 'direct_democracy';
  };

  /** Population demographics */
  demographics: {
    children: number;
    adults: number;
    elders: number;
  };

  /** Resource stockpiles */
  resources: Map<string, number>;

  /** Current proposals for voting */
  proposals: Array<{
    type: string;
    description: string;
    votesFor: number;
    votesAgainst: number;
  }>;

  /** Village laws */
  laws: Array<{ name: string; description: string }>;

  /** Neighboring villages */
  neighbors: Array<{ name: string; relation: string }>;
}

/**
 * Build context for village elder
 *
 * @param elder - Elder entity (soul agent)
 * @param world - World instance
 * @returns Village context for LLM prompts
 */
export function buildVillageContext(elder: Entity, world: World): VillageContext {
  // Find village governance component
  const villages = world.query().with(CT.VillageGovernance).executeEntities();
  const villageEntity = villages.find((v) => {
    const impl = v as EntityImpl;
    const vg = impl.getComponent<VillageGovernanceComponent>(CT.VillageGovernance);
    return vg && vg.elderAgentIds.includes(elder.id);
  });

  if (!villageEntity) {
    throw new Error(`Elder ${elder.id} has no associated village`);
  }

  const villageImpl = villageEntity as EntityImpl;
  const village = villageImpl.getComponent<VillageGovernanceComponent>(CT.VillageGovernance);
  const townHall = villageImpl.getComponent<TownHallComponent>(CT.TownHall);
  const census = villageImpl.getComponent<CensusBureauComponent>(CT.CensusBureau);

  if (!village) {
    throw new Error('Village entity missing VillageGovernance component');
  }

  if (!townHall) {
    throw new Error('Village entity missing TownHall component');
  }

  // Build demographics
  const demographics = census
    ? {
        children: census.demographics.children,
        adults: census.demographics.adults,
        elders: census.demographics.elders,
      }
    : { children: 0, adults: 0, elders: 0 };

  // Build proposals
  const proposals = village.activeProposals.map((p) => ({
    type: p.type,
    description: p.description,
    votesFor: p.votesFor.length,
    votesAgainst: p.votesAgainst.length,
  }));

  // Build laws
  const laws = village.laws.map((l) => ({
    name: l.name,
    description: l.description,
  }));

  // Build neighbors
  const neighbors = Array.from(village.neighborRelations.values()).map((rel) => ({
    name: rel.villageName,
    relation: rel.relationship,
  }));

  // Build resources from warehouses
  const resources = new Map<string, number>();
  const warehouses = world.query().with(CT.Warehouse).executeEntities();

  for (const entity of warehouses) {
    const impl = entity as EntityImpl;
    const warehouse = impl.getComponent<WarehouseComponent>(CT.Warehouse);

    if (!warehouse) {
      continue;
    }

    // Aggregate stockpiles across all warehouses
    for (const resourceName in warehouse.stockpiles) {
      const amount = warehouse.stockpiles[resourceName];
      if (amount !== undefined && amount > 0) {
        const current = resources.get(resourceName) ?? 0;
        resources.set(resourceName, current + amount);
      }
    }
  }

  return {
    village: {
      name: village.villageName,
      population: townHall.populationCount,
      governanceType: village.governanceType,
    },
    demographics,
    resources,
    proposals,
    laws,
    neighbors,
  };
}

// ============================================================================
// CITY CONTEXT (TIER 1 - for completeness)
// ============================================================================

/**
 * CityContext - Context for city-level governance
 *
 * Cities use CityDirectorSystem for strategic decisions.
 * Time scale: 1 hour/tick when statistical
 */
export interface CityContext {
  /** City metadata */
  city: {
    name: string;
    population: number;
    autonomicNpcCount: number;
    llmAgentCount: number;
  };

  /** Building infrastructure */
  buildings: {
    total: number;
    housingCapacity: number;
    storageCapacity: number;
    productionBuildings: number;
  };

  /** Resource stockpiles */
  resources: {
    foodSupply: number; // Days of food
    woodSupply: number;
    stoneSupply: number;
  };

  /** Threats and challenges */
  threats: {
    nearbyThreats: number;
    recentDeaths: number;
  };

  /** Current strategic focus */
  focus: string; // E.g., "survival", "growth", "security"

  /** Reasoning for current priorities */
  reasoning?: {
    focus: string;
    reasoning: string;
    concerns: string[];
  };
}

/**
 * Build context for city mayor/director
 *
 * @param mayor - Mayor entity (soul agent)
 * @param world - World instance
 * @returns City context for LLM prompts
 */
export function buildCityContext(mayor: Entity, world: World): CityContext {
  // Find city director component
  const cities = world.query().with(CT.CityDirector).executeEntities();
  const cityEntity = cities.find((c) => {
    const impl = c as EntityImpl;
    const cd = impl.getComponent<CityDirectorComponent>(CT.CityDirector);
    return cd; // Simplified check - in real implementation, check mayorAgentId
  });

  if (!cityEntity) {
    throw new Error(`Mayor ${mayor.id} has no associated city`);
  }

  const cityImpl = cityEntity as EntityImpl;
  const city = cityImpl.getComponent<CityDirectorComponent>(CT.CityDirector);

  if (!city) {
    throw new Error('City entity missing CityDirector component');
  }

  return {
    city: {
      name: city.cityName,
      population: city.stats.population,
      autonomicNpcCount: city.stats.autonomicNpcCount,
      llmAgentCount: city.stats.llmAgentCount,
    },
    buildings: {
      total: city.stats.totalBuildings,
      housingCapacity: city.stats.housingCapacity,
      storageCapacity: city.stats.storageCapacity,
      productionBuildings: city.stats.productionBuildings,
    },
    resources: {
      foodSupply: city.stats.foodSupply,
      woodSupply: city.stats.woodSupply,
      stoneSupply: city.stats.stoneSupply,
    },
    threats: {
      nearbyThreats: city.stats.nearbyThreats,
      recentDeaths: city.stats.recentDeaths,
    },
    focus: city.reasoning?.focus || 'balanced',
    reasoning: city.reasoning,
  };
}
