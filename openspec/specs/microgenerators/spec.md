# Microgenerator System - Specification

**Created:** 2026-01-05
**Last Updated:** 2026-01-05
**Status:** Proposed
**Version:** 0.1.0

---

## Overview

The Microgenerator System enables **external content creation tools** (microgenerators) that create legendary items, souls with missions, quests, and other game content which is then added to the **Multiverse God-Crafted Queue**. These artifacts drift through universes, are discovered by players, and persist forever according to the Conservation of Game Matter principle.

This enables:
- **Standalone content creators**: Mini-apps for creating legendary swords, souls with backstories, epic quests
- **Human narrative composition**: Arrange narrative components like building blocks to create stories
- **LLM collaboration**: Tools that work with language models to develop entities
- **Teaser mechanics**: External engagement that feeds content into the main game
- **Eternal persistence**: All created content lives in the multiverse forever
- **Cross-universe discovery**: Content can be found in any universe

## Purpose

Enables external content creation tools (microgenerators) for legendary items, souls, quests, buildings, alien species, and magic systems that feed into a persistent god-crafted queue, allowing human-LLM collaboration and cross-universe content discovery.

---

## Design Philosophy

### Microgenerators as Game Teasers

Microgenerators are **small, focused creation tools** that appear isolated but feed into a shared multiverse:

```
┌────────────────────────┐
│ Legendary Item Creator │ ──┐
└────────────────────────┘   │
                              │
┌────────────────────────┐   │    ┌──────────────────────┐
│   Soul Creator Tool    │ ──┼───→│ God-Crafted Queue    │
└────────────────────────┘   │    │ (Multiverse)         │
                              │    └──────────────────────┘
┌────────────────────────┐   │              │
│   Quest Composer       │ ──┘              │ drift through
└────────────────────────┘                  │
                                            ▼
                              ┌──────────────────────────┐
                              │  Universe A  │ Universe B│
                              │  Discovery   │ Discovery │
                              └──────────────────────────┘
```

Each microgenerator:
1. **Appears self-contained** - "Click to create a legendary sword"
2. **Produces canonical content** - All creations are real and persistent
3. **Feeds the multiverse** - Content enters god-crafted queue
4. **Drifts through realities** - Players discover these items/souls in-game

### Narrative Component Composition

Inspired by the existing Narrative Pressure system, microgenerators allow **humans to compose stories from building blocks**:

**Example: Soul Creator**
```
┌─────────────────────────────────────────────┐
│ Compose a Soul's Story                       │
├─────────────────────────────────────────────┤
│ Origin:      [Tragic Death] [Heroic Birth]  │
│ Mission:     [Seek Revenge] [Find Peace]    │
│ Obstacle:    [Cursed Name] [Forgotten Past] │
│ Companion:   [Guardian Spirit] [None]       │
│ Resolution:  [Redemption] [Eternal Quest]   │
└─────────────────────────────────────────────┘
                      ↓
         LLM expands into full backstory
                      ↓
         Soul entity created in multiverse
```

This is **fun for humans** because:
- It's a creative composition challenge (like arranging Lego blocks)
- Results become real game content
- You can share your creations
- They might appear in anyone's universe

---

## Core Requirements

### Requirement: Microgenerator Architecture

SHALL provide a framework for creating isolated content generation tools:

```typescript
interface Microgenerator {
  /** Unique identifier for this microgenerator */
  id: string;

  /** Display name */
  name: string;

  /** What type of content does this create? */
  contentType: 'legendary_item' | 'soul' | 'quest' | 'artifact' | 'prophecy';

  /** UI component for the generator */
  renderUI(): ReactComponent;

  /** Generate content from user input */
  generate(input: MicrogeneratorInput): Promise<GodCraftedContent>;

  /** Validate generated content before submission */
  validate(content: GodCraftedContent): ValidationResult;
}
```

#### Scenario: User Interacts with Microgenerator
- **WHEN** a user interacts with a microgenerator
- **THEN** they see a focused creation interface
- **THEN** they can compose narrative elements or provide descriptions
- **THEN** they can optionally collaborate with an LLM
- **THEN** the tool validates the creation
- **THEN** content is submitted to the God-Crafted Queue

### Requirement: God-Crafted Queue (Multiverse Persistence)

SHALL maintain a persistent queue of externally-created content:

```typescript
interface GodCraftedQueue {
  /** All god-crafted content awaiting discovery */
  items: GodCraftedContent[];

  /** Add new content to the queue */
  submit(content: GodCraftedContent): Promise<QueueEntry>;

  /** Retrieve content for universe discovery */
  pullForUniverse(universeId: string, filter: ContentFilter): GodCraftedContent[];

  /** Mark content as discovered (but never delete) */
  markDiscovered(contentId: string, universeId: string, discoveredBy: string): void;

  /** Query content by creator, type, tags, etc. */
  query(query: ContentQuery): GodCraftedContent[];
}
```

#### Scenario: Content Submitted to Queue
- **WHEN** content is submitted to the queue
- **THEN** it is assigned a unique ID
- **THEN** it is tagged with creator information
- **THEN** it is marked as `undiscovered` in all universes
- **THEN** it is persisted across all saves/loads (Conservation of Matter)
- **THEN** it can drift into any universe

