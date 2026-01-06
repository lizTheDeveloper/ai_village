/**
 * NetworkAnalyzer - Social network graph analysis
 *
 * Provides comprehensive graph metrics for analyzing social relationships:
 * - Density: How connected the network is
 * - Clustering: Tendency of nodes to cluster together
 * - Centrality: Identifying influential nodes
 * - Communities: Detecting group structures
 * - Diameter: Longest shortest path
 *
 * Part of Phase 24: Sociological Metrics - Analysis Modules
 */

import type { MetricsCollector } from '../MetricsCollector.js';
import type { MetricsStorage } from '../MetricsStorage.js';

/**
 * Node in the social network
 */
export interface NetworkNode {
  id: string;
  label?: string;
  attributes?: Record<string, unknown>;
}

/**
 * Edge in the social network
 */
export interface NetworkEdge {
  source: string;
  target: string;
  weight: number;
  type?: string;
  timestamp?: number;
}

/**
 * Centrality scores for a node
 */
export interface CentralityScores {
  degree: number;
  betweenness: number;
  closeness: number;
  eigenvector: number;
}

/**
 * Community detection result
 */
export interface Community {
  id: number;
  members: string[];
  size: number;
  density: number;
  label?: string;
}

/**
 * Network metrics snapshot
 */
export interface NetworkMetrics {
  nodeCount: number;
  edgeCount: number;
  density: number;
  avgDegree: number;
  clusteringCoefficient: number;
  diameter: number;
  avgPathLength: number;
  components: number;
  modularity: number;
}

/**
 * Network evolution over time
 */
export interface NetworkEvolution {
  timestamp: number;
  metrics: NetworkMetrics;
  newNodes: number;
  newEdges: number;
  removedNodes: number;
  removedEdges: number;
}

/**
 * NetworkAnalyzer provides graph analysis for social networks
 */
export class NetworkAnalyzer {
  private collector: MetricsCollector;
  private storage?: MetricsStorage;
  private adjacencyList: Map<string, Map<string, number>> = new Map();
  private nodeAttributes: Map<string, Record<string, unknown>> = new Map();

  constructor(collector: MetricsCollector, storage?: MetricsStorage) {
    this.collector = collector;
    this.storage = storage;
  }

  /**
   * Build network from collected metrics
   */
  buildNetwork(): void {
    this.adjacencyList.clear();
    this.nodeAttributes.clear();

    const allMetrics = this.collector.getAllMetrics();
    const socialMetrics = allMetrics.social;

    if (!socialMetrics) return;

    // Get relationships from storage if available
    if (this.storage) {
      const relationships = this.storage.queryHotStorage({
        type: 'relationship:formed',
      });

      for (const metric of relationships) {
        const data = metric.data as Record<string, unknown>;
        const agent1 = data.agent1 as string;
        const agent2 = data.agent2 as string;
        const strength = (data.strength as number) ?? 1;

        if (agent1 && agent2) {
          this.addEdge(agent1, agent2, strength);
        }
      }

      // Also include conversation-based connections
      const conversations = this.storage.queryHotStorage({
        type: 'conversation:started',
      });

      for (const metric of conversations) {
        const data = metric.data as Record<string, unknown>;
        const participants = data.participants as string[];

        if (participants && participants.length >= 2) {
          // Add weak connection for conversation
          for (let i = 0; i < participants.length; i++) {
            for (let j = i + 1; j < participants.length; j++) {
              const p1 = participants[i];
              const p2 = participants[j];
              if (p1 && p2) {
                this.addEdge(p1, p2, 0.1);
              }
            }
          }
        }
      }
    }
  }

  /**
   * Add an edge to the network
   */
  addEdge(source: string, target: string, weight: number = 1): void {
    if (!this.adjacencyList.has(source)) {
      this.adjacencyList.set(source, new Map());
    }
    if (!this.adjacencyList.has(target)) {
      this.adjacencyList.set(target, new Map());
    }

    // Add or update edge weight
    const currentWeight = this.adjacencyList.get(source)!.get(target) ?? 0;
    this.adjacencyList.get(source)!.set(target, currentWeight + weight);
    this.adjacencyList.get(target)!.set(source, currentWeight + weight);
  }

  /**
   * Add a node with attributes
   */
  addNode(id: string, attributes?: Record<string, unknown>): void {
    if (!this.adjacencyList.has(id)) {
      this.adjacencyList.set(id, new Map());
    }
    if (attributes) {
      this.nodeAttributes.set(id, attributes);
    }
  }

