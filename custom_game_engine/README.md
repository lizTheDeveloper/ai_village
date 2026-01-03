# AI Village Custom Game Engine

A custom TypeScript game engine built for the AI Village simulation project.

> *This project is dedicated to Tarn Adams and Dwarf Fortress. See the [project README](../README.md) for our philosophy and inspirations.*

## 🌐 Live Deployment

**VM IP Address:** `34.32.58.93`

- **Game:** http://34.32.58.93:3000

Deployed on Google Cloud Platform (europe-west10-a) with Groq API integration.

**Note:** The metrics dashboard (port 8766) is for internal use only and not exposed publicly.

## 🚀 Quick Start

### One Command to Run Everything

```bash
./start.sh
```

This automatically:
- ✅ Checks for first-time setup
- ✅ Installs dependencies if needed
- ✅ Builds TypeScript
- ✅ Starts metrics server (port 8766)
- ✅ Starts orchestration dashboard (port 3030)
- ✅ Starts game dev server (port 5173)
- ✅ Opens browser

### Different Modes

**Game Host** (default) - Play the game or host for others:
```bash
./start.sh gamehost
```

**Server** - Backend only for AI/autonomous agents:
```bash
./start.sh server
```

**Player** - Open browser to existing server:
```bash
./start.sh player
```

See [scripts/README.md](scripts/README.md) for detailed documentation.

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

- **Help System**
  - ✅ Self-documenting items/effects (embed docs in definitions)
  - ✅ HelpRegistry with search, tag, category indexing
  - ✅ Markdown wiki generator (human-readable)
  - ✅ JSON wiki generator (LLM-friendly)
  - ✅ See [packages/core/src/help/README.md](packages/core/src/help/README.md)

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

### Architecture & Specifications

All specifications and design documents are in the OpenSpec directory:
- `../openspec/specs/` - System specifications organized by domain
- `../openspec/README.md` - Overview of the OpenSpec workflow
- `../openspec/AGENTS.md` - Guide for agents working with specs

For implementation details, see the relevant spec in `../openspec/specs/[system-name]/`

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
