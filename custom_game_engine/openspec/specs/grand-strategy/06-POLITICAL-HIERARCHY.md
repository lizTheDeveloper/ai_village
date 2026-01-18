# Political Hierarchy - Governance from Villages to Galactic Councils

**Status:** 🚧 Design Document
**Version:** 1.0.0
**Last Updated:** 2026-01-17
**Dependencies:** 02-SOUL-AGENTS.md, 04-SPATIAL-HIERARCHY.md, 05-SHIP-FLEET-HIERARCHY.md, GovernanceDataSystem, TradeAgreementSystem, Hierarchy Simulator

---

## Overview & Motivation

### The Political Domain Hierarchy

Political entities govern spatial territories and command military assets. This spec defines the organizational hierarchy from village councils to galaxy-spanning federations.

**Tier Table:**

| Tier | Population | Territory | Leadership | Time Scale | Simulation Mode |
|------|-----------|-----------|-----------|------------|-----------------|
| **Village** | 50-500 | Chunk | Elder/Council | Real-time | Full ECS |
| **City** | 500-50K | Zone | Mayor/Director | 1 hour/tick | Full/Statistical |
| **Province** | 50K-5M | Region | Governor | 1 day/tick | Statistical |
| **Nation** | 5M-500M | Planet regions | King/President | 1 month/tick | Strategic |
| **Empire** | 100M-50B | Multi-planet | Emperor | 1 year/tick | Abstract |
| **Federation** | 10B-1T | Multi-system | Council | 10 years/tick | Diplomatic |
| **Galactic Council** | 1T+ | Galaxy-wide | Assembly | 100 years/tick | Cosmic |

**Core Principle:** Political entities emerge from spatial territories and are governed by **soul agents** (captains, mayors, emperors) who persist across eras.

---

## Tier 0: Village Level (50-500 population)

**Scale:** Single chunk, 50-500 agents
**Simulation:** Full ECS (existing GovernanceDataSystem)
**Status:** ✅ Existing (uses TownHallComponent, CensusBureauComponent)

### Overview

Villages are the smallest political unit. Governance is direct and personal - agents know their leaders, attend council meetings, and participate in decisions.

### Existing Components Integration

**TownHallComponent** (from GovernanceDataSystem.ts):
```typescript
interface TownHallComponent {
  type: 'town_hall';

  // Population tracking
  populationCount: number;
  agents: AgentRecord[];  // All villagers tracked

  // Vital statistics
  recentDeaths: DeathRecord[];
  recentBirths: BirthRecord[];

  // Data quality (affected by building condition)
  dataQuality: 'full' | 'delayed' | 'unavailable';
  latency: number;  // Delay in information availability
}

interface AgentRecord {
  id: string;
  name: string;
  age: number;
  generation: number;
  status: 'alive' | 'dead' | 'missing';
}
```

**CensusBureauComponent** (existing):
```typescript
interface CensusBureauComponent {
  type: 'census_bureau';

  // Demographics
  demographics: {
    children: number;
    adults: number;
    elders: number;
  };

  // Vital rates
  birthRate: number;       // Births per day
  deathRate: number;       // Deaths per day
  replacementRate: number; // birthRate / deathRate

  // Projections
  projections: {
    in10Generations: number;
    extinctionRisk: 'none' | 'low' | 'moderate' | 'high';
  };

  // Data accuracy (affected by staffing)
  dataQuality: 'real_time' | 'stale';
  updateFrequency: number | 'immediate';
  accuracy: number;  // 0-1
}
```

### Village Governance Structure

**VillageGovernanceComponent** (NEW):
```typescript
/**
 * Village-level governance
 * Direct democracy or elder council
 */
interface VillageGovernanceComponent extends Component {
  type: 'village_governance';

  /**
   * Village name and identity
   */
  villageName: string;
  foundedTick: Tick;

  /**
   * Leadership structure
   */
  governance: {
    type: 'elder_council' | 'direct_democracy' | 'consensus';

    // Elder council (if applicable)
    elderAgentIds?: EntityId[];  // Soul agents
    chiefElderAgentId?: EntityId;  // Head elder (soul agent)

    // Council meetings
    lastMeetingTick?: Tick;
    meetingInterval: number;  // Ticks between meetings (e.g., 20000 = daily)
  };

  /**
   * Active decisions/votes
   */
  activeProposals: VillageProposal[];

  /**
   * Laws and customs
   */
  laws: VillageLaw[];
  customs: string[];  // E.g., "share food equally", "work together"

  /**
   * Resource management
   */
  priorities: {
    primaryResource: ResourceType;  // E.g., 'food', 'wood', 'shelter'
    secondaryResource: ResourceType;
    buildingQueue: BuildingType[];  // Approved construction
  };

  /**
   * Relationships with other villages
   */
  neighborRelations: Map<EntityId, VillageRelation>;  // Other village IDs
}

interface VillageProposal {
  id: string;
  proposedBy: EntityId;  // Agent ID
  type: 'build' | 'explore' | 'trade' | 'custom';
  description: string;

  // Voting
  votesFor: EntityId[];    // Agents who voted yes
  votesAgainst: EntityId[];
  status: 'voting' | 'approved' | 'rejected' | 'implemented';

  proposedTick: Tick;
  votingDeadline: Tick;
}

interface VillageLaw {
  name: string;
  description: string;
  enactedTick: Tick;
  penalty?: string;  // E.g., "exile", "resource confiscation"
}

interface VillageRelation {
  villageId: EntityId;
  villageName: string;

  relationship: 'allied' | 'friendly' | 'neutral' | 'rival' | 'hostile';
  trustLevel: number;  // 0-1

  // Trade
  tradeAgreements: string[];  // TradeAgreement IDs

  // History
  sharedHistory: string[];  // E.g., "Helped during famine Year 5"
}
```

### Village Decision-Making Process

**Elder Council Meeting:**
```typescript
/**
 * Hold village council meeting
 * Elder council (or all agents if direct democracy) makes decisions
 */
function holdCouncilMeeting(
  village: VillageGovernanceComponent,
  world: World
): void {
  const townHall = getTownHall(village);
  const agents = townHall.agents.filter(a => a.status === 'alive');

  // Determine participants
  let participants: EntityId[];
  if (village.governance.type === 'elder_council') {
    participants = village.governance.elderAgentIds || [];
  } else {
    // Direct democracy: all adults participate
    participants = agents
      .filter(a => a.age >= 18)  // Adults only
      .map(a => a.id);
  }

  // Review active proposals
  for (const proposal of village.activeProposals) {
    if (proposal.status === 'voting' && world.tick >= proposal.votingDeadline) {
      // Count votes
      const totalVotes = proposal.votesFor.length + proposal.votesAgainst.length;
      const forPercentage = proposal.votesFor.length / totalVotes;

      if (forPercentage > 0.5) {
        proposal.status = 'approved';
        executeProposal(proposal, village, world);
      } else {
        proposal.status = 'rejected';
      }
    }
  }

  // Generate new proposals (from agents or LLM-controlled elders)
  if (village.governance.chiefElderAgentId) {
    // Chief elder (soul agent) can propose
    const chiefElder = world.getEntity(village.governance.chiefElderAgentId);
    if (chiefElder.hasComponent('agent_brain')) {
      // LLM-controlled elder evaluates village needs, proposes action
      const proposal = await generateElderProposal(chiefElder, village, world);
      if (proposal) {
        village.activeProposals.push(proposal);
      }
    }
  }

  village.governance.lastMeetingTick = world.tick;
}

/**
 * Execute approved proposal
 */
function executeProposal(
  proposal: VillageProposal,
  village: VillageGovernanceComponent,
  world: World
): void {
  switch (proposal.type) {
    case 'build':
      // Add to building queue
      const buildingType = extractBuildingType(proposal.description);
      village.priorities.buildingQueue.push(buildingType);
      break;

    case 'explore':
      // Assign exploration mission to agents
      const explorers = selectExplorers(village, world, 5);
      assignExplorationMission(explorers, proposal.description);
      break;

    case 'trade':
      // Initiate trade with neighbor
      const targetVillageId = extractTargetVillage(proposal.description);
      initiateTrade(village, targetVillageId, world);
      break;

    case 'custom':
      // Custom proposal (e.g., "establish new law")
      // Implementation depends on description
      break;
  }

  proposal.status = 'implemented';
}
```

### Village Laws and Customs

**Example Laws:**
```typescript
const EXAMPLE_VILLAGE_LAWS = [
  {
    name: "Equal Food Distribution",
    description: "All harvested food goes to communal storage, distributed equally.",
    enactedTick: 1000n,
    penalty: "Reduced rations for 3 days",
  },
  {
    name: "Communal Work Days",
    description: "All able adults work on communal projects (building, defense).",
    enactedTick: 2000n,
    penalty: "Social disapproval",
  },
  {
    name: "Hospitality to Travelers",
    description: "Travelers must be offered shelter and food for 3 days.",
    enactedTick: 500n,
    penalty: "Exile from village",
  },
];
```

**Customs (emergent from agent behavior):**
```typescript
// Customs emerge from repeated patterns, not explicitly enacted
// Example: "gather around campfire at night" becomes tradition
const emergentCustoms = [
  "gather_around_campfire_at_night",
  "honor_dead_with_monument",
  "celebrate_harvest_festival",
  "consult_shaman_before_major_decisions",
];
```

### Integration with Existing Systems

**GovernanceDataSystem** already handles:
- Population tracking (TownHallComponent)
- Demographics (CensusBureauComponent)
- Vital statistics (births, deaths)

**VillageGovernanceComponent** adds:
- Decision-making structure
- Laws and customs
- Resource priorities
- Inter-village relations

**Workflow:**
```
1. GovernanceDataSystem updates TownHall (population, births, deaths)
   ↓
2. VillageGovernanceComponent reads TownHall data
   ↓
3. Elder council evaluates needs (food shortage? need shelter?)
   ↓
4. Council proposes action (build granary, send explorers)
   ↓
5. Agents vote (if direct democracy) or elders decide
   ↓
6. Approved action added to priorities
   ↓
7. CityDirectorSystem (or agent behaviors) executes priorities
```

---

## Tier 1: City Level (500-50,000 population)

**Scale:** Zone tier, 500-50K agents
**Simulation:** Full ECS if on-screen, Statistical if zoomed out
**Time Scale:** 1 hour/tick (when statistical)
**Status:** ✅ Existing (CityDirectorSystem, extended here)

