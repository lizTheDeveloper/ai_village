# AI Village Development Guidelines

> *This project is dedicated to Tarn Adams and Dwarf Fortress. See [README.md](./README.md) for our philosophy on open source, monetization, and the inspirations behind this project.*

## Project Roadmap

The master development roadmap is located at [MASTER_ROADMAP.md](../MASTER_ROADMAP.md) in the project root. This document outlines the project's development phases, completed features, and planned work.

## Help System

Items/effects embed documentation via `help` field. Wiki auto-generates from definitions. See `packages/core/src/help/README.md` and `documentedItems.example.ts`.

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

## Value Normalization: Softmax Over Clamp

**NEVER use clamping (Math.min/Math.max) to force values into valid ranges.** Clamping hides the root cause of out-of-range values. Instead, use proper mathematical normalization that preserves distribution and signals problems.

### Prohibited Patterns

```typescript
// ❌ BAD: Clamping hides the problem
efficiency = Math.min(1.0, Math.max(0.0, rawEfficiency));
paranoia = Math.min(1.0, paranoia + 0.1);  // What if paranoia was already 0.95?

// ❌ BAD: "Clamp and pray" - value out of range is a bug
health = Math.max(0, health - damage);  // Why would health go negative? Fix the cause!

// ❌ BAD: Silent normalization masks invalid state
const total = values.reduce((sum, v) => sum + v, 0);
const normalized = values.map(v => v / total || 0);  // Hides division by zero
```

### Required Patterns

```typescript
// ✅ GOOD: Throw if value is out of expected range
if (efficiency < 0 || efficiency > 1) {
  throw new RangeError(`Efficiency ${efficiency} out of valid range [0, 1]`);
}

// ✅ GOOD: Use softmax for probability distributions
function softmax(values: number[]): number[] {
  const max = Math.max(...values);
  const exps = values.map(v => Math.exp(v - max));  // Subtract max for numerical stability
  const sum = exps.reduce((a, b) => a + b, 0);

  if (sum === 0) {
    throw new Error('Softmax encountered zero sum - input values too small');
  }

  return exps.map(e => e / sum);
}

// ✅ GOOD: Use sigmoid for smooth [0,1] mapping
function sigmoid(x: number): number {
  return 1 / (1 + Math.exp(-x));
}

// ✅ GOOD: Explicit saturation with bounds checking
function saturate(value: number, min: number, max: number): number {
  if (value < min) {
    console.warn(`Value ${value} below minimum ${min}, saturating`);
    return min;
  }
  if (value > max) {
    console.warn(`Value ${value} above maximum ${max}, saturating`);
    return max;
  }
  return value;
}

// ✅ GOOD: Normalize with validation
function normalizeWeights(weights: number[]): number[] {
  const sum = weights.reduce((a, b) => a + b, 0);

  if (sum <= 0) {
    throw new Error(`Cannot normalize weights with sum ${sum}`);
  }

  if (weights.some(w => w < 0)) {
    throw new Error(`Negative weight found: ${weights}`);
  }

  return weights.map(w => w / sum);
}
```

### When Saturation is OK

Saturation (limiting to a range) is acceptable when:
1. **You explicitly document why** the value might exceed bounds
2. **You log a warning** so the issue is visible
3. **The saturation is the intended behavior**, not a bug fix

```typescript
// ✅ GOOD: Documented saturation with logging
/**
 * Apply damage to entity health.
 * Health is saturated to [0, maxHealth] range.
 */
function applyDamage(entity: Entity, damage: number): void {
  const health = entity.health - damage;

  if (health > entity.maxHealth) {
    // This shouldn't happen, but clamp to max if healing overflow occurs
    console.warn(`[${entity.id}] Health ${health} exceeds max ${entity.maxHealth}, clamping`);
    entity.health = entity.maxHealth;
  } else if (health < 0) {
    // Death - health goes to exactly 0
    entity.health = 0;
    entity.triggerDeath();
  } else {
    entity.health = health;
  }
}
```

### Helper Functions

Create reusable normalization utilities:

```typescript
// packages/core/src/utils/math.ts

/**
 * Softmax - converts values to probability distribution
 * Use for: AI decision weights, priority distributions
 */
export function softmax(values: number[]): number[] {
  if (values.length === 0) {
    throw new Error('Softmax requires non-empty array');
  }

  const max = Math.max(...values);
  const exps = values.map(v => Math.exp(v - max));
  const sum = exps.reduce((a, b) => a + b, 0);

  if (sum === 0) {
    throw new Error(`Softmax sum is zero for values: ${values}`);
  }

  return exps.map(e => e / sum);
}

/**
 * Sigmoid - smooth [0,1] mapping
 * Use for: Efficiency curves, gradual effects
 */
export function sigmoid(x: number, steepness: number = 1): number {
  return 1 / (1 + Math.exp(-steepness * x));
}

/**
 * Linear interpolation with bounds checking
 */
export function lerp(a: number, b: number, t: number): number {
  if (t < 0 || t > 1) {
    throw new RangeError(`lerp t=${t} must be in [0, 1]`);
  }
  return a + (b - a) * t;
}

/**
 * Normalize array to sum to 1.0
 */
export function normalize(values: number[]): number[] {
  const sum = values.reduce((a, b) => a + b, 0);

  if (sum <= 0) {
    throw new Error(`Cannot normalize values with sum ${sum}: ${values}`);
  }

  return values.map(v => v / sum);
}
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

### Debug Output Prohibition

**NEVER add debug print statements or console.log calls to code.** This includes:

```typescript
// ❌ PROHIBITED - Never add these
console.log('Debug:', variable);
console.debug('State:', state);
console.info('Processing:', data);

// ✅ ALLOWED - Only for errors
console.error('[ComponentName] Critical error:', error);
console.warn('[ComponentName] Warning:', issue);
```

Reasons:
- Debug statements clutter the codebase
- They are rarely removed after debugging
- They create noise in production
- Use the Agent Dashboard for debugging instead

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

## Performance Guidelines

**See [PERFORMANCE.md](custom_game_engine/PERFORMANCE.md) for comprehensive performance guide.**

This game is an Entity Component System (ECS) running at 20 ticks per second. Performance is critical.

### Critical Rules for AI Agents

1. **Never call `world.query()` inside loops** - Cache the result before the loop
2. **Use squared distance comparisons** - Avoid `Math.sqrt()` in hot paths
3. **Use `x * x` instead of `Math.pow(x, 2)`** - Direct multiplication is faster
4. **Cache singleton entities** - Time, weather entities rarely change
5. **Throttle non-critical systems** - Add `UPDATE_INTERVAL` if not needed every tick
6. **No console.log in systems** - Use only `console.error` for actual errors

### Quick Examples

```typescript
// ❌ BAD: Query in loop
for (const entity of entities) {
  const others = world.query().with(CT.Position).executeEntities();
}

// ✅ GOOD: Cache before loop
const others = world.query().with(CT.Position).executeEntities();
for (const entity of entities) {
  // ... use others
}

// ❌ BAD: Math.sqrt for comparison
if (Math.sqrt(dx * dx + dy * dy) < radius) { }

// ✅ GOOD: Squared distance
if (dx * dx + dy * dy < radius * radius) { }

// ❌ BAD: Repeated singleton query
update(world: World) {
  const time = world.query().with(CT.Time).executeEntities()[0];
}

// ✅ GOOD: Cache singleton entity ID
private timeEntityId: string | null = null;
update(world: World) {
  if (!this.timeEntityId) {
    const entities = world.query().with(CT.Time).executeEntities();
    if (entities.length > 0) {
      this.timeEntityId = entities[0]!.id;
    }
  }
  const time = this.timeEntityId ? world.getEntity(this.timeEntityId) : null;
}
```

### Helper Utilities

Use helpers from `packages/core/src/utils/performance.ts`:

```typescript
import { distanceSquared, isWithinRadius, CachedQuery, SingletonCache } from '../utils/performance.js';

