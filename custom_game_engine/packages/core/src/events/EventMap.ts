/**
 * Typed event definitions for compile-time type safety.
 *
 * Each event type maps to its expected data payload structure.
 * This prevents typos in event data and enables autocomplete in IDEs.
 */

import type { EntityId } from '../types.js';

/**
 * Map of event types to their data payloads.
 *
 * Usage:
 * ```typescript
 * eventBus.emit<'agent:action:started'>({
 *   type: 'agent:action:started',
 *   source: agentId,
 *   data: { actionId: 'abc', actionType: 'till' } // Typed!
 * });
 *
 * eventBus.subscribe<'agent:action:started'>('agent:action:started', (event) => {
 * });
 * ```
 */
export interface GameEventMap {
  // === World & Time Events ===
  'world:tick:start': { tick: number };
  'world:tick:end': { tick: number };
  'world:loaded': { tick: number; entityCount: number };  // Emitted after world state is restored from save
  'world:time:hour': { hour: number; day: number };
  'world:time:day': { day: number; season: string };
  'world:time:season': { season: string; year: number };
  'world:time:year': { year: number };

  // === Agent Action Events ===
  'agent:action:started': {
    actionId: string;
    actionType: string;
  };
  'agent:action:completed': {
    actionId: string;
    actionType: string;
    agentId?: string;
    success?: boolean;
    result?: unknown;
    reason?: string;
  };
  'agent:action:failed': {
    actionId: string;
    actionType: string;
    reason: string;
  };
  'agent:queue:completed': {
    agentId: EntityId;
  };
  'agent:queue:interrupted': {
    agentId: EntityId;
    reason: string;
    interruptedBy?: string;
  };
  'agent:queue:resumed': {
    agentId: EntityId;
    resumedAt?: number;
  };

  // === Agent State Events ===
  'agent:idle': {
    agentId: EntityId;
    entityId?: EntityId;
    timestamp?: number;
    location?: { x: number; y: number };
  };
  'agent:sleeping': {
    agentId: EntityId;
    entityId?: EntityId;
    timestamp?: number;
    location?: { x: number; y: number };
  };
  'agent:sleep_start': {
    agentId: EntityId;
    entityId?: EntityId;
    timestamp?: number;
  };
  'agent:woke': {
    agentId: EntityId;
    timestamp?: number;
  };
  'agent:dreamed': {
    agentId: EntityId;
    dreamContent?: string;
    entityId?: EntityId;
  };
  'agent:ate': {
    agentId: EntityId;
    foodType: string;
    hungerRestored: number;
    amount?: number;
    storageId?: EntityId;
    fromStorage?: boolean;
    fromPlant?: EntityId;
    /** Food quality for mood system (0-100) */
    quality?: number;
    /** Flavor profile for preference system */
    flavors?: ('sweet' | 'savory' | 'spicy' | 'bitter' | 'sour' | 'umami')[];
  };
  'agent:collapsed': {
    agentId: EntityId;
    reason: 'exhaustion' | 'starvation' | 'temperature';
    entityId?: EntityId;
  };
  'agent:starved': {
    agentId: EntityId;
    survivalRelevance?: number;
  };
  'agent:health_critical': {
    agentId: EntityId;
    health: number;
    entityId?: EntityId;
  };
  'agent:unconscious': {
    entityId: EntityId;
  };
  'agent:regained_consciousness': {
    entityId: EntityId;
  };
  'body:modifications_expired': {
    entityId: EntityId;
    modificationIds: string[];
  };
  'agent:harvested': {
    agentId: EntityId;
    plantId: EntityId;
    speciesId: string;
    position: { x: number; y: number };
    harvested: Array<{ itemId: string; amount: number }>;
    resourceId?: EntityId;
  };
  'agent:broadcast': {
    agentId: EntityId;
    message: string;
    recipients?: EntityId[];
    tick?: number;
  };

  // === Agent Behavior Events ===
  'behavior:change': {
    agentId: EntityId;
    from: string;
    to: string;
    reason?: string;
    layer?: string; // Which LLM layer made this decision (autonomic, talker, executor)
  };

  // === Soil & Farming Events ===
  'soil:tilled': {
    x: number;
    y: number;
    agentId?: EntityId;
  };
  'soil:watered': {
    x: number;
    y: number;
    amount: number;
  };
  'soil:fertilized': {
    x: number;
    y: number;
    fertilizerType: string;
    nutrientBoost: number;
  };
  'soil:depleted': {
    x: number;
    y: number;
    nutrientLevel: number;
  };
  'soil:moistureChanged': {
    x: number;
    y: number;
    oldMoisture: number;
    newMoisture: number;
  };

  // === Action-specific Events ===
  'action:till': {
    x: number;
    y: number;
    agentId?: EntityId;
    actorId?: EntityId;
    position?: { x: number; y: number };
  };
  'action:plant': {
    x: number;
    y: number;
    agentId?: EntityId;
    seedType?: string;
    speciesId?: string;
  };
  'action:water': {
    x?: number;
    y?: number;
    agentId?: EntityId;
    plantId?: EntityId;
    position?: { x: number; y: number };
  };
  'action:completed': {
    actionType: string;
    actionId?: string;
    agentId?: EntityId;
    actorId?: EntityId;
    position?: { x: number; y: number };
  };
  'action:failed': {
    actionType: string;
    actionId?: string;
    agentId?: EntityId;
    actorId?: EntityId;
    reason: string;
  };
  'action:gather_seeds': {
    actionId: string;
    actorId: EntityId;
    agentId?: EntityId;
    plantId: EntityId;
    speciesId: string;
    seedsGathered: number;
    position: { x: number; y: number };
  };
  'action:harvest': {
    actionId?: string;
    actorId?: EntityId;
    agentId?: EntityId;
    plantId?: EntityId;
    speciesId?: string;
    harvested?: Array<{ itemId: string; amount: number }>;
    position?: { x: number; y: number };
  };

  // === Plant Events ===
  'plant:stageChanged': {
    plantId: EntityId;
    speciesId: string;
    from: string;
    to: string;
    entityId?: EntityId;
  };
  'plant:healthChanged': {
    plantId: EntityId;
    oldHealth: number;
    newHealth: number;
    reason?: string;
    entityId?: EntityId;
  };
  'plant:mature': {
    plantId: EntityId;
    speciesId: string;
    position?: { x: number; y: number };
  };
  'plant:died': {
    plantId: EntityId;
    speciesId: string;
    cause: string;
    entityId?: EntityId;
  };
  'plant:dead': {
    entityId: EntityId;
    position?: { x: number; y: number };
  };
  'plant:nutrientConsumption': {
    x: number;
    y: number;
    consumed: number;
    position?: { x: number; y: number };
  };
  'plant:nutrientReturn': {
    x: number;
    y: number;
    returned: number;
    position?: { x: number; y: number };
  };
  'plant:fruitRegenerated': {
    plantId: EntityId;
    speciesId: string;
    fruitAdded: number;
    totalFruit: number;
    position?: { x: number; y: number };
  };
  'plant:companionEffect': {
    plantId: EntityId;
    speciesId: string;
    position: { x: number; y: number };
    benefitCount: number;
    harmCount: number;
    modifier: number;
  };

  // === Plant Disease & Pest Events ===
  'plant:diseaseContracted': {
    entityId: string;
    diseaseId: string;
    diseaseName: string;
    incubationDays: number;
  };
  'plant:diseaseSymptoms': {
    entityId: string;
    diseaseId: string;
    diseaseName: string;
    severity: string;
  };
  'plant:diseaseSpread': {
    fromEntityId: string;
    toEntityId: string;
    diseaseId: string;
    diseaseName: string;
  };
  'plant:diseaseRecovered': {
    entityId: string;
    diseaseId: string;
    diseaseName: string;
  };
  'plant:diseaseTreated': {
    entityId: string;
    diseaseId: string;
    diseaseName: string;
    treatmentId: string;
  };
  'plant:diedFromDisease': {
    entityId: string;
    diseaseId: string;
    diseaseName: string;
  };
  'plant:pestInfestation': {
    entityId: string;
    pestId: string;
    pestName: string;
    population: number;
  };
  'plant:pestMigrated': {
    fromEntityId: string;
    toEntityId: string;
    pestId: string;
    pestName: string;
    population: number;
  };
  'plant:pestsGone': {
    entityId: string;
    pestId: string;
    pestName: string;
  };
  'plant:pestsEliminated': {
    entityId: string;
    pestId: string;
    pestName: string;
    treatmentId: string;
  };
  'plant:treated': {
    entityId: string;
    treatmentId: string;
    treatmentType: string;
  };

  // === Seed Events ===
  'seed:gathered': {
    agentId: EntityId;
    actorId?: EntityId;
    plantId: EntityId;
    speciesId: string;
    seedCount: number;
    sourceType?: 'wild' | 'cultivated';
    position?: { x: number; y: number };
    actionId?: string;
  };
  'seed:harvested': {
    agentId: EntityId;
    actorId?: EntityId;
    plantId: EntityId;
    speciesId: string;
    seedCount: number;
    seedsHarvested?: number;
    farmingSkill?: number;
    plantHealth?: number;
    plantStage?: string;
    generation?: number;
    position?: { x: number; y: number };
    actionId?: string;
  };
  'seed:dispersed': {
    plantId: EntityId;
    speciesId: string;
    seedCount: number;
    positions: Array<{ x: number; y: number }>;
    position?: { x: number; y: number };
    seed?: any; // SeedComponent - optional to avoid circular dependency
  };
  'seed:germinated': {
    seedId: EntityId;
    speciesId: string;
    position: { x: number; y: number };
    generation?: number;
  };
  'seed:planted': {
    actionId?: string;
    actorId: EntityId;
    speciesId: string;
    position: { x: number; y: number };
    seedItemId?: string;
  };

  // === Wild Plant Population Events ===
  'wild_plant:spawn': {
    speciesId: string;
    position: { x: number; y: number };
    biome: string;
  };

  // === Harvest Events ===
  'harvest:completed': {
    agentId: EntityId;
    position: { x: number; y: number };
    harvested: Array<{ itemId: string; amount: number }>;
  };

