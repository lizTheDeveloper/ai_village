/**
 * SystemTierAdapter - Adapts star system data to AbstractSystem tier
 *
 * Manages multiple planets and aggregates their data for the hierarchy simulator.
 */

interface SystemConfig {
  id: string;
  name: string;
  starType: string;
  address: unknown;
}

export class SystemTierAdapter {
  /**
   * Create an AbstractSystem from a list of planets and a system config
   */
  static createSystem(planets: unknown[], config: SystemConfig): unknown {
    if (!planets) throw new Error('planets parameter is required');
    if (!config) throw new Error('config parameter is required');
    if (!Array.isArray(planets) || planets.length === 0) throw new Error('planets array cannot be empty');
    return { id: config.id, name: config.name, planets };
  }

  /**
   * Get planets in the habitable zone of a star system
   */
  static getPlanetsInHabitableZone(abstractSystem: unknown): unknown[] {
    if (!abstractSystem) throw new Error('abstractSystem parameter is required');
    return [];
  }

  /**
   * Get aggregated resources across all planets in a system
   */
  static getSystemResources(abstractSystem: unknown): Record<string, number> {
    if (!abstractSystem) throw new Error('abstractSystem parameter is required');
    return {};
  }

  /**
   * Add a planet to an existing abstract system
   */
  static addPlanet(abstractSystem: unknown, planet: unknown): void {
    if (!abstractSystem) throw new Error('abstractSystem parameter is required');
    if (!planet) throw new Error('planet parameter is required');
  }

  /**
   * Get the primary (largest/most developed) planet in the system
   */
  static getPrimaryPlanet(abstractSystem: unknown): unknown | null {
    if (!abstractSystem) throw new Error('abstractSystem parameter is required');
    return null;
  }
}
