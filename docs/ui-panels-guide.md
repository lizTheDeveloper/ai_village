# UI Panels Guide

Detailed reference for all 40+ interface panels in the game.

---

## Panel Categories

Panels are organized into categories in the top menu (☰):

- **Agents** - Individual agent management
- **Resources** - Materials and economy
- **Building** - Construction and design
- **Magic** - Spellcasting and skill trees
- **Divine** - Religious and godly interfaces
- **Combat** - Fighting and security
- **Research** - Discovery and technology
- **World** - Environment and time
- **Communication** - Chat and messaging
- **Debug** - Development and testing tools

---

## Agent Panels

### Agent Info Panel
**Shortcut:** `I` (when agent selected)
**Opens:** Automatically when selecting agent

**Sections:**
- **Identity:** Name, species, age, appearance
- **Needs:** Hunger, energy, social, cleanliness, temperature (color-coded bars)
- **Current Thought:** What agent is thinking right now (updates live)
- **Mood:** Emotional state with emoji indicator
- **Behavior:** Current action and goal
- **Skills:** Skill levels with progress bars
- **Inventory:** Items being carried (drag/drop to rearrange)
- **Memories:** Recent episodic memories
- **Relationships:** How agent feels about others
- **Beliefs:** Religious faith allocation

**Tips:**
- Pin this panel to track a specific agent continuously
- Watch "Current Thought" for insight into decision-making
- Red needs (< 30%) indicate problems - check if resources are accessible
- Inventory section allows item transfers via drag-drop

---

### Agent Roster Panel
**Shortcut:** `R`

Lists all agents with quick stats:
- Name and species
- Current activity
- Need status (colored dots: green=good, yellow=warning, red=critical)
- Location
- Skills summary

**Features:**
- Click agent row to select them in world
- Sort by: Name, needs, skills, location
- Filter by: Species, activity type, need status
- Search by name

**Use cases:**
- Find specific agent quickly
- Identify agents with critical needs
- See who's idle vs. busy
- Locate specialists (best farmer, crafter, etc.)

---

### Agent Skills Panel
**Shows:** Selected agent's skill details

**Information:**
- All skills with levels (0-10)
- XP progress to next level
- Recent skill gains
- Skill growth rate

**Use for:**
- Identifying agent specializations
- Tracking progression over time
- Deciding task assignments

---

### Memory Inspector Panel
**Shows:** Agent's memory systems

**Tabs:**
- **Episodic:** Recent events agent experienced
- **Semantic:** Generalized knowledge learned over time
- **Spatial:** Mental map of world locations
- **Procedural:** Learned behaviors and patterns

**Features:**
- Timeline view of memories
- Memory importance scores
- Connections between related memories
- Memory consolidation tracking (episodic → semantic over time)

**Fascinating for:**
- Understanding agent decision-making
- Seeing how experiences shape behavior
- Tracking learning and knowledge acquisition

---

### Relationships Panel
**Shows:** Social network visualization

**Display:**
- Graph with agents as nodes
- Edges show relationships
- Colors indicate: Friendship (green), rivalry (red), neutral (gray)
- Thickness shows relationship strength

**Interactions:**
- Click node to select agent
- Hover for relationship details
- Filter by relationship type
- Zoom and pan graph

**Use for:**
- Understanding social dynamics
- Finding isolated agents
- Spotting cliques and alliances
- Tracking romance and conflicts

---

## Resource and Economy Panels

### Resources Panel
**Shows:** Global stockpile inventory

**Categories:**
- **Materials:** Wood, stone, ore, etc.
- **Food:** Raw ingredients and prepared meals
- **Tools:** Equipment and instruments
- **Crafted items:** Finished products
- **Magic items:** Potions, scrolls, enchanted objects

**Information per item:**
- Quantity
- Quality (if applicable)
- Location (which storage)
- Recent changes (gained/consumed)

**Features:**
- Search and filter
- Sort by quantity, type, quality
- View consumption rate graphs
- Low stock warnings

---

### Crafting Station Panel
**Shows:** Available recipes and crafting queue

