/**
 * TradeNetworkSystem integration tests
 *
 * Tests:
 * - Network graph construction from shipping lanes
 * - Hub identification (betweenness centrality)
 * - Chokepoint detection
 * - Blockade cascade effects
 * - Trade balance calculation
 * - Wealth distribution metrics
 * - Network resilience analysis
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { World } from '../../ecs/World.js';
import { TradeNetworkSystem } from '../TradeNetworkSystem.js';
import { EntityImpl } from '../../ecs/Entity.js';
import type { ShippingLaneComponent } from '../../components/ShippingLaneComponent.js';
import type { TradeNetworkComponent } from '../../components/TradeNetworkComponent.js';
import type { BlockadeComponent } from '../../components/BlockadeComponent.js';
import { createTradeNetworkComponent } from '../../components/TradeNetworkComponent.js';

describe('TradeNetworkSystem', () => {
  let world: World;
  let system: TradeNetworkSystem;

  beforeEach(() => {
    world = new World();
    system = new TradeNetworkSystem();
    system.initialize(world, world.eventBus);
  });

  describe('Network Construction', () => {
    it('should build network graph from shipping lanes', () => {
      // Create 20 settlement nodes
      const settlements: string[] = [];
      for (let i = 0; i < 20; i++) {
        const entity = world.createEntity();
        settlements.push(entity.id);
      }

      // Create shipping lanes between settlements (star topology with central hub)
      const hubId = settlements[10]!; // Middle settlement as hub

      for (let i = 0; i < settlements.length; i++) {
        if (i === 10) continue; // Skip hub itself

        const originId = settlements[i]!;
        const lane: ShippingLaneComponent = {
          type: 'shipping_lane',
          version: 1,
          laneId: `lane_${i}`,
          name: `Route ${i}`,
          originId,
          originPosition: { x: 0, y: 0 },
          destinationId: hubId,
          destinationPosition: { x: 100, y: 100 },
          distance: 100,
          travelTimeTicks: 100,
          passageIds: [],
          activeCaravans: [],
          flowRate: 50 + i * 10, // Varying flow rates
          capacity: 200,
          hazards: [],
          safetyRating: 1.0,
          tollRate: 0.1,
          status: 'active',
          lastUsedTick: world.tick,
        };

        const laneEntity = world.createEntity();
        (laneEntity as EntityImpl).addComponent(lane);
      }

      // Create trade network
      const networkEntity = world.createEntity();
      const network = createTradeNetworkComponent(
        'test_network',
        'Test Trade Network',
        'system',
        'spatial_tier_1'
      );
      (networkEntity as EntityImpl).addComponent(network);

      // Update system to build graph
      system.update(world);

      // Verify network was built
      const updatedNetwork = networkEntity.getComponent<TradeNetworkComponent>('trade_network');
      expect(updatedNetwork).toBeDefined();
      expect(updatedNetwork!.nodes.size).toBe(20); // All settlements
      expect(updatedNetwork!.edges.size).toBe(19); // All lanes
      expect(updatedNetwork!.totalFlowRate).toBeGreaterThan(0);
    });

    it('should calculate network metrics correctly', () => {
      // Create simple triangle network
      const [a, b, c] = [
        world.createEntity().id,
        world.createEntity().id,
        world.createEntity().id,
      ];

      const lanes = [
        { from: a, to: b, flowRate: 100 },
        { from: b, to: c, flowRate: 100 },
        { from: c, to: a, flowRate: 100 },
      ];

      lanes.forEach((laneData, i) => {
        const lane: ShippingLaneComponent = {
          type: 'shipping_lane',
          version: 1,
          laneId: `lane_${i}`,
          name: `Lane ${i}`,
          originId: laneData.from,
          originPosition: { x: 0, y: 0 },
          destinationId: laneData.to,
          destinationPosition: { x: 100, y: 100 },
          distance: 100,
          travelTimeTicks: 100,
          passageIds: [],
          activeCaravans: [],
          flowRate: laneData.flowRate,
          capacity: 200,
          hazards: [],
          safetyRating: 1.0,
          tollRate: 0.1,
          status: 'active',
          lastUsedTick: world.tick,
        };

        const laneEntity = world.createEntity();
        (laneEntity as EntityImpl).addComponent(lane);
      });

      const networkEntity = world.createEntity();
      const network = createTradeNetworkComponent(
        'triangle_network',
        'Triangle Network',
        'planet',
        'spatial_tier_1'
      );
      (networkEntity as EntityImpl).addComponent(network);

      system.update(world);

      const updatedNetwork = networkEntity.getComponent<TradeNetworkComponent>('trade_network');
      expect(updatedNetwork!.nodes.size).toBe(3);
      expect(updatedNetwork!.edges.size).toBe(3);
      expect(updatedNetwork!.networkDensity).toBe(1.0); // Complete triangle = max density
    });
  });

  describe('Hub Identification', () => {
    it('should identify hubs via betweenness centrality', () => {
      // Create star topology: central hub connected to 10 spokes
      const hubId = world.createEntity().id;
      const spokes: string[] = [];

      for (let i = 0; i < 10; i++) {
        const spokeId = world.createEntity().id;
        spokes.push(spokeId);

        const lane: ShippingLaneComponent = {
          type: 'shipping_lane',
          version: 1,
          laneId: `lane_${i}`,
          name: `Spoke ${i}`,
          originId: spokeId,
          originPosition: { x: 0, y: 0 },
          destinationId: hubId,
          destinationPosition: { x: 100, y: 100 },
          distance: 100,
          travelTimeTicks: 100,
          passageIds: [],
          activeCaravans: [],
          flowRate: 100,
          capacity: 200,
          hazards: [],
          safetyRating: 1.0,
          tollRate: 0.1,
          status: 'active',
          lastUsedTick: world.tick,
        };

        const laneEntity = world.createEntity();
        (laneEntity as EntityImpl).addComponent(lane);
      }

      const networkEntity = world.createEntity();
      const network = createTradeNetworkComponent(
        'hub_network',
        'Hub Network',
        'system',
        'spatial_tier_1'
      );
      (networkEntity as EntityImpl).addComponent(network);

      system.update(world);

      const updatedNetwork = networkEntity.getComponent<TradeNetworkComponent>('trade_network');

      // Hub should be identified
      expect(updatedNetwork!.hubs.length).toBeGreaterThan(0);

      // Central node should have highest betweenness
      const centralHub = updatedNetwork!.hubs.find(h => h.nodeId === hubId);
      expect(centralHub).toBeDefined();
      expect(centralHub!.betweenness).toBeGreaterThan(0.5); // Star center = high betweenness
      expect(centralHub!.tier).toBe('major');
    });
  });

  describe('Chokepoint Detection', () => {
    it('should detect chokepoints with few alternatives', () => {
      // Create linear chain: A -> B -> C -> D -> E
      // B, C, D are chokepoints (no alternative routes)
      const nodes = [
        world.createEntity().id,
        world.createEntity().id,
        world.createEntity().id,
        world.createEntity().id,
        world.createEntity().id,
      ];

      for (let i = 0; i < nodes.length - 1; i++) {
        const lane: ShippingLaneComponent = {
          type: 'shipping_lane',
          version: 1,
          laneId: `lane_${i}`,
          name: `Chain ${i}`,
          originId: nodes[i]!,
          originPosition: { x: i * 100, y: 0 },
          destinationId: nodes[i + 1]!,
          destinationPosition: { x: (i + 1) * 100, y: 0 },
          distance: 100,
          travelTimeTicks: 100,
          passageIds: [],
          activeCaravans: [],
          flowRate: 100,
          capacity: 200,
          hazards: [],
          safetyRating: 1.0,
          tollRate: 0.1,
          status: 'active',
          lastUsedTick: world.tick,
        };

        const laneEntity = world.createEntity();
        (laneEntity as EntityImpl).addComponent(lane);
      }

      const networkEntity = world.createEntity();
      const network = createTradeNetworkComponent(
        'chain_network',
        'Chain Network',
        'planet',
        'spatial_tier_1'
      );
      (networkEntity as EntityImpl).addComponent(network);

      system.update(world);

      const updatedNetwork = networkEntity.getComponent<TradeNetworkComponent>('trade_network');

      // Middle nodes should be detected as chokepoints
      expect(updatedNetwork!.chokepoints.length).toBeGreaterThan(0);

      // All middle nodes are critical (articulation points)
      expect(updatedNetwork!.criticalNodes.size).toBeGreaterThanOrEqual(3);
    });

    it('should calculate strategic value for chokepoints', () => {
      // Create network with one high-value chokepoint
      const chokepoint = world.createEntity().id;
      const regionA = [world.createEntity().id, world.createEntity().id];
      const regionB = [world.createEntity().id, world.createEntity().id];

      // Region A -> Chokepoint
      regionA.forEach((nodeId, i) => {
        const lane: ShippingLaneComponent = {
          type: 'shipping_lane',
          version: 1,
          laneId: `lane_a_${i}`,
          name: `Region A ${i}`,
          originId: nodeId,
          originPosition: { x: 0, y: 0 },
          destinationId: chokepoint,
          destinationPosition: { x: 100, y: 100 },
          distance: 100,
          travelTimeTicks: 100,
          passageIds: [],
          activeCaravans: [],
          flowRate: 200, // High flow
          capacity: 300,
          hazards: [],
          safetyRating: 1.0,
          tollRate: 0.1,
          status: 'active',
          lastUsedTick: world.tick,
        };

        const laneEntity = world.createEntity();
        (laneEntity as EntityImpl).addComponent(lane);
      });

      // Chokepoint -> Region B
      regionB.forEach((nodeId, i) => {
        const lane: ShippingLaneComponent = {
          type: 'shipping_lane',
          version: 1,
          laneId: `lane_b_${i}`,
          name: `Region B ${i}`,
          originId: chokepoint,
          originPosition: { x: 100, y: 100 },
          destinationId: nodeId,
          destinationPosition: { x: 200, y: 200 },
          distance: 100,
          travelTimeTicks: 100,
          passageIds: [],
          activeCaravans: [],
          flowRate: 200, // High flow
          capacity: 300,
          hazards: [],
          safetyRating: 1.0,
          tollRate: 0.1,
          status: 'active',
          lastUsedTick: world.tick,
        };

        const laneEntity = world.createEntity();
        (laneEntity as EntityImpl).addComponent(lane);
      });

      const networkEntity = world.createEntity();
      const network = createTradeNetworkComponent(
        'strategic_network',
        'Strategic Network',
        'system',
        'spatial_tier_1'
      );
      (networkEntity as EntityImpl).addComponent(network);

      system.update(world);

      const updatedNetwork = networkEntity.getComponent<TradeNetworkComponent>('trade_network');

      const chokepointData = updatedNetwork!.chokepoints.find(c => c.nodeId === chokepoint);
      expect(chokepointData).toBeDefined();
      expect(chokepointData!.strategicValue).toBeGreaterThan(0.5); // High strategic value
      expect(chokepointData!.affectedNodes.length).toBeGreaterThan(0);
    });
  });

  describe('Blockade Mechanics', () => {
    it('should create blockade and reduce flow rates', () => {
      // Create simple 3-node network
      const [hub, spokeA, spokeB] = [
        world.createEntity().id,
        world.createEntity().id,
        world.createEntity().id,
      ];

      // Create lanes
      const laneA: ShippingLaneComponent = {
        type: 'shipping_lane',
        version: 1,
        laneId: 'lane_a',
        name: 'Lane A',
        originId: spokeA,
        originPosition: { x: 0, y: 0 },
        destinationId: hub,
        destinationPosition: { x: 100, y: 100 },
        distance: 100,
        travelTimeTicks: 100,
        passageIds: [],
        activeCaravans: [],
        flowRate: 100,
        capacity: 200,
        hazards: [],
        safetyRating: 1.0,
        tollRate: 0.1,
        status: 'active',
        lastUsedTick: world.tick,
      };

      const laneB: ShippingLaneComponent = {
        type: 'shipping_lane',
        version: 1,
        laneId: 'lane_b',
        name: 'Lane B',
        originId: hub,
        originPosition: { x: 100, y: 100 },
        destinationId: spokeB,
        destinationPosition: { x: 200, y: 200 },
        distance: 100,
        travelTimeTicks: 100,
        passageIds: [],
        activeCaravans: [],
        flowRate: 100,
        capacity: 200,
        hazards: [],
        safetyRating: 1.0,
        tollRate: 0.1,
        status: 'active',
        lastUsedTick: world.tick,
      };

      const laneEntityA = world.createEntity();
      (laneEntityA as EntityImpl).addComponent(laneA);

      const laneEntityB = world.createEntity();
      (laneEntityB as EntityImpl).addComponent(laneB);

      // Create network
      const networkEntity = world.createEntity();
      const network = createTradeNetworkComponent(
        'blockade_network',
        'Blockade Test Network',
        'system',
        'spatial_tier_1'
      );
      (networkEntity as EntityImpl).addComponent(network);

      system.update(world);

      // Create blockade at hub
      const result = system.createBlockade(
        world,
        'blockade_network',
        hub,
        'fleet_1',
        'faction_1',
        1000 // High fleet strength
      );

      expect(result.success).toBe(true);
      expect(result.blockadeId).toBeDefined();

      // Update system to process blockade
      system.update(world);

      // Check flow rates reduced
      const updatedLaneA = laneEntityA.getComponent<ShippingLaneComponent>('shipping_lane');
      const updatedLaneB = laneEntityB.getComponent<ShippingLaneComponent>('shipping_lane');

      // Flow should be reduced (or lane blocked)
      expect(updatedLaneA!.flowRate).toBeLessThan(100);
      expect(updatedLaneB!.flowRate).toBeLessThan(100);
    });

    it('should emit shortage events for dependent nodes', () => {
      // Create linear chain with blockade at chokepoint
      const [nodeA, chokepoint, nodeB] = [
        world.createEntity().id,
        world.createEntity().id,
        world.createEntity().id,
      ];

      const lane1: ShippingLaneComponent = {
        type: 'shipping_lane',
        version: 1,
        laneId: 'lane_1',
        name: 'Lane 1',
        originId: nodeA,
        originPosition: { x: 0, y: 0 },
        destinationId: chokepoint,
        destinationPosition: { x: 100, y: 100 },
        distance: 100,
        travelTimeTicks: 100,
        passageIds: [],
        activeCaravans: [],
        flowRate: 100,
        capacity: 200,
        hazards: [],
        safetyRating: 1.0,
        tollRate: 0.1,
        status: 'active',
        lastUsedTick: world.tick,
      };

      const lane2: ShippingLaneComponent = {
        type: 'shipping_lane',
        version: 1,
        laneId: 'lane_2',
        name: 'Lane 2',
        originId: chokepoint,
        originPosition: { x: 100, y: 100 },
        destinationId: nodeB,
        destinationPosition: { x: 200, y: 200 },
        distance: 100,
        travelTimeTicks: 100,
        passageIds: [],
        activeCaravans: [],
        flowRate: 100,
        capacity: 200,
        hazards: [],
        safetyRating: 1.0,
        tollRate: 0.1,
        status: 'active',
        lastUsedTick: world.tick,
      };

      const laneEntity1 = world.createEntity();
      (laneEntity1 as EntityImpl).addComponent(lane1);

      const laneEntity2 = world.createEntity();
      (laneEntity2 as EntityImpl).addComponent(lane2);

      const networkEntity = world.createEntity();
      const network = createTradeNetworkComponent(
        'cascade_network',
        'Cascade Test Network',
        'planet',
        'spatial_tier_1'
      );
      (networkEntity as EntityImpl).addComponent(network);

      system.update(world);

      // Track shortage events
      let shortageDetected = false;
      world.eventBus.on('trade:shortage_detected', () => {
        shortageDetected = true;
      });

      // Create blockade
      system.createBlockade(
        world,
        'cascade_network',
        chokepoint,
        'fleet_1',
        'faction_1',
        1000
      );

      system.update(world);

      // Shortage event should be emitted for nodeB
      expect(shortageDetected).toBe(true);
    });
  });

  describe('Economic Analysis', () => {
    it('should calculate trade balance correctly', () => {
      // Create importer/exporter nodes
      const [exporter, hub, importer] = [
        world.createEntity().id,
        world.createEntity().id,
        world.createEntity().id,
      ];

      const lane1: ShippingLaneComponent = {
        type: 'shipping_lane',
        version: 1,
        laneId: 'export_lane',
        name: 'Export Lane',
        originId: exporter,
        originPosition: { x: 0, y: 0 },
        destinationId: hub,
        destinationPosition: { x: 100, y: 100 },
        distance: 100,
        travelTimeTicks: 100,
        passageIds: [],
        activeCaravans: [],
        flowRate: 200, // High export flow
        capacity: 300,
        hazards: [],
        safetyRating: 1.0,
        tollRate: 0.1,
        status: 'active',
        lastUsedTick: world.tick,
      };

      const lane2: ShippingLaneComponent = {
        type: 'shipping_lane',
        version: 1,
        laneId: 'import_lane',
        name: 'Import Lane',
        originId: hub,
        originPosition: { x: 100, y: 100 },
        destinationId: importer,
        destinationPosition: { x: 200, y: 200 },
        distance: 100,
        travelTimeTicks: 100,
        passageIds: [],
        activeCaravans: [],
        flowRate: 200, // High import flow
        capacity: 300,
        hazards: [],
        safetyRating: 1.0,
        tollRate: 0.1,
        status: 'active',
        lastUsedTick: world.tick,
      };

      const laneEntity1 = world.createEntity();
      (laneEntity1 as EntityImpl).addComponent(lane1);

      const laneEntity2 = world.createEntity();
      (laneEntity2 as EntityImpl).addComponent(lane2);

      const networkEntity = world.createEntity();
      const network = createTradeNetworkComponent(
        'balance_network',
        'Balance Test Network',
        'system',
        'spatial_tier_1'
      );
      (networkEntity as EntityImpl).addComponent(network);

      system.update(world);

      const updatedNetwork = networkEntity.getComponent<TradeNetworkComponent>('trade_network');

      // Exporter should have negative balance (exports > imports)
      const exporterBalance = updatedNetwork!.tradeBalance.get(exporter);
      expect(exporterBalance).toBeLessThan(0);

      // Importer should have positive balance (imports > exports)
      const importerBalance = updatedNetwork!.tradeBalance.get(importer);
      expect(importerBalance).toBeGreaterThan(0);
    });

    it('should calculate wealth distribution (Gini coefficient)', () => {
      // Create unequal network: 1 major hub, many small nodes
      const majorHub = world.createEntity().id;
      const smallNodes: string[] = [];

      for (let i = 0; i < 10; i++) {
        const nodeId = world.createEntity().id;
        smallNodes.push(nodeId);

        const lane: ShippingLaneComponent = {
          type: 'shipping_lane',
          version: 1,
          laneId: `lane_${i}`,
          name: `Lane ${i}`,
          originId: nodeId,
          originPosition: { x: 0, y: 0 },
          destinationId: majorHub,
          destinationPosition: { x: 100, y: 100 },
          distance: 100,
          travelTimeTicks: 100,
          passageIds: [],
          activeCaravans: [],
          flowRate: i === 0 ? 1000 : 10, // One high-flow, rest low-flow
          capacity: 2000,
          hazards: [],
          safetyRating: 1.0,
          tollRate: 0.1,
          status: 'active',
          lastUsedTick: world.tick,
        };

        const laneEntity = world.createEntity();
        (laneEntity as EntityImpl).addComponent(lane);
      }

      const networkEntity = world.createEntity();
      const network = createTradeNetworkComponent(
        'inequality_network',
        'Inequality Test Network',
        'planet',
        'spatial_tier_1'
      );
      (networkEntity as EntityImpl).addComponent(network);

      system.update(world);

      const updatedNetwork = networkEntity.getComponent<TradeNetworkComponent>('trade_network');

      // Gini coefficient should indicate inequality
      expect(updatedNetwork!.wealthDistribution.giniCoefficient).toBeGreaterThan(0);

      // Top decile should control significant share
      expect(updatedNetwork!.wealthDistribution.topDecile).toBeGreaterThan(0.5);
    });
  });

  describe('Network Resilience', () => {
    it('should calculate resilience score based on critical nodes', () => {
      // Create resilient network with redundancy (mesh topology)
      const nodes = [
        world.createEntity().id,
        world.createEntity().id,
        world.createEntity().id,
        world.createEntity().id,
      ];

      // Full mesh: every node connected to every other node
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const lane: ShippingLaneComponent = {
            type: 'shipping_lane',
            version: 1,
            laneId: `lane_${i}_${j}`,
            name: `Lane ${i}-${j}`,
            originId: nodes[i]!,
            originPosition: { x: i * 100, y: 0 },
            destinationId: nodes[j]!,
            destinationPosition: { x: j * 100, y: 0 },
            distance: Math.abs(j - i) * 100,
            travelTimeTicks: Math.abs(j - i) * 100,
            passageIds: [],
            activeCaravans: [],
            flowRate: 100,
            capacity: 200,
            hazards: [],
            safetyRating: 1.0,
            tollRate: 0.1,
            status: 'active',
            lastUsedTick: world.tick,
          };

          const laneEntity = world.createEntity();
          (laneEntity as EntityImpl).addComponent(lane);
        }
      }

      const networkEntity = world.createEntity();
      const network = createTradeNetworkComponent(
        'resilient_network',
        'Resilient Mesh Network',
        'system',
        'spatial_tier_1'
      );
      (networkEntity as EntityImpl).addComponent(network);

      system.update(world);

      const updatedNetwork = networkEntity.getComponent<TradeNetworkComponent>('trade_network');

      // Mesh network should be highly resilient (no critical nodes)
      expect(updatedNetwork!.resilienceScore).toBeGreaterThan(0.8);
      expect(updatedNetwork!.criticalNodes.size).toBe(0); // No articulation points
    });

    it('should emit low resilience event when threshold crossed', () => {
      // Create vulnerable linear network
      const nodes = [
        world.createEntity().id,
        world.createEntity().id,
        world.createEntity().id,
      ];

      // Linear chain (low resilience)
      for (let i = 0; i < nodes.length - 1; i++) {
        const lane: ShippingLaneComponent = {
          type: 'shipping_lane',
          version: 1,
          laneId: `lane_${i}`,
          name: `Lane ${i}`,
          originId: nodes[i]!,
          originPosition: { x: i * 100, y: 0 },
          destinationId: nodes[i + 1]!,
          destinationPosition: { x: (i + 1) * 100, y: 0 },
          distance: 100,
          travelTimeTicks: 100,
          passageIds: [],
          activeCaravans: [],
          flowRate: 100,
          capacity: 200,
          hazards: [],
          safetyRating: 1.0,
          tollRate: 0.1,
          status: 'active',
          lastUsedTick: world.tick,
        };

        const laneEntity = world.createEntity();
        (laneEntity as EntityImpl).addComponent(lane);
      }

      const networkEntity = world.createEntity();
      const network = createTradeNetworkComponent(
        'vulnerable_network',
        'Vulnerable Linear Network',
        'planet',
        'spatial_tier_1'
      );
      (networkEntity as EntityImpl).addComponent(network);

      let resilienceWarningEmitted = false;
      world.eventBus.on('trade:network_resilience_low', () => {
        resilienceWarningEmitted = true;
      });

      system.update(world);

      const updatedNetwork = networkEntity.getComponent<TradeNetworkComponent>('trade_network');

      // Linear network should have low resilience
      expect(updatedNetwork!.resilienceScore).toBeLessThan(0.5);

      // Event should be emitted
      expect(resilienceWarningEmitted).toBe(true);
    });
  });
});
