/**
 * Headless Reproduction & Parasitic Hive Mind Test
 *
 * Tests:
 * 1. Love and attraction between agents
 * 2. Mating and reproduction
 * 3. Parasitic hive mind colonization and resistance
 * 4. Hive pressure mechanics
 *
 * Usage:
 *   npx tsx demo/headless-reproduction-test.ts
 */

import * as fs from 'fs';
import * as path from 'path';

// Load .env file
const envPath = path.join(import.meta.dirname, '..', '.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8');
  for (const line of envContent.split('\n')) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const [key, ...valueParts] = trimmed.split('=');
      if (key) {
        process.env[key] = valueParts.join('=');
      }
    }
  }
  console.log('[Test] Loaded .env file');
}

import {
  GameLoop,
  AgentBrainSystem,
  MovementSystem,
  NeedsSystem,
  CommunicationSystem,
  TimeSystem,
  BodySystem,
  ReproductionSystem,
  ColonizationSystem,
  ParasiticReproductionSystem,
  createTimeComponent,
  createPositionComponent,
  createRenderableComponent,
  createWeatherComponent,
  EntityImpl,
  createEntityId,
  type World,
  type WorldMutator,
  SteeringSystem,
  SocialGradientSystem,
  IdleBehaviorSystem,
  SexualityComponent,
  createSexualityComponent,
  ReproductiveMorphComponent,
  createFemaleMorph,
  createMaleMorph,
  ParasiticColonizationComponent,
  createPotentialHost,
  createColonizedHost,
  CollectiveMindComponent,
  createCollective,
} from '../packages/core/src/index.ts';

import {
  OpenAICompatProvider,
  LLMDecisionQueue,
  StructuredPromptBuilder,
} from '../packages/llm/src/index.ts';

import {
  createLLMAgent,
} from '../packages/world/src/index.ts';

// ============================================================================
// TEST CONFIGURATION
// ============================================================================

const TEST_CONFIG = {
  ticksToRun: 500,
  agentCount: 8, // 4 male, 4 female for mating tests
  colonizedCount: 3, // Initial colonized hosts
  useGroq: true,
  verbose: true,
};

// ============================================================================
// HEADLESS GAME LOOP
// ============================================================================

class HeadlessGameLoop {
  private gameLoop: GameLoop;
  private running = false;
  private tickCount = 0;

  constructor(gameLoop: GameLoop) {
    this.gameLoop = gameLoop;
  }

  get world(): World {
    return this.gameLoop.world;
  }

  get systemRegistry() {
    return this.gameLoop.systemRegistry;
  }

  tick(deltaTime: number = 1/30): void {
    try {
      (this.gameLoop as any).tick(deltaTime);
      this.tickCount++;
    } catch (error) {
      console.error('[Test] Error in game tick:', error);
    }
  }

  getTickCount(): number {
    return this.tickCount;
  }
}

// ============================================================================
// ENTITY CREATION
// ============================================================================

function createWorldEntity(world: WorldMutator) {
  const worldEntity = new EntityImpl(createEntityId(), (world as any)._tick);
  worldEntity.addComponent(createTimeComponent(12, 600)); // Noon, 600 ticks/day
  worldEntity.addComponent(createWeatherComponent('clear', 0, 120));
  (world as any)._addEntity(worldEntity);
  (world as any)._worldEntityId = worldEntity.id;
  return worldEntity;
}

function createTestAgent(
  world: WorldMutator,
  x: number,
  y: number,
  sex: 'male' | 'female',
  isColonized: boolean = false,
  collectiveId?: string,
): EntityImpl {
  const agentId = createLLMAgent(world, x, y, 2.0);
  const agent = (world as any).entities.get(agentId) as EntityImpl;

  // Ensure position is set correctly (createLLMAgent may use different coords)
  const pos = agent.components.get('position') as { x: number; y: number } | undefined;
  if (pos) {
    pos.x = x;
    pos.y = y;
  }

  // Add sexuality component
  const sexuality = createSexualityComponent({
    sexualOrientation: [{ target: sex === 'male' ? 'female' : 'male', intensity: 0.8 }],
    romanticOrientation: [{ target: sex === 'male' ? 'female' : 'male', intensity: 0.8 }],
  });
  agent.addComponent(sexuality);

  // Add reproductive morph
  const morph = sex === 'female' ? createFemaleMorph() : createMaleMorph();
  agent.addComponent(morph);

  // Add parasitic colonization component
  if (isColonized && collectiveId) {
    const colonization = createColonizedHost(
      collectiveId,
      'ear_entry',
      `lineage-${Date.now()}`,
      0 as any, // tick
      0.5, // partial integration
    );
    agent.addComponent(colonization);
  } else {
    // Potential host
    const colonization = createPotentialHost(0.4); // 40% base resistance
    agent.addComponent(colonization);
  }

  return agent;
}