#### Scenario: Universe Discovers Content
- **WHEN** a universe discovers content
- **THEN** content is spawned as an entity in that universe
- **THEN** the queue entry is marked as discovered (but NOT removed)
- **THEN** the same content can be discovered in other universes
- **THEN** discovery events are logged

### Requirement: Content Types

SHALL support multiple content types with appropriate data structures:

#### Legendary Item

```typescript
interface LegendaryItemContent extends GodCraftedContent {
  type: 'legendary_item';

  /** Item definition compatible with ItemRegistry */
  itemDef: ItemDefinition;

  /** Extended legendary properties */
  legendary: {
    /** Backstory and lore */
    lore: string;

    /** How this item was forged/created */
    origin: string;

    /** Special powers or effects */
    powers: LegendaryPower[];

    /** Wielders throughout history */
    historicalWielders?: string[];

    /** Quest or prophecy tied to this item */
    destiny?: string;
  };
}
```

#### Scenario: Legendary Item Discovered
- **WHEN** a legendary item is discovered
- **THEN** it spawns as a unique item instance (not stackable)
- **THEN** lore can be read via inspection
- **THEN** powers are registered with the magic system
- **THEN** item is marked as artifact-quality

#### Alien Species

```typescript
interface AlienSpeciesContent extends GodCraftedContent {
  type: 'alien_species';

  /** Species definition */
  species: {
    /** Species name */
    name: string;

    /** Physical description */
    appearance: string;

    /** Biology and physiology */
    biology: {
      baseForm: 'humanoid' | 'quadruped' | 'insectoid' | 'amorphous' | 'crystalline' | 'energy';
      senses: string[];
      locomotion: string[];
      lifespan: number;
      metabolism: string;
    };

    /** Social structure */
    society: {
      structure: 'hive' | 'pack' | 'solitary' | 'collective' | 'tribal';
      communication: string[];
      reproduction: string;
    };

    /** Cultural traits */
    culture: {
      values: string[];
      taboos: string[];
      traditions: string[];
    };

    /** Optional: Sprite/visual data */
    sprite?: {
      pixellabCharacterId?: string;
      generatedSprites?: string[];
    };
  };
}
```

#### Scenario: Alien Species Discovered
- **WHEN** an alien species is discovered
- **THEN** it can spawn as a new species in universe
- **THEN** agents of this species can be created
- **THEN** cultural traits affect behavior
- **THEN** society structure determines social systems

#### Magic System Paradigm

```typescript
interface MagicParadigmContent extends GodCraftedContent {
  type: 'magic_paradigm';

  /** Magic paradigm definition compatible with MagicParadigm */
  paradigm: {
    /** Paradigm name */
    name: string;

    /** Description */
    description: string;

    /** Magic sources */
    sources: MagicSource[];

    /** Casting mechanics */
    channels: MagicChannel[];

    /** Laws and constraints */
    laws: MagicLaw[];

    /** Risk and consequences */
    risks: MagicRisk[];

    /** How magic is learned */
    acquisition: 'study' | 'bloodline' | 'pact' | 'awakening' | 'mutation';

    /** Lore and worldbuilding */
    lore: string;
  };
}
```

#### Scenario: Magic Paradigm Discovered
- **WHEN** a magic paradigm is discovered
- **THEN** it can be adopted by a universe
- **THEN** mages in that universe follow its rules
- **THEN** spells are constrained by paradigm laws
- **THEN** paradigm becomes part of universe lore

#### Building Blueprint

```typescript
interface BuildingBlueprintContent extends GodCraftedContent {
  type: 'building';

  /** Building definition */
  building: {
    /** Building name */
    name: string;

    /** Description and purpose */
    description: string;

    /** Dimensions */
    dimensions: {
      width: number;
      height: number;
      depth?: number;
    };

    /** Material composition */
    materials: BuildingMaterial[];

    /** Material effects (from building-designer) */
    effects: MaterialEffect[];

    /** Functionality */
    functions: BuildingFunction[];

    /** Construction requirements */
    construction: {
      requiredSkills: Record<string, number>;
      buildTime: number;
      workers: number;
    };

    /** Optional: Generated sprites via PixelLab */
    sprites?: {
      isometric?: string;
      topDown?: string;
      sideView?: string;
    };
  };
}

interface BuildingMaterial {
  /** Material ID (may be newly generated) */
  materialId: string;

  /** Material name */
  name: string;

  /** Amount needed */
  quantity: number;

  /** If this is a new material, its properties */
  newMaterial?: MaterialDefinition;
}

interface MaterialDefinition {
  id: string;
  name: string;
  properties: {
    durability: number;
    insulation: number;
    aesthetics: number;
    magicConductivity?: number;
    spiritualResonance?: number;
  };
  effects: string[];
  lore: string;
}
```

#### Scenario: Building Blueprint Discovered
- **WHEN** a building blueprint is discovered
- **THEN** it is added to the building registry
- **THEN** new materials are registered if needed
- **THEN** material effects are applied
- **THEN** blueprint can be researched/unlocked
- **THEN** sprites are used for rendering

#### Soul with Mission

