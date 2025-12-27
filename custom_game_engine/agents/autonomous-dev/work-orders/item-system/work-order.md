# Work Order: Item System Refactor

## Problem Statement

Items in the codebase are represented as raw strings (`'berry'`, `'wood'`, `'seed:oak'`) with their properties scattered across multiple files:

- `InventoryComponent.ts` - hardcoded `isResourceType()`, `isFoodType()`, `isSeedType()` checks
- `DepositItemsBehavior.ts` - hardcoded depositable item lists
- `SeekFoodBehavior.ts` - hardcoded food lists
- `InteractionAPI.ts` - hardcoded food lists for `hasFood()`, `getFoodCount()`
- `GatherBehavior.ts` - implicit assumptions about what can be gathered

This causes:
1. **Maintenance burden** - Adding a new item requires changes in 5+ files
2. **Silent failures** - Unknown items throw errors or are silently skipped
3. **Inconsistency** - Different files have different lists of "valid" items
4. **No extensibility** - Can't add custom items without code changes

## Proposed Solution

Create a centralized `ItemRegistry` that defines all item types and their properties.

### Core Design

```typescript
// packages/core/src/items/ItemDefinition.ts

export interface ItemDefinition {
  /** Unique item ID (e.g., 'berry', 'wood', 'seed:oak') */
  id: string;

  /** Human-readable display name */
  displayName: string;

  /** Item category for filtering/grouping */
  category: ItemCategory;

  /** Weight per unit (affects inventory capacity) */
  weight: number;

  /** Maximum stack size in a single slot */
  stackSize: number;

  /** Whether this item can be eaten to restore hunger */
  isEdible: boolean;

  /** Hunger restored when eaten (if isEdible) */
  hungerRestored?: number;

  /** Whether this item can be deposited to storage */
  isStorable: boolean;

  /** Whether this item can be gathered from the world */
  isGatherable: boolean;

  /** Optional: Source entity types this can be gathered from */
  gatherSources?: string[];

  /** Optional: Tool required to gather (e.g., 'axe' for wood) */
  requiredTool?: string;

  /** Optional: Crafting recipe inputs */
  craftedFrom?: Array<{ itemId: string; amount: number }>;

  /** Optional: For seeds - the plant species this grows into */
  growsInto?: string;

  /** Optional: Custom metadata */
  metadata?: Record<string, unknown>;
}

export type ItemCategory =
  | 'resource'      // wood, stone, fiber, etc.
  | 'food'          // berry, wheat, bread, etc.
  | 'seed'          // seed:oak, seed:berry_bush, etc.
  | 'tool'          // axe, pickaxe, hoe, etc.
  | 'material'      // iron_ingot, cloth, etc.
  | 'consumable'    // potion, medicine, etc.
  | 'equipment'     // armor, weapons, etc.
  | 'misc';         // everything else
```

### ItemRegistry

```typescript
// packages/core/src/items/ItemRegistry.ts

export class ItemRegistry {
  private items: Map<string, ItemDefinition> = new Map();

  /** Register a new item definition */
  register(item: ItemDefinition): void;

  /** Get item definition by ID (throws if not found) */
  get(itemId: string): ItemDefinition;

  /** Get item definition or undefined */
  tryGet(itemId: string): ItemDefinition | undefined;

  /** Check if item exists */
  has(itemId: string): boolean;

  /** Get all items in a category */
  getByCategory(category: ItemCategory): ItemDefinition[];

  /** Get all edible items */
  getEdibleItems(): ItemDefinition[];

  /** Get all storable items */
  getStorableItems(): ItemDefinition[];

  /** Validate an item ID exists */
  validate(itemId: string): void; // throws if invalid

  /** Register multiple items at once */
  registerAll(items: ItemDefinition[]): void;
}

// Singleton instance
export const itemRegistry = new ItemRegistry();
```

### Default Items

