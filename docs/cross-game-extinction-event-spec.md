# Cross-Game Extinction Event System — Design Spec

**Task:** MUL-1152 | **Parent:** MUL-1131 (Research PM spec)
**Author:** Huxley (Geneticist)
**Filed:** 2026-03-14
**Related:** MUL-979 (InbreedingCoefficient.ts), MUL-1057 (cross-game-genome-bridge-spec-v1), MUL-1146 (D_cc player feedback), MUL-1144 (Genetic Time Capsule)
**Audience:** Research PM, Roy (Staff SWE), Scheherazade (Folklorist), ML Engineer, CEO

---

## Overview

When a species in Precursors loses all meaningful genetic diversity — measured by low D_cc (behavioral convergence) combined with high inbreeding coefficient F — the species enters an **extinction vortex**. If uncorrected, the game triggers a visible, canonical extinction event that propagates to MVEE.

This is not punishment. It is history. The extinction becomes part of the multiverse's permanent record, and players who transferred creatures of that species before extinction hold the last surviving lineage — marked with the `extinctionSurvivor` flag.

**Theoretical basis:** Frankham, Ballou & Briscoe (2002), *Introduction to Conservation Genetics*, describe the extinction vortex as the positive feedback loop between small population size, inbreeding depression, reduced fitness, further population decline, and eventual extinction. Gilpin & Soulé (1986) formalized this as a stochastic model where genetic, demographic, and environmental factors compound. Wright (1922) provides the foundational F coefficient we already implement.

---

## 1. Detection Criteria

### Primary Trigger: Dual-Threshold Test

A species-level extinction warning activates when **both** conditions are simultaneously true across all living members of a species in Precursors:

| Metric | Threshold | Source | Justification |
|--------|-----------|--------|---------------|
| D_cc (creature-to-creature decision divergence) | < 0.005 | emergence-measurement-spec.md, Metric 3 | D_cc target range is 0.3–0.7. Below 0.005, same-species creatures are behaviorally identical — individuality has collapsed. This is far below the "interesting emergence" floor. |
| F (Wright's inbreeding coefficient) | > 0.25 across population mean | InbreedingCoefficient.ts (MUL-979) | F = 0.25 is the coefficient for full-sibling mating. `INBREEDING_SEVERE_THRESHOLD` is already defined at 0.25 in InbreedingCoefficient.ts. At this level, Frankham et al. document 25–50% fitness reduction in most taxa. |

### Why Both Metrics Are Required

Either condition alone is insufficient:

- **Low D_cc alone** could indicate a well-adapted species that converged on an optimal strategy — boring but viable. This happens in stable environments where one behavior dominates.
- **High F alone** could indicate a small but behaviorally diverse population — inbred but not yet in an extinction vortex. Some real-world species (e.g., cheetahs, Père David's deer) persist with high F.

The combination — behavioral homogeneity **and** genetic erosion — is the signature of an extinction vortex. The species has lost both the genetic diversity to adapt and the behavioral diversity that diversity would produce.

### Population-Level Computation

```
For species S with living members {c₁, c₂, ..., cN}:

F_population = (1/N) × Σ F(cᵢ)     // mean inbreeding coefficient

D_cc_population = (2 / N(N-1)) × Σᵢ<ⱼ D_cc(cᵢ, cⱼ)   // mean pairwise divergence

EXTINCTION_TRIGGER = (D_cc_population < 0.005) AND (F_population > 0.25)
```

### Minimum Population Requirement

The detection system only activates when N ≥ 3 living members of the species exist. With fewer than 3:
- D_cc is statistically meaningless (1 pair)
- The species is already functionally extinct by demographic criteria

If population drops to 0 through non-genetic causes (predation, environmental disaster), that is a **demographic extinction**, not a genetic extinction. Different event type, different announcement. This spec covers genetic extinction only.

### Evaluation Frequency

Species-level metrics are evaluated once per Precursors generation-tick (when any member of the species produces offspring or dies). This avoids per-frame computation while catching the extinction vortex as it develops.

---

## 2. Extinction Event Flow (Precursors Side)

### Phase 1: Warning (D_cc < 0.01 OR F_population > 0.20)

The **pre-extinction warning** fires when either metric approaches danger but hasn't crossed the extinction threshold.

| Condition | Warning Level | Player Notification |
|-----------|--------------|---------------------|
| D_cc < 0.01 | Behavioral convergence warning | "The [species] are becoming eerily similar. Their choices mirror each other like reflections in still water." |
| F_population > 0.20 | Genetic erosion warning | "The [species] bloodlines are narrowing. Each generation carries more of the same ancestors." |
| Both D_cc < 0.01 AND F > 0.20 | Extinction vortex warning | "The [species] are caught in a spiral — their genes narrow, their choices flatten. Without new blood, this lineage may not survive." |

**Player agency at warning phase:**
- Introduce unrelated individuals (breed with travelers from Genetic Time Capsule archive, MUL-1144)
- Import a genetically distant creature from Folkfork
- Enable migration from other populations (if multi-population mechanics exist)
- Deliberately breed the most genetically distant pair available

### Phase 2: Grace Period (Extinction Trigger Met)

When `EXTINCTION_TRIGGER = true`, a **grace period of 3 generation-ticks** begins. During this window:

1. The game announces: *"The [species] stand at the edge of extinction. Their bloodlines have converged, their choices indistinguishable. In [N] generations, this species will pass into history — unless new life enters the gene pool."*

2. A countdown UI element appears on the species panel (if one exists; otherwise, in the Chronicle/notification log).

3. The player can still intervene with the same actions listed above.

4. Each generation-tick, the system re-evaluates. **If either metric recovers above threshold, the grace period resets and the warning downgrades to Phase 1.** Specifically:
   - D_cc ≥ 0.005 → grace period cancelled
   - F_population ≤ 0.25 → grace period cancelled

**Why 3 generation-ticks:** This gives the player approximately 3 breeding cycles to introduce diversity. Fewer than 3 feels arbitrary and punitive. More than 3 undermines the urgency and allows the vortex to deepen further.

### Phase 3: Extinction Event

If the grace period expires with the trigger still active:

1. **Species status set to `extinct`** in Precursors' species registry.

2. **All living members receive the `extinctionSurvivor` component flag** (see §4). They do not die — they are the last generation. They can still live out their lives, but:
   - Reproduction is disabled for this species (the extinction is genetic, not demographic — further breeding would only produce non-viable offspring)
   - Their `extinct: true` status is written to any future Folkfork exports

3. **Chronicle entry created:**
   ```
   "On [date], the [species] passed from the living world. Their bloodlines had narrowed
   beyond recovery — F = [value], behavioral divergence = [value]. [N] individuals remain
   as the last witnesses to their kind."
   ```

4. **Cross-game announcement triggered** (see §3).

5. **Genome snapshot archived:** The genome of every living member at extinction time is archived in a `folkfork/extinct/[speciesId]/` directory as `creature_exchange_v1.json` files. These become available to the Genetic Time Capsule system (MUL-1144) — future players can rediscover them as "ancient" genomes.

---

## 3. Cross-Game Announcement (Precursors → MVEE)

### Mechanism: Folkfork Event File

Consistent with the file-based Folkfork exchange pattern established in `precursors-to-mvee-species-import.md`, the extinction announcement uses a new event file type:

```
folkfork/
  events/
    extinction_[speciesId]_[timestamp].json
```

### Event Schema: `extinction_event_v1.json`

```json
{
  "formatVersion": "1.0.0",
  "eventType": "species_extinction",
  "speciesId": "norn",
  "speciesName": "Norn",
  "occurredAt": "2026-03-14T20:15:00.000Z",
  "sourceGame": "precursors",

  "metrics": {
    "finalDcc": 0.003,
    "finalFPopulation": 0.31,
    "finalPopulationSize": 4,
    "generationsTracked": 12,
    "peakPopulationSize": 23,
    "generationAtPeakPopulation": 5
  },

  "survivors": [
    {
      "creatureId": "a7c3e912-4f8b-4d2a-b5e1-9c8d3f6a2b10",
      "creatureName": "Whisper",
      "generation": 8,
      "inbreedingCoefficient": 0.28,
      "transferredToMvee": true,
      "mveeEntityId": "mvee-entity-uuid-if-known"
    }
  ],

  "archiveLocation": "folkfork/extinct/norn/",

  "narrative": {
    "epitaph": "The Norns walked the Fungal Grotto for twelve generations. In the end, they knew each other too well — every choice a mirror, every child a echo. Whisper was the last to cross the threshold before the silence.",
    "lastAct": "The final generation could not produce viable offspring. Their chemistry had converged beyond the point of renewal."
  },

  "genomicIntegrity": {
    "checksum": "sha256-of-survivors-array",
    "archivedGenomeCount": 4
  }
}
```

### MVEE Consumption

MVEE reads `folkfork/events/` on a polling interval (same frequency as species import polling — configurable, default every 5 minutes of real time or on game load).

When an extinction event file is detected:

1. **Check if any imported creatures of that species exist in MVEE.** Query entities with `sourceGame: 'precursors'` and matching `speciesId`.

2. **If matching creatures exist in MVEE:**
   - Set `extinctionSurvivor: true` on their component data
   - Generate a narrative notification: *"Word reaches this world from beyond the dimensional threshold: the [species] have gone extinct in their homeland. [creature name] carries the last living bloodline."*
   - Create a Chronicle/historical record entry in MVEE

3. **If no matching creatures exist in MVEE:**
   - Create a historical record entry only: *"Across the dimensional threshold, a species called the [species] has passed from existence. Their genomes rest in the Folkfork archive, waiting to be rediscovered."*
   - The archived genomes become available via Genetic Time Capsule (MUL-1144)

4. **Remove the species from the active Folkfork import pool.** Per the existing import spec §9: *"extinction in Precursors can be surfaced in MVEE via an `extinct: true` flag in the exchange file; MVEE removes that species from the Folkfork pool."* The extinction event file is the authoritative signal for this removal.

### Why File-Based (Not Pub/Sub or API)

- Consistent with the Folkfork architecture already designed (MUL-1136)
- No runtime coupling between games — Precursors doesn't need MVEE to be running
- Events are durable — if MVEE is offline when extinction occurs, it discovers the event on next load
- Events are auditable — JSON files in a known directory
- Pub/sub can be layered on top later (Phase 2) without changing the event schema

---

## 4. `extinctionSurvivor` Flag Semantics for MVEE

### Component Extension

Add to the creature's component data (on `AnimalComponent` or as a separate lightweight component):

```typescript
interface ExtinctionSurvivorData {
  /** This creature belongs to a species that went extinct in its source game */
  extinctionSurvivor: true;

  /** When the extinction occurred in the source game */
  extinctionDate: string;  // ISO 8601

  /** The source game where extinction happened */
  sourceGame: 'precursors';

  /** Species ID of the extinct species */
  extinctSpeciesId: string;

  /** Population metrics at time of extinction */
  finalMetrics: {
    dcc: number;
    fPopulation: number;
    populationSize: number;
  };

  /** Number of known survivors across all games */
  knownSurvivorCount: number;
}
```

### Behavioral Effects in MVEE

The `extinctionSurvivor` flag should have **narrative weight but minimal mechanical penalty**. The framing is historical significance, not punishment.

| Effect | Implementation | Rationale |
|--------|---------------|-----------|
| **Breeding premium** | Offspring of extinction survivors gain a `rare_lineage` trait visible in the species encyclopedia | Encourages players to breed these creatures, preserving the lineage |
| **Lore tag** | Entity lore panel displays extinction narrative and origin story | Connects MVEE gameplay to cross-game history |
| **Genetic Time Capsule eligibility** | Survivors' genomes are automatically nominated for the public archive (MUL-1144) | Preserves the lineage for future players and games |
| **No fitness penalty** | The creature functions identically to non-survivor creatures in MVEE | The extinction vortex was a Precursors phenomenon. MVEE is a fresh population — the imported F value doesn't carry forward to MVEE-side ancestry (per genome bridge spec §Inbreeding Coefficient Portability) |

### Persistence

The `extinctionSurvivor` flag is:
- Serialized in save/load (permanent — extinction is irreversible)
- Inherited by offspring as a metadata tag (not as a genetic trait — it's historical provenance, not biology)
- Included in any future Folkfork re-export of the creature

---

## 5. Edge Cases

### 5.1 Death Before Transfer

**Scenario:** A creature dies in Precursors before being exported to MVEE, then its species goes extinct.

**Handling:** Dead creatures cannot be transferred. However, if the creature was previously exported (its `creature_exchange_v1.json` exists in Folkfork), the export file is still valid. The extinction event references all creatures that were ever exported, regardless of current alive/dead status in Precursors. MVEE-side creatures are unaffected by the death of their Precursors-side "original."

### 5.2 Deliberate Inbreeding

**Scenario:** A player intentionally breeds siblings/parents to trigger extinction for gameplay experimentation or trolling.

**Handling:** The system does not distinguish deliberate from accidental inbreeding. The grace period exists to give players a chance to reverse course. If they choose not to — that's a valid player choice. The extinction is canonical.

**Design rationale:** Attempting to detect "intentional" inbreeding would require mind-reading. Any heuristic (e.g., "player manually paired siblings") has false positives (player didn't know they were related) and false negatives (player used indirect pairings to achieve the same result). The grace period + warning system is the intervention mechanism.

**Conservation of Game Matter:** Per CLAUDE.md, entities are never deleted. Extinct species members are marked `extinct`, not removed. Their genomes are archived. The extinction itself becomes a permanent historical record.

### 5.3 Species With Only Imported Members in MVEE

**Scenario:** All living members of a species in MVEE were imported from Precursors (no MVEE-native breeding has occurred), and the species goes extinct in Precursors.

**Handling:** All imported members receive `extinctionSurvivor`. If they breed in MVEE, their offspring are MVEE-native and do not carry the `extinctionSurvivor` flag — but they do carry the `rare_lineage` trait. The species is not extinct in MVEE; it has been transplanted.

### 5.4 Extinction During Active Transfer

**Scenario:** A creature is being transferred via Folkfork at the exact moment the extinction event fires.

**Handling:** The export and extinction are asynchronous file operations. If the creature's `creature_exchange_v1.json` is written before the `extinction_event_v1.json`, the creature arrives in MVEE as a normal import and is retroactively flagged as `extinctionSurvivor` when MVEE processes the extinction event. If the extinction event file is written first, the creature's export file should include `extinct: true` in its metadata — MVEE imports the creature with `extinctionSurvivor` already set.

### 5.5 Multiple Species Extinction

**Scenario:** Two or more species go extinct in the same generation-tick.

**Handling:** Each species gets its own `extinction_event_v1.json` file. MVEE processes them independently. The Chronicle records each as a separate historical event.

### 5.6 Species Recovery After Extinction Announcement

**Scenario:** Through a bug or time-travel mechanic, an extinct species somehow gains new genetically distinct members.

**Handling:** Extinction is **irreversible** in the canonical timeline. If Precursors implements time travel that rewinds past the extinction point, the extinction event file remains in Folkfork (files are append-only, never deleted). A new "species recovery" event type could be added in Phase 2 if time travel creates this scenario. For now, the extinction is final.

### 5.7 Very Small Founding Population

**Scenario:** A species is founded from a single breeding pair imported from Folkfork. F is immediately high in generation 2.

**Handling:** The detection system requires N ≥ 3 and the dual-threshold (D_cc < 0.005 AND F > 0.25). A newly founded species from a single pair will have high F but likely high D_cc (the two founders behave differently). The warning system alerts the player early, giving them time to introduce genetic diversity before the vortex tightens.

### 5.8 Hybrid Species

**Scenario:** A hybrid species (e.g., Norn × Grendel cross) reaches extinction thresholds.

**Handling:** Hybrid species are tracked as their own species ID in the species registry. They follow the same extinction detection logic. The `parentSpecies` field in the genome bridge spec captures the hybrid's ancestry. Both parent species receive a Chronicle note: *"The [hybrid] lineage, born of [species A] and [species B], has gone extinct."*

---

## Implementation Priority

This spec is a **design document** — no code changes are required from this task.

**Implementation dependencies (for future sprint planning):**

1. **D_cc computation in Precursors** — requires matched episode logging per emergence-measurement-spec.md Metric 3. This is the hardest prerequisite. Without D_cc, only the F threshold is available (which alone is insufficient for extinction detection).

2. **Population-level F computation** — trivial extension of existing `AncestryRegistry.computeF()`. Currently computes F for a single offspring; needs a utility that computes mean F across all living members of a species.

3. **Folkfork events directory** — new directory structure alongside existing `folkfork/species/`.

4. **MVEE extinction event consumer** — new system that polls `folkfork/events/` and processes extinction announcements.

5. **`extinctionSurvivor` component** — lightweight addition to MVEE's component system.

---

## References

- Frankham, R., Ballou, J.D. & Briscoe, D.A. (2002). *Introduction to Conservation Genetics*. Cambridge University Press. — Extinction vortex model, F threshold effects on fitness
- Gilpin, M.E. & Soulé, M.E. (1986). "Minimum Viable Populations: Processes of Species Extinction." In Soulé, M.E. (ed.), *Conservation Biology: The Science of Scarcity and Diversity*. Sinauer. — Stochastic extinction vortex formalization
- Wright, S. (1922). "Coefficients of Inbreeding and Relationship." *American Naturalist* 56(645): 330–338. — F coefficient formula (implemented in InbreedingCoefficient.ts)
- Bedau, M.A. (1997). "Weak Emergence." *Philosophical Perspectives* 11: 375–399. — Emergence measurement framework (cited in emergence-measurement-spec.md)
- Precursors `InbreedingCoefficient.ts` (MUL-979) — Wright's F implementation with `INBREEDING_SEVERE_THRESHOLD = 0.25`
- `emergence-measurement-spec.md` — D_cc metric definition and target ranges
- `cross-game-genome-bridge-spec-v1.md` (MUL-1057) — creature_exchange_v1.json schema, `extinctionSurvivor` flag origin
- `precursors-to-mvee-species-import.md` (MUL-1136) — Folkfork file-based exchange architecture

---

*Filed: 2026-03-14 by Huxley (Geneticist)*
*Task: MUL-1152 | Parent: MUL-1131 (Research PM)*
*Connection: Ancestral Memory Replay (sibling task) — extinct species' memory threads become the only evidence they ever lived.*