### Overview

Cities are strategic hubs with specialized departments. Governance transitions from direct participation to representative systems with professional administrators.

### Existing Components Integration

**CityDirectorSystem** (existing, packages/core/src/systems/CityDirectorSystem.ts):
```typescript
// City Director is an LLM-controlled soul agent who manages city operations
// Already handles:
// - Resource allocation
// - Building construction
// - Agent task assignments
// - Strategic decisions
```

**Warehouse, HealthClinic, WeatherStation** (existing):
```typescript
// These buildings provide data to city governance
// Already integrated with GovernanceDataSystem
```

### City Governance Structure

**CityGovernanceComponent** (NEW, extends VillageGovernanceComponent):
```typescript
/**
 * City-level governance
 * Departmental structure with mayor/director
 */
interface CityGovernanceComponent extends Component {
  type: 'city_governance';

  /**
   * City identity
   */
  cityName: string;
  foundedTick: Tick;
  population: number;  // Updated from TownHall

  /**
   * Leadership
   */
  governance: {
    type: 'mayoral' | 'council' | 'directorial';

    // Mayor/Director (soul agent, LLM-controlled)
    mayorAgentId?: EntityId;

    // City council (soul agents)
    councilMemberIds: EntityId[];

    // Elections
    electionInterval?: number;  // Ticks between elections
    nextElectionTick?: Tick;
  };

  /**
   * Departments (like ministries)
   */
  departments: {
    agriculture: DepartmentState;
    industry: DepartmentState;
    military: DepartmentState;
    research: DepartmentState;
    infrastructure: DepartmentState;
    commerce: DepartmentState;
  };

  /**
   * Budget and economy
   */
  economy: {
    annualBudget: number;  // Total resources available
    budgetAllocation: Map<Department, number>;  // % of budget per department

    // Revenue sources
    taxRevenue: number;      // From population
    tradeRevenue: number;    // From trade agreements
    productionRevenue: number;  // From resource production
  };

  /**
   * Laws and policies
   */
  cityLaws: CityLaw[];
  policies: CityPolicy[];

  /**
   * Infrastructure projects
   */
  activeProjects: InfrastructureProject[];

  /**
   * Relations with other cities
   */
  diplomaticRelations: Map<EntityId, CityRelation>;  // Other city IDs

  /**
   * Parent governance (if part of province/nation)
   */
  parentProvinceId?: EntityId;
}

type Department =
  | 'agriculture'
  | 'industry'
  | 'military'
  | 'research'
  | 'infrastructure'
  | 'commerce';

interface DepartmentState {
  name: Department;

  // Leadership
  headAgentId?: EntityId;  // Department head (soul agent)

  // Budget
  allocatedBudget: number;
  spentBudget: number;

  // Performance
  efficiency: number;  // 0-1
  output: number;      // Production/completion metrics

  // Staff
  staffCount: number;
  requiredStaff: number;
}

interface CityLaw {
  name: string;
  description: string;
  scope: 'taxation' | 'zoning' | 'trade' | 'labor' | 'criminal';
  enactedTick: Tick;
  enactedBy: EntityId;  // Mayor/council member
}

interface CityPolicy {
  name: string;
  description: string;
  type: 'economic' | 'social' | 'military' | 'technological';

  // Effects (modifiers to city systems)
  effects: {
    productionBonus?: number;  // +10% production
    researchSpeed?: number;    // +20% research
    populationGrowth?: number; // +5% growth
  };

  enactedTick: Tick;
  expiryTick?: Tick;  // If temporary
}

interface InfrastructureProject {
  id: string;
  name: string;
  type: 'road' | 'aqueduct' | 'walls' | 'university' | 'spaceport';

  // Cost and progress
  totalCost: number;
  investedSoFar: number;
  progress: number;  // 0-1

  // Effects when complete
  effects: {
    tradeBonus?: number;
    defenseBonus?: number;
    researchBonus?: number;
  };

  startedTick: Tick;
  estimatedCompletionTick: Tick;
}

interface CityRelation {
  cityId: EntityId;
  cityName: string;

  relationship: 'allied' | 'friendly' | 'neutral' | 'rival' | 'hostile';

  // Trade
  tradeVolume: number;  // Resources traded per month
  tradeAgreementIds: string[];  // TradeAgreement IDs

  // Diplomacy
  diplomaticHistory: DiplomaticEvent[];
}

interface DiplomaticEvent {
  type: 'treaty_signed' | 'trade_opened' | 'border_dispute' | 'alliance_formed';
  description: string;
  tick: Tick;
  impactOnRelation: number;  // -1 to +1
}
```

### City Director Decision-Making

**Mayor/Director (LLM-controlled soul agent):**

The mayor is a strategic decision-maker who evaluates city state and makes high-level decisions.

**Example LLM Prompt:**
```typescript
function buildMayorPrompt(
  mayor: Entity,
  city: CityGovernanceComponent,
  world: World
): string {
  const townHall = getTownHall(city);
  const census = getCensusBureau(city);
  const warehouse = getWarehouse(city);

  return `You are ${mayor.name}, Mayor of ${city.cityName}.

**City Status:**
- Population: ${city.population}
- Budget: ${city.economy.annualBudget} resources
- Growth Rate: ${census.birthRate - census.deathRate} per day

**Resource Stockpiles:**
${Array.from(warehouse.resources.entries()).map(([res, amt]) =>
  `- ${res}: ${amt}`
).join('\n')}

**Department Performance:**
${Object.entries(city.departments).map(([dept, state]) =>
  `- ${dept}: ${(state.efficiency * 100).toFixed(0)}% efficient, ${state.staffCount}/${state.requiredStaff} staffed`
).join('\n')}

**Active Projects:**
${city.activeProjects.map(p =>
  `- ${p.name}: ${(p.progress * 100).toFixed(0)}% complete`
).join('\n')}

**Challenges:**
${identifyChallenges(city, world).join('\n')}

As mayor, what is your priority for the next month? Choose ONE:
1. Economic growth (increase production, trade)
2. Military strength (build defenses, train soldiers)
3. Research advancement (build university, allocate research budget)
4. Infrastructure expansion (roads, aqueducts, buildings)
5. Diplomacy (improve relations with neighboring cities)

Explain your reasoning and specify budget allocation changes if needed.`;
}

/**
 * Mayor makes monthly decision
 */
async function mayorMonthlyDecision(
  mayor: Entity,
  city: CityGovernanceComponent,
  world: World,
  llmProvider: LLMProvider
): Promise<void> {
  const prompt = buildMayorPrompt(mayor, city, world);
  const response = await llmProvider.complete(prompt);

  // Parse LLM response
  const decision = parseMayorDecision(response);

  // Apply decision
  switch (decision.priority) {
    case 'economic_growth':
      city.economy.budgetAllocation.set('commerce', 0.4);
      city.economy.budgetAllocation.set('industry', 0.3);
      break;

    case 'military_strength':
      city.economy.budgetAllocation.set('military', 0.5);
      city.activeProjects.push(createWallsProject(city));
      break;

    case 'research_advancement':
      city.economy.budgetAllocation.set('research', 0.4);
      city.activeProjects.push(createUniversityProject(city));
      break;

    case 'infrastructure_expansion':
      city.economy.budgetAllocation.set('infrastructure', 0.5);
      city.activeProjects.push(createRoadProject(city));
      break;

    case 'diplomacy':
      // Initiate diplomatic mission
      const targetCity = selectDiplomaticTarget(city, world);
      improveDiplomaticRelation(city, targetCity);
      break;
  }

  // Record decision in city history
  recordMayorDecision(city, decision, world.tick);
}
```

### City-Level Laws and Policies

**Example Laws:**
```typescript
const EXAMPLE_CITY_LAWS = [
  {
    name: "Property Tax",
    description: "10% tax on property value, funds city services",
    scope: 'taxation',
    enactedTick: 50000n,
    enactedBy: 'mayor:kara',
  },
  {
    name: "Industrial Zoning",
    description: "Restrict factories to eastern district, reduce pollution in residential areas",
    scope: 'zoning',
    enactedTick: 60000n,
    enactedBy: 'council:marcus',
  },
  {
    name: "Free Trade Agreement",
    description: "No tariffs on imports from allied cities",
    scope: 'trade',
    enactedTick: 70000n,
    enactedBy: 'mayor:kara',
  },
];
```

**Example Policies:**
```typescript
const EXAMPLE_CITY_POLICIES = [
  {
    name: "Innovation Grant Program",
    description: "Subsidize research institutions, attract scholars",
    type: 'technological',
    effects: { researchSpeed: 1.2 },  // +20% research
    enactedTick: 80000n,
  },
  {
    name: "Military Draft",
    description: "Mandatory 2-year service for all adults (wartime policy)",
    type: 'military',
    effects: { /* increases military strength */ },
    enactedTick: 90000n,
    expiryTick: 110000n,  // Temporary, expires after war
  },
];
```

### Integration with TradeAgreementSystem

**Cross-City Trade:**

Cities use the existing **TradeAgreementSystem** (from packages/core/src/systems/TradeAgreementSystem.ts).

**Example:**
```typescript
import { TradeAgreementSystem } from '@ai-village/core';

/**
 * City mayor proposes trade agreement with another city
 */
async function proposeCityTrade(
  proposerCity: CityGovernanceComponent,
  targetCity: CityGovernanceComponent,
  terms: TradeTerm[],
  world: World
): Promise<void> {
  const tradeSystem = world.getSystem<TradeAgreementSystem>('trade_agreement');

  // Create CivilizationIdentity for each city
  const proposerIdentity: CivilizationIdentity = {
    id: proposerCity.id,
    name: proposerCity.cityName,
    type: 'player_village',  // Or 'city' type
    universeId: world.universeId,
    multiverseId: world.multiverseId,
    representativeId: proposerCity.governance.mayorAgentId,
  };

  const targetIdentity: CivilizationIdentity = {
    id: targetCity.id,
    name: targetCity.cityName,
    type: 'npc_village',
    universeId: world.universeId,
    multiverseId: world.multiverseId,
    representativeId: targetCity.governance.mayorAgentId,
  };

  // Determine trade scope (local if same planet, cross-timeline if different β-branches)
  const scope = determineTradeScope(proposerIdentity, targetIdentity);

  // Propose agreement
  const result = tradeSystem.proposeAgreement(
    world,
    proposerCity.id,
    targetCity.id,
    terms,
    proposerCity.governance.mayorAgentId
  );

  if (result.success) {
    // Add to diplomatic relations
    const relation = proposerCity.diplomaticRelations.get(targetCity.id);
    if (relation) {
      relation.tradeAgreementIds.push(result.agreementId);
    }
  }
}
```