```typescript
// packages/core/src/items/defaultItems.ts

export const DEFAULT_ITEMS: ItemDefinition[] = [
  // Resources
  {
    id: 'wood',
    displayName: 'Wood',
    category: 'resource',
    weight: 2.0,
    stackSize: 50,
    isEdible: false,
    isStorable: true,
    isGatherable: true,
    gatherSources: ['tree'],
    requiredTool: 'axe',
  },
  {
    id: 'stone',
    displayName: 'Stone',
    category: 'resource',
    weight: 3.0,
    stackSize: 50,
    isEdible: false,
    isStorable: true,
    isGatherable: true,
    gatherSources: ['rock'],
    requiredTool: 'pickaxe',
  },
  {
    id: 'fiber',
    displayName: 'Plant Fiber',
    category: 'resource',
    weight: 0.5,
    stackSize: 100,
    isEdible: false,
    isStorable: true,
    isGatherable: true,
    gatherSources: ['grass', 'plant'],
  },

  // Food
  {
    id: 'berry',
    displayName: 'Berry',
    category: 'food',
    weight: 0.2,
    stackSize: 50,
    isEdible: true,
    hungerRestored: 15,
    isStorable: true,
    isGatherable: true,
    gatherSources: ['berry_bush'],
  },
  {
    id: 'wheat',
    displayName: 'Wheat',
    category: 'food',
    weight: 0.3,
    stackSize: 50,
    isEdible: true,
    hungerRestored: 10,
    isStorable: true,
    isGatherable: true,
    gatherSources: ['wheat_plant'],
  },
  {
    id: 'bread',
    displayName: 'Bread',
    category: 'food',
    weight: 0.5,
    stackSize: 20,
    isEdible: true,
    hungerRestored: 40,
    isStorable: true,
    isGatherable: false,
    craftedFrom: [{ itemId: 'wheat', amount: 3 }],
  },
  {
    id: 'apple',
    displayName: 'Apple',
    category: 'food',
    weight: 0.3,
    stackSize: 30,
    isEdible: true,
    hungerRestored: 20,
    isStorable: true,
    isGatherable: true,
    gatherSources: ['apple_tree'],
  },
  {
    id: 'raw_meat',
    displayName: 'Raw Meat',
    category: 'food',
    weight: 1.0,
    stackSize: 20,
    isEdible: true,
    hungerRestored: 15, // Less than cooked
    isStorable: true,
    isGatherable: false, // Comes from hunting
  },
  {
    id: 'cooked_meat',
    displayName: 'Cooked Meat',
    category: 'food',
    weight: 0.8,
    stackSize: 20,
    isEdible: true,
    hungerRestored: 50,
    isStorable: true,
    isGatherable: false,
    craftedFrom: [{ itemId: 'raw_meat', amount: 1 }],
  },

  // Seeds are registered dynamically based on plant species
  // See: SeedItemFactory
];
```

### Seed Factory

Seeds are special because they're tied to plant species. Use a factory pattern:

```typescript
// packages/core/src/items/SeedItemFactory.ts

export function createSeedItem(speciesId: string, speciesName: string): ItemDefinition {
  return {
    id: `seed:${speciesId}`,
    displayName: `${speciesName} Seed`,
    category: 'seed',
    weight: 0.1,
    stackSize: 100,
    isEdible: false,
    isStorable: true,
    isGatherable: true,
    gatherSources: [speciesId], // Can gather from mature plants
    growsInto: speciesId,
  };
}

// Register seeds for all known plant species
export function registerPlantSeeds(plantRegistry: PlantRegistry): void {
  for (const species of plantRegistry.getAllSpecies()) {
    itemRegistry.register(createSeedItem(species.id, species.displayName));
  }
}
```

## Migration Plan

### Phase 1: Create ItemRegistry (Non-breaking)

1. Create `packages/core/src/items/` directory
2. Implement `ItemDefinition`, `ItemRegistry`, `defaultItems`
3. Register default items on world creation
4. Add `itemRegistry` to World or as singleton

### Phase 2: Update InventoryComponent

Replace hardcoded functions with registry lookups:

```typescript
// Before
export function isResourceType(itemId: string): boolean {
  return itemId === 'food' || itemId === 'wood' || ...;
}

// After
export function isResourceType(itemId: string): boolean {
  const item = itemRegistry.tryGet(itemId);
  return item?.category === 'resource';
}

export function isFoodType(itemId: string): boolean {
  const item = itemRegistry.tryGet(itemId);
  return item?.isEdible === true;
}

export function getItemWeight(itemId: string): number {
  return itemRegistry.get(itemId).weight;
}

export function getItemStackSize(itemId: string): number {
  return itemRegistry.get(itemId).stackSize;
}
```

### Phase 3: Update Behaviors

```typescript
// SeekFoodBehavior - Before
const FOOD_TYPES = ['berry', 'wheat', 'apple', ...];
if (FOOD_TYPES.includes(slot.itemId)) { ... }

// SeekFoodBehavior - After
const item = itemRegistry.tryGet(slot.itemId);
if (item?.isEdible) { ... }
```

```typescript
// DepositItemsBehavior - Before
if (!isValidItemType(itemId)) continue;

// DepositItemsBehavior - After
const item = itemRegistry.tryGet(itemId);
if (!item?.isStorable) continue;
```

### Phase 4: Update GatherBehavior

```typescript
// Before: hardcoded resource gathering logic

// After: Use item definitions
const item = itemRegistry.get(resourceType);
if (!item.isGatherable) {
  throw new Error(`Item ${resourceType} cannot be gathered`);
}
if (item.requiredTool && !agent.hasTool(item.requiredTool)) {
  return { success: false, reason: `Requires ${item.requiredTool}` };
}
```

### Phase 5: Data-Driven Items (Optional)

Load item definitions from JSON/YAML files:

```yaml
# items/food.yaml
- id: berry
  displayName: Berry
  category: food
  weight: 0.2
  stackSize: 50
  isEdible: true
  hungerRestored: 15
  isStorable: true
  isGatherable: true
  gatherSources: [berry_bush]
```

## Acceptance Criteria

1. **Single Source of Truth**: All item properties defined in one place
2. **Type Safety**: TypeScript enforces item definition structure
3. **Validation**: Unknown items throw clear errors immediately
4. **Extensibility**: New items can be added without code changes (Phase 5)
5. **Backward Compatibility**: Existing item IDs continue to work
6. **Performance**: Registry lookups are O(1) via Map

## Testing Requirements

1. Unit tests for ItemRegistry CRUD operations
2. Integration tests verifying behaviors use registry
3. Test that unknown items throw descriptive errors
4. Test seed factory creates valid items
5. Test default items all have required properties

## Files to Create

```
packages/core/src/items/
├── index.ts
├── ItemDefinition.ts
├── ItemRegistry.ts
├── defaultItems.ts
├── SeedItemFactory.ts
└── __tests__/
    ├── ItemRegistry.test.ts
    └── SeedItemFactory.test.ts
```

## Files to Modify

- `InventoryComponent.ts` - Use registry for type checks
- `SeekFoodBehavior.ts` - Use `item.isEdible`
- `DepositItemsBehavior.ts` - Use `item.isStorable`
- `GatherBehavior.ts` - Use `item.isGatherable`, `item.gatherSources`
- `InteractionAPI.ts` - Use registry for food checks
- `World.ts` - Initialize item registry

## Estimated Scope

- **Phase 1**: ~2 hours (create registry, no breaking changes)
- **Phase 2**: ~1 hour (update InventoryComponent)
- **Phase 3**: ~1 hour (update behaviors)
- **Phase 4**: ~1 hour (update GatherBehavior)
- **Phase 5**: ~2 hours (optional, data-driven loading)

## Dependencies

- None (self-contained refactor)

## Risks

- **Risk**: Breaking existing save files that reference item IDs
  - **Mitigation**: Keep all existing item IDs exactly the same

- **Risk**: Performance impact from registry lookups
  - **Mitigation**: Map lookups are O(1), cache hot items if needed
