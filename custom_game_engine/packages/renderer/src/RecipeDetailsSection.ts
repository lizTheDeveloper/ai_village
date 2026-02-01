import type { World, EntityId } from '@ai-village/core';
import { globalRecipeRegistry } from '@ai-village/core';
import type { Recipe } from '@ai-village/core';

/**
 * Recipe details section for displaying detailed information about a selected recipe.
 * Shows recipe name, description, ingredients, outputs, requirements, and crafting time.
 */
export class RecipeDetailsSection {
  public readonly bounds: { x: number; y: number; width: number; height: number };

  public selectedRecipeId: string | null = null;
  public agentId: EntityId | null = null;
  public scrollOffset: number = 0;

  private onCraftNowCallback: ((recipeId: string, quantity: number) => void) | null = null;
  private onAddToQueueCallback: ((recipeId: string, quantity: number) => void) | null = null;

  constructor(_world: World, x: number, y: number, width: number, height: number) {
    if (width <= 0) {
      throw new Error('Width must be positive');
    }
    if (height <= 0) {
      throw new Error('Height must be positive');
    }

    this.bounds = { x, y, width, height };
  }

  /**
   * Set the currently selected recipe to display.
   */
  setRecipe(recipeId: string | null): void {
    this.selectedRecipeId = recipeId;
    this.scrollOffset = 0; // Reset scroll when changing recipes
  }

  /**
   * Set the active agent ID for checking skill requirements.
   */
  setAgentId(agentId: EntityId | null): void {
    this.agentId = agentId;
  }

  /**
   * Get the currently selected recipe object.
   */
  getSelectedRecipe(): Recipe | null {
    if (!this.selectedRecipeId) {
      return null;
    }
    return globalRecipeRegistry.getRecipe(this.selectedRecipeId) ?? null;
  }

  /**
   * Register callback for "Craft Now" button.
   */
  onCraftNow(callback: (recipeId: string, quantity: number) => void): void {
    this.onCraftNowCallback = callback;
  }

  /**
   * Register callback for "Add to Queue" button.
   */
  onAddToQueue(callback: (recipeId: string, quantity: number) => void): void {
    this.onAddToQueueCallback = callback;
  }

  /**
   * Trigger craft now action.
   */
  craftNow(quantity: number = 1): void {
    if (this.selectedRecipeId && this.onCraftNowCallback) {
      this.onCraftNowCallback(this.selectedRecipeId, quantity);
    }
  }

  /**
   * Trigger add to queue action.
   */
  addToQueue(quantity: number = 1): void {
    if (this.selectedRecipeId && this.onAddToQueueCallback) {
      this.onAddToQueueCallback(this.selectedRecipeId, quantity);
    }
  }

  /**
   * Scroll the details view.
   */
  scroll(delta: number): void {
    this.scrollOffset = Math.max(0, this.scrollOffset + delta);
  }

  /**
   * Reset scroll position.
   */
  resetScroll(): void {
    this.scrollOffset = 0;
  }

  /**
   * Check if a recipe has all ingredients available.
   * @param recipe Recipe to check
   * @returns true if all ingredients are available
   */
  hasAllIngredients(recipe: Recipe): boolean {
    // This would check agent inventory in a full implementation
    // For now, return false as a conservative default
    return false;
  }

  /**
   * Check if agent meets skill requirements.
   * @param recipe Recipe to check
   * @returns true if agent meets all skill requirements
   */
  meetsSkillRequirements(recipe: Recipe): boolean {
    if (!this.agentId) {
      return false;
    }
    // This would check agent skills in a full implementation
    // For now, return true as a permissive default
    return true;
  }

  /**
   * Get formatted crafting time string.
   * @param seconds Crafting time in seconds
   * @returns Formatted time string (e.g., "2m 30s", "45s")
   */
  formatCraftingTime(seconds: number): string {
    if (seconds < 60) {
      return `${Math.round(seconds)}s`;
    }
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.round(seconds % 60);
    if (remainingSeconds === 0) {
      return `${minutes}m`;
    }
    return `${minutes}m ${remainingSeconds}s`;
  }

