# Code Review Report

**Feature:** progressive-skill-reveal
**Reviewer:** Review Agent
**Date:** 2025-12-28

## Files Reviewed

- `packages/core/src/components/SkillsComponent.ts` (new, 1298 lines)
- `packages/llm/src/ActionDefinitions.ts` (new, 197 lines)
- `packages/llm/src/StructuredPromptBuilder.ts` (modified, 1498 lines)
- `packages/world/src/entities/AgentEntity.ts` (modified, 346 lines)
- `packages/core/src/buildings/BuildingBlueprintRegistry.ts` (modified)
- `packages/core/src/components/BuildingComponent.ts` (modified)
- `packages/core/src/components/RelationshipComponent.ts` (modified)

## Critical Issues (Must Fix)

### 1. Debug console.log Statements Throughout Codebase

**File:** `packages/llm/src/StructuredPromptBuilder.ts:93, 97, 102, 107, 982, 1027, 1126`

**Pattern:**
```typescript
console.log(`[StructuredPromptBuilder] 🏗️ CRITICAL BUILDING INSTRUCTION...`);
console.log('[StructuredPromptBuilder] Vision state:', {...});
console.log('[StructuredPromptBuilder] Final available actions:', ...);
```

**Required Fix:** Remove ALL console.log statements. Per CLAUDE.md:
> **NEVER add debug print statements or console.log calls to code.**
> Debug statements clutter the codebase and create noise in production.
> Use the Agent Dashboard for debugging instead.

These 7 console.log statements must be removed before approval.

---

### 2. Excessive Use of `any` Type

**File:** `packages/llm/src/StructuredPromptBuilder.ts` (43 instances)
**File:** `packages/core/src/components/SkillsComponent.ts` (3 instances)
**File:** `packages/world/src/entities/AgentEntity.ts` (4 instances)

**Critical instances:**

`StructuredPromptBuilder.ts:36-44`:
```typescript
const name = agent.components.get('identity') as any;
const personality = agent.components.get('personality') as any;
const needs = agent.components.get('needs') as any;
const vision = agent.components.get('vision') as any;
const legacyMemory = agent.components.get('memory') as any;
const inventory = agent.components.get('inventory') as any;
const temperature = agent.components.get('temperature') as any;
const conversation = agent.components.get('conversation') as any;
```

**Required Fix:** Define proper interfaces for components instead of using `as any`. Example:

```typescript
interface IdentityComponent extends Component {
  type: 'identity';
  name: string;
}

interface PersonalityComponent extends Component {
  type: 'personality';
  openness: number;
  extraversion: number;
  // ...
}

// Then use:
const name = agent.components.get('identity') as IdentityComponent;
const personality = agent.components.get('personality') as PersonalityComponent;
```

**Additional any types requiring fixes:**
- `StructuredPromptBuilder.ts:196` - `personality: any, world?: any, inventory?: any`
- `StructuredPromptBuilder.ts:290` - Multiple `any` parameters
- `StructuredPromptBuilder.ts:1169,1201,1231,1256` - `taskFamiliarity: any`
- `SkillsComponent.ts:1274,1276,1280` - `registry: any` and `any[]` return type

These bypass TypeScript's type safety and will hide bugs at compile time.

---

### 3. Nullish Coalescing Used for Critical Game State

**File:** `packages/core/src/components/SkillsComponent.ts`

While most uses of `??` are acceptable (defaulting optional skill levels to 0), there are instances where this pattern could mask missing data:

`SkillsComponent.ts:687,690`:
```typescript
const timesCompleted = (existing?.timesCompleted ?? 0) + 1;
const bestQuality = Math.max(existing?.bestQuality ?? 0, quality);
```

**Assessment:** These are OK - they're genuinely optional fields where 0 is a valid default.

`SkillsComponent.ts:702`:
```typescript
const currentSignatureBonus = signatureTask
  ? domain.familiarity[signatureTask]?.qualityBonus ?? 0
  : 0;
```

