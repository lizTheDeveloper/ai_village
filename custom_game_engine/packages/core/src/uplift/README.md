# Uplift System

Multi-generational genetic engineering programs to uplift non-sapient animals to full sapience.

**Status**: NOT YET INTEGRATED - Standalone implementation for testing.

## Overview

The uplift system simulates raising animals (dogs, corvids, dolphins) to human-level intelligence through selective breeding, gene editing, and neural augmentation. Programs span 10-100+ generations depending on baseline intelligence and available technology.

## Architecture

**Five Systems** (execute in priority order):

1. **UpliftCandidateDetectionSystem** (555) - Evaluates animals for uplift potential
2. **UpliftBreedingProgramSystem** (560) - Manages breeding, generations, intelligence gain
3. **ProtoSapienceObservationSystem** (562) - Tracks proto-sapient behaviors (tool use, proto-language)
4. **ConsciousnessEmergenceSystem** (565) - Handles awakening when threshold reached
5. **UpliftedSpeciesRegistrationSystem** - Creates new sapient species

**Six Components**:

- `UpliftCandidateComponent` - Marks suitable animals with potential score
- `UpliftProgramComponent` - Tracks program state, generations, intelligence
- `ProtoSapienceComponent` - Behavior emergence (tools, language, self-awareness)
- `UpliftedTraitComponent` - Marks awakened entities with origin/attitude
- Plus standard `AnimalComponent`, `SpeciesComponent`

## Uplift Stages

1. **Population Establishment** (Gen 0) - Gather breeding population (20+ minimum)
2. **Genetic Baseline** (Gen 1) - Sequence genome
3. **Selective Breeding** (Gen 2+, <0.5 intelligence) - Breed smartest each generation
4. **Gene Editing** (0.5-0.6) - CRISPR modifications active
5. **Neural Enhancement** (0.6-0.65) - Brain structure modification
6. **Pre-Sapience** (0.65-0.68) - Proto-sapient behaviors emerge
7. **Emergence Threshold** (0.68-0.70) - Final generation before awakening
8. **Awakening** (0.70+) - Consciousness emerges; Animal → Agent transformation
9. **Stabilization** - Ensure trait breeds true

## Intelligence Thresholds

| Threshold | Value | Meaning |
|-----------|-------|---------|
| ANIMAL | 0.30 | Baseline (cats, bears) |
| SMART_ANIMAL | 0.40 | Intelligent animals (wolves) |
| PRE_SAPIENT | 0.50 | High intelligence (corvids, octopuses) |
| NEAR_SAPIENT | 0.60 | Pre-sapient (primates, dolphins) |
| PROTO_SAPIENT | 0.65 | Behaviors emerge (tool use, proto-language) |
| EMERGENCE | 0.68 | Abstract thinking, cultural traditions |
| SAPIENCE | 0.70 | Full sapience achieved |

## Generation Estimates

**Base estimates** (no tech bonuses):

- 0.7+ baseline (primates, dolphins): **10 generations**
- 0.6+ baseline (wolves, elephants): **15 generations**
- 0.5+ baseline (corvids, parrots): **25 generations**
- 0.4+ baseline (cats, bears): **60 generations**
- 0.3+ baseline (simple animals): **100 generations**

## Technology Bonuses

**Seven technologies** reduce generations required (see `UpliftTechnologyDefinitions.ts`):

- **Consciousness Studies** (Tier 1) - Unlocks uplift research
- **Genetic Engineering** (Tier 2) - 20% reduction
- **Neural Augmentation** (Tier 2) - 30% reduction
- **Selective Breeding Protocols** (Tier 2) - Academic paper bonuses
- **Nano Gene Editing** (Tier 3) - 40% reduction
- **Consciousness Transfer** (Tier 3) - 50% reduction, instant knowledge download
- **Mass Uplift Protocol** (Tier 3) - 70% reduction (max), species-wide

**Max reduction**: 85% (100 generations → 15)

## Proto-Sapient Behaviors

As intelligence increases, behaviors **automatically emerge**:

- **0.45**: Tool use (using sticks for food extraction)
- **0.55**: Tool creation (modifying/making tools)
- **0.60**: Proto-language (consistent communication patterns)
- **0.65**: Mirror test passed (self-recognition)
- **0.68**: Abstract thinking, cultural traditions

Tracked via `ProtoSapienceComponent` with tool records, communication patterns, vocabulary size, teaching behaviors.

## Awakening Moment

At 0.70 intelligence + all behavior thresholds:

1. **ConsciousnessEmergenceSystem** triggers awakening
2. Generate `AwakeningMoment` (first thought, question, emotion, witnesses)
3. Transform Animal → Agent (add AgentComponent, IdentityComponent, memories)
4. Create `UpliftedTraitComponent` with origin, attitude toward uplifters
5. Mark species as sapient
6. Emit `consciousness_awakened` event

**Attitude determination** (toward uplifters):
- Fast uplift (<50% base generations) → grateful/neutral
- Moderate (50-80%) → neutral/conflicted
- Long uplift (>80%) → conflicted/resentful

## Species Integration

**Before uplift**: Animal with `SpeciesComponent` (sapient=false)

**After awakening**: Agent with `UpliftedTraitComponent` linking to source species

**New species registration**: `UpliftedSpeciesRegistrationSystem` creates entry in species catalog:
- Name: "Neo-Wolf", "Sapient-Corvid", etc.
- Source species ID
- Generation achieved
- Retained instincts (pack loyalty, predatory focus)
- Enhanced abilities (abstract reasoning, tool creation)

## Helper Utilities

**UpliftHelpers.ts** exports:

- `calculateUpliftPotential()` - Score 0-100 from cognitive metrics
- `estimateGenerationsNeeded()` - Based on baseline intelligence
- `calculateAcceleratedGenerations()` - Apply tech bonuses
- `isReadyForSapience()` - Check all thresholds
- `shouldEmergeBehaviors()` - Return behavior flags by intelligence
- `generateUpliftedName()`, `generateIndividualName()` - Naming conventions
- `getIntelligenceCategory()`, `getStageDescription()` - UI helpers

## Example Flow

```typescript
// 1. Candidate detection
const wolves = world.query().with(CT.Animal).with(CT.Species).executeEntities();
// UpliftCandidateDetectionSystem evaluates, adds UpliftCandidateComponent

// 2. Start program (manual or UI)
const program = new UpliftProgramComponent({
  sourceSpeciesId: 'wolf',
  targetIntelligence: 0.70,
  minimumPopulation: 20,
  breedingPopulation: wolvesPack.map(w => w.id),
});

// 3. Generations progress automatically
// UpliftBreedingProgramSystem advances every maturity cycle
// ProtoSapienceObservationSystem tracks behaviors

// 4. Awakening (Gen 15 with tech bonuses)
// ConsciousnessEmergenceSystem detects readiness
// Transforms wolf → sapient "Neo-Wolf" agent

// 5. New species
// UpliftedSpeciesRegistrationSystem registers "Neo-Wolf" species
```

## Testing

Run standalone tests: `npm test packages/core/src/uplift`

Integration tests in `__tests__/UpliftIntegration.test.ts` verify full pipeline.
