/**
 * HarmonyContextBuilder - Provides spatial harmony awareness to agents
 *
 * Skill-gated Feng Shui perception for agents with architecture skills.
 * Integrates with the BuildingHarmonyComponent to show agents how buildings
 * "feel" based on their spatial harmony scores.
 *
 * Skill Levels (architecture):
 * - 0-1: No harmony perception
 * - 2 (flow-awareness): Basic chi flow sensing, vague feelings
 * - 3 (commanding-positions): Detailed scores and specific issues
 * - 4+ (spatial-harmony-mastery): Full analysis with improvement suggestions
 *
 * For flying creatures (z > 0), also provides aerial harmony:
 * - Thermal zones, wind corridors, aerial Sha Qi
 * - Perching spots with commanding positions
 * - Optimal flight altitudes and recommended paths
 */

import type { Component } from '@ai-village/core';
import type { World } from '@ai-village/core';
import type { SkillLevel, BuildingHarmonyComponent, HarmonyLevel } from '@ai-village/core';
import { aerialFengShuiAnalyzer } from '@ai-village/core';

/**
 * Builds harmony context sections for agent prompts.
 */
export class HarmonyContextBuilder {
  /**
   * Build harmony context for visible buildings.
   * Returns empty string if agent lacks architecture skill.
   */
  buildHarmonyContext(
    world: World,
    seenBuildingIds: string[],
    architectureSkill: SkillLevel
  ): string {
    // No perception below skill level 2
    if (architectureSkill < 2) {
      return '';
    }

    const harmonyDescriptions: string[] = [];

    for (const buildingId of seenBuildingIds.slice(-5)) {
      const building = world.getEntity(buildingId);
      if (!building) continue;

      const buildingComp = building.components.get('building') as (Component & { buildingType: string; isComplete: boolean }) | undefined;
      const harmonyComp = building.components.get('building_harmony') as BuildingHarmonyComponent | undefined;

      if (!buildingComp?.isComplete) continue;

      const buildingName = buildingComp.buildingType;

      if (harmonyComp) {
        const description = this.describeHarmony(
          buildingName,
          harmonyComp,
          architectureSkill
        );
        if (description) {
          harmonyDescriptions.push(description);
        }
      }
    }

    if (harmonyDescriptions.length === 0) {
      return '';
    }

    // Format based on skill level
    if (architectureSkill >= 4) {
      return `\nSpatial Harmony Analysis (your architecture mastery):\n${harmonyDescriptions.join('\n')}\n`;
    } else if (architectureSkill >= 3) {
      return `\nSpatial Harmony (your architecture skill):\n${harmonyDescriptions.join('\n')}\n`;
    } else {
      return `\nEnergy Sensations:\n${harmonyDescriptions.join('\n')}\n`;
    }
  }

  /**
   * Describe a building's harmony based on agent's skill level.
   */
  private describeHarmony(
    buildingName: string,
    harmony: BuildingHarmonyComponent,
    skillLevel: SkillLevel
  ): string {
    if (skillLevel >= 4) {
      // Full analysis with suggestions
      return this.getDetailedHarmonyDescription(buildingName, harmony);
    } else if (skillLevel >= 3) {
      // Score and main issues
      return this.getIntermediateHarmonyDescription(buildingName, harmony);
    } else {
      // Vague feelings
      return this.getVagueHarmonyDescription(buildingName, harmony);
    }
  }

  /**
   * Skill level 2: Vague sensations about energy flow.
   */
  private getVagueHarmonyDescription(
    buildingName: string,
    harmony: BuildingHarmonyComponent
  ): string {
    const feelings = this.getVagueFeeling(harmony.harmonyLevel);
    return `  - The ${buildingName} ${feelings}`;
  }

  /**
   * Get vague feeling description based on harmony level.
   */
  private getVagueFeeling(level: HarmonyLevel): string {
    switch (level) {
      case 'sublime':
        return 'feels extraordinarily peaceful and welcoming';
      case 'harmonious':
        return 'has a pleasant, balanced energy';
      case 'neutral':
        return 'feels unremarkable';
      case 'disharmonious':
        return 'feels slightly uncomfortable, something is off';
      case 'discordant':
        return 'makes you uneasy, the energy feels wrong';
      default:
        return 'feels ordinary';
    }
  }

