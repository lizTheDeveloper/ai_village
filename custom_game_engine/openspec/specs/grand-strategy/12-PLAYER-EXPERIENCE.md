# 12 - Player Experience

**Status**: Draft
**Version**: 1.0.0
**Last Updated**: 2026-01-17
**Dependencies**:
- [02-SOUL-AGENTS.md](./02-SOUL-AGENTS.md) - Soul persistence across scales
- [03-TIME-SCALING.md](./03-TIME-SCALING.md) - Time compression per tier
- [04-SPATIAL-HIERARCHY.md](./04-SPATIAL-HIERARCHY.md) - All spatial tiers
- [05-SHIP-HIERARCHY.md](./05-SHIP-HIERARCHY.md) - Ship organization
- [06-POLITICAL-HIERARCHY.md](./06-POLITICAL-HIERARCHY.md) - Political structures
- [07-TRADE-HIERARCHY.md](./07-TRADE-HIERARCHY.md) - Trade networks
- [11-LLM-GOVERNORS.md](./11-LLM-GOVERNORS.md) - AI advisors

---

## Table of Contents
1. [Overview](#overview)
2. [Zoom Levels and UI](#zoom-levels-and-ui)
3. [Control Modes](#control-modes)
4. [Notifications and Alerts](#notifications-and-alerts)
5. [Interesting Events Detection](#interesting-events-detection)
6. [Story Hooks and Narrative Emergence](#story-hooks-and-narrative-emergence)
7. [Seamless Zoom Transitions](#seamless-zoom-transitions)
8. [Player Soul Agent](#player-soul-agent)
9. [UI Component Reference](#ui-component-reference)
10. [Technical Implementation](#technical-implementation)

---

## Overview

The player experience in the grand strategy system spans 8 spatial tiers and 10,000+ years of simulated time. Players seamlessly transition between controlling individual characters, managing cities, directing nations, and observing galactic civilizations.

### Core Principles

**1. Fractal Engagement**
Every zoom level provides meaningful interaction. Players can find interesting gameplay whether commanding a single agent or watching galaxy-spanning empires.

**2. Seamless Scale Transition**
Zooming between tiers feels continuous. UI morphs, time scales adjust, but the world remains consistent.

**3. Story Persistence**
Named soul agents provide narrative continuity across millennia. A player can follow a bloodline from village founding to galactic empire.

**4. Emergent Narrative**
The game surfaces interesting stories automatically. Players don't hunt for content—content finds them.

**5. Variable Player Embodiment**
Players choose their relationship to the world:
- **Avatar Mode**: Control a soul agent directly
- **Dynasty Mode**: Guide a family across generations
- **Observer Mode**: Watch civilizations evolve
- **God Mode**: Influence without direct control

---

## Zoom Levels and UI

### Spatial Tier Progression

From [04-SPATIAL-HIERARCHY.md](./04-SPATIAL-HIERARCHY.md):
```
Tile (1m²) → Chunk (16×16m) → Zone (256×256m) → Region (4×4km)
→ Planet → System → Sector → Galaxy
```

Each tier has distinct UI, time scale, and control paradigm.

---

### Tier 1: Tile View (Direct Control)

**Scale**: 1 meter per tile
**Time**: Real-time (1 tick = 1 second)
**Player Role**: Direct character control (like RimWorld/Dwarf Fortress)

**UI Layout**:
```
┌─────────────────────────────────────────────────────────────┐
│ [Name] HP: ████░ Mood: Happy        [⚙️ Settings] [↗️ Zoom Out] │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│    Isometric/Top-down Tile View                            │
│    ┌─────────────────────────┐                             │
│    │ Trees  Agent  Building  │                             │
│    │   🌳    👤     🏠       │   [Minimap]                 │
│    │ Grass  Water  Path      │   ┌───────┐                 │
│    │   🟩    🌊     ═══      │   │ ▪️▫️▫️ │                 │
│    └─────────────────────────┘   │ ▫️🔴▫️ │ (current chunk) │
│                                   │ ▫️▫️▫️ │                 │
│                                   └───────┘                 │
├─────────────────────────────────────────────────────────────┤
│ Agent Panel: [Aria Moonwhisper]                             │
│ Activity: Gathering berries                                 │
│ Skills: Foraging 5, Crafting 3                              │
│ Inventory: [Berries ×12] [Stick ×3]                         │
│ Thoughts: "These berries look delicious..."                 │
├─────────────────────────────────────────────────────────────┤
│ Actions: [Move] [Work] [Craft] [Social] [Rest] [Fight]     │
└─────────────────────────────────────────────────────────────┘
```

**Information Displayed**:
- Individual tiles (grass, stone, water)
- All agents with animations
- Items on ground
- Building interiors
- Weather particles (rain, snow)
- Agent thought bubbles
- Pathfinding indicators

**Player Actions**:
- Click to move agent
- Right-click for action menu
- Queue tasks
- Draft/undraft combat mode
- Manual item interactions
- Build furniture placement

**Focus Indicators**:
- **Soul Agents**: Gold crown icon
- **Interesting Characters**: Star icon
- **Your Dynasty**: Family crest icon

---

### Tier 2: Chunk View (Colony Management)

**Scale**: 16×16 meters (256 tiles)
**Time**: 1 tick = 1-5 seconds
**Player Role**: Colony overseer (like RimWorld zoomed out)

**UI Layout**:
```
┌─────────────────────────────────────────────────────────────┐
│ Settlement: Moonhaven   Pop: 12   Food: 245   [↗️↙️ Zoom]    │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│    Chunk Overview (16×16m)                                  │
│    ┌──────────────────────┐                                │
│    │ 🏠🏠  🌳🌳  💧       │   Zone Map                      │
│    │ 🏠👤  🌾🌾  🌳       │   ┌─────────┐                   │
│    │ 🔥   🌾👤  🌳       │   │ █ █ ░ ░ │                   │
│    │ 👤   🌾🌾  💧       │   │ █🔴 ░ ░ │ (current chunk)   │
│    └──────────────────────┘   │ ░ ░ ░ ░ │                   │
│                                └─────────┘                   │
├─────────────────────────────────────────────────────────────┤
│ Colony Stats:                                                │
│ Morale: High (85%) | Food: +5/day | Materials: 120 wood     │
│ Active Tasks: [Build Wall ×2] [Farm ×3] [Hunt ×1]           │
├─────────────────────────────────────────────────────────────┤
│ Recent Events:                                               │
│ • Aria harvested 24 berries (+12 food)                       │
│ • Trade caravan arrived from Oakdale                         │
│ • ⚠️ Low firewood stockpile                                  │
└─────────────────────────────────────────────────────────────┘
```

**Information Displayed**:
- Agents as animated icons (not full detail)
- Building footprints
- Resource stockpiles
- Work zones (farming, mining, storage)
- Basic weather indicators
- Aggregated colony stats

**Player Actions**:
- Zone designation (farming, storage, bedrooms)
- Work priorities
- Building blueprints
- Trade caravan interaction
- Basic diplomacy with visitors

**Abstraction**:
- Individual tiles hidden (grass/stone texture blend)
- Agent details hidden unless selected
- Simplified pathfinding visualization

---

### Tier 3: Zone View (Village Management)

**Scale**: 256×256 meters (16×16 chunks)
**Time**: 1 tick = 10-30 seconds
**Player Role**: Village mayor (like city builder)

**UI Layout**:
```
┌─────────────────────────────────────────────────────────────┐
│ 🏛️ Village of Moonhaven         Pop: 245      Year: 1024    │
│ Governor: Mayor Theron Brightoak (LLM-assisted)             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│    Zone Overview (256×256m, 16×16 chunks)                   │
│    ┌────────────────────────────┐                          │
│    │ 🏘️🏘️🌲🌲  🌾🌾🌾🌾      │  Region Map                 │
│    │ 🏘️🏛️🌲💧  🌾🌾🌾🌾      │  ┌───────┐                  │
│    │ 🏘️🏘️🛤️💧  ⛏️⛏️🌲🌲      │  │ ▓▓░░░ │                  │
│    │ 🌾🌾🛤️💧  ⛏️⛏️🌲🌲      │  │ ▓🔴▓░ │                  │
│    └────────────────────────────┘  │ ░░░░░ │                  │
│                                     └───────┘                  │
├─────────────────────────────────────────────────────────────┤
│ Village Council (LLM Governor Interface):                   │
│ Mayor: "Our food stores are excellent, but we need more     │
│         skilled craftsmen. Should we recruit from Oakdale?" │
│ You: [Approve] [Suggest Alternative] [Override]             │
├─────────────────────────────────────────────────────────────┤
│ District Overview:                                           │
│ Residential: 12 chunks, 180 pop │ Farms: 8 chunks, +120 food│
│ Market: 2 chunks, 45 traders    │ Mine: 4 chunks, +30 iron  │
│                                                              │
│ Policies: [Work Hours] [Taxes] [Trade] [Defense]            │
└─────────────────────────────────────────────────────────────┘
```

**Information Displayed**:
- Chunks as district icons (residential 🏘️, farms 🌾, mines ⛏️)
- Aggregate population per district
- Resource flows (food/day, materials/day)
- LLM governor decisions and proposals
- Major buildings (town hall, temple, market)
- Road networks

**Player Actions**:
- District zoning (residential, commercial, industrial)
- Approve/reject governor proposals
- Set village policies (tax rate, work hours, trade restrictions)
- Initiate construction projects (walls, temples, workshops)
- Diplomacy with neighboring villages

**LLM Governor Interaction**:
Per [11-LLM-GOVERNORS.md](./11-LLM-GOVERNORS.md), the Mayor manages:
- Resource allocation
- Construction priorities
- Population happiness
- Trade negotiations

Player provides **advisory input**, not micromanagement.

---

### Tier 4: Region View (Multi-Settlement)

**Scale**: 4×4 kilometers (16×16 zones)
**Time**: 1 tick = 1-5 minutes
**Player Role**: Regional lord (like Crusader Kings)

**UI Layout**:
```
┌─────────────────────────────────────────────────────────────┐
│ 🏰 Moonwood Region          Pop: 2,450      Year: 1024      │
│ Ruler: Lord Kael Moonwhisper (Your Dynasty) ⭐️              │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│    Regional Map (4×4km)                                     │
│    ┌─────────────────────────────────┐                     │
│    │ 🏰Moonhaven🌲🌲  🏘️Oakdale      │  Planet Map         │
│    │ 🛤️🛤️🛤️🛤️  🌲🌲🏘️Ironforge   │  ┌─────┐             │
│    │ 🌾🌾💧💧  ⚔️🏘️Rivercross     │  │ ░▓░ │             │
│    │ 🌲🌲🌲🏔️  🏔️🏔️🏔️🏔️        │  │ ▓🔴 │             │
│    └─────────────────────────────────┘  └─────┘             │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│ Settlements (4):                                             │
│ • Moonhaven (Capital): 1,200 pop, Thriving                  │
│ • Oakdale: 600 pop, Growing                                 │
│ • Ironforge: 450 pop, Mining hub                            │
│ • Rivercross: 200 pop, ⚠️ Bandit raids!                     │
│                                                              │
│ Regional Issues:                                             │
│ 🚨 Rivercross under attack! [Send Army] [Negotiate] [Ignore]│
│ 💰 Trade route to neighboring region proposed               │
│ 🏛️ Temple construction complete in Moonhaven                │
├─────────────────────────────────────────────────────────────┤
│ Your Character: Lord Kael (Age 42, Soul Agent ⭐️)           │
│ Traits: Brave, Just, Skilled Diplomat                       │
│ Relationships: [Family] [Vassals] [Rivals]                  │
│ Life Events: [Married] [3 Children] [Won Battle of Oakdale] │
└─────────────────────────────────────────────────────────────┘
```

**Information Displayed**:
- Zones as settlement icons
- Roads between settlements
- Territory borders
- Army movements
- Trade routes
- Geographic features (mountains, rivers)
- Soul agent characters with relationships

**Player Actions**:
- Move between settlements (your character travels)
- Manage vassals (appoint governors)
- Military commands (raise armies, declare war)
- Diplomacy (alliances, marriages, trade agreements)
- Economic policy (taxes, trade routes)
- Character interactions (marry, have children, mentor heirs)

**Soul Agent Focus**:
If you control a soul agent (Lord Kael), you:
- Age naturally (can die)
- Have personal relationships and reputation
- Can mentor children to inherit your role
- Make decisions that affect your legacy

---

### Tier 5: Planet View (Nation Management)

**Scale**: Entire planet (4-16 regions)
**Time**: 1 tick = 10-60 minutes
**Player Role**: National leader (like Civilization)

**UI Layout**:
```
┌─────────────────────────────────────────────────────────────┐
│ 🌍 Kingdom of Lunara          Pop: 125,000    Year: 1024    │
│ Monarch: Queen Aria III (Dynasty: Moonwhisper ⭐️)           │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│    Planetary Map                                            │
│    ┌──────────────────────────────────┐                    │
│    │      🌊🌊🌊🌊🌊🌊               │  System Map         │
│    │   🏔️🏰🏰🏰🌲🌊               │  ┌───┐               │
│    │   🏔️🏰👑🏰🌲🌊  ⚔️🏴       │  │ ◉ │               │
│    │   🌾🏰🏰🏰🌾🌊  🏴🏴       │  │   │               │
│    │   🌾🌾💧🌾🌾🌾  🏴🏴       │  └───┘               │
│    │      🌊🌊🌊🌊🌊🌊               │                      │
│    └──────────────────────────────────┘                    │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│ National Overview:                                           │
│ Regions: 12 | Cities: 48 | Military: 15,000 troops          │
│ Treasury: 50,000 gold | Income: +2,000/month                │
│ Technology: Medieval Era (researching: Gunpowder)           │
│                                                              │
│ Current Conflicts:                                           │
│ ⚔️ WAR with Shadowlands (enemy regions marked 🏴)           │
│    • Battle of Darkwood: Victory (+1,200 troops lost)       │
│    • Siege of Grimhold: Ongoing (25 days)                   │
│    [War Council] [Peace Negotiations] [Declare Total War]   │
│                                                              │
│ Diplomatic Relations:                                        │
│ • Verdant Republic: Allied (trade +15%)                     │
│ • Iron Confederacy: Neutral (border tensions)               │
│ • Coastal League: Trade Partner                             │
├─────────────────────────────────────────────────────────────┤
│ Dynasty Status:                                              │
│ Queen Aria III (Age 38, your ancestor's descendant)         │
│ Heir: Prince Kael IV (Age 16, training in diplomacy)        │
│ Legacy: Founded by Lord Kael I (Year 980, your first life)  │
└─────────────────────────────────────────────────────────────┘
```

**Information Displayed**:
- Regions as territory blocks
- National borders (your nation vs others)
- War fronts
- Capital city (👑)
- Resource summaries (gold, food, military)
- Tech tree progress
- Diplomatic relations
- Dynasty lineage

**Player Actions**:
- Declare war/peace
- Conduct diplomacy (alliances, trade, marriages)
- National policies (laws, culture, religion)
- Research direction (tech tree)
- Grand construction (wonders, capital improvements)
- Succession planning (if in dynasty mode)

**LLM Governors**:
Per [11-LLM-GOVERNORS.md](./11-LLM-GOVERNORS.md):
- **Chancellor**: Internal affairs, economy
- **Marshal**: Military strategy
- **Spymaster**: Intelligence, intrigue
- **High Priest**: Religious matters

Player sets **high-level strategy**, governors execute.

**Time Acceleration**:
Can fast-forward months/years when at peace. Auto-pause on:
- War declarations
- Major battles
- Dynasty events (births, deaths, marriages)
- Crisis alerts

---

### Tier 6: System View (Interplanetary Empire)

**Scale**: Star system (1-12 planets + stations)
**Time**: 1 tick = 1-24 hours
**Player Role**: Emperor (like Stellaris)

**UI Layout**:
```
┌─────────────────────────────────────────────────────────────┐
│ ☀️ Lunara System          Empire Pop: 2.4M    Year: 2450    │
│ Emperor: Kael IX (Clone of Kael I, Soul Agent ⭐️)           │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│    System Map (Orbital View)                                │
│    ┌────────────────────────────────────┐                  │
│    │         ☀️                         │  Sector Map      │
│    │    🌍Lunara    🔴Mars              │  ┌─────┐         │
│    │      (Capital)  (Mining)           │  │ ⊙   │         │
│    │                                     │  │  🔴 │         │
│    │  🌕Station-7    ☄️Asteroids        │  │     │         │
│    │   (Shipyard)     (Resources)       │  └─────┘         │
│    │                                     │                  │
│    │           🪐Jupiter (Gas Giant)    │                  │
│    └────────────────────────────────────┘                  │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│ System Overview:                                             │
│ Planets: Lunara (2.4M), Mars (150K), Jupiter Moons (50K)   │
│ Fleet Strength: 240 ships (12 fleets)                       │
│ Economy: +50K credits/month | Alloys: +1,200/month          │
│                                                              │
│ Expansion Projects:                                          │
│ • Mars Terraforming: 35% complete (12 years remaining)      │
│ • Station-7 Upgrade: Titan-class shipyard (5 years)         │
│ • Asteroid Mining IV: +500 minerals/month                   │
│                                                              │
│ Galactic Situation:                                          │
│ 🚨 First Contact: Unknown alien signal from Proxima Sector! │
│    [Send Diplomatic Mission] [Military Response] [Ignore]   │
├─────────────────────────────────────────────────────────────┤
│ Dynasty Note:                                                │
│ Emperor Kael IX is a genetic clone of original soul agent   │
│ Kael I (from Year 980). Memory engrams partially restored.  │
│ Continues Moonwhisper Dynasty legacy across 1,500 years.    │
└─────────────────────────────────────────────────────────────┘
```

**Information Displayed**:
- Planets as orbital bodies
- Space stations
- Fleet positions
- Resource nodes (asteroids, gas giants)
- Wormholes/jump gates
- Alien territories (if encountered)

**Player Actions**:
- Colonize new planets
- Build space stations
- Fleet management (squadron → fleet → armada per [05-SHIP-HIERARCHY.md](./05-SHIP-HIERARCHY.md))
- Interplanetary trade routes
- Megastructure construction (Dyson spheres, ringworlds)
- First contact protocols

**Soul Agent Continuity**:
Per [02-SOUL-AGENTS.md](./02-SOUL-AGENTS.md), if original Kael I died centuries ago:
- **Clone Revival**: Genetic/memory clone technology
- **Dynasty Succession**: Descendant carries Moonwhisper name
- **Observer Mode**: You watch the empire from outside

---

### Tier 7: Sector View (Multi-System Federation)

**Scale**: 4-64 star systems
**Time**: 1 tick = 1-7 days
**Player Role**: Federation leader (like Stellaris mid-game)

**UI Layout**:
```
┌─────────────────────────────────────────────────────────────┐
│ 🌌 Moonwhisper Federation    Pop: 24M      Year: 3120       │
│ High Chancellor: AI Council (LLM Governors)                 │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│    Sector Map (64 star systems)                             │
│    ┌─────────────────────────────────────┐                 │
│    │ ⊙⊙⊙⊙  ⊙⊙⊙⊙  ░░░░  🔴🔴           │  Galaxy Map      │
│    │ ⊙👑⊙⊙  ⊙⊙⊙⊙  ░░░░  🔴🔴           │  ┌─┐             │
│    │ ⊙⊙⊙⊙  ⊙⊙⊙⊙  ░░░░  🔴🔴           │  │█│             │
│    │ ⊙⊙⊙⊙  ⊙⊙⊙⊙  ░░░░  🔴🔴           │  └─┘             │
│    │ Legend: ⊙ Your systems              │                 │
│    │         👑 Capital (Lunara System)  │                 │
│    │         ░ Unexplored space          │                 │
│    │         🔴 Hostile alien empire     │                 │
│    └─────────────────────────────────────┘                 │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│ Federation Status:                                           │
│ Systems: 32 (of 64 in sector)                               │
│ Member Nations: 8 (Lunara, Verdant, Iron, Coastal, ...)    │
│ Combined Fleet: 12,000 ships across 6 armadas              │
│                                                              │
│ Galactic Politics:                                           │
│ 🚨 WAR: Red Dominion invaded border systems!                │
│    • Battle of Sigma-7: Federation victory (800 ships lost) │
│    • 3 systems under siege                                  │
│    [Emergency Council] [Call for Reinforcements] [Retreat]  │
│                                                              │
│ Federation Policies:                                         │
│ Trade: Free trade (+25% economy) | Military: Shared defense │
│ Science: Joint research (+15% tech) | Culture: Open borders │
├─────────────────────────────────────────────────────────────┤
│ Your Role: Observer/Advisor                                 │
│ The Federation is managed by LLM governors. You provide     │
│ strategic guidance and watch your civilization's legacy.    │
└─────────────────────────────────────────────────────────────┘
```

**Information Displayed**:
- Star systems as dots
- Territory ownership (color-coded)
- Trade lanes per [07-TRADE-HIERARCHY.md](./07-TRADE-HIERARCHY.md)
- War fronts
- Unexplored space
- Wormhole networks

**Player Actions**:
- Vote on federation policies
- Suggest strategic priorities to LLM council
- Watch major battles (can zoom in to fleet tier)
- Approve/veto critical decisions (war declarations, mega-treaties)

**Mostly Automated**:
At this scale, **LLM governors run the show**. Player is more **observer with veto power** than active controller.

---

### Tier 8: Galaxy View (Civilization Observer)

**Scale**: Entire galaxy (4-256 sectors)
**Time**: 1 tick = 1-30 days (up to 10,000 years/tick per [03-TIME-SCALING.md](./03-TIME-SCALING.md))
**Player Role**: Cosmic observer (like Spore Space Stage finale)

**UI Layout**:
```
┌─────────────────────────────────────────────────────────────┐
│ 🌌 Andromeda Galaxy          Year: 125,480 CE               │
│ Civilizations: 14 active | Extinct: 7 | Ascended: 2         │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│    Galaxy Map                                               │
│    ┌──────────────────────────────────────────┐            │
│    │        🌌                                 │            │
│    │    ░░░░▓▓▓▓▓░░░░                        │            │
│    │  ░░▓▓🔵🔵⭐️🔵🔵▓▓░░                    │            │
│    │  ░▓🔵🔵🟢🟢🔵🔵🔵▓░                    │            │
│    │  ░▓🔵🟢🟢🟡🟢🟢🔵▓░                    │            │
│    │  ░▓🔵🔵🟢🟢🔵🔵🔵▓░                    │            │
│    │  ░░▓▓🔵🔵🔵🔵🔵▓▓░░                    │            │
│    │    ░░░░▓▓▓▓▓░░░░                        │            │
│    │                                           │            │
│    │ Legend:                                   │            │
│    │ ⭐️ Original Moonwhisper origin (Lunara)  │            │
│    │ 🔵 Your civilization's controlled space   │            │
│    │ 🟢 Allied civilizations                   │            │
│    │ 🟡 Neutral civilizations                  │            │
│    │ 🔴 Hostile civilizations (none shown)     │            │
│    └──────────────────────────────────────────┘            │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│ Civilization Timeline:                                       │
│ Year 980: Moonhaven village founded by soul agent Kael I    │
│ Year 1024: Kingdom of Lunara established                    │
│ Year 2450: First FTL flight, Lunara System colonized        │
│ Year 3120: Moonwhisper Federation forms                     │
│ Year 45,000: Galactic empire spans 12,000 systems           │
│ Year 125,480: Post-scarcity civilization, exploring ascend. │
│                                                              │
│ Active Story Arcs:                                           │
│ 🌟 The Transcendence Project: 45% complete                  │
│    Your civilization researching upload to higher dimension │
│    [View Details] [Fast-forward 1,000 years]                │
│                                                              │
│ 🔍 Interesting Events (last 100 years):                     │
│ • First contact with Crystalline Collective (Year 125,380)  │
│ • Dyson Sphere construction complete in Sigma Sector        │
│ • 3 new member species joined federation                    │
├─────────────────────────────────────────────────────────────┤
│ Player Options:                                              │
│ [Fast-Forward Time] [Zoom to Interesting Event]             │
│ [Switch to Different Civilization] [Start New Game]         │
└─────────────────────────────────────────────────────────────┘
```

**Information Displayed**:
- Galaxy map (sectors as colored blobs)
- Civilization territories
- Major galactic events
- Timeline of your civilization's history
- Ascension progress (if applicable)

**Player Actions**:
- Watch civilization evolve
- Fast-forward centuries/millennia
- Zoom in to interesting events
- Switch to controlling different civilizations
- Witness civilization ascension/extinction

**Narrative Closure**:
At this scale, **the game becomes a story generator**. You watch the epic conclusion of a civilization that started with a single soul agent in a medieval village.

---

## Control Modes

Players choose their relationship to the world. Control mode affects what you can do and how the game feels.

---

### Direct Control Mode

**Available**: Tile, Chunk tiers
**Paradigm**: RimWorld, Dwarf Fortress
**Player Embodiment**: Control a specific soul agent

**What You Do**:
- Click to move your agent
- Queue actions (chop tree, build wall, craft item)
- Control combat directly
- Manage inventory
- Social interactions

**UI Characteristics**:
- Action queue visible
- Health/stamina bars
- Thought bubbles
- Equipment paperdoll
- First-person narrative text

**Example Session**:
```
You control Aria Moonwhisper, a forager in Moonhaven village.

8:00 AM - Wake up in hut
8:15 AM - Eat breakfast (bread, berries)
8:30 AM - Walk to forest (you click destination)
9:00 AM - Forage for berries (action queue: "Forage ×10")
11:30 AM - Return to village
12:00 PM - Deposit berries in stockpile
12:30 PM - Eat lunch
1:00 PM - Socialize with Theron (you initiate conversation)
2:00 PM - Craft basket (you select recipe)
5:00 PM - Dinner with village
7:00 PM - Sleep

Next day, you continue controlling Aria's actions.
```

**Transition to Advisory**:
When you zoom out to Zone tier, Aria continues as an **autonomous agent**. You can zoom back in anytime to regain direct control.

---

### Advisory Mode

**Available**: Zone, Region, Planet tiers
**Paradigm**: City builder + Crusader Kings
**Player Embodiment**: Influential character or detached advisor

**What You Do**:
- Approve/reject governor proposals
- Set policies and priorities
- Designate zones/districts
- Initiate major projects
- Diplomacy with neighbors

**LLM Governor Interaction**:
Per [11-LLM-GOVERNORS.md](./11-LLM-GOVERNORS.md), governors present **decisions** to you:

```
Mayor Theron: "Our granary is at 80% capacity. Should we:
  A) Expand storage (+50 capacity, costs 200 wood)
  B) Sell surplus to Oakdale (+300 gold)
  C) Prepare for winter (keep current stock)

My recommendation: Option A. We expect population growth."

You: [Approve A] [Choose B] [Choose C] [Ask for more info]
```

**Your Authority**:
- **Veto**: Reject any governor decision
- **Override**: Force a specific choice
- **Suggest**: Provide guidance, governor decides
- **Delegate**: Auto-approve all minor decisions

**UI Characteristics**:
- Decision prompts with context
- Policy sliders (tax rate, work hours, military spending)
- Approval ratings
- Event log of governor actions

**Example Session**:
```
You are Lord Kael Moonwhisper, ruler of Moonwood Region.

Day 1:
- Mayor of Moonhaven requests approval for temple construction (Cost: 500 gold)
  → You approve
- Governor of Oakdale reports bandit raid
  → You send 20 soldiers from Moonhaven garrison
- Trade caravan arrives with luxury goods
  → You set tariff at 15%

Day 2:
- Temple foundation laid in Moonhaven
- Bandits defeated, 3 soldiers wounded
- Rival lord proposes marriage alliance
  → You accept (marrying your daughter to his son)

You provide strategic guidance; governors handle execution.
```

---

### Strategic Mode

**Available**: Planet, System, Sector tiers
**Paradigm**: Civilization, Stellaris
**Player Embodiment**: National leader or distant dynasty observer

**What You Do**:
- Set national policies
- Declare war/peace
- Research direction
- Grand construction projects
- Succession planning (dynasty mode)

**High-Level Strategy**:
You don't manage individual cities. You set **national priorities**:

```
National Focus (choose 2):
[ ] Military Expansion - +25% army training speed
[ ] Economic Growth - +15% resource production
[✓] Scientific Advancement - +20% research speed
[✓] Cultural Development - +10% happiness, +5% diplomacy

Research Queue:
1. Gunpowder (12 years remaining)
2. Advanced Shipbuilding (queued)
3. Printing Press (queued)

Governors execute based on your priorities.
```

**UI Characteristics**:
- Grand strategy map
- Diplomacy screen (all nations)
- Tech tree
- Army/fleet management
- Victory conditions tracker

**Example Session**:
```
You rule the Kingdom of Lunara (Planet tier).

Year 1024:
- Research: Gunpowder completes
- War declared by Shadowlands
- You raise 5,000 troops, assign to Marshal AI governor
- Battle of Darkwood: Victory (governor executed strategy)
- Peace negotiations: You demand 2 border regions

Year 1030:
- Gunpowder unlocks musket units
- You queue "Advanced Shipbuilding" research
- Economy booming (+25% trade from new tech)
- Heir comes of age (you choose education focus: Diplomacy)

Fast-forward to Year 1050:
- Your character dies (age 68)
- Heir becomes King Kael II (your son)
- You now control Kael II, continue dynasty
```

---

### Observer Mode

**Available**: Sector, Galaxy tiers
**Paradigm**: Spore Space Stage finale
**Player Embodiment**: Cosmic observer, no personal avatar

**What You Do**:
- Watch civilizations evolve
- Fast-forward time (years, centuries, millennia)
- Zoom in to interesting events
- Switch focus to different civilizations
- Witness galactic history unfold

**Minimal Agency**:
You can:
- **Pause**: Stop time to examine state
- **Fast-forward**: Accelerate to interesting moments
- **Zoom**: Descend to lower tiers to interact
- **Veto**: Prevent catastrophic decisions (rare)

**Cannot**:
- Directly control agents
- Micromanage resources
- Fight battles personally

**UI Characteristics**:
- Galaxy map
- Civilization timelines
- Event notifications
- "Interesting event" auto-pause
- Fast-forward controls (1x, 10x, 100x, 1000x speed)

**Example Session**:
```
You watch the Moonwhisper civilization from galaxy view.

Year 3120: Federation forms (8 member nations)
→ Fast-forward 1,000 years (10 seconds real-time)

Year 4120: First contact with alien species
→ Auto-pause on interesting event
→ You zoom in to System tier to watch first contact
→ Diplomatic mission succeeds, trade treaty signed
→ You zoom back out to Galaxy tier

Year 10,000: Galactic empire spans 12,000 systems
→ Fast-forward 10,000 years (1 minute real-time)

Year 20,000: Civilization researching ascension tech
→ Event: "The Transcendence Project begins"
→ You watch progress bars fill over centuries

Year 25,000: Civilization ascends to higher dimension
→ End screen: "Your civilization has transcended physical reality.
   From a single village in Year 980 to cosmic apotheosis.
   Total playtime: 8 hours. Simulated time: 24,020 years."

[View Full History] [Start New Civilization] [Load Earlier Era]
```

---

## Notifications and Alerts

Alerts filter what reaches the player across zoom levels. Critical events always notify; minor events only show if you're zoomed in.

---

### Alert Priority System

**Priority Levels**:
1. **CRITICAL** - Always notify, auto-pause
2. **HIGH** - Notify at current tier or higher
3. **MEDIUM** - Notify only at nearby tiers
4. **LOW** - Only show in event log

**Tier-Specific Thresholds**:

| Event Type | Tile | Chunk | Zone | Region | Planet | System | Sector | Galaxy |
|---|---|---|---|---|---|---|---|---|
| Agent injury | MED | MED | LOW | - | - | - | - | - |
| Agent death | HIGH | HIGH | MED | LOW | - | - | - | - |
| Soul agent death | **CRIT** | **CRIT** | **CRIT** | **CRIT** | HIGH | MED | LOW | - |
| Building complete | LOW | MED | MED | LOW | - | - | - | - |
| Village founded | - | HIGH | HIGH | HIGH | MED | LOW | - | - |
| War declared | - | - | HIGH | **CRIT** | **CRIT** | HIGH | MED | LOW |
| Battle won/lost | - | - | MED | HIGH | HIGH | MED | LOW | - |
| Tech completed | - | - | LOW | MED | HIGH | HIGH | MED | LOW |
| First contact | - | - | - | - | **CRIT** | **CRIT** | **CRIT** | HIGH |
| Civilization extinct | - | - | - | - | HIGH | HIGH | **CRIT** | **CRIT** |
| Ascension event | - | - | - | - | HIGH | HIGH | **CRIT** | **CRIT** |

---

### Soul Agent Alerts

Per [02-SOUL-AGENTS.md](./02-SOUL-AGENTS.md), **soul agents always notify** regardless of zoom level.

**Soul Agent Events**:
- Birth/death
- Major life events (marriage, children, injury)
- Skill breakthroughs (master craftsman, legendary warrior)
- Relationship changes (friendships, rivalries, romances)
- Legacy milestones (founded city, won war, discovered tech)

**Visual Indicators**:
- **Gold crown icon** (⭐️) on map
- **Persistent notification** in corner
- **Timeline marker** in dynasty view

**Example**:
```
You're at Galaxy tier, watching Year 50,000.

Notification: ⭐️ Soul Agent Born
"Kael XX born in Sector Sigma-7, descended from original
 Kael I bloodline (1,250 generations removed)."

[View Lineage] [Zoom to Agent] [Dismiss]

You click "Zoom to Agent" → game zooms through:
Galaxy → Sector → System → Planet → Region → Zone → Chunk

Now you see baby Kael XX in a futuristic maternity ward.
```

---

### Crisis Escalation

Some events **escalate** across tiers if ignored.

**Example: Bandit Raid**:
```
Zone Tier (Village):
  Alert: "Bandits spotted near Moonhaven" (MEDIUM)
  → You ignore

Region Tier (10 minutes later):
  Alert: "Moonhaven under attack!" (HIGH)
  → You ignore

Region Tier (1 hour later):
  Alert: "Moonhaven has fallen! 45 villagers killed." (CRITICAL)
  → Auto-pause, demands response
```

**Escalation Mechanics**:
- Event severity increases over time
- Alert priority rises
- Eventually auto-pauses game
- Prevents players from missing critical events

---

### Alert Filtering

**Customizable Filters**:

```
Alert Settings:
[✓] Auto-pause on CRITICAL
[✓] Notify on soul agent events
[✓] Notify on war declarations
[ ] Notify on building completions
[ ] Notify on agent deaths (non-soul)
[ ] Notify on trade events

Soul Agent Filters:
[✓] Your dynasty members
[✓] Named historical figures
[ ] All soul agents

Battle Notifications:
[✓] Major battles (1,000+ troops)
[ ] Minor skirmishes
```

**Smart Filtering**:
Game learns what you care about:
- If you always zoom to battles → more battle alerts
- If you ignore economic alerts → fewer economic alerts
- If you track specific characters → prioritize their events

---

## Interesting Events Detection

**Goal**: Surface compelling stories automatically.

---

### Interesting Event Criteria

**Algorithm** (simplified):
```typescript
function calculateEventInterest(event: Event): number {
  let score = 0;

  // Soul agent involvement
  if (event.involvesSoulAgent) score += 50;
  if (event.involvesPlayerDynasty) score += 75;

  // Historical significance
  if (event.firstOfType) score += 30; // First war, first contact, etc.
  if (event.affectsMultipleTiers) score += 20;

  // Dramatic stakes
  score += event.populationImpact * 0.1; // More people = more dramatic
  score += event.economicImpact * 0.05;

  // Narrative potential
  if (event.hasRivalry) score += 15;
  if (event.hasRomance) score += 10;
  if (event.resolvesPreviousEvent) score += 25; // Callbacks!

  // Rarity
  score += (1.0 / event.frequency) * 10; // Rare events score higher

  return score;
}

// Threshold: 100+ = "Interesting Event"
```

**Examples**:

| Event | Score | Why |
|---|---|---|
| Random villager harvests wheat | 0 | Routine |
| Soul agent Aria marries | 75 | Soul agent + romance |
| First contact with aliens | 180 | Soul agent + first of type + high stakes |
| Battle between two dynasties you've followed for centuries | 250 | Multiple soul agents + rivalry + historical callback |

---

### Auto-Pause on Interesting Events

**Behavior**:
- Game pauses automatically
- Event description with context
- Options to zoom in or continue

**Example**:
```
🌟 INTERESTING EVENT

Year 5,420: The Reunification

Queen Lyra Moonwhisper (your dynasty) has proposed marriage
to Prince Theron Brightoak (rival dynasty).

These two bloodlines have been at war for 800 years, since
the Battle of Darkwood (Year 4,620). This union would end
the longest conflict in galactic history.

[Zoom to Diplomatic Summit] [Watch Outcome] [Fast-forward]
```

**Player Choice**:
- **Zoom in**: Descend to Region tier to watch negotiations
- **Watch**: Stay at current tier, see summary
- **Fast-forward**: Skip to result

---

### Story Arc Tracking

**The game remembers** and connects events across centuries.

**Example Arc**:
```
Year 980: Kael I founds Moonhaven village
Year 1024: Kael I's son becomes Lord of Moonwood Region
Year 1050: Kael II defeats bandits, establishes peace
Year 1080: Kael III betrayed by rival lord, civil war begins
Year 1100: Moonwood falls, dynasty exiled
Year 1150: Kael IV retakes Moonwood, dynasty restored
Year 1200: Kingdom of Lunara declared, Kael V crowned king
...
Year 5,420: Queen Lyra marries Prince Theron, unites dynasties
Year 10,000: Unified empire colonizes galaxy
Year 25,000: Empire ascends, Moonwhisper name eternal

Arc: "Rise, Fall, Redemption, Transcendence"
Duration: 24,020 years
Player engagement: 8 hours
```

**Arc Types**:
- **Dynasty Saga**: Family rises, falls, rises
- **Rivalry**: Two factions in eternal conflict
- **Love Story**: Romance across tiers (village girl → queen)
- **Revenge**: Betrayal and retribution across generations
- **Discovery**: Scientific/magical breakthrough chain
- **Apocalypse**: Crisis → survival → rebuilding

---

### Event Log and History

**Tiered History**:

**Tile Tier**: Last 1,000 events (individual actions)
**Chunk Tier**: Last 10,000 events (agent activities)
**Zone Tier**: Last 100,000 events (village happenings)
**Region Tier**: Last 1M events (settlement milestones)
**Planet Tier**: Last 10M events (national history)
**System Tier**: Last 100M events (interplanetary)
**Sector Tier**: Summary of eras
**Galaxy Tier**: Timeline of civilization

**Example History Panel**:
```
┌─────────────────────────────────────────────────────────────┐
│ Civilization History: Moonwhisper Dynasty                   │
├─────────────────────────────────────────────────────────────┤
│ Era 1: Village Founding (Year 980-1,200)                    │
│ • Moonhaven founded by Kael I                               │
│ • Population grew from 12 to 450                            │
│ • First temple built                                        │
│ • Bandit conflict resolved                                  │
│ [View 2,450 detailed events]                                │
│                                                              │
│ Era 2: Kingdom Formation (Year 1,200-2,400)                 │
│ • Kingdom of Lunara established                             │
│ • 12 regions united under Moonwhisper rule                  │
│ • First university founded                                  │
│ • Gunpowder discovered                                      │
│ [View 45,000 detailed events]                               │
│                                                              │
│ Era 3: Age of Exploration (Year 2,400-5,000)                │
│ • FTL travel invented                                       │
│ • Lunara System colonized (4 planets)                       │
│ • First contact with Verdant aliens                         │
│ [View 1.2M detailed events]                                 │
│                                                              │
│ ... (scroll to see 25 eras spanning 24,020 years)           │
└─────────────────────────────────────────────────────────────┘
```

**Navigation**:
- Click era → see major events
- Click event → zoom to that moment in time (if saved)
- Search for keywords, characters, locations

---

## Story Hooks and Narrative Emergence

**Goal**: Generate compelling narratives from simulation, not scripted events.

---

### How Stories Emerge

**Bottom-Up Narrative**:
1. **Simulation runs** (agents act, systems process)
2. **Events occur** (marriage, battle, discovery)
3. **Event detector analyzes** (interesting? historically significant?)
4. **Story arc tracker connects** (part of dynasty saga? resolves old event?)
5. **Narrative generator surfaces** (create alert, history entry, achievement)

**No Scripted Content**:
- No quest designers
- No written dialogue trees
- No predetermined plot beats

**Everything is emergent**:
- Relationships form organically
- Rivalries develop from conflicts
- Love stories emerge from social systems
- Betrayals happen when agents' goals misalign
- Redemption arcs occur when exiled dynasties return

---

### Dynasty Tracking

Per [02-SOUL-AGENTS.md](./02-SOUL-AGENTS.md), **soul agents persist across eras**.

**Dynasty System**:
```typescript
interface Dynasty {
  name: string;                    // "Moonwhisper"
  founder: SoulAgent;              // Kael I
  founderYear: number;             // 980
  currentHeir: SoulAgent | null;   // Kael XX (or extinct)

  // Family tree
  members: SoulAgent[];            // All descendants
  notableAncestors: SoulAgent[];   // Historical figures

  // Legacy
  achievements: Achievement[];     // Founded cities, won wars
  artifacts: Item[];               // Heirlooms, legendary weapons
  territory: Region[];             // Lands ruled

  // Story arcs
  arcs: StoryArc[];                // Rise, fall, redemption
  rivals: Dynasty[];               // Enemy bloodlines
  allies: Dynasty[];               // Friendly bloodlines
}
```

**Example Dynasty View**:
```
┌─────────────────────────────────────────────────────────────┐
│ Dynasty: Moonwhisper                                         │
├─────────────────────────────────────────────────────────────┤
│ Founded: Year 980 by Kael I (soul agent ⭐️)                 │
│ Current Year: 5,420                                          │
│ Duration: 4,440 years (142 generations)                      │
│ Status: Thriving (12M citizens across 450 systems)          │
│                                                              │
│ Notable Ancestors:                                           │
│ • Kael I (980-1,042): Founded Moonhaven, legendary warrior  │
│ • Aria III (1,000-1,068): First queen, united 12 regions    │
│ • Theron V (1,850-1,920): Defeated Shadowlands, expanded    │
│ • Lyra IX (5,380-present): Empress, married rival dynasty   │
│                                                              │
│ Achievements:                                                │
│ • Founded 24 cities                                          │
│ • Won 8 major wars                                           │
│ • Discovered FTL travel                                      │
│ • United 3 alien species                                     │
│                                                              │
│ Legendary Artifacts:                                         │
│ • Moonblade (sword wielded by Kael I, still exists)         │
│ • Crown of Lunara (worn by 42 monarchs)                     │
│ • Treaty of Stars (first alien peace accord)                │
│                                                              │
│ Rival Dynasties:                                             │
│ • Shadowkin: 800-year war, ended Year 5,420 (marriage)      │
│ • Ironborn: Trade rivals, uneasy peace                      │
│                                                              │
│ [View Family Tree] [View Timeline] [View Territories]       │
└─────────────────────────────────────────────────────────────┘
```

---

### Achievement and Milestone System

**Achievements** mark major accomplishments.

**Categories**:

**1. Founding Achievements**:
- Founded first village
- Founded first city
- Founded first nation
- Colonized first planet
- Established first galactic empire

**2. Military Achievements**:
- Won first battle
- Conquered rival nation
- United warring factions
- Defeated alien invasion
- Achieved galactic peace

**3. Scientific Achievements**:
- Discovered agriculture
- Invented writing
- Discovered gunpowder
- Invented FTL travel
- Unlocked ascension tech

**4. Cultural Achievements**:
- Built first temple
- Created first university
- Unified multiple species
- Achieved post-scarcity economy
- Transcended physical reality

**5. Dynasty Achievements**:
- 100-year dynasty
- 1,000-year dynasty
- 10,000-year dynasty
- Dynasty survived extinction event
- Dynasty reunited after exile

**Example Achievement Popup**:
```
🏆 ACHIEVEMENT UNLOCKED

"Eternal Dynasty"

Your Moonwhisper dynasty has survived for 10,000 years,
spanning 320 generations from medieval village to galactic
empire.

Bonus: +10% loyalty for all citizens with Moonwhisper bloodline.

[View Dynasty History] [Continue]
```

---

### Player Journals and Codex

**Auto-Generated Codex**:

Game maintains **living encyclopedia** of your civilization.

**Codex Categories**:

**1. Characters** (Soul Agents):
```
Kael I Moonwhisper (Soul Agent ⭐️)
Born: Year 980, Moonhaven
Died: Year 1,042 (age 62, natural causes)

Biography:
Kael I founded Moonhaven village with 11 other settlers.
A skilled warrior and diplomat, he defeated bandit raids
and established peace with neighboring villages.

Legacy:
- Founded Moonhaven (pop. 12 → 450 during his life)
- Forged the Moonblade (legendary artifact)
- Father of 3 children (Kael II, Aria, Theron)
- Ancestor to Moonwhisper dynasty (10,000+ descendants)

Notable Events:
- Year 1,005: Married Lyra Brightoak
- Year 1,010: Defeated bandit king in single combat
- Year 1,024: Crowned Lord of Moonwood Region
```

**2. Locations**:
```
Moonhaven
Founded: Year 980 by Kael I
Current Status: Capital city (pop. 2.4M)

History:
- Year 980-1,200: Small village (pop. 450)
- Year 1,200-2,400: Regional capital (pop. 12K)
- Year 2,400-present: Planetary capital, later system capital

Landmarks:
- Original Town Hall (preserved as museum)
- Temple of the First Light (built Year 1,020)
- Kael I Memorial (statue in central square)
- FTL Research Institute (where warp drive invented)
```

**3. Events**:
```
The Battle of Darkwood (Year 1,024)

Context:
Bandit king Malachar threatened Moonwood Region with
army of 200 raiders. Lord Kael I assembled militia of
50 villagers to defend.

Battle:
Despite being outnumbered 4:1, Kael's tactical brilliance
led to decisive victory. Kael personally defeated Malachar
in single combat.

Outcome:
- Bandits scattered, never returned
- Moonwood established as safe region
- Kael's reputation soared, leading to kingdom formation

Legacy:
Commemorated annually as "Victory Day" for 4,000+ years.
Military academy teaches Kael's tactics.
```

**4. Technologies**:
```
FTL Travel (Discovered Year 2,450)

Researchers:
Lead scientist: Dr. Aria Starwind (descendant of Aria III)
Team: 45 scientists at FTL Research Institute, Moonhaven

Impact:
- Enabled colonization of Lunara System
- Led to first contact with alien civilizations
- Transformed regional power into galactic empire

Timeline:
- Year 2,400: Theoretical foundation laid
- Year 2,425: First successful warp bubble test
- Year 2,450: First crewed FTL flight to Mars
- Year 2,460: Commercial FTL travel available
```

**Player Journals**:

Players can **write notes** attached to any codex entry.

```
Kael I Moonwhisper

[Your Note, Year 1,024]:
"This is where it all began. I controlled Kael directly for
 his entire life. Watching him grow from young warrior to
 lord of the region was incredible. I can't believe his
 descendants now rule a galactic empire."

[Your Note, Year 5,420]:
"Just watched his descendant Lyra marry into the rival
 dynasty. Kael would be proud—he always valued peace over
 conquest. The Moonblade she carried at the wedding is the
 same sword he forged 4,440 years ago."
```

---

## Seamless Zoom Transitions

**Goal**: Zooming between tiers feels continuous and natural.

---

### Zoom Animation

**Visual Transition**:
1. **Camera pull-back** (if zooming out) or **dive-in** (if zooming in)
2. **UI elements morph** (tile view → chunk view → zone view)
3. **Map abstracts** (detailed sprites → icons → territory blobs)
4. **Time scale adjusts** (1s/tick → 1min/tick → 1day/tick)

**Duration**: 1-2 seconds per tier jump

**Example (Zooming Out)**:
```
Tile View:
  [Detailed isometric, agent animations, grass textures]
  → Camera pulls back over 0.5 seconds
  → Grass textures fade to green blend

Chunk View:
  [Icons for agents, building footprints, simplified terrain]
  → Camera pulls back over 0.5 seconds
  → Agents become dots

Zone View:
  [Districts as colored zones, settlement icons, roads]
  → Camera pulls back over 0.5 seconds
  → Districts become settlement icons

Region View:
  [Settlements as icons, territory borders, geographic features]
```

**Smooth Morphing**:
- Agent sprite → agent icon → population number
- Building 3D model → building footprint → district color
- Individual trees → forest texture → terrain icon

---

### Loading and Generation on Zoom-In

**Challenge**: Can't keep all tiles loaded for entire galaxy.

**Solution**: **Lazy loading** + **procedural generation**

**When Zooming In**:
1. **Check cache**: Is chunk already loaded?
2. **If cached**: Display immediately
3. **If not cached**:
   - **Generate terrain** (procedural from seed)
   - **Spawn agents** (from saved positions)
   - **Recreate buildings** (from blueprints)
   - **Resume simulation** (agents wake up)

**Example**:
```
You're at Planet tier, zoom in to specific village.

Loading Village: Oakdale (Region: Moonwood)
→ Generating terrain from seed: 0x4A3F2E1D
→ Loading 245 agents from saved state
→ Reconstructing 48 buildings
→ Resuming agent AI (headless → active)
→ Complete (1.2 seconds)

Now displaying Oakdale at Zone tier.
```

**Headless Simulation**:
Per [02-SOUL-AGENTS.md](./02-SOUL-AGENTS.md):
- When zoomed out, agents run in **headless mode** (simplified AI)
- When zoomed in, agents **awaken** to full detail
- State remains consistent (agent positions, stats, relationships)

---

### Summarization on Zoom-Out

**Challenge**: Can't show tile-level detail at galaxy scale.

**Solution**: **Aggregate and summarize**

**When Zooming Out**:
1. **Aggregate state** (256 tiles → 1 chunk summary)
2. **Compress events** (1,000 individual actions → "Village grew by 12 pop")
3. **Transition agents** (active AI → headless AI)
4. **Unload detail** (free memory)

**Example**:
```
You zoom out from Chunk tier to Zone tier.

Summarizing Moonhaven:
→ 12 agents active → aggregate to "12 pop, all healthy"
→ 1,450 events in last 10 minutes → summarize to:
  • 24 berries harvested
  • 1 basket crafted
  • Trade caravan arrived
→ Transition agents to headless mode
→ Unload tile textures

Now displaying Moonhaven as single settlement icon.
```

**No Data Loss**:
- **Aggregate state** is saved
- **Detailed state** is compressed, not deleted
- Can zoom back in to restore detail

---

### What Persists vs. Regenerates

**Always Persists** (saved to disk):
- Soul agent stats, positions, relationships
- Building blueprints and positions
- Resource stockpiles
- Political borders and treaties
- Technology unlocks
- Historical events
- Dynasty lineages

**Regenerated on Zoom-In** (procedural):
- Terrain textures (from seed)
- Vegetation placement (from biome rules)
- Weather particles (current state only)
- Agent animations (from current action)
- Pathfinding visualizations

**Example**:
```
You save and quit at Galaxy tier.

Next session, you load save:
→ Galaxy map loads instantly (only high-level state)
→ You zoom in to Moonhaven village
→ Game regenerates:
  • Grass/stone textures (procedural from seed)
  • Tree positions (deterministic from biome + seed)
  • Weather (current: raining, from weather system state)
→ Game loads from save:
  • 245 agents with exact positions
  • 48 buildings with contents
  • Stockpile: 450 food, 120 wood
  • All relationships and memories

Result: Village looks identical to when you saved.
```

---

## Player Soul Agent

**Optional**: Player **is** a soul agent character.

---

### Avatar Mode

**What It Is**:
You play as a specific soul agent across their lifetime (and possibly across lifetimes via cloning/resurrection).

**Gameplay**:
- **Tile/Chunk tier**: Direct control (like RimWorld)
- **Zone/Region tier**: You're a notable character (lord, mayor, hero)
- **Planet tier**: You're a national leader (king, president, emperor)
- **System tier**: You're an immortal/cloned leader
- **Sector/Galaxy tier**: You're an observer (or ascended being)

**Lifecycle**:
```
Year 980: Born as Kael I in Moonhaven
  → You control Kael directly (Tile tier)

Year 1,024: Become Lord of Moonwood
  → You control Kael, but also manage region (Region tier)

Year 1,042: Kael I dies (age 62)
  → TRANSITION: Play as Kael II (your son)

Year 1,068: Kael II dies
  → TRANSITION: Play as Kael III (grandson)

... continues for generations

Year 2,450: Technology unlocked: Genetic Cloning
  → Your current character can be cloned on death
  → Effective immortality

Year 5,000: Your clone (Kael IX) rules empire
  → You've been same character (genetically) for 2,550 years

Year 10,000: Optional: Upload consciousness to AI
  → You become immortal digital being

Year 25,000: Optional: Transcend with civilization
  → You ascend to higher dimension
```

---

### Dynasty Mode

**What It Is**:
You guide a family across generations, but switch characters each lifetime.

**Gameplay**:
- Start as founder (Kael I)
- Choose heir when character ages
- Switch to heir on death
- Continue dynasty across centuries

**Heir Selection**:
```
Lord Kael I (Age 58)

Your health is declining. Choose an heir:

1. Kael II (Son, Age 32)
   Traits: Brave, Strong, Poor Diplomat
   Skills: Combat 8, Leadership 5, Diplomacy 2
   → Will focus on military expansion

2. Aria (Daughter, Age 28)
   Traits: Intelligent, Charismatic, Weak
   Skills: Diplomacy 9, Scholarship 7, Combat 3
   → Will focus on culture and alliances

3. Theron (Adopted Son, Age 25)
   Traits: Just, Cunning, Ambitious
   Skills: Leadership 7, Diplomacy 6, Intrigue 8
   → Will focus on political maneuvering

[Select Heir] [Wait and Decide Later]
```

**After Death**:
```
Year 1,042: Lord Kael I has died.

His reign: 62 years (980-1,042)
Achievements:
- Founded Moonhaven
- United Moonwood Region
- Defeated bandit king

You now play as Kael II (age 32).
Your father's legacy is in your hands.

[View Obituary] [Continue as Kael II]
```

---

### Observer Mode (No Personal Avatar)

**What It Is**:
You watch civilizations evolve without direct character control.

**Gameplay**:
- No personal avatar
- Set policies and priorities
- Advisors execute decisions
- Focus on macro-level strategy

**When to Use**:
- Prefer grand strategy over character roleplay
- Want to watch civilizations evolve naturally
- Focus on experimentation (different policies, tech paths)

**Example**:
```
You observe the Kingdom of Lunara (no personal character).

Year 1,024:
- Kingdom has 12 regions, 125K pop
- You set policy: "Focus on science"
- LLM governors execute: Build universities, recruit scholars

Year 1,050:
- Gunpowder discovered (due to science focus)
- You set policy: "Military expansion"
- Governors recruit armies, train musketeers

Year 1,100:
- Kingdom conquers 4 neighboring regions
- You set policy: "Economic growth"
- Governors build trade routes, markets

You guide civilization indirectly, never embodying a character.
```

---

### God Mode (Influence Without Control)

**What It Is**:
You have supernatural influence, but agents have free will.

**Gameplay**:
- Whisper suggestions to agents
- Bless/curse characters
- Cause miracles (per [Divinity system](../../packages/divinity/README.md))
- Watch how world reacts

**Example**:
```
You are a deity watching Moonhaven.

Year 1,010: You bless Kael I before battle
  → Kael gains +2 Combat skill temporarily
  → Kael defeats bandit king (would have lost without blessing)

Year 1,024: You whisper to Aria III: "Marry the rival lord"
  → Aria considers (her diplomacy skill + your influence)
  → Aria agrees, peace treaty signed
  → You gain Faith from grateful citizens

Year 1,050: You curse the Shadowlands with drought
  → Crops fail, famine spreads
  → Shadowlands weakens, Lunara expands

Year 1,100: You perform miracle: Heal plague in Moonhaven
  → 450 villagers saved
  → Faith in you skyrockets
  → Temple built in your honor

You influence, but don't control. Agents still have agency.
```

---

## UI Component Reference

Reusable UI components across tiers.

---

### Minimap

**Purpose**: Show broader context when zoomed in.

**Tiers**: Tile, Chunk, Zone, Region

**Features**:
- Current view highlighted (red box)
- Unexplored areas (fog of war)
- Points of interest (soul agents ⭐️, buildings 🏛️, conflicts ⚔️)
- Click to pan camera

**Example**:
```
┌──────────────────┐
│ Minimap (Zone)   │
├──────────────────┤
│ ░░░░░░░░░░░░░░░░ │ ← Unexplored
│ ░░▓▓▓▓▓▓▓▓░░░░░░ │
│ ░░▓🏛️🏘️🏘️▓░░░░░░ │ ← Settlements
│ ░░▓🏘️🔴🏘️▓░░░░░░ │ ← 🔴 Your location
│ ░░▓▓▓▓▓▓▓▓░░░░░░ │
│ ░░░░░░░░⚔️░░░░░░ │ ← ⚔️ Combat
│ ░░░░░░░░░░░░⭐️░░ │ ← ⭐️ Soul agent
│ ░░░░░░░░░░░░░░░░ │
└──────────────────┘
```

---

### Timeline Scrubber

**Purpose**: Navigate through time (especially for time travel/replay).

**Tiers**: All (when viewing history)

**Features**:
- Drag to scrub through time
- Markers for major events
- Current time indicator
- Fast-forward/rewind controls

**Example**:
```
┌─────────────────────────────────────────────────────────────┐
│ Timeline: Year 980 → 1,100 (120 years)                      │
├─────────────────────────────────────────────────────────────┤
│ ├──▪️─────▪️──────▪️─────────🔴────────▪️────────────────┤   │
│ 980   1000    1024       1050      1075              1100  │
│  │      │       │          │         │                      │
│  │      │       │          └── Battle of Darkwood           │
│  │      │       └── Kingdom founded                         │
│  │      └── Kael I married                                  │
│  └── Moonhaven founded                                      │
│                                                              │
│ [◀◀ -10yr] [◀ -1yr] [▶ +1yr] [▶▶ +10yr] [⏸️ Pause]         │
└─────────────────────────────────────────────────────────────┘
```

---

### Notification Feed

**Purpose**: Show recent events without interrupting gameplay.

**Tiers**: All

**Features**:
- Scroll through recent events
- Color-coded by priority (red = critical, yellow = high, white = medium)
- Click to zoom to event
- Dismiss or pin

**Example**:
```
┌─────────────────────────────────────┐
│ Notifications (Last 10 minutes)    │
├─────────────────────────────────────┤
│ 🔴 WAR declared by Shadowlands!     │
│    [Zoom to War Council]            │
│                                      │
│ 🟡 Gunpowder research complete      │
│    [View Tech Tree]                 │
│                                      │
│ ⭐️ Soul Agent Aria III crowned     │
│    [Zoom to Coronation]             │
│                                      │
│ ⚪ Trade caravan arrived            │
│    [View Goods]                     │
│                                      │
│ ⚪ 12 berries harvested              │
│    (Dismissed)                       │
└─────────────────────────────────────┘
```

---

### Dynasty Tree

**Purpose**: Visualize family lineage.

**Tiers**: Region, Planet, System (when tracking dynasties)

**Features**:
- Family tree graph
- Soul agents highlighted
- Click character for bio
- Show relationships (marriages, rivalries)

**Example**:
```
┌─────────────────────────────────────────────────────────────┐
│ Moonwhisper Dynasty (142 Generations)                       │
├─────────────────────────────────────────────────────────────┤
│                     Kael I ⭐️                               │
│                       │                                      │
│         ┌─────────────┼─────────────┐                       │
│       Kael II      Aria I ⭐️    Theron I                    │
│         │                                                    │
│       Kael III                                               │
│         │                                                    │
│    ... (135 generations) ...                                │
│         │                                                    │
│      Lyra IX ⭐️ (Current Empress)                          │
│                                                              │
│ Notable Members: 23 soul agents ⭐️ across 4,440 years       │
│ [Expand Tree] [Filter by Era] [Show All Relationships]      │
└─────────────────────────────────────────────────────────────┘
```

---

### Stat Panels

**Purpose**: Show aggregated statistics for current tier.

**Tiers**: All

**Features**:
- Population
- Resources (food, materials, money)
- Military strength
- Technology level
- Happiness/stability

**Example (Planet Tier)**:
```
┌──────────────────────────────────────┐
│ Kingdom of Lunara - Statistics       │
├──────────────────────────────────────┤
│ Population: 125,000 (+1,200/year)    │
│ Territory: 12 regions                │
│                                       │
│ Economy:                              │
│ • Treasury: 50,000 gold              │
│ • Income: +2,000/month               │
│ • Expenses: -1,500/month             │
│ • Net: +500/month                    │
│                                       │
│ Military:                             │
│ • Total Troops: 15,000               │
│ • Active Wars: 1 (vs Shadowlands)    │
│ • Morale: High (85%)                 │
│                                       │
│ Technology:                           │
│ • Era: Medieval                      │
│ • Researching: Gunpowder (60%)       │
│ • Next: Advanced Shipbuilding        │
│                                       │
│ Stability: 78% (Good)                │
└──────────────────────────────────────┘
```

---

### Quick Actions Bar

**Purpose**: Context-sensitive actions for current tier.

**Tiers**: All

**Features**:
- Changes based on tier
- Most common actions
- Keyboard shortcuts

**Example (Region Tier)**:
```
┌─────────────────────────────────────────────────────────────┐
│ [🏰 Build] [⚔️ Raise Army] [🤝 Diplomacy] [📜 Policies]     │
│ [🔬 Research] [💰 Economy] [⚙️ Settings] [↗️ Zoom Out]      │
└─────────────────────────────────────────────────────────────┘
```

**Example (Galaxy Tier)**:
```
┌─────────────────────────────────────────────────────────────┐
│ [▶️ Fast-Forward] [⏸️ Pause] [🔍 Find Event] [↙️ Zoom In]    │
│ [📖 History] [🏛️ Civilizations] [⭐️ Soul Agents]            │
└─────────────────────────────────────────────────────────────┘
```

---

## Technical Implementation

**Key Systems**:

---

### Camera System

**Component**: `ZoomCamera` (new)

```typescript
interface ZoomCamera {
  type: 'zoom_camera';

  // Current state
  current_tier: SpatialTier;  // TILE, CHUNK, ZONE, ..., GALAXY
  target_position: Vec3;      // Center of view
  zoom_level: number;         // Smooth zoom within tier

  // Transition
  transitioning: boolean;
  transition_progress: number; // 0.0 → 1.0
  from_tier: SpatialTier;
  to_tier: SpatialTier;
}

// System: ZoomCameraSystem
class ZoomCameraSystem extends System {
  update(world: World): void {
    const camera = this.getSingletonComponent('zoom_camera');

    if (camera.transitioning) {
      camera.transition_progress += 0.05; // 20 frames = 1 second

      if (camera.transition_progress >= 1.0) {
        // Transition complete
        camera.current_tier = camera.to_tier;
        camera.transitioning = false;

        // Trigger load/unload
        this.onTierChanged(world, camera.to_tier);
      }
    }
  }

  private onTierChanged(world: World, new_tier: SpatialTier): void {
    if (new_tier <= SpatialTier.CHUNK) {
      // Zoom in: Load detailed state
      this.loadDetailedChunk(world);
    } else {
      // Zoom out: Unload detail, summarize
      this.summarizeAndUnload(world);
    }
  }
}
```

---

### Tier-Specific Renderers

**System**: `TieredRenderer` (new)

```typescript
class TieredRenderer extends System {
  renderTile(world: World): void {
    // Full sprite rendering, animations, particles
    for (const entity of this.visibleEntities) {
      this.renderSprite(entity);
      this.renderHealthBar(entity);
      this.renderThoughtBubble(entity);
    }
  }

  renderChunk(world: World): void {
    // Icons for agents, building footprints
    for (const entity of this.visibleEntities) {
      this.renderIcon(entity);
    }
  }

  renderZone(world: World): void {
    // District colors, settlement icons
    for (const settlement of this.settlements) {
      this.renderSettlementIcon(settlement);
    }
  }

  renderRegion(world: World): void {
    // Territory blobs, borders, roads
    this.renderTerritoryMap();
  }

  // ... up to renderGalaxy()
}
```

---

### Event Interest Scoring

**System**: `InterestingEventDetector` (new)

```typescript
class InterestingEventDetector extends System {
  update(world: World): void {
    const recentEvents = world.eventLog.getRecent(100);

    for (const event of recentEvents) {
      const score = this.scoreEvent(event, world);

      if (score >= 100) {
        // Interesting event!
        this.notifyPlayer(world, event, score);

        // Track for story arcs
        this.storyArcTracker.addEvent(event);
      }
    }
  }

  private scoreEvent(event: Event, world: World): number {
    let score = 0;

    // Soul agent involvement
    if (event.involvesSoulAgent) {
      score += 50;
      if (event.involvesPlayerDynasty) score += 25;
    }

    // Historical significance
    if (event.firstOfType) score += 30;
    if (event.resolvesStoryArc) score += 40;

    // Dramatic stakes
    score += Math.min(event.populationImpact * 0.1, 50);

    // Rarity
    const frequency = this.eventFrequencyTracker.get(event.type);
    score += (1.0 / frequency) * 10;

    return score;
  }
}
```

---

### Story Arc Tracker

**System**: `StoryArcTracker` (new)

```typescript
interface StoryArc {
  id: string;
  type: 'dynasty_saga' | 'rivalry' | 'love_story' | 'revenge' | 'discovery';

  // Participants
  characters: SoulAgent[];
  dynasties: Dynasty[];

  // Timeline
  start_year: number;
  events: Event[];
  current_phase: string; // "rise", "fall", "redemption", etc.

  // Narrative
  title: string;           // "The Moonwhisper Dynasty"
  summary: string;         // Auto-generated
  player_notes: string[];  // Player-written
}

class StoryArcTracker extends System {
  private arcs: Map<string, StoryArc> = new Map();

  update(world: World): void {
    // Check for arc progressions
    for (const arc of this.arcs.values()) {
      this.updateArc(arc, world);
    }

    // Detect new arcs
    this.detectNewArcs(world);
  }

  private detectNewArcs(world: World): void {
    // Dynasty arc: When soul agent founds settlement
    const newSettlements = world.query()
      .with(CT.Settlement)
      .where(s => s.age === 0)
      .executeEntities();

    for (const settlement of newSettlements) {
      const founder = settlement.getComponent('founder_soul_agent');
      if (founder) {
        this.createDynastyArc(founder, settlement);
      }
    }

    // Rivalry arc: When two dynasties go to war
    const newWars = world.eventLog.getEventsByType('war_declared');
    for (const war of newWars) {
      if (war.dynasty_vs_dynasty) {
        this.createRivalryArc(war.attacker, war.defender);
      }
    }
  }
}
```

---

### Headless Agent System

**System**: `HeadlessAgentSystem` (new, per [02-SOUL-AGENTS.md](./02-SOUL-AGENTS.md))

```typescript
class HeadlessAgentSystem extends System {
  update(world: World): void {
    const camera = world.getSingletonComponent('zoom_camera');

    if (camera.current_tier >= SpatialTier.ZONE) {
      // Zoomed out: Run headless simulation
      this.runHeadless(world);
    } else {
      // Zoomed in: Run full AI
      this.runFullAI(world);
    }
  }

  private runHeadless(world: World): void {
    // Simplified AI: Only major actions
    for (const agent of this.agents) {
      // Skip full behavior tree
      // Just update: position, stats, relationships

      const needs = agent.getComponent('needs');
      if (needs.hunger < 0.3) {
        // Abstract: Agent eats (no pathfinding, just consume food)
        needs.hunger = 1.0;
        this.consumeFood(agent, 1);
      }

      if (needs.rest < 0.3) {
        // Abstract: Agent sleeps (instant)
        needs.rest = 1.0;
      }

      // Work: Contribute to settlement resources
      const settlement = agent.getComponent('belongs_to_settlement');
      settlement.resources.food += agent.productivity * 0.1;
    }
  }

  private runFullAI(world: World): void {
    // Full behavior tree, pathfinding, social AI
    // (Existing BehaviorSystem, SteeringSystem, etc.)
  }
}
```

---

### Dynasty Manager

**System**: `DynastyManager` (new)

```typescript
class DynastyManager extends System {
  private dynasties: Map<string, Dynasty> = new Map();

  update(world: World): void {
    // Track soul agent births
    const births = world.eventLog.getEventsByType('soul_agent_born');
    for (const birth of births) {
      this.addToDynasty(birth.agent);
    }

    // Track deaths
    const deaths = world.eventLog.getEventsByType('soul_agent_died');
    for (const death of deaths) {
      this.handleDeath(death.agent, world);
    }

    // Update dynasty stats
    for (const dynasty of this.dynasties.values()) {
      this.updateDynastyStats(dynasty, world);
    }
  }

  private handleDeath(agent: SoulAgent, world: World): void {
    const dynasty = this.getDynasty(agent.dynasty_id);

    // Check for heirs
    const heirs = agent.children.filter(c => c.age >= 16);

    if (heirs.length > 0) {
      // Dynasty continues
      dynasty.currentHeir = heirs[0]; // Eldest child

      // Notify player if this was player character
      if (agent.isPlayerControlled) {
        this.promptHeirSelection(heirs);
      }
    } else {
      // No heirs: Dynasty extinct (unless cloning available)
      if (this.hasCloningTech(world)) {
        this.offerCloneRevival(agent);
      } else {
        dynasty.currentHeir = null;
        dynasty.status = 'extinct';

        world.emit({
          type: 'dynasty_extinct',
          dynasty: dynasty,
          last_member: agent
        });
      }
    }
  }
}
```

---

### Tier Time Scaling

**System**: `TierTimeScaler` (integrates with [03-TIME-SCALING.md](./03-TIME-SCALING.md))

```typescript
class TierTimeScaler extends System {
  update(world: World): void {
    const camera = world.getSingletonComponent('zoom_camera');
    const timeEntity = world.getSingletonEntity('time');

    // Adjust tick duration based on tier
    switch (camera.current_tier) {
      case SpatialTier.TILE:
      case SpatialTier.CHUNK:
        timeEntity.seconds_per_tick = 1.0; // Real-time
        break;

      case SpatialTier.ZONE:
        timeEntity.seconds_per_tick = 10.0; // 10s/tick
        break;

      case SpatialTier.REGION:
        timeEntity.seconds_per_tick = 60.0; // 1min/tick
        break;

      case SpatialTier.PLANET:
        timeEntity.seconds_per_tick = 3600.0; // 1hr/tick
        break;

      case SpatialTier.SYSTEM:
        timeEntity.seconds_per_tick = 86400.0; // 1day/tick
        break;

      case SpatialTier.SECTOR:
        timeEntity.seconds_per_tick = 604800.0; // 1week/tick
        break;

      case SpatialTier.GALAXY:
        // Player-controlled fast-forward
        // Can go up to 10,000 years/tick
        timeEntity.seconds_per_tick = this.playerTimeScale;
        break;
    }
  }
}
```

---

## Integration with Previous Specs

### Spatial Hierarchy ([04-SPATIAL-HIERARCHY.md](./04-SPATIAL-HIERARCHY.md))

**All 8 tiers represented in UI**:
- Each tier has dedicated rendering mode
- Camera transitions smoothly between tiers
- Minimap shows next tier up

### Time Scaling ([03-TIME-SCALING.md](./03-TIME-SCALING.md))

**Time adjusts per tier**:
- Tile/Chunk: Real-time (1s/tick)
- Zone: 10s/tick
- Region: 1min/tick
- Planet: 1hr/tick
- System: 1day/tick
- Sector: 1week/tick
- Galaxy: Variable (up to 10,000 years/tick)

### Soul Agents ([02-SOUL-AGENTS.md](./02-SOUL-AGENTS.md))

**Player can embody soul agents**:
- Direct control at Tile tier
- Character management at Region tier
- Dynasty succession at Planet tier
- Cloning/immortality at System tier
- Observer mode at Galaxy tier

### LLM Governors ([11-LLM-GOVERNORS.md](./11-LLM-GOVERNORS.md))

**AI advisors execute player strategy**:
- Zone: Mayor manages village
- Region: Lord's council
- Planet: National ministers
- System/Sector/Galaxy: Federation council

Player provides **strategic direction**, governors **execute tactics**.

### Political Hierarchy ([06-POLITICAL-HIERARCHY.md](./06-POLITICAL-HIERARCHY.md))

**Player navigates political structures**:
- Village → City → Province → Nation → Empire → Federation → Council
- Each tier has diplomatic options
- Treaties, alliances, wars

### Ship Hierarchy ([05-SHIP-HIERARCHY.md](./05-SHIP-HIERARCHY.md))

**Fleet management at System+ tiers**:
- System tier: Manage fleets (10-100 ships)
- Sector tier: Manage armadas (100-1,000 ships)
- Galaxy tier: Manage navies (entire civilization's space forces)

### Trade Hierarchy ([07-TRADE-HIERARCHY.md](./07-TRADE-HIERARCHY.md))

**Economic management per tier**:
- Zone: Village stockpiles
- Region: Trade caravans between settlements
- Planet: National trade routes
- System: Interplanetary shipping
- Sector/Galaxy: Galactic trade networks

---

## Conclusion

The player experience spans **8 spatial tiers, 10,000+ years, and 4 embodiment modes** (Avatar, Dynasty, Observer, God). The game provides:

1. **Fractal Engagement**: Meaningful gameplay at every scale
2. **Seamless Transitions**: Smooth zoom between tiers
3. **Persistent Stories**: Soul agents and dynasties across eras
4. **Emergent Narratives**: Algorithms detect and surface interesting events
5. **Variable Control**: Direct, advisory, strategic, or observer modes

**From controlling a single agent** in a medieval village **to watching galactic civilizations transcend reality**, the player journey is continuous, coherent, and deeply narrative.

**Next Steps**:
- Implement `ZoomCameraSystem` and tier transitions
- Build `InterestingEventDetector` and `StoryArcTracker`
- Create tier-specific renderers
- Design UI panels for each tier
- Integrate with LLM governors for advisory mode
- Test full zoom workflow (Tile → Galaxy and back)

---

**End of Spec 12: Player Experience**
