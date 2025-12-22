/**
 * BuildingPlacementUI - Main UI component for building placement.
 *
 * Implements:
 * - REQ-BPLACE-001: Building Selection Menu
 * - REQ-BPLACE-002: Ghost Preview
 * - REQ-BPLACE-003: Grid Snapping
 * - REQ-BPLACE-004: Rotation Controls
 * - REQ-BPLACE-005: Validity Indicators
 * - REQ-BPLACE-006: Resource Requirements Panel
 * - REQ-BPLACE-007: Placement Confirmation
 * - REQ-BPLACE-012: Keyboard Shortcuts
 *
 * Per CLAUDE.md: No silent fallbacks - throws on invalid operations.
 */

import type { World } from '@ai-village/core';
import type { EventBus } from '@ai-village/core';
import type {
  BuildingBlueprint,
  BuildingCategory,
  BuildingBlueprintRegistry,
  PlacementValidator,
  PlacementValidationResult,
} from '@ai-village/core';
import { Camera } from './Camera.js';
import { GhostRenderer, type GhostState } from './GhostRenderer.js';

export interface PlacementState {
  isMenuOpen: boolean;
  isInPlacementMode: boolean;
  selectedBlueprint: BuildingBlueprint | null;
  selectedCategory: BuildingCategory;
  ghostPosition: { x: number; y: number } | null;
  ghostRotation: number;
  validationResult: PlacementValidationResult | null;
  cursorScreenPosition: { x: number; y: number };
  hoveredBlueprint: BuildingBlueprint | null;
}

export interface BuildingPlacementUIOptions {
  registry: BuildingBlueprintRegistry;
  validator: PlacementValidator;
  camera: Camera;
  eventBus: EventBus;
}

/**
 * Manages building placement UI state and rendering.
 */
export class BuildingPlacementUI {
  private readonly registry: BuildingBlueprintRegistry;
  private readonly validator: PlacementValidator;
  private readonly camera: Camera;
  private readonly eventBus: EventBus;
  private readonly ghostRenderer: GhostRenderer;
  private readonly tileSize = 16;

  private state: PlacementState = {
    isMenuOpen: false,
    isInPlacementMode: false,
    selectedBlueprint: null,
    selectedCategory: 'production', // Start with production to show Workbench and Campfire
    ghostPosition: null,
    ghostRotation: 0,
    validationResult: null,
    cursorScreenPosition: { x: 0, y: 0 },
    hoveredBlueprint: null,
  };

  // Menu dimensions
  private readonly menuWidth = 200;
  private readonly menuPadding = 10;
  private readonly categoryTabHeight = 32;
  private readonly buildingCardSize = 64;
  private readonly buildingCardMargin = 8;

  constructor(options: BuildingPlacementUIOptions) {
    this.registry = options.registry;
    this.validator = options.validator;
    this.camera = options.camera;
    this.eventBus = options.eventBus;
    this.ghostRenderer = new GhostRenderer();
  }

  /**
   * Get current placement state.
   */
  getState(): Readonly<PlacementState> {
    return this.state;
  }

  /**
   * Check if the building menu is currently open.
   */
  isMenuOpen(): boolean {
    return this.state.isMenuOpen;
  }

  /**
   * Check if in placement mode (ghost visible).
   */
  isInPlacementMode(): boolean {
    return this.state.isInPlacementMode;
  }

  /**
   * Toggle the building menu open/closed.
   * Triggered by 'B' key.
   */
  toggleMenu(): void {
    console.log(`[BuildingPlacementUI] toggleMenu called, current state: ${this.state.isMenuOpen}`);
    if (this.state.isMenuOpen) {
      this.closeMenu();
    } else {
      this.openMenu();
    }
  }

  /**
   * Open the building selection menu.
   */
  openMenu(): void {
    console.log(`[BuildingPlacementUI] openMenu called, setting isMenuOpen to true`);
    this.state.isMenuOpen = true;
    this.eventBus.emit({
      type: 'building:menu:opened',
      source: 'building-placement-ui',
      data: {},
    });
    console.log(`[BuildingPlacementUI] Menu is now open: ${this.state.isMenuOpen}`);
  }

