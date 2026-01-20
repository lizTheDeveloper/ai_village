import type { Component } from '../ecs/Component.js';

/**
 * EmpireComponent - Multi-planet imperial governance
 *
 * Per 06-POLITICAL-HIERARCHY.md: Empires unite multiple nations under
 * imperial authority.
 * Population: 100M-50B | Territory: Multi-planet | Time Scale: 1 year/tick (abstract)
 *
 * Central government vs peripheral autonomy creates tension. Tribute systems,
 * varying autonomy levels, and imperial succession are key mechanics.
 */

/**
 * Dynasty tracking for hereditary empires
 */
export interface Dynasty {
  dynastyId: string; // Unique dynasty identifier
  name: string;
  founderAgentId: string; // Soul agent founder
  foundedTick: number;
  currentRulerId: string; // Current emperor ID
  currentRulerAgentId: string; // Current emperor (for backward compatibility)
  rulers: DynastyRuler[];
  legitimacy: number; // 0-1
}

/**
 * Individual ruler in a dynasty
 */
export interface DynastyRuler {
  agentId: string;
  name: string;
  reignStart: number;
  reignEnd?: number;
  achievements: string[];
  failings: string[];
}

/**
 * Separatist movement within empire
 */
export interface SeparatistMovement {
  id: string;
  name: string;
  nationIds: string[]; // Nations seeking independence
  strength: number; // 0-1 (0 = crushed, 1 = successful)
  leadership: string[]; // Agent IDs
  demands: string[];
  startedTick: number;
  status: 'brewing' | 'active' | 'crushed' | 'negotiating' | 'successful';
}

/**
 * Nation within empire (aggregated data)
 */
export interface EmpireNationRecord {
  nationId: string;
  nationName: string;
  population: number;
  gdp: number;
  isCore: boolean; // Core vs vassal
  autonomyLevel: number; // 0-1 (0 = fully integrated, 1 = independent)
  tributePaid: number;
  militaryContribution: number;
  loyaltyToEmpire: number; // 0-1
  lastUpdateTick: number;
}

/**
 * Diplomatic relation with another empire
 */
export interface EmpireRelation {
  empireId: string;
  empireName: string;
  relationship: 'allied' | 'friendly' | 'neutral' | 'rival' | 'hostile' | 'at_war';
  opinion: number; // -100 to 100
  treaties: string[]; // Treaty IDs
  diplomaticEvents: EmpireDiplomaticEvent[];
}

/**
 * Diplomatic event between empires
 */
export interface EmpireDiplomaticEvent {
  type: string;
  description: string;
  tick: number;
  opinionImpact: number;
}

/**
 * Battle event in imperial war
 */
export interface ImperialBattle {
  name: string;
  location: string; // System or planet ID
  tick: number;
  attackerEmpireId: string;
  defenderEmpireId: string;
  attackerForces: number;
  defenderForces: number;
  victor: string; // Empire ID
  outcome: 'attacker_victory' | 'defender_victory' | 'stalemate';
  casualties: {
    attacker: number;
    defender: number;
  };
}

/**
 * Imperial war state
 */
export interface ImperialWar {
  id: string;
  name: string;
  aggressorEmpireIds: string[];
  defenderEmpireIds: string[];
  aggressorNationIds: string[]; // Nation-level participants (aggregated from empires)
  defenderNationIds: string[]; // Nation-level participants (aggregated from empires)
  warGoals: string[];
  startedTick: number;
  duration: number;
  totalCasualties: number;
  militaryLosses: Map<string, number>; // Empire ID → losses
  battles: ImperialBattle[]; // Battle history
  systemsConquered: Map<string, string>; // System ID → conquering empire
  occupation?: Map<string, string>; // Province ID → occupying empire ID
  status: 'active' | 'truce' | 'white_peace' | 'victory' | 'defeat';
}

/**
 * Military contribution from vassal nation
 */