function createCollectiveEntity(world: WorldMutator): EntityImpl {
  const collective = new EntityImpl(createEntityId(), (world as any)._tick);
  const collectiveComponent = createCollective('the-pluribus', 'expansion');
  collective.addComponent(collectiveComponent);
  collective.addComponent(createPositionComponent(0, 0)); // Central location
  (world as any)._addEntity(collective);
  return collective;
}

// ============================================================================
// TEST REPORTING
// ============================================================================

interface TestReport {
  ticksRun: number;
  agents: {
    total: number;
    mated: number;
    attracted: number;
  };
  parasitic: {
    collectivesActive: number;
    colonizedHosts: number;
    resistingHosts: number;
    avgHivePressure: number;
    controlLevels: Record<string, number>;
  };
  events: string[];
}

function generateReport(world: World, events: string[]): TestReport {
  const report: TestReport = {
    ticksRun: 0,
    agents: { total: 0, mated: 0, attracted: 0 },
    parasitic: {
      collectivesActive: 0,
      colonizedHosts: 0,
      resistingHosts: 0,
      avgHivePressure: 0,
      controlLevels: {},
    },
    events,
  };

  let totalPressure = 0;

  for (const entity of world.entities.values()) {
    const impl = entity as EntityImpl;

    // Check for agents with sexuality
    const sexuality = impl.getComponent<SexualityComponent>('sexuality');
    if (sexuality) {
      report.agents.total++;
      if (sexuality.currentMates.length > 0) {
        report.agents.mated++;
      }
      if (sexuality.activeAttractions.length > 0) {
        report.agents.attracted++;
      }
    }

    // Check for collective minds
    const collective = impl.getComponent<CollectiveMindComponent>('collective_mind');
    if (collective) {
      report.parasitic.collectivesActive++;
    }

    // Check for colonization
    const colonization = impl.getComponent<ParasiticColonizationComponent>('parasitic_colonization');
    if (colonization) {
      if (colonization.isColonized) {
        report.parasitic.colonizedHosts++;
        totalPressure += colonization.hivePressure;

        const level = colonization.controlLevel;
        report.parasitic.controlLevels[level] = (report.parasitic.controlLevels[level] || 0) + 1;

        if (colonization.isResisting) {
          report.parasitic.resistingHosts++;
        }
      }
    }
  }

  if (report.parasitic.colonizedHosts > 0) {
    report.parasitic.avgHivePressure = totalPressure / report.parasitic.colonizedHosts;
  }

  return report;
}

function printReport(report: TestReport): void {
  console.log('\n' + '='.repeat(60));
  console.log('TEST REPORT');
  console.log('='.repeat(60));

  console.log('\nAGENTS:');
  console.log(`  Total: ${report.agents.total}`);
  console.log(`  With Active Attraction: ${report.agents.attracted}`);
  console.log(`  Currently Mated: ${report.agents.mated}`);

  console.log('\nPARASITIC HIVE MINDS:');
  console.log(`  Active Collectives: ${report.parasitic.collectivesActive}`);
  console.log(`  Colonized Hosts: ${report.parasitic.colonizedHosts}`);
  console.log(`  Resisting: ${report.parasitic.resistingHosts}`);
  console.log(`  Avg Hive Pressure: ${(report.parasitic.avgHivePressure * 100).toFixed(1)}%`);

  if (Object.keys(report.parasitic.controlLevels).length > 0) {
    console.log('  Control Levels:');
    for (const [level, count] of Object.entries(report.parasitic.controlLevels)) {
      console.log(`    ${level}: ${count}`);
    }
  }

  if (report.events.length > 0) {
    console.log('\nKEY EVENTS:');
    for (const event of report.events.slice(-10)) {
      console.log(`  - ${event}`);
    }
  }

  console.log('\n' + '='.repeat(60));
}

