# Multiverse: The End of Eternity

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
- **Surprise** - Their LLM-driven decisions create emergent stories

You'll eventually have a **pawn** - a character you control - who lives alongside these agents. But the village persists and grows even when you're not directing it.

### Key Features (Planned)

- **Multiverse Architecture** - Fork universes to test "what if" scenarios
- **Composable Magic Systems** - Verb/noun spell composition (inspired by Ars Magica)
- **LLM-Generated Effects** - Novel magic that's validated through simulation testing
- **Cross-Universe Sharing** - Items and effects can travel between game instances
- **Deep Simulation** - Material properties, not just item types

---

## Getting Started

```bash
# Clone the repository
git clone https://github.com/[your-org]/ai_village.git
cd ai_village

# Install dependencies
cd custom_game_engine
npm install

# Build
npm run build

# Run the game
npm run dev
```

Then open http://localhost:5173

See [custom_game_engine/README.md](./custom_game_engine/README.md) for detailed setup instructions.

---

## Contributing

We welcome contributions! Please read our development guidelines in [CLAUDE.md](./CLAUDE.md) for coding standards.

Key principles:

- **No silent fallbacks** - Crash loudly, fix at the source
- **Components are data** - Keep logic in systems
- **Test through simulation** - Fork the universe, see what breaks

---

## Architecture

Multiverse: The End of Eternity is built on an Entity-Component-System (ECS) architecture with:

- **@ai-village/core** - Game engine, ECS, events, actions
- **@ai-village/renderer** - 2D canvas rendering, UI
- **@ai-village/llm** - LLM integration for agent decisions
- **@ai-village/world** - Terrain, entities, world generation

See the [architecture documentation](./custom_game_engine/architecture/) for details.

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
