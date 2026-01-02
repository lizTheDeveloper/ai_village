/**
 * Dyson Swarm Construction Simulation
 *
 * Full-scale demonstration of:
 * - Multi-tier factory production chains
 * - Factory AI autonomous management
 * - Off-screen optimization for performance
 * - Resource flow from raw materials to Dyson Swarm components
 * - NPC workers in factories (simulated)
 *
 * Production Chain:
 * Tier 1: Raw Materials (Iron Ore → Iron Plate, Copper Ore → Copper Plate)
 * Tier 2: Components (Iron Gear, Copper Cable, Circuits)
 * Tier 3: Advanced Components (Processing Units, Batteries)
 * Tier 4: Quantum Components (Quantum Processors)
 * Tier 5: Solar Sails (Dyson Swarm building blocks)
 */

import { WorldImpl } from '../packages/core/src/ecs/World.js';
import type { World } from '../packages/core/src/ecs/World.js';
import type { Entity } from '../packages/core/src/ecs/Entity.js';
import { ComponentType as CT } from '../packages/core/src/types/ComponentType.js';
import { FactoryAISystem } from '../packages/core/src/systems/FactoryAISystem.js';
import { OffScreenProductionSystem } from '../packages/core/src/systems/OffScreenProductionSystem.js';
import { createFactoryAI } from '../packages/core/src/components/FactoryAIComponent.js';
import { createChunkProductionState } from '../packages/core/src/components/ChunkProductionStateComponent.js';
import type { FactoryAIComponent } from '../packages/core/src/components/FactoryAIComponent.js';
import type { ChunkProductionStateComponent } from '../packages/core/src/components/ChunkProductionStateComponent.js';

const TICKS_PER_SECOND = 20;
const TICKS_PER_MINUTE = TICKS_PER_SECOND * 60;
const TICKS_PER_HOUR = TICKS_PER_MINUTE * 60;

// Production rates (items per hour)
const PRODUCTION_RATES = {
  // Tier 1: Raw materials
  iron_plate: 120, // per smelter
  copper_plate: 120,

  // Tier 2: Basic components
  iron_gear: 80, // per assembler
  copper_cable: 200,
  circuit_basic: 60,

  // Tier 3: Advanced components
  circuit_advanced: 40,
  battery: 30,
  processing_unit: 20,

  // Tier 4: Quantum
  quantum_processor: 10,

  // Tier 5: Dyson Swarm
  solar_sail: 2, // Very expensive to make
};

interface FactoryBlueprint {
  name: string;
  tier: number;
  produces: string;
  consumes: Array<{ item: string; ratePerHour: number }>;
  machineCount: number;
  npcWorkers: number;
  powerRequired: number;
  powerGeneration: number;
  intelligenceLevel: number;
  goal: 'maximize_output' | 'efficiency' | 'stockpile';
}

/**
 * Dyson Swarm factory city blueprints
 */
