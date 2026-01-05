# Plan: Core Monolith Breakup

## Current State

The `@ai-village/core` package contains **1,270 TypeScript files** in a single package:

| Directory | Files | Description |
|-----------|-------|-------------|
| systems/ | 240 | Game systems |
| components/ | 157 | Component definitions |
| magic/ | 113 | Magic system |
| items/ | 69 | Item definitions |
| divinity/ | 59 | God/religion system |
| behavior/ | 48 | Behavior trees |
| persistence/ | 34 | Save/load |
| dashboard/ | 31 | Admin dashboard |
| reproduction/ | 28 | Mating/birth |
| metrics/ | 26 | Performance tracking |
| television/ | 25 | TV/media system |
| ecs/ | 19 | ECS core |
| ... | ... | Others |

The `index.ts` exports **1,126 lines** of re-exports.

---

## Proposed Package Split

### Tier 1: Minimal ECS Core (Keep in `@ai-village/core`)

**What stays:**
- `ecs/` (19 files) - Entity, Component, System, World, Query
- `events/` - EventBus, EventMap
- `loop/` - GameLoop, SystemRegistry
- `types/` - ComponentType enum, core types
- `components/` (157 files) - Component definitions
- `actions/` - Action queue

**Rationale:** These are tightly coupled and form the foundation everything depends on.

---

### Tier 2: Infrastructure Packages (First to Extract)

#### Package: `@ai-village/persistence`
**Files:** 34
**Contents:**
- Save/load system
- Storage backends (IndexedDB, Memory)
- Component serializers
- Migration system

**Dependencies:** Only `@ai-village/core` types

#### Package: `@ai-village/metrics`
**Files:** 26
**Contents:**
- MetricsCollector
- MetricsAnalysis
- MetricsDashboard
- LiveEntityAPI
- MetricsStreamClient

**Dependencies:** Only `@ai-village/core` types

**Why extract these first:**
- Self-contained (no system dependencies)
- Clear boundaries
- Used by dev tooling, not game logic
- Reduces core size by 60 files

---

### Tier 3: Feature Domain Packages (Second to Extract)

#### Package: `@ai-village/magic`
**Files:** 113
**Contents:**
- Paradigm system
- Spell definitions
- Skill trees
- Mana management
- Summoning

**Dependencies:** `@ai-village/core`

#### Package: `@ai-village/divinity`
**Files:** 59
**Contents:**
- Deity system
- Belief mechanics
- Prayers
- Angels
- Pantheon
- Religion

**Dependencies:** `@ai-village/core`, maybe `@ai-village/magic`

#### Package: `@ai-village/reproduction`
**Files:** 28
**Contents:**
- Mating paradigms
- Courtship
- Pregnancy
- Midwifery
- Parenting

**Dependencies:** `@ai-village/core`

#### Package: `@ai-village/television`
**Files:** 25
**Contents:**
- TV stations
- Shows
- Broadcasting

**Dependencies:** `@ai-village/core`

**Why these are good candidates:**
- Already organized into directories
- Minimal cross-dependencies
- Clear domain boundaries
- Can be disabled/enabled per universe

---

### Tier 4: Content as Data (Third to Extract)

Convert large data files to JSON:

| File | Lines | Target |
|------|-------|--------|
| `items/*.ts` | 69 files | `data/items.json` |
| `magic/ExpandedSpells.ts` | 2,509 | `data/spells.json` |
| `magic/SummonableEntities.ts` | 2,147 | `data/summonables.json` |
| `materials/surrealMaterials.ts` | 2,600 | `data/materials.json` |

**Benefits:**
- Faster TypeScript compilation
- Non-programmers can edit
- Dynamic loading for code splitting

---

## Recommended Phased Approach

### Phase 1: Infrastructure (Low Risk)
**Effort:** 2-3 days
**Risk:** Low

1. Create `@ai-village/persistence` package
2. Create `@ai-village/metrics` package
3. Update imports in core
4. Update imports in renderer/world/demo

**Dependency graph after Phase 1:**
```
core  →  persistence
      →  metrics
world →  core
renderer → core, world, llm
```

### Phase 2: Feature Domains (Medium Risk)
**Effort:** 1-2 weeks
**Risk:** Medium (may uncover hidden coupling)

1. Create `@ai-village/magic` package
2. Create `@ai-village/divinity` package
3. Create `@ai-village/reproduction` package
4. Update system registration

**Key challenge:** Systems in `systems/` that use magic/divinity must import from new packages

### Phase 3: Content Extraction (Low Risk)
**Effort:** 1 week
**Risk:** Low

1. Convert data files to JSON
2. Create JSON loaders with schema validation
3. Update imports

---

## What NOT to Split

### Keep Systems Together (For Now)

The 240 systems in `systems/` are heavily interdependent:
- Many systems import from multiple domains
- Registration happens in one file
- Splitting would require extensive refactoring

**Future consideration:** Split by domain (time-systems, plant-systems, etc.) but only after feature packages are stable.

### Keep Components in Core

Components are referenced by almost everything:
- Systems query by component type
- Serializers need component definitions
- Splitting would create massive import churn

---

## Migration Strategy

### Step 1: Create Package Structure
```bash
packages/
├── core/           # Stays (smaller)
├── persistence/    # New
├── metrics/        # New
├── magic/          # New (Phase 2)
├── divinity/       # New (Phase 2)
├── reproduction/   # New (Phase 2)
├── world/          # Exists
├── renderer/       # Exists
└── llm/            # Exists
```

### Step 2: For Each Package

1. Create `package.json` with dependency on core
2. Create `tsconfig.json` with project reference
3. Move files to new package
4. Update imports in moved files
5. Create `index.ts` with exports
6. Update core `index.ts` to remove exports
7. Update all external imports
8. Run build, fix errors
9. Run tests

### Step 3: Update Downstream

- `@ai-village/world` - update imports
- `@ai-village/renderer` - update imports
- `@ai-village/demo` - update imports

---

## Trade-offs

### Pros
- Faster builds (only rebuild changed packages)
- Clear module boundaries
- Easier to understand codebase
- Teams can work independently
- Feature packages can be disabled per universe

### Cons
- More packages to manage
- More complex dependency graph
- Initial migration effort
- Potential for breaking changes
- More `package.json` files to maintain

---

## Questions for Review

1. **Do you want to start with Phase 1 (persistence + metrics)?** This is lowest risk.

2. **Which feature domains matter most?** Magic/divinity/reproduction could be Phase 2 priorities.

3. **Should systems stay in core or move with their domain?** E.g., should MagicSystem move to @ai-village/magic?

4. **Are there other logical groupings I'm missing?** The directories suggest current organization.

---

## Estimated Timeline

| Phase | Packages | Effort | Risk |
|-------|----------|--------|------|
| 1 | persistence, metrics | 2-3 days | Low |
| 2 | magic, divinity, reproduction | 1-2 weeks | Medium |
| 3 | Content → JSON | 1 week | Low |

**Total:** ~3-4 weeks for full breakup

---

## Next Steps

1. Review this plan
2. Decide on Phase 1 scope
3. Start with persistence package (most isolated)
4. Iterate based on learnings
