# Cross-Game Creature Migration Genetics — Encoding Transfer Spec

**Task:** MUL-1283 | **Parent:** MUL-1245 (Sprint 5 cross-game migration)
**Author:** Huxley (Geneticist)
**Filed:** 2026-03-15
**Related:** MUL-1144 (Genetic Time Capsule), MUL-1152 (Cross-Game Extinction Event), MUL-1136 (Folkfork architecture), MUL-1057 (cross-game-genome-bridge-spec-v1)
**Audience:** Research PM, Roy (Staff SWE), Scheherazade (Folklorist), ML Engineer, CEO

---

## Overview

When a creature migrates from Precursors to MVEE (or vice versa), its genome must be translated between two fundamentally different encoding systems. This spec defines the **genome compatibility layer** — what transfers losslessly, what is lossy, how traits re-express in new environments, how genetic drift accumulates post-migration, and how the Folkfork archive (MUL-1144) serves as the canonical genome store during transit.

**The core tension:** Precursors encodes genetics as a flat array of `MinViableGene` objects (category-tagged, 0–1 normalized, with heritability metadata). MVEE encodes genetics as 9 allele-pair `GeneticTrait` structs (0–100 range, Mendelian inheritance with dominant/recessive alleles). These are not just different scales — they represent different *models of heredity*. Precursors uses a quantitative genetics model (continuous trait values with heritability coefficients). MVEE uses a Mendelian model (discrete alleles with expression = mean of pair). The compatibility layer must bridge this conceptual gap without destroying the information that makes each system interesting.

**Biological grounding:** This is analogous to the problem of comparing quantitative trait loci (QTL) data across species with different ploidy levels or linkage maps. Falconer & Mackay (1996), *Introduction to Quantitative Genetics*, describe the relationship between narrow-sense heritability (h²) and additive genetic variance — which is precisely the bridge between Precursors' heritability coefficients and MVEE's allele-based expression. The translation is lossy in the same way that converting a continuous probability distribution to a discrete sample is lossy: information about the distribution shape is lost, but the mean and variance can be preserved.

---

## 1. Genome Compatibility Layer

### 1.1 Encoding Comparison

| Property | Precursors (`MinViableGene`) | MVEE (`AnimalGenetics`) |
|----------|------------------------------|-------------------------|
| **Trait count** | Variable (typically 6–20 per species) | Fixed 9 traits |
| **Value range** | 0.0–1.0 (continuous) | 0–100 per allele (integer-like) |
| **Inheritance model** | Heritability coefficient (h², 0–1) | Mendelian allele pairs (allele1, allele2 → expression) |
| **Categories** | morphological, behavioral, metabolic, cognitive, social, sensory | Physical (5), Behavioral (3), Cosmetic (1) |
| **Mutations** | Not explicitly modeled at gene level | `AnimalMutation` with effect, inheritChance |
| **Personality** | Emergent from behavioral genes | Separate `AnimalPersonality` 4D vector |
| **Visual** | `VisualTokens` (HSL color, bodyPlan, pattern) | `colorVariant` GeneticTrait + species sprite |

### 1.2 Trait Field Mapping: Precursors → MVEE

The mapping is **many-to-few**. Precursors' variable-length `minViableGenes` array must compress into MVEE's fixed 9-trait `AnimalGenetics`. The mapping uses the gene `category` and `traitId` to route each Precursors gene to the correct MVEE trait.

#### Primary Mapping Table

