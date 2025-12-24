import type { World } from '@ai-village/core';
import { RecipeListSection } from './RecipeListSection.js';
import { IngredientPanel } from './IngredientPanel.js';
import { CraftingQueueSection } from './CraftingQueueSection.js';

type FocusedSection = 'recipeList' | 'details' | 'queue';

interface SearchBar {
  placeholder: string;
  text: string;
  setText(text: string): void;
  getText(): string;
}

interface FilterControls {
  options: string[];
  selected: string;
  select(option: string): void;
}

interface CategoryTabs {
  tabs: string[];
  selectedTab: string;
  selectTab(tab: string): void;
}

interface CloseButton {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface PanelState {
  selectedCategory: string;
  searchQuery: string;
  selectedFilter: string;
  viewMode: 'grid' | 'list';
}

/**
 * Main crafting panel UI component.
 * Manages recipe browsing, details, ingredients, and crafting queue.
 */
export class CraftingPanelUI {
  private world: World;
  private canvas: HTMLCanvasElement;

  public isVisible: boolean = false;
  public activeAgentId: number | null = null;
  public workstationId: string | null = null;
  public selectedRecipeId: string | null = null;
  public focusedSection: FocusedSection = 'recipeList';

  public readonly bounds: { x: number; y: number; width: number; height: number };
  public readonly closeButton: CloseButton;

  // UI sections
  public readonly recipeListSection: RecipeListSection;
  public readonly recipeDetailsSection: any; // Stub for now
  public readonly ingredientPanel: IngredientPanel;
  public readonly queueSection: CraftingQueueSection;

  // UI controls
  public readonly searchBar: SearchBar;
  public readonly filterControls: FilterControls;
  public readonly categoryTabs: CategoryTabs;

  // Callbacks (unused for now but part of planned UI)
  private _onCraftNowCallback: ((recipeId: string, quantity: number) => void) | null = null;
  private _onAddToQueueCallback: ((recipeId: string, quantity: number) => void) | null = null;

  constructor(world: World, canvas: HTMLCanvasElement) {
    if (!world) {
      throw new Error('World is required');
    }
    if (!canvas) {
      throw new Error('Canvas is required');
    }

    this.world = world;
    this.canvas = canvas;

    // Panel dimensions (800x600, centered)
    const panelWidth = 800;
    const panelHeight = 600;
    const panelX = (canvas.width - panelWidth) / 2;
    const panelY = (canvas.height - panelHeight) / 2;

    this.bounds = { x: panelX, y: panelY, width: panelWidth, height: panelHeight };

    // Close button (top right)
    this.closeButton = {
      x: panelX + panelWidth - 40,
      y: panelY + 10,
      width: 30,
      height: 30
    };

    // Create UI sections
    const recipeListX = panelX + 10;
    const recipeListY = panelY + 50;
    const recipeListWidth = 260;
    const recipeListHeight = 350;

    this.recipeListSection = new RecipeListSection(
      world,
      recipeListX,
      recipeListY,
      recipeListWidth,
      recipeListHeight
    );

    // Recipe details section (stub)
    this.recipeDetailsSection = {
      setRecipe: (_recipeId: string) => { /* stub */ },
      render: (ctx: CanvasRenderingContext2D) => {
        // Draw placeholder
        ctx.fillStyle = '#1a1a1a';
        ctx.fillRect(panelX + 280, panelY + 50, 500, 250);
        ctx.strokeStyle = '#666';
        ctx.strokeRect(panelX + 280, panelY + 50, 500, 250);
      }
    };

    this.ingredientPanel = new IngredientPanel(
      world,
      panelX + 280,
      panelY + 310,
      250,
      200
    );

    this.queueSection = new CraftingQueueSection(
      world,
      panelX + 10,
      panelY + 410,
      770,
      180
    );

    // Create UI controls
    this.searchBar = {
      placeholder: 'Search recipes...',
      text: '',
      setText: (text: string) => { this.searchBar.text = text; },
      getText: () => this.searchBar.text
    };

    this.filterControls = {
      options: ['All', 'Craftable', 'Missing One', 'Locked'],
      selected: 'All',
      select: (option: string) => { this.filterControls.selected = option; }
    };

    this.categoryTabs = {
      tabs: ['All', 'Tools', 'Weapons', 'Food', 'Materials'],
      selectedTab: 'All',
      selectTab: (tab: string) => { this.categoryTabs.selectedTab = tab; }
    };

    // Connect recipe selection
    this.recipeListSection.onRecipeSelected((recipeId: string) => {
      this.selectRecipe(recipeId);
    });

    // Listen for events
    this.world.eventBus.subscribe('crafting:job_queued', (event) => {
      const data = event.data as { agentId: number };
      if (data.agentId === this.activeAgentId) {
        this.queueSection.refresh();
      }
    });

    this.world.eventBus.subscribe('crafting:job_completed', (event) => {
      const data = event.data as { agentId: number };
      if (data.agentId === this.activeAgentId) {
        this.queueSection.refresh();
      }
    });

    this.world.eventBus.subscribe('inventory:changed', (event) => {
      const data = event.data as { entityId: number };
      if (data.entityId === this.activeAgentId) {
        this.ingredientPanel.refresh();
      }
    });

    this.world.eventBus.subscribe('research:unlocked', () => {
      this.recipeListSection.refresh();
    });

    this.world.eventBus.subscribe('building:destroyed', (event) => {
      const data = event.data as { buildingId: string };
      if (data.buildingId === this.workstationId) {
        this.hide();
      }
    });
  }

