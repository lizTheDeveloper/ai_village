# Multiverse: The End of Eternity - Development Guidelines

> *Dedicated to Tarn Adams and Dwarf Fortress. See [README.md](./README.md) for philosophy on open source, monetization, and inspirations.*

## Architecture Documentation

**Read `custom_game_engine/` docs first:**
- **[ARCHITECTURE_OVERVIEW.md](./custom_game_engine/ARCHITECTURE_OVERVIEW.md)** - ECS, packages, metasystems, data flow
- **[SYSTEMS_CATALOG.md](./custom_game_engine/SYSTEMS_CATALOG.md)** - 212+ systems with priorities, components, locations
- **[COMPONENTS_REFERENCE.md](./custom_game_engine/COMPONENTS_REFERENCE.md)** - 125+ component types with fields and examples
- **[METASYSTEMS_GUIDE.md](./custom_game_engine/METASYSTEMS_GUIDE.md)** - Consciousness, Divinity, Reproduction, Multiverse, Magic, Realms
- **[BEHAVIOR_CONTEXT.md](./custom_game_engine/docs/BEHAVIOR_CONTEXT.md)** - Agent behavior API ("pit of success" pattern)

## Package READMEs

**Read package README before modifying any system.** Location: `custom_game_engine/packages/{package-name}/README.md`

**Core:** [core](./custom_game_engine/packages/core/README.md) (ECS), [world](./custom_game_engine/packages/world/README.md) (terrain, chunks), [persistence](./custom_game_engine/packages/persistence/README.md) (save/load, time travel)

**Gameplay:** [botany](./custom_game_engine/packages/botany/README.md) (plants, genetics), [environment](./custom_game_engine/packages/environment/README.md) (weather, soil), [navigation](./custom_game_engine/packages/navigation/README.md) (pathfinding), [reproduction](./custom_game_engine/packages/reproduction/README.md) (mating, families), [building-designer](./custom_game_engine/packages/building-designer/README.md) (voxel buildings)

**Advanced:** [divinity](./custom_game_engine/packages/divinity/README.md) (gods, miracles), [magic](./custom_game_engine/packages/magic/README.md) (25+ paradigms), [hierarchy-simulator](./custom_game_engine/packages/hierarchy-simulator/README.md) (renormalization)

**AI/LLM:** [llm](./custom_game_engine/packages/llm/README.md) (prompts, providers), [introspection](./custom_game_engine/packages/introspection/README.md) (schemas, mutations)

**Rendering:** [renderer](./custom_game_engine/packages/renderer/README.md) (sprites, 40+ panels), [deterministic-sprite-generator](./custom_game_engine/packages/deterministic-sprite-generator/README.md)

**Infrastructure:** [metrics](./custom_game_engine/packages/metrics/README.md), [metrics-dashboard](./custom_game_engine/packages/metrics-dashboard/README.md), [shared-worker](./custom_game_engine/packages/shared-worker/README.md)

**Demo:** [city-simulator](./custom_game_engine/packages/city-simulator/README.md) (headless testing)

**Convention:** READMEs include Overview, Core Concepts, API, Examples, Architecture, Troubleshooting. Missing README? Use [README_TEMPLATE.md](./custom_game_engine/README_TEMPLATE.md) (botany as reference).

## Session Devlogs

Place session summaries/work logs in `devlogs/` named like `ECONOMY-FIXES-01-02.md`.

## Build Artifacts: Stale .js Files

**CRITICAL**: TypeScript may output `.js` to `src/`, causing Vite to serve stale files instead of `.ts`.

**Symptoms**: Changes don't appear; console shows `.js` paths. **Fix**:
```bash
find custom_game_engine/packages -path "*/src/*.js" -type f -delete
find custom_game_engine/packages -path "*/src/*.d.ts" -type f -delete
cd custom_game_engine/demo && npm run dev
```

## Feature Specifications

Specs in OpenSpec: [openspec/specs/](./openspec/specs/), [openspec/README.md](./openspec/README.md), [openspec/AGENTS.md](./openspec/AGENTS.md)

## Conservation of Game Matter

**NEVER delete entities, souls, items, universes.** Mark as corrupted/rejected and preserve for recovery.

```typescript
// BAD: world.removeEntity(brokenEntity); delete corruptedSave;
// GOOD: brokenEntity.addComponent({ type: 'corrupted', corruption_reason: 'malformed_data', recoverable: true });
```

**Why**: Future recovery via data fixer scripts, emergent gameplay (corrupted content = quests), lore integration, player archaeology.

**Full details**: [CORRUPTION_SYSTEM.md](./custom_game_engine/CORRUPTION_SYSTEM.md) - corruption types, realms, implementation, proto-realities, server archive policy.

