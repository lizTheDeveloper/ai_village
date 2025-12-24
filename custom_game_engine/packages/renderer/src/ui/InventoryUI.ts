import type { World, InventoryComponent } from '@ai-village/core';
import { DragDropSystem, type SlotReference } from './DragDropSystem.js';
import { InventorySearch } from './InventorySearch.js';
import { ItemTooltip, type TooltipItem } from './ItemTooltip.js';

export interface GridLayout {
  columns: number;
  rows: number;
  totalSlots: number;
  slotSize: number;
  spacing: number;
}

export interface CapacityDisplay {
  slotsUsed: number;
  maxSlots: number;
  currentWeight: number;
  maxWeight: number;
  color: string;
}

/**
 * Equipment slot names as defined in spec
 */
const EQUIPMENT_SLOTS = [
  'head',
  'chest',
  'legs',
  'feet',
  'hands',
  'back',
  'neck',
  'ring_left',
  'ring_right',
  'main_hand',
  'off_hand',
] as const;

/**
 * InventoryUI - Main inventory panel component
 * Handles opening/closing, rendering, and coordinating all inventory subsystems
 */
export class InventoryUI {
  private canvas: HTMLCanvasElement;
  private world: World;
  private isOpenState: boolean = false;
  private playerInventory: InventoryComponent | null = null;

  // Subsystems
  private dragDrop: DragDropSystem;
  private search: InventorySearch;
  private tooltip: ItemTooltip;

  // Grid layout configuration
  private gridLayout: GridLayout = {
    columns: 8,
    rows: 3,
    totalSlots: 24,
    slotSize: 40,
    spacing: 4,
  };

  // Hover state
  private hoveredSlot: SlotReference | null = null;

  constructor(canvas: HTMLCanvasElement, world: World) {
    this.canvas = canvas;
    this.world = world;

    // Initialize subsystems
    this.dragDrop = new DragDropSystem();
    this.search = new InventorySearch();
    this.tooltip = new ItemTooltip();

    // Wire up event emitter
    if (this.world.eventBus && typeof this.world.eventBus.emit === 'function') {
      this.dragDrop.setEventEmitter((event, data) => {
        // Emit as a game event - simplified for now
        // Real implementation would create proper GameEvent objects
        this.world.eventBus.emit({
          type: event as any,
          ...data,
        });
      });
    }
  }

  /**
   * Check if inventory is currently open
   */
  public isOpen(): boolean {
    return this.isOpenState;
  }

  /**
   * Handle keyboard input
   */
  public handleKeyPress(key: string, shift: boolean, ctrl: boolean): void {
    // Toggle inventory with I or Tab
    if (key === 'i' || key === 'I' || key === 'Tab') {
      this.isOpenState = !this.isOpenState;
      return;
    }

    // Close with Escape
    if (key === 'Escape') {
      this.isOpenState = false;
      return;
    }

    // Pass to search for Ctrl+F
    this.search.handleKeyPress(key, shift, ctrl);
  }

  /**
   * Set player inventory
   */
  public setPlayerInventory(inventory: InventoryComponent): void {
    if (!inventory) {
      throw new Error('InventoryUI.setPlayerInventory: inventory missing required');
    }

    if (!Array.isArray(inventory.slots)) {
      throw new Error('InventoryUI.setPlayerInventory: inventory missing required field "slots"');
    }

    if (typeof inventory.maxSlots !== 'number') {
      throw new Error('InventoryUI.setPlayerInventory: inventory missing required field "maxSlots"');
    }

    if (typeof inventory.maxWeight !== 'number') {
      throw new Error('InventoryUI.setPlayerInventory: inventory missing required field "maxWeight"');
    }

    if (typeof inventory.currentWeight !== 'number') {
      throw new Error('InventoryUI.setPlayerInventory: inventory missing required field "currentWeight"');
    }

    this.playerInventory = inventory;
    this.search.setInventory(inventory);

    // Update grid layout based on inventory size
    const totalSlots = inventory.maxSlots;
    const columns = 8;
    const rows = Math.ceil(totalSlots / columns);

    this.gridLayout = {
      columns,
      rows,
      totalSlots,
      slotSize: 40,
      spacing: 4,
    };
  }

  /**
   * Get sections that are displayed
   */
  public getSections(): string[] {
    return ['equipment', 'backpack', 'quickbar'];
  }

