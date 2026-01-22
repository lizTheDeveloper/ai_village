# API Namespace Migration Plan

## Migration Status

| Phase | Status | Description |
|-------|--------|-------------|
| **Phase 1** | ✅ COMPLETE | metrics-server namespace aliasing + client migration |
| **Phase 2** | ✅ COMPLETE | api-server namespace aliasing (superseded by Phase 3) |
| **Phase 3** | ✅ COMPLETE | Remove deprecated routes, rename handlers to new paths |

## Architecture

### Two Servers

| Port | Server | Role | Lines |
|------|--------|------|-------|
| **8766** | metrics-server.ts | Game runtime, LLM, sprites, planets, admin | ~8500 |
| **3001** | api-server.ts | Multiverse, souls, universes | ~200 |

### Original Problem
Both used `/api/*` namespace with no clear separation. This caused:
- Confusion about which server handles what
- Potential routing conflicts if servers are consolidated
- PlanetClient pointing to wrong port initially returned endpoint docs

## Namespace Design

### Port 8766 (metrics-server) - Game Runtime ✅

```
/api/game/*     - Live game queries (NEW, maps to /api/live/*)
/api/actions/*  - Game actions (unchanged)
/api/llm/*      - LLM queue (unchanged)
/api/planets/*  - Planet sharing (NEW, maps to /api/planet/*)
/api/sprites/*  - Sprite generation (unchanged)
/api/pixellab/* - PixelLab daemon (unchanged)
/api/headless/* - Headless games (unchanged)
/api/server/*   - Game server management (NEW, maps to /api/game-server/*)
/api/saves/*    - Save/load/fork (NEW, maps to /api/save/*)
/api/canon/*    - Canon events (unchanged)
/api/microgen/* - Microgen/riddles (unchanged)
/api/animations/* - Animation queue (unchanged)
/dashboard/*    - LLM-friendly dashboards
/admin/*        - Admin interface
/metrics/*      - Raw metrics
```

### Port 3001 (api-server) - Persistence & Multiverse ✅

```
/api/multiverse/*  - Universe/multiverse operations
  POST   /api/multiverse/universe      - Create universe
  GET    /api/multiverse/universe/:id  - Get universe
  DELETE /api/multiverse/universe/:id  - Delete universe
  GET    /api/multiverse/universes     - List universes
  POST   /api/multiverse/passage       - Create passage
  GET    /api/multiverse/passages      - List passages
  POST   /api/multiverse/player        - Register player
  GET    /api/multiverse/player/:id    - Get player
  GET    /api/multiverse/stats         - Multiverse statistics

/api/souls/*  - Soul repository (eternal storage)
  POST /api/souls/save    - Save soul
  GET  /api/souls/stats   - Repository stats
  POST /api/souls/sprite  - Generate soul sprite

/api/species/*  - Alien species database
  GET  /api/species        - List species
  POST /api/species/save   - Save species
  POST /api/species/sprite - Generate sprite
```

All handlers use these canonical paths directly (no aliasing).

## Phase 1: metrics-server ✅ COMPLETE

### Implementation Details

Added namespace aliasing in `scripts/metrics-server.ts` (line ~4484):

```typescript
// Route aliasing: NEW namespace → OLD namespace (silent, for new clients)
const namespaceAliases: Array<[string, string]> = [
  ['/api/game/', '/api/live/'],           // Live game queries
  ['/api/planets/', '/api/planet/'],       // Planet subpaths (/:id/*, stats, etc.)
  ['/api/saves/', '/api/save/'],           // Save/load/fork subpaths
  ['/api/server/', '/api/game-server/'],   // Game server management
];

for (const [newPrefix, oldPrefix] of namespaceAliases) {
  if (pathname.startsWith(newPrefix)) {
    pathname = oldPrefix + pathname.slice(newPrefix.length);
    break;
  }
}
```

### Client Files Migrated

**Admin Capabilities (21 files, 105 replacements):**
- `/api/live/` → `/api/game/` in all files under `packages/core/src/admin/capabilities/`

