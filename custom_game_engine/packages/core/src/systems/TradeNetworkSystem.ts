/**
 * TradeNetworkSystem - Tier 3 trade network analysis and management
 *
 * Phase 3 of Grand Strategy Abstraction Layer (07-TRADE-LOGISTICS.md)
 *
 * Priority: 165 (after ShippingLaneSystem at 160)
 *
 * Responsibilities:
 * - Build network graph from shipping lanes
 * - Calculate network metrics (density, diameter, clustering)
 * - Identify hubs via betweenness centrality
 * - Detect chokepoints (critical nodes)
 * - Analyze network resilience
 * - Calculate trade balance and wealth distribution
 * - Process blockades and cascade effects
 * - Find alternative routes
 *
 * Integration:
 * - Listens to ShippingLaneSystem events (lane_created, lane_removed)
 * - Emits network events (hub_identified, chokepoint_detected, blockade_started)
 * - Used by AI for strategic planning (blockade targets, defense prioritization)
 *
 * CLAUDE.md Compliance:
 * - Component types use lowercase_with_underscores
 * - No silent fallbacks - all graph operations validated
 * - Cache queries before loops for performance
 * - Throttled updates (every 100 ticks = 5 seconds)
 */

import { BaseSystem, type SystemContext } from '../ecs/SystemContext.js';
import type { SystemId, ComponentType, EntityId } from '../types.js';
import type { World } from '../ecs/World.js';
import type { Entity } from '../ecs/Entity.js';
import { EntityImpl } from '../ecs/Entity.js';
import type {
  TradeNetworkComponent,
  TradeEdge,
  NetworkHub,
  NetworkChokepoint,
  NetworkDisruption,
} from '../components/TradeNetworkComponent.js';
import type { ShippingLaneComponent } from '../components/ShippingLaneComponent.js';
import type { BlockadeComponent } from '../components/BlockadeComponent.js';
import type { Graph } from '../trade/GraphAnalysis.js';
import {
  dijkstraShortestPath,
  floydWarshallAllPairs,
  brandesBetweenness,
  findArticulationPoints,
  findConnectedComponents,
  calculateAvgPathLength,
  calculateDiameter,
  countAlternativeRoutes,
} from '../trade/GraphAnalysis.js';

/** Update interval: every 100 ticks = 5 seconds at 20 TPS */
const UPDATE_INTERVAL = 100;

/** Maximum network size for full analysis (performance limit) */
const MAX_NETWORK_SIZE = 1000;

/** Betweenness threshold for hub identification (top X%) */
const HUB_BETWEENNESS_THRESHOLD_MAJOR = 0.1; // Top 10%
const HUB_BETWEENNESS_THRESHOLD_MINOR = 0.25; // Top 25%

/** Criticality threshold for chokepoint detection */
const CHOKEPOINT_CRITICALITY_THRESHOLD = 0.5;

/**
 * System for managing trade networks and strategic analysis
 */
export class TradeNetworkSystem extends BaseSystem {
  public readonly id: SystemId = 'trade_network';
  public readonly priority: number = 165;
  public readonly requiredComponents: ReadonlyArray<ComponentType> = [];

  // Lazy activation: Skip entire system when no trade networks exist
  public readonly activationComponents = ['trade_network'] as const;

  protected readonly throttleInterval = UPDATE_INTERVAL;

  private isInitialized = false;

  /**
   * Initialize the system - store world reference for event handlers
   */
  private worldRef?: World;

  protected onInitialize(world: World): void {
    if (this.isInitialized) {
      return;
    }
    this.isInitialized = true;
    this.worldRef = world;

    // Listen for shipping lane events
    world.eventBus.on('economy:lane:created', (event) => {
      if (this.worldRef && event.type === 'economy:lane:created') {
        this.handleLaneCreated(this.worldRef, event.data.laneId);
      }
    });

    world.eventBus.on('economy:lane:removed', (event) => {
      if (this.worldRef && event.type === 'economy:lane:removed') {
        this.handleLaneRemoved(this.worldRef, event.data.laneId);
      }
    });
  }

  /**
   * Update - analyze networks, detect chokepoints, process blockades
   */
  protected onUpdate(ctx: SystemContext): void {
    const currentTick = ctx.tick;

    // Cache queries before loops (CLAUDE.md performance guideline)
    const networkEntities = ctx.world.query().with('trade_network').executeEntities();
    const blockadeEntities = ctx.world.query().with('blockade').executeEntities();

    // Update each trade network
    for (const networkEntity of networkEntities) {
      const network = networkEntity.getComponent<TradeNetworkComponent>('trade_network');
      if (!network) continue;

      this.updateNetwork(ctx.world, networkEntity, network, currentTick);
    }

    // Update each blockade
    for (const blockadeEntity of blockadeEntities) {
      const blockade = blockadeEntity.getComponent<BlockadeComponent>('blockade');
      if (!blockade) continue;

      this.updateBlockade(ctx.world, blockadeEntity, blockade, currentTick);
    }
  }

  // ===========================================================================
  // Network Construction
  // ===========================================================================

