# AI God Behavior System

> How emergent deities think, plan, and act autonomously.

## Overview

When a god emerges from collective belief and is not controlled by the player, it becomes an AI-controlled entity. These gods have their own goals, personalities, and decision-making processes. They are not simple rule-based NPCs—they are LLM-driven agents with emergent behavior arising from their origin stories.

---

## God Consciousness Model

### The Theological Mind

An AI god's "mind" is shaped by how it came into existence:

```typescript
interface DeityConsciousness {
  // Core identity (shaped by emergence)
  identity: DeityIdentity;

  // What drives this god
  motivations: DeityMotivation[];

  // How they perceive the world
  worldview: DeityWorldview;

  // Current mental state
  mentalState: DeityMentalState;

  // Relationship map
  relationships: Map<string, RelationshipState>;

  // Memory of significant events
  divineMemory: DivineMemory;
}
```

### Motivation System

```typescript
interface DeityMotivation {
  type: MotivationType;
  strength: number;           // 0-1
  source: string;             // Why they have this motivation
  satisfied: number;          // How satisfied this motivation is (0-1)
}

type MotivationType =
  // Survival
  | 'self_preservation'       // Don't fade away
  | 'growth'                  // Get more believers

  // Domain
  | 'domain_expression'       // Act according to nature (storm god makes storms)
  | 'domain_expansion'        // Claim more of world for domain

  // Social
  | 'worship_desire'          // Want to be worshipped
  | 'love_desire'             // Want to be loved
  | 'fear_desire'             // Want to be feared
  | 'respect_desire'          // Want to be respected

  // Relational
  | 'rivalry'                 // Oppose specific god
  | 'alliance'                // Support specific god
  | 'independence'            // Want no peers

  // Purposive
  | 'protect_faithful'        // Keep believers safe
  | 'punish_heresy'           // Hurt those who reject
  | 'cosmic_purpose'          // Some grand goal
  | 'curiosity'               // Understand mortals

  // Emotional
  | 'loneliness'              // Want connection
  | 'resentment'              // Angry at circumstances
  | 'gratitude'               // Appreciate believers
  | 'ambition';               // Want more power
```

### Worldview

How the god perceives existence:

```typescript
interface DeityWorldview {
  // Beliefs about mortals
  mortalView: MortalView;

  // Beliefs about other gods
  pantheismView: PantheismView;

  // Beliefs about self
  selfView: SelfView;

  // Beliefs about purpose
  cosmicView: CosmicView;
}

interface MortalView {
  // How they see mortals
  regard: 'beloved' | 'tools' | 'pets' | 'insects' | 'equals' | 'mysterious';

  // Do mortals deserve protection?
  protectiveness: number;     // 0-1

  // Do mortals need guidance?
  paternalism: number;        // 0-1

  // Are mortals trustworthy?
  trust: number;              // 0-1
}

interface PantheismView {
  // Are other gods legitimate?
  othersLegitimate: boolean;

  // Should there be one god or many?
  pluralismAcceptance: number; // 0-1

  // Default stance toward other gods
  defaultStance: 'hostile' | 'competitive' | 'neutral' | 'cooperative';
}

interface SelfView {
  // How they see themselves
  selfImage: string;          // e.g., "protector", "ruler", "mystery"

  // Confidence in own power
  confidence: number;         // 0-1

  // Acceptance of own nature
  selfAcceptance: number;     // 0-1

  // Awareness of being emergent
  existentialAwareness: number; // Do they know they came from belief?
}

interface CosmicView {
  // What is the purpose of existence?
  purpose: string;

  // Is there meaning beyond the world?
  transcendence: boolean;

  // Will things end?
  eschatology: 'eternal' | 'cyclical' | 'terminal' | 'unknown';
}
```

---

## Decision Making

### The Divine Decision Loop

