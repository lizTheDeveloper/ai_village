/**
 * AerialFengShuiAnalyzer - 3D Feng Shui for Flying Creatures
 *
 * Flying entities experience chi flow in three dimensions:
 * - Thermals: Rising warm air from sun-heated surfaces carries chi upward
 * - Wind Corridors: Gaps between buildings channel air flow (chi highways)
 * - Aerial Sha Qi: Tall spires and narrow gaps create killing breath at altitude
 * - Perching Spots: 3D commanding positions with approach vectors
 * - Volumetric Elements: Element balance varies by altitude
 *
 * Traditional Feng Shui principles adapted for flight:
 * - Dragon Veins become thermal columns and wind rivers
 * - Sha Qi from straight lines becomes dangerous flight corridors
 * - Commanding Position requires 3D sightlines and escape routes
 * - Element balance considers what's below, beside, and above
 */

import type { World } from '../ecs/World.js';
import type { PositionComponent } from '../components/PositionComponent.js';
import type { BuildingComponent } from '../components/BuildingComponent.js';
import {
  type AerialHarmonyComponent,
  type ThermalZone,
  type WindCorridor,
  type AerialShaQi,
  type PerchingSpot,
  type VolumetricElementBalance,
  type AerialHarmonyIssue,
  type AerialPosition,
  type ElementDistribution,
  createAerialHarmonyComponent,
} from '../components/AerialHarmonyComponent.js';
import { DefaultZLevel } from '../components/PositionComponent.js';

// ============================================================================
// Types
// ============================================================================

/** Building data for analysis */
interface BuildingData {
  id: string;
  x: number;
  y: number;
  type: string;
  height: number; // Estimated height in z-levels
  providesHeat: boolean;
  heatAmount: number;
}

/** Area bounds for analysis */
interface AreaBounds {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

// ============================================================================
// Building Height Estimates
// ============================================================================

/** Estimated heights (in z-levels) for building types */
const BUILDING_HEIGHTS: Record<string, number> = {
  // Tall structures
  'watchtower': 8,
  'archive': 5,
  'town-hall': 4,
  'temple': 6,
  'windmill': 5,

  // Medium structures
  'barn': 3,
  'stable': 3,
  'workshop': 3,
  'library': 4,
  'meeting-hall': 3,
  'warehouse': 3,
  'health-clinic': 3,

  // Low structures
  'tent': 1,
  'lean-to': 1,
  'campfire': 0,
  'well': 1,
  'workbench': 1,
  'storage-chest': 1,
  'storage-box': 1,
  'farm_shed': 2,
  'market_stall': 2,
  'forge': 2,
  'chicken-coop': 2,
  'kennel': 2,
  'apiary': 2,
  'aquarium': 1,
};

/** Default height for unknown buildings */
const DEFAULT_BUILDING_HEIGHT = 2;

/** Buildings that generate thermals */
const THERMAL_SOURCES: Record<string, { strength: number; radius: number }> = {
  'campfire': { strength: 60, radius: 3 },
  'forge': { strength: 80, radius: 4 },
  'hearth': { strength: 50, radius: 3 },
  'kiln': { strength: 70, radius: 3 },
  // Stone/dark surfaces in sunlight
  'warehouse': { strength: 30, radius: 5 },
  'town-hall': { strength: 25, radius: 4 },
};

/** Building element associations */
const BUILDING_ELEMENTS: Record<string, keyof ElementDistribution> = {
  // Wood element
  'lean-to': 'wood',
  'farm_shed': 'wood',
  'barn': 'wood',
  'library': 'wood',
  'apiary': 'wood',

  // Fire element
  'campfire': 'fire',
  'forge': 'fire',
  'temple': 'fire',
  'town-hall': 'fire',

  // Earth element
  'well': 'earth',
  'warehouse': 'earth',
  'storage-chest': 'earth',
  'storage-box': 'earth',

  // Metal element
  'workshop': 'metal',
  'watchtower': 'metal',
  'workbench': 'metal',

  // Water element
  'market_stall': 'water',
  'aquarium': 'water',
};

// ============================================================================
// Main Analyzer Class
// ============================================================================

export class AerialFengShuiAnalyzer {
  /**
   * Analyze aerial harmony for a region.
   */
  analyze(
    world: World,
    bounds: AreaBounds,
    currentTick: number,
    analyzedBy?: string
  ): AerialHarmonyComponent {
    const issues: AerialHarmonyIssue[] = [];

    // Gather building data in the area
    const buildings = this.gatherBuildings(world, bounds);

    // 1. Thermal Analysis
    const thermals = this.analyzeThermals(buildings, issues);

    // 2. Wind Corridor Analysis
    const windCorridors = this.analyzeWindCorridors(buildings, bounds, issues);

    // 3. Aerial Sha Qi Detection
    const aerialShaQi = this.analyzeAerialShaQi(buildings, bounds, issues);

    // 4. Perching Spot Analysis
    const perchingSpots = this.analyzePerchingSpots(buildings, issues);

    // 5. Volumetric Element Balance
    const elementBalance = this.analyzeElementBalance(buildings, bounds, issues);

    // 6. Determine optimal flight altitude
    const optimalFlightAltitude = this.calculateOptimalAltitude(
      buildings,
      thermals,
      aerialShaQi
    );

    // 7. Generate recommended flight paths
    const recommendedPaths = this.generateRecommendedPaths(
      bounds,
      thermals,
      windCorridors,
      aerialShaQi,
      optimalFlightAltitude
    );

    // Calculate overall score
    const harmonyScore = this.calculateHarmonyScore(
      thermals,
      windCorridors,
      aerialShaQi,
      perchingSpots,
      elementBalance
    );

    const areaBounds = {
      minX: bounds.minX,
      maxX: bounds.maxX,
      minY: bounds.minY,
      maxY: bounds.maxY,
      minZ: 0,
      maxZ: 15,
    };

    return createAerialHarmonyComponent(
      harmonyScore,
      thermals,
      windCorridors,
      aerialShaQi,
      perchingSpots,
      elementBalance,
      issues,
      optimalFlightAltitude,
      recommendedPaths,
      areaBounds,
      currentTick,
      analyzedBy
    );
  }

