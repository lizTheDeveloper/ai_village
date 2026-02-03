# Resource Location Discovery System - Implementation Status

**Status**: Core infrastructure complete, systems implementation pending
**Created**: 2026-01-19
**Purpose**: Enable era progression (10-14) through exploration and resource discovery

## Overview

This system implements resource-gated era advancement for technology eras 10-14. Civilizations must discover specific rare resources at stellar phenomena and exotic planets before advancing to higher technological eras.

### Era-Gated Resources

```typescript
Era 10 (Interplanetary):  helium_3, metallic_hydrogen, platinum_iridium
Era 11 (Interstellar):    void_essence, strange_matter, degenerate_matter
Era 12 (Transgalactic):   timeline_fragment, probability_dust, reality_thread
Era 13 (Post-Singularity): singularity_core, quantum_entanglement_matrix
```

## Implementation Status

### ✅ Completed Components

#### 1. Stellar Phenomena Types (`packages/world/src/stellar/StellarPhenomena.ts`)
- **Lines**: 575
- **Exports**:
  - `StellarPhenomenonType` enum (8 types)
  - `StellarPhenomenon` interface
  - `ResourceSpawn` interface with abundance/difficulty/harvest rates
  - `getResourceSpawning(type)` - resource mappings per phenomenon
  - `generateStellarPhenomena(systemId, seed)` - procedural generation
  - `getRequiredTechLevel(difficulty)` - tech requirements
  - `calculateMiningEfficiency(requiredTech, civTech)` - extraction efficiency

**Resource Spawning Rules**:
```typescript
BLACK_HOLE:
  void_essence: abundance=0.8, difficulty=0.9, rate=0.1 (ERA 11 GATED)
  exotic_matter: abundance=0.6, difficulty=0.85
  frame_dragging_residue: abundance=0.4, difficulty=0.95
  singularity_fragment: abundance=0.2, difficulty=0.98 (ERA 13)

NEUTRON_STAR:
  degenerate_matter: abundance=0.9, difficulty=0.85 (ERA 11 GATED)
  strange_matter: abundance=0.3, difficulty=0.92 (ERA 11 GATED)
  neutronium: abundance=0.7, difficulty=0.88

WHITE_DWARF:
  helium_3: abundance=0.3, difficulty=0.4 (ERA 10 GATED)
  carbon_diamonds: abundance=0.8, difficulty=0.5
  quantum_foam: abundance=0.4, difficulty=0.6

NEBULA:
  nebular_gas: abundance=1.0, difficulty=0.2
  cosmic_dust: abundance=0.95, difficulty=0.25
```

#### 2. Planet Resource Spawning (`packages/world/src/planet/PlanetResourceSpawning.ts`)
- **Lines**: 350+
- **Exports**:
  - `getPlanetResourceSpawning(planetType)` - resource config per planet type
  - `getEraGatedResources()` - mapping of eras to required resources
  - `isEraGatedResource(resourceType)` - check if resource gates an era
  - `getResourceEraRequirement(resourceType)` - get era requirement

**Planet Resource Examples**:
```typescript
GAS_DWARF/MOON (ERA 10):
  helium_3: rare 0.4-0.5 probability

HYCEAN (ERA 10):
  metallic_hydrogen: rare 0.4 probability

CORRUPTED (ERA 11):
  void_essence: exotic 0.12 probability

MAGICAL (ERA 12):
  reality_thread: exotic 0.05 probability
```

#### 3. PlanetConfig Extension (`packages/world/src/planet/PlanetTypes.ts`)
- Added `resourceSpawning` field to `PlanetConfig` interface
- Structure: `{ common: {}, rare: {}, exotic: {} }`
- Discovery probability = planet_spawn_chance × exploration_thoroughness × sensor_quality

#### 4. Exploration Events (`packages/core/src/events/domains/exploration.events.ts`)
- **Lines**: 141
- **Events** (10 total):
  - `exploration:mission_started` - Ship begins survey
  - `exploration:resource_discovered` - Resource found
  - `exploration:mission_completed` - Survey complete
  - `exploration:rare_find` - Exotic resource discovered
  - `exploration:mining_operation_started` - Extraction begins
  - `exploration:stockpile_full` - Resources ready for transport
  - `exploration:mining_operation_ended` - Operation concluded
  - `era:advancement_blocked` - Missing gated resources
  - `exploration:stellar_phenomenon_discovered` - New phenomenon
  - `exploration:planet_discovered` - New planet catalogued
