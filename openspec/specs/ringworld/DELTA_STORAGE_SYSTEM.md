# Delta Storage System Specification

**Status:** Draft
**Version:** 1.0
**Last Updated:** 2026-01-06

## Overview

The Delta Storage System stores only player-induced changes to regions, not the entire region state. Base regions are generated procedurally from seeds; deltas record deviations from that baseline.

**Inspiration:** Minecraft's chunk storage (procedural + modifications)

## Core Concept

```
Region State = ProcGen(seed, template) + Deltas
```

- **ProcGen(seed, template):** Deterministic generation (0 bytes storage)
- **Deltas:** Only what player changed (minimal bytes)

## Delta Types

```typescript
type DeltaAction =
  | 'item_removed'           // Player picked up item
  | 'item_added'             // Player placed item
  | 'item_moved'             // Player relocated item
  | 'building_built'         // Player constructed building
  | 'building_destroyed'     // Player demolished building
  | 'building_upgraded'      // Player upgraded building
  | 'terrain_modified'       // Player dug, filled, tilled
  | 'tree_felled'            // Player cut down tree
  | 'rock_mined'             // Player mined rock/ore
  | 'npc_killed'             // Player killed NPC
  | 'npc_recruited'          // Player recruited NPC
  | 'door_state_changed'     // Player opened/closed door
  | 'chest_contents_changed' // Player took/added items to chest
  | 'farm_plot_created'      // Player tilled soil
  | 'farm_plot_planted'      // Player planted seeds
  | 'ownership_claimed'      // Player claimed territory
  | 'sign_placed'            // Player placed sign with text
  | 'flag_placed'            // Player placed flag/marker
  | 'custom_building';       // Player built custom structure

interface Delta {
  tick: number;              // When this change occurred
  action: DeltaAction;
  position: Position;        // Where the change happened
  data: DeltaData;           // Action-specific data
}

type DeltaData =
  | ItemDelta
  | BuildingDelta
  | TerrainDelta
  | NPCDelta
  | CustomDelta;
```

## Delta Data Structures

### Item Delta

```typescript
interface ItemDelta {
  itemId: string;            // Item type ID
  quantity: number;
  metadata?: {
    durability?: number;
    enchantments?: string[];
    customName?: string;
  };
}

// Example: Player took ray gun from ancient platform
const delta: Delta = {
  tick: 150000,
  action: 'item_removed',
  position: { x: 10, y: 15 },
  data: {
    itemId: 'ray_gun_mk2',
    quantity: 1,
    metadata: {
      durability: 87,
      enchantments: ['rapid_fire'],
      customName: 'Zephyr\'s Wrath'
    }
  }
};
```

### Building Delta

```typescript
interface BuildingDelta {
  buildingType: string;
  variant?: string;
  rotation: number;
  owner?: string;           // Player ID
  customData?: {
    storage?: Map<string, number>;
    production?: Map<string, number>;
  };
}

// Example: Player built a tent
const delta: Delta = {
  tick: 150500,
  action: 'building_built',
  position: { x: 50, y: 50 },
  data: {
    buildingType: 'tent',
    variant: 'leather',
    rotation: 0,
    owner: 'player_123'
  }
};
```

### Terrain Delta

```typescript
interface TerrainDelta {
  fromType: TerrainType;    // Original terrain
  toType: TerrainType;      // New terrain
  tool?: string;            // What was used
}

// Example: Player tilled soil
const delta: Delta = {
  tick: 151000,
  action: 'terrain_modified',
  position: { x: 45, y: 48 },
  data: {
    fromType: 'grass',
    toType: 'tilled_soil',
    tool: 'hoe'
  }
};
```

### NPC Delta

```typescript
interface NPCDelta {
  npcId: string;            // Which NPC
  npcType: string;          // Type (for respawning)
  state: 'killed' | 'recruited' | 'dismissed';
  loot?: ItemDelta[];       // What was dropped
}

// Example: Player killed security drone
const delta: Delta = {
  tick: 152000,
  action: 'npc_killed',
  position: { x: 75, y: 80 },
  data: {
    npcId: 'security_drone_12345',
    npcType: 'security_drone',
    state: 'killed',
    loot: [
      { itemId: 'scrap_metal', quantity: 3 },
      { itemId: 'energy_cell', quantity: 1 }
    ]
  }
};
```

## Delta Storage Structure

### Per-Region Delta File

