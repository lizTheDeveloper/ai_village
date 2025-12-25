/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { InventoryUI } from '../ui/InventoryUI.js';
import type { World, InventoryComponent } from '@ai-village/core';

/**
 * Integration Tests for InventoryUI System
 * Work Order: inventory-ui
 * Phase: 10 (Crafting & Items)
 *
 * These tests actually RUN the InventoryUI system with real components,
 * verifying behavior over simulated interactions (not just calculations).
 */

describe('InventoryUI Integration Tests', () => {
  let canvas: HTMLCanvasElement;
  let ctx: CanvasRenderingContext2D;
  let mockWorld: World;
  let inventoryUI: InventoryUI;
  let playerInventory: InventoryComponent;

  beforeEach(() => {
    // Create real canvas element
    canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 768;
    ctx = canvas.getContext('2d')!;

    // Create mock world with EventBus
    mockWorld = {
      eventBus: {
        emit: vi.fn(),
        on: vi.fn(),
      },
    } as any;

    // Create player inventory
    playerInventory = createTestInventory([
      { itemId: 'wood', quantity: 10 },
      { itemId: 'stone', quantity: 5 },
      { itemId: null, quantity: 0 },
      { itemId: null, quantity: 0 },
    ]);

    // Initialize InventoryUI
    inventoryUI = new InventoryUI(canvas, mockWorld);
    inventoryUI.setPlayerInventory(playerInventory);
  });

  /**
   * Helper: Create test inventory
   */
  function createTestInventory(
    slots: Array<{ itemId: string | null; quantity: number }>
  ): InventoryComponent {
    return {
      type: 'inventory',
      version: 1,
      slots,
      maxSlots: 8,
      maxWeight: 100,
      currentWeight: calculateWeight(slots),
    };
  }

  /**
   * Helper: Calculate weight (wood=2, stone=3, food=1, water=1)
   */
  function calculateWeight(slots: Array<{ itemId: string | null; quantity: number }>): number {
    const weights: Record<string, number> = {
      wood: 2,
      stone: 3,
      food: 1,
      water: 1,
    };

    return slots.reduce((total, slot) => {
      if (!slot.itemId) return total;
      return total + slot.quantity * (weights[slot.itemId] || 0);
    }, 0);
  }

  describe('Acceptance Criterion 1: Inventory Panel Opens and Closes', () => {
    it('should open inventory when I key is pressed', () => {
      expect(inventoryUI.isOpen()).toBe(false);

      inventoryUI.handleKeyPress('i', false, false);

      expect(inventoryUI.isOpen()).toBe(true);
    });

    it('should open inventory when Tab key is pressed', () => {
      expect(inventoryUI.isOpen()).toBe(false);

      inventoryUI.handleKeyPress('Tab', false, false);

      expect(inventoryUI.isOpen()).toBe(true);
    });

    it('should close inventory when pressing I while open', () => {
      inventoryUI.handleKeyPress('i', false, false);
      expect(inventoryUI.isOpen()).toBe(true);

      inventoryUI.handleKeyPress('i', false, false);

      expect(inventoryUI.isOpen()).toBe(false);
    });

    it('should close inventory when pressing Escape while open', () => {
      inventoryUI.handleKeyPress('i', false, false);
      expect(inventoryUI.isOpen()).toBe(true);

      inventoryUI.handleKeyPress('Escape', false, false);

      expect(inventoryUI.isOpen()).toBe(false);
    });

    it('should toggle inventory multiple times without errors', () => {
      for (let i = 0; i < 5; i++) {
        inventoryUI.handleKeyPress('i', false, false);
        expect(inventoryUI.isOpen()).toBe(true);

        inventoryUI.handleKeyPress('i', false, false);
        expect(inventoryUI.isOpen()).toBe(false);
      }
    });
  });

  describe('Acceptance Criterion 2: Equipment Section Displays', () => {
    it('should display equipment section when inventory is open', () => {
      inventoryUI.handleKeyPress('i', false, false);

      const sections = inventoryUI.getSections();

      expect(sections).toContain('equipment');
    });

    it('should display all equipment slots', () => {
      inventoryUI.handleKeyPress('i', false, false);

      const slots = inventoryUI.getEquipmentSlots();

      // Per spec: 11 equipment slots
      expect(slots).toContain('head');
      expect(slots).toContain('chest');
      expect(slots).toContain('legs');
      expect(slots).toContain('feet');
      expect(slots).toContain('hands');
      expect(slots).toContain('back');
      expect(slots).toContain('neck');
      expect(slots).toContain('ring_left');
      expect(slots).toContain('ring_right');
      expect(slots).toContain('main_hand');
      expect(slots).toContain('off_hand');
    });
  });

  describe('Acceptance Criterion 3: Backpack Grid System', () => {
    it('should display backpack grid with configured dimensions', () => {
      inventoryUI.handleKeyPress('i', false, false);

      const layout = inventoryUI.getBackpackGridLayout();

      expect(layout.columns).toBe(8);
      expect(layout.slotSize).toBe(40);
      expect(layout.spacing).toBe(4);
      expect(layout.totalSlots).toBe(8); // Based on maxSlots
    });

    it('should render all backpack items', () => {
      inventoryUI.handleKeyPress('i', false, false);

      const items = inventoryUI.getRenderedBackpackItems();

      expect(items[0]).toMatchObject({ itemId: 'wood', quantity: 10 });
      expect(items[1]).toMatchObject({ itemId: 'stone', quantity: 5 });
      expect(items[2]).toMatchObject({ itemId: null, quantity: 0 });
    });

    it('should handle empty slots correctly', () => {
      const emptyInventory = createTestInventory([
        { itemId: null, quantity: 0 },
        { itemId: null, quantity: 0 },
      ]);

      inventoryUI.setPlayerInventory(emptyInventory);
      inventoryUI.handleKeyPress('i', false, false);

      const items = inventoryUI.getRenderedBackpackItems();

      expect(items.every((item) => item.itemId === null)).toBe(true);
    });

    it('should render to canvas without errors', () => {
      inventoryUI.handleKeyPress('i', false, false);

      expect(() => {
        inventoryUI.render(ctx, canvas.width, canvas.height);
      }).not.toThrow();
    });
  });

  describe('Acceptance Criterion 4: Item Tooltips', () => {
    it('should show tooltip when hovering over item', () => {
      inventoryUI.handleKeyPress('i', false, false);

      // Render to initialize canvas dimensions
      inventoryUI.render(ctx, canvas.width, canvas.height);

      // Calculate first slot position based on layout
      // Panel is centered: (1024-800)/2 = 112px from left
      // Backpack starts at panelX + panelWidth/2 = 112 + 400 = 512
      // Grid starts at sectionY + filters = 60 + 24 + 8 + 20 + 12 = 124 below panel top
      // First slot: panelY (84) + 124 = 208, panelX (512)
      const firstSlotX = 520; // A bit into the first slot
      const firstSlotY = 220;

      inventoryUI.handleMouseMove(firstSlotX, firstSlotY, canvas.width, canvas.height);

      const tooltip = inventoryUI.getActiveTooltip();

      expect(tooltip).toBeDefined();
      expect(tooltip?.itemId).toBe('wood');
    });

    it('should hide tooltip when not hovering over any item', () => {
      inventoryUI.handleKeyPress('i', false, false);

      // Move to empty area
      inventoryUI.handleMouseMove(500, 500);

      const tooltip = inventoryUI.getActiveTooltip();

      expect(tooltip).toBeNull();
    });

    it('should update tooltip when moving between items', () => {
      inventoryUI.handleKeyPress('i', false, false);

      // Render to initialize canvas dimensions
      inventoryUI.render(ctx, canvas.width, canvas.height);

      // Calculate first slot position
      const firstSlotX = 520;
      const firstSlotY = 220;

      // Hover over first item
      inventoryUI.handleMouseMove(firstSlotX, firstSlotY, canvas.width, canvas.height);
      let tooltip = inventoryUI.getActiveTooltip();
      expect(tooltip?.itemId).toBe('wood');

      // Move away to empty area
      inventoryUI.handleMouseMove(50, 50, canvas.width, canvas.height);
      tooltip = inventoryUI.getActiveTooltip();
      expect(tooltip).toBeNull();
    });
  });

  describe('Acceptance Criterion 5: Drag and Drop - Basic Movement', () => {
    it('should start drag operation on mouse down', () => {
      inventoryUI.handleKeyPress('i', false, false);

      expect(() => {
        inventoryUI.startDrag(0, 100, 200);
      }).not.toThrow();
    });

    it('should update drag position during mouse move', () => {
      inventoryUI.handleKeyPress('i', false, false);
      inventoryUI.startDrag(0, 100, 200);

      expect(() => {
        inventoryUI.updateDrag(150, 250);
        inventoryUI.updateDrag(200, 300);
      }).not.toThrow();
    });

    it('should handle drag without inventory set gracefully', () => {
      const emptyUI = new InventoryUI(canvas, mockWorld);
      emptyUI.handleKeyPress('i', false, false);

      // Should not throw, just do nothing
      expect(() => {
        emptyUI.startDrag(0, 100, 200);
      }).not.toThrow();
    });
  });

  describe('Acceptance Criterion 15: Weight and Capacity Display', () => {
    it('should calculate capacity display correctly', () => {
      const capacity = inventoryUI.getCapacityDisplay();

      expect(capacity.slotsUsed).toBe(2); // wood + stone
      expect(capacity.maxSlots).toBe(8);
      expect(capacity.currentWeight).toBe(35); // (10 * 2) + (5 * 3)
      expect(capacity.maxWeight).toBe(100);
    });

    it('should show white color when below 80% capacity', () => {
      const capacity = inventoryUI.getCapacityDisplay();

      expect(capacity.color).toBe('white');
    });

    it('should show yellow color when at 80-99% capacity', () => {
      const heavyInventory = createTestInventory([
        { itemId: 'wood', quantity: 42 }, // 84kg (84% of 100)
      ]);

      inventoryUI.setPlayerInventory(heavyInventory);
      const capacity = inventoryUI.getCapacityDisplay();

      expect(capacity.currentWeight).toBe(84);
      expect(capacity.color).toBe('yellow');
    });

    it('should show red color when at 100% capacity', () => {
      const fullInventory = createTestInventory([
        { itemId: 'wood', quantity: 50 }, // 100kg
      ]);

      inventoryUI.setPlayerInventory(fullInventory);
      const capacity = inventoryUI.getCapacityDisplay();

      expect(capacity.currentWeight).toBe(100);
      expect(capacity.color).toBe('red');
    });

    it('should prevent adding items when at max capacity', () => {
      const fullInventory = createTestInventory([
        { itemId: 'wood', quantity: 50 }, // 100kg
      ]);

      inventoryUI.setPlayerInventory(fullInventory);

      expect(() => {
        inventoryUI.tryAddItem('stone', 10);
      }).toThrow('Inventory at maximum weight capacity');
    });
  });

  describe('Acceptance Criterion 17: Keyboard Shortcuts', () => {
    it('should handle uppercase I key', () => {
      inventoryUI.handleKeyPress('I', false, false);

      expect(inventoryUI.isOpen()).toBe(true);
    });

    it('should handle lowercase i key', () => {
      inventoryUI.handleKeyPress('i', false, false);

      expect(inventoryUI.isOpen()).toBe(true);
    });

    it('should handle Tab key', () => {
      inventoryUI.handleKeyPress('Tab', false, false);

      expect(inventoryUI.isOpen()).toBe(true);
    });

    it('should handle Escape key', () => {
      inventoryUI.handleKeyPress('i', false, false);
      inventoryUI.handleKeyPress('Escape', false, false);

      expect(inventoryUI.isOpen()).toBe(false);
    });
  });

  describe('Error Handling - No Silent Fallbacks (CLAUDE.md)', () => {
    it('should throw when setPlayerInventory called with invalid inventory (missing slots)', () => {
      const invalidInventory = {
        type: 'inventory',
        version: 1,
        // slots missing
        maxSlots: 8,
        maxWeight: 100,
        currentWeight: 0,
      } as any;

      expect(() => {
        inventoryUI.setPlayerInventory(invalidInventory);
      }).toThrow('missing required field "slots"');
    });

    it('should throw when setPlayerInventory called with non-array slots', () => {
      const invalidInventory = {
        type: 'inventory',
        version: 1,
        slots: 'not-an-array',
        maxSlots: 8,
        maxWeight: 100,
        currentWeight: 0,
      } as any;

      expect(() => {
        inventoryUI.setPlayerInventory(invalidInventory);
      }).toThrow('missing required field "slots"');
    });

    it('should throw when setPlayerInventory called with missing maxSlots', () => {
      const invalidInventory = {
        type: 'inventory',
        version: 1,
        slots: [],
        // maxSlots missing
        maxWeight: 100,
        currentWeight: 0,
      } as any;

      expect(() => {
        inventoryUI.setPlayerInventory(invalidInventory);
      }).toThrow('missing required field "maxSlots"');
    });

    it('should throw when setPlayerInventory called with missing maxWeight', () => {
      const invalidInventory = {
        type: 'inventory',
        version: 1,
        slots: [],
        maxSlots: 8,
        // maxWeight missing
        currentWeight: 0,
      } as any;

      expect(() => {
        inventoryUI.setPlayerInventory(invalidInventory);
      }).toThrow('missing required field "maxWeight"');
    });

    it('should throw when setPlayerInventory called with missing currentWeight', () => {
      const invalidInventory = {
        type: 'inventory',
        version: 1,
        slots: [],
        maxSlots: 8,
        maxWeight: 100,
        // currentWeight missing
      } as any;

      expect(() => {
        inventoryUI.setPlayerInventory(invalidInventory);
      }).toThrow('missing required field "currentWeight"');
    });

    it('should throw when setPlayerInventory called with null', () => {
      expect(() => {
        inventoryUI.setPlayerInventory(null as any);
      }).toThrow('missing required');
    });

    it('should throw when setPlayerInventory called with undefined', () => {
      expect(() => {
        inventoryUI.setPlayerInventory(undefined as any);
      }).toThrow('missing required');
    });
  });

  describe('Rendering Integration', () => {
    it('should not render when inventory is closed', () => {
      const spy = vi.spyOn(ctx, 'fillRect');

      inventoryUI.render(ctx, canvas.width, canvas.height);

      // Should not draw anything
      expect(spy).not.toHaveBeenCalled();
    });

    it('should render backdrop when inventory is open', () => {
      inventoryUI.handleKeyPress('i', false, false);
      const spy = vi.spyOn(ctx, 'fillRect');

      inventoryUI.render(ctx, canvas.width, canvas.height);

      // Should have drawn backdrop, panel, slots, etc.
      expect(spy).toHaveBeenCalled();
    });

    it('should render panel centered on screen', () => {
      inventoryUI.handleKeyPress('i', false, false);

      expect(() => {
        inventoryUI.render(ctx, 1024, 768);
      }).not.toThrow();
    });

    it('should handle small screen sizes gracefully', () => {
      inventoryUI.handleKeyPress('i', false, false);

      expect(() => {
        inventoryUI.render(ctx, 400, 300);
      }).not.toThrow();
    });

    it('should handle very large screen sizes gracefully', () => {
      inventoryUI.handleKeyPress('i', false, false);

      expect(() => {
        inventoryUI.render(ctx, 3840, 2160);
      }).not.toThrow();
    });
  });

  describe('Edge Cases', () => {
    it('should handle inventory with all empty slots', () => {
      const emptyInventory = createTestInventory([
        { itemId: null, quantity: 0 },
        { itemId: null, quantity: 0 },
        { itemId: null, quantity: 0 },
        { itemId: null, quantity: 0 },
      ]);

      inventoryUI.setPlayerInventory(emptyInventory);
      inventoryUI.handleKeyPress('i', false, false);

      const capacity = inventoryUI.getCapacityDisplay();
      expect(capacity.slotsUsed).toBe(0);
      expect(capacity.currentWeight).toBe(0);
    });

    it('should handle inventory with maximum items', () => {
      const fullSlots = Array.from({ length: 24 }, (_, i) => ({
        itemId: i % 2 === 0 ? 'wood' : 'stone',
        quantity: i % 2 === 0 ? 50 : 30,
      }));

      const fullInventory: InventoryComponent = {
        type: 'inventory',
        version: 1,
        slots: fullSlots,
        maxSlots: 24,
        maxWeight: 10000,
        currentWeight: 2280, // 12 * (50*2) + 12 * (30*3)
      };

      inventoryUI.setPlayerInventory(fullInventory);
      inventoryUI.handleKeyPress('i', false, false);

      const capacity = inventoryUI.getCapacityDisplay();
      expect(capacity.slotsUsed).toBe(24);
    });

    it('should handle very large quantities', () => {
      const largeInventory = createTestInventory([
        { itemId: 'wood', quantity: 999999 },
      ]);

      inventoryUI.setPlayerInventory(largeInventory);
      inventoryUI.handleKeyPress('i', false, false);

      expect(() => {
        inventoryUI.render(ctx, canvas.width, canvas.height);
      }).not.toThrow();
    });

    it('should handle rapid toggling without state corruption', () => {
      for (let i = 0; i < 100; i++) {
        inventoryUI.handleKeyPress('i', false, false);
      }

      // Should be closed after 100 toggles (even number)
      expect(inventoryUI.isOpen()).toBe(false);
    });

    it('should handle mouse move when inventory is closed', () => {
      expect(() => {
        inventoryUI.handleMouseMove(100, 200);
      }).not.toThrow();

      const tooltip = inventoryUI.getActiveTooltip();
      expect(tooltip).toBeNull();
    });
  });
});