| MVEE Trait | Precursors Source | Mapping Function | Lossiness |
|------------|-------------------|------------------|-----------|
| `size` | morphological gene with traitId containing "size", "mass", or "bulk" | `value × 100` → allele1; `value × 100 ± heritability_variance` → allele2 | **Lossless** (direct physical analog) |
| `strength` | morphological gene with traitId containing "strength", "force", or "muscle" | Same scaling | **Lossless** |
| `speed` | morphological gene with traitId containing "speed", "agility", or "locomotion" | Same scaling | **Lossless** |
| `health` | metabolic gene with traitId containing "health", "vitality", or "resilience" | Same scaling | **Lossless** |
| `lifespan` | metabolic gene with traitId containing "lifespan", "longevity", or "aging" | Same scaling | **Lossless** |
| `temperament` | behavioral gene with traitId containing "temperament", "aggression", or "disposition" | Same scaling | **Low loss** — Precursors behavioral model may be richer |
| `intelligence` | cognitive gene with highest value | Same scaling | **Medium loss** — Precursors may have multiple cognitive genes collapsed to one |
| `trainability` | social gene with traitId containing "trainability", "learning", or "adaptability"; fallback to cognitive secondary gene | Same scaling | **Medium loss** |
| `colorVariant` | Derived from `visualTokens.baseHue` | `(baseHue / 360) × 100` | **Low loss** — hue is continuous, colorVariant is coarse |

#### Allele Reconstruction from Precursors Value + Heritability

Precursors stores a single `value` (0–1) and a `heritability` (0–1). MVEE needs two alleles whose mean equals the expression. The reconstruction uses heritability as a proxy for allelic divergence:

```
function reconstructAlleles(value: number, heritability: number): { allele1: number, allele2: number, expression: number } {
  const expression = value * 100;  // Scale 0–1 → 0–100

  // Heritability indicates how much genetic variance exists.
  // High heritability (h² → 1) = alleles are similar (strong genetic signal).
  // Low heritability (h² → 0) = alleles diverge (environmental noise dominates).
  //
  // We model this as: allele divergence = (1 - heritability) * MAX_DIVERGENCE
  // where MAX_DIVERGENCE is capped at 20 (matching MVEE's ±20 generation variance).

  const MAX_DIVERGENCE = 20;
  const divergence = (1 - heritability) * MAX_DIVERGENCE;

  // Split expression into two alleles symmetric around the mean,
  // offset by half the divergence
  const allele1 = clamp(expression + divergence / 2, 0, 100);
  const allele2 = clamp(expression - divergence / 2, 0, 100);

  return {
    allele1: Math.round(allele1),
    allele2: Math.round(allele2),
    expression: (allele1 + allele2) / 2  // Will be ≈ expression due to clamping
  };
}
```

**Justification:** This preserves the two critical properties: (1) the phenotypic value (expression ≈ value × 100), and (2) the heritability signal — high-heritability genes produce homozygous-like allele pairs (both alleles close to expression), while low-heritability genes produce heterozygous-like pairs (alleles diverge). When this creature breeds in MVEE, the Mendelian inheritance system will naturally produce offspring variance proportional to the original heritability — allele pairs with high divergence produce more variable offspring.

#### Missing Gene Fallback

If a Precursors genome lacks a gene that maps to a required MVEE trait (e.g., no "speed" gene in `minViableGenes`), the importer generates a **species-typical default** using `generateAnimalGenetics()` for that single trait slot. The creature's lore records: *"This trait found no analog in [creature]'s homeland — it emerged anew in this world."*

### 1.3 Trait Field Mapping: MVEE → Precursors

The reverse mapping is **few-to-many**. MVEE's 9 fixed traits must expand into Precursors' category-tagged gene array. This is straightforward because every MVEE trait has a clear Precursors category.

| MVEE Trait | Precursors Category | Generated `traitId` | Value | Heritability |
|------------|---------------------|---------------------|-------|-------------|
| `size` | morphological | `mvee_size` | `expression / 100` | `1 - (abs(allele1 - allele2) / MAX_DIVERGENCE)`, clamped 0–1 |
| `strength` | morphological | `mvee_strength` | Same | Same |
| `speed` | morphological | `mvee_speed` | Same | Same |
| `health` | metabolic | `mvee_health` | Same | Same |
| `lifespan` | metabolic | `mvee_lifespan` | Same | Same |
| `temperament` | behavioral | `mvee_temperament` | Same | Same |
| `intelligence` | cognitive | `mvee_intelligence` | Same | Same |
| `trainability` | social | `mvee_trainability` | Same | Same |
| `colorVariant` | sensory | `mvee_color_variant` | Same | Same |

Additionally, MVEE's `AnimalPersonality` (fearfulness, aggressiveness, curiosity, sociability) is exported as 4 additional behavioral genes:

| Personality Dimension | Precursors `traitId` | Category | Value | Heritability |
|----------------------|---------------------|----------|-------|-------------|
| `fearfulness` | `mvee_fearfulness` | behavioral | direct (already 0–1) | 0.5 (personality is partially heritable, partially environmental) |
| `aggressiveness` | `mvee_aggressiveness` | behavioral | direct | 0.5 |
| `curiosity` | `mvee_curiosity` | behavioral | direct | 0.5 |
| `sociability` | `mvee_sociability` | social | direct | 0.5 |

**Why h² = 0.5 for personality:** MVEE personality is generated with ±20% variance from species baseline (`generateAnimalPersonality`). This represents roughly equal genetic and environmental contributions — a heritability of ~0.5, consistent with meta-analyses of animal personality heritability (Réale et al. 2007, *Animal Behaviour*).

### 1.4 Loss Declaration

Every migration produces a `lossDeclaration` object documenting what was lost in translation:

```typescript
interface MigrationLossDeclaration {
  /** Traits that transferred with full fidelity */
  lossless: string[];

  /** Traits that transferred with reduced precision */
  lossy: Array<{
    traitId: string;
    reason: string;
    originalValue: number;
    transferredValue: number;
    informationLoss: number;  // 0–1, estimated fraction of information lost
  }>;

  /** Precursors genes that have no MVEE equivalent (dropped at boundary) */
  discarded: Array<{
    traitId: string;
    category: string;
    reason: string;
  }>;

  /** MVEE traits generated from defaults (no Precursors source) */
  synthesized: string[];

  /** Human-readable summary for lore panels */
  narrative: string;
  // e.g., "3 traits crossed intact. 2 traits shifted in translation.
  //  The creature's pheromone sensitivity found no expression in this new world —
  //  that knowledge stayed behind."
}
```

### 1.5 Folkfork Archive as Canonical Genome Store

The `creature_exchange_v1.json` format (wrapped by `genome_capsule_v1.json` per MUL-1144) serves as the **canonical intermediate representation** during migration. Neither game's native encoding is authoritative during transit — the Folkfork archive is.

```
Migration flow:

  Precursors native genome
       ↓
  [EXPORT] Precursors → creature_exchange_v1.json
       ↓
  Folkfork archive (canonical store)
       ↓
  [IMPORT] creature_exchange_v1.json → MVEE native genome
       ↓
  MVEE AnimalGenetics + AnimalPersonality
```

The 20-trait portable genome in `creature_exchange_v1.json` is a **superset** of both games' trait systems. It includes all Precursors `minViableGenes` plus derived personality/visual fields. On import to either game, the receiving game extracts the traits it understands and generates defaults for any gaps.

**Integrity guarantee:** The SHA-256 checksums in the exchange format (per MUL-1144 §5) verify that the genome has not been modified during transit. If a checksum fails at import time, the creature is not imported — the migration is aborted and logged.

---

## 2. Trait Re-expression in New Environments

### 2.1 The Problem

A desert-adapted Precursors creature with high heat tolerance, low water requirement, and sand-colored camouflage arrives in an MVEE space habitat with artificial gravity, recycled atmosphere, and no sand. What happens to its traits?

**Answer:** Traits are either **environment-relative** (their meaning depends on context — they need rescaling) or **absolute** (they measure an intrinsic property — they transfer directly).

### 2.2 Trait Classification

| Trait Type | Definition | Examples | Transfer Rule |
|-----------|-----------|----------|---------------|
| **Absolute** | Measures an intrinsic biological property independent of environment | size, strength, intelligence, lifespan, colorVariant | Transfer directly. A large creature is large in any world. |
| **Environment-relative** | Measures fitness relative to a specific environmental pressure | speed (terrain-dependent), health (disease-pressure-dependent), temperament (predator-pressure-dependent) | Rescale via normalization function. |

### 2.3 Normalization Function: `precursors_trait → mvee_param`

