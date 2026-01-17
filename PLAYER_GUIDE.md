# Multiverse: The End of Eternity - Player Guide

**Welcome to the Multiverse!** This guide will help you understand and play the game.

---

## 🎮 What Is This Game?

Multiverse: The End of Eternity is a **simulation game** where AI-powered agents live autonomous lives. You observe, interact with, and eventually control a character (called a "pawn") in a persistent village that continues to evolve even when you're not playing.

Think of it as:
- **Dwarf Fortress** meets **The Sims** meets **Minecraft**
- Agents have memories, relationships, and personalities
- Complex simulation systems (weather, fire, water, magic, gods)
- Emergent storytelling from agent decisions
- Deep crafting, magic, and progression systems

---

## 🚀 Getting Started

### First Launch

1. **Start the game:**
   ```bash
   cd custom_game_engine && ./start.sh
   ```
   The game will open in your browser at http://localhost:3000

2. **What you'll see:**
   - **Main viewport** - The game world (top-down 2D view)
   - **Agent info panel** (right side) - Selected agent's details
   - **Magic panel** - Magic systems and spells
   - **Dev panel** (bottom) - Developer controls (will be hidden in release)

3. **First steps:**
   - Click on agents to select them and see their details
   - Watch agents go about their daily routines
   - Observe emergent behaviors and interactions

### Understanding the Interface

**Main Viewport:**
- Terrain with biomes (grass, desert, ocean, etc.)
- Agents (characters) moving around
- Buildings and structures
- Items on the ground
- Fire, water, and environmental effects

**Right Panels:**
- **Agent Info** - Selected agent's name, stats, needs, personality
- **Magic** - Available spells and skill trees

**Bottom Dev Panel** (temporary, will be removed):
- Tick counter and TPS (ticks per second)
- System performance metrics
- Debug controls

---

## 🎯 Core Concepts

### Agents

**Agents** are autonomous AI characters who:
- Have **needs** (hunger, thirst, energy)
- Feel **moods** (happy, stressed, fearful)
- Form **relationships** (friends, enemies, family)
- Build **memories** of experiences
- Make **decisions** using AI (LLM-powered)

**You don't directly control agents** (yet - pawn system coming soon). You observe and influence them indirectly.

### The Simulation

Everything runs in **real-time simulation**:
- **20 ticks per second** (TPS)
- Agents act independently
- Physics and systems update every tick
- The world persists between sessions

### Time & Persistence

- **Auto-saves** every 60 seconds
- **Time travel** - Load any previous save to rewind
- **Universe forking** - Branch from any point to create alternate timelines
- Your world persists on the server even when you close the browser

---

## 🌍 World Systems

### Environment

**Biomes:**
- Grassland - Mild climate, good for farming
- Desert - Hot, scarce water
- Ocean - Deep water, aquatic life
- Tundra - Cold, ice hazards

**Weather:**
- Temperature affects agent comfort
- Fire spreads based on materials and wind
- Water flows and creates currents
- Day/night cycles affect visibility

**Hazards:**
- **Fire** - Spreads through flammable materials
- **Drowning** - Agents can't breathe underwater (yet)
- **Temperature** - Extreme heat/cold damages agents
- **Falling** - From heights can cause injury

### Resources & Crafting

**Gathering:**
- Agents autonomously gather berries, wood, stone
- Resources appear as items on the ground
- Storage buildings hold collected items

**Crafting:**
- Agents craft tools, weapons, and items
- Recipes unlock through experimentation
- Magic can be used in crafting

**Building:**
- Agents construct structures
- Buildings provide shelter, storage, and workspaces
- Voxel-based construction (like Minecraft)

---

## ✨ Magic System

### Learning Magic

Agents learn magic through:
1. **Skill trees** - Unlock spells by gaining XP
2. **Experimentation** - Try new spell combinations
3. **Study** - Read scrolls and books

### Magic Paradigms

The game features **25+ magic systems**, including:
- **Elemental** - Fire, water, earth, air manipulation
- **Divine** - Channel power from gods
- **Sympathy** - Link objects to affect them at distance
- **Allomancy** - Burn metals for powers (inspired by Brandon Sanderson)
- **Shinto** - Spirit magic and kami worship
- **Alchemy** - Transform materials
- Many more!

### Casting Spells

**Spell Structure:**
- **Verb** + **Noun** (e.g., "Create Fire", "Move Stone")
- **Targets** can be entities, locations, or materials
- **Costs** in energy, materials, or divine favor

