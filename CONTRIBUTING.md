# Contributing to Multiverse: The End of Eternity

Welcome! We're glad you want to contribute. This guide will help you get started quickly.

## Quick Start (5 minutes)

```bash
# 1. Clone the repo
git clone https://github.com/[your-org]/ai_village.git
cd ai_village

# 2. Install dependencies
cd custom_game_engine
npm install

# 3. Start the game
./start.sh

# 4. Open in browser (auto-opens, or go to http://localhost:3000)
```

That's it! You should see a village with AI agents living their lives.

## Before You Start Coding

### Read These First
1. **[PLAYER_GUIDE.md](./PLAYER_GUIDE.md)** - Play the game first! Understand what you're building
2. **[CLAUDE.md](./CLAUDE.md)** - Development guidelines (naming conventions, code style, performance)
3. **[QUICK_REFERENCE.md](./custom_game_engine/QUICK_REFERENCE.md)** - Common patterns and commands

### Understand the Architecture
- **[ARCHITECTURE_OVERVIEW.md](./custom_game_engine/ARCHITECTURE_OVERVIEW.md)** - How the ECS works
- **[DOCUMENTATION_INDEX.md](./custom_game_engine/DOCUMENTATION_INDEX.md)** - Find any documentation

## Development Workflow

### Starting the Game
```bash
cd custom_game_engine

./start.sh              # Full game with browser
./start.sh server       # Backend only (for headless testing)
./start.sh kill         # Stop all services
./start.sh status       # Check what's running
./start.sh logs         # View logs
```

### Key URLs
- **Game**: http://localhost:3000
- **Admin Dashboard**: http://localhost:8766/admin
- **Metrics API**: http://localhost:8766/dashboard

### Hot Module Reload (HMR)
**Don't restart the server!** Vite automatically reloads your TypeScript changes in 1-2 seconds.

Only restart if you:
- Changed `package.json` or ran `npm install`
- Modified config files (`vite.config.ts`, `tsconfig.json`)
- See the server crash

### Running Tests
```bash
cd custom_game_engine
npm test                # Run all tests
npm run build           # Type-check (must pass before commit)
```

### Verify Your Changes
Before submitting a PR:
1. `npm test` passes
2. `npm run build` passes
3. No errors in browser console (F12 -> Console)
4. Your feature actually works in-game

## Code Style

### Quick Rules
| Do | Don't |
|---|---|
| `type = 'spatial_memory'` | `type = 'SpatialMemory'` |
| Crash on invalid data | Silent fallbacks |
| Use `packages/core/src/utils/math.ts` | Roll your own math |
| `console.error('[System] Error:', e)` | `console.log('Debug:', x)` |

### Components vs Systems
- **Components** = Data only (no logic)
- **Systems** = Logic that operates on components

```typescript
// GOOD: Component is just data
const position: PositionComponent = { type: 'position', x: 10, y: 20 };

// GOOD: System has the logic
class MovementSystem extends System {
  update(world: World) {
    for (const entity of this.getEntitiesWithPosition()) {
      // Logic here
    }
  }
}
```

### Performance
The game runs at 20 TPS (ticks per second). Don't:
- Query inside loops
- Use `Math.sqrt` in hot paths (use squared distance)
- Create objects every tick

See [PERFORMANCE.md](./custom_game_engine/PERFORMANCE.md) for details.

## Project Structure

```
ai_village/
├── README.md               # Project overview
├── CONTRIBUTING.md         # You are here
├── CLAUDE.md              # Development guidelines
├── PLAYER_GUIDE.md        # How to play
├── FAQ.md                 # Common questions
├── CONTROLS.md            # Keyboard/mouse controls
│
├── custom_game_engine/    # THE GAME CODE
│   ├── start.sh          # Start the game
│   ├── packages/         # All game packages
│   │   ├── core/         # ECS, events, actions
│   │   ├── world/        # Terrain, chunks
│   │   ├── renderer/     # Graphics, UI panels
│   │   ├── llm/          # AI agent brains
│   │   ├── magic/        # 25+ magic paradigms
│   │   ├── divinity/     # Gods, temples, miracles
│   │   └── ...           # 19 packages total
│   └── docs/             # Technical documentation
│
├── archive/              # Historical implementation notes
│   ├── implementation-reports/
│   └── design-specs/
│
└── openspec/             # Feature specifications
```

## Finding Your Way Around

### "Where is the code for X?"

| Feature | Location |
|---------|----------|
| Agent AI/brains | `packages/llm/` |
| Movement/pathfinding | `packages/navigation/` |
| Magic systems | `packages/magic/` |
| Building construction | `packages/building-designer/` |
| Save/load, time travel | `packages/persistence/` |
| UI panels | `packages/renderer/src/panels/` |
| Plant genetics | `packages/botany/` |
| Weather, temperature | `packages/environment/` |
| Gods, temples | `packages/divinity/` |
| Family, reproduction | `packages/reproduction/` |

### "How do I add a new system?"

1. Read the package's `README.md` first
2. Look at existing systems in that package
3. Follow the patterns in [PIT_OF_SUCCESS_APIS.md](./custom_game_engine/docs/PIT_OF_SUCCESS_APIS.md)

## Making a Contribution

### For Bug Fixes
1. Create a branch: `git checkout -b fix/describe-the-bug`
2. Write a test that reproduces the bug
3. Fix the bug
4. Verify the test passes
5. Submit a PR

### For New Features
1. Open an issue first to discuss the approach
2. Create a branch: `git checkout -b feature/describe-the-feature`
3. Implement with tests
4. Update relevant documentation
5. Submit a PR

### PR Guidelines
- Keep PRs focused (one feature/fix per PR)
- Include before/after screenshots for UI changes
- Reference related issues
- Make sure tests and build pass

## Getting Help

- **Questions**: Open a GitHub issue with the "question" label
- **Bugs**: Open an issue with steps to reproduce
- **Discord**: [Coming soon]

## Conservation of Game Matter

**Never delete entities, souls, or items.** Mark them as corrupted instead:

```typescript
// BAD
world.removeEntity(brokenEntity);

// GOOD
brokenEntity.addComponent({
  type: 'corrupted',
  corruption_reason: 'malformed_data',
  recoverable: true
});
```

This enables future recovery, emergent gameplay, and player archaeology.

## License

MIT - Use it, fork it, learn from it, share it.

---

*Questions? Open an issue. We're happy to help!*
