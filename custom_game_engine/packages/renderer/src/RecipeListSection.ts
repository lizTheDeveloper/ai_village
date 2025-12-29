import type { World, EntityId } from '@ai-village/core';
import { globalRecipeRegistry } from '@ai-village/core';
import type { Recipe } from '@ai-village/core';
import type { UnlockQueryService } from '@ai-village/core';

type ViewMode = 'grid' | 'list';
type SortMode = 'name' | 'category' | 'recently_used' | 'craftable_first' | 'level_required';
type CraftabilityFilter = 'All' | 'Craftable' | 'Missing One' | 'Locked';

/**
 * Recipe list section for browsing and filtering recipes.
 */
export class RecipeListSection {
  public readonly bounds: { x: number; y: number; width: number; height: number };

  public viewMode: ViewMode = 'grid';
  public activeCategory: string = 'All';
  public searchQuery: string = '';
  public craftabilityFilter: CraftabilityFilter = 'All';
  public sortMode: SortMode = 'name';
  public groupByCategory: boolean = false;
  public stationFilter: string | null = null;

  public selectedRecipeId: string | null = null;
  public hoveredRecipeId: string | null = null;
  public scrollOffset: number = 0;
  public gridColumns: number = 3;

  private agentId: EntityId | null = null;
  private onRecipeSelectedCallback: ((recipeId: string) => void) | null = null;
  public selectedIndex: number = 0;
  private unlockService: UnlockQueryService | null = null;

  constructor(_world: World, x: number, y: number, width: number, height: number) {
    if (width <= 0) {
      throw new Error('Width must be positive');
    }
    if (height <= 0) {
      throw new Error('Height must be positive');
    }

    this.bounds = { x, y, width, height };
  }

  setAgentId(agentId: EntityId): void {
    if (!agentId) {
      throw new Error('Invalid agent ID');
    }
    this.agentId = agentId;
    this.refresh();
  }

  setViewMode(mode: ViewMode): void {
    if (mode !== 'grid' && mode !== 'list') {
      throw new Error('Invalid view mode');
    }
    this.viewMode = mode;
    this.refresh();
  }

  toggleViewMode(): void {
    this.viewMode = this.viewMode === 'grid' ? 'list' : 'grid';
    this.refresh();
  }

  setCategory(category: string): void {
    if (!category) {
      throw new Error('Invalid category');
    }
    this.activeCategory = category;
    this.refresh();
  }

  setSearchQuery(query: string): void {
    this.searchQuery = query;
    this.refresh();
  }

  setCraftabilityFilter(filter: CraftabilityFilter): void {
    const validFilters: CraftabilityFilter[] = ['All', 'Craftable', 'Missing One', 'Locked'];
    if (!validFilters.includes(filter)) {
      throw new Error('Invalid craftability filter');
    }
    this.craftabilityFilter = filter;
    this.refresh();
  }

  setSortMode(mode: SortMode): void {
    const validModes: SortMode[] = ['name', 'category', 'recently_used', 'craftable_first', 'level_required'];
    if (!validModes.includes(mode)) {
      throw new Error('Invalid sort mode');
    }
    this.sortMode = mode;
    this.refresh();
  }

  setGroupByCategory(enabled: boolean): void {
    this.groupByCategory = enabled;
    this.refresh();
  }

  filterByStation(station: string | null): void {
    this.stationFilter = station;
    this.refresh();
  }

  /**
   * Set the unlock query service for checking research requirements.
   * When set, recipes are filtered based on research state.
   */
  setUnlockService(service: UnlockQueryService | null): void {
    this.unlockService = service;
    this.refresh();
  }

  /**
   * Check if a recipe is unlocked based on research requirements.
   */
  isRecipeUnlocked(recipe: Recipe): boolean {
    // If no unlock service, treat all recipes as unlocked
    if (!this.unlockService) {
      return true;
    }
    // Check research requirements
    const requirements = recipe.researchRequirements ?? [];
    return this.unlockService.isRecipeUnlocked(requirements);
  }

  selectRecipe(recipeId: string): void {
    this.selectedRecipeId = recipeId;
  }

  onRecipeSelected(callback: (recipeId: string) => void): void {
    this.onRecipeSelectedCallback = callback;
  }

  refresh(): void {
    // Refresh display (would recalculate filtered recipes)
  }

