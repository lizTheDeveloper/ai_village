# Introspection System (MetaUI)

**Created:** 2026-01-05
**Updated:** 2026-01-06
**Status:** In Progress (Phase 1 ✅ | Phase 2 ✅ | Phase 3 ✅ | Phase 4 Ready)
**Priority:** TIER 1 - Foundational Infrastructure

---

## Purpose

A unified introspection layer that automatically generates UI, prompts, and debug tools from component schemas, serving as one source of truth for Player, LLM, Agent, User, and Developer consumers.

## Overview

A unified introspection layer that automatically generates UI, prompts, and debug tools from component schemas. One source of truth serves five consumers: **Player**, **LLM**, **Agent**, **User**, and **Developer**.

### Problem Statement

Currently, 125+ components exist with zero runtime metadata. Every UI is hardcoded separately:
- DevPanel: ~1200 lines of manual canvas rendering
- AgentInfoPanel: Manual extraction per component
- StructuredPromptBuilder: Hardcoded component-to-text conversion
- ActionDefinitions: Manual list disconnected from behaviors

Adding a new component requires updating 4+ files. This doesn't scale.

### Solution

A schema-driven introspection system where:
1. Components define their own metadata once
2. Renderers consume schemas generically
3. New components auto-appear in all consumers
4. Mutation is built-in (dev tools can edit values)
5. Custom renderers override defaults when needed

---

## Consumer Matrix

| Consumer | Purpose | Output Format | Mutation? |
|----------|---------|---------------|-----------|
| **Player** | In-game UI (health bars, inventory) | Canvas/DOM | Read-only |
| **LLM** | AI decision context | Text prompt | Read-only |
| **Agent** | NPC self-awareness | Filtered prompt | Read-only |
| **User** | Player-facing settings/info | DOM forms | Some fields |
| **Developer** | Debug/cheat menu | Full forms | All fields |

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                        INTROSPECTION LAYER                          │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │                    COMPONENT REGISTRY                          │ │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │ │
│  │  │ identity     │  │ personality  │  │ skills       │  ...    │ │
│  │  │ ─────────────│  │ ─────────────│  │ ─────────────│         │ │
│  │  │ fields: [...]│  │ fields: [...]│  │ fields: [...]│         │ │
│  │  │ ui: {...}    │  │ ui: {...}    │  │ ui: {...}    │         │ │
│  │  │ llm: {...}   │  │ llm: {...}   │  │ llm: {...}   │         │ │
│  │  │ mutators:{} │  │ mutators:{} │  │ mutators:{} │         │ │
│  │  └──────────────┘  └──────────────┘  └──────────────┘         │ │
│  └────────────────────────────────────────────────────────────────┘ │
│                                │                                    │
│              ┌─────────────────┼─────────────────┐                 │
│              ▼                 ▼                 ▼                 │
│  ┌───────────────┐  ┌───────────────┐  ┌───────────────┐          │
│  │ VIEW ADAPTERS │  │ PROMPT ADAPTERS│  │ MUTATOR LAYER │          │
│  │ ─────────────│  │ ─────────────│  │ ─────────────│          │
│  │ PlayerView    │  │ LLMPrompt     │  │ Validation    │          │
│  │ DevView       │  │ AgentPrompt   │  │ Undo/Redo     │          │
│  │ UserView      │  │               │  │ Events        │          │
│  └───────────────┘  └───────────────┘  └───────────────┘          │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Schema Definition

### Core Schema Interface

