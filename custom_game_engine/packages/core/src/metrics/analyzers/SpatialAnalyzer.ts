/**
 * SpatialAnalyzer - Spatial pattern analysis
 *
 * Analyzes spatial distributions and patterns:
 * - Territory formation and boundaries
 * - Hotspot detection
 * - Heatmap generation
 * - Segregation indices
 * - Movement patterns
 *
 * Part of Phase 24: Sociological Metrics - Analysis Modules
 */

import type { MetricsCollector } from '../MetricsCollector.js';
import type { MetricsStorage } from '../MetricsStorage.js';

/**
 * Position in 2D space
 */
export interface Position {
  x: number;
  y: number;
}

/**
 * Heatmap cell
 */
export interface HeatmapCell {
  x: number;
  y: number;
  value: number;
  normalized: number;
}

/**
 * Heatmap data
 */
export interface Heatmap {
  cells: HeatmapCell[];
  resolution: number;
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  minValue: number;
  maxValue: number;
}

/**
 * Hotspot detection result
 */
export interface Hotspot {
  center: Position;
  radius: number;
  intensity: number;
  count: number;
  type: 'high' | 'low';
}

/**
 * Territory boundary
 */
export interface Territory {
  id: string;
  ownerId?: string;
  bounds: { minX: number; maxX: number; minY: number; maxY: number };
  area: number;
  positions: Position[];
  density: number;
}

/**
 * Movement trail
 */
export interface MovementTrail {
  agentId: string;
  positions: Array<Position & { timestamp: number }>;
  totalDistance: number;
  avgSpeed: number;
}

/**
 * Segregation metrics
 */
export interface SegregationMetrics {
  dissimilarityIndex: number;
  isolationIndex: number;
  concentrationIndex: number;
  clusteringIndex: number;
}

/**
 * Spatial distribution metrics
 */
export interface SpatialDistribution {
  meanCenter: Position;
  standardDistance: number;
  standardDeviationalEllipse: {
    center: Position;
    semiMajorAxis: number;
    semiMinorAxis: number;
    rotation: number;
  };
  nearestNeighborIndex: number;
}

/**
 * SpatialAnalyzer provides spatial pattern analysis
 */
export class SpatialAnalyzer {
  private collector: MetricsCollector;
  private positionHistory: Map<string, Array<Position & { timestamp: number }>> = new Map();

  constructor(collector: MetricsCollector, _storage?: MetricsStorage) {
    this.collector = collector;
  }

  /**
   * Record a position update
   */
  recordPosition(agentId: string, x: number, y: number, timestamp: number = Date.now()): void {
    if (!this.positionHistory.has(agentId)) {
      this.positionHistory.set(agentId, []);
    }
    this.positionHistory.get(agentId)!.push({ x, y, timestamp });

    // Keep only recent history (last 1000 positions per agent)
    const history = this.positionHistory.get(agentId)!;
    if (history.length > 1000) {
      history.shift();
    }
  }

  /**
   * Generate a heatmap from position data
   */
  generateHeatmap(resolution: number = 10): Heatmap {
    const cellCounts = new Map<string, number>();
    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;

    // Collect all positions
    for (const history of this.positionHistory.values()) {
      for (const pos of history) {
        minX = Math.min(minX, pos.x);
        maxX = Math.max(maxX, pos.x);
        minY = Math.min(minY, pos.y);
        maxY = Math.max(maxY, pos.y);

        const cellX = Math.floor(pos.x / resolution) * resolution;
        const cellY = Math.floor(pos.y / resolution) * resolution;
        const key = `${cellX},${cellY}`;

        cellCounts.set(key, (cellCounts.get(key) ?? 0) + 1);
      }
    }

    // Convert to cells array
    const cells: HeatmapCell[] = [];
    let minValue = Infinity, maxValue = -Infinity;

    for (const [key, value] of cellCounts) {
      const [xStr, yStr] = key.split(',');
      const x = parseInt(xStr!, 10);
      const y = parseInt(yStr!, 10);

      minValue = Math.min(minValue, value);
      maxValue = Math.max(maxValue, value);

      cells.push({ x, y, value, normalized: 0 });
    }

    // Normalize values
    const range = maxValue - minValue;
    for (const cell of cells) {
      cell.normalized = range > 0 ? (cell.value - minValue) / range : 0;
    }

    return {
      cells,
      resolution,
      minX: minX === Infinity ? 0 : minX,
      maxX: maxX === -Infinity ? 0 : maxX,
      minY: minY === Infinity ? 0 : minY,
      maxY: maxY === -Infinity ? 0 : maxY,
      minValue: minValue === Infinity ? 0 : minValue,
      maxValue: maxValue === -Infinity ? 0 : maxValue,
    };
  }

