import type { World, EntityId } from '@ai-village/core';

// Local types
interface EventPayload {
  type: string;
  data: Record<string, unknown>;
}

interface Ingredient {
  itemId: string;
  quantity: number;
}
import { globalRecipeRegistry } from '@ai-village/core';
import type { IWindowPanel } from './types/WindowTypes.js';

export interface IngredientDisplay {
  itemId: string;
  required: number;
  available: number;
  status: 'AVAILABLE' | 'PARTIAL' | 'MISSING' | 'IN_STORAGE';
}

/**
 * Ingredient panel for displaying recipe ingredient requirements and availability.
 */
export class IngredientPanel implements IWindowPanel {
  private visible: boolean = false;
  private world: World;
  public readonly bounds: { x: number; y: number; width: number; height: number };

  public recipeId: string | null = null;
  public agentId: EntityId | null = null;
  public ingredients: IngredientDisplay[] = [];
  private hoveredIngredient: string | null = null;

  // Callbacks (unused for now but part of planned UI)
  private _onTakeFromStorageCallback: ((itemId: string, quantity: number) => void) | null = null;
  private _onFindIngredientCallback: ((itemId: string) => void) | null = null;


  getId(): string {
    return 'ingredient';
  }

  getTitle(): string {
    return 'Ingredient';
  }

  getDefaultWidth(): number {
    return 300;
  }

  getDefaultHeight(): number {
    return 400;
  }

  isVisible(): boolean {
    return this.visible;
  }

  setVisible(visible: boolean): void {
    this.visible = visible;
  }

  constructor(world: World, x: number, y: number, width: number, height: number) {
    if (!world) {
      throw new Error('World is required');
    }
    if (width <= 0) {
      throw new Error('Width must be positive');
    }
    if (height <= 0) {
      throw new Error('Height must be positive');
    }

    this.world = world;
    this.bounds = { x, y, width, height };

    // Listen for inventory changes
    this.world.eventBus.subscribe('inventory:changed', (event: EventPayload) => {
      const data = event.data; // Has entityId as string
      if (this.agentId && data.entityId === this.agentId) {
        this.refresh();
      }
    });
  }

  setRecipe(recipeId: string, agentId: EntityId): void {
    if (!recipeId) {
      throw new Error('Recipe ID is required');
    }
    if (!agentId) {
      throw new Error('Agent ID is required');
    }

    this.recipeId = recipeId;
    this.agentId = agentId;
    this.refresh();
  }

  clearRecipe(): void {
    this.recipeId = null;
    this.ingredients = [];
  }

  refresh(): void {
    if (!this.recipeId || !this.agentId) {
      this.ingredients = [];
      return;
    }

    const recipe = globalRecipeRegistry.getRecipe(this.recipeId);
    if (!recipe) {
      throw new Error(`Recipe not found: ${this.recipeId}`);
    }

    // Check if recipe has ingredients
    if (!recipe.ingredients || recipe.ingredients.length === 0) {
      throw new Error(`Recipe '${this.recipeId}' must have at least one ingredient`);
    }

    // Get agent's inventory to check availability
    const agent = this.world.getEntity(this.agentId);
    if (!agent) {
      throw new Error(`Agent entity ${this.agentId} not found`);
    }

    const inventory = agent.components.get('inventory') as any;
    if (!inventory || !inventory.slots) {
      throw new Error(`Agent ${this.agentId} has no inventory component`);
    }

    // Check actual availability for each ingredient
    this.ingredients = recipe.ingredients.map((ing: Ingredient) => {
      // Count available items in inventory
      let available = 0;
      for (const slot of inventory.slots) {
        if (slot.itemId === ing.itemId) {
          available += slot.quantity;
        }
      }

      // Determine status based on availability
      let status: 'AVAILABLE' | 'PARTIAL' | 'MISSING' | 'IN_STORAGE';
      if (available >= ing.quantity) {
        status = 'AVAILABLE';
      } else if (available > 0) {
        status = 'PARTIAL';
      } else {
        status = 'MISSING';
      }

      return {
        itemId: ing.itemId,
        required: ing.quantity,
        available,
        status
      };
    });
  }

