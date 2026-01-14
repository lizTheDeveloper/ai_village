# Introspection Package - Schema-Driven Component Metadata System

> **For Language Models:** This README is optimized for LM understanding. Read this document completely before working with the introspection system to understand its architecture, interfaces, and usage patterns.

## Overview

The **Introspection Package** (`@ai-village/introspection`) implements a comprehensive schema-driven metadata system that allows the game engine to introspect, validate, mutate, and render component data across multiple contexts.

**What it does:**
- **Schema Definition**: Define component metadata with field types, constraints, visibility, and UI hints
- **Component Registry**: Centralized registry for component schemas with type-safe queries
- **Mutation System**: Validated, reversible component mutations with event emission and undo/redo
- **Multi-Context Rendering**: Auto-generate UIs for dev tools, player interfaces, and LLM prompts
- **Validation**: Runtime validation of component data against schemas
- **Caching**: Scheduler-aware render caching that reduces redundant renders by 85-99%

**Key benefits:**
- **Single source of truth**: Define component structure once, use everywhere
- **Type safety**: Full TypeScript type inference from schemas
- **Self-documenting**: Schemas serve as living documentation for components
- **LLM integration**: Automatic prompt generation for agent self-awareness
- **Developer tools**: Auto-generated debug UIs from schemas
- **Performance**: Intelligent caching based on system update frequencies

**Key files:**
- `src/types/ComponentSchema.ts` - Core schema interface and `defineComponent()` helper
- `src/registry/ComponentRegistry.ts` - Singleton registry for all component schemas
- `src/mutation/MutationService.ts` - Validated mutation system with undo/redo
- `src/prompt/PromptRenderer.ts` - LLM prompt generation from schemas
- `src/renderers/DevRenderer.ts` - Auto-generated dev UI renderer
- `src/cache/RenderCache.ts` - Scheduler-based render caching
- `src/schemas/` - 125+ component schema definitions

---

## Package Structure

```
packages/introspection/
├── src/
│   ├── types/
│   │   ├── ComponentSchema.ts        # Core schema interface
│   │   ├── FieldSchema.ts            # Field metadata definition
│   │   ├── FieldTypes.ts             # Field type definitions
│   │   ├── CategoryTypes.ts          # Component categories
│   │   ├── VisibilityTypes.ts        # Visibility flags (player/llm/agent/dev)
│   │   ├── UIHints.ts                # UI rendering hints
│   │   ├── MutabilityTypes.ts        # Mutation permissions
│   │   ├── LLMConfig.ts              # LLM prompt configuration
│   │   └── WidgetTypes.ts            # UI widget types
│   ├── core/
│   │   ├── validateSchema.ts         # Schema validation
│   │   └── index.ts
│   ├── registry/
│   │   ├── ComponentRegistry.ts      # Global schema registry
│   │   ├── autoRegister.ts           # Auto-registration helper
│   │   └── index.ts
│   ├── mutation/
│   │   ├── MutationService.ts        # Central mutation service
│   │   ├── ValidationService.ts      # Field validation
│   │   ├── UndoStack.ts              # Undo/redo stack
│   │   ├── MutationEvent.ts          # Mutation event types
│   │   └── index.ts
│   ├── prompt/
│   │   ├── PromptRenderer.ts         # LLM prompt generation
│   │   ├── AgentPromptRenderer.ts    # Agent-specific prompts
│   │   └── index.ts
│   ├── renderers/
│   │   ├── DevRenderer.ts            # Dev UI renderer (canvas)
│   │   ├── CachedDevRenderer.ts      # Cached dev renderer
│   │   ├── PlayerRenderer.ts         # Player UI renderer (abstract)
│   │   ├── PlayerCanvasRenderer.ts   # Canvas player UI
│   │   ├── PlayerDOMRenderer.ts      # DOM player UI
│   │   └── widgets/                  # UI widget implementations
│   │       ├── WidgetFactory.ts      # Widget creation
│   │       ├── TextWidget.ts
│   │       ├── SliderWidget.ts
│   │       ├── CheckboxWidget.ts
│   │       ├── DropdownWidget.ts
│   │       ├── ReadonlyWidget.ts
│   │       └── JsonWidget.ts
│   ├── cache/
│   │   ├── RenderCache.ts            # Scheduler-aware cache
│   │   ├── CacheMetrics.ts           # Cache statistics
│   │   └── index.ts
│   ├── schemas/                       # 125+ component schemas
│   │   ├── agent/                    # Agent components (18 schemas)
│   │   ├── cognitive/                # Memory, beliefs, goals (20 schemas)
│   │   ├── physical/                 # Body, movement, resources (12 schemas)
│   │   ├── social/                   # Relationships, economy, conflict (15 schemas)
│   │   ├── magic/                    # Divinity, spells, lore (7 schemas)
│   │   ├── world/                    # Buildings, weather, realms (30 schemas)
│   │   ├── system/                   # Internal systems (12 schemas)
│   │   ├── afterlife/                # Death, judgment, bargains (5 schemas)
│   │   └── index.ts
│   ├── utils/
│   │   ├── typeGuards.ts             # Runtime type guards
│   │   └── index.ts
│   └── index.ts                       # Package exports
├── example-usage.ts                   # Example usage and tests
├── package.json
└── README.md                          # This file
```

---