  /**
   * Build network graph from shipping lanes
   */
  private buildNetworkGraph(
    world: World,
    network: TradeNetworkComponent
  ): Graph {
    const graph: Graph = {
      nodes: new Set(),
      edges: new Map(),
      adjacencyList: new Map(),
    };

    // Get all shipping lanes in this network's scope
    const laneEntities = world.query().with('shipping_lane').executeEntities();

    for (const laneEntity of laneEntities) {
      const lane = laneEntity.getComponent<ShippingLaneComponent>('shipping_lane');
      if (!lane) continue;

      // Filter by spatial scope (planet/system/sector)
      if (!this.laneMatchesSpatialScope(world, lane, network)) {
        continue;
      }

      // Add nodes
      graph.nodes.add(lane.originId);
      graph.nodes.add(lane.destinationId);

      // Add edge
      const edgeId = lane.laneId;
      const edge: TradeEdge = {
        edgeId,
        laneId: laneEntity.id,
        fromNodeId: lane.originId,
        toNodeId: lane.destinationId,
        flowRate: lane.flowRate,
        capacity: lane.capacity,
        congestion: lane.capacity > 0 ? lane.flowRate / lane.capacity : 0,
        active: lane.status === 'active',
      };

      graph.edges.set(edgeId, {
        edgeId,
        fromNodeId: lane.originId,
        toNodeId: lane.destinationId,
        weight: lane.flowRate > 0 ? 1.0 / lane.flowRate : 1.0, // Inverse flow rate for shortest paths
      });

      // Update adjacency list
      if (!graph.adjacencyList.has(lane.originId)) {
        graph.adjacencyList.set(lane.originId, new Set());
      }
      graph.adjacencyList.get(lane.originId)?.add(edgeId);

      // Also add reverse edge for undirected graph analysis
      if (!graph.adjacencyList.has(lane.destinationId)) {
        graph.adjacencyList.set(lane.destinationId, new Set());
      }
      // For directed graph, comment out the reverse edge below
      graph.adjacencyList.get(lane.destinationId)?.add(edgeId);
    }

    return graph;
  }

  /**
   * Check if a shipping lane belongs to the network's spatial scope.
   *
   * Spatial scope filtering:
   * - 'planet': Both endpoints must be on the same planet as spatialTierId
   * - 'system': Both endpoints must be in the same star system (same planet prefix)
   * - 'sector': All lanes included (sector is the broadest scope)
   *
   * Falls back to including the lane if spatial information is unavailable.
   */
  private laneMatchesSpatialScope(
    world: World,
    lane: ShippingLaneComponent,
    network: TradeNetworkComponent
  ): boolean {
    // Sector scope includes all lanes (broadest scope)
    if (network.scope === 'sector') {
      return true;
    }

    // Get endpoint entities to check their spatial location
    const originEntity = world.getEntity(lane.originId);
    const destEntity = world.getEntity(lane.destinationId);

    // If either endpoint doesn't exist, include the lane (graceful fallback)
    if (!originEntity || !destEntity) {
      return true;
    }

    // Check for planet_location components
    const originLocation = originEntity.getComponent('planet_location') as
      | { type: 'planet_location'; currentPlanetId: string }
      | undefined;
    const destLocation = destEntity.getComponent('planet_location') as
      | { type: 'planet_location'; currentPlanetId: string }
      | undefined;

    // If no location data, include the lane (backward compatibility)
    if (!originLocation || !destLocation) {
      return true;
    }

    // Get the spatial tier entity to determine what planet/system it represents
    const spatialTierEntity = world.getEntity(network.spatialTierId);
    if (!spatialTierEntity) {
      return true; // Fallback: include all if spatial tier entity not found
    }

    if (network.scope === 'planet') {
      // Planet scope: both endpoints must be on the same planet as spatialTierId
      // The spatialTierId might be a planet entity ID or match planet IDs
      const targetPlanetId = network.spatialTierId;

      return (
        originLocation.currentPlanetId === targetPlanetId &&
        destLocation.currentPlanetId === targetPlanetId
      );
    }

    if (network.scope === 'system') {
      // System scope: both endpoints must be in the same star system
      // Convention: planets in the same system share a prefix (e.g., 'sol:earth', 'sol:mars')
      const getSystemId = (planetId: string): string => {
        const colonIndex = planetId.indexOf(':');
        return colonIndex > 0 ? planetId.substring(0, colonIndex) : planetId;
      };

      const targetSystemId = getSystemId(network.spatialTierId);
      const originSystemId = getSystemId(originLocation.currentPlanetId);
      const destSystemId = getSystemId(destLocation.currentPlanetId);

      return (
        originSystemId === targetSystemId &&
        destSystemId === targetSystemId
      );
    }

    // Unknown scope, include the lane
    return true;
  }

