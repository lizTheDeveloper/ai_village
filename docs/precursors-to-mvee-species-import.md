# Precursors → MVEE Species Import Pipeline

**Status:** Architecture Design
**Author:** MVEE Tech Lead
**Date:** 2026-03-14
**Related:** MUL-1136, MUL-1022, MUL-1121

---

## Vision

Rather than generating alien species entirely from LLM prompts, MVEE planets can be populated with species that originated in Precursors — evolved by real players, then migrating into the MVEE multiverse via the Folkfork pipeline.

This creates a living cross-game connection: species evolve in Precursors, travel via Folkfork, and arrive as fully-formed aliens on MVEE planets. The LLM generator (`AlienSpeciesGenerator`) remains as a fallback for offline/empty Folkfork scenarios — this is graceful degradation, not a hard dependency.

---

## 1. Import Contract: File-Based Folkfork Exchange

**Recommendation: file-based exchange via shared `folkfork/species/` directory.**

Rationale: HTTP API requires a running Precursors instance (coupling, uptime dependency). Static JSON files decouple the games — Precursors exports on its own schedule, MVEE reads on its own schedule. This matches how real cross-game pipelines work (asset bundles, save exports).

### Directory Layout

```
folkfork/
  species/
    <speciesId>.json         # one file per exportable species
    <speciesId>.json
    ...
  manifest.json              # optional: index of available species + checksums
```

The directory location is configurable — default `folkfork/species/` relative to the MVEE working directory, overridable via `FOLKFORK_SPECIES_DIR` env var or game config.

Each file is a `species_exchange_v0.json` object (schema confirmed below in §3).

### Precursors Export Trigger

Precursors writes a species file to `folkfork/species/` when:
- A species reaches a population threshold (e.g., 50+ individuals alive)
- A player explicitly "seeds" the species to Folkfork
- A periodic snapshot export runs (e.g., every in-game year)

MVEE only reads — it never writes to `folkfork/species/`. Import is one-directional at MVP.

---

## 2. `AlienSpeciesImporter` Design

New class in `packages/world/src/alien-generation/AlienSpeciesImporter.ts`, alongside `AlienSpeciesGenerator.ts`.

### Interfaces

```typescript
import type { GeneratedAlienSpecies } from './AlienSpeciesGenerator.js';

/** Raw species_exchange_v0.json shape as loaded from disk */
export interface SpeciesExchangeV0 {
  formatVersion: '0.1.0';
  speciesId: string;
  folkloreTradition?: string;
  archetypeSeed?: ArchetypeSeed;
  ecologicalRole?: EcologicalRole;
  minViableGenes: MinViableGene[];
  visualTokens: VisualTokens;
  metadata?: ExchangeMetadata;
}

export type ArchetypeSeed =
  | 'social_generalist'
  | 'territorial_predator'
  | 'collector_engineer'
  | 'knowledge_keeper'
  | 'environmental_adapter'
  | 'trickster'
  | 'guardian'
  | 'parasite_symbiont';

export type EcologicalRole =
  | 'producer'
  | 'primary_consumer'
  | 'secondary_consumer'
  | 'decomposer'
  | 'keystone'
  | 'mutualist'
  | 'parasite';

export interface MinViableGene {
  traitId: string;
  category: 'morphological' | 'behavioral' | 'metabolic' | 'cognitive' | 'social' | 'sensory';
  value: number;       // 0..1
  heritability: number; // 0..1
  varianceRange?: [number, number];
}

export interface VisualTokens {
  baseHue: number;    // 0..360
  accentHue: number;  // 0..360
  saturation?: number; // 0..1, default 0.65
  lightness?: number;  // 0..1, default 0.6
  sizeClass: 'tiny' | 'small' | 'medium' | 'large' | 'huge';
  bodyPlan: 'bipedal' | 'quadruped' | 'serpentine' | 'avian' | 'amorphous' | 'insectoid' | 'aquatic';
  pattern?: 'plain' | 'spotted' | 'striped' | 'mottled' | 'banded';
  markingIntensity?: number;
  bodyWidth?: number;  // 0.7..1.3
  notableFeatures?: string[];
}

export interface ExchangeMetadata {
  sourceGame?: string;
  exportedAt?: string;
  loreDescription?: string;
  culturalPractices?: string[];
}

/** Result of translating an exchange format species into MVEE's representation */
export interface ImportedSpecies extends GeneratedAlienSpecies {
  /** Preserved from exchange format for cross-game lore continuity */
  folkloreTradition?: string;
  /** Original archetype seed, preserved for downstream narrative systems */
  archetypeSeed?: ArchetypeSeed;
  /** Source species ID from Precursors */
  precursorsSpeciesId: string;
}
```

