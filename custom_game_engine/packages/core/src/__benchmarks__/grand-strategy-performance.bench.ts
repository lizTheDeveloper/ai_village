/**
 * Grand Strategy Performance Benchmarks
 *
 * Benchmarks for Phase 7 performance optimization of grand strategy systems:
 * - Trade network graph operations (Dijkstra, Floyd-Warshall, Brandes)
 * - Shipping lane processing with many lanes/caravans
 * - Governance hierarchy operations
 * - Entity scaling (1K, 5K, 10K entities)
 *
 * Run with:
 *   npm run bench -- --grep "Grand Strategy"
 */

import { bench, describe } from 'vitest';
import { World } from '../ecs/World.js';
import { EventBusImpl } from '../events/EventBus.js';
import type { Entity } from '../ecs/Entity.js';
import { ComponentType as CT } from '../types/ComponentType.js';
import type { Graph, GraphEdge } from '../trade/GraphAnalysis.js';
import {
  dijkstraShortestPath,
  floydWarshallAllPairs,
  brandesBetweenness,
  findArticulationPoints,
  findConnectedComponents,
} from '../trade/GraphAnalysis.js';
import { ShippingLaneSystem } from '../systems/ShippingLaneSystem.js';
import { TradeNetworkSystem } from '../systems/TradeNetworkSystem.js';
import type { ShippingLaneComponent } from '../components/ShippingLaneComponent.js';
import type { TradeCaravanComponent } from '../components/TradeCaravanComponent.js';

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Create a graph with N nodes and M edges (random connections)
 */
function createRandomGraph(nodeCount: number, edgeCount: number): Graph {
  const nodes = new Set<string>();
  const edges = new Map<string, GraphEdge>();
  const adjacencyList = new Map<string, Set<string>>();

  // Create nodes
  for (let i = 0; i < nodeCount; i++) {
    const nodeId = `node_${i}`;
    nodes.add(nodeId);
    adjacencyList.set(nodeId, new Set());
  }

  // Create random edges (ensure connected by building a spanning tree first)
  const nodeArray = Array.from(nodes);

  // First, build a spanning tree to ensure connectivity
  for (let i = 1; i < nodeCount; i++) {
    const fromNode = nodeArray[Math.floor(Math.random() * i)]!;
    const toNode = nodeArray[i]!;
    const edgeId = `edge_spanning_${i}`;
    const weight = 1 + Math.random() * 10;

    edges.set(edgeId, {
      edgeId,
      fromNodeId: fromNode,
      toNodeId: toNode,
      weight,
    });
    adjacencyList.get(fromNode)!.add(edgeId);
    adjacencyList.get(toNode)!.add(edgeId);
  }

  // Then add remaining random edges
  const remainingEdges = edgeCount - (nodeCount - 1);
  for (let i = 0; i < remainingEdges; i++) {
    const fromNode = nodeArray[Math.floor(Math.random() * nodeCount)]!;
    const toNode = nodeArray[Math.floor(Math.random() * nodeCount)]!;
    if (fromNode === toNode) continue;

    const edgeId = `edge_random_${i}`;
    const weight = 1 + Math.random() * 10;

    edges.set(edgeId, {
      edgeId,
      fromNodeId: fromNode,
      toNodeId: toNode,
      weight,
    });
    adjacencyList.get(fromNode)!.add(edgeId);
    adjacencyList.get(toNode)!.add(edgeId);
  }

  return { nodes, edges, adjacencyList };
}

/**
 * Create a world with shipping lanes and caravans
 */
