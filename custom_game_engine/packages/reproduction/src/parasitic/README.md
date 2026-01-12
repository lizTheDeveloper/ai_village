# Parasitic Reproduction System

Simulates parasitic hive minds that colonize hosts and control their reproduction. Inspired by Body Snatchers, Yeerks (Animorphs), Goa'uld (Stargate), and Cordyceps fungi.

## Overview

The parasitic system operates on **two genetic lineages**: host DNA (body) and parasite DNA (consciousness). Parasites colonize hosts, control mating decisions, and colonize offspring to propagate both lineages.

## Components

### ParasiticColonizationComponent
Tracks colonization status of individual hosts.

**Key Fields:**
- `controlLevel`: none → contested → partial → full → integrated
- `hostPersonalityState`: intact → suppressed → fragmented → absorbed → destroyed
- `integration.progress`: 0-1, how complete the takeover is
- `hivePressure`: 0-1, nearby colonized entities suppress resistance
- `resistanceStamina`: host's ability to fight back depletes over time

**Colonization Methods:** ear_entry, spore_inhalation, pod_replacement, injection, consumption, psychic_override, birth_colonization, gradual_infiltration

### CollectiveMindComponent
The hive consciousness coordinating all colonized hosts.

**Strategic Modes:** expansion, consolidation, breeding, infiltration, defense, hibernation

**Manages:**
- Host registry with strategic/breeding/infiltration values
- Breeding pair assignments based on genetic optimization
- Expansion targets prioritized by species/social value/accessibility
- Parasite lineage tracking across host transfers

## Systems

### ColonizationSystem (Priority 48)
Handles infection mechanics.

**Processes:**
- Integration progress (resistance slows takeover)
- Host resistance attempts (hive pressure increases difficulty)
- Detection risk (low camouflage → exposure)
- Hive pressure calculation (nearby colonized strengthen control)

**API:** `attemptColonization()`, `forceColonization()`, `decolonize()`

### ParasiticReproductionSystem (Priority 51)
Manages collective-controlled breeding.

**Features:**
- Breeding pair evaluation (genetic diversity + trait scoring)
- Automatic offspring colonization (birth or delayed)
- Breeding assignments bypass host consent
- Integration level requirements (default 0.8)

**Offspring:** Born with host parents' DNA, immediately colonized by collective. Two lineages propagate: host genetics evolve via breeding, parasite genetics via lineage transfers.

## Lifecycle

1. **Colonization:** Target infected via method, begins integration
2. **Integration:** Parasite gains control (0.25 = contested, 0.5 = partial, 0.9 = full, 1.0 = absorbed)
3. **Breeding Assignment:** Collective selects genetically optimal pairs
4. **Offspring:** Born with host DNA, scheduled for colonization
5. **Host Transfer:** Parasite can jump to new host, retains memories/skills from previous hosts

## Resistance Mechanics

**Base Resistance:** 0.3 default, 0.8 for resistant hosts, 0.1 for newborns
**Hive Pressure:** Every 5 nearby colonized = max pressure (3x stamina drain, -50% resistance effectiveness)
**Recovery:** Previously colonized hosts gain +0.2 resistance, making recolonization harder