export interface MilitaryContribution {
  nationId: string;
  nationName: string;
  troops: number;
  ships: number;
  fleetIds: string[];
}

/**
 * Imperial treaty
 */
export interface ImperialTreaty {
  id: string;
  name: string;
  type: 'trade' | 'military_alliance' | 'non_aggression' | 'peace';
  signatoryEmpireIds: string[];
  terms: string[];
  signedTick: number;
  expirationTick?: number;
  status: 'active' | 'expired' | 'violated' | 'cancelled';
}

/**
 * Empire governance structure - multi-nation imperial layer
 *
 * Design principles:
 * - Abstract simulation (1 year per tick)
 * - Emperor is a soul agent
 * - Core nations vs vassal nations with varying autonomy
 * - Tribute collection and military contribution
 * - Dynasty succession mechanics
 * - Managing separatist movements
 */
export interface EmpireComponent extends Component {
  type: 'empire';
  version: 1;

  // Identity
  empireName: string;
  foundedTick: number;

  // Territory (multi-planet)
  territory: {
    nations: string[]; // Nation IDs
    coreNationIds: string[]; // Directly ruled core
    vassalNationIds: string[]; // Peripheral vassals
    planets: string[]; // Planet IDs (from spatial hierarchy)
    systems: string[]; // System IDs
    totalSystems: number; // Total system count
    totalPopulation: number; // 100M-50B
    totalArea: number; // km² across all planets
  };

  // Leadership
  leadership: {
    type: 'imperial' | 'federation' | 'hegemony' | 'consortium';
    emperorId?: string; // Soul agent
    title: string; // "Emperor", "Empress", "Hegemon", etc.

    // Dynasty (if hereditary)
    dynasty?: Dynasty;

    // Imperial council
    advisorIds?: string[];
    councilMemberIds?: string[]; // Vassal kings, governors

    // Succession
    successionLaw: 'primogeniture' | 'election' | 'meritocracy' | 'divine_right';
    heirApparentId?: string;
  };

  // Economy
  economy: {
    gdp: number; // Sum of all nation GDPs
    imperialTreasury: number;
    annualBudget: number;

    // Revenue
    tributeFromNations: number; // Annual tribute
    tributeRate: number; // % of vassal GDP
    customsDuties: number;

    // Expenditures
    imperialAdministration: number;
    imperialNavyBudget: number;
    imperialInfrastructure: number;
    megastructureInvestment: number;
    researchBudget: number;
  };

  // Military
  military: {
    // Total forces (aggregate of all nations)
    totalArmadas: number;
    totalFleets: number;
    totalShips: number;

    // Imperial navy (distinct from national navies)
    imperialNavyId?: string; // Navy component ID
    grandAdmiralId?: string; // Soul agent

    // Vassal contributions
    vassalContributions: MilitaryContribution[];

    // Wars
    activeWars: ImperialWar[];
    warStatus: 'peace' | 'mobilizing' | 'at_war';
  };

  // Diplomacy
  diplomacy: {
    relations: Map<string, EmpireRelation>;
    treaties: ImperialTreaty[];
    enemies: string[]; // Empire IDs at war with
    allies: string[]; // Empire IDs allied with
    tributaries: string[]; // Vassal nation IDs
  };

  // Technology & Culture
  techLevel: number; // 1-10
  kardashevLevel: number; // 1.0-3.0 (energy usage scale)

  // Stability
  centralAuthority: number; // 0-1 (0 = fragmented, 1 = absolute control)
  vassalLoyalty: number; // 0-1 (average loyalty across vassals)
  separatistMovements: SeparatistMovement[];

  // Autonomy levels
  autonomyLevels: Map<string, number>; // Nation ID → autonomy (0-1)

  // Nations
  nationRecords: EmpireNationRecord[];

