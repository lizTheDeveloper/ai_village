# API Namespace Migration Plan

## Migration Status

| Phase | Status | Description |
|-------|--------|-------------|
| **Phase 1** | ✅ COMPLETE | metrics-server namespace aliasing + client migration |
| **Phase 2** | ⬜ PENDING | api-server namespace reorganization |
| **Phase 3** | ⬜ PENDING | Remove deprecated routes |

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

### Port 3001 (api-server) - Persistence & Multiverse ⬜

**Current routes (to be migrated):**
```
/api/universe/*         → /api/multiverse/universe/*
/api/universes          → /api/multiverse/universes
/api/passage/*          → /api/multiverse/passage/*
/api/passages           → /api/multiverse/passages
/api/player/*           → /api/multiverse/player/*
/api/multiverse/stats   - Already correct!

/api/save-soul          → /api/souls/save
/api/soul-repository/*  → /api/souls/*
/api/generate-soul-sprite → /api/souls/sprite

/api/save-alien-species → /api/species/save
/api/alien-species      → /api/species
/api/generate-sprite    → /api/species/sprite
```

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

## Phase 2: api-server ⬜ PENDING

### Routes to Reorganize

**Soul Routes:**
| Old Route | New Route |
|-----------|-----------|
| `POST /api/save-soul` | `POST /api/souls/save` |
| `GET /api/soul-repository/stats` | `GET /api/souls/stats` |
| `POST /api/generate-soul-sprite` | `POST /api/souls/sprite` |

**Species Routes:**
| Old Route | New Route |
|-----------|-----------|
| `POST /api/save-alien-species` | `POST /api/species/save` |
| `GET /api/alien-species` | `GET /api/species` |
| `POST /api/generate-sprite` | `POST /api/species/sprite` |

**Universe/Multiverse Routes:**
| Old Route | New Route |
|-----------|-----------|
| `* /api/universe/*` | `* /api/multiverse/universe/*` |
| `GET /api/universes` | `GET /api/multiverse/universes` |
| `* /api/passage/*` | `* /api/multiverse/passage/*` |
| `GET /api/passages` | `GET /api/multiverse/passages` |
| `* /api/player/*` | `* /api/multiverse/player/*` |
| `GET /api/multiverse/stats` | ✅ Already correct |

### Files to Update

1. `demo/src/api-server.ts` - Add namespace aliasing middleware
2. `demo/src/universe-api.ts` - Update route definitions (or add aliasing)
3. Update any clients calling api-server directly

## Phase 3: Remove Deprecated Routes ⬜ PENDING

After 2 weeks of backwards compatibility:
1. Remove old route aliases in metrics-server
2. Remove old route handlers in api-server
3. Update documentation to show only new routes

## Testing Checklist

- [x] `/api/planets` returns planet list (metrics-server)
- [x] `/api/game/status` returns game status (metrics-server)
- [x] All admin capability queries work with `/api/game/`
- [ ] `/api/multiverse/universes` returns universe list (api-server - Phase 2)
- [ ] `/api/souls/save` saves souls (api-server - Phase 2)
- [ ] Browser console shows no errors on game load
