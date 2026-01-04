# Proposal: Work Order: Intelligence Stat System

**Submitted By:** migration-script
**Date:** 2026-01-03
**Status:** Draft
**Complexity:** 2-3 systems
**Priority:** TIER 2
**Source:** Migrated from agents/autonomous-dev/work-orders/intelligence-stat-system

---

## Original Work Order

# Work Order: Intelligence Stat System

## Overview
Implement intelligence as a concrete, three-dimensional stat for AI agents that controls their model quality, thinking depth, and decision frequency.

## Acceptance Criteria

### 1. Intelligence Stat Structure
Each agent has an `intelligence` stat with three components:
```typescript
interface Intelligence {
  modelQuality: number;    // 1-10: determines which Claude model to use
  thinkingDepth: number;   // 1-10: determines max_tokens budget for thinking
  thinkingFrequency: number; // 1-10: determines how often agent makes decisions
}
```

### 2. Model Quality Mapping (1-10 scale)
- **1-3 (Low)**: Use Claude Haiku
  - Fast, simple reasoning
  - Good for basic tasks and background NPCs

- **4-7 (Medium)**: Use Claude Sonnet
  - Balanced reasoning capability
  - Default for most interactive NPCs

- **8-10 (High)**: Use Claude Opus
  - Deep strategic thinking
  - Reserved for important characters or complex roles

### 3. Thinking Depth Mapping (1-10 scale)
Controls the token budget allocated per decision:
- **1-2**: 200-500 tokens (quick reactions, minimal planning)
- **3-4**: 500-1000 tokens (basic reasoning)
- **5-6**: 1000-2000 tokens (considers multiple options)
- **7-8**: 2000-4000 tokens (explores alternatives, short-term planning)
- **9-10**: 4000-8000 tokens (deep analysis, long-term planning)

### 4. Thinking Frequency Mapping (1-10 scale)
Controls decision interval in seconds:
- **1-2**: 60-120 seconds (very slow, misses many events)
- **3-4**: 30-60 seconds (slow, background awareness)
- **5-6**: 15-30 seconds (moderate, notices important events)
- **7-8**: 5-15 seconds (alert, responsive)
- **9-10**: 2-5 seconds (hyper-aware, constantly re-evaluating)

### 5. Genetic Intelligence Inheritance
Intelligence is inherited from parents with variation:

```typescript
// For agents born from two parents
function inheritIntelligence(parent1: Intelligence, parent2: Intelligence): Intelligence {
  return {
    modelQuality: inheritStat(parent1.modelQuality, parent2.modelQuality),
    thinkingDepth: inheritStat(parent1.thinkingDepth, parent2.thinkingDepth),
    thinkingFrequency: inheritStat(parent1.thinkingFrequency, parent2.thinkingFrequency)
  };
}

// Inherit a stat from two parents with epigenetic factors
function inheritStat(
  parent1Stat: number,
  parent2Stat: number,
  parent1Life: LifeQuality,
  parent2Life: LifeQuality
): number {
  const average = (parent1Stat + parent2Stat) / 2;

  // Epigenetic modifier based on parents' life experiences
  const epigeneticBias = calculateEpigeneticBias(parent1Life, parent2Life);

  // Mutation variance - harsh lives = more variance (both directions)
  const variance = calculateMutationVariance(parent1Life, parent2Life);

  const mutation = normalRandom(epigeneticBias, variance);
  return clamp(Math.round(average + mutation), 1, 10);
}

interface LifeQuality {
  nutrition: number;        // 0-10: well-fed vs starving
  stress: number;           // 0-10: peaceful vs traumatized
  education: number;        // 0-10: learned vs ignorant
  happiness: number;        // 0-10: fulfilled vs miserable
  healthCare: number;       // 0-10: treated vs neglected
}

function calculateEpigeneticBias(parent1: LifeQuality, parent2: LifeQuality): number {
  // Average parents' life quality
  const avgQuality = (
    (parent1.nutrition + parent2.nutrition) +
    (parent1.stress + parent2.stress) +
    (parent1.education + parent2.education) +
    (parent1.happiness + parent2.happiness) +
    (parent1.healthCare + parent2.healthCare)
  ) / 10;

  // Convert to bias: 0-5 quality = negative bias, 5-10 = positive bias
  return (avgQuality - 5) * 0.4; // Range: -2.0 to +2.0
}

function calculateMutationVariance(parent1: LifeQuality, parent2: LifeQuality): number {
  // More stressed/harsh lives = larger variance (bigger swings)
  const avgStress = (parent1.stress + parent2.stress) / 2;
  const avgNutrition = (parent1.nutrition + parent2.nutrition) / 2;

  const baseVariance = 1.0;
  const stressMultiplier = 1 + (avgStress / 10); // 1.0 to 2.0
  const nutritionMultiplier = 1 + ((10 - avgNutrition) / 10); // 1.0 to 2.0

  return baseVariance * stressMultiplier * nutritionMultiplier; // Range: 1.0 to 4.0
}

// For first-generation agents (no parents)
function generateBaseIntelligence(): Intelligence {
  return {
    modelQuality: randomInt(1, 10),
    thinkingDepth: randomInt(1, 10),
    thinkingFrequency: randomInt(1, 10)
  };
}
```