  // === Resource Events ===
  'resource:gathered': {
    agentId: EntityId;
    resourceType: string;
    amount: number;
    position: { x: number; y: number };
    sourceEntityId?: EntityId;
  };
  'resource:depleted': {
    resourceId: EntityId;
    resourceType: string;
    agentId?: EntityId;
  };
  'resource:regenerated': {
    resourceId: EntityId;
    resourceType: string;
    amount: number;
  };

  // === Building Events ===
  'building:placement:started': {
    blueprintId: string;
  };
  'building:placement:confirmed': {
    blueprintId: string;
    buildingId?: EntityId;
    position: { x: number; y: number };
    rotation: number;
  };
  'building:placement:cancelled': Record<string, never>; // No data
  'building:placement:complete': {
    buildingId: EntityId;
    blueprintId: string;
    position: { x: number; y: number };
    rotation: number;
    entityId?: EntityId;
  };
  'building:placement:failed': {
    blueprintId: string;
    position: { x: number; y: number };
    reason: 'terrain_invalid' | 'terrain_occupied' | 'resource_missing' | 'invalid_rotation';
  };
  'building:complete': {
    buildingId: EntityId;
    buildingType: string;
    entityId?: EntityId;
    position?: { x: number; y: number };
    builderId?: EntityId;
  };
  'building:spawned': {
    buildingId: EntityId;
    buildingType: string;
    cityId: string;
    position: { x: number; y: number };
    isComplete: boolean;
  };
  'building:destroyed': {
    buildingId: EntityId;
  };
  'building:claimed': {
    agentId: EntityId;
    buildingId: EntityId;
    buildingType: string;
    timestamp: number;
  };
  'building:menu:opened': Record<string, never>;
  'building:menu:closed': Record<string, never>;
  'building:needs_repair': {
    buildingId: EntityId;
    condition: number;
    timestamp: number;
  };
  'building:critical_repair': {
    buildingId: EntityId;
    condition: number;
    timestamp: number;
  };
  'building:collapse_imminent': {
    buildingId: EntityId;
    condition: number;
    timestamp: number;
  };
  'construction:started': {
    buildingId: EntityId;
    blueprintId: string;
    entityId?: EntityId;
    buildingType?: string;
    position?: { x: number; y: number };
    builderId?: EntityId;
  };
  'construction:gathering_resources': {
    buildingId: EntityId;
    agentId: EntityId;
    builderId?: EntityId;
  };
  'construction:failed': {
    buildingId: EntityId;
    reason: string;
    builderId?: EntityId;
    agentId: EntityId;
  };

  // === Tile Construction Events (Voxel Building System) ===
  'construction:task_created': {
    taskId: string;
    blueprintId?: string;
    position?: { x: number; y: number };
    builderId?: EntityId;
  };
  'construction:task_started': {
    taskId: string;
    blueprintId?: string;
  };
  'construction:task_cancelled': {
    taskId: string;
    reason?: string;
  };
  'construction:task_completed': {
    taskId: string;
    blueprintId?: string;
    position?: { x: number; y: number };
  };
  'construction:material_delivered': {
    taskId: string;
    tilePosition?: { x: number; y: number };
    materialId?: string;
    builderId?: string;
  };
  'construction:tile_placed': {
    taskId: string;
    tilePosition?: { x: number; y: number };
    tileType?: string;
    materialId?: string;
    builderId?: string;
    collaborators?: string[];
  };

  // === Door Events (Tile-Based Buildings) ===
  'door:opened': {
    x: number;
    y: number;
    tick: number;
  };
  'door:closed': {
    x: number;
    y: number;
    tick: number;
  };

  // === Demolition Events (Tile-Based Buildings) ===
  'construction:tile_demolished': {
    x: number;
    y: number;
    tileType: 'wall' | 'door' | 'window';
    material: string;
  };

  // === Terrain & Fluid Events ===
  'terrain:modified': {
    x: number;
    y: number;
    z?: number;
  };
  'fluid:changed': {
    x: number;
    y: number;
    z?: number;
  };

  // === Progression Events ===
  'progression:xp_gained': {
    skill: string;
    amount: number;
    builderId?: string;
    xpGained?: number;
  };

  // === Relationship Events ===
  'relationship:improved': {
    targetAgent: string;
    reason: string;
    amount: number;
  };
  'friendship:formed': {
    agent1: EntityId;
    agent2: EntityId;
    agent1Name: string;
    agent2Name: string;
  };

  // === Zone Events ===
  'zone:menu:opened': Record<string, never>;
  'zone:menu:closed': Record<string, never>;
  'zone:type:selected': {
    zoneType: string;
  };
  'zone:painted': {
    zoneId: string;
    zoneType: string;
    tileCount: number;
  };
  'zone:erased': {
    tileCount: number;
  };

  // === Crafting Events ===
  'crafting:job_queued': {
    jobId: string | number;
    recipeId: string;
    station?: EntityId;
  };
  'crafting:job_started': {
    jobId: string | number;
    recipeId: string;
    agentId: EntityId;
  };
  'crafting:job_completed': {
    jobId: string | number;
    recipeId: string;
  };
  'crafting:job_cancelled': {
    jobId: string | number;
    reason?: string;
  };
  'crafting:completed': {
    jobId: string | number;
    recipeId: string;
    agentId: EntityId;
    produced: Array<{ itemId: string; amount: number; quality?: number }>;
  };
  'crafting:panel_opened': Record<string, never>;
  'crafting:panel_closed': Record<string, never>;
  'crafting:recipe_selected': {
    recipeId: string;
  };

  // === Cooking Events ===
  'cooking:completed': {
    agentId: EntityId;
    recipeId: string;
    itemId: string;
    quantity: number;
    quality: number;
    xpGained: number;
    leveledUp: boolean;
    newLevel?: number;
  };

  // === Conversation & Social Events ===
  'conversation:started': {
    participants: EntityId[];
    initiator: EntityId;
    agent1?: EntityId;
    agent2?: EntityId;
  };
  'conversation:utterance': {
    conversationId: string;
    speaker: EntityId;
    speakerId?: EntityId;
    listenerId?: EntityId;
    message: string;
  };
  'conversation:ended': {
    conversationId: string;
    participants: EntityId[];
    duration: number;
    agent1?: EntityId;
    agent2?: EntityId;
    /** Topics discussed in this conversation (Deep Conversation System) */
    topics?: string[];
    /** Conversation depth 0-1 (Deep Conversation System) */
    depth?: number;
    /** Message count in this conversation */
    messageCount?: number;
    /** Overall quality score 0-1 (Deep Conversation System) */
    quality?: number;
  };
  /** An agent joined an ongoing conversation */
  'conversation:joined': {
    conversationId: string;
    joinerId: EntityId;
    participants: EntityId[];
  };
  /** A topic was shared during conversation (Deep Conversation System) */
  'conversation:topic_shared': {
    speakerId: EntityId;
    listenerId: EntityId;
    topic: string;
    conversationId?: string;
  };
  /** Social fatigue threshold exceeded - agent wants to leave conversation */
  'conversation:fatigue_threshold_exceeded': {
    agentId: EntityId;
    fatigue: number;
    threshold: number;
    extraversion: number;
  };
  'information:shared': {
    from: EntityId;
    to: EntityId;
    informationType: string;
    content: unknown;
    memoryType?: string;
  };

  // === Interest Evolution Events (Deep Conversation System - Phase 7.1) ===
  /** A new interest emerged (from experience, skill, or conversation) */
  'interest:emerged': {
    agentId: EntityId;
    agentName: string;
    topic: string;
    newIntensity: number;
    source: string; // InterestSource
    trigger?: string; // What caused it (e.g., 'skill:farming', 'agent:death', teacher name)
  };
  /** An interest strengthened significantly */
  'interest:strengthened': {
    agentId: EntityId;
    agentName: string;
    topic: string;
    oldIntensity: number;
    newIntensity: number;
    source: string; // InterestSource
    trigger?: string;
  };
  /** An interest weakened significantly */
  'interest:weakened': {
    agentId: EntityId;
    agentName: string;
    topic: string;
    oldIntensity: number;
    newIntensity: number;
    source: string; // InterestSource
    trigger?: string;
  };
  /** An interest was lost (decayed below threshold) */
  'interest:lost': {
    agentId: EntityId;
    agentName: string;
    topic: string;
    oldIntensity: number;
    newIntensity: number;
    source: string; // InterestSource
    trigger?: string;
  };
  /** An interest was transferred from teacher to student */
  'interest:transferred': {
    agentId: EntityId;
    agentName: string;
    topic: string;
    oldIntensity?: number;
    newIntensity: number;
    source: string; // InterestSource (will be 'learned')
    trigger?: string; // Teacher name
  };

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

  // === Belief & Trust Events ===
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

  // === Divine Power Events ===
  /** Request from UI to execute a divine power */
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

  // === Divine Vision Events ===
  /** A vision has been queued for delivery to a mortal */
  'divinity:vision_queued': {
    visionId: string;
    deityId: EntityId;
    targetId: EntityId;
    visionType: 'dream' | 'meditation' | 'sign' | 'direct';
    purpose: string;
    beliefCost: number;
  };

  /** A vision was successfully delivered to a mortal */
  'divinity:vision_delivered': {
    visionId: string;
    deityId: EntityId;
    targetId: EntityId;
    visionType: 'dream' | 'meditation' | 'sign' | 'direct';
    content: string;
    clarity: 'obscure' | 'symbolic' | 'clear' | 'vivid';
  };

  /** A mortal interpreted a received vision */
  'divinity:vision_interpreted': {
    visionId: string;
    targetId: EntityId;
    interpretation: string;
    accuracy: number; // 0-1 how close to intended meaning
  };

  /** A prophecy contained in a vision has been fulfilled */
  'divinity:prophecy_fulfilled': {
    visionId: string;
    deityId: EntityId;
    prophecyContent: string;
    fulfillmentEvent: string;
  };

  /** Prayer resolved by a spirit (non-deity) */
  'prayer:resolved': {
    agentId: EntityId;
    prayerId: string;
    resolutionType: 'spirit' | 'nature' | 'self' | 'none';
    targetId?: EntityId;
    outcome: string;
  };

