# Divine Systems UI Specification

## Overview

This document specifies the user interface for divine communication and angel delegation systems. The UI needs to balance immersion (you're playing God) with practical management tools (handling 50+ agents praying).

**Design Philosophy:**
- **Immersive first**: Use spiritual/mythological language and aesthetics
- **Information density**: Show critical info at a glance
- **Progressive disclosure**: Simple for early game, complex tools emerge as needed
- **Minimal interruption**: Don't break flow of watching the simulation
- **Contextual**: Show relevant info based on game state

---

## Table of Contents

1. [Main Divine Interface Layout](#main-divine-interface-layout)
2. [Prayer Inbox](#prayer-inbox)
3. [Vision Composer](#vision-composer)
4. [Angel Management](#angel-management)
5. [Sacred Geography](#sacred-geography)
6. [Divine Analytics](#divine-analytics)
7. [Interaction Flows](#interaction-flows)
8. [Visual Design System](#visual-design-system)
9. [Responsive & Accessibility](#responsive--accessibility)
10. [Technical Implementation](#technical-implementation)

---

## Main Divine Interface Layout

### Primary View: "The Heavens"

```
┌─────────────────────────────────────────────────────────────────┐
│ 🌟 Divine Realm                    ⚡ Energy: 145/200  Faith: ▓▓▓▓▓░░ 67% │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  [Simulation View - agents moving, living, praying]            │
│                                                                 │
│  ┌──────────────┐                                              │
│  │ 🙏 Prayers   │  ← Floating panel (draggable, collapsible)   │
│  │              │                                               │
│  │ "I'm so      │                                               │
│  │  hungry..."  │                                               │
│  │  - Kira      │                                               │
│  │              │                                               │
│  │ "Where do    │                                               │
│  │  we plant?"  │                                               │
│  │  - Marcus    │                                               │
│  └──────────────┘                                               │
│                                                                 │
│                                     ┌───────────────┐           │
│                                     │ ⚡ Divine Acts │           │
│                                     │               │           │
│                                     │ [Vision]      │           │
│                                     │ [Miracle]     │           │
│                                     │ [Summon Angel]│           │
│                                     └───────────────┘           │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│ 📜 Prayers (3) │ 👼 Angels (2) │ 🗺️ Sacred Sites │ 📊 Insights │
└─────────────────────────────────────────────────────────────────┘
```

**Components:**

1. **Divine Status Bar** (top)
   - Divine Energy: Current/Max with regen rate tooltip
   - Faith Level: Aggregate faith across all agents
   - Quick stats: Active prayers, angels working, prophecies pending

2. **Main Simulation View** (center)
   - Standard game view with agents
   - Praying agents have subtle glow/aura
   - Sacred sites highlighted
   - Agent thoughts/prayers can bubble up

3. **Floating Prayer Notifications** (left side)
   - Mini-cards showing recent prayers
   - Click to expand to full Prayer Inbox
   - Urgency indicated by color/pulsing

4. **Divine Actions Palette** (right side)
   - Quick access to common actions
   - Context-sensitive (shows different options based on selection)

5. **Bottom Tab Bar**
   - Switch between major divine interface sections

---

## Prayer Inbox

### Layout: "The Supplication Chamber"

```
┌─────────────────────────────────────────────────────────────────┐
│ 🙏 Prayers & Supplications                    [×]               │
├─────────────────────────────────────────────────────────────────┤
│ Filter: [All ▾] [Urgent] [Health] [Food] [Guidance] [Thanks]   │
│ Sort: [Time ▾] [Urgency ▾] [Faith ▾]          Search: [____]   │
├──────────────┬──────────────────────────────────────────────────┤
│              │                                                  │
│ Agent List   │  Selected Prayer Details                        │
│              │                                                  │
│ 🔴 Kira      │  From: Kira (Hunter, Age 23)                    │
│   "Hungry"   │  Location: Near Berry Grove (X:45, Y:102)       │
│   2m ago     │  Faith: ▓▓▓▓░░ 73% (Believer)                   │
│              │  Answered: 12/15 (80% success rate)             │
│ 🟠 Marcus    │  Last vision: 3 days ago                        │
│   "Plant?"   │                                                  │
│   5m ago     │  ─────────────────────────                      │
│              │                                                  │
│ 🟢 Aria      │  Prayer (Desperate, Health Domain):             │
│   "Thanks!"  │                                                  │
│   12m ago    │  "Great God, I have searched for food all       │
│              │   morning but found nothing. My stomach aches   │
│ 🟡 Chen      │   and my strength fades. Please, show me where  │
│   "Storm?"   │   I might find berries or mushrooms. I trust    │
│   18m ago    │   in your wisdom."                              │
│              │                                                  │
│ (15 more)    │  ─────────────────────────                      │
│              │                                                  │
│              │  Agent Context:                                 │
│              │  • Health: ▓▓░░░░ 35% ⚠️                        │
│              │  • Food: ▓░░░░░ 15% 🚨                          │
│              │  • Energy: ▓▓▓░░░ 55%                           │
│              │  • Recent memories: "Found rotten berries",     │
│              │    "Saw Marcus catch fish", "Storm approaching" │
│              │                                                  │
│              │  ┌──────────────────────────────────────┐       │
│              │  │ Response Options:                    │       │
│              │  │                                      │       │
│              │  │ [📖 Send Vision]  Cost: ⚡15         │       │
│              │  │ [🎁 Miracle]      Cost: ⚡50         │       │
│              │  │ [👼 Assign Angel] (Guardian: Uriel) │       │
│              │  │ [🤫 Ignore]                          │       │
│              │  │                                      │       │
│              │  │ AI Suggestion: 💡                    │       │
│              │  │ "Vision: Show berries near oak tree │       │
│              │  │  east of her location (high success │       │
│              │  │  chance, she's nearby)"              │       │
│              │  └──────────────────────────────────────┘       │
│              │                                                  │
└──────────────┴──────────────────────────────────────────────────┘
```

**Key Features:**

1. **Prayer Cards** (left panel)
   - Color-coded urgency (red=critical, orange=urgent, yellow=moderate, green=gratitude)
   - Agent name, prayer type, time since prayer
   - Quick preview of prayer text
   - Badge shows if angel is available for this domain

2. **Prayer Details** (right panel)
   - **Agent Info**: Name, role, age, location, faith level, track record
   - **Full Prayer Text**: LLM-generated prayer in agent's voice
   - **Agent Context**: Current needs, recent memories, relationships
   - **Response Options**: Available divine actions with energy costs
   - **AI Suggestion**: Optional hint about effective response

3. **Batch Operations**
   - Select multiple prayers
   - Assign all to an angel
   - Send mass vision (costs more energy)
   - Dismiss all gratitude prayers

4. **Prayer Analytics** (toggle view)
   - Unanswered prayer count
   - Average response time
   - Answer success rate
   - Faith trends

---

## Vision Composer

### Layout: "The Dream Weaver"

When player clicks "Send Vision" from prayer inbox:

```
┌─────────────────────────────────────────────────────────────────┐
│ 📖 Craft Vision for Kira                        ⚡ Cost: 15     │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│ Vision Type: [Guidance ▾]  Clarity: [━━━━━━━━━━] 70%           │
│              Guidance / Warning / Prophecy / Revelation         │
│                                                                 │
│ Domain: [● Survival  ○ Social  ○ Environment  ○ Future]         │
│                                                                 │
│ ┌─────────────────────────────────────────────────────────┐    │
│ │ Message:                                                │    │
│ │                                                         │    │
│ │ [Free text editor with AI assistance]                  │    │
│ │                                                         │    │
│ │ You see a dream of ripe berries growing beneath        │    │
│ │ the old oak tree, the one with the hollow trunk.       │    │
│ │ The sun shines on them from the east.                  │    │
│ │                                                         │    │
│ │                                                         │    │
│ │ ┌─────────────────────────────────────────┐            │    │
│ │ │ 🤖 AI Suggestions:                       │            │    │
│ │ │                                          │            │    │
│ │ │ • "Berry bushes glow with golden light  │            │    │
│ │ │    near the oak tree to the east"       │            │    │
│ │ │                                          │            │    │
│ │ │ • "Follow the morning sun to the ancient│            │    │
│ │ │    oak, where sustenance awaits"        │            │    │
│ │ │                                          │            │    │
│ │ │ • More poetic / More direct / Symbolic  │            │    │
│ │ └─────────────────────────────────────────┘            │    │
│ │                                                         │    │
│ └─────────────────────────────────────────────────────────┘    │
│                                                                 │
│ Delivery: [● During REM Sleep  ○ Meditation  ○ Immediate]      │
│                                                                 │
│ Symbolic: [Toggle] (Harder to interpret but more mysterious)   │
│                                                                 │
│ ┌─────────────────────────────────────────────────────────┐    │
│ │ Preview Impact:                                         │    │
│ │                                                         │    │
│ │ Kira's Faith: 73% → ~78% (+5%)                          │    │
│ │ Success Chance: ████████░░ 82% (berries exist, nearby) │    │
│ │ Believability: ████████░░ 85% (matches prayer topic)   │    │
│ │                                                         │    │
│ │ If successful:                                          │    │
│ │ • Kira will search near oak tree                        │    │
│ │ • Faith increases significantly                         │    │
│ │ • May share vision with others                          │    │
│ │                                                         │    │
│ │ If fails:                                               │    │
│ │ • Faith decreases to ~65%                               │    │
│ │ • Unlikely to pray for 2-3 days                         │    │
│ │ • May breed skepticism                                  │    │
│ └─────────────────────────────────────────────────────────┘    │
│                                                                 │
│ [Cancel]                            [Send Vision] ⚡15          │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Key Features:**

1. **Vision Type Selector**
   - Guidance: Helpful advice (low energy)
   - Warning: Danger alert (medium energy)
   - Prophecy: Future event (high energy, affects multiple agents)
   - Revelation: Deep truth (very high energy, major faith impact)

2. **Clarity Slider**
   - Higher clarity: Easier to interpret, more direct
   - Lower clarity: More mysterious, symbolic, requires interpretation

3. **Message Editor**
   - Free text input for custom visions
   - AI suggestions based on context (prayer content, agent state, world state)
   - Style presets (poetic, direct, symbolic)

4. **Delivery Method**
   - REM Sleep: Delivered during next sleep cycle (delayed but immersive)
   - Meditation: Delivered during next meditation (if agent meditates)
   - Immediate: Delivered right now (higher energy cost, breaks immersion)

5. **Impact Preview**
   - Success probability based on world state
   - Faith impact projection
   - Expected agent behavior
   - Consequences of failure

6. **Quick Templates** (dropdown)
   - Common vision patterns
   - "Show location of [resource]"
   - "Warn about [danger]"
   - "Encourage [behavior]"

---

## Angel Management

### Layout: "The Heavenly Host"

```
┌─────────────────────────────────────────────────────────────────┐
│ 👼 Angels                                         [+ Create]     │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│ ┌──────────────────────────────────────────────────────────┐   │
│ │ GUARDIAN ANGELS                               [Expand ▼] │   │
│ ├──────────────────────────────────────────────────────────┤   │
│ │                                                          │   │
│ │ ┌─────────────────┐  ┌─────────────────┐              │   │
│ │ │ 👼 Uriel        │  │ 👼 Raphael      │              │   │
│ │ │                 │  │                 │              │   │
│ │ │ Level 3         │  │ Level 2         │              │   │
│ │ │ ⚡ 45/60        │  │ ⚡ 30/50        │              │   │
│ │ │                 │  │                 │              │   │
│ │ │ Domain: Survival│  │ Domain: Healing │              │   │
│ │ │ Agents: 5       │  │ Agents: 3       │              │   │
│ │ │                 │  │                 │              │   │
│ │ │ ⚙️ Working      │  │ 🟢 Available    │              │   │
│ │ │ "Guiding Kira   │  │                 │              │   │
│ │ │  to berries"    │  │ Idle            │              │   │
│ │ │                 │  │                 │              │   │
│ │ │ Success: 87%    │  │ Success: 94%    │              │   │
│ │ │ Satisfaction:   │  │ Satisfaction:   │              │   │
│ │ │ ████████░░ 82%  │  │ █████████░ 91%  │              │   │
│ │ │                 │  │                 │              │   │
│ │ │ [View] [Edit]   │  │ [View] [Edit]   │              │   │
│ │ └─────────────────┘  └─────────────────┘              │   │
│ │                                                          │   │
│ └──────────────────────────────────────────────────────────┘   │
│                                                                 │
│ ┌──────────────────────────────────────────────────────────┐   │
│ │ SPECIALIST ANGELS                             [Expand ▼] │   │
│ ├──────────────────────────────────────────────────────────┤   │
│ │                                                          │   │
│ │ ┌─────────────────┐                                     │   │
│ │ │ 🌾 Demeter      │  (Harvest specialist)               │   │
│ │ │ Level 4 ⚡ 70/80│                                      │   │
│ │ │ Domain: Farming │  [View] [Edit]                      │   │
│ │ └─────────────────┘                                     │   │
│ │                                                          │   │
│ └──────────────────────────────────────────────────────────┘   │
│                                                                 │
│ Divine Energy Pool: ⚡ 145/200 (Regen: +5/min)                 │
│ Angels consuming: -3/min                                       │
│ Net regen: +2/min                                              │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Angel Detail View** (click "View" on Uriel):

```
┌─────────────────────────────────────────────────────────────────┐
│ 👼 Uriel - Guardian of Survival                   [×]           │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│ ┌──────────────┬──────────────────────────────────────────┐    │
│ │ Statistics   │ Assigned Agents (5)                      │    │
│ ├──────────────┤                                          │    │
│ │              │ • Kira (73% faith) ⚙️ Active prayer      │    │
│ │ Level: 3     │ • Marcus (45% faith) 💤 Sleeping         │    │
│ │ XP: 245/500  │ • Chen (89% faith) 🙏 Meditating         │    │
│ │              │ • Aria (67% faith)                       │    │
│ │ Expertise:   │ • Thomas (34% faith) ⚠️ Low faith        │    │
│ │ ████████░░   │                                          │    │
│ │ 82%          │ [+ Assign More]  [- Remove Agent]       │    │
│ │              │                                          │    │
│ │ Energy:      │                                          │    │
│ │ ⚡ 45/60     │ Recent Activity:                         │    │
│ │ Using: 3/min │                                          │    │
│ │ Regen: 2/min │ 2m ago: Sent vision to Kira (berries)   │    │
│ │              │ 15m ago: Answered Marcus prayer (fish)  │    │
│ │ Workload:    │ 1h ago: Meditation blessing for Chen    │    │
│ │ ██████░░░░   │                                          │    │
│ │ 60%          │                                          │    │
│ │              │                                          │    │
│ └──────────────┴──────────────────────────────────────────┘    │
│                                                                 │
│ ┌──────────────────────────────────────────────────────────┐   │
│ │ Personality & Behavior                                   │   │
│ ├──────────────────────────────────────────────────────────┤   │
│ │                                                          │   │
│ │ Style: ● Gentle  ○ Stern  ○ Cryptic  ○ Direct           │   │
│ │                                                          │   │
│ │ Autonomy: ━━━━━━━━━░░ 80% (Semi-autonomous)              │   │
│ │                                                          │   │
│ │ Require Approval For:                                    │   │
│ │ [ ] Routine visions (< 20 energy)                        │   │
│ │ [✓] Miracles (> 50 energy)                               │   │
│ │ [✓] Prophecies affecting multiple agents                 │   │
│ │ [ ] Warnings                                             │   │
│ │                                                          │   │
│ │ Specialization Abilities (unlocked at level 3):          │   │
│ │ [✓] Resource Finder: Can "see" nearby resources          │   │
│ │ [✓] Danger Sense: Detects threats to assigned agents     │   │
│ │ [ ] Weather Wisdom (unlock at level 5)                   │   │
│ │                                                          │   │
│ │ Corruption: ░░░░░░░░░░ 0% (Pure)                         │   │
│ │                                                          │   │
│ └──────────────────────────────────────────────────────────┘   │
│                                                                 │
│ ┌──────────────────────────────────────────────────────────┐   │
│ │ Performance Metrics                                      │   │
│ ├──────────────────────────────────────────────────────────┤   │
│ │                                                          │   │
│ │ Prayers Handled: 127                                     │   │
│ │ Success Rate: ████████░░ 87% (+2% this week)             │   │
│ │ Agent Satisfaction: ████████░░ 82%                       │   │
│ │ Faith Generated: +45% total across assigned agents       │   │
│ │                                                          │   │
│ │ Efficiency: ████████░░ 85%                               │   │
│ │ (Energy used vs. outcomes achieved)                      │   │
│ │                                                          │   │
│ └──────────────────────────────────────────────────────────┘   │
│                                                                 │
│ [Delete Angel]           [Clone Settings]        [Save]        │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Angel Creation Wizard** (click "+ Create"):

```
┌─────────────────────────────────────────────────────────────────┐
│ Create New Angel                                    Step 1/3    │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│ Angel Type:                                                     │
│                                                                 │
│ ┌──────────────────┐  ┌──────────────────┐  ┌──────────────┐  │
│ │ 👼 GUARDIAN      │  │ 🎯 SPECIALIST    │  │ 📨 MESSENGER │  │
│ │                  │  │                  │  │              │  │
│ │ Manages 3-8      │  │ Expert in one    │  │ Delivers     │  │
│ │ agents' needs    │  │ specific domain  │  │ visions only │  │
│ │                  │  │                  │  │              │  │
│ │ Cost: ⚡100      │  │ Cost: ⚡150      │  │ Cost: ⚡75   │  │
│ │                  │  │                  │  │              │  │
│ │ [Select]         │  │ [Select]         │  │ [Select]     │  │
│ └──────────────────┘  └──────────────────┘  └──────────────┘  │
│                                                                 │
│ ┌──────────────────┐  ┌──────────────────┐                    │
│ │ 👁️ WATCHER       │  │ 🌟 ARCHANGEL     │                    │
│ │                  │  │                  │                    │
│ │ Observes &       │  │ Manages other    │                    │
│ │ reports only     │  │ angels           │                    │
│ │                  │  │                  │                    │
│ │ Cost: ⚡50       │  │ Cost: ⚡300      │                    │
│ │                  │  │ 🔒 Locked        │                    │
│ │ [Select]         │  │ (Need 5 angels)  │                    │
│ └──────────────────┘  └──────────────────┘                    │
│                                                                 │
│                                    [Cancel]     [Next Step →]  │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ Create New Guardian Angel                           Step 2/3    │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│ Name: [____________]  (e.g., Uriel, Gabriel, Cassiel)          │
│                                                                 │
│ Domain Specialization:                                          │
│ ● Survival (food, water, shelter)                              │
│ ○ Healing (health, injuries)                                   │
│ ○ Social (relationships, conflicts)                            │
│ ○ Environment (weather, seasons, terrain)                      │
│ ○ Agriculture (planting, harvesting)                           │
│ ○ Spiritual (faith, rituals)                                   │
│                                                                 │
│ Personality:                                                    │
│                                                                 │
│ Communication Style:                                            │
│ Gentle ━━━━━━━╸░░░░░░ Stern                                     │
│                                                                 │
│ Clarity vs Mystery:                                             │
│ Direct ━━━━━━━━━╸░░░ Cryptic                                    │
│                                                                 │
│ Proactive ━━━━━━━╸░░░░░ Reactive                                │
│                                                                 │
│ Initial Autonomy: [Semi-autonomous ▾]                           │
│ • Supervised: Requires approval for all actions                 │
│ • Semi-autonomous: Handles routine, asks for major decisions    │
│ • Fully-autonomous: Acts independently within domain            │
│                                                                 │
│                              [← Back]  [Cancel]  [Next Step →] │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ Create Guardian Angel - Review                     Step 3/3    │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│ Summary:                                                        │
│                                                                 │
│ Name: Uriel                                                     │
│ Type: Guardian Angel                                            │
│ Domain: Survival (food, water, shelter)                         │
│ Style: Gentle, moderately cryptic, balanced proactivity         │
│ Autonomy: Semi-autonomous                                       │
│                                                                 │
│ Initial Configuration:                                          │
│ • Max Energy: 60                                                │
│ • Energy Consumption: 3/min when active                         │
│ • Max Assigned Agents: 8                                        │
│ • Base Success Rate: 70% (increases with experience)            │
│                                                                 │
│ Cost: ⚡100 (one-time creation)                                 │
│ Upkeep: ⚡3/min (only when actively working)                    │
│                                                                 │
│ After creation, you can:                                        │
│ • Assign agents for Uriel to watch over                         │
│ • Adjust autonomy and approval settings                         │
│ • Train and level up through successful interventions           │
│                                                                 │
│                              [← Back]  [Cancel]  [Create ⚡100] │
└─────────────────────────────────────────────────────────────────┘
```

---

## Sacred Geography

### Layout: "The Blessed Lands"

Map view showing spiritual geography overlaid on game world:

```
┌─────────────────────────────────────────────────────────────────┐
│ 🗺️ Sacred Geography                                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│ Layers: [✓] Sacred Sites  [✓] Faith Density  [ ] Prayer Paths  │
│                                                                 │
│ ┌─────────────────────────────────────────────────────────┐    │
│ │                                                         │    │
│ │         🌲    🌲          ⛰️                            │    │
│ │      🌲    ✨                                           │    │
│ │         🌲    Oak of Visions                            │    │
│ │                 (Sacred Site - Lv 2)                    │    │
│ │              💫💫💫 [Selected]                          │    │
│ │                                                         │    │
│ │                                                         │    │
│ │  🏘️  Village                                           │    │
│ │  🟦🟦🟦                                                  │    │
│ │  🟦🟨🟨🟦  ← Heat map of faith density                   │    │
│ │  🟦🟦🟦                                                  │    │
│ │     ⛲                                                   │    │
│ │    Spring of Healing                                    │    │
│ │    (Sacred Site - Lv 1)                                 │    │
│ │                                                         │    │
│ │                                                         │    │
│ │                            🌾🌾                          │    │
│ │                            🌾🌾  Blessed Fields          │    │
│ │                            🌾🌾  (Sacred Site - Lv 3)    │    │
│ │                              ✨✨✨                       │    │
│ │                                                         │    │
│ └─────────────────────────────────────────────────────────┘    │
│                                                                 │
│ Selected: Oak of Visions                                        │
│ ┌─────────────────────────────────────────────────────────┐    │
│ │ Level: 2 (Emerging Shrine)                              │    │
│ │ Faith Power: ████████░░ 78%                             │    │
│ │                                                         │    │
│ │ Origin: Kira received vision of berries here (Day 12)   │    │
│ │ Pilgrims: 8 agents have visited                         │    │
│ │ Rituals: 3 types performed here                         │    │
│ │ - Morning prayer (6 agents)                             │    │
│ │ - Harvest blessing (4 agents)                           │    │
│ │ - Meditation (2 agents)                                 │    │
│ │                                                         │    │
│ │ Benefits:                                               │    │
│ │ • Prayers here 20% more likely to be answered           │    │
│ │ • Visions 15% clearer                                   │    │
│ │ • Faith regen +5% in 50m radius                         │    │
│ │                                                         │    │
│ │ Guardian Angel: Uriel (visits occasionally)             │    │
│ │                                                         │    │
│ │ [Bless Site ⚡30]  [Send Miracle ⚡80]  [View History]  │    │
│ └─────────────────────────────────────────────────────────┘    │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Key Features:**

1. **Map Layers**
   - Sacred Sites: Locations blessed by answered prayers/miracles
   - Faith Density: Heat map showing where faith is strongest
   - Prayer Paths: Common routes agents take to pray
   - Ritual Grounds: Where communal rituals happen

2. **Sacred Site Cards**
   - Level progression (1-5)
   - Origin story (how it became sacred)
   - Pilgrimage stats
   - Ritual types
   - Benefits provided
   - Associated angels

3. **Site Actions**
   - Bless Site: Increase power (energy cost)
   - Send Miracle: Dramatic divine intervention
   - View History: Timeline of spiritual events

4. **Faith Geography**
   - Visual representation of belief distribution
   - Shows skeptical regions
   - Indicates where divine presence is felt most

---

## Divine Analytics

### Layout: "The Omniscient View"

```
┌─────────────────────────────────────────────────────────────────┐
│ 📊 Divine Insights                                 [Export CSV] │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│ Time Range: [Last 7 days ▾]   Compare: [Previous period]       │
│                                                                 │
│ ┌──────────────────┬──────────────────┬──────────────────┐     │
│ │ Faith Trends     │ Prayer Activity  │ Angel Performance│     │
│ ├──────────────────┼──────────────────┼──────────────────┤     │
│ │                  │                  │                  │     │
│ │     Faith %      │  Prayers/Day     │  Success Rate    │     │
│ │ 80%|    ╱─╲      │ 50 |      ╱───   │100%|  ─────╲     │     │
│ │    |   ╱   ╲     │    |    ╱─       │    |        ╲    │     │
│ │ 60%|  ╱     ─    │ 25 |  ╱─         │ 75%|         ─   │     │
│ │    | ╱           │    |╱─            │    |             │     │
│ │ 40%|─            │  0 |              │ 50%|             │     │
│ │    └─────────    │    └─────────     │    └─────────    │     │
│ │    Day 1   7    │    Day 1   7     │    Day 1   7    │     │
│ │                  │                  │                  │     │
│ │ Avg: 67% (+5%)   │ Total: 156 (+12) │ Avg: 87% (-2%)   │     │
│ └──────────────────┴──────────────────┴──────────────────┘     │
│                                                                 │
│ ┌──────────────────────────────────────────────────────────┐   │
│ │ Prayer Breakdown by Domain                               │   │
│ ├──────────────────────────────────────────────────────────┤   │
│ │                                                          │   │
│ │ Survival  ████████████████░░░░░ 42 prayers (27%)         │   │
│ │ Health    ████████████░░░░░░░░░ 31 prayers (20%)         │   │
│ │ Social    █████████░░░░░░░░░░░░ 23 prayers (15%)         │   │
│ │ Guidance  ████████░░░░░░░░░░░░░ 21 prayers (13%)         │   │
│ │ Gratitude ███████░░░░░░░░░░░░░░ 19 prayers (12%)         │   │
│ │ Other     ████░░░░░░░░░░░░░░░░░ 20 prayers (13%)         │   │
│ │                                                          │   │
│ │ Trend: ⚠️ Survival prayers increasing (food shortage?)   │   │
│ └──────────────────────────────────────────────────────────┘   │
│                                                                 │
│ ┌──────────────────────────────────────────────────────────┐   │
│ │ Prophecy Tracker                                         │   │
│ ├──────────────────────────────────────────────────────────┤   │
│ │                                                          │   │
│ │ Active Prophecies: 3                                     │   │
│ │                                                          │   │
│ │ ✅ "Storm coming" (Kira, Day 5)                          │   │
│ │    Status: Fulfilled ✓ (Storm on Day 7)                 │   │
│ │    Faith Impact: +12% (8 believers)                      │   │
│ │                                                          │   │
│ │ ⏳ "Great harvest" (Marcus, Day 6)                       │   │
│ │    Status: Pending (3 days remaining)                    │   │
│ │    Risk: Medium (weather uncertain)                      │   │
│ │                                                          │   │
│ │ ❌ "Fish in north stream" (Chen, Day 3)                  │   │
│ │    Status: Failed ✗ (No fish found)                      │   │
│ │    Faith Impact: -8% (Chen down to 34%)                  │   │
│ │                                                          │   │
│ │ Success Rate: 67% (4/6 total)                            │   │
│ └──────────────────────────────────────────────────────────┘   │
│                                                                 │
│ ┌──────────────────────────────────────────────────────────┐   │
│ │ Agent Faith Distribution                                 │   │
│ ├──────────────────────────────────────────────────────────┤   │
│ │                                                          │   │
│ │         Population                                       │   │
│ │     20 |      ███                                        │   │
│ │        |      ███                                        │   │
│ │     15 |      ███     ███                                │   │
│ │        |  ███ ███     ███                                │   │
│ │     10 |  ███ ███ ███ ███ ███                            │   │
│ │        |  ███ ███ ███ ███ ███ ███                        │   │
│ │      5 |  ███ ███ ███ ███ ███ ███ ███                    │   │
│ │        |  ███ ███ ███ ███ ███ ███ ███                    │   │
│ │      0 └─────────────────────────────────                │   │
│ │         0-20 20-40 40-60 60-80 80-100                    │   │
│ │         Skeptics  |  Believers  |  Devout                │   │
│ │                                                          │   │
│ │ Avg Faith: 67%  Skeptics: 8  Believers: 35  Devout: 7   │   │
│ │ ⚠️ Alert: 3 agents below 30% faith (intervention needed) │   │
│ └──────────────────────────────────────────────────────────┘   │
│                                                                 │
│ ┌──────────────────────────────────────────────────────────┐   │
│ │ Divine Resource Economy                                  │   │
│ ├──────────────────────────────────────────────────────────┤   │
│ │                                                          │   │
│ │ Energy Production:                                       │   │
│ │ • Base Regen: +5/min                                     │   │
│ │ • Faith Bonus: +3.4/min (67% avg faith)                  │   │
│ │ • Total Income: +8.4/min                                 │   │
│ │                                                          │   │
│ │ Energy Consumption:                                      │   │
│ │ • Uriel (Guardian): -3/min                               │   │
│ │ • Raphael (Guardian): -2/min (low activity)              │   │
│ │ • Demeter (Specialist): -4/min                           │   │
│ │ • Total Upkeep: -9/min                                   │   │
│ │                                                          │   │
│ │ Net: -0.6/min ⚠️                                          │   │
│ │                                                          │   │
│ │ ⚠️ Warning: Energy deficit - consider:                   │   │
│ │   • Increasing faith to boost regen                      │   │
│ │   • Reducing angel workload                              │   │
│ │   • Setting angels to supervised mode                    │   │
│ └──────────────────────────────────────────────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Key Features:**

1. **Overview Cards**
   - Faith trends over time
   - Prayer volume and types
   - Angel success rates
   - Quick stats with deltas

2. **Prayer Analytics**
   - Domain breakdown
   - Response time averages
   - Unanswered prayer aging
   - AI insights (e.g., "food shortage detected")

3. **Prophecy Tracker**
   - Active prophecies with time remaining
   - Historical prophecy success rate
   - Impact on faith
   - Risk assessment

4. **Faith Distribution**
   - Histogram of agent beliefs
   - Skeptic identification
   - Trend analysis
   - Intervention suggestions

5. **Resource Management**
   - Divine energy income/expenses
   - Angel upkeep costs
   - Deficit warnings
   - Optimization suggestions

6. **Ritual Analytics** (collapsed section)
   - Ritual frequency
   - Participation rates
   - Emerging traditions
   - Cultural diffusion

---

## Interaction Flows

### Flow 1: Answering a Prayer

```
1. Agent prays (automatic, triggered by needs/crisis/schedule)
   ↓
2. Prayer notification appears in floating panel
   ↓
3. Player clicks notification OR opens Prayer Inbox
   ↓
4. Prayer details shown with agent context
   ↓
5. Player chooses action:

   a) Send Vision manually:
      • Open Vision Composer
      • Choose type, domain, clarity
      • Write/select message
      • Preview impact
      • Send (costs energy)
      ↓
      • Vision queued for delivery (REM sleep/meditation/immediate)
      ↓
      • Agent receives vision
      ↓
      • Agent acts on vision
      ↓
      • Success/failure tracked
      ↓
      • Faith updated
      ↓
      • Analytics updated

   b) Perform Miracle:
      • Choose miracle type (instant heal, teleport resource, etc.)
      • Costs high energy
      • Immediate dramatic effect
      • Major faith boost

   c) Assign to Angel:
      • Select angel from dropdown
      • Angel handles automatically
      • Player can review angel's response before sending (if supervised)

   d) Ignore:
      • Faith decreases
      • Prayer ages
      • May become desperate
```

### Flow 2: Creating and Managing Angels

```
1. Player clicks "+ Create Angel"
   ↓
2. Choose angel type (Guardian/Specialist/etc.)
   ↓
3. Configure angel:
   • Name
   • Domain
   • Personality sliders
   • Autonomy level
   ↓
4. Review and confirm (costs energy)
   ↓
5. Angel created (appears in angel list)
   ↓
6. Assign agents to angel:
   • Manually select agents, OR
   • Auto-assign based on domain/faith level
   ↓
7. Angel begins handling prayers:
   • If supervised: Player reviews each action
   • If semi-autonomous: Player reviews major actions
   • If fully-autonomous: Angel acts independently
   ↓
8. Monitor angel performance:
   • Success rate
   • Agent satisfaction
   • Energy efficiency
   ↓
9. Adjust as needed:
   • Reassign agents
   • Change autonomy level
   • Adjust personality
   • Train/level up
```

### Flow 3: Sacred Site Emergence

```
1. Vision/miracle performed at location
   ↓
2. If successful AND agent returns/shares story
   ↓
3. Location marked as "blessed" (internal)
   ↓
4. Other agents hear about it (social diffusion)
   ↓
5. Agents begin visiting location to pray/meditate
   ↓
6. Faith power accumulates at site
   ↓
7. Site becomes Sacred (Level 1) - notification to player
   ↓
8. Site appears on Sacred Geography map
   ↓
9. Site provides passive benefits:
   • Prayers answered faster
   • Visions clearer
   • Faith regen boost
   ↓
10. Player can actively bless site (costs energy)
    ↓
    Site levels up (2-5)
    ↓
    Stronger benefits
    ↓
    May unlock new ritual types
```

### Flow 4: Prophecy Fulfillment

```
1. Player sends prophecy-type vision:
   • "Storm will come in 3 days"
   • "Great harvest this season"
   • "Stranger will arrive from the north"
   ↓
2. Vision delivered to agent (prophet type preferred)
   ↓
3. Agent shares prophecy with others
   ↓
4. Prophecy tracked in system with timestamp
   ↓
5. Believers wait/watch
   ↓
6. Event occurs OR deadline passes:

   a) Prophecy fulfilled:
      • Notification: "Prophecy came true!"
      • Faith boost to all believers
      • Prophet's reputation increases
      • Sacred site may form at location

   b) Prophecy failed:
      • Notification: "Prophecy did not come true"
      • Faith penalty to all believers
      • Prophet may be doubted/shunned
      • Skepticism spreads

   c) Prophecy partially true:
      • Mixed faith impact
      • Debate among agents
```

---

## Visual Design System

### Color Palette

**Divine/Spiritual:**
- Primary: `#FFD700` (Gold) - Divine energy, blessings
- Secondary: `#E6E6FA` (Lavender) - Visions, spirituality
- Accent: `#87CEEB` (Sky Blue) - Heavenly realm
- Sacred: `#F0E68C` (Khaki) - Sacred sites

**Functional:**
- Success: `#90EE90` (Light Green)
- Warning: `#FFD700` (Gold/Yellow)
- Critical: `#FF6B6B` (Soft Red)
- Neutral: `#D3D3D3` (Light Gray)

**Faith Levels:**
- High (80-100%): `#FFD700` (Gold)
- Medium (50-79%): `#87CEEB` (Sky Blue)
- Low (30-49%): `#F0E68C` (Khaki)
- Critical (<30%): `#FF6B6B` (Soft Red)

### Typography

**Headers:**
- Font: "Cinzel" or "Trajan Pro" (classical, divine feel)
- Size: 18-24px
- Weight: 600-700

**Body:**
- Font: "Lato" or "Open Sans" (readable, clean)
- Size: 14-16px
- Weight: 400

**Prayer/Vision Text:**
- Font: "Crimson Text" or "Libre Baskerville" (literary, mystical)
- Size: 15-17px
- Style: Italic for visions
- Weight: 400

### Icons

**Divine Actions:**
- 🙏 Prayer
- 📖 Vision
- ⚡ Energy/Power
- 🎁 Miracle
- 👼 Angel
- ✨ Blessing
- 🌟 Sacred
- 💫 Spiritual
- 👁️ Watching
- 🔮 Prophecy

**Urgency/Status:**
- 🔴 Critical/Desperate
- 🟠 Urgent
- 🟡 Moderate
- 🟢 Gratitude/Positive
- ⚙️ Working/Processing
- ⏳ Pending
- ✅ Success
- ❌ Failed
- ⚠️ Warning

### Animations

**Prayer Notifications:**
- Fade in from left
- Gentle pulse for urgent prayers
- Soft glow effect

**Vision Sending:**
- Particle effect from player → agent
- Glow intensifies then fades
- Ripple effect on delivery

**Divine Energy:**
- Animated gradient flow
- Pulse when regenerating
- Drain animation when spending

**Sacred Sites:**
- Ambient glow (slow pulse)
- Sparkle particles
- Intensity based on level

**Angel Activity:**
- Subtle wing animation
- Trail effect when moving
- Halo glow when working

---

## Responsive & Accessibility

### Responsive Design

**Desktop (1920x1080):**
- Full multi-panel layout
- Side-by-side prayer list and details
- Floating panels draggable
- All visualizations expanded

**Laptop (1366x768):**
- Condensed panels
- Single-column prayer view
- Tab-based navigation for analytics
- Collapsible sections

**Tablet (1024x768):**
- Full-screen modals instead of floating panels
- Bottom sheet for quick actions
- Swipe gestures for navigation
- Touch-optimized controls

**Mobile (375x667):**
- Stack all elements vertically
- Bottom navigation bar
- Swipe cards for prayers
- Simplified analytics with key metrics only

### Accessibility

**Keyboard Navigation:**
- Tab through all interactive elements
- Arrow keys for list navigation
- Enter/Space to activate
- Escape to close modals
- Shortcuts: `P` (prayers), `A` (angels), `V` (send vision)

**Screen Readers:**
- ARIA labels on all icons
- Announce prayer urgency
- Read energy costs before actions
- Describe angel status and performance
- Announce prophecy fulfillment

**Color Blindness:**
- Don't rely solely on color for urgency (use icons + text)
- High contrast mode option
- Pattern overlays on heat maps
- Text labels on all status indicators

**Reduced Motion:**
- Disable animations if preferred
- Static alternatives for particle effects
- Instant transitions instead of fades

---

## Technical Implementation

### Component Architecture

```typescript
// Main divine interface container
<DivineInterface>
  <DivineStatusBar
    energy={energy}
    faith={avgFaith}
    stats={quickStats}
  />

  <SimulationView>
    <PrayerNotifications
      prayers={recentPrayers}
      onPrayerClick={openPrayerInbox}
    />

    <DivineActionsPanel
      selectedAgent={selectedAgent}
      onAction={handleDivineAction}
    />
  </SimulationView>

  <TabBar
    tabs={['Prayers', 'Angels', 'Sacred Sites', 'Insights']}
    activeTab={activeTab}
    onChange={setActiveTab}
  />
</DivineInterface>

// Prayer Inbox
<PrayerInbox
  isOpen={isInboxOpen}
  prayers={prayers}
  selectedPrayer={selectedPrayer}
  onSelectPrayer={setSelectedPrayer}
  onSendVision={openVisionComposer}
  onAssignAngel={assignToAngel}
  onPerformMiracle={performMiracle}
/>

// Vision Composer
<VisionComposer
  isOpen={isComposerOpen}
  prayer={selectedPrayer}
  agent={targetAgent}
  onSend={sendVision}
  onCancel={closeComposer}
  aiSuggestions={generateSuggestions(prayer, agent)}
/>

// Angel Management
<AngelManagement
  angels={angels}
  selectedAngel={selectedAngel}
  onCreateAngel={openAngelWizard}
  onEditAngel={editAngel}
  onAssignAgents={assignAgents}
/>

// Sacred Geography
<SacredGeography
  sacredSites={sacredSites}
  selectedSite={selectedSite}
  faithHeatmap={faithHeatmap}
  onBlessSite={blessSite}
  onSendMiracle={sendMiracle}
/>

// Divine Analytics
<DivineAnalytics
  faithTrends={faithTrends}
  prayerStats={prayerStats}
  angelPerformance={angelPerformance}
  prophecies={prophecies}
  energyEconomy={energyEconomy}
/>
```

### State Management

```typescript
interface DivineState {
  // Core resources
  divineEnergy: {
    current: number;
    max: number;
    regenRate: number;
    consumption: number;
  };

  averageFaith: number;

  // Prayers
  prayers: Prayer[];
  prayerFilters: PrayerFilters;
  selectedPrayer: Prayer | null;

  // Angels
  angels: Angel[];
  angelFilters: AngelFilters;
  selectedAngel: Angel | null;

  // Sacred Sites
  sacredSites: SacredSite[];
  selectedSite: SacredSite | null;

  // Vision composer
  visionComposer: {
    isOpen: boolean;
    targetAgent: string | null;
    draft: VisionDraft | null;
  };

  // Angel wizard
  angelWizard: {
    isOpen: boolean;
    step: number;
    draft: AngelDraft | null;
  };

  // UI state
  activeTab: 'prayers' | 'angels' | 'sacred' | 'insights';
  floatingPanels: {
    prayerNotifications: PanelState;
    divineActions: PanelState;
  };

  // Analytics
  analytics: {
    faithTrends: TimeSeries;
    prayerStats: PrayerStatistics;
    angelPerformance: AngelMetrics[];
    prophecies: ProphecyTracker[];
    energyEconomy: EnergyEconomy;
  };
}

interface PanelState {
  isOpen: boolean;
  position: { x: number; y: number };
  isMinimized: boolean;
}
```

### Data Flow

```
User Action (e.g., click "Send Vision")
  ↓
React Event Handler
  ↓
State Update (Redux/Zustand)
  ↓
WebSocket Message to Game Server
  ↓
Game Server Processes:
  - Creates vision entity
  - Queues for delivery
  - Deducts divine energy
  - Updates metrics
  ↓
WebSocket Update to Client
  ↓
State Update (new energy, vision sent)
  ↓
UI Re-renders:
  - Energy bar updates
  - Vision added to agent's queue
  - Prayer marked as answered
  - Analytics updated
  ↓
Visual Feedback:
  - Success animation
  - Toast notification
  - Prayer removed from inbox
```

### WebSocket Events

```typescript
// Client → Server
interface SendVisionMessage {
  type: 'send_vision';
  agentId: string;
  vision: VisionDraft;
  deliveryMethod: 'sleep' | 'meditation' | 'immediate';
}

interface CreateAngelMessage {
  type: 'create_angel';
  config: AngelConfig;
}

interface BlessSiteMessage {
  type: 'bless_site';
  siteId: string;
  energyCost: number;
}

// Server → Client
interface PrayerReceivedUpdate {
  type: 'prayer_received';
  prayer: Prayer;
}

interface VisionDeliveredUpdate {
  type: 'vision_delivered';
  visionId: string;
  agentId: string;
  success: boolean;
}

interface FaithChangedUpdate {
  type: 'faith_changed';
  agentId: string;
  oldFaith: number;
  newFaith: number;
  reason: string;
}

interface SacredSiteEmergedUpdate {
  type: 'sacred_site_emerged';
  site: SacredSite;
}

interface ProphecyFulfilledUpdate {
  type: 'prophecy_fulfilled';
  prophecyId: string;
  success: boolean;
  faithImpact: FaithImpact[];
}

interface EnergyUpdate {
  type: 'energy_update';
  current: number;
  max: number;
  regenRate: number;
  consumption: number;
}
```

### Performance Considerations

**Optimizations:**

1. **Virtual Scrolling** for prayer list (may have 100+ prayers)
2. **Debounced Search** for filtering prayers/agents
3. **Lazy Loading** of analytics charts
4. **Memoized Selectors** for derived state (average faith, etc.)
5. **WebSocket Throttling** for high-frequency updates (energy regen)
6. **Canvas Rendering** for faith heat maps (better than SVG at scale)
7. **Pagination** for prayer history (load more on scroll)

**Bundle Size:**
- Code split divine UI into separate chunk
- Lazy load analytics visualizations (D3.js is large)
- Use tree-shaking for icon libraries

---

## Future Enhancements

### Phase 2 Features

1. **Prayer Templates**
   - Save common vision patterns
   - Quick-send for routine requests

2. **Angel Personalities**
   - Visual customization (appearance)
   - Voice/tone samples
   - Behavioral quirks

3. **Miracle Library**
   - Pre-defined miracles with effects
   - Combo miracles (multi-effect)
   - Miracle cooldowns

4. **Ritual Designer**
   - Custom ritual creation
   - Ritual scheduling
   - Ritual effectiveness tracking

5. **Divine Experiments**
   - A/B test different response styles
   - Measure impact on faith/behavior
   - Optimize angel performance

### Advanced Features

1. **Multi-God Mode** (multiplayer)
   - Multiple players as different gods
   - Competing/cooperating for followers
   - Faith stealing mechanics

2. **Divine Quests**
   - Objective-based gameplay
   - "Convert all agents to 80% faith"
   - "Build 5 level-3 sacred sites"

3. **Theocracy Simulator**
   - Agents form religious hierarchy
   - High Priest agent emerges
   - Religious councils make decisions

4. **Divine Challenges**
   - Limited energy mode
   - No angels mode (pure manual)
   - Atheist agents (hard to convert)

---

## Appendix: Wireframe Details

### Prayer Card States

```
┌────────────────┐
│ 🔴 Kira        │  ← CRITICAL (health/survival emergency)
│   "Starving"   │     Red border, pulsing glow
│   Just now     │     Top of list
└────────────────┘

┌────────────────┐
│ 🟠 Marcus      │  ← URGENT (important need)
│   "Lost"       │     Orange border
│   2m ago       │
└────────────────┘

┌────────────────┐
│ 🟡 Chen        │  ← MODERATE (guidance request)
│   "Advice?"    │     Yellow border
│   15m ago      │
└────────────────┘

┌────────────────┐
│ 🟢 Aria        │  ← GRATITUDE (positive)
│   "Thank you!" │     Green border
│   1h ago       │     Can batch-dismiss
└────────────────┘
```

### Angel Status Indicators

```
⚙️ Working      - Currently handling a prayer
🟢 Available    - Idle, ready for assignment
🔴 Depleted     - Out of energy, regenerating
⚠️ Overloaded   - Too many assigned agents
💤 Resting      - Intentionally paused
🌟 Leveling Up  - Gained enough XP for next level
⚫ Corrupt      - High corruption, needs intervention
```

### Sacred Site Levels

```
Level 1: Blessed Spot         ✨
- Single sparkle
- +5% prayer answer chance
- 1-2 visitors/day

Level 2: Emerging Shrine      ✨✨
- Double sparkle
- +15% prayer answer chance
- +10% vision clarity
- 5-10 visitors/day

Level 3: Sacred Site          ✨✨✨
- Triple sparkle, glow
- +25% prayer answer chance
- +20% vision clarity
- +5% faith regen in area
- 15-25 visitors/day
- Rituals unlocked

Level 4: Holy Ground          ✨✨✨✨
- Quad sparkle, strong glow
- +40% prayer answer chance
- +35% vision clarity
- +10% faith regen in area
- Miracles half cost here
- 30-50 visitors/day

Level 5: Divine Nexus         ✨✨✨✨✨
- Full radiance
- +60% prayer answer chance
- +50% vision clarity
- +20% faith regen in area
- Miracles half cost
- Angels regenerate faster here
- 50+ visitors/day
- Permanent divine presence
```

---

## Summary

This UI specification provides:

1. **Immersive divine interface** - Makes you feel like God managing followers
2. **Scalable prayer management** - Handles 1-100+ agents praying
3. **Angel automation** - Delegate work as civilization grows
4. **Spiritual geography** - Visualize faith and sacred spaces
5. **Deep analytics** - Understand your divine impact
6. **Progressive complexity** - Simple early game, complex late game
7. **Responsive design** - Works on all screen sizes
8. **Accessible** - Keyboard, screen reader, colorblind support

The interface balances mysticism with practical management tools, creating a unique "god game" experience that's both immersive and functional.
