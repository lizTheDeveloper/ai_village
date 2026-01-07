# Introspection Package - Component Self-Awareness System

> **For Language Models:** This README is optimized for LM understanding. Read this document completely before working with the introspection system to understand its architecture, interfaces, and usage patterns.

## Overview

The **Introspection Package** (`@ai-village/introspection`) provides a schema-driven metadata system that enables runtime component introspection, self-awareness, and automatic UI generation across the entire ECS.

**What it does:**
- Define component schemas with field-level metadata (types, constraints, visibility, documentation)
- Auto-generate debug UIs with mutation support (sliders, dropdowns, text inputs)
- Generate LLM prompts from component state (agent self-awareness, world context)
- Validate component mutations with undo/redo support
- Cache rendered component views with scheduler-aware invalidation
- Provide type-safe component registry with category filtering

**Key files:**
- `src/registry/ComponentRegistry.ts` - Central schema registry (singleton)
- `src/types/ComponentSchema.ts` - Schema type definitions and `defineComponent()` helper
- `src/mutation/MutationService.ts` - Validated component mutations with undo/redo
- `src/prompt/AgentPromptRenderer.ts` - LLM prompt generation for agent self-awareness
- `src/renderers/DevRenderer.ts` - Auto-generated debug UI from schemas
- `src/cache/RenderCache.ts` - Scheduler-aware render caching (85-99% cache hits)
- `src/schemas/` - 125+ component schemas organized by category

---

## Package Structure

```
packages/introspection/
├── src/
│   ├── types/
│   │   ├── ComponentSchema.ts           # Schema type definitions
│   │   ├── FieldSchema.ts               # Field metadata types
│   │   ├── FieldTypes.ts                # Field type enums, visibility, UI hints
│   │   ├── CategoryTypes.ts             # Component categories
│   │   ├── LLMConfig.ts                 # LLM prompt configuration
│   │   ├── MutabilityTypes.ts           # Mutability settings
│   │   └── VisibilityTypes.ts           # Visibility rules (player/llm/agent/dev)
│   │
│   ├── registry/
│   │   ├── ComponentRegistry.ts         # Central schema registry (singleton)
│   │   └── autoRegister.ts              # Auto-registration helper
│   │
│   ├── core/
│   │   └── validateSchema.ts            # Schema validation utilities
│   │
│   ├── mutation/
│   │   ├── MutationService.ts           # Component mutation with validation
│   │   ├── ValidationService.ts         # Field validation logic
│   │   ├── UndoStack.ts                 # Undo/redo command stack
│   │   └── MutationEvent.ts             # Mutation event types
│   │
│   ├── prompt/
│   │   ├── PromptRenderer.ts            # LLM prompt rendering (world context)
│   │   └── AgentPromptRenderer.ts       # Agent self-awareness prompts
│   │
│   ├── renderers/
│   │   ├── DevRenderer.ts               # Auto-generated debug UI
│   │   ├── PlayerRenderer.ts            # Player-facing UI renderer
│   │   ├── PlayerDOMRenderer.ts         # DOM-based player UI
│   │   ├── PlayerCanvasRenderer.ts      # Canvas-based player UI
│   │   ├── CachedDevRenderer.ts         # Cached dev renderer
│   │   └── widgets/
│   │       ├── WidgetFactory.ts         # Widget creation factory
│   │       ├── TextWidget.ts            # Text input widget
│   │       ├── SliderWidget.ts          # Numeric slider widget
│   │       ├── DropdownWidget.ts        # Enum dropdown widget
│   │       ├── CheckboxWidget.ts        # Boolean checkbox widget
│   │       ├── ReadonlyWidget.ts        # Read-only display widget
│   │       └── JsonWidget.ts            # JSON object viewer widget
│   │
│   ├── cache/
│   │   ├── RenderCache.ts               # Scheduler-aware render caching
│   │   └── CacheMetrics.ts              # Cache performance metrics
│   │
│   ├── schemas/
│   │   ├── agent/                       # Agent-specific schemas (17 schemas)
│   │   ├── cognitive/                   # Memory, beliefs, goals (20 schemas)
│   │   ├── physical/                    # Body, movement, genetics (13 schemas)
│   │   ├── social/                      # Relationships, economy (16 schemas)
│   │   ├── afterlife/                   # Death, reincarnation (4 schemas)
│   │   ├── magic/                       # Divinity, spells, myths (6 schemas)
│   │   ├── world/                       # Buildings, realms, weather (28 schemas)
│   │   ├── system/                      # Infrastructure (11 schemas)
│   │   └── *.ts                         # Core schemas (10 schemas)
│   │
│   ├── utils/
│   │   └── typeGuards.ts                # Type validation utilities
│   │
│   └── index.ts                         # Package exports
│
├── package.json
└── README.md                            # This file
```

---

## Core Concepts

### 1. Component Schemas

Component schemas are the heart of the introspection system. They define metadata for every component type in the ECS.

