# Migration Examples - Concrete Forward Migration Scenarios

> *"The only constant in software is change." - Anonymous*

**Created:** 2025-12-29
**Status:** Design
**Version:** 1.0.0

---

## Overview

This document provides **concrete examples** of how the migration system handles schema changes across game versions. Each example shows:

1. **The Change** - What feature was added/changed
2. **Old Schema** - How data looked before
3. **New Schema** - How data looks after
4. **Migration Code** - Exact transformation logic
5. **Test Cases** - Verification that migration works

---

## Example 1: Adding a New Field (Simple)

### The Change

**Version 1.0 → 1.1**: Added `generation` field to track multi-generational families.

### Old Schema (v1.0)

```typescript
interface AgentComponent_v0 {
  type: 'agent';
  name: string;
  age: number;
  parents: string[];  // Parent entity IDs
}

// Example data
const oldAgent = {
  type: 'agent',
  name: 'Alice',
  age: 25,
  parents: ['entity:123', 'entity:124'],
};
```

### New Schema (v1.1)

```typescript
interface AgentComponent_v1 {
  type: 'agent';
  name: string;
  age: number;
  parents: string[];
  generation: number;  // NEW: 0 = founder, 1 = child of founder, etc.
}

// Example data
const newAgent = {
  type: 'agent',
  name: 'Alice',
  age: 25,
  parents: ['entity:123', 'entity:124'],
  generation: 1,  // Added
};
```

### Migration Code

```typescript
migrationRegistry.register({
  component: 'agent',
  fromVersion: 0,
  toVersion: 1,
  description: 'Add generation field for multi-generational gameplay',

  migrate: (data: any) => {
    // Agents from v0 are considered generation 0 (founders)
    // unless they have parents, in which case we can't determine
    // their generation without walking the tree, so default to 0

    return {
      ...data,
      generation: data.parents.length > 0 ? 0 : 0,
    };
  },
});
```

### Test Case

```typescript
test('AgentComponent v0 → v1 migration', () => {
  const oldData = {
    type: 'agent',
    name: 'Alice',
    age: 25,
    parents: ['entity:123', 'entity:124'],
  };

  const migrated = migrationRegistry.migrate('agent', oldData, 0, 1);

  expect(migrated).toEqual({
    type: 'agent',
    name: 'Alice',
    age: 25,
    parents: ['entity:123', 'entity:124'],
    generation: 0,  // Default added
  });
});
```

---

## Example 2: Renaming a Field (Moderate)

### The Change

**Version 1.2 → 1.3**: Renamed `items` to `slots` in inventory to support equipment slots.

### Old Schema (v1.2)

```typescript
interface InventoryComponent_v0 {
  type: 'inventory';
  items: { id: string; count: number }[];
  maxWeight: number;
  currentWeight: number;
}

// Example
const oldInventory = {
  type: 'inventory',
  items: [
    { id: 'wood', count: 10 },
    { id: 'stone', count: 5 },
  ],
  maxWeight: 100,
  currentWeight: 45,
};
```

### New Schema (v1.3)

```typescript
interface InventoryComponent_v1 {
  type: 'inventory';
  slots: InventorySlot[];  // RENAMED from items
  maxWeight: number;
  currentWeight: number;
}

interface InventorySlot {
  itemId: string;      // Renamed from id
  stackSize: number;   // Renamed from count
  quality: ItemQuality; // NEW
  slotType: 'inventory' | 'equipment'; // NEW
}

// Example
const newInventory = {
  type: 'inventory',
  slots: [
    { itemId: 'wood', stackSize: 10, quality: 'normal', slotType: 'inventory' },
    { itemId: 'stone', stackSize: 5, quality: 'normal', slotType: 'inventory' },
  ],
  maxWeight: 100,
  currentWeight: 45,
};
```

### Migration Code

```typescript
migrationRegistry.register({
  component: 'inventory',
  fromVersion: 0,
  toVersion: 1,
  description: 'Rename items → slots, add quality and slot types',

  migrate: (data: any) => {
    return {
      type: data.type,
      slots: data.items.map((item: any) => ({
        itemId: item.id,          // Rename id → itemId
        stackSize: item.count,    // Rename count → stackSize
        quality: 'normal',        // Default quality
        slotType: 'inventory',    // Default to inventory slot
      })),
      maxWeight: data.maxWeight,
      currentWeight: data.currentWeight,
    };
  },
});
```

### Test Case

