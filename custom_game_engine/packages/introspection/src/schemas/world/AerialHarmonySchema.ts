/**
 * Aerial Harmony Component Schema
 *
 * 3D spatial harmony for flying creatures.
 * Tracks thermals, wind corridors, aerial Sha Qi, and perching spots.
 *
 * Phase 4+, Tier 12 - Buildings/Infrastructure Components
 */

import { defineComponent, autoRegister, type Component } from '../../index.js';

/**
 * Aerial harmony component type
 */
export interface AerialHarmonyComponent extends Component {
  type: 'aerial_harmony';
  version: 1;

  harmonyScore: number;
  harmonyLevel: 'treacherous' | 'turbulent' | 'calm' | 'favorable' | 'sublime';
  thermals: Array<{
    center: { x: number; y: number; z: number };
    radius: number;
    strength: number;
    source: string;
    minZ: number;
    maxZ: number;
  }>;
  windCorridors: Array<{
    start: { x: number; y: number; z: number };
    end: { x: number; y: number; z: number };
    width: number;
    isSafe: boolean;
    riskLevel: number;
    description: string;
  }>;
  aerialShaQi: Array<{
    from: { x: number; y: number; z: number };
    to: { x: number; y: number; z: number };
    severity: number;
    cause: string;
    affectedAltitudes: number[];
  }>;
  perchingSpots: Array<{
    position: { x: number; y: number; z: number };
    providedBy: string;
    perchType: string;
    commandingQuality: number;
    approachVectors: number;
    hasThreatVisibility: boolean;
    hasBackingProtection: boolean;
    description: string;
  }>;
  elementBalance: {
    byAltitude: {
      ground: { wood: number; fire: number; earth: number; metal: number; water: number };
      canopy: { wood: number; fire: number; earth: number; metal: number; water: number };
      flying: { wood: number; fire: number; earth: number; metal: number; water: number };
      high: { wood: number; fire: number; earth: number; metal: number; water: number };
    };
    isBalanced: boolean;
    dominantElement: string;
    deficientElement?: string;
  };
  issues: Array<{
    principle: 'thermal_flow' | 'wind_corridor' | 'aerial_sha_qi' | 'perching' | 'element_balance';
    issue: string;
    suggestion: string;
    location?: { x: number; y: number; z: number };
    altitude?: number;
  }>;
  optimalFlightAltitude: number;
  recommendedPaths: Array<Array<{ x: number; y: number; z: number }>>;
  analyzedAt: number;
  analyzedBy?: string;
  areaBounds: {
    minX: number;
    maxX: number;
    minY: number;
    maxY: number;
    minZ: number;
    maxZ: number;
  };
}

/**
 * Aerial harmony component schema
 */
