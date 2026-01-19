import type { Component } from '../ecs/Component.js';

/**
 * NationGovernanceComponent - National governance for sovereign nation-states
 *
 * Per 06-POLITICAL-HIERARCHY.md (lines 1166-1453): Nations are sovereign states composed of provinces.
 * Population: 5M-500M | Territory: Nation tier | Time Scale: 1 week/tick (strategic)
 *
 * National governance operates strategically - heads of state make annual decisions,
 * focus is on grand strategy, foreign policy, and military operations.
 */

/**
 * War state between nations (spec lines 1311-1335)
 */
export interface WarState {
  id: string;
  name: string; // "Great War", "Border Conflict"

  // Participants
  aggressorNationIds: string[];
  defenderNationIds: string[];

  // War goals
  warGoals: string[]; // "Conquer Province X", "Liberate City Y"

  // Progress
  startedTick: number;
  duration: number; // Ticks

  // Casualties
  totalCasualties: number;
  militaryLosses: Map<string, number>; // Nation ID → losses

  // Battles
  battles: Battle[];

  // Status
  status: 'active' | 'armistice' | 'peace_treaty' | 'stalemate';
}

/**
 * Battle event (spec lines 1337-1354)
 */
export interface Battle {
  name: string;
  location: string; // Province or city ID
  tick: number;

  attackerNationId: string;
  defenderNationId: string;

  attackerForces: number;
  defenderForces: number;

  victor: string; // Nation ID

  casualties: {
    attacker: number;
    defender: number;
  };
}

/**
 * Treaty between nations (spec lines 1356-1369)
 */
export interface Treaty {
  id: string;
  name: string;
  type: 'peace' | 'alliance' | 'trade' | 'non_aggression' | 'mutual_defense';

  signatoryNationIds: string[];

  terms: string[];

  signedTick: number;
  expiryTick?: number;

  status: 'active' | 'violated' | 'expired';
}

/**
 * Diplomatic relation with another nation (spec lines 1371-1391)
 */
export interface NationRelation {
  nationId: string;
  nationName: string;

  relationship: 'allied' | 'friendly' | 'neutral' | 'rival' | 'hostile' | 'at_war';

  // Opinion
  opinion: number; // -100 to +100
  trustLevel: number; // 0-1

  // Trade
  tradeVolume: number;
  tradeAgreementIds: string[];

  // Diplomatic history
  diplomaticHistory: NationDiplomaticEvent[];

  // Embassies
  hasEmbassy: boolean;
  ambassadorAgentId?: string; // Soul agent
}

/**
 * Diplomatic event (spec lines 1393-1398)
 */
export interface NationDiplomaticEvent {
  type: 'war_declared' | 'peace_signed' | 'alliance_formed' | 'trade_opened' | 'insult' | 'aid_sent';
  description: string;
  tick: number;
  impactOnOpinion: number; // -50 to +50
}

/**
 * Research project (spec lines 1400-1414)
 */
export interface ResearchProject {
  id: string;
  name: string;
  category: TechCategory;

  totalCost: number;
  investedSoFar: number;
  progress: number; // 0-1

  // Research speed modifiers
  universities: number; // Number of universities contributing
  researchersCount: number;

  estimatedCompletionTick: number;
}

/**
 * Technology categories (spec lines 1416-1424)
 */
export type TechCategory =
  | 'agriculture'
  | 'industry'
  | 'military'
  | 'medicine'
  | 'navigation'
  | 'spaceflight'
  | 'computing'
  | 'physics';

/**
 * National law (spec lines 1426-1436)
 */
export interface NationalLaw {
  name: string;
  description: string;
  scope: 'constitutional' | 'criminal' | 'civil' | 'economic' | 'social';

  // Enforcement
  enforcedInProvinces: string[];

  enactedTick: number;
  enactedBy: string; // Head of state or legislature
}

/**
 * National policy (spec lines 1438-1453)
 */
export interface NationalPolicy {
  name: string;
  description: string;
  type: 'domestic' | 'foreign' | 'economic' | 'military' | 'social';

  // Effects
  effects: {
    GDPGrowth?: number;
    militaryStrength?: number;
    publicOpinion?: number;
    diplomaticInfluence?: number;
  };

  enactedTick: number;
  expiryTick?: number;
}

/**
 * Nation governance structure - sovereign state political layer
 *
 * Design principles:
 * - Strategic simulation (1 week per tick)
 * - Head of state is a soul agent (LLM-controlled in Phase 3+)
 * - Provinces aggregate upward to nation
 * - Nation can be part of Empire (Tier 4) or independent
 *
 * Spec reference: lines 1166-1453
 */
export interface NationGovernanceComponent extends Component {
  type: 'nation_governance';

  // Identity
  name: string;
  foundedTick: number;

  // Territory (spec lines 1174-1183)
  capitalProvinceId?: string;
  capitalCityId?: string; // National capital
  provinceIds: string[]; // All provinces (5-50)
  totalPopulation: number;
  totalArea: number; // km²
  planetId?: string; // Which planet (for multi-planet empires later)

  // National leadership (spec lines 1188-1207)
  governanceType: 'monarchy' | 'republic' | 'theocracy' | 'democracy' | 'dictatorship';
  headOfStateAgentId?: string; // King, President, Emperor, etc.
  title: string; // "King", "President", "Supreme Leader"

