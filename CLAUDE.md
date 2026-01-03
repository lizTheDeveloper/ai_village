# AI Village Development Guidelines

> *This project is dedicated to Tarn Adams and Dwarf Fortress. See [README.md](./README.md) for our philosophy on open source, monetization, and the inspirations behind this project.*

## 📚 Architecture Documentation

**Complete architecture documentation is located in `custom_game_engine/`:**

- **[custom_game_engine/ARCHITECTURE_OVERVIEW.md](./custom_game_engine/ARCHITECTURE_OVERVIEW.md)** - Master architecture document (ECS, packages, metasystems, data flow)
- **[custom_game_engine/SYSTEMS_CATALOG.md](./custom_game_engine/SYSTEMS_CATALOG.md)** - Complete reference of all 212+ systems with priorities, components, and locations
- **[custom_game_engine/COMPONENTS_REFERENCE.md](./custom_game_engine/COMPONENTS_REFERENCE.md)** - All 125+ component types with data fields and usage examples
- **[custom_game_engine/METASYSTEMS_GUIDE.md](./custom_game_engine/METASYSTEMS_GUIDE.md)** - Deep dives into major metasystems (Consciousness, Divinity, Reproduction, Multiverse, Magic, Realms, etc.)

**Read these documents first** to understand the codebase architecture before making changes.

## 📝 Session Devlogs

**All session summaries go in `devlogs/`:**

- Place session summaries, implementation reports, and work logs in `devlogs/`
- Use descriptive filenames with dates: `SESSION_SUMMARY_2026-01-03.md`, `FEATURE_IMPLEMENTATION_SUMMARY.md`
- This keeps the repo root clean while preserving development history

## 🧹 Build Artifacts: Stale .js Files in src/ Directories

**CRITICAL**: The TypeScript build may output `.js` files into `src/` directories. Vite will serve these stale `.js` files instead of transpiling the `.ts` files, causing changes to be ignored.

**Symptoms**: Code changes don't appear in browser; console shows `.js` paths instead of `.ts`

**Fix**:
```bash
find custom_game_engine/packages -path "*/src/*.js" -type f -delete
find custom_game_engine/packages -path "*/src/*.d.ts" -type f -delete
cd custom_game_engine/demo && npm run dev  # Restart Vite
```

## 📋 Feature Specifications & Work Planning

**All feature specifications are in OpenSpec:**

- **[openspec/specs/](./openspec/specs/)** - System specifications organized by domain
- **[openspec/README.md](./openspec/README.md)** - Overview of the OpenSpec workflow
- **[openspec/AGENTS.md](./openspec/AGENTS.md)** - Detailed guide for agents working with specs

## Code Quality Rules

### 1. Component Type Names: Use lowercase_with_underscores

```typescript
// ✅ GOOD                              // ❌ BAD
type = 'spatial_memory';               type = 'SpatialMemory';
entity.hasComponent('steering');       entity.hasComponent('Steering');
```

### 2. No Silent Fallbacks - Crash on Invalid Data

```typescript
// ❌ BAD: Silent fallbacks hide bugs
health = data.get("health", 100);           // Masks missing data
efficiency = Math.min(1, Math.max(0, val)); // Masks out-of-range bug
const behavior = parser.parse(text, 'wander'); // Silent fallback

// ✅ GOOD: Fail fast with clear errors
if (!("health" in data)) throw new Error("Missing required 'health' field");
if (efficiency < 0 || efficiency > 1) throw new RangeError(`Invalid efficiency: ${efficiency}`);
const behavior = parser.parse(text); // Throws ParseError on failure
```

**Exception**: Use defaults only for truly optional fields:
```typescript
description = data.get("description", "");  // OK - description is optional
tags = data.get("tags", []);                // OK - empty tags is valid
```

### 3. Use Math Utilities for Normalization

For probability distributions and smooth mappings, use helpers from `packages/core/src/utils/math.ts`:

```typescript
import { softmax, sigmoid, normalize } from '../utils/math.js';

const weights = softmax([0.5, 1.2, 0.8]);  // Probability distribution
const efficiency = sigmoid(rawValue);       // Smooth [0,1] mapping
const normalized = normalize(values);       // Sum to 1.0 with validation
```

### 4. No Debug Output

```typescript
// ❌ PROHIBITED                        // ✅ ALLOWED
console.log('Debug:', x);              console.error('[System] Error:', e);
console.debug('State:', s);            console.warn('[System] Warning:', w);
```

## Performance Guidelines

**See [PERFORMANCE.md](custom_game_engine/PERFORMANCE.md) for comprehensive guide.**

This ECS runs at 20 TPS. Critical rules:

```typescript
// ❌ BAD: Query in loop, Math.sqrt, repeated singleton query
for (const entity of entities) {
  const others = world.query().with(CT.Position).executeEntities();  // Query in loop!
  if (Math.sqrt(dx*dx + dy*dy) < radius) { }  // sqrt in hot path!
}
const time = world.query().with(CT.Time).executeEntities()[0];  // Every tick!

// ✅ GOOD: Cache queries, use squared distance, cache singletons
const others = world.query().with(CT.Position).executeEntities();  // Before loop
for (const entity of entities) {
  if (dx*dx + dy*dy < radius*radius) { }  // Squared comparison
}
// Cache singleton ID once, reuse forever
private timeEntityId: string | null = null;
```

Use helpers: `distanceSquared()`, `isWithinRadius()`, `CachedQuery`, `SingletonCache`

## Running the Game

### Quick Start (Single Command)

```bash
cd custom_game_engine && ./start.sh
```

This launches everything: metrics server, orchestration dashboard, game server, and opens browser.

### Orchestrator Commands

```bash
./start.sh              # Start game host (default) - metrics + game + browser
./start.sh server       # Backend only (for AI operation without browser)
./start.sh player       # Open browser to existing server
./start.sh kill         # Stop all running servers
./start.sh status       # Show which servers are running
```

**IMPORTANT for Claude Code**: Always use `./start.sh kill` before starting servers to avoid port conflicts. Never run `npm run dev` directly - use the orchestrator.

### Dashboard Queries

```bash
curl "http://localhost:8766/dashboard?session=latest"     # Main dashboard
curl "http://localhost:8766/dashboard/agents?session=ID"  # Agent list
curl "http://localhost:8766/dashboard/agent?id=UUID"      # Agent details
```

## Playwright MCP Usage

**Prefer curl for dashboard queries.** Use Playwright only for:
- Taking screenshots of game UI
- Checking browser console for errors
- Interacting with game UI elements

If Playwright errors on navigation, close existing tabs first with `browser_close`.

## Verification Before Completion

1. **Run the build** - `npm run build` must pass
2. **Check console errors** - Verify no runtime errors in browser
3. **Test error paths** - Verify exceptions are thrown for invalid input