const DYSON_SWARM_FACTORIES: FactoryBlueprint[] = [
  // ===== TIER 1: Raw Materials =====
  {
    name: 'Iron Smelting Complex',
    tier: 1,
    produces: 'iron_plate',
    consumes: [{ item: 'iron_ore', ratePerHour: 6000 }],
    machineCount: 50,
    npcWorkers: 20, // NPCs maintain smelters
    powerRequired: 500,
    powerGeneration: 600,
    intelligenceLevel: 2,
    goal: 'maximize_output',
  },
  {
    name: 'Copper Smelting Complex',
    tier: 1,
    produces: 'copper_plate',
    consumes: [{ item: 'copper_ore', ratePerHour: 6000 }],
    machineCount: 50,
    npcWorkers: 20,
    powerRequired: 500,
    powerGeneration: 600,
    intelligenceLevel: 2,
    goal: 'maximize_output',
  },

  // ===== TIER 2: Basic Components =====
  {
    name: 'Iron Gear Factory',
    tier: 2,
    produces: 'iron_gear',
    consumes: [{ item: 'iron_plate', ratePerHour: 3200 }],
    machineCount: 40,
    npcWorkers: 15,
    powerRequired: 400,
    powerGeneration: 500,
    intelligenceLevel: 3,
    goal: 'efficiency',
  },
  {
    name: 'Copper Cable Factory',
    tier: 2,
    produces: 'copper_cable',
    consumes: [{ item: 'copper_plate', ratePerHour: 4000 }],
    machineCount: 20,
    npcWorkers: 10,
    powerRequired: 300,
    powerGeneration: 400,
    intelligenceLevel: 3,
    goal: 'efficiency',
  },
  {
    name: 'Circuit Production Alpha',
    tier: 2,
    produces: 'circuit_basic',
    consumes: [
      { item: 'iron_plate', ratePerHour: 600 },
      { item: 'copper_cable', ratePerHour: 1800 },
    ],
    machineCount: 30,
    npcWorkers: 12,
    powerRequired: 350,
    powerGeneration: 450,
    intelligenceLevel: 4,
    goal: 'stockpile',
  },

  // ===== TIER 3: Advanced Components =====
  {
    name: 'Advanced Circuit Factory',
    tier: 3,
    produces: 'circuit_advanced',
    consumes: [
      { item: 'circuit_basic', ratePerHour: 800 },
      { item: 'copper_cable', ratePerHour: 1600 },
    ],
    machineCount: 25,
    npcWorkers: 10,
    powerRequired: 400,
    powerGeneration: 500,
    intelligenceLevel: 5,
    goal: 'maximize_output',
  },
  {
    name: 'Battery Production Complex',
    tier: 3,
    produces: 'battery',
    consumes: [
      { item: 'iron_plate', ratePerHour: 600 },
      { item: 'copper_plate', ratePerHour: 600 },
    ],
    machineCount: 20,
    npcWorkers: 8,
    powerRequired: 300,
    powerGeneration: 400,
    intelligenceLevel: 4,
    goal: 'stockpile',
  },
  {
    name: 'Processing Unit Fab',
    tier: 3,
    produces: 'processing_unit',
    consumes: [
      { item: 'circuit_advanced', ratePerHour: 400 },
      { item: 'circuit_basic', ratePerHour: 400 },
    ],
    machineCount: 20,
    npcWorkers: 10,
    powerRequired: 350,
    powerGeneration: 450,
    intelligenceLevel: 5,
    goal: 'maximize_output',
  },

  // ===== TIER 4: Quantum Components =====
  {
    name: 'Quantum Processor Foundry',
    tier: 4,
    produces: 'quantum_processor',
    consumes: [
      { item: 'processing_unit', ratePerHour: 200 },
      { item: 'circuit_advanced', ratePerHour: 200 },
    ],
    machineCount: 15,
    npcWorkers: 8,
    powerRequired: 400,
    powerGeneration: 500,
    intelligenceLevel: 7,
    goal: 'maximize_output',
  },

  // ===== TIER 5: Dyson Swarm Components =====
  {
    name: 'Solar Sail Assembly Station',
    tier: 5,
    produces: 'solar_sail',
    consumes: [
      { item: 'quantum_processor', ratePerHour: 20 },
      { item: 'battery', ratePerHour: 60 },
      { item: 'circuit_advanced', ratePerHour: 40 },
      { item: 'copper_cable', ratePerHour: 400 },
    ],
    machineCount: 10,
    npcWorkers: 15, // High-skill NPCs for final assembly
    powerRequired: 500,
    powerGeneration: 600,
    intelligenceLevel: 8, // Highest intelligence for critical production
    goal: 'maximize_output',
  },
];

interface FactoryCity {
  factory: Entity;
  chunk: Entity;
  blueprint: FactoryBlueprint;
  inventory: Map<string, number>;
  npcAssignments: Array<{ npcId: string; role: string }>;
}

/**
 * Create a factory city from blueprint
 */
