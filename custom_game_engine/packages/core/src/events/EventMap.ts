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
  'building:destroyed': {
    buildingId: EntityId;
  };
  'building:menu:opened': Record<string, never>;
  'building:menu:closed': Record<string, never>;
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
  };
  'information:shared': {
    from: EntityId;
    to: EntityId;
    informationType: string;
    content: unknown;
    memoryType?: string;
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
  };
  'research:completed': {
    researchId: string;
    researchers: EntityId[];
    unlocks: Array<{ type: string; id: string }>;
    tick: number;
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
  'discovery:created': {
    discoveryType: 'item' | 'recipe' | 'building' | 'research';
    discoveryId: string;
    name: string;
    tier: number;
    generatedBy: EntityId;
    researchContext?: string;
  };
  'capability_gap:detected': {
    gapId: string;
    agentId: EntityId;
    attemptedAction: string;
    description: string;
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

  // === Mood Events ===
  'mood:changed': {
    agentId: EntityId;
    currentMood: number;
    emotionalState: string;
    description: string;
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
    reason: 'idle' | 'task_complete' | 'periodic' | 'manual';
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
    source: 'llm' | 'fallback';
    /** Raw LLM response text (truncated to 2000 chars for metrics) */
    rawResponse?: string;
    /** Duration of LLM call in milliseconds */
    latencyMs?: number;
  };
  'llm:error': {
    agentId: EntityId;
    error: string;
    errorType: 'timeout' | 'connection' | 'parse' | 'unknown';
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
}

/**
 * Union type of all valid event type strings.
 */
export type EventType = keyof GameEventMap;

/**
 * Get the data type for a specific event type.
 */
export type EventData<T extends EventType> = GameEventMap[T];
