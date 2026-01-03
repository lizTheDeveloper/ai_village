> **System:** building-system
> **Version:** 1.0
> **Status:** Draft
> **Last Updated:** 2026-01-02

# Nightlife & Social Buildings Specification

**Version:** 1.0
**Date:** 2026-01-01
**Status:** Draft
**Dependencies:** Building System, Social System, Courtship System

---

## Overview

Social buildings provide gathering places where agents naturally meet, interact, and form relationships. These buildings boost social interaction rates, courtship success, and community cohesion.

**Core Principle:** People meet people in places, not randomly on streets.

---

## Building Types

### Tier 1: Basic Social Spaces

#### **Campfire / Fire Pit**
- **Unlocks:** Start
- **Size:** 2x2
- **Capacity:** 6 agents
- **Hours:** Dusk to midnight (18:00-24:00)
- **Effects:**
  - +20% conversation rate within 5 tiles
  - +15% courtship initiation chance
  - +10% relationship bond strength
- **Behaviors:**
  - Agents gather when tired/social need high
  - Storytelling, singing, casual chat
  - Romance can spark around fire

#### **Market Plaza**
- **Unlocks:** Start
- **Size:** 5x5 open area
- **Capacity:** 20 agents
- **Hours:** Dawn to dusk (6:00-18:00)
- **Effects:**
  - +30% social interaction rate
  - +10% trading efficiency
  - +5% courtship (daytime social context)
- **Behaviors:**
  - Agents shop, trade, gossip
  - Merchant NPCs possible
  - Casual encounters, not romantic focus

---

### Tier 2: Dedicated Social Buildings

#### **Tavern / Pub**
- **Unlocks:** Research Tier 2 (Brewing)
- **Size:** 6x6
- **Capacity:** 15 agents
- **Hours:** Evening to late night (16:00-2:00)
- **Staff:** 1 bartender (optional)
- **Resources:**
  - Consumes: Ale, mead, bread (1/hour per 5 visitors)
  - Produces: Social bonds, gossip, romantic encounters
- **Effects:**
  - +40% conversation rate
  - +30% courtship initiation
  - +20% mate poaching attempts
  - -10% selectivity (alcohol lowers standards)
  - +15% friendship formation
- **Behaviors:**
  - **Drinking:** Lowers inhibition, increases boldness
  - **Storytelling:** Agents share adventures, boost reputation
  - **Flirting:** Primary courtship location
  - **Brawls:** Low chance of conflicts (5% if drunk + low compatibility)

**Interior Zones:**
- **Bar Counter:** High social density, bartender interaction
- **Tables:** Small group conversations (2-4 agents)
- **Corners:** Private conversations, romantic encounters

#### **Dance Hall / Club**
- **Unlocks:** Research Tier 3 (Music & Arts)
- **Size:** 8x8
- **Capacity:** 25 agents
- **Hours:** Night to dawn (20:00-4:00)
- **Staff:** 1 musician/DJ (optional)
- **Resources:**
  - Consumes: Candles/torches (lighting)
  - Requires: Musical instruments
- **Effects:**
  - +50% courtship initiation (highest!)
  - +25% physical attraction weight
  - +20% mate poaching
  - -15% selectivity (party atmosphere)
  - +10% relationship excitement
- **Behaviors:**
  - **Dancing:** Paired or group, physical proximity boost
  - **Music:** Mood enhancement, energy boost
  - **Flirting:** Very high romance rate
  - **Showing Off:** Agents with high charisma attract attention

**Music Types Affect Mood:**
- **Fast/Energetic:** +excitement, +boldness
- **Slow/Romantic:** +romance, +intimacy
- **Cultural:** +community bond

#### **Cafe / Tea House**
- **Unlocks:** Research Tier 2 (Cooking)
- **Size:** 5x5
- **Capacity:** 12 agents
- **Hours:** Morning to evening (8:00-20:00)
- **Staff:** 1 server (optional)
- **Resources:**
  - Consumes: Coffee/tea, pastries
- **Effects:**
  - +25% conversation depth (intellectual talks)
  - +20% interest-based compatibility matching
  - +15% courtship (slower, relationship-focused)
  - +20% friendship formation