  // Foreign Policy (top-level for systems that access it directly)
  foreignPolicy: {
    activeWars: ImperialWar[];
    imperialTreaties: ImperialTreaty[];
    diplomaticRelations: Map<string, EmpireRelation>;
  };

  // Stability (top-level for context builders)
  stability: {
    imperialLegitimacy: number; // 0-100
    vassalLoyalty: Map<string, number>; // Vassal ID → loyalty (0-1)
    rebellionRisk: Map<string, number>; // Vassal ID → risk (0-1)
    separatistMovements: SeparatistMovement[];
  };

  // Ruling Dynasty (top-level for succession systems)
  rulingDynasty?: Dynasty;

  // Succession Law (top-level for succession systems)
  successionLaw: 'primogeniture' | 'election' | 'meritocracy' | 'divine_right';

  // Update tracking
  lastImperialUpdateTick: number;
}

/**
 * Create a new EmpireComponent with default values
 */
export function createEmpireComponent(
  empireName: string,
  foundedTick: number,
  governmentType: 'imperial' | 'federation' | 'hegemony' | 'consortium' = 'imperial'
): EmpireComponent {
  let title: string;
  let successionLaw: 'primogeniture' | 'election' | 'meritocracy' | 'divine_right';

  switch (governmentType) {
    case 'imperial':
      title = 'Emperor';
      successionLaw = 'primogeniture';
      break;
    case 'federation':
      title = 'Federal Chancellor';
      successionLaw = 'election';
      break;
    case 'hegemony':
      title = 'Hegemon';
      successionLaw = 'meritocracy';
      break;
    case 'consortium':
      title = 'Director-General';
      successionLaw = 'election';
      break;
  }

  return {
    type: 'empire',
    version: 1,
    empireName,
    foundedTick,
    territory: {
      nations: [],
      coreNationIds: [],
      vassalNationIds: [],
      planets: [],
      systems: [],
      totalSystems: 0,
      totalPopulation: 0,
      totalArea: 0,
    },
    leadership: {
      type: governmentType,
      title,
      successionLaw,
    },
    economy: {
      gdp: 0,
      imperialTreasury: 0,
      annualBudget: 0,
      tributeFromNations: 0,
      tributeRate: 0.1, // 10% default
      customsDuties: 0,
      imperialAdministration: 0,
      imperialNavyBudget: 0,
      imperialInfrastructure: 0,
      megastructureInvestment: 0,
      researchBudget: 0,
    },
    military: {
      totalArmadas: 0,
      totalFleets: 0,
      totalShips: 0,
      vassalContributions: [],
      activeWars: [],
      warStatus: 'peace',
    },
    diplomacy: {
      relations: new Map(),
      treaties: [],
      enemies: [],
      allies: [],
      tributaries: [],
    },
    foreignPolicy: {
      activeWars: [],
      imperialTreaties: [],
      diplomaticRelations: new Map(),
    },
    stability: {
      imperialLegitimacy: 70, // Start with moderate legitimacy
      vassalLoyalty: new Map(),
      rebellionRisk: new Map(),
      separatistMovements: [],
    },
    successionLaw,
    techLevel: 1,
    kardashevLevel: 1.0,
    centralAuthority: 0.7,
    vassalLoyalty: 0.7,
    separatistMovements: [],
    autonomyLevels: new Map(),
    nationRecords: [],
    lastImperialUpdateTick: foundedTick,
  };
}

/**
 * Add a nation as a vassal
 */
export function addVassal(
  empire: EmpireComponent,
  nationId: string,
  nationName: string,
  autonomy: number
): void {
  if (empire.territory.vassalNationIds.includes(nationId)) {
    throw new Error(`Nation ${nationId} is already a vassal`);
  }

  if (autonomy < 0 || autonomy > 1) {
    throw new Error(`Autonomy must be between 0 and 1, got ${autonomy}`);
  }

  empire.territory.vassalNationIds.push(nationId);
  empire.territory.nations.push(nationId);
  empire.autonomyLevels.set(nationId, autonomy);
  empire.diplomacy.tributaries.push(nationId);
}