  /**
   * Detect hotspots using DBSCAN-like clustering
   */
  detectHotspots(minPoints: number = 5, radius: number = 50): Hotspot[] {
    const allPositions: Position[] = [];

    // Collect all recent positions
    for (const history of this.positionHistory.values()) {
      const recentHistory = history.slice(-100);
      for (const pos of recentHistory) {
        allPositions.push({ x: pos.x, y: pos.y });
      }
    }

    if (allPositions.length < minPoints) return [];

    const hotspots: Hotspot[] = [];
    const processed = new Set<number>();

    for (let i = 0; i < allPositions.length; i++) {
      if (processed.has(i)) continue;

      const pos = allPositions[i]!;
      const neighbors: number[] = [];

      // Find neighbors within radius
      for (let j = 0; j < allPositions.length; j++) {
        const other = allPositions[j]!;
        const dist = Math.sqrt(Math.pow(pos.x - other.x, 2) + Math.pow(pos.y - other.y, 2));
        if (dist <= radius) {
          neighbors.push(j);
        }
      }

      if (neighbors.length >= minPoints) {
        // Found a hotspot
        let sumX = 0, sumY = 0;
        for (const idx of neighbors) {
          processed.add(idx);
          sumX += allPositions[idx]!.x;
          sumY += allPositions[idx]!.y;
        }

        const center = { x: sumX / neighbors.length, y: sumY / neighbors.length };
        const intensity = neighbors.length / allPositions.length;

        hotspots.push({
          center,
          radius,
          intensity,
          count: neighbors.length,
          type: 'high',
        });
      }
    }

    // Sort by intensity
    hotspots.sort((a, b) => b.intensity - a.intensity);

    return hotspots;
  }

  /**
   * Detect territory boundaries
   */
  detectTerritories(_groupByAttribute?: string): Territory[] {
    const territories: Territory[] = [];
    const agentCenters = new Map<string, Position[]>();

    // Calculate center of activity for each agent
    for (const [agentId, history] of this.positionHistory) {
      if (history.length === 0) continue;

      // Use recent positions
      const recentHistory = history.slice(-100);
      agentCenters.set(agentId, recentHistory.map(p => ({ x: p.x, y: p.y })));
    }

    // Create territory for each agent
    for (const [agentId, positions] of agentCenters) {
      if (positions.length === 0) continue;

      let minX = Infinity, maxX = -Infinity;
      let minY = Infinity, maxY = -Infinity;

      for (const pos of positions) {
        minX = Math.min(minX, pos.x);
        maxX = Math.max(maxX, pos.x);
        minY = Math.min(minY, pos.y);
        maxY = Math.max(maxY, pos.y);
      }

      const width = maxX - minX;
      const height = maxY - minY;
      const area = width * height;

      territories.push({
        id: `territory-${agentId}`,
        ownerId: agentId,
        bounds: { minX, maxX, minY, maxY },
        area,
        positions,
        density: positions.length / (area || 1),
      });
    }

    return territories;
  }

