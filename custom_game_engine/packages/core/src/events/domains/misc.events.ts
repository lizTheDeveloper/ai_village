/**
 * Miscellaneous events not fitting other domains.
 */
import type { EntityId } from '../../types.js';

export interface MiscEvents {
  // === Memory Events ===
  'memory:formed': {
    agentId: EntityId;
    memoryType: 'episodic' | 'semantic' | 'social';
    content: string;
    importance: number;
    eventType?: string;
    timestamp?: number;
  };

  'memory:forgotten': {
    agentId: EntityId;
    memoryId: string;
  };

  'memory:recalled': {
    agentId: EntityId;
    memoryId: string;
    timestamp?: number;
  };

  'memory:consolidated': {
    agentId: EntityId;
    summary: string;
    originalCount: number;
  };

  'memory_bleed': {
    agentId: string;
    memoryFragment?: string;
    intensity?: number;
  };

  // === Belief Events ===
  'belief:formed': {
    agentId: EntityId;
    entityId?: EntityId;
    beliefType: string;
    content: string;
    confidence: number;
  };

  'belief:generated': {
    deityId: EntityId;
    amount: number;
    believers: number;
    currentBelief: number;
  };

  // === Mood Events ===
  'mood:changed': {
    agentId: EntityId;
    currentMood: number;
    emotionalState: string;
    description: string;
  };

  'mood:strange_mood': {
    agentId: EntityId;
    moodType: 'fey' | 'secretive' | 'possessed' | 'macabre' | 'fell';
    requiredMaterials?: string[];
    requiredWorkshop?: string;
  };

  'mood:artifact_created': {
    agentId: EntityId;
    artifactId: string;
    artifactName: string;
    skillGained: string;
  };

  'mood:insanity': {
    agentId: EntityId;
    insanityType: 'melancholy' | 'berserk' | 'catatonic';
    reason: string;
  };

  // === Skill Events ===
  'skill:xp_gain': {
    agentId: EntityId;
    skillId: string;
    amount: number;
    source: string;
  };

  'skill:level_up': {
    agentId: EntityId;
    skillId: string;
    oldLevel: number;
    newLevel: number;
  };

  // === Trauma & Stress Events ===
  'trauma:experienced': {
    agentId: EntityId;
    traumaType: string;
    severity: number;
    relatedEntityId?: EntityId;
  };

  'stress:breakdown': {
    agentId: EntityId;
    type: 'tantrum' | 'catatonic' | 'berserk' | 'strange_mood' | 'depression' | 'panic_attack';
    stressLevel: number;
    trigger?: string;
  };

  'stress:recovered': {
    agentId: EntityId;
    breakdownType: string;
    duration: number;
  };

  // === Interest Events ===
  'interest:emerged': {
    agentId: EntityId;
    agentName: string;
    topic: string;
    newIntensity: number;
    source: string; // InterestSource
    trigger?: string; // What caused it (e.g., 'skill:farming', 'agent:death', teacher name)
  };

  'interest:strengthened': {
    agentId: EntityId;
    agentName: string;
    topic: string;
    oldIntensity: number;
    newIntensity: number;
    source: string; // InterestSource
    trigger?: string;
  };

  'interest:weakened': {
    agentId: EntityId;
    agentName: string;
    topic: string;
    oldIntensity: number;
    newIntensity: number;
    source: string; // InterestSource
    trigger?: string;
  };

  'interest:lost': {
    agentId: EntityId;
    agentName: string;
    topic: string;
    oldIntensity: number;
    newIntensity: number;
    source: string; // InterestSource
    trigger?: string;
  };

  'interest:transferred': {
    agentId: EntityId;
    agentName: string;
    topic: string;
    oldIntensity?: number;
    newIntensity: number;
    source: string; // InterestSource (will be 'learned')
    trigger?: string; // Teacher name
  };

  'interest:hungry': {
    agentId: EntityId;
    /** Topics with high discussion hunger */
    topics: string[];
    /** Agent's depth hunger level 0-1 */
    depthHunger: number;
  };

  // === Information Events ===
  'information:shared': {
    from: EntityId;
    to: EntityId;
    informationType: string;
    content: unknown;
    memoryType?: string;
  };