  show(): void {
    this.isVisible = true;
    this.world.eventBus.emit({
      type: 'crafting:panel_opened',
      source: 'crafting-panel-ui',
      data: {}
    });
  }

  hide(): void {
    this.isVisible = false;
    this.world.eventBus.emit({
      type: 'crafting:panel_closed',
      source: 'crafting-panel-ui',
      data: {}
    });
  }

  toggle(): void {
    if (this.isVisible) {
      this.hide();
    } else {
      this.show();
    }
  }

  setActiveAgent(agentId: number): void {
    if (agentId <= 0) {
      throw new Error('Invalid agent ID');
    }

    this.activeAgentId = agentId;
    this.recipeListSection.setAgentId(agentId);
    this.queueSection.setAgentId(agentId);
    this.refresh();
  }

  setWorkstation(workstationId: string | null): void {
    this.workstationId = workstationId;

    if (workstationId) {
      this.recipeListSection.filterByStation(workstationId);
    } else {
      this.recipeListSection.filterByStation(null);
    }
  }

  getHeader(): string {
    if (this.workstationId) {
      // Capitalize first letter
      const name = this.workstationId.charAt(0).toUpperCase() + this.workstationId.slice(1);
      return `CRAFTING - ${name}`;
    }
    return 'CRAFTING - Hand Crafting';
  }

  selectRecipe(recipeId: string | null): void {
    if (!this.activeAgentId && recipeId !== null) {
      throw new Error('No active agent');
    }

    this.selectedRecipeId = recipeId;

    if (recipeId) {
      this.recipeDetailsSection.setRecipe(recipeId);
      this.ingredientPanel.setRecipe(recipeId, this.activeAgentId!);
      this.world.eventBus.emit({
        type: 'crafting:recipe_selected',
        source: 'crafting-panel-ui',
        data: { recipeId }
      });
    }
  }

  refresh(): void {
    if (!this.world) {
      throw new Error('World is required');
    }

    this.recipeListSection.refresh();
    this.ingredientPanel.refresh();
    this.queueSection.refresh();
  }

  getState(): PanelState {
    return {
      selectedCategory: this.categoryTabs.selectedTab,
      searchQuery: this.searchBar.text,
      selectedFilter: this.filterControls.selected,
      viewMode: this.recipeListSection.viewMode
    };
  }

  setState(state: PanelState): void {
    this.categoryTabs.selectTab(state.selectedCategory);
    this.searchBar.setText(state.searchQuery);
    this.filterControls.select(state.selectedFilter);
    this.recipeListSection.setViewMode(state.viewMode);
  }

  onCraftNow(callback: (recipeId: string, quantity: number) => void): void {
    this._onCraftNowCallback = callback;
    void this._onCraftNowCallback; // Suppress unused warning - used in full implementation
  }

  onAddToQueue(callback: (recipeId: string, quantity: number) => void): void {
    this._onAddToQueueCallback = callback;
    void this._onAddToQueueCallback; // Suppress unused warning - used in full implementation
  }

  render(ctx: CanvasRenderingContext2D): void {
    if (!this.isVisible) {
      return;
    }

    if (!this.activeAgentId) {
      throw new Error('No active agent');
    }

    // Draw semi-transparent overlay
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // Draw panel background
    ctx.fillStyle = '#2a2a2a';
    ctx.fillRect(this.bounds.x, this.bounds.y, this.bounds.width, this.bounds.height);

    // Draw panel border
    ctx.strokeStyle = '#666';
    ctx.lineWidth = 2;
    ctx.strokeRect(this.bounds.x, this.bounds.y, this.bounds.width, this.bounds.height);

    // Draw header
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 18px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(this.getHeader(), this.bounds.x + 10, this.bounds.y + 30);

    // Draw close button
    ctx.fillStyle = '#c44';
    ctx.fillRect(this.closeButton.x, this.closeButton.y, this.closeButton.width, this.closeButton.height);
    ctx.strokeStyle = '#fff';
    ctx.strokeRect(this.closeButton.x, this.closeButton.y, this.closeButton.width, this.closeButton.height);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 20px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('X', this.closeButton.x + 15, this.closeButton.y + 22);

    // Render sections
    this.recipeListSection.render(ctx);
    this.recipeDetailsSection.render(ctx);
    this.ingredientPanel.render(ctx);
    this.queueSection.render(ctx);
  }

  handleClick(x: number, y: number): boolean {
    if (!this.isVisible) {
      return false;
    }

    // Check close button
    if (x >= this.closeButton.x && x <= this.closeButton.x + this.closeButton.width &&
        y >= this.closeButton.y && y <= this.closeButton.y + this.closeButton.height) {
      this.hide();
      return true;
    }

    // Check if click is outside panel bounds
    if (x < this.bounds.x || x > this.bounds.x + this.bounds.width ||
        y < this.bounds.y || y > this.bounds.y + this.bounds.height) {
      this.hide();
      return true;
    }

    // Delegate to sections
    if (this.recipeListSection.handleClick(x, y)) {
      return true;
    }

    return false;
  }
}
