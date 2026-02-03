/**
 * BaseRosterPanel - Abstract base class for roster panels (Agent, Animal, etc.)
 *
 * Extracts all shared code between AgentRosterPanel and AnimalRosterPanel:
 * - DOM container setup and styles
 * - Portrait creation and caching with DOM diffing
 * - Sprite loading with batched queue
 * - "All Items" button and modal
 * - Selection highlighting
 * - Show/hide/render (IWindowPanel methods)
 *
 * Subclasses provide:
 * - Theme colors (gold for agents, brown for animals)
 * - Display name logic (agent name vs capitalized species)
 * - Modal sorting logic
 * - World update logic (querying entities)
 * - Panel identity (id, title)
 */

import { PixelLabSpriteLoader } from './sprites/PixelLabSpriteLoader.js';
import type { World } from '@ai-village/core';
import type { IWindowPanel } from './types/WindowTypes.js';

/**
 * Minimum interface that all roster items must satisfy.
 */
export interface RosterItemInfo {
  id: string;
  spriteFolder: string;
  lastInteractionTime: number;
}

/**
 * Theme configuration for visual styling of a roster panel.
 */
export interface RosterTheme {
  /** Border color for portraits and modal cards (e.g., '#ffd700' for gold, '#8B4513' for brown) */
  borderColor: string;
  /** Border color when a portrait is selected */
  selectedBorderColor: string;
  /** Box shadow / glow color on hover */
  hoverGlowColor: string;
  /** Modal content background gradient */
  modalBackground: string;
  /** Modal border color */
  modalBorderColor: string;
  /** Modal title and name text color */
  modalTitleColor: string;
  /** Modal header border-bottom color (with alpha) */
  modalBorderBottom: string;
}

/**
 * Abstract base class for roster panels that show entity portraits
 * in a fixed sidebar with click-to-focus and modal browsing.
 *
 * Uses DOM diffing to minimize DOM mutations and sprite batching
 * to reduce repaints when loading many sprites at once.
 */
export abstract class BaseRosterPanel<T extends RosterItemInfo> implements IWindowPanel {
  protected visible: boolean = false;
  protected container: HTMLDivElement;
  protected rosterContainer: HTMLDivElement;
  protected items: Map<string, T> = new Map();
  protected spriteLoader: PixelLabSpriteLoader;
  protected onItemClickCallback: ((itemId: string) => void) | null = null;
  protected selectedItemId: string | null = null;

  /**
   * DOM DIFFING: Cache of portrait elements by item ID.
   * Instead of destroying and recreating all portraits on every update,
   * we track existing elements and only add/remove/update what changed.
   * This prevents:
   * - Wasted DOM destruction/recreation
   * - Memory leaks from orphaned event listeners
   * - Unnecessary sprite reloading
   */
  protected portraitCache: Map<string, HTMLDivElement> = new Map();
  protected allItemsButton: HTMLDivElement | null = null;

  /**
   * SPRITE BATCHING: Queue sprite loads to batch them in a single animation frame.
   * This prevents multiple repaints when loading many sprites at once.
   */
  protected pendingSpriteLoads: Array<{canvas: HTMLCanvasElement, spriteFolder: string}> = [];
  protected spriteLoadScheduled: boolean = false;

  // Abstract methods for subclasses to implement
  abstract getId(): string;
  abstract getTitle(): string;
  abstract getDisplayName(item: T): string;
  abstract getTheme(): RosterTheme;
  abstract getAllButtonLabel(): string;
  abstract getAllButtonEmoji(): string;
  abstract updateFromWorld(world: World): void;
  abstract sortItemsForModal(items: T[]): T[];

  constructor(spriteLoader: PixelLabSpriteLoader) {
    this.spriteLoader = spriteLoader;
    this.container = document.createElement('div');
    this.setupStyles();
    this.rosterContainer = this.createRosterContainer();
    this.container.appendChild(this.rosterContainer);
    document.body.appendChild(this.container);
  }

  // --- IWindowPanel interface ---

  getDefaultWidth(): number {
    return 400;
  }

  getDefaultHeight(): number {
    return 600;
  }

  isVisible(): boolean {
    return this.visible;
  }

  setVisible(visible: boolean): void {
    this.visible = visible;
  }

  /**
   * IWindowPanel render method (no-op for DOM-based panel)
   */
  render(
    _ctx: CanvasRenderingContext2D,
    _x: number,
    _y: number,
    _width: number,
    _height: number,
    _world?: World
  ): void {
    // This is a DOM-based panel, not canvas-based
    // Rendering happens in updateDOM()
  }

  // --- Public API ---

  /**
   * Set callback for when an item portrait is clicked
   */
  setOnItemClick(callback: (itemId: string) => void): void {
    this.onItemClickCallback = callback;
  }