## Scheduler Systems

**Three schedulers manage performance. Understanding these is critical for optimization.**

### 1. GameLoop & System Priority

**[SCHEDULER_GUIDE.md](./custom_game_engine/SCHEDULER_GUIDE.md)** - Fixed 20 TPS timestep, system priority ordering.

Systems execute in priority order (lower = earlier). Priority ranges:
- 1-10: Infrastructure (Time, Weather)
- 50-100: Agent Core (Brain, Movement)
- 100-200: Cognition (Memory, Skills)
- 900-999: Utility (Metrics, AutoSave)

### 2. System Throttling

Not all systems need every tick. Use throttling for slow-changing state:

```typescript
private UPDATE_INTERVAL = 100;  // Every 5 seconds
private lastUpdate = 0;

update(world: World): void {
  if (world.tick - this.lastUpdate < this.UPDATE_INTERVAL) return;
  this.lastUpdate = world.tick;
  // Actual logic
}
```

Common intervals: WeatherSystem (100 ticks/5s), AutoSaveSystem (6000 ticks/5min), MemoryConsolidation (1000 ticks/50s)

### 3. SimulationScheduler (Entity Culling)

**[SIMULATION_SCHEDULER.md](./custom_game_engine/packages/core/src/ecs/SIMULATION_SCHEDULER.md)** - Dwarf Fortress-style entity filtering.

Three modes: **ALWAYS** (agents, buildings), **PROXIMITY** (plants, wild animals - only when on-screen), **PASSIVE** (resources - zero per-tick cost).

```typescript
update(world: World, entities: ReadonlyArray<Entity>): void {
  const active = world.simulationScheduler.filterActiveEntities(entities, world.tick);
  for (const entity of active) { /* processes ~50 visible vs 4000+ total */ }
}
```

Result: 97% entity reduction (120 updated instead of 4,260).

### 4. LLMScheduler

`packages/llm/src/LLMScheduler.ts` - Request queuing, rate limiting, provider rotation, session cooldowns.

## Code Quality Rules

### 1. Component Types: Use lowercase_with_underscores
```typescript
// GOOD: type = 'spatial_memory'; entity.hasComponent('steering');
// BAD: type = 'SpatialMemory'; entity.hasComponent('Steering');
```

### 2. No Silent Fallbacks - Crash on Invalid Data
```typescript
// BAD: health = data.get("health", 100); efficiency = Math.min(1, Math.max(0, val));
// GOOD: if (!("health" in data)) throw new Error("Missing 'health'");
// Exception for truly optional: description = data.get("description", "");
```

### 3. Use Math Utilities (`packages/core/src/utils/math.ts`)
```typescript
import { softmax, sigmoid, normalize } from '../utils/math.js';
```

### 4. No Debug Output
```typescript
// PROHIBITED: console.log('Debug:', x);
// ALLOWED: console.error('[System] Error:', e); console.warn('[System] Warning:', w);
```

## Performance Guidelines

**See [PERFORMANCE.md](custom_game_engine/PERFORMANCE.md).** ECS runs at 20 TPS.

```typescript
// BAD: Query in loop, Math.sqrt, repeated singleton
for (const entity of entities) {
  const others = world.query().with(CT.Position).executeEntities(); // Query in loop!
  if (Math.sqrt(dx*dx + dy*dy) < radius) { } // sqrt in hot path!
}

// GOOD: Cache queries, squared distance, cache singletons
const others = world.query().with(CT.Position).executeEntities(); // Before loop
for (const entity of entities) { if (dx*dx + dy*dy < radius*radius) { } }
private timeEntityId: string | null = null; // Cache singleton ID
```

**Key optimizations**: Cache queries before loops, use squared distance, cache singleton IDs, throttle non-critical systems, use SimulationScheduler for entity culling.

## Save/Load System

