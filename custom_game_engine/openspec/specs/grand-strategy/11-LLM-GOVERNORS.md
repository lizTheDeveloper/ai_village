# LLM Governors - Multi-Tier Political Decision Making

**Status:** 🚧 Design Document
**Version:** 1.0.0
**Last Updated:** 2026-01-17
**Dependencies:** 06-POLITICAL-HIERARCHY.md, 02-SOUL-AGENTS.md, Hive Mind Spec, TradeAgreementSystem, LLMScheduler

---

## Overview & Integration

### The Governor Hierarchy

**Core Principle:** LLM agents govern political entities at each tier of the grand strategy system, making context-appropriate decisions that cascade down through the hierarchy.

**Integration with Existing Systems:**

```
┌─────────────────────────────────────────────────────────────────────┐
│ TIER 4: GALACTIC COUNCIL (Multi-Species Assembly)                   │
│   Governors: Council of Species AIs                                 │
│   Decisions: Inter-species treaties, galactic laws, war/peace       │
│   LLM Budget: 1 call/hour per species (10 species = 10 calls/hour) │
│   Context: Full galaxy state, all empires, resource distribution   │
└─────────────────────────────────────────────────────────────────────┘
                            ↓ Delegates to Empires
┌─────────────────────────────────────────────────────────────────────┐
│ TIER 3: EMPIRE (Emperor + Council)                                  │
│   Governors: Emperor LLM + 5 Advisor LLMs                          │
│   Decisions: Grand strategy, nation absorption, tech focus         │
│   LLM Budget: 5 calls/hour (emperor + advisors)                    │
│   Context: Empire-wide metrics, diplomatic relations, threats      │
└─────────────────────────────────────────────────────────────────────┘
                            ↓ Commands Nations
┌─────────────────────────────────────────────────────────────────────┐
│ TIER 2: NATION (Parliament/Monarch)                                 │
│   Governors: Parliament LLM (7 representatives) OR Monarch LLM      │
│   Decisions: Resource allocation, province priorities, war policy  │
│   LLM Budget: 10 calls/hour (parliament) or 5 calls/hour (monarch) │
│   Context: Nation metrics, province reports, neighbor relations    │
└─────────────────────────────────────────────────────────────────────┘
                            ↓ Governs Provinces
┌─────────────────────────────────────────────────────────────────────┐
│ TIER 1: PROVINCE/CITY (Governor/Mayor)                              │
│   Governors: Governor LLM (existing MayorNegotiator)               │
│   Decisions: Trade, construction, population management            │
│   LLM Budget: 20 calls/hour per city (existing TradeAgreementSystem)│
│   Context: CivilizationContext (existing), local resources         │
└─────────────────────────────────────────────────────────────────────┘
                            ↓ Commands Swarms
┌─────────────────────────────────────────────────────────────────────┐
│ TIER 0: AGENT SWARMS (Hive Mind - Tier 1/2)                        │
│   Governors: Squad Commanders (existing behavior system)            │
│   Execution: Flow fields, behavior trees, rule-based               │
│   LLM Budget: 0 (no LLM - emergent coordination)                   │
│   Context: Local goals, immediate perception                       │
└─────────────────────────────────────────────────────────────────────┘
```

**Key Integration Points:**

1. **Hive Mind (Tier 1-2):** Worker execution and squad command operate WITHOUT LLM
2. **MayorNegotiator (Tier 1):** Existing city-level LLM governance via TradeAgreementSystem
3. **Soul Agents (Cross-Tier):** Governors CAN be soul agents (persistent personalities)
4. **LLMScheduler:** All governor decisions go through existing queue/rate limiting
5. **CivilizationContext:** Extends existing context builder for higher tiers

---

## Core Concepts

### 1. Governor vs Regular Agent

**Regular Agent (Hive Mind Tier 1-2):**
- No LLM calls (rule-based, emergent)
- Follows flow fields and behavior trees
- Swarm coordination through local rules
- Example: Worker gathering wood

**Governor Agent (Political Tier 1-4):**
- LLM-powered decision making
- Makes policy decisions for group
- Delegates execution to subordinates
- Example: Mayor deciding trade policy

**Promotion Criteria:**

```typescript
interface GovernorPromotionCriteria {
  // Automatic promotion
  election_winner: boolean;        // Won democratic election
  hereditary_succession: boolean;  // Inherited title
  appointment: boolean;            // Appointed by higher tier

  // Manual
  player_designated: boolean;      // Player chose this agent as governor

  // Emergence
  natural_leader: boolean;         // High leadership score, community consensus
}
```

### 2. Decision Domains by Tier

**What each tier decides vs delegates:**

| Tier | Decides | Delegates Down | Escalates Up |
|------|---------|----------------|--------------|
| **Galactic Council** | Inter-species law, galaxy-wide war/peace | Empire boundaries | None (top) |
| **Empire** | Grand strategy, tech tree focus, nation absorption | Resource quotas to nations | Existential threats |
| **Nation** | War declaration, tax rates, province priorities | City budgets, building quotas | War decisions (if democracy) |
| **Province/City** | Trade agreements, local construction, migration | Squad tasks, resource gathering | Military threats |
| **Village** | Elder consensus (no LLM), local customs | Individual tasks | Construction decisions |
| **Squad** | Tactical goals ("secure area") | Worker flow fields | Strategic objectives |
| **Worker** | None (executes) | None | Task completion |

**Decision Authority Table:**

```typescript
interface DecisionAuthority {
  tier: PoliticalTier;
  canDecide: DecisionType[];
  mustDelegateDown: DecisionType[];
  mustEscalateUp: DecisionType[];
}

const DECISION_AUTHORITY: Record<PoliticalTier, DecisionAuthority> = {
  galactic_council: {
    tier: 'galactic_council',
    canDecide: ['inter_species_treaty', 'galactic_law', 'species_rights', 'galaxy_war'],
    mustDelegateDown: ['empire_internal_affairs'],
    mustEscalateUp: [], // Top tier
  },
  empire: {
    tier: 'empire',
    canDecide: ['grand_strategy', 'tech_focus', 'nation_absorption', 'empire_law'],
    mustDelegateDown: ['province_management', 'city_construction'],
    mustEscalateUp: ['existential_threat', 'species_extinction'],
  },
  nation: {
    tier: 'nation',
    canDecide: ['war_declaration', 'tax_policy', 'national_law', 'province_quotas'],
    mustDelegateDown: ['city_trade', 'local_construction'],
    mustEscalateUp: ['empire_rebellion', 'foreign_invasion'],
  },
  province: {
    tier: 'province',
    canDecide: ['trade_agreement', 'building_projects', 'migration_policy'],
    mustDelegateDown: ['resource_gathering', 'individual_tasks'],
    mustEscalateUp: ['military_attack', 'famine', 'plague'],
  },
  village: {
    tier: 'village',
    canDecide: ['local_customs', 'elder_consensus'],
    mustDelegateDown: ['individual_work'],
    mustEscalateUp: ['construction_projects', 'external_threats'],
  },
};
```