---

## Tier 2: Province Level (50K-5M population)

**Scale:** Region tier, multiple cities
**Simulation:** Statistical (no individual agent simulation)
**Time Scale:** 1 day/tick
**Status:** 🆕 New Tier

### Overview

Provinces aggregate multiple cities under a governor. Infrastructure connects cities (roads, communication networks). Taxation flows from cities to province, which redistributes for shared services.

### Data Structure

**ProvinceTier** (NEW):
```typescript
/**
 * Province - administrative region containing multiple cities
 * Governor coordinates inter-city infrastructure and resource allocation
 */
interface ProvinceTier {
  id: string;
  name: string;
  foundedTick: Tick;

  /**
   * Territory
   */
  territory: {
    capitalCityId: EntityId;  // Capital city
    memberCityIds: EntityId[];  // All cities in province (3-20)
    totalPopulation: number;  // Sum of city populations
    totalArea: number;  // km²
  };

  /**
   * Governor (soul agent)
   */
  governance: {
    governorAgentId: EntityId;  // Soul agent
    appointmentMethod: 'elected' | 'appointed' | 'hereditary';

    // Provincial council (city mayors form council)
    provincialCouncil: EntityId[];  // Mayor IDs

    // Term limits
    termLength?: number;  // Ticks
    termStartTick?: Tick;
    nextElectionTick?: Tick;
  };

  /**
   * Economy and taxation
   */
  economy: {
    annualBudget: number;  // Aggregate of city tax revenues
    taxRate: number;  // % of city revenue taken as provincial tax

    // Revenue sources
    cityTaxes: Map<EntityId, number>;  // City ID → tax paid
    tradeRevenue: number;  // Inter-provincial trade

    // Expenditures
    infrastructureBudget: number;
    militaryBudget: number;
    educationBudget: number;
    redistributionBudget: number;  // Aid to poor cities
  };

  /**
   * Infrastructure connecting cities
   */
  infrastructure: {
    roads: RoadNetwork;
    waterways: WaterwayNetwork;
    communicationNetwork: CommunicationNetwork;

    // Projects
    activeProjects: ProvinceInfrastructureProject[];
  };

  /**
   * Provincial laws (supersede city laws)
   */
  provincialLaws: ProvincialLaw[];

  /**
   * Military forces
   */
  military: {
    provincialGuard: number;  // Soldiers under provincial command
    cityMilitias: Map<EntityId, number>;  // City ID → militia size

    // Defensive structures
    forts: EntityId[];  // Fort entity IDs
    borderPosts: EntityId[];
  };

  /**
   * Relations with other provinces
   */
  diplomaticRelations: Map<EntityId, ProvinceRelation>;  // Other province IDs

  /**
   * Parent nation (if part of larger political entity)
   */
  parentNationId?: EntityId;

  /**
   * Stability metrics
   */
  stability: {
    overall: number;  // 0-100
    economicStability: number;
    socialStability: number;
    infrastructureStability: number;
  };
}

interface RoadNetwork {
  roads: Road[];
  totalLength: number;  // km
  maintenanceCost: number;
  condition: number;  // 0-1
}

interface Road {
  id: string;
  startCityId: EntityId;
  endCityId: EntityId;
  length: number;  // km
  quality: 'dirt' | 'paved' | 'highway';

  // Effects on trade
  tradeSpeedBonus: number;  // 1.0 = normal, 1.5 = 50% faster
}

interface WaterwayNetwork {
  canals: Canal[];
  rivers: River[];
  totalLength: number;
}

interface CommunicationNetwork {
  telegraphLines: number;  // km of telegraph
  radioTowers: number;
  internetCoverage: number;  // % of province (future tech)

  // Effects on governance
  informationSpeed: number;  // How fast news travels
}

interface ProvinceInfrastructureProject {
  id: string;
  name: string;
  type: 'road' | 'canal' | 'bridge' | 'communication' | 'fortification';

  connectingCities: EntityId[];  // Cities benefiting from project

  totalCost: number;
  investedSoFar: number;
  progress: number;  // 0-1

  startedTick: Tick;
  estimatedCompletionTick: Tick;
}

interface ProvincialLaw {
  name: string;
  description: string;
  scope: 'taxation' | 'trade' | 'military' | 'infrastructure';

  // Enforcement
  enforcedInCities: EntityId[];  // Which cities must comply
  penaltyForNoncompliance: string;

  enactedTick: Tick;
  enactedBy: EntityId;  // Governor ID
}

interface ProvinceRelation {
  provinceId: EntityId;
  provinceName: string;

  relationship: 'allied' | 'friendly' | 'neutral' | 'rival' | 'hostile';

  // Trade
  tradeVolume: number;
  tradeAgreements: string[];

  // Border disputes
  borderDisputes: BorderDispute[];
}

interface BorderDispute {
  description: string;
  contestedCities: EntityId[];  // Cities both provinces claim
  severity: 'minor' | 'moderate' | 'major';
  startedTick: Tick;
}
```

### Provincial Governance Mechanics

**Governor Decision-Making:**

```typescript
/**
 * Governor makes quarterly decisions
 * Focus: Inter-city coordination, infrastructure, taxation
 */
async function governorQuarterlyDecision(
  governor: Entity,
  province: ProvinceTier,
  world: World,
  llmProvider: LLMProvider
): Promise<void> {
  // Gather province state
  const cities = province.territory.memberCityIds.map(id =>
    world.getEntity(id).getComponent<CityGovernanceComponent>('city_governance')
  );

  const prompt = `You are ${governor.name}, Governor of ${province.name}.

**Province Overview:**
- ${cities.length} cities, total population ${province.territory.totalPopulation}
- Annual budget: ${province.economy.annualBudget} resources
- Infrastructure condition: ${(province.infrastructure.roads.condition * 100).toFixed(0)}%

**City Performance:**
${cities.map(c =>
  `- ${c.cityName}: Pop ${c.population}, Budget ${c.economy.annualBudget}`
).join('\n')}

**Challenges:**
${identifyProvinceChallenges(province).join('\n')}

**Active Infrastructure Projects:**
${province.infrastructure.activeProjects.map(p =>
  `- ${p.name}: ${(p.progress * 100).toFixed(0)}% complete`
).join('\n')}

What is your priority this quarter?
1. Build infrastructure (roads, canals) connecting cities
2. Redistribute wealth (aid struggling cities)
3. Strengthen defense (build forts, train provincial guard)
4. Negotiate with neighboring provinces (trade, alliances)
5. Improve governance (enact provincial laws, streamline bureaucracy)

Explain your reasoning and specify actions.`;

  const response = await llmProvider.complete(prompt);
  const decision = parseGovernorDecision(response);

  applyGovernorDecision(decision, province, world);
}

/**
 * Tax collection from cities
 */
function collectProvincialTax(
  province: ProvinceTier,
  world: World
): void {
  province.economy.annualBudget = 0;
  province.economy.cityTaxes.clear();

  for (const cityId of province.territory.memberCityIds) {
    const city = world.getEntity(cityId).getComponent<CityGovernanceComponent>('city_governance');

    const taxOwed = city.economy.annualBudget * province.economy.taxRate;

    // Deduct from city budget
    city.economy.annualBudget -= taxOwed;

    // Add to province budget
    province.economy.annualBudget += taxOwed;
    province.economy.cityTaxes.set(cityId, taxOwed);
  }
}

/**
 * Redistribute wealth to struggling cities
 */
function redistributeWealth(
  province: ProvinceTier,
  world: World
): void {
  const cities = province.territory.memberCityIds.map(id =>
    world.getEntity(id).getComponent<CityGovernanceComponent>('city_governance')
  );

  // Identify poor cities (below average budget per capita)
  const avgBudgetPerCapita = cities.reduce((sum, c) =>
    sum + c.economy.annualBudget / c.population, 0
  ) / cities.length;

  const poorCities = cities.filter(c =>
    (c.economy.annualBudget / c.population) < avgBudgetPerCapita * 0.7
  );

  // Distribute aid
  const aidPerCity = province.economy.redistributionBudget / poorCities.length;

  for (const city of poorCities) {
    city.economy.annualBudget += aidPerCity;
  }
}
```

### Infrastructure and Law Propagation

**Infrastructure Propagation:**
- Roads connect cities → faster trade
- Communication networks → faster information spread
- Waterways → efficient bulk transport

**Law Propagation:**
- Provincial laws supersede city laws (hierarchy)
- Governor can mandate laws in all cities
- Cities must comply or face sanctions

**Example:**
```typescript
/**
 * Governor enacts provincial law
 */
function enactProvincialLaw(
  province: ProvinceTier,
  law: ProvincialLaw,
  world: World
): void {
  // Add to provincial laws
  province.provincialLaws.push(law);

  // Propagate to all cities
  for (const cityId of law.enforcedInCities) {
    const city = world.getEntity(cityId).getComponent<CityGovernanceComponent>('city_governance');

    // City must adopt law (or face penalty)
    adoptCityLaw(city, law);
  }
}

/**
 * City adopts provincial law
 */
function adoptCityLaw(
  city: CityGovernanceComponent,
  provincialLaw: ProvincialLaw
): void {
  // Convert provincial law to city law
  const cityLaw: CityLaw = {
    name: `[Provincial] ${provincialLaw.name}`,
    description: provincialLaw.description,
    scope: provincialLaw.scope as any,
    enactedTick: provincialLaw.enactedTick,
    enactedBy: provincialLaw.enactedBy,
  };

  city.cityLaws.push(cityLaw);
}
```

---

## Tier 3: Nation Level (5M-500M population)

**Scale:** Planet tier, multiple provinces
**Simulation:** Strategic (statistical outcomes)
**Time Scale:** 1 month/tick
**Status:** 🆕 New Tier

### Overview

Nations are sovereign states controlling regions of a planet. They conduct foreign policy, field standing militaries (navies), maintain national identity, and compete/cooperate with other nations.

### Data Structure