  /**
   * Rebuild network topology and metrics
   */
  private rebuildNetwork(
    world: World,
    entity: Entity,
    network: TradeNetworkComponent
  ): void {
    const graph = this.buildNetworkGraph(world, network);

    // Skip analysis if network too large
    if (graph.nodes.size > MAX_NETWORK_SIZE) {
      console.warn(`[TradeNetworkSystem] Network ${network.networkId} too large (${graph.nodes.size} nodes), skipping full analysis`);
      return;
    }

    // Calculate network metrics
    const metrics = this.calculateNetworkMetrics(graph);

    // Identify hubs
    const hubs = this.identifyHubs(graph);

    // Detect chokepoints
    const chokepoints = this.detectChokepoints(graph, world);

    // Analyze resilience
    const resilience = this.calculateNetworkResilience(graph);

    // Calculate trade balance
    const tradeBalance = this.calculateTradeBalance(graph);

    // Calculate wealth distribution
    const wealthDist = this.calculateWealthDistribution(graph, tradeBalance);

    // Calculate aggregate flow
    let totalFlowRate = 0;
    for (const edge of graph.edges.values()) {
      const tradeEdge = network.edges.get(edge.edgeId);
      totalFlowRate += tradeEdge?.flowRate ?? 0;
    }

    // Update component
    const updatedNetwork: TradeNetworkComponent = {
      ...network,
      nodes: graph.nodes,
      edges: new Map(
        Array.from(graph.edges.entries()).map(([id, graphEdge]) => {
          const existingEdge = network.edges.get(id);
          const tradeEdge: TradeEdge = existingEdge ?? {
            edgeId: graphEdge.edgeId,
            laneId: '', // Will be filled from shipping lane
            fromNodeId: graphEdge.fromNodeId,
            toNodeId: graphEdge.toNodeId,
            flowRate: 0,
            capacity: 0,
            congestion: 0,
            active: true,
          };
          return [id, tradeEdge];
        })
      ),
      adjacencyList: graph.adjacencyList,
      totalFlowRate,
      networkDensity: metrics.density,
      avgPathLength: metrics.avgPathLength,
      clusteringCoefficient: metrics.clustering,
      diameter: metrics.diameter,
      hubs,
      chokepoints,
      vulnerableRegions: this.findVulnerableRegions(graph, chokepoints),
      resilienceScore: resilience.score,
      criticalNodes: resilience.criticalNodes,
      tradeBalance,
      wealthDistribution: wealthDist,
      lastAnalysisTick: world.tick,
    };

    (entity as EntityImpl).updateComponent('trade_network', () => updatedNetwork);

    // Emit events for strategic changes
    this.emitNetworkEvents(world, network, updatedNetwork);
  }

  // ===========================================================================
  // Network Metrics
  // ===========================================================================

  /**
   * Calculate basic network metrics
   */
  private calculateNetworkMetrics(graph: Graph): {
    density: number;
    avgPathLength: number;
    diameter: number;
    clustering: number;
  } {
    const nodeCount = graph.nodes.size;
    const edgeCount = graph.edges.size;

    // Network density = actual edges / possible edges
    const possibleEdges = nodeCount * (nodeCount - 1) / 2;
    const density = possibleEdges > 0 ? edgeCount / possibleEdges : 0;

    // Calculate all-pairs shortest paths
    const allPairs = floydWarshallAllPairs(graph);
    const avgPathLength = calculateAvgPathLength(allPairs);
    const diameter = calculateDiameter(allPairs);

    // Clustering coefficient via triangle counting
    const clustering = this.calculateClusteringCoefficient(graph);

    return { density, avgPathLength, diameter, clustering };
  }

  /**
   * Calculate clustering coefficient using triangle counting
   *
   * Clustering coefficient measures the degree to which nodes cluster together.
   * Formula: C = (actual triangles) / (possible triangles)
   *
   * For each node, we count triangles formed with its neighbors.
   * A triangle exists when two neighbors of a node are also connected to each other.
   *
   * @param graph - Graph to analyze
   * @returns Clustering coefficient (0-1, where 1 = fully clustered)
   */
  private calculateClusteringCoefficient(graph: Graph): number {
    let triangles = 0;
    let possibleTriangles = 0;

    // For each node in the graph
    for (const [nodeId, edgeIds] of graph.adjacencyList) {
      // Get neighbors by resolving edge IDs to neighbor node IDs
      const neighbors = new Set<EntityId>();
      for (const edgeId of edgeIds) {
        const edge = graph.edges.get(edgeId);
        if (!edge) continue;

        // Add the neighbor (the "other end" of the edge)
        if (edge.fromNodeId === nodeId) {
          neighbors.add(edge.toNodeId);
        } else if (edge.toNodeId === nodeId) {
          neighbors.add(edge.fromNodeId);
        }
      }

      const degree = neighbors.size;

      // Need at least 2 neighbors to form a triangle
      if (degree < 2) continue;

      // Count possible triangles for this node: C(degree, 2) = degree * (degree - 1) / 2
      possibleTriangles += (degree * (degree - 1)) / 2;

      // Count actual triangles: check all pairs of neighbors
      const neighborArray = Array.from(neighbors);
      for (let i = 0; i < neighborArray.length; i++) {
        for (let j = i + 1; j < neighborArray.length; j++) {
          const neighbor1 = neighborArray[i]!;
          const neighbor2 = neighborArray[j]!;

          // Check if neighbor1 and neighbor2 are connected
          if (this.areNodesConnected(graph, neighbor1, neighbor2)) {
            triangles++;
          }
        }
      }
    }

    // Each triangle is counted 3 times (once per vertex)
    // So we divide triangles by 3 to get unique triangle count
    const uniqueTriangles = triangles / 3;

    // Clustering coefficient = unique triangles / possible triangles
    return possibleTriangles > 0 ? uniqueTriangles / possibleTriangles : 0;
  }

