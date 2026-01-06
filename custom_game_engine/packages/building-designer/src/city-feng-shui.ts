/**
 * City Feng Shui Analyzer
 *
 * Applies traditional urban Feng Shui principles to city layouts.
 * Urban Feng Shui (originally called Kanyu) predates building-level analysis
 * and focuses on city-scale chi flow, district harmony, and auspicious placement.
 *
 * Key Principles:
 * - Ming Tang (Bright Hall): Central open spaces gather beneficial chi
 * - Shan Shui (Mountain-Water): Protection behind, openness ahead
 * - Dragon Veins (Long Mai): Natural energy lines through the city
 * - Five Elements: Balance of district types and materials
 * - Sha Qi Avoidance: No long straight streets directing harmful energy
 *
 * References:
 * - "Harmonious spaces: the influence of Feng Shui on urban form and design" (2017)
 * - "Fengshui theory in urban landscape planning" (ResearchGate)
 * - "Integrating ancient Chinese feng shui philosophy with smart city technologies" (2025)
 */

import type {
  CityLayout,
  CityType,
  District,
  DistrictType,
  Street,
  Position,
} from './city-generator';
import { DISTRICT_AFFINITIES } from './city-generator';

// =============================================================================
// TYPES
// =============================================================================

/** City-level harmony analysis result */
export interface CityHarmonyAnalysis {
  /** Overall city harmony score (0-100) */
  harmonyScore: number;

  /** Harmony level category */
  harmonyLevel: CityHarmonyLevel;

  /** Ming Tang (central plaza) analysis */
  mingTang: MingTangAnalysis;

  /** Dragon vein (chi flow) analysis */
  dragonVeins: DragonVeinAnalysis;

  /** District relationship analysis */
  districtHarmony: DistrictHarmonyAnalysis;

  /** Five element balance at city scale */
  elementBalance: CityElementBalance;

  /** Sha Qi (killing breath) detection */
  shaQiPaths: ShaQiPath[];

  /** Gateway and entry analysis */
  gatewayAnalysis: GatewayAnalysis;

  /** Specific issues with suggestions */
  issues: CityHarmonyIssue[];

  /** Overall recommendations */
  recommendations: string[];
}

export type CityHarmonyLevel =
  | 'cursed'        // 0-20: Extremely poor chi, bad for inhabitants
  | 'troubled'      // 21-40: Significant problems
  | 'mundane'       // 41-60: Average, unremarkable
  | 'auspicious'    // 61-80: Good chi flow, prosperity likely
  | 'blessed';      // 81-100: Exceptional harmony, thriving city

/** Central plaza/square analysis (Ming Tang principle) */
export interface MingTangAnalysis {
  /** Whether a proper central gathering space exists */
  hasCenter: boolean;
  /** Position of the center if found */
  centerPosition?: Position;
  /** Size of central open space (in tiles) */
  centerSize: number;
  /** Shape quality (squares and rectangles are best) */
  shapeQuality: 'excellent' | 'good' | 'fair' | 'poor';
  /** Whether civic buildings properly frame the center */
  properlyFramed: boolean;
  /** Score contribution (0-20) */
  score: number;
}

/** Chi flow path analysis (Dragon Vein principle) */
export interface DragonVeinAnalysis {
  /** Primary chi channels through the city */
  primaryChannels: ChiChannel[];
  /** Whether chi can circulate (no dead ends blocking flow) */
  hasCirculation: boolean;
  /** Stagnation zones where chi pools unhealthily */
  stagnationZones: Position[];
  /** Score contribution (0-25) */
  score: number;
}

export interface ChiChannel {
  /** Path through the city */
  path: Position[];
  /** Strength of this channel (based on width and connectivity) */
  strength: number;
  /** Whether this is a beneficial or harmful channel */
  beneficial: boolean;
}

/** District relationship harmony */
export interface DistrictHarmonyAnalysis {
  /** Number of compatible adjacencies */
  compatiblePairs: number;
  /** Number of conflicting adjacencies */
  conflictingPairs: number;
  /** Specific conflicts */
  conflicts: DistrictConflict[];
  /** Score contribution (0-20) */
  score: number;
}

export interface DistrictConflict {
  district1: { type: DistrictType; position: Position };
  district2: { type: DistrictType; position: Position };
  severity: 'minor' | 'moderate' | 'severe';
}