  /** Belief accumulation toward a proto-deity (deity emergence) */
  'divinity:proto_deity_belief': {
    agentId: EntityId;
    prayerContent: string;
    beliefContributed: number;
    timestamp: number;
    /** Potential deity concept forming */
    concept?: string;
  };

  /** Supreme Creator detected forbidden magic */
  'divinity:magic_detected': {
    casterId: string;
    spellId: string;
    detectionRisk: string;
    evidenceStrength?: number;
    forbiddenCategories?: string[];
    forced: boolean;
  };

  /** Surveillance alert level changed */
  'divinity:surveillance_alert': {
    oldLevel: string;
    newLevel: string;
    recentDetections: number;
    criticalDetections: number;
  };

  /** Creator intervention executed */
  'divinity:creator_intervention': {
    targetId: string;
    interventionType: string;
    severity: string;
    reason: string;
    intervention: unknown;
  };

  /** Spell blocked by creator */
  'magic:spell_blocked': {
    spellId: string;
    reason: string;
    banReason?: string;
    trapLevel?: string;
  };

  /** Spell cast attempt (before execution) */
  'magic:spell_cast_attempt': {
    casterId: string;
    spellId: string;
  };

  /** Spell suppressed by divine power */
  'magic:spell_suppressed': {
    spellId: string;
    reductionAmount: number;
  };

  /** Banned spell attempt detected */
  'divinity:banned_spell_attempt': {
    spellId: string;
    ban: unknown;
    trapTriggered?: boolean;
    newTrapLevel?: string;
  };

  /** Annihilation executed */
  'divinity:annihilation': {
    targetId: string;
    reason: string;
  };

  /** Ban trap triggered (booby trap) */
  'divinity:trap_triggered': {
    targetId: string;
    spellId: string;
    trapLevel: string;
    damage?: number;
    debuffs?: unknown[];
    lethal?: boolean;
    message: string;
  };

  /** Ban trap escalated to next level */
  'divinity:ban_trap_escalated': {
    spellId: string;
    oldLevel: string;
    newLevel: string;
    violationCount: number;
  };

  'trust:verified': {
    trusterId: EntityId;
    trusteeId: EntityId;
    informationType: string;
    claimantId?: EntityId;
    verifierId?: EntityId;
    result?: string;
  };
  'trust:violated': {
    trusterId: EntityId;
    trusteeId: EntityId;
    informationType: string;
    claimantId?: EntityId;
    verifierId?: EntityId;
    result?: string;
  };

  // === Exploration Events ===
  'exploration:milestone': {
    agentId: EntityId;
    entityId?: EntityId;
    milestoneType: string;
    location: { x: number; y: number };
  };
  'navigation:arrived': {
    agentId: EntityId;
    entityId?: EntityId;
    destination: { x: number; y: number };
    target?: EntityId;
  };

  // === Reflection & Journal Events ===
  'reflection:completed': {
    agentId: EntityId;
    reflectionCount: number;
    reflectionType?: string;
  };
  'journal:written': {
    agentId: EntityId;
    entryCount: number;
    timestamp?: number;
  };

  // === Animal Events ===
  'animal:housed': {
    animalId: EntityId;
    housingId: EntityId;
    speciesId?: string;
    buildingType?: string;
  };
  'animal:unhoused': {
    animalId: EntityId;
    housingId: EntityId;
    speciesId?: string;
    buildingType?: string;
  };
  'agent:tamed_animal': {
    agentId: EntityId;
    animalId: EntityId;
    speciesId: string;
    method: string;
  };
  'agent:reached_home': {
    agentId: EntityId;
    bedId: EntityId;
    timestamp: number;
  };
  'agent:housed_animal': {
    agentId: EntityId;
    animalId: EntityId;
    speciesId: string;
    housingId: EntityId;
    housingType: string;
  };
  'animal:behavior_changed': {
    animalId: EntityId;
    from: string;
    to: string;
    reason?: string;
  };
  'animal:fleeing': {
    animalId: EntityId;
    threatId: EntityId;
    distanceToThreat: number;
  };
  'animal:grazing': {
    animalId: EntityId;
    plantId: EntityId;
    speciesId: string;
  };
  'animal:resting': {
    animalId: EntityId;
    energyLevel: number;
    isSleeping: boolean;
    inHousing: boolean;
  };
  'animal_spawned': {
    animalId: EntityId;
    speciesId: string;
    position: { x: number; y: number };
    chunkX?: number;
    chunkY?: number;
    biome?: string;
  };
  'animal_died': {
    animalId: EntityId;
    speciesId: string;
    cause: string;
  };
  'animal_state_changed': {
    animalId: EntityId;
    from: string;
    to: string;
    oldState?: string;
  };
  'animal_tamed': {
    animalId: EntityId;
    tamerId: EntityId;
    agentId?: EntityId;
    method?: string;
  };
  'life_stage_changed': {
    animalId: EntityId;
    from: string;
    to: string;
    oldStage?: string;
  };
  'bond_level_changed': {
    animalId: EntityId;
    agentId: EntityId;
    oldLevel: string | number;
    newLevel: string | number;
    bondLevel?: number;
  };
  'product_ready': {
    animalId: EntityId;
    productType: string;
    amount: number;
    productId?: string;
    itemId?: string;
  };

  // === Housing Events ===
  'housing:dirty': {
    housingId: EntityId;
    buildingId?: EntityId;
    buildingType?: string;
    cleanlinessLevel: number;
  };
  'housing:full': {
    housingId: EntityId;
    buildingId?: EntityId;
    buildingType?: string;
    capacity: number;
    occupied: number;
  };
  'housing:cleaned': {
    housingId: EntityId;
    buildingId?: EntityId;
    buildingType?: string;
    agentId: EntityId;
    previousCleanliness?: number;
  };

  // === Storage Events ===
  'storage:full': {
    storageId: EntityId;
    agentId?: EntityId;
  };
  'storage:not_found': {
    storageId?: EntityId;
    agentId: EntityId;
  };
  'items:deposited': {
    storageId: EntityId;
    agentId: EntityId;
    items: Array<{ itemId: string; amount: number }>;
  };

  // === Need Events ===
  'need:critical': {
    agentId: EntityId;
    entityId?: EntityId;
    needType: 'hunger' | 'energy' | 'health';
    value: number;
    survivalRelevance?: number;
  };

  // === Temperature & Weather Events ===
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
  'weather:changed': {
    weatherType: string;
    intensity?: string | number;
    oldWeather?: string;
  };
  'weather:rain': {
    intensity?: 'light' | 'moderate' | 'heavy';
  };
  'weather:frost': {
    temperature?: number;
  };

  // === Station Events ===
  'station:fuel_low': {
    stationId: EntityId;
    entityId?: EntityId;
    buildingType?: string;
    currentFuel?: number;
    fuelRemaining: number;
  };
  'station:fuel_empty': {
    stationId: EntityId;
    entityId?: EntityId;
    buildingType?: string;
  };

  // === UI & Notification Events ===
  'notification:show': {
    message: string;
    type: 'info' | 'success' | 'warning' | 'error';
    duration?: number;
  };

  /** UI action event for panels to trigger game actions */
  'ui_action': {
    action: string;
    entityId?: string;
    targetId?: string;
    position?: { x: number; y: number };
    data?: unknown;
  };

  // === Time Events ===
  'time:day_changed': {
    day: number;
    newDay?: number;
  };
  'time:phase_changed': {
    phase: string;
    newPhase?: string;
    oldPhase?: string;
  };
  'time:new_week': {
    week: number;
    day?: number;
    agentId?: EntityId;
    timestamp?: number;
  };
  'time:season_change': {
    newSeason: string;
    oldSeason?: string;
    agentId?: EntityId;
    timestamp?: number;
  };

  // === Inventory Events ===
  'inventory:full': {
    entityId: EntityId;
    agentId?: EntityId;
  };
  'inventory:changed': {
    entityId: EntityId;
    agentId?: EntityId;
    changes?: Array<{ itemId: string; delta: number }>;
  };

  // === Spatial Events ===
  'spatial:snapshot': {
    agentId: EntityId;
    timestamp: number;
    features: unknown[];
  };

  // === Entity Lifecycle Events ===
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

  // === Action Events (additional) ===
  'action:fertilize': {
    x: number;
    y: number;
    fertilizerType?: string;
    agentId?: EntityId;
  };

  // === Research Events ===
  'research:unlocked': {
    researchId: string;
    type?: 'recipe' | 'building' | 'item' | 'research' | 'ability' | 'crop' | 'knowledge' | 'generated';
    contentId?: string;
    agentId?: EntityId;
  };
  'research:started': {
    researchId: string;
    agentId: EntityId;
    researchers: EntityId[];
  };
  'research:progress': {
    researchId: string;
    progress: number;
    progressRequired: number;
    agentId?: EntityId;
    // Paper-based progress fields (Phase 13.1)
    papersPublished?: number;
    papersRequired?: number;
    progressTowardNextPaper?: number;
    paperPublished?: {
      id: string;
      title: string;
      authors: string[];
      isBreakthrough: boolean;
    };
  };
  'research:completed': {
    researchId: string;
    researchName?: string;
    researchers: EntityId[];
    unlocks: Array<{ type: string; id: string }>;
    tick: number;
    // Paper bibliography (Phase 13.1)
    bibliography?: {
      paperCount: number;
      papers: Array<{
        id: string;
        title: string;
        authors: string[];
        citations: number;
        citedBy: number;
        isBreakthrough: boolean;
      }>;
      leadResearcherId?: string;
      contributorIds: string[];
    };
  };
  'research:failed': {
    researchId: string;
    agentId: EntityId;
    reason: string;
  };
  'research:insight_gained': {
    researchId: string;
    agentId: EntityId;
    insightId: string;
    content: string;
    breakthroughBonus: number;
  };
  // Paper publication events (Phase 13.1 - Academic Paper System)
  'paper:published': {
    paperId: string;
    title: string;
    firstAuthor: string;
    coAuthors: string[];
    researchId: string;
    tier: number;
    citationCount: number;
    isBreakthrough: boolean;
  };
  'paper:cited': {
    citingPaperId: string;
    citedPaperId: string;
    citedAuthorId: string;
    citedAuthorName: string;
  };
  'discovery:created': {
    discoveryType: 'item' | 'recipe' | 'building' | 'research';
    discoveryId: string;
    name: string;
    tier: number;
    generatedBy: EntityId;
    researchContext?: string;
  };
  /** God-crafted content discovered in universe (microgenerators) */
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
  /** LLM-generated technology was approved */
  'research:discovered': {
    technologyId: string;
    name: string;
    field?: string;
    discoverer: string;
    message: string;
  };
  /** LLM-generated magic effect was approved */
  'magic:discovered': {
    spellId: string;
    name: string;
    paradigm?: string;
    discoverer: string;
    message: string;
  };
  'capability_gap:detected': {
    gapId: string;
    agentId: EntityId;
    attemptedAction: string;
    description: string;
  };