**NationTier** (NEW):
```typescript
/**
 * Nation - sovereign state
 * King/President governs multiple provinces
 * Controls territory, military (including navy), foreign policy
 */
interface NationTier {
  id: string;
  name: string;
  foundedTick: Tick;

  /**
   * Territory
   */
  territory: {
    capitalProvinceId: EntityId;
    capitalCityId: EntityId;  // National capital
    provinceIds: EntityId[];  // All provinces (5-50)
    totalPopulation: number;
    totalArea: number;  // km²

    // Geographic extent
    planetId: EntityId;  // Which planet (for multi-planet empires later)
  };

  /**
   * National leadership
   */
  governance: {
    type: 'monarchy' | 'republic' | 'theocracy' | 'democracy' | 'dictatorship';

    // Head of state (soul agent)
    headOfStateAgentId: EntityId;  // King, President, Emperor, etc.
    title: string;  // "King", "President", "Supreme Leader"

    // Legislature (if applicable)
    legislatureType?: 'parliament' | 'senate' | 'congress';
    legislatorIds?: EntityId[];  // Soul agents

    // Succession
    successionType: 'hereditary' | 'elected' | 'appointed' | 'military_coup';
    heirApparentId?: EntityId;  // Soul agent (if hereditary)

    // Term
    termLength?: number;  // Ticks (if elected)
    termStartTick?: Tick;
    nextElectionTick?: Tick;
  };

  /**
   * National economy
   */
  economy: {
    GDP: number;  // Gross Domestic Product
    annualBudget: number;  // Government budget

    // Revenue
    provincialTaxes: Map<EntityId, number>;  // Province ID → tax
    customsDuties: number;  // Trade tariffs
    stateSectorRevenue: number;  // State-owned enterprises

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

  /**
   * Military forces
   */
  military: {
    // Ground forces
    standingArmy: number;  // Total soldiers
    reserves: number;

    // Naval forces (from Ship domain)
    navyId: EntityId;  // NavyTier ID (from 05-SHIP-FLEET-HIERARCHY.md)

    // Military readiness
    mobilization: 'peacetime' | 'partial' | 'full';
    morale: number;  // 0-1

    // Military tech level
    militaryTechLevel: number;  // 1-10
  };

  /**
   * National identity and culture
   */
  culturalIdentity: CulturalIdentity;  // From hierarchy-simulator types.ts

  /**
   * Foreign policy
   */
  foreignPolicy: {
    strategicPosture: 'isolationist' | 'neutral' | 'interventionist' | 'expansionist';

    // Alliances
    alliedNationIds: EntityId[];

    // Rivals/enemies
    rivalNationIds: EntityId[];
    enemyNationIds: EntityId[];

    // Wars
    activeWars: WarState[];

    // Treaties
    treaties: Treaty[];

    // Diplomatic relations
    diplomaticRelations: Map<EntityId, NationRelation>;  // Other nation IDs
  };

  /**
   * Technology and research
   */
  technology: {
    techLevel: number;  // 1-10 (from CulturalIdentity)
    activeResearchProjects: ResearchProject[];

    // Technological focus
    researchPriorities: TechCategory[];
  };

  /**
   * National laws and policies
   */
  nationalLaws: NationalLaw[];
  nationalPolicies: NationalPolicy[];

  /**
   * Stability
   */
  stability: StabilityMetrics;  // From hierarchy-simulator types.ts

  /**
   * Parent empire (if vassal state)
   */
  parentEmpireId?: EntityId;
  isVassal: boolean;
  autonomyLevel?: number;  // 0-1 (if vassal)
}

interface WarState {
  id: string;
  name: string;  // "Great War", "Border Conflict"

  // Participants
  aggressorNationIds: EntityId[];
  defenderNationIds: EntityId[];

  // War goals
  warGoals: string[];  // "Conquer Province X", "Liberate City Y"

  // Progress
  startedTick: Tick;
  duration: number;  // Ticks

  // Casualties
  totalCasualties: number;
  militaryLosses: Map<EntityId, number>;  // Nation ID → losses

  // Battles
  battles: Battle[];

  // Status
  status: 'active' | 'armistice' | 'peace_treaty' | 'stalemate';
}

interface Battle {
  name: string;
  location: EntityId;  // Province or city ID
  tick: Tick;

  attackerNationId: EntityId;
  defenderNationId: EntityId;

  attackerForces: number;
  defenderForces: number;

  victor: EntityId;  // Nation ID

  casualties: {
    attacker: number;
    defender: number;
  };
}

interface Treaty {
  id: string;
  name: string;
  type: 'peace' | 'alliance' | 'trade' | 'non_aggression' | 'mutual_defense';

  signatoryNationIds: EntityId[];

  terms: string[];

  signedTick: Tick;
  expiryTick?: Tick;

  status: 'active' | 'violated' | 'expired';
}

interface NationRelation {
  nationId: EntityId;
  nationName: string;

  relationship: 'allied' | 'friendly' | 'neutral' | 'rival' | 'hostile' | 'at_war';

  // Opinion
  opinion: number;  // -100 to +100
  trustLevel: number;  // 0-1

  // Trade
  tradeVolume: number;
  tradeAgreementIds: string[];

  // Diplomatic history
  diplomaticHistory: NationDiplomaticEvent[];

  // Embassies
  hasEmbassy: boolean;
  ambassadorAgentId?: EntityId;  // Soul agent
}

interface NationDiplomaticEvent {
  type: 'war_declared' | 'peace_signed' | 'alliance_formed' | 'trade_opened' | 'insult' | 'aid_sent';
  description: string;
  tick: Tick;
  impactOnOpinion: number;  // -50 to +50
}

interface ResearchProject {
  id: string;
  name: string;
  category: TechCategory;

  totalCost: number;
  investedSoFar: number;
  progress: number;  // 0-1

  // Research speed modifiers
  universities: number;  // Number of universities contributing
  researchersCount: number;

  estimatedCompletionTick: Tick;
}

type TechCategory =
  | 'agriculture'
  | 'industry'
  | 'military'
  | 'medicine'
  | 'navigation'
  | 'spaceflight'
  | 'computing'
  | 'physics';

interface NationalLaw {
  name: string;
  description: string;
  scope: 'constitutional' | 'criminal' | 'civil' | 'economic' | 'social';

  // Enforcement
  enforcedInProvinces: EntityId[];

  enactedTick: Tick;
  enactedBy: EntityId;  // Head of state or legislature
}

interface NationalPolicy {
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

  enactedTick: Tick;
  expiryTick?: Tick;
}
```

### National Governance Mechanics

**Head of State Decision-Making:**

```typescript
/**
 * Head of state (King/President) makes annual decisions
 * Focus: Grand strategy, foreign policy, military, national budget
 */
async function headOfStateAnnualDecision(
  headOfState: Entity,
  nation: NationTier,
  world: World,
  llmProvider: LLMProvider
): Promise<void> {
  const prompt = `You are ${headOfState.name}, ${nation.governance.title} of ${nation.name}.

**National Status:**
- Population: ${nation.territory.totalPopulation.toLocaleString()}
- GDP: ${nation.economy.GDP.toLocaleString()} credits
- Military: ${nation.military.standingArmy.toLocaleString()} soldiers, ${getNavySize(nation.military.navyId)} ships
- Tech Level: ${nation.technology.techLevel}/10

**Foreign Relations:**
${Array.from(nation.foreignPolicy.diplomaticRelations.entries())
  .map(([id, rel]) => `- ${rel.nationName}: ${rel.relationship} (opinion: ${rel.opinion})`)
  .join('\n')}

**Active Wars:**
${nation.foreignPolicy.activeWars.map(w => `- ${w.name}: ${w.status}`).join('\n') || 'None'}

**Stability:**
- Overall: ${nation.stability.overall}/100
- Economic: ${nation.stability.economic}/100
- Social: ${nation.stability.social}/100

**Budget Allocation (current):**
- Military: ${(nation.economy.militaryBudget / nation.economy.annualBudget * 100).toFixed(0)}%
- Infrastructure: ${(nation.economy.infrastructureBudget / nation.economy.annualBudget * 100).toFixed(0)}%
- Research: ${(nation.economy.researchBudget / nation.economy.annualBudget * 100).toFixed(0)}%
- Social Welfare: ${(nation.economy.socialWelfareBudget / nation.economy.annualBudget * 100).toFixed(0)}%

What is your priority this year?
1. Military expansion (increase army, build navy)
2. Economic growth (invest in infrastructure, lower taxes)
3. Technological advancement (increase research funding)
4. Diplomatic engagement (alliances, treaties, trade)
5. Internal stability (social programs, suppress unrest)
6. Territorial expansion (declare war, annex territory)

Explain your reasoning and specify policy changes.`;

  const response = await llmProvider.complete(prompt);
  const decision = parseHeadOfStateDecision(response);

  applyNationalDecision(decision, nation, world);
}
```

### Foreign Policy and Diplomacy

**Diplomatic Relations:**

Nations interact through diplomacy, trade, and war.

**Example: Alliance Formation**
```typescript
/**
 * Form alliance between two nations
 */
function formAlliance(
  nation1: NationTier,
  nation2: NationTier,
  world: World
): void {
  // Create alliance treaty
  const treaty: Treaty = {
    id: `treaty_${Date.now()}`,
    name: `${nation1.name}-${nation2.name} Alliance`,
    type: 'alliance',
    signatoryNationIds: [nation1.id, nation2.id],
    terms: [
      "Mutual defense: Attack on one is attack on both",
      "Free trade between nations",
      "No wars without consultation",
    ],
    signedTick: world.tick,
    status: 'active',
  };

  // Add to both nations
  nation1.foreignPolicy.treaties.push(treaty);
  nation2.foreignPolicy.treaties.push(treaty);

  nation1.foreignPolicy.alliedNationIds.push(nation2.id);
  nation2.foreignPolicy.alliedNationIds.push(nation1.id);

  // Improve relations
  const relation1 = nation1.foreignPolicy.diplomaticRelations.get(nation2.id);
  const relation2 = nation2.foreignPolicy.diplomaticRelations.get(nation1.id);

  if (relation1) {
    relation1.relationship = 'allied';
    relation1.opinion = Math.min(100, relation1.opinion + 50);
  }

  if (relation2) {
    relation2.relationship = 'allied';
    relation2.opinion = Math.min(100, relation2.opinion + 50);
  }
}
```

