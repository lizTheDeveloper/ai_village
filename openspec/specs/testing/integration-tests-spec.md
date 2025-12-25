# Integration Testing Specification

**Status:** DRAFT
**Created:** 2024-12-24
**Priority:** HIGH
**Purpose:** Comprehensive integration testing coverage for all game systems

---

## Overview

This spec defines integration tests needed for all currently implemented systems. These tests verify that systems work together correctly, handling cross-system interactions, event flows, and state management.

**Integration tests differ from unit tests:**
- Unit tests: Single system in isolation
- Integration tests: Multiple systems working together, event chains, data flow

---

## Core Systems

### 1. AISystem + ActionQueue Integration
**File:** `packages/core/src/systems/__tests__/AISystem.integration.test.ts`

**Test Scenarios:**
- [ ] AI decides to build → ActionQueue processes build action → BuildingSystem creates building
- [ ] AI decides to gather → ActionQueue executes → ResourceGatheringSystem updates resources → Inventory updates
- [ ] AI decides to farm → ActionQueue chains till → plant → water actions
- [ ] AI decisions respect action queue capacity (max concurrent actions)
- [ ] AI behavior changes when action fails (no resources, blocked path)
- [ ] Rate limiting prevents LLM spam (60 tick cooldown enforced)

**Cross-System Dependencies:**
- ActionQueue
- BuildingSystem
- ResourceGatheringSystem
- InventorySystem
- MovementSystem

---

### 2. TimeSystem + WeatherSystem + TemperatureSystem
**File:** `packages/core/src/systems/__tests__/TimeWeatherTemperature.integration.test.ts`

**Test Scenarios:**
- [ ] Time progression triggers weather changes
- [ ] Weather affects temperature calculations
- [ ] Day/night cycle modifies temperature ranges
- [ ] Temperature system uses weather modifiers correctly
- [ ] Time speed multiplier affects all three systems proportionally
- [ ] Events emitted in correct order: time_changed → weather_changed → temperature_updated

**Cross-System Dependencies:**
- TimeSystem
- WeatherSystem
- TemperatureSystem
- EventBus

---

### 3. MovementSystem + SteeringSystem + NavigationSystem
**File:** `packages/core/src/systems/__tests__/MovementSteering.integration.test.ts`

**Test Scenarios:**
- [ ] SteeringSystem calculates forces → MovementSystem applies velocity
- [ ] Collision detection prevents invalid movement
- [ ] Fatigue penalties (from NeedsSystem) slow movement correctly
- [ ] Obstacle avoidance steers around buildings
- [ ] Pathfinding integrates with steering for smooth movement
- [ ] Agents stop moving when entering sleep state

**Cross-System Dependencies:**
- MovementSystem
- SteeringSystem
- NeedsSystem
- SleepSystem
- World/CollisionSystem

---

## Agent Needs & Health

### 4. NeedsSystem + SleepSystem + TemperatureSystem
**File:** `packages/core/src/systems/__tests__/NeedsSleepHealth.integration.test.ts`

**Test Scenarios:**
- [ ] Low energy triggers sleep drive increase
- [ ] Sleep recovers energy in NeedsSystem
- [ ] Hunger doesn't decay during sleep
- [ ] Temperature extremes increase needs decay rate
- [ ] Sleep quality affects energy recovery rate
- [ ] Wake conditions (danger, full energy) properly end sleep

**Cross-System Dependencies:**
- NeedsSystem
- SleepSystem
- TemperatureSystem
- HealthSystem
- EventBus

---

### 5. SleepSystem + TimeSystem + BuildingSystem
**File:** `packages/core/src/systems/__tests__/SleepBuilding.integration.test.ts`

**Test Scenarios:**
- [ ] Agents seek beds in buildings when tired
- [ ] Circadian rhythm aligns with day/night cycle
- [ ] Buildings provide sleep quality bonuses
- [ ] Dreams generate based on recent memories
- [ ] Agents leave beds at wake time
- [ ] Building occupancy tracked correctly during sleep

