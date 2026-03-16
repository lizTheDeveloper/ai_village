/**
 * AvatarTypes - Player avatar jack-in/jack-out system types
 *
 * Distinct from the deity AvatarSystem (which manages gods manifesting).
 * This handles the player agent jack-in/jack-out mechanic.
 */

export type AvatarState = 'unbound' | 'bound' | 'dormant' | 'suspended' | 'destroyed';

/**
 * Body stance for a bound avatar (spec §Avatar Actions / Body Control).
 */
export type AvatarStance =
  | 'standing'
  | 'crouching'
  | 'prone'
  | 'sitting'
  | 'swimming'
  | 'flying'
  | 'climbing';

/**
 * Emote types an avatar can perform (spec §Avatar Actions / Emote).
 */
export type AvatarEmoteType =
  | 'wave'
  | 'sit'
  | 'dance'
  | 'sleep'
  | 'point'
  | 'shrug'
  | 'nod'
  | 'shake';

/**
 * A skill bonus applied to an avatar when an agent jacks in.
 * Derived from the agent's SkillsComponent levels.
 */
export interface AvatarSkillBonus {
  /** Agent skill that provided this bonus */
  skill: string;
  /** Skill level (0–5) that was applied */
  level: number;
  /** Stat affected (e.g., 'scanner_range', 'weapon_damage') */
  stat: string;
  /** Multiplier to apply to the stat */
  multiplier: number;
}

/**
 * Valid avatar state transitions:
 * - unbound  → bound       (jack in)
 * - bound    → dormant     (jack out, keep state)
 * - bound    → suspended   (jack out, suspend session)
 * - bound    → destroyed   (death or forced despawn)
 * - dormant  → bound       (re-jack in)
 * - dormant  → destroyed   (delete dormant avatar)
 * - suspended → bound      (resume from suspension)
 * - suspended → destroyed  (delete suspended avatar)
 * - destroyed → unbound    (respawn creates new avatar, conceptually fresh)
 */
const VALID_TRANSITIONS: ReadonlyMap<AvatarState, ReadonlySet<AvatarState>> = new Map([
  ['unbound',   new Set<AvatarState>(['bound'])],
  ['bound',     new Set<AvatarState>(['dormant', 'suspended', 'destroyed'])],
  ['dormant',   new Set<AvatarState>(['bound', 'destroyed'])],
  ['suspended', new Set<AvatarState>(['bound', 'destroyed'])],
  ['destroyed', new Set<AvatarState>(['unbound'])],
]);

/**
 * Validate an avatar state transition. Throws if the transition is invalid.
 */
export function validateAvatarTransition(from: AvatarState, to: AvatarState): void {
  const validTo = VALID_TRANSITIONS.get(from);
  if (!validTo) {
    throw new Error(`[AvatarTypes] Unknown avatar state: '${from}'`);
  }
  if (!validTo.has(to)) {
    throw new Error(
      `[AvatarTypes] Invalid avatar state transition: '${from}' → '${to}'. ` +
      `Valid transitions from '${from}': ${Array.from(validTo).join(', ')}`
    );
  }
}

/**
 * Stats accumulated during an avatar session or across all sessions.
 */
export interface AvatarSessionStats {
  playtimeSeconds: number;
  actionsPerformed: number;
  distanceTraveled: number;
  damageDealt: number;
  damageTaken: number;
  itemsCollected: number;
  skillGains: Record<string, number>;
}

/**
 * Create a zeroed session stats object.
 */
export function createEmptySessionStats(): AvatarSessionStats {
  return {
    playtimeSeconds: 0,
    actionsPerformed: 0,
    distanceTraveled: 0,
    damageDealt: 0,
    damageTaken: 0,
    itemsCollected: 0,
    skillGains: {},
  };
}

/**
 * Accumulate session stats into total stats (mutates totalStats).
 */
export function accumulateStats(
  totalStats: AvatarSessionStats,
  sessionStats: AvatarSessionStats
): void {
  totalStats.playtimeSeconds += sessionStats.playtimeSeconds;
  totalStats.actionsPerformed += sessionStats.actionsPerformed;
  totalStats.distanceTraveled += sessionStats.distanceTraveled;
  totalStats.damageDealt += sessionStats.damageDealt;
  totalStats.damageTaken += sessionStats.damageTaken;
  totalStats.itemsCollected += sessionStats.itemsCollected;
  for (const [skill, gain] of Object.entries(sessionStats.skillGains)) {
    totalStats.skillGains[skill] = (totalStats.skillGains[skill] ?? 0) + gain;
  }
}

/**
 * Self-inspection status returned by inspectSelf() (spec §Avatar Actions / Self-Inspection).
 */
export interface AvatarSelfInspection {
  avatarId: string;
  name: string;
  state: AvatarState;
  stance: AvatarStance;
  health: { current: number; max: number } | null;
  position: { x: number; y: number } | null;
  deathCount: number;
  appliedSkillBonuses: AvatarSkillBonus[];
  lastEmote: string | null;
  totalPlaytimeSeconds: number;
}

/**
 * A respawn option presented to the player after avatar death.
 */
export interface AvatarRespawnOption {
  id: string;
  type: 'checkpoint' | 'bed' | 'spawn_point' | 'corpse' | 'random' | 'custom';
  location: { x: number; y: number };
  description: string;
  cost?: Record<string, number>; // resource costs
  penalties: Array<
    | 'lose_inventory'
    | 'lose_equipment'
    | 'lose_experience'
    | 'temporary_debuff'
    | 'durability_loss'
    | 'currency_cost'
  >;
  cooldownTicks?: number;
}

/**
 * Event data emitted when an avatar dies.
 */
export interface AvatarDeathEvent {
  avatarId: string;
  agentId: string | null;
  cause:
    | 'combat'
    | 'fall'
    | 'drowning'
    | 'starvation'
    | 'dehydration'
    | 'poison'
    | 'fire'
    | 'cold'
    | 'radiation'
    | 'explosion'
    | 'environmental'
    | 'script';
  location: { x: number; y: number };
  tick: number;
  experienceLost: number;
  respawnOptions: AvatarRespawnOption[];
  /** Ticks until auto-respawn fires (default 1200 = 60s at 20 TPS) */
  autoRespawnTicks: number;
}
