# Skill System Specification

## Overview

A skill system that tracks agent expertise levels across different domains. The primary purpose is **context management for LLM prompts** - agents with higher skills in an area receive more detailed, relevant context about that domain when making decisions.

## Core Concept

Skills represent learned expertise that affects:
1. **LLM Context Depth** - Higher skill = more detailed domain context in prompts
2. **Action Efficiency** - Skilled agents perform related actions faster/better
3. **Memory Relevance** - Skills influence which memories are prioritized
4. **Decision Quality** - LLM receives expertise-appropriate information

## Skill Categories

### Primary Skills

| Skill | Domain | Context Examples |
|-------|--------|------------------|
| `building` | Construction | Blueprint details, material properties, structural knowledge |
| `farming` | Agriculture | Crop cycles, soil types, optimal planting times, pest management |
| `gathering` | Resource collection | Resource locations, tool efficiency, yield optimization |
| `cooking` | Food preparation | Recipes known, ingredient combinations, nutrition |
| `crafting` | Item creation | Recipe complexity, material efficiency, quality bonuses |
| `social` | Interpersonal | Relationship nuances, conversation strategies, negotiation |
| `exploration` | Navigation | Map knowledge, landmark memory, path efficiency |
| `combat` | Fighting | Tactics, weapon proficiency, threat assessment |
| `animal_handling` | Taming/husbandry | Animal behavior, taming techniques, breeding |
| `medicine` | Healing | Ailment recognition, treatment knowledge, herb properties |

### Skill Levels

```typescript
type SkillLevel = 0 | 1 | 2 | 3 | 4 | 5;

const SKILL_NAMES: Record<SkillLevel, string> = {
  0: 'Untrained',    // No special context
  1: 'Novice',       // Basic tips, common knowledge
  2: 'Apprentice',   // Practical knowledge, some techniques
  3: 'Journeyman',   // Solid understanding, reliable context
  4: 'Expert',       // Deep knowledge, advanced techniques
  5: 'Master',       // Complete mastery, rare insights
};
```

## Component Design

### SkillsComponent

```typescript
interface SkillsComponent {
  type: 'skills';

  // Current skill levels (0-5)
  levels: Record<SkillId, SkillLevel>;

  // Experience points toward next level
  experience: Record<SkillId, number>;

  // Total XP earned all-time (for stats)
  totalExperience: Record<SkillId, number>;

  // Skill affinities (learning speed multiplier, 0.5-2.0)
  // Some agents naturally learn certain skills faster
  affinities: Record<SkillId, number>;
}

type SkillId =
  | 'building'
  | 'farming'
  | 'gathering'
  | 'cooking'
  | 'crafting'
  | 'social'
  | 'exploration'
  | 'combat'
  | 'animal_handling'
  | 'medicine';
```

### Experience Requirements

```typescript
const XP_PER_LEVEL: Record<SkillLevel, number> = {
  0: 0,      // Start
  1: 100,    // Novice
  2: 300,    // Apprentice
  3: 700,    // Journeyman
  4: 1500,   // Expert
  5: 3000,   // Master
};
```

## Context Management Integration

### How Skills Affect LLM Prompts

The `StructuredPromptBuilder` should use skills to determine context depth:

```typescript
interface SkillContextConfig {
  skillId: SkillId;
  level: SkillLevel;
  contextSections: {
    0: null,                    // No special section
    1: 'basic_tips',            // 1-2 sentences
    2: 'practical_knowledge',   // Short paragraph
    3: 'detailed_context',      // Multiple paragraphs
    4: 'expert_insights',       // Comprehensive section
    5: 'master_wisdom',         // Full domain knowledge
  };
}
```

### Example: Building Skill Context

**Level 0 (Untrained):**
```
(No building context included)
```

**Level 1 (Novice):**
```
You have basic construction knowledge. Buildings need foundations and materials.
```

**Level 2 (Apprentice):**
```
You understand construction basics:
- Walls need support structures
- Different materials have different strengths
- Weather affects building durability
```

**Level 3 (Journeyman):**
```
Your building expertise includes:
- Material efficiency calculations
- Structural load distribution
- Climate-appropriate designs
- Tool selection for different tasks
You can identify suboptimal construction and suggest improvements.
```

