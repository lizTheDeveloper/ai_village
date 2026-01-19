import type { Component } from '../ecs/Component.js';

/**
 * NationComponent - Sovereign state governance
 *
 * Per 06-POLITICAL-HIERARCHY.md: Nations are sovereign states controlling
 * regions of a planet.
 * Population: 5M-500M | Territory: Planet regions | Time Scale: 1 month/tick (strategic)
 *
 * Nations conduct foreign policy, field standing militaries (navies),
 * maintain national identity, and compete/cooperate with other nations.
 */

/**
 * Province within a nation (aggregated data)
 */
export interface NationProvinceRecord {
  provinceId: string;
  provinceName: string;
  population: number;
  gdp: number;
  militaryContribution: number;
  loyaltyToNation: number; // 0-1
  lastUpdateTick: number;
}

/**
 * War state tracking
 */
export interface WarState {
  id: string;
  name: string;
  aggressorNationIds: string[];
  defenderNationIds: string[];
  warGoals: string[];
  startedTick: number;
  duration: number;
  totalCasualties: number;
  militaryLosses: Map<string, number>; // Nation ID → losses
  battles: Battle[];
  status: 'active' | 'truce' | 'white_peace' | 'victory' | 'defeat';
}

/**
 * Battle in a war
 */
export interface Battle {
  id: string;
  location: string;
  tick: number;
  attackerForces: number;
  defenderForces: number;
  attackerLosses: number;
  defenderLosses: number;
  outcome: 'attacker_victory' | 'defender_victory' | 'stalemate';
}

/**
 * Treaty between nations
 */
export interface Treaty {
  id: string;
  name: string;
  type: 'trade' | 'military_alliance' | 'non_aggression' | 'peace' | 'customs_union';
  signatoryNationIds: string[];
  terms: string[];
  signedTick: number;
  expirationTick?: number;
  status: 'active' | 'expired' | 'violated' | 'cancelled';
}

/**
 * Diplomatic relation with another nation
 */
export interface NationRelation {
  nationId: string;
  nationName: string;
  relationship: 'allied' | 'friendly' | 'neutral' | 'rival' | 'hostile' | 'at_war';
  opinion: number; // -100 to 100
  truceUntil?: number; // Tick
  treaties: string[]; // Treaty IDs
  diplomaticEvents: NationDiplomaticEvent[];
}

/**
 * Diplomatic event
 */
export interface NationDiplomaticEvent {
  type: string;
  description: string;
  tick: number;
  opinionImpact: number;
}

/**
 * Research project
 */
export interface ResearchProject {
  id: string;
  name: string;
  field: 'military' | 'economic' | 'cultural' | 'scientific';
  costRemaining: number;
  progress: number; // 0-1
  startedTick: number;
  estimatedCompletionTick?: number;
}

/**
 * National law
 */
export interface NationalLaw {
  id: string;
  name: string;
  description: string;
  scope: 'military' | 'economic' | 'social' | 'foreign_policy';
  enactedTick: number;
  enactedBy: string; // Leader agent ID
  effects: {
    type: string;
    magnitude: number;
    description: string;
  }[];
}

/**
 * National policy
 */
export interface NationalPolicy {
  id: string;
  name: string;
  category: 'military' | 'economic' | 'diplomatic' | 'cultural' | 'research';
  priority: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  budgetAllocation: number; // % of national budget
  progress: number; // 0-1
  startTick: number;
  expectedEndTick?: number;
}

/**
 * Nation governance structure - sovereign state political layer
 *
 * Design principles:
 * - Strategic simulation (1 month per tick)
 * - Leader (King/President/etc.) is a soul agent
 * - Provinces aggregate upward to nation
 * - Nations conduct diplomacy, war, research
 * - Nations command navies (from Ship-Fleet hierarchy)
 */
export interface NationComponent extends Component {
  type: 'nation';
  version: 1;

  // Identity
  nationName: string;
  foundedTick: number;

  // Territory
  territory: {
    capitalProvinceId?: string;
    capitalCityId?: string; // National capital
    provinces: string[]; // Province IDs
    totalArea: number; // km²
    planetId?: string; // Which planet (for multi-planet empires)
  };

  // Population (5M-500M)
  population: number;

  // Leadership
  leadership: {
    type: 'monarchy' | 'republic' | 'dictatorship' | 'council' | 'theocracy' | 'democracy';
    leaderId?: string; // Soul agent (king, president, etc.)
    title: string; // "King", "President", "Supreme Leader", etc.

    // Legislature (if applicable)
    legislatureType?: 'parliament' | 'senate' | 'congress';
    legislatorIds?: string[]; // Soul agents

    // Succession
    successionType: 'hereditary' | 'elected' | 'appointed' | 'military_coup';
    heirApparentId?: string; // Soul agent (if hereditary)

    // Term (if elected)
    termLength?: number; // Ticks
    termStartTick?: number;
    nextElectionTick?: number;
  };

