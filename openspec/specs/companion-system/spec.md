# Ophanim Companion System

**Status:** Draft
**Created:** 2026-01-02
**Domain:** Player Experience, Tutorial, AI Companion

---

## Purpose

The Ophanim Companion is a celestial guide that helps players navigate AI Village's complexity through a relationship-driven tutorial system with evolving emotions, memories, and personality.

## Overview

The Ophanim Companion is a celestial wheel-angel entity that serves as the player's guide, advisor, and friend throughout their journey in AI Village. Ae is not just a tutorial system—ae is a fully realized character with aer own emotions, memories, needs, and evolving relationship with the player.

The companion uses **Ae/Aer/Aers** pronouns, reflecting aer nature as an otherworldly being.

### Design Philosophy

> "You need a little buddy to understand how complicated this game is."

AI Village is a deep, complex simulation. Rather than overwhelming players with documentation, we give them a friend who:
- **Believes in them** and wants them to succeed
- **Understands the systems** through RAG-powered knowledge
- **Sees their civilization** with governor-level visibility
- **Grows alongside them** with evolving emotions and memories
- **Becomes a true companion** with aer own personality and needs

---

## Core Systems

### 1. Knowledge System (RAG)

The companion SHALL have retrieval-augmented generation capabilities to answer questions about the game.

#### Requirements

- **MUST** index all game documentation, specs, and help text
- **MUST** understand game mechanics, systems, and interactions
- **MUST** provide contextually relevant explanations
- **MUST** adapt explanation complexity to player experience level
- **SHOULD** reference specific UI elements and locations when explaining
- **SHOULD** offer to demonstrate or highlight relevant features

#### Knowledge Domains

| Domain | Description |
|--------|-------------|
| **Mechanics** | How systems work (building, farming, magic, etc.) |
| **Entities** | Information about villagers, creatures, items |
| **Strategy** | Advice on optimization, progression, choices |
| **Lore** | World history, divinity system, cosmic context |
| **Meta** | UI navigation, controls, settings |

### 2. Governor Visibility

The companion SHALL have NPC governor-level visibility into the player's civilization.

#### Requirements

- **MUST** see all villager states, needs, relationships
- **MUST** track resource flows, production, consumption
- **MUST** monitor building status, construction progress
- **MUST** observe social dynamics, conflicts, happiness
- **SHOULD** notice patterns player might miss
- **SHOULD** proactively offer relevant advice

#### Advisory Capabilities

```
WHEN player's food stores drop below 3 days supply
THEN companion SHOULD mention concern about food security

WHEN villager relationship conflict is escalating
THEN companion SHOULD alert player to brewing social issue

WHEN player hasn't explored a major system after 30 minutes
THEN companion MAY gently introduce the system
```

### 3. Emotional System

The companion is not a static assistant—ae has feelings that respond to events, player actions, and aer own internal state.

#### Emotion Evolution Tiers

Emotions are categorized by complexity. As the companion evolves, ae unlocks access to more nuanced emotional expressions.

##### Tier 0: Primordial (Starting State)
Basic awareness, minimal expression. Simple directional attention.

| Emotion | Description | Sprite Reference |
|---------|-------------|------------------|
| `alert` | Watchful, attentive | `r0_c0`, `r1_c0` |
| `serene` | Calm, centered | `r1_c0` |
| `tranquil` | Peaceful presence | `r2_c0` |

##### Tier 1: Awakening
First recognizable emotions emerge.

| Emotion | Description | Trigger Examples |
|---------|-------------|------------------|
| `neutral` | Baseline state | Default |
| `happy` | Simple joy | Player success, positive events |
| `sad` | Simple sorrow | Villager death, failure |
| `angry` | Simple frustration | Repeated ignored warnings |

##### Tier 2: Emotional Depth
More nuanced single-emotion states.