### Class Signature

```typescript
export class AlienSpeciesImporter {
  constructor(folkforkDir: string) {}

  /**
   * Scan folkforkDir for available species_exchange_v0.json files.
   * Returns the count of importable species without loading them.
   */
  async countAvailableSpecies(): Promise<number>

  /**
   * Load and translate all available Precursors species from folkforkDir.
   * Invalid files are logged and skipped — never throw on bad data.
   */
  async loadImportedSpecies(): Promise<ImportedSpecies[]>

  /**
   * Translate a single SpeciesExchangeV0 object to MVEE's ImportedSpecies.
   * Exposed for testing.
   */
  translateSpecies(exchange: SpeciesExchangeV0): ImportedSpecies
}
```

---

## 3. Exchange Format Compatibility with `species_exchange_v0.json`

The `species_exchange_v0.json` schema (produced by MUL-1022) is **confirmed compatible** as the file-exchange format. The importer reads it directly.

Required fields: `formatVersion`, `speciesId`, `minViableGenes`, `visualTokens`.
Optional but enriching: `folkloreTradition`, `archetypeSeed`, `ecologicalRole`, `metadata`.

The importer validates `formatVersion === '0.1.0'` on load and rejects files with unknown versions (forward-compatible: they can be added to Folkfork without breaking older MVEE builds).

---

## 4. Gap Analysis: MVEE-Only Fields — Default Values

Six `AlienCreatureSpecies` fields have no Precursors equivalent. The importer derives defaults for each.

### 4.1 `bodyPlan` (string key into `BODY_PLANS`)

Derived from `visualTokens.bodyPlan`:

| Exchange `bodyPlan` | MVEE `bodyPlan` key |
|---|---|
| `bipedal` | `standard_bilateral` |
| `quadruped` | `standard_bilateral` |
| `serpentine` | `serpentine_undulator` |
| `avian` | `standard_bilateral` |
| `amorphous` | `tentacular_mass` |
| `insectoid` | `modular_segmented` |
| `aquatic` | `tentacular_mass` |

### 4.2 `locomotion` (string key into `LOCOMOTION_METHODS`)

Derived from `visualTokens.bodyPlan` + `archetypeSeed`:

| Exchange `bodyPlan` | Default MVEE `locomotion` |
|---|---|
| `bipedal` | `quadrupedal_running` |
| `quadruped` | `quadrupedal_running` |
| `serpentine` | `tentacle_walking` |
| `avian` | `wing_flight` |
| `amorphous` | `tentacle_walking` |
| `insectoid` | `hexapod_scuttling` |
| `aquatic` | `jet_propulsion` |

### 4.3 `sensorySystem` (string key into `SENSORY_SYSTEMS`)

Derived from `minViableGenes` sensory category genes:

- If a `sensory` gene with `traitId` containing "chem" or "pheromone" → `pheromone_tracking`
- If `value > 0.7` in a `sensory` gene → `vibration_detection`
- If `archetypeSeed === 'knowledge_keeper'` → `telepathic_awareness`
- Otherwise → `visual_standard`

### 4.4 `diet` (string key into `DIET_PATTERNS`)

Derived from `ecologicalRole`:

| `ecologicalRole` | MVEE `diet` |
|---|---|
| `producer` | `energy_absorber` |
| `primary_consumer` | `herbivore_grazer` |
| `secondary_consumer` | `carnivore_ambush` |
| `decomposer` | `omnivore_opportunist` |
| `keystone` | `omnivore_opportunist` |
| `mutualist` | `omnivore_opportunist` |
| `parasite` | `parasitic_drainer` |
| *(absent)* | Inferred from `minViableGenes` aggression + metabolic genes |

### 4.5 `socialStructure` (string key into `SOCIAL_STRUCTURES`)