## Core Concepts

### 1. Component Schemas

A **ComponentSchema** defines the complete metadata for a component type:

```typescript
interface ComponentSchema<T extends Component> {
  type: string;                          // Component type identifier ('identity', 'agent', etc.)
  version: number;                       // Schema version for migrations
  category: ComponentCategory;           // Logical grouping ('agent', 'physical', etc.)
  description?: string;                  // Human-readable description

  fields: Record<string, FieldSchema>;   // Field definitions with full metadata

  ui?: UIConfig;                         // Component-level UI configuration
  llm?: LLMConfig<T>;                    // LLM prompt configuration
  dev?: DevConfig;                       // Developer tools config

  renderers?: {                          // Custom renderers (optional)
    player?: (data: T) => string | CanvasRenderable;
    dev?: (data: T, mutate: any) => HTMLElement;
    llm?: (data: T) => string;
  };

  mutators?: Record<string, MutatorFunction<T>>;  // Custom mutation handlers

  validate?(data: unknown): data is T;   // Runtime validation
  createDefault?(): T;                   // Default instance factory
}
```

**Component categories** (9 types):
- `core`: Fundamental components (identity, position, sprite)
- `agent`: Agent-specific (personality, skills, needs)
- `physical`: Physical attributes (health, inventory, equipment)
- `social`: Social systems (relationships, reputation, economy)
- `cognitive`: Cognitive systems (memory, goals, beliefs)
- `magic`: Magic systems (mana, spells, paradigms, divinity)
- `world`: World systems (time, weather, terrain, buildings)
- `system`: Internal systems (steering, pathfinding, debug)
- `afterlife`: Afterlife/spiritual systems (death, judgment, bargains)

### 2. Field Schemas

Each field in a component has a **FieldSchema** defining its properties:

```typescript
interface FieldSchema {
  // Type information
  type: FieldType;                       // 'string', 'number', 'boolean', 'enum', 'array', 'map', 'object'
  itemType?: FieldType;                  // For arrays/maps
  enumValues?: readonly string[];        // For enum fields

  // Constraints
  required: boolean;                     // Is field required?
  default?: unknown;                     // Default value
  range?: [number, number];              // Min/max for numbers
  maxLength?: number;                    // Max length for strings/arrays

  // Documentation
  description?: string;                  // Field description
  displayName?: string;                  // Display name (defaults to field key)

  // Visibility
  visibility: Visibility;                // Who can see this field

  // UI hints
  ui?: UIHints;                          // Widget type, grouping, order

  // Mutation
  mutable?: boolean;                     // Can field be edited?
  mutateVia?: string;                    // Use custom mutator instead of direct set
}
```

**Visibility flags** control who sees each field:

```typescript
interface Visibility {
  player: boolean;                       // Player-facing UI
  llm: boolean | 'summarized';           // LLM prompts (true = detailed, 'summarized' = use summarize function)
  agent: boolean | 'summarized';         // Agent self-awareness
  user: boolean;                         // User settings UI
  dev: boolean;                          // Developer debug tools
}
```

**UI hints** control how fields render:

```typescript
interface UIHints {
  widget: WidgetType;                    // 'text', 'slider', 'checkbox', 'dropdown', 'json', 'readonly'
  group?: string;                        // Group name for organizing fields
  order?: number;                        // Display order within group
}
```

### 3. Defining Component Schemas

Use `defineComponent()` to define schemas with full type inference:

```typescript
import { defineComponent, autoRegister } from '@ai-village/introspection';
import type { Component } from '@ai-village/introspection';

// Define component type
interface IdentityComponent extends Component {
  type: 'identity';
  version: 1;
  name: string;
  species: 'human' | 'elf' | 'dwarf';
  age: number;
}

// Create schema with type inference
export const IdentitySchema = autoRegister(
  defineComponent<IdentityComponent>({
    type: 'identity',
    version: 1,
    category: 'core',
    description: 'Core identity information for entities',

    fields: {
      name: {
        type: 'string',
        required: true,
        description: 'Entity name',
        visibility: { player: true, llm: true, agent: true, user: false, dev: true },
        ui: { widget: 'text', group: 'basic', order: 1 },
        mutable: true,
      },
      species: {
        type: 'enum',
        enumValues: ['human', 'elf', 'dwarf'] as const,
        required: true,
        description: 'Species type',
        visibility: { player: true, llm: true, agent: true, user: false, dev: true },
        ui: { widget: 'dropdown', group: 'basic', order: 2 },
        mutable: false,  // Species can't change
      },
      age: {
        type: 'number',
        required: true,
        range: [0, 10000],
        description: 'Age in days',
        visibility: { player: true, llm: true, agent: true, user: false, dev: true },
        ui: { widget: 'slider', group: 'basic', order: 3 },
        mutable: true,
      },
    },

    // Optional: Runtime validation
    validate: (data): data is IdentityComponent => {
      return typeof data === 'object'
        && data !== null
        && (data as any).type === 'identity'
        && typeof (data as any).name === 'string'
        && typeof (data as any).age === 'number';
    },

    // Optional: Default instance factory
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

**Auto-registration:** `autoRegister()` registers the schema immediately when imported.

### 4. Component Registry

The **ComponentRegistry** is a singleton that stores all component schemas:

```typescript
import { ComponentRegistry } from '@ai-village/introspection';