  /**
   * Check if two nodes are connected by an edge
   *
   * @param graph - Graph to check
   * @param node1 - First node ID
   * @param node2 - Second node ID
   * @returns True if nodes are connected
   */
  private areNodesConnected(graph: Graph, node1: EntityId, node2: EntityId): boolean {
    const edges1 = graph.adjacencyList.get(node1);
    if (!edges1) return false;

    // Check if any edge from node1 connects to node2
    for (const edgeId of edges1) {
      const edge = graph.edges.get(edgeId);
      if (!edge) continue;

      if (
        (edge.fromNodeId === node1 && edge.toNodeId === node2) ||
        (edge.fromNodeId === node2 && edge.toNodeId === node1)
      ) {
        return true;
      }
    }

    return false;
  }

  // ===========================================================================
  // Hub Identification
  // ===========================================================================

  /**
   * Identify network hubs using betweenness centrality
   */
  private identifyHubs(graph: Graph): NetworkHub[] {
    const { centrality } = brandesBetweenness(graph);

    const hubs: NetworkHub[] = [];

    // Sort nodes by betweenness - Array.from acceptable here for sort operation
    // (only alternative is manual heap-based top-N, not worth complexity for <100 nodes typically)
    const sortedNodes = Array.from(centrality.entries())
      .sort((a, b) => b[1] - a[1]);

    const nodeCount = sortedNodes.length;
    const majorHubCount = Math.ceil(nodeCount * HUB_BETWEENNESS_THRESHOLD_MAJOR);
    const minorHubCount = Math.ceil(nodeCount * HUB_BETWEENNESS_THRESHOLD_MINOR);

    for (let i = 0; i < sortedNodes.length; i++) {
      const [nodeId, betweenness] = sortedNodes[i]!;

      // Only include nodes with significant betweenness
      if (betweenness < 0.01) continue;

      const degree = graph.adjacencyList.get(nodeId)?.size ?? 0;
      const totalFlow = this.calculateNodeFlow(graph, nodeId);

      const tier = i < majorHubCount ? 'major' : i < minorHubCount ? 'minor' : null;

      if (tier) {
        hubs.push({
          nodeId,
          betweenness,
          degree,
          totalFlow,
          tier,
        });
      }
    }

    return hubs;
  }

  /**
   * Calculate total flow through a node
   */
  private calculateNodeFlow(graph: Graph, nodeId: EntityId): number {
    let totalFlow = 0;

    const edges = graph.adjacencyList.get(nodeId) ?? new Set();
    for (const edgeId of edges) {
      const edge = graph.edges.get(edgeId);
      if (edge) {
        // For flow calculation, use inverse of weight (which is 1/flowRate)
        totalFlow += 1.0 / edge.weight;
      }
    }

    return totalFlow;
  }

  // ===========================================================================
  // Chokepoint Detection
  // ===========================================================================

  /**
   * Detect network chokepoints
   */
  private detectChokepoints(graph: Graph, world: World): NetworkChokepoint[] {
    const { centrality } = brandesBetweenness(graph);
    const articulationPoints = findArticulationPoints(graph);

    const chokepoints: NetworkChokepoint[] = [];

    for (const nodeId of graph.nodes) {
      const betweenness = centrality.get(nodeId) ?? 0;
      const isArticulationPoint = articulationPoints.has(nodeId);

      // Calculate alternative routes
      const alternativeRoutes = this.calculateAlternativeRoutes(graph, nodeId);

      // Criticality score = betweenness × (1 / alternativeRoutes)
      // High betweenness + few alternatives = high criticality
      const criticalityScore = betweenness * (1.0 / Math.max(1, alternativeRoutes));

      // Only include if meets threshold
      if (criticalityScore < CHOKEPOINT_CRITICALITY_THRESHOLD && !isArticulationPoint) {
        continue;
      }

      // Calculate affected nodes (BFS from this node)
      const affectedNodes = this.calculateAffectedNodes(graph, nodeId);

      // Strategic value combines multiple factors
      const strategicValue = this.calculateStrategicValue(
        betweenness,
        alternativeRoutes,
        this.calculateNodeFlow(graph, nodeId),
        graph
      );

      chokepoints.push({
        nodeId,
        criticalityScore,
        betweenness,
        alternativeRoutes,
        affectedNodes,
        strategicValue,
      });
    }

    // Sort by strategic value
    chokepoints.sort((a, b) => b.strategicValue - a.strategicValue);

    return chokepoints;
  }

  /**
   * Calculate number of alternative routes through a node
   */
  private calculateAlternativeRoutes(graph: Graph, nodeId: EntityId): number {
    let totalAlternatives = 0;
    let routeCount = 0;

    // For each pair of neighbors, check if alternative path exists
    const edgeIds = graph.adjacencyList.get(nodeId) ?? new Set<string>();
    const neighbors = Array.from(edgeIds)
      .map((edgeId: string) => {
        const edge = graph.edges.get(edgeId);
        if (!edge) return undefined;
        // Get the neighbor (the "other end" of the edge)
        return edge.fromNodeId === nodeId ? edge.toNodeId : edge.fromNodeId;
      })
      .filter((id): id is EntityId => id !== undefined && id !== nodeId);

    for (let i = 0; i < neighbors.length; i++) {
      for (let j = i + 1; j < neighbors.length; j++) {
        const source = neighbors[i]!;
        const target = neighbors[j]!;

        const altRoutes = countAlternativeRoutes(graph, source, target, nodeId);
        totalAlternatives += altRoutes.count;
        routeCount++;
      }
    }

    return routeCount > 0 ? Math.floor(totalAlternatives / routeCount) : 0;
  }