```typescript
interface SoulContent extends GodCraftedContent {
  type: 'soul';

  /** Soul identity and appearance */
  identity: {
    name: string;
    species: string;
    appearance: string;
  };

  /** Soul's backstory */
  backstory: string;

  /** Long-term mission/purpose */
  mission: {
    type: 'revenge' | 'redemption' | 'discovery' | 'protection' | 'legacy';
    description: string;
    objectives: MissionObjective[];
  };

  /** Starting personality traits */
  personality: {
    traits: string[];
    fears: string[];
    desires: string[];
  };

  /** Narrative components that shaped this soul */
  narrativeComponents: NarrativeComponent[];
}
```

#### Scenario: Soul Discovered
- **WHEN** a soul is discovered
- **THEN** it can incarnate as a new agent
- **THEN** mission objectives are added as long-term goals
- **THEN** backstory becomes initial memories
- **THEN** personality affects behavior selection

#### Quest/Prophecy

```typescript
interface QuestContent extends GodCraftedContent {
  type: 'quest';

  /** Quest title and description */
  title: string;
  description: string;

  /** Quest stages */
  stages: QuestStage[];

  /** Rewards for completion */
  rewards: {
    items?: string[];
    knowledge?: string[];
    abilities?: string[];
  };

  /** Who can undertake this quest */
  eligibility: {
    species?: string[];
    minLevel?: number;
    requiredItems?: string[];
  };
}
```

### Requirement: Narrative Component Library

SHALL provide a library of narrative building blocks:

```typescript
interface NarrativeComponent {
  id: string;
  category: 'origin' | 'mission' | 'obstacle' | 'companion' | 'resolution' | 'trait';

  /** Display name */
  name: string;

  /** Description of what this component represents */
  description: string;

  /** How this affects entity generation */
  effects: ComponentEffect[];

  /** Compatible component categories */
  compatibleWith: string[];

  /** Incompatible components (mutually exclusive) */
  incompatibleWith: string[];
}
```

**Example Components:**

**Origins:**
- `tragic_death` - Entity died unfairly and seeks justice
- `heroic_birth` - Born under prophesied circumstances
- `forgotten_past` - Lost all memories, seeking identity

**Missions:**
- `seek_revenge` - Must avenge a wrong
- `find_peace` - Seeking resolution and rest
- `protect_legacy` - Preserve something important
- `discover_truth` - Uncover hidden knowledge

**Obstacles:**
- `cursed_name` - True name is a vulnerability
- `time_limit` - Must complete mission before deadline
- `impossible_choice` - Mission requires sacrifice

**Resolutions:**
- `redemption` - Can achieve peace through good deeds
- `eternal_quest` - Mission never truly ends
- `transformation` - Becomes something new

#### Scenario: Composing Narrative Components
- **WHEN** composing narrative components
- **THEN** tool validates compatibility
- **THEN** LLM expands components into coherent narrative
- **THEN** conflicts generate warnings
- **THEN** final composition is stored with content

### Requirement: LLM Collaboration Mode

SHALL support LLM-assisted content creation:

```typescript
interface LLMCollaborationSession {
  /** Session ID */
  id: string;

  /** User's initial prompt/idea */
  userPrompt: string;

  /** Selected narrative components (if any) */
  components: NarrativeComponent[];

  /** LLM provider to use */
  provider: 'anthropic' | 'openai' | 'local';

  /** Generate content from prompt and components */
  generate(): Promise<GodCraftedContent>;

  /** Iteratively refine content */
  refine(feedback: string): Promise<GodCraftedContent>;
}
```

#### Scenario: User Initiates LLM Collaboration
- **WHEN** user initiates LLM collaboration
- **THEN** they can provide a text prompt
- **THEN** they can select narrative components as constraints
- **THEN** LLM generates content respecting components
- **THEN** user can iteratively refine the output
- **THEN** final result is validated before submission

### Requirement: Discovery Mechanics

SHALL implement discovery of god-crafted content in universes:

```typescript
interface DiscoverySystem {
  /** Check if content should spawn in universe */
  shouldSpawn(content: GodCraftedContent, universe: Universe): boolean;

  /** Spawn content in universe */
  spawn(content: GodCraftedContent, universe: Universe): SpawnResult;

  /** Discovery conditions (how players find content) */
  getDiscoveryConditions(content: GodCraftedContent): DiscoveryCondition[];
}

type DiscoveryCondition =
  | { type: 'random_encounter'; chance: number }
  | { type: 'quest_reward'; questId: string }
  | { type: 'location'; x: number; y: number }
  | { type: 'achievement'; achievement: string }
  | { type: 'divine_gift'; deityId: string }
  | { type: 'research'; researchId: string };
```

#### Scenario: Universe Checks for Discoveries
- **WHEN** universe checks for discoveries
- **THEN** query god-crafted queue for eligible content
- **THEN** apply rarity/spawn rate filters
- **THEN** check discovery conditions
- **THEN** spawn content if conditions met
- **THEN** mark as discovered but keep in queue

### Requirement: PixelLab Integration for Sprite Generation

SHALL integrate with PixelLab API for automatic sprite generation:

