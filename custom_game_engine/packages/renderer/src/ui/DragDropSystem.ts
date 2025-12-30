import type { InventoryComponent, InventorySlot } from '@ai-village/core';
import { itemRegistry } from '@ai-village/core';

export type SlotType = 'backpack' | 'equipment' | 'container' | 'quickbar';

export interface SlotReference {
  type: SlotType;
  index?: number;
  slot?: string; // For equipment slots (head, chest, etc.)
}

export interface ItemStack {
  itemId: string;
  quantity: number;
  quality?: number;
}

export interface DragState {
  isDragging: boolean;
  item: ItemStack | null;
  sourceSlot: SlotReference | null;
  ghostPosition: { x: number; y: number };
  validTargets: SlotReference[];
  splitMode?: boolean;
}

export interface SlotVisualState {
  dimmed: boolean;
  highlighted: boolean;
  invalidTarget: boolean;
  borderColor: string;
}

export interface DropResult {
  success: boolean;
  updatedInventory: InventoryComponent;
  equipped?: { slot: string; itemId: string };
  error?: string;
}

export interface SplitDialogState {
  enabled: boolean;
  min: number;
  max: number;
  current: number;
}

/**
 * Equipment slot types as defined in the spec
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
 * Item type to equipment slot mapping
 * This is a simplified version - real implementation would come from item definitions
 */
const ITEM_TO_SLOT_MAP: Record<string, string[]> = {
  sword: ['main_hand'],
  axe: ['main_hand'],
  pickaxe: ['main_hand'],
  shield: ['off_hand'],
  helmet: ['head'],
  hat: ['head'],
  // Add more as items are defined
};

/**
 * DragDropSystem handles all drag and drop interactions for inventory
 */
export class DragDropSystem {
  private dragState: DragState = {
    isDragging: false,
    item: null,
    sourceSlot: null,
    ghostPosition: { x: 0, y: 0 },
    validTargets: [],
    splitMode: false,
  };

  private splitDialogState: SplitDialogState | null = null;
  private pendingDrop: { position: { x: number; y: number } } | null = null;
  private eventEmitter: ((event: string, data: any) => void) | null = null;
  private equippedItems: Record<string, ItemStack | null> = {};

  constructor() {
    // Initialize equipped items
    for (const slot of EQUIPMENT_SLOTS) {
      this.equippedItems[slot] = null;
    }
  }

  /**
   * Set event emitter for drag/drop events
   */
  public setEventEmitter(emitter: (event: string, data: any) => void): void {
    this.eventEmitter = emitter;
  }

  /**
   * Start dragging an item from a slot
   */
  public startDrag(
    slotRef: SlotReference,
    inventory: InventoryComponent,
    modifiers?: { shift?: boolean }
  ): void {
    if (!inventory) {
      throw new Error('DragDropSystem.startDrag: inventory missing required');
    }

    if (!Array.isArray(inventory.slots)) {
      throw new Error('DragDropSystem.startDrag: inventory.slots must be an array');
    }

    // Validate slot reference
    if (slotRef.type !== 'backpack' && slotRef.type !== 'equipment' && slotRef.type !== 'container') {
      throw new Error(`DragDropSystem.startDrag: invalid slot type: ${slotRef.type}`);
    }

    let item: ItemStack | null = null;

    if (slotRef.type === 'backpack' || slotRef.type === 'container') {
      if (slotRef.index === undefined) {
        throw new Error('DragDropSystem.startDrag: index required for backpack/container slots');
      }

      if (slotRef.index < 0 || slotRef.index >= inventory.slots.length) {
        throw new Error(
          `DragDropSystem.startDrag: slot index ${slotRef.index} out of bounds (0-${inventory.slots.length - 1})`
        );
      }

      const slot = inventory.slots[slotRef.index];
      if (!slot) {
        throw new Error('DragDropSystem.startDrag: slot not found');
      }
      if (slot.itemId && slot.quantity > 0) {
        item = {
          itemId: slot.itemId,
          quantity: slot.quantity,
          quality: slot.quality,
        };
      }
    } else if (slotRef.type === 'equipment') {
      if (!slotRef.slot) {
        throw new Error('DragDropSystem.startDrag: slot name required for equipment');
      }

      const equipped = this.equippedItems[slotRef.slot];
      if (equipped) {
        item = { ...equipped };
      }
    }

    if (!item) {
      // No item in slot, don't start drag
      return;
    }

    // Check if shift-drag for split mode
    const splitMode = modifiers?.shift && item.quantity > 1;

    this.dragState = {
      isDragging: true,
      item: { ...item },
      sourceSlot: slotRef,
      ghostPosition: { x: 0, y: 0 },
      validTargets: this.calculateValidTargets(slotRef, inventory),
      splitMode,
    };

    // If split mode, show split dialog
    if (splitMode) {
      this.splitDialogState = {
        enabled: item.quantity > 1,
        min: 1,
        max: item.quantity,
        current: Math.floor(item.quantity / 2),
      };
    }
  }

