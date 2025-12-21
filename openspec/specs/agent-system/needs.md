# Agent Needs System - Specification

**Created:** 2025-12-20
**Status:** Draft
**Version:** 0.1.0

---

## Overview

Agents have needs that must be satisfied. Unmet needs drive behavior - a hungry agent seeks food, a lonely agent seeks company, a purposeless agent seeks meaning. Needs create emergent behavior, interpersonal dynamics, and make agents feel alive.

Inspired by Maslow's hierarchy but adapted for gameplay: physical survival needs are urgent, higher needs are important for long-term wellbeing.

---

## Need Architecture

```typescript
interface AgentNeeds {
  agentId: string;

  // Physical needs (urgent)
  physical: {
    hunger: Need;
    thirst: Need;
    energy: Need;
    warmth: Need;
    health: Need;
  };

  // Safety needs
  safety: {
    shelter: Need;
    security: Need;        // Freedom from threats
    stability: Need;       // Predictable environment
  };

  // Social needs
  social: {
    belonging: Need;       // Part of community
    friendship: Need;      // Close relationships
    intimacy: Need;        // Deep connection/romance
    respect: Need;         // Valued by others
  };

  // Psychological needs
  psychological: {
    autonomy: Need;        // Control over own life
    competence: Need;      // Being good at things
    purpose: Need;         // Meaningful work
    novelty: Need;         // New experiences
    beauty: Need;          // Aesthetic appreciation
  };

  // Self-actualization
  higher: {
    creativity: Need;      // Expressing oneself
    legacy: Need;          // Lasting impact
    transcendence: Need;   // Beyond self
  };
}

interface Need {
  current: number;         // 0-100 (0 = desperate, 100 = satisfied)
  baseline: number;        // Natural resting point
  decayRate: number;       // How fast it drops
  urgency: number;         // How important when low

  // Modifiers
  personalWeight: number;  // How much this agent cares
  satisfiedAt: GameTime;   // Last time fully satisfied
  desperateAt?: GameTime;  // Last time critically low
}
```

---

## Need Tiers

Needs operate in tiers - lower tiers take priority:

```typescript
interface NeedTier {
  tier: number;
  name: string;
  needs: string[];
  urgencyMultiplier: number;
  interruptPriority: number;
}

const NEED_TIERS: NeedTier[] = [
  {
    tier: 1,
    name: "survival",
    needs: ["hunger", "thirst", "energy", "warmth", "health"],
    urgencyMultiplier: 3.0,
    interruptPriority: 0.9,     // Will interrupt almost anything
  },
  {
    tier: 2,
    name: "safety",
    needs: ["shelter", "security", "stability"],
    urgencyMultiplier: 2.0,
    interruptPriority: 0.7,
  },
  {
    tier: 3,
    name: "social",
    needs: ["belonging", "friendship", "intimacy", "respect"],
    urgencyMultiplier: 1.5,
    interruptPriority: 0.5,
  },
  {
    tier: 4,
    name: "psychological",
    needs: ["autonomy", "competence", "purpose", "novelty", "beauty"],
    urgencyMultiplier: 1.0,
    interruptPriority: 0.3,
  },
  {
    tier: 5,
    name: "self_actualization",
    needs: ["creativity", "legacy", "transcendence"],
    urgencyMultiplier: 0.5,
    interruptPriority: 0.1,     // Rarely interrupts
  },
];

// Lower tier needs suppress higher tier concerns
function getEffectiveNeedUrgency(agent: Agent, needName: string): number {
  const need = getNeed(agent, needName);
  const tier = getTier(needName);

  // Check if lower tier needs are critical
  for (const lowerTier of NEED_TIERS.filter(t => t.tier < tier.tier)) {
    const criticalNeeds = lowerTier.needs.filter(n =>
      getNeed(agent, n).current < 20
    );
    if (criticalNeeds.length > 0) {
      // Lower tier is critical - suppress this need
      return 0;
    }
  }

  // Calculate urgency
  const deficit = 100 - need.current;
  const baseUrgency = deficit / 100;
  const personalWeight = need.personalWeight;
  const tierMultiplier = tier.urgencyMultiplier;

  return baseUrgency * personalWeight * tierMultiplier;
}
```

---

## Physical Needs

The most immediate needs:

```typescript
interface PhysicalNeeds {
  hunger: {
    decayRate: 4,              // Points per hour
    criticalThreshold: 15,     // Below this = starving
    effects: {
      low: ["irritable", "distracted"],
      critical: ["weak", "desperate", "will_steal_food"],
    },
    satisfiedBy: ["eating"],
  };

  thirst: {
    decayRate: 6,              // Faster than hunger
    criticalThreshold: 10,
    effects: {
      low: ["thirsty", "headache"],
      critical: ["dehydrated", "confused", "collapse_risk"],
    },
    satisfiedBy: ["drinking"],
  };

  energy: {
    decayRate: 3,
    criticalThreshold: 10,
    effects: {
      low: ["tired", "slow", "grumpy"],
      critical: ["exhausted", "will_sleep_anywhere"],
    },
    satisfiedBy: ["sleeping", "resting"],
    recoveryRate: 10,          // Per hour of sleep
  };

  warmth: {
    decayRate: "varies",       // Based on weather/shelter
    criticalThreshold: 20,
    effects: {
      low: ["cold", "shivering", "seeks_fire"],
      critical: ["hypothermia", "health_damage"],
    },
    satisfiedBy: ["shelter", "fire", "warm_clothing", "company"],
  };

  health: {
    decayRate: 0,              // Only drops from damage/illness
    criticalThreshold: 25,
    effects: {
      low: ["injured", "sick", "weak"],
      critical: ["dying", "needs_urgent_care"],
    },
    satisfiedBy: ["healing", "medicine", "rest", "care"],
    recoveryRate: 2,           // Per day with rest
  };
}

// Decay physical needs each tick
function decayPhysicalNeeds(agent: Agent, hoursElapsed: number): void {
  // Hunger
  agent.needs.physical.hunger.current -=
    agent.needs.physical.hunger.decayRate * hoursElapsed;

  // Thirst (faster decay if hot/active)
  let thirstDecay = agent.needs.physical.thirst.decayRate;
  if (isHot(agent.position)) thirstDecay *= 1.5;
  if (agent.movement.status === "running") thirstDecay *= 2;
  agent.needs.physical.thirst.current -= thirstDecay * hoursElapsed;

  // Energy
  let energyDecay = agent.needs.physical.energy.decayRate;
  if (agent.movement.status === "working") energyDecay *= 1.5;
  agent.needs.physical.energy.current -= energyDecay * hoursElapsed;

  // Warmth (based on environment)
  const warmthChange = calculateWarmthChange(agent);
  agent.needs.physical.warmth.current += warmthChange * hoursElapsed;

  // Clamp values
  for (const need of Object.values(agent.needs.physical)) {
    need.current = Math.max(0, Math.min(100, need.current));
  }
}
```

---

## Social Needs

The need for connection:

```typescript
interface SocialNeeds {
  belonging: {
    // Feeling part of the community
    satisfiedBy: [
      "participating_in_group_activity",
      "being_greeted",
      "being_invited",
      "having_role",
    ],
    decayRate: 2,              // Per day
    effects: {
      low: ["lonely", "isolated", "withdrawn"],
      critical: ["depressed", "resentful", "may_leave_village"],
    },
  };

  friendship: {
    // Having close friends
    satisfiedBy: [
      "quality_conversation",
      "shared_activity",
      "helping_friend",
      "being_helped",
    ],
    decayRate: 3,              // Per day
    effects: {
      low: ["missing_connection", "seeking_company"],
      critical: ["desperately_lonely", "attaches_easily"],
    },
  };

  intimacy: {
    // Deep romantic/close connection
    satisfiedBy: [
      "time_with_partner",
      "deep_conversation",
      "physical_affection",
      "shared_vulnerability",
    ],
    decayRate: 1,              // Per day
    personalWeight: "varies",  // Some care more than others
    effects: {
      low: ["longing", "romantic_seeking"],
      critical: ["heartache", "jealousy_prone"],
    },
  };

  respect: {
    // Being valued by others
    satisfiedBy: [
      "praise",
      "recognition",
      "being_consulted",
      "work_appreciated",
    ],
    decayRate: 1,              // Per day
    effects: {
      low: ["undervalued", "resentful"],
      critical: ["bitter", "seeks_validation", "competitive"],
    },
  };
}

// Social interactions satisfy social needs
async function socialInteraction(
  agent: Agent,
  other: Agent,
  type: InteractionType
): Promise<void> {

  const relationship = getRelationship(agent, other);

  switch (type) {
    case "greeting":
      agent.needs.social.belonging.current += 5;
      break;

    case "conversation":
      const quality = calculateConversationQuality(agent, other);
      agent.needs.social.belonging.current += 3;
      if (relationship.closeness > 0.5) {
        agent.needs.social.friendship.current += quality * 10;
      }
      break;

    case "shared_meal":
      agent.needs.social.belonging.current += 8;
      agent.needs.social.friendship.current += 5;
      break;

    case "helped_by":
      agent.needs.social.belonging.current += 10;
      agent.needs.social.friendship.current += 8;
      agent.needs.social.respect.current += 3;
      break;

    case "praised":
      agent.needs.social.respect.current += 15;
      break;

    case "romantic_time":
      if (relationship.type === "partner") {
        agent.needs.social.intimacy.current += 20;
        agent.needs.social.friendship.current += 10;
      }
      break;
  }
}
```

---

## Psychological Needs

The need for meaning and growth:

```typescript
interface PsychologicalNeeds {
  autonomy: {
    // Control over own choices
    increasedBy: [
      "making_decisions",
      "choosing_own_work",
      "setting_own_schedule",
      "refusing_request",
    ],
    decreasedBy: [
      "being_ordered",
      "no_choice",
      "forced_action",
      "micromanaged",
    ],
    effects: {
      low: ["controlled", "resentful", "rebellious"],
      critical: ["defiant", "may_refuse_orders", "seeks_freedom"],
    },
  };

  competence: {
    // Being good at things
    increasedBy: [
      "successful_task",
      "skill_improvement",
      "creating_quality_work",
      "teaching_others",
    ],
    decreasedBy: [
      "failure",
      "criticism",
      "unable_to_help",
      "outperformed",
    ],
    effects: {
      low: ["self_doubt", "hesitant", "avoids_challenges"],
      critical: ["ashamed", "gives_up", "imposter_syndrome"],
    },
  };

  purpose: {
    // Meaningful work
    increasedBy: [
      "contributing_to_village",
      "helping_others",
      "working_on_passion",
      "seeing_impact",
    ],
    decreasedBy: [
      "meaningless_work",
      "no_impact",
      "wasted_effort",
      "ignored_contribution",
    ],
    effects: {
      low: ["unfulfilled", "questions_worth", "demotivated"],
      critical: ["existential_crisis", "nihilistic", "seeks_new_calling"],
    },
  };

  novelty: {
    // New experiences
    increasedBy: [
      "exploring",
      "learning_new_skill",
      "meeting_new_person",
      "trying_new_food",
      "discovering",
    ],
    decreasedBy: [
      "same_routine",
      "no_variety",
      "stuck_in_place",
    ],
    personalWeight: "varies",  // Some crave novelty, others hate it
    effects: {
      low: ["bored", "restless", "craves_change"],
      critical: ["desperate_for_adventure", "reckless"],
    },
  };

  beauty: {
    // Aesthetic appreciation
    increasedBy: [
      "viewing_art",
      "nature_appreciation",
      "beautiful_environment",
      "music",
      "craft_appreciation",
    ],
    decreasedBy: [
      "ugly_surroundings",
      "no_art",
      "destruction_of_beauty",
    ],
    personalWeight: "varies",  // Artists care more
    effects: {
      low: ["dull", "uninspired"],
      critical: ["aesthetically_starved", "seeks_beauty"],
    },
  };
}

// Work satisfaction affects multiple psychological needs
async function completeWork(agent: Agent, work: WorkTask): Promise<void> {
  // Competence
  if (work.quality > 0.7) {
    agent.needs.psychological.competence.current += 10;
  }
  if (work.wasHard && work.succeeded) {
    agent.needs.psychological.competence.current += 15;
  }

  // Purpose
  if (work.helpedOthers) {
    agent.needs.psychological.purpose.current += 12;
  }
  if (work.contributedToVillage) {
    agent.needs.psychological.purpose.current += 8;
  }

  // Autonomy
  if (work.selfChosen) {
    agent.needs.psychological.autonomy.current += 5;
  }
  if (work.forced) {
    agent.needs.psychological.autonomy.current -= 10;
  }

  // Novelty
  if (work.wasNew) {
    agent.needs.psychological.novelty.current += 8;
  }
}
```

---

## Need-Driven Behavior

Needs drive what agents want to do:

```typescript
interface NeedDrivenBehavior {
  // Calculate what agent should want to do
  calculateDesires(agent: Agent): Desire[];

  // Needs can interrupt current activity
  checkForInterrupts(agent: Agent): Interrupt | null;

  // Needs affect mood
  calculateMoodFromNeeds(agent: Agent): Mood;
}

interface Desire {
  action: string;
  targetNeed: string;
  urgency: number;
  satisfactionAmount: number;
}

// What does the agent want to do?
function calculateDesires(agent: Agent): Desire[] {
  const desires: Desire[] = [];

  // Check all needs
  for (const [category, needs] of Object.entries(agent.needs)) {
    for (const [name, need] of Object.entries(needs)) {
      if (need.current < 70) {  // Unsatisfied
        const actions = getActionsThatSatisfy(name);
        for (const action of actions) {
          desires.push({
            action,
            targetNeed: name,
            urgency: getEffectiveNeedUrgency(agent, name),
            satisfactionAmount: action.satisfactionAmount,
          });
        }
      }
    }
  }

  // Sort by urgency
  desires.sort((a, b) => b.urgency - a.urgency);

  return desires;
}

// Check if needs are critical enough to interrupt
function checkForNeedInterrupts(agent: Agent): Interrupt | null {
  // Physical needs can interrupt almost anything
  if (agent.needs.physical.thirst.current < 15) {
    return {
      type: "needs_critical",
      priority: 0.95,
      data: { need: "thirst", level: agent.needs.physical.thirst.current },
    };
  }

  if (agent.needs.physical.hunger.current < 10) {
    return {
      type: "needs_critical",
      priority: 0.9,
      data: { need: "hunger", level: agent.needs.physical.hunger.current },
    };
  }

  if (agent.needs.physical.energy.current < 10) {
    return {
      type: "needs_critical",
      priority: 0.85,
      data: { need: "energy", level: agent.needs.physical.energy.current },
    };
  }

  // Social needs interrupt less urgently
  if (agent.needs.social.belonging.current < 15) {
    return {
      type: "needs_critical",
      priority: 0.5,
      data: { need: "belonging", level: agent.needs.social.belonging.current },
    };
  }

  return null;
}
```

