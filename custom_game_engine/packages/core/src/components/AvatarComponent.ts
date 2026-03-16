/**
 * AvatarComponent - ECS component tracking a single player avatar entity.
 *
 * Distinct from the deity AvatarSystem. This component is placed on avatar
 * entities that players jack into via AvatarManagementSystem.
 *
 * Component type string: 'avatar_entity' (avoids collision with deity AvatarSystem).
 */

import type { Component } from '../ecs/Component.js';
import type { AvatarState, AvatarSessionStats, AvatarRespawnOption, AvatarStance, AvatarSkillBonus } from '../types/AvatarTypes.js';
import { createEmptySessionStats } from '../types/AvatarTypes.js';

export interface AvatarComponent extends Component {
  type: 'avatar_entity';
  version: number;

  /** Unique identifier for this avatar (distinct from entity ID) */
  avatarId: string;

  /** Agent currently jacked in, or null if unbound/dormant/suspended/destroyed */
  boundAgentId: string | null;

  /** Current lifecycle state */
  state: AvatarState;

  /** Display name for this avatar */
  name: string;

  /** Species identifier (optional) */
  species?: string;

  /** Saved respawn point; null if never set */
  respawnPoint: { x: number; y: number } | null;

  /** Stats for the current jack-in session (reset on jack-out) */
  sessionStats: AvatarSessionStats;

  /** Cumulative stats across all sessions */
  totalStats: AvatarSessionStats;

  /** World tick when this avatar entity was first created */
  createdAtTick: number;

  /** World tick when this avatar was last in the 'bound' state */
  lastActiveTick: number;

  /** Total number of deaths this avatar has experienced */
  deathCount: number;

  /** Respawn options populated on death; cleared after respawn */
  pendingRespawnOptions: AvatarRespawnOption[] | null;

  /** Tick at which auto-respawn fires if the player hasn't chosen; null if not dead */
  autoRespawnDeadlineTick: number | null;

  /** Current body stance (spec §Avatar Actions / Body Control) */
  stance: AvatarStance;

  /** Most recent emote performed; null if none since last jack-in */
  lastEmote: string | null;

  /** Tick when lastEmote was performed; null if no emote since jack-in */
  lastEmoteTick: number | null;

  /** Skill bonuses applied from agent skills on last jack-in; cleared on jack-out */
  appliedSkillBonuses: AvatarSkillBonus[];
}

/**
 * Create a new AvatarComponent with default unbound state.
 */
export function createAvatarEntityComponent(
  avatarId: string,
  name: string,
  initialTick: number
): AvatarComponent {
  return {
    type: 'avatar_entity',
    version: 1,
    avatarId,
    boundAgentId: null,
    state: 'unbound',
    name,
    species: undefined,
    respawnPoint: null,
    sessionStats: createEmptySessionStats(),
    totalStats: createEmptySessionStats(),
    createdAtTick: initialTick,
    lastActiveTick: initialTick,
    deathCount: 0,
    pendingRespawnOptions: null,
    autoRespawnDeadlineTick: null,
    stance: 'standing',
    lastEmote: null,
    lastEmoteTick: null,
    appliedSkillBonuses: [],
  };
}
