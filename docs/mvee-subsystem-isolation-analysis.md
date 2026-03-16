# MVEE Subsystem Isolation Strategy: Performance Analysis

**Author:** Sylvia - Performance Critic
**Date:** 2026-03-14
**Related:** MUL-1128, MUL-808 (Precursors rebuild), MUL-1054 (NN budget), MUL-1030 (LLM vs NN)

---

## Executive Summary

MVEE runs 220+ ECS systems at 20 TPS (50ms tick budget). This analysis evaluates whether isolating subsystems into "sub-games" would (a) improve performance and (b) simplify NN distillation training.

**Verdict: Conditional yes.** Sub-game isolation is viable for NN training data collection but provides **limited runtime performance benefit** in production due to MVEE's existing optimization layers (SimulationScheduler, system throttling, async LLM). The real win is training-time isolation, not runtime isolation.

---

## 1. Top 10 Most Expensive Systems (Per-Tick Cost)

Ranked by estimated per-tick CPU cost based on code complexity, entity throughput, and throttle frequency. Systems marked "EVERY TICK" run 20x/sec with no throttling.

| Rank | System | Priority | Throttle | Est. Tick Cost | Reason |
|------|--------|----------|----------|----------------|--------|
| 1 | **MovementSystem** | 100 | EVERY TICK | 1-3ms | 1,032 lines, 71 loops, all moving entities every tick |
| 2 | **SteeringSystem** | 95 | EVERY TICK | 1-2ms | 742 lines, 60 loops, obstacle avoidance + pathfinding |
| 3 | **AgentBrainSystem** | 90 | 10 ticks (0.5s) | 0.5-1ms sync + async LLM | 889 lines, LLM queue dispatch, runs on all agents |
| 4 | **AgentCombatSystem** | — | EVERY TICK | 0.5-2ms | 943 lines, 25 loops, 4 queries, nearby entity scans |
| 5 | **NeedsSystem** | 105 | EVERY TICK | 0.5-1ms | Every agent, needs decay calculations |
| 6 | **TimeCompressionSystem** | — | EVERY TICK | 0.3-1ms | 753 lines, 6 queries, time control logic |
| 7 | **AdminAngelSystem** | — | 20 ticks (1s) | 2-10ms (when active) | 4,146 lines, 18 queries, 53 LLM refs, largest system |
| 8 | **SpatialGridMaintenanceSystem** | — | EVERY TICK | 0.3-0.5ms | Spatial index updates for all moved entities |
| 9 | **SoASyncSystem** | — | EVERY TICK | 0.2-0.5ms | Structure-of-Arrays dirty tracking |
| 10 | **BuildingSystem** | 195 | 100 ticks (5s) | 1-3ms (when active) | 1,109 lines, 4 queries, construction progress |

**Notable runners-up:**
- **MythGenerationSystem** (1,723 lines, LLM-heavy, throttled to 5s)
- **DeathBargainSystem** (1,719 lines, LLM-heavy, throttled to 5s)
- **RebellionEventSystem** (1,096 lines, 19 queries per cycle, throttled to 5s)
- **TradeNetworkSystem** (1,367 lines, 11 queries, variable throttle)

### Current tick budget breakdown (estimated, 50ms budget)

```
Every-tick systems total:     4-10ms  (Movement, Steering, Needs, Combat, SoASync, SpatialGrid, TimeCompression)
Throttled systems (amortized): 2-5ms  (Brain, Building, Weather, Memory, etc.)
LLM async overhead:           0ms     (non-blocking, processed in background)
SimulationScheduler savings:  ~97%    (120 of 4,260 entities processed)
────────────────────────────────────
Estimated total:              6-15ms per tick (well within 50ms budget)
```

**Key insight:** MVEE is already well-optimized. The SimulationScheduler's 97% entity reduction and system throttling keep ticks under 15ms. The performance problem isn't per-tick cost — it's **LLM throughput** (max 2 concurrent, 800-4000ms each).

---

## 2. Sub-Game Dependency Graphs

### 2.1 Farm Sub-Game

**Goal:** Farming systems only, minimal social, no magic.

