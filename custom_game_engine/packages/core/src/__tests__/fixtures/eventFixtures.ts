/**
 * Common event patterns for testing
 */

/**
 * Event type constants
 */
export const EVENT_TYPES = {
  // Time events
  TIME_CHANGED: 'time_changed',
  DAY_NIGHT_TRANSITION: 'day_night_transition',

  // Weather events
  WEATHER_CHANGED: 'weather_changed',
  TEMPERATURE_UPDATED: 'temperature_updated',

  // Action events
  ACTION_STARTED: 'action_started',
  ACTION_COMPLETED: 'action_completed',
  ACTION_FAILED: 'action_failed',

  // Resource events
  RESOURCE_GATHERED: 'resource_gathered',
  RESOURCE_DEPLETED: 'resource_depleted',

  // Building events
  BUILDING_PLACED: 'building_placed',
  BUILDING_COMPLETED: 'building_completed',
  BUILDING_DESTROYED: 'building_destroyed',

  // Plant events
  PLANT_GROWN: 'plant_grown',
  PLANT_HARVESTED: 'plant_harvested',
  PLANT_DIED: 'plant_died',

  // Animal events
  ANIMAL_TAMED: 'animal_tamed',
  ANIMAL_PRODUCED: 'animal_produced',
  ANIMAL_DIED: 'animal_died',

  // Memory events
  MEMORY_FORMED: 'memory_formed',
  MEMORY_RECALLED: 'memory_recalled',
  MEMORY_FORGOTTEN: 'memory_forgotten',

  // Social events
  CONVERSATION_STARTED: 'conversation_started',
  CONVERSATION_ENDED: 'conversation_ended',
  TRUST_CHANGED: 'trust_changed',

  // Sleep events
  SLEEP_STARTED: 'sleep_started',
  SLEEP_ENDED: 'sleep_ended',
  DREAM_OCCURRED: 'dream_occurred',
} as const;

/**
 * Create a sample time changed event
 */
export function createTimeChangedEvent(hour: number, day: number) {
  return {
    type: EVENT_TYPES.TIME_CHANGED,
    data: { currentHour: hour, currentDay: day },
  };
}

/**
 * Create a sample action completed event
 */
export function createActionCompletedEvent(agentId: string, actionType: string) {
  return {
    type: EVENT_TYPES.ACTION_COMPLETED,
    data: { agentId, actionType },
  };
}

/**
 * Create a sample memory formed event
 */
export function createMemoryFormedEvent(agentId: string, memoryType: string) {
  return {
    type: EVENT_TYPES.MEMORY_FORMED,
    data: { agentId, memoryType },
  };
}

/**
 * Create a sample building placed event
 */
export function createBuildingPlacedEvent(buildingType: string, position: { x: number; y: number }) {
  return {
    type: EVENT_TYPES.BUILDING_PLACED,
    data: { buildingType, position },
  };
}

/**
 * Verify event chain order
 */
export function verifyEventChain(
  events: Array<{ type: string; data: any }>,
  expectedTypes: string[]
): boolean {
  const actualTypes = events.map(e => e.type);

  let eventIndex = 0;
  for (const expectedType of expectedTypes) {
    const foundIndex = actualTypes.indexOf(expectedType, eventIndex);
    if (foundIndex === -1) {
      return false;
    }
    eventIndex = foundIndex + 1;
  }

  return true;
}
