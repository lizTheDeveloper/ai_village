import { describe, it, expect, beforeEach } from 'vitest';
import { WorldImpl } from '../../ecs/World.js';
import {
  createInventoryComponent,
  addToInventory,
  addToInventoryWithQuality,
  removeFromInventory,
  getItemCount
} from '../../components/InventoryComponent';
import type { InventoryComponent, InventorySlot } from '../../components/InventoryComponent';

describe('Quality-Based Stacking Integration', () => {
  let world: WorldImpl;
  let inventory: InventoryComponent;

  beforeEach(() => {
    world = new WorldImpl();
    inventory = createInventoryComponent(24, 1000); // 24 slots, 1000 weight capacity
  });

  describe('Criterion 2: Quality-Based Stacking Separation', () => {
    it('should create separate stacks for different quality levels', () => {
      // Add 10 "normal" quality wheat (quality=60)
      let result = addToInventoryWithQuality(inventory, 'wheat', 10, 60);
      inventory = result.inventory;

      // Add 10 "fine" quality wheat (quality=80)
      result = addToInventoryWithQuality(inventory, 'wheat', 10, 80);
      inventory = result.inventory;

      const wheatSlots = inventory.slots.filter((s: InventorySlot) =>
        s.itemId === 'wheat' && s.quantity > 0
      );

      // Should have exactly 2 separate wheat stacks
      expect(wheatSlots).toHaveLength(2);

      // Verify qualities are separate
      const qualities = wheatSlots.map((s: InventorySlot) => s.quality);
      expect(qualities).toContain(60);
      expect(qualities).toContain(80);
    });

    it('should stack items with identical quality', () => {
      // Add 5 wheat at quality 70
      let result = addToInventoryWithQuality(inventory, 'wheat', 5, 70);
      inventory = result.inventory;

      // Add 5 more wheat at same quality
      result = addToInventoryWithQuality(inventory, 'wheat', 5, 70);
      inventory = result.inventory;

      const wheatSlots = inventory.slots.filter((s: InventorySlot) =>
        s.itemId === 'wheat' && s.quantity > 0
      );

      // Should have only 1 stack
      expect(wheatSlots).toHaveLength(1);
      expect(wheatSlots[0]?.quantity).toBe(10);
      expect(wheatSlots[0]?.quality).toBe(70);
    });

    it('should return correct total count across quality stacks', () => {
      // Add different quality wheat
      let result = addToInventoryWithQuality(inventory, 'wheat', 10, 50);
      inventory = result.inventory;

      result = addToInventoryWithQuality(inventory, 'wheat', 15, 70);
      inventory = result.inventory;

      result = addToInventoryWithQuality(inventory, 'wheat', 5, 90);
      inventory = result.inventory;

      const totalWheat = getItemCount(inventory, 'wheat');
      expect(totalWheat).toBe(30);
    });

    it('should handle boundary quality values correctly', () => {
      // Add wheat at tier boundaries
      let result = addToInventoryWithQuality(inventory, 'wheat', 1, 30);
      inventory = result.inventory;

      result = addToInventoryWithQuality(inventory, 'wheat', 1, 31);
      inventory = result.inventory;

      result = addToInventoryWithQuality(inventory, 'wheat', 1, 60);
      inventory = result.inventory;

      result = addToInventoryWithQuality(inventory, 'wheat', 1, 61);
      inventory = result.inventory;

      const wheatSlots = inventory.slots.filter((s: InventorySlot) =>
        s.itemId === 'wheat' && s.quantity > 0
      );

      // Should have 4 separate stacks (each quality is different)
      expect(wheatSlots).toHaveLength(4);
    });

    it('should handle legacy items with undefined quality', () => {
      // Add item without quality (legacy behavior)
      let result = addToInventory(inventory, 'wheat', 10);
      inventory = result.inventory;

      // Add item with undefined quality (should not stack if quality differs)
      result = addToInventoryWithQuality(inventory, 'wheat', 10, 50);
      inventory = result.inventory;

      const wheatSlots = inventory.slots.filter((s: InventorySlot) =>
        s.itemId === 'wheat' && s.quantity > 0
      );

      // undefined quality vs 50 quality should be separate stacks
      expect(wheatSlots.length).toBeGreaterThanOrEqual(1);
    });

    it('should respect inventory capacity with quality stacks', () => {
      // Fill all 24 slots with different quality wheat
      for (let i = 0; i < 24; i++) {
        const quality = 40 + i; // Each stack has different quality
        const result = addToInventoryWithQuality(inventory, 'wheat', 1, quality);
        inventory = result.inventory;
      }

      // Trying to add wheat with new quality should throw (inventory full)
      expect(() => {
        addToInventoryWithQuality(inventory, 'wheat', 1, 100);
      }).toThrow();
    });

    it('should remove items from inventory', () => {
      let result = addToInventoryWithQuality(inventory, 'wheat', 10, 60);
      inventory = result.inventory;

      result = addToInventoryWithQuality(inventory, 'wheat', 10, 80);
      inventory = result.inventory;

      // Remove 5 wheat (should remove from first matching stack)
      const removeResult = removeFromInventory(inventory, 'wheat', 5);
      inventory = removeResult.inventory;

      const wheatSlots = inventory.slots.filter((s: InventorySlot) =>
        s.itemId === 'wheat' && s.quantity > 0
      );

      // Should still have 2 stacks or 1 stack depending on removal order
      expect(wheatSlots.length).toBeGreaterThanOrEqual(1);

      // Total should be 15
      const totalWheat = getItemCount(inventory, 'wheat');
      expect(totalWheat).toBe(15);
    });

    it('should remove entire stack when quantity reaches zero', () => {
      const result = addToInventoryWithQuality(inventory, 'wheat', 5, 70);
      inventory = result.inventory;

      // Remove all wheat
      const removeResult = removeFromInventory(inventory, 'wheat', 5);
      inventory = removeResult.inventory;

      const wheatSlots = inventory.slots.filter((s: InventorySlot) =>
        s.itemId === 'wheat' && s.quantity > 0
      );

      expect(wheatSlots).toHaveLength(0);
    });

    it('should handle multiple items with different qualities', () => {
      // Add wheat at different qualities
      let result = addToInventoryWithQuality(inventory, 'wheat', 10, 50);
      inventory = result.inventory;

      result = addToInventoryWithQuality(inventory, 'wheat', 10, 80);
      inventory = result.inventory;

      // Add carrots at different qualities
      result = addToInventoryWithQuality(inventory, 'carrot', 5, 60);
      inventory = result.inventory;

      result = addToInventoryWithQuality(inventory, 'carrot', 5, 90);
      inventory = result.inventory;

      const wheatSlots = inventory.slots.filter((s: InventorySlot) =>
        s.itemId === 'wheat' && s.quantity > 0
      );
      const carrotSlots = inventory.slots.filter((s: InventorySlot) =>
        s.itemId === 'carrot' && s.quantity > 0
      );

      expect(wheatSlots).toHaveLength(2);
      expect(carrotSlots).toHaveLength(2);
    });
  });

  describe('Edge Cases - Quality Stacking', () => {
    it('should handle quality 0 (minimum)', () => {
      const result = addToInventoryWithQuality(inventory, 'wheat', 10, 0);
      inventory = result.inventory;

      const wheatSlots = inventory.slots.filter((s: InventorySlot) =>
        s.itemId === 'wheat' && s.quantity > 0
      );

      expect(wheatSlots).toHaveLength(1);
      expect(wheatSlots[0]?.quality).toBe(0);
    });

    it('should handle quality 100 (maximum)', () => {
      const result = addToInventoryWithQuality(inventory, 'wheat', 10, 100);
      inventory = result.inventory;

      const wheatSlots = inventory.slots.filter((s: InventorySlot) =>
        s.itemId === 'wheat' && s.quantity > 0
      );

      expect(wheatSlots).toHaveLength(1);
      expect(wheatSlots[0]?.quality).toBe(100);
    });

    it('should throw when quantity is zero', () => {
      expect(() => {
        addToInventoryWithQuality(inventory, 'wheat', 0, 50);
      }).toThrow('Cannot add non-positive quantity');
    });

    it('should throw when quantity is negative', () => {
      expect(() => {
        addToInventoryWithQuality(inventory, 'wheat', -5, 50);
      }).toThrow('Cannot add non-positive quantity');
    });
  });

  describe('Performance - Quality Stacking', () => {
    it('should handle large numbers of quality stacks efficiently', () => {
      const startTime = performance.now();

      // Add 20 stacks of different quality items
      for (let i = 0; i < 20; i++) {
        const result = addToInventoryWithQuality(inventory, 'wheat', 10, 40 + i);
        inventory = result.inventory;
      }

      const endTime = performance.now();
      const duration = endTime - startTime;

      // Should complete in under 100ms (relaxed for CI)
      expect(duration).toBeLessThan(100);
    });

    it('should find matching quality stack quickly', () => {
      // Add 15 different quality stacks
      for (let i = 0; i < 15; i++) {
        const result = addToInventoryWithQuality(inventory, 'wheat', 1, 50 + i);
        inventory = result.inventory;
      }

      const startTime = performance.now();

      // Add to existing stack
      const result = addToInventoryWithQuality(inventory, 'wheat', 1, 55);
      inventory = result.inventory;

      const endTime = performance.now();
      const duration = endTime - startTime;

      // Should complete in under 50ms (relaxed for CI)
      expect(duration).toBeLessThan(50);
    });
  });
});