  /**
   * Skill level 3: Scores and specific observations.
   */
  private getIntermediateHarmonyDescription(
    buildingName: string,
    harmony: BuildingHarmonyComponent
  ): string {
    const parts: string[] = [];

    parts.push(`  - ${buildingName}: Harmony ${harmony.harmonyScore}/100 (${harmony.harmonyLevel})`);

    // Chi flow observation
    if (!harmony.chiFlow.hasGoodFlow) {
      parts.push(`      Chi stagnates in ${harmony.chiFlow.stagnantAreas.length} area(s)`);
    }
    if (harmony.chiFlow.hasShaQi) {
      parts.push(`      Warning: Sha Qi (killing breath) detected`);
    }

    // Commanding position issues
    if (!harmony.commandingPositions.wellPlaced && harmony.commandingPositions.violations.length > 0) {
      const violation = harmony.commandingPositions.violations[0];
      if (violation) {
        parts.push(`      ${violation.furniture}: ${violation.issue}`);
      }
    }

    // Element imbalance
    if (harmony.deficientElement) {
      parts.push(`      Lacks ${harmony.deficientElement} element`);
    }
    if (harmony.excessiveElement) {
      parts.push(`      Too much ${harmony.excessiveElement} element`);
    }

    return parts.join('\n');
  }

  /**
   * Skill level 4+: Full analysis with actionable suggestions.
   */
  private getDetailedHarmonyDescription(
    buildingName: string,
    harmony: BuildingHarmonyComponent
  ): string {
    const parts: string[] = [];

    parts.push(`  - ${buildingName}: ${harmony.harmonyScore}/100 (${harmony.harmonyLevel})`);

    // Detailed chi flow
    if (harmony.chiFlow.hasGoodFlow) {
      parts.push(`      Chi: Flows well through the space`);
    } else {
      parts.push(`      Chi: ${harmony.chiFlow.stagnantAreas.length} stagnant zone(s)`);
    }
    if (harmony.chiFlow.hasShaQi && harmony.chiFlow.shaQiLines) {
      for (const line of harmony.chiFlow.shaQiLines.slice(0, 2)) {
        parts.push(`      Sha Qi: Line from (${line.from.x},${line.from.y}) to (${line.to.x},${line.to.y})`);
      }
    }

    // Proportions
    if (!harmony.proportions.areBalanced) {
      parts.push(`      Proportions: ${harmony.proportions.unbalancedRooms.join(', ')} deviate from golden ratio`);
    }

    // All commanding position violations
    for (const violation of harmony.commandingPositions.violations.slice(0, 3)) {
      parts.push(`      ${violation.furniture} at (${violation.location.x},${violation.location.y}): ${violation.issue}`);
    }

    // Element balance
    const el = harmony.elementBalance;
    parts.push(`      Elements: W${el.wood} F${el.fire} E${el.earth} M${el.metal} Wa${el.water}`);
    if (harmony.deficientElement) {
      parts.push(`      Add more ${harmony.deficientElement}: ${this.getElementSuggestion(harmony.deficientElement)}`);
    }

    // Top issues with suggestions
    for (const issue of harmony.issues.slice(0, 2)) {
      parts.push(`      Issue: ${issue.issue}`);
      parts.push(`        Fix: ${issue.suggestion}`);
    }

    return parts.join('\n');
  }

  /**
   * Get suggestion for adding an element.
   */
  private getElementSuggestion(element: string): string {
    const suggestions: Record<string, string> = {
      wood: 'Add wooden furniture or plants',
      fire: 'Add a hearth or candles',
      earth: 'Add stone or clay items',
      metal: 'Add metal tools or decorations',
      water: 'Add a water feature or reflective surfaces',
    };
    return suggestions[element] || 'Add appropriate items';
  }

