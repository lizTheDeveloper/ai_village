# Idle Behaviors & Personal Goals Specification

## Overview

When agents have nothing pressing to do, they shouldn't just "idle" in a mechanical way. Instead, their downtime should reflect their personality, mood, and deeper motivations. This spec introduces:

1. **Personal Goal Formation** - Agents set longer-term aspirations based on personality and affinities
2. **Varied Idle Behaviors** - Mood-driven activities when there's nothing urgent to do
3. **Reflection System** - Periodic introspection that shapes future behavior

## Core Principle: Idle Time is Character Time

Downtime reveals character. A conscientious agent might use idle time to plan ahead. An extraverted agent seeks conversation. A creative agent daydreams about projects. The absence of urgent tasks is an opportunity for personality expression, not a void to fill with generic "idle" animations.

## Core Principle: Goals Emerge from Identity

Agents don't just react to village needs - they have personal aspirations shaped by who they are. A builder doesn't just build because the village needs it; they dream of constructing something beautiful. A social agent doesn't just talk because they're bored; they genuinely care about relationships.

---

## 1. Personal Goal System

### 1.1 Goal Types

Goals are longer-term aspirations that persist across multiple game sessions and influence decision-making.

| Goal Category | Examples | Driven By |
|---------------|----------|-----------|
| **Mastery** | "Become a skilled builder" | High conscientiousness, work ethic |
| **Creative** | "Build something beautiful" | High openness, creativity affinity |
| **Social** | "Make a close friend" | High extraversion, agreeableness |
| **Security** | "Ensure the village has enough food" | High neuroticism, conscientiousness |
| **Exploration** | "Discover what's beyond the forest" | High openness, low neuroticism |
| **Legacy** | "Teach others my skills" | High agreeableness, social skill |
| **Comfort** | "Have a cozy home of my own" | Moderate neuroticism, low openness |
| **Status** | "Be recognized as the best cook" | Low agreeableness, high work ethic |

### 1.2 Goal Generation

Goals are generated during reflection based on personality affinities:

```typescript
interface PersonalGoal {
  id: string;
  category: GoalCategory;
  description: string;           // "Become a skilled builder"
  motivation: string;            // Why this matters to the agent
  progress: number;              // 0-1 progress toward goal
  milestones: GoalMilestone[];   // Concrete steps
  priority: number;              // How important (0-1)
  createdAt: number;             // Game tick when formed
  lastReflectedOn: number;       // When they last thought about it
}

interface GoalMilestone {
  description: string;           // "Build my first structure"
  completed: boolean;
  completedAt?: number;
}
```

### 1.3 Goal Selection Algorithm

When generating a new goal during reflection:

```typescript
function generatePersonalGoal(personality: PersonalityComponent, skills: SkillsComponent): PersonalGoal {
  // Weight goal categories by personality
  const weights = {
    mastery: personality.conscientiousness * 0.4 + personality.workEthic * 0.6,
    creative: personality.openness * 0.8 + personality.creativity * 0.2,
    social: personality.extraversion * 0.5 + personality.agreeableness * 0.5,
    security: personality.neuroticism * 0.4 + personality.conscientiousness * 0.3,
    exploration: personality.openness * 0.6 - personality.neuroticism * 0.2,
    legacy: personality.agreeableness * 0.5 + (skills.highestLevel >= 3 ? 0.5 : 0),
    comfort: 50 + personality.neuroticism * 0.2 - personality.openness * 0.1,
    status: personality.workEthic * 0.4 - personality.agreeableness * 0.2,
  };

  // Select category weighted by personality
  const category = weightedRandomSelect(weights);

  // Generate specific goal based on category and current skills
  return createGoalForCategory(category, personality, skills);
}
```

### 1.4 Goal Examples by Personality

**High Conscientiousness + High Work Ethic (The Achiever)**
- "Master the art of building" (Mastery)
- "Ensure we never run low on supplies" (Security)
- "Complete 10 successful builds" (Mastery)

**High Openness + Low Neuroticism (The Explorer)**
- "Map the entire region" (Exploration)
- "Try crafting something I've never made" (Creative)
- "Learn a new skill from someone" (Mastery/Social)

**High Extraversion + High Agreeableness (The Connector)**
- "Become friends with everyone in the village" (Social)
- "Help someone achieve their goal" (Legacy/Social)
- "Host a village gathering" (Social)

**High Neuroticism + High Conscientiousness (The Planner)**
- "Build a secure shelter" (Comfort/Security)
- "Stockpile enough food for winter" (Security)
- "Create backup tools in case something breaks" (Security)

### 1.5 Goal Influence on Behavior

Goals influence action selection through priority weights:

```typescript
function getActionPriorityModifier(action: Action, goals: PersonalGoal[]): number {
  let modifier = 0;

  for (const goal of goals) {
    if (actionAdvancesGoal(action, goal)) {
      modifier += goal.priority * 0.3; // Goals add up to 30% priority boost
    }
  }

  return modifier;
}
```

---

## 2. Varied Idle Behaviors

### 2.1 Idle Behavior Selection

When an agent has no urgent needs or tasks, they select an idle behavior based on mood and personality:

| Behavior | When Selected | Duration |
|----------|---------------|----------|
| **Reflect** | Low energy, recent significant events | 30-120 seconds |
| **Chat** | Nearby agents, high extraversion or lonely | Until conversation ends |
| **Amuse Self** | High mood, high openness | 60-180 seconds |
| **Rest Actively** | Moderate energy, not tired | 30-90 seconds |
| **Observe** | High perception, curious personality | 60-120 seconds |
| **Wander Aimlessly** | Restless, moderate energy | Until interrupted |
| **Sit Quietly** | Low extraversion, content mood | 60-180 seconds |
| **Practice Skill** | Has skill level 1+, motivated | 120-300 seconds |

### 2.2 Behavior Selection Logic

```typescript
interface IdleBehaviorContext {
  mood: MoodState;
  energy: number;
  personality: PersonalityComponent;
  nearbyAgents: Agent[];
  recentEvents: MemoryEvent[];
  currentGoals: PersonalGoal[];
  timeOfDay: 'morning' | 'afternoon' | 'evening' | 'night';
}

function selectIdleBehavior(context: IdleBehaviorContext): IdleBehavior {
  const { mood, energy, personality, nearbyAgents, recentEvents, timeOfDay } = context;

  // Evening/night: prefer quieter activities
  const isQuietTime = timeOfDay === 'evening' || timeOfDay === 'night';

  // Calculate behavior weights
  const weights: Record<IdleBehavior, number> = {
    reflect: calculateReflectWeight(energy, recentEvents, personality),
    chat: calculateChatWeight(nearbyAgents, personality, mood),
    amuseSelf: calculateAmuseWeight(mood, personality),
    restActively: calculateRestWeight(energy, personality),
    observe: calculateObserveWeight(personality, nearbyAgents),
    wanderAimlessly: calculateWanderWeight(personality, energy),
    sitQuietly: calculateSitWeight(personality, mood, isQuietTime),
    practiceSkill: calculatePracticeWeight(context.currentGoals, personality),
  };

  return weightedRandomSelect(weights);
}
```

### 2.3 Reflect Behavior

Reflection is when agents process experiences and form/update goals.

**Triggers for Reflection:**
- Just completed a significant task (built something, had important conversation)
- Experienced an emotional event (made a friend, failed at something)
- Haven't reflected in a while (>1 game day)
- Low energy but not tired enough to sleep
- Quiet time (evening/night)

**What Happens During Reflection:**
1. Review recent memories for significance
2. Update emotional associations with events
3. Possibly form a new personal goal
4. Possibly update progress on existing goals
5. Generate internal monologue (visible in agent info panel)

```typescript
interface ReflectionResult {
  internalMonologue: string;      // "I've been thinking about..."
  newGoal?: PersonalGoal;         // If a new goal forms
  goalProgressUpdates: Map<string, number>;  // Updates to existing goals
  moodChange?: number;            // Reflection can affect mood
  insightsGained: string[];       // Things the agent "realized"
}

function performReflection(agent: Agent, memories: Memory[]): ReflectionResult {
  const significantMemories = memories.filter(m => m.significance > 0.5);
  const personality = agent.getComponent('personality');
  const currentGoals = agent.getComponent('goals')?.goals ?? [];

  // Generate reflection content
  const reflection = generateReflectionContent(personality, significantMemories, currentGoals);

  // Maybe form new goal if we don't have many
  if (currentGoals.length < 3 && Math.random() < 0.3) {
    reflection.newGoal = generatePersonalGoal(personality, agent.getComponent('skills'));
  }

  return reflection;
}
```

**Reflection Internal Monologue Examples:**

*After building their first structure:*
> "That workbench took longer than I expected, but I did it. Maybe I could get good at this building thing..."

*After a nice conversation:*
> "River is easy to talk to. It's nice having someone who listens."

*When thinking about goals:*
> "I've always wanted to see what's past those hills. Maybe once the village is stable enough..."

*After a setback:*
> "The crop didn't survive. I should have watered it more. Next time I'll pay closer attention."

### 2.4 Chat Behavior (Idle)

When agents choose to chat during idle time, it's casual and personality-driven:

**Extraverts:**
- Initiate conversation more often
- Talk about recent events, share stories
- Ask others what they're doing

**Introverts:**
- Join existing conversations rather than starting them
- Talk about observations, thoughts
- Shorter exchanges, comfortable silences