```typescript
interface RegionDeltaFile {
  address: RingworldAddress;
  baseTemplate: string;      // For validation
  baseSeed: number;          // For validation

  // All player changes to this region
  deltas: Delta[];

  // Metadata
  firstVisitTick: number;
  lastVisitTick: number;
  totalTimeSpent: number;    // Ticks
  playerVisitCount: number;
}

// Example region delta file
const regionDeltas: RegionDeltaFile = {
  address: {
    megasegment: 7,
    region: 23,
    chunk: 0,
    tile: { x: 0, y: 0 }
  },
  baseTemplate: 'ancient_landing_platform',
  baseSeed: 782934,

  deltas: [
    {
      tick: 150000,
      action: 'item_removed',
      position: { x: 10, y: 15 },
      data: { itemId: 'ray_gun_mk2', quantity: 1 }
    },
    {
      tick: 150005,
      action: 'item_removed',
      position: { x: 12, y: 15 },
      data: { itemId: 'chair', quantity: 1 }
    },
    {
      tick: 150500,
      action: 'building_built',
      position: { x: 50, y: 50 },
      data: { buildingType: 'tent', rotation: 0, owner: 'player_123' }
    }
  ],

  firstVisitTick: 150000,
  lastVisitTick: 155000,
  totalTimeSpent: 5000,
  playerVisitCount: 2
};
```

## Delta Application

### Loading Region with Deltas

```typescript
async function loadRegionWithDeltas(address: RingworldAddress): Promise<Region> {
  // 1. Generate base region from template + seed
  const template = selectRegionTemplate(address.megasegment, address.region);
  const seed = hashSeed(address.megasegment, address.region, template.id);
  const baseRegion = await generateRegion(address, template, seed);

  // 2. Load delta file for this region
  const deltaFile = await loadDeltaFile(address);

  if (!deltaFile) {
    // Never visited - return pristine generated region
    return baseRegion;
  }

  // 3. Validate base matches delta file
  if (deltaFile.baseTemplate !== template.id || deltaFile.baseSeed !== seed) {
    console.warn('Delta file base mismatch - regenerating');
    return baseRegion;
  }

  // 4. Apply deltas in chronological order
  for (const delta of deltaFile.deltas.sort((a, b) => a.tick - b.tick)) {
    applyDelta(baseRegion, delta);
  }

  return baseRegion;
}

function applyDelta(region: Region, delta: Delta): void {
  switch (delta.action) {
    case 'item_removed':
      removeItemAt(region, delta.position, delta.data);
      break;

    case 'item_added':
      addItemAt(region, delta.position, delta.data);
      break;

    case 'building_built':
      placeBuildingAt(region, delta.position, delta.data);
      break;

    case 'building_destroyed':
      removeBuildingAt(region, delta.position);
      break;

    case 'terrain_modified':
      modifyTerrainAt(region, delta.position, delta.data);
      break;

    case 'npc_killed':
      removeNPCAt(region, delta.position, delta.data.npcId);
      break;

    // ... other delta types
  }
}
```

### Saving Deltas

```typescript
class DeltaRecorder {
  private currentRegion: RingworldAddress;
  private deltas: Delta[] = [];

  recordDelta(action: DeltaAction, position: Position, data: DeltaData): void {
    this.deltas.push({
      tick: getCurrentTick(),
      action,
      position,
      data
    });
  }

  async saveOnRegionExit(): Promise<void> {
    if (this.deltas.length === 0) return;

    // Load existing delta file
    const existing = await loadDeltaFile(this.currentRegion) || {
      address: this.currentRegion,
      baseTemplate: getCurrentTemplate().id,
      baseSeed: getCurrentSeed(),
      deltas: [],
      firstVisitTick: getCurrentTick(),
      lastVisitTick: getCurrentTick(),
      totalTimeSpent: 0,
      playerVisitCount: 0
    };

    // Append new deltas
    existing.deltas.push(...this.deltas);
    existing.lastVisitTick = getCurrentTick();
    existing.playerVisitCount++;

    // Save to storage
    await saveDeltaFile(this.currentRegion, existing);

    // Clear recorder
    this.deltas = [];
  }
}
```

## Delta Compression

### Merge Duplicate Operations

```typescript
function compressDeltasOnSave(deltas: Delta[]): Delta[] {
  // Example: Multiple "item_removed" at same position -> merge
  const compressed: Delta[] = [];
  const positionMap = new Map<string, Delta[]>();

  for (const delta of deltas) {
    const key = `${delta.position.x},${delta.position.y}`;
    if (!positionMap.has(key)) {
      positionMap.set(key, []);
    }
    positionMap.get(key)!.push(delta);
  }

  // Merge operations at same position
  for (const [key, deltasAtPos] of positionMap) {
    // If multiple item removals, combine quantities
    const itemRemovals = deltasAtPos.filter(d => d.action === 'item_removed');
    if (itemRemovals.length > 1) {
      const merged = mergeItemDeltas(itemRemovals);
      compressed.push(merged);
    } else {
      compressed.push(...deltasAtPos);
    }
  }

  return compressed;
}
```

### Snapshot Strategy

After too many deltas, create a snapshot:

```typescript
const DELTA_THRESHOLD = 1000; // Max deltas before snapshot

async function checkSnapshotNeeded(deltaFile: RegionDeltaFile): Promise<void> {
  if (deltaFile.deltas.length > DELTA_THRESHOLD) {
    // Generate base region
    const base = await generateRegion(deltaFile.address, ...);

    // Apply all deltas
    for (const delta of deltaFile.deltas) {
      applyDelta(base, delta);
    }

    // Save as new snapshot
    await saveRegionSnapshot(deltaFile.address, base);

    // Clear deltas (base is now the snapshot, not procgen)
    deltaFile.deltas = [];
    deltaFile.baseTemplate = 'snapshot';
    await saveDeltaFile(deltaFile.address, deltaFile);
  }
}
```

## Storage Format

### Binary Delta Format (Compact)

```typescript
// Binary format for minimal storage
interface BinaryDelta {
  tick: uint32;              // 4 bytes
  action: uint8;             // 1 byte (enum)
  x: uint16;                 // 2 bytes
  y: uint16;                 // 2 bytes
  dataLength: uint16;        // 2 bytes
  data: Buffer;              // Variable
}

// Total: ~11 bytes + data
// vs JSON: ~150 bytes per delta

// Compression ratio: ~13x smaller
```

### JSON Delta Format (Human-Readable)

```json
{
  "address": { "megasegment": 7, "region": 23, "chunk": 0, "tile": { "x": 0, "y": 0 } },
  "baseTemplate": "ancient_landing_platform",
  "baseSeed": 782934,
  "deltas": [
    {
      "tick": 150000,
      "action": "item_removed",
      "position": { "x": 10, "y": 15 },
      "data": {
        "itemId": "ray_gun_mk2",
        "quantity": 1
      }
    }
  ]
}
```

## Multiplayer Support

### Shared vs Personal Deltas

```typescript
interface MultiplayerRegionDelta {
  address: RingworldAddress;
  baseTemplate: string;
  baseSeed: number;

  // Everyone sees these
  sharedDeltas: Delta[];

  // Only specific players see these
  personalDeltas: Map<PlayerId, Delta[]>;
}

// Example:
// - Player A takes ray gun (personal)
// - Player B builds tent (shared)
// Result:
// - Player A sees: no ray gun, tent present
// - Player B sees: ray gun present, tent present
```

## Conservation of Matter Integration

Deltas integrate with "nothing is deleted" principle:

```typescript
interface ItemDelta {
  itemId: string;
  quantity: number;

  // Where did item go?
  disposition:
    | { type: 'taken', playerId: string }           // Player inventory
    | { type: 'destroyed', reason: string }         // Corruption (not deleted!)
    | { type: 'moved', newPosition: Position }      // Relocated
    | { type: 'transformed', resultItemId: string } // Crafted into something
    | { type: 'corrupted', corruptionId: string };  // Marked as corrupted
}

// No "deleted" option - everything has a fate!
```

## Performance Metrics

### Target Performance

- **Delta recording:** < 0.1ms per delta
- **Delta loading:** < 50ms for 1000 deltas
- **Delta application:** < 100ms for 1000 deltas
- **Storage per delta:** < 20 bytes (binary) or < 150 bytes (JSON)
- **Max deltas per region:** 1000 before snapshot

### Storage Scaling

```
Scenario: Player explores 100 regions over 50 hours

Deltas per region: ~100 (typical exploration)
Total deltas: 100 regions × 100 deltas = 10,000 deltas

Storage (binary): 10,000 × 20 bytes = 200 KB
Storage (JSON): 10,000 × 150 bytes = 1.5 MB

Compare to full region saves:
100 regions × 5 MB = 500 MB (250-2500× larger!)
```

## Implementation Phases

### Phase 1: Basic Delta Recording
- [ ] Delta type definitions
- [ ] Delta recorder class
- [ ] Save deltas on region exit

### Phase 2: Delta Application
- [ ] Apply deltas on region load
- [ ] Validate base matches delta file
- [ ] Handle missing delta files

### Phase 3: Delta Compression
- [ ] Merge duplicate operations
- [ ] Binary format serialization
- [ ] Snapshot strategy

### Phase 4: Advanced Features
- [ ] Multiplayer shared/personal deltas
- [ ] Conservation of matter integration
- [ ] Delta replay/undo system

## Testing Strategy

1. **Determinism test:** Generate region, apply deltas, compare to expected state
2. **Round-trip test:** Save deltas, load region, verify matches pre-save state
3. **Stress test:** Apply 10,000 deltas, verify performance
4. **Corruption test:** Detect mismatched base template/seed
5. **Multiplayer test:** Shared + personal deltas work correctly

## Success Criteria

- ✅ Delta files are 100-1000× smaller than full region saves
- ✅ Loading region with deltas takes < 500ms
- ✅ Player changes persist across sessions
- ✅ Multiplayer deltas work correctly
- ✅ No data loss (conservation of matter)
