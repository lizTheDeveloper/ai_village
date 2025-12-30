/**
 * Terrain Feature Analyzer
 *
 * Automatically detects and classifies terrain features (peaks, valleys, cliffs,
 * lakes, ridges, etc.) for natural language description and LLM agent perception.
 *
 * Based on geomorphometry research and proven algorithms:
 *
 * ## Primary Research Sources:
 *
 * 1. **Detection of terrain feature points from digital elevation models using contour context (2024)**
 *    https://www.tandfonline.com/doi/full/10.1080/10106049.2024.2351904
 *    - Contour-based detection of peaks, pits, saddles
 *    - Topological relationships for feature extraction
 *
 * 2. **Deep learning-based automated terrain classification (2023)**
 *    https://www.sciencedirect.com/science/article/pii/S1569843223000717
 *    - Modern terrain classification using DEMs
 *    - Lakes, ridges, valleys, basins detection
 *
 * 3. **Geomorphometry and terrain analysis: data, methods, platforms (2022)**
 *    https://www.researchgate.net/publication/363655877_Geomorphometry_and_terrain_analysis_data_methods_platforms_and_applications
 *    - Comprehensive terrain analysis methods
 *    - Surface networks and critical point theory
 *
 * 4. **Digital Terrain Analysis - Raster Analysis and Terrain Modelling**
 *    https://www.opengeomatics.ca/raster-analysis-and-terrain-modelling.html
 *    - Topographic Position Index (TPI)
 *    - Curvature analysis techniques
 *
 * 5. **US Army - Identify Terrain Features on a Map (FM 3-25.26)**
 *    https://rdl.train.army.mil/catalog-ws/view/100.atsc/0e47612a-f13b-4be2-aa41-3e886a40b88c-1335953260245/report.pdf
 *    - Military terrain feature definitions
 *    - Cliff detection criteria (slope > 30°)
 *
 * 6. **A Method for Extracting Key Terrain Features from Shaded Relief of DEMs (MDPI 2020)**
 *    https://www.mdpi.com/2072-4292/12/17/2809
 *    - Ridge, spur, cliff, peak detection
 *    - Shaded relief analysis
 *
 * ## Core Algorithms Used:
 *
 * ### Topographic Position Index (TPI)
 * Compares cell elevation to neighborhood average:
 * ```
 * TPI = elevation - mean(neighbor_elevations)
 * TPI > 0  → Ridge/Peak (higher than surroundings)
 * TPI < 0  → Valley/Depression (lower than surroundings)
 * TPI ≈ 0  → Flat/Slope (similar to surroundings)
 * ```
 *
 * ### Slope Analysis
 * Calculated from elevation gradients:
 * ```
 * slope = arctan(sqrt(dz/dx^2 + dz/dy^2))
 * slope > 30° → Cliff (very steep)
 * slope 10-30° → Hillside
 * slope < 10° → Plains
 * ```
 *
 * ### Critical Point Detection (Morse Theory)
 * Based on 19th century work by Cayley and Maxwell:
 * - **Peaks**: Local maxima (8-neighbor check)
 * - **Pits**: Local minima
 * - **Saddles**: Max in one direction, min in perpendicular
 *
 * ### Connected Component Analysis
 * For water bodies (lakes, ponds):
 * - Flood fill algorithm to find connected water tiles
 * - Size classification (pond < 10 tiles, lake >= 10 tiles)
 */

import type { Tile } from '../chunks/Tile.js';

/**
 * Terrain feature types based on geomorphology classification.
 */
export type TerrainFeatureType =
  | 'peak'           // Local elevation maximum (mountain peak, hilltop)
  | 'valley'         // Local elevation minimum (valley floor, depression)
  | 'saddle'         // Mountain pass (low on ridge, high in valley)
  | 'ridge'          // Linear high feature (ridgeline, crest)
  | 'cliff'          // Very steep slope (> 30° per Army FM 3-25.26)
  | 'plateau'        // Flat elevated area
  | 'plain'          // Flat low area
  | 'hillside'       // Moderate slope
  | 'lake'           // Connected water body (large)
  | 'pond'           // Small water body
  | 'river'          // Flowing water (linear water feature)
  | 'beach'          // Sand adjacent to water
  | 'forest'         // Dense tree coverage
  | 'unknown';       // Unclassified

/**
 * Detected terrain feature with location and characteristics.
 */
