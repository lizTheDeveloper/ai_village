# Governance System - Specification

**Created:** 2025-12-20
**Status:** Draft
**Version:** 0.1.0

---

## Purpose

The governance system manages the organic evolution of leadership, laws, and social order in villages, scaling from informal influence to structured councils as populations grow.

## Overview

The governance system manages how leadership, laws, and social order emerge in villages. Governance evolves organically from informal influence to structured councils. Leaders make decisions affecting the village, laws emerge from consensus or decree, and governance complexity scales with village size and abstraction layer.

---

## Governance Types

### Governance Structures

```typescript
type GovernanceType =
  | "anarchic"          // No formal leadership, consensus-based
  | "elder_council"     // Elders make decisions collectively
  | "chieftain"         // Single leader, informal authority
  | "council"           // Elected/appointed representatives
  | "monarchy"          // Hereditary leadership
  | "meritocracy"       // Leaders chosen by skill/achievement
  | "theocracy"         // Religious/spiritual leadership
  | "merchant_guild"    // Economic power controls governance
  // Alien governance types
  | "manchi_hierarchy"  // Instinctive loyalty cascade (Atevi-style)
  | "hive_queen"        // Single consciousness rules all (Borg/Formics)
  | "dominance_chain"   // Leadership by dominance display (Kif-style)
  | "gestalt_consensus" // Post-scarcity AI-mediated consensus (Culture)
  | "pack_council"      // Multiple bodies, one mind decides (Tines)
  | "cyclic_regency"    // Rotating leadership through hibernation cycles
  | "symbiont_merged";  // Joined consciousness co-governance (Trill)

interface VillageGovernance {
  villageId: string;
  type: GovernanceType;

  // Leadership
  leaders: Leader[];
  council?: Council;
  succession: SuccessionRule;

  // Laws and policies
  laws: Law[];
  policies: Policy[];
  traditions: Tradition[];

  // State
  stability: number;           // 0-100
  legitimacy: number;          // 0-100 (public support)
  corruption: number;          // 0-100

  // History
  formedAt: GameTime;
  previousTypes: GovernanceType[];
  revolutions: Revolution[];
}
```

### Leadership

```typescript
interface Leader {
  agentId: string;
  title: string;                // "Chief", "Elder", "Mayor", etc.
  role: LeaderRole;

  // Authority
  authorityLevel: number;       // 0-100
  domains: GovernanceDomain[];  // What they control

  // Tenure
  appointedAt: GameTime;
  termLength?: number;          // Days, or undefined for life
  appointmentMethod: AppointmentMethod;

  // Performance
  popularSupport: number;       // 0-100
  decisionsApproved: number;
  decisionsRejected: number;
}

type LeaderRole =
  | "head_of_state"      // Ultimate authority
  | "council_member"     // One of many
  | "advisor"            // Influence without formal power
  | "judge"              // Dispute resolution
  | "military_leader"    // Defense/security
  | "economic_minister"  // Trade/resources
  | "religious_leader";  // Spiritual guidance

type GovernanceDomain =
  | "all"                // Total authority
  | "defense"            // Military, walls, guards
  | "economy"            // Trade, taxes, resources
  | "justice"            // Laws, disputes, punishment
  | "construction"       // Building approval
  | "foreign"            // Inter-village relations
  | "culture"            // Festivals, traditions
  | "research";          // Technology priorities

type AppointmentMethod =
  | "emergence"          // Natural authority over time
  | "election"           // Popular vote
  | "council_vote"       // Council selects
  | "hereditary"         // Family succession
  | "merit"              // Achievement-based
  | "combat"             // Trial by combat
  | "lottery"            // Random selection
  | "wealth"             // Economic power
  // Alien appointment methods
  | "manchi_shift"       // Instinctive loyalty transfers biologically
  | "hive_designation"   // Queen designates (no choice involved)
  | "dominance_challenge"// Leader until successfully challenged
  | "ai_optimization"    // AI Minds select optimal candidate
  | "pack_reformation"   // Pack dissolves and reforms around new leader
  | "hibernation_cycle"  // Next awake cohort assumes leadership
  | "symbiont_selection";// Symbiont chooses new host
```

---

## Alien Governance Systems

### Man'chi Hierarchy (Atevi-style)

Man'chi is biological/instinctive loyalty that cannot be reasoned with or negotiated:

```typescript
interface ManchiGovernance extends VillageGovernance {
  type: "manchi_hierarchy";

  // Man'chi structure
  manchiCascade: ManchiNode[];
  aiji: string;                    // Top of hierarchy (like a lord)

  // Key differences from human governance
  noVoting: true;                  // Man'chi species cannot vote
  noNegotiation: true;             // Loyalty isn't negotiable
  loyaltyIsBiological: true;       // Felt in body, not chosen

  // Succession
  manchiShiftEvent?: ManchiShiftEvent;
}

interface ManchiNode {
  agentId: string;
  manchiTo: string;               // Who they feel loyalty to
  subordinates: string[];         // Who feels loyalty to them
  manchiStrength: number;         // 0-100 (how strong the pull)
  shiftVulnerability: number;     // 0-100 (how likely to shift)
}

interface ManchiShiftEvent {
  // When man'chi shifts, it's seismic
  affectedAgent: string;
  previousLord: string;
  newLord: string;

  trigger: ManchiShiftTrigger;
  cascadeEffect: string[];        // Others whose man'chi also shifted

  // Man'chi shifts cause instability
  violenceRisk: number;           // High - shifts often violent
  suicideRisk: number;            // Some can't survive the shift
}

type ManchiShiftTrigger =
  | "lord_death"                  // Lord dies, must find new
  | "lord_dishonor"               // Lord acts against nature
  | "proximity_to_stronger"       // Exposure to more compelling leader
  | "biological_maturation"       // Coming of age shift
  | "trauma";                     // Severe stress breaks bonds

// Man'chi governance has NO:
// - Elections
// - Councils with equal members
// - Popular will considerations
// - Negotiated policy changes
// - Concept of "fair" leadership

// Man'chi governance HAS:
// - Absolute loyalty to aiji
// - Cascading hierarchy (each level loyal to level above)
// - Assassination as political tool (if lord is weak)
// - Association (clan/house) as primary unit
// - Elaborate etiquette hiding true feelings
```

### Hive Queen Governance

Single consciousness rules all; governance IS the hive mind:

```typescript
interface HiveGovernance extends VillageGovernance {
  type: "hive_queen";

  // The queen IS the government
  queen: HiveQueen;

  // No separate leaders - queen controls all
  leaders: never;
  council: never;

  // Hive structure
  castes: HiveCaste[];
  workers: string[];              // Individual IDs (limited autonomy)

  // Governance is direct control
  directControl: boolean;         // Queen can override any worker
  autonomyGradient: Map<string, number>; // Per-worker autonomy level
}

interface HiveQueen {
  agentId: string;
  hiveSize: number;
  controlRange: number;           // Distance of mental control

  // Queen's mental bandwidth
  directControlSlots: number;     // How many she can control at once
  backgroundAwareness: number;    // How much she senses passively

  // Succession (rare - usually queen is immortal or hive dies)
  potentialSuccessors: string[];  // Larvae being raised as queens
  successionMethod: "none" | "combat" | "fission";
}

interface HiveCaste {
  name: string;                   // "worker", "soldier", "nurse", etc.
  autonomyLevel: number;          // 0-100 (0 = pure extension of queen)
  canInitiate: boolean;           // Can start actions without command?
  decisionScope: string[];        // What they can decide alone
}

// Hive governance characteristics:
// - No dissent (physically impossible)
// - Perfect information flow (queen knows all)
// - No corruption (queen can't bribe herself)
// - No succession crisis (usually) - queen doesn't die
// - No policy debate (queen decides instantly)
// - Worker happiness irrelevant (they don't have separate wants)
```

### Dominance Chain (Kif-style)

Leadership through continuous dominance display:

```typescript
interface DominanceGovernance extends VillageGovernance {
  type: "dominance_chain";

  // Current hierarchy
  dominanceHierarchy: DominanceRank[];

  // Challenge system
  challengeRules: ChallengeRules;
  recentChallenges: Challenge[];

  // No legitimacy concept - only power
  legitimacy: never;              // Kif don't have this concept
  stabilityFromFear: number;      // Stability = subordinates' fear
}

interface DominanceRank {
  agentId: string;
  rank: number;                   // 1 = top (hakkikt), descending
  challengedRecently: boolean;
  lastVictory: GameTime;
  fearInspired: number;           // 0-100
}

interface ChallengeRules {
  canChallengeAbove: boolean;     // Usually yes
  challengeMethod: ChallengeMethod;
  failureConsequence: "death" | "demotion" | "exile";
  cooldownPeriod: number;         // Days before can challenge again
}

type ChallengeMethod =
  | "combat"                      // Physical fight
  | "resource_seizure"            // Take their stuff
  | "follower_theft"              // Steal their subordinates
  | "assassination"               // Kill them
  | "humiliation";                // Public degradation

interface Challenge {
  challenger: string;
  challenged: string;
  method: ChallengeMethod;
  outcome: "challenger_wins" | "challenged_wins" | "mutual_destruction";
  witnessCount: number;           // More witnesses = more status change
  statusTransfer: number;         // How much rank changed
}

// Dominance governance characteristics:
// - Leadership is temporary (until challenged)
// - No loyalty (only fear/opportunity)
// - Constant jockeying for position
// - No stable laws (leader's whim is law)
// - Assassination is normal political tool
// - Coalition-building for challenges
// - Weakness is fatal
```

### Gestalt Consensus (Culture-style)

Post-scarcity AI-mediated perfect democracy:

```typescript
interface GestaltGovernance extends VillageGovernance {
  type: "gestalt_consensus";

  // AI Minds run everything
  minds: GestaltMind[];

  // Humans/biologicals are citizens, not rulers
  citizenRole: "participant" | "observer" | "protected";

  // Consensus mechanics
  consensusMethod: GestaltConsensusMethod;
  currentProposals: GestaltProposal[];
}

interface GestaltMind {
  id: string;
  name: string;                   // Minds have personalities and names
  specialty: string;              // What it manages

  // Mind capabilities
  computationalPower: number;     // Relative to baseline
  simulationDepth: number;        // How far ahead it models

  // Mind personality (they're individuals)
  personality: string;
  eccentricities: string[];
  humorStyle: string;
}

interface GestaltConsensusMethod {
  // No voting - discussion until agreement
  votingExists: false;

  // Minds simulate all outcomes
  simulationBased: boolean;

  // Biological input valued but not required
  biologicalVeto: boolean;        // Can bio citizens veto Minds?

  // Special circumstances
  specialCircumstances: {
    // When Minds disagree, rare and notable
    mindDisagreementProtocol: string;
    // Existential threats
    warFooting: string;
  };
}

interface GestaltProposal {
  id: string;
  proposer: string;               // Mind or citizen
  topic: string;

  // Minds' analysis
  mindAnalysis: Map<string, MindOpinion>;

  // Citizen sentiment
  citizenSentiment: number;       // 0-100

  // Outcome
  status: "discussing" | "simulating" | "decided" | "abandoned";
  outcome?: string;
}

// Gestalt governance characteristics:
// - No scarcity, so no zero-sum politics
// - Minds handle logistics perfectly
// - Citizens free to do whatever
// - "Work" is optional and recreational
// - No crime (abundance = no desperation)
// - No corruption (Minds don't want power)
// - Decisions are optimal (Minds simulate)
// - Personality expression is primary value
```

### Pack Council (Tines-style)

Pack minds where the "council" is literally one mind in multiple bodies:

```typescript
interface PackCouncilGovernance extends VillageGovernance {
  type: "pack_council";

  // The ruling pack(s)
  rulingPacks: RulingPack[];

  // Pack politics
  packAlliances: PackAlliance[];
  packConflicts: PackConflict[];
}

interface RulingPack {
  packId: string;
  bodies: string[];               // Component body IDs
  packName: string;               // Composite name

  // Role in governance
  governanceRole: "sovereign" | "advisor" | "minister";
  domain: GovernanceDomain[];

  // Pack-specific governance issues
  coherence: number;              // 0-100 (internal harmony)
  membershipStability: number;    // How often bodies change
}

interface PackAlliance {
  packs: string[];
  purpose: string;
  strength: number;
}

interface PackConflict {
  packs: string[];
  cause: string;

  // Pack warfare can include "stealing" members
  memberTheftAttempts: MemberTheft[];
}

interface MemberTheft {
  // One pack can absorb another's body
  targetBody: string;
  thiefPack: string;
  originalPack: string;
  outcome: "successful" | "failed" | "body_destroyed";
}

// Pack council characteristics:
// - Individual bodies have limited autonomy
// - Pack coherence crucial for leadership
// - Adding/losing bodies changes personality
// - Packs can split or merge (political fusion/fission)
// - Sonic/physical proximity required
// - Assassination = killing enough bodies
```