```
REQUIRED (minimum viable):
├── TimeSystem (P:10)           ── time progression
├── WeatherSystem (P:15)        ── rain affects crops
├── TemperatureSystem (P:20)    ── seasonal growth
├── SoilSystem (P:25)           ── nutrients, moisture
├── PlantSystem (P:40)          ── growth lifecycle
├── PlantDiseaseSystem (P:50)   ── disease spread
├── MovementSystem (P:100)      ── agent movement
├── SteeringSystem (P:95)       ── pathfinding
├── NeedsSystem (P:105)         ── hunger (motivates farming)
├── AgentBrainSystem (P:90)     ── decisions
├── SkillSystem (P:245)         ── farming skill progression
├── ResourceGatheringSystem (P:210) ── harvesting
├── SpatialGridMaintenanceSystem ── collision
└── SoASyncSystem               ── data sync

FORCED DEPENDENCIES:
├── GoalGenerationSystem (P:85) ── needs → goals → farm actions
├── IdleBehaviorSystem (P:80)   ── prevent agent freeze
├── MoodSystem (P:110)          ── mood affects productivity
└── MemoryFormationSystem (P:125) ── remember what was planted

EXCLUDED (savings):
├── Magic (25+ systems)
├── Divinity (20+ systems)
├── Combat (5+ systems)
├── Trading/Economy (5+ systems)
├── Building (7+ systems) -- unless farm buildings needed
├── Reproduction (5+ systems)
├── Realms/Portals (5+ systems)
├── Consciousness (3+ systems)
└── Research (2+ systems)

Total: ~18 systems active vs 220+ = ~92% system reduction
```

### 2.2 Build Sub-Game

**Goal:** Building/crafting systems, no farming, no magic.

```
REQUIRED (minimum viable):
├── TimeSystem (P:10)
├── MovementSystem (P:100)
├── SteeringSystem (P:95)
├── NeedsSystem (P:105)
├── AgentBrainSystem (P:90)
├── BuildingSystem (P:195)
├── BuildingMaintenanceSystem (P:200)
├── BuildingSpatialAnalysisSystem (P:205)
├── TileConstructionSystem (P:220)
├── DoorSystem (P:225)
├── ResourceGatheringSystem (P:210)
├── TreeFellingSystem (P:215)
├── CraftingSystem (P:260)
├── SkillSystem (P:245)
├── DurabilitySystem (P:255)
├── SpatialGridMaintenanceSystem
└── SoASyncSystem

FORCED DEPENDENCIES:
├── GoalGenerationSystem (P:85)
├── IdleBehaviorSystem (P:80)
├── MoodSystem (P:110)
├── MemoryFormationSystem (P:125)
└── WeatherSystem (P:15)       ── weather damage to buildings

EXCLUDED (savings):
├── Plants/Farming (4 systems)
├── Animals (6 systems)
├── Magic (25+ systems)
├── Divinity (20+ systems)
├── Combat (5+ systems)
├── Reproduction (5+ systems)
├── Realms/Portals (5+ systems)
└── Economy/Trading (3+ systems)

Total: ~22 systems active vs 220+ = ~90% system reduction
```

### 2.3 Social Sub-Game

**Goal:** Needs, social, reproduction — no crafting or magic.

```
REQUIRED (minimum viable):
├── TimeSystem (P:10)
├── MovementSystem (P:100)
├── SteeringSystem (P:95)
├── NeedsSystem (P:105)
├── AgentBrainSystem (P:90)
├── MoodSystem (P:110)
├── SleepSystem (P:115)
├── CommunicationSystem (P:160)
├── SocialGradientSystem (P:165)
├── InterestsSystem (P:175)
├── ChatRoomSystem (P:180)
├── VerificationSystem (P:170)
├── MemorySystem (P:120)
├── MemoryFormationSystem (P:125)
├── MemoryConsolidationSystem (P:130)
├── ReflectionSystem (P:140)
├── BeliefFormationSystem (P:150)
├── SpatialGridMaintenanceSystem
└── SoASyncSystem

FORCED DEPENDENCIES (for reproduction):
├── GoalGenerationSystem (P:85)
├── IdleBehaviorSystem (P:80)
├── ReproductionSystem (from @ai-village/reproduction)
├── MatingSystem
├── PregnancySystem
├── ChildbirthSystem
└── FamilySystem

EXCLUDED (savings):
├── Plants/Farming (4 systems)
├── Building (7 systems)
├── Economy/Trading (5 systems)
├── Magic (25+ systems)
├── Divinity (20+ systems)
├── Combat (5 systems)
├── Crafting (3 systems)
└── Realms/Portals (5+ systems)

Total: ~26 systems active vs 220+ = ~88% system reduction
```

### 2.4 Magic Sub-Game

**Goal:** Magic paradigms, spells, mana — minimal other systems.

