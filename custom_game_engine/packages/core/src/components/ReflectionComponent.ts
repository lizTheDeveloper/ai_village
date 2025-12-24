import { ComponentBase } from '../ecs/Component.js';

export interface Reflection {
  readonly id: string;
  readonly type: 'daily' | 'deep' | 'post_event' | 'idle';
  readonly text: string;
  readonly timestamp: number;
  readonly memoryIds: readonly string[]; // Episodic memories reflected on
  readonly insights?: readonly string[]; // Key insights gained
  readonly themes?: readonly string[]; // Recurring themes identified
  readonly narrative?: string; // Narrative summary for deep reflections
}

interface ReflectionInput {
  type: 'daily' | 'deep' | 'post_event' | 'idle';
  text: string;
  timestamp: number;
  memoryIds: string[];
  insights?: string[];
  themes?: string[];
  narrative?: string;
}

/**
 * ReflectionComponent stores agent's reflections on their experiences
 */
export class ReflectionComponent extends ComponentBase {
  public readonly type = 'reflection';
  private _reflections: Reflection[] = [];
  private _lastDeepReflection: number = 0;
  public isReflecting: boolean = false; // UI indicator: agent is currently reflecting
  public reflectionType?: 'daily' | 'deep' | 'post_event' | 'idle'; // Type of current reflection

  /**
   * Get all reflections (readonly)
   */
  get reflections(): readonly Reflection[] {
    return Object.freeze([...this._reflections]);
  }

  /**
   * Get timestamp of last deep reflection
   */
  get lastDeepReflection(): number {
    return this._lastDeepReflection;
  }

  /**
   * Add a new reflection
   */
  addReflection(input: ReflectionInput): Reflection {
    if (!input.type) {
      throw new Error('Reflection requires type');
    }
    if (!input.text) {
      throw new Error('Reflection requires text');
    }
    if (input.timestamp === undefined) {
      throw new Error('Reflection requires timestamp');
    }
    if (!input.memoryIds) {
      throw new Error('Reflection requires memoryIds');
    }

    const reflection: Reflection = Object.freeze({
      id: this._generateId(),
      type: input.type,
      text: input.text,
      timestamp: input.timestamp,
      memoryIds: Object.freeze([...input.memoryIds]),
      insights: input.insights
        ? Object.freeze([...input.insights])
        : undefined,
      themes: input.themes
        ? Object.freeze([...input.themes])
        : undefined,
      narrative: input.narrative,
    });

    this._reflections.push(reflection);

    if (input.type === 'deep') {
      this._lastDeepReflection = input.timestamp;
    }

    return reflection;
  }

  /**
   * Get recent reflections
   */
  getRecent(limit: number = 10): readonly Reflection[] {
    return this._reflections
      .slice(-limit)
      .reverse();
  }

  private _generateId(): string {
    return `ref-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}
