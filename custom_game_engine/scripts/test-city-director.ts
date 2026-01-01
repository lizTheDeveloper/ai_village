/**
 * Test script for the City Director system
 *
 * Creates a city entity with CityDirectorComponent and spawns autonomic NPCs
 * to verify the priority blending and city management system works.
 *
 * Usage:
 *   npx tsx scripts/test-city-director.ts
 */

import {
  GameLoop,
  AgentBrainSystem,
  MovementSystem,
  NeedsSystem,
  MemorySystem,
  MemoryConsolidationSystem,
  CommunicationSystem,
  BuildingSystem,
  ResourceGatheringSystem,
  BuildingBlueprintRegistry,
  TimeSystem,
  SleepSystem,
  createTimeComponent,
  createBuildingComponent,
  createPositionComponent,
  createRenderableComponent,
  createWeatherComponent,
  createInventoryComponent,
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
  type StrategicPriorities,
  CT,
} from '../packages/core/src/index.js';

import {
  TerrainGenerator,
  ChunkManager,
  createWanderingAgent,
} from '../packages/world/src/index.js';

// ============================================================================
// HEADLESS GAME LOOP (simplified)
// ============================================================================

class HeadlessGameLoop {
  private gameLoop: GameLoop;
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private targetFps = 20;
  private lastTime = Date.now();
  private running = false;

  constructor(gameLoop: GameLoop) {
    this.gameLoop = gameLoop;
  }

  get world(): World {
    return this.gameLoop.world;
  }

  get systemRegistry() {
    return this.gameLoop.systemRegistry;
  }

  start(): void {
    if (this.running) return;
    this.running = true;
    this.lastTime = Date.now();

    const frameTime = 1000 / this.targetFps;
    this.intervalId = setInterval(() => {
      const now = Date.now();
      const deltaTime = (now - this.lastTime) / 1000;
      this.lastTime = now;

      try {
        (this.gameLoop as any).tick(deltaTime);
      } catch (error) {
        console.error('[Test] Error in game tick:', error);
      }
    }, frameTime);
  }

  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.running = false;
  }

  tick(): void {
    const now = Date.now();
    const deltaTime = (now - this.lastTime) / 1000;
    this.lastTime = now;
    (this.gameLoop as any).tick(deltaTime);
  }
}

// ============================================================================
// TEST SETUP
// ============================================================================