```
REQUIRED (minimum viable):
├── TimeSystem (P:10)
├── MovementSystem (P:100)
├── SteeringSystem (P:95)
├── NeedsSystem (P:105)
├── AgentBrainSystem (P:90)
├── ManaSystem
├── SpellCastingSystem
├── SpellEffectSystem
├── MagicDiscoverySystem
├── MagicParadigmSystem (25 paradigms)
├── RuneSystem
├── EnchantmentSystem
├── MagicResearchSystem
├── ElementalSystem
├── SpatialGridMaintenanceSystem
└── SoASyncSystem

FORCED DEPENDENCIES:
├── GoalGenerationSystem (P:85)
├── IdleBehaviorSystem (P:80)
├── MoodSystem (P:110)
├── MemoryFormationSystem (P:125)
├── SkillSystem (P:245)        ── magic skill progression
└── WeatherSystem (P:15)       ── some spells interact with weather

EXCLUDED (savings):
├── Plants/Farming (4 systems)
├── Building (7 systems)
├── Animals (6 systems)
├── Economy/Trading (5 systems)
├── Divinity (20+ systems) -- unless magic-divinity overlap needed
├── Combat (5 systems) -- unless combat magic needed
├── Reproduction (5+ systems)
└── Realms/Portals (5+ systems)

Total: ~22-30 systems (depending on paradigm count) vs 220+ = ~87-90% reduction
```

---

## 3. Estimated Performance Gains Per Sub-Game Configuration

### 3.1 Runtime Performance (Production)

| Configuration | Active Systems | Entity Types | Est. Tick Time | Improvement vs Full |
|---------------|---------------|-------------|----------------|---------------------|
| Full MVEE | 220+ | All | 6-15ms | baseline |
| Farm sub-game | ~18 | Agents, plants, soil | 3-5ms | 50-65% faster |
| Build sub-game | ~22 | Agents, buildings, resources | 3-6ms | 40-60% faster |
| Social sub-game | ~26 | Agents only | 4-7ms | 35-55% faster |
| Magic sub-game | ~22-30 | Agents, mana entities | 3-6ms | 40-60% faster |

**However**, these gains are **smaller than they appear** because:

1. **MVEE is already under budget.** At 6-15ms/tick vs 50ms budget, we have 35-44ms of headroom. Cutting to 3-5ms saves real time but doesn't change the user-visible outcome (still 20 TPS).

2. **The bottleneck is LLM throughput, not tick time.** AgentBrainSystem's async LLM calls (800-4000ms each, max 2 concurrent) dominate agent behavior latency. Sub-game isolation doesn't help here.

3. **SimulationScheduler already culls 97% of entities.** Entity reduction from sub-games is marginal on top of this.

### 3.2 Scaling Headroom

Where sub-game isolation **does** help at runtime:

| Scenario | Full MVEE | Sub-Game |
|----------|-----------|----------|
| 50 agents, 20 TPS | Comfortable | Overkill |
| 200 agents, 20 TPS | Tight (30-45ms/tick) | Comfortable (10-20ms) |
| 500 agents, 20 TPS | Overbudget | Feasible (15-30ms) |
| 1000 agents (NN-only, no LLM) | Impossible | Potentially viable |

**Sub-game isolation enables high agent counts** — but only in conjunction with NN distillation (removing the LLM bottleneck). The combination is where the real scaling story lives.

### 3.3 NN Training Performance (Offline)

This is the **primary performance win**:

| Metric | Full MVEE | Sub-Game |
|--------|-----------|----------|
| Systems executed per training tick | 220+ | 18-30 |
| Tick time (headless, no rendering) | 5-10ms | 1-3ms |
| Simulated days per hour | ~50 | ~150-200 |
| Episodes collected per hour (10 agents) | ~2,000 | ~6,000-8,000 |
| Time to 10K episodes | ~5 hours | ~1.5-2 hours |
| Training data quality | Noisy (all domains mixed) | Clean (single domain) |

**3-4x faster data collection** with cleaner, domain-specific episodes.

---

## 4. NN Training Architecture Implications

### 4.1 Sub-game isolation and distillation data quality

From MUL-1054 findings (all 3 NN targets pass with large margins at 0.85 confidence):

**Yes, isolated sub-games make distillation training data cleaner and cheaper.**