  /**
   * Update drag ghost position
   */
  public updateDrag(x: number, y: number): void {
    if (!this.dragState.isDragging) return;

    this.dragState.ghostPosition = { x, y };
  }

  /**
   * Get current drag state
   */
  public getDragState(): DragState {
    return { ...this.dragState };
  }

  /**
   * Get valid drop targets for current drag
   */
  public getValidTargets(): SlotReference[] {
    return [...this.dragState.validTargets];
  }

  /**
   * Get visual state for a slot
   */
  public getSlotVisualState(slotRef: SlotReference): SlotVisualState {
    const isDragging = this.dragState.isDragging;
    const sourceSlot = this.dragState.sourceSlot;
    const isSource =
      sourceSlot &&
      sourceSlot.type === slotRef.type &&
      sourceSlot.index === slotRef.index &&
      sourceSlot.slot === slotRef.slot;

    const isValidTarget = this.dragState.validTargets.some(
      (t) => t.type === slotRef.type && t.index === slotRef.index && t.slot === slotRef.slot
    );

    const isInvalidTarget = isDragging && !isValidTarget && !isSource;

    return {
      dimmed: isSource || false,
      highlighted: isValidTarget,
      invalidTarget: isInvalidTarget && slotRef.type === 'equipment',
      borderColor: isInvalidTarget && slotRef.type === 'equipment' ? 'red' : 'normal',
    };
  }

  /**
   * Cancel drag operation
   */
  public cancel(): void {
    this.dragState = {
      isDragging: false,
      item: null,
      sourceSlot: null,
      ghostPosition: { x: 0, y: 0 },
      validTargets: [],
      splitMode: false,
    };
    this.splitDialogState = null;
    this.pendingDrop = null;
  }

  /**
   * Handle right-click during drag (cancel)
   */
  public handleRightClick(): void {
    this.cancel();
  }

  /**
   * Drop item onto target slot
   */
  public drop(targetSlot: SlotReference, inventory: InventoryComponent): DropResult {
    if (!this.dragState.isDragging || !this.dragState.item || !this.dragState.sourceSlot) {
      return { success: false, updatedInventory: inventory, error: 'No drag in progress' };
    }

    const sourceSlot = this.dragState.sourceSlot;
    const item = this.dragState.item;

    // Create a copy of inventory for immutable update
    const updatedInventory: InventoryComponent = {
      ...inventory,
      slots: inventory.slots.map((s: InventorySlot) => ({ ...s })),
    };

    // Handle equipment slot drops
    if (targetSlot.type === 'equipment') {
      const result = this.handleEquipDrop(targetSlot, updatedInventory);
      this.cancel();
      return result;
    }

    // Ensure target is backpack
    if (targetSlot.type !== 'backpack' || targetSlot.index === undefined) {
      this.cancel();
      return { success: false, updatedInventory: inventory, error: 'Invalid target slot' };
    }

    const targetIndex = targetSlot.index;
    const targetSlotData = updatedInventory.slots[targetIndex];

    if (!targetSlotData) {
      this.cancel();
      return { success: false, updatedInventory: inventory, error: 'Target slot not found' };
    }

    // Handle empty target slot - simple move
    if (!targetSlotData.itemId || targetSlotData.quantity === 0) {
      return this.handleMove(sourceSlot, targetIndex, updatedInventory);
    }

    // Handle stacking - same item type
    if (targetSlotData.itemId === item.itemId) {
      return this.handleStack(sourceSlot, targetIndex, updatedInventory);
    }

    // Handle swap - different item types
    return this.handleSwap(sourceSlot, targetIndex, updatedInventory);
  }

  /**
   * Drop item to world (outside inventory)
   * @param x - World x coordinate
   * @param y - World y coordinate
   * @param inventory - The source inventory (required for immediate drops)
   * @returns true if confirmation dialog is needed (valuable item), false if dropped immediately
   */
  public dropToWorld(x: number, y: number, inventory: InventoryComponent): boolean {
    if (!this.dragState.isDragging || !this.dragState.item) {
      return false;
    }

    // Check if item is valuable/rare - require confirmation
    const item = this.dragState.item;
    const requiresConfirmation = this.isValuableItem(item.itemId);

    if (requiresConfirmation) {
      this.pendingDrop = { position: { x, y } };
      return true;
    }

    // Drop immediately - non-valuable items don't need confirmation
    this.pendingDrop = { position: { x, y } };
    this.confirmDrop(inventory);
    return false;
  }