**Level 4 (Expert):**
```
As an expert builder, you understand:
- Advanced structural engineering principles
- Material science and optimal combinations
- Efficient construction sequencing
- Quality vs speed tradeoffs
- Common failure points and how to prevent them
You can plan complex multi-stage construction projects.
```

**Level 5 (Master):**
```
As a master builder, you possess comprehensive architectural knowledge:
- Innovative construction techniques
- Material substitution strategies
- Long-term durability optimization
- Teaching and mentoring approaches
- Legacy building design principles
You can design structures that will last generations and train others.
```

## Experience Gain Events

### When XP is Awarded

| Event | Skill | Base XP | Notes |
|-------|-------|---------|-------|
| `building:construction_complete` | building | 10-50 | Based on building complexity |
| `farming:harvest` | farming | 5-20 | Based on crop type |
| `farming:plant` | farming | 2 | Small consistent gains |
| `gathering:resource_gathered` | gathering | 1-5 | Based on resource rarity |
| `crafting:completed` | crafting | 5-30 | Based on recipe complexity |
| `cooking:meal_prepared` | cooking | 5-15 | Based on recipe complexity |
| `social:conversation_complete` | social | 3-10 | Based on depth |
| `exploration:area_discovered` | exploration | 10-25 | Based on area size |
| `combat:enemy_defeated` | combat | 10-50 | Based on difficulty |
| `animal:taming_success` | animal_handling | 20-50 | Based on animal difficulty |
| `medicine:treatment_success` | medicine | 10-30 | Based on ailment severity |

### XP Modifiers

```typescript
function calculateXP(baseXP: number, agent: Entity): number {
  const skills = agent.components.get('skills') as SkillsComponent;
  const affinity = skills.affinities[skillId] ?? 1.0;

  // Affinities range from 0.5 (slow learner) to 2.0 (natural talent)
  return Math.floor(baseXP * affinity);
}
```

## Memory Integration

Skills should influence which memories are retrieved for context:

```typescript
interface MemoryRetrievalContext {
  // Higher skill = more relevant domain memories retrieved
  skillWeights: Record<SkillId, number>;

  // Example: For a building decision
  // If building skill is 4, retrieve more building-related memories
  // If building skill is 1, retrieve fewer, more general memories
}
```

## Personality Affinities

When an agent is created, generate skill affinities based on personality:

```typescript
function generateAffinities(personality: PersonalityComponent): Record<SkillId, number> {
  // Example mappings:
  // High industriousness → higher building, crafting affinities
  // High agreeableness → higher social, medicine affinities
  // High openness → higher exploration, cooking affinities
  // High conscientiousness → higher farming affinities

  return {
    building: calculateAffinity(personality, ['industriousness', 'conscientiousness']),
    farming: calculateAffinity(personality, ['conscientiousness', 'stability']),
    gathering: calculateAffinity(personality, ['industriousness']),
    cooking: calculateAffinity(personality, ['openness', 'agreeableness']),
    crafting: calculateAffinity(personality, ['industriousness', 'openness']),
    social: calculateAffinity(personality, ['agreeableness', 'extraversion']),
    exploration: calculateAffinity(personality, ['openness', 'extraversion']),
    combat: calculateAffinity(personality, ['assertiveness', 'stability']),
    animal_handling: calculateAffinity(personality, ['agreeableness', 'stability']),
    medicine: calculateAffinity(personality, ['agreeableness', 'conscientiousness']),
  };
}
```

## UI Display

### Skills Tab in Agent Info Panel

Show skills with:
- Current level name and number (e.g., "Journeyman (3)")
- Progress bar to next level
- Affinity indicator (if notably high/low)
- Total XP earned

### Skill Icons

| Skill | Icon |
|-------|------|
| building | 🏗️ |
| farming | 🌾 |
| gathering | 🪓 |
| cooking | 🍳 |
| crafting | 🔨 |
| social | 💬 |
| exploration | 🧭 |
| combat | ⚔️ |
| animal_handling | 🐾 |
| medicine | 💊 |

## Implementation Phases

