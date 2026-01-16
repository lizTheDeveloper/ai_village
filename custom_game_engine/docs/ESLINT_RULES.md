# ESLint Rules

> Custom ESLint rules to catch anti-patterns and enforce code quality.

**Last Updated:** 2026-01-15

---

## Overview

The codebase uses ESLint with custom rules to automatically catch common mistakes documented in CLAUDE.md and COMMON_PITFALLS.md. These rules act as guardrails to prevent performance regressions and architectural violations.

**Philosophy:** Errors block commits, warnings guide improvements. The pre-commit hook runs `npm run lint:errors` to catch critical issues while allowing development velocity.

---

## Table of Contents

- [Rule Categories](#rule-categories)
  - [Entity Lifecycle Rules](#1-entity-lifecycle-rules)
  - [Silent Fallback Rules](#2-silent-fallback-rules)
  - [Performance Rules (System Files Only)](#3-performance-rules-system-files-only)
  - [Complexity Rules](#4-complexity-rules)
  - [Type Safety Rules](#5-type-safety-rules)
  - [Error Handling Rules](#6-error-handling-rules)
  - [Code Quality Rules](#7-code-quality-rules)
- [File-Specific Rules](#file-specific-rules)
- [Running ESLint](#running-eslint)
- [Pre-commit Hook](#pre-commit-hook)
- [Suppressing Rules](#suppressing-rules)
- [Adding New Rules](#adding-new-rules)
- [Troubleshooting](#troubleshooting)
- [Related Documentation](#related-documentation)

---

## Rule Categories

### 1. Entity Lifecycle Rules

#### `no-restricted-syntax` - removeEntity

**Severity:** Error (in systems), Warning (elsewhere)

**Rule ID:** `CallExpression[callee.property.name="removeEntity"]`

Prevents using `world.removeEntity()` - entities should be marked as corrupted instead.

```typescript
// ❌ BLOCKED
world.removeEntity(entity.id);

// ✅ CORRECT
entity.addComponent({
  type: 'corrupted',
  corruption_reason: 'invalid_state',
  recoverable: true,
  corruption_date: Date.now()
});
```

**Why:** See [CORRUPTION_SYSTEM.md](../CORRUPTION_SYSTEM.md) - entities should never be deleted for data recovery and emergent gameplay. This implements the "Conservation of Game Matter" principle.

**Applies to:**
- All system files (`**/systems/**/*.ts`): **ERROR**
- All other files: **WARNING**

---

### 2. Silent Fallback Rules

These rules warn about defaulting to fallback values instead of failing loudly on missing required data.

#### `no-restricted-syntax` - Silent Fallback with `||`

**Severity:** Warning

**Rule ID:** `LogicalExpression[operator="||"][right.type="Literal"]`

Warns about `|| defaultValue` patterns for required data.

```typescript
// ⚠️ WARNING
const health = data.health || 100;
const name = entity.name || "Unknown";

// ✅ BETTER (if required)
if (data.health === undefined) {
  throw new Error('Missing required field: health');
}
const health = data.health;

// ✅ OK (if truly optional, add comment)
// Optional field - defaults to empty string for display
const description = data.description || '';
```

#### `no-restricted-syntax` - Silent Fallback with `??`

**Severity:** Warning

**Rule ID:** `LogicalExpression[operator="??"][right.type="Literal"]`

Warns about `?? defaultValue` patterns for required data.

```typescript
// ⚠️ WARNING
const count = options.count ?? 10;

// ✅ BETTER (document why default is safe)
// Default count is safe - only affects display, not game logic
const count = options.count ?? 10;
```

**Why:** See [CLAUDE.md](../CLAUDE.md#2-no-silent-fallbacks---crash-on-invalid-data) and [COMMON_PITFALLS.md](../COMMON_PITFALLS.md#8-silent-fallbacks-crash-on-invalid-data). Required data should throw, not silently default. Silent fallbacks hide bugs and data corruption.

**When to suppress:**
- Optional UI text/descriptions
- Display-only values that don't affect game logic
- Explicitly documented safe defaults

Always add a comment explaining why the fallback is safe.

---

### 3. Performance Rules (System Files Only)

These rules apply **only to files in `**/systems/**/*.ts`** and are elevated to **ERROR** severity because system code runs 20 times per second.

#### `no-restricted-syntax` - Query in For Loop

**Severity:** Error (systems only)

**Rule ID:** `ForStatement > CallExpression[callee.property.name="query"]`

```typescript
// ❌ BLOCKED
for (const entity of entities) {
  const others = world.query().with(CT.Position).execute();
}

// ✅ CORRECT
const others = world.query().with(CT.Position).execute();
for (const entity of entities) {
  // Use cached query result
}
```

**Why:** Queries are expensive (O(n) entity iteration). Calling them in a loop makes O(n) into O(n²), causing 1000ms+ tick times. See [COMMON_PITFALLS.md](../COMMON_PITFALLS.md#2-query-in-loop-catastrophic-performance).

#### `no-restricted-syntax` - Query in While Loop

**Severity:** Error (systems only)

**Rule ID:** `WhileStatement > CallExpression[callee.property.name="query"]`

Same as above, but for while loops.

```typescript
// ❌ BLOCKED
while (condition) {
  const entities = world.query().with(CT.Health).execute();
}

// ✅ CORRECT
const entities = world.query().with(CT.Health).execute();
while (condition) {
  // Use cached query result
}
```

#### `no-restricted-syntax` - Math.sqrt in Systems

**Severity:** Warning (systems only)

**Rule ID:** `CallExpression[callee.object.name="Math"][callee.property.name="sqrt"]`

```typescript
// ⚠️ WARNING
if (Math.sqrt(dx*dx + dy*dy) < radius) { }

// ✅ CORRECT
const radiusSquared = radius * radius;
if (dx*dx + dy*dy < radiusSquared) { }
```

**Why:** `Math.sqrt()` is 10-20x slower than multiplication. In hot paths (20 TPS, 100+ entities), this adds up. See [PERFORMANCE.md](../PERFORMANCE.md#2-expensive-math-operations).

#### `no-restricted-syntax` - Math.pow in Systems

**Severity:** Error (systems only)

**Rule ID:** `CallExpression[callee.object.name="Math"][callee.property.name="pow"]`

```typescript
// ❌ BLOCKED
const distSquared = Math.pow(dx, 2) + Math.pow(dy, 2);

// ✅ CORRECT
const distSquared = dx * dx + dy * dy;
```

**Why:** `Math.pow(x, 2)` is a function call with exponent logic. `x * x` is a single multiplication - 10x speed difference.

#### `no-restricted-syntax` - console.log in Systems

**Severity:** Error (systems only)

**Rule ID:** `CallExpression[callee.object.name="console"][callee.property.name=/^(log|debug|info)$/]`

```typescript
// ❌ BLOCKED in systems
console.log('debug:', value);
console.debug('processing entity');
console.info('system started');

// ✅ ALLOWED
console.warn('[SystemName] Warning: unusual condition');
console.error('[SystemName] Error: failed to process entity');
```

**Why:** Systems run 20 times per second. `console.log()` in a loop over 100 entities = 2000 console writes per second, slowing the game to a crawl. Only errors and warnings are allowed.

#### `no-restricted-properties` - Repeated world.query()

**Severity:** Error (systems only)

**Property:** `world.query`

```typescript
// ❌ CONSIDER CACHING
update(world: World) {
  const agents = world.query().with(CT.Agent).execute();
  const positions = world.query().with(CT.Position).execute();
  const nearby = world.query().with(CT.Position, CT.Spatial).execute();
  // Multiple queries - are they all necessary?
}

// ✅ BETTER
private queryCache = {
  agents: null as Entity[] | null,
  positions: null as Entity[] | null
};

update(world: World) {
  if (!this.queryCache.agents) {
    this.queryCache.agents = world.query().with(CT.Agent).execute();
  }
  // Use cached results
}
```

**Why:** This is a warning to consider caching. Not all repeated queries are bad, but reviewing them prevents unnecessary overhead.

---

### 4. Complexity Rules

These rules prevent "God Objects" - classes/functions that are too large or complex.

#### `complexity`

**Severity:** Warning
**Max:** 15 branches per function

```typescript
// ⚠️ WARNING if cyclomatic complexity > 15
function processEntity(entity: Entity) {
  if (condition1) { }
  else if (condition2) { }
  else if (condition3) { }
  // ... 15+ branches
}

// ✅ BETTER - extract to smaller functions
function processEntity(entity: Entity) {
  if (isTypeA(entity)) return processTypeA(entity);
  if (isTypeB(entity)) return processTypeB(entity);
  // Delegate to specialized functions
}
```

**Why:** High cyclomatic complexity makes code hard to understand, test, and debug. Break complex functions into smaller, focused pieces.

#### `max-lines-per-function`

**Severity:** Warning
**Max:** 100 lines (excluding blank lines and comments)

```typescript
// ⚠️ WARNING if function > 100 lines
function massiveFunction() {
  // 150 lines of code
}

// ✅ BETTER - extract logical sections
function processData() {
  const validated = validateInput();
  const transformed = transformData(validated);
  return saveResults(transformed);
}
```

#### `max-lines`

**Severity:** Warning
**Max:** 500 lines per file (excluding blank lines and comments)

**Why:** Files over 500 lines are hard to navigate and usually doing too much. Consider splitting into multiple files or extracting utilities.

**Note:** Disabled in test files (`**/__tests__/**/*.ts`, `**/*.test.ts`)

#### `max-depth`

**Severity:** Warning
**Max:** 4 levels of nested blocks

```typescript
// ⚠️ WARNING if nesting > 4 levels
if (a) {
  if (b) {
    for (const x of arr) {
      if (c) {
        while (d) {  // 5th level!
          // Code
        }
      }
    }
  }
}

// ✅ BETTER - extract nested logic or use early returns
if (!a) return;
if (!b) return;
for (const x of arr) {
  if (!c) continue;
  processWhileCondition(d);
}
```

#### `max-params`

**Severity:** Warning
**Max:** 5 parameters per function

```typescript
// ⚠️ WARNING if params > 5
function createEntity(id, x, y, name, health, speed, type) { }

// ✅ BETTER - use options object
interface EntityOptions {
  id: string;
  position: { x: number; y: number };
  name: string;
  stats: { health: number; speed: number };
  type: string;
}
function createEntity(options: EntityOptions) { }
```

#### `max-statements`

**Severity:** Warning
**Max:** 30 statements per function

#### `max-nested-callbacks`

**Severity:** Warning
**Max:** 3 nested callbacks

**Why:** Deep callback nesting (callback hell) makes code hard to read. Use async/await or extract to named functions.

---

### 5. Type Safety Rules

#### `@typescript-eslint/no-explicit-any`

**Severity:** Warning

```typescript
// ⚠️ WARNING
const data: any = getComponent();
const result = doSomething(data as any);

// ✅ BETTER
const data = getComponent() as PositionComponent;
// Or define proper types
interface ComponentData {
  x: number;
  y: number;
}
const data: ComponentData = getComponent();
```

**Why:** `any` disables TypeScript's type checking, hiding bugs. Fix the underlying types instead.

**Note:** Disabled in test files where `any` is sometimes pragmatic.

#### `@typescript-eslint/no-unused-vars`

**Severity:** Warning
**Ignore pattern:** `^_` (variables/args starting with underscore)

```typescript
// ⚠️ WARNING
const unusedVariable = 10;
function process(entity: Entity, unusedParam: string) { }

// ✅ OK - prefixed with underscore
const _unused = 10;
function process(entity: Entity, _unusedParam: string) { }
```

**Why:** Unused variables clutter code. Prefix with `_` if you need to keep them for interface compliance.

#### `@typescript-eslint/explicit-function-return-type`

**Severity:** Off (currently disabled - may be enabled later)

**Why:** Too noisy for current development phase. May be enabled in the future for better type safety.

---

### 6. Error Handling Rules

#### `no-empty`

**Severity:** Error
**Allow empty catch:** false

```typescript
// ❌ BLOCKED
try {
  riskyOperation();
} catch (e) {
  // Empty catch block
}

// ✅ CORRECT
try {
  riskyOperation();
} catch (e) {
  console.error('[SystemName] Failed operation:', e);
  // Or re-throw: throw new Error('Operation failed', { cause: e });
}
```

**Why:** Empty catch blocks silently swallow errors, making debugging impossible.

#### `@typescript-eslint/no-floating-promises`

**Severity:** Off (requires type checking, enable with project configuration)

**Future:** Will be enabled to catch unhandled promise rejections.

#### `no-console`

**Severity:** Warning
**Allow:** `error`, `info`, `debug`

```typescript
// ⚠️ WARNING
console.log('debug message');
console.warn('warning');

// ✅ ALLOWED
console.error('[SystemName] Error occurred');
console.info('[SystemName] Important info');
console.debug('[SystemName] Debug info');
```

**Why:** `console.log()` and `console.warn()` spam the console. Use `console.error()` for errors and `console.info()` for important information.

**Note:** In systems, this is more strict (see Performance Rules).

---

### 7. Code Quality Rules

#### `prefer-const`

**Severity:** Warning

```typescript
// ⚠️ WARNING
let value = 10;
// ... value never reassigned

// ✅ CORRECT
const value = 10;
```

#### `no-var`

**Severity:** Error

```typescript
// ❌ BLOCKED
var x = 10;

// ✅ CORRECT
const x = 10;
let y = 20;
```

#### `eqeqeq`

**Severity:** Error
**Mode:** always

```typescript
// ❌ BLOCKED
if (value == null) { }
if (count == 0) { }

// ✅ CORRECT
if (value === null) { }
if (count === 0) { }
```

**Why:** `==` performs type coercion, leading to subtle bugs. Always use `===`.

#### `no-duplicate-imports`

**Severity:** Error

```typescript
// ❌ BLOCKED
import { ComponentA } from './components.js';
import { ComponentB } from './components.js';

// ✅ CORRECT
import { ComponentA, ComponentB } from './components.js';
```

#### `no-constant-binary-expression`

**Severity:** Error

```typescript
// ❌ BLOCKED
const result = x || 'default' && y;  // Always truthy
if (typeof x === 'string' && typeof x === 'number') { }  // Always false

// ✅ CORRECT
const result = (x || 'default') && y;
if (typeof x === 'string' || typeof x === 'number') { }
```

**Why:** Detects logic errors that result in constant expressions.

---

### Performance Anti-Patterns (Global)

These apply to **all files** at **warning** level (systems have them as errors).

#### `no-restricted-syntax` - Math.pow for Squaring

**Severity:** Warning (global)

**Rule ID:** `CallExpression[callee.object.name="Math"][callee.property.name="pow"][arguments.1.value=2]`

```typescript
// ⚠️ WARNING
Math.pow(x, 2)

// ✅ CORRECT
x * x
```

#### `no-restricted-syntax` - Array.from(map.values())

**Severity:** Warning (global)

**Rule ID:** `CallExpression[callee.object.name="Array"][callee.property.name="from"] > MemberExpression[property.name="values"]`

```typescript
// ⚠️ WARNING
const arr = Array.from(map.values());
for (const item of arr) { }

// ✅ CORRECT
for (const item of map.values()) { }
```

**Why:** Avoid unnecessary array allocations. Iterate directly.

#### `no-restricted-syntax` - Object.keys() in Hot Paths

**Severity:** Warning (global)

**Rule ID:** `CallExpression[callee.object.name="Object"][callee.property.name="keys"] > CallExpression[callee.property.name="getComponent"]`

```typescript
// ⚠️ WARNING
Object.keys(entity.getComponent(CT.Inventory)).forEach(...)

// ✅ BETTER
const inventory = entity.getComponent(CT.Inventory);
// Cache the component, then iterate
```

**Why:** Cache component access to avoid repeated lookups.

---

## File-Specific Rules

ESLint applies different rule severities based on file location:

| File Pattern | Special Rules | Rationale |
|--------------|---------------|-----------|
| `**/systems/**/*.ts` | **Strictest** - All performance rules as **errors** | Systems run 20 TPS, performance critical |
| `**/__tests__/**/*.ts` | **Relaxed** - Most rules disabled | Tests need flexibility for mocking/setup |
| `**/*.test.ts` | **Relaxed** - Most rules disabled | Same as above |
| `**/__benchmarks__/**/*.bench.ts` | **Relaxed** - Performance rules disabled | Benchmarks intentionally test slow code |
| Everything else | **Standard** - Most rules as **warnings** | Balance strictness with development velocity |

### System File Overrides

In `**/systems/**/*.ts`, the following rules are **ERROR** instead of **WARNING**:

- `no-restricted-syntax` (all performance patterns)
- `no-restricted-properties` (world.query)
- All console rules

### Test File Overrides

In `**/__tests__/**/*.ts` and `**/*.test.ts`, the following rules are **DISABLED**:

- `max-lines-per-function`
- `max-lines`
- `@typescript-eslint/no-explicit-any`
- `no-console`
- `no-restricted-syntax`
- `no-restricted-properties`

---

## Running ESLint

### Command Line

```bash
# Check all files
npm run lint

# Check only errors (what blocks commits)
npm run lint:errors

# Check specific files
npm run lint -- path/to/file.ts

# Check specific directories
npm run lint -- packages/core/src/systems/

# Auto-fix what's possible
npm run lint -- --fix

# Show rule IDs in output (for suppressing specific rules)
npm run lint -- --format=stylish

# Check from project root (if not in custom_game_engine/)
cd custom_game_engine && npm run lint
```

### Common Commands

```bash
# Pre-commit check (what the hook runs)
npm run lint:errors

# Fix style issues automatically
npm run lint -- --fix

# Check only systems (performance-critical)
npm run lint -- packages/*/src/systems/

# Check only changed files (faster)
git diff --name-only | grep -E '\.ts$' | xargs npm run lint --
```

### IDE Integration

**VSCode:** Install [ESLint extension](https://marketplace.visualstudio.com/items?itemName=dbaeumer.vscode-eslint)

**Settings:**
```json
{
  "eslint.enable": true,
  "eslint.validate": ["typescript"],
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  }
}
```

**WebStorm/IntelliJ:** ESLint is enabled by default. Configure in Settings → Languages & Frameworks → JavaScript → Code Quality Tools → ESLint.

---

## Pre-commit Hook

The pre-commit hook (`.husky/pre-commit`) runs `npm run lint:errors` before allowing commits.

**What it does:**
- Runs ESLint with `--quiet` flag (only shows errors)
- Blocks commit if any **errors** are found
- Allows commit if only **warnings** exist

**Why warnings don't block:**
- Development velocity - don't block progress on style issues
- Incremental improvement - fix warnings in refactoring passes
- Context-dependent - some warnings are false positives

**Bypassing (emergency only):**
```bash
# Skip pre-commit hook (use sparingly!)
git commit --no-verify -m "Emergency fix"
```

**Note:** Never bypass for performance or anti-pattern errors. These exist to prevent production issues.

---

## Suppressing Rules

When you have a **legitimate reason** to violate a rule, use ESLint suppression comments.

### Single Line Suppression

```typescript
// Suppress next line
// eslint-disable-next-line no-restricted-syntax
const value = data.value ?? defaultValue;

// Suppress specific rule(s)
// eslint-disable-next-line no-console, @typescript-eslint/no-explicit-any
console.log('Debug:', data as any);
```

### Block Suppression

```typescript
/* eslint-disable no-restricted-syntax */
// Multiple lines that need the rule disabled
const a = data.a ?? 10;
const b = data.b ?? 20;
const c = data.c ?? 30;
/* eslint-enable no-restricted-syntax */
```

### Entire File Suppression

```typescript
/* eslint-disable no-restricted-syntax */
// Rest of file...
```

**Use sparingly!** File-level suppression is a code smell.

### With Explanation (REQUIRED)

**Always add a comment explaining WHY the suppression is needed:**

```typescript
// Default values are safe here - these are display-only fields that don't affect game logic.
// The system will function correctly with or without these values.
// eslint-disable-next-line no-restricted-syntax
const displayName = entity.displayName ?? 'Unknown Entity';
const description = entity.description ?? '';
```

### Suppressing Multiple Rules

```typescript
// Benchmark code intentionally uses slow patterns to test performance
/* eslint-disable no-restricted-syntax, max-lines-per-function */
function benchmarkSlowCode() {
  // 200 lines of intentionally slow code for benchmarking
}
/* eslint-enable no-restricted-syntax, max-lines-per-function */
```

---

## Adding New Rules

### 1. Identify the Anti-Pattern

Document the anti-pattern in [COMMON_PITFALLS.md](../COMMON_PITFALLS.md):
- What breaks
- Why it breaks
- How to fix it
- Where it's documented

### 2. Choose the Rule Type

**Use existing rules if possible:**
- Complexity: `complexity`, `max-lines`, `max-depth`, etc.
- Type safety: `@typescript-eslint/*`
- Code quality: `prefer-const`, `eqeqeq`, etc.

**Use `no-restricted-syntax` for custom patterns:**
- Identify the AST selector (use [AST Explorer](https://astexplorer.net/))
- Add to `eslint.config.js`

### 3. Add to eslint.config.js

```javascript
{
  selector: 'YourASTSelector',
  message: 'CATEGORY: Description. See DOCUMENTATION.md'
}
```

**Message format:**
- `FORBIDDEN:` - Never allowed
- `PERFORMANCE:` - Performance anti-pattern
- `ANTI-PATTERN:` - Bad practice
- `WARNING:` - Consider alternatives

### 4. Set Appropriate Severity

- **Error:** Breaks the game, critical performance issue, data loss
- **Warning:** Bad practice, style issue, non-critical performance

Consider file-specific overrides (systems stricter than utilities).

### 5. Document the Rule

Add section to this file with:
- Rule ID and severity
- Code examples (bad and good)
- Why the rule exists
- Links to related documentation
- When to suppress (if ever)

### 6. Test the Rule

```bash
# Create test file with anti-pattern
echo "const x = Math.pow(y, 2);" > test-rule.ts

# Run ESLint
npm run lint -- test-rule.ts

# Should show error/warning
# Clean up
rm test-rule.ts
```

### 7. Update Pre-commit Hook (if needed)

If the rule should block commits, ensure it's an **error** (not warning).

---

## Troubleshooting

### ESLint Not Running

**Symptom:** `npm run lint` does nothing or shows no output

**Fix:**
```bash
# Check ESLint is installed
npm list eslint

# Re-install if missing
npm install

# Verify config exists
cat eslint.config.js

# Test on specific file
npm run lint -- package.json
```

### Rules Not Applied to TypeScript Files

**Symptom:** Violations not detected in `.ts` files

**Fix:**
```bash
# Check file pattern in eslint.config.js
# Should have: files: ['**/*.ts']

# Verify file isn't ignored
# Check: ignores: ['**/dist/**', '**/node_modules/**', '**/*.js', '!eslint.config.js']

# Run with debug
npm run lint -- --debug path/to/file.ts
```

### False Positives

**Symptom:** ESLint flags code that's actually correct

**Options:**

1. **Suppress with comment** (if truly a false positive)
   ```typescript
   // This pattern is safe because [reason]
   // eslint-disable-next-line rule-name
   ```

2. **Refactor to avoid the pattern** (preferred)
   ```typescript
   // Instead of working around the rule, fix the code
   ```

3. **Report false positive** (if rule is too strict)
   - Document the case in this file
   - Discuss in team whether to adjust the rule

### Slow Linting

**Symptom:** `npm run lint` takes minutes

**Fix:**
```bash
# Lint only changed files
git diff --name-only | grep '\.ts$' | xargs npm run lint --

# Use --cache flag (ESLint feature)
npm run lint -- --cache

# Exclude large directories
npm run lint -- --ignore-pattern "**/node_modules/**" --ignore-pattern "**/dist/**"

# Check for performance in eslint.config.js
# Ensure `@typescript-eslint/no-floating-promises` is off (requires type checking)
```

### Pre-commit Hook Blocks Commit

**Symptom:** Can't commit due to ESLint errors

**Fix (in priority order):**

1. **Fix the errors** (preferred)
   ```bash
   # See what's wrong
   npm run lint:errors

   # Auto-fix if possible
   npm run lint -- --fix

   # Manual fix for remaining issues
   ```

2. **Suppress if legitimate** (with explanation)
   ```typescript
   // [Explanation why this is safe]
   // eslint-disable-next-line rule-name
   ```

3. **Emergency bypass** (only for critical fixes)
   ```bash
   git commit --no-verify -m "Emergency: fix production crash"
   # Follow up with a commit that fixes ESLint issues
   ```

### Rule Conflicts with Prettier/Other Tools

**Symptom:** ESLint and Prettier disagree on formatting

**Fix:**
```bash
# ESLint handles logic, Prettier handles formatting
# Run Prettier first, then ESLint

# If conflict exists, disable the ESLint formatting rule
# Keep logic rules, disable style rules
```

**Note:** This codebase doesn't use Prettier currently. If added, configure ESLint to defer formatting to Prettier.

### TypeScript Errors vs ESLint Errors

**Symptom:** `npm run build` fails but `npm run lint` passes

**Fix:**
```bash
# These are separate tools:
# - TypeScript checks types (npm run build)
# - ESLint checks patterns (npm run lint)

# Both must pass:
npm run build  # Type safety
npm run lint   # Code quality

# Run both before committing
npm run build && npm run lint:errors
```

---

## Related Documentation

### Primary Documentation
- **[CLAUDE.md](../CLAUDE.md)** - Development guidelines (Code Quality Rules section)
- **[COMMON_PITFALLS.md](../COMMON_PITFALLS.md)** - Anti-patterns and fixes
- **[PERFORMANCE.md](../PERFORMANCE.md)** - Performance optimization guide

### Specific Topics
- **[CORRUPTION_SYSTEM.md](../CORRUPTION_SYSTEM.md)** - Why entities aren't deleted
- **[SCHEDULER_GUIDE.md](../SCHEDULER_GUIDE.md)** - System priority, throttling, fixed timestep
- **[ARCHITECTURE_OVERVIEW.md](../ARCHITECTURE_OVERVIEW.md)** - ECS architecture
- **[SYSTEMS_CATALOG.md](../SYSTEMS_CATALOG.md)** - All systems with priorities and components

### External Resources
- [ESLint Documentation](https://eslint.org/docs/latest/)
- [TypeScript ESLint](https://typescript-eslint.io/)
- [AST Explorer](https://astexplorer.net/) - For writing custom rules
- [ESLint Rule API](https://eslint.org/docs/latest/extend/custom-rules)

---

## Quick Reference

### Most Important Rules (What Blocks Commits)

| Rule | Severity | Why | Doc |
|------|----------|-----|-----|
| `removeEntity` | **ERROR** (systems) | Data loss, corruption | [CORRUPTION_SYSTEM.md](../CORRUPTION_SYSTEM.md) |
| Query in loop | **ERROR** (systems) | O(n²) → O(n³) complexity | [PERFORMANCE.md](../PERFORMANCE.md#1-repeated-queries) |
| `Math.pow(x, 2)` | **ERROR** (systems) | 10x slower than `x*x` | [PERFORMANCE.md](../PERFORMANCE.md#2-expensive-math-operations) |
| `console.log` | **ERROR** (systems) | Performance + noise | [CLAUDE.md](../CLAUDE.md#4-no-debug-output) |
| Empty catch | **ERROR** | Swallows errors | - |
| `no-var` | **ERROR** | Use const/let | - |
| `eqeqeq` | **ERROR** | Type coercion bugs | - |

### Most Common Warnings

| Rule | Severity | Fix | Suppress When |
|------|----------|-----|---------------|
| Silent fallbacks (`\|\|`, `??`) | **WARNING** | Throw on required data | Optional display fields |
| `Math.sqrt` | **WARNING** (systems) | Use squared distance | Non-performance code |
| `any` type | **WARNING** | Add proper types | Test mocking |
| Complexity | **WARNING** | Extract functions | Complex but necessary |
| `max-lines` | **WARNING** | Split file | Large but cohesive |

---

**Remember:** ESLint is a tool, not a tyrant. Rules exist to catch real bugs that slipped through in production. If a rule doesn't make sense for your case, suppress it with a clear explanation why.

---

**Last Updated:** 2026-01-15