/** The five feng shui elements */
export type FengShuiElement = 'wood' | 'fire' | 'earth' | 'metal' | 'water';

/** Five element balance at city level */
export interface CityElementBalance {
  wood: number;   // Agricultural, parks, wood buildings
  fire: number;   // Forges, hearths, civic energy
  earth: number;  // Storage, foundations, stability
  metal: number;  // Military, industry, structure
  water: number;  // Wells, waterways, commerce
  /** Most deficient element */
  deficient?: FengShuiElement;
  /** Most excessive element */
  excessive?: FengShuiElement;
  /** Score contribution (0-15) */
  score: number;
}

/** Harmful straight-line energy paths */
export interface ShaQiPath {
  /** Start and end of the harmful line */
  from: Position;
  to: Position;
  /** Length of the path (longer = more harmful) */
  length: number;
  /** What the path points at (building, gate, etc.) */
  target?: string;
  /** Severity of the sha qi */
  severity: 'minor' | 'moderate' | 'severe';
}

/** City entrance/gateway analysis */
export interface GatewayAnalysis {
  /** Number of entry points */
  entryCount: number;
  /** Whether entries are properly positioned */
  properlyPositioned: boolean;
  /** Whether entries have protective features */
  protected: boolean;
  /** Score contribution (0-10) */
  score: number;
}

/** Specific city harmony issue */
export interface CityHarmonyIssue {
  /** Category of the issue */
  principle: 'ming_tang' | 'dragon_vein' | 'district_harmony' | 'elements' | 'sha_qi' | 'gateway';
  /** Description of the issue */
  issue: string;
  /** Suggested remedy */
  suggestion: string;
  /** Location if applicable */
  location?: Position;
  /** Severity */
  severity: 'minor' | 'moderate' | 'severe';
}

// =============================================================================
// CONSTANTS
// =============================================================================

/** Map district types to elements */
const DISTRICT_ELEMENTS: Record<DistrictType, FengShuiElement> = {
  civic: 'fire',         // Central authority, energy, passion
  market: 'water',       // Flow of goods and money
  residential: 'earth',  // Stability, family, foundation
  industrial: 'metal',   // Transformation, strength
  research: 'wood',      // Growth, knowledge, learning
  agricultural: 'wood',  // Plants, growth, nature
  storage: 'earth',      // Preservation, stability
  military: 'metal',     // Weapons, discipline, structure
  slums: 'water',        // (Stagnant) Water collects at low points
  wealthy: 'fire',       // Prosperity energy
  // Dwarven districts
  mine: 'earth',         // Deep earth, stone extraction
  forge: 'fire',         // Heat, transformation
  greathall: 'earth',    // Gathering, foundation
  crafthall: 'metal',    // Skilled metalwork
  mushroom_farm: 'wood', // Fungal growth
  // Literary districts
  library: 'wood',       // Knowledge, growth of ideas
  margins: 'water',      // Flow between sections
  footnotes: 'earth',    // Foundation, support
  typo_void: 'water',    // Chaos, dissolution
  scriptorium: 'wood',   // Creation, growth
  // Crystalline districts
  resonance_chamber: 'metal',  // Vibration, structure
  prism_core: 'fire',          // Light, energy
  facet_housing: 'earth',      // Geometric stability
  refraction_lab: 'fire',      // Light manipulation
  // Hive districts
  brood_chamber: 'wood',       // Growth, life
  royal_cell: 'fire',          // Authority, energy
  worker_warren: 'earth',      // Labor, foundation
  nectar_store: 'earth',       // Storage, preservation
  pheromone_hub: 'water',      // Communication flow
  // Fungal districts
  mycelium_network: 'water',   // Underground flow
  spore_tower: 'wood',         // Growth, reproduction
  decomposition_pit: 'water',  // Dissolution, recycling
  fruiting_body: 'wood',       // Growth, emergence
  // Aquatic districts
  bubble_dome: 'metal',        // Protective structure
  kelp_forest: 'wood',         // Growth, oxygen
  pressure_lock: 'metal',      // Structural control
  current_channel: 'water',    // Flow, movement
  abyssal_shrine: 'water',     // Deep mystery
  // Temporal districts
  past_echo: 'earth',          // Memory, foundation
  present_anchor: 'earth',     // Stability, now
  future_shadow: 'wood',       // Potential, growth
  chrono_nexus: 'fire',        // Energy, transformation
  paradox_zone: 'water',       // Chaos, flux
  // Dream districts
  lucid_plaza: 'fire',         // Clarity, awareness
  nightmare_quarter: 'water',  // Subconscious, fear
  memory_palace: 'earth',      // Storage, stability
  impossible_stair: 'metal',   // Structure defied
  waking_edge: 'fire',         // Transition, awareness
  // Void districts
  gravity_anchor: 'earth',     // Stability in nothing
  star_dock: 'fire',           // Light, arrival
  void_garden: 'wood',         // Life in emptiness
  silence_temple: 'metal',     // Stillness, structure
  tether_station: 'metal',     // Connection, structure
  // Symbiotic districts
  heart_chamber: 'fire',       // Life force, energy
  neural_cluster: 'fire',      // Thought, energy
  digestion_tract: 'water',    // Processing, flow
  membrane_quarter: 'metal',   // Protection, boundary
  growth_bud: 'wood',          // New growth
  // Fractal districts
  seed_pattern: 'wood',        // Origin, potential
  iteration_ring: 'metal',     // Repetition, structure
  scale_bridge: 'water',       // Flow between scales
  infinity_edge: 'water',      // Endless flow
  // Musical districts
  harmony_hall: 'fire',        // Resonance, energy
  rhythm_quarter: 'earth',     // Beat, foundation
  melody_spire: 'wood',        // Rising, growth
  bass_foundation: 'earth',    // Deep, stable
  dissonance_pit: 'water',     // Chaos, dissolution
};