// Manual registration (if not using autoRegister)
ComponentRegistry.register(IdentitySchema);

// Retrieve schema (type-safe)
const schema = ComponentRegistry.get('identity');
if (schema) {
  console.log('Type:', schema.type);
  console.log('Fields:', Object.keys(schema.fields));
}

// Check existence
const hasIdentity = ComponentRegistry.has('identity');

// List all registered types
const allTypes = ComponentRegistry.list();  // ['identity', 'agent', 'position', ...]

// Get by category
const agentSchemas = ComponentRegistry.getByCategory('agent');

// Get all schemas
const allSchemas = ComponentRegistry.getAll();

// Count registered schemas
const count = ComponentRegistry.count();
```

### 5. Mutation System

The **MutationService** provides validated, reversible mutations with undo/redo:

```typescript
import { MutationService } from '@ai-village/introspection';

// Enable dev mode to allow mutation of all fields (bypasses mutable checks)
MutationService.setDevMode(true);

// Mutate a field
const result = MutationService.mutate(
  entity,              // Entity to mutate
  'identity',          // Component type
  'name',              // Field name
  'New Name',          // New value
  'user'               // Source: 'system' | 'user' | 'llm' | 'dev'
);

if (result.success) {
  console.log('Mutation succeeded');
} else {
  console.error('Mutation failed:', result.error);
}

// Batch mutations (all-or-nothing)
const results = MutationService.mutateBatch([
  { entity, componentType: 'identity', fieldName: 'name', value: 'Alice' },
  { entity, componentType: 'identity', fieldName: 'age', value: 25 },
]);

// Undo/Redo
if (MutationService.canUndo()) {
  MutationService.undo();
}
if (MutationService.canRedo()) {
  MutationService.redo();
}

// Subscribe to mutation events
MutationService.on('mutated', (event) => {
  console.log('Field mutated:', event.componentType, event.fieldName);
  console.log('Old value:', event.oldValue);
  console.log('New value:', event.newValue);
});

// Clear undo history
MutationService.clearHistory();
```

**Mutation validation:**
- **Type checking**: Ensures value matches field type
- **Range checking**: Validates numbers are within range
- **Enum checking**: Validates enum values are valid
- **Required checking**: Ensures required fields are not null/undefined
- **Mutability checking**: Ensures field is mutable (or dev mode enabled)
- **Custom mutators**: Uses custom mutation handlers if defined in schema

**Custom mutators:**

```typescript
export const HealthSchema = defineComponent<HealthComponent>({
  type: 'health',
  fields: {
    current: {
      type: 'number',
      mutable: true,
      mutateVia: 'setHealth',  // Use custom mutator
    },
  },
  mutators: {
    setHealth: (entity, newValue: number) => {
      // Custom logic: clamp to [0, max], emit events, etc.
      const health = entity.getComponent('health');
      const clamped = Math.max(0, Math.min(newValue, health.max));
      entity.updateComponent('health', (h) => ({ ...h, current: clamped }));
      // Emit custom events, trigger side effects, etc.
    },
  },
});
```

### 6. LLM Prompt Rendering

The **PromptRenderer** auto-generates LLM prompts from schemas:

```typescript
import { PromptRenderer } from '@ai-village/introspection';

// Render all LLM-visible components for an entity
const prompt = PromptRenderer.renderEntity(entity, world);

// Output example:
// ## Identity
// Name: Alice
// Species: human
// Age: 25 (2%)
//
// ## Agent
// Behavior: wander
// AI-Powered: yes
//
// ## Needs
// Hunger: 45 (45%)
// Thirst: 80 (80%)

// Render single component
const schema = ComponentRegistry.get('identity');
const componentPrompt = PromptRenderer.renderComponent(
  entity.getComponent('identity'),
  schema,
  context  // Optional: for entity ID resolution
);
```

**LLM configuration in schemas:**

```typescript
fields: {
  name: {
    type: 'string',
    visibility: { llm: true },  // Include in prompts
    llm: {
      promptLabel: 'Name',       // Custom label (defaults to displayName or field key)
      promptSection: 'Identity', // Section grouping
      alwaysInclude: true,       // Include even if empty
      format: (value) => value.toUpperCase(),  // Custom formatter
    },
  },
  behaviorState: {
    type: 'object',
    visibility: { llm: 'summarized' },  // Use summarize function
  },
},
llm: {
  priority: 10,                  // Lower = earlier in prompt (default: 100)
  promptSection: 'Agent State',  // Component-level section
  includeFieldNames: true,       // Include field names in output (default: true)
  maxLength: 500,                // Max characters for summarized output
  summarize: (component, context) => {
    // Custom summarization function
    return `Agent is currently ${component.behavior}`;
  },
  template: 'Name: {name}, Age: {age}',  // Template string (alternative to field-by-field)
},
```

**Visibility modes:**
- `llm: true` → Include field in detailed prompt
- `llm: 'summarized'` → Include via `summarize` function (more compact)
- `llm: false` → Exclude from prompts

### 7. Dev UI Rendering

The **DevRenderer** auto-generates canvas-based debug UIs:

```typescript
import { DevRenderer } from '@ai-village/introspection';

const renderer = new DevRenderer({
  showGroups: true,      // Show group headers
  fieldSpacing: 4,       // Pixels between fields
  groupSpacing: 12,      // Pixels between groups
});

