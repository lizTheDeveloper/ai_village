import type { Entity } from '@ai-village/core';

/**
 * UI Panel displaying information about the selected agent.
 * Shows agent status, needs, behavior, and interactions.
 */
export class AgentInfoPanel {
  private selectedEntity: Entity | null = null;
  private panelWidth = 300;
  private panelHeight = 400;
  private padding = 10;
  private lineHeight = 18;

  /**
   * Set the currently selected agent entity.
   * @param entity Agent entity to display, or null to clear selection
   */
  setSelectedEntity(entity: Entity | null): void {
    console.log('[AgentInfoPanel] setSelectedEntity called with:', entity ? `Entity ${entity.id}` : 'null');
    this.selectedEntity = entity;
  }

  /**
   * Get the currently selected entity.
   */
  getSelectedEntity(): Entity | null {
    return this.selectedEntity;
  }

  /**
   * Render the agent info panel.
   * @param ctx Canvas rendering context
   * @param canvasWidth Width of the canvas
   * @param canvasHeight Height of the canvas
   */
  render(ctx: CanvasRenderingContext2D, canvasWidth: number, _canvasHeight: number): void {
    console.log('[AgentInfoPanel] render called, selectedEntity:', this.selectedEntity ? `Entity ${this.selectedEntity.id.substring(0, 8)}...` : 'null');
    if (!this.selectedEntity) {
      return; // Nothing to render
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

    // Get components
    const agent = this.selectedEntity.components.get('agent') as
      | { behavior: string; useLLM: boolean; recentSpeech?: string }
      | undefined;
    const needs = this.selectedEntity.components.get('needs') as
      | { hunger: number; energy: number; health: number }
      | undefined;
    const position = this.selectedEntity.components.get('position') as
      | { x: number; y: number }
      | undefined;
    const temperature = this.selectedEntity.components.get('temperature') as
      | { currentTemp: number; state: string }
      | undefined;
    const movement = this.selectedEntity.components.get('movement') as
      | { velocityX: number; velocityY: number; speed: number }
      | undefined;

    // Render content
    let currentY = y + this.padding;

    // Title
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 16px monospace';
    ctx.fillText('Agent Info', x + this.padding, currentY + 12);
    currentY += 30;

    // Entity ID (shortened)
    ctx.font = '11px monospace';
    ctx.fillStyle = '#888';
    const shortId = this.selectedEntity.id.substring(0, 8);
    ctx.fillText(`ID: ${shortId}...`, x + this.padding, currentY);
    currentY += this.lineHeight + 5;

    // Position
    if (position) {
      ctx.fillStyle = '#FFFFFF';
      ctx.font = '12px monospace';
      ctx.fillText(`Position: (${position.x.toFixed(1)}, ${position.y.toFixed(1)})`, x + this.padding, currentY);
      currentY += this.lineHeight;
    }

    // Behavior
    if (agent) {
      const behaviorLabel = agent.behavior.replace('_', ' ').toUpperCase();
      ctx.fillStyle = '#FFAA00';
      ctx.fillText(`Behavior: ${behaviorLabel}`, x + this.padding, currentY);
      currentY += this.lineHeight;

      const llmStatus = agent.useLLM ? 'Yes' : 'No';
      ctx.fillStyle = '#888';
      ctx.font = '11px monospace';
      ctx.fillText(`Uses LLM: ${llmStatus}`, x + this.padding, currentY);
      currentY += this.lineHeight + 5;
      ctx.font = '12px monospace';
    }

    // Movement status
    if (movement) {
      const isMoving = movement.velocityX !== 0 || movement.velocityY !== 0;
      const movementStatus = isMoving ? 'Moving' : 'Stationary';
      const statusColor = isMoving ? '#00FF00' : '#888';
      ctx.fillStyle = statusColor;
      ctx.fillText(`Status: ${movementStatus}`, x + this.padding, currentY);
      if (isMoving) {
        ctx.fillStyle = '#888';
        ctx.font = '11px monospace';
        currentY += this.lineHeight;
        ctx.fillText(`Speed: ${movement.speed.toFixed(2)} tiles/s`, x + this.padding, currentY);
        ctx.font = '12px monospace';
      }
      currentY += this.lineHeight + 5;
    }

    // Divider
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.beginPath();
    ctx.moveTo(x + this.padding, currentY);
    ctx.lineTo(x + this.panelWidth - this.padding, currentY);
    ctx.stroke();
    currentY += 10;

    // Needs section
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 14px monospace';
    ctx.fillText('Needs', x + this.padding, currentY);
    currentY += this.lineHeight + 5;
    ctx.font = '12px monospace';

    if (needs) {
      // Hunger
      currentY = this.renderNeedBar(ctx, x, currentY, 'Hunger', needs.hunger);
      // Energy
      currentY = this.renderNeedBar(ctx, x, currentY, 'Energy', needs.energy);
      // Health
      currentY = this.renderNeedBar(ctx, x, currentY, 'Health', needs.health);
    } else {
      ctx.fillStyle = '#888';
      ctx.fillText('No needs data', x + this.padding, currentY);
      currentY += this.lineHeight;
    }

    currentY += 5;

    // Temperature section
    if (temperature) {
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
      ctx.beginPath();
      ctx.moveTo(x + this.padding, currentY);
      ctx.lineTo(x + this.panelWidth - this.padding, currentY);
      ctx.stroke();
      currentY += 10;

      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 14px monospace';
      ctx.fillText('Temperature', x + this.padding, currentY);
      currentY += this.lineHeight + 5;

      // Temperature value
      ctx.font = '12px monospace';
      ctx.fillStyle = '#FFFFFF';
      ctx.fillText(`Current: ${temperature.currentTemp.toFixed(1)}°C`, x + this.padding, currentY);
      currentY += this.lineHeight;

      // Temperature state
      const stateColor = this.getTemperatureStateColor(temperature.state);
      ctx.fillStyle = stateColor;
      const stateLabel = temperature.state.replace('_', ' ').toUpperCase();
      ctx.fillText(`State: ${stateLabel}`, x + this.padding, currentY);
      currentY += this.lineHeight + 5;
    }

    // Inventory section
    const inventory = this.selectedEntity.components.get('inventory') as
      | {
          slots: Array<{ itemId: string | null; quantity: number }>;
          maxSlots: number;
          maxWeight: number;
          currentWeight: number;
        }
      | undefined;

    if (inventory) {
      currentY = this.renderInventory(ctx, x, currentY, inventory);
    }

    // Recent speech
    if (agent?.recentSpeech) {
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
      ctx.beginPath();
      ctx.moveTo(x + this.padding, currentY);
      ctx.lineTo(x + this.panelWidth - this.padding, currentY);
      ctx.stroke();
      currentY += 10;

      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 14px monospace';
      ctx.fillText('Recent Speech', x + this.padding, currentY);
      currentY += this.lineHeight + 5;

      ctx.fillStyle = '#AAAAFF';
      ctx.font = '11px monospace';
      const words = agent.recentSpeech.split(' ');
      let line = '';
      const maxWidth = this.panelWidth - this.padding * 2;

      for (const word of words) {
        const testLine = line + word + ' ';
        const metrics = ctx.measureText(testLine);
        if (metrics.width > maxWidth && line.length > 0) {
          ctx.fillText(line, x + this.padding, currentY);
          currentY += this.lineHeight;
          line = word + ' ';
        } else {
          line = testLine;
        }
      }
      if (line.length > 0) {
        ctx.fillText(line, x + this.padding, currentY);
        currentY += this.lineHeight;
      }
    }
  }

  /**
   * Render a need bar (hunger, energy, health).
   * @param ctx Canvas rendering context
   * @param panelX Panel X position
   * @param y Current Y position
   * @param label Need label
   * @param value Need value (0-100)
   * @returns Updated Y position
   */
  private renderNeedBar(
    ctx: CanvasRenderingContext2D,
    panelX: number,
    y: number,
    label: string,
    value: number
  ): number {
    const barWidth = this.panelWidth - this.padding * 2 - 60;
    const barHeight = 12;
    const barX = panelX + this.padding + 60;
    const barY = y - 9;

    // Label
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '12px monospace';
    ctx.fillText(label, panelX + this.padding, y);

    // Background
    ctx.fillStyle = 'rgba(50, 50, 50, 0.8)';
    ctx.fillRect(barX, barY, barWidth, barHeight);

    // Fill
    const fillWidth = (barWidth * value) / 100;
    const color = this.getNeedBarColor(label, value);
    ctx.fillStyle = color;
    ctx.fillRect(barX, barY, fillWidth, barHeight);

    // Border
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.lineWidth = 1;
    ctx.strokeRect(barX, barY, barWidth, barHeight);

    // Value text
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '10px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(`${value.toFixed(0)}`, barX + barWidth / 2, barY + barHeight - 2);
    ctx.textAlign = 'left';

    return y + this.lineHeight;
  }

  /**
   * Get color for need bar based on value.
   */
  private getNeedBarColor(_needType: string, value: number): string {
    // Critical (0-20): Red
    if (value < 20) {
      return '#FF0000';
    }
    // Low (20-40): Orange
    if (value < 40) {
      return '#FF8800';
    }
    // Medium (40-70): Yellow
    if (value < 70) {
      return '#FFFF00';
    }
    // Good (70-100): Green
    return '#00FF00';
  }

  /**
   * Get color for temperature state.
   */
  private getTemperatureStateColor(state: string): string {
    switch (state) {
      case 'dangerously_cold':
        return '#0088FF';
      case 'cold':
        return '#00DDFF';
      case 'comfortable':
        return '#00FF00';
      case 'hot':
        return '#FFAA00';
      case 'dangerously_hot':
        return '#FF0000';
      default:
        return '#FFFFFF';
    }
  }

  /**
   * Count resources by type from inventory slots.
   * @param inventory The inventory component
   * @returns Record of resource type to quantity
   */
  private countResourcesByType(inventory: {
    slots: Array<{ itemId: string | null; quantity: number }>;
  }): Record<string, number> {
    if (!Array.isArray(inventory.slots)) {
      throw new Error("InventoryComponent 'slots' must be an array");
    }

    const counts: Record<string, number> = {
      wood: 0,
      stone: 0,
      food: 0,
      water: 0,
    };

    for (const slot of inventory.slots) {
      if (slot.itemId && slot.quantity > 0) {
        const currentCount = counts[slot.itemId];
        if (currentCount !== undefined) {
          counts[slot.itemId] = currentCount + slot.quantity;
        }
      }
    }

    return counts;
  }

  /**
   * Get the resource icon emoji for a resource type.
   */
  private getResourceIcon(resourceType: string): string {
    switch (resourceType) {
      case 'wood':
        return '🪵';
      case 'stone':
        return '🪨';
      case 'food':
        return '🍎';
      case 'water':
        return '💧';
      default:
        return '?';
    }
  }

  /**
   * Render the inventory section.
   * @param ctx Canvas rendering context
   * @param panelX Panel X position
   * @param y Current Y position
   * @param inventory The inventory component
   * @returns Updated Y position
   */
  private renderInventory(
    ctx: CanvasRenderingContext2D,
    panelX: number,
    y: number,
    inventory: {
      slots: Array<{ itemId: string | null; quantity: number }>;
      maxSlots: number;
      maxWeight: number;
      currentWeight: number;
    }
  ): number {
    // Validate required fields
    if (inventory.maxWeight === undefined) {
      throw new Error("InventoryComponent missing required 'maxWeight' field");
    }
    if (inventory.maxSlots === undefined) {
      throw new Error("InventoryComponent missing required 'maxSlots' field");
    }
    if (inventory.currentWeight === undefined) {
      throw new Error("InventoryComponent missing required 'currentWeight' field");
    }

    // Divider
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.beginPath();
    ctx.moveTo(panelX + this.padding, y);
    ctx.lineTo(panelX + this.panelWidth - this.padding, y);
    ctx.stroke();
    y += 10;

    // Section header
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 14px monospace';
    ctx.fillText('INVENTORY', panelX + this.padding, y);
    y += this.lineHeight + 5;

    // Count resources
    const resourceCounts = this.countResourcesByType(inventory);
    const hasAnyResources = Object.values(resourceCounts).some((count) => count > 0);

    ctx.font = '12px monospace';

    if (!hasAnyResources) {
      // Empty state
      ctx.fillStyle = '#888';
      ctx.fillText('(empty)', panelX + this.padding, y);
      y += this.lineHeight;
    } else {
      // Display each resource type
      const resourceTypes = ['wood', 'stone', 'food', 'water'] as const;

      for (const resourceType of resourceTypes) {
        const count = resourceCounts[resourceType];
        if (count !== undefined && count > 0) {
          const icon = this.getResourceIcon(resourceType);
          const label = resourceType.charAt(0).toUpperCase() + resourceType.slice(1);
          ctx.fillStyle = '#FFFFFF';
          ctx.fillText(`${icon} ${label}: ${count}`, panelX + this.padding, y);
          y += this.lineHeight;
        }
      }
    }

    // Calculate used slots
    const usedSlots = inventory.slots.filter(
      (s) => s.itemId !== null && s.quantity > 0
    ).length;

    // Calculate capacity percentages
    const weightPercent = (inventory.currentWeight / inventory.maxWeight) * 100;
    const slotsPercent = (usedSlots / inventory.maxSlots) * 100;

    // Determine capacity color based on fullness
    let capacityColor = '#FFFFFF'; // Normal (0-80%)
    if (weightPercent >= 100 || slotsPercent >= 100) {
      capacityColor = '#FF0000'; // Full (100%)
    } else if (weightPercent >= 80 || slotsPercent >= 80) {
      capacityColor = '#FFFF00'; // Warning (80-99%)
    }

    // Display capacity
    ctx.font = '11px monospace';
    ctx.fillStyle = capacityColor;
    const capacityText = `Weight: ${inventory.currentWeight}/${inventory.maxWeight}  Slots: ${usedSlots}/${inventory.maxSlots}`;
    ctx.fillText(capacityText, panelX + this.padding, y);
    y += this.lineHeight + 5;

    return y;
  }
}
