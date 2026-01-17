/**
 * PlanetPortalComponent - Intra-universe portal between planets
 *
 * Planet portals are distinct from Passages (cross-universe) and Realm Portals.
 * They enable travel between planets within the same universe.
 *
 * Discovery methods:
 * - exploration: Found by exploring the world
 * - research: Unlocked through portal research progression
 * - quest: Revealed through completing quests
 * - random: Naturally appearing portals (rare)
 *
 * Based on universe-system/spec.md PlanetPortal interface.
 */

import type { Component } from '../ecs/Component.js';

// ============================================================================
// Types
// ============================================================================

export type PortalDiscoveryMethod = 'exploration' | 'research' | 'quest' | 'random';

export type PortalActivationState =
  | 'undiscovered'   // Portal exists but not found
  | 'discovered'     // Found but not activated
  | 'activating'     // Activation ritual in progress
  | 'active'         // Fully functional
  | 'unstable'       // Working but unreliable
  | 'dormant'        // Temporarily inactive
  | 'collapsed';     // Permanently destroyed

export interface PortalCost {
  /** Item ID required */
  itemId: string;

  /** Quantity required per use */
  quantity: number;
}

// ============================================================================
// Interface
// ============================================================================

/**
 * Component for portal entities that enable planet-to-planet travel.
 *
 * Different from PassageComponent (universe-to-universe) and
 * PortalComponent (mortal world to realms).
 */
export interface PlanetPortalComponent extends Component {
  type: 'planet_portal';

  /** Unique portal ID */
  portalId: string;

  /** Source planet ID (where this portal is located) */
  fromPlanetId: string;

  /** Target planet ID (where this portal leads) */
  toPlanetId: string;

  /** Position on source planet (in world coordinates) */
  fromPosition: { x: number; y: number };

  /** Position on target planet where entities emerge */
  toPosition?: { x: number; y: number };

  /** Current activation state */
  state: PortalActivationState;

  /** Whether the portal works both ways */
  bidirectional: boolean;

  /** Discovery information */
  discovery: {
    /** How this portal was/can be discovered */
    method: PortalDiscoveryMethod;

    /** Entity ID that discovered this portal (if discovered) */
    discoveredBy?: string;

    /** Tick when discovered */
    discoveredAt?: number;

    /** Whether discovered */
    discovered: boolean;
  };

  /** Activation information */
  activation: {
    /** Whether currently activated and usable */
    activated: boolean;

    /** Items required to activate (one-time cost) */
    activationCost: PortalCost[];

    /** Entity ID that activated this portal */
    activatedBy?: string;

    /** Tick when activated */
    activatedAt?: number;
  };

  /** Usage requirements and limits */
  usage: {
    /** Items consumed per use */
    usageCost: PortalCost[];

    /** Ticks between uses (0 = no cooldown) */
    cooldown: number;

    /** Current cooldown remaining */
    cooldownRemaining: number;

    /** Last use tick */
    lastUseTick: number;

    /** Total uses (for statistics) */
    totalUses: number;

    /** Maximum uses before collapse (-1 = unlimited) */
    maxUses: number;
  };

  /** Portal stability (affects reliability) */
  stability: {
    /** Current stability 0-1 */
    current: number;

    /** Maximum stability */
    max: number;

    /** Stability decay per use */
    decayPerUse: number;

    /** Stability regeneration per tick */
    regenPerTick: number;

    /** Stability threshold below which portal becomes unstable */
    unstableThreshold: number;
  };

  /** Visual appearance */
  visual: {
    /** Visual effect type */
    effectType: 'swirling_energy' | 'stargate' | 'crystal_arch' | 'ancient_stones' | 'natural_rift';

    /** Primary color (hex) */
    primaryColor: string;

    /** Secondary color (hex) */
    secondaryColor?: string;

    /** Scale relative to standard portal (1.0 = normal) */
    scale: number;
  };
}

