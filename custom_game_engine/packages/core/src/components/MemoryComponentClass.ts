import { ComponentBase } from '../ecs/Component.js';

export interface Memory {
  id: string;
  type: 'episodic' | 'semantic' | 'procedural';
  content: string;
  importance: number;
  timestamp: number;
  location: { x: number; y: number };
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
  getMemoriesByType(type: Memory['type']): Memory[] {
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
