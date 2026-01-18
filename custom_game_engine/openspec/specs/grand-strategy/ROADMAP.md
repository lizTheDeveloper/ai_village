# Grand Strategy Abstraction Layer - Roadmap

**Status:** Living Document
**Version:** 1.0.0
**Last Updated:** 2026-01-17
**Total Specs:** 14 documents

---

## Vision

A merger of **Stellaris** (grand strategy, galactic scale), **RimWorld** (individual colonist stories), and **Factorio** (complex production chains) - made possible by AI agents that can operate at any scale.

**Core Capability:** Players can zoom from watching a single agent craft a tool, to managing a galactic empire spanning thousands of star systems, to jumping forward millions of years to witness post-singularity civilizations building Dyson spheres.

---

## Spec Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                    GRAND STRATEGY ABSTRACTION LAYER                 │
│                                                                     │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐  │
│  │  00. Spec of     │  │  01. Master      │  │  02. Soul        │  │
│  │      Specs       │  │      Overview    │  │      Agents      │  │
│  │  [Meta]          │  │  [Architecture]  │  │  [Persistence]   │  │
│  └──────────────────┘  └──────────────────┘  └──────────────────┘  │
│                                                                     │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐  │
│  │  03. Time        │  │  04. Spatial     │  │  05. Ship-Fleet  │  │
│  │      Scaling     │  │      Hierarchy   │  │      Hierarchy   │  │
│  │  [Elastic Time]  │  │  [Tile→Galaxy]   │  │  [Crew→Navy]     │  │
│  └──────────────────┘  └──────────────────┘  └──────────────────┘  │
│                                                                     │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐  │
│  │  06. Political   │  │  07. Trade       │  │  08. Technology  │  │
│  │      Hierarchy   │  │      Logistics   │  │      Eras        │  │
│  │  [Village→Fed]   │  │  [Routes→Fed]    │  │  [15 Eras]       │  │
│  └──────────────────┘  └──────────────────┘  └──────────────────┘  │
│                                                                     │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐  │
│  │  09. Mega-       │  │  10. Multiverse  │  │  11. LLM         │  │
│  │      structures  │  │      Mechanics   │  │      Governors   │  │
│  │  [Kardashev]     │  │  [Fork/Travel]   │  │  [AI Rulers]     │  │
│  └──────────────────┘  └──────────────────┘  └──────────────────┘  │
│                                                                     │
│  ┌──────────────────┐  ┌──────────────────┐                        │
│  │  12. Player      │  │  13. Performance │                        │
│  │      Experience  │  │      Budget      │                        │
│  │  [UI/UX]         │  │  [Optimization]  │                        │
│  └──────────────────┘  └──────────────────┘                        │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Document Index

| # | Document | Status | Description |
|---|----------|--------|-------------|
| 00 | [Spec of Specs](./00-SPEC-OF-SPECS.md) | Meta | Index of existing systems, spec planning |
| 01 | [Grand Strategy Overview](./01-GRAND-STRATEGY-OVERVIEW.md) | Design | Master architecture, vision, integration |
| 02 | [Soul Agents](./02-SOUL-AGENTS.md) | Design | Cross-scale named character persistence (500 cap) |
| 03 | [Time Scaling](./03-TIME-SCALING.md) | Design | Elastic time: real-time → statistical → jump |
| 04 | [Spatial Hierarchy](./04-SPATIAL-HIERARCHY.md) | Design | 11 tiers: Tile → Chunk → ... → Galaxy |
| 05 | [Ship-Fleet Hierarchy](./05-SHIP-FLEET-HIERARCHY.md) | Design | 6 tiers: Crew → Ship → Squadron → Fleet → Armada → Navy |
| 06 | [Political Hierarchy](./06-POLITICAL-HIERARCHY.md) | Design | 7 tiers: Village → City → Province → Nation → Empire → Federation → Council |
| 07 | [Trade Logistics](./07-TRADE-LOGISTICS.md) | Design | 5 tiers: Route → Lane → Network → Federation → Inter-Universe |
| 08 | [Technology Eras](./08-TECHNOLOGY-ERAS.md) | Draft | 15 eras: Paleolithic → Post-Singularity |
| 09 | [Megastructures](./09-MEGASTRUCTURES.md) | Design | 5 categories: Orbital → Stellar → Galactic → Universal |
| 10 | [Multiverse Mechanics](./10-MULTIVERSE-MECHANICS.md) | Design | Universe forking, travel prerequisites, passages |
| 11 | [LLM Governors](./11-LLM-GOVERNORS.md) | Design | Multi-tier AI political decision-making |
| 12 | [Player Experience](./12-PLAYER-EXPERIENCE.md) | Draft | UI/UX, zoom transitions, story hooks |
| 13 | [Performance Budget](./13-PERFORMANCE-BUDGET.md) | Draft | Resource constraints, optimization strategies |

---

## Implementation Phases

### Phase 1: Foundation (Current Systems)
**Goal:** Leverage what already exists