**Cross-System Dependencies:**
- SleepSystem
- TimeSystem
- BuildingSystem
- MemorySystem

---

## Building & Construction

### 6. BuildingSystem + ResourceGatheringSystem + InventorySystem
**File:** `packages/core/src/systems/__tests__/BuildingConstruction.integration.test.ts`

**Test Scenarios:**
- [ ] Building placement checks resource availability
- [ ] Construction consumes resources from inventory
- [ ] Resource gathering provides materials for construction
- [ ] Building completion unlocks crafting stations
- [ ] Fuel storage initialized correctly for furnaces/kilns
- [ ] Building destruction returns partial resources

**Cross-System Dependencies:**
- BuildingSystem
- ResourceGatheringSystem
- InventorySystem
- CraftingSystem
- EventBus

---

### 7. AnimalHousingSystem + AnimalSystem + BuildingSystem
**File:** `packages/core/src/systems/__tests__/AnimalHousing.integration.test.ts`

**Test Scenarios:**
- [ ] Animals assigned to housing buildings
- [ ] Housing occupancy limits enforced
- [ ] Cleanliness decay affects animal health
- [ ] Housing effects (warmth, protection) apply to animals
- [ ] Animal production boosted by good housing
- [ ] Animals leave housing when building destroyed

**Cross-System Dependencies:**
- AnimalHousingSystem
- AnimalSystem
- BuildingSystem
- AnimalProductionSystem

---

## Farming & Resources

### 8. SoilSystem + PlantSystem + WeatherSystem
**File:** `packages/core/src/systems/__tests__/FarmingComplete.integration.test.ts`

**Test Scenarios:**
- [ ] Tilling creates farmable soil
- [ ] Planting seeds requires tilled soil
- [ ] Rain increases soil moisture
- [ ] Plants consume soil nutrients over time
- [ ] Soil fertility affects plant growth rate
- [ ] Harvest depletes soil (plantings_remaining decrements)
- [ ] Weather (frost, drought) affects plants through soil

**Cross-System Dependencies:**
- SoilSystem
- PlantSystem
- WeatherSystem
- TimeSystem
- ActionQueue

---

### 9. PlantSystem + TimeSystem + SeedGatheringSystem
**File:** `packages/core/src/systems/__tests__/PlantLifecycle.integration.test.ts`

**Test Scenarios:**
- [ ] Plant stages progress with time
- [ ] Mature plants produce seeds
- [ ] Seed gathering action yields seeds to inventory
- [ ] Plant genetics affect seed quality
- [ ] Harvest action triggers seed production
- [ ] Wild plants vs cultivated plants have different yields

**Cross-System Dependencies:**
- PlantSystem
- TimeSystem
- SeedGatheringSystem
- InventorySystem
- ActionQueue

---

### 10. CraftingSystem + InventorySystem + BuildingSystem
**File:** `packages/core/src/systems/__tests__/CraftingComplete.integration.test.ts`

**Test Scenarios:**
- [ ] Crafting recipes check ingredient availability
- [ ] Crafting consumes ingredients from inventory
- [ ] Crafting adds products to inventory
- [ ] Crafting stations (workbench, furnace) required for specific recipes
- [ ] Fuel consumption for furnace recipes
- [ ] Crafting queue pauses when ingredients missing
- [ ] Crafting job completion time based on recipe

**Cross-System Dependencies:**
- CraftingSystem
- InventorySystem
- BuildingSystem
- TimeSystem

---

## Animal Systems

### 11. AnimalSystem + AnimalProductionSystem + AnimalHousingSystem
**File:** `packages/core/src/systems/__tests__/AnimalComplete.integration.test.ts`