// ============================================================================
// MAIN
// ============================================================================

async function main() {
  console.log('='.repeat(60));
  console.log('REPRODUCTION & PARASITIC HIVE MIND TEST');
  console.log('='.repeat(60));

  const events: string[] = [];

  // Setup LLM provider
  let provider = null;
  let queue = null;
  let promptBuilder = null;

  if (TEST_CONFIG.useGroq && process.env.GROQ_API_KEY) {
    console.log('[Test] Using Groq with qwen/qwen3-32b');
    provider = new OpenAICompatProvider(
      'qwen/qwen3-32b',
      'https://api.groq.com/openai/v1',
      process.env.GROQ_API_KEY
    );
    queue = new LLMDecisionQueue(provider, 3);
    promptBuilder = new StructuredPromptBuilder();
    events.push('LLM: Groq qwen3-32b initialized');
  } else {
    console.log('[Test] Running without LLM (scripted mode)');
    events.push('LLM: Disabled (scripted mode)');
  }

  // Create game loop
  const baseGameLoop = new GameLoop();
  const headlessLoop = new HeadlessGameLoop(baseGameLoop);

  // Create world entity
  createWorldEntity(baseGameLoop.world);

  // Register systems
  console.log('[Test] Registering systems...');
  headlessLoop.systemRegistry.register(new TimeSystem());
  headlessLoop.systemRegistry.register(new BodySystem());
  headlessLoop.systemRegistry.register(new ReproductionSystem());
  const colonizationSystem = new ColonizationSystem();
  headlessLoop.systemRegistry.register(colonizationSystem);
  headlessLoop.systemRegistry.register(new ParasiticReproductionSystem());
  headlessLoop.systemRegistry.register(new SocialGradientSystem());
  headlessLoop.systemRegistry.register(new SteeringSystem());
  headlessLoop.systemRegistry.register(new CommunicationSystem());
  headlessLoop.systemRegistry.register(new NeedsSystem());
  headlessLoop.systemRegistry.register(new IdleBehaviorSystem());
  headlessLoop.systemRegistry.register(new MovementSystem());
  headlessLoop.systemRegistry.register(new AgentBrainSystem(queue, promptBuilder));

  // Create collective
  console.log('[Test] Creating parasitic collective...');
  const collective = createCollectiveEntity(baseGameLoop.world);
  const collectiveComponent = (collective as EntityImpl).getComponent<CollectiveMindComponent>('collective_mind');
  events.push(`Collective created: ${collectiveComponent?.collectiveId}`);

  // Create agents
  console.log('[Test] Creating test agents...');
  const agents: EntityImpl[] = [];

  // Create 4 females (2 colonized, 2 free) - clustered together for hive pressure
  for (let i = 0; i < 4; i++) {
    const x = (i % 2) * 2; // 0, 2, 0, 2
    const y = Math.floor(i / 2) * 2; // 0, 0, 2, 2
    const isColonized = i < 2;
    const agent = createTestAgent(
      baseGameLoop.world,
      x, y,
      'female',
      isColonized,
      isColonized ? 'the-pluribus' : undefined
    );
    agents.push(agent);
    events.push(`Female agent created at (${x}, ${y}) - ${isColonized ? 'COLONIZED' : 'free'}`);
  }

  // Create 4 males (1 colonized, 3 free) - near the females for hive pressure
  for (let i = 0; i < 4; i++) {
    const x = (i % 2) * 2 + 1; // 1, 3, 1, 3
    const y = Math.floor(i / 2) * 2 + 1; // 1, 1, 3, 3
    const isColonized = i < 1;
    const agent = createTestAgent(
      baseGameLoop.world,
      x, y,
      'male',
      isColonized,
      isColonized ? 'the-pluribus' : undefined
    );
    agents.push(agent);
    events.push(`Male agent created at (${x}, ${y}) - ${isColonized ? 'COLONIZED' : 'free'}`);
  }

  console.log(`[Test] Created ${agents.length} agents (${TEST_CONFIG.colonizedCount} initially colonized)`);

  // Run simulation
  console.log(`\n[Test] Running ${TEST_CONFIG.ticksToRun} ticks...`);
  const startTime = Date.now();

  for (let tick = 0; tick < TEST_CONFIG.ticksToRun; tick++) {
    headlessLoop.tick(1/30);

    // Log progress every 100 ticks
    if (tick > 0 && tick % 100 === 0) {
      const elapsed = Date.now() - startTime;
      console.log(`[Test] Tick ${tick}/${TEST_CONFIG.ticksToRun} (${elapsed}ms elapsed)`);

      // Check colonization spread
      let colonized = 0;
      let resisting = 0;
      for (const agent of agents) {
        const col = agent.getComponent<ParasiticColonizationComponent>('parasitic_colonization');
        if (col?.isColonized) colonized++;
        if (col?.isResisting) resisting++;
      }
      events.push(`Tick ${tick}: ${colonized} colonized, ${resisting} resisting`);
    }
  }

  const totalTime = Date.now() - startTime;
  console.log(`\n[Test] Completed ${TEST_CONFIG.ticksToRun} ticks in ${totalTime}ms`);

  // Generate report
  const report = generateReport(headlessLoop.world, events);
  report.ticksRun = TEST_CONFIG.ticksToRun;

  printReport(report);

  // Test hive pressure explicitly
  console.log('\n[Test] Hive Pressure Check:');
  const colonizedAgents: Array<{ id: string; x: number; y: number; col: ParasiticColonizationComponent }> = [];
  for (const agent of agents) {
    const col = agent.getComponent<ParasiticColonizationComponent>('parasitic_colonization');
    const pos = agent.components.get('position') as { x: number; y: number } | undefined;
    const agentComp = agent.getComponent<{ name?: string }>('agent');
    if (col?.isColonized && pos) {
      colonizedAgents.push({ id: agent.id, x: pos.x, y: pos.y, col });
      console.log(`  ${agentComp?.name || agent.id.slice(0,8)}: pos=(${pos.x},${pos.y}), pressure=${(col.hivePressure * 100).toFixed(0)}%, nearby=${col.nearbyColonizedCount}, control=${col.controlLevel}`);
    }
  }

  // Manually calculate distances between colonized hosts
  console.log('\n[Test] Distances between colonized hosts:');
  for (let i = 0; i < colonizedAgents.length; i++) {
    for (let j = i + 1; j < colonizedAgents.length; j++) {
      const a = colonizedAgents[i]!;
      const b = colonizedAgents[j]!;
      const dx = a.x - b.x;
      const dy = a.y - b.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      console.log(`  ${a.id.slice(0,8)} <-> ${b.id.slice(0,8)}: ${dist.toFixed(1)} units`);
    }
  }

  // Manually update hive pressure for each colonized agent
  console.log('\n[Test] Manually updating hive pressure...');
  for (const ca of colonizedAgents) {
    // Count nearby colonized within 10 units from same collective
    let nearbyCount = 0;
    for (const other of colonizedAgents) {
      if (other.id === ca.id) continue;
      if (other.col.parasite?.collectiveId !== ca.col.parasite?.collectiveId) continue;
      const dx = ca.x - other.x;
      const dy = ca.y - other.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist <= 10) nearbyCount++;
    }
    ca.col.updateHivePressure(nearbyCount, 5);
    console.log(`  ${ca.id.slice(0,8)}: updated pressure=${(ca.col.hivePressure * 100).toFixed(0)}% (${nearbyCount} nearby)`);
  }

  // Attempt colonization on a free agent
  console.log('\n[Test] Testing colonization attempt on free agent...');
  const freeAgent = agents.find(a => {
    const col = a.getComponent<ParasiticColonizationComponent>('parasitic_colonization');
    return col && !col.isColonized;
  });

  if (freeAgent) {
    const result = colonizationSystem.attemptColonization(
      headlessLoop.world,
      freeAgent.id,
      'the-pluribus',
      'spore_inhalation',
      500 as any, // tick
      1.0
    );
    console.log(`  Result: ${result.success ? 'SUCCESS' : 'FAILED'} - ${result.reason}`);
    events.push(`Colonization attempt: ${result.success ? 'SUCCESS' : 'FAILED'}`);
  }

  console.log('\n[Test] Test complete!');
  console.log('[Test] Dashboard view available at: curl "http://localhost:8766/dashboard/view/parasitic-hivemind"');
}

main().catch((error) => {
  console.error('[Test] Fatal error:', error);
  process.exit(1);
});
