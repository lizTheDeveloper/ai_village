/**
 * City Director Full Integration Test
 *
 * Runs a full game simulation with terrain, resources, buildings, and NPCs
 * managed by the City Director system over a game year.
 *
 * Usage:
 *   npx tsx scripts/test-city-director-full.ts
 *   npx tsx scripts/test-city-director-full.ts --months=6 --population=20
 */

import {
  GameLoop,
  AgentBrainSystem,
  MovementSystem,
  NeedsSystem,
  MemorySystem,
  MemoryFormationSystem,
  MemoryConsolidationSystem,
  ReflectionSystem,
  JournalingSystem,
  CommunicationSystem,
  BuildingSystem,
  ResourceGatheringSystem,
  BuildingBlueprintRegistry,
  registerShopBlueprints,
  TemperatureSystem,
  WeatherSystem,
  SoilSystem,
  TimeSystem,
  SleepSystem,
  AnimalSystem,
  AnimalProductionSystem,
  TamingSystem,
  WildAnimalSpawningSystem,
  AnimalBrainSystem,
  TillActionHandler,
  HarvestActionHandler,
  createTimeComponent,
  createBuildingComponent,
  createPositionComponent,
  createRenderableComponent,
  createWeatherComponent,
  createInventoryComponent,
  createNamedLandmarksComponent,
  EntityImpl,
  createEntityId,
  type World,
  SteeringSystem,
  ExplorationSystem,
  LandmarkNamingSystem,
  SocialGradientSystem,
  BeliefFormationSystem,
  CraftingSystem,
  initializeDefaultRecipes,
  globalRecipeRegistry,
  SkillSystem,
  CookingSystem,
  IdleBehaviorSystem,
  GoalGenerationSystem,
  TradingSystem,
  GovernanceDataSystem,
  registerDefaultMaterials,
  CityDirectorSystem,
  createCityDirectorComponent,
  type CityDirectorComponent,
  type AgentComponent,
  type BuildingComponent,
  CT,
} from '../packages/core/src/index.js';

import {
  TerrainGenerator,
  ChunkManager,
  createWanderingAgent,
  getWildSpawnableSpecies,
} from '../packages/world/src/index.js';

// ============================================================================
// HEADLESS GAME LOOP
// ============================================================================

class HeadlessGameLoop {
  private gameLoop: GameLoop;

  constructor(gameLoop: GameLoop) {
    this.gameLoop = gameLoop;
  }

  get world(): World {
    return this.gameLoop.world;
  }

  get systemRegistry() {
    return this.gameLoop.systemRegistry;
  }

  get actionRegistry() {
    return this.gameLoop.actionRegistry;
  }

  runTicks(count: number): void {
    for (let i = 0; i < count; i++) {
      (this.gameLoop as any).tick(0.05);
    }
  }
}

// ============================================================================
// CONSTANTS
// ============================================================================

const TICKS_PER_DAY = 14400;
const TICKS_PER_MONTH = TICKS_PER_DAY * 30;
const BATCH_SIZE = 2000;
const BATCHES_PER_MONTH = Math.ceil(TICKS_PER_MONTH / BATCH_SIZE);

// ============================================================================
// CITY SNAPSHOT
// ============================================================================

interface CitySnapshot {
  month: number;
  tick: number;
  population: number;
  autonomicNpcs: number;
  buildings: number;
  housingCapacity: number;
  storageCapacity: number;
  productionBuildings: number;
  foodSupply: number;
  woodSupply: number;
  stoneSupply: number;
  threats: number;
  focus: string;
  topPriority: string;
  topPriorityValue: number;
  concerns: string[];
}

