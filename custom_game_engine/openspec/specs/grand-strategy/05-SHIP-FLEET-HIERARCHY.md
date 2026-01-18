# Ship-Fleet Hierarchy - β-Space Naval Organization

**Status:** 🚧 Design Document
**Version:** 1.0.0
**Last Updated:** 2026-01-17
**Dependencies:** 02-SOUL-AGENTS.md, SpaceshipComponent, TradeAgreementSystem, Hierarchy Simulator

---

## Overview & Motivation

### The Ship Domain Hierarchy

Ships are the primary means of traversing the β-space multiverse. This spec defines the organizational hierarchy from individual crew members to galaxy-spanning navies.

**Tier Table:**

| Tier | Scale | Entity Count | Time Scale | Simulation Mode |
|------|-------|--------------|------------|-----------------|
| **Crew** | 1-100 agents | Individual | 1 tick = 1 tick | Full ECS |
| **Ship** | 1 ship | Individual | 1 tick = 1 tick | Full ECS |
| **Squadron** | 3-10 ships | ~30-1000 crew | 1 tick = 1 tick | Full/Statistical |
| **Fleet** | 3-10 squadrons | ~100-10,000 crew | 1 tick = 10 ticks | Statistical |
| **Armada** | 2+ fleets | ~1,000-100,000 crew | 1 tick = 100 ticks | Abstract |
| **Navy** | All ships | Nation-scale | 1 tick = 1000 ticks | Strategic |

**Core Principle:** Ships use **β-space emotional navigation** (quantum coherence of crew). Fleet coherence is the aggregated coherence of constituent ships.

---

## Tier 0: Crew Level (Individual Agents)

**Scale:** 1-100 agents per ship
**Simulation:** Full ECS (AgentBrainSystem, NeedsSystem, etc.)
**Status:** ✅ Existing (uses standard agent components)

### Overview

Crew members are standard agents with specialized roles aboard a ship. They contribute to ship coherence through their collective emotional state.

### Components

**IdentityComponent** (existing):
```typescript
{
  type: 'identity';
  name: string;
  species: string;
  age: number;
  // ... standard fields
}
```

**ShipCrewComponent** (NEW):
```typescript
/**
 * Marks an agent as crew member of a ship
 * Defines role and contribution to ship coherence
 */
interface ShipCrewComponent extends Component {
  type: 'ship_crew';

  /**
   * Ship this agent is assigned to
   */
  shipId: EntityId;

  /**
   * Crew role (affects contribution to ship functions)
   */
  role: CrewRole;

  /**
   * Rank/hierarchy within crew
   */
  rank: number; // 1 = captain, higher = subordinate

  /**
   * Individual emotional state contribution to ship coherence
   */
  emotionalContribution: EmotionalSignature; // From SpaceshipComponent

  /**
   * How strongly this crew member is "observing" the same reality
   * High coupling = good for coherence
   */
  quantumCouplingContribution: number; // 0-1

  /**
   * Morale affects coherence
   */
  morale: number; // 0-1, low morale = decoherence

  /**
   * Stress from β-space navigation
   */
  betaSpaceStress: number; // 0-1, high stress = decoherence

  /**
   * Time aboard this ship (affects coupling)
   */
  timeAboard: number; // Ticks

  /**
   * Permanent bond (brainship only)
   */
  permanentBond?: boolean; // For ship-brain symbiosis
}

type CrewRole =
  | 'captain'           // Soul agent, commands ship
  | 'navigator'         // Soul agent, β-space pathfinding
  | 'pilot'             // Flies ship, handles momentum
  | 'engineer'          // Maintains coherence, repairs
  | 'medic'             // Crew health, stress reduction
  | 'scientist'         // Observation precision, branch mapping
  | 'diplomat'          // Negotiations, trade agreements
  | 'marine'            // Ship-to-ship combat
  | 'passenger';        // No function, just along for ride
```

### Crew → Ship Coherence Flow

**Coherence Aggregation:**
```typescript
/**
 * Calculate ship coherence from crew emotional states
 */
function calculateShipCoherence(
  crew: ShipCrewComponent[],
  ship: SpaceshipComponent
): number {
  if (crew.length === 0) return 0;

  // Base coherence from quantum coupling
  const avgCoupling = crew.reduce((sum, c) =>
    sum + c.quantumCouplingContribution * (1 - c.betaSpaceStress), 0
  ) / crew.length;

  // Morale modifier (low morale = less coherence)
  const avgMorale = crew.reduce((sum, c) => sum + c.morale, 0) / crew.length;

  // Emotional diversity penalty (more diverse emotions = harder to sync)
  const emotionalDiversity = calculateEmotionalDiversity(
    crew.map(c => c.emotionalContribution)
  );

  // Ship type modifier (courier_ship with 2 crew = naturally high coherence)
  const shipTypeBonus = ship.navigation.quantum_coupling_strength;

  return (avgCoupling * avgMorale * (1 - emotionalDiversity * 0.3)) * shipTypeBonus;
}

/**
 * How diverse are crew emotions?
 * Low diversity (all feel same) = easier coherence
 */
function calculateEmotionalDiversity(
  signatures: EmotionalSignature[]
): number {
  // Variance of dominant emotions across crew
  // 0.0 = identical emotions, 1.0 = completely different
  // (Implementation: standard deviation of emotion vectors)
  return 0.3; // Simplified
}
```

**Key Mechanics:**
1. **Small Crews = High Coherence:** 2-person courier ship naturally reaches 0.8-0.9 coherence
2. **Large Crews = Challenge:** 50+ crew on timeline_merger struggle to reach 0.6
3. **Stress Accumulation:** β-space navigation increases stress → decoherence over time
4. **Morale Management:** Captain (soul agent) must maintain crew morale to preserve coherence

### Soul Agents as Crew

**Captains and Navigators are ALWAYS soul agents:**

**Why:**
- Cross-era continuity (same captain across centuries)
- Player attachment (name recognition)
- LLM personality (captain makes critical decisions)

**Promotion Criteria:**
```typescript
// When agent assigned as captain/navigator, promote to soul agent
if (role === 'captain' || role === 'navigator') {
  promoteSoulToAgent(agent.soulId, {
    player_interaction: false,
    narrative_importance: true, // Ship command is significant
    llm_investment: true,        // LLM drives ship decisions
    player_marked: false,
    descendant_inheritance: false,
  }, world);
}
```

**Example:**
- Captain Kara (soul agent) commands *SS Horizon* (threshold_ship)
- Navigator Zara (soul agent) handles β-space jumps
- 8 regular crew members (not soul agents)
- Kara and Zara persist even when ship is destroyed or fleet is zoomed out

---

## Tier 1: Ship Level (Individual Vessels)

**Scale:** 1 ship, 1-100+ crew
**Simulation:** Full ECS (existing SpaceshipComponent)
**Status:** ✅ Complete (SpaceshipComponent.ts)

### Overview

Ships are the atomic unit of β-space navigation. Each ship uses the existing **SpaceshipComponent** with 9 ship types.

### Ship Types (from SpaceshipComponent.ts)

**Stage 1 (Pre-Temporal):**
- **Worldship:** 1,000,000 mass, cannot navigate β-space, generation ship

**Stage 2 (Basic β-Navigation):**
- **Courier Ship:** 10 mass, 2 crew, fastest (200 max emotional distance), easiest coherence (0.6 threshold)
- **Threshold Ship:** 1,000 mass, 10-50 crew, fragile β-navigation (0.7 threshold)
- **Brainship:** 500 mass, ship-brain symbiosis, perfect coherence (1.0 coupling, 0.5 threshold)

**Stage 3 (Advanced β-Navigation):**
- **Story Ship:** 2,000 mass, narrative-seeking, can target specific branches (0.7 observation precision)
- **Gleisner Vessel:** 500 mass, digital consciousness, can edit self for coherence
- **Svetz Retrieval:** 800 mass, temporal archaeology, retrieve from extinct timelines
- **Probability Scout:** 50 mass, solo explorer, maps unobserved branches (0.9 observation precision)
- **Timeline Merger:** 5,000 mass, collapse compatible branches (50+ crew, 0.75 threshold)

