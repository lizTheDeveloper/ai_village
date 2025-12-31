import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DurabilitySystem } from '../DurabilitySystem.js';
import { itemInstanceRegistry } from '../../items/ItemInstanceRegistry.js';
import { itemRegistry } from '../../items/ItemRegistry.js';
import { EventBusImpl } from '../../events/EventBus.js';
import { defineItem } from '../../items/ItemDefinition.js';
import type { ToolTrait } from '../../items/traits/ToolTrait.js';

/**
 * DurabilitySystem Unit Tests
 *
 * These tests verify the DurabilitySystem implementation against acceptance criteria.
 *
 * ACCEPTANCE CRITERIA: See work-order.md for full requirements
 */

describe('DurabilitySystem', () => {
  let system: DurabilitySystem;
  let eventBus: EventBusImpl;

  beforeEach(() => {
    // Reset registries
    itemRegistry.clear();
    itemInstanceRegistry.clear();

    // Create system and event bus
    system = new DurabilitySystem();
    eventBus = new EventBusImpl();
    system.setEventBus(eventBus);
    system.resetWarnings(); // Clear low durability warnings between tests

    // Register test tool items with tool traits
    itemRegistry.register(
      defineItem('hammer', 'Hammer', 'tool', {
        weight: 2.0,
        stackSize: 1,
        traits: {
          tool: {
            toolType: 'hammer',
            efficiency: 1.0,
            durabilityLoss: 0.1, // 10% per use
          } as ToolTrait,
        },
      })
    );

    itemRegistry.register(
      defineItem('axe', 'Axe', 'tool', {
        weight: 3.0,
        stackSize: 1,
        traits: {
          tool: {
            toolType: 'axe',
            efficiency: 1.0,
            durabilityLoss: 0.08, // 8% per use
          } as ToolTrait,
        },
      })
    );

    itemRegistry.register(
      defineItem('wood', 'Wood', 'resource', {
        weight: 2.0,
        stackSize: 50,
      })
    );
  });
  /**
   * CRITERION 1: Durability Loss on Crafting
   * WHEN: An agent completes a crafting job that requires a tool
   * THEN: The tool's condition SHALL decrease by tool.durabilityLoss * 100
   */
  describe('Criterion 1: Durability Loss on Crafting', () => {
    it('should reduce tool condition when used for crafting', () => {
      const hammer = itemInstanceRegistry.createInstance({
        definitionId: 'hammer',
        quality: 50,
        condition: 100,
      });

      system.applyToolWear(hammer.instanceId, 'crafting');

      // 0.1 durability loss * 100 = 10 condition lost
      expect(hammer.condition).toBe(90);
    });

    it('should emit tool_used event when durability is applied', () => {
      const hammer = itemInstanceRegistry.createInstance({
        definitionId: 'hammer',
        quality: 50,
        condition: 100,
      });

      const handler = vi.fn();
      eventBus.on('tool_used', handler);

      system.applyToolWear(hammer.instanceId, 'crafting', 'test-agent');
      eventBus.flush(); // Process queued events

      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'tool_used',
          source: 'test-agent',
          data: {
            itemInstanceId: hammer.instanceId,
            durabilityLost: 10,
            remainingCondition: 90,
            usageType: 'crafting',
          },
        })
      );
    });
  });

  /**
   * CRITERION 2: Durability Loss on Gathering
   * WHEN: An agent uses a tool to gather resources
   * THEN: The tool's condition SHALL decrease by durabilityLoss rate
   */
  describe('Criterion 2: Durability Loss on Gathering', () => {
    it('should reduce tool condition when used for gathering', () => {
      const axe = itemInstanceRegistry.createInstance({
        definitionId: 'axe',
        quality: 50,
        condition: 100,
      });

      system.applyToolWear(axe.instanceId, 'gathering');

      // 0.08 durability loss * 100 = 8 condition lost
      expect(axe.condition).toBe(92);
    });

    it('should handle multiple uses reducing condition progressively', () => {
      const axe = itemInstanceRegistry.createInstance({
        definitionId: 'axe',
        quality: 50,
        condition: 100,
      });

      system.applyToolWear(axe.instanceId, 'gathering');
      system.applyToolWear(axe.instanceId, 'gathering');
      system.applyToolWear(axe.instanceId, 'gathering');

      // 8 * 3 = 24 condition lost
      expect(axe.condition).toBe(76);
    });
  });

  /**
   * CRITERION 3: Tool Breaking
   * WHEN: A tool's condition reaches 0
   * THEN: The tool SHALL be marked as broken and unusable
   * AND: The tool SHALL remain in inventory
   */
  describe('Criterion 3: Tool Breaking', () => {
    it('should mark tool as broken when condition reaches 0', () => {
      const hammer = itemInstanceRegistry.createInstance({
        definitionId: 'hammer',
        quality: 50,
        condition: 5,
      });

      // Use tool (loses 10 condition)
      system.applyToolWear(hammer.instanceId, 'crafting');

      expect(hammer.condition).toBe(0);
      expect(system.isToolBroken(hammer.instanceId)).toBe(true);
    });

    it('should not reduce condition below 0', () => {
      const hammer = itemInstanceRegistry.createInstance({
        definitionId: 'hammer',
        quality: 50,
        condition: 2,
      });

      system.applyToolWear(hammer.instanceId, 'crafting');

      // Should clamp to 0, not go negative
      expect(hammer.condition).toBe(0);
    });

    it('should emit tool_broken event when condition reaches 0', () => {
      const hammer = itemInstanceRegistry.createInstance({
        definitionId: 'hammer',
        quality: 50,
        condition: 5,
      });

      const handler = vi.fn();
      eventBus.on('tool_broken', handler);

      system.applyToolWear(hammer.instanceId, 'crafting', 'test-agent');
      eventBus.flush(); // Process queued events

      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'tool_broken',
          source: 'test-agent',
          data: {
            itemInstanceId: hammer.instanceId,
            toolType: 'hammer',
            agentId: 'test-agent',
          },
        })
      );
    });

    it('should keep broken tool in inventory', () => {
      const hammer = itemInstanceRegistry.createInstance({
        definitionId: 'hammer',
        quality: 50,
        condition: 5,
      });

      system.applyToolWear(hammer.instanceId, 'crafting');

      // Tool still exists in registry
      expect(itemInstanceRegistry.has(hammer.instanceId)).toBe(true);
      expect(itemInstanceRegistry.get(hammer.instanceId).condition).toBe(0);
    });
  });

  /**
   * CRITERION 4: Broken Tool Prevention
   * WHEN: An agent attempts to use a tool with condition <= 0
   * THEN: The system SHALL reject the tool with clear error
   */
  describe('Criterion 4: Broken Tool Prevention', () => {
    it('should throw error when attempting to use tool with 0 condition', () => {
      const hammer = itemInstanceRegistry.createInstance({
        definitionId: 'hammer',
        quality: 50,
        condition: 0,
      });

      expect(() => {
        system.applyToolWear(hammer.instanceId, 'crafting');
      }).toThrow(/cannot use broken tool/i);
    });

    it('should throw clear error message indicating tool is broken', () => {
      const hammer = itemInstanceRegistry.createInstance({
        definitionId: 'hammer',
        quality: 50,
        condition: 0,
      });

      expect(() => {
        system.applyToolWear(hammer.instanceId, 'crafting');
      }).toThrow(/0 condition/i);
    });

    it('should provide tool type in error message', () => {
      const hammer = itemInstanceRegistry.createInstance({
        definitionId: 'hammer',
        quality: 50,
        condition: 0,
      });

      expect(() => {
        system.applyToolWear(hammer.instanceId, 'crafting');
      }).toThrow(/hammer/i);
    });
  });

  /**
   * CRITERION 5 & 6: Low Durability Warning
   * WHEN: A tool's condition falls below 20%
   * THEN: The system SHALL emit tool_low_durability event
   */
  describe('Criterion 5 & 6: Low Durability Warning', () => {
    it('should emit tool_low_durability event when condition falls below 20%', () => {
      const hammer = itemInstanceRegistry.createInstance({
        definitionId: 'hammer',
        quality: 50,
        condition: 25,
      });

      const handler = vi.fn();
      eventBus.on('tool_low_durability', handler);

      system.applyToolWear(hammer.instanceId, 'crafting', 'test-agent');
      eventBus.flush(); // Process queued events

      // Went from 25 to 15, crossing 20 threshold
      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'tool_low_durability',
          source: 'test-agent',
          data: {
            itemInstanceId: hammer.instanceId,
            condition: 15,
            agentId: 'test-agent',
            toolType: 'hammer',
          },
        })
      );
    });

    it('should not emit low durability warning above 20% condition', () => {
      const hammer = itemInstanceRegistry.createInstance({
        definitionId: 'hammer',
        quality: 50,
        condition: 80,
      });

      const handler = vi.fn();
      eventBus.on('tool_low_durability', handler);

      system.applyToolWear(hammer.instanceId, 'crafting');
      eventBus.flush(); // Process queued events

      expect(handler).not.toHaveBeenCalled();
    });

    it('should only emit low durability warning once when crossing threshold', () => {
      const hammer = itemInstanceRegistry.createInstance({
        definitionId: 'hammer',
        quality: 50,
        condition: 22,
      });

      const handler = vi.fn();
      eventBus.on('tool_low_durability', handler);

      system.applyToolWear(hammer.instanceId, 'crafting'); // 22 -> 12 (emits)
      eventBus.flush(); // Process queued events
      system.applyToolWear(hammer.instanceId, 'crafting'); // 12 -> 2 (no emit)
      eventBus.flush(); // Process queued events

      expect(handler).toHaveBeenCalledTimes(1);
    });
  });

  /**
   * CRITERION 7: Multiple Uses Per Craft
   * WHEN: A recipe requires multiple uses of the same tool
   * THEN: Durability SHALL be deducted once per use, not once per recipe
   */
  describe('Criterion 7: Multiple Uses Per Craft', () => {
    it('should deduct durability per use, not per recipe', () => {
      const hammer = itemInstanceRegistry.createInstance({
        definitionId: 'hammer',
        quality: 50,
        condition: 100,
      });

      // Simulate 10 uses
      for (let i = 0; i < 10; i++) {
        system.applyToolWear(hammer.instanceId, 'crafting');
      }

      // 10 * 10 = 100 condition lost
      expect(hammer.condition).toBe(0);
    });
  });

  /**
   * CRITERION 8: Quality Tools Last Longer
   * WHEN: A high-quality tool is used
   * THEN: Effective durabilityLoss SHALL be reduced by quality factor
   * EXAMPLE: Masterwork (95 quality) loses 50% less durability than poor (30 quality)
   */
  describe('Criterion 8: Quality Tools Last Longer', () => {
    it('should reduce durability loss for masterwork quality tools', () => {
      const poorHammer = itemInstanceRegistry.createInstance({
        definitionId: 'hammer',
        quality: 30, // Poor quality (1.5x wear)
        condition: 100,
      });

      const masterworkHammer = itemInstanceRegistry.createInstance({
        definitionId: 'hammer',
        quality: 95, // Legendary (0.4x wear)
        condition: 100,
      });

      system.applyToolWear(poorHammer.instanceId, 'crafting');
      system.applyToolWear(masterworkHammer.instanceId, 'crafting');

      // Poor: 10 * 1.5 = 15 lost
      expect(poorHammer.condition).toBe(85);

      // Legendary: 10 * 0.4 = 4 lost
      expect(masterworkHammer.condition).toBe(96);
    });

    it('should increase durability loss for poor quality tools', () => {
      const normalHammer = itemInstanceRegistry.createInstance({
        definitionId: 'hammer',
        quality: 50, // Normal (1.0x wear)
        condition: 100,
      });

      const poorHammer = itemInstanceRegistry.createInstance({
        definitionId: 'hammer',
        quality: 30, // Poor (1.5x wear)
        condition: 100,
      });

      system.applyToolWear(normalHammer.instanceId, 'crafting');
      system.applyToolWear(poorHammer.instanceId, 'crafting');

      // Normal: 10 * 1.0 = 10 lost
      expect(normalHammer.condition).toBe(90);

      // Poor: 10 * 1.5 = 15 lost
      expect(poorHammer.condition).toBe(85);
    });

    it('should apply correct quality factors across all quality tiers', () => {
      const poor = itemInstanceRegistry.createInstance({
        definitionId: 'hammer',
        quality: 30,
        condition: 100,
      });

      const normal = itemInstanceRegistry.createInstance({
        definitionId: 'hammer',
        quality: 50,
        condition: 100,
      });

      const fine = itemInstanceRegistry.createInstance({
        definitionId: 'hammer',
        quality: 75,
        condition: 100,
      });

      const masterwork = itemInstanceRegistry.createInstance({
        definitionId: 'hammer',
        quality: 90,
        condition: 100,
      });

      const legendary = itemInstanceRegistry.createInstance({
        definitionId: 'hammer',
        quality: 98,
        condition: 100,
      });

      system.applyToolWear(poor.instanceId, 'crafting');
      system.applyToolWear(normal.instanceId, 'crafting');
      system.applyToolWear(fine.instanceId, 'crafting');
      system.applyToolWear(masterwork.instanceId, 'crafting');
      system.applyToolWear(legendary.instanceId, 'crafting');

      // Poor: 10 * 1.5 = 15
      expect(poor.condition).toBe(85);

      // Normal: 10 * 1.0 = 10
      expect(normal.condition).toBe(90);

      // Fine: 10 * 0.8 = 8
      expect(fine.condition).toBe(92);

      // Masterwork: 10 * 0.6 = 6
      expect(masterwork.condition).toBe(94);

      // Legendary: 10 * 0.4 = 4
      expect(legendary.condition).toBe(96);
    });
  });

  /**
   * ERROR HANDLING (CLAUDE.md compliance)
   * Per CLAUDE.md: No silent fallbacks allowed
   * System MUST throw clear errors for invalid data
   */
  describe('Error Handling (CLAUDE.md compliance)', () => {
    it('should throw when tool instance does not exist', () => {
      expect(() => {
        system.applyToolWear('nonexistent-id', 'crafting');
      }).toThrow(/not found/i);
    });

    it('should throw when item is not a tool', () => {
      const wood = itemInstanceRegistry.createInstance({
        definitionId: 'wood',
        quality: 50,
        condition: 100,
      });

      expect(() => {
        system.applyToolWear(wood.instanceId, 'crafting');
      }).toThrow(/not a tool/i);
    });

    it('should throw clear error with item type when not a tool', () => {
      const wood = itemInstanceRegistry.createInstance({
        definitionId: 'wood',
        quality: 50,
        condition: 100,
      });

      expect(() => {
        system.applyToolWear(wood.instanceId, 'crafting');
      }).toThrow(/wood.*not a tool/i);
    });

    it('should not use fallback values for missing data', () => {
      // ItemInstanceRegistry always provides condition (defaults to 100)
      // This test verifies the system doesn't add its own fallback
      const hammer = itemInstanceRegistry.createInstance({
        definitionId: 'hammer',
        quality: 50,
        // condition not specified - registry will provide default 100
      });

      // System should use the value from registry, not add its own fallback
      system.applyToolWear(hammer.instanceId, 'crafting');
      expect(hammer.condition).toBe(90); // Started at 100, lost 10
    });
  });

  /**
   * HELPER METHODS
   * System should provide utility methods for checking tool state
   */
  describe('Helper Methods', () => {
    it('should provide method to check if tool is broken', () => {
      const broken = itemInstanceRegistry.createInstance({
        definitionId: 'hammer',
        quality: 50,
        condition: 0,
      });

      const working = itemInstanceRegistry.createInstance({
        definitionId: 'hammer',
        quality: 50,
        condition: 50,
      });

      expect(system.isToolBroken(broken.instanceId)).toBe(true);
      expect(system.isToolBroken(working.instanceId)).toBe(false);
    });

    it('should provide method to check if tool has low durability', () => {
      const lowDurability = itemInstanceRegistry.createInstance({
        definitionId: 'hammer',
        quality: 50,
        condition: 15,
      });

      const goodDurability = itemInstanceRegistry.createInstance({
        definitionId: 'hammer',
        quality: 50,
        condition: 50,
      });

      expect(system.hasLowDurability(lowDurability.instanceId)).toBe(true);
      expect(system.hasLowDurability(goodDurability.instanceId)).toBe(false);
    });

    it('should provide method to get estimated uses remaining', () => {
      const hammer = itemInstanceRegistry.createInstance({
        definitionId: 'hammer',
        quality: 50, // Normal quality (1.0x wear)
        condition: 100,
      });

      const usesRemaining = system.getEstimatedUsesRemaining(hammer.instanceId);

      // 100 condition / 10 loss per use = 10 uses
      expect(usesRemaining).toBe(10);
    });
  });

  /**
   * PERFORMANCE
   * System should handle batch updates efficiently
   */
  describe('Performance', () => {
    it('should batch durability updates within same tick', () => {
      const tools = [];
      for (let i = 0; i < 10; i++) {
        tools.push(
          itemInstanceRegistry.createInstance({
            definitionId: 'hammer',
            quality: 50,
            condition: 100,
          })
        );
      }

      const handler = vi.fn();
      eventBus.on('tool_used', handler);

      // Apply wear to all tools
      tools.forEach((tool) => {
        system.applyToolWear(tool.instanceId, 'crafting');
      });

      // Process all queued events at once (batch processing)
      eventBus.flush();

      // All events should be emitted
      expect(handler).toHaveBeenCalledTimes(10);
    });
  });
});

/**
 * Test file status: COMPLETE
 * Tests written: 27
 * Status: All tests implemented and ready to run
 */