```typescript
interface ComponentSchema<T extends Component = Component> {
  // Identity
  readonly type: ComponentType;
  readonly version: number;
  readonly category: ComponentCategory;

  // Fields with full metadata
  readonly fields: Record<string, FieldSchema>;

  // Consumer-specific configuration
  readonly ui?: UIConfig;
  readonly llm?: LLMConfig;
  readonly dev?: DevConfig;

  // Custom renderers (optional overrides)
  readonly renderers?: {
    player?: (data: T) => string | CanvasRenderable;
    dev?: (data: T, mutate: Mutator<T>) => HTMLElement;
    llm?: (data: T) => string;
  };

  // Mutation handlers
  readonly mutators?: Record<string, MutatorFunction<T>>;

  // Validation
  validate(data: unknown): data is T;
  createDefault(): T;
}

interface FieldSchema {
  // Type information
  readonly type: FieldType;  // 'string' | 'number' | 'boolean' | 'array' | 'map' | 'enum' | 'object'
  readonly itemType?: FieldType;  // For arrays/maps
  readonly enumValues?: readonly string[];  // For enums

  // Constraints
  readonly required: boolean;
  readonly default?: unknown;
  readonly range?: [number, number];  // For numbers
  readonly maxLength?: number;  // For strings/arrays

  // Documentation
  readonly description: string;
  readonly displayName?: string;

  // Consumer visibility
  readonly visibility: {
    player?: boolean;  // Show in player UI
    llm?: boolean | 'summarized';  // Include in LLM context
    agent?: boolean;  // Include in agent self-awareness
    user?: boolean;  // Show in user settings
    dev?: boolean;  // Show in dev panel (default: true)
  };

  // UI hints
  readonly ui?: {
    widget: WidgetType;  // 'text' | 'slider' | 'dropdown' | 'checkbox' | 'color' | 'readonly'
    group?: string;  // Visual grouping
    order?: number;  // Display order
    icon?: string;
    color?: string;
  };

  // Mutation
  readonly mutable?: boolean;  // Can be edited (default: false)
  readonly mutateVia?: string;  // Use this mutator instead of direct set
}

type WidgetType =
  | 'text'      // Text input
  | 'textarea'  // Multi-line text
  | 'number'    // Number input with optional range
  | 'slider'    // Range slider
  | 'dropdown'  // Select from options
  | 'checkbox'  // Boolean toggle
  | 'color'     // Color picker
  | 'readonly'  // Display only
  | 'json'      // JSON editor for complex objects
  | 'custom';   // Use custom renderer

type ComponentCategory =
  | 'core'        // identity, position, sprite
  | 'agent'       // personality, skills, needs
  | 'physical'    // health, inventory, equipment
  | 'social'      // relationships, reputation
  | 'cognitive'   // memory, goals, beliefs
  | 'magic'       // mana, spells, paradigms
  | 'world'       // time, weather, terrain
  | 'system';     // internal, debug
```

### Example Schema Definition

```typescript
// packages/introspection/schemas/IdentitySchema.ts

export const IdentitySchema = defineComponent<IdentityComponent>({
  type: 'identity',
  version: 1,
  category: 'core',

  fields: {
    name: {
      type: 'string',
      required: true,
      description: 'Display name of the entity',
      displayName: 'Name',
      visibility: { player: true, llm: true, agent: true, user: false, dev: true },
      ui: { widget: 'text', group: 'basic', order: 1 },
      mutable: true,
    },

    species: {
      type: 'enum',
      enumValues: ['human', 'elf', 'dwarf', 'animal'] as const,
      required: true,
      default: 'human',
      description: 'Species type',
      visibility: { player: true, llm: true, agent: true, dev: true },
      ui: { widget: 'dropdown', group: 'basic', order: 2 },
      mutable: false,  // Can't change species
    },

    age: {
      type: 'number',
      required: true,
      default: 0,
      range: [0, 10000],
      description: 'Age in days',
      visibility: { player: true, llm: true, agent: true, dev: true },
      ui: { widget: 'slider', group: 'basic', order: 3 },
      mutable: true,
    },
  },

  ui: {
    icon: 'person',
    color: '#4CAF50',
    priority: 1,  // Show first in panels
  },

  llm: {
    promptSection: 'identity',
    summarize: (data) => `${data.name} (${data.species}, ${Math.floor(data.age / 365)} years old)`,
  },

  // Custom player renderer (optional)
  renderers: {
    player: (data) => {
      return `${data.name}`;  // Simple name display
    },
  },

  // Mutations with validation
  mutators: {
    rename: (entity, newName: string) => {
      if (newName.length < 1 || newName.length > 50) {
        throw new Error('Name must be 1-50 characters');
      }
      entity.getComponent('identity').name = newName;
    },
  },

  validate: (data): data is IdentityComponent => {
    return typeof data === 'object'
      && data !== null
      && typeof (data as any).name === 'string'
      && typeof (data as any).age === 'number';
  },

  createDefault: () => ({
    type: 'identity',
    version: 1,
    name: 'Unknown',
    species: 'human',
    age: 0,
  }),
});
```

