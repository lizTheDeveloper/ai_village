import { ComponentBase } from '../ecs/Component.js';

export interface QueuedAction {
  type: string;
  priority?: number;
  [key: string]: any;
}

/**
 * Class-based ActionQueue for tests
 */
export class ActionQueue extends ComponentBase {
  public readonly type = 'action_queue';
  private queue: QueuedAction[] = [];

  constructor(public entityId: string) {
    super();
  }

  /**
   * Add an action to the queue
   */
  enqueue(action: QueuedAction): void {
    this.queue.push(action);
    // Sort by priority (higher first)
    this.queue.sort((a, b) => (b.priority || 0) - (a.priority || 0));
  }

  /**
   * Remove and return the next action
   */
  dequeue(): QueuedAction | undefined {
    return this.queue.shift();
  }

  /**
   * Look at the next action without removing it
   */
  peek(): QueuedAction | undefined {
    return this.queue[0];
  }

  /**
   * Check if queue is empty
   */
  isEmpty(): boolean {
    return this.queue.length === 0;
  }

  /**
   * Get queue size
   */
  size(): number {
    return this.queue.length;
  }

  /**
   * Clear the queue
   */
  clear(): void {
    this.queue = [];
  }
}