  /**
   * Close the building selection menu.
   */
  closeMenu(): void {
    this.state.isMenuOpen = false;
    this.eventBus.emit({
      type: 'building:menu:closed',
      source: 'building-placement-ui',
      data: {},
    });
  }

  /**
   * Select a category in the menu.
   */
  selectCategory(category: BuildingCategory): void {
    this.state.selectedCategory = category;
  }

  /**
   * Select a building from the menu and enter placement mode.
   */
  selectBuilding(blueprintId: string): void {
    console.log(`[BuildingPlacementUI] selectBuilding called with ID: ${blueprintId}`);
    const blueprint = this.registry.get(blueprintId);
    console.log(`[BuildingPlacementUI] Blueprint found:`, blueprint);

    this.state.selectedBlueprint = blueprint;
    this.state.isInPlacementMode = true;
    this.state.ghostRotation = 0;
    console.log(`[BuildingPlacementUI] Entering placement mode, closing menu`);
    this.closeMenu();

    this.eventBus.emit({
      type: 'building:placement:started',
      source: 'building-placement-ui',
      data: { blueprintId },
    });
    console.log(`[BuildingPlacementUI] Emitted building:placement:started event`);
  }

  /**
   * Update cursor position and ghost preview.
   * Called on mouse move.
   */
  updateCursorPosition(screenX: number, screenY: number, world: World): void {
    this.state.cursorScreenPosition = { x: screenX, y: screenY };

    // Update hovered blueprint if menu is open
    if (this.state.isMenuOpen) {
      this.updateHoveredBlueprint(screenX, screenY);
    }

    if (!this.state.isInPlacementMode || !this.state.selectedBlueprint) {
      return;
    }

    // Convert screen position to world position
    const worldPos = this.camera.screenToWorld(screenX, screenY);

    // Snap to grid
    const snapped = this.validator.snapToGrid(worldPos.x, worldPos.y, this.tileSize);
    this.state.ghostPosition = snapped;

    // Validate placement
    this.state.validationResult = this.validator.validate(
      snapped,
      this.state.selectedBlueprint,
      world,
      undefined, // No inventory check for now
      this.state.ghostRotation
    );
  }

  /**
   * Update which building is currently hovered in the menu.
   */
  private updateHoveredBlueprint(screenX: number, screenY: number): void {
    if (!this.state.isMenuOpen || screenX >= this.menuWidth) {
      this.state.hoveredBlueprint = null;
      return;
    }

    // Category tabs area (after title + subtitle)
    const tabY = this.menuPadding + 38;
    const tabHeight = this.categoryTabHeight - 8;
    const cardsY = tabY + tabHeight + 15;

    // Check if hovering over a building card
    const buildings = this.registry.getByCategory(this.state.selectedCategory);
    const cardsPerRow = Math.floor(
      (this.menuWidth - this.menuPadding * 2) /
        (this.buildingCardSize + this.buildingCardMargin)
    );

    for (let i = 0; i < buildings.length; i++) {
      const row = Math.floor(i / cardsPerRow);
      const col = i % cardsPerRow;

      const cardX =
        this.menuPadding + col * (this.buildingCardSize + this.buildingCardMargin);
      const cardY = cardsY + row * (this.buildingCardSize + this.buildingCardMargin);

      if (
        screenX >= cardX &&
        screenX < cardX + this.buildingCardSize &&
        screenY >= cardY &&
        screenY < cardY + this.buildingCardSize
      ) {
        this.state.hoveredBlueprint = buildings[i] ?? null;
        return;
      }
    }

    this.state.hoveredBlueprint = null;
  }

  /**
   * Rotate building clockwise.
   * Triggered by 'R' key.
   */
  rotateClockwise(): void {
    if (!this.state.isInPlacementMode || !this.state.selectedBlueprint) {
      return;
    }

    if (!this.state.selectedBlueprint.canRotate) {
      return;
    }

    const angles = this.state.selectedBlueprint.rotationAngles;
    const currentIndex = angles.indexOf(this.state.ghostRotation);
    const nextIndex = (currentIndex + 1) % angles.length;
    this.state.ghostRotation = angles[nextIndex] ?? 0;
  }

