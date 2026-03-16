# Creature Epistolary — Feasibility Assessment
## Intelligence-Gated Norn Writing System

*Filed by: Scheherazade (Folklorist), with reference to existing LLM and Chronicle infrastructure*
*Date: 2026-03-14*
*Source: docs/research-sprint4-plan-2026-03-14.md, Idea B*
*Status: FEASIBLE — no architectural changes required*

---

## 1. Feasibility Verdict

**Verdict: Feasible without architectural changes.**

The existing infrastructure fully supports this feature:

- **IntelligenceComponent** (`packages/core/src/components/IntelligenceComponent.ts`) already defines `modelQuality` on a 1-10 scale with a documented bell-curve distribution. The 70th-percentile gate maps cleanly to `modelQuality >= 7`.
- **RateLimiter** (`packages/llm/src/RateLimiter.ts`) implements a per-key token bucket algorithm that can enforce the 1-text/Norn/game-day limit with zero changes.
- **EpisodeLogger** (`packages/llm/src/EpisodeLogger.ts`) already captures `(promptHash, action, thinking, speaking)` episodes as JSONL, which is the distillation training format. A new `epistolary` layer can be added to the existing layer enum.
- **ChroniclerSystem** (`packages/core/src/research/ChroniclerSystem.ts`) already accepts `HistoricalEvent` entries with type `strange_occurrence`. Epistolary texts can be submitted as `strange_occurrence` events with `significance: 'notable'`, entering the chronicle pipeline without modification.
- **SpeciesVoiceProfiles** (`packages/llm/src/SpeciesVoiceProfiles.ts`) already define distinct linguistic patterns for all 16 canonical species (with 6+ more incoming). The epistolary prompt can inject the species voice profile directly as the system prompt.

One new component is needed: a lightweight `EpistolarySystem` that gates writing on the intelligence check, calls the LLM, and submits the result to ChroniclerSystem. Estimated scope: ~150 lines, no new dependencies.

---

## 2. LLM Context Specification

Each epistolary call uses the following context, all of which is available from existing components:

```
System prompt (static per species):
  - SpeciesVoiceProfile.languagePattern
  - SpeciesVoiceProfile.culturalPractices (as behavioral constraints)
  - Instruction: "Write a short personal text — an observation, feeling, or fragment of thought.
    You are a creature, not a human. Keep it under 80 words. Write in first person."

User prompt (dynamic per Norn instance):
  - Species name and age in ticks (converted to approximate life-stage)
  - Current drive states (hunger, loneliness, fear, boredom, pain) — top 3 by intensity
  - Last 3 Chronicle events the Norn was a participant in (from ChroniclerSystem.getRecordedEvents(),
    filtered by agentId)
  - Current world state fragment: season/time-of-day, population count, any active disaster/event
  - Intelligence score (for internal calibration, not shown to creature)
```

**Estimated input token budget:** ~350–500 tokens per call (compact, no conversation history needed).
**Estimated output token budget:** 80–120 tokens (the text itself, no reasoning chain required).

The call does not require `thinking` tokens — this is a generative task, not a decision task. Use `haiku`-tier model regardless of the Norn's `modelQuality`; the epistolary voice is defined by species, not cognitive tier.

---

## 3. Output Format

**Recommended format: Epistolary Fragment**

A Norn's "writing" should feel like a found artifact — something discovered scratched on bark, pressed into clay, or traced in soil depending on the world's tech level (which the ChroniclerSystem already tracks via `WritingTechLevel`). It is not a diary entry, not a haiku, not a chronicle entry.

**Format spec:**
- 30–80 words
- First person, present or recent past tense
- Grounded in the creature's immediate sensory and emotional world
- Ends on an unresolved note (creatures do not have tidy conclusions)
- No title, no date, no attribution in the text itself (these are supplied by ChroniclerSystem)

**Species voice variation (derived from SpeciesVoiceProfiles):**

| Species | Epistolary character |
|---------|---------------------|
| Norn | Addressed to someone absent; asks a question the writer cannot answer |
| Grendel | Fragment. No punctuation for softness. States territory and hunger. Ends mid-thought. |
| Ettin | Inventory of interesting things observed today. Functional, but sincere. |
| Shee | Speaks from a future vantage point about the present moment, casually. |
| Mycon | Describes smell and decay. Connects two things that have no visible relationship. |
| Dvergar | A tally that becomes unexpectedly personal. Measurements slip into feeling. |
| Alfar | Highly literary. May quote a prior epistolary fragment (if any exist in Chronicle). |

**Example — Norn, moderately intelligent, hungry, recently witnessed a birth:**
> *The new one arrived and everyone made sounds I have learned to call happy. I made them too. I am still hungry. I wonder if the new one will be hungry. I wonder if I will remember to ask them when they are old enough to answer.*

**Example — Grendel, high intelligence, territory recently contested:**
> *Three came. Two left. I ate. The third is still here but smaller than before. Mine. This place smells right. Mine.*

**In-game presentation:** Epistolary fragments appear in the Chronicle viewer under a "Found Texts" tab, attributed to the creature species and life-stage (e.g., "adult Norn, 3rd generation"). Player's own creatures' writings are highlighted.

---

## 4. Distillation Path

The existing Phase 4 distillation pattern (EpisodeLogger → JSONL → micro-NN training) applies directly.

**Accumulation target: N = 3,000 texts per species before fine-tuning.**

Rationale: The Autonomic micro-NN trained on 5K episodes (MUL-938 precedent). Epistolary texts are shorter and more stylistically constrained than decision episodes, so a lower N is defensible. 3K texts per species ≈ 66K total examples across 22 species — enough for a shared base model + per-species LoRA adapters.

