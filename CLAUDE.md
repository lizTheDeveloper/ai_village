# AI Village Development Guidelines

## Naming Conventions

### Component Type Names

Component type strings MUST use lowercase_with_underscores, not PascalCase:

```typescript
// GOOD: lowercase with underscores
export class SteeringComponent extends ComponentBase {
  public readonly type = 'steering';  // ✓
}

export class VelocityComponent extends ComponentBase {
  public readonly type = 'velocity';  // ✓
}

export class SpatialMemoryComponent extends ComponentBase {
  public readonly type = 'spatial_memory';  // ✓
}

// BAD: PascalCase
export class SteeringComponent extends ComponentBase {
  public readonly type = 'Steering';  // ✗ WRONG
}
```

When checking for components, always use lowercase:

```typescript
// GOOD
if (entity.hasComponent('steering')) { ... }
const velocity = entity.getComponent('velocity');

// BAD
if (entity.hasComponent('Steering')) { ... }  // ✗ WRONG
const velocity = entity.getComponent('Velocity');  // ✗ WRONG
```

## Error Handling: No Silent Fallbacks

**NEVER use fallback values to mask errors.** If data is missing or invalid, crash immediately with a clear error message. This ensures bugs are found and fixed at their source rather than hidden.

### Prohibited Patterns

```python
# BAD: Silent fallback hides missing data
health = data.get("health", 100)

# BAD: Bare except swallows all errors
try:
    result = do_something()
except:
    return {}

# BAD: Returns default on any error
try:
    response = api_call()
except Exception:
    return "noop"
```

### Required Patterns

```python
# GOOD: Require critical fields, crash if missing
if "health" not in data:
    raise KeyError("Response missing required 'health' field")
health = data["health"]

# GOOD: Catch specific exceptions, re-raise or log+raise
try:
    result = do_something()
except ConnectionError as e:
    logger.error(f"Connection failed: {e}")
    raise

# GOOD: No fallback - let errors propagate
response = api_call()  # Will raise on failure
```

### When `.get()` is OK

Only use `.get()` with defaults for truly optional fields where the default is semantically correct:

```python
# OK: description is optional, empty string is valid default
description = data.get("description", "")

# OK: optional list that's fine to be empty
tags = data.get("tags", [])

# NOT OK: critical game state that should never be missing
health = data.get("health", 100)  # WRONG - masks missing data
```

## Type Safety

1. **Always validate data at system boundaries** (API responses, file reads, user input)
2. **Use type annotations** on all function signatures
3. **Require critical fields explicitly** rather than silently defaulting
4. **Prefer crashing early** over propagating invalid state

## Logging

When catching exceptions that you handle (not re-raise), always log them:

```python
import logging
logger = logging.getLogger(__name__)

try:
    result = might_fail()
except SpecificError as e:
    logger.error(f"Operation failed: {e}")
    raise  # Still crash, but with context
```

## TypeScript Patterns

The same principles apply to TypeScript code:

```typescript
// BAD: Silent fallback
const behavior = this.parser.parseBehavior(response, 'wander');

// GOOD: Throw on parse failure
const behavior = this.parser.parseBehavior(response); // throws BehaviorParseError

// BAD: console.warn and continue
console.warn(`Could not parse: ${text}, using fallback`);
return fallback;

// GOOD: Throw with context
throw new ParseError(`Could not parse: ${text}. Valid options: ${validOptions}`);
```

## Verification Before Completion

Before marking work as complete:

1. **Run the build** - `npm run build` must pass
2. **Check console errors** - Use Playwright MCP to verify no runtime errors in browser
3. **Test error paths** - Verify exceptions are thrown for invalid input
4. **Grep for patterns** - Search for `console.warn`, `|| fallback`, `?? default` to find hidden fallbacks

## Testing

Write tests that verify:
1. Missing required fields raise appropriate exceptions
2. Invalid data types are rejected
3. Error messages are clear and actionable
