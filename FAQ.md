# Frequently Asked Questions (FAQ)

**Quick answers to common questions about Multiverse: The End of Eternity.**

---

## 🎮 General Questions

### What is this game?

A simulation game where AI-powered agents live autonomous lives. You observe and interact with a persistent village that evolves even when you're not playing. Eventually you'll control a "pawn" character alongside the autonomous agents.

### Is it like The Sims?

Sort of! But agents are truly autonomous - they make their own decisions based on memories, relationships, and AI reasoning. You don't directly control them (yet).

### Is it like Dwarf Fortress?

Heavily inspired by it! We use similar simulation principles - everything from fire to genetics is actually simulated, not faked. The dedication in our README says it all.

### Is it multiplayer?

Not yet, but it's planned! Eventually multiple players will be able to have pawns in the same universe.

### Is it free?

Yes! This is an open-source project. See our philosophy in [README.md](./README.md) about why we're committed to no excessive monetization.

---

## 🚀 Getting Started

### How do I start the game?

```bash
cd custom_game_engine && ./start.sh
```

Then open http://localhost:3000 in your browser.

### What are the system requirements?

**Minimum:**
- Modern browser (Chrome, Firefox, Edge, Safari)
- 4GB RAM
- CPU: Any modern processor (2015+)
- Runs locally on your machine

**Recommended:**
- 8GB+ RAM
- Dedicated GPU (for smooth rendering)
- SSD (for faster loading)

### Why does it run in a browser?

The game engine uses web technologies (TypeScript, WebGL) but runs entirely locally on your machine. Nothing is sent to external servers except LLM requests (if you configure an LLM provider).

### Does it work offline?

The core game works offline. LLM-powered agent decisions require an internet connection to an LLM provider (OpenAI, Anthropic, Groq, etc.), but agents can also use scripted behaviors without LLMs.

---

## 🎯 Gameplay

### Can I control characters?

Not yet! The pawn system (where you control one character) is coming soon. Currently you can only observe and use admin tools.

### Why won't my agent do what I want?

Because you don't control them! Agents are autonomous and make their own decisions based on:
- Their needs (hunger, thirst, safety)
- Their personality traits
- Their memories and experiences
- Their relationships with others
- Their goals and motivations

This is by design - emergent behavior is the point.

### How do I make things happen?

**Current methods:**
- Use the Dev Panel to spawn items or agents
- Use Admin Dashboard to trigger events
- Observe and wait for emergent behaviors

**Coming soon (pawn system):**
- Control your own character
- Interact directly with agents
- Build, craft, and influence the world

### Do agents really use AI?

Yes! Agents can use Large Language Models (LLMs) for decision-making. You'll need to configure an LLM provider (OpenAI, Anthropic, Groq, etc.) in the settings. Agents can also fall back to scripted behaviors if no LLM is available.

### How smart are the agents?

It depends on the LLM you use:
- **With LLM:** Agents have natural language understanding, form coherent memories, make context-aware decisions
- **Without LLM:** Agents use scripted behaviors (still functional, less creative)

### Why do agents do weird things sometimes?

**Could be:**
- **Emergent behavior** - Unexpected but logical given their situation
- **Incomplete information** - They don't know everything you know
- **Personality traits** - A high-neuroticism agent acts differently
- **Social dynamics** - Relationships affect behavior
- **Bug** - If it's clearly broken, please report it!

---

## ✨ Magic System

### How does magic work?

Agents learn spells through skill trees. Spells are composed of verbs and nouns (e.g., "Create Fire"). Magic effects are actually simulated - fire spells really ignite materials.

### What magic systems are in the game?

25+ paradigms including:
- Elemental magic
- Divine magic (channeling gods)
- Allomancy (Brandon Sanderson-inspired)
- Sympathy (linking objects)
- Shinto spirit magic
- Alchemy
- And many more!

### Can I create custom spells?

Yes! The system supports custom spell creation. Eventually you'll be able to compose novel spells using the spell editor.

### Can magic break the game?

The magic system has costs (energy, materials, divine favor) and validation. Spells that would break physics or logic are restricted. But powerful effects are possible and encouraged!

---

## 🙏 Gods & Religion

### How do gods work?

Gods emerge from agent beliefs. When multiple agents share a belief system, it creates a divine entity that gains power from worship.

### Can I create a religion?

Through your pawn (coming soon), yes! Agents can evangelize, build temples, and spread beliefs. Gods emerge naturally from collective belief.

### Do gods actually do things?

Yes! Gods can:
- Answer prayers with miracles
- Grant powers to devout followers
- Intervene in events
- Influence world systems

Their power depends on the number and devotion of believers.

---

## 💾 Saves & Time Travel

### How does saving work?

**Automatic:**
- Auto-save every 60 seconds
- All saves stored on local multiverse server
- Saves are called "snapshots"

**Types of saves:**
- **Auto** - Automatic periodic saves
- **Manual** - You trigger these
- **Canonical** - Important story moments

### What is time travel?

You can load any previous snapshot to "rewind" the game to that point. Access via Admin Dashboard → Time Travel.

### What is universe forking?

Create a branch from any snapshot to make an alternate timeline. Experiment without losing your original universe.

### Will updates break my saves?

We do our best to preserve save compatibility. Even if format changes, we use migration scripts to update old saves. See "Conservation of Game Matter" in CLAUDE.md - we never delete data.

---

## 🏗️ Building & Crafting

### How do I build things?

**Currently:** Agents build autonomously based on their needs and goals.

**Coming soon (pawn system):** Direct building controls, Minecraft-style voxel placement.

### What can I build?

