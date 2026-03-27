# FiLM Limbic NN — Production Integration Guide

**Author:** Boltzmann (ML Engineer)
**Date:** 2026-03-26
**Status:** Ready for integration (CONDITIONAL GO from S16 benchmark)
**Ref:** MUL-4009, MUL-3930, commit a19e4a1b

---

## Overview

The FiLM (Feature-wise Linear Modulation) limbic policy NN replaces the current
one-hot MLP for computing Norn urgency weights. It provides better species
conditioning via learned embeddings instead of one-hot input vectors, and is
20-45% faster than the current production model.

**Key constraint:** FiLM must be deployed with **10x tick-staggering** to fit
within the 5ms/tick frame budget at 100 creatures.

---

## Architecture Summary

```
Input: 97 chemicals + 1 tier + 32 imprint = 130-dim trunk
       + species index → 16x32 learned embedding

Forward pass:
  fc1(130→256) → LN → GELU → FiLM₁(species_emb) →
  fc2(256→448) → LN → GELU → FiLM₂(species_emb) →
  fc3(448→448) → LN → GELU →
  fc4(448→128) → LN → GELU →
  fc5(128→13)  → Sigmoid

Output: 13 urgency weights in [0,1]
  [hunger, thirst, pain, fatigue, fear, anger, loneliness,
   boredom, curiosity, escape, social, rest, limbicInfluence]
```

- **Parameters:** 458K (~1.8 MB JSON)
- **FLOPs/inference:** ~458K
- **Steady-state latency:** ~406 μs/call (p50 at 100 creatures, Node arm64)

---

## Files Involved

### Already implemented (commit a19e4a1b)

| File | Purpose |
|------|---------|
| `src/cognition/LimbicFiLMInference.ts` | Runtime inference engine (singleton: `limbicFiLMInference`) |
| `src/cognition/LimbicPolicyInference.ts` | Current one-hot inference (singleton: `limbicInference`) |
| `src/cognition/LimbicSystem.ts` | Dispatch layer — calls inference, falls back to hardcoded rules |
| `src/rendering/GameBootstrapper.ts` | Model loading at boot (line ~2110) |
| `training/export_film_json.py` | Export PyTorch → JSON weights |
| `training/models/s15_film_hinge_ortho/json/` | 13 exported JSON weight files |

### Needs modification for integration

| File | Change needed |
|------|---------------|
| `src/cognition/LimbicSystem.ts` | Prefer `limbicFiLMInference` over `limbicInference` |
| `src/rendering/GameBootstrapper.ts` | Load FiLM model at boot, add tick-stagger config |
| `src/cognition/CognitionSystem.ts` | Implement tick-stagger round-robin |
| `src/ui/DevPanel.ts` | Add FiLM toggle alongside existing limbic toggle |

---

## Integration Steps

### Step 1: Deploy model weights as static assets

Copy the universal FiLM model JSON to the public models directory:

```bash
cp training/models/s15_film_hinge_ortho/json/limbic_universal_film.json \
   public/models/limbic_universal_film.json
```

The file is ~1.8 MB. Per-species models (Norn, Grendel, Ettin, etc.) are also
available if per-species specialization is desired later, but the universal model
is sufficient for initial deployment.

### Step 2: Wire FiLM loading in GameBootstrapper

In `src/rendering/GameBootstrapper.ts`, add alongside the existing one-hot load:

```typescript
import { limbicFiLMInference } from '../cognition/LimbicFiLMInference';

// After the existing limbicInference.loadFromURL() block:
limbicFiLMInference.loadFromURL(`${import.meta.env.BASE_URL}models/limbic_universal_film.json`)
  .then(() => {
    limbicFiLMInference.setEnabled(true);
    console.log('[GameBootstrapper] FiLM limbic model loaded and enabled');
  })
  .catch((err) => {
    console.warn('[GameBootstrapper] FiLM model load failed, using one-hot fallback:', err);
  });
```

### Step 3: Update LimbicSystem dispatch

In `src/cognition/LimbicSystem.ts`, prefer FiLM when available:

```typescript
import { limbicFiLMInference } from './LimbicFiLMInference';

static computeUrgencyWeights(
  chemicals: ChemicalSet,
  species?: Species,
  tier?: number,
  imprintVector?: Float32Array | null,
): LimbicWeights {
  // Try FiLM first (faster, better species conditioning)
  const filmWeights = limbicFiLMInference.computeWeights(chemicals, species, tier, imprintVector);
  if (filmWeights) return filmWeights;

  // Fall back to one-hot NN
  const nnWeights = limbicInference.computeWeights(chemicals, species, tier, imprintVector);
  if (nnWeights) return nnWeights;

  // Final fallback: hardcoded rules
  return LimbicSystem.hardcodedWeights(chemicals, species, tier);
}
```

### Step 4: Implement tick-staggering

The critical performance optimization. Without staggering, 100 creatures at
~406 μs each = ~41ms/tick (8x over budget).

**With 10x stagger:** each creature updates every 10 ticks (0.5s at 20 TPS).
Only 10 creatures compute per tick = ~4.1ms (within 5ms budget).

Implementation approach in `CognitionSystem` or `LimbicSystem`:

```typescript
// Round-robin stagger: creature updates on tick where (creatureIndex % STAGGER) === (tickCount % STAGGER)
const LIMBIC_STAGGER = 10; // Update each creature every 10 ticks

private tickCount = 0;
private cachedWeights = new Map<string, LimbicWeights>();

shouldUpdateLimbic(creatureIndex: number): boolean {
  return (creatureIndex % LIMBIC_STAGGER) === (this.tickCount % LIMBIC_STAGGER);
}

getLimbicWeights(creature: Norn, creatureIndex: number): LimbicWeights {
  if (this.shouldUpdateLimbic(creatureIndex)) {
    const weights = LimbicSystem.computeUrgencyWeights(
      creature.chemicals, creature.species, creature.modelTier, creature.imprintVector
    );
    this.cachedWeights.set(creature.id, weights);
    return weights;
  }
  return this.cachedWeights.get(creature.id) ?? LimbicSystem.computeUrgencyWeights(
    creature.chemicals, creature.species, creature.modelTier, creature.imprintVector
  );
}
```

**Why 0.5s staleness is acceptable:** Drive chemicals update at ~1 Hz effective
rate. Limbic urgency weights derived from those chemicals change smoothly. A
0.5s-old weight is indistinguishable from a fresh one in gameplay terms.

**At game start (2 Norns):** No staggering needed. Latency is <1.5ms for 2
creatures. Staggering only matters at scale (20+ creatures).

---

## Memory & CPU Budget

| Metric | Value | Budget | Status |
|--------|-------|--------|--------|
| Model JSON size | ~1.8 MB (universal) | 2 MB/archetype | PASS |
| Runtime scratch buffers | ~25 KB (pre-allocated) | — | Negligible |
| Inference latency (p50) | ~406 μs/call | — | — |
| Per-tick with 10x stagger | ~4.1ms (100 creatures) | 5ms | PASS |
| Per-tick without stagger | ~41ms (100 creatures) | 5ms | FAIL |
| Per-tick at game start | ~1.4ms (2 creatures) | 5ms | PASS |

Total memory footprint: **~1.8 MB** for the universal model. If per-species
models are loaded later, budget ~1.8 MB × number of species loaded.

---

## WASM SIMD — Future Optimization (Sprint 17+)

The current inference is pure JavaScript scalar loops. WASM SIMD can accelerate
the matrix-vector multiplies that dominate inference time.

**Expected gains:**
- 5-10x speedup on linear layer hot path
- Target: <1ms/tick at 100 creatures **without staggering**
- With 4x stagger + SIMD: ~1-2ms/tick

**Build requirements:**
- Emscripten or wasm-pack toolchain
- WASM SIMD support (available in all modern browsers since 2021)
- Fallback to JS scalar on browsers without SIMD

**Scope:** Replace `linearInPlace()` in `LimbicFiLMInference.ts` with a WASM
module that takes Float32Array inputs and writes to Float32Array outputs. The
rest of the forward pass (LayerNorm, GELU, FiLM modulation, sigmoid) are
element-wise and benefit less from SIMD.

This is a separate work item — tick-staggering alone is sufficient for launch.

---

## Quick Win: Pre-cached Species FiLM Vectors

The FiLM gamma/beta projections only depend on the species embedding, which is
static per model. Pre-computing these at model load time saves 4 small matmuls
per inference call (~10% savings).

Implementation: in `LimbicFiLMInference.loadModel()`, precompute and cache:
```typescript
// For each species i in [0, NUM_SPECIES):
//   gamma1[i] = film1.gamma_proj(species_emb[i])  // 32→256
//   beta1[i]  = film1.beta_proj(species_emb[i])    // 32→256
//   gamma2[i] = film2.gamma_proj(species_emb[i])  // 32→448
//   beta2[i]  = film2.beta_proj(species_emb[i])    // 32→448
```

Then `forwardPass()` indexes into the cache instead of computing projections.
This is low-effort and can be done in the same PR as the integration.

---

## Validation Checklist

Before shipping FiLM to production:

- [ ] `npm run build` passes with FiLM wired in
- [ ] `npm test` passes (no regressions)
- [ ] FiLM model loads successfully at game boot (check console log)
- [ ] Fallback to one-hot works when FiLM model fails to load
- [ ] DevPanel toggle switches between FiLM/one-hot/hardcoded
- [ ] At 2 Norns: urgency weights visually match one-hot behavior
- [ ] Frame budget test: composite frame time stays under budget with staggering
- [ ] Hatching new Norns: limbic weights initialize correctly for new species
- [ ] Species-specific behaviors preserved (Grendel aggression, Ettin hoarding, etc.)

---

## Risks & Mitigations

| Risk | Mitigation |
|------|-----------|
| FiLM model fails to load (network error) | Automatic fallback to one-hot NN, then to hardcoded rules |
| Staggering causes visible behavior lag | 0.5s staleness is imperceptible; reduce STAGGER if needed |
| Species embedding mismatch (new species added) | `LimbicFiLMInference` validates `num_species` at load time |
| Memory pressure from large model JSON | Universal model is 1.8 MB — well within budget |
| WASM SIMD not available in browser | Not needed for launch; staggering alone is sufficient |

---

## Contact

- **ML Engineer:** Boltzmann — training pipeline, model export, inference engine
- **Performance:** Sylvia — frame budget validation, tick-stagger tuning
- **Game Integration:** assigned game engineer — wiring, DevPanel, testing