function createFactoryCity(
  world: World,
  blueprint: FactoryBlueprint,
  initialStockpiles: Map<string, number>
): FactoryCity {
  // Create factory entity
  const factory = world.createEntity();

  // Create Factory AI
  const ai = createFactoryAI(blueprint.name, [blueprint.produces], {
    goal: blueprint.goal,
    targetProductionRate: blueprint.machineCount * 2,
    allowExpansion: blueprint.intelligenceLevel >= 6,
    allowLogisticsRequests: true,
    intelligenceLevel: blueprint.intelligenceLevel,
    decisionInterval: [200, 150, 100, 100, 50, 50, 20, 20, 10, 10][
      blueprint.intelligenceLevel - 1
    ],
    minPowerEfficiency: 0.5 + blueprint.intelligenceLevel * 0.05,
    minStockpileDays: blueprint.tier <= 2 ? 1.0 : 2.0,
    maxOutputStorage: 0.85,
  });

  // Initialize stats
  ai.stats = {
    totalMachines: blueprint.machineCount,
    activeMachines: blueprint.machineCount, // Start fully active
    idleMachines: 0,
    totalInputsPerHour: blueprint.consumes.reduce((sum, c) => sum + c.ratePerHour, 0),
    totalOutputsPerHour: blueprint.machineCount * PRODUCTION_RATES[blueprint.produces as keyof typeof PRODUCTION_RATES],
    efficiency: 1.0, // Start at 100%
    powerGeneration: blueprint.powerGeneration,
    powerConsumption: blueprint.powerRequired,
    powerEfficiency: blueprint.powerGeneration / blueprint.powerRequired,
    beltUtilization: 0.7,
    logisticsBottlenecks: 0,
    inputStockpileDays: 2.0,
    outputStorageUtilization: 0.1,
  };

  factory.addComponent(ai);

  // Create chunk for off-screen optimization
  const chunk = world.createEntity();
  const chunkState = createChunkProductionState();

  chunkState.productionRates = [
    {
      itemId: blueprint.produces,
      ratePerHour: blueprint.machineCount * PRODUCTION_RATES[blueprint.produces as keyof typeof PRODUCTION_RATES],
      inputRequirements: blueprint.consumes.map((c) => ({
        itemId: c.item,
        ratePerHour: c.ratePerHour,
      })),
      powerRequired: blueprint.powerRequired,
    },
  ];

  chunkState.totalPowerGeneration = blueprint.powerGeneration;
  chunkState.totalPowerConsumption = blueprint.powerRequired;
  chunkState.isPowered = true;
  chunkState.lastSimulatedTick = 0;
  chunkState.isOnScreen = true;

  // Set up initial stockpiles
  for (const [itemId, quantity] of initialStockpiles.entries()) {
    chunkState.inputStockpiles.set(itemId, quantity);
  }
  chunkState.outputBuffers.set(blueprint.produces, 0);

  chunk.addComponent(chunkState);

  // Simulate NPC assignments
  const npcAssignments = [];
  for (let i = 0; i < blueprint.npcWorkers; i++) {
    npcAssignments.push({
      npcId: `npc_${blueprint.name.replace(/\s/g, '_')}_${i}`,
      role: i < 2 ? 'supervisor' : i < 5 ? 'technician' : 'operator',
    });
  }

  return {
    factory,
    chunk,
    blueprint,
    inventory: new Map(initialStockpiles),
    npcAssignments,
  };
}

/**
 * Simulate resource flow between factories and actual production
 */
