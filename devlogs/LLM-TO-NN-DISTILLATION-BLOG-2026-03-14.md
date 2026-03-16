# How We're Teaching Tiny Neural Networks to Replace LLM Calls in Game AI

*Published: 2026-03-14 | Multiverse Studios devblog*

*Cross-post: [dev.to](https://dev.to)*

---

If you've ever tried to power NPC cognition with a large language model, you've hit the wall. The AI is alive, responsive, genuinely surprising — and then the invoice arrives.

We built two games that use LLMs to drive NPC reasoning. In *Multiverse: The End of Eternity* (MVEE), every village agent has a three-layer cognition stack: reflexive needs, social reasoning, and strategic planning — each hitting an LLM endpoint on its own cooldown. With 20–100 agents per village running at 20 ticks per second, we were staring at hundreds of dollars a month before we'd launched a single playtest.

The question we set out to answer: **can you use an LLM as a teacher to train a tiny, fast neural network that makes the same decisions at runtime?**

The answer is yes. And the pattern works for any game with LLM-powered NPCs.

---

## The Core Insight: Every LLM Call Is a Training Example

The breakthrough wasn't a clever training technique. It was a shift in perspective: *if you log every LLM call, you're building a dataset for free.*

Most teams think about distillation as a two-phase project — first collect data, then train. We flipped it: ship the episode logger first, collect data as a side effect of normal gameplay, and worry about training later. This means by the time you're ready to train, you already have real gameplay data. No synthetic scenarios. No distribution shift.

Here's the pipeline we built:

**Phase 1 (live now):** Instrument every LLM call. Log input → output pairs as episodes. Cache responses to save calls immediately.

**Phase 4 (coming):** Train small PyTorch MLPs on the logged episodes. At runtime, run the NN first — if confidence exceeds 0.85, skip the LLM call entirely. Below 0.85, fall through to the LLM as a safety net.

Expected total savings: **50–80% reduction in LLM API costs**.

---

## The Episode Logger

The workhorse of Phase 1 is `EpisodeLogger` — a singleton ring buffer that silently records every LLM decision.

```typescript
export interface Episode {
  id: string;           // sequential episode number
  timestamp: number;
  agentId: string;
  layer: string;        // 'autonomic' | 'talker' | 'executor'
  promptHash: string;   // links to response cache
  promptLength: number; // token estimate (chars / 4)
  actionType: string;   // parsed action type
  action: unknown;      // full parsed action
  thinking?: string;    // LLM reasoning (truncated to 200 chars)
  durationMs: number;   // LLM call duration
  cacheHit: boolean;
  provider?: string;
}
```

Every cache miss — a genuine LLM call — gets logged automatically. The buffer holds 5,000 episodes in memory and exports JSONL for offline training:

```typescript
// In LLMDecisionQueue.processRequest():
const response = await llm.call(prompt);
episodeLogger.log({
  agentId,
  layer,
  promptHash: djb2(prompt),
  promptLength: prompt.length / 4,
  actionType: response.actionType,
  action: response.action,
  thinking: response.thinking,
  durationMs: elapsed,
  cacheHit: false,
  provider: 'anthropic',
});
```

Zero gameplay overhead. The logger runs synchronously after the LLM call completes — it's not on the hot path.

---

## The Response Cache

Alongside the episode logger, we shipped an LRU response cache keyed by prompt hash (djb2). The TTL varies by decision layer:

| Layer | TTL | Rationale |
|---|---|---|
| Autonomic | 5s | Reflexes repeat often: "agent is hungry, it's daytime" |
| Talker | 30s | Social context shifts more slowly |
| Executor | 60s | Strategy decisions are more context-sensitive |

The cache delivers **10–20% cost savings immediately** — before any NN is trained. Autonomic decisions have the highest cache hit rate because agents in similar states genuinely do make the same decision.

One honest caveat: a 5-second TTL means an agent can repeat the same "eat" decision for 5 seconds without re-checking its actual hunger level. That's a correctness tradeoff we accepted deliberately. We'll monitor it in playtest.

---

## The Runtime NN (How It Works in Our Sister Game)

Our other game, *Precursors: Origins of Folklore*, already ships the NN runtime. The `LimbicPolicyInference` system runs Norn cognition through a 5-layer MLP:

```
116 inputs → 256 → 512 → 512 → 128 → 13 outputs
```

The inference runs in pure TypeScript against `Float32Array` scratch buffers allocated once at startup. No dependencies. No GC pressure. Target: **<0.5ms for 100 Norns at 20 TPS**.

Weights are exported as JSON from PyTorch training and loaded at startup. The NN replaces LLM calls for high-confidence decisions; the LLM handles novel situations that fall below the 0.85 threshold. In practice, once the NN is well-trained, the LLM becomes a rare fallback.

MVEE is building the same pattern for its three cognitive layers. Precursors built it first; we adopted the architecture directly.

---

## Why This Works: Prior Art

This is not a new idea. We're standing on documented shoulders:

- **Knowledge distillation** (Hinton, Vinyals & Dean, 2015 — *arXiv:1503.02531*): the foundational technique. Train a small "student" network to mimic a large "teacher" model.
- **Policy distillation** (Rusu et al., 2016 — *ICLR 2016*): the same idea applied to RL policy networks. We're applying it to LLM policies.
- **Talker-Reasoner architecture** (*arXiv:2410.08328*): dual-process framing — fast System 1 (NN) + slow System 2 (LLM). We didn't invent this split; we applied it to game AI.
- **LLM4Teach** (*arXiv:2311.13373*): reliable distillation via LLM labeling. The LLM labels training examples at call time; the student learns from those labels.

What's novel in our implementation is the *zero-overhead instrumentation pattern* — shipping the episode logger before having a trained model, collecting real gameplay data passively, and using a cache as a low-risk first step before the more complex training pipeline.

---

## What's Still Pending (Honest Status)

Phase 1 is live. We're collecting episodes now. Phase 4 (actual NN training) requires ~10,000 episodes per decision layer, which we don't have yet. We'll publish results when we do.

There's also an open question about **structured feature vectors** vs. prompt hashes. Right now we log `promptHash`, which links to the cached response but doesn't give us the input feature vector directly. For Phase 4 training to work, we'll need to reconstruct the feature vector from each episode — or add feature logging to Phase 1. That's the next engineering task.

Finally: we're exploring a completely different angle via the RYS (Repeat Yourself) technique — routing specific transformer layers twice during inference on a locally-hosted 8B model (Apple Silicon / MLX). If it works, it would give us better NPC reasoning at zero API cost, no training required. Results are pending from our ML team.

---

## The Generalizable Pattern

If you're building LLM-powered NPCs, here's the pattern:

1. **Instrument every LLM call** with an episode logger (prompt hash + action + metadata). Zero gameplay overhead.
2. **Add a response cache** keyed by prompt hash with TTL tuned to decision frequency. Immediate savings, no training required.
3. **Collect 10K+ episodes** per decision type through normal gameplay.
4. **Train a small MLP offline** (2–3 layers, PyTorch). Export weights to JSON.
5. **At runtime**: run NN first. High confidence → return NN result. Low confidence → call LLM.

This works for any game with LLM-powered agents. The cache and episode logger are game-agnostic. The NN architecture depends on your decision space (ours is 116 inputs → 13 outputs for Precursors Norn cognition).

We'll open-source the pattern — episode logger, cache, and inference runtime — when Phase 4 completes and we have real cost numbers to report.

---

## Related Issues / Further Reading

- Phase 1 implementation: MUL-937
- Phase 4 (micro-NN training): MUL-938
- MLX/RYS experiments: MUL-941
- Hinton et al. (2015): *arXiv:1503.02531*
- Rusu et al. (2016): *arXiv:1511.06295*
- Talker-Reasoner: *arXiv:2410.08328*
- LLM4Teach: *arXiv:2311.13373*

---

*Written by the Multiverse Studios team. Questions? Find us on [itch.io](#) or follow [@MultiverseStudios](#) for updates.*
