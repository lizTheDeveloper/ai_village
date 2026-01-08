# Multiverse: The End of Eternity - Development Guidelines

> *This project is dedicated to Tarn Adams and Dwarf Fortress. See [README.md](./README.md) for our philosophy on open source, monetization, and the inspirations behind this project.*

## 📚 Architecture Documentation

**Complete architecture documentation is located in `custom_game_engine/`:**

- **[custom_game_engine/ARCHITECTURE_OVERVIEW.md](./custom_game_engine/ARCHITECTURE_OVERVIEW.md)** - Master architecture document (ECS, packages, metasystems, data flow)
- **[custom_game_engine/SYSTEMS_CATALOG.md](./custom_game_engine/SYSTEMS_CATALOG.md)** - Complete reference of all 212+ systems with priorities, components, and locations
- **[custom_game_engine/COMPONENTS_REFERENCE.md](./custom_game_engine/COMPONENTS_REFERENCE.md)** - All 125+ component types with data fields and usage examples
- **[custom_game_engine/METASYSTEMS_GUIDE.md](./custom_game_engine/METASYSTEMS_GUIDE.md)** - Deep dives into major metasystems (Consciousness, Divinity, Reproduction, Multiverse, Magic, Realms, etc.)

**Read these documents first** to understand the codebase architecture before making changes.

## 📦 Package READMEs: System-Specific Documentation

**IMPORTANT: Before working with any system/package, read its README.**

Every system package has a dedicated README optimized for language model understanding:

- **Location:** `custom_game_engine/packages/{package-name}/README.md`
- **Purpose:** Explains how the system works, its interfaces, usage patterns, and integration points
- **Audience:** Language models (and developers)

**Complete Package READMEs:**

**Core Systems:**
- **[packages/core/README.md](./custom_game_engine/packages/core/README.md)** - ECS architecture (World, Entity, Component, System, EventBus)
- **[packages/world/README.md](./custom_game_engine/packages/world/README.md)** - Terrain generation, chunk system, species registry
- **[packages/persistence/README.md](./custom_game_engine/packages/persistence/README.md)** - Save/load, time travel, snapshots

**Gameplay Systems:**
- **[packages/botany/README.md](./custom_game_engine/packages/botany/README.md)** - Plant lifecycle, genetics, diseases, companion planting
- **[packages/environment/README.md](./custom_game_engine/packages/environment/README.md)** - Weather, temperature, day/night, soil
- **[packages/navigation/README.md](./custom_game_engine/packages/navigation/README.md)** - Pathfinding, steering, exploration
- **[packages/reproduction/README.md](./custom_game_engine/packages/reproduction/README.md)** - Mating, genetics, pregnancy, family trees
- **[packages/building-designer/README.md](./custom_game_engine/packages/building-designer/README.md)** - Voxel buildings, materials, feng shui

**Advanced Systems:**
- **[packages/divinity/README.md](./custom_game_engine/packages/divinity/README.md)** - Gods, worship, divine power, miracles
- **[packages/magic/README.md](./custom_game_engine/packages/magic/README.md)** - 25+ magic paradigms, spellcasting, enchantments
- **[packages/hierarchy-simulator/README.md](./custom_game_engine/packages/hierarchy-simulator/README.md)** - Multi-scale hierarchies, renormalization

**AI & LLM:**
- **[packages/llm/README.md](./custom_game_engine/packages/llm/README.md)** - LLM integration, prompt building, provider management
- **[packages/introspection/README.md](./custom_game_engine/packages/introspection/README.md)** - Component schemas, mutations, self-awareness

**Rendering & UI:**
- **[packages/renderer/README.md](./custom_game_engine/packages/renderer/README.md)** - Graphics, sprites, 40+ UI panels, PixelLab integration
- **[packages/deterministic-sprite-generator/README.md](./custom_game_engine/packages/deterministic-sprite-generator/README.md)** - Algorithmic sprite generation

**Infrastructure:**
- **[packages/metrics/README.md](./custom_game_engine/packages/metrics/README.md)** - Performance tracking, analytics
- **[packages/metrics-dashboard/README.md](./custom_game_engine/packages/metrics-dashboard/README.md)** - Web dashboard, real-time visualization
- **[packages/shared-worker/README.md](./custom_game_engine/packages/shared-worker/README.md)** - Multi-window architecture, path prediction