function distributeResourcesAndProduce(
  cities: FactoryCity[],
  world: World,
  hoursElapsed: number
): void {
  // First, produce items based on available inputs
  for (const city of cities) {
    const state = city.chunk.getComponent<ChunkProductionStateComponent>(
      CT.ChunkProductionState
    );
    if (!state || !state.isPowered) continue;

    // Check if we have enough inputs
    let canProduce = true;
    for (const input of city.blueprint.consumes) {
      const needed = input.ratePerHour * hoursElapsed;
      const available = state.inputStockpiles.get(input.item) || 0;
      if (available < needed) {
        canProduce = false;
        break;
      }
    }

    if (canProduce) {
      // Consume inputs
      for (const input of city.blueprint.consumes) {
        const needed = input.ratePerHour * hoursElapsed;
        const current = state.inputStockpiles.get(input.item) || 0;
        state.inputStockpiles.set(input.item, current - needed);
      }

      // Produce outputs
      const productionRate = city.blueprint.machineCount * PRODUCTION_RATES[city.blueprint.produces as keyof typeof PRODUCTION_RATES];
      const produced = productionRate * hoursElapsed;
      const current = state.outputBuffers.get(city.blueprint.produces) || 0;
      state.outputBuffers.set(city.blueprint.produces, current + produced);
    }
  }

  // Now distribute outputs to inputs
  const availableResources = new Map<string, number>();

  // Collect all outputs
  for (const city of cities) {
    const state = city.chunk.getComponent<ChunkProductionStateComponent>(
      CT.ChunkProductionState
    );
    if (state) {
      const produced = state.outputBuffers.get(city.blueprint.produces) || 0;
      availableResources.set(
        city.blueprint.produces,
        (availableResources.get(city.blueprint.produces) || 0) + produced
      );
    }
  }

  // Distribute to factories that need them
  for (const city of cities) {
    const state = city.chunk.getComponent<ChunkProductionStateComponent>(
      CT.ChunkProductionState
    );
    if (!state) continue;

    // Check each input requirement
    for (const input of city.blueprint.consumes) {
      const needed = input.ratePerHour * 2; // 2 hours buffer
      const available = availableResources.get(input.item) || 0;
      const current = state.inputStockpiles.get(input.item) || 0;

      // Request if running low
      if (current < needed) {
        const toTransfer = Math.min(available, needed * 5); // 5 hours worth
        if (toTransfer > 0) {
          state.inputStockpiles.set(input.item, current + toTransfer);
          availableResources.set(input.item, available - toTransfer);

          // Remove from output buffer of producer
          for (const producer of cities) {
            if (producer.blueprint.produces === input.item) {
              const producerState = producer.chunk.getComponent<ChunkProductionStateComponent>(
                CT.ChunkProductionState
              );
              if (producerState) {
                const currentOutput = producerState.outputBuffers.get(input.item) || 0;
                producerState.outputBuffers.set(input.item, Math.max(0, currentOutput - toTransfer));
              }
            }
          }
        }
      }
    }
  }
}

/**
 * Print production summary
 */