  /**
   * Get all network metrics
   */
  getMetrics(): NetworkMetrics {
    const nodeCount = this.adjacencyList.size;
    const edges = this.getEdges();
    const edgeCount = edges.length;

    if (nodeCount === 0) {
      return {
        nodeCount: 0,
        edgeCount: 0,
        density: 0,
        avgDegree: 0,
        clusteringCoefficient: 0,
        diameter: 0,
        avgPathLength: 0,
        components: 0,
        modularity: 0,
      };
    }

    return {
      nodeCount,
      edgeCount,
      density: this.calculateDensity(),
      avgDegree: this.calculateAverageDegree(),
      clusteringCoefficient: this.calculateGlobalClustering(),
      diameter: this.calculateDiameter(),
      avgPathLength: this.calculateAveragePathLength(),
      components: this.countConnectedComponents(),
      modularity: this.calculateModularity(),
    };
  }

  /**
   * Calculate network density
   */
  calculateDensity(): number {
    const n = this.adjacencyList.size;
    if (n < 2) return 0;

    const maxEdges = (n * (n - 1)) / 2;
    const actualEdges = this.getEdges().length;

    return actualEdges / maxEdges;
  }

  /**
   * Calculate average degree
   */
  calculateAverageDegree(): number {
    if (this.adjacencyList.size === 0) return 0;

    let totalDegree = 0;
    for (const neighbors of this.adjacencyList.values()) {
      totalDegree += neighbors.size;
    }

    return totalDegree / this.adjacencyList.size;
  }

  /**
   * Calculate global clustering coefficient
   */
  calculateGlobalClustering(): number {
    let totalTriangles = 0;
    let totalTriplets = 0;

    for (const [_node, neighbors] of this.adjacencyList) {
      const neighborArray = Array.from(neighbors.keys());
      const k = neighborArray.length;

      if (k < 2) continue;

      // Count triplets centered on this node
      totalTriplets += (k * (k - 1)) / 2;

      // Count triangles
      for (let i = 0; i < k; i++) {
        for (let j = i + 1; j < k; j++) {
          const n1 = neighborArray[i]!;
          const n2 = neighborArray[j]!;
          if (this.adjacencyList.get(n1)?.has(n2)) {
            totalTriangles++;
          }
        }
      }
    }

    if (totalTriplets === 0) return 0;

    // Each triangle counted 3 times (once per vertex)
    return totalTriangles / totalTriplets;
  }

  /**
   * Calculate local clustering coefficient for a node
   */
  calculateLocalClustering(nodeId: string): number {
    const neighbors = this.adjacencyList.get(nodeId);
    if (!neighbors || neighbors.size < 2) return 0;

    const neighborArray = Array.from(neighbors.keys());
    const k = neighborArray.length;
    let triangles = 0;

    for (let i = 0; i < k; i++) {
      for (let j = i + 1; j < k; j++) {
        const n1 = neighborArray[i]!;
        const n2 = neighborArray[j]!;
        if (this.adjacencyList.get(n1)?.has(n2)) {
          triangles++;
        }
      }
    }

    const possibleTriangles = (k * (k - 1)) / 2;
    return triangles / possibleTriangles;
  }

  /**
   * Calculate centrality scores for all nodes
   */
  calculateCentrality(): Map<string, CentralityScores> {
    const centrality = new Map<string, CentralityScores>();
    const nodes = Array.from(this.adjacencyList.keys());

    // Calculate degree centrality
    const maxDegree = Math.max(...Array.from(this.adjacencyList.values()).map(n => n.size));

    // Calculate shortest paths for betweenness and closeness
    const shortestPaths = this.computeAllShortestPaths();

    for (const node of nodes) {
      const neighbors = this.adjacencyList.get(node)!;
      const degree = maxDegree > 0 ? neighbors.size / maxDegree : 0;

      // Closeness: inverse of average shortest path length
      let totalDistance = 0;
      let reachable = 0;
      for (const [target, distance] of shortestPaths.get(node) ?? []) {
        if (target !== node && distance < Infinity) {
          totalDistance += distance;
          reachable++;
        }
      }
      const closeness = reachable > 0 ? reachable / totalDistance : 0;

      // Betweenness: count paths through this node
      const betweenness = this.calculateBetweenness(node, shortestPaths);

      centrality.set(node, {
        degree,
        betweenness,
        closeness,
        eigenvector: 0, // Simplified - would need power iteration
      });
    }

    // Calculate eigenvector centrality using power iteration
    const eigenvector = this.calculateEigenvectorCentrality();
    for (const [node, score] of eigenvector) {
      const existing = centrality.get(node);
      if (existing) {
        existing.eigenvector = score;
      }
    }

    return centrality;
  }