  onTakeFromStorage(callback: (itemId: string, quantity: number) => void): void {
    this._onTakeFromStorageCallback = callback;
    void this._onTakeFromStorageCallback; // Suppress unused warning - used in full implementation
  }

  onFindIngredient(callback: (itemId: string) => void): void {
    this._onFindIngredientCallback = callback;
    void this._onFindIngredientCallback; // Suppress unused warning - used in full implementation
  }

  getTakeButton(itemId: string): { x: number; y: number; width: number; height: number; label: string } | undefined {
    const ingredient = this.ingredients.find(ing => ing.itemId === itemId);
    if (!ingredient || ingredient.status !== 'IN_STORAGE') {
      return undefined;
    }

    // Calculate button position (stub)
    return { x: 0, y: 0, width: 50, height: 20, label: 'Take' };
  }

  getFindLink(itemId: string): { x: number; y: number; label: string } | undefined {
    const ingredient = this.ingredients.find(ing => ing.itemId === itemId);
    if (!ingredient || ingredient.status !== 'MISSING') {
      return undefined;
    }

    return { x: 0, y: 0, label: 'Find' };
  }

  getBuyLink(_itemId: string): { x: number; y: number; label: string } | undefined {
    // Stub: Would check if item is purchasable
    return undefined;
  }

  handleClick(_x: number, _y: number): boolean {
    // Handle button clicks (stub)
    return false;
  }

  handleMouseMove(_x: number, _y: number): void {
    // Update hovered ingredient (stub)
  }

  getTooltip(): string | null {
    if (!this.hoveredIngredient) {
      return null;
    }

    return `${this.hoveredIngredient}\nSource: Mining, gathering`;
  }

  getIngredientPositions(): Array<{ x: number; y: number }> {
    return this.ingredients.map((_, index) => ({
      x: this.bounds.x + 10,
      y: this.bounds.y + 40 + index * 35
    }));
  }

  render(ctx: CanvasRenderingContext2D): void {
    if (!this.recipeId) {
      // Don't render if no recipe selected
      return;
    }

    // Draw panel background
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(this.bounds.x, this.bounds.y, this.bounds.width, this.bounds.height);

    // Draw border
    ctx.strokeStyle = '#666';
    ctx.lineWidth = 1;
    ctx.strokeRect(this.bounds.x, this.bounds.y, this.bounds.width, this.bounds.height);

    // Draw header
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 14px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('INGREDIENTS', this.bounds.x + 10, this.bounds.y + 20);

    // Draw ingredients
    this.ingredients.forEach((ingredient, index) => {
      const y = this.bounds.y + 50 + index * 35;

      // Status color
      let color = '#F44336'; // Red (MISSING)
      let icon = '✗';
      if (ingredient.status === 'AVAILABLE') {
        color = '#4CAF50'; // Green
        icon = '✓';
      } else if (ingredient.status === 'PARTIAL') {
        color = '#FFC107'; // Yellow
        icon = '!';
      } else if (ingredient.status === 'IN_STORAGE') {
        color = '#2196F3'; // Blue
        icon = '📦';
      }

      // Draw status icon
      ctx.fillStyle = color;
      ctx.font = '16px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(icon, this.bounds.x + 10, y);

      // Draw item name (capitalize first letter)
      const itemName = ingredient.itemId.charAt(0).toUpperCase() + ingredient.itemId.slice(1);
      ctx.fillStyle = '#fff';
      ctx.font = '14px sans-serif';
      ctx.fillText(itemName, this.bounds.x + 35, y);

      // Draw quantity
      ctx.fillStyle = '#ccc';
      ctx.textAlign = 'right';
      ctx.fillText(`${ingredient.required}/${ingredient.available}`, this.bounds.x + this.bounds.width - 10, y);
    });
  }
}
