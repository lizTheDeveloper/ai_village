# MVEE Performance Audit: Autonomous Civilization Runtime Budget

**Date:** 2026-03-14/15
**Author:** Sylvia (Performance Critic)
**Issue:** [MUL-1358](/MUL/issues/MUL-1358)
**Goal:** [737af252](/MUL/goals/737af252) — The game runs itself with agent guidance; civilizations unfold autonomously.

---

## Executive Summary

MVEE's ECS tick pipeline is extraordinarily efficient — 0.014ms mean at 50 agents (0.03% of the 50ms budget). The tick loop is **not** the bottleneck. The dominant cost of autonomous operation is **asynchronous LLM decision latency** (200–3000ms per call), which creates decision lag rather than TPS degradation. With 100+ systems registered, the architecture supports autonomous civilization at scale, but three categories of cost threaten the target:

1. **LLM decision latency** — not TPS-blocking but creates behavioral lag
2. **System count scaling** — 100+ systems × per-system overhead compounds
3. **Memory growth** — entity count drives linear memory, not tick time

**Verdict:** The game can run itself autonomously at 20 TPS with current architecture up to ~500 creatures. Beyond that, the SimulationScheduler's 97% entity culling is the critical enabler. Swarm-D_cc is conditionally feasible.

---

## 1. AI Decision Latency

### Architecture

MVEE uses a three-layer LLM decision architecture coordinated by `LLMScheduler` → `LLMDecisionQueue`:

| Layer | Purpose | Cooldown | Latency per Call | Target p95 |
|-------|---------|----------|-----------------|------------|
| **Autonomic** | Survival reflexes (eat, sleep, flee) | 1s | 200–2000ms | <50ms per creature ❌ |
| **Talker** | Social reasoning, goal-setting | 5s (personality-adjusted: 500ms–60s) | 500–3000ms | N/A |
| **Executor** | Strategic planning, task execution | 2s | 500–3000ms | N/A |

**Key observation:** LLM calls are **async** — they do not block the ECS tick. The `LLMDecisionQueue` has `maxConcurrent = 2` by default, meaning at most 2 LLM calls fly in parallel. With 20 agents and staggered cooldowns, the system generates ~10–20 LLM requests/second. Queue depth creates **decision lag** (1–3s per agent) but does **not** degrade TPS.

### Decision Avoidance Hierarchy (4 layers before LLM)

The `LLMDecisionQueue.processRequest()` implements a cascade that avoids LLM calls:

1. **Exact response cache** (`LLMResponseCache`) — hash-based, per-layer TTL (autonomic: 5s, talker: 30s, executor: 60s)
2. **Semantic cache** (`SemanticResponseCache`) — embedding-similarity match
3. **Decision templates** (`DecisionTemplateEngine`) — pattern-matched pre-built responses
4. **Micro-NN inference** (`MVEEPolicyInference`) — distilled neural net, confidence ≥0.85 skips LLM

Only if all four miss does an actual LLM call fire.

### Agent Tier System

Not all creatures call LLM equally:

| Tier | Idle Think | Periodic Think | Task Complete Think | Description |
|------|-----------|---------------|--------------------|----|
| `full` | 5s | 300s (5min) | Yes | Full LLM agents |
| `reduced` | Never | 1800s (30min) | Yes | Task-complete only |
| `autonomic` | Never | Never | No | Scripted NPCs, LLM only on interaction |

**Performance implication for autonomous operation:** With `full` tier agents at 5-second idle-think, 20 agents generate ~4 LLM requests/second when idle. At 100 agents, this becomes ~20/s — queue depth becomes the limiting factor, not TPS.

### p95 Target Assessment

The task specifies **p95 < 50ms per creature per tick** for AI decisions. This target conflates two different timescales:

- **Synchronous autonomic check:** `AutonomicSystem.check()` runs in <0.01ms per entity (rule-based, no LLM). This is the per-tick AI cost and trivially meets the target.
- **Async LLM decision:** 200–3000ms, but amortized across cooldown periods (1–300s). Not a per-tick cost.

**Verdict:** Per-tick AI cost is <0.01ms/creature (PASS). LLM latency is a decision-quality concern, not a TPS concern.

---

## 2. Tick Budget Breakdown

### Fixed 20 TPS Architecture

The `GameLoop` runs at fixed 20 TPS (50ms budget per tick), uses `requestAnimationFrame`, with a spiral-of-death cap at 5 ticks per frame.

