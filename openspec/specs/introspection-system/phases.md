# Introspection System: Phase Implementation Details

**Created:** 2026-01-05
**Parent:** `spec.md`

---

## Concurrency Map

```
                        PHASE 1 (Foundation)
                        ────────────────────
          ┌──────────────┬──────────────┬──────────────┐
          │              │              │              │
          ▼              ▼              ▼              │
    ┌──────────┐   ┌──────────┐   ┌──────────┐        │
    │ 1A:      │   │ 1B:      │   │ 1C:      │        │
    │ Schema   │   │ Registry │   │ Field    │        │
    │ Core     │   │          │   │ Metadata │        │
    └────┬─────┘   └────┬─────┘   └────┬─────┘        │
         │              │              │               │
         └──────────────┴──────────────┘               │
                        │                              │
                        ▼                              │
                  GATE: Phase 1 Complete               │
                        │                              │
         ┌──────────────┼──────────────┐               │
         │              │              │               │
         ▼              ▼              ▼               │
   ┌──────────┐   ┌──────────┐   ┌──────────┐         │
   │ 2A:      │   │ 2B:      │   │ 2C:      │         │
   │ DevPanel │   │ Mutation │   │ Player   │         │
   │ Integ    │   │ Layer    │   │ Renderer │         │
   └────┬─────┘   └────┬─────┘   └────┬─────┘         │
        │              │              │                │
        └──────────────┼──────────────┘                │
                       │                               │
                       ▼                               │
                 GATE: Phase 2 Complete                │
                       │                               │
         ┌─────────────┴─────────────┐                 │
         │                           │                 │
         ▼                           ▼                 │
   ┌──────────┐               ┌──────────┐            │
   │ 3:       │               │ 4:       │            │
   │ Prompt   │               │ Schema   │◄───────────┘
   │ Integ    │               │ Migration│  (Can start early
   └────┬─────┘               └────┬─────┘   with 1 schema)
        │                          │
        └──────────────┬───────────┘
                       │
                       ▼
                 ┌──────────┐
                 │ 5:       │
                 │ Advanced │
                 │ Features │
                 └──────────┘
```

---

## Phase 1A: Schema Core

**Status:** Not Started
**Parallelizable with:** 1B, 1C
**Dependencies:** None
**Estimated effort:** 2-3 sessions

### Files to Create

```
packages/introspection/
├── package.json
├── tsconfig.json
├── src/
│   ├── index.ts
│   ├── types/
│   │   ├── ComponentSchema.ts     # Main schema interface
│   │   ├── FieldSchema.ts         # Field definition types
│   │   ├── FieldTypes.ts          # Primitive type definitions
│   │   └── index.ts
│   ├── core/
│   │   ├── defineComponent.ts     # Schema DSL helper
│   │   ├── validateSchema.ts      # Schema validation
│   │   └── index.ts
│   └── utils/
│       ├── typeGuards.ts          # Runtime type checking
│       └── index.ts
```

### Task Breakdown

| # | Task | Description | Test Criteria |
|---|------|-------------|---------------|
| 1 | Create package structure | `packages/introspection/` with package.json, tsconfig | `npm run build` passes |
| 2 | Define `Component` base type | Core component interface | Compiles without error |
| 3 | Define `FieldSchema` interface | Full field metadata type | Can define all field types |
| 4 | Define `ComponentSchema` interface | Full schema type with generics | Generic type inference works |
| 5 | Implement `defineComponent()` | DSL function that creates schemas | Returns typed schema |
| 6 | Implement `validateSchema()` | Validates schema is well-formed | Catches invalid schemas |
| 7 | Add runtime type guards | `isString()`, `isNumber()`, etc. | Guards work at runtime |
| 8 | Export public API | Clean index.ts exports | Can import from package |

### Acceptance Criteria

```typescript
// This should work after Phase 1A:
import { defineComponent } from '@ai-village/introspection';

const schema = defineComponent<IdentityComponent>({
  type: 'identity',
  version: 1,
  category: 'core',
  fields: {
    name: {
      type: 'string',
      required: true,
      description: 'Entity name',
      visibility: { player: true, llm: true, dev: true },
      ui: { widget: 'text' },
    },
  },
  validate: (data) => typeof data?.name === 'string',
  createDefault: () => ({ type: 'identity', version: 1, name: 'Unknown' }),
});

// Type inference should work:
schema.type // 'identity'
schema.fields.name.type // 'string'
```

---

## Phase 1B: Component Registry

**Status:** Not Started
**Parallelizable with:** 1A, 1C
**Dependencies:** None (can use placeholder types)
**Estimated effort:** 1-2 sessions

### Files to Create

