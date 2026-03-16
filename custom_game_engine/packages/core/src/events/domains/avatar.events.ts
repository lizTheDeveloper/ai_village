/**
 * Avatar jack-in/jack-out and lifecycle events.
 *
 * Covers player avatar binding, respawn, and state transitions.
 * Distinct from deity avatar events (AvatarSystem for gods).
 */
import type { EntityId } from '../../types.js';
import type { AvatarState, AvatarSessionStats, AvatarRespawnOption, AvatarStance, AvatarEmoteType, AvatarSkillBonus } from '../../types/AvatarTypes.js';

export interface AvatarEvents {
  /** An agent jacks in to an avatar */
  'avatar:jack_in': {
    avatarId: string;
    agentId: EntityId;
    avatarState: AvatarState;
    tick: number;
    /** Skill bonuses from agent's SkillsComponent applied at jack-in time */
    skillBonuses: AvatarSkillBonus[];
  };

  /** An agent jacks out of their avatar */
  'avatar:jack_out': {
    avatarId: string;
    agentId: EntityId;
    mode: 'dormant' | 'suspended' | 'despawn';
    sessionStats: AvatarSessionStats;
    tick: number;
  };

  /** An avatar dies */
  'avatar:death': {
    avatarId: string;
    agentId: EntityId | null;
    cause: string;
    location: { x: number; y: number };
    tick: number;
    autoRespawnDeadlineTick: number;
  };

  /** An avatar respawns after death */
  'avatar:respawn': {
    avatarId: string;
    agentId: EntityId;
    respawnType: AvatarRespawnOption['type'];
    location: { x: number; y: number };
    tick: number;
  };

  /** An avatar transitions between states */
  'avatar:state_changed': {
    avatarId: string;
    from: AvatarState;
    to: AvatarState;
    tick: number;
  };

  /** An avatar's body stance changed (spec §Avatar Actions / Body Control) */
  'avatar:stance_changed': {
    avatarId: string;
    agentId: EntityId | null;
    stance: AvatarStance;
  };

  /** An avatar performed an emote (spec §Avatar Actions / Emote) */
  'avatar:emote': {
    avatarId: string;
    agentId: EntityId | null;
    emote: AvatarEmoteType;
    tick: number;
  };

  /** An avatar inspected itself (spec §Avatar Actions / Self-Inspection) */
  'avatar:inspect_self': {
    avatarId: string;
    agentId: string | null;
    tick: number;
  };

  /** An avatar checked its inventory (spec §Avatar Actions / Self-Inspection) */
  'avatar:check_inventory': {
    avatarId: string;
    agentId: string | null;
    tick: number;
  };
}