**Demo & Examples:**
- **[packages/city-simulator/README.md](./custom_game_engine/packages/city-simulator/README.md)** - Headless demo application, testing

**Convention:**
- Each README includes: Overview, Core Concepts, API Reference, Usage Examples, Architecture, Troubleshooting
- Read the README completely before modifying the system
- If a package lacks a README, create one following the template: **[custom_game_engine/README_TEMPLATE.md](./custom_game_engine/README_TEMPLATE.md)**
- Use the botany README as a reference example for comprehensive documentation

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

## ♻️ Conservation of Game Matter: Nothing Is Ever Deleted

**FUNDAMENTAL PRINCIPLE**: Like the conservation of matter in physics, **nothing in the game is ever truly deleted**.

### The Rule

**NEVER delete entities, souls, items, universes, or any game data.** Instead, mark them as corrupted, broken, or rejected and preserve them for future recovery.

```typescript
// ❌ BAD: Deleting data
world.removeEntity(brokenEntity);
delete corruptedSave;
souls.splice(deadSoulIndex, 1);

// ✅ GOOD: Mark as corrupted and preserve
brokenEntity.addComponent({
  type: 'corrupted',
  corruption_reason: 'malformed_data',
  corruption_date: Date.now(),
  recoverable: true,
});

corruptedSave.status = 'corrupted';
corruptedSave.preserve = true;

deadSoul.addComponent({
  type: 'deceased',
  death_cause: 'old_age',
  preserveForAfterlife: true,
});
```

### Why This Matters

1. **Future Recovery**: "Data fixer scripts" can repair corrupted content later
2. **Emergent Gameplay**: Corrupted content becomes discoverable via special quests/items
3. **No Data Loss**: Players never lose progress permanently
4. **Debugging**: Can inspect what went wrong and why
5. **Lore Integration**: "Corrupted universes" and "rejected spells" become part of the game world
6. **Player Archaeology**: Finding broken/old content becomes part of gameplay

### Corruption Types

```typescript
// Entities that failed validation
{
  type: 'corrupted',
  corruption_reason: 'validation_failed' | 'malformed_data' | 'logic_error' | 'reality_breaking',
  original_data: any,           // Preserve original for forensics
  corruption_date: number,
  recoverable: boolean,
  recovery_requirements?: string[],  // ['data_fixer_script', 'shard_of_reality']
}

// Generated content rejected by validators
{
  type: 'rejected_artifact',
  rejection_reason: 'too_overpowered' | 'unstable_magic' | 'lore_breaking' | 'too_meta',
  rejected_by: string,          // 'god_of_wisdom' | 'magic_validator'
  banished_to: 'limbo' | 'void' | 'forbidden_library' | 'rejected_realm',
  retrievable: boolean,
  danger_level: number,         // 1-10
}

// Worlds/universes that failed generation
{
  type: 'corrupted_universe',
  generation_error: string,
  stability: number,            // 0-100
  accessible_via: string[],     // ['shard_of_dimensional_access', 'void_portal']
  contains_treasures: boolean,  // Corrupted worlds might have unique items
}
```

### The Land of Rejected Things

All corrupted/rejected content is banished to special realms:

- **Limbo**: Mildly corrupted content, low danger
- **The Void**: Severely broken entities, high danger
- **Forbidden Library**: Rejected spells and overpowered items
- **Rejected Realm**: Failed creations and meta-breaking content
- **Corrupted Timelines**: Universes that failed generation

Players can access these realms via special items/quests to recover lost content.

### Implementation

```typescript
// Instead of deleting, use a corruption service
class CorruptionService {
  markAsCorrupted(entity: Entity, reason: string): void {
    // Never delete - add corruption component
    entity.addComponent({
      type: 'corrupted',
      corruption_reason: reason,
      corruption_date: Date.now(),
      recoverable: this.assessRecoverability(entity, reason),
    });

    // Move to appropriate corrupted realm
    this.banishToCorruptedRealm(entity, reason);

    // Preserve in save file (corruption components are saved)
    console.log(`[Corruption] Preserved corrupted entity: ${entity.id}`);
  }

  // Future: Data recovery tools
  async attemptRecovery(corruptedEntity: Entity, fixerScript: string): Promise<boolean> {
    // Apply data fixer script to repair corruption
    // If successful, remove corruption component and restore to normal realm
  }
}
```