**See [METASYSTEMS_GUIDE.md](custom_game_engine/METASYSTEMS_GUIDE.md#persistence-system).** Save system = persistence + time travel + multiverse foundation.

**Snapshots = Saves**: Every save enables time travel; universe forking requires snapshots; auto-save every 60s.

```typescript
import { saveLoadService } from '@ai-village/core';
await saveLoadService.save(world, { name: 'my_checkpoint', description: 'Village with 10 agents' });
const result = await saveLoadService.load('checkpoint_key', world);
```

**Save before**: Settings changes (triggers reload), major state changes, experimental features.

**DO NOT re-implement save logic.** Use `saveLoadService` - handles serialization, versioning, checksums, migrations.

## Running the Game

### Quick Start
```bash
cd custom_game_engine && ./start.sh
```

### Commands
```bash
./start.sh              # Game host (metrics + pixellab + game + browser)
./start.sh server       # Backend only (metrics + pixellab + orchestration)
./start.sh player       # Open browser to existing server
./start.sh kill         # Stop all servers
./start.sh status       # Show running servers
```

### DO NOT RESTART SERVERS

**Vite HMR auto-reloads TypeScript changes in 1-2 seconds.** Restarting destroys simulation state, disrupts other agents' work.

**HMR handles**: TypeScript, components, systems, UI panels (99% of code)

**Restart required (rare)**: `npm install`, config changes (`vite.config.ts`, `tsconfig.json`, `.env`), crashes, stale `.js` in `src/`

### What Gets Started

**Game Host**: Metrics (8766), Orchestration (3030), PixelLab daemon, Game (3000-3002), Browser

**Server Mode**: Metrics, Orchestration, PixelLab daemon, no browser

### PixelLab Daemon

Auto-starts with server. Generates sprites on-demand via PixelLab API. Saves to `packages/renderer/assets/sprites/pixellab/`. 5-second rate limit.

**Manage via `pixellab` skill** (`.claude/skills/pixellab.md`): `pixellab status`, `pixellab logs`, `pixellab add`, `pixellab verify <id>`

### Dashboard Queries
```bash
curl "http://localhost:8766/dashboard?session=latest"
curl "http://localhost:8766/dashboard/agents?session=ID"
curl "http://localhost:8766/dashboard/agent?id=UUID"
```

## Admin Dashboard

**URL**: http://localhost:8766/admin | **Auto-starts** with gamehost/server

**Tabs**: Overview, Roadmap & Pipelines, Universes, Agents, Sprites, Media & Souls, LLM Queue (providers, stats, cooldowns), Time Travel

### Architecture

**Capabilities** (`packages/core/src/admin/capabilities/`): Each tab = capability module with queries (read-only) and actions (state-changing).

### API Access
```bash
curl http://localhost:8766/admin/queries/providers?format=json
curl -X POST http://localhost:8766/admin/actions/set-agent-llm -H "Content-Type: application/json" -d '{"agentId": "abc123", "provider": "groq"}'
```

### Adding Capabilities

1. Create file in `packages/core/src/admin/capabilities/`
2. Define with `defineCapability`, `defineQuery`, `defineAction`
3. Register: `capabilityRegistry.register(myCapability)`

See `llm.ts` for example.

### Orchestration Dashboard (Legacy)

**DEPRECATED** - use Admin Dashboard. URL: http://localhost:3030, proxies `/api/*` to metrics (8766).

## Playwright MCP

**Prefer curl for dashboard queries.** Use Playwright only for: screenshots, console errors, UI interaction. On navigation errors, close tabs first with `browser_close`.

## Sonnet Coder Subagents

**Delegate coding to Sonnet subagents to preserve main context.**

**Delegate**: Feature implementation (clear approach), tests, scoped refactoring, bugs (known cause), pattern-following additions

**Keep in main**: Exploration, architecture, requirements clarification, multi-system coordination, review

```typescript
Task({ subagent_type: "general-purpose", model: "sonnet", description: "Implement feature X",
  prompt: `Implement [feature] in [file]. Requirements: [list]. Follow patterns in [ref]. Run tests. Report: files changed, tests, issues.` })
```

**Benefits**: Preserves context, cost effective, parallel work, focused subagent context.

## Verification Before Completion

**CRITICAL: Always verify before marking complete.**

### 1. Tests
```bash
cd custom_game_engine && npm test
```
Fix failures. Never commit broken tests.

### 2. Build
```bash
cd custom_game_engine && npm run build  # Must pass - failures = type errors
```

### 3. Browser Validation
```bash
cd custom_game_engine && ./start.sh
```
DevTools (F12) → Console → no red errors. Test your changes. Check: no errors, UI renders, TPS stable.

### 4. Error Paths
```typescript
// BAD: const data = getData() || defaultValue;
// GOOD: const data = getData(); if (!data) throw new Error('Failed to get required data');
```

### Checklist
- [ ] `npm test` passes
- [ ] `npm run build` passes
- [ ] No browser console errors
- [ ] Changes work as expected
- [ ] Error paths throw exceptions
- [ ] No performance regression (TPS/FPS)

## Debug Actions API

**`window.game`** in browser console provides programmatic game access.

```javascript
game.world, game.gameLoop, game.renderer, game.devPanel
game.setSelectedAgent(agentId);  // Updates DevPanel + AgentInfoPanel
game.grantSkillXP(agentId, amount);  // 100 XP = 1 level
game.getAgentSkills(agentId);  // { skillName: level }
```

**Full API reference**: [DEBUG_API.md](./custom_game_engine/DEBUG_API.md) - queries, workflows, building management, test API.