  /**
   * Calculate movement trails
   */
  getMovementTrails(): MovementTrail[] {
    const trails: MovementTrail[] = [];

    for (const [agentId, history] of this.positionHistory) {
      if (history.length < 2) continue;

      let totalDistance = 0;
      let totalTime = 0;

      for (let i = 1; i < history.length; i++) {
        const prev = history[i - 1]!;
        const curr = history[i]!;

        const dist = Math.sqrt(Math.pow(curr.x - prev.x, 2) + Math.pow(curr.y - prev.y, 2));
        const timeDiff = curr.timestamp - prev.timestamp;

        totalDistance += dist;
        totalTime += timeDiff;
      }

      const avgSpeed = totalTime > 0 ? totalDistance / (totalTime / 1000) : 0;

      trails.push({
        agentId,
        positions: history,
        totalDistance,
        avgSpeed,
      });
    }

    return trails;
  }

  /**
   * Calculate spatial distribution metrics
   */
  calculateSpatialDistribution(): SpatialDistribution {
    const allPositions: Position[] = [];

    // Get current/recent positions
    for (const history of this.positionHistory.values()) {
      if (history.length > 0) {
        const latest = history[history.length - 1]!;
        allPositions.push({ x: latest.x, y: latest.y });
      }
    }

    if (allPositions.length === 0) {
      return {
        meanCenter: { x: 0, y: 0 },
        standardDistance: 0,
        standardDeviationalEllipse: {
          center: { x: 0, y: 0 },
          semiMajorAxis: 0,
          semiMinorAxis: 0,
          rotation: 0,
        },
        nearestNeighborIndex: 0,
      };
    }

    // Calculate mean center
    const n = allPositions.length;
    const sumX = allPositions.reduce((sum, p) => sum + p.x, 0);
    const sumY = allPositions.reduce((sum, p) => sum + p.y, 0);
    const meanCenter = { x: sumX / n, y: sumY / n };

    // Calculate standard distance
    const sumSqDist = allPositions.reduce((sum, p) => {
      return sum + Math.pow(p.x - meanCenter.x, 2) + Math.pow(p.y - meanCenter.y, 2);
    }, 0);
    const standardDistance = Math.sqrt(sumSqDist / n);

    // Calculate standard deviational ellipse
    const ellipse = this.calculateStandardDeviationalEllipse(allPositions, meanCenter);

    // Calculate nearest neighbor index
    const nearestNeighborIndex = this.calculateNearestNeighborIndex(allPositions);

    return {
      meanCenter,
      standardDistance,
      standardDeviationalEllipse: ellipse,
      nearestNeighborIndex,
    };
  }

  /**
   * Calculate standard deviational ellipse
   */
  private calculateStandardDeviationalEllipse(
    positions: Position[],
    center: Position
  ): { center: Position; semiMajorAxis: number; semiMinorAxis: number; rotation: number } {
    const n = positions.length;
    if (n < 2) {
      return { center, semiMajorAxis: 0, semiMinorAxis: 0, rotation: 0 };
    }

    // Calculate covariance matrix
    let sumXX = 0, sumYY = 0, sumXY = 0;

    for (const p of positions) {
      const dx = p.x - center.x;
      const dy = p.y - center.y;
      sumXX += dx * dx;
      sumYY += dy * dy;
      sumXY += dx * dy;
    }

    const varX = sumXX / n;
    const varY = sumYY / n;
    const covXY = sumXY / n;

    // Calculate eigenvalues and rotation
    const trace = varX + varY;
    const det = varX * varY - covXY * covXY;
    const discriminant = Math.sqrt(Math.max(0, trace * trace / 4 - det));

    const lambda1 = trace / 2 + discriminant;
    const lambda2 = trace / 2 - discriminant;

    // Rotation angle (in radians)
    const rotation = covXY !== 0 ? Math.atan2(lambda1 - varX, covXY) : 0;

    return {
      center,
      semiMajorAxis: Math.sqrt(Math.max(0, lambda1)) * 2,
      semiMinorAxis: Math.sqrt(Math.max(0, lambda2)) * 2,
      rotation,
    };
  }