---

## Implementation Phases

### Phase Dependency Graph

```
Phase 1A ──────────────────┐
(Schema Core)              │
                           ├──► Phase 2A ──────────────────┐
Phase 1B ──────────────────┤    (DevPanel Integration)     │
(Registry)                 │                               │
                           │                               ├──► Phase 3
Phase 1C ──────────────────┤                               │    (Prompt Integration)
(Field Metadata)           │    Phase 2B ──────────────────┤
                           │    (Mutation Layer)           │
                           │                               │
                           ├──► Phase 2C ──────────────────┘
                               (Player Renderers)
```

---

### Phase 1: Foundation ✅ COMPLETE

**Goal:** Create the core introspection infrastructure.

#### Phase 1A: Schema Core ✅ COMPLETE
**Parallelizable:** Yes (independent)
**Completed:** 2026-01-05

| Task | Description | Effort |
|------|-------------|--------|
| Create `packages/introspection/` | New package with tsconfig | Small |
| Define `ComponentSchema` interface | Full type definitions | Medium |
| Define `FieldSchema` interface | Field metadata types | Medium |
| Create `defineComponent()` helper | Schema definition DSL | Small |
| Add validation utilities | Runtime type checking | Medium |

**Deliverable:** `defineComponent()` function that creates typed schemas.

#### Phase 1B: Component Registry ✅ COMPLETE
**Parallelizable:** Yes (independent)
**Completed:** 2026-01-05

| Task | Description | Effort |
|------|-------------|--------|
| Create `ComponentRegistry` class | Central schema storage | Small |
| Auto-registration mechanism | Schemas self-register | Small |
| Query API | `getSchema()`, `listSchemas()`, `getByCategory()` | Medium |
| Type safety | Generic type inference | Medium |

**Deliverable:** `ComponentRegistry.get('identity')` returns typed schema.

#### Phase 1C: Field Metadata System ✅ COMPLETE
**Parallelizable:** Yes (independent)
**Completed:** 2026-01-05

| Task | Description | Effort |
|------|-------------|--------|
| Define `WidgetType` enum | All UI widget types | Small |
| Define `ComponentCategory` enum | Logical groupings | Small |
| Define visibility flags | Per-consumer visibility | Small |
| Define mutability flags | Editable vs readonly | Small |

**Deliverable:** Complete type system for field metadata.

---

### Phase 2: Renderers ✅ COMPLETE

**Goal:** Create generic renderers that consume schemas.

#### Phase 2A: DevPanel Integration ✅ COMPLETE
**Parallelizable:** Yes (after Phase 1)
**Depends on:** Phase 1A, 1B, 1C
**Completed:** 2026-01-05

| Task | Description | Effort |
|------|-------------|--------|
| Create `DevRenderer` class | Auto-generates dev UI from schema | Large |
| Widget factory | Render slider/text/dropdown from field type | Medium |
| Grouping system | Organize fields by `ui.group` | Small |
| Custom renderer hooks | Allow schema to override | Medium |
| Integrate with existing DevPanel | Replace hardcoded sections | Large |

**Deliverable:** DevPanel shows all schema'd components automatically.

#### Phase 2B: Mutation Layer ✅ COMPLETE
**Parallelizable:** Yes (after Phase 1)
**Depends on:** Phase 1A, 1B
**Completed:** 2026-01-05

