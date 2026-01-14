# Gameplay Basics

Learn the core mechanics that drive the simulation.

---

## Understanding Agents

Agents are the heart of the simulation. They're autonomous beings that make their own decisions based on needs, personality, and circumstances.

### What Makes Agents Tick

**Agents are NOT NPCs you control.** Instead, they:

- **Make autonomous decisions** using artificial intelligence
- **Have personalities** that influence their behavior
- **Remember experiences** and learn from them
- **Form relationships** with other agents
- **Pursue goals** based on their needs and desires
- **Surprise you** with emergent behavior

When you select an agent, you're observing them, not controlling them (unless you're in a special control mode).

### Agent Anatomy

Each agent has:
- **Identity:** Name, species, age, appearance
- **Needs:** Physical and emotional requirements (see below)
- **Skills:** Abilities that improve with practice
- **Inventory:** Items they're carrying
- **Memories:** What they remember and how it affects them
- **Relationships:** How they feel about other agents
- **Beliefs:** Religious faith, opinions, preferences

---

## The Needs System

Agents are driven by needs. When a need drops too low, agents prioritize fulfilling it.

### Physical Needs (0-100%)

**Hunger** (🍖)
- Drops over time
- **Critical:** Below 20%
- **Satisfied by:** Eating food
- **Warning signs:** Agent seeks food, becomes distracted
- **Starvation:** Can lead to death if ignored

**Energy** (⚡)
- Depleted by activity
- **Critical:** Below 20%
- **Satisfied by:** Sleeping
- **Warning signs:** Slower movement, yawning
- **Exhaustion:** Agents may collapse if completely depleted

**Cleanliness** (🧼)
- Decreases from work and environment
- **Critical:** Below 30%
- **Satisfied by:** Washing, bathing
- **Warning signs:** Social avoidance, discomfort
- **Effects:** Can impact social interactions and mood

**Temperature Comfort** (🌡️)
- Affected by weather, clothing, shelter
- **Critical:** Below 20% or above 80%
- **Satisfied by:** Seeking shelter, warmth, or shade
- **Warning signs:** Shivering, sweating
- **Danger:** Hypothermia or hyperthermia possible

### Social & Emotional Needs

**Social** (👥)
- Need for interaction with others
- **Critical:** Below 30%
- **Satisfied by:** Conversations, group activities
- **Warning signs:** Seeking out other agents, loneliness
- **Effects:** Impacts mood and mental health

**Mood** (😊)
- Overall emotional state
- **Influenced by:** Need satisfaction, relationships, events
- **Range:** Depressed → Content → Happy → Ecstatic
- **Effects:** Affects productivity and decision-making

> **Key Insight:** You don't need to micromanage needs! Agents will autonomously seek to fulfill them. Just ensure resources (food, beds, shelter) are available.

---

## Resources and Gathering

The world provides raw materials that agents can collect and use.

### Natural Resources

**Trees** (🌲)
- Can be chopped down for wood
- Regrow over time (very slowly)
- Multiple types: Oak, Pine, Birch, etc.
- **Used for:** Building, fuel, crafting

**Plants** (🌿)
- Harvestable for food or materials
- Some are crops (wheat, vegetables)
- Some are wild (berries, herbs)
- **Grow in specific biomes**
- Can be replanted

**Rocks & Minerals** (🪨)
- Gathered for stone, metal ores
- Found in specific terrain types
- **Used for:** Tools, building, advanced crafting

**Water** (💧)
- Essential for drinking and farming
- Found in rivers, lakes, oceans
- Can be collected or accessed directly

**Animals** (🐄)
- Wild animals can be hunted
- Domesticated animals provide ongoing resources
- **Products:** Meat, hide, wool, eggs, milk

### Resource Collection

Agents automatically collect resources when they:
1. Need them for a task
2. See them nearby and have inventory space
3. Are assigned to gathering jobs

You can:
- **Right-click resources** → "Mark for gathering"
- **Assign zones** where agents should collect
- **Let agents decide** based on their needs

Resources are stored in:
- **Agent inventory** (limited, ~10 item slots)
- **Building stockpiles** (warehouses, chests)
- **Crafting stations** (stored for production)

---

## Building and Construction

Agents can construct buildings to improve their lives.

### Building Basics

**How Buildings Get Built:**
1. Blueprint is placed (by you or an agent)
2. Agents gather required materials
3. Agents construct the building over time
4. Building becomes functional