**Example: War Declaration**
```typescript
/**
 * Nation declares war on another nation
 */
function declareWar(
  aggressor: NationTier,
  defender: NationTier,
  warGoals: string[],
  world: World
): void {
  // Create war state
  const war: WarState = {
    id: `war_${Date.now()}`,
    name: `${aggressor.name} vs ${defender.name}`,
    aggressorNationIds: [aggressor.id],
    defenderNationIds: [defender.id],
    warGoals,
    startedTick: world.tick,
    duration: 0,
    totalCasualties: 0,
    militaryLosses: new Map(),
    battles: [],
    status: 'active',
  };

  // Add to both nations
  aggressor.foreignPolicy.activeWars.push(war);
  defender.foreignPolicy.activeWars.push(war);

  // Update relations
  const relation1 = aggressor.foreignPolicy.diplomaticRelations.get(defender.id);
  const relation2 = defender.foreignPolicy.diplomaticRelations.get(aggressor.id);

  if (relation1) {
    relation1.relationship = 'at_war';
    relation1.opinion = -100;
  }

  if (relation2) {
    relation2.relationship = 'at_war';
    relation2.opinion = -100;
  }

  // Mobilize militaries
  aggressor.military.mobilization = 'full';
  defender.military.mobilization = 'full';

  // Notify navies
  const aggressorNavy = world.getEntity(aggressor.military.navyId).getComponent<NavyTier>('navy');
  const defenderNavy = world.getEntity(defender.military.navyId).getComponent<NavyTier>('navy');

  if (aggressorNavy) {
    aggressorNavy.doctrine.strategicPosture = 'offensive';
  }

  if (defenderNavy) {
    defenderNavy.doctrine.strategicPosture = 'defensive';
  }
}
```

### Integration with Ship Domain (Navies)

**Nations control navies** (from 05-SHIP-FLEET-HIERARCHY.md):

```typescript
interface NationTier {
  // ...
  military: {
    // Reference to Navy (from Ship domain)
    navyId: EntityId;  // NavyTier ID
  };
}
```

**Navy operations are commanded by nation:**
```typescript
/**
 * Nation orders navy to conduct operation
 */
function orderNavalOperation(
  nation: NationTier,
  operation: NavalOperation,
  world: World
): void {
  const navy = world.getEntity(nation.military.navyId).getComponent<NavyTier>('navy');

  if (!navy) {
    throw new Error(`Nation ${nation.name} has no navy`);
  }

  switch (operation.type) {
    case 'blockade':
      // Deploy fleet to blockade enemy ports
      const fleet = selectFleetForBlockade(navy, operation.targetSystemId);
      fleet.mission = {
        type: 'blockade',
        targetSystemId: operation.targetSystemId,
        priority: 'critical',
      };
      break;

    case 'invasion':
      // Deploy armada for planetary invasion
      const armada = selectArmadaForInvasion(navy, operation.targetPlanetId);
      armada.campaign = {
        type: 'conquest',
        targetSystems: [operation.targetPlanetId],
      };
      break;

    case 'trade_escort':
      // Assign squadrons to escort trade routes
      assignTradeEscorts(navy, nation.foreignPolicy.treaties);
      break;
  }
}

interface NavalOperation {
  type: 'blockade' | 'invasion' | 'trade_escort' | 'patrol';
  targetSystemId?: string;
  targetPlanetId?: string;
}
```

---

## Tier 4: Empire Level (100M-50B population)

**Scale:** Multi-planet, multiple nations
**Simulation:** Abstract (strategic outcomes only)
**Time Scale:** 1 year/tick
**Status:** 🆕 New Tier

### Overview

Empires unite multiple nations under imperial authority. Central government vs peripheral autonomy creates tension. Tribute systems, varying autonomy levels, and imperial succession are key mechanics.

### Data Structure

**EmpireTier** (NEW):
```typescript
/**
 * Empire - multi-nation imperial state
 * Emperor governs core territory directly, vassals have varying autonomy
 */
interface EmpireTier {
  id: string;
  name: string;
  foundedTick: Tick;

  /**
   * Imperial structure
   */
  structure: {
    // Core empire (directly ruled)
    coreNationIds: EntityId[];  // Nations ruled directly by emperor
    capitalNationId: EntityId;

    // Periphery (vassals with autonomy)
    vassalNationIds: EntityId[];
    autonomyLevels: Map<EntityId, number>;  // Nation ID → autonomy (0-1)

    // Total
    totalPopulation: number;
    totalSystems: number;  // Star systems controlled
    totalPlanets: number;
  };

  /**
   * Imperial leadership
   */
  governance: {
    type: 'absolute' | 'constitutional' | 'federal' | 'feudal';

    // Emperor (soul agent)
    emperorAgentId: EntityId;
    imperialDynasty: Dynasty;

    // Imperial council
    councilMemberIds: EntityId[];  // Soul agents (vassal kings, advisors)

    // Succession
    successionLaw: 'primogeniture' | 'election' | 'meritocracy' | 'divine_right';
    heirApparentId?: EntityId;
  };

  /**
   * Imperial economy
   */
  economy: {
    imperialGDP: number;  // Sum of vassal GDPs
    imperialBudget: number;

    // Tribute system
    tributeCollected: Map<EntityId, number>;  // Vassal ID → tribute
    tributeRate: number;  // % of vassal GDP

    // Imperial expenditures
    imperialAdministration: number;
    imperialNavy: number;
    imperialInfrastructure: number;  // Roads, communication across systems
    imperialResearch: number;
  };

  /**
   * Imperial military
   */
  military: {
    // Imperial Navy (supreme command)
    imperialNavyId: EntityId;  // NavyTier (aggregate of vassal navies)

    // Vassal militaries
    vassalNavies: Map<EntityId, EntityId>;  // Vassal ID → Navy ID

    // Total forces
    totalShips: number;
    totalTroops: number;

    // Military doctrine
    imperialDoctrine: string;  // "Carrier supremacy", "Battleship wall", etc.
  };

  /**
   * Imperial culture
   */
  culture: {
    officialLanguage: string;
    officialReligion?: string;

    // Cultural policies
    assimilationPolicy: 'forced' | 'encouraged' | 'tolerant' | 'multicultural';

    // Cultural drift (vassals develop distinct cultures over time)
    culturalDivergence: Map<EntityId, number>;  // Vassal ID → divergence (0-1)
  };

  /**
   * Foreign policy
   */
  foreignPolicy: {
    strategicPosture: 'expansionist' | 'consolidating' | 'defensive' | 'declining';

    // Relations with other empires
    diplomaticRelations: Map<EntityId, EmpireRelation>;

    // Wars
    activeWars: ImperialWar[];

    // Treaties
    imperialTreaties: ImperialTreaty[];
  };

  /**
   * Technology
   */
  technology: {
    imperialTechLevel: number;  // 1-10

    // Tech spread (core → periphery)
    techSpreadRate: number;  // How fast tech propagates to vassals
  };

  /**
   * Stability and legitimacy
   */
  stability: {
    imperialLegitimacy: number;  // 0-100 (how accepted is emperor's rule?)

    // Vassal loyalty
    vassalLoyalty: Map<EntityId, number>;  // Vassal ID → loyalty (0-1)

    // Rebellion risk
    rebellionRisk: Map<EntityId, number>;  // Vassal ID → risk (0-1)

    // Internal threats
    separatistMovements: SeparatistMovement[];
  };

  /**
   * Parent federation (if part of larger alliance)
   */
  parentFederationId?: EntityId;
}

interface Dynasty {
  name: string;
  founderAgentId: EntityId;  // Soul agent
  currentRulerAgentId: EntityId;

  // Lineage
  rulers: DynastyRuler[];

  foundedTick: Tick;
  durationYears: number;
}

interface DynastyRuler {
  agentId: EntityId;  // Soul agent
  name: string;
  title: string;  // "Emperor Kara I", "Empress Zara the Great"

  reignStart: Tick;
  reignEnd?: Tick;  // If deceased/abdicated

  achievements: string[];
  failings: string[];
}

interface SeparatistMovement {
  id: string;
  name: string;

  // Leader
  leaderAgentId: EntityId;  // Soul agent

  // Support
  vassalNationId: EntityId;
  supportLevel: number;  // 0-1 (% of population supporting)

  // Goals
  goal: 'independence' | 'autonomy_increase' | 'regime_change';

  // Threat level
  threatLevel: 'minor' | 'moderate' | 'major' | 'existential';

  startedTick: Tick;
}

interface EmpireRelation {
  empireId: EntityId;
  empireName: string;

  relationship: 'allied' | 'friendly' | 'neutral' | 'rival' | 'hostile' | 'at_war';

  // Diplomatic standing
  respectLevel: number;  // 0-1 (how much they respect this empire)
  fearLevel: number;  // 0-1 (how much they fear this empire)

  // Trade
  interImperialTrade: number;

  // Treaties
  treaties: string[];  // Treaty IDs
}

interface ImperialWar extends WarState {
  // Extends national WarState

  // Mobilization
  vassalsInvolved: EntityId[];
  vassalContributions: Map<EntityId, MilitaryContribution>;
}

interface MilitaryContribution {
  vassalId: EntityId;
  troopsCommitted: number;
  shipsCommitted: number;
  enthusiasm: number;  // 0-1 (how willingly they contribute)
}

interface ImperialTreaty extends Treaty {
  // Extends national Treaty

  // Imperial-specific
  vassalObligations?: string[];  // What vassals must do
}
```

### Imperial Governance Mechanics

**Centralization vs Autonomy:**

