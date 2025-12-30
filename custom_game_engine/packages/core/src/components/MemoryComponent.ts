import { ComponentBase } from '../ecs/Component.js';

export type MemoryType =
  | 'episodic'
  | 'semantic'
  | 'procedural'
  | 'success'            // Successfully completed something
  | 'failure'            // Failed attempt to learn from
  | 'knowledge'          // Learned from others
  | 'resource_location'; // Remembered a resource location

export interface Memory {
  id: string;
  type: MemoryType;
  content: string;
  importance: number;
  timestamp: number;
  location: { x: number; y: number };
  // Legacy fields for backwards compatibility
  x?: number;
  y?: number;
  strength?: number;
  entityId?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Class-based MemoryComponent for tests and new systems
 */
export class MemoryComponent extends ComponentBase {
  public readonly type = 'memory';
  public memories: Memory[] = [];
  public lastReflectionTime?: number;

  constructor(public entityId: string) {
    super();
  }

  /**
   * Add a memory
   */
  addMemory(memory: Memory): void {
    this.memories.push(memory);
  }

  /**
   * Get memories by type
   */
  getMemoriesByType(type: MemoryType): Memory[] {
    return this.memories.filter(m => m.type === type);
  }

  /**
   * Get recent memories (within time window)
   */
  getRecentMemories(timeWindow: number): Memory[] {
    const cutoff = Date.now() - timeWindow;
    return this.memories.filter(m => m.timestamp >= cutoff);
  }

  /**
   * Get memories sorted by importance
   */
  getMemoriesByImportance(minImportance: number = 0): Memory[] {
    return this.memories
      .filter(m => m.importance >= minImportance)
      .sort((a, b) => b.importance - a.importance);
  }
}

/**
 * Standalone helper function for backwards compatibility
 * Adds a memory to a MemoryComponent instance
 * Supports both old and new API signatures:
 * - New: addMemory(component, memory)
 * - Old: addMemory(component, memoryData, tick, strength)
 */
export function addMemory(
  component: MemoryComponent,
  memoryOrData: Memory | Partial<Memory>,
  tick?: number,
  strength?: number
): MemoryComponent {
  // If called with old signature (4 args), construct Memory object
  if (tick !== undefined || strength !== undefined) {
    const data = memoryOrData as Partial<Memory>;
    const memory: Memory = {
      id: `mem_${Date.now()}_${Math.random()}`,
      type: (data.type as any) || 'episodic',
      content: data.content || '',
      importance: strength !== undefined ? strength / 100 : (data.importance || 0.5),
      timestamp: tick || Date.now(),
      location: data.location || { x: data.x || 0, y: data.y || 0 },
      x: data.x,
      y: data.y,
      strength,
      entityId: data.entityId,
      metadata: data.metadata,
    };
    component.addMemory(memory);
  } else {
    // New API: just pass through the memory object
    component.addMemory(memoryOrData as Memory);
  }
  return component;
}

/**
 * Standalone helper function for backwards compatibility
 * Gets memories by type from a MemoryComponent instance
 */
export function getMemoriesByType(component: MemoryComponent, type: MemoryType): Memory[] {
  return component.getMemoriesByType(type);
}