### Cyclic Regency

For species with hibernation cycles (Spiders, etc.):

```typescript
interface CyclicRegencyGovernance extends VillageGovernance {
  type: "cyclic_regency";

  // Cycle structure
  cycleDuration: number;          // Years per cycle
  currentCycle: number;

  // Cohort-based leadership
  awakeCohort: string[];          // Currently active agents
  sleepingCohorts: SleepingCohort[];

  // Regency structure
  currentRegent: string;
  regentSelectionMethod: RegentSelection;

  // Knowledge transfer
  hibernationHandoff: HibernationHandoff;
}

interface SleepingCohort {
  cohortId: string;
  members: string[];
  wakeTime: GameTime;
  lastActive: GameTime;
  responsibilities: string[];     // What they were handling
}

interface RegentSelection {
  method: "seniority" | "lottery" | "merit" | "rotation";
  eligibility: string[];          // Which cohorts can lead
  termLength: "until_sleep" | "fixed" | "until_challenged";
}

interface HibernationHandoff {
  // Critical for cyclic societies
  requiredDocumentation: string[];
  oralTraditionKeepers: string[];

  // What happens if handoff fails
  knowledgeLossRisk: number;
  contingencyPlans: string[];

  // The "awake" must maintain for sleepers
  sleeperProtectionDuties: string[];
}

// Cyclic regency characteristics:
// - Leadership rotates with biology
// - Long-term planning is multi-cycle
// - Trust between cohorts critical
// - Knowledge preservation paramount
// - Regent has limited mandate (temporary)
// - "Eternal" policies span all cohorts
```

### Symbiont Merged Governance (Trill-style)

When joined beings share governance:

```typescript
interface SymbiontGovernance extends VillageGovernance {
  type: "symbiont_merged";

  // Joined population
  joinedBeings: JoinedBeing[];

  // Symbiont continuity
  symbiontCouncil: SymbiontCouncil;

  // Host-symbiont politics
  joiningPolitics: JoiningPolitics;
}

interface JoinedBeing {
  hostId: string;
  symbiontId: string;
  joinedName: string;             // Combined name

  // Governance weight
  hostMemoryAccess: number;       // How many past hosts remembered
  experienceWeight: number;       // More lives = more influence

  // Current role
  governanceRole: LeaderRole[];
}

interface SymbiontCouncil {
  // The symbionts (immortal) are the continuity
  members: string[];              // Symbiont IDs

  // Ancient symbionts have outsized influence
  elderSymbionts: string[];       // Many-lifetimes old

  // Secret knowledge
  symbiontSecrets: string[];      // Things only symbionts know
  publicTransparency: number;     // 0-100 (how much hosts know)
}

interface JoiningPolitics {
  // Who gets joined is political
  joiningEligibility: string[];
  joiningCompetition: boolean;

  // Unsuitable hosts
  rejectionCriteria: string[];

  // Power dynamics
  doSymbiontsRule: boolean;       // Or are they equal partners?
  hostAutonomy: number;           // 0-100
}

// Symbiont governance characteristics:
// - Continuity through symbiont, not heredity
// - Ancient wisdom in living beings
// - Selection for joining is political
// - Host/symbiont balance of power
// - Symbionts may have secret agenda
// - Death of host ≠ death of experience
```

---

## Requirements

### Requirement: Leadership Emergence

Leaders SHALL emerge organically.

```typescript
interface LeadershipEmergence {
  // Factors that build authority
  authorityFactors: {
    skill: Map<string, number>;      // High skills = influence
    wealth: number;                   // Economic power
    relationships: number;            // Social connections
    reputation: number;               // Public perception
    age: number;                      // Seniority (for elders)
    heroicDeeds: number;              // Notable achievements
    familyLegacy: number;             // Inherited influence
  };

  // Threshold to become leader
  emergenceThreshold: number;

  // Recognition process
  recognitionEvents: RecognitionEvent[];
}
```