// Initialize component for rendering
renderer.initializeComponent(
  'identity',
  entity.getComponent('identity'),
  (fieldName, newValue) => {
    // Handle field changes
    MutationService.mutate(entity, 'identity', fieldName, newValue, 'dev');
  }
);

// Render to canvas
const height = renderer.render(
  ctx,                   // Canvas 2D context
  'identity',            // Component type
  x,                     // X position
  y,                     // Y position
  width                  // Width
);

// Handle click events
const handled = renderer.handleClick(
  'identity',
  clickX,
  clickY,
  componentX,
  componentY,
  componentWidth
);

// Update component data (refresh widgets)
renderer.updateComponent('identity', entity.getComponent('identity'));

// Clear all widgets
renderer.clear();
```

**Widgets** are auto-created based on `ui.widget` field:
- `text`: Text input
- `slider`: Number slider (with range)
- `checkbox`: Boolean toggle
- `dropdown`: Enum selector
- `json`: JSON editor (for objects/arrays)
- `readonly`: Read-only display

### 8. Render Caching

The **SchedulerRenderCache** uses scheduler update frequencies to cache renders:

```typescript
import { SchedulerRenderCache } from '@ai-village/introspection';

const cache = new SchedulerRenderCache<string>();

// Try to get cached render
const cachedRender = cache.get(entityId, 'agent');
if (cachedRender) {
  // Use cached output
  return cachedRender;
}

// Cache miss - render and store
const rendered = renderComponent(component);
cache.set(entityId, 'agent', rendered, currentTick);

// Update tick (invalidates expired entries)
cache.onTick(world.tick);

// Manual invalidation (when component mutated outside scheduler)
cache.invalidate(entityId, 'agent');
cache.invalidateEntity(entityId);  // All components for entity
cache.invalidateComponentType('agent');  // All entities with component

// Check if cached
const isCached = cache.has(entityId, 'agent');

// Get statistics
const stats = cache.getStats();
console.log('Hit rate:', stats.hitRate);  // 0.85-0.99 typical
console.log('Cache size:', stats.size);
console.log('Memory usage:', stats.memoryUsage);

// Clear cache
cache.clear();

// Register with MutationService for automatic invalidation
MutationService.registerRenderCache(cache);
```

**Cache behavior:**
- **Scheduler-based expiry**: Cache until next system update (based on `SimulationScheduler` config)
- **Agent component**: Updates every tick → 67% cache hit
- **Plant component**: Updates every 86400 ticks → 99.7% cache hit
- **Manual invalidation**: Mutations trigger cache invalidation via `MutationService`

---

## API Reference

### defineComponent()

```typescript
function defineComponent<T extends Component>(
  schema: ComponentSchema<T>
): ComponentSchema<T>
```

Helper function for defining component schemas with full type inference.

### autoRegister()

```typescript
function autoRegister<T extends Component>(
  schema: ComponentSchema<T>
): ComponentSchema<T>
```

Automatically registers schema with `ComponentRegistry` when imported.

### ComponentRegistry

```typescript
class ComponentRegistry {
  static register<T>(schema: ComponentSchema<T>): void;
  static get<T>(type: string): ComponentSchema<T> | undefined;
  static has(type: string): boolean;
  static list(): string[];
  static getByCategory(category: ComponentCategory): ComponentSchema<any>[];
  static getAll(): ComponentSchema<any>[];
  static count(): number;
  static clear(): void;
}
```

### MutationService

```typescript
class MutationService {
  static setDevMode(enabled: boolean): void;
  static mutate<T>(
    entity: Entity,
    componentType: string,
    fieldName: string,
    value: unknown,
    source?: MutationSource
  ): MutationResult;
  static mutateBatch(mutations: MutationRequest[]): MutationResult[];
  static undo(): boolean;
  static redo(): boolean;
  static canUndo(): boolean;
  static canRedo(): boolean;
  static clearHistory(): void;
  static on(event: 'mutated', handler: MutationEventHandler): void;
  static off(event: 'mutated', handler: MutationEventHandler): void;
  static registerRenderCache(cache: SchedulerRenderCache<any>): void;
  static unregisterRenderCache(cache: SchedulerRenderCache<any>): void;
}
```

### PromptRenderer

```typescript
class PromptRenderer {
  static renderEntity(
    entity: { id: string; components: Map<string, any> },
    world?: any
  ): string;
  static renderComponent<T>(
    component: T,
    schema: ComponentSchema<T>,
    context?: SummarizeContext
  ): string;
}
```

### DevRenderer

```typescript
class DevRenderer {
  constructor(options?: DevRenderOptions);
  initializeComponent(
    componentType: string,
    componentData: Component,
    onFieldChange: (fieldName: string, newValue: unknown) => void
  ): void;
  render(
    ctx: CanvasRenderingContext2D,
    componentType: string,
    x: number,
    y: number,
    width: number
  ): number;
  updateComponent(componentType: string, componentData: Component): void;
  handleClick(
    componentType: string,
    x: number,
    y: number,
    componentX: number,
    componentY: number,
    componentWidth: number
  ): boolean;
  clear(): void;
  getComponentTypes(): string[];
}
```

### SchedulerRenderCache

```typescript
class SchedulerRenderCache<T = any> {
  get(entityId: string, componentType: string): T | null;
  set(entityId: string, componentType: string, renderedOutput: T, currentTick: number): void;
  has(entityId: string, componentType: string): boolean;
  invalidate(entityId: string, componentType: string): void;
  invalidateEntity(entityId: string): void;
  invalidateComponentType(componentType: string): void;
  onTick(tick: number): void;
  clear(): void;
  getStats(): CacheStats;
  resetStats(): void;
  getCachedEntities(): string[];
  getCacheDetails(): Array<{
    entityId: string;
    componentType: string;
    age: number;
    ticksUntilExpiry: number;
    invalidated: boolean;
  }>;
}
```

---

## Usage Examples

### Example 1: Defining a Component Schema

```typescript
import { defineComponent, autoRegister, type Component } from '@ai-village/introspection';