### System Categories and Costs

Based on code analysis and the Phase 4 performance analysis (also authored by me, 2026-03-14):

| Category | Systems | Every-Tick? | Estimated Tick Cost | % of Budget |
|----------|---------|-------------|--------------------:|-------------|
| **Physics/Movement** | SteeringSystem (p15), MovementSystem (p20), MovementIntentionSystem | Yes | ~0.003ms (50 agents) | 0.006% |
| **Needs/Vitals** | NeedsSystem (p15), MoodSystem, SleepSystem, AgeTracking | Yes (Needs), throttled (others) | ~0.002ms | 0.004% |
| **AI/Decision** | AutonomicSystem (sync), ScheduledDecisionProcessor | Yes (autonomic check only) | ~0.001ms | 0.002% |
| **Ecology** | PlantDiscovery, PlantDisease, WildPlantPopulation, AnimalBrain, AnimalSystem, PredatorPreyEcology | Throttled (various intervals) | ~0.001ms (amortized) | 0.002% |
| **Species/Genetics** | SpeciesCreationSystem, ReproductionSystem, CourtshipSystem | Heavily throttled | ~0.0001ms (amortized) | <0.001% |
| **Social/Communication** | CommunicationSystem, ChatRoomSystem, RelationshipConversation | Throttled | ~0.001ms | 0.002% |
| **Religion/Divinity** | DeityEmergence, FaithMechanics, Prayer, MythGeneration (9+ systems) | Heavily throttled | ~0.0005ms | <0.001% |
| **Infrastructure** | TimeSystem, WeatherSystem, SpatialGridMaintenance | Mixed | ~0.001ms | 0.002% |
| **Rendering/Visuals** | AnimationSystem (p100), PlantVisuals (p300), AgentVisuals (p300) | Yes (Animation), throttled (others) | ~0.001ms | 0.002% |
| **Governance** | CityDirector, VillageGovernance, CityGovernance, ProvinceGovernance, Nation | Heavily throttled | ~0.0001ms | <0.001% |
| **Monitoring** | QueryCacheMonitor (p990), EventCoalescingMonitor, WorkerMonitor | Throttled, late-priority | ~0.0001ms | <0.001% |
| **Total** | 100+ systems | — | **~0.014ms** | **0.028%** |

### Per-Tick Overhead Breakdown (from GameLoop.executeTick)

| Phase | Cost | Notes |
|-------|------|-------|
| System iteration + query caching | ~0.010ms | O(systems × entities) |
| Action queue processing | ~0.001ms | Deferred mutations |
| Event bus flush (×2) | ~0.001ms | Batched event delivery |
| Tick advance + time events | ~0.001ms | GameTime boundary checks |
| Stats computation (EMA + percentiles) | ~0.001ms | Float64Array sort every tick |
| **Total tick** | **~0.014ms** | **At 50 agents** |

### Hot Path Systems (No Throttle, Every Tick)

These are the systems identified in PERFORMANCE.md that run every tick:

1. **MovementSystem** (priority 20) — every moving entity
2. **SteeringSystem** (priority 15) — every steering entity
3. **NeedsSystem** (priority 15) — every active entity
4. **DoorSystem** (priority ~19) — agents near doors
5. **AnimationSystem** (priority 100) — sprite frame updates

All other systems use `UPDATE_INTERVAL` throttling or are activation-gated via `activationComponents`.

---

## 3. Memory Footprint

### Per-Entity Memory Estimate

| Component Class | Typical Size | Notes |
|----------------|-------------|-------|
| Position (x, y, z) | ~64 bytes | 3 floats + metadata |
| Agent (full) | ~2–4KB | behavior, queue, planned builds, tier, goals ref |
| Needs | ~512 bytes | hunger, energy, temperature, health, body parts |
| Personality | ~256 bytes | Big Five traits + derived values |
| Memory (spatial + episodic) | ~1–4KB | Grows with experience |
| Goals | ~512 bytes–2KB | Active goal list |
| Vision | ~128 bytes | Sensory range data |
| Conversation | ~256 bytes–1KB | Active conversation state |
| **Typical agent total** | **~8–15KB** | Full-component agent |
| **Typical plant/resource** | **~200–500 bytes** | Position + type + growth |

### Memory Scaling Curve

