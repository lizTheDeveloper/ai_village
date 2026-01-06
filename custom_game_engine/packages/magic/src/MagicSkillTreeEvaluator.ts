/**
 * MagicSkillTreeEvaluator - Evaluates unlock conditions for magic skill nodes
 *
 * This module provides the logic for checking whether an agent meets the
 * requirements to unlock a magic skill node. It integrates with:
 * - MagicComponent (paradigm state, proficiencies)
 * - SkillsComponent (mundane skill levels)
 * - PresenceSpectrum (attention/divinity conditions)
 * - World state (time, weather, etc.)
 */

import type { World } from '@ai-village/core';
import type { EntityId } from '@ai-village/core';
import type {
  UnlockCondition,
  UnlockConditionType,
  MagicSkillNode,
  MagicSkillTree,
  MagicSkillProgress,
} from './MagicSkillTree.js';
import { getNodeLevelCost, hasNodeUnlocked, getNodeLevel } from './MagicSkillTree.js';

// ============================================================================
// Evaluation Result Types
// ============================================================================

/** Result of evaluating a single condition */
export interface ConditionResult {
  /** Is the condition met? */
  met: boolean;

  /** The condition that was evaluated */
  condition: UnlockCondition;

  /** Human-readable status message */
  message: string;

  /** Current value (for progress tracking) */
  currentValue?: number;

  /** Required value (for progress tracking) */
  requiredValue?: number;

  /** Progress percentage (0-1) for partial conditions */
  progress?: number;

  /** Is this condition hidden? */
  hidden?: boolean;

  /** Can this condition be bypassed? */
  bypassable?: boolean;
}

/** Result of evaluating all conditions for a node */
export interface NodeEvaluationResult {
  /** Can this node be unlocked? */
  canUnlock: boolean;

  /** Can this node be purchased? (conditions met AND has XP) */
  canPurchase: boolean;

  /** Individual condition results */
  conditions: ConditionResult[];

  /** Conditions that are met */
  metConditions: ConditionResult[];

  /** Conditions that are not met */
  unmetConditions: ConditionResult[];

  /** XP cost for next level */
  xpCost: number;

  /** Current available XP */
  availableXp: number;

  /** Is this node visible? (not hidden, or hidden conditions partially met) */
  visible: boolean;

  /** Current level of this node */
  currentLevel: number;

  /** Maximum level of this node */
  maxLevel: number;

  /** Summary message */
  summary: string;
}

// ============================================================================
// Evaluation Context
// ============================================================================

/** Context provided for condition evaluation */
export interface EvaluationContext {
  /** The ECS world */
  world: World;

  /** Agent being evaluated */
  agentId: EntityId;

  /** Agent's magic skill progress */
  progress: MagicSkillProgress;

  /** Agent's magic component (if available) */
  magicComponent?: {
    paradigmState: Record<string, unknown>;
    techniqueProficiency: Record<string, number>;
    formProficiency: Record<string, number>;
    corruption?: number;
    favorLevel?: number;
    /** Mana pools by source for resource tracking */
    manaPools?: Array<{ source: string; current: number; maximum: number }>;
    /** Alternative resource pools (breath, blood, etc.) */
    resourcePools?: Record<string, { current: number; maximum: number; accumulated?: number }>;
  };

  /** Agent's skills component (if available) */
  skillsComponent?: {
    levels: Record<string, number>;
  };

  /** Current game time (for time-based conditions) */
  gameTime?: {
    hour: number;      // 0-23
    day: number;       // Day of month
    season: string;    // 'spring', 'summer', 'autumn', 'winter'
    moonPhase: string; // 'new', 'waxing', 'full', 'waning'
  };

  /** Current weather (for weather conditions) */
  weather?: string;

  /** Agent's current health (0-100) */
  health?: number;

  /** Agent's current emotional state */
  emotionState?: {
    emotion: string;
    intensity: number;
  };

  /** Custom data for paradigm-specific conditions */
  custom?: Record<string, unknown>;
}

// ============================================================================
// Condition Evaluators
// ============================================================================

type ConditionEvaluator = (
  condition: UnlockCondition,
  context: EvaluationContext
) => ConditionResult;

/**
 * Registry of condition evaluators by type.
 * Each evaluator returns a ConditionResult.
 */
