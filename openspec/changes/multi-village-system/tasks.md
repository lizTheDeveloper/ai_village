# Tasks: multi-village-system

## Overview
Implement multi-village simulation with abstraction layers, trade routes, caravans, news propagation, and world map UI.

**Estimated Effort:** 40-55 hours | **Phase:** 15 (Multi-Village & Inter-Village Trade)

## Phase 1: Village Component & Abstraction (5-6 hours)

- [ ] Create `VillageComponent.ts` in `packages/core/src/components/`
  - [ ] Name, position (x, y on world map)
  - [ ] Abstraction level enum (detailed, summary, statistical)
  - [ ] Population, resources, government type
- [ ] Implement summary generation (aggregate agents -> statistics)
  - [ ] Calculate population count
  - [ ] Calculate average mood
  - [ ] Sum resource totals
  - [ ] Store government state
- [ ] Implement recreation from summary (spawn agents from stats)
  - [ ] Generate agents matching statistics
  - [ ] Restore resource state
  - [ ] Restore government state
- [ ] Test abstraction switching (detailed <-> summary <-> statistical)
  - [ ] Switch detailed village to summary
  - [ ] Verify agents aggregated
  - [ ] Switch back and verify recreation

## Phase 2: Village Summary System (4-5 hours)

- [ ] Create `VillageSummarySystem.ts` in `packages/core/src/systems/`
  - [ ] System priority and registration
  - [ ] Run for summary/statistical villages each tick
- [ ] Update summary each tick for statistical villages
  - [ ] Simulate population changes
  - [ ] Simulate resource production/consumption
  - [ ] Simulate mood changes
- [ ] Track: population, avgMood, resources, government
- [ ] Store recent events (births, deaths, constructions)
- [ ] Test summary updates correctly

## Phase 3: Trade Route System (5-6 hours)

- [ ] Create `TradeRouteComponent.ts` in `packages/core/src/components/`
  - [ ] Source and destination village IDs
  - [ ] Distance calculation
  - [ ] Safety rating (bandit risk, terrain)
  - [ ] Trade agreement (exports/imports)
- [ ] Implement route establishment (link two villages)
- [ ] Calculate distance
  - [ ] Euclidean or pathfinding based
  - [ ] Convert to travel time
- [ ] Define trade agreements
  - [ ] What village A exports to B
  - [ ] What village A imports from B
  - [ ] Price agreements
- [ ] Test route creation
  - [ ] Create route between two villages
  - [ ] Verify distance calculated
  - [ ] Verify agreement stored

## Phase 4: Caravan System (6-8 hours)

- [ ] Create `CaravanComponent.ts` in `packages/core/src/components/`
  - [ ] Cargo manifest (items being transported)
  - [ ] Current position on route
  - [ ] Source and destination
  - [ ] Travel progress
- [ ] Create `CaravanSystem.ts` in `packages/core/src/systems/`
  - [ ] Move caravans along routes each tick
  - [ ] Handle arrival at destination
- [ ] Implement caravan spawning with cargo
  - [ ] Create caravan entity
  - [ ] Load cargo from source village
- [ ] Travel along routes (multi-day journeys)
  - [ ] Update position each tick
  - [ ] Calculate arrival time
- [ ] Handle random events (bandits, weather)
  - [ ] Roll for random events
  - [ ] Apply effects (cargo loss, delay)
- [ ] Arrival and cargo unloading
  - [ ] Transfer cargo to destination
  - [ ] Update destination market
  - [ ] Optionally return with new cargo
- [ ] Test full caravan lifecycle
  - [ ] Spawn caravan with cargo
  - [ ] Travel to destination
  - [ ] Verify cargo delivered

## Phase 5: News Propagation (4-5 hours)

- [ ] Create `NewsItem` type in `packages/core/src/types/News.ts`
  - [ ] Type, description, source village, timestamp
  - [ ] Propagation state (villages reached)
- [ ] Create `NewsPropagationSystem.ts` in `packages/core/src/systems/`
  - [ ] Process news items each tick
  - [ ] Spread news to connected villages
