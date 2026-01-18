/**
 * Magic, divine, and spiritual events.
 */
import type { EntityId } from '../../types.js';

export interface MagicEvents {
  'prayer:offered': {
    agentId: EntityId;
    deityId: EntityId;
    prayerType: string;
    urgency: string;
    prayerId: string;
  };
  'prayer:answered': {
    agentId: EntityId;
    deityId: EntityId;
    prayerId: string;
    responseType: string;
    healingApplied?: boolean; // True if divine healing was applied
  };
  'divine_power:request': {
    deityId: EntityId;
    powerType: string;
    targetId?: EntityId;
    prayerId?: string;
    params?: Record<string, unknown>;
  };
  'divine_power:whisper': {
    deityId: EntityId;
    targetId: EntityId;
    message: string;
    cost: number;
  };
  'divine_power:dream_hint': {
    deityId: EntityId;
    targetId: EntityId;
    content: string;
    cost: number;
  };
  'divine_power:clear_vision': {
    deityId: EntityId;
    targetId: EntityId;
    visionContent: string;
    cost: number;
  };
  'divine_power:minor_miracle': {
    deityId: EntityId;
    miracleType: string;
    cost: number;
  };
  'divine_power:bless_individual': {
    deityId: EntityId;
    targetId: EntityId;
    blessingType: string;
    cost: number;
  };
  'divine_power:mass_vision': {
    deityId: EntityId;
    targetIds: EntityId[];
    visionContent: string;
    cost: number;
  };
  'divine_power:major_miracle': {
    deityId: EntityId;
    miracleType: string;
    cost: number;
  };
  'divinity:vision_queued': {
    visionId: string;
    deityId: EntityId;
    targetId: EntityId;
    visionType: 'dream' | 'meditation' | 'sign' | 'direct';
    purpose: string;
    beliefCost: number;
  };
  'divinity:vision_delivered': {
    visionId: string;
    deityId: EntityId;
    targetId: EntityId;
    visionType: 'dream' | 'meditation' | 'sign' | 'direct';
    content: string;
    clarity: 'obscure' | 'symbolic' | 'clear' | 'vivid';
  };
  'divinity:vision_interpreted': {
    visionId: string;
    targetId: EntityId;
    interpretation: string;
    accuracy: number; // 0-1 how close to intended meaning
  };
  'divinity:prophecy_fulfilled': {
    visionId: string;
    deityId: EntityId;
    prophecyContent: string;
    fulfillmentEvent: string;
  };
  'prayer:resolved': {
    agentId: EntityId;
    prayerId: string;
    resolutionType: 'spirit' | 'nature' | 'self' | 'none';
    targetId?: EntityId;
    outcome: string;
  };
  'divinity:proto_deity_belief': {
    agentId: EntityId;
    prayerContent: string;
    beliefContributed: number;
    timestamp: number;
    /** Potential deity concept forming */
    concept?: string;
  };
  'divinity:magic_detected': {
    casterId: string;
    spellId: string;
    detectionRisk: string;
    evidenceStrength?: number;
    forbiddenCategories?: string[];
    forced: boolean;
  };
  'divinity:surveillance_alert': {
    oldLevel: string;
    newLevel: string;
    recentDetections: number;
    criticalDetections: number;
  };
  'divinity:creator_intervention': {
    targetId: string;
    interventionType: string;
    severity: string;
    reason: string;
    intervention: unknown;
  };
  'magic:spell_blocked': {
    spellId: string;
    reason: string;
    banReason?: string;
    trapLevel?: string;
  };
  'magic:spell_cast_attempt': {
    casterId: string;
    spellId: string;
  };
  'magic:spell_suppressed': {
    spellId: string;
    reductionAmount: number;
  };
  'divinity:banned_spell_attempt': {
    spellId: string;
    ban: unknown;
    trapTriggered?: boolean;
    newTrapLevel?: string;
  };
  'divinity:annihilation': {
    targetId: string;
    reason: string;
  };
  'divinity:trap_triggered': {
    targetId: string;
    spellId: string;
    trapLevel: string;
    damage?: number;
    debuffs?: unknown[];
    lethal?: boolean;
    message: string;
  };
  'divinity:ban_trap_escalated': {
    spellId: string;
    oldLevel: string;
    newLevel: string;
    violationCount: number;
  };
  'godcrafted:discovered': {
    contentType: 'riddle' | 'spell' | 'recipe' | 'legendary_item' | 'soul' | 'quest';
    contentId: string;
    name: string;
    creatorName: string;
    creatorDomain: string;
    lore: string;
    entityId: EntityId;
    discoveryMethod: 'random_encounter' | 'location' | 'achievement' | 'quest_reward' | 'divine_gift' | 'research';
  };
  'magic:discovered': {
    spellId: string;
    name: string;
    paradigm?: string;
    discoverer: string;
    message: string;
  };
  'magic:spell_cast': {
    spellId: string;
    spell: string;
    technique: string;
    form: string;
    paradigm?: string;
    manaCost: number;
    targetEntityId?: string;
    targetPosition?: { x: number; y: number };
    casterId?: string;
    targetId?: string;
    success?: boolean;
    mishap?: boolean;
    wasTerminal?: boolean;
  };
  'magic:cast_cancelled': {
    spellId: string;
    reason: string;
    progress: number;
    duration: number;
  };
  'magic:spell_learned': {
    entityId: EntityId;
    spellId: string;
    proficiency?: number;
    spellName?: string;
    paradigmId?: string;
    source?: string;
    deityId?: string;
  };
  'magic:spell_learned_confirmed': {
    entityId: EntityId;
    spellId: string;
    spellName: string;
    paradigmId: string;
    initialProficiency: number;
  };
  'magic:grant_mana': {
    entityId: EntityId;
    source: 'arcane' | 'divine' | 'void' | 'nature' | 'psionic' | 'blood' | 'ancestral';
    amount: number;
  };
  'magic:terminal_warning': {
    spellId: string;
    warning?: string;
  };
  'magic:terminal_effect': {
    spellId: string;
    effect: {
      type: string;
      cause?: string;
      [key: string]: unknown;
    };
  };
  'vision:received': {
    agentId: EntityId;
    deityId?: EntityId;
    visionType?: string;
    content?: string;
    clarity?: number;
    position?: { x: number; y: number };
    vision?: string;
  };
  'sacred_site:named': {
    siteId: string;
    name: string;
    namedBy: string;
  };
  'sacred_site:created': {
    siteId: string;
    type: 'natural' | 'built' | 'emergent';
    position: { x: number; y: number };
    buildingId?: string;
    buildingType?: string;
  };
  'sacred_site:discovered': {
    siteId: string;
    type: 'natural' | 'built' | 'emergent';
    position: { x: number; y: number };
    discoveredBy?: string;
    answerRate?: number;
  };
  'group_prayer:call': {
    leaderId: string;
    location: { x: number; y: number };
    message?: string;
    tick: number;
    deityId?: string;
  };
  'group_prayer:joined': {
    participantId: string;
    leaderId: string;
    tick: number;
  };
  'group_prayer:complete': {
    leaderId: string;
    participants: string[];
    tick: number;
    duration: number;
    deityId?: string;
    answered: boolean;
    prayerPower: number;
  };
  'group_vision:received': {
    participants: string[];
    deityId?: string;
    clarity: number;
    prayerPower: number;
  };
  'prayer:complete': {
    agentId: EntityId;
    deityId: EntityId;
    prayerType?: string;
    prayerId?: string;
    answered: boolean;
    duration?: number;
  };
  'angel:answered_prayer': {
    angelId: string;
    deityId: string;
    agentId: string;
    prayerId: string;
    tone: 'gentle' | 'firm' | 'urgent' | 'encouraging';
    response?: string;
  };
  'angel:task_completed': {
    angelId: string;
    taskType: string;
    targetId?: string;
  };
  'soul:ceremony_started': {
    context: {
      parentSouls?: string[];
      culture?: string;
      cosmicAlignment: number;
      isReforging?: boolean;
      previousWisdom?: number;
      previousLives?: number;
    };
    observers?: string[];
  };
  'soul:fate_thinking': {
    speaker: 'weaver' | 'spinner' | 'cutter';
  };
  'soul:fate_speaks': {
    speaker: 'weaver' | 'spinner' | 'cutter';
    text: string;
    topic: 'examination' | 'purpose' | 'interests' | 'destiny' | 'debate' | 'blessing' | 'curse' | 'finalization';
  };
  'soul:ceremony_complete': {
    soulId: string;
    agentId?: string; // For backward compatibility (same as soulId until soul is incarnated)
    name: string; // Soul name for repository
    species: string; // Soul species/origin for repository
    purpose: string;
    interests: string[];
    destiny?: string;
    archetype: string;
    transcript: Array<{
      speaker: 'weaver' | 'spinner' | 'cutter' | 'soul' | 'chorus';
      text: string;
      tick: number;
      topic: 'examination' | 'purpose' | 'interests' | 'destiny' | 'debate' | 'blessing' | 'curse' | 'finalization';
      thoughts?: string; // LLM thinking content for debugging
    }>;
    thoughts?: string; // Compiled Fate reasoning from transcript
  };
  'soul:became_shade': {
    entityId: string;
    timeSinceDeath: number;
  };
  'soul:passed_on': {
    entityId: string;
    timeSinceDeath: number;
    wasAncestorKami: boolean;
  };
  'soul:became_restless': {
    entityId: string;
    unfinishedGoals: string[];
  };
  'soul:became_ancestor_kami': {
    entityId: string;
    kamiRank: 'minor' | 'local' | 'regional';
    blessings: string[];
    curses: string[];
    descendants: string[];
    familyName?: string;
  };
  'soul:annihilated': {
    entityId: string;
    deityId?: string;
    context?: string;
  };
  'soul:reincarnation_queued': {
    entityId: string;
    deityId?: string;
    target: 'same_world' | 'same_universe' | 'any_universe' | 'specific';
    memoryRetention: 'full' | 'fragments' | 'dreams' | 'talents' | 'none';
    speciesConstraint: 'same' | 'similar' | 'any' | 'karmic';
    minimumDelay: number;
    maximumDelay: number;
  };
  'soul:reincarnated': {
    /** Original entity ID that died */
    originalEntityId: string;
    /** New entity ID that was created */
    newEntityId: string;
    /** Deity that facilitated the reincarnation */
    deityId?: string;
    /** How much memory was retained */
    memoryRetention: 'full' | 'fragments' | 'dreams' | 'talents' | 'none';
    /** What species constraint was used */
    speciesConstraint: 'same' | 'similar' | 'any' | 'karmic';
    /** Number of memories preserved from past life */
    preservedMemoryCount: number;
    /** Name in previous life */
    previousName?: string;
    /** Name in new life */
    newName: string;
    /** Soul's true name (persistent across incarnations) */
    soulName?: string;
    /** Soul's origin culture/species */
    soulOriginCulture?: string;
    /** Number of incarnations this soul has had */
    incarnationCount?: number;
  };
  'soul:animation_requested': {
    soulId: string;
    spriteFolderId: string;
    animationType: 'walking-8-frames' | 'idle' | 'combat';
    incarnationCount: number;
    soulName: string;
  };
  'possession:tick': {
    agentId: string;
    beliefSpent: number;
    beliefRemaining: number;
    ticksRemaining: number;
  };
  'possession:jack_in': {
    agentId: string;
    initialCost: number;
    beliefRemaining: number;
  };
  'possession:jack_out': {
    agentId: string | null;
    totalBeliefSpent: number;
    reason: string;
  };
  'possession:cross_universe_jackout': {
    deityId: string;
    entityId: string;
    entityName: string;
    targetUniverseId: string;
  };
  'deity:manifested': {
    deityId: EntityId;
    deityName: string;
    deityType: 'death_god' | 'wisdom_goddess';
    reason: string;
    location: { x: number; y: number };
    message: string;
  };
  'wisdom:scrutiny_started': {
    goddessId: EntityId;
    goddessName: string;
    creationId: string;
    creationType: 'recipe' | 'technology' | 'effect';
    creatorId: EntityId;
    creatorName: string;
  };
  'wisdom:judgment': {
    goddessId: EntityId;
    goddessName: string;
    creationId: string;
    creationType: 'recipe' | 'technology' | 'effect';
    creatorId: EntityId;
    creatorName: string;
    approved: boolean;
    wisdomComment: string;
    balanceScore: number;
    noveltyScore: number;
    fitScore: number;
  };
  'wisdom:queue_processed': {
    goddessId: EntityId;
    goddessName: string;
    totalProcessed: number;
    approved: number;
    rejected: number;
  };
  'divine:intervention': {
    deityId?: string;
    interventionType: string;
    targetId?: string;
    description?: string;
  };
  'magic:liberated': {
    message: string;
    level: 'full';
  };
  'magic:partially_liberated': {
    message: string;
    level: 'partial';
  };
  'magic:skill_node_unlocked': {
    nodeId: string;
    agentId: string;
    skillTree: string;
  };
  'magic:spell_unlocked_from_skill_tree': {
    spellId: string;
    agentId: string;
    nodeId: string;
  };
}

export type MagicEventType = keyof MagicEvents;
export type MagicEventData = MagicEvents[MagicEventType];