### Ship Components (Existing)

**SpaceshipComponent** (existing, no changes needed):
```typescript
interface SpaceshipComponent {
  type: 'spaceship';
  ship_type: SpaceshipType;
  name: string;

  hull: {
    integrity: number;  // 0-1
    mass: number;
  };

  narrative: {
    accumulated_weight: number;
    significant_events: EmotionalEvent[];
    personality: ShipPersonality;
  };

  crew: {
    member_ids: string[];  // Entity IDs
    collective_emotional_state: EmotionalSignature;
    coherence: number;  // 0-1, calculated from crew
  };

  navigation: {
    can_navigate_beta_space: boolean;
    max_emotional_distance: number;

    // Quantum mechanics
    quantum_coupling_strength: number;  // 0-1
    coherence_threshold: number;        // Min to navigate
    decoherence_rate: number;           // Degradation per tick
    observation_precision: number;      // Measure before collapse

    // Timeline contamination
    contamination_cargo: Array<{
      entity_id: string;
      source_timeline: string;
      contamination_level: number;
    }>;

    // History
    visited_branches: string[];
    failed_navigations: number;
  };

  components: {
    the_heart_id?: string;           // Heart Chamber (coherence focus)
    emotion_theater_ids: string[];   // Emotion theaters (crew bonding)
    memory_hall_ids: string[];       // Memory halls (shared experiences)
    meditation_chamber_ids: string[];// Meditation (stress reduction)
    vr_system_ids: string[];         // VR (morale, training)
  };
}
```

### Ship Combat (Individual Scale)

**Status:** ⏳ Not Yet Implemented

**Combat Types:**
1. **Boarding:** Marines cross via airlocks/teleport
2. **Weapons Fire:** Energy weapons, missiles
3. **Coherence Disruption:** Sabotage enemy coherence (prevent β-jumps)
4. **Narrative Attacks:** Story ships weaponize narrative weight

**Combat Resolution:**
```typescript
interface ShipCombatEncounter {
  attackerId: EntityId;
  defenderId: EntityId;

  // Combat phases
  phase: 'range' | 'close' | 'boarding' | 'resolved';

  // Damage state
  attackerHullIntegrity: number; // 0-1
  defenderHullIntegrity: number;

  attackerCoherence: number; // Combat stress → decoherence
  defenderCoherence: number;

  // Boarding parties (if phase = 'boarding')
  boardingMarines: number; // Count

  // Outcome
  victor?: EntityId;
  destroyed?: EntityId;  // Ship destroyed
  captured?: EntityId;   // Ship captured (victor gains ship)
}
```

**Integration with Trade:**
- **Piracy:** Ships can attack trade ships (cross-universe piracy!)
- **Escorts:** Trade agreements include escort squadrons
- **Blockades:** Fleets prevent trade passage

---

## Tier 2: Squadron Level (3-10 Ships)

**Scale:** 3-10 ships, ~30-1,000 crew total
**Simulation:** Full ECS if on-screen, Statistical if zoomed out
**Time Scale:** 1:1 (same as ship)
**Status:** 🆕 New Tier

### Overview

Squadrons are tactical formations of ships under unified command. They enable coordinated β-space navigation and combat maneuvers.

### Data Structure

**SquadronTier** (NEW):
```typescript
/**
 * Squadron - tactical ship formation
 * 3-10 ships under squadron commander (soul agent)
 */
interface SquadronTier {
  id: string;
  name: string; // "Alpha Squadron", "Death's Wing"

  /**
   * Squadron composition
   */
  ships: {
    shipIds: EntityId[];  // 3-10 ships
    totalCrew: number;    // Sum of all crew
    shipTypes: Record<SpaceshipType, number>; // e.g., {courier_ship: 2, threshold_ship: 1}
  };

  /**
   * Squadron commander (soul agent, captain of flagship)
   */
  commanderId: EntityId; // Soul agent
  flagshipId: EntityId;  // Which ship is flagship

  /**
   * Squadron coherence (average of ship coherences)
   */
  coherence: {
    average: number;      // Mean coherence across all ships
    min: number;          // Weakest ship
    max: number;          // Strongest ship
    variance: number;     // Coherence spread (high = formation unstable)
  };

  /**
   * Formation type (affects combat, navigation)
   */
  formation: SquadronFormation;

  /**
   * Squadron mission
   */
  mission: {
    type: SquadronMissionType;
    targetLocation?: Vector3D;
    targetEntityId?: EntityId;
    escortedTradeAgreementId?: string; // If escorting trade
    status: 'planning' | 'en_route' | 'engaged' | 'completed';
  };

  /**
   * Combat readiness
   */
  combat: {
    totalFirepower: number;    // Sum of ship weapons
    totalMarines: number;      // Sum of marines across ships
    avgHullIntegrity: number;  // Health of squadron
    combatExperience: number;  // 0-1, improves coordination
  };

  /**
   * Supply state
   */
  logistics: {
    fuelReserves: number;      // β-navigation fuel (emotional energy)
    repairParts: number;
    foodSupply: number;        // Crew sustenance
    estimatedRange: number;    // How far squadron can go
  };
}

type SquadronFormation =
  | 'line_ahead'      // Ships in line (good for broadside)
  | 'line_abreast'    // Ships side-by-side (wide front)
  | 'wedge'           // V formation (focus fire)
  | 'sphere'          // Defensive ball (protect flagship)
  | 'echelon'         // Diagonal steps (flanking)
  | 'scattered';      // No formation (independent)

type SquadronMissionType =
  | 'patrol'          // Monitor area
  | 'escort'          // Protect trade ship
  | 'reconnaissance'  // Scout β-space branches
  | 'assault'         // Attack target
  | 'blockade'        // Prevent passage
  | 'rescue'          // Extract stranded ship
  | 'exploration';    // Map unknown regions
```

### Squadron Coherence Mechanics

**Coherence Averaging:**
```typescript
/**
 * Calculate squadron coherence from constituent ships
 */
function calculateSquadronCoherence(
  ships: SpaceshipComponent[]
): SquadronCoherence {
  const coherences = ships.map(s => s.crew.coherence);

  return {
    average: coherences.reduce((sum, c) => sum + c, 0) / coherences.length,
    min: Math.min(...coherences),
    max: Math.max(...coherences),
    variance: standardDeviation(coherences),
  };
}
```

**Squadron β-Navigation:**
- **All ships must jump together** (formation integrity)
- **Limited by weakest ship:** Squadron coherence = MIN(ship coherences)
- **Formation bonus:** Tight formations (sphere) improve coherence by +0.1
- **Scattered penalty:** Scattered formation no bonus

**Example:**
```
Squadron "Alpha Wing":
- Ship A (courier): coherence 0.85
- Ship B (threshold): coherence 0.72
- Ship C (threshold): coherence 0.68
- Ship D (courier): coherence 0.90

Formation: wedge (+0.05 bonus)

Squadron coherence = MIN(0.85, 0.72, 0.68, 0.90) + 0.05 = 0.73
Can navigate β-space if threshold ≤ 0.73
```

### Squadron Combat

**Tactics:**
- **Focus Fire:** All ships target one enemy (wedge formation)
- **Flanking:** Echelon formation attacks from side
- **Defensive Screen:** Sphere formation protects flagship

**Combat Resolution:**
```typescript
interface SquadronCombat {
  squadron1Id: string;
  squadron2Id: string;

  // Formation advantages
  formation1Bonus: number; // e.g., wedge vs line = +0.2 attack
  formation2Bonus: number;

  // Combined firepower
  totalFirepower1: number;
  totalFirepower2: number;

  // Casualties
  shipsDestroyed1: EntityId[];
  shipsDestroyed2: EntityId[];

  victor?: string; // Squadron ID
}
```

---

## Tier 3: Fleet Level (3-10 Squadrons)

**Scale:** 3-10 squadrons, ~100-10,000 crew total
**Simulation:** Statistical (no individual ship simulation unless zoomed in)
**Time Scale:** 1:10 (1 tick in world = 10 ticks in fleet simulation)
**Status:** 🆕 New Tier