```typescript
interface PixelLabIntegration {
  /** Generate character sprites for alien species */
  generateAlienSprites(species: AlienSpeciesContent): Promise<PixelLabCharacter>;

  /** Generate building sprites */
  generateBuildingSprites(building: BuildingBlueprintContent): Promise<PixelLabTileset>;

  /** Generate item sprites for legendary items */
  generateItemSprite(item: LegendaryItemContent): Promise<string>;

  /** Generate material texture tiles */
  generateMaterialTexture(material: MaterialDefinition): Promise<string>;
}

interface PixelLabCharacter {
  characterId: string;
  directions: {
    north: string;
    south: string;
    east: string;
    west: string;
    // ... other directions
  };
  animations: {
    [animationName: string]: string[];
  };
}

interface PixelLabTileset {
  tilesetId: string;
  isometric?: string;
  topDown?: string;
  sideView?: string;
}
```

#### Scenario: User Creates Content with Visual Elements
- **WHEN** user creates content with visual elements
- **THEN** they can provide a text description
- **THEN** PixelLab API generates pixel art sprites
- **THEN** sprites are stored with the content
- **THEN** sprites are used when content spawns in-game

#### Scenario: User Enters Material Name
- **WHEN** user enters a material name
- **THEN** IF material exists in registry:
  - Use existing material definition
- **THEN** ELSE:
  - LLM generates material properties
  - PixelLab generates material texture
  - New material is registered
  - Creator is attributed

**Example: Building Creator with Material Generation**

```
User Input: "Build a temple using Starstone and Moonsilver"

System Check:
- Starstone: NOT FOUND → Generate
- Moonsilver: NOT FOUND → Generate

LLM Material Generation:
{
  "Starstone": {
    "properties": {
      "durability": 0.95,
      "aesthetics": 0.8,
      "magicConductivity": 0.7,
      "spiritualResonance": 0.9
    },
    "effects": ["amplifies_divine_magic", "glows_at_night"],
    "lore": "Quarried from fallen meteorites, Starstone resonates with cosmic energies..."
  },
  "Moonsilver": {
    "properties": {
      "durability": 0.6,
      "aesthetics": 0.95,
      "magicConductivity": 0.85
    },
    "effects": ["reflects_moon_phases", "calming_aura"],
    "lore": "A silvery metal that waxes and wanes with the moon's cycle..."
  }
}

PixelLab Generation:
- Generate Starstone texture tile (dark blue with white sparkles)
- Generate Moonsilver texture tile (silver with shimmer effect)
- Generate temple building sprites using both materials

Result:
- 2 new materials added to global registry
- Temple blueprint with custom sprites
- All added to god-crafted queue
```

### Requirement: Creator Attribution (Divine Signature)

SHALL require creators to declare themselves as gods with a domain:

```typescript
interface GodCraftedContent {
  id: string;
  type: ContentType;

  /** Creator information - Divine Signature */
  creator: {
    id: string;
    name: string;
    godOf: string;              // "God of Late Night Claude Code Coding Sessions"
    createdAt: number;
    source: 'microgenerator' | 'llm_collab' | 'manual';
    previousCreations?: number; // How many creations this god has made
  };

  /** Tags for filtering/discovery */
  tags: string[];

  /** Human-readable lore/description */
  lore: string;

  /** Actual content data */
  data: unknown;

  /** Validation status */
  validated: boolean;

  /** Multiverse discovery tracking */
  discoveries: {
    universeId: string;
    discoveredBy: string;
    discoveredAt: number;
  }[];
}
```

#### Scenario: User Opens Microgenerator
- **WHEN** user opens a microgenerator
- **THEN** they must enter their name
- **THEN** they must declare what they are "God of"
- **THEN** this becomes their divine signature
- **THEN** signature is saved for future creations
- **THEN** they can change their domain for each creation

#### Scenario: Content Inspected In-Game
- **WHEN** content is inspected in-game
- **THEN** divine signature is displayed: "Crafted by Liz, God of Late Night Claude Code Coding Sessions"
- **THEN** creation date is shown
- **THEN** discovery history is accessible
- **THEN** attribution persists across saves
- **THEN** player can see all creations by this god

**Divine Signature UI Example:**

```
┌──────────────────────────────────────────────┐
│ Before you can forge legendary content,      │
│ you must declare your divine identity:       │
├──────────────────────────────────────────────┤
│ Your Name: [Liz                            ] │
│                                              │
│ God of:    [Late Night Claude Code Sessions] │
│                                              │
│ Your divine signature:                       │
│ "Crafted by Liz, God of Late Night Claude   │
│  Code Coding Sessions"                       │
│                                              │
│ [Save Divine Signature] [Change for Each]   │
└──────────────────────────────────────────────┘
```

#### Scenario: Content Discovered in Universe
- **WHEN** content is discovered in a universe
- **THEN** a lore event is generated: "You have discovered an artifact crafted by Liz, God of Late Night Claude Code Coding Sessions"
- **THEN** agents can remember and reference the creator
- **THEN** multiple creations by same god create a pantheon presence

---

## Integration Points

### With Persistence System

**God-crafted queue MUST persist across saves:**

```typescript
interface SaveFile {
  // ... existing fields

  godCraftedQueue: {
    version: number;
    entries: GodCraftedContent[];
  };
}
```

All content follows **Conservation of Game Matter**:
- Content is NEVER deleted
- Even if "removed" from a universe, it stays in queue
- Corrupted content is marked but preserved
- Creator can "deprecate" but not delete

### With Item System

**Legendary items integrate with ItemRegistry:**