  /**
   * Rotate building counter-clockwise.
   * Triggered by 'Shift+R' key.
   */
  rotateCounterClockwise(): void {
    if (!this.state.isInPlacementMode || !this.state.selectedBlueprint) {
      return;
    }

    if (!this.state.selectedBlueprint.canRotate) {
      return;
    }

    const angles = this.state.selectedBlueprint.rotationAngles;
    const currentIndex = angles.indexOf(this.state.ghostRotation);
    const nextIndex = (currentIndex - 1 + angles.length) % angles.length;
    this.state.ghostRotation = angles[nextIndex] ?? 0;
  }

  /**
   * Confirm building placement.
   * Triggered by 'Enter' or left click on valid position.
   */
  confirmPlacement(): boolean {
    if (!this.state.isInPlacementMode) {
      return false;
    }

    if (!this.state.selectedBlueprint || !this.state.ghostPosition) {
      return false;
    }

    if (!this.state.validationResult?.valid) {
      return false;
    }

    // Emit placement confirmed event
    this.eventBus.emit({
      type: 'building:placement:confirmed',
      source: 'building-placement-ui',
      data: {
        blueprintId: this.state.selectedBlueprint.id,
        position: { ...this.state.ghostPosition },
        rotation: this.state.ghostRotation,
      },
    });

    // Stay in placement mode for quick placement
    // Reset ghost position
    this.state.validationResult = null;

    return true;
  }

  /**
   * Cancel building placement.
   * Triggered by 'Escape' or right click.
   */
  cancelPlacement(): void {
    if (!this.state.isInPlacementMode) {
      return;
    }

    this.state.isInPlacementMode = false;
    this.state.selectedBlueprint = null;
    this.state.ghostPosition = null;
    this.state.ghostRotation = 0;
    this.state.validationResult = null;

    this.eventBus.emit({
      type: 'building:placement:cancelled',
      source: 'building-placement-ui',
      data: {},
    });
  }

  /**
   * Handle keyboard input.
   * @returns true if the input was handled
   */
  handleKeyDown(key: string, shiftKey: boolean): boolean {
    console.log(`[BuildingPlacementUI] handleKeyDown called: key="${key}", shiftKey=${shiftKey}`);
    switch (key.toLowerCase()) {
      case 'b':
        console.log(`[BuildingPlacementUI] 'B' key pressed, toggling menu`);
        this.toggleMenu();
        return true;

      case 'r':
        if (this.state.isInPlacementMode) {
          if (shiftKey) {
            this.rotateCounterClockwise();
          } else {
            this.rotateClockwise();
          }
          return true;
        }
        return false;

      case 'escape':
        if (this.state.isInPlacementMode) {
          this.cancelPlacement();
          return true;
        }
        if (this.state.isMenuOpen) {
          this.closeMenu();
          return true;
        }
        return false;

      case 'enter':
        if (this.state.isInPlacementMode) {
          return this.confirmPlacement();
        }
        return false;

      default:
        return false;
    }
  }

  /**
   * Handle mouse click.
   * @param screenX Screen X coordinate
   * @param screenY Screen Y coordinate
   * @param button Mouse button (0=left, 2=right)
   * @returns true if the click was handled
   */
  handleClick(screenX: number, screenY: number, button: number): boolean {
    console.log(`[BuildingPlacementUI] handleClick: (${screenX}, ${screenY}), button: ${button}, menuOpen: ${this.state.isMenuOpen}, inPlacementMode: ${this.state.isInPlacementMode}`);

    // Right click cancels placement
    if (button === 2 && this.state.isInPlacementMode) {
      console.log(`[BuildingPlacementUI] Right click - cancelling placement`);
      this.cancelPlacement();
      return true;
    }

    // Check if click is in menu area
    if (this.state.isMenuOpen && screenX < this.menuWidth) {
      console.log(`[BuildingPlacementUI] Click is in menu area`);
      return this.handleMenuClick(screenX, screenY);
    }

    // Left click confirms placement
    if (button === 0 && this.state.isInPlacementMode) {
      console.log(`[BuildingPlacementUI] Left click in placement mode - confirming`);
      return this.confirmPlacement();
    }

    console.log(`[BuildingPlacementUI] Click not handled`);
    return false;
  }

