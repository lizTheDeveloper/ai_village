import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { InventoryComponent } from '@ai-village/core';

// Import components that will be implemented
// @ts-expect-error - Will be implemented
import { DragDropSystem } from '../ui/DragDropSystem.js';
// @ts-expect-error - Will be implemented
import type { SlotReference, DragState } from '../ui/DragDropSystem.js';

describe('DragDropSystem', () => {
  let dragDrop: any;
  let mockInventory: InventoryComponent;

  beforeEach(() => {
    mockInventory = {
      type: 'inventory',
      version: 1,
      slots: [
        { itemId: 'wood', quantity: 50 },
        { itemId: 'stone', quantity: 30 },
        { itemId: 'wood', quantity: 20 },
        { itemId: null, quantity: 0 },
        { itemId: null, quantity: 0 },
      ],
      maxSlots: 24,
      maxWeight: 100,
      currentWeight: 190, // 50*2 + 30*3 + 20*2 = 190
    };

    dragDrop = new DragDropSystem();
  });

  describe('Criterion 5: Drag and Drop - Basic Movement', () => {
    it('should start drag when mouse down on item', () => {
      const slotRef: SlotReference = {
        type: 'backpack',
        index: 0,
      };

      dragDrop.startDrag(slotRef, mockInventory);

      const state = dragDrop.getDragState();
      expect(state.isDragging).toBe(true);
      expect(state.item).toMatchObject({
        itemId: 'wood',
        quantity: 50,
      });
      expect(state.sourceSlot).toEqual(slotRef);
    });

    it('should update ghost position during drag', () => {
      const slotRef: SlotReference = { type: 'backpack', index: 0 };
      dragDrop.startDrag(slotRef, mockInventory);

      dragDrop.updateDrag(150, 250);

      const state = dragDrop.getDragState();
      expect(state.ghostPosition).toEqual({ x: 150, y: 250 });
    });

    it('should highlight valid drop targets during drag', () => {
      const slotRef: SlotReference = { type: 'backpack', index: 0 };
      dragDrop.startDrag(slotRef, mockInventory);

      const validTargets = dragDrop.getValidTargets();

      expect(validTargets.length).toBeGreaterThan(0);
      expect(validTargets).toContainEqual({ type: 'backpack', index: 3 }); // Empty slot
    });

    it('should dim source slot during drag', () => {
      const slotRef: SlotReference = { type: 'backpack', index: 0 };
      dragDrop.startDrag(slotRef, mockInventory);

      const visualState = dragDrop.getSlotVisualState(slotRef);

      expect(visualState.dimmed).toBe(true);
    });

    it('should move item to empty slot on drop', () => {
      const sourceSlot: SlotReference = { type: 'backpack', index: 0 };
      const targetSlot: SlotReference = { type: 'backpack', index: 3 };

      dragDrop.startDrag(sourceSlot, mockInventory);
      const result = dragDrop.drop(targetSlot, mockInventory);

      expect(result.success).toBe(true);
      expect(result.updatedInventory.slots[3]).toMatchObject({
        itemId: 'wood',
        quantity: 50,
      });
      expect(result.updatedInventory.slots[0]).toMatchObject({
        itemId: null,
        quantity: 0,
      });
    });

    it('should cancel drag on Escape key', () => {
      const slotRef: SlotReference = { type: 'backpack', index: 0 };
      dragDrop.startDrag(slotRef, mockInventory);
      expect(dragDrop.getDragState().isDragging).toBe(true);

      dragDrop.cancel();

      expect(dragDrop.getDragState().isDragging).toBe(false);
      expect(dragDrop.getDragState().item).toBeNull();
    });

    it('should cancel drag on right-click', () => {
      const slotRef: SlotReference = { type: 'backpack', index: 0 };
      dragDrop.startDrag(slotRef, mockInventory);

      dragDrop.handleRightClick();

      expect(dragDrop.getDragState().isDragging).toBe(false);
    });
  });

  describe('Criterion 6: Drag and Drop - Stacking', () => {
    it('should combine stacks when dragging to same item type', () => {
      const sourceSlot: SlotReference = { type: 'backpack', index: 0 }; // wood: 50
      const targetSlot: SlotReference = { type: 'backpack', index: 2 }; // wood: 20

      dragDrop.startDrag(sourceSlot, mockInventory);
      const result = dragDrop.drop(targetSlot, mockInventory);

      expect(result.success).toBe(true);
      // Max stack for wood is 50, so target becomes 50, source has remaining 20
      expect(result.updatedInventory.slots[2].quantity).toBe(50); // Filled to max
      expect(result.updatedInventory.slots[0].quantity).toBe(20); // Remainder
    });

    it('should fill target stack and leave remainder in source', () => {
      mockInventory.slots[0] = { itemId: 'wood', quantity: 64 };
      mockInventory.slots[2] = { itemId: 'wood', quantity: 48 };

      const sourceSlot: SlotReference = { type: 'backpack', index: 0 };
      const targetSlot: SlotReference = { type: 'backpack', index: 2 };

      dragDrop.startDrag(sourceSlot, mockInventory);
      const result = dragDrop.drop(targetSlot, mockInventory);

      // Wood max stack is 50
      expect(result.updatedInventory.slots[2].quantity).toBe(50); // Filled to max
      expect(result.updatedInventory.slots[0].quantity).toBe(62); // Remainder: 64 - 2
    });

    it('should transfer entire stack if target can hold it', () => {
      mockInventory.slots[0] = { itemId: 'wood', quantity: 10 };
      mockInventory.slots[2] = { itemId: 'wood', quantity: 20 };

      const sourceSlot: SlotReference = { type: 'backpack', index: 0 };
      const targetSlot: SlotReference = { type: 'backpack', index: 2 };

      dragDrop.startDrag(sourceSlot, mockInventory);
      const result = dragDrop.drop(targetSlot, mockInventory);

      expect(result.updatedInventory.slots[2].quantity).toBe(30); // 20 + 10
      expect(result.updatedInventory.slots[0]).toMatchObject({
        itemId: null,
        quantity: 0,
      });
    });

    it('should respect max stack size from spec', () => {
      // Test different resource types and their stack limits
      const stackLimits = [
        { itemId: 'wood', maxStack: 50 },
        { itemId: 'stone', maxStack: 30 },
        { itemId: 'food', maxStack: 20 },
        { itemId: 'water', maxStack: 10 },
      ];

      for (const { itemId, maxStack } of stackLimits) {
        const inventory: InventoryComponent = {
          type: 'inventory',
          version: 1,
          slots: [
            { itemId, quantity: maxStack },
            { itemId, quantity: 1 },
          ],
          maxSlots: 24,
          maxWeight: 1000,
          currentWeight: 0,
        };

        dragDrop.startDrag({ type: 'backpack', index: 1 }, inventory);
        const result = dragDrop.drop({ type: 'backpack', index: 0 }, inventory);

        // Cannot add to full stack
        expect(result.updatedInventory.slots[0].quantity).toBe(maxStack);
        expect(result.updatedInventory.slots[1].quantity).toBe(1);
      }
    });
  });

  describe('Criterion 7: Drag and Drop - Swapping', () => {
    it('should swap items when dragging to different item type', () => {
      const sourceSlot: SlotReference = { type: 'backpack', index: 0 }; // wood: 50
      const targetSlot: SlotReference = { type: 'backpack', index: 1 }; // stone: 30

      dragDrop.startDrag(sourceSlot, mockInventory);
      const result = dragDrop.drop(targetSlot, mockInventory);

      expect(result.success).toBe(true);
      expect(result.updatedInventory.slots[0]).toMatchObject({
        itemId: 'stone',
        quantity: 30,
      });
      expect(result.updatedInventory.slots[1]).toMatchObject({
        itemId: 'wood',
        quantity: 50,
      });
    });

    it('should emit item:transferred event on swap', () => {
      const eventEmitter = vi.fn();
      dragDrop.setEventEmitter(eventEmitter);

      const sourceSlot: SlotReference = { type: 'backpack', index: 0 };
      const targetSlot: SlotReference = { type: 'backpack', index: 1 };

      dragDrop.startDrag(sourceSlot, mockInventory);
      dragDrop.drop(targetSlot, mockInventory);

      expect(eventEmitter).toHaveBeenCalledWith('item:transferred', expect.any(Object));
    });
  });

  describe('Criterion 8: Drag and Drop - Equipping', () => {
    it('should equip item when dragged to valid equipment slot', () => {
      const inventory: InventoryComponent = {
        type: 'inventory',
        version: 1,
        slots: [{ itemId: 'sword', quantity: 1 }],
        maxSlots: 24,
        maxWeight: 100,
        currentWeight: 5,
      };

      const sourceSlot: SlotReference = { type: 'backpack', index: 0 };
      const targetSlot: SlotReference = { type: 'equipment', slot: 'main_hand' };

      dragDrop.startDrag(sourceSlot, inventory);
      const result = dragDrop.drop(targetSlot, inventory);

      expect(result.success).toBe(true);
      expect(result.equipped).toMatchObject({
        slot: 'main_hand',
        itemId: 'sword',
      });
    });

    it('should show red border for invalid equipment slot', () => {
      const inventory: InventoryComponent = {
        type: 'inventory',
        version: 1,
        slots: [{ itemId: 'sword', quantity: 1 }],
        maxSlots: 24,
        maxWeight: 100,
        currentWeight: 5,
      };

      const targetSlot: SlotReference = { type: 'equipment', slot: 'head' };

      dragDrop.startDrag({ type: 'backpack', index: 0 }, inventory);

      const visualState = dragDrop.getSlotVisualState(targetSlot);

      expect(visualState.invalidTarget).toBe(true);
      expect(visualState.borderColor).toBe('red');
    });

    it('should move previously equipped item to backpack', () => {
      const inventory: InventoryComponent = {
        type: 'inventory',
        version: 1,
        slots: [
          { itemId: 'sword', quantity: 1 },
          { itemId: null, quantity: 0 },
        ],
        maxSlots: 24,
        maxWeight: 100,
        currentWeight: 5,
      };

      // Equip first sword
      dragDrop.startDrag({ type: 'backpack', index: 0 }, inventory);
      const result1 = dragDrop.drop({ type: 'equipment', slot: 'main_hand' }, inventory);

      // Add another sword to backpack
      result1.updatedInventory.slots[0] = { itemId: 'axe', quantity: 1 };

      // Equip axe
      dragDrop.startDrag({ type: 'backpack', index: 0 }, result1.updatedInventory);
      const result2 = dragDrop.drop({ type: 'equipment', slot: 'main_hand' }, result1.updatedInventory);

      // Old sword should be in backpack
      expect(result2.updatedInventory.slots.some((s: any) => s.itemId === 'sword')).toBe(true);
      expect(result2.equipped?.itemId).toBe('axe');
    });

    it('should fail to equip when backpack is full', () => {
      // Create inventory with all slots full (not using fill to avoid reference issues)
      let inventory: InventoryComponent = {
        type: 'inventory',
        version: 1,
        slots: Array.from({ length: 24 }, () => ({ itemId: 'wood', quantity: 50 })),
        maxSlots: 24,
        maxWeight: 1000,
        currentWeight: 500,
      };

      // Put sword in slot 0 and axe in slot 1
      inventory.slots[0] = { itemId: 'sword', quantity: 1 };
      inventory.slots[1] = { itemId: 'axe', quantity: 1 };

      // First equip sword in main_hand
      dragDrop.startDrag({ type: 'backpack', index: 0 }, inventory);
      const equipResult = dragDrop.drop({ type: 'equipment', slot: 'main_hand' }, inventory);
      expect(equipResult.success).toBe(true);
      inventory = equipResult.updatedInventory;

      // Now backpack slot 0 is empty, fill it with wood
      inventory.slots[0] = { itemId: 'wood', quantity: 50 };

      // Now try to equip axe - should fail because backpack is full and we need space for sword
      dragDrop.startDrag({ type: 'backpack', index: 1 }, inventory);
      const result = dragDrop.drop({ type: 'equipment', slot: 'main_hand' }, inventory);

      // Should fail - no space to unequip old item
      expect(result.success).toBe(false);
      expect(result.error).toContain('No space');
    });

    it('should emit item:equipped event', () => {
      const eventEmitter = vi.fn();
      dragDrop.setEventEmitter(eventEmitter);

      const inventory: InventoryComponent = {
        type: 'inventory',
        version: 1,
        slots: [{ itemId: 'sword', quantity: 1 }],
        maxSlots: 24,
        maxWeight: 100,
        currentWeight: 5,
      };

      dragDrop.startDrag({ type: 'backpack', index: 0 }, inventory);
      dragDrop.drop({ type: 'equipment', slot: 'main_hand' }, inventory);

      expect(eventEmitter).toHaveBeenCalledWith('item:equipped', {
        slot: 'main_hand',
        itemId: 'sword',
      });
    });
  });

  describe('Criterion 9: Drag and Drop - Drop to World', () => {
    it('should show confirmation for valuable items', () => {
      const inventory: InventoryComponent = {
        type: 'inventory',
        version: 1,
        slots: [{ itemId: 'diamond', quantity: 5 }],
        maxSlots: 24,
        maxWeight: 100,
        currentWeight: 5,
      };

      const sourceSlot: SlotReference = { type: 'backpack', index: 0 };
      dragDrop.startDrag(sourceSlot, inventory);

      const requiresConfirmation = dragDrop.dropToWorld(400, 300, inventory); // Outside inventory

      expect(requiresConfirmation).toBe(true);
    });

    it('should emit item:dropped event when confirmed', () => {
      const eventEmitter = vi.fn();
      dragDrop.setEventEmitter(eventEmitter);

      const inventory: InventoryComponent = {
        type: 'inventory',
        version: 1,
        slots: [{ itemId: 'wood', quantity: 10 }],
        maxSlots: 24,
        maxWeight: 100,
        currentWeight: 20,
      };

      dragDrop.startDrag({ type: 'backpack', index: 0 }, inventory);
      dragDrop.dropToWorld(400, 300, inventory);
      dragDrop.confirmDrop(inventory);

      expect(eventEmitter).toHaveBeenCalledWith('item:dropped', expect.objectContaining({
        itemId: 'wood',
        quantity: 10,
      }));
    });

    it('should remove item from inventory when dropped to world', () => {
      const eventEmitter = vi.fn();
      dragDrop.setEventEmitter(eventEmitter);

      const inventory: InventoryComponent = {
        type: 'inventory',
        version: 1,
        slots: [{ itemId: 'wood', quantity: 10 }],
        maxSlots: 24,
        maxWeight: 100,
        currentWeight: 20,
      };

      dragDrop.startDrag({ type: 'backpack', index: 0 }, inventory);
      const requiresConfirmation = dragDrop.dropToWorld(400, 300, inventory);

      // Wood is not valuable, so it drops immediately without requiring confirmation
      expect(requiresConfirmation).toBe(false);

      // Event should have been emitted
      expect(eventEmitter).toHaveBeenCalledWith('item:dropped', expect.objectContaining({
        itemId: 'wood',
        quantity: 10,
      }));
    });
  });

  describe('Criterion 10: Stack Splitting', () => {
    it('should enter split mode on shift-drag', () => {
      const slotRef: SlotReference = { type: 'backpack', index: 0 }; // wood: 50

      dragDrop.startDrag(slotRef, mockInventory, { shift: true });

      const state = dragDrop.getDragState();
      expect(state.splitMode).toBe(true);
    });

    it('should show split dialog with slider', () => {
      const slotRef: SlotReference = { type: 'backpack', index: 0 };
      dragDrop.startDrag(slotRef, mockInventory, { shift: true });

      const dialog = dragDrop.getSplitDialog();

      expect(dialog).toBeDefined();
      expect(dialog.min).toBe(1);
      expect(dialog.max).toBe(50);
      expect(dialog.current).toBe(25); // Default to half
    });

    it('should split stack when confirmed', () => {
      const slotRef: SlotReference = { type: 'backpack', index: 0 };
      dragDrop.startDrag(slotRef, mockInventory, { shift: true });
      dragDrop.setSplitAmount(20);

      const result = dragDrop.confirmSplit();

      expect(result.success).toBe(true);
      expect(result.splitAmount).toBe(20);
      expect(result.sourceSlot.quantity).toBe(30); // 50 - 20
    });

    it('should disable split for stacks of 1', () => {
      const inventory: InventoryComponent = {
        type: 'inventory',
        version: 1,
        slots: [{ itemId: 'diamond', quantity: 1 }],
        maxSlots: 24,
        maxWeight: 100,
        currentWeight: 1,
      };

      dragDrop.startDrag({ type: 'backpack', index: 0 }, inventory, { shift: true });

      const dialog = dragDrop.getSplitDialog();
      // For stacks of 1, no split dialog is created (returns null)
      // This is equivalent to split being disabled
      expect(dialog).toBeNull();
    });

    it('should support half-stack button', () => {
      const slotRef: SlotReference = { type: 'backpack', index: 0 };
      dragDrop.startDrag(slotRef, mockInventory, { shift: true });

      dragDrop.splitHalf();

      const dialog = dragDrop.getSplitDialog();
      expect(dialog.current).toBe(25); // Half of 50
    });
  });

  describe('Error Handling - No Fallbacks', () => {
    it('should throw when starting drag with invalid slot reference', () => {
      const invalidSlot: any = { type: 'invalid', index: 0 };

      expect(() => {
        dragDrop.startDrag(invalidSlot, mockInventory);
      }).toThrow();
    });

    it('should throw when inventory is missing during drag', () => {
      expect(() => {
        dragDrop.startDrag({ type: 'backpack', index: 0 }, undefined as any);
      }).toThrow('missing required');
    });

    it('should throw when slot index is out of bounds', () => {
      const slotRef: SlotReference = { type: 'backpack', index: 999 };

      expect(() => {
        dragDrop.startDrag(slotRef, mockInventory);
      }).toThrow('out of bounds');
    });
  });
});