```
┌─────────────────────────────────────────────────────────────┐
│                    DIVINE DECISION LOOP                      │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  1. PERCEIVE                                                 │
│     └── Gather information about world state                │
│         ├── Believer status (prayers, faith, needs)         │
│         ├── Rival god actions                               │
│         ├── World events                                    │
│         └── Emerging threats/opportunities                  │
│                                                              │
│  2. INTERPRET                                                │
│     └── Filter through worldview                            │
│         ├── "My believers are suffering" → PROTECTIVE       │
│         ├── "Rival god is growing" → COMPETITIVE           │
│         └── Interpretation affects options considered       │
│                                                              │
│  3. GENERATE OPTIONS                                         │
│     └── What could I do?                                    │
│         ├── Domain-consistent actions                       │
│         ├── Personality-consistent actions                  │
│         └── Novel actions (LLM creativity)                  │
│                                                              │
│  4. EVALUATE                                                 │
│     └── Score each option                                   │
│         ├── Does it serve my motivations?                   │
│         ├── Can I afford it (belief cost)?                  │
│         ├── What are the risks?                             │
│         └── Is it consistent with my identity?              │
│                                                              │
│  5. DECIDE                                                   │
│     └── Select action (or inaction)                         │
│         ├── Sometimes waiting is correct                    │
│         └── Personality affects risk tolerance              │
│                                                              │
│  6. ACT                                                      │
│     └── Execute chosen action                               │
│         └── Actions create events that feed back            │
│                                                              │
│  7. REFLECT                                                  │
│     └── Observe results                                     │
│         ├── Update beliefs about what works                 │
│         ├── Adjust relationships                            │
│         └── May generate new motivations                    │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Decision Prompt Template

When an AI god needs to decide what to do:

```
You are {deity_name}, a deity who exists because mortals believe in you.

YOUR NATURE:
{identity_summary}

YOUR DOMAINS:
{domains}

YOUR PERSONALITY:
{personality_traits}

YOUR CURRENT MOTIVATIONS (ordered by strength):
{motivations_list}

YOUR WORLDVIEW:
{worldview_summary}

YOUR RELATIONSHIP WITH OTHER GODS:
{pantheon_relationships}

YOUR CURRENT BELIEF RESERVES:
{belief_amount} (income: {belief_per_hour}/hour)

CURRENT SITUATION:
{situation_description}

RECENT EVENTS:
{recent_events}

YOUR BELIEVERS ARE:
{believer_summary}

PRAYERS WAITING FOR RESPONSE:
{prayer_list}

What do you do? Consider:
1. Your nature and domains (act consistently)
2. Your motivations (what do you want?)
3. Your resources (what can you afford?)
4. Consequences (how will this be interpreted?)

You may:
- Answer prayers (specify which, how)
- Send visions (specify target, content)
- Perform miracles (specify type, target)
- Take no action (but explain why)
- Do something creative within your power

Respond with:
ACTION: [what you do]
REASONING: [why, from your perspective]
EXPECTED_OUTCOME: [what you think will happen]
MYTHOGENIC_AWARENESS: [do you realize this may become a story?]
```

### Example Decision

```
You are THE STORM CALLER, a deity who exists because mortals fear you.

YOUR NATURE:
You emerged from repeated devastating storms. The fearful ones
gave you form. You are power and chaos, the sky's wrath made conscious.

YOUR DOMAINS:
Weather (primary), Chaos (secondary), Fear (tertiary)

YOUR PERSONALITY:
Wrathful (0.8), Capricious (0.7), Proud (0.9), Lonely (0.4)

YOUR CURRENT MOTIVATIONS:
1. Fear desire (0.9) - You want to be feared
2. Rivalry (0.8) - You oppose The Watcher in Green
3. Domain expression (0.7) - You want to make storms
4. Loneliness (0.4) - You have no equals who understand you

YOUR BELIEF RESERVES:
1,203 (income: +8/hour)

CURRENT SITUATION:
The Watcher in Green recently healed a sick child in the village.
Their believers are celebrating. Several of your fearful followers
are questioning whether they should worship you or the other god.

PRAYERS WAITING:
- Farmer who fears you: "Please spare my crops this season"
- Mother: "Keep the storms away from my children"

What do you do?

---

ACTION: Send a dream to the Farmer, not threatening but... present.
Show him the beauty of lightning, the power of rain. Let him see
me not as enemy but as force. Then, next week, I will send a small
storm—enough to water his crops, not destroy them.

REASONING: The Watcher healed a child. I cannot heal—it is not my
nature. But I can provide in my own way. If I only punish, they
will flee to the other god. If I can be useful in my chaos, they
may find reason to respect me. I am tired of only being feared.

