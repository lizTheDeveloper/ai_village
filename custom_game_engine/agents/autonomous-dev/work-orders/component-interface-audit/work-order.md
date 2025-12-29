# Work Order: Component Interface Audit

**Phase:** Infrastructure (Type Safety)
**Created:** 2025-12-26
**Priority:** HIGH
**Status:** COMPLETE
**Predecessor:** type-safety-cleanup (ARCHIVED)

---

## Problem Statement

Component TypeScript interfaces don't match their runtime usage. This blocks further type safety improvements because:

1. Properties used at runtime aren't declared in interfaces
2. `as any` casts are required to access undeclared properties
3. IDE autocompletion doesn't work for these properties
4. Type errors are hidden rather than caught at compile time

### Evidence

From type-safety-cleanup work order:
- ExplorationStateComponent missing: `exploredSectors`, `spiralStep`, `homeBase`
- VisionComponent missing: `seenBuildings`, `heardSpeech`
- SteeringComponent interface differs from class implementation
- Many other components have similar gaps

---

## Scope

**35 component files** in `packages/core/src/components/`:

### Group A: Agent Core (7 files)
- AgentComponent.ts
- IdentityComponent.ts
- PersonalityComponent.ts
- NeedsComponent.ts
- InventoryComponent.ts
- MovementComponent.ts
- CircadianComponent.ts

### Group B: Memory & Cognition (8 files)
- MemoryComponent.ts
- EpisodicMemoryComponent.ts
- SemanticMemoryComponent.ts
- SocialMemoryComponent.ts
- SpatialMemoryComponent.ts
- BeliefComponent.ts
- ReflectionComponent.ts
- JournalComponent.ts

### Group C: Perception & Navigation (6 files)
- VisionComponent.ts
- SteeringComponent.ts
- VelocityComponent.ts
- ExplorationStateComponent.ts
- SocialGradientComponent.ts
- TrustNetworkComponent.ts

### Group D: World Entities (7 files)
- PositionComponent.ts
- PlantComponent.ts
- SeedComponent.ts
- AnimalComponent.ts
- BuildingComponent.ts
- ResourceComponent.ts
- WeatherComponent.ts

### Group E: Social & Misc (7 files)
- ConversationComponent.ts
- RelationshipComponent.ts
- MeetingComponent.ts
- TemperatureComponent.ts
- PhysicsComponent.ts
- RenderableComponent.ts
- TagsComponent.ts

---

## Requirements

### R1: Audit Each Component

For each component file:

1. **Find all usages** in the codebase
2. **List properties accessed** at runtime
3. **Compare to interface** definition
4. **Document gaps** - properties used but not declared

### R2: Update Interfaces

For each gap found:

1. **Add missing properties** to interface with correct types
2. **Mark optional** properties that aren't always present
3. **Add JSDoc comments** explaining property purpose
4. **Update factory functions** if they need to initialize new properties

### R3: Remove `as any` Casts

After interfaces are updated:

1. **Replace `as any`** with proper typed access
2. **Use component helpers** from `utils/componentHelpers.ts`
3. **Verify type safety** - no implicit any errors

---

## Audit Process

For each component, run:

```bash
# Find all usages of the component
grep -rn "ComponentName\|'component_type'" packages/*/src/ --include="*.ts" | grep -v "__tests__"

# Find property accesses
grep -rn "\.propertyName" packages/*/src/ --include="*.ts" | grep -v "__tests__"
```

Compare against interface definition in the component file.

---

## Acceptance Criteria

### Criterion 1: All Interfaces Complete
- Every property used at runtime is declared in interface
- **Verification:** No `as any` needed for property access

### Criterion 2: Types Are Accurate
- Property types match actual usage (string vs number vs boolean)
- Optional properties marked with `?`
- **Verification:** Build passes with strict mode

### Criterion 3: `any` Count Reduced
- Target: < 100 `any` types in source (from ~410)
- **Verification:** `grep -rn ": any\|as any" packages/*/src/ | grep -v __tests__ | wc -l`

### Criterion 4: Build Passes
- `npm run build` completes without errors
- **Verification:** CI green

---

## Parallel Execution Strategy

This work order can be parallelized by group:

1. **Phase 1: Audit** (1 agent)
   - Scan all 35 components
   - Create gap report for each group
   - Output: `audit-report.md` with findings

2. **Phase 2: Fix Groups** (5 parallel agents)
   - Agent A: Fix Group A (Agent Core)
   - Agent B: Fix Group B (Memory & Cognition)
   - Agent C: Fix Group C (Perception & Navigation)
   - Agent D: Fix Group D (World Entities)
   - Agent E: Fix Group E (Social & Misc)

3. **Phase 3: Verify** (1 agent)
   - Run full build
   - Count remaining `any` types
   - Run tests

---

## Files to Modify

All 35 component files in `packages/core/src/components/`

Plus systems that use them:
- `packages/core/src/systems/*.ts`
- `packages/core/src/behavior/**/*.ts`
- `packages/core/src/decision/*.ts`

---

## Notes for Implementation Agent

1. **Start with audit** - Don't fix until you understand the gaps
2. **Preserve backward compatibility** - Don't remove properties
3. **Add, don't change** - Extend interfaces rather than modify
4. **Test incrementally** - Build after each group
5. **Use existing helpers** - `utils/componentHelpers.ts` has typed accessors

---

## Notes for Review Agent

1. **Check interface completeness** - All used properties declared
2. **Verify types** - Correct types for each property
3. **Count `any` reduction** - Should be significant
4. **Build must pass** - No regressions

---

## Success Metrics

- ✅ All 35 component interfaces audited
- ✅ All runtime properties declared in interfaces
- ✅ `any` count < 100 (from ~410)
- ✅ Build passes
- ✅ No breaking changes

---

**Estimated Complexity:** MEDIUM-HIGH
**Estimated Time:** 4-6 hours (parallelized: 2 hours)
**Priority:** HIGH (unblocks further type safety work)
**Dependencies:** type-safety-cleanup utilities (COMPLETE)
