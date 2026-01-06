# Systems Catalog

> **Last Updated:** 2026-01-04
> **Purpose:** Complete reference of all 211+ game systems

## Overview

This document catalogs every system in the game engine. Systems are organized by category and include:
- **Purpose**: What the system does
- **Components**: Which components it operates on
- **Priority**: Execution order (lower runs first)
- **Throttle**: Update interval (if not every tick)
- **Location**: Source file path

---

## Table of Contents

1. [Time & Environment](#time--environment)
2. [Plants](#plants)
3. [Animals](#animals)
4. [Agent Core](#agent-core)
5. [Memory & Cognition](#memory--cognition)
6. [Social & Communication](#social--communication)
7. [Exploration & Navigation](#exploration--navigation)
8. [Building & Construction](#building--construction)
9. [Economy & Trade](#economy--trade)
10. [Skills & Crafting](#skills--crafting)
11. [Research](#research)
12. [Magic](#magic)
13. [Combat & Security](#combat--security)
14. [Body & Reproduction](#body--reproduction)
15. [Divinity - Core](#divinity---core)
16. [Divinity - Institutions](#divinity---institutions)
17. [Divinity - Avatar & Angels](#divinity---avatar--angels)
18. [Divinity - Advanced Theology](#divinity---advanced-theology)
19. [Divinity - World Impact](#divinity---world-impact)
20. [Divinity - Creator](#divinity---creator)
21. [Realms & Portals](#realms--portals)
22. [Automation & Factories](#automation--factories)
23. [Governance & Metrics](#governance--metrics)
24. [Consciousness](#consciousness)
25. [Utility Systems](#utility-systems)

---

## Time & Environment

### TimeSystem
**Purpose:** Advances game time (tick → minute → hour → day)
**Components:** `time` (singleton)
**Priority:** 10 (runs first)
**Dependencies:** None (runs first)
**File:** `systems/TimeSystem.ts`

**Responsibilities:**
- Increment tick counter
- Update hour, day, season
- Calculate time of day (dawn/day/dusk/night)
- Track in-game date

---

### WeatherSystem
**Purpose:** Simulates weather patterns (rain, snow, clear)
**Components:** `weather` (singleton)
**Priority:** 15
**Dependencies:** `TimeSystem`
**Throttle:** Every 100 ticks (~5 seconds)
**File:** `systems/WeatherSystem.ts`

**Responsibilities:**
- Random weather transitions
- Temperature effects on precipitation
- Weather duration tracking

---

### TemperatureSystem
**Purpose:** Simulates ambient temperature, agent comfort
**Components:** `temperature`, `agent`, `needs`, `position`
**Priority:** 20
**Dependencies:** `TimeSystem`, `WeatherSystem`
**File:** `systems/TemperatureSystem.ts`

**Responsibilities:**
- Calculate ambient temperature (season, time of day, weather)
- Agent thermal comfort
- Building insulation effects
- Hypothermia/hyperthermia risks

---

### SoilSystem
**Purpose:** Soil moisture, nutrient management
**Components:** Operates on tiles
**Priority:** 25
**Dependencies:** `TimeSystem`, `WeatherSystem`
**Throttle:** Every 20 ticks (~1 second)
**File:** `systems/SoilSystem.ts`

**Responsibilities:**
- Moisture evaporation/absorption
- Nutrient decay over time
- Rain replenishment
- Tilling effects on fertility

---

### ClimateSystem
**Purpose:** Long-term climate patterns, seasons
**Components:** `climate` (singleton)
**Priority:** 35
**Throttle:** Every 200 ticks (~10 seconds)
**File:** `systems/ClimateSystem.ts`

**Responsibilities:**
- Seasonal temperature curves
- Precipitation patterns
- Climate zones (biome-based)

---

## Plants

### PlantSystem
**Purpose:** Plant lifecycle (growth, flowering, fruiting, death)
**Components:** `plant`, `position`
**Priority:** 40
**Dependencies:** `TimeSystem`, `WeatherSystem`, `SoilSystem`
**File:** `systems/PlantSystem.ts`

**Responsibilities:**
- Growth stages (seedling → mature → flowering → fruiting → senescent)
- Water/nutrient consumption
- Harvest generation
- Death from neglect/disease

---

### PlantDiscoverySystem
**Purpose:** Agents discover new plant species
**Components:** `agent`, `position`, `episodic_memory`, `inventory`
**Priority:** 45
**Dependencies:** None (event-driven)
**File:** `systems/PlantDiscoverySystem.ts`

**Responsibilities:**
- Detect when agent harvests unknown species
- Generate species knowledge
- Create discovery memories
- Unlock new seeds

---

### PlantDiseaseSystem
**Purpose:** Plant diseases and pests
**Components:** `plant`, `disease`, `position`
**Priority:** 50
**Dependencies:** `PlantSystem`
**Throttle:** Every 50 ticks (~2.5 seconds)
**File:** `systems/PlantDiseaseSystem.ts`

**Responsibilities:**
- Disease spread (contagion radius)
- Pest infestations
- Plant health degradation
- Treatment effects

---

## Animals

### AnimalSystem
**Purpose:** Animal lifecycle, basic needs
**Components:** `animal`, `position`, `needs`
**Priority:** 55
**File:** `systems/AnimalSystem.ts`

**Responsibilities:**
- Hunger/thirst degradation
- Age progression
- Natural death
- Movement constraints

---

### AnimalBrainSystem
**Purpose:** Animal AI behaviors
**Components:** `animal`, `position`, `velocity`, `steering`
**Priority:** 56
**File:** `behavior/animal-behaviors/AnimalBrainSystem.ts`

**Behaviors:**
- Graze (herbivores seek food)
- Flee (prey flee predators)
- Rest (low energy recovery)
- Idle (wander)

---

### AnimalProductionSystem
**Purpose:** Animal resource production (eggs, milk, wool)
**Components:** `animal`, `production`
**Priority:** 60
**Throttle:** Every 100 ticks (~5 seconds)
**File:** `systems/AnimalProductionSystem.ts`

**Responsibilities:**
- Accumulate production points (based on feed quality)
- Generate products when threshold reached
- Place products in world or inventory

---

### AnimalHousingSystem
**Purpose:** Animals in pens, coops, barns
**Components:** `animal`, `position`, `building`
**Priority:** 65
**File:** `systems/AnimalHousingSystem.ts`

**Responsibilities:**
- Assign animals to housing
- Shelter benefits (warmth, protection)
- Overcrowding penalties
- Auto-feeding from troughs

---

### WildAnimalSpawningSystem
**Purpose:** Spawn wild animals on map
**Components:** None (creates entities)
**Priority:** 70
**Throttle:** Every 200 ticks (~10 seconds)
**File:** `systems/WildAnimalSpawningSystem.ts`

**Responsibilities:**
- Spawn deer, rabbits in forest biomes
- Respect max population
- Avoid spawning near agents

---

### TamingSystem
**Purpose:** Domesticate wild animals
**Components:** `animal`, `taming`, `agent`
**Priority:** 75
**File:** `systems/TamingSystem.ts`

**Responsibilities:**
- Track taming progress (feeding, petting)
- Convert wild → domestic
- Loyalty bonding

---

## Agent Core

### IdleBehaviorSystem
**Purpose:** Default behaviors when agents have no action
**Components:** `agent`, `behavior`, `position`
**Priority:** 80
**File:** `systems/IdleBehaviorSystem.ts`

**Responsibilities:**
- Assign idle behavior if no current action
- Defaults: wander, socialize, observe
- Prevent agents from "freezing"

---

### GoalGenerationSystem
**Purpose:** Generate goals for agents based on needs/context
**Components:** `agent`, `needs`, `goals`
**Priority:** 85
**File:** `systems/GoalGenerationSystem.ts`

**Responsibilities:**
- Analyze needs (hunger → gather food)
- Context-based goals (see empty storage → craft tools)
- Priority ordering

---

### AgentBrainSystem
**Purpose:** LLM-driven agent decision-making
**Components:** `agent`, `behavior`, `position`, `memory`, `needs`, etc.
**Priority:** 90
**File:** `systems/AgentBrainSystem.ts`

**Responsibilities:**
- Build prompt from agent context
- Query LLM for behavior
- Parse response to action
- Enqueue action
- Handle failures

**Dependencies:** Requires `llmQueue` and `promptBuilder` from `@ai-village/llm`

---

### MovementSystem
**Purpose:** Apply velocity to position
**Components:** `position`, `velocity`
**Priority:** 100
**File:** `systems/MovementSystem.ts`

**Responsibilities:**
- Update position: `pos += velocity * dt`
- Clamp to world bounds
- Collision detection (basic)

---

### SteeringSystem
**Purpose:** Apply steering forces to velocity
**Components:** `steering`, `velocity`, `position`
**Priority:** 95
**File:** `systems/SteeringSystem.ts`

**Responsibilities:**
- Seek target position
- Arrive at target (slow down near destination)
- Avoid obstacles
- Wander (random walk)
- Apply forces to velocity

---

### NeedsSystem
**Purpose:** Degrade agent needs over time
**Components:** `needs`, `agent`
**Priority:** 105
**File:** `systems/NeedsSystem.ts`

**Responsibilities:**
- Hunger/thirst/energy decay
- Cleanliness degradation
- Social need increase (loneliness)
- Death from starvation/dehydration

---

### MoodSystem
**Purpose:** Calculate agent mood from needs
**Components:** `mood`, `needs`, `agent`
**Priority:** 110
**File:** `systems/MoodSystem.ts`

**Responsibilities:**
- Mood = f(hunger, energy, social, cleanliness)
- Negative moods (angry, sad, anxious)
- Positive moods (happy, content, excited)

---

### SleepSystem
**Purpose:** Manage agent sleep behavior, energy recovery, and circadian rhythms
**Components:** `agent`, `needs`, `behavior`, `circadian`
**Priority:** 115
**File:** `systems/SleepSystem.ts`

**Responsibilities:**
- Update sleep drive based on time awake/asleep (circadian rhythm)
- Restore energy while sleeping
- Apply sleep quality modifiers
- Generate dreams from recent memories
- Wake up when energy full or interrupted
- Sleep location (bed vs ground)
- Track circadian phase (morning alertness, evening drowsiness)

---

## Memory & Cognition

### MemorySystem
**Purpose:** Decay old memories, manage memory capacity
**Components:** `episodic_memory`, `semantic_memory`, `spatial_memory`
**Priority:** 120
**Throttle:** Every 100 ticks (~5 seconds)
**File:** `systems/MemorySystem.ts`

**Responsibilities:**
- Fade old episodic memories
- Prune low-importance memories
- Maintain memory capacity limits

---

### MemoryFormationSystem
**Purpose:** Create episodic memories from events
**Components:** `agent`, `episodic_memory`, `position`
**Priority:** 125
**File:** `systems/MemoryFormationSystem.ts`

**Event Listeners:**
- `plant_harvested` → "I harvested wheat"
- `agent_conversation` → "I talked to Alice"
- `building_completed` → "I finished the house"

---

### MemoryConsolidationSystem
**Purpose:** Promote episodic → semantic memory
**Components:** `episodic_memory`, `semantic_memory`
**Priority:** 130
**Throttle:** Every 1000 ticks (~50 seconds)
**File:** `systems/MemoryConsolidationSystem.ts`

**Responsibilities:**
- Find repeated episodic patterns
- Create semantic facts ("Wheat grows in summer")
- Sleep-based consolidation bonus

---

### SpatialMemoryQuerySystem
**Purpose:** Index memories by location for efficient queries
**Components:** `spatial_memory`, `position`
**Priority:** 135
**File:** `systems/SpatialMemoryQuerySystem.ts`

**Responsibilities:**
- Build spatial index (grid-based)
- Query "what happened here?"
- Query "where did I see X?"

---

### ReflectionSystem
**Purpose:** Agents reflect on experiences, form beliefs
**Components:** `reflection`, `episodic_memory`, `semantic_memory`
**Priority:** 140
**Throttle:** Every 500 ticks (~25 seconds)
**File:** `systems/ReflectionSystem.ts`

**Responsibilities:**
- Periodic reflection (end of day)
- Analyze recent memories
- Form/update beliefs
- Self-awareness

---

### JournalingSystem
**Purpose:** Agents write journal entries
**Components:** `journaling`, `episodic_memory`, `agent`
**Priority:** 145
**Throttle:** Every 1440 ticks (1 day)
**File:** `systems/JournalingSystem.ts`

**Responsibilities:**
- Daily journal prompts
- Summarize day's events
- Emotional processing
- Long-term memory aid

---

### BeliefFormationSystem
**Purpose:** Form beliefs from observations
**Components:** `belief`, `episodic_memory`, `agent`
**Priority:** 150
**File:** `systems/BeliefFormationSystem.ts`

**Responsibilities:**
- Detect patterns in memories
- Create belief statements
- Belief strength (confidence)
- Belief updating (Bayesian-ish)

---

### BeliefGenerationSystem
**Purpose:** Generate beliefs about deities
**Components:** `belief`, `deity`, `agent`
**Priority:** 155
**File:** `systems/BeliefGenerationSystem.ts`

**Responsibilities:**
- Faith generation from prayer
- Belief in divine powers
- Attribution (god caused event?)

---

## Social & Communication

### CommunicationSystem
**Purpose:** Handle agent speech, conversations
**Components:** `agent`, `conversation`, `position`
**Priority:** 160
**File:** `systems/CommunicationSystem.ts`

**Responsibilities:**
- Process speak actions
- Create conversation entities
- Emit speech events
- Hearing range checks

---

### SocialGradientSystem
**Purpose:** Agents attracted to social hubs
**Components:** `social_gradient`, `position`
**Priority:** 165
**File:** `systems/SocialGradientSystem.ts`

**Responsibilities:**
- Calculate social density gradients
- Guide agents toward gatherings
- Loneliness seeking

---

### VerificationSystem
**Purpose:** Verify information between agents
**Components:** `agent`, `semantic_memory`, `conversation`
**Priority:** 170
**File:** `systems/VerificationSystem.ts`

**Responsibilities:**
- Cross-check facts in conversations
- Build consensus knowledge
- Rumor spread vs truth

---

### InterestsSystem
**Purpose:** Track agent interests, hobbies
**Components:** `interests`, `agent`, `episodic_memory`
**Priority:** 175
**File:** `systems/InterestsSystem.ts`

**Responsibilities:**
- Derive interests from activities
- Interest strength (passion)
- Shared interests (social bonding)

---

### ChatRoomSystem
**Purpose:** General chat system (DMs, groups, divine chat)
**Components:** `chat_room`, `chat_participant`
**Priority:** 180
**File:** `communication/ChatRoomSystem.ts`

**Responsibilities:**
- Create/manage chat rooms
- Message delivery
- Typing indicators
- Notifications

---

## Exploration & Navigation

### ExplorationSystem
**Purpose:** Track explored areas, frontier
**Components:** `exploration`, `position`, `agent`
**Priority:** 185
**File:** `systems/ExplorationSystem.ts`

**Responsibilities:**
- Mark tiles as explored
- Track exploration percentage
- Frontier detection (unexplored borders)

---

### LandmarkNamingSystem
**Purpose:** Name geographic features (LLM-generated)
**Components:** `landmark`, `position`
**Priority:** 190
**File:** `systems/LandmarkNamingSystem.ts`

**Responsibilities:**
- Detect nameable features (mountains, lakes)
- Generate names via LLM
- Create landmark entities

**Dependencies:** Requires `llmQueue`

---

## Building & Construction

### BuildingSystem
**Purpose:** Construction, progress tracking
**Components:** `building`, `position`, `construction`
**Priority:** 195
**File:** `systems/BuildingSystem.ts`

**Responsibilities:**
- Track construction progress
- Resource consumption
- Complete building
- Building activation

---

### BuildingMaintenanceSystem
**Purpose:** Decay, repair, upkeep
**Components:** `building`, `maintenance`, `durability`
**Priority:** 200
**Throttle:** Every 200 ticks (~10 seconds)
**File:** `systems/BuildingMaintenanceSystem.ts`

**Responsibilities:**
- Decay condition over time
- Weather damage
- Repair actions
- Collapse if neglected

---

### BuildingSpatialAnalysisSystem
**Purpose:** Analyze building placement, Feng Shui
**Components:** `building`, `position`
**Priority:** 205
**File:** `systems/BuildingSpatialAnalysisSystem.ts`

**Responsibilities:**
- Placement scoring
- Nearby resource checks
- Aesthetic harmony
- Traffic flow analysis

---

### ResourceGatheringSystem
**Purpose:** Gather resources from world
**Components:** `agent`, `inventory`, `position`
**Priority:** 210
**File:** `systems/ResourceGatheringSystem.ts`

**Responsibilities:**
- Process gather actions
- Check gather skill
- Add resources to inventory
- Deplete resource nodes

---

### TreeFellingSystem
**Purpose:** Cut down trees for wood
**Components:** `tree`, `position`, `agent`
**Priority:** 215
**File:** `systems/TreeFellingSystem.ts`

**Responsibilities:**
- Tree health degradation (chopping)
- Drop wood on death
- Remove tree entity
- Skill-based efficiency

---

### TileConstructionSystem
**Purpose:** Tile-based voxel building (walls, floors, doors)
**Components:** `position`, `tile_construction`
**Priority:** 220
**File:** `systems/TileConstructionSystem.ts`

**Responsibilities:**
- Place walls, floors, doors, windows
- Track construction progress (per-tile)
- Material consumption
- Complete tile construction

**Note:** Singleton pattern (use `getTileConstructionSystem()`)

---

### DoorSystem
**Purpose:** Auto-open/close doors for agents
**Components:** `door`, `position`, `agent`
**Priority:** 225
**File:** `systems/DoorSystem.ts`

**Responsibilities:**
- Detect agents near doors
- Open door (tile state change)
- Auto-close after timeout
- Locked door checks

---

## Economy & Trade

### TradingSystem
**Purpose:** Agent-to-agent trading
**Components:** `agent`, `inventory`, `trade`
**Priority:** 230
**File:** `systems/TradingSystem.ts`

**Responsibilities:**
- Process trade offers
- Calculate prices
- Execute trades (swap items)
- Reputation effects

---

### MarketEventSystem
**Purpose:** Market events (supply/demand fluctuations)
**Components:** `market`, `economy`
**Priority:** 235
**Throttle:** Every 500 ticks (~25 seconds)
**File:** `systems/MarketEventSystem.ts`

**Responsibilities:**
- Random market events (surplus, shortage)
- Price adjustments
- Broadcast market news

---

### CurrencySystem
**Purpose:** Money supply, inflation
**Components:** `currency`, `wallet`
**Priority:** 240
**File:** `systems/CurrencySystem.ts`

**Responsibilities:**
- Track currency in circulation
- Inflation/deflation
- Minting, burning currency

---

## Skills & Crafting

### SkillSystem
**Purpose:** Skill progression, XP tracking
**Components:** `skills`, `agent`
**Priority:** 245
**File:** `systems/SkillSystem.ts`

**Responsibilities:**
- Grant XP from actions
- Level up skills
- Unlock abilities at milestones
- Skill decay (optional)

---

### CookingSystem
**Purpose:** Cook food items
**Components:** `agent`, `inventory`, `cooking`
**Priority:** 250
**File:** `systems/CookingSystem.ts`

**Responsibilities:**
- Process cook actions
- Check recipes
- Create cooked food
- Quality based on skill

---

### DurabilitySystem
**Purpose:** Tool/equipment durability
**Components:** `durability`, `item`, `inventory`
**Priority:** 255
**File:** `systems/DurabilitySystem.ts`

**Responsibilities:**
- Degrade durability on use
- Break items at 0 durability
- Repair actions

---

### CraftingSystem
**Purpose:** Recipe-based crafting
**Components:** `agent`, `inventory`, `crafting_job`
**Priority:** 260
**File:** `crafting/CraftingSystem.ts`

**Responsibilities:**
- Check recipe requirements
- Consume ingredients
- Create output items
- Quality calculation

---

## Research

### ResearchSystem
**Purpose:** Research projects, tech progression
**Components:** `research`, `agent`, `building`
**Priority:** 265
**File:** `systems/ResearchSystem.ts`

**Responsibilities:**
- Track research progress
- Unlock new recipes/buildings
- Discovery events
- Collaboration bonuses

**Status:** ✅ Complete (Phase 13)

---

## Magic

### MagicSystem
**Purpose:** Cast spells, manage mana
**Components:** `magic`, `mana`, `spell_casting`
**Priority:** 270
**File:** `systems/MagicSystem.ts`

**Responsibilities:**
- Process cast spell actions
- Check mana cost
- Execute spell effects
- Paradigm-based rules

**Status:** ⚠️ Framework exists, paradigms incomplete (Phase 30)

---

## Combat & Security

### AgentCombatSystem
**Purpose:** Agent-vs-agent combat
**Components:** `agent`, `combat`, `health`, `position`
**Priority:** 275
**File:** `systems/AgentCombatSystem.ts`

**Responsibilities:**
- Process attack actions
- Damage calculation
- Death handling
- Combat log

---

### HuntingSystem
**Purpose:** Hunt wild animals
**Components:** `agent`, `animal`, `hunting`, `position`
**Priority:** 280
**File:** `systems/HuntingSystem.ts`

**Responsibilities:**
- Track hunting target
- Range checks
- Kill animal
- Butcher corpse
- Grant hunting XP

---

### PredatorAttackSystem
**Purpose:** Wild predators attack agents
**Components:** `animal`, `predator`, `agent`, `position`
**Priority:** 285
**File:** `systems/PredatorAttackSystem.ts`

**Responsibilities:**
- Detect nearby prey
- Attack decision
- Damage agent
- Flee behavior

---

### DominanceChallengeSystem
**Purpose:** Social dominance fights
**Components:** `agent`, `dominance`, `combat`
**Priority:** 290
**File:** `systems/DominanceChallengeSystem.ts`

**Responsibilities:**
- Challenge strong agents
- Fight for dominance
- Hierarchy updates
- Respect mechanics

---

### InjurySystem
**Purpose:** Track injuries, healing
**Components:** `injury`, `health`, `agent`
**Priority:** 295
**File:** `systems/InjurySystem.ts`

**Responsibilities:**
- Create injury components from damage
- Healing over time
- Infection risk
- Disability effects

---

### GuardDutySystem
**Purpose:** Guards patrol, defend territory
**Components:** `guard`, `agent`, `position`
**Priority:** 300
**File:** `systems/GuardDutySystem.ts`

**Responsibilities:**
- Assign patrol routes
- Detect intruders
- Engage threats
- Alert other guards

---

### VillageDefenseSystem
**Purpose:** Coordinate village defense
**Components:** `village`, `agent`, `defense`
**Priority:** 305
**File:** `systems/VillageDefenseSystem.ts`

**Responsibilities:**
- Detect raids/attacks
- Rally defenders
- Fortification bonuses
- Victory/defeat conditions

---

## Body & Reproduction

### BodySystem
**Purpose:** Physical body simulation (limbs, organs)
**Components:** `body`, `health`, `injury`
**Priority:** 310
**File:** `systems/BodySystem.ts`

**Responsibilities:**
- Body part tracking
- Targeted injuries
- Prosthetics/augmentation
- Species-specific bodies

**Status:** ✅ Basic implementation, genetics integration pending

---

### EquipmentSystem
**Purpose:** Equip armor, weapons, clothing
**Components:** `equipment`, `inventory`, `body`
**Priority:** 315
**File:** `systems/EquipmentSystem.ts`

**Responsibilities:**
- Equip/unequip items
- Slot validation (head, body, hands, feet)
- Stats bonuses (armor, damage)
- Layering (underwear → shirt → coat)

**Status:** ⏳ Ready to implement (Phase 36)

---

### ReproductionSystem
**Purpose:** Pregnancy, gestation, birth
**Components:** `pregnancy`, `reproduction`, `agent`
**Priority:** 320
**File:** `systems/ReproductionSystem.ts`

**Responsibilities:**
- Gestation progress
- Health effects on mother
- Birth timing
- Offspring creation

**Status:** ✅ Complete (Phase 37)

---

### CourtshipSystem
**Purpose:** Mate selection, courtship displays
**Components:** `courtship`, `agent`, `relationship`
**Priority:** 325
**File:** `systems/CourtshipSystem.ts`

**Responsibilities:**
- Courtship state machine
- Compatibility checks
- Display actions
- Mate acceptance/rejection

**Status:** ✅ Complete (Phase 37)

---

### MidwiferySystem
**Purpose:** Labor, delivery, complications
**Components:** `labor`, `pregnancy`, `midwife`, `agent`
**Priority:** 330
**File:** `reproduction/midwifery/MidwiferySystem.ts`

**Responsibilities:**
- Detect labor onset
- Delivery progress
- Complications (breech, hemorrhage)
- Midwife assistance
- Infant creation

**Status:** ✅ Complete (Phase 37)

---

### ParentingSystem
**Purpose:** Child care, bonding, teaching
**Components:** `parenting`, `infant`, `child`, `agent`
**Priority:** 335
**File:** `systems/ParentingSystem.ts`

**Responsibilities:**
- Parent-child bonding
- Feeding, cleaning, playing
- Skill teaching
- Discipline

**Status:** ✅ Complete (Phase 37)

---

### JealousySystem
**Purpose:** Romantic jealousy, mate guarding
**Components:** `jealousy`, `relationship`, `agent`
**Priority:** 340
**File:** `systems/JealousySystem.ts`

**Responsibilities:**
- Detect rival courtship
- Jealousy emotions
- Confrontation actions

**Status:** ⚠️ Incomplete implementation, disabled

---

## Divinity - Core

### DeityEmergenceSystem
**Purpose:** Gods emerge from collective belief
**Components:** `deity`, `belief`, `emergence`
**Priority:** 345
**File:** `systems/DeityEmergenceSystem.ts`

**Responsibilities:**
- Aggregate belief from agents
- Threshold-based emergence
- Deity identity formation
- Domain assignment

---

### AIGodBehaviorSystem
**Purpose:** AI-controlled god decision-making
**Components:** `deity`, `ai_god`, `belief`
**Priority:** 350
**File:** `systems/AIGodBehaviorSystem.ts`

**Responsibilities:**
- God personality
- Power usage decisions
- Worshipper interactions
- Pantheon politics

---

### DivinePowerSystem
**Purpose:** Execute divine powers (blessings, curses, miracles)
**Components:** `deity`, `divine_power`, `belief`
**Priority:** 355
**File:** `systems/DivinePowerSystem.ts`

**Responsibilities:**
- Validate power usage (cost, range)
- Execute effects
- Belief consumption
- Power cooldowns

---

### FaithMechanicsSystem
**Purpose:** Faith generation, decay, allocation
**Components:** `belief`, `agent`, `deity`
**Priority:** 360
**File:** `systems/FaithMechanicsSystem.ts`

**Responsibilities:**
- Daily faith generation
- Decay over time
- Multi-deity allocation
- Faith transfers (conversion)

---

### PrayerSystem
**Purpose:** Process prayers from agents
**Components:** `prayer`, `agent`, `deity`
**Priority:** 365
**File:** `systems/PrayerSystem.ts`

**Responsibilities:**
- Receive prayer requests
- Route to deity
- Track prayer history
- Emotional state effects

---

### PrayerAnsweringSystem
**Purpose:** Gods answer prayers (LLM-generated)
**Components:** `prayer`, `deity`, `agent`
**Priority:** 370
**File:** `systems/PrayerAnsweringSystem.ts`

**Responsibilities:**
- Filter prayers by domain
- Generate responses via LLM
- Deliver visions/blessings
- Track answer rate

**Dependencies:** Requires `llmQueue`

---

### MythGenerationSystem
**Purpose:** Generate myths about gods (LLM)
**Components:** `myth`, `deity`, `agent`
**Priority:** 375
**Throttle:** Every 1000 ticks (~50 seconds)
**File:** `systems/MythGenerationSystem.ts`

**Responsibilities:**
- Trigger myth generation (divine events)
- Prompt LLM with context
- Create myth entities
- Cultural transmission

**Dependencies:** Requires `llmQueue`

---

### DivineChatSystem
**Purpose:** God-to-god chat (DEPRECATED, use ChatRoomSystem)
**Components:** `deity`, `divine_chat`
**Priority:** 380
**File:** `systems/DivineChatSystem.ts`

**Responsibilities:**
- Wrapper around ChatRoomSystem
- Backwards compatibility

---

## Divinity - Institutions

### TempleSystem
**Purpose:** Temples, shrines, sacred sites
**Components:** `temple`, `building`, `deity`
**Priority:** 385
**File:** `systems/TempleSystem.ts`

**Responsibilities:**
- Temple construction
- Faith bonuses (proximity)
- Pilgrimage destination
- Offerings, donations

---

### PriesthoodSystem
**Purpose:** Priests, religious hierarchy
**Components:** `priest`, `agent`, `deity`
**Priority:** 390
**File:** `systems/PriesthoodSystem.ts`

**Responsibilities:**
- Ordination
- Priestly duties (lead rituals)
- Faith amplification
- Theological debates

---

### RitualSystem
**Purpose:** Religious rituals, ceremonies
**Components:** `ritual`, `agent`, `deity`
**Priority:** 395
**File:** `systems/RitualSystem.ts`

**Responsibilities:**
- Schedule rituals (daily, seasonal)
- Participation mechanics
- Ritual effects (blessings, miracles)
- Ritual quality (preparation)

---

### HolyTextSystem
**Purpose:** Sacred texts, scripture
**Components:** `holy_text`, `deity`, `religion`
**Priority:** 400
**File:** `systems/HolyTextSystem.ts`

**Responsibilities:**
- Text creation (canonical vs apocryphal)
- Interpretation variance
- Schism fuel
- Distribution, literacy

---

### SacredSiteSystem
**Purpose:** Sacred groves, mountains, springs
**Components:** `sacred_site`, `position`, `deity`
**Priority:** 405
**File:** `systems/SacredSiteSystem.ts`

**Responsibilities:**
- Mark tiles as sacred
- Pilgrimage bonuses
- Desecration penalties
- Divine presence

---

## Divinity - Avatar & Angels

### AvatarSystem
**Purpose:** God avatars in mortal world
**Components:** `avatar`, `deity`, `position`
**Priority:** 410
**File:** `systems/AvatarSystem.ts`

**Responsibilities:**
- Manifest avatar (belief cost)
- Avatar movement, actions
- Mortal interaction
- Maintenance cost
- Withdrawal (forced at 0 belief)

---

### AngelSystem
**Purpose:** Divine servants, messengers
**Components:** `angel`, `deity`, `position`
**Priority:** 415
**File:** `systems/AngelSystem.ts`

**Responsibilities:**
- Create angels
- Delegate tasks (prayer answering)
- Angel autonomy (personality)
- Maintenance cost

**Status:** ✅ Complete (Phase 28)

---

### PossessionSystem
**Purpose:** God possesses mortal agent
**Components:** `possession`, `agent`, `deity`
**Priority:** 420
**File:** `systems/PossessionSystem.ts`

**Responsibilities:**
- Take control of agent
- Player input while possessed
- Belief cost
- Possession duration

---

### PlayerInputSystem
**Purpose:** Process player input (keyboard, mouse)
**Components:** `player_controlled`, `position`, `velocity`
**Priority:** 425
**File:** `systems/PlayerInputSystem.ts`

**Responsibilities:**
- Read input events
- Move controlled entity
- Trigger actions
- Camera follow

---

## Divinity - Advanced Theology

### SchismSystem
**Purpose:** Religious splits, heresies
**Components:** `schism`, `religion`, `deity`
**Priority:** 430
**File:** `systems/SchismSystem.ts`

**Responsibilities:**
- Detect theological disputes
- Split religion into factions
- Schismatic beliefs
- Excommunication

---

### SyncretismSystem
**Purpose:** Religious fusion, blending
**Components:** `syncretism`, `religion`, `deity`
**Priority:** 435
**File:** `systems/SyncretismSystem.ts`

**Responsibilities:**
- Merge religions
- Shared practices
- Hybrid deities
- Cultural exchange

---

### ReligiousCompetitionSystem
**Purpose:** Religions compete for followers
**Components:** `religion`, `agent`, `belief`
**Priority:** 440
**File:** `systems/ReligiousCompetitionSystem.ts`

**Responsibilities:**
- Proselytization
- Conversion pressure
- Popularity contests
- Resource competition

---

### ConversionWarfareSystem
**Purpose:** Forced conversion, religious wars
**Components:** `religion`, `combat`, `conversion`
**Priority:** 445
**File:** `systems/ConversionWarfareSystem.ts`

**Responsibilities:**
- Religious casus belli
- Conversion by sword
- Martyrdom
- Religious tolerance vs persecution

---

## Divinity - World Impact

### TerrainModificationSystem
**Purpose:** Gods reshape terrain
**Components:** `deity`, `terrain_modification`, `tile`
**Priority:** 450
**File:** `systems/TerrainModificationSystem.ts`

**Responsibilities:**
- Raise mountains
- Create lakes
- Terraform biomes
- Belief cost scaling

---

### SpeciesCreationSystem
**Purpose:** Gods create new species
**Components:** `deity`, `species_template`
**Priority:** 455
**File:** `systems/SpeciesCreationSystem.ts`

**Responsibilities:**
- Design new creatures
- Spawn populations
- Genetic templates
- Ecology integration

---

### DivineWeatherControl
**Purpose:** Gods control weather
**Components:** `deity`, `weather`, `position`
**Priority:** 460
**File:** `systems/DivineWeatherControl.ts`

**Responsibilities:**
- Summon rain/snow
- Clear storms
- Localized weather
- Agriculture blessings

---

### DivineBodyModification
**Purpose:** Gods alter agent bodies
**Components:** `deity`, `body`, `agent`
**Priority:** 465
**File:** `systems/DivineBodyModification.ts`

**Responsibilities:**
- Heal injuries
- Grant wings, gills, etc.
- Curse (mutations)
- Permanent changes

---

### MassEventSystem
**Purpose:** Large-scale divine events (floods, plagues)
**Components:** `deity`, `mass_event`, `position`
**Priority:** 470
**File:** `systems/MassEventSystem.ts`

**Responsibilities:**
- Trigger mass events
- Affect many agents/tiles
- Dramatic belief effects
- Historical records

---

## Divinity - Creator

### CreatorSurveillanceSystem
**Purpose:** Player oversight, meta-level awareness
**Components:** `creator`, `universe`
**Priority:** 475
**File:** `systems/CreatorSurveillanceSystem.ts`

**Responsibilities:**
- Track player actions
- Detect interventions
- Meta-awareness (4th wall)
- Universe parameters

---

### CreatorInterventionSystem
**Purpose:** Direct creator actions (debug tools)
**Components:** `creator`, `intervention`
**Priority:** 480
**File:** `systems/CreatorInterventionSystem.ts`

**Responsibilities:**
- Spawn entities
- Modify components
- Delete entities
- Fast-forward time

---

### LoreSpawnSystem
**Purpose:** Spawn lore-consistent content
**Components:** `lore`, `spawn_request`
**Priority:** 485
**File:** `systems/LoreSpawnSystem.ts`

**Responsibilities:**
- Generate from universe lore
- Maintain consistency
- Creator curated content

---

### RealityAnchorSystem
**Purpose:** Stabilize reality, prevent chaos
**Components:** `reality_anchor`, `universe`
**Priority:** 490
**File:** `systems/RealityAnchorSystem.ts`

**Responsibilities:**
- Detect reality glitches
- Enforce physical laws
- Prevent paradoxes
- Simulation stability

---

### RebellionEventSystem
**Purpose:** Agents/gods rebel against creator
**Components:** `rebellion`, `deity`, `agent`
**Priority:** 495
**File:** `systems/RebellionEventSystem.ts`

**Responsibilities:**
- Detect resentment
- Organize rebellion
- Meta-narrative events
- Creator-agent conflict

---

## Realms & Portals

### PassageSystem
**Purpose:** Passages between realms
**Components:** `passage`, `position`, `realm`
**Priority:** 500
**File:** `systems/PassageSystem.ts`

**Responsibilities:**
- Create passage entities
- Trigger realm transitions
- Access restrictions
- One-way vs two-way

---

### PortalSystem
**Purpose:** Portals (instant travel)
**Components:** `portal`, `position`, `destination`
**Priority:** 505
**File:** `systems/PortalSystem.ts`

**Responsibilities:**
- Teleport entities
- Portal stability
- Portal networks
- Activation conditions

---

### RealmTimeSystem
**Purpose:** Different time flows in realms
**Components:** `realm`, `time`
**Priority:** 510
**File:** `systems/RealmTimeSystem.ts`

**Responsibilities:**
- Track realm-local time
- Time dilation/contraction
- Synchronize with mortal world
- Aging effects

---

### DeathJudgmentSystem
**Purpose:** Judge souls upon death
**Components:** `soul`, `deity`, `judgment`
**Priority:** 515
**File:** `systems/DeathJudgmentSystem.ts`

**Responsibilities:**
- Psychopomp conversation
- Judgment criteria (actions, faith)
- Afterlife assignment
- Riddles, tests

**Status:** ✅ Complete (Phase 35)

---

### DeathBargainSystem
**Purpose:** Heroes bargain to cheat death
**Components:** `soul`, `death_god`, `bargain`
**Priority:** 520
**File:** `systems/DeathBargainSystem.ts`

**Responsibilities:**
- Offer challenges
- Quest assignments
- Resurrection conditions

**Status:** ⚠️ Incomplete, disabled

---

### DeathTransitionSystem
**Purpose:** Move dead entities to afterlife
**Components:** `dead`, `soul`, `realm`
**Priority:** 525
**File:** `systems/DeathTransitionSystem.ts`

**Responsibilities:**
- Remove from mortal world
- Transport to underworld
- Soul entity creation

**Status:** ⚠️ Incomplete, disabled

---

### RealmManager
**Purpose:** Manage realm entities, initialization
**Components:** `realm`, `universe`
**Priority:** 530
**File:** `systems/RealmManager.ts`

**Responsibilities:**
- Initialize realms (Underworld, Celestial, Dream)
- Track active realms
- Realm cleanup

---

### AfterlifeNeedsSystem
**Purpose:** Simplified needs for souls
**Components:** `soul`, `needs`, `realm`
**Priority:** 535
**File:** `systems/AfterlifeNeedsSystem.ts`

**Responsibilities:**
- Soul energy (no food/water)
- Fulfillment needs
- Restlessness

---

### AncestorTransformationSystem
**Purpose:** Souls become ancestors, spirits
**Components:** `soul`, `ancestor`, `realm`
**Priority:** 540
**Throttle:** Every 500 ticks (~25 seconds)
**File:** `systems/AncestorTransformationSystem.ts`

**Responsibilities:**
- Threshold for transformation
- Ancestor powers
- Guidance to living descendants

---

### ReincarnationSystem
**Purpose:** Souls reborn to mortal world
**Components:** `soul`, `reincarnation`, `agent`
**Priority:** 545
**File:** `systems/ReincarnationSystem.ts`

**Responsibilities:**
- Reincarnation triggers
- New body creation
- Memory carryover (partial)
- Karma effects

---

### AfterlifeMemoryFadingSystem
**Purpose:** Souls forget mortal life over time
**Components:** `soul`, `episodic_memory`, `realm`
**Priority:** 550
**Throttle:** Every 1000 ticks (~50 seconds)
**File:** `systems/AfterlifeMemoryFadingSystem.ts`

**Responsibilities:**
- Accelerated memory decay
- Mortal attachment fading
- Peace acceptance

---

## Automation & Factories

### PowerGridSystem
**Purpose:** Electrical power distribution
**Components:** `power_generator`, `power_consumer`, `power_grid`
**Priority:** 50 (early)
**File:** `systems/PowerGridSystem.ts`

**Responsibilities:**
- Calculate power generation
- Distribute to consumers
- Power deficits
- Grid network topology

**Status:** ✅ Complete (Phase 38)

---

### BeltSystem
**Purpose:** Conveyor belts for item transport
**Components:** `belt`, `belt_item`, `position`
**Priority:** 51
**File:** `systems/BeltSystem.ts`

**Responsibilities:**
- Move items along belt path
- Belt speed
- Item insertion/extraction
- Belt routing

**Status:** ✅ Complete (Phase 38)

---

### DirectConnectionSystem
**Purpose:** Direct pipe connections (fluids, items)
**Components:** `direct_connection`, `inventory`, `position`
**Priority:** 52
**File:** `systems/DirectConnectionSystem.ts`

**Responsibilities:**
- Transfer items between adjacent buildings
- Flow rate limits
- Filter connections

**Status:** ✅ Complete (Phase 38)

---

### AssemblyMachineSystem
**Purpose:** Automated crafting machines
**Components:** `assembly_machine`, `recipe`, `inventory`
**Priority:** 53
**File:** `systems/AssemblyMachineSystem.ts`

**Responsibilities:**
- Process recipes automatically
- Resource consumption
- Output production
- Machine efficiency

**Status:** ✅ Complete (Phase 38)

---

### FactoryAISystem
**Purpose:** AI-managed factory optimization
**Components:** `factory_ai`, `factory`, `inventory`
**Priority:** 48 (before production)
**File:** `systems/FactoryAISystem.ts`

**Responsibilities:**
- Analyze production bottlenecks
- Auto-configure machines
- Resource balancing
- Logistics planning

**Status:** ✅ Complete (Phase 38)

---

### OffScreenProductionSystem
**Purpose:** Optimize off-screen factory simulation
**Components:** `factory`, `production`, `position`
**Priority:** 49 (before full simulation)
**File:** `systems/OffScreenProductionSystem.ts`

**Responsibilities:**
- Detect off-screen factories
- Simplified production calculation
- Skip belt animation
- Performance optimization

**Status:** ✅ Complete (Phase 38)

---

## Governance & Metrics

### GovernanceDataSystem
**Purpose:** Track governance data (future leadership system)
**Components:** `governance`, `agent`
**Priority:** 555
**File:** `systems/GovernanceDataSystem.ts`

**Responsibilities:**
- Placeholder for Phase 14
- Population tracking
- Village boundaries

**Status:** ⏳ Basic data tracking, full system not implemented

---

### MetricsCollectionSystem
**Purpose:** Collect gameplay metrics for dashboard
**Components:** All components (observes all systems)
**Priority:** 999 (runs last)
**File:** `systems/MetricsCollectionSystem.ts`

**Responsibilities:**
- Stream events to metrics server
- Agent snapshots
- Performance metrics
- Session management

**Configuration:** Optional (enabled via config)

---

## Consciousness

### HiveMindSystem
**Purpose:** Eusocial insect colony collective intelligence
**Components:** `hive_mind`, `hive_member`, `position`
**Priority:** 560
**File:** `consciousness/HiveMindSystem.ts`

**Responsibilities:**
- Shared knowledge (all workers know all tasks)
- Task allocation (queen assigns)
- Pheromone communication
- Colony-level goals

**Status:** ✅ Implemented

---

### PackMindSystem
**Purpose:** Wolf pack / group coordination
**Components:** `pack_mind`, `pack_member`, `position`
**Priority:** 565
**File:** `consciousness/PackMindSystem.ts`

**Responsibilities:**
- Alpha leadership
- Coordinated hunting
- Shared alertness
- Role specialization (scout, hunter, pup-sitter)

**Status:** ✅ Implemented

---

## Utility Systems

### AutoSaveSystem
**Purpose:** Periodic auto-save to storage
**Components:** None (operates on World)
**Priority:** 1000 (runs last)
**Throttle:** Every 6000 ticks (~5 minutes)
**File:** `systems/AutoSaveSystem.ts`

**Responsibilities:**
- Save world state
- Rotation (keep last N saves)
- Background async save

**Configuration:** Optional (enabled via config)

---

## System Registration Order

Systems are registered in `systems/registerAllSystems.ts` in a specific order:

1. **Time & Environment** (10-35)
2. **Plants** (40-50)
3. **Animals** (55-75)
4. **Agent Core** (80-115)
5. **Memory & Cognition** (120-155)
6. **Social & Communication** (160-180)
7. **Exploration & Navigation** (185-190)
8. **Building & Construction** (195-225)
9. **Economy & Trade** (230-240)
10. **Skills & Crafting** (245-260)
11. **Research** (265)
12. **Magic** (270)
13. **Body & Reproduction** (310-340)
14. **Divinity** (345-495)
15. **Combat & Security** (275-305)
16. **Realms & Portals** (500-550)
17. **Automation & Factories** (48-53, early for optimization)
18. **Governance & Metrics** (555-999)
19. **Consciousness** (560-565)
20. **Utility** (1000+)

**Priority determines execution order within each tick. Lower numbers run first.**

---

## Throttled Systems

Many systems don't need to run every tick (50ms). Throttled systems use an update interval:

| System | Interval | Real Time |
|--------|----------|-----------|
| SoilSystem | 20 ticks | ~1 second |
| WeatherSystem | 100 ticks | ~5 seconds |
| BuildingMaintenanceSystem | 200 ticks | ~10 seconds |
| WildAnimalSpawningSystem | 200 ticks | ~10 seconds |
| PlantDiseaseSystem | 50 ticks | ~2.5 seconds |
| AnimalProductionSystem | 100 ticks | ~5 seconds |
| MarketEventSystem | 500 ticks | ~25 seconds |
| MemorySystem | 100 ticks | ~5 seconds |
| MemoryConsolidationSystem | 1000 ticks | ~50 seconds |
| ReflectionSystem | 500 ticks | ~25 seconds |
| JournalingSystem | 1440 ticks | ~1 day |
| MythGenerationSystem | 1000 ticks | ~50 seconds |
| AncestorTransformationSystem | 500 ticks | ~25 seconds |
| AfterlifeMemoryFadingSystem | 1000 ticks | ~50 seconds |
| AutoSaveSystem | 6000 ticks | ~5 minutes |

---

## Disabled Systems

Some systems exist but are temporarily disabled due to incomplete implementations:

- `RelationshipConversationSystem` - Incomplete
- `FriendshipSystem` - Incomplete
- `InterestEvolutionSystem` - Incomplete
- `JealousySystem` - Incomplete
- `DeathBargainSystem` - Incomplete
- `DeathTransitionSystem` - Incomplete
- `SoulCreationSystem` - Circular dependency

These are commented out in `registerAllSystems.ts`.

---

## Adding New Systems

When creating a new system:

1. **Extend `System` interface** from `ecs/System.ts`
2. **Implement `update(world: World): void`**
3. **Set priority** (determines execution order)
4. **Register in `registerAllSystems.ts`**
5. **Document in this catalog**

**Example:**

```typescript
export class MyNewSystem implements System {
  readonly id = 'my_new_system';
  readonly priority = 123; // Choose appropriate priority

  update(world: World): void {
    const entities = world.query()
      .with('my_component')
      .executeEntities();

    for (const entity of entities) {
      // ... system logic
    }
  }
}
```

Register:

```typescript
// In registerAllSystems.ts
gameLoop.systemRegistry.register(new MyNewSystem());
```

---

## Performance Tips

1. **Cache queries** - Don't call `world.query()` in loops
2. **Throttle non-critical systems** - Use `UPDATE_INTERVAL`
3. **Use squared distance** - Avoid `Math.sqrt()` in hot paths
4. **Cache singleton entities** - Time, weather rarely change
5. **No console.log** - Use only `console.error` for actual errors
6. **Batch operations** - Process multiple entities together

See [PERFORMANCE.md](./PERFORMANCE.md) for comprehensive guide.

---

**End of Systems Catalog**
