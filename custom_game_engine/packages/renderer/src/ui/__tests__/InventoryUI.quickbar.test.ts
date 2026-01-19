/**
 * InventoryUI Quick Bar Tests
 * Tests for quick bar assignment functionality
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { InventoryUI } from '../InventoryUI.js';
import { createMockWorld } from '@ai-village/core';
import type { InventoryComponent } from '@ai-village/core';

describe('InventoryUI - Quick Bar', () => {
  let inventoryUI: InventoryUI;
  let canvas: HTMLCanvasElement;
  let world: ReturnType<typeof createMockWorld>;

  beforeEach(() => {
    // Create mock canvas
    canvas = document.createElement('canvas');
    canvas.width = 800;
    canvas.height = 600;

    // Create mock world
    world = createMockWorld();

    // Create InventoryUI instance
    inventoryUI = new InventoryUI(canvas, world);

    // Set up mock inventory
    const mockInventory: InventoryComponent = {
      type: 'inventory',
      version: 1,
      slots: [
        { itemId: 'sword', quantity: 1, quality: 0.8 },
        { itemId: 'potion', quantity: 5, quality: 0.5 },
        { itemId: 'wood', quantity: 100 },
        { itemId: null, quantity: 0 },
      ],
      maxSlots: 4,
      maxWeight: 100,
      currentWeight: 50,
    };

    inventoryUI.setPlayerInventory(mockInventory);
  });

  describe('assignQuickBarSlot', () => {
    it('should assign a backpack slot to a quick bar slot', () => {
      inventoryUI.assignQuickBarSlot(0, 0); // Assign slot 0 (sword) to quick bar 0

      expect(inventoryUI.getQuickBarAssignment(0)).toBe(0);
    });

    it('should throw error for invalid quick bar index', () => {
      expect(() => inventoryUI.assignQuickBarSlot(-1, 0)).toThrow();
      expect(() => inventoryUI.assignQuickBarSlot(10, 0)).toThrow();
    });

    it('should throw error for invalid backpack slot index', () => {
      expect(() => inventoryUI.assignQuickBarSlot(0, -1)).toThrow();
      expect(() => inventoryUI.assignQuickBarSlot(0, 100)).toThrow();
    });

    it('should allow reassigning a quick bar slot', () => {
      inventoryUI.assignQuickBarSlot(0, 0);
      inventoryUI.assignQuickBarSlot(0, 1);

      expect(inventoryUI.getQuickBarAssignment(0)).toBe(1);
    });
  });

  describe('unassignQuickBarSlot', () => {
    it('should unassign a quick bar slot', () => {
      inventoryUI.assignQuickBarSlot(0, 0);
      inventoryUI.unassignQuickBarSlot(0);

      expect(inventoryUI.getQuickBarAssignment(0)).toBe(null);
    });

    it('should throw error for invalid quick bar index', () => {
      expect(() => inventoryUI.unassignQuickBarSlot(-1)).toThrow();
      expect(() => inventoryUI.unassignQuickBarSlot(10)).toThrow();
    });
  });

  describe('getQuickBarAssignment', () => {
    it('should return null for unassigned slots', () => {
      expect(inventoryUI.getQuickBarAssignment(0)).toBe(null);
    });

    it('should return assigned backpack slot index', () => {
      inventoryUI.assignQuickBarSlot(5, 2);

      expect(inventoryUI.getQuickBarAssignment(5)).toBe(2);
    });

    it('should throw error for invalid quick bar index', () => {
      expect(() => inventoryUI.getQuickBarAssignment(-1)).toThrow();
      expect(() => inventoryUI.getQuickBarAssignment(10)).toThrow();
    });
  });

  describe('getQuickBarAssignments', () => {
    it('should return array of all assignments', () => {
      inventoryUI.assignQuickBarSlot(0, 0);
      inventoryUI.assignQuickBarSlot(1, 1);
      inventoryUI.assignQuickBarSlot(5, 2);

      const assignments = inventoryUI.getQuickBarAssignments();

      expect(assignments).toHaveLength(10);
      expect(assignments[0]).toBe(0);
      expect(assignments[1]).toBe(1);
      expect(assignments[2]).toBe(null);
      expect(assignments[5]).toBe(2);
    });

    it('should return copy of assignments array', () => {
      const assignments1 = inventoryUI.getQuickBarAssignments();
      assignments1[0] = 999; // Modify copy

      const assignments2 = inventoryUI.getQuickBarAssignments();
      expect(assignments2[0]).toBe(null); // Original unchanged
    });
  });
});