**Building Requirements:**
- **Materials:** Wood, stone, etc. (shown in blueprint)
- **Labor:** One or more agents to build
- **Space:** Clear ground (no obstacles)
- **Time:** Construction takes multiple in-game hours

### Common Building Types

**Shelter & Housing**
- **Tents:** Quick, basic shelter (2-3 wood)
- **Huts:** Better protection (10 wood, 5 stone)
- **Houses:** Durable housing (20 wood, 15 stone)
- **Provide:** Beds, storage, temperature protection

**Production Buildings**
- **Crafting Stations:** Workbenches, forges, ovens
- **Farms:** Crop fields with watering
- **Workshops:** Specialized crafting (leather, textiles)
- **Enable:** Advanced recipes and faster production

**Storage**
- **Stockpiles:** Designated ground areas
- **Warehouses:** Protected storage buildings
- **Chests:** Small containers
- **Store:** Resources, food, crafted items

**Infrastructure**
- **Wells:** Water access
- **Roads:** Faster movement
- **Power Generators:** Enable automation (advanced)
- **Conveyor Belts:** Transport items (advanced)

**Religious Buildings**
- **Shrines:** Small prayer spots
- **Temples:** Major worship centers
- **Sacred Sites:** Divine power locations
- **Enable:** Religious activities, divine blessings

### Building Placement

**Via Building Placement UI:**
1. Open Dev Panel (F2) or Building menu
2. Select blueprint
3. Click on map to place
4. Agents will build if materials available

**Via Voxel Builder (Advanced):**
1. Open Building Designer panel
2. Design custom building voxel-by-voxel
3. Save as blueprint
4. Place in world

> **Tip:** Build near resources! Place housing near water, farms on fertile soil, and workshops near material stockpiles.

---

## Time Progression

The simulation runs on a consistent time scale.

### Time Units

- **1 Tick** = 1 in-game minute = 50 milliseconds real-time
- **1 Hour** = 60 ticks = 3 seconds real-time
- **1 Day** = 1440 ticks = 72 seconds (just over 1 real minute)
- **1 Season** = ~30 days = ~30-40 real minutes

### Day/Night Cycle

- **Dawn:** 6:00 AM - Agents wake up
- **Day:** 6:00 AM - 6:00 PM - Peak activity
- **Dusk:** 6:00 PM - 8:00 PM - Agents seek shelter
- **Night:** 8:00 PM - 6:00 AM - Most agents sleep

Agent behavior changes with time:
- **Circadian rhythm** affects energy levels
- **Visibility** reduced at night
- **Temperature** drops at night
- **Certain activities** only happen during day

### Controlling Time

**Time Controls Panel or keyboard:**
- **Pause** (Space or `0`) - Freeze simulation
- **Normal** (`1`) - 20 ticks/second
- **Fast** (`2`) - 2x speed
- **Very Fast** (`3`) - 4x speed

Use pause to:
- Inspect details without things changing
- Plan building placement
- Read through agent thoughts/memories
- Take breaks!

---

## Weather and Environment

The world has dynamic weather affecting agent behavior and survival.

### Weather Types

**Clear** (☀️)
- Normal conditions
- No special effects
- Comfortable temperature (season-dependent)

**Rain** (🌧️)
- Increases soil moisture (good for crops)
- Agents seek shelter
- Reduces cleanliness faster
- Lowers visibility slightly

**Snow** (❄️)
- Only in winter or cold biomes
- Decreases temperature significantly
- Agents need warm shelter
- Slows movement
- Beautiful aesthetic effect

**Storms** (⛈️)
- Heavy rain or snow
- Strong winds (affects fire spread)
- Agents strongly prefer indoors
- Can damage weak structures

### Temperature Effects

**Too Cold** (< 20% comfort)
- Agents seek shelter and warmth
- Energy drains faster
- Risk of hypothermia
- Need: Warm buildings, fires, warm clothing

**Too Hot** (> 80% comfort)
- Agents seek shade and water
- Dehydration risk
- Reduced work speed
- Need: Cool shelters, water access

### Environmental Hazards

**Fire** (🔥)
- Can spread between buildings
- Wind affects spread direction
- Different materials burn at different rates
- Agents will flee or try to extinguish
- **Very dangerous** - can destroy villages