| Task | Description | Effort |
|------|-------------|--------|
| Create `MutationService` | Handles all component edits | Medium |
| Validation layer | Check constraints before mutation | Medium |
| Event emission | `component:mutated` events | Small |
| Undo/redo stack | Track mutations for undo | Large |
| Permission checks | Dev-only vs user-mutable | Small |

**Deliverable:** `mutate(entity, 'identity', 'name', 'NewName')` with validation.

#### Phase 2C: Player Renderers ✅ COMPLETE
**Parallelizable:** Yes (after Phase 1)
**Depends on:** Phase 1A, 1B
**Completed:** 2026-01-05

| Task | Description | Effort |
|------|-------------|--------|
| Create `PlayerRenderer` interface | Standard player UI contract | Small |
| Implement canvas renderer | For game overlay UI | Medium |
| Implement DOM renderer | For modal/panel UI | Medium |
| Visibility filtering | Only `visibility.player` fields | Small |
| Icon/color system | Use `ui.icon` and `ui.color` | Small |

**Deliverable:** Player-facing UI auto-generated from schemas.

---

### Phase 3: Prompt Integration 🔄 IN PROGRESS

**Goal:** Replace hardcoded PromptBuilder with schema-driven generation.

**Depends on:** Phase 1A, 1B, 2A (for testing)
**Started:** 2026-01-05

| Task | Description | Effort |
|------|-------------|--------|
| Create `PromptRenderer` class | Generates prompt sections from schema | Medium |
| LLM visibility filtering | Only `visibility.llm` fields | Small |
| Summarization support | Use `llm.summarize` when provided | Medium |
| Section organization | Group by `llm.promptSection` | Small |
| Integrate with StructuredPromptBuilder | Replace hardcoded extraction | Large |
| Agent self-prompt | Filter for `visibility.agent` | Medium |

**Deliverable:** `buildPrompt(entity)` uses schemas instead of hardcoded extraction.

---

### Phase 4: Schema Migration 📋 READY TO START

**Goal:** Convert existing components to schemas.

**Depends on:** Phase 2A (to verify schemas work) ✅
**Parallelizable with:** Phase 3 (can start migrating while prompts are being built)

| Task | Description | Effort |
|------|-------------|--------|
| **Tier 1: Core** | identity, position, sprite | Medium |
| **Tier 2: Agent** | personality, skills, needs | Medium |
| **Tier 3: Physical** | health, inventory, equipment | Medium |
| **Tier 4: Social** | relationships, reputation | Medium |
| **Tier 5: Cognitive** | memory, goals, beliefs | Large |
| **Tier 6: Magic** | mana, spells, paradigms | Medium |
| **Tier 7: World** | time, weather, terrain | Medium |
| **Tier 8: System** | steering, pathfinding | Small |

**Note:** Each tier can be migrated incrementally. Unmigrated components fall back to current behavior.

---

### Phase 5: Advanced Features (After Phase 3)

**Goal:** Polish and advanced capabilities.

| Task | Description | Effort |
|------|-------------|--------|
| Action introspection | Auto-generate ActionDefinitions from behaviors | Large |
| Entity templates | Define entity archetypes via schema composition | Medium |
| Schema versioning | Migration system for schema changes | Medium |
| Export/import | Serialize/deserialize via schemas | Medium |
| Schema editor UI | Visual schema designer | Large |

---

## Parallelization Summary

```
Week 1:
├── [1A] Schema Core          ─────────►
├── [1B] Component Registry   ─────────►
└── [1C] Field Metadata       ─────────►

Week 2:
├── [2A] DevPanel Integration ─────────────────────►
├── [2B] Mutation Layer       ─────────────────────►
└── [2C] Player Renderers     ─────────────────────►

Week 3:
├── [3] Prompt Integration    ─────────────────────────────►
└── [4] Schema Migration (Tier 1-3) ───────────────────────►

Week 4+:
├── [4] Schema Migration (Tier 4-8) ───────────────────────►
└── [5] Advanced Features     ─────────────────────────────►
```