const conditionEvaluators: Record<UnlockConditionType, ConditionEvaluator> = {
  // ========== Inherent Conditions ==========

  bloodline: (condition, context) => {
    const bloodlineId = condition.params.bloodlineId;
    const requiredStrength = condition.params.bloodlineStrength ?? 0;

    // Check custom data for bloodline info
    const bloodlines = (context.custom?.bloodlines ?? {}) as Record<string, number>;
    const hasBloodline = bloodlineId ? bloodlineId in bloodlines : Object.keys(bloodlines).length > 0;
    const strength = bloodlineId ? (bloodlines[bloodlineId] ?? 0) : Math.max(...Object.values(bloodlines), 0);

    const met = hasBloodline && strength >= requiredStrength;
    return {
      met,
      condition,
      message: met
        ? `Has required bloodline${requiredStrength > 0 ? ` (strength ${strength.toFixed(2)})` : ''}`
        : `Missing required bloodline${requiredStrength > 0 ? ` (need strength ${requiredStrength}, have ${strength.toFixed(2)})` : ''}`,
      currentValue: strength,
      requiredValue: requiredStrength,
      progress: requiredStrength > 0 ? Math.min(1, strength / requiredStrength) : (hasBloodline ? 1 : 0),
    };
  },

  snapping: (condition, context) => {
    const hasSnapped = context.progress.milestones['snapped'] !== undefined ||
                       context.custom?.snapped === true;
    return {
      met: hasSnapped,
      condition,
      message: hasSnapped ? 'Has experienced snapping' : 'Has not snapped (requires trauma event)',
      hidden: condition.hidden && !hasSnapped,
    };
  },

  daemon_settled: (condition, context) => {
    const settled = context.custom?.daemonSettled === true;
    return {
      met: settled,
      condition,
      message: settled ? 'Daemon has settled' : 'Daemon has not settled yet',
    };
  },

  witch_birth: (condition, context) => {
    const isWitch = context.custom?.witchBirth === true;
    return {
      met: isWitch,
      condition,
      message: isWitch ? 'Born into witch clan' : 'Not born into witch clan',
    };
  },

  innate_talent: (condition, context) => {
    const talentId = condition.params.secretId; // Reusing secretId for talent
    const talents = (context.custom?.talents ?? []) as string[];
    const hasTalent = talentId ? talents.includes(talentId) : talents.length > 0;
    return {
      met: hasTalent,
      condition,
      message: hasTalent ? 'Has innate talent' : 'Missing innate talent',
    };
  },

  // ========== Discovery Conditions ==========

  kami_met: (condition, context) => {
    const kamiId = condition.params.kamiId;
    const kamiType = condition.params.kamiType;
    const discoveredKami = context.progress.discoveries.kami ?? [];

    let met = false;
    if (kamiId) {
      met = discoveredKami.includes(kamiId);
    } else if (kamiType) {
      // Check if any kami of this type has been met
      // This would need additional metadata about kami types
      met = discoveredKami.length > 0; // Simplified
    }

    return {
      met,
      condition,
      message: met ? 'Has met the required kami' : 'Has not met the required kami',
      hidden: condition.hidden && !met,
    };
  },

  kami_favor: (condition, context) => {
    const kamiId = condition.params.kamiId;
    const kamiType = condition.params.kamiType;
    const requiredFavor = condition.params.favorLevel ?? 0;

    const relationships = context.progress.relationships;
    let currentFavor = 0;

    if (kamiId) {
      currentFavor = relationships[kamiId] ?? 0;
    } else if (kamiType) {
      // Get highest favor with any kami of this type
      currentFavor = Math.max(...Object.values(relationships), 0);
    }

    const met = currentFavor >= requiredFavor;
    return {
      met,
      condition,
      message: met
        ? `Has required kami favor (${currentFavor})`
        : `Need more kami favor (${currentFavor}/${requiredFavor})`,
      currentValue: currentFavor,
      requiredValue: requiredFavor,
      progress: requiredFavor > 0 ? Math.min(1, currentFavor / requiredFavor) : 1,
    };
  },

  metal_consumed: (condition, context) => {
    const metalId = condition.params.metalId;
    const discoveredMetals = context.progress.discoveries.metals ?? [];
    const met = metalId ? discoveredMetals.includes(metalId) : discoveredMetals.length > 0;
    return {
      met,
      condition,
      message: met ? `Has consumed ${metalId ?? 'a metal'}` : `Has not consumed ${metalId ?? 'any metals'}`,
      hidden: condition.hidden && !met,
    };
  },

  rune_discovered: (condition, context) => {
    const runeId = condition.params.runeId;
    const discoveredRunes = context.progress.discoveries.runes ?? [];
    const met = runeId ? discoveredRunes.includes(runeId) : discoveredRunes.length > 0;
    return {
      met,
      condition,
      message: met ? `Has discovered ${runeId ?? 'a rune'}` : `Has not discovered ${runeId ?? 'any runes'}`,
      hidden: condition.hidden && !met,
    };
  },

  song_learned: (condition, context) => {
    const songId = condition.params.songId;
    const learnedSongs = context.progress.discoveries.songs ?? [];
    const met = songId ? learnedSongs.includes(songId) : learnedSongs.length > 0;
    return {
      met,
      condition,
      message: met ? `Has learned ${songId ?? 'a song'}` : `Has not learned ${songId ?? 'any songs'}`,
      hidden: condition.hidden && !met,
    };
  },

  name_learned: (condition, context) => {
    const nameId = condition.params.nameId;
    const learnedNames = context.progress.discoveries.names ?? [];
    const met = nameId ? learnedNames.includes(nameId) : learnedNames.length > 0;
    return {
      met,
      condition,
      message: met ? `Knows ${nameId ?? 'a true name'}` : `Does not know ${nameId ?? 'any true names'}`,
      hidden: condition.hidden && !met,
    };
  },

  dream_visited: (condition, context) => {
    const locationId = condition.params.dreamLocationId;
    const visitedLocations = context.progress.discoveries.dreamLocations ?? [];
    const met = locationId ? visitedLocations.includes(locationId) : visitedLocations.length > 0;
    return {
      met,
      condition,
      message: met ? `Has visited ${locationId ?? 'a dream realm'}` : `Has not visited ${locationId ?? 'any dream realms'}`,
      hidden: condition.hidden && !met,
    };
  },

  secret_revealed: (condition, context) => {
    const secretId = condition.params.secretId;
    const revealedSecrets = context.progress.discoveries.secrets ?? [];
    const met = secretId ? revealedSecrets.includes(secretId) : revealedSecrets.length > 0;
    return {
      met,
      condition,
      message: met ? 'Secret has been revealed' : 'Secret not yet revealed',
      hidden: condition.hidden && !met,
    };
  },

  // ========== Attention/Divinity Conditions ==========

  attention_given: (condition, context) => {
    const presenceId = condition.params.presenceId;
    const threshold = condition.params.attentionThreshold ?? 0;

    // This would integrate with PresenceSpectrum
    const presenceAttention = (context.custom?.presenceAttention ?? {}) as Record<string, number>;
    const attention = presenceAttention[presenceId ?? ''] ?? 0;
    const met = attention >= threshold;

    return {
      met,
      condition,
      message: met
        ? `Has given sufficient attention to ${presenceId}`
        : `Need more attention to ${presenceId} (${attention}/${threshold})`,
      currentValue: attention,
      requiredValue: threshold,
      progress: threshold > 0 ? Math.min(1, attention / threshold) : 1,
    };
  },

  presence_level: (condition, context) => {
    const presenceId = condition.params.presenceId;
    const threshold = condition.params.attentionThreshold ?? 0;

    const presenceLevels = (context.custom?.presenceLevels ?? {}) as Record<string, number>;
    const level = presenceLevels[presenceId ?? ''] ?? 0;
    const met = level >= threshold;

    return {
      met,
      condition,
      message: met
        ? `Presence has reached required level`
        : `Presence not at required level (${level.toFixed(2)}/${threshold})`,
      currentValue: level,
      requiredValue: threshold,
      progress: threshold > 0 ? Math.min(1, level / threshold) : 1,
    };
  },

  deity_favor: (condition, context) => {
    const _deityId = condition.params.deityId; // Reserved for future per-deity favor tracking
    const requiredFavor = condition.params.favorLevel ?? 0;
    const currentFavor = context.magicComponent?.favorLevel ?? 0;
    const met = currentFavor >= requiredFavor;
    void _deityId; // Suppress unused warning

    return {
      met,
      condition,
      message: met
        ? `Has deity favor (${currentFavor})`
        : `Need more deity favor (${currentFavor}/${requiredFavor})`,
      currentValue: currentFavor,
      requiredValue: requiredFavor,
      progress: requiredFavor > 0 ? Math.min(1, currentFavor / requiredFavor) : 1,
    };
  },

  pact_signed: (condition, context) => {
    const pactId = condition.params.pactId;
    const pacts = (context.custom?.pacts ?? []) as string[];
    const met = pactId ? pacts.includes(pactId) : pacts.length > 0;
    return {
      met,
      condition,
      message: met ? 'Pact has been signed' : 'No pact signed',
    };
  },

  patron_granted: (condition, context) => {
    const patronId = condition.params.patronId;
    const grants = (context.custom?.patronGrants ?? []) as string[];
    const met = grants.includes(patronId ?? '');
    return {
      met,
      condition,
      message: met ? 'Patron has granted ability' : 'Patron has not granted ability',
    };
  },

  // ========== Skill/XP Conditions ==========

  skill_level: (condition, context) => {
    const skillId = condition.params.skillId;
    const requiredLevel = condition.params.skillLevel ?? 1;

    if (!skillId) {
      return { met: false, condition, message: 'Invalid skill condition (no skillId)' };
    }

    const currentLevel = context.skillsComponent?.levels[skillId] ?? 0;
    const met = currentLevel >= requiredLevel;

    return {
      met,
      condition,
      message: met
        ? `Has ${skillId} at level ${currentLevel}`
        : `Need ${skillId} level ${requiredLevel} (currently ${currentLevel})`,
      currentValue: currentLevel,
      requiredValue: requiredLevel,
      progress: Math.min(1, currentLevel / requiredLevel),
    };
  },

  magic_proficiency: (condition, context) => {
    const techniqueId = condition.params.techniqueId;
    const formId = condition.params.formId;
    const requiredLevel = condition.params.proficiencyLevel ?? 1;

    let currentLevel = 0;
    let targetName = '';

    if (techniqueId) {
      currentLevel = context.magicComponent?.techniqueProficiency[techniqueId] ?? 0;
      targetName = `${techniqueId} technique`;
    } else if (formId) {
      currentLevel = context.magicComponent?.formProficiency[formId] ?? 0;
      targetName = `${formId} form`;
    }

    const met = currentLevel >= requiredLevel;
    return {
      met,
      condition,
      message: met
        ? `Has ${targetName} proficiency ${currentLevel}`
        : `Need ${targetName} proficiency ${requiredLevel} (currently ${currentLevel})`,
      currentValue: currentLevel,
      requiredValue: requiredLevel,
      progress: requiredLevel > 0 ? Math.min(1, currentLevel / requiredLevel) : 1,
    };
  },

  node_unlocked: (condition, context) => {
    const nodeId = condition.params.nodeId;
    const nodeIds = condition.params.nodeIds ?? (nodeId ? [nodeId] : []);

    const unlockedCount = nodeIds.filter(id => hasNodeUnlocked(context.progress, id)).length;
    const met = unlockedCount === nodeIds.length;

    return {
      met,
      condition,
      message: met
        ? `Prerequisite nodes unlocked (${unlockedCount}/${nodeIds.length})`
        : `Missing prerequisite nodes (${unlockedCount}/${nodeIds.length})`,
      currentValue: unlockedCount,
      requiredValue: nodeIds.length,
      progress: nodeIds.length > 0 ? unlockedCount / nodeIds.length : 1,
    };
  },

  xp_accumulated: (condition, context) => {
    const required = condition.params.xpRequired ?? 0;
    const current = context.progress.totalXpEarned;
    const met = current >= required;

    return {
      met,
      condition,
      message: met
        ? `Has earned ${current} XP`
        : `Need ${required} total XP (have ${current})`,
      currentValue: current,
      requiredValue: required,
      progress: required > 0 ? Math.min(1, current / required) : 1,
    };
  },

  resource_accumulated: (condition, context) => {
    const required = condition.params.resourceAmountRequired ?? 0;
    const resourceType = condition.params.resourceType ?? 'unknown';

    // Check resource pools from MagicComponent
    let current = 0;

    if (context.magicComponent) {
      // First check resourcePools (for breath, blood, stamina, etc.)
      const resourcePool = context.magicComponent.resourcePools?.[resourceType];
      if (resourcePool) {
        // Use accumulated if tracked, otherwise use current
        current = resourcePool.accumulated ?? resourcePool.current;
      } else {
        // Check manaPools by source name
        const manaPool = context.magicComponent.manaPools?.find(
          p => p.source.toLowerCase() === resourceType.toLowerCase()
        );
        if (manaPool) {
          current = manaPool.current;
        }
      }
    }

    // Also check custom resources (for paradigm-specific tracking)
    if (current === 0 && context.custom) {
      const customResource = context.custom[`resource_${resourceType}`] as number | undefined;
      if (customResource !== undefined) {
        current = customResource;
      }
    }

    const met = current >= required;

    return {
      met,
      condition,
      message: met
        ? `Has accumulated ${current} ${resourceType}`
        : `Need ${required} ${resourceType} (have ${current})`,
      currentValue: current,
      requiredValue: required,
      progress: required > 0 ? Math.min(1, current / required) : 0,
    };
  },

  xp_spent: (condition, context) => {
    const required = condition.params.xpRequired ?? 0;
    const spent = context.progress.totalXpEarned - context.progress.availableXp;
    const met = spent >= required;

    return {
      met,
      condition,
      message: met
        ? `Has spent ${spent} XP`
        : `Need to spend ${required} XP (spent ${spent})`,
      currentValue: spent,
      requiredValue: required,
      progress: required > 0 ? Math.min(1, spent / required) : 1,
    };
  },

  nodes_unlocked: (condition, context) => {
    const required = condition.params.nodesRequired ?? 1;
    const current = Object.keys(context.progress.unlockedNodes).length;
    const met = current >= required;

    return {
      met,
      condition,
      message: met
        ? `Has ${current} nodes unlocked`
        : `Need ${required} nodes (have ${current})`,
      currentValue: current,
      requiredValue: required,
      progress: required > 0 ? Math.min(1, current / required) : 1,
    };
  },

  // ========== Event Conditions ==========

  ritual_performed: (condition, context) => {
    const ritualId = condition.params.ritualId;
    const performedRituals = context.progress.discoveries.rituals ?? [];
    const met = ritualId ? performedRituals.includes(ritualId) : performedRituals.length > 0;
    return {
      met,
      condition,
      message: met ? 'Ritual has been performed' : 'Ritual not yet performed',
    };
  },

  trauma_experienced: (condition, context) => {
    const traumaType = condition.params.traumaType;
    const traumas = (context.custom?.traumas ?? []) as string[];
    const met = traumaType ? traumas.includes(traumaType) : traumas.length > 0;
    return {
      met,
      condition,
      message: met ? 'Has experienced required trauma' : 'Has not experienced required trauma',
      hidden: condition.hidden,
    };
  },

  teacher_found: (condition, context) => {
    const paradigm = condition.params.teacherParadigm;
    const teachers = (context.custom?.teachers ?? []) as string[];
    const met = paradigm ? teachers.includes(paradigm) : teachers.length > 0;
    return {
      met,
      condition,
      message: met ? 'Has found a teacher' : 'Has not found a teacher',
    };
  },

  artifact_bonded: (condition, context) => {
    const artifactId = condition.params.artifactId;
    const artifacts = context.progress.discoveries.artifacts ?? [];
    const met = artifactId ? artifacts.includes(artifactId) : artifacts.length > 0;
    return {
      met,
      condition,
      message: met ? 'Has bonded with artifact' : 'Has not bonded with artifact',
    };
  },

  location_visited: (condition, context) => {
    const locationId = condition.params.locationId;
    const locations = context.progress.discoveries.locations ?? [];
    const met = locationId ? locations.includes(locationId) : locations.length > 0;
    return {
      met,
      condition,
      message: met ? 'Has visited sacred location' : 'Has not visited sacred location',
    };
  },

  creature_defeated: (condition, context) => {
    const creatureType = condition.params.creatureType;
    const defeats = (context.custom?.creaturesDefeated ?? []) as string[];
    const met = creatureType ? defeats.includes(creatureType) : defeats.length > 0;
    return {
      met,
      condition,
      message: met ? 'Has defeated required creature' : 'Has not defeated required creature',
    };
  },

  vision_received: (condition, context) => {
    const visionType = condition.params.visionType;
    const visions = (context.custom?.visions ?? []) as string[];
    const met = visionType ? visions.includes(visionType) : visions.length > 0;
    return {
      met,
      condition,
      message: met ? 'Has received vision' : 'Has not received vision',
    };
  },

  // ========== State Conditions ==========

  purity_level: (condition, context) => {
    const minPurity = condition.params.purityMin ?? 0;
    const maxPurity = condition.params.purityMax ?? 100;
    const current = (context.custom?.purity ?? 50) as number;
    const met = current >= minPurity && current <= maxPurity;

    return {
      met,
      condition,
      message: met
        ? `Purity level is acceptable (${current})`
        : `Purity level out of range (${current}, need ${minPurity}-${maxPurity})`,
      currentValue: current,
      requiredValue: minPurity,
    };
  },

  corruption_level: (condition, context) => {
    const minCorruption = condition.params.corruptionMin ?? 0;
    const maxCorruption = condition.params.corruptionMax ?? 100;
    const current = context.magicComponent?.corruption ?? 0;
    const met = current >= minCorruption && current <= maxCorruption;

    return {
      met,
      condition,
      message: met
        ? `Corruption level is acceptable (${current})`
        : `Corruption level out of range (${current}, need ${minCorruption}-${maxCorruption})`,
      currentValue: current,
    };
  },

  time_of_day: (condition, context) => {
    const timeRange = condition.params.timeRange;
    if (!timeRange || !context.gameTime) {
      return { met: true, condition, message: 'Time condition not applicable' };
    }

    const hour = context.gameTime.hour;
    const met = hour >= timeRange.start && hour <= timeRange.end;

    return {
      met,
      condition,
      message: met
        ? 'Correct time of day'
        : `Wrong time of day (need ${timeRange.start}:00-${timeRange.end}:00, currently ${hour}:00)`,
    };
  },

  moon_phase: (condition, context) => {
    const phases = condition.params.moonPhases;
    if (!phases || !context.gameTime) {
      return { met: true, condition, message: 'Moon phase condition not applicable' };
    }

    const currentPhase = context.gameTime.moonPhase;
    const met = phases.includes(currentPhase as 'new' | 'waxing' | 'full' | 'waning');

    return {
      met,
      condition,
      message: met
        ? `Moon is in correct phase (${currentPhase})`
        : `Wrong moon phase (need ${phases.join('/')}, currently ${currentPhase})`,
    };
  },

  season: (condition, context) => {
    const seasons = condition.params.seasons;
    if (!seasons || !context.gameTime) {
      return { met: true, condition, message: 'Season condition not applicable' };
    }

    const currentSeason = context.gameTime.season;
    const met = seasons.includes(currentSeason as 'spring' | 'summer' | 'autumn' | 'winter');

    return {
      met,
      condition,
      message: met
        ? `Correct season (${currentSeason})`
        : `Wrong season (need ${seasons.join('/')}, currently ${currentSeason})`,
    };
  },

  weather: (condition, context) => {
    const weatherTypes = condition.params.weatherTypes;
    if (!weatherTypes || !context.weather) {
      return { met: true, condition, message: 'Weather condition not applicable' };
    }

    const met = weatherTypes.includes(context.weather);
    return {
      met,
      condition,
      message: met
        ? `Correct weather (${context.weather})`
        : `Wrong weather (need ${weatherTypes.join('/')}, currently ${context.weather})`,
    };
  },

  emotion_state: (condition, context) => {
    const requiredEmotion = condition.params.emotionRequired;
    const minIntensity = condition.params.emotionIntensity ?? 0;

    if (!requiredEmotion || !context.emotionState) {
      return { met: true, condition, message: 'Emotion condition not applicable' };
    }

    const matches = context.emotionState.emotion === requiredEmotion;
    const intense = context.emotionState.intensity >= minIntensity;
    const met = matches && intense;

    return {
      met,
      condition,
      message: met
        ? `In correct emotional state`
        : `Wrong emotional state (need ${requiredEmotion} at ${minIntensity} intensity)`,
    };
  },

  health_threshold: (condition, context) => {
    const minHealth = condition.params.healthMin ?? 0;
    const maxHealth = condition.params.healthMax ?? 100;
    const current = context.health ?? 100;
    const met = current >= minHealth && current <= maxHealth;

    return {
      met,
      condition,
      message: met
        ? `Health in acceptable range (${current})`
        : `Health out of range (${current}, need ${minHealth}-${maxHealth})`,
      currentValue: current,
    };
  },

  resource_level: (condition, context) => {
    const resourceType = condition.params.resourceType;
    const minLevel = condition.params.resourceMin ?? 0;
    const maxLevel = condition.params.resourceMax ?? Infinity;

    // This would need to read from MagicComponent resource pools
    const resources = (context.custom?.resources ?? {}) as Record<string, number>;
    const current = resources[resourceType ?? ''] ?? 0;
    const met = current >= minLevel && current <= maxLevel;

    return {
      met,
      condition,
      message: met
        ? `Resource level acceptable (${current})`
        : `Resource level out of range (${current}, need ${minLevel}-${maxLevel})`,
      currentValue: current,
      requiredValue: minLevel,
    };
  },

  // ========== Daemon-Specific Conditions ==========

  age_range: (condition, context) => {
    const minAge = condition.params.minAge ?? 0;
    const maxAge = condition.params.maxAge ?? 999;
    const currentAge = (context.custom?.age ?? 0) as number;
    const met = currentAge >= minAge && currentAge <= maxAge;

    return {
      met,
      condition,
      message: met
        ? `Age in range (${currentAge})`
        : `Age out of range (${currentAge}, need ${minAge}-${maxAge})`,
      currentValue: currentAge,
    };
  },

  gift_innate: (condition, context) => {
    const giftId = condition.params.giftId;
    const innateGifts = (context.custom?.innateGifts ?? []) as string[];
    const met = giftId ? innateGifts.includes(giftId) : innateGifts.length > 0;

    return {
      met,
      condition,
      message: met ? 'Has innate gift' : 'Does not have required innate gift',
      hidden: condition.hidden,
    };
  },

  node_level: (condition, context) => {
    const nodeId = condition.params.nodeId;
    const requiredLevel = condition.params.level ?? 1;

    if (!nodeId) {
      return { met: false, condition, message: 'No node specified for node_level condition' };
    }

    const currentLevel = context.progress.unlockedNodes[nodeId] ?? 0;
    const met = currentLevel >= requiredLevel;

    return {
      met,
      condition,
      message: met
        ? `Node ${nodeId} at level ${currentLevel} (required: ${requiredLevel})`
        : `Node ${nodeId} at level ${currentLevel}, need level ${requiredLevel}`,
      currentValue: currentLevel,
      requiredValue: requiredLevel,
      progress: requiredLevel > 0 ? currentLevel / requiredLevel : 1,
    };
  },

  form_category: (condition, context) => {
    const requiredCategory = condition.params.category;
    const daemonFormCategory = (context.custom?.daemonFormCategory ?? '') as string;
    const met = requiredCategory ? daemonFormCategory === requiredCategory : true;

    return {
      met,
      condition,
      message: met
        ? `Daemon form is in ${requiredCategory} category`
        : `Daemon form not in required category (need ${requiredCategory}, have ${daemonFormCategory || 'none'})`,
    };
  },

  intercision: (condition, context) => {
    // This is a negative condition - being severed disables daemon abilities
    const isSevered = (context.custom?.isSevered ?? false) as boolean;

    return {
      met: isSevered,
      condition,
      message: isSevered
        ? 'Has been severed from daemon'
        : 'Daemon bond is intact',
    };
  },
};