**Assessment:** This is acceptable - optional chaining with valid fallback.

**Verdict on this pattern:** APPROVED for this use case. The `??` operator is being used appropriately for truly optional fields.

---

## Warnings (Should Fix)

### 1. File Size Exceeds Recommended Limit

**Files:**
- `SkillsComponent.ts`: 1298 lines (threshold: 1000 lines - REJECT)
- `StructuredPromptBuilder.ts`: 1498 lines (threshold: 1000 lines - REJECT)

**Per review checklist:**
> >1000 lines | REJECT - must be split

**Recommendation:**

**SkillsComponent.ts** should be split into:
1. `SkillsComponent.ts` - Core component definition (lines 1-430)
2. `SkillProgressiveReveal.ts` - Perception/visibility logic (lines 862-1299)
3. `SkillSynergies.ts` - Synergy system (lines 484-639)
4. `SkillDomains.ts` - Domain/familiarity tracking (lines 640-861)

**StructuredPromptBuilder.ts** should be split into:
1. `StructuredPromptBuilder.ts` - Core prompt building (lines 1-200)
2. `PromptContextBuilders.ts` - World context helpers (lines 290-823)
3. `PromptActionBuilders.ts` - Action filtering (lines 953-1129)
4. `PromptSkillHelpers.ts` - Skill-gated helper functions (lines 1167-1499)

**BLOCKING:** These files MUST be split before approval per the review checklist.

---

### 2. Magic Numbers Without Named Constants

**File:** `packages/core/src/components/SkillsComponent.ts`

`Lines 896-902`:
```typescript
if (avgAffinity > 1.2) {
  numSkills = Math.random() < 0.7 ? 3 : 2;
} else if (avgAffinity > 0.8) {
  numSkills = Math.random() < 0.6 ? 2 : 1;
} else {
  numSkills = Math.random() < 0.7 ? 1 : 2;
}
```

**Recommendation:** Extract to named constants:
```typescript
const SKILL_GENERATION_THRESHOLDS = {
  HIGH_AFFINITY: 1.2,
  MEDIUM_AFFINITY: 0.8,
  HIGH_AFFINITY_THREE_SKILL_CHANCE: 0.7,
  MEDIUM_AFFINITY_TWO_SKILL_CHANCE: 0.6,
  LOW_AFFINITY_ONE_SKILL_CHANCE: 0.7,
} as const;
```

`Lines 938-939`:
```typescript
const level: SkillLevel = Math.random() < 0.7 ? 1 : 2;
```

**Recommendation:** Extract `0.7` to named constant `LEVEL_1_PROBABILITY`.

---

### 3. Missing Component Type Safety

**File:** `packages/world/src/entities/AgentEntity.ts:157,296`

```typescript
const personalityWander = entity.getComponent('personality') as any;
const personalityLLM = entity.getComponent('personality') as any;
```

**Required Fix:** Import proper PersonalityComponent type:
```typescript
import type { PersonalityComponent } from '@ai-village/core';

const personality = entity.getComponent('personality') as PersonalityComponent;
if (!personality) {
  throw new Error('AgentEntity requires PersonalityComponent');
}
entity.addComponent(generateRandomStartingSkills(personality));
```

---

## Passed Checks

- [x] Build passes (`npm run build` succeeded)
- [x] No silent fallback violations (all `??` uses are appropriate for optional fields)
- [x] No `console.warn` without throwing
- [x] No dead/commented code
- [x] Proper error propagation (functions throw on invalid input)
- [x] No bare `any` in event handlers
- [x] Component type names use lowercase_with_underscores ('skills', 'building', 'relationship')

## Tests Status

Tests show 23 failed test files, but analysis reveals:
- Failures are in **pre-existing test files** for unimplemented features (QualityEconomy, HarvestQuality, ItemQuality)
- No test failures directly related to progressive-skill-reveal implementation
- Test failures are: `InventoryComponent is not a constructor`, `Cannot read properties of undefined (reading 'levels')` - these are test infrastructure issues, not implementation bugs