/** Minimum straight line length to create Sha Qi */
const SHA_QI_THRESHOLD = 8;

/** Ideal element balance (each should be ~20% for perfect balance) */
const IDEAL_ELEMENT_RATIO = 0.2;
const ELEMENT_TOLERANCE = 0.1; // 10-30% is acceptable

// =============================================================================
// MAIN ANALYZER CLASS
// =============================================================================

export class CityFengShuiAnalyzer {
  /**
   * Analyze a city layout for Feng Shui harmony.
   */
  analyze(layout: CityLayout, cityType: CityType): CityHarmonyAnalysis {
    const issues: CityHarmonyIssue[] = [];

    // Analyze each principle
    const mingTang = this.analyzeMingTang(layout, issues);
    const dragonVeins = this.analyzeDragonVeins(layout, issues);
    const districtHarmony = this.analyzeDistrictHarmony(layout, issues);
    const elementBalance = this.analyzeElementBalance(layout, issues);
    const shaQiPaths = this.detectShaQi(layout, issues);
    const gatewayAnalysis = this.analyzeGateways(layout, issues);

    // Calculate total score
    let harmonyScore = 0;
    harmonyScore += mingTang.score;           // Max 20
    harmonyScore += dragonVeins.score;        // Max 25
    harmonyScore += districtHarmony.score;    // Max 20
    harmonyScore += elementBalance.score;     // Max 15
    harmonyScore += gatewayAnalysis.score;    // Max 10
    // Sha Qi reduces score
    harmonyScore -= shaQiPaths.reduce((sum, s) =>
      sum + (s.severity === 'severe' ? 5 : s.severity === 'moderate' ? 3 : 1), 0);

    // Clamp score
    harmonyScore = Math.max(0, Math.min(100, harmonyScore));

    // Apply city type modifiers
    harmonyScore = this.applyCityTypeModifiers(harmonyScore, cityType, issues);

    const harmonyLevel = this.getHarmonyLevel(harmonyScore);
    const recommendations = this.generateRecommendations(issues, harmonyLevel);

    return {
      harmonyScore: Math.round(harmonyScore),
      harmonyLevel,
      mingTang,
      dragonVeins,
      districtHarmony,
      elementBalance,
      shaQiPaths,
      gatewayAnalysis,
      issues,
      recommendations,
    };
  }

  // ===========================================================================
  // Ming Tang Analysis (Central Space)
  // ===========================================================================