  // Economy
  economy: {
    gdp: number; // Gross Domestic Product
    annualBudget: number; // Government budget
    treasury: number; // Current funds

    // Revenue sources
    provincialTaxes: Map<string, number>; // Province ID → tax collected
    customsDuties: number; // Trade tariffs
    stateSectorRevenue: number; // State-owned enterprises

    // Expenditures
    militaryBudget: number;
    infrastructureBudget: number;
    educationBudget: number;
    healthcareBudget: number;
    researchBudget: number;

    // Trade
    taxPolicy: 'low' | 'moderate' | 'high';
    tradeAgreements: string[]; // Treaty IDs
  };

  // Military
  military: {
    // Total forces
    armyStrength: number; // Total soldiers
    navyId?: string; // Navy component ID (from Ship domain)
    airForceStrength?: number; // If tech level allows

    // Mobilization
    mobilization: 'peacetime' | 'partial' | 'full';
    militaryReadiness: number; // 0-1

    // Commanders
    generalIds: string[]; // Soul agent generals
    admiralId?: string; // Soul agent grand admiral

    // Status
    warStatus: 'peace' | 'mobilizing' | 'at_war';
    activeWars: WarState[];
  };

  // Foreign Policy
  foreignPolicy: {
    diplomaticRelations: Map<string, NationRelation>;
    treaties: Treaty[];
    enemies: string[]; // Nation IDs at war with
    allies: string[]; // Nation IDs allied with
    diplomaticPosture: 'isolationist' | 'neutral' | 'interventionist' | 'expansionist';
  };

  // Technology & Research
  techLevel: number; // 1-10
  researchProjects: ResearchProject[];

  // Governance
  laws: NationalLaw[];
  policies: NationalPolicy[];

  // Stability
  legitimacy: number; // 0-1 (0 = rebellion imminent, 1 = fully legitimate)
  stability: number; // 0-1
  unrestFactors: string[];

  // Provinces
  provinceRecords: NationProvinceRecord[];

  // Parent
  parentEmpireId?: string;

  // Update tracking
  lastStrategicUpdateTick: number;
}

/**
 * Create a new NationComponent with default values
 */
export function createNationComponent(
  nationName: string,
  foundedTick: number,
  governmentType: 'monarchy' | 'republic' | 'dictatorship' | 'council' | 'theocracy' | 'democracy' = 'monarchy'
): NationComponent {
  const isElected = governmentType === 'republic' || governmentType === 'democracy';
  const termLength = isElected ? 5760000 : undefined; // ~4 weeks real-time

  let title: string;
  let successionType: 'hereditary' | 'elected' | 'appointed' | 'military_coup';

  switch (governmentType) {
    case 'monarchy':
      title = 'King';
      successionType = 'hereditary';
      break;
    case 'republic':
      title = 'President';
      successionType = 'elected';
      break;
    case 'democracy':
      title = 'Prime Minister';
      successionType = 'elected';
      break;
    case 'dictatorship':
      title = 'Supreme Leader';
      successionType = 'appointed';
      break;
    case 'theocracy':
      title = 'High Priest';
      successionType = 'appointed';
      break;
    case 'council':
      title = 'Council Chair';
      successionType = 'elected';
      break;
  }

  return {
    type: 'nation',
    version: 1,
    nationName,
    foundedTick,
    territory: {
      provinces: [],
      totalArea: 0,
    },
    population: 0,
    leadership: {
      type: governmentType,
      title,
      successionType,
      termLength,
      termStartTick: isElected ? foundedTick : undefined,
      nextElectionTick: isElected && termLength ? foundedTick + termLength : undefined,
    },
    economy: {
      gdp: 0,
      annualBudget: 0,
      treasury: 0,
      provincialTaxes: new Map(),
      customsDuties: 0,
      stateSectorRevenue: 0,
      militaryBudget: 0,
      infrastructureBudget: 0,
      educationBudget: 0,
      healthcareBudget: 0,
      researchBudget: 0,
      taxPolicy: 'moderate',
      tradeAgreements: [],
    },
    military: {
      armyStrength: 0,
      mobilization: 'peacetime',
      militaryReadiness: 0.5,
      generalIds: [],
      warStatus: 'peace',
      activeWars: [],
    },
    foreignPolicy: {
      diplomaticRelations: new Map(),
      treaties: [],
      enemies: [],
      allies: [],
      diplomaticPosture: 'neutral',
    },
    techLevel: 1,
    researchProjects: [],
    laws: [],
    policies: [],
    legitimacy: 0.7,
    stability: 0.8,
    unrestFactors: [],
    provinceRecords: [],
    lastStrategicUpdateTick: foundedTick,
  };
}