### Phase 1: Core System
- [ ] SkillsComponent definition
- [ ] SkillSystem for XP tracking and level-ups
- [ ] Event listeners for XP gain
- [ ] Basic level-up logic

### Phase 2: Context Integration
- [ ] Modify StructuredPromptBuilder to use skills
- [ ] Create skill context templates for each level
- [ ] Integrate with memory retrieval weighting

### Phase 3: Gameplay Effects
- [ ] Action speed modifiers based on skill
- [ ] Quality bonuses for crafting/building
- [ ] Unlock advanced recipes/buildings at higher levels

### Phase 4: UI & Polish
- [ ] Skills tab in AgentInfoPanel
- [ ] Level-up notifications
- [ ] Skill comparison between agents

## Events

```typescript
// Emitted when skill levels up
interface SkillLevelUpEvent {
  type: 'skill:level_up';
  agentId: EntityId;
  skillId: SkillId;
  oldLevel: SkillLevel;
  newLevel: SkillLevel;
}

// Emitted when XP is gained
interface SkillXPGainEvent {
  type: 'skill:xp_gain';
  agentId: EntityId;
  skillId: SkillId;
  amount: number;
  source: string; // e.g., 'building:construction_complete'
}
```

## Design Decisions

### 1. No Skill Decay
Skills are permanent once learned. An agent who reaches Expert in building stays Expert forever, even if they stop building. This rewards investment and makes skilled agents valuable.

### 2. Teaching (With Limits)
Masters can teach others, but with diminishing returns:

```typescript
interface TeachingBonus {
  // Teacher must be higher level than student
  // Bonus caps at bringing student to one level below teacher
  maxLevelFromTeaching: teacherLevel - 1;

  // XP multiplier when learning from teacher
  xpMultiplier: {
    1: 1.5,   // Novice teaching
    2: 1.75,  // Apprentice teaching
    3: 2.0,   // Journeyman teaching
    4: 2.25,  // Expert teaching
    5: 2.5,   // Master teaching
  };

  // Can't reach the final level through teaching alone
  // Must earn the last level through practice
  teachingCap: targetLevel - 1;
}
```

Teaching actions:
- `teach:skill` behavior - Teacher spends time with student
- Both must be co-located
- Teacher gains small social XP
- Student gains skill XP with multiplier

### 3. Specialization vs Generalist

Two viable paths with distinct advantages:

```typescript
interface SpecializationSystem {
  // Specialist: 2+ skills at level 4+
  specialist: {
    threshold: { count: 2, minLevel: 4 },
    bonuses: {
      // +20% XP gain in specialized skills
      xpBonus: 0.2,
      // +15% action efficiency in specialized domains
      efficiencyBonus: 0.15,
      // Unlock specialist-only recipes/buildings
      exclusiveContent: true,
    },
  };

  // Generalist: 5+ skills at level 2+
  generalist: {
    threshold: { count: 5, minLevel: 2 },
    bonuses: {
      // +10% XP gain in ALL skills
      xpBonus: 0.1,
      // Can substitute skills (use gathering knowledge for farming)
      skillSubstitution: true,
      // Better at adapting to new situations
      adaptabilityBonus: 0.2,
    },
  };

  // Master of All: 7+ skills at level 3+ (rare achievement)
  polymath: {
    threshold: { count: 7, minLevel: 3 },
    bonuses: {
      // Synergy bonuses doubled
      synergyMultiplier: 2.0,
      // Can teach any skill they know
      universalTeacher: true,
    },
  };
}
```

### 4. Skill Trees & Prerequisites

Skills have prerequisites creating meaningful progression:

```typescript
const SKILL_PREREQUISITES: Record<SkillId, SkillRequirement[]> = {
  // Basic skills (no prerequisites)
  gathering: [],
  exploration: [],
  social: [],

  // Tier 1 (require basic skills)
  farming: [{ skill: 'gathering', level: 1 }],
  building: [{ skill: 'gathering', level: 1 }],
  combat: [{ skill: 'exploration', level: 1 }],
  animal_handling: [{ skill: 'exploration', level: 1 }],

  // Tier 2 (require tier 1)
  cooking: [
    { skill: 'gathering', level: 2 },
    { skill: 'farming', level: 1 },
  ],
  crafting: [
    { skill: 'gathering', level: 2 },
    { skill: 'building', level: 1 },
  ],
  medicine: [
    { skill: 'gathering', level: 2 },
    { skill: 'farming', level: 1 },
  ],
};

// Skill tree visualization:
//
//                    [gathering]
//                    /    |    \
//               [farming] [building]
//                /    \      |
//           [cooking] [medicine] [crafting]
//
//                    [exploration]
//                    /          \
//               [combat]    [animal_handling]
//
//                    [social]
//                        |
//                   (teaching)
```