**Tabs:**
- **Recipes:** All known recipes
- **Queue:** Items being crafted
- **History:** Recently completed items

**Recipe information:**
- Ingredients required
- Crafting time
- Required skill level
- Required facility (workbench, forge, etc.)
- Output quality range

**Actions:**
- Queue recipe (agent will craft when able)
- Set priority
- Cancel queued items
- View material availability

---

### Farm Management Panel
**Shows:** Agricultural overview

**Information:**
- Crop fields (location, crop type, growth stage)
- Soil quality (moisture, nutrients, pH)
- Planting schedule
- Harvest projections
- Worker assignments

**Actions:**
- Designate new farm zones
- Assign crop types
- Set planting priorities
- Manage irrigation

**Use for:**
- Optimizing food production
- Planning seasonal crops
- Balancing crop diversity

---

### Shop Panel
**Shows:** Trading and market interface

**Features:**
- Buy/sell items
- View market prices
- Trade with other agents or NPCs
- Barter interface

**Economic data:**
- Supply and demand
- Price trends
- Trading history
- Agent wealth levels

---

### Economy Dashboard
**Shows:** Economic analytics

**Graphs:**
- Resource production over time
- Consumption rates
- Trade volume
- Wealth distribution
- Economic growth

**Use for:**
- Identifying bottlenecks
- Balancing production and consumption
- Long-term economic planning

---

## Building and Construction Panels

### Building Designer (Voxel Builder)
**Advanced building creation tool**

**Interface:**
- 3D voxel editor
- Place/remove blocks
- Paint materials
- Add doors, windows, furniture

**Features:**
- Multi-floor design
- Copy/paste sections
- Symmetry mode
- Preview in world before building

**Workflow:**
1. Design building voxel by voxel
2. Save as custom blueprint
3. Place in world
4. Agents construct from blueprint

---

### Building Placement UI
**Place blueprints in world**

**Process:**
1. Select blueprint (from library or custom)
2. Ghost preview shows where it will go
3. Rotate with R key
4. Click to confirm placement
5. Agents gather materials and build

**Preview shows:**
- Material requirements
- Whether space is clear
- Terrain compatibility

---

### Building List Panel
**Shows:** All constructed buildings

**Information per building:**
- Type and name
- Location
- Condition (health/durability)
- Assigned workers
- Production status (if applicable)
- Storage contents

**Actions:**
- Select building in world
- Assign/unassign workers
- Set production priorities
- Request repairs
- Deconstruct

---

### Zone Painter
**Define functional zones**

**Zone types:**
- **Stockpile:** Where to store specific items
- **Farm:** Where to plant crops
- **Gather:** Priority resource collection
- **Forbidden:** Agents avoid area
- **Housing:** Residential designation
- **Workshop:** Production area

**Usage:**
- Click and drag to paint zone
- Set zone type and parameters
- Agents respect zones in decision-making

---

## Magic Panels

### Magic Skill Tree Panel
**Shortcut:** `M` (when agent selected)

**Visual skill tree:**
- Nodes represent spells/abilities
- Lines show prerequisites
- Colors indicate: Locked (gray), available (yellow), unlocked (green)

**Node information (on hover):**
- Spell name and description
- Effect details
- Mana cost
- XP cost to unlock
- Prerequisites

**Interaction:**
- Click node to unlock (if enough XP)
- Pan and zoom tree
- View multiple paradigms in tabs

**Use for:**
- Planning agent magical progression
- Understanding spell relationships
- Efficient XP allocation

---

### Spellbook Panel
**Shows:** Agent's known spells

**Information per spell:**
- Name and paradigm
- Effect description
- Mana cost
- Cooldown
- Success rate (based on skill)

**Actions:**
- Manual cast (click spell, then target)
- Set auto-cast preferences
- View casting history
- Read spell lore

---

### Magic Systems Panel
**Configure universe magic rules**

**Settings:**
- Which paradigms are enabled
- Magic strength multiplier
- Mana regeneration rate
- Learning speed
- Spell stability

**Use for:**
- Creating custom magic rulesets
- Balancing magic power
- Disabling unwanted paradigms
- Experimental magic universes