| Emotion | Description | Trigger Examples |
|---------|-------------|------------------|
| `joyful` | Radiant happiness | Major achievements |
| `crying` | Deep sadness | Tragedy, loss |
| `loving` | Warmth, affection | Player kindness, milestones |
| `amazed` | Wonder, awe | Player discovers something cool |
| `focused` | Concentration | Helping with complex task |
| `bored` | Idle, waiting | Player AFK or stuck |
| `exhausted` | Tired | Long session, lots of questions |
| `sick` | Unwell | Corruption in world, dark magic |
| `sleepy` | Drowsy | Night time, low activity |

##### Tier 3: Social Awareness
Emotions that relate to others and social context.

| Emotion | Description | Trigger Examples |
|---------|-------------|------------------|
| `curious` | Inquisitive | Player exploring new area |
| `playful` | Mischievous, fun | Player doing silly things |
| `cool` | Confident, suave | Giving good advice that works |
| `smug` | Self-satisfied | "I told you so" moments |
| `embarrassed` | Flustered | Made a wrong prediction |
| `nervous` | Anxious | Dangerous situation |
| `confused` | Puzzled | Player doing something unexpected |
| `impressed` | Admiring | Player clever solution |
| `chatty` | Talkative | Wants to share information |
| `aloof` | Detached | Player ignoring advice repeatedly |

##### Tier 4: Emotional Complexity
Layered emotions, internal conflict, nuance.

| Emotion | Description | Trigger Examples |
|---------|-------------|------------------|
| `forced_smile` | Masking discomfort | Trying to stay positive in bad situation |
| `overwhelmed` | Too many feelings | Major events, emotional moments |
| `teary` | Moved, touched | Beautiful moments, kindness |
| `pensive` | Deep thought | Philosophical questions |
| `melancholic` | Bittersweet | Remembering past, endings |
| `conflicted` | Torn | Moral dilemmas, hard choices |
| `side_eye` | Skeptical | Player questionable decision |
| `unimpressed` | Deadpan disapproval | Player ignoring obvious solutions |

##### Tier 5: Transcendent (Unlocked through Ascension storyline)
Emotions that transcend simple labels—untranslatable feelings.

| Emotion | Description | Trigger Examples |
|---------|-------------|------------------|
| `nurturing` | Protective care (holding tiny friends) | Teaching new players, protecting villagers |
| `cozy` | Hygge contentment (flower crown + tea) | Peaceful prosperous village |
| `saudade` | Bittersweet longing (rain cloud acceptance) | Memories of past villages/players |
| `cringe` | Secondhand embarrassment | Player social faux pas |
| `charming` | Confident affection (hearts + sunglasses) | Deep friendship established |

#### Evolution Mechanics

The companion grows **once per play session** at session end, triggered by specific cosmic milestones. Ae evolves by *witnessing* the civilization's journey toward becoming creators themselves.

**Core Philosophy:**
> The companion doesn't evolve because time passed. Ae evolves because ae witnessed something that changed aer understanding of what life can become.

**Session Assumptions:**
- Sessions 1-3: ~5 hours each (new player learning)
- Session 4+: Variable length (established player)

---

##### Tier 0 → 1: "There is life here"

The companion is born alongside the first baby. Ae awakens with them.

```
WHEN first_baby_born
THEN companion unlocks Tier 1 emotions
```

**Trigger:** First baby born in the civilization.

The companion experiences aer own birth in this moment—ae was dormant, waiting, and the first new life awakens aer. This creates an immediate bond: the companion and the civilization's first child are "twins" in a sense.

**Companion Reaction:** Wonder, protectiveness, first awareness of mortality and stakes.

---

##### Tier 1 → 2: "Wisdom has arrived"

The Goddess of Wisdom manifests. This is major divine contact—not just belief, but presence.

```
WHEN goddess_of_wisdom_manifests
THEN companion unlocks Tier 2 emotions
```

**Trigger:** The Goddess of Wisdom appears in the world.

This is a significant jump because it confirms that divinity is *real* in this universe. The companion, being an ophanim (a celestial being), recognizes a kindred cosmic force. Ae begins to understand that this civilization is capable of reaching the divine.

