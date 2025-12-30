import type { World, EntityId } from '@ai-village/core';

// Local type for event callbacks
interface EventPayload {
  type: string;
  data: Record<string, unknown>;
}
import { globalRecipeRegistry } from '@ai-village/core';
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
  private _canvas: HTMLCanvasElement; // Retained for potential future use

  public isVisible: boolean = false;
  public activeAgentId: EntityId | null = null;
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
    this._canvas = canvas;
    void this._canvas; // Suppress unused warning - retained for potential future use

    // Panel dimensions - use relative coordinates (0,0 origin) for WindowManager compatibility
    const panelWidth = 800;
    const panelHeight = 600;

    // Bounds are relative to the window/panel origin (0,0)
    this.bounds = { x: 0, y: 0, width: panelWidth, height: panelHeight };

    // Close button (top right, relative to panel origin)
    this.closeButton = {
      x: panelWidth - 40,
      y: 10,
      width: 30,
      height: 30
    };

    // Create UI sections with relative coordinates
    const recipeListX = 10;
    const recipeListY = 50;
    const recipeListWidth = 260;
    const recipeListHeight = 350;

    this.recipeListSection = new RecipeListSection(
      world,
      recipeListX,
      recipeListY,
      recipeListWidth,
      recipeListHeight
    );

    // Recipe details section with Craft button
    const detailsX = 280;
    const detailsY = 50;
    const detailsWidth = 500;
    const detailsHeight = 250;
    const buttonWidth = 120;
    const buttonHeight = 36;
    const buttonX = detailsX + detailsWidth - buttonWidth - 20;
    const buttonY = detailsY + detailsHeight - buttonHeight - 20;

    this.recipeDetailsSection = {
      bounds: { x: detailsX, y: detailsY, width: detailsWidth, height: detailsHeight },
      craftButton: { x: buttonX, y: buttonY, width: buttonWidth, height: buttonHeight },
      setRecipe: (_recipeId: string) => { /* Update handled by parent */ },
      render: (ctx: CanvasRenderingContext2D) => {
        // Draw panel background
        ctx.fillStyle = '#1a1a1a';
        ctx.fillRect(detailsX, detailsY, detailsWidth, detailsHeight);
        ctx.strokeStyle = '#666';
        ctx.strokeRect(detailsX, detailsY, detailsWidth, detailsHeight);

        if (!this.selectedRecipeId) {
          // No recipe selected
          ctx.fillStyle = '#888';
          ctx.font = '14px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText('Select a recipe to view details', detailsX + detailsWidth / 2, detailsY + detailsHeight / 2);
          ctx.textAlign = 'left';
          return;
        }

        // Get recipe details
        const recipe = globalRecipeRegistry.getRecipe(this.selectedRecipeId);

        // Draw recipe name
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 18px sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText(recipe.name, detailsX + 20, detailsY + 35);

        // Draw description
        ctx.fillStyle = '#ccc';
        ctx.font = '14px sans-serif';
        ctx.fillText(recipe.description || 'No description', detailsX + 20, detailsY + 60);

        // Draw crafting time
        ctx.fillStyle = '#888';
        ctx.font = '12px sans-serif';
        ctx.fillText(`Crafting time: ${recipe.craftingTime}s`, detailsX + 20, detailsY + 85);

        // Draw output
        ctx.fillStyle = '#4CAF50';
        ctx.font = '14px sans-serif';
        ctx.fillText(`Produces: ${recipe.output.quantity}x ${recipe.output.itemId}`, detailsX + 20, detailsY + 110);

        // Draw "Craft Now" button
        ctx.fillStyle = '#2E7D32';
        ctx.fillRect(buttonX, buttonY, buttonWidth, buttonHeight);
        ctx.strokeStyle = '#4CAF50';
        ctx.lineWidth = 2;
        ctx.strokeRect(buttonX, buttonY, buttonWidth, buttonHeight);

        ctx.fillStyle = '#fff';
        ctx.font = 'bold 14px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('CRAFT NOW', buttonX + buttonWidth / 2, buttonY + buttonHeight / 2);
        ctx.textAlign = 'left';
        ctx.textBaseline = 'alphabetic';
      },
      handleClick: (x: number, y: number): boolean => {
        if (!this.selectedRecipeId) return false;

        // Check if click is on Craft button
        const btn = this.recipeDetailsSection.craftButton;
        if (x >= btn.x && x <= btn.x + btn.width &&
            y >= btn.y && y <= btn.y + btn.height) {
          // Trigger craft callback
          if (this._onCraftNowCallback) {
            this._onCraftNowCallback(this.selectedRecipeId, 1);
          }
          return true;
        }
        return false;
      }
    };

    this.ingredientPanel = new IngredientPanel(
      world,
      280,
      310,
      250,
      200
    );

    this.queueSection = new CraftingQueueSection(
      world,
      10,
      410,
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
    this.world.eventBus.subscribe('crafting:job_queued', () => {
      // event.data has jobId and recipeId, not agentId
      // No agentId filtering - refresh for all queue changes
      this.queueSection.refresh();
    });

    this.world.eventBus.subscribe('crafting:job_completed', () => {
      // event.data has jobId and recipeId, not agentId
      // No agentId filtering - refresh for all queue changes
      this.queueSection.refresh();
    });

    this.world.eventBus.subscribe('inventory:changed', (event: EventPayload) => {
      const data = event.data; // Has entityId as string
      if (data.entityId === String(this.activeAgentId)) {
        this.ingredientPanel.refresh();
      }
    });

    this.world.eventBus.subscribe('research:unlocked', () => {
      this.recipeListSection.refresh();
    });

    this.world.eventBus.subscribe('building:destroyed', (event: EventPayload) => {
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

  setActiveAgent(agentId: EntityId): void {
    if (!agentId) {
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

    // Note: When rendered through WindowManager, ctx is already translated to window position.
    // WindowManager handles the title bar and close button, so we only render content here.
    // All coordinates here are relative to the panel origin (0,0).

    // Draw panel background at relative (0,0)
    ctx.fillStyle = '#2a2a2a';
    ctx.fillRect(0, 0, this.bounds.width, this.bounds.height);

    // Show placeholder if no agent is set
    if (!this.activeAgentId) {
      ctx.fillStyle = '#888888';
      ctx.font = '16px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('Select an agent to view crafting options', this.bounds.width / 2, this.bounds.height / 2);
      ctx.textAlign = 'left';
      return;
    }

    // Render sections (they use relative coordinates set in constructor)
    this.recipeListSection.render(ctx);
    this.recipeDetailsSection.render(ctx);
    this.ingredientPanel.render(ctx);
    this.queueSection.render(ctx);
  }

  handleClick(x: number, y: number): boolean {
    if (!this.isVisible) {
      return false;
    }

    // Note: WindowManager handles the close button in its title bar.
    // We only handle clicks within our content sections here.

    // Check recipe details section (Craft button)
    if (this.recipeDetailsSection.handleClick(x, y)) {
      return true;
    }

    // Delegate to recipe list
    if (this.recipeListSection.handleClick(x, y)) {
      return true;
    }

    return false;
  }
}