### Overview

Fleets are strategic formations of squadrons under an admiral (soul agent). They conduct operations across star systems and β-space branches.

### Data Structure

**FleetTier** (NEW):
```typescript
/**
 * Fleet - strategic squadron group
 * 3-10 squadrons under fleet admiral (soul agent)
 */
interface FleetTier {
  id: string;
  name: string; // "5th Fleet", "Emperor's Wrath"

  /**
   * Fleet composition
   */
  squadrons: {
    squadronIds: string[];  // 3-10 squadrons
    totalShips: number;     // Sum of all ships
    totalCrew: number;      // Sum of all crew
    shipTypeBreakdown: Record<SpaceshipType, number>;
  };

  /**
   * Fleet admiral (soul agent, commands from flagship)
   */
  admiralId: EntityId; // Soul agent
  flagshipSquadronId: string;
  flagshipShipId: EntityId;

  /**
   * Fleet coherence (aggregated from squadrons)
   */
  coherence: {
    average: number;      // Mean squadron coherence
    distribution: {       // Histogram of squadron coherences
      low: number;        // Squadrons < 0.5 coherence
      medium: number;     // 0.5-0.7
      high: number;       // > 0.7
    };
    fleetCoherenceRating: 'poor' | 'adequate' | 'excellent';
  };

  /**
   * Fleet operational status
   */
  status: {
    readiness: number;    // 0-1, can fleet deploy?
    inCombat: boolean;
    currentSystem: string; // Star system ID
    destination?: string;  // System ID
    eta?: number;          // Ticks to arrival
  };

  /**
   * Fleet mission
   */
  mission: {
    type: FleetMissionType;
    objective: string;
    priority: 'low' | 'medium' | 'high' | 'critical';
    startTick: Tick;
    expectedDuration: number; // Ticks
    progress: number;         // 0-1
  };

  /**
   * Combat capability (statistical)
   */
  combat: {
    offensiveRating: number;  // 0-100
    defensiveRating: number;
    marineStrength: number;   // Total marines
    combatHistory: {
      battlesWon: number;
      battlesLost: number;
      shipsLost: number;
    };
  };

  /**
   * Supply and logistics
   */
  logistics: {
    supplyDepotSystemId?: string; // Where fleet resupplies
    fuelReserves: number;          // Days of β-navigation fuel
    repairCapability: number;      // Can repair X% hull per day
    rangeFromSupply: number;       // Max distance from depot
  };
}

type FleetMissionType =
  | 'defense'         // Defend system
  | 'invasion'        // Conquer system
  | 'patrol'          // Multi-system patrol
  | 'trade_escort'    // Protect trade route
  | 'pirate_hunt'     // Hunt raiders
  | 'exploration'     // Map β-space
  | 'show_of_force'   // Intimidation
  | 'relief'          // Aid distressed system
  | 'blockade';       // Starve system
```

### Fleet Coherence Propagation

**Coherence at Fleet Scale:**
```typescript
/**
 * Fleet coherence = average of squadron coherences
 * BUT: Variance matters more at this scale
 */
function calculateFleetCoherence(
  squadrons: SquadronTier[]
): FleetCoherence {
  const avgCoherences = squadrons.map(s => s.coherence.average);
  const mean = avgCoherences.reduce((sum, c) => sum + c, 0) / avgCoherences.length;

  // Categorize squadrons
  const low = avgCoherences.filter(c => c < 0.5).length;
  const medium = avgCoherences.filter(c => c >= 0.5 && c < 0.7).length;
  const high = avgCoherences.filter(c => c >= 0.7).length;

  // Fleet coherence rating
  let rating: 'poor' | 'adequate' | 'excellent';
  if (mean < 0.5 || low > squadrons.length * 0.5) {
    rating = 'poor';  // Too many low-coherence squadrons
  } else if (mean >= 0.7 && high > squadrons.length * 0.7) {
    rating = 'excellent';
  } else {
    rating = 'adequate';
  }

  return {
    average: mean,
    distribution: { low, medium, high },
    fleetCoherenceRating: rating,
  };
}
```

**Fleet β-Navigation:**
- **Jump as unit:** All squadrons jump together (formation integrity)
- **Coherence minimum:** Fleet can jump if rating ≥ 'adequate'
- **Straggler risk:** 'poor' rating = some squadrons fail to jump (scattered fleet)

**Example:**
```
Fleet "5th Fleet" has 5 squadrons:
- Squadron A: coherence 0.75 (high)
- Squadron B: coherence 0.68 (medium)
- Squadron C: coherence 0.72 (high)
- Squadron D: coherence 0.45 (low)
- Squadron E: coherence 0.81 (high)

Fleet coherence:
  - Average: 0.682
  - Distribution: 1 low, 1 medium, 3 high
  - Rating: adequate (because 1 squadron is low, drags down fleet)

Fleet can navigate β-space, but Squadron D may fail (20% chance straggler)
```

### Fleet Combat (Lanchester's Laws)

**Lanchester's Square Law:**

For two fleets engaging:
```
dN/dt = -β * M
dM/dt = -α * N

Where:
  N = Fleet 1 ship count
  M = Fleet 2 ship count
  α = Fleet 1 firepower per ship
  β = Fleet 2 firepower per ship
```

**Resolution:**
```typescript
/**
 * Resolve fleet battle using Lanchester's Laws
 */
function resolveFleetBattle(
  fleet1: FleetTier,
  fleet2: FleetTier,
  duration: number // Ticks
): FleetBattleResult {
  let N = fleet1.squadrons.totalShips;
  let M = fleet2.squadrons.totalShips;

  const alpha = fleet1.combat.offensiveRating / fleet1.squadrons.totalShips;
  const beta = fleet2.combat.offensiveRating / fleet2.squadrons.totalShips;

  // Simulate battle over duration
  for (let tick = 0; tick < duration; tick++) {
    const dN = -beta * M;
    const dM = -alpha * N;

    N += dN;
    M += dM;

    // Stop if one side destroyed
    if (N <= 0 || M <= 0) break;
  }

  return {
    fleet1Remaining: Math.max(0, N),
    fleet2Remaining: Math.max(0, M),
    victor: N > M ? fleet1.id : fleet2.id,
    shipsLost1: fleet1.squadrons.totalShips - N,
    shipsLost2: fleet2.squadrons.totalShips - M,
  };
}
```

**Example:**
```
Fleet A: 30 ships, offensive rating 60 (α = 2 per ship)
Fleet B: 20 ships, offensive rating 50 (β = 2.5 per ship)

After 10 ticks:
  dN/dt = -2.5 * 20 = -50 ships/tick → N = 30 - 50 = -20 (destroyed)
  dM/dt = -2.0 * 30 = -60 ships/tick → M = 20 - 60 = -40 (destroyed)

Both fleets destroyed (mutual annihilation)
```

**Coherence Impact on Combat:**
- **High coherence fleet:** +20% offensive rating (coordinated attacks)
- **Poor coherence fleet:** -20% offensive rating (disorganized)

---

## Tier 4: Armada Level (2+ Fleets)

**Scale:** 2+ fleets, ~1,000-100,000 crew total
**Simulation:** Abstract (statistical outcomes, no individual ships)
**Time Scale:** 1:100 (1 tick in world = 100 ticks in armada simulation)
**Status:** 🆕 New Tier

### Overview

Armadas are campaign-scale operations spanning multiple star systems and β-space branches. Ships are abstracted to statistics.

### Data Structure