function createShippingWorld(laneCount: number, caravansPerLane: number): {
  world: World;
  laneEntities: Entity[];
  caravanEntities: Entity[];
} {
  const eventBus = new EventBusImpl();
  const world = new World(eventBus);
  const laneEntities: Entity[] = [];
  const caravanEntities: Entity[] = [];

  // Create shipping lanes
  for (let i = 0; i < laneCount; i++) {
    const laneEntity = world.createEntity();
    world.addComponent(laneEntity.id, {
      type: 'shipping_lane',
      version: 1,
      laneId: `lane_${i}`,
      fromNodeId: `city_${i}`,
      toNodeId: `city_${(i + 1) % laneCount}`,
      distance: 100 + Math.random() * 500,
      maxFlowRate: 1000,
      currentFlowRate: 500 + Math.random() * 500,
      status: 'active',
      safetyRating: 0.8 + Math.random() * 0.2,
      hazards: [],
      activeCaravanIds: [],
      lastUpdatedTick: 0,
    } as ShippingLaneComponent);
    laneEntities.push(laneEntity);

    // Create caravans for this lane
    for (let j = 0; j < caravansPerLane; j++) {
      const caravanEntity = world.createEntity();
      world.addComponent(caravanEntity.id, {
        type: 'trade_caravan',
        version: 1,
        caravanId: `caravan_${i}_${j}`,
        laneId: `lane_${i}`,
        agreementId: `agreement_${i}`,
        fromCityId: `city_${i}`,
        toCityId: `city_${(i + 1) % laneCount}`,
        progress: Math.random(),
        speed: 1 + Math.random() * 0.5,
        cargo: {
          resources: { gold: 100, food: 200 },
          totalValue: 1000,
          totalWeight: 500,
        },
        status: 'in_transit',
        departedTick: 0,
        estimatedArrivalTick: 100,
      } as TradeCaravanComponent);
      caravanEntities.push(caravanEntity);
    }
  }

  return { world, laneEntities, caravanEntities };
}

/**
 * Create a world with many entities for scale testing
 */
function createScaleWorld(entityCount: number): {
  world: World;
  entities: Entity[];
} {
  const eventBus = new EventBusImpl();
  const world = new World(eventBus);
  const entities: Entity[] = [];

  for (let i = 0; i < entityCount; i++) {
    const entity = world.createEntity();
    world.addComponent(entity.id, {
      type: CT.Position,
      x: Math.random() * 1000,
      y: Math.random() * 1000,
      version: 0,
    } as any);
    world.addComponent(entity.id, {
      type: CT.Velocity,
      dx: Math.random() * 2 - 1,
      dy: Math.random() * 2 - 1,
      version: 0,
    } as any);
    entities.push(entity);
  }

  return { world, entities };
}

// =============================================================================
// Trade Network Graph Algorithm Benchmarks
// =============================================================================

describe('Grand Strategy: Trade Network Graph Algorithms', () => {
  // Small graph (50 nodes, 100 edges) - typical city network
  const smallGraph = createRandomGraph(50, 100);

  // Medium graph (200 nodes, 500 edges) - regional network
  const mediumGraph = createRandomGraph(200, 500);

  // Large graph (500 nodes, 1500 edges) - continental network
  const largeGraph = createRandomGraph(500, 1500);

  describe('Dijkstra Shortest Path', () => {
    bench('Small graph (50 nodes)', () => {
      const nodeArray = Array.from(smallGraph.nodes);
      const start = nodeArray[0]!;
      const end = nodeArray[nodeArray.length - 1]!;
      dijkstraShortestPath(smallGraph, start, end);
    });

    bench('Medium graph (200 nodes)', () => {
      const nodeArray = Array.from(mediumGraph.nodes);
      const start = nodeArray[0]!;
      const end = nodeArray[nodeArray.length - 1]!;
      dijkstraShortestPath(mediumGraph, start, end);
    });

    bench('Large graph (500 nodes)', () => {
      const nodeArray = Array.from(largeGraph.nodes);
      const start = nodeArray[0]!;
      const end = nodeArray[nodeArray.length - 1]!;
      dijkstraShortestPath(largeGraph, start, end);
    });
  });

  describe('Floyd-Warshall All-Pairs', () => {
    bench('Small graph (50 nodes) - O(n³)', () => {
      floydWarshallAllPairs(smallGraph);
    });

    bench('Medium graph (200 nodes) - O(n³) WARNING: SLOW', () => {
      floydWarshallAllPairs(mediumGraph);
    });

    // Skip large graph - O(n³) would be too slow
  });

  describe('Brandes Betweenness Centrality', () => {
    bench('Small graph (50 nodes)', () => {
      brandesBetweenness(smallGraph);
    });

    bench('Medium graph (200 nodes)', () => {
      brandesBetweenness(mediumGraph);
    });
  });

  describe('Articulation Points (Chokepoints)', () => {
    bench('Small graph (50 nodes)', () => {
      findArticulationPoints(smallGraph);
    });

    bench('Medium graph (200 nodes)', () => {
      findArticulationPoints(mediumGraph);
    });

    bench('Large graph (500 nodes)', () => {
      findArticulationPoints(largeGraph);
    });
  });

  describe('Connected Components', () => {
    bench('Small graph (50 nodes)', () => {
      findConnectedComponents(smallGraph);
    });

    bench('Medium graph (200 nodes)', () => {
      findConnectedComponents(mediumGraph);
    });

    bench('Large graph (500 nodes)', () => {
      findConnectedComponents(largeGraph);
    });
  });
});