export interface TerrainFeature {
  /** Feature type */
  type: TerrainFeatureType;

  /** Center position (world coordinates) */
  x: number;
  y: number;

  /** Approximate size/radius in tiles */
  size: number;

  /** Elevation at feature center */
  elevation: number;

  /** Average slope (degrees) */
  slope?: number;

  /** Topographic Position Index value */
  tpi?: number;

  /** Natural language description for LLMs */
  description: string;

  /** Directional info relative to observer (filled in by describeNearby) */
  direction?: string;
  distance?: number;
}

/**
 * Terrain feature analyzer using geomorphometry algorithms.
 */
export class TerrainFeatureAnalyzer {
  /**
   * Analyze terrain around a position and detect features.
   *
   * Uses TPI (Topographic Position Index) and slope analysis to classify terrain.
   *
   * @param getTileAt Function to get tile at world coordinates
   * @param centerX Center X position
   * @param centerY Center Y position
   * @param radius Search radius in tiles
   * @returns Array of detected features
   */
  analyzeArea(
    getTileAt: (x: number, y: number) => Tile | undefined,
    centerX: number,
    centerY: number,
    radius: number = 20
  ): TerrainFeature[] {
    const features: TerrainFeature[] = [];
    const visited = new Set<string>();

    // Scan grid around center
    for (let dy = -radius; dy <= radius; dy++) {
      for (let dx = -radius; dx <= radius; dx++) {
        const x = Math.floor(centerX + dx);
        const y = Math.floor(centerY + dy);
        const key = `${x},${y}`;

        if (visited.has(key)) continue;
        visited.add(key);

        const tile = getTileAt(x, y);
        if (!tile) continue;

        // Calculate TPI (Topographic Position Index)
        const tpi = this.calculateTPI(getTileAt, x, y);

        // Calculate slope
        const slope = this.calculateSlope(getTileAt, x, y);

        // Classify feature based on TPI and slope
        const feature = this.classifyTile(tile, x, y, tpi, slope);

        if (feature) {
          features.push(feature);
        }
      }
    }

    // Detect larger features (lakes, mountain ranges)
    const waterFeatures = this.detectWaterBodies(getTileAt, centerX, centerY, radius);
    features.push(...waterFeatures);

    return features;
  }

  /**
   * Calculate Topographic Position Index (TPI).
   *
   * TPI = elevation - mean(neighborhood elevations)
   *
   * Based on: https://www.opengeomatics.ca/raster-analysis-and-terrain-modelling.html
   *
   * @param getTileAt Tile accessor function
   * @param x Center X
   * @param y Center Y
   * @param neighborhoodRadius Radius for neighborhood (default 3)
   * @returns TPI value (positive = higher than surroundings, negative = lower)
   */
  private calculateTPI(
    getTileAt: (x: number, y: number) => Tile | undefined,
    x: number,
    y: number,
    neighborhoodRadius: number = 3
  ): number {
    const centerTile = getTileAt(x, y);
    if (!centerTile) return 0;

    const centerElevation = (centerTile as any).elevation ?? 0;

    // Calculate mean elevation of neighborhood
    let sum = 0;
    let count = 0;

    for (let dy = -neighborhoodRadius; dy <= neighborhoodRadius; dy++) {
      for (let dx = -neighborhoodRadius; dx <= neighborhoodRadius; dx++) {
        if (dx === 0 && dy === 0) continue; // Skip center

        const neighbor = getTileAt(x + dx, y + dy);
        if (neighbor) {
          sum += (neighbor as any).elevation ?? 0;
          count++;
        }
      }
    }

    if (count === 0) return 0;

    const meanElevation = sum / count;
    return centerElevation - meanElevation;
  }