```typescript
// When legendary item discovered
const itemDef = legendaryContent.itemDef;
itemRegistry.register(itemDef);

const instance = createItemInstance(itemDef.id, {
  unique: true,
  legendary: legendaryContent.legendary,
  creator: legendaryContent.creator,
});
```

### With Soul/Agent System

**Souls integrate with reincarnation system:**

```typescript
// When soul discovered and ready to incarnate
const soulData = soulContent.data;
const agent = createAgent({
  species: soulData.identity.species,
  name: soulData.identity.name,
  personality: soulData.personality,
});

// Add mission as long-term goals
for (const objective of soulData.mission.objectives) {
  agent.addGoal(objective);
}

// Backstory becomes initial memories
agent.addMemory({
  type: 'semantic',
  content: soulData.backstory,
  source: 'innate',
});
```

### With Narrative Pressure System

**Quests create outcome attractors:**

```typescript
// When quest accepted
for (const stage of questContent.stages) {
  createOutcomeAttractor({
    source: { type: 'storyteller', narrativeForce: questContent.id },
    goal: stage.goal,
    strength: 0.7,
    scope: { type: 'entity', entityId: acceptingAgentId },
  });
}
```

---

## Implementation Phases

### Phase 1: Core Framework (Foundation)

**Status:** Not Started
**Systems Touched:** 2 (Persistence, Core)

**Deliverables:**
- `GodCraftedQueue` data structure
- Persistence integration for queue
- Basic content validation
- Creator attribution

**Acceptance Criteria:**
- Content can be submitted to queue
- Queue persists across save/load
- Content can be queried by type/creator

### Phase 2: Legendary Item Microgenerator (First Generator)

**Status:** Not Started
**Systems Touched:** 2 (Items, Microgenerators)

**Deliverables:**
- Legendary item data structure
- Item creation UI (web-based)
- LLM integration for lore generation
- Item discovery in universes

**Acceptance Criteria:**
- Users can create legendary swords via UI
- LLM generates lore from prompts
- Items appear in game as unique artifacts
- Creator attribution visible on inspection

### Phase 3: Narrative Component Library

**Status:** Not Started
**Systems Touched:** 1 (Narrative)

**Deliverables:**
- Narrative component definitions
- Compatibility validation
- Component composition UI
- LLM expansion of component combinations

**Acceptance Criteria:**
- Library has 20+ components across categories
- Composition UI validates compatibility
- LLM respects component constraints

### Phase 4: Soul Creator Microgenerator

**Status:** Not Started
**Systems Touched:** 3 (Souls, Agents, Narrative)

**Deliverables:**
- Soul content data structure
- Soul creation UI with narrative components
- Mission system integration
- Soul incarnation mechanics

**Acceptance Criteria:**
- Users can compose souls from narrative blocks
- Souls incarnate as agents with missions
- Missions create long-term goals
- Backstories become memories

### Phase 5: Quest/Prophecy Microgenerator

**Status:** Not Started
**Systems Touched:** 2 (Quests, Narrative Pressure)

**Deliverables:**
- Quest/prophecy data structures
- Quest creation UI
- Integration with narrative pressure
- Quest discovery and acceptance

**Acceptance Criteria:**
- Users can create multi-stage quests
- Quests create outcome attractors
- Agents can discover and accept quests
- Quest progress is tracked

### Phase 6: Building Creator with Material Generation

**Status:** Not Started
**Systems Touched:** 4 (Buildings, Materials, PixelLab, LLM)

**Deliverables:**
- Building blueprint data structure
- Material auto-generation system
- PixelLab building sprite integration
- Material effect application
- Building creation UI

**Acceptance Criteria:**
- Users can describe buildings with materials
- Unknown materials are auto-generated via LLM
- PixelLab generates building sprites
- Material effects are applied (from building-designer)
- New materials persist in global registry

### Phase 7: Alien Species Creator

**Status:** Not Started
**Systems Touched:** 3 (Species, PixelLab, Agent)

**Deliverables:**
- Alien species data structure
- Biology/culture/society composition UI
- PixelLab character sprite generation
- Species spawning in universes
- Cultural trait integration

**Acceptance Criteria:**
- Users can design alien species
- Species have unique biology and culture
- PixelLab generates character sprites (8-directional)
- Aliens can spawn as agents
- Cultural traits affect behavior

### Phase 8: Magic System Creator

**Status:** Not Started
**Systems Touched:** 2 (Magic, Paradigm)

**Deliverables:**
- Magic paradigm composition UI
- Source/channel/law builder
- Paradigm validation
- Universe adoption mechanics
- Lore generation

**Acceptance Criteria:**
- Users can compose magic systems
- Paradigms are internally consistent
- LLM generates worldbuilding lore
- Universes can adopt paradigms
- Mages follow paradigm rules

### Phase 9: Discovery System

**Status:** Not Started
**Systems Touched:** 2 (Discovery, Events)

**Deliverables:**
- Discovery condition framework
- Spawn rate balancing
- Random encounter integration
- Discovery event logging

**Acceptance Criteria:**
- Content spawns based on conditions
- Discovery feels rare but achievable
- Multiple discovery methods work
- Discovery is celebrated in-game

---

## Examples

### Example 1: Creating a Building with Auto-Generated Materials

**User opens Building Creator Microgenerator:**

