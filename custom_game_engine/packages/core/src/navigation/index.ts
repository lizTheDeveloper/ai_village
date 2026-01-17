/**
 * Navigation Module
 *
 * This module provides the knowledge layer for agent navigation:
 *
 * 1. MapKnowledge (world-level)
 *    - Worn paths (traffic-based pathfinding)
 *    - Resource areas (region-level, not entity-level)
 *    - Sector-based exploration tracking
 *
 * 2. HearsayMemory (agent-level)
 *    - What others told this agent ("berries up north")
 *    - Trust ratings for information sources
 *    - Personal fog-of-war
 *
 * 3. Spaceships & β-space Navigation
 *    - Emotional topology navigation
 *    - Narrative weight mechanics
 *
 * The key insight: The map knows WHERE things are (stigmergic).
 * Agents know WHO told them WHAT (social).
 */

// Map-level knowledge (world singleton)
export {
  MapKnowledge,
  getMapKnowledge,
  setMapKnowledge,
  resetMapKnowledge,
  worldToSector,
  sectorToWorld,
  getSectorKey,
  SECTOR_SIZE,
  type Sector,
  type Direction,
  type AreaResourceType,
} from './MapKnowledge.js';

// Agent-level social knowledge
export {
  createHearsayMemoryComponent,
  addHearsay,
  getHearsayForResource,
  verifyHearsay,
  updateHearsayTrust,
  getTrustScore,
  getTrustedAgents,
  markExplored,
  hasExplored,
  getUnexploredInRadius,
  describeKnownResources,
  describeTrustRelationships,
  type HearsayMemoryComponent,
  type Hearsay,
  type TrustRating,
  type ExploredSector,
  type CardinalDirection,
} from './HearsayMemory.js';

// Speech parsing for knowledge transmission
export {
  parseResourceMentions,
  isResourceAnnouncement,
  getPrimaryResourceMention,
  generateResourceAnnouncement,
  getAnnouncementExamples,
  vectorToCardinal,
  cardinalToVector,
  distanceToTiles,
  type ResourceMention,
} from './SpeechParser.js';

// Integration layer - ties speech parsing to memory updates
export {
  processHeardSpeech,
  recordResourceDiscovery,
  recordResourceDepletion,
  verifyHearsayAtLocation,
  recordMovement,
  getBestResourceLocation,
  generateResourceKnowledgeContext,
} from './KnowledgeTransmission.js';

// Zone management (player-designated areas)
export {
  ZoneManager,
  getZoneManager,
  setZoneManager,
  resetZoneManager,
  ZONE_BUILDING_AFFINITY,
  ZONE_COLORS,
  type Zone,
  type ZoneType,
} from './ZoneManager.js';

// Spaceships and β-space navigation
export * from './SpaceshipComponent.js';
export * from './EmotionalNavigationSystem.js';

// Rainbow Mars quantum mechanics
export * from './RainbowPlanetComponent.js';

// Planet travel
export * from './PlanetTravelComponent.js';
export * from './PlanetPortalComponent.js';
