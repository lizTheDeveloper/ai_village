# Developer Tools & Productivity

> Overview of tools, utilities, and documentation to help you write better code faster.

This document ties together all the developer tools, utilities, and documentation available in the Multiverse codebase. Think of it as your productivity companion - pointing you to the right tool for every task.

## Quick Reference

| Need To... | Use This |
|------------|----------|
| Create a new system | [NEW_SYSTEM_CHECKLIST.md](../NEW_SYSTEM_CHECKLIST.md) |
| Make system run less often | [ThrottledSystem](#system-base-classes) |
| Process only visible entities | [FilteredSystem](#system-base-classes) |
| Cache query results | [CachedQuery](#query-caching) |
| Understand performance rules | [PERFORMANCE.md](../PERFORMANCE.md) |
| Know what NOT to do | [COMMON_PITFALLS.md](../COMMON_PITFALLS.md) |
| Use VS Code snippets | [VS Code Snippets](#vs-code-snippets) |
| Debug the game | [DEBUG_API.md](../DEBUG_API.md) |
| Understand the scheduler | [SCHEDULER_GUIDE.md](../SCHEDULER_GUIDE.md) |
| Browse all systems | [SYSTEMS_CATALOG.md](../SYSTEMS_CATALOG.md) |
| Browse all components | [COMPONENTS_REFERENCE.md](../COMPONENTS_REFERENCE.md) |

## System Base Classes

Three abstract classes that make performance patterns automatic. These are located in `packages/core/src/ecs/SystemHelpers.ts` and eliminate boilerplate code for common optimization patterns.

### ThrottledSystem

Makes systems run less frequently without manual tick tracking.

```typescript
import { ThrottledSystem } from '../ecs/SystemHelpers.js';

export class WeatherSystem extends ThrottledSystem {
  readonly id = 'weather';
  readonly priority = 10;
  readonly requiredComponents = [CT.Weather];
  readonly throttleInterval = 100; // Every 5 seconds (100 ticks at 20 TPS)

  protected updateThrottled(world: World, entities: Entity[], deltaTime: number): void {
    // This only runs every 100 ticks
    for (const entity of entities) {
      // Update weather state
    }
  }
}
```

**Common intervals:**
- 20 ticks = 1 second
- 100 ticks = 5 seconds
- 1000 ticks = 50 seconds
- 6000 ticks = 5 minutes

**Use when:** Weather, autosave, memory consolidation, slow environmental changes.

### FilteredSystem

Processes only visible/active entities using SimulationScheduler.

```typescript
import { FilteredSystem } from '../ecs/SystemHelpers.js';

export class PlantGrowthSystem extends FilteredSystem {
  readonly id = 'plant_growth';
  readonly priority = 50;
  readonly requiredComponents = [CT.Plant, CT.Position];

  protected updateFiltered(world: World, activeEntities: Entity[], deltaTime: number): void {
    // activeEntities only contains visible/active plants
    // Instead of processing all 2000 plants, we process only ~30 visible ones
    for (const entity of activeEntities) {
      const plant = entity.getComponent(CT.Plant);
      // Update growth state
    }
  }
}
```

**Benefits:**
- Reduces entity processing from 4000+ to ~50-100 visible entities
- 97% reduction in processed entities for typical scenes
- Dwarf Fortress-style entity culling
- Zero performance cost for off-screen entities

**Use when:** Plant growth, animal AI, visual effects, non-critical gameplay systems.

### ThrottledFilteredSystem

Combines both throttling AND entity filtering for maximum performance.

```typescript
import { ThrottledFilteredSystem } from '../ecs/SystemHelpers.js';

export class AnimalBehaviorSystem extends ThrottledFilteredSystem {
  readonly id = 'animal_behavior';
  readonly priority = 60;
  readonly requiredComponents = [CT.Animal, CT.Position];
  readonly throttleInterval = 20; // Every second

  protected updateThrottledFiltered(world: World, activeEntities: Entity[], deltaTime: number): void {
    // Runs every 20 ticks, only for visible animals
    // Instead of 4000 animals * 20 TPS = 80,000 updates/sec
    // We get ~50 animals * 1 update/sec = 50 updates/sec (99.9% reduction!)
    for (const entity of activeEntities) {
      // Run animal behavior
    }
  }
}
```

**Use when:** Animal behavior, plant diseases, environmental effects, non-agent AI systems.

## Query Caching

Two utilities for caching expensive queries, located in `packages/core/src/ecs/CachedQuery.ts`.

### CachedQuery (Per-System)

Instance-based cache for use within a single system.

```typescript
import { CachedQuery } from '../ecs/CachedQuery.js';

export class MySystem implements System {
  private agentCache = new CachedQuery<Entity>();

  update(world: World, entities: Entity[], deltaTime: number): void {
    // Query is cached for 20 ticks (1 second)
    const agents = this.agentCache
      .from(world)
      .with(CT.Agent, CT.Position)
      .ttl(20)
      .execute();

    for (const agent of agents) {
      // Use cached results
    }
  }
}
```

**One-liner for simple cases:**
```typescript
const buildings = CachedQuery.simple(world, [CT.Building, CT.Position], 50);
```

### QueryCache (Global Shared)

Shared cache for common queries used across multiple systems.

```typescript
import { QueryCache } from '../ecs/CachedQuery.js';

// In any system:
const allAgents = QueryCache.get(world, 'all_agents', [CT.Agent, CT.Position], 20);
```

**When to use:**
- Common queries like "all agents" or "all buildings"
- Queries shared across multiple systems
- Expensive queries with stable results

**Cache invalidation:**
```typescript
QueryCache.invalidate('all_agents'); // Invalidate specific cache
QueryCache.invalidateAll();          // Invalidate all caches
QueryCache.clear();                  // Clear all cached queries
```

## VS Code Snippets

23 code snippets for common patterns. Type the prefix and press Tab.

**Full documentation:** [.vscode/SNIPPETS.md](../.vscode/SNIPPETS.md)

### Most Useful Snippets

| Prefix | Creates | Use Case |
|--------|---------|----------|
| `system` | Basic system | Standard ECS system |
| `system-throttled` | Throttled system | Periodic updates |
| `system-filtered` | Filtered system | Visible entities only |
| `system-throttled-filtered` | Both optimizations | Maximum performance |
| `cached-query` | Query with caching | Repeated queries |
| `no-sqrt` | Squared distance check | Distance comparisons |
| `emit-event` | Event emission | Event system |
| `component` | Component interface | New component |
| `singleton` | Singleton component | World-level data |

**Quick start:**
1. Type snippet prefix (e.g., `system-throttled`)
2. Press Tab
3. Fill in placeholders (Tab to navigate)
4. Code is ready to use

## ESLint Integration

ESLint catches common mistakes automatically.

**Run manually:**
```bash
cd custom_game_engine
npm run lint
```

**Common rules to be aware of:**
- Don't use `|| defaultValue` for required data (use proper error handling)
- Avoid queries inside loops (cache queries before loops)
- Don't use `Math.sqrt` in hot paths (use squared distance)
- Never delete entities (mark as corrupted instead)

## Pre-commit Hook

Automatically runs before each commit (`.husky/pre-commit`):

1. **TypeScript build** - Ensures no type errors
2. **ESLint** - Catches code quality issues
3. **Tests** - Verifies nothing broke

**Commits are blocked if any step fails.**

**Why this helps:**
- Catches bugs before they reach the codebase
- Enforces code quality automatically
- Prevents broken builds in main branch
- Saves time in code review

**Override (use sparingly):**
```bash
git commit --no-verify
```

## Documentation Map

### Getting Started
- [README.md](../README.md) - Project overview and philosophy
- [QUICKSTART.md](../QUICKSTART.md) - Get up and running quickly
- [CLAUDE.md](../../CLAUDE.md) - Development guidelines (MUST READ)

### Architecture & Design
- [ARCHITECTURE_OVERVIEW.md](../ARCHITECTURE_OVERVIEW.md) - High-level architecture, ECS, packages
- [SYSTEMS_CATALOG.md](../SYSTEMS_CATALOG.md) - All 212+ systems with priorities and locations
- [COMPONENTS_REFERENCE.md](../COMPONENTS_REFERENCE.md) - All 125+ components with fields
- [METASYSTEMS_GUIDE.md](../METASYSTEMS_GUIDE.md) - Major game systems (Consciousness, Divinity, etc.)

### Performance
- [PERFORMANCE.md](../PERFORMANCE.md) - Performance guidelines and best practices
- [SCHEDULER_GUIDE.md](../SCHEDULER_GUIDE.md) - System scheduling and execution order
- [SIMULATION_SCHEDULER.md](../packages/core/src/ecs/SIMULATION_SCHEDULER.md) - Entity culling system

### Code Quality
- [COMMON_PITFALLS.md](../COMMON_PITFALLS.md) - What NOT to do (antipatterns)
- [NEW_SYSTEM_CHECKLIST.md](../NEW_SYSTEM_CHECKLIST.md) - Step-by-step guide for new systems
- [CORRUPTION_SYSTEM.md](../CORRUPTION_SYSTEM.md) - Never delete, always preserve

### Tools & Debugging
- [DEBUG_API.md](../DEBUG_API.md) - Browser console API (`window.game`)
- [DIAGNOSTICS_GUIDE.md](../DIAGNOSTICS_GUIDE.md) - Diagnostic tools
- [TIME_MANIPULATION_DEVTOOLS.md](../TIME_MANIPULATION_DEVTOOLS.md) - Time control tools

### Package Documentation

Each package has its own README with overview, API, examples, and architecture.

**Core Packages:**
- [core/README.md](../packages/core/README.md) - ECS, systems, components
- [world/README.md](../packages/world/README.md) - Terrain, chunks, spatial queries
- [persistence/README.md](../packages/persistence/README.md) - Save/load, time travel

**Gameplay Packages:**
- [botany/README.md](../packages/botany/README.md) - Plants, genetics
- [environment/README.md](../packages/environment/README.md) - Weather, soil
- [navigation/README.md](../packages/navigation/README.md) - Pathfinding
- [reproduction/README.md](../packages/reproduction/README.md) - Mating, families
- [building-designer/README.md](../packages/building-designer/README.md) - Voxel buildings

**Advanced Packages:**
- [divinity/README.md](../packages/divinity/README.md) - Gods, miracles
- [magic/README.md](../packages/magic/README.md) - 25+ magic paradigms
- [hierarchy-simulator/README.md](../packages/hierarchy-simulator/README.md) - Renormalization

**AI/LLM Packages:**
- [llm/README.md](../packages/llm/README.md) - LLM prompts, providers
- [introspection/README.md](../packages/introspection/README.md) - Schemas, mutations

**Rendering Packages:**
- [renderer/README.md](../packages/renderer/README.md) - Sprites, 40+ UI panels
- [deterministic-sprite-generator/README.md](../packages/deterministic-sprite-generator/README.md) - Sprite generation

**Infrastructure Packages:**
- [metrics/README.md](../packages/metrics/README.md) - Performance metrics
- [metrics-dashboard/README.md](../packages/metrics-dashboard/README.md) - Dashboard UI
- [shared-worker/README.md](../packages/shared-worker/README.md) - Web workers

## Workflow: Creating a New System

**Step-by-step guide:**

1. **Read the checklist**
   - Open [NEW_SYSTEM_CHECKLIST.md](../NEW_SYSTEM_CHECKLIST.md)
   - Follow all steps carefully

2. **Use a snippet**
   - Open VS Code
   - Type `system-throttled` or `system-filtered`
   - Press Tab and fill in placeholders

3. **Choose base class**
   - Basic system: Standard `System` interface
   - Periodic updates: `ThrottledSystem`
   - Visible entities only: `FilteredSystem`
   - Both optimizations: `ThrottledFilteredSystem`

4. **Add query caching**
   - Use `CachedQuery` for repeated queries
   - Use `QueryCache` for shared queries

5. **Run checks**
   ```bash
   cd custom_game_engine
   npm run build   # Type checking
   npm run lint    # Code quality
   npm test        # Tests
   ```

6. **Commit**
   - Pre-commit hook validates everything
   - Fix any failures before committing

## Workflow: Debugging Performance

**When the game runs slow:**

1. **Check metrics dashboard**
   - Open http://localhost:8766/admin
   - Look at "System Performance" tab
   - Identify slow systems (>5ms per tick)

2. **Common fixes:**

   **High entity count:**
   - Extend `FilteredSystem` to only process visible entities
   - Expected: 4000+ entities → ~50-100 active entities

   **Running every tick:**
   - Extend `ThrottledSystem` for periodic updates
   - Choose appropriate interval (20-6000 ticks)

   **Expensive queries:**
   - Use `CachedQuery` to cache results
   - Default TTL: 20 ticks (1 second)

   **Math.sqrt in hot path:**
   - Use squared distance instead:
     ```typescript
     // BAD
     if (Math.sqrt(dx*dx + dy*dy) < radius) { }

     // GOOD
     if (dx*dx + dy*dy < radius*radius) { }
     ```

3. **Verify fix**
   - Restart game: `./start.sh`
   - Check metrics dashboard again
   - System should now be <5ms

4. **Read performance docs**
   - [PERFORMANCE.md](../PERFORMANCE.md) - Complete guide
   - [SCHEDULER_GUIDE.md](../SCHEDULER_GUIDE.md) - System scheduling

## Workflow: Understanding Existing Code

**When exploring the codebase:**

1. **Start with the catalog**
   - Open [SYSTEMS_CATALOG.md](../SYSTEMS_CATALOG.md)
   - Search for relevant systems
   - Note file locations

2. **Check component reference**
   - Open [COMPONENTS_REFERENCE.md](../COMPONENTS_REFERENCE.md)
   - Understand data structures
   - See usage examples

3. **Read package README**
   - Navigate to `packages/{package}/README.md`
   - Understand package purpose
   - Review API and examples

4. **Look at similar systems**
   - Find systems with similar functionality
   - Study implementation patterns
   - Adapt for your needs

5. **Check for pitfalls**
   - Open [COMMON_PITFALLS.md](../COMMON_PITFALLS.md)
   - Avoid antipatterns
   - Follow best practices

## Browser Console API

Access game internals via `window.game` in browser console (F12).

**Quick examples:**
```javascript
// Get world state
game.world.tick                    // Current tick
game.world.getAllEntities()        // All entities

// Select agent
game.setSelectedAgent(agentId)     // Updates UI panels

// Grant skills
game.grantSkillXP(agentId, 100)    // 100 XP = 1 level
game.getAgentSkills(agentId)       // { skillName: level }

// Query entities
const agents = game.world.query()
  .with(CT.Agent)
  .with(CT.Position)
  .execute()
```

**Full API reference:** [DEBUG_API.md](../DEBUG_API.md)

## Testing

**Run tests:**
```bash
cd custom_game_engine
npm test              # Run all tests
npm run test:watch    # Watch mode
npm run test:coverage # Coverage report
```

**Write tests:**
- Place in `__tests__` directory next to source
- Use Vitest framework
- Follow existing test patterns

**Test checklist:**
- [ ] All new features have tests
- [ ] Edge cases covered
- [ ] Error paths tested
- [ ] Performance benchmarks (if relevant)

## Dashboard & Metrics

**Admin Dashboard:** http://localhost:8766/admin

**Tabs:**
- **Overview** - Universe stats, agent counts
- **Roadmap & Pipelines** - Development progress
- **Universes** - All universes and snapshots
- **Agents** - Agent details, skills, memories
- **Sprites** - Sprite management
- **LLM Queue** - Provider stats, cooldowns
- **Time Travel** - Snapshot navigation

**API Access:**
```bash
# Query data
curl "http://localhost:8766/admin/queries/providers?format=json"

# Execute actions
curl -X POST "http://localhost:8766/admin/actions/set-agent-llm" \
  -H "Content-Type: application/json" \
  -d '{"agentId": "abc123", "provider": "groq"}'
```

**Architecture:**
- Capabilities in `packages/core/src/admin/capabilities/`
- Each tab = capability module
- Queries (read-only) + Actions (state-changing)

## Running the Game

**Quick start:**
```bash
cd /Users/annhoward/src/ai_village/custom_game_engine
./start.sh
```

**Commands:**
```bash
./start.sh              # Game host (metrics + game + browser)
./start.sh server       # Backend only (no browser)
./start.sh player       # Open browser to existing server
./start.sh kill         # Stop all servers
./start.sh status       # Show running servers
```

**Important:** DO NOT restart servers unless necessary. Vite HMR auto-reloads TypeScript changes in 1-2 seconds.

**Restart only for:**
- `npm install` (new dependencies)
- Config changes (`vite.config.ts`, `tsconfig.json`, `.env`)
- Server crashes
- Stale `.js` files in `src/` (delete with `find packages -path "*/src/*.js" -delete`)

## Getting Help

**Step-by-step approach:**

1. **Read package README first**
   - Navigate to relevant package
   - Check README for API and examples

2. **Check COMMON_PITFALLS.md**
   - Avoid known antipatterns
   - Learn from past mistakes

3. **Search SYSTEMS_CATALOG.md**
   - Find similar systems
   - Study implementation patterns

4. **Look at existing implementations**
   - Read actual system code
   - Understand real-world usage

5. **Review architecture docs**
   - [ARCHITECTURE_OVERVIEW.md](../ARCHITECTURE_OVERVIEW.md)
   - [METASYSTEMS_GUIDE.md](../METASYSTEMS_GUIDE.md)

6. **Ask for help**
   - Describe what you've tried
   - Share relevant code snippets
   - Include error messages

## Tips & Best Practices

**Code Quality:**
- Use lowercase_with_underscores for component types
- Throw errors for invalid data (no silent fallbacks)
- Import math utilities from `packages/core/src/utils/math.ts`
- No debug console.log (use console.error/warn for errors only)

**Performance:**
- Cache queries before loops
- Use squared distance (avoid Math.sqrt)
- Cache singleton entity IDs
- Throttle non-critical systems
- Filter entities with SimulationScheduler

**Architecture:**
- Read package README before modifying
- Follow existing patterns
- Use system base classes
- Never delete entities (mark as corrupted)
- Save before major changes

**Workflow:**
- Use VS Code snippets for boilerplate
- Run pre-commit checks manually: `npm run build && npm run lint && npm test`
- Verify in browser before committing
- Check metrics dashboard for performance
- Use HMR instead of restarting servers

## Summary

This document provides a comprehensive overview of all developer tools available in the Multiverse codebase. The key to productivity is knowing which tool to use for each task:

- **System base classes** eliminate boilerplate for common patterns
- **Query caching** speeds up repeated queries
- **VS Code snippets** generate code templates instantly
- **Pre-commit hooks** catch bugs automatically
- **Documentation** provides guidance for every scenario
- **Dashboard** monitors performance in real-time
- **Debug API** enables runtime inspection and modification

**Remember:** Read the docs, use the tools, follow the patterns, and write great code!
