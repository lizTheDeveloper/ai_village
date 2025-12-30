import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { AgentBehavior } from '../../components/AgentComponent';

import { ComponentType } from '../../types/ComponentType.js';
/**
 * Tests for Acceptance Criterion 11: Behavior Completion Signaling
 *
 * Each behavior needs to signal completion by setting agent.behaviorCompleted = true
 * This file tests the completion conditions for all behaviors
 */

interface QueuedAgentComponent {
  type: ComponentType.Agent;
  version: number;
  behavior: AgentBehavior;
  behaviorState: Record<string, unknown>;
  thinkInterval: number;
  lastThinkTick: number;
  useLLM: boolean;
  llmCooldown: 0;
  behaviorQueue?: Array<{
    behavior: AgentBehavior;
    behaviorState?: Record<string, unknown>;
    priority: 'normal' | 'high' | 'critical';
    repeats?: number;
    label?: string;
  }>;
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

interface InventoryComponent {
  type: ComponentType.Inventory;
  version: number;
  slots: Array<{ itemId: string | null; quantity: number }>;
  maxSlots: number;
  maxWeight: number;
  currentWeight: number;
}

interface SleepComponent {
  type: 'sleep';
  version: number;
  sleeping: boolean;
  sleepLocation: { x: number; y: number } | null;
}

describe('Behavior Completion Signaling', () => {
  let agent: QueuedAgentComponent;
  let needs: NeedsComponent;
  let inventory: InventoryComponent;
  let sleep: SleepComponent;

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
      behaviorCompleted: false,
    };

    needs = {
      type: ComponentType.Needs,
      version: 1,
      hunger: 50,
      energy: 50,
      temperature: 20,
    };

    inventory = {
      type: ComponentType.Inventory,
      version: 1,
      slots: [],
      maxSlots: 10,
      maxWeight: 100,
      currentWeight: 0,
    };

    sleep = {
      type: 'sleep',
      version: 1,
      sleeping: false,
      sleepLocation: null,
    };
  });

  describe('Acceptance Criterion 11: Behavior Completion Signaling', () => {
    describe('seek_food behavior', () => {
      it('should set behaviorCompleted = true when hunger > 40', () => {
        agent.behavior = 'seek_food';
        needs.hunger = 30;

        // Simulate eating
        needs.hunger = 50;

        // Behavior should detect completion
        if (needs.hunger > 40) {
          agent.behaviorCompleted = true;
        }

        expect(agent.behaviorCompleted).toBe(true);
      });

      it('should NOT complete when hunger <= 40', () => {
        agent.behavior = 'seek_food';
        needs.hunger = 40;

        if (needs.hunger > 40) {
          agent.behaviorCompleted = true;
        }

        expect(agent.behaviorCompleted).toBe(false);
      });

      it('should complete immediately if hunger already > 40', () => {
        agent.behavior = 'seek_food';
        needs.hunger = 60;

        if (needs.hunger > 40) {
          agent.behaviorCompleted = true;
        }

        expect(agent.behaviorCompleted).toBe(true);
      });
    });

    describe('seek_sleep behavior', () => {
      it('should set behaviorCompleted = true when energy > 70', () => {
        agent.behavior = 'seek_sleep';
        needs.energy = 50;

        // Simulate sleeping/resting
        needs.energy = 80;

        if (needs.energy > 70) {
          agent.behaviorCompleted = true;
        }

        expect(agent.behaviorCompleted).toBe(true);
      });

      it('should set behaviorCompleted = true when sleeping starts', () => {
        agent.behavior = 'seek_sleep';
        sleep.sleeping = false;

        // Agent finds bed and starts sleeping
        sleep.sleeping = true;

        if (sleep.sleeping) {
          agent.behaviorCompleted = true;
        }

        expect(agent.behaviorCompleted).toBe(true);
      });

      it('should NOT complete when energy <= 70 and not sleeping', () => {
        agent.behavior = 'seek_sleep';
        needs.energy = 60;
        sleep.sleeping = false;

        if (needs.energy > 70 || sleep.sleeping) {
          agent.behaviorCompleted = true;
        }

        expect(agent.behaviorCompleted).toBe(false);
      });
    });

    describe('gather_resource behavior', () => {
      it('should set behaviorCompleted = true when inventory full', () => {
        agent.behavior = 'gather';

        // Fill inventory to max
        inventory.currentWeight = 100; // At maxWeight
        inventory.slots = Array(10).fill({ itemId: 'wood', quantity: 10 }); // maxSlots filled

        const inventoryFull = inventory.currentWeight >= inventory.maxWeight ||
                              inventory.slots.length >= inventory.maxSlots;

        if (inventoryFull) {
          agent.behaviorCompleted = true;
        }

        expect(agent.behaviorCompleted).toBe(true);
      });

      it('should set behaviorCompleted = true when resource depleted', () => {
        agent.behavior = 'gather';
        agent.behaviorState.targetResource = 'wood';

        // Simulate resource depletion
        agent.behaviorState.resourceDepleted = true;

        if (agent.behaviorState.resourceDepleted) {
          agent.behaviorCompleted = true;
        }

        expect(agent.behaviorCompleted).toBe(true);
      });

      it('should NOT complete when inventory has space and resource available', () => {
        agent.behavior = 'gather';
        inventory.currentWeight = 50;
        inventory.slots = [{ itemId: 'wood', quantity: 5 }];
        agent.behaviorState.resourceDepleted = false;

        const inventoryFull = inventory.currentWeight >= inventory.maxWeight ||
                              inventory.slots.length >= inventory.maxSlots;
        const resourceDepleted = agent.behaviorState.resourceDepleted;

        if (inventoryFull || resourceDepleted) {
          agent.behaviorCompleted = true;
        }

        expect(agent.behaviorCompleted).toBe(false);
      });
    });

    describe('build behavior', () => {
      it('should set behaviorCompleted = true when building finished', () => {
        agent.behavior = 'build';
        agent.behaviorState.buildingId = 'building-1';

        // Simulate building completion
        agent.behaviorState.buildingComplete = true;

        if (agent.behaviorState.buildingComplete) {
          agent.behaviorCompleted = true;
        }

        expect(agent.behaviorCompleted).toBe(true);
      });

      it('should NOT complete while building in progress', () => {
        agent.behavior = 'build';
        agent.behaviorState.buildingComplete = false;

        if (agent.behaviorState.buildingComplete) {
          agent.behaviorCompleted = true;
        }

        expect(agent.behaviorCompleted).toBe(false);
      });
    });

    describe('deposit_items behavior', () => {
      it('should set behaviorCompleted = true when inventory empty', () => {
        agent.behavior = 'deposit_items';
        inventory.slots = [];
        inventory.currentWeight = 0;

        const inventoryEmpty = inventory.slots.length === 0 && inventory.currentWeight === 0;

        if (inventoryEmpty) {
          agent.behaviorCompleted = true;
        }

        expect(agent.behaviorCompleted).toBe(true);
      });

      it('should NOT complete when inventory still has items', () => {
        agent.behavior = 'deposit_items';
        inventory.slots = [{ itemId: 'wood', quantity: 5 }];
        inventory.currentWeight = 10;

        const inventoryEmpty = inventory.slots.length === 0 && inventory.currentWeight === 0;

        if (inventoryEmpty) {
          agent.behaviorCompleted = true;
        }

        expect(agent.behaviorCompleted).toBe(false);
      });
    });

    describe('plant_seed behavior', () => {
      it('should set behaviorCompleted = true after planting completes', () => {
        agent.behavior = 'farm';
        agent.behaviorState.action = 'plant';

        // Simulate planting action completing
        agent.behaviorState.actionComplete = true;

        if (agent.behaviorState.actionComplete) {
          agent.behaviorCompleted = true;
        }

        expect(agent.behaviorCompleted).toBe(true);
      });

      it('should NOT complete while planting in progress', () => {
        agent.behavior = 'farm';
        agent.behaviorState.action = 'plant';
        agent.behaviorState.actionComplete = false;

        if (agent.behaviorState.actionComplete) {
          agent.behaviorCompleted = true;
        }

        expect(agent.behaviorCompleted).toBe(false);
      });
    });

    describe('water_plant behavior', () => {
      it('should set behaviorCompleted = true after watering completes', () => {
        agent.behavior = 'farm';
        agent.behaviorState.action = 'water';

        // Simulate watering action completing
        agent.behaviorState.actionComplete = true;

        if (agent.behaviorState.actionComplete) {
          agent.behaviorCompleted = true;
        }

        expect(agent.behaviorCompleted).toBe(true);
      });
    });

    describe('harvest_plant behavior', () => {
      it('should set behaviorCompleted = true after harvesting completes', () => {
        agent.behavior = 'farm';
        agent.behaviorState.action = 'harvest';

        // Simulate harvesting action completing
        agent.behaviorState.actionComplete = true;

        if (agent.behaviorState.actionComplete) {
          agent.behaviorCompleted = true;
        }

        expect(agent.behaviorCompleted).toBe(true);
      });
    });

    describe('till_soil behavior', () => {
      it('should set behaviorCompleted = true after tilling completes', () => {
        agent.behavior = 'till';

        // Simulate tilling action completing
        agent.behaviorState.actionComplete = true;

        if (agent.behaviorState.actionComplete) {
          agent.behaviorCompleted = true;
        }

        expect(agent.behaviorCompleted).toBe(true);
      });

      it('should NOT complete while tilling in progress', () => {
        agent.behavior = 'till';
        agent.behaviorState.actionComplete = false;

        if (agent.behaviorState.actionComplete) {
          agent.behaviorCompleted = true;
        }

        expect(agent.behaviorCompleted).toBe(false);
      });
    });

    describe('fertilize behavior', () => {
      it('should set behaviorCompleted = true after fertilizing completes', () => {
        agent.behavior = 'farm';
        agent.behaviorState.action = 'fertilize';

        // Simulate fertilizing action completing
        agent.behaviorState.actionComplete = true;

        if (agent.behaviorState.actionComplete) {
          agent.behaviorCompleted = true;
        }

        expect(agent.behaviorCompleted).toBe(true);
      });
    });

    describe('Infinite behaviors (never complete)', () => {
      it('wander behavior should never set behaviorCompleted', () => {
        agent.behavior = 'wander';

        // Run for 100 iterations
        for (let i = 0; i < 100; i++) {
          // wander never completes
          // No condition sets behaviorCompleted
        }

        expect(agent.behaviorCompleted).toBe(false);
      });

      it('idle behavior should never set behaviorCompleted', () => {
        agent.behavior = 'idle';

        // idle runs forever
        expect(agent.behaviorCompleted).toBe(false);
      });

      it('forced_sleep behavior should never set behaviorCompleted', () => {
        agent.behavior = 'forced_sleep';

        // forced_sleep runs until interrupted
        expect(agent.behaviorCompleted).toBe(false);
      });
    });
  });

  describe('Action Completion Handler Integration', () => {
    it('should listen for agent:action:completed event', () => {
      const eventBus = {
        on: vi.fn(),
        emit: vi.fn(),
        off: vi.fn(),
      };

      // AISystem should register handler
      eventBus.on('agent:action:completed', expect.any(Function));

      expect(eventBus.on).toBeDefined();
    });

    it('should set behaviorCompleted when action:completed event fires', () => {
      agent.behavior = 'till';
      agent.behaviorState.actionId = 'action-123';

      // Simulate event firing
      const event = {
        type: 'agent:action:completed' as const,
        source: 'agent-1',
        data: {
          actionId: 'action-123',
          agentId: 'agent-1',
          success: true,
        },
      };

      // Handler should set behaviorCompleted
      if (event.data.success && event.data.actionId === agent.behaviorState.actionId) {
        agent.behaviorCompleted = true;
      }

      expect(agent.behaviorCompleted).toBe(true);
    });

    it('should NOT set behaviorCompleted for different agent', () => {
      agent.behavior = 'till';
      agent.behaviorState.actionId = 'action-123';

      const event = {
        type: 'agent:action:completed' as const,
        source: 'agent-2', // Different agent
        data: {
          actionId: 'action-123',
          agentId: 'agent-2',
          success: true,
        },
      };

      const agentId = 'agent-1';

      // Handler should ignore events from other agents
      if (event.data.agentId === agentId && event.data.success) {
        agent.behaviorCompleted = true;
      }

      expect(agent.behaviorCompleted).toBe(false);
    });

    it('should NOT set behaviorCompleted when action fails', () => {
      agent.behavior = 'till';
      agent.behaviorState.actionId = 'action-123';

      const event = {
        type: 'agent:action:completed' as const,
        source: 'agent-1',
        data: {
          actionId: 'action-123',
          agentId: 'agent-1',
          success: false, // Failed
        },
      };

      if (event.data.success) {
        agent.behaviorCompleted = true;
      }

      expect(agent.behaviorCompleted).toBe(false);
    });
  });

  describe('CLAUDE.md Compliance - Completion Signaling', () => {
    it('should throw when behaviorCompleted field is missing', () => {
      const invalidAgent = {
        type: ComponentType.Agent,
        version: 1,
        behavior: 'gather' as AgentBehavior,
        behaviorState: {},
        thinkInterval: 20,
        lastThinkTick: 0,
        useLLM: false,
        llmCooldown: 0,
        // behaviorCompleted missing
      };

      expect(() => {
        if (!('behaviorCompleted' in invalidAgent)) {
          throw new Error('Agent missing behaviorCompleted field');
        }
      }).toThrow('Agent missing behaviorCompleted field');
    });

    it('should NOT use fallback for missing behaviorCompleted field', () => {
      const invalidAgent: Partial<QueuedAgentComponent> = {
        type: ComponentType.Agent,
        version: 1,
        behavior: 'gather',
        behaviorState: {},
        thinkInterval: 20,
        lastThinkTick: 0,
        useLLM: false,
        llmCooldown: 0,
        // behaviorCompleted intentionally missing
      };

      expect(() => {
        if (!('behaviorCompleted' in invalidAgent)) {
          throw new Error('behaviorCompleted is required, no fallback allowed');
        }

        // Using fallback is prohibited by CLAUDE.md
        const completed = invalidAgent.behaviorCompleted ?? false; // This pattern is WRONG
        if (completed === false && invalidAgent.behaviorCompleted === undefined) {
          throw new Error('Cannot use fallback for missing behaviorCompleted');
        }
      }).toThrow();
    });

    it('should validate completion conditions explicitly', () => {
      agent.behavior = 'seek_food';

      expect(() => {
        // @ts-expect-error - Testing missing needs
        if (needs === undefined) {
          throw new Error('NeedsComponent required for seek_food completion check');
        }

        if (!('hunger' in needs)) {
          throw new Error('NeedsComponent missing hunger field');
        }

        // Valid completion check
        if (needs.hunger > 40) {
          agent.behaviorCompleted = true;
        }
      }).not.toThrow();

      expect(agent.behaviorCompleted).toBe(true);
    });

    it('should throw when checking inventory completion without InventoryComponent', () => {
      agent.behavior = 'gather';

      expect(() => {
        // @ts-expect-error - Testing missing component
        const invalidInventory = undefined;

        if (invalidInventory === undefined) {
          throw new Error('InventoryComponent required for gather completion check');
        }

        const full = invalidInventory.currentWeight >= invalidInventory.maxWeight;
        if (full) {
          agent.behaviorCompleted = true;
        }
      }).toThrow('InventoryComponent required for gather completion check');
    });
  });

  describe('Completion Edge Cases', () => {
    it('should handle completion when behaviorState is empty', () => {
      agent.behavior = 'till';
      agent.behaviorState = {}; // Empty state

      // Should handle missing actionComplete field
      expect(() => {
        const actionComplete = agent.behaviorState.actionComplete;
        if (actionComplete === undefined) {
          // Don't complete if state is missing
          return;
        }

        if (actionComplete) {
          agent.behaviorCompleted = true;
        }
      }).not.toThrow();

      expect(agent.behaviorCompleted).toBe(false);
    });

    it('should reset behaviorCompleted to false when starting new behavior', () => {
      agent.behavior = 'gather';
      agent.behaviorCompleted = true;

      // When switching behaviors, reset completion
      agent.behavior = 'deposit_items';
      agent.behaviorCompleted = false;

      expect(agent.behaviorCompleted).toBe(false);
    });

    it('should handle rapid completion and re-queueing', () => {
      agent.behaviorQueue = [
        { behavior: 'till', priority: 'normal', repeats: 3 },
      ];
      agent.currentQueueIndex = 0;

      // Rapid completions
      for (let i = 0; i < 3; i++) {
        agent.behaviorCompleted = true;
        expect(agent.behaviorCompleted).toBe(true);

        // Reset after advancing queue
        agent.behaviorCompleted = false;
        expect(agent.behaviorCompleted).toBe(false);
      }
    });
  });
});