### 3. LLM Budget Allocation

**Total LLM Budget Hierarchy (per hour):**

```typescript
interface GovernorLLMBudget {
  tier: PoliticalTier;
  callsPerHour: number;
  callsPerDecision: number;
  priorityLevel: 'critical' | 'high' | 'normal' | 'low';
  modelRecommended: string;
}

const GOVERNOR_LLM_BUDGETS: GovernorLLMBudget[] = [
  // GALACTIC COUNCIL - Rare, high-impact decisions
  {
    tier: 'galactic_council',
    callsPerHour: 1,              // 1 call per hour for council assembly
    callsPerDecision: 5,          // 5 members debate
    priorityLevel: 'critical',
    modelRecommended: 'claude-3-5-sonnet-20241022', // Highest quality
  },

  // EMPIRE - Strategic planning
  {
    tier: 'empire',
    callsPerHour: 5,              // Emperor + 4 advisors
    callsPerDecision: 3,          // Emperor consults 2 advisors per decision
    priorityLevel: 'high',
    modelRecommended: 'claude-3-5-sonnet-20241022',
  },

  // NATION - Frequent policy decisions
  {
    tier: 'nation',
    callsPerHour: 10,             // Parliament (7 reps) or Monarch
    callsPerDecision: 2,          // Majority vote or monarch + advisor
    priorityLevel: 'high',
    modelRecommended: 'claude-3-5-haiku-20241022', // Faster, cheaper
  },

  // PROVINCE/CITY - Active management
  {
    tier: 'province',
    callsPerHour: 20,             // Mayor + staff (existing MayorNegotiator)
    callsPerDecision: 1,          // Single mayor call
    priorityLevel: 'normal',
    modelRecommended: 'claude-3-5-haiku-20241022',
  },

  // VILLAGE - No LLM (rule-based consensus)
  {
    tier: 'village',
    callsPerHour: 0,              // No LLM budget
    callsPerDecision: 0,
    priorityLevel: 'low',
    modelRecommended: 'none',
  },
];
```

**Budget Scaling with Simulation Size:**

```typescript
interface LLMBudgetScaling {
  entities: number;           // Total entities in simulation
  governors: number;          // Active governors
  callsPerHourTotal: number;  // Total LLM budget
  costPerHour: number;        // USD estimate
}

// Example scaling
const BUDGET_EXAMPLES: LLMBudgetScaling[] = [
  // Small game (1 nation, 10 cities)
  {
    entities: 10_000,
    governors: 11, // 1 monarch + 10 mayors
    callsPerHourTotal: 5 + (10 * 20) = 205,
    costPerHour: 205 * 0.001 = 0.21, // $0.21/hour
  },

  // Medium game (5 nations, 50 cities, 1 empire)
  {
    entities: 100_000,
    governors: 56, // 1 emperor + 5 monarchs + 50 mayors
    callsPerHourTotal: 5 + (5 * 10) + (50 * 20) = 1055,
    costPerHour: 1055 * 0.001 = 1.06, // $1.06/hour
  },

  // Large game (galactic, 10 empires, 50 nations, 500 cities)
  {
    entities: 1_000_000,
    governors: 561, // 1 council + 10 emperors + 50 monarchs + 500 mayors
    callsPerHourTotal: 1 + (10 * 5) + (50 * 10) + (500 * 20) = 10551,
    costPerHour: 10551 * 0.001 = 10.55, // $10.55/hour
  },
];
```

**Budget Optimization Strategies:**

1. **Tier-Appropriate Models:**
   - Galactic/Empire: Sonnet (highest quality)
   - Nation/Province: Haiku (fast, cheap)
   - Village: None (rule-based)

2. **Caching & Playbooks:**
   ```typescript
   interface GovernorPlaybook {
     situation: string;
     response: string;
     successRate: number;
     lastUsed: number;
   }

   // Reuse successful decisions
   if (similarSituation && playbook.successRate > 0.8) {
     return playbook.response; // No LLM call
   }
   ```

3. **Batch Decision Making:**
   ```typescript
   // Instead of 10 calls for 10 cities
   // 1 call: "Decide resource allocation for all 10 cities"
   const batchDecision = await governorLLM.decideBatch(cities);
   ```

4. **Rule-Based Fallbacks:**
   ```typescript
   // Routine decisions use rules
   if (decision.type === 'routine' && !crisis) {
     return applyRules(context); // No LLM call
   }
   ```

---

## Governor Types & Prompt Templates

### 1. Galactic Council Governor

**Context:** Multi-species assembly, galaxy-wide issues.

```typescript
interface GalacticCouncilContext {
  galaxyState: {
    totalStars: number;
    totalPlanets: number;
    totalPopulation: number;
    speciesCount: number;
  };

  speciesRepresented: Array<{
    speciesName: string;
    homeworld: string;
    population: number;
    temperament: string; // aggressive, diplomatic, isolationist
  }>;

  currentCrises: Array<{
    type: string; // war, famine, plague, extinction
    severity: number; // 0-1
    affectedSpecies: string[];
  }>;

  proposals: Array<{
    proposedBy: string;
    proposal: string;
    support: number; // votes in favor
    opposition: number;
  }>;
}
```

**Prompt Template:**

```typescript
function buildGalacticCouncilPrompt(context: GalacticCouncilContext): string {
  return `You are a representative on the GALACTIC COUNCIL, a multi-species assembly governing the galaxy.

GALAXY STATE:
- Total Stars: ${context.galaxyState.totalStars.toLocaleString()}
- Inhabited Planets: ${context.galaxyState.totalPlanets.toLocaleString()}
- Total Population: ${context.galaxyState.totalPopulation.toLocaleString()}
- Species Represented: ${context.galaxyState.speciesCount}

