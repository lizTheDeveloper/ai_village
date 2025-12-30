import type { InventoryComponent, InventorySlot } from '@ai-village/core';

export interface FilteredItem {
  itemId: string;
  quantity: number;
  quality?: number;
  slotIndex: number;
}

export interface ItemVisualState {
  highlighted: boolean;
  dimmed: boolean;
}

/**
 * Item type categorization
 * Simplified version - real implementation would come from item definitions
 */
const ITEM_TYPE_MAP: Record<string, string> = {
  // Tools
  iron_pickaxe: 'tool',
  iron_axe: 'tool',
  stone_pickaxe: 'tool',

  // Weapons
  iron_sword: 'weapon',
  sword: 'weapon',
  axe: 'weapon',

  // Materials
  wood: 'material',
  stone: 'material',
  iron: 'material',

  // Consumables
  apple: 'consumable',
  wheat: 'consumable',
  food: 'consumable',
  water: 'consumable',
};

/**
 * Rarity mapping based on quality value
 */
const RARITY_MAP: Record<string, number> = {
  common: 1,
  uncommon: 2,
  rare: 3,
  epic: 4,
  legendary: 5,
  unique: 6,
};

/**
 * InventorySearch handles searching and filtering inventory items
 */
export class InventorySearch {
  private inventory: InventoryComponent | null = null;
  private searchText: string = '';
  private typeFilter: string | null = null;
  private rarityFilter: string | null = null;
  private debounceTimer: NodeJS.Timeout | null = null;
  private focusHandler: (() => void) | null = null;
  private filteredResults: FilteredItem[] = [];
  private visualStates: Map<number, ItemVisualState> = new Map();

  constructor() {}

  /**
   * Set the inventory to search
   */
  public setInventory(inventory: InventoryComponent): void {
    if (!inventory) {
      throw new Error('InventorySearch.setInventory: inventory missing required');
    }

    if (!Array.isArray(inventory.slots)) {
      throw new Error('InventorySearch.setInventory: inventory missing required field "slots"');
    }

    if (typeof inventory.maxSlots !== 'number') {
      throw new Error('InventorySearch.setInventory: inventory missing required field "maxSlots"');
    }

    if (typeof inventory.maxWeight !== 'number') {
      throw new Error('InventorySearch.setInventory: inventory missing required field "maxWeight"');
    }

    this.inventory = inventory;
    this.applyFilters();
  }

  /**
   * Set search text (debounced by 150ms unless immediate flag is set)
   */
  public setSearchText(text: string, options?: { immediate?: boolean }): void {
    this.searchText = text.toLowerCase();

    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }

    if (options?.immediate) {
      this.applyFilters();
    } else {
      this.debounceTimer = setTimeout(() => {
        this.applyFilters();
        this.debounceTimer = null;
      }, 150);
    }
  }

  /**
   * Set type filter
   */
  public setTypeFilter(type: string): void {
    this.typeFilter = type;
    this.applyFilters();
  }

  /**
   * Set rarity filter
   */
  public setRarityFilter(rarity: string): void {
    this.rarityFilter = rarity;
    this.applyFilters();
  }

  /**
   * Clear all filters
   */
  public clearSearch(): void {
    this.searchText = '';
    this.typeFilter = null;
    this.rarityFilter = null;
    this.applyFilters();
  }

  /**
   * Get current search text
   */
  public getSearchText(): string {
    return this.searchText;
  }

  /**
   * Get list of active filters
   */
  public getActiveFilters(): string[] {
    const filters: string[] = [];
    if (this.searchText) {
      filters.push(`text:${this.searchText}`);
    }
    if (this.typeFilter) {
      filters.push(`type:${this.typeFilter}`);
    }
    if (this.rarityFilter) {
      filters.push(`rarity:${this.rarityFilter}`);
    }
    return filters;
  }

  /**
   * Get filtered items
   */
  public getFilteredItems(): FilteredItem[] {
    return [...this.filteredResults];
  }

  /**
   * Get visual states for all items (for dimming/highlighting)
   */
  public getItemVisualStates(): ItemVisualState[] {
    if (!this.inventory) {
      return [];
    }

    return this.inventory.slots.map((_: InventorySlot, index: number) => {
      return this.visualStates.get(index) || { highlighted: false, dimmed: false };
    });
  }

  /**
   * Set focus handler for Ctrl+F
   */
  public setFocusHandler(handler: () => void): void {
    this.focusHandler = handler;
  }

  /**
   * Handle keyboard input
   */
  public handleKeyPress(key: string, _shift: boolean, ctrl: boolean): void {
    if (ctrl && key.toLowerCase() === 'f') {
      if (this.focusHandler) {
        this.focusHandler();
      }
    }
  }

  /**
   * Apply all active filters to the inventory
   */
  public applyFilters(): void {
    if (!this.inventory) {
      this.filteredResults = [];
      this.visualStates.clear();
      return;
    }

    const results: FilteredItem[] = [];
    const hasFilters = this.searchText || this.typeFilter || this.rarityFilter;

    this.inventory.slots.forEach((slot: InventorySlot, index: number) => {
      if (!slot.itemId || slot.quantity === 0) {
        // Empty slot
        if (hasFilters) {
          this.visualStates.set(index, { highlighted: false, dimmed: true });
        } else {
          this.visualStates.set(index, { highlighted: false, dimmed: false });
        }
        return;
      }

      const itemId = slot.itemId;
      const itemType = this.getItemType(itemId);
      const itemRarity = this.getItemRarity(slot.quality);

      // Apply text filter
      if (this.searchText && !itemId.toLowerCase().includes(this.searchText)) {
        this.visualStates.set(index, { highlighted: false, dimmed: true });
        return;
      }

      // Apply type filter
      if (this.typeFilter && itemType !== this.typeFilter) {
        this.visualStates.set(index, { highlighted: false, dimmed: true });
        return;
      }

      // Apply rarity filter
      if (this.rarityFilter && itemRarity !== this.rarityFilter) {
        this.visualStates.set(index, { highlighted: false, dimmed: true });
        return;
      }

      // Item matches all filters
      results.push({
        itemId: slot.itemId,
        quantity: slot.quantity,
        quality: slot.quality,
        slotIndex: index,
      });

      this.visualStates.set(index, {
        highlighted: Boolean(hasFilters),
        dimmed: false,
      });
    });

    this.filteredResults = results;
  }

  /**
   * Get item type from itemId
   */
  private getItemType(itemId: string): string {
    return ITEM_TYPE_MAP[itemId] || 'other';
  }

  /**
   * Get item rarity from quality value
   */
  private getItemRarity(quality?: number): string {
    if (!quality) return 'common';

    for (const [rarity, value] of Object.entries(RARITY_MAP)) {
      if (quality === value) {
        return rarity;
      }
    }

    return 'common';
  }
}