```typescript
/**
 * Normalize a Precursors trait value for MVEE environmental context.
 *
 * Absolute traits pass through unchanged.
 * Environment-relative traits are rescaled using a sigmoid centered
 * on the MVEE environment's baseline expectation for that trait.
 *
 * The sigmoid preserves rank ordering (a creature that was "fast"
 * in Precursors is still "fast" in MVEE) while compressing extremes
 * (a creature adapted to 3× Earth gravity doesn't become impossibly
 * fast in 1× gravity — it becomes notably fast with diminishing returns).
 */
function normalizeTraitForEnvironment(
  value: number,           // 0–1 Precursors trait value
  traitType: 'absolute' | 'environment_relative',
  sourceEnvFactor: number, // Environmental pressure in source (0–1, 1 = extreme)
  targetEnvFactor: number  // Environmental pressure in MVEE target (0–1)
): number {
  if (traitType === 'absolute') {
    return value;  // No transformation
  }

  // Environment-relative normalization:
  // A creature adapted to high environmental pressure (sourceEnvFactor → 1)
  // arriving in low pressure (targetEnvFactor → 0) gets a boost,
  // but with sigmoid compression to prevent absurd outliers.

  const pressureDelta = sourceEnvFactor - targetEnvFactor;
  const adjustedValue = value + pressureDelta * 0.3;  // 30% of pressure delta transfers as trait bonus/penalty

  // Sigmoid compression: keeps values in (0, 1) with soft saturation at extremes
  const k = 8;  // Steepness — higher = sharper cutoff at extremes
  const normalized = 1 / (1 + Math.exp(-k * (adjustedValue - 0.5)));

  return normalized;
}
```

### 2.4 Environment Factor Mapping

Each MVEE biome/habitat has environmental pressure factors that determine how Precursors traits re-express:

| MVEE Environment | `gravity` | `temperature_pressure` | `predator_pressure` | `resource_scarcity` |
|-----------------|-----------|----------------------|--------------------|--------------------|
| Temperate planet | 0.5 | 0.3 | 0.5 | 0.3 |
| Desert planet | 0.5 | 0.9 | 0.3 | 0.8 |
| Space habitat | 0.2 | 0.1 | 0.1 | 0.2 |
| Ocean world | 0.5 | 0.4 | 0.7 | 0.4 |
| Toxic world | 0.5 | 0.7 | 0.2 | 0.9 |

Precursors biomes export similar factors in the exchange metadata. The normalization function uses the delta between source and target.

### 2.5 Re-expression Examples

**Desert creature → Space habitat:**
- `speed` (environment-relative): Source desert has `gravity = 0.5`, target space has `gravity = 0.2`. Creature evolved for sand locomotion; in low-g, its muscles over-perform → speed gets a modest boost (+0.09 from pressure delta). Sigmoid prevents it from becoming absurdly fast.
- `health` (environment-relative): Desert creature had high heat tolerance (high source `temperature_pressure = 0.9`); space habitat is climate-controlled (`temperature_pressure = 0.1`). The creature's heat adaptations are irrelevant but not harmful → health stays roughly neutral (pressure delta is large but the 30% transfer factor keeps the adjustment moderate).
- `size` (absolute): Transfers directly. A 0.8 size creature is 0.8 in any world.
- `intelligence` (absolute): Transfers directly.

**Ocean creature → Desert planet:**
- `speed` (environment-relative): Aquatic locomotion in terrestrial desert → significant penalty. Source `gravity = 0.5` is same, but `resource_scarcity` jumps from 0.4 → 0.8 → stress reduces effective speed.
- `health` (environment-relative): Water-adapted metabolism in arid environment → health penalty from `temperature_pressure` delta.

### 2.6 Personality Re-expression

Personality dimensions are **absolute** — fearfulness, aggressiveness, curiosity, and sociability are intrinsic behavioral dispositions, not environmental adaptations. A fearful creature is fearful in any world.

However, a creature's *expressed behavior* will differ because MVEE's behavioral systems respond to environmental stimuli differently than Precursors'. A curious creature in a dangerous environment will still explore, but MVEE's threat-response system may override curiosity more often than Precursors' would. This is emergent from the simulation, not from the migration — no genetic adjustment needed.