```typescript
/**
 * Calculate vassal autonomy
 * Low autonomy = tight control, high autonomy = near-independence
 */
function calculateVassalAutonomy(
  vassal: NationTier,
  empire: EmpireTier
): number {
  const baseAutonomy = empire.structure.autonomyLevels.get(vassal.id) || 0.5;

  // Factors increasing autonomy
  const distanceFromCore = calculateDistance(vassal, empire.structure.capitalNationId);
  const culturalDivergence = empire.culture.culturalDivergence.get(vassal.id) || 0;
  const militaryStrength = vassal.military.standingArmy / empire.military.totalTroops;

  // Factors decreasing autonomy
  const loyalty = empire.stability.vassalLoyalty.get(vassal.id) || 0.5;
  const economicIntegration = calculateEconomicIntegration(vassal, empire);

  const autonomy = baseAutonomy +
    distanceFromCore * 0.1 +
    culturalDivergence * 0.2 +
    militaryStrength * 0.1 -
    loyalty * 0.2 -
    economicIntegration * 0.1;

  return Math.max(0, Math.min(1, autonomy));
}

/**
 * Vassal rebellion check
 */
function checkVassalRebellion(
  vassal: NationTier,
  empire: EmpireTier,
  world: World
): void {
  const autonomy = empire.structure.autonomyLevels.get(vassal.id) || 0.5;
  const loyalty = empire.stability.vassalLoyalty.get(vassal.id) || 0.5;
  const desiredAutonomy = calculateVassalAutonomy(vassal, empire);

  // Rebellion risk if desired autonomy >> actual autonomy AND low loyalty
  const rebellionRisk = (desiredAutonomy - autonomy) * (1 - loyalty);

  if (rebellionRisk > 0.7) {
    // High rebellion risk, trigger separatist movement
    const movement: SeparatistMovement = {
      id: `separatist_${Date.now()}`,
      name: `${vassal.name} Independence Movement`,
      leaderAgentId: selectRebelLeader(vassal, world),
      vassalNationId: vassal.id,
      supportLevel: rebellionRisk,
      goal: 'independence',
      threatLevel: rebellionRisk > 0.9 ? 'existential' : 'major',
      startedTick: world.tick,
    };

    empire.stability.separatistMovements.push(movement);
  }

  empire.stability.rebellionRisk.set(vassal.id, rebellionRisk);
}
```

**Tribute Collection:**

```typescript
/**
 * Collect tribute from vassals
 */
function collectImperialTribute(
  empire: EmpireTier,
  world: World
): void {
  empire.economy.imperialBudget = 0;
  empire.economy.tributeCollected.clear();

  for (const vassalId of empire.structure.vassalNationIds) {
    const vassal = world.getEntity(vassalId).getComponent<NationTier>('nation');

    // Tribute amount depends on autonomy and loyalty
    const autonomy = empire.structure.autonomyLevels.get(vassalId) || 0.5;
    const loyalty = empire.stability.vassalLoyalty.get(vassalId) || 0.5;

    const tributeRate = empire.economy.tributeRate * (1 - autonomy) * loyalty;
    const tribute = vassal.economy.GDP * tributeRate;

    // Deduct from vassal
    vassal.economy.annualBudget -= tribute;

    // Add to empire
    empire.economy.imperialBudget += tribute;
    empire.economy.tributeCollected.set(vassalId, tribute);

    // Low tribute → decreased loyalty
    if (tributary < vassal.economy.GDP * 0.05) {
      const currentLoyalty = empire.stability.vassalLoyalty.get(vassalId) || 0.5;
      empire.stability.vassalLoyalty.set(vassalId, currentLoyalty - 0.05);
    }
  }
}
```

### Imperial Succession

**Dynasty mechanics:**

```typescript
/**
 * Emperor dies, succession occurs
 */
function imperialSuccession(
  empire: EmpireTier,
  deceasedEmperor: Entity,
  world: World
): void {
  const dynasty = empire.governance.imperialDynasty;

  // Determine successor based on succession law
  let successor: EntityId;

  switch (empire.governance.successionLaw) {
    case 'primogeniture':
      // Heir apparent (eldest child)
      successor = empire.governance.heirApparentId || selectEldestChild(deceasedEmperor, world);
      break;

    case 'election':
      // Council elects new emperor
      successor = electNewEmperor(empire, world);
      break;

    case 'meritocracy':
      // Most capable vassal king
      successor = selectMostCapable(empire, world);
      break;

    case 'divine_right':
      // Religious authority selects
      successor = selectDivineSuccessor(empire, world);
      break;
  }

  if (!successor) {
    // Succession crisis! Civil war
    triggerSuccessionCrisis(empire, world);
    return;
  }

  // Install new emperor
  empire.governance.emperorAgentId = successor;
  empire.governance.imperialDynasty.currentRulerAgentId = successor;

  // Add to dynasty record
  const newRuler: DynastyRuler = {
    agentId: successor,
    name: world.getEntity(successor).getComponent('identity').name,
    title: generateImperialTitle(successor, dynasty),
    reignStart: world.tick,
    achievements: [],
    failings: [],
  };

  dynasty.rulers.push(newRuler);

  // Vassals reassess loyalty (new emperor = uncertainty)
  reassessVassalLoyalty(empire, world);
}

/**
 * Generate imperial title
 * E.g., "Emperor Kara III" if 3rd Kara in dynasty
 */
function generateImperialTitle(
  successorId: EntityId,
  dynasty: Dynasty
): string {
  const successor = world.getEntity(successorId);
  const name = successor.getComponent('identity').name;

  // Count previous rulers with same name
  const sameNameCount = dynasty.rulers.filter(r =>
    r.name === name
  ).length;

  if (sameNameCount === 0) {
    return `Emperor ${name}`;
  } else {
    return `Emperor ${name} ${toRomanNumeral(sameNameCount + 1)}`;
  }
}
```

---

## Tier 5: Federation Level (10B-1T population)

**Scale:** Multi-system, multiple empires
**Simulation:** Diplomatic (strategic outcomes)
**Time Scale:** 10 years/tick
**Status:** 🆕 New Tier

### Overview

Federations are voluntary unions of empires/nations for mutual benefit. Shared military command, trade unions, and loose governance define this tier.

### Data Structure

**FederationTier** (NEW):
```typescript
/**
 * Federation - voluntary union of empires/nations
 * Council governs, member states retain sovereignty
 */
interface FederationTier {
  id: string;
  name: string;
  foundedTick: Tick;

  /**
   * Member states
   */
  membership: {
    memberEmpireIds: EntityId[];  // Member empires
    memberNationIds: EntityId[];  // Independent nations (non-empire)

    totalPopulation: number;
    totalSystems: number;

    // Leadership rotation
    currentPresidentEmpireId: EntityId;
    presidencyDuration: number;  // Ticks
    nextRotationTick: Tick;
  };

  /**
   * Federal governance
   */
  governance: {
    type: 'confederal' | 'federal' | 'supranational';

    // Federal council (representatives from each member)
    councilRepresentatives: FederalRepresentative[];

    // Voting system
    votingSystem: 'unanimous' | 'majority' | 'weighted_by_population';

    // Federal institutions
    institutions: {
      supremeCourt?: EntityId;
      federalBank?: EntityId;
      tradeCommission?: EntityId;
      militaryCommand?: EntityId;
    };
  };

  /**
   * Federal military (shared command)
   */
  military: {
    // Unified command structure
    unifiedCommanderId: EntityId;  // Grand Marshal (soul agent)

    // Member contributions
    memberFleets: Map<EntityId, EntityId>;  // Member ID → Fleet ID

    // Total strength
    totalShips: number;
    totalReadiness: number;

    // Joint operations
    activeJointOperations: JointOperation[];
  };

  /**
   * Trade union
   */
  tradeUnion: {
    // Free trade among members
    internalTariffs: number;  // 0 = free trade
    externalTariffs: number;  // Tariffs on non-members

    // Common market
    commonCurrency?: string;

    // Trade volume
    internalTradeVolume: number;
    externalTradeVolume: number;
  };

  /**
   * Federal laws (supersede member laws)
   */
  federalLaws: FederalLaw[];

  /**
   * Foreign policy
   */
  foreignPolicy: {
    // Relations with other federations/empires
    diplomaticRelations: Map<EntityId, FederationRelation>;

    // Treaties
    federalTreaties: FederalTreaty[];

    // Wars
    federalWars: FederalWar[];
  };

  /**
   * Cohesion and stability
   */
  stability: {
    cohesion: number;  // 0-1 (how unified is federation?)

    // Member satisfaction
    memberSatisfaction: Map<EntityId, number>;  // Member ID → satisfaction (0-1)

    // Withdrawal risk
    withdrawalRisk: Map<EntityId, number>;  // Member ID → risk (0-1)
  };
}

interface FederalRepresentative {
  memberStateId: EntityId;
  representativeAgentId: EntityId;  // Soul agent
  votingPower: number;  // Weighted by population if weighted voting
}

interface JointOperation {
  id: string;
  name: string;
  type: 'defense' | 'peacekeeping' | 'exploration' | 'humanitarian';

  participatingMembers: EntityId[];
  fleetsCommitted: Map<EntityId, EntityId>;  // Member ID → Fleet ID

  objective: string;
  status: 'planning' | 'active' | 'completed';

  startedTick: Tick;
}

interface FederalLaw {
  name: string;
  description: string;
  scope: 'trade' | 'military' | 'justice' | 'rights' | 'environment';

  // Enforcement
  enforcedInMembers: EntityId[];
  complianceRate: number;  // 0-1

  enactedTick: Tick;
  votingResults: Map<EntityId, 'for' | 'against' | 'abstain'>;
}

interface FederationRelation {
  targetId: EntityId;
  targetName: string;
  targetType: 'federation' | 'empire' | 'nation';

  relationship: 'allied' | 'friendly' | 'neutral' | 'rival' | 'hostile';

  // Diplomacy
  treaties: string[];
}

interface FederalTreaty extends Treaty {
  // Extends base Treaty

  // All members bound by treaty
  bindingOnMembers: boolean;
}

interface FederalWar extends WarState {
  // Extends base WarState

  // Member participation (not all members required to join)
  participatingMembers: EntityId[];
  nonParticipatingMembers: EntityId[];
}
```

### Federal Decision-Making

**Federal Council Vote:**