// ============================================================================
// Main Evaluation Functions
// ============================================================================

/**
 * Evaluate a single unlock condition.
 */
export function evaluateCondition(
  condition: UnlockCondition,
  context: EvaluationContext
): ConditionResult {
  const evaluator = conditionEvaluators[condition.type];

  if (!evaluator) {
    return {
      met: false,
      condition,
      message: `Unknown condition type: ${condition.type}`,
    };
  }

  const result = evaluator(condition, context);

  // Apply hidden flag
  if (condition.hidden && !result.met) {
    result.hidden = true;
  }

  // Apply bypassable flag
  result.bypassable = condition.bypassable;

  return result;
}

/**
 * Evaluate all conditions for a node.
 */
export function evaluateNode(
  node: MagicSkillNode,
  _tree: MagicSkillTree, // Reserved for future tree-level validation
  context: EvaluationContext
): NodeEvaluationResult {
  const currentLevel = getNodeLevel(context.progress, node.id);
  const xpCost = getNodeLevelCost(node, currentLevel);
  const availableXp = context.progress.availableXp;

  // Evaluate all conditions
  const conditions = node.unlockConditions.map(c => evaluateCondition(c, context));
  const metConditions = conditions.filter(c => c.met);
  const unmetConditions = conditions.filter(c => !c.met);

  // Determine if node can be unlocked based on condition mode
  let canUnlock: boolean;
  if (node.conditionMode === 'all') {
    canUnlock = unmetConditions.length === 0;
  } else {
    canUnlock = metConditions.length > 0 || conditions.length === 0;
  }

  // Check if max level reached
  if (currentLevel >= node.maxLevel) {
    canUnlock = false;
  }

  // Check prerequisites (convenience field)
  if (node.prerequisites) {
    const prereqsMet = node.prerequisites.every(prereqId =>
      hasNodeUnlocked(context.progress, prereqId)
    );
    if (!prereqsMet) {
      canUnlock = false;
    }
  }

  // Can purchase if can unlock AND has enough XP
  const canPurchase = canUnlock && availableXp >= xpCost;

  // Determine visibility
  let visible = !node.hidden;
  if (node.hidden) {
    // Hidden nodes become visible when any non-hidden condition is partially met
    const visibleProgress = conditions.some(c => !c.hidden && (c.progress ?? 0) > 0);
    visible = visibleProgress;
  }

  // Generate summary
  let summary: string;
  if (currentLevel >= node.maxLevel) {
    summary = 'Fully unlocked';
  } else if (canPurchase) {
    summary = `Ready to purchase (${xpCost} XP)`;
  } else if (canUnlock) {
    summary = `Need ${xpCost} XP (have ${availableXp})`;
  } else {
    const unmetCount = unmetConditions.filter(c => !c.hidden).length;
    summary = `${unmetCount} condition${unmetCount !== 1 ? 's' : ''} not met`;
  }

  return {
    canUnlock,
    canPurchase,
    conditions,
    metConditions,
    unmetConditions,
    xpCost,
    availableXp,
    visible,
    currentLevel,
    maxLevel: node.maxLevel,
    summary,
  };
}