  private analyzeMingTang(layout: CityLayout, issues: CityHarmonyIssue[]): MingTangAnalysis {
    const centerX = Math.floor(layout.width / 2);
    const centerY = Math.floor(layout.height / 2);

    // Find the largest open space near the center
    const openSpace = this.findCentralOpenSpace(layout, centerX, centerY);

    let score = 0;
    let shapeQuality: MingTangAnalysis['shapeQuality'] = 'poor';

    if (openSpace.size > 0) {
      // Size scoring (larger central space = better)
      if (openSpace.size >= 64) score += 10;      // 8x8 or larger
      else if (openSpace.size >= 36) score += 7;  // 6x6 or larger
      else if (openSpace.size >= 16) score += 4;  // 4x4 or larger
      else score += 2;

      // Shape scoring
      const ratio = openSpace.width / openSpace.height;
      if (ratio >= 0.9 && ratio <= 1.1) {
        shapeQuality = 'excellent'; // Near-square
        score += 5;
      } else if (ratio >= 0.6 && ratio <= 1.67) {
        shapeQuality = 'good'; // Reasonable rectangle
        score += 3;
      } else if (ratio >= 0.4 && ratio <= 2.5) {
        shapeQuality = 'fair';
        score += 1;
      }

      // Framing scoring (civic buildings nearby)
      const civicNearCenter = layout.districts.filter(d =>
        d.type === 'civic' &&
        Math.abs(d.bounds.x + d.bounds.width / 2 - centerX) < layout.width / 4 &&
        Math.abs(d.bounds.y + d.bounds.height / 2 - centerY) < layout.height / 4
      );
      if (civicNearCenter.length > 0) {
        score += 5;
      }
    } else {
      issues.push({
        principle: 'ming_tang',
        issue: 'No central gathering space (Ming Tang) found',
        suggestion: 'Create a central plaza or square to gather beneficial chi',
        location: { x: centerX, y: centerY },
        severity: 'severe',
      });
    }

    return {
      hasCenter: openSpace.size > 0,
      centerPosition: openSpace.size > 0 ? { x: openSpace.x, y: openSpace.y } : undefined,
      centerSize: openSpace.size,
      shapeQuality,
      properlyFramed: score >= 15,
      score: Math.min(20, score),
    };
  }

  private findCentralOpenSpace(
    layout: CityLayout,
    centerX: number,
    centerY: number
  ): { x: number; y: number; width: number; height: number; size: number } {
    // Search for streets/open areas near center
    const searchRadius = Math.floor(Math.min(layout.width, layout.height) / 4);
    let bestSpace = { x: 0, y: 0, width: 0, height: 0, size: 0 };

    // Look for civic districts near center (they often have plazas)
    for (const district of layout.districts) {
      if (district.type === 'civic') {
        const dx = Math.abs(district.bounds.x + district.bounds.width / 2 - centerX);
        const dy = Math.abs(district.bounds.y + district.bounds.height / 2 - centerY);
        if (dx < searchRadius && dy < searchRadius) {
          const size = district.bounds.width * district.bounds.height;
          if (size > bestSpace.size) {
            bestSpace = { ...district.bounds, size };
          }
        }
      }
    }

    // Check for street intersections near center
    for (const street of layout.streets) {
      if (street.type === 'arterial') {
        for (const point of street.points) {
          const dx = Math.abs(point.x - centerX);
          const dy = Math.abs(point.y - centerY);
          if (dx < searchRadius && dy < searchRadius) {
            const size = street.width * street.width;
            if (size > bestSpace.size) {
              bestSpace = {
                x: point.x - street.width / 2,
                y: point.y - street.width / 2,
                width: street.width,
                height: street.width,
                size,
              };
            }
          }
        }
      }
    }

    return bestSpace;
  }

  // ===========================================================================
  // Dragon Vein Analysis (Chi Flow)
  // ===========================================================================