| System | Status | Location | Notes |
|--------|--------|----------|-------|
| Hierarchy Simulator | ✅ Exists | `packages/hierarchy-simulator/` | 7 tiers, renormalization |
| Soul Repository | ✅ Exists | `SoulRepositorySystem` | Cross-universe persistence |
| Trade Agreements | ✅ Exists | `TradeAgreementSystem` | 5 scope levels |
| Governance | ✅ Exists | `GovernanceDataSystem` | Village-level democracy |
| Planet Types | ✅ Exists | `packages/world/src/planet/` | 17 planet types |
| Spaceship | ✅ Exists | `SpaceshipComponent` | β-space navigation |
| Production Chain | ✅ Exists | `SpaceflightItems.ts` | 65+ exotic materials |

### Phase 2: Scale Extension
**Goal:** Extend existing systems to interstellar scales

| Feature | Spec | Priority | Dependencies |
|---------|------|----------|--------------|
| Planet Tier | 04-SPATIAL | High | PlanetConfig, hierarchy-simulator |
| System Tier | 04-SPATIAL | High | Planet Tier |
| Squadron/Fleet | 05-SHIP-FLEET | High | SpaceshipComponent |
| Province/Nation | 06-POLITICAL | Medium | GovernanceDataSystem |
| Shipping Lanes | 07-TRADE | Medium | TradeAgreementSystem |

### Phase 3: Time Compression
**Goal:** Enable million-year gameplay spans

| Feature | Spec | Priority | Dependencies |
|---------|------|----------|--------------|
| Fast-Forward Mode | 03-TIME | High | Hierarchy Simulator |
| Time Jump | 03-TIME | Medium | LLM integration |
| Era Transitions | 08-TECH | Medium | Fast-Forward |
| Statistical Simulation | 03-TIME | High | Differential equations |

### Phase 4: Multiverse
**Goal:** Branching timelines and inter-universe travel

| Feature | Spec | Priority | Dependencies |
|---------|------|----------|--------------|
| Universe Forking | 10-MULTIVERSE | High | Persistence system |
| Travel Prerequisites | 10-MULTIVERSE | High | Era 10-11 tech |
| Passage Types | 10-MULTIVERSE | Medium | Ship hierarchy |
| Timeline Paradoxes | 10-MULTIVERSE | Low | HilbertTime |
| Inter-Universe Trade | 07-TRADE | Medium | Passages, Trust |

### Phase 5: Megastructures
**Goal:** Kardashev scale progression

| Feature | Spec | Priority | Dependencies |
|---------|------|----------|--------------|
| Orbital Category | 09-MEGA | Medium | Era 10 tech |
| Stellar Category | 09-MEGA | Medium | Era 12 tech |
| Wormhole Network | 09-MEGA | Low | Multiverse, Era 13 |
| Matrioshka Brain | 09-MEGA | Low | Era 14 tech |

### Phase 6: AI Governance
**Goal:** LLM-driven political management

| Feature | Spec | Priority | Dependencies |
|---------|------|----------|--------------|
| Village Governance | 11-LLM-GOV | High | Existing GovernanceData |
| City/Province LLM | 11-LLM-GOV | Medium | Political hierarchy |
| Nation/Empire LLM | 11-LLM-GOV | Low | Scale extension |
| Council Assembly | 11-LLM-GOV | Low | Galactic tier |

---

## Key Metrics & Constraints

### Soul Agent Cap
- **Current:** 500 soul agents per universe (configurable)
- **Memory:** ~60KB per agent × 500 = 30 MB
- **Rationale:** Full fidelity simulation across all scales

### Time Scale Table

| Tier | Time Scale | Example Duration |
|------|------------|------------------|
| Chunk (Village) | 1 tick = 1 second | Real-time |
| Region | 1 tick = 1 hour | 1 day = 24 ticks |
| Planet | 1 tick = 1 month | 1 year = 12 ticks |
| System | 1 tick = 1 year | 100 years = 100 ticks |
| Galaxy | 1 tick = 100 years | 10,000 years = 100 ticks |

### Performance Targets

| Zoom Level | Target TPS | Entity Count |
|------------|-----------|--------------|
| Village | 20 TPS | 100-500 |
| Region | 20 TPS | 500-2,000 |
| Planet | 10 TPS | 2,000-5,000 |
| System | 5 TPS | 5,000-10,000 |
| Galaxy | 1 TPS | 10,000+ |

---

## Technology Era Timeline