#### Scenario: No formal governance exists
- **WHEN** no formal governance exists
- **THEN** leaders SHALL emerge based on:
  1. Calculate influence score per agent:
     - Leadership skill weight: 30%
     - Relationship count weight: 20%
     - Reputation weight: 20%
     - Wealth weight: 15%
     - Age/experience weight: 15%
  2. Track who others defer to in disputes
  3. Track who others seek for advice
  4. WHEN influence exceeds threshold AND recognition events occur (others acknowledge leadership)
     - Agent becomes informal leader
  5. Over time, informal leadership may formalize

### Requirement: Council Formation

Councils SHALL form as villages grow.

```typescript
interface Council {
  id: string;
  name: string;
  villageId: string;

  // Composition
  members: CouncilMember[];
  requiredSize: number;
  currentSize: number;

  // Meeting
  meetingFrequency: number;      // Days between meetings
  meetingLocation: string;       // Building ID
  lastMeeting: GameTime;

  // Voting
  votingMethod: VotingMethod;
  quorum: number;                // Minimum members to decide

  // Authority
  domains: GovernanceDomain[];
  canOverrideLeader: boolean;
}

interface CouncilMember {
  agentId: string;
  seat: string;                  // "Elder Seat 1", "Trade Rep", etc.
  joinedAt: GameTime;
  termEnds?: GameTime;
  votingWeight: number;          // Usually 1, but may vary
  attendance: number;            // 0-100 percentage
}

type VotingMethod =
  | "majority"           // >50% wins
  | "supermajority"      // >66% wins
  | "unanimous"          // 100% required
  | "plurality"          // Most votes wins
  | "consensus"          // Discussion until agreement
  | "leader_tiebreak";   // Leader decides ties
```

#### Scenario: Village population exceeds threshold
- **WHEN** village population exceeds threshold (e.g., 20 agents)
- **THEN** council formation MAY occur:
  1. Influential agents propose council
  2. Village votes or consents
  3. Initial members selected by:
     - Existing leaders automatically join
     - Election for remaining seats
     - Or appointment by leader
  4. Council begins meeting regularly
  5. Decisions require quorum and voting method

### Requirement: Laws and Policies

Governance SHALL create enforceable rules.

```typescript
interface Law {
  id: string;
  name: string;
  description: string;

  // Scope
  domain: GovernanceDomain;
  affectedAgents: "all" | "citizens" | "visitors" | string[];

  // Content
  type: LawType;
  provisions: LawProvision[];

  // Enforcement
  punishment: Punishment[];
  enforcementLevel: number;      // 0-100 (how strictly enforced)

  // History
  proposedBy: string;
  enactedAt: GameTime;
  supportVotes: number;
  opposeVotes: number;
}

type LawType =
  | "prohibition"        // Cannot do X
  | "requirement"        // Must do X
  | "regulation"         // X requires approval
  | "taxation"           // Must pay for X
  | "property"           // Ownership rules
  | "trade"              // Commerce rules
  | "social"             // Behavior norms
  | "religious";         // Spiritual requirements

interface LawProvision {
  condition: string;           // When this applies
  requirement: string;         // What must/must not happen
  exceptions: string[];        // Who/what is exempt
}

interface Punishment {
  severity: "minor" | "moderate" | "severe" | "extreme";
  type: PunishmentType;
  amount?: number;             // Fine amount, days, etc.
}

type PunishmentType =
  | "fine"               // Pay currency
  | "labor"              // Community service
  | "restitution"        // Pay victim
  | "exile"              // Banishment
  | "imprisonment"       // Confined (if jail exists)
  | "shunning"           // Social exclusion
  | "demotion"           // Loss of status
  | "execution";         // Death (extreme, rare)
```

#### Scenario: Law is proposed
- **WHEN** a law is proposed
- **THEN** the system SHALL:
  1. Proposer (leader or council member) drafts law
  2. Law goes to appropriate body:
     - Leader decree (if chieftain/monarchy)
     - Council vote (if council exists)
     - Popular vote (if democracy)
  3. IF passed:
     - Law becomes active
     - Agents informed via conversation/chroniclers
     - Enforcement begins
  4. Laws may be:
     - Amended (modify provisions)
     - Repealed (removed)
     - Ignored (if enforcement low)

### Requirement: Policy Decisions

Leaders SHALL make policy decisions.