**ArmadaTier** (NEW):
```typescript
/**
 * Armada - multi-fleet campaign force
 * 2+ fleets under armada commander (soul agent)
 */
interface ArmadaTier {
  id: string;
  name: string; // "Grand Armada", "Liberation Fleet"

  /**
   * Armada composition
   */
  fleets: {
    fleetIds: string[];  // 2+ fleets
    totalSquadrons: number;
    totalShips: number;
    totalCrew: number;
  };

  /**
   * Armada commander (soul agent, supreme naval authority)
   */
  commanderId: EntityId; // Soul agent (Grand Admiral)
  flagshipFleetId: string;

  /**
   * Campaign objective
   */
  campaign: {
    type: ArmadaCampaignType;
    targetSystems: string[];  // Systems to conquer/defend
    duration: number;         // Expected campaign length (ticks)
    progress: number;         // 0-1
    systemsConquered: string[];
    systemsLost: string[];
  };

  /**
   * Strategic strength (abstracted)
   */
  strength: {
    shipCount: number;        // Total ships across all fleets
    effectiveCombatPower: number; // Adjusted for coherence, morale
    territoryControlled: number;  // Systems under armada control
    supplyLines: {
      secure: string[];       // Systems with safe supply
      contested: string[];    // Systems under threat
      cut: string[];          // Systems isolated
    };
  };

  /**
   * Armada morale (aggregate of crew morale)
   */
  morale: {
    average: number;          // 0-1
    trend: 'rising' | 'stable' | 'falling';
    factors: {
      recentVictories: number;  // +morale
      recentDefeats: number;    // -morale
      supplySituation: 'good' | 'adequate' | 'poor'; // affects morale
      timeSinceLeave: number;   // Tick since last shore leave
    };
  };

  /**
   * Losses and reinforcements
   */
  attrition: {
    shipsLostTotal: number;
    crewLostTotal: number;
    replacementRate: number;  // Ships/tick arriving as reinforcements
    canSustainOperations: boolean; // Losses < replacements?
  };
}

type ArmadaCampaignType =
  | 'conquest'        // Conquer territory
  | 'defense'         // Defend territory
  | 'liberation'      // Free occupied systems
  | 'punitive'        // Punish enemy (raiding)
  | 'exploration';    // Explore β-space frontier
```

### Armada Combat (Strategic Outcomes)

**No individual ship simulation.** Battles resolved as statistical outcomes:

```typescript
/**
 * Resolve armada campaign turn
 */
function resolveArmadaCampaignTurn(
  armada: ArmadaTier,
  enemyArmada: ArmadaTier,
  systems: string[] // Systems being contested
): CampaignTurnResult {
  // Each system has a battle
  const results = systems.map(systemId => {
    const armadaStrength = armada.strength.effectiveCombatPower;
    const enemyStrength = enemyArmada.strength.effectiveCombatPower;

    // Morale modifier
    const armadaModifier = armada.morale.average;
    const enemyModifier = enemyArmada.morale.average;

    const armadaFinalStrength = armadaStrength * armadaModifier;
    const enemyFinalStrength = enemyStrength * enemyModifier;

    // Simple strength comparison with randomness
    const roll = Math.random();
    const armadaWinChance = armadaFinalStrength / (armadaFinalStrength + enemyFinalStrength);

    const victor = roll < armadaWinChance ? armada.id : enemyArmada.id;

    // Losses proportional to enemy strength
    const armadaLosses = Math.floor(enemyFinalStrength * 0.1 * roll);
    const enemyLosses = Math.floor(armadaFinalStrength * 0.1 * (1 - roll));

    return {
      systemId,
      victor,
      armadaShipsLost: armadaLosses,
      enemyShipsLost: enemyLosses,
    };
  });

  // Update armada state
  const systemsConquered = results.filter(r => r.victor === armada.id).map(r => r.systemId);
  const systemsLost = results.filter(r => r.victor === enemyArmada.id).map(r => r.systemId);

  armada.campaign.systemsConquered.push(...systemsConquered);
  armada.campaign.systemsLost.push(...systemsLost);

  // Morale adjustment
  if (systemsConquered.length > systemsLost.length) {
    armada.morale.trend = 'rising';
    armada.morale.factors.recentVictories++;
  } else {
    armada.morale.trend = 'falling';
    armada.morale.factors.recentDefeats++;
  }

  return {
    systemsConquered,
    systemsLost,
    totalLosses: results.reduce((sum, r) => sum + r.armadaShipsLost, 0),
  };
}
```

---

## Tier 5: Navy Level (Political Entity)

**Scale:** Nation-scale, all military spacefaring assets
**Simulation:** Strategic (budget, production, deployment)
**Time Scale:** 1:1000 (1 tick in world = 1000 ticks in navy simulation)
**Status:** 🆕 New Tier

### Overview

Navies are the total military spacefaring capability of a civilization/faction. They manage budgets, shipyards, doctrine, and deployment.

### Data Structure

**NavyTier** (NEW):
```typescript
/**
 * Navy - all military ships of a faction
 * Strategic economic/political force
 */
interface NavyTier {
  id: string;
  name: string; // "Imperial Navy", "Free Worlds Fleet"

  /**
   * Controlling faction
   */
  factionId: EntityId; // Civilization, empire, etc.

  /**
   * Navy composition
   */
  assets: {
    totalArmadas: number;
    totalFleets: number;
    totalSquadrons: number;
    totalShips: number;
    totalCrew: number;

    // Ship type distribution
    shipTypeBreakdown: Record<SpaceshipType, number>;

    // Deployment
    activeDeployments: number;   // Ships deployed
    inReserve: number;            // Ships docked
    underConstruction: number;    // Ships being built
  };

  /**
   * Navy leadership (soul agent, supreme commander)
   */
  grandAdmiralId: EntityId; // Soul agent

  /**
   * Economic foundation
   */
  economy: {
    annualBudget: number;     // Currency units
    budgetSpent: number;      // This year
    shipyardCapacity: number; // Ships/year production
    maintenanceCost: number;  // Per ship per year
    personnelCost: number;    // Crew salaries

    // Budget allocation
    budgetAllocation: {
      newConstruction: number;  // 0-1 (percentage)
      maintenance: number;
      personnel: number;
      R&D: number;
      reserves: number;
    };
  };

  /**
   * Doctrine and strategy
   */
  doctrine: {
    strategicPosture: 'defensive' | 'offensive' | 'balanced';
    preferredShipTypes: SpaceshipType[]; // Navy specialization
    tacticalDoctrine: string; // e.g., "carrier-focused", "battleship supremacy"

    // Officer training
    officerAcademyQuality: number; // 0-1, affects soul agent quality
    NCOTraining: number;           // 0-1, affects crew quality
  };

  /**
   * Political influence
   */
  politics: {
    militaryBudgetShare: number; // % of faction GDP
    politicalPower: number;      // Navy's influence on faction
    publicSupport: number;       // 0-1, civilian opinion
    veteranSoulAgents: number;   // Retired admirals (political capital)
  };

  /**
   * Technology and R&D
   */
  technology: {
    currentTechLevel: number;    // 1-10 (Stage 1-3 mapped here)
    researchProjects: {
      shipTypeId: SpaceshipType;
      progress: number;          // 0-1
      cost: number;
    }[];

    // β-space research
    betaSpaceResearch: {
      coherenceThresholdReduction: number; // Research to lower threshold
      decoherenceRateMitigation: number;   // Research to slow decay
      observationPrecisionImprovement: number;
    };
  };
}
```

### Navy Operations

**Budget Cycle:**
```typescript
/**
 * Process navy budget for a year
 */
function processNavyBudget(navy: NavyTier, year: number): void {
  const budget = navy.economy.annualBudget;
  const allocation = navy.economy.budgetAllocation;

  // New construction
  const constructionBudget = budget * allocation.newConstruction;
  const shipsBuilt = Math.floor(constructionBudget / getShipCost(navy.doctrine.preferredShipTypes[0]));
  navy.assets.underConstruction += shipsBuilt;

  // Maintenance
  const maintenanceBudget = budget * allocation.maintenance;
  const shipsCanMaintain = Math.floor(maintenanceBudget / navy.economy.maintenanceCost);

  if (shipsCanMaintain < navy.assets.totalShips) {
    // Under-funded! Ships degrade
    const degradedShips = navy.assets.totalShips - shipsCanMaintain;
    console.warn(`Navy ${navy.name} cannot maintain ${degradedShips} ships - hull integrity degrading`);
  }

  // Personnel
  const personnelBudget = budget * allocation.personnel;
  const crewCanPay = Math.floor(personnelBudget / (navy.economy.personnelCost / navy.assets.totalCrew));

  if (crewCanPay < navy.assets.totalCrew) {
    // Morale crisis (unpaid sailors)
    const unpaidCrew = navy.assets.totalCrew - crewCanPay;
    console.warn(`Navy ${navy.name} cannot pay ${unpaidCrew} crew - morale plummeting`);
    // Trigger mutiny events
  }

  // R&D
  const rdBudget = budget * allocation.R&D;
  navy.technology.researchProjects.forEach(project => {
    project.progress += (rdBudget / project.cost) * 0.1; // 10% progress per full funding
    if (project.progress >= 1.0) {
      unlockShipType(navy, project.shipTypeId);
    }
  });
}
```