  /**
   * Set the currently selected item (for highlighting)
   */
  setSelectedItem(itemId: string | null): void {
    this.selectedItemId = itemId;
    this.updateDOM();
  }

  /**
   * Add an item to the roster (only if not already present)
   */
  addItem(id: string, item: T): void {
    if (!this.items.has(id)) {
      this.items.set(id, item);
      this.updateDOM();
    }
  }

  /**
   * Remove an item from the roster
   */
  removeItem(id: string): void {
    this.items.delete(id);
    this.updateDOM();
  }

  /**
   * Mark an item as recently interacted with
   * @param skipRender - If true, don't trigger a DOM update (useful when called before setSelectedItem)
   */
  touchItem(id: string, skipRender: boolean = false): void {
    const item = this.items.get(id);
    if (item) {
      item.lastInteractionTime = Date.now();
      if (!skipRender) {
        this.updateDOM();
      }
    }
  }

  /**
   * Show the roster panel
   */
  show(): void {
    this.container.style.display = 'flex';
  }

  /**
   * Hide the roster panel
   */
  hide(): void {
    this.container.style.display = 'none';
  }

  // --- Shared private/protected methods ---

  protected setupStyles(): void {
    this.container.style.cssText = `
      position: fixed;
      top: 60px;
      right: 20px;
      width: 80px;
      max-height: calc(100vh - 80px);
      display: flex;
      flex-direction: column;
      gap: 8px;
      z-index: 1000;
      pointer-events: none;
    `;
  }

  protected createRosterContainer(): HTMLDivElement {
    const roster = document.createElement('div');
    roster.style.cssText = `
      display: flex;
      flex-direction: column;
      gap: 8px;
      overflow-y: auto;
      pointer-events: auto;
      scrollbar-width: thin;
      scrollbar-color: rgba(255, 215, 0, 0.3) transparent;
    `;
    roster.style.setProperty('scrollbar-width', 'thin');
    return roster;
  }

  /**
   * Update the DOM elements for this roster panel using DOM diffing.
   * Only adds/removes/updates elements that changed, instead of destroying everything.
   */
  protected updateDOM(): void {
    const itemCount = this.items.size;
    const showAllButton = itemCount >= 20;
    const maxVisible = showAllButton ? 9 : 20;

    // Get items - use interaction time only for filtering (when >= 20 items),
    // but always display in stable order (by display name) to prevent portraits from
    // rearranging when clicked
    let itemsToShow = Array.from(this.items.values());

    if (showAllButton) {
      // Filter to most recently interacted items
      itemsToShow = itemsToShow
        .sort((a, b) => b.lastInteractionTime - a.lastInteractionTime)
        .slice(0, maxVisible);
    }

    // Sort by display name for stable display order
    const sortedItems = itemsToShow.sort((a, b) =>
      this.getDisplayName(a).localeCompare(this.getDisplayName(b))
    );
    const targetItemIds = new Set(sortedItems.map(a => a.id));

    // PHASE 1: Remove portraits for items no longer in the visible list
    for (const [itemId, portrait] of this.portraitCache) {
      if (!targetItemIds.has(itemId)) {
        portrait.remove();
        this.portraitCache.delete(itemId);
      }
    }

    // PHASE 2: Update existing portraits (selection state only) and add new ones
    for (const item of sortedItems) {
      let portrait = this.portraitCache.get(item.id);

      if (portrait) {
        // Portrait exists - just update selection state (cheap)
        this.updatePortraitSelection(portrait, item.id === this.selectedItemId);
      } else {
        // New item - create portrait and add to cache
        portrait = this.createPortrait(item);
        this.portraitCache.set(item.id, portrait);
      }

      // Ensure portrait is in the container (may need reordering)
      // appendChild moves existing elements, so this handles order too
      this.rosterContainer.appendChild(portrait);
    }

    // PHASE 3: Handle "All Items" button
    if (showAllButton) {
      if (!this.allItemsButton) {
        this.allItemsButton = this.createAllItemsButton();
      }
      // Update tooltip with current count
      this.allItemsButton.title = `View all ${this.items.size} ${this.getAllButtonLabel().toLowerCase()}`;
      this.rosterContainer.appendChild(this.allItemsButton);
    } else if (this.allItemsButton) {
      this.allItemsButton.remove();
      this.allItemsButton = null;
    }
  }

  /**
   * Update just the selection state of a portrait without recreating it.
   */
  protected updatePortraitSelection(portrait: HTMLDivElement, isSelected: boolean): void {
    const theme = this.getTheme();
    if (isSelected) {
      portrait.style.border = `3px solid ${theme.selectedBorderColor}`;
      portrait.style.boxShadow = `0 0 20px rgba(255, 237, 78, 0.8)`;
    } else {
      portrait.style.border = `2px solid ${theme.borderColor}`;
      portrait.style.boxShadow = 'none';
    }
  }

