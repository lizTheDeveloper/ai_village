import type { World, InventoryComponent, InventorySlot } from '@ai-village/core';
import { calculateInventoryWeight } from '@ai-village/core';
import { getQualityTier, getQualityColor } from '@ai-village/core';
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

  // Quick bar assignments (slot index 0-9 -> backpack slot index)
  private quickBarAssignments: (number | null)[] = [null, null, null, null, null, null, null, null, null, null];

  constructor(_canvas: HTMLCanvasElement, world: World) {
    this.world = world;

    // Initialize subsystems
    this.dragDrop = new DragDropSystem();
    this.search = new InventorySearch();
    this.tooltip = new ItemTooltip();

    // Wire up event emitter
    if (this.world.eventBus && typeof this.world.eventBus.emit === 'function') {
      this.dragDrop.setEventEmitter((event, data) => {
        // Emit as a game event with proper type checking
        // Event types validated against EventMap
        if (event === 'item:equipped' || event === 'item:transferred' || event === 'item:dropped') {
          this.world.eventBus.emit({
            type: event,
            source: 'player',
            data,
          });
        } else {
          console.warn(`[InventoryUI] Unknown event type: ${event}`);
        }
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

    return this.playerInventory.slots.map((slot: InventorySlot) => ({
      itemId: slot.itemId,
      quantity: slot.quantity,
    }));
  }

  /**
   * Handle mouse move for tooltips
   * Returns true if inventory is open (to prevent other tooltips)
   */
  public handleMouseMove(x: number, y: number, canvasWidth: number, canvasHeight: number): boolean {
    if (!this.isOpenState || !this.playerInventory) {
      this.hoveredSlot = null;
      return false;
    }

    // Store canvas dimensions for getSlotAtPosition
    this.lastCanvasWidth = canvasWidth;
    this.lastCanvasHeight = canvasHeight;

    // Calculate panel bounds (same as in render and handleClick)
    const panelWidth = Math.min(800, canvasWidth - 40);
    const panelHeight = Math.min(600, canvasHeight - 40);
    const panelX = (canvasWidth - panelWidth) / 2;
    const panelY = (canvasHeight - panelHeight) / 2;

    // Check if mouse is inside panel
    const isInsidePanel =
      x >= panelX &&
      x <= panelX + panelWidth &&
      y >= panelY &&
      y <= panelY + panelHeight;

    if (!isInsidePanel) {
      this.hoveredSlot = null;
      return true; // Inventory open, but mouse not over it
    }

    // Check if mouse is over a backpack slot
    const slotRef = this.getSlotAtPosition(x, y);

    if (slotRef && slotRef.index !== undefined) {
      const slot = this.playerInventory.slots[slotRef.index];

      if (slot && slot.itemId) {
        // Mouse is over an item - show tooltip
        const wasHovering = this.hoveredSlot?.index === slotRef.index;
        this.hoveredSlot = slotRef;

        // Only log when starting to hover (not every frame)
        if (!wasHovering) {
        }

        const tooltipItem: TooltipItem = {
          itemId: slot.itemId,
          quantity: slot.quantity,
          quality: slot.quality,
        };

        this.tooltip.setItem(tooltipItem);
        this.tooltip.setPosition(x, y, {
          screenWidth: canvasWidth,
          screenHeight: canvasHeight,
        });
        return true;
      }
    }

    // Mouse is inside panel but not over an item
    this.hoveredSlot = null;
    return true; // Inventory open
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
      (slot: InventorySlot) => slot.itemId !== null && slot.quantity > 0
    ).length;

    // CRITICAL FIX: Always recalculate weight from actual slot contents
    // This prevents displaying incorrect weights from stale cached values
    // Use the official calculateInventoryWeight function to ensure consistency
    const actualWeight = calculateInventoryWeight(this.playerInventory);

    const capacityPercent = (actualWeight / this.playerInventory.maxWeight) * 100;

    let color = 'white';
    if (capacityPercent >= 100) {
      color = 'red';
    } else if (capacityPercent >= 80) {
      color = 'yellow';
    }

    return {
      slotsUsed,
      maxSlots: this.playerInventory.maxSlots,
      currentWeight: actualWeight,
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
   * Handle mouse click on inventory UI
   * Returns true if click was handled (should block game canvas interaction)
   */
  public handleClick(screenX: number, screenY: number, button: number, canvasWidth: number, canvasHeight: number): boolean {
    if (!this.isOpenState) {
      return false; // Inventory not open, don't handle
    }

    // IMPORTANT: When inventory is open, ALWAYS consume clicks to prevent game interaction
    // Even if clicking outside the panel (which closes it), we still handled the click
    // Store canvas dimensions for getSlotAtPosition
    this.lastCanvasWidth = canvasWidth;
    this.lastCanvasHeight = canvasHeight;

    // Calculate panel bounds
    const panelWidth = Math.min(800, canvasWidth - 40);
    const panelHeight = Math.min(600, canvasHeight - 40);
    const panelX = (canvasWidth - panelWidth) / 2;
    const panelY = (canvasHeight - panelHeight) / 2;
    // Check if click is inside inventory panel bounds
    const isInsidePanel =
      screenX >= panelX &&
      screenX <= panelX + panelWidth &&
      screenY >= panelY &&
      screenY <= panelY + panelHeight;


    if (!isInsidePanel) {
      // Click outside panel - close inventory (backdrop click)
      this.isOpenState = false;
      return true; // Consumed the click
    }

    // Click is inside panel - handle item interaction
    // Check if clicking on a backpack slot
    const clickedSlot = this.getSlotAtPosition(screenX, screenY);
    if (clickedSlot && clickedSlot.index !== undefined && this.playerInventory) {
      const slot = this.playerInventory.slots[clickedSlot.index];
      if (button === 0) {
        // Left click - start drag or select item
        if (slot && slot.itemId && slot.quantity > 0) {
          this.startDrag(clickedSlot.index, screenX, screenY);
        }
      } else if (button === 2) {
        // Right click - context menu (not implemented yet)
      }
    }

    return true; // Always consume clicks inside inventory panel
  }

  /**
   * Render the inventory UI to canvas
   */
  public render(ctx: CanvasRenderingContext2D, canvasWidth: number, canvasHeight: number): void {
    if (!this.isOpenState) {
      return; // Don't render if closed
    }

    // Store canvas dimensions for slot position calculations
    this.lastCanvasWidth = canvasWidth;
    this.lastCanvasHeight = canvasHeight;

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

    // Equipment slots - render all 11 slots in two columns around character preview
    // This ensures all slots are visible in a more compact layout
    const equipSlotY = sectionY + 30;
    const equipSlotSize = 36; // Compact slots to fit layout
    const equipSlotSpacing = 4;

    ctx.strokeStyle = '#4a4540';
    ctx.lineWidth = 2;

    // Character preview in center
    const previewWidth = 80;
    const previewHeight = 120;
    const previewX = equipmentX + 70;
    const previewY = equipSlotY + 40;
    ctx.fillStyle = '#3a3530';
    ctx.fillRect(previewX, previewY, previewWidth, previewHeight);
    ctx.strokeStyle = '#666';
    ctx.lineWidth = 2;
    ctx.strokeRect(previewX, previewY, previewWidth, previewHeight);
    ctx.fillStyle = '#888';
    ctx.font = '11px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('Character', previewX + previewWidth / 2, previewY + previewHeight / 2 - 5);
    ctx.font = '9px monospace';
    ctx.fillStyle = '#666';
    ctx.fillText('Preview', previewX + previewWidth / 2, previewY + previewHeight / 2 + 8);

    // Slot layout: arranged around character preview
    // Left column: head, chest, legs, feet, hands (5 slots)
    // Right column: main_hand, off_hand, back, neck, ring_left, ring_right (6 slots)
    const leftSlots = ['head', 'chest', 'legs', 'feet', 'hands'];
    const rightSlots = ['main_hand', 'off_hand', 'back', 'neck', 'ring_left', 'ring_right'];

    // Draw left column
    for (let i = 0; i < leftSlots.length; i++) {
      const slotName = leftSlots[i];
      if (!slotName) continue; // Skip undefined slots

      const slotX = equipmentX;
      const slotY = equipSlotY + i * (equipSlotSize + equipSlotSpacing);

      // Draw empty slot
      ctx.fillStyle = '#2a2520';
      ctx.fillRect(slotX, slotY, equipSlotSize, equipSlotSize);
      ctx.strokeStyle = '#4a4540';
      ctx.lineWidth = 2;
      ctx.strokeRect(slotX, slotY, equipSlotSize, equipSlotSize);

      // Draw slot label (abbreviated to fit)
      ctx.fillStyle = '#AAA';
      ctx.font = '9px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      const displayName = slotName.toUpperCase().replace(/_/g, ' ');
      ctx.fillText(displayName, slotX + equipSlotSize / 2, slotY + equipSlotSize + 2);
    }

    // Draw right column
    for (let i = 0; i < rightSlots.length; i++) {
      const slotName = rightSlots[i];
      if (!slotName) continue; // Skip undefined slots

      const slotX = previewX + previewWidth + 10;
      const slotY = equipSlotY + i * (equipSlotSize + equipSlotSpacing);

      // Draw empty slot
      ctx.fillStyle = '#2a2520';
      ctx.fillRect(slotX, slotY, equipSlotSize, equipSlotSize);
      ctx.strokeStyle = '#4a4540';
      ctx.lineWidth = 2;
      ctx.strokeRect(slotX, slotY, equipSlotSize, equipSlotSize);

      // Draw slot label (abbreviated to fit)
      ctx.fillStyle = '#AAA';
      ctx.font = '9px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      const displayName = slotName.toUpperCase().replace(/_/g, ' ');
      ctx.fillText(displayName, slotX + equipSlotSize / 2, slotY + equipSlotSize + 2);
    }

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
            // Highlight slot if it's being hovered (for tooltip debugging)
            const isHovered = this.hoveredSlot?.index === slotIndex;
            if (isHovered) {
              ctx.strokeStyle = '#FFD700'; // Gold border when hovered
              ctx.lineWidth = 3;
              ctx.strokeRect(slotX, slotY, slotSize, slotSize);
              ctx.strokeStyle = '#4a4540'; // Reset
              ctx.lineWidth = 2;
            }

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

            // Draw quality badge (Phase 10)
            if (slot.quality !== undefined) {
              const qualityTier = getQualityTier(slot.quality);
              const qualityColor = getQualityColor(qualityTier);

              // Draw quality indicator in top-right corner
              ctx.fillStyle = qualityColor;
              ctx.beginPath();
              ctx.arc(slotX + slotSize - 6, slotY + 6, 4, 0, Math.PI * 2);
              ctx.fill();

              // Add border to quality dot
              ctx.strokeStyle = '#000';
              ctx.lineWidth = 1;
              ctx.stroke();
            }
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

      // Draw quick bar item if assigned
      const assignedBackpackSlot = this.quickBarAssignments[i];
      if (assignedBackpackSlot !== null && assignedBackpackSlot !== undefined && this.playerInventory && assignedBackpackSlot < this.playerInventory.slots.length) {
        const slot = this.playerInventory.slots[assignedBackpackSlot];
        if (slot && slot.itemId && slot.quantity > 0) {
          // Draw item icon (simplified - just text for now)
          ctx.fillStyle = '#FFD700';
          ctx.font = 'bold 12px monospace';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(slot.itemId.substring(0, 4).toUpperCase(), slotX + slotSize / 2, quickBarSlotY + slotSize / 2 - 6);

          // Draw quantity
          ctx.fillStyle = '#FFF';
          ctx.font = '10px monospace';
          ctx.textAlign = 'right';
          ctx.textBaseline = 'top';
          ctx.fillText(slot.quantity.toString(), slotX + slotSize - 4, quickBarSlotY + 4);

          // Draw quality badge if present
          if (slot.quality !== undefined) {
            const qualityTier = getQualityTier(slot.quality);
            const qualityColor = getQualityColor(qualityTier);

            // Draw quality indicator in top-left corner
            ctx.fillStyle = qualityColor;
            ctx.beginPath();
            ctx.arc(slotX + 6, quickBarSlotY + 6, 3, 0, Math.PI * 2);
            ctx.fill();

            // Add border to quality dot
            ctx.strokeStyle = '#000';
            ctx.lineWidth = 1;
            ctx.stroke();
          }
        }
      }
    }

    // Render tooltip if hovering over item
    // NOTE: Tooltip rendering happens LAST so it draws on top of everything
    if (this.hoveredSlot && this.playerInventory) {
      this.renderTooltip(ctx);
    }
  }

  /**
   * Render tooltip for hovered item
   * SIMPLIFIED: Always shows basic info even if ItemTooltip not fully initialized
   */
  private renderTooltip(ctx: CanvasRenderingContext2D): void {
    if (!this.hoveredSlot || !this.playerInventory) {
      return;
    }

    // Get slot and item
    const slotIndex = this.hoveredSlot.index;
    if (slotIndex === undefined || slotIndex >= this.playerInventory.slots.length) {
      return;
    }

    const slot = this.playerInventory.slots[slotIndex];
    if (!slot || !slot.itemId) {
      return;
    }

    // Get tooltip position
    const pos = this.tooltip.getPosition();

    // Build basic tooltip content (fallback if ItemTooltip fails)
    const lines: string[] = [];
    let nameColor = '#9d9d9d'; // default gray

    // Try to get rich content from ItemTooltip
    try {
      const content = this.tooltip.getContent();
      const rendering = this.tooltip.getRendering();
      nameColor = rendering.nameColor;

      lines.push(content.name);
      if (content.rarity) {
        lines.push(`Rarity: ${content.rarity}`);
      }
      if (content.type) {
        lines.push(`Type: ${content.type}`);
      }
      if (content.description) {
        lines.push('');
        lines.push(content.description);
      }
      if (content.value !== undefined) {
        lines.push('');
        lines.push(`Value: ${content.value} gold`);
      }

      // Add stats
      for (const line of rendering.lines) {
        lines.push(`${line.label}: ${line.text}`);
      }
    } catch (error) {
      // Fallback: Show basic item info if ItemTooltip fails
      const itemName = slot.itemId.split('_').map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
      lines.push(itemName);
      lines.push(`Quantity: ${slot.quantity}`);
      if (slot.quality !== undefined) {
        lines.push(`Quality: ${slot.quality}`);
      }
    }

    // Calculate tooltip size
    const tooltipWidth = 220;
    const lineHeight = 18;
    const padding = 10;
    const tooltipHeight = lines.length * lineHeight + padding * 2;

    // Draw tooltip background
    ctx.fillStyle = 'rgba(20, 15, 10, 0.95)';
    ctx.fillRect(pos.x, pos.y, tooltipWidth, tooltipHeight);

    // Draw tooltip border (use item rarity color)
    ctx.strokeStyle = nameColor;
    ctx.lineWidth = 2;
    ctx.strokeRect(pos.x, pos.y, tooltipWidth, tooltipHeight);

    // Draw tooltip text
    ctx.font = '14px monospace';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';

    let currentY = pos.y + padding;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (!line) {
        continue;
      }

      // First line (name) uses rarity color and bold
      if (i === 0) {
        ctx.fillStyle = nameColor;
        ctx.font = 'bold 14px monospace';
      } else {
        ctx.fillStyle = '#DDD';
        ctx.font = '14px monospace';
      }

      ctx.fillText(line, pos.x + padding, currentY);
      currentY += lineHeight;
    }
  }

  // Private helper methods

  /**
   * Get slot at screen position
   * Calculates which backpack or equipment slot the mouse is over
   * IMPORTANT: x and y are in CSS pixels, canvasWidth/Height from last render call
   */
  private getSlotAtPosition(x: number, y: number): SlotReference | null {
    if (!this.lastCanvasWidth || !this.lastCanvasHeight) {
      return null;
    }

    // Calculate panel bounds (same as in render)
    const panelWidth = Math.min(800, this.lastCanvasWidth - 40);
    const panelHeight = Math.min(600, this.lastCanvasHeight - 40);
    const panelX = (this.lastCanvasWidth - panelWidth) / 2;
    const panelY = (this.lastCanvasHeight - panelHeight) / 2;

    // Calculate backpack grid position
    const backpackX = panelX + panelWidth / 2;
    const sectionY = panelY + 60;

    // Search box area (top right of backpack) - for reference, not used in slot detection yet
    const searchBoxHeight = 24;
    const searchBoxY = sectionY - 4;

    // Filter controls area
    const filterY = searchBoxY + searchBoxHeight + 8;
    const filterButtonHeight = 20;

    // Grid starts below filters
    const gridStartY = filterY + filterButtonHeight + 12;
    const slotSize = this.gridLayout.slotSize;
    const spacing = this.gridLayout.spacing;

    // Check if mouse is over backpack grid
    for (let row = 0; row < this.gridLayout.rows; row++) {
      for (let col = 0; col < this.gridLayout.columns; col++) {
        const slotIndex = row * this.gridLayout.columns + col;
        const slotX = backpackX + col * (slotSize + spacing);
        const slotY = gridStartY + row * (slotSize + spacing);

        if (
          x >= slotX &&
          x <= slotX + slotSize &&
          y >= slotY &&
          y <= slotY + slotSize
        ) {
          return { type: 'backpack', index: slotIndex };
        }
      }
    }

    // Check equipment slots
    const equipmentX = panelX + 20;
    const equipSlotY = sectionY + 30;
    const equipSlotSize = 36;
    const equipSlotSpacing = 4;
    const previewWidth = 80;
    const previewX = equipmentX + 70;

    const leftSlots = ['head', 'chest', 'legs', 'feet', 'hands'];
    const rightSlots = ['main_hand', 'off_hand', 'back', 'neck', 'ring_left', 'ring_right'];

    // Check left column equipment slots
    for (let i = 0; i < leftSlots.length; i++) {
      const slotName = leftSlots[i];
      if (!slotName) continue;

      const slotX = equipmentX;
      const slotY = equipSlotY + i * (equipSlotSize + equipSlotSpacing);

      if (
        x >= slotX &&
        x <= slotX + equipSlotSize &&
        y >= slotY &&
        y <= slotY + equipSlotSize
      ) {
        return { type: 'equipment', slot: slotName };
      }
    }

    // Check right column equipment slots
    for (let i = 0; i < rightSlots.length; i++) {
      const slotName = rightSlots[i];
      if (!slotName) continue;

      const slotX = previewX + previewWidth + 10;
      const slotY = equipSlotY + i * (equipSlotSize + equipSlotSpacing);

      if (
        x >= slotX &&
        x <= slotX + equipSlotSize &&
        y >= slotY &&
        y <= slotY + equipSlotSize
      ) {
        return { type: 'equipment', slot: slotName };
      }
    }

    // Check quick bar slots
    const quickBarY = panelY + panelHeight - 80;
    const quickBarStartX = panelX + (panelWidth - (10 * (slotSize + spacing))) / 2;
    const quickBarSlotY = quickBarY + 25;

    for (let i = 0; i < 10; i++) {
      const slotX = quickBarStartX + i * (slotSize + spacing);

      if (
        x >= slotX &&
        x <= slotX + slotSize &&
        y >= quickBarSlotY &&
        y <= quickBarSlotY + slotSize
      ) {
        return { type: 'quickbar', index: i };
      }
    }

    return null;
  }

  // Store last canvas dimensions for slot position calculations
  private lastCanvasWidth: number = 0;
  private lastCanvasHeight: number = 0;

  /**
   * Assign a backpack slot to a quick bar slot
   * @param quickBarIndex Quick bar slot (0-9)
   * @param backpackSlotIndex Backpack slot index to assign
   */
  public assignQuickBarSlot(quickBarIndex: number, backpackSlotIndex: number): void {
    if (quickBarIndex < 0 || quickBarIndex >= 10) {
      throw new Error(`InventoryUI.assignQuickBarSlot: quickBarIndex ${quickBarIndex} out of range (0-9)`);
    }

    if (!this.playerInventory) {
      throw new Error('InventoryUI.assignQuickBarSlot: no inventory set');
    }

    if (backpackSlotIndex < 0 || backpackSlotIndex >= this.playerInventory.slots.length) {
      throw new Error(`InventoryUI.assignQuickBarSlot: backpackSlotIndex ${backpackSlotIndex} out of range`);
    }

    this.quickBarAssignments[quickBarIndex] = backpackSlotIndex;
  }

  /**
   * Unassign a quick bar slot
   * @param quickBarIndex Quick bar slot (0-9)
   */
  public unassignQuickBarSlot(quickBarIndex: number): void {
    if (quickBarIndex < 0 || quickBarIndex >= 10) {
      throw new Error(`InventoryUI.unassignQuickBarSlot: quickBarIndex ${quickBarIndex} out of range (0-9)`);
    }

    this.quickBarAssignments[quickBarIndex] = null;
  }

  /**
   * Get backpack slot assigned to a quick bar slot
   * @param quickBarIndex Quick bar slot (0-9)
   * @returns Backpack slot index or null if not assigned
   */
  public getQuickBarAssignment(quickBarIndex: number): number | null {
    if (quickBarIndex < 0 || quickBarIndex >= 10) {
      throw new Error(`InventoryUI.getQuickBarAssignment: quickBarIndex ${quickBarIndex} out of range (0-9)`);
    }

    const assignment = this.quickBarAssignments[quickBarIndex];
    return assignment ?? null;
  }

  /**
   * Get all quick bar assignments
   * @returns Array of backpack slot indices (null = not assigned)
   */
  public getQuickBarAssignments(): (number | null)[] {
    return [...this.quickBarAssignments];
  }
}
