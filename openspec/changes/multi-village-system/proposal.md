# Proposal: Work Order: Multi-Village System

**Submitted By:** migration-script
**Date:** 2026-01-03
**Status:** Draft
**Complexity:** 5+ systems
**Priority:** TIER 2
**Source:** Migrated from agents/autonomous-dev/work-orders/multi-village-system

---

## Original Work Order

# Work Order: Multi-Village System

**Phase:** 15 (Multi-Village & Inter-Village Trade)
**Created:** 2026-01-02
**Status:** READY_FOR_IMPLEMENTATION
**Priority:** MEDIUM

---

## Spec Reference

- **Primary Spec:** [openspec/specs/world-system/abstraction-layers.md](../../../../openspec/specs/world-system/abstraction-layers.md)
- **Related Specs:**
  - [openspec/specs/economy-system/inter-village-trade.md](../../../../openspec/specs/economy-system/inter-village-trade.md)
  - [openspec/specs/agent-system/chroniclers.md](../../../../openspec/specs/agent-system/chroniclers.md) (news propagation)
- **Dependencies:**
  - ✅ Phase 12 (Economy) - Trading, currency, market events

---

## Context

Currently, the game simulates **one village in full detail**. Phase 15 adds:
- **Multiple villages** with varying levels of simulation detail
- **Trade routes** connecting villages
- **Caravans** transporting goods between villages
- **News propagation** (events spreading between villages)
- **Abstraction layers** (detailed → summary → statistics)

**Scalability Goal:** Simulate 1 detailed village + 10 summary villages + 100 statistical villages simultaneously.

---

## Requirements Summary

### Feature 1: Abstraction Layers
Three simulation levels:
1. **Detailed** - Full ECS simulation (all agents, all systems)
2. **Summary** - Aggregated statistics (population, resources, mood)
3. **Statistical** - Abstract numbers only (no individual agents)

### Feature 2: Village Summaries
High-level village state:
1. Population count, average mood, resource totals
2. Government type, leader name
3. Notable events (births, deaths, wars, festivals)
4. Economic indicators (GDP, trade balance)

### Feature 3: Trade Routes
Connections between villages:
1. Route definition (village A ↔ village B, distance, safety)
2. Caravans travel routes, transport goods
3. Trade agreements (export X, import Y)
4. Route hazards (bandits, weather, monsters)

### Feature 4: Caravans
Inter-village transport:
1. Caravan entities with cargo
2. Travel along trade routes (multi-day journeys)
3. Arrival updates destination market
4. Return trips (round-trip trade)

### Feature 5: News Propagation
Information spreading:
1. Events occur in village A
2. Chroniclers/travelers carry news to village B
3. News arrives delayed (days/weeks)
4. News affects reputation, alliances, decisions

### Feature 6: Map UI
World overview:
1. Show all villages on map
2. Trade routes as lines connecting villages
3. Caravans as moving dots on routes
4. Click village → zoom to detailed view or summary panel

---

## Acceptance Criteria

### Criterion 1: Village Entity with Abstraction Level
- **WHEN:** A village is created
- **THEN:** The system SHALL:
  1. Create VillageComponent with abstraction level (detailed, summary, statistical)
  2. Track village name, position (x, y on world map)
  3. Track population, resources, government type
  4. Support switching abstraction levels (detailed ↔ summary ↔ statistical)
- **Verification:**
  - Create village: `{name: "Greendale", abstractionLevel: "detailed", position: {x: 100, y: 200}}`
  - Village has full ECS simulation
  - Switch to summary → agents aggregated into statistics
  - Switch back to detailed → agents recreated from summary

### Criterion 2: Village Summary Generation
- **WHEN:** A detailed village switches to summary mode
- **THEN:** The system SHALL:
  1. Aggregate agent data (population, average mood, skill distribution)
  2. Aggregate resources (total food, wood, gold)
  3. Preserve government state (leader, laws)
  4. Store recent events (births, deaths, constructions)
  5. Destroy individual agent entities (free memory)