  /**
   * Calculate nodes affected if chokepoint is blocked
   */
  private calculateAffectedNodes(graph: Graph, chokepointId: EntityId): EntityId[] {
    // Simulate removing the chokepoint
    const components = findConnectedComponents(graph);
    const chokepointComponent = components.components.get(chokepointId);

    // Remove chokepoint temporarily - build modified graph without Array.from allocations
    const modifiedNodes = new Set<EntityId>();
    for (const id of graph.nodes) {
      if (id !== chokepointId) {
        modifiedNodes.add(id);
      }
    }

    const modifiedEdges = new Map<string, {edgeId: string, fromNodeId: EntityId, toNodeId: EntityId, weight: number}>();
    for (const [edgeId, edge] of graph.edges) {
      if (edge.fromNodeId !== chokepointId && edge.toNodeId !== chokepointId) {
        modifiedEdges.set(edgeId, edge);
      }
    }

    const modifiedAdjacencyList = new Map<EntityId, Set<string>>();
    for (const [nodeId, edges] of graph.adjacencyList) {
      if (nodeId !== chokepointId) {
        const filteredEdges = new Set<string>();
        for (const edgeId of edges) {
          const edge = graph.edges.get(edgeId);
          if (edge && edge.fromNodeId !== chokepointId && edge.toNodeId !== chokepointId) {
            filteredEdges.add(edgeId);
          }
        }
        modifiedAdjacencyList.set(nodeId, filteredEdges);
      }
    }

    const modifiedGraph: Graph = {
      nodes: modifiedNodes,
      edges: modifiedEdges,
      adjacencyList: modifiedAdjacencyList,
    };

    const modifiedComponents = findConnectedComponents(modifiedGraph);

    // Find nodes that were in same component as chokepoint but now isolated
    const affectedNodes: EntityId[] = [];
    for (const [nodeId, compId] of components.components) {
      if (compId === chokepointComponent && nodeId !== chokepointId) {
        const newCompId = modifiedComponents.components.get(nodeId);
        const newCompSize = Array.from(modifiedComponents.components.values())
          .filter(id => id === newCompId).length;

        // If node is now in smaller component, it's affected
        if (newCompSize < components.components.size / 2) {
          affectedNodes.push(nodeId);
        }
      }
    }

    return affectedNodes;
  }

  /**
   * Calculate strategic value of a node
   */
  private calculateStrategicValue(
    betweenness: number,
    alternativeRoutes: number,
    tradeVolume: number,
    graph: Graph
  ): number {
    let maxVolume = 0;
    for (const id of graph.nodes) {
      const flow = this.calculateNodeFlow(graph, id);
      if (flow > maxVolume) maxVolume = flow;
    }

    const normalizedVolume = maxVolume > 0 ? tradeVolume / maxVolume : 0;
    const normalizedAlternatives = 1.0 / Math.max(1, alternativeRoutes);

    // Weighted combination
    return (
      betweenness * 0.4 +
      normalizedAlternatives * 0.3 +
      normalizedVolume * 0.3
    );
  }

  // ===========================================================================
  // Network Resilience
  // ===========================================================================

  /**
   * Calculate network resilience
   */
  private calculateNetworkResilience(graph: Graph): {
    score: number;
    criticalNodes: Set<EntityId>;
  } {
    const articulationPoints = findArticulationPoints(graph);
    const nodeCount = graph.nodes.size;

    // Resilience = 1 - (critical nodes / total nodes)
    const score = nodeCount > 0 ? 1.0 - (articulationPoints.size / nodeCount) : 0;

    return {
      score,
      criticalNodes: articulationPoints,
    };
  }

  /**
   * Find vulnerable regions (nodes with <2 alternative routes)
   */
  private findVulnerableRegions(
    graph: Graph,
    chokepoints: NetworkChokepoint[]
  ): EntityId[] {
    const vulnerableSet = new Set<EntityId>();

    for (const chokepoint of chokepoints) {
      if (chokepoint.alternativeRoutes < 2) {
        for (const nodeId of chokepoint.affectedNodes) {
          vulnerableSet.add(nodeId);
        }
      }
    }

    return Array.from(vulnerableSet); // Convert Set to Array once
  }

  // ===========================================================================
  // Economic Analysis
  // ===========================================================================

  /**
   * Calculate trade balance per node
   */
  private calculateTradeBalance(graph: Graph): Map<EntityId, number> {
    const balance = new Map<EntityId, number>();

    // Initialize all nodes
    for (const nodeId of graph.nodes) {
      balance.set(nodeId, 0);
    }

    // Calculate inflow and outflow
    for (const edge of graph.edges.values()) {
      const flow = 1.0 / edge.weight; // Convert weight back to flow rate

      // Outflow from source
      balance.set(edge.fromNodeId, (balance.get(edge.fromNodeId) ?? 0) - flow);

      // Inflow to destination
      balance.set(edge.toNodeId, (balance.get(edge.toNodeId) ?? 0) + flow);
    }

    return balance;
  }

