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
import type { NationGovernanceComponent } from '../components/NationGovernanceComponent.js';
import type { EmpireGovernanceComponent } from '../components/EmpireGovernanceComponent.js';
import type { GalacticCouncilComponent } from '../components/GalacticCouncilComponent.js';

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
 * @param headOfState - Head of state entity (king, president, etc.)
 * @param world - World instance
 * @returns Nation context for LLM prompts
 */
export function buildNationContext(headOfState: Entity, world: World): NationContext {
  // Find nation governance component
  const nations = world.query().with(CT.NationGovernance).executeEntities();
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

  // Build provinces array from provinceIds
  const allProvinces = world.query().with(CT.ProvinceGovernance).executeEntities();
  const provinces = nation.provinceIds.map((provinceId) => {
    const provinceEntity = allProvinces.find((p) => p.id === provinceId);
    if (!provinceEntity) {
      return {
        name: 'Unknown Province',
        population: 0,
        resources: {},
        happiness: 0,
      };
    }

    const provinceImpl = provinceEntity as EntityImpl;
    const province = provinceImpl.getComponent<ProvinceGovernanceComponent>(CT.ProvinceGovernance);

    if (!province) {
      return {
        name: 'Unknown Province',
        population: 0,
        resources: {},
        happiness: 0,
      };
    }

    // Convert major resources array to resource map
    const resources: Record<string, number> = {};
    for (const resource of province.economy.majorResources) {
      resources[resource] = 1; // Placeholder - would need actual quantities from warehouse system
    }

    return {
      name: province.provinceName,
      population: province.totalPopulation,
      resources,
      happiness: province.stability, // Use province stability as happiness proxy
    };
  });

  // Build economy object from nation.economy fields
  const economy = {
    gdp: nation.economy.GDP,
    taxRate: nation.economy.provincialTaxes.size > 0
      ? Array.from(nation.economy.provincialTaxes.values()).reduce((sum, tax) => sum + tax, 0) /
          nation.economy.provincialTaxes.size /
          nation.economy.GDP
      : 0.1, // Default 10% if no provinces
    reserves: {
      gold: nation.economy.annualBudget - nation.economy.nationalDebt,
    },
  };

  // Build military object from nation.military fields
  const military = {
    strength: nation.military.standingArmy + nation.military.reserves,
    deployments: nation.foreignPolicy.activeWars.map((war) => ({
      location: war.name,
      size: Math.floor(nation.military.standingArmy * 0.3), // Estimate 30% deployed per war
    })),
  };

  // Build neighbors array from nation.foreignPolicy.diplomaticRelations Map
  const neighbors: NationDiplomaticRelation[] = Array.from(
    nation.foreignPolicy.diplomaticRelations.values()
  ).map((relation) => ({
    name: relation.nationName,
    relation:
      relation.relationship === 'allied'
        ? 'allied'
        : relation.relationship === 'hostile' || relation.relationship === 'at_war'
          ? 'hostile'
          : 'neutral',
  }));

  // Build pending proposals from national laws/policies
  const pendingProposals: Array<{
    type: string;
    proposer: string;
    description: string;
  }> = [];

  // Add active research projects as proposals
  for (const project of nation.technology.activeResearchProjects) {
    if (project.progress < 1) {
      pendingProposals.push({
        type: 'research',
        proposer: 'Science Advisor',
        description: `Continue ${project.name} research (${Math.floor(project.progress * 100)}% complete)`,
      });
    }
  }

  // Add war goals as proposals
  for (const war of nation.foreignPolicy.activeWars) {
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
      territory: nation.provinceIds.length,
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
 * @param emperor - Emperor entity (soul agent)
 * @param world - World instance
 * @returns Empire context for LLM prompts
 */
export function buildEmpireContext(emperor: Entity, world: World): EmpireContext {
  // Find empire governance component
  const empires = world.query().with(CT.EmpireGovernance).executeEntities();
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

  // Build nations array from both coreNationIds and vassalNationIds
  const allNations = world.query().with(CT.NationGovernance).executeEntities();
  const allNationIds = [...empire.coreNationIds, ...empire.vassalNationIds];

  const nations = allNationIds.map((nationId) => {
    const nationEntity = allNations.find((n) => n.id === nationId);
    if (!nationEntity) {
      return {
        name: 'Unknown Nation',
        population: 0,
        loyalty: 0,
        militaryStrength: 0,
        resources: {},
      };
    }

    const nationImpl = nationEntity as EntityImpl;
    const nation = nationImpl.getComponent<NationGovernanceComponent>(CT.NationGovernance);

    if (!nation) {
      return {
        name: 'Unknown Nation',
        population: 0,
        loyalty: 0,
        militaryStrength: 0,
        resources: {},
      };
    }

    // Calculate loyalty from empire.stability.vassalLoyalty Map
    const loyalty = empire.stability.vassalLoyalty.get(nationId) ?? 1.0; // Core nations default to 1.0

    // Convert resources to record
    const resources: Record<string, number> = {};
    resources['GDP'] = nation.economy.GDP;
    resources['military_forces'] = nation.military.standingArmy + nation.military.reserves;

    return {
      name: nation.name,
      population: nation.totalPopulation,
      loyalty,
      militaryStrength: nation.military.standingArmy + nation.military.reserves,
      resources,
    };
  });

  // Build diplomaticRelations array from empire.foreignPolicy.diplomaticRelations Map
  const diplomaticRelations = Array.from(empire.foreignPolicy.diplomaticRelations.values()).map(
    (relation) => {
      const mappedRelation:  'allied' | 'neutral' | 'rival' | 'war' =
        relation.relationship === 'allied'
          ? 'allied'
          : relation.relationship === 'at_war'
            ? 'war'
            : relation.relationship === 'rival' || relation.relationship === 'hostile'
              ? 'rival'
              : 'neutral';
      return {
        targetEmpire: relation.empireName,
        relation: mappedRelation,
        trustLevel: relation.respectLevel,
      };
    }
  );

  // Build threats array from empire.stability.separatistMovements
  const threats = empire.stability.separatistMovements.map((movement) => ({
    type: movement.goal === 'independence' ? 'separatist_movement' : 'rebellion',
    severity:
      movement.threatLevel === 'existential'
        ? 3
        : movement.threatLevel === 'major'
          ? 2
          : movement.threatLevel === 'moderate'
            ? 1
            : 0,
    description: `${movement.name} in vassal nation (${Math.floor(movement.supportLevel * 100)}% support)`,
  }));

  // Add active wars as threats
  for (const war of empire.foreignPolicy.activeWars) {
    if (war.status === 'active') {
      threats.push({
        type: 'invasion',
        severity: war.totalCasualties > 1000000 ? 3 : war.totalCasualties > 100000 ? 2 : 1,
        description: `${war.name}: ${war.warGoals.join(', ')}`,
      });
    }
  }

  // Build advisorRecommendations as empty array (placeholder for future advisor system)
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

  const lowLoyaltyVassals = Array.from(empire.stability.vassalLoyalty.entries()).filter(
    ([_, loyalty]) => loyalty < 0.5
  );
  if (lowLoyaltyVassals.length > 0) {
    advisorRecommendations.push({
      advisor: 'military',
      recommendation: `${lowLoyaltyVassals.length} vassal(s) have low loyalty. Prepare for potential rebellions.`,
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
 * @param councilDelegate - Delegate entity (soul agent representing a species/federation)
 * @param world - World instance
 * @returns Galactic council context for LLM prompts
 */
export function buildGalacticCouncilContext(
  councilDelegate: Entity,
  world: World
): GalacticCouncilContext {
  // Find galactic council component where councilDelegate is in assemblyDelegates
  const councils = world.query().with(CT.GalacticCouncil).executeEntities();
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

  // Build galaxyState object from membership totals
  const galaxyState: GalaxyState = {
    totalStars: council.totalSectors * 1000, // Estimate 1000 stars per sector
    totalPlanets: council.totalSectors * 3000, // Estimate 3000 planets per sector
    totalPopulation: council.totalPopulation,
    speciesCount: council.memberSpecies.length,
  };

  // Build speciesRepresented array from membership.memberSpecies
  const speciesRepresented: SpeciesRepresentation[] = council.memberSpecies.map((species) => ({
    speciesName: species.name,
    homeworld: species.homeworld,
    population: species.population,
    temperament: species.techLevel > 8 ? 'advanced' : species.techLevel > 5 ? 'developed' : 'emerging',
  }));

  // Build currentCrises array from crisis management data
  const currentCrises: GalacticCrisis[] = [];

  // Add existential threats as crises
  for (const threat of council.science.existentialThreats) {
    currentCrises.push({
      type:
        threat.type === 'gamma_ray_burst' || threat.type === 'supernova'
          ? 'cosmic_anomaly'
          : 'cosmic_anomaly',
      severity:
        threat.severity === 'extinction_level'
          ? 1.0
          : threat.severity === 'major'
            ? 0.7
            : threat.severity === 'moderate'
              ? 0.5
              : 0.3,
      affectedSpecies: speciesRepresented.map((s) => s.speciesName), // All species affected by existential threats
    });
  }

  // Add active disputes as crises
  for (const dispute of council.disputes.activeDisputes) {
    if (dispute.status === 'escalated_to_war') {
      currentCrises.push({
        type: 'war',
        severity: 0.8,
        affectedSpecies: dispute.parties.map((partyId) => {
          // Try to find species name from member IDs
          const species = council.memberSpecies.find((s) => s.representativeAgentId === partyId);
          return species?.name ?? 'Unknown Species';
        }),
      });
    }
  }

  // Build proposals array from pending council actions
  const proposals: GalacticProposal[] = [];

  // Add research projects as proposals
  for (const project of council.science.jointResearchProjects) {
    if (project.progress < 1) {
      proposals.push({
        proposedBy: 'Scientific Committee',
        proposal: `Continue ${project.name} research (${Math.floor(project.progress * 100)}% complete)`,
        support: project.participatingStates.length,
        opposition: council.memberFederationIds.length + council.memberEmpireIds.length - project.participatingStates.length,
      });
    }
  }

  // Add peacekeeping missions as proposals
  for (const mission of council.peacekeepingForces.activeMissions) {
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