```
┌──────────────────────────────────────────────────────────┐
│ Forge a Legendary Building                               │
├──────────────────────────────────────────────────────────┤
│ Building Name: "Temple of Eternal Stars"                 │
│ Purpose:       [Religious ▼]                             │
│ Dimensions:    Width: 20  Height: 30  Depth: 15          │
│                                                           │
│ Materials (enter names, we'll generate if needed):       │
│ • Starstone        [Amount: 500] ⚠️ NEW MATERIAL         │
│ • Moonsilver       [Amount: 200] ⚠️ NEW MATERIAL         │
│ • Obsidian         [Amount: 100] ✓ EXISTING              │
│                                                           │
│ Description:                                              │
│ "A grand temple with star-speckled walls that glow at   │
│  night. Silver accents reflect the moon's phases..."     │
│                                                           │
│ [Generate Materials with LLM]                            │
│ [Generate Building Sprites with PixelLab]               │
│ [Submit to Multiverse]                                   │
└──────────────────────────────────────────────────────────┘
```

**Step 1: LLM generates new materials**

```json
{
  "Starstone": {
    "properties": {
      "durability": 0.95,
      "insulation": 0.7,
      "aesthetics": 0.85,
      "magicConductivity": 0.8,
      "spiritualResonance": 0.9
    },
    "effects": [
      "amplifies_divine_magic",
      "glows_at_night",
      "star_navigation_bonus"
    ],
    "lore": "Quarried from fallen meteorites, Starstone resonates with cosmic energies. Ancient astronomers built observatories from this material to commune with celestial beings."
  },
  "Moonsilver": {
    "properties": {
      "durability": 0.6,
      "aesthetics": 0.95,
      "magicConductivity": 0.85,
      "spiritualResonance": 0.7
    },
    "effects": [
      "reflects_moon_phases",
      "calming_aura",
      "nocturnal_vision_boost"
    ],
    "lore": "A silvery metal that waxes and wanes with the moon. Forged only during full moons, it channels lunar magic."
  }
}
```

**Step 2: PixelLab generates sprites**

```
Generating isometric view:
  → Starstone texture: dark blue with white sparkles
  → Moonsilver accents: silver shimmer
  → Combined building sprite: 20x30 isometric temple

Generating top-down view:
  → Floor plan with star patterns
  → Roof with silver domes

Result: Temple sprites ready
```

**Step 3: Divine Signature Required**

```
┌──────────────────────────────────────────────┐
│ Before submitting, declare your divine      │
│ identity as the creator:                    │
├──────────────────────────────────────────────┤
│ Your Name: [Marcus                         ] │
│ God of:    [Impossible Architecture        ] │
│                                              │
│ Divine Signature Preview:                    │
│ "Crafted by Marcus, God of Impossible       │
│  Architecture"                               │
│                                              │
│ [Submit to Multiverse]                       │
└──────────────────────────────────────────────┘
```

**Final Result:**
- **2 new materials** added to global material registry (Starstone, Moonsilver)
- **Temple blueprint** with custom materials and effects
- **PixelLab sprites** (isometric, top-down, side view)
- **All content** added to god-crafted queue
- **Divine Signature:** "Crafted by Marcus, God of Impossible Architecture"
- When discovered: "You have found the Temple of Eternal Stars, crafted by Marcus, God of Impossible Architecture"

### Example 2: Creating an Alien Species

**User opens Alien Species Creator:**

```
┌──────────────────────────────────────────────────────────┐
│ Design an Alien Species                                  │
├──────────────────────────────────────────────────────────┤
│ Species Name: "Luminae"                                  │
│                                                           │
│ Physical Form:   [Humanoid ▼]                            │
│ Primary Sense:   [Bioluminescence Communication ✓]       │
│ Locomotion:      [Bipedal ✓] [Flight ✓]                 │
│ Lifespan:        [500 years]                             │
│                                                           │
│ Social Structure: [Collective Consciousness ▼]           │
│ Reproduction:     [Budding from elder forms]             │
│                                                           │
│ Cultural Values:                                         │
│ • Harmony with light                                     │
│ • Preservation of knowledge                              │
│ • Non-violence                                           │
│                                                           │
│ Appearance Description:                                  │
│ "Translucent humanoids that glow with inner light.      │
│  They have four eyes arranged in a diamond pattern      │
│  and delicate wings that shimmer with rainbow hues..."   │
│                                                           │
│ [Generate Culture Lore with LLM]                         │
│ [Generate Sprites with PixelLab (8 directions)]         │
│ [Submit to Multiverse]                                   │
└──────────────────────────────────────────────────────────┘
```

**Step 1: LLM expands culture and lore**

```
The Luminae evolved on a world with three suns, where darkness
never falls. They communicate through patterns of light across
their translucent skin, creating a language of color and rhythm.

Their collective consciousness allows them to share knowledge
instantly across their population. When a Luminae learns something,
all Luminae eventually know it through their light-pulse network.

They reproduce by budding: an elder Luminae who has accumulated
great knowledge will split into two beings, passing half their
memories to the new individual...
```

**Step 2: PixelLab generates character sprites**

```
Generating character with 8 directions:
  → Description: "Translucent glowing humanoid with 4 eyes, rainbow wings"
  → Style: medium detail, selective outline, basic shading
  → Animations: walking, idle, flying

Result: Character ID = luminae_001
  - 8 directional sprites
  - 3 animations per direction
  - Glowing effect applied
```