- Integrated into `EventMap.ts` via `ExplorationEvents` interface

#### 5. ExplorationMissionComponent (`packages/core/src/components/ExplorationMissionComponent.ts`)
- **Lines**: 185
- **Fields**:
  - Mission parameters (shipId, targetId, missionType, coordinates)
  - Progress tracking (progress 0-100%, hasArrived, surveyDuration)
  - Discoveries (discoveredResources Set, detailed discovery records)
  - Sensor quality (ship-dependent: courier=0.5, scout=2.0)
  - Crew skill (science skill average)
  - Mission type multiplier (survey=1.0x, resource_scan=1.5x, deep_analysis=2.0x)
- **Helper Functions**:
  - `calculateDiscoveryChance(mission, resourceAbundance)` - sensorQuality × crewSkill × abundance × missionMultiplier
  - `calculateProgressRate(mission)` - progress increment per tick

#### 6. MiningOperationComponent (`packages/core/src/components/MiningOperationComponent.ts`)
- **Lines**: 265
- **Fields**:
  - Location (locationId, locationType, resourceType, civilizationId)
  - Fleet (assignedShips[], totalCrew, equipmentQuality)
  - Extraction (baseHarvestRate, difficulty, requiredTechLevel, efficiency)
  - Stockpile (stockpile, capacity, totalHarvested, totalShipped)
  - Status (active/paused/depleted/abandoned)
- **Helper Functions**:
  - `calculateMiningEfficiency(requiredTech, civTech)` - exponential penalty below, diminishing returns above
  - `calculateActualHarvestRate(operation)` - base × efficiency × equipment × crew
  - `assignShipsToMining(operation, shipIds, crew, quality)` - fleet management
  - `processHarvesting(operation)` - tick processing
  - `transferStockpile(operation, amount)` - ship resources to civilization

### 🚧 Pending Implementation

#### 7. ExplorationDiscoverySystem.ts (Priority 180)

**File**: `packages/core/src/systems/ExplorationDiscoverySystem.ts`
**Estimated Lines**: 400-500

**Responsibilities**:
1. **Ship Arrival Detection**:
   ```typescript
   // Check if ship arrived at target coordinates
   const distance = Math.sqrt(
     (shipPos.x - mission.targetCoordinates.x) ** 2 +
     (shipPos.y - mission.targetCoordinates.y) ** 2 +
     (shipPos.z - mission.targetCoordinates.z) ** 2
   );
   if (distance < ARRIVAL_THRESHOLD && !mission.hasArrived) {
     mission.hasArrived = true;
     ctx.events.emit('exploration:mission_started', { ... });
   }
   ```

2. **Progress Increment**:
   ```typescript
   if (mission.hasArrived && mission.progress < 100) {
     const progressRate = calculateProgressRate(mission);
     mission.progress += progressRate;
     mission.surveyDuration++;
   }
   ```

3. **Resource Discovery Rolls** (per tick while surveying):
   ```typescript
   const targetResources = getTargetResources(mission.targetId, mission.targetType);
   for (const resource of targetResources) {
     if (!mission.discoveredResources.has(resource.resourceType)) {
       const discoveryChance = calculateDiscoveryChance(mission, resource.abundance);
       if (Math.random() < discoveryChance * 0.01) { // Per-tick probability
         // Discovered!
         mission.discoveredResources.add(resource.resourceType);
         mission.discoveries.push({
           resourceType: resource.resourceType,
           discoveredTick: ctx.tick,
           abundance: resource.abundance,
           difficulty: resource.difficulty,
           isEraGated: isEraGatedResource(resource.resourceType),
         });

         ctx.events.emit('exploration:resource_discovered', {
           shipId: mission.shipId,
           resourceType: resource.resourceType,
           locationId: mission.targetId,
           locationType: mission.targetType,
           abundance: resource.abundance,
           difficulty: resource.difficulty,
           civilizationId: mission.civilizationId,
           isEraGated: isEraGatedResource(resource.resourceType),
           eraRequirement: getResourceEraRequirement(resource.resourceType),
         });

         // Check if rare find
         const rarityScore = (resource.difficulty + (1 - resource.abundance)) / 2;
         if (rarityScore > 0.7) {
           ctx.events.emit('exploration:rare_find', { ... });
         }
       }
     }
   }
   ```