  /**
   * Get a text summary of aerial harmony for an agent.
   */
  summarize(harmony: AerialHarmonyComponent, architectureSkill: number): string {
    const parts: string[] = [];

    if (architectureSkill >= 4) {
      // Full analysis
      parts.push(`Aerial Harmony: ${harmony.harmonyScore}/100 (${harmony.harmonyLevel})`);
      parts.push(`Optimal flight altitude: Z-${harmony.optimalFlightAltitude}`);

      if (harmony.thermals.length > 0) {
        parts.push(`Thermals: ${harmony.thermals.length} updraft zones detected`);
        for (const t of harmony.thermals.slice(0, 2)) {
          parts.push(`  - ${t.source} at (${t.center.x},${t.center.y}): ${t.strength}% uplift`);
        }
      }

      if (harmony.aerialShaQi.length > 0) {
        parts.push(`Danger zones: ${harmony.aerialShaQi.length} aerial Sha Qi corridors`);
        for (const s of harmony.aerialShaQi.slice(0, 2)) {
          parts.push(`  - ${s.cause} (severity ${s.severity})`);
        }
      }

      if (harmony.perchingSpots.length > 0) {
        const bestPerch = harmony.perchingSpots.reduce((a, b) =>
          a.commandingQuality > b.commandingQuality ? a : b
        );
        parts.push(`Best perch: ${bestPerch.description} (quality ${bestPerch.commandingQuality})`);
      }

      if (harmony.elementBalance.deficientElement) {
        parts.push(`Element note: ${harmony.elementBalance.deficientElement} is weak in this airspace`);
      }

    } else if (architectureSkill >= 3) {
      // Detailed but not complete
      parts.push(`Aerial Harmony: ${harmony.harmonyLevel}`);

      if (harmony.thermals.length > 0) {
        parts.push(`${harmony.thermals.length} thermal updrafts in the area`);
      }

      if (harmony.aerialShaQi.length > 0) {
        parts.push(`Warning: ${harmony.aerialShaQi.length} dangerous flight paths detected`);
      }

      const safeCorridors = harmony.windCorridors.filter(c => c.isSafe).length;
      if (safeCorridors > 0) {
        parts.push(`${safeCorridors} safe wind corridors for flight`);
      }

      if (harmony.perchingSpots.length > 0) {
        parts.push(`${harmony.perchingSpots.length} quality perching spots nearby`);
      }

    } else if (architectureSkill >= 2) {
      // Vague sensations
      if (harmony.harmonyLevel === 'sublime') {
        parts.push('The air here feels wonderfully buoyant and welcoming');
      } else if (harmony.harmonyLevel === 'favorable') {
        parts.push('The currents feel pleasant, good for soaring');
      } else if (harmony.harmonyLevel === 'calm') {
        parts.push('The air is unremarkable, neither good nor bad');
      } else if (harmony.harmonyLevel === 'turbulent') {
        parts.push('Something feels off about the airflow here');
      } else {
        parts.push('The air feels dangerous, the currents are wrong');
      }

      if (harmony.thermals.length > 0) {
        parts.push('You sense warm air rising nearby');
      }

      if (harmony.aerialShaQi.length > 0) {
        parts.push('Some flight paths feel threatening');
      }
    }

    return parts.join('\n');
  }