async function runTest() {
  console.log('='.repeat(60));
  console.log('City Director System Test');
  console.log('='.repeat(60));

  // Create game loop
  const gameLoop = new GameLoop();
  const headlessGame = new HeadlessGameLoop(gameLoop);
  const world = headlessGame.world;

  // Register minimal systems for the test
  console.log('\n[1] Registering systems...');
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
  headlessGame.systemRegistry.register(new AgentBrainSystem(null, null)); // No LLM for this test
  headlessGame.systemRegistry.register(new GovernanceDataSystem());

  // Register the City Director System (rule-based, no LLM)
  const cityDirectorSystem = new CityDirectorSystem({ enableLLM: false });
  headlessGame.systemRegistry.register(cityDirectorSystem);

  console.log('  ✓ Systems registered');

  // Create world entity with time
  console.log('\n[2] Creating world entity...');
  const worldEntity = new EntityImpl(createEntityId(), world);
  worldEntity.addComponent(createTimeComponent());
  worldEntity.addComponent(createWeatherComponent('clear', 0.5, 1000));
  (world as any).worldEntity = worldEntity;
  console.log('  ✓ World entity created');

  // Create a city entity with CityDirectorComponent
  console.log('\n[3] Creating city "Testville"...');
  const cityBounds = { minX: 0, maxX: 50, minY: 0, maxY: 50 };
  const cityEntity = new EntityImpl(createEntityId(), world);
  cityEntity.addComponent(createPositionComponent(25, 25)); // City center

  // Create component and set lastDirectorMeeting to -meetingInterval to trigger immediate meeting
  const directorComp = createCityDirectorComponent('city_testville', 'Testville', cityBounds, false);
  directorComp.lastDirectorMeeting = -directorComp.meetingInterval; // Trigger meeting on first stats update
  cityEntity.addComponent(directorComp);
  (world as any)._addEntity(cityEntity);
  console.log(`  ✓ City entity created: ${cityEntity.id}`);
  console.log(`  ✓ City bounds: (${cityBounds.minX},${cityBounds.minY}) to (${cityBounds.maxX},${cityBounds.maxY})`);

  // Spawn autonomic NPCs within the city
  console.log('\n[4] Spawning 5 autonomic NPCs...');
  const npcs: EntityImpl[] = [];
  for (let i = 0; i < 5; i++) {
    const x = 10 + Math.random() * 30; // Within city bounds
    const y = 10 + Math.random() * 30;
    const npcId = createWanderingAgent(world, x, y, 2.0); // x, y, speed

    // Get the entity from world to update it
    const npc = world.getEntity(npcId) as EntityImpl;
    if (!npc) {
      console.error(`  ✗ Failed to get NPC ${i + 1}`);
      continue;
    }

    // Set to autonomic tier
    npc.updateComponent<AgentComponent>(CT.Agent, (current) => ({
      ...current,
      tier: 'autonomic',
      useLLM: false,
    }));

    npcs.push(npc);
    console.log(`  ✓ Created NPC ${i + 1} at (${x.toFixed(1)}, ${y.toFixed(1)})`);
  }

  // Verify entities exist in world before running
  console.log('\n[4.5] Verifying world state...');
  const allAgents = world.query().with(CT.Agent).with(CT.Position).executeEntities();
  console.log(`  Agents in world: ${allAgents.length}`);
  const allDirectors = world.query().with('city_director' as any).executeEntities();
  console.log(`  City directors in world: ${allDirectors.length}`);

  // Check if agents are within city bounds
  for (const agent of allAgents.slice(0, 3)) {
    const pos = (agent as EntityImpl).getComponent<any>(CT.Position);
    const x = typeof pos?.x === 'number' ? pos.x.toFixed(1) : pos?.x;
    const y = typeof pos?.y === 'number' ? pos.y.toFixed(1) : pos?.y;
    console.log(`  Agent ${agent.id.slice(0, 8)}... at (${x}, ${y})`);
  }

  // Run enough ticks for stats update (200 ticks = stats interval)
  console.log('\n[5] Running simulation (250 ticks)...');
  for (let i = 0; i < 250; i++) {
    headlessGame.tick();
    // Check after stats interval
    if (i === 210) {
      const dirCheck = cityEntity.getComponent<CityDirectorComponent>('city_director' as CT);
      console.log(`  [Debug] After 210 ticks: population=${dirCheck?.stats.population}, agents tracked=${dirCheck?.agentIds.length}`);
    }
  }
  console.log('  ✓ Simulation complete');

  // Check the city director state
  console.log('\n[6] Checking City Director state...');
  const director = cityEntity.getComponent<CityDirectorComponent>('city_director' as CT);
  if (director) {
    console.log(`  City: ${director.cityName}`);
    console.log(`  Population: ${director.stats.population}`);
    console.log(`  Autonomic NPCs: ${director.stats.autonomicNpcCount}`);
    console.log(`  Agent IDs tracked: ${director.agentIds.length}`);
    console.log(`  City Influence: ${(director.cityInfluence * 100).toFixed(0)}%`);
    console.log(`  Current Priorities:`);
    for (const [key, value] of Object.entries(director.priorities)) {
      if (value && value > 0) {
        console.log(`    - ${key}: ${(value * 100).toFixed(1)}%`);
      }
    }
    if (director.reasoning) {
      console.log(`  Focus: ${director.reasoning.focus}`);
      console.log(`  Reasoning: ${director.reasoning.reasoning}`);
      if (director.reasoning.concerns.length > 0) {
        console.log(`  Concerns: ${director.reasoning.concerns.join(', ')}`);
      }
    }
  } else {
    console.error('  ✗ ERROR: CityDirectorComponent not found!');
  }

  // Check if NPCs have effective priorities set
  console.log('\n[7] Checking NPC effective priorities...');
  let npcsWithEffectivePriorities = 0;
  for (const npc of npcs) {
    const agent = npc.getComponent<AgentComponent>(CT.Agent);
    if (agent) {
      if (agent.effectivePriorities) {
        npcsWithEffectivePriorities++;
        console.log(`  ✓ ${npc.id.slice(0, 8)}... has effectivePriorities`);
        // Show a sample of priorities
        const ep = agent.effectivePriorities;
        const topPriority = Object.entries(ep)
          .filter(([_, v]) => v !== undefined && v > 0)
          .sort((a, b) => (b[1] ?? 0) - (a[1] ?? 0))[0];
        if (topPriority) {
          console.log(`    Top priority: ${topPriority[0]} (${((topPriority[1] ?? 0) * 100).toFixed(1)}%)`);
        }
      } else {
        console.log(`  - ${npc.id.slice(0, 8)}... no effectivePriorities yet (may need more ticks)`);
      }
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('TEST RESULTS');
  console.log('='.repeat(60));

  const tests = [
    { name: 'City Director created', passed: !!director },
    { name: 'Population tracked', passed: director && director.stats.population >= 5 },
    { name: 'Agent IDs tracked', passed: director && director.agentIds.length >= 5 },
    { name: 'Priorities set', passed: director && Object.values(director.priorities).some(v => v && v > 0) },
    { name: 'Reasoning available', passed: director && !!director.reasoning },
  ];

  let passed = 0;
  for (const test of tests) {
    const status = test.passed ? '✓ PASS' : '✗ FAIL';
    console.log(`  ${status}: ${test.name}`);
    if (test.passed) passed++;
  }

  console.log('\n' + `${passed}/${tests.length} tests passed`);
  console.log('='.repeat(60));

  // Exit
  process.exit(passed === tests.length ? 0 : 1);
}

// Run the test
runTest().catch((error) => {
  console.error('Test failed with error:', error);
  process.exit(1);
});