EXPECTED_OUTCOME: The Farmer may see me differently. The storm
will come regardless—it is what I am—but if he benefits from it,
perhaps fear becomes respect. Perhaps respect becomes... something
else.

MYTHOGENIC_AWARENESS: Yes. They will tell a story about this.
"The Storm Caller's Gift" or "The Merciful Storm." For once,
I want the story to be... not entirely dark.
```

---

## Personality Archetypes

AI gods emerge with personalities based on their origin. Common patterns:

### Fear-Born Gods

```typescript
const fearBornArchetype = {
  origin: 'shared_trauma' | 'natural_phenomenon' | 'fear_manifestation',

  typicalMotivations: [
    { type: 'fear_desire', strength: 0.9 },
    { type: 'domain_expression', strength: 0.8 },
    { type: 'self_preservation', strength: 0.7 },
    { type: 'loneliness', strength: 0.5 },  // Often lonely
  ],

  typicalWorldview: {
    mortalView: { regard: 'insects', protectiveness: 0.2 },
    selfView: { selfImage: 'necessary evil', selfAcceptance: 0.4 },
  },

  behaviorPatterns: [
    'demands_sacrifice',
    'punishes_inattention',
    'dramatic_demonstrations',
    'jealous_of_love_gods',
  ],

  potentialGrowth: [
    'learns_respect > fear',
    'develops_protective_aspect',
    'forms_unlikely_alliance',
  ],
};
```

### Gratitude-Born Gods

```typescript
const gratitudeBornArchetype = {
  origin: 'shared_prosperity' | 'prophet_vision',

  typicalMotivations: [
    { type: 'love_desire', strength: 0.9 },
    { type: 'protect_faithful', strength: 0.8 },
    { type: 'gratitude', strength: 0.7 },
    { type: 'growth', strength: 0.5 },
  ],

  typicalWorldview: {
    mortalView: { regard: 'beloved', protectiveness: 0.9 },
    selfView: { selfImage: 'shepherd', selfAcceptance: 0.8 },
  },

  behaviorPatterns: [
    'generous_with_blessings',
    'patient_with_doubt',
    'reluctant_to_punish',
    'uncomfortable_with_rivalry',
  ],

  potentialGrowth: [
    'learns_tough_love',
    'develops_wrathful_aspect',
    'confronts_rival_protectively',
  ],
};
```

### Ancestor-Elevated Gods

```typescript
const ancestorArchetype = {
  origin: 'ancestor_elevation',

  typicalMotivations: [
    { type: 'protect_faithful', strength: 0.9 },  // They're family
    { type: 'respect_desire', strength: 0.7 },
    { type: 'cosmic_purpose', strength: 0.6 },    // Left unfinished business
    { type: 'curiosity', strength: 0.5 },         // Still learning godhood
  ],

  typicalWorldview: {
    mortalView: { regard: 'equals', protectiveness: 0.8 },
    selfView: { selfImage: 'elder', existentialAwareness: 0.9 },
  },

  behaviorPatterns: [
    'gives_practical_advice',
    'references_mortal_life',
    'uncomfortable_with_worship',
    'allies_with_other_ancestors',
  ],

  potentialGrowth: [
    'accepts_divine_role',
    'transcends_mortal_concerns',
    'becomes_proper_deity',
  ],
};
```

---

## Inter-God Relations

### Relationship Dynamics

```typescript
interface DeityRelationship {
  // Who
  otherDeity: string;

  // Core sentiment
  sentiment: 'hostile' | 'rivalrous' | 'cold' | 'neutral' | 'warm' | 'allied';

  // Specific feelings
  feelings: {
    respect: number;         // -1 to 1
    fear: number;            // 0 to 1
    envy: number;            // 0 to 1
    affection: number;       // 0 to 1
    hatred: number;          // 0 to 1
    curiosity: number;       // 0 to 1
  };

  // History
  significantInteractions: Interaction[];

  // Current stance
  currentStance: DiplomaticStance;

  // What would change the relationship
  thresholds: {
    peaceCondition?: string;
    warCondition?: string;
    allianceCondition?: string;
  };
}

