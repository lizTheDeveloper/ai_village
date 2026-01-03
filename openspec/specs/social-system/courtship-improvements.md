> **System:** social-system
> **Version:** 1.0
> **Status:** Draft
> **Last Updated:** 2026-01-02

# Courtship System Improvements Specification

**Version:** 1.0
**Date:** 2026-01-01
**Status:** Draft
**Dependencies:** Courtship System, Social Buildings, Relationship System

---

## Overview

The current courtship system is too restrictive and doesn't reflect realistic human (or agent) mating behavior. This spec addresses three critical gaps:

1. **Desperation Over Time** - Agents become less selective when lonely
2. **Mate Poaching** - Some agents prefer taken partners (social proof)
3. **Social Context** - Where you meet matters for romance success

**Core Principle:** Romance is dynamic, contextual, and influenced by scarcity.

---

## Problem Statement

### Current Issues

1. **Static Selectivity**
   - `romanticInclination` never changes
   - Threshold is fixed: `0.5 - romanticInclination * 0.3`
   - No desperation from prolonged loneliness

2. **No Mate Poaching**
   - System explicitly avoids already-partnered agents
   - Real life: Some people prefer taken partners (social proof, challenge)
   - Reduces drama and interesting social dynamics

3. **Context-Blind**
   - Meeting at a tavern = same as random street encounter
   - No bonus for romantic settings (candlelit dinner vs. grocery store)
   - Location doesn't affect success rate

---

## Solution 1: Desperation & Dynamic Selectivity

### Loneliness Tracking

Add `LonelinessComponent` to track time since meaningful romantic interaction:

```typescript
interface LonelinessComponent {
  type: 'loneliness';

  // Metrics
  daysSinceLastRomance: number;        // Time since courtship attempt
  daysSinceLastIntimacy: number;       // Time since partner intimacy
  rejectionCount: number;              // Recent rejections (last 30 days)

  // Derived state
  desperationLevel: number;            // 0-1, calculated from above
  selectivityModifier: number;         // Multiplier for threshold
}
```

### Desperation Calculation

```typescript
function calculateDesperation(loneliness: LonelinessComponent): number {
  let desperation = 0;

  // Time-based desperation
  if (loneliness.daysSinceLastRomance > 30) {
    desperation += 0.2;  // +20% after 1 month
  }
  if (loneliness.daysSinceLastRomance > 90) {
    desperation += 0.3;  // +50% total after 3 months
  }
  if (loneliness.daysSinceLastRomance > 180) {
    desperation += 0.3;  // +80% total after 6 months
  }

  // Rejection-based desperation
  if (loneliness.rejectionCount > 3) {
    desperation += 0.1 * (loneliness.rejectionCount - 3);  // +10% per rejection after 3rd
  }

  return Math.min(1.0, desperation);
}
```

### Dynamic Threshold

Modify courtship threshold to account for desperation:

```typescript
// OLD (static):
const threshold = 0.5 - courtship.romanticInclination * 0.3;

// NEW (dynamic):
function calculateCourtshipThreshold(agent: Entity): number {
  const courtship = agent.getComponent<CourtshipComponent>(CT.Courtship);
  const loneliness = agent.getComponent<LonelinessComponent>(CT.Loneliness);

  // Base threshold
  let threshold = 0.5 - courtship.romanticInclination * 0.3;

  // Desperation lowers threshold (less picky)
  if (loneliness) {
    const desperation = calculateDesperation(loneliness);
    threshold -= desperation * 0.4;  // Up to -40% threshold (much less picky)
  }

  // Mate pool scarcity (world-wide effect)
  const availableMates = countAvailableMates(agent);
  if (availableMates < 5) {
    threshold -= 0.1;  // -10% if <5 available
  }
  if (availableMates < 2) {
    threshold -= 0.2;  // -30% total if <2 available (desperate!)
  }

  return Math.max(0.1, threshold);  // Never below 10% (always some standards)
}
```

### Mate Pool Scarcity