```typescript
/**
 * Federal council votes on proposal
 */
function federalCouncilVote(
  federation: FederationTier,
  proposal: FederalProposal,
  world: World
): 'passed' | 'failed' {
  const votes = new Map<EntityId, 'for' | 'against' | 'abstain'>();

  // Each member casts vote
  for (const rep of federation.governance.councilRepresentatives) {
    const member = world.getEntity(rep.memberStateId);
    const vote = evaluateProposal(member, proposal, world);
    votes.set(rep.memberStateId, vote);
  }

  // Determine outcome based on voting system
  switch (federation.governance.votingSystem) {
    case 'unanimous':
      // All must vote for
      const allFor = Array.from(votes.values()).every(v => v === 'for');
      return allFor ? 'passed' : 'failed';

    case 'majority':
      // >50% must vote for
      const forCount = Array.from(votes.values()).filter(v => v === 'for').length;
      return forCount > votes.size / 2 ? 'passed' : 'failed';

    case 'weighted_by_population':
      // Weighted by population
      let totalVotingPower = 0;
      let forVotingPower = 0;

      for (const rep of federation.governance.councilRepresentatives) {
        totalVotingPower += rep.votingPower;
        if (votes.get(rep.memberStateId) === 'for') {
          forVotingPower += rep.votingPower;
        }
      }

      return forVotingPower > totalVotingPower / 2 ? 'passed' : 'failed';
  }
}

interface FederalProposal {
  id: string;
  type: 'law' | 'treaty' | 'military_action' | 'trade_policy';
  description: string;
  proposedBy: EntityId;  // Member ID
}

/**
 * Member evaluates proposal (LLM-driven)
 */
async function evaluateProposal(
  member: Entity,
  proposal: FederalProposal,
  world: World
): Promise<'for' | 'against' | 'abstain'> {
  // LLM prompt for member's head of state
  const headOfState = getMemberHeadOfState(member);

  const prompt = `You are ${headOfState.name}, leader of ${member.name}.

The Federal Council is voting on: "${proposal.description}"

How do you vote?
- FOR: Approve the proposal
- AGAINST: Reject the proposal
- ABSTAIN: No vote

Consider your nation's interests, alliances, and long-term goals.`;

  const response = await llmProvider.complete(prompt);

  if (response.includes('FOR')) return 'for';
  if (response.includes('AGAINST')) return 'against';
  return 'abstain';
}
```

### Member Withdrawal

**Secession mechanics:**

```typescript
/**
 * Member withdraws from federation
 */
function withdrawFromFederation(
  member: Entity,
  federation: FederationTier,
  world: World
): void {
  const memberId = member.id;

  // Remove from membership
  federation.membership.memberEmpireIds = federation.membership.memberEmpireIds.filter(id => id !== memberId);

  // Return military assets
  const fleet = federation.military.memberFleets.get(memberId);
  if (fleet) {
    // Fleet returns to member control
    returnFleetToMember(fleet, member, world);
    federation.military.memberFleets.delete(memberId);
  }

  // Cancel federal laws in member territory
  for (const law of federation.federalLaws) {
    law.enforcedInMembers = law.enforcedInMembers.filter(id => id !== memberId);
  }

  // Update relations (withdrawal strains relations)
  for (const otherMemberId of federation.membership.memberEmpireIds) {
    const relation = world.getEntity(otherMemberId).getComponent('diplomacy_relation');
    if (relation) {
      relation.opinion -= 20;  // -20 opinion for withdrawing
    }
  }

  // Member regains full sovereignty
  if (member.hasComponent('empire')) {
    const empire = member.getComponent<EmpireTier>('empire');
    empire.parentFederationId = undefined;
  }
}
```

---

## Tier 6: Galactic Council Level (1T+ population)

**Scale:** Galaxy-wide, multiple federations/empires
**Simulation:** Cosmic (abstract outcomes)
**Time Scale:** 100 years/tick
**Status:** 🆕 New Tier

### Overview

The Galactic Council is the highest political tier, governing relations between galaxy-spanning federations and empires. Multi-species governance, universal laws, peacekeeping forces.

### Data Structure

**GalacticCouncilTier** (NEW):
```typescript
/**
 * Galactic Council - galaxy-wide governance
 * Assembly of federations and independent empires
 */
interface GalacticCouncilTier {
  id: string;
  name: string;  // "Galactic Council", "Milky Way Assembly"
  foundedTick: Tick;

  /**
   * Membership
   */
  membership: {
    memberFederationIds: EntityId[];
    memberEmpireIds: EntityId[];  // Independent empires (non-federated)

    totalPopulation: number;  // Trillions
    totalSectors: number;  // Galactic sectors

    // Species representation
    memberSpecies: Species[];
  };

  /**
   * Council governance
   */
  governance: {
    type: 'democratic' | 'oligarchic' | 'hegemonic';

    // Secretary-General (soul agent, elected by council)
    secretaryGeneralAgentId: EntityId;
    termLength: number;

    // General Assembly
    assemblyDelegates: GalacticDelegate[];

    // Security Council (if hegemonic)
    securityCouncilMembers?: EntityId[];  // Permanent/temporary members
    vetoMembers?: EntityId[];  // Who has veto power
  };

  /**
   * Galactic peacekeeping forces
   */
  peacekeepingForces: {
    // Contributed by member states
    peacekeepingFleets: EntityId[];  // Fleet IDs
    totalShips: number;

    // Active missions
    activeMissions: PeacekeepingMission[];
  };

  /**
   * Universal laws
   */
  universalLaws: UniversalLaw[];

  /**
   * Galactic economy
   */
  economy: {
    // Shared currency
    galacticCurrency?: string;

    // Trade
    intergalacticTradeVolume: number;

    // Development fund
    developmentFund: number;  // Aid for underdeveloped sectors
  };

  /**
   * Disputes and conflicts
   */
  disputes: {
    activeDisputes: GalacticDispute[];
    resolvedDisputes: GalacticDispute[];
  };

  /**
   * Scientific cooperation
   */
  science: {
    jointResearchProjects: GalacticResearchProject[];

    // Cosmic challenges
    cosm icThreats: CosmicThreat[];  // Gamma-ray bursts, supernovae, etc.
  };
}

interface Species {
  name: string;
  homeworld: string;
  population: number;
  techLevel: number;

  // Representation
  representativeAgentId?: EntityId;  // Soul agent
}

interface GalacticDelegate {
  memberStateId: EntityId;
  delegateAgentId: EntityId;  // Soul agent

  votingPower: number;  // Based on population, tech level, contribution
}

interface PeacekeepingMission {
  id: string;
  name: string;
  type: 'conflict_mediation' | 'humanitarian_aid' | 'border_patrol' | 'disaster_relief';

  location: string;  // Sector ID
  fleetsDeployed: EntityId[];

  objective: string;
  status: 'active' | 'completed' | 'failed';

  startedTick: Tick;
}

interface UniversalLaw {
  name: string;
  description: string;
  scope: 'war_crimes' | 'trade' | 'rights' | 'environment' | 'technology';

  // Enforcement
  enforcedInSectors: string[];  // Sector IDs
  complianceRate: number;  // 0-1

  // Violations
  violations: LawViolation[];

  enactedTick: Tick;
}

interface LawViolation {
  violatorId: EntityId;  // Empire/federation ID
  violationType: string;
  evidence: string;

  // Sanctions
  sanctionsImposed?: string[];
}

interface GalacticDispute {
  id: string;
  type: 'territorial' | 'trade' | 'resource' | 'cultural' | 'species_conflict';

  parties: EntityId[];  // Federation/empire IDs

  description: string;

  // Mediation
  mediatorAgentId?: EntityId;  // Soul agent
  status: 'unresolved' | 'mediation' | 'resolved' | 'escalated_to_war';

  startedTick: Tick;
  resolvedTick?: Tick;
}

interface GalacticResearchProject {
  id: string;
  name: string;
  type: 'dyson_sphere' | 'faster_than_light' | 'artificial_intelligence' | 'life_extension';

  participatingStates: EntityId[];

  totalCost: number;
  investedSoFar: number;
  progress: number;  // 0-1

  startedTick: Tick;
  estimatedCompletionTick: Tick;
}

interface CosmicThreat {
  type: 'gamma_ray_burst' | 'supernova' | 'black_hole' | 'dark_energy_anomaly';
  location: string;  // Galactic coordinates
  severity: 'minor' | 'moderate' | 'major' | 'extinction_level';

  affectedSectors: string[];

  // Response
  responseFleets: EntityId[];
  evacuationPlans: EvacuationPlan[];
}

interface EvacuationPlan {
  sectorId: string;
  population: number;
  destinationSectors: string[];
  progress: number;  // 0-1
}
```

### Galactic Council Decision-Making

**General Assembly Vote:**

```typescript
/**
 * Galactic Assembly votes on universal law
 */
async function galacticAssemblyVote(
  council: GalacticCouncilTier,
  proposal: UniversalLawProposal,
  world: World
): Promise<'passed' | 'failed' | 'vetoed'> {
  const votes = new Map<EntityId, 'for' | 'against' | 'abstain'>();

  // Each member casts vote
  for (const delegate of council.governance.assemblyDelegates) {
    const vote = await evaluateGalacticProposal(delegate, proposal, world);
    votes.set(delegate.memberStateId, vote);
  }

  // Calculate weighted vote
  let totalVotingPower = 0;
  let forVotingPower = 0;

  for (const delegate of council.governance.assemblyDelegates) {
    totalVotingPower += delegate.votingPower;
    if (votes.get(delegate.memberStateId) === 'for') {
      forVotingPower += delegate.votingPower;
    }
  }

  const passThreshold = totalVotingPower * 0.67;  // 2/3 majority required

  if (forVotingPower >= passThreshold) {
    // Check for veto (if hegemonic governance)
    if (council.governance.vetoMembers) {
      for (const vetoMember of council.governance.vetoMembers) {
        if (votes.get(vetoMember) === 'against') {
          return 'vetoed';  // Veto blocks proposal
        }
      }
    }

    return 'passed';
  } else {
    return 'failed';
  }
}

interface UniversalLawProposal {
  name: string;
  description: string;
  scope: 'war_crimes' | 'trade' | 'rights' | 'environment' | 'technology';
  proposedBy: EntityId;  // Delegate's member state
}
```

### Peacekeeping and Conflict Resolution

**Peacekeeping Mission:**

```typescript
/**
 * Deploy peacekeeping force to conflict zone
 */
function deployPeacekeepingMission(
  council: GalacticCouncilTier,
  conflict: GalacticDispute,
  world: World
): void {
  // Determine fleet requirements
  const requiredShips = estimateRequiredShips(conflict.type, conflict.parties.length);

  // Request contributions from member states
  const contributions = requestFleetContributions(council, requiredShips);

  // Create mission
  const mission: PeacekeepingMission = {
    id: `peacekeeping_${Date.now()}`,
    name: `${conflict.description} Peacekeeping`,
    type: 'conflict_mediation',
    location: determinConflictLocation(conflict),
    fleetsDeployed: contributions,
    objective: `Mediate dispute between ${conflict.parties.map(p => getName(p)).join(' and ')}`,
    status: 'active',
    startedTick: world.tick,
  };

  council.peacekeepingForces.activeMissions.push(mission);

  // Notify conflict parties
  for (const partyId of conflict.parties) {
    notifyPeacekeepingDeployment(partyId, mission, world);
  }
}