**Test Scenarios:**
- [ ] Animal needs (hunger, thirst) affect production quality
- [ ] Housing quality modifies production rates
- [ ] Animal age affects production (juvenile = no production)
- [ ] Product generation follows species cooldowns
- [ ] Animal health impacts product quality
- [ ] Products added to building inventory or ground

**Cross-System Dependencies:**
- AnimalSystem
- AnimalProductionSystem
- AnimalHousingSystem
- InventorySystem

---

### 12. TamingSystem + AnimalSystem + InventorySystem
**File:** `packages/core/src/systems/__tests__/TamingComplete.integration.test.ts`

**Test Scenarios:**
- [ ] Feeding animals increases trust
- [ ] Trust accumulation over time (patience method)
- [ ] Successfully tamed animals become domesticated
- [ ] Taming consumes food from inventory
- [ ] Species difficulty affects taming success rate
- [ ] Taming progress persists across sessions

**Cross-System Dependencies:**
- TamingSystem
- AnimalSystem
- InventorySystem
- TimeSystem

---

### 13. WildAnimalSpawningSystem + World + AnimalSystem
**File:** `packages/core/src/systems/__tests__/AnimalSpawning.integration.test.ts`

**Test Scenarios:**
- [ ] Animals spawn in appropriate biomes
- [ ] Chunk generation triggers spawning
- [ ] Herds/flocks spawn together (social species)
- [ ] Spawn limits prevent overpopulation
- [ ] Spawned animals have correct species stats
- [ ] No duplicate spawning in same chunk

**Cross-System Dependencies:**
- WildAnimalSpawningSystem
- World/TerrainGenerator
- AnimalSystem

---

## Memory & Cognition

### 14. MemoryFormationSystem + MemorySystem + EventBus
**File:** `packages/core/src/systems/__tests__/MemoryComplete.integration.test.ts`

**Test Scenarios:**
- [ ] Game events trigger memory formation
- [ ] Memory strength decays over time
- [ ] Important events create stronger memories
- [ ] Forgotten memories (strength <= 0) removed
- [ ] Memory emotional intensity calculated correctly
- [ ] Survival-relevant events prioritized

**Cross-System Dependencies:**
- MemoryFormationSystem
- MemorySystem
- EventBus
- TimeSystem

---

### 15. MemoryConsolidationSystem + SleepSystem + MemorySystem
**File:** `packages/core/src/systems/__tests__/MemoryConsolidation.integration.test.ts`

**Test Scenarios:**
- [ ] Sleep triggers memory consolidation
- [ ] Recalled memories strengthen during consolidation
- [ ] Consolidation events properly processed
- [ ] Reflection events trigger consolidation
- [ ] Decay rates modified during sleep
- [ ] Dream content based on recent memories

**Cross-System Dependencies:**
- MemoryConsolidationSystem
- SleepSystem
- MemorySystem
- ReflectionSystem

---

### 16. SpatialMemoryQuerySystem + MemorySystem + ExplorationSystem
**File:** `packages/core/src/systems/__tests__/SpatialMemory.integration.test.ts`

**Test Scenarios:**
- [ ] Resource discoveries create spatial memories
- [ ] Spatial queries find remembered locations
- [ ] Memory indexing keeps episodic/spatial in sync
- [ ] Exploration reveals resources → memories formed
- [ ] Old spatial memories decay correctly
- [ ] Gradient hints update spatial memory

**Cross-System Dependencies:**
- SpatialMemoryQuerySystem
- MemorySystem
- ExplorationSystem
- ResourceGatheringSystem

---

### 17. BeliefFormationSystem + MemorySystem + SocialSystem
**File:** `packages/core/src/systems/__tests__/BeliefFormation.integration.test.ts`

**Test Scenarios:**
- [ ] Multiple observations form beliefs (3 observation threshold)
- [ ] Character patterns detected from social interactions
- [ ] World beliefs update from resource findings
- [ ] Social pattern beliefs affect trust
- [ ] Beliefs influence AI decision-making
- [ ] Beliefs decay without reinforcement