```typescript
test('InventoryComponent v0 → v1 migration', () => {
  const oldData = {
    type: 'inventory',
    items: [
      { id: 'wood', count: 10 },
      { id: 'stone', count: 5 },
    ],
    maxWeight: 100,
    currentWeight: 45,
  };

  const migrated = migrationRegistry.migrate('inventory', oldData, 0, 1);

  expect(migrated).toEqual({
    type: 'inventory',
    slots: [
      { itemId: 'wood', stackSize: 10, quality: 'normal', slotType: 'inventory' },
      { itemId: 'stone', stackSize: 5, quality: 'normal', slotType: 'inventory' },
    ],
    maxWeight: 100,
    currentWeight: 45,
  });
});
```

---

## Example 3: Splitting a Component (Complex)

### The Change

**Version 2.0 → 2.1**: Split `NeedsComponent` into separate `PhysicalNeedsComponent` and `SocialNeedsComponent` for better granularity.

### Old Schema (v2.0)

```typescript
interface NeedsComponent_v0 {
  type: 'needs';
  hunger: number;      // 0-100
  thirst: number;
  sleep: number;
  social: number;      // Social connection need
  belongingness: number;
}

// Example
const oldNeeds = {
  type: 'needs',
  hunger: 75,
  thirst: 60,
  sleep: 40,
  social: 80,
  belongingness: 65,
};
```

### New Schema (v2.1)

```typescript
interface PhysicalNeedsComponent_v1 {
  type: 'physical_needs';
  hunger: number;
  thirst: number;
  sleep: number;
  comfort: number;    // NEW
}

interface SocialNeedsComponent_v1 {
  type: 'social_needs';
  social: number;
  belongingness: number;
  esteem: number;     // NEW
}

// Example
const newPhysicalNeeds = {
  type: 'physical_needs',
  hunger: 75,
  thirst: 60,
  sleep: 40,
  comfort: 50,  // Default
};

const newSocialNeeds = {
  type: 'social_needs',
  social: 80,
  belongingness: 65,
  esteem: 50,  // Default
};
```

### Migration Code

This is a **component split**, so we need special handling:

```typescript
migrationRegistry.register({
  component: 'needs',
  fromVersion: 0,
  toVersion: 1,
  description: 'Split needs into physical_needs and social_needs',

  migrate: (data: any) => {
    // Return MULTIPLE components
    return {
      _split: true,  // Flag that this migration produces multiple components
      components: [
        {
          type: 'physical_needs',
          hunger: data.hunger,
          thirst: data.thirst,
          sleep: data.sleep,
          comfort: 50,  // Default
        },
        {
          type: 'social_needs',
          social: data.social,
          belongingness: data.belongingness,
          esteem: 50,  // Default
        },
      ],
    };
  },
});
```

### Special Migration Handler

The deserializer needs to handle splits:

```typescript
function deserializeEntity(data: VersionedEntity): Entity {
  const entity = new EntityImpl(data.id);

  for (const componentData of data.components) {
    // Check if migration produces a split
    const migrated = migrationRegistry.migrate(
      componentData.type,
      componentData.data,
      componentData.$version,
      CURRENT_VERSION
    );

    if (migrated._split) {
      // Add all split components
      for (const comp of migrated.components) {
        entity.addComponent(comp);
      }
    } else {
      // Normal migration
      entity.addComponent(migrated);
    }
  }

  return entity;
}
```

### Test Case

```typescript
test('NeedsComponent v0 → v1 split migration', () => {
  const oldData = {
    type: 'needs',
    hunger: 75,
    thirst: 60,
    sleep: 40,
    social: 80,
    belongingness: 65,
  };

  const migrated = migrationRegistry.migrate('needs', oldData, 0, 1);

  expect(migrated._split).toBe(true);
  expect(migrated.components).toHaveLength(2);

  expect(migrated.components[0]).toEqual({
    type: 'physical_needs',
    hunger: 75,
    thirst: 60,
    sleep: 40,
    comfort: 50,
  });

  expect(migrated.components[1]).toEqual({
    type: 'social_needs',
    social: 80,
    belongingness: 65,
    esteem: 50,
  });
});
```

---

## Example 4: Data Transformation (Very Complex)

### The Change

**Version 3.0 → 3.1**: Changed item quality from enum to structured QualityComponent with multiple attributes.

### Old Schema (v3.0)

```typescript
type ItemQuality_v0 = 'poor' | 'normal' | 'fine' | 'masterwork' | 'legendary';

interface ItemInstance_v0 {
  id: string;
  definitionId: string;
  quality: ItemQuality_v0;
  stackSize: number;
}

// Example
const oldItem = {
  id: 'item:001',
  definitionId: 'iron_sword',
  quality: 'masterwork',
  stackSize: 1,
};
```

