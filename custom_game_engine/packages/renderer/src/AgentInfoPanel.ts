import type { Entity } from '@ai-village/core';

/**
 * UI Panel displaying information about the selected agent.
 * Shows agent status, needs, behavior, and interactions.
 */
export class AgentInfoPanel {
  private selectedEntityId: string | null = null;
  private panelWidth = 300;
  private panelHeight = 500; // Increased from 400 to show inventory section
  private padding = 8;
  private lineHeight = 16;

  /**
   * Set the currently selected agent entity.
   * @param entity Agent entity to display, or null to clear selection
   */
  setSelectedEntity(entity: Entity | null): void {
    console.log('[AgentInfoPanel] setSelectedEntity called with:', entity ? entity.id : 'null');
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
   * Render the agent info panel.
   * @param ctx Canvas rendering context
   * @param canvasWidth Width of the canvas
   * @param canvasHeight Height of the canvas
   * @param world World instance to look up the selected entity
   */
  render(ctx: CanvasRenderingContext2D, canvasWidth: number, _canvasHeight: number, world: any): void {
    if (!this.selectedEntityId) {
      return; // Nothing to render
    }

    // Guard against undefined world (can happen during initialization or hot reload)
    if (!world || typeof world.getEntity !== 'function') {
      console.warn('[AgentInfoPanel] World not available or missing getEntity method');
      return;
    }

    // Look up the entity from the world
    const selectedEntity = world.getEntity(this.selectedEntityId);
    if (!selectedEntity) {
      console.warn('[AgentInfoPanel] Selected entity not found in world:', this.selectedEntityId);
      this.selectedEntityId = null; // Clear invalid selection
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

    // Get components
    const identity = selectedEntity.components.get('identity') as
      | { name: string }
      | undefined;
    const agent = selectedEntity.components.get('agent') as
      | {
          behavior: string;
          useLLM: boolean;
          recentSpeech?: string;
          lastThought?: string;
          speechHistory?: Array<{ text: string; tick: number }>;
          personalGoal?: string;
          mediumTermGoal?: string;
          groupGoal?: string;
          behaviorQueue?: Array<{
            behavior: string;
            priority: string;
            repeats?: number;
            currentRepeat?: number;
            label?: string;
          }>;
          currentQueueIndex?: number;
          queuePaused?: boolean;
          queueInterruptedBy?: string;
        }
      | undefined;
    const needs = selectedEntity.components.get('needs') as
      | { hunger: number; energy: number; health: number }
      | undefined;
    const position = selectedEntity.components.get('position') as
      | { x: number; y: number }
      | undefined;
    const temperature = selectedEntity.components.get('temperature') as
      | { currentTemp: number; state: string }
      | undefined;
    const movement = selectedEntity.components.get('movement') as
      | { velocityX: number; velocityY: number; speed: number }
      | undefined;

    // Render content
    let currentY = y + this.padding;

    // Agent name (if available)
    if (identity?.name) {
      ctx.fillStyle = '#FFD700'; // Gold color for name
      ctx.font = 'bold 18px monospace';
      ctx.fillText(identity.name, x + this.padding, currentY + 14);
      currentY += 26;
    } else {
      // Fallback title if no name
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 16px monospace';
      ctx.fillText('Agent Info', x + this.padding, currentY + 12);
      currentY += 30;
    }

    // Entity ID (shortened)
    ctx.font = '11px monospace';
    ctx.fillStyle = '#888';
    const shortId = selectedEntity.id.substring(0, 8);
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

      // Goals section
      if (agent.personalGoal || agent.mediumTermGoal || agent.groupGoal) {
        currentY += 5; // Extra spacing before goals

        if (agent.personalGoal) {
          ctx.fillStyle = '#FFD700'; // Gold
          ctx.fillText(`🎯 Goal:`, x + this.padding, currentY);
          currentY += this.lineHeight;
          ctx.fillStyle = '#FFEE99';
          ctx.font = '11px monospace';
          const wrappedGoal = this.wrapText(agent.personalGoal, this.panelWidth - this.padding * 2);
          for (const line of wrappedGoal) {
            ctx.fillText(line, x + this.padding + 10, currentY);
            currentY += 14;
          }
          ctx.font = '12px monospace';
        }

        if (agent.mediumTermGoal) {
          ctx.fillStyle = '#88CCFF'; // Light blue
          ctx.fillText(`📅 Plan:`, x + this.padding, currentY);
          currentY += this.lineHeight;
          ctx.fillStyle = '#AADDFF';
          ctx.font = '11px monospace';
          const wrappedPlan = this.wrapText(agent.mediumTermGoal, this.panelWidth - this.padding * 2);
          for (const line of wrappedPlan) {
            ctx.fillText(line, x + this.padding + 10, currentY);
            currentY += 14;
          }
          ctx.font = '12px monospace';
        }

        if (agent.groupGoal) {
          ctx.fillStyle = '#FF88FF'; // Pink/purple
          ctx.fillText(`👥 Team:`, x + this.padding, currentY);
          currentY += this.lineHeight;
          ctx.fillStyle = '#FFAAFF';
          ctx.font = '11px monospace';
          const wrappedTeam = this.wrapText(agent.groupGoal, this.panelWidth - this.padding * 2);
          for (const line of wrappedTeam) {
            ctx.fillText(line, x + this.padding + 10, currentY);
            currentY += 14;
          }
          ctx.font = '12px monospace';
        }

        currentY += 5; // Extra spacing after goals
      }
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

    // Recent Thought section
    if (agent?.lastThought) {
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
      ctx.beginPath();
      ctx.moveTo(x + this.padding, currentY);
      ctx.lineTo(x + this.panelWidth - this.padding, currentY);
      ctx.stroke();
      currentY += 10;

      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 14px monospace';
      ctx.fillText('💭 Thinking', x + this.padding, currentY);
      currentY += this.lineHeight + 5;

      ctx.fillStyle = '#FFCC66'; // Amber color for thoughts
      ctx.font = '11px monospace';
      currentY = this.renderWrappedText(ctx, agent.lastThought, x, currentY, 3); // Max 3 lines
    }

    // Recent Speech section
    if (agent?.recentSpeech) {
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
      ctx.beginPath();
      ctx.moveTo(x + this.padding, currentY);
      ctx.lineTo(x + this.panelWidth - this.padding, currentY);
      ctx.stroke();
      currentY += 10;

      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 14px monospace';
      ctx.fillText('💬 Said', x + this.padding, currentY);
      currentY += this.lineHeight + 5;

      ctx.fillStyle = '#AADDFF'; // Light blue for speech
      ctx.font = '11px monospace';
      currentY = this.renderWrappedText(ctx, `"${agent.recentSpeech}"`, x, currentY, 2); // Max 2 lines
    }

    // Inventory section
    const inventory = selectedEntity.components.get('inventory') as
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

    // Behavior Queue section
    if (agent?.behaviorQueue && agent.behaviorQueue.length > 0) {
      currentY = this.renderBehaviorQueue(ctx, x, currentY, agent);
    }

    // Last Thought section - Disabled to make room for inventory
    // if (agent?.lastThought) {
    //   ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    //   ctx.beginPath();
    //   ctx.moveTo(x + this.padding, currentY);
    //   ctx.lineTo(x + this.panelWidth - this.padding, currentY);
    //   ctx.stroke();
    //   currentY += 10;

    //   ctx.fillStyle = '#FFFFFF';
    //   ctx.font = 'bold 14px monospace';
    //   ctx.fillText('Last Thought', x + this.padding, currentY);
    //   currentY += this.lineHeight + 5;

    //   ctx.fillStyle = '#FFCC66'; // Amber color for thoughts
    //   ctx.font = '11px monospace';
    //   currentY = this.renderWrappedText(ctx, agent.lastThought, x, currentY, 3); // Max 3 lines
    // }

    // Speech History section - Disabled to make room for inventory
    // if (agent?.speechHistory && agent.speechHistory.length > 0) {
    //   ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    //   ctx.beginPath();
    //   ctx.moveTo(x + this.padding, currentY);
    //   ctx.lineTo(x + this.panelWidth - this.padding, currentY);
    //   ctx.stroke();
    //   currentY += 10;

    //   ctx.fillStyle = '#FFFFFF';
    //   ctx.font = 'bold 14px monospace';
    //   ctx.fillText('Speech History', x + this.padding, currentY);
    //   currentY += this.lineHeight + 5;

    //   // Show last 5 speech entries (most recent first)
    //   const recentSpeech = agent.speechHistory.slice(-5).reverse();
    //   ctx.font = '11px monospace';

    //   for (const entry of recentSpeech) {
    //     ctx.fillStyle = '#AAAAFF';
    //     currentY = this.renderWrappedText(ctx, `"${entry.text}"`, x, currentY, 2); // Max 2 lines per entry
    //   }
    // }
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
   * Get color for need bar based on value and type.
   * Energy uses blue (high) → red (low) per work order spec.
   * Other needs use traditional traffic light colors.
   */
  private getNeedBarColor(needType: string, value: number): string {
    // Energy uses blue (high) → red (low) gradient per sleep work order
    if (needType === 'Energy') {
      // Blue when high (70-100)
      if (value >= 70) {
        return '#00AAFF'; // Bright blue
      }
      // Cyan transitioning (50-70)
      if (value >= 50) {
        return '#00DDFF';
      }
      // Purple transition (30-50)
      if (value >= 30) {
        return '#AA66FF';
      }
      // Orange/Red when low (0-30)
      if (value >= 15) {
        return '#FF8800'; // Orange
      }
      // Red when critical (0-15)
      return '#FF0000';
    }

    // Traditional traffic light colors for hunger, health, etc.
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
          ctx.fillText(`${icon} ${label}: ${Math.round(count)}`, panelX + this.padding, y);
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
    const capacityText = `Weight: ${Math.round(inventory.currentWeight)}/${inventory.maxWeight}  Slots: ${usedSlots}/${inventory.maxSlots}`;
    ctx.fillText(capacityText, panelX + this.padding, y);
    y += this.lineHeight + 5;

    return y;
  }

  /**
   * Render the behavior queue section.
   * @param ctx Canvas rendering context
   * @param panelX Panel X position
   * @param y Current Y position
   * @param agent Agent component with queue data
   * @returns Updated Y position
   */
  private renderBehaviorQueue(
    ctx: CanvasRenderingContext2D,
    panelX: number,
    y: number,
    agent: {
      behaviorQueue?: Array<{
        behavior: string;
        priority: string;
        repeats?: number;
        currentRepeat?: number;
        label?: string;
      }>;
      currentQueueIndex?: number;
      queuePaused?: boolean;
      queueInterruptedBy?: string;
    }
  ): number {
    if (!agent.behaviorQueue || agent.behaviorQueue.length === 0) {
      return y;
    }

    // Section separator
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.beginPath();
    ctx.moveTo(panelX + this.padding, y);
    ctx.lineTo(panelX + this.panelWidth - this.padding, y);
    ctx.stroke();
    y += 10;

    // Section title
    ctx.font = 'bold 12px monospace';
    ctx.fillStyle = '#FFD700';

    const queueStatus = agent.queuePaused
      ? '⏸️ PAUSED'
      : agent.queueInterruptedBy
      ? `⚠️ INTERRUPTED (${agent.queueInterruptedBy})`
      : '▶️ ACTIVE';

    ctx.fillText(`Behavior Queue (${agent.behaviorQueue.length}) ${queueStatus}`, panelX + this.padding, y);
    y += this.lineHeight + 5;

    // Display queue items (limit to 5 items to save space)
    const maxItems = Math.min(5, agent.behaviorQueue.length);
    const currentIndex = agent.currentQueueIndex ?? 0;

    ctx.font = '11px monospace';
    for (let i = 0; i < maxItems; i++) {
      const queuedBehavior = agent.behaviorQueue[i];
      if (!queuedBehavior) continue;

      // Highlight current behavior
      const isCurrent = i === currentIndex;
      const isCompleted = i < currentIndex;

      if (isCurrent) {
        // Draw background for current item
        ctx.fillStyle = 'rgba(255, 215, 0, 0.15)';
        ctx.fillRect(panelX + this.padding, y - 11, this.panelWidth - this.padding * 2, 14);
      }

      // Color code by status
      ctx.fillStyle = isCompleted
        ? '#888888' // Gray for completed
        : isCurrent
        ? '#00FF00' // Green for current
        : '#FFFFFF'; // White for pending

      // Format behavior name
      const behaviorName = queuedBehavior.label || queuedBehavior.behavior.replace('_', ' ');
      const priorityIndicator = queuedBehavior.priority === 'critical'
        ? '🔴'
        : queuedBehavior.priority === 'high'
        ? '🟡'
        : '';

      const repeatInfo = queuedBehavior.repeats !== undefined && queuedBehavior.repeats > 1
        ? ` (${(queuedBehavior.currentRepeat ?? 0) + 1}/${queuedBehavior.repeats})`
        : '';

      const statusIcon = isCompleted ? '✓' : isCurrent ? '▶' : '·';
      const displayText = `${statusIcon} ${priorityIndicator}${behaviorName}${repeatInfo}`;

      ctx.fillText(displayText, panelX + this.padding + 5, y);
      y += 14;
    }

    // Show "... and N more" if queue is longer
    if (agent.behaviorQueue.length > maxItems) {
      ctx.fillStyle = '#888888';
      ctx.fillText(`... and ${agent.behaviorQueue.length - maxItems} more`, panelX + this.padding + 5, y);
      y += 14;
    }

    y += 5; // Extra spacing after section
    return y;
  }

  /**
   * Render text with word wrapping, limiting to a maximum number of lines.
   * @param ctx Canvas rendering context
   * @param text Text to render
   * @param panelX Panel X position
   * @param y Current Y position
   * @param maxLines Maximum number of lines to render
   * @returns Updated Y position
   */
  private renderWrappedText(
    ctx: CanvasRenderingContext2D,
    text: string,
    panelX: number,
    y: number,
    maxLines: number
  ): number {
    const maxWidth = this.panelWidth - this.padding * 2;
    const words = text.split(' ');
    let line = '';
    let linesRendered = 0;

    for (const word of words) {
      const testLine = line + word + ' ';
      const metrics = ctx.measureText(testLine);

      if (metrics.width > maxWidth && line.length > 0) {
        // Check if we've hit the line limit
        if (linesRendered >= maxLines - 1) {
          // Truncate with ellipsis on last allowed line
          let truncatedLine = line.trim();
          while (ctx.measureText(truncatedLine + '...').width > maxWidth && truncatedLine.length > 0) {
            truncatedLine = truncatedLine.slice(0, -1);
          }
          ctx.fillText(truncatedLine + '...', panelX + this.padding, y);
          y += this.lineHeight;
          return y;
        }

        ctx.fillText(line.trim(), panelX + this.padding, y);
        y += this.lineHeight;
        linesRendered++;
        line = word + ' ';
      } else {
        line = testLine;
      }
    }

    // Render remaining text
    if (line.length > 0 && linesRendered < maxLines) {
      ctx.fillText(line.trim(), panelX + this.padding, y);
      y += this.lineHeight;
    }

    return y;
  }

  /**
   * Wrap text to fit within maxWidth, returning array of lines
   */
  private wrapText(text: string, maxWidth: number): string[] {
    const words = text.split(' ');
    const lines: string[] = [];
    let currentLine = '';

    for (const word of words) {
      const testLine = currentLine ? `${currentLine} ${word}` : word;

      // Simple character-based approximation (each char ~7px in 11px monospace)
      if (testLine.length * 7 > maxWidth && currentLine) {
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
