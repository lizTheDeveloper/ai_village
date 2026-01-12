# Dashboard Views

Unified view definitions for both player UI (canvas) and LLM dashboard (HTTP/curl). Each view implements `DashboardView<TData>` with data fetching and dual rendering.

## Architecture

**View Definition Pattern:**
```typescript
export const MyView: DashboardView<MyViewData> = {
  id: 'my-view',
  title: 'My View',
  category: 'economy',
  getData(context): MyViewData { /* Query world/metrics */ },
  textFormatter(data): string { /* Format for curl */ },
  canvasRenderer(ctx, data, bounds, theme): void { /* Render to canvas */ },
};
```

**Auto-registration**: Views register on module import via `index.ts`. Access via `viewRegistry.get('view-id')`.

## View Categories

- **info**: Agent, Animal, Plant, Tile Inspector - entity inspection
- **economy**: Resources, Economy, Shop, Crafting - village economy
- **social**: Population, Relationships, Memory, Governance - agent interactions
- **magic**: Magic Systems, Spellbook - paradigms and spells
- **divinity**: Divine Powers, Prayers, Vision Composer, Angels, Mythology, Pantheon, Deity Identity - god gameplay
- **farming**: Plant Info - botany subsystem
- **animals**: Animal Info - animal husbandry
- **environment**: Weather - environmental state
- **parasitic**: Parasitic Hive Mind - hive entity control
- **settings**: Settings, Controls - configuration
- **dev**: Dev View - debug tools

## Data Flow

1. **getData()**: Query `ViewContext.world` (live) or `ViewContext.sessionMetrics` (historical)
2. **textFormatter()**: Convert data to plain text (LLM dashboard at `/dashboard/view/{id}`)
3. **canvasRenderer()**: Draw data to canvas (player UI panels)

**ViewData requirements**: All data types extend `ViewData` with `timestamp`, `available`, `unavailableReason`.

## Creating New Views

1. Define data interface extending `ViewData`
2. Implement `DashboardView<YourData>` with getData + formatters
3. Export from `index.ts` and add to `builtInViews` array
4. Add ID to appropriate `viewsByCategory` entry

See `ResourcesView.ts`, `AgentInfoView.ts`, `MagicSystemsView.ts` for examples.