**Genetic + Epigenetic Mechanics:**

**Base Genetics:**
- Child's intelligence averages parents' stats
- Random mutation applied with environmental influence

**Epigenetic Bias (how parents lived affects mutation direction):**
- Well-fed, educated, happy, healthy parents → positive bias (+0 to +2 points)
- Starving, stressed, miserable, neglected parents → negative bias (-2 to +0 points)
- Average life quality → neutral bias (~0 points)

**Mutation Variance (how much variation is possible):**
- Low stress + good nutrition → tight variance (±1 point) - stable outcomes
- High stress or poor nutrition → wide variance (±2-4 points) - unpredictable outcomes
- Harsh lives create more extreme results (both genius and impaired children possible)

**Gameplay Implications:**
- Treating villagers well improves their children's intelligence
- Generational trauma/stress creates unpredictable offspring
- Selective breeding works best with good living conditions
- A stressed genius might have children dumber OR smarter than them (high variance)
- A happy average villager reliably produces average children (low variance)

### 6. Agent Configuration Integration
The intelligence stat should be:
- Set when agent is spawned/created
- Stored in agent state (immutable)
- Used by the agent behavior system to select model and control thinking

### 7. UI Display
Intelligence should be displayed in the agent inspector showing:
- Overall intelligence level (derived or average)
- Breakdown of the three dimensions
- Current model in use
- Current thinking interval
- Cost estimate (API usage) per hour

## Implementation Notes

### Cost Considerations
- Higher intelligence = higher API costs
- Players should understand the trade-off
- Consider displaying estimated cost-per-hour for each intelligence level

### Performance
- Thinking frequency affects game responsiveness
- Very high frequency (9-10) may create latency issues with many agents
- Consider batching or queuing for multiple high-frequency agents

### Game Balance
- Intelligence could be:
  - A character trait (fixed per NPC type)
  - A stat that levels up over time
  - A resource players invest in (pay to educate villagers)
  - Affected by temporary buffs/debuffs (wisdom potion, confusion spell)

## Testing Requirements

1. Create agents with different intelligence levels
2. Verify correct model is used for each modelQuality tier
3. Confirm thinking depth affects response quality (longer responses for higher depth)
4. Validate thinking frequency timing is accurate
5. Test edge cases (intelligence = 1, intelligence = 10)
6. Measure API cost for different intelligence profiles
7. Test runtime modification of intelligence stats

## Out of Scope

- Intelligence affecting non-LLM game mechanics (combat, movement speed, etc.)
- Visual/animation changes based on intelligence
- Skill trees or advancement systems (can be added later)
- Inter-agent intelligence comparison/rivalry mechanics

## Success Metrics

- Agents with different intelligence levels behave noticeably differently
- Lower intelligence agents cost significantly less to run
- System allows easy creation of NPCs along the intelligence spectrum
- Intelligence stat is understandable and predictable for developers


---

## Requirements

### Requirement: [To be defined]

The system SHALL [requirement description].

#### Scenario: [Scenario name]

- WHEN [condition]
- THEN [expected result]

## Definition of Done

- [ ] Implementation complete
- [ ] Tests passing
- [ ] Documentation updated