**Step 3: Divine Signature**

```
Your Name: [Aria                           ]
God of:    [Bioluminescent Dreams         ]

Divine Signature:
"Crafted by Aria, God of Bioluminescent Dreams"
```

**Final Result:**
- **New alien species** "Luminae" added to species registry
- **Cultural traits** affect behavior (non-violence, knowledge sharing)
- **PixelLab sprites** ready for in-game use (8 directions, 3 animations)
- **Collective consciousness** integrates with social systems
- **Divine Signature:** "Crafted by Aria, God of Bioluminescent Dreams"
- Can spawn as agents in any universe
- When encountered: "You meet a Luminae, one of the species crafted by Aria, God of Bioluminescent Dreams"

### Example 3: Creating a Magic System

**User opens Magic System Creator:**

```
┌──────────────────────────────────────────────────────────┐
│ Design a Magic Paradigm                                  │
├──────────────────────────────────────────────────────────┤
│ Paradigm Name: "Echo Magic"                              │
│                                                           │
│ Sources (where power comes from):                        │
│ ☑ Emotional (from strong feelings)                       │
│ ☑ Temporal (from past/future echoes)                     │
│                                                           │
│ Channels (how magic is shaped):                          │
│ ☑ Verbal (spoken incantations)                           │
│ ☑ Emotional (channeling feelings)                        │
│                                                           │
│ Laws (what rules constrain it):                          │
│ ☑ Echoes Fade (magic weakens over time)                  │
│ ☑ Emotional Resonance (stronger when feelings align)     │
│ ☑ Cannot Create, Only Echo (can only replicate)          │
│                                                           │
│ Risks:                                                    │
│ ☑ Emotional Burnout (exhausts caster's feelings)         │
│ ☑ Temporal Paradox (echoing future can break timeline)   │
│                                                           │
│ Description:                                              │
│ "Echo Magic allows mages to reach into past or future    │
│  emotional moments and pull their energy into the        │
│  present. A mage can echo the joy of a past victory or   │
│  the fear of a future threat..."                         │
│                                                           │
│ [Generate Lore with LLM]                                 │
│ [Submit to Multiverse]                                   │
└──────────────────────────────────────────────────────────┘
```

**LLM generates worldbuilding lore:**

```
Echo Magic originated when the Luminae discovered they could
preserve emotional light-patterns from the past. By recreating
the exact emotional state of a historical moment, they could
manifest its effects in the present.

However, Echo Magic is inherently unstable. The further back
in time you reach, the fainter the echo. And pulling from the
future is dangerous - you might echo an event that never comes
to pass, creating a paradox.

Master Echo Mages can echo entire battles, replaying ancient
victories to defeat modern foes. But the emotional toll is
immense - channeling centuries of rage or grief can leave a
mage emotionally hollow for days...
```

**Divine Signature:**

```
Your Name: [Cassian                        ]
God of:    [Temporal Paradoxes             ]

"Crafted by Cassian, God of Temporal Paradoxes"
```

**Final Result:**
- **New magic paradigm** "Echo Magic" added to paradigm library
- **Universe can adopt** this as their magic system
- **Spells constrained** by paradigm laws (can only echo, not create)
- **LLM-generated lore** provides worldbuilding context
- **Divine Signature:** "Crafted by Cassian, God of Temporal Paradoxes"
- **Mages in this universe** follow Echo Magic rules
- When paradigm is adopted: "This universe now follows Echo Magic, a system crafted by Cassian, God of Temporal Paradoxes"

### Example 4: Composing a Soul with Mission

**User opens Soul Creator:**

```
┌─────────────────────────────────────────────┐
│ Compose a Soul's Destiny                     │
├─────────────────────────────────────────────┤
│ Select narrative components:                 │
│                                              │
│ Origin:      [Tragic Death ✓]               │
│ Mission:     [Seek Revenge ✓]               │
│ Obstacle:    [Time Limit ✓]                 │
│ Resolution:  [Redemption ✓]                 │
│                                              │
│ Generated Backstory (LLM):                   │
│ "Aldric was a farmer who died protecting    │
│  his village from bandits. His soul refuses │
│  to rest until he avenges his family, but   │
│  he has only until the winter solstice to   │
│  complete his mission. If he succeeds       │
│  through just means, he will find peace..." │
│                                              │
│ [Regenerate] [Submit to Multiverse]         │
└─────────────────────────────────────────────┘
```

**Divine Signature:**

```
Your Name: [Liz                                  ]
God of:    [Late Night Claude Code Coding Sessions]

"Crafted by Liz, God of Late Night Claude Code Coding Sessions"
```

**Result:**
- **Soul "Aldric"** added to god-crafted queue with mission objectives
- **Divine Signature:** "Crafted by Liz, God of Late Night Claude Code Coding Sessions"
- Can incarnate in any universe
- Agent spawns with revenge goal and tragic backstory
- Time limit creates narrative pressure (until winter solstice)
- When incarnated: "A new soul has entered this world - Aldric, crafted by Liz, God of Late Night Claude Code Coding Sessions"

---

## Additional Microgenerator Candidates

Based on codebase analysis, the following existing systems could be exposed as microgenerators:

### Tier 1: LLM-Ready (Existing full LLM integration)