```
packages/introspection/src/
├── registry/
│   ├── ComponentRegistry.ts    # Central registry class
│   ├── autoRegister.ts         # Auto-registration decorator
│   └── index.ts
```

### Task Breakdown

| # | Task | Description | Test Criteria |
|---|------|-------------|---------------|
| 1 | Create `ComponentRegistry` class | Singleton registry | Can instantiate |
| 2 | Implement `register()` | Add schema to registry | Schema stored correctly |
| 3 | Implement `get()` | Retrieve schema by type | Returns correct schema |
| 4 | Implement `has()` | Check if schema exists | Boolean return correct |
| 5 | Implement `list()` | List all schemas | Returns all registered |
| 6 | Implement `getByCategory()` | Filter by category | Returns filtered list |
| 7 | Add type-safe generics | Generic type inference | Type narrowing works |
| 8 | Add auto-registration | Schemas self-register on import | No manual registration needed |

### Acceptance Criteria

```typescript
import { ComponentRegistry } from '@ai-village/introspection';

// Register
ComponentRegistry.register(IdentitySchema);

// Query
const schema = ComponentRegistry.get('identity');
schema.fields.name.type // 'string' (type-safe)

// Check
ComponentRegistry.has('identity') // true
ComponentRegistry.has('nonexistent') // false

// List
ComponentRegistry.list() // ['identity', ...]
ComponentRegistry.getByCategory('core') // [IdentitySchema, ...]
```

---

## Phase 1C: Field Metadata System

**Status:** Not Started
**Parallelizable with:** 1A, 1B
**Dependencies:** None
**Estimated effort:** 1 session

### Files to Create

```
packages/introspection/src/types/
├── WidgetTypes.ts        # UI widget type definitions
├── CategoryTypes.ts      # Component category definitions
├── VisibilityTypes.ts    # Consumer visibility flags
├── MutabilityTypes.ts    # Mutation permission flags
```

### Task Breakdown

| # | Task | Description | Test Criteria |
|---|------|-------------|---------------|
| 1 | Define `WidgetType` union | All UI widget types | Covers all needed widgets |
| 2 | Define `ComponentCategory` union | Logical groupings | Covers all component types |
| 3 | Define `Visibility` interface | Per-consumer visibility | All 5 consumers represented |
| 4 | Define `Mutability` interface | Edit permissions | Dev/user/readonly levels |
| 5 | Define `UIHints` interface | Icon, color, order, group | Full UI metadata |
| 6 | Define `LLMConfig` interface | Prompt section, summarize | Full LLM metadata |

### Acceptance Criteria

```typescript
import { WidgetType, ComponentCategory, Visibility } from '@ai-village/introspection';

// Widget types
const widget: WidgetType = 'slider'; // Compiles
const bad: WidgetType = 'invalid'; // Error!

// Categories
const cat: ComponentCategory = 'agent'; // Compiles

// Visibility
const vis: Visibility = {
  player: true,
  llm: 'summarized',
  agent: false,
  user: true,
  dev: true,
};
```

---

## Phase 2A: DevPanel Integration

**Status:** Not Started
**Parallelizable with:** 2B, 2C
**Dependencies:** Phase 1 complete
**Estimated effort:** 3-4 sessions

### Files to Create

```
packages/introspection/src/
├── renderers/
│   ├── DevRenderer.ts          # Auto-generates dev UI
│   ├── widgets/
│   │   ├── TextWidget.ts       # Text input widget
│   │   ├── SliderWidget.ts     # Range slider widget
│   │   ├── DropdownWidget.ts   # Select widget
│   │   ├── CheckboxWidget.ts   # Boolean toggle
│   │   ├── JsonWidget.ts       # JSON editor
│   │   ├── ReadonlyWidget.ts   # Display only
│   │   └── WidgetFactory.ts    # Creates widget by type
│   └── index.ts

packages/renderer/src/
├── IntrospectionDevPanel.ts    # New schema-driven panel
```

### Task Breakdown

| # | Task | Description | Test Criteria |
|---|------|-------------|---------------|
| 1 | Create `WidgetFactory` | Returns widget by field type | All widgets created correctly |
| 2 | Implement `TextWidget` | Text input with validation | Edits string fields |
| 3 | Implement `SliderWidget` | Range slider with min/max | Respects `range` constraint |
| 4 | Implement `DropdownWidget` | Select from enum values | Shows all options |
| 5 | Implement `CheckboxWidget` | Boolean toggle | Toggles boolean |
| 6 | Implement `JsonWidget` | JSON editor for objects | Edits complex fields |
| 7 | Implement `ReadonlyWidget` | Display-only widget | No edit capability |
| 8 | Create `DevRenderer` | Orchestrates widget rendering | Full panel renders |
| 9 | Add grouping | Group fields by `ui.group` | Fields grouped correctly |
| 10 | Add ordering | Order by `ui.order` | Fields in correct order |
| 11 | Add custom renderer hook | Allow schema override | Custom renderers work |
| 12 | Integrate into DevPanel | Replace hardcoded sections | DevPanel uses schemas |