- **Verification:**
  - Detailed village with 50 agents
  - Switch to summary
  - Summary: `{population: 50, avgMood: 0.7, resources: {food: 500, wood: 200}}`
  - Agents destroyed (memory freed)
  - Summary updates each tick (population changes, resources change)

### Criterion 3: Trade Route Establishment
- **WHEN:** Two villages are connected
- **THEN:** The system SHALL:
  1. Create TradeRouteComponent linking villages
  2. Calculate distance (Euclidean or pathfinding)
  3. Set trade agreement (exports/imports)
  4. Determine route safety (bandit risk, terrain difficulty)
  5. Allow caravans to travel route
- **Verification:**
  - Create route: Greendale ↔ Rivertown
  - Distance: 500 tiles (5 day journey at caravan speed)
  - Agreement: Greendale exports food, imports tools
  - Safety: 0.9 (10% bandit risk)
  - Caravans can spawn on route

### Criterion 4: Caravan System
- **WHEN:** A caravan is dispatched
- **THEN:** The system SHALL:
  1. Create caravan entity with cargo
  2. Assign route (start village, end village)
  3. Travel along route (multi-day journey)
  4. Handle random events (bandits, weather)
  5. Arrive at destination, unload cargo, update market
- **Verification:**
  - Dispatch caravan from Greendale with 100 food
  - Caravan travels toward Rivertown (5 days)
  - Day 3: Random bandit encounter (10% chance)
  - Day 5: Arrives at Rivertown
  - Rivertown market: +100 food

### Criterion 5: News Propagation System
- **WHEN:** An event occurs in a village
- **THEN:** The system SHALL:
  1. Create NewsItem (description, source village, timestamp)
  2. Determine propagation radius (nearby villages hear first)
  3. Delay news arrival (distance/travel time)
  4. Notify destination village when news arrives
  5. Affect village reputation/relationships
- **Verification:**
  - Greendale: Major fire event
  - NewsItem: `{type: "disaster", description: "Fire destroys bakery", source: "Greendale"}`
  - Rivertown (distance 500): Hears news 5 days later
  - Rivertown residents: "I heard Greendale had a terrible fire!"
  - Reputation: Greendale sympathy +0.1

### Criterion 6: Village Map UI
- **WHEN:** The player opens the world map
- **THEN:** The system SHALL:
  1. Display all villages as icons on 2D map
  2. Draw trade routes as lines between villages
  3. Show caravans as moving dots on routes
  4. Allow click on village → open summary panel or zoom to village
  5. Show village status (color coding: thriving, stable, struggling, collapsed)
- **Verification:**
  - Map shows 3 villages: Greendale, Rivertown, Stonekeep
  - Trade routes: Greendale ↔ Rivertown, Rivertown ↔ Stonekeep
  - 2 caravans visible (dots on routes)
  - Click Greendale → summary panel appears
  - Greendale status: Green (thriving)

### Criterion 7: Inter-Village Resource Flow
- **WHEN:** Villages trade goods
- **THEN:** The system SHALL:
  1. Deduct resources from exporting village
  2. Add resources to importing village (on caravan arrival)
  3. Update market prices (supply/demand)
  4. Track trade balance (imports vs exports)
  5. Affect village wealth
- **Verification:**
  - Greendale exports 100 food to Rivertown
  - Greendale: food -= 100
  - Caravan arrives in 5 days
  - Rivertown: food += 100
  - Rivertown food price drops (increased supply)
  - Greendale trade balance: -100 food, +50 gold (payment)

### Criterion 8: Village Lifecycle Management
- **WHEN:** Villages grow or decline
- **THEN:** The system SHALL:
  1. Villages can grow (population increases, more resources)
  2. Villages can collapse (population = 0, abandoned)
  3. New villages can be founded (player or NPC-driven)
  4. Collapsed villages become ruins (historical markers)
  5. Villages can be revived (new settlers)
- **Verification:**
  - Greendale population grows: 50 → 100 (thriving)
  - Stonekeep population declines: 30 → 0 (famine)
  - Stonekeep becomes ruin
  - New village founded: Newtown (settlers from Greendale)
  - Stonekeep revived: New settlers arrive, population = 10