```typescript
interface Policy {
  id: string;
  domain: GovernanceDomain;
  name: string;

  // Configuration
  settings: Map<string, any>;

  // Effects
  effects: PolicyEffect[];

  // Approval
  approvedBy: string;          // Leader or council
  approvedAt: GameTime;
}

interface PolicyEffect {
  target: string;              // What it affects
  modifier: number;            // How much
  description: string;
}

// Example policies
const examplePolicies: Policy[] = [
  {
    id: "trade_tariff",
    domain: "economy",
    name: "Import Tariff",
    settings: new Map([
      ["rate", 0.1],           // 10% tax on imports
      ["exemptItems", ["food", "medicine"]],
    ]),
    effects: [
      { target: "village_treasury", modifier: 1.1, description: "+10% trade revenue" },
      { target: "import_prices", modifier: 1.1, description: "+10% import costs" },
    ],
  },
  {
    id: "construction_priority",
    domain: "construction",
    name: "Housing Priority",
    settings: new Map([
      ["priorityBuilding", "residential"],
      ["laborAllocation", 0.3],
    ]),
    effects: [
      { target: "residential_construction", modifier: 1.3, description: "+30% housing speed" },
      { target: "other_construction", modifier: 0.9, description: "-10% other building speed" },
    ],
  },
];
```

### Requirement: Succession

Leadership SHALL transfer according to rules.

```typescript
interface SuccessionRule {
  type: SuccessionType;
  candidates: SuccessionCriteria;
  selectionMethod: AppointmentMethod;

  // Triggers
  successionTriggers: SuccessionTrigger[];

  // Interregnum
  interregnumHandler: string;  // Who leads during transition
  maxInterregnumDays: number;
}

type SuccessionType =
  | "hereditary"         // Family line
  | "elected"            // New election
  | "appointed"          // Outgoing leader chooses
  | "merit"              // Best qualified
  | "seniority"          // Longest serving
  | "combat";            // Trial determines

type SuccessionTrigger =
  | "death"
  | "resignation"
  | "term_end"
  | "incapacity"
  | "removal"            // Impeachment/coup
  | "exile";

interface SuccessionCriteria {
  minimumAge?: number;
  requiredSkills?: Map<string, number>;
  requiredRelationships?: number;
  familyRestriction?: "royal_family" | "noble_families" | "none";
  genderRestriction?: string;
  residencyRequirement?: number;  // Days in village
}
```

#### Scenario: Succession is triggered
- **WHEN** succession is triggered
- **THEN** the system SHALL:
  1. Identify cause (death, resignation, removal, etc.)
  2. Enter interregnum (temporary leadership)
  3. Apply succession rules:
     - Hereditary: Find heir by family tree
     - Elected: Hold election
     - Appointed: Previous leader's choice
     - Merit: Evaluate candidates
  4. New leader assumes power
  5. Legitimacy affected by process smoothness
  6. Chroniclers document transition

---

## Governance Evolution

### Requirement: Governance Transitions

Governance type SHALL evolve.

```typescript
interface GovernanceTransition {
  from: GovernanceType;
  to: GovernanceType;
  trigger: TransitionTrigger;
  conditions: TransitionConditions;
  peacefulProbability: number;
}

type TransitionTrigger =
  | "population_growth"    // Village gets bigger
  | "leader_death"         // Power vacuum
  | "popular_demand"       // People want change
  | "crisis"               // Emergency changes things
  | "conquest"             // External force
  | "revolution"           // Internal uprising
  | "reform"               // Peaceful evolution
  | "collapse";            // System failure

const typicalTransitions: GovernanceTransition[] = [
  {
    from: "anarchic",
    to: "elder_council",
    trigger: "population_growth",
    conditions: { minPopulation: 15, hasElders: true },
    peacefulProbability: 0.95,
  },
  {
    from: "elder_council",
    to: "chieftain",
    trigger: "crisis",
    conditions: { crisisSeverity: "high", hasStrongLeader: true },
    peacefulProbability: 0.7,
  },
  {
    from: "chieftain",
    to: "council",
    trigger: "popular_demand",
    conditions: { legitimacy: "<40", populationDemand: ">60%" },
    peacefulProbability: 0.5,
  },
  {
    from: "chieftain",
    to: "monarchy",
    trigger: "leader_death",
    conditions: { hasHeir: true, stability: ">70" },
    peacefulProbability: 0.8,
  },
];
```

