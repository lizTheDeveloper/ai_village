/**
 * CraftingStationPanel.ts
 * UI panel for interacting with crafting stations
 *
 * Per ui-system/crafting.md REQ-CRAFT-006:
 * - Click station to open crafting menu
 * - View station-specific recipes
 * - Add fuel to station (wood/coal button)
 * - View crafting bonuses
 *
 * Layout:
 * - Top: Station header with fuel gauge
 * - Middle: Bonuses section
 * - Bottom: Recipe list (grid or list view)
 */

import type { Entity, World } from '@ai-village/core';
import type { EntityImpl } from '@ai-village/core';
import type { BuildingComponent } from '@ai-village/core';
import type { IWindowPanel } from './types/WindowTypes.js';

export interface CraftingStationPanelOptions {
  world: World;
  x: number;
  y: number;
  width: number;
  height: number;
}

export class CraftingStationPanel implements IWindowPanel {
  private visible: boolean = false;
  private x: number;
  private y: number;
  private width: number;
  private height: number;
  private selectedStation: Entity | null = null;


  getId(): string {
    return 'crafting-station';
  }

  getTitle(): string {
    return 'Crafting Station';
  }

  getDefaultWidth(): number {
    return 500;
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

  constructor(options: CraftingStationPanelOptions) {
    this.x = options.x;
    this.y = options.y;
    this.width = options.width;
    this.height = options.height;
  }

  /**
   * Open the panel for a specific crafting station
   */
  open(stationEntity: Entity): void {
    this.selectedStation = stationEntity;
    this.visible = true;
  }

  /**
   * Close the panel
   */
  close(): void {
    this.selectedStation = null;
    this.visible = false;
  }

  /**
   * Get the currently selected station
   */
  public getSelectedStation(): Entity | null {
    return this.selectedStation;
  }

  /**
   * Render the crafting station panel
   */
  render(ctx: CanvasRenderingContext2D): void {
    if (!this.isVisible || !this.selectedStation) {
      return;
    }

    const building = this.selectedStation.components.get('building') as BuildingComponent | undefined;
    if (!building) {
      return;
    }

    // Panel background
    ctx.fillStyle = 'rgba(40, 30, 20, 0.95)';
    ctx.fillRect(this.x, this.y, this.width, this.height);

    // Border
    ctx.strokeStyle = '#654321';
    ctx.lineWidth = 2;
    ctx.strokeRect(this.x, this.y, this.width, this.height);

    // Header
    this.renderHeaderSection(ctx, building);

    // Fuel gauge (if applicable)
    if (building.fuelRequired) {
      this.renderFuelGauge(ctx, building);
    }

    // Bonuses section
    this.renderBonuses(ctx, building);

    // Recipe list placeholder
    this.renderRecipeList(ctx, building);

    // Close button
    this.renderCloseButton(ctx);
  }

  /**
   * Render the station header
   */
  private renderHeaderSection(ctx: CanvasRenderingContext2D, building: BuildingComponent): void {
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 16px monospace';
    ctx.fillText(this.getStationName(building.buildingType), this.x + 10, this.y + 25);

    // Station icon/type
    ctx.fillStyle = '#cccccc';
    ctx.font = '12px monospace';
    ctx.fillText(`Tier ${building.tier} Crafting Station`, this.x + 10, this.y + 45);
  }

  /**
   * Render the fuel gauge
   */
  private renderFuelGauge(ctx: CanvasRenderingContext2D, building: BuildingComponent): void {
    const gaugeX = this.x + 10;
    const gaugeY = this.y + 60;
    const gaugeWidth = this.width - 20;
    const gaugeHeight = 20;

    // Background
    ctx.fillStyle = '#333333';
    ctx.fillRect(gaugeX, gaugeY, gaugeWidth, gaugeHeight);

    // Fuel fill
    const fuelPercent = building.currentFuel / building.maxFuel;
    const fillWidth = gaugeWidth * fuelPercent;

    // Color based on fuel level
    if (fuelPercent > 0.5) {
      ctx.fillStyle = '#4CAF50'; // Green
    } else if (fuelPercent > 0.2) {
      ctx.fillStyle = '#FFC107'; // Yellow
    } else {
      ctx.fillStyle = '#F44336'; // Red
    }

    ctx.fillRect(gaugeX, gaugeY, fillWidth, gaugeHeight);

    // Border
    ctx.strokeStyle = '#654321';
    ctx.lineWidth = 1;
    ctx.strokeRect(gaugeX, gaugeY, gaugeWidth, gaugeHeight);

    // Text
    ctx.fillStyle = '#ffffff';
    ctx.font = '10px monospace';
    ctx.fillText(
      `Fuel: ${building.currentFuel.toFixed(0)}/${building.maxFuel}`,
      gaugeX + 5,
      gaugeY + 14
    );

    // Add fuel button
    const buttonX = gaugeX;
    const buttonY = gaugeY + gaugeHeight + 5;
    const buttonWidth = 100;
    const buttonHeight = 25;

    ctx.fillStyle = '#8B4513';
    ctx.fillRect(buttonX, buttonY, buttonWidth, buttonHeight);

    ctx.strokeStyle = '#654321';
    ctx.lineWidth = 1;
    ctx.strokeRect(buttonX, buttonY, buttonWidth, buttonHeight);

    ctx.fillStyle = '#ffffff';
    ctx.font = '10px monospace';
    ctx.fillText('Add Fuel', buttonX + 20, buttonY + 16);
  }

  /**
   * Render crafting bonuses
   */
  private renderBonuses(ctx: CanvasRenderingContext2D, building: BuildingComponent): void {
    const startY = building.fuelRequired ? this.y + 120 : this.y + 60;

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 12px monospace';
    ctx.fillText('Bonuses:', this.x + 10, startY);

    // Get bonuses from building type
    const bonuses = this.getBonuses(building.buildingType);

    ctx.fillStyle = '#cccccc';
    ctx.font = '11px monospace';
    bonuses.forEach((bonus, i) => {
      ctx.fillText(`• ${bonus}`, this.x + 15, startY + 20 + i * 15);
    });
  }

  /**
   * Render recipe list placeholder
   */
  private renderRecipeList(ctx: CanvasRenderingContext2D, building: BuildingComponent): void {
    const startY = building.fuelRequired ? this.y + 200 : this.y + 140;

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 12px monospace';
    ctx.fillText('Recipes:', this.x + 10, startY);

    // Get recipes from building type
    const recipes = this.getRecipes(building.buildingType);

    ctx.fillStyle = '#cccccc';
    ctx.font = '11px monospace';
    recipes.forEach((recipe, i) => {
      ctx.fillText(`• ${recipe}`, this.x + 15, startY + 20 + i * 15);
    });
  }

  /**
   * Render close button
   */
  private renderCloseButton(ctx: CanvasRenderingContext2D): void {
    const buttonX = this.x + this.width - 30;
    const buttonY = this.y + 5;
    const buttonSize = 20;

    // Button background
    ctx.fillStyle = '#8B4513';
    ctx.fillRect(buttonX, buttonY, buttonSize, buttonSize);

    // Border
    ctx.strokeStyle = '#654321';
    ctx.lineWidth = 1;
    ctx.strokeRect(buttonX, buttonY, buttonSize, buttonSize);

    // X
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(buttonX + 5, buttonY + 5);
    ctx.lineTo(buttonX + buttonSize - 5, buttonY + buttonSize - 5);
    ctx.moveTo(buttonX + buttonSize - 5, buttonY + 5);
    ctx.lineTo(buttonX + 5, buttonY + buttonSize - 5);
    ctx.stroke();
  }

  /**
   * Get display name for a building type
   */
  private getStationName(buildingType: string): string {
    const names: Record<string, string> = {
      'forge': 'Forge',
      'farm_shed': 'Farm Shed',
      'market_stall': 'Market Stall',
      'windmill': 'Windmill',
      'workshop': 'Workshop',
      'barn': 'Barn',
      'workbench': 'Workbench',
    };

    return names[buildingType] || buildingType;
  }

  /**
   * Get bonuses for a building type
   */
  private getBonuses(buildingType: string): string[] {
    const bonuses: Record<string, string[]> = {
      'forge': ['+50% metalworking speed', 'Unlocks metal recipes'],
      'farm_shed': ['Large seed storage', 'Organized tool storage'],
      'market_stall': ['Basic trading', 'Shop functionality'],
      'windmill': ['Grain processing', 'Wind-powered'],
      'workshop': ['+30% crafting speed', 'Advanced recipes', 'Multi-purpose'],
      'barn': ['Large storage (100 slots)', 'Animal housing'],
      'workbench': ['Basic crafting', 'Simple tools'],
    };

    return bonuses[buildingType] || ['No bonuses'];
  }

  /**
   * Get recipes for a building type
   */
  private getRecipes(buildingType: string): string[] {
    const recipes: Record<string, string[]> = {
      'forge': ['Iron Ingot', 'Steel Sword', 'Iron Tools', 'Steel Ingot'],
      'farm_shed': ['(Storage only - no recipes)'],
      'market_stall': ['(Trading only - no recipes)'],
      'windmill': ['Flour', 'Grain Products'],
      'workshop': ['Advanced Tools', 'Machinery', 'Furniture', 'Weapons', 'Armor', 'Complex Items'],
      'barn': ['(Storage only - no recipes)'],
      'workbench': ['Basic Tools', 'Basic Items'],
    };

    return recipes[buildingType] || ['No recipes'];
  }

  /**
   * Handle click events on the panel
   */
  handleClick(x: number, y: number): boolean {
    if (!this.isVisible) {
      return false;
    }

    // Check if click is on close button
    const closeButtonX = this.x + this.width - 30;
    const closeButtonY = this.y + 5;
    const closeButtonSize = 20;

    if (
      x >= closeButtonX &&
      x <= closeButtonX + closeButtonSize &&
      y >= closeButtonY &&
      y <= closeButtonY + closeButtonSize
    ) {
      this.close();
      return true;
    }

    // Check if click is on add fuel button (if fuel required)
    if (this.selectedStation) {
      const building = this.selectedStation.components.get('building') as BuildingComponent | undefined;
      if (building?.fuelRequired) {
        const gaugeX = this.x + 10;
        const gaugeY = this.y + 60;
        const buttonX = gaugeX;
        const buttonY = gaugeY + 20 + 5;
        const buttonWidth = 100;
        const buttonHeight = 25;

        if (
          x >= buttonX &&
          x <= buttonX + buttonWidth &&
          y >= buttonY &&
          y <= buttonY + buttonHeight
        ) {
          this.handleAddFuel();
          return true;
        }
      }
    }

    // Check if click is anywhere on the panel (consume event)
    if (x >= this.x && x <= this.x + this.width && y >= this.y && y <= this.y + this.height) {
      return true; // Consumed
    }

    return false;
  }

  /**
   * Handle adding fuel to the station
   */
  private handleAddFuel(): void {
    if (!this.selectedStation) {
      return;
    }

    // For now, just add 10 fuel (placeholder)
    // In a real implementation, this would deduct fuel items from inventory
    const building = this.selectedStation.components.get('building') as BuildingComponent | undefined;
    if (building?.fuelRequired) {
      const newFuel = Math.min(building.maxFuel, building.currentFuel + 10);

      // Type assertion: Cast to EntityImpl to access implementation methods
      // Entity interface doesn't include updateComponent/getComponent methods
      const stationImpl = this.selectedStation as EntityImpl;
      stationImpl.updateComponent<BuildingComponent>('building', (comp) => ({
        ...comp,
        currentFuel: newFuel,
      }));
    }
  }
}
