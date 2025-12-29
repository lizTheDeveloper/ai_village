import type { Entity } from '@ai-village/core';

/**
 * UI Panel displaying information about the selected animal.
 * Shows animal status, needs, species info, and bond level.
 */
export class AnimalInfoPanel {
  private selectedEntityId: string | null = null;
  private panelWidth = 300;
  private panelHeight = 450;
  private padding = 8;
  private lineHeight = 16;
  private scrollOffset = 0;
  private maxScrollOffset = 0;
  private contentHeight = 0;

  /**
   * Set the currently selected animal entity.
   * @param entity Animal entity to display, or null to clear selection
   */
  setSelectedEntity(entity: Entity | null): void {
    this.selectedEntityId = entity ? entity.id : null;
  }

  /**
   * Get the currently selected entity ID.
   */
  getSelectedEntityId(): string | null {
    return this.selectedEntityId;
  }

  /**
   * Get the currently selected entity (deprecated, use getSelectedEntityId).
   * Returns null (for backwards compatibility with renderer highlighting).
   */
  getSelectedEntity(): { id: string } | null {
    return this.selectedEntityId ? { id: this.selectedEntityId } : null;
  }

  /**
   * Handle scroll events.
   * @param deltaY Scroll delta (positive = scroll down)
   */
  handleScroll(deltaY: number): void {
    const scrollSpeed = 20;
    this.scrollOffset += deltaY > 0 ? scrollSpeed : -scrollSpeed;
    this.scrollOffset = Math.max(0, Math.min(this.scrollOffset, this.maxScrollOffset));
  }

  /**
   * Render the animal info panel (legacy standalone mode).
   * @param ctx Canvas rendering context
   * @param canvasWidth Width of the canvas
   * @param canvasHeight Height of the canvas
   * @param world World instance to look up the selected entity
   */
  render(ctx: CanvasRenderingContext2D, canvasWidth: number, _canvasHeight: number, world: any): void {
    if (!this.selectedEntityId) {
      return;
    }

    // Guard against undefined world
    if (!world || typeof world.getEntity !== 'function') {
      console.warn('[AnimalInfoPanel] World not available or missing getEntity method');
      return;
    }

    // Position panel in top-right corner
    const x = canvasWidth - this.panelWidth - 20;
    const y = 20;

    // Draw panel background
    ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
    ctx.fillRect(x, y, this.panelWidth, this.panelHeight);

    // Draw panel border
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, this.panelWidth, this.panelHeight);