**Progressive-skill-reveal specific tests:** Not yet written. Per work order acceptance criteria:
- Need integration test: "Spawn 100 agents, verify 80%+ have skill > 0"
- Need visibility test: "Verify low-skill agents don't see rare resources"
- Need information depth test: "Verify prompts show appropriate detail for skill level"

## Implementation Quality Assessment

### Strengths
1. **Comprehensive skill system** - Covers all requirements from progressive-skill-reveal-spec.md
2. **Type-safe skill levels** - Uses literal types `0 | 1 | 2 | 3 | 4 | 5` instead of `number`
3. **No silent failures** - Functions throw proper errors when personality is missing
4. **Personality-based affinities** - Good integration with existing personality system
5. **Progressive reveal implemented correctly** - Skill-gated entity visibility, information depth, and actions

### Weaknesses
1. **Too many debug statements** - 7 console.log calls violate CLAUDE.md
2. **Excessive any usage** - 50+ instances bypass type safety
3. **File sizes too large** - 2 files exceed 1000 line limit
4. **Missing tests** - No tests written for progressive skill reveal functionality

---

## Verdict

**Verdict: NEEDS_FIXES**

**Blocking Issues:** 3

1. **CRITICAL:** Remove all 7 debug console.log statements from StructuredPromptBuilder.ts (CLAUDE.md violation)
2. **CRITICAL:** Split SkillsComponent.ts (1298 lines) and StructuredPromptBuilder.ts (1498 lines) - both exceed 1000 line limit
3. **CRITICAL:** Replace 50+ `as any` casts with proper component interfaces

**Required Actions:**

1. **Immediate (before approval):**
   - Remove all console.log statements
   - Split SkillsComponent.ts into 4 files
   - Split StructuredPromptBuilder.ts into 4 files
   - Define proper TypeScript interfaces for all components (IdentityComponent, PersonalityComponent, etc.)

2. **High Priority (before merge):**
   - Extract magic numbers to named constants
   - Write integration tests per acceptance criteria
   - Fix any type usage in AgentEntity.ts

## Detailed Fix Instructions

### Fix 1: Remove Debug Statements

```bash
# Remove these lines from StructuredPromptBuilder.ts:
sed -i '' '/console\.log.*StructuredPromptBuilder/d' packages/llm/src/StructuredPromptBuilder.ts
```

### Fix 2: Split SkillsComponent.ts

Create new files:
1. `packages/core/src/components/skills/SkillComponent.ts` - Move lines 1-430
2. `packages/core/src/components/skills/SkillSynergies.ts` - Move lines 484-639
3. `packages/core/src/components/skills/SkillDomains.ts` - Move lines 640-861
4. `packages/core/src/components/skills/SkillProgressiveReveal.ts` - Move lines 862-1299
5. Create `packages/core/src/components/skills/index.ts` to re-export all

### Fix 3: Define Component Interfaces

Create `packages/core/src/components/ComponentTypes.ts`:
```typescript
export interface IdentityComponent extends Component {
  type: 'identity';
  name: string;
}

export interface PersonalityComponent extends Component {
  type: 'personality';
  openness: number;
  extraversion: number;
  agreeableness: number;
  conscientiousness: number;
  neuroticism: number;
  workEthic: number;
  leadership: number;
}

// ... define all component types
```

---

## Summary

The progressive-skill-reveal implementation is **functionally complete** and follows the specification correctly. However, it violates critical code quality standards:

1. Debug statements in production code (CLAUDE.md violation)
2. Files too large (review checklist violation)
3. Type safety bypassed with `any` (antipattern)

These issues must be resolved before the code can be approved for playtest.

**Estimated fix time:** 2-3 hours
- 15 min: Remove console.log statements
- 1-2 hours: Split large files
- 1 hour: Define component interfaces and fix any types