  protected createPortrait(item: T): HTMLDivElement {
    const theme = this.getTheme();
    const portrait = document.createElement('div');
    // Store item ID as data attribute for event handlers
    portrait.dataset.itemId = item.id;

    // Base styles - selection state is set separately via updatePortraitSelection()
    portrait.style.cssText = `
      width: 70px;
      height: 70px;
      background: linear-gradient(135deg, rgba(30, 30, 50, 0.95) 0%, rgba(20, 20, 40, 0.95) 100%);
      border: 2px solid ${theme.borderColor};
      border-radius: 8px;
      cursor: pointer;
      transition: all 0.2s;
      position: relative;
      overflow: hidden;
    `;

    // Apply initial selection state
    this.updatePortraitSelection(portrait, this.selectedItemId === item.id);

    // Sprite canvas
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    canvas.style.cssText = `
      width: 100%;
      height: 100%;
      image-rendering: pixelated;
    `;

    // Queue sprite load for batching
    this.queueSpriteLoad(canvas, item.spriteFolder);

    // Name tooltip
    portrait.title = this.getDisplayName(item);

    // Hover effects - restore correct state on mouseleave based on selection
    portrait.addEventListener('mouseenter', () => {
      portrait.style.transform = 'scale(1.1)';
      portrait.style.boxShadow = `0 0 15px ${theme.hoverGlowColor}`;
      portrait.style.borderColor = theme.selectedBorderColor;
    });

    portrait.addEventListener('mouseleave', () => {
      portrait.style.transform = 'scale(1)';
      // Restore correct selection state
      const isSelected = this.selectedItemId === portrait.dataset.itemId;
      this.updatePortraitSelection(portrait, isSelected);
    });

    // Click to focus
    portrait.addEventListener('click', () => {
      // Skip render on touchItem since setSelectedItem will trigger updateDOM
      this.touchItem(item.id, true);
      this.setSelectedItem(item.id);
      if (this.onItemClickCallback) {
        this.onItemClickCallback(item.id);
      }
    });

    portrait.appendChild(canvas);
    return portrait;
  }

  protected createAllItemsButton(): HTMLDivElement {
    const button = document.createElement('div');
    button.style.cssText = `
      width: 70px;
      height: 70px;
      background: linear-gradient(135deg, rgba(50, 50, 70, 0.95) 0%, rgba(40, 40, 60, 0.95) 100%);
      border: 2px solid #87CEEB;
      border-radius: 8px;
      cursor: pointer;
      transition: all 0.2s;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      font-size: 11px;
      font-weight: bold;
      color: #87CEEB;
      text-align: center;
      padding: 5px;
    `;

    button.innerHTML = `
      <div style="font-size: 20px; margin-bottom: 2px;">${this.getAllButtonEmoji()}</div>
      <div>All<br/>${this.getAllButtonLabel()}</div>
    `;

    button.title = `View all ${this.items.size} ${this.getAllButtonLabel().toLowerCase()}`;

    // Hover effects
    button.addEventListener('mouseenter', () => {
      button.style.transform = 'scale(1.1)';
      button.style.boxShadow = '0 0 15px rgba(135, 206, 235, 0.6)';
      button.style.borderColor = '#ADD8E6';
    });

    button.addEventListener('mouseleave', () => {
      button.style.transform = 'scale(1)';
      button.style.boxShadow = 'none';
      button.style.borderColor = '#87CEEB';
    });

    // Click to open all items modal
    button.addEventListener('click', () => {
      this.showAllItemsModal();
    });

    return button;
  }

  /**
   * Queue a sprite load to be processed in a batch.
   * This prevents multiple repaints when loading many sprites at once.
   */
  protected queueSpriteLoad(canvas: HTMLCanvasElement, spriteFolder: string): void {
    this.pendingSpriteLoads.push({canvas, spriteFolder});

    if (!this.spriteLoadScheduled) {
      this.spriteLoadScheduled = true;
      requestAnimationFrame(() => this.processSpriteQueue());
    }
  }

  /**
   * Process all pending sprite loads in parallel, batched in a single frame.
   */
  protected async processSpriteQueue(): Promise<void> {
    this.spriteLoadScheduled = false;
    const batch = this.pendingSpriteLoads.splice(0, this.pendingSpriteLoads.length);

    // Process all in parallel
    await Promise.all(batch.map(({canvas, spriteFolder}) =>
      this.loadSprite(canvas, spriteFolder)
    ));
  }