```typescript
function countAvailableMates(agent: Entity): number {
  const world = agent.world;
  const sexuality = agent.getComponent<SexualityComponent>(CT.Sexuality);
  const species = agent.getComponent<SpeciesComponent>(CT.Species);

  // Query for potential mates
  const candidates = world.query()
    .with(CT.Courtship)
    .with(CT.Sexuality)
    .with(CT.Species)
    .executeEntities();

  let count = 0;
  for (const other of candidates) {
    if (other.id === agent.id) continue;

    // Check sexual compatibility
    if (!isGenderCompatible(agent, other, sexuality)) continue;

    // Check species compatibility
    const otherSpecies = other.getComponent<SpeciesComponent>(CT.Species);
    if (!species.isCompatibleWith(otherSpecies)) continue;

    // Check availability (single or open relationship)
    const otherSexuality = other.getComponent<SexualityComponent>(CT.Sexuality);
    if (!otherSexuality.activelySeeking && otherSexuality.currentPartner) {
      continue;  // In exclusive relationship
    }

    count++;
  }

  return count;
}
```

---

## Solution 2: Mate Poaching

### Attraction to Taken Partners

Some agents are attracted to partners who are already taken (social proof, challenge-seeking).

#### New Personality Trait

```typescript
interface PersonalityComponent {
  // ... existing traits

  // New trait: Mate Poaching Tendency
  matePoachingInclination: number;  // 0-1
  // 0 = Never pursues taken partners
  // 0.5 = Neutral, may pursue if very attractive
  // 1.0 = Actively prefers taken partners
}
```

**Distribution:**
- 60% of agents: 0.0-0.2 (avoid taken partners)
- 30% of agents: 0.2-0.5 (neutral, opportunistic)
- 10% of agents: 0.5-1.0 (actively poach)

### Poaching Logic

Modify `CourtshipSystem.findPotentialTargets()`:

```typescript
private findPotentialTargets(agent: Entity, world: World): Entity[] {
  const targets: Entity[] = [];
  const personality = agent.getComponent<PersonalityComponent>(CT.Personality);
  const matePoachingInclination = personality?.matePoachingInclination ?? 0.2;

  // Find all nearby agents
  const nearby = this.findNearbyAgents(agent, world);

  for (const other of nearby) {
    const otherSexuality = other.getComponent<SexualityComponent>(CT.Sexuality);
    const otherCourtship = other.getComponent<CourtshipComponent>(CT.Courtship);

    // Check if taken
    const isTaken = otherSexuality?.currentPartner &&
                    otherSexuality.relationshipStyle === 'monogamous';

    if (isTaken) {
      // Poaching attempt?
      const poachChance = matePoachingInclination * 0.5;  // Max 50% base chance

      // Attractiveness boost (social proof)
      const compatibility = calculateCompatibility(agent, other, world);
      const attractivenessBoost = compatibility * 0.3;  // Up to +30%

      // Social context boost (taverns encourage poaching)
      const contextBonus = this.getSocialContextBonus(agent, world, 'matePoaching');

      const finalChance = poachChance + attractivenessBoost + contextBonus;

      if (Math.random() < finalChance) {
        targets.push(other);  // Attempt to poach!
      }
    } else {
      // Single target - normal logic
      if (this.isValidTarget(agent, other)) {
        targets.push(other);
      }
    }
  }

  return targets;
}
```

### Poaching Consequences

When attempting to poach:

```typescript
interface PoachingAttempt {
  poacher: string;           // Agent attempting poach
  target: string;            // The taken agent
  currentPartner: string;    // Target's current partner

  // Outcomes:
  // 1. Success: Target leaves partner for poacher
  // 2. Rejection: Target stays loyal
  // 3. Conflict: Current partner confronts poacher
}
```

**Success Factors:**
- Target's relationship satisfaction (low = easier to poach)
- Poacher's charisma vs. current partner's charisma
- Target's own `matePoachingInclination` (high = more susceptible)
- Compatibility difference (poacher vs. current partner)