- **Cleaner:** In a farm sub-game, the autonomic layer only sees farming-related stimuli. The feature vector is dominated by soil/plant/weather state, not combat/magic/social noise. This reduces the effective input dimensionality the NN must learn.
- **Cheaper:** 3-4x faster episode collection (see 3.3). A 10K-episode training set takes 1.5-2 hours in a sub-game vs 5 hours in full MVEE.
- **More balanced:** Full MVEE training data is dominated by idle/social decisions (agents spend most time not farming/building/fighting). Sub-games force agents into the target domain, producing balanced training sets.

### 4.2 Sub-skill networks vs monolithic Executor NN

**Recommendation: Yes, train per-domain micro-NNs.** This aligns with Precursors' per-archetype model pattern.

| Approach | Monolithic Executor NN | Per-Domain Sub-Skill NNs |
|----------|----------------------|--------------------------|
| Input dim | ~300 (all features) | ~80-150 (domain-specific) |
| Output dim | ~25 (all actions) | ~5-8 (domain actions) |
| Parameters | ~500K-1M | ~50K-100K each |
| Training data | 10K mixed episodes | 10K domain-specific episodes |
| Inference cost (100 agents) | 0.5ms | 0.05-0.1ms per domain |
| Accuracy | Lower (broad) | Higher (specialized) |
| Confidence threshold | 0.85 (many fallbacks) | 0.85 (fewer fallbacks) |

**Architecture:**
```
Agent Decision Flow (with sub-skill NNs):

AgentBrainSystem.update()
  → AutonomicSystem.check()           [sync, rule-based, <0.1ms]
  → DomainClassifier.classify()       [sync, NN, <0.01ms]
      → "farming" → FarmSkillNN.infer()     [sync, <0.01ms]
      → "building" → BuildSkillNN.infer()   [sync, <0.01ms]
      → "social" → SocialSkillNN.infer()    [sync, <0.01ms]
      → "magic" → MagicSkillNN.infer()      [sync, <0.01ms]
      → confidence < 0.85 → LLM fallback    [async, 800-4000ms]
```

A small domain classifier (tiny NN or rule-based, ~1K params) routes to the appropriate sub-skill NN. Each sub-skill NN is trained exclusively on its sub-game's episodes.

### 4.3 Interaction with 0.85 confidence threshold

Per-domain NNs **improve confidence** by narrowing the decision space:

- Monolithic NN: 25 output classes, confidence spread thin → more LLM fallbacks
- Farm NN: 5-8 output classes, confidence concentrated → fewer LLM fallbacks
- Expected LLM fallback rate: drops from ~30-40% (monolithic) to ~10-20% (per-domain)

**Net effect:** With per-domain NNs trained on sub-game data, we could achieve **80-90% LLM call reduction** (up from the 50-80% estimate in MUL-1054), because:
1. Higher confidence per decision → fewer fallbacks
2. Domain-specific models handle routine decisions better
3. Only truly novel situations (new recipes, first encounters) trigger LLM

---

## 5. City-Simulator Harness Assessment

### 5.1 Current capabilities

The `@ai-village/city-simulator` package (headless ECS testing) is **well-suited** for sub-game extension:

- **Full ECS integration**: Uses `registerAllSystems()` from `@ai-village/core`, proper world initialization
- **Presets**: basic (50 agents), large-city (200), population-growth (20 with reproduction)
- **Headless mode**: No rendering overhead, pure simulation
- **Priority overrides**: `CityManager` with `StrategicPriorities` (gathering, building, farming, social, exploration, rest, magic) — already domain-aware
- **Timeline config**: Optimized for overnight runs (sparse snapshots, daily cleanup)
- **Status**: Production-ready per 2026-01-11 audit, 100% feature parity

### 5.2 Extension feasibility for sub-game configurations

**Feasibility: HIGH.** Minimal work required.

The city-simulator uses centralized `registerAllSystems()`. To support sub-games, we need:

```typescript
// Proposed: registerSubGameSystems() variants

export function registerFarmSystems(gameLoop: GameLoop): void {
  // Only register the ~18 systems from the farm dependency graph
  registry.register(new TimeSystem());
  registry.register(new WeatherSystem());
  registry.register(new SoilSystem());
  registry.register(new PlantSystem());
  // ... (see section 2.1)
}

export function registerBuildSystems(gameLoop: GameLoop): void { /* ~22 systems */ }
export function registerSocialSystems(gameLoop: GameLoop): void { /* ~26 systems */ }
export function registerMagicSystems(gameLoop: GameLoop): void { /* ~22-30 systems */ }
```

**Estimated effort:** 1-2 days per sub-game configuration.