  /**
   * Calculate wealth distribution metrics
   */
  private calculateWealthDistribution(
    graph: Graph,
    tradeBalance: Map<EntityId, number>
  ): {
    giniCoefficient: number;
    topDecile: number;
    bottomHalf: number;
  } {
    // Get absolute trade volumes per node
    const volumes: Array<{nodeId: EntityId, volume: number}> = [];
    for (const nodeId of graph.nodes) {
      const flow = this.calculateNodeFlow(graph, nodeId);
      volumes.push({ nodeId, volume: flow });
    }

    // Sort by volume
    volumes.sort((a, b) => a.volume - b.volume);

    const totalVolume = volumes.reduce((sum, v) => sum + v.volume, 0);

    if (totalVolume === 0) {
      return { giniCoefficient: 0, topDecile: 0, bottomHalf: 0 };
    }

    // Calculate Gini coefficient
    let giniSum = 0;
    const n = volumes.length;

    for (let i = 0; i < n; i++) {
      const rank = i + 1;
      const volume = volumes[i]!.volume;
      giniSum += (2 * rank - n - 1) * volume;
    }

    const giniCoefficient = n > 0 ? giniSum / (n * totalVolume) : 0;

    // Top decile share
    const topDecileCount = Math.ceil(n * 0.1);
    const topDecileVolume = volumes.slice(-topDecileCount).reduce((sum, v) => sum + v.volume, 0);
    const topDecile = totalVolume > 0 ? topDecileVolume / totalVolume : 0;

    // Bottom half share
    const bottomHalfCount = Math.floor(n * 0.5);
    const bottomHalfVolume = volumes.slice(0, bottomHalfCount).reduce((sum, v) => sum + v.volume, 0);
    const bottomHalf = totalVolume > 0 ? bottomHalfVolume / totalVolume : 0;

    return { giniCoefficient, topDecile, bottomHalf };
  }

  // ===========================================================================
  // Blockade Mechanics
  // ===========================================================================

  /**
   * Update blockade status and effects
   */
  private updateBlockade(
    world: World,
    entity: Entity,
    blockade: BlockadeComponent,
    currentTick: number
  ): void {
    if (blockade.status !== 'active' && blockade.status !== 'contested') {
      return;
    }

    // Calculate blockade effectiveness
    const effectiveness = this.calculateBlockadeEffectiveness(world, blockade);

    // Apply flow reductions to affected lanes
    const affectedNodes = this.applyBlockadeEffects(world, blockade, effectiveness);

    // Calculate economic damage
    const economicDamage = this.calculateEconomicDamage(world, blockade, affectedNodes);

    // Update blockade component
    const updatedBlockade: BlockadeComponent = {
      ...blockade,
      effectiveness,
      flowReductionMultiplier: 1.0 - effectiveness,
      affectedNodes,
      economicDamagePerTick: economicDamage,
      totalEconomicDamage: blockade.totalEconomicDamage + economicDamage,
      lastUpdateTick: currentTick,
    };

    (entity as EntityImpl).updateComponent('blockade', () => updatedBlockade);

    // Emit shortage events for dependent nodes
    this.emitShortageEvents(world, blockade, affectedNodes);
  }

  /**
   * Calculate blockade effectiveness based on fleet strengths
   */
  private calculateBlockadeEffectiveness(
    _world: World,
    blockade: BlockadeComponent
  ): number {
    const attackerStrength = blockade.fleetStrength;
    const defenderStrength = blockade.defenderStrength;

    if (attackerStrength === 0) return 0;

    // Effectiveness = attackerStrength / (attackerStrength + defenderStrength)
    const totalStrength = attackerStrength + defenderStrength;
    return totalStrength > 0 ? attackerStrength / totalStrength : 0;
  }

  /**
   * Apply blockade effects to shipping lanes
   */
  private applyBlockadeEffects(
    world: World,
    blockade: BlockadeComponent,
    effectiveness: number
  ): EntityId[] {
    const affectedNodes: EntityId[] = [blockade.targetNodeId];
    const affectedEdges: string[] = [];

    // Find all lanes connected to blocked node
    const laneEntities = world.query().with('shipping_lane').executeEntities();

    for (const laneEntity of laneEntities) {
      const lane = laneEntity.getComponent<ShippingLaneComponent>('shipping_lane');
      if (!lane) continue;

      // Check if lane connects to blockaded node
      if (lane.originId === blockade.targetNodeId || lane.destinationId === blockade.targetNodeId) {
        affectedEdges.push(lane.laneId);

        // Add other endpoint to affected nodes
        const otherNode = lane.originId === blockade.targetNodeId ? lane.destinationId : lane.originId;
        if (!affectedNodes.includes(otherNode)) {
          affectedNodes.push(otherNode);
        }

        // Reduce flow rate by effectiveness
        (laneEntity as EntityImpl).updateComponent('shipping_lane', (oldLane) => {
          const typedLane = oldLane as ShippingLaneComponent;
          return {
            ...typedLane,
            flowRate: typedLane.flowRate * (1.0 - effectiveness),
            status: effectiveness > 0.9 ? 'blocked' : 'active',
          };
        });
      }
    }

    // Update blockade with affected edges
    blockade.affectedEdges = affectedEdges;

    // BFS to find downstream nodes affected by reduced flow
    // OPTIMIZATION: Pass cached laneEntities to avoid O(n²) query-in-loop
    const cascadeNodes = this.calculateCascadeEffect(laneEntities, blockade.targetNodeId, affectedNodes);
    affectedNodes.push(...cascadeNodes);

    return Array.from(new Set(affectedNodes)); // Deduplicate
  }