**Cross-System Dependencies:**
- BeliefFormationSystem
- MemorySystem
- CommunicationSystem
- AISystem

---

### 18. ReflectionSystem + MemorySystem + JournalingSystem
**File:** `packages/core/src/systems/__tests__/ReflectionJournaling.integration.test.ts`

**Test Scenarios:**
- [ ] Daily reflections triggered at sleep time
- [ ] Reflections create journal entries
- [ ] Personality traits affect reflection frequency
- [ ] Significant events trigger immediate reflections
- [ ] Reflections pull from episodic memories
- [ ] Journal entries persist and are readable

**Cross-System Dependencies:**
- ReflectionSystem
- MemorySystem
- JournalingSystem
- SleepSystem

---

## Social & Communication

### 19. CommunicationSystem + SocialGradientSystem + MemorySystem
**File:** `packages/core/src/systems/__tests__/CommunicationComplete.integration.test.ts`

**Test Scenarios:**
- [ ] Conversations share resource location hints
- [ ] Gradient information updates from speech
- [ ] Trust weights affect gradient reliability
- [ ] Conversation creates shared memories
- [ ] Conversation duration limits enforced
- [ ] Agents return to previous behavior after conversation

**Cross-System Dependencies:**
- CommunicationSystem
- SocialGradientSystem
- MemorySystem
- AISystem

---

### 20. VerificationSystem + SocialGradientSystem + TrustSystem
**File:** `packages/core/src/systems/__tests__/VerificationTrust.integration.test.ts`

**Test Scenarios:**
- [ ] Resource claims verified against actual world state
- [ ] Correct claims increase trust
- [ ] False claims decrease trust
- [ ] Stale claims reduce trust moderately
- [ ] Trust scores affect gradient weight
- [ ] Verification range (5 tiles) enforced

**Cross-System Dependencies:**
- VerificationSystem
- SocialGradientSystem
- World/ResourceSystem
- TrustNetwork

---

## Navigation & Exploration

### 21. ExplorationSystem + SteeringSystem + MemorySystem
**File:** `packages/core/src/systems/__tests__/ExplorationComplete.integration.test.ts`

**Test Scenarios:**
- [ ] Frontier exploration reveals new chunks
- [ ] Spiral exploration maps in expanding circles
- [ ] Exploration creates spatial memories
- [ ] Coverage milestones emit events
- [ ] Exploration radius scales with settlement size
- [ ] Steering navigates to exploration targets

**Cross-System Dependencies:**
- ExplorationSystem
- SteeringSystem
- MemorySystem
- World/ChunkSystem

---

## Full Game Loop Integration Tests

### 22. Complete Game Day Cycle
**File:** `packages/core/src/__tests__/GameDayCycle.integration.test.ts`

**Test Scenarios:**
- [ ] Agent wakes at dawn → gathers resources → crafts tools → builds shelter → eats dinner → sleeps at night
- [ ] Full needs cycle: hunger/thirst/energy rise and fall appropriately
- [ ] Weather changes affect agent behavior
- [ ] Temperature drives shelter-seeking
- [ ] Memory formation throughout day
- [ ] Reflections at bedtime
- [ ] All systems update in correct order

**Cross-System Dependencies:**
- ALL SYSTEMS

---

### 23. Farming Full Cycle
**File:** `packages/core/src/__tests__/FarmingFullCycle.integration.test.ts`

**Test Scenarios:**
- [ ] Agent tills soil → plants seeds → waters plants → waits for growth → harvests → gathers seeds → repeats
- [ ] Soil nutrients deplete over cycles
- [ ] Weather affects growth rates
- [ ] Inventory management throughout cycle
- [ ] Crafting stations used for seed processing
- [ ] Memory of farm locations persists

**Cross-System Dependencies:**
- SoilSystem
- PlantSystem
- ActionQueue
- AISystem
- InventorySystem
- WeatherSystem
- TimeSystem

