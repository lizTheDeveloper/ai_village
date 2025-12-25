# Senior Developer Review Checklist

This checklist must be completed before any code is approved for merge. The Review Agent uses this checklist automatically, but human reviewers should also verify these items.

---

## Critical: Antipattern Detection

### 1. No Silent Fallbacks (CLAUDE.md Violation)

**Search for these patterns and REJECT if found in new/modified code:**

```bash
# Run these searches on changed files
grep -n "|| '" <file>           # String fallbacks
grep -n "|| \"" <file>          # String fallbacks
grep -n "|| 0" <file>           # Numeric fallbacks
grep -n "|| \[\]" <file>        # Array fallbacks
grep -n "|| {}" <file>          # Object fallbacks
grep -n "?? '" <file>           # Nullish coalescing with defaults
grep -n "\.get\(.*," <file>     # Map.get with fallback
```

**Exceptions (OK to approve):**
- Truly optional fields with semantically correct defaults (e.g., `description ?? ''`)
- Display-only values that don't affect game state
- Test fixtures

**Not OK (REJECT):**
```typescript
// REJECT: Critical game state
behavior: data.behavior || 'wander'
health: data.health ?? 100
position: { x: data.x || 0, y: data.y || 0 }

// REJECT: Masks missing component
const agent = entity.getComponent('agent') || defaultAgent;
```

---

### 2. No `any` Type Usage

**Search pattern:**
```bash
grep -n ": any" <file>
grep -n "as any" <file>
```

**REJECT if found in:**
- Function parameters
- Return types
- Component access patterns
- Event handlers

**Exceptions (OK with justification):**
- Third-party library integration with no types
- Temporary during refactoring (must have TODO with issue number)

---

### 3. No console.warn for Errors

**Search pattern:**
```bash
grep -n "console.warn" <file>
grep -n "console.error" <file>  # Check these don't continue execution
```

**REJECT if:**
- `console.warn` is followed by `return` with fallback value
- Error is logged but execution continues with invalid state

**Required pattern:**
```typescript
// Must throw or re-throw after logging
console.error('[System] Error:', error);
throw error;  // Required!
```

---

### 4. No Magic Numbers

**Look for unexplained numeric literals:**
```bash
grep -n "[0-9]\{2,\}" <file>  # Two+ digit numbers
```

**REJECT if:**
- Priority values without constants
- Thresholds without explanation
- Cooldowns/timers without named constants

**Required pattern:**
```typescript
// Define constants
const BEHAVIOR_PRIORITY = {
  CRITICAL: 100,
  HIGH: 80,
  NORMAL: 50,
} as const;

// Use named values
return BEHAVIOR_PRIORITY.CRITICAL;
```

---

### 5. No Dead/Commented Code

**Search pattern:**
```bash
grep -n "// TODO" <file>
grep -n "/* " <file>           # Multi-line comments
grep -n "// @ts-ignore" <file>
```

**REJECT if:**
- Large blocks of commented-out code (>5 lines)
- TODO without issue tracker reference
- `@ts-ignore` without explicit justification

---

### 6. Typed Event Bus Usage

**Check all event emissions and subscriptions:**
```bash
grep -n "eventBus.emit" <file>
grep -n "eventBus.subscribe" <file>
grep -n "event: any" <file>
```

**REJECT if:**
- Event handlers typed as `any`
- Event data not validated
- No type interface for event payload

**Required pattern:**
```typescript
interface TillEvent {
  type: 'action:till';
  data: { x: number; y: number; agentId: string };
}

eventBus.subscribe<TillEvent>('action:till', (event) => {
  // event.data is properly typed
});
```

---

## High Priority Checks

### 7. File Size Limits

| Threshold | Action |
|-----------|--------|
| >500 lines | Review for potential splitting |
| >800 lines | Require justification |
| >1000 lines | REJECT - must be split |

**Check with:**
```bash
wc -l <file>
```

---

### 8. Function Complexity

**REJECT functions that:**
- Have >3 levels of nesting
- Are >50 lines long
- Have >5 parameters

**Look for:**
```bash
# Deep nesting indicator
grep -n "if.*{" <file> | head -20
```

---

### 9. Proper Error Propagation

**Every catch block must either:**
1. Re-throw the error
2. Throw a new, more specific error
3. Log AND re-throw

**REJECT:**
```typescript
try {
  doSomething();
} catch (e) {
  console.log(e);
  return null;  // Silently fails!
}
```

---

### 10. Component Access Safety

**Check for unsafe component access:**
```bash
grep -n "getComponent.*!" <file>  # Non-null assertion
grep -n "components.get" <file>
```

**REJECT if:**
- Using `!` without prior existence check
- No type assertion on component access

**Required pattern:**
```typescript
const agent = entity.getComponent<AgentComponent>('agent');
if (!agent) {
  throw new ComponentMissingError('agent', entity.id);
}
// Now safe to use agent
```

---

## Medium Priority Checks

### 11. Test Coverage

- [ ] New functions have corresponding tests
- [ ] Edge cases are tested (null, empty, boundary values)
- [ ] Error paths are tested (throws expected exceptions)

### 12. Import Organization

- [ ] No circular imports
- [ ] Imports from package index, not deep paths
- [ ] No unused imports

### 13. Naming Conventions

- [ ] Functions: `verbNoun` (e.g., `calculateDamage`, `findNearestAgent`)
- [ ] Booleans: `is/has/can` prefix (e.g., `isAlive`, `hasInventory`)
- [ ] Constants: `UPPER_SNAKE_CASE`
- [ ] Types/Interfaces: `PascalCase`

---

## Review Verdicts

After completing the checklist, the Review Agent writes one of:

| Verdict | Meaning |
|---------|---------|
| `Verdict: APPROVED` | All checks pass, ready for merge |
| `Verdict: NEEDS_FIXES` | Issues found, return to Implementation Agent |
| `Verdict: BLOCKED` | Architectural concerns, needs human decision |

---

## Quick Reference: Grep Commands

```bash
# Run all antipattern checks on a file
check_file() {
  local file="$1"
  echo "=== Checking $file ==="

  echo "Silent fallbacks:"
  grep -n "|| ['\"\[{0-9]" "$file" || echo "  None found"

  echo "Any types:"
  grep -n ": any\|as any" "$file" || echo "  None found"

  echo "console.warn:"
  grep -n "console.warn" "$file" || echo "  None found"

  echo "Magic numbers:"
  grep -n "[^a-zA-Z][0-9]\{2,\}[^a-zA-Z0-9]" "$file" | head -10 || echo "  None found"

  echo "Line count:"
  wc -l "$file"
}
```

---

## Escalation to Human Review

Escalate to human reviewer if:

1. **Architectural changes** - New systems, significant refactoring
2. **Security implications** - Auth, permissions, data access
3. **Breaking changes** - API modifications, schema changes
4. **Unclear requirements** - Spec ambiguity, conflicting guidance
5. **Performance concerns** - O(n²) algorithms, memory leaks potential