### 5. Cross-Skill Synergies

Related skills boost each other:

```typescript
const SKILL_SYNERGIES: SynergyDefinition[] = [
  // Food chain
  {
    skills: ['gathering', 'farming', 'cooking'],
    bonus: {
      name: 'Farm to Table',
      effect: '+10% quality for food-related actions per skill in chain',
      xpSharing: 0.1, // 10% XP bleeds to related skills
    },
  },

  // Construction chain
  {
    skills: ['gathering', 'building', 'crafting'],
    bonus: {
      name: 'Master Builder',
      effect: '+15% build speed when all three skills are level 2+',
      materialEfficiency: 0.1, // 10% less materials needed
    },
  },

  // Wilderness chain
  {
    skills: ['exploration', 'gathering', 'animal_handling'],
    bonus: {
      name: 'Nature Affinity',
      effect: 'Animals less likely to flee, +20% resource discovery',
      movementBonus: 0.1, // Faster in wilderness
    },
  },

  // Social chain
  {
    skills: ['social', 'cooking', 'medicine'],
    bonus: {
      name: 'Caretaker',
      effect: '+25% healing effectiveness, meals give mood boost',
      teachingBonus: 0.2, // Better at teaching
    },
  },

  // Combat chain
  {
    skills: ['combat', 'crafting', 'medicine'],
    bonus: {
      name: 'Battle Medic',
      effect: 'Can craft combat items, +30% self-healing',
      combatHealing: true,
    },
  },

  // Knowledge chain
  {
    skills: ['exploration', 'social', 'medicine'],
    bonus: {
      name: 'Wandering Healer',
      effect: 'Learn remedies from exploration, spread knowledge socially',
      discoveryBonus: 0.2,
    },
  },
];

// Synergy activation formula
function calculateSynergyBonus(agent: Entity, synergy: SynergyDefinition): number {
  const skills = agent.components.get('skills') as SkillsComponent;

  // All skills must be at least level 1
  const allActive = synergy.skills.every(
    skillId => (skills.levels[skillId] ?? 0) >= 1
  );

  if (!allActive) return 0;

  // Bonus scales with lowest skill in the chain
  const lowestLevel = Math.min(
    ...synergy.skills.map(s => skills.levels[s] ?? 0)
  );

  // 0.1 base + 0.05 per level of lowest skill
  return 0.1 + (lowestLevel * 0.05);
}
```

### Skill Tree UI

```
┌─────────────────────────────────────────────┐
│              SKILL TREES                    │
├─────────────────────────────────────────────┤
│                                             │
│   [Gathering]●───────●[Farming]             │
│       │ ╲             │ ╲                   │
│       │  ╲            │  ╲                  │
│       │   ●[Building] │   ●[Medicine]       │
│       │    ╲          │                     │
│       │     ╲         ●[Cooking]            │
│       │      ●[Crafting]                    │
│                                             │
│   [Exploration]●─────●[Combat]              │
│        │                                    │
│        ●[Animal Handling]                   │
│                                             │
│   [Social]●─────────(Teaching unlocked)     │
│                                             │
├─────────────────────────────────────────────┤
│ SYNERGIES ACTIVE:                           │
│ ✓ Farm to Table (gathering+farming+cooking) │
│ ○ Master Builder (need building lv2)        │
└─────────────────────────────────────────────┘
```

## Related Systems

- `StructuredPromptBuilder` - Primary consumer of skill data for context
- `MemoryConsolidationSystem` - Skills influence memory relevance
- `CraftingSystem` - Skill levels affect recipe availability/quality
- `BuildingSystem` - Skill levels affect construction speed/quality