```typescript
interface ComponentSchema<T extends Component> {
  type: string;                          // Component type identifier
  version: number;                       // Schema version for migrations
  category: ComponentCategory;           // 'core' | 'agent' | 'cognitive' | etc.
  description?: string;                  // Human-readable description

  fields: Record<string, FieldSchema>;   // Field definitions with metadata

  ui?: UIConfig;                         // UI rendering hints
  llm?: LLMConfig<T>;                    // LLM prompt configuration
  dev?: DevConfig;                       // Developer tools config

  renderers?: {                          // Custom renderers (optional)
    player?: (data: T) => string;
    dev?: (data: T, mutate: any) => HTMLElement;
    llm?: (data: T) => string;
  };

  mutators?: Record<string, MutatorFunction<T>>; // Custom mutation handlers

  validate?(data: unknown): data is T;   // Runtime validation
  createDefault?(): T;                   // Factory function
}
```

**Example schema:**

```typescript
import { defineComponent, autoRegister } from '@ai-village/introspection';

interface IdentityComponent extends Component {
  type: 'identity';
  version: 1;
  name: string;
  age: number;
  species: 'human' | 'elf' | 'dwarf';
}

export const IdentitySchema = autoRegister(
  defineComponent<IdentityComponent>({
    type: 'identity',
    version: 1,
    category: 'core',

    fields: {
      name: {
        type: 'string',
        required: true,
        description: 'Entity display name',
        visibility: { player: true, llm: true, agent: true, dev: true },
        ui: { widget: 'text', group: 'basic', order: 1 },
        mutable: true,
      },

      species: {
        type: 'enum',
        enumValues: ['human', 'elf', 'dwarf'] as const,
        required: true,
        description: 'Species type',
        visibility: { player: true, llm: true, agent: true, dev: true },
        ui: { widget: 'dropdown', group: 'basic', order: 2 },
        mutable: false, // Cannot change species
      },

      age: {
        type: 'number',
        required: true,
        range: [0, 10000] as const,
        description: 'Age in days',
        visibility: { player: true, llm: true, agent: true, dev: true },
        ui: { widget: 'slider', group: 'basic', order: 3 },
        mutable: true,
      },
    },

    llm: {
      promptSection: 'Identity',
      summarize: (data) =>
        `${data.name} (${data.species}, ${Math.floor(data.age / 365)} years old)`,
    },

    validate: (data): data is IdentityComponent => {
      return typeof data?.name === 'string' && typeof data?.age === 'number';
    },

    createDefault: () => ({
      type: 'identity',
      version: 1,
      name: 'Unknown',
      species: 'human',
      age: 0,
    }),
  })
);
```

### 2. Field Schemas

Field schemas define metadata for individual component fields:

```typescript
interface FieldSchema {
  // Type information
  type: FieldType;                       // 'string' | 'number' | 'boolean' | 'enum' | 'array' | 'map' | 'object'
  itemType?: FieldType;                  // For arrays/maps
  enumValues?: readonly string[];        // For enums

  // Constraints
  required: boolean;                     // Is field required?
  default?: unknown;                     // Default value
  range?: readonly [number, number];     // Min/max for numbers
  min?: number;                          // Minimum value
  max?: number;                          // Maximum value
  maxLength?: number;                    // Max length for strings/arrays

  // Documentation
  description?: string;                  // Field description (required if visibility.llm is true)
  displayName?: string;                  // Display name (defaults to field key)

  // Visibility
  visibility: Visibility;                // Who can see this field?

  // UI hints
  ui?: UIHints;                          // Rendering hints for UI

  // Mutation
  mutable?: boolean;                     // Can field be edited?
  mutateVia?: string;                    // Use custom mutator function
}
```

**Visibility rules:**

```typescript
interface Visibility {
  player: boolean;        // Visible in player UI
  llm: boolean | 'summarized';  // Included in LLM prompts (summarized = compressed)
  agent: boolean;         // Agent self-awareness (what agents know about themselves)
  user?: boolean;         // User settings UI
  dev: boolean;           // Developer debug tools
}
```

**UI hints:**

```typescript
interface UIHints {
  widget: WidgetType;     // 'text' | 'slider' | 'dropdown' | 'checkbox' | 'readonly' | 'json'
  group?: string;         // Field group for organization
  order?: number;         // Display order within group
  icon?: string;          // Icon emoji/string
  color?: string;         // Color hint
}
```

### 3. Component Registry

The `ComponentRegistry` is a singleton that stores all component schemas and provides type-safe queries.

```typescript
import { ComponentRegistry } from '@ai-village/introspection';

// Register a schema
ComponentRegistry.register(IdentitySchema);

// Retrieve a schema
const schema = ComponentRegistry.get<IdentityComponent>('identity');

// Check if schema exists
if (ComponentRegistry.has('identity')) {
  console.log('Identity schema registered');
}

// List all schemas
const allTypes = ComponentRegistry.list();

// Get schemas by category
const agentSchemas = ComponentRegistry.getByCategory('agent');

// Get all schemas
const allSchemas = ComponentRegistry.getAll();
```