4. **Mission Completion**:
   ```typescript
   if (mission.progress >= 100 && mission.completedTick === null) {
     mission.completedTick = ctx.tick;

     // Transfer discoveries to civilization's knownResources
     const civEntity = getCivilizationEntity(mission.civilizationId);
     const techEra = civEntity.getComponent<TechnologyEraComponent>(CT.TechnologyEra);
     if (techEra) {
       for (const resource of mission.discoveredResources) {
         techEra.gatedResourcesDiscovered.add(resource);
         techEra.exploredLocations.push(mission.targetId);
       }
     }

     ctx.events.emit('exploration:mission_completed', {
       shipId: mission.shipId,
       targetId: mission.targetId,
       targetType: mission.targetType,
       discoveredResources: Array.from(mission.discoveredResources),
       duration: mission.surveyDuration,
       progress: mission.progress,
       civilizationId: mission.civilizationId,
     });

     // Remove mission component
     shipEntity.removeComponent(CT.ExplorationMission);
   }
   ```

**Integration Points**:
- Query: `world.query().with(CT.ExplorationMission).executeEntities()`
- Ship position: `shipEntity.getComponent<PositionComponent>(CT.Position)`
- Spaceship config: `shipEntity.getComponent<SpaceshipComponent>(CT.Spaceship)`
- Stellar phenomena: Import from `packages/world/src/stellar/StellarPhenomena.ts`
- Planet resources: Import from `packages/world/src/planet/PlanetResourceSpawning.ts`

#### 8. StellarMiningSystem.ts (Priority 185)

**File**: `packages/core/src/systems/StellarMiningSystem.ts`
**Estimated Lines**: 350-400

**Responsibilities**:
1. **Harvesting Loop** (per tick):
   ```typescript
   const operations = ctx.activeEntities; // Entities with MiningOperationComponent

   for (const opEntity of operations) {
     const op = opEntity.getComponent<MiningOperationComponent>(CT.MiningOperation);

     if (op.status === 'active') {
       const harvested = processHarvesting(op);

       // Check stockpile threshold
       if (isStockpileFull(op)) {
         const timeSinceLastNotification = ctx.tick - op.lastStockpileFullNotificationTick;
         if (timeSinceLastNotification > 600) { // 30 seconds
           ctx.events.emit('exploration:stockpile_full', {
             operationId: opEntity.id,
             resourceType: op.resourceType,
             stockpile: op.stockpile,
             locationId: op.locationId,
             civilizationId: op.civilizationId,
             suggestTransport: true,
           });
           op.lastStockpileFullNotificationTick = ctx.tick;
         }
       }

       // Check if depleted
       if (op.status === 'depleted') {
         ctx.events.emit('exploration:mining_operation_ended', {
           operationId: opEntity.id,
           resourceType: op.resourceType,
           totalExtracted: op.totalHarvested,
           reason: 'depleted',
           locationId: op.locationId,
           civilizationId: op.civilizationId,
         });

         // Mark for cleanup (don't delete immediately - conservation of game matter)
         op.status = 'depleted';
         op.endTick = ctx.tick;
       }
     }
   }
   ```

2. **Ship Assignment Management**:
   - Listen for ship assignments via actions or governor decisions
   - Call `assignShipsToMining(operation, shipIds, crew, quality)`
   - Update actualHarvestRate

3. **Transport Integration**:
   - When stockpile full, create transport mission (ShippingSystem integration)
   - Transfer resources to civilization warehouse (WarehouseSystem)
   - Call `transferStockpile(operation, amount)` when transport arrives

**Integration Points**:
- Query: `world.query().with(CT.MiningOperation).executeEntities()`
- Warehouse: `WarehouseComponent` for resource storage
- Shipping: Create transport missions when stockpile full

#### 9. TechnologyEraSystem Integration

**File**: `packages/core/src/systems/TechnologyEraSystem.ts` (modify existing)
**Changes Required**: ~50 lines

**Modify `canAdvanceEra()` method** (around line 386-479):