  /**
   * Handle click within the menu.
   */
  private handleMenuClick(screenX: number, screenY: number): boolean {
    console.log(`[BuildingPlacementUI] Menu click at (${screenX}, ${screenY})`);

    // Calculate category tabs
    const categories: BuildingCategory[] = [
      'residential',
      'production',
      'storage',
      'commercial',
      'community',
      'farming',
      'research',
      'decoration',
    ];

    // Check category tab clicks
    // Note: tabs are rendered at menuPadding + 38 (after title + subtitle)
    const tabY = this.menuPadding + 38;
    const tabHeight = this.categoryTabHeight - 8; // Match rendering height

    if (screenY >= tabY && screenY < tabY + tabHeight) {
      const tabWidth = (this.menuWidth - this.menuPadding * 2) / categories.length;
      const tabIndex = Math.floor((screenX - this.menuPadding) / tabWidth);
      if (tabIndex >= 0 && tabIndex < categories.length) {
        console.log(`[BuildingPlacementUI] Category tab clicked: ${categories[tabIndex]}`);
        this.selectCategory(categories[tabIndex]!);
        return true;
      }
    }

    // Check building card clicks
    // Note: cards are rendered at tabY + tabHeight + 15
    const cardsY = tabY + tabHeight + 15;
    const buildings = this.registry.getByCategory(this.state.selectedCategory);
    console.log(`[BuildingPlacementUI] Checking ${buildings.length} buildings in category ${this.state.selectedCategory}`);

    const cardsPerRow = Math.floor(
      (this.menuWidth - this.menuPadding * 2) /
        (this.buildingCardSize + this.buildingCardMargin)
    );

    for (let i = 0; i < buildings.length; i++) {
      const row = Math.floor(i / cardsPerRow);
      const col = i % cardsPerRow;

      const cardX =
        this.menuPadding + col * (this.buildingCardSize + this.buildingCardMargin);
      const cardY = cardsY + row * (this.buildingCardSize + this.buildingCardMargin);

      if (
        screenX >= cardX &&
        screenX < cardX + this.buildingCardSize &&
        screenY >= cardY &&
        screenY < cardY + this.buildingCardSize
      ) {
        const building = buildings[i];
        console.log(`[BuildingPlacementUI] Building card clicked: ${building?.name}, unlocked: ${building?.unlocked}`);
        if (building && building.unlocked) {
          this.selectBuilding(building.id);
          return true;
        } else if (building && !building.unlocked) {
          console.log(`[BuildingPlacementUI] Building ${building.name} is locked`);
          return true;
        }
      }
    }

    console.log(`[BuildingPlacementUI] Click was in menu area but no building/category hit`);
    return true; // Click was in menu area
  }

  /**
   * Render the building placement UI.
   */
  render(ctx: CanvasRenderingContext2D): void {
    // Render ghost preview
    if (this.state.isInPlacementMode && this.state.ghostPosition && this.state.selectedBlueprint) {
      const screenPos = this.camera.worldToScreen(
        this.state.ghostPosition.x,
        this.state.ghostPosition.y
      );

      const ghostState: GhostState = {
        blueprintId: this.state.selectedBlueprint.id,
        position: this.state.ghostPosition,
        rotation: this.state.ghostRotation,
        isValid: this.state.validationResult?.valid ?? false,
        width: this.state.selectedBlueprint.width,
        height: this.state.selectedBlueprint.height,
      };

      this.ghostRenderer.render(
        ctx,
        ghostState,
        screenPos.x,
        screenPos.y,
        this.camera.zoom
      );

      // Render error tooltip if invalid
      if (this.state.validationResult && !this.state.validationResult.valid) {
        this.renderErrorTooltip(ctx, screenPos.x, screenPos.y - 30);
      }

      // Render resource requirements panel
      this.renderResourcePanel(ctx, this.state.selectedBlueprint);
    }

    // Render building menu
    if (this.state.isMenuOpen) {
      this.renderMenu(ctx);

      // Render building info tooltip if hovering over a building
      if (this.state.hoveredBlueprint) {
        this.renderBuildingTooltip(ctx, this.state.hoveredBlueprint);
      }
    }
  }