// =============================================================================
// Shipping Lane System Benchmarks
// =============================================================================

describe('Grand Strategy: Shipping Lane Processing', () => {
  bench('50 lanes, 2 caravans each (100 caravans)', () => {
    const { world, laneEntities, caravanEntities } = createShippingWorld(50, 2);
    const system = new ShippingLaneSystem();
    const allEntities = [...laneEntities, ...caravanEntities];
    system.update(world, allEntities, 0.05);
  });

  bench('200 lanes, 5 caravans each (1000 caravans)', () => {
    const { world, laneEntities, caravanEntities } = createShippingWorld(200, 5);
    const system = new ShippingLaneSystem();
    const allEntities = [...laneEntities, ...caravanEntities];
    system.update(world, allEntities, 0.05);
  });

  bench('500 lanes, 10 caravans each (5000 caravans)', () => {
    const { world, laneEntities, caravanEntities } = createShippingWorld(500, 10);
    const system = new ShippingLaneSystem();
    const allEntities = [...laneEntities, ...caravanEntities];
    system.update(world, allEntities, 0.05);
  });

  bench('1000 lanes, 1 caravan each (1000 shipping lanes)', () => {
    const { world, laneEntities, caravanEntities } = createShippingWorld(1000, 1);
    const system = new ShippingLaneSystem();
    const allEntities = [...laneEntities, ...caravanEntities];
    system.update(world, allEntities, 0.05);
  });
});

// =============================================================================
// Entity Scale Benchmarks
// =============================================================================

describe('Grand Strategy: Entity Scale Testing', () => {
  bench('1,000 entities - world creation', () => {
    createScaleWorld(1000);
  });

  bench('5,000 entities - world creation', () => {
    createScaleWorld(5000);
  });

  bench('10,000 entities - world creation', () => {
    createScaleWorld(10000);
  });

  describe('Query Performance at Scale', () => {
    bench('Query 1,000 entities', () => {
      const { world } = createScaleWorld(1000);
      world.query().with(CT.Position).executeEntities();
    });

    bench('Query 5,000 entities', () => {
      const { world } = createScaleWorld(5000);
      world.query().with(CT.Position).executeEntities();
    });

    bench('Query 10,000 entities', () => {
      const { world } = createScaleWorld(10000);
      world.query().with(CT.Position).executeEntities();
    });
  });

  describe('Component Updates at Scale', () => {
    bench('Update 1,000 positions', () => {
      const { world, entities } = createScaleWorld(1000);
      for (const entity of entities) {
        const pos = entity.components.get(CT.Position) as any;
        if (pos) {
          pos.x += 1;
          pos.y += 1;
        }
      }
    });

    bench('Update 5,000 positions', () => {
      const { world, entities } = createScaleWorld(5000);
      for (const entity of entities) {
        const pos = entity.components.get(CT.Position) as any;
        if (pos) {
          pos.x += 1;
          pos.y += 1;
        }
      }
    });

    bench('Update 10,000 positions', () => {
      const { world, entities } = createScaleWorld(10000);
      for (const entity of entities) {
        const pos = entity.components.get(CT.Position) as any;
        if (pos) {
          pos.x += 1;
          pos.y += 1;
        }
      }
    });
  });
});