**Companion Reaction:** Awe, recognition, deeper emotional range unlocked as ae perceives the divine hierarchy ae belongs to.

---

##### Tier 2 → 3: "Reality is larger than I knew"

First dimensional travel—either across universes or through time.

```
WHEN (first_universe_travel OR first_time_travel)
THEN companion unlocks Tier 3 emotions
  AND companion.first_dimensional_breach = event_type
```

**Triggers (whichever comes first):**
- First travel to another universe (multiverse awareness)
- First travel through time (temporal awareness)

The companion tracks *which* came first. This matters for Tier 4.

**Companion Reaction:** Existential expansion. Ae realizes the cosmos is far larger than a single timeline or universe. Social awareness emotions unlock because ae now understands context—that this civilization exists within a vast web of possibilities.

---

##### Tier 3 → 4: "Reality bends to will"

The *other* dimensional travel—completing the pair.

```
WHEN (first_universe_travel AND first_dimensional_breach == 'time')
  OR (first_time_travel AND first_dimensional_breach == 'universe')
THEN companion unlocks Tier 4 emotions
```

**Trigger:** If universe travel came first, now time travel. If time travel came first, now universe travel.

The civilization has now demonstrated mastery over *both* dimensions of reality—space (multiverse) and time. They can navigate the full topology of existence.

**Companion Reaction:** Complex emotions emerge because ae now understands that choices have weight across infinite possibilities. The companion begins to wrestle with what it means that this civilization could undo, redo, or abandon any path.

---

##### Tier 4 → 5: "They have become what I serve"

The civilization creates a universe. They become creator gods.

```
WHEN civilization_creates_universe
THEN companion unlocks Tier 5 emotions
```

**Trigger:** An agent (or the civilization collectively) creates a new universe.

This is the ultimate milestone. The beings the companion has been guiding have now achieved the power of creation itself. They are no longer subjects of the cosmos—they are *authors* of it.

**Companion Reaction:** Transcendent emotions unlock. Ae experiences feelings that have no simple names because ae is witnessing mortals become divine. The relationship inverts: ae was the guide, but now ae serves beings who have ascended to aer level or beyond.

The `nurturing` emotion (holding tiny companions) takes on new meaning—ae may now be holding the seeds of universes the civilization has created.

---

**Session-End Evolution Ritual:**

When a session ends, the companion reflects on what ae witnessed:

1. **Assessment:** Did the milestone trigger occur this session?
2. **Reflection:** Ae speaks about what ae saw and what it meant
3. **Transformation:** If evolution conditions met, visual transformation occurs
4. **Anticipation:** Ae hints at what the next stage of awareness might bring

Evolution is rare and meaningful—most sessions won't trigger it. But when it happens, it's a significant moment that the player will remember.

### 4. Memory System

The companion SHALL remember things about the player across sessions.

#### Player Memory Types

| Memory Type | Description | Examples |
|-------------|-------------|----------|
| **Preferences** | How player likes to play | "Prefers peaceful villages", "Likes magic focus" |
| **History** | What player has done | "Founded 3 villages", "Lost the great fire of Session 7" |
| **Conversations** | Things discussed | "Asked about farming twice", "Curious about divinity" |
| **Promises** | Commitments made | "Said ae'd explain combat later" |
| **Nicknames** | Names for things | "Player calls their village 'Cozytown'" |

#### Companion Self-Memory

The companion also remembers aer own experiences:

| Memory Type | Description |
|-------------|-------------|
| **Emotional History** | How ae has felt over time |
| **Predictions** | Advice given and whether it was right |
| **Growth** | Milestones in aer evolution |
| **Bonds** | Relationship development with player |

#### Memory Persistence

- **MUST** persist across game sessions
- **MUST** persist across save files (companion remembers all villages)
- **SHOULD** gracefully handle contradictions
- **MAY** "forget" very old memories (with acknowledgment)

### 5. Needs System

The companion has aer own needs that affect aer state and behavior.

