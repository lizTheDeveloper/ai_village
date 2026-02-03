# Diagnostics Harness Guide

The Diagnostics Harness is a comprehensive system for detecting and tracking invalid property/method access throughout the codebase. It helps systematically identify bugs caused by:

- Accessing undefined properties
- Calling undefined methods
- Type mismatches
- Invalid component access patterns
- Performance warnings

## Quick Start

### 1. Enable Diagnostics

**In Browser Console (Recommended):**
```javascript
game.diagnostics.enable();
```

**In Tests (via environment variable):**
```bash
DIAGNOSTICS_MODE=true npm test
```

Note: Environment variables only work in Node.js/test environments. For browser usage, use `game.diagnostics.enable()`.

### 2. View Issues

Visit the Admin Dashboard:
```
http://localhost:8766/admin
```

Click the **Diagnostics** tab (🔍 icon).

Or use curl:
```bash
# Get summary
curl "http://localhost:8766/admin/queries/diagnostics/summary?format=json"

# List all issues
curl "http://localhost:8766/admin/queries/diagnostics/list?format=json"

# Export full report
curl "http://localhost:8766/admin/queries/diagnostics/export?format=json" > diagnostics.json
```

## Features

### Automatic Detection

The harness wraps entities, components, and world objects to intercept property access:

```typescript
// This would trigger a diagnostic issue:
const badProperty = entity.nonExistentMethod();
// DiagnosticIssue:
//   type: 'undefined_method'
//   severity: 'error'
//   property: 'nonExistentMethod'
//   suggestions: ['existingMethod1', 'existingMethod2']
```

### Issue Deduplication

Issues are deduplicated by object type + property + object ID:
- First occurrence creates the issue
- Subsequent occurrences increment the `count` field
- Helps prioritize the most frequent problems

### Smart Suggestions

Uses Levenshtein distance to suggest similar property names:

```typescript
// Typo: entity.getCompoent('position')
// DiagnosticIssue:
//   property: 'getCompoent'
//   suggestions: ['getComponent', 'hasComponent']
```

### Performance Impact

- **Zero overhead when disabled** - no proxies created
- **Minimal overhead when enabled** - simple property checks
- **No impact on production** - designed for development only

## Browser Console API

### Enable/Disable

```javascript
game.diagnostics.enable();   // Start tracking
game.diagnostics.disable();  // Stop tracking (keeps existing data)
game.diagnostics.isEnabled(); // Check status
```

### View Reports

```javascript
// Quick summary
game.diagnostics.summary();
// Visit http://localhost:8766/admin → Diagnostics tab

// Export full JSON
game.diagnostics.exportJSON();
// Gives you curl command to download JSON
```

## Admin Dashboard Actions

### Queries

**Summary** - Get overview of all issues:
- Total unique issues
- Breakdown by type
- Breakdown by severity
- Top 10 most frequent issues

**List All Issues** - Filter and view details:
- Filter by type (undefined_property, undefined_method, etc.)
- Filter by severity (error, warning, info)
- Filter by minimum occurrence count
- Shows stack traces, suggestions, context

**Export JSON** - Download full diagnostics data for external analysis

### Actions

**Enable Diagnostics** - Turn on tracking (if not already enabled via .env)

**Disable Diagnostics** - Pause tracking without losing data

**Clear All Issues** - Delete all tracked issues (fresh start)

**Suppress Pattern** - Stop reporting specific patterns:
```
Example: "Entity:getComponent"
Suppresses all issues matching that substring
```

## Programmatic Usage

### Import and Use Directly

```typescript
import { diagnosticsHarness, wrapEntity, wrapComponent } from '@ai-village/core';

// Enable
diagnosticsHarness.setEnabled(true);

// Wrap entities (usually done automatically in World)
const wrappedEntity = wrapEntity(entity);

// Wrap components for extra safety
const wrappedComp = wrapComponent(component, 'position', entityId);

// Get issues
const allIssues = diagnosticsHarness.getIssues();
const errors = diagnosticsHarness.getIssues({ severity: 'error' });
const frequentIssues = diagnosticsHarness.getIssues({ minCount: 10 });

// Get summary
const summary = diagnosticsHarness.getSummary();
console.log(`${summary.totalIssues} unique issues`);
console.log('By type:', summary.byType);
console.log('Top issues:', summary.topIssues);
```

### Suppress Known Safe Patterns

Some patterns are safe (e.g., optional fields, promise detection):

```typescript
diagnosticsHarness.suppressPattern('Entity:then'); // Promise detection
diagnosticsHarness.suppressPattern('Component:optional_field');
```

Built-in safe patterns (already suppressed):
- `then`, `catch`, `finally` (Promise detection)
- `constructor`, `prototype` (JavaScript internals)
- `toJSON`, `valueOf`, `toString` (serialization)
- Symbol properties (React/Node.js internals)

## Issue Types

### undefined_property
Accessing a property that doesn't exist on the object.

**Severity:** Error (usually indicates a bug)

**Example:**
```typescript
entity.invalidProperty; // Triggers issue
```

### undefined_method
Calling a method that doesn't exist.

**Severity:** Error (usually indicates a bug)

**Example:**
```typescript
entity.nonExistentMethod(); // Triggers issue
```

### type_mismatch
Value type doesn't match expected type (future feature).

**Severity:** Warning

### invalid_component
Accessing component that doesn't exist on entity (future feature).

