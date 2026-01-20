/**
 * TradeNetworkComponent - Tier 3 trade infrastructure (graph topology)
 *
 * Represents the complete trade network within a spatial scope (planet/system/sector).
 * Aggregates shipping lanes into graph topology for strategic analysis.
 *
 * Phase 3 of Grand Strategy Abstraction Layer (07-TRADE-LOGISTICS.md)
 *
 * Key features:
 * - Graph topology (nodes = settlements, edges = shipping lanes)
 * - Network metrics (density, path length, clustering)
 * - Hub identification (betweenness centrality)
 * - Chokepoint detection (critical nodes with few alternatives)
 * - Resilience analysis (vulnerability to blockades)
 * - Economic aggregation (trade balance, wealth distribution)
 *
 * CLAUDE.md Compliance:
 * - Component type follows lowercase_with_underscores convention
 * - No silent fallbacks - all required fields must be present
 */

import type { EntityId } from '../types.js';

/**
 * Trade Network Component - Network-level trade graph
 */
export interface TradeNetworkComponent {
  readonly type: 'trade_network';
  readonly version: number;

  // ============================================================================
  // Identity
  // ============================================================================

  /** Unique network identifier */
  networkId: string;

  /** Human-readable name (e.g., "Sol System Trade Network") */
  name: string;

  /** Spatial scope of this network */
  scope: 'planet' | 'system' | 'sector';

  /** Spatial tier entity ID this network belongs to */
  spatialTierId: EntityId;

  // ============================================================================
  // Graph Topology
  // ============================================================================

  /** Trade nodes (settlements, hubs, waypoints) */
  nodes: Set<EntityId>;

  /** Trade edges (shipping lanes) */
  edges: Map<string, TradeEdge>;

  /** Adjacency list for fast graph traversal */
  adjacencyList: Map<EntityId, Set<string>>;

  // ============================================================================
  // Network Metrics
  // ============================================================================

  /** Total flow rate across all edges (goods per tick) */
  totalFlowRate: number;

  /** Network density (actual edges / possible edges) */
  networkDensity: number;

  /** Average shortest path length between nodes */
  avgPathLength: number;

  /** Clustering coefficient (0-1, how connected are neighbors) */
  clusteringCoefficient: number;

  /** Network diameter (longest shortest path) */
  diameter: number;

  // ============================================================================
  // Strategic Analysis
  // ============================================================================

  /** Hub nodes (high betweenness centrality) */
  hubs: Array<NetworkHub>;

  /** Chokepoint nodes (critical for network connectivity) */
  chokepoints: Array<NetworkChokepoint>;

  /** Vulnerable regions (nodes with <2 alternative routes) */
  vulnerableRegions: EntityId[];

  /** Network resilience score (0-1, 1 = highly resilient) */
  resilienceScore: number;

  /** Critical nodes whose removal disconnects >10% of network */
  criticalNodes: Set<EntityId>;

  // ============================================================================
  // Economic Data
  // ============================================================================

  /** Trade balance per node (positive = net exporter, negative = net importer) */
  tradeBalance: Map<EntityId, number>;

  /** Wealth distribution metrics */
  wealthDistribution: {
    /** Gini coefficient (0 = perfect equality, 1 = perfect inequality) */
    giniCoefficient: number;

    /** Share of trade volume controlled by top 10% */
    topDecile: number;

    /** Share of trade volume controlled by bottom 50% */
    bottomHalf: number;
  };

  /** Commodity prices aggregated across network */
  commodityPrices: Map<string, number>;

  /** Total GDP (sum of all node production) */
  totalGDP: number;

  // ============================================================================
  // Control & Ownership
  // ============================================================================

  /** Faction that controls the most lanes in this network */
  dominantFaction?: EntityId;

  /** Share of network controlled by each faction */
  factionShares: Map<EntityId, number>;

  /** Whether network control is contested */
  disputed: boolean;