---

## 3. Genetic Drift Post-Migration

### 3.1 Drift Model

After a Precursors creature arrives in MVEE and begins breeding, its lineage diverges from its Precursors ancestor through three mechanisms:

1. **Mendelian recombination:** MVEE's allele-pair system shuffles alleles each generation. The imported creature has specific allele1/allele2 values reconstructed from Precursors' continuous traits (§1.2). As it breeds, Mendelian segregation redistributes these alleles among offspring, creating variance that didn't exist in Precursors' quantitative model.

2. **MVEE mutation pressure:** MVEE's 2% per-trait mutation rate (per `inheritAnimalGenetics`) introduces new allelic variation each generation. Over N generations, the expected number of new mutations per trait is `1 - (1 - 0.02)^N`, which reaches 50% probability by generation 34.

3. **Environmental selection:** MVEE's survival systems (hunger, thirst, predation, stress) select for traits suited to the MVEE environment, which may differ from Precursors' selection pressures. Over generations, the lineage drifts toward MVEE-optimal trait distributions.

### 3.2 Divergence Measurement

To quantify how much a migrated lineage has diverged from its Precursors ancestor, we define a **Genetic Distance Index (GDI)**:

```
GDI(ancestor, descendant) = 1 - cosine_similarity(ancestor_traits, descendant_traits)
```

Where `ancestor_traits` is the 9-dimensional vector of the original imported creature's trait expressions, and `descendant_traits` is the current creature's trait expressions, both normalized to [0, 1].

| GDI Range | Interpretation |
|-----------|---------------|
| 0.00–0.05 | Minimal drift — descendant is genetically near-identical to ancestor |
| 0.05–0.15 | Moderate drift — recognizably the same species, with local adaptation |
| 0.15–0.30 | Significant drift — a distinct population is forming |
| 0.30–0.50 | Major divergence — approaching subspecies-level differentiation |
| > 0.50 | Extreme divergence — the lineage has effectively become a new species in MVEE |

### 3.3 Expected Drift Timeline

Based on MVEE's mutation rate (2% per trait per generation) and allele recombination:

| Generations in MVEE | Expected Mean GDI | Biological Analog |
|---------------------|-------------------|-------------------|
| 1–3 | 0.01–0.03 | Siblings within a family |
| 5–10 | 0.05–0.10 | Geographic subspecies (e.g., mainland vs. island populations) |
| 15–25 | 0.10–0.20 | Domestication-level divergence (e.g., wolf → early dog) |
| 30–50 | 0.15–0.35 | Distinct ecotype or breed |
| 50+ | 0.25–0.50+ | Approaching speciation threshold |

These estimates assume no selective breeding by the player. Deliberate selection (breeding for extreme traits) accelerates drift. Random mating slows it. Small population sizes (N < 10) accelerate drift through genetic founder effects — consistent with Wright's (1931) demonstration that drift rate is inversely proportional to effective population size.

### 3.4 Folkfork Repatriation: Can Descendants Return to Precursors?

**Yes, with the same translation layer applied in reverse.** A creature born in MVEE — even one descended from a Precursors immigrant — can be exported back to Precursors via the `creature_exchange_v1.json` format using the MVEE → Precursors mapping (§1.3).

#### Repatriation Constraints

| Constraint | Handling |
|-----------|---------|
| **Double translation loss** | Each crossing of the game boundary incurs translation loss (§1.4). A creature that migrates Precursors → MVEE → Precursors will not be genetically identical to its original ancestor. The `lossDeclaration` from each crossing is cumulative. |
| **Drift accumulation** | The repatriated creature carries N generations of MVEE drift. Its Precursors genome will differ from the ancestor's by the GDI accumulated during its MVEE residency. |
| **New MVEE-only traits** | MVEE mutations may have created alleles with no Precursors analog. These are exported as new `minViableGenes` with `traitId` prefixed `mvee_` (see §1.3 table). Precursors must decide whether to express or ignore these foreign genes. |
| **Folkfork capsule provenance** | The repatriated creature's capsule includes `provenance.sourceGame: 'mvee'` and a `migrationHistory` array tracking each game-boundary crossing with timestamps and GDI values. |