### Requirement: Revolution and Coups

Power MAY change through conflict.

```typescript
interface Revolution {
  id: string;
  villageId: string;

  // Sides
  revolutionaries: Faction;
  loyalists: Faction;

  // Cause
  trigger: string;
  grievances: string[];

  // Progress
  startedAt: GameTime;
  endedAt?: GameTime;
  phase: RevolutionPhase;

  // Outcome
  outcome?: RevolutionOutcome;
  casualties: number;
  exiled: string[];
}

interface Faction {
  name: string;
  leader: string;
  members: string[];
  support: number;             // 0-100 popular support
  resources: number;
  goals: string[];
}

type RevolutionPhase =
  | "unrest"             // Tensions rising
  | "protests"           // Open dissent
  | "uprising"           // Active conflict
  | "civil_war"          // Full conflict
  | "resolution";        // Ending

type RevolutionOutcome =
  | "revolutionary_victory"
  | "loyalist_victory"
  | "compromise"
  | "stalemate"
  | "external_intervention";
```

#### Scenario: Legitimacy falls below threshold
- **WHEN** legitimacy falls below threshold (e.g., 20)
- **AND** grievances accumulate
- **THEN** revolution MAY begin:
  1. Faction forms around grievances
  2. Revolution leader emerges
  3. Phases progress based on:
     - Faction support levels
     - Resource availability
     - Leadership effectiveness
     - External factors
  4. Resolution determines new governance
  5. Village stability severely affected
  6. Chroniclers document for history

---

## Dispute Resolution

### Requirement: Justice System

Governance SHALL resolve disputes.

```typescript
interface Dispute {
  id: string;
  type: DisputeType;
  complainant: string;
  defendant: string;

  // Details
  description: string;
  evidence: Evidence[];
  witnesses: string[];

  // Process
  status: DisputeStatus;
  assignedJudge?: string;
  hearing?: Hearing;

  // Resolution
  verdict?: Verdict;
  punishment?: Punishment;
  restitution?: Restitution;
}

type DisputeType =
  | "theft"
  | "assault"
  | "fraud"
  | "property"
  | "contract"
  | "slander"
  | "family"
  | "inheritance";

type DisputeStatus =
  | "filed"
  | "investigating"
  | "scheduled"
  | "hearing"
  | "deliberating"
  | "resolved"
  | "appealed";

interface Verdict {
  decision: "guilty" | "innocent" | "partial" | "dismissed";
  reasoning: string;
  decidedBy: string;
  decidedAt: GameTime;
}
```

#### Scenario: Dispute is filed
- **WHEN** a dispute is filed
- **THEN** the justice system SHALL:
  1. Assign to appropriate authority:
     - Minor: Elder or respected agent
     - Moderate: Judge or leader
     - Severe: Full council
  2. Gather evidence and witnesses
  3. Hold hearing (if formal)
  4. Render verdict
  5. Apply punishment/restitution
  6. Update relationships affected
  7. Create memory for all involved

---

## Inter-Village Governance

### Requirement: Diplomatic Relations

Villages SHALL have diplomatic relations.

```typescript
interface DiplomaticRelation {
  villages: [string, string];

  // Status
  status: DiplomaticStatus;
  treaties: Treaty[];

  // Interaction
  ambassadors: Map<string, string>;  // Village -> Agent ID
  lastContact: GameTime;

  // History
  relationshipHistory: DiplomaticEvent[];
  conflicts: Conflict[];
}

type DiplomaticStatus =
  | "unknown"            // Never contacted
  | "first_contact"      // Recently discovered
  | "neutral"            // No formal relations
  | "friendly"           // Positive relations
  | "allied"             // Formal alliance
  | "trade_partners"     // Economic agreement
  | "tense"              // Strained relations
  | "hostile"            // Active conflict
  | "vassal"             // Subordinate
  | "suzerain";          // Dominant

interface Treaty {
  id: string;
  name: string;
  type: TreatyType;
  parties: string[];
  terms: TreatyTerm[];
  signedAt: GameTime;
  expiresAt?: GameTime;
  status: "active" | "suspended" | "terminated";
}

type TreatyType =
  | "trade"              // Economic agreement
  | "alliance"           // Mutual defense
  | "non_aggression"     // Peace agreement
  | "border"             // Territory agreement
  | "cultural"           // Exchange programs
  | "vassal";            // Submission
```