  // === Guild Events ===
  'guild:joined': {
    agentId: EntityId;
    guildId: string;
  };

  'guild:left': {
    agentId: EntityId;
    guildId: string;
    reason?: 'resigned' | 'expelled' | 'disbanded';
  };

  'guild:petition': {
    guildId: string;
    petitionType: 'guild_hall' | 'tavern' | 'temple' | 'library';
    status: 'requested' | 'approved' | 'denied';
  };

  // === Title Events ===
  'title:granted': {
    agentId: EntityId;
    title: string;
    grantedBy?: EntityId;
  };

  'title:revoked': {
    agentId: EntityId;
    title: string;
    revokedBy?: EntityId;
    reason?: string;
  };

  // === Village Events ===
  'village:under_attack': {
    villageId?: string;
    attackerIds: string[];
    threatLevel: number;
  };

  'village:defended': {
    villageId?: string;
    defendersCount: number;
    attackersRepelled: number;
  };

  // === Weather Events ===
  // Note: Village governance events moved to governance.events.ts
  'weather:changed': {
    weatherType: string;
    intensity?: string | number;
    oldWeather?: string;
    causedBy?: string;
    divine?: boolean;
  };

  'weather:rain': {
    intensity?: 'light' | 'moderate' | 'heavy' | number;
  };

  'weather:snow': {
    intensity?: 'light' | 'moderate' | 'heavy' | number;
  };

  'weather:frost': {
    temperature?: number;
  };

  // === Temperature Events ===
  'temperature:comfortable': {
    agentId: EntityId;
    entityId?: EntityId;
    temperature: number;
    state?: string;
  };

  'temperature:danger': {
    agentId: EntityId;
    entityId?: EntityId;
    temperature: number;
    health: number;
    state?: string;
  };

  // === Fire Events ===
  'fire:ignited': {
    entityId: EntityId;
    intensity: number;
    source: 'spell' | 'spread' | 'breath' | 'other';
  };

  'fire:extinguished': {
    entityId: EntityId;
  };

  'fire:tile_ignited': {
    x: number;
    y: number;
    material?: string;
  };

  'fire:tile_extinguished': {
    x: number;
    y: number;
  };

  // === Disaster Events ===
  'disaster:occurred': {
    disasterType: string;
    location: { x: number; y: number };
    severity: number;
    affectedEntities?: string[];
  };

  // === Fluid Events ===
  'fluid:changed': {
    x: number;
    y: number;
    z?: number;
  };

  // === Voxel Resource Events ===
  'voxel_resource:falling_started': {
    entityId: string;
    resourceType: string;
    position: { x: number; y: number };
    height: number;
    fallDirection: { x: number; y: number };
  };

  'voxel_resource:fell': {
    entityId: string;
    resourceType: string;
    material: string;
    originalPosition: { x: number; y: number };
    fallPosition: { x: number; y: number };
    resourcesDropped: number;
    height: number;
  };

  // === Death Events ===
  'death:occurred': {
    entityId: string;
    cause: string;
    location: { x: number; y: number; z: number };
    time: number;
  };

  'death:witnessed': {
    witnessId: string;
    deceasedId: string;
    traumatic: boolean;
  };

  'death:judgment_started': {
    entityId: string;
    psychopompName: string;
    causeOfDeath: string;
  };

  'death:exchange': {
    entityId: string;
    speaker: 'psychopomp' | 'soul';
    text: string;
    exchangeIndex: number;
  };

  'death:judgment_delivered': {
    entityId: string;
    peace: number;
    tether: number;
    coherenceModifier: number;
  };

  'death:crossing_over': {
    entityId: string;
  };

  'death:bargain_offered': {
    entityId: string;
    psychopompName: string;
    challengeType: 'riddle' | 'memory' | 'knowledge' | 'philosophy';
    challenge?: string;
  };

  'death:challenge_started': {
    entityId: string;
    psychopompName: string;
    challenge: string;
  };

  'death:challenge_succeeded': {
    entityId: string;
    psychopompName: string;
    attempts: number;
  };

  'death:challenge_failed': {
    entityId: string;
    psychopompName: string;
    attempts: number;
  };