interface NeedsComponent extends Component {
  type: 'needs';
  version: 1;
  hunger: number;
  thirst: number;
  energy: number;
}

export const NeedsSchema = autoRegister(
  defineComponent<NeedsComponent>({
    type: 'needs',
    version: 1,
    category: 'agent',
    description: 'Agent survival needs',

    fields: {
      hunger: {
        type: 'number',
        required: true,
        range: [0, 100],
        default: 50,
        description: 'Hunger level (0 = starving, 100 = full)',
        displayName: 'Hunger',
        visibility: { player: true, llm: true, agent: true, user: false, dev: true },
        ui: { widget: 'slider', group: 'survival', order: 1 },
        mutable: true,
      },
      thirst: {
        type: 'number',
        required: true,
        range: [0, 100],
        default: 50,
        description: 'Thirst level (0 = dehydrated, 100 = hydrated)',
        displayName: 'Thirst',
        visibility: { player: true, llm: true, agent: true, user: false, dev: true },
        ui: { widget: 'slider', group: 'survival', order: 2 },
        mutable: true,
      },
      energy: {
        type: 'number',
        required: true,
        range: [0, 100],
        default: 75,
        description: 'Energy level (0 = exhausted, 100 = rested)',
        displayName: 'Energy',
        visibility: { player: true, llm: true, agent: true, user: false, dev: true },
        ui: { widget: 'slider', group: 'survival', order: 3 },
        mutable: true,
      },
    },

    llm: {
      priority: 20,  // Show early in prompt
      promptSection: 'Needs',
    },

    validate: (data): data is NeedsComponent => {
      return typeof data === 'object'
        && data !== null
        && (data as any).type === 'needs'
        && typeof (data as any).hunger === 'number'
        && typeof (data as any).thirst === 'number'
        && typeof (data as any).energy === 'number';
    },

    createDefault: () => ({
      type: 'needs',
      version: 1,
      hunger: 50,
      thirst: 50,
      energy: 75,
    }),
  })
);
```

### Example 2: Querying the Registry

```typescript
import { ComponentRegistry } from '@ai-village/introspection';

// Get schema
const needsSchema = ComponentRegistry.get('needs');
if (needsSchema) {
  console.log('Fields:', Object.keys(needsSchema.fields));
  console.log('Category:', needsSchema.category);
}

// Get all agent-related schemas
const agentSchemas = ComponentRegistry.getByCategory('agent');
console.log('Agent schemas:', agentSchemas.map(s => s.type));

// List all registered types
const allTypes = ComponentRegistry.list();
console.log('Total schemas:', allTypes.length);
```

### Example 3: Mutating Component Data

```typescript
import { MutationService } from '@ai-village/introspection';

// Get entity with needs component
const entity = world.getEntity(entityId);

// Mutate hunger field
const result = MutationService.mutate(
  entity,
  'needs',
  'hunger',
  75,
  'system'  // Source: system update
);

if (result.success) {
  console.log('Hunger updated to 75');
} else {
  console.error('Failed to update hunger:', result.error);
}

// Subscribe to mutation events
MutationService.on('mutated', (event) => {
  if (event.componentType === 'needs' && event.fieldName === 'hunger') {
    console.log('Hunger changed from', event.oldValue, 'to', event.newValue);
  }
});

// Undo mutation
if (MutationService.canUndo()) {
  MutationService.undo();
  console.log('Undid hunger update');
}
```

### Example 4: Generating LLM Prompts

```typescript
import { PromptRenderer } from '@ai-village/introspection';

// Generate prompt for entity
const entity = world.getEntity(entityId);
const prompt = PromptRenderer.renderEntity(entity, world);

console.log(prompt);
// Output:
// ## Identity
// Name: Alice
// Species: human
// Age: 25
//
// ## Needs
// Hunger: 75 (75%)
// Thirst: 60 (60%)
// Energy: 80 (80%)
//
// ## Agent
// Behavior: wander
// AI-Powered: yes
```

### Example 5: Rendering Dev UI

```typescript
import { DevRenderer, MutationService } from '@ai-village/introspection';

const renderer = new DevRenderer();

// Initialize for entity's needs component
const needs = entity.getComponent('needs');
renderer.initializeComponent(
  'needs',
  needs,
  (fieldName, newValue) => {
    // Handle field changes
    MutationService.mutate(entity, 'needs', fieldName, newValue, 'dev');
  }
);

// Render to canvas
function renderDevPanel(ctx: CanvasRenderingContext2D) {
  const height = renderer.render(ctx, 'needs', 10, 10, 300);
  console.log('Rendered height:', height);
}