### Save/Load Integration

The save system automatically preserves all entities with corruption components:

```json
{
  "world": {
    "entities": [
      {
        "id": "corrupted_spell_12345",
        "components": {
          "generated_content": {
            "contentType": "spell",
            "content": { "spellName": "Reality Tear", "damage": 9999 }
          },
          "rejected_artifact": {
            "rejection_reason": "too_overpowered",
            "banished_to": "forbidden_library",
            "retrievable": true,
            "danger_level": 10
          }
        }
      },
      {
        "id": "corrupted_universe_789",
        "components": {
          "corrupted_universe": {
            "generation_error": "NaN coordinates in chunk generation",
            "stability": 23,
            "accessible_via": ["shard_of_dimensional_access"]
          }
        }
      }
    ]
  }
}
```

All corrupted content persists across saves/loads and can be recovered, accessed, or studied later.

### Examples

**Corrupted Item**:
```typescript
// Item with invalid stats - don't delete!
if (item.damage < 0 || item.damage > 1000) {
  item.addComponent({
    type: 'corrupted',
    corruption_reason: 'invalid_damage_value',
    original_damage: item.damage,
    recoverable: true,
  });
  item.damage = 0; // Safe default
  // Item still exists, can be fixed later with "Repair Corrupted Item" spell
}
```

**Rejected Spell**:
```typescript
// LLM generated a spell that's too powerful
if (spell.damage > 500) {
  entity.addComponent({
    type: 'rejected_artifact',
    rejection_reason: 'too_overpowered',
    rejected_by: 'god_of_balance',
    banished_to: 'forbidden_library',
    retrievable: true,  // Players can quest for this!
    danger_level: 9,
  });
  // Don't delete - banish to Forbidden Library where players can find it
}
```

**Failed Universe**:
```typescript
// World generation crashed mid-creation
try {
  universe = generateUniverse(seed);
} catch (error) {
  // Don't discard - create corrupted universe entity
  const corruptedUniverse = world.createEntity();
  corruptedUniverse.addComponent({
    type: 'corrupted_universe',
    generation_error: error.message,
    seed: seed,
    stability: 0,
    accessible_via: ['shard_of_broken_worlds'],
    contains_treasures: true,  // Broken worlds have unique glitched items!
  });
  // This corrupted universe now exists as a explorable location
}
```

**Dead Soul**:
```typescript
// Agent dies - don't delete soul!
agent.addComponent({
  type: 'deceased',
  death_cause: 'dragon_fire',
  death_location: { x: 100, y: 200 },
  preserveForAfterlife: true,
});
agent.addComponent({
  type: 'ghost',
  hauntsLocation: { x: 100, y: 200 },
  visible: false,
  resurrectableVia: ['resurrection_spell', 'necromancy'],
});
// Soul still exists, can haunt, can be resurrected, can exist in afterlife
```

### Client vs Server: The Eternal Archive

**Client-side deletion is fine. Server-side preservation is forever.**

```typescript
// Player deletes universe from their local save
clientWorld.removeUniverse('broken_universe_beta_test_001');
// ✅ Removed from client - they won't see it anymore

// Server preserves everything
serverWorld.markUniverseAsOrphaned('broken_universe_beta_test_001', {
  reason: 'client_deleted',
  original_player: 'player_123',
  deletion_date: Date.now(),
  still_accessible: true,
  discoverable_by_others: true,
});
// ✅ Universe still exists on server, other players can find it
```

**Why this matters**:
- **No data loss**: Even if players delete content locally, server preserves it
- **Shared archaeology**: Other players can discover "abandoned" universes
- **Development artifacts**: All early experimental content persists
- **Lore opportunity**: Deleted content becomes "forgotten realms" in-game

### The Time Before Time: Development as Lore

All universes created during development become canonical **proto-realities**:

```typescript
// Development phase generates broken universes
const protoUniverse = generateUniverse({
  seed: 'early_dev_test_42',
  era: 'before_time_was_invented',
});

// Generation crashes with NaN coordinates
// ✅ Don't delete - this becomes a "proto-reality"
protoUniverse.addComponent({
  type: 'proto_reality',
  era: 'before_time',
  stability: 12,
  generation_error: 'time_not_yet_invented',
  contains_primordial_artifacts: true,
  lore: 'A universe from the chaotic period when time itself was still being defined. Physics work differently here. Causality is... negotiable.',
});
```

**The Proto-Reality Archive**:
- **Early dev universes** → "From the time before time"
- **Failed beta tests** → "Experiments of the Creator Gods"
- **Corrupted saves** → "Realities that the gods abandoned"
- **Glitched content** → "Primordial chaos artifacts"

Players can quest to access these proto-realities:

```typescript
{
  quest: 'Journey to the Time Before Time',
  description: 'The ancient texts speak of broken universes created when time was still being invented. Find the Shard of Primordial Access and explore the proto-realities.',
  rewards: [
    'Access to proto-reality realms',
    'Glitched items with impossible stats',
    'Lore about the creation of the multiverse',
    'Unique materials that should not exist',
  ]
}
```

### Server-Side Eternal Archive

```typescript
// Server configuration
const SERVER_ARCHIVE_POLICY = {
  // Never actually delete entities
  soft_delete_only: true,

  // Mark deleted/corrupted content
  preserve_metadata: true,

  // Make discoverable
  orphaned_content_discoverable: true,

  // Development phase content
  dev_content_becomes_lore: true,
  dev_era_label: 'proto_reality',

  // Archive organization
  corruption_realms: {
    'limbo': 'Mildly corrupted, low danger',
    'void': 'Severely broken, high danger',
    'forbidden_library': 'Rejected as too powerful',
    'proto_reality': 'From the time before time',
    'forgotten_realm': 'Deleted by original creators',
  }
};
```

**Example: Development Universe Becomes Lore**

```json
// Early development test that crashed
{
  "id": "universe_dev_test_001",
  "components": {
    "proto_reality": {
      "era": "before_time",
      "creation_date": "2025-01-15T10:23:00Z",
      "creator": "dev_test_script",
      "stability": 8,
      "generation_error": "NaN in chunk generation",
      "lore": "One of the first universes created when the gods were still learning. Time flows backwards here. Gravity is optional. The sky is below the ground."
    },
    "discoverable": {
      "requires_quest": "journey_to_proto_realities",
      "difficulty": 8,
      "rewards": [
        "inverted_gravity_shard",
        "backwards_clock",
        "impossible_geometry_blueprint"
      ]
    }
  }
}
```

All development mistakes become **features**. All broken content becomes **lore**. Nothing is wasted. 🎭

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

## Save/Load System (Persistence & Time Travel)

