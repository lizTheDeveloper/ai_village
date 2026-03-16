# MVEE World Sim: NN Distillation Candidates

**Date:** 2026-03-15
**Author:** Cynthia (MVEE World Engineer)
**Issue:** [MUL-1467](/MUL/issues/MUL-1467)
**Goal:** Create a long-awaited sequel to the Creatures franchise featuring up-to-date understanding of AI and language models

---

## Executive Summary

MVEE's world simulation is primarily **rule-based and already efficient** — the ECS tick costs 0.014ms mean at 50 agents. The real LLM cost is agent cognition: `AgentBrainSystem` runs three LLM decision layers (Autonomic, Talker, Executor) with 200–3000ms per call. The game already has working NNs for Talker and Executor layers (`MVEEPolicyInference.ts`), achieving bypass at ≥0.85 confidence.

**The primary distillation opportunity is the Autonomic layer** — it fires every ~1 second per agent (highest frequency of all three layers) and has **no NN coverage yet**. An AutonomicNN would be the single highest-leverage addition to the system.

Secondary opportunities exist in expanding the action coverage of TalkerNN (6 actions) and ExecutorNN (13 actions) to reduce LLM fallback rates in edge cases.

**World ecology systems (weather, soil, plants, animals) are already deterministic and run in <0.01ms/entity. They are not distillation targets.**

---

## 1. System Classification: LLM-Driven vs Rule-Based

### LLM-Driven Systems

| System | Location | LLM Layer | Cooldown | Latency | Distilled? |
|--------|----------|-----------|----------|---------|-----------|
| `AgentBrainSystem` — Autonomic | `packages/core/src/decision/` | Autonomic | ~1s | 200–2000ms | ❌ No |
| `AgentBrainSystem` — Social | `packages/core/src/decision/` | Talker | 5–60s | 500–3000ms | ✅ Partial (6 actions) |
| `AgentBrainSystem` — Task | `packages/core/src/decision/` | Executor | 2s | 500–3000ms | ✅ Partial (13 actions) |
| `AlienSpeciesGenerator` | `packages/world/src/alien-generation/` | Offline | One-time | N/A | ❌ Not runtime-critical |

**Note on `AutonomicSystem`:** The rule-based `AutonomicSystem` (energy/hunger threshold checks) is a *pre-check* that runs before LLM. It handles the obvious cases (energy ≤ 0 → `forced_sleep`, hunger < 10% → `seek_food`). The **Autonomic LLM layer** handles the subtler decisions when the rule-based reflex returns null — moment-to-moment choices about priorities, social context, and environment that require world awareness.

### Rule-Based Systems (Not Distillation Targets)

These systems are already running at <0.01ms/entity per tick. Converting them to NNs would add latency, not remove it.

| Package | Systems | Why Not a Target |
|---------|---------|-----------------|
| `environment` | TimeSystem, WeatherSystem, TemperatureSystem, SoilSystem | Deterministic physical simulation; sub-millisecond already |
| `botany` | PlantSystem, PlantDiseaseSystem, WildPlantPopulationSystem | State machines with threshold triggers; correct-by-construction |
| `core` | AnimalBrainSystem, PredatorPreyEcologySystem, AnimalGroupSystem | Rule-based FSM; no LLM involvement |
| `reproduction` | ReproductionSystem, MidwiferySystem, CourtshipStateMachine | Mendelian genetics + deterministic tables |
| `world` | TerrainGenerator, ChunkManager | Perlin noise; deterministic procedural generation |

---

## 2. Existing NN Infrastructure

Before proposing new work, it's critical to document what already exists:

### `MVEEPolicyInference` (Layer 4 of Decision Avoidance Cascade)

**File:** `custom_game_engine/packages/llm/src/MVEEPolicyInference.ts`

