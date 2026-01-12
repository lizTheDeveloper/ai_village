# Consciousness Systems

Alternative consciousness types beyond individual minds.

## Overview

Provides collective and distributed consciousness for non-individual entities. Two primary systems:

**HiveMindSystem**: Tiered collective (Queen/Cerebrate/Worker) with centralized control
**PackMindSystem**: Single mind distributed across multiple bodies

## Hive Mind

Queen (full LLM agent) issues directives through Cerebrates (simplified LLM) to Workers (state machines). Species configs define telepathy range, control decay, capacity limits.

```typescript
import { getHiveSpeciesConfig, createHive } from '@ai-village/core';

const config = getHiveSpeciesConfig('insectoid');
// maxCerebrates: 8, workersPerCerebrate: 50, telepathyRange: 500

const hive = system.createHive(world, queenEntity, x, y, 'insectoid');
system.addCerebrate(world, hive.id, cerebrateEntity);
system.addWorker(world, hive.id, workerEntity, 'gatherer');
```

**Tiers**: QUEEN (full agent), CEREBRATE (occasional LLM), WORKER (no LLM)
**Range-based**: Control degrades with distance from hive center
**Species types**: insectoid, fungal, psychic, parasitic, cybernetic, necromantic, botanical, +8 more

## Pack Mind

One consciousness in N bodies. Bodies maintain coherence via range; losing bodies reduces stats. Species configs define body limits, coherence rules, formations.

```typescript
import { getPackSpeciesConfig, createPack } from '@ai-village/core';

const config = getPackSpeciesConfig('distributed');
// maxBodies: unlimited, coherenceRange: 100

const pack = system.createPack(world, [body1, body2, body3], x, y, 'distributed');
system.setFormation(pack.id, 'line');
system.updateCoherence(pack.id); // Check body range
```

**Formations**: cluster, line, spread, defensive
**Coherence**: Bodies outside range lose connection (species-dependent)
**One LLM call per tick** for entire pack
**Species types**: distributed, gestalt, swarm, tines, dreamer, fluid, uploaded, +8 more

## Integration

**With Agent AI**: Hive Queens use full LLM brain; pack primary body controls all
**With Combat**: HiveCombatComponent coordinates with hive directives
**With Reproduction**: parasitic species integrate with CollectiveMindComponent

**Components**: `hive_member`, `pack_member` (lowercase with underscores)

## Species Configuration

All limits are species-based, not arbitrary. Each species defines biological constraints:

- **Hive**: telepathy range, control decay, cerebrate capacity, worker limits
- **Pack**: body count, coherence range/decay, formations, survival rules

Example species: Tines (A Fire Upon the Deep), Borg-style cybernetic, Geth networked AI, World-Tree botanical, The Unraveling's Staid/Vail societies.

See `HiveSpeciesConfig` and `PackSpeciesConfig` for full parameters.
