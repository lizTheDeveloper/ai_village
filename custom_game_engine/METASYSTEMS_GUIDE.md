# Metasystems Guide

> **Last Updated:** 2026-01-02
> **Purpose:** Deep dive into major metasystems and how they interconnect

## Overview

Metasystems are high-level features composed of multiple systems, components, and subsystems. This guide explains how each metasystem works, its architecture, and integration points.

---

## Table of Contents

1. [Consciousness Systems](#consciousness-systems)
2. [Divinity System](#divinity-system)
3. [Reproduction System](#reproduction-system)
4. [Multiverse System](#multiverse-system)
5. [Magic System](#magic-system)
6. [Realm System](#realm-system)
7. [Research & Discovery](#research--discovery)
8. [Persistence System](#persistence-system)
9. [Agent AI System](#agent-ai-system)
10. [Memory System](#memory-system)

---

## Consciousness Systems

**Status:** ✅ Implemented
**Location:** `packages/core/src/consciousness/`

### Overview

Consciousness systems enable collective intelligence beyond individual agents, including hive minds (eusocial insects) and pack minds (wolves, etc.).

### Architecture

#### HiveMindSystem

**Purpose:** Eusocial insect colonies (ants, bees)

**Components:**
- `HiveMindComponent` - Colony-level intelligence
- `HiveMemberComponent` - Individual colony member

**Features:**
- **Shared Knowledge:** All workers know all tasks (pheromone trails)
- **Task Allocation:** Queen assigns tasks based on colony needs
- **Collective Decision-Making:** Colony chooses nest sites democratically
- **Pheromone Communication:** Chemical trails for coordination

**Example Species:** Ants, bees, termites

**Implementation:**
```typescript
// HiveMindComponent stores colony state
{
  queenId: string;
  members: Set<string>;
  knownTasks: string[];      // All tasks known to colony
  resources: Record<string, number>;
  threats: Array<{location, type, severity}>;
}

// HiveMemberComponent on each worker
{
  hiveId: string;
  caste: 'queen' | 'worker' | 'soldier' | 'drone';
  currentTask?: string;
  assignedAt?: number;
}
```

**Data Flow:**
1. Worker discovers food → Updates hive mind
2. Hive mind broadcasts to all workers
3. Workers near food respond (pheromone trail following)
4. Queen allocates workers based on priority

---

#### PackMindSystem

**Purpose:** Coordinated group behavior (wolves, lions, orcas)

**Components:**
- `PackMindComponent` - Pack-level coordination
- `PackMemberComponent` - Individual pack member

**Features:**
- **Alpha Leadership:** Alpha makes decisions, pack follows
- **Coordinated Hunting:** Flanking, ambush, pursuit roles
- **Shared Alertness:** One member spots threat → all alerted
- **Role Specialization:** Scout, hunter, pup-sitter, sentinel

**Example Species:** Wolves, lions, orcas, velociraptors

**Implementation:**
```typescript
// PackMindComponent
{
  alphaId: string;
  members: Set<string>;
  currentPlan?: {
    type: 'hunt' | 'patrol' | 'rest';
    target?: string;
    roles: Record<string, string>; // memberId → role
  };
  sharedThreats: Array<{entity, lastSeen, danger}>;
}

// PackMemberComponent
{
  packId: string;
  rank: number;              // Dominance hierarchy (1 = alpha)
  role?: 'scout' | 'hunter' | 'sentinel' | 'pup_sitter';
  loyalty: number;           // To alpha
}
```

**Coordination Example (Hunt):**
1. Scout spots prey → Reports to alpha
2. Alpha formulates plan (roles: flanker-left, flanker-right, chaser)
3. Pack members move to positions
4. Alpha signals attack → Synchronized strike
5. Pack shares kill

---

### Integration Points

**With AgentBrainSystem:**
- Hive/pack members consult collective mind for decisions
- Individual autonomy vs collective override

**With CommunicationSystem:**
- Pheromones (hive) represented as invisible signals
- Howls/vocalizations (pack) create shared awareness

**With NeedsSystem:**
- Colony needs (hive) vs individual needs
- Pack hierarchy affects food distribution

---

## Divinity System

**Status:** ✅ Complete (Phases 27-28, 35)
**Location:** `packages/core/src/divinity/`

### Overview

The divinity system simulates gods, religion, faith, and divine interaction. It supports both emergent deities (belief-driven) and player-controlled gods.

### Architecture Layers

```
Layer 1: Belief & Faith (bottom-up)
    ↓
Layer 2: Deity Emergence & Identity
    ↓
Layer 3: Divine Powers & Interactions
    ↓
Layer 4: Institutions & Culture
    ↓
Layer 5: Pantheon & Politics (top-level)
```

---

### Layer 1: Belief & Faith

**Components:** `BeliefComponent` (on agents)

**Systems:**
- `BeliefGenerationSystem` - Generate faith from activities
- `FaithMechanicsSystem` - Faith decay, allocation

**How Faith Works:**
1. **Generation:** Agents generate faith daily based on:
   - Prayer frequency
   - Religious activities (temple visits, rituals)
   - Divine experiences (answered prayers, miracles)

2. **Allocation:** Agents can believe in multiple gods:
   ```typescript
   {
     deities: {
       'death_god_id': { strength: 0.7, allocation: 60% },
       'wisdom_god_id': { strength: 0.3, allocation: 40% }
     }
   }
   ```

3. **Decay:** Faith decays over time if not reinforced
   - Unanswered prayers → Decay faster
   - Miracles → Boost faith

**Faith → Belief Points:**
- 100% allocation to one god: All daily faith goes to that god
- Split allocation: Proportional distribution
- Belief points used to power divine actions

---

### Layer 2: Deity Emergence & Identity

**Components:** `DeityComponent`

**Systems:**
- `DeityEmergenceSystem` - Birth gods from collective belief
- `AIGodBehaviorSystem` - AI personality for gods

**Emergence Process:**
1. **Threshold:** When aggregate belief in a domain reaches threshold (e.g., 1000 points), deity emerges
2. **Identity Formation:**
   ```typescript
   {
     name: "Generated via LLM",
     domains: ['death', 'wisdom'],  // From belief sources
     alignment: 'neutral',           // From believer morality
     personality: {
       traits: ['stern', 'fair', 'mysterious'],
       goals: ['judge the dead justly', 'preserve knowledge']
     }
   }
   ```

3. **Controller:**
   - `'emergent'`: Auto-generated, no controller
   - `'ai'`: AI personality takes over
   - `'player'`: Player can control (if enabled)

**Deity Types:**
- **Emergent Gods:** Form naturally from belief
- **Primordial Gods:** Created at world start (optional)
- **Aspect Gods:** Split from existing gods (schisms)

---

### Layer 3: Divine Powers & Interactions

**Components:** `DivinePowerComponent`, `PrayerComponent`, `AvatarComponent`, `AngelComponent`

**Systems:**
- `DivinePowerSystem` - Execute divine powers
- `PrayerSystem` - Receive prayers
- `PrayerAnsweringSystem` - LLM-generated responses
- `AvatarSystem` - God manifestation
- `AngelSystem` - Divine servants

#### Prayer Flow

```
Agent prays
    ↓
PrayerSystem creates prayer entity
    ↓
PrayerAnsweringSystem filters by domain
    ↓
LLM generates response (vision/blessing/advice)
    ↓
Deliver to agent (VisionDeliverySystem)
    ↓
Agent belief increases (if positive) or decreases (if ignored)
```

**Prayer Types:**
- **Request:** "Please cure my illness"
- **Gratitude:** "Thank you for the harvest"
- **Worship:** "I praise your wisdom"
- **Desperate Plea:** "Save my child!"

**Divine Response Types:**
- **Vision:** Prophetic dream or hallucination
- **Blessing:** Temporary buff (health, luck, skill)
- **Curse:** Punishment for transgressions
- **Silence:** No response (faith decay)

#### Divine Powers

**Power Categories:**
- **Blessings:** Positive effects on mortals
- **Curses:** Negative effects
- **Miracles:** Large-scale events (heal plague, end drought)
- **Terrain Modification:** Raise mountains, create lakes
- **Species Creation:** Design new creatures
- **Weather Control:** Summon rain, clear storms

**Cost & Constraints:**
- **Belief Cost:** Proportional to power magnitude
- **Domain Affinity:** Powers matching god's domain cost less
  - Death god: Resurrection costs 50% normal
  - Fire god: Summon flames costs 30% normal
- **Range:** Limited by belief in area
- **Cooldown:** Prevent spam

**Example Power Usage:**
```typescript
// God of Death resurrects fallen hero
const cost = calculatePowerCost({
  baseCost: 500,              // Resurrection is expensive
  domainModifier: 0.5,        // Death domain affinity
  range: distance(god, corpse),
  magnitude: 1.0
});

if (deity.belief >= cost) {
  deity.belief -= cost;
  resurrectAgent(corpse);
  emitEvent('divine_miracle', { deity, target: corpse });
}
```

#### Avatars

**Purpose:** God walks among mortals

**Features:**
- **Belief Cost:** Expensive to maintain (10 belief/tick)
- **Mortal Form:** Can interact with world like agent
- **Vulnerability:** Avatar can be killed (embarrassing!)
- **Player Control:** Player can directly control avatar

**Use Cases:**
- Investigate mortal affairs
- Test followers' devotion
- Romance mortals (mythology classic)
- Direct intervention

#### Angels

**Purpose:** Divine servants, messengers, enforcers

**Ranks:**
- **Seraph:** Highest, powerful, expensive
- **Cherub:** Mid-tier, specialized tasks
- **Messenger:** Low-tier, prayer answering

**Features:**
- **Autonomy:** Can have personality, make decisions
- **Delegation:** God assigns tasks (answer prayers, guard temple, punish sinners)
- **Maintenance Cost:** Lower than avatar
- **Loyalty:** Can develop independence (rebellion risk!)

**Status:** ✅ Complete (Phase 28), LLM integration for personality

---

### Layer 4: Institutions & Culture

**Components:** `TempleComponent`, `PriestComponent`, `RitualComponent`, `HolyTextComponent`

**Systems:**
- `TempleSystem` - Temples, shrines, sacred sites
- `PriesthoodSystem` - Priests, religious hierarchy
- `RitualSystem` - Ceremonies, festivals
- `HolyTextSystem` - Scripture, interpretation

#### Temples

**Types:**
- **Shrine:** Small, 1-2 believers
- **Temple:** Medium, congregation
- **Cathedral:** Large, many priests

**Benefits:**
- **Faith Bonus:** Believers in range generate more faith
- **Prayer Amplification:** Prayers from temple are stronger
- **Offerings:** Donate items/money to god
- **Pilgrimage:** Distant believers travel to temple (faith boost)

#### Priests

**Roles:**
- **Celebrant:** Lead rituals
- **Theologian:** Interpret scripture, resolve disputes
- **Missionary:** Spread faith, convert
- **Inquisitor:** Root out heresy

**Mechanics:**
- **Ordination:** Deity or temple ordains agent
- **Priestly Vows:** Special commitments (celibacy, poverty, etc.)
- **Faith Amplification:** Priest prayers/rituals more effective

#### Rituals

**Types:**
- **Daily:** Morning prayer, evening chant
- **Weekly:** Sabbath service
- **Seasonal:** Harvest festival, solstice
- **Lifecycle:** Birth blessing, coming-of-age, funeral

**Mechanics:**
- **Participation:** Multiple agents perform together (stronger effect)
- **Quality:** Depends on preparation, priest skill, temple quality
- **Effects:** Faith generation, divine favor, community bonding

---

### Layer 5: Pantheon & Politics

**Components:** `PantheonComponent`, `DivineRelationshipComponent`, `DivineChatComponent`

**Systems:**
- `DivineChatSystem` - God-to-god chat (real-time LLM)
- `SchismSystem` - Religious splits
- `SyncretismSystem` - Religious mergers
- `ReligiousCompetitionSystem` - Proselytization
- `ConversionWarfareSystem` - Holy wars

#### Pantheon Structure

**Types:**
- **Monarchy:** One supreme god, subordinate gods
- **Oligarchy:** Council of equals
- **Anarchy:** Independent gods, no structure

**Relations:**
- **Allies:** Support each other's domains
- **Rivals:** Compete for worshippers
- **Enemies:** Active conflict
- **Romantic:** Divine relationships (mythology!)

#### Divine Chat

**Purpose:** Real-time god conversations (LLM-powered)

**Features:**
- **Chat Rooms:** Pantheon-wide or private DMs
- **Personality-Driven:** Each god has unique voice
- **Political Intrigue:** Alliances, betrayals, gossip
- **Player Participation:** Player god can chat with AI gods

**Example Exchange:**
```
[Death God]: "The mortals grow complacent. Perhaps a plague?"
[Life Goddess]: "You always resort to death! Try inspiring them instead."
[Trickster God]: "I could arrange a 'miraculous' discovery... for a price."
```

**Status:** ✅ Complete, integrated with ChatRoomSystem

#### Schisms

**Causes:**
- **Theological Dispute:** Disagreement over doctrine
- **Power Struggle:** Priests compete for authority
- **Cultural Divergence:** Different regions interpret differently
- **Divine Revelation:** God contradicts established teaching

**Effects:**
- **Split Religion:** Original + schismatic branch
- **Shared Roots:** Some practices overlap
- **Hostility:** Converts become enemies
- **Inquisitions:** Purge heretics

#### Syncretism

**Causes:**
- **Cultural Contact:** Two cultures meet, merge religions
- **Conquered Religion:** Conquerors adopt local gods
- **Similar Domains:** Two gods seem like same entity

**Effects:**
- **Merged Deities:** "Our death god is your underworld god"
- **Hybrid Practices:** Rituals combine elements
- **Shared Temples:** Multiple gods worshipped together

---

### Psychopomp System

**Status:** ✅ Complete (Phase 35)
**Location:** `packages/core/src/divinity/`

**Purpose:** Death god judges souls upon death

**Features:**
- **Conversation:** LLM-generated dialogue with deceased
- **Judgment:** Based on actions, faith, morality
- **Riddles:** Death god may pose riddles (test wisdom)
- **Afterlife Assignment:** Heaven, hell, reincarnation, oblivion

**Implementation:**
- `DeathJudgmentSystem` - Handles judgment flow
- `RiddleGenerator` - LLM generates riddles
- Integration with `RealmSystem` for afterlife transport

**Example Judgment:**
```
Death God: "Tell me, mortal, what did you do with your life?"
Soul: "I farmed, I raised children, I helped my neighbors."
Death God: "And when the plague came, what did you do?"
Soul: "I fled to the mountains, abandoning the sick."
Death God: "Cowardice. You shall wander the grey fields until you learn courage."
```

---

### Integration Points

**With Agent AI:**
- Prayer decisions based on needs and personality
- Faith affects decision-making (avoid sin, seek virtue)

**With Memory System:**
- Divine visions become episodic memories
- Miracles become semantic knowledge

**With Realms:**
- Afterlife realms (Underworld, Celestial)
- Divine realms (Olympus, Asgard)

**With Multiverse:**
- Gods can cross universes (meta-deities)
- Belief from multiple universes

---

## Reproduction System

**Status:** ✅ Complete (Phase 37)
**Location:** `packages/core/src/reproduction/`

### Overview

The reproduction system handles species propagation from courtship through birth and parenting. Supports 12+ mating paradigms.

### Architecture

```
Phase 1: Courtship (mate selection, displays)
    ↓
Phase 2: Mating (compatibility checks, conception)
    ↓
Phase 3: Pregnancy (gestation, health effects)
    ↓
Phase 4: Labor & Birth (delivery, complications, midwifery)
    ↓
Phase 5: Parenting (care, bonding, teaching)
```

---

### Mating Paradigms

The system supports diverse reproductive strategies via pluggable paradigms:

#### 1. Human Paradigm
- **Binary sexes:** Male, female
- **Courtship:** Displays, gift-giving
- **Gestation:** 9 months (~1200 ticks)

#### 2. Kemmer Paradigm (Ursula K. Le Guin's _The Left Hand of Darkness_)
- **Default:** Androgynous (no sex)
- **Kemmer:** Periodic fertility cycle
- **Role Selection:** During kemmer, become male or female based on partner
- **Gestation:** Kemmer-female carries offspring

#### 3. Hive Paradigm
- **Castes:** Queen, drone, worker (sterile)
- **Reproduction:** Only queen mates (with drones)
- **Workers:** Cannot reproduce

#### 4. Hivemind Paradigm (Parasitic)
- **Hosts:** Parasites infect hosts
- **Colonization:** Convert host to hive member
- **Collective:** All infected share hivemind

#### 5. Three-Sex Paradigm
- **Sexes:** Male, female, catalyst
- **Requirement:** All three sexes needed for conception
- **Roles:** Male provides genetic material, female gestates, catalyst triggers conception

#### 6. Quantum Paradigm
- **Superposition:** Agent is both sexes until observation
- **Collapse:** During courtship, collapses to compatible sex
- **Entanglement:** Partners become quantum-linked

#### 7. Asexual Paradigm
- **Budding:** Clone offspring
- **No Partner:** Self-reproduction
- **Genetic Diversity:** Mutations only

**... and 5 more paradigms (Symbiotic, Polyamorous, Opportunistic, Mystif, Temporal)**

**Location:** `packages/core/src/reproduction/MatingParadigm.ts`

---

### Courtship Subsystem

**Components:**
- `CourtshipComponent` - Courtship state machine
- `SexualityComponent` - Orientation, preferences
- `ReproductiveMorphComponent` - Current reproductive role

**System:** `CourtshipSystem`

**State Machine:**
```
seeking → displaying → evaluating → accepted/rejected
```

**Compatibility Factors:**
- **Sexual Orientation:** Match preferences
- **Age Range:** Within acceptable range
- **Traits:** Personality, appearance preferences
- **Shared Interests:** Social bonding
- **Relationship:** Existing friendship/trust

**Display Actions:**
- **Dance:** Performance displays
- **Gift:** Offer valuable items
- **Serenade:** Vocal displays
- **Plumage:** Visual displays (species-specific)

**Acceptance/Rejection:**
- **Threshold:** Compatibility score > 0.7 → Accept
- **Multiple Attempts:** Rejected suitor can try again (after cooldown)
- **Jealousy:** Existing partner may interfere

---

### Pregnancy Subsystem

**Components:** `PregnancyComponent`

**System:** `ReproductionSystem`

**Mechanics:**
- **Gestation Period:** Species-dependent (human: 1200 ticks = 60 seconds)
- **Health Effects:**
  - Early: Nausea, mood swings
  - Mid: Energy reduction, increased hunger
  - Late: Mobility reduction, sleep disruption
- **Complications:**
  - Malnutrition → Low birth weight
  - Injury → Miscarriage risk
  - Stress → Premature labor

**Progression:**
```typescript
{
  gestationProgress: 0.0,    // Start
  gestationPeriod: 1200,     // Ticks total
  health: 1.0,               // Pregnancy health
  complications: [],         // Complications list
}
```

Each tick: `gestationProgress += 1 / gestationPeriod`

---

### Midwifery Subsystem

**Status:** ✅ Complete (Phase 37)
**Location:** `packages/core/src/reproduction/midwifery/`

**Components:** `LaborComponent`, `MidwifeComponent`

**System:** `MidwiferySystem`

**Labor Stages:**
1. **Early Labor:** Contractions begin, cervical dilation
2. **Active Labor:** Regular contractions, rapid dilation
3. **Transition:** Most intense, full dilation
4. **Pushing:** Expulsion efforts
5. **Delivery:** Birth

**Complications:**
- **Breech:** Baby positioned feet-first (requires skilled midwife)
- **Hemorrhage:** Excessive bleeding (life-threatening)
- **Prolonged Labor:** Labor > 1000 ticks (exhaustion, death risk)
- **Stillbirth:** Infant dies during delivery

**Midwife Role:**
- **Assist:** Reduce complication risk (skill check)
- **Comfort:** Reduce pain, provide emotional support
- **Emergency:** Intervention during complications
- **No Midwife:** Higher risk, pain, complications

**Pain Mechanics:**
- **Pain Level:** 0.0 (no pain) to 1.0 (extreme)
- **Effects:** Screaming, mobility loss, energy drain
- **Pain Relief:** Midwife assistance, medication (if available)

**Birth Outcome:**
```typescript
{
  success: boolean,          // Live birth?
  infantHealth: number,      // 0.0-1.0
  motherHealth: number,      // Post-birth health
  complications: string[],   // Complications during delivery
}
```

---

### Parenting Subsystem

**Components:**
- `ParentingComponent` - On parents
- `InfantComponent` - On newborns
- `ChildComponent` - On children

**System:** `ParentingSystem`

**Infant Needs:**
- **Feeding:** Every 100 ticks (~5 seconds)
- **Cleaning:** Diaper changes
- **Comfort:** Crying → soothing
- **Sleep:** Infants sleep often

**Bonding Mechanics:**
- **Bond Strength:** 0.0 (stranger) to 1.0 (deep bond)
- **Bonding Activities:** Feed, play, hold, sing
- **Neglect:** Missed care → Bond decay
- **Attachment Styles:** Secure, anxious, avoidant (based on care quality)

**Child Development:**
```typescript
{
  development: 0.0,          // Infant
               0.5,          // Toddler
               1.0,          // Child (independent)
}
```

**Teaching:**
- **Skills:** Parents teach farming, crafting, etc.
- **Beliefs:** Children adopt parents' religion
- **Personality:** Influenced by parenting style

---

### Integration Points

**With Needs System:**
- Pregnancy increases hunger, energy drain
- Infants have specialized needs

**With Social System:**
- Courtship uses relationship system
- Jealousy from rivals

**With Genetics System (future):**
- Offspring inherit traits from parents
- Genetic variation, mutations

**With Species System:**
- Each species has paradigm
- Cross-species mating (if paradigms compatible)

---

## Multiverse System

**Status:** ⏳ Partially implemented (Phase 32-34 pending)
**Location:** `packages/core/src/multiverse/`

### Overview

The multiverse system enables multiple parallel universes with independent time scales, cross-universe trade, and network synchronization.

### Architecture

```
Universe A ←→ MultiverseCoordinator ←→ Universe B
    ↓                                      ↓
  Time Scale: 1x                      Time Scale: 10x

Trade Agreements use Hilbert-Time for causal ordering
```

### Components

**MultiverseCoordinator:**
- Manages all universes
- Synchronizes events
- Routes messages between universes

**HilbertTime:**
- Multi-dimensional temporal coordinates
- Enables causal ordering across different time flows
- Prevents paradoxes

**Trade Agreements:**
- Cross-universe resource trading
- Escrow system (held in neutral space)
- Delivery time estimation (accounting for time dilation)

### Hilbert-Time

**Purpose:** Order events across universes with different time scales

**Coordinates:**
```typescript
{
  universeId: string,
  localTick: number,         // Universe-local time
  branchId: string,          // Timeline branch (for forks)
  causalDepth: number,       // Depth in causal tree
}
```

**Causal Ordering:**
- Event A happened-before Event B if:
  1. Same universe, A.tick < B.tick
  2. Different universes, A caused message sent to B
  3. Transitive: A → C, C → B ⇒ A → B

**Example:**
```
Universe A (1x speed):
  Tick 100: Send trade offer
  Tick 150: Receive acceptance

Universe B (10x speed):
  Tick 1020: Receive trade offer (50 ticks later in A = 500 ticks in B)
  Tick 1030: Send acceptance
```

Hilbert-Time resolves: "Acceptance happened after offer" despite tick values

---

### Network Synchronization

**Status:** ⏳ Designed, not implemented

**Purpose:** Run multiple universes on different machines

**Protocol:**
- WebRTC or WebSocket connections
- Event streaming between universes
- Conflict resolution (if events collide)

**Use Cases:**
- Multiplayer (each player has their own universe)
- Distributed simulation (run on multiple servers)
- Remote universe viewing (spectate other universes)

---

### Universe Forking

**Status:** 🔒 Blocked on Phase 31 (Persistence)

**Purpose:** Create parallel timelines

**Mechanics:**
1. **Fork Point:** Snapshot universe state
2. **Branch ID:** New timeline identifier
3. **Divergence:** Timelines evolve independently
4. **Merge:** (Optional) Combine timelines (complex!)

**Use Cases:**
- **Testing:** Fork universe, try changes, discard if bad
- **Alternate History:** "What if the hero died?"
- **Multiverse Exploration:** Explore all possibilities

---

### Integration Points

**With Trade System:**
- Cross-universe trade agreements
- Escrow mechanics
- Hilbert-time delivery contracts

**With Persistence:**
- Save/load multiple universes
- Fork requires snapshot capability

**With Divinity:**
- Gods aware of multiverse
- Meta-deities exist across universes

---

## Magic System

**Status:** ⚠️ Framework exists, paradigms incomplete (Phase 30)
**Location:** `packages/core/src/magic/`

### Overview

The magic system supports multiple magic sources, paradigm-based rules, and verb/noun spell composition.

### Paradigm Spectrum

Magic in a universe is defined by a spectrum configuration:

**Dimensions:**
1. **Source:** Internal (mana) ↔ External (ley lines, gods)
2. **Formality:** Structured (spells) ↔ Intuitive (wild magic)
3. **Intensity:** Mundane ↔ Reality-warping
4. **Animism:** Inanimate ↔ Everything has spirit

**Presets:**
- **Core:** Structured mana-based magic (D&D-like)
- **Animist:** Spirits in everything, bargaining with nature
- **Whimsical:** Chaotic, emotion-driven (Alice in Wonderland)
- **Null:** No magic (realistic universe)
- **Dimensional:** Cosmic horror, reality manipulation
- **Hybrid:** Mix of multiple sources

**Configuration:**
```typescript
{
  source: { type: 'internal', strength: 0.8 },
  formality: 'structured',
  intensity: 'moderate',
  animism: 0.3,              // Slight animism
  restrictions: ['no_resurrection', 'no_time_travel'],
}
```

---

### Spell Composition

**Verb/Noun System:**

**Verbs:** Create, Destroy, Transform, Move, Bind, Sense, Shield
**Nouns:** Fire, Water, Earth, Air, Life, Death, Mind, Space, Time

**Examples:**
- `Create + Fire` → Fireball
- `Transform + Self` → Polymorph
- `Sense + Mind` → Detect Thoughts
- `Bind + Space` → Teleport Lock

**Combos:**
- `(Create Fire) + (Move Air)` → Fire Tornado
- `(Shield Self) + (Sense Danger)` → Precognitive Barrier

---

### Paradigm Implementations

**Status:** ⚠️ Incomplete

**Core Paradigm:**
- Mana pool, spell slots
- Verbal/somatic components
- Spell schools (Evocation, Illusion, etc.)

**Animist Paradigm:**
- No mana, instead: Favor with spirits
- Bargain for effects ("Spirit of Fire, burn my enemies, I offer tobacco")
- Risk of spirits refusing/demanding more

**Whimsical Paradigm:**
- Magic powered by emotion/belief
- Unpredictable results
- "I believe I can fly" → Maybe you can!

**Status:** Frameworks exist in `magic/index.ts`, full implementations pending

---

### Integration Points

**With Skills:**
- Magic skill levels affect power, success rate
- Spell learning via skill progression

**With Research:**
- Discover new spells
- Unlock advanced magic

**With Divinity:**
- Divine magic (separate from arcane)
- Clerics channel god power

---

## Realm System

**Status:** ✅ Implemented
**Location:** `packages/core/src/realms/`

### Overview

Realms are mythological pocket dimensions with different physics, time flow, and access rules.

### Implemented Realms

#### Underworld Realm
- **Purpose:** Afterlife for the dead
- **Time Flow:** Slower (1:0.5 ratio)
- **Access:** Death, divine passage, hero's journey
- **Inhabitants:** Souls, psychopomps, ancestors
- **Features:** Rivers (Styx, Lethe), judgment halls, Elysian fields

#### Celestial Realm
- **Purpose:** Divine realm, heavens
- **Time Flow:** Faster (1:2 ratio) - "A day in heaven is a year on earth"
- **Access:** Divine ascension, spiritual travel
- **Inhabitants:** Gods, angels, saints
- **Features:** Palaces, gardens, thrones

#### Dream Realm
- **Purpose:** Collective unconscious, nightmare realm
- **Time Flow:** Nonlinear (subjective)
- **Access:** Sleep, meditation, psychedelics
- **Inhabitants:** Dream entities, nightmares, archetypes
- **Features:** Shifting landscapes, symbolic logic

---

### Realm Properties

**Time Dilation:**
```typescript
{
  realm: 'underworld',
  timeRatio: 0.5,            // 1 tick mortal = 0.5 ticks underworld
}
```

**Physics Modifications:**
- **Gravity:** Lower/higher/reversed
- **Magic:** Amplified/suppressed
- **Needs:** No hunger (souls don't eat), but spiritual needs

**Access Restrictions:**
- **Mortals Forbidden:** Only souls allowed
- **Divine Only:** Must be deity to enter
- **Worthy Only:** Heroes must prove worth

---

### Passages & Portals

**Passages:**
- **One-Way:** Death → Underworld (can't return easily)
- **Two-Way:** Mortal ↔ Dream (wake up)
- **Conditional:** "Only at midnight under full moon"

**Portals:**
- **Fixed:** Specific locations link realms
- **Temporary:** Opened by ritual/magic
- **Network:** Multiple portals interconnected

**System:** `PassageSystem`, `PortalSystem`

---

### Afterlife Processing

**Flow:**
```
Death
  ↓
DeathJudgmentSystem (Psychopomp conversation)
  ↓
Judgment → Afterlife assignment
  ↓
Transport to realm (Underworld, Celestial, Reincarnation queue)
  ↓
Afterlife existence (simplified needs)
  ↓
Transformation (become ancestor spirit, reincarnate, fade)
```

**Systems:**
- `AfterlifeNeedsSystem` - Spiritual needs for souls
- `AncestorTransformationSystem` - Souls → Ancestors
- `ReincarnationSystem` - Souls → New bodies
- `AfterlifeMemoryFadingSystem` - Memories decay in afterlife

---

### Integration Points

**With Divinity:**
- Gods reside in Celestial realm
- Underworld ruled by death god

**With Memory:**
- Afterlife memory fading
- Reincarnation memory carryover (partial)

**With Time:**
- Realm time dilation
- Sync with mortal world

---

## Research & Discovery

**Status:** ✅ Complete (Phase 13)
**Location:** `packages/core/src/research/`

### Overview

The research system enables knowledge progression, tech trees, and observation-driven learning.

### Components

**ResearchComponent:**
```typescript
{
  project: string,           // Current research project
  progress: number,          // 0.0 to 1.0
  researchers: string[],     // Agent IDs
  requiredSkills: { skill: level },
}
```

**UnlockComponent:**
```typescript
{
  unlocked: Set<string>,     // Recipe IDs, building IDs, etc.
  discoveredSpecies: Set<string>,
  knownTechnologies: Set<string>,
}
```

---

### Research Projects

**Types:**
- **Technology:** Unlock new buildings, tools
- **Recipe:** Discover new crafting recipes
- **Theory:** Abstract knowledge (enables future research)

**Requirements:**
- **Prerequisites:** Must have unlocked prior tech
- **Skills:** Researchers need minimum skill levels
- **Resources:** May require rare materials

**Progress:**
- Based on researcher skill, time, collaboration
- Multiple researchers → Faster progress
- Interruption → Progress decay (if not maintained)

---

### Discovery System

**Observation-Driven:**
- **Plant Discovery:** Harvest unknown species → Unlock knowledge
- **Animal Discovery:** Tame/observe new species → Learn behavior
- **Recipe Discovery:** Experiment with ingredients → Find new recipes

**System:** `PlantDiscoverySystem`, similar for animals

---

### Unlock Query Service

**Purpose:** Check if agent has unlocked something

**API:**
```typescript
UnlockQueryService.hasUnlocked(agentId, 'recipe:advanced_sword')
UnlockQueryService.canCraft(agentId, recipeId)
UnlockQueryService.getUnlockedRecipes(agentId)
```

**Integration:**
- CraftingSystem checks unlocks before allowing craft
- BuildingSystem checks before allowing construction
- UI shows only unlocked options

---

## Persistence System

**Status:** ⏳ Basic implementation, migrations pending (Phase 31)
**Location:** `packages/core/src/persistence/`

### Overview

The persistence system handles save/load with forward migrations, checksum validation, and multiple storage backends.

### Architecture

```
World State
    ↓
WorldSerializer (component serializers)
    ↓
Versioned JSON
    ↓
Storage Backend (IndexedDB, Memory, File)
    ↓
Checksum validation
```

---

### Serialization

**WorldSerializer:**
- Serializes all entities and components
- Versioned format (future-proof)
- Component-specific serializers

**Component Serialization:**
```typescript
{
  version: 2,                // Component format version
  type: 'agent',
  data: {
    behavior: 'gather',
    lastBehaviorChange: 12345,
  }
}
```

**Migration:**
- When loading v1 component in v2 world:
  - Migrator upgrades v1 → v2
  - Adds new fields with defaults
  - Transforms old fields

---

### Storage Backends

**IndexedDBStorage (browser):**
- Persistent storage in browser
- Async API
- Large capacity (50MB+)

**MemoryStorage (testing):**
- In-memory only
- Fast, no persistence
- For unit tests

**FileStorage (Node.js):**
- Save to JSON files
- Simple, human-readable
- Good for debugging

---

### Save/Load Flow

**Save:**
```typescript
await saveLoadService.save('my_save', {
  description: 'Village with 10 agents',
  screenshot: base64Image,
});
```

1. Serialize world → JSON
2. Calculate checksum
3. Write to storage backend
4. Update save metadata

**Load:**
```typescript
const result = await saveLoadService.load('my_save');
if (result.success) {
  world = result.world;
}
```

1. Read from storage
2. Verify checksum
3. Migrate components if needed
4. Deserialize → World

---

### Checksum Validation

**Purpose:** Detect corruption, ensure integrity

**Process:**
1. Serialize world → Canonical JSON (sorted keys)
2. Hash with SHA-256 → Checksum
3. Store checksum with save
4. On load: Recalculate, compare

**Mismatch:** Throws `ChecksumMismatchError` (save is corrupted)

---

### Integration Points

**With AutoSaveSystem:**
- Periodic auto-save (every 5 minutes)
- Rotation (keep last 5 auto-saves)

**With Multiverse:**
- Save multiple universes
- Universe forking requires save snapshot

---

## Agent AI System

**Status:** ✅ Complete
**Location:** `packages/core/src/systems/AgentBrainSystem.ts`, `packages/llm/`

### Overview

The Agent AI system drives agent behavior via LLM-powered decision-making.

### Architecture

```
Agent needs/context
    ↓
PromptBuilder (build prompt from world state)
    ↓
LLMQueue (batch, send to LLM)
    ↓
LLM response (behavior string)
    ↓
BehaviorParser (parse to action)
    ↓
Action enqueue
    ↓
Execute behavior (MovementSystem, etc.)
```

---

### Prompt Construction

**PromptBuilder:**

**Context Included:**
- **Agent State:** Name, species, needs (hunger, thirst, energy)
- **Inventory:** Items carried
- **Memory:** Recent episodic memories (last 10)
- **Spatial Memory:** Nearby resources, buildings
- **Relationships:** Friends, family, romantic partners
- **Skills:** Current skill levels
- **Goals:** Active goals
- **Time:** Current time of day, season
- **Weather:** Current weather

**Skill-Gated Context:**
- **Low Farming Skill:** Only sees basic plants
- **High Farming Skill:** Sees crop quality, disease, soil nutrients

**Example Prompt:**
```
You are Alice, a human villager.

Current State:
- Hunger: 0.6 (moderately hungry)
- Thirst: 0.3
- Energy: 0.8

Inventory:
- 5x wheat
- 1x wooden_axe

Nearby:
- Wheat field (45, 67)
- Bob (friend, at 50, 70)
- Forest (north)

Recent Memories:
- I harvested wheat at (45, 67)
- I talked to Bob about farming

Time: Day 3, 14:00 (afternoon)
Weather: Clear

What will you do next?
Valid behaviors: gather, socialize, craft, build, explore, rest
```

---

### LLM Queue

**Purpose:** Batch LLM requests for efficiency

**Features:**
- **Batching:** Combine multiple agent decisions in one LLM call
- **Priority:** Critical needs (starving) processed first
- **Retry:** Failed requests retried with exponential backoff
- **Fallback:** If LLM fails, use scripted decision

**Configuration:**
- **Batch Size:** Max requests per batch (default: 5)
- **Timeout:** Max wait before sending partial batch (default: 100ms)

---

### Behavior Parsing

**BehaviorParser:**

**Input:** LLM response string
```
"I'll gather wheat from the nearby field to satisfy my hunger."
```

**Output:** Structured action
```typescript
{
  behavior: 'gather',
  target: { x: 45, y: 67 },
  resourceType: 'wheat',
}
```

**Fallback:** If parse fails, default to safe behavior (wander, rest)

---

### Decision Flow

**Autonomic Override:**
```typescript
if (hunger > 0.8 || thirst > 0.8 || energy < 0.2) {
  // Critical need, skip LLM, use autonomic behavior
  return 'gather_food' | 'drink' | 'sleep';
}
```

**LLM Decision:**
```typescript
if (needsLLMDecision(agent)) {
  enqueueDecision(agent);
  // Will be processed in next LLM batch
}
```

**Scripted Fallback:**
```typescript
if (llmFailed(agent)) {
  return scriptedDecision(agent); // Simple state machine
}
```

---

### Integration Points

**With Memory System:**
- Memories included in prompt
- Decisions create new memories

**With Skills:**
- Skill levels filter available actions
- Skill progression from repeated actions

**With Needs:**
- Needs drive behavior selection
- Autonomic system overrides for critical needs

---

## Memory System

**Status:** ✅ Complete
**Location:** `packages/core/src/systems/Memory*.ts`, `packages/core/src/components/*Memory*.ts`

### Overview

The memory system provides episodic (event), semantic (fact), and spatial (location) memory for agents.

### Architecture

```
Event occurs
    ↓
MemoryFormationSystem creates episodic memory
    ↓
MemoryConsolidationSystem promotes to semantic (over time)
    ↓
SpatialMemoryQuerySystem indexes by location
    ↓
ReflectionSystem forms beliefs from memories
```

---

### Episodic Memory

**Component:** `EpisodicMemoryComponent`

**Purpose:** "I did X at time T"

**Structure:**
```typescript
{
  id: string,
  description: "I harvested wheat at (45, 67)",
  tick: 12345,
  location: { x: 45, y: 67 },
  participants: ['bob_id'],  // Others involved
  importance: 0.7,           // How significant
  emotional: 0.5,            // -1 (negative) to 1 (positive)
}
```

**Formation:**
- Event listeners on EventBus create memories
- `plant_harvested` → "I harvested wheat"
- `agent_conversation` → "I talked to Bob about farming"

**Decay:**
- Importance decays over time
- Emotional memories decay slower
- Sleep consolidates (transfers to semantic)

---

### Semantic Memory

**Component:** `SemanticMemoryComponent`

**Purpose:** "Wheat grows in summer" (general knowledge)

**Structure:**
```typescript
{
  statement: "Wheat grows best in summer",
  confidence: 0.9,           // 0.0 to 1.0
  source: 'observed',        // 'observed', 'told', 'inferred'
  learnedAt: 10000,          // Tick learned
}
```

**Consolidation:**
- Repeated episodic memories → Semantic fact
  - "I harvested wheat in summer" (3 times) → "Wheat grows in summer"
- Social learning: Told by trusted agent → Semantic fact

---

### Spatial Memory

**Component:** `SpatialMemoryComponent`

**Purpose:** "There's a wheat field at (45, 67)"

**Structure:**
```typescript
{
  knownTiles: Set(['45,67', '46,67', ...]),
  landmarks: [
    { name: 'Wheat Field', location: {x: 45, y: 67}, type: 'resource' }
  ],
  resourceLocations: Map({
    'wheat': [{x: 45, y: 67}, {x: 50, y: 70}],
    'stone': [{x: 20, y: 30}],
  }),
}
```

**Query:**
- "Where is wheat?" → List of known wheat locations
- "What's at (45, 67)?" → "Wheat Field" landmark

**System:** `SpatialMemoryQuerySystem` (grid-based indexing for fast queries)

---

### Reflection & Belief Formation

**Component:** `ReflectionComponent`, `BeliefComponent`

**System:** `ReflectionSystem`, `BeliefFormationSystem`

**Process:**
1. Periodic reflection (end of day, after significant event)
2. Analyze recent memories
3. Form insights: "I'm good at farming" (many successful harvests)
4. Update beliefs: "Farming is rewarding" (positive emotional memories)

**Beliefs:**
```typescript
{
  statement: "Farming is rewarding",
  strength: 0.8,             // Conviction
  evidence: [memory_ids],    // Supporting memories
}
```

---

### Integration Points

**With Agent AI:**
- Memories in LLM prompt
- Beliefs influence decisions

**With Social:**
- Shared memories strengthen relationships
- Conflicting memories → Verification

**With Divinity:**
- Divine visions → Episodic memories
- Faith beliefs separate from empirical beliefs

---

## Conclusion

This guide covers the major metasystems in the AI Village game engine. Each system is designed to be modular and extensible, allowing for complex emergent behaviors while maintaining clear separation of concerns.

For specific implementation details, refer to:
- [ARCHITECTURE_OVERVIEW.md](./ARCHITECTURE_OVERVIEW.md) - Overall structure
- [SYSTEMS_CATALOG.md](./SYSTEMS_CATALOG.md) - Complete system reference
- [COMPONENTS_REFERENCE.md](./COMPONENTS_REFERENCE.md) - Component specifications
- [MASTER_ROADMAP.md](../MASTER_ROADMAP.md) - Implementation status

---

**End of Metasystems Guide**