// Handle clicks
function handleClick(x: number, y: number) {
  const handled = renderer.handleClick('needs', x, y, 10, 10, 300);
  if (handled) {
    console.log('Widget clicked');
  }
}

// Update when component changes
function onComponentUpdate() {
  const updatedNeeds = entity.getComponent('needs');
  renderer.updateComponent('needs', updatedNeeds);
}
```

### Example 6: Using Render Cache

```typescript
import { SchedulerRenderCache, MutationService } from '@ai-village/introspection';

const cache = new SchedulerRenderCache<HTMLElement>();

// Register with MutationService for automatic invalidation
MutationService.registerRenderCache(cache);

function renderNeedsPanel(entityId: string): HTMLElement {
  // Try cache first
  const cached = cache.get(entityId, 'needs');
  if (cached) {
    console.log('Cache hit!');
    return cached;
  }

  // Cache miss - render
  console.log('Cache miss - rendering');
  const element = document.createElement('div');
  const needs = entity.getComponent('needs');
  element.textContent = `Hunger: ${needs.hunger}, Thirst: ${needs.thirst}`;

  // Store in cache
  cache.set(entityId, 'needs', element, world.tick);

  return element;
}

// Update tick every frame
function onTick() {
  cache.onTick(world.tick);
}

// Check stats
const stats = cache.getStats();
console.log('Cache hit rate:', (stats.hitRate * 100).toFixed(1) + '%');
console.log('Cache size:', stats.size);
```

### Example 7: Custom Summarization for LLM

```typescript
export const InventorySchema = autoRegister(
  defineComponent<InventoryComponent>({
    type: 'inventory',
    version: 1,
    category: 'physical',

    fields: {
      slots: {
        type: 'array',
        itemType: 'object',
        required: true,
        visibility: { llm: 'summarized' },  // Use summarize function
      },
      capacity: {
        type: 'number',
        required: true,
        visibility: { llm: true },
      },
    },

    llm: {
      priority: 30,
      promptSection: 'Inventory',
      summarize: (inventory, context) => {
        // Custom summarization logic
        const items = inventory.slots.filter(s => s.itemId);
        if (items.length === 0) {
          return 'Inventory: empty';
        }

        const summary = items
          .map(slot => `${slot.itemId} ×${slot.quantity}`)
          .join(', ');

        return `Inventory (${items.length}/${inventory.capacity}): ${summary}`;
      },
    },
  })
);

// LLM prompt output:
// ## Inventory
// Inventory (3/10): wood ×5, stone ×12, berries ×3
```

---

## Architecture & Data Flow

### Schema Definition Flow

```
1. Define component interface
   ↓
2. Create schema with defineComponent<T>()
   ↓
3. Wrap with autoRegister() for auto-registration
   ↓
4. Export schema
   ↓
5. Schema auto-registers when imported
   ↓
6. ComponentRegistry has schema available
```

### Mutation Flow

```
User/System triggers mutation
   ↓
MutationService.mutate(entity, type, field, value, source)
   ↓
1. Validate entity has component
2. Get schema from ComponentRegistry
3. Validate mutation (type, range, enum, mutability)
4. Check for custom mutator (mutateVia)
   ↓
5a. Custom mutator path:
    → Execute mutator function
    → Mutator handles update + events
    → Return success
   ↓
5b. Standard mutation path:
    → Create mutation command
    → Execute mutation
    → Push to undo stack
    → Invalidate render caches
    → Emit 'mutated' event
    → Validate full component (optional)
    → Return success
   ↓
Listeners receive mutation event
   ↓
Render caches invalidated
   ↓
Next render uses fresh data
```

### LLM Prompt Generation Flow

```
PromptRenderer.renderEntity(entity, world)
   ↓
For each component in entity:
   1. Get schema from ComponentRegistry
   2. Check if any fields have visibility.llm === true
   3. Skip if no LLM-visible fields
   ↓
   4. Use custom llm renderer if provided
      → Return custom output
   ↓
   5. Check for summarize function
      → Use if any field has visibility.llm === 'summarized'
      → Return summarized output
   ↓
   6. Use template if provided
      → Replace {fieldName} placeholders
      → Return templated output
   ↓
   7. Generate detailed field-by-field output
      → Group fields by promptSection
      → Filter LLM-visible fields
      → Skip empty/default values (unless alwaysInclude)
      → Format values by type
      → Return detailed output
   ↓
Sort all sections by priority
   ↓
Combine sections with ## headers
   ↓
Return complete prompt
```

### Render Cache Flow

```
Renderer requests component render
   ↓
cache.get(entityId, componentType)
   ↓
Check if cached:
   1. No entry → cache miss
   2. Past nextUpdateTick → cache miss (expired)
   3. Manually invalidated → cache miss
   4. Otherwise → cache hit
   ↓
Cache miss:
   → Render component
   → Get update interval from SimulationScheduler
   → Calculate nextUpdateTick = currentTick + updateInterval
   → cache.set(entityId, componentType, rendered, currentTick)
   → Return rendered
   ↓
Cache hit:
   → Return cached output
   ↓
On mutation:
   → MutationService invalidates cache entry
   → Next render will be cache miss
   ↓