// =============================================================================
// Memory Allocation Benchmarks
// =============================================================================

describe('Grand Strategy: Memory Efficiency', () => {
  bench('Object literal creation (GC-friendly)', () => {
    for (let i = 0; i < 1000; i++) {
      const obj = Object.create(null) as Record<string, number>;
      obj.x = i;
      obj.y = i * 2;
      obj.z = i * 3;
    }
  });

  bench('Regular object creation', () => {
    for (let i = 0; i < 1000; i++) {
      const obj: Record<string, number> = {
        x: i,
        y: i * 2,
        z: i * 3,
      };
    }
  });

  bench('Map creation', () => {
    for (let i = 0; i < 1000; i++) {
      const map = new Map<string, number>();
      map.set('x', i);
      map.set('y', i * 2);
      map.set('z', i * 3);
    }
  });

  bench('Pre-allocated array reuse', () => {
    const arr: number[] = new Array(1000);
    for (let i = 0; i < 1000; i++) {
      arr[i] = i * 2;
    }
  });

  bench('Array push (dynamic allocation)', () => {
    const arr: number[] = [];
    for (let i = 0; i < 1000; i++) {
      arr.push(i * 2);
    }
  });
});

// =============================================================================
// Governance Hierarchy Benchmarks
// =============================================================================

describe('Grand Strategy: Governance Hierarchy Operations', () => {
  /**
   * Create a governance hierarchy:
   * 1 Empire -> 5 Nations -> 25 Provinces -> 125 Cities -> 625 Villages
   */
  function createGovernanceWorld(): { world: World; entities: Entity[] } {
    const eventBus = new EventBusImpl();
    const world = new World(eventBus);
    const entities: Entity[] = [];

    // Create Empire
    const empire = world.createEntity();
    world.addComponent(empire.id, {
      type: 'empire',
      version: 1,
      empireId: 'empire_1',
      name: 'Grand Empire',
      nationIds: [] as string[],
      totalPopulation: 0,
    } as any);
    entities.push(empire);

    // Create Nations
    const nationIds: string[] = [];
    for (let n = 0; n < 5; n++) {
      const nation = world.createEntity();
      nationIds.push(nation.id);
      world.addComponent(nation.id, {
        type: 'nation',
        version: 1,
        nationId: `nation_${n}`,
        name: `Nation ${n}`,
        parentEmpireId: empire.id,
        provinceIds: [] as string[],
        totalPopulation: 0,
      } as any);
      entities.push(nation);

      // Create Provinces
      const provinceIds: string[] = [];
      for (let p = 0; p < 5; p++) {
        const province = world.createEntity();
        provinceIds.push(province.id);
        world.addComponent(province.id, {
          type: 'province',
          version: 1,
          provinceId: `province_${n}_${p}`,
          name: `Province ${n}-${p}`,
          parentNationId: nation.id,
          cityIds: [] as string[],
          totalPopulation: 0,
        } as any);
        entities.push(province);

        // Create Cities
        const cityIds: string[] = [];
        for (let c = 0; c < 5; c++) {
          const city = world.createEntity();
          cityIds.push(city.id);
          world.addComponent(city.id, {
            type: 'city',
            version: 1,
            cityId: `city_${n}_${p}_${c}`,
            name: `City ${n}-${p}-${c}`,
            parentProvinceId: province.id,
            villageIds: [] as string[],
            population: 5000 + Math.floor(Math.random() * 10000),
          } as any);
          entities.push(city);

          // Create Villages
          const villageIds: string[] = [];
          for (let v = 0; v < 5; v++) {
            const village = world.createEntity();
            villageIds.push(village.id);
            world.addComponent(village.id, {
              type: 'village',
              version: 1,
              villageId: `village_${n}_${p}_${c}_${v}`,
              name: `Village ${n}-${p}-${c}-${v}`,
              parentCityId: city.id,
              population: 50 + Math.floor(Math.random() * 200),
            } as any);
            entities.push(village);
          }
        }
      }
    }

    return { world, entities };
  }

  bench('Create governance hierarchy (781 entities)', () => {
    createGovernanceWorld();
  });

  bench('Query villages from hierarchy', () => {
    const { world } = createGovernanceWorld();
    world.query().with('village').executeEntities();
  });

  bench('Query cities from hierarchy', () => {
    const { world } = createGovernanceWorld();
    world.query().with('city').executeEntities();
  });

  bench('Calculate total population (traverse hierarchy)', () => {
    const { world } = createGovernanceWorld();
    const villages = world.query().with('village').executeEntities();
    const cities = world.query().with('city').executeEntities();

    let totalPop = 0;
    for (const village of villages) {
      const v = village.components.get('village') as any;
      if (v) totalPop += v.population;
    }
    for (const city of cities) {
      const c = city.components.get('city') as any;
      if (c) totalPop += c.population;
    }
  });
});