  /**
   * Calculate betweenness centrality for a node
   */
  private calculateBetweenness(
    node: string,
    shortestPaths: Map<string, Map<string, number>>
  ): number {
    let betweenness = 0;
    const nodes = Array.from(this.adjacencyList.keys());

    for (const source of nodes) {
      if (source === node) continue;

      for (const target of nodes) {
        if (target === node || target === source) continue;

        const distST = shortestPaths.get(source)?.get(target) ?? Infinity;
        const distSN = shortestPaths.get(source)?.get(node) ?? Infinity;
        const distNT = shortestPaths.get(node)?.get(target) ?? Infinity;

        // Check if node is on a shortest path from source to target
        if (distST < Infinity && distSN + distNT === distST) {
          betweenness += 1;
        }
      }
    }

    // Normalize
    const n = nodes.length;
    if (n > 2) {
      betweenness /= (n - 1) * (n - 2);
    }

    return betweenness;
  }

  /**
   * Calculate eigenvector centrality using power iteration
   */
  private calculateEigenvectorCentrality(): Map<string, number> {
    const nodes = Array.from(this.adjacencyList.keys());
    const n = nodes.length;

    if (n === 0) return new Map();

    // Initialize scores
    let scores = new Map<string, number>();
    for (const node of nodes) {
      scores.set(node, 1 / n);
    }

    // Power iteration
    for (let iter = 0; iter < 100; iter++) {
      const newScores = new Map<string, number>();
      let norm = 0;

      for (const node of nodes) {
        let score = 0;
        const neighbors = this.adjacencyList.get(node)!;
        for (const [neighbor, weight] of neighbors) {
          score += (scores.get(neighbor) ?? 0) * weight;
        }
        newScores.set(node, score);
        norm += score * score;
      }

      // Normalize
      norm = Math.sqrt(norm);
      if (norm > 0) {
        for (const [node, score] of newScores) {
          newScores.set(node, score / norm);
        }
      }

      // Check convergence
      let maxDiff = 0;
      for (const node of nodes) {
        maxDiff = Math.max(maxDiff, Math.abs((newScores.get(node) ?? 0) - (scores.get(node) ?? 0)));
      }

      scores = newScores;

      if (maxDiff < 0.0001) break;
    }

    return scores;
  }

  /**
   * Compute all shortest paths using Floyd-Warshall
   */
  private computeAllShortestPaths(): Map<string, Map<string, number>> {
    const nodes = Array.from(this.adjacencyList.keys());
    const dist = new Map<string, Map<string, number>>();

    // Initialize distances
    for (const node of nodes) {
      dist.set(node, new Map());
      for (const other of nodes) {
        if (node === other) {
          dist.get(node)!.set(other, 0);
        } else if (this.adjacencyList.get(node)?.has(other)) {
          dist.get(node)!.set(other, 1);
        } else {
          dist.get(node)!.set(other, Infinity);
        }
      }
    }

    // Floyd-Warshall
    for (const k of nodes) {
      for (const i of nodes) {
        for (const j of nodes) {
          const distIK = dist.get(i)!.get(k)!;
          const distKJ = dist.get(k)!.get(j)!;
          const distIJ = dist.get(i)!.get(j)!;

          if (distIK + distKJ < distIJ) {
            dist.get(i)!.set(j, distIK + distKJ);
          }
        }
      }
    }

    return dist;
  }

  /**
   * Calculate network diameter
   */
  calculateDiameter(): number {
    if (this.adjacencyList.size < 2) return 0;

    const shortestPaths = this.computeAllShortestPaths();
    let maxDistance = 0;

    for (const [, distances] of shortestPaths) {
      for (const distance of distances.values()) {
        if (distance < Infinity && distance > maxDistance) {
          maxDistance = distance;
        }
      }
    }

    return maxDistance;
  }

  /**
   * Calculate average path length
   */
  calculateAveragePathLength(): number {
    if (this.adjacencyList.size < 2) return 0;

    const shortestPaths = this.computeAllShortestPaths();
    let totalDistance = 0;
    let count = 0;

    for (const [source, distances] of shortestPaths) {
      for (const [target, distance] of distances) {
        if (source !== target && distance < Infinity) {
          totalDistance += distance;
          count++;
        }
      }
    }

    return count > 0 ? totalDistance / count : 0;
  }

  /**
   * Count connected components
   */
  countConnectedComponents(): number {
    const visited = new Set<string>();
    let components = 0;

    for (const node of this.adjacencyList.keys()) {
      if (!visited.has(node)) {
        this.dfs(node, visited);
        components++;
      }
    }

    return components;
  }

  /**
   * DFS helper for component counting
   */
  private dfs(node: string, visited: Set<string>): void {
    visited.add(node);
    const neighbors = this.adjacencyList.get(node);

    if (neighbors) {
      for (const neighbor of neighbors.keys()) {
        if (!visited.has(neighbor)) {
          this.dfs(neighbor, visited);
        }
      }
    }
  }

