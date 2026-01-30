# Conflict System - Specification

**Created:** 2025-12-20
**Status:** Draft
**Version:** 0.1.0

---

## Purpose

The conflict system handles hostile interactions through skill-based resolution and narrative generation, creating meaningful consequences from hunting, combat, and dominance challenges.

## Overview

The conflict system handles all hostile interactions: hunting wild animals, defending against predators, agent-vs-agent combat, and dominance challenges. For LLM agents, conflict is resolved through skill checks and narrative generation, not frame-by-frame combat simulation.

---

## Core Principles

### Conflict is Consequential

Conflict should be meaningful, not constant. Deaths are permanent. Injuries affect productivity. Trauma creates memories.

```typescript
// Conflict is NOT:
const notConflict = [
  "entertainment combat",     // No respawns
  "level grinding",           // Skills grow through practice
  "consequence-free",         // Deaths are real
];

// Conflict IS:
const conflict = [
  "resource competition",     // Hunting for food
  "territorial defense",      // Protecting the village
  "predator survival",        // Animals attack
  "social dominance",         // For species that require it
  "last resort",              // When negotiation fails
];
```

### Resolution is Narrative

LLM agents don't fight in real-time. Conflicts resolve through skill-modified outcomes:

```typescript
interface ConflictResolution {
  // Skill checks determine outcome
  skillChecks: SkillCheck[];

  // LLM generates narrative
  narrative: string;

  // Outcomes applied
  outcomes: ConflictOutcome[];

  // Memories formed
  memoriesCreated: EpisodicMemory[];
}
```

---

## Conflict Types

```typescript
type ConflictType =
  | "hunting"              // Agent hunts wild animal
  | "predator_attack"      // Wild animal attacks agent
  | "agent_combat"         // Agent vs agent
  | "dominance_challenge"  // Formal challenge for rank
  | "raid"                 // Group attack on settlement
  | "defense"              // Protecting location/person
  | "duel"                 // Formal one-on-one
  | "ambush";              // Surprise attack
```

---

## Requirements

### Requirement: Hunting System

Agents SHALL hunt wild animals for food and resources:

```typescript
interface HuntingAttempt {
  hunter: string;                    // Agent ID
  target: string;                    // Animal ID
  method: HuntingMethod;
  location: Position;

  // Skill factors
  hunterSkill: number;               // Hunting skill 0-100
  hunterStealth: number;             // Stealth skill
  hunterCombat: number;              // Combat skill (for kill)

  // Target factors
  targetAwareness: number;           // Animal alertness
  targetSpeed: number;               // Escape capability
  targetDanger: number;              // Can it fight back?

  // Environmental factors
  terrain: TerrainType;
  weather: WeatherType;
  timeOfDay: TimeOfDay;
}

type HuntingMethod =
  | "tracking"             // Find then kill
  | "ambush"               // Wait for prey
  | "pursuit"              // Chase down
  | "trapping"             // Set snares
  | "group_hunt";          // Coordinated with others

interface HuntingOutcome {
  success: boolean;
  animal?: {
    killed: boolean;
    escaped: boolean;
    injured: boolean;
  };
  hunter?: {
    injured: boolean;
    injuryType?: InjuryType;
    exhausted: boolean;
  };
  resources?: {
    meat: number;
    hide: number;
    bones: number;
    special?: string[];       // Antlers, feathers, etc.
  };
}
```

#### Scenario: Agent attempts to hunt
- **WHEN** an agent attempts to hunt
- **THEN** the system SHALL:
  1. Calculate tracking success:
     - Base: hunting skill / 100
     - Bonus: stealth skill / 200
     - Modifier: terrain, weather, time
     - Penalty: animal awareness
  2. If tracking succeeds, calculate kill success:
     - Base: combat skill / 100
     - Bonus: hunting skill / 200
     - Penalty: animal speed, danger level
  3. If dangerous animal, check for counterattack:
     - Animal danger level vs hunter combat
     - Failed hunt of predator = potential injury
  4. Generate narrative via LLM
  5. Apply outcomes (resources, injuries, memories)

### Requirement: Predator Attacks

Wild predators SHALL attack agents:

```typescript
interface PredatorAttack {
  predator: string;                  // Animal ID
  target: string;                    // Agent ID
  trigger: AttackTrigger;

  // Predator capabilities
  predatorDanger: number;            // Attack power
  predatorSpeed: number;
  predatorPack?: string[];           // Other predators in group

  // Target defenses
  targetCombat: number;
  targetStealth: number;             // Was agent detected?
  targetGuards?: string[];           // Nearby protectors
}

type AttackTrigger =
  | "hunger"               // Predator hunting
  | "territory"            // Agent in predator's territory
  | "defending_young"      // Threatened nest/den
  | "provoked"             // Agent attacked first
  | "injured"              // Desperate predator
  | "pack_coordinated";    // Wolf pack, etc.

interface PredatorAttackOutcome {
  result: "agent_escaped" | "agent_injured" | "agent_killed" |
          "predator_fled" | "predator_injured" | "predator_killed";

  // Agent effects
  agentInjury?: Injury;
  agentTrauma?: boolean;              // Creates lasting fear memory

  // Predator effects
  predatorStatus?: "fled" | "injured" | "dead";

  // Witness effects
  witnessAlerts?: string[];           // Nearby agents alarmed
}
```

#### Scenario: Predator encounters an agent
- **WHEN** a predator encounters an agent
- **THEN** the system SHALL:
  1. Check if predator attacks (based on trigger conditions)
  2. If agent has stealth, check if spotted
  3. If attack proceeds:
     a. Check for nearby guards/allies
     b. Roll combat: agent combat + allies vs predator danger
     c. Apply injury on failure
     d. Agent death if injury + low health
  4. Create trauma memory if near-death
  5. Alert nearby agents (may trigger rescue)

### Requirement: Agent Combat

Agents MAY fight other agents:

```typescript
interface AgentCombat {
  attacker: string;
  defender: string;
  cause: CombatCause;

  // Combat stats
  attackerCombat: number;
  defenderCombat: number;

  // Modifiers
  attackerWeapon?: Weapon;
  defenderWeapon?: Weapon;
  attackerArmor?: Armor;
  defenderArmor?: Armor;

  // Context
  surprise: boolean;                  // Ambush?
  witnesses: string[];                // Who sees this?
  location: Position;
}

type CombatCause =
  | "resource_dispute"     // Fighting over stuff
  | "territory"            // Land conflict
  | "relationship"         // Personal grudge
  | "dominance"            // Status competition
  | "defense_of_other"     // Protecting someone
  | "theft"                // Robbery attempt
  | "raid"                 // External attack
  | "madness";             // Irrational (low sanity)

interface CombatOutcome {
  victor: string | null;              // null = both down
  loser: string | null;

  // Injuries
  victorInjury?: Injury;
  loserInjury?: Injury;

  // Death (rare, requires intent or accident)
  death?: string;

  // Social consequences
  relationshipChanges: RelationshipChange[];
  reputationChanges: ReputationChange[];
  witnessReactions: WitnessReaction[];

  // Legal consequences (if village has laws)
  lawsBroken?: string[];
}
```

#### Scenario: Agents enter combat
- **WHEN** agents enter combat
- **THEN** the system SHALL:
  1. Compare combat skills + equipment
  2. Apply modifiers (surprise, terrain, injuries)
  3. Roll outcome with skill-weighted probability
  4. Determine injury severity:
     - Minor: temporary debuff
     - Major: long-term impact
     - Critical: risk of death
  5. Generate narrative (LLM describes the fight)
  6. Apply social consequences:
     - Witnesses form opinions
     - Relationships change
     - Reputation affected
  7. Check for legal consequences if village has laws

---

## Dominance Systems

### Requirement: Dominance Challenges

Species with dominance psychology SHALL have formal challenge mechanics:

```typescript
interface DominanceChallenge {
  challenger: string;
  incumbent: string;
  species: string;                   // Must be dominance-based species

  // Challenge type
  method: DominanceChallengeMethod;

  // Stakes
  positionContested: string;         // What rank is at stake?
  consequences: DominanceConsequences;
}

type DominanceChallengeMethod =
  | "combat"               // Physical fight
  | "display"              // Intimidation contest
  | "resource_seizure"     // Take their stuff
  | "follower_theft"       // Steal subordinates
  | "humiliation"          // Public degradation
  | "assassination";       // Kill them (extreme)

interface DominanceConsequences {
  // What challenger gains if wins
  challengerVictory: {
    newRank: number;
    subordinatesGained: string[];
    resourcesGained: string[];
  };

  // What happens to loser
  loserFate: "demotion" | "exile" | "death" | "subordinate";

  // What happens on challenger failure
  challengerFailureFate: "death" | "exile" | "subordinate" | "shame";
}

interface DominanceOutcome {
  victor: string;
  method: DominanceChallengeMethod;

  // Hierarchy changes
  newHierarchy: DominanceRank[];

  // Loser fate
  loserOutcome: "demoted" | "exiled" | "dead" | "subordinated";

  // Cascading effects
  cascadeEffects: CascadeEffect[];    // Others may challenge now
}

interface CascadeEffect {
  // A dominance shift can destabilize the hierarchy
  affectedAgent: string;
  effect: "may_challenge" | "must_submit" | "flees" | "seeks_alliance";
  probability: number;
}
```