/**
 * Declare war on another nation
 */
export function declareWar(
  aggressor: NationComponent,
  defenderId: string,
  defenderName: string,
  warGoals: string[],
  currentTick: number
): WarState {
  if (aggressor.military.warStatus === 'at_war') {
    throw new Error(`${aggressor.nationName} is already at war`);
  }

  const war: WarState = {
    id: `war_${currentTick}_${aggressor.nationName}_vs_${defenderName}`,
    name: `${aggressor.nationName} vs ${defenderName}`,
    aggressorNationIds: [aggressor.nationName],
    defenderNationIds: [defenderId],
    warGoals,
    startedTick: currentTick,
    duration: 0,
    totalCasualties: 0,
    militaryLosses: new Map(),
    battles: [],
    status: 'active',
  };

  aggressor.military.activeWars.push(war);
  aggressor.military.warStatus = 'at_war';
  aggressor.military.mobilization = 'full';
  aggressor.foreignPolicy.enemies.push(defenderId);

  // Update relation
  const relation = aggressor.foreignPolicy.diplomaticRelations.get(defenderId);
  if (relation) {
    relation.relationship = 'at_war';
    relation.opinion = -100;
  }

  return war;
}

/**
 * Sign a treaty with another nation
 */
export function signTreaty(
  nation: NationComponent,
  treaty: Treaty
): void {
  if (nation.foreignPolicy.treaties.find(t => t.id === treaty.id)) {
    throw new Error(`Treaty ${treaty.id} already exists`);
  }

  nation.foreignPolicy.treaties.push(treaty);

  // Update trade agreements if trade treaty
  if (treaty.type === 'trade') {
    nation.economy.tradeAgreements.push(treaty.id);
  }

  // Update allies if military alliance
  if (treaty.type === 'military_alliance') {
    for (const signatoryId of treaty.signatoryNationIds) {
      if (signatoryId !== nation.nationName && !nation.foreignPolicy.allies.includes(signatoryId)) {
        nation.foreignPolicy.allies.push(signatoryId);
      }
    }
  }
}

/**
 * End a war
 */
export function endWar(
  nation: NationComponent,
  warId: string,
  outcome: 'victory' | 'defeat' | 'white_peace'
): void {
  const warIndex = nation.military.activeWars.findIndex(w => w.id === warId);
  if (warIndex === -1) {
    throw new Error(`War ${warId} not found`);
  }

  const war = nation.military.activeWars[warIndex]!;
  war.status = outcome;

  nation.military.activeWars.splice(warIndex, 1);

  if (nation.military.activeWars.length === 0) {
    nation.military.warStatus = 'peace';
    nation.military.mobilization = 'peacetime';
  }
}

/**
 * Update legitimacy
 */
export function updateLegitimacy(nation: NationComponent, delta: number): void {
  if (delta < -1 || delta > 1) {
    throw new Error(`Legitimacy delta must be between -1 and 1, got ${delta}`);
  }

  nation.legitimacy += delta * 0.3; // Dampened
  nation.legitimacy = Math.max(0, Math.min(1, nation.legitimacy));
}

/**
 * Update stability
 */
export function updateStability(nation: NationComponent, delta: number): void {
  if (delta < -1 || delta > 1) {
    throw new Error(`Stability delta must be between -1 and 1, got ${delta}`);
  }

  nation.stability += delta * 0.3; // Dampened
  nation.stability = Math.max(0, Math.min(1, nation.stability));
}

/**
 * Check if nation is at war
 */
export function isAtWar(nation: NationComponent): boolean {
  return nation.military.warStatus === 'at_war' && nation.military.activeWars.length > 0;
}

/**
 * Check if nation has treaty with another nation
 */
export function hasTreatyWith(
  nation: NationComponent,
  otherNationId: string,
  treatyType?: 'trade' | 'military_alliance' | 'non_aggression' | 'peace' | 'customs_union'
): boolean {
  return nation.foreignPolicy.treaties.some(
    t => t.status === 'active' &&
         t.signatoryNationIds.includes(otherNationId) &&
         (!treatyType || t.type === treatyType)
  );
}

/**
 * Get active research projects
 */
export function getActiveResearchProjects(nation: NationComponent): ResearchProject[] {
  return nation.researchProjects.filter(p => p.progress < 1);
}

/**
 * Get completed research projects
 */
export function getCompletedResearchProjects(nation: NationComponent): ResearchProject[] {
  return nation.researchProjects.filter(p => p.progress >= 1);
}