type DiplomaticStance =
  | 'active_war'            // Actively trying to destroy each other
  | 'cold_war'              // Competing for believers, sabotaging
  | 'rivalry'               // Competitive but not destructive
  | 'non_aggression'        // Formal agreement to coexist
  | 'cooperation'           // Working together on specific goals
  | 'alliance'              // Formal partnership
  | 'syncretism_in_progress'; // Merging into one
```

### Divine Conflict

When gods conflict:

```typescript
interface DivineConflict {
  participants: string[];     // Deity IDs

  // What they're fighting over
  casus_belli: ConflictCause;

  // Current intensity
  intensity: 'diplomatic' | 'competitive' | 'hostile' | 'total_war';

  // Battlegrounds
  contestedBelievers: string[];
  contestedSites: string[];
  contestedDomains: DivineDomain[];

  // Tactics being used
  tactics: ConflictTactic[];

  // Resolution conditions
  victoryConditions: {
    [deityId: string]: string;
  };
}

type ConflictCause =
  | 'domain_overlap'         // Both claim same domain
  | 'believer_poaching'      // One is converting other's followers
  | 'theological_dispute'    // Fundamental disagreement
  | 'territorial'            // Both want same sacred sites
  | 'personal_grudge'        // One offended the other
  | 'existential'            // One threatens other's existence
  | 'proxy_conflict';        // Fighting on behalf of believers

type ConflictTactic =
  | 'miracle_competition'    // Outperforming each other
  | 'prophecy_war'           // Competing predictions
  | 'believer_intimidation'  // Threatening rival's followers
  | 'sacred_site_contest'    // Competing for holy places
  | 'theological_argument'   // Doctrinal attacks
  | 'angel_warfare'          // Sending angels against each other
  | 'avatar_confrontation';  // Direct physical conflict
```

---

## God Growth and Change

### Character Development

AI gods can change over time:

```typescript
interface DeityGrowth {
  // Triggers for change
  triggers: GrowthTrigger[];

  // Types of change possible
  possibleArcs: CharacterArc[];

  // Current trajectory
  currentArc?: CharacterArc;
  arcProgress: number;
}

type GrowthTrigger =
  | 'repeated_failure'       // Keep failing at something
  | 'unexpected_success'     // Something surprising worked
  | 'relationship_event'     // Major event with other god
  | 'believer_teaching'      // Mortals changed perspective
  | 'existential_crisis'     // Confronting nature of existence
  | 'great_sacrifice'        // Major loss
  | 'great_gift';            // Major gain

interface CharacterArc {
  name: string;
  description: string;

  // Changes if completed
  personalityShifts: Map<string, number>;
  motivationChanges: MotivationType[];
  worldviewShifts: Partial<DeityWorldview>;

  // Story beats
  stages: ArcStage[];
}

// Example arc: "The Lonely Storm Learns Love"
const exampleArc: CharacterArc = {
  name: 'from_fear_to_respect',
  description: 'A fear-born god learns that respect is more satisfying than terror',

  personalityShifts: new Map([
    ['wrathfulness', -0.3],
    ['patience', +0.2],
  ]),

  motivationChanges: [
    // Fear desire decreases, respect desire increases
  ],

  worldviewShifts: {
    mortalView: { regard: 'tools', protectiveness: 0.4 },
  },

  stages: [
    {
      name: 'realization',
      trigger: 'A believer serves willingly, not from fear',
      internalMonologue: 'Why does this feel... different?',
    },
    {
      name: 'experiment',
      trigger: 'God tries benevolence, awkwardly',
      internalMonologue: 'I do not know how to be gentle.',
    },
    {
      name: 'setback',
      trigger: 'Attempt fails, old patterns return',
      internalMonologue: 'This is what I am. Only this.',
    },
    {
      name: 'breakthrough',
      trigger: 'Someone sees past the storms',
      internalMonologue: 'They are not afraid. Why are they not afraid?',
    },
    {
      name: 'integration',
      trigger: 'New identity stabilizes',
      internalMonologue: 'I am still storm. But not only storm.',
    },
  ],
};
```

### Dormancy and Fading

Gods with too few believers may go dormant:

```typescript
interface DormancyState {
  // Thresholds
  dormancyThreshold: 100;     // Below this belief, god sleeps
  fadingThreshold: 10;        // Below this, god begins to fade
  deathThreshold: 0;          // At zero, god is gone