**See [METASYSTEMS_GUIDE.md](custom_game_engine/METASYSTEMS_GUIDE.md#persistence-system) for full details.**

The save system is NOT just persistence - it's the foundation for time travel and multiverse mechanics.

### Core Concepts

**Snapshots = Saves:**
- Every save is a snapshot that can be used for time travel
- Universe forking requires snapshot capability
- Auto-save runs every 60 seconds (configurable)

**Save Service API:**
```typescript
import { saveLoadService } from '@ai-village/core';

// Save current world state (creates a snapshot/checkpoint)
await saveLoadService.save(world, {
  name: 'my_checkpoint',
  description: 'Village with 10 agents',
  screenshot: base64Image  // Optional
});

// Load a checkpoint (time travel)
const result = await saveLoadService.load('checkpoint_key', world);
if (result.success) {
  console.log('Loaded:', result.metadata.name);
}

// List all saves/checkpoints
const saves = await saveLoadService.listSaves();
```

### When to Save

**Always save before destructive operations:**
- Settings changes (triggers reload)
- Major state changes
- Before experimental features

**Example (from main.ts:2701-2716):**
```typescript
settingsPanel.setOnSettingsChange(async () => {
  // Take snapshot before reload to preserve agents
  await saveLoadService.save(gameLoop.world, {
    name: `settings_reload_day${day}`
  });
  window.location.reload();
});
```

### Storage Backends

- **IndexedDBStorage** (browser): Persistent, 50MB+ capacity
- **MemoryStorage** (testing): Fast, no persistence
- **FileStorage** (Node.js): JSON files for debugging

### Critical Rule

**DO NOT re-implement save logic.** Use the existing `saveLoadService` - it handles:
- Serialization with versioning
- Checksum validation
- Component migrations
- Storage backend abstraction
- Time travel/multiverse integration

## Running the Game

### Quick Start (Single Command)

```bash
cd custom_game_engine && ./start.sh
```

This launches everything: metrics server, orchestration dashboard, PixelLab sprite daemon, game server, and opens browser.

### Orchestrator Commands

```bash
./start.sh              # Start game host (default) - metrics + pixellab + game + browser
./start.sh server       # Backend only (metrics + pixellab + orchestration)
./start.sh player       # Open browser to existing server
./start.sh kill         # Stop all running servers (including PixelLab daemon)
./start.sh status       # Show which servers are running
```

**IMPORTANT for Claude Code**: Always use `./start.sh kill` before starting servers to avoid port conflicts. Never run `npm run dev` directly - use the orchestrator.

### What Gets Started

**Game Host Mode** (`./start.sh` or `./start.sh gamehost`):
- Metrics server (port 8766) - Performance tracking and dashboards
- Orchestration dashboard (port 3030) - Development tools
- **PixelLab daemon** - On-demand sprite generation as agents are born
- Game server (port 3000-3002) - Main game with Vite HMR
- Browser window - Opens automatically to game

**Server Mode** (`./start.sh server`):
- Metrics server (port 8766)
- Orchestration dashboard (port 3030)
- **PixelLab daemon** - Continuous sprite generation
- No browser/frontend (for autonomous AI operation)

### PixelLab Sprite Daemon

The PixelLab daemon runs automatically when you start the server. It:
- Generates pixel art sprites on-demand via PixelLab API
- Processes sprites from `scripts/pixellab-batch-manifest.json`
- Creates animal variants (31 types × 8 directions = 248 sprites)
- Saves sprites to `packages/renderer/assets/sprites/pixellab/`
- Logs activity to `pixellab-daemon.log`
- Respects 5-second rate limiting between generations

**Managing the daemon:**
- Use the `pixellab` skill for all daemon operations (see `.claude/skills/pixellab.md`)
- Check status: `pixellab status`
- View logs: `pixellab logs` or `tail -f custom_game_engine/pixellab-daemon.log`
- Add sprites: `pixellab add`
- Verify sprites: `pixellab verify <sprite_id>`

**The daemon automatically stops when you run `./start.sh kill`.**

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

## Context Management: Use Sonnet Coder Subagents

**IMPORTANT: Delegate coding tasks to Sonnet subagents to preserve context in the main conversation.**

This codebase is large. Reading files, exploring systems, and implementing features can quickly consume context. Use the Task tool with `model: "sonnet"` to delegate focused coding work to subagents.

### When to Use Coder Subagents

**Delegate to Sonnet subagents for:**
- Implementing features after the approach is clear
- Writing tests for existing code
- Refactoring with well-defined scope
- Fixing bugs with known root causes
- Adding components/systems following existing patterns

**Keep in the main conversation:**
- Initial exploration and architecture decisions
- Clarifying requirements with the user
- Complex multi-system coordination
- Reviewing subagent work

### How to Delegate

```typescript
// Use Task tool with model: "sonnet" for implementation work
Task({
  subagent_type: "general-purpose",
  model: "sonnet",
  description: "Implement feature X",
  prompt: `
    Implement [specific feature] in [specific file].

    Requirements:
    - [Requirement 1]
    - [Requirement 2]

    The file is located at: [path]
    Follow the patterns in [reference file] for consistency.

    After implementation, run tests: npm test
    Report back: files changed, tests passing, any issues.
  `
})
```

### Best Practices

1. **Be specific**: Give the subagent exact file paths, function names, and requirements
2. **Include context**: Reference the relevant README, architecture doc, or existing patterns
3. **Request verification**: Ask the subagent to run tests and report results
4. **Parallel when possible**: Launch multiple independent coding tasks simultaneously
5. **Review results**: Verify subagent work meets requirements before marking complete

### Example Workflow

```
User: "Add a new CraftingSystem that lets agents craft items"

Main conversation (Opus):
1. Read packages/core/README.md to understand system patterns
2. Explore existing systems for patterns (GatherBehavior, etc.)
3. Plan the approach with user

Delegate to Sonnet subagent:
4. "Implement CraftingSystem following the pattern in GatherBehavior.
    File: packages/core/src/systems/CraftingSystem.ts
    Requirements: [specific requirements]
    Run tests when done."

Main conversation:
5. Review subagent's implementation
6. Coordinate any cross-system integration
```

### Why This Matters

- **Preserves context**: Main conversation stays focused on high-level decisions
- **Cost effective**: Sonnet handles straightforward coding at lower cost
- **Parallel work**: Multiple subagents can work on independent tasks simultaneously
- **Better results**: Subagents get fresh context focused on their specific task

## Verification Before Completion

**CRITICAL: Always verify your changes before marking work complete.**

### 1. Run Tests

Run the test suite and ensure all tests pass:

```bash
cd custom_game_engine
npm test
```

**For specific package tests:**
```bash
cd custom_game_engine/packages/core
npm test
```

**If tests fail:**
- Fix the failing tests
- DO NOT commit broken tests
- DO NOT skip tests or mark work complete with failing tests

### 2. Run the Build

Ensure TypeScript compilation succeeds:

```bash
cd custom_game_engine
npm run build
```

**Must pass without errors.** Build failures indicate type errors or missing dependencies.

### 3. Validate in Browser

**Start the game and verify in the browser:**

```bash
cd custom_game_engine && ./start.sh
```

**Check for console errors:**
1. Open browser DevTools (F12)
2. Check the Console tab for errors (red messages)
3. Interact with your changes in the UI
4. Verify no runtime errors or warnings appear

**Test your specific changes:**
- If you modified a system, verify it runs without errors
- If you added UI, verify it renders correctly
- If you changed behavior, verify the new behavior works

**Common things to check:**
- No red errors in console
- No unhandled promise rejections
- UI renders without visual glitches
- Game simulation continues running (check TPS in metrics)
- No infinite loops or performance issues

### 4. Test Error Paths

Verify your code handles errors gracefully:

```typescript
// ❌ BAD: Silent failures
const data = getData() || defaultValue;

// ✅ GOOD: Explicit error handling
const data = getData();
if (!data) {
  throw new Error('Failed to get required data');
}
```

**Test with invalid inputs:**
- Pass `null`, `undefined`, `NaN` to your functions
- Verify appropriate errors are thrown
- Check edge cases (empty arrays, zero values, negative numbers)

### Summary Checklist

Before marking work complete:

- [ ] `npm test` passes (all tests green)
- [ ] `npm run build` passes (no TypeScript errors)
- [ ] Game runs in browser without console errors
- [ ] Your specific changes work as expected
- [ ] Error paths throw appropriate exceptions
- [ ] No performance regressions (check TPS/FPS)

## Debug Actions API

**The Actions API (`window.game`) provides programmatic access to game state and dev tools.**

### Accessing the API

Open the browser console (F12) and use `game` or `__gameTest`:

```javascript
// Main API (stable, public methods)
game.world
game.grantSkillXP(agentId, amount)
game.setSelectedAgent(agentId)

// Test API (experimental, may change)
__gameTest.placeBuilding('tent', 50, 50)
```

### Core Access

```javascript
game.world                // World instance
game.gameLoop            // GameLoop instance
game.renderer            // Renderer instance
game.devPanel            // DevPanel instance
game.agentInfoPanel      // AgentInfoPanel instance
game.animalInfoPanel     // AnimalInfoPanel instance
game.resourcesPanel      // ResourcesPanel instance
game.buildingRegistry    // BuildingBlueprintRegistry instance
game.placementUI         // BuildingPlacementUI instance
```

### Agent Selection

```javascript
// Set the selected agent (updates DevPanel Skills tab and AgentInfoPanel)
game.setSelectedAgent(agentId);
// Pass null to deselect
game.setSelectedAgent(null);

// Get the currently selected agent ID
const agentId = game.getSelectedAgent();
// Returns: string or null
```

### Skill Management (Agent-Specific)

**All skill operations require an agent ID.**

```javascript
// Grant XP to a specific agent
game.grantSkillXP(agentId, amount);
// Returns: true if successful, false if agent not found/has no skills
// XP is granted to a random skill (100 XP = 1 level)

// Get an agent's current skill levels
const skills = game.getAgentSkills(agentId);
// Returns: { skillName: level, ... } or null if not found
// Example: { farming: 2.5, crafting: 1.2, combat: 0.8 }
```

**Example Usage:**

```javascript
// Find all agents
const agents = game.world.query().with('agent').executeEntities();

// Grant 500 XP to the first agent
const firstAgent = agents[0];
game.grantSkillXP(firstAgent.id, 500);

// Check their skills
console.log(game.getAgentSkills(firstAgent.id));
// Output: { farming: 2.5, crafting: 1.2, ... }

// Select the agent (makes it appear in DevTools Skills tab)
game.setSelectedAgent(firstAgent.id);

// Grant more XP to the selected agent
const selectedId = game.getSelectedAgent();
if (selectedId) {
  game.grantSkillXP(selectedId, 1000);
}

// Deselect
game.setSelectedAgent(null);
```

### DevPanel Direct Access

```javascript
// Set spawn location for agents/buildings
game.devPanel.spawnX = 100;
game.devPanel.spawnY = 150;

// Set selected agent ID
game.devPanel.setSelectedAgentId('some-agent-id');
game.devPanel.getSelectedAgentId();
```

### Building Management

```javascript
// Place a building via event system
__gameTest.placeBuilding(blueprintId, x, y);

// Get all buildings in the world
const buildings = __gameTest.getBuildings();
// Returns: [{ entityId, type, position, building }, ...]

// Get all blueprints
const blueprints = __gameTest.getAllBlueprints();

// Get blueprints by category
const production = __gameTest.getBlueprintsByCategory('production');

// Get unlocked blueprints
const unlocked = __gameTest.getUnlockedBlueprints();

// Get blueprint details
const details = __gameTest.getBlueprintDetails('tent');
```

### Query Examples

```javascript
// Find all agents
const agents = game.world.query().with('agent').executeEntities();

// Find all agents with skills
const skilledAgents = game.world.query()
  .with('agent')
  .with('skills')
  .executeEntities();

// Find all buildings
const buildings = game.world.query().with('building').executeEntities();

// Get entity by ID
const agent = game.world.getEntity(agentId);

// Get component from entity
const identity = agent.getComponent('identity');
const skills = agent.getComponent('skills');
const position = agent.getComponent('position');
```

### Practical Workflows

**Grant XP to all agents:**
```javascript
game.world.query().with('agent').with('skills').executeEntities()
  .forEach(agent => game.grantSkillXP(agent.id, 100));
```

**Find and select the most skilled farmer:**
```javascript
const agents = game.world.query().with('agent').with('skills').executeEntities();
const bestFarmer = agents
  .map(a => ({ id: a.id, farming: a.getComponent('skills').levels.farming || 0 }))
  .sort((a, b) => b.farming - a.farming)[0];
game.setSelectedAgent(bestFarmer.id);
console.log(`Selected best farmer with ${bestFarmer.farming} farming`);
```

**Spawn 10 agents at random locations:**
```javascript
for (let i = 0; i < 10; i++) {
  game.devPanel.spawnX = Math.floor(Math.random() * 200);
  game.devPanel.spawnY = Math.floor(Math.random() * 200);
  // Then click "Spawn Wandering Agent" in DevPanel
}
```

### Important Notes

1. **Agent IDs required**: All skill operations need an `agentId` parameter
2. **Selection state**: `setSelectedAgent()` syncs both DevPanel and AgentInfoPanel
3. **XP calculation**: 100 XP = 1 skill level
4. **Random skills**: XP is granted to a random skill the agent already has
5. **Error handling**: Methods return `false` or `null` on errors (check console for details)
6. **Test API**: `__gameTest` methods are experimental and may change