  /**
   * Get color for skill requirement based on agent's skill level.
   * @param skillName Skill name
   * @param requiredLevel Required skill level
   * @returns Color string for rendering (e.g., '#00FF00' for met, '#FF0000' for unmet)
   */
  getSkillRequirementColor(skillName: string, requiredLevel: number): string {
    if (this.meetsSkillRequirements({ skillRequirements: [{ skill: skillName, level: requiredLevel }] } as Recipe)) {
      return '#00FF00'; // Green - requirement met
    }
    return '#FF0000'; // Red - requirement not met
  }

  /**
   * Render the recipe details section.
   */
  render(ctx: CanvasRenderingContext2D): void {
    const { x, y, width, height } = this.bounds;

    // Draw panel background
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(x, y, width, height);
    ctx.strokeStyle = '#666';
    ctx.strokeRect(x, y, width, height);

    const recipe = this.getSelectedRecipe();

    if (!recipe) {
      // No recipe selected
      ctx.fillStyle = '#888';
      ctx.font = '14px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Select a recipe to view details', x + width / 2, y + height / 2);
      ctx.textAlign = 'left';
      return;
    }

    let currentY = y + 35;
    const leftMargin = x + 20;

    // Draw recipe name
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 18px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(recipe.name, leftMargin, currentY);
    currentY += 25;

    // Draw category
    ctx.fillStyle = '#888';
    ctx.font = '12px sans-serif';
    ctx.fillText(`Category: ${recipe.category}`, leftMargin, currentY);
    currentY += 20;

    // Draw description
    ctx.fillStyle = '#ccc';
    ctx.font = '14px sans-serif';
    const description = recipe.description || 'No description';
    ctx.fillText(description, leftMargin, currentY);
    currentY += 25;

    // Draw crafting time
    ctx.fillStyle = '#888';
    ctx.font = '12px sans-serif';
    const craftingTime = this.formatCraftingTime(recipe.craftingTime);
    ctx.fillText(`Crafting time: ${craftingTime}`, leftMargin, currentY);
    currentY += 20;

    // Draw output
    ctx.fillStyle = '#4CAF50';
    ctx.font = '14px sans-serif';
    ctx.fillText(`Produces: ${recipe.output.quantity}x ${recipe.output.itemId}`, leftMargin, currentY);
    currentY += 25;

    // Draw skill requirements if any
    if (recipe.skillRequirements && recipe.skillRequirements.length > 0) {
      ctx.fillStyle = '#888';
      ctx.font = '12px sans-serif';
      ctx.fillText('Required Skills:', leftMargin, currentY);
      currentY += 18;

      for (const skill of recipe.skillRequirements) {
        const color = this.getSkillRequirementColor(skill.skill, skill.level);
        ctx.fillStyle = color;
        ctx.fillText(`  ${skill.skill} (Level ${skill.level})`, leftMargin, currentY);
        currentY += 16;
      }
      currentY += 10;
    }

    // Draw station requirement if any
    if (recipe.stationRequired) {
      ctx.fillStyle = '#888';
      ctx.font = '12px sans-serif';
      ctx.fillText(`Requires: ${recipe.stationRequired}`, leftMargin, currentY);
      currentY += 20;
    }

    // Draw "Craft Now" button
    const buttonWidth = 120;
    const buttonHeight = 36;
    const buttonX = x + width - buttonWidth - 20;
    const buttonY = y + height - buttonHeight - 20;

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
  }

  /**
   * Handle click events within the details section.
   * @param x Click X coordinate
   * @param y Click Y coordinate
   * @returns true if click was handled
   */
  handleClick(x: number, y: number): boolean {
    if (!this.selectedRecipeId) {
      return false;
    }

    // Check if click is on Craft button
    const buttonWidth = 120;
    const buttonHeight = 36;
    const buttonX = this.bounds.x + this.bounds.width - buttonWidth - 20;
    const buttonY = this.bounds.y + this.bounds.height - buttonHeight - 20;

    if (x >= buttonX && x <= buttonX + buttonWidth &&
        y >= buttonY && y <= buttonY + buttonHeight) {
      this.craftNow(1);
      return true;
    }

    return false;
  }
}