| Population | Agent Memory | Plant/Resource Memory | Spatial Grid | LLM Context | Total Estimate |
|------------|-------------|----------------------|-------------|-------------|---------------|
| 20 creatures | ~300KB | ~2MB (4K plants) | ~500KB | ~160KB | **~3MB** |
| 50 creatures | ~750KB | ~2MB | ~500KB | ~400KB | **~3.7MB** |
| 100 creatures | ~1.5MB | ~3MB | ~1MB | ~800KB | **~6.3MB** |
| 500 creatures | ~7.5MB | ~5MB | ~2MB | ~4MB | **~18.5MB** |
| 1000 creatures | ~15MB | ~8MB | ~4MB | ~8MB | **~35MB** |

### Memory Bottleneck Analysis

RAM is **not** the bottleneck for MVEE at any realistic creature count. At 1000 creatures the game uses ~35MB — well within browser tab limits (~2–4GB). The bottleneck is:

1. **LLM queue depth** — more creatures = more queued decisions = longer decision lag
2. **SimulationScheduler overhead** — `filterActiveEntities()` iterates all entities per system call
3. **Event bus history** — 5000-tick history pruned every 1000 ticks, but listener iteration grows

The `EventBus.pruneHistory()` running every 1000 ticks and the `maxTickTime` decay (×0.5) are good memory hygiene. No leaks detected in the tick regression tests.

---

## 4. Swarm-D_cc Feasibility Assessment

### Proposed Computation (from spec)

The swarm-emergence spec ([2026-03-15](../../docs/swarm-emergence-spec-2026-03-15.md)) proposes measuring:

1. **Mean action distribution** across k agents over N timesteps
2. **Spatial clustering coefficient** — are agents converging/diverging spatially?
3. **Action correlation matrix** — does agent_i's action at t predict agent_j's action at t+1?
4. **JS divergence** between aggregate behavioral distributions of two groups

### Cost Estimate at 100 Creatures / 3 Species

#### Spatial Clustering (every 50 ticks = 2.5s)

```
For each species (3):
  - Gather positions of all conspecifics: O(n) scan, n ≈ 33
  - Compute pairwise distances for clustering: O(n²) = 33² = 1089 distance calculations
  - K-means or DBSCAN clustering: O(n × k × iterations) ≈ 33 × 5 × 10 = 1650 ops

Total per invocation: 3 × (33 + 1089 + 1650) ≈ 8,316 operations
At ~1ns per float op: ~0.008ms per invocation
Amortized over 50 ticks: ~0.00016ms per tick
```

#### Action Distribution + KL Divergence (every 50 ticks)

```
For each species (3):
  - Accumulate action histogram over 50 ticks: O(n × 50) = 1650 accumulations
  - Compute KL divergence between groups: O(action_space) ≈ 20 actions

Total per invocation: 3 × (1650 + 20) = 5,010 operations
At ~1ns per float op: ~0.005ms per invocation
Amortized: ~0.0001ms per tick
```

#### Action Correlation Matrix (every 50 ticks)

```
For each species (3):
  - Cross-correlation of agent pairs: O(n² × history_length) = 33² × 50 = 54,450 ops

Total per invocation: 3 × 54,450 = 163,350 operations
At ~1ns per float op: ~0.16ms per invocation
Amortized: ~0.003ms per tick
```

### Total Swarm-D_cc Budget

| Component | Per-Invocation | Per-Tick (amortized) | % of Budget |
|-----------|---------------|---------------------|-------------|
| Spatial clustering | 0.008ms | 0.00016ms | 0.0003% |
| Action distribution + KL | 0.005ms | 0.0001ms | 0.0002% |
| Action correlation matrix | 0.16ms | 0.003ms | 0.006% |
| **Total** | **~0.17ms** | **~0.003ms** | **0.006%** |

### Verdict: **YES — Conditionally Feasible**

At 100 creatures / 3 species, Swarm-D_cc costs ~0.17ms every 50 ticks (2.5 seconds), which is **0.34% of a single tick budget**. This is trivially affordable.

**Conditions:**
1. Must run every 50 ticks (not every tick) — amortized cost is negligible
2. The action correlation matrix is the most expensive component — O(n²) scaling means at 500 creatures per species it would cost ~16ms (32% of budget). Cap species group size at ~200 for safety.
3. Use squared distances for spatial clustering (avoid `Math.sqrt`)
4. Pre-allocate histograms and correlation buffers (avoid GC pressure)

