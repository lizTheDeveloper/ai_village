import type { Component, ComponentSchema } from '../ecs/Component.js';
import type { SpaceshipType } from '../navigation/SpaceshipComponent.js';

// ============================================================================
// Types
// ============================================================================

export type SquadronFormation =
  | 'line'      // Ships in line (simple formation)
  | 'wedge'     // V formation (focus fire)
  | 'sphere'    // Defensive ball (protect flagship)
  | 'scattered'; // No formation (independent)

export type SquadronMissionType =
  | 'patrol'          // Monitor area
  | 'escort'          // Protect trade ship
  | 'assault'         // Attack target
  | 'exploration';    // Map β-space branches

// ============================================================================
// Interface
// ============================================================================

/**
 * Squadron - tactical ship formation (3-10 ships)
 * Tier 2 of ship-fleet hierarchy
 */
export interface SquadronComponent extends Component {
  type: 'squadron';

  squadronId: string;
  name: string;

  /**
   * Squadron composition (3-10 ships)
   */
  shipIds: string[];

  /**
   * Lead ship in formation
   */
  flagshipId: string;

  /**
   * Soul agent commander (captain of flagship)
   */
  commanderAgentId?: string;

  /**
   * Aggregate statistics from member ships
   */
  totalCrew: number;

  /**
   * Average coherence weighted by ship crew size
   * Squadron can only β-jump if this exceeds threshold
   */
  averageCoherence: number;

  /**
   * Combined combat strength
   */
  combatStrength: number;

  /**
   * Formation type (affects combat and navigation)
   */
  formation: SquadronFormation;

  /**
   * Current squadron mission
   */
  currentMission?: {
    type: SquadronMissionType;
    targetId?: string;  // Target entity ID (for assault/escort)
    startTick: number;
  };

  /**
   * Ship type breakdown
   */
  shipTypeBreakdown: Record<SpaceshipType, number>;
}

// ============================================================================
// Factory Functions
// ============================================================================

export function createSquadronComponent(
  name: string,
  shipIds: string[],
  flagshipId: string,
  commanderAgentId?: string
): SquadronComponent {
  if (shipIds.length < 3 || shipIds.length > 10) {
    throw new Error(`Squadron must have 3-10 ships, got ${shipIds.length}`);
  }

  if (!shipIds.includes(flagshipId)) {
    throw new Error('Flagship must be one of the squadron ships');
  }

  return {
    type: 'squadron',
    version: 1,
    squadronId: `squadron_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
    name,
    shipIds,
    flagshipId,
    commanderAgentId,
    totalCrew: 0,
    averageCoherence: 0,
    combatStrength: 0,
    formation: 'line',
    shipTypeBreakdown: {} as Record<SpaceshipType, number>,
  };
}

// ============================================================================
// Schema
// ============================================================================

export const SquadronComponentSchema: ComponentSchema<SquadronComponent> = {
  type: 'squadron',
  version: 1,
  fields: [
    { name: 'squadronId', type: 'string', required: true },
    { name: 'name', type: 'string', required: true },
    { name: 'shipIds', type: 'array', required: true },
    { name: 'flagshipId', type: 'string', required: true },
    { name: 'commanderAgentId', type: 'string', required: false },
    { name: 'totalCrew', type: 'number', required: true },
    { name: 'averageCoherence', type: 'number', required: true },
    { name: 'combatStrength', type: 'number', required: true },
    { name: 'formation', type: 'string', required: true },
    { name: 'currentMission', type: 'object', required: false },
    { name: 'shipTypeBreakdown', type: 'object', required: true },
  ],
  validate: (data: unknown): data is SquadronComponent => {
    if (typeof data !== 'object' || data === null) return false;
    if (!('type' in data) || data.type !== 'squadron') return false;
    if (!('squadronId' in data) || typeof data.squadronId !== 'string') return false;
    if (!('name' in data) || typeof data.name !== 'string') return false;
    if (!('shipIds' in data) || !Array.isArray(data.shipIds)) return false;
    if (!('flagshipId' in data) || typeof data.flagshipId !== 'string') return false;
    return true;
  },
  createDefault: () => createSquadronComponent(
    'Default Squadron',
    ['ship1', 'ship2', 'ship3'],
    'ship1'
  ),
};