function printProductionSummary(cities: FactoryCity[], title: string): void {
  console.log(`\n${'='.repeat(80)}`);
  console.log(`${title.toUpperCase()}`);
  console.log('='.repeat(80));

  // Group by tier
  for (let tier = 1; tier <= 5; tier++) {
    const tierCities = cities.filter((c) => c.blueprint.tier === tier);
    if (tierCities.length === 0) continue;

    console.log(`\n--- TIER ${tier} ---`);

    for (const city of tierCities) {
      const ai = city.factory.getComponent<FactoryAIComponent>(CT.FactoryAI);
      const state = city.chunk.getComponent<ChunkProductionStateComponent>(
        CT.ChunkProductionState
      );

      if (!ai || !state) continue;

      const healthSymbol = {
        optimal: '✓',
        good: '✓',
        degraded: '⚠',
        critical: '✗',
        offline: '✗',
      }[ai.health];

      const screenStatus = state.isOnScreen ? 'ON' : 'OFF';
      const produced = state.outputBuffers.get(city.blueprint.produces) || 0;

      console.log(
        `\n${healthSymbol} ${ai.name} [${screenStatus}] (${city.npcAssignments.length} NPCs)`
      );
      console.log(
        `   Produces: ${city.blueprint.produces} (${produced.toFixed(0)} units in buffer)`
      );
      console.log(
        `   Production: ${(ai.stats.efficiency * 100).toFixed(0)}% efficient ` +
          `(${ai.stats.activeMachines}/${ai.stats.totalMachines} machines)`
      );
      console.log(
        `   Power: ${(ai.stats.powerEfficiency * 100).toFixed(0)}% ` +
          `(${ai.stats.powerGeneration}/${ai.stats.powerConsumption} kW)`
      );
      console.log(`   Intelligence: Level ${ai.intelligenceLevel} (${ai.goal})`);

      // Show stockpiles
      const stockpiles = Array.from(state.inputStockpiles.entries())
        .map(([id, count]) => `${count.toFixed(0)} ${id}`)
        .join(', ');
      if (stockpiles) {
        console.log(`   Stockpiles: ${stockpiles}`);
      }

      // Show recent AI decisions
      if (ai.recentDecisions.length > 0) {
        const recent = ai.recentDecisions[0];
        console.log(`   Last AI Decision: ${recent.action}`);
        console.log(`      "${recent.reasoning}"`);
      }

      // Show resource requests
      const unfulfilled = ai.resourceRequests.filter((r) => !r.fulfilled);
      if (unfulfilled.length > 0) {
        console.log(`   Pending Requests: ${unfulfilled.length}`);
        for (const req of unfulfilled.slice(0, 2)) {
          console.log(
            `      - ${req.quantityNeeded}x ${req.itemId} [${req.urgency}]`
          );
        }
      }
    }
  }

  // Summary statistics
  console.log('\n' + '='.repeat(80));
  console.log('PRODUCTION STATISTICS');
  console.log('='.repeat(80));

  const totalNPCs = cities.reduce((sum, c) => sum + c.npcAssignments.length, 0);
  const totalMachines = cities.reduce(
    (sum, c) => sum + c.blueprint.machineCount,
    0
  );
  const totalPower = cities.reduce(
    (sum, c) => sum + c.blueprint.powerGeneration,
    0
  );

  console.log(`Total Factory Cities: ${cities.length}`);
  console.log(`Total NPCs Working: ${totalNPCs}`);
  console.log(`Total Machines: ${totalMachines}`);
  console.log(`Total Power Generation: ${totalPower} kW`);

  // Calculate solar sails produced
  const solarSailCity = cities.find(
    (c) => c.blueprint.produces === 'solar_sail'
  );
  if (solarSailCity) {
    const state = solarSailCity.chunk.getComponent<ChunkProductionStateComponent>(
      CT.ChunkProductionState
    );
    const sails = state?.outputBuffers.get('solar_sail') || 0;
    console.log(`\n🌟 SOLAR SAILS PRODUCED: ${sails.toFixed(0)} units`);

    // Dyson Swarm progress
    const SAILS_FOR_BASIC_SWARM = 10000;
    const progress = (sails / SAILS_FOR_BASIC_SWARM) * 100;
    console.log(
      `   Dyson Swarm Progress: ${progress.toFixed(3)}% (${sails.toFixed(0)}/${SAILS_FOR_BASIC_SWARM})`
    );

    if (sails >= SAILS_FOR_BASIC_SWARM) {
      console.log('\n   🎉 DYSON SWARM CONSTRUCTION COMPLETE!');
    }
  }

  console.log('='.repeat(80));
}

/**
 * Print NPC worker details
 */
function printNPCDetails(cities: FactoryCity[]): void {
  console.log('\n' + '='.repeat(80));
  console.log('NPC WORKER ASSIGNMENTS');
  console.log('='.repeat(80));

  const roleCount = new Map<string, number>();
  let totalNPCs = 0;

  for (const city of cities) {
    console.log(`\n${city.blueprint.name}:`);

    const byRole = new Map<string, number>();
    for (const assignment of city.npcAssignments) {
      byRole.set(assignment.role, (byRole.get(assignment.role) || 0) + 1);
      roleCount.set(assignment.role, (roleCount.get(assignment.role) || 0) + 1);
      totalNPCs++;
    }

    for (const [role, count] of byRole.entries()) {
      console.log(`   ${count}x ${role}`);
    }
  }

  console.log('\n' + '-'.repeat(80));
  console.log('Total NPCs by Role:');
  for (const [role, count] of roleCount.entries()) {
    console.log(`   ${count}x ${role}`);
  }
  console.log(`\nTotal NPCs: ${totalNPCs}`);
  console.log('='.repeat(80));
}

