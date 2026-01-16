# Diagnostics Harness - Demo Results

## ✅ System is Working!

The diagnostics harness successfully detects invalid property/method access and provides intelligent suggestions for fixes.

## Test Results

Running `npx tsx scripts/test-diagnostics.ts`:

### Summary Statistics
- **Total Unique Issues**: 5
- **Total Occurrences**: 14 (with deduplication working correctly)
- **By Severity**:
  - Errors: 2 (critical Entity access)
  - Warnings: 12 (less critical issues)

### Issues Detected

#### 1. Frequent Access (Deduplication Test) ✅
```
Property: TestObject.frequentError
Count: 10 (accessed 10 times, correctly deduplicated)
Severity: warning
```
**Demonstrates**: Deduplication is working - same issue tracked with increasing count.

#### 2. Entity Property Access Error ✅
```
Property: Entity.nonExistentProperty
Count: 1
Severity: error
Object ID: 04113a13-619c-4dd4-9eb3-bb7e2c64524a
```
**Demonstrates**: Catches undefined property access on entities.

#### 3. Entity Method Error with Suggestion ✅
```
Property: Entity.invalidMethod
Count: 1
Severity: error
Suggestions: id
```
**Demonstrates**: Provides smart suggestions based on Levenshtein distance.

#### 4. Component Field Error with Multiple Suggestions ✅
```
Property: Component:position.z
Count: 1
Severity: warning
Suggestions: x, y
Available Fields: type, x, y
```
**Demonstrates**:
- Tracks component-level issues
- Suggests correct field names
- Lists all available fields

#### 5. Typo Detection with Correction ✅
```
Property: TestObject.valdMethod
Count: 1
Severity: warning
Suggestions: validMethod
```
**Demonstrates**: Smart typo detection - "valdMethod" → suggests "validMethod"

## Key Features Demonstrated

### 1. **Deduplication**
Same issue accessed 10 times → Creates 1 entry with `count: 10` instead of 10 duplicate entries.

### 2. **Smart Suggestions**
Uses Levenshtein distance algorithm to suggest similar property names:
- `valdMethod` → suggests `validMethod`
- `invalidMethod` → suggests `id`
- `z` (on position component) → suggests `x`, `y`

### 3. **Severity Classification**
- **Errors**: Entity access (critical objects)
- **Warnings**: Component/general object access (less critical)

### 4. **Stack Traces**
Every issue includes full stack trace showing exactly where the problem occurred:
```
at <anonymous> (/Users/annhoward/.../test-diagnostics.ts:27:43)
at ModuleJob.run (node:internal/modules/esm/module_job:377:25)
```

### 5. **Context Information**
- Entity issues include component list
- Component issues include available fields
- Generic objects include similar property suggestions

### 6. **JSON Export**
Full diagnostic data can be exported for external analysis, logging, or CI/CD integration.

## How to Use in Your Code

### Browser Console (Recommended for Development)

```javascript
// Enable diagnostics
game.diagnostics.enable();

// Play the game normally - issues are tracked automatically

// View summary
game.diagnostics.summary();
// Logs: "Visit http://localhost:8766/admin → Diagnostics tab"

// Export to JSON
game.diagnostics.exportJSON();
// Logs curl command to download full diagnostic report
```

### Programmatic Usage

```typescript
import { diagnosticsHarness, wrapEntity } from '@ai-village/core';

// Enable
diagnosticsHarness.setEnabled(true);

// Wrap entities/components to track issues
const wrappedEntity = wrapEntity(entity);

// Access invalid property - gets tracked automatically
const value = wrappedEntity.nonExistentProperty; // Tracked!

// Get issues
const allIssues = diagnosticsHarness.getIssues();
const errors = diagnosticsHarness.getIssues({ severity: 'error' });
const frequent = diagnosticsHarness.getIssues({ minCount: 5 });

// Get summary
const summary = diagnosticsHarness.getSummary();
console.log(summary.topIssues);
```

### In Tests

```bash
# Run with diagnostics enabled
DIAGNOSTICS_MODE=true npm test
```

## Admin Dashboard Integration

**Note**: The admin dashboard integration requires the metrics server to be restarted to load the new diagnostics capability. Since we're not restarting servers during this session, the dashboard tab won't appear yet.

Once the server restarts:
```bash
# View in admin console
curl "http://localhost:8766/admin/diagnostics"

# Get summary
curl "http://localhost:8766/admin/queries/diagnostics/summary?format=json"

# List all issues
curl "http://localhost:8766/admin/queries/diagnostics/list?format=json"

# Export full report
curl "http://localhost:8766/admin/queries/diagnostics/export?format=json" > report.json
```

## Real-World Use Cases

### 1. **Finding Typos in System Code**
Developer types `entity.getCompoent('position')` → Diagnostics suggests `getComponent`

### 2. **Detecting Breaking Changes**
After refactoring, run tests with diagnostics enabled to find all places still using old property names.

### 3. **Code Review Aid**
Export diagnostics JSON during CI/CD to catch property access errors before merging.

### 4. **Debugging Production Issues**
Enable in development, reproduce production scenario, export diagnostic data to identify the bug source.

### 5. **Performance Analysis**
Use `count` field to identify hot paths where undefined access is happening frequently (performance impact).

## Files Created

1. **Core System**
   - `packages/core/src/diagnostics/DiagnosticsHarness.ts` - Main tracking system
   - `packages/core/src/diagnostics/ProxyWrappers.ts` - Proxy wrappers for objects

2. **Admin Integration**
   - `packages/core/src/admin/capabilities/diagnostics.ts` - Admin dashboard capability
   - Updated `packages/core/src/admin/capabilities/index.ts` - Registered capability

3. **World Integration**
   - Updated `packages/core/src/ecs/World.ts` - Tick synchronization

4. **Browser API**
   - Updated `demo/src/main.ts` - Added `window.game.diagnostics` API

5. **Exports**
   - Updated `packages/core/src/index.ts` - Exported harness and wrappers

6. **Tests**
   - `packages/core/src/diagnostics/__tests__/DiagnosticsHarness.test.ts` - 12 passing tests

7. **Documentation**
   - `custom_game_engine/DIAGNOSTICS_GUIDE.md` - Comprehensive usage guide
   - `custom_game_engine/DIAGNOSTICS_DEMO.md` - This demo document

8. **Demo Script**
   - `scripts/test-diagnostics.ts` - Standalone test demonstrating all features

## Next Steps

1. **Enable in your workflow**: Add `game.diagnostics.enable()` to your browser console
2. **Run your code**: Play the game, run tests, use the system normally
3. **Review issues**: Check dashboard or export JSON
4. **Fix problems**: Use suggestions and stack traces to fix undefined access
5. **Clean up**: Use `suppressPattern()` for known safe code

## Performance Impact

- **When disabled**: Zero overhead (no proxies created)
- **When enabled**: Minimal overhead (simple property checks)
- **Production**: Never enable (development-only tool)

---

**The diagnostics harness is ready to help you systematically find and fix those pesky "wrong method" bugs! 🎯**