  /**
   * Detect communities using Louvain algorithm (simplified)
   */
  detectCommunities(): Community[] {
    const communities: Community[] = [];
    const communityAssignment = new Map<string, number>();

    // Simple approach: use connected components as initial communities
    const visited = new Set<string>();
    let communityId = 0;

    for (const node of this.adjacencyList.keys()) {
      if (!visited.has(node)) {
        const members: string[] = [];
        this.collectComponent(node, visited, members);

        for (const member of members) {
          communityAssignment.set(member, communityId);
        }

        communities.push({
          id: communityId,
          members,
          size: members.length,
          density: this.calculateSubgraphDensity(members),
        });

        communityId++;
      }
    }

    return communities;
  }

  /**
   * Collect all nodes in a component
   */
  private collectComponent(node: string, visited: Set<string>, members: string[]): void {
    visited.add(node);
    members.push(node);

    const neighbors = this.adjacencyList.get(node);
    if (neighbors) {
      for (const neighbor of neighbors.keys()) {
        if (!visited.has(neighbor)) {
          this.collectComponent(neighbor, visited, members);
        }
      }
    }
  }

  /**
   * Calculate density of a subgraph
   */
  private calculateSubgraphDensity(nodes: string[]): number {
    if (nodes.length < 2) return 0;

    let edges = 0;
    const nodeSet = new Set(nodes);

    for (const node of nodes) {
      const neighbors = this.adjacencyList.get(node);
      if (neighbors) {
        for (const neighbor of neighbors.keys()) {
          if (nodeSet.has(neighbor)) {
            edges++;
          }
        }
      }
    }

    // Each edge counted twice
    edges /= 2;
    const maxEdges = (nodes.length * (nodes.length - 1)) / 2;

    return maxEdges > 0 ? edges / maxEdges : 0;
  }

  /**
   * Calculate modularity of current community structure
   */
  calculateModularity(): number {
    const communities = this.detectCommunities();
    if (communities.length <= 1) return 0;

    const edges = this.getEdges();
    const m = edges.length;
    if (m === 0) return 0;

    // Create community assignment map
    const assignment = new Map<string, number>();
    for (const community of communities) {
      for (const member of community.members) {
        assignment.set(member, community.id);
      }
    }

    // Calculate modularity
    let Q = 0;
    for (const [node, neighbors] of this.adjacencyList) {
      const ki = neighbors.size;
      const ci = assignment.get(node)!;

      for (const [other, weight] of neighbors) {
        const kj = this.adjacencyList.get(other)?.size ?? 0;
        const cj = assignment.get(other)!;

        if (ci === cj) {
          Q += weight - (ki * kj) / (2 * m);
        }
      }
    }

    return Q / (2 * m);
  }

  /**
   * Get top influential nodes
   */
  getInfluentialNodes(limit: number = 10): Array<{ id: string; scores: CentralityScores }> {
    const centrality = this.calculateCentrality();
    const results: Array<{ id: string; scores: CentralityScores }> = [];

    for (const [id, scores] of centrality) {
      results.push({ id, scores });
    }

    // Sort by composite score (average of normalized centralities)
    results.sort((a, b) => {
      const scoreA = (a.scores.degree + a.scores.betweenness + a.scores.closeness + a.scores.eigenvector) / 4;
      const scoreB = (b.scores.degree + b.scores.betweenness + b.scores.closeness + b.scores.eigenvector) / 4;
      return scoreB - scoreA;
    });

    return results.slice(0, limit);
  }

  /**
   * Get network edges
   */
  getEdges(): NetworkEdge[] {
    const edges: NetworkEdge[] = [];
    const seen = new Set<string>();

    for (const [source, neighbors] of this.adjacencyList) {
      for (const [target, weight] of neighbors) {
        const key = source < target ? `${source}-${target}` : `${target}-${source}`;
        if (!seen.has(key)) {
          seen.add(key);
          edges.push({ source, target, weight });
        }
      }
    }

    return edges;
  }

  /**
   * Get network nodes
   */
  getNodes(): NetworkNode[] {
    const nodes: NetworkNode[] = [];

    for (const id of this.adjacencyList.keys()) {
      nodes.push({
        id,
        attributes: this.nodeAttributes.get(id),
      });
    }

    return nodes;
  }

  /**
   * Export network for visualization
   */
  exportForVisualization(): { nodes: NetworkNode[]; edges: NetworkEdge[]; metrics: NetworkMetrics } {
    return {
      nodes: this.getNodes(),
      edges: this.getEdges(),
      metrics: this.getMetrics(),
    };
  }
}