### Navy as Political Force

**Navies exert political pressure:**
- **Large navy = political power:** Military controls faction policy
- **Veteran soul agents:** Retired admirals become politicians
- **Public support:** Victories → support, defeats → calls for cuts
- **Budget battles:** Navy competes with civilian programs

**Example:**
```
Faction "Free Worlds Coalition" has annual GDP of 1,000,000 credits.

Navy gets 15% budget = 150,000 credits.

Allocation:
- New construction: 40% = 60,000 (build 6 threshold_ships)
- Maintenance: 30% = 45,000 (maintain 450 ships @ 100 credits each)
- Personnel: 20% = 30,000 (pay 3,000 crew @ 10 credits each)
- R&D: 10% = 15,000 (research gleisner_vessel, 30% progress this year)

Navy has 450 ships, 3,000 crew, building 6 new ships.
Political power: HIGH (15% of GDP is significant)
Public support: 0.7 (people support strong navy for defense)
```

---

## Combat at Each Scale

### Summary Table

| Scale | Combat Type | Resolution | Simulation Cost |
|-------|-------------|------------|-----------------|
| **Ship** | Ship-to-ship duel | Detailed (boarding, weapons fire, coherence) | High (full ECS) |
| **Squadron** | Tactical engagement | Formation-based, focus fire | Medium (simplified ships) |
| **Fleet** | Strategic battle | Lanchester's Laws (dN/dt = -βM) | Low (statistical) |
| **Armada** | Campaign turn | System control, strength comparison | Very low (dice rolls) |
| **Navy** | Grand strategy | Budget, production, deployment | Minimal (spreadsheet) |

### Ship-to-Ship Combat (Detailed)

**Status:** ⏳ Not Implemented

**Phases:**
1. **Detection:** Ships detect each other (observation_precision)
2. **Range:** Long-range weapons fire, maneuvers
3. **Close:** Short-range weapons, coherence attacks
4. **Boarding:** Marines cross airlocks, capture ship
5. **Resolution:** Surrender, destruction, or capture

**Example:**
```
Ship A (threshold_ship, 50 crew, 10 marines) vs Ship B (courier_ship, 2 crew)

Phase 1: Detection
  - Ship A observation precision: 0.3
  - Ship B observation precision: 0.3
  - Both detect each other

Phase 2: Range
  - Ship A fires energy weapons (hull integrity: B 1.0 → 0.8)
  - Ship B dodges (small, fast) → no damage to A

Phase 3: Close
  - Ship A coherence attack (disrupt B's β-navigation)
  - Ship B coherence: 0.85 → 0.65 (now vulnerable)
  - Ship B cannot β-jump to escape!

Phase 4: Boarding
  - Ship A launches marines (10 marines board courier)
  - Ship B crew (2) cannot resist
  - Ship B captured

Result: Ship A captures Ship B (prize ship)
```

### Squadron Combat (Formation-Based)

**Formation Advantages:**

| Formation | Best Against | Weakness | Bonus |
|-----------|--------------|----------|-------|
| Line Ahead | Scattered | Flanking | +10% firepower |
| Line Abreast | Line Ahead | Wedge | +10% defense |
| Wedge | Line Abreast | Sphere | +20% focus fire |
| Sphere | Wedge | Line Ahead | +20% flagship defense |
| Echelon | Sphere | Wedge | +15% flanking |

**Example:**
```
Squadron A (wedge, 5 ships) vs Squadron B (line abreast, 4 ships)

Wedge beats line abreast → Squadron A gets +20% firepower

Squadron A firepower: 50 * 1.2 = 60
Squadron B firepower: 40

Losses (per Lanchester):
  - Squadron A loses: 40 * 0.1 = 4 ships worth of damage
  - Squadron B loses: 60 * 0.1 = 6 ships worth of damage

Squadron A loses 0.8 ships (rounds to 1 ship destroyed)
Squadron B loses 1.5 ships (rounds to 2 ships destroyed)

Squadron A wins, but at cost.
```

### Fleet Combat (Lanchester's Laws)

**See Tier 3 section** for full mathematical treatment.

**Key Insight:** Concentration of force matters!
- 2 fleets of 20 ships each vs 1 fleet of 40 ships:
  - 2 fleets fight separately, each loses
  - 1 fleet fights at full strength, wins decisively

**Example:**
```
Fleet A: 100 ships, α = 1.5 firepower/ship
Fleet B: 80 ships, β = 2.0 firepower/ship

dN/dt = -β * M = -2.0 * 80 = -160 ships/tick
dM/dt = -α * N = -1.5 * 100 = -150 ships/tick

After 1 tick:
  N = 100 - 160 = -60 (Fleet A destroyed)
  M = 80 - 150 = -70 (Fleet B destroyed)

Mutual annihilation (pyrrhic victory)
```

---

## β-Space at Fleet Scale

### Fleet-Wide Heart Chamber Synchronization

**Problem:** How do 1,000+ crew across 30 ships achieve coherence for fleet-wide β-jump?

**Solution:** Heart Chamber Network

#### Heart Chamber Network

**The Heart (from SpaceshipComponent):**
```typescript
// Existing ship component
components: {
  the_heart_id?: string; // Heart Chamber entity
}
```

**Fleet-Wide Network:**
```typescript
/**
 * Fleet-level coherence amplification
 * Uses flagship's Heart as focal point for entire fleet
 */
interface HeartChamberNetwork {
  flagshipHeartId: EntityId; // Primary Heart (flagship)
  connectedHeartIds: EntityId[]; // Hearts of all fleet ships

  /**
   * Coherence synchronization
   */
  synchronization: {
    syncStrength: number;      // 0-1, how well Hearts sync
    syncFrequency: number;     // Hz, how fast sync updates
    latency: number;           // Delay in sync (affects jump precision)
  };

  /**
   * Collective emotional state
   */
  collectiveState: EmotionalSignature; // Fleet-wide aggregate

  /**
   * β-space resonance
   */
  resonance: {
    resonanceFrequency: number; // All ships vibrate at same frequency
    harmonicAlignment: number;  // 0-1, are ships in harmony?
  };
}
```

**Synchronization Process:**
```typescript
/**
 * Synchronize fleet for β-space jump
 */
function synchronizeFleetHearts(
  fleet: FleetTier,
  network: HeartChamberNetwork,
  duration: number // Ticks to sync
): { success: boolean; coherence: number } {
  // Get all ship coherences
  const squadrons = getSquadrons(fleet);
  const ships = squadrons.flatMap(s => getShips(s));
  const shipCoherences = ships.map(s => s.crew.coherence);

  // Flagship Heart broadcasts emotional target
  const flagshipHeart = getEntity(network.flagshipHeartId);
  const targetEmotion = flagshipHeart.targetEmotionalState;

  // Each ship aligns to target
  const alignmentResults = ships.map(ship => {
    const heart = getEntity(ship.components.the_heart_id);
    const alignmentSuccess = alignHeartToTarget(heart, targetEmotion, duration);
    return alignmentSuccess;
  });

  // Success if > 80% of ships align
  const alignedShips = alignmentResults.filter(a => a).length;
  const alignmentRate = alignedShips / ships.length;

  if (alignmentRate >= 0.8) {
    // Fleet synchronized, calculate coherence
    const fleetCoherence = calculateFleetCoherence(
      shipCoherences,
      network.synchronization.syncStrength
    );

    return { success: true, coherence: fleetCoherence };
  } else {
    // Failed to sync, fleet cannot jump
    return { success: false, coherence: 0 };
  }
}

/**
 * Align individual ship Heart to fleet target
 */
function alignHeartToTarget(
  heart: Entity,
  targetEmotion: EmotionalSignature,
  duration: number
): boolean {
  // Crew must meditate/focus in Heart Chamber
  const crew = getShipCrew(heart.shipId);
  const meditators = crew.filter(c =>
    c.currentLocation === heart.id &&
    c.behavior === 'meditate'
  );

  // Success chance = (meditators / total_crew) * duration
  const meditationRate = meditators.length / crew.length;
  const successChance = meditationRate * (duration / 100);

  return Math.random() < successChance;
}
```