  /**
   * Calculate nearest neighbor index (Clark-Evans)
   */
  private calculateNearestNeighborIndex(positions: Position[]): number {
    const n = positions.length;
    if (n < 2) return 0;

    // Calculate bounding area
    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;

    for (const p of positions) {
      minX = Math.min(minX, p.x);
      maxX = Math.max(maxX, p.x);
      minY = Math.min(minY, p.y);
      maxY = Math.max(maxY, p.y);
    }

    const area = (maxX - minX) * (maxY - minY);
    if (area === 0) return 0;

    // Calculate mean nearest neighbor distance
    let totalNNDist = 0;

    for (let i = 0; i < n; i++) {
      let minDist = Infinity;
      for (let j = 0; j < n; j++) {
        if (i === j) continue;
        const dist = Math.sqrt(
          Math.pow(positions[i]!.x - positions[j]!.x, 2) +
          Math.pow(positions[i]!.y - positions[j]!.y, 2)
        );
        minDist = Math.min(minDist, dist);
      }
      if (minDist < Infinity) {
        totalNNDist += minDist;
      }
    }

    const observedMeanNN = totalNNDist / n;
    const expectedMeanNN = 0.5 * Math.sqrt(area / n);

    return expectedMeanNN > 0 ? observedMeanNN / expectedMeanNN : 0;
  }

  /**
   * Calculate segregation metrics (for agents with group attributes)
   */
  calculateSegregation(_groupAttribute: string = 'group'): SegregationMetrics {
    // Get groups and their positions
    const groups = new Map<string, Position[]>();
    const allMetrics = this.collector.getAllMetrics();

    // Try to get agent data with group info
    const agentData = allMetrics.behavioral as Record<string, { group?: string }> | undefined;

    if (!agentData) {
      return {
        dissimilarityIndex: 0,
        isolationIndex: 0,
        concentrationIndex: 0,
        clusteringIndex: 0,
      };
    }

    // Collect positions by group
    for (const [agentId, data] of Object.entries(agentData)) {
      const group = data.group ?? 'default';
      const history = this.positionHistory.get(agentId);

      if (history && history.length > 0) {
        if (!groups.has(group)) {
          groups.set(group, []);
        }
        const latest = history[history.length - 1]!;
        groups.get(group)!.push({ x: latest.x, y: latest.y });
      }
    }

    // Calculate dissimilarity index
    const dissimilarityIndex = this.calculateDissimilarityIndex(groups);

    // Calculate isolation index
    const isolationIndex = this.calculateIsolationIndex(groups);

    // Calculate concentration (spatial clustering by group)
    const concentrationIndex = this.calculateConcentrationIndex(groups);

    // Calculate clustering index
    const clusteringIndex = this.calculateClusteringIndex(groups);

    return {
      dissimilarityIndex,
      isolationIndex,
      concentrationIndex,
      clusteringIndex,
    };
  }

  /**
   * Calculate dissimilarity index (spatial evenness)
   */
  private calculateDissimilarityIndex(groups: Map<string, Position[]>): number {
    if (groups.size < 2) return 0;

    // Generate grid cells
    const resolution = 50;
    const cellGroups = new Map<string, Map<string, number>>();

    for (const [group, positions] of groups) {
      for (const pos of positions) {
        const cellKey = `${Math.floor(pos.x / resolution)},${Math.floor(pos.y / resolution)}`;

        if (!cellGroups.has(cellKey)) {
          cellGroups.set(cellKey, new Map());
        }
        const cell = cellGroups.get(cellKey)!;
        cell.set(group, (cell.get(group) ?? 0) + 1);
      }
    }

    // Calculate total per group
    const totals = new Map<string, number>();
    for (const [group, positions] of groups) {
      totals.set(group, positions.length);
    }

    // Compare first two groups (simplified)
    const groupArray = Array.from(groups.keys());
    if (groupArray.length < 2) return 0;

    const group1 = groupArray[0]!;
    const group2 = groupArray[1]!;
    const total1 = totals.get(group1) ?? 0;
    const total2 = totals.get(group2) ?? 0;

    if (total1 === 0 || total2 === 0) return 0;

    let dissimilarity = 0;
    for (const [, cell] of cellGroups) {
      const n1 = cell.get(group1) ?? 0;
      const n2 = cell.get(group2) ?? 0;
      dissimilarity += Math.abs(n1 / total1 - n2 / total2);
    }

    return dissimilarity / 2;
  }