  'death:final': {
    entityId: string;
    psychopompName: string;
    challengeType: string;
  };

  'death:notification': {
    deceasedId: string;
    notifiedAgents: string[];
  };

  // === Entity Events ===
  'entity:destroyed': {
    entityId: EntityId;
    finalState?: unknown;
    reason?: string;
  };

  'entity:component:added': {
    entityId: EntityId;
    componentType: string;
  };

  'entity:component:removed': {
    entityId: EntityId;
    componentType: string;
  };

  // === LLM Events ===
  'llm:request': {
    agentId: EntityId;
    promptLength: number;
    reason: 'idle' | 'task_complete' | 'periodic' | 'manual' | 'talker';
    /** Which LLM layer is making this request */
    llmType?: 'executor' | 'talker' | 'standard';
  };

  'llm:response': {
    agentId: EntityId;
    responseLength: number;
    success: boolean;
    latencyMs?: number;
  };

  'llm:decision': {
    agentId: EntityId;
    decision: string;
    behavior?: string;
    reasoning?: string;
    source: 'llm' | 'fallback' | 'executor' | 'talker';
    /** Raw LLM response text (truncated to 2000 chars for metrics) */
    rawResponse?: string;
    /** Duration of LLM call in milliseconds */
    latencyMs?: number;
  };

  'llm:error': {
    agentId: EntityId;
    error: string;
    errorType: 'timeout' | 'connection' | 'parse' | 'unknown' | 'executor_error' | 'talker_error';
  };

  // === Conception Events ===
  'conception': {
    pregnantAgentId: string;
    otherParentId: string;
    conceptionTick: number;
  };

  // === Myth Events ===
  'myth:attribution_changed': {
    mythId: string;
    mythTitle: string;
    originalDeityId: EntityId;
    newDeityId: EntityId;
    timestamp: number;
  };

  'mythology:myth_created': {
    mythId: string;
    title: string;
    deityId: EntityId;
    deityName?: string;
    category: 'origin' | 'miracle' | 'moral' | 'prophecy' | 'parable' | 'heroic_deed' | 'cosmic_event' | 'political' | 'disaster';
    eventType: string;
    originalWitnessId?: string;
    protagonistIds?: string[];
    timestamp: number;
  };

  'mythology:legend_formed': {
    legendId: string;
    title: string;
    heroId: EntityId;
    heroName: string;
    achievement: string;
    difficulty: 'minor' | 'notable' | 'heroic' | 'legendary' | 'mythic';
    witnessCount: number;
    timestamp: number;
  };

  // === Progression Events ===
  'progression:xp_gained': {
    skill: string;
    amount: number;
    builderId?: string;
    xpGained?: number;
  };

  // === Reporter Events ===
  'reporter:search_failed': {
    reporterId: string;
    purpose: string;
  };

  // === Animation Events ===
  'animation:created': {
    animationType: string;
    duration: number;
    entityId: string;
    startPosition: { x: number; y: number };
    endPosition: { x: number; y: number };
  };

  // === Union Events ===
  'union:formed': {
    agent1Id: string;
    agent2Id: string;
    unionType?: string;
  };

  // === Reflection Events ===
  'reflection:completed': {
    agentId: EntityId;
    reflectionCount: number;
    reflectionType?: string;
  };

  // === VR Session Events ===
  'vr_session:started': {
    sessionId: string;
    participantIds: string[];
    scenarioType: string;
    scenarioDescription: string;
  };

  'vr_session:ended': {
    sessionId: string;
    participantIds: string[];
    duration: number;
    scenarioType: string;
    completed: boolean;
  };

  // === Festival Events ===
  'festival:started': {
    festivalType: string;
    location: { x: number; y: number };
    organizerId?: string;
    participants?: string[];
  };

  // === Squadron Events ===
  'squadron:ship_joined': {
    squadronId: string;
    shipId: string;
  };

  'squadron:ship_left': {
    squadronId: string;
    shipId: string;
  };

  'squadron:ship_missing': {
    squadronId: string;
    missingShipId: string;
  };

  'squadron:disbanding': {
    squadronId: string;
    reason: string;
    remainingShips: number;
  };