**High Agreeableness:**
- Ask about others' wellbeing
- Offer help or encouragement
- Listen more than talk

**Low Agreeableness:**
- Share opinions, debate
- Talk about achievements
- Less interested in small talk

**Topics Based on Mood:**
- Happy: Share good news, joke, reminisce about good times
- Neutral: Discuss observations, plans, weather
- Stressed: Seek reassurance, vent, ask for advice
- Sad: Need comfort, share worries, or withdraw

### 2.5 Amuse Self Behavior

When agents amuse themselves, their activities reflect their personality:

| Personality Trait | Self-Amusement Activity |
|-------------------|------------------------|
| High Openness | Daydream, imagine projects, explore creatively |
| High Conscientiousness | Plan ahead, organize thoughts, review progress |
| High Extraversion | Hum, whistle, fidget, look for others |
| High Agreeableness | Think about others, plan gifts or help |
| High Neuroticism | Worry productively, prepare for problems |
| Low Openness | Stick to familiar comforting routines |

**Example Internal States:**

*High Openness agent amusing themselves:*
> "Wouldn't it be interesting if we built a bridge across the river? I wonder how that would work..."

*High Conscientiousness agent:*
> "Let's see... we have about 20 wood in storage, that should last us a few days if we're careful."

### 2.6 Sit Quietly Behavior

Some agents don't need to be actively doing something. Sitting quietly is valid:

- Watch the fire
- Listen to the sounds of the village
- Enjoy the weather
- Simply rest without sleeping

**Conditions for Sitting Quietly:**
- Content mood (not stressed or sad)
- Not high extraversion (or exhausted extravert)
- Comfortable location (near fire, shelter, other agents)
- No urgent needs

---

## 3. Mood-Driven Behavior Selection

### 3.1 Mood States

```typescript
type MoodState =
  | 'joyful'      // Seek to share, celebrate, do creative things
  | 'content'     // Any idle behavior, biased toward relaxation
  | 'neutral'     // Balanced selection across behaviors
  | 'stressed'    // Seek comfort, social support, or work to distract
  | 'sad'         // Withdraw, seek comfort, or reflect
  | 'anxious'     // Prepare, plan, seek reassurance
  | 'bored'       // Seek stimulation, explore, start projects
  | 'lonely';     // Seek social interaction
```

### 3.2 Mood Influence on Idle Selection

```typescript
function getMoodBehaviorWeights(mood: MoodState): Partial<Record<IdleBehavior, number>> {
  switch (mood) {
    case 'joyful':
      return { chat: 1.5, amuseSelf: 1.3, practiceSkill: 1.2 };
    case 'content':
      return { sitQuietly: 1.4, observe: 1.2, restActively: 1.3 };
    case 'stressed':
      return { practiceSkill: 1.3, chat: 1.2, reflect: 0.8 }; // Distract or seek support
    case 'sad':
      return { reflect: 1.5, sitQuietly: 1.3, chat: 0.7 }; // Process or withdraw
    case 'anxious':
      return { practiceSkill: 1.3, observe: 1.2, reflect: 1.1 }; // Prepare or plan
    case 'bored':
      return { wanderAimlessly: 1.5, amuseSelf: 1.3, practiceSkill: 1.2 };
    case 'lonely':
      return { chat: 2.0, observe: 1.2, wanderAimlessly: 1.1 }; // Seek others
    default:
      return {}; // Neutral - no modifications
  }
}
```

---

## 4. Integration with Existing Systems

### 4.1 GoalsComponent

New component to track personal goals:

```typescript
interface GoalsComponent extends ComponentBase {
  type: 'goals';
  goals: PersonalGoal[];
  maxGoals: number;              // Usually 3-5
  lastReflection: number;        // Game tick
  reflectionCooldown: number;    // Minimum ticks between reflections
  lifetimeGoalsCompleted: number;
}
```

### 4.2 Prompt Integration

Goals appear in the agent's system prompt:

```
PERSONAL ASPIRATIONS:
- "Become a skilled builder" (in progress: built 2/5 structures)
- "Make a close friend" (in progress: acquaintances with Oak, River)

These are things you genuinely care about, not just village tasks.
```

### 4.3 Memory Integration

Goals connect to the memory system:

- Goal-relevant events are remembered more strongly
- Milestones are stored as significant memories
- Reflection creates summary memories

### 4.4 Behavior System Integration

Add new behaviors:

```typescript
// New behavior types
type IdleBehaviorType =
  | 'reflect'
  | 'chat_idle'      // Different from task-based talk
  | 'amuse_self'
  | 'observe'
  | 'sit_quietly'
  | 'practice_skill'
  | 'wander_aimlessly';

// Behaviors should have low priority (0.1-0.3) so they yield to actual needs
```

---