function takeCitySnapshot(
  director: CityDirectorComponent,
  month: number,
  tick: number
): CitySnapshot {
  const priorities = Object.entries(director.priorities)
    .filter(([_, v]) => v !== undefined && v > 0)
    .sort((a, b) => (b[1] ?? 0) - (a[1] ?? 0));

  const topPriority = priorities[0] ?? ['none', 0];

  return {
    month,
    tick,
    population: director.stats.population,
    autonomicNpcs: director.stats.autonomicNpcCount,
    buildings: director.stats.totalBuildings,
    housingCapacity: director.stats.housingCapacity,
    storageCapacity: director.stats.storageCapacity,
    productionBuildings: director.stats.productionBuildings,
    foodSupply: director.stats.foodSupply,
    woodSupply: director.stats.woodSupply,
    stoneSupply: director.stats.stoneSupply,
    threats: director.stats.nearbyThreats,
    focus: director.reasoning?.focus ?? 'unknown',
    topPriority: topPriority[0] as string,
    topPriorityValue: (topPriority[1] ?? 0) as number,
    concerns: director.reasoning?.concerns ?? [],
  };
}

function printSnapshot(snapshot: CitySnapshot): void {
  const bar = (value: number, max: number, width: number = 15): string => {
    const filled = Math.min(Math.round((value / max) * width), width);
    return '█'.repeat(filled) + '░'.repeat(width - filled);
  };

  console.log(`\n┌────────────────────────────────────────────────────────────────────┐`);
  console.log(`│ MONTH ${snapshot.month.toString().padStart(2, '0')} │ Tick ${snapshot.tick.toLocaleString().padStart(12, ' ')} │ Focus: ${snapshot.focus.padEnd(12)} │`);
  console.log(`├────────────────────────────────────────────────────────────────────┤`);
  console.log(`│ 👥 Population: ${snapshot.population.toString().padStart(3)} (${snapshot.autonomicNpcs} autonomic)                              │`);
  console.log(`│ 🏠 Buildings:  ${snapshot.buildings.toString().padStart(3)} │ Housing: ${snapshot.housingCapacity.toString().padStart(2)} │ Storage: ${snapshot.storageCapacity.toString().padStart(3)} │ Production: ${snapshot.productionBuildings} │`);
  console.log(`│ 🍖 Food:       ${bar(snapshot.foodSupply, 30)} ${snapshot.foodSupply.toFixed(1).padStart(5)} days                │`);
  console.log(`│ 🪵 Wood:       ${bar(snapshot.woodSupply, 200)} ${snapshot.woodSupply.toString().padStart(5)}                      │`);
  console.log(`│ 🪨 Stone:      ${bar(snapshot.stoneSupply, 200)} ${snapshot.stoneSupply.toString().padStart(5)}                      │`);
  console.log(`│ ⚔️  Threats:    ${snapshot.threats}                                                        │`);
  console.log(`├────────────────────────────────────────────────────────────────────┤`);
  console.log(`│ Priority: ${snapshot.topPriority.padEnd(12)} (${(snapshot.topPriorityValue * 100).toFixed(0)}%)                                      │`);
  if (snapshot.concerns.length > 0) {
    const concernsStr = snapshot.concerns.slice(0, 2).join(', ').slice(0, 55);
    console.log(`│ Concerns: ${concernsStr.padEnd(55)} │`);
  }
  console.log(`└────────────────────────────────────────────────────────────────────┘`);
}

// ============================================================================
// WORLD SETUP
// ============================================================================