**Other Client Files:**
- `packages/persistence/src/PlanetClient.ts` - Uses `/api/planets/` for queries
- `packages/llm/src/ProxyLLMProvider.ts` - Uses `/api/game/status`
- `packages/core/src/admin/HtmlRenderer.ts` - Uses `/api/game/status`
- `packages/renderer/src/__tests__/MetricsIntegration.test.ts` - 18 replacements
- `scripts/test-rebellion.ts` - 2 replacements

**Total: 127+ replacements across 25+ files**

### Known Behaviors

1. `GET /api/planets` returns planet list (no aliasing needed - exact match works)
2. `POST /api/planet` creates a planet (handler location, used by PlanetClient)
3. `GET /api/planets/:id` aliased to `/api/planet/:id` (subpath rewriting)

## Phase 2: api-server ✅ COMPLETE (superseded by Phase 3)

Phase 2 added namespace aliasing middleware. Since we're not live, this was immediately
superseded by Phase 3 which removed the aliasing and renamed handlers directly.

## Phase 3: api-server Direct Rename ✅ COMPLETE

### Implementation Details

Removed aliasing middleware entirely. Renamed all handlers in `demo/src/api-server.ts`
to use new canonical paths directly:

```typescript
// Soul routes - direct handlers at new paths
app.post('/api/souls/save', async (req, res) => { ... });
app.get('/api/souls/stats', (req, res) => { ... });
app.post('/api/souls/sprite', async (req, res) => { ... });

// Species routes - direct handlers at new paths
app.post('/api/species/sprite', generateSprite);
app.post('/api/species/save', saveAlienSpecies);
app.get('/api/species', getAllAlienSpecies);

// Universe/Multiverse routes - router mounted at /api/multiverse
const universeRouter = createUniverseApiRouter();
app.use('/api/multiverse', universeRouter);
```

### Client Files Updated (all old routes removed)

| File | Changes |
|------|---------|
| `demo/src/main.ts` | 4 route updates |
| `packages/core/src/admin/capabilities/saves.ts` | 3 route updates |
| `packages/persistence/src/MultiverseClient.ts` | 20 endpoint updates |
| `packages/core/src/persistence/SaveLoadService.ts` | 4 route updates |
| `packages/renderer/src/UniverseBrowserScreen.ts` | 6 route updates |
| `packages/persistence/SNAPSHOT_DECAY.md` | 3 doc updates |
| `demo/vite.config.ts` | Proxy routes updated to `/api/species`, `/api/souls`, `/api/multiverse` |

### Old → New Route Mapping (for reference)

| Old Route | New Route |
|-----------|-----------|
| `/api/save-soul` | `/api/souls/save` |
| `/api/soul-repository/stats` | `/api/souls/stats` |
| `/api/generate-soul-sprite` | `/api/souls/sprite` |
| `/api/alien-species` | `/api/species` |
| `/api/save-alien-species` | `/api/species/save` |
| `/api/generate-sprite` | `/api/species/sprite` |
| `/api/universe` | `/api/multiverse/universe` |
| `/api/universes` | `/api/multiverse/universes` |
| `/api/passage` | `/api/multiverse/passage` |
| `/api/passages` | `/api/multiverse/passages` |
| `/api/player` | `/api/multiverse/player` |

### metrics-server Phase 3 (pending)

The metrics-server (port 8766) still uses namespace aliasing from Phase 1:
- `/api/game/` → `/api/live/`
- `/api/planets/` → `/api/planet/`
- `/api/saves/` → `/api/save/`
- `/api/server/` → `/api/game-server/`

This can be cleaned up by renaming the actual handlers in `scripts/metrics-server.ts`
when ready (larger change, ~8500 line file).

## Testing Checklist

**metrics-server (Port 8766):**
- [x] `/api/planets` returns planet list
- [x] `/api/game/status` returns game status
- [x] All admin capability queries work with `/api/game/`

**api-server (Port 3001):**
- [x] `/api/multiverse/universes` returns universe list
- [x] `/api/multiverse/stats` returns multiverse stats
- [x] `/api/souls/stats` returns soul repository stats
- [x] `/api/species` returns alien species list

**General:**
- [x] Browser console shows no errors on game load
- [x] All clients use new canonical routes directly (no aliasing needed for api-server)
