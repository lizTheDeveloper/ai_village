# Server-Side Multiverse Persistence Implementation Plan

## Overview

This plan implements server-side persistence for the multiverse system, enabling:
- Cross-player universe connections
- Time travel to other players' universe snapshots
- Universe forking from any canonical event
- Server as the "multiverse" that holds all universes

## Relevant Specs

- `openspec/specs/persistence-system/multiverse-persistence.md` - Core persistence architecture
- `openspec/specs/universe-system/multiverse-soul-tracking-spec.md` - Soul tracking across forks
- `openspec/specs/universe-system/spec.md` - Universe/planet definitions, **SQL schema**
- `openspec/specs/ui-system/universe-browser.md` - Universe browser UI
- `openspec/specs/ringworld/SAVE_SYSTEM_INTEGRATION.md` - Timeline/canon event integration

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     MULTIVERSE SERVER                           │
│                     (Port 3001 - api-server.ts)                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                  Universe Storage                        │   │
│  │  /data/universes/{universeId}/                          │   │
│  │    ├── metadata.json                                     │   │
│  │    ├── snapshots/                                        │   │
│  │    │   ├── {tick}.snapshot.json.gz                      │   │
│  │    │   └── canonical/                                    │   │
│  │    │       ├── death_alice_day42.snapshot.json.gz       │   │
│  │    │       └── first_harvest_day15.snapshot.json.gz     │   │
│  │    └── timeline.json                                     │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                  Passage Registry                        │   │
│  │  /data/passages/                                         │   │
│  │    ├── {passageId}.json                                  │   │
│  │    └── index.json                                        │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                  Player Registry                         │   │
│  │  /data/players/                                          │   │
│  │    ├── {playerId}/                                       │   │
│  │    │   ├── profile.json                                  │   │
│  │    │   └── universes.json                                │   │
│  │    └── index.json                                        │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
          ▲                    ▲                    ▲
          │                    │                    │
          │ POST /api/snapshot │ GET /api/universe  │ POST /api/passage
          │                    │                    │
┌─────────┴────────┐ ┌────────┴─────────┐ ┌───────┴──────────┐
│   Browser A      │ │   Browser B      │ │   Browser C      │
│   (Player 1)     │ │   (Player 2)     │ │   (Player 3)     │
│                  │ │                  │ │                  │
│   Universe A     │ │   Universe B     │ │   Universe C     │
│   [IndexedDB]    │ │   [IndexedDB]    │ │   [IndexedDB]    │
└──────────────────┘ └──────────────────┘ └──────────────────┘
```

## Implementation Phases

### Phase 1: Server Storage Layer

**Files to create:**
- `demo/src/multiverse-storage.ts` - File-based universe storage
- `demo/src/universe-api.ts` - API route handlers

**API Endpoints:**

```typescript
// Universe Management
POST   /api/universe                    // Create new universe
GET    /api/universe/:id                // Get universe metadata
DELETE /api/universe/:id                // Delete universe

// Snapshot Management
POST   /api/universe/:id/snapshot       // Upload snapshot (canonical or regular)
GET    /api/universe/:id/snapshot/:tick // Get snapshot at tick
GET    /api/universe/:id/snapshots      // List all snapshots
GET    /api/universe/:id/timeline       // Get timeline with canonical events

// Cross-Universe
GET    /api/universes                   // List all public universes
POST   /api/universe/:id/fork           // Fork universe at snapshot
GET    /api/universe/:id/forks          // List forks of universe

// Passages
POST   /api/passage                     // Create passage between universes
GET    /api/passage/:id                 // Get passage details
DELETE /api/passage/:id                 // Delete passage
GET    /api/passages                    // List all passages

