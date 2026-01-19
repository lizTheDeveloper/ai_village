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
export interface ProvinceGovernorContext extends CivilizationContext {
  /** Province-specific metadata */
  provinceData: ProvinceData;

  /** Directives from parent nation */
  nationalDirectives: NationalDirective[];
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
  const totalFood = cities.reduce((sum, city) => {
    // In real implementation, would query city warehouses
    // For now, use placeholder
    return sum + 0;
  }, 0);

  // Calculate food days remaining (placeholder - needs warehouse integration)
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

  // Build neighbor relations
  const neighbors = Array.from(province.neighborProvinceRelations.values()).map((rel) => ({
    name: rel.provinceName,
    relation: rel.relationship,
  }));

  // Build national directives (placeholder - needs nation tier integration)
  const nationalDirectives: NationalDirective[] = [];
  if (province.parentNationId) {
    // In Phase 3+, query nation entity for directives
    // For now, infer from province policies
    for (const policy of province.policies) {
      nationalDirectives.push({
        type: policy.category,
        priority: policy.priority,
        description: policy.description,
      });
    }
  }

  return {
    // Base CivilizationContext
    population: totalPopulation,
    foodSupply: totalFood,
    foodDaysRemaining,
    keyResources,
    criticalNeeds,
    strategicFocus: province.economy.economicFocus,
    storageCapacity: 0, // Placeholder
    wealth: province.economy.taxRevenue,

    // Province-specific
    provinceData: {
      name: province.provinceName,
      tier: 'province',
      buildings: cities.reduce((sum, city) => sum + 1, 0), // Placeholder
      neighbors,
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
 * Diplomatic relation with another nation
 */
export interface NationDiplomaticRelation {
  targetNation: string;
  relation: 'allied' | 'friendly' | 'neutral' | 'tense' | 'hostile' | 'at_war';
  trustLevel: number; // 0-1
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
    population: number;
    territory: string; // E.g., "Northern Continent"
    species: string; // Dominant species
  };

  /** Provinces under nation control */
  provinces: NationProvinceRecord[];

  /** Diplomatic relations with other nations */
  diplomaticRelations: NationDiplomaticRelation[];

  /** Current threats to the nation */
  threats: NationThreat[];

  /** Advisor recommendations */
  advisorRecommendations: AdvisorRecommendation[];

  /** Economy overview */
  economy: NationEconomy;

  /** Military overview */
  military: NationMilitary;

  /** Pending proposals for consideration */
  pendingProposals: NationProposal[];
}

/**
 * Build context for nation head of state
 *
 * @param headOfState - Head of state entity (king, president, etc.)
 * @param world - World instance
 * @returns Nation context for LLM prompts
 */
export function buildNationContext(headOfState: Entity, world: World): NationContext {
  // TODO: Implement in Phase 3 when NationTier component exists
  // For now, return placeholder
  throw new Error('NationContext not yet implemented - requires Phase 3 NationTier component');
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
    territory: string; // E.g., "3 star systems"
    species: string; // Imperial species
  };

  /** Vassal nations under empire */
  nations: EmpireNationRecord[];

  /** Diplomatic relations with other empires */
  diplomaticRelations: EmpireDiplomaticRelation[];

  /** Current threats to the empire */
  threats: EmpireThreat[];

  /** Advisor recommendations */
  advisorRecommendations: AdvisorRecommendation[];
}

/**
 * Build context for emperor
 *
 * @param emperor - Emperor entity (soul agent)
 * @param world - World instance
 * @returns Empire context for LLM prompts
 */
export function buildEmpireContext(emperor: Entity, world: World): EmpireContext {
  // TODO: Implement in Phase 4 when EmpireTier component exists
  throw new Error('EmpireContext not yet implemented - requires Phase 4 EmpireTier component');
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
  type: 'war' | 'plague' | 'cosmic_anomaly' | 'resource_shortage';
  severity: 'low' | 'moderate' | 'high' | 'galaxy-threatening';
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
 * @param councilDelegate - Delegate entity (soul agent representing a species/federation)
 * @param world - World instance
 * @returns Galactic council context for LLM prompts
 */
export function buildGalacticCouncilContext(
  councilDelegate: Entity,
  world: World
): GalacticCouncilContext {
  // TODO: Implement in Phase 6 when GalacticCouncilTier component exists
  throw new Error(
    'GalacticCouncilContext not yet implemented - requires Phase 6 GalacticCouncilTier component'
  );
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

  return {
    village: {
      name: village.villageName,
      population: townHall.populationCount,
      governanceType: village.governanceType,
    },
    demographics,
    resources: new Map(), // TODO: Integrate with warehouse system
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