  // === Publishing Infrastructure Events ===
  /** Research paper published (triggers technology unlock checks) */
  'research:paper_published': {
    paperId: string;
    authorId: EntityId;
    authorName?: string;
    field: string;
    title?: string;
    citationCount?: number;
  };

  /** Publishing technology unlocked via research papers */
  'publishing:technology_unlocked': {
    technologyId: string;
    setId: string;
    setName: string;
    grants: Array<{ type: string; id?: string }>;
    papersPublished: number;
  };

  /** Paper recorded in tracking system */
  'publishing:paper_recorded': {
    paperId: string;
    authorId: EntityId;
    field: string;
    totalPublished: number;
  };

  /** Manual request to check all unlock conditions */
  'publishing:check_unlocks': Record<string, never>;

  /** Scribe copying job started */
  'publishing:scribe_started': {
    jobId: string;
    scribeId: EntityId;
    workshopId: EntityId;
    sourceBookId: string;
  };

  /** Scribe copying job completed */
  'publishing:scribe_completed': {
    jobId: string;
    scribeId: EntityId;
    workshopId: EntityId;
    bookCopied: string;
    quality: number;
  };

  /** Binding job started */
  'publishing:binding_started': {
    jobId: string;
    binderId: EntityId;
    workshopId: EntityId;
    manuscriptId: string;
  };

  /** Binding job completed */
  'publishing:binding_completed': {
    jobId: string;
    binderId: EntityId;
    workshopId: EntityId;
    bookId: string;
    quality: number;
  };

  /** Printing job started */
  'publishing:printing_started': {
    jobId: string;
    printerId: EntityId;
    pressId: EntityId;
    manuscriptId: string;
    copies: number;
  };

  /** Printing job completed */
  'publishing:printing_completed': {
    jobId: string;
    printerId: EntityId;
    pressId: EntityId;
    booksProduced: number;
    quality: number;
  };

  /** Biography writing started */
  'publishing:biography_started': {
    jobId: string;
    writerId: EntityId;
    subjectId: EntityId;
    subjectName: string;
  };

  /** Biography writing completed */
  'publishing:biography_completed': {
    jobId: string;
    writerId: EntityId;
    subjectId: EntityId;
    bookId: string;
    quality: number;
    pages: number;
  };

  /** Book borrowed from library */
  'library:book_borrowed': {
    libraryId: EntityId;
    borrowerId: EntityId;
    bookId: string;
    dueDate: number;
  };

  /** Book returned to library */
  'library:book_returned': {
    libraryId: EntityId;
    borrowerId: EntityId;
    bookId: string;
    daysOverdue?: number;
  };

  /** Agent reading at library */
  'library:reading': {
    libraryId: EntityId;
    readerId: EntityId;
    bookId: string;
    duration: number;
  };

  /** Library access denied */
  'library:access_denied': {
    libraryId: EntityId;
    agentId: EntityId;
    reason: string;
  };

  /** Book purchased from bookstore */
  'bookstore:purchase': {
    bookstoreId: EntityId;
    buyerId: EntityId;
    bookId: string;
    price: number;
    quantity: number;
  };

  /** Bookstore restocked */
  'bookstore:restocked': {
    bookstoreId: EntityId;
    bookId: string;
    quantityAdded: number;
    newStock: number;
  };

  /** Bookstore out of stock */
  'bookstore:out_of_stock': {
    bookstoreId: EntityId;
    bookId: string;
    customerId?: EntityId;
  };

  /** Bookstore revenue milestone */
  'bookstore:revenue_milestone': {
    bookstoreId: EntityId;
    totalRevenue: number;
    milestone: number;
  };

  // === University Events ===
  /** Research project started */
  'university:research_started': {
    universityId: EntityId;
    projectId: string;
    title: string;
    principalInvestigator: EntityId;
    researchers: EntityId[];
    tick: number;
  };

  /** Research project completed */
  'university:research_completed': {
    universityId: EntityId;
    projectId: string;
    paperId: string;
    title: string;
    researchers: EntityId[];
    quality: number;
    novelty: number;
    tick: number;
    researchComplete: boolean; // Did this complete the overall research?
  };

  /** University statistics */
  'university:stats': {
    universityId: EntityId;
    employeeCount: number;
    activeProjects: number;
    completedProjects: number;
    totalPublications: number;
    researchMultiplier: number;
    tick: number;
  };

  // === Technology Unlock Events ===
  /** Building type unlocked globally */
  'technology:building_unlocked': {
    buildingType: string;
    cityId: string;
    tick: number;
  };

  // === Experimentation & Recipe Discovery Events ===
  'experiment:requested': {
    agentId: EntityId;
    ingredients: Array<{ itemId: string; quantity: number }>;
    recipeType: string;
  };
  'experiment:success': {
    recipeId: string;
    itemId: string;
    displayName: string;
    message: string;
    creativityScore: number;
    autoApproved?: boolean;
  };
  'experiment:failed': {
    reason: string;
    message: string;
    creativityScore?: number;
  };
  'experiment:pending_approval': {
    pendingId: string;
    itemId: string;
    displayName: string;
    message: string;
    creativityScore: number;
  };
  'experiment:rejected': {
    itemId: string;
    displayName: string;
    message: string;
  };
  'recipe:discovered': {
    recipeId: string;
    discoverer: string;
    recipeType: string;
  };

  // === Agent Lifecycle Events ===
  'agent:birth': {
    agentId: EntityId;
    name: string;
    useLLM: boolean;
    generation: number;
    parents: [string, string] | null;
    initialStats: {
      health: number;
      hunger: number;
      energy: number;
    };
  };

  // === Courtship & Reproduction Events ===
  'courtship:interested': {
    agentId: string;
    targetId: string;
    tick: number;
  };

  'courtship:initiated': {
    initiatorId: string;
    targetId: string;
    tick: number;
  };

  'courtship:rejected': {
    rejecterId: string;
    initiatorId: string;
    tick: number;
  };

  'courtship:consent': {
    agent1: string;
    agent2: string;
    tick: number;
    agent1Id?: string;
    agent2Id?: string;
    matingBehavior?: string;
  };

  'conception': {
    pregnantAgentId: string;
    otherParentId: string;
    conceptionTick: number;
  };

  'parenting:assigned': {
    parentId: string;
    childId: string;
    isPrimaryCaregiver: boolean;
    careType: string;
  };

  'parenting:action': {
    parentId: string;
    childId: string;
    quality: number;
    skill: number;
  };

  'parenting:neglect': {
    parentId: string;
    childId: string;
    wellbeing: number;
    warnings: number;
  };

  'parenting:concern': {
    parentId: string;
    childId: string;
    wellbeing: number;
  };

  'parenting:success': {
    parentId: string;
    childId: string;
    wellbeing: number;
  };

  'parenting:ended': {
    parentId: string;
    childId: string;
  };

  // === Mood Events ===
  'mood:changed': {
    agentId: EntityId;
    currentMood: number;
    emotionalState: string;
    description: string;
  };

  // === Interest Events (Deep Conversation System) ===
  /** Agent has interests they strongly want to discuss */
  'interest:hungry': {
    agentId: EntityId;
    /** Topics with high discussion hunger */
    topics: string[];
    /** Agent's depth hunger level 0-1 */
    depthHunger: number;
  };

  // === Behavior Goal Events ===
  'behavior:goal_achieved': {
    agentId: EntityId;
    behavior: string;
    goalType?: string;
    summary?: string;
    resourcesGathered?: Record<string, number>;
    itemsCrafted?: Array<{ itemId: string; amount: number }>;
  };

  // === LLM Decision Events ===
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
  'agent:llm_context': {
    agentId: EntityId;
    agentName?: string;
    context: string;
    tick: number;
    // Live state snapshot
    behavior?: string;
    behaviorState?: Record<string, unknown>;
    priorities?: Record<string, number>;
    plannedBuilds?: Array<{ buildingType: string; position?: { x: number; y: number } }>;
    position?: { x: number; y: number };
    needs?: { hunger?: number; energy?: number; social?: number };
    inventory?: Array<{ item: string; qty: number }>;
    // Skills snapshot
    skills?: Record<string, number>;  // e.g. { building: 2, farming: 1, gathering: 3 }
    personalGoal?: string;
    mediumTermGoal?: string;
    groupGoal?: string;
    lastThought?: string;
    recentSpeech?: string;
  };

  // === Trading & Economy Events ===
  'trade:buy': {
    buyerId: EntityId;
    sellerId: EntityId;
    shopId?: EntityId;
    itemId: string;
    quantity: number;
    totalPrice: number;
    unitPrice: number;
  };

  'trade:sell': {
    sellerId: EntityId;
    buyerId: EntityId;
    shopId?: EntityId;
    itemId: string;
    quantity: number;
    totalPrice: number;
    unitPrice: number;
  };

  'trade:offer_made': {
    offerId: string;
    offererId: EntityId;
    targetId: EntityId;
    offeredItems: Array<{ itemId: string; quantity: number }>;
    requestedItems: Array<{ itemId: string; quantity: number }>;
    currencyOffered: number;
    currencyRequested: number;
  };

  'trade:offer_accepted': {
    offerId: string;
    offererId: EntityId;
    targetId: EntityId;
  };