  // ============================================================================
  // Building Data Gathering
  // ============================================================================

  private gatherBuildings(world: World, bounds: AreaBounds): BuildingData[] {
    const buildings: BuildingData[] = [];

    // Use query API to get buildings
    const buildingEntities = world.query()
      .with('building')
      .with('position')
      .executeEntities();

    for (const entity of buildingEntities) {
      const pos = entity.components.get('position') as PositionComponent | undefined;
      const building = entity.components.get('building') as BuildingComponent | undefined;

      if (!pos || !building || !building.isComplete) continue;

      // Check bounds
      if (pos.x < bounds.minX || pos.x > bounds.maxX ||
          pos.y < bounds.minY || pos.y > bounds.maxY) continue;

      const height = BUILDING_HEIGHTS[building.buildingType] ?? DEFAULT_BUILDING_HEIGHT;

      buildings.push({
        id: entity.id,
        x: pos.x,
        y: pos.y,
        type: building.buildingType,
        height,
        providesHeat: building.providesHeat ?? false,
        heatAmount: building.heatAmount ?? 0,
      });
    }

    return buildings;
  }

  // ============================================================================
  // Thermal Analysis
  // ============================================================================

  private analyzeThermals(
    buildings: BuildingData[],
    issues: AerialHarmonyIssue[]
  ): ThermalZone[] {
    const thermals: ThermalZone[] = [];

    for (const building of buildings) {
      // Check explicit heat sources
      if (building.providesHeat && building.heatAmount > 0) {
        const strength = Math.min(100, building.heatAmount * 5);
        thermals.push({
          center: { x: building.x, y: building.y, z: building.height },
          radius: 3 + Math.floor(building.heatAmount / 5),
          strength,
          source: building.type,
          minZ: building.height,
          maxZ: building.height + 10,
        });
      }

      // Check thermal source definitions
      const thermalDef = THERMAL_SOURCES[building.type];
      if (thermalDef && !building.providesHeat) {
        thermals.push({
          center: { x: building.x, y: building.y, z: building.height },
          radius: thermalDef.radius,
          strength: thermalDef.strength,
          source: building.type,
          minZ: building.height,
          maxZ: building.height + 8,
        });
      }
    }

    if (thermals.length === 0) {
      issues.push({
        principle: 'thermal_flow',
        issue: 'No thermal updrafts in area',
        suggestion: 'Forges, campfires, and large stone structures create beneficial thermals',
      });
    }

    return thermals;
  }

  // ============================================================================
  // Wind Corridor Analysis
  // ============================================================================

  private analyzeWindCorridors(
    buildings: BuildingData[],
    _bounds: AreaBounds,
    issues: AerialHarmonyIssue[]
  ): WindCorridor[] {
    const corridors: WindCorridor[] = [];

    // Find gaps between tall buildings
    const tallBuildings = buildings.filter(b => b.height >= 3);

    for (let i = 0; i < tallBuildings.length; i++) {
      for (let j = i + 1; j < tallBuildings.length; j++) {
        const a = tallBuildings[i];
        const b = tallBuildings[j];
        if (!a || !b) continue;

        const dx = b.x - a.x;
        const dy = b.y - a.y;
        // PERFORMANCE: Use squared distance for comparison
        const distanceSquared = dx * dx + dy * dy;

        // Check for narrow gaps that create wind tunnels (2 <= distance <= 8)
        if (distanceSquared >= 4 && distanceSquared <= 64) { // 2^2 and 8^2
          const distance = Math.sqrt(distanceSquared);
          const width = distance;
          const avgHeight = (a.height + b.height) / 2;

          // Narrow gaps are dangerous, wider ones are safe highways
          const isSafe = width >= 4;
          const riskLevel = isSafe ? 0 : Math.floor(100 - width * 15);

          corridors.push({
            start: { x: a.x, y: a.y, z: avgHeight },
            end: { x: b.x, y: b.y, z: avgHeight },
            width,
            isSafe,
            riskLevel,
            description: isSafe
              ? `Safe wind highway between ${a.type} and ${b.type}`
              : `Dangerous wind tunnel between ${a.type} and ${b.type}`,
          });

          if (!isSafe) {
            issues.push({
              principle: 'wind_corridor',
              issue: `Narrow wind tunnel (${width.toFixed(1)} tiles) creates turbulence`,
              suggestion: 'Avoid flying between these structures at their height',
              location: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, z: avgHeight },
            });
          }
        }
      }
    }