    this.renderContent(ctx, x, y, world, true);
  }

  /**
   * Render at a specific position (for WindowManager integration).
   * Does not draw background, border, or close button - WindowManager handles those.
   */
  renderAt(ctx: CanvasRenderingContext2D, x: number, y: number, _width: number, _height: number, world: any): void {
    if (!this.selectedEntityId) {
      return;
    }

    if (!world || typeof world.getEntity !== 'function') {
      return;
    }

    this.renderContent(ctx, x, y, world, false);
  }

  /**
   * Render the panel content.
   * @param showCloseButton Whether to render the close button (legacy mode only)
   */
  private renderContent(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    world: any,
    showCloseButton: boolean
  ): void {
    // Look up the entity from the world
    const selectedEntity = world.getEntity(this.selectedEntityId);
    if (!selectedEntity) {
      console.warn('[AnimalInfoPanel] Selected entity not found in world:', this.selectedEntityId);
      this.selectedEntityId = null;
      return;
    }

    // Check if this is actually an animal entity
    const animal = selectedEntity.components.get('animal') as
      | {
          name: string;
          speciesId: string;
          lifeStage: string;
          health: number;
          state: string;
          hunger: number;
          thirst: number;
          energy: number;
          stress: number;
          mood: number;
          wild: boolean;
          bondLevel: number;
          trustLevel: number;
          age: number;
        }
      | undefined;

    if (!animal) {
      return;
    }

    // Get position component
    const position = selectedEntity.components.get('position') as
      | { x: number; y: number }
      | undefined;

    const temperature = selectedEntity.components.get('temperature') as
      | { currentTemp: number; state: string }
      | undefined;

    // Calculate visible area (leave space for buttons at bottom)
    const buttonAreaHeight = 50;
    const visibleHeight = this.panelHeight - buttonAreaHeight;

    // Set up clipping for scrollable content
    ctx.save();
    ctx.beginPath();
    ctx.rect(x, y, this.panelWidth, visibleHeight);
    ctx.clip();

    // Apply scroll offset
    const scrollY = y - this.scrollOffset;

    // Set up text rendering
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 14px monospace';
    ctx.textAlign = 'left';

    let currentY = scrollY + this.padding + this.lineHeight;

    // Title: Animal Name
    ctx.fillText(animal.name, x + this.padding, currentY);
    currentY += this.lineHeight + 4;

    // Species and Life Stage
    ctx.font = '12px monospace';
    ctx.fillStyle = '#AAAAAA';
    ctx.fillText(
      `${this.formatSpeciesName(animal.speciesId)} (${this.formatLifeStage(animal.lifeStage)})`,
      x + this.padding,
      currentY
    );
    currentY += this.lineHeight + 8;

    // Status Section
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 12px monospace';
    ctx.fillText('STATUS', x + this.padding, currentY);
    currentY += this.lineHeight;

    ctx.font = '11px monospace';

    // Wild/Tamed status
    if (animal.wild) {
      ctx.fillStyle = '#FFA500'; // Orange for wild
      ctx.fillText('🦌 Wild Animal', x + this.padding, currentY);
    } else {
      ctx.fillStyle = '#00FF00'; // Green for tamed
      ctx.fillText('🏠 Tamed', x + this.padding, currentY);
    }
    currentY += this.lineHeight;

    // State
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText(`State: ${this.formatState(animal.state)}`, x + this.padding, currentY);
    currentY += this.lineHeight;

    // Age
    ctx.fillText(`Age: ${animal.age.toFixed(1)} days`, x + this.padding, currentY);
    currentY += this.lineHeight + 8;

    // Health Bar
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 12px monospace';
    ctx.fillText('HEALTH', x + this.padding, currentY);
    currentY += this.lineHeight;

    this.drawBar(
      ctx,
      x + this.padding,
      currentY,
      this.panelWidth - this.padding * 2,
      animal.health,
      this.getHealthColor(animal.health)
    );
    currentY += 20;

    // Needs Section
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 12px monospace';
    ctx.fillText('NEEDS', x + this.padding, currentY);
    currentY += this.lineHeight;

    // Hunger (0 = full, 100 = starving, so invert for display)
    ctx.font = '11px monospace';
    ctx.fillText('Hunger', x + this.padding, currentY);
    currentY += this.lineHeight;
    this.drawBar(
      ctx,
      x + this.padding,
      currentY,
      this.panelWidth - this.padding * 2,
      animal.hunger,
      this.getHungerColor(animal.hunger),
      true // Invert: low hunger = good
    );
    currentY += 20;

    // Thirst
    ctx.fillText('Thirst', x + this.padding, currentY);
    currentY += this.lineHeight;
    this.drawBar(
      ctx,
      x + this.padding,
      currentY,
      this.panelWidth - this.padding * 2,
      animal.thirst,
      this.getThirstColor(animal.thirst),
      true // Invert: low thirst = good
    );
    currentY += 20;

    // Energy
    ctx.fillText('Energy', x + this.padding, currentY);
    currentY += this.lineHeight;
    this.drawBar(
      ctx,
      x + this.padding,
      currentY,
      this.panelWidth - this.padding * 2,
      animal.energy,
      this.getEnergyColor(animal.energy)
    );
    currentY += 20;

    // Mood Section
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 12px monospace';
    ctx.fillText('MOOD', x + this.padding, currentY);
    currentY += this.lineHeight;

    ctx.font = '11px monospace';
    ctx.fillText('Stress', x + this.padding, currentY);
    currentY += this.lineHeight;
    this.drawBar(
      ctx,
      x + this.padding,
      currentY,
      this.panelWidth - this.padding * 2,
      animal.stress,
      this.getStressColor(animal.stress),
      true // Invert: low stress = good
    );
    currentY += 20;

    ctx.fillText('Mood', x + this.padding, currentY);
    currentY += this.lineHeight;
    this.drawBar(
      ctx,
      x + this.padding,
      currentY,
      this.panelWidth - this.padding * 2,
      animal.mood,
      this.getMoodColor(animal.mood)
    );
    currentY += 20;

    // Bond & Trust Section (only for tamed or partially tamed animals)
    if (!animal.wild || animal.trustLevel > 0) {
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 12px monospace';
      ctx.fillText('RELATIONSHIP', x + this.padding, currentY);
      currentY += this.lineHeight;

      ctx.font = '11px monospace';

      if (!animal.wild) {
        ctx.fillText(`Bond: ${this.getBondLabel(animal.bondLevel)}`, x + this.padding, currentY);
        currentY += this.lineHeight;
        this.drawBar(
          ctx,
          x + this.padding,
          currentY,
          this.panelWidth - this.padding * 2,
          animal.bondLevel,
          this.getBondColor(animal.bondLevel)
        );
        currentY += 20;
      }

      ctx.fillText(`Trust: ${this.getTrustLabel(animal.trustLevel)}`, x + this.padding, currentY);
      currentY += this.lineHeight;
      this.drawBar(
        ctx,
        x + this.padding,
        currentY,
        this.panelWidth - this.padding * 2,
        animal.trustLevel,
        this.getTrustColor(animal.trustLevel)
      );
      currentY += 20;
    }

    // Temperature Section (if available)
    if (temperature) {
      ctx.fillStyle = '#FFFFFF';
      ctx.font = '11px monospace';
      ctx.fillText(
        `Temp: ${temperature.currentTemp.toFixed(1)}°C (${temperature.state})`,
        x + this.padding,
        currentY
      );
      currentY += this.lineHeight;
    }

    // Position
    if (position) {
      ctx.fillStyle = '#888888';
      ctx.font = '10px monospace';
      ctx.fillText(
        `Position: (${position.x.toFixed(1)}, ${position.y.toFixed(1)})`,
        x + this.padding,
        currentY
      );
      currentY += this.lineHeight + 4;
    }

    // Calculate content height and max scroll
    this.contentHeight = (currentY - scrollY) + this.padding;
    this.maxScrollOffset = Math.max(0, this.contentHeight - visibleHeight);

    // Restore context (end of scrollable content area)
    ctx.restore();

    // Draw scroll indicator if content is scrollable
    if (this.maxScrollOffset > 0) {
      const scrollBarHeight = Math.max(20, (visibleHeight / this.contentHeight) * visibleHeight);
      const scrollBarY = y + (this.scrollOffset / this.maxScrollOffset) * (visibleHeight - scrollBarHeight);

      ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
      ctx.fillRect(x + this.panelWidth - 6, scrollBarY, 4, scrollBarHeight);
    }

    // Action Buttons (drawn outside scroll area)
    const buttonY = y + this.panelHeight - 40;
    const buttonHeight = 30;
    const buttonWidth = (this.panelWidth - 3 * this.padding) / 2;

    // Draw close button (X in top right corner) - only in legacy standalone mode
    if (showCloseButton) {
      const closeButtonSize = 24;
      const closeButtonX = x + this.panelWidth - closeButtonSize - this.padding;
      const closeButtonY = y + this.padding;

      ctx.fillStyle = 'rgba(200, 50, 50, 0.8)';
      ctx.fillRect(closeButtonX, closeButtonY, closeButtonSize, closeButtonSize);
      ctx.strokeStyle = 'rgba(255, 100, 100, 1)';
      ctx.lineWidth = 2;
      ctx.strokeRect(closeButtonX, closeButtonY, closeButtonSize, closeButtonSize);

      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 16px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('×', closeButtonX + closeButtonSize / 2, closeButtonY + closeButtonSize / 2 + 6);
      ctx.textAlign = 'left';
    }

    // Action buttons at bottom
    if (animal.wild) {
      // Tame button (full width for wild animals)
      const tameButtonX = x + this.padding;
      ctx.fillStyle = 'rgba(50, 200, 50, 0.8)';
      ctx.fillRect(tameButtonX, buttonY, buttonWidth * 2 + this.padding, buttonHeight);
      ctx.strokeStyle = 'rgba(100, 255, 100, 1)';
      ctx.lineWidth = 2;
      ctx.strokeRect(tameButtonX, buttonY, buttonWidth * 2 + this.padding, buttonHeight);

      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 14px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('Tame Animal', tameButtonX + buttonWidth + this.padding / 2, buttonY + buttonHeight / 2 + 5);
      ctx.textAlign = 'left';
    } else {
      // Feed button (left)
      const feedButtonX = x + this.padding;
      ctx.fillStyle = 'rgba(50, 150, 200, 0.8)';
      ctx.fillRect(feedButtonX, buttonY, buttonWidth, buttonHeight);
      ctx.strokeStyle = 'rgba(100, 200, 255, 1)';
      ctx.lineWidth = 2;
      ctx.strokeRect(feedButtonX, buttonY, buttonWidth, buttonHeight);

      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 12px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('Feed', feedButtonX + buttonWidth / 2, buttonY + buttonHeight / 2 + 5);

      // Collect button (right)
      const collectButtonX = x + this.padding * 2 + buttonWidth;
      ctx.fillStyle = 'rgba(200, 150, 50, 0.8)';
      ctx.fillRect(collectButtonX, buttonY, buttonWidth, buttonHeight);
      ctx.strokeStyle = 'rgba(255, 200, 100, 1)';
      ctx.lineWidth = 2;
      ctx.strokeRect(collectButtonX, buttonY, buttonWidth, buttonHeight);

      ctx.fillStyle = '#FFFFFF';
      ctx.fillText('Collect', collectButtonX + buttonWidth / 2, buttonY + buttonHeight / 2 + 5);
      ctx.textAlign = 'left';
    }
  }

  /**
   * Draw a horizontal progress bar.
   */
  private drawBar(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    value: number,
    color: string,
    _invertColors: boolean = false
  ): void {
    const height = 12;
    const barValue = Math.max(0, Math.min(100, value));

    // Background (dark gray)
    ctx.fillStyle = 'rgba(50, 50, 50, 0.8)';
    ctx.fillRect(x, y, width, height);

    // Fill bar
    const fillWidth = (width * barValue) / 100;
    ctx.fillStyle = color;
    ctx.fillRect(x, y, fillWidth, height);

    // Border
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.lineWidth = 1;
    ctx.strokeRect(x, y, width, height);

    // Value text
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 10px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(`${barValue.toFixed(0)}%`, x + width / 2, y + height - 2);
    ctx.textAlign = 'left';
  }

  private formatSpeciesName(speciesId: string): string {
    return speciesId.charAt(0).toUpperCase() + speciesId.slice(1);
  }

  private formatLifeStage(stage: string): string {
    return stage.charAt(0).toUpperCase() + stage.slice(1);
  }

  private formatState(state: string): string {
    return state
      .split('_')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  private getHealthColor(health: number): string {
    if (health >= 70) return '#00FF00'; // Green
    if (health >= 40) return '#FFD700'; // Gold
    if (health >= 20) return '#FFA500'; // Orange
    return '#FF0000'; // Red
  }

  private getHungerColor(hunger: number): string {
    // Inverted: low hunger (full) is good
    if (hunger <= 30) return '#00FF00'; // Green (full)
    if (hunger <= 60) return '#FFD700'; // Gold
    if (hunger <= 80) return '#FFA500'; // Orange
    return '#FF0000'; // Red (starving)
  }

  private getThirstColor(thirst: number): string {
    // Inverted: low thirst (hydrated) is good
    if (thirst <= 30) return '#1E90FF'; // Blue (hydrated)
    if (thirst <= 60) return '#00BFFF'; // Light blue
    if (thirst <= 80) return '#FFA500'; // Orange
    return '#FF0000'; // Red (dehydrated)
  }

  private getEnergyColor(energy: number): string {
    if (energy >= 70) return '#00FF00'; // Green
    if (energy >= 40) return '#FFD700'; // Gold
    if (energy >= 20) return '#FFA500'; // Orange
    return '#FF0000'; // Red
  }

  private getStressColor(stress: number): string {
    // Inverted: low stress is good
    if (stress <= 20) return '#00FF00'; // Green (calm)
    if (stress <= 50) return '#FFD700'; // Gold
    if (stress <= 70) return '#FFA500'; // Orange
    return '#FF0000'; // Red (panicked)
  }

  private getMoodColor(mood: number): string {
    if (mood >= 70) return '#00FF00'; // Green (happy)
    if (mood >= 40) return '#FFD700'; // Gold
    if (mood >= 20) return '#FFA500'; // Orange
    return '#FF0000'; // Red (miserable)
  }

  private getBondColor(bondLevel: number): string {
    if (bondLevel >= 80) return '#FF1493'; // Deep pink (bonded)
    if (bondLevel >= 60) return '#FF69B4'; // Hot pink (loyal)
    if (bondLevel >= 40) return '#FFB6C1'; // Light pink (friendly)
    if (bondLevel >= 20) return '#DDA0DD'; // Plum (accepting)
    return '#D3D3D3'; // Light gray (wary)
  }

  private getTrustColor(trustLevel: number): string {
    if (trustLevel >= 70) return '#00FF00'; // Green (high trust)
    if (trustLevel >= 40) return '#FFD700'; // Gold
    if (trustLevel >= 20) return '#FFA500'; // Orange
    return '#888888'; // Gray (low trust)
  }

  private getBondLabel(bondLevel: number): string {
    if (bondLevel >= 81) return 'Bonded';
    if (bondLevel >= 61) return 'Loyal';
    if (bondLevel >= 41) return 'Friendly';
    if (bondLevel >= 21) return 'Accepting';
    return 'Wary';
  }

  private getTrustLabel(trustLevel: number): string {
    if (trustLevel >= 70) return 'High Trust';
    if (trustLevel >= 40) return 'Moderate Trust';
    if (trustLevel >= 20) return 'Low Trust';
    return 'No Trust';
  }

  /**
   * Handle click events on the panel (for close button and action buttons).
   * @param screenX Screen X coordinate
   * @param screenY Screen Y coordinate
   * @param canvasWidth Width of the canvas
   * @param canvasHeight Height of the canvas
   * @param world World instance
   * @returns True if click was handled by the panel
   */
  handleClick(screenX: number, screenY: number, canvasWidth: number, _canvasHeight: number, world: any): boolean {
    if (!this.selectedEntityId) {
      return false;
    }

    // Get entity and animal component
    const selectedEntity = world?.getEntity(this.selectedEntityId);
    if (!selectedEntity) {
      return false;
    }

    const animal = selectedEntity.components.get('animal') as any | undefined;
    if (!animal) {
      return false;
    }

    // Calculate panel position (same as in render)
    const x = canvasWidth - this.panelWidth - 20;
    const y = 20;

    // Check if click is inside panel bounds
    if (
      screenX < x ||
      screenX > x + this.panelWidth ||
      screenY < y ||
      screenY > y + this.panelHeight
    ) {
      return false; // Click outside panel
    }

    // Close button (top-right corner)
    const closeButtonSize = 24;
    const closeButtonX = x + this.panelWidth - closeButtonSize - this.padding;
    const closeButtonY = y + this.padding;

    if (
      screenX >= closeButtonX &&
      screenX <= closeButtonX + closeButtonSize &&
      screenY >= closeButtonY &&
      screenY <= closeButtonY + closeButtonSize
    ) {
      this.setSelectedEntity(null);
      return true;
    }

    // Action buttons are below the close button
    // Calculate button area (at bottom of panel)
    const buttonY = y + this.panelHeight - 40;
    const buttonHeight = 30;
    const buttonWidth = (this.panelWidth - 3 * this.padding) / 2;

    // Tame button (for wild animals)
    if (animal.wild) {
      const tameButtonX = x + this.padding;
      if (
        screenX >= tameButtonX &&
        screenX <= tameButtonX + buttonWidth &&
        screenY >= buttonY &&
        screenY <= buttonY + buttonHeight
      ) {
        // Emit event for main.ts to handle
        world.eventBus.emit({
          type: 'ui_action',
          source: 'animal_info_panel',
          data: {
            action: 'tame',
            entityId: this.selectedEntityId,
          },
        });
        return true;
      }
    }

    // Feed button (for tamed animals)
    if (!animal.wild) {
      const feedButtonX = x + this.padding;
      if (
        screenX >= feedButtonX &&
        screenX <= feedButtonX + buttonWidth &&
        screenY >= buttonY &&
        screenY <= buttonY + buttonHeight
      ) {
        world.eventBus.emit({
          type: 'ui_action',
          source: 'animal_info_panel',
          data: {
            action: 'feed',
            entityId: this.selectedEntityId,
          },
        });
        return true;
      }

      // Collect button (second button for tamed animals)
      const collectButtonX = x + this.padding * 2 + buttonWidth;
      if (
        screenX >= collectButtonX &&
        screenX <= collectButtonX + buttonWidth &&
        screenY >= buttonY &&
        screenY <= buttonY + buttonHeight
      ) {
        world.eventBus.emit({
          type: 'ui_action',
          source: 'animal_info_panel',
          data: {
            action: 'collect_product',
            entityId: this.selectedEntityId,
          },
        });
        return true;
      }
    }

    return true; // Click was inside panel, consume it
  }

  /**
   * Handle click events relative to panel origin (for WindowManager integration).
   * @param clickX X coordinate relative to panel content area
   * @param clickY Y coordinate relative to panel content area
   * @param _width Width of the content area (unused)
   * @param _height Height of the content area (unused)
   * @param world World instance
   * @returns True if click was handled
   */
  handleClickAt(clickX: number, clickY: number, _width: number, _height: number, world: any): boolean {
    if (!this.selectedEntityId || !world) {
      return false;
    }

    const selectedEntity = world.getEntity(this.selectedEntityId);
    if (!selectedEntity) {
      return false;
    }

    const animal = selectedEntity.components.get('animal') as any;
    if (!animal) {
      return false;
    }

    // Button positions (relative to panel origin at 0,0)
    const buttonY = this.panelHeight - 40;
    const buttonHeight = 30;
    const buttonWidth = (this.panelWidth - 3 * this.padding) / 2;

    // Tame button (for wild animals)
    if (animal.wild) {
      const tameButtonX = this.padding;
      if (
        clickX >= tameButtonX &&
        clickX <= tameButtonX + buttonWidth * 2 + this.padding &&
        clickY >= buttonY &&
        clickY <= buttonY + buttonHeight
      ) {
        world.eventBus.emit({
          type: 'ui_action',
          source: 'animal_info_panel',
          data: { action: 'tame', entityId: this.selectedEntityId },
        });
        return true;
      }
    } else {
      // Feed button (for tamed animals)
      const feedButtonX = this.padding;
      if (
        clickX >= feedButtonX &&
        clickX <= feedButtonX + buttonWidth &&
        clickY >= buttonY &&
        clickY <= buttonY + buttonHeight
      ) {
        world.eventBus.emit({
          type: 'ui_action',
          source: 'animal_info_panel',
          data: { action: 'feed', entityId: this.selectedEntityId },
        });
        return true;
      }

      // Collect button
      const collectButtonX = this.padding * 2 + buttonWidth;
      if (
        clickX >= collectButtonX &&
        clickX <= collectButtonX + buttonWidth &&
        clickY >= buttonY &&
        clickY <= buttonY + buttonHeight
      ) {
        world.eventBus.emit({
          type: 'ui_action',
          source: 'animal_info_panel',
          data: { action: 'collect_product', entityId: this.selectedEntityId },
        });
        return true;
      }
    }

    return false;
  }
}