  getFilteredRecipes(): Recipe[] {
    let recipes = globalRecipeRegistry.getAllRecipes();

    // Apply category filter
    if (this.activeCategory !== 'All') {
      recipes = recipes.filter(r => r.category === this.activeCategory);
    }

    // Apply search filter
    if (this.searchQuery) {
      const query = this.searchQuery.toLowerCase();
      recipes = recipes.filter(r => r.name.toLowerCase().includes(query));
    }

    // Apply station filter
    if (this.stationFilter !== undefined) {
      recipes = recipes.filter(r => r.stationRequired === this.stationFilter);
    }

    // Apply craftability/unlock filter
    switch (this.craftabilityFilter) {
      case 'Locked':
        // Show only locked recipes
        recipes = recipes.filter(r => !this.isRecipeUnlocked(r));
        break;
      case 'Craftable':
        // Only show unlocked recipes (for now - full impl would also check inventory)
        recipes = recipes.filter(r => this.isRecipeUnlocked(r));
        break;
      case 'All':
      case 'Missing One':
      default:
        // Show all recipes, but unlocked recipes could be marked differently in render
        break;
    }

    return recipes;
  }

  getCellWidth(): number {
    return Math.floor(this.bounds.width / this.gridColumns) - 10;
  }

  getCellHeight(): number {
    return 90; // Icon (64px) + name (26px)
  }

  getItemWidth(): number {
    return this.bounds.width - 20; // Full width minus padding
  }

  getMaxScroll(): number {
    const recipes = this.getFilteredRecipes();
    if (this.viewMode === 'grid') {
      const rows = Math.ceil(recipes.length / this.gridColumns);
      const contentHeight = rows * this.getCellHeight();
      return Math.max(0, contentHeight - this.bounds.height);
    } else {
      const itemHeight = 40;
      const contentHeight = recipes.length * itemHeight;
      return Math.max(0, contentHeight - this.bounds.height);
    }
  }

  handleScroll(delta: number): void {
    const scrollAmount = delta * 30;
    this.scrollOffset -= scrollAmount;

    // Clamp to valid range
    const maxScroll = this.getMaxScroll();
    this.scrollOffset = Math.max(0, Math.min(this.scrollOffset, maxScroll));
  }

  handleClick(x: number, y: number): boolean {
    if (!this.agentId) {
      return false;
    }

    const relX = x - this.bounds.x;
    const relY = y - this.bounds.y + this.scrollOffset;

    const recipes = this.getFilteredRecipes();

    if (this.viewMode === 'grid') {
      const cellWidth = this.getCellWidth();
      const cellHeight = this.getCellHeight();
      const col = Math.floor(relX / cellWidth);
      const row = Math.floor(relY / cellHeight);
      const index = row * this.gridColumns + col;

      if (index >= 0 && index < recipes.length) {
        const recipe = recipes[index];
        if (!recipe) {
          throw new Error(`Recipe not found at index: ${index}`);
        }
        if (this.onRecipeSelectedCallback) {
          this.onRecipeSelectedCallback(recipe.id);
        }
        return true;
      }
    } else {
      const itemHeight = 40;
      const index = Math.floor(relY / itemHeight);

      if (index >= 0 && index < recipes.length) {
        const recipe = recipes[index];
        if (!recipe) {
          throw new Error(`Recipe not found at index: ${index}`);
        }
        if (this.onRecipeSelectedCallback) {
          this.onRecipeSelectedCallback(recipe.id);
        }
        return true;
      }
    }

    return false;
  }

  handleMouseMove(x: number, y: number): void {
    const relX = x - this.bounds.x;
    const relY = y - this.bounds.y + this.scrollOffset;

    const recipes = this.getFilteredRecipes();

    if (this.viewMode === 'grid') {
      const cellWidth = this.getCellWidth();
      const cellHeight = this.getCellHeight();
      const col = Math.floor(relX / cellWidth);
      const row = Math.floor(relY / cellHeight);
      const index = row * this.gridColumns + col;

      if (index >= 0 && index < recipes.length) {
        const recipe = recipes[index];
        if (!recipe) {
          throw new Error(`Recipe not found at index: ${index}`);
        }
        this.hoveredRecipeId = recipe.id;
      } else {
        this.hoveredRecipeId = null;
      }
    } else {
      const itemHeight = 40;
      const index = Math.floor(relY / itemHeight);

      if (index >= 0 && index < recipes.length) {
        const recipe = recipes[index];
        if (!recipe) {
          throw new Error(`Recipe not found at index: ${index}`);
        }
        this.hoveredRecipeId = recipe.id;
      } else {
        this.hoveredRecipeId = null;
      }
    }
  }

  getTooltip(): string | null {
    if (!this.hoveredRecipeId) {
      return null;
    }

    const recipe = globalRecipeRegistry.getRecipe(this.hoveredRecipeId);
    return `${recipe.name}\n${recipe.description}`;
  }

  getRecipeCount(): number {
    return this.getFilteredRecipes().length;
  }