**Maximum parallelism:** 3 workers in Week 1, 3 workers in Week 2.

---

## Success Criteria

### Phase 1 Complete When:
- [ ] `defineComponent()` creates typed schemas
- [ ] `ComponentRegistry` stores and retrieves schemas
- [ ] Field metadata types are complete

### Phase 2 Complete When:
- [ ] DevPanel shows one schema'd component (identity) automatically
- [ ] Editing a field in DevPanel updates the entity
- [ ] Player UI shows schema'd component

### Phase 3 Complete When:
- [ ] StructuredPromptBuilder uses schemas for at least 5 components
- [ ] Adding a new schema'd component auto-appears in prompts
- [ ] Agent self-awareness prompt is schema-driven

### Phase 4 Complete When:
- [ ] 50%+ of components have schemas
- [ ] DevPanel has no hardcoded component rendering
- [ ] PromptBuilder has no hardcoded component extraction

### Full System Complete When:
- [ ] 100% of components have schemas
- [ ] Adding a new component requires only schema definition
- [ ] Zero hardcoded UI for component rendering
- [ ] Zero hardcoded prompt extraction

---

## Migration Strategy

### Coexistence During Migration

```typescript
// Old code path (fallback)
if (!ComponentRegistry.has(componentType)) {
  return this.legacyRender(component);
}

// New code path (schema-driven)
const schema = ComponentRegistry.get(componentType);
return this.schemaRender(component, schema);
```

### Incremental Adoption

1. **Start with high-value components:** identity, skills, needs
2. **Leave complex components for later:** memory, relationships
3. **Never break existing functionality:** fallback to legacy rendering
4. **Validate with DevPanel first:** easiest to test

---

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Schema overhead slows game | Low | High | Profile early, cache schemas |
| Complex components hard to schema | Medium | Medium | Allow partial schemas, custom renderers |
| LLM prompt format changes | Low | Medium | Version prompts, A/B test |
| Migration takes too long | Medium | Low | Prioritize high-value components |

---

## Related Documents

- `ARCHITECTURE_OVERVIEW.md` - ECS architecture
- `COMPONENTS_REFERENCE.md` - All 125+ component types
- `SYSTEMS_CATALOG.md` - System priorities and dependencies
- `packages/llm/src/StructuredPromptBuilder.ts` - Current prompt generation
- `packages/renderer/src/DevPanel.ts` - Current dev UI

---

## Appendix: Example Workflow

### Before (Current)

Adding a new `mood` component requires:

1. Define `MoodComponent` interface in `packages/core/src/components/`
2. Add to `ComponentType` union
3. Add extraction logic to `StructuredPromptBuilder`
4. Add rendering code to `DevPanel` (50+ lines)
5. Add rendering code to `AgentInfoPanel` (50+ lines)
6. Add to `ActionDefinitions` if LLM needs to see it
7. Test all 4 places independently

### After (With Introspection)

Adding a new `mood` component requires:

1. Define schema in `packages/introspection/schemas/MoodSchema.ts`:

```typescript
export const MoodSchema = defineComponent<MoodComponent>({
  type: 'mood',
  version: 1,
  category: 'agent',

  fields: {
    current: {
      type: 'enum',
      enumValues: ['happy', 'sad', 'angry', 'neutral'],
      required: true,
      default: 'neutral',
      description: 'Current emotional state',
      visibility: { player: true, llm: true, agent: true, dev: true },
      ui: { widget: 'dropdown', icon: 'emoji' },
    },
    intensity: {
      type: 'number',
      range: [0, 1],
      required: true,
      default: 0.5,
      description: 'How strongly the mood is felt',
      visibility: { player: true, llm: true, dev: true },
      ui: { widget: 'slider' },
    },
  },
});
```

2. **Done.** Component auto-appears in DevPanel, LLM prompts, and player UI.