**Auto-registration:**

```typescript
import { autoRegister, defineComponent } from '@ai-village/introspection';

// Schema is automatically registered on import
export const IdentitySchema = autoRegister(
  defineComponent<IdentityComponent>({ /* ... */ })
);
```

### 4. Mutation System

The `MutationService` provides validated, reversible component mutations with event emission.

```typescript
import { MutationService } from '@ai-village/introspection';

// Enable dev mode (allows mutation of all fields, even mutable: false)
MutationService.setDevMode(true);

// Mutate a field
const result = MutationService.mutate(
  entity,                  // Entity to mutate
  'identity',              // Component type
  'name',                  // Field name
  'New Name',              // New value
  'user'                   // Source: 'user' | 'system' | 'agent' | 'llm'
);

if (result.success) {
  console.log('Mutation successful');
} else {
  console.error('Mutation failed:', result.error);
}

// Batch mutations (all-or-nothing)
const results = MutationService.mutateBatch([
  { entity, componentType: 'identity', fieldName: 'name', value: 'Alice' },
  { entity, componentType: 'identity', fieldName: 'age', value: 100 },
]);

// Undo/redo
if (MutationService.canUndo()) {
  MutationService.undo();
}

if (MutationService.canRedo()) {
  MutationService.redo();
}

// Subscribe to mutation events
MutationService.on('mutated', (event) => {
  console.log(`${event.componentType}.${event.fieldName} changed:`,
    event.oldValue, '→', event.newValue);
});
```

**Validation:**

All mutations are validated against field schemas:

```typescript
// ✅ Valid mutation
MutationService.mutate(entity, 'identity', 'age', 25);

// ❌ Invalid: age out of range
MutationService.mutate(entity, 'identity', 'age', 999999);
// Error: "Value 999999 exceeds maximum 10000"

// ❌ Invalid: wrong type
MutationService.mutate(entity, 'identity', 'age', 'twenty-five');
// Error: "Expected number, got string"

// ❌ Invalid: immutable field (unless dev mode enabled)
MutationService.mutate(entity, 'identity', 'species', 'elf');
// Error: "Field 'species' is not mutable"
```

### 5. LLM Prompt Generation

The introspection system generates LLM prompts from component state for two use cases:

**Agent self-awareness** (what agents know about themselves):

```typescript
import { AgentPromptRenderer } from '@ai-village/introspection';

// Generate agent self-awareness prompt
const prompt = AgentPromptRenderer.renderEntity(entity);
```

**Output:**
```
## Identity
Name: Alice
Species: human
Age: 100 days (27%)

## Needs
Hunger: 45 (satisfied)
Energy: 80 (high)
Social: 30 (lonely)

## Skills
Farming: 5.2
Crafting: 3.8
Combat: 1.5
```

**World context** (what LLMs see about the world):

```typescript
import { PromptRenderer } from '@ai-village/introspection';

// Generate world context prompt
const worldPrompt = PromptRenderer.renderEntity(entity);
```

**Visibility filtering:**
- `AgentPromptRenderer` only includes fields where `visibility.agent === true`
- `PromptRenderer` includes fields where `visibility.llm === true` or `'summarized'`

**LLM configuration:**

```typescript
interface LLMConfig<T> {
  promptSection?: string;                // Section header in prompt
  priority?: number;                     // Prompt ordering (lower = earlier)
  includeFieldNames?: boolean;           // Show field names? (default: true)
  includeInAgentPrompt?: boolean;        // Include in agent self-awareness?

  summarize?: (data: T) => string;       // Custom summary function
}
```

### 6. Auto-Generated Debug UI

The `DevRenderer` automatically generates debug UIs from schemas:

```typescript
import { DevRenderer } from '@ai-village/introspection';

const renderer = new DevRenderer({
  showGroups: true,      // Show field groups
  fieldSpacing: 4,       // Space between fields (pixels)
  groupSpacing: 12,      // Space between groups (pixels)
});

// Initialize component UI
renderer.initializeComponent(
  'identity',
  identityComponent,
  (fieldName, newValue) => {
    // Handle field changes
    MutationService.mutate(entity, 'identity', fieldName, newValue);
  }
);

// Render to canvas
const heightUsed = renderer.render(
  ctx,           // CanvasRenderingContext2D
  'identity',    // Component type
  x, y,          // Position
  width          // Width
);

// Handle clicks
renderer.handleClick('identity', clickX, clickY, componentX, componentY, width);
```

**Widgets:**

The system includes 6 built-in widgets:

- **TextWidget** - String input
- **SliderWidget** - Numeric slider with range
- **DropdownWidget** - Enum selection
- **CheckboxWidget** - Boolean toggle
- **ReadonlyWidget** - Read-only display
- **JsonWidget** - JSON object viewer

Widgets are automatically selected based on field type and UI hints.

### 7. Render Caching

The `SchedulerRenderCache` caches rendered component output until the scheduler indicates the component will be updated, reducing redundant renders by 85-99%.