```typescript
function calculatePoachingSuccess(
  poacher: Entity,
  target: Entity,
  currentPartner: Entity,
  world: World
): number {
  // Base: Target's relationship satisfaction
  const relationship = getRelationship(target, currentPartner);
  const satisfaction = relationship?.satisfaction ?? 0.5;
  let successChance = (1.0 - satisfaction) * 0.6;  // Up to 60% if unhappy

  // Poacher attractiveness
  const poacherCompatibility = calculateCompatibility(poacher, target, world);
  const partnerCompatibility = calculateCompatibility(currentPartner, target, world);
  const compatibilityDiff = poacherCompatibility - partnerCompatibility;
  successChance += compatibilityDiff * 0.3;  // ±30% based on who's better match

  // Target's susceptibility
  const targetPersonality = target.getComponent<PersonalityComponent>(CT.Personality);
  const susceptibility = targetPersonality?.matePoachingInclination ?? 0.2;
  successChance += susceptibility * 0.2;  // Up to +20% if susceptible

  return Math.max(0, Math.min(0.9, successChance));  // Cap at 90%
}
```

**Poaching Events:**

```typescript
// If poaching succeeds:
world.eventBus.emit({
  type: 'courtship:poaching:success',
  source: poacher.id,
  data: {
    poacher: poacher.id,
    target: target.id,
    exPartner: currentPartner.id,
    satisfaction: relationship.satisfaction
  }
});

// Consequences:
// - Target breaks up with current partner
// - Poacher and target start courtship
// - Ex-partner gains 'betrayed' mood (-0.5 mood for 30 days)
// - Community gossip (reputation effects)
```

**Conflict Possibility:**

10% chance current partner confronts poacher:

```typescript
if (Math.random() < 0.1) {
  // Trigger conflict event
  world.eventBus.emit({
    type: 'conflict:romantic_rivalry',
    source: currentPartner.id,
    data: {
      aggressor: currentPartner.id,
      rival: poacher.id,
      target: target.id
    }
  });

  // Possible outcomes:
  // - Physical fight
  // - Social ostracism of poacher
  // - Partner wins back target's affection
}
```

---

## Solution 3: Social Context Effects

### Context-Aware Romance

Location and circumstances dramatically affect courtship success.

#### Context Types

```typescript
enum RomanceContext {
  // Negative contexts (-20% to -50%)
  Street = 'street',              // -10%
  Workplace = 'workplace',        // -20% (inappropriate)
  Funeral = 'funeral',            // -50% (very inappropriate)

  // Neutral contexts (0%)
  Market = 'market',              // 0%
  Park = 'park',                  // +10% (pleasant)

  // Positive contexts (+20% to +50%)
  Tavern = 'tavern',              // +30%
  DanceHall = 'dance_hall',       // +50% (best!)
  Cafe = 'cafe',                  // +20%
  Theater = 'theater',            // +25%
  Bathhouse = 'bathhouse',        // +30%

  // Special contexts
  Festival = 'festival',          // +40%
  Wedding = 'wedding',            // +35%
  Romantic_Dinner = 'romantic_dinner',  // +45%
}
```

#### Context Detection

```typescript
function detectRomanceContext(agent: Entity, world: World): RomanceContext {
  // Check if inside a building
  const building = getCurrentBuilding(agent, world);
  if (building) {
    return building.romanceContext;
  }

  // Check for events
  const nearbyEvent = getNearbyEvent(agent, world);
  if (nearbyEvent?.type === 'festival') {
    return RomanceContext.Festival;
  }
  if (nearbyEvent?.type === 'wedding') {
    return RomanceContext.Wedding;
  }

  // Default: street
  return RomanceContext.Street;
}
```

#### Context Modifier Application

```typescript
// In CourtshipStateMachine.considerCourtship():
const compatibility = calculateCompatibility(agent, target, world);
const context = detectRomanceContext(agent, world);
const contextBonus = ROMANCE_CONTEXT_BONUSES[context];

// Apply context bonus
const adjustedCompatibility = compatibility + contextBonus;

// Threshold remains same, but compatibility is boosted
const threshold = calculateCourtshipThreshold(agent);

if (adjustedCompatibility > threshold) {
  // Initiate courtship!
  courtship.state = 'interested';
  courtship.currentCourtshipTarget = target.id;
  return true;
}
```

**Context Bonuses Table:**