  /**
   * Build placement harmony hints for architecture-skilled agents.
   * Shows predicted harmony for building placement.
   */
  buildPlacementHints(
    world: World,
    nearbyBuildings: string[],
    architectureSkill: SkillLevel
  ): string {
    // Need skill 3+ to see placement predictions
    if (architectureSkill < 3) {
      return '';
    }

    // Count element types of nearby buildings
    const elementCounts: Record<string, number> = {
      wood: 0,
      fire: 0,
      earth: 0,
      metal: 0,
      water: 0,
    };

    for (const buildingId of nearbyBuildings) {
      const building = world.getEntity(buildingId);
      if (!building) continue;

      const buildingComp = building.components.get('building') as (Component & { buildingType: string }) | undefined;
      if (!buildingComp) continue;

      const element = this.getBuildingElement(buildingComp.buildingType);
      if (element && element in elementCounts) {
        elementCounts[element] = (elementCounts[element] ?? 0) + 1;
      }
    }

    // Find deficient and excessive elements
    const total = Object.values(elementCounts).reduce((a, b) => a + b, 0);
    if (total < 3) return ''; // Not enough buildings to analyze

    const hints: string[] = [];

    // Find most deficient element
    let minEl = 'wood';
    let minCount = elementCounts.wood ?? 0;
    for (const [el, count] of Object.entries(elementCounts)) {
      if (count < minCount) {
        minEl = el;
        minCount = count;
      }
    }

    if (minCount === 0) {
      hints.push(`  - Area lacks ${minEl} element (${this.getElementBuildings(minEl)} would improve harmony)`);
    }

    // Find most excessive element
    let maxEl = 'wood';
    let maxCount = elementCounts.wood ?? 0;
    for (const [el, count] of Object.entries(elementCounts)) {
      if (count > maxCount) {
        maxEl = el;
        maxCount = count;
      }
    }

    if (maxCount > total / 2) {
      hints.push(`  - Area has excess ${maxEl} (avoid adding more ${this.getElementBuildings(maxEl)})`);
    }

    if (hints.length === 0) return '';

    return `\nPlacement Harmony Hints:\n${hints.join('\n')}\n`;
  }

  /**
   * Map building type to element.
   */
  private getBuildingElement(buildingType: string): string | null {
    const mapping: Record<string, string> = {
      // Wood element
      'lean-to': 'wood',
      'wooden-hut': 'wood',
      'farm': 'wood',
      'orchard': 'wood',
      'apiary': 'wood',
      'library': 'wood',

      // Fire element
      'campfire': 'fire',
      'hearth': 'fire',
      'forge': 'fire',
      'kiln': 'fire',
      'town-hall': 'fire',
      'temple': 'fire',

      // Earth element
      'storage-chest': 'earth',
      'granary': 'earth',
      'silo': 'earth',
      'warehouse': 'earth',
      'well': 'earth',
      'stone-house': 'earth',

      // Metal element
      'smithy': 'metal',
      'armory': 'metal',
      'barracks': 'metal',
      'guard-post': 'metal',
      'workshop': 'metal',

      // Water element
      'fishing-hut': 'water',
      'trading-post': 'water',
      'market': 'water',
      'tavern': 'water',
      'bath-house': 'water',
    };

    return mapping[buildingType] || null;
  }

  /**
   * Get building suggestions for an element.
   */
  private getElementBuildings(element: string): string {
    const buildings: Record<string, string> = {
      wood: 'farms, orchards, libraries',
      fire: 'forges, kilns, temples',
      earth: 'storage buildings, wells',
      metal: 'workshops, smithies',
      water: 'markets, trading posts, bath-houses',
    };
    return buildings[element] || 'appropriate buildings';
  }

  // ============================================================================
  // Aerial Harmony (3D Feng Shui for Flying Creatures)
  // ============================================================================

