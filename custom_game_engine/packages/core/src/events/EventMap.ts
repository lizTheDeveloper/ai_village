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
 *   console.log(event.data.actionType); // TypeScript knows this exists
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
    actionId: string;
    actorId: EntityId;
    agentId?: EntityId;
    plantId: EntityId;
    speciesId: string;
    harvested: Array<{ itemId: string; amount: number }>;
    position: { x: number; y: number };
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
    produced: Array<{ itemId: string; amount: number }>;
  };
  'crafting:panel_opened': Record<string, never>;
  'crafting:panel_closed': Record<string, never>;
  'crafting:recipe_selected': {
    recipeId: string;
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
  'action:water': {
    x: number;
    y: number;
    agentId?: EntityId;
  };
  'action:fertilize': {
    x: number;
    y: number;
    fertilizerType?: string;
    agentId?: EntityId;
  };

  // === Research Events ===
  'research:unlocked': {
    researchId: string;
    agentId?: EntityId;
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
