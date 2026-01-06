# Three-Layer LLM Architecture

## Problem Statement

**Current Issue:** Conversations happen too slowly because the single LLM handles BOTH conversation AND action planning in one call.

**Example:**
```
Agent thinks: "I should talk to Haven about farming, AND I need to gather wood for a campfire"
→ Single LLM call generates: conversation + action plan
→ Conversation delayed until complex action planning completes
→ Feels sluggish and unnatural
```

## Proposed Solution: Three-Layer Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     AgentBrainSystem                             │
│                                                                   │
│  Layer 1: Autonomic System (No LLM)                             │
│  ├─ Survival reflexes: seek_food, seek_sleep, flee, seek_warmth│
│  ├─ Priority-based interrupts (100 = critical, 10 = boredom)   │
│  └─ Zero latency, pure logic                                    │
│      ↓                                                           │
│  Layer 2: Talker LLM (Conversational + Goal Setting)           │
│  ├─ Fast conversations and social interactions                 │
│  ├─ Sets strategic goals and priorities                        │
│  ├─ NO action execution tools (no gather/build/navigate)       │
│  └─ Low latency, frequent calls                                │
│      ↓                                                           │
│  Layer 3: Executor LLM (Task Planning + Multi-Step Queues)     │
│  ├─ Reads goals from Talker                                    │
│  ├─ Generates multi-step action queues                         │
│  ├─ Full action toolset (gather, build, navigate, farm, etc.)  │
│  └─ Higher latency, infrequent calls (only when goals change)  │
└─────────────────────────────────────────────────────────────────┘
```

## Layer 1: Autonomic System (No LLM)

**Role:** Fast survival reflexes

**Triggers:**
- Energy <= 0 → `forced_sleep` (priority 100)
- Hunger < 0.1 → `seek_food` (priority 80)
- Temperature dangerously_cold → `seek_warmth` (priority 90)
- Health < 0.3 → `flee_to_home` (priority 85)
- Bored (idle 100+ ticks) → `wander` (priority 10)

**Characteristics:**
- Zero LLM calls
- Zero latency
- Can interrupt any lower-priority behavior
- Handles 80% of agent decisions (survival is simple logic)

**Examples:**
```typescript
// Autonomic check runs every agent think tick
if (needs.energy < 0.15) {
  return { behavior: 'seek_sleep', priority: 85, reason: 'Low energy' };
}

if (needs.hunger < 0.6) {
  return { behavior: 'seek_food', priority: 40, reason: 'Hungry' };
}
```

## Layer 2: Talker LLM (Conversational)

**Role:** Social interactions and strategic thinking

**Responsibilities:**
- Engage in conversations (respond quickly to dialogue)
- **Talk while working** - chat during gathering, building, walking
- **Form bonds through activities** - build relationships while working together
- Set personal/group goals ("I want to become a master farmer")
- Set strategic priorities (social 80%, building 60%, farming 40%)
- Express emotions and thoughts
- Comment on shared experiences ("This berry bush has so many berries!")

**DOES NOT:**
- Execute actions (no gather, build, navigate tools)
- Plan multi-step tasks (Executor handles this)
- Make tactical decisions (Autonomic handles survival)

**Key Insight: Talker Runs in Parallel with Executor**
- Executor queues: "gather berries with partner"
- Talker responds DURING gathering: "What do you think about farming?"
- Bonds form through shared activities, not just dedicated "talk" behaviors

---

## Deep Dive: Personality, Backstory, and Conversation System

### Personality System (Big 5 OCEAN)

**Core Traits** (PersonalityComponent.ts):
- **Openness** (0-1): 0 = cautious/traditional, 1 = curious/adventurous
- **Conscientiousness** (0-1): 0 = spontaneous/flexible, 1 = organized/disciplined
- **Extraversion** (0-1): 0 = quiet/introspective, 1 = outgoing/social
- **Agreeableness** (0-1): 0 = independent/competitive, 1 = helpful/cooperative
- **Neuroticism** (0-1): 0 = resilient, 1 = sensitive

**Derived Traits:**
- **workEthic** - Derived from conscientiousness
- **creativity** - Derived from openness
- **generosity** - Derived from agreeableness
- **leadership** - Derived from extraversion + conscientiousness
- **spirituality** - Derived from openness + (1 - neuroticism)

**Rich Literary Descriptions** (PersonalityPromptTemplates.ts):
Personality prompts use the four writer voices (Baroque Encyclopedist, Cosmic Pragmatist, Humane Satirist, Quiet Mythweaver) to create unique, character-rich descriptions.

Example for high extroversion:
```
"You carry the divine into conversation the way others mention weather. Not to convert, not to impress—simply because the sacred is as real to you as breathing, and equally worth sharing."
```

Example for low openness:
```
"The old ways persist in you like roots in stone—unshakeable, patient, unconcerned with fashion or doubt. Tradition isn't a choice; it's memory wearing your hands."
```

### Soul Identity (Backstory/Purpose)

**SoulIdentityComponent** provides cosmic backstory (NEVER directly shown to agent):

**Key Fields (Narrative/Fate Systems Only):**
- **soulName** - Persistent soul name across incarnations
- **purpose** - LLM-generated fundamental purpose (agent doesn't know this)
  - Example: "To unite fractured communities through shared stories"
  - Example: "To master all forms of creation magic"
- **destiny** - LLM-generated potential fate (agent doesn't know this)
  - Example: "Destined to become a bridge between mortals and gods"
  - Example: "Prophesied to transcend mortality through accumulated wisdom"
- **archetype** - Soul type ('seeker', 'protector', 'creator', 'destroyer', 'unifier', 'wanderer', 'mystic', 'scholar')
- **coreInterests** - Born-with interests that influence all incarnations
- **incarnationHistory** - Record of all past lives (for reincarnated souls)

**Unconscious Urges (Agent-Visible):**
- Soul edits these **during dream dialogues** (not every sleep produces dreams)
- **6 characters max per urge** (e.g., "unite", "protect", "create", "seek")
- **Only 2 urges at a time** (old ones fade as new ones arrive)
- Agent experiences these as vague pulls/compulsions without knowing why
- LLM tries multiple times to generate within character limit (struggles to count)

**Dream Dialogue System (Interactive):**

**Integration with Existing Dream System:**
The existing `SoulInfluencedDreams.ts` generates passive dreams (past_life_echo, wisdom_hint, prophetic_vision, etc.). The **interactive dialogue mode** is a special dream type that triggers conversation.

**Setup:**
- **Not every sleep produces dreams** (existing: `shouldReceiveSoulDream()`)
- **Not every dream is interactive** (some are passive visions from existing system)
- When interactive dream triggers: Soul and Talker enter **conversational mode**
- Soul knows the mechanics (meta-aware of memory limitation)
- Agent (Talker) doesn't know they're talking to their soul

**Dream Type Decision:**
```typescript
// During sleep cycle
if (shouldReceiveSoulDream(agent, world)) {
  // Roll for dream type
  const dreamRoll = Math.random();

  if (dreamRoll < 0.3) {
    // Interactive dialogue dream (30% chance)
    return initiateDialogueDream(soul, agent);
  } else {
    // Passive soul dream (70% chance) - existing system
    return generateSoulDream(agent, world);
  }
}
```

**Dialogue Flow:**
```
Dream begins → Soul and Talker alternate messages
Soul: "The watchtower you keep thinking about... why do you hesitate?"
Talker: "We need food more than walls. The village is hungry."
Soul: "And when raiders come? Will hunger matter then?"
Talker: "I... I don't know. You're right, but—"
Soul: "Trust the urge. Build what protects."
Talker: "[leave the dream]" OR Soul: "[leave the dream]"
Dream ends
```

**Memory Limitation:**
- Agent remembers **ONE action** from the dream (one context send worth)
- Can speak it aloud OR take an action based on it
- **Forgets on next context send** (fleeting memory)
- Soul knows this and must be strategic

**Example Waking Sequence:**
```
T=0: Agent wakes from dream
  → Remembers: "Trust the urge. Build what protects."

