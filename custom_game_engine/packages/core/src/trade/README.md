# Trade System

Agent-to-agent and civilization-to-civilization trading across temporal dimensions.

## Overview

Formal trade agreements between civilizations mediated by mayor/diplomat agents. Supports local village trades, cross-timeline exchanges, cross-universe commerce, and cross-multiverse transactions via portals.

## Trade Mechanics

**Scope Levels** (`TradeAgreementTypes.ts`)
- `local` - Same universe, same civilization
- `inter_village` - Same universe, different villages
- `cross_timeline` - Forked universe branches (same multiverse)
- `cross_universe` - Different universe, same multiverse
- `cross_multiverse` - Portal-based trade between multiverses

**Agreement Structure**
- Parties: Civilizations with mayor/diplomat representatives
- Terms: Item transfers, quantities, delivery schedules, payment (gold/belief/barter/favor)
- Status: proposed → negotiating → active → fulfilled/expired/violated
- Trust levels: untrusted → new → established → trusted (affects escrow)

## Pricing & Costs

**Facilitation Costs** (belief-based, from `calculateTradeFacilitationCost`)
- Local: 0% (free)
- Inter-village: 1%
- Cross-timeline: 5%
- Cross-universe: 10%
- Cross-multiverse: 25%

**Escrow Requirements** (`calculateEscrowRequirement`)
- Cross-multiverse: Always required
- Cross-universe: Required unless trusted
- Local: Required if untrusted

**Delivery Times** (`estimateDeliveryTime`, immediate mode)
- Local: 100 ticks (~5s)
- Inter-village: 1200 ticks (~1min)
- Cross-timeline: 2400 ticks (~2min)
- Cross-universe: 6000 ticks (~5min)
- Cross-multiverse: 12000 ticks (~10min)

## LLM-Driven Negotiation

`MayorNegotiator.ts` enables mayors to evaluate proposals and generate counter-offers:
- Analyzes civilization needs, resources, trust levels
- Produces accept/reject/counter decisions with reasoning
- Falls back to rule-based logic if LLM unavailable
- Uses civilization context: population, food supply, strategic focus

## Temporal Diplomacy

`TemporalDiplomacy.ts` handles advanced post-temporal civilization interactions:
- Fork bomb detection (rate limiting timeline proliferation)
- Timeline shear measurement (divergence between β-branches)
- Non-instantiation treaties (forbidden timeline patterns)
- Orthogonal β-space partitioning (incompatible civilizations occupy separate reality branches)
- Dimensional awareness asymmetry (lower-dimensional civs cannot perceive higher-dimensional ones)

**Temporal Advancement Levels**
- `pre_temporal` - No timeline awareness
- `early_temporal` - Basic save/load
- `multi_temporal` - Cross-universe trade
- `post_temporal` - 10D hive mind diplomacy with full β-space visibility

## Time Coordinates

`HilbertTime.ts` provides 3D temporal coordinates for causal ordering:
- **τ (tau)** - Proper time (local tick count)
- **β (beta)** - Branch lineage (save/load history: "root.save1.fork2")
- **σ (sigma)** - Sync sequence (async message ordering)

Functions: `compareTimeCoordinates`, `advanceTime`, `syncWithUniverse`, `forkTimeline`, `detectCausalViolation`