| Generator | Purpose | File | Input | Output |
|-----------|---------|------|-------|--------|
| **Spell Laboratory** | Create magic spells through experimentation | `core/src/magic/LLMEffectGenerator.ts` | Techniques, forms, reagents | Complete SpellDefinition |
| **Culinary Experiments** | Invent recipes from ingredient combinations | `core/src/crafting/LLMRecipeGenerator.ts` | Ingredients, recipe type | ItemDefinition + Recipe |
| **Research Academy** | Discover new technologies | `core/src/research/LLMTechnologyGenerator.ts` | Materials, skills, personality | ResearchDefinition |
| **Xenobiology Lab** | Generate alien species | `world/src/alien-generation/AlienSpeciesGenerator.ts` | Environment, intelligence | Full alien species + sprite prompts |
| **Death's Riddle Book** | Create personalized hero riddles | `core/src/divinity/RiddleGenerator.ts` | Hero deeds, cause of death | Riddle with answers |
| **Divine Oracle** | Generate deity visions | `core/src/divinity/LLMVisionGenerator.ts` | Deity, agent context, purpose | VisionContent |
| **Character Studio** | Create NPC personalities | `core/src/profession/ProfessionPersonalityGenerator.ts` | Profession, name, city | Catchphrases, quirks |
| **TV Studio** | Generate show scripts | `core/src/television/generation/ScriptGenerator.ts` | Format, characters, storylines | Full episode script |

### Tier 2: Registry-Based (Accept new entries, need UI)

| Generator | Purpose | File | Microgenerator Concept |
|-----------|---------|------|------------------------|
| **Architect's Dream** | Custom buildings | `core/src/buildings/BuildingBlueprintRegistry.ts` | Design buildings with custom functions |
| **Behavior Scripting** | Agent behaviors | `core/src/behavior/BehaviorRegistry.ts` | Create custom agent decision patterns |
| **Narrative Designer** | Plot templates | `core/src/plot/PlotTemplates.ts` | Design story arcs with stages |
| **Magic Theory Lab** | Magic sources | `core/src/magic/MagicSourceGenerator.ts` | Create new magic power sources |

### Tier 3: Template Extension (Configuration-based)

| Generator | Purpose | File | Notes |
|-----------|---------|------|-------|
| **Deity Pantheon** | Create gods | `divinity/` | Combines personality + domains + powers |
| **Religion Forge** | Design religions | `divinity/` | Rituals, temples, priests |
| **Language Architect** | Construct languages | Name generators + patterns | Phonemes, grammar rules |
| **Biome Designer** | Create environments | Terrain + weather systems | Climate, flora, fauna rules |
| **Festival Creator** | Design celebrations | Calendar + event systems | Timing, rituals, rewards |

### Integration with Existing Systems

**Spell Laboratory** flow:
```
User selects techniques → User selects forms → User adds reagents
    ↓
LLMEffectGenerator creates spell
    ↓
Divine scrutiny validates
    ↓
SpellRegistry accepts
    ↓
God-crafted queue
```

**Culinary Experiments** flow:
```
User combines ingredients → Sets recipe type → Provides context
    ↓
LLMRecipeGenerator creates item + recipe
    ↓
Uniqueness validation against existing items
    ↓
ItemRegistry + RecipeRegistry accept
    ↓
God-crafted queue
```

**Xenobiology Lab** flow:
```
User configures environment → Sets intelligence → Defines danger level
    ↓
AlienSpeciesGenerator creates full species
    ↓
PixelLab generates character sprites (8 directions)
    ↓
Species registry accepts
    ↓
Can spawn in any universe
```

---

## Open Questions

1. **Curation:** Should there be a review/approval process for submitted content?
   - **Option A:** All submissions go into queue immediately (trust creators)
   - **Option B:** Moderation queue for QA
   - **Recommendation:** Start with A, add B if abuse occurs

2. **Rarity:** How rare should god-crafted discoveries be?
   - **Recommendation:** Configurable per universe, default 1-2% chance per day

3. **Balancing:** How to prevent overpowered legendary items?
   - **Recommendation:** Power budget validator (similar to research system)

4. **Cross-universe uniqueness:** Can same content appear in multiple universes?
   - **Recommendation:** Yes, but mark as "echoes across realities" (lore-appropriate)

---

## Success Metrics

**Microgenerator engagement:**
- Number of content submissions per week
- Variety of content types created
- Creator retention (repeat submissions)

**In-game impact:**
- Legendary items discovered per universe
- Souls incarnated from queue
- Quests accepted and completed

**Quality:**
- Validation pass rate
- User ratings of discovered content
- LLM collaboration satisfaction

---

## References

- [METASYSTEMS_GUIDE.md](../../custom_game_engine/METASYSTEMS_GUIDE.md#persistence-system) - Persistence and multiverse
- [ItemDefinition.ts](../../custom_game_engine/packages/core/src/items/ItemDefinition.ts) - Item system
- [GeneratedContent](../../custom_game_engine/packages/core/src/research/types.ts) - Existing generation framework
- [NarrativePressureTypes.ts](../../custom_game_engine/packages/core/src/narrative/NarrativePressureTypes.ts) - Narrative components
- [CLAUDE.md](../../CLAUDE.md#conservation-of-game-matter) - Conservation principle

---

**End of Specification**