```typescript
const ROMANCE_CONTEXT_BONUSES: Record<RomanceContext, number> = {
  [RomanceContext.Funeral]: -0.5,
  [RomanceContext.Workplace]: -0.2,
  [RomanceContext.Street]: -0.1,
  [RomanceContext.Market]: 0.0,
  [RomanceContext.Park]: 0.1,
  [RomanceContext.Cafe]: 0.2,
  [RomanceContext.Theater]: 0.25,
  [RomanceContext.Tavern]: 0.3,
  [RomanceContext.Bathhouse]: 0.3,
  [RomanceContext.Wedding]: 0.35,
  [RomanceContext.Festival]: 0.4,
  [RomanceContext.Romantic_Dinner]: 0.45,
  [RomanceContext.DanceHall]: 0.5,
};
```

### Time of Day Effects

Romance is more likely at certain times:

```typescript
function getTimeOfDayBonus(hour: number): number {
  // Morning (6-12): -10% (busy, practical mindset)
  if (hour >= 6 && hour < 12) return -0.1;

  // Afternoon (12-17): 0% (neutral)
  if (hour >= 12 && hour < 17) return 0.0;

  // Evening (17-21): +20% (relaxed, social)
  if (hour >= 17 && hour < 21) return 0.2;

  // Night (21-24): +30% (romantic, intimate)
  if (hour >= 21 || hour < 2) return 0.3;

  // Late night (2-6): -20% (sleepy, not social)
  return -0.2;
}
```

### Weather Effects

```typescript
function getWeatherBonus(weather: WeatherType): number {
  switch (weather) {
    case 'sunny': return 0.1;        // Pleasant
    case 'rainy': return -0.1;       // Gloomy
    case 'snowing': return 0.15;     // Romantic (cuddle weather)
    case 'stormy': return -0.2;      // Scary, not romantic
    case 'foggy': return 0.05;       // Mysterious
    default: return 0.0;
  }
}
```

### Combined Context Formula

```typescript
function calculateTotalCourtshipBonus(agent: Entity, world: World): number {
  const context = detectRomanceContext(agent, world);
  const time = world.gameTime.hour;
  const weather = world.weather.current;

  let bonus = 0;

  // Location context (biggest factor)
  bonus += ROMANCE_CONTEXT_BONUSES[context];

  // Time of day
  bonus += getTimeOfDayBonus(time);

  // Weather
  bonus += getWeatherBonus(weather);

  // Social building occupancy (crowded = more options)
  const building = getCurrentBuilding(agent, world);
  if (building) {
    const occupancyRate = building.currentOccupants.length / building.capacity;
    if (occupancyRate > 0.5) {
      bonus += 0.1;  // +10% if >50% full (social proof)
    }
  }

  return bonus;
}
```

---

## Integration Examples

### Example 1: Desperate Agent at Tavern

**Agent:** Bob
- Days since last romance: 120 (4 months)
- Rejection count: 5
- Romantic inclination: 0.6
- At: Tavern, Friday night (21:00)

**Calculations:**
```typescript
// Desperation
const desperation = 0.2 + 0.3 + 0.3 + (0.1 * 2) = 1.0 (capped)

// Base threshold
let threshold = 0.5 - 0.6 * 0.3 = 0.32

// Desperation modifier
threshold -= 1.0 * 0.4 = -0.08 (threshold now 0.08!)

// Context bonuses
const compatibility = 0.45  // With Juliet
const contextBonus = 0.3 (tavern) + 0.2 (night) + 0.1 (crowded)
const adjustedCompatibility = 0.45 + 0.6 = 1.05

// Result: 1.05 > 0.08 → SUCCESS! Bob approaches Juliet
```

**Without improvements:** 0.45 > 0.32 → Success (but less likely)

---

### Example 2: Mate Poaching at Dance Hall

**Agent:** Chad (the poacher)
- Mate poaching inclination: 0.8 (high)
- At: Dance Hall, Saturday night
- Target: Emma (in relationship with Tom)

**Emma's relationship:**
- Satisfaction with Tom: 0.4 (unhappy)
- Compatibility with Tom: 0.6