On tick:
   → cache.onTick(tick) updates currentTick
   → Prunes expired entries
```

### Component Categories & Organization

```
core/          → identity, position, renderable (fundamental)
agent/         → agent, personality, skills, needs, mood, profession
physical/      → body, movement, health, inventory, equipment, species
social/        → relationships, reputation, currency, trade, conflict
cognitive/     → memory, goals, beliefs, knowledge, discovery
magic/         → mana, spells, paradigms, divinity, myths, lore
world/         → time, weather, buildings, resources, realms, portals
system/        → steering, pathfinding, vision, recording, debug
afterlife/     → death, judgment, bargains, reincarnation
```

---

## Integration with Other Systems

### LLM Package Integration

The LLM package uses introspection for prompt generation:

```typescript
import { PromptRenderer } from '@ai-village/introspection';
import { LLMService } from '@ai-village/llm';

// Generate agent self-awareness prompt
const prompt = PromptRenderer.renderEntity(agentEntity, world);

// Send to LLM
const response = await LLMService.sendPrompt({
  systemPrompt: 'You are an agent in a simulation.',
  userPrompt: prompt,
  agentId: agentEntity.id,
});
```

### Admin Dashboard Integration

The admin dashboard uses introspection for component editing:

```typescript
import { ComponentRegistry, MutationService } from '@ai-village/introspection';

// Get all editable fields for a component
const schema = ComponentRegistry.get('agent');
const editableFields = Object.entries(schema.fields)
  .filter(([_, field]) => field.mutable && field.visibility.dev)
  .map(([name, field]) => ({ name, field }));

// Generate edit UI
for (const { name, field } of editableFields) {
  renderFieldEditor(name, field, (newValue) => {
    MutationService.mutate(entity, 'agent', name, newValue, 'user');
  });
}
```

### Renderer Package Integration

The renderer package uses introspection for dev panels:

```typescript
import { DevRenderer } from '@ai-village/introspection';

class AgentInfoPanel {
  private devRenderer = new DevRenderer();

  renderComponent(componentType: string, component: Component) {
    this.devRenderer.initializeComponent(
      componentType,
      component,
      (fieldName, newValue) => {
        MutationService.mutate(entity, componentType, fieldName, newValue, 'dev');
      }
    );

    return this.devRenderer.render(this.ctx, componentType, x, y, width);
  }
}
```

### Persistence Integration

Schemas provide validation for save/load:

```typescript
import { ComponentRegistry } from '@ai-village/introspection';

// Validate loaded component data
function validateComponent(type: string, data: unknown): boolean {
  const schema = ComponentRegistry.get(type);
  if (!schema || !schema.validate) {
    return true;  // No validation available
  }

  return schema.validate(data);
}

// Create default component if data corrupted
function recoverComponent(type: string): Component | null {
  const schema = ComponentRegistry.get(type);
  if (!schema || !schema.createDefault) {
    return null;
  }

  return schema.createDefault();
}
```

---

## Performance Considerations

**Optimization strategies:**

1. **Auto-registration overhead**: Schemas register immediately when imported. For large codebases, consider lazy loading schema modules.

2. **Cache render output**: Use `SchedulerRenderCache` to avoid redundant renders. Typical hit rates:
   - Agent components: 67% (updates every tick)
   - Plant components: 99.7% (updates every 86400 ticks)
   - Weather: 99% (updates every 100 ticks)

3. **LLM prompt generation**: Cache prompts per entity using `SchedulerRenderCache<string>`:

```typescript
const promptCache = new SchedulerRenderCache<string>();

function getAgentPrompt(entityId: string): string {
  const cached = promptCache.get(entityId, 'agent');
  if (cached) return cached;

  const prompt = PromptRenderer.renderEntity(entity, world);
  promptCache.set(entityId, 'agent', prompt, world.tick);
  return prompt;
}
```

4. **Mutation batching**: Use `mutateBatch()` to validate multiple mutations at once:

```typescript
// ❌ BAD: Individual mutations (multiple validations)
MutationService.mutate(entity, 'needs', 'hunger', 75);
MutationService.mutate(entity, 'needs', 'thirst', 60);
MutationService.mutate(entity, 'needs', 'energy', 80);

// ✅ GOOD: Batch mutations (single validation pass)
MutationService.mutateBatch([
  { entity, componentType: 'needs', fieldName: 'hunger', value: 75 },
  { entity, componentType: 'needs', fieldName: 'thirst', value: 60 },
  { entity, componentType: 'needs', fieldName: 'energy', value: 80 },
]);
```

5. **Schema lookups**: `ComponentRegistry.get()` is O(1) Map lookup. Cache schemas if calling repeatedly:

```typescript
// ❌ BAD: Repeated lookups in loop
for (const entity of entities) {
  const schema = ComponentRegistry.get('agent');  // Lookup every iteration
  processEntity(entity, schema);
}

// ✅ GOOD: Lookup once before loop
const schema = ComponentRegistry.get('agent');  // Lookup once
for (const entity of entities) {
  processEntity(entity, schema);
}
```

6. **Widget creation**: DevRenderer creates widgets once during `initializeComponent()`. Reuse renderer instances:

```typescript
// ❌ BAD: Create new renderer per entity
for (const entity of entities) {
  const renderer = new DevRenderer();  // Creates new widget instances
  renderer.initializeComponent('agent', entity.getComponent('agent'), onChange);
  renderer.render(ctx, 'agent', x, y, width);
}