// Players
POST   /api/player                      // Register player
GET    /api/player/:id                  // Get player profile
GET    /api/player/:id/universes        // Get player's universes
```

### Phase 2: Client-Server Sync

**Files to modify:**
- `packages/persistence/src/SaveLoadService.ts` - Add server upload
- `packages/core/src/systems/AutoSaveSystem.ts` - Sync canonical events

**New files:**
- `packages/persistence/src/storage/ServerStorage.ts` - Server backend
- `packages/persistence/src/MultiverseClient.ts` - API client

**Key changes:**

```typescript
// In SaveLoadService.save()
async save(world: World, options: SaveOptions): Promise<void> {
  // 1. Save locally (existing)
  await this.storageBackend.save(key, saveFile);

  // 2. Upload to server (new)
  if (this.serverSync && options.syncToServer !== false) {
    await this.multiverseClient.uploadSnapshot(
      saveFile.universes[0].identity.id,
      saveFile,
      options.canonEvent
    );
  }
}
```

### Phase 3: Universe Browser Integration

**Files to modify:**
- `demo/src/main.ts` - Add universe browser panel

**New files:**
- `packages/renderer/src/panels/UniverseBrowserPanel.ts` - Browse universes
- `packages/renderer/src/panels/TimelineBrowserPanel.ts` - Browse timeline

**Features:**
- List all universes in multiverse
- View canonical event timeline
- Fork from any canonical event
- Travel to other player's universe

### Phase 4: Passage System

**Files to create:**
- `packages/core/src/multiverse/PassageManager.ts` - Manage passages
- `packages/core/src/systems/PassageTravelSystem.ts` - Handle travel

**Features:**
- Create passages between universes
- Entity travel through passages
- Passage stability and maintenance

---

## Data Structures

### Universe Metadata (server)
```typescript
interface UniverseMetadata {
  id: string;
  name: string;
  ownerId: string;
  createdAt: number;
  lastSnapshotAt: number;
  snapshotCount: number;
  canonicalEventCount: number;
  isPublic: boolean;
  forkOf?: {
    universeId: string;
    snapshotTick: number;
  };
}
```

### Snapshot Index (server)
```typescript
interface SnapshotIndex {
  universeId: string;
  snapshots: Array<{
    tick: number;
    timestamp: number;
    type: 'auto' | 'manual' | 'canonical';
    canonEvent?: {
      type: CanonEventType;
      title: string;
      description: string;
    };
    fileSize: number;
    checksum: string;
  }>;
}
```

### Timeline Entry (for UI)
```typescript
interface TimelineEntry {
  tick: number;
  day: number;
  timestamp: number;
  type: 'auto' | 'manual' | 'canonical';
  title: string;
  description?: string;
  canFork: boolean;  // Always true for canonical events
  hasSnapshot: boolean;
}
```

---

## Implementation Order

1. **Server storage layer** - File-based storage for universes
2. **API endpoints** - REST API for universe/snapshot management
3. **MultiverseClient** - Client-side API wrapper
4. **ServerStorage backend** - Integrate with SaveLoadService
5. **Auto-sync on canonical events** - AutoSaveSystem modification
6. **Universe browser UI** - Browse and fork universes
7. **Passage system** - Cross-universe travel

---

## Testing Strategy

1. **Unit tests** for MultiverseStorage
2. **Integration tests** for API endpoints
3. **E2E tests** for save → sync → load cycle
4. **Multi-client tests** for cross-player scenarios

---

## File Locations

```
demo/src/
├── api-server.ts              # Add new routes here
├── multiverse-storage.ts      # NEW: File-based storage
└── universe-api.ts            # NEW: Route handlers

packages/persistence/src/
├── SaveLoadService.ts         # MODIFY: Add server sync
├── MultiverseClient.ts        # NEW: API client
└── storage/
    ├── IndexedDBStorage.ts    # Existing
    ├── MemoryStorage.ts       # Existing
    └── ServerStorage.ts       # NEW: Server backend

packages/core/src/
├── systems/
│   └── AutoSaveSystem.ts      # MODIFY: Sync canonical events
└── multiverse/
    ├── MultiverseCoordinator.ts  # Existing
    └── PassageManager.ts         # NEW: Passage management

packages/renderer/src/panels/
├── UniverseBrowserPanel.ts    # NEW: Browse universes
└── TimelineBrowserPanel.ts    # NEW: Browse timeline
```