/**
 * Request fleet contributions from members
 */
function requestFleetContributions(
  council: GalacticCouncilTier,
  requiredShips: number
): EntityId[] {
  const contributions: EntityId[] = [];
  let shipsCommitted = 0;

  for (const delegate of council.governance.assemblyDelegates) {
    const member = world.getEntity(delegate.memberStateId);

    // Request proportional contribution
    const memberShare = delegate.votingPower / sumVotingPower(council);
    const requestedShips = Math.ceil(requiredShips * memberShare);

    // Member decides whether to contribute
    const contribution = requestPeacekeepingContribution(member, requestedShips);

    if (contribution) {
      contributions.push(contribution.fleetId);
      shipsCommitted += contribution.ships;
    }

    if (shipsCommitted >= requiredShips) break;
  }

  return contributions;
}
```

---

## Legitimacy and Revolution Mechanics

### Legitimacy System

**Legitimacy determines acceptance of rule:**

```typescript
/**
 * Calculate political legitimacy
 * Low legitimacy → revolution risk
 */
function calculateLegitimacy(
  tier: VillageGovernanceComponent | CityGovernanceComponent | ProvinceTier | NationTier | EmpireTier,
  world: World
): number {
  let legitimacy = 50;  // Base legitimacy

  // Factors increasing legitimacy
  const economicProsperity = calculateEconomicProsperity(tier);
  const militaryVictories = countRecentVictories(tier);
  const culturalCohesion = calculateCulturalCohesion(tier);
  const legalStability = calculateLegalStability(tier);

  legitimacy += economicProsperity * 20;
  legitimacy += militaryVictories * 5;
  legitimacy += culturalCohesion * 15;
  legitimacy += legalStability * 10;

  // Factors decreasing legitimacy
  const corruption = calculateCorruption(tier);
  const militaryDefeats = countRecentDefeats(tier);
  const civilUnrest = calculateCivilUnrest(tier);
  const succession Disputes = countSuccessionDisputes(tier);

  legitimacy -= corruption * 25;
  legitimacy -= militaryDefeats * 10;
  legitimacy -= civilUnrest * 20;
  legitimacy -= successionDisputes * 15;

  return Math.max(0, Math.min(100, legitimacy));
}
```

### Revolution and Collapse

**Revolution trigger:**

```typescript
/**
 * Check for revolution
 * Low legitimacy + high unrest = revolution
 */
function checkRevolution(
  tier: PoliticalTier,
  world: World
): void {
  const legitimacy = calculateLegitimacy(tier, world);
  const stability = tier.stability.overall;

  if (legitimacy < 20 && stability < 30) {
    // Revolution imminent
    const revolutionType = determineRevolutionType(tier, world);

    switch (revolutionType) {
      case 'regime_change':
        // Overthrow current leader, install new
        overthrowGovernment(tier, world);
        break;

      case 'civil_war':
        // Factional conflict
        triggerCivilWar(tier, world);
        break;

      case 'secession':
        // Part of territory breaks away
        triggerSecession(tier, world);
        break;

      case 'collapse':
        // Complete political collapse
        triggerCollapse(tier, world);
        break;
    }
  }
}

/**
 * Overthrow government
 */
function overthrowGovernment(
  tier: PoliticalTier,
  world: World
): void {
  // Remove current leader
  const currentLeader = tier.governance.headOfStateAgentId;

  // Select revolutionary leader (soul agent)
  const revolutionary = selectRevolutionaryLeader(tier, world);

  // Install new government
  tier.governance.headOfStateAgentId = revolutionary;
  tier.governance.type = 'dictatorship';  // Revolutionary government

  // Reset stability (revolutionary period)
  tier.stability.overall = 40;

  // Record in history
  recordHistoricalEvent({
    type: 'revolution',
    description: `${revolutionary.name} overthrows ${currentLeader.name} in ${tier.name}`,
    tick: world.tick,
  });
}

/**
 * Trigger civil war
 */
function triggerCivilWar(
  tier: PoliticalTier,
  world: World
): void {
  // Split territory into factions
  const factions = splitIntoFactions(tier, world);

  // Each faction controls part of territory
  for (const faction of factions) {
    const factionEntity = createFactionEntity(faction, world);

    // Assign military forces
    assignFactionForces(tier, faction, factionEntity);
  }

  // Create war state
  const civilWar: WarState = {
    id: `civil_war_${Date.now()}`,
    name: `${tier.name} Civil War`,
    aggressorNationIds: [factions[0].id],
    defenderNationIds: [factions[1].id],
    warGoals: ['Reunify country', 'Establish independence'],
    startedTick: world.tick,
    duration: 0,
    totalCasualties: 0,
    militaryLosses: new Map(),
    battles: [],
    status: 'active',
  };

  tier.foreignPolicy.activeWars.push(civilWar);
}
```

---

## Cross-Domain Integration Summary

### Spatial → Political Mapping

| Spatial Tier | Political Tier | Governance Type |
|-------------|---------------|-----------------|
| Chunk | Village | Elder council / Direct democracy |
| Zone | City | Mayor / City director |
| Region | Province | Governor |
| Planet | Nation | King / President |
| System | Empire | Emperor |
| Sector | Federation | Federal council |
| Galaxy | Galactic Council | Secretary-General + Assembly |

### Ship → Political Integration

**Navies belong to political entities:**

```typescript
interface NationTier {
  military: {
    navyId: EntityId;  // References NavyTier from Ship domain
  };
}

interface EmpireTier {
  military: {
    imperialNavyId: EntityId;  // Aggregate of vassal navies
    vassalNavies: Map<EntityId, EntityId>;  // Vassal → Navy
  };
}

interface FederationTier {
  military: {
    memberFleets: Map<EntityId, EntityId>;  // Member → Fleet
  };
}
```

**Political decisions command navies:**
- Nation declares war → Navy mobilizes for combat
- Empire collects tribute → Navy enforces compliance
- Federation votes for peacekeeping → Member navies contribute fleets

### Cultural Identity Propagation

**From hierarchy-simulator/types.ts:**

```typescript
interface CulturalIdentity {
  name: string;
  language: string;
  techLevel: number;  // 0-10
  traditions: string[];
  population: number;
  growthRate: number;
}
```

**Political tiers shape culture:**
- **Village:** Emergent customs from agent behavior
- **City:** Formal traditions codified in law
- **Province:** Cultural exchange via infrastructure
- **Nation:** National identity, official language
- **Empire:** Cultural assimilation vs separatism
- **Federation:** Multiculturalism, shared values
- **Galactic:** Multi-species cultural synthesis

---

## TypeScript Interfaces Summary

**All new political tier interfaces:**

```typescript
// Village
interface VillageGovernanceComponent extends Component
interface VillageProposal
interface VillageLaw
interface VillageRelation

// City
interface CityGovernanceComponent extends Component
interface DepartmentState
interface CityLaw
interface CityPolicy
interface InfrastructureProject
interface CityRelation

// Province
interface ProvinceTier
interface RoadNetwork
interface Road
interface WaterwayNetwork
interface CommunicationNetwork
interface ProvinceInfrastructureProject
interface ProvincialLaw
interface ProvinceRelation
interface BorderDispute

// Nation
interface NationTier
interface WarState
interface Battle
interface Treaty
interface NationRelation
interface NationDiplomaticEvent
interface ResearchProject
interface NationalLaw
interface NationalPolicy

// Empire
interface EmpireTier
interface Dynasty
interface DynastyRuler
interface SeparatistMovement
interface EmpireRelation
interface ImperialWar
interface MilitaryContribution
interface ImperialTreaty

// Federation
interface FederationTier
interface FederalRepresentative
interface JointOperation
interface FederalLaw
interface FederationRelation
interface FederalTreaty
interface FederalWar

// Galactic Council
interface GalacticCouncilTier
interface Species
interface GalacticDelegate
interface PeacekeepingMission
interface UniversalLaw
interface LawViolation
interface GalacticDispute
interface GalacticResearchProject
interface CosmicThreat
interface EvacuationPlan
```

---

## Summary

This specification defines **7 political tiers** from villages to galactic councils:

1. **Village (50-500):** Elder councils, direct democracy, communal laws
2. **City (500-50K):** Mayor/director, departments, infrastructure projects
3. **Province (50K-5M):** Governor, taxation, inter-city infrastructure
4. **Nation (5M-500M):** King/president, military (navy), foreign policy
5. **Empire (100M-50B):** Emperor, vassal system, cultural assimilation
6. **Federation (10B-1T):** Federal council, shared military, trade union
7. **Galactic Council (1T+):** Multi-species assembly, peacekeeping, universal laws

**Key Mechanics:**
- **Law propagation:** Higher tiers supersede lower tiers
- **Taxation flows:** Cities → Provinces → Nations → Empires → Federations
- **Military hierarchy:** Village militia → City guard → Provincial army → National navy → Imperial fleet → Federal forces
- **Legitimacy system:** Low legitimacy → revolution/collapse
- **Soul agents:** Leaders (mayors, emperors, delegates) persist across eras
- **Integration:** Political entities govern spatial territories and command naval assets

**Integration Points:**
- **Spatial domain:** Political entities map to spatial tiers (village=chunk, nation=planet)
- **Ship domain:** Navies belong to nations/empires/federations
- **Existing systems:** GovernanceDataSystem, TradeAgreementSystem, CityDirectorSystem, Hierarchy Simulator

**Next Steps:**
1. Implement VillageGovernanceComponent, CityGovernanceComponent (extend existing)
2. Implement ProvinceTier, NationTier, EmpireTier, FederationTier, GalacticCouncilTier
3. Implement law propagation system
4. Implement taxation flow (city → province → nation → empire)
5. Integrate with NavyTier (from 05-SHIP-FLEET-HIERARCHY.md)
6. Implement legitimacy and revolution mechanics
7. Test with soul agents (emperor continuity across centuries)

---

**Document Version:** 1.0.0
**Last Updated:** 2026-01-17
**Total Lines:** ~900
**Status:** Complete, ready for implementation