  // Legislature (if applicable)
  legislatureType?: 'parliament' | 'senate' | 'congress';
  legislatorIds: string[]; // Soul agents

  // Succession
  successionType: 'hereditary' | 'elected' | 'appointed' | 'military_coup';
  heirApparentId?: string; // Soul agent (if hereditary)

  // Term
  termLength?: number; // Ticks (if elected)
  termStartTick?: number;
  nextElectionTick?: number;

  // National economy (spec lines 1211-1232)
  economy: {
    GDP: number; // Gross Domestic Product
    annualBudget: number; // Government budget

    // Revenue
    provincialTaxes: Map<string, number>; // Province ID → tax
    customsDuties: number; // Trade tariffs
    stateSectorRevenue: number; // State-owned enterprises

    // Expenditures
    militaryBudget: number;
    infrastructureBudget: number;
    educationBudget: number;
    healthcareBudget: number;
    researchBudget: number;
    socialWelfareBudget: number;

    // Debt
    nationalDebt: number;
    debtToGDPRatio: number;
  };

  // Military forces (spec lines 1237-1251)
  military: {
    // Ground forces
    standingArmy: number; // Total soldiers
    reserves: number;

    // Naval forces (from Ship domain)
    navyId?: string; // NavyTier ID (from 05-SHIP-FLEET-HIERARCHY.md)

    // Military readiness
    mobilization: 'peacetime' | 'partial' | 'full';
    morale: number; // 0-1

    // Military tech level
    militaryTechLevel: number; // 1-10
  };

  // Foreign policy (spec lines 1261-1279)
  foreignPolicy: {
    strategicPosture: 'isolationist' | 'neutral' | 'interventionist' | 'expansionist';

    // Alliances
    alliedNationIds: string[];

    // Rivals/enemies
    rivalNationIds: string[];
    enemyNationIds: string[];

    // Wars
    activeWars: WarState[];

    // Treaties
    treaties: Treaty[];

    // Diplomatic relations
    diplomaticRelations: Map<string, NationRelation>; // Other nation IDs
  };

  // Technology and research (spec lines 1284-1290)
  technology: {
    techLevel: number; // 1-10
    activeResearchProjects: ResearchProject[];

    // Technological focus
    researchPriorities: TechCategory[];
  };

  // National laws and policies (spec lines 1295-1296)
  nationalLaws: NationalLaw[];
  nationalPolicies: NationalPolicy[];

  // Stability (spec lines 1301)
  stability: number; // 0-1 (0 = civil war, 1 = perfect order)

  // Parent empire (if vassal state) (spec lines 1306-1308)
  parentEmpireId?: string;
  isVassal: boolean;
  autonomyLevel?: number; // 0-1 (if vassal)

  // Update tracking
  lastStrategicUpdateTick: number;
}

/**
 * Create a new NationGovernanceComponent with default values
 */
export function createNationGovernanceComponent(
  nationName: string,
  foundedTick: number,
  governanceType: 'monarchy' | 'republic' | 'theocracy' | 'democracy' | 'dictatorship' = 'monarchy'
): NationGovernanceComponent {
  const isElected = governanceType === 'democracy' || governanceType === 'republic';
  const successionType = governanceType === 'monarchy' ? 'hereditary' :
    governanceType === 'democracy' ? 'elected' :
    governanceType === 'dictatorship' ? 'military_coup' : 'appointed';

  const termLength = isElected ? 12096000 : undefined; // ~10 weeks real-time

  // Title based on governance type
  const title = governanceType === 'monarchy' ? 'King' :
    governanceType === 'democracy' ? 'President' :
    governanceType === 'theocracy' ? 'High Priest' :
    governanceType === 'dictatorship' ? 'Supreme Leader' : 'Chancellor';

  return {
    type: 'nation_governance',
    version: 1,
    name: nationName,
    foundedTick,
    provinceIds: [],
    totalPopulation: 0,
    totalArea: 0,
    governanceType,
    title,
    legislatorIds: [],
    successionType,
    termLength,
    termStartTick: isElected ? foundedTick : undefined,
    nextElectionTick: termLength ? foundedTick + termLength : undefined,
    economy: {
      GDP: 0,
      annualBudget: 0,
      provincialTaxes: new Map(),
      customsDuties: 0,
      stateSectorRevenue: 0,
      militaryBudget: 0,
      infrastructureBudget: 0,
      educationBudget: 0,
      healthcareBudget: 0,
      researchBudget: 0,
      socialWelfareBudget: 0,
      nationalDebt: 0,
      debtToGDPRatio: 0,
    },
    military: {
      standingArmy: 0,
      reserves: 0,
      mobilization: 'peacetime',
      morale: 0.7,
      militaryTechLevel: 1,
    },
    foreignPolicy: {
      strategicPosture: 'neutral',
      alliedNationIds: [],
      rivalNationIds: [],
      enemyNationIds: [],
      activeWars: [],
      treaties: [],
      diplomaticRelations: new Map(),
    },
    technology: {
      techLevel: 1,
      activeResearchProjects: [],
      researchPriorities: [],
    },
    nationalLaws: [],
    nationalPolicies: [],
    stability: 0.8, // Default stable
    isVassal: false,
    lastStrategicUpdateTick: foundedTick,
  };
}