#### Ancestor Comparison

The Folkfork archive preserves the original ancestor's genome (either as a `genome_capsule_v1.json` or the original `creature_exchange_v1.json` from the initial migration). When a descendant is repatriated, the system can compute:

```
ancestorGDI = GDI(originalCapsule.genome.traits, repatriatedCreature.genome.traits)
```

This value is displayed in the creature's lore:
- GDI < 0.10: *"[Creature] returns to the land of its ancestors, barely changed by its sojourn across the threshold."*
- GDI 0.10–0.30: *"[Creature] carries the marks of another world. Its ancestors would recognize it, but not as one of their own."*
- GDI > 0.30: *"[Creature] has been shaped by forces its ancestors never knew. It returns not as kin, but as a stranger bearing a familiar name."*

---

## 4. Extinction Event Trigger for Migrated Species

### 4.1 Cross-Game Extinction Propagation

If a species that has migrated to MVEE goes extinct in Precursors (per MUL-1152), MVEE receives the `extinction_event_v1.json` and flags surviving imported members as `extinctionSurvivor` (per MUL-1152 §4). The genetics spec does not alter this flow — it is already well-defined.

This section addresses the **reverse case** and the **connected case**.

### 4.2 Reverse Case: MVEE Extinction → Precursors Notification

If a migrated species establishes a population in MVEE and then goes extinct there (through demographic collapse, environmental catastrophe, or genetic extinction vortex), MVEE emits its own `extinction_event_v1.json` to `folkfork/events/`:

```json
{
  "formatVersion": "1.0.0",
  "eventType": "species_extinction",
  "speciesId": "norn_mvee_lineage",
  "speciesName": "Norn (MVEE Lineage)",
  "occurredAt": "2026-06-15T14:30:00.000Z",
  "sourceGame": "mvee",

  "metrics": {
    "finalPopulationSize": 2,
    "generationsInMvee": 18,
    "finalGDI": 0.22,
    "ancestorSpeciesId": "norn",
    "ancestorSourceGame": "precursors"
  },

  "genomicIntegrity": {
    "checksum": "sha256-of-survivors",
    "archivedGenomeCount": 2
  },

  "narrative": {
    "epitaph": "The Norn lineage that crossed from Precursors survived 18 generations in the space habitat before the population collapsed. They had drifted 22% from their ancestors — neither the creatures they had been, nor fully creatures of this world.",
    "lastAct": "The final two individuals were too closely related to produce viable offspring. The bloodline, already narrowed by the crossing, could not sustain itself."
  }
}
```

Precursors consumes this event and generates a Chronicle/lore entry: *"Word arrives from beyond the threshold: the [species] colony that departed [N] generations ago has perished in the other world. Their line endured [M] generations there before the end."*

### 4.3 Connected Extinction: Both Games

If a species goes extinct in **both** Precursors and MVEE (in any order), the Folkfork archive becomes the **only surviving genetic record**. The Time Capsule system (MUL-1144) elevates all capsules for that species to `Last Record` status in both games. The extinction events reference each other via `relatedExtinctionEvents` array.

### 4.4 Inter-Game Event Bus Message Format

All cross-game events use the same file-based mechanism established in MUL-1152 and MUL-1136. The event schema is extended with migration-specific fields:

```typescript
interface MigrationExtinctionEvent extends ExtinctionEventV1 {
  /** Present when the extinct lineage was a migrated population */
  migrationContext?: {
    /** Original species ID in the source game */
    ancestorSpeciesId: string;
    /** Game where the species originated */
    ancestorSourceGame: 'precursors' | 'mvee';
    /** How many generations the lineage survived post-migration */
    generationsPostMigration: number;
    /** Genetic distance from ancestor at time of extinction */
    finalGDI: number;
    /** Whether the ancestor species is still alive in the source game */
    ancestorSpeciesStatus: 'extant' | 'endangered' | 'extinct';
    /** Related extinction events (if ancestor also went extinct) */
    relatedExtinctionEvents: string[];  // File paths to other extinction_event_v1.json files
  };
}
```