- **Behaviors:**
  - **Reading:** Agents with books/scrolls
  - **Debates:** Intellectual conversations
  - **Dates:** Quieter courtship, personality focus
  - **Planning:** Social groups organize events

---

### Tier 3: Advanced Social Infrastructure

#### **Theater / Performance Hall**
- **Unlocks:** Research Tier 4 (Performing Arts)
- **Size:** 10x12
- **Capacity:** 40 agents (audience)
- **Hours:** Evening shows (18:00-22:00)
- **Staff:** Performers (actors, musicians)
- **Effects:**
  - +30% cultural cohesion
  - +20% courtship (during intermission)
  - +15% shared memory creation
  - Agents attend as couples (date night)
- **Behaviors:**
  - **Shows:** Theater, music, comedy
  - **Intermission:** Social mixing, meet & greet
  - **Dates:** Couples attend together

#### **Bathhouse / Spa**
- **Unlocks:** Research Tier 3 (Plumbing)
- **Size:** 8x8
- **Capacity:** 15 agents
- **Hours:** Afternoon to evening (14:00-22:00)
- **Effects:**
  - +30% relaxation, stress relief
  - +25% physical attraction weight
  - +20% courtship (intimate setting)
  - +15% health/hygiene bonus
- **Behaviors:**
  - **Bathing:** Cleanliness, health
  - **Massage:** Relaxation
  - **Socializing:** Casual, intimate conversations
  - **Romance:** Private rooms for couples

#### **Park / Garden Plaza**
- **Unlocks:** Research Tier 2 (Landscaping)
- **Size:** 10x10 open area
- **Capacity:** 30 agents
- **Hours:** All day (6:00-20:00)
- **Effects:**
  - +20% nature appreciation
  - +25% romantic walks
  - +15% courtship (scenic beauty)
  - +10% meditation/peace
- **Behaviors:**
  - **Strolling:** Romantic walks
  - **Picnics:** Casual dates
  - **Children:** Families visit
  - **Proposals:** Special romantic moments

---

## Social Context System

### Context Modifiers

Buildings apply context bonuses to interactions:

```typescript
interface SocialContext {
  buildingType: BuildingTypeString;
  contextBonus: {
    conversationRate: number;      // Multiplier for chat frequency
    courtshipChance: number;        // Boost to romance initiation
    selectivityReduction: number;   // Lower standards in this context
    matePoachingChance: number;     // Attraction to taken people
    bondStrength: number;           // Relationship quality boost
  };
  activeHours: [number, number];    // Start, end hours
}
```

**Example: Tavern Context**
```typescript
{
  buildingType: 'tavern',
  contextBonus: {
    conversationRate: 1.4,      // +40% more chats
    courtshipChance: 1.3,       // +30% romance attempts
    selectivityReduction: 0.1,  // -10% pickiness
    matePoachingChance: 0.2,    // 20% try to steal mates
    bondStrength: 1.1           // +10% bond quality
  },
  activeHours: [16, 26]  // 4pm to 2am (26 = 2am next day)
}
```

### Social Magnetism

Buildings attract agents based on needs and personality:

```typescript
interface SocialMagnetism {
  // Agent drawn to building when:
  socialNeed: number;           // 0-1, higher = more likely to visit
  lonelinessLevel: number;      // Time since last social interaction
  romanticInclination: number;  // Seeking romance
  activelySeeking: boolean;     // Looking for partner

  // Personality modifiers:
  extroversion: number;         // Extroverts visit more
  openness: number;             // Open people try new venues
  preferredVenues: BuildingTypeString[];  // Learned preferences
}
```

**Visit Probability Formula:**
```typescript
function calculateVisitProbability(agent: Agent, building: SocialBuilding): number {
  let base = 0.1;  // 10% base chance per hour

  // Needs-based
  base += agent.socialNeed * 0.3;           // Up to +30%
  base += agent.lonelinessLevel * 0.2;      // Up to +20%
  base += agent.romanticInclination * 0.15; // Up to +15%

  // Personality
  base *= (0.5 + agent.extroversion * 0.5); // 50-100% based on extroversion

  // Time of day match
  const currentHour = world.gameTime.hour;
  if (building.isOpen(currentHour)) {
    base *= 1.5;  // +50% if open
  } else {
    base = 0;  // Can't visit if closed
  }

  // Venue preference (learned)
  if (agent.preferredVenues.includes(building.type)) {
    base *= 1.3;  // +30% for favorite spots
  }

  return Math.min(1.0, base);
}
```