  /**
   * Confirm drop to world
   * @param inventory - The source inventory to update after dropping
   */
  public confirmDrop(inventory: InventoryComponent): DropResult | null {
    if (!this.dragState.item || !this.dragState.sourceSlot) {
      return null;
    }

    const item = this.dragState.item;
    const sourceSlot = this.dragState.sourceSlot;

    // Emit drop event
    if (this.eventEmitter) {
      this.eventEmitter('item:dropped', {
        itemId: item.itemId,
        quantity: item.quantity,
        position: this.pendingDrop?.position || { x: 0, y: 0 },
      });
    }

    // Create updated inventory with the source slot cleared
    const updatedInventory: InventoryComponent = {
      ...inventory,
      slots: inventory.slots.map((slot: InventorySlot, index: number) => {
        // Clear the source slot
        if (sourceSlot.type === 'backpack' && sourceSlot.index === index) {
          const newQuantity = slot.quantity - item.quantity;
          if (newQuantity <= 0) {
            return { ...slot, itemId: null, quantity: 0 };
          }
          return { ...slot, quantity: newQuantity };
        }
        return { ...slot };
      }),
    };

    this.cancel();

    return {
      success: true,
      updatedInventory,
    };
  }

  /**
   * Get split dialog state
   */
  public getSplitDialog(): SplitDialogState | null {
    return this.splitDialogState ? { ...this.splitDialogState } : null;
  }

  /**
   * Set split amount
   */
  public setSplitAmount(amount: number): void {
    if (this.splitDialogState) {
      this.splitDialogState.current = Math.max(
        this.splitDialogState.min,
        Math.min(amount, this.splitDialogState.max)
      );
    }
  }

  /**
   * Split stack in half
   */
  public splitHalf(): void {
    if (this.splitDialogState) {
      this.splitDialogState.current = Math.floor(this.splitDialogState.max / 2);
    }
  }

  /**
   * Confirm split operation
   */
  public confirmSplit(): { success: boolean; splitAmount: number; sourceSlot: ItemStack } {
    if (!this.splitDialogState || !this.dragState.item) {
      return { success: false, splitAmount: 0, sourceSlot: { itemId: '', quantity: 0 } };
    }

    const splitAmount = this.splitDialogState.current;
    const originalQuantity = this.dragState.item.quantity;

    // Update drag state to hold only the split amount
    this.dragState.item.quantity = splitAmount;

    // Clear split dialog
    this.splitDialogState = null;

    return {
      success: true,
      splitAmount,
      sourceSlot: {
        itemId: this.dragState.item.itemId,
        quantity: originalQuantity - splitAmount,
      },
    };
  }

  // Private helper methods

  private calculateValidTargets(
    sourceSlot: SlotReference,
    inventory: InventoryComponent
  ): SlotReference[] {
    const targets: SlotReference[] = [];

    // All backpack slots are valid targets
    for (let i = 0; i < inventory.slots.length; i++) {
      if (sourceSlot.type === 'backpack' && sourceSlot.index === i) {
        continue; // Skip source slot
      }
      targets.push({ type: 'backpack', index: i });
    }

    // Equipment slots if item can be equipped
    if (sourceSlot.type === 'backpack' && sourceSlot.index !== undefined) {
      const slot = inventory.slots[sourceSlot.index];
      if (slot && slot.itemId) {
        const validSlots = this.getValidEquipmentSlots(slot.itemId);
        for (const slotName of validSlots) {
          targets.push({ type: 'equipment', slot: slotName });
        }
      }
    }

    return targets;
  }

  private getValidEquipmentSlots(itemId: string): string[] {
    return ITEM_TO_SLOT_MAP[itemId] || [];
  }

  private handleMove(
    sourceSlot: SlotReference,
    targetIndex: number,
    inventory: InventoryComponent
  ): DropResult {
    if (sourceSlot.type === 'backpack' && sourceSlot.index !== undefined) {
      const sourceIndex = sourceSlot.index;
      const slot = inventory.slots[sourceIndex];

      if (!slot) {
        this.cancel();
        return { success: false, updatedInventory: inventory, error: 'Source slot not found' };
      }

      // Move item
      inventory.slots[targetIndex] = { ...slot };
      inventory.slots[sourceIndex] = { itemId: null, quantity: 0 };

      this.emitTransferEvent();
      this.cancel();

      return { success: true, updatedInventory: inventory };
    }

    this.cancel();
    return { success: false, updatedInventory: inventory, error: 'Invalid source slot' };
  }