```typescript
import { SchedulerRenderCache } from '@ai-village/introspection';

const cache = new SchedulerRenderCache<HTMLElement>();

// Try to get cached render
const cached = cache.get(entityId, 'plant');

if (cached) {
  // Use cached render (cache hit!)
  return cached;
}

// Cache miss - render and store
const rendered = renderPlantComponent(plant);
cache.set(entityId, 'plant', rendered, world.tick);

// Manually invalidate on mutations
cache.invalidate(entityId, 'plant');

// Update tick counter each frame
cache.onTick(world.tick);

// Get cache statistics
const stats = cache.getStats();
console.log(`Cache hit rate: ${(stats.hitRate * 100).toFixed(1)}%`);
console.log(`Avg cache lifetime: ${stats.avgCacheLifetime} ticks`);
```

**Cache invalidation strategies:**

- **Automatic:** Cache expires when scheduler will update component (based on `SimulationScheduler` update frequencies)
- **Manual:** Invalidate on component mutations (integrated with `MutationService`)
- **Entity-level:** Invalidate all components for an entity
- **Type-level:** Invalidate all components of a type

**Cache performance:**

- `agent`: 1 tick update frequency → 67% cache hit
- `needs`: 1 tick update frequency → 67% cache hit
- `plant`: 86400 ticks (1 day) → 99.7% cache hit
- `weather`: High update frequency → 85% cache hit

---

## System APIs

### ComponentRegistry (Singleton)

Central schema storage and retrieval.

**Methods:**

```typescript
class ComponentRegistry {
  // Register a schema
  static register<T extends Component>(schema: ComponentSchema<T>): void;

  // Retrieve a schema
  static get<T extends Component>(type: string): ComponentSchema<T> | undefined;

  // Check if schema exists
  static has(type: string): boolean;

  // List all schema types
  static list(): string[];

  // Get schemas by category
  static getByCategory(category: ComponentCategory): ComponentSchema<any>[];

  // Get all schemas
  static getAll(): ComponentSchema<any>[];

  // Clear all schemas (testing only)
  static clear(): void;

  // Get schema count
  static count(): number;
}
```

### MutationService (Singleton)

Validated component mutations with undo/redo.

**Methods:**

```typescript
class MutationService {
  // Enable dev mode (allows all mutations)
  static setDevMode(enabled: boolean): void;

  // Mutate a field
  static mutate<T>(
    entity: Entity,
    componentType: string,
    fieldName: string,
    value: unknown,
    source?: MutationSource
  ): MutationResult;

  // Batch mutations (all-or-nothing)
  static mutateBatch(mutations: MutationRequest[]): MutationResult[];

  // Undo last mutation
  static undo(): boolean;

  // Redo last undone mutation
  static redo(): boolean;

  // Check undo availability
  static canUndo(): boolean;

  // Check redo availability
  static canRedo(): boolean;

  // Clear undo/redo history
  static clearHistory(): void;

  // Subscribe to mutation events
  static on(event: 'mutated', handler: MutationEventHandler): void;

  // Unsubscribe from mutation events
  static off(event: 'mutated', handler: MutationEventHandler): void;

  // Register render cache for auto-invalidation
  static registerRenderCache(cache: SchedulerRenderCache<any>): void;

  // Unregister render cache
  static unregisterRenderCache(cache: SchedulerRenderCache<any>): void;
}
```

### AgentPromptRenderer

Generates agent self-awareness prompts.

**Methods:**

```typescript
class AgentPromptRenderer {
  // Render all agent-visible components for an entity
  static renderEntity(entity: { id: string; components: Map<string, any> }): string;

  // Render a single component for agent self-awareness
  static renderComponent<T extends Component>(
    component: T,
    schema: ComponentSchema<T>
  ): string;
}
```

### PromptRenderer

Generates LLM prompts from world state.

**Methods:**

```typescript
class PromptRenderer {
  // Render all LLM-visible components for an entity
  static renderEntity(entity: { id: string; components: Map<string, any> }): string;

  // Render a single component for LLM prompts
  static renderComponent<T extends Component>(
    component: T,
    schema: ComponentSchema<T>
  ): string;
}
```

### DevRenderer

Auto-generates debug UI from schemas.

**Methods:**

```typescript
class DevRenderer {
  constructor(options?: DevRenderOptions);

  // Initialize component widgets
  initializeComponent(
    componentType: string,
    componentData: Component,
    onFieldChange: (fieldName: string, newValue: unknown) => void
  ): void;

  // Render component UI
  render(
    ctx: CanvasRenderingContext2D,
    componentType: string,
    x: number,
    y: number,
    width: number
  ): number;

  // Update component data (refresh widgets)
  updateComponent(componentType: string, componentData: Component): void;

  // Handle click events
  handleClick(
    componentType: string,
    x: number,
    y: number,
    componentX: number,
    componentY: number,
    componentWidth: number
  ): boolean;

  // Clear all widgets
  clear(): void;

  // Get registered component types
  getComponentTypes(): string[];
}
```

### SchedulerRenderCache

Scheduler-aware render caching.