SPECIES REPRESENTED:
${context.speciesRepresented.map(s =>
  `- ${s.speciesName} (${s.homeworld}): ${s.population.toLocaleString()} population, ${s.temperament}`
).join('\n')}

CURRENT CRISES:
${context.currentCrises.map(c =>
  `- ${c.type.toUpperCase()} (severity: ${Math.round(c.severity * 100)}%): Affects ${c.affectedSpecies.join(', ')}`
).join('\n')}

PROPOSALS ON FLOOR:
${context.proposals.map((p, i) =>
  `${i + 1}. "${p.proposal}" (proposed by ${p.proposedBy})
   Support: ${p.support} | Opposition: ${p.opposition}`
).join('\n\n')}

YOUR ROLE:
- Represent your species' interests while considering galaxy-wide welfare
- Vote on proposals (approve, reject, amend)
- Propose new laws or treaties
- Mediate inter-species conflicts

AVAILABLE ACTIONS:
- vote_on_proposal: Cast your vote on a proposal
- propose_law: Introduce new galactic law
- propose_treaty: Suggest inter-species treaty
- call_for_debate: Request extended discussion
- emergency_declaration: Declare galaxy-wide emergency

What is your decision? Consider long-term galactic stability and your species' interests.

Respond with JSON:
{
  "reasoning": "Your analysis of the situation",
  "action": {
    "type": "vote_on_proposal" | "propose_law" | "propose_treaty" | "call_for_debate" | "emergency_declaration",
    "target": "proposal_id or law_name",
    "vote": "approve" | "reject" | "amend",
    "amendment": "optional amendment text"
  },
  "speech": "Your statement to the council (optional)"
}`;
}
```

### 2. Empire Governor (Emperor + Council)

**Context:** Grand strategy, multi-nation coordination.

```typescript
interface EmpireContext {
  empire: {
    name: string;
    population: number;
    territory: number; // star systems
    species: string;
  };

  nations: Array<{
    name: string;
    population: number;
    loyalty: number; // 0-1
    militaryStrength: number;
    resources: Record<string, number>;
  }>;

  diplomaticRelations: Array<{
    targetEmpire: string;
    relation: 'allied' | 'neutral' | 'rival' | 'war';
    trustLevel: number; // 0-1
  }>;

  threats: Array<{
    type: string;
    severity: number;
    description: string;
  }>;

  advisorRecommendations: Array<{
    advisor: string; // 'military', 'economic', 'diplomatic', 'research'
    recommendation: string;
  }>;
}
```

**Prompt Template:**

```typescript
function buildEmperorPrompt(context: EmpireContext): string {
  return `You are the EMPEROR of the ${context.empire.name}, ruling ${context.empire.population.toLocaleString()} citizens across ${context.empire.territory} star systems.

EMPIRE STATUS:
- Species: ${context.empire.species}
- Territory: ${context.empire.territory} star systems
- Population: ${context.empire.population.toLocaleString()}

SUBORDINATE NATIONS:
${context.nations.map(n =>
  `- ${n.name}: ${n.population.toLocaleString()} pop, ${Math.round(n.loyalty * 100)}% loyalty, ${n.militaryStrength} military strength`
).join('\n')}

DIPLOMATIC RELATIONS:
${context.diplomaticRelations.map(r =>
  `- ${r.targetEmpire}: ${r.relation.toUpperCase()} (trust: ${Math.round(r.trustLevel * 100)}%)`
).join('\n')}

THREATS:
${context.threats.map(t =>
  `- ${t.type} (severity: ${Math.round(t.severity * 100)}%): ${t.description}`
).join('\n')}

ADVISOR RECOMMENDATIONS:
${context.advisorRecommendations.map(a =>
  `- ${a.advisor.toUpperCase()} ADVISOR: ${a.recommendation}`
).join('\n')}

YOUR ROLE:
- Set grand strategy for the empire
- Allocate resources between nations
- Decide foreign policy (war, peace, alliances)
- Choose technology focus
- Absorb or release nations

AVAILABLE ACTIONS:
- set_grand_strategy: Define empire-wide strategic focus
- allocate_resources: Distribute resources between nations
- declare_war: Initiate conflict with another empire
- propose_alliance: Suggest alliance with another empire
- absorb_nation: Integrate a nation into the empire
- release_nation: Grant independence to a nation
- prioritize_technology: Focus research on specific tech tree

What is your imperial decree?

Respond with JSON:
{
  "reasoning": "Your strategic analysis",
  "action": {
    "type": "set_grand_strategy" | "allocate_resources" | "declare_war" | "propose_alliance" | "absorb_nation" | "release_nation" | "prioritize_technology",
    "target": "target_nation or target_empire",
    "parameters": { /* action-specific params */ }
  },
  "proclamation": "Your public statement (optional)"
}`;
}
```

### 3. Nation Governor (Parliament/Monarch)

**Context:** National policy, province coordination.

```typescript
interface NationContext {
  nation: {
    name: string;
    governmentType: 'monarchy' | 'democracy' | 'oligarchy';
    population: number;
    territory: number; // provinces
  };

  provinces: Array<{
    name: string;
    population: number;
    resources: Record<string, number>;
    happiness: number; // 0-1
  }>;

  economy: {
    gdp: number;
    taxRate: number;
    reserves: Record<string, number>;
  };

  military: {
    strength: number;
    deployments: Array<{ location: string; size: number }>;
  };

  neighbors: Array<{
    name: string;
    relation: 'allied' | 'neutral' | 'hostile';
  }>;

  pendingProposals: Array<{
    type: string;
    proposer: string;
    description: string;
  }>;
}
```

**Prompt Template (Parliament):**

```typescript
function buildParliamentPrompt(context: NationContext, memberRole: string): string {
  return `You are a PARLIAMENT MEMBER (${memberRole}) in the ${context.nation.name} national legislature.

NATION STATUS:
- Government Type: ${context.nation.governmentType}
- Population: ${context.nation.population.toLocaleString()}
- Territory: ${context.nation.territory} provinces

PROVINCES:
${context.provinces.map(p =>
  `- ${p.name}: ${p.population.toLocaleString()} pop, happiness ${Math.round(p.happiness * 100)}%`
).join('\n')}

ECONOMY:
- GDP: ${context.economy.gdp.toLocaleString()}
- Tax Rate: ${Math.round(context.economy.taxRate * 100)}%
- Reserves: ${Object.entries(context.economy.reserves).map(([r, amt]) => `${r}: ${amt}`).join(', ')}