  'squadron:formed': {
    squadronId: string;
    name: string;
    shipIds: string[];
    commanderId?: string;
  };

  'squadron:disbanded': {
    squadronId: string;
    reason: string;
  };

  'squadron:ship_lost': {
    squadronId: string;
    shipId: string;
    reason: 'combat' | 'accident' | 'decoherence' | 'unknown';
  };

  // === Communication Device Events ===
  'walkie_talkie_issued': {
    deviceId: string;
    agentId: string;
    model: string;
  };

  'walkie_talkie_transmission': {
    transmissionId: string;
    senderId: string;
    channel: number;
    message: string;
    receiverCount: number;
  };

  'cell_phone_issued': {
    phoneId: string;
    phoneNumber: string;
    agentId: string;
    generation: string;
  };

  'cell_phone_call_started': {
    callId: string;
    caller: string;
    receiver: string;
  };

  'cell_phone_text_sent': {
    messageId: string;
    sender: string;
    receiverNumber: string;
    hasMedia: boolean;
  };

  'cell_network_upgraded': {
    generation: string;
  };

  // === Emotion Theater Events ===
  'emotion_theater_session_started': {
    scenarioId: string;
    scenarioName: string;
    participantIds: string[];
    targetEmotion: string;
  };

  'emotion_theater_session_complete': {
    scenarioId: string;
    scenarioName: string;
    participantIds: string[];
    targetEmotion: string;
  };

  'emotion_theater_session_ended': {
    reason: string;
    participantIds: string[];
  };

  // === Memory Hall Events ===
  'memory_replay_complete': {
    memoryId: string;
    memoryTitle: string;
    viewerIds: string[];
  };

  'memory_recording_stopped': {
    reason: string;
    duration: number;
  };

  // === Meditation Chamber Events ===
  'meditation_session_complete': {
    technique: string;
    participantIds: string[];
    duration: number;
  };

  // === Taming & Bond Events ===
  'bond_level_changed': {
    animalId: EntityId;
    agentId: EntityId;
    oldLevel: string;
    newLevel: string;
    bondLevel: number;
  };

  // === Uplift & Consciousness Events ===
  'consciousness_awakened': {
    entityId: EntityId;
    entityName: string;
    programId: string;
    sourceSpecies: string;
    generation: number;
    awakening: {
      tick: number;
      generation: number;
      firstThought: string;
      firstQuestion: string;
      firstEmotion: string;
      firstWord: string;
      witnessIds: string[];
    };
  };

  'proto_sapience_milestone': {
    entityId: EntityId;
    milestone: 'first_tool_use' | 'first_tool_creation' | 'proto_language_emergence' | 'abstract_thinking' | 'mirror_test_passed' | 'cultural_tradition_emerged';
    generation?: number;
    intelligence: number;
    tradition?: string;
  };

  // === Uplift Program Events ===
  'uplift_candidate_detected': {
    entityId: EntityId;
    speciesId: string;
    upliftPotential: number;
    preSapient: boolean;
    estimatedGenerations: number;
  };

  'uplift_generation_advanced': {
    programId: string;
    generation: number;
    intelligence: number;
    result: unknown;
  };

  'uplift_stage_changed': {
    programId: string;
    previousStage: string;
    newStage: string;
    generation: number;
    intelligence: number;
  };

  'uplift_population_extinct': {
    programId: string;
    generation: number;
    reason: string;
  };

  'uplifted_species_registered': {
    speciesId: string;
    speciesName: string;
    programId: string;
    sourceSpeciesId: string;
  };

  // === Empire Governance Events ===
  'empire:annual_update': {
    empireName: string;
    totalPopulation: number;
    totalGDP: number;
    vassalLoyalty: number;
    separatistMovements: number;
    tick: number;
  };

  'empire:separatist_movement_active': {
    empireName: string;
    movementId: string;
    movementName: string;
    strength: number;
    tick: number;
  };

  'empire:nation_added': {
    empireName: string;
    nationId: string;
    isCore: boolean;
    autonomy: number;
    tick: number;
  };

  // === Test Events ===
  'test:event': {
    [key: string]: unknown;
  };
}

export type MiscEventType = keyof MiscEvents;
export type MiscEventData = MiscEvents[MiscEventType];