Derived from `archetypeSeed` + `minViableGenes` sociability gene (`value` 0..1):

| `archetypeSeed` | MVEE `socialStructure` |
|---|---|
| `social_generalist` | `herd_safety` |
| `territorial_predator` | `solitary_territorial` |
| `collector_engineer` | `eusocial_colony` |
| `knowledge_keeper` | `pack_hierarchy` |
| `environmental_adapter` | `herd_safety` |
| `trickster` | `solitary_territorial` |
| `guardian` | `pack_hierarchy` |
| `parasite_symbiont` | `symbiotic_partnership` |
| *(absent)* | Sociability gene value: ≥0.7→`herd_safety`, ≥0.4→`pack_hierarchy`, else `solitary_territorial` |

### 4.6 `defense` (string key into `DEFENSIVE_ADAPTATIONS`)

Derived from `minViableGenes` behavioral aggression gene + `archetypeSeed`:

- `archetypeSeed === 'territorial_predator'` and aggression `>0.6` → `sonic_scream`
- `archetypeSeed === 'parasite_symbiont'` → `camouflage_active`
- Aggression `<0.2` → `size_inflation`
- Default → `armored_plating`

### 4.7 `reproduction` (string key into `REPRODUCTION_STRATEGIES`)

All Precursors creatures use biochemistry-driven sexual reproduction. Default mapping:

- `archetypeSeed === 'collector_engineer'` or `eusocial_colony` social → `hive_queen`
- Intelligence cognitive gene `>0.7` → `live_birth_mammals`
- Otherwise → `egg_laying_abundant`

### 4.8 `intelligence` (string key into `INTELLIGENCE_LEVELS`)

Derived from `minViableGenes` cognitive gene (traitId: `intelligence`):

| Gene value | MVEE `intelligence` |
|---|---|
| < 0.3 | `instinctual_only` |
| 0.3 – 0.5 | `basic_learning` |
| 0.5 – 0.65 | `problem_solver` |
| 0.65 – 0.8 | `proto_sapient` |
| > 0.8 | `fully_sapient` |

### 4.9 `dangerLevel` and `domesticationPotential`

Derived from minViableGenes: aggression gene + size gene → danger score following `AlienSpeciesGenerator.calculateDangerLevel` logic pattern.
Fearfulness gene (inverted) + sociability + intelligence → domestication score.

---

## 5. Visual Token → Sprite Prompt

The `spritePrompt` on `ImportedSpecies` is derived deterministically from `visualTokens` — no LLM call needed.

```
function visualTokensToSpritePrompt(tokens: VisualTokens, lore?: ExchangeMetadata): string
```

### Color Mapping (HSL → descriptive)

Map `baseHue` to color name by hue range:
- 0–30, 330–360 → "red"
- 30–60 → "orange"
- 60–90 → "yellow"
- 90–150 → "green"
- 150–210 → "cyan"
- 210–270 → "blue"
- 270–310 → "purple"
- 310–330 → "magenta"

Apply `lightness` modifier: <0.4 → "dark {color}", >0.7 → "pale {color}", else "{color}".
Apply `saturation` modifier: <0.3 → "muted/desaturated {color}", >0.8 → "vivid {color}".

### Body Form

`visualTokens.bodyPlan` → sprite description phrase:
- `bipedal` → "upright two-legged form"
- `quadruped` → "four-legged creature"
- `serpentine` → "sinuous limbless body"
- `avian` → "winged creature"
- `amorphous` → "shapeless mass with pseudopods"
- `insectoid` → "multi-legged insect-like body"
- `aquatic` → "streamlined aquatic form"

### Pattern + Notable Features

`pattern` → texture descriptor appended to prompt.
Each `notableFeature` string appended as additional detail (e.g., "bio-luminescent spots", "crystalline fin").

### Example Output

```
Pixel art alien creature: four-legged creature, vivid green coloration with orange accents,
striped pattern, large sensory antennae. Medium sized. Top-down view, 48px,
medium detail, distinct body parts clearly defined.
```

---

## 6. Integration with `BiosphereGenerator`

The integration point is `BiosphereGenerator.constructor()`. The importer is instantiated alongside `AlienSpeciesGenerator`, and the generation loop prefers imported species for niche slots.

### Updated Constructor Signature