### New Schema (v3.1)

```typescript
interface QualityAttributes {
  craftsmanship: number;   // 0-100
  durability: number;       // 0-100
  aesthetics: number;       // 0-100
  enchantability: number;   // 0-100
}

interface ItemInstance_v1 {
  id: string;
  definitionId: string;
  quality: QualityAttributes;  // Changed to structured
  stackSize: number;
  condition: number;            // NEW: current durability
}

// Example
const newItem = {
  id: 'item:001',
  definitionId: 'iron_sword',
  quality: {
    craftsmanship: 85,   // Derived from 'masterwork'
    durability: 90,
    aesthetics: 80,
    enchantability: 75,
  },
  stackSize: 1,
  condition: 90,  // Start at durability value
};
```

### Migration Code

```typescript
// Mapping table for enum → attributes
const qualityMapping: Record<ItemQuality_v0, QualityAttributes> = {
  'poor': {
    craftsmanship: 20,
    durability: 30,
    aesthetics: 15,
    enchantability: 10,
  },
  'normal': {
    craftsmanship: 50,
    durability: 50,
    aesthetics: 50,
    enchantability: 50,
  },
  'fine': {
    craftsmanship: 70,
    durability: 65,
    aesthetics: 75,
    enchantability: 70,
  },
  'masterwork': {
    craftsmanship: 90,
    durability: 85,
    aesthetics: 90,
    enchantability: 85,
  },
  'legendary': {
    craftsmanship: 100,
    durability: 95,
    aesthetics: 100,
    enchantability: 100,
  },
};

migrationRegistry.register({
  component: 'item_instance',
  fromVersion: 0,
  toVersion: 1,
  description: 'Convert quality enum to structured quality attributes',

  migrate: (data: any) => {
    const oldQuality = data.quality as ItemQuality_v0;

    if (!(oldQuality in qualityMapping)) {
      throw new Error(
        `Unknown quality value during migration: ${oldQuality}. ` +
        `Expected one of: ${Object.keys(qualityMapping).join(', ')}`
      );
    }

    const qualityAttrs = qualityMapping[oldQuality];

    return {
      ...data,
      quality: qualityAttrs,
      condition: qualityAttrs.durability,  // Initialize condition from durability
    };
  },
});
```

### Test Cases

```typescript
test('ItemInstance v0 → v1: poor quality', () => {
  const oldData = {
    id: 'item:001',
    definitionId: 'wooden_club',
    quality: 'poor',
    stackSize: 1,
  };

  const migrated = migrationRegistry.migrate('item_instance', oldData, 0, 1);

  expect(migrated.quality).toEqual({
    craftsmanship: 20,
    durability: 30,
    aesthetics: 15,
    enchantability: 10,
  });
  expect(migrated.condition).toBe(30);
});

test('ItemInstance v0 → v1: legendary quality', () => {
  const oldData = {
    id: 'item:002',
    definitionId: 'mithril_armor',
    quality: 'legendary',
    stackSize: 1,
  };

  const migrated = migrationRegistry.migrate('item_instance', oldData, 0, 1);

  expect(migrated.quality).toEqual({
    craftsmanship: 100,
    durability: 95,
    aesthetics: 100,
    enchantability: 100,
  });
  expect(migrated.condition).toBe(95);
});

test('ItemInstance v0 → v1: invalid quality throws', () => {
  const oldData = {
    id: 'item:003',
    definitionId: 'broken_item',
    quality: 'broken',  // Not a valid v0 quality
    stackSize: 1,
  };

  expect(() => {
    migrationRegistry.migrate('item_instance', oldData, 0, 1);
  }).toThrow('Unknown quality value during migration: broken');
});
```

---

## Example 5: Multi-Step Migration (Version Chain)

### The Change

**Version 1.0 → 1.1 → 1.2 → 1.3**: Three intermediate changes to PositionComponent.

### Schema Evolution

```typescript
// v0: Original
interface PositionComponent_v0 {
  type: 'position';
  x: number;
  y: number;
}

// v1: Added z-axis
interface PositionComponent_v1 {
  type: 'position';
  x: number;
  y: number;
  z: number;  // NEW
}

// v2: Split into tile + offset
interface PositionComponent_v2 {
  type: 'position';
  tileX: number;  // Integer tile coordinate
  tileY: number;
  tileZ: number;
  offsetX: number;  // Float offset within tile (0-1)
  offsetY: number;
}

// v3: Added velocity
interface PositionComponent_v3 {
  type: 'position';
  tileX: number;
  tileY: number;
  tileZ: number;
  offsetX: number;
  offsetY: number;
  velocityX: number;  // NEW
  velocityY: number;  // NEW
}
```