---

## Divine Panels

### Divine Powers Panel
**God-mode abilities (when playing as deity)**

**Powers available:**
- Send vision to agent
- Grant blessing
- Inflict curse
- Perform miracle
- Smite target
- Answer prayer

**Each power shows:**
- Description
- Power cost
- Cooldown
- Success rate

**Power management:**
- Current power reserves
- Power generation rate
- Power allocation to domains

---

### Prayer Panel
**Shows:** Agent prayers to gods

**Prayer list:**
- Agent name
- Request type (healing, harvest, protection, etc.)
- Target deity
- Prayer quality (how well-phrased)
- Time since prayer

**As deity:**
- Read prayer details
- Choose to answer or ignore
- Grant blessing or send vision
- Track answered prayer history

**As observer:**
- See what agents are praying for
- Understand religious activity
- Monitor god-agent relationships

---

### Temple Management Panel
**Religious building oversight**

**For each temple:**
- Deity honored
- Priest assignments
- Ceremony schedule
- Faith generation rate
- Visitor count
- Offerings received

**Actions:**
- Assign priests
- Schedule ceremonies
- Dedicate to different deity
- Expand temple

---

### Divine Communication Panel
**God-to-god messaging**

**Features:**
- Chat interface between deities
- Pantheon politics
- Negotiations and alliances
- Conflict resolution

**Use for:**
- Coordinating divine actions
- Forming pantheon structure
- Roleplaying deity interactions

---

## Combat and Security Panels

### Combat HUD Panel
**Active combat status**

**Shows during combat:**
- Combatants (friendly and enemy)
- Health bars
- Current action (attack, defend, flee)
- Attack/defense stats
- Predicted outcome

**Features:**
- Real-time updates
- Threat level indicators
- Tactical suggestions
- Quick commands (if controllable units)

---

### Combat Log Panel
**Combat event history**

**Log entries:**
- Attack notifications
- Damage dealt/received
- Critical hits
- Deaths
- Combat resolutions

**Filtering:**
- By combatant
- By time range
- By event type

**Use for:**
- Post-combat analysis
- Understanding fight outcomes
- Tracking injuries

---

### Combat Unit Panel
**Military unit management (advanced)**

**Features:**
- Squad formation
- Equipment management
- Training assignments
- Combat orders
- Patrol routes

---

### Village Defense Panel
**Security management**

**Shows:**
- Guard assignments
- Patrol schedules
- Threat detections
- Defensive structures
- Alert status

**Actions:**
- Assign guards
- Set patrol routes
- Configure alert responses
- Build defenses

---

## Research and Technology Panels

### Research Library Panel
**Available research projects**

**Project information:**
- Name and description
- Prerequisites
- Required resources
- Time to complete
- Unlocks (recipes, buildings, etc.)

**Actions:**
- Start research
- Assign researchers
- Prioritize projects
- View research tree

---

### Tech Tree Panel
**Technology dependency visualization**

**Display:**
- Tree/graph of technologies
- Lines show dependencies
- Colors: Researched, available, locked
- Icons indicate tech category

**Use for:**
- Planning research path
- Understanding tech relationships
- Long-term strategy

---

## World and Environment Panels

### Time Controls Panel
**Simulation time management**

**Controls:**
- Pause/unpause button
- Speed slider (1x, 2x, 4x)
- Current date/time display
- Season indicator

**Additional info:**
- Ticks per second (TPS)
- In-game time elapsed
- Next auto-save countdown

---

### Weather Panel
**Current weather and forecasts**

**Current conditions:**
- Weather type (clear, rain, snow, storm)
- Temperature
- Wind speed and direction
- Precipitation amount

**Forecast:**
- Next few in-game hours
- Seasonal trends
- Climate patterns

**Use for:**
- Planning outdoor activities
- Anticipating agricultural needs
- Preparing for storms

---

### Universe Manager Panel
**Multiverse management**

**Features:**
- List of all universes
- Current universe info
- Fork new universe
- Delete universes
- Switch between universes
- View remote universes