export const AerialHarmonySchema = autoRegister(
  defineComponent<AerialHarmonyComponent>({
    type: 'aerial_harmony',
    version: 1,
    category: 'world',

    fields: {
      harmonyScore: {
        type: 'number',
        required: true,
        default: 50,
        description: 'Overall aerial harmony score (0-100)',
        displayName: 'Harmony Score',
        visibility: { player: true, llm: true, agent: true, user: true, dev: true },
        ui: {
          widget: 'slider',
          group: 'harmony',
          order: 1,
          icon: '🦅',
        },
        mutable: true,
        min: 0,
        max: 100,
      },

      harmonyLevel: {
        type: 'string',
        required: true,
        default: 'calm',
        description: 'Harmony level category',
        displayName: 'Harmony Level',
        visibility: { player: true, llm: true, agent: true, user: true, dev: true },
        ui: {
          widget: 'dropdown',
          group: 'harmony',
          order: 2,
        },
        mutable: true,
        enumValues: ['treacherous', 'turbulent', 'calm', 'favorable', 'sublime'],
      },

      thermals: {
        type: 'array',
        required: true,
        default: [],
        description: 'Thermal zones (rising chi)',
        displayName: 'Thermals',
        visibility: { player: false, llm: 'summarized', agent: true, user: false, dev: true },
        ui: {
          widget: 'json',
          group: 'flight',
          order: 1,
        },
        mutable: true,
        itemType: 'object',
      },

      windCorridors: {
        type: 'array',
        required: true,
        default: [],
        description: 'Wind corridors between structures',
        displayName: 'Wind Corridors',
        visibility: { player: false, llm: 'summarized', agent: true, user: false, dev: true },
        ui: {
          widget: 'json',
          group: 'flight',
          order: 2,
        },
        mutable: true,
        itemType: 'object',
      },

      aerialShaQi: {
        type: 'array',
        required: true,
        default: [],
        description: 'Aerial Sha Qi lines',
        displayName: 'Aerial Sha Qi',
        visibility: { player: false, llm: 'summarized', agent: true, user: false, dev: true },
        ui: {
          widget: 'json',
          group: 'dangers',
          order: 1,
        },
        mutable: true,
        itemType: 'object',
      },

      perchingSpots: {
        type: 'array',
        required: true,
        default: [],
        description: 'Quality perching spots',
        displayName: 'Perching Spots',
        visibility: { player: false, llm: 'summarized', agent: true, user: false, dev: true },
        ui: {
          widget: 'json',
          group: 'perching',
          order: 1,
        },
        mutable: true,
        itemType: 'object',
      },

      elementBalance: {
        type: 'object',
        required: true,
        default: {
          byAltitude: {
            ground: { wood: 0, fire: 0, earth: 0, metal: 0, water: 0 },
            canopy: { wood: 0, fire: 0, earth: 0, metal: 0, water: 0 },
            flying: { wood: 0, fire: 0, earth: 0, metal: 0, water: 0 },
            high: { wood: 0, fire: 0, earth: 0, metal: 0, water: 0 },
          },
          isBalanced: true,
          dominantElement: 'none',
        },
        description: 'Volumetric element balance',
        displayName: 'Element Balance',
        visibility: { player: true, llm: 'summarized', agent: true, user: true, dev: true },
        ui: {
          widget: 'json',
          group: 'elements',
          order: 1,
        },
        mutable: true,
      },

      issues: {
        type: 'array',
        required: true,
        default: [],
        description: 'All identified issues',
        displayName: 'Issues',
        visibility: { player: true, llm: 'summarized', agent: true, user: true, dev: true },
        ui: {
          widget: 'json',
          group: 'issues',
          order: 1,
        },
        mutable: true,
        itemType: 'object',
      },

      optimalFlightAltitude: {
        type: 'number',
        required: true,
        default: 5,
        description: 'Best flight altitude for this area',
        displayName: 'Optimal Altitude',
        visibility: { player: true, llm: true, agent: true, user: true, dev: true },
        ui: {
          widget: 'slider',
          group: 'flight',
          order: 3,
        },
        mutable: true,
        min: 0,
        max: 20,
      },

      recommendedPaths: {
        type: 'array',
        required: true,
        default: [],
        description: 'Recommended flight paths (waypoint sequences)',
        displayName: 'Recommended Paths',
        visibility: { player: false, llm: false, agent: true, user: false, dev: true },
        ui: {
          widget: 'json',
          group: 'navigation',
          order: 1,
        },
        mutable: true,
        itemType: 'array',
      },

      analyzedAt: {
        type: 'number',
        required: true,
        default: 0,
        description: 'Tick when analyzed',
        displayName: 'Analyzed At',
        visibility: { player: false, llm: false, agent: false, user: false, dev: true },
        ui: {
          widget: 'readonly',
          group: 'metadata',
          order: 1,
        },
        mutable: true,
      },

      areaBounds: {
        type: 'object',
        required: true,
        default: {
          minX: 0,
          maxX: 0,
          minY: 0,
          maxY: 0,
          minZ: 0,
          maxZ: 0,
        },
        description: 'Area covered by this analysis',
        displayName: 'Area Bounds',
        visibility: { player: false, llm: false, agent: false, user: false, dev: true },
        ui: {
          widget: 'json',
          group: 'metadata',
          order: 2,
        },
        mutable: true,
      },
    },

    ui: {
      icon: '🦅',
      color: '#87CEEB',
      priority: 12,
    },

    llm: {
      promptSection: 'buildings',
      priority: 12,
      summarize: (data) => {
        const thermalCount = data.thermals.length;
        const perchCount = data.perchingSpots.length;
        const issueCount = data.issues.length;

        return `${data.harmonyLevel} aerial space (${data.harmonyScore}/100): ${thermalCount} ${thermalCount === 1 ? 'thermal' : 'thermals'}, ${perchCount} ${perchCount === 1 ? 'perch' : 'perches'}${issueCount > 0 ? `, ${issueCount} ${issueCount === 1 ? 'issue' : 'issues'}` : ''}`;
      },
    },

    validate: (data): data is AerialHarmonyComponent => {
      if (typeof data !== 'object' || data === null) return false;
      const ah = data as Record<string, unknown>;

      return (
        ah.type === 'aerial_harmony' &&
        typeof ah.harmonyScore === 'number' &&
        typeof ah.harmonyLevel === 'string' &&
        Array.isArray(ah.thermals) &&
        Array.isArray(ah.windCorridors) &&
        Array.isArray(ah.aerialShaQi) &&
        Array.isArray(ah.perchingSpots) &&
        typeof ah.elementBalance === 'object' &&
        Array.isArray(ah.issues) &&
        typeof ah.optimalFlightAltitude === 'number' &&
        Array.isArray(ah.recommendedPaths) &&
        typeof ah.analyzedAt === 'number' &&
        typeof ah.areaBounds === 'object'
      );
    },

    createDefault: () => ({
      type: 'aerial_harmony',
      version: 1,
      harmonyScore: 50,
      harmonyLevel: 'calm',
      thermals: [],
      windCorridors: [],
      aerialShaQi: [],
      perchingSpots: [],
      elementBalance: {
        byAltitude: {
          ground: { wood: 0, fire: 0, earth: 0, metal: 0, water: 0 },
          canopy: { wood: 0, fire: 0, earth: 0, metal: 0, water: 0 },
          flying: { wood: 0, fire: 0, earth: 0, metal: 0, water: 0 },
          high: { wood: 0, fire: 0, earth: 0, metal: 0, water: 0 },
        },
        isBalanced: true,
        dominantElement: 'none',
      },
      issues: [],
      optimalFlightAltitude: 5,
      recommendedPaths: [],
      analyzedAt: 0,
      areaBounds: {
        minX: 0,
        maxX: 0,
        minY: 0,
        maxY: 0,
        minZ: 0,
        maxZ: 0,
      },
    }),
  })
);