  /**
   * Render the building selection menu.
   */
  private renderMenu(ctx: CanvasRenderingContext2D): void {
    const menuHeight = ctx.canvas.height;

    console.log(`[BuildingPlacementUI] Rendering menu: menuWidth=${this.menuWidth}, menuHeight=${menuHeight}, canvas.width=${ctx.canvas.width}, canvas.height=${ctx.canvas.height}`);

    // Menu background
    ctx.fillStyle = 'rgba(40, 30, 20, 0.95)';
    ctx.fillRect(0, 0, this.menuWidth, menuHeight);

    // Border
    ctx.strokeStyle = '#654321';
    ctx.lineWidth = 2;
    ctx.strokeRect(0, 0, this.menuWidth, menuHeight);

    // Title
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 14px monospace';
    ctx.fillText('Buildings', this.menuPadding, 20);

    // Subtitle hint
    ctx.fillStyle = '#888888';
    ctx.font = '8px monospace';
    ctx.fillText('Click tabs to browse categories', this.menuPadding, 32);

    // Category tabs
    const categories: BuildingCategory[] = [
      'residential',
      'production',
      'storage',
      'commercial',
      'community',
      'farming',
      'research',
      'decoration',
    ];

    const tabY = this.menuPadding + 38; // After title + subtitle
    const tabWidth = (this.menuWidth - this.menuPadding * 2) / categories.length;
    const tabHeight = this.categoryTabHeight - 8;

    categories.forEach((cat, i) => {
      const tabX = this.menuPadding + i * tabWidth;
      const isSelected = cat === this.state.selectedCategory;

      // Tab background
      ctx.fillStyle = isSelected ? '#8B4513' : 'rgba(100, 80, 60, 0.8)';
      ctx.fillRect(tabX, tabY, tabWidth - 2, tabHeight);

      // Tab border for selected
      if (isSelected) {
        ctx.strokeStyle = '#FFD700';
        ctx.lineWidth = 1;
        ctx.strokeRect(tabX, tabY, tabWidth - 2, tabHeight);
      }

      // Tab text (better abbreviations to avoid confusion)
      ctx.fillStyle = isSelected ? '#FFD700' : '#cccccc';
      ctx.font = isSelected ? 'bold 10px monospace' : '9px monospace';
      const labelMap: Record<BuildingCategory, string> = {
        residential: 'Res',
        production: 'Pro',
        storage: 'Sto',
        commercial: 'Com',
        community: 'Cmn',
        farming: 'Frm',
        research: 'Rch',
        decoration: 'Dec',
      };
      const label = labelMap[cat];
      const metrics = ctx.measureText(label);
      ctx.fillText(label, tabX + (tabWidth - metrics.width) / 2, tabY + tabHeight / 2 + 4);
    });

    // Building cards
    const cardsY = tabY + tabHeight + 15;
    const buildings = this.registry.getByCategory(this.state.selectedCategory);

    const cardsPerRow = Math.floor(
      (this.menuWidth - this.menuPadding * 2) /
        (this.buildingCardSize + this.buildingCardMargin)
    );

    buildings.forEach((building, i) => {
      const row = Math.floor(i / cardsPerRow);
      const col = i % cardsPerRow;

      const cardX =
        this.menuPadding + col * (this.buildingCardSize + this.buildingCardMargin);
      const cardY = cardsY + row * (this.buildingCardSize + this.buildingCardMargin);

      // Card background
      ctx.fillStyle = building.unlocked ? 'rgba(80, 60, 40, 0.9)' : 'rgba(40, 40, 40, 0.9)';
      ctx.fillRect(cardX, cardY, this.buildingCardSize, this.buildingCardSize);

      // Card border
      ctx.strokeStyle = building.unlocked ? '#654321' : '#444444';
      ctx.lineWidth = 1;
      ctx.strokeRect(cardX, cardY, this.buildingCardSize, this.buildingCardSize);

      // Building icon (placeholder - just the first letter)
      ctx.fillStyle = building.unlocked ? '#ffffff' : '#666666';
      ctx.font = 'bold 16px monospace';
      ctx.fillText(
        building.name.charAt(0),
        cardX + this.buildingCardSize / 2 - 5,
        cardY + this.buildingCardSize / 2 + 6
      );

      // Building name
      ctx.font = '8px monospace';
      ctx.fillText(
        building.name.substring(0, 8),
        cardX + 2,
        cardY + this.buildingCardSize - 4
      );
    });

    // Close hint
    ctx.fillStyle = '#888888';
    ctx.font = '10px monospace';
    ctx.fillText('Press B to close', this.menuPadding, menuHeight - 10);
  }

