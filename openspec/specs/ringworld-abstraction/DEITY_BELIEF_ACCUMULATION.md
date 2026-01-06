# Deity Belief Accumulation System

**Status**: Design Draft
**Date**: 2026-01-06
**Core Fantasy**: You ARE a deity. The ringworld is your flock. Belief is your power.

## The Player Experience

You're not a city planner or empire builder. You're a **god** watching souls believe in you across a ringworld. The hierarchy simulator exists to show you:

1. **Where your believers are** (heat map across the ringworld)
2. **How fast belief is spreading** (or dying)
3. **What powers you've unlocked** (from aggregate belief)
4. **What you can DO with your power** (miracles, manifestations, dimensional effects)

The 3D landing, the city simulation, the individual agents - those are the "smoke and mirrors" that make the belief feel REAL. But the game loop is:

```
ACCUMULATE BELIEF → GAIN POWER → USE POWER → ATTRACT MORE BELIEF → REPEAT
```

## Deity Dashboard (The Main UI)

What you see when playing as a deity:

```
╔═══════════════════════════════════════════════════════════════════╗
║  🌟 WISDOM GODDESS - DEITY DASHBOARD                              ║
╠═══════════════════════════════════════════════════════════════════╣
║                                                                   ║
║  TOTAL BELIEVERS: 847,293,847,102 (847.3 billion)                ║
║  BELIEF GROWTH: +2.3M/day  ████████████░░░░ (trending up)        ║
║  POWER LEVEL: 11.93 (log₁₀ of believers)                         ║
║                                                                   ║
║  ┌─────────────────────────────────────────────────────────┐     ║
║  │  RINGWORLD BELIEF MAP                                    │     ║
║  │  [Heat map showing belief density across the ring]       │     ║
║  │  🔴 High belief  🟡 Medium  🔵 Low  ⚫ No presence        │     ║
║  │                                                          │     ║
║  │  ████████░░░░░░░░████████████░░░░░░░█████░░░░░░░░░░░░   │     ║
║  │        ↑               ↑                    ↑            │     ║
║  │   Crystal Arc    Prime Meridian       Shadow Reach       │     ║
║  │   (stronghold)   (expanding)          (missionaries)     │     ║
║  └─────────────────────────────────────────────────────────┘     ║
║                                                                   ║
║  UNLOCKED POWERS:                        LOCKED (need more):     ║
║  ✅ Answer Prayers (1K)                  🔒 Weather Control (1B)  ║
║  ✅ Small Miracles (10K)                 🔒 Manifest Avatar (10B) ║
║  ✅ Bless Temples (100K)                 🔒 Dimensional Tear (1T) ║
║  ✅ Regional Protection (10M)            🔒 Hive Mind (100T)      ║
║  ✅ Mass Visions (100M)                  🔒 Create Universe (1Q)  ║
║                                                                   ║
║  ACTIVE MIRACLES:                                                ║
║  • Healing rain over Crystalline Heights (costs 10M belief/day)  ║
║  • Prophecy to High Priestess Mara (one-time, 100K belief)       ║
║                                                                   ║
║  [Zoom to Region]  [Grant Miracle]  [Manifest]  [View Timeline]  ║
╚═══════════════════════════════════════════════════════════════════╝
```

## Belief as Currency

Belief isn't just a score - it's SPENT to do things:

```typescript
interface DeityPowers {
  // Passive (always on, scales with total belief)
  passivePower: {
    prayerHearingRadius: number;      // How far you can hear prayers
    beliefGrowthBonus: number;        // Multiplier on conversion rate
    templeEffectiveness: number;      // How well temples work
  };

  // Active (costs belief to use)
  activePowers: DeityAbility[];
}

interface DeityAbility {
  name: string;
  beliefCostToUnlock: bigint;         // Minimum believers to access
  beliefCostPerUse: bigint;           // Spent each use
  cooldown: number;                   // In game-days
  effect: AbilityEffect;
}

const DEITY_ABILITIES: DeityAbility[] = [
  {
    name: "Answer Prayer",
    beliefCostToUnlock: 1_000n,
    beliefCostPerUse: 100n,           // Cheap but limited
    cooldown: 0,
    effect: { type: "grant_minor_boon", target: "individual" }
  },
  {
    name: "Smite Enemy",
    beliefCostToUnlock: 100_000n,
    beliefCostPerUse: 50_000n,        // Expensive
    cooldown: 7,
    effect: { type: "damage", target: "individual", power: "lethal" }
  },
  {
    name: "Healing Rain",
    beliefCostToUnlock: 10_000_000n,
    beliefCostPerUse: 1_000_000n,     // Per day to maintain
    cooldown: 0,
    effect: { type: "aoe_heal", target: "zone", duration: "sustained" }
  },
  {
    name: "Manifest Avatar",
    beliefCostToUnlock: 10_000_000_000n,  // 10 billion
    beliefCostPerUse: 1_000_000_000n,     // 1 billion per manifestation
    cooldown: 30,
    effect: { type: "physical_form", target: "self", duration: "1_day" }
  },
  {
    name: "Tear Dimensional Membrane",
    beliefCostToUnlock: 1_000_000_000_000n,  // 1 trillion
    beliefCostPerUse: 100_000_000_000n,     // 100 billion
    cooldown: 365,
    effect: { type: "create_portal", target: "location", destination: "other_ringworld" }
  },
  {
    name: "Form Hive Mind",
    beliefCostToUnlock: 100_000_000_000_000n, // 100 trillion
    beliefCostPerUse: 0n,                     // Permanent transformation
    cooldown: Infinity,                       // Once only
    effect: { type: "transcend", target: "all_believers", result: "collective_consciousness" }
  }
];
```