**Methods:**

```typescript
class SchedulerRenderCache<T> {
  // Get cached render if valid
  get(entityId: string, componentType: string): T | null;

  // Store rendered output
  set(
    entityId: string,
    componentType: string,
    renderedOutput: T,
    currentTick: number
  ): void;

  // Manually invalidate a cached render
  invalidate(entityId: string, componentType: string): void;

  // Invalidate all caches for an entity
  invalidateEntity(entityId: string): void;

  // Invalidate all caches for a component type
  invalidateComponentType(componentType: string): void;

  // Update tick counter
  onTick(tick: number): void;

  // Check if render is cached and valid
  has(entityId: string, componentType: string): boolean;

  // Clear all cached renders
  clear(): void;

  // Get cache statistics
  getStats(): CacheStats;

  // Reset statistics
  resetStats(): void;

  // Get cached entity IDs
  getCachedEntities(): string[];

  // Get cache details for debugging
  getCacheDetails(): Array<{ entityId, componentType, age, ticksUntilExpiry, invalidated }>;
}
```

---

## Usage Examples

### Example 1: Define and Register a Schema

```typescript
import { defineComponent, autoRegister, type Component } from '@ai-village/introspection';

interface NeedsComponent extends Component {
  type: 'needs';
  version: 1;
  hunger: number;
  energy: number;
  social: number;
}

export const NeedsSchema = autoRegister(
  defineComponent<NeedsComponent>({
    type: 'needs',
    version: 1,
    category: 'agent',
    description: 'Agent physiological and social needs',

    fields: {
      hunger: {
        type: 'number',
        required: true,
        range: [0, 100] as const,
        default: 50,
        description: 'Hunger level (0=starving, 100=full)',
        visibility: { player: true, llm: true, agent: true, dev: true },
        ui: { widget: 'slider', group: 'needs', order: 1, icon: '🍽️' },
        mutable: true,
      },

      energy: {
        type: 'number',
        required: true,
        range: [0, 100] as const,
        default: 100,
        description: 'Energy level (0=exhausted, 100=energized)',
        visibility: { player: true, llm: true, agent: true, dev: true },
        ui: { widget: 'slider', group: 'needs', order: 2, icon: '⚡' },
        mutable: true,
      },

      social: {
        type: 'number',
        required: true,
        range: [0, 100] as const,
        default: 50,
        description: 'Social need (0=lonely, 100=fulfilled)',
        visibility: { player: true, llm: true, agent: true, dev: true },
        ui: { widget: 'slider', group: 'needs', order: 3, icon: '👥' },
        mutable: true,
      },
    },

    ui: {
      icon: '💚',
      color: '#4CAF50',
      priority: 2,
    },

    llm: {
      promptSection: 'Needs',
      priority: 20,
      summarize: (data) => {
        const status = (value: number) =>
          value > 70 ? 'satisfied' : value > 40 ? 'moderate' : 'low';
        return `Hunger: ${status(data.hunger)}, Energy: ${status(data.energy)}, Social: ${status(data.social)}`;
      },
    },

    validate: (data): data is NeedsComponent => {
      return (
        typeof data?.hunger === 'number' &&
        typeof data?.energy === 'number' &&
        typeof data?.social === 'number'
      );
    },

    createDefault: () => ({
      type: 'needs',
      version: 1,
      hunger: 50,
      energy: 100,
      social: 50,
    }),
  })
);
```

### Example 2: Query Component Schema

```typescript
import { ComponentRegistry } from '@ai-village/introspection';

// Get schema
const needsSchema = ComponentRegistry.get<NeedsComponent>('needs');

if (needsSchema) {
  // Access field metadata
  console.log('Hunger field:');
  console.log('  Type:', needsSchema.fields.hunger.type);
  console.log('  Range:', needsSchema.fields.hunger.range);
  console.log('  Description:', needsSchema.fields.hunger.description);
  console.log('  Mutable:', needsSchema.fields.hunger.mutable);

  // Access UI config
  console.log('UI icon:', needsSchema.ui?.icon);
  console.log('UI color:', needsSchema.ui?.color);

  // Access LLM config
  console.log('LLM section:', needsSchema.llm?.promptSection);
}

// Get all agent schemas
const agentSchemas = ComponentRegistry.getByCategory('agent');
console.log(`Found ${agentSchemas.length} agent schemas`);
for (const schema of agentSchemas) {
  console.log(`  - ${schema.type}: ${schema.description}`);
}
```

### Example 3: Mutate Component Fields

```typescript
import { MutationService } from '@ai-village/introspection';

// Enable dev mode for testing
MutationService.setDevMode(true);

// Mutate hunger
const result = MutationService.mutate(
  entity,
  'needs',
  'hunger',
  75,
  'system'
);

if (result.success) {
  console.log('Hunger updated to 75');
} else {
  console.error('Mutation failed:', result.error);
}

// Batch update all needs
const results = MutationService.mutateBatch([
  { entity, componentType: 'needs', fieldName: 'hunger', value: 80 },
  { entity, componentType: 'needs', fieldName: 'energy', value: 60 },
  { entity, componentType: 'needs', fieldName: 'social', value: 40 },
]);

if (results.every(r => r.success)) {
  console.log('All needs updated successfully');
}

// Undo the batch mutation
if (MutationService.canUndo()) {
  MutationService.undo();
  console.log('Undid batch mutation');
}
```