---

## Implementation Steps

1. **Village Component & Abstraction** (5-6 hours)
   - Create VillageComponent
   - Add abstraction level enum (detailed, summary, statistical)
   - Implement summary generation (aggregate agents)
   - Implement recreation from summary (spawn agents from statistics)

2. **Village Summary System** (4-5 hours)
   - Create VillageSummarySystem
   - Update summary each tick (statistical villages)
   - Track population, resources, mood
   - Store recent events

3. **Trade Route System** (5-6 hours)
   - Create TradeRouteComponent
   - Implement route establishment (link villages)
   - Calculate distance and safety
   - Define trade agreements

4. **Caravan System** (6-8 hours)
   - Create CaravanComponent
   - Implement caravan spawning
   - Travel along routes (pathfinding)
   - Handle random events (bandits, weather)
   - Arrival and cargo unloading

5. **News Propagation** (4-5 hours)
   - Create NewsItem type
   - Implement NewsPropagationSystem
   - Determine propagation radius
   - Delay news arrival by distance
   - Notify villages

6. **Village Map UI** (8-10 hours)
   - Create world map canvas
   - Render villages as icons
   - Draw trade routes as lines
   - Render caravans as moving dots
   - Implement click → summary panel
   - Add status color coding

7. **Inter-Village Resource Flow** (4-5 hours)
   - Deduct resources from exporter
   - Add resources on caravan arrival
   - Update market prices
   - Track trade balance

8. **Village Lifecycle** (3-4 hours)
   - Implement village growth
   - Implement village collapse
   - Create ruin system
   - Allow village founding
   - Support revival

---

## Testing Plan

### Unit Tests
- Test summary generation (agents → statistics)
- Test distance calculation (village A → village B)
- Test news propagation delay
- Test trade balance calculation

### Integration Tests
- Test full trade cycle (export → caravan → arrival → market update)
- Test village switch (detailed → summary → detailed)
- Test news spreading (event in A → heard in B, C, D)

### Scenario Tests
1. **Trade Network**: 5 villages connected by routes, caravans traveling
2. **Village Collapse**: Famine causes Stonekeep to collapse
3. **News Spread**: War in Greendale → news reaches all villages
4. **Founding**: New village founded by settlers from Greendale

---

## Performance Requirements

- **Summary Update**: < 1ms per summary village per tick
- **Caravan Movement**: < 0.5ms per caravan per tick
- **Map Rendering**: 60 FPS with 100 villages visible
- **News Propagation**: < 10ms per event spread

---

## Success Metrics

1. ✅ All 8 acceptance criteria met
2. ✅ Can simulate 1 detailed + 10 summary + 100 statistical villages
3. ✅ Trade routes and caravans work correctly
4. ✅ News propagates between villages
5. ✅ Map UI displays villages, routes, caravans
6. ✅ Performance within budget

---

## Dependencies

- ✅ Phase 12 (Economy) - Trading, market prices
- ⚠️ PathfindingSystem (may need long-distance pathfinding)
- ⚠️ ChroniclerSystem (news propagation) - can be simple initially

---

## Future Enhancements (Not in This Work Order)

- Diplomacy between villages (alliances, treaties, wars)
- Village specialization (mining village, farming village, port city)
- Trade guilds (cross-village merchant organizations)
- Migration (agents move between villages)
- Regional governments (villages form kingdoms/empires)

---

## Notes

- Start with 2-3 villages to test mechanics
- Keep abstraction switching simple initially
- Focus on trade routes first, news propagation second
- Map UI is critical for player understanding
- Consider performance: summary villages should be very cheap

---

## Implementation Checklist

### Phase 1: Village Component & Abstraction (5-6 hours)
- [ ] Create VillageComponent in `packages/core/src/components/VillageComponent.ts`
- [ ] Add abstraction level enum (detailed, summary, statistical)
- [ ] Implement summary generation (aggregate agents → statistics)
- [ ] Implement recreation from summary (spawn agents from stats)
- [ ] Test abstraction switching (detailed ↔ summary ↔ statistical)