MILITARY:
- Strength: ${context.military.strength}
- Deployments: ${context.military.deployments.map(d => `${d.location} (${d.size})`).join(', ')}

NEIGHBORS:
${context.neighbors.map(n => `- ${n.name}: ${n.relation}`).join('\n')}

PENDING PROPOSALS:
${context.pendingProposals.map((p, i) =>
  `${i + 1}. ${p.type}: "${p.description}" (proposed by ${p.proposer})`
).join('\n')}

YOUR ROLE AS ${memberRole}:
- Vote on proposals
- Propose new laws
- Represent constituent interests
- Debate national priorities

AVAILABLE ACTIONS:
- vote_on_proposal: Vote on pending proposal
- propose_law: Introduce new legislation
- call_for_amendment: Modify existing proposal
- request_debate: Extend discussion time

What is your parliamentary action?

Respond with JSON:
{
  "reasoning": "Your political position",
  "action": {
    "type": "vote_on_proposal" | "propose_law" | "call_for_amendment" | "request_debate",
    "target": "proposal_id",
    "vote": "approve" | "reject",
    "amendment": "proposed changes (if applicable)"
  },
  "speech": "Your floor speech (optional, keep brief)"
}`;
}
```

### 4. Province/City Governor (Mayor - Existing)

**Context:** Local management, trade, construction (EXISTING MayorNegotiator).

```typescript
// EXISTING: packages/core/src/trade/MayorNegotiator.ts
interface CivilizationContext {
  population: number;
  foodSupply: number;
  foodDaysRemaining: number;
  resources: Map<string, number>;
  needs: string[];
  focus: 'trade' | 'defense' | 'expansion' | 'survival';
}

// EXTEND with province-level info
interface ProvinceGovernorContext extends CivilizationContext {
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
```

**Prompt Template (extends existing MayorNegotiator):**

```typescript
function buildMayorPrompt(context: ProvinceGovernorContext): string {
  // Base on existing CivilizationContext format
  return `You are the MAYOR of ${context.provinceData.name}, a ${context.provinceData.tier}.

POPULATION & RESOURCES:
- Population: ${context.population.toLocaleString()}
- Food Supply: ${context.foodSupply} (${context.foodDaysRemaining} days remaining)
- Resources: ${Array.from(context.resources.entries()).map(([r, amt]) => `${r}: ${amt}`).join(', ')}

BUILDINGS:
${context.provinceData.buildings.map(b => `- ${b.type}: ${b.status}`).join('\n')}

NEIGHBORS:
${context.provinceData.neighbors.map(n => `- ${n.name} (${n.distance} km away): ${n.relation}`).join('\n')}

CURRENT NEEDS:
${context.needs.join(', ')}

NATIONAL DIRECTIVES:
${context.nationalDirectives.map(d => `- [Priority ${d.priority}] ${d.type}: ${d.description}`).join('\n')}

YOUR FOCUS: ${context.focus}

YOUR ROLE:
- Manage local construction
- Negotiate trade agreements
- Handle migration
- Report to national government

AVAILABLE ACTIONS:
- approve_trade: Accept/reject trade proposal
- counter_trade: Modify trade terms
- plan_construction: Queue building project
- request_resources: Ask nation for resources
- adjust_priorities: Change local focus

[Existing MayorNegotiator trade evaluation logic follows...]
`;
}
```

---

## Decision-Making Protocols

### 1. Consensus Building (Parliament/Council)

**Multi-Agent Voting:**

```typescript
interface ConsensusProtocol {
  topic: string;
  proposals: Proposal[];
  votes: Map<Proposal, Vote[]>;
  status: 'proposing' | 'debating' | 'voting' | 'decided';
  deadline: number;
}

interface Vote {
  agentId: string;
  stance: 'approve' | 'reject' | 'abstain';
  weight: number; // Based on seniority/trust
  reasoning: string;
}

/**
 * Conduct parliamentary vote
 */
async function conductVote(
  parliament: Entity[],
  proposal: Proposal,
  context: NationContext
): Promise<{ decision: 'approved' | 'rejected'; votes: Vote[] }> {
  const votes: Vote[] = [];

  // Each parliament member votes
  for (const member of parliament) {
    const memberPrompt = buildParliamentPrompt(context, member.role);
    const response = await llmScheduler.queueRequest({
      provider: 'anthropic',
      model: 'claude-3-5-haiku-20241022',
      prompt: memberPrompt,
      priority: 'high',
    });

    const vote: Vote = parseVote(response, member);
    votes.push(vote);
  }

  // Calculate weighted vote
  const totalApprove = votes
    .filter(v => v.stance === 'approve')
    .reduce((sum, v) => sum + v.weight, 0);

  const totalReject = votes
    .filter(v => v.stance === 'reject')
    .reduce((sum, v) => sum + v.weight, 0);

  const decision = totalApprove > totalReject ? 'approved' : 'rejected';

  return { decision, votes };
}
```

### 2. Hierarchical Delegation

**Empire → Nation → Province:**

```typescript
interface DelegationChain {
  origin: PoliticalTier;
  directive: string;
  targetTier: PoliticalTier;
  parameters: Record<string, any>;
}

/**
 * Emperor delegates resource quota to nations
 */
function delegateResourceQuota(
  emperor: Entity,
  empire: EmpireContext,
  quota: ResourceQuota
): void {
  // Emperor decision
  const allocation = emperor.decideAllocation(empire, quota);

  // Delegate to each nation
  for (const nation of empire.nations) {
    const nationDirective: DelegationChain = {
      origin: 'empire',
      directive: 'resource_quota',
      targetTier: 'nation',
      parameters: {
        quotas: allocation[nation.name],
        deadline: world.tick + 12000, // 10 minutes
      },
    };

    // Nation governor receives directive
    const nationGovernor = getNationGovernor(nation.name);
    nationGovernor.receiveDirective(nationDirective);
  }
}

/**
 * Nation governor processes directive from empire
 */
function receiveDirective(
  governor: Entity,
  directive: DelegationChain
): void {
  // Governor decides how to distribute quota among provinces
  const provinceAllocations = governor.subdivideQuota(directive.parameters.quotas);

  // Delegate to provinces
  for (const province of governor.provinces) {
    const provinceDirective: DelegationChain = {
      origin: 'nation',
      directive: 'resource_quota',
      targetTier: 'province',
      parameters: {
        quotas: provinceAllocations[province.name],
        deadline: directive.parameters.deadline,
      },
    };

    // Province governor (mayor) receives directive
    const mayor = getProvinceGovernor(province.name);
    mayor.receiveDirective(provinceDirective);
  }
}
```