    return corridors;
  }

  // ============================================================================
  // Aerial Sha Qi Detection
  // ============================================================================

  private analyzeAerialShaQi(
    buildings: BuildingData[],
    _bounds: AreaBounds,
    issues: AerialHarmonyIssue[]
  ): AerialShaQi[] {
    const shaQi: AerialShaQi[] = [];

    // Find tall pointed structures (watchtowers, temples, etc.)
    const tallStructures = buildings.filter(b => b.height >= 4);

    // Check for straight-line alignments of tall structures
    for (let i = 0; i < tallStructures.length; i++) {
      for (let j = i + 1; j < tallStructures.length; j++) {
        const a = tallStructures[i];
        const b = tallStructures[j];
        if (!a || !b) continue;

        const dx = b.x - a.x;
        const dy = b.y - a.y;
        // PERFORMANCE: Use squared distance for comparison
        const distanceSquared = dx * dx + dy * dy;

        // Straight line between tall structures at their level creates Sha Qi (5 <= distance <= 20)
        if (distanceSquared >= 25 && distanceSquared <= 400) { // 5^2 and 20^2
          const distance = Math.sqrt(distanceSquared);
          // Check if line is mostly straight (not diagonal avoidance)
          const isAligned = Math.abs(dx) < 2 || Math.abs(dy) < 2;

          if (isAligned) {
            const minHeight = Math.min(a.height, b.height);
            const maxHeight = Math.max(a.height, b.height);

            shaQi.push({
              from: { x: a.x, y: a.y, z: minHeight },
              to: { x: b.x, y: b.y, z: minHeight },
              severity: Math.min(100, 50 + (maxHeight - minHeight) * 10),
              cause: `Killing breath between ${a.type} and ${b.type}`,
              affectedAltitudes: Array.from(
                { length: maxHeight - minHeight + 1 },
                (_, k) => minHeight + k
              ),
            });

            issues.push({
              principle: 'aerial_sha_qi',
              issue: `Straight-line Sha Qi between ${a.type} and ${b.type}`,
              suggestion: 'Fly above or around this alignment, not through it',
              location: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, z: maxHeight },
            });
          }
        }
      }
    }

    // Single tall spires create vertical Sha Qi
    for (const building of buildings) {
      if (building.height >= 6) {
        shaQi.push({
          from: { x: building.x, y: building.y, z: 0 },
          to: { x: building.x, y: building.y, z: building.height + 5 },
          severity: 40 + building.height * 5,
          cause: `Vertical Sha Qi from ${building.type} spire`,
          affectedAltitudes: Array.from({ length: building.height + 5 }, (_, k) => k),
        });
      }
    }