#### Scenario: Dominance challenge occurs
- **WHEN** a dominance challenge occurs (Kif-style species)
- **THEN** the system SHALL:
  1. Verify both are dominance-based species
  2. Check challenge is valid (can challenge above)
  3. Resolve based on method:
     - Combat: highest combat + intimidation wins
     - Display: pure intimidation check
     - Resource seizure: stealth + combat vs guards
     - Follower theft: socializing vs incumbent's hold
  4. Apply consequences immediately
  5. Check for cascade effects:
     - Others may see opportunity
     - Failed challenge = vulnerability
  6. Update all dominance relationships

**IMPORTANT:** For dominance species, this IS their politics.
  - No voting exists
  - No negotiation exists
  - Only strength determines hierarchy

---

## Alien Combat Modes

### Requirement: Pack Mind Combat

Pack minds fight as single entities across multiple bodies:

```typescript
interface PackMindCombat {
  packId: string;
  bodiesEngaged: string[];           // Which bodies fighting

  // Pack advantages
  multipleAngleAttack: boolean;      // Attack from all sides
  coordinatedTactics: boolean;       // Perfect coordination
  sensorRedundancy: boolean;         // Can't be blinded

  // Pack vulnerabilities
  coherenceRange: number;            // Bodies must stay close
  bodyTargeting: boolean;            // Can target individual bodies
  thoughtDisruption: boolean;        // Loud noises scatter thinking
}

interface PackCombatTarget {
  // Targeting a pack
  targetPack: string;

  strategy: PackTargetStrategy;
}

type PackTargetStrategy =
  | "scatter"              // Force bodies apart (break coherence)
  | "eliminate_thinkers"   // Kill the smart bodies first
  | "noise_attack"         // Disrupt coordination
  | "attrition"            // Kill bodies one by one
  | "capture_body";        // Steal a body for own pack

interface PackCombatOutcome {
  // Pack still exists?
  packSurvives: boolean;

  // Body losses
  bodiesLost: string[];

  // Coherence damage
  coherenceLoss: number;             // May drop below sapience

  // Body captures (rare, devastating)
  bodiesCaptured: string[];          // Lost to enemy pack

  // Pack may split if too damaged
  packSplit?: { newPacks: string[] };
}
```

#### Scenario: Engaging a pack mind in combat
- **WHEN** engaging a pack mind in combat
- **THEN** the system SHALL:
  1. Track all bodies as single combatant
  2. Apply pack bonuses (coordination, angles)
  3. Check coherence maintenance:
     - If bodies forced apart, coherence drops
     - Below threshold = confused/ineffective
  4. Damage to bodies accumulates:
     - Each body lost = capability loss
     - Below minimum bodies = pack dies or splits
  5. Body capture is possible (very bad for victim)

### Requirement: Hive Warfare

Hive minds fight with expendable workers:

```typescript
interface HiveWarfare {
  attackingHive: string;
  defendingHive: string;

  // Scale
  workersDeployed: number;
  workerCasualties: number;          // Expected losses

  // Objectives
  objective: HiveWarfareObjective;
}

type HiveWarfareObjective =
  | "territory"            // Take land
  | "resources"            // Take stuff
  | "elimination"          // Destroy other hive
  | "queen_assassination"  // Decapitation strike
  | "worker_capture";      // Steal workers (some hives can do this)

interface HiveWarfareOutcome {
  victor: string;

  // Losses (workers are replaceable)
  attackerLosses: number;
  defenderLosses: number;

  // Queen status (only thing that matters)
  attackingQueenStatus: "alive" | "injured" | "dead";
  defendingQueenStatus: "alive" | "injured" | "dead";

  // Territory changes
  territoryTransferred?: Position[];

  // If queen dies, hive collapses
  hiveCollapse?: string;
}
```

#### Scenario: Hives go to war
- **WHEN** hives go to war
- **THEN** the system SHALL:
  1. Calculate worker ratios
  2. Worker deaths are statistics, not individuals
  3. Queen protection is primary concern:
     - Assassination attempts are high-risk, high-reward
     - Queen death = hive death
  4. Territory changes affect resource access
  5. Hive that loses queen:
     - Workers become feral or die
     - Resources up for grabs
     - Potential successor queens may fight

### Requirement: Man'chi Combat