**Effects:**
- Spells have real effects in the simulation
- Fire spells actually ignite materials
- Healing spells restore health
- Movement spells change positions

---

## 🙏 Divine & Soul Systems

### Gods & Belief

**Gods emerge** from agent beliefs:
- Agents develop religious convictions
- Collective belief creates divine entities
- Gods gain power from prayers and worship

**Divine Interactions:**
- **Prayers** - Agents request divine intervention
- **Miracles** - Gods can answer prayers with effects
- **Temples** - Buildings dedicated to worship
- **Conversion** - Agents can evangelize their beliefs

### Souls & Afterlife

**Soul System:**
- Every agent has a soul that persists after death
- **Judgment** - Souls are judged after death
- **Afterlife** - Underworld, paradise, or void
- **Reincarnation** - Souls can return in new bodies
- **Memory bleeds** - Past life memories occasionally surface

---

## 👥 Social Systems

### Relationships

Agents form **dynamic relationships**:
- **Friendship** - From shared experiences
- **Romance** - Courtship and partnerships
- **Family** - Parents, children, siblings
- **Rivalry** - Competition and conflict

**Social Interactions:**
- Conversations influence relationships
- Shared activities build bonds
- Conflicts damage relationships
- Memories affect how agents view each other

### Reproduction & Family

**Family Formation:**
- Courtship between compatible agents
- Pregnancy and childbirth
- Children inherit traits from parents
- Family bonds and relationships

**Genetics:**
- Traits pass from parents to children
- Personality influenced by genetics and upbringing
- Physical characteristics inherited

---

## 🏗️ Buildings & Construction

### Building Types

**Residential:**
- Houses for shelter
- Storage for items
- Beds for sleeping

**Productive:**
- Workshops for crafting
- Farms for food production
- Libraries for research

**Social:**
- Temples for worship
- Meeting halls for gatherings
- Markets for trade

### Construction

**Voxel System:**
- Place blocks like Minecraft
- Different materials (wood, stone, metal)
- Structural integrity matters

**Agents Build:**
- Designate construction sites
- Agents autonomously build
- Materials must be available

---

## 🎯 Player Actions (Current State)

### What You Can Do Now

**Observation:**
- Click agents to view their details
- Watch agent behaviors and interactions
- See memory formation and decision-making

**Selection:**
- Select agents to see their stats
- View relationships and social networks
- Check inventory and equipment

**Admin Controls** (Dev Panel):
- Speed up/slow down time
- Spawn agents or items
- Trigger events for testing

### Coming Soon: Pawn System

**Direct Control:**
- You'll control a "pawn" character
- Give direct commands to your pawn
- Interact with agents and world
- Build, craft, and cast spells personally

---

## 🎓 Advanced Topics

### Time Travel