  private analyzeDragonVeins(layout: CityLayout, issues: CityHarmonyIssue[]): DragonVeinAnalysis {
    const primaryChannels: ChiChannel[] = [];
    const stagnationZones: Position[] = [];
    let score = 0;

    // Arterial streets are primary chi channels
    const arterials = layout.streets.filter(s => s.type === 'arterial');
    for (const street of arterials) {
      const beneficial = street.points.length < SHA_QI_THRESHOLD; // Short enough to not be Sha Qi
      primaryChannels.push({
        path: street.points,
        strength: street.width,
        beneficial,
      });
      if (beneficial) score += 3;
    }

    // Check for circulation (streets connecting)
    const hasCirculation = this.checkCirculation(layout);
    if (hasCirculation) {
      score += 10;
    } else {
      issues.push({
        principle: 'dragon_vein',
        issue: 'Chi cannot circulate through the city (dead ends or isolated areas)',
        suggestion: 'Add connecting streets or paths to allow chi to flow throughout',
        severity: 'moderate',
      });
    }

    // Find stagnation zones (areas far from any street)
    const stagnation = this.findStagnationZones(layout);
    stagnationZones.push(...stagnation);
    if (stagnation.length > 3) {
      issues.push({
        principle: 'dragon_vein',
        issue: `${stagnation.length} areas have stagnant chi (far from circulation paths)`,
        suggestion: 'Add alleys or pathways to bring chi to isolated areas',
        severity: stagnation.length > 6 ? 'severe' : 'moderate',
      });
    } else if (stagnation.length === 0) {
      score += 5;
    }

    return {
      primaryChannels,
      hasCirculation,
      stagnationZones,
      score: Math.min(25, score),
    };
  }

  private checkCirculation(layout: CityLayout): boolean {
    // Simple check: do we have streets in multiple directions?
    let hasHorizontal = false;
    let hasVertical = false;

    for (const street of layout.streets) {
      if (street.points.length >= 2) {
        const dx = Math.abs(street.points[1].x - street.points[0].x);
        const dy = Math.abs(street.points[1].y - street.points[0].y);
        if (dx > dy) hasHorizontal = true;
        else hasVertical = true;
      }
    }

    return hasHorizontal && hasVertical;
  }

  private findStagnationZones(layout: CityLayout): Position[] {
    // Sample the grid and find areas far from streets
    const zones: Position[] = [];
    const sampleStep = Math.max(4, Math.floor(layout.width / 20));

    for (let y = sampleStep; y < layout.height - sampleStep; y += sampleStep) {
      for (let x = sampleStep; x < layout.width - sampleStep; x += sampleStep) {
        let nearStreet = false;
        for (const street of layout.streets) {
          for (const point of street.points) {
            const dist = Math.abs(point.x - x) + Math.abs(point.y - y);
            if (dist < sampleStep * 2) {
              nearStreet = true;
              break;
            }
          }
          if (nearStreet) break;
        }
        if (!nearStreet) {
          zones.push({ x, y });
        }
      }
    }

    return zones;
  }

  // ===========================================================================
  // District Harmony Analysis
  // ===========================================================================

  private analyzeDistrictHarmony(
    layout: CityLayout,
    issues: CityHarmonyIssue[]
  ): DistrictHarmonyAnalysis {
    let compatiblePairs = 0;
    let conflictingPairs = 0;
    const conflicts: DistrictConflict[] = [];

    // Check each pair of adjacent districts
    for (let i = 0; i < layout.districts.length; i++) {
      for (let j = i + 1; j < layout.districts.length; j++) {
        const d1 = layout.districts[i];
        const d2 = layout.districts[j];

        if (this.areAdjacent(d1, d2)) {
          const affinity1 = DISTRICT_AFFINITIES[d1.type];
          const affinity2 = DISTRICT_AFFINITIES[d2.type];

          const d1AvoidD2 = affinity1.avoid.includes(d2.type);
          const d2AvoidD1 = affinity2.avoid.includes(d1.type);
          const d1PreferD2 = affinity1.prefer.includes(d2.type);
          const d2PreferD1 = affinity2.prefer.includes(d1.type);

          if (d1AvoidD2 || d2AvoidD1) {
            conflictingPairs++;
            const severity = (d1AvoidD2 && d2AvoidD1) ? 'severe' : 'moderate';
            conflicts.push({
              district1: { type: d1.type, position: { x: d1.bounds.x, y: d1.bounds.y } },
              district2: { type: d2.type, position: { x: d2.bounds.x, y: d2.bounds.y } },
              severity,
            });
          } else if (d1PreferD2 || d2PreferD1) {
            compatiblePairs++;
          }
        }
      }
    }

    // Add issues for severe conflicts
    for (const conflict of conflicts.filter(c => c.severity === 'severe')) {
      issues.push({
        principle: 'district_harmony',
        issue: `${conflict.district1.type} and ${conflict.district2.type} districts clash`,
        suggestion: `Add a buffer zone or relocate one district`,
        location: conflict.district1.position,
        severity: 'severe',
      });
    }

    // Score based on balance of compatible vs conflicting
    let score = 10; // Base score
    score += Math.min(10, compatiblePairs * 2);
    score -= conflictingPairs * 3;

    return {
      compatiblePairs,
      conflictingPairs,
      conflicts,
      score: Math.max(0, Math.min(20, score)),
    };
  }