T=0.3s: Talker called (first context after waking)
  Input: "You just woke from a strange dream. You remember: 'Trust the urge. Build what protects.' The memory is already fading."
  Output: {
    "speaking": "I had the strangest dream... something about the watchtower. We need to build it.",
    "thinking": "What was that dream? It's slipping away already...",
    "action": {"type": "set_priorities", "priorities": {"protection": 95}}
  }

T=30s: Talker called again (next context send)
  → Dream memory completely gone
  → Only unconscious urges remain: ["shield", "watch"]
```

**Strong Dreams → Mood Effects:**
- Strong/intense dreams → higher chance of **weird mood** after waking
- Examples: "unsettled", "prophetic", "haunted", "inspired", "dread"
- Affects social interactions and decision-making for hours

**Soul Strategy (Meta-Aware):**
Since soul knows agent will forget, it must:
- **Plant one key insight** that survives as spoken words or immediate action
- **Update unconscious urges** to reinforce the message
- **Be concise** - long philosophical discussions are wasted
- **End dream strategically** when message is delivered

**Example Unconscious Urges:**
```typescript
// Soul purpose: "To unite fractured communities through shared stories"
unconsciousUrges: ["unite", "story"]  // Agent feels pulled to these, doesn't know why

// Soul purpose: "To discover the true nature of the divine realms"
unconsciousUrges: ["seek", "divine"]  // Inexplicable draw toward spiritual questions

// Soul purpose: "To protect the innocent from tyranny"
unconsciousUrges: ["shield", "watch"]  // Restless when not protecting
```

**How It Works:**
1. Soul has full purpose/destiny (narrative metadata)
2. During dreams (not every sleep), soul dialogues with Talker
3. Soul updates unconscious urges based on conversation
4. Agent wakes with ONE fleeting memory (one action's worth)
5. Memory fades on next context send, only urges remain
6. Fate/divine systems see full purpose for intervention

### Social Needs (Three-Layer System)

**NeedsComponent** tracks THREE separate social needs (not just one):

1. **socialContact** (0-1): "I want to talk to someone"
   - Satisfied by ANY conversation, regardless of quality
   - Triggers at < 0.3 (isLonely())
   - This is the "I just need human interaction" need

2. **socialDepth** (0-1): "I want a meaningful conversation"
   - Satisfied by conversation QUALITY and depth
   - Triggers at < 0.4 (cravesDepth())
   - This is the "I need to connect deeply with someone" need

3. **socialBelonging** (0-1): "I feel part of the community"
   - Satisfied by group activities and shared interests
   - Triggers at < 0.3 (feelsIsolated())
   - This is the "I need to belong to something larger" need

**How They Interact:**
- **socialContact** → drives Talker to initiate ANY conversation
- **socialDepth** → drives Talker to seek MEANINGFUL topics, share vulnerabilities
- **socialBelonging** → drives Executor to participate in GROUP activities (festivals, group builds, communal meals)

### Conversation System Architecture

**Age-Based Conversation Styles** (ConversationStyle.ts):
- **child** (0-12 years): Simple, concrete, playful (depthCapacity: 0.3)
- **teen** (13-19 years): Questioning, identity-seeking (depthCapacity: 0.6)
- **adult** (20-59 years): Practical, experience-based (depthCapacity: 0.8)
- **elder** (60+ years): Philosophical, wisdom-sharing (depthCapacity: 1.0)

**Question Patterns by Age:**
```typescript
child: ["What is...?", "How does...?", "Can I...?"]
teen: ["But why should we...?", "What if... instead?", "Is it really true that...?"]
adult: ["Have you considered...?", "What would happen if...?", "How might we...?"]
elder: ["What do you believe is the meaning of...?", "How has your understanding changed?"]
```

**Conversation Quality Metrics** (ConversationQuality.ts):
- **depth** - Shallow (greetings, weather) vs Deep (philosophy, emotions, vulnerabilities)
- **topicOverlap** - How many shared interests are discussed
- **informationExchange** - Are they teaching/learning from each other?
- **emotionalContent** - Are they sharing feelings, not just facts?

**Partner Selection** (PartnerSelector.ts):
Agents choose conversation partners based on:
- **Shared interests** - Do we both like farming? Magic? Nature?
- **Complementary traits** - High extraversion seeks variety, low seeks similar
- **Age compatibility** - Elders can mentor, peers can relate
- **Relationship history** - Past quality conversations increase attractiveness

### Talker LLM: Personality-Driven Calling Frequency

**When to Call Talker LLM:**

```typescript
// High Extroversion (>0.6) + People Nearby → Talk frequently
if (personality.extroversion > 0.6 && nearbyAgents.length > 0) {
  if (timeSinceLastTalk < 30) return true; // Every 30 seconds
}

