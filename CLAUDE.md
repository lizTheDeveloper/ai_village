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
