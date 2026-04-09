# Multiverse: The End of Eternity

*A village, briefly, under these particular stars.*

An open-source simulation game where AI agents live, work, and build communities together.

## Quick Start

```bash
git clone https://github.com/[your-org]/ai_village.git
cd ai_village/custom_game_engine
npm install
./start.sh
```

Opens http://localhost:3000 automatically. That's it!

### Other Commands

```bash
./start.sh              # Full game with browser
./start.sh server       # Backend only (headless)
./start.sh kill         # Stop all services
./start.sh status       # Check what's running
./start.sh logs         # View logs
```

## What Is This?

Autonomous AI agents that:
- **Live** - needs, moods, relationships, memories
- **Work** - gather resources, craft items, build structures
- **Socialize** - talk, form friendships, hold opinions
- **Survive** - navigate fire, water, temperature extremes
- **Surprise** - LLM-driven decisions create emergent stories

Built on an ECS architecture with 200+ systems across 19 packages.

### Key Systems

| Category | Highlights |
|----------|-----------|
| **Magic** | 25+ paradigms (Shinto, Ferromancy, Tethermancy...), skill trees, spell composition |
| **Divinity** | Gods, temples, prayers, miracles, theology |
| **Life** | Reproduction, genetics, families, souls, reincarnation |
| **Environment** | Fire propagation, fluid dynamics, temperature, weather |
| **World** | Ocean ecosystems, biome transitions, procedural terrain |
| **Automation** | Power grids, conveyor belts, factories |
| **Multiverse** | Fork universes to test "what if" scenarios |

## Documentation

| Who You Are | Start Here |
|-------------|-----------|
| **Player** | [PLAYER_GUIDE.md](./PLAYER_GUIDE.md), [CONTROLS.md](./CONTROLS.md), [FAQ.md](./FAQ.md) |
| **Contributor** | [CONTRIBUTING.md](./CONTRIBUTING.md) |
| **Developer** | [CLAUDE.md](./CLAUDE.md) (coding guidelines) |
| **Deep Dive** | [DOCUMENTATION_INDEX.md](./custom_game_engine/DOCUMENTATION_INDEX.md) |

### Quick References

- **[QUICK_REFERENCE.md](./custom_game_engine/QUICK_REFERENCE.md)** - Common patterns and commands
- **[ARCHITECTURE_OVERVIEW.md](./custom_game_engine/ARCHITECTURE_OVERVIEW.md)** - How the ECS works
- **[SYSTEMS_CATALOG.md](./custom_game_engine/SYSTEMS_CATALOG.md)** - All 200+ systems documented
- **[COMPONENTS_REFERENCE.md](./custom_game_engine/COMPONENTS_REFERENCE.md)** - All component types

## Contributing

We welcome contributions! See [CONTRIBUTING.md](./CONTRIBUTING.md) for the full guide.

**Quick rules:**
- Read [CLAUDE.md](./CLAUDE.md) for coding standards
- Run `npm test` and `npm run build` before submitting
- Check browser console for errors

## Project Structure

```
ai_village/
├── README.md                  # You are here
├── CONTRIBUTING.md            # How to contribute
├── CLAUDE.md                  # Development guidelines
├── PLAYER_GUIDE.md           # How to play
│
├── custom_game_engine/        # THE GAME
│   ├── start.sh              # Start here!
│   ├── packages/             # 19 game packages
│   │   ├── core/             # ECS, events, admin
│   │   ├── llm/              # AI agent brains
│   │   ├── renderer/         # Graphics, UI
│   │   ├── magic/            # Magic systems
│   │   ├── divinity/         # Gods, temples
│   │   └── ...
│   └── docs/                 # Technical docs
│
├── archive/                   # Historical notes
└── openspec/                  # Feature specifications
```

## Philosophy

### Open Source, Open Spirit
- **Code should be readable** - understand how anything works
- **Modding should be first-class** - same tools we use, available to everyone
- **The simulation should be honest** - no hidden systems, no fake randomness

### No Predatory Monetization
No loot boxes. No pay-to-win. No dark patterns. If monetization ever happens, it will be transparent, fair, optional, and respectful.

### LLM-Powered, Human-Centered
AI gives agents personality and memory, but humans stay in the loop. Generated content goes through validation. You can see the prompts and decision-making.

## Dedication

**This project is dedicated to Tarn Adams and the Dwarf Fortress legacy.**

For over 20 years, Tarn and Zach Adams showed what's possible when you commit to depth over polish. The architectural patterns here - component-based items, material templates, data/behavior separation - are directly inspired by lessons from Dwarf Fortress.

If you haven't played it: **[Dwarf Fortress on Steam](https://store.steampowered.com/app/975370/Dwarf_Fortress/)**

## Inspirations

- **Dwarf Fortress** - Deep simulation, emergent stories
- **RimWorld** - Colony management, storytelling
- **Caves of Qud** - Procedural generation, mutation
- **Ars Magica** - Verb/noun magic composition
- **The Sims** - Needs-based autonomous agents
- **NetHack** - Emergent complexity from simple rules

## License

[MIT License](./LICENSE) - Use it, fork it, learn from it, share it.

---

*"It's never been a dream system, it's been like a dream systematization of what the little nuts and bolts of magic are, so that we can glue them together however we want and surprise ourselves."*
— Tarn Adams
