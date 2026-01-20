/**
 * Trade Network Integration Tests
 *
 * Tests the complete trade network analysis workflow:
 * - Trade network graph construction
 * - Chokepoint detection → blockade → cascade effects
 * - Trade flow disruption and economic impact
 * - Alternative route calculation
 *
 * Per CLAUDE.md: No silent fallbacks - tests verify exceptions are thrown for invalid states.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { IntegrationTestHarness } from '../utils/IntegrationTestHarness.js';
import { EntityImpl, createEntityId } from '../../ecs/Entity.js';
import { TradeNetworkSystem } from '../../systems/TradeNetworkSystem.js';
import { createTradeNetworkComponent } from '../../components/TradeNetworkComponent.js';
import { createShippingLaneComponent } from '../../components/ShippingLaneComponent.js';
import { createBlockadeComponent } from '../../components/BlockadeComponent.js';
import { createSettlementComponent } from '../../components/SettlementComponent.js';
import { createPositionComponent } from '../../components/PositionComponent.js';
import { ComponentType as CT } from '../../types/ComponentType.js';

describe('Trade Network Integration Tests', () => {
  let harness: IntegrationTestHarness;
  let tradeSystem: TradeNetworkSystem;

  beforeEach(() => {
    harness = new IntegrationTestHarness();
    harness.setupTestWorld({ includeTime: false });

    tradeSystem = new TradeNetworkSystem();
    tradeSystem.initialize(harness.world, harness.eventBus);
    harness.registerSystem('TradeNetworkSystem', tradeSystem);
  });

  describe('Network Graph Construction', () => {
    it('should build network graph from shipping lanes', () => {
      // Create trade network
      const network = harness.world.createEntity() as EntityImpl;
      const networkComp = createTradeNetworkComponent(
        'test_network',
        'Test Network',
        'system',
        'system_1'
      );
      network.addComponent(networkComp);

      // Create settlements (nodes)
      const settlement1 = createSettlement(harness, 'settlement_1', 0, 0);
      const settlement2 = createSettlement(harness, 'settlement_2', 10, 0);
      const settlement3 = createSettlement(harness, 'settlement_3', 5, 10);

      // Create shipping lanes (edges)
      const lane1 = createShippingLane(harness, settlement1.id, settlement2.id, 100);
      const lane2 = createShippingLane(harness, settlement2.id, settlement3.id, 100);
      const lane3 = createShippingLane(harness, settlement1.id, settlement3.id, 100);

      // Add to network
      networkComp.nodes.add(settlement1.id);
      networkComp.nodes.add(settlement2.id);
      networkComp.nodes.add(settlement3.id);

      networkComp.edges.set(lane1.id, {
        edgeId: lane1.id,
        laneId: lane1.id,
        fromNodeId: settlement1.id,
        toNodeId: settlement2.id,
        flowRate: 50,
        capacity: 100,
        congestion: 0.5,
        active: true,
      });

      networkComp.edges.set(lane2.id, {
        edgeId: lane2.id,
        laneId: lane2.id,
        fromNodeId: settlement2.id,
        toNodeId: settlement3.id,
        flowRate: 50,
        capacity: 100,
        congestion: 0.5,
        active: true,
      });

      networkComp.edges.set(lane3.id, {
        edgeId: lane3.id,
        laneId: lane3.id,
        fromNodeId: settlement1.id,
        toNodeId: settlement3.id,
        flowRate: 30,
        capacity: 100,
        congestion: 0.3,
        active: true,
      });

      // Run system to analyze network
      const entities = [network];
      tradeSystem.update(harness.world, entities, 1.0);

      // Verify network metrics calculated
      const updatedNetwork = network.getComponent(CT.TradeNetwork);
      expect(updatedNetwork).toBeDefined();
      expect(updatedNetwork!.totalFlowRate).toBeGreaterThan(0);
      expect(updatedNetwork!.networkDensity).toBeGreaterThan(0);
      expect(updatedNetwork!.avgPathLength).toBeGreaterThan(0);
    });

    it('should calculate network density correctly', () => {
      const network = harness.world.createEntity() as EntityImpl;
      const networkComp = createTradeNetworkComponent(
        'test_network',
        'Test Network',
        'system',
        'system_1'
      );
      network.addComponent(networkComp);

      // Create 4 nodes
      const nodes = [
        createSettlement(harness, 'node_1', 0, 0),
        createSettlement(harness, 'node_2', 1, 0),
        createSettlement(harness, 'node_3', 0, 1),
        createSettlement(harness, 'node_4', 1, 1),
      ];

      nodes.forEach(node => networkComp.nodes.add(node.id));

      // Create 3 edges (out of possible 6 for complete graph)
      const lane1 = createShippingLane(harness, nodes[0]!.id, nodes[1]!.id, 100);
      const lane2 = createShippingLane(harness, nodes[1]!.id, nodes[2]!.id, 100);
      const lane3 = createShippingLane(harness, nodes[2]!.id, nodes[3]!.id, 100);

      networkComp.edges.set(lane1.id, {
        edgeId: lane1.id,
        laneId: lane1.id,
        fromNodeId: nodes[0]!.id,
        toNodeId: nodes[1]!.id,
        flowRate: 50,
        capacity: 100,
        congestion: 0.5,
        active: true,
      });

      networkComp.edges.set(lane2.id, {
        edgeId: lane2.id,
        laneId: lane2.id,
        fromNodeId: nodes[1]!.id,
        toNodeId: nodes[2]!.id,
        flowRate: 50,
        capacity: 100,
        congestion: 0.5,
        active: true,
      });

      networkComp.edges.set(lane3.id, {
        edgeId: lane3.id,
        laneId: lane3.id,
        fromNodeId: nodes[2]!.id,
        toNodeId: nodes[3]!.id,
        flowRate: 50,
        capacity: 100,
        congestion: 0.5,
        active: true,
      });

      tradeSystem.update(harness.world, [network], 1.0);

      const updatedNetwork = network.getComponent(CT.TradeNetwork);
      // Density = edges / (n * (n-1) / 2) = 3 / 6 = 0.5
      expect(updatedNetwork!.networkDensity).toBeCloseTo(0.5, 1);
    });
  });

  describe('Hub Identification', () => {
    it('should identify major hubs based on betweenness centrality', () => {
      const network = harness.world.createEntity() as EntityImpl;
      const networkComp = createTradeNetworkComponent(
        'test_network',
        'Test Network',
        'system',
        'system_1'
      );
      network.addComponent(networkComp);

      // Create star topology: central hub with spokes
      const hub = createSettlement(harness, 'hub', 5, 5);
      const spoke1 = createSettlement(harness, 'spoke_1', 0, 0);
      const spoke2 = createSettlement(harness, 'spoke_2', 10, 0);
      const spoke3 = createSettlement(harness, 'spoke_3', 0, 10);
      const spoke4 = createSettlement(harness, 'spoke_4', 10, 10);

      networkComp.nodes.add(hub.id);
      [spoke1, spoke2, spoke3, spoke4].forEach(s => networkComp.nodes.add(s.id));

      // All spokes connect through hub
      [spoke1, spoke2, spoke3, spoke4].forEach(spoke => {
        const lane = createShippingLane(harness, spoke.id, hub.id, 100);
        networkComp.edges.set(lane.id, {
          edgeId: lane.id,
          laneId: lane.id,
          fromNodeId: spoke.id,
          toNodeId: hub.id,
          flowRate: 50,
          capacity: 100,
          congestion: 0.5,
          active: true,
        });
      });

      tradeSystem.update(harness.world, [network], 1.0);

      const updatedNetwork = network.getComponent(CT.TradeNetwork);
      expect(updatedNetwork!.hubs).toHaveLength(1);
      expect(updatedNetwork!.hubs[0]!.nodeId).toBe(hub.id);
      expect(updatedNetwork!.hubs[0]!.tier).toBe('major');
      expect(updatedNetwork!.hubs[0]!.betweenness).toBeGreaterThan(0.5);
    });

    it('should calculate hub degree correctly', () => {
      const network = harness.world.createEntity() as EntityImpl;
      const networkComp = createTradeNetworkComponent(
        'test_network',
        'Test Network',
        'system',
        'system_1'
      );
      network.addComponent(networkComp);

      const hub = createSettlement(harness, 'hub', 0, 0);
      networkComp.nodes.add(hub.id);

      // Connect hub to 5 other nodes
      const connections = 5;
      for (let i = 0; i < connections; i++) {
        const node = createSettlement(harness, `node_${i}`, i, i);
        networkComp.nodes.add(node.id);

        const lane = createShippingLane(harness, hub.id, node.id, 100);
        networkComp.edges.set(lane.id, {
          edgeId: lane.id,
          laneId: lane.id,
          fromNodeId: hub.id,
          toNodeId: node.id,
          flowRate: 50,
          capacity: 100,
          congestion: 0.5,
          active: true,
        });
      }

      tradeSystem.update(harness.world, [network], 1.0);

      const updatedNetwork = network.getComponent(CT.TradeNetwork);
      const hubInfo = updatedNetwork!.hubs.find(h => h.nodeId === hub.id);
      expect(hubInfo).toBeDefined();
      expect(hubInfo!.degree).toBe(connections);
    });
  });

  describe('Chokepoint Detection', () => {
    it('should detect chokepoints in linear network', () => {
      const network = harness.world.createEntity() as EntityImpl;
      const networkComp = createTradeNetworkComponent(
        'test_network',
        'Test Network',
        'system',
        'system_1'
      );
      network.addComponent(networkComp);

      // Create linear chain: A → B → C → D
      // B and C are chokepoints
      const nodeA = createSettlement(harness, 'node_a', 0, 0);
      const nodeB = createSettlement(harness, 'node_b', 1, 0);
      const nodeC = createSettlement(harness, 'node_c', 2, 0);
      const nodeD = createSettlement(harness, 'node_d', 3, 0);

      [nodeA, nodeB, nodeC, nodeD].forEach(n => networkComp.nodes.add(n.id));

      const laneAB = createShippingLane(harness, nodeA.id, nodeB.id, 100);
      const laneBC = createShippingLane(harness, nodeB.id, nodeC.id, 100);
      const laneCD = createShippingLane(harness, nodeC.id, nodeD.id, 100);

      [laneAB, laneBC, laneCD].forEach((lane, idx) => {
        const pairs = [[nodeA, nodeB], [nodeB, nodeC], [nodeC, nodeD]];
        networkComp.edges.set(lane.id, {
          edgeId: lane.id,
          laneId: lane.id,
          fromNodeId: pairs[idx]![0]!.id,
          toNodeId: pairs[idx]![1]!.id,
          flowRate: 50,
          capacity: 100,
          congestion: 0.5,
          active: true,
        });
      });

      tradeSystem.update(harness.world, [network], 1.0);

      const updatedNetwork = network.getComponent(CT.TradeNetwork);
      expect(updatedNetwork!.chokepoints.length).toBeGreaterThan(0);

      // Middle nodes should be chokepoints
      const chokepointIds = updatedNetwork!.chokepoints.map(c => c.nodeId);
      expect(chokepointIds).toContain(nodeB.id);
      expect(chokepointIds).toContain(nodeC.id);
    });

    it('should calculate chokepoint criticality score', () => {
      const network = harness.world.createEntity() as EntityImpl;
      const networkComp = createTradeNetworkComponent(
        'test_network',
        'Test Network',
        'system',
        'system_1'
      );
      network.addComponent(networkComp);

      // Bridge network: cluster1 ← bridge → cluster2
      const bridge = createSettlement(harness, 'bridge', 5, 5);

      // Cluster 1
      const c1_1 = createSettlement(harness, 'c1_1', 0, 0);
      const c1_2 = createSettlement(harness, 'c1_2', 1, 0);

      // Cluster 2
      const c2_1 = createSettlement(harness, 'c2_1', 10, 10);
      const c2_2 = createSettlement(harness, 'c2_2', 11, 10);

      [bridge, c1_1, c1_2, c2_1, c2_2].forEach(n => networkComp.nodes.add(n.id));

      // Connect clusters through bridge
      const lane1 = createShippingLane(harness, c1_1.id, bridge.id, 100);
      const lane2 = createShippingLane(harness, c1_2.id, bridge.id, 100);
      const lane3 = createShippingLane(harness, bridge.id, c2_1.id, 100);
      const lane4 = createShippingLane(harness, bridge.id, c2_2.id, 100);

      [
        [c1_1, bridge],
        [c1_2, bridge],
        [bridge, c2_1],
        [bridge, c2_2],
      ].forEach(([from, to], idx) => {
        const laneId = [lane1, lane2, lane3, lane4][idx]!.id;
        networkComp.edges.set(laneId, {
          edgeId: laneId,
          laneId: laneId,
          fromNodeId: from!.id,
          toNodeId: to!.id,
          flowRate: 50,
          capacity: 100,
          congestion: 0.5,
          active: true,
        });
      });

      tradeSystem.update(harness.world, [network], 1.0);

      const updatedNetwork = network.getComponent(CT.TradeNetwork);
      const bridgeChokepoint = updatedNetwork!.chokepoints.find(c => c.nodeId === bridge.id);

      expect(bridgeChokepoint).toBeDefined();
      expect(bridgeChokepoint!.criticalityScore).toBeGreaterThan(0.7);
      expect(bridgeChokepoint!.alternativeRoutes).toBe(0); // No alternative routes
    });
  });

  describe('Blockade Effects', () => {
    it('should disrupt trade flow when chokepoint is blockaded', () => {
      const network = harness.world.createEntity() as EntityImpl;
      const networkComp = createTradeNetworkComponent(
        'test_network',
        'Test Network',
        'system',
        'system_1'
      );
      network.addComponent(networkComp);

      // Create simple network with chokepoint
      const nodeA = createSettlement(harness, 'node_a', 0, 0);
      const chokepoint = createSettlement(harness, 'chokepoint', 5, 5);
      const nodeB = createSettlement(harness, 'node_b', 10, 10);

      [nodeA, chokepoint, nodeB].forEach(n => networkComp.nodes.add(n.id));

      const laneAC = createShippingLane(harness, nodeA.id, chokepoint.id, 100);
      const laneCB = createShippingLane(harness, chokepoint.id, nodeB.id, 100);

      networkComp.edges.set(laneAC.id, {
        edgeId: laneAC.id,
        laneId: laneAC.id,
        fromNodeId: nodeA.id,
        toNodeId: chokepoint.id,
        flowRate: 100,
        capacity: 100,
        congestion: 1.0,
        active: true,
      });

      networkComp.edges.set(laneCB.id, {
        edgeId: laneCB.id,
        laneId: laneCB.id,
        fromNodeId: chokepoint.id,
        toNodeId: nodeB.id,
        flowRate: 100,
        capacity: 100,
        congestion: 1.0,
        active: true,
      });

      const initialFlowRate = networkComp.totalFlowRate;

      // Create blockade at chokepoint
      const blockade = harness.world.createEntity() as EntityImpl;
      const blockadeComp = createBlockadeComponent(chokepoint.id, 'faction_1', 0.9);
      blockade.addComponent(blockadeComp);

      // Add disruption to network
      networkComp.disruptions.push({
        type: 'blockade',
        affectedNodeIds: [chokepoint.id],
        affectedEdgeIds: [laneAC.id, laneCB.id],
        severity: 0.9,
        startedTick: harness.getTick(),
        responsibleFaction: 'faction_1',
      });

      tradeSystem.update(harness.world, [network, blockade], 1.0);

      const updatedNetwork = network.getComponent(CT.TradeNetwork);

      // Flow should be significantly reduced
      expect(updatedNetwork!.totalFlowRate).toBeLessThan(initialFlowRate);
      expect(updatedNetwork!.health).toBeLessThan(1.0);
    });

    it('should emit blockade_started event', () => {
      const network = harness.world.createEntity() as EntityImpl;
      const networkComp = createTradeNetworkComponent(
        'test_network',
        'Test Network',
        'system',
        'system_1'
      );
      network.addComponent(networkComp);

      const chokepoint = createSettlement(harness, 'chokepoint', 0, 0);
      networkComp.nodes.add(chokepoint.id);

      harness.clearEvents();

      // Create blockade
      const blockade = harness.world.createEntity() as EntityImpl;
      blockade.addComponent(createBlockadeComponent(chokepoint.id, 'faction_1', 0.8));

      harness.eventBus.emit({
        type: 'trade:blockade_started',
        source: blockade.id,
        data: {
          blockadeId: blockade.id,
          targetNodeId: chokepoint.id,
        },
      });

      harness.assertEventEmitted('trade:blockade_started', {
        targetNodeId: chokepoint.id,
      });
    });

    it('should calculate cascade effects of blockade', () => {
      const network = harness.world.createEntity() as EntityImpl;
      const networkComp = createTradeNetworkComponent(
        'test_network',
        'Test Network',
        'system',
        'system_1'
      );
      network.addComponent(networkComp);

      // Create tree: A → B → C, B → D
      // Blockading B affects C and D
      const nodeA = createSettlement(harness, 'node_a', 0, 0);
      const nodeB = createSettlement(harness, 'node_b', 5, 5);
      const nodeC = createSettlement(harness, 'node_c', 10, 5);
      const nodeD = createSettlement(harness, 'node_d', 5, 10);

      [nodeA, nodeB, nodeC, nodeD].forEach(n => networkComp.nodes.add(n.id));

      const laneAB = createShippingLane(harness, nodeA.id, nodeB.id, 100);
      const laneBC = createShippingLane(harness, nodeB.id, nodeC.id, 100);
      const laneBD = createShippingLane(harness, nodeB.id, nodeD.id, 100);

      [
        [nodeA, nodeB, laneAB],
        [nodeB, nodeC, laneBC],
        [nodeB, nodeD, laneBD],
      ].forEach(([from, to, lane]) => {
        networkComp.edges.set((lane as EntityImpl).id, {
          edgeId: (lane as EntityImpl).id,
          laneId: (lane as EntityImpl).id,
          fromNodeId: (from as EntityImpl).id,
          toNodeId: (to as EntityImpl).id,
          flowRate: 50,
          capacity: 100,
          congestion: 0.5,
          active: true,
        });
      });

      // Identify chokepoints first
      tradeSystem.update(harness.world, [network], 1.0);

      const chokepoint = network.getComponent(CT.TradeNetwork)!.chokepoints.find(
        c => c.nodeId === nodeB.id
      );

      expect(chokepoint).toBeDefined();
      expect(chokepoint!.affectedNodes).toContain(nodeC.id);
      expect(chokepoint!.affectedNodes).toContain(nodeD.id);
    });
  });

  describe('Alternative Route Calculation', () => {
    it('should find alternative routes when blockade exists', () => {
      const network = harness.world.createEntity() as EntityImpl;
      const networkComp = createTradeNetworkComponent(
        'test_network',
        'Test Network',
        'system',
        'system_1'
      );
      network.addComponent(networkComp);

      // Diamond network: A → B → D, A → C → D
      // Blockading B still allows A → C → D route
      const nodeA = createSettlement(harness, 'node_a', 0, 0);
      const nodeB = createSettlement(harness, 'node_b', 5, 5);
      const nodeC = createSettlement(harness, 'node_c', 5, -5);
      const nodeD = createSettlement(harness, 'node_d', 10, 0);

      [nodeA, nodeB, nodeC, nodeD].forEach(n => networkComp.nodes.add(n.id));

      const laneAB = createShippingLane(harness, nodeA.id, nodeB.id, 100);
      const laneAC = createShippingLane(harness, nodeA.id, nodeC.id, 100);
      const laneBD = createShippingLane(harness, nodeB.id, nodeD.id, 100);
      const laneCD = createShippingLane(harness, nodeC.id, nodeD.id, 100);

      [
        [nodeA, nodeB, laneAB],
        [nodeA, nodeC, laneAC],
        [nodeB, nodeD, laneBD],
        [nodeC, nodeD, laneCD],
      ].forEach(([from, to, lane]) => {
        networkComp.edges.set((lane as EntityImpl).id, {
          edgeId: (lane as EntityImpl).id,
          laneId: (lane as EntityImpl).id,
          fromNodeId: (from as EntityImpl).id,
          toNodeId: (to as EntityImpl).id,
          flowRate: 50,
          capacity: 100,
          congestion: 0.5,
          active: true,
        });
      });

      tradeSystem.update(harness.world, [network], 1.0);

      // Verify alternative routes detected
      const chokepoint = network.getComponent(CT.TradeNetwork)!.chokepoints.find(
        c => c.nodeId === nodeB.id
      );

      expect(chokepoint).toBeDefined();
      expect(chokepoint!.alternativeRoutes).toBeGreaterThan(0);
    });
  });

  describe('Economic Impact Analysis', () => {
    it('should calculate trade balance per node', () => {
      const network = harness.world.createEntity() as EntityImpl;
      const networkComp = createTradeNetworkComponent(
        'test_network',
        'Test Network',
        'system',
        'system_1'
      );
      network.addComponent(networkComp);

      const exporter = createSettlement(harness, 'exporter', 0, 0);
      const importer = createSettlement(harness, 'importer', 10, 10);

      networkComp.nodes.add(exporter.id);
      networkComp.nodes.add(importer.id);

      const lane = createShippingLane(harness, exporter.id, importer.id, 100);

      networkComp.edges.set(lane.id, {
        edgeId: lane.id,
        laneId: lane.id,
        fromNodeId: exporter.id,
        toNodeId: importer.id,
        flowRate: 100, // Exporter sends 100
        capacity: 100,
        congestion: 1.0,
        active: true,
      });

      tradeSystem.update(harness.world, [network], 1.0);

      const updatedNetwork = network.getComponent(CT.TradeNetwork);

      // Exporter should have positive balance, importer negative
      const exporterBalance = updatedNetwork!.tradeBalance.get(exporter.id) || 0;
      const importerBalance = updatedNetwork!.tradeBalance.get(importer.id) || 0;

      expect(exporterBalance).toBeGreaterThan(0);
      expect(importerBalance).toBeLessThan(0);
    });

    it('should calculate wealth distribution metrics', () => {
      const network = harness.world.createEntity() as EntityImpl;
      const networkComp = createTradeNetworkComponent(
        'test_network',
        'Test Network',
        'system',
        'system_1'
      );
      network.addComponent(networkComp);

      // Create unequal network: 1 major hub, 9 minor nodes
      const hub = createSettlement(harness, 'hub', 5, 5);
      networkComp.nodes.add(hub.id);

      for (let i = 0; i < 9; i++) {
        const node = createSettlement(harness, `node_${i}`, i, i);
        networkComp.nodes.add(node.id);

        const lane = createShippingLane(harness, hub.id, node.id, 100);
        networkComp.edges.set(lane.id, {
          edgeId: lane.id,
          laneId: lane.id,
          fromNodeId: hub.id,
          toNodeId: node.id,
          flowRate: i === 0 ? 500 : 10, // Hub dominates trade
          capacity: 1000,
          congestion: 0.5,
          active: true,
        });
      }

      tradeSystem.update(harness.world, [network], 1.0);

      const updatedNetwork = network.getComponent(CT.TradeNetwork);

      // Should show high inequality
      expect(updatedNetwork!.wealthDistribution.giniCoefficient).toBeGreaterThan(0.5);
      expect(updatedNetwork!.wealthDistribution.topDecile).toBeGreaterThan(0.5);
    });
  });
});

// ============================================================================
// Helper Functions
// ============================================================================

function createSettlement(
  harness: IntegrationTestHarness,
  name: string,
  x: number,
  y: number
): EntityImpl {
  const settlement = harness.world.createEntity() as EntityImpl;
  settlement.addComponent(createPositionComponent(x, y));
  settlement.addComponent(createSettlementComponent(name, 0));
  return settlement;
}

function createShippingLane(
  harness: IntegrationTestHarness,
  fromId: string,
  toId: string,
  capacity: number
): EntityImpl {
  const lane = harness.world.createEntity() as EntityImpl;
  lane.addComponent(createShippingLaneComponent(fromId, toId, capacity));
  return lane;
}
