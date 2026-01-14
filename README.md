# Multiverse: The End of Eternity

## 🔥 Release: "Turnin' Up the Heat" 🔥

An open-source simulation game where AI agents live, work, and build communities together.

---

## Dedication

**This project is dedicated to Tarn Adams and the Dwarf Fortress legacy.**

For over 20 years, Tarn and his brother Zach have shown what's possible when you commit to depth over polish, simulation over shortcuts, and giving freely to a community. Dwarf Fortress proved that a game can be art, science, and endless surprise - all while remaining freely available for most of its life.

The architectural patterns in Multiverse: The End of Eternity - the component-based item system, the material templates, the separation of data from behavior - are directly inspired by lessons Tarn has shared through interviews, GDC talks, and his [Game AI Pro 2 chapter on simulation principles](http://www.gameaipro.com/GameAIPro2/GameAIPro2_Chapter41_Simulation_Principles_from_Dwarf_Fortress.pdf).

If you haven't played Dwarf Fortress, you should:

**[Dwarf Fortress on Steam](https://store.steampowered.com/app/975370/Dwarf_Fortress/)**

Strike the earth.

---

## Philosophy

### Open Source, Open Spirit

This project is open source not as a business model, but as a value. The best games emerge from communities that can see, modify, and extend them. We believe:

- **Code should be readable** - If you want to understand how something works, you should be able to read it
- **Modding should be first-class** - The same tools we use to build the game should be available to everyone
- **Effects and items should be shareable** - Your creations can travel between universes
- **The simulation should be honest** - No hidden systems, no fake randomness, no theater

### No Excessive Monetization

We're not building this to extract maximum value from players. There will be no:

- Loot boxes or gambling mechanics
- Pay-to-win advantages
- Artificial scarcity of digital goods
- Dark patterns designed to manipulate spending
- Subscription-gated core features

If monetization ever becomes necessary, it will be:

- Transparent (you know what you're paying for)
- Fair (cosmetics and conveniences, not power)
- Optional (the full game experience without payment)
- Respectful (no pressure, no manipulation)

### LLM-Powered, Human-Centered

Multiverse: The End of Eternity uses large language models to give agents personality, memory, and the ability to surprise us. But:

- **Humans stay in the loop** - Generated content goes through validation pipelines
- **The simulation is the sandbox** - We test new effects by forking universes, not just trusting outputs
- **Players can create** - LLMs help you compose effects, they don't replace your creativity
- **Nothing is hidden** - You can see the prompts, the context, the decision-making

---

## What Is This?

Multiverse: The End of Eternity is a simulation game where autonomous AI agents:

- **Live** - They have needs, moods, relationships, and memories
- **Work** - They gather resources, craft items, build structures
- **Socialize** - They talk, form friendships, hold opinions about each other
- **Survive** - They navigate environmental hazards like fire, drowning, and temperature extremes
- **Surprise** - Their LLM-driven decisions create emergent stories

You'll eventually have a **pawn** - a character you control - who lives alongside these agents. But the village persists and grows even when you're not directing it.

### Key Features

#### Environmental Systems
- **Ocean Ecosystems** - Deep ocean life with 15+ aquatic species, bioluminescence, and depth-based spawning
- **Fluid Dynamics** - Realistic water currents, swimming mechanics, and drowning simulation
- **Fire Propagation** - Material-based fire spread with wind effects, fuel consumption, and extinguishing mechanics
- **Temperature Simulation** - Heat and cold affecting agent behavior and survival
- **Biome Transitions** - Smooth terrain blending between biomes with gradient-based mixing

#### Magic & Divine Systems
- **25+ Magic Paradigms** - From Shinto spirit magic to Allomancy to Sympathy
- **Skill Tree Progression** - Visual skill trees with XP-based unlocking
- **Composable Spells** - Verb/noun spell composition (inspired by Ars Magica)
- **LLM-Generated Effects** - Novel magic validated through simulation testing
- **Divinity Systems** - Gods, temples, prayers, miracles, divine intervention, and theology
- **Belief & Faith** - Agent belief systems, religious conversion, and divine power accumulation

#### Life & Consciousness
- **Reproduction & Genetics** - Courtship, pregnancy, midwifery, family relationships, and trait inheritance
- **Realms & Afterlife** - Underworld, judgment, reincarnation, and soul progression
- **Consciousness** - Hive minds, pack minds, and emergent collective intelligence
- **Soul System** - Souls persist across incarnations with memory bleeds and past-life connections

#### Automation & Infrastructure
- **Power Grids** - Energy generation, distribution, and consumption
- **Conveyor Belts** - Item transport and logistics
- **Assembly Machines** - Automated crafting and production chains
- **Factories** - Complete automation systems for resource processing

#### Simulation Depth
- **Multiverse Architecture** - Fork universes to test "what if" scenarios
- **Material Properties** - Not just item types, but how materials burn, conduct heat, and interact
- **Genetic Systems** - Plant genetics, animal breeding, and trait inheritance
- **Deep Simulation** - 211+ systems modeling everything from soil pH to divine intervention

#### World & Content
- **Procedural Generation** - Biome-based terrain with smooth transitions
- **Wild Plants** - Extensive flora including aquatic plants, trees, and crops
- **Aquatic Life** - Kelp forests, coral reefs, bioluminescent deep-sea creatures
- **Cross-Universe Sharing** - Items and effects can travel between game instances (planned)

---

## Getting Started

```bash
# Clone the repository
git clone https://github.com/[your-org]/ai_village.git
cd ai_village/custom_game_engine

# Install dependencies
npm install

# Start the game (launches metrics, orchestration, game server, and browser)
./start.sh

# Or just start backend services
./start.sh server

# Stop all services
./start.sh kill
```

Then open http://localhost:3000 (or it will open automatically with `./start.sh`)

See [CLAUDE.md](./CLAUDE.md) for comprehensive development guidelines and [custom_game_engine/README.md](./custom_game_engine/README.md) for detailed setup instructions.

---

## Recent Updates (January 2026)

### Comprehensive Documentation (Jan 2026)
Complete architecture documentation for all 211 systems and 19 packages, including detailed guides for ECS architecture, metasystems, components, and performance optimization. LLM context optimized for development efficiency.

### Ocean Life & Aquatic Systems (Jan 13)
Complete ocean ecosystem with depth-based creature spawning, bioluminescent species, swimming mechanics, and fluid dynamics. Agents can now explore underwater environments, manage oxygen, and interact with 15+ aquatic species across multiple ocean biomes.

### Fire & Environmental Hazards (Jan 13)
Realistic fire propagation system with material-based burn rates, wind effects, and fuel consumption. Buildings can catch fire and spread to neighbors. Includes firefighting mechanics and building repair systems.

### Magic Skill Tree Improvements (Jan 13)
Polished visual skill tree interface with improved tooltips, node rendering, and unlock feedback. Players can see clear progression paths through 25+ magic paradigms with XP costs and prerequisites.

### Biome Transitions & Terrain (Jan 12)
Smooth biome transition zones with gradient-based terrain mixing, improved spawn coordinate handling, and test infrastructure enhancements.

### Soul Reincarnation System (Jan 5)
Conservation of Game Matter implementation - souls never deleted, persist forever across incarnations. Veil of Forgetting system with memory bleeds (dreams, déjà vu, flashbacks) creating multi-lifetime storylines.

See [RELEASE_NOTES.md](./RELEASE_NOTES.md) for detailed changelog.

---

## Contributing

We welcome contributions! Please read our development guidelines in [CLAUDE.md](./CLAUDE.md) for coding standards.

Key principles:

- **No silent fallbacks** - Crash loudly, fix at the source
- **Components are data** - Keep logic in systems
- **Test through simulation** - Fork the universe, see what breaks

---

## Architecture

Multiverse: The End of Eternity is built on an Entity-Component-System (ECS) architecture with 19 specialized packages:

### Core Packages
- **@ai-village/core** - Game engine, ECS framework, events, actions, and admin systems
- **@ai-village/world** - Terrain generation, chunks, tiles, and world management
- **@ai-village/persistence** - Save/load system, time travel, and snapshot management

### Gameplay Packages
- **@ai-village/botany** - Plant genetics, growth systems, and wild flora
- **@ai-village/environment** - Weather, temperature, soil chemistry, and environmental systems
- **@ai-village/navigation** - Pathfinding and movement systems
- **@ai-village/reproduction** - Courtship, pregnancy, genetics, and family relationships
- **@ai-village/building-designer** - Voxel building construction and blueprints

### Advanced Systems
- **@ai-village/divinity** - Gods, temples, prayers, miracles, and theology (25+ systems)
- **@ai-village/magic** - 25+ magic paradigms, skill trees, and spell composition
- **@ai-village/hierarchy-simulator** - Renormalization group and hierarchical simulation

### AI/LLM Integration
- **@ai-village/llm** - LLM providers, routing, cost tracking, and agent decision-making
- **@ai-village/introspection** - Schema generation, mutations, and system introspection

### Rendering & UI
- **@ai-village/renderer** - 2D canvas rendering, 40+ UI panels, and sprite management
- **@ai-village/deterministic-sprite-generator** - Procedural sprite generation from entity traits

### Infrastructure
- **@ai-village/metrics** - Performance metrics, entity tracking, and analytics
- **@ai-village/metrics-dashboard** - Web dashboard for metrics visualization
- **@ai-village/shared-worker** - Web workers for background processing

### Demo & Testing
- **@ai-village/city-simulator** - Headless simulation testing and benchmarking

See [ARCHITECTURE_OVERVIEW.md](./custom_game_engine/ARCHITECTURE_OVERVIEW.md), [SYSTEMS_CATALOG.md](./custom_game_engine/SYSTEMS_CATALOG.md), and [COMPONENTS_REFERENCE.md](./custom_game_engine/COMPONENTS_REFERENCE.md) for comprehensive technical documentation.

---

## Inspirations

Beyond Dwarf Fortress, this project draws inspiration from:

- **RimWorld** - Colony simulation with deep storytelling
- **Caves of Qud** - Procedural generation and mutation systems
- **Ars Magica** - Verb/noun magic composition
- **The Sims** - Needs-based autonomous agents
- **NetHack** - Emergent complexity from simple rules

---

## License

[MIT License](./LICENSE) - Use it, fork it, learn from it, share it.

---

*"It's never been a dream system, it's been like a dream systematization of what the little nuts and bolts of magic are, so that we can glue them together however we want and surprise ourselves."*

— Tarn Adams, on designing magic systems