  private handleStack(
    sourceSlot: SlotReference,
    targetIndex: number,
    inventory: InventoryComponent
  ): DropResult {
    if (sourceSlot.type !== 'backpack' || sourceSlot.index === undefined) {
      this.cancel();
      return { success: false, updatedInventory: inventory, error: 'Invalid source slot' };
    }

    const sourceIndex = sourceSlot.index;
    const sourceSlotData = inventory.slots[sourceIndex];
    const targetSlotData = inventory.slots[targetIndex];

    if (!sourceSlotData || !targetSlotData) {
      this.cancel();
      return { success: false, updatedInventory: inventory, error: 'Slot not found' };
    }

    if (!sourceSlotData.itemId || !targetSlotData.itemId) {
      this.cancel();
      return { success: false, updatedInventory: inventory, error: 'Empty slots' };
    }

    // Get max stack size from item registry
    const maxStack = itemRegistry.getStackSize(sourceSlotData.itemId);

    const spaceInTarget = maxStack - targetSlotData.quantity;
    const amountToTransfer = Math.min(sourceSlotData.quantity, spaceInTarget);

    // Transfer items
    targetSlotData.quantity += amountToTransfer;
    sourceSlotData.quantity -= amountToTransfer;

    // Clear source if empty
    if (sourceSlotData.quantity === 0) {
      sourceSlotData.itemId = null;
    }

    this.emitTransferEvent();
    this.cancel();

    return { success: true, updatedInventory: inventory };
  }

  private handleSwap(
    sourceSlot: SlotReference,
    targetIndex: number,
    inventory: InventoryComponent
  ): DropResult {
    if (sourceSlot.type !== 'backpack' || sourceSlot.index === undefined) {
      this.cancel();
      return { success: false, updatedInventory: inventory, error: 'Invalid source slot' };
    }

    const sourceIndex = sourceSlot.index;
    const sourceSlotData = inventory.slots[sourceIndex];
    const targetSlotData = inventory.slots[targetIndex];

    if (!sourceSlotData || !targetSlotData) {
      this.cancel();
      return { success: false, updatedInventory: inventory, error: 'Slot not found' };
    }

    // Swap slots
    const temp = { ...sourceSlotData };
    inventory.slots[sourceIndex] = { ...targetSlotData };
    inventory.slots[targetIndex] = temp;

    this.emitTransferEvent();
    this.cancel();

    return { success: true, updatedInventory: inventory };
  }

  private handleEquipDrop(targetSlot: SlotReference, inventory: InventoryComponent): DropResult {
    if (!targetSlot.slot || !this.dragState.item || !this.dragState.sourceSlot) {
      return { success: false, updatedInventory: inventory, error: 'Invalid equipment drop' };
    }

    const slotName = targetSlot.slot;
    const item = this.dragState.item;

    // Validate item can go in this slot
    const validSlots = this.getValidEquipmentSlots(item.itemId);
    if (!validSlots.includes(slotName)) {
      return { success: false, updatedInventory: inventory, error: 'Invalid equipment slot' };
    }

    // Check if slot is occupied
    const currentlyEquipped = this.equippedItems[slotName];
    if (currentlyEquipped) {
      // Find empty backpack slot
      const emptySlotIndex = inventory.slots.findIndex((s: InventorySlot) => !s.itemId || s.quantity === 0);
      if (emptySlotIndex === -1) {
        return { success: false, updatedInventory: inventory, error: 'No space in backpack' };
      }

      // Move currently equipped item to backpack
      inventory.slots[emptySlotIndex] = {
        itemId: currentlyEquipped.itemId || null,
        quantity: currentlyEquipped.quantity || 0,
        quality: currentlyEquipped.quality,
      };
    }

    // Equip new item
    this.equippedItems[slotName] = { ...item };

    // Remove from source
    if (this.dragState.sourceSlot.type === 'backpack' && this.dragState.sourceSlot.index !== undefined) {
      const sourceIndex = this.dragState.sourceSlot.index;
      inventory.slots[sourceIndex] = { itemId: null, quantity: 0 };
    }

    // Emit equipped event
    if (this.eventEmitter) {
      this.eventEmitter('item:equipped', {
        slot: slotName,
        itemId: item.itemId,
      });
    }

    return {
      success: true,
      updatedInventory: inventory,
      equipped: { slot: slotName, itemId: item.itemId },
    };
  }

  private emitTransferEvent(): void {
    if (this.eventEmitter) {
      this.eventEmitter('item:transferred', {
        source: this.dragState.sourceSlot,
        item: this.dragState.item,
      });
    }
  }

  private isValuableItem(itemId: string): boolean {
    // Items containing 'diamond', 'gold', 'rare', 'legendary', 'epic' are valuable
    const valuableKeywords = ['diamond', 'gold', 'rare', 'legendary', 'epic'];
    return valuableKeywords.some((keyword) => itemId.toLowerCase().includes(keyword));
  }
}
