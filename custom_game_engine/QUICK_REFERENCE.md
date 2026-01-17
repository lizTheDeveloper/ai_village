# Quick Reference Guide

**Fast lookup for essential facts, commands, and patterns.**

For detailed documentation, see [DOCUMENTATION_INDEX.md](./DOCUMENTATION_INDEX.md).

---

## 🚀 Essential Commands

```bash
# Start everything (metrics + game + browser)
cd custom_game_engine && ./start.sh

# Start server only (no browser)
./start.sh server

# Open browser to existing server
./start.sh player

# Stop all servers
./start.sh kill

# Check server status
./start.sh status

# Run tests
cd custom_game_engine && npm test

# Run build (must pass before commit)
npm run build
```

---

## 📊 Key URLs

| Service | URL | Purpose |
|---------|-----|---------|
| Game | http://localhost:3000 | Main game interface |
| Admin Dashboard | http://localhost:8766/admin | System monitoring, controls |
| Metrics API | http://localhost:8766/dashboard | Raw metrics data |
| Orchestration | http://localhost:3030 | (Deprecated - use Admin) |

---

## 🏗️ Architecture Quick Facts

### ECS Core
- **Tick Rate:** 20 TPS (50ms per tick)
- **World:** Single source of truth, holds all entities
- **Entities:** ID + component collection
- **Components:** Pure data (lowercase_with_underscores)
- **Systems:** Logic that operates on entities with specific components

### Performance Constraints
- **Target:** 60 FPS rendering, 20 TPS simulation
- **Entity Culling:** ~97% reduction via SimulationScheduler
- **Query Caching:** Use `CachedQuery` for hot paths
- **System Throttling:** Not all systems run every tick

### Package Structure
```
packages/
├── core/          # ECS, systems, components, behaviors
├── world/         # Terrain, chunks, world gen
├── botany/        # Plants, genetics
├── magic/         # 25+ magic paradigms
├── divinity/      # Gods, miracles
├── llm/           # LLM integration
├── renderer/      # UI, sprites, 40+ panels
└── ... (17 total packages)
```

---

## 🧩 Component Naming Convention

```typescript
// CORRECT: lowercase_with_underscores
type: 'spatial_memory'
entity.hasComponent('steering')

// WRONG: PascalCase, camelCase
type: 'SpatialMemory'  // ❌
entity.hasComponent('Steering')  // ❌
```

---

## 🔄 System Priority Ranges

| Priority | Category | Examples |
|----------|----------|----------|
| 1-10 | Infrastructure | Time, Weather, Input |
| 50-100 | Agent Core | Brain, Movement, Steering |
| 100-200 | Cognition | Memory, Skills, Goals |
| 300-400 | Environment | Plants, Animals, Buildings |
| 900-999 | Utility | Metrics, AutoSave |

**Lower number = runs earlier in tick**

---

## 💾 Save/Load Quick Facts

- **Auto-save:** Every 60 seconds
- **Snapshot types:** `auto`, `manual`, `canonical`
- **Server-first:** All saves stored on multiverse server (port 3001)
- **Time travel:** Load any snapshot to rewind
- **Universe forking:** Branch from any snapshot
- **Never delete:** Mark as corrupted, preserve for recovery

```typescript
import { saveLoadService } from '@ai-village/core';

// Manual save
await saveLoadService.save(world, {
  name: 'checkpoint_name',
  description: 'Before major change'
});

// Load
await saveLoadService.load('snapshot_key', world);
```

---

## 🧠 Agent Behavior API

```typescript
import { BehaviorContext } from '@ai-village/core';

class MyBehavior extends BaseBehavior {
  canExecute(context: BehaviorContext): boolean {
    // Check if behavior should run
    return context.hasComponent('needs');
  }

  execute(context: BehaviorContext): BehaviorResult {
    // Perform behavior
    return {
      success: true,
      actions: [{ type: 'move', target: targetPos }]
    };
  }
}
```

**See:** [docs/BEHAVIOR_CONTEXT.md](./docs/BEHAVIOR_CONTEXT.md)

---

## 🎯 Query Patterns

```typescript
// ❌ BAD: Query inside loop
for (const entity of entities) {
  const others = world.query().with(CT.Position).executeEntities();
}

// ✅ GOOD: Cache query before loop
const others = world.query().with(CT.Position).executeEntities();
for (const entity of entities) {
  // Use cached query
}

// ✅ BETTER: Use CachedQuery for hot paths
import { CachedQuery } from './ecs/CachedQuery.js';

class MySystem extends System {
  private agentsQuery = new CachedQuery(['position', 'agent']);

  update(world: World): void {
    const agents = this.agentsQuery.execute(world);
    // ...
  }
}
```

---

## 🚫 Common Pitfalls (AVOID)