**Drowning** (🌊)
- Agents can drown in deep water
- Swimming mechanics based on skill
- Oxygen management underwater
- Rescue possible if other agents nearby

**Wildlife** (🐻)
- Predators may attack agents
- Agents can fight back or flee
- Injuries require time to heal
- Death is possible

---

## Death and Respawning

Death is part of the simulation, but it's not the end.

### When Agents Die

**Causes:**
- Starvation (hunger = 0 for too long)
- Exhaustion (energy = 0 + overexertion)
- Environmental (fire, drowning, temperature)
- Combat (predators, other agents)
- Old age (eventually)

**What Happens:**
1. Agent becomes a soul (invisible but still exists)
2. Death judgment may occur (if divinity enabled)
3. Soul transitions to afterlife realm
4. **Soul persists forever** (conservation of game matter)
5. Possible reincarnation later

### The Soul System

**Souls are immortal:**
- They never get deleted
- Memories from past lives can "bleed through"
- Reincarnation can bring souls back
- Souls can be queried and studied

This creates **multi-lifetime storylines** where agents might have:
- Dreams of past lives
- Déjà vu experiences
- Past-life connections to other agents
- Karma carrying forward

### Preventing Deaths

**Keep agents alive by:**
- Ensuring food availability
- Providing beds and shelter
- Building protective structures
- Managing temperature hazards
- Defending against predators
- Monitoring needs in Agent Info Panel

> **Note:** Death isn't necessarily bad! It creates drama, story, and the fascinating soul/reincarnation mechanics. Don't stress too much about preventing every death.

---

## Skills and Progression

Agents improve at tasks through practice and experience.

### How Skills Work

**Skill Levels:** 0 (untrained) to 10 (master)
- Start at 0 or low levels
- Gain XP by performing related tasks
- Level up when XP threshold reached
- Higher levels = faster, better quality work

### Common Skills

**Gathering & Production:**
- **Foraging** - Finding wild food
- **Farming** - Growing crops
- **Woodcutting** - Chopping trees
- **Mining** - Gathering stone and ore

**Crafting:**
- **Crafting** - General item creation
- **Cooking** - Food preparation
- **Carpentry** - Wooden items and buildings
- **Smithing** - Metal tools and weapons

**Social & Mental:**
- **Social** - Conversation and persuasion
- **Leadership** - Organizing others
- **Memory** - Retaining information
- **Learning** - Skill acquisition speed

**Combat:**
- **Melee** - Hand-to-hand combat
- **Ranged** - Bow and throwing
- **Defense** - Dodging and blocking

**Magic** (Advanced):
- 25+ magical paradigms
- Each is a separate skill tree
- See [Advanced Features](./advanced-features.md) for details

### Skill Progression

**Automatic:**
- Agents gain XP by doing tasks
- No player intervention needed
- Practice makes perfect

**You can help:**
- Dev Panel → "Grant Skill XP" (testing)
- Assign agents to tasks matching their skills
- Provide tools and facilities that boost learning

---

## Tips for New Players

### Let the Simulation Run
Don't try to control everything. Agents are designed to self-organize. Your role is:
- Ensure resources are available
- Build infrastructure when needed
- Intervene in interesting situations
- Observe and enjoy emergent behavior

### Start Small
- Spawn 3-5 agents initially
- Let them establish basic routines
- Add more once the village is stable
- Don't overwhelm yourself with 50 agents immediately

### Watch Needs
Keep an eye on the Agent Info Panel:
- Red needs (< 30%) require attention
- Check if agents have access to food, beds, water
- Build missing facilities if needs consistently drop

### Build Gradually
- Start with 1-2 tents for shelter
- Add a crafting station
- Build storage for resources
- Expand as agent population grows

### Use Pause Liberally
- Pause to inspect details (Space key)
- Plan building placement while paused
- Read agent thoughts without them changing
- Resume when ready

### Explore the UI
- Open different panels to see what's available
- Right-click on everything to discover actions
- Check the Admin Dashboard for deeper insights
- Don't be afraid to experiment

---

## Next Steps

You now understand the core gameplay mechanics!

**Continue to:**
- **[Advanced Features](./advanced-features.md)** - Magic, divinity, reproduction, time travel
- **[UI Panels Guide](./ui-panels-guide.md)** - Detailed panel reference
- **[Tips and Strategies](./tips-and-strategies.md)** - Expert advice

Or just start playing and learning through observation!