### Example 4: Generate Agent Self-Awareness Prompt

```typescript
import { AgentPromptRenderer } from '@ai-village/introspection';

// Generate prompt for agent (only agent-visible fields)
const prompt = AgentPromptRenderer.renderEntity(agent);

console.log(prompt);
```

**Output:**
```
## Identity
Name: Alice
Species: human
Age: 100 (0%)

## Needs
Hunger: 75 (75%)
Energy: 60 (60%)
Social: 40 (40%)

## Skills
Farming: 5.2
Crafting: 3.8
Combat: 1.5

## Memory
Recent events: 12
Spatial memories: 45
```

### Example 5: Auto-Generate Debug UI

```typescript
import { DevRenderer, MutationService } from '@ai-village/introspection';

const renderer = new DevRenderer({
  showGroups: true,
  fieldSpacing: 4,
  groupSpacing: 12,
});

// Initialize UI for needs component
renderer.initializeComponent(
  'needs',
  needsComponent,
  (fieldName, newValue) => {
    // Mutate component when field changes
    MutationService.mutate(entity, 'needs', fieldName, newValue, 'user');
  }
);

// Render in game loop
function renderDebugPanel(ctx: CanvasRenderingContext2D) {
  const x = 10;
  const y = 10;
  const width = 300;

  const height = renderer.render(ctx, 'needs', x, y, width);

  return height;
}

// Handle clicks
canvas.addEventListener('click', (event) => {
  const rect = canvas.getBoundingClientRect();
  const x = event.clientX - rect.left;
  const y = event.clientY - rect.top;

  renderer.handleClick('needs', x, y, 10, 10, 300);
});
```

### Example 6: Cache Rendered Components

```typescript
import { SchedulerRenderCache, MutationService } from '@ai-village/introspection';

const cache = new SchedulerRenderCache<HTMLElement>();

// Register cache for auto-invalidation on mutations
MutationService.registerRenderCache(cache);

function renderPlantComponent(entity: Entity): HTMLElement {
  const plant = entity.getComponent('plant');

  // Try cache first
  const cached = cache.get(entity.id, 'plant');
  if (cached) {
    return cached; // Cache hit!
  }

  // Cache miss - render component
  const div = document.createElement('div');
  div.textContent = `Plant: ${plant.speciesId}, Stage: ${plant.stage}`;

  // Store in cache
  cache.set(entity.id, 'plant', div, world.tick);

  return div;
}

// Update cache tick each frame
gameLoop.on('tick', (tick) => {
  cache.onTick(tick);
});

// Check cache performance
setInterval(() => {
  const stats = cache.getStats();
  console.log(`Cache hit rate: ${(stats.hitRate * 100).toFixed(1)}%`);
  console.log(`Cache size: ${stats.size} entries`);
  console.log(`Avg lifetime: ${stats.avgCacheLifetime} ticks`);
}, 5000);
```

---

## Architecture & Data Flow

### System Integration

```
1. Component Creation
   ↓ defineComponent()
2. Schema Registration
   ↓ autoRegister() or ComponentRegistry.register()
3. ComponentRegistry
   ↓ Stores schema metadata
4. Runtime Usage:

   A. Debug UI Path:
      ComponentRegistry.get()
        ↓ Schema retrieval
      DevRenderer.initializeComponent()
        ↓ Widget creation from schema
      DevRenderer.render()
        ↓ Canvas rendering
      User interaction
        ↓ Widget events
      MutationService.mutate()
        ↓ Validated mutation
      Component updated
        ↓ Cache invalidation
      DevRenderer.updateComponent()
        ↓ Widget refresh

   B. LLM Prompt Path:
      ComponentRegistry.get()
        ↓ Schema retrieval
      AgentPromptRenderer.renderEntity()
        ↓ Filter agent-visible fields
      Prompt generation
        ↓ Formatted text
      LLM receives context

   C. Mutation Path:
      User/System initiates change
        ↓
      MutationService.mutate()
        ↓ Validate against schema
      ValidationService.validate()
        ↓ Check constraints
      Entity.updateComponent()
        ↓ Apply change
      UndoStack.push()
        ↓ Record for undo/redo
      Emit 'mutated' event
        ↓
      RenderCache.invalidate()
        ↓ Clear cached render
      UI updates
```

### Event Flow

```
Schema Definition
  ↓ defineComponent()
ComponentRegistry
  ↓ autoRegister()
Schema Available

User Interaction
  ↓ Click widget
DevRenderer
  ↓ Call onChange callback
MutationService.mutate()
  ↓ Validate & apply
Component Updated
  ↓ Emit 'mutated' event
Observers
  ↓ React to change
RenderCache
  ↓ Invalidate cache
UI Updates
```