/**
 * Evaluate all nodes in a tree.
 */
export function evaluateTree(
  tree: MagicSkillTree,
  context: EvaluationContext
): Map<string, NodeEvaluationResult> {
  const results = new Map<string, NodeEvaluationResult>();

  for (const node of tree.nodes) {
    results.set(node.id, evaluateNode(node, tree, context));
  }

  return results;
}

/**
 * Get all purchasable nodes in a tree.
 */
export function getPurchasableNodes(
  tree: MagicSkillTree,
  context: EvaluationContext
): MagicSkillNode[] {
  const results = evaluateTree(tree, context);
  return tree.nodes.filter(node => results.get(node.id)?.canPurchase === true);
}

/**
 * Get all visible nodes in a tree.
 */
export function getVisibleNodes(
  tree: MagicSkillTree,
  context: EvaluationContext
): MagicSkillNode[] {
  const results = evaluateTree(tree, context);
  return tree.nodes.filter(node => results.get(node.id)?.visible === true);
}

/**
 * Check if tree prerequisites are met (for trees requiring innate ability).
 */
export function canAccessTree(
  tree: MagicSkillTree,
  context: EvaluationContext
): { canAccess: boolean; reason?: string } {
  if (!tree.rules.requiresInnateAbility) {
    return { canAccess: true };
  }

  if (!tree.rules.innateCondition) {
    return { canAccess: true };
  }

  const result = evaluateCondition(tree.rules.innateCondition, context);
  return {
    canAccess: result.met,
    reason: result.met ? undefined : result.message,
  };
}
