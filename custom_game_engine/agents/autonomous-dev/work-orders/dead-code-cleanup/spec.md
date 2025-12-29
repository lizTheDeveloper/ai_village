# Dead Code Cleanup

## Overview

Code review identified dead code, unused exports, and commented-out code blocks that should be removed. Dead code increases cognitive load, bloats bundle size, and creates false confidence in test coverage.

---

## 1. Commented-Out Code Blocks

### 1.1 Animal Interaction System (57 lines)

**File:** `demo/src/main.ts:2570-2626`

```typescript
// Old animal interaction code - ENTIRE BLOCK COMMENTED OUT
// - attemptTaming() calls
// - Animal feeding logic
// - Product collection from animals
// - 7 FloatingTextRenderer calls for feedback
```

**Action:** DELETE entirely. This is abandoned code replaced by newer animal systems.

### 1.2 Duplicate Game Object Exposure

**File:** `demo/src/main.ts:2632-2636`

```typescript
// First assignment (less complete)
(window as any).game = {
  game, world, gameLoop, renderer
};

// Second assignment (more complete) at line 2647
(window as any).game = {
  game, world, gameLoop, renderer, inputHandler, ...
};
```

**Action:** DELETE lines 2632-2636, keep the more complete version at 2647.

---

## 2. Unused Exported Functions

### 2.1 ActionDefinitions.ts

**File:** `packages/llm/src/ActionDefinitions.ts`

| Line | Function | Status |
|------|----------|--------|
| 163 | `getActionDescription(behavior: string)` | Never imported |
| 170 | `getActionsByCategory(category)` | Never imported |
| 177 | `getAlwaysAvailableActions()` | Never imported |
| 188 | `getActionsForSkills(skills)` | References progressive-skill-reveal but NOT used in work order |

**Verification Complete (2025-12-28):**
- Checked Progressive Skill Reveal work order (line 164)
- Work order specifies creating `getAvailableActions(agent, skills)` instead
- `getActionsForSkills` represents an earlier API design
- **Conclusion:** Safe to delete - superseded by new implementation approach

### 2.2 SkillContextTemplates.ts

**File:** `packages/llm/src/SkillContextTemplates.ts`

| Line | Function | Status |
|------|----------|--------|
| 282 | `getSkillContext(skillId, level)` | Only used internally |
| 290 | `buildSkillContextSection(skills)` | Never imported externally |
| 332 | `getSkillsSummary(skills)` | Never imported |

**Verification Complete (2025-12-28):**
- Checked Progressive Skill Reveal work order (agents/autonomous-dev/work-orders/progressive-skill-reveal/work-order.md)
- Work order implements skill-gated prompts differently:
  - Does NOT use `getSkillContext()`, `buildSkillContextSection()`, or `getSkillsSummary()`
  - Instead builds skill context inline in StructuredPromptBuilder
  - Uses the `SKILL_CONTEXTS` map directly, not the wrapper functions
- **Conclusion:** These functions represent an earlier design that was superseded
- **Action:** Safe to delete - they are genuinely dead code

---

## 3. Verification Process

Before deleting any code:

```bash
# Check if function is used anywhere
grep -rn "functionName" packages/

# Check if imported
grep -rn "import.*functionName" packages/

# Check test files too
grep -rn "functionName" packages/**/__tests__/
```

---

## 4. Implementation Checklist

- [ ] Delete `demo/src/main.ts:2570-2626` (commented animal code)
- [ ] Delete `demo/src/main.ts:2632-2636` (duplicate game exposure)
- [ ] Verify ActionDefinitions functions aren't in roadmap, then delete
- [ ] Verify SkillContextTemplates functions aren't needed, then delete
- [ ] Run `npm run build` to verify no broken imports
- [ ] Run `npm run test` to verify no test failures
- [ ] Grep for any remaining large commented blocks

---

**End of Specification**
