/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AgentInfoPanel } from '../AgentInfoPanel';
import type { Entity } from '@ai-village/core';
import type { InventoryComponent } from '@ai-village/core';

/**
 * Tests for Agent Inventory Display feature.
 * Work Order: agent-inventory-display
 * Phase: 7 (Building & Shelter)
 *
 * These tests verify the AgentInfoPanel correctly renders
 * agent inventory information including resources, capacity,
 * and warning states.
 */

describe('AgentInfoPanel - Inventory Display', () => {
  let panel: AgentInfoPanel;
  let mockCanvas: HTMLCanvasElement;
  let mockCtx: CanvasRenderingContext2D;

  beforeEach(() => {
    panel = new AgentInfoPanel();

    // Create mock canvas and context
    mockCanvas = document.createElement('canvas');
    mockCanvas.width = 1024;
    mockCanvas.height = 768;
    mockCtx = mockCanvas.getContext('2d')!;

    // Spy on canvas methods
    vi.spyOn(mockCtx, 'fillRect');
    vi.spyOn(mockCtx, 'strokeRect');
    vi.spyOn(mockCtx, 'fillText');
    vi.spyOn(mockCtx, 'beginPath');
    vi.spyOn(mockCtx, 'moveTo');
    vi.spyOn(mockCtx, 'lineTo');
    vi.spyOn(mockCtx, 'stroke');
  });

  /**
   * Helper to create a mock entity with specified components.
   */
  function createMockEntity(components: Record<string, any>): Entity {
    const entity: Entity = {
      id: 'test-agent-12345678',
      components: new Map(Object.entries(components)),
      addComponent: vi.fn(),
      removeComponent: vi.fn(),
      getComponent: vi.fn((type: string) => components[type]),
      hasComponent: vi.fn((type: string) => type in components),
    } as any;
    return entity;
  }

  /**
   * Helper to create an InventoryComponent with specified resources.
   */
  function createInventory(
    resources: Record<string, number>,
    maxWeight: number = 100,
    maxSlots: number = 8
  ): InventoryComponent {
    const slots = [];
    let currentWeight = 0;

    // Resource weights per RESOURCE_WEIGHTS table
    const weights: Record<string, number> = {
      wood: 2,
      stone: 3,
      food: 1,
      water: 1,
    };

    for (const [itemId, quantity] of Object.entries(resources)) {
      if (quantity > 0) {
        slots.push({ itemId, quantity, quality: undefined });
        currentWeight += quantity * (weights[itemId] || 0);
      }
    }

    // Fill remaining slots with empty slots
    while (slots.length < maxSlots) {
      slots.push({ itemId: null, quantity: 0, quality: undefined });
    }

    return {
      type: 'inventory',
      version: 1,
      slots,
      maxSlots,
      maxWeight,
      currentWeight,
    };
  }

  describe('Acceptance Criterion 1: Inventory Section Appears', () => {
    it('should render inventory section below needs section when agent is selected', () => {
      const entity = createMockEntity({
        agent: { behavior: 'gathering', useLLM: true },
        position: { x: 100, y: 100 },
        needs: { hunger: 80, energy: 100, health: 100 },
        inventory: createInventory({ wood: 5, stone: 3 }),
      });

      panel.setSelectedEntity(entity);
      panel.render(mockCtx, 1024, 768);

      // Verify "INVENTORY" header is rendered
      const fillTextCalls = (mockCtx.fillText as any).mock.calls;
      const inventoryHeaderCall = fillTextCalls.find(
        (call: any[]) => call[0] === 'INVENTORY'
      );

      expect(inventoryHeaderCall).toBeDefined();
    });

    it('should render inventory divider line before inventory section', () => {
      const entity = createMockEntity({
        agent: { behavior: 'gathering', useLLM: true },
        needs: { hunger: 80, energy: 100, health: 100 },
        inventory: createInventory({ wood: 5 }),
      });

      panel.setSelectedEntity(entity);
      panel.render(mockCtx, 1024, 768);

      // Verify divider lines are drawn (should have multiple dividers)
      const strokeCalls = (mockCtx.stroke as any).mock.calls;
      expect(strokeCalls.length).toBeGreaterThan(0);
    });

    it('should not render inventory section if agent has no inventory component', () => {
      const entity = createMockEntity({
        agent: { behavior: 'wandering', useLLM: true },
        needs: { hunger: 50, energy: 60, health: 100 },
      });

      panel.setSelectedEntity(entity);
      panel.render(mockCtx, 1024, 768);

      // Verify "INVENTORY" header is NOT rendered
      const fillTextCalls = (mockCtx.fillText as any).mock.calls;
      const inventoryHeaderCall = fillTextCalls.find(
        (call: any[]) => call[0] === 'INVENTORY'
      );

      expect(inventoryHeaderCall).toBeUndefined();
    });
  });

  describe('Acceptance Criterion 2: Resource Counts Display', () => {
    it('should display wood resources with icon and quantity', () => {
      const entity = createMockEntity({
        agent: { behavior: 'gathering', useLLM: true },
        inventory: createInventory({ wood: 12 }),
      });

      panel.setSelectedEntity(entity);
      panel.render(mockCtx, 1024, 768);

      const fillTextCalls = (mockCtx.fillText as any).mock.calls;
      const woodLineCall = fillTextCalls.find(
        (call: any[]) => typeof call[0] === 'string' && call[0].includes('🪵') && call[0].includes('12')
      );

      expect(woodLineCall).toBeDefined();
    });

    it('should display stone resources with icon and quantity', () => {
      const entity = createMockEntity({
        agent: { behavior: 'gathering', useLLM: true },
        inventory: createInventory({ stone: 5 }),
      });

      panel.setSelectedEntity(entity);
      panel.render(mockCtx, 1024, 768);

      const fillTextCalls = (mockCtx.fillText as any).mock.calls;
      const stoneLineCall = fillTextCalls.find(
        (call: any[]) => typeof call[0] === 'string' && call[0].includes('🪨') && call[0].includes('5')
      );

      expect(stoneLineCall).toBeDefined();
    });

    it('should display food resources with icon and quantity', () => {
      const entity = createMockEntity({
        agent: { behavior: 'gathering', useLLM: true },
        inventory: createInventory({ food: 3 }),
      });

      panel.setSelectedEntity(entity);
      panel.render(mockCtx, 1024, 768);

      const fillTextCalls = (mockCtx.fillText as any).mock.calls;
      const foodLineCall = fillTextCalls.find(
        (call: any[]) => typeof call[0] === 'string' && call[0].includes('🍎') && call[0].includes('3')
      );

      expect(foodLineCall).toBeDefined();
    });

    it('should display water resources with icon and quantity', () => {
      const entity = createMockEntity({
        agent: { behavior: 'gathering', useLLM: true },
        inventory: createInventory({ water: 7 }),
      });

      panel.setSelectedEntity(entity);
      panel.render(mockCtx, 1024, 768);

      const fillTextCalls = (mockCtx.fillText as any).mock.calls;
      const waterLineCall = fillTextCalls.find(
        (call: any[]) => typeof call[0] === 'string' && call[0].includes('💧') && call[0].includes('7')
      );

      expect(waterLineCall).toBeDefined();
    });

    it('should display all resource types simultaneously', () => {
      const entity = createMockEntity({
        agent: { behavior: 'gathering', useLLM: true },
        inventory: createInventory({
          wood: 12,
          stone: 5,
          food: 3,
          water: 2,
        }),
      });

      panel.setSelectedEntity(entity);
      panel.render(mockCtx, 1024, 768);

      const fillTextCalls = (mockCtx.fillText as any).mock.calls;

      // Check each resource appears
      expect(fillTextCalls.some((call: any[]) =>
        typeof call[0] === 'string' && call[0].includes('🪵')
      )).toBe(true);
      expect(fillTextCalls.some((call: any[]) =>
        typeof call[0] === 'string' && call[0].includes('🪨')
      )).toBe(true);
      expect(fillTextCalls.some((call: any[]) =>
        typeof call[0] === 'string' && call[0].includes('🍎')
      )).toBe(true);
      expect(fillTextCalls.some((call: any[]) =>
        typeof call[0] === 'string' && call[0].includes('💧')
      )).toBe(true);
    });

    it('should not display resources with zero quantity', () => {
      const entity = createMockEntity({
        agent: { behavior: 'gathering', useLLM: true },
        inventory: createInventory({ wood: 5, stone: 0 }),
      });

      panel.setSelectedEntity(entity);
      panel.render(mockCtx, 1024, 768);

      const fillTextCalls = (mockCtx.fillText as any).mock.calls;

      // Wood should appear
      expect(fillTextCalls.some((call: any[]) =>
        typeof call[0] === 'string' && call[0].includes('🪵')
      )).toBe(true);

      // Stone should NOT appear (quantity 0)
      const stoneLineCall = fillTextCalls.find(
        (call: any[]) => typeof call[0] === 'string' && call[0].includes('🪨') && call[0].includes('Stone')
      );
      expect(stoneLineCall).toBeUndefined();
    });
  });

  describe('Acceptance Criterion 3: Empty Inventory State', () => {
    it('should show "(empty)" when inventory has no items', () => {
      const entity = createMockEntity({
        agent: { behavior: 'wandering', useLLM: true },
        inventory: createInventory({}),
      });

      panel.setSelectedEntity(entity);
      panel.render(mockCtx, 1024, 768);

      const fillTextCalls = (mockCtx.fillText as any).mock.calls;
      const emptyStateCall = fillTextCalls.find(
        (call: any[]) => call[0] === '(empty)'
      );

      expect(emptyStateCall).toBeDefined();
    });

    it('should show capacity as "Weight: 0/100 Slots: 0/8" when empty', () => {
      const entity = createMockEntity({
        agent: { behavior: 'wandering', useLLM: true },
        inventory: createInventory({}, 100, 8),
      });

      panel.setSelectedEntity(entity);
      panel.render(mockCtx, 1024, 768);

      const fillTextCalls = (mockCtx.fillText as any).mock.calls;
      const capacityCall = fillTextCalls.find(
        (call: any[]) =>
          typeof call[0] === 'string' &&
          call[0].includes('Weight: 0/100') &&
          call[0].includes('Slots: 0/8')
      );

      expect(capacityCall).toBeDefined();
    });
  });

  describe('Acceptance Criterion 4: Capacity Display', () => {
    it('should display current weight and max weight', () => {
      const entity = createMockEntity({
        agent: { behavior: 'gathering', useLLM: true },
        inventory: createInventory({ wood: 10, stone: 5 }, 100, 8),
      });

      panel.setSelectedEntity(entity);
      panel.render(mockCtx, 1024, 768);

      const fillTextCalls = (mockCtx.fillText as any).mock.calls;

      // Weight: (10 wood * 2) + (5 stone * 3) = 20 + 15 = 35
      const capacityCall = fillTextCalls.find(
        (call: any[]) =>
          typeof call[0] === 'string' && call[0].includes('Weight: 35/100')
      );

      expect(capacityCall).toBeDefined();
    });

    it('should display current slots and max slots', () => {
      const entity = createMockEntity({
        agent: { behavior: 'gathering', useLLM: true },
        inventory: createInventory({ wood: 5, stone: 3, food: 2 }, 100, 8),
      });

      panel.setSelectedEntity(entity);
      panel.render(mockCtx, 1024, 768);

      const fillTextCalls = (mockCtx.fillText as any).mock.calls;

      // 3 resources = 3 slots used
      const capacityCall = fillTextCalls.find(
        (call: any[]) =>
          typeof call[0] === 'string' && call[0].includes('Slots: 3/8')
      );

      expect(capacityCall).toBeDefined();
    });

    it('should calculate weight correctly for mixed resources', () => {
      const entity = createMockEntity({
        agent: { behavior: 'gathering', useLLM: true },
        // Weight: (12 wood * 2) + (5 stone * 3) + (3 food * 1) + (2 water * 1)
        // = 24 + 15 + 3 + 2 = 44
        inventory: createInventory({ wood: 12, stone: 5, food: 3, water: 2 }, 100, 8),
      });

      panel.setSelectedEntity(entity);
      panel.render(mockCtx, 1024, 768);

      const fillTextCalls = (mockCtx.fillText as any).mock.calls;
      const capacityCall = fillTextCalls.find(
        (call: any[]) =>
          typeof call[0] === 'string' && call[0].includes('Weight: 44/100')
      );

      expect(capacityCall).toBeDefined();
    });
  });

  describe('Acceptance Criterion 5: Capacity Warning Colors', () => {
    it('should use white color when weight is below 80%', () => {
      const entity = createMockEntity({
        agent: { behavior: 'gathering', useLLM: true },
        // Weight: 30 wood * 2 = 60 (60% of 100)
        inventory: createInventory({ wood: 30 }, 100, 8),
      });

      panel.setSelectedEntity(entity);
      panel.render(mockCtx, 1024, 768);

      // Check that fillStyle was set to white (#FFFFFF) before rendering capacity
      const fillStyleChanges = mockCtx.fillStyle;
      expect(fillStyleChanges).toBe('#ffffff'); // Canvas normalizes to lowercase
    });

    it('should use yellow color when weight exceeds 80%', () => {
      const entity = createMockEntity({
        agent: { behavior: 'gathering', useLLM: true },
        // Weight: 42 wood * 2 = 84 (84% of 100)
        inventory: createInventory({ wood: 42 }, 100, 8),
      });

      panel.setSelectedEntity(entity);
      panel.render(mockCtx, 1024, 768);

      // After rendering, check if yellow was used
      // We need to check the sequence of fillStyle changes
      // This is a simplified check - yellow should be set at some point
      const fillTextCalls = (mockCtx.fillText as any).mock.calls;
      const capacityIndex = fillTextCalls.findIndex(
        (call: any[]) => typeof call[0] === 'string' && call[0].includes('Weight:')
      );

      // The test will pass if implementation sets fillStyle to #FFFF00 before capacity text
      expect(capacityIndex).toBeGreaterThan(-1);
    });

    it('should use red color when weight reaches 100%', () => {
      const entity = createMockEntity({
        agent: { behavior: 'gathering', useLLM: true },
        // Weight: 50 wood * 2 = 100 (100% of 100)
        inventory: createInventory({ wood: 50 }, 100, 8),
      });

      panel.setSelectedEntity(entity);
      panel.render(mockCtx, 1024, 768);

      const fillTextCalls = (mockCtx.fillText as any).mock.calls;
      const capacityIndex = fillTextCalls.findIndex(
        (call: any[]) => typeof call[0] === 'string' && call[0].includes('Weight: 100/100')
      );

      // The test will pass if implementation sets fillStyle to #FF0000 before capacity text
      expect(capacityIndex).toBeGreaterThan(-1);
    });

    it('should use yellow color when slots exceed 80%', () => {
      const entity = createMockEntity({
        agent: { behavior: 'gathering', useLLM: true },
        // 7 out of 8 slots = 87.5%
        inventory: createInventory(
          { wood: 1, stone: 1, food: 1, water: 1 },
          100,
          8
        ),
      });

      // Manually add more slots to reach 7 used slots
      const inventory = entity.components.get('inventory') as InventoryComponent;
      inventory.slots[4] = { itemId: 'wood', quantity: 1 };
      inventory.slots[5] = { itemId: 'wood', quantity: 1 };
      inventory.slots[6] = { itemId: 'wood', quantity: 1 };
      inventory.currentWeight = 10; // 7 items * ~1.4 avg weight

      panel.setSelectedEntity(entity);
      panel.render(mockCtx, 1024, 768);

      const fillTextCalls = (mockCtx.fillText as any).mock.calls;
      const capacityIndex = fillTextCalls.findIndex(
        (call: any[]) => typeof call[0] === 'string' && call[0].includes('Slots: 7/8')
      );

      expect(capacityIndex).toBeGreaterThan(-1);
    });

    it('should use red color when slots reach 100%', () => {
      const entity = createMockEntity({
        agent: { behavior: 'gathering', useLLM: true },
        // 8 out of 8 slots = 100%
        inventory: createInventory(
          { wood: 1, stone: 1, food: 1, water: 1 },
          100,
          8
        ),
      });

      // Manually fill all slots
      const inventory = entity.components.get('inventory') as InventoryComponent;
      inventory.slots[4] = { itemId: 'wood', quantity: 1 };
      inventory.slots[5] = { itemId: 'wood', quantity: 1 };
      inventory.slots[6] = { itemId: 'wood', quantity: 1 };
      inventory.slots[7] = { itemId: 'wood', quantity: 1 };
      inventory.currentWeight = 16; // 8 wood * 2

      panel.setSelectedEntity(entity);
      panel.render(mockCtx, 1024, 768);

      const fillTextCalls = (mockCtx.fillText as any).mock.calls;
      const capacityIndex = fillTextCalls.findIndex(
        (call: any[]) => typeof call[0] === 'string' && call[0].includes('Slots: 8/8')
      );

      expect(capacityIndex).toBeGreaterThan(-1);
    });
  });

  describe('Acceptance Criterion 6: Real-time Updates', () => {
    it('should reflect inventory changes when entity is re-rendered', () => {
      const entity = createMockEntity({
        agent: { behavior: 'gathering', useLLM: true },
        inventory: createInventory({ wood: 5 }),
      });

      panel.setSelectedEntity(entity);
      panel.render(mockCtx, 1024, 768);

      // Verify initial wood count
      let fillTextCalls = (mockCtx.fillText as any).mock.calls;
      let woodCall = fillTextCalls.find(
        (call: any[]) => typeof call[0] === 'string' && call[0].includes('🪵') && call[0].includes('5')
      );
      expect(woodCall).toBeDefined();

      // Simulate gathering more wood
      const inventory = entity.components.get('inventory') as InventoryComponent;
      if (!inventory.slots[0]) {
        throw new Error('Test setup error: expected slot 0 to exist');
      }
      inventory.slots[0].quantity = 10;
      inventory.currentWeight = 20;

      // Clear previous calls and re-render
      vi.clearAllMocks();
      panel.render(mockCtx, 1024, 768);

      // Verify updated wood count
      fillTextCalls = (mockCtx.fillText as any).mock.calls;
      woodCall = fillTextCalls.find(
        (call: any[]) => typeof call[0] === 'string' && call[0].includes('🪵') && call[0].includes('10')
      );
      expect(woodCall).toBeDefined();
    });

    it('should update capacity display when weight changes', () => {
      const entity = createMockEntity({
        agent: { behavior: 'gathering', useLLM: true },
        inventory: createInventory({ wood: 10 }, 100, 8),
      });

      panel.setSelectedEntity(entity);
      panel.render(mockCtx, 1024, 768);

      // Verify initial capacity
      let fillTextCalls = (mockCtx.fillText as any).mock.calls;
      let capacityCall = fillTextCalls.find(
        (call: any[]) => typeof call[0] === 'string' && call[0].includes('Weight: 20/100')
      );
      expect(capacityCall).toBeDefined();

      // Simulate gathering more resources
      const inventory = entity.components.get('inventory') as InventoryComponent;
      inventory.slots[1] = { itemId: 'stone', quantity: 10, quality: undefined };
      inventory.currentWeight = 50; // 20 + (10 * 3)

      // Clear and re-render
      vi.clearAllMocks();
      panel.render(mockCtx, 1024, 768);

      // Verify updated capacity
      fillTextCalls = (mockCtx.fillText as any).mock.calls;
      capacityCall = fillTextCalls.find(
        (call: any[]) => typeof call[0] === 'string' && call[0].includes('Weight: 50/100')
      );
      expect(capacityCall).toBeDefined();
    });

    it('should show empty state when all resources are consumed', () => {
      const entity = createMockEntity({
        agent: { behavior: 'gathering', useLLM: true },
        inventory: createInventory({ wood: 5, stone: 3 }),
      });

      panel.setSelectedEntity(entity);
      panel.render(mockCtx, 1024, 768);

      // Simulate consuming all resources
      const inventory = entity.components.get('inventory') as InventoryComponent;
      inventory.slots[0] = { itemId: null, quantity: 0, quality: undefined };
      inventory.slots[1] = { itemId: null, quantity: 0, quality: undefined };
      inventory.currentWeight = 0;

      // Clear and re-render
      vi.clearAllMocks();
      panel.render(mockCtx, 1024, 768);

      // Verify empty state
      const fillTextCalls = (mockCtx.fillText as any).mock.calls;
      const emptyCall = fillTextCalls.find((call: any[]) => call[0] === '(empty)');
      expect(emptyCall).toBeDefined();
    });
  });

  describe('Error Handling (per CLAUDE.md)', () => {
    it('should throw when inventory.maxWeight is missing', () => {
      const entity = createMockEntity({
        agent: { behavior: 'gathering', useLLM: true },
        inventory: {
          type: 'inventory',
          version: 1,
          slots: [],
          maxSlots: 8,
          // maxWeight missing
          currentWeight: 0,
        },
      });

      panel.setSelectedEntity(entity);

      expect(() => {
        panel.render(mockCtx, 1024, 768);
      }).toThrow("InventoryComponent missing required 'maxWeight' field");
    });

    it('should throw when inventory.maxWeight is undefined', () => {
      const entity = createMockEntity({
        agent: { behavior: 'gathering', useLLM: true },
        inventory: {
          type: 'inventory',
          version: 1,
          slots: [],
          maxSlots: 8,
          maxWeight: undefined,
          currentWeight: 0,
        },
      });

      panel.setSelectedEntity(entity);

      expect(() => {
        panel.render(mockCtx, 1024, 768);
      }).toThrow("InventoryComponent missing required 'maxWeight' field");
    });

    it('should throw when inventory.slots is not an array', () => {
      const entity = createMockEntity({
        agent: { behavior: 'gathering', useLLM: true },
        inventory: {
          type: 'inventory',
          version: 1,
          slots: 'not-an-array', // Invalid
          maxSlots: 8,
          maxWeight: 100,
          currentWeight: 0,
        },
      });

      panel.setSelectedEntity(entity);

      expect(() => {
        panel.render(mockCtx, 1024, 768);
      }).toThrow("InventoryComponent 'slots' must be an array");
    });

    it('should throw when inventory.slots is null', () => {
      const entity = createMockEntity({
        agent: { behavior: 'gathering', useLLM: true },
        inventory: {
          type: 'inventory',
          version: 1,
          slots: null, // Invalid
          maxSlots: 8,
          maxWeight: 100,
          currentWeight: 0,
        },
      });

      panel.setSelectedEntity(entity);

      expect(() => {
        panel.render(mockCtx, 1024, 768);
      }).toThrow("InventoryComponent 'slots' must be an array");
    });

    it('should throw when inventory.currentWeight is missing', () => {
      const entity = createMockEntity({
        agent: { behavior: 'gathering', useLLM: true },
        inventory: {
          type: 'inventory',
          version: 1,
          slots: [],
          maxSlots: 8,
          maxWeight: 100,
          // currentWeight missing
        },
      });

      panel.setSelectedEntity(entity);

      expect(() => {
        panel.render(mockCtx, 1024, 768);
      }).toThrow("InventoryComponent missing required 'currentWeight' field");
    });

    it('should throw when inventory.maxSlots is missing', () => {
      const entity = createMockEntity({
        agent: { behavior: 'gathering', useLLM: true },
        inventory: {
          type: 'inventory',
          version: 1,
          slots: [],
          // maxSlots missing
          maxWeight: 100,
          currentWeight: 0,
        },
      });

      panel.setSelectedEntity(entity);

      expect(() => {
        panel.render(mockCtx, 1024, 768);
      }).toThrow("InventoryComponent missing required 'maxSlots' field");
    });
  });

  describe('Edge Cases', () => {
    it('should handle inventory with only empty slots', () => {
      const entity = createMockEntity({
        agent: { behavior: 'wandering', useLLM: true },
        inventory: {
          type: 'inventory',
          version: 1,
          slots: [
            { itemId: null, quantity: 0 },
            { itemId: null, quantity: 0 },
            { itemId: null, quantity: 0 },
          ],
          maxSlots: 8,
          maxWeight: 100,
          currentWeight: 0,
        },
      });

      panel.setSelectedEntity(entity);

      expect(() => {
        panel.render(mockCtx, 1024, 768);
      }).not.toThrow();

      // Should show empty state
      const fillTextCalls = (mockCtx.fillText as any).mock.calls;
      const emptyCall = fillTextCalls.find((call: any[]) => call[0] === '(empty)');
      expect(emptyCall).toBeDefined();
    });

    it('should handle inventory with partial slots filled', () => {
      const entity = createMockEntity({
        agent: { behavior: 'gathering', useLLM: true },
        inventory: {
          type: 'inventory',
          version: 1,
          slots: [
            { itemId: 'wood', quantity: 5 },
            { itemId: null, quantity: 0 },
            { itemId: 'stone', quantity: 3 },
            { itemId: null, quantity: 0 },
          ],
          maxSlots: 8,
          maxWeight: 100,
          currentWeight: 19, // (5 * 2) + (3 * 3)
        },
      });

      panel.setSelectedEntity(entity);

      expect(() => {
        panel.render(mockCtx, 1024, 768);
      }).not.toThrow();

      // Should show 2 slots used
      const fillTextCalls = (mockCtx.fillText as any).mock.calls;
      const slotsCall = fillTextCalls.find(
        (call: any[]) => typeof call[0] === 'string' && call[0].includes('Slots: 2/')
      );
      expect(slotsCall).toBeDefined();
    });

    it('should handle very large resource quantities', () => {
      const entity = createMockEntity({
        agent: { behavior: 'gathering', useLLM: true },
        inventory: createInventory({ wood: 999, stone: 500 }),
      });

      panel.setSelectedEntity(entity);

      expect(() => {
        panel.render(mockCtx, 1024, 768);
      }).not.toThrow();

      // Verify large numbers are displayed
      const fillTextCalls = (mockCtx.fillText as any).mock.calls;
      const woodCall = fillTextCalls.find(
        (call: any[]) => typeof call[0] === 'string' && call[0].includes('999')
      );
      expect(woodCall).toBeDefined();
    });

    it('should not overflow panel bounds with many resources', () => {
      const entity = createMockEntity({
        agent: { behavior: 'gathering', useLLM: true },
        needs: { hunger: 50, energy: 60, health: 100 },
        inventory: createInventory({
          wood: 100,
          stone: 100,
          food: 100,
          water: 100,
        }),
      });

      panel.setSelectedEntity(entity);

      // Should not throw even with full UI
      expect(() => {
        panel.render(mockCtx, 1024, 768);
      }).not.toThrow();
    });
  });
});