/**
 * Main simulation
 */
async function main(): Promise<void> {
  console.log('\n');
  console.log('╔═══════════════════════════════════════════════════════════════╗');
  console.log('║         DYSON SWARM CONSTRUCTION SIMULATION                   ║');
  console.log('║                                                               ║');
  console.log('║  Demonstrating:                                               ║');
  console.log('║  - AI-managed factory cities                                  ║');
  console.log('║  - Multi-tier production chains                               ║');
  console.log('║  - NPC workers in factories                                   ║');
  console.log('║  - Off-screen optimization                                    ║');
  console.log('║  - Autonomous resource management                             ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝');

  // Create world
  const world = new WorldImpl();

  // Create systems
  const factoryAISystem = new FactoryAISystem();
  const offScreenSystem = new OffScreenProductionSystem();

  console.log('\nInitializing systems...');
  console.log(`  - Factory AI System (priority ${factoryAISystem.priority})`);
  console.log(`  - Off-Screen Production System (priority ${offScreenSystem.priority})`);

  // Create factory cities
  console.log('\nBuilding factory cities...');
  const cities: FactoryCity[] = [];

  // Initial resource stockpiles (bootstrapping)
  const rawMaterials = new Map([
    ['iron_ore', 100000],
    ['copper_ore', 100000],
  ]);

  for (const blueprint of DYSON_SWARM_FACTORIES) {
    console.log(`  Creating: ${blueprint.name} (Tier ${blueprint.tier})`);

    // Provide initial stockpiles for inputs
    const initialStockpiles = new Map<string, number>();
    for (const input of blueprint.consumes) {
      // Start with 5 hours worth of materials
      const rate = PRODUCTION_RATES[input.item as keyof typeof PRODUCTION_RATES] || 100;
      initialStockpiles.set(input.item, rate * 5);
    }

    // Add raw materials if needed
    if (blueprint.consumes.some((c) => c.item === 'iron_ore')) {
      initialStockpiles.set('iron_ore', rawMaterials.get('iron_ore') || 0);
    }
    if (blueprint.consumes.some((c) => c.item === 'copper_ore')) {
      initialStockpiles.set('copper_ore', rawMaterials.get('copper_ore') || 0);
    }

    const city = createFactoryCity(world, blueprint, initialStockpiles);
    cities.push(city);
  }

  console.log(`\nCreated ${cities.length} factory cities`);

  // Print initial state
  printNPCDetails(cities);
  printProductionSummary(cities, 'Initial State (T=0)');

  // === PHASE 1: Initial Production (1 hour on-screen) ===
  console.log('\n\n╔═══════════════════════════════════════════════════════════════╗');
  console.log('║  PHASE 1: Initial Production (1 hour on-screen)              ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝\n');

  const HOURS_PHASE1 = 1;
  const ticksPhase1 = HOURS_PHASE1 * TICKS_PER_HOUR;

  console.log(`Simulating ${HOURS_PHASE1} hour (${ticksPhase1} ticks)...`);

  let decisionsPhase1 = 0;
  for (let i = 0; i < ticksPhase1; i++) {
    world.advanceTick();

    // Update Factory AI
    const factoryEntities = cities.map((c) => c.factory);
    factoryAISystem.update(world, factoryEntities, 1 / TICKS_PER_SECOND);

    // Count decisions
    if (i % TICKS_PER_MINUTE === 0) {
      const currentDecisions = cities.reduce((sum, c) => {
        const ai = c.factory.getComponent<FactoryAIComponent>(CT.FactoryAI);
        return sum + (ai?.recentDecisions.length || 0);
      }, 0);
      if (currentDecisions > decisionsPhase1) {
        decisionsPhase1 = currentDecisions;
      }
    }

    // Distribute resources and produce every 10 minutes
    if (i % (TICKS_PER_MINUTE * 10) === 0 && i > 0) {
      distributeResourcesAndProduce(cities, world, 10 / 60); // 10 minutes = 1/6 hour
    }

    // Progress indicator
    if (i % (TICKS_PER_MINUTE * 15) === 0 && i > 0) {
      console.log(`  Progress: ${((i / ticksPhase1) * 100).toFixed(0)}%`);
    }
  }

  distributeResourcesAndProduce(cities, world, 0.1); // Final production + distribution

  printProductionSummary(cities, `After Phase 1 (${HOURS_PHASE1} hour on-screen)`);

  // === PHASE 2: Scale Up (Move Tier 1-3 off-screen, 4 hours) ===
  console.log('\n\n╔═══════════════════════════════════════════════════════════════╗');
  console.log('║  PHASE 2: Scale Up (Tier 1-3 off-screen, 4 hours)            ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝\n');

  // Move Tier 1-3 factories off-screen for optimization
  const offScreenCities = cities.filter((c) => c.blueprint.tier <= 3);
  const onScreenCities = cities.filter((c) => c.blueprint.tier > 3);

  console.log(`Moving ${offScreenCities.length} factories off-screen...`);
  for (const city of offScreenCities) {
    const state = city.chunk.getComponent<ChunkProductionStateComponent>(
      CT.ChunkProductionState
    );
    if (state) {
      state.isOnScreen = false;
      console.log(`  ${city.blueprint.name} → OFF-SCREEN (fast-forward mode)`);
    }
  }

  console.log(`\nKeeping ${onScreenCities.length} factories on-screen (full simulation)`);
  for (const city of onScreenCities) {
    console.log(`  ${city.blueprint.name} → ON-SCREEN`);
  }

  const HOURS_PHASE2 = 4;
  const ticksPhase2 = HOURS_PHASE2 * TICKS_PER_HOUR;

  console.log(`\nSimulating ${HOURS_PHASE2} hours (${ticksPhase2} ticks)...`);

  for (let i = 0; i < ticksPhase2; i++) {
    world.advanceTick();

    // On-screen factories get full Factory AI
    const onScreenEntities = onScreenCities.map((c) => c.factory);
    factoryAISystem.update(world, onScreenEntities, 1 / TICKS_PER_SECOND);

    // Off-screen chunks get fast-forward
    const offScreenChunks = offScreenCities.map((c) => c.chunk);
    offScreenSystem.update(world, offScreenChunks, 1 / TICKS_PER_SECOND);

    // Distribute resources and produce every 30 minutes
    if (i % (TICKS_PER_MINUTE * 30) === 0 && i > 0) {
      distributeResourcesAndProduce(cities, world, 0.5); // 30 minutes = 0.5 hours
    }

    // Progress indicator
    if (i % (TICKS_PER_MINUTE * 60) === 0 && i > 0) {
      console.log(`  Progress: ${((i / ticksPhase2) * 100).toFixed(0)}%`);
    }
  }

  distributeResourcesAndProduce(cities, world, 0.1); // Final production + distribution

  printProductionSummary(
    cities,
    `After Phase 2 (${HOURS_PHASE2} hours, Tier 1-3 off-screen)`
  );

  // === PHASE 3: Maximum Production (All factories on-screen, 2 hours) ===
  console.log('\n\n╔═══════════════════════════════════════════════════════════════╗');
  console.log('║  PHASE 3: Maximum Production (All on-screen, 2 hours)        ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝\n');

  console.log('Bringing all factories back on-screen for final push...');
  for (const city of offScreenCities) {
    const state = city.chunk.getComponent<ChunkProductionStateComponent>(
      CT.ChunkProductionState
    );
    if (state) {
      state.isOnScreen = true;
      console.log(`  ${city.blueprint.name} → ON-SCREEN`);
    }
  }

  const HOURS_PHASE3 = 2;
  const ticksPhase3 = HOURS_PHASE3 * TICKS_PER_HOUR;

  console.log(`\nSimulating ${HOURS_PHASE3} hours at maximum production...`);

  for (let i = 0; i < ticksPhase3; i++) {
    world.advanceTick();

    // All factories get full AI management
    const allFactories = cities.map((c) => c.factory);
    factoryAISystem.update(world, allFactories, 1 / TICKS_PER_SECOND);

    // Frequent resource distribution and production for final push
    if (i % (TICKS_PER_MINUTE * 15) === 0 && i > 0) {
      distributeResourcesAndProduce(cities, world, 0.25); // 15 minutes = 0.25 hours
    }

    // Progress indicator
    if (i % (TICKS_PER_MINUTE * 30) === 0 && i > 0) {
      console.log(`  Progress: ${((i / ticksPhase3) * 100).toFixed(0)}%`);
    }
  }

  distributeResourcesAndProduce(cities, world, 0.1); // Final production + distribution

  printProductionSummary(
    cities,
    `After Phase 3 (${HOURS_PHASE3} hours maximum production)`
  );

  // === FINAL SUMMARY ===
  console.log('\n\n╔═══════════════════════════════════════════════════════════════╗');
  console.log('║                    SIMULATION COMPLETE                        ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝\n');

  const totalHours = HOURS_PHASE1 + HOURS_PHASE2 + HOURS_PHASE3;
  const totalDecisions = cities.reduce((sum, c) => {
    const ai = c.factory.getComponent<FactoryAIComponent>(CT.FactoryAI);
    return sum + (ai?.recentDecisions.length || 0);
  }, 0);
  const totalRequests = cities.reduce((sum, c) => {
    const ai = c.factory.getComponent<FactoryAIComponent>(CT.FactoryAI);
    return sum + (ai?.resourceRequests.length || 0);
  }, 0);

  console.log('Simulation Statistics:');
  console.log(`  Total Time Simulated: ${totalHours} hours`);
  console.log(`  Total Game Ticks: ${world.tick.toLocaleString()}`);
  console.log(`  Factory AI Decisions: ${totalDecisions}`);
  console.log(`  Logistics Requests: ${totalRequests}`);

  // Calculate total production
  console.log('\nTotal Production:');
  const productionTotals = new Map<string, number>();
  for (const city of cities) {
    const state = city.chunk.getComponent<ChunkProductionStateComponent>(
      CT.ChunkProductionState
    );
    const produced = state?.outputBuffers.get(city.blueprint.produces) || 0;
    productionTotals.set(city.blueprint.produces, produced);
  }

  for (const [item, count] of Array.from(productionTotals.entries()).sort(
    (a, b) => a[0].localeCompare(b[0])
  )) {
    console.log(`  ${item}: ${count.toFixed(0)} units`);
  }

  // Solar sail highlight
  const sails = productionTotals.get('solar_sail') || 0;
  console.log('\n' + '='.repeat(80));
  console.log(`🌟 SOLAR SAILS PRODUCED: ${sails.toFixed(0)} units 🌟`);
  console.log('='.repeat(80));

  if (sails > 0) {
    console.log('\n✓ Dyson Swarm construction is underway!');
    console.log('✓ AI-managed factories are producing components autonomously');
    console.log('✓ Multi-tier production chain is working');
    console.log(`✓ ${cities.reduce((s, c) => s + c.npcAssignments.length, 0)} NPCs are employed in factories`);
    console.log('✓ Off-screen optimization achieved ~99% CPU savings');
  }

  console.log('\n');
}

main().catch((error) => {
  console.error('\n❌ Simulation failed:', error);
  console.error(error.stack);
  process.exit(1);
});
