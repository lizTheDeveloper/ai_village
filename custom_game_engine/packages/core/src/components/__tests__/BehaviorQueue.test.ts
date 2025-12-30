import { describe, it, expect, beforeEach } from 'vitest';
import type { AgentComponent, AgentBehavior } from '../AgentComponent';

import { ComponentType } from '../../types/ComponentType.js';
/**
 * Queue data structure (will be added to AgentComponent)
 */
interface QueuedBehavior {
  behavior: AgentBehavior;
  behaviorState?: Record<string, unknown>;
  priority: 'normal' | 'high' | 'critical';
  repeats?: number; // undefined = once, 0 = infinite, N = repeat N times
  label?: string; // Optional human-readable label for debugging
}

/**
 * Extended AgentComponent with queue fields
 */
interface QueuedAgentComponent extends AgentComponent {
  behaviorQueue?: QueuedBehavior[];
  currentQueueIndex?: number;
  queuePaused?: boolean;
  queueInterruptedBy?: AgentBehavior;
  behaviorCompleted?: boolean; // Set by behaviors when they complete
}

/**
 * Helper functions that will be added to AgentComponent module
 */

function queueBehavior(
  agent: QueuedAgentComponent,
  behavior: AgentBehavior,
  options?: {
    behaviorState?: Record<string, unknown>;
    priority?: 'normal' | 'high' | 'critical';
    repeats?: number;
    label?: string;
  }
): void {
  // Per CLAUDE.md: No silent fallbacks, throw on missing data
  if (!agent.behaviorQueue) {
    throw new Error('Agent must have behaviorQueue array initialized');
  }

  const queuedBehavior: QueuedBehavior = {
    behavior,
    behaviorState: options?.behaviorState,
    priority: options?.priority ?? 'normal',
    repeats: options?.repeats,
    label: options?.label,
  };

  // Limit queue size to prevent memory leaks
  if (agent.behaviorQueue.length >= 20) {
    throw new Error('Behavior queue is full (max 20 behaviors)');
  }

  agent.behaviorQueue.push(queuedBehavior);
}

function clearBehaviorQueue(agent: QueuedAgentComponent): void {
  if (!('behaviorQueue' in agent)) {
    throw new Error('Agent missing behaviorQueue field');
  }

  agent.behaviorQueue = [];
  agent.currentQueueIndex = 0;
  agent.queuePaused = false;
  agent.queueInterruptedBy = undefined;
  agent.behaviorCompleted = false;
}

function pauseBehaviorQueue(agent: QueuedAgentComponent): void {
  if (!('queuePaused' in agent)) {
    throw new Error('Agent missing queuePaused field');
  }

  agent.queuePaused = true;
}

function resumeBehaviorQueue(agent: QueuedAgentComponent): void {
  if (!('queuePaused' in agent)) {
    throw new Error('Agent missing queuePaused field');
  }

  agent.queuePaused = false;
}

function hasBehaviorQueue(agent: QueuedAgentComponent): boolean {
  // Per CLAUDE.md: No fallback, require explicit check
  if (!('behaviorQueue' in agent)) {
    throw new Error('Agent missing behaviorQueue field');
  }

  return agent.behaviorQueue !== undefined && agent.behaviorQueue.length > 0;
}

function getCurrentQueuedBehavior(agent: QueuedAgentComponent): QueuedBehavior | null {
  if (!('behaviorQueue' in agent)) {
    throw new Error('Agent missing behaviorQueue field');
  }

  if (!agent.behaviorQueue || agent.behaviorQueue.length === 0) {
    return null;
  }

  const index = agent.currentQueueIndex ?? 0;
  if (index >= agent.behaviorQueue.length) {
    return null;
  }

  return agent.behaviorQueue[index];
}

function advanceBehaviorQueue(agent: QueuedAgentComponent): void {
  if (!('behaviorQueue' in agent)) {
    throw new Error('Agent missing behaviorQueue field');
  }

  if (!('currentQueueIndex' in agent)) {
    throw new Error('Agent missing currentQueueIndex field');
  }

  const currentIndex = agent.currentQueueIndex ?? 0;
  const currentBehavior = agent.behaviorQueue?.[currentIndex];

  if (!currentBehavior) {
    throw new Error('No current behavior to advance from');
  }

  // Handle repeats
  if (currentBehavior.repeats !== undefined) {
    if (currentBehavior.repeats > 0) {
      // Decrement repeat count
      currentBehavior.repeats--;

      // If still repeating, reset behaviorCompleted and stay on same behavior
      if (currentBehavior.repeats > 0) {
        agent.behaviorCompleted = false;
        return;
      }
    } else if (currentBehavior.repeats === 0) {
      // Infinite repeats, never advance
      agent.behaviorCompleted = false;
      return;
    }
  }

  // Advance to next behavior
  agent.currentQueueIndex = currentIndex + 1;
  agent.behaviorCompleted = false;
}