### Acceptance Criteria

```typescript
// DevPanel automatically shows schema'd components:
// 1. Open DevPanel
// 2. Select an entity
// 3. See all schema'd components with editable fields
// 4. Edit a field
// 5. Value updates in entity

// No new code needed in DevPanel when adding schemas
```

---

## Phase 2B: Mutation Layer

**Status:** Not Started
**Parallelizable with:** 2A, 2C
**Dependencies:** Phase 1 complete
**Estimated effort:** 2-3 sessions

### Files to Create

```
packages/introspection/src/
├── mutation/
│   ├── MutationService.ts      # Handles all component edits
│   ├── ValidationService.ts    # Validates mutations
│   ├── UndoStack.ts            # Undo/redo support
│   ├── MutationEvent.ts        # Event types
│   └── index.ts
```

### Task Breakdown

| # | Task | Description | Test Criteria |
|---|------|-------------|---------------|
| 1 | Create `MutationService` | Central mutation handler | Can mutate components |
| 2 | Implement field validation | Check constraints before mutate | Invalid mutations rejected |
| 3 | Implement range validation | Check min/max for numbers | Out-of-range rejected |
| 4 | Implement required validation | Check required fields present | Missing required rejected |
| 5 | Implement custom mutators | Use `mutators` from schema | Custom logic runs |
| 6 | Add event emission | Emit `component:mutated` | Events fire correctly |
| 7 | Create `UndoStack` | Track mutation history | Undo/redo works |
| 8 | Add permission checks | Respect `mutable` flag | Immutable fields protected |
| 9 | Add dev override | Dev can mutate anything | Dev bypass works |

### Acceptance Criteria

```typescript
import { MutationService } from '@ai-village/introspection';

// Valid mutation succeeds
MutationService.mutate(entity, 'identity', 'name', 'NewName');
entity.getComponent('identity').name // 'NewName'

// Invalid mutation fails
MutationService.mutate(entity, 'identity', 'age', -5);
// Throws: "age must be >= 0"

// Immutable field protected
MutationService.mutate(entity, 'identity', 'species', 'elf');
// Throws: "species is not mutable"

// Undo works
MutationService.undo();
entity.getComponent('identity').name // Previous value
```

---

## Phase 2C: Player Renderers

**Status:** Not Started
**Parallelizable with:** 2A, 2B
**Dependencies:** Phase 1 complete
**Estimated effort:** 2 sessions

### Files to Create

```
packages/introspection/src/
├── renderers/
│   ├── PlayerRenderer.ts       # Player UI renderer
│   ├── PlayerCanvasRenderer.ts # Canvas-based rendering
│   ├── PlayerDOMRenderer.ts    # DOM-based rendering
│   └── index.ts
```

### Task Breakdown

| # | Task | Description | Test Criteria |
|---|------|-------------|---------------|
| 1 | Create `PlayerRenderer` interface | Standard contract | Interface defined |
| 2 | Implement `PlayerCanvasRenderer` | Canvas-based UI | Renders to canvas |
| 3 | Implement `PlayerDOMRenderer` | DOM-based UI | Renders to DOM |
| 4 | Add visibility filtering | Only `visibility.player` fields | Hidden fields hidden |
| 5 | Add icon support | Use `ui.icon` | Icons displayed |
| 6 | Add color support | Use `ui.color` | Colors applied |
| 7 | Add custom renderer hook | Allow schema override | Custom renderers work |

### Acceptance Criteria

```typescript
// Player UI auto-generates from schema
const renderer = new PlayerCanvasRenderer(ctx);
renderer.render(entity); // Shows name, health bar, etc.

// Only player-visible fields shown
// ui.icon and ui.color applied
// Custom renderers override defaults
```

---

## Phase 3: Prompt Integration

**Status:** Not Started
**Parallelizable with:** Phase 4 (partial)
**Dependencies:** Phase 1 complete, Phase 2A for testing
**Estimated effort:** 2-3 sessions

### Files to Modify

```
packages/introspection/src/
├── prompt/
│   ├── PromptRenderer.ts       # NEW: Schema-driven prompt builder
│   ├── AgentPromptRenderer.ts  # NEW: Agent self-awareness
│   └── index.ts

packages/llm/src/
├── StructuredPromptBuilder.ts  # MODIFY: Use schemas
```

### Task Breakdown

