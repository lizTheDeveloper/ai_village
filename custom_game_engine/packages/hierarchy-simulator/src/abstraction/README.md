# Abstraction Layer

Multi-scale simulation hierarchy bridging individual agents to galactic civilizations through statistical abstraction.

## Overview

7-tier ladder: **Tile** (9m²) → **Chunk** (3km², full ECS) → **Zone** (10⁵km²) → **Region** (10⁸km²) → **Subsection** (10¹⁰km²) → **Megasegment** (10¹³km²) → **Gigasegment** (10¹⁵km², billions)

**Simulation modes**: `abstract` (statistics only), `semi-active` (partial), `active` (full ECS).

**Time scaling**: Higher tiers simulate faster - gigasegment advances 1 year per tick vs chunk's real-time.

## Renormalization Concepts

### Scale Transitions

**Zoom out** (summarize): Convert ECS entities → statistical summaries. Preserve named NPCs, major buildings, historical events. Lose individual positions, behaviors, skill distributions.

**Zoom in** (instantiate): Generate entities satisfying statistical constraints (population, belief distribution, tech level, stability).

### Statistical Simulation

Inactive tiers use differential equations:
- **Population**: Logistic growth `dP/dt = r*P*(1-P/K)` with resource/stability modifiers
- **Economy**: Tech-scaled production, consumption tracking, auto-trade routes on imbalances
- **Belief**: Word-of-mouth spread, temple bonuses, miracle effects, natural decay
- **Tech**: University-based research accumulation, breakthrough events
- **Events**: Weighted random (plague, war, golden age) with severity-based effects

### Preserved Entities

**Named NPCs** (fame-based): Governors, high priests, heroes, scientists
**Major buildings**: Temples, universities, wonders, spaceport hubs
**Historical events**: Tech breakthroughs, wars, disasters (last 50 kept)

## Core Classes

### AbstractTierBase
Base implementation with population dynamics, economy simulation, stability tracking, tech progression, event processing. Auto-stabilizers form trade routes between children on resource imbalances.

### AbstractMegasegment
Adds cultural identities (languages, traditions, growth rates), regional phenomena (dimensional rifts, time dilation), tech levels, stability modifiers.

### AbstractGigasegment
Galactic-scale with luxury goods exports, cultural influence, diplomatic relations, massive transport hubs (spaceports, warp gates).

## Time Scales

| Tier | Area | Pop Range | 1 Tick = |
|------|------|-----------|----------|
| Gigasegment | 10¹⁵km² | 10B-100B | 1 year |
| Megasegment | 10¹³km² | 100M-1B | 1 month |
| Subsection | 10¹⁰km² | 10M-500M | 1 week |
| Region | 10⁸km² | 100K-10M | 1 day |
| Zone | 10⁵km² | 1K-100K | 1 hour |
| Chunk | 3km² | 10-1K | real-time |

## API

```typescript
import { AbstractTierBase } from './AbstractTierBase.js';

const tier = new AbstractTierBase('tier_1', 'Region Alpha', 'region',
  { region: 0 }, 'abstract');

tier.update(deltaTime);        // Simulate statistics
tier.activate();               // Abstract → semi-active → active
tier.addChild(childTier);      // Build hierarchy
tier.getTotalPopulation();     // Recursive population sum
```

See `renormalization/RenormalizationEngine.ts` for zoom in/out mechanics.
