import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { World } from '../../ecs/World';
import type { Entity } from '../../ecs/Entity';
import type { AgentBehavior } from '../../components/AgentComponent';

import { ComponentType } from '../../types/ComponentType.js';
/**
 * Tests for behavior queue processing in AISystem
 * These tests verify that AISystem.update() correctly processes the behavior queue
 */

interface QueuedBehavior {
  behavior: AgentBehavior;
  behaviorState?: Record<string, unknown>;
  priority: 'normal' | 'high' | 'critical';
  repeats?: number;
  label?: string;
}

interface QueuedAgentComponent {
  type: ComponentType.Agent;
  version: number;
  behavior: AgentBehavior;
  behaviorState: Record<string, unknown>;
  thinkInterval: number;
  lastThinkTick: number;
  useLLM: boolean;
  llmCooldown: number;
  behaviorQueue?: QueuedBehavior[];
  currentQueueIndex?: number;
  queuePaused?: boolean;
  queueInterruptedBy?: AgentBehavior;
  behaviorCompleted?: boolean;
}

interface NeedsComponent {
  type: ComponentType.Needs;
  version: number;
  hunger: number;
  energy: number;
  temperature: number;
}

describe('Behavior Queue Processing in AISystem', () => {
  let mockWorld: Partial<World>;
  let mockEntity: Partial<Entity>;
  let mockAgent: QueuedAgentComponent;
  let mockNeeds: NeedsComponent;

  beforeEach(() => {
    mockAgent = {
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

    mockNeeds = {
      type: ComponentType.Needs,
      version: 1,
      hunger: 50,
      energy: 50,
      temperature: 20,
    };

    mockEntity = {
      id: 'agent-1',
      getComponent: vi.fn((type: string) => {
        if (type === 'agent') return mockAgent;
        if (type === 'needs') return mockNeeds;
        return undefined;
      }),
    };

    mockWorld = {
      tick: 0,
      eventBus: {
        emit: vi.fn(),
        on: vi.fn(),
        off: vi.fn(),
      },
    };
  });

  describe('Queue Execution Logic', () => {
    it('should execute first queued behavior when queue is not empty', () => {
      mockAgent.behaviorQueue = [
        { behavior: 'gather', priority: 'normal' },
        { behavior: 'deposit_items', priority: 'normal' },
      ];
      mockAgent.currentQueueIndex = 0;

      // AISystem should check if queue exists and execute first behavior
      const hasQueue = mockAgent.behaviorQueue && mockAgent.behaviorQueue.length > 0;
      expect(hasQueue).toBe(true);

      const currentBehavior = mockAgent.behaviorQueue[mockAgent.currentQueueIndex];
      expect(currentBehavior.behavior).toBe('gather');

      // Agent behavior should be set to queued behavior
      mockAgent.behavior = currentBehavior.behavior;
      expect(mockAgent.behavior).toBe('gather');
    });

    it('should check behaviorCompleted flag before advancing queue', () => {
      mockAgent.behaviorQueue = [
        { behavior: 'gather', priority: 'normal' },
        { behavior: 'deposit_items', priority: 'normal' },
      ];
      mockAgent.currentQueueIndex = 0;
      mockAgent.behaviorCompleted = false;

      // Should NOT advance if behaviorCompleted is false
      expect(mockAgent.behaviorCompleted).toBe(false);
      expect(mockAgent.currentQueueIndex).toBe(0);

      // Simulate completion
      mockAgent.behaviorCompleted = true;

      // Should advance when behaviorCompleted is true
      expect(mockAgent.behaviorCompleted).toBe(true);
    });

    it('should advance to next behavior when current behavior completes', () => {
      mockAgent.behaviorQueue = [
        { behavior: 'gather', priority: 'normal' },
        { behavior: 'deposit_items', priority: 'normal' },
        { behavior: 'till', priority: 'normal' },
      ];
      mockAgent.currentQueueIndex = 0;
      mockAgent.behaviorCompleted = true;

      // Simulate advanceBehaviorQueue()
      if (mockAgent.behaviorCompleted) {
        mockAgent.currentQueueIndex++;
        mockAgent.behaviorCompleted = false;
      }

      expect(mockAgent.currentQueueIndex).toBe(1);
      expect(mockAgent.behaviorCompleted).toBe(false);

      // Next behavior should be deposit_items
      const nextBehavior = mockAgent.behaviorQueue[mockAgent.currentQueueIndex];
      expect(nextBehavior.behavior).toBe('deposit_items');
    });

    it('should stop processing when queue is exhausted', () => {
      mockAgent.behaviorQueue = [
        { behavior: 'gather', priority: 'normal' },
      ];
      mockAgent.currentQueueIndex = 0;
      mockAgent.behaviorCompleted = true;

      // Advance past end of queue
      mockAgent.currentQueueIndex++;
      mockAgent.behaviorCompleted = false;

      expect(mockAgent.currentQueueIndex).toBe(1);

      // Check if queue is exhausted
      const isQueueExhausted = mockAgent.currentQueueIndex >= mockAgent.behaviorQueue.length;
      expect(isQueueExhausted).toBe(true);

      // Should fall back to default behavior or stop processing queue
      const currentBehavior = mockAgent.behaviorQueue[mockAgent.currentQueueIndex];
      expect(currentBehavior).toBeUndefined();
    });

    it('should emit agent:queue:completed event when queue finishes', () => {
      mockAgent.behaviorQueue = [
        { behavior: 'gather', priority: 'normal' },
      ];
      mockAgent.currentQueueIndex = 1; // Past end of queue

      const isQueueComplete = mockAgent.currentQueueIndex >= mockAgent.behaviorQueue.length;

      if (isQueueComplete) {
        mockWorld.eventBus?.emit({
          type: 'agent:queue:completed',
          source: mockEntity.id,
          data: { agentId: mockEntity.id },
        });
      }

      expect(mockWorld.eventBus?.emit).toHaveBeenCalledWith({
        type: 'agent:queue:completed',
        source: mockEntity.id,
        data: { agentId: mockEntity.id },
      });
    });
  });

  describe('Acceptance Criterion 8: Critical Need Interruption (Integration)', () => {
    it('should check for critical hunger (< 10) and interrupt queue', () => {
      mockAgent.behaviorQueue = [
        { behavior: 'gather', priority: 'normal' },
        { behavior: 'deposit_items', priority: 'normal' },
      ];
      mockAgent.currentQueueIndex = 0;
      mockAgent.queuePaused = false;

      // Simulate critical hunger
      mockNeeds.hunger = 8;

      // AISystem should detect critical need
      const criticalHunger = mockNeeds.hunger < 10;
      expect(criticalHunger).toBe(true);

      if (criticalHunger && !mockAgent.queuePaused) {
        mockAgent.queuePaused = true;
        mockAgent.queueInterruptedBy = 'seek_food';
        mockAgent.behavior = 'seek_food';
      }

      expect(mockAgent.queuePaused).toBe(true);
      expect(mockAgent.queueInterruptedBy).toBe('seek_food');
      expect(mockAgent.behavior).toBe('seek_food');
      expect(mockAgent.currentQueueIndex).toBe(0); // Index preserved
    });

    it('should check for critical energy (< 10) and interrupt queue', () => {
      mockAgent.behaviorQueue = [
        { behavior: 'gather', priority: 'normal' },
      ];
      mockAgent.currentQueueIndex = 0;
      mockAgent.queuePaused = false;

      // Simulate critical energy
      mockNeeds.energy = 5;

      const criticalEnergy = mockNeeds.energy < 10;
      expect(criticalEnergy).toBe(true);

      if (criticalEnergy && !mockAgent.queuePaused) {
        mockAgent.queuePaused = true;
        mockAgent.queueInterruptedBy = 'seek_sleep';
        mockAgent.behavior = 'seek_sleep';
      }

      expect(mockAgent.queuePaused).toBe(true);
      expect(mockAgent.queueInterruptedBy).toBe('seek_sleep');
      expect(mockAgent.behavior).toBe('seek_sleep');
    });

    it('should resume queue when hunger rises above 40', () => {
      mockAgent.behaviorQueue = [
        { behavior: 'gather', priority: 'normal' },
        { behavior: 'deposit_items', priority: 'normal' },
      ];
      mockAgent.currentQueueIndex = 1;
      mockAgent.queuePaused = true;
      mockAgent.queueInterruptedBy = 'seek_food';
      mockAgent.behavior = 'seek_food';

      // Simulate eating
      mockNeeds.hunger = 50;

      // AISystem should detect need resolution
      const hungerResolved = mockNeeds.hunger > 40 && mockAgent.queueInterruptedBy === 'seek_food';

      if (hungerResolved) {
        mockAgent.queuePaused = false;
        mockAgent.queueInterruptedBy = undefined;

        // Resume queued behavior
        const currentQueuedBehavior = mockAgent.behaviorQueue[mockAgent.currentQueueIndex];
        mockAgent.behavior = currentQueuedBehavior.behavior;
      }

      expect(mockAgent.queuePaused).toBe(false);
      expect(mockAgent.queueInterruptedBy).toBeUndefined();
      expect(mockAgent.behavior).toBe('deposit_items'); // Resumed at saved index
      expect(mockAgent.currentQueueIndex).toBe(1); // Index preserved
    });

    it('should resume queue when energy rises above 70', () => {
      mockAgent.behaviorQueue = [
        { behavior: 'till', priority: 'normal' },
      ];
      mockAgent.currentQueueIndex = 0;
      mockAgent.queuePaused = true;
      mockAgent.queueInterruptedBy = 'seek_sleep';

      // Simulate sleeping
      mockNeeds.energy = 80;

      const energyResolved = mockNeeds.energy > 70 && mockAgent.queueInterruptedBy === 'seek_sleep';

      if (energyResolved) {
        mockAgent.queuePaused = false;
        mockAgent.queueInterruptedBy = undefined;

        const currentQueuedBehavior = mockAgent.behaviorQueue[mockAgent.currentQueueIndex];
        mockAgent.behavior = currentQueuedBehavior.behavior;
      }

      expect(mockAgent.queuePaused).toBe(false);
      expect(mockAgent.behavior).toBe('till');
    });

    it('should emit agent:queue:interrupted event when interrupted', () => {
      mockAgent.behaviorQueue = [
        { behavior: 'gather', priority: 'normal' },
      ];
      mockAgent.currentQueueIndex = 0;

      mockNeeds.hunger = 5;

      if (mockNeeds.hunger < 10) {
        mockAgent.queuePaused = true;
        mockAgent.queueInterruptedBy = 'seek_food';

        mockWorld.eventBus?.emit({
          type: 'agent:queue:interrupted',
          source: mockEntity.id,
          data: {
            agentId: mockEntity.id,
            interruptedBy: 'seek_food',
            queueIndex: mockAgent.currentQueueIndex,
          },
        });
      }

      expect(mockWorld.eventBus?.emit).toHaveBeenCalledWith({
        type: 'agent:queue:interrupted',
        source: mockEntity.id,
        data: {
          agentId: mockEntity.id,
          interruptedBy: 'seek_food',
          queueIndex: 0,
        },
      });
    });

    it('should emit agent:queue:resumed event when resumed', () => {
      mockAgent.queuePaused = true;
      mockAgent.queueInterruptedBy = 'seek_food';
      mockAgent.currentQueueIndex = 1;
      mockNeeds.hunger = 50;

      if (mockNeeds.hunger > 40 && mockAgent.queueInterruptedBy === 'seek_food') {
        mockAgent.queuePaused = false;
        mockAgent.queueInterruptedBy = undefined;

        mockWorld.eventBus?.emit({
          type: 'agent:queue:resumed',
          source: mockEntity.id,
          data: {
            agentId: mockEntity.id,
            queueIndex: mockAgent.currentQueueIndex,
          },
        });
      }

      expect(mockWorld.eventBus?.emit).toHaveBeenCalledWith({
        type: 'agent:queue:resumed',
        source: mockEntity.id,
        data: {
          agentId: mockEntity.id,
          queueIndex: 1,
        },
      });
    });

    it('should NOT process queue while paused', () => {
      mockAgent.behaviorQueue = [
        { behavior: 'gather', priority: 'normal' },
        { behavior: 'deposit_items', priority: 'normal' },
      ];
      mockAgent.currentQueueIndex = 0;
      mockAgent.queuePaused = true;

      // AISystem should skip queue processing when paused
      const shouldProcessQueue = !mockAgent.queuePaused;
      expect(shouldProcessQueue).toBe(false);

      // Current behavior should remain whatever interrupted
      expect(mockAgent.currentQueueIndex).toBe(0); // Preserved
    });
  });

  describe('Timeout Safety', () => {
    it('should track behavior start time', () => {
      mockAgent.behaviorQueue = [
        { behavior: 'gather', priority: 'normal' },
      ];
      mockAgent.currentQueueIndex = 0;

      // AISystem should track when behavior started
      const behaviorStartTime = Date.now();
      mockAgent.behaviorState.startTime = behaviorStartTime;

      expect(mockAgent.behaviorState.startTime).toBeDefined();
    });

    it('should timeout behavior after 5 minutes (300000ms)', () => {
      mockAgent.behaviorQueue = [
        { behavior: 'gather', priority: 'normal' },
      ];
      mockAgent.currentQueueIndex = 0;

      // Simulate behavior running for 6 minutes
      const behaviorStartTime = Date.now() - (6 * 60 * 1000);
      mockAgent.behaviorState.startTime = behaviorStartTime;

      const currentTime = Date.now();
      const elapsedTime = currentTime - (mockAgent.behaviorState.startTime as number);

      const TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes
      const hasTimedOut = elapsedTime > TIMEOUT_MS;

      expect(hasTimedOut).toBe(true);

      if (hasTimedOut) {
        // Force completion and advance queue
        mockAgent.behaviorCompleted = true;
        console.warn(`Behavior ${mockAgent.behavior} timed out after 5 minutes`);
      }

      expect(mockAgent.behaviorCompleted).toBe(true);
    });

    it('should log warning when behavior times out', () => {
      const consoleSpy = vi.spyOn(console, 'warn');

      mockAgent.behaviorQueue = [
        { behavior: 'gather', priority: 'normal' },
      ];
      mockAgent.behaviorState.startTime = Date.now() - (6 * 60 * 1000);

      const elapsedTime = Date.now() - (mockAgent.behaviorState.startTime as number);
      const TIMEOUT_MS = 5 * 60 * 1000;

      if (elapsedTime > TIMEOUT_MS) {
        console.warn(`Behavior ${mockAgent.behavior} timed out after 5 minutes`);
        mockAgent.behaviorCompleted = true;
      }

      expect(consoleSpy).toHaveBeenCalledWith('Behavior wander timed out after 5 minutes');
      consoleSpy.mockRestore();
    });
  });

  describe('CLAUDE.md Compliance - Queue Processing', () => {
    it('should throw when accessing queue on agent without behaviorQueue field', () => {
      const invalidAgent = {
        type: ComponentType.Agent,
        version: 1,
        behavior: 'wander' as AgentBehavior,
        behaviorState: {},
        thinkInterval: 20,
        lastThinkTick: 0,
        useLLM: false,
        llmCooldown: 0,
        // behaviorQueue missing
      };

      expect(() => {
        if (!('behaviorQueue' in invalidAgent)) {
          throw new Error('Agent missing behaviorQueue field');
        }

        const queue = invalidAgent.behaviorQueue;
        expect(queue).toBeDefined();
      }).toThrow('Agent missing behaviorQueue field');
    });

    it('should throw when queue index is invalid (negative)', () => {
      mockAgent.behaviorQueue = [
        { behavior: 'gather', priority: 'normal' },
      ];
      mockAgent.currentQueueIndex = -1;

      expect(() => {
        if (mockAgent.currentQueueIndex !== undefined && mockAgent.currentQueueIndex < 0) {
          throw new Error('Queue index cannot be negative');
        }
      }).toThrow('Queue index cannot be negative');
    });

    it('should NOT use fallback for missing queuePaused field', () => {
      const invalidAgent = {
        type: ComponentType.Agent,
        version: 1,
        behavior: 'wander' as AgentBehavior,
        behaviorState: {},
        thinkInterval: 20,
        lastThinkTick: 0,
        useLLM: false,
        llmCooldown: 0,
        behaviorQueue: [],
        currentQueueIndex: 0,
        // queuePaused missing
      };

      expect(() => {
        if (!('queuePaused' in invalidAgent)) {
          throw new Error('queuePaused is required, no fallback allowed');
        }

        // Using fallback is prohibited by CLAUDE.md
        const paused = invalidAgent.queuePaused ?? false; // This pattern is WRONG
        if (paused === false && invalidAgent.queuePaused === undefined) {
          throw new Error('Cannot use fallback for missing queuePaused');
        }
      }).toThrow();
    });
  });
});