---

## Interaction Behaviors

### Tavern Behaviors

#### **Bar Chat**
- **Trigger:** Agent at bar, bartender present
- **Duration:** 5-15 minutes
- **Effects:**
  - Learn local gossip
  - Hear about single agents
  - Get advice on romance
  - Bond with bartender

#### **Group Drinking**
- **Trigger:** 3+ agents at same table
- **Duration:** 30-60 minutes
- **Effects:**
  - Friendship formation
  - Shared memories
  - Matchmaking (friends introduce singles)
  - Drunk shenanigans

#### **Romantic Approach**
- **Trigger:** Attractive agent spotted, social context bonus
- **Success Factors:**
  - Attractiveness
  - Context (tavern +30%)
  - Intoxication level (-10% selectivity)
  - Confidence/charisma
- **Outcomes:**
  - **Success:** Conversation starts, courtship begins
  - **Rejection:** Cooldown, possible embarrassment
  - **Ignore:** Agent wasn't interested

### Dance Hall Behaviors

#### **Dance Invitation**
- **Trigger:** Agent wants to dance, sees potential partner
- **Success Factors:**
  - Physical attraction
  - Music energy level
  - Social confidence
  - Partner availability
- **Effects:**
  - Physical proximity bonus (+25% attraction)
  - Immediate compatibility test
  - High romance potential

#### **Show Off**
- **Trigger:** High charisma agent enters dance floor
- **Effects:**
  - Attracts multiple onlookers
  - Reputation boost
  - Mate poaching magnet

---

## Building Component Extension

```typescript
interface SocialBuildingComponent extends BuildingComponent {
  // Existing BuildingComponent fields
  buildingType: BuildingTypeString;

  // New fields for social buildings
  socialContext: SocialContext;
  currentOccupants: string[];       // Agent IDs currently inside
  capacity: number;                 // Max agents
  activeHours: [number, number];    // Operating hours

  // Staff
  staff: {
    bartender?: string;   // Agent ID
    musician?: string;
    server?: string;
  };

  // Resources
  consumables: {
    food?: number;
    drink?: number;
    entertainment?: number;
  };

  // Metrics
  metrics: {
    totalVisits: number;
    romanceCount: number;         // Courtships started here
    friendshipsFormed: number;
    averageStayDuration: number;  // Minutes
  };
}
```

---

## Social Gathering System

New system to manage building occupancy and interactions:

```typescript
class SocialGatheringSystem implements System {
  id = 'social_gathering';
  priority = 12;  // After movement, before courtship
  requiredComponents = [CT.Agent, CT.Position];

  update(world: World, entities: Entity[], dt: number) {
    // 1. Find all social buildings
    const socialBuildings = this.getSocialBuildings(world);

    // 2. For each agent, evaluate visiting buildings
    for (const agent of entities) {
      const currentBuilding = this.getCurrentBuilding(agent, socialBuildings);

      if (currentBuilding) {
        // Agent is inside a building
        this.processInsideBehavior(agent, currentBuilding, world);
      } else {
        // Agent outside, might visit
        this.evaluateVisit(agent, socialBuildings, world);
      }
    }

    // 3. Apply context bonuses to interactions
    this.applyContextBonuses(socialBuildings, world);
  }

  private evaluateVisit(agent: Entity, buildings: SocialBuilding[], world: World) {
    for (const building of buildings) {
      const prob = calculateVisitProbability(agent, building);
      if (Math.random() < prob * TICK_DURATION) {
        this.enterBuilding(agent, building, world);
        break;  // Only visit one building
      }
    }
  }

  private processInsideBehavior(agent: Entity, building: SocialBuilding, world: World) {
    const duration = agent.timeInBuilding || 0;

    // Decide when to leave
    const stayDuration = this.calculateStayDuration(agent, building);
    if (duration > stayDuration) {
      this.leaveBuilding(agent, building, world);
      return;
    }

    // Perform social actions
    this.performSocialAction(agent, building, world);
  }
}
```