### 3. Escalation Protocol

**Province → Nation → Empire → Council:**

```typescript
interface EscalationTrigger {
  type: string;
  severity: number; // 0-1
  requiresTier: PoliticalTier;
  description: string;
}

const ESCALATION_RULES: EscalationTrigger[] = [
  {
    type: 'military_attack',
    severity: 0.8,
    requiresTier: 'nation',
    description: 'Province under attack - requires national military response',
  },
  {
    type: 'famine',
    severity: 0.7,
    requiresTier: 'nation',
    description: 'Mass starvation - requires national resource allocation',
  },
  {
    type: 'rebellion',
    severity: 0.9,
    requiresTier: 'empire',
    description: 'Nation in rebellion - requires imperial intervention',
  },
  {
    type: 'species_extinction',
    severity: 1.0,
    requiresTier: 'galactic_council',
    description: 'Species facing extinction - requires galactic response',
  },
];

/**
 * Escalate crisis up hierarchy
 */
function escalateCrisis(
  crisis: Crisis,
  currentTier: PoliticalTier,
  world: World
): void {
  const trigger = ESCALATION_RULES.find(r => r.type === crisis.type);
  if (!trigger) return;

  // Check if current tier can handle
  if (tierLevel(currentTier) >= tierLevel(trigger.requiresTier)) {
    handleCrisisLocally(crisis, currentTier, world);
    return;
  }

  // Escalate to higher tier
  const higherTier = getNextHigherTier(currentTier);
  const higherGovernor = getGovernorForTier(higherTier, world);

  // Send crisis report
  higherGovernor.receiveCrisisReport({
    origin: currentTier,
    crisis,
    requestedAction: trigger.description,
  });
}
```

---

## Personality & Memory (Soul Agent Governors)

### Governor as Soul Agent

**Long-Lived Governors Build Personalities:**

```typescript
interface GovernorSoulAgent extends SoulAgentComponent {
  // Standard soul agent fields +
  governorHistory: {
    termsServed: number;
    decisions: GovernorDecision[];
    legacyRating: number; // 0-1, historical reputation
  };

  politicalIdeology: {
    economic: number;      // -1 (communist) to 1 (capitalist)
    social: number;        // -1 (authoritarian) to 1 (libertarian)
    foreign: number;       // -1 (isolationist) to 1 (interventionist)
  };

  constituencyRelations: Map<string, number>; // province/nation → approval rating
}

interface GovernorDecision {
  tick: Tick;
  decisionType: string;
  context: string;
  outcome: 'success' | 'failure' | 'mixed';
  popularityImpact: number; // -1 to 1
}
```

**Personality Consistency via Core Memories:**

```typescript
/**
 * Build governor LLM context with personality from past decisions
 */
function buildGovernorPersonalityContext(governor: Entity): string {
  const soulAgent = governor.getComponent<GovernorSoulAgent>(CT.SoulAgent);
  if (!soulAgent) return '';

  // Extract political ideology from past decisions
  const ideology = soulAgent.politicalIdeology;
  const ideologyDesc =
    `Economic: ${ideology.economic > 0 ? 'free market' : 'centrally planned'}, ` +
    `Social: ${ideology.social > 0 ? 'libertarian' : 'authoritarian'}, ` +
    `Foreign: ${ideology.foreign > 0 ? 'interventionist' : 'isolationist'}`;

  // Top 5 most significant decisions
  const topDecisions = soulAgent.governorHistory.decisions
    .sort((a, b) => Math.abs(b.popularityImpact) - Math.abs(a.popularityImpact))
    .slice(0, 5);

  let context = `YOUR POLITICAL IDENTITY:
Political Ideology: ${ideologyDesc}
Terms Served: ${soulAgent.governorHistory.termsServed}
Legacy Rating: ${Math.round(soulAgent.legacyRating * 100)}%

YOUR PAST MAJOR DECISIONS:
${topDecisions.map(d =>
  `- ${d.decisionType}: ${d.context} → ${d.outcome} (popularity ${d.popularityImpact > 0 ? '+' : ''}${Math.round(d.popularityImpact * 100)}%)`
).join('\n')}

CONSTITUENCY APPROVAL:
${Array.from(soulAgent.constituencyRelations.entries())
  .sort((a, b) => b[1] - a[1])
  .slice(0, 5)
  .map(([name, approval]) => `- ${name}: ${Math.round(approval * 100)}%`)
  .join('\n')}

Your decisions should reflect your established ideology and past precedents, unless circumstances demand adaptation.
`;

  return context;
}
```

**Memory Across Elections:**

```typescript
/**
 * Transfer governor memories when new governor takes office
 */
function transferGovernorMemories(
  outgoing: Entity,
  incoming: Entity,
  tier: PoliticalTier
): void {
  const outgoingSoul = outgoing.getComponent<GovernorSoulAgent>(CT.SoulAgent);
  const incomingSoul = incoming.getComponent<GovernorSoulAgent>(CT.SoulAgent);

  if (!outgoingSoul || !incomingSoul) return;

  // Incoming governor learns from outgoing's core memories
  const transferableMemories = outgoingSoul.coreMemories
    .filter(m => m.coreReason === 'life_defining' || m.cosmicSignificance > 0.7)
    .map(m => ({
      ...m,
      id: `inherited_${m.id}`,
      summary: `[From predecessor] ${m.summary}`,
      incarnationContext: {
        ...m.incarnationContext,
        bodyName: outgoing.name,
      },
    }));

  // Add as "secondhand" core memories (like past-life intuitions)
  incomingSoul.coreMemories.push(...transferableMemories);

  // Inherit constituency relations (initial approval based on predecessor's final rating)
  for (const [constituency, approval] of outgoingSoul.constituencyRelations.entries()) {
    // New governor starts with 50% of predecessor's approval
    incomingSoul.constituencyRelations.set(constituency, approval * 0.5);
  }
}
```

---

## Implementation Architecture

### 1. Component Definitions