---

## Personality Affects Needs

Different agents have different need profiles:

```typescript
interface PersonalityNeedModifiers {
  // Extrovert vs introvert
  extraversion: {
    high: {
      "social.belonging": 1.5,    // Needs more social
      "social.friendship": 1.3,
      "psychological.novelty": 1.2,
    },
    low: {
      "social.belonging": 0.7,    // Needs less social
      "social.friendship": 0.8,
      "psychological.autonomy": 1.3,  // Values alone time
    },
  };

  // Ambitious vs content
  ambition: {
    high: {
      "psychological.competence": 1.5,
      "psychological.purpose": 1.4,
      "higher.legacy": 1.5,
      "social.respect": 1.4,
    },
    low: {
      "physical.*": 1.1,          // More focused on comfort
      "safety.stability": 1.3,
    },
  };

  // Creative vs practical
  creativity: {
    high: {
      "psychological.beauty": 1.5,
      "higher.creativity": 2.0,
      "psychological.novelty": 1.3,
    },
    low: {
      "psychological.beauty": 0.5,
      "safety.stability": 1.2,
    },
  };

  // Adventurous vs cautious
  adventurousness: {
    high: {
      "psychological.novelty": 2.0,
      "safety.security": 0.7,
      "safety.stability": 0.6,
    },
    low: {
      "safety.*": 1.5,
      "psychological.novelty": 0.5,
    },
  };
}

// Apply personality to needs
function applyPersonalityToNeeds(agent: Agent): void {
  for (const [trait, value] of Object.entries(agent.personality.traits)) {
    const modifiers = PersonalityNeedModifiers[trait];
    if (!modifiers) continue;

    const level = value > 0.6 ? "high" : value < 0.4 ? "low" : null;
    if (!level) continue;

    for (const [needPath, multiplier] of Object.entries(modifiers[level])) {
      const need = getNeedByPath(agent, needPath);
      if (need) {
        need.personalWeight *= multiplier;
      }
    }
  }
}
```

---

## Need Satisfaction Strategies

How agents plan to satisfy needs:

```typescript
interface NeedSatisfactionStrategy {
  need: string;
  strategies: Strategy[];
}

interface Strategy {
  action: string;
  requirements: Requirement[];
  satisfactionAmount: number;
  duration: number;
  sideEffects: SideEffect[];
}

const HUNGER_STRATEGIES: Strategy[] = [
  {
    action: "eat_stored_food",
    requirements: [{ type: "has_item", item: "food" }],
    satisfactionAmount: 40,
    duration: 15,              // Minutes
    sideEffects: [{ need: "energy", change: 5 }],
  },
  {
    action: "cook_meal",
    requirements: [
      { type: "has_item", item: "ingredients" },
      { type: "near", location: "kitchen" },
    ],
    satisfactionAmount: 60,
    duration: 45,
    sideEffects: [
      { need: "energy", change: -5 },
      { need: "competence", change: 3 },
    ],
  },
  {
    action: "buy_food",
    requirements: [{ type: "has", resource: "money" }],
    satisfactionAmount: 50,
    duration: 30,
    sideEffects: [{ need: "belonging", change: 2 }],
  },
  {
    action: "forage",
    requirements: [{ type: "knows_location", locationType: "foraging_spot" }],
    satisfactionAmount: 30,
    duration: 60,
    sideEffects: [
      { need: "energy", change: -10 },
      { need: "novelty", change: 5 },
    ],
  },
  {
    action: "beg_for_food",
    requirements: [],           // Always available, but costly
    satisfactionAmount: 20,
    duration: 20,
    sideEffects: [
      { need: "respect", change: -15 },
      { need: "autonomy", change: -10 },
    ],
  },
];

// Choose best strategy for a need
function chooseSatisfactionStrategy(
  agent: Agent,
  need: string
): Strategy | null {

  const strategies = getStrategiesFor(need);

  // Filter to available strategies
  const available = strategies.filter(s =>
    s.requirements.every(r => meetsRequirement(agent, r))
  );

  if (available.length === 0) {
    // No good options - may need to use costly fallback
    return strategies.find(s => s.requirements.length === 0) || null;
  }

  // Choose based on satisfaction vs side effects
  return available.reduce((best, current) => {
    const currentScore = scoreStrategy(agent, current);
    const bestScore = scoreStrategy(agent, best);
    return currentScore > bestScore ? current : best;
  });
}

function scoreStrategy(agent: Agent, strategy: Strategy): number {
  let score = strategy.satisfactionAmount;

  // Account for side effects
  for (const effect of strategy.sideEffects) {
    const need = getNeed(agent, effect.need);
    if (effect.change < 0 && need.current < 50) {
      // Avoid making low needs worse
      score += effect.change * 2;
    } else {
      score += effect.change * 0.5;
    }
  }

  // Account for duration (prefer faster if urgent)
  const urgency = getEffectiveNeedUrgency(agent, strategy.targetNeed);
  if (urgency > 0.7) {
    score -= strategy.duration * 0.1;
  }

  return score;
}
```

