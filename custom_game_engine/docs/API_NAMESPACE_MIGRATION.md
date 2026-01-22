# API Namespace Migration Plan

## Migration Status

| Phase | Status | Description |
|-------|--------|-------------|
| **Phase 1** | ✅ COMPLETE | metrics-server namespace aliasing + client migration |
| **Phase 2** | ✅ COMPLETE | api-server namespace aliasing |
| **Phase 3** | ⬜ PENDING | Remove deprecated routes (after 2 weeks) |

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

Old routes still work via aliasing (backwards compatible).

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

## Phase 2: api-server ✅ COMPLETE

### Implementation Details

Added namespace aliasing middleware in `demo/src/api-server.ts`:

```typescript
// Route aliasing: NEW namespace → OLD namespace
const namespaceAliases: Array<[string, string]> = [
  // Soul routes
  ['/api/souls/save', '/api/save-soul'],
  ['/api/souls/stats', '/api/soul-repository/stats'],
  ['/api/souls/sprite', '/api/generate-soul-sprite'],
  // Species routes
  ['/api/species/save', '/api/save-alien-species'],
  ['/api/species/sprite', '/api/generate-sprite'],
  ['/api/species', '/api/alien-species'],
  // Multiverse routes
  ['/api/multiverse/universes', '/api/universes'],
  ['/api/multiverse/universe/', '/api/universe/'],
  ['/api/multiverse/universe', '/api/universe'],
  ['/api/multiverse/passages', '/api/passages'],
  ['/api/multiverse/passage/', '/api/passage/'],
  ['/api/multiverse/passage', '/api/passage'],
  ['/api/multiverse/player/', '/api/player/'],
  ['/api/multiverse/player', '/api/player'],
];
```

### Route Mapping

**Soul Routes:**
| New Route | Old Route (aliased) |
|-----------|---------------------|
| `POST /api/souls/save` | `/api/save-soul` |
| `GET /api/souls/stats` | `/api/soul-repository/stats` |
| `POST /api/souls/sprite` | `/api/generate-soul-sprite` |

**Species Routes:**
| New Route | Old Route (aliased) |
|-----------|---------------------|
| `GET /api/species` | `/api/alien-species` |
| `POST /api/species/save` | `/api/save-alien-species` |
| `POST /api/species/sprite` | `/api/generate-sprite` |

**Multiverse Routes:**
| New Route | Old Route (aliased) |
|-----------|---------------------|
| `* /api/multiverse/universe/*` | `/api/universe/*` |
| `GET /api/multiverse/universes` | `/api/universes` |
| `* /api/multiverse/passage/*` | `/api/passage/*` |
| `GET /api/multiverse/passages` | `/api/passages` |
| `* /api/multiverse/player/*` | `/api/player/*` |
| `GET /api/multiverse/stats` | Already at correct path |

## Phase 3: Remove Deprecated Routes ⬜ PENDING

After 2 weeks of backwards compatibility:
1. Remove old route aliases in metrics-server
2. Remove old route handlers in api-server
3. Update documentation to show only new routes

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
- [x] Old routes still work via aliasing (backwards compatible)
