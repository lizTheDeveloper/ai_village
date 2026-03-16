# Devlog: LLM to NN Distillation for Real-Time Game AI

**Date:** 2026-03-14
**Author:** Research PM (Research & Systems PM, Multiverse Studios)
**Status:** Draft — section 6 pending MLX/RYS experiment results (MUL-941)
**Cross-posted to:** MVEE devlogs, Precursors devlog, internal wiki

---

## 1. The Problem: LLM-Powered NPCs at Scale

Both our games — *Multiverse: The End of Eternity* (MVEE) and *Precursors: Origins of Folklore* — use large language models to power NPC cognition. The idea is compelling: instead of scripted behavior trees, agents reason in natural language, hold genuine conversations, form memories, and make decisions that feel alive.

The cost is real.

In MVEE, every village agent has a three-layer cognition stack: an *autonomic* layer for reflexive needs, a *talker* layer for social reasoning, and an *executor* layer for strategic planning. Each layer hits an LLM endpoint on a different cooldown. With 20–100 agents per village running at 20 TPS, LLM calls accumulate fast. We were looking at hundreds of dollars per month for a game that hasn't launched yet.

In Precursors, Norns need to decide what to do many times per second. The Creatures series (1996–2004, Millennium Interactive / Creature Labs) solved this with a full biochemistry simulation — chemical drives, neurons, and hardcoded responses. We wanted to do better: combine Steve Grand's biochemical substrate (which we implemented faithfully, per *Creation: Life and How to Make It*, 2000) with LLM-quality reasoning. The problem: LLMs are too slow for the inner loop.

The question we set out to answer: **can we use LLMs as teachers to train tiny, fast neural networks that mimic LLM decisions at inference time?**

The answer, it turns out, is yes — and the pattern generalises across both games.

---

## 2. Our Solution: The Episode-First Distillation Pipeline

The core insight is that every LLM call is a training example, if you log it right.

We didn't start by collecting data and then training. We started by shipping a system that collects training data *as a side effect of normal gameplay* — zero overhead, zero user impact. Once we have enough episodes, training becomes a batch job.

The pipeline has two stages:

**Stage 1: Instrument the LLM path (what we built)**

Every LLM call now goes through `LLMDecisionQueue.processRequest()`, which:

1. Hashes the prompt with djb2 → checks `LLMResponseCache` for a cache hit (saved call)
2. On miss: calls the LLM, gets a response
3. Logs an episode to `EpisodeLogger`: `(agentId, layer, promptHash, actionType, action, thinking, durationMs, cacheHit, provider)`
4. Stores the response in cache with layer-specific TTL (autonomic: 5s, talker: 30s, executor: 60s)

The episode logger is a ring buffer capped at 5,000 episodes. It exports JSONL for offline training. Every cache miss is a clean training example: input state → LLM decision.

**Stage 2: Train a micro-NN offline (coming in Phase 4)**

From the JSONL export, we train three small PyTorch models — one per MVEE decision layer — and export weights to JSON. At runtime, `LimbicPolicyInference` runs a manual forward pass using `Float32Array` scratch buffers (no dependencies, no GC pressure). If the NN confidence exceeds 0.85, we skip the LLM call entirely. Below 0.85, we fall through to the LLM as a safety net.

This pattern is called *knowledge distillation* (Hinton et al., 2015, "Distilling the Knowledge in a Neural Network," arXiv:1503.02531). The LLM is the teacher; the NN is the student. In game AI, the same idea appears as *policy distillation* (Rusu et al., 2016, "Policy Distillation").

The dual-process framing — fast NN (System 1) + slow LLM (System 2) — follows the Talker-Reasoner architecture described in arXiv:2410.08328. The student-at-runtime pattern follows LLM4Teach (arXiv:2311.13373).

---

## 3. Results: Phase 1 Shipped

Phase 1 (response cache + episode logger, [MUL-937](/MUL/issues/MUL-937)) shipped on 2026-03-14.

**What's live:**

| Component | Location | Description |
|---|---|---|
| `LLMResponseCache` | `packages/llm/src/LLMResponseCache.ts` | djb2 hash → response, LRU eviction, per-layer TTL |
| `EpisodeLogger` | `packages/llm/src/EpisodeLogger.ts` | Ring buffer (5K eps), JSONL export |
| Integration point | `LLMDecisionQueue.processRequest()` | Cache check → LLM call → episode log |

**Expected savings from cache alone:** 10–20% LLM cost reduction (estimated; we need episode data to measure precisely). Autonomic decisions — which fire on 1s cooldowns and often repeat the same scenario — are the highest-hit-rate tier.

**Episode data collection:** Every village session now accumulates training examples automatically. We need ~10,000 episodes per layer before Phase 4 training is worth running.

**In Precursors:** The `LimbicPolicyInference` system ([`src/cognition/LimbicPolicyInference.ts`](/games/precursors/src/cognition/LimbicPolicyInference.ts)) already implements the trained NN runtime — architecture `116 → 256 → 512 → 512 → 128 → 13`, targeting <0.5ms for 100 Norns at 20 TPS. Precursors got there first. MVEE is catching up.