function createResources(world: World, bounds: { minX: number; maxX: number; minY: number; maxY: number }) {
  const width = bounds.maxX - bounds.minX;
  const height = bounds.maxY - bounds.minY;

  // Create wood resources (trees)
  const treeCount = 30;
  for (let i = 0; i < treeCount; i++) {
    const x = bounds.minX + 10 + Math.random() * (width - 20);
    const y = bounds.minY + 10 + Math.random() * (height - 20);

    const treeEntity = new EntityImpl(createEntityId(), (world as any).tick);
    treeEntity.addComponent(createPositionComponent(x, y));
    treeEntity.addComponent({
      type: 'resource',
      version: 1,
      resourceType: 'wood',
      amount: 20 + Math.floor(Math.random() * 30),
      maxAmount: 50,
      harvestable: true,
      harvestRate: 1,
      regenerationRate: 0.001,
    });
    treeEntity.addComponent(createRenderableComponent('tree', 'resource'));
    (world as any)._addEntity(treeEntity);
  }

  // Create stone resources
  const stoneCount = 20;
  for (let i = 0; i < stoneCount; i++) {
    const x = bounds.minX + 10 + Math.random() * (width - 20);
    const y = bounds.minY + 10 + Math.random() * (height - 20);

    const stoneEntity = new EntityImpl(createEntityId(), (world as any).tick);
    stoneEntity.addComponent(createPositionComponent(x, y));
    stoneEntity.addComponent({
      type: 'resource',
      version: 1,
      resourceType: 'stone',
      amount: 15 + Math.floor(Math.random() * 25),
      maxAmount: 40,
      harvestable: true,
      harvestRate: 0.8,
      regenerationRate: 0,
    });
    stoneEntity.addComponent(createRenderableComponent('rock', 'resource'));
    (world as any)._addEntity(stoneEntity);
  }

  // Create food resource nodes (simplified - no plant system)
  const foodNodeCount = 15;
  for (let i = 0; i < foodNodeCount; i++) {
    const x = bounds.minX + 10 + Math.random() * (width - 20);
    const y = bounds.minY + 10 + Math.random() * (height - 20);

    const foodEntity = new EntityImpl(createEntityId(), (world as any).tick);
    foodEntity.addComponent({
      type: 'resource',
      resourceType: 'food',
      amount: 15 + Math.floor(Math.random() * 10),
      harvestable: true,
      harvestTime: 1.5,
      regenerates: true,
      regenerationRate: 0.01,
      maxAmount: 25,
    });
    foodEntity.addComponent(createPositionComponent(x, y));
    foodEntity.addComponent(createRenderableComponent('blueberry-bush', 'resource'));
    (world as any)._addEntity(foodEntity);
  }

  console.log(`  Created ${treeCount} trees, ${stoneCount} stone deposits, ${foodNodeCount} food nodes`);
}

function createInitialBuildings(world: World, cityCenter: { x: number; y: number }) {
  // Campfire at center
  const campfireEntity = new EntityImpl(createEntityId(), (world as any).tick);
  campfireEntity.addComponent(createBuildingComponent('campfire', 1, 100));
  campfireEntity.addComponent(createPositionComponent(cityCenter.x, cityCenter.y));
  campfireEntity.addComponent(createRenderableComponent('campfire', 'object'));
  (world as any)._addEntity(campfireEntity);

  // Initial storage with resources
  const storageEntity = new EntityImpl(createEntityId(), (world as any).tick);
  storageEntity.addComponent(createBuildingComponent('storage-chest', 1, 100));
  storageEntity.addComponent(createPositionComponent(cityCenter.x + 3, cityCenter.y));
  storageEntity.addComponent(createRenderableComponent('storage-chest', 'object'));
  const storageInventory = createInventoryComponent(20, 500);
  storageInventory.slots[0] = { itemId: 'wood', quantity: 30 };
  storageInventory.slots[1] = { itemId: 'stone', quantity: 20 };
  storageInventory.slots[2] = { itemId: 'food', quantity: 50 };
  storageEntity.addComponent(storageInventory);
  (world as any)._addEntity(storageEntity);

  // Initial tent
  const tentEntity = new EntityImpl(createEntityId(), (world as any).tick);
  tentEntity.addComponent(createBuildingComponent('tent', 1, 100));
  tentEntity.addComponent(createPositionComponent(cityCenter.x - 3, cityCenter.y));
  tentEntity.addComponent(createRenderableComponent('tent', 'object'));
  (world as any)._addEntity(tentEntity);

  console.log(`  Created initial buildings: campfire, storage (with supplies), tent`);
}

