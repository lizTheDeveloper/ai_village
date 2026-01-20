/**
 * ExplorationMissionComponent - Tracks ship exploration missions
 *
 * Attached to ship entities conducting surveys of stellar phenomena or planets.
 * Tracks progress, discoveries, and mission parameters.
 *
 * Used by ExplorationDiscoverySystem to:
 * - Track mission progress toward 100%
 * - Roll for resource discoveries based on sensor quality
 * - Transfer discoveries to civilization's known resources
 * - Enable era progression when gated resources are found
 *
 * See: packages/core/src/systems/ExplorationDiscoverySystem.ts
 */

import type { Component } from '../ecs/Component.js';

/**
 * Exploration mission attached to a ship
 */
export interface ExplorationMissionComponent extends Component {
  type: 'exploration_mission';

  // ========== Mission Parameters ==========

  /** Ship entity ID conducting the mission */
  shipId: string;

  /** Target being explored (stellar phenomenon or planet ID) */
  targetId: string;

  /** Target type */
  targetType: 'stellar_phenomenon' | 'planet';

  /** Mission type determines thoroughness and focus */
  missionType: 'survey' | 'resource_scan' | 'deep_analysis';

  /** Target coordinates (for arrival detection) */
  targetCoordinates: { x: number; y: number; z: number };

  /** Civilization/nation conducting the mission */
  civilizationId: string;

  // ========== Progress Tracking ==========

  /** Mission progress (0-100%) */
  progress: number;

  /** Tick when mission started */
  startTick: number;

  /** Tick when mission completed (null if ongoing) */
  completedTick: number | null;

  /** Has ship arrived at target? */
  hasArrived: boolean;

  /** Time spent surveying (ticks) */
  surveyDuration: number;

  // ========== Discoveries ==========

  /** Resources discovered during this mission */
  discoveredResources: Set<string>; // Resource type IDs

  /** Detailed discovery records */
  discoveries: Array<{
    resourceType: string;
    discoveredTick: number;
    abundance: number;
    difficulty: number;
    isEraGated: boolean;
  }>;

  // ========== Sensor Quality & Crew ==========

  /**
   * Sensor quality multiplier (ship-type dependent)
   * - courier: 0.5 (basic sensors)
   * - threshold: 1.0 (standard sensors)
   * - story_ship: 1.0 (narrative sensors)
   * - probability_scout: 2.0 (advanced mapping sensors)
   */
  sensorQuality: number;

  /**
   * Crew science skill (average of crew members with science skill)
   * 0-1, affects discovery chance
   */
  crewSkill: number;

  // ========== Mission Type Bonuses ==========

  /**
   * Mission type affects discovery mechanics:
   * - survey: 1.0x discovery rate, broad coverage
   * - resource_scan: 1.5x discovery rate, focused on resources
   * - deep_analysis: 2.0x discovery rate, slow but thorough
   */
  missionTypeMultiplier: number;
}

/**
 * Create an exploration mission component
 */
export function createExplorationMissionComponent(
  shipId: string,
  targetId: string,
  targetType: 'stellar_phenomenon' | 'planet',
  missionType: 'survey' | 'resource_scan' | 'deep_analysis',
  targetCoordinates: { x: number; y: number; z: number },
  civilizationId: string,
  sensorQuality: number,
  crewSkill: number,
  startTick: number
): ExplorationMissionComponent {
  // Mission type determines thoroughness
  let missionTypeMultiplier: number;
  switch (missionType) {
    case 'survey':
      missionTypeMultiplier = 1.0; // Standard
      break;
    case 'resource_scan':
      missionTypeMultiplier = 1.5; // Focused on resources
      break;
    case 'deep_analysis':
      missionTypeMultiplier = 2.0; // Slow but thorough
      break;
  }

  return {
    type: 'exploration_mission',
    version: 1,
    shipId,
    targetId,
    targetType,
    missionType,
    targetCoordinates,
    civilizationId,
    progress: 0,
    startTick,
    completedTick: null,
    hasArrived: false,
    surveyDuration: 0,
    discoveredResources: new Set(),
    discoveries: [],
    sensorQuality,
    crewSkill,
    missionTypeMultiplier,
  };
}

/**
 * Calculate discovery chance for a resource
 *
 * discoveryChance = sensorQuality × crewSkill × targetAbundance × missionTypeMultiplier
 */
export function calculateDiscoveryChance(
  mission: ExplorationMissionComponent,
  resourceAbundance: number
): number {
  return (
    mission.sensorQuality *
    mission.crewSkill *
    resourceAbundance *
    mission.missionTypeMultiplier
  );
}

/**
 * Calculate progress increment per tick
 *
 * Progress rate depends on:
 * - Mission type (survey = fast, deep_analysis = slow)
 * - Sensor quality
 * - Crew skill
 *
 * Base rate: 1% per tick for survey, 0.5% for resource_scan, 0.25% for deep_analysis
 */
export function calculateProgressRate(mission: ExplorationMissionComponent): number {
  let baseRate: number;
  switch (mission.missionType) {
    case 'survey':
      baseRate = 1.0; // 100 ticks to complete
      break;
    case 'resource_scan':
      baseRate = 0.5; // 200 ticks to complete
      break;
    case 'deep_analysis':
      baseRate = 0.25; // 400 ticks to complete
      break;
  }

  // Modify by sensor quality and crew skill
  const qualityMultiplier = 0.5 + mission.sensorQuality * 0.5; // 0.5-1.0x
  const skillMultiplier = 0.5 + mission.crewSkill * 0.5; // 0.5-1.0x

  return baseRate * qualityMultiplier * skillMultiplier;
}