// ============================================================================
// Factory Functions
// ============================================================================

/**
 * Create a standard planet portal.
 */
export function createPlanetPortalComponent(
  portalId: string,
  fromPlanetId: string,
  toPlanetId: string,
  fromPosition: { x: number; y: number },
  options: {
    toPosition?: { x: number; y: number };
    bidirectional?: boolean;
    discoveryMethod?: PortalDiscoveryMethod;
    effectType?: PlanetPortalComponent['visual']['effectType'];
    primaryColor?: string;
  } = {}
): PlanetPortalComponent {
  return {
    type: 'planet_portal',
    version: 1,
    portalId,
    fromPlanetId,
    toPlanetId,
    fromPosition,
    toPosition: options.toPosition,
    state: 'undiscovered',
    bidirectional: options.bidirectional ?? false,
    discovery: {
      method: options.discoveryMethod ?? 'exploration',
      discovered: false,
    },
    activation: {
      activated: false,
      activationCost: [],
    },
    usage: {
      usageCost: [],
      cooldown: 0,
      cooldownRemaining: 0,
      lastUseTick: 0,
      totalUses: 0,
      maxUses: -1, // Unlimited by default
    },
    stability: {
      current: 1.0,
      max: 1.0,
      decayPerUse: 0,
      regenPerTick: 0,
      unstableThreshold: 0.3,
    },
    visual: {
      effectType: options.effectType ?? 'swirling_energy',
      primaryColor: options.primaryColor ?? '#4a90d9',
      scale: 1.0,
    },
  };
}

/**
 * Create a discovered and activated portal (for pre-existing portals).
 */
export function createActivePlanetPortal(
  portalId: string,
  fromPlanetId: string,
  toPlanetId: string,
  fromPosition: { x: number; y: number },
  toPosition: { x: number; y: number },
  bidirectional: boolean = true
): PlanetPortalComponent {
  const portal = createPlanetPortalComponent(
    portalId,
    fromPlanetId,
    toPlanetId,
    fromPosition,
    { toPosition, bidirectional }
  );

  // Mark as discovered and activated
  portal.state = 'active';
  portal.discovery.discovered = true;
  portal.discovery.method = 'quest'; // Pre-existing portals are often quest-related
  portal.activation.activated = true;

  return portal;
}

/**
 * Create an unstable natural rift portal.
 */
