# AI Village: Infinite Generative Simulation Game

**Proposed:** 2025-12-20
**Status:** Draft
**Priority:** TIER 1
**Complexity:** 9 systems

---

## Summary

AI Village is a browser-based simulation game where LLM-controlled agents inhabit a village, growing crops, constructing buildings, crafting goods, and researching new technologies. The player can control any agent directly or spectate the village's autonomous development. Using generative AI (open-source LLMs + image generation), the game creates an "infinite game" where new items, recipes, crops, and artifacts are procedurally invented and persist permanently—similar to Dwarf Fortress or RimWorld, but with generative AI enabling truly novel content.

---

## Vision

### Core Concept

**"What if Stardew Valley met Dwarf Fortress, powered by generative AI?"**

- **Village Simulation:** AI agents with personalities, memories, and goals
- **Farming/Crafting/Building:** Classic cozy game mechanics
- **Infinite Content:** LLM-generated items, recipes, lore that persist forever
- **Player Agency:** Play as any villager, or spectate and manage
- **Multiple Themes:** Same core engine, different aesthetic worlds
- **8-Bit Style:** Retro pixel art aesthetic with generated sprites

### Design Pillars

1. **Emergent Stories:** AI agents create narratives through their interactions
2. **Persistent Discovery:** Every generated item/recipe is permanent
3. **Balanced Infinity:** Scaling laws prevent power creep
4. **Player Freedom:** Control, spectate, or hybrid play
5. **Themeable Worlds:** One engine, many aesthetic universes

---

## Game Themes

The core engine supports multiple themed worlds:

### Theme System

```typescript
interface GameTheme {
  id: string;
  name: string;
  description: string;

  // Aesthetics
  palette: ColorPalette;
  tilesets: ThemeTileset;
  characterStyles: CharacterStyle[];
  musicStyle: string;

  // Content
  baseItems: ItemDefinition[];
  baseCrops: CropDefinition[];
  baseBuildings: BuildingDefinition[];
  techTree: ResearchDefinition[];

  // Lore
  worldLore: string;
  agentArchetypes: AgentArchetype[];
  nameGenerators: NameGenerator[];

  // Generation constraints
  itemGenerationStyle: string;    // LLM prompt prefix
  architecturalStyle: string;
  cropStyle: string;

  // Mechanics variations
  seasonNames: string[];
  currencyName: string;
  specialMechanics: ThemeMechanic[];
}
```

### Planned Themes

| Theme | Setting | Unique Elements |
|-------|---------|-----------------|
| **Forest Village** | Medieval fantasy forest | Magic research, woodland creatures |
| **Feudal Grove** | Japanese-inspired forest | Honor system, seasonal festivals |
| **Starfall Colony** | Alien planet settlement | Terraforming, xenobiology |
| **Dreamweave** | Surreal alternate dimension | Reality-bending, unstable terrain |
| **Clockwork Vale** | Steampunk Victorian | Automation focus, gear-based tech |
| **Tidepool Atoll** | Tropical island cluster | Fishing focus, boat travel |

### Theme Structure

```
themes/
├── forest-village/
│   ├── theme.json           # Theme configuration
│   ├── palette.json         # Color palette
│   ├── items/               # Base item definitions
│   ├── crops/               # Base crop definitions
│   ├── buildings/           # Base building definitions
│   ├── research/            # Tech tree
│   ├── agents/              # Agent archetypes
│   ├── sprites/             # Theme-specific sprites
│   └── lore/                # World lore documents
├── feudal-grove/
│   └── ...
└── starfall-colony/
    └── ...
```

---

## Player Modes

### Mode 1: Agent Control (Primary)

The player embodies a specific villager:

- **First-person perspective** (through that agent's eyes)
- **Direct control** of movement, actions, inventory
- **Agent stats/skills** apply to player actions
- **Energy/mood** management
- **Personal goals** and progression
- **Social relationships** with AI agents
- **Switch agents** at any time (possess different villager)

### Mode 2: Spectator/Manager

The player observes and guides:

- **Overhead view** of entire village
- **Time controls** (pause, speed up, slow down)
- **Agent selection** to view their thoughts/plans
- **Zone designation** (farm here, build there)
- **Priority setting** for village goals
- **Statistics dashboard** for economy/population

### Mode 3: Hybrid

Switch fluidly between modes:

- Control an agent for detailed work
- Pop out to spectator for overview
- Issue village-wide directives
- Return to embodied play

---

## Technology Stack

### Frontend
- **Vite + TypeScript** - Build system and language
- **PixiJS** or **Phaser** - 2D rendering
- **Zustand** - State management
- **IndexedDB** - Local persistence

### AI Backend
- **Open-source LLMs** (Llama 3, Mistral, Qwen)
- **Ollama** or **vLLM** for local inference
- **OpenRouter** for hosted inference option
- **Stable Diffusion** (optional) for sprite generation

### Backend (Optional)
- **SQLite/PostgreSQL** - Persistent world storage
- **WebSocket** - Real-time updates
- **S3-compatible** - Generated asset storage

---

## Core Systems

| System | Spec | Description |
|--------|------|-------------|
| Game Engine | `game-engine/spec.md` | Core loop, time, events, scenarios |
| Agents | `agent-system/spec.md` | LLM-controlled villagers, memories, goals |
| World | `world-system/spec.md` | Terrain, biomes, resources, weather |
| Farming | `farming-system/spec.md` | Crops, growth, breeding, hybrids |
| Construction | `construction-system/spec.md` | Buildings, upgrades, maintenance |
| Items | `items-system/spec.md` | Inventory, crafting, generative artifacts |
| Research | `research-system/spec.md` | Tech tree, invention, discovery |
| Economy | `economy-system/spec.md` | Shops, trading, currency |
| Rendering | `rendering-system/spec.md` | 8-bit graphics, UI, generated sprites |

---

## Balance System

### Scaling Laws

To prevent the "infinite game" from becoming unbalanced:

1. **Tier-Based Power Caps:** Items capped by research/material tier
2. **Diminishing Returns:** Stacking effects reduces each additional effect
3. **Deduplication:** Similar generated items are rejected or forced to differ
4. **Power Budget:** Each item has a total effect strength limit
5. **Economic Balance:** Prices scale with power, sinks match faucets
6. **Discovery Rate Limits:** Max discoveries per time period
7. **Maintenance Costs:** Powerful items require upkeep

### Distribution System

- Track power distribution across categories
- Bias generation toward underrepresented areas
- Prevent any single effect type from dominating
- Balance specialist vs generalist items

---

## Generative Content

### What Gets Generated

| Content Type | Generation Trigger | Persistence |
|--------------|-------------------|-------------|
| Items/Artifacts | Research, rare events | Permanent |
| Recipes | Research, experimentation | Permanent |
| Crops | Hybridization, discovery | Permanent |
| Buildings | Advanced construction | Permanent |
| Agent Memories | All experiences | Per-agent |
| World Events | Random, seasonal | Logged |
| Lore/History | Major events | Permanent |
| Sprites | Item/crop generation | Cached |

### Generation Pipeline

```
1. Trigger event (research complete, hybrid crop, etc.)
2. Gather context (materials, agent, existing items)
3. Apply constraints (tier, budget, dedup)
4. Generate via LLM (structured output)
5. Validate against rules
6. Generate/assign sprite
7. Persist to database
8. Integrate into game systems
```

---

## Scenarios

Predefined starting configurations:

| Scenario | Agents | Starting Resources | Challenge |
|----------|--------|-------------------|-----------|
| **New Beginning** | 3 | Minimal | Build from scratch |
| **Established Village** | 8 | Moderate | Expand and prosper |
| **Harsh Winter** | 5 | Low | Survive the season |
| **Trade Outpost** | 4 | Currency-rich | Economy focus |
| **Research Colony** | 6 | Tech-rich | Discovery focus |
| **Sandbox** | Custom | Custom | No objectives |

---

## Implementation Phases

### Phase 1: Core Engine
- Game loop and time system
- Basic world generation
- Tile rendering
- Agent movement and basic AI
- Player control mode

### Phase 2: Farming & Items
- Crop system with growth
- Basic items and inventory
- Crafting with predefined recipes
- Storage buildings

### Phase 3: Construction & Economy
- Building placement and construction
- Shop system
- Trading between agents
- Basic economy simulation

### Phase 4: Agent Intelligence
- LLM integration for decisions
- Memory system
- Goal-driven behavior
- Agent personalities

### Phase 5: Generative Systems
- Item generation pipeline
- Recipe invention
- Crop hybridization
- Balance systems

### Phase 6: Polish & Themes
- UI/UX refinement
- Additional themes
- Sprite generation
- Save/load system
- Tutorial/onboarding

---

## Success Metrics

- Agents make believable, personality-consistent decisions
- Generated content feels coherent with existing items
- Economy remains balanced over extended play
- Player can seamlessly switch between control modes
- New discoveries feel rewarding, not overwhelming
- Themes feel distinct while sharing core mechanics

---

## Open Questions

1. **Multiplayer:** Shared villages? Competing villages?
2. **Modding:** Community themes and content packs?
3. **Mobile:** Touch controls? Simplified mode?
4. **Persistence:** Cloud saves? Cross-device play?
5. **Streaming:** Twitch integration? Viewer influence?

---

## Related Documents

- `openspec/specs/game-engine/spec.md`
- `openspec/specs/agent-system/spec.md`
- `openspec/specs/world-system/spec.md`
- `openspec/specs/farming-system/spec.md`
- `openspec/specs/construction-system/spec.md`
- `openspec/specs/items-system/spec.md`
- `openspec/specs/research-system/spec.md`
- `openspec/specs/economy-system/spec.md`
- `openspec/specs/rendering-system/spec.md`

---

**This is the beginning of an infinite world. Let's build it.**
