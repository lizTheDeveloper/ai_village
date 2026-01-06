# Hierarchical Abstraction Simulator

Standalone prototype for testing the 7-tier hierarchical abstraction system for ringworld economies.

## What This Is

This is a **separate testing ground** for the hierarchical abstraction layer that will eventually be integrated into the main game. It lets you:

- Visualize the 7-tier hierarchy (Gigasegment → Megasegment → Sub-section → Region → Zone → Chunk → Tile)
- See population dynamics across tiers
- Monitor production/consumption economics
- Test abstraction vs active simulation modes
- Tweak parameters before integrating into main game

## 7-Tier Hierarchy

1. **Gigasegment** (10^15 km²) - 10-100 billion population - Luxury goods exchange, inter-ringworld trade
2. **Megasegment** (10^13 km²) - 100M-1B population - Planet-city scale, transport hubs
3. **Sub-section** (10^10 km²) - 10M-500M population - Planet-sized regions
4. **Region** (10^8 km²) - 100K-10M population - District scale
5. **Zone** (10^5 km²) - 1K-100K population - Building cluster
6. **Chunk** (3 km²) - 10-1K population - **FULL ECS SIMULATION**
7. **Tile** (9 m²) - 0-10 population - Individual physics

## Running

```bash
cd custom_game_engine/packages/hierarchy-simulator
npm install
npm run dev
```

Opens on **http://localhost:3031**

## Features

### Interactive Tree
- Click nodes to view details
- See population, mode (abstract/active), and stats
- Drill down through hierarchy levels

### Real-time Simulation
- Population growth/decline
- Production/consumption rates
- Trade balance calculations
- Resource stockpiles

### Graphs
- Population over time
- Production vs Consumption
- Trade flow volume
- Economic efficiency

### Controls
- **Pause/Resume** - Stop/start simulation
- **Speed** - 1x, 10x, 100x simulation speed
- **Reset** - Generate new hierarchy

## Architecture

```
src/
├── abstraction/
│   ├── types.ts              # Core types and interfaces
│   ├── AbstractTierBase.ts   # Base class for all tiers
│   ├── AbstractGigasegment.ts
│   └── AbstractMegasegment.ts
├── mock/
│   └── DataGenerator.ts      # Generate test hierarchies
├── ui/
│   └── (future) UI components
└── main.ts                    # Entry point, charts, UI logic
```

## Integration Plan

Once we're happy with the abstraction logic:

1. Import abstraction classes into main game
2. Create realm-based gigasegments/megasegments
3. Replace mock data with real ECS entities for chunks
4. Connect trade routes to passage system
5. Integrate with save/timeline system

## Drop-in Ready

This package imports `@ai-village/core` types, so the abstraction tier classes can be used directly in the main game without modification.

## Future Enhancements

- [ ] Drag-and-drop trade route creation
- [ ] Manual activate/deactivate tiers
- [ ] Export/import hierarchy configurations
- [ ] Cultural identity visualization
- [ ] Diplomatic relations graph
- [ ] Phenomenon event timeline