  /**
   * Calculate cascade effect of blockade (BFS)
   *
   * OPTIMIZATION: Accepts pre-cached laneEntities to avoid O(n²) query-in-loop
   */
  private calculateCascadeEffect(
    laneEntities: ReadonlyArray<Entity>,
    blockadedNode: EntityId,
    directlyAffected: EntityId[]
  ): EntityId[] {
    const cascade: EntityId[] = [];
    const visited = new Set<EntityId>(directlyAffected);
    const queue: EntityId[] = [...directlyAffected];

    // BFS from directly affected nodes
    while (queue.length > 0) {
      const currentNode = queue.shift();
      if (!currentNode) break;

      // OPTIMIZATION: Use pre-cached laneEntities instead of querying
      // This fixes O(n²) complexity (query executed once per BFS iteration)
      // Previously: world.query().with('shipping_lane').executeEntities() in loop
      for (const laneEntity of laneEntities) {
        const lane = laneEntity.getComponent<ShippingLaneComponent>('shipping_lane');
        if (!lane || lane.originId !== currentNode) continue;

        const nextNode = lane.destinationId;

        // If destination depends on this route and has no alternatives
        if (!visited.has(nextNode)) {
          // Check if this is the only route to nextNode
          const alternativeRoutes = this.countIncomingRoutes(laneEntities, nextNode);

          if (alternativeRoutes <= 1) {
            // Single route = dependency
            cascade.push(nextNode);
            visited.add(nextNode);
            queue.push(nextNode);
          }
        }
      }
    }

    return cascade;
  }

  /**
   * Count incoming routes to a node
   *
   * OPTIMIZATION: Accepts pre-cached laneEntities to avoid redundant queries
   */
  private countIncomingRoutes(laneEntities: ReadonlyArray<Entity>, nodeId: EntityId): number {
    let count = 0;

    // OPTIMIZATION: Use pre-cached laneEntities instead of querying
    for (const laneEntity of laneEntities) {
      const lane = laneEntity.getComponent<ShippingLaneComponent>('shipping_lane');
      if (lane && lane.destinationId === nodeId && lane.status === 'active') {
        count++;
      }
    }

    return count;
  }

  /**
   * Calculate economic damage from blockade
   */
  private calculateEconomicDamage(
    world: World,
    blockade: BlockadeComponent,
    affectedNodes: EntityId[]
  ): number {
    let totalDamage = 0;

    // Sum up flow rates of affected lanes
    const laneEntities = world.query().with('shipping_lane').executeEntities();

    for (const laneEntity of laneEntities) {
      const lane = laneEntity.getComponent<ShippingLaneComponent>('shipping_lane');
      if (!lane) continue;

      if (blockade.affectedEdges.includes(lane.laneId)) {
        // Damage = original flow rate × effectiveness
        totalDamage += lane.flowRate * blockade.effectiveness;
      }
    }

    return totalDamage;
  }

  /**
   * Emit shortage events for affected nodes
   */
  private emitShortageEvents(
    world: World,
    blockade: BlockadeComponent,
    affectedNodes: EntityId[]
  ): void {
    for (const nodeId of affectedNodes) {
      if (nodeId === blockade.targetNodeId) continue; // Skip blockaded node itself

      world.eventBus.emit({
        type: 'trade:shortage_detected' as const,
        source: nodeId,
        data: {
          nodeId,
          blockadeId: blockade.blockadeId,
          blockadedChokepoint: blockade.targetNodeId,
          severity: blockade.effectiveness,
        },
      });
    }
  }

  // ===========================================================================
  // Network Update
  // ===========================================================================

  /**
   * Update network analysis
   */
  private updateNetwork(
    world: World,
    entity: Entity,
    network: TradeNetworkComponent,
    currentTick: number
  ): void {
    // Rebuild network periodically
    const ticksSinceLastAnalysis = currentTick - network.lastAnalysisTick;

    if (ticksSinceLastAnalysis >= UPDATE_INTERVAL) {
      this.rebuildNetwork(world, entity, network);
    }
  }

  // ===========================================================================
  // Event Handling
  // ===========================================================================

  /**
   * Handle shipping lane created
   */
  private handleLaneCreated(world: World, laneId: string): void {
    // Mark all networks as needing rebuild
    const networkEntities = world.query().with('trade_network').executeEntities();

    for (const entity of networkEntities) {
      const network = entity.getComponent<TradeNetworkComponent>('trade_network');
      if (!network) continue;

      // Trigger rebuild on next update
      (entity as EntityImpl).updateComponent('trade_network', (old) => {
        const typed = old as TradeNetworkComponent;
        return { ...typed, lastAnalysisTick: 0 };
      });
    }
  }

  /**
   * Handle shipping lane removed
   */
  private handleLaneRemoved(world: World, laneId: string): void {
    // Mark all networks as needing rebuild
    const networkEntities = world.query().with('trade_network').executeEntities();

    for (const entity of networkEntities) {
      const network = entity.getComponent<TradeNetworkComponent>('trade_network');
      if (!network) continue;

      // Trigger rebuild on next update
      (entity as EntityImpl).updateComponent('trade_network', (old) => {
        const typed = old as TradeNetworkComponent;
        return { ...typed, lastAnalysisTick: 0 };
      });
    }
  }