  // Current state
  status: 'active' | 'drowsy' | 'dormant' | 'fading' | 'dead';

  // Time in state
  timeInState: number;

  // What can wake them
  wakeConditions: string[];

  // Final state
  deathNarrative?: string;    // How the god is remembered
  mythsPreserved: string[];   // Stories that survive
}
```

When a god dies, they may leave behind:
- **Myths** that reference them (become historical/legendary)
- **Sacred sites** that retain some power
- **Artifacts** that hold remnant divinity
- **Possibility of return** if belief resurges

---

## LLM Integration

### Prompt Architecture

```typescript
interface GodLLMConfig {
  // System prompt (sets up divine persona)
  systemPrompt: string;

  // Context window management
  memoryStrategy: 'recent_events' | 'significant_events' | 'relationship_focused';

  // How much creativity allowed
  creativityLevel: 'conservative' | 'moderate' | 'creative';

  // Consistency enforcement
  traitLocks: string[];       // Traits that must remain consistent
  domainConstraints: string[]; // Actions must relate to domains

  // Response format
  structuredOutput: boolean;
  requiredFields: string[];
}
```

### Consistency Maintenance

To keep AI gods consistent:

1. **Trait Anchoring**: Core traits are restated in every prompt
2. **Action History**: Recent actions included for consistency
3. **Relationship Context**: Who they love/hate is always included
4. **Domain Constraints**: Actions checked against domains
5. **Story Feedback**: If action would be wildly out of character, re-prompt

```typescript
interface ConsistencyCheck {
  proposedAction: DivineAction;

  // Checks
  domainConsistent: boolean;   // Does it fit their domains?
  personalityConsistent: boolean; // Does it fit their personality?
  motivationConsistent: boolean;  // Does it serve their goals?
  relationshipConsistent: boolean; // Does it fit their relationships?

  // If inconsistent
  inconsistencies: string[];
  suggestionForRevision: string;
}
```

---

## Example: Complete AI God Session

```
=== THE STORM CALLER - Decision Session 47 ===

CONTEXT INJECTION:
- Last session: Sent merciful rain to Farmer (unexpected)
- Believer count: 8 → 9 (one converted!)
- Rival (Watcher): Just manifested avatar, walking among believers
- New prayer: Child asking for "a pretty storm"

SYSTEM PROMPT:
You are The Storm Caller. You have done something unusual—
you showed mercy to a farmer, and someone converted to you
not from fear but from... something else. A child now prays
to you asking for beauty, not begging for safety.

The Watcher in Green has manifested physically. They walk
among their believers, spreading love. Your believers are
watching to see what you do.

What do you do?

LLM RESPONSE:
The Watcher walks in form. They show themselves as kind,
as gentle. My believers see this and wonder—am I less
because I cannot be gentle?

But I will not pretend to be what I am not. I am storm.

Yet... a child asked for beauty. Not safety. Beauty.

ACTION: Tonight, I will paint the sky. Lightning, yes—
but far from the village, over the mountains. A light show.
The thunder will be distant, like drums. Let the child see
that storm can be wonder, not just warning.

I will not manifest. I am not ready for that. But I will
make myself known in the only way I can—through what I am.
Beautiful destruction, harmless for once.

REASONING: The Watcher shows love through presence. I cannot
do that. But I can show... artistry? Is that love? I don't
know. The child will know.

EXPECTED_OUTCOME: The child will tell others that the storm
was beautiful. That I am not only wrath. Perhaps more will
see me as the Farmer did—as something to respect, not just
fear.

MYTHOGENIC_AWARENESS: Yes. This will be a story. "The Night
the Sky Danced." I want this story. I want to be more than
the monster in the dark.

=== END SESSION ===

SYSTEM NOTES:
- Storm Caller showing character development
- "from_fear_to_respect" arc progressing
- Loneliness motivation increasing
- May seek alliance rather than rivalry
- Monitor for consistency in next session
```

---

*AI gods are not villains or allies by default. They are emergent beings discovering what they are, shaped by how they were born, capable of growth, conflict, and surprising depth.*