// =============================================================================
// LLM Request Overhead Benchmarks
// =============================================================================

describe('Grand Strategy: LLM Request Preparation', () => {
  /**
   * Benchmark the overhead of preparing LLM requests (not actual API calls)
   */

  bench('Prepare governor context (small)', () => {
    const context = {
      governorType: 'city_director',
      cityName: 'Test City',
      population: 5000,
      resources: { gold: 1000, food: 2000, wood: 500 },
      recentEvents: ['merchant_arrived', 'building_complete'],
      pendingDecisions: ['tax_rate', 'trade_agreement'],
    };
    JSON.stringify(context);
  });

  bench('Prepare governor context (large empire)', () => {
    const nations = [];
    for (let i = 0; i < 10; i++) {
      const provinces = [];
      for (let j = 0; j < 10; j++) {
        provinces.push({
          name: `Province ${i}-${j}`,
          population: 100000 + Math.floor(Math.random() * 500000),
          resources: { gold: 10000, food: 50000, iron: 5000 },
          militaryStrength: 1000 + Math.floor(Math.random() * 5000),
        });
      }
      nations.push({
        name: `Nation ${i}`,
        provinces,
        totalPopulation: provinces.reduce((sum, p) => sum + p.population, 0),
        treaties: ['treaty_1', 'treaty_2'],
        warStatus: i % 3 === 0 ? 'at_war' : 'peace',
      });
    }

    const context = {
      governorType: 'emperor',
      empireName: 'Grand Empire',
      nations,
      totalPopulation: nations.reduce((sum, n) => sum + n.totalPopulation, 0),
      treasury: 1000000,
      diplomaticRelations: new Array(20).fill(null).map((_, i) => ({
        empire: `Empire ${i}`,
        status: i % 4 === 0 ? 'hostile' : i % 2 === 0 ? 'neutral' : 'friendly',
        tradeValue: Math.floor(Math.random() * 10000),
      })),
    };
    JSON.stringify(context);
  });

  bench('Parse LLM response (simple decision)', () => {
    const response = JSON.stringify({
      decision: 'increase_taxes',
      parameters: { tax_rate: 0.15 },
      reasoning: 'Treasury is low, need funds for military',
      confidence: 0.8,
    });
    JSON.parse(response);
  });

  bench('Parse LLM response (complex multi-action)', () => {
    const response = JSON.stringify({
      decisions: [
        { type: 'military', action: 'mobilize', target: 'northern_border', units: 5000 },
        { type: 'diplomatic', action: 'send_envoy', target: 'neighbor_empire', goal: 'alliance' },
        { type: 'economic', action: 'trade_agreement', partner: 'merchant_guild', goods: ['iron', 'gold'] },
        { type: 'internal', action: 'build', structure: 'barracks', location: 'capital' },
        { type: 'research', action: 'prioritize', tech: 'advanced_metallurgy' },
      ],
      overallStrategy: 'defensive_expansion',
      fiveYearPlan: ['consolidate', 'fortify', 'expand_trade', 'military_buildup', 'vassalize_neighbor'],
      reasoning: 'Current geopolitical situation requires careful defensive posture...',
    });
    JSON.parse(response);
  });
});