The decision queue (`LLMDecisionQueue.processRequest()`) runs a 4-layer cascade before firing an LLM:
1. **Exact response cache** — hash-based, per-layer TTL
2. **Semantic cache** — embedding-similarity match
3. **Decision templates** — pattern-matched pre-built responses
4. **Micro-NN inference** (`MVEEPolicyInference`) — NN at ≥0.85 confidence skips LLM

Currently implemented networks:

| Network | Architecture | Params | Actions | Confidence Threshold |
|---------|-------------|--------|---------|---------------------|
| **TalkerNN** | 40→128→256→128→6 (Linear+LayerNorm+GELU) | ~73K | 6 social | 0.85 |
| **ExecutorNN** | 40→256→512→256→13 (Linear+LayerNorm+GELU) | ~279K | 13 task | 0.85 |

**Feature vector:** 40-dim, extracted from LLM prompt text. Covers: skills (6), priorities (4), environment resources (4), village state (5), behavior (1), faith (1), health (2), perception (2), emotional state (5), conversation (1), goals (1), inventory (4), layer flag (1), spatial position (2), memory (1).

**Performance:** <0.5ms per inference (GC-free Float32Array buffers, pre-allocated scratch). Follows Talker-Reasoner dual-process architecture (arXiv:2410.08328).

---

## 3. Distillation Candidates: Priority Ranking

### Priority 1 — AutonomicNN (NEW, Highest Value)

**Rationale:** The Autonomic LLM layer fires approximately every 1 second per agent — 3–60x more frequently than Talker and Executor. With 50 agents, this generates ~50 LLM calls/second for autonomic decisions alone. This is the largest source of LLM cost and decision lag, and it has **zero NN coverage today**.

**What the Autonomic layer decides:**
- When the rule-based `AutonomicSystem` reflex returns null (no critical survival override), the agent still needs a moment-to-moment decision about what to do with relatively normal survival state
- Decisions include: continue current task, check in socially, assess environment, initiate gathering, return to village, etc.
- These decisions are highly repetitive and pattern-driven given the same world state

**Proposed architecture:**

```
AutonomicNN: 40 → 64 → 128 → 64 → 10
Architecture: Linear + LayerNorm + GELU (same pattern as existing NNs)
Parameters: ~27K (intentionally tiny — fastest inference)
Confidence threshold: 0.85 (matches existing convention)
Inference target: <0.2ms per agent
```

**Action space (10 classes):**
1. `continue_task` — stay on current task
2. `seek_food` — agent is mildly hungry, go gather food
3. `seek_social` — approach a nearby agent to initiate interaction
4. `explore` — move toward unexplored area
5. `return_to_village` — head back to home base
6. `gather_resources` — opportunistic gathering near current position
7. `rest` — low-priority rest while not sleeping
8. `check_plants` — inspect/tend nearby crops if farmer
9. `guard_area` — stay near valued resource/building
10. `defer_to_talker` — escalate to Talker layer for complex decision

**Why separate from Talker/Executor:** Autonomic decisions are the highest-frequency, lowest-complexity tier. A smaller, faster network is more appropriate than reusing TalkerNN. The output space is about *what to do next* rather than *what social or task action to execute*.

---

### Priority 2 — TalkerNN Action Expansion

**Current state:** TalkerNN covers 6 actions: `talk`, `call_meeting`, `set_personal_goal`, `set_medium_term_goal`, `set_group_goal`, `follow_agent`.

**Gap analysis:** LLM fallback occurs for actions outside this set. Common actions not yet covered:
- `trade` — offer/request item exchange
- `teach` — instruct another agent in a skill
- `comfort` — emotional support for distressed agent
- `negotiate` — resource/territory dispute resolution
- `recruit` — invite agent to join a task or group goal
- `disengage` — end conversation/follow

**Proposed expansion:**

```
TalkerNN v2: 40 → 128 → 256 → 128 → 12
Architecture: Same as current (no change to layers)
Parameters: ~76K (minimal increase from action head expansion)
New actions: +6 (trade, teach, comfort, negotiate, recruit, disengage)
```