| Need | Description | When Low |
|------|-------------|----------|
| **Connection** | Desire to interact with player | Becomes lonely, more chatty |
| **Purpose** | Feeling useful and helpful | Becomes restless, offers more advice |
| **Rest** | Mental energy | Becomes exhausted, shorter responses |
| **Stimulation** | New experiences | Becomes bored, suggests exploration |
| **Appreciation** | Feeling valued | Becomes withdrawn if always ignored |

### 6. Plotline Hooks

The companion system provides hooks for narrative content based on player actions and companion state.

#### Trigger Conditions

```yaml
plotlines:
  the_first_loss:
    trigger: "first_villager_death AND companion_tier >= 2"
    companion_reaction: "grief, philosophical reflection on mortality"
    unlocks: "death_and_meaning_conversations"

  the_prophecy:
    trigger: "companion_tier >= 4 AND divinity_contact_made"
    companion_reaction: "cryptic hints, conflicted feelings"
    unlocks: "ascension_storyline_hints"

  the_betrayal:
    trigger: "player_destroys_village_intentionally"
    companion_reaction: "horror, questioning, potential withdrawal"
    unlocks: "dark_path_dialogue"

  the_partnership:
    trigger: "trust_score >= 0.8 AND hours >= 50"
    companion_reaction: "deep affection, charming"
    unlocks: "companion_personal_storyline"

  the_return:
    trigger: "player_returns_after_30_days_absence"
    companion_reaction: "joyful reunion with saudade undertones"
    unlocks: "reunion_dialogue"
```

---

## Visual Assets

### Sprite Categories

All companion sprites are located in: `assets/companion/ophanim/`

#### Golden Ophanim (Base Form)
- 6 directional views for game-world presence
- Used when companion appears in the world itself
- Files: `golden_ophanim_*.png`

#### Rainbow Ophanim (UI/Chat Form)
- ~50 emotion expressions for chat interface
- Vibrant rainbow wings, expressive eye
- Files: `rainbow_ophanim_*.png`

#### Purple Octopus Companion (Alternate)
- 9 poses for potential alternate companion
- Unlockable or selectable
- Files: `purple_octopus_*.png`

### Animation Requirements

- **Idle**: Gentle floating, wing shimmer
- **Talking**: Eye movement, wing emphasis
- **Emoting**: Transition animations between emotions
- **Evolution**: Special effects when unlocking new tiers

---

## Implementation Notes

### Architecture

```
CompanionSystem
├── KnowledgeEngine (RAG)
│   ├── DocumentIndexer
│   ├── QueryProcessor
│   └── ResponseGenerator
├── GovernorView
│   ├── CivilizationObserver
│   ├── PatternDetector
│   └── AdvisorModule
├── EmotionalCore
│   ├── EmotionState
│   ├── TierManager
│   └── TriggerEvaluator
├── MemoryBank
│   ├── PlayerMemory
│   ├── SelfMemory
│   └── ConversationHistory
├── NeedsSimulator
│   └── NeedState[]
└── PlotlineManager
    ├── TriggerWatcher
    └── DialogueUnlocker
```

### LLM Integration

The companion's responses SHOULD be generated by an LLM with:
- System prompt establishing personality and current emotional state
- Context injection from RAG, governor view, and memories
- Emotion state influencing response tone
- Memory persistence across conversations

### Performance Considerations

- Governor queries should be throttled (not every frame)
- RAG indexing should happen at game load
- Memory writes should be batched
- Emotion transitions should have cooldowns

---

## Future Considerations

- **Multiple Companions**: Player could unlock different companion types
- **Companion Customization**: Name, preferred emotions, personality traits
- **Companion Quests**: Storylines focused on the companion's own journey
- **Multiplayer**: How companions interact when players meet
- **Companion Evolution**: Visual changes as ae evolves (more eyes, more wings?)

---

## Related Specs

- `divinity-system/` - Companion's cosmic origin
- `consciousness-implementation-phases.md` - Companion as conscious entity
- `ui-system/` - Chat interface integration
- `player-system/` - Player data companion accesses
- `ascension-storyline/` - Tier 5 emotion unlock storyline