---

## Summary

| Tier | Needs | Urgency | Interrupts? |
|------|-------|---------|-------------|
| **1. Survival** | Hunger, thirst, energy, warmth, health | Critical | Yes, anything |
| **2. Safety** | Shelter, security, stability | High | Yes, most things |
| **3. Social** | Belonging, friendship, intimacy, respect | Medium | Sometimes |
| **4. Psychological** | Autonomy, competence, purpose, novelty, beauty | Low | Rarely |
| **5. Self-actualization** | Creativity, legacy, transcendence | Lowest | Only when others met |

Key principles:
- **Hierarchy** - lower needs suppress higher needs when critical
- **Personality** - different agents weight needs differently
- **Strategies** - multiple ways to satisfy each need
- **Side effects** - satisfying one need affects others
- **Drives behavior** - needs → desires → intents → actions

---

## Alien Psychological Needs

Different species have fundamentally different need structures. Some needs don't map to human psychology at all.

### Species-Specific Need Profiles

```typescript
interface SpeciesNeedProfile {
  species: string;

  // Standard needs to modify/remove
  modifiedNeeds: NeedModification[];
  removedNeeds: string[];              // Doesn't apply to this species

  // Species-specific needs
  uniqueNeeds: AlienNeed[];

  // Need hierarchy changes
  tierOverrides: TierOverride[];
}

interface NeedModification {
  need: string;
  decayRateMultiplier: number;
  baselineMultiplier: number;
  satisfactionSources: string[];       // Different ways to satisfy
  effects: { low: string[]; critical: string[] };
}

interface AlienNeed extends Need {
  name: string;
  description: string;
  category: string;
  tier: number;

  // Alien-specific
  humanEquivalent?: string;            // Nearest human concept
  incomprehensibleTo: string[];        // Species that can't grasp it
}
```

### Pack Mind Needs

Pack minds have unique coherence and proximity needs:

```typescript
interface PackMindNeeds {
  // Replaces/supplements standard needs

  coherence: {
    description: "Minds in harmony, thinking as one";
    tier: 1;                           // Survival-level critical
    decayRate: 5;                      // Drops quickly when separated

    satisfiedBy: [
      "proximity_to_all_bodies",
      "successful_joint_thinking",
      "unified_action",
    ];

    effects: {
      low: ["confused_thinking", "slow_decisions", "irritable"],
      critical: [
        "mind_fragmenting",
        "personality_splits",
        "may_become_non_sapient",
      ],
    };
  };

  packProximity: {
    description: "Bodies near each other";
    tier: 1;
    decayRate: 10;                     // Drops very fast when apart

    threshold: 10;                     // Meters between bodies
    perBodyPenalty: 20;                // Lose 20 per body too far

    effects: {
      low: ["lonely_body", "reduced_cognition"],
      critical: ["body_goes_feral", "pack_may_lose_member"],
    };
  };

  bodyBalance: {
    description: "Right mix of body roles";
    tier: 2;
    decayRate: 0;                      // Only changes with body loss/gain

    // Need all role types
    roles: ["thinker", "sensor", "manipulator"];
    missingRolePenalty: 30;

    effects: {
      low: ["cognitive_gap", "compensating_behaviors"],
      critical: ["major_disability", "seeks_new_member"],
    };
  };

  // Removed needs (don't apply)
  removedNeeds: [
    "intimacy",                        // Pack IS intimacy
    "loneliness",                      // Bodies are never alone if pack is whole
  ];
}

// Pack-specific behavior
function checkPackCoherence(pack: PackMind): void {
  const maxDistance = getMaxBodyDistance(pack);

  if (maxDistance > pack.coherenceRange) {
    // Bodies too far apart - coherence drops
    pack.needs.coherence.current -= 5 * (maxDistance - pack.coherenceRange);

    if (pack.needs.coherence.current < 20) {
      // Pack is fragmenting
      triggerPackFragmentation(pack);
    }
  }
}
```

### Hive Mind Needs

Individual hive workers have minimal needs; the HIVE has needs:

```typescript
interface HiveWorkerNeeds {
  // Workers have severely truncated need structure

  // Only physical survival
  physical: {
    energy: Need;
    health: Need;
    // No hunger/thirst if hive feeds directly
  };

  // Hive connection is paramount
  hiveConnection: {
    description: "Connection to hive mind";
    tier: 0;                           // ABOVE survival
    decayRate: 50;                     // Dies quickly if severed

    effects: {
      low: ["confused", "seeking_hive"],
      critical: ["mad", "dies", "or_becomes_individual"],
    };
  };

  // Role fulfillment
  roleSatisfaction: {
    description: "Doing what caste should do";
    tier: 2;
    satisfiedBy: ["performing_caste_function"];

    effects: {
      low: ["restless", "inefficient"],
      critical: ["role_crisis", "may_be_recycled"],
    };
  };

  // NO social needs - hive IS society
  // NO psychological needs - hive provides purpose
  // NO self-actualization - self is hive
}

interface HiveCollectiveNeeds {
  // The HIVE as entity has needs

  workerPopulation: {
    description: "Enough workers to function";
    minimum: number;
    optimal: number;

    effects: {
      low: ["expansion_priority", "conservative_behavior"],
      critical: ["hive_death_spiral"],
    };
  };

  casteBalance: {
    description: "Right ratio of castes";
    targetRatios: Map<string, number>;

    effects: {
      low: ["inefficiency", "behavior_compensation"],
      critical: ["functional_collapse"],
    };
  };

  queenHealth: {
    description: "Central node viability";
    tier: 0;                           // Most critical

    effects: {
      low: ["hive_anxiety", "queen_protection_priority"],
      critical: ["succession_crisis", "hive_death"],
    };
  };

  territoryControl: {
    description: "Sufficient resources and space";

    effects: {
      low: ["expansion_drive", "resource_competition"],
      critical: ["war_or_migration"],
    };
  };
}
```

### Association/Man'chi Needs

Species with man'chi psychology have different social needs:

```typescript
interface ManchiNeeds {
  // REPLACES friendship, belonging, intimacy

  manchiAnchor: {
    description: "Having someone to be loyal TO";
    tier: 2;                           // Safety-level (identity depends on it)
    decayRate: 0;                      // Binary - have it or don't

    effects: {
      low: null,                       // Either have anchor or don't
      critical: [                      // Having NO anchor
        "profound_instability",
        "dangerous_unattachment",
        "desperate_seeking",
        "vulnerable_to_any_claim",
      ],
    };

    // Cannot be partially satisfied
    threshold: "binary";
  };

  hierarchyClarity: {
    description: "Knowing one's exact position";
    tier: 2;
    decayRate: 2;                      // Drops when status is ambiguous

    satisfiedBy: [
      "clear_orders",
      "formal_acknowledgment",
      "proper_protocol",
    ];

    effects: {
      low: ["anxious", "seeks_clarification"],
      critical: ["paralyzed", "may_act_drastically"],
    };
  };

  associationPrestige: {
    description: "One's association being respected";
    tier: 3;

    // Note: personal respect doesn't matter
    // Association's standing is what matters

    effects: {
      low: ["defensive", "competitive"],
      critical: ["may_challenge_rivals", "violence_possible"],
    };
  };

  // Removed needs (psychologically impossible)
  removedNeeds: [
    "friendship",                      // No such concept
    "intimacy",                        // Replaced by privileged_manchi
    "autonomy",                        // Contradicts man'chi
  ];

  // Modified needs
  modifiedNeeds: {
    respect: {
      // Not personal respect - position respect
      satisfiedBy: ["proper_address", "rank_acknowledgment"],
      notSatisfiedBy: ["casual_praise", "friendship_gestures"],
    };
  };
}

// Man'chi crisis - losing one's anchor
function handleManchiCrisis(agent: Agent): void {
  if (agent.manchiAnchor === null) {
    // Deeply unstable state
    agent.needs.manchiAnchor.current = 0;

    // Desperate seeking behavior
    agent.behavior.add("seeking_new_association");
    agent.behavior.add("vulnerable_to_claims");

    // May attach to anyone who claims them
    // This can be exploited by manipulative characters
  }
}
```

### Symbiont Needs

Joined beings have additional needs:

```typescript
interface SymbiontNeeds {
  // Additional needs for joined beings

  hostHealth: {
    description: "Symbiont needs healthy host";
    tier: 1;                           // Survival-level for symbiont

    effects: {
      low: ["symbiont_distress", "healing_focus"],
      critical: ["symbiont_may_need_transfer", "death_risk"],
    };
  };

  integration: {
    description: "How well host and symbiont mesh";
    tier: 2;
    initialValue: 50;                  // Takes time to fully integrate
    maxValue: 100;

    increasedBy: [
      "time_together",
      "successful_cooperation",
      "shared_experiences",
    ];

    decreasedBy: [
      "internal_conflict",
      "forced_joining",
      "incompatible_personalities",
    ];

    effects: {
      low: ["internal_friction", "coordination_issues", "identity_confusion"],
      critical: ["rejection_risk", "psychological_damage"],
    };
  };

  memoryBalance: {
    description: "Processing past hosts' memories";
    tier: 3;

    // Too many overwhelming memories
    // Too few loses symbiont's value

    effects: {
      low: ["memory_pressure", "identity_bleed"],
      critical: ["past_host_domination", "current_host_erasure"],
    };
  };

  // Inherited needs from past hosts
  inheritedNeeds: {
    description: "Echoes of past hosts' unfulfilled needs";
    inherited: NeedEcho[];
  };
}

interface NeedEcho {
  originalHost: string;
  need: string;
  strength: number;                    // How strongly it persists
  confusingToCurrentHost: boolean;
}
```

### Cyclical/Dormancy Needs

Species with hibernation cycles have temporal needs:

```typescript
interface CyclicalNeeds {
  cyclePhase: {
    description: "Being in correct phase for the cycle";
    tier: 1;

    phases: ["active", "pre_dormancy", "dormant", "post_dormancy"];
    currentPhase: string;
    daysUntilNext: number;

    effects: {
      wrongPhase: [
        "biological_stress",
        "confused_instincts",
        "health_damage",
      ],
    };
  };

  dormancyPreparation: {
    description: "Ready for hibernation";
    tier: 1;
    activeOnly: "pre_dormancy";        // Only relevant before dormancy

    satisfiedBy: [
      "cocoon_prepared",
      "food_stores",
      "safe_location",
      "knowledge_preserved",
    ];

    effects: {
      low: ["anxiety", "frantic_preparation"],
      critical: ["unsafe_dormancy", "may_not_survive"],
    };
  };

  continuity: {
    description: "Knowledge and relationships surviving dormancy";
    tier: 3;

    // Memory degrades during dormancy
    preservedBy: [
      "written_records",
      "trusted_keepers",
      "memory_rituals",
    ];

    effects: {
      low: ["wakes_confused", "relationships_forgotten"],
      critical: ["identity_loss", "civilization_reset"],
    };
  };
}

// Pre-dormancy urgency
function checkDormancyApproach(agent: CyclicalAgent): void {
  if (agent.daysUntilDormancy < 30) {
    // Dormancy preparation becomes top priority
    agent.needs.dormancyPreparation.urgency = 0.95;

    // Other needs suppressed
    agent.needs.psychological.novelty.urgency = 0;
    agent.needs.social.friendship.urgency *= 0.5;
  }
}
```

### Post-Scarcity Needs (Culture-style)

When material needs are fully met by technology, psychology changes:

```typescript
interface PostScarcityNeeds {
  // Physical needs: ELIMINATED
  physical: {
    hunger: never;                       // Automatic feeding
    thirst: never;                       // Automatic hydration
    energy: never;                       // Optimal energy maintained
    health: {
      managedBy: "AI_medical_systems";
      decayRate: 0;                      // Illness essentially eliminated
    };
  };

  // Safety needs: MOSTLY ELIMINATED
  safety: {
    shelter: never;                      // Orbital habitats
    security: never;                     // No threats exist
    stability: {
      description: "Confidence in system continuity";
      satisfiedBy: ["Mind_reassurance"];
      decayRate: 0.1;                    // Rarely an issue
    };
  };

  // Social needs: TRANSFORMED
  social: {
    belonging: {
      description: "Finding community among abundance";
      // Harder when you can do anything
      satisfiedBy: ["chosen_community", "shared_projects"];
    };

    reputation: {
      description: "Being known for something";
      tier: 3;                           // Elevated importance

      // In post-scarcity, reputation is currency
      satisfiedBy: ["notable_achievements", "recognized_expertise", "admired_work"];

      effects: {
        low: ["invisible", "unremarkable"],
        critical: ["existential_boredom", "identity_crisis"],
      };
    };
  };

  // Psychological needs: ELEVATED TO PRIMARY
  psychological: {
    novelty: {
      tier: 1;                           // Now survival-level
      description: "New experiences when everything is possible";

      // Much harder to satisfy when you've done everything
      satisfiedBy: ["genuinely_new_experience", "authentic_risk", "unexplored_territory"];

      effects: {
        critical: ["ennui", "dangerous_behavior", "Subliming_consideration"],
      };
    };

    purpose: {
      tier: 1;
      description: "Meaning when work is unnecessary";

      // No economic necessity creates purpose crisis
      satisfiedBy: ["chosen_calling", "helping_others", "creating_art", "exploration"];

      effects: {
        critical: ["nihilistic_spiral", "withdrawal_from_society"],
      };
    };

    authenticity: {
      description: "Genuine challenge in safe world";
      tier: 2;

      // Seeking real risk/stakes
      satisfiedBy: ["Contact_work", "dangerous_exploration", "genuine_competition"];

      effects: {
        low: ["everything_feels_fake"],
        critical: ["seeks_real_danger"],
      };
    };
  };

  // Self-actualization: NOW BASELINE
  higher: {
    creativity: {
      tier: 2;                           // Expected, not aspirational
      description: "Everyone can create; standing out is hard";
    };

    contribution: {
      description: "Adding value when machines do everything";
      satisfiedBy: ["unique_human_insight", "emotional_labor", "Contact_missions"];
    };
  };
}

// Post-scarcity ennui
function checkPostScarcityMalaise(agent: CultureCitizen): void {
  // When all base needs are met, higher needs become urgent
  if (agent.needs.psychological.novelty.current < 30) {
    // May seek Contact (dangerous galactic diplomacy)
    // May consider Subliming (transcending physical existence)
    // May engage in simulated hardship (deliberately challenging experiences)
    agent.behavior.add("seeking_authentic_challenge");
  }
}
```

### Dominance Hierarchy Needs (Kif-style)

Species driven entirely by dominance have inverted psychology:

```typescript
interface DominanceNeeds {
  // Physical needs exist but are suppressed by dominance needs
  physical: {
    // Standard but lower priority than dominance
    urgencyMultiplier: 0.5;             // Will risk starvation for status
  };

  // Dominance needs REPLACE social needs
  dominance: {
    currentRank: {
      description: "Position in hierarchy";
      tier: 1;                           // SURVIVAL LEVEL

      // Rank IS survival - low rank = killed
      effects: {
        low: ["vulnerable", "must_appease", "may_be_killed"],
        critical: ["about_to_die", "desperate_measures"],
      };
    };

    subordinates: {
      description: "Having beings below you";
      tier: 1;

      satisfiedBy: ["commanding_others", "being_obeyed", "displays_of_submission"];

      // No subordinates = no worth
      effects: {
        low: ["worthless", "target"],
        critical: ["may_attack_anyone", "suicidal_challenge"],
      };
    };

    fearInspired: {
      description: "Others being afraid of you";
      tier: 2;

      satisfiedBy: ["violence_witnessed", "reputation_for_cruelty", "successful_intimidation"];

      effects: {
        low: ["disrespected", "challenged"],
        critical: ["immediate_violence_required"],
      };
    };
  };

  // Removed needs (don't exist in this psychology)
  removedNeeds: [
    "friendship",                        // Weakness
    "belonging",                         // Irrelevant
    "intimacy",                          // Exploitable
    "trust",                             // Dangerous
    "gratitude",                         // Does not compute
  ];

  // Modified needs
  respect: {
    // Not mutual respect - fear-respect
    satisfiedBy: ["submission_displays", "groveling", "terror"];
    notSatisfiedBy: ["friendly_acknowledgment", "peer_respect"];
  };

  autonomy: {
    // Autonomy = ability to command, not freedom
    satisfiedBy: ["commanding_others", "not_taking_orders"];
    decreasedBy: ["receiving_orders", "submitting"];
  };
}

// Dominance cascade
function dominanceInteraction(superior: Agent, inferior: Agent): void {
  // Superior gains satisfaction
  superior.needs.dominance.subordinates.current += 10;
  superior.needs.dominance.fearInspired.current += 5;

  // Inferior must submit or challenge
  if (inferior.needs.dominance.currentRank.current < 30) {
    // May challenge despite odds - better death than low rank
    considerDesperateChallenge(inferior, superior);
  } else {
    // Submit and lose rank
    inferior.needs.dominance.currentRank.current -= 10;
    inferior.needs.dominance.subordinates.current -= 5;
  }
}

// The fundamental Kif truth: weakness is death
function checkDominanceViability(agent: DominanceAgent): void {
  if (agent.needs.dominance.currentRank.current < 10) {
    // About to be killed by those below
    // Must either challenge up or flee
    if (!hasEscapeRoute(agent)) {
      // Suicidal challenge is rational
      triggerDesperateChallenge(agent);
    }
  }
}
```

### Temporal/Geological Being Needs

Beings on different timescales have different urgency structures:

```typescript
interface GeologicalNeeds {
  // Physical needs barely exist
  physical: {
    // Hunger, thirst: N/A or geological timescale
    // Energy: measured in millennia
  };

  // "Social" needs
  witnessing: {
    description: "Observing the passage of events";
    tier: 3;
    decayRate: 0.0001;                 // Per year

    satisfiedBy: ["watching_civilizations", "geological_events"];
  };

  pattern: {
    description: "Seeing patterns complete over eons";
    tier: 4;

    effects: {
      low: ["cosmic_boredom"],
      critical: ["may_create_events", "dangerous_intervention"],
    };
  };

  // No urgency about short-timescale things
  urgencyFilter: {
    eventsNoticed: "persisting_over_1_year";
    eventsIgnored: "individual_lifespans";
  };
}

// How geological beings perceive needs
function geologicalNeedDecay(agent: GeologicalAgent, yearsElapsed: number): void {
  // Most needs don't decay in meaningful timeframes
  // A century is like a minute

  // Only pattern/witnessing needs matter
  agent.needs.witnessing.current -= 0.01 * yearsElapsed;

  // If nothing interesting happens for millennia, may intervene
  if (agent.needs.pattern.current < 20) {
    // May do something dramatic to break monotony
    // This explains why ancient beings sometimes act mysteriously
  }
}
```

---

## Related Specs

**Core Integration:**
- `agent-system/spec.md` - Agent architecture
- `agent-system/species-system.md` - Species-specific need profiles
- `agent-system/movement-intent.md` - How needs drive behavior
- `agent-system/memory-system.md` - Memories of needs being met/unmet

**Need Satisfaction:**
- `items-system/spec.md` - Items restore needs (hunger_restore, thirst_restore, etc.)
- `construction-system/spec.md` - Shelter satisfies safety needs
- `agent-system/relationship-system.md` - Relationships satisfy social needs
- `agent-system/conversation-system.md` - Conversations satisfy belonging/friendship
- `governance-system/spec.md` - Autonomy, respect needs from governance role

