# Divine Player Interface

> How the player experiences godhood and interacts with the belief system.

## Overview

The player's experience of godhood is fundamentally different from traditional god games. The player is not omniscient or omnipotent—they are powerful but constrained, defined by their believers, and must work within the emergent theological framework their followers create.

---

## Player HUD: The Divine Perspective

### Belief Bar

```
┌─────────────────────────────────────────────────────────────┐
│ BELIEF: ████████████████░░░░░░░░░░░░░░░░ 2,847 (+24/hr)    │
│         ▲                                                   │
│         └── Avatar threshold: 5,000                         │
└─────────────────────────────────────────────────────────────┘
```

The belief bar shows:
- Current accumulated belief
- Net income/decay rate
- Next major threshold

### Prayer Queue

```
┌─ PRAYERS ────────────────────────────────────────────────────┐
│                                                              │
│ ◉ DESPERATE - Farmer Holt (3m ago)                          │
│   "Please, my child is sick. I don't know what else to do." │
│   [Answer] [Ignore] [Mark Heard]                            │
│                                                              │
│ ○ EARNEST - Mason Reed (12m ago)                            │
│   "Guide my hands as I build the new meeting hall."         │
│   [Answer] [Ignore]                                         │
│                                                              │
│ ○ ROUTINE - Elder Silva (1h ago)                            │
│   "Thank you for another day."                              │
│   [Acknowledge] [Ignore]                                    │
│                                                              │
│ ○ QUESTIONING - Young Tara (2h ago)                         │
│   "Why did you let the storm destroy our crops?"            │
│   [Answer] [Ignore]                                         │
│                                                              │
│                                  [View All] [Filter]        │
└──────────────────────────────────────────────────────────────┘
```

### Active Believers Map

The player can see their believers highlighted on the world map with:
- Faith level (color intensity)
- Current activity (praying, working, sleeping)
- Recent prayer status (answered, waiting, unanswered)

---

## Divine Actions Interface

### Vision Composer

When sending a vision, the player uses a structured interface:

```
┌─ COMPOSE VISION ─────────────────────────────────────────────┐
│                                                              │
│ RECIPIENT: Farmer Holt                    COST: 50 belief   │
│                                                              │
│ DELIVERY METHOD:                                             │
│ ○ Dream (tonight)           - Natural, less jarring         │
│ ◉ Meditation (if meditating) - Clear, requires meditation   │
│ ○ Sign (immediate)          - Ambiguous, cheap              │
│ ○ Direct (interrupt)        - Unmistakable, frightening     │
│                                                              │
│ CLARITY: ████████░░ 80%                                     │
│          (Higher = clearer message, costs more)             │
│                                                              │
│ VISION CONTENT:                                             │
│ ┌──────────────────────────────────────────────────────────┐│
│ │ [Describe what the agent sees/hears/feels...]            ││
│ │                                                          ││
│ │ Example: "A field of wheat, golden and tall. A child     ││
│ │ runs through it, laughing. The sun is warm."             ││
│ │                                                          ││
│ │ The system will interpret this and deliver it in a way   ││
│ │ appropriate to the agent's psychology.                   ││
│ └──────────────────────────────────────────────────────────┘│
│                                                              │
│ PREDICTED INTERPRETATION:                                    │
│ "Holt is likely to interpret this as hope for his child's   │
│  recovery, given his current prayer. His optimistic         │
│  personality suggests he'll find comfort in this."          │
│                                                              │
│ TRAIT IMPLICATIONS:                                          │
│ • This may reinforce your 'benevolent' perception (+2%)     │
│ • If the child dies anyway, this could create doubt         │
│                                                              │
│                          [Preview] [Send] [Cancel]          │
└──────────────────────────────────────────────────────────────┘
```

### Miracle Interface