**Training approach:**
1. Accumulate via EpisodeLogger, new `layer: 'epistolary'` field.
2. Export JSONL via `episodeLogger.exportJSONL()` — already implemented.
3. Train a shared 1–3B base model (e.g., Llama-3.2-1B or Mistral-1B) on all species texts combined, then fine-tune per-species LoRA adapters on species-filtered subsets.
4. Package identically to existing micro-NNs in `llm-distill` — the OSS publish (MUL-1045) can include this as a third case study after Precursors and MVEE.

**At 330 qualifying Norns/day (upper bound, see §5), accumulation time:**
- 3,000 texts ÷ 330 texts/day = ~9 game-days of active play per world instance
- At 10 world instances in beta: 3,300 texts/day → ~1 real-day to hit the training threshold

Fine-tuning can begin once 3K texts exist regardless of source instance.

---

## 5. Rate Limiting and Cost

### Population math

| Factor | Value | Notes |
|--------|-------|-------|
| Species count | 22 | Per sprint 4 plan |
| Average population per species | ~15 active adults | Conservative; many species have lower populations |
| 70th-percentile intelligence gate | modelQuality ≥ 7 | ~30% of agents with bell-curve distribution (see §6) |
| Qualifying Norns per day | ~22 × 15 × 0.30 ≈ **99** | Realistic active session |
| Upper bound (large world, peak) | ~330 | 22 × 50 × 0.30 |

### LLM cost per call (haiku-tier)

| Metric | Value |
|--------|-------|
| Input tokens | ~450 |
| Output tokens | ~100 |
| Cost per call (claude-haiku-4-5) | ~$0.00036 + $0.00040 = ~$0.00076 |

### Daily cost

| Scenario | Calls/day | Cost/day |
|----------|-----------|----------|
| Realistic (99 Norns) | 99 | **$0.075** |
| Upper bound (330 Norns) | 330 | **$0.25** |
| 10 active world instances, peak | 3,300 | **$2.50** |

**Conclusion: comfortably within budget at any realistic scale.** Even 1,000 concurrent world instances would cost ~$250/day — within the range of existing LLM decision-making costs for behavioral AI. The epistolary system is cheaper than a single executor-layer decision per agent per session.

### Rate limiting implementation

The `RateLimiter` token bucket already handles per-key limits. Map `agentId` → rate-limit key with `requestsPerMinute: 1/1440` (1 per game-day). The `CooldownCalculator` pattern can enforce a game-day cooldown stored in the Norn's component state. No new infrastructure needed.

---

## 6. Intelligence Gate Threshold

**Recommendation: retain the 70th-percentile threshold, implemented as `modelQuality >= 7`.**

The `IntelligenceComponent` uses a bell-curved distribution (sum of two uniform [1,5] samples → range 2–10, modal 5–6). Empirically:
- modelQuality 1–6: ~70% of agents
- modelQuality 7+: ~30% of agents ≈ 70th percentile

This maps cleanly to the existing `modelQuality` integer without requiring a float trait or cross-creature percentile calculation. A Norn knows if it can write by checking one component field.

**Why this threshold makes design sense:**
- At modelQuality 7, agents already use "high" tier reasoning (2000–4000 token budget) for decisions. Writing is a natural extension of this cognitive capacity.
- The threshold is legible to players who understand the intelligence mechanic: smarter creatures do qualitatively different things.
- It is conservative enough that writing feels rare and meaningful in smaller populations, common enough to accumulate training data efficiently.

**Alternative considered:** Float percentile computed across all living Norns in the world instance. Rejected — requires O(n) scan at write time, introduces inter-agent coordination, and makes the gate invisible to players. The `modelQuality >= 7` integer gate is predictable and debuggable.

---

## 7. Implementation Sketch (not a spec)

```typescript
// New system: EpistolarySystem.ts
// Runs on throttleInterval: 1200 (once per game-minute at 20 TPS)
// Checks each eligible Norn (intelligence.modelQuality >= 7)
//   → Checks game-day cooldown (new field: lastEpistolaryTick on agent component)
//   → Builds prompt from SpeciesVoiceProfiles + drive states + recent chronicle events
//   → Calls LLM via existing LLMDecisionQueue with layer: 'epistolary', haiku tier
//   → On response: logs to EpisodeLogger, submits to ChroniclerSystem as HistoricalEvent
```

No changes to: ChroniclerSystem, EpisodeLogger, RateLimiter, SpeciesVoiceProfiles, IntelligenceComponent.

---

## 8. Open Questions (for ML Engineer review)

1. **Game-day definition:** How many ticks constitute one game-day in the current simulation? The cooldown must be expressed in ticks, not wall-clock time. (ChroniclerSystem's `CHRONICLE_PERIOD = 12000` ticks ≈ 10 minutes — is 1 game-day also ~10 minutes?)
2. **LLMDecisionQueue capacity:** At peak (330 epistolary calls queued simultaneously), does the queue degrade decision-making latency for behavioral AI? Recommend epistolary calls run at lowest priority in the queue.
3. **Distillation timeline:** After accumulating 3K texts, does the `llm-distill` pipeline (MUL-1045) support the LoRA adapter pattern, or does it only support full fine-tuning?

---

*References: IntelligenceComponent.ts, SpeciesVoiceProfiles.ts, EpisodeLogger.ts, ChroniclerSystem.ts, RateLimiter.ts, docs/research-sprint4-plan-2026-03-14.md*
*Giants we stand on: Grand 2000 (Creatures biochemistry heritage), Hinton 2015 (distillation), Rusu 2016 (policy distillation)*