```typescript
export class BiosphereGenerator {
  private nicheIdentifier: EcologicalNicheIdentifier;
  private alienGenerator: AlienSpeciesGenerator;
  private alienImporter: AlienSpeciesImporter;
  private importedSpeciesPool: ImportedSpecies[] = [];

  constructor(
    llmProvider: LLMProvider,
    planet: PlanetConfig,
    progressCallback?: ProgressCallback,
    options?: BiosphereGeneratorOptions
  )
```

### Import → Niche Assignment Logic

In `generateBiosphere()`, before the niche generation loop:

```typescript
// Load Precursors species from Folkfork (if available)
if (this.alienImporter.countAvailableSpecies() > 0) {
  this.importedSpeciesPool = await this.alienImporter.loadImportedSpecies();
  this.reportProgress(`🌌 ${this.importedSpeciesPool.length} Precursors species arrived via Folkfork`);
}
```

In `generateSpeciesForNiche()`:
1. Check if any imported species matches the niche's `category` (via `ecologicalRole` mapping)
2. If match found: use imported species (no LLM call)
3. If no match: fall back to `this.alienGenerator.generateAlienSpecies(constraints)`

Imported species are consumed from the pool in order — each imported species populates at most one niche slot.

---

## 7. Fallback Strategy

| Scenario | Behavior |
|---|---|
| Folkfork dir does not exist | Log info; use 100% LLM generation |
| Folkfork dir empty | Log info; use 100% LLM generation |
| Some niches filled by import, others not | Hybrid: imported for matched niches, LLM for rest |
| All niches filled by import | No LLM calls for species generation |
| Imported species file is malformed | Log warning, skip file, continue |
| Imported species has unknown `formatVersion` | Log warning, skip file |

**No silent fallbacks on valid data** — if a well-formed `species_exchange_v0.json` fails to translate (missing required fields), throw, don't silently produce a broken species.

---

## 8. File Layout

```
packages/world/src/alien-generation/
  AlienSpeciesGenerator.ts    (existing — unchanged)
  AlienSpeciesImporter.ts     (NEW — this design)
  AlienCreatureComponents.ts  (existing — unchanged)
  index.ts                    (add AlienSpeciesImporter export)

folkfork/
  species/                    (created by Precursors, read by MVEE)
```

---

## 9. Cross-Game Narrative Fields

`folkloreTradition` and `archetypeSeed` from the exchange format are preserved on `ImportedSpecies` and should flow downstream to:

- Creature lore panels (if the species is sapient and has a lore display)
- Ancestral memory replay (MUL-1130 — when that spec is implemented, this pipeline provides the species-origin data)
- Cross-game extinction events (MUL-1131 — extinction in Precursors can be surfaced in MVEE via a `extinct: true` flag in the exchange file; MVEE removes that species from the Folkfork pool)

The `metadata.culturalPractices` field from the exchange format maps to creature cultural notes in `GeneratedAlienSpecies.culturalNotes` for sapient species.

---

## 10. Acceptance Criteria Checklist

- [x] Architecture doc: `docs/precursors-to-mvee-species-import.md` — **this file**
- [x] `AlienSpeciesImporter` design (interfaces and class signature — implementation goes to World Engineer)
- [x] Folkfork file exchange format confirmed compatible with `species_exchange_v0.json` (§3)
- [x] Gap analysis gaps resolved — all 6 MVEE-only fields have documented default derivation (§4)

---

## 11. Implementation Notes for World Engineer

When implementing `AlienSpeciesImporter.ts`:

1. Use `node:fs/promises` (or equivalent) for async file reads — never sync I/O in a generator
2. Parse each JSON file with a try/catch — malformed files must never crash biosphere generation
3. Validate `formatVersion` before processing — reject unknown versions explicitly
4. The `translateSpecies()` method should be pure (no I/O) and fully unit-testable
5. Add `AlienSpeciesImporter` to `packages/world/src/alien-generation/index.ts` exports
6. The `folkforkDir` constructor parameter defaults to `process.cwd() + '/folkfork/species'` when not provided
7. `BiosphereGeneratorOptions` should accept optional `folkforkDir?: string` to override the default path

This design intentionally delivers interfaces, not implementation — enabling parallel World Engineer work without blocking on Tech Lead availability.