```typescript
/**
 * Governor component - marks entity as political governor
 */
interface GovernorComponent extends Component {
  type: 'governor';

  tier: PoliticalTier;
  jurisdiction: string; // empire ID, nation ID, city ID, etc.

  governmentType: 'monarchy' | 'democracy' | 'oligarchy' | 'council';
  termLength?: number; // Ticks until re-election (if democracy)
  termStartTick: Tick;

  approvalRating: number; // 0-1
  decisions: GovernorDecision[];

  // LLM integration
  llmProvider: string;
  llmModel: string;
  decisionCooldown: number; // Min ticks between LLM calls
  lastDecisionTick: Tick;
}

/**
 * Political entity component - city, nation, empire, etc.
 */
interface PoliticalEntityComponent extends Component {
  type: 'political_entity';

  tier: PoliticalTier;
  name: string;

  governorId?: string; // Reference to governor entity
  parentEntityId?: string; // Reference to higher-tier entity
  childEntityIds: string[]; // References to lower-tier entities

  population: number;
  territory: number;
  resources: Map<string, number>;

  // For councils/parliaments
  councilMemberIds?: string[]; // Multiple governors
  votingProtocol?: 'majority' | 'unanimous' | 'weighted';
}
```

### 2. System Architecture

```typescript
/**
 * GovernorDecisionSystem - Processes governor decisions at all tiers
 */
export class GovernorDecisionSystem extends BaseSystem {
  readonly id: SystemId = 'governor_decision';
  readonly priority = 850; // Late priority (after world state updates)

  private UPDATE_INTERVALS: Record<PoliticalTier, number> = {
    galactic_council: 72000, // 1 hour
    empire: 36000, // 30 minutes
    nation: 12000, // 10 minutes
    province: 6000, // 5 minutes
    village: 0, // No LLM
  };

  private lastUpdate: Map<string, number> = new Map();

  update(world: World): void {
    // Process each tier
    for (const tier of POLITICAL_TIERS) {
      this.processGovernorTier(tier, world);
    }
  }

  private processGovernorTier(tier: PoliticalTier, world: World): void {
    const interval = this.UPDATE_INTERVALS[tier];
    if (interval === 0) return; // No LLM for village

    const lastTick = this.lastUpdate.get(tier) ?? 0;
    if (world.tick - lastTick < interval) return;

    this.lastUpdate.set(tier, world.tick);

    // Get all governors at this tier
    const governors = world.query()
      .with('governor')
      .executeEntities()
      .filter(g => {
        const govComp = g.getComponent<GovernorComponent>('governor');
        return govComp?.tier === tier;
      });

    // Process each governor
    for (const governor of governors) {
      this.processGovernorDecision(governor, world);
    }
  }

  private async processGovernorDecision(governor: Entity, world: World): Promise<void> {
    const govComp = governor.getComponent<GovernorComponent>('governor')!;

    // Check cooldown
    if (world.tick - govComp.lastDecisionTick < govComp.decisionCooldown) {
      return;
    }

    // Build context for governor tier
    const context = this.buildGovernorContext(governor, world);

    // Build prompt
    const prompt = this.buildGovernorPrompt(governor, context);

    // Queue LLM call
    const budget = GOVERNOR_LLM_BUDGETS.find(b => b.tier === govComp.tier)!;

    const response = await llmScheduler.queueRequest({
      provider: govComp.llmProvider,
      model: budget.modelRecommended,
      prompt,
      priority: budget.priorityLevel,
      sessionId: governor.id,
    });

    // Parse and execute decision
    const decision = this.parseGovernorDecision(response);
    this.executeDecision(governor, decision, world);

    // Update cooldown
    govComp.lastDecisionTick = world.tick;

    // Record decision
    govComp.decisions.push({
      tick: world.tick,
      decisionType: decision.action.type,
      context: decision.reasoning,
      outcome: 'pending', // Will be updated later
      popularityImpact: 0, // Calculated after outcome
    });
  }

  private buildGovernorContext(governor: Entity, world: World): any {
    const govComp = governor.getComponent<GovernorComponent>('governor')!;

    switch (govComp.tier) {
      case 'galactic_council':
        return this.buildGalacticCouncilContext(governor, world);
      case 'empire':
        return this.buildEmpireContext(governor, world);
      case 'nation':
        return this.buildNationContext(governor, world);
      case 'province':
        return this.buildProvinceContext(governor, world);
      default:
        throw new Error(`Unknown tier: ${govComp.tier}`);
    }
  }

  private buildGovernorPrompt(governor: Entity, context: any): string {
    const govComp = governor.getComponent<GovernorComponent>('governor')!;

    // Add personality context if soul agent
    const soulAgent = governor.getComponent<GovernorSoulAgent>(CT.SoulAgent);
    const personalityContext = soulAgent
      ? buildGovernorPersonalityContext(governor)
      : '';

    // Build tier-specific prompt
    let basePrompt: string;
    switch (govComp.tier) {
      case 'galactic_council':
        basePrompt = buildGalacticCouncilPrompt(context);
        break;
      case 'empire':
        basePrompt = buildEmperorPrompt(context);
        break;
      case 'nation':
        basePrompt = buildParliamentPrompt(context, 'member'); // TODO: role
        break;
      case 'province':
        basePrompt = buildMayorPrompt(context);
        break;
      default:
        throw new Error(`Unknown tier: ${govComp.tier}`);
    }

    // Combine personality + base prompt
    return personalityContext + '\n\n' + basePrompt;
  }
}
```

### 3. Integration with Existing Systems

**LLMScheduler Integration:**

```typescript
// NO CHANGES needed to LLMScheduler
// Just use existing queue with governor-specific priorities

// Example:
llmScheduler.queueRequest({
  provider: 'anthropic',
  model: 'claude-3-5-sonnet-20241022',
  prompt: governorPrompt,
  priority: 'critical', // Galactic council
  sessionId: governor.id,
});
```

**MayorNegotiator Integration:**

```typescript
// EXTEND existing MayorNegotiator for province tier

export class MayorNegotiator {
  // Existing method
  async evaluateProposal(
    proposal: TradeAgreement,
    ourCivilization: CivilizationIdentity,
    tradeComp: TradeAgreementComponent,
    mayorAgentId: EntityId,
    context: CivilizationContext
  ): Promise<MayorDecision> {
    // ... existing trade evaluation logic
  }

  // NEW: Extend for general governance decisions
  async makeGovernanceDecision(
    context: ProvinceGovernorContext,
    decisionType: string
  ): Promise<GovernorDecision> {
    const prompt = buildMayorPrompt(context);

    const response = await this.llmProvider.complete({
      prompt,
      model: 'claude-3-5-haiku-20241022',
      maxTokens: 1000,
      temperature: 0.7,
    });

    return parseGovernorDecision(response);
  }
}
```