  /**
   * Calculate isolation index
   */
  private calculateIsolationIndex(groups: Map<string, Position[]>): number {
    if (groups.size < 2) return 0;

    const resolution = 50;
    const cellGroups = new Map<string, Map<string, number>>();
    let totalPopulation = 0;

    for (const [group, positions] of groups) {
      totalPopulation += positions.length;
      for (const pos of positions) {
        const cellKey = `${Math.floor(pos.x / resolution)},${Math.floor(pos.y / resolution)}`;

        if (!cellGroups.has(cellKey)) {
          cellGroups.set(cellKey, new Map());
        }
        const cell = cellGroups.get(cellKey)!;
        cell.set(group, (cell.get(group) ?? 0) + 1);
      }
    }

    if (totalPopulation === 0) return 0;

    // Calculate isolation for each group
    let totalIsolation = 0;

    for (const [targetGroup, positions] of groups) {
      const groupTotal = positions.length;
      if (groupTotal === 0) continue;

      let isolation = 0;

      for (const [, cell] of cellGroups) {
        const cellTotal = Array.from(cell.values()).reduce((a, b) => a + b, 0);
        const groupInCell = cell.get(targetGroup) ?? 0;

        if (cellTotal > 0) {
          isolation += (groupInCell / groupTotal) * (groupInCell / cellTotal);
        }
      }

      totalIsolation += isolation * (groupTotal / totalPopulation);
    }

    return totalIsolation;
  }

  /**
   * Calculate concentration index
   */
  private calculateConcentrationIndex(groups: Map<string, Position[]>): number {
    // Measure how concentrated each group is in space
    let totalConcentration = 0;
    let count = 0;

    for (const positions of groups.values()) {
      if (positions.length < 2) continue;

      // Calculate variance of distances from center
      const center = {
        x: positions.reduce((sum, p) => sum + p.x, 0) / positions.length,
        y: positions.reduce((sum, p) => sum + p.y, 0) / positions.length,
      };

      const avgDist = positions.reduce((sum, p) => {
        return sum + Math.sqrt(Math.pow(p.x - center.x, 2) + Math.pow(p.y - center.y, 2));
      }, 0) / positions.length;

      // Lower average distance = higher concentration
      totalConcentration += 1 / (1 + avgDist);
      count++;
    }

    return count > 0 ? totalConcentration / count : 0;
  }

  /**
   * Calculate clustering index
   */
  private calculateClusteringIndex(groups: Map<string, Position[]>): number {
    // Measure how clustered same-group members are
    let totalClustering = 0;
    let count = 0;

    for (const positions of groups.values()) {
      if (positions.length < 2) continue;

      // Calculate average nearest neighbor distance within group
      let avgNN = 0;
      for (let i = 0; i < positions.length; i++) {
        let minDist = Infinity;
        for (let j = 0; j < positions.length; j++) {
          if (i === j) continue;
          const dist = Math.sqrt(
            Math.pow(positions[i]!.x - positions[j]!.x, 2) +
            Math.pow(positions[i]!.y - positions[j]!.y, 2)
          );
          minDist = Math.min(minDist, dist);
        }
        if (minDist < Infinity) {
          avgNN += minDist;
        }
      }
      avgNN /= positions.length;

      // Lower NN distance = higher clustering
      totalClustering += 1 / (1 + avgNN);
      count++;
    }

    return count > 0 ? totalClustering / count : 0;
  }

  /**
   * Clear position history
   */
  clear(): void {
    this.positionHistory.clear();
  }

  /**
   * Export data for visualization
   */
  exportForVisualization(): {
    heatmap: Heatmap;
    hotspots: Hotspot[];
    territories: Territory[];
    trails: MovementTrail[];
    distribution: SpatialDistribution;
  } {
    return {
      heatmap: this.generateHeatmap(),
      hotspots: this.detectHotspots(),
      territories: this.detectTerritories(),
      trails: this.getMovementTrails(),
      distribution: this.calculateSpatialDistribution(),
    };
  }
}