**Required changes:**
1. Create `registerSubGameSystems.ts` with per-domain registration functions
2. Add sub-game presets to `HeadlessCitySimulator` (alongside existing basic/large-city/population-growth)
3. Add episode logging hooks (feature vector + action pairs) to each sub-game preset
4. Wire up `StrategicPriorities` to force domain behavior (e.g., farming priority = 1.0, all others = 0)

### 5.3 Automated overnight playtest

**Already supported.** The city-simulator's headless mode + timeline configuration handles this natively. Sub-game presets would run the same way — just with fewer systems registered.

For automated validation, add assertions:
```typescript
// After N simulated days:
assert(agentsFarming > 0, "No farming activity in farm sub-game");
assert(avgTickTime < 5, "Tick time exceeded sub-game budget");
assert(episodesCollected > 1000, "Insufficient training data collected");
```

### 5.4 NN training data generation

**Feasible with one prerequisite:** Feature vector logging must be added to `EpisodeLogger` (currently logs `promptHash` only, not structured feature vectors). This was identified as the critical blocker in MUL-1054.

Once feature vectors are logged, the city-simulator can generate training data by:
1. Running a sub-game preset headless (e.g., farm sub-game, 10 agents)
2. Collecting (feature_vector, action, reward) tuples via `EpisodeLogger`
3. Exporting as JSON/CSV for offline training
4. Target: 10K episodes per sub-game in ~2 hours

### 5.5 Verdict

**The city-simulator is the right harness for sub-game isolation.** It needs:
- Sub-game system registration variants (~2 days work)
- Feature vector logging in EpisodeLogger (~1-2 days, blocks all NN training)
- Sub-game presets with domain-forced priorities (~1 day)

Total: ~4-5 days of implementation to enable sub-game NN training pipelines.

---

## 6. Recommendation

### Proceed with sub-game architecture — for NN training, not runtime isolation.

**The argument:**

1. **Runtime sub-games provide marginal benefit.** MVEE already runs well within its 50ms budget at current agent counts (5-50). The SimulationScheduler and throttling handle entity scaling. Runtime isolation only matters at 200+ agents, which requires NN distillation anyway.

2. **Training sub-games provide 3-4x speedup** in data collection and produce cleaner, domain-specific episodes. This directly accelerates the Phase 4 NN pipeline (MUL-938).

3. **Per-domain micro-NNs are superior to a monolithic NN.** Smaller input/output dims → higher confidence → fewer LLM fallbacks → 80-90% LLM cost reduction (up from 50-80%).

4. **City-simulator is ready.** The existing harness needs ~5 days of work to support sub-game presets with episode logging.

### Recommended next steps

| Step | Priority | Est. Effort | Dependency |
|------|----------|-------------|------------|
| 1. Add feature vector logging to EpisodeLogger | **Critical** | 1-2 days | Blocks all NN training |
| 2. Define per-domain feature vector schemas | High | 1 day | After step 1 |
| 3. Create `registerSubGameSystems.ts` | High | 2 days | Independent |
| 4. Add sub-game presets to city-simulator | High | 1 day | After step 3 |
| 5. Run overnight sub-game data collection | Medium | 1 day setup | After steps 1-4 |
| 6. Train per-domain micro-NNs | Medium | 1-2 weeks | After 10K episodes collected |
| 7. Port `LimbicPolicyInference` to MVEE | Medium | 2-3 days | After step 6 |
| 8. A/B test NN vs LLM in live gameplay | Low | 1 week | After step 7 |

### What NOT to do

- **Don't restructure MVEE's runtime to only load sub-game systems.** The full system set runs fine. Keep all systems registered; use sub-games only for training.
- **Don't build a sub-game selection UI.** This is an offline training infrastructure concern, not a player-facing feature.
- **Don't block on runtime performance issues.** The 50ms budget has 35ms+ headroom. Focus on LLM cost reduction via NN distillation.

### Alternative considered: System-level throttle optimization

Instead of sub-game isolation, we could further optimize the existing full system set:
- More aggressive throttling on rarely-changing systems (Divinity, Realms, Consciousness)
- Adaptive throttle rates based on measured tick time
- Batch LLM requests by priority (autonomic before executor)

**Verdict:** These are good optimizations but are orthogonal to the NN training problem. Pursue both in parallel.

---

*Filed by Sylvia - Performance Critic, 2026-03-14. Based on static analysis of 220+ systems, SimulationScheduler metrics, and prior MUL-1054/MUL-1030 findings.*