### Component Relationships

```
ComponentSchema
├── type: string (unique identifier)
├── version: number
├── category: ComponentCategory
├── fields: Record<string, FieldSchema>
│   ├── FieldSchema
│   │   ├── type: FieldType
│   │   ├── required: boolean
│   │   ├── visibility: Visibility
│   │   ├── ui: UIHints
│   │   └── mutable: boolean
│   └── ...
├── ui: UIConfig
├── llm: LLMConfig
├── renderers: CustomRenderers
├── mutators: Record<string, MutatorFunction>
├── validate: (data) => boolean
└── createDefault: () => Component
```

---

## Performance Considerations

**Optimization strategies:**

1. **Schema caching:** Schemas are registered once at import time, not per-component instance
2. **Lazy rendering:** UIs are only rendered when visible
3. **Render caching:** `SchedulerRenderCache` reduces redundant renders by 85-99%
4. **Event batching:** Mutation events are emitted after all mutations complete
5. **Widget reuse:** Widgets are initialized once, not recreated on every render

**Query caching:**

```typescript
// ❌ BAD: Query schema repeatedly
for (const entity of entities) {
  const schema = ComponentRegistry.get('needs'); // Query every iteration!
  renderComponent(entity, schema);
}

// ✅ GOOD: Query once, reuse
const schema = ComponentRegistry.get('needs'); // Query once
for (const entity of entities) {
  renderComponent(entity, schema);
}
```

**Render caching:**

```typescript
// ❌ BAD: Render every frame
function render() {
  const rendered = renderPlantComponent(plant); // Render every frame!
  display(rendered);
}

// ✅ GOOD: Use scheduler-aware cache
function render() {
  const cached = cache.get(entity.id, 'plant');
  if (cached) {
    display(cached); // Cache hit (99.7% for plants)
  } else {
    const rendered = renderPlantComponent(plant);
    cache.set(entity.id, 'plant', rendered, world.tick);
    display(rendered);
  }
}
```

**Visibility filtering:**

```typescript
// ❌ BAD: Include all fields in prompts
for (const [key, value] of Object.entries(component)) {
  prompt += `${key}: ${value}\n`;
}

// ✅ GOOD: Filter by visibility
for (const [fieldName, fieldSchema] of Object.entries(schema.fields)) {
  if (fieldSchema.visibility.llm === true) {
    const value = component[fieldName];
    prompt += `${fieldName}: ${value}\n`;
  }
}
```

---

## Troubleshooting

### Schema not found

**Error:** `No schema registered for component type 'identity'`

**Check:**
1. Schema file is imported somewhere in the application
2. `autoRegister()` is used or `ComponentRegistry.register()` is called manually
3. Schema `type` matches component `type` exactly (case-sensitive)

**Debug:**
```typescript
console.log('Registered schemas:', ComponentRegistry.list());
console.log('Has identity?', ComponentRegistry.has('identity'));
```

### Mutation validation failing

**Error:** `Validation failed: Value 999 exceeds maximum 100`

**Check:**
1. Field constraints in schema (`range`, `min`, `max`, `required`)
2. Value type matches field type
3. Enum values are valid (for enum fields)
4. Dev mode is enabled if mutating immutable fields

**Debug:**
```typescript
const schema = ComponentRegistry.get('needs');
console.log('Hunger constraints:');
console.log('  Type:', schema.fields.hunger.type);
console.log('  Range:', schema.fields.hunger.range);
console.log('  Required:', schema.fields.hunger.required);
console.log('  Mutable:', schema.fields.hunger.mutable);
```

### Field not visible in UI/prompts

**Check:**
1. `visibility.dev === true` for debug UI
2. `visibility.llm === true` for LLM prompts
3. `visibility.agent === true` for agent self-awareness
4. `visibility.player === true` for player UI

**Debug:**
```typescript
const schema = ComponentRegistry.get('needs');
console.log('Hunger visibility:', schema.fields.hunger.visibility);
```

### Widgets not rendering

**Check:**
1. `DevRenderer.initializeComponent()` called before rendering
2. Component type matches registered schema type
3. Field has `visibility.dev === true`
4. Widget type is valid (`'text'`, `'slider'`, `'dropdown'`, etc.)

**Debug:**
```typescript
const renderer = new DevRenderer();
renderer.initializeComponent('needs', needsComponent, () => {});
console.log('Registered components:', renderer.getComponentTypes());
```

### Cache not invalidating

**Check:**
1. `cache.onTick(tick)` is called every frame
2. `MutationService.registerRenderCache(cache)` was called
3. Mutations use `MutationService.mutate()` (not direct component updates)
4. Cache key is correct (`entityId:componentType`)

**Debug:**
```typescript
const stats = cache.getStats();
console.log('Cache stats:', stats);
console.log('Cached entities:', cache.getCachedEntities());
console.log('Cache details:', cache.getCacheDetails());
```

### Undo/redo not working