### Migration Chain

```typescript
// Migration 0 → 1: Add z-axis
migrationRegistry.register({
  component: 'position',
  fromVersion: 0,
  toVersion: 1,
  description: 'Add z-axis for multi-level support',
  migrate: (data: any) => ({
    ...data,
    z: 0,  // Default to ground level
  }),
});

// Migration 1 → 2: Split into tile + offset
migrationRegistry.register({
  component: 'position',
  fromVersion: 1,
  toVersion: 2,
  description: 'Split coordinates into tile + offset for precision',
  migrate: (data: any) => ({
    type: data.type,
    tileX: Math.floor(data.x),
    tileY: Math.floor(data.y),
    tileZ: Math.floor(data.z),
    offsetX: data.x - Math.floor(data.x),
    offsetY: data.y - Math.floor(data.y),
  }),
});

// Migration 2 → 3: Add velocity
migrationRegistry.register({
  component: 'position',
  fromVersion: 2,
  toVersion: 3,
  description: 'Add velocity tracking for physics',
  migrate: (data: any) => ({
    ...data,
    velocityX: 0,
    velocityY: 0,
  }),
});
```

### Test: Full Chain

```typescript
test('PositionComponent v0 → v3 full migration chain', () => {
  const v0Data = {
    type: 'position',
    x: 15.7,
    y: 23.3,
  };

  // Migrate through entire chain
  const v3Data = migrationRegistry.migrate('position', v0Data, 0, 3);

  expect(v3Data).toEqual({
    type: 'position',
    tileX: 15,
    tileY: 23,
    tileZ: 0,           // Added in v1
    offsetX: 0.7,       // Split in v2
    offsetY: 0.3,
    velocityX: 0,       // Added in v3
    velocityY: 0,
  });
});

test('PositionComponent v1 → v3 partial chain', () => {
  const v1Data = {
    type: 'position',
    x: 15.7,
    y: 23.3,
    z: 2,  // Already has z
  };

  const v3Data = migrationRegistry.migrate('position', v1Data, 1, 3);

  expect(v3Data.tileZ).toBe(2);  // z preserved
  expect(v3Data.velocityX).toBe(0);  // Velocity added
});
```

---

## Example 6: Conditional Migration (Context-Dependent)

### The Change

**Version 4.0 → 4.1**: Convert old building types to new multi-purpose buildings based on context.

### Old Schema (v4.0)

```typescript
interface BuildingComponent_v0 {
  type: 'building';
  buildingType: 'house' | 'workshop' | 'storage' | 'farm';
  owner: string;
}

// Examples
const oldHouse = {
  type: 'building',
  buildingType: 'house',
  owner: 'entity:123',
};

const oldWorkshop = {
  type: 'building',
  buildingType: 'workshop',
  owner: 'entity:124',
};
```

### New Schema (v4.1)

```typescript
interface BuildingComponent_v1 {
  type: 'building';
  blueprint: string;           // Blueprint ID
  purpose: BuildingPurpose[];  // Can have multiple purposes
  owner: string;
}

type BuildingPurpose = 'dwelling' | 'crafting' | 'storage' | 'agriculture' | 'social';

// Examples
const newHouse = {
  type: 'building',
  blueprint: 'cottage',
  purpose: ['dwelling'],
  owner: 'entity:123',
};

const newWorkshop = {
  type: 'building',
  blueprint: 'smithy',
  purpose: ['crafting', 'storage'],  // Workshops also have storage
  owner: 'entity:124',
};
```

### Migration Code (Context-Aware)

```typescript
// Migration needs access to entity to check for other components
interface MigrationContext {
  entity?: Entity;
  world?: World;
}

migrationRegistry.register({
  component: 'building',
  fromVersion: 0,
  toVersion: 1,
  description: 'Convert old building types to new blueprint system',

  migrate: (data: any, context?: MigrationContext) => {
    // Base mapping
    const typeMapping: Record<string, { blueprint: string; purpose: BuildingPurpose[] }> = {
      'house': { blueprint: 'cottage', purpose: ['dwelling'] },
      'workshop': { blueprint: 'workshop', purpose: ['crafting', 'storage'] },
      'storage': { blueprint: 'warehouse', purpose: ['storage'] },
      'farm': { blueprint: 'farmhouse', purpose: ['agriculture', 'dwelling'] },
    };

    const base = typeMapping[data.buildingType];
    if (!base) {
      throw new Error(`Unknown building type: ${data.buildingType}`);
    }

    // Context-aware enhancement
    // If entity has inventory, add storage purpose
    if (context?.entity?.hasComponent('inventory')) {
      if (!base.purpose.includes('storage')) {
        base.purpose.push('storage');
      }
    }

    // If multiple agents live here, add social purpose
    const residents = context?.world?.getEntities()
      .filter(e => e.getComponent('agent')?.home === context.entity?.id)
      .length ?? 0;

    if (residents >= 3 && !base.purpose.includes('social')) {
      base.purpose.push('social');
    }

    return {
      type: data.type,
      blueprint: base.blueprint,
      purpose: base.purpose,
      owner: data.owner,
    };
  },
});
```