- [ ] Determine propagation radius
  - [ ] Closer villages hear sooner
  - [ ] Trade routes speed propagation
- [ ] Delay news arrival by distance
  - [ ] Calculate delay based on distance
  - [ ] Queue arrival notification
- [ ] Notify villages when news arrives
  - [ ] Add news to village's known news
  - [ ] Trigger agent reactions
- [ ] Test news spreading
  - [ ] Create event in village A
  - [ ] Verify village B receives news after delay
  - [ ] Verify village C receives news later

## Phase 6: Village Map UI (8-10 hours)

- [ ] Create `WorldMapPanel.ts` in `packages/renderer/src/`
  - [ ] Canvas-based world map
  - [ ] Scale and pan controls
- [ ] Render villages as icons on 2D map
  - [ ] Different icons by village size/type
  - [ ] Color coding by status
- [ ] Draw trade routes as lines
  - [ ] Line style indicates route type
  - [ ] Show route safety
- [ ] Render caravans as moving dots
  - [ ] Animate along routes
  - [ ] Show cargo preview on hover
- [ ] Click village -> summary panel or zoom
  - [ ] Click detailed village -> camera zoom
  - [ ] Click summary village -> info panel
- [ ] Add status color coding (thriving/struggling)
  - [ ] Green: thriving
  - [ ] Yellow: stable
  - [ ] Orange: struggling
  - [ ] Red: collapsing
- [ ] Test UI rendering
  - [ ] Multiple villages display
  - [ ] Routes connect correctly
  - [ ] Caravans animate

## Phase 7: Inter-Village Resource Flow (4-5 hours)

- [ ] Deduct resources from exporter
  - [ ] When caravan departs
  - [ ] Verify sufficient resources
- [ ] Add resources on caravan arrival
  - [ ] Transfer cargo to destination
  - [ ] Add to destination storage
- [ ] Update market prices
  - [ ] Increased supply -> lower price
  - [ ] Decreased supply -> higher price
- [ ] Track trade balance
  - [ ] Imports vs exports per village
  - [ ] Calculate gold flow
- [ ] Test resource flow
  - [ ] Export 100 food
  - [ ] Verify source loses food
  - [ ] Verify destination gains food
  - [ ] Verify prices adjust

## Phase 8: Village Lifecycle (3-4 hours)

- [ ] Implement village growth
  - [ ] Population increase triggers
  - [ ] Resource abundance effects
- [ ] Implement village collapse
  - [ ] Population = 0 triggers collapse
  - [ ] Convert to ruin entity
- [ ] Create ruin system
  - [ ] Ruins are historical markers
  - [ ] Explorable for loot/lore
- [ ] Allow village founding
  - [ ] Player or NPC settlers
  - [ ] Initial resources required
- [ ] Support revival
  - [ ] New settlers can revive ruins
  - [ ] Gradual rebuilding
- [ ] Test lifecycle events
  - [ ] Village grows from 50 to 100
  - [ ] Village collapses from famine
  - [ ] New village founded
  - [ ] Ruin revived

## Testing

### Unit Tests
- [ ] Test summary generation (agents -> statistics)
- [ ] Test distance calculation (village A -> village B)
- [ ] Test news propagation delay
- [ ] Test trade balance calculation

### Integration Tests
- [ ] Test full trade cycle (export -> caravan -> arrival -> market update)
- [ ] Test village abstraction switch (detailed -> summary -> detailed)
- [ ] Test news spreading (event in A -> heard in B, C, D)

### Manual Scenarios
- [ ] Trade Network: 5 villages connected by routes, caravans traveling
- [ ] Village Collapse: Famine causes village to collapse
- [ ] News Spread: War in village A -> news reaches all villages
- [ ] Founding: New village founded by settlers

### Performance Requirements
- [ ] Summary update: < 1ms per summary village per tick
- [ ] Caravan movement: < 0.5ms per caravan per tick
- [ ] Map rendering: 60 FPS with 100 villages visible
- [ ] News propagation: < 10ms per event spread
