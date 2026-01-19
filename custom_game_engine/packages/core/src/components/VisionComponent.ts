import type { Component } from '../ecs/Component.js';

/**
 * Vision range tiers for different awareness levels.
 * Scale: 1 tile = 1 meter, humans are 2 tiles tall.
 *
 * Context is gathered in tiers to avoid bloat:
 * - Immediate: What you can interact with (touch, pick up)
 * - Close: People you can talk to, items you notice
 * - Area: Your tactical surroundings, nearby threats/resources
 * - Distant: Landmarks, terrain features, strategic awareness
 */
export const VISION_TIERS = {
  /** Arm's reach - items to pick up, people to touch (2m) */
  IMMEDIATE: 2,

  /** Conversation distance - detailed awareness (10m) */
  CLOSE: 10,

  /** Tactical awareness - resources, threats, work area (50m) */
  AREA: 50,

  /** Strategic awareness - landmarks, distant entities (200m) */
  DISTANT: 200,

  /** Maximum visibility - horizon, mountains, navigation (500m) */
  HORIZON: 500,
} as const;

/**
 * Default vision ranges by agent role/skill profile.
 * Higher skilled agents have better awareness in their domain.
 */
export const VISION_PROFILES = {
  /** Default villager - balanced awareness */
  default: {
    immediate: VISION_TIERS.IMMEDIATE,
    close: VISION_TIERS.CLOSE,
    area: VISION_TIERS.AREA,
    distant: VISION_TIERS.DISTANT,
  },

  /** Scout/Explorer - extended range */
  scout: {
    immediate: VISION_TIERS.IMMEDIATE,
    close: 15,
    area: 100,
    distant: VISION_TIERS.HORIZON,
  },

  /** Farmer - focused on nearby crops */
  farmer: {
    immediate: VISION_TIERS.IMMEDIATE,
    close: VISION_TIERS.CLOSE,
    area: 30,
    distant: 100,
  },

  /** Guard - heightened threat awareness */
  guard: {
    immediate: VISION_TIERS.IMMEDIATE,
    close: 20,
    area: 100,
    distant: 300,
  },

  /** Crafter - focused on immediate work */
  crafter: {
    immediate: 3,
    close: VISION_TIERS.CLOSE,
    area: 25,
    distant: 50,
  },
} as const;

export interface VisionComponent extends Component {
  type: 'vision';

  /** Primary vision range for entity detection (meters/tiles) */
  range: number;

  /** Close awareness range - detailed perception (meters/tiles) */
  closeRange: number;

  /** Distant awareness range - landmarks, navigation (meters/tiles) */
  distantRange: number;

  fieldOfView: number;    // Degrees (360 = full circle)
  canSeeAgents: boolean;
  canSeeResources: boolean;

  // Seen entities by tier
  seenAgents: string[];     // Agents in area range
  seenResources: string[];  // Resources in area range
  seenPlants?: string[];    // Plants in area range
  seenBuildings?: string[]; // Buildings in area range
  seenAnimals?: string[];   // Animals in area range

  // Close range details (for context)
  nearbyAgents?: string[];    // Agents in close range (detailed in context)
  nearbyResources?: string[]; // Resources in close range

  // Distant awareness (for navigation/landmarks)
  distantLandmarks?: string[]; // Major features visible at distance

  heardSpeech: Array<{ speaker: string; text: string }>;
  terrainDescription?: string;
}

export function createVisionComponent(
  range: number = VISION_TIERS.AREA,
  fieldOfView: number = 360,
  canSeeAgents: boolean = true,
  canSeeResources: boolean = true,
  closeRange: number = VISION_TIERS.CLOSE,
  distantRange: number = VISION_TIERS.DISTANT
): VisionComponent {
  return {
    type: 'vision',
    version: 1,
    range,
    closeRange,
    distantRange,
    fieldOfView,
    canSeeAgents,
    canSeeResources,
    seenAgents: [],
    seenResources: [],
    seenPlants: [],
    seenAnimals: [],
    nearbyAgents: [],
    nearbyResources: [],
    distantLandmarks: [],
    heardSpeech: [],
  };
}

/**
 * Create a vision component for a specific skill profile.
 */
export function createVisionForProfile(
  profile: keyof typeof VISION_PROFILES = 'default'
): VisionComponent {
  const p = VISION_PROFILES[profile];
  return createVisionComponent(
    p.area,      // Primary range
    360,         // Full FOV
    true,        // See agents
    true,        // See resources
    p.close,     // Close range
    p.distant    // Distant range
  );
}
