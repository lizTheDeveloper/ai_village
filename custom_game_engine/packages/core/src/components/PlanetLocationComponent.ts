import type { Component } from '../ecs/Component.js';

/**
 * PlanetLocationComponent - Tracks which planet an entity is on
 *
 * Planets are visitable locations within a universe. Each planet has its own
 * terrain generation parameters, biome palette, and chunk storage. Entities
 * can travel between planets within the same universe.
 *
 * By default, entities are on the 'planet:homeworld' planet.
 */
export interface PlanetLocationComponent extends Component {
  type: 'planet_location';

  /** Current planet ID (e.g., 'planet:homeworld', 'planet:crystal-moon') */
  currentPlanetId: string;

  /** Tick when entity arrived on current planet */
  arrivalTick: number;

  /** Previous planet ID (for return travel or history) */
  previousPlanetId?: string;

  /** Travel method used to arrive ('portal', 'spacecraft', 'ritual', 'passage') */
  travelMethod?: 'portal' | 'spacecraft' | 'ritual' | 'passage' | 'spawn';

  /** Total planets visited (for exploration stats) */
  planetsVisited: number;

  /** List of discovered planet IDs */
  discoveredPlanets: string[];
}

/**
 * Create a planet location component.
 *
 * @param planetId - Initial planet ID (defaults to 'planet:homeworld')
 * @param arrivalTick - Tick when arrived (defaults to 0)
 * @returns A new PlanetLocationComponent
 */
export function createPlanetLocationComponent(
  planetId: string = 'planet:homeworld',
  arrivalTick: number = 0
): PlanetLocationComponent {
  return {
    type: 'planet_location',
    version: 1,
    currentPlanetId: planetId,
    arrivalTick,
    travelMethod: 'spawn',
    planetsVisited: 1,
    discoveredPlanets: [planetId],
  };
}

/**
 * Update planet location when entity travels to a new planet.
 *
 * @param component - The existing planet location component
 * @param newPlanetId - The planet being traveled to
 * @param tick - Current tick
 * @param method - How the entity traveled
 * @returns Updated component (mutates in place for ECS compatibility)
 */
export function updatePlanetLocation(
  component: PlanetLocationComponent,
  newPlanetId: string,
  tick: number,
  method: PlanetLocationComponent['travelMethod'] = 'portal'
): PlanetLocationComponent {
  // Track previous planet
  component.previousPlanetId = component.currentPlanetId;

  // Update current location
  component.currentPlanetId = newPlanetId;
  component.arrivalTick = tick;
  component.travelMethod = method;

  // Update discovery tracking
  if (!component.discoveredPlanets.includes(newPlanetId)) {
    component.discoveredPlanets.push(newPlanetId);
    component.planetsVisited++;
  }

  return component;
}