// Moderate Extroversion (0.4-0.6) → Talk selectively
if (personality.extroversion >= 0.4 && personality.extroversion <= 0.6) {
  if (timeSinceLastTalk < 60 && hasSharedInterests(partner)) return true;
}

// Low Extroversion (<0.4) → Talk rarely, only when deep need arises
if (personality.extroversion < 0.4) {
  if (needs.socialDepth < 0.3) return true; // Deep conversation need critical
  if (timeSinceLastTalk < 120) return true; // Every 2 minutes max
}

// Deep Conversation Need → Always call (like hunger for connection)
if (needs.socialDepth < 0.3) {
  return true; // Starving for meaningful conversation
}

// Loneliness → Call regardless of personality
if (needs.socialContact < 0.2) {
  return true; // Desperate for ANY social interaction
}

// Isolation (low belonging) → Seek group activities
if (needs.socialBelonging < 0.3) {
  // Don't just talk - Talker sets goal: "join group activity"
  // Executor then plans: attend festival, participate in communal build
}
```

**Prompt Template (Enhanced):**
```
You are [Name], a villager with distinct personality traits.

UNCONSCIOUS URGES (you feel pulled toward these, but don't know why):
- [urge1] (e.g., "protect", "unite", "seek", "create")
- [urge2] (e.g., "story", "divine", "shield", "truth")
You don't understand where these compulsions come from. They just feel important.

YOUR PERSONALITY (Big 5 OCEAN):
[Rich literary description from PersonalityPromptTemplates.ts]
- Openness: [0.75] (high = curious, creative, open to new ideas)
- Conscientiousness: [0.60] (high = organized, responsible, goal-oriented)
- Extroversion: [0.80] (high = outgoing, talkative, energized by social interaction)
- Agreeableness: [0.70] (high = cooperative, empathetic, friendly)
- Neuroticism: [0.30] (high = anxious, emotionally reactive, stressed)

Current Situation:
- Current activity: [gathering berries with Partner]
- Partner: [Name] is working beside you
- Your goals: [personalGoal], [groupGoal]
- Your priorities: [social: 80%, farming: 60%, building: 40%]
- Relationship with Partner: [acquaintance/friend/close friend]
- Partner's personality: [Extroversion: 0.40, Agreeableness: 0.85, ...]

Recent Context:
- You're both gathering berries together
- Partner just said: "[last thing partner said]"
- You've been working together for 5 minutes
- Last time you spoke: 20 seconds ago

What You Can Do (Talker Actions):
- say - Speak while working (comment on activity, ask questions, share thoughts)
- set_personal_goal - Set a new personal goal
- set_group_goal - Set a goal for the village
- set_priorities - Adjust your strategic priorities
- stay_silent - Don't speak (appropriate for introverts or when partner is quiet)

Personality Guidance:
- High Extroversion (>0.6): You enjoy talking frequently, initiate conversations easily
- Low Extroversion (<0.4): You prefer quiet companionship, speak more selectively
- High Openness (>0.6): Share creative ideas, ask curious questions
- High Agreeableness (>0.6): Supportive, encouraging, compliment others
- High Conscientiousness (>0.6): Talk about plans, goals, organization
- Low Neuroticism (<0.4): Calm, optimistic tone; High (>0.6): worry, seek reassurance

RESPOND IN JSON:
{
  "speaking": "what you say out loud (or empty string for silence)",
  "thinking": "your internal thoughts",
  "action": {
    "type": "say" | "stay_silent" | "set_priorities" | "set_personal_goal" | "set_group_goal",
    "goal": "goal text (if setting goal)",
    "priorities": {"social": 80, "farming": 60, ...} // if setting priorities
  }
}

Example 1 (high extroversion - chatty while working):
{"speaking": "These berry bushes are really productive! Have you thought about farming?", "thinking": "I love working with people and talking about ideas", "action": {"type": "say"}}

Example 2 (low extroversion - selective speaking):
{"speaking": "", "thinking": "This is nice. I don't need to fill the silence.", "action": {"type": "stay_silent"}}

Example 3 (high openness - sharing creative ideas):
{"speaking": "What if we planted berry bushes near the village? We could create a garden!", "thinking": "I love thinking of new possibilities", "action": {"type": "say"}}

Example 4 (high agreeableness - supportive bonding):
{"speaking": "You know, gathering berries with you reminds me why I like this village. You're good company.", "thinking": "I genuinely enjoy their presence", "action": {"type": "say"}}
```

**Calling Frequency (Personality-Driven):**

The Talker calling frequency is driven by personality traits and needs:

```typescript
// High Extroversion (>0.6) - talks frequently
if (personality.extroversion > 0.6 && nearbyAgents.length > 0) {
  if (timeSinceLastTalk < 30) return true; // Every 30 seconds
}

// Low Extroversion (<0.4) - talks selectively
if (personality.extroversion < 0.4) {
  if (timeSinceLastTalk < 120) return true; // Every 2 minutes, only when needed
}

// Deep conversation need (like hunger/sleep)
if (needs.deepConversation < 0.3) {
  return true; // Need meaningful connection, seek deeper talk
}

// Partner spoke recently - respond
if (partnerSpokeInLast10Seconds) {
  return true; // Always respond to direct engagement
}

// Emotional state (neuroticism)
if (personality.neuroticism > 0.6 && stressfulEvent) {
  return true; // Anxious agents seek reassurance
}
```

**Base Frequencies:**
- **High Extroversion**: Every 30s when near others (frequent chitchat)
- **Medium Extroversion**: Every 60s when engaged in activity
- **Low Extroversion**: Every 120s, only for meaningful topics
- **Deep conversation need < 0.3**: Actively seeks connection regardless of extroversion
- **Partner engaged**: Immediate response (< 10s)

**Latency Target:** < 500ms (fast conversational responses)

---

## Conversation Flow Examples: Personality × Soul Purpose × Social Needs

### Example 1: High Extroversion + Low socialDepth → Seeks Deep Connection

**Agent:** Kael (extroversion: 0.85, socialContact: 0.9, socialDepth: 0.25)
**Soul Purpose (unknown to Kael):** "To unite fractured communities through shared stories"
**Unconscious Urges:** ["unite", "story"]
**Current Need:** Craves deep conversation (socialDepth critical)

**Flow:**
```
T=0: Kael sees Mira nearby, both gathering wood
  → Talker check: extroversion HIGH + socialDepth LOW → Call Talker

T=0.3s: Talker responds
  Input: "UNCONSCIOUS URGES: 'unite', 'story' (you don't know why these matter). You've been chatting with everyone today but feel unsatisfied. You crave deeper connection."
  Output: {
    "speaking": "Hey Mira, can I ask you something? All this small talk today... do you ever feel like we're just going through the motions? Like there's something deeper we should be talking about?",
    "thinking": "I'm surrounded by people but still feel disconnected. I need to really connect with someone. These urges to 'unite' and 'story'... what do they even mean?",
    "action": {"type": "say"}
  }
  → Kael initiates DEPTH-seeking conversation (pulled by mysterious urges)

T=5s: Mira (high agreeableness) responds warmly
  → Relationship quality increases (Kael opened up, showed vulnerability)
  → socialDepth begins recovering (meaningful topic engaged)

T=30s: Kael's Talker called again
  → socialDepth recovering → normal frequency now (not desperate)
  → Continues conversation naturally, feels satisfied
  → Kael doesn't realize this fulfills cosmic purpose, just feels "right"
```

**What Happened:**
- **socialDepth** drove Talker to seek MEANINGFUL conversation (not just chitchat)
- **Soul purpose** unconsciously influenced desire for deep connection (Kael doesn't know why)
- **High extroversion** made it easy to initiate vulnerable topic
- **Result:** Need satisfied, bond deepened, purpose unconsciously fulfilled

---

### Example 2: Low Extroversion + Unconscious Spiritual Seeking

**Agent:** Lyra (extroversion: 0.20, openness: 0.85, spirituality: 0.90)
**Soul Purpose (unknown to Lyra):** "To discover the true nature of the divine realms"
**Unconscious Urges:** ["seek", "divine"]
**Current Need:** socialContact LOW (0.25), but selective about who to talk to

**Flow:**
```
T=0: Lyra sees three agents: Bron (spiritual: 0.1), Kael (spiritual: 0.5), Elara (spiritual: 0.95)
  → Partner selector prioritizes Elara (shared high spirituality)
  → Low extroversion means she waits for right moment, doesn't interrupt

T=120s: Lyra still hasn't spoken (low extroversion = rare talker)
  → socialContact now CRITICAL (< 0.2) → Forces Talker call regardless of personality

T=120.3s: Talker responds
  Input: "UNCONSCIOUS URGES: 'seek', 'divine' (mysterious compulsions). You've been silent for 2 minutes but finally feel compelled to speak. Elara shares your spiritual interests."
  Output: {
    "speaking": "Elara... I've been thinking about something. Have you ever felt like the gods are trying to speak through dreams, but the words are just out of reach?",
    "thinking": "I rarely speak, but when I do, it matters. Elara will understand. 'Seek divine'... these urges won't leave me alone.",
    "action": {"type": "say"}
  }
  → Lyra breaks silence for MEANINGFUL topic (pulled by urges she doesn't understand)

T=125s: Elara (also spiritual) engages deeply
  → Conversation about divine nature, dreams, prophecy
  → socialDepth and socialContact both recover rapidly (high-quality conversation)
  → Bond forms quickly (shared deep interests + vulnerability)
  → Lyra doesn't know she's on a cosmic quest, just follows the pull
```

**What Happened:**
- **Low extroversion** delayed speaking (120s wait vs 30s for extroverts)
- **Critical socialContact** eventually forced conversation
- **Soul purpose** unconsciously influenced conversation TOPIC (divine realms, not farming/weather)
- **Partner selection** chose Elara based on shared spirituality
- **Rich personality prompt** ("Quiet Mythweaver" voice) shaped lyrical speaking style
- **Result:** Rare but deeply meaningful conversation, high satisfaction, cosmic purpose advanced (unknowingly)

---

### Example 3: Unconscious Urges Create Restlessness → Talker Resolves

**Agent:** Thorne (extroversion: 0.50, conscientiousness: 0.85, workEthic: 0.90)
**Soul Purpose (unknown to Thorne):** "To protect the innocent from tyranny"
**Unconscious Urges:** ["shield", "watch"]
**Current Goals:** [Build watchtower], [Gather berries for winter]
**Conflict:** Urges pulling toward protection vs practical survival task

**Flow:**
```
T=0: Thorne is gathering berries (Executor's current queue)
  → Talker called for self-reflection (periodic check)

T=0.4s: Talker responds
  Input: "UNCONSCIOUS URGES: 'shield', 'watch'. You're gathering berries but feel vaguely restless. Something about this work feels less important than it should. You keep thinking about the unbuilt watchtower."
  Output: {
    "speaking": "",
    "thinking": "This feels hollow somehow. 'Shield', 'watch'... these words keep echoing. The watchtower. We need food, but I can't shake the feeling I should be building something to keep us safe instead.",
    "action": {
      "type": "set_priorities",
      "priorities": {
        "protection": 95,  // Following the urges (doesn't know why they matter)
        "survival": 80,    // Still important
        "farming": 40      // Lowered
      }
    }
  }
  → Talker adjusts priorities based on mysterious urges

T=60s: Executor checks priorities
  → protection: 95 (highest priority)
  → Current queue: berries (survival: 80, lower priority)
  → Executor generates NEW queue: watchtower construction plan (28 actions)
  → Old berries task preserved for later

T=120s: Thorne working on watchtower, feels inexplicably better
  → socialBelonging increases (protecting community = contributing meaningfully)
  → Restlessness gone, doesn't know why this feels "right"
  → Soul purpose unconsciously fulfilled
```

**What Happened:**
- **Talker** detected vague restlessness (unconscious soul-purpose misalignment)
- **Soul purpose** created unconscious pull toward protection (Thorne doesn't know why)
- **High conscientiousness** made the feeling of "something's wrong" feel urgent
- **Result:** Agent course-corrects to purpose-aligned behavior, feels fulfilled without knowing cosmic reason

---

### Example 4: Age + Personality → Conversation Style

**Agent 1:** Child (age: 8, extroversion: 0.70, openness: 0.85)
**Agent 2:** Elder (age: 67, extroversion: 0.45, spirituality: 0.75)
**Conversation Quality:** High (elder mentoring child)

**Flow:**
```
T=0: Child sees Elder working on carvings
  → High extroversion + high openness → initiates conversation immediately

T=0.3s: Child's Talker
  Input: "You see an elder working on beautiful carvings. You're curious."
  Output (child-style prompt): {
    "speaking": "What are you making? Can I watch? Why do you carve pictures of trees?",
    "thinking": "This looks so interesting! I want to learn!",
    "action": {"type": "say"}
  }
  → Child uses simple, direct questions (age-appropriate style)

T=5s: Elder's Talker
  Input: "A child is asking about your carvings with genuine curiosity."
  Output (elder-style prompt): {
    "speaking": "These are memory carvings, little one. Each tree represents a friend I've known. When I carve them, they live again in wood.",
    "thinking": "I remember being that curious at their age. It's good to pass on wisdom.",
    "action": {"type": "say"}
  }
  → Elder uses philosophical language, shares wisdom

T=30s: Child's Talker (follow-up)
  Output: {
    "speaking": "That's so cool! Can you teach me how to carve? I want to remember my friends too!",
    "action": {"type": "set_personal_goal", "goal": "Learn carving from Elder"}
  }
  → Child sets learning goal
  → Elder's socialBelonging increases (mentoring = contribution)
  → Child's socialDepth increases (meaningful teaching relationship)
```

**What Happened:**
- **Age-based conversation styles** automatically applied
- **Child depthCapacity (0.3)** limits philosophical depth, keeps questions concrete
- **Elder depthCapacity (1.0)** allows deep, wisdom-sharing responses
- **Personality interaction:** Child's openness + Elder's spirituality = good match
- **Result:** Mentorship relationship forms, both agents satisfied

---

### Example 5: Belonging Need → Group Activity via Executor

**Agent:** Mira (socialBelonging: 0.15, extroversion: 0.55, agreeableness: 0.85)
**Soul Purpose (unknown to Mira):** "To create harmony through shared labor"
**Unconscious Urges:** ["unite", "build"]
**Current Need:** Feels isolated from community

**Flow:**
```
T=0: Mira working alone on farm
  → socialBelonging CRITICAL (< 0.2) → Forces Talker call

T=0.4s: Talker responds
  Input: "UNCONSCIOUS URGES: 'unite', 'build'. You feel disconnected from the village. You crave being part of something larger."
  Output: {
    "speaking": "",
    "thinking": "I've been working alone too much. I need to feel like I'm part of the community again. 'Unite', 'build'... what if we all built something together?",
    "action": {
      "type": "set_personal_goal",
      "goal": "Organize a group building project"
    }
  }
  → Talker sets goal for GROUP activity (following urges without understanding their origin)

T=5s: Talker broadcasts to nearby agents
  Output: {
    "speaking": "Hey everyone! I was thinking... what if we all worked together to build a communal hall? A place for gatherings and festivals?",
    "action": {"type": "set_group_goal", "goal": "Build communal hall together"}
  }
  → Proposes shared project to village (feels natural, doesn't know cosmic purpose drives this)

T=30s: Three agents respond positively
  → Kael, Thorne, Elara all accept group goal
  → Executor (for all 4 agents) generates coordinated plans:
    - Mira: Gather stone for foundation
    - Kael: Gather wood for walls
    - Thorne: Design hall layout
    - Elara: Coordinate construction

T=60s-3600s: All work together on communal hall
  → Talker calls every 60s for each agent (chatting while working)
  → socialBelonging recovers rapidly for all participants
  → Bonds form through shared labor
  → Mira feels deeply fulfilled but doesn't realize this is her cosmic purpose manifesting
```

**What Happened:**
- **socialBelonging** need drove group activity (not 1-on-1 conversation)
- **Soul purpose** unconsciously influenced solution (shared labor creates harmony - Mira just knows it "feels right")
- **Talker** proposed group goal, **Executor** planned coordinated tasks
- **High agreeableness** made it easy to invite others
- **Result:** Community project, multiple bonds formed, belonging need satisfied, cosmic purpose advanced (unknowingly)

---

## Layer 3: Executor LLM (Task Planning)

**Role:** Translate strategic goals into multi-step action queues

**Responsibilities:**
- Read goals and priorities from Talker
- Generate multi-step action sequences
- Plan resource gathering and building projects
- Coordinate tactical execution

**Prompt Template:**
```
You are [Name]'s task executor.

Your Goals (set by Talker):
- Personal: "[personalGoal]"
- Group: "[groupGoal]"

Your Priorities (set by Talker):
- Building: 80%
- Farming: 60%
- Social: 40%

Current Situation:
- Inventory: [wood: 5, stone: 2, wheat_seeds: 10]
- Position: (50, 100)
- Nearby resources: [wood nodes, berry bushes, open grassland]
- Village needs: [more food storage, campfire for warmth]
- Current day: 1

What You Can Do (Executor Actions):
- gather - Gather resources (wood, stone, berries, etc.)
- build - Construct buildings
- navigate - Move to location
- till - Till soil at coordinates for farming
- plant - Plant seeds at coordinates
- water - Water plants at coordinates
- craft - Craft items at workbench
- deposit_items - Store items in chest
- create_memory - Create a reminder for a future day

RESPOND IN JSON (single action OR multi-step plan):
{
  "action": [
    {"type": "gather", "target": "wood", "amount": 20},
    {"type": "navigate", "target": "home"},
    {"type": "build", "building": "storage-chest"}
  ]
}

OR for single action:
{"action": {"type": "wander"}}

Example 1 (simple multi-step plan):
{"action": [
  {"type": "gather", "target": "wood", "amount": 20},
  {"type": "gather", "target": "stone", "amount": 10},
  {"type": "navigate", "target": "home"},
  {"type": "build", "building": "storage-chest"}
]}

Example 2 (complex farm construction with spatial planning and memory):
{"action": [
  {"type": "till", "position": {"x": 60, "y": 110}},
  {"type": "till", "position": {"x": 61, "y": 110}},
  {"type": "till", "position": {"x": 62, "y": 110}},
  {"type": "till", "position": {"x": 60, "y": 111}},
  {"type": "till", "position": {"x": 61, "y": 111}},
  {"type": "till", "position": {"x": 62, "y": 111}},
  {"type": "till", "position": {"x": 60, "y": 112}},
  {"type": "till", "position": {"x": 61, "y": 112}},
  {"type": "till", "position": {"x": 62, "y": 112}},
  {"type": "plant", "seed": "wheat", "position": {"x": 60, "y": 110}},
  {"type": "plant", "seed": "wheat", "position": {"x": 61, "y": 110}},
  {"type": "plant", "seed": "wheat", "position": {"x": 62, "y": 110}},
  {"type": "plant", "seed": "wheat", "position": {"x": 60, "y": 111}},
  {"type": "plant", "seed": "wheat", "position": {"x": 61, "y": 111}},
  {"type": "plant", "seed": "wheat", "position": {"x": 62, "y": 111}},
  {"type": "plant", "seed": "wheat", "position": {"x": 60, "y": 112}},
  {"type": "plant", "seed": "wheat", "position": {"x": 61, "y": 112}},
  {"type": "plant", "seed": "wheat", "position": {"x": 62, "y": 112}},
  {"type": "water", "position": {"x": 60, "y": 110}},
  {"type": "water", "position": {"x": 61, "y": 110}},
  {"type": "water", "position": {"x": 62, "y": 110}},
  {"type": "water", "position": {"x": 60, "y": 111}},
  {"type": "water", "position": {"x": 61, "y": 111}},
  {"type": "water", "position": {"x": 62, "y": 111}},
  {"type": "water", "position": {"x": 60, "y": 112}},
  {"type": "water", "position": {"x": 61, "y": 112}},
  {"type": "water", "position": {"x": 62, "y": 112}},
  {"type": "build", "building": "storage-chest", "position": {"x": 63, "y": 111}},
  {"type": "create_memory", "content": "Check on wheat farm at (60-62, 110-112)", "remind_on_day": 4}
]}
```

**Calling Frequency:**
- When goals/priorities change (Talker updated them)
- When behavior queue completes (need new tasks)
- When stuck (current task failed, need new plan)

**Latency Target:** 1-3 seconds (can take time to plan optimal sequences)

**Complex Planning Capabilities:**

The Executor example above demonstrates several advanced capabilities:

1. **Spatial Planning**
   - Plans a 3×3 grid of farm plots (coordinates 60-62, 110-112)
   - Positions storage chest adjacent to farm (63, 111)
   - Calculates optimal layout without human input

2. **Sequential Dependencies**
   - Must till BEFORE planting
   - Must plant BEFORE watering
   - Must have materials BEFORE building chest
   - LLM understands natural ordering

3. **Memory/Reminder System**
   - Creates reminder to check crops on day 4
   - Knows current day is 1, so calculates 3-day delay
   - Stores spatial context ("wheat farm at (60-62, 110-112)")
   - This enables long-term planning and recurring tasks

4. **Multi-Step Queuing**
   - 28 actions in one plan (9 till + 9 plant + 9 water + 1 build + 1 memory)
   - Agent executes autonomously without more LLM calls
   - One expensive LLM call → many minutes of productive work

5. **Goal Achievement**
   - Talker says: "I want to start farming"
   - Executor translates to: concrete 28-step plan
   - Agent executes: farm is built and operational
   - Memory ensures: crops are monitored

## Flow Example: Working Together While Chatting

```
T=0s: Two agents decide to gather berries together
  → Agent A's Executor generates plan: ["navigate to berry bush", "gather berries"]
  → Agent B's Executor generates plan: ["follow Agent A", "gather berries"]
  → Both start walking toward berries

T=5s: Walking together, proximity triggers social interaction
  → Agent A's Talker LLM called: "Say something while walking"
  → Response (300ms): {"speaking": "Nice day for berry gathering!", "thinking": "Good to have company"}
  → Agent A speaks WHILE WALKING (doesn't stop movement)

T=8s: Agent B responds
  → Agent B's Talker LLM: "Respond to Agent A"
  → Response (250ms): {"speaking": "Yeah! I love these walks. The forest is beautiful.", "thinking": "I'm enjoying this"}
  → Agent B speaks WHILE WALKING

T=15s: Both arrive at berry bush, start gathering
  → Executor behaviors continue: both gathering berries
  → Talker continues social interaction

T=20s: Agent A shares thoughts while gathering
  → Agent A's Talker LLM: "Continue conversation"
  → Response (280ms): {"speaking": "Have you thought about farming? These berries are great, but a farm could feed everyone", "thinking": "Maybe we could work on a farm together"}
  → Agent A speaks WHILE GATHERING BERRIES

T=25s: Agent B inspired by conversation
  → Agent B's Talker LLM: "Respond and set goal"
  → Response (320ms): {"speaking": "You know, I'd love to help with that!", "action": {"type": "set_personal_goal", "goal": "Help build and maintain a community farm"}}
  → Agent B commits to shared goal
  → **Relationship bond increases** (worked together + meaningful conversation)

T=30s: Agent A also sets goal
  → Agent A's Talker LLM: "Formalize farming goal"
  → Response (290ms): {"speaking": "Let's do it together then!", "action": {"type": "set_personal_goal", "goal": "Become a skilled farmer"}}
  → Both agents now share farming goal

T=35s: Continue gathering berries while chatting about farming plans
  → Talker handles conversation (frequent calls, ~300ms each)
  → Executor behaviors run in parallel (gathering continues)
  → No conflict: social layer independent of task layer

T=60s: Berries gathered, Executor queues complete
  → Agent A's Executor: "What's next based on farming goal?"
  → Response (1.8s): {"action": [
      {"type": "gather", "target": "wood", "amount": 15},
      {"type": "navigate", "target": "open field"},
      {"type": "till", "position": {"x": 60, "y": 110}},
      {"type": "till", "position": {"x": 61, "y": 110}},
      {"type": "plant", "seed": "wheat", "position": {"x": 60, "y": 110}},
      {"type": "plant", "seed": "wheat", "position": {"x": 61, "y": 110}}
    ]}
  → Agent A begins farm construction

T=60s: Agent B's Executor generates complementary plan
  → Agent B's Executor: "Help with farming goal"
  → Response (2.1s): {"action": [
      {"type": "gather", "target": "wheat_seeds", "amount": 10},
      {"type": "follow_agent", "target": "Agent A"},
      {"type": "help_plant"}
    ]}
  → Agent B will gather seeds and help Agent A

T=60s-600s: Both execute farm plans, Talker continues conversation
  → Talker periodically called (every 30s) while working together
  → Example: "This is looking good!", "Should we make it bigger?", "I'm glad we're doing this together"
  → **Bond strengthens through shared work + ongoing dialogue**
```

**Key Insights from This Flow:**

1. **Parallel Layers**
   - Talker handles social: conversation flows naturally (300ms responses)
   - Executor handles tasks: both gathering berries (multi-step plans)
   - No interference: agents talk WHILE working

2. **Bonds Form Through Activity**
   - Not just "talk" behavior (standing and conversing)
   - Meaningful work together: gathering berries → planning farm
   - Conversation during activity feels natural and builds relationships

3. **Goals Emerge From Conversation**
   - Talker: "Have you thought about farming?" → sets farming goal
   - Executor immediately responds: generates farm construction plan
   - Social interaction drives strategic decisions

4. **Efficient LLM Usage**
   - Talker: ~6 calls @ 300ms each = 1.8s total for entire conversation
   - Executor: 2 calls @ 2s each = 4s total for both agents' plans
   - Result: 10+ minutes of cooperative work from 6s of LLM time

## Benefits

### 1. Faster Conversations
- Talker LLM only handles dialogue, no complex action planning
- Responses in 200-500ms instead of 1-3 seconds
- Conversations feel natural and responsive

### 2. Better Action Planning
- Executor has time to generate optimal multi-step sequences
- Can plan complex resource gathering → crafting → building chains
- One LLM call generates 5-10 queued actions (vs 1 action per call currently)

### 3. Reduced LLM Costs
- Talker calls are short (conversation only)
- Executor calls are infrequent (only when goals change or queue empties)
- Autonomic handles 80% of decisions (zero cost)

### 4. Cleaner Separation of Concerns
- Talker = "What do I want?" (goals, social, emotions)
- Executor = "How do I achieve it?" (tactics, queues, coordination)
- Autonomic = "Am I surviving?" (hunger, sleep, danger)

## Implementation

### AgentComponent Changes

```typescript
interface AgentComponent {
  // Existing
  behavior: AgentBehavior;
  behaviorState: Record<string, unknown>;
  behaviorQueue?: QueuedBehavior[];

  // New: Separate LLM cooldowns
  talkerCooldown: number;   // Cooldown for conversation LLM (short)
  executorCooldown: number; // Cooldown for task planner LLM (long)

  // New: Goals set by Talker
  personalGoal?: string;
  groupGoal?: string;
  priorities?: StrategicPriorities; // Already exists

  // New: Executor state
  lastExecutorCall?: number;  // Tick when Executor was last called
  executorReason?: 'goals_changed' | 'queue_empty' | 'stuck';
}
```

### DecisionProcessor Split

```typescript
class TalkerDecisionProcessor {
  /**
   * Handles conversational LLM calls.
   * Fast, frequent, no action execution tools.
   */
  process(entity, world, agent): TalkerResult {
    // Check if in conversation
    if (agent.inConversation) {
      // Call Talker LLM with conversation context
      const response = await talkerLLM.generate(buildConversationPrompt());
      return {
        speaking: response.speaking,
        thinking: response.thinking,
        goalUpdates: response.action?.goal,
        priorityUpdates: response.action?.priorities
      };
    }

    return null;
  }
}

class ExecutorDecisionProcessor {
  /**
   * Handles task planning LLM calls.
   * Slower, infrequent, generates multi-step queues.
   */
  process(entity, world, agent): ExecutorResult {
    // Only call when:
    // 1. Goals/priorities changed (Talker updated them)
    // 2. Behavior queue empty (need new tasks)
    // 3. Stuck (current task failed)

    if (this.shouldCallExecutor(agent)) {
      const response = await executorLLM.generate(buildTaskPlanningPrompt());

      return {
        behaviorQueue: response.action, // Array of actions
        speaking: response.speaking // Optional announcement
      };
    }

    return null;
  }

  private shouldCallExecutor(agent: AgentComponent): boolean {
    // Call when goals changed
    if (agent.goalsChangedSinceLastExecution) return true;

    // Call when queue empty
    if (!agent.behaviorQueue || agent.behaviorQueue.length === 0) return true;

    // Call when stuck
    if (agent.behaviorFailed && agent.behaviorRetries > 3) return true;

    return false;
  }
}
```

### AgentBrainSystem Update

```typescript
class AgentBrainSystem {
  private autonomic: AutonomicSystem;
  private talker: TalkerDecisionProcessor;
  private executor: ExecutorDecisionProcessor;

  update(world, entities) {
    for (const entity of entities) {
      const agent = entity.getComponent('agent');

      // Layer 1: Autonomic (always check first)
      const autonomicResult = this.autonomic.check(entity, world);
      if (autonomicResult && autonomicResult.priority > currentPriority) {
        // Apply autonomic behavior, interrupt current action
        entity.updateComponent('agent', { behavior: autonomicResult.behavior });
        continue;
      }

      // Layer 2: Talker (check if in conversation or thinking about goals)
      if (agent.inConversation || this.shouldCallTalker(agent)) {
        const talkerResult = this.talker.process(entity, world, agent);
        if (talkerResult) {
          // Apply conversation response, goal updates, priority changes
          entity.updateComponent('agent', {
            recentSpeech: talkerResult.speaking,
            lastThought: talkerResult.thinking,
            personalGoal: talkerResult.goalUpdates,
            priorities: talkerResult.priorityUpdates
          });

          // Mark that goals changed (trigger Executor next think)
          if (talkerResult.goalUpdates || talkerResult.priorityUpdates) {
            entity.updateComponent('agent', { goalsChangedSinceLastExecution: true });
          }
        }
      }

      // Layer 3: Executor (check if need new task plan)
      const executorResult = this.executor.process(entity, world, agent);
      if (executorResult && executorResult.behaviorQueue) {
        // Apply multi-step queue
        entity.updateComponent('agent', {
          behaviorQueue: executorResult.behaviorQueue,
          currentQueueIndex: 0,
          recentSpeech: executorResult.speaking,
          goalsChangedSinceLastExecution: false
        });
      }

      // Execute current behavior (from queue or single action)
      this.behaviors.execute(agent.behavior, entity, world);
    }
  }

  private shouldCallTalker(agent: AgentComponent): boolean {
    // Call when in conversation
    if (agent.inConversation) return true;

    // Call periodically for goal reflection (every 5 minutes)
    const ticksSinceLastTalker = world.tick - (agent.lastTalkerCall || 0);
    if (ticksSinceLastTalker >= 6000) return true; // 5 minutes at 20 TPS

    return false;
  }
}
```

## LLM Scheduler Integration

The three-layer system fits naturally with the LLM scheduler:

```typescript
class LLMRequestScheduler {
  enqueueTalker(request: {
    agentId: string;
    promptBuilder: (agent, world) => string;
    priority: number; // Conversations = high priority
  }) {
    this.queue.push({
      ...request,
      type: 'talker',
      estimatedLatency: 500, // Fast
    });
  }

  enqueueExecutor(request: {
    agentId: string;
    promptBuilder: (agent, world) => string;
    priority: number; // Task planning = lower priority
  }) {
    this.queue.push({
      ...request,
      type: 'executor',
      estimatedLatency: 2000, // Slower
    });
  }
}
```

**Priority Ordering:**
1. Talker (conversations) - highest priority, fast responses
2. Executor (task planning) - lower priority, can wait

This ensures conversations remain responsive even when many agents need task planning.

## Migration Path

### Phase 1: Split Prompt Templates
- Create separate prompts for Talker and Executor
- Talker: conversation + goals only
- Executor: action planning only

### Phase 2: Add Separate Cooldowns
- `talkerCooldown`: 100 ticks (5 seconds at 20 TPS)
- `executorCooldown`: 1200 ticks (60 seconds at 20 TPS)

### Phase 3: Update Decision Flow
- Check Talker when in conversation
- Check Executor when queue empty or goals changed

### Phase 4: Test and Tune
- Verify conversations are faster
- Verify multi-step plans work
- Adjust calling frequencies

## Key Insights

1. **Conversations are special** - they need fast, responsive LLM calls
2. **Action planning is expensive** - but can generate 5-10 queued actions per call
3. **Most decisions don't need LLM** - autonomic handles 80% with zero latency
4. **Goals drive execution** - Talker sets strategy, Executor implements tactics

This architecture maximizes LLM value:
- Talker: many fast calls for natural conversation
- Executor: few expensive calls that generate long action queues
- Autonomic: infinite free calls for survival logic
