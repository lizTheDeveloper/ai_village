/**
 * GovernanceBlueprints - Building blueprints for governance/information buildings
 *
 * Governance Infrastructure & Information Systems
 * Creates blueprints for governance buildings that collect and provide information
 * about the population. Better infrastructure = better information.
 *
 * Per CLAUDE.md: No silent fallbacks - all required fields must be provided.
 */

import type { BuildingBlueprint } from './BuildingBlueprintRegistry.js';
import type { BuildingBlueprintRegistry } from './BuildingBlueprintRegistry.js';

/**
 * Governance building blueprints (Information infrastructure)
 * These buildings unlock dashboard panels and provide data to both agents and players.
 */
export const GOVERNANCE_BLUEPRINTS: BuildingBlueprint[] = [
  {
    id: 'town-hall',
    name: 'Town Hall',
    description: 'Basic governance building. Tracks population count, agent roster, births, and deaths',
    category: 'community',
    width: 4,
    height: 4,
    resourceCost: [
      { resourceId: 'wood', amountRequired: 50 },
      { resourceId: 'stone', amountRequired: 20 },
    ],
    techRequired: [],
    terrainRequired: ['grass', 'dirt'],
    terrainForbidden: ['water', 'deep_water'],
    skillRequired: { skill: 'building', level: 2 },
    unlocked: true,
    buildTime: 240, // 4 hours at 1 second = 1 minute game time
    tier: 1,
    functionality: [],
    canRotate: true,
    rotationAngles: [0, 90, 180, 270],
    snapToGrid: true,
    requiresFoundation: false,
  },
  {
    id: 'census-bureau',
    name: 'Census Bureau',
    description: 'Demographics and analytics. Tracks age distribution, birth/death rates, and population projections. Requires Town Hall. Must be staffed',
    category: 'community',
    width: 3,
    height: 3,
    resourceCost: [
      { resourceId: 'wood', amountRequired: 100 },
      { resourceId: 'stone', amountRequired: 50 },
      { resourceId: 'cloth', amountRequired: 20 },
    ],
    techRequired: [],
    terrainRequired: ['grass', 'dirt'],
    terrainForbidden: ['water', 'deep_water'],
    skillRequired: { skill: 'building', level: 4 },
    unlocked: true,
    buildTime: 480, // 8 hours
    tier: 2,
    functionality: [],
    canRotate: true,
    rotationAngles: [0, 90, 180, 270],
    snapToGrid: true,
    requiresFoundation: false,
  },
  {
    id: 'warehouse',
    name: 'Granary / Resource Warehouse',
    description: 'Resource tracking. Shows stockpiles, production/consumption rates, and days until depletion',
    category: 'storage',
    width: 4,
    height: 3,
    resourceCost: [
      { resourceId: 'wood', amountRequired: 80 },
      { resourceId: 'stone', amountRequired: 30 },
    ],
    techRequired: [],
    terrainRequired: ['grass', 'dirt'],
    terrainForbidden: ['water', 'deep_water'],
    skillRequired: { skill: 'building', level: 4 },
    unlocked: true,
    buildTime: 360, // 6 hours
    tier: 1,
    functionality: [
      {
        type: 'storage',
        itemTypes: ['food', 'wood', 'stone', 'iron', 'cloth'],
        capacity: 1000,
      },
    ],
    canRotate: true,
    rotationAngles: [0, 90, 180, 270],
    snapToGrid: true,
    requiresFoundation: false,
  },
  {
    id: 'weather-station',
    name: 'Weather Station',
    description: 'Environmental monitoring. Provides temperature forecasts and extreme weather warnings. Must be placed in open area',
    category: 'community',
    width: 2,
    height: 2,
    resourceCost: [
      { resourceId: 'wood', amountRequired: 60 },
      { resourceId: 'stone', amountRequired: 40 },
      { resourceId: 'iron', amountRequired: 10 },
    ],
    techRequired: [],
    terrainRequired: ['grass', 'dirt'],
    terrainForbidden: ['water', 'deep_water'],
    skillRequired: { skill: 'building', level: 3 },
    unlocked: true,
    buildTime: 300, // 5 hours
    tier: 1,
    functionality: [],
    canRotate: false,
    rotationAngles: [0],
    snapToGrid: true,
    requiresFoundation: false,
  },
  {
    id: 'health-clinic',
    name: 'Health Clinic',
    description: 'Medical tracking. Monitors population health, diseases, malnutrition, and causes of death. Must be staffed by healers',
    category: 'community',
    width: 4,
    height: 4,
    resourceCost: [
      { resourceId: 'wood', amountRequired: 100 },
      { resourceId: 'stone', amountRequired: 50 },
      { resourceId: 'cloth', amountRequired: 30 },
    ],
    techRequired: [],
    terrainRequired: ['grass', 'dirt'],
    terrainForbidden: ['water', 'deep_water'],
    skillRequired: { skill: 'building', level: 4 },
    unlocked: true,
    buildTime: 600, // 10 hours
    tier: 2,
    functionality: [],
    canRotate: true,
    rotationAngles: [0, 90, 180, 270],
    snapToGrid: true,
    requiresFoundation: false,
  },
  {
    id: 'meeting-hall',
    name: 'Meeting Hall',
    description: 'Social cohesion tracking. Maps social networks, tracks relationships, detects conflicts, and monitors morale',
    category: 'community',
    width: 5,
    height: 4,
    resourceCost: [
      { resourceId: 'wood', amountRequired: 120 },
      { resourceId: 'stone', amountRequired: 60 },
    ],
    techRequired: [],
    terrainRequired: ['grass', 'dirt'],
    terrainForbidden: ['water', 'deep_water'],
    skillRequired: { skill: 'building', level: 3 },
    unlocked: true,
    buildTime: 480, // 8 hours
    tier: 2,
    functionality: [
      {
        type: 'mood_aura',
        moodBonus: 10,
        radius: 10,
      },
    ],
    canRotate: true,
    rotationAngles: [0, 90, 180, 270],
    snapToGrid: true,
    requiresFoundation: false,
  },
  {
    id: 'watchtower',
    name: 'Watchtower',
    description: 'Threat detection. Provides early warning of environmental threats and resource crises. Must be staffed by watchman',
    category: 'community',
    width: 2,
    height: 2,
    resourceCost: [
      { resourceId: 'wood', amountRequired: 80 },
      { resourceId: 'stone', amountRequired: 60 },
    ],
    techRequired: [],
    terrainRequired: ['grass', 'dirt'],
    terrainForbidden: ['water', 'deep_water'],
    skillRequired: { skill: 'building', level: 2 },
    unlocked: true,
    buildTime: 360, // 6 hours
    tier: 1,
    functionality: [],
    canRotate: false,
    rotationAngles: [0],
    snapToGrid: true,
    requiresFoundation: false,
  },
  {
    id: 'labor-guild',
    name: 'Labor Guild',
    description: 'Workforce management. Tracks labor allocation, skill inventory, and identifies bottlenecks. Requires Town Hall',
    category: 'community',
    width: 3,
    height: 3,
    resourceCost: [
      { resourceId: 'wood', amountRequired: 90 },
      { resourceId: 'stone', amountRequired: 40 },
    ],
    techRequired: [],
    terrainRequired: ['grass', 'dirt'],
    terrainForbidden: ['water', 'deep_water'],
    skillRequired: { skill: 'building', level: 4 },
    unlocked: true,
    buildTime: 420, // 7 hours
    tier: 2,
    functionality: [],
    canRotate: true,
    rotationAngles: [0, 90, 180, 270],
    snapToGrid: true,
    requiresFoundation: false,
  },
  {
    id: 'archive',
    name: 'Archive / Library',
    description: 'Historical data and analysis. Provides long-term trend analysis, generational comparisons, and predictive modeling. Requires Census Bureau and Town Hall. Must be staffed by scholar',
    category: 'research',
    width: 4,
    height: 4,
    resourceCost: [
      { resourceId: 'wood', amountRequired: 150 },
      { resourceId: 'stone', amountRequired: 80 },
      { resourceId: 'cloth', amountRequired: 50 },
    ],
    techRequired: [],
    terrainRequired: ['grass', 'dirt'],
    terrainForbidden: ['water', 'deep_water'],
    skillRequired: { skill: 'building', level: 5 },
    unlocked: true,
    buildTime: 720, // 12 hours
    tier: 3,
    functionality: [
      {
        type: 'research',
        fields: ['demographics', 'history', 'social_science'],
        bonus: 1.5,
      },
    ],
    canRotate: true,
    rotationAngles: [0, 90, 180, 270],
    snapToGrid: true,
    requiresFoundation: false,
  },
];

/**
 * Register governance blueprints with the blueprint registry.
 * Called during initialization to make governance buildings available.
 *
 * @param registry - The BuildingBlueprintRegistry to register blueprints with
 * @throws Error if blueprint validation fails or if blueprint already exists
 */
export function registerGovernanceBlueprints(registry: BuildingBlueprintRegistry): void {
  for (const blueprint of GOVERNANCE_BLUEPRINTS) {
    registry.register(blueprint);
  }
}
