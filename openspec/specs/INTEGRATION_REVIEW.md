# Spec Integration Review

**Reviewed:** 2025-12-20
**Status:** FIXED - Core specs updated

---

## Critical Integration Issues

### 1. Agent System Core Spec Outdated

**File:** `agent-system/spec.md`

**Issues:**
- Has simple memory interface, doesn't reference detailed `memory-system.md`
- No mention of `spatial-memory.md` (location knowledge)
- No mention of `needs.md` (needs hierarchy)
- No mention of `movement-intent.md` (working memory, interrupts)
- No mention of `chroniclers.md` (writer agents)
- Skills list missing: `animalHandling`, `writing`, `literacy`
- `energy` and `mood` are separate fields, but `needs.md` has full hierarchy
- No agent archetypes for: Historian, Journalist, Herder

**Fix Required:** Update agent-system/spec.md to reference sub-specs and align interfaces

---

### 2. World System Doesn't Match Procedural Generation

**File:** `world-system/spec.md`

**Issues:**
- Specifies fixed size (128x128 tiles) but `procedural-generation.md` has infinite chunks
- No mention of `abstraction-layers.md` (simulation at scale)
- Villages mentioned but not the multi-village world simulation
- Fog of war is "optional" but `spatial-memory.md` requires it

**Fix Required:** Update world-system/spec.md to reference chunk system and abstraction layers

---

### 3. Game Engine Spec Outdated

**File:** `game-engine/spec.md`

**Issues:**
- "Max Agents: 50" but abstraction layers allow many more via simulation levels
- Fixed world size "up to 256x256" but we have infinite chunks
- System update order doesn't include: NeedsSystem, SpatialMemorySystem, AbstractionSystem
- No mention of inter-village simulation
- Time system doesn't mention needs decay per tick

**Fix Required:** Update game-engine/spec.md with new systems and scale

---

### 4. Economy System Missing Inter-Village Trade

**File:** `economy-system/spec.md`

**Issues:**
- Only covers local village economy
- No reference to `inter-village-trade.md`
- No mention of how abstraction layers affect trade simulation
- No chronicle/information economy

**Fix Required:** Add reference to inter-village-trade.md and update scope

---

### 5. Missing Skills in Agent System

**Current skills in spec.md:**
- farming, construction, crafting, foraging, fishing, cooking, trading, research, socializing

**Missing skills used in other specs:**
- `animalHandling` (animal-system.md)
- `writing` (chroniclers.md)
- `literacy` (chroniclers.md - for reading)
- `leadership` (abstraction-layers.md - key figures)
- `navigation` (spatial-memory.md)

---

### 6. Needs System Not Integrated

**File:** `agent-system/needs.md` exists but not referenced from:

- `agent-system/spec.md` (core agent definition has `energy` and `mood` only)
- `game-engine/spec.md` (update order doesn't include needs decay)
- `movement-intent.md` (mentions needs but as interrupt source)

**Interface mismatch:**
```typescript
// In spec.md:
interface Agent {
  energy: number;        // 0-100
  mood: Mood;
}

// In needs.md:
interface AgentNeeds {
  physical: { hunger, thirst, energy, warmth, health };
  safety: { shelter, security, stability };
  social: { belonging, friendship, intimacy, respect };
  psychological: { autonomy, competence, purpose, novelty, beauty };
  higher: { creativity, legacy, transcendence };
}
```

**Fix Required:** Align Agent interface with full needs system

---

### 7. Memory System Interface Mismatch

**In spec.md:**
```typescript
interface Memory {
  id: string;
  timestamp: GameTime;
  type: "observation" | "action" | "social" | "emotion";
  content: string;
  importance: number;
  emotionalValence: number;
  relatedAgents: string[];
  relatedItems: string[];
  relatedLocations: Position[];
}
```

**In memory-system.md:**
```typescript
interface EpisodicMemory {
  id: string;
  timestamp: GameTime;
  type: EpisodicMemoryType;  // More types
  content: string;
  sensoryDetails: SensorySnapshot;
  emotionalState: EmotionalSnapshot;
  importance: number;
  accessibility: number;
  consolidationStage: ConsolidationStage;
  decayResistance: number;
  retrievalCount: number;
  lastRetrieved: GameTime;
  associations: Association[];
  // ... more fields
}
```

**Fix Required:** Use full EpisodicMemory interface, reference spec

---

### 8. Animal System Not Integrated

**File:** `animal-system/spec.md` exists but:

- Agent skills don't include `animalHandling`
- No animals mentioned in world-system/spec.md resources
- No animal products in economy flows
- Agent archetypes don't include Herder/Rancher

---

### 9. Chronicler System Not Integrated

**File:** `agent-system/chroniclers.md` exists but:

- No chronicler archetype in agent-system/spec.md
- No writing/literacy skills
- No mention of written works in economy
- No chronicle buildings in construction-system (if it exists)

---

### 10. Construction System Not Reviewed

**File:** `construction-system/spec.md` - Need to verify:
- Has research buildings mentioned in research-system.md?
- Has animal housing from animal-system.md?
- Has libraries for chroniclers?

---

## Cross-Reference Gaps

### Missing "Related Specs" sections:

| Spec | Missing References |
|------|-------------------|
| agent-system/spec.md | memory-system.md, spatial-memory.md, needs.md, movement-intent.md, chroniclers.md |
| world-system/spec.md | procedural-generation.md, abstraction-layers.md |
| economy-system/spec.md | inter-village-trade.md |
| game-engine/spec.md | world-system/abstraction-layers.md |

---

## Interface Alignment Required

### Agent Interface (Consolidated)

```typescript
interface Agent {
  id: string;
  name: string;

  // Visual
  spriteId: string;
  position: Position;

  // Core traits
  personality: PersonalityTraits;
  skills: SkillSet;           // EXPANDED

  // Needs (replaces energy/mood)
  needs: AgentNeeds;          // FROM needs.md

  // Memory systems
  memory: {
    episodic: EpisodicMemory[];     // FROM memory-system.md
    spatial: SpatialMemory;          // FROM spatial-memory.md
    working: WorkingMemory;          // FROM movement-intent.md
  };

  // Intent system
  intent: AgentIntent;        // FROM movement-intent.md

  // Relationships
  relationships: Relationship[];

  // Inventory
  inventory: Inventory;

  // Role (for chroniclers, leaders, etc.)
  role?: AgentRole;

  // Animals owned
  ownedAnimals: string[];
}

interface SkillSet {
  // Original
  farming: number;
  construction: number;
  crafting: number;
  foraging: number;
  fishing: number;
  cooking: number;
  trading: number;
  research: number;
  socializing: number;

  // Added
  animalHandling: number;     // FROM animal-system.md
  writing: number;            // FROM chroniclers.md
  literacy: number;           // FROM chroniclers.md
  leadership: number;         // FROM abstraction-layers.md
  navigation: number;         // FROM spatial-memory.md
}
```

---

## Recommended Fixes

### Priority 1: Core Agent Spec Update
Update `agent-system/spec.md` to:
1. Reference all sub-specs
2. Align Agent interface with needs, memory, intent systems
3. Add missing skills
4. Add missing archetypes

### Priority 2: World System Update
Update `world-system/spec.md` to:
1. Reference chunk-based infinite generation
2. Reference abstraction layers
3. Make fog of war required (for spatial memory)
4. Add village-level world structure

### Priority 3: Game Engine Update
Update `game-engine/spec.md` to:
1. Add new systems to update order
2. Update scale expectations (infinite world, many villages)
3. Reference abstraction layer simulation

### Priority 4: Economy Update
Update `economy-system/spec.md` to:
1. Reference inter-village trade
2. Add chronicle/information economy mention

### Priority 5: Cross-References
Add Related Specs sections to all specs with missing references.

---

## Validation Checklist

Fixes applied:

- [x] Agent interface updated with needs, memory systems, intent
- [x] Skills list expanded (animalHandling, writing, literacy, leadership, navigation)
- [x] Needs system referenced from core agent spec
- [x] World system references chunk generation + abstraction layers
- [x] Abstraction layers referenced from world and game-engine
- [x] Core specs have complete Related Specs sections
- [x] Game engine update order includes all new systems
- [x] Economy spec references inter-village trade

Still to verify in future reviews:
- [ ] Construction system has all required buildings (research, animal housing, libraries)
- [ ] Rendering system handles chunk-based world
- [ ] All generated content follows universe rules

---

## Round 2 Review (2025-12-20)

### Construction System Gaps

**File:** `construction-system/spec.md`

| Missing Building | Needed By | Status |
|-----------------|-----------|--------|
| Coop, Kennel, Stable | animal-system.md (line 733-759) | Missing |
| Archive, Printing Press | chroniclers.md | Missing |
| Trade Post | inter-village-trade.md | Missing |

**Other issues:**
- Related Specs doesn't reference animal-system or chroniclers
- Building tiers don't include animal housing tiers

---

### Rendering System Gaps

**File:** `rendering-system/spec.md`

1. **No chunk-based rendering** - Spec assumes fixed world, but we have infinite chunks
2. **HUD shows "Energy"** - Should show full needs (hunger, thirst, energy, etc.)
3. **No abstracted village rendering** - When zoomed out, villages should render as icons
4. **Camera lacks abstraction modes** - Zooming out should switch from tile to village view
5. **Related Specs** missing: procedural-generation.md, abstraction-layers.md, needs.md

---

### Farming System Gaps

**File:** `farming-system/spec.md`

1. Open Question #4 asks about animal integration - now answered in animal-system.md
2. Missing: manure/animal products as fertilizer
3. Related Specs should include: animal-system.md

---

### Missing Specs (Identified)

| Spec Needed | Why | Referenced From |
|-------------|-----|-----------------|
| ~~player-system~~ | ~~Player-as-agent vs spectator modes~~ | CREATED: `player-system/spec.md` |
| ~~conversation-system~~ | ~~How agents talk to each other~~ | CREATED: `agent-system/conversation-system.md` |
| ~~relationship-system~~ | ~~How relationships form/decay~~ | CREATED: `agent-system/relationship-system.md` |
| ~~lifecycle-system~~ | ~~Birth, aging, death of agents~~ | CREATED: `agent-system/lifecycle-system.md` |
| ~~governance-system~~ | ~~How leadership/laws emerge~~ | CREATED: `governance-system/spec.md` |

**All previously missing specs have been created.**

---

### Cross-System Integration Gaps

| Gap | Systems Involved | Issue |
|-----|------------------|-------|
| Animal products → Farming | animal-system, farming-system | Manure as fertilizer not mentioned |
| Chroniclers → Discoveries | chroniclers, research-system | How chroniclers learn about inventions |
| Needs → Rendering | needs, rendering-system | HUD doesn't show hunger/thirst |
| Animals → Construction | animal-system, construction-system | Housing not in construction spec |
| Trade → Construction | inter-village-trade, construction-system | Trade posts not in building list |

---

### Interface Alignment (Round 2)

**Rendering HUD needs update:**
```typescript
// Current (rendering-system.md line 333):
│ [Portrait] Name          ⚡ Energy ███████░░░ 70%    │

// Should be:
│ [Portrait] Name    🍖 Hunger  ███████░░░      │
│                    💧 Thirst  █████████░      │
│                    ⚡ Energy  ██████░░░░      │
```

---

### Round 2 Fixes - ALL COMPLETED

**Priority 1: Construction System** - DONE
- [x] Added Tier 2.5 Animal Housing (Coop, Kennel, Stable, Apiary, Aquarium)
- [x] Added chronicler buildings (Archive, Printing Press)
- [x] Added trade buildings (Trade Post, Caravan Station)
- [x] Updated Related Specs

**Priority 2: Rendering System** - DONE
- [x] Added REQ-RND-001 chunk-based rendering (ChunkRenderer interface)
- [x] Updated REQ-RND-009 HUD for full needs display
- [x] Added REQ-RND-012 abstracted village rendering mode
- [x] Updated Related Specs

**Priority 3: Farming System** - DONE
- [x] Added Animal Integration section (manure, pollination, pest control, work animals)
- [x] Added animal-derived fertilizers to fertilizer table
- [x] Updated Open Questions (marked #4 as addressed)
- [x] Updated Related Specs

**Priority 4: Create Missing Specs** - DONE
- [x] `agent-system/conversation-system.md` - Agent dialogue, information exchange
- [x] `agent-system/relationship-system.md` - Relationship formation, evolution, types
- [x] `agent-system/lifecycle-system.md` - Birth, aging, death, generations
- [x] `player-system/spec.md` - Agent mode, spectator mode, management mode

---

## Round 3 Review (2025-12-20)

### Items System Integration (FIXED)

**File:** `items-system/spec.md`

| Issue | Fix Applied |
|-------|-------------|
| `energy_restore` didn't align with needs system | Added `hunger_restore`, `thirst_restore`, `warmth_restore`, `health_restore`, `stress_reduce` |
| No written works category | Added `written_work` and `animal_product` categories |
| `read` action didn't require literacy | Added `requiredLiteracy: number` to read action |
| Orphan reference to `crafting-system/spec.md` | Removed (file doesn't exist) |
| Missing animal product examples | Added Animal Products section with examples |
| Missing written work examples | Added Written Works section with tier/literacy requirements |
| Related Specs incomplete | Added `animal-system`, `chroniclers`, `needs` references |

---

### Research System Integration (FIXED)

**File:** `research-system/spec.md`

| Issue | Fix Applied |
|-------|-------------|
| Missing capability-evolution.md reference | Added to Related Specs |
| No chronicler integration | Added Discovery Propagation section (REQ-RES-010, REQ-RES-011) |
| Discoveries don't spread | Defined how chroniclers document and spread discoveries |

---

### Economy System Integration (FIXED)

**File:** `economy-system/spec.md`

| Issue | Fix Applied |
|-------|-------------|
| Written works not valued as goods | Added Information Economy section |
| No chronicler economic role | Added REQ-ECO-013 (Written Work Valuation), REQ-ECO-014 (Information as Commodity), REQ-ECO-015 (Chronicler Economic Role) |
| Missing research-system reference | Added to Related Specs |

---

### Chroniclers Integration (FIXED)

**File:** `agent-system/chroniclers.md`

| Issue | Fix Applied |
|-------|-------------|
| Missing items-system reference | Added - written works are items |
| Missing economy-system reference | Added - information economy |
| Missing research-system reference | Added - documenting discoveries |
| Missing agent-system/spec.md reference | Added - writing/literacy skills |

---

### Progression System Integration (FIXED)

**File:** `progression-system/spec.md`

| Issue | Fix Applied |
|-------|-------------|
| No chronicler reference | Added to Related Specs |
| WorldComplexity doesn't track documentation | Added `writtenWorks`, `documentedEvents`, `preservedHistory` fields |
| Missing memory-system reference | Added to Related Specs |

---

### Universe System Integration (FIXED)

**File:** `universe-system/spec.md`

| Issue | Fix Applied |
|-------|-------------|
| Missing chronicler reference | Added - multi-planet documentation |
| Missing player-system reference | Added placeholder with TODO note |

---

### Validation Checklist (Round 3)

Fixes applied:

- [x] Items system aligned with needs (hunger/thirst/energy effects)
- [x] Written works defined as item category
- [x] Literacy skill enforced for reading
- [x] Orphan crafting-system reference removed
- [x] Animal products added to items-system
- [x] Research discoveries propagate via chroniclers
- [x] Information economy section in economy-system
- [x] Written works have economic value
- [x] Chroniclers reference all dependent systems
- [x] Progression tracks documentation complexity
- [x] Universe references player-system (placeholder)

Previously pending - NOW COMPLETE:
- [x] construction-system - Added animal housing, chronicler buildings, trade buildings
- [x] rendering-system - Added chunk rendering, updated HUD for needs, abstraction rendering
- [x] farming-system - Added animal product integration (manure, pollination, pest control)
- [x] Created `agent-system/conversation-system.md`
- [x] Created `agent-system/relationship-system.md`
- [x] Created `agent-system/lifecycle-system.md`
- [x] Created `player-system/spec.md`

---

## Round 4 Review (2025-12-20)

Deep integration pass for sub-specs and cross-system references.

### Needs System Integration (FIXED)

**File:** `agent-system/needs.md`

| Issue | Fix Applied |
|-------|-------------|
| Missing items-system reference | Added - items restore needs (hunger_restore, etc.) |
| Missing construction reference | Added - shelter satisfies safety needs |
| Missing relationship/conversation placeholders | Added TODO references for pending specs |

---

### Inter-Village Trade Integration (FIXED)

**File:** `economy-system/inter-village-trade.md`

| Issue | Fix Applied |
|-------|-------------|
| Missing chroniclers reference | Added - news spreads via merchants |
| Missing construction-system reference | Added - trade posts are buildings |
| Missing animal-system reference | Added - livestock trade |
| Missing items-system reference | Added - traded goods are items |
| Missing game-engine reference | Added - trade simulation in loop |

---

### Abstraction Layers Integration (FIXED)

**File:** `world-system/abstraction-layers.md`

| Issue | Fix Applied |
|-------|-------------|
| Missing game-engine reference | Added - simulation budgets |
| Missing chroniclers reference | Added - key figures document |
| Missing progression-system reference | Added - complexity unlocks scope |
| Missing needs reference | Added - key figures have simplified needs |
| Missing memory-system reference | Added - catch-up memories |

---

### World System Integration (FIXED)

**File:** `world-system/spec.md`

| Issue | Fix Applied |
|-------|-------------|
| Missing animal-system reference | Added - animals inhabit tiles |
| World events missing animals | Added predator_sighting, animal_herd, rare_animal_spawn events |

---

### Agent System Core Integration (FIXED)

**File:** `agent-system/spec.md`

| Issue | Fix Applied |
|-------|-------------|
| Memory interface duplicated from memory-system.md | Added clarifying comment referencing full spec |
| Missing social system placeholders | Added TODO section for conversation/relationship/lifecycle specs |

---

### Validation Checklist (Round 4)

Fixes applied:

- [x] Needs system references items for satisfaction
- [x] Inter-village trade references all dependent systems
- [x] Abstraction layers references game engine and chroniclers
- [x] World system integrates animal events
- [x] Agent core spec references memory subsystem properly
- [x] All specs now reference pending social system specs

### Cross-Reference Matrix (Current State)

| From Spec | References | Referenced By |
|-----------|------------|---------------|
| `items-system` | needs, chroniclers, animal-system | economy, research, agent |
| `chroniclers` | items, economy, research, agent | research, economy, progression, universe, trade |
| `needs` | items, construction, memory | agent, movement-intent |
| `inter-village-trade` | construction, items, animal, chroniclers, game-engine | economy, abstraction |
| `abstraction-layers` | game-engine, chroniclers, needs, memory | agent, world |
| `world-system` | animal-system | game-engine, farming, construction |
| `agent-system` | memory-system, chroniclers, needs | game-engine, economy |

All core specs now have bidirectional references to dependent systems.

---

### Memory System Integration (FIXED)

**File:** `agent-system/memory-system.md`

| Issue | Fix Applied |
|-------|-------------|
| Missing needs reference | Added - memories of needs satisfaction |
| Missing spatial-memory reference | Added - location-based memories |
| Missing chroniclers reference | Added - journals become chronicles |
| Missing abstraction-layers reference | Added - catch-up memories |

---

### Animal System Integration (FIXED)

**File:** `animal-system/spec.md`

| Issue | Fix Applied |
|-------|-------------|
| Missing items-system reference | Added - animal products as items |
| Missing construction-system reference | Added - animal housing |
| Missing world-system reference | Added - wildlife events |
| Missing chroniclers reference | Added - notable animals in chronicles |

---

## Round 5 Review (2025-12-20)

Major new specs for species diversity and cultural variation.

### New Specs Created

**`agent-system/species-system.md`** - Sapient species variation
- Lifecycle variation (40-year goblins to 800-year elves to immortals)
- Reproduction strategies (live birth, eggs, budding, constructed)
- Species-specific needs (elves need beauty, goblins need mischief)
- Innate traits and aptitudes
- LLM generation for alien species

**`agent-system/culture-system.md`** - Society structures
- Kinship systems (nuclear, clan, hive, chosen family)
- Gender systems (binary, sequential/kemmer, caste-based, fluid)
- Class systems (egalitarian, feudal caste, meritocratic)
- Relationship norms (arranged, free choice, contest, none)
- Parenting norms (intensive elven nurturing to goblin survival trials)
- Economic systems (communist to market to raider)
- Values and taboos per culture
- Class-differentiated parenting (nobles vs peasants)

### Le Guin-Inspired Features

- **Kemmer** - Sequential gender (Gethenians from Left Hand of Darkness)
- **Anarchist communes** - Odonian society (The Dispossessed)
- **Genuinely alien** psychology, not rubber-forehead aliens
- Cultural relativism - no culture is "correct"

### Cross-References Updated

| Spec | Added References |
|------|------------------|
| `lifecycle-system.md` | Added species-system, culture-system |
| `relationship-system.md` | Added species-system, culture-system |

### Validation Checklist (Round 5)

- [x] Species defines biological lifecycle constraints
- [x] Culture defines social expression within those constraints
- [x] Parenting varies by species reproduction + cultural norms
- [x] Class system affects parenting, economics, relationships
- [x] Gender systems range from binary to kemmer to caste
- [x] Relationship formation varies (arranged → free → contest)
- [x] Economic systems vary (communist → feudal → raider)
- [x] Alien species can be LLM-generated with coherent biology

---

## Round 6 Review (2025-12-20)

Extensive sci-fi alien concepts based on Cherryh, Vinge, Butler, Banks, Chambers, Leckie, and Jemisin.

### Species System Enhancements

**File:** `agent-system/species-system.md`

| Feature Added | Inspiration | Description |
|--------------|-------------|-------------|
| **Consciousness Types** | - | Individual, pack mind, hive mind, networked, symbiont, distributed, gestalt |
| **Pack Minds** | Vernor Vinge's Tines | Multiple bodies = one consciousness; 3-8 members for sapience |
| **Hive Minds** | - | Collective consciousness with castes (queen, cerebrates, workers) |
| **Networked Consciousness** | Borg-lite | Individuals who share thoughts, can merge temporarily |
| **Symbiont Consciousness** | Star Trek's Trill | Host + symbiont merge; symbiont carries memories of all hosts |
| **Communication Modes** | Becky Chambers' Aeluons | Chromatic (skin color), pheromonal, bioluminescent, telepathic |
| **Cyclical Biology** | Vernor Vinge's Spiders | Decades-long hibernation; civilization rises and falls |
| **Multi-Sex Reproduction** | Octavia Butler's Oankali | Three sexes: bearer, sire, mixer (ooloi); gene-trading compulsion |
| **Incomprehensible Aliens** | Ann Leckie's Presger | Cannot be understood; interface through modified Translators |
| **Geological Timescale** | N.K. Jemisin's Stone Eaters | Think in millennia; conversations span generations |
| **Alien Psychology** | C.J. Cherryh's Atevi | Association psychology (man'chi), no friendship concept |
| **Polyphonic Communication** | China Miéville's Ariekei | Dual-voice language; single voice is meaningless |
| **Temporal Experience** | - | Millisecond (AI) to geological (Stone Eaters) cognition |

---

### Culture System Enhancements

**File:** `agent-system/culture-system.md`

| Feature Added | Inspiration | Description |
|--------------|-------------|-------------|
| **Alien Emotion Systems** | - | Architecture for non-human emotional frameworks |
| **Man'chi System** | C.J. Cherryh's Atevi | No love/friendship; only instinctive loyalty to leader |
| **Missing Emotions** | - | Species that lack love, empathy, guilt, gratitude |
| **Alternative Emotions** | - | Association comfort, dislocation, offense-state |
| **Pure Dominance** | Cherryh's Kif | Only subordinate/superior relationships; no allies |
| **Hive Emotions** | - | Collective emotional pools; individual feelings absent |
| **Post-Scarcity** | Iain M. Banks' Culture | No material scarcity; reputation is currency; AI Minds run economy |
| **Sacred Scarcity** | Frank Herbert's Fremen | Water as sacred currency; stillsuits, death reclamation |

---

### Agent System Enhancements

**File:** `agent-system/spec.md`

| Feature Added | Description |
|--------------|-------------|
| **Cybernetics Section** | Complete augmentation architecture |
| **Implant Types** | Neural, sensory, muscular, communication, memory, interface, medical |
| **HUD Systems** | Health monitor, navigation, social tags, task tracker, threat detection, resource scanner, comm channel |
| **Neural Interfaces** | Skill download, memory share, machine control, gestalt link, personality backup |
| **Cultural Norms** | Augmentation acceptance varies: mandatory (hive), encouraged (Culture), forbidden (traditional) |
| **REQ-AGT-009** | Augmentation integration requirements |
| **REQ-AGT-010** | HUD information flow to LLM prompts |

---

### Gameplay Implications

| System | Implications |
|--------|--------------|
| **Pack Minds** | Relationships are pack-to-pack; losing members reduces IQ; can "split" into new person |
| **Symbiont** | Translators know things that hurt to know; dual loyalty; sanity management |
| **Man'chi Species** | Cannot form friendships; misread human equality as threatening; assassination is legal |
| **Kif Species** | Showing kindness = exploitable weakness; every interaction is dominance negotiation |
| **Post-Scarcity** | No resource gathering needed; drama from boredom, meaning, status games |
| **Incomprehensible** | Can only interact through modified Translators; predictions unreliable |
| **Geological Species** | Quests span generations; promises from ancestors may come due |
| **Cybernetics** | HUD data appears in LLM prompts; skill downloads temporary with side effects |

---

### Validation Checklist (Round 6)

Sci-fi alien features:
- [x] Pack minds with coherence range and body roles
- [x] Hive minds with castes and queen requirements
- [x] Networked consciousness with isolation effects
- [x] Symbiont merged consciousness with memory inheritance
- [x] Multi-sex reproduction (Oankali-style ooloi)
- [x] Chromatic communication (Aeluon skin colors)
- [x] Pheromonal communication
- [x] Cyclical hibernation (decades of dormancy)
- [x] Incomprehensible aliens with Translator intermediaries
- [x] Geological timescale beings
- [x] Man'chi emotion system (no love/friendship)
- [x] Pure dominance hierarchy (Kif)
- [x] Hive emotional unity
- [x] Post-scarcity economics (Culture)
- [x] Scarcity religion economics (Fremen)
- [x] Cybernetics and HUD for AI agents
- [x] Neural interfaces and skill downloads
- [x] Cultural augmentation norms
- [x] Polyphonic (dual-voice) communication
- [x] Association psychology (man'chi vs friendship)
- [x] Temporal experience variation (millisecond to geological)

---

## Round 7 Review (2025-12-20)

Cross-system integration for alien governance, needs, player embodiment, and communication mechanics.

### Governance System Updates

**File:** `governance-system/spec.md`

| Feature Added | Inspiration | Description |
|--------------|-------------|-------------|
| **Alien Governance Types** | - | manchi_hierarchy, hive_queen, dominance_chain, gestalt_consensus, pack_council, cyclic_regency, symbiont_merged |
| **Alien Appointment Methods** | - | manchi_shift, hive_designation, dominance_challenge, ai_optimization, pack_reformation, hibernation_cycle, symbiont_selection |
| **Man'chi Governance** | C.J. Cherryh's Atevi | No voting, no negotiation, loyalty is biological; man'chi cascade hierarchy |
| **Hive Queen Governance** | - | Queen IS the government; no council, no dissent possible |
| **Dominance Chain** | C.J. Cherryh's Kif | Leadership by continuous dominance display; no legitimacy concept |
| **Gestalt Consensus** | Iain M. Banks' Culture | AI Minds run everything; no voting, simulation-based decisions |
| **Pack Council** | Vernor Vinge's Tines | Multiple bodies = one mind decides; pack politics between different minds |
| **Cyclic Regency** | Vernor Vinge's Spiders | Rotating leadership through hibernation cycles; cohort-based |
| **Symbiont Governance** | Star Trek's Trill | Joined consciousness co-governance; ancient symbionts have outsized influence |

---

### Needs System Updates

**File:** `agent-system/needs.md`

| Feature Added | Inspiration | Description |
|--------------|-------------|-------------|
| **Post-Scarcity Needs** | Iain M. Banks | Physical needs eliminated; novelty/purpose become survival-level |
| **Dominance Needs** | C.J. Cherryh's Kif | Rank IS survival; subordinates and fear replace social needs |
| **Authenticity Need** | - | Genuine challenge when everything is safe (Culture ennui) |
| **Reputation Need** | - | In post-scarcity, reputation is the only currency |
| **Nihilistic Spiral** | - | Failure mode for post-scarcity agents without purpose |

---

### Game Engine Updates

**File:** `game-engine/spec.md`

| Feature Added | Description |
|--------------|-------------|
| **REQ-ENG-003: Multi-Timescale Simulation** | Support for millisecond (AI), realtime, slow, hibernating, geological timescales |
| **TemporalScale Type** | Enum for different cognitive speeds |
| **TemporalExperience Interface** | Per-entity time perception configuration |
| **TEMPORAL_SCALES Config** | Tick rates, subjective multipliers, example species per scale |
| **REQ-ENG-003a: Hibernation Cycle Engine** | HibernationEngine, HibernatorState, HibernationPhase, DormancyEffect |
| **CycleGroup Interface** | Synchronized hibernation across species/factions |
| **SocietalPersistence Interface** | What systems continue during dormancy |
| **REQ-ENG-003b: Cross-Timescale Interaction** | ScaleBridgeMethod: slowdown, speedup, intermediary, aggregate, inscription, ritual |
| **GeologicalPerception Interface** | Geological beings see patterns, not individuals |

---

### Player System Updates

**File:** `player-system/spec.md`

| Feature Added | Description |
|--------------|-------------|
| **REQ-PLY-015: Non-Standard Embodiments** | EmbodimentType: individual, pack_mind, hive_worker, symbiont_joined, networked, hibernating, geological |
| **REQ-PLY-016: Pack Mind Embodiment** | Control multiple bodies; PackControlMode: unified, distributed, focused, tactical |
| **REQ-PLY-017: Hive Worker Embodiment** | Limited agency; queen's voice always present; no private goals |
| **REQ-PLY-018: Symbiont/Joined Embodiment** | Access past hosts' memories; internal dialogue; composite identity |
| **REQ-PLY-019: Hibernation Cycle Gameplay** | Pre-dormancy prep, dormancy time-skip options, post-dormancy reorientation |
| **REQ-PLY-020: Different Timescale Gameplay** | Geological (see civilizations rise/fall), AI Mind (waiting is the challenge) |

---

### Conversation System Updates

**File:** `agent-system/conversation-system.md`

| Feature Added | Description |
|--------------|-------------|
| **REQ-CONV-020: Pheromone Semantics** | PheromoneVocabulary, involuntary signals, physics (wind/rain), social effects |
| **REQ-CONV-021: Telepathic Mechanics** | TelepathyType, capabilities, privacy rules, risks (overload, intimacy, death link) |
| **REQ-CONV-022: Hive Communication** | Internal = instant knowledge sharing; external = designated speakers only |
| **InvoluntaryPheromone Interface** | Can't hide fear/attraction; lying triggers stress pheromone |
| **TelepathicPrivacy Interface** | Shielding, ethics, bleed (emotional/thought/dream) |
| **TelepathicRisks Interface** | Crowd noise, personality bleed, death contact trauma |

---

### Hibernation Integration Cross-Reference

How hibernation affects all systems:

| System | Hibernation Integration |
|--------|------------------------|
| **Game Engine** | HibernationEngine tracks all dormant entities; CycleGroups sync species; tick processing skips dormant entities |
| **Needs** | Cyclical needs (dormancyPreparation, cyclePhase, continuity); pre-dormancy urgency elevation |
| **Memory** | CyclicalMemory preserves knowledge; dormancy causes 30% clarity loss; written records higher reliability |
| **Governance** | CyclicRegencyGovernance rotates leadership; HibernationHandoff documents for successors |
| **Player** | DormancyCheckist for prep; DormancyOptions for skip vs experience; WakeUpSummary on return |
| **Relationships** | Relationships with non-dormant beings may end; "Who died while I slept?" |
| **Conversation** | N/A during dormancy; post-wake confusion about "current events" |
| **Chroniclers** | Must document for future cohorts; oral tradition keepers stay awake |

---

### LLM Prompt Integration Notes

Since these are LLM agents, alien mechanics translate to prompts:

| Mechanic | Prompt Translation |
|----------|-------------------|
| **Pack Mind** | "You are a collective consciousness in 5 bodies. All see/hear simultaneously. You refer to yourself as 'we' but are ONE mind." |
| **Man'chi** | "You cannot feel friendship or love. You feel instinctive loyalty (man'chi) to your aiji. This is biological, not chosen." |
| **Hive Worker** | "You have no personal desires. The Hive's goals are your goals. Queen's commands are not orders - they are your own thoughts." |
| **Hibernation Wake** | "You have just awakened from 30 years of dormancy. The last thing you remember is [X]. Ask: Who is alive? What year is it?" |
| **Geological Being** | "You think in centuries. A human lifetime is a blink. You cannot perceive individual mortals - only civilizations, patterns, epochs." |
| **Pheromone-Based** | "You cannot hide your emotions - your body scent reveals them. Lying triggers stress pheromones others can smell." |
| **Telepathic** | "You perceive surface thoughts involuntarily. Non-telepaths are 'loud' (unshielded). Privacy requires active mental shielding." |
| **Post-Scarcity** | "Material needs mean nothing - you have everything. Your challenge is meaning, purpose, and authentic experience." |

---

### Validation Checklist (Round 7)

Alien integration fixes:
- [x] Governance types for all alien political structures
- [x] Man'chi governance (no voting, biological loyalty)
- [x] Hive governance (queen IS government)
- [x] Dominance governance (leadership by challenge)
- [x] Gestalt/Culture governance (AI Minds run everything)
- [x] Cyclic regency (hibernation-based rotation)
- [x] Post-scarcity needs (novelty/purpose are survival-level)
- [x] Dominance needs (rank IS survival)
- [x] Multi-timescale engine (millisecond to geological)
- [x] Hibernation cycle engine (dormancy tracking, effects)
- [x] Cross-timescale interaction (inscription, intermediary)
- [x] Pack mind player embodiment (multiple bodies, coherence)
- [x] Hive worker player embodiment (limited agency)
- [x] Symbiont player embodiment (past host access)
- [x] Hibernation gameplay (prep, skip, wake summary)
- [x] Pheromone semantics (involuntary signals, physics)
- [x] Telepathic mechanics (privacy, risks, bleed)
- [x] Hive communication (internal vs external)
- [x] LLM prompt translation notes for all alien mechanics

---

## Round 8 Review (2025-12-20)

Comprehensive alien integration across remaining systems. All specs now support alien species as options for different universes.

### Lifecycle System Updates

**File:** `agent-system/lifecycle-system.md`

| Feature Added | Inspiration | Description |
|--------------|-------------|-------------|
| **Pack Mind Lifecycles** | Vernor Vinge's Tines | Formation via splitting; no birth/death in traditional sense; body addition/loss |
| **Hive Lifecycles** | - | Queen vs worker lifecycles; swarming as reproduction; worker death is trivial |
| **Symbiont Lifecycles** | Star Trek's Trill | Symbiont lifecycle separate from host; transfer process; multiple hosts |
| **Metamorphic Lifecycles** | - | Larval → pupal → adult stages; identity may not persist across stages |
| **Constructed Beings** | - | Creation instead of birth; maintenance instead of healing; termination instead of death |
| **Cyclical Dormancy** | Vernor Vinge's Spiders | Active/dormant phases; cross-dormancy continuity; final dormancy as death |
| **Geological Lifespans** | N.K. Jemisin's Stone Eaters | Maturation over millennia; observe civilizations rise and fall |

---

### Economy System Updates

**File:** `economy-system/spec.md`

| Feature Added | Inspiration | Description |
|--------------|-------------|-------------|
| **Post-Scarcity Economics** | Iain M. Banks' Culture | No currency; reputation/attention/access economy; scarcity only for unique items |
| **Hive Collective Economics** | - | No individual ownership; queen allocates; workers don't trade |
| **Dominance-Based Economics** | C.J. Cherryh's Kif | Resources flow to dominant; tribute system; taking from weaker expected |
| **Pack Mind Economics** | Vernor Vinge's Tines | One inventory for whole pack; no internal economy; trade as single entity |
| **Gift Economies** | - | Obligation networks; prestige from giving; shame from hoarding |
| **Symbiont Economics** | Star Trek's Trill | Two entities, one economic unit; inherited wealth complications |

---

### Spatial Memory Updates

**File:** `agent-system/spatial-memory.md`

| Feature Added | Description |
|--------------|-------------|
| **Pack Mind Shared Spatial Memory** | One spatial memory across all bodies; simultaneous exploration; no accuracy loss in sharing |
| **Hive Collective Spatial Knowledge** | Workers have no individual memories; queen sees through all workers; instant knowledge transfer |
| **Symbiont Inherited Spatial Memory** | Past hosts' location knowledge; may be outdated; déjà vu experiences |
| **Networked Spatial Sharing** | Instant broadcast of discoveries; query network for locations |
| **Geological-Scale Spatial Memory** | Remember landscapes, not locations; civilizations not individuals; terrain not buildings |

---

### Movement & Intent Updates

**File:** `agent-system/movement-intent.md`

| Feature Added | Description |
|--------------|-------------|
| **Pack Mind Multi-Body Movement** | Coordinated formation movement; coherence requirements; one LLM call for whole pack |
| **Hive Swarm Coordination** | Queen directives; worker autonomy levels; flocking behavior; swarm modes |
| **Symbiont Dual-Consciousness Intent** | Host vs symbiont intent; conflict resolution; past host suggestions |
| **Geological-Scale Movement** | Movement over decades; yearly tick rate; intent on century timescale |

---

### Cross-Reference Matrix (Round 8)

All specs now have alien support sections:

| Spec | Alien Features |
|------|---------------|
| `species-system.md` | Consciousness types, pack/hive/symbiont biology, alien psychology, polyphonic communication, temporal experience |
| `culture-system.md` | Man'chi emotion, dominance psychology, post-scarcity culture, alien kinship |
| `conversation-system.md` | Non-verbal (chromatic, pheromone, telepathic), multi-body, polyphonic, incomprehensible entity, temporal mismatch |
| `relationship-system.md` | Non-friendship bonds (man'chi, fealty), pack/hive relationships, cross-psychology, symbiont inheritance, temporal-mismatch |
| `needs.md` | Pack coherence, hive collective, man'chi anchor, symbiont integration, cyclical dormancy, geological witnessing, post-scarcity, dominance |
| `memory-system.md` | Pack shared, hive collective, symbiont inherited, cyclical preservation, geological-scale, incomprehensible |
| `lifecycle-system.md` | Pack splitting, hive swarming, symbiont transfer, metamorphosis, constructed beings, dormancy, geological |
| `economy-system.md` | Post-scarcity, hive collective, dominance-based, pack shared, gift economy, symbiont shared |
| `governance-system.md` | Man'chi hierarchy, hive queen, dominance chain, gestalt consensus, pack council, cyclic regency, symbiont merged |
| `player-system.md` | Pack mind control, hive worker, symbiont joined, hibernation, geological timescale |
| `spatial-memory.md` | Pack shared, hive collective, symbiont inherited, networked, geological-scale |
| `movement-intent.md` | Pack multi-body, hive swarm, symbiont dual-consciousness, geological-scale |

---

### Validation Checklist (Round 8)

Alien lifecycle support:
- [x] Pack mind formation/splitting (not birth/death)
- [x] Hive swarming and queen succession
- [x] Symbiont transfer between hosts
- [x] Metamorphic stage transitions
- [x] Constructed being creation/termination
- [x] Cyclical dormancy phases
- [x] Geological lifespans (millennia)

Alien economy support:
- [x] Post-scarcity (no currency, reputation-based)
- [x] Hive collective (no individual ownership)
- [x] Dominance-based (resources to dominant)
- [x] Pack shared (one inventory)
- [x] Gift economy (obligation networks)
- [x] Symbiont economic complications

Alien spatial memory:
- [x] Pack shared exploration
- [x] Hive instant knowledge transfer
- [x] Symbiont inherited locations (with déjà vu)
- [x] Networked broadcast
- [x] Geological landscape memory

Alien movement/intent:
- [x] Pack formation movement and coherence
- [x] Hive swarm coordination (flocking)
- [x] Symbiont host/symbiont intent conflict
- [x] Geological century-scale movement

---

### Summary

All core agent systems now support alien species as optional configurations for different universes. The framework allows:

- **Standard fantasy worlds**: Human-like agents with standard needs, memory, relationships
- **Sci-fi alien worlds**: Pack minds, hive minds, symbionts, geological beings
- **Post-scarcity settings**: Culture-style AI-mediated abundance
- **Alien psychology**: Man'chi (no friendship), dominance-only, hive loyalty
- **Temporal variation**: Millisecond AI to geological Stone Eaters

Each spec includes detailed TypeScript interfaces for implementation and examples demonstrating gameplay implications