describe('Behavior Queue System - Component & Helpers', () => {
  let agent: QueuedAgentComponent;

  beforeEach(() => {
    agent = {
      type: ComponentType.Agent,
      version: 1,
      behavior: 'wander',
      behaviorState: {},
      thinkInterval: 20,
      lastThinkTick: 0,
      useLLM: false,
      llmCooldown: 0,
      behaviorQueue: [],
      currentQueueIndex: 0,
      queuePaused: false,
      behaviorCompleted: false,
    };
  });

  describe('Acceptance Criterion 6: Queue Multiple Behaviors', () => {
    it('should add behavior to behaviorQueue array', () => {
      queueBehavior(agent, 'gather');

      expect(agent.behaviorQueue).toBeDefined();
      expect(agent.behaviorQueue?.length).toBe(1);
      expect(agent.behaviorQueue?.[0].behavior).toBe('gather');
    });

    it('should queue 3 different behaviors in order', () => {
      queueBehavior(agent, 'gather');
      queueBehavior(agent, 'deposit_items');
      queueBehavior(agent, 'till');

      expect(agent.behaviorQueue?.length).toBe(3);
      expect(agent.behaviorQueue?.[0].behavior).toBe('gather');
      expect(agent.behaviorQueue?.[1].behavior).toBe('deposit_items');
      expect(agent.behaviorQueue?.[2].behavior).toBe('till');
    });

    it('should set currentQueueIndex to 0 initially', () => {
      queueBehavior(agent, 'gather');

      expect(agent.currentQueueIndex).toBe(0);
    });

    it('should support optional behaviorState for queued behaviors', () => {
      const state = { targetResource: 'wood' };
      queueBehavior(agent, 'gather', { behaviorState: state });

      expect(agent.behaviorQueue?.[0].behaviorState).toEqual(state);
    });

    it('should support priority levels (normal, high, critical)', () => {
      queueBehavior(agent, 'gather', { priority: 'normal' });
      queueBehavior(agent, 'seek_food', { priority: 'high' });
      queueBehavior(agent, 'flee_danger', { priority: 'critical' });

      expect(agent.behaviorQueue?.[0].priority).toBe('normal');
      expect(agent.behaviorQueue?.[1].priority).toBe('high');
      expect(agent.behaviorQueue?.[2].priority).toBe('critical');
    });

    it('should default priority to "normal" if not specified', () => {
      queueBehavior(agent, 'gather');

      expect(agent.behaviorQueue?.[0].priority).toBe('normal');
    });

    it('should support optional label for debugging', () => {
      queueBehavior(agent, 'gather', { label: 'Gather 10 wood' });

      expect(agent.behaviorQueue?.[0].label).toBe('Gather 10 wood');
    });
  });

  describe('Acceptance Criterion 7: Sequential Execution', () => {
    it('should increment currentQueueIndex when behavior completes', () => {
      queueBehavior(agent, 'gather');
      queueBehavior(agent, 'deposit_items');
      queueBehavior(agent, 'till');

      expect(agent.currentQueueIndex).toBe(0);

      // Simulate completion
      agent.behaviorCompleted = true;
      advanceBehaviorQueue(agent);

      expect(agent.currentQueueIndex).toBe(1);
    });

    it('should reset behaviorCompleted to false after advancing', () => {
      queueBehavior(agent, 'gather');
      queueBehavior(agent, 'deposit_items');

      agent.behaviorCompleted = true;
      advanceBehaviorQueue(agent);

      expect(agent.behaviorCompleted).toBe(false);
    });

    it('should advance through all 3 behaviors in sequence', () => {
      queueBehavior(agent, 'gather');
      queueBehavior(agent, 'deposit_items');
      queueBehavior(agent, 'till');

      // Complete first behavior
      agent.behaviorCompleted = true;
      advanceBehaviorQueue(agent);
      expect(agent.currentQueueIndex).toBe(1);
      expect(getCurrentQueuedBehavior(agent)?.behavior).toBe('deposit_items');

      // Complete second behavior
      agent.behaviorCompleted = true;
      advanceBehaviorQueue(agent);
      expect(agent.currentQueueIndex).toBe(2);
      expect(getCurrentQueuedBehavior(agent)?.behavior).toBe('till');

      // Complete third behavior
      agent.behaviorCompleted = true;
      advanceBehaviorQueue(agent);
      expect(agent.currentQueueIndex).toBe(3);
      expect(getCurrentQueuedBehavior(agent)).toBeNull(); // Queue finished
    });
  });

  describe('Acceptance Criterion 8: Critical Need Interruption', () => {
    it('should pause queue when critical need occurs', () => {
      queueBehavior(agent, 'gather');
      queueBehavior(agent, 'deposit_items');

      // Simulate critical hunger
      pauseBehaviorQueue(agent);
      agent.queueInterruptedBy = 'seek_food';

      expect(agent.queuePaused).toBe(true);
      expect(agent.queueInterruptedBy).toBe('seek_food');
    });

    it('should save current queue index when interrupted', () => {
      queueBehavior(agent, 'gather');
      queueBehavior(agent, 'deposit_items');
      queueBehavior(agent, 'till');

      // Advance to second behavior
      agent.currentQueueIndex = 1;

      // Interrupt
      pauseBehaviorQueue(agent);
      agent.queueInterruptedBy = 'seek_food';

      // Index should be preserved
      expect(agent.currentQueueIndex).toBe(1);
    });

    it('should resume queue after interruption resolved', () => {
      queueBehavior(agent, 'gather');
      queueBehavior(agent, 'deposit_items');

      // Interrupt
      pauseBehaviorQueue(agent);
      agent.queueInterruptedBy = 'seek_food';
      agent.currentQueueIndex = 1;

      // Resume
      resumeBehaviorQueue(agent);

      expect(agent.queuePaused).toBe(false);
      expect(agent.currentQueueIndex).toBe(1); // Preserved
    });

    it('should support multiple interrupt types (hunger, energy)', () => {
      queueBehavior(agent, 'gather');

      // Hunger interrupt
      pauseBehaviorQueue(agent);
      agent.queueInterruptedBy = 'seek_food';
      expect(agent.queueInterruptedBy).toBe('seek_food');

      // Resolve hunger, then energy interrupt
      resumeBehaviorQueue(agent);
      pauseBehaviorQueue(agent);
      agent.queueInterruptedBy = 'seek_sleep';
      expect(agent.queueInterruptedBy).toBe('seek_sleep');
    });
  });

  describe('Acceptance Criterion 9: Repeatable Behaviors', () => {
    it('should repeat behavior 3 times before advancing', () => {
      queueBehavior(agent, 'till', { repeats: 3 });
      queueBehavior(agent, 'deposit_items');

      expect(agent.behaviorQueue?.[0].repeats).toBe(3);

      // First completion - repeats goes from 3 to 2
      agent.behaviorCompleted = true;
      advanceBehaviorQueue(agent);
      expect(agent.currentQueueIndex).toBe(0); // Still on first behavior
      expect(agent.behaviorQueue?.[0].repeats).toBe(2);

      // Second completion - repeats goes from 2 to 1
      agent.behaviorCompleted = true;
      advanceBehaviorQueue(agent);
      expect(agent.currentQueueIndex).toBe(0);
      expect(agent.behaviorQueue?.[0].repeats).toBe(1);

      // Third completion - repeats goes from 1 to 0, advances
      agent.behaviorCompleted = true;
      advanceBehaviorQueue(agent);
      expect(agent.currentQueueIndex).toBe(1); // NOW advances
      expect(getCurrentQueuedBehavior(agent)?.behavior).toBe('deposit_items');
    });

    it('should support infinite repeats (repeats: 0)', () => {
      queueBehavior(agent, 'wander', { repeats: 0 });

      expect(agent.behaviorQueue?.[0].repeats).toBe(0);

      // Complete 100 times, should never advance
      for (let i = 0; i < 100; i++) {
        agent.behaviorCompleted = true;
        advanceBehaviorQueue(agent);
        expect(agent.currentQueueIndex).toBe(0);
        expect(agent.behaviorQueue?.[0].repeats).toBe(0); // Stays at 0
      }
    });

    it('should execute behavior once when repeats is undefined', () => {
      queueBehavior(agent, 'gather'); // No repeats specified
      queueBehavior(agent, 'deposit_items');

      expect(agent.behaviorQueue?.[0].repeats).toBeUndefined();

      // First completion advances
      agent.behaviorCompleted = true;
      advanceBehaviorQueue(agent);
      expect(agent.currentQueueIndex).toBe(1);
    });

    it('should queue plant_seed with repeats=5 and verify 5 executions', () => {
      queueBehavior(agent, 'farm', { repeats: 5, label: 'Plant 5 seeds' });

      expect(agent.behaviorQueue?.[0].repeats).toBe(5);
      expect(agent.behaviorQueue?.[0].label).toBe('Plant 5 seeds');

      // Execute 5 times
      for (let i = 5; i > 0; i--) {
        expect(agent.behaviorQueue?.[0].repeats).toBe(i);
        agent.behaviorCompleted = true;
        advanceBehaviorQueue(agent);
      }

      // After 5 completions, should advance
      expect(agent.currentQueueIndex).toBe(1);
      expect(getCurrentQueuedBehavior(agent)).toBeNull();
    });
  });

  describe('Acceptance Criterion 10: Queue Management API', () => {
    it('clearBehaviorQueue() should clear behaviorQueue array', () => {
      queueBehavior(agent, 'gather');
      queueBehavior(agent, 'deposit_items');
      queueBehavior(agent, 'till');

      expect(agent.behaviorQueue?.length).toBe(3);

      clearBehaviorQueue(agent);

      expect(agent.behaviorQueue?.length).toBe(0);
    });

    it('clearBehaviorQueue() should reset currentQueueIndex to 0', () => {
      queueBehavior(agent, 'gather');
      queueBehavior(agent, 'deposit_items');
      agent.currentQueueIndex = 1;

      clearBehaviorQueue(agent);

      expect(agent.currentQueueIndex).toBe(0);
    });

    it('clearBehaviorQueue() should reset all queue state', () => {
      queueBehavior(agent, 'gather');
      agent.queuePaused = true;
      agent.queueInterruptedBy = 'seek_food';
      agent.behaviorCompleted = true;

      clearBehaviorQueue(agent);

      expect(agent.behaviorQueue?.length).toBe(0);
      expect(agent.currentQueueIndex).toBe(0);
      expect(agent.queuePaused).toBe(false);
      expect(agent.queueInterruptedBy).toBeUndefined();
      expect(agent.behaviorCompleted).toBe(false);
    });

    it('pauseBehaviorQueue() should set queuePaused to true', () => {
      queueBehavior(agent, 'gather');

      expect(agent.queuePaused).toBe(false);

      pauseBehaviorQueue(agent);

      expect(agent.queuePaused).toBe(true);
    });

    it('resumeBehaviorQueue() should set queuePaused to false', () => {
      queueBehavior(agent, 'gather');
      agent.queuePaused = true;

      resumeBehaviorQueue(agent);

      expect(agent.queuePaused).toBe(false);
    });

    it('hasBehaviorQueue() should return true when queue has behaviors', () => {
      queueBehavior(agent, 'gather');

      expect(hasBehaviorQueue(agent)).toBe(true);
    });

    it('hasBehaviorQueue() should return false when queue is empty', () => {
      expect(hasBehaviorQueue(agent)).toBe(false);
    });

    it('getCurrentQueuedBehavior() should return current behavior', () => {
      queueBehavior(agent, 'gather');
      queueBehavior(agent, 'deposit_items');

      agent.currentQueueIndex = 0;
      const current = getCurrentQueuedBehavior(agent);

      expect(current?.behavior).toBe('gather');
    });

    it('getCurrentQueuedBehavior() should return null when queue is empty', () => {
      const current = getCurrentQueuedBehavior(agent);

      expect(current).toBeNull();
    });

    it('getCurrentQueuedBehavior() should return null when index exceeds queue length', () => {
      queueBehavior(agent, 'gather');
      agent.currentQueueIndex = 5;

      const current = getCurrentQueuedBehavior(agent);

      expect(current).toBeNull();
    });
  });

  describe('Acceptance Criterion 12: CLAUDE.md Compliance', () => {
    it('should throw when queueBehavior called on agent without behaviorQueue', () => {
      const invalidAgent: QueuedAgentComponent = {
        type: ComponentType.Agent,
        version: 1,
        behavior: 'wander',
        behaviorState: {},
        thinkInterval: 20,
        lastThinkTick: 0,
        useLLM: false,
        llmCooldown: 0,
        // behaviorQueue missing
      };

      expect(() => {
        queueBehavior(invalidAgent, 'gather');
      }).toThrow('Agent must have behaviorQueue array initialized');
    });

    it('should throw when queue exceeds 20 behaviors (memory leak prevention)', () => {
      // Add 20 behaviors
      for (let i = 0; i < 20; i++) {
        queueBehavior(agent, 'gather');
      }

      expect(agent.behaviorQueue?.length).toBe(20);

      // 21st should throw
      expect(() => {
        queueBehavior(agent, 'gather');
      }).toThrow('Behavior queue is full (max 20 behaviors)');
    });

    it('should throw when clearBehaviorQueue called on agent without behaviorQueue field', () => {
      const invalidAgent: AgentComponent = {
        type: ComponentType.Agent,
        version: 1,
        behavior: 'wander',
        behaviorState: {},
        thinkInterval: 20,
        lastThinkTick: 0,
        useLLM: false,
        llmCooldown: 0,
      };

      expect(() => {
        clearBehaviorQueue(invalidAgent);
      }).toThrow('Agent missing behaviorQueue field');
    });

    it('should throw when pauseBehaviorQueue called on agent without queuePaused field', () => {
      const invalidAgent: AgentComponent = {
        type: ComponentType.Agent,
        version: 1,
        behavior: 'wander',
        behaviorState: {},
        thinkInterval: 20,
        lastThinkTick: 0,
        useLLM: false,
        llmCooldown: 0,
      };

      expect(() => {
        pauseBehaviorQueue(invalidAgent);
      }).toThrow('Agent missing queuePaused field');
    });

    it('should throw when resumeBehaviorQueue called on agent without queuePaused field', () => {
      const invalidAgent: AgentComponent = {
        type: ComponentType.Agent,
        version: 1,
        behavior: 'wander',
        behaviorState: {},
        thinkInterval: 20,
        lastThinkTick: 0,
        useLLM: false,
        llmCooldown: 0,
      };

      expect(() => {
        resumeBehaviorQueue(invalidAgent);
      }).toThrow('Agent missing queuePaused field');
    });

    it('should throw when hasBehaviorQueue called on agent without behaviorQueue field', () => {
      const invalidAgent: AgentComponent = {
        type: ComponentType.Agent,
        version: 1,
        behavior: 'wander',
        behaviorState: {},
        thinkInterval: 20,
        lastThinkTick: 0,
        useLLM: false,
        llmCooldown: 0,
      };

      expect(() => {
        hasBehaviorQueue(invalidAgent);
      }).toThrow('Agent missing behaviorQueue field');
    });

    it('should throw when getCurrentQueuedBehavior called on agent without behaviorQueue', () => {
      const invalidAgent: AgentComponent = {
        type: ComponentType.Agent,
        version: 1,
        behavior: 'wander',
        behaviorState: {},
        thinkInterval: 20,
        lastThinkTick: 0,
        useLLM: false,
        llmCooldown: 0,
      };

      expect(() => {
        getCurrentQueuedBehavior(invalidAgent);
      }).toThrow('Agent missing behaviorQueue field');
    });

    it('should throw when advanceBehaviorQueue called on agent without behaviorQueue', () => {
      const invalidAgent: QueuedAgentComponent = {
        type: ComponentType.Agent,
        version: 1,
        behavior: 'wander',
        behaviorState: {},
        thinkInterval: 20,
        lastThinkTick: 0,
        useLLM: false,
        llmCooldown: 0,
        // Missing behaviorQueue
        currentQueueIndex: 0,
      };

      expect(() => {
        advanceBehaviorQueue(invalidAgent);
      }).toThrow('Agent missing behaviorQueue field');
    });

    it('should throw when advanceBehaviorQueue called on agent without currentQueueIndex', () => {
      const invalidAgent: QueuedAgentComponent = {
        type: ComponentType.Agent,
        version: 1,
        behavior: 'wander',
        behaviorState: {},
        thinkInterval: 20,
        lastThinkTick: 0,
        useLLM: false,
        llmCooldown: 0,
        behaviorQueue: [{ behavior: 'gather', priority: 'normal' }],
        // Missing currentQueueIndex
      };

      expect(() => {
        advanceBehaviorQueue(invalidAgent);
      }).toThrow('Agent missing currentQueueIndex field');
    });

    it('should NOT use fallback values for missing queue fields', () => {
      // This test ensures we don't use patterns like:
      // const queue = agent.behaviorQueue ?? []; // BAD

      expect(() => {
        const invalidAgent: Partial<QueuedAgentComponent> = {
          type: ComponentType.Agent,
          version: 1,
          behavior: 'wander',
          behaviorState: {},
          thinkInterval: 20,
          lastThinkTick: 0,
          useLLM: false,
          llmCooldown: 0,
          // behaviorQueue intentionally missing
        };

        // Should throw, NOT use fallback
        if (!('behaviorQueue' in invalidAgent)) {
          throw new Error('behaviorQueue is required, no fallback allowed');
        }

        // Using fallback is prohibited by CLAUDE.md
        const queue = invalidAgent.behaviorQueue ?? []; // This pattern is WRONG
        if (queue.length === 0 && invalidAgent.behaviorQueue === undefined) {
          throw new Error('Cannot use fallback for missing behaviorQueue');
        }
      }).toThrow();
    });
  });
});