  protected async loadSprite(canvas: HTMLCanvasElement, spriteFolder: string): Promise<void> {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    try {
      const character = await this.spriteLoader.loadCharacter(spriteFolder);
      const southImage = character.rotations.get('south');

      if (southImage) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        const scale = Math.min(
          canvas.width / southImage.width,
          canvas.height / southImage.height
        );
        const x = (canvas.width - southImage.width * scale) / 2;
        const y = (canvas.height - southImage.height * scale) / 2;

        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(
          southImage,
          x, y,
          southImage.width * scale,
          southImage.height * scale
        );
      } else {
        this.drawPlaceholder(ctx, canvas.width, canvas.height);
      }
    } catch {
      this.drawPlaceholder(ctx, canvas.width, canvas.height);
    }
  }

  protected drawPlaceholder(ctx: CanvasRenderingContext2D, width: number, height: number): void {
    ctx.fillStyle = '#666';
    ctx.beginPath();
    ctx.arc(width / 2, height / 3, width / 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillRect(width / 2 - width / 8, height / 2, width / 4, height / 3);
  }

  protected showAllItemsModal(): void {
    const theme = this.getTheme();

    // Create modal backdrop
    const modal = document.createElement('div');
    modal.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      background: rgba(0, 0, 0, 0.7);
      display: flex;
      justify-content: center;
      align-items: center;
      z-index: 10001;
    `;

    // Create modal content
    const content = document.createElement('div');
    content.style.cssText = `
      width: 90%;
      max-width: 800px;
      max-height: 80vh;
      background: ${theme.modalBackground};
      border: 2px solid ${theme.modalBorderColor};
      border-radius: 12px;
      padding: 20px;
      overflow-y: auto;
    `;

    // Header
    const header = document.createElement('div');
    header.style.cssText = `
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 20px;
      padding-bottom: 15px;
      border-bottom: 2px solid ${theme.modalBorderBottom};
    `;

    const title = document.createElement('h2');
    title.textContent = `All ${this.getAllButtonLabel()} (${this.items.size})`;
    title.style.cssText = `
      color: ${theme.modalTitleColor};
      margin: 0;
      font-size: 24px;
    `;

    const closeBtn = document.createElement('button');
    closeBtn.textContent = '\u00d7';
    closeBtn.style.cssText = `
      background: transparent;
      border: 2px solid ${theme.modalBorderColor};
      color: ${theme.modalBorderColor};
      width: 35px;
      height: 35px;
      border-radius: 50%;
      cursor: pointer;
      font-size: 24px;
      line-height: 1;
      transition: all 0.2s;
    `;
    closeBtn.addEventListener('click', () => modal.remove());

    header.appendChild(title);
    header.appendChild(closeBtn);

    // Item grid
    const grid = document.createElement('div');
    grid.style.cssText = `
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
      gap: 15px;
    `;

    // Sort items using subclass-specific sorting
    const sortedItems = this.sortItemsForModal(Array.from(this.items.values()));

    for (const item of sortedItems) {
      const card = this.createModalCard(item, modal);
      grid.appendChild(card);
    }

    content.appendChild(header);
    content.appendChild(grid);
    modal.appendChild(content);
    document.body.appendChild(modal);

    // Click outside to close
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.remove();
      }
    });
  }

  protected createModalCard(item: T, modal: HTMLDivElement): HTMLDivElement {
    const theme = this.getTheme();
    const card = document.createElement('div');
    card.style.cssText = `
      background: linear-gradient(135deg, rgba(30, 30, 50, 0.95) 0%, rgba(20, 20, 40, 0.95) 100%);
      border: 2px solid ${theme.modalBorderColor};
      border-radius: 8px;
      padding: 10px;
      cursor: pointer;
      transition: all 0.2s;
      text-align: center;
    `;

    // Sprite
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    canvas.style.cssText = `
      width: 100%;
      height: 100px;
      image-rendering: pixelated;
      margin-bottom: 8px;
    `;
    this.queueSpriteLoad(canvas, item.spriteFolder);

    // Name
    const name = document.createElement('div');
    name.textContent = this.getDisplayName(item);
    name.style.cssText = `
      color: ${theme.modalTitleColor};
      font-size: 13px;
      font-weight: bold;
      word-wrap: break-word;
    `;

    // Hover effects
    card.addEventListener('mouseenter', () => {
      card.style.transform = 'translateY(-5px)';
      card.style.boxShadow = `0 5px 20px ${theme.hoverGlowColor}`;
    });

    card.addEventListener('mouseleave', () => {
      card.style.transform = 'translateY(0)';
      card.style.boxShadow = 'none';
    });

    // Click to focus and close modal
    card.addEventListener('click', () => {
      // Skip render on touchItem since setSelectedItem will trigger updateDOM
      this.touchItem(item.id, true);
      this.setSelectedItem(item.id);
      if (this.onItemClickCallback) {
        this.onItemClickCallback(item.id);
      }
      modal.remove();
    });

    card.appendChild(canvas);
    card.appendChild(name);
    return card;
  }
}