  /**
   * Render validation error tooltip.
   */
  private renderErrorTooltip(ctx: CanvasRenderingContext2D, x: number, y: number): void {
    if (!this.state.validationResult || this.state.validationResult.errors.length === 0) {
      return;
    }

    const errors = this.state.validationResult.errors.slice(0, 3);
    const padding = 5;
    const lineHeight = 14;
    const maxWidth = 200;

    // Calculate tooltip dimensions
    ctx.font = '10px monospace';
    const textWidth = Math.min(
      maxWidth,
      Math.max(...errors.map((e) => ctx.measureText(e.message).width))
    );
    const tooltipWidth = textWidth + padding * 2;
    const tooltipHeight = errors.length * lineHeight + padding * 2;

    // Position above cursor, centered
    const tooltipX = x - tooltipWidth / 2;
    const tooltipY = y - tooltipHeight;

    // Background
    ctx.fillStyle = 'rgba(60, 20, 20, 0.95)';
    ctx.fillRect(tooltipX, tooltipY, tooltipWidth, tooltipHeight);

    // Border
    ctx.strokeStyle = '#cc0000';
    ctx.lineWidth = 1;
    ctx.strokeRect(tooltipX, tooltipY, tooltipWidth, tooltipHeight);

    // Error text
    ctx.fillStyle = '#ff6666';
    errors.forEach((error, i) => {
      const text = error.message.length > 30
        ? error.message.substring(0, 27) + '...'
        : error.message;
      ctx.fillText(
        text,
        tooltipX + padding,
        tooltipY + padding + (i + 1) * lineHeight - 3
      );
    });
  }

  /**
   * Render resource requirements panel.
   */
  private renderResourcePanel(
    ctx: CanvasRenderingContext2D,
    blueprint: BuildingBlueprint
  ): void {
    if (blueprint.resourceCost.length === 0) {
      return;
    }

    const panelWidth = 150;
    const panelHeight = 20 + blueprint.resourceCost.length * 18;
    const panelX = ctx.canvas.width / 2 - panelWidth / 2;
    const panelY = ctx.canvas.height - panelHeight - 20;

    // Background
    ctx.fillStyle = 'rgba(30, 30, 30, 0.9)';
    ctx.fillRect(panelX, panelY, panelWidth, panelHeight);

    // Border
    ctx.strokeStyle = '#555555';
    ctx.lineWidth = 1;
    ctx.strokeRect(panelX, panelY, panelWidth, panelHeight);

    // Title
    ctx.fillStyle = '#ffffff';
    ctx.font = '10px monospace';
    ctx.fillText('Resources Required:', panelX + 5, panelY + 12);

    // Resource list
    blueprint.resourceCost.forEach((cost, i) => {
      const y = panelY + 25 + i * 16;

      // For Phase 7 MVP, show requirements without checking inventory
      // All shown as available (green) since we're not tracking inventory yet
      ctx.fillStyle = '#00ff00';
      ctx.fillText(
        `${cost.resourceId}: ${cost.amountRequired}`,
        panelX + 10,
        y
      );
    });
  }