  private areAdjacent(d1: District, d2: District): boolean {
    // Check if district bounds are adjacent (touching or within 2 tiles)
    const gap = 2;
    return !(
      d1.bounds.x + d1.bounds.width + gap < d2.bounds.x ||
      d2.bounds.x + d2.bounds.width + gap < d1.bounds.x ||
      d1.bounds.y + d1.bounds.height + gap < d2.bounds.y ||
      d2.bounds.y + d2.bounds.height + gap < d1.bounds.y
    );
  }

  // ===========================================================================
  // Element Balance Analysis
  // ===========================================================================

  private analyzeElementBalance(
    layout: CityLayout,
    issues: CityHarmonyIssue[]
  ): CityElementBalance {
    const balance: CityElementBalance = {
      wood: 0,
      fire: 0,
      earth: 0,
      metal: 0,
      water: 0,
      score: 0,
    };

    // Count area by district element
    let totalArea = 0;
    for (const district of layout.districts) {
      const area = district.bounds.width * district.bounds.height;
      const element = DISTRICT_ELEMENTS[district.type];
      balance[element] += area;
      totalArea += area;
    }

    // Normalize to percentages
    if (totalArea > 0) {
      balance.wood = balance.wood / totalArea;
      balance.fire = balance.fire / totalArea;
      balance.earth = balance.earth / totalArea;
      balance.metal = balance.metal / totalArea;
      balance.water = balance.water / totalArea;
    }

    // Find imbalances
    const elements: FengShuiElement[] = ['wood', 'fire', 'earth', 'metal', 'water'];
    let maxRatio = 0;
    let minRatio = 1;

    for (const el of elements) {
      const ratio = balance[el] as number;
      if (ratio > maxRatio) {
        maxRatio = ratio;
        balance.excessive = el;
      }
      if (ratio < minRatio) {
        minRatio = ratio;
        balance.deficient = el;
      }
    }

    // Score based on balance
    let score = 15;
    if (maxRatio > IDEAL_ELEMENT_RATIO + ELEMENT_TOLERANCE * 2) {
      score -= 5;
      issues.push({
        principle: 'elements',
        issue: `Excessive ${balance.excessive} element (${Math.round(maxRatio * 100)}%)`,
        suggestion: `Add more ${this.getControllingElement(balance.excessive!)} element districts to balance`,
        severity: 'moderate',
      });
    }
    if (minRatio < IDEAL_ELEMENT_RATIO - ELEMENT_TOLERANCE) {
      score -= 3;
      issues.push({
        principle: 'elements',
        issue: `Deficient ${balance.deficient} element (${Math.round(minRatio * 100)}%)`,
        suggestion: `Add ${balance.deficient} element features (${this.getElementSuggestion(balance.deficient!)})`,
        severity: 'minor',
      });
    }

    balance.score = Math.max(0, score);
    return balance;
  }

  private getControllingElement(element: keyof CityElementBalance): string {
    const controls: Record<string, string> = {
      wood: 'metal',
      fire: 'water',
      earth: 'wood',
      metal: 'fire',
      water: 'earth',
    };
    return controls[element];
  }

  private getElementSuggestion(element: keyof CityElementBalance): string {
    const suggestions: Record<string, string> = {
      wood: 'parks, libraries, farms',
      fire: 'civic buildings, forges, gathering spaces',
      earth: 'storage buildings, foundations, walls',
      metal: 'military structures, workshops',
      water: 'wells, fountains, markets',
    };
    return suggestions[element];
  }

  // ===========================================================================
  // Sha Qi Detection (Killing Breath)
  // ===========================================================================