// ✅ GOOD: Reuse renderer, reinitialize per entity
const renderer = new DevRenderer();  // Create once
for (const entity of entities) {
  renderer.initializeComponent('agent', entity.getComponent('agent'), onChange);
  renderer.render(ctx, 'agent', x, y, width);
}
```

---

## Troubleshooting

### Schema not found

**Error:** `No schema registered for component type 'my_component'`

**Fix:**
1. Ensure schema file is imported somewhere in the codebase
2. Use `autoRegister()` wrapper for auto-registration
3. Check that schema is exported from `src/schemas/index.ts`
4. Manually register if needed: `ComponentRegistry.register(MySchema)`

### Mutation validation failed

**Error:** `Mutation failed: Field 'name' is not mutable`

**Fix:**
1. Set `mutable: true` in field schema
2. Enable dev mode: `MutationService.setDevMode(true)`
3. Use custom mutator via `mutateVia` field

### LLM prompt missing fields

**Issue:** Expected fields not appearing in LLM prompts

**Fix:**
1. Check `visibility.llm` is `true` or `'summarized'`
2. Ensure field is not empty/default (set `llm.alwaysInclude: true` to force inclusion)
3. Check `llm.hideIf` condition is not filtering field
4. Verify field is in correct `llm.promptSection`

### Cache not invalidating

**Issue:** Stale data appearing in renders after mutation

**Fix:**
1. Register cache with MutationService: `MutationService.registerRenderCache(cache)`
2. Manually invalidate: `cache.invalidate(entityId, componentType)`
3. Call `cache.onTick(tick)` every tick to prune expired entries

### Dev UI widget not rendering

**Issue:** Field not appearing in DevRenderer output

**Fix:**
1. Check `visibility.dev` is `true` (default)
2. Verify `ui.widget` is valid widget type
3. Ensure field is not filtered by custom logic
4. Check widget factory supports field type

### Type inference not working

**Issue:** TypeScript not inferring component types from schema

**Fix:**
1. Pass component interface to `defineComponent<T>()`
2. Ensure interface extends `Component`
3. Use `readonly` modifiers on schema properties
4. Check TypeScript version (requires 5.0+)

---

## Testing

Run introspection tests:

```bash
cd custom_game_engine/packages/introspection
npm test
```

**Key test coverage:**
- Schema validation
- Component registry operations
- Mutation validation and execution
- Undo/redo functionality
- LLM prompt generation
- Dev UI rendering
- Render cache behavior

---

## Further Reading

- **COMPONENTS_REFERENCE.md** - Complete list of 125+ components with schemas
- **SYSTEMS_CATALOG.md** - System reference (how systems use introspection)
- **ARCHITECTURE_OVERVIEW.md** - ECS architecture and introspection integration
- **LLM Package README** - How LLM agents use introspection for self-awareness
- **Renderer Package README** - How UI panels use introspection for dev tools

---

## Summary for Language Models

**Before working with introspection:**
1. Read this README completely
2. Understand ComponentSchema structure (type, fields, visibility, UI hints)
3. Know how to define schemas with `defineComponent()` and `autoRegister()`
4. Understand mutation validation and undo/redo
5. Know how LLM prompts are generated from schemas
6. Understand render caching for performance

**Common tasks:**
- **Define schema:** Use `defineComponent<T>()` with full field metadata
- **Register schema:** Wrap with `autoRegister()` for automatic registration
- **Query schema:** `ComponentRegistry.get('type')` for type-safe retrieval
- **Mutate field:** `MutationService.mutate(entity, type, field, value, source)`
- **Generate prompt:** `PromptRenderer.renderEntity(entity, world)`
- **Render dev UI:** Create `DevRenderer`, initialize component, render to canvas
- **Cache renders:** Use `SchedulerRenderCache` with scheduler update frequencies

**Critical rules:**
- Always define schemas for new components (enables introspection)
- Use `autoRegister()` for auto-registration on import
- Set visibility flags appropriately (player/llm/agent/dev)
- Mark fields `mutable: true` if they should be editable
- Use `SchedulerRenderCache` for performance (85-99% hit rate)
- Register caches with `MutationService` for automatic invalidation
- Provide `description` for all LLM-visible fields
- Use appropriate widget types for dev UI rendering
- Cache schema lookups if calling in loops
- Use mutation batching for multiple field updates

**Event-driven architecture:**
- Subscribe to mutation events via `MutationService.on('mutated', handler)`
- Mutations auto-invalidate render caches
- Schemas are immutable (registered once at startup)
- Registry is thread-safe singleton

**LLM integration:**
- Set `visibility.llm = true` for fields LLMs should see
- Use `visibility.llm = 'summarized'` + `llm.summarize` for compact representation
- Set `llm.priority` to control section ordering (lower = earlier)
- Use `llm.promptSection` to group related fields
- Provide `llm.promptLabel` for custom field labels
- Use `llm.template` for custom formatting

**Performance best practices:**
- Cache prompts with `SchedulerRenderCache<string>`
- Reuse `DevRenderer` instances
- Batch mutations with `mutateBatch()`
- Cache schema lookups before loops
- Register render caches with `MutationService`
- Call `cache.onTick(tick)` every tick