### Requirement: Federation and Empire

Multiple villages MAY unite.

```typescript
interface Federation {
  id: string;
  name: string;
  type: "federation" | "empire" | "league" | "confederation";

  // Members
  members: FederationMember[];
  capital?: string;            // Leading village

  // Governance
  federalGovernance: VillageGovernance;
  memberAutonomy: number;      // 0-100 (how independent members are)

  // Shared
  sharedPolicies: Policy[];
  federalLaws: Law[];
  sharedResources: boolean;
  commonDefense: boolean;
}

interface FederationMember {
  villageId: string;
  joinedAt: GameTime;
  status: "full" | "associate" | "observer";
  votingWeight: number;
  contributions: number;       // Resources contributed
}
```

---

## Abstraction Layer Integration

### Requirement: Governance at Scale

Governance SHALL work across abstraction layers.

```typescript
interface GovernanceAbstraction {
  layer: SimulationLayer;
  detailLevel: GovernanceDetailLevel;
}

type GovernanceDetailLevel =
  | "full"               // All decisions simulated
  | "major_only"         // Only significant decisions
  | "aggregate"          // Statistical outcomes
  | "historical";        // Only recorded events

// At full simulation:
// - Every council meeting simulated
// - Individual votes tracked
// - Relationships affect votes

// At background simulation:
// - Major decisions still occur
// - Outcomes based on leader personality + stats
// - Detailed deliberation skipped

// At abstract simulation:
// - Governance type and stability tracked
// - Major events (revolutions, succession) simulated
// - Policies affect aggregate village stats

// At historical:
// - Only past governance records exist
// - Leaders are names in chronicles
// - Laws are historical artifacts
```

#### Scenario: Village is at abstract layer
- **WHEN** village is at abstract layer
- **THEN** governance SHALL:
  - Track stability and legitimacy stats
  - Simulate succession events
  - Apply policy effects to aggregate stats
  - Generate major events (revolutions) probabilistically
  - Preserve key figure (leader) for catch-up

#### Scenario: Village upgrades to active layer
- **WHEN** village upgrades to active layer
- **THEN** governance SHALL:
  - Maintain current leadership
  - Expand policy effects to individuals
  - Resume council meetings if applicable
  - Full dispute resolution resumes

---

## Player Interaction

### Requirement: Player Governance Role

Players MAY participate in governance.

```typescript
interface PlayerGovernanceRole {
  // As leader
  canBecomeLeader: boolean;
  canMakeLaws: boolean;
  canAppointOfficials: boolean;

  // As citizen
  canVote: boolean;
  canPropose: boolean;
  canProtest: boolean;

  // As observer
  canViewDeliberations: boolean;
  canViewVotes: boolean;
}
```

#### Scenario: Player-agent has high influence
- **WHEN** player-agent has high influence
- **THEN** player MAY:
  - Stand for election
  - Be appointed to positions
  - Propose laws to council
  - Lead factions

#### Scenario: Player is leader
- **WHEN** player is leader
- **THEN** player SHALL:
  - Make policy decisions via UI
  - Approve/reject proposals
  - Appoint officials
  - Handle disputes (or delegate)
  - Note: Governance continues autonomously when player is absent based on autonomy settings and AI advisors

---

## Open Questions

1. Democratic vs authoritarian balance mechanics?
2. Corruption and anti-corruption systems?
3. Secret societies and shadow governance?
4. Religious vs secular authority conflicts?
5. Governance victory conditions?

---

## Related Specs

**Core Integration:**
- `agent-system/spec.md` - Leadership skill, personality in governance
- `agent-system/needs.md` - Autonomy, respect needs from governance
- `agent-system/relationship-system.md` - Political relationships

**Social Systems:**
- `agent-system/lifecycle-system.md` - Elder council eligibility, succession
- `agent-system/chroniclers.md` - Documenting governance history
- `agent-system/conversation-system.md` - Political negotiations

**World Systems:**
- `world-system/abstraction-layers.md` - Governance at scale
- `economy-system/spec.md` - Economic policies, taxation
- `economy-system/inter-village-trade.md` - Trade treaties
- `construction-system/spec.md` - Town hall, council chambers
- `progression-system/spec.md` - Governance complexity milestones