**Hive Mind Integration:**

```typescript
// Governors COMMAND swarms via flow fields
// No changes to Hive Mind - it remains rule-based

function delegateToSwarm(
  governor: Entity,
  directive: string,
  world: World
): void {
  // Governor decides WHAT (strategic)
  const targetArea = governor.decideTargetArea(directive);
  const taskType = governor.decideTaskType(directive);

  // Generate flow field for swarm (tactical execution)
  const flowField = generateTaskFlowField(targetArea, taskType);

  // Assign swarm workers to follow flow field
  const workers = getWorkerSwarm(governor.jurisdiction, world);
  for (const worker of workers) {
    worker.assignFlowField(flowField);
    worker.setGoal(taskType);
  }

  // Workers execute via existing behavior tree + flow fields
  // NO LLM calls for workers
}
```

---

## Advanced Features

### 1. Governor Coalitions & Factions

**Multi-Governor Cooperation:**

```typescript
interface GovernorFaction {
  name: string;
  ideology: PoliticalIdeology;
  members: string[]; // Governor entity IDs
  strength: number; // 0-1
}

/**
 * Governors form factions based on shared ideology
 */
function formFaction(
  governors: Entity[],
  world: World
): GovernorFaction | null {
  // Calculate ideological similarity
  const similarities = calculateIdeologicalSimilarity(governors);

  // Require 70% alignment to form faction
  if (similarities.alignment < 0.7) return null;

  return {
    name: generateFactionName(similarities.dominantIdeology),
    ideology: similarities.dominantIdeology,
    members: governors.map(g => g.id),
    strength: governors.length / getTotalGovernors(world),
  };
}

/**
 * Faction coordinates votes
 */
async function factionCoordinatedVote(
  faction: GovernorFaction,
  proposal: Proposal,
  world: World
): Promise<Map<string, Vote>> {
  // Faction leader decides stance
  const leader = world.getEntity(faction.members[0])!;
  const leaderDecision = await leader.evaluateProposal(proposal);

  // Other members follow leader (with some independence)
  const votes = new Map<string, Vote>();

  for (const memberId of faction.members) {
    const member = world.getEntity(memberId)!;

    // 80% chance to follow leader
    if (Math.random() < 0.8) {
      votes.set(memberId, {
        agentId: memberId,
        stance: leaderDecision.stance,
        reasoning: `Following faction leader ${leader.name}`,
        weight: 1,
      });
    } else {
      // Independent vote
      const independentDecision = await member.evaluateProposal(proposal);
      votes.set(memberId, independentDecision);
    }
  }

  return votes;
}
```

### 2. Dynasty & Succession

**Hereditary vs Democratic Succession:**

```typescript
interface SuccessionRule {
  type: 'hereditary' | 'election' | 'appointment' | 'meritocracy';
  criteria: SuccessionCriteria;
}

interface SuccessionCriteria {
  bloodline?: boolean; // Must be descendant
  approval?: number; // Min approval rating (elections)
  skill?: Record<string, number>; // Min skill levels (meritocracy)
}

/**
 * Determine next governor via succession rules
 */
function succeedGovernor(
  outgoing: Entity,
  rule: SuccessionRule,
  world: World
): Entity {
  switch (rule.type) {
    case 'hereditary':
      return selectHeir(outgoing, world);

    case 'election':
      return conductElection(outgoing, world);

    case 'appointment':
      return appointSuccessor(outgoing, world);

    case 'meritocracy':
      return selectMeritorious(rule.criteria.skill!, world);
  }
}

/**
 * Hereditary succession - child inherits
 */
function selectHeir(outgoing: Entity, world: World): Entity {
  const soul = getSoulForGovernor(outgoing);
  if (!soul) throw new Error('Governor has no soul');

  const soulIdentity = soul.getComponent<SoulIdentityComponent>(CT.SoulIdentity)!;

  // Find oldest child who is soul agent
  const descendants = getDescendants(soul, world);
  const soulAgentDescendants = descendants.filter(d =>
    d.hasComponent(CT.SoulAgent)
  );

  if (soulAgentDescendants.length === 0) {
    throw new Error('No soul agent heirs available');
  }

  // Promote eldest to governor
  const heir = soulAgentDescendants[0]!;
  promoteToGovernor(heir, outgoing);

  return heir;
}

/**
 * Democratic election - vote among constituents
 */
async function conductElection(
  outgoing: Entity,
  world: World
): Promise<Entity> {
  const govComp = outgoing.getComponent<GovernorComponent>('governor')!;

  // Get candidates (high approval soul agents in jurisdiction)
  const candidates = world.query()
    .with(CT.SoulAgent)
    .executeEntities()
    .filter(e => {
      const soulAgent = e.getComponent<GovernorSoulAgent>(CT.SoulAgent)!;
      const approval = soulAgent.constituencyRelations.get(govComp.jurisdiction) ?? 0;
      return approval > 0.5; // Min 50% approval to run
    });

  // Constituents vote (simplified - each agent votes)
  const votes = new Map<string, number>();

  for (const candidate of candidates) {
    votes.set(candidate.id, 0);
  }

  const constituents = getConstituents(govComp.jurisdiction, world);
  for (const constituent of constituents) {
    // Vote for highest-approval candidate
    const preferred = candidates.sort((a, b) => {
      const approvalA = a.getComponent<GovernorSoulAgent>(CT.SoulAgent)!
        .constituencyRelations.get(constituent.id) ?? 0;
      const approvalB = b.getComponent<GovernorSoulAgent>(CT.SoulAgent)!
        .constituencyRelations.get(constituent.id) ?? 0;
      return approvalB - approvalA;
    })[0]!;

    votes.set(preferred.id, (votes.get(preferred.id) ?? 0) + 1);
  }

  // Winner = most votes
  const winner = Array.from(votes.entries())
    .sort((a, b) => b[1] - a[1])[0]![0];

  const elected = world.getEntity(winner)!;
  promoteToGovernor(elected, outgoing);

  return elected;
}
```

### 3. Crisis Management

**Emergency Powers & Fast Response:**