Man'chi species fight for their lord, not themselves:

```typescript
interface ManchiCombat {
  agent: string;
  lord: string;                      // Who they're loyal to

  // Man'chi modifiers
  manchiStrength: number;            // Affects morale
  lordPresent: boolean;              // Fighting near lord?
  lordInDanger: boolean;             // Lord threatened?

  // Combat bonuses
  loyaltyBonus: number;              // +combat when lord nearby
  desperationBonus: number;          // +combat when lord threatened
  surrenderImpossible: boolean;      // Won't surrender if lord captured
}

interface ManchiCombatEffects {
  // Man'chi affects combat psychology
  ifLordDies: "berserk" | "collapse" | "seek_new_lord" | "suicide";

  // Can't surrender to enemies of lord
  surrenderTo: string[];             // Only those lord approves

  // Betrayal is almost impossible
  betrayalCheck: number;             // Nearly 0 for strong man'chi
}
```

#### Scenario: Man'chi agents fight
- **WHEN** man'chi agents fight
- **THEN** the system SHALL:
  1. Apply man'chi bonuses:
     - Near lord: +20% combat effectiveness
     - Lord threatened: +50% combat, ignore injuries
  2. Man'chi agents don't surrender to lord's enemies
  3. If lord dies in battle:
     - High man'chi: berserk rage or collapse
     - May need to find new lord immediately
  4. Betrayal almost never happens (biological loyalty)

---

## Injuries and Death

### Requirement: Injury System

Combat SHALL cause injuries:

```typescript
interface Injury {
  id: string;
  type: InjuryType;
  severity: "minor" | "major" | "critical";
  location?: BodyLocation;

  // Effects
  skillPenalties: Map<string, number>;
  movementPenalty: number;
  needsModifier: Map<string, number>;

  // Healing
  healingTime: number;               // Game days
  requiresTreatment: boolean;
  treated: boolean;
}

type InjuryType =
  | "laceration"           // Cuts
  | "puncture"             // Stab wounds
  | "blunt"                // Bruises, breaks
  | "burn"                 // Fire, acid
  | "bite"                 // Animal attack
  | "exhaustion"           // Overexertion
  | "psychological";       // Trauma

type BodyLocation =
  | "head"
  | "torso"
  | "arm_left" | "arm_right"
  | "leg_left" | "leg_right"
  | "hand" | "foot";

interface InjuryEffects {
  // Skill penalties by injury
  effects: {
    head_critical: { all_skills: -50, memory_formation: false };
    arm_major: { crafting: -30, combat: -20 };
    leg_major: { movement: -50, farming: -20 };
    psychological: { socializing: -30, risk_aversion: +50 };
  };
}
```

### Requirement: Death

Death SHALL be permanent:

```typescript
interface Death {
  agentId: string;
  cause: DeathCause;
  location: Position;
  witnesses: string[];

  // Effects
  inventoryDropped: Item[];
  relationshipsAffected: string[];
  knowledgeLost: string[];           // Unique knowledge dies with them
}

type DeathCause =
  | "combat"               // Killed in fight
  | "predator"             // Killed by animal
  | "starvation"           // Needs failure
  | "disease"              // Illness
  | "accident"             // Mishap
  | "old_age"              // Natural death
  | "execution"            // Formal killing
  | "sacrifice"            // Ritual death
  | "unknown";             // Mystery

interface DeathEffects {
  // Memories
  witnessTrauma: boolean;            // Witnesses may be traumatized
  mourningPeriod: number;            // Days of grief for close relations

  // Knowledge loss
  uniqueKnowledgeLost: string[];     // Things only they knew

  // Social effects
  powerVacuum: boolean;              // If they held position
  revengeDesire: boolean;            // Close relations may want vengeance

  // Pack/Hive special
  packCoherenceEffect?: number;      // Pack loses body
  hiveEffect?: "worker_loss" | "queen_death";
}
```

#### Scenario: Agent dies
- **WHEN** an agent dies
- **THEN** the system SHALL:
  1. Mark agent as dead (not deleted - history preserved)
  2. Drop inventory at location
  3. Notify all agents with relationship
  4. Apply mourning to close relations
  5. Check for knowledge loss:
     - Unique memories die with them
     - Shared memories survive
  6. Check for power vacuum (leadership succession)
  7. Create death memory for witnesses
  8. For pack minds: recalculate pack coherence
  9. For hives: if queen, trigger collapse

---

## Defense and Protection

### Requirement: Guard Duty

Agents SHALL protect locations and people:

```typescript
interface GuardDuty {
  guard: string;
  assignment: GuardAssignment;

  // Alertness
  alertness: number;                 // 0-100, decreases with time
  alertnessDecay: number;            // Per hour

  // Response
  responseRadius: number;            // How far they respond
  responseThreshold: number;         // What triggers response
}

interface GuardAssignment {
  type: "location" | "person" | "patrol";

  // Location guard
  location?: Position;
  locationRadius?: number;

  // Person guard
  protectee?: string;

  // Patrol
  patrolRoute?: Position[];
  patrolInterval?: number;
}

interface ThreatDetection {
  guard: string;
  threat: string;                    // What was detected

  // Detection success
  detected: boolean;
  detectionMethod: "visual" | "auditory" | "other_alert";

  // Response
  response: "alert_others" | "intercept" | "observe" | "flee";
}
```

#### Scenario: Guard is on duty
- **WHEN** a guard is on duty
- **THEN** the system SHALL:
  1. Periodically check for threats in radius
  2. Detection chance = guard alertness + stealth penalty
  3. On detection:
     - Evaluate threat level
     - Choose response (intercept, alert, observe)
  4. Alertness decays over time:
     - Long shifts = less effective
     - Rotation needed for sustained protection

### Requirement: Village Defense

Villages SHALL have collective defense:

```typescript
interface VillageDefense {
  villageId: string;

  // Defensive structures
  walls?: WallDefense;
  watchtowers?: WatchtowerDefense[];
  gates?: GateDefense[];

  // Personnel
  guards: string[];                  // Assigned guards
  militia: string[];                 // Can be called up
  warriors: string[];                // Dedicated fighters

  // Readiness
  alertLevel: "peace" | "vigilant" | "mobilized" | "siege";
}

interface RaidDefense {
  village: string;
  raiders: string[];                 // Attacking group

  // Defense calculation
  defenderStrength: number;
  raiderStrength: number;
  fortificationBonus: number;

  // Possible outcomes
  outcome: "repelled" | "partial_loss" | "overrun" | "negotiated";
}
```

---

## LLM Integration

### Requirement: Combat Narration

Combat SHALL be narrated by LLM:

```typescript
interface CombatNarration {
  conflict: Conflict;
  outcome: ConflictOutcome;

  // LLM generates
  narrative: string;                 // What happened
  memorableDetails: string[];        // For agent memories
  witnessPerceptions: Map<string, string>;  // What each witness saw
}

// Example prompt
const combatNarrationPrompt = `
You are narrating a conflict in a village simulation.

Combatants:
- {attacker.name}: Combat skill {attacker.combat}, armed with {weapon}
- {defender.name}: Combat skill {defender.combat}, armed with {weapon}

Cause: {cause}
Location: {location}
Witnesses: {witnesses}

Outcome (pre-determined by skill rolls):
- Victor: {victor}
- Loser injury: {injury}
- {additionalOutcomes}

Narrate this conflict in 2-3 sentences. Include:
- How the fight started
- A key moment that determined the outcome
- How it ended

The tone should match the severity: {severity}
`;
```

### Requirement: Hunting Narration

Hunting SHALL create stories:

```typescript
const huntingNarrationPrompt = `
You are narrating a hunt in a village simulation.

Hunter: {hunter.name} (Hunting: {hunting}, Stealth: {stealth})
Target: {animal.species} ({animal.description})
Method: {method}
Terrain: {terrain}, Weather: {weather}

Outcome: {success ? "Successful kill" : "Escaped" : "Hunter injured"}
{resources ? "Yielded: " + resources : ""}
{injury ? "Hunter suffered: " + injury : ""}

Narrate this hunt in 2-3 sentences. Include:
- The tracking/stalking phase
- The critical moment
- The outcome

Keep it visceral but not gratuitously violent.
`;
```

---

## Open Questions

1. PvP consent system for player agents?
2. War between villages - full simulation or abstracted?
3. Weapon/armor crafting and tiers?
4. Martial arts / fighting styles for variety?
5. Non-lethal resolution options?
6. Bounty / justice system for murderers?

---

## Related Specs

**Core Integration:**
- `agent-system/spec.md` - Combat and hunting skills
- `agent-system/needs.md` - Injury effects on needs
- `agent-system/memory-system.md` - Combat trauma memories

**Species/Culture:**
- `agent-system/species-system.md` - Pack mind, hive combat
- `agent-system/culture-system.md` - Dominance-based cultures
- `governance-system/spec.md` - Dominance governance

**World:**
- `animal-system/spec.md` - Wild predators, hunting targets
- `construction-system/spec.md` - Defensive structures
- `world-system/spec.md` - Terrain effects on combat