**Check:**
1. Mutations use `MutationService.mutate()` (not direct updates)
2. Custom mutators don't handle undo (only direct mutations are undoable)
3. Undo stack hasn't been cleared

**Debug:**
```typescript
console.log('Can undo?', MutationService.canUndo());
console.log('Can redo?', MutationService.canRedo());
```

---

## Integration with Other Systems

### ECS Integration

The introspection system integrates with the ECS via component schemas:

```typescript
// Define component
interface NeedsComponent extends Component {
  type: 'needs';
  version: 1;
  hunger: number;
  energy: number;
}

// Create schema
const NeedsSchema = autoRegister(defineComponent<NeedsComponent>({ /* ... */ }));

// Use in ECS
const entity = world.createEntity();
entity.addComponent(NeedsSchema.createDefault());

// Mutate via introspection
MutationService.mutate(entity, 'needs', 'hunger', 75);

// Generate prompts
const prompt = AgentPromptRenderer.renderEntity(entity);
```

### LLM Integration

The introspection system generates prompts for LLMs:

```typescript
import { AgentPromptRenderer } from '@ai-village/introspection';
import { generateBehavior } from '@ai-village/llm';

// Generate agent self-awareness prompt
const agentContext = AgentPromptRenderer.renderEntity(agent);

// Pass to LLM
const behavior = await generateBehavior({
  agentContext,
  worldState,
  recentEvents,
});
```

### Debug Panel Integration

The introspection system powers the debug panel:

```typescript
import { DevRenderer, MutationService } from '@ai-village/introspection';

class DebugPanel {
  private renderer = new DevRenderer();

  showEntity(entity: Entity) {
    // Initialize UI for all components
    for (const [type, component] of entity.components.entries()) {
      this.renderer.initializeComponent(type, component, (field, value) => {
        MutationService.mutate(entity, type, field, value, 'user');
      });
    }
  }

  render(ctx: CanvasRenderingContext2D) {
    let y = 10;
    for (const type of this.renderer.getComponentTypes()) {
      y += this.renderer.render(ctx, type, 10, y, 300);
    }
  }
}
```

---

## Testing

Run introspection tests:

```bash
npm test -- mutation.test.ts
npm test -- types.test.ts
```

**Key test files:**
- `src/__tests__/mutation.test.ts` - Mutation system tests
- `src/__tests__/types.test.ts` - Type validation tests

---

## Further Reading

- **SYSTEMS_CATALOG.md** - Complete system reference (introspection systems not cataloged)
- **COMPONENTS_REFERENCE.md** - All 125+ component types with introspection schemas
- **METASYSTEMS_GUIDE.md** - Metasystems that use introspection (Consciousness, Divinity)
- **PERFORMANCE.md** - Performance optimization guide
- **example-usage.ts** - Complete usage examples

---

## Summary for Language Models

**Before working with introspection:**
1. Read this README completely to understand schema structure, mutation system, and rendering
2. Understand visibility rules (player/llm/agent/dev) and their implications
3. Know the difference between `AgentPromptRenderer` (agent self-awareness) and `PromptRenderer` (world context)
4. Understand mutation validation and undo/redo mechanics
5. Know how to query schemas from `ComponentRegistry`

**Common tasks:**
- **Define schema:** Use `autoRegister(defineComponent<T>({ ... }))` pattern
- **Query schema:** `ComponentRegistry.get<T>('type')` with type narrowing
- **Mutate field:** `MutationService.mutate(entity, type, field, value)`
- **Generate agent prompt:** `AgentPromptRenderer.renderEntity(agent)`
- **Generate LLM prompt:** `PromptRenderer.renderEntity(entity)`
- **Auto-generate UI:** `DevRenderer.initializeComponent()` then `render()`
- **Cache renders:** `SchedulerRenderCache.get()/set()` with tick-based invalidation

**Critical rules:**
- Always define schemas with `defineComponent()` for type safety
- Use `autoRegister()` to ensure schemas are registered on import
- Never mutate components directly - use `MutationService.mutate()` for validation and undo/redo
- Always set `description` for fields where `visibility.llm === true` (LLMs need context)
- Cache schemas - don't query `ComponentRegistry` in loops
- Use visibility filtering - don't expose all fields to all consumers
- Register render caches with `MutationService` for auto-invalidation on mutations
- Call `cache.onTick(tick)` every frame to enable scheduler-based invalidation

**Event-driven architecture:**
- Listen to `'mutated'` events from `MutationService` for component changes
- Emit mutations through `MutationService.mutate()` (never bypass)
- Never modify components directly - always use the mutation system
- Render caches automatically invalidate on mutations via `MutationService` integration

**Schema design best practices:**
- Group related fields with `ui.group`
- Order fields logically with `ui.order`
- Provide clear descriptions for all LLM-visible fields
- Set appropriate visibility for each field (don't over-expose)
- Mark fields as immutable unless they should be user-editable
- Provide `validate()` for runtime type checking
- Provide `createDefault()` for factory instantiation
- Use `llm.summarize()` for concise component summaries