  /**
   * Calculate slope in degrees.
   *
   * Based on elevation gradient: slope = arctan(√(dz/dx² + dz/dy²))
   *
   * Reference: US Army FM 3-25.26 - Cliff defined as slope > 30°
   * https://rdl.train.army.mil/catalog-ws/view/100.atsc/0e47612a-f13b-4be2-aa41-3e886a40b88c-1335953260245/report.pdf
   *
   * @param getTileAt Tile accessor function
   * @param x Center X
   * @param y Center Y
   * @returns Slope in degrees (0-90)
   */
  private calculateSlope(
    getTileAt: (x: number, y: number) => Tile | undefined,
    x: number,
    y: number
  ): number {
    const center = getTileAt(x, y);
    if (!center) return 0;

    const centerElevation = (center as any).elevation ?? 0;

    // Get neighbors for gradient calculation
    const east = getTileAt(x + 1, y);
    const west = getTileAt(x - 1, y);
    const north = getTileAt(x, y - 1);
    const south = getTileAt(x, y + 1);

    const eastElev = east ? ((east as any).elevation ?? 0) : centerElevation;
    const westElev = west ? ((west as any).elevation ?? 0) : centerElevation;
    const northElev = north ? ((north as any).elevation ?? 0) : centerElevation;
    const southElev = south ? ((south as any).elevation ?? 0) : centerElevation;

    // Calculate gradients
    const dzdx = (eastElev - westElev) / 2;
    const dzdy = (southElev - northElev) / 2;

    // Slope magnitude
    const slopeMagnitude = Math.sqrt(dzdx * dzdx + dzdy * dzdy);

    // Convert to degrees
    return Math.atan(slopeMagnitude) * (180 / Math.PI);
  }

  /**
   * Classify tile based on TPI and slope.
   *
   * Classification based on geomorphometry research:
   * - https://www.tandfonline.com/doi/full/10.1080/10106049.2024.2351904
   * - https://www.opengeomatics.ca/raster-analysis-and-terrain-modelling.html
   *
   * @param tile The tile to classify
   * @param x Tile X coordinate
   * @param y Tile Y coordinate
   * @param tpi Topographic Position Index
   * @param slope Slope in degrees
   * @returns Detected feature or null
   */
  private classifyTile(
    tile: Tile,
    x: number,
    y: number,
    tpi: number,
    slope: number
  ): TerrainFeature | null {
    const elevation = (tile as any).elevation ?? 0;

    // Cliff: Only very steep slopes (> 40°) to avoid reporting every steep tile
    if (slope > 40 && Math.abs(tpi) > 3) {
      return {
        type: 'cliff',
        x,
        y,
        elevation,
        slope,
        tpi,
        size: 10, // Estimated cluster size
        description: `Cliff (${slope.toFixed(0)}°)`,
      };
    }

    // Peak: Only prominent peaks (high TPI + significant elevation)
    if (tpi > 5 && elevation > 10) {
      return {
        type: 'peak',
        x,
        y,
        elevation,
        slope,
        tpi,
        size: 15, // Estimated cluster size
        description: `Peak (elev ${elevation.toFixed(0)})`,
      };
    }

    // Ridge: Only significant ridges
    if (tpi > 4 && slope > 15 && slope < 40 && elevation > 8) {
      return {
        type: 'ridge',
        x,
        y,
        elevation,
        slope,
        tpi,
        size: 12, // Estimated cluster size
        description: `Ridge (elev ${elevation.toFixed(0)})`,
      };
    }

    // Valley: Only deep valleys
    if (tpi < -4 && elevation < 5) {
      return {
        type: 'valley',
        x,
        y,
        elevation,
        slope,
        tpi,
        size: 12, // Estimated cluster size
        description: `Valley (elev ${elevation.toFixed(0)})`,
      };
    }

    // Don't detect plains/plateaus - they're not significant enough to mention
    // Only detect notable terrain features (peaks, cliffs, lakes, ridges, valleys)

    // Don't detect beaches or hillsides - not significant enough
    // Only report truly notable terrain features

    return null;
  }

  /**
   * Detect water bodies using connected component analysis.
   *
   * Based on flood-fill algorithm to find connected water tiles.
   *
   * @param getTileAt Tile accessor function
   * @param centerX Center X
   * @param centerY Center Y
   * @param radius Search radius
   * @returns Array of detected water features
   */
  private detectWaterBodies(
    getTileAt: (x: number, y: number) => Tile | undefined,
    centerX: number,
    centerY: number,
    radius: number
  ): TerrainFeature[] {
    const features: TerrainFeature[] = [];
    const visited = new Set<string>();

    for (let dy = -radius; dy <= radius; dy++) {
      for (let dx = -radius; dx <= radius; dx++) {
        const x = Math.floor(centerX + dx);
        const y = Math.floor(centerY + dy);
        const key = `${x},${y}`;

        if (visited.has(key)) continue;

        const tile = getTileAt(x, y);
        if (!tile || tile.terrain !== 'water') continue;

        // Flood fill to find connected water body
        const waterTiles = this.floodFill(getTileAt, x, y, visited);

        if (waterTiles.length === 0) continue;

        // Calculate center of water body
        const sumX = waterTiles.reduce((sum, t) => sum + t.x, 0);
        const sumY = waterTiles.reduce((sum, t) => sum + t.y, 0);
        const avgX = Math.floor(sumX / waterTiles.length);
        const avgY = Math.floor(sumY / waterTiles.length);

        // Classify by size
        const size = waterTiles.length;
        const type: TerrainFeatureType = size < 10 ? 'pond' : 'lake';
        const description = size < 10
          ? `Small pond (${size} tiles)`
          : `Lake (${size} tiles)`;

        features.push({
          type,
          x: avgX,
          y: avgY,
          elevation: -1,
          size: Math.sqrt(size),
          description,
        });
      }
    }

    return features;
  }