    return shaQi;
  }

  // ============================================================================
  // Perching Spot Analysis
  // ============================================================================

  private analyzePerchingSpots(
    buildings: BuildingData[],
    issues: AerialHarmonyIssue[]
  ): PerchingSpot[] {
    const spots: PerchingSpot[] = [];

    for (const building of buildings) {
      // Only buildings tall enough to perch on
      if (building.height < 2) continue;

      // Calculate commanding position quality
      const hasGoodHeight = building.height >= 3;
      const hasThreatVisibility = building.height >= 4; // Can see far

      // Count nearby buildings for approach vector analysis
      const nearbyCount = buildings.filter(b => {
        if (b.id === building.id) return false;
        const dx = b.x - building.x;
        const dy = b.y - building.y;
        // PERFORMANCE: Use squared distance for comparison
        const distSquared = dx * dx + dy * dy;
        return distSquared < 25; // 5^2
      }).length;

      // More open = more approach vectors = better
      const approachVectors = Math.max(1, 8 - nearbyCount);
      const hasBackingProtection = nearbyCount >= 1; // At least one side protected

      // Calculate quality score
      let quality = 50;
      if (hasGoodHeight) quality += 15;
      if (hasThreatVisibility) quality += 15;
      quality += approachVectors * 3;
      if (hasBackingProtection) quality += 10;
      quality = Math.min(100, quality);

      const perchType = this.getPerchType(building.type);

      spots.push({
        position: { x: building.x, y: building.y, z: building.height },
        providedBy: building.id,
        perchType,
        commandingQuality: quality,
        approachVectors,
        hasThreatVisibility,
        hasBackingProtection,
        description: `${perchType} on ${building.type} (Z-${building.height})`,
      });
    }

    // Sort by quality
    spots.sort((a, b) => b.commandingQuality - a.commandingQuality);

    if (spots.length === 0) {
      issues.push({
        principle: 'perching',
        issue: 'No suitable perching spots in area',
        suggestion: 'Build taller structures to provide commanding perches',
      });
    } else if (spots.every(s => s.commandingQuality < 60)) {
      issues.push({
        principle: 'perching',
        issue: 'All perching spots have poor commanding position',
        suggestion: 'Add a watchtower or tall structure with open sightlines',
      });
    }

    return spots;
  }

  private getPerchType(buildingType: string): string {
    switch (buildingType) {
      case 'watchtower': return 'Tower ledge';
      case 'barn': case 'stable': return 'Rooftop';
      case 'temple': return 'Spire perch';
      case 'windmill': return 'Blade platform';
      case 'town-hall': return 'Civic rooftop';
      default: return 'Rooftop';
    }
  }

  // ============================================================================
  // Volumetric Element Balance
  // ============================================================================

  private analyzeElementBalance(
    buildings: BuildingData[],
    _bounds: AreaBounds,
    issues: AerialHarmonyIssue[]
  ): VolumetricElementBalance {
    const balance: VolumetricElementBalance = {
      byAltitude: {
        ground: { wood: 0, fire: 0, earth: 0, metal: 0, water: 0 },
        canopy: { wood: 0, fire: 0, earth: 0, metal: 0, water: 0 },
        flying: { wood: 0, fire: 0, earth: 0, metal: 0, water: 0 },
        high: { wood: 0, fire: 0, earth: 0, metal: 0, water: 0 },
      },
      isBalanced: true,
      dominantElement: 'none',
    };

    // Count elements by building height
    for (const building of buildings) {
      const element = BUILDING_ELEMENTS[building.type] || 'earth';

      // Contribute to appropriate altitude levels
      if (building.height <= 1) {
        balance.byAltitude.ground[element] += 2;
      }
      if (building.height >= 1 && building.height <= 4) {
        balance.byAltitude.canopy[element] += 2;
      }
      if (building.height >= 3 && building.height <= 8) {
        balance.byAltitude.flying[element] += 2;
      }
      if (building.height >= 6) {
        balance.byAltitude.high[element] += 2;
      }
    }

    // Analyze balance at flying altitude
    const flyingElements = balance.byAltitude.flying;
    const total = Object.values(flyingElements).reduce((a, b) => a + b, 0);

    if (total > 0) {
      const avg = total / 5;
      let maxEl = 'earth';
      let maxVal = 0;
      let minEl = 'earth';
      let minVal = Infinity;

      for (const [el, val] of Object.entries(flyingElements)) {
        if (val > maxVal) {
          maxVal = val;
          maxEl = el;
        }
        if (val < minVal) {
          minVal = val;
          minEl = el;
        }
      }

      balance.dominantElement = maxEl;

      if (minVal < avg * 0.3) {
        balance.deficientElement = minEl;
        balance.isBalanced = false;
        issues.push({
          principle: 'element_balance',
          issue: `${minEl} element is deficient at flying altitude`,
          suggestion: `Add ${this.getElementSuggestion(minEl as keyof ElementDistribution)} to improve aerial harmony`,
          altitude: DefaultZLevel.Flying,
        });
      }

      if (maxVal > avg * 2.5) {
        balance.isBalanced = false;
        issues.push({
          principle: 'element_balance',
          issue: `${maxEl} element is excessive at flying altitude`,
          suggestion: `The controlling element (${this.getControllingElement(maxEl)}) would help balance`,
          altitude: DefaultZLevel.Flying,
        });
      }
    }

    return balance;
  }

  private getElementSuggestion(element: keyof ElementDistribution): string {
    switch (element) {
      case 'wood': return 'tall wooden structures or tree groves';
      case 'fire': return 'a temple spire or forge with tall chimney';
      case 'earth': return 'a stone tower or granary';
      case 'metal': return 'a watchtower or workshop';
      case 'water': return 'a tall market or trading post';
    }
  }

  private getControllingElement(element: string): string {
    const controls: Record<string, string> = {
      wood: 'metal',
      fire: 'water',
      earth: 'wood',
      metal: 'fire',
      water: 'earth',
    };
    return controls[element] || 'earth';
  }

  // ============================================================================
  // Optimal Altitude Calculation
  // ============================================================================

  private calculateOptimalAltitude(
    buildings: BuildingData[],
    thermals: ThermalZone[],
    shaQi: AerialShaQi[]
  ): number {
    // Start at default flying altitude
    let optimal = DefaultZLevel.Flying;

    // Find max building height in area
    const maxBuildingHeight = buildings.reduce((max, b) => Math.max(max, b.height), 0);

    // Should fly at least 2 levels above tallest structure
    const minSafe = maxBuildingHeight + 2;

    // Check where thermals are strongest
    if (thermals.length > 0) {
      const avgThermalZ = thermals.reduce((sum, t) => sum + t.maxZ, 0) / thermals.length;
      optimal = Math.round(avgThermalZ);
    }

    // Avoid Sha Qi zones
    for (const s of shaQi) {
      if (optimal >= Math.min(...s.affectedAltitudes) &&
          optimal <= Math.max(...s.affectedAltitudes)) {
        // Move above Sha Qi
        optimal = Math.max(...s.affectedAltitudes) + 1;
      }
    }

    // Ensure at least minimum safe altitude
    optimal = Math.max(optimal, minSafe);

    // Cap at reasonable altitude
    return Math.min(optimal, 12);
  }

  // ============================================================================
  // Flight Path Generation
  // ============================================================================

  private generateRecommendedPaths(
    _bounds: AreaBounds,
    thermals: ThermalZone[],
    corridors: WindCorridor[],
    _shaQi: AerialShaQi[],
    optimalZ: number
  ): AerialPosition[][] {
    const paths: AerialPosition[][] = [];

    // Create a simple path connecting thermals (chi highways)
    if (thermals.length >= 2) {
      const thermalPath: AerialPosition[] = [];
      const sortedThermals = [...thermals].sort((a, b) => a.center.x - b.center.x);

      for (const thermal of sortedThermals) {
        thermalPath.push({
          x: thermal.center.x,
          y: thermal.center.y,
          z: optimalZ,
        });
      }

      paths.push(thermalPath);
    }

    // Add safe corridor paths
    const safeCorridors = corridors.filter(c => c.isSafe);
    for (const corridor of safeCorridors.slice(0, 3)) {
      paths.push([
        { ...corridor.start, z: optimalZ },
        { ...corridor.end, z: optimalZ },
      ]);
    }

    return paths;
  }

  // ============================================================================
  // Harmony Score Calculation
  // ============================================================================

  private calculateHarmonyScore(
    thermals: ThermalZone[],
    windCorridors: WindCorridor[],
    aerialShaQi: AerialShaQi[],
    perchingSpots: PerchingSpot[],
    elementBalance: VolumetricElementBalance
  ): number {
    let score = 50; // Start neutral

    // Thermals boost score (up to +20)
    const thermalBonus = Math.min(20, thermals.length * 5);
    score += thermalBonus;

    // Safe corridors boost, dangerous ones penalize (up to +/-15)
    const safeCorridors = windCorridors.filter(c => c.isSafe).length;
    const dangerousCorridors = windCorridors.filter(c => !c.isSafe).length;
    score += Math.min(10, safeCorridors * 2);
    score -= Math.min(15, dangerousCorridors * 3);

    // Sha Qi penalizes heavily (up to -25)
    const shaQiPenalty = Math.min(25, aerialShaQi.reduce((sum, s) => sum + s.severity / 10, 0));
    score -= shaQiPenalty;

    // Good perching spots boost (up to +15)
    const goodPerches = perchingSpots.filter(p => p.commandingQuality >= 70).length;
    score += Math.min(15, goodPerches * 5);

    // Element balance affects score (up to +/-15)
    if (elementBalance.isBalanced) {
      score += 10;
    } else {
      score -= 10;
    }

    return Math.max(0, Math.min(100, Math.round(score)));
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

/** Shared aerial analyzer instance */
export const aerialFengShuiAnalyzer = new AerialFengShuiAnalyzer();
