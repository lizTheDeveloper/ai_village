# Quick Start Guide

## What Just Happened

You now have a **fully functional game engine** with all the foundational systems needed to build Multiverse: The End of Eternity incrementally while maintaining backwards compatibility.

## Try It Now

```bash
cd custom_game_engine

# Build all packages
npm run build

# Start the demo
cd demo
npm run dev
```

Open http://localhost:3000

You'll see:
- Empty world with a grid
- Camera controls (WASD, drag, scroll to zoom)
- Game loop running at 20 TPS
- Debug overlay showing tick count and game time

## What's Working

### Core Engine (Phase 0 ✅)

1. **ECS** - Entities, components, systems all working
2. **Events** - Systems can communicate via event bus
3. **Actions** - Framework for agent intent → validation → execution
4. **Save/Load** - Serialization with versioned migrations ready
5. **Game Loop** - Fixed 20 TPS, system execution in order
6. **Renderer** - 2D canvas with camera controls

## Adding Your First Feature

Let's add a simple test entity to prove everything works:

```typescript
// In demo/src/main.ts, after creating gameLoop:

import { EntityImpl, createEntityId } from '@ai-village/core';

// Get world mutator (internal use)
const world = gameLoop._getWorldMutator();

// Create a test entity
const entity = new EntityImpl(
  createEntityId(),
  world.tick
);

// Add position component
entity.addComponent({
  type: 'position',
  version: 1,
  x: 0,
  y: 0,
  chunkX: 0,
  chunkY: 0,
});

// Add to world
world._addEntity(entity);
```

Rebuild and run - you'll see a red circle at the origin!

## Next: Phase 1 - A World Exists

Follow `architecture/IMPLEMENTATION_ROADMAP.md` Phase 1:

1. **Chunk System** - 32x32 tile chunks
2. **Terrain Generation** - Perlin noise
3. **Procedural Placement** - Trees and rocks
4. **Infinite World** - Generate chunks as camera moves

Each step builds on the stable foundation you have now.

## Development Pattern

From here on, every feature follows this pattern:

```typescript
// 1. Define component
interface MyComponent extends Component {
  type: 'myFeature';
  version: 1;
  someField: number;
}

// 2. Register schema
componentRegistry.register({
  type: 'myFeature',
  version: 1,
  createDefault: () => ({ type: 'myFeature', version: 1, someField: 0 }),
  validate: (data) => true,
});

// 3. Create system
const mySystem: System = {
  id: 'myFeature',
  priority: 300,
  requiredComponents: ['myFeature'],
  update(world, entities) {
    // Process entities
  },
};

// 4. Register
systemRegistry.register(mySystem);
```

Old saves continue to work because:
- New components have defaults
- Feature flags control activation
- Migrations upgrade old data

## Key Files

| File | Purpose |
|------|---------|
| `packages/core/src/loop/GameLoop.ts` | Main game loop |
| `packages/core/src/ecs/World.ts` | World state |
| `packages/renderer/src/Renderer.ts` | Canvas rendering |
| `demo/src/main.ts` | Demo entry point |

## Debugging

The demo exposes globals for debugging:

```javascript
// In browser console:
window.gameLoop      // Game loop instance
window.gameLoop.world // World state
window.gameLoop.getStats() // Performance stats
window.renderer      // Renderer instance
```

## Tips

- **Read `architecture/CORE_ARCHITECTURE.md`** for patterns
- **Follow `architecture/IMPLEMENTATION_ROADMAP.md`** for features
- **Reference `architecture/INTERFACES.ts`** for types
- Start small, build incrementally
- Test backwards compatibility early

## Support

This is a greenfield implementation. You have:
- ✅ Clean architecture
- ✅ TypeScript types
- ✅ Working build
- ✅ Runnable demo
- ✅ Clear roadmap

The hard part (setting up the stable foundation) is done. Now you can add features one at a time, each building on the last.