```typescript
// Add after line 459 (after Interplanetary check):

// 5. Generalized resource gating check
const eraGatedResourceMap = getEraGatedResources(); // From PlanetResourceSpawning
const targetEraIndex = getEraIndex(targetEra);

if (targetEraIndex in eraGatedResourceMap) {
  const requiredResources = eraGatedResourceMap[targetEraIndex];

  for (const resourceType of requiredResources) {
    if (!eraComponent.gatedResourcesDiscovered.has(resourceType)) {
      blockedReasons.push(
        `Missing gated resource: ${resourceType} (requires exploration)`
      );
      progressContributions.push(0);

      // Emit blocking event with location suggestions
      ctx.events.emit('era:advancement_blocked', {
        civilizationId: civEntity.id,
        currentEra: currentEraIndex,
        targetEra: targetEraIndex,
        missingResources: [resourceType],
        suggestedLocations: findResourceLocations(resourceType), // Optional helper
      });
    } else {
      progressContributions.push(100);
    }
  }
}
```

**Remove hardcoded era checks** (lines 440-458):
- Delete the specific checks for `helium_3` and `void_essence`
- Replace with generalized resource gating above

#### 10. Stellar Phenomena Generation

**File**: `packages/world/src/stellar/StellarSystemGenerator.ts` or similar
**Integration**: Add to universe/system initialization

```typescript
import { generateStellarPhenomena } from './StellarPhenomena.js';

function generateStarSystem(systemId: string, seed: number) {
  // Existing system generation...

  // Add stellar phenomena
  const phenomena = generateStellarPhenomena(systemId, seed);

  for (const phenomenon of phenomena) {
    // Create entity for phenomenon (for discovery tracking)
    const phenomenonEntity = world.createEntity();
    phenomenonEntity.addComponent({
      type: 'stellar_phenomenon',
      phenomenonId: phenomenon.id,
      phenomenonType: phenomenon.type,
      coordinates: phenomenon.coordinates,
      mass: phenomenon.mass,
      radius: phenomenon.radius,
      age: phenomenon.age,
      resources: phenomenon.resources,
      systemId: phenomenon.systemId,
      discoveredBy: null,
      discoveredAt: null,
    });

    // Store in system registry
    system.stellarPhenomena.push(phenomenon);
  }

  return system;
}
```

**Requires**: Create `StellarPhenomenonComponent` (similar to `MiningOperationComponent`)

### 📋 Component Type Registration

**File**: `packages/core/src/types/ComponentType.ts`

Add to enum:
```typescript
export enum ComponentType {
  // ... existing types
  ExplorationMission = 'exploration_mission',
  MiningOperation = 'mining_operation',
  StellarPhenomenon = 'stellar_phenomenon',
}
```

### 📋 System Registration

**File**: `packages/core/src/systems/registerAllSystems.ts`

```typescript
import { ExplorationDiscoverySystem } from './ExplorationDiscoverySystem.js';
import { StellarMiningSystem } from './StellarMiningSystem.js';

// In registerAllSystems():
systemRegistry.register(new ExplorationDiscoverySystem());  // Priority 180
systemRegistry.register(new StellarMiningSystem());        // Priority 185
```

### 📋 Component Registration

**File**: `packages/core/src/components/index.ts`

```typescript
export * from './ExplorationMissionComponent.js';
export * from './MiningOperationComponent.js';
export * from './StellarPhenomenonComponent.js'; // To be created
```

## Testing Strategy

### Integration Test: Black Hole → Void Essence → Era 11

**File**: `packages/core/src/systems/__tests__/ExplorationDiscovery.test.ts`