**Fleet β-Jump:**
```
1. Admiral orders fleet jump
   ↓
2. Flagship Heart broadcasts target emotional state (e.g., "calm determination")
   ↓
3. All ships spend 100 ticks aligning (crew meditates in Heart Chambers)
   ↓
4. 80%+ ships align → Fleet coherence calculated
   ↓
5. If coherence ≥ threshold, fleet jumps together
   ↓
6. If coherence < threshold, some ships fail (stragglers)
```

**Stragglers:**
- Ships that failed alignment are "left behind" in previous β-branch
- Must jump independently later (risky, alone)
- Straggler ships often lost (decoherence, contamination)

**Example:**
```
Fleet "5th Fleet" preparing for β-jump:
- 30 ships total
- Flagship: *Emperor's Will* (threshold_ship, Heart chamber quality: high)
- Duration: 200 ticks (10 seconds) to synchronize

Synchronization results:
- 25 ships align successfully (83%)
- 5 ships fail alignment (crew stress too high)

Fleet coherence: 0.71 (adequate)
Threshold: 0.7

Fleet jumps successfully!
- 25 ships jump to β-branch "Tau-7"
- 5 stragglers left in β-branch "Tau-6"

Stragglers must:
  - Reduce stress (rest crew)
  - Attempt solo jump (risky!)
  - OR wait for rescue squadron
```

---

## Navigation Challenges for Large Formations

### The Coherence-Scale Tradeoff

**Fundamental Problem:**
- Small ships (courier, 2 crew) easily reach 0.8-0.9 coherence
- Large fleets (30 ships, 1000 crew) struggle to reach 0.6 coherence

**Why:**
1. **Emotional Diversity:** More crew = more varied emotions
2. **Communication Lag:** Orders take time to propagate across fleet
3. **Individual Variation:** Some crew always have high stress/low morale
4. **Contamination Risk:** Ships carrying timeline contamination disrupt others

### Coherence Degradation Over Time

**β-Space Stress Accumulation:**
```typescript
/**
 * Crew accumulate stress during β-navigation
 * Stress → decoherence
 */
function accumulateBetaSpaceStress(
  crew: ShipCrewComponent,
  navigationDuration: number // Ticks in β-space
): void {
  const stressRate = 0.001; // Per tick
  crew.betaSpaceStress += stressRate * navigationDuration;

  // Stress affects coherence contribution
  crew.quantumCouplingContribution *= (1 - crew.betaSpaceStress);

  // High stress → morale drop
  if (crew.betaSpaceStress > 0.5) {
    crew.morale -= 0.01 * navigationDuration;
  }
}
```

**Fleet-Level Stress Management:**
- **Shore Leave:** Reset crew stress (docked at station)
- **Rotation:** Rotate crews between ships (fresh crew on flagship)
- **Medical:** Ship medics reduce stress
- **Meditation:** Meditation chambers reduce stress

**Example:**
```
Fleet "5th Fleet" has been navigating β-space for 5,000 ticks (no shore leave).

Average crew stress: 0.6 (high)
Average morale: 0.5 (low)

Fleet coherence degradation:
- Original coherence: 0.75 (excellent)
- After stress accumulation: 0.52 (poor)

Fleet can no longer navigate β-space reliably!
Admiral orders:
  - Return to base for shore leave
  - OR find habitable system for R&R (rest & relaxation)
  - OR risk jump with poor coherence (30% straggler rate)
```

---

## Integration with Trade System

### Cross-Universe Trade Escorts

**From TradeAgreementSystem:**
- Trade agreements can specify escort requirements
- Navy provides escorts for valuable trade routes

**Example:**
```typescript
interface TradeAgreement {
  // ... existing fields

  /**
   * Military escort requirement
   */
  escort?: {
    required: boolean;
    minimumFleetSize: number; // Ships
    escortProvider: EntityId;  // Navy ID
    escortCost: number;        // Payment to navy
  };
}
```

**Escort Mechanics:**
```typescript
/**
 * Assign squadron to escort trade shipment
 */
function assignEscort(
  tradeAgreementId: string,
  navy: NavyTier,
  squadronId: string
): void {
  const squadron = getSquadron(squadronId);

  // Update squadron mission
  squadron.mission = {
    type: 'escort',
    escortedTradeAgreementId: tradeAgreementId,
    status: 'en_route',
  };

  // Deduct from navy available ships
  navy.assets.activeDeployments += squadron.ships.shipIds.length;
  navy.assets.inReserve -= squadron.ships.shipIds.length;
}
```

### Piracy and Naval Response

**Pirates attack trade routes:**
- Unescorted trades vulnerable
- Navies deploy pirate-hunting fleets
- Trade disruption → economic damage

**Example:**
```
Trade Route: Universe A → Universe B
  - Value: 10,000 credits/month
  - Threat Level: High (pirate-infested β-branches)

Trade Agreement specifies:
  - Escort: required
  - Minimum: 1 squadron (5 ships)
  - Provider: Imperial Navy
  - Cost: 500 credits/month

Imperial Navy assigns Squadron "Theta Wing":
  - 5 threshold_ships
  - Squadron commander: Captain Aria (soul agent)
  - Mission: Escort trade convoy, engage pirates

Result:
  - Trade route secure (99% delivery success)
  - Navy earns 500 credits/month
  - Pirates deterred (flee from squadron)
```

---

## TypeScript Interfaces Summary

### Complete Type Definitions