**Chad's attempt:**
```typescript
// Poaching chance
const poachChance = 0.8 * 0.5 = 0.4  // 40% base

// Emma's attractiveness to Chad
const chadEmmaCompatibility = 0.75
const attractivenessBoost = 0.75 * 0.3 = 0.225

// Social context (dance hall)
const contextBonus = 0.2  // Dance halls encourage poaching

// Total chance
const totalChance = 0.4 + 0.225 + 0.2 = 0.825  // 82.5%!

// Success calculation
const successChance = (1.0 - 0.4) * 0.6 + (0.75 - 0.6) * 0.3 + 0.8 * 0.2
                    = 0.36 + 0.045 + 0.16
                    = 0.565  // 56.5% success!

// Result: 56% chance Emma leaves Tom for Chad
```

---

## New Components

### LonelinessComponent

```typescript
export class LonelinessComponent extends ComponentBase {
  public readonly type = 'loneliness';

  daysSinceLastRomance: number = 0;
  daysSinceLastIntimacy: number = 0;
  rejectionCount: number = 0;

  get desperationLevel(): number {
    return calculateDesperation(this);
  }

  recordRejection(): void {
    this.rejectionCount++;
  }

  recordRomance(): void {
    this.daysSinceLastRomance = 0;
    this.rejectionCount = Math.max(0, this.rejectionCount - 1);
  }

  recordIntimacy(): void {
    this.daysSinceLastIntimacy = 0;
  }

  advanceDay(): void {
    this.daysSinceLastRomance++;
    this.daysSinceLastIntimacy++;
  }
}
```

---

## New Systems

### LonelinessSystem

Tracks and updates loneliness for all agents:

```typescript
export class LonelinessSystem implements System {
  id = 'loneliness';
  priority = 5;  // Early, before courtship
  requiredComponents = [CT.Agent, CT.Loneliness];

  private dayCounter = 0;

  update(world: World, entities: Entity[], dt: number) {
    // Advance day counter
    const gameHour = world.gameTime.hour;
    if (gameHour === 0 && this.dayCounter !== world.gameTime.day) {
      this.dayCounter = world.gameTime.day;

      // Advance all loneliness components
      for (const entity of entities) {
        const loneliness = entity.getComponent<LonelinessComponent>(CT.Loneliness);
        loneliness?.advanceDay();
      }
    }

    // Clean up old rejections (30 day window)
    for (const entity of entities) {
      const loneliness = entity.getComponent<LonelinessComponent>(CT.Loneliness);
      if (loneliness && world.gameTime.day % 30 === 0) {
        loneliness.rejectionCount = 0;  // Reset monthly
      }
    }
  }
}
```

---

## UI Indicators

### Agent Tooltip

When hovering over an agent:

```
Bob (Male, 28)
❤️ Single (120 days)
😢 Desperation: High (80%)
🎯 Seeking: Anyone compatible
📍 At: Tavern
```

### Romance Events Feed

```
[21:45] Bob approached Alice at the tavern
[21:47] Alice accepted Bob's courtship
[22:15] Chad attempted to poach Emma from Tom
[22:17] Emma rejected Chad's advance
[22:18] Tom confronted Chad (rivalry!)
```

---

## Balance Considerations

### Prevent Excessive Poaching

- Limit poaching attempts per agent: 1 per week
- Reputation penalty for serial poachers (-0.1 per successful poach)
- Community gossip affects future courtship success

### Prevent Desperation Spam

- Cooldown after rejection: 3 days minimum
- Maximum approach rate: 1 per day
- Desperation doesn't override basic compatibility (still need >0.1 compatibility)

---

## Success Metrics

### Before Improvements:
- Courtship rate: ~5% of agents per month
- Most agents never find partners
- No drama, no social complexity

### After Improvements:
- Courtship rate: ~30% of agents per month
- Desperate agents eventually find someone
- Mate poaching creates rivalries, gossip, drama
- Social buildings become natural meeting places
- Relationships form faster in appropriate contexts

---

## Implementation Priority

1. **Phase 1:** Loneliness & desperation (highest impact)
2. **Phase 2:** Social context bonuses (requires buildings)
3. **Phase 3:** Mate poaching (adds complexity)

---

**End of Specification**