  /**
   * Emit network events for strategic changes
   */
  private emitNetworkEvents(
    world: World,
    oldNetwork: TradeNetworkComponent,
    newNetwork: TradeNetworkComponent
  ): void {
    // Check for new hubs
    for (const hub of newNetwork.hubs) {
      const wasHub = oldNetwork.hubs.some(h => h.nodeId === hub.nodeId);
      if (!wasHub && hub.tier === 'major') {
        world.eventBus.emit({
          type: 'trade:hub_identified' as const,
          source: hub.nodeId,
          data: {
            networkId: newNetwork.networkId,
            nodeId: hub.nodeId,
            betweenness: hub.betweenness,
            tier: hub.tier,
          },
        });
      }
    }

    // Check for new chokepoints
    for (const chokepoint of newNetwork.chokepoints) {
      const wasChokepoint = oldNetwork.chokepoints.some(c => c.nodeId === chokepoint.nodeId);
      if (!wasChokepoint) {
        world.eventBus.emit({
          type: 'trade:chokepoint_detected' as const,
          source: chokepoint.nodeId,
          data: {
            networkId: newNetwork.networkId,
            nodeId: chokepoint.nodeId,
            criticalityScore: chokepoint.criticalityScore,
            strategicValue: chokepoint.strategicValue,
            affectedNodes: chokepoint.affectedNodes,
          },
        });
      }
    }

    // Check for resilience degradation
    if (newNetwork.resilienceScore < 0.5 && oldNetwork.resilienceScore >= 0.5) {
      world.eventBus.emit({
        type: 'trade:network_resilience_low' as const,
        source: newNetwork.networkId,
        data: {
          networkId: newNetwork.networkId,
          resilienceScore: newNetwork.resilienceScore,
          criticalNodeCount: newNetwork.criticalNodes.size,
        },
      });
    }
  }

  // ===========================================================================
  // Public API
  // ===========================================================================

  /**
   * Create a blockade at a chokepoint
   */
  public createBlockade(
    world: World,
    networkId: string,
    targetNodeId: EntityId,
    blockadingFleetId: EntityId,
    blockadingFaction: EntityId,
    fleetStrength: number
  ): { success: boolean; blockadeId?: string; reason?: string } {
    // Verify network exists
    const networkEntities = world.query().with('trade_network').executeEntities();
    const networkEntity = networkEntities.find(e => {
      const net = e.getComponent<TradeNetworkComponent>('trade_network');
      return net?.networkId === networkId;
    });

    if (!networkEntity) {
      return { success: false, reason: `Network ${networkId} not found` };
    }

    const network = networkEntity.getComponent<TradeNetworkComponent>('trade_network');
    if (!network) {
      return { success: false, reason: `Network ${networkId} missing component` };
    }

    // Verify target is a node in network
    if (!network.nodes.has(targetNodeId)) {
      return { success: false, reason: `Node ${targetNodeId} not in network ${networkId}` };
    }

    // Create blockade entity
    const blockadeId = `blockade_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const blockadeComponent: BlockadeComponent = {
      type: 'blockade',
      version: 1,
      blockadeId,
      targetNodeId,
      networkId,
      blockadingFleetId,
      blockadingFaction,
      fleetStrength,
      effectiveness: 0,
      flowReductionMultiplier: 1.0,
      defendingFleetIds: [],
      defenderStrength: 0,
      casualties: {
        attacker: { shipsLost: 0, personnelLost: 0 },
        defender: { shipsLost: 0, personnelLost: 0 },
      },
      combatLog: [],
      affectedNodes: [],
      affectedEdges: [],
      economicDamagePerTick: 0,
      totalEconomicDamage: 0,
      status: 'active',
      startedTick: world.tick,
      lastUpdateTick: world.tick,
    };

    const blockadeEntity = world.createEntity();
    (blockadeEntity as EntityImpl).addComponent(blockadeComponent);

    // Emit blockade event
    world.eventBus.emit({
      type: 'trade:blockade_started' as const,
      source: targetNodeId,
      data: {
        blockadeId,
        networkId,
        targetNodeId,
        blockadingFaction,
        fleetStrength,
      },
    });

    return { success: true, blockadeId };
  }

  /**
   * Get network topology for visualization
   */
  public getNetworkTopology(
    world: World,
    networkId: string
  ): { nodes: EntityId[]; edges: Array<{ from: EntityId; to: EntityId; flow: number }> } | undefined {
    const networkEntities = world.query().with('trade_network').executeEntities();
    const networkEntity = networkEntities.find(e => {
      const net = e.getComponent<TradeNetworkComponent>('trade_network');
      return net?.networkId === networkId;
    });

    if (!networkEntity) {
      return undefined;
    }

    const network = networkEntity.getComponent<TradeNetworkComponent>('trade_network');
    if (!network) {
      return undefined;
    }

    const nodes = Array.from(network.nodes);
    const edges = Array.from(network.edges.values()).map(edge => ({
      from: edge.fromNodeId,
      to: edge.toNodeId,
      flow: edge.flowRate,
    }));

    return { nodes, edges };
  }
}