```typescript
// ============================================================================
// Tier 2: Squadron
// ============================================================================

interface SquadronTier {
  id: string;
  name: string;

  ships: {
    shipIds: EntityId[];
    totalCrew: number;
    shipTypes: Record<SpaceshipType, number>;
  };

  commanderId: EntityId;
  flagshipId: EntityId;

  coherence: {
    average: number;
    min: number;
    max: number;
    variance: number;
  };

  formation: SquadronFormation;

  mission: {
    type: SquadronMissionType;
    targetLocation?: Vector3D;
    targetEntityId?: EntityId;
    escortedTradeAgreementId?: string;
    status: 'planning' | 'en_route' | 'engaged' | 'completed';
  };

  combat: {
    totalFirepower: number;
    totalMarines: number;
    avgHullIntegrity: number;
    combatExperience: number;
  };

  logistics: {
    fuelReserves: number;
    repairParts: number;
    foodSupply: number;
    estimatedRange: number;
  };
}

type SquadronFormation =
  | 'line_ahead'
  | 'line_abreast'
  | 'wedge'
  | 'sphere'
  | 'echelon'
  | 'scattered';

type SquadronMissionType =
  | 'patrol'
  | 'escort'
  | 'reconnaissance'
  | 'assault'
  | 'blockade'
  | 'rescue'
  | 'exploration';

// ============================================================================
// Tier 3: Fleet
// ============================================================================

interface FleetTier {
  id: string;
  name: string;

  squadrons: {
    squadronIds: string[];
    totalShips: number;
    totalCrew: number;
    shipTypeBreakdown: Record<SpaceshipType, number>;
  };

  admiralId: EntityId;
  flagshipSquadronId: string;
  flagshipShipId: EntityId;

  coherence: {
    average: number;
    distribution: {
      low: number;
      medium: number;
      high: number;
    };
    fleetCoherenceRating: 'poor' | 'adequate' | 'excellent';
  };

  status: {
    readiness: number;
    inCombat: boolean;
    currentSystem: string;
    destination?: string;
    eta?: number;
  };

  mission: {
    type: FleetMissionType;
    objective: string;
    priority: 'low' | 'medium' | 'high' | 'critical';
    startTick: Tick;
    expectedDuration: number;
    progress: number;
  };

  combat: {
    offensiveRating: number;
    defensiveRating: number;
    marineStrength: number;
    combatHistory: {
      battlesWon: number;
      battlesLost: number;
      shipsLost: number;
    };
  };

  logistics: {
    supplyDepotSystemId?: string;
    fuelReserves: number;
    repairCapability: number;
    rangeFromSupply: number;
  };
}

type FleetMissionType =
  | 'defense'
  | 'invasion'
  | 'patrol'
  | 'trade_escort'
  | 'pirate_hunt'
  | 'exploration'
  | 'show_of_force'
  | 'relief'
  | 'blockade';

// ============================================================================
// Tier 4: Armada
// ============================================================================

interface ArmadaTier {
  id: string;
  name: string;

  fleets: {
    fleetIds: string[];
    totalSquadrons: number;
    totalShips: number;
    totalCrew: number;
  };

  commanderId: EntityId;
  flagshipFleetId: string;

  campaign: {
    type: ArmadaCampaignType;
    targetSystems: string[];
    duration: number;
    progress: number;
    systemsConquered: string[];
    systemsLost: string[];
  };

  strength: {
    shipCount: number;
    effectiveCombatPower: number;
    territoryControlled: number;
    supplyLines: {
      secure: string[];
      contested: string[];
      cut: string[];
    };
  };

  morale: {
    average: number;
    trend: 'rising' | 'stable' | 'falling';
    factors: {
      recentVictories: number;
      recentDefeats: number;
      supplySituation: 'good' | 'adequate' | 'poor';
      timeSinceLeave: number;
    };
  };

  attrition: {
    shipsLostTotal: number;
    crewLostTotal: number;
    replacementRate: number;
    canSustainOperations: boolean;
  };
}

type ArmadaCampaignType =
  | 'conquest'
  | 'defense'
  | 'liberation'
  | 'punitive'
  | 'exploration';

// ============================================================================
// Tier 5: Navy
// ============================================================================

interface NavyTier {
  id: string;
  name: string;
  factionId: EntityId;

  assets: {
    totalArmadas: number;
    totalFleets: number;
    totalSquadrons: number;
    totalShips: number;
    totalCrew: number;
    shipTypeBreakdown: Record<SpaceshipType, number>;
    activeDeployments: number;
    inReserve: number;
    underConstruction: number;
  };

  grandAdmiralId: EntityId;

  economy: {
    annualBudget: number;
    budgetSpent: number;
    shipyardCapacity: number;
    maintenanceCost: number;
    personnelCost: number;
    budgetAllocation: {
      newConstruction: number;
      maintenance: number;
      personnel: number;
      R&D: number;
      reserves: number;
    };
  };

  doctrine: {
    strategicPosture: 'defensive' | 'offensive' | 'balanced';
    preferredShipTypes: SpaceshipType[];
    tacticalDoctrine: string;
    officerAcademyQuality: number;
    NCOTraining: number;
  };

  politics: {
    militaryBudgetShare: number;
    politicalPower: number;
    publicSupport: number;
    veteranSoulAgents: number;
  };

  technology: {
    currentTechLevel: number;
    researchProjects: Array<{
      shipTypeId: SpaceshipType;
      progress: number;
      cost: number;
    }>;
    betaSpaceResearch: {
      coherenceThresholdReduction: number;
      decoherenceRateMitigation: number;
      observationPrecisionImprovement: number;
    };
  };
}

// ============================================================================
// Crew
// ============================================================================

interface ShipCrewComponent extends Component {
  type: 'ship_crew';
  shipId: EntityId;
  role: CrewRole;
  rank: number;
  emotionalContribution: EmotionalSignature;
  quantumCouplingContribution: number;
  morale: number;
  betaSpaceStress: number;
  timeAboard: number;
  permanentBond?: boolean;
}

type CrewRole =
  | 'captain'
  | 'navigator'
  | 'pilot'
  | 'engineer'
  | 'medic'
  | 'scientist'
  | 'diplomat'
  | 'marine'
  | 'passenger';

// ============================================================================
// Combat
// ============================================================================

interface ShipCombatEncounter {
  attackerId: EntityId;
  defenderId: EntityId;
  phase: 'range' | 'close' | 'boarding' | 'resolved';
  attackerHullIntegrity: number;
  defenderHullIntegrity: number;
  attackerCoherence: number;
  defenderCoherence: number;
  boardingMarines: number;
  victor?: EntityId;
  destroyed?: EntityId;
  captured?: EntityId;
}

interface SquadronCombat {
  squadron1Id: string;
  squadron2Id: string;
  formation1Bonus: number;
  formation2Bonus: number;
  totalFirepower1: number;
  totalFirepower2: number;
  shipsDestroyed1: EntityId[];
  shipsDestroyed2: EntityId[];
  victor?: string;
}

interface FleetBattleResult {
  fleet1Remaining: number;
  fleet2Remaining: number;
  victor: string;
  shipsLost1: number;
  shipsLost2: number;
}

// ============================================================================
// β-Space
// ============================================================================

interface HeartChamberNetwork {
  flagshipHeartId: EntityId;
  connectedHeartIds: EntityId[];
  synchronization: {
    syncStrength: number;
    syncFrequency: number;
    latency: number;
  };
  collectiveState: EmotionalSignature;
  resonance: {
    resonanceFrequency: number;
    harmonicAlignment: number;
  };
}
```

---

## Hierarchy Simulator Integration

### Summarization Rules

**What is preserved when zooming out:**

```typescript
const SHIP_HIERARCHY_SUMMARIZATION = {
  // Tier 0 → Tier 1 (Crew → Ship)
  crew_to_ship: {
    preserved: [
      'soul_agents',           // Captains, navigators always preserved
      'ship_coherence',        // Aggregate coherence
      'emotional_state',       // Collective emotional state
    ],
    lost: [
      'individual_crew_positions',  // Where each crew member is
      'individual_morale',          // Specific crew morale (averaged)
    ],
  },

  // Tier 1 → Tier 2 (Ship → Squadron)
  ship_to_squadron: {
    preserved: [
      'ship_ids',              // All ships tracked
      'squadron_commander',    // Soul agent
      'formation',             // Formation type
      'mission',               // Squadron mission
    ],
    lost: [
      'individual_ship_positions', // Exact ship coordinates (use formation)
      'ship_components',           // Heart, VR systems (implicit)
    ],
  },

  // Tier 2 → Tier 3 (Squadron → Fleet)
  squadron_to_fleet: {
    preserved: [
      'squadron_ids',          // All squadrons tracked
      'fleet_admiral',         // Soul agent
      'fleet_coherence',       // Aggregated coherence rating
      'combat_strength',       // Total firepower
    ],
    lost: [
      'squadron_formations',   // Exact formation (use fleet doctrine)
      'individual_squadron_missions', // Only fleet mission tracked
    ],
  },

  // Tier 3 → Tier 4 (Fleet → Armada)
  fleet_to_armada: {
    preserved: [
      'fleet_ids',             // All fleets tracked
      'armada_commander',      // Soul agent (Grand Admiral)
      'campaign_objective',    // Strategic goal
      'ship_count',            // Total ships (abstracted)
    ],
    lost: [
      'individual_fleet_positions', // Only system control tracked
      'fleet_coherence_details',    // Only armada morale
    ],
  },

  // Tier 4 → Tier 5 (Armada → Navy)
  armada_to_navy: {
    preserved: [
      'total_assets',          // Total ships, crew
      'budget',                // Economy
      'doctrine',              // Strategy
      'grand_admiral',         // Soul agent
    ],
    lost: [
      'individual_armadas',    // Only total count
      'campaign_details',      // Only victory/defeat stats
    ],
  },
};
```

### Time Scale Hierarchy

**Simulation speed at each tier:**