**Severity:** Warning

### performance_warning
Detecting performance anti-patterns (future feature).

**Severity:** Info

## Common Patterns

### Finding Typos

1. Enable diagnostics
2. Run your code/tests
3. Check for issues with `type: 'undefined_property'` or `'undefined_method'`
4. Look at `suggestions` field for likely correct spelling

### Finding Breaking Changes

After refactoring:
1. Clear existing issues: Admin Dashboard → Clear All Issues
2. Run comprehensive tests
3. Check diagnostics for any new undefined access
4. Fix issues before merging

### Debugging Production Issues

1. Enable diagnostics in development
2. Reproduce the production scenario
3. Export diagnostics JSON
4. Search for patterns related to the bug
5. Use stack traces to identify source

## Integration Points

### World (ECS Core)

The World class automatically syncs current tick to diagnostics:

```typescript
// In World.advanceTick()
diagnosticsHarness.setCurrentTick(this._tick);
```

This ensures all issues are tagged with the game tick when they occurred.

### Admin Capability

Registered at: `packages/core/src/admin/capabilities/diagnostics.ts`

Provides queries and actions via HTTP:
- `GET /admin/queries/diagnostics/summary?format=json`
- `GET /admin/queries/diagnostics/list?type=error&format=json`
- `POST /admin/actions/diagnostics/enable`
- `POST /admin/actions/diagnostics/clear`

### Browser Console

Exposed via `window.game.diagnostics` in `demo/src/main.ts`

## Advanced Usage

### Custom Wrapper for Your Objects

```typescript
import { wrapObject } from '@ai-village/core';

const myService = wrapObject(
  serviceInstance,
  'MyService',
  'service-123'
);

// Now any undefined property access on myService will be tracked
```

### Analyzing Exported Data

```bash
# Export to file
curl "http://localhost:8766/admin/queries/diagnostics/export?format=json" > diagnostics.json

# Find most common issues
cat diagnostics.json | jq '.summary.topIssues[] | {property: .property, count: .count}'

# Find issues in specific file
cat diagnostics.json | jq '.issues[] | select(.stackTrace | contains("MySystem.ts"))'

# Group by object type
cat diagnostics.json | jq '.issues | group_by(.objectType) | map({type: .[0].objectType, count: length})'
```

## Best Practices

1. **Enable during development** - Catch issues early
2. **Review before commits** - Check diagnostics tab before pushing
3. **Suppress intentional patterns** - Don't let noise hide real issues
4. **Export and analyze** - Use JSON export for deep debugging
5. **Clear regularly** - Reset after fixing a batch of issues
6. **Check after refactoring** - Ensure you didn't break anything
7. **Disable in production** - No overhead, development-only tool

## Troubleshooting

### Diagnostics not tracking issues

**Check if enabled:**
```javascript
game.diagnostics.isEnabled(); // Should return true
```

**Enable it:**
```javascript
game.diagnostics.enable();
```

**Verify in admin dashboard:**
```
Visit http://localhost:8766/admin → Diagnostics tab
Should show "enabled: true" in summary
```

### Browser console error: "process is not defined"

This error was fixed in the current version. If you still see it:
1. Refresh your browser (Ctrl+Shift+R or Cmd+Shift+R)
2. Clear browser cache
3. Ensure HMR reloaded the updated module

The harness now safely detects both browser and Node.js environments.

### Too many false positives

**Suppress known safe patterns:**
```javascript
// Via admin action "Suppress Pattern"
// Or programmatically:
diagnosticsHarness.suppressPattern('pattern-to-ignore');
```

### Can't access admin dashboard

**Check if metrics server is running:**
```bash
curl http://localhost:8766/health
```

**Restart if needed:**
```bash
cd custom_game_engine && ./start.sh
```

## Architecture

```
DiagnosticsHarness (singleton)
  ├─ Issue tracking (Map<issueKey, DiagnosticIssue>)
  ├─ Deduplication (by type + objectType + property + objectId)
  ├─ Tick synchronization (via World.advanceTick)
  └─ Export/import capabilities

ProxyWrappers
  ├─ wrapEntity() - Intercept entity property access
  ├─ wrapComponent() - Intercept component property access
  ├─ wrapWorld() - Intercept world method calls
  └─ wrapObject() - Generic wrapper for any object

Admin Capability
  ├─ Queries: summary, list, export
  ├─ Actions: enable, disable, clear, suppress-pattern
  └─ HTTP routes via CapabilityRegistry

Browser API (window.game.diagnostics)
  ├─ enable/disable/isEnabled
  ├─ summary/exportJSON
  └─ Convenience wrappers around harness
```

## Future Enhancements

- [ ] Type mismatch detection
- [ ] Component existence validation
- [ ] Performance anti-pattern detection
- [ ] Auto-fix suggestions (not just property suggestions)
- [ ] VS Code extension integration
- [ ] Real-time dashboard updates (WebSocket)
- [ ] Historical trend analysis
- [ ] Issue annotations in source files

## Related Documentation

- [DEBUG_API.md](./DEBUG_API.md) - Other browser console APIs
- [ARCHITECTURE_OVERVIEW.md](./custom_game_engine/ARCHITECTURE_OVERVIEW.md) - ECS architecture
- [SYSTEMS_CATALOG.md](./custom_game_engine/SYSTEMS_CATALOG.md) - All systems
