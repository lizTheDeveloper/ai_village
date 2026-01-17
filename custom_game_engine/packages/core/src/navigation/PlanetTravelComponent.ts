/**
 * PlanetTravelComponent - Tracks entity travel state between planets
 *
 * This component is added to entities that are actively in transit between planets.
 * It tracks the travel method, progress, and destination. Once travel completes,
 * this component is removed and the PlanetLocationComponent is updated.
 *
 * Travel methods:
 * - portal: Instant travel through PlanetPortal entity
 * - spacecraft: Travel via Spaceship (takes time, follows emotional journey)
 * - ritual: Magical/divine teleportation (rare, costly)
 * - passage: Cross-universe passage that also changes planet
 */

import type { Component } from '../ecs/Component.js';

// ============================================================================
// Types
// ============================================================================

export type PlanetTravelMethod = 'portal' | 'spacecraft' | 'ritual' | 'passage';

export type PlanetTravelState =
  | 'preparing'     // Entity is preparing to travel (gathering at portal, boarding ship)
  | 'in_transit'    // Entity is actively traveling
  | 'arriving'      // Entity is arriving at destination
  | 'complete'      // Travel complete (component will be removed)
  | 'failed';       // Travel failed (entity returns to origin)

export interface TravelWaypoint {
  /** Intermediate planet ID (for multi-hop journeys) */
  planetId: string;

  /** Expected arrival tick at this waypoint */
  expectedArrivalTick: number;

  /** Whether this waypoint has been reached */
  reached: boolean;
}

// ============================================================================
// Interface
// ============================================================================

/**
 * Component for entities actively traveling between planets.
 *
 * Added when travel begins, removed when travel completes.
 */
export interface PlanetTravelComponent extends Component {
  type: 'planet_travel';

  /** Origin planet ID */
  originPlanetId: string;

  /** Destination planet ID */
  destinationPlanetId: string;

  /** Travel method being used */
  travelMethod: PlanetTravelMethod;

  /** Current travel state */
  state: PlanetTravelState;

  /** Tick when travel started */
  startTick: number;

  /** Expected arrival tick (0 for instant travel) */
  expectedArrivalTick: number;

  /** Progress 0-1 for timed travel */
  progress: number;

  // Portal travel specifics
  portal?: {
    /** Portal entity ID */
    portalId: string;

    /** Exit position on destination planet */
    exitPosition?: { x: number; y: number };
  };

  // Spacecraft travel specifics
  spacecraft?: {
    /** Ship entity ID */
    shipId: string;

    /** Waypoints for multi-leg journey */
    waypoints: TravelWaypoint[];

    /** Current emotional state required for navigation */
    currentEmotionalTarget?: Record<string, number>;

    /** Whether this is a β-space jump or physical travel */
    isBetaSpaceJump: boolean;
  };

  // Ritual travel specifics
  ritual?: {
    /** Ritual type that enabled travel */
    ritualType: string;

    /** Cost already paid (item IDs consumed) */
    costPaid: Array<{ itemId: string; quantity: number }>;

    /** Divine entity that enabled travel (if applicable) */
    divineEntityId?: string;
  };

  /** Failure reason if state is 'failed' */
  failureReason?: string;

  /** Return to origin on failure? */
  canReturnOnFailure: boolean;
}

// ============================================================================
// Factory Functions
// ============================================================================

/**
 * Create a planet travel component for portal travel (instant).
 */
export function createPortalTravelComponent(
  originPlanetId: string,
  destinationPlanetId: string,
  portalId: string,
  tick: number,
  exitPosition?: { x: number; y: number }
): PlanetTravelComponent {
  return {
    type: 'planet_travel',
    version: 1,
    originPlanetId,
    destinationPlanetId,
    travelMethod: 'portal',
    state: 'in_transit',
    startTick: tick,
    expectedArrivalTick: tick + 1, // Instant travel
    progress: 0,
    portal: {
      portalId,
      exitPosition,
    },
    canReturnOnFailure: true,
  };
}

/**
 * Create a planet travel component for spacecraft travel.
 */
export function createSpacecraftTravelComponent(
  originPlanetId: string,
  destinationPlanetId: string,
  shipId: string,
  tick: number,
  travelDuration: number,
  isBetaSpaceJump: boolean = false,
  waypoints: TravelWaypoint[] = []
): PlanetTravelComponent {
  return {
    type: 'planet_travel',
    version: 1,
    originPlanetId,
    destinationPlanetId,
    travelMethod: 'spacecraft',
    state: 'preparing',
    startTick: tick,
    expectedArrivalTick: tick + travelDuration,
    progress: 0,
    spacecraft: {
      shipId,
      waypoints,
      isBetaSpaceJump,
    },
    canReturnOnFailure: true,
  };
}

/**
 * Create a planet travel component for ritual travel.
 */
export function createRitualTravelComponent(
  originPlanetId: string,
  destinationPlanetId: string,
  ritualType: string,
  tick: number,
  costPaid: Array<{ itemId: string; quantity: number }> = [],
  divineEntityId?: string
): PlanetTravelComponent {
  return {
    type: 'planet_travel',
    version: 1,
    originPlanetId,
    destinationPlanetId,
    travelMethod: 'ritual',
    state: 'in_transit',
    startTick: tick,
    expectedArrivalTick: tick + 20, // Short ritual animation time
    progress: 0,
    ritual: {
      ritualType,
      costPaid,
      divineEntityId,
    },
    canReturnOnFailure: false, // Rituals may not allow return
  };
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Update travel progress based on current tick.
 */
export function updateTravelProgress(
  component: PlanetTravelComponent,
  currentTick: number
): void {
  if (component.state === 'complete' || component.state === 'failed') {
    return;
  }

  const totalDuration = component.expectedArrivalTick - component.startTick;
  if (totalDuration <= 0) {
    component.progress = 1;
    component.state = 'arriving';
    return;
  }

  const elapsed = currentTick - component.startTick;
  component.progress = Math.min(1, Math.max(0, elapsed / totalDuration));

  // Update state based on progress
  if (component.progress >= 1) {
    component.state = 'arriving';
  } else if (component.progress > 0) {
    component.state = 'in_transit';
  }
}

/**
 * Mark travel as complete.
 */
export function completePlanetTravel(component: PlanetTravelComponent): void {
  component.state = 'complete';
  component.progress = 1;
}

/**
 * Mark travel as failed.
 */
export function failPlanetTravel(
  component: PlanetTravelComponent,
  reason: string
): void {
  component.state = 'failed';
  component.failureReason = reason;
}

/**
 * Check if travel is instant (portal/ritual) or requires time.
 */
export function isInstantTravel(component: PlanetTravelComponent): boolean {
  return (
    component.travelMethod === 'portal' ||
    (component.expectedArrivalTick - component.startTick) <= 1
  );
}

/**
 * Get estimated remaining travel time in ticks.
 */
export function getRemainingTravelTime(
  component: PlanetTravelComponent,
  currentTick: number
): number {
  if (component.state === 'complete' || component.state === 'failed') {
    return 0;
  }
  return Math.max(0, component.expectedArrivalTick - currentTick);
}