| # | Task | Description | Test Criteria |
|---|------|-------------|---------------|
| 1 | Create `PromptRenderer` | Generates prompt from schema | Prompt generated |
| 2 | Add LLM visibility filtering | Only `visibility.llm` fields | Hidden fields excluded |
| 3 | Add summarization | Use `llm.summarize` function | Summaries used |
| 4 | Add section grouping | Group by `llm.promptSection` | Sections organized |
| 5 | Create `AgentPromptRenderer` | Filter for `visibility.agent` | Agent-specific prompt |
| 6 | Integrate with StructuredPromptBuilder | Replace hardcoded extraction | Uses schemas |
| 7 | Add fallback for non-schema'd | Legacy path for old components | No breaking changes |

### Acceptance Criteria

```typescript
// Prompt auto-generated from schema:
const prompt = PromptRenderer.render(entity);
// Contains: "Name: Bob\nAge: 25 years\nMood: happy (0.8)"

// Agent sees filtered version:
const agentPrompt = AgentPromptRenderer.render(entity);
// Only visibility.agent fields

// Adding new schema'd component auto-appears in prompts
```

---

## Phase 4: Schema Migration

**Status:** Not Started
**Parallelizable with:** Phase 3
**Dependencies:** Phase 2A working
**Estimated effort:** 4-6 sessions

### Migration Priority

| Tier | Components | Why First |
|------|------------|-----------|
| **Tier 1** | identity, position, sprite | Core, simple, high-use |
| **Tier 2** | personality, skills, needs | Agent system, high LLM use |
| **Tier 3** | health, inventory, equipment | Physical, medium complexity |
| **Tier 4** | relationships, reputation | Social, medium complexity |
| **Tier 5** | memory, goals, beliefs | Cognitive, complex |
| **Tier 6** | mana, spells, paradigms | Magic, complex |
| **Tier 7** | time, weather, terrain | World, simple |
| **Tier 8** | steering, pathfinding | System, rarely exposed |

### Files to Create (Per Component)

```
packages/introspection/src/schemas/
├── core/
│   ├── IdentitySchema.ts
│   ├── PositionSchema.ts
│   ├── SpriteSchema.ts
│   └── index.ts
├── agent/
│   ├── PersonalitySchema.ts
│   ├── SkillsSchema.ts
│   ├── NeedsSchema.ts
│   └── index.ts
└── ... (more categories)
```

### Task Breakdown (Per Tier)

| # | Task | Description | Test Criteria |
|---|------|-------------|---------------|
| 1 | Create schema file | Define full schema | Schema compiles |
| 2 | Add field metadata | All fields with visibility/ui | Metadata complete |
| 3 | Add validation | `validate()` function | Validates correctly |
| 4 | Add default creator | `createDefault()` function | Creates valid default |
| 5 | Register schema | Auto-register on import | Shows in registry |
| 6 | Test in DevPanel | Verify renders correctly | DevPanel shows component |
| 7 | Test in prompts | Verify appears in LLM context | Prompt includes component |
| 8 | Remove hardcoded rendering | Delete legacy DevPanel code | No regression |

---

## Phase 5: Advanced Features

**Status:** Not Started
**Dependencies:** Phase 3, Phase 4 (50%+)
**Estimated effort:** 4+ sessions

### Features

| Feature | Description | Effort |
|---------|-------------|--------|
| **Action introspection** | Auto-generate ActionDefinitions from behaviors | Large |
| **Entity templates** | Define archetypes via schema composition | Medium |
| **Schema versioning** | Migration system for schema changes | Medium |
| **Export/import** | Serialize entities via schemas | Medium |
| **Schema editor** | Visual schema designer UI | Large |

---

## Risk Mitigation

### Risk: Schema Overhead

**Symptom:** Game slows down due to schema lookups
**Mitigation:**
- Cache schema lookups
- Lazy-load schemas
- Profile early in Phase 2

### Risk: Complex Components

**Symptom:** Components like `memory` are hard to schema
**Mitigation:**
- Allow partial schemas (some fields only)
- Use custom renderers for complex UI
- Start with simple components

### Risk: Breaking Changes

**Symptom:** Schema changes break saved games
**Mitigation:**
- Schema versioning from Phase 1
- Migration functions in schemas
- Never delete fields, mark deprecated

---

## Definition of Done

### Per-Phase Checklist

- [ ] All tasks completed
- [ ] Tests pass
- [ ] No console errors
- [ ] Documentation updated
- [ ] Build succeeds
- [ ] Reviewed by another session

### Final Checklist

- [ ] 100% components have schemas
- [ ] DevPanel fully schema-driven
- [ ] PromptBuilder fully schema-driven
- [ ] New component = 1 file to create
- [ ] No hardcoded component rendering anywhere
