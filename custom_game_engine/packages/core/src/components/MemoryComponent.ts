import type { Component } from '../ecs/Component.js';
import type { Tick, EntityId } from '../types.js';

export type MemoryType =
  | 'resource_location'  // Remembered a food/resource spot
  | 'plant_location'     // Remembered a plant location
  | 'agent_seen'         // Saw another agent
  | 'danger'             // Dangerous location/entity
  | 'home';              // Safe/home location

export interface Memory {
  type: MemoryType;
  x: number;
  y: number;
  entityId?: EntityId;   // Optional reference to entity
  strength: number;      // 0-100, higher = stronger memory
  createdAt: Tick;
  lastReinforced: Tick;
  metadata?: Record<string, unknown>; // Additional data
}

export interface MemoryComponent extends Component {
  type: 'memory';
  memories: Memory[];
  maxMemories: number;  // Maximum memories to store
  decayRate: number;    // Strength lost per second
}

export function createMemoryComponent(
  maxMemories: number = 20,
  decayRate: number = 1.0
): MemoryComponent {
  return {
    type: 'memory',
    version: 1,
    memories: [],
    maxMemories,
    decayRate,
  };
}

/**
 * Add or reinforce a memory
 */
export function addMemory(
  component: MemoryComponent,
  memory: Omit<Memory, 'strength' | 'createdAt' | 'lastReinforced'>,
  currentTick: Tick,
  initialStrength: number = 100
): MemoryComponent {
  const memories = [...component.memories];

  // Check if similar memory already exists
  const existingIndex = memories.findIndex(
    (m) =>
      m.type === memory.type &&
      (memory.entityId ? m.entityId === memory.entityId :
       Math.abs(m.x - memory.x) < 2 && Math.abs(m.y - memory.y) < 2)
  );

  if (existingIndex >= 0) {
    // Reinforce existing memory
    memories[existingIndex] = {
      ...memories[existingIndex]!,
      strength: Math.min(100, memories[existingIndex]!.strength + 20),
      lastReinforced: currentTick,
      x: memory.x, // Update position
      y: memory.y,
    };
  } else {
    // Add new memory
    const newMemory: Memory = {
      ...memory,
      strength: initialStrength,
      createdAt: currentTick,
      lastReinforced: currentTick,
    };

    memories.push(newMemory);

    // Remove weakest memory if over limit
    if (memories.length > component.maxMemories) {
      memories.sort((a, b) => a.strength - b.strength);
      memories.shift();
    }
  }

  return {
    ...component,
    memories,
  };
}

/**
 * Get strongest memory of a specific type
 */
export function getStrongestMemory(
  component: MemoryComponent,
  type: MemoryType
): Memory | null {
  const matching = component.memories.filter((m) => m.type === type);
  if (matching.length === 0) return null;

  return matching.reduce((strongest, current) =>
    current.strength > strongest.strength ? current : strongest
  );
}

/**
 * Get all memories of a type, sorted by strength
 */
export function getMemoriesByType(
  component: MemoryComponent,
  type: MemoryType
): Memory[] {
  return component.memories
    .filter((m) => m.type === type)
    .sort((a, b) => b.strength - a.strength);
}