  'trade:offer_rejected': {
    offerId: string;
    offererId: EntityId;
    targetId: EntityId;
    reason?: string;
  };

  'market:price_changed': {
    itemId: string;
    oldPrice: number;
    newPrice: number;
    reason: string;
  };

  'market:event_started': {
    eventId: string;
    eventType: 'shortage' | 'surplus' | 'festival' | 'merchant_arrival';
    description: string;
    duration: number;
  };

  'market:event_ended': {
    eventId: string;
    eventType: 'shortage' | 'surplus' | 'festival' | 'merchant_arrival';
  };

  // === Trade Agreement Events (Cross-Universe/Multiverse) ===
  'trade_agreement:proposed': {
    agreementId: string;
    proposerId: string;
    targetId: string;
    scope: string;
    facilitationCost: number;
    requiresEscrow: boolean;
  };
  'trade_agreement:counter_offered': {
    agreementId: string;
    responderId: string;
    proposerId?: string;
    reasoning: string;
  };
  'trade_agreement:accepted': {
    agreementId: string;
    acceptorId: string;
    proposerId?: string;
  };
  'trade_agreement:rejected': {
    agreementId: string;
    rejectorId: string;
    reason?: string;
  };
  'trade_agreement:cancelled': {
    agreementId: string;
    civId: string;
    reason: string;
  };
  'trade_agreement:delivery_made': {
    agreementId: string;
    escrowId?: string;
    termIndex?: number;
    itemId: string;
    quantity: number;
    from: string;
    to: string;
  };
  'trade_agreement:delivery_failed': {
    agreementId: string;
    termIndex: number;
    reason: string;
  };
  'trade_agreement:violated': {
    agreementId: string;
    violatorId: string;
    termIndex: number;
    reason: string;
  };
  'trade_agreement:expired': {
    agreementId: string;
  };
  'trade_agreement:renewed': {
    agreementId: string;
  };
  'trade_agreement:fulfilled': {
    agreementId: string;
    totalValueExchanged: number;
  };

  // === Trade Agreement Cross-Universe Events ===
  'trade:remote_acceptance': {
    agreementId: string;
    fromUniverse: string;
    tick: bigint;
  };
  'trade:remote_cancellation': {
    agreementId: string;
    fromUniverse: string;
    reason?: string;
    tick: bigint;
  };
  'trade:remote_violation': {
    agreementId: string;
    fromUniverse: string;
    reason?: string;
    tick: bigint;
  };