**Load Previous States:**
- Access the Admin Dashboard (http://localhost:8766/admin)
- Go to "Time Travel" tab
- See all snapshots as a timeline
- Load any snapshot to rewind time

**Universe Forking:**
- Branch from any snapshot
- Create alternate timelines
- Experiment without losing original universe

### Admin Dashboard

**Access:** http://localhost:8766/admin

**Features:**
- **Overview** - System health and performance
- **Agents** - All agents and their states
- **Universes** - Time travel and forking
- **Sprites** - Generated character sprites
- **LLM Queue** - AI request monitoring
- **Diagnostics** - Debug agent decisions

### Debug Commands

**Browser Console** (F12):
```javascript
// Select an agent
game.setSelectedAgent('agent-id-here');

// Grant XP to agent (100 XP = 1 level)
game.grantSkillXP('agent-id-here', 100);

// Check agent skills
game.getAgentSkills('agent-id-here');

// Access world directly
game.world

// Access all entities
game.world.entities
```

---

## 💡 Tips & Strategies

### For Observers

1. **Follow Agent Stories** - Pick an agent and watch their life unfold
2. **Track Relationships** - See how friendships and rivalries develop
3. **Watch Magic Development** - See agents learn and use spells
4. **Observe Religion** - Watch beliefs emerge and gods form

### Understanding Agent Decisions

**Agents prioritize by:**
1. **Survival needs** - Hunger, thirst, safety
2. **Goals** - Personal objectives they've set
3. **Social bonds** - Relationships and commitments
4. **Personality** - Individual traits affect choices

**Why agents do seemingly odd things:**
- They have incomplete information
- Personality traits influence behavior
- Social dynamics matter
- Memories and past experiences affect decisions

### Performance Tips

**If the game is slow:**
- Check TPS in bottom-left (should be ~20)
- Reduce browser tab count
- Close other applications
- Check Admin Dashboard → Overview for bottlenecks

**If agents act strangely:**
- This might be emergent behavior!
- Check Admin Dashboard → Diagnostics
- Review agent's memories and personality
- Consider their relationships and goals

---

## 🐛 Troubleshooting

### Game Won't Start

```bash
# Kill all servers
./start.sh kill

# Restart fresh
./start.sh
```

### Browser Shows Errors

1. Open DevTools (F12)
2. Check Console tab for errors
3. Try refreshing the page (Ctrl+R)
4. Clear browser cache if needed

### Agents Not Moving

- Check if the game is paused (Dev Panel)
- Verify TPS is running (~20)
- Check agent's needs - they might be stuck on a task

### Save/Load Issues

- Check multiverse server is running (http://localhost:3001)
- View Admin Dashboard → Time Travel for available saves
- Auto-saves happen every 60 seconds

---

## 🎮 Keyboard Controls (Coming Soon)

Currently the game is mouse-driven. Keyboard controls for pawn control coming with pawn system.

**Planned Controls:**
- WASD - Move pawn
- E - Interact
- I - Inventory
- M - Magic menu
- B - Building mode
- ESC - Cancel/Menu

---

## 🌟 Game Philosophy

### This Game Is Different

**No Traditional "Win Condition":**
- This is a sandbox simulation
- Stories emerge from agent interactions
- Your goal is whatever interests you

**Agents Are Autonomous:**
- You don't control them (except your eventual pawn)
- They make their own decisions
- Emergent behavior is the point

**The Simulation Is Honest:**
- No fake randomness or theater
- All systems actually work as described
- What you see is what's happening

### What Makes It Special

**Deep Simulation:**
- Everything from fire to genetics actually simulates
- Agent memories persist and matter
- Relationships form naturally from interactions

**LLM-Powered Agents:**
- Agents have real personalities
- Decisions based on memories and relationships
- Natural language understanding

**Infinite Depth:**
- 25+ magic paradigms to explore
- Complex crafting and research trees
- Social dynamics and emergent culture
- Time travel and multiverse branches

---

## 📚 Learn More

**For Players:**
- [README.md](./README.md) - Project overview and philosophy
- [FAQ.md](./FAQ.md) - Frequently asked questions

**Technical Details:**
- [ARCHITECTURE_OVERVIEW.md](./custom_game_engine/ARCHITECTURE_OVERVIEW.md) - How it works
- [METASYSTEMS_GUIDE.md](./custom_game_engine/METASYSTEMS_GUIDE.md) - Complex systems explained

**Community:**
- GitHub Issues - Report bugs and suggest features
- (Discord/Forum coming soon)

---

## 🤝 Contributing

This is an open-source project! Ways to contribute:
- Report bugs you find
- Suggest features or improvements
- Create custom spells and share them
- Help with documentation
- Contribute code (see CLAUDE.md)

---

## ⚠️ Current State & Roadmap

### Alpha Status

This game is in **active development**. Expect:
- Bugs and rough edges
- Features being added regularly
- Save format changes (we'll preserve your data)
- Balance adjustments

### Coming Soon

**Near Term:**
- Pawn system (direct control)
- Keyboard controls
- Tutorial system
- Better UI/UX
- More magic paradigms
- Combat system improvements

**Future:**
- Multiplayer (multiple pawns in same universe)
- Mod support
- Custom content creation tools
- Mobile support
- VR experiments

---

## 🎯 Quick Start Checklist

- [ ] Start the game: `./start.sh`
- [ ] Browse to http://localhost:3000
- [ ] Click on an agent to select them
- [ ] Watch their needs (hunger, energy, etc.)
- [ ] Observe them making decisions
- [ ] Check relationships panel
- [ ] View their memories
- [ ] Try the Admin Dashboard (http://localhost:8766/admin)
- [ ] Explore the time travel feature
- [ ] Watch agents learn and use magic
- [ ] Follow an agent's story for a full in-game day

---

**Welcome to the Multiverse! May your agents thrive, your spells be powerful, and your stories be memorable.**

**Last Updated:** 2026-01-16