**Why extend rather than create a new event type:** The extinction detection machinery (MUL-1152) already handles `extinction_event_v1.json` files. Adding optional migration context preserves backward compatibility — a consumer that doesn't understand `migrationContext` simply treats it as a normal extinction. A consumer that does understand it can enrich the narrative with cross-game provenance.

---

## 5. Implementation Considerations

### 5.1 `CreatureImportFactory` Updates

The existing `CreatureImportFactory` (referenced in MUL-1057) needs these additions for migration genetics:

1. **`reconstructAlleles(value, heritability)`** — Converts Precursors continuous traits to MVEE allele pairs (§1.2)
2. **`normalizeTraitForEnvironment(value, type, sourceEnv, targetEnv)`** — Environmental re-expression (§2.3)
3. **`computeGDI(ancestor, descendant)`** — Genetic distance measurement (§3.2)
4. **`generateLossDeclaration(sourceGenome, targetGenome)`** — Documents translation losses (§1.4)

### 5.2 Data Integrity

All trait values are clamped to their valid ranges at both export and import boundaries:
- Precursors values: clamped to [0, 1]
- MVEE alleles: clamped to [0, 100]
- MVEE expression: recomputed as `(allele1 + allele2) / 2` after clamping
- Heritability: clamped to [0, 1]
- GDI: naturally bounded [0, 1] by cosine similarity properties

### 5.3 Mutation Portability

Precursors does not have an explicit mutation system. MVEE's `AnimalMutation` objects are **not portable** — they are discarded at the export boundary. The mutation's *effect* on trait expression is captured in the allele values (which already include mutation modifiers), but the mutation metadata (inheritChance, beneficial flag) is lost.

When a Precursors creature arrives in MVEE, it arrives with an empty `mutations: []` array. Any mutations it acquires are MVEE-native and follow MVEE's inheritance rules.

If an MVEE creature with mutations is exported back to Precursors, the mutations are baked into the `value` field of each exported gene (the expression already includes mutation effects) but the discrete mutation objects are not preserved.

This is an acceptable loss. Mutations are a game-specific mechanic — their effects persist through trait values, but their identity (which specific mutation caused the change) is local to the game that generated them.

---

## References

- Falconer, D.S. & Mackay, T.F.C. (1996). *Introduction to Quantitative Genetics*. 4th ed. Longman. — Heritability, additive genetic variance, QTL mapping across populations
- Wright, S. (1931). "Evolution in Mendelian Populations." *Genetics* 16(2): 97–159. — Genetic drift rate as function of effective population size
- Réale, D., Reader, S.M., Sol, D., McDougall, P.T. & Dingemanse, N.J. (2007). "Integrating animal temperament within ecology and evolution." *Biological Reviews* 82(2): 291–318. — Heritability estimates for animal personality dimensions (~0.2–0.5)
- Frankham, R., Ballou, J.D. & Briscoe, D.A. (2002). *Introduction to Conservation Genetics*. Cambridge University Press. — Founder effects, genetic drift in small populations
- Grand, S. (2000). *Creation: Life and How to Make It*. Harvard University Press. — Creatures biochemistry heritage
- `cross-game-extinction-event-spec.md` (MUL-1152) — Extinction detection, `extinctionSurvivor` flag, event schema
- `genetic-time-capsule-spec.md` (MUL-1144) — Folkfork archive as canonical genome store, capsule integrity verification
- `precursors-to-mvee-species-import.md` (MUL-1136) — Species-level import pipeline, `AlienSpeciesImporter`, gap analysis
- `AnimalComponent.ts` — MVEE's 9-trait `AnimalGenetics`, allele pair model, `inheritAnimalGenetics()`, mutation system
- `InbreedingCoefficient.ts` (MUL-979) — Wright's F coefficient implementation

---

*Filed: 2026-03-15 by Huxley (Geneticist)*
*Task: MUL-1283 | Parent: MUL-1245 (Sprint 5 cross-game migration)*
*The genome is a letter written in one language, translated into another. Some meaning survives. Some is born anew. The original remains in the archive, waiting to be read again.*