  /**
   * Build aerial harmony context for flying creatures.
   * Only provided when agent is at altitude (z > 0) and has architecture skill >= 2.
   *
   * @param world The game world
   * @param agentPosition Current position { x, y, z }
   * @param architectureSkill Agent's architecture skill level
   * @param currentTick Current game tick
   * @returns Aerial harmony context string, or empty if not applicable
   */
  buildAerialHarmonyContext(
    world: World,
    agentPosition: { x: number; y: number; z: number },
    architectureSkill: SkillLevel,
    currentTick: number
  ): string {
    // No perception below skill level 2 or at ground level
    if (architectureSkill < 2 || agentPosition.z <= 0) {
      return '';
    }

    // Define analysis bounds around the agent (16 tile radius)
    const bounds = {
      minX: agentPosition.x - 16,
      maxX: agentPosition.x + 16,
      minY: agentPosition.y - 16,
      maxY: agentPosition.y + 16,
    };

    // Analyze the aerial harmony
    const harmony = aerialFengShuiAnalyzer.analyze(world, bounds, currentTick);

    // Use the analyzer's summarize method for skill-gated description
    const summary = aerialFengShuiAnalyzer.summarize(harmony, architectureSkill);

    if (!summary) {
      return '';
    }

    // Format based on skill level
    if (architectureSkill >= 4) {
      return `\nAerial Harmony Analysis (your architecture mastery):\n${summary}\n`;
    } else if (architectureSkill >= 3) {
      return `\nAerial Harmony (your architecture skill):\n${summary}\n`;
    } else {
      return `\nAir Currents:\n${summary}\n`;
    }
  }

  /**
   * Build flight path recommendations for architecture-skilled agents.
   * Shows optimal routes through the airspace.
   *
   * @param world The game world
   * @param agentPosition Current position { x, y, z }
   * @param destinationHint Optional destination for pathfinding
   * @param architectureSkill Agent's architecture skill level
   * @param currentTick Current game tick
   * @returns Flight path recommendations, or empty if not applicable
   */
  buildFlightPathHints(
    world: World,
    agentPosition: { x: number; y: number; z: number },
    architectureSkill: SkillLevel,
    currentTick: number
  ): string {
    // Need skill 3+ for flight path awareness
    if (architectureSkill < 3 || agentPosition.z <= 0) {
      return '';
    }

    const bounds = {
      minX: agentPosition.x - 20,
      maxX: agentPosition.x + 20,
      minY: agentPosition.y - 20,
      maxY: agentPosition.y + 20,
    };

    const harmony = aerialFengShuiAnalyzer.analyze(world, bounds, currentTick);

    const hints: string[] = [];

    // Optimal altitude recommendation
    if (harmony.optimalFlightAltitude !== agentPosition.z) {
      const direction = harmony.optimalFlightAltitude > agentPosition.z ? 'higher' : 'lower';
      hints.push(`  - Optimal altitude: Z-${harmony.optimalFlightAltitude} (fly ${direction} for better chi flow)`);
    }

    // Warning about nearby Sha Qi
    // PERFORMANCE: Use squared distance for comparison
    const maxDistanceSquared = 100; // 10 * 10
    const nearbyDangers = harmony.aerialShaQi.filter((shaQi: any) => {
      const midX = (shaQi.from.x + shaQi.to.x) / 2;
      const midY = (shaQi.from.y + shaQi.to.y) / 2;
      const dx = midX - agentPosition.x;
      const dy = midY - agentPosition.y;
      const distanceSquared = dx * dx + dy * dy;
      return distanceSquared < maxDistanceSquared && shaQi.affectedAltitudes.includes(agentPosition.z);
    });

    if (nearbyDangers.length > 0) {
      const danger = nearbyDangers[0];
      if (danger) {
        hints.push(`  - WARNING: ${danger.cause} ahead - avoid direct flight path`);
      }
    }

    // Nearby thermals for energy-efficient flight
    // PERFORMANCE: Use squared distance for comparison
    const thermalMaxDistanceSquared = 64; // 8 * 8
    const nearbyThermals = harmony.thermals.filter((t: any) => {
      const dx = t.center.x - agentPosition.x;
      const dy = t.center.y - agentPosition.y;
      const distanceSquared = dx * dx + dy * dy;
      return distanceSquared < thermalMaxDistanceSquared;
    });

    if (nearbyThermals.length > 0) {
      const thermal = nearbyThermals[0];
      if (thermal) {
        hints.push(`  - Thermal updraft from ${thermal.source} nearby - use for easier ascent`);
      }
    }

    // Best perch if tired
    if (harmony.perchingSpots.length > 0) {
      const bestPerch = harmony.perchingSpots[0];
      if (bestPerch && bestPerch.commandingQuality >= 70) {
        hints.push(`  - Good perch available: ${bestPerch.description}`);
      }
    }

    if (hints.length === 0) {
      return '';
    }

    return `\nFlight Path Hints:\n${hints.join('\n')}\n`;
  }
}