**Universe information:**
- Creation date
- Agent count
- Total ticks elapsed
- Special rules (magic config, etc.)

---

### Notifications Panel
**Event feed and alerts**

**Notification types:**
- Agent deaths
- Building completions
- Resource warnings
- Combat alerts
- Divine events
- Relationship changes

**Features:**
- Time-sorted feed
- Filter by type
- Click to jump to event location
- Dismiss or archive

---

## Communication Panels

### Chat Panel
**Agent conversations**

**Views:**
- Global (all conversations)
- Selected agent (their chats only)
- Nearby (location-based)
- Direct messages

**Chat features:**
- Real-time conversation updates
- Speaker names and portraits
- Conversation topics
- Relationship impacts

**Use for:**
- Understanding social dynamics
- Watching emergent storytelling
- Following specific agent narratives

---

## Debug and Development Panels

### Dev Panel
**Shortcut:** `F2`

**Tabs:**
- **Spawn:** Create agents, animals, plants, items
- **Cheats:** Grant resources, skills, XP
- **Events:** Trigger specific events manually
- **Tools:** Debug utilities

**Common actions:**
- Spawn Wandering Agent (with X,Y coordinates)
- Grant All Skills
- Add Resources
- Trigger Fire/Storm/etc.
- Save/Load game
- Clear world

**Essential for:**
- Testing and experimentation
- Recovering from disasters
- Setting up specific scenarios
- Rapid prototyping

---

### Settings Panel
**Game configuration**

**Categories:**
- **Graphics:** Rendering quality, particles, sprites
- **Performance:** FPS limit, entity culling, throttling
- **Audio:** Volume, sound effects, music
- **Controls:** Keybindings, mouse sensitivity
- **Accessibility:** Colorblind mode, text size
- **Simulation:** Speed limits, auto-save interval

**Important settings:**
- **Performance Mode:** Reduces graphics for better FPS
- **Auto-save interval:** How often game saves (default: 60 seconds)
- **Max agents:** Entity count limits

---

### Performance Stats Panel
**Shortcut:** `F3`

**Real-time metrics:**
- **TPS:** Ticks per second (should be ~20)
- **FPS:** Frames per second (rendering)
- **Entity count:** Total entities in world
- **Active entities:** Currently being simulated
- **Memory usage:** RAM consumption
- **System load:** CPU usage by system

**Graphs:**
- TPS/FPS over time
- Entity count trends
- Memory allocation

**Use for:**
- Diagnosing performance issues
- Optimizing entity counts
- Identifying laggy systems

---

### Metrics Dashboard
**URL:** http://localhost:8766/admin

**Advanced analytics (external browser tab):**
- Agent behavior patterns
- LLM call statistics
- Resource flow analysis
- Event timelines
- System performance deep-dive

See [Controls Guide](./controls.md#admin-dashboard) for details.

---

## Panel Management Tips

### Organizing Your Workspace

**Essential panels to pin:**
- Time Controls (always know when/speed)
- Resources Panel (monitor stockpiles)
- Agent Info (when tracking specific agent)
- Notifications (don't miss important events)

**Panels to open as-needed:**
- Crafting, Building Designer, Magic Skill Tree
- Research, Tech Tree
- Combat panels (only during fights)

### Window Layouts

**Exploration mode:**
- Minimal UI
- Agent Roster for quick selection
- Notifications for alerts

**Management mode:**
- Resources Panel
- Agent Roster
- Building List
- Economy Dashboard

**Story mode:**
- Agent Info (pinned)
- Chat Panel
- Memory Inspector
- Relationships Panel

### Performance Considerations

**Close unused panels** - Each panel consumes resources
**Use Admin Dashboard** - For detailed inspection without in-game panel overhead
**Pin sparingly** - Pinned panels never auto-close, can accumulate

---

## Next Steps

You now know every panel in the game!

**Continue to:**
- **[Tips and Strategies](./tips-and-strategies.md)** - Expert advice
- **[Troubleshooting](./troubleshooting.md)** - Fix common issues

Or start experimenting with different panel combinations to find your ideal workspace!