// Distance helpers
if (isWithinRadius(pos1, pos2, 5)) { /* ... */ }

// Auto-caching queries
export class MySystem implements System {
  private agents = new CachedQuery('agent', 'position');
  private timeEntity = new SingletonCache(CT.Time);

  update(world: World) {
    const agents = this.agents.get(world); // Caches per tick
    const time = this.timeEntity.get(world); // Caches forever
  }
}
```

### Automatic Linting

ESLint will catch common performance issues. See `.eslintrc.performance.json` for rules.

## Running the Game

### macOS with Apple Silicon (Recommended)

**See [MLX_SETUP.md](MLX_SETUP.md) for detailed MLX server installation and setup.**

For macOS users, MLX provides 2-5x faster inference than Ollama:

**Terminal 1: Start MLX Server**
```bash
pip install mlx-lm  # First time only
mlx_lm.server --model mlx-community/Qwen3-4B-Instruct-4bit
```

Wait for: `INFO: Uvicorn running on http://localhost:8080`

The game automatically detects macOS and uses MLX server by default.

### All Platforms (Linux/Windows/macOS)

**Terminal 1: Start Ollama** (if not using MLX)
```bash
ollama serve
# In another terminal: ollama pull qwen3:1.7b
```

### 1. Start the Metrics Dashboard (Terminal 2)

The dashboard collects metrics from the game and provides a text-based interface for debugging:

```bash
cd custom_game_engine
npm run metrics-server
```

This starts:
- **WebSocket server** on `ws://localhost:8765` (receives metrics from game)
- **HTTP dashboard** on `http://localhost:8766` (query with curl)

### 2. Start the Game Dev Server (Terminal 3)

```bash
cd custom_game_engine
npm run dev
```

This starts Vite dev server on `http://localhost:5173`

### 3. Open the Game in Browser

Open `http://localhost:5173` in a browser. The game will:
- Connect to the metrics server automatically
- Start streaming events to the dashboard
- Create a new session visible at `http://localhost:8766/`

### 4. Query the Dashboard with curl

**Always use curl to query the dashboard** - it's designed for LLM consumption:

```bash
# Session browser - list all sessions
curl http://localhost:8766/

# Main dashboard (latest session)
curl "http://localhost:8766/dashboard?session=latest"

# Agent list for a session
curl "http://localhost:8766/dashboard/agents?session=<session_id>"

# Detailed agent info (use full UUID from agent list)
curl "http://localhost:8766/dashboard/agent?id=<agent_uuid>"

# Event timeline
curl "http://localhost:8766/dashboard/timeline?session=<session_id>"

# Resource flow analysis
curl "http://localhost:8766/dashboard/resources?session=<session_id>"

# Live game status (requires running game)
curl http://localhost:8766/api/live/status
curl http://localhost:8766/api/live/entities

# Raw metrics
curl http://localhost:8766/metrics/summary
```

### Dashboard Shows:
- **Villager count and status** - current behavior, last activity
- **LLM success rate** - e.g., "LLM: 34/34" means 100% success
- **Buildings** - complete vs in-progress counts
- **Resources** - gathered/consumed totals
- **Conversations** - social interaction count
- **Issues/Warnings** - stuck agents, duplicate buildings, loops

## Playwright MCP Usage

**IMPORTANT: Playwright has limitations with existing browser windows.**

### When NOT to use Playwright:
- If a browser tab is already open, `browser_navigate` will error
- If the user already has the game open in their browser
- For simple dashboard queries (use curl instead)

### If you must use Playwright:
1. **Check first** with `browser_snapshot` to see if a page is loaded
2. **Close existing tabs** with `browser_close` before navigating
3. Use `browser_console_messages` to check for JavaScript errors

### Prefer curl for the dashboard:
```bash
# Good - use curl for dashboard
curl "http://localhost:8766/dashboard?session=latest"

# Avoid - Playwright for text dashboard
# browser_navigate to http://localhost:8766/dashboard
```

Playwright is useful for:
- Taking screenshots of the actual game UI
- Checking browser console for errors
- Interacting with game UI elements

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