```typescript
test('Ship explores black hole and discovers void essence, unlocking era 11', () => {
  // 1. Create civilization at era 10
  const civEntity = world.createEntity();
  civEntity.addComponent(createTechnologyEraComponent('interplanetary', 0));
  civEntity.addComponent(createNationComponent('TestNation', 0));

  // 2. Create black hole with void essence
  const blackHole = createStellarPhenomenon(
    'test_black_hole',
    'Test Black Hole',
    StellarPhenomenonType.BLACK_HOLE,
    { x: 100, y: 100, z: 0 },
    'test_system',
    10,
    29.5,
    1000
  );

  // 3. Create ship with exploration mission
  const ship = world.createEntity();
  ship.addComponent(createSpaceshipComponent('probability_scout', 'Explorer'));
  ship.addComponent(createPositionComponent(90, 90, 0));
  ship.addComponent(
    createExplorationMissionComponent(
      ship.id,
      blackHole.id,
      'stellar_phenomenon',
      'deep_analysis',
      blackHole.coordinates,
      civEntity.id,
      2.0, // probability_scout sensor quality
      0.8, // crew skill
      0
    )
  );

  // 4. Run ExplorationDiscoverySystem until mission complete
  const explorationSystem = new ExplorationDiscoverySystem();
  let foundVoidEssence = false;

  for (let i = 0; i < 500; i++) {
    explorationSystem.update(world);

    const mission = ship.getComponent<ExplorationMissionComponent>(CT.ExplorationMission);
    if (mission && mission.discoveredResources.has('void_essence')) {
      foundVoidEssence = true;
      break;
    }
  }

  expect(foundVoidEssence).toBe(true);

  // 5. Verify resource added to civilization's gatedResourcesDiscovered
  const techEra = civEntity.getComponent<TechnologyEraComponent>(CT.TechnologyEra);
  expect(techEra!.gatedResourcesDiscovered.has('void_essence')).toBe(true);

  // 6. Verify era 11 advancement now possible
  // Set all other requirements (population, tech, etc.)
  techEra!.eraProgress = 100;
  techEra!.scientistCount = 100;
  techEra!.universityCount = 10;

  const technologyEraSystem = new TechnologyEraSystem();
  technologyEraSystem.update(world);

  expect(techEra!.currentEra).toBe('interstellar'); // Era 11
});
```

### Unit Tests

**ExplorationMissionComponent**:
- `calculateDiscoveryChance()` with various sensor/crew/abundance values
- `calculateProgressRate()` for different mission types
- Progress tracking from 0% to 100%

**MiningOperationComponent**:
- `calculateMiningEfficiency()` below/at/above required tech
- `calculateActualHarvestRate()` with varying equipment/crew
- `processHarvesting()` stockpile accumulation
- `transferStockpile()` validation

**StellarPhenomena**:
- `generateStellarPhenomena()` procedural generation consistency
- `getResourceSpawning()` returns correct resources per type
- `getRequiredTechLevel()` difficulty mapping

## Performance Considerations

### ExplorationDiscoverySystem
- **Query**: `world.query().with(CT.ExplorationMission).executeEntities()`
- **Frequency**: Every tick (no throttle - missions are rare)
- **Cost**: O(active_missions × resources_per_target)
- **Optimization**: Early exit when progress = 100% before discovery rolls

### StellarMiningSystem
- **Query**: `world.query().with(CT.MiningOperation).executeEntities()`
- **Frequency**: Every tick (no throttle - harvesting is per-tick)
- **Cost**: O(active_operations)
- **Optimization**: Skip inactive/paused operations

### Typical Counts
- Active exploration missions: 1-10 per civilization
- Active mining operations: 5-50 per civilization
- Total across all civs: ~100-500 entities

## API Access (Admin Dashboard)

Add to `packages/core/src/admin/capabilities/exploration.ts`:

```typescript
export const explorationCapability = defineCapability('exploration', {
  queries: {
    getKnownResources: defineQuery<{ civId: string }, KnownResourcesResponse>({
      name: 'known_resources',
      handler: async ({ civId }) => {
        const civEntity = world.getEntity(civId);
        const techEra = civEntity?.getComponent<TechnologyEraComponent>(CT.TechnologyEra);

        return {
          discoveredResources: Array.from(techEra?.gatedResourcesDiscovered || []),
          exploredLocations: techEra?.exploredLocations || [],
          currentEra: techEra?.currentEra || 'paleolithic',
        };
      },
    }),

    getStellarPhenomena: defineQuery<{ systemId: string }, PhenomenaResponse>({
      name: 'stellar_phenomena',
      handler: async ({ systemId }) => {
        const phenomena = world.query()
          .with(CT.StellarPhenomenon)
          .executeEntities()
          .filter(e => e.getComponent<StellarPhenomenonComponent>(CT.StellarPhenomenon)?.systemId === systemId);

        return {
          phenomena: phenomena.map(e => e.getComponent<StellarPhenomenonComponent>(CT.StellarPhenomenon)),
        };
      },
    }),

    getMiningOperations: defineQuery<{ civId: string }, MiningOpsResponse>({
      name: 'mining_operations',
      handler: async ({ civId }) => {
        const operations = world.query()
          .with(CT.MiningOperation)
          .executeEntities()
          .filter(e => e.getComponent<MiningOperationComponent>(CT.MiningOperation)?.civilizationId === civId);

        return {
          operations: operations.map(e => ({
            id: e.id,
            ...e.getComponent<MiningOperationComponent>(CT.MiningOperation),
          })),
        };
      },
    }),
  },
});
```