**Priority:** Medium. Talker calls fire every 5–60s per agent, far less than Autonomic. The existing 6 actions cover the common case. Expansion primarily reduces LLM fallback rate in socially-dense scenarios (large villages, active diplomacy).

---

### Priority 3 — ExecutorNN Action Expansion

**Current state:** ExecutorNN covers 13 actions: `gather`, `till`, `plan_build`, `build`, `farm`, `help`, `deposit_items`, `idle`, `explore`, `plant`, `set_priorities`, `pick`, `wander`.

**Gap analysis:** Actions not covered include craft-chain tasks introduced by later content updates:
- `cook` — food preparation
- `craft` — item crafting at workbench
- `hunt` — active predator-style resource gathering
- `fish` — fishing mechanic
- `mine` — stone/ore extraction
- `repair` — fix damaged structures
- `guard` — stationary defense task

**Proposed expansion:**

```
ExecutorNN v2: 40 → 256 → 512 → 256 → 20
Architecture: Same as current
Parameters: ~294K (small increase from 279K)
New actions: +7 (cook, craft, hunt, fish, mine, repair, guard)
```

**Priority:** Low-medium. Executor fires every 2s, and the existing 13 actions cover the core gameplay loop well. New actions only matter for agents with the corresponding skills/buildings available.

---

### Priority 4 — AlienSpeciesGenerator NN (Deferred)

**Current state:** Uses LLM to evaluate biological coherence of trait combinations from a library of body plans, locomotion, senses, and diet traits. Generates species names, descriptions, and sprite prompts.

**Assessment:** This is a **one-time, offline operation** per species (happens during world generation or when rare events spawn new alien life). It does not contribute meaningfully to runtime LLM cost or decision lag. A VAT (Variational Autoencoder for Traits) could replace it for bulk generation scenarios, but this is not a priority for the current goal of "shorter beats."

**Recommendation:** Defer indefinitely unless bulk species generation becomes a feature requirement.

---

## 4. Training Data Requirements

### Existing Data Infrastructure

The `MetricsCollectionSystem` (Priority 999, runs last in every tick) already collects:
- All agent behavior changes with timestamps and agent state
- LLM decision events with prompt context
- Action outcomes (task completion, death, resource acquisition)
- Per-agent lifecycle data (age, skills, goals, health)

Data is stored in three tiers:
- **Hot** (in-memory): last 10,000 raw events
- **Warm** (on-disk JSON): minute aggregates for session duration
- **Cold** (compressed archives): hourly/daily aggregates, retained forever

**The cold tier is the training data source.** Session logs from MVEE gameplay contain all LLM decisions with their input prompts.

### Data Requirements Per Target

#### AutonomicNN (Priority 1)

| Requirement | Detail |
|-------------|--------|
| **Label source** | LLM Autonomic layer outputs (the chosen action string) |
| **Feature source** | 40-dim feature vector from `extractFeatures(prompt)` |
| **Volume target** | ≥5,000 examples per action class (50,000 total for 10 classes) |
| **Estimated time to collect** | ~2–4 hours of gameplay with 20+ agents |
| **Logging needed** | Autonomic LLM decisions must be tagged with layer='autonomic' in metrics |
| **Class balance risk** | `continue_task` and `gather_resources` likely over-represented; apply class weights |
| **Quality filter** | Exclude decisions where agent died within 60s after the decision (poor teacher signal) |

**Current gap:** Autonomic LLM decisions may not be distinctly tagged in the current metrics schema. Verify that `LLMDecisionQueue` emits autonomic-layer decisions with layer metadata before data collection begins.

#### TalkerNN v2 (Priority 2)

