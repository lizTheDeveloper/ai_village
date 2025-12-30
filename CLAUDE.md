# AI Village Development Guidelines

> *This project is dedicated to Tarn Adams and Dwarf Fortress. See [README.md](./README.md) for our philosophy on open source, monetization, and the inspirations behind this project.*

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