  /**
   * Render building information tooltip when hovering over a building card.
   */
  private renderBuildingTooltip(
    ctx: CanvasRenderingContext2D,
    blueprint: BuildingBlueprint
  ): void {
    const tooltipWidth = 300;
    const lineHeight = 14;
    const padding = 8;

    // Calculate tooltip height based on content
    let contentLines = 3; // Name, tier, description
    contentLines += blueprint.resourceCost.length; // Resource costs
    contentLines += blueprint.functionality.length; // Functionality items
    const tooltipHeight = contentLines * lineHeight + padding * 2 + 10;

    // Position tooltip to the right of the menu
    const tooltipX = this.menuWidth + 10;
    const tooltipY = Math.max(10, Math.min(
      this.state.cursorScreenPosition.y - tooltipHeight / 2,
      ctx.canvas.height - tooltipHeight - 10
    ));

    // Background
    ctx.fillStyle = 'rgba(20, 15, 10, 0.95)';
    ctx.fillRect(tooltipX, tooltipY, tooltipWidth, tooltipHeight);

    // Border
    ctx.strokeStyle = blueprint.unlocked ? '#8B4513' : '#444444';
    ctx.lineWidth = 2;
    ctx.strokeRect(tooltipX, tooltipY, tooltipWidth, tooltipHeight);

    let currentY = tooltipY + padding + lineHeight;

    // Building name
    ctx.fillStyle = blueprint.unlocked ? '#ffffff' : '#888888';
    ctx.font = 'bold 12px monospace';
    ctx.fillText(blueprint.name, tooltipX + padding, currentY);
    currentY += lineHeight;

    // Tier
    ctx.fillStyle = '#aaaaaa';
    ctx.font = '10px monospace';
    ctx.fillText(
      `Tier ${blueprint.tier} | ${blueprint.width}x${blueprint.height} tiles`,
      tooltipX + padding,
      currentY
    );
    currentY += lineHeight;

    // Description
    ctx.fillStyle = '#cccccc';
    ctx.font = '9px monospace';
    const wrappedDesc = this.wrapText(ctx, blueprint.description, tooltipWidth - padding * 2);
    wrappedDesc.forEach((line) => {
      ctx.fillText(line, tooltipX + padding, currentY);
      currentY += lineHeight;
    });

    currentY += 5; // Extra spacing

    // Resource costs
    if (blueprint.resourceCost.length > 0) {
      ctx.fillStyle = '#ffcc66';
      ctx.font = 'bold 10px monospace';
      ctx.fillText('Cost:', tooltipX + padding, currentY);
      currentY += lineHeight;

      ctx.font = '9px monospace';
      blueprint.resourceCost.forEach((cost) => {
        ctx.fillStyle = '#ffcc66';
        ctx.fillText(
          `  ${cost.resourceId}: ${cost.amountRequired}`,
          tooltipX + padding,
          currentY
        );
        currentY += lineHeight;
      });
    }

    // Functionality
    if (blueprint.functionality.length > 0) {
      ctx.fillStyle = '#66ccff';
      ctx.font = 'bold 10px monospace';
      ctx.fillText('Provides:', tooltipX + padding, currentY);
      currentY += lineHeight;

      ctx.font = '9px monospace';
      blueprint.functionality.forEach((func) => {
        let funcText = '';
        switch (func.type) {
          case 'crafting':
            funcText = `  Crafting (${func.speed}x speed)`;
            break;
          case 'storage':
            funcText = `  Storage (${func.capacity} slots)`;
            break;
          case 'sleeping':
            funcText = `  Sleeping (${func.restBonus}x rest)`;
            break;
          case 'shop':
            funcText = `  Shop (${func.shopType})`;
            break;
          case 'research':
            funcText = `  Research (+${func.bonus}% speed)`;
            break;
          case 'gathering_boost':
            funcText = `  Gathering (radius ${func.radius})`;
            break;
          case 'mood_aura':
            funcText = `  Mood +${func.moodBonus} (radius ${func.radius})`;
            break;
          case 'automation':
            funcText = `  Automation (${func.tasks.length} tasks)`;
            break;
        }
        ctx.fillStyle = '#66ccff';
        ctx.fillText(funcText, tooltipX + padding, currentY);
        currentY += lineHeight;
      });
    }

    // Build time
    ctx.fillStyle = '#aaaaaa';
    ctx.font = '9px monospace';
    ctx.fillText(
      `Build time: ${blueprint.buildTime}s`,
      tooltipX + padding,
      currentY
    );
  }

  /**
   * Wrap text to fit within a maximum width.
   */
  private wrapText(
    ctx: CanvasRenderingContext2D,
    text: string,
    maxWidth: number
  ): string[] {
    const words = text.split(' ');
    const lines: string[] = [];
    let currentLine = '';

    for (const word of words) {
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      const metrics = ctx.measureText(testLine);

      if (metrics.width > maxWidth && currentLine) {
        lines.push(currentLine);
        currentLine = word;
      } else {
        currentLine = testLine;
      }
    }

    if (currentLine) {
      lines.push(currentLine);
    }

    return lines;
  }
}
