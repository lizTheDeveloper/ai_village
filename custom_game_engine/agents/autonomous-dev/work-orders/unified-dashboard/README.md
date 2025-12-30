# Work Order: Unified Dashboard System

## Summary

Implement a unified view definition layer that allows both the Player UI (canvas-based) and LLM Dashboard (HTTP/curl-based) to consume the same view definitions. When a new system is added, defining a single `DashboardView` automatically exposes it to both dashboards.

**Spec:** [`specs/unified-dashboard-system.md`](../../../specs/unified-dashboard-system.md)

---

## Phases

| Phase | Work Order | Dependencies | Parallelizable With |
|-------|------------|--------------|---------------------|
| 1 | [Core Infrastructure](./phase-1-core-infrastructure.md) | None | Nothing (must be first) |
| 2 | [Player UI Integration](./phase-2-player-ui-integration.md) | Phase 1 | Phase 3 |
| 3 | [LLM Dashboard Integration](./phase-3-llm-dashboard-integration.md) | Phase 1 | Phase 2 |
| 4 | [Panel Migration](./phase-4-migration.md) | Phase 2, Phase 3 | Nothing (must be last) |

---

## Execution Order

```
                    ┌─────────────────────┐
                    │   Phase 1: Core     │
                    │   Infrastructure    │
                    └──────────┬──────────┘
                               │
              ┌────────────────┼────────────────┐
              │                                 │
              ▼                                 ▼
┌─────────────────────────┐       ┌─────────────────────────┐
│  Phase 2: Player UI     │       │  Phase 3: LLM Dashboard │
│  Integration            │       │  Integration            │
└────────────┬────────────┘       └────────────┬────────────┘
             │                                  │
             └──────────────┬───────────────────┘
                            │
                            ▼
              ┌─────────────────────────┐
              │   Phase 4: Migration    │
              └─────────────────────────┘
```

**Phase 2 and Phase 3 can run in parallel** once Phase 1 is complete.

---

## Quick Start

### For Phase 1 Agent

```bash
# Start with Phase 1
cd custom_game_engine
cat agents/autonomous-dev/work-orders/unified-dashboard/phase-1-core-infrastructure.md
```

### For Parallel Agents (after Phase 1)

```bash
# Agent A: Player UI
cat agents/autonomous-dev/work-orders/unified-dashboard/phase-2-player-ui-integration.md

# Agent B: LLM Dashboard
cat agents/autonomous-dev/work-orders/unified-dashboard/phase-3-llm-dashboard-integration.md
```

---

## Expected Outcomes

After all phases complete:

1. **Single file to add a view**: Create `{ViewName}View.ts`, register, done
2. **Automatic dual-dashboard support**: Both player UI and curl work
3. **Type-safe data flow**: TypeScript catches mismatches
4. **Simplified main.ts**: `registerAllViews()` instead of 26+ registrations
5. **Full LLM access**: `curl http://localhost:8766/dashboard/views`

---

## Files Created

### Spec
- `specs/unified-dashboard-system.md` - Full technical specification

### Work Orders
- `phase-1-core-infrastructure.md` - Types, ViewRegistry, example views
- `phase-2-player-ui-integration.md` - ViewAdapter, WindowManager integration
- `phase-3-llm-dashboard-integration.md` - HTTP endpoints, curl access
- `phase-4-migration.md` - Migrate existing 26+ panels

---

## Estimated Scope

| Phase | New Files | Modified Files | Complexity |
|-------|-----------|----------------|------------|
| 1 | 6 | 1 | Low |
| 2 | 2 | 3 | Medium |
| 3 | 1 | 1 | Medium |
| 4 | 15+ views | 20+ deletions | High (but incremental) |

---

## Success Criteria

- [ ] Phase 1: ViewRegistry works, example views registered
- [ ] Phase 2: Views render in WindowManager
- [ ] Phase 3: Views accessible via curl
- [ ] Phase 4: All panels migrated, old code deleted
- [ ] Build passes: `npm run build`
- [ ] Tests pass: `npm run test`