```typescript
interface CrisisProtocol {
  type: string;
  severity: number;
  requiredResponse: number; // Ticks until action required
  llmBudgetOverride: boolean; // Can skip cooldown
}

const CRISIS_PROTOCOLS: CrisisProtocol[] = [
  {
    type: 'military_invasion',
    severity: 1.0,
    requiredResponse: 600, // 30 seconds
    llmBudgetOverride: true,
  },
  {
    type: 'natural_disaster',
    severity: 0.9,
    requiredResponse: 1200, // 1 minute
    llmBudgetOverride: true,
  },
  {
    type: 'economic_collapse',
    severity: 0.8,
    requiredResponse: 6000, // 5 minutes
    llmBudgetOverride: false,
  },
];

/**
 * Handle crisis with emergency decision-making
 */
async function handleCrisis(
  governor: Entity,
  crisis: Crisis,
  world: World
): Promise<void> {
  const protocol = CRISIS_PROTOCOLS.find(p => p.type === crisis.type);
  if (!protocol) {
    // Non-emergency - normal decision cycle
    return;
  }

  const govComp = governor.getComponent<GovernorComponent>('governor')!;

  // Override cooldown if emergency
  if (protocol.llmBudgetOverride) {
    govComp.lastDecisionTick = 0; // Reset cooldown
  }

  // Build crisis prompt
  const crisisPrompt = buildCrisisPrompt(governor, crisis, protocol);

  // Urgent LLM call
  const response = await llmScheduler.queueRequest({
    provider: govComp.llmProvider,
    model: 'claude-3-5-sonnet-20241022', // Always use best model for crisis
    prompt: crisisPrompt,
    priority: 'critical',
    sessionId: governor.id,
    timeout: protocol.requiredResponse,
  });

  // Execute emergency decision
  const decision = parseGovernorDecision(response);
  executeEmergencyDecision(governor, decision, world);
}
```

---

## Performance & Scaling

### LLM Call Budget Analysis

**Cost Breakdown (per hour):**

| Configuration | Governors | Calls/Hour | Cost/Hour | Cost/Day | Cost/Month |
|---------------|-----------|------------|-----------|----------|------------|
| **Small** (1 nation, 10 cities) | 11 | 205 | $0.21 | $5.04 | $151 |
| **Medium** (5 nations, 50 cities, 1 empire) | 56 | 1,055 | $1.06 | $25.44 | $763 |
| **Large** (10 empires, 50 nations, 500 cities) | 561 | 10,551 | $10.55 | $253.20 | $7,596 |
| **Galactic** (1 council, 10 empires, 50 nations, 500 cities) | 561 | 10,551 | $10.55 | $253.20 | $7,596 |

**Optimization Strategies:**

1. **Tier-Appropriate Models:**
   - Galactic/Empire: Sonnet ($0.003/1K tokens)
   - Nation/Province: Haiku ($0.001/1K tokens)
   - 3x cost reduction for lower tiers

2. **Decision Caching:**
   ```typescript
   // Cache successful decisions
   if (situationSimilarity > 0.9 && cachedDecision.successRate > 0.8) {
     return cachedDecision; // No LLM call - $0.00
   }
   ```

3. **Batch Processing:**
   ```typescript
   // 1 call for 10 cities instead of 10 calls
   const batchDecision = await decideBatch(cities); // 10x reduction
   ```

4. **Rule-Based Fallbacks:**
   ```typescript
   // Routine decisions use rules
   if (!isCrisis && !isNovel) {
     return applyGovernanceRules(context); // $0.00
   }
   ```

**Expected Cost Reduction:**
- Tier-appropriate models: 50% savings
- Caching: 30% savings
- Batch processing: 20% savings
- Rule fallbacks: 40% savings
- **Total: 80-90% cost reduction**

**Realistic Costs:**
- Small: $0.21 → $0.04/hour ($1/day, $30/month)
- Medium: $1.06 → $0.21/hour ($5/day, $150/month)
- Large: $10.55 → $2.11/hour ($50/day, $1,500/month)

---

## Testing & Validation

### Unit Tests

```typescript
describe('GovernorDecisionSystem', () => {
  it('should make province decision via MayorNegotiator', async () => {
    const world = createTestWorld();
    const mayor = createMayorGovernor(world);
    const context = createProvinceContext();

    const decision = await mayor.makeDecision(context, world);

    expect(decision.action.type).toBeDefined();
    expect(decision.reasoning).toBeDefined();
  });

  it('should conduct parliament vote with consensus', async () => {
    const world = createTestWorld();
    const parliament = createParliament(7, world);
    const proposal = createTestProposal();

    const result = await conductVote(parliament, proposal, world);

    expect(result.decision).toMatch(/approved|rejected/);
    expect(result.votes.length).toBe(7);
  });

  it('should escalate crisis from province to nation', () => {
    const world = createTestWorld();
    const crisis = createMilitaryAttack();

    escalateCrisis(crisis, 'province', world);

    const nationGovernor = getNationGovernor(world);
    expect(nationGovernor.pendingCrises).toContain(crisis);
  });
});
```

---

## Summary

**LLM Governors implement multi-tier political decision making:**

**7 Political Tiers:**
1. **Galactic Council** → Inter-species law (1 call/hour)
2. **Empire** → Grand strategy (5 calls/hour)
3. **Nation** → Policy & war (10 calls/hour)
4. **Province/City** → Trade & construction (20 calls/hour, existing MayorNegotiator)
5. **Village** → No LLM (rule-based consensus)
6. **Squad** → Tactical goals (no LLM, hive mind Tier 2)
7. **Worker** → Execution (no LLM, hive mind Tier 1)

**Integration:**
- Extends existing MayorNegotiator for province tier
- Uses existing LLMScheduler for queue/rate limiting
- Works with existing CivilizationContext
- Compatible with Soul Agents (persistent governor personalities)
- Commands existing Hive Mind swarms (no changes to Tier 1-2)

**LLM Budget:**
- Small game: $0.04/hour ($1/day)
- Medium game: $0.21/hour ($5/day)
- Large game: $2.11/hour ($50/day)

**Key Features:**
- Multi-agent consensus (parliament voting)
- Hierarchical delegation (empire → nation → province)
- Escalation protocol (crisis handling)
- Personality persistence (soul agent governors)
- Memory across elections (core memories transfer)
- Dynasty tracking (hereditary succession)

**Result:** Player experiences emergent political dynamics across all scales, from village elders to galactic councils, with governors that develop unique personalities and make human-like decisions.

---

**Document Version:** 1.0.0
**Last Updated:** 2026-01-17
**Total Lines:** ~800
**Next Spec:** 12-STRATEGIC-LAYER.md
**Status:** Complete, ready for implementation