## 5. LLM Prompt Additions

### 5.1 Goal Context in Prompt

When generating decisions, include goals:

```
YOUR PERSONAL GOALS:
1. "Become a skilled builder" - You've built 2 structures so far. This matters to you because you take pride in creating things that last.
2. "Make a close friend" - You've been getting to know Oak. Having someone you can truly rely on feels important.

These aren't tasks - they're things you personally care about. Let them guide your choices when there's no urgent need.
```

### 5.2 Idle Decision Prompt

When truly idle, the prompt should allow for varied behavior:

```
CURRENT SITUATION:
Nothing urgent requires your attention. Your needs are met. The village is stable.

Based on how you're feeling (content, a bit tired from earlier work), you might:
- Sit by the fire and reflect on recent events
- See if anyone wants to chat
- Simply rest and watch the village go by
- Think about what you'd like to do next

What feels right to you right now?
```

### 5.3 Reflection Prompt

During reflection:

```
REFLECTION TIME:
You have a quiet moment to think.

Recent events:
- You finished building the workbench yesterday
- Had a nice conversation with River about the weather
- The crops are growing well

Your current goals:
- Become a skilled builder (2/5 structures built)
- Make a close friend (getting to know Oak and River)

What's on your mind? Are you satisfied with how things are going? Is there something you want to work toward?
```

---

## 6. Implementation Phases

### Phase 1: Basic Idle Variation (2-3 hours)
- Add idle behavior selection beyond just "idle"
- Implement personality-weighted behavior selection
- Add internal monologue generation for idle states

### Phase 2: Reflection System (4-5 hours)
- Implement reflection behavior with memory review
- Add reflection triggers (significant events, time-based)
- Generate reflection internal monologue

### Phase 3: Personal Goals (6-8 hours)
- Implement GoalsComponent
- Add goal generation during reflection
- Integrate goals into prompt context
- Add goal progress tracking

### Phase 4: Mood Integration (3-4 hours)
- Connect mood state to idle behavior selection
- Add mood-specific idle behaviors
- Tune weights for natural-feeling behavior

### Phase 5: Polish & Tuning (4-5 hours)
- Tune behavior frequencies
- Add variety to internal monologues
- Test emergent behavior patterns
- Ensure goals feel meaningful, not mechanical

---

## 7. Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Idle behavior variety | <30% pure "idle" | Track behavior type distribution |
| Goal formation rate | 80%+ agents have goals by day 3 | Check GoalsComponent |
| Goal relevance | 90% goals match personality | Manual review |
| Reflection frequency | 1-3x per game day when idle | Track reflection events |
| Natural feeling | Playtesters report agents feel "alive" | Qualitative feedback |

---

## 8. Example Scenarios

### Scenario 1: Evening After a Productive Day

Oak has just finished building a storage chest. It's evening, energy is moderate.

**Reflection triggers:** Significant task completion + quiet time

**Reflection result:**
> Internal: "That storage chest turned out well. I'm getting the hang of this building thing. Maybe I could try something more ambitious next... a cabin would be nice."
>
> New goal formed: "Build a proper cabin" (Creative/Mastery)

### Scenario 2: Nothing to Do, High Extraversion

River has no tasks. Energy is good, it's afternoon, and Oak is nearby.

**Behavior selection:** High extraversion weights chat heavily

**Result:** River approaches Oak for casual conversation about nothing in particular.

### Scenario 3: Stressed About Food, Evening

Pine is worried about low food stores. Energy is low, it's evening.

**Mood:** Stressed → biased toward seeking comfort or distraction

**Result:** Either seeks out conversation for reassurance, or practices gathering skill to feel productive.

### Scenario 4: Content Introvert, No Nearby Agents

Wren has met all needs. Energy is good, but no other agents are nearby.

**Behavior selection:** Low extraversion + content mood → Sit Quietly or Observe

**Result:** Wren sits by the fire, watching the flames, thinking about nothing in particular.

---

## 9. Open Questions

1. **Goal Abandonment:** When should agents give up on goals? After repeated failure? Changed circumstances?

2. **Goal Conflicts:** What happens when village needs conflict with personal goals? How much should agents sacrifice personal aspirations?

3. **Shared Goals:** Can agents form shared goals? "We should build a town hall together"?

4. **Goal Communication:** Should agents talk about their goals with each other? Could lead to interesting social dynamics.

5. **Mood Persistence:** How long should mood states last? Should they gradually shift or change based on events?

---

## 10. Dependencies

**Requires:**
- MoodComponent (or integration with NeedsComponent)
- MemoryComponent for reflection
- PersonalityComponent for goal generation
- Existing behavior system

**Enhances:**
- Agent prompts (goal context)
- Social system (idle chatting)
- Skill system (practice during idle)

---

**End of Specification**