```typescript
// ❌ Silent fallbacks
health = data.get("health", 100);

// ✅ Crash on invalid data
if (!("health" in data)) throw new Error("Missing 'health'");
const health = data.health;

// ❌ Math.sqrt in hot paths
if (Math.sqrt(dx*dx + dy*dy) < radius) { }

// ✅ Use squared distance
if (dx*dx + dy*dy < radius*radius) { }

// ❌ Debug console.log
console.log('Debug:', x);

// ✅ Only errors/warnings
console.error('[System] Error:', e);
console.warn('[System] Warning:', w);

// ❌ Deleting entities/data
world.removeEntity(entity);
delete corruptedData;

// ✅ Mark as corrupted
entity.addComponent({
  type: 'corrupted',
  corruption_reason: 'invalid_state',
  recoverable: true
});
```

---

## 🎨 Component Format Examples

```typescript
// Position
{ type: 'position', x: 10, y: 20 }

// Needs (0-1 scale!)
{ type: 'needs', hunger: 0.7, thirst: 0.3, energy: 0.5 }

// Personality (0-1 scale, Big Five)
{
  type: 'personality',
  openness: 0.8,
  conscientiousness: 0.6,
  extraversion: 0.7,
  agreeableness: 0.5,
  neuroticism: 0.4
}

// Memory
{
  type: 'memory',
  id: 'mem_123',
  description: 'Found berries near river',
  timestamp: 1234,
  location: { x: 10, y: 20 },
  importance: 0.8
}
```

---

## 🔧 Debug API (Browser Console)

```javascript
// Access game instance
window.game

// Select agent (updates panels)
game.setSelectedAgent(agentId);

// Grant XP (100 XP = 1 level)
game.grantSkillXP(agentId, 100);

// Get agent skills
game.getAgentSkills(agentId);

// Access world
game.world

// Access renderer
game.renderer

// Access dev panel
game.devPanel
```

**See:** [DEBUG_API.md](./DEBUG_API.md)

---

## 📦 Package Import Patterns

```typescript
// Core ECS
import { World, Entity, System } from '@ai-village/core';
import { ComponentType as CT } from '@ai-village/core';

// Behaviors
import { BaseBehavior, BehaviorContext } from '@ai-village/core';

// World/Terrain
import { ChunkCache, TerrainType } from '@ai-village/world';

// LLM
import { ExecutorPromptBuilder } from '@ai-village/llm';

// Magic
import { SpellCaster, MagicCost } from '@ai-village/magic';

// Math utilities
import { normalize, sigmoid, softmax } from '@ai-village/core/utils/math';
```

---

## 🔍 Finding Things

### Find a System
1. Check [SYSTEMS_CATALOG.md](./SYSTEMS_CATALOG.md)
2. Or search: `custom_game_engine/packages/core/src/systems/`

### Find a Component
1. Check [COMPONENTS_REFERENCE.md](./COMPONENTS_REFERENCE.md)
2. Or search: `custom_game_engine/packages/core/src/components/`

### Find a Behavior
Search: `custom_game_engine/packages/core/src/behavior/behaviors/`

### Find Package Docs
`custom_game_engine/packages/{package-name}/README.md`

---

## 📝 Commit Checklist

Before committing:

- [ ] `npm test` passes
- [ ] `npm run build` passes
- [ ] No browser console errors (F12)
- [ ] Changes work as expected in-game
- [ ] No debug console.log statements
- [ ] Error paths throw exceptions (no silent fallbacks)
- [ ] TPS/FPS stable (no performance regression)

---

## 🆘 Troubleshooting Quick Fixes

### Changes not appearing?
```bash
# Delete stale .js files
find custom_game_engine/packages -path "*/src/*.js" -type f -delete
find custom_game_engine/packages -path "*/src/*.d.ts" -type f -delete
```

### Server won't start?
```bash
./start.sh kill  # Kill all servers
./start.sh       # Restart fresh
```

### Tests failing?
```bash
cd custom_game_engine
npm test -- --reporter=verbose  # See detailed output
```

### Build failing?
```bash
npm run build 2>&1 | grep error  # Filter errors
```

### Game running slow?
1. Check TPS in top-left (should be ~20)
2. Open Admin Dashboard → Overview tab
3. Check system execution times
4. See [PERFORMANCE.md](./PERFORMANCE.md)

---

## 📚 Learn More

- **Full docs:** [DOCUMENTATION_INDEX.md](./DOCUMENTATION_INDEX.md)
- **Architecture:** [ARCHITECTURE_OVERVIEW.md](./ARCHITECTURE_OVERVIEW.md)
- **Systems:** [SYSTEMS_CATALOG.md](./SYSTEMS_CATALOG.md)
- **Components:** [COMPONENTS_REFERENCE.md](./COMPONENTS_REFERENCE.md)
- **Behaviors:** [docs/BEHAVIOR_CONTEXT.md](./docs/BEHAVIOR_CONTEXT.md)
- **Performance:** [PERFORMANCE.md](./PERFORMANCE.md)
- **Pitfalls:** [COMMON_PITFALLS.md](./COMMON_PITFALLS.md)

---

**Last Updated:** 2026-01-16