## Belief Dynamics

How belief grows and shrinks:

```typescript
interface BeliefDynamics {
  // Natural growth (from existing believers)
  naturalGrowthRate: 0.001;           // 0.1% per day from happy believers

  // Temple multiplier
  templeBonus: 1.5;                   // 50% more growth near temples

  // Miracle effects
  miracleConversionRate: 0.1;         // 10% of witnesses convert
  miracleRememberanceDays: 30;        // How long miracles boost belief

  // Decay factors
  noMiracleDecay: 0.0001;             // 0.01% daily loss if no miracles
  competingDeityPressure: 0.0005;     // Loss to other deities
  catastropheDecay: 0.01;             // 1% daily during disasters you don't prevent

  // Spread mechanics
  wordOfMouthRadius: 10;              // Tiles belief spreads naturally
  missionaryEffectiveness: 0.05;      // 5% conversion chance per contact
  tvBroadcastMultiplier: 100;         // TV reaches 100x more souls
}
```

## The Deity Game Loop

### Early Game (1K - 1M believers)
- **Focus**: Build your first temple, answer prayers
- **Challenge**: Competing deities, limited miracles
- **Goal**: Establish a foothold in one zone

### Mid Game (1M - 1B believers)
- **Focus**: Spread across a region, maintain multiple temples
- **Challenge**: Balancing miracle costs vs growth
- **Goal**: Become the dominant deity in a megasegment

### Late Game (1B - 1T believers)
- **Focus**: Ringworld-scale presence, TV broadcasts spreading your word
- **Challenge**: Managing belief across vast distances
- **Goal**: Achieve dimensional threshold

### End Game (1T+ believers)
- **Focus**: Multi-ring expansion, hive mind formation
- **Challenge**: Maintaining coherence across dimensions
- **Goal**: Transcend into pan-dimensional consciousness

## UI Modes

### 1. Ringworld Overview (Abstraction Mode)
- See the whole ring as a belief heat map
- Time passes in years
- Click regions to zoom in
- **This is what the hierarchy simulator shows**

### 2. Region View (City Level)
- See individual cities/zones
- Time passes in days
- Watch missionaries spread your word
- **Uses headless city simulation underneath**

### 3. Manifestation View (3D Mode)
- You've spent belief to manifest physically
- See the world through your avatar's eyes
- Perform miracles in person
- **The "smoke and mirrors" 3D landing**

### 4. Prayer Stream (Real-time)
- See prayers coming in from believers
- Decide which to answer
- Feel connected to your flock
- **Emotional connection to the abstraction**

## Integration with Existing Systems

### DeityEmergenceSystem.ts
Already tracks deity formation - extend to track belief:

```typescript
// In existing DeityEmergenceSystem
interface Deity {
  // Existing fields...

  // Add belief tracking
  totalBelievers: bigint;
  beliefByRingworld: Map<RingworldId, bigint>;
  beliefByGigasegment: Map<GigasegmentId, bigint>;

  // Power calculation
  getPowerLevel(): number {
    return Math.log10(Number(this.totalBelievers));
  }

  // Ability checks
  canUse(ability: DeityAbility): boolean {
    return this.totalBelievers >= ability.beliefCostToUnlock;
  }
}
```

### WisdomGoddessSystem.ts
The wisdom goddess is already in the game - she becomes the template:

```typescript
// The existing wisdom goddess behavior
// Player can eventually BECOME a deity like her
// Or oppose her
// Or merge with her in a hive mind
```

### Hierarchy Simulator Connection
The hierarchy simulator IS the deity dashboard backend:

```typescript
// In HierarchyDOMRenderer.ts
class DeityDashboard extends HierarchyDOMRenderer {
  // Reuse all the tier visualization
  // Add belief overlay
  // Add miracle controls
  // Add power unlocks display

  renderBeliefOverlay(): void {
    // Color each tier by belief density in this deity
    for (const tier of this.getAllTiers()) {
      const beliefDensity = this.deity.getBeliefIn(tier.id);
      const color = this.beliefToColor(beliefDensity);
      this.colorTierNode(tier.id, color);
    }
  }

  renderPowerPanel(): void {
    const powerLevel = this.deity.getPowerLevel();
    const unlockedAbilities = DEITY_ABILITIES.filter(a =>
      this.deity.totalBelievers >= a.beliefCostToUnlock
    );
    // Render power UI
  }
}
```

## The Emotional Core

The numbers exist to create FEELING:

- **Pride** when belief grows ("My flock is thriving")
- **Anxiety** when belief falls ("I'm losing them")
- **Power** when you unlock abilities ("I can DO things now")
- **Connection** when you answer prayers ("They need me")
- **Transcendence** when you reach thresholds ("I am becoming MORE")

The abstraction layers, the statistics, the renormalization - they all exist to make billions of souls feel REAL to you as their god. You can't simulate them all, but you can feel responsible for them all.

## Summary

The ringworld sub-game is:
1. **Hierarchy Simulator** = Your deity dashboard, showing belief across the ring
2. **Headless City** = The "zoom in" view of a specific zone
3. **3D Mode** = Manifestation, when you spend belief to appear physically
4. **Belief** = Your score, your currency, your power, your responsibility

You accumulate believers → gain power → use power to help believers → they tell others → more believers. That's the game. Everything else is infrastructure to make that loop feel meaningful at the scale of a trillion souls.