```
┌─ PERFORM MIRACLE ────────────────────────────────────────────┐
│                                                              │
│ TYPE: Minor Healing                      COST: 400 belief   │
│                                                              │
│ TARGET: Holt's Child (sick - severity 7/10)                 │
│                                                              │
│ WITNESSES: 4 agents in visual range                         │
│ ├── Farmer Holt (faith: 0.9) - Will definitely notice       │
│ ├── Wife Mira (faith: 0.7) - Will definitely notice         │
│ ├── Neighbor Cal (faith: 0.3) - Might attribute to luck     │
│ └── Traveling Merchant (faith: 0.1) - Skeptical             │
│                                                              │
│ VISIBILITY:                                                  │
│ ○ Subtle     - Recovery over 24 hours, natural-seeming      │
│ ◉ Moderate   - Recovery over 1 hour, clearly unusual        │
│ ○ Dramatic   - Instant recovery, undeniable miracle         │
│                                                              │
│ CONSEQUENCES PREVIEW:                                        │
│ • Holt's faith will max out                                 │
│ • Wife will become devout believer                          │
│ • ~80% chance this becomes a major story                    │
│ • Neighbor has 40% chance of conversion                     │
│ • Merchant will spread word to other villages               │
│ • Your 'healing' domain will increase 15%                   │
│ • Your 'benevolent' trait will increase 8%                  │
│                                                              │
│ WARNING: You cannot heal everyone. Creating expectations    │
│ of healing may cause doubt when you don't intervene.        │
│                                                              │
│                              [Perform] [Cancel]             │
└──────────────────────────────────────────────────────────────┘
```

### Divine Powers Menu