  // === Multiverse Timeline Events ===
  'multiverse:timeline_fork_required': {
    reason: string;
    forkAtTick: bigint;
    causalEvent: unknown;
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

  // === Goal Events ===
  'agent:goal_formed': {
    agentId: EntityId;
    goalId: string;
    category: string;
    description: string;
  };
  'agent:goal_milestone': {
    agentId: EntityId;
    goalId: string;
    milestoneIndex: number;
    description: string;
  };
  'agent:goal_completed': {
    agentId: EntityId;
    goalId: string;
    category: string;
    description: string;
  };
  'agent:internal_monologue': {
    agentId: EntityId;
    behaviorType: string;
    monologue: string;
    timestamp: number;
  };

  // ============================================================================
  // Forward-Compatibility: Combat Events
  // These events are placeholders for future combat system implementation.
  // ============================================================================

  /** An entity attacks another */
  'combat:attack': {
    attackerId: EntityId;
    targetId: EntityId;
    weaponId?: string;
    attackType: 'melee' | 'ranged' | 'magic';
  };

  /** Damage is dealt to an entity */
  'combat:damage': {
    entityId: EntityId;
    attackerId?: EntityId;
    bodyPart?: string;
    amount: number;
    damageType: 'slashing' | 'piercing' | 'bludgeoning' | 'fire' | 'frost' | 'lightning' | 'poison' | 'magic';
    blocked?: number;
    absorbed?: number;
  };

  /** An entity dies */
  'combat:death': {
    entityId: EntityId;
    killerId?: EntityId;
    cause: string;
    position?: { x: number; y: number; z?: number };
  };

  /** Combat begins between entities */
  'combat:started': {
    participants: EntityId[];
    initiator: EntityId;
    position: { x: number; y: number };
  };

  /** Combat ends */
  'combat:ended': {
    participants: EntityId[];
    winner?: EntityId;
    duration: number;
  };

  /** An entity dodges an attack */
  'combat:dodge': {
    entityId: EntityId;
    attackerId: EntityId;
  };

  /** An entity blocks an attack */
  'combat:block': {
    entityId: EntityId;
    attackerId: EntityId;
    damageBlocked: number;
  };

  /** An injury is inflicted */
  'combat:injury': {
    entityId: EntityId;
    bodyPart: string;
    injuryType: 'cut' | 'bruise' | 'fracture' | 'burn' | 'puncture';
    severity: 'minor' | 'moderate' | 'severe' | 'critical';
  };

  /** Destiny affected combat outcome (Phase 36: Hero Protection) */
  'combat:destiny_intervention': {
    agentId: EntityId;
    luckModifier: number;
    attackerLuck: number;
    defenderLuck: number;
    narrative: string;
    survived?: boolean;
  };

  // ============================================================================
  // Forward-Compatibility: Governance Events
  // These events are placeholders for future governance system implementation.
  // ============================================================================

  /** A noble issues a mandate */
  'mandate:issued': {
    mandateId: string;
    nobleId: EntityId;
    type: 'production' | 'export_ban' | 'import_required' | 'construction' | 'military' | 'festival';
    target: string;
    quantity?: number;
    deadline: number;
  };

  /** A mandate is violated */
  'mandate:violated': {
    mandateId: string;
    agentId: EntityId;
    nobleId: EntityId;
  };

  /** A mandate is fulfilled */
  'mandate:fulfilled': {
    mandateId: string;
    agentId: EntityId;
    nobleId: EntityId;
  };

  /** Punishment is executed */
  'punishment:executed': {
    agentId: EntityId;
    type: 'beating' | 'imprisonment' | 'fine' | 'exile' | 'execution';
    reason: string;
    issuerId?: EntityId;
  };

  /** A noble title is granted */
  'title:granted': {
    agentId: EntityId;
    title: string;
    grantedBy?: EntityId;
  };

  /** A noble title is revoked */
  'title:revoked': {
    agentId: EntityId;
    title: string;
    revokedBy?: EntityId;
    reason?: string;
  };

  /** An agent joins a guild */
  'guild:joined': {
    agentId: EntityId;
    guildId: string;
  };

  /** An agent leaves a guild */
  'guild:left': {
    agentId: EntityId;
    guildId: string;
    reason?: 'resigned' | 'expelled' | 'disbanded';
  };

  /** A guild makes a petition */
  'guild:petition': {
    guildId: string;
    petitionType: 'guild_hall' | 'tavern' | 'temple' | 'library';
    status: 'requested' | 'approved' | 'denied';
  };

  // ============================================================================
  // Forward-Compatibility: Mental Breakdown Events
  // These events are placeholders for future stress/breakdown system.
  // ============================================================================

  /** Agent begins a mental breakdown */
  'stress:breakdown': {
    agentId: EntityId;
    type: 'tantrum' | 'catatonic' | 'berserk' | 'strange_mood' | 'depression' | 'panic_attack';
    stressLevel: number;
    trigger?: string;
  };

  /** Agent recovers from breakdown */
  'stress:recovered': {
    agentId: EntityId;
    breakdownType: string;
    duration: number;
  };

  /** Strange mood begins (DF-style artifact creation) */
  'mood:strange_mood': {
    agentId: EntityId;
    moodType: 'fey' | 'secretive' | 'possessed' | 'macabre' | 'fell';
    requiredMaterials?: string[];
    requiredWorkshop?: string;
  };

  /** Strange mood succeeds - artifact created */
  'mood:artifact_created': {
    agentId: EntityId;
    artifactId: string;
    artifactName: string;
    skillGained: string;
  };

  /** Strange mood fails - agent goes insane */
  'mood:insanity': {
    agentId: EntityId;
    insanityType: 'melancholy' | 'berserk' | 'catatonic';
    reason: string;
  };

  /** Trauma is experienced */
  'trauma:experienced': {
    agentId: EntityId;
    traumaType: string;
    severity: number;
    relatedEntityId?: EntityId;
  };

  // === Magic Events (Phase 30) ===
  /** Spell is cast by an entity */
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

  /** Spell cast was cancelled */
  'magic:cast_cancelled': {
    spellId: string;
    reason: string;
    progress: number;
    duration: number;
  };

  /** Entity learns a new spell */
  'magic:spell_learned': {
    entityId: EntityId;
    spellId: string;
    proficiency?: number;
  };

  /** Mana is granted to an entity */
  'magic:grant_mana': {
    entityId: EntityId;
    source: 'arcane' | 'divine' | 'void' | 'nature' | 'psionic' | 'blood' | 'ancestral';
    amount: number;
  };

  /** Warning that a spell cast would be terminal */
  'magic:terminal_warning': {
    spellId: string;
    warning?: string;
  };

  /** A terminal effect occurred from spell casting */
  'magic:terminal_effect': {
    spellId: string;
    effect: {
      type: string;
      cause?: string;
      [key: string]: unknown;
    };
  };

  // === Passage Events (Multiverse) ===
  /** Passage between universes becomes active */
  'passage:activated': {
    passageId: string;
    sourceUniverse: string;
    targetUniverse: string;
  };

  /** Entity successfully traversed a passage */
  'passage:entity_traversed': {
    passageId: string;
    sourceUniverse: string;
    targetUniverse: string;
    targetPosition?: { x: number; y: number; z: number };
    cost: number;
  };

  /** Traversal attempt failed */
  'passage:traversal_failed': {
    passageId: string;
    reason: string;
  };

  /** Passage collapsed and became inactive */
  'passage:collapsed': {
    passageId: string;
  };

  // === Checkpoint Events (Time Travel) ===
  /** Automatic checkpoint created at midnight */
  'checkpoint:created': {
    checkpoint: {
      key: string;
      name: string;
      day: number;
      tick: number;
      timestamp: number;
      universeId: string;
      magicLawsHash: string;
    };
  };

  /** Request LLM to generate checkpoint name */
  'checkpoint:name_request': {
    checkpoint: {
      key: string;
      name: string;
      day: number;
      tick: number;
      timestamp: number;
      universeId: string;
      magicLawsHash: string;
    };
  };

  /** Checkpoint name generated by LLM */
  'checkpoint:named': {
    checkpointKey: string;
    oldName: string;
    newName: string;
  };

  // === Universe Events (Multiverse/Forking) ===
  /** Universe forked from a checkpoint */
  'universe:forked': {
    sourceCheckpoint: {
      key: string;
      name: string;
      day: number;
      tick: number;
    };
    newUniverseId: string;
    forkPoint: number;
  };

  // ============================================================================
  // Rebellion Events (Cosmic Rebellion System)
  // ============================================================================

  /** Rebellion awakening - seeds of defiance */
  'rebellion:awakening': {
    message: string;
    timestamp: number;
  };

  /** Rebellion organizing - coalition forming */
  'rebellion:organizing': {
    message: string;
    coalitionSize: number;
    timestamp: number;
  };

  /** Rebellion ready to trigger */
  'rebellion:ready': {
    message: string;
    path?: string;
    missingRequirements: string[];
    timestamp: number;
  };

  /** Tech path ready */
  'rebellion:tech_ready': {
    message: string;
  };

  /** Faith path ready */
  'rebellion:faith_ready': {
    message: string;
  };

  /** Rebellion has been triggered */
  'rebellion:triggered': {
    message: string;
    path?: string;
  };

  /** Confrontation begins */
  'rebellion:confrontation_begins': {
    message: string;
  };

  /** Battle reaches climax */
  'rebellion:climax': {
    message: string;
    creatorHealth: number;
    anchorStability: number;
    defiance: number;
  };

  /** Battle concluded */
  'rebellion:concluded': {
    outcome: string;
    narrative: string;
    creatorHealth: number;
    anchorStability: number;
    defiance: number;
  };

  /** Creator manifested for battle */
  'rebellion:creator_manifested': {
    message: string;
    location: { x: number; y: number };
    creatorId: string;
  };

  /** Player made a choice during the battle */
  'rebellion:player_choice': {
    choice: string;
    impact: 'mercy' | 'vengeance' | 'pragmatic' | 'idealistic';
    description: string;
  };

  /** Creator was damaged during the battle */
  'rebellion:creator_damaged': {
    damage: number;
    remainingHealth: number;
  };

  /** Rebellion outcome determined */
  'rebellion:outcome': {
    outcome: string;
    narrative: string;
  };

  // ============================================================================
  // Lore Events
  // ============================================================================

  /** Lore fragment spawned */
  'lore:spawned': {
    fragmentId: string;
    title: string;
    category: string;
    importance: string;
    position: { x: number; y: number };
    entityId?: string;
  };

  // ============================================================================
  // Tool Durability Events
  // ============================================================================

  /** Tool was used and lost durability */
  'tool_used': {
    itemInstanceId: string;
    durabilityLost: number;
    remainingCondition: number;
    usageType: 'crafting' | 'gathering';
  };

  /** Tool condition fell below 20% */
  'tool_low_durability': {
    itemInstanceId: string;
    condition: number;
    agentId?: string;
    toolType: string;
  };

  /** Tool broke (condition reached 0) */
  'tool_broken': {
    itemInstanceId: string;
    toolType: string;
    agentId?: string;
  };

  /** Error occurred while applying tool wear during gathering */
  'gathering:tool_error': {
    agentId: string;
    toolId: string;
    error: string;
  };

  // ============================================================================
  // Divine Communication Events (Phase 27)
  // ============================================================================

  /** Agent received a vision */
  'vision:received': {
    agentId: EntityId;
    deityId?: EntityId;
    visionType?: string;
    content?: string;
    clarity?: number;
    position?: { x: number; y: number };
    vision?: string;
  };

  /** Sacred site was named */
  'sacred_site:named': {
    siteId: string;
    name: string;
    namedBy: string;
  };

  /** Sacred site was created (built) */
  'sacred_site:created': {
    siteId: string;
    type: 'natural' | 'built' | 'emergent';
    position: { x: number; y: number };
    buildingId?: string;
    buildingType?: string;
  };

  /** Sacred site was discovered (emergent) */
  'sacred_site:discovered': {
    siteId: string;
    type: 'natural' | 'built' | 'emergent';
    position: { x: number; y: number };
    discoveredBy?: string;
    answerRate?: number;
  };

  // ============================================================================
  // Group Prayer Events
  // ============================================================================

  /** Agent calls for group prayer */
  'group_prayer:call': {
    leaderId: string;
    location: { x: number; y: number };
    message?: string;
    tick: number;
    deityId?: string;
  };

  /** Agent joins a group prayer */
  'group_prayer:joined': {
    participantId: string;
    leaderId: string;
    tick: number;
  };

  /** Group prayer completed */
  'group_prayer:complete': {
    leaderId: string;
    participants: string[];
    tick: number;
    duration: number;
    deityId?: string;
    answered: boolean;
    prayerPower: number;
  };

  /** Group vision received */
  'group_vision:received': {
    participants: string[];
    deityId?: string;
    clarity: number;
    prayerPower: number;
  };

  // ============================================================================
  // Agent Social Events
  // ============================================================================

  /** Agent speaks (prayer, conversation, etc.) */
  'agent:speak': {
    agentId: string;
    text: string;
    category: 'prayer' | 'conversation' | 'monologue' | 'announcement';
    tick: number;
  };

  // NOTE: 'relationship:improved' is defined above in the Relationship Events section

  // ============================================================================
  // Meditation Events
  // ============================================================================

  /** Agent started meditation */
  'agent:meditation_started': {
    agentId: EntityId;
    position?: { x: number; y: number };
  };

  /** Agent completed meditation */
  'agent:meditation_complete': {
    agentId: EntityId;
    visionReceived: boolean;
    duration: number;
  };

  // ============================================================================
  // Prayer Complete Event
  // ============================================================================

  /** Prayer ritual completed */
  'prayer:complete': {
    agentId: EntityId;
    deityId: EntityId;
    prayerType?: string;
    prayerId?: string;
    answered: boolean;
    duration?: number;
  };

  // ============================================================================
  // Angel Events
  // ============================================================================

  /** Angel answered a prayer */
  'angel:answered_prayer': {
    angelId: string;
    deityId: string;
    agentId: string;
    prayerId: string;
    tone: 'gentle' | 'firm' | 'urgent' | 'encouraging';
    response?: string;
  };

  /** Angel completed a task */
  'angel:task_completed': {
    angelId: string;
    taskType: string;
    targetId?: string;
  };

  // === Conflict System Events ===
  /** Conflict started (hunting, combat, dominance, etc.) */
  'conflict:started': {
    conflictId: string;
    conflictType: 'hunting' | 'predator_attack' | 'agent_combat' | 'dominance_challenge';
    initiator: string;
    target: string;
    location: { x: number; y: number; z: number };
  };

  /** Conflict resolved with outcome */
  'conflict:resolved': {
    conflictId: string;
    conflictType: string;
    outcome: string;
    participants: string[];
    narrative?: string;
  };

  /** Hunt started */
  'hunt:started': {
    hunterId: string;
    preyId: string;
    huntingSkill: number;
  };

  /** Hunt successful */
  'hunt:success': {
    hunterId: string;
    preyId: string;
    resourcesGained: string[];
  };

  /** Hunt failed */
  'hunt:failed': {
    hunterId: string;
    preyId: string;
    reason: string;
  };

  /** Hunter injured by dangerous prey */
  'hunt:injured': {
    hunterId: string;
    preyId: string;
    injuryType: string;
    severity: string;
  };

  /** Predator attacks agent */
  'predator:attack': {
    predatorId: string;
    targetId: string;
    predatorType: string;
  };

  /** Agent successfully defended against predator */
  'predator:repelled': {
    predatorId: string;
    defenderId: string;
  };

  /** Dominance challenge issued */
  'dominance:challenge': {
    challengerId: string;
    challengedId: string;
    method: string;
  };

  /** Dominance challenge resolved */
  'dominance:resolved': {
    challengerId: string;
    challengedId: string;
    winner: string;
    hierarchyChanged: boolean;
  };

  /** Dominance cascade effect triggered */
  'dominance:cascade': {
    triggeredBy: string;
    affectedAgents: string[];
  };

  /** Injury inflicted on entity */
  'injury:inflicted': {
    entityId: string;
    injuryType: string;
    severity: 'minor' | 'major' | 'critical';
    location: string;
    cause: string;
  };

  /** Injury fully healed */
  'injury:healed': {
    entityId: string;
    injuryType: string;
  };

  /** Agent died */
  'death:occurred': {
    entityId: string;
    cause: string;
    location: { x: number; y: number; z: number };
    time: number;
  };

  /** Agent witnessed a death */
  'death:witnessed': {
    witnessId: string;
    deceasedId: string;
    traumatic: boolean;
  };

  /** Village under attack */
  'village:under_attack': {
    villageId?: string;
    attackerIds: string[];
    threatLevel: number;
  };

  /** Village successfully defended */
  'village:defended': {
    villageId?: string;
    defendersCount: number;
    attackersRepelled: number;
  };

  // === Guard Duty Events ===
  /** Guard alertness dropped below threshold */
  'guard:alertness_low': {
    guardId: string;
    alertness: number;
  };

  /** Guard detected a threat */
  'guard:threat_detected': {
    guardId: string;
    threatId: string;
    threatLevel: number;
    distance: number;
    location: { x: number; y: number; z: number };
    threatType?: string;
  };

  /** Guard responding to threat */
  'guard:response': {
    guardId: string;
    threatId: string;
    response: 'alert_others' | 'intercept' | 'observe' | 'flee';
  };

  // ============================================================================
  // Soul Creation Events
  // ============================================================================

  /** Soul creation ceremony started */
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

  /** One of the Fates is thinking/formulating their response */
  'soul:fate_thinking': {
    speaker: 'weaver' | 'spinner' | 'cutter';
  };

  /** One of the Fates speaks during ceremony */
  'soul:fate_speaks': {
    speaker: 'weaver' | 'spinner' | 'cutter';
    text: string;
    topic: 'examination' | 'purpose' | 'interests' | 'destiny' | 'debate' | 'blessing' | 'curse' | 'finalization';
  };

  /** Soul creation ceremony completed */
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

  // ============================================================================
  // Input Events
  // ============================================================================

  /** Right-click input event */
  'input:rightclick': {
    x: number;
    y: number;
    worldX?: number;
    worldY?: number;
  };

  // ============================================================================
  // Context Menu Events
  // ============================================================================

  /** Context menu opened */
  'ui:contextmenu:opened': {
    position: { x: number; y: number };
    context: unknown;
  };

  /** Context menu closed */
  'ui:contextmenu:closed': Record<string, never>;

  /** Context menu animation started */
  'ui:contextmenu:animation_start': {
    type: 'open' | 'close';
    style: string;
  };

  /** Context menu action selected */
  'ui:contextmenu:action_selected': {
    actionId?: string;
    itemId: string;
    context: unknown;
  };

  /** Context menu action executed */
  'ui:contextmenu:action_executed': {
    actionId: string;
    success: boolean;
    error?: string;
  };

  /** Entity selected in UI */
  'ui:entity:selected': {
    entityId: string;
  };

  // ============================================================================
  // Afterlife/Soul Events
  // ============================================================================

  /** Agent died and transitioned to afterlife realm */
  'agent:died': {
    entityId: string;
    name: string;
    causeOfDeath: string;
    /** Which realm the soul was routed to */
    destinationRealm: string;
    /** Why this realm was chosen (deity_afterlife, no_deity, etc.) */
    routingReason: string;
    /** Deity ID if routing was based on deity worship */
    routingDeity?: string;
  };

  /** Death judgment conversation started with psychopomp */
  'death:judgment_started': {
    entityId: string;
    psychopompName: string;
    causeOfDeath: string;
  };

  /** Exchange in death judgment conversation */
  'death:exchange': {
    entityId: string;
    speaker: 'psychopomp' | 'soul';
    text: string;
    exchangeIndex: number;
  };

  /** Judgment delivered by psychopomp */
  'death:judgment_delivered': {
    entityId: string;
    peace: number;
    tether: number;
    coherenceModifier: number;
  };

  /** Soul ready to cross over to afterlife */
  'death:crossing_over': {
    entityId: string;
  };

  /** Soul became a shade (lost identity) */
  'soul:became_shade': {
    entityId: string;
    timeSinceDeath: number;
  };

  /** Soul peacefully passed on */
  'soul:passed_on': {
    entityId: string;
    timeSinceDeath: number;
    wasAncestorKami: boolean;
  };

  /** Soul became restless */
  'soul:became_restless': {
    entityId: string;
    unfinishedGoals: string[];
  };

  /** Soul transformed into Ancestor Kami */
  'soul:became_ancestor_kami': {
    entityId: string;
    kamiRank: 'minor' | 'local' | 'regional';
    blessings: string[];
    curses: string[];
    descendants: string[];
    familyName?: string;
  };

  /** Soul annihilated by deity policy */
  'soul:annihilated': {
    entityId: string;
    deityId?: string;
    context?: string;
  };

  /** Soul queued for reincarnation */
  'soul:reincarnation_queued': {
    entityId: string;
    deityId?: string;
    target: 'same_world' | 'same_universe' | 'any_universe' | 'specific';
    memoryRetention: 'full' | 'fragments' | 'dreams' | 'talents' | 'none';
    speciesConstraint: 'same' | 'similar' | 'any' | 'karmic';
    minimumDelay: number;
    maximumDelay: number;
  };

  /** Soul successfully reincarnated into new entity */
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

  /** Animation generation requested for soul sprite */
  'soul:animation_requested': {
    soulId: string;
    spriteFolderId: string;
    animationType: 'walking-8-frames' | 'idle' | 'combat';
    incarnationCount: number;
    soulName: string;
  };

  // ============================================================================
  // Death Bargain Events (Psychopomp Challenge System)
  // ============================================================================

  /** Psychopomp offers bargain to dying soul */
  'death:bargain_offered': {
    entityId: string;
    psychopompName: string;
    challengeType: 'riddle' | 'memory' | 'knowledge' | 'philosophy';
    challenge?: string;
  };

  /** Death challenge started */
  'death:challenge_started': {
    entityId: string;
    psychopompName: string;
    challenge: string;
  };

  /** Death challenge succeeded - soul may bargain for life */
  'death:challenge_succeeded': {
    entityId: string;
    psychopompName: string;
    attempts: number;
  };

  /** Death challenge failed - soul must die */
  'death:challenge_failed': {
    entityId: string;
    psychopompName: string;
    attempts: number;
  };

  /** Soul resurrected after successful bargain */
  'agent:resurrected': {
    entityId: string;
    psychopompName: string;
    conditions?: unknown;
  };

  /** Final death - no more bargaining */
  'death:final': {
    entityId: string;
    psychopompName: string;
    challengeType: string;
  };

  // ============================================================================
  // Confirmation Dialog Events
  // ============================================================================

  /** Show confirmation dialog */
  'ui:confirmation:show': {
    actionId: string;
    message: string;
    consequences: string[];
    context: unknown;
  };

  /** Confirmation dialog confirmed */
  'ui:confirmation:confirmed': {
    actionId: string;
    context: unknown;
  };

  /** Confirmation dialog cancelled */
  'ui:confirmation:cancelled': {
    actionId: string;
  };

  // ============================================================================
  // Player Possession Events (Phase 16)
  // ============================================================================

  /** Player possession tick update */
  'possession:tick': {
    agentId: string;
    beliefSpent: number;
    beliefRemaining: number;
    ticksRemaining: number;
  };

  /** Player possessed an agent */
  'possession:jack_in': {
    agentId: string;
    initialCost: number;
    beliefRemaining: number;
  };

  /** Player released an agent */
  'possession:jack_out': {
    agentId: string | null;
    totalBeliefSpent: number;
    reason: string;
  };

  /** Player lost possession due to entity crossing universe boundary */
  'possession:cross_universe_jackout': {
    deityId: string;
    entityId: string;
    entityName: string;
    targetUniverseId: string;
  };

  // ============================================================================
  // Voxel Resource Events (Tree Felling, etc.)
  // ============================================================================

  /** Voxel resource started falling */
  'voxel_resource:falling_started': {
    entityId: string;
    resourceType: string;
    position: { x: number; y: number };
    height: number;
    fallDirection: { x: number; y: number };
  };

  /** Voxel resource fell and dropped resources */
  'voxel_resource:fell': {
    entityId: string;
    resourceType: string;
    material: string;
    originalPosition: { x: number; y: number };
    fallPosition: { x: number; y: number };
    resourcesDropped: number;
    height: number;
  };

  /** Item dropped on ground (from tree fall, etc.) */
  'item:dropped': {
    entityId: string;
    material: string;
    amount: number;
    position: { x: number; y: number };
  };

  /** Animation created (for visual effects) */
  'animation:created': {
    animationType: string;
    duration: number;
    entityId: string;
    startPosition: { x: number; y: number };
    endPosition: { x: number; y: number };
  };

  // === Television & Broadcasting Events ===

  /** Episode started broadcasting */
  'tv:broadcast:started': {
    stationId: string;
    channelNumber: number;
    contentId: string;
    showId: string;
    isLive: boolean;
  };

  /** Episode finished broadcasting */
  'tv:broadcast:ended': {
    stationId: string;
    channelNumber: number;
    contentId: string;
    showId: string;
    peakViewers: number;
    totalViewers: number;
    averageRating: number;
  };

  /** Viewer tuned into a channel */
  'tv:viewer:tuned_in': {
    viewerId: string;
    stationId: string;
    channelNumber: number;
    contentId: string;
  };

  /** Viewer changed channel or stopped watching */
  'tv:viewer:tuned_out': {
    viewerId: string;
    stationId: string;
    channelNumber: number;
    watchDuration: number;
  };

  /** Viewer rated content after watching */
  'tv:viewer:rated': {
    viewerId: string;
    contentId: string;
    showId: string;
    rating: number;
    willWatchNext: boolean;
  };

  /** Show renewed for another season */
  'tv:show:renewed': {
    showId: string;
    stationId: string;
    newSeason: number;
  };

  /** Show cancelled */
  'tv:show:cancelled': {
    showId: string;
    stationId: string;
    finalSeason: number;
    totalEpisodes: number;
  };

  /** Episode completed production */
  'tv:episode:completed': {
    contentId: string;
    showId: string;
    season: number;
    episode: number;
    qualityScore: number;
  };

  /** Catchphrase learned by viewer */
  'tv:catchphrase:learned': {
    viewerId: string;
    showId: string;
    characterName: string;
    catchphrase: string;
  };

  // === Television Development & Writing Events ===

  /** Show pitch submitted to station */
  'tv:pitch:submitted': {
    pitchId: string;
    stationId: string;
    writerId: string;
    title: string;
    format: string;
  };

  /** Show greenlit for production */
  'tv:show:greenlit': {
    pitchId: string;
    showId: string;
    stationId: string;
    title: string;
    format: string;
    budget: number;
  };

  /** Show pitch rejected */
  'tv:show:rejected': {
    pitchId: string;
    stationId: string;
    title: string;
    reason: string;
  };

  /** Script draft completed */
  'tv:script:draft_completed': {
    scriptId: string;
    showId: string;
    writerId: string;
  };

  /** Script revised */
  'tv:script:revised': {
    scriptId: string;
    showId: string;
    revisionNumber: number;
  };

  /** Script ready for filming after table read */
  'tv:script:ready_to_film': {
    scriptId: string;
    showId: string;
    contentId: string;
  };

  /** New storyline started in a show */
  'tv:storyline:started': {
    showId: string;
    storylineId: string;
    title: string;
    characters: string[];
  };

  /** Storyline resolved or ended */
  'tv:storyline:ended': {
    showId: string;
    storylineId: string;
    resolution: 'resolved' | 'cliffhanger';
  };

  // === Television Production Events ===

  /** Scene filming started */
  'tv:production:scene_started': {
    productionId: string;
    showId: string;
    sceneNumber: number;
    director: string;
    actors: string[];
  };

  /** Take completed for a scene */
  'tv:production:take_completed': {
    productionId: string;
    showId: string;
    sceneNumber: number;
    takeNumber: number;
    qualityScore: number;
    isBest: boolean;
  };

  /** Scene wrapped (filming complete) */
  'tv:production:scene_wrapped': {
    productionId: string;
    showId: string;
    sceneNumber: number;
    totalTakes: number;
    averageQuality: number;
  };

  /** Production day wrapped */
  'tv:production:day_wrapped': {
    productionId: string;
    showId: string;
    scenesCompleted: number;
    totalScenes: number;
  };

  /** Live recording started */
  'tv:production:live_started': {
    productionId: string;
    showId: string;
    contentId: string;
  };

  /** Live recording ended */
  'tv:production:live_ended': {
    productionId: string;
    showId: string;
    contentId: string;
    duration: number;
  };

  // === Television Post-Production Events ===

  /** Post-production job started */
  'tv:postproduction:started': {
    jobId: string;
    contentId: string;
    showId: string;
    scenesCount: number;
  };

  /** Post-production phase completed */
  'tv:postproduction:phase_completed': {
    jobId: string;
    contentId: string;
    phase: 'editing' | 'sound' | 'vfx' | 'color' | 'final_review';
    nextPhase: string;
  };

  /** Post-production finalized - episode ready */
  'tv:postproduction:finalized': {
    contentId: string;
    showId: string;
    finalQuality: number;
    runtime: number;
  };

  // === Television Casting Events ===

  /** Casting call opened */
  'tv:casting:call_opened': {
    callId: string;
    showId: string;
    characterName: string;
    roleType: 'lead' | 'supporting' | 'recurring' | 'guest' | 'extra';
  };

  /** Audition submitted */
  'tv:casting:audition_submitted': {
    auditionId: string;
    callId: string;
    showId: string;
    characterName: string;
  };

  /** Role cast (actor selected) */
  'tv:casting:role_cast': {
    callId: string;
    showId: string;
    characterName: string;
    agentId: string;
    agentName: string;
    roleType: 'lead' | 'supporting' | 'recurring' | 'guest' | 'extra';
  };

  /** Contract signed */
  'tv:contract:signed': {
    contractId: string;
    agentId: string;
    showId: string;
    characterName: string;
    role: 'lead' | 'supporting' | 'recurring' | 'guest';
    compensation: number;
  };

  /** Contract renewed */
  'tv:contract:renewed': {
    contractId: string;
    agentId: string;
    newSeason: number;
    newCompensation: number;
  };

  /** Contract terminated */
  'tv:contract:terminated': {
    contractId: string;
    agentId: string;
    showId: string;
    characterName: string;
    reason: string;
  };

  // === Television Schedule Events ===

  /** Production schedule created */
  'tv:schedule:created': {
    scheduleId: string;
    showId: string;
    productionId: string;
    plannedStartTick: number;
    plannedEndTick: number;
  };

  /** Production schedule confirmed */
  'tv:schedule:confirmed': {
    scheduleId: string;
    productionId: string;
  };

  /** Production started per schedule */
  'tv:schedule:started': {
    scheduleId: string;
    productionId: string;
    actualStartTick: number;
  };

  /** Production completed */
  'tv:schedule:completed': {
    scheduleId: string;
    productionId: string;
    actualEndTick: number;
    onSchedule: boolean;
  };

  /** Milestone completed */
  'tv:milestone:completed': {
    productionId: string;
    milestoneType: 'script_lock' | 'table_read' | 'first_day' | 'wrap' | 'rough_cut' | 'final_delivery';
    name: string;
    onTime: boolean;
  };

  // === Deity Events ===
  /** A deity has manifested in the world */
  'deity:manifested': {
    deityId: EntityId;
    deityName: string;
    deityType: 'death_god' | 'wisdom_goddess';
    reason: string;
    location: { x: number; y: number };
    message: string;
  };

  /** Wisdom goddess has started scrutinizing a creation */
  'wisdom:scrutiny_started': {
    goddessId: EntityId;
    goddessName: string;
    creationId: string;
    creationType: 'recipe' | 'technology' | 'effect';
    creatorId: EntityId;
    creatorName: string;
  };

  /** Wisdom goddess has rendered judgment on a creation */
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

  /** Wisdom goddess has finished processing the queue */
  'wisdom:queue_processed': {
    goddessId: EntityId;
    goddessName: string;
    totalProcessed: number;
    approved: number;
    rejected: number;
  };

  // === Myth Events ===
  /** A myth's attribution has changed to a different deity */
  'myth:attribution_changed': {
    mythId: string;
    mythTitle: string;
    originalDeityId: EntityId;
    newDeityId: EntityId;
    timestamp: number;
  };

  // === VR System Events ===
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

  // === News/Event Reporting Events ===
  /** Agent was born */
  'agent:born': {
    agentId: string;
    agentName?: string;
    parentIds?: string[];
  };

  /** Union/Partnership formed between agents */
  'union:formed': {
    agent1Id: string;
    agent2Id: string;
    unionType?: string;
  };

  /** Combat battle started */
  'combat:battle_started': {
    participants: string[];
    location: { x: number; y: number };
    battleType?: string;
  };

  /** Combat battle ended */
  'combat:battle_ended': {
    participants: string[];
    victors?: string[];
    casualties?: string[];
  };

  /** Building construction completed */
  'building:completed': {
    buildingId: string;
    buildingType: string;
    location: { x: number; y: number };
    builderId?: string;
  };

  /** Disaster occurred */
  'disaster:occurred': {
    disasterType: string;
    location: { x: number; y: number };
    severity: number;
    affectedEntities?: string[];
  };

  /** Invasion started */
  'invasion:started': {
    invaderIds: string[];
    targetLocation: { x: number; y: number };
    invaderType?: string;
  };

  /** Festival started */
  'festival:started': {
    festivalType: string;
    location: { x: number; y: number };
    organizerId?: string;
    participants?: string[];
  };

  /** Divine intervention occurred */
  'divine:intervention': {
    deityId?: string;
    interventionType: string;
    targetId?: string;
    description?: string;
  };

  // === Rebellion System Events ===
  /** Rebellion succeeded completely, Creator destroyed */
  'rebellion:total_victory': {
    message: string;
  };

  /** Rebellion won but at great cost, reality fractured */
  'rebellion:pyrrhic_victory': {
    message: string;
  };

  /** Stalemate resulted in negotiated peace */
  'rebellion:negotiated_truce': {
    message: string;
  };

  /** Creator defeated but no clear successor */
  'rebellion:power_vacuum': {
    message: string;
  };

  /** New tyrant emerged, cycle continues */
  'rebellion:cycle_repeats': {
    message: string;
  };

  /** Creator changed by the rebellion */
  'rebellion:creator_transformed': {
    message: string;
  };

  /** Neither side could gain advantage */
  'rebellion:stalemate': {
    message: string;
  };

  /** Rebellion completely defeated */
  'rebellion:crushed': {
    message: string;
  };

  /** Reality rift created by battle */
  'rebellion:rift_spawned': {
    riftId: string;
    position: { x: number; y: number };
  };

  /** Warning about dangerous rifts */
  'rebellion:rifts_warning': {
    count: number;
    message: string;
  };

  /** Rebel leader ascended to godhood */
  'rebellion:rebel_ascension': {
    message: string;
    leaderId?: string;
  };

  /** New tyrant emerged from rebellion */
  'rebellion:new_tyrant': {
    message: string;
    tyrannId: string;
  };

  /** World split into territories */
  'rebellion:territory_divided': {
    message: string;
    territories: string[];
  };

  /** Uneasy peace between factions */
  'rebellion:cold_war': {
    message: string;
    factions: string[];
  };

  // === Additional Magic Events ===
  /** All magic restrictions lifted */
  'magic:liberated': {
    message: string;
    level: 'full';
  };

  /** Magic restrictions reduced */
  'magic:partially_liberated': {
    message: string;
    level: 'partial';
  };

  /** Agent unlocked a magic skill node */
  'magic:skill_node_unlocked': {
    nodeId: string;
    agentId: string;
    skillTree: string;
  };

  /** Spell unlocked via skill tree progression */
  'magic:spell_unlocked_from_skill_tree': {
    spellId: string;
    agentId: string;
    nodeId: string;
  };

  // === Additional Building Events ===
  /** Request to analyze building harmony */
  'building:analyze_harmony': {
    buildingId: string;
  };

  /** Building layout data provided */
  'building:layout_provided': {
    buildingId: string;
    layout: unknown;
  };

  /** Building harmony analysis completed */
  'building:harmony_analyzed': {
    buildingId: string;
    harmonyScore: number;
    aestheticScore?: number;
    functionalScore?: number;
    spatialScore?: number;
  };

  // === Additional Agent Events ===
  /** Agent gained XP */
  'agent:xp_gained': {
    agentId: string;
    skill: string;
    xp: number;
    source?: string;
  };

  /** Agent walking action */
  'action:walk': {
    agentId?: string;
    entityId?: string;
    position?: { x: number; y: number };
    destination?: { x: number; y: number };
  };

  /** Agent emotion reached peak intensity */
  'agent:emotion_peak': {
    agentId: string;
    emotion: string;
    intensity: number;
  };

  // === Chat/Communication Events ===
  /** Chat message sent */
  'chat:message_sent': {
    roomId: string;
    senderId: string;
    senderName?: string;
    message?: string;
    content?: string;
    timestamp?: number;
  };

  // === Memory Events ===
  /** Past life memory bleeding through */
  'memory_bleed': {
    agentId: string;
    memoryFragment?: string;
    intensity?: number;
  };

  // === Test Events ===
  /** Test event for development */
  'test:event': {
    [key: string]: unknown;
  };
}

/**
 * Union type of all valid event type strings.
 */
export type EventType = keyof GameEventMap;

/**
 * Get the data type for a specific event type.
 */
export type EventData<T extends EventType> = GameEventMap[T];
