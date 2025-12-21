# AI Village Custom Game Engine

A custom TypeScript game engine built for the AI Village simulation project.

## Phase 0: Foundation ✅ COMPLETE

All core systems are implemented and building successfully.

### Structure

```
custom_game_engine/
├── packages/
│   ├── core/              # Core game engine
│   │   ├── ecs/           # Entity-Component-System
│   │   ├── events/        # Event bus
│   │   ├── actions/       # Action queue
│   │   ├── serialization/ # Save/load
│   │   └── loop/          # Game loop (20 TPS)
│   │
│   └── renderer/          # 2D Canvas renderer
│       ├── Camera.ts      # Camera with pan/zoom
│       ├── Renderer.ts    # Canvas rendering
│       └── InputHandler.ts # Keyboard/mouse input
│
└── demo/                  # Demo application
    ├── index.html
    └── src/main.ts
```

### What's Implemented

#### Core Systems (@ai-village/core)

- **ECS Architecture**
  - ✅ EntityId generation (UUID v4)
  - ✅ Component interface with versioning
  - ✅ ComponentRegistry with migrations
  - ✅ Entity management
  - ✅ System interface and registry
  - ✅ QueryBuilder for entity queries

- **Event System**
  - ✅ GameEvent interface
  - ✅ EventBus with priorities
  - ✅ Subscribe/emit pattern
  - ✅ Event history for replay
  - ✅ Flush per tick

- **Action System**
  - ✅ Action interface (intent → validation → execution)
  - ✅ ActionHandler interface
  - ✅ ActionRegistry
  - ✅ ActionQueue with timing
  - ✅ Action effects

- **Serialization**
  - ✅ SaveFile format with versioning
  - ✅ Migration registry
  - ✅ IndexedDB serializer
  - ✅ Snapshot/restore

- **Game Loop**
  - ✅ Fixed 20 TPS timestep
  - ✅ System execution in priority order
  - ✅ Action processing
  - ✅ Event flushing
  - ✅ Time-based events (hour, day, season, year)
  - ✅ Performance stats

#### Renderer (@ai-village/renderer)

- **Camera**
  - ✅ Pan with keyboard/mouse
  - ✅ Zoom with mouse wheel
  - ✅ World ↔ Screen coordinate conversion
  - ✅ Smooth interpolation
  - ✅ Visible bounds calculation

- **Rendering**
  - ✅ Canvas setup with DPI scaling
  - ✅ Grid rendering with culling
  - ✅ Entity rendering (position component)
  - ✅ Debug info overlay

- **Input**
  - ✅ Keyboard (WASD, arrows, +/-)
  - ✅ Mouse drag to pan
  - ✅ Mouse wheel to zoom

### Running the Demo

```bash
# Install dependencies
npm install

# Build packages
npm run build

# Run demo
cd demo
npm run dev
```

Then open http://localhost:3000

### What You'll See

- An empty world with a checkerboard grid
- Camera controls working (pan with WASD/arrows/drag, zoom with wheel/+/-)
- Debug info showing tick count, game time, etc.
- 20 TPS game loop running smoothly

### Next Steps: Phase 1

See `architecture/IMPLEMENTATION_ROADMAP.md` for the full plan.

**Phase 1: A World Exists**
- Chunk system (32x32 tiles)
- Procedural terrain generation (Perlin noise)
- Biomes (grass, forest, water, stone, sand)
- Trees and rocks as first entities
- Infinite scrolling world

### Architecture

All core interfaces are defined in:
- `architecture/INTERFACES.ts` - TypeScript contracts
- `architecture/CORE_ARCHITECTURE.md` - Design patterns
- `architecture/IMPLEMENTATION_ROADMAP.md` - Phase-by-phase plan

### Key Design Decisions

**Backwards Compatibility**
- Every component has a version number
- Migrations handle schema changes
- Feature flags enable/disable systems
- Old saves always work with new code

**Loose Coupling**
- Systems communicate via Events
- Agents express Intent via Actions
- Components are pure data, Systems have logic

**Incremental Development**
- Each phase delivers something playable
- One feature per day after Phase 5
- Clean module boundaries

### File Count

```
Core package:       ~20 files
Renderer package:   ~5 files
Architecture docs:  ~4 files
Total:              ~30 files, ~3000 LOC
```

### Build Status

✅ All packages build without errors
✅ TypeScript strict mode enabled
✅ No runtime dependencies in core (except uuid)
✅ Demo app runs and renders