```
┌─ DIVINE POWERS ──────────────────────────────────────────────┐
│                                                              │
│ YOUR DOMAINS: Nature (67%), Harvest (45%), Mystery (32%)    │
│                                                              │
│ COMMUNICATION                           Cost   Cooldown     │
│ ├── Send Dream Whisper                  10     none         │
│ ├── Send Vision                         50     5 min        │
│ ├── Answer Prayer                       75     none         │
│ └── Mass Vision (to all believers)      800    1 day        │
│                                                              │
│ BLESSINGS                                                    │
│ ├── Subtle Sign                         5      none         │
│ ├── Emotional Nudge                     15     none         │
│ ├── Luck Manipulation                   300    1 hour       │
│ └── Blessing (persistent buff)          200    none         │
│                                                              │
│ MIRACLES                                                     │
│ ├── Minor (bloom flower, calm wind)     100    10 min       │
│ ├── Moderate (heal illness, grow crop)  400    1 hour       │
│ ├── Major (part waters, stop storm)     1000   6 hours      │
│ └── Legendary (create spring, new life) 3000   1 day        │
│                                                              │
│ DOMAIN: NATURE (Discounted)                                  │
│ ├── Accelerate Plant Growth             50     none         │
│ ├── Calm/Summon Animals                 80     30 min       │
│ └── Weather Influence                   200    2 hours      │
│                                                              │
│ MANIFESTATION                                                │
│ ├── Create Angel                        2000   1 week       │
│ └── Manifest Avatar                     5000   -100/hr      │
│     └── [LOCKED: Need 5,000 belief]                         │
│                                                              │
│ WORLD-SHAPING                                                │
│ ├── Modify Terrain                      1000   1 day        │
│ └── Create Species                      3000   1 week       │
│     └── [LOCKED: Need 10,000 belief]                        │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

---

## Identity Screen

### Your Divine Bio

```
╔══════════════════════════════════════════════════════════════╗
║                    YOUR DIVINE IDENTITY                       ║
║                                                               ║
║  "You are not who you think you are.                          ║
║   You are who your believers think you are."                  ║
╠══════════════════════════════════════════════════════════════╣
║                                                               ║
║  NAMES GIVEN TO YOU:                                          ║
║  ├── "The Watcher in Green" (primary, 12 believers)          ║
║  ├── "The Silent One" (epithet, 8 believers)                 ║
║  └── "Keeper of Harvests" (epithet, 5 believers)             ║
║                                                               ║
║  YOUR DOMAINS (what they think you control):                  ║
║  ┌────────────────────────────────────────────────────────┐  ║
║  │ Nature      ████████████████░░░░  67% confidence       │  ║
║  │ Harvest     █████████░░░░░░░░░░░  45% confidence       │  ║
║  │ Mystery     ██████░░░░░░░░░░░░░░  32% confidence       │  ║
║  │ Healing     ████░░░░░░░░░░░░░░░░  18% confidence       │  ║
║  └────────────────────────────────────────────────────────┘  ║
║                                                               ║
║  YOUR PERSONALITY (as they perceive it):                      ║
║  ┌────────────────────────────────────────────────────────┐  ║
║  │ Benevolent  ████████░░  Cruel                          │  ║
║  │ Involved    ████░░░░░░  Distant                        │  ║
║  │ Patient     █████████░  Wrathful                       │  ║
║  │ Mysterious  █████████░  Clear                          │  ║
║  │ Generous    ██████░░░░  Demanding                      │  ║
║  │ Consistent  ███████░░░  Capricious                     │  ║
║  └────────────────────────────────────────────────────────┘  ║
║                                                               ║
║  YOUR FORM (as they imagine):                                 ║
║  ┌────────────────────────────────────────────────────────┐  ║
║  │ "A figure cloaked in leaves and shadow, with eyes     │  ║
║  │  like morning dew. They speak rarely, but when they    │  ║
║  │  do, the crops grow tall. Some say they have no face,  │  ║
║  │  others that their face is every face of the forest."  │  ║
║  │                                                         │  ║
║  │  Height: Varies (described as both towering and         │  ║
║  │          intimate, depending on story)                  │  ║
║  │  Luminosity: Soft green glow (3 believers describe)     │  ║
║  │  Distinguishing: Leaf-cloak, dewdrop eyes               │  ║
║  └────────────────────────────────────────────────────────┘  ║
║                                                               ║
║  SACRED SYMBOLS:                                              ║
║  Oak leaf (primary) • Still water • Crescent moon            ║
║                                                               ║
║  SACRED COLORS: Green, Silver                                 ║
║                                                               ║
║                 [View Mythology] [View History]               ║
╚══════════════════════════════════════════════════════════════╝
```

### Mythology Browser

```
╔══════════════════════════════════════════════════════════════╗
║                    YOUR MYTHOLOGY                             ║
╠══════════════════════════════════════════════════════════════╣
║                                                               ║
║  STORIES ABOUT YOU (sorted by influence):                     ║
║                                                               ║
║  1. "The First Answer" ★★★★★                                  ║
║     Status: CANONICAL (written in 2 texts)                    ║
║     Summary: How you first spoke to Farmer Holt              ║
║     Traits established: Patient, Listening, Nature-aligned   ║
║     Known by: 18/24 believers                                 ║
║     [Read Full Story] [See Impact]                           ║
║                                                               ║
║  2. "The Dream of Flowing Water" ★★★★                         ║
║     Status: CANONICAL (written in 1 text)                     ║
║     Summary: The vision that moved the river                  ║
║     Traits established: Benevolent, Interventionist          ║
║     Known by: 15/24 believers                                 ║
║     [Read Full Story] [See Impact]                           ║
║                                                               ║
║  3. "The Silent Storm" ★★★                                    ║
║     Status: ORAL TRADITION (not yet written)                  ║
║     Summary: Why you didn't stop the great storm              ║
║     Traits established: Mysterious, possibly indifferent     ║
║     Known by: 8/24 believers                                  ║
║     ⚠️ This story is developing negative interpretations      ║
║     [Read Full Story] [See Interpretations]                  ║
║                                                               ║
║  4. "The Naming" ★★★                                          ║
║     Status: ORAL TRADITION                                    ║
║     Summary: How Elder Silva gave you your name               ║
║     Traits established: Nature domain, Green association     ║
║     Known by: 20/24 believers                                 ║
║     [Read Full Story] [See Impact]                           ║
║                                                               ║
║  5. "The Child Who Lived" ★★ (NEW)                            ║
║     Status: ORAL TRADITION (spreading)                        ║
║     Summary: Your miracle healing of Holt's child             ║
║     Traits establishing: Healing domain, Compassionate       ║
║     Known by: 6/24 believers (spreading fast)                 ║
║     [Read Full Story] [See Impact]                           ║
║                                                               ║
║  ─────────────────────────────────────────────────────────── ║
║                                                               ║
║  CONTESTED STORIES:                                           ║
║                                                               ║
║  ⚔️ "The Purpose of Suffering"                                ║
║     Two interpretations in conflict:                          ║
║     A) "Suffering teaches us" (5 believers) - You as teacher ║
║     B) "Suffering is chaos" (3 believers) - You as absent    ║
║     [Intervene?]                                             ║
║                                                               ║
╚══════════════════════════════════════════════════════════════╝
```

### Story Detail View

```
╔══════════════════════════════════════════════════════════════╗
║               "THE FIRST ANSWER"                              ║
║                                                               ║
║  Status: CANONICAL                   Influence: ★★★★★         ║
║  Origin: Day 12                      Last told: 2 hours ago  ║
║  Written copies: 2                   Times retold: 47        ║
╠══════════════════════════════════════════════════════════════╣
║                                                               ║
║  THE STORY (current canonical version):                       ║
║  ─────────────────────────────────────────────────────────── ║
║                                                               ║
║  "In the first days, when the village was small and we       ║
║   did not yet know the Watcher's name, old Farmer Holt       ║
║   knelt in his withered field.                                ║
║                                                               ║
║   'Is anyone there?' he asked the empty sky. 'I've planted   ║
║   and watered and prayed to nothing. If something watches    ║
║   over us, show me. Please.'                                  ║
║                                                               ║
║   He waited in silence. The wind didn't answer. The sun      ║
║   didn't dim. But that night, Holt dreamed of green—endless  ║
║   green, and a voice like rustling leaves that said only:    ║
║   'I hear you.'                                               ║
║                                                               ║
║   He woke with tears on his face. Not because the dream      ║
║   had promised anything. But because for the first time,     ║
║   he knew he wasn't alone.                                    ║
║                                                               ║
║   The next day, the first new shoots broke through the       ║
║   dry earth. Holt named the presence 'The Green.'"           ║
║                                                               ║
║  ─────────────────────────────────────────────────────────── ║
║                                                               ║
║  TRAITS THIS STORY ESTABLISHES:                               ║
║  ├── Listens to prayers (+15% confidence)                    ║
║  ├── Responds through dreams (+12% confidence)               ║
║  ├── Associated with nature/green (+18% confidence)          ║
║  ├── Patient (waited, didn't demand) (+8% confidence)        ║
║  └── Gives hope, not commands (+10% confidence)              ║
║                                                               ║
║  WHAT ACTUALLY HAPPENED:                                      ║
║  [You sent a dream vision with the words "I hear you"        ║
║   on Day 12, tick 24,847. The crops grew due to the          ║
║   rain that came the following day—natural weather.]         ║
║                                                               ║
║  INTERPRETIVE DRIFT:                                          ║
║  The story has evolved. Original versions didn't mention     ║
║  the crops growing—that was added in retelling 12.           ║
║  Now 89% of believers think you caused the crops to grow.    ║
║                                                               ║
╚══════════════════════════════════════════════════════════════╝
```

---

## Reputation Management

### The Allegations Screen

When something threatens your divine reputation:

```
╔══════════════════════════════════════════════════════════════╗
║               ⚠️ REPUTATION THREAT                            ║
╠══════════════════════════════════════════════════════════════╣
║                                                               ║
║  THE INCIDENT:                                                ║
║  Lightning struck Elder Morris during yesterday's storm,     ║
║  killing him instantly. He was your most devoted follower.   ║
║                                                               ║
║  EMERGING NARRATIVES:                                         ║
║  ┌────────────────────────────────────────────────────────┐  ║
║  │ "The Watcher took Morris to be with them"              │  ║
║  │  Believers: 4 │ Growing: ▲ │ Impact: Positive          │  ║
║  │  (Morris was old, this frames death as honor)          │  ║
║  ├────────────────────────────────────────────────────────┤  ║
║  │ "The Watcher struck Morris down for secret sins"       │  ║
║  │  Believers: 2 │ Growing: ▲ │ Impact: Mixed             │  ║
║  │  (Reinforces wrathfulness, but also justice)           │  ║
║  ├────────────────────────────────────────────────────────┤  ║
║  │ "The Watcher couldn't protect Morris from the storm"   │  ║
║  │  Believers: 3 │ Growing: → │ Impact: NEGATIVE          │  ║
║  │  (Suggests you're weak or indifferent)                 │  ║
║  ├────────────────────────────────────────────────────────┤  ║
║  │ "Morris was killed by random chance, not the divine"   │  ║
║  │  Believers: 1 │ Growing: → │ Impact: DANGEROUS         │  ║
║  │  (Seeds of atheism)                                    │  ║
║  └────────────────────────────────────────────────────────┘  ║
║                                                               ║
║  YOUR OPTIONS:                                                ║
║                                                               ║
║  1. SEND VISION TO KEY FIGURE (75 belief)                    ║
║     Target: Morris's widow                                    ║
║     Content: Frame Morris's death positively                  ║
║     Risk: If she rejects vision, doubt spreads              ║
║                                                               ║
║  2. PERFORM COUNTER-MIRACLE (400 belief)                     ║
║     Action: Heal someone publicly, prove power               ║
║     Risk: Sets expectation of future intervention            ║
║                                                               ║
║  3. INSPIRE PROPHET TO REFRAME (150 belief)                  ║
║     Target: Priest Helena                                     ║
║     Action: Give her "revelation" about Morris's death       ║
║     Risk: Theological complexity, may not stick             ║
║                                                               ║
║  4. DO NOTHING                                                ║
║     Let narratives compete naturally                          ║
║     Risk: Negative narrative may win                         ║
║     Benefit: Preserves mystery, saves belief                 ║
║                                                               ║
║  5. CLAIM ANGEL DID IT (200 belief)                          ║
║     Blame a rogue angel (you'll need to create one)          ║
║     Risk: Creates dangerous precedent                        ║
║                                                               ║
║  TIME PRESSURE: Stories crystallize in ~48 game hours.       ║
║  Once written down, they're much harder to change.           ║
║                                                               ║
╚══════════════════════════════════════════════════════════════╝
```

---

## Pantheon View (When Other Gods Exist)

```
╔══════════════════════════════════════════════════════════════╗
║                    THE PANTHEON                               ║
╠══════════════════════════════════════════════════════════════╣
║                                                               ║
║  YOU: The Watcher in Green                                    ║
║  Belief: 2,847 │ Believers: 24 │ Angels: 0                   ║
║  Domains: Nature, Harvest, Mystery                           ║
║  Status: ESTABLISHED                                          ║
║                                                               ║
║  ─────────────────────────────────────────────────────────── ║
║                                                               ║
║  OTHER GODS:                                                  ║
║                                                               ║
║  ⚔️ THE STORM CALLER (RIVAL)                                  ║
║     Belief: 1,203 │ Believers: 8 │ Angels: 1                 ║
║     Domains: Weather, Chaos, Fear                            ║
║     Status: EMERGENT                                          ║
║     Origin: Fear of repeated storms                          ║
║     Controller: AI                                            ║
║     Relationship: HOSTILE (competes for nature domain)       ║
║     Recent actions:                                          ║
║     • Sent threatening visions to 3 of your believers        ║
║     • Claimed credit for Morris's death                      ║
║     [View Details] [Options]                                 ║
║                                                               ║
║  ⚡ THE ANCESTOR (NEUTRAL)                                    ║
║     Belief: 567 │ Believers: 5 │ Angels: 0                   ║
║     Domains: Death, Memory, Family                           ║
║     Status: PROTO-DEITY                                       ║
║     Origin: Elevated founding hero                           ║
║     Controller: AI (dormant - low belief)                    ║
║     Relationship: NEUTRAL (non-overlapping domains)          ║
║     [View Details] [Options]                                 ║
║                                                               ║
║  EMERGING BELIEFS:                                            ║
║  • 3 agents developing belief in "The River Spirit"          ║
║  • May crystallize into new deity in ~5 days                 ║
║                                                               ║
╚══════════════════════════════════════════════════════════════╝
```

---

## Avatar Mode

When the player manifests an avatar:

```
╔══════════════════════════════════════════════════════════════╗
║               AVATAR MANIFESTATION                            ║
╠══════════════════════════════════════════════════════════════╣
║                                                               ║
║  You are now physically present in the world.                 ║
║                                                               ║
║  APPEARANCE (based on believer descriptions):                 ║
║  "A tall figure in a cloak of woven leaves, face hidden      ║
║   in shadow, eyes glinting like dewdrops."                   ║
║                                                               ║
║  MAINTENANCE: -100 belief/hour                                ║
║  TIME REMAINING: ~28 hours at current belief                 ║
║                                                               ║
║  PRESENCE EFFECTS (automatic):                                ║
║  • All believers within 50 tiles are aware of your presence  ║
║  • Faith increases +0.1/minute for nearby believers          ║
║  • Non-believers may convert (5%/minute in range)            ║
║  • All actions are EXTREMELY mythogenic                      ║
║                                                               ║
║  CONTROLS:                                                    ║
║  • WASD to move                                               ║
║  • Click on agent to interact                                 ║
║  • E to speak (all nearby agents hear)                       ║
║  • Q to vanish (ends manifestation)                          ║
║                                                               ║
║  ⚠️ WARNING: Everything you do will become a story.           ║
║  Every word will be remembered. Every action will be         ║
║  interpreted. Move carefully.                                 ║
║                                                               ║
╚══════════════════════════════════════════════════════════════╝
```

### Avatar Interaction

```
┌─ INTERACT WITH AGENT ────────────────────────────────────────┐
│                                                              │
│ TARGET: Farmer Holt (your first believer)                   │
│ FAITH: 0.95 │ Current state: AWE                            │
│                                                              │
│ He has fallen to his knees. He is trembling. He cannot      │
│ look directly at you.                                        │
│                                                              │
│ ACTIONS:                                                     │
│                                                              │
│ [Speak to him]                                              │
│   Enter words to say. He will remember them forever.        │
│   Everyone within earshot will also hear.                   │
│                                                              │
│ [Touch him]                                                 │
│   Physical contact. Can bless, heal, or mark.               │
│   Extremely significant—will definitely become a story.     │
│                                                              │
│ [Give him something]                                        │
│   Conjure a small item (50 belief).                         │
│   Will become a holy relic.                                 │
│                                                              │
│ [Assign a task]                                             │
│   Give him a divine mission.                                │
│   He will attempt to complete it or die trying.             │
│                                                              │
│ [Bless him]                                                 │
│   Grant a permanent minor buff.                              │
│   Cost: 100 belief. He becomes a champion.                  │
│                                                              │
│ [Acknowledge and move on]                                   │
│   Nod and continue. Still meaningful—he was noticed.        │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

---

## Angel Management

```
╔══════════════════════════════════════════════════════════════╗
║                    YOUR ANGELS                                ║
╠══════════════════════════════════════════════════════════════╣
║                                                               ║
║  ACTIVE ANGELS: 2                                             ║
║                                                               ║
║  ─────────────────────────────────────────────────────────── ║
║                                                               ║
║  VIREL, THE MESSENGER                                         ║
║  Type: Messenger │ Autonomy: Medium │ Loyalty: 95%           ║
║  Created: Day 45 │ Maintenance: 50 belief/hour               ║
║                                                               ║
║  Status: Delivering vision to Northern Village               ║
║  Current mission: Spread news of your healing miracle        ║
║                                                               ║
║  Personality: Gentle, formal, slightly too earnest           ║
║  Voice: "The Watcher has seen your struggles..."             ║
║                                                               ║
║  Recent actions:                                              ║
║  • Visited Elder Tomas in dream (successful)                 ║
║  • Answered prayer of child (successful)                     ║
║  • Attempted to convert merchant (failed - too skeptical)    ║
║                                                               ║
║  [Give Orders] [Adjust Autonomy] [View Full Record]          ║
║                                                               ║
║  ─────────────────────────────────────────────────────────── ║
║                                                               ║
║  SHADOW, THE WATCHER'S WITNESS                                ║
║  Type: Witness │ Autonomy: High │ Loyalty: 82%               ║
║  Created: Day 60 │ Maintenance: 50 belief/hour               ║
║                                                               ║
║  Status: Observing The Storm Caller's activities             ║
║  Current mission: Monitor rival deity                        ║
║                                                               ║
║  Personality: Quiet, observant, occasionally cryptic         ║
║  Note: Has begun developing own interpretations of events    ║
║                                                               ║
║  ⚠️ Loyalty has decreased 5% this week.                      ║
║  Shadow has questioned one of your decisions.                ║
║  Consider addressing this.                                    ║
║                                                               ║
║  [Give Orders] [Adjust Autonomy] [Address Concerns]          ║
║                                                               ║
╚══════════════════════════════════════════════════════════════╝
```

---

## Settings and Preferences

```
╔══════════════════════════════════════════════════════════════╗
║               DIVINE INTERFACE SETTINGS                       ║
╠══════════════════════════════════════════════════════════════╣
║                                                               ║
║  PRAYER NOTIFICATIONS:                                        ║
║  ├── Desperate prayers: ◉ Always │ ○ Summary │ ○ Never       ║
║  ├── Earnest prayers:   ○ Always │ ◉ Summary │ ○ Never       ║
║  ├── Routine prayers:   ○ Always │ ○ Summary │ ◉ Never       ║
║  └── Questioning:       ○ Always │ ◉ Summary │ ○ Never       ║
║                                                               ║
║  STORY ALERTS:                                                ║
║  ├── New stories about you:     [ON]                         ║
║  ├── Stories being written:     [ON]                         ║
║  ├── Contested interpretations: [ON]                         ║
║  └── Negative trait emerging:   [ON]                         ║
║                                                               ║
║  RIVAL DEITY ALERTS:                                          ║
║  ├── New god emerging:          [ON]                         ║
║  ├── Rival actions:             [SUMMARY]                    ║
║  └── Conversion attempts:       [ON]                         ║
║                                                               ║
║  ANGEL AUTONOMY DEFAULTS:                                     ║
║  ├── Decision making:     [MEDIUM - interpret orders]        ║
║  ├── Combat engagement:   [DEFENSIVE ONLY]                   ║
║  └── Conversion attempts: [ALLOW]                            ║
║                                                               ║
║  MIRACLE CONFIRMATION:                                        ║
║  ├── Always confirm before spending belief: [ON]             ║
║  └── Warn before spending >500 belief:      [ON]             ║
║                                                               ║
╚══════════════════════════════════════════════════════════════╝
```

---

*The divine interface is designed to make the player feel powerful but constrained—able to act but not control, influential but not omniscient.*