  render(ctx: CanvasRenderingContext2D): void {
    if (!this.agentId) {
      throw new Error('Agent ID is required for rendering');
    }

    const recipes = this.getFilteredRecipes();

    // Save context
    ctx.save();
    ctx.beginPath();
    ctx.rect(this.bounds.x, this.bounds.y, this.bounds.width, this.bounds.height);
    ctx.clip();

    if (recipes.length === 0) {
      // Show empty state
      ctx.fillStyle = '#888';
      ctx.font = '14px sans-serif';
      ctx.textAlign = 'center';

      if (this.craftabilityFilter === 'Craftable') {
        ctx.fillText('Gather resources to unlock crafting',
          this.bounds.x + this.bounds.width / 2,
          this.bounds.y + this.bounds.height / 2);
      } else {
        ctx.fillText('No recipes available',
          this.bounds.x + this.bounds.width / 2,
          this.bounds.y + this.bounds.height / 2);
      }

      ctx.restore();
      return;
    }

    if (this.viewMode === 'grid') {
      this.renderGrid(ctx, recipes);
    } else {
      this.renderList(ctx, recipes);
    }

    ctx.restore();
  }

  private renderGrid(ctx: CanvasRenderingContext2D, recipes: Recipe[]): void {
    const cellWidth = this.getCellWidth();
    const cellHeight = this.getCellHeight();

    recipes.forEach((recipe, index) => {
      const col = index % this.gridColumns;
      const row = Math.floor(index / this.gridColumns);

      const x = this.bounds.x + col * cellWidth + 5;
      const y = this.bounds.y + row * cellHeight - this.scrollOffset + 5;

      // Skip if off-screen
      if (y + cellHeight < this.bounds.y || y > this.bounds.y + this.bounds.height) {
        return;
      }

      const isUnlocked = this.isRecipeUnlocked(recipe);

      // Draw background - darker for locked
      ctx.fillStyle = !isUnlocked ? '#1a1a1a' :
        recipe.id === this.selectedRecipeId ? '#444' : '#222';
      ctx.fillRect(x, y, cellWidth - 10, cellHeight - 10);

      // Draw border - gray for locked
      ctx.strokeStyle = !isUnlocked ? '#333' :
        recipe.id === this.hoveredRecipeId ? '#0af' : '#666';
      ctx.lineWidth = recipe.id === this.selectedRecipeId ? 2 : 1;
      ctx.strokeRect(x, y, cellWidth - 10, cellHeight - 10);

      // Draw icon placeholder - dimmed for locked
      ctx.fillStyle = isUnlocked ? '#555' : '#333';
      ctx.fillRect(x + (cellWidth - 74) / 2, y + 5, 64, 64);

      // Draw name - dimmed for locked
      ctx.fillStyle = isUnlocked ? '#fff' : '#666';
      ctx.font = '12px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(recipe.name, x + cellWidth / 2 - 5, y + 77);

      // Draw status indicator
      ctx.font = '16px sans-serif';
      if (isUnlocked) {
        ctx.fillStyle = '#4CAF50'; // Green for available
        ctx.fillText('✓', x + cellWidth - 20, y + 20);
      } else {
        ctx.fillStyle = '#888'; // Gray lock for locked
        ctx.fillText('🔒', x + cellWidth - 20, y + 20);
      }
    });
  }

  private renderList(ctx: CanvasRenderingContext2D, recipes: Recipe[]): void {
    const itemHeight = 40;
    const itemWidth = this.getItemWidth();

    recipes.forEach((recipe, index) => {
      const x = this.bounds.x + 10;
      const y = this.bounds.y + index * itemHeight - this.scrollOffset;

      // Skip if off-screen
      if (y + itemHeight < this.bounds.y || y > this.bounds.y + this.bounds.height) {
        return;
      }

      const isUnlocked = this.isRecipeUnlocked(recipe);

      // Draw background - darker for locked
      ctx.fillStyle = !isUnlocked ? '#1a1a1a' :
        recipe.id === this.selectedRecipeId ? '#444' : '#222';
      ctx.fillRect(x, y, itemWidth, itemHeight - 5);

      // Draw border - gray for locked
      ctx.strokeStyle = !isUnlocked ? '#333' :
        recipe.id === this.hoveredRecipeId ? '#0af' : '#666';
      ctx.lineWidth = recipe.id === this.selectedRecipeId ? 2 : 1;
      ctx.strokeRect(x, y, itemWidth, itemHeight - 5);

      // Draw icon placeholder - dimmed for locked
      ctx.fillStyle = isUnlocked ? '#555' : '#333';
      ctx.fillRect(x + 5, y + 3, 32, 32);

      // Draw name - dimmed for locked
      ctx.fillStyle = isUnlocked ? '#fff' : '#666';
      ctx.font = '14px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(recipe.name, x + 45, y + 22);

      // Draw status indicator
      ctx.font = '16px sans-serif';
      ctx.textAlign = 'right';
      if (isUnlocked) {
        ctx.fillStyle = '#4CAF50';
        ctx.fillText('✓', x + itemWidth - 10, y + 22);
      } else {
        ctx.fillStyle = '#888';
        ctx.fillText('🔒', x + itemWidth - 10, y + 22);
      }
    });
  }
}