---

### 24. Animal Husbandry Full Cycle
**File:** `packages/core/src/__tests__/AnimalHusbandryFullCycle.integration.test.ts`

**Test Scenarios:**
- [ ] Agent finds wild animal → tames over time → builds housing → assigns animal → feeds regularly → collects products → maintains cleanliness
- [ ] Animal lifecycle: juvenile → adult → elderly
- [ ] Production quality varies with care
- [ ] Housing capacity management
- [ ] Breeding and population growth
- [ ] Product collection and storage

**Cross-System Dependencies:**
- TamingSystem
- AnimalSystem
- AnimalHousingSystem
- AnimalProductionSystem
- BuildingSystem
- InventorySystem

---

### 25. Social Network Formation
**File:** `packages/core/src/__tests__/SocialNetworkFormation.integration.test.ts`

**Test Scenarios:**
- [ ] Agents meet → converse → share information → form opinions → build trust → collaborate
- [ ] Multiple conversations build relationships
- [ ] Resource hints shared and verified
- [ ] Trust affects future interactions
- [ ] Beliefs form from social patterns
- [ ] Memories of interactions persist

**Cross-System Dependencies:**
- CommunicationSystem
- SocialGradientSystem
- VerificationSystem
- BeliefFormationSystem
- MemorySystem
- AISystem

---

## Cross-Cutting Integration Tests

### 26. EventBus Propagation
**File:** `packages/core/src/__tests__/EventBusPropagation.integration.test.ts`

**Test Scenarios:**
- [ ] Event chains: action → completion → memory → belief → behavior change
- [ ] Event listeners across multiple systems receive events
- [ ] Event ordering maintained (time → weather → temperature)
- [ ] No dropped events under high load
- [ ] Event payload contains required fields
- [ ] Circular event dependencies don't cause infinite loops

**Cross-System Dependencies:**
- EventBus
- ALL event-emitting systems

---

### 27. Save/Load State Integrity
**File:** `packages/core/src/__tests__/SaveLoadIntegrity.integration.test.ts`

**Test Scenarios:**
- [ ] Save mid-construction → load → construction resumes
- [ ] Save with active crafting queue → load → crafting continues
- [ ] Save agent mid-conversation → load → conversation state restored
- [ ] Save plant mid-growth → load → growth continues
- [ ] Save memory state → load → memories intact
- [ ] Save animal taming progress → load → progress persists
- [ ] All system states serialize/deserialize correctly

**Cross-System Dependencies:**
- World save/load
- ALL systems with persistent state

---

### 28. Performance Under Load
**File:** `packages/core/src/__tests__/PerformanceUnderLoad.integration.test.ts`

**Test Scenarios:**
- [ ] 100 agents active simultaneously
- [ ] 50 buildings under construction
- [ ] 200 plants growing
- [ ] 100 animals producing
- [ ] 1000 active memories across agents
- [ ] All systems maintain <16ms update time (60 FPS)
- [ ] No memory leaks over 1000 ticks

**Cross-System Dependencies:**
- ALL SYSTEMS
- Performance monitoring

---

## Testing Infrastructure Requirements

### Test Utilities Needed

```typescript
// packages/core/src/__tests__/utils/IntegrationTestHarness.ts

class IntegrationTestHarness {
  world: World;
  eventBus: EventBus;
  systems: SystemManager;

  // Create test world with all systems
  setupTestWorld(config?: TestConfig): void;

  // Fast-forward time
  advanceTime(seconds: number): void;

  // Advance specific number of ticks
  tick(count: number): void;

  // Create test agent with needs/inventory
  createTestAgent(position: Position, traits?: AgentTraits): Entity;

  // Create test building
  createTestBuilding(type: string, position: Position): Entity;

  // Create test animal
  createTestAnimal(species: string, position: Position): Entity;

  // Assert event was emitted
  assertEventEmitted(eventType: string, expectedData?: any): void;

  // Get system by type
  getSystem<T extends System>(type: new (...args: any[]) => T): T;

  // Cleanup
  teardown(): void;
}
```