### Phase 2: Village Summary System (4-5 hours)
- [ ] Create VillageSummarySystem in `packages/core/src/systems/VillageSummarySystem.ts`
- [ ] Update summary each tick for statistical villages
- [ ] Track: population, avgMood, resources, government
- [ ] Store recent events (births, deaths, constructions)
- [ ] Test summary updates correctly

### Phase 3: Trade Route System (5-6 hours)
- [ ] Create TradeRouteComponent in `packages/core/src/components/TradeRouteComponent.ts`
- [ ] Implement route establishment (link two villages)
- [ ] Calculate distance and safety
- [ ] Define trade agreements (exports/imports)
- [ ] Test route creation

### Phase 4: Caravan System (6-8 hours)
- [ ] Create CaravanComponent in `packages/core/src/components/CaravanComponent.ts`
- [ ] Create CaravanSystem in `packages/core/src/systems/CaravanSystem.ts`
- [ ] Implement caravan spawning with cargo
- [ ] Travel along routes (multi-day journeys)
- [ ] Handle random events (bandits, weather)
- [ ] Arrival and cargo unloading
- [ ] Test full caravan lifecycle

### Phase 5: News Propagation (4-5 hours)
- [ ] Create NewsItem type in `packages/core/src/types/News.ts`
- [ ] Create NewsPropagationSystem in `packages/core/src/systems/NewsPropagationSystem.ts`
- [ ] Determine propagation radius
- [ ] Delay news arrival by distance
- [ ] Notify villages when news arrives
- [ ] Test news spreading

### Phase 6: Village Map UI (8-10 hours)
- [ ] Create WorldMapPanel in `packages/renderer/src/WorldMapPanel.ts`
- [ ] Render villages as icons on 2D map
- [ ] Draw trade routes as lines
- [ ] Render caravans as moving dots
- [ ] Click village → summary panel or zoom
- [ ] Add status color coding (thriving/struggling)
- [ ] Test UI rendering

### Phase 7: Inter-Village Resource Flow (4-5 hours)
- [ ] Deduct resources from exporter
- [ ] Add resources on caravan arrival
- [ ] Update market prices
- [ ] Track trade balance
- [ ] Test resource flow

### Phase 8: Village Lifecycle (3-4 hours)
- [ ] Implement village growth
- [ ] Implement village collapse
- [ ] Create ruin system
- [ ] Allow village founding
- [ ] Support revival
- [ ] Test lifecycle events

---

## Test Requirements

### Unit Tests
- [ ] Test summary generation (agents → statistics)
- [ ] Test distance calculation (village A → village B)
- [ ] Test news propagation delay
- [ ] Test trade balance calculation

### Integration Tests
- [ ] Test full trade cycle (export → caravan → arrival → market update)
- [ ] Test village abstraction switch (detailed → summary → detailed)
- [ ] Test news spreading (event in A → heard in B, C, D)

### Manual Scenarios
1. **Trade Network**: 5 villages, caravans traveling
2. **Village Collapse**: Famine causes village to collapse
3. **News Spread**: War in village A → news reaches all villages
4. **Founding**: New village founded by settlers

---

## Definition of Done

- [ ] All implementation tasks complete
- [ ] Can simulate 1 detailed + 10 summary + 100 statistical villages
- [ ] Trade routes and caravans work
- [ ] News propagates correctly
- [ ] Map UI displays villages, routes, caravans
- [ ] Unit tests passing
- [ ] Integration tests passing
- [ ] Manual scenarios tested
- [ ] Documentation updated
- [ ] No TypeScript errors
- [ ] Performance validated (summary update < 1ms per village)

---

## Pre-Test Checklist (N/A - Status: READY_FOR_IMPLEMENTATION)



---

## Requirements

### Requirement: [To be defined]

The system SHALL [requirement description].

#### Scenario: [Scenario name]

- WHEN [condition]
- THEN [expected result]

## Definition of Done

- [ ] Implementation complete
- [ ] Tests passing
- [ ] Documentation updated
