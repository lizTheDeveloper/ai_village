/**
 * Test Component Factories
 *
 * Helper functions for creating components in integration tests.
 * These provide sensible defaults and type-safe interfaces for test components.
 */

import type { EntityId } from '../../types.js';

/**
 * Universe Component Factory (for multiverse tests)
 */
export interface UniverseComponent {
  type: 'universe';
  version: number;
  universeId: string;
  name: string;
  createdTick: number;
  parentUniverseId?: string;
  forkTick?: number;
  forkReason?: string;
  physicsConstants: {
    speedOfLight: number;
    gravitationalConstant: number;
    planckConstant: number;
  };
  timeRate: number;
  realityStability: number;
  divergencePoints: Array<{
    tick: number;
    description: string;
  }>;
}

export function createUniverseComponent(
  universeId: string,
  name: string,
  createdTick: number
): UniverseComponent {
  return {
    type: 'universe',
    version: 1,
    universeId,
    name,
    createdTick,
    physicsConstants: {
      speedOfLight: 299792458,
      gravitationalConstant: 6.674e-11,
      planckConstant: 6.626e-34,
    },
    timeRate: 1.0,
    realityStability: 1.0,
    divergencePoints: [],
  };
}

/**
 * Paradox Component Factory
 */
export interface ParadoxComponent {
  type: 'paradox';
  version: number;
  paradoxId: string;
  universeId: string;
  paradoxType: string;
  severity: number;
  description: string;
  location?: { x: number; y: number };
  affectedEvents: string[];
}

export function createParadoxComponent(
  paradoxId: string,
  universeId: string,
  config: {
    type: string;
    severity: number;
    description: string;
    location?: { x: number; y: number };
    affectedEvents?: string[];
  }
): ParadoxComponent {
  if (config.severity < 0 || config.severity > 1) {
    throw new Error('Severity must be between 0 and 1');
  }

  return {
    type: 'paradox',
    version: 1,
    paradoxId,
    universeId,
    paradoxType: config.type,
    severity: config.severity,
    description: config.description,
    location: config.location,
    affectedEvents: config.affectedEvents || [],
  };
}

/**
 * Timeline Component Factory
 */
export interface TimelineComponent {
  type: 'timeline';
  version: number;
  timelineId: string;
  universeId: string;
  events: Array<{
    eventId: string;
    tick: number;
    description: string;
  }>;
}

export function createTimelineComponent(
  timelineId: string,
  universeId: string
): TimelineComponent {
  return {
    type: 'timeline',
    version: 1,
    timelineId,
    universeId,
    events: [],
  };
}

/**
 * Causal Chain Component Factory
 */
export interface CausalChainComponent {
  type: 'causal_chain';
  version: number;
  chainId: string;
  universeId: string;
  events: Array<{
    eventId: string;
    eventType: string;
    tick: number;
    causedBy: string | null;
  }>;
}

export function createCausalChainComponent(
  chainId: string,
  universeId: string
): CausalChainComponent {
  return {
    type: 'causal_chain',
    version: 1,
    chainId,
    universeId,
    events: [],
  };
}

/**
 * Invasion Component Factory
 */
export interface InvasionComponent {
  type: 'invasion';
  version: number;
  invasionId: string;
  sourceUniverseId: string;
  targetUniverseId: string;
  invasionType: string;
  strength: number;
  entryPoint: { x: number; y: number };
  status?: string;
}

export function createInvasionComponent(
  invasionId: string,
  config: {
    sourceUniverseId: string;
    targetUniverseId: string;
    invasionType: string;
    strength: number;
    entryPoint: { x: number; y: number };
  }
): InvasionComponent {
  return {
    type: 'invasion',
    version: 1,
    invasionId,
    ...config,
    status: 'active',
  };
}

/**
 * Plot Component Factory
 */
export interface PlotComponent {
  type: 'plot';
  version: number;
  plotId: string;
  plotType: string;
  templateId: string;
  status: string;
  metadata?: Record<string, any>;
}

export function createPlotComponent(
  plotId: string,
  config: {
    plotType: string;
    templateId: string;
    status: string;
    metadata?: Record<string, any>;
  }
): PlotComponent {
  return {
    type: 'plot',
    version: 1,
    plotId,
    ...config,
  };
}

/**
 * Settlement Component Factory
 */
export interface SettlementComponent {
  type: 'settlement';
  version: number;
  name: string;
  population: number;
  tier?: number;
}

export function createSettlementComponent(
  name: string,
  population: number
): SettlementComponent {
  return {
    type: 'settlement',
    version: 1,
    name,
    population,
    tier: 1,
  };
}

/**
 * Shipping Lane Component Factory
 */
export interface ShippingLaneComponent {
  type: 'shipping_lane';
  version: number;
  fromNodeId: EntityId;
  toNodeId: EntityId;
  capacity: number;
  currentFlow?: number;
  status?: string;
}

export function createShippingLaneComponent(
  fromNodeId: EntityId,
  toNodeId: EntityId,
  capacity: number
): ShippingLaneComponent {
  return {
    type: 'shipping_lane',
    version: 1,
    fromNodeId,
    toNodeId,
    capacity,
    currentFlow: 0,
    status: 'active',
  };
}

/**
 * Civilization Component Factory
 */
export interface CivilizationComponent {
  type: 'civilization';
  version: number;
  name: string;
  era: number;
  technology?: Record<string, boolean>;
}

export function createCivilizationComponent(
  name: string,
  era: number
): CivilizationComponent {
  return {
    type: 'civilization',
    version: 1,
    name,
    era,
    technology: {},
  };
}

/**
 * Mining Operation Component Factory
 */
export interface MiningOperationComponent {
  type: 'mining_operation';
  version: number;
  depositId: EntityId;
  civilizationId: EntityId;
  resourceType: string;
  yieldRate: number;
  efficiency: number;
  workers: number;
  status?: string;
}

export function createMiningOperationComponent(
  depositId: EntityId,
  civilizationId: EntityId,
  resourceType: string,
  config: {
    yieldRate: number;
    efficiency: number;
    workers: number;
  }
): MiningOperationComponent {
  return {
    type: 'mining_operation',
    version: 1,
    depositId,
    civilizationId,
    resourceType,
    ...config,
    status: 'active',
  };
}

/**
 * Exploration Mission Component Factory
 */
export interface ExplorationMissionComponent {
  type: 'exploration_mission';
  version: number;
  missionId: string;
  civilizationId: EntityId;
  targetLocation: { x: number; y: number };
  missionType: string;
  status: string;
}

export function createExplorationMissionComponent(
  missionId: string,
  civilizationId: EntityId,
  config: {
    targetLocation: { x: number; y: number };
    missionType: string;
    status: string;
  }
): ExplorationMissionComponent {
  return {
    type: 'exploration_mission',
    version: 1,
    missionId,
    civilizationId,
    ...config,
  };
}