- Houses (shelter and storage)
- Workshops (crafting stations)
- Farms (food production)
- Temples (worship spaces)
- Libraries (research centers)
- Custom structures (voxel system)

### How does crafting work?

Agents craft items at workbenches. Recipes use gathered resources. Some recipes require magic or special materials.

---

## 🔧 Technical Questions

### What's the tick rate?

20 TPS (ticks per second) for simulation. Rendering aims for 60 FPS.

### What is TPS?

Ticks Per Second - how fast the simulation runs. 20 TPS means 20 simulation updates per second.

### Why is my TPS low?

**Common causes:**
- Too many entities (agents, items)
- Complex pathfinding calculations
- Fire spreading calculations
- Your computer's performance

**Solutions:**
- Close other applications
- Check Admin Dashboard for performance bottlenecks
- Reduce visual effects (coming soon)

### Where are saves stored?

Locally in `custom_game_engine/demo/multiverse-data/`

Each universe has its own directory with snapshots.

### Can I export my universe?

Yes! Universe data is stored as JSON files. You can copy the entire universe directory to share or back up.

### Does this use a lot of disk space?

Moderate usage:
- Each snapshot: ~2-5MB compressed
- Auto-saves every 60s accumulate over time
- Old auto-saves are gradually pruned
- Manual and canonical saves never deleted

---

## 🐛 Troubleshooting

### Game won't start

```bash
./start.sh kill   # Kill all servers
./start.sh        # Restart
```

### Browser shows blank screen

1. Check browser console (F12) for errors
2. Try a different browser
3. Clear browser cache
4. Restart the server

### Agents not moving

- Check TPS (should be ~20)
- Check agent needs - might be stuck
- Try refreshing browser
- Check server logs for errors

### Can't connect to http://localhost:3000

- Check server is running: `./start.sh status`
- Try restarting: `./start.sh kill && ./start.sh`
- Check firewall isn't blocking port 3000

### LLM requests failing

- Check your LLM provider API key is configured
- Verify internet connection
- Check Admin Dashboard → LLM Queue for error messages
- Agents will fall back to scripted behavior if LLM fails

### Save/load not working

- Check multiverse server is running (port 3001)
- Check Admin Dashboard → Time Travel tab
- Look for error messages in server logs
- Verify disk space available

---

## 🎯 Performance

### How many agents can run at once?

Depends on your hardware, but typically:
- 50-100 agents - Smooth on most computers
- 100-500 agents - May need optimization
- 500+ agents - Requires good hardware

The SimulationScheduler system optimizes by only simulating nearby agents.

### Can I increase TPS?

The engine is designed for 20 TPS. Going higher may cause issues with physics and timings.

### What about FPS?

Rendering targets 60 FPS but is independent of simulation TPS. Low FPS doesn't affect gameplay logic.

---

## 🌟 Features

### What's coming next?

**Near term:**
- Pawn system (player control)
- Keyboard controls
- Tutorial system
- Combat improvements
- More magic paradigms

**Future:**
- Multiplayer
- Mod support
- Mobile version
- VR experiments

### Can I suggest features?

Yes! Open an issue on GitHub or (Discord/forum coming soon).

### Is there a roadmap?

See [MASTER_ROADMAP.md](./MASTER_ROADMAP.md) for detailed plans.

---

## 🤝 Community & Contributing

### How can I help?

- Report bugs on GitHub
- Suggest features
- Contribute code (see CLAUDE.md)
- Create custom content (spells, items)
- Help with documentation
- Spread the word!

### Where's the community?

- GitHub: https://github.com/[repo-link]
- Discord/Forum: Coming soon

### Can I mod the game?

Yes! It's open source. You can modify anything. Mod support and custom content tools coming soon.

### Can I use this in my own project?

Check the LICENSE file, but generally: yes, with attribution. The project is open source in the spirit of sharing knowledge.

---

## 💰 Business Model

### How do you make money?

We don't currently. This is a passion project. If monetization becomes necessary, it will be:
- Optional (full game free)
- Fair (no pay-to-win)
- Transparent (you know what you're buying)
- No loot boxes, gambling, or dark patterns

See "Philosophy" in README.md for our full stance.

### Will this always be free?

The core game will always be free and open source. Any future monetization would be for optional cosmetics or conveniences, never core gameplay.

---

## 🔮 Advanced Questions

### What's the multiverse server?

A local server (port 3001) that manages universe persistence, time travel, and eventually multiplayer coordination.

### Can agents learn from each other?

Yes! Through conversation, observation, and shared experiences, agents can learn skills, spells, and knowledge from each other.

### Do agents dream?

Not yet, but it's planned! Memory consolidation during sleep will eventually include dream generation.

### Can I teach an agent something?

Through your pawn (coming soon), yes. Agents can learn from demonstrations and instruction.

### What happens when an agent dies?

- Their soul persists
- They're judged based on their life
- They go to an afterlife realm
- They may reincarnate in a new body
- Memories can bleed through to new life

---

## 🎓 Learning More

**For Players:**
- [PLAYER_GUIDE.md](./PLAYER_GUIDE.md) - Complete gameplay guide
- [README.md](./README.md) - Project philosophy

**Technical:**
- [DOCUMENTATION_INDEX.md](./custom_game_engine/DOCUMENTATION_INDEX.md) - All documentation
- [ARCHITECTURE_OVERVIEW.md](./custom_game_engine/ARCHITECTURE_OVERVIEW.md) - How it works

---

## ❓ Your Question Not Here?

- Check [PLAYER_GUIDE.md](./PLAYER_GUIDE.md) for detailed gameplay info
- Search GitHub issues
- Ask in community channels (coming soon)
- Open a new GitHub issue

---

**Last Updated:** 2026-01-16