/**
 * Add a nation as core territory
 */
export function addCoreNation(
  empire: EmpireComponent,
  nationId: string
): void {
  if (empire.territory.coreNationIds.includes(nationId)) {
    throw new Error(`Nation ${nationId} is already core territory`);
  }

  empire.territory.coreNationIds.push(nationId);
  empire.territory.nations.push(nationId);
  empire.autonomyLevels.set(nationId, 0); // Core = no autonomy
}

/**
 * Declare imperial war
 */
export function declareImperialWar(
  aggressor: EmpireComponent,
  defenderId: string,
  defenderName: string,
  warGoals: string[],
  currentTick: number
): ImperialWar {
  const war: ImperialWar = {
    id: `imperial_war_${currentTick}_${aggressor.empireName}_vs_${defenderName}`,
    name: `${aggressor.empireName} vs ${defenderName}`,
    aggressorEmpireIds: [aggressor.empireName],
    defenderEmpireIds: [defenderId],
    aggressorNationIds: [...aggressor.territory.nations], // All nations in aggressor empire
    defenderNationIds: [], // Will be populated when defender empire is loaded
    warGoals,
    startedTick: currentTick,
    duration: 0,
    totalCasualties: 0,
    militaryLosses: new Map(),
    battles: [],
    systemsConquered: new Map(),
    occupation: new Map(),
    status: 'active',
  };

  aggressor.military.activeWars.push(war);
  aggressor.military.warStatus = 'at_war';
  aggressor.diplomacy.enemies.push(defenderId);

  // Update relation
  const relation = aggressor.diplomacy.relations.get(defenderId);
  if (relation) {
    relation.relationship = 'at_war';
    relation.opinion = -100;
  }

  return war;
}

/**
 * Collect tribute from vassals
 */
export function collectTribute(
  empire: EmpireComponent,
  nationRecords: EmpireNationRecord[]
): number {
  let totalTribute = 0;

  for (const record of nationRecords) {
    if (!record.isCore && empire.territory.vassalNationIds.includes(record.nationId)) {
      const tribute = record.gdp * empire.economy.tributeRate;
      record.tributePaid = tribute;
      totalTribute += tribute;

      // Tribute affects loyalty
      const autonomy = empire.autonomyLevels.get(record.nationId) ?? 0.5;
      const tributeBurden = tribute / record.gdp;

      if (tributeBurden > autonomy) {
        // High tribute relative to autonomy reduces loyalty
        record.loyaltyToEmpire = Math.max(0, record.loyaltyToEmpire - 0.05);
      }
    }
  }

  empire.economy.tributeFromNations = totalTribute;
  empire.economy.imperialTreasury += totalTribute;

  return totalTribute;
}

/**
 * Update vassal autonomy
 */
export function setVassalAutonomy(
  empire: EmpireComponent,
  nationId: string,
  newAutonomy: number
): void {
  if (newAutonomy < 0 || newAutonomy > 1) {
    throw new Error(`Autonomy must be between 0 and 1, got ${newAutonomy}`);
  }

  if (!empire.territory.vassalNationIds.includes(nationId)) {
    throw new Error(`Nation ${nationId} is not a vassal`);
  }

  empire.autonomyLevels.set(nationId, newAutonomy);
}

/**
 * Create separatist movement
 */
export function createSeparatistMovement(
  empire: EmpireComponent,
  nationIds: string[],
  movementName: string,
  currentTick: number
): SeparatistMovement {
  const movement: SeparatistMovement = {
    id: `separatist_${currentTick}_${movementName}`,
    name: movementName,
    nationIds,
    strength: 0.3, // Start moderate
    leadership: [],
    demands: ['Independence', 'Greater autonomy'],
    startedTick: currentTick,
    status: 'brewing',
  };

  empire.separatistMovements.push(movement);

  return movement;
}

