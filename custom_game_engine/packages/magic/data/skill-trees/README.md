# Magic Skill Tree JSON Data

This directory contains the skill tree definitions for all 25 magic paradigms, extracted from TypeScript to JSON for easier editing and version control.

## Overview

**Total Trees**: 25
**Total Nodes**: 532
**Location**: `/packages/magic/data/skill-trees/`

## Files

- **Individual paradigm files** (25 files): `{paradigm_id}.json`
- **Summary file**: `_summary.json` - metadata about all trees
- **README**: This file

## Paradigms

| Paradigm | Nodes | File |
|----------|-------|------|
| Allomancy | 32 | `allomancy.json` |
| Daemon | 27 | `daemon.json` |
| Shinto | 26 | `shinto.json` |
| Architecture | 26 | `architecture.json` |
| Dream | 24 | `dream.json` |
| Sympathy | 24 | `sympathy.json` |
| Song | 23 | `song.json` |
| Name | 23 | `name.json` |
| Pact | 23 | `pact.json` |
| Breath | 22 | `breath.json` |
| Blood | 21 | `blood.json` |
| Feng Shui | 21 | `feng_shui_magic.json` |
| Emotional | 20 | `emotional.json` |
| Bureaucratic | 20 | `bureaucratic_magic.json` |
| Rune | 19 | `rune.json` |
| Commerce | 19 | `commerce_magic.json` |
| Debt | 19 | `debt_magic.json` |
| Luck | 19 | `luck_magic.json` |
| Divine | 18 | `divine.json` |
| Academic | 18 | `academic.json` |
| Belief | 18 | `belief_magic.json` |
| Game | 18 | `game_magic.json` |
| Threshold | 18 | `threshold_magic.json` |
| Echo | 17 | `echo_magic.json` |
| Paradox | 17 | `paradox_magic.json` |

## Usage

### TypeScript/JavaScript

Skill trees are loaded via the centralized loader in `packages/magic/src/skillTrees/loadSkillTrees.ts`:

```typescript
import { loadSkillTree, DAEMON_SKILL_TREE } from '@ai-village/magic';

// Dynamic loading
const tree = loadSkillTree('daemon');

// Static import (backward compatible)
const tree2 = DAEMON_SKILL_TREE;

// Get all trees
import { getAllSkillTrees, getAllParadigmIds } from '@ai-village/magic';
const allTrees = getAllSkillTrees();
const paradigms = getAllParadigmIds();
```

### Direct JSON Access

For tooling, scripts, or external tools:

```bash
# Read a specific tree
cat packages/magic/data/skill-trees/daemon.json | jq '.nodes | length'

# Get summary stats
cat packages/magic/data/skill-trees/_summary.json
```

## Structure

Each JSON file contains a complete `MagicSkillTree` object with:

- **Tree metadata**: `id`, `paradigmId`, `name`, `description`, `lore`
- **Nodes array**: All skill nodes with:
  - Node metadata (id, name, description, lore)
  - Unlock conditions and prerequisites
  - Effects granted
  - XP costs and level limits
  - Tier and category information
- **Entry nodes**: Starting nodes (usually tier 0)
- **Connections**: Visual graph connections
- **XP sources**: How to earn XP in this tree
- **Rules**: Special progression rules

## Top Nodes by XP Cost

### Daemon Paradigm
- Unlimited Separation (500 XP)
- Dust Communion (350 XP)
- Dust Navigation (300 XP)

### Dream Paradigm
- Nested Dreaming (400 XP)
- Dream Walking (300 XP)
- Ancestral Dreaming (300 XP)

### Breath Paradigm
- Spontaneous Sentience (750 XP)
- Type IV Awakening (500 XP)
- Perfect Awakening (500 XP)

### Sympathy Paradigm
- Bloodless Sympathy (600 XP)
- Quaternary Mind (500 XP)
- Mommet Binding (450 XP)

## Editing

### Adding New Nodes

1. Edit the appropriate JSON file
2. Add node to `nodes` array with required fields
3. Update `entryNodes` if it's a starting node
4. Connections auto-generate from `prerequisites`

### Modifying XP Costs

Simply update the `xpCost` field in any node. Changes take effect immediately (with HMR in dev mode).

### Validation

Type safety is maintained through TypeScript:

```bash
# Type-check after editing
cd packages/magic && npx tsc --noEmit
```

## Regeneration

To regenerate JSON from TypeScript sources:

```bash
cd packages/magic
npx tsx scripts/extract-skill-trees.ts
```

This will:
- Import all skill trees from TypeScript files
- Export to JSON in this directory
- Generate summary file
- Show node counts and top nodes per tree

## Benefits

**Separation of data and code**: Skill tree definitions (data) are now separate from helper functions (code).

**Easier editing**: JSON is easier to edit than TypeScript for non-programmers.

**Version control**: JSON diffs are cleaner than TypeScript diffs for data changes.

**Tooling**: External tools can read/modify skill trees without TypeScript parsing.

**Type safety maintained**: TypeScript loader ensures runtime type safety.

**Backward compatible**: All existing imports continue to work.

## Implementation Details

- **Extraction script**: `packages/magic/scripts/extract-skill-trees.ts`
- **JSON loader**: `packages/magic/src/skillTrees/loadSkillTrees.ts`
- **Index exports**: Updated `packages/magic/src/index.ts` to use loader
- **Helper functions**: Remain in original TypeScript files (e.g., `DaemonSkillTree.ts`)

## Notes

- Original TypeScript skill tree files still exist and contain helper functions
- Tree data (nodes, metadata) comes from JSON
- Helper functions (calculations, lookups) come from TypeScript
- This provides best of both worlds: editable data + type-safe code