  // ============================================================================
  // Status & Disruptions
  // ============================================================================

  /** Overall network health (0-1, 1 = healthy) */
  health: number;

  /** Average congestion across all lanes (0-1, 1 = max congestion) */
  congestion: number;

  /** Active disruptions (blockades, piracy, hazards) */
  disruptions: Array<NetworkDisruption>;

  /** Last tick when network was analyzed */
  lastAnalysisTick: number;
}

/**
 * Trade edge in the network graph
 */
export interface TradeEdge {
  /** Edge identifier (same as shipping lane ID) */
  edgeId: string;

  /** Shipping lane entity ID */
  laneId: EntityId;

  /** Source node */
  fromNodeId: EntityId;

  /** Destination node */
  toNodeId: EntityId;

  /** Current flow rate (goods per tick) */
  flowRate: number;

  /** Maximum capacity (goods per tick) */
  capacity: number;

  /** Congestion level (0-1, 1 = at capacity) */
  congestion: number;

  /** Whether this edge is currently active */
  active: boolean;
}

/**
 * Network hub (high-traffic node)
 */
export interface NetworkHub {
  /** Node entity ID */
  nodeId: EntityId;

  /** Betweenness centrality (0-1, fraction of shortest paths through this node) */
  betweenness: number;

  /** Degree (number of connections) */
  degree: number;

  /** Total flow through this node (goods per tick) */
  totalFlow: number;

  /** Hub tier (major = top 10%, minor = top 25%) */
  tier: 'major' | 'minor';
}

/**
 * Network chokepoint (critical node)
 */
export interface NetworkChokepoint {
  /** Node entity ID */
  nodeId: EntityId;

  /** Criticality score (higher = more critical) */
  criticalityScore: number;

  /** Betweenness centrality */
  betweenness: number;

  /** Number of alternative routes if this node is removed */
  alternativeRoutes: number;

  /** Estimated nodes affected if this chokepoint is blockaded */
  affectedNodes: EntityId[];

  /** Strategic value (0-1, for targeting/defense prioritization) */
  strategicValue: number;
}

/**
 * Network disruption (blockade, piracy, hazard)
 */
export interface NetworkDisruption {
  /** Disruption type */
  type: 'blockade' | 'piracy' | 'hazard' | 'passage_collapse';

  /** Affected node or edge IDs */
  affectedNodeIds: EntityId[];
  affectedEdgeIds: string[];

  /** Severity (0-1, 1 = complete blockage) */
  severity: number;

  /** When disruption started */
  startedTick: number;

  /** When disruption will end (undefined = indefinite) */
  expectedEndTick?: number;

  /** Faction responsible (if applicable) */
  responsibleFaction?: EntityId;
}

/**
 * Create a new TradeNetworkComponent with defaults
 */
export function createTradeNetworkComponent(
  networkId: string,
  name: string,
  scope: 'planet' | 'system' | 'sector',
  spatialTierId: EntityId
): TradeNetworkComponent {
  return {
    type: 'trade_network',
    version: 1,
    networkId,
    name,
    scope,
    spatialTierId,
    nodes: new Set(),
    edges: new Map(),
    adjacencyList: new Map(),
    totalFlowRate: 0,
    networkDensity: 0,
    avgPathLength: 0,
    clusteringCoefficient: 0,
    diameter: 0,
    hubs: [],
    chokepoints: [],
    vulnerableRegions: [],
    resilienceScore: 0,
    criticalNodes: new Set(),
    tradeBalance: new Map(),
    wealthDistribution: {
      giniCoefficient: 0,
      topDecile: 0,
      bottomHalf: 0,
    },
    commodityPrices: new Map(),
    totalGDP: 0,
    dominantFaction: undefined,
    factionShares: new Map(),
    disputed: false,
    health: 1.0,
    congestion: 0,
    disruptions: [],
    lastAnalysisTick: 0,
  };
}