  private detectShaQi(layout: CityLayout, issues: CityHarmonyIssue[]): ShaQiPath[] {
    const paths: ShaQiPath[] = [];

    // Check for long straight streets
    for (const street of layout.streets) {
      if (street.type === 'arterial' || street.type === 'collector') {
        // Calculate straight-line length
        const straightLength = this.getStraightLength(street.points);
        if (straightLength >= SHA_QI_THRESHOLD) {
          const severity = straightLength >= 15 ? 'severe' : straightLength >= 10 ? 'moderate' : 'minor';
          const from = street.points[0];
          const to = street.points[street.points.length - 1];

          paths.push({
            from,
            to,
            length: straightLength,
            severity,
          });

          if (severity !== 'minor') {
            issues.push({
              principle: 'sha_qi',
              issue: `Long straight street creates Sha Qi (${straightLength} tiles)`,
              suggestion: 'Add curves, trees, or monuments to break up the direct path',
              location: from,
              severity,
            });
          }
        }
      }
    }

    return paths;
  }

  private getStraightLength(points: Position[]): number {
    if (points.length < 2) return 0;

    // Check if all points are roughly in a line
    const dx = points[1].x - points[0].x;
    const dy = points[1].y - points[0].y;

    let straightCount = 0;
    for (let i = 1; i < points.length; i++) {
      const thisDx = points[i].x - points[i - 1].x;
      const thisDy = points[i].y - points[i - 1].y;

      // Same direction?
      if ((dx === 0 && thisDx === 0) || (dy === 0 && thisDy === 0)) {
        straightCount++;
      } else {
        break;
      }
    }

    return straightCount + 1;
  }

  // ===========================================================================
  // Gateway Analysis
  // ===========================================================================

  private analyzeGateways(layout: CityLayout, issues: CityHarmonyIssue[]): GatewayAnalysis {
    // Count streets that reach the edge (potential entry points)
    let entryCount = 0;
    const edgeStreets: Street[] = [];

    for (const street of layout.streets) {
      for (const point of street.points) {
        if (
          point.x <= 1 ||
          point.y <= 1 ||
          point.x >= layout.width - 2 ||
          point.y >= layout.height - 2
        ) {
          edgeStreets.push(street);
          entryCount++;
          break;
        }
      }
    }

    // Analyze entry positioning
    let properlyPositioned = true;
    let _protected = false;

    // Good positioning: entries on multiple sides, not all concentrated
    const sides = { north: 0, south: 0, east: 0, west: 0 };
    for (const street of edgeStreets) {
      const point = street.points.find(p =>
        p.x <= 1 || p.y <= 1 || p.x >= layout.width - 2 || p.y >= layout.height - 2
      );
      if (point) {
        if (point.y <= 1) sides.north++;
        if (point.y >= layout.height - 2) sides.south++;
        if (point.x <= 1) sides.west++;
        if (point.x >= layout.width - 2) sides.east++;
      }
    }

    const usedSides = Object.values(sides).filter(v => v > 0).length;
    if (usedSides < 2 && entryCount > 1) {
      properlyPositioned = false;
      issues.push({
        principle: 'gateway',
        issue: 'City entries are too concentrated on one side',
        suggestion: 'Distribute gates to multiple sides for balanced chi entry',
        severity: 'minor',
      });
    }

    // Check for protection (military near edges)
    _protected = layout.districts.some(d =>
      d.type === 'military' &&
      (d.bounds.x < layout.width / 4 ||
       d.bounds.x + d.bounds.width > layout.width * 3 / 4 ||
       d.bounds.y < layout.height / 4 ||
       d.bounds.y + d.bounds.height > layout.height * 3 / 4)
    );

    let score = 5; // Base
    if (entryCount >= 2 && entryCount <= 4) score += 3;
    if (properlyPositioned) score += 2;

    return {
      entryCount,
      properlyPositioned,
      protected: _protected,
      score: Math.min(10, score),
    };
  }

  // ===========================================================================
  // City Type Modifiers
  // ===========================================================================

  private applyCityTypeModifiers(
    score: number,
    cityType: CityType,
    issues: CityHarmonyIssue[]
  ): number {
    switch (cityType) {
      case 'grid':
        // Grid cities are prone to Sha Qi but good for circulation
        // Already handled in individual analyses
        break;

      case 'organic':
        // Organic cities naturally avoid Sha Qi
        score += 5;
        break;

      case 'flying':
        // Flying cities follow different principles (vertical chi)
        score *= 0.8; // Standard analysis less applicable
        issues.push({
          principle: 'dragon_vein',
          issue: 'Flying cities require vertical chi analysis',
          suggestion: 'Ensure thermal columns and flight paths allow chi to rise properly',
          severity: 'minor',
        });
        break;

      case 'non_euclidean':
        // Non-Euclidean geometry breaks most Feng Shui rules
        score *= 0.5; // Standard analysis barely applicable
        issues.push({
          principle: 'dragon_vein',
          issue: 'Non-Euclidean geometry disrupts normal chi patterns',
          suggestion: 'Accept the chaos or add stabilizing reality anchors',
          severity: 'moderate',
        });
        break;
    }

    return score;
  }