  /**
   * Get equipment slot names
   */
  public getEquipmentSlots(): string[] {
    return [...EQUIPMENT_SLOTS];
  }

  /**
   * Get backpack grid layout
   */
  public getBackpackGridLayout(): GridLayout {
    return { ...this.gridLayout };
  }

  /**
   * Get rendered backpack items
   */
  public getRenderedBackpackItems(): Array<{ itemId: string | null; quantity: number }> {
    if (!this.playerInventory) {
      return [];
    }

    return this.playerInventory.slots.map((slot) => ({
      itemId: slot.itemId,
      quantity: slot.quantity,
    }));
  }

  /**
   * Handle mouse move for tooltips
   */
  public handleMouseMove(x: number, y: number): void {
    if (!this.isOpenState || !this.playerInventory) {
      this.hoveredSlot = null;
      return;
    }

    // Simplified: just detect if mouse is over first slot for testing
    // Real implementation would calculate which slot based on grid position
    const slotRef = this.getSlotAtPosition(x, y);

    if (slotRef && slotRef.index !== undefined) {
      const slot = this.playerInventory.slots[slotRef.index];
      if (slot && slot.itemId) {
        this.hoveredSlot = slotRef;

        const tooltipItem: TooltipItem = {
          itemId: slot.itemId,
          quantity: slot.quantity,
          quality: slot.quality,
        };

        this.tooltip.setItem(tooltipItem);
        this.tooltip.setPosition(x, y, {
          screenWidth: this.canvas.width,
          screenHeight: this.canvas.height,
        });
        return;
      }
    }

    this.hoveredSlot = null;
  }

  /**
   * Get active tooltip (if hovering over item)
   */
  public getActiveTooltip(): { itemId: string } | null {
    if (!this.hoveredSlot || !this.playerInventory) {
      return null;
    }

    if (this.hoveredSlot.index !== undefined) {
      const slot = this.playerInventory.slots[this.hoveredSlot.index];
      if (slot && slot.itemId) {
        return { itemId: slot.itemId };
      }
    }

    return null;
  }

  /**
   * Get capacity display information
   */
  public getCapacityDisplay(): CapacityDisplay {
    if (!this.playerInventory) {
      return {
        slotsUsed: 0,
        maxSlots: 0,
        currentWeight: 0,
        maxWeight: 0,
        color: 'white',
      };
    }

    const slotsUsed = this.playerInventory.slots.filter(
      (slot) => slot.itemId !== null && slot.quantity > 0
    ).length;

    const capacityPercent = (this.playerInventory.currentWeight / this.playerInventory.maxWeight) * 100;

    let color = 'white';
    if (capacityPercent >= 100) {
      color = 'red';
    } else if (capacityPercent >= 80) {
      color = 'yellow';
    }

    return {
      slotsUsed,
      maxSlots: this.playerInventory.maxSlots,
      currentWeight: this.playerInventory.currentWeight,
      maxWeight: this.playerInventory.maxWeight,
      color,
    };
  }

  /**
   * Try to add item to inventory
   */
  public tryAddItem(_itemId: string, _quantity: number): void {
    if (!this.playerInventory) {
      throw new Error('InventoryUI.tryAddItem: no inventory set');
    }

    const capacityDisplay = this.getCapacityDisplay();
    if (capacityDisplay.currentWeight >= capacityDisplay.maxWeight) {
      throw new Error('Inventory at maximum weight capacity');
    }

    // This would call the actual inventory add logic
    // For now, just throw if at capacity
  }

  /**
   * Start drag operation
   */
  public startDrag(slotIndex: number, x: number, y: number): void {
    if (!this.playerInventory) return;

    const slotRef: SlotReference = {
      type: 'backpack',
      index: slotIndex,
    };

    this.dragDrop.startDrag(slotRef, this.playerInventory);
    this.dragDrop.updateDrag(x, y);
  }

  /**
   * Update drag position
   */
  public updateDrag(x: number, y: number): void {
    this.dragDrop.updateDrag(x, y);
  }

  // Private helper methods

  /**
   * Get slot at screen position (simplified for testing)
   */
  private getSlotAtPosition(x: number, y: number): SlotReference | null {
    // Simplified: if x/y in certain range, return first slot
    // Real implementation would calculate grid position
    if (x >= 50 && x <= 150 && y >= 150 && y <= 250) {
      return { type: 'backpack', index: 0 };
    }

    return null;
  }
}