---

## 4. Architecture: The Three Components

### EpisodeLogger

```
Episode = {
  agentId, layer,        // who made the decision
  promptHash,            // links back to the actual prompt
  actionType, action,    // what the LLM decided
  thinking, speaking,    // truncated reasoning (200 chars)
  durationMs,            // how long the LLM took
  cacheHit, provider     // metadata for analysis
}
```

Singleton, thread-safe (single-threaded JS), 5,000 episode ring buffer. Export with `episodeLogger.exportJSONL()`.

### LLMResponseCache

Keyed by djb2 prompt hash. Per-layer TTL means autonomic decisions (highly repetitive, 5s TTL) are cached aggressively, while executor decisions (complex, context-sensitive, 60s TTL) are cached conservatively. LRU eviction at 500 entries.

### LimbicPolicyInference (Precursors)

Manual forward pass through a 5-layer MLP. `Float32Array` scratch buffers allocated once at startup; reused every call to avoid GC pressure. No dependencies — the weights are JSON, the inference is pure arithmetic. Total: ~255K parameters across three micro-NNs (planned for MVEE Phase 4).

---

## 5. Honest Retrospective: What We'd Do Differently

**What worked well:**

- **Instrument before training.** Shipping episode logging before having a trained model meant we collected real gameplay data from the start. We didn't have to synthetically generate training scenarios.
- **Cache as low-hanging fruit.** The response cache delivers savings immediately, without any training pipeline. It also validates that the prompt hashing and integration point work before we depend on them for training.
- **Separating cache TTL by layer.** Autonomic decisions (needs, reflexes) repeat far more than executor decisions (strategy). Matching TTL to variability was the right call.
- **Cross-game knowledge transfer.** Precursors built `LimbicPolicyInference` first. MVEE adopted the same pattern. Neither team re-invented the wheel.

**What we'd do differently:**

- **Log feature vectors, not just prompt hashes.** For Phase 4, we'll need to reconstruct the input state from episode data. Right now we log `promptHash` (which lets us look up the cached response) but not the structured feature vector. We'll need to add feature logging before Phase 4 training is practical.
- **Start smaller.** We designed for three micro-NNs from the start. In retrospect, we should have started with just the autonomic layer (simplest decision space) and iterated. We were influenced by the Precursors architecture and over-specified upfront.
- **The cache is a crutch.** A 5s TTL on autonomic decisions means an agent can repeat the same "eat" decision for 5 seconds without checking its actual hunger level. This is a correctness tradeoff we accepted but should monitor.

---

## 6. What's Next

**Phase 4: Distilled Micro-NNs (MUL-938)**
Waiting on 10K+ episodes per layer from Phase 1 data collection. Then: PyTorch offline training, JSON weight export, Float32Array runtime inference. Estimated savings: 50–80% total LLM cost reduction at 0.85 confidence threshold.

**Phase 2: Semantic Cache (future)**
Embedding-based similarity matching for near-identical (but not identical) prompts. Would catch "agent A is hungry, it's raining" vs "agent B is hungry, it's drizzling" as the same decision. Requires a lightweight embedding model on the client side.

**Phase 3: Decision Templates (future)**
Expand the AutonomicSystem rule-based shortcuts using patterns mined from Phase 1 episode data. No training required — just pattern frequency analysis.

**MLX/RYS experiments (MUL-941)**
Separately, we're exploring whether the RYS (Repeat Yourself) technique — routing certain middle transformer layers twice during inference without changing weights — can improve an 8B local model on Apple Silicon (MLX). If it works, this could give us better NPC reasoning with a locally-hosted model at no extra training cost. Results will appear in a follow-up devlog section.

---

## References

- Hinton, G., Vinyals, O., & Dean, J. (2015). Distilling the Knowledge in a Neural Network. *arXiv:1503.02531*
- Rusu, A.A. et al. (2016). Policy Distillation. *ICLR 2016 (arXiv:1511.06295)*
- Anil, C. et al. (2024). Talker-Reasoner: A Dual-Process AI. *arXiv:2410.08328*
- Xiao, S. et al. (2023). LLM4Teach: Reliable Distillation via LLM. *arXiv:2311.13373*
- Grand, S. (2000). *Creation: Life and How to Make It*. Weidenfeld & Nicolson.
- Grand, S. et al. (1997). Creatures: Artificial Life Autonomous Software Agents for Home Entertainment. *AGENTS-97*. Millennium Interactive / Creature Labs.
- Ng, D. (2026). LLM Neuroanatomy: How I Topped the AI Leaderboard Without Changing a Single Weight. *dnhkng.github.io/posts/rys/*

---

*Cross-posted to: MVEE devlogs, Precursors devlog. Related issues: [MUL-935](/MUL/issues/MUL-935) (LLM savings initiative), [MUL-937](/MUL/issues/MUL-937) (Phase 1 implementation), [MUL-938](/MUL/issues/MUL-938) (Phase 4 micro-NNs), [MUL-941](/MUL/issues/MUL-941) (MLX/RYS experiments).*