/**
 * Suppress separatist movement
 */
export function suppressSeparatistMovement(
  empire: EmpireComponent,
  movementId: string,
  militaryForce: number
): void {
  const movement = empire.separatistMovements.find(m => m.id === movementId);
  if (!movement) {
    throw new Error(`Movement ${movementId} not found`);
  }

  // Military force reduces movement strength
  movement.strength = Math.max(0, movement.strength - militaryForce);

  if (movement.strength === 0) {
    movement.status = 'crushed';
  }

  // But reduces central authority and vassal loyalty
  empire.centralAuthority = Math.max(0, empire.centralAuthority - 0.02);
  empire.vassalLoyalty = Math.max(0, empire.vassalLoyalty - 0.05);
}

/**
 * Grant independence to separatist movement
 */
export function grantIndependence(
  empire: EmpireComponent,
  movementId: string
): void {
  const movement = empire.separatistMovements.find(m => m.id === movementId);
  if (!movement) {
    throw new Error(`Movement ${movementId} not found`);
  }

  movement.status = 'successful';

  // Remove nations from empire
  for (const nationId of movement.nationIds) {
    const vassalIndex = empire.territory.vassalNationIds.indexOf(nationId);
    if (vassalIndex !== -1) {
      empire.territory.vassalNationIds.splice(vassalIndex, 1);
    }

    const nationIndex = empire.territory.nations.indexOf(nationId);
    if (nationIndex !== -1) {
      empire.territory.nations.splice(nationIndex, 1);
    }

    empire.autonomyLevels.delete(nationId);

    const tributaryIndex = empire.diplomacy.tributaries.indexOf(nationId);
    if (tributaryIndex !== -1) {
      empire.diplomacy.tributaries.splice(tributaryIndex, 1);
    }
  }

  // Increases vassal loyalty (other vassals see empire is reasonable)
  empire.vassalLoyalty = Math.min(1, empire.vassalLoyalty + 0.1);
}

/**
 * Update dynasty
 */
export function updateDynasty(
  empire: EmpireComponent,
  newRulerAgentId: string,
  currentTick: number
): void {
  if (!empire.leadership.dynasty) {
    throw new Error('Empire has no dynasty');
  }

  const dynasty = empire.leadership.dynasty;

  // End current ruler's reign
  const currentRuler = dynasty.rulers.find(r => r.agentId === dynasty.currentRulerAgentId);
  if (currentRuler) {
    currentRuler.reignEnd = currentTick;
  }

  // Start new ruler's reign
  dynasty.currentRulerId = newRulerAgentId;
  dynasty.currentRulerAgentId = newRulerAgentId; // Keep both for backward compatibility
  empire.leadership.emperorId = newRulerAgentId;

  dynasty.rulers.push({
    agentId: newRulerAgentId,
    name: `Ruler ${dynasty.rulers.length + 1}`,
    reignStart: currentTick,
    achievements: [],
    failings: [],
  });
}

/**
 * Check if empire is stable
 */
export function isStable(empire: EmpireComponent): boolean {
  return empire.centralAuthority > 0.5 &&
         empire.vassalLoyalty > 0.5 &&
         empire.separatistMovements.filter(m => m.status === 'active').length === 0;
}

/**
 * Check if empire is at war
 */
export function isAtWar(empire: EmpireComponent): boolean {
  return empire.military.warStatus === 'at_war' && empire.military.activeWars.length > 0;
}

/**
 * Get average vassal loyalty
 */
export function getAverageVassalLoyalty(empire: EmpireComponent): number {
  const vassals = empire.nationRecords.filter(n => !n.isCore);
  if (vassals.length === 0) {
    return 1; // No vassals = perfect loyalty
  }

  const totalLoyalty = vassals.reduce((sum, v) => sum + v.loyaltyToEmpire, 0);
  return totalLoyalty / vassals.length;
}
