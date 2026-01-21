# API Namespace Migration Plan

## Current State

### Two Servers

| Port | Server | Role | Lines |
|------|--------|------|-------|
| **8766** | metrics-server.ts | Game runtime, LLM, sprites, planets, admin | ~8500 |
| **3001** | api-server.ts | Multiverse, souls, universes | ~200 |

### Problem
Both use `/api/*` namespace with no clear separation. This causes:
- Confusion about which server handles what
- Potential routing conflicts if servers are consolidated
- PlanetClient pointing to wrong port initially returned endpoint docs

## Proposed Solution

### Option A: Keep Two Servers, Distinct Namespaces (Recommended)

**Port 8766 (metrics-server) - Game Runtime:**
```
/api/game/*     - Live game queries (was /api/live/*)
/api/actions/*  - Game actions (unchanged)
/api/llm/*      - LLM queue (unchanged)
/api/planets/*  - Planet sharing (was /api/planet*)
/api/sprites/*  - Sprite generation (unchanged)
/api/pixellab/* - PixelLab daemon (unchanged)
/api/headless/* - Headless games (unchanged)
/api/server/*   - Game server management (was /api/game-server/*)
/api/saves/*    - Save/load/fork (was /api/save*)
/api/canon/*    - Canon events (unchanged)
/api/microgen/* - Microgen/riddles (unchanged)
/api/animations/* - Animation queue (unchanged)
/dashboard/*    - LLM-friendly dashboards
/admin/*        - Admin interface
/metrics/*      - Raw metrics
```

**Port 3001 (api-server) - Persistence & Multiverse:**
```
/api/multiverse/*  - Universe management
  /api/multiverse/universes     - List universes
  /api/multiverse/universe/:id  - CRUD operations
  /api/multiverse/snapshots/*   - Snapshot management
  /api/multiverse/passages/*    - Inter-universe passages
  /api/multiverse/players/*     - Player management
  /api/multiverse/stats         - Multiverse statistics

/api/souls/*       - Soul repository
  /api/souls           - List souls
  /api/souls/:id       - Get soul
  /api/souls/save      - Save soul
  /api/souls/stats     - Repository stats
  /api/souls/sprite    - Generate soul sprite

/api/species/*     - Alien species
  /api/species         - List species
  /api/species/save    - Save species
  /api/species/sprite  - Generate sprite
```

## Migration Steps

### Phase 1: Rename with Backwards Compatibility

1. **Add new routes alongside old ones**
   - `/api/live/*` → also available at `/api/game/*`
   - `/api/planet*` → also available at `/api/planets/*`
   - `/api/save*` → also available at `/api/saves/*`
   - `/api/game-server/*` → also available at `/api/server/*`

2. **Add deprecation warnings to old routes**
   ```typescript
   if (pathname.startsWith('/api/live/')) {
     console.warn('[DEPRECATED] Use /api/game/* instead of /api/live/*');
   }
   ```

3. **Update client code to use new routes**
   - PlanetClient.ts
   - saveLoadService
   - Any other API clients

### Phase 2: Update API Server (3001)

1. **Reorganize universe routes under /api/multiverse/**
   - `/api/universe/*` → `/api/multiverse/universe/*`

2. **Reorganize soul routes under /api/souls/**
   - `/api/save-soul` → `/api/souls/save`
   - `/api/soul-repository/stats` → `/api/souls/stats`

3. **Reorganize species routes under /api/species/**
   - `/api/save-alien-species` → `/api/species/save`
   - `/api/alien-species` → `/api/species`

### Phase 3: Remove Deprecated Routes

After confirming all clients use new routes:
1. Remove old route handlers
2. Update documentation

## Files to Modify

### Server Side
- `scripts/metrics-server.ts` - Add new route aliases, deprecation warnings
- `demo/src/api-server.ts` - Reorganize routes under new namespaces
- `demo/src/universe-api.ts` - Update route definitions

### Client Side
- `packages/persistence/src/PlanetClient.ts` - Update baseUrl handling
- `packages/persistence/src/saveLoadService.ts` - Update API paths
- `demo/src/main.ts` - Update any direct API calls
- `demo/vite.config.ts` - Update proxy routes

## Timeline

1. **Immediate**: Fix current `/api/planets` issue (DONE - added `?? []`)
2. **Phase 1**: Add new routes with backwards compatibility
3. **Phase 2**: Update all clients
4. **Phase 3**: Remove deprecated routes (after 2 weeks)

## Testing Checklist

- [ ] `/api/planets` returns planet list
- [ ] `/api/game/status` returns game status
- [ ] `/api/multiverse/universes` returns universe list
- [ ] `/api/souls` returns soul list
- [ ] All deprecated routes still work with warnings
- [ ] Browser console shows no errors on game load
