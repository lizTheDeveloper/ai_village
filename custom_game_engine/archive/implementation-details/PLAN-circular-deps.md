# Plan: Resolve Systemic Type Conflicts & Prevent Future Issues

## Root Cause Analysis

The errors are NOT circular package dependencies (the DAG is clean). They are:

### Problem 1: Two `World` classes in core, both exported

- `core/src/ecs/World.ts` exports `WorldImpl` (the real ECS World, used by internal functions)
- `core/src/World.ts` exports `class World extends WorldImpl` (test helper with extra convenience methods)
- `core/src/index.ts` line 23: `export { World } from './World.js'` — exposes the test helper as the public API
- Internal core functions type their parameters as `WorldImpl` (from ecs/World.ts)
- Downstream packages import `World` from `@ai-village/core` (gets the test helper)
- In `--build` mode, TypeScript resolves these as two incompatible types from different `.d.ts` paths

**Result**: Navigation's `World` (test helper) can't assign to core function parameters typed as `WorldImpl` (ecs/World).

### Problem 2: 8+ duplicate `LLMProvider`/`LLMQueue` interfaces

Core already has canonical definitions in `core/src/types/LLMTypes.ts` (exported publicly). But 8+ files define their own local copies with subtly different signatures:

| File | Divergence |
|------|-----------|
| `core/src/systems/AdminAngelSystem.ts` | `LLMQueue.requestDecision(id, prompt, {tier?})` |
| `core/src/profession/ProfessionPersonalityGenerator.ts` | `LLMQueue.requestDecision(id, prompt)` (no config) |
| `core/src/systems/AngelSystem.ts` | Local `LLMProvider` (no `getPricing`) |
| `core/src/systems/AgentCombatSystem.ts` | Local `LLMProvider` |
| `core/src/systems/CheckpointNamingService.ts` | Local `LLMProvider`, `LLMRequest`, `LLMResponse` |
| `core/src/systems/AngelAIDecisionProcessor.ts` | Local `LLMProvider` |
| `core/src/television/generation/ScriptGenerator.ts` | Local `LLMProvider` |
| `core/src/divinity/LLMVisionGenerator.ts` | Local `LLMProvider` |
| `divinity/src/LLMVisionGenerator.ts` | Local `LLMProvider` |

This causes the `registerAllSystems.ts:998` error where `LLMDecisionQueue` (canonical) can't assign to `LLMQueue` (local copy with different `customConfig` type).

### Problem 3: Stale `dist/` artifacts

When core restructures internally, old `.d.ts` files in `dist/` persist. `--build` mode resolves types through these stale paths, creating phantom type incompatibilities.

---

## Implementation Plan

### Step 1: Unify the World type

**Option A (Recommended): Merge WorldImpl into World, eliminate the test helper**

The test helper `World` class in `core/src/World.ts` adds convenience factory methods. These should be on `WorldImpl` directly:

1. Move all methods from `World extends WorldImpl` into `WorldImpl`
2. Rename `WorldImpl` → `World` in `ecs/World.ts`
3. Delete `core/src/World.ts`
4. Update `core/src/index.ts` to export from `./ecs/World.js`
5. Update all internal imports

**Option B (Simpler): Make all internal functions use the public World type**

1. Change internal core functions that accept `WorldImpl` to accept `World` instead
2. Keep both classes but ensure the public API type is used consistently

### Step 2: Consolidate LLM interfaces to canonical source

Replace all local `LLMProvider`, `LLMQueue`, `LLMRequest`, `LLMResponse` definitions with imports from the canonical `core/src/types/LLMTypes.ts`:

1. In each file with a local definition, replace with:
   ```typescript
   import type { LLMProvider, LLMRequest, LLMResponse } from '../types/LLMTypes.js';
   // or from '@ai-village/core' for external packages
   ```

2. For `LLMQueue` specifically: The canonical `LLMDecisionQueue` in `LLMTypes.ts` has:
   ```typescript
   requestDecision(entityId: string, prompt: string, customLLM?: CustomLLMConfig): Promise<void>;
   ```
   Update `AdminAngelSystem.ts` and `ProfessionPersonalityGenerator.ts` to use this type.

3. For external packages (`divinity`): Import from `@ai-village/core` instead of redefining locally.

### Step 3: Clean dist/ and fix build infrastructure

1. Add `prebuild` script to all packages:
   ```json
   "prebuild": "rm -rf dist"
   ```

2. Add `dist/` to `.gitignore` for all packages (if not already)

3. Fix core's `rootDir` to be `./src` (matching other packages) so dist outputs don't have the extra `src/` nesting:
   ```json
   "rootDir": "./src"
   ```
   Then update any references to `dist/src/` paths.

### Step 4: Add CI guard against interface duplication

Create a simple script (`scripts/check-interface-duplication.ts`) that greps for known canonical interface names defined outside their canonical location:

```typescript
// Canonical locations:
// LLMProvider → core/src/types/LLMTypes.ts
// LLMRequest → core/src/types/LLMTypes.ts
// LLMResponse → core/src/types/LLMTypes.ts
// LLMDecisionQueue → core/src/types/LLMTypes.ts
// World → core/src/ecs/World.ts
```

Add to `npm test` or as a pre-commit hook.

### Step 5: Fix remaining type errors

After Steps 1-3, address:
- `building-designer/src/city-feng-shui.ts`: Strict null check fixes (add `!` or null guards)
- `metrics-dashboard`: Remove unused variables, fix DOM type issues
- `navigation/ExplorationSystem.ts:311`: Fix missing arguments
- `language/index.ts`: Add `jsx` compiler option or remove TSX re-export

---

## Effort Breakdown

- **Step 1**: ~20 files changed (World unification)
- **Step 2**: ~10 files changed (replace local interfaces with imports)
- **Step 3**: ~20 package.json files + tsconfig
- **Step 4**: 1 new script
- **Step 5**: ~5 files with minor fixes

## Prevention Going Forward

After these changes:
- Only ONE `World` type exists → no confusion
- All LLM interfaces come from ONE canonical location → no signature drift
- Clean builds always start fresh → no stale artifacts
- CI catches new duplications → no regression