### Fixtures Needed

```typescript
// packages/core/src/__tests__/fixtures/

- worldFixtures.ts - Pre-configured test worlds
- agentFixtures.ts - Test agents with various states
- buildingFixtures.ts - Common building configurations
- animalFixtures.ts - Test animals with various traits
- plantFixtures.ts - Test plants at various growth stages
- memoryFixtures.ts - Sample memory collections
- eventFixtures.ts - Common event patterns
```

---

## Implementation Priority

### Phase 1: Core Systems (HIGH PRIORITY)
- [ ] AISystem + ActionQueue Integration
- [ ] TimeSystem + WeatherSystem + TemperatureSystem
- [ ] MovementSystem + SteeringSystem + NavigationSystem
- [ ] NeedsSystem + SleepSystem + TemperatureSystem
- [ ] EventBus Propagation

### Phase 2: Resource & Building (HIGH PRIORITY)
- [ ] BuildingSystem + ResourceGatheringSystem + InventorySystem
- [ ] CraftingSystem + InventorySystem + BuildingSystem
- [ ] SoilSystem + PlantSystem + WeatherSystem
- [ ] PlantSystem + TimeSystem + SeedGatheringSystem

### Phase 3: Animals (MEDIUM PRIORITY)
- [ ] AnimalSystem + AnimalProductionSystem + AnimalHousingSystem
- [ ] TamingSystem + AnimalSystem + InventorySystem
- [ ] WildAnimalSpawningSystem + World + AnimalSystem
- [ ] AnimalHousingSystem + AnimalSystem + BuildingSystem

### Phase 4: Memory & Cognition (MEDIUM PRIORITY)
- [ ] MemoryFormationSystem + MemorySystem + EventBus
- [ ] MemoryConsolidationSystem + SleepSystem + MemorySystem
- [ ] SpatialMemoryQuerySystem + MemorySystem + ExplorationSystem
- [ ] BeliefFormationSystem + MemorySystem + SocialSystem
- [ ] ReflectionSystem + MemorySystem + JournalingSystem

### Phase 5: Social (LOW PRIORITY)
- [ ] CommunicationSystem + SocialGradientSystem + MemorySystem
- [ ] VerificationSystem + SocialGradientSystem + TrustSystem
- [ ] Social Network Formation

### Phase 6: Full Cycles (LOW PRIORITY)
- [ ] Complete Game Day Cycle
- [ ] Farming Full Cycle
- [ ] Animal Husbandry Full Cycle

### Phase 7: Cross-Cutting (CONTINUOUS)
- [ ] Save/Load State Integrity
- [ ] Performance Under Load

---

## Success Criteria

**Each integration test MUST:**
1. Test at least 2 systems working together
2. Verify event flow between systems
3. Assert state changes across system boundaries
4. Include both success and failure cases
5. Be deterministic (no random failures)
6. Run in <1 second (performance tests excepted)
7. Clean up all state (no test pollution)

**Test Coverage Goals:**
- 80% integration coverage of cross-system interactions
- All critical event chains tested
- All save/load paths tested
- Performance baselines established

---

## Notes

- Integration tests complement (don't replace) unit tests
- Focus on **interactions** not individual system behavior
- Use real World/EventBus instances, not mocks
- Test failure modes: missing resources, invalid state, concurrent actions
- Document expected event chains in test comments
- Use descriptive test names: `should_X_when_Y_causing_Z`

---

## Related Specs

- [Testing Strategy](./testing-strategy.md)
- [Unit Testing Standards](./unit-testing-standards.md)
- [Performance Testing](./performance-testing.md)
- [System Architecture](../architecture/system-architecture.md)
