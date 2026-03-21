/**
 * Civilization milestone events — world-level geographic and ecological discoveries.
 *
 * These complement agent/social milestones (births, deaths, magic) tracked by
 * MilestoneSystem with biome discovery and terrain events for the Civilization
 * Chronicle (Drive 2).
 *
 * Consumed by: CivilizationChroniclePanel (renderer), Chronicle Drive 2 systems
 * Produced by: BiomeMilestoneSystem
 */

export interface CivilizationEvents {
  /**
   * An agent first enters a biome type not previously seen by any agent.
   */
  'civilization:biome_discovered': {
    biomeType: string;
    agentId: string;
    agentName: string;
    x: number;
    y: number;
    summary: string;
    tick: number;
  };

  /**
   * The first structure of any kind is built within a given biome type.
   */
  'civilization:biome_settled': {
    biomeType: string;
    agentId: string;
    agentName: string;
    buildingType: string;
    x: number;
    y: number;
    summary: string;
    tick: number;
  };

  /**
   * Agents have visited enough distinct tiles in a biome to consider it fully explored.
   * Fires once per biome type when the unique-tile count crosses the exploration threshold.
   */
  'civilization:biome_explored': {
    biomeType: string;
    uniqueTilesVisited: number;
    summary: string;
    tick: number;
  };

  /**
   * A tile's biome type has changed (e.g. deforestation, desert spread, flood).
   */
  'civilization:terrain_transformed': {
    x: number;
    y: number;
    fromBiome: string;
    toBiome: string;
    summary: string;
    tick: number;
  };

  /**
   * The first mining, logging, or farming operation in a previously untouched biome type.
   */
  'civilization:resource_extracted': {
    biomeType: string;
    resourceType: string;
    agentId: string;
    agentName: string;
    x: number;
    y: number;
    summary: string;
    tick: number;
  };
}