```
Era  0: Paleolithic      [0-10,000 years]      Stone Age survival
Era  1: Neolithic        [10,000-15,000]       Agricultural revolution
Era  2: Bronze Age       [15,000-17,000]       First cities and writing
Era  3: Iron Age         [17,000-19,000]       Empires and warfare
Era  4: Medieval         [19,000-20,500]       Feudalism, early science
Era  5: Renaissance      [20,500-21,000]       Art and enlightenment
Era  6: Industrial       [21,000-21,200]       Steam and factories
Era  7: Atomic           [21,200-21,250]       Nuclear age
Era  8: Information      [21,250-21,300]       Digital revolution
Era  9: Fusion           [21,300-21,400]       Clean energy mastery
Era 10: Interplanetary   [21,400-22,000]       Solar system colonization
Era 11: Interstellar     [22,000-25,000]       β-space discovery
Era 12: Transgalactic    [25,000-100,000]      Galaxy-spanning civilization
Era 13: Post-Singularity [100,000-1,000,000]   AI transcendence
Era 14: Universal        [1,000,000+]          Multiverse engineering
```

---

## Universe Configuration

### Magic Spectrum → Planet Availability

| Spectrum Preset | Starting Planet | Fantasy Planets | Notes |
|-----------------|-----------------|-----------------|-------|
| mundane | terrestrial | None | Pure sci-fi |
| low_fantasy | terrestrial | corrupted (5%) | Subtle magic |
| classic_fantasy | terrestrial | All (8-15%) | D&D style |
| mythic | **magical** | magical (40%) | Gods present |
| shinto_animism | terrestrial | fungal (20%) | Spirits everywhere |
| hard_magic | terrestrial | crystal (20%) | Systematic magic |
| wild_magic | **fungal** | All (25-30%) | Chaos reigns |
| dead_magic | terrestrial | corrupted (15%) | Magic died |
| ai_village | terrestrial | All (8-12%) | Balanced default |

### Travel Progression Gates

```
Interplanetary Travel (Era 10)
  └─ Requires: metallic_hydrogen, platinum_iridium, helium_3
     └─ Found on: system_planets (gas giants, asteroids, moons)

Interstellar Travel (Era 11)
  └─ Requires: strange_matter, degenerate_matter, frame_dragging_residue
     └─ Found in: other_stars (neutron stars, black holes, white dwarfs)

Inter-Universe Travel (Era 12+)
  └─ Requires: void_essence, timeline_fragment, reality_thread
     └─ Found via: passages (threads, bridges, gates, confluences)
```

---

## Cross-Domain Integration Map

```
                    ┌─────────────┐
                    │   SPATIAL   │
                    │  Hierarchy  │
                    │ (04-SPATIAL)│
                    └──────┬──────┘
                           │
           ┌───────────────┼───────────────┐
           │               │               │
    ┌──────┴──────┐ ┌──────┴──────┐ ┌──────┴──────┐
    │   SHIP      │ │  POLITICAL  │ │   TRADE     │
    │  Hierarchy  │ │  Hierarchy  │ │  Hierarchy  │
    │ (05-SHIP)   │ │ (06-POLIT)  │ │ (07-TRADE)  │
    └──────┬──────┘ └──────┬──────┘ └──────┬──────┘
           │               │               │
           └───────────────┼───────────────┘
                           │
              ┌────────────┴────────────┐
              │                         │
       ┌──────┴──────┐          ┌───────┴───────┐
       │    SOUL     │          │   MULTIVERSE  │
       │   Agents    │          │   Mechanics   │
       │ (02-SOUL)   │          │ (10-MULTI)    │
       └──────┬──────┘          └───────┬───────┘
              │                         │
              └────────────┬────────────┘
                           │
                    ┌──────┴──────┐
                    │    TIME     │
                    │   Scaling   │
                    │ (03-TIME)   │
                    └─────────────┘
```

---

## Key Files Reference

### Core Packages
- `packages/hierarchy-simulator/` - Renormalization, tier system
- `packages/world/src/planet/` - PlanetTypes, PlanetConfig
- `packages/persistence/` - Save/load, universe snapshots
- `packages/core/src/systems/` - TradeAgreement, Governance

### Production Chain
- `packages/core/src/items/SpaceflightItems.ts` - 65+ exotic materials
- `packages/core/src/crafting/SpaceflightRecipes.ts` - Crafting recipes
- `packages/core/src/research/SpaceshipResearch.ts` - Tech progression

### Magic System
- `packages/magic/src/ParadigmSpectrum.ts` - SPECTRUM_PRESETS
- `packages/renderer/src/UniverseConfigScreen.ts` - Universe creation UI

---

## Open Questions

1. **Invasion Mechanics:** How do advanced civilizations conquer primitive forks while remaining fun?
2. **Canon Events:** What events are immutable vs. forkable?
3. **Merge Mechanics:** When can divergent timelines re-merge?
4. **Player Scale:** What's the maximum comfortable complexity at each tier?
5. **Performance Ceiling:** How many concurrent universes can run?

---

## Changelog

| Date | Change |
|------|--------|
| 2026-01-17 | Initial roadmap created |
| 2026-01-17 | Added universe configuration → planet mapping |
| 2026-01-17 | Soul agent cap updated to 500 |
| 2026-01-17 | Travel progression gates defined |
| 2026-01-17 | Inter-universe trade tier added to 07-TRADE |

---

*This roadmap is a living document. Update as specs evolve.*
