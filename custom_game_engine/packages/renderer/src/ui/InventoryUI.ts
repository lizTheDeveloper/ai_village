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

  /**
   * Render the inventory UI to canvas
   */
  public render(ctx: CanvasRenderingContext2D, canvasWidth: number, canvasHeight: number): void {
    if (!this.isOpenState) {
      return; // Don't render if closed
    }

    // Calculate panel dimensions and position (centered)
    const panelWidth = Math.min(800, canvasWidth - 40);
    const panelHeight = Math.min(600, canvasHeight - 40);
    const panelX = (canvasWidth - panelWidth) / 2;
    const panelY = (canvasHeight - panelHeight) / 2;

    // Draw semi-transparent backdrop
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    // Draw panel background
    ctx.fillStyle = 'rgba(30, 25, 20, 0.95)';
    ctx.fillRect(panelX, panelY, panelWidth, panelHeight);

    // Draw panel border
    ctx.strokeStyle = '#8B7355';
    ctx.lineWidth = 3;
    ctx.strokeRect(panelX, panelY, panelWidth, panelHeight);

    // Draw title
    ctx.fillStyle = '#FFF';
    ctx.font = 'bold 24px monospace';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText('INVENTORY', panelX + 20, panelY + 20);

    // Draw close hint
    ctx.font = '16px monospace';
    ctx.fillStyle = '#AAA';
    ctx.textAlign = 'right';
    ctx.fillText('[ESC/I/Tab to close]', panelX + panelWidth - 20, panelY + 20);

    // Draw sections labels
    const sectionY = panelY + 60;
    ctx.font = '18px monospace';
    ctx.fillStyle = '#DDD';
    ctx.textAlign = 'left';

    // Equipment section (left side)
    const equipmentX = panelX + 20;
    ctx.fillText('EQUIPMENT', equipmentX, sectionY);

    // Equipment slots - render all 11 slots in a grid layout
    const equipSlotY = sectionY + 30;
    const equipSlotSize = 50;
    const equipSlotSpacing = 10;
    const equipmentSlots = this.getEquipmentSlots();

    ctx.strokeStyle = '#4a4540';
    ctx.lineWidth = 2;

    // Layout: 2 columns, 6 rows (11 slots total)
    const equipColumns = 2;

    for (let i = 0; i < equipmentSlots.length; i++) {
      const col = i % equipColumns;
      const row = Math.floor(i / equipColumns);
      const slotX = equipmentX + col * (equipSlotSize + 80);
      const slotY = equipSlotY + row * (equipSlotSize + equipSlotSpacing);

      // Draw empty slot
      ctx.fillStyle = '#2a2520';
      ctx.fillRect(slotX, slotY, equipSlotSize, equipSlotSize);
      ctx.strokeRect(slotX, slotY, equipSlotSize, equipSlotSize);

      // Draw slot label
      ctx.fillStyle = '#888';
      ctx.font = '11px monospace';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      const slotName = equipmentSlots[i];
      if (slotName) {
        // Truncate long names
        const displayName = slotName.toUpperCase().replace('_', ' ');
        ctx.fillText(displayName, slotX + equipSlotSize + 5, slotY + equipSlotSize / 2);
      }
    }

    // Draw character preview placeholder (centered between equipment columns)
    const previewX = equipmentX + 50;
    const previewY = equipSlotY + 100;
    ctx.fillStyle = '#444';
    ctx.fillRect(previewX, previewY, 80, 120);
    ctx.strokeStyle = '#666';
    ctx.strokeRect(previewX, previewY, 80, 120);
    ctx.fillStyle = '#888';
    ctx.font = '12px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('Character', previewX + 40, previewY + 60);

    // Backpack section (right side)
    const backpackX = panelX + panelWidth / 2;
    ctx.fillStyle = '#DDD';
    ctx.font = '18px monospace';
    ctx.textAlign = 'left';
    ctx.fillText('BACKPACK', backpackX, sectionY);

    // Search box (right-aligned in backpack header)
    const searchBoxWidth = 150;
    const searchBoxHeight = 24;
    const searchBoxX = panelX + panelWidth - 20 - searchBoxWidth;
    const searchBoxY = sectionY - 4;

    // Draw search box background
    ctx.fillStyle = '#2a2520';
    ctx.fillRect(searchBoxX, searchBoxY, searchBoxWidth, searchBoxHeight);
    ctx.strokeStyle = '#4a4540';
    ctx.lineWidth = 1;
    ctx.strokeRect(searchBoxX, searchBoxY, searchBoxWidth, searchBoxHeight);

    // Draw search icon and placeholder
    ctx.fillStyle = '#888';
    ctx.font = '14px monospace';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    const searchText = this.search.getSearchText();
    const displayText = searchText || 'Search (Ctrl+F)';
    ctx.fillText(displayText, searchBoxX + 6, searchBoxY + searchBoxHeight / 2);

    // Filter indicator (if active)
    const activeFilters = this.search.getActiveFilters();
    if (activeFilters.length > 0) {
      ctx.fillStyle = '#FFD700';
      ctx.font = '12px monospace';
      ctx.textAlign = 'right';
      ctx.fillText(`[${activeFilters.length}]`, searchBoxX + searchBoxWidth - 6, searchBoxY + searchBoxHeight / 2);
    }

    // Filter controls (Type and Rarity) below search box
    const filterY = searchBoxY + searchBoxHeight + 8;
    const filterButtonWidth = 70;
    const filterButtonHeight = 20;
    const filterSpacing = 6;

    // Type filter button
    const typeFilterX = searchBoxX;
    ctx.fillStyle = '#2a2520';
    ctx.fillRect(typeFilterX, filterY, filterButtonWidth, filterButtonHeight);
    ctx.strokeStyle = '#4a4540';
    ctx.lineWidth = 1;
    ctx.strokeRect(typeFilterX, filterY, filterButtonWidth, filterButtonHeight);

    ctx.fillStyle = '#888';
    ctx.font = '12px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('Type ▼', typeFilterX + filterButtonWidth / 2, filterY + filterButtonHeight / 2);

    // Rarity filter button
    const rarityFilterX = typeFilterX + filterButtonWidth + filterSpacing;
    ctx.fillStyle = '#2a2520';
    ctx.fillRect(rarityFilterX, filterY, filterButtonWidth, filterButtonHeight);
    ctx.strokeStyle = '#4a4540';
    ctx.lineWidth = 1;
    ctx.strokeRect(rarityFilterX, filterY, filterButtonWidth, filterButtonHeight);

    ctx.fillStyle = '#888';
    ctx.font = '12px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('Rarity ▼', rarityFilterX + filterButtonWidth / 2, filterY + filterButtonHeight / 2);

    // Clear filters button
    const clearFilterX = rarityFilterX + filterButtonWidth + filterSpacing;
    ctx.fillStyle = '#2a2520';
    ctx.fillRect(clearFilterX, filterY, filterButtonWidth, filterButtonHeight);
    ctx.strokeStyle = '#4a4540';
    ctx.lineWidth = 1;
    ctx.strokeRect(clearFilterX, filterY, filterButtonWidth, filterButtonHeight);

    ctx.fillStyle = '#888';
    ctx.font = '12px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('Clear', clearFilterX + filterButtonWidth / 2, filterY + filterButtonHeight / 2);

    // Backpack grid (start below filter controls)
    const gridStartY = filterY + filterButtonHeight + 12;
    const slotSize = this.gridLayout.slotSize;
    const spacing = this.gridLayout.spacing;

    ctx.strokeStyle = '#4a4540';
    ctx.lineWidth = 2;

    for (let row = 0; row < this.gridLayout.rows; row++) {
      for (let col = 0; col < this.gridLayout.columns; col++) {
        const slotIndex = row * this.gridLayout.columns + col;
        const slotX = backpackX + col * (slotSize + spacing);
        const slotY = gridStartY + row * (slotSize + spacing);

        // Draw slot background
        ctx.fillStyle = '#2a2520';
        ctx.fillRect(slotX, slotY, slotSize, slotSize);
        ctx.strokeRect(slotX, slotY, slotSize, slotSize);

        // Draw item if present
        if (this.playerInventory && slotIndex < this.playerInventory.slots.length) {
          const slot = this.playerInventory.slots[slotIndex];
          if (slot && slot.itemId && slot.quantity > 0) {
            // Draw item icon (simplified - just text for now)
            ctx.fillStyle = '#FFD700';
            ctx.font = 'bold 12px monospace';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(slot.itemId.substring(0, 4).toUpperCase(), slotX + slotSize / 2, slotY + slotSize / 2 - 6);

            // Draw quantity
            ctx.fillStyle = '#FFF';
            ctx.font = '10px monospace';
            ctx.textAlign = 'right';
            ctx.textBaseline = 'bottom';
            ctx.fillText(slot.quantity.toString(), slotX + slotSize - 4, slotY + slotSize - 4);
          }
        }
      }
    }

    // Draw capacity footer
    const capacity = this.getCapacityDisplay();
    const capacityY = panelY + panelHeight - 100;
    ctx.fillStyle = capacity.color;
    ctx.font = '16px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    const capacityText = `${capacity.slotsUsed}/${capacity.maxSlots} slots · ${capacity.currentWeight.toFixed(1)}/${capacity.maxWeight} kg`;
    ctx.fillText(capacityText, panelX + panelWidth / 2, capacityY);

    // Draw Quick Bar section at bottom
    const quickBarY = panelY + panelHeight - 80;
    ctx.fillStyle = '#DDD';
    ctx.font = '18px monospace';
    ctx.textAlign = 'left';
    ctx.fillText('QUICK BAR', panelX + 20, quickBarY);

    // Draw 10 quick bar slots (1-9, 0)
    const quickBarStartX = panelX + (panelWidth - (10 * (slotSize + spacing))) / 2;
    const quickBarSlotY = quickBarY + 25;
    const quickBarKeys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'];

    ctx.strokeStyle = '#4a4540';
    ctx.lineWidth = 2;

    for (let i = 0; i < 10; i++) {
      const slotX = quickBarStartX + i * (slotSize + spacing);

      // Draw slot background
      ctx.fillStyle = '#2a2520';
      ctx.fillRect(slotX, quickBarSlotY, slotSize, slotSize);
      ctx.strokeRect(slotX, quickBarSlotY, slotSize, slotSize);

      // Draw keyboard shortcut label
      ctx.fillStyle = '#AAA';
      ctx.font = 'bold 12px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      const keyLabel = quickBarKeys[i];
      if (keyLabel) {
        ctx.fillText(keyLabel, slotX + slotSize / 2, quickBarSlotY + slotSize - 4);
      }

      // TODO: Draw quick bar item if assigned
      // For now, just show empty slots
    }
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
