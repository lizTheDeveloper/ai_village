# Getting Started

Welcome! This guide will walk you through installing, launching, and understanding your first few minutes with **Multiverse: The End of Eternity**.

---

## Installation

### Requirements
- **Node.js** (v18 or higher) - Download from [nodejs.org](https://nodejs.org/)
- **Git** - For cloning the repository
- A modern web browser (Chrome, Firefox, Safari, or Edge)
- 4GB+ RAM recommended
- Decent CPU (the simulation can be demanding)

### Install Steps

1. **Clone the repository**
   ```bash
   git clone https://github.com/[your-org]/ai_village.git
   cd ai_village/custom_game_engine
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

   This will take a few minutes to download all required packages.

3. **Start the game**
   ```bash
   ./start.sh
   ```

   This launches:
   - Metrics server (performance tracking)
   - PixelLab daemon (sprite generation)
   - Game server with hot module reloading
   - Your web browser automatically

> **Note:** On first launch, the game will generate some sprites which may take a few seconds.

---

## First Launch

When you start the game, you'll see:

### The Main View
A top-down view of a procedurally generated world with:
- **Terrain** (grass, dirt, water, different biomes)
- **Trees and plants**
- **Small walking figures** (these are your agents!)
- **Buildings** (if agents have built any yet)

### The Interface
Several panels around the edges:
- **Top menu bar** with game controls
- **Dev Panel** on the left (for spawning agents and tweaking settings)
- **Info panels** that appear when you select agents
- **Notification feed** for important events

Don't be overwhelmed! You can close any panel by clicking the X in its corner.

---

## Understanding the Simulation

This is the most important thing to understand:

### The Game Runs Itself

Unlike most games, you're **not** controlling everything here. The agents are autonomous:

- **They make their own decisions** based on their needs, memories, and personality
- **They don't wait for your commands** - they'll start gathering resources, building, and socializing on their own
- **You can observe and occasionally intervene**, but the simulation keeps running

Think of yourself as a benevolent observer (or a minor deity) rather than a traditional player.

### Time Progression

The game runs in "ticks":
- **1 tick = 1 in-game minute**
- **60 ticks = 1 in-game hour = 3 real seconds**
- **1 in-game day = ~72 real seconds**

You'll see a time display in the corner showing the current in-game time. You can pause, slow down, or speed up time using the **Time Controls** panel.

### The Numbers in the Corner

You'll see some statistics:
- **TPS** (Ticks Per Second) - Should be around 20. If it drops below 15, performance is suffering
- **FPS** (Frames Per Second) - How smoothly the graphics render. 30+ is good
- **Agent count** - How many agents exist
- **Entity count** - Total simulated objects

---

## Your First 5 Minutes

Here's what to do when you first start:

### 1. Just Watch (30 seconds)
Don't touch anything. Just observe:
- Agents walking around
- Some might be gathering resources
- Some might be talking to each other (you'll see chat bubbles)
- Watch the time advance

### 2. Select an Agent (1 minute)
- **Left-click** on any walking agent
- An **Agent Info Panel** appears showing:
  - Their name
  - Their current needs (hunger, energy, social, etc.)
  - What they're thinking
  - Their skills and inventory

Watch this panel while the agent goes about their business. You'll see their thoughts update as they make decisions.

### 3. Follow Their Actions (2 minutes)
Keep the same agent selected and observe:
- When their hunger drops, do they look for food?
- When they're tired, do they find somewhere to sleep?
- Do they interact with other agents?

This is the magic of the simulation - watching emergent behavior unfold.

### 4. Explore the Camera (1 minute)
Try moving around:
- **WASD keys** or **arrow keys** to pan the camera
- **Mouse wheel** to zoom in and out
- **Click and drag the middle mouse button** for smooth panning
- **Right-click** on agents or objects for context menus

### 5. Open a Panel (30 seconds)
Click the **hamburger menu** (☰) in the top-left and try opening:
- **Agent Roster** - See all agents at a glance
- **Resources Panel** - See what materials are available
- **Time Controls** - Pause or speed up time

You can drag panels around by their title bars and close them with the X button.

---

## What to Watch For

Here are interesting things to look out for in your first session:

### Agent Behaviors
- **Resource gathering** - Agents cutting down trees or harvesting plants
- **Eating** - When hunger gets low, agents seek food
- **Sleeping** - They'll find beds or sleep on the ground
- **Socializing** - Agents chat with nearby agents
- **Building** - They may construct simple structures

### Social Dynamics
- **Conversations** appearing as chat bubbles
- **Relationship formation** - Some agents become friends
- **Group activities** - Multiple agents working together

### Environmental Events
- **Weather changes** - Rain, clear skies, temperature shifts
- **Day/night cycle** - Watch how agent behavior changes
- **Resource depletion** - Trees getting cut down, plants harvested

### Emergent Surprises
- Agents doing something unexpected
- Social conflicts or strong friendships forming
- Creative problem-solving
- Spontaneous organization

---

## Common First-Time Questions

### "Why isn't anything happening?"
Give it time! The simulation starts slowly. If you have very few agents, spawn more using the **Dev Panel**. Look for the "Spawn Wandering Agent" button.

### "An agent is just standing there!"
They might be idle, sleeping, or thinking. Select them to see what's going on. Their needs and current thought will give you clues.

### "Everything is so small!"
Use the **mouse wheel** to zoom in. You can zoom quite close to see individual agents clearly.

### "I can't see where agents are going"
That's intentional! Agents make autonomous decisions. You can observe their behavior and infer their goals, but you don't get a traditional "task queue" unless you select them.

### "The game is laggy"
Check the troubleshooting guide for performance tips. The simulation can be CPU-intensive with many agents.

### "How do I win?"
You don't! This is a sandbox simulation. Set your own goals:
- Watch a thriving village emerge
- Observe interesting agent relationships
- See what happens when you introduce magic or divine intervention
- Build an elaborate construction project
- Just enjoy the emergent stories

---

## Next Steps

Once you're comfortable watching the simulation:

1. **[Learn the Controls](./controls.md)** - Master camera movement and UI interaction
2. **[Understand Gameplay Basics](./gameplay-basics.md)** - Learn about needs, resources, and building
3. **Experiment!** - Try spawning more agents, changing settings, or introducing new elements

> **Remember:** The best way to learn this game is by observing and experimenting. There's no wrong way to play.

---

## Quick Troubleshooting

### Game won't start
- Make sure you ran `npm install` first
- Check that Node.js is installed: `node --version`
- Try `./start.sh kill` then `./start.sh` again

### Browser doesn't open automatically
- Manually visit: `http://localhost:3000`

### Black screen or errors
- Check the browser console (F12) for error messages
- See the full [Troubleshooting Guide](./troubleshooting.md)

### Need to restart
```bash
./start.sh kill    # Stop all servers
./start.sh         # Start fresh
```

---

## You're Ready!

You now know enough to start exploring. Remember:

- **Watch and observe** - The simulation is the game
- **Be patient** - Emergent behavior takes time
- **Experiment** - Try things and see what happens
- **Have fun** - There's no pressure, no timer, no losing

**[Continue to Controls Guide →](./controls.md)**
