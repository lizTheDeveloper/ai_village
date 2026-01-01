/**
 * Test script for City Director - One Year Simulation
 *
 * Runs the city for a full game year and tracks how it evolves.
 * Logs city state at monthly intervals.
 *
 * Game time:
 * - 20 TPS (ticks per second)
 * - 1 game day = 14400 ticks (12 minutes real time at 20 TPS)
 * - 1 game month = 30 days = 432,000 ticks
 * - 1 game year = 365 days = 5,256,000 ticks
 *
 * For practical testing, we'll use accelerated time:
 * - Run 1000 ticks per "batch"
 * - Sample state every ~30 game days (432 batches)
 *
 * Usage:
 *   npx tsx scripts/test-city-director-year.ts
 */

import {
  GameLoop,
  AgentBrainSystem,
  MovementSystem,
  NeedsSystem,
  MemorySystem,
  MemoryConsolidationSystem,
  TimeSystem,
  SleepSystem,
  BuildingSystem,
  ResourceGatheringSystem,
  createTimeComponent,
  createPositionComponent,
  createWeatherComponent,
  createBuildingComponent,
  createInventoryComponent,
  createRenderableComponent,
  EntityImpl,
  createEntityId,
  type World,
  SteeringSystem,
  ExplorationSystem,
  SocialGradientSystem,
  SkillSystem,
  IdleBehaviorSystem,
  GoalGenerationSystem,
  GovernanceDataSystem,
  CityDirectorSystem,
  createCityDirectorComponent,
  type CityDirectorComponent,
  type AgentComponent,
  type SteeringComponent,
  CT,
} from '../packages/core/src/index.js';

import {
  createWanderingAgent,
} from '../packages/world/src/index.js';

// ============================================================================
// HEADLESS GAME LOOP (simplified)
// ============================================================================

class HeadlessGameLoop {
  private gameLoop: GameLoop;
  private lastTime = Date.now();

  constructor(gameLoop: GameLoop) {
    this.gameLoop = gameLoop;
  }

  get world(): World {
    return this.gameLoop.world;
  }

  get systemRegistry() {
    return this.gameLoop.systemRegistry;
  }

  tick(): void {
    const now = Date.now();
    const deltaTime = (now - this.lastTime) / 1000;
    this.lastTime = now;
    (this.gameLoop as any).tick(Math.min(deltaTime, 0.1)); // Cap delta to avoid huge jumps
  }

  // Run multiple ticks quickly (for simulation acceleration)
  runTicks(count: number): void {
    for (let i = 0; i < count; i++) {
      (this.gameLoop as any).tick(0.05); // Fixed delta for consistency
    }
  }
}

// ============================================================================
// SIMULATION CONSTANTS
// ============================================================================

const TICKS_PER_DAY = 14400;
const TICKS_PER_MONTH = TICKS_PER_DAY * 30;
const TICKS_PER_YEAR = TICKS_PER_DAY * 365;

// For faster simulation, we'll run in batches
// Reduced batch size for faster testing with larger populations
const BATCH_SIZE = 500; // Ticks per batch (reduced from 1000)
const BATCHES_PER_MONTH = Math.ceil(TICKS_PER_MONTH / BATCH_SIZE);

// ============================================================================
// CITY STATE SNAPSHOT
// ============================================================================

interface CitySnapshot {
  month: number;
  tick: number;
  population: number;
  autonomicNpcs: number;
  buildings: number;
  housingCapacity: number;
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
  const bar = (value: number, max: number, width: number = 20): string => {
    const filled = Math.min(Math.round((value / max) * width), width);
    return '█'.repeat(filled) + '░'.repeat(width - filled);
  };

  console.log(`\n┌─────────────────────────────────────────────────────────────┐`);
  console.log(`│ MONTH ${snapshot.month.toString().padStart(2, '0')} (Tick ${snapshot.tick.toLocaleString().padStart(10, ' ')})                              │`);
  console.log(`├─────────────────────────────────────────────────────────────┤`);
  console.log(`│ Population: ${snapshot.population.toString().padStart(3, ' ')} (${snapshot.autonomicNpcs} autonomic)                            │`);
  console.log(`│ Buildings:  ${snapshot.buildings.toString().padStart(3, ' ')} (Housing cap: ${snapshot.housingCapacity})                         │`);
  console.log(`│ Food:       ${bar(snapshot.foodSupply, 30)} ${snapshot.foodSupply.toFixed(1).padStart(5, ' ')} days │`);
  console.log(`│ Wood:       ${bar(snapshot.woodSupply, 100)} ${snapshot.woodSupply.toString().padStart(5, ' ')}      │`);
  console.log(`│ Stone:      ${bar(snapshot.stoneSupply, 100)} ${snapshot.stoneSupply.toString().padStart(5, ' ')}      │`);
  console.log(`│ Threats:    ${snapshot.threats}                                                │`.slice(0, 65) + '│');
  console.log(`├─────────────────────────────────────────────────────────────┤`);
  console.log(`│ Focus: ${snapshot.focus.padEnd(15, ' ')} Priority: ${snapshot.topPriority} (${(snapshot.topPriorityValue * 100).toFixed(0)}%)       │`.slice(0, 65) + '│');
  if (snapshot.concerns.length > 0) {
    console.log(`│ Concerns: ${snapshot.concerns.slice(0, 2).join(', ').slice(0, 50).padEnd(50, ' ')} │`);
  }
  console.log(`└─────────────────────────────────────────────────────────────┘`);
}