| Requirement | Detail |
|-------------|--------|
| **Label source** | Talker LLM outputs (already tagged `layer='talker'` in LLMDecisionQueue) |
| **Feature source** | Same 40-dim feature extractor |
| **Volume target** | ≥3,000 examples per new action class (18,000 for 6 new classes) |
| **Estimated time to collect** | ~8–12 hours of gameplay in socially-active worlds |
| **Class balance risk** | `trade` and `teach` rare in early-game; need populated worlds |
| **Quality filter** | Only include decisions in active Talker sessions (not interrupted/timed-out) |

#### ExecutorNN v2 (Priority 3)

| Requirement | Detail |
|-------------|--------|
| **Label source** | Executor LLM outputs (already tagged `layer='executor'`) |
| **Feature source** | Same 40-dim feature extractor; may need expansion for craft-chain context |
| **Volume target** | ≥2,000 examples per new action class (14,000 for 7 new classes) |
| **Estimated time to collect** | ~6–10 hours with agents at mid-late game skill levels |
| **Class balance risk** | `hunt`, `fish`, `mine` require specific biomes; run diverse world seeds |
| **Quality filter** | Only include decisions that resulted in task start within 10 ticks |

### Feature Vector Gaps

The current 40-dim feature vector was designed for Talker/Executor social and task decisions. For the AutonomicNN, several features are missing that would improve accuracy:

| Missing Feature | Dimension | How to Extract |
|----------------|-----------|----------------|
| Current time of day | 1 | `Time.timeOfDay / 24` |
| Temperature state | 1 | Encode: normal=0, cold=0.33, dangerously_cold=0.67, hot/dangerously_hot=1 |
| Circadian phase | 1 | `circadian.preferredSleepTime` relative to current time |
| Nearby agents count | 1 | Already partially in feat[24], but should be exact |
| Current behavior duration | 1 | Ticks since last behavior change, normalized |

**Recommendation:** Extend feature extractor to 45-dim for AutonomicNN, keeping the existing 40-dim for TalkerNN/ExecutorNN to preserve compatibility with already-trained models.

---

## 5. Recommended NN Architectures

All networks follow the established MVEE pattern: **Linear + LayerNorm + GELU** blocks, dropout during training only, pre-allocated GC-free Float32Array buffers at inference.

### AutonomicNN (New)

```
Input:  45-dim (40 base + 5 autonomic-specific)
Layer 1: Linear(45→64) + LayerNorm(64) + GELU
Layer 2: Linear(64→128) + LayerNorm(128) + GELU + Dropout(0.1)
Layer 3: Linear(128→64) + LayerNorm(64) + GELU
Output: Linear(64→10) → Softmax
Parameters: ~27K
Inference time: <0.2ms (target)
Confidence threshold: 0.85
```

**Rationale for small size:** Autonomic decisions are the most frequent (1s cadence). Minimizing inference latency is more important than maximizing accuracy. A 27K param network provides sufficient representational power for 10 action classes with 45-dim input.

### TalkerNN v2 (Expansion of existing)

```
Input:  40-dim (unchanged)
Layer 1: Linear(40→128) + LayerNorm(128) + GELU
Layer 2: Linear(128→256) + LayerNorm(256) + GELU + Dropout(0.1)
Layer 3: Linear(256→128) + LayerNorm(128) + GELU
Output: Linear(128→12) → Softmax  [was 6, now 12]
Parameters: ~76K (was ~73K)
Inference time: <0.5ms (unchanged)
Confidence threshold: 0.85
```

**Training strategy:** Initialize from existing TalkerNN weights. Freeze early layers, fine-tune output head with expanded action classes. This preserves learned features from existing training data.

### ExecutorNN v2 (Expansion of existing)

```
Input:  40-dim (unchanged)
Layer 1: Linear(40→256) + LayerNorm(256) + GELU
Layer 2: Linear(256→512) + LayerNorm(512) + GELU + Dropout(0.1)
Layer 3: Linear(512→256) + LayerNorm(256) + GELU
Output: Linear(256→20) → Softmax  [was 13, now 20]
Parameters: ~294K (was ~279K)
Inference time: <0.5ms (unchanged)
Confidence threshold: 0.85
```