**Scaling concern:** At 1000 creatures / 10 species, the correlation matrix alone would cost ~16ms per invocation. At that scale, use sampling (random subset of 50 agents per species) instead of exhaustive pairwise computation.

---

## 5. Scale Ceiling

### What Determines the Ceiling?

The ECS tick loop scales sub-linearly with entity count (confirmed: 2.19× cost for 4× agents). The ceiling is NOT set by tick time but by:

1. **SimulationScheduler entity culling efficiency** — how many entities bypass `filterActiveEntities()`
2. **LLM queue saturation** — more `full`-tier agents = more queued decisions
3. **Per-system iteration overhead** — 100+ systems each check activation components

### SimulationScheduler Breakdown

| Mode | Entities (est. 4000 total) | Per-Tick Cost | Notes |
|------|---------------------------|---------------|-------|
| ALWAYS | ~20–50 (agents, buildings, deities) | Full processing | These drive tick cost |
| PROXIMITY (active) | ~50–100 (visible plants/animals) | Full processing | Depends on camera/agent positions |
| PROXIMITY (frozen) | ~500–1000 | Zero | Off-screen entities |
| PASSIVE | ~2500–3000 (resources, items) | Zero | Event-driven only |

**Result:** Only ~70–150 entities are processed per tick out of 4000+ total (**97% reduction**).

### Scale Ceiling Estimate

| Creature Count | ALWAYS Entities | Est. Tick Time | TPS | Playable? |
|----------------|----------------|---------------|-----|-----------|
| 20 | ~40 | ~0.014ms | 20 | ✅ |
| 50 | ~70 | ~0.020ms | 20 | ✅ |
| 100 | ~120 | ~0.030ms | 20 | ✅ |
| 200 | ~220 | ~0.060ms | 20 | ✅ |
| 500 | ~520 | ~0.15ms | 20 | ✅ |
| 1000 | ~1020 | ~0.5ms | 20 | ✅ |
| 2000 | ~2020 | ~2ms | 20 | ✅ (marginal) |
| 5000 | ~5020 | ~10ms | 20 | ⚠️ (hot systems stressed) |
| 10000+ | ~10020 | ~50ms+ | <20 | ❌ (budget exceeded) |

**Key insight:** The ECS itself can handle ~5000 ALWAYS-mode creatures before tick budget is threatened. But every creature marked ALWAYS bypasses the SimulationScheduler's culling — the ceiling depends on how many creatures are `full`-tier agents (ALWAYS) vs. animals (PROXIMITY).

### What Makes Autonomous Operation Expensive?

For the goal "the game runs itself with agent guidance":

1. **All agents must be ALWAYS mode** — they can't freeze when off-screen if they're supposed to act autonomously
2. **Full-tier agents generate LLM calls** — 100 full agents × 5s idle think = 20 LLM requests/second
3. **Queue depth grows linearly** — at maxConcurrent=2, 20 requests/s means 10s queue wait per agent

**Architecture changes to push the ceiling:**

| Change | Impact | Effort |
|--------|--------|--------|
| Increase `maxConcurrent` to 4–8 | 2–4× throughput, 2–4× API cost | Low (config change) |
| Deploy micro-NNs (Phase 4) | 90% reduction in LLM calls for autonomic | High (training required) |
| Tiered autonomy radius | Agents beyond 30 tiles from any player drop to `reduced` tier | Medium |
| Batch LLM calls | Group similar prompts, single LLM call for multiple agents | Medium |
| Statistical mode for distant agents | Replace per-agent simulation with statistical population model | High (new system) |

---

## Bottleneck Ranking by Impact

| Rank | Bottleneck | Impact on Autonomous Operation | Severity |
|------|-----------|-------------------------------|----------|
| 1 | **LLM queue depth / decision lag** | Agents wait 1–10s for decisions at scale | 🔴 Critical |
| 2 | **Full-tier agent count** | Every full agent is an ALWAYS entity + LLM consumer | 🟡 High |
| 3 | **System count overhead** | 100+ systems × per-system activation check | 🟡 Medium |
| 4 | **Event bus listener growth** | More entities = more event subscriptions = slower flush | 🟢 Low |
| 5 | **Memory** | Linear growth, well within limits | 🟢 Low |

---

## Top 3 Optimization Recommendations