// ============================================================================
// MAIN SIMULATION
// ============================================================================

async function runYearSimulation() {
  console.log('╔═════════════════════════════════════════════════════════════╗');
  console.log('║        CITY DIRECTOR - ONE YEAR SIMULATION                  ║');
  console.log('╚═════════════════════════════════════════════════════════════╝');

  // Create game loop
  const gameLoop = new GameLoop();
  const headlessGame = new HeadlessGameLoop(gameLoop);
  const world = headlessGame.world;

  // Register systems needed for survival simulation
  console.log('\n[Setup] Registering systems...');
  headlessGame.systemRegistry.register(new TimeSystem());
  headlessGame.systemRegistry.register(new SleepSystem());
  headlessGame.systemRegistry.register(new NeedsSystem());
  headlessGame.systemRegistry.register(new MemorySystem());
  headlessGame.systemRegistry.register(new MemoryConsolidationSystem(world.eventBus));
  headlessGame.systemRegistry.register(new SteeringSystem());
  headlessGame.systemRegistry.register(new MovementSystem());
  headlessGame.systemRegistry.register(new ExplorationSystem());
  headlessGame.systemRegistry.register(new SocialGradientSystem());
  headlessGame.systemRegistry.register(new IdleBehaviorSystem());
  headlessGame.systemRegistry.register(new SkillSystem(world.eventBus));
  headlessGame.systemRegistry.register(new AgentBrainSystem(null, null));
  headlessGame.systemRegistry.register(new GovernanceDataSystem());
  // Add building and resource gathering for food survival
  headlessGame.systemRegistry.register(new BuildingSystem());
  headlessGame.systemRegistry.register(new ResourceGatheringSystem(world.eventBus));

  // City Director with faster meeting interval for testing (every 1000 ticks instead of 14400)
  const cityDirectorSystem = new CityDirectorSystem({
    enableLLM: false,
    statsUpdateInterval: 100, // Update stats more frequently
  });
  headlessGame.systemRegistry.register(cityDirectorSystem);

  // Create world entity with slower game time for balanced simulation
  // Default dayLength is 48s per game day. Increase to 480s (10x slower) so agents can keep up
  const worldEntity = new EntityImpl(createEntityId(), world);
  worldEntity.addComponent(createTimeComponent(6, 480, 1)); // dawn, 480s day, 1x speed
  worldEntity.addComponent(createWeatherComponent('clear', 0.5, 1000));
  (world as any).worldEntity = worldEntity;

  // Create city
  console.log('[Setup] Creating city "Riverside"...');
  // City bounds - agents will be kept inside via containment steering
  // Larger bounds for larger populations
  const cityBounds = { minX: 0, maxX: 200, minY: 0, maxY: 200 };
  const cityEntity = new EntityImpl(createEntityId(), world);
  cityEntity.addComponent(createPositionComponent(50, 50));

  const directorComp = createCityDirectorComponent('city_riverside', 'Riverside', cityBounds, false);
  // Faster meeting interval for simulation (every 1000 ticks = ~1 minute real, ~1 hour game)
  directorComp.meetingInterval = 1000;
  directorComp.lastDirectorMeeting = -1000; // Trigger first meeting immediately
  cityEntity.addComponent(directorComp);
  (world as any)._addEntity(cityEntity);

  // Create multiple storage buildings with abundant food throughout city
  // SeekFoodBehavior looks for Plant entities with fruit OR storage buildings with edible items
  // Since we can't easily create Plant entities, we use multiple storage buildings
  console.log('[Setup] Creating food storage network...');
  const storageLocations = [
    { x: 100, y: 100 }, // Center
    { x: 50, y: 50 },   // SW quadrant
    { x: 150, y: 50 },  // SE quadrant
    { x: 50, y: 150 },  // NW quadrant
    { x: 150, y: 150 }, // NE quadrant
    { x: 100, y: 50 },  // S center
    { x: 100, y: 150 }, // N center
    { x: 50, y: 100 },  // W center
    { x: 150, y: 100 }, // E center
  ];
  for (const loc of storageLocations) {
    const storageEntity = new EntityImpl(createEntityId(), world);
    storageEntity.addComponent(createBuildingComponent('storage-chest', 1, 100));
    storageEntity.addComponent(createPositionComponent(loc.x, loc.y));
    storageEntity.addComponent(createRenderableComponent('storage-chest', 'object'));
    const storageInventory = createInventoryComponent(20, 500);
    storageInventory.slots[0] = { itemId: 'food', quantity: 500 }; // Abundant food in each storage
    storageEntity.addComponent(storageInventory);
    (world as any)._addEntity(storageEntity);
  }
  console.log(`  Created ${storageLocations.length} storage buildings with 500 food each`);

  // Spawn initial population with starting food
  const INITIAL_POPULATION = 200;
  console.log(`[Setup] Spawning ${INITIAL_POPULATION} initial citizens...`);
  for (let i = 0; i < INITIAL_POPULATION; i++) {
    // Spawn NPCs spread across city area
    const x = 20 + Math.random() * 160;
    const y = 20 + Math.random() * 160;
    const npcId = createWanderingAgent(world, x, y, 2.0);
    const npc = world.getEntity(npcId) as EntityImpl;
    if (npc) {
      npc.updateComponent<AgentComponent>(CT.Agent, (current) => ({
        ...current,
        tier: 'autonomic',
        useLLM: false,
      }));
      // Apply containment bounds immediately to prevent wandering out of city
      npc.updateComponent<SteeringComponent>(CT.Steering, (current) => ({
        ...current,
        containmentBounds: cityBounds,
        containmentMargin: 20,
      }));
      // Give each NPC starting food in their inventory
      const inventory = npc.getComponent<any>(CT.Inventory);
      if (inventory) {
        npc.updateComponent(CT.Inventory, (inv: any) => ({
          ...inv,
          slots: [
            { itemId: 'food', quantity: 20 }, // Each NPC starts with 20 food
            ...inv.slots.slice(1),
          ],
        }));
      }
    }
  }

  // Run initial ticks to establish baseline
  console.log('[Setup] Running initial simulation...');
  headlessGame.runTicks(500);

  // Collect snapshots
  const snapshots: CitySnapshot[] = [];

  // Take initial snapshot
  let director = cityEntity.getComponent<CityDirectorComponent>('city_director' as any);
  if (director) {
    snapshots.push(takeCitySnapshot(director, 0, 0));
    printSnapshot(snapshots[snapshots.length - 1]!);
  }

  // Run for 6 months (faster testing)
  const MONTHS_TO_RUN = 6;
  console.log(`\n[Simulation] Running ${MONTHS_TO_RUN}-month simulation...`);
  console.log('(Each month = ~432,000 ticks, running in accelerated batches)\n');

  const startTime = Date.now();

  for (let month = 1; month <= MONTHS_TO_RUN; month++) {
    // Run batches for this month
    const batchesThisMonth = Math.min(BATCHES_PER_MONTH, 100); // Cap for practical testing

    for (let batch = 0; batch < batchesThisMonth; batch++) {
      headlessGame.runTicks(BATCH_SIZE);

      // Progress indicator
      if (batch % 20 === 0) {
        process.stdout.write('.');
      }
    }

    // Take monthly snapshot
    director = cityEntity.getComponent<CityDirectorComponent>('city_director' as any);
    if (director) {
      const ticksRun = month * batchesThisMonth * BATCH_SIZE;
      snapshots.push(takeCitySnapshot(director, month, ticksRun));
      printSnapshot(snapshots[snapshots.length - 1]!);
    }
  }

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`\n[Simulation Complete] Ran in ${elapsed} seconds real time`);

  // Summary
  console.log('\n╔═════════════════════════════════════════════════════════════╗');
  console.log('║                    YEAR SUMMARY                             ║');
  console.log('╚═════════════════════════════════════════════════════════════╝');

  const first = snapshots[0]!;
  const last = snapshots[snapshots.length - 1]!;

  console.log(`\nPopulation:    ${first.population} → ${last.population} (${last.population >= first.population ? '+' : ''}${last.population - first.population})`);
  console.log(`Buildings:     ${first.buildings} → ${last.buildings} (${last.buildings >= first.buildings ? '+' : ''}${last.buildings - first.buildings})`);
  console.log(`Food Supply:   ${first.foodSupply.toFixed(1)} → ${last.foodSupply.toFixed(1)} days`);
  console.log(`Wood Supply:   ${first.woodSupply} → ${last.woodSupply}`);
  console.log(`Stone Supply:  ${first.stoneSupply} → ${last.stoneSupply}`);

  // Focus changes over time
  console.log('\nFocus Timeline:');
  let lastFocus = '';
  for (const snap of snapshots) {
    if (snap.focus !== lastFocus) {
      console.log(`  Month ${snap.month}: ${snap.focus.toUpperCase()}`);
      lastFocus = snap.focus;
    }
  }

  // Priority evolution
  console.log('\nTop Priority by Month:');
  for (const snap of snapshots) {
    const pct = (snap.topPriorityValue * 100).toFixed(0);
    console.log(`  Month ${snap.month.toString().padStart(2, ' ')}: ${snap.topPriority.padEnd(12, ' ')} ${pct}%`);
  }

  console.log('\n✓ Year simulation complete');
  process.exit(0);
}

// Run the simulation
runYearSimulation().catch((error) => {
  console.error('Simulation failed:', error);
  process.exit(1);
});