### Test Case

```typescript
test('BuildingComponent v0 → v1: house with inventory adds storage', () => {
  const oldData = {
    type: 'building',
    buildingType: 'house',
    owner: 'entity:123',
  };

  // Mock entity with inventory
  const mockEntity = {
    id: 'building:001',
    hasComponent: (type: string) => type === 'inventory',
  } as any;

  const migrated = migrationRegistry.migrate('building', oldData, 0, 1, {
    entity: mockEntity,
  });

  expect(migrated.purpose).toContain('dwelling');
  expect(migrated.purpose).toContain('storage');  // Added due to inventory
});

test('BuildingComponent v0 → v1: house with many residents adds social', () => {
  const oldData = {
    type: 'building',
    buildingType: 'house',
    owner: 'entity:123',
  };

  // Mock world with 4 residents
  const mockWorld = {
    getEntities: () => [
      { getComponent: () => ({ home: 'building:001' }) },
      { getComponent: () => ({ home: 'building:001' }) },
      { getComponent: () => ({ home: 'building:001' }) },
      { getComponent: () => ({ home: 'building:001' }) },
    ],
  } as any;

  const mockEntity = { id: 'building:001' } as any;

  const migrated = migrationRegistry.migrate('building', oldData, 0, 1, {
    entity: mockEntity,
    world: mockWorld,
  });

  expect(migrated.purpose).toContain('dwelling');
  expect(migrated.purpose).toContain('social');  // Added due to 4 residents
});
```

---

## Migration Best Practices

### 1. Always Provide Defaults

```typescript
// ✅ GOOD: Clear default
migrate: (data: any) => ({
  ...data,
  newField: 0,  // Explicit default
}),

// ❌ BAD: Undefined leaves data incomplete
migrate: (data: any) => ({
  ...data,
  newField: undefined,
}),
```

### 2. Validate After Migration

```typescript
migrate: (data: any) => {
  const migrated = {
    ...data,
    newField: calculateNewField(data),
  };

  // Validate result
  if (!isValid(migrated)) {
    throw new Error(`Migration produced invalid data: ${JSON.stringify(migrated)}`);
  }

  return migrated;
},
```

### 3. Document Intent

```typescript
migrationRegistry.register({
  component: 'agent',
  fromVersion: 2,
  toVersion: 3,
  description: 'Add species field. Defaults to "human" for existing agents, preserving legacy behavior.',
  // ^^^ Explain WHY defaults were chosen

  migrate: (data: any) => ({
    ...data,
    species: 'human',  // See description
  }),
});
```

### 4. Test Edge Cases

```typescript
test('Migration handles missing optional fields', () => {
  const minimalData = {
    type: 'agent',
    name: 'Alice',
    // age field omitted (was optional in v0)
  };

  const migrated = migrationRegistry.migrate('agent', minimalData, 0, 1);

  expect(migrated.age).toBeUndefined();  // Preserved
  expect(migrated.generation).toBe(0);   // Added with default
});
```

### 5. Fail Loudly on Corrupt Data

```typescript
migrate: (data: any) => {
  // ✅ GOOD: Crash on invalid data
  if (typeof data.name !== 'string') {
    throw new Error(
      `agent.name must be string during migration, got ${typeof data.name}. ` +
      `This save file may be corrupted.`
    );
  }

  // ❌ BAD: Silent fallback masks corruption
  // const name = data.name || 'Unknown';  // NO!

  return { ...data, generation: 0 };
},
```

---

## Summary

These examples demonstrate:

1. **Simple additions** - Add new fields with defaults
2. **Renames** - Map old field names to new ones
3. **Splits** - One component becomes multiple
4. **Transformations** - Enum → structured data
5. **Chains** - Multiple migrations in sequence
6. **Context-aware** - Use entity/world context for smart defaults

The migration system allows the game to evolve without breaking old saves, while failing loudly on corrupt data (no silent fallbacks).

**Next:** See `PERSISTENCE_MULTIVERSE_SPEC.md` for the full system architecture.