## File Summary

### Created Files (6)
1. `packages/world/src/stellar/StellarPhenomena.ts` (575 lines)
2. `packages/world/src/planet/PlanetResourceSpawning.ts` (350+ lines)
3. `packages/core/src/events/domains/exploration.events.ts` (141 lines)
4. `packages/core/src/components/ExplorationMissionComponent.ts` (185 lines)
5. `packages/core/src/components/MiningOperationComponent.ts` (265 lines)
6. `custom_game_engine/RESOURCE_DISCOVERY_IMPLEMENTATION.md` (this file)

### Modified Files (2)
1. `packages/world/src/planet/PlanetTypes.ts` (+23 lines: resourceSpawning field)
2. `packages/core/src/events/EventMap.ts` (+2 lines: ExplorationEvents import/extend)

### Pending Files (5)
1. `packages/core/src/systems/ExplorationDiscoverySystem.ts` (400-500 lines)
2. `packages/core/src/systems/StellarMiningSystem.ts` (350-400 lines)
3. `packages/core/src/components/StellarPhenomenonComponent.ts` (100 lines)
4. `packages/core/src/systems/__tests__/ExplorationDiscovery.test.ts` (200+ lines)
5. `packages/core/src/admin/capabilities/exploration.ts` (150 lines)

### Registration Changes Pending
- `packages/core/src/types/ComponentType.ts` (+3 enum values)
- `packages/core/src/systems/registerAllSystems.ts` (+2 system registrations)
- `packages/core/src/components/index.ts` (+3 exports)
- `packages/core/src/systems/TechnologyEraSystem.ts` (~50 line modification)

## Success Criteria

✅ Stellar phenomena types defined with resource mappings
✅ Planet resource spawning configured for all planet types
✅ Era-gated resources mapped to eras 10-13
✅ Exploration events defined and integrated
✅ ExplorationMissionComponent tracks discovery progress
✅ MiningOperationComponent handles extraction logistics

⏳ ExplorationDiscoverySystem processes ship surveys
⏳ StellarMiningSystem harvests resources
⏳ TechnologyEraSystem blocks advancement without resources
⏳ Stellar phenomena generation in universe creation
⏳ Integration tests verify full discovery flow
⏳ Admin dashboard exposes exploration APIs

## Next Steps

1. **Implement ExplorationDiscoverySystem.ts** (400-500 lines)
   - Ship arrival detection
   - Progress increment
   - Resource discovery rolls
   - Civilization knowledge transfer

2. **Implement StellarMiningSystem.ts** (350-400 lines)
   - Harvesting loop
   - Stockpile management
   - Transport integration

3. **Modify TechnologyEraSystem.ts** (~50 lines)
   - Replace hardcoded resource checks
   - Add generalized resource gating
   - Emit `era:advancement_blocked` events

4. **Create StellarPhenomenonComponent.ts** (100 lines)
   - Store phenomenon data on entities
   - Track discovery status

5. **Add stellar phenomena to universe generation**
   - Integrate `generateStellarPhenomena()` into system creation

6. **Write integration tests**
   - Full exploration → discovery → mining → advancement flow

7. **Register components and systems**
   - Update ComponentType enum
   - Register systems in registerAllSystems
   - Export components from index

## Timeline Estimate

- **ExplorationDiscoverySystem**: 2-3 hours
- **StellarMiningSystem**: 2 hours
- **TechnologyEraSystem integration**: 30 minutes
- **StellarPhenomenonComponent**: 30 minutes
- **Universe generation integration**: 1 hour
- **Testing**: 2 hours
- **Registration & integration**: 30 minutes

**Total**: ~8-9 hours of focused development

---

*This implementation enables the core progression loop for space-age civilizations: explore → discover → mine → advance → explore further.*