export function createNaturalRiftPortal(
  portalId: string,
  fromPlanetId: string,
  toPlanetId: string,
  fromPosition: { x: number; y: number },
  toPosition?: { x: number; y: number }
): PlanetPortalComponent {
  const portal = createPlanetPortalComponent(
    portalId,
    fromPlanetId,
    toPlanetId,
    fromPosition,
    {
      toPosition,
      bidirectional: false, // Natural rifts are one-way
      discoveryMethod: 'random',
      effectType: 'natural_rift',
      primaryColor: '#7b2d8e', // Purple for natural rifts
    }
  );

  // Natural rifts are unstable
  portal.stability = {
    current: 0.5,
    max: 0.7,
    decayPerUse: 0.05,
    regenPerTick: 0.0001,
    unstableThreshold: 0.3,
  };

  // Already discovered (they appear suddenly)
  portal.state = 'active';
  portal.discovery.discovered = true;
  portal.activation.activated = true;

  return portal;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Discover a portal.
 */
export function discoverPortal(
  portal: PlanetPortalComponent,
  discoveredBy: string,
  tick: number
): void {
  portal.discovery.discovered = true;
  portal.discovery.discoveredBy = discoveredBy;
  portal.discovery.discoveredAt = tick;

  if (portal.state === 'undiscovered') {
    portal.state = 'discovered';
  }
}

/**
 * Activate a portal (assumes activation cost has been paid).
 */
export function activatePortal(
  portal: PlanetPortalComponent,
  activatedBy: string,
  tick: number
): boolean {
  if (!portal.discovery.discovered) {
    return false; // Must be discovered first
  }

  if (portal.state === 'collapsed') {
    return false; // Cannot activate collapsed portal
  }

  portal.activation.activated = true;
  portal.activation.activatedBy = activatedBy;
  portal.activation.activatedAt = tick;
  portal.state = 'active';

  return true;
}

/**
 * Check if portal can be used right now.
 */
export function canUsePortal(
  portal: PlanetPortalComponent,
  tick: number
): { canUse: boolean; reason?: string } {
  if (!portal.discovery.discovered) {
    return { canUse: false, reason: 'Portal not discovered' };
  }

  if (!portal.activation.activated) {
    return { canUse: false, reason: 'Portal not activated' };
  }

  if (portal.state !== 'active' && portal.state !== 'unstable') {
    return { canUse: false, reason: `Portal is ${portal.state}` };
  }

  if (portal.usage.cooldownRemaining > 0) {
    return { canUse: false, reason: `Cooldown: ${portal.usage.cooldownRemaining} ticks remaining` };
  }

  if (portal.usage.maxUses > 0 && portal.usage.totalUses >= portal.usage.maxUses) {
    return { canUse: false, reason: 'Portal has no remaining uses' };
  }

  if (portal.stability.current <= 0) {
    return { canUse: false, reason: 'Portal has collapsed' };
  }

  return { canUse: true };
}

/**
 * Use the portal (track usage, apply cooldown, degrade stability).
 */
export function usePortal(
  portal: PlanetPortalComponent,
  tick: number
): { success: boolean; unstable: boolean } {
  const check = canUsePortal(portal, tick);
  if (!check.canUse) {
    return { success: false, unstable: false };
  }

  // Track usage
  portal.usage.totalUses++;
  portal.usage.lastUseTick = tick;
  portal.usage.cooldownRemaining = portal.usage.cooldown;

  // Degrade stability
  portal.stability.current = Math.max(
    0,
    portal.stability.current - portal.stability.decayPerUse
  );

  // Check if became unstable
  const unstable = portal.stability.current < portal.stability.unstableThreshold;
  if (unstable) {
    portal.state = 'unstable';
  }

  // Check if collapsed
  if (portal.stability.current <= 0) {
    portal.state = 'collapsed';
    return { success: true, unstable: true }; // Last use succeeded
  }

  return { success: true, unstable };
}

/**
 * Update portal each tick (cooldown, stability regen).
 */
export function updatePortal(portal: PlanetPortalComponent): void {
  // Reduce cooldown
  if (portal.usage.cooldownRemaining > 0) {
    portal.usage.cooldownRemaining--;
  }

  // Regenerate stability (if not collapsed)
  if (portal.state !== 'collapsed' && portal.stability.current < portal.stability.max) {
    portal.stability.current = Math.min(
      portal.stability.max,
      portal.stability.current + portal.stability.regenPerTick
    );

    // Check if recovered from unstable
    if (
      portal.state === 'unstable' &&
      portal.stability.current >= portal.stability.unstableThreshold
    ) {
      portal.state = 'active';
    }
  }
}

/**
 * Check if entity can afford portal usage cost.
 */
export function calculatePortalCost(
  portal: PlanetPortalComponent,
  includeActivation: boolean = false
): PortalCost[] {
  const costs: PortalCost[] = [...portal.usage.usageCost];

  if (includeActivation && !portal.activation.activated) {
    costs.push(...portal.activation.activationCost);
  }

  return costs;
}

/**
 * Get the linked portal on the destination planet (for bidirectional portals).
 *
 * Returns the portal ID that should exist on the destination planet.
 */
export function getLinkedPortalId(portal: PlanetPortalComponent): string | null {
  if (!portal.bidirectional) {
    return null;
  }

  // Convention: linked portal ID is original ID with planets swapped
  return `${portal.portalId}:reverse`;
}