function createPopulation(
  world: World,
  cityCenter: { x: number; y: number },
  count: number
): EntityImpl[] {
  const npcs: EntityImpl[] = [];

  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 2;
    const radius = 5 + Math.random() * 10;
    const x = cityCenter.x + Math.cos(angle) * radius;
    const y = cityCenter.y + Math.sin(angle) * radius;

    const npcId = createWanderingAgent(world, x, y, 2.0);
    const npc = world.getEntity(npcId) as EntityImpl;

    if (npc) {
      npc.updateComponent<AgentComponent>(CT.Agent, (current) => ({
        ...current,
        tier: 'autonomic',
        useLLM: false,
      }));
      npcs.push(npc);
    }
  }

  console.log(`  Created ${npcs.length} autonomic NPCs`);
  return npcs;
}

// ============================================================================
// MAIN SIMULATION
// ============================================================================

async function runSimulation() {
  // Parse args
  const args = process.argv.slice(2);
  let months = 12;
  let population = 15;

  for (const arg of args) {
    if (arg.startsWith('--months=')) {
      months = parseInt(arg.split('=')[1]!, 10);
    } else if (arg.startsWith('--population=')) {
      population = parseInt(arg.split('=')[1]!, 10);
    }
  }

  console.log('╔════════════════════════════════════════════════════════════════════╗');
  console.log('║           CITY DIRECTOR - FULL INTEGRATION TEST                    ║');
  console.log('╠════════════════════════════════════════════════════════════════════╣');
  console.log(`║  Duration: ${months} months │ Population: ${population} NPCs                          ║`);
  console.log('╚════════════════════════════════════════════════════════════════════╝');

  // Create game loop
  const gameLoop = new GameLoop();
  const headlessGame = new HeadlessGameLoop(gameLoop);
  const world = headlessGame.world;

  // Register blueprints
  const blueprintRegistry = new BuildingBlueprintRegistry();
  blueprintRegistry.registerDefaults();
  registerShopBlueprints(blueprintRegistry);

  // Register systems
  console.log('\n[Setup] Registering game systems...');

  // Core systems
  headlessGame.systemRegistry.register(new TimeSystem());
  headlessGame.systemRegistry.register(new WeatherSystem());
  headlessGame.systemRegistry.register(new TemperatureSystem());

  // Soil system (no plant system to avoid PlantComponent complexity in test)
  const soilSystem = new SoilSystem();
  headlessGame.systemRegistry.register(soilSystem);
  headlessGame.actionRegistry.register(new TillActionHandler(soilSystem));
  headlessGame.actionRegistry.register(new HarvestActionHandler());

  // Animals
  headlessGame.systemRegistry.register(new AnimalBrainSystem());
  headlessGame.systemRegistry.register(new AnimalSystem(world.eventBus));
  headlessGame.systemRegistry.register(new AnimalProductionSystem(world.eventBus));
  const wildAnimalSpawning = new WildAnimalSpawningSystem();
  headlessGame.systemRegistry.register(wildAnimalSpawning);
  headlessGame.systemRegistry.register(new TamingSystem());

  // Agent behaviors
  headlessGame.systemRegistry.register(new IdleBehaviorSystem());
  headlessGame.systemRegistry.register(new GoalGenerationSystem(world.eventBus));
  headlessGame.systemRegistry.register(new AgentBrainSystem(null, null));

  // Navigation
  headlessGame.systemRegistry.register(new SocialGradientSystem());
  headlessGame.systemRegistry.register(new ExplorationSystem());
  headlessGame.systemRegistry.register(new SteeringSystem());
  headlessGame.systemRegistry.register(new MovementSystem());
  headlessGame.systemRegistry.register(new CommunicationSystem());

  // Needs and memory
  headlessGame.systemRegistry.register(new NeedsSystem());
  headlessGame.systemRegistry.register(new SleepSystem());
  headlessGame.systemRegistry.register(new MemorySystem());
  headlessGame.systemRegistry.register(new MemoryFormationSystem(world.eventBus));
  headlessGame.systemRegistry.register(new MemoryConsolidationSystem(world.eventBus));
  headlessGame.systemRegistry.register(new BeliefFormationSystem());
  headlessGame.systemRegistry.register(new ReflectionSystem(world.eventBus));
  headlessGame.systemRegistry.register(new JournalingSystem(world.eventBus));

  // Crafting and skills
  registerDefaultMaterials();
  initializeDefaultRecipes(globalRecipeRegistry);
  const craftingSystem = new CraftingSystem();
  craftingSystem.setRecipeRegistry(globalRecipeRegistry);
  headlessGame.systemRegistry.register(craftingSystem);
  headlessGame.systemRegistry.register(new SkillSystem(world.eventBus));
  const cookingSystem = new CookingSystem();
  cookingSystem.setRecipeRegistry(globalRecipeRegistry);
  headlessGame.systemRegistry.register(cookingSystem);

  // Building and resources
  headlessGame.systemRegistry.register(new BuildingSystem());
  headlessGame.systemRegistry.register(new ResourceGatheringSystem(world.eventBus));

  // Trading
  headlessGame.systemRegistry.register(new TradingSystem());

  // Governance
  const governanceSystem = new GovernanceDataSystem();
  governanceSystem.initialize(world, world.eventBus);
  headlessGame.systemRegistry.register(governanceSystem);

  // City Director - the star of the show
  const cityDirectorSystem = new CityDirectorSystem({
    enableLLM: false,
    statsUpdateInterval: 200,
  });
  headlessGame.systemRegistry.register(cityDirectorSystem);

  console.log('  ✓ All systems registered');

  // Create world entity
  console.log('\n[Setup] Creating world...');
  const worldEntity = new EntityImpl(createEntityId(), world.tick);
  worldEntity.addComponent(createTimeComponent());
  worldEntity.addComponent(createWeatherComponent('clear', 0.3, 5000));
  worldEntity.addComponent(createNamedLandmarksComponent());
  (world as any)._addEntity(worldEntity);
  (world as any)._worldEntityId = worldEntity.id;

  // Define city bounds
  const cityCenter = { x: 50, y: 50 };
  const cityBounds = { minX: 0, maxX: 100, minY: 0, maxY: 100 };

  // Create city director entity
  console.log('\n[Setup] Creating city "New Haven"...');
  const cityEntity = new EntityImpl(createEntityId(), world);
  cityEntity.addComponent(createPositionComponent(cityCenter.x, cityCenter.y));
  const directorComp = createCityDirectorComponent('city_new_haven', 'New Haven', cityBounds, false);
  directorComp.meetingInterval = 2000; // Faster meetings for testing
  directorComp.lastDirectorMeeting = -2000;
  cityEntity.addComponent(directorComp);
  (world as any)._addEntity(cityEntity);

  // Populate the world
  console.log('\n[Setup] Populating world...');
  createResources(world, cityBounds);
  createInitialBuildings(world, cityCenter);
  const npcs = createPopulation(world, cityCenter, population);

  // Spawn some animals
  try {
    wildAnimalSpawning.spawnSpecificAnimal(world, 'chicken', { x: cityCenter.x + 10, y: cityCenter.y + 10 });
    wildAnimalSpawning.spawnSpecificAnimal(world, 'rabbit', { x: cityCenter.x - 10, y: cityCenter.y + 5 });
    console.log('  Created initial wildlife');
  } catch (e) {
    console.log('  (Wildlife spawning skipped)');
  }

  // Initial tick to stabilize
  console.log('\n[Setup] Running initial stabilization...');
  headlessGame.runTicks(1000);

  // Collect snapshots
  const snapshots: CitySnapshot[] = [];

  // Initial snapshot
  let director = cityEntity.getComponent<CityDirectorComponent>('city_director' as any);
  if (director) {
    snapshots.push(takeCitySnapshot(director, 0, 0));
    printSnapshot(snapshots[snapshots.length - 1]!);
  }

  // Run simulation
  console.log(`\n[Simulation] Running ${months}-month simulation...`);
  console.log('(Progress: . = 20 batches of 2000 ticks)\n');

  const startTime = Date.now();
  let totalTicks = 0;

  for (let month = 1; month <= months; month++) {
    process.stdout.write(`Month ${month.toString().padStart(2, '0')}: `);

    // Run this month's batches (capped for practical testing)
    const batchesThisMonth = Math.min(BATCHES_PER_MONTH, 200);

    for (let batch = 0; batch < batchesThisMonth; batch++) {
      headlessGame.runTicks(BATCH_SIZE);
      totalTicks += BATCH_SIZE;

      if (batch % 20 === 19) {
        process.stdout.write('.');
      }
    }

    // Take snapshot
    director = cityEntity.getComponent<CityDirectorComponent>('city_director' as any);
    if (director) {
      snapshots.push(takeCitySnapshot(director, month, totalTicks));
      printSnapshot(snapshots[snapshots.length - 1]!);
    }
  }

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  const ticksPerSec = (totalTicks / parseFloat(elapsed)).toFixed(0);

  console.log(`\n[Complete] Ran ${totalTicks.toLocaleString()} ticks in ${elapsed}s (${ticksPerSec} ticks/sec)`);

  // Year summary
  console.log('\n╔════════════════════════════════════════════════════════════════════╗');
  console.log('║                         SIMULATION SUMMARY                         ║');
  console.log('╚════════════════════════════════════════════════════════════════════╝');

  const first = snapshots[0]!;
  const last = snapshots[snapshots.length - 1]!;

  const delta = (start: number, end: number): string => {
    const diff = end - start;
    return diff >= 0 ? `+${diff}` : `${diff}`;
  };

  console.log(`\nCity Growth:`);
  console.log(`  Population:    ${first.population.toString().padStart(3)} → ${last.population.toString().padStart(3)}  (${delta(first.population, last.population)})`);
  console.log(`  Buildings:     ${first.buildings.toString().padStart(3)} → ${last.buildings.toString().padStart(3)}  (${delta(first.buildings, last.buildings)})`);
  console.log(`  Housing Cap:   ${first.housingCapacity.toString().padStart(3)} → ${last.housingCapacity.toString().padStart(3)}  (${delta(first.housingCapacity, last.housingCapacity)})`);
  console.log(`  Storage Cap:   ${first.storageCapacity.toString().padStart(3)} → ${last.storageCapacity.toString().padStart(3)}  (${delta(first.storageCapacity, last.storageCapacity)})`);

  console.log(`\nResources:`);
  console.log(`  Food Supply:   ${first.foodSupply.toFixed(1).padStart(5)} → ${last.foodSupply.toFixed(1).padStart(5)} days`);
  console.log(`  Wood:          ${first.woodSupply.toString().padStart(5)} → ${last.woodSupply.toString().padStart(5)}`);
  console.log(`  Stone:         ${first.stoneSupply.toString().padStart(5)} → ${last.stoneSupply.toString().padStart(5)}`);

  // Focus changes
  console.log(`\nStrategic Focus Changes:`);
  let lastFocus = '';
  for (const snap of snapshots) {
    if (snap.focus !== lastFocus) {
      console.log(`  Month ${snap.month.toString().padStart(2)}: ${snap.focus.toUpperCase()}`);
      lastFocus = snap.focus;
    }
  }

  // Priority distribution
  console.log(`\nPriority Evolution:`);
  console.log(`  Month │ Priority     │ %   │ Concerns`);
  console.log(`  ──────┼──────────────┼─────┼─────────────────────────────`);
  for (const snap of snapshots) {
    const pct = (snap.topPriorityValue * 100).toFixed(0).padStart(3);
    const concerns = snap.concerns.slice(0, 2).join(', ').slice(0, 30) || '-';
    console.log(`    ${snap.month.toString().padStart(2)}  │ ${snap.topPriority.padEnd(12)} │ ${pct}% │ ${concerns}`);
  }

  console.log('\n✓ Simulation complete');
  process.exit(0);
}

// Run
runSimulation().catch((error) => {
  console.error('Simulation failed:', error);
  process.exit(1);
});