  // ===========================================================================
  // Results Processing
  // ===========================================================================

  private getHarmonyLevel(score: number): CityHarmonyLevel {
    if (score <= 20) return 'cursed';
    if (score <= 40) return 'troubled';
    if (score <= 60) return 'mundane';
    if (score <= 80) return 'auspicious';
    return 'blessed';
  }

  private generateRecommendations(
    issues: CityHarmonyIssue[],
    _level: CityHarmonyLevel
  ): string[] {
    const recommendations: string[] = [];

    // Prioritize severe issues
    const severeIssues = issues.filter(i => i.severity === 'severe');
    if (severeIssues.length > 0) {
      recommendations.push('URGENT: Address severe harmony issues first');
      for (const issue of severeIssues.slice(0, 3)) {
        recommendations.push(`• ${issue.suggestion}`);
      }
    }

    // Group by principle
    const principleCount: Record<string, number> = {};
    for (const issue of issues) {
      principleCount[issue.principle] = (principleCount[issue.principle] || 0) + 1;
    }

    // Most problematic principle
    const worstPrinciple = Object.entries(principleCount)
      .sort((a, b) => b[1] - a[1])[0];

    if (worstPrinciple && worstPrinciple[1] >= 2) {
      const princNames: Record<string, string> = {
        ming_tang: 'central plaza design',
        dragon_vein: 'chi circulation',
        district_harmony: 'district placement',
        elements: 'elemental balance',
        sha_qi: 'harmful straight paths',
        gateway: 'city entrances',
      };
      recommendations.push(
        `Focus on improving ${princNames[worstPrinciple[0]] || worstPrinciple[0]}`
      );
    }

    // General recommendations based on level
    if (issues.length === 0) {
      recommendations.push('This city has excellent Feng Shui harmony');
      recommendations.push('Inhabitants will likely prosper');
    }

    return recommendations;
  }

  // ===========================================================================
  // Utility Methods
  // ===========================================================================

  /**
   * Get a text summary of the analysis.
   */
  summarize(analysis: CityHarmonyAnalysis): string {
    const lines: string[] = [
      `City Feng Shui Analysis`,
      `━━━━━━━━━━━━━━━━━━━━━━`,
      `Harmony: ${analysis.harmonyScore}/100 (${analysis.harmonyLevel})`,
      ``,
      `Ming Tang (Center): ${analysis.mingTang.hasCenter ? `${analysis.mingTang.centerSize} tiles, ${analysis.mingTang.shapeQuality}` : 'None found'}`,
      `Dragon Veins: ${analysis.dragonVeins.primaryChannels.length} channels, ${analysis.dragonVeins.hasCirculation ? 'circulates' : 'blocked'}`,
      `Districts: ${analysis.districtHarmony.compatiblePairs} compatible, ${analysis.districtHarmony.conflictingPairs} conflicting`,
      `Elements: W${Math.round(analysis.elementBalance.wood * 100)}% F${Math.round(analysis.elementBalance.fire * 100)}% E${Math.round(analysis.elementBalance.earth * 100)}% M${Math.round(analysis.elementBalance.metal * 100)}% W${Math.round(analysis.elementBalance.water * 100)}%`,
      `Sha Qi Paths: ${analysis.shaQiPaths.length}`,
      ``,
    ];

    if (analysis.issues.length > 0) {
      lines.push(`Issues (${analysis.issues.length}):`);
      for (const issue of analysis.issues.slice(0, 5)) {
        lines.push(`  [${issue.severity}] ${issue.issue}`);
      }
      lines.push(``);
    }

    if (analysis.recommendations.length > 0) {
      lines.push(`Recommendations:`);
      for (const rec of analysis.recommendations) {
        lines.push(`  ${rec}`);
      }
    }

    return lines.join('\n');
  }
}

// Export singleton instance
export const cityFengShuiAnalyzer = new CityFengShuiAnalyzer();