---

## Integration with Courtship System

### Context-Aware Courtship

Modify `CourtshipSystem.findPotentialTargets()` to consider social context:

```typescript
private findPotentialTargets(agent: Entity, world: World): Entity[] {
  const targets: Entity[] = [];

  // Check if agent is in a social building
  const currentBuilding = this.getCurrentSocialBuilding(agent, world);

  if (currentBuilding) {
    // Prioritize others in same building
    const occupants = this.getBuildingOccupants(currentBuilding);
    for (const other of occupants) {
      if (this.isValidTarget(agent, other)) {
        targets.push(other);
      }
    }

    // Apply context bonus
    this.applyContextBonus(agent, currentBuilding.socialContext);
  }

  // Fallback to proximity-based (existing behavior)
  if (targets.length === 0) {
    targets.push(...this.findNearbyTargets(agent, world));
  }

  return targets;
}
```

---

## Progression & Unlocks

### Research Tree

```yaml
Tier 1 - Basic Socialization:
  - Campfire: Available from start
  - Market Plaza: Available from start

Tier 2 - Community Buildings:
  - Tavern: Requires "Brewing" research
  - Cafe: Requires "Advanced Cooking" research

Tier 3 - Entertainment:
  - Dance Hall: Requires "Music & Arts" research
  - Bathhouse: Requires "Plumbing & Hygiene" research
  - Park: Requires "Landscaping" research

Tier 4 - Cultural Centers:
  - Theater: Requires "Performing Arts" research
```

---

## UI/UX Considerations

### Building Info Panel

When selecting a social building, show:
- Current occupants (count / capacity)
- Active bonuses (+30% courtship, etc.)
- Recent events (romance sparked, friendship formed)
- Operating hours (open/closed)
- Resource consumption (drinks, food)

### Agent Social Calendar

Agents develop routines:
- "Bob visits the tavern every Friday evening"
- "Alice goes to the cafe every morning"
- Learned preferences based on successful interactions

---

## Success Metrics

### Per Building:
- **Visit Frequency:** Visits per day
- **Romance Success:** Courtships started / Total visits
- **Friendship Formation:** New friends / Total visits
- **Average Stay:** How long agents linger
- **Capacity Utilization:** Peak occupancy %

### Village-Wide:
- **Social Health:** % of agents visiting social buildings weekly
- **Courtship Rate:** Romances per 100 agents per week
- **Community Cohesion:** Friend network density

---

## Example: A Night at the Tavern

**6:00 PM:** Tavern opens, bartender arrives
**6:30 PM:** First customers (workers finishing day)
**7:00 PM:** Bob (lonely, romantic inclination 0.7) enters
**7:15 PM:** Alice (single, extroverted) enters
**7:20 PM:** Bob notices Alice at bar (+30% courtship from tavern context)
**7:25 PM:** Bob approaches Alice (success: high compatibility + context)
**7:30-8:30 PM:** Bob & Alice chat, drink, bond
**8:45 PM:** Courtship initiated (state: interested)
**9:00 PM:** They leave together, walk to Alice's home
**9:30 PM:** Courtship progresses (state: courting)

**Without tavern:** Bob and Alice might never have met (different work schedules, live far apart).

---

## Implementation Priority

1. **Phase 1:** Tavern + basic social context system
2. **Phase 2:** Dance Hall + enhanced courtship integration
3. **Phase 3:** Cafe, Park (daytime alternatives)
4. **Phase 4:** Theater, Bathhouse (advanced features)

---

## Questions for Design

1. Should buildings have reputations? (Popular tavern vs. sketchy dive bar)
2. Events at buildings? (Live music night, speed dating)
3. Building customization? (Owner can set drink prices, music style)
4. Exclusive venues? (Members-only clubs)
5. Building rivalries? (Tavern vs. tavern competition)

---

**End of Specification**