```typescript
const TIME_SCALES = {
  crew: 1,        // 1 tick = 1 tick (real-time)
  ship: 1,        // 1 tick = 1 tick
  squadron: 1,    // 1 tick = 1 tick (can go statistical)
  fleet: 10,      // 1 tick = 10 ticks (10x faster simulation)
  armada: 100,    // 1 tick = 100 ticks
  navy: 1000,     // 1 tick = 1000 ticks (years pass quickly)
};
```

**Example:**
```
Player zoomed to navy level, watching grand strategy.

1 tick at navy level = 1000 ticks of actual time.

Player watches:
  - Year 1: Navy builds 10 new ships
  - Year 2: Navy deploys armada to conquer sector
  - Year 3: Armada wins, navy gains territory
  - Year 4: Navy budget increases from conquered systems

All in 4 ticks (0.2 seconds at 20 TPS)!

Player zooms in to fleet level:
  - Time slows to 1 tick = 10 ticks
  - Can see individual fleet battles
  - Lanchester's Laws applied to each engagement

Player zooms in to ship level:
  - Time slows to 1 tick = 1 tick (real-time)
  - Can watch individual crew members
  - Captain Kara (soul agent) makes decisions
```

---

## Performance Considerations

### Entity Count at Each Tier

| Tier | Entities per Tier | Total (1000-ship navy) |
|------|-------------------|------------------------|
| Crew | 1-100 per ship | 50,000-100,000 agents |
| Ship | 1 ship | 1,000 ships |
| Squadron | 3-10 ships | 100-333 squadrons |
| Fleet | 3-10 squadrons | 10-111 fleets |
| Armada | 2+ fleets | 1-10 armadas |
| Navy | All | 1 navy |

### Simulation Cost

**Full ECS (Crew, Ship):**
- 50,000 agents × 50 systems = 2,500,000 operations/tick
- **Unaffordable** for large navies

**Statistical (Fleet+):**
- 10 fleets × 1 battle resolution = 10 operations/tick
- **Affordable**

### Optimization Strategy

1. **Only simulate active tier:**
   - Player viewing fleet level → Simulate fleets (10 ops/tick)
   - Player zooms to ship → Activate that ship's ECS (500 ops/tick for 1 ship)

2. **Soul agents always tracked:**
   - Captain Kara (soul agent) tracked even when fleet zoomed out
   - Headless simulation (see 02-SOUL-AGENTS.md)

3. **Lazy instantiation:**
   - When zooming from fleet → ship, instantiate crew on-demand
   - Generate crew from ship configuration
   - Preserve soul agents

---

## Example: Full Hierarchy Walkthrough

### Scenario: Player Commands 5th Fleet

**Context:**
- Player controls "Imperial Navy"
- Navy has 3 armadas, 15 fleets, ~500 ships total
- Player zoomed to Fleet tier, commanding "5th Fleet"

**5th Fleet Composition:**
```
Fleet "5th Fleet" (FleetTier):
  - Admiral Kara (soul agent, captain of flagship *Emperor's Will*)
  - 5 squadrons (SquadronTier):
    - Alpha Squadron (SquadronTier):
      - 5 threshold_ships (SpaceshipComponent)
      - 30 crew total (ShipCrewComponent on each agent)
      - Commander: Captain Finn (soul agent)
    - Beta Squadron: 4 courier_ships, 8 crew
    - Gamma Squadron: 6 threshold_ships, 36 crew
    - Delta Squadron: 3 brainships, 3 crew (ship-brain pairs)
    - Epsilon Squadron: 7 story_ships, 49 crew
  - Total: 25 ships, 126 crew
```

**Player Actions:**

#### 1. Order Fleet to Jump to Distant System

```typescript
// Player clicks "Jump to System Tau-7"

// Fleet must synchronize coherence
const syncResult = synchronizeFleetHearts(
  fleet5th,
  heartNetwork,
  200 // 200 ticks to sync
);

if (syncResult.success) {
  // Fleet coherence: 0.71 (adequate)
  // All squadrons jump together
  fleet5th.status.currentSystem = 'tau-7';
  fleet5th.status.destination = undefined;

  // Update all squadron positions
  fleet5th.squadrons.squadronIds.forEach(sqId => {
    const squadron = getSquadron(sqId);
    squadron.mission.status = 'completed'; // Jump complete
  });
} else {
  // Failed to sync, some squadrons straggle
  console.warn('Fleet coherence too low, 2 squadrons failed to jump');
  // Delta Squadron and Epsilon Squadron left behind
}
```

#### 2. Engage Enemy Fleet

```typescript
// Enemy fleet detected in system

const enemyFleet = getFleet('enemy_6th_fleet');

// Resolve fleet battle using Lanchester's Laws
const battleResult = resolveFleetBattle(
  fleet5th,
  enemyFleet,
  1000 // Battle duration: 1000 ticks
);

if (battleResult.victor === fleet5th.id) {
  // 5th Fleet wins
  console.log(`5th Fleet victorious! Lost ${battleResult.shipsLost1} ships.`);

  // Update fleet combat history
  fleet5th.combat.combatHistory.battlesWon++;
  fleet5th.combat.combatHistory.shipsLost += battleResult.shipsLost1;

  // Morale boost
  // (Propagates to armada, then navy)
} else {
  // 5th Fleet loses
  console.log(`5th Fleet defeated. Lost ${battleResult.shipsLost1} ships.`);

  // Admiral Kara (soul agent) survives? (if flagship intact)
  if (fleet5th.flagshipShipId && !isDestroyed(fleet5th.flagshipShipId)) {
    console.log('Admiral Kara survived on damaged flagship.');
  } else {
    console.log('Flagship destroyed. Admiral Kara status unknown.');
    // Kara is soul agent, so she persists (possibly in afterlife, reincarnation queue)
  }
}
```

#### 3. Zoom In to Individual Ship

```typescript
// Player clicks on flagship *Emperor's Will*

// Zoom from Fleet tier → Ship tier
const flagship = getShip(fleet5th.flagshipShipId);

// Activate ECS for this ship
activateShipECS(flagship);

// Instantiate crew (if not already in ECS)
const crew = instantiateCrewForShip(flagship);

// Player can now:
// - See individual crew members walking around ship
// - See Admiral Kara in captain's chair (soul agent)
// - See crew working in Heart Chamber, VR systems, etc.
// - Give individual orders to crew

// Example: Order crew to repair hull
crew.filter(c => c.role === 'engineer').forEach(engineer => {
  assignBehavior(engineer, 'repair_hull');
});

// Watch in real-time as engineers repair ship
// Hull integrity: 0.6 → 0.65 → 0.7 (over 100 ticks)
```

---

## Summary

This spec defines a **6-tier hierarchy** for ship-fleet organization:

1. **Crew (Tier 0):** Individual agents, soul agents as captains
2. **Ship (Tier 1):** SpaceshipComponent, β-space navigation via coherence
3. **Squadron (Tier 2):** 3-10 ships, tactical formations
4. **Fleet (Tier 3):** 3-10 squadrons, Lanchester's Laws combat
5. **Armada (Tier 4):** 2+ fleets, campaign-scale operations
6. **Navy (Tier 5):** Nation-scale, budget/production/doctrine

**Key Mechanics:**
- **Coherence Aggregation:** Ship → Squadron → Fleet coherence
- **β-Space at Fleet Scale:** Heart Chamber network synchronization
- **Combat at Each Scale:** Detailed → Formation → Lanchester → Strategic
- **Soul Agents:** Captains, admirals preserved across all scales
- **Integration:** Trade escorts, piracy, blockades

**Next Steps:**
1. Implement SquadronTier, FleetTier, ArmadaTier, NavyTier components
2. Implement ShipCrewComponent
3. Implement coherence aggregation algorithms
4. Implement Heart Chamber network synchronization
5. Implement Lanchester's Laws combat resolution
6. Integrate with TradeAgreementSystem (escort missions)
7. Test with soul agents (captain continuity across zooms)

---

**Document Version:** 1.0.0
**Last Updated:** 2026-01-17
**Total Lines:** ~1400
**Status:** Complete, ready for implementation