  /**
   * Flood fill to find connected water tiles.
   */
  private floodFill(
    getTileAt: (x: number, y: number) => Tile | undefined,
    startX: number,
    startY: number,
    visited: Set<string>
  ): Array<{ x: number; y: number }> {
    const result: Array<{ x: number; y: number }> = [];
    const queue: Array<{ x: number; y: number }> = [{ x: startX, y: startY }];

    while (queue.length > 0) {
      const { x, y } = queue.shift()!;
      const key = `${x},${y}`;

      if (visited.has(key)) continue;
      visited.add(key);

      const tile = getTileAt(x, y);
      if (!tile || tile.terrain !== 'water') continue;

      result.push({ x, y });

      // Add 4-connected neighbors
      queue.push({ x: x + 1, y });
      queue.push({ x: x - 1, y });
      queue.push({ x, y: y + 1 });
      queue.push({ x, y: y - 1 });
    }

    return result;
  }

  /**
   * Generate natural language description of nearby terrain features.
   *
   * Provides spatial context for LLM agents (e.g., "cliff to the north", "lake 50 tiles east").
   *
   * @param features Detected features
   * @param observerX Observer X position
   * @param observerY Observer Y position
   * @param maxDistance Only describe features within this distance
   * @returns Natural language description
   */
  describeNearby(
    features: TerrainFeature[],
    observerX: number,
    observerY: number,
    maxDistance: number = 20
  ): string {
    // Filter to nearby features
    const nearby = features
      .map(f => {
        const dx = f.x - observerX;
        const dy = f.y - observerY;
        const distance = Math.sqrt(dx * dx + dy * dy);

        // Get cardinal direction
        const angle = Math.atan2(dy, dx) * (180 / Math.PI);
        let direction: string;
        if (angle > -45 && angle <= 45) direction = 'east';
        else if (angle > 45 && angle <= 135) direction = 'south';
        else if (angle > 135 || angle <= -135) direction = 'west';
        else direction = 'north';

        return { ...f, distance, direction };
      })
      .filter(f => f.distance <= maxDistance)
      .sort((a, b) => a.distance - b.distance);

    if (nearby.length === 0) {
      return 'You are in unremarkable terrain.';
    }

    // Build description - keep it concise!
    const descriptions: string[] = [];

    // Describe only the most significant immediate features (< 10 tiles, max 3)
    const immediate = nearby
      .filter(f => f.distance && f.distance < 10)
      .slice(0, 3); // Only top 3 closest significant features

    if (immediate.length > 0) {
      const immediateDesc = immediate.map(f => f.description).join(', ');
      descriptions.push(`Nearby: ${immediateDesc}.`);
    }

    // Describe distant features by direction (max 2 per direction)
    const byDirection = new Map<string, TerrainFeature[]>();
    nearby
      .filter(f => f.distance && f.distance >= 10)
      .forEach(f => {
        if (!byDirection.has(f.direction!)) {
          byDirection.set(f.direction!, []);
        }
        byDirection.get(f.direction!)!.push(f);
      });

    // Limit to 2 most significant features per direction
    Array.from(byDirection.entries())
      .slice(0, 4) // Max 4 directions
      .forEach(([direction, feats]) => {
        const topFeats = feats.slice(0, 2); // Max 2 features per direction
        const featDesc = topFeats.map(f => `${f.description}`).join(', ');
        descriptions.push(`To the ${direction}: ${featDesc}.`);
      });

    return descriptions.join(' ');
  }
}

/**
 * Global terrain feature analyzer instance.
 */
export const globalTerrainAnalyzer = new TerrainFeatureAnalyzer();