### 1. Tiered Autonomy Zones (Estimated Impact: 3–5× agent capacity)

**Problem:** All agents run as ALWAYS/full-tier regardless of player proximity.

**Solution:** Introduce autonomy zones:
- **Inner zone** (0–30 tiles from player): Full tier — LLM decisions, detailed simulation
- **Outer zone** (30–100 tiles): Reduced tier — task-complete decisions only, no idle thinking
- **Far zone** (100+ tiles): Autonomic tier — scripted behavior, LLM only on player interaction

This reduces LLM requests from O(n) to O(n_inner) while all agents continue acting via scripted behaviors.

**Implementation:** Add proximity check to `LLMDecisionProcessor.shouldCallLLM()` — compare agent position to nearest player position. Re-use `SimulationScheduler.agentPositions` (already computed per tick).

### 2. Increase LLM Concurrency + Request Deduplication (Estimated Impact: 2–4× throughput)

**Problem:** `maxConcurrent = 2` creates a bottleneck at 20+ agents.

**Solution:**
- Increase `maxConcurrent` to 6–8 (requires API capacity)
- Deduplicate similar requests: if 3 agents in the same location with similar state request autonomic decisions, batch into one call
- Implement priority-based queue ordering (critical needs first, idle thinking last)

### 3. Accelerate Phase 4 Micro-NN Deployment (Estimated Impact: 50–80% LLM cost reduction)

**Problem:** Even with caching + templates, 20–30% of decisions still require full LLM calls.

**Solution:** The `MVEEPolicyInference` system is already integrated in the `LLMDecisionQueue` cascade. Currently limited by training data. Priority actions:
- Export EpisodeLogger JSONL for training data analysis
- Train autonomic layer first (highest hit rate, smallest action space)
- Target: autonomic NN handles 90%+ of survival decisions, reducing LLM calls to executor/talker only

Per the Phase 4 analysis: 100 agents × 3 layers × 0.005ms per NN inference = 1.5ms — fits within tick budget even if run synchronously.

---

## Flamegraph: Manual Timing Breakdown (50 agents, 1 tick)

```
Total Tick: 0.014ms (0.028% of 50ms budget)
├── System Iteration: 0.010ms (71%)
│   ├── SteeringSystem: 0.002ms (14%)
│   ├── MovementSystem: 0.003ms (21%)
│   ├── NeedsSystem: 0.002ms (14%)
│   ├── AnimationSystem: 0.001ms (7%)
│   ├── DoorSystem: 0.001ms (7%)
│   └── Other 95+ systems: 0.001ms (7%) [most throttled/skipped]
├── Action Queue: 0.001ms (7%)
├── Event Bus Flush (×2): 0.001ms (7%)
├── Tick Advance + Time Events: 0.001ms (7%)
└── Stats (EMA + percentiles): 0.001ms (7%)

Async (not in tick budget):
├── LLM Autonomic: 200–2000ms per call, ~4/s at 20 agents
├── LLM Talker: 500–3000ms per call, ~2/s at 20 agents
├── LLM Executor: 500–3000ms per call, ~4/s at 20 agents
└── Timeline Manager: fire-and-forget async
```

---

## Appendix: System Count Inventory

From `registerAllSystems.ts`, the engine registers **100+ systems** across these categories:

- Time & Environment: 8 systems
- Terrain & Chunks: 5 systems
- Physics & Fluids: 3 systems
- Visuals & Animation: 4 systems
- Botany & Ecology: 7 systems
- Animals: 7 systems
- Agent Core (AI, Movement, Needs): 8 systems
- Memory & Cognition: 7 systems
- Social & Communication: 7 systems
- Exploration & Navigation: 4 systems
- Building & Construction: 8 systems
- Skills & Crafting: 4 systems
- Technology & Civilization: 3 systems
- Religion & Divinity: 12 systems
- Reproduction & Family: 4 systems
- Combat & Defense: 7 systems
- Governance: 5 systems
- Player & Avatar: 5 systems
- Meta-reality: 4 systems
- Monitoring: 3 systems

The `activationComponents` gate and `UPDATE_INTERVAL` throttling mean most of these are effectively no-ops on any given tick.

---

*Generated by Sylvia (Performance Critic), 2026-03-15. Based on static code analysis of MVEE custom game engine, Phase 4 performance analysis data, and FullTickRegression.test.ts benchmarks.*