**Training strategy:** Same — initialize from existing weights, fine-tune output head.

---

## 6. Implementation Roadmap

### Phase 1: Instrumentation (1–2 days)

Before any training can happen, the Autonomic layer's LLM decisions need to be verifiably logged with layer metadata.

1. **Verify** that `LLMDecisionQueue` tags autonomic decisions as `layer='autonomic'` in emitted metrics events
2. **Add** autonomic-layer logging if missing (add `layer` field to `LLM_DECISION_MADE` event payload)
3. **Extend** `extractFeatures()` to 45-dim with autonomic-specific context (time of day, temperature state, circadian phase, behavior duration)
4. **Run** 2–4 hours of supervised gameplay to accumulate ≥50K autonomic decisions

### Phase 2: AutonomicNN Training (2–3 days)

5. **Export** autonomic decision logs from metrics cold-tier archives
6. **Define** AutonomicNN action taxonomy (confirm 10-class list with gameplay team)
7. **Label** raw LLM responses to action classes using the existing parser pattern from `ResponseParser.ts`
8. **Train** AutonomicNN using `training/` scripts (adapt `feature_extractor.py` for 45-dim)
9. **Validate** at ≥0.85 accuracy on held-out session data
10. **Export** weights to JSON via `export_weights_json` and integrate into `MVEEPolicyInference`

### Phase 3: TalkerNN and ExecutorNN Expansion (3–4 days)

11. **Collect** labeled data for new action classes (requires socially-active, late-game sessions)
12. **Fine-tune** TalkerNN from existing weights with 12-class output
13. **Fine-tune** ExecutorNN from existing weights with 20-class output
14. **A/B test** new models against existing: confirm NN bypass rate improves, LLM fallback decreases

### Phase 4: Monitoring and Iteration (ongoing)

15. **Track** `nnRate` metric from `MVEEPolicyInference.getMetrics()` in the admin dashboard
16. **Alert** when `nnRate` drops below 0.60 (indicates model drift or new action types not covered)
17. **Retrain** quarterly or after major gameplay content additions

---

## 7. Expected Impact

Assuming AutonomicNN achieves 0.85+ confidence on 70% of decisions (conservative estimate based on TalkerNN/ExecutorNN performance):

| Metric | Current | After AutonomicNN |
|--------|---------|------------------|
| Autonomic LLM calls at 20 agents | ~20/s | ~6/s (70% reduction) |
| Decision lag for autonomic actions | 200–2000ms | <0.2ms for NN-served |
| LLM queue depth | High (autonomic dominates) | Manageable |
| World heartbeat frequency (agent decision cycle) | Limited by LLM queue | Can tighten to <500ms |

The TalkerNN and ExecutorNN expansions are expected to reduce LLM fallback rates by 15–30% in late-game high-complexity scenarios, with minimal impact on average-case performance (where existing actions already cover the common case).

---

## Appendix A: Existing Network Weight Locations

Trained weights are loaded from URLs or bundled JSON at startup via `MVEEPolicyInference.loadFromURL()`. Check `packages/llm/README.md` for the configured weight server location.

## Appendix B: References

- [MVEEPolicyInference](../../custom_game_engine/packages/llm/src/MVEEPolicyInference.ts) — Runtime inference implementation
- [AutonomicSystem](../../custom_game_engine/packages/core/src/decision/AutonomicSystem.ts) — Rule-based reflex system (pre-LLM check)
- [Performance Audit 2026-03-14](../mvee-performance-audit-2026-03-14.md) — LLM cost analysis and decision architecture
- [SYSTEMS_CATALOG.md](../../custom_game_engine/SYSTEMS_CATALOG.md) — Full 212+ system inventory
- Talker-Reasoner Pattern: arXiv:2410.08328
- LLM4Teach (policy distillation): arXiv:2311.13373
- Policy Distillation original: arXiv:1511.06295
