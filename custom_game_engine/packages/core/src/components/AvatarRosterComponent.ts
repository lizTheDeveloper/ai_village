/**
 * AvatarRosterComponent - ECS component placed on the AGENT entity.
 *
 * Tracks all avatar entities this agent owns, which one is currently active,
 * and the maximum number of avatars allowed.
 */

import type { Component } from '../ecs/Component.js';

export interface AvatarRosterComponent extends Component {
  type: 'avatar_roster';
  version: number;

  /** The agent entity ID this roster belongs to */
  agentId: string;

  /** Entity IDs of all avatars this agent has created */
  avatarIds: string[];

  /** Entity ID of the currently bound (active) avatar, or null if not jacked in */
  activeAvatarId: string | null;

  /** Maximum number of avatars this agent may own simultaneously */
  maxAvatars: number;
}

/**
 * Create a new AvatarRosterComponent for an agent.
 */
export function createAvatarRosterComponent(
  agentId: string,
  maxAvatars: number = 3
): AvatarRosterComponent {
  return {
    type: 'avatar_roster',
    version: 1,
    agentId,
    avatarIds: [],
    activeAvatarId: null,
    maxAvatars,
  };
}
