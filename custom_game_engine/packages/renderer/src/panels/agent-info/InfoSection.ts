/**
 * InfoSection - Renders the main Info tab content.
 * Shows agent status, needs, behavior queue, and inventory summary.
 */

import type {
  SectionRenderContext,
  IdentityComponent,
  AgentComponentData,
  NeedsComponentData,
  PositionComponentData,
  TemperatureComponentData,
  MovementComponentData,
  InventoryComponentData,
  GoalsComponent,
} from './types.js';
import {
  wrapText,
  renderWrappedText,
  renderSeparator,
  countResourcesByType,
  getTemperatureStateColor,
  getNeedBarColor,
} from './renderUtils.js';
import { InventorySection } from './InventorySection.js';

export class InfoSection {
  private panelWidth = 360;

  render(
    context: SectionRenderContext,
    entity: any,
    identity: IdentityComponent | undefined,
    agent: AgentComponentData | undefined,
    needs: NeedsComponentData | undefined,
    position: PositionComponentData | undefined,
    temperature: TemperatureComponentData | undefined,
    movement: MovementComponentData | undefined,
    inventory: InventoryComponentData | undefined,
    goals?: GoalsComponent
  ): void {
    const { ctx, x, y, padding, lineHeight } = context;

    let currentY = y + padding;

    // Agent name (if available)
    if (identity?.name) {
      ctx.fillStyle = '#FFD700';
      ctx.font = 'bold 18px monospace';
      ctx.fillText(identity.name, x + padding, currentY + 14);
      currentY += 26;
    } else {
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 16px monospace';
      ctx.fillText('Agent Info', x + padding, currentY + 12);
      currentY += 30;
    }

    // Entity ID (shortened)
    ctx.font = '11px monospace';
    ctx.fillStyle = '#888';
    const shortId = entity.id.substring(0, 8);
    ctx.fillText(`ID: ${shortId}...`, x + padding, currentY);
    currentY += lineHeight + 5;

    // Position
    if (position) {
      ctx.fillStyle = '#FFFFFF';
      ctx.font = '12px monospace';
      ctx.fillText(`Position: (${position.x.toFixed(1)}, ${position.y.toFixed(1)})`, x + padding, currentY);
      currentY += lineHeight;
    }

    // Behavior
    if (agent) {
      const behaviorLabel = agent.behavior.replace('_', ' ').toUpperCase();
      ctx.fillStyle = '#FFAA00';
      ctx.fillText(`Behavior: ${behaviorLabel}`, x + padding, currentY);
      currentY += lineHeight;

      const llmStatus = agent.useLLM ? 'Yes' : 'No';
      ctx.fillStyle = '#888';
      ctx.font = '11px monospace';
      ctx.fillText(`Uses LLM: ${llmStatus}`, x + padding, currentY);
      currentY += lineHeight + 5;
      ctx.font = '12px monospace';

      // Goals section
      if (agent.personalGoal || agent.mediumTermGoal || agent.groupGoal) {
        currentY += 5;

        if (agent.personalGoal) {
          ctx.fillStyle = '#FFD700';
          ctx.fillText(`🎯 Goal:`, x + padding, currentY);
          currentY += lineHeight;
          ctx.fillStyle = '#FFEE99';
          ctx.font = '11px monospace';
          const wrappedGoal = wrapText(agent.personalGoal, this.panelWidth - padding * 2);
          for (const line of wrappedGoal) {
            ctx.fillText(line, x + padding + 10, currentY);
            currentY += 14;
          }
          ctx.font = '12px monospace';
        }

        if (agent.mediumTermGoal) {
          ctx.fillStyle = '#88CCFF';
          ctx.fillText(`📅 Plan:`, x + padding, currentY);
          currentY += lineHeight;
          ctx.fillStyle = '#AADDFF';
          ctx.font = '11px monospace';
          const wrappedPlan = wrapText(agent.mediumTermGoal, this.panelWidth - padding * 2);
          for (const line of wrappedPlan) {
            ctx.fillText(line, x + padding + 10, currentY);
            currentY += 14;
          }
          ctx.font = '12px monospace';
        }

        if (agent.groupGoal) {
          ctx.fillStyle = '#FF88FF';
          ctx.fillText(`👥 Team:`, x + padding, currentY);
          currentY += lineHeight;
          ctx.fillStyle = '#FFAAFF';
          ctx.font = '11px monospace';
          const wrappedTeam = wrapText(agent.groupGoal, this.panelWidth - padding * 2);
          for (const line of wrappedTeam) {
            ctx.fillText(line, x + padding + 10, currentY);
            currentY += 14;
          }
          ctx.font = '12px monospace';
        }

        currentY += 5;
      }

      // New personal goals system
      if (goals && goals.goals.length > 0) {
        const activeGoals = goals.goals.filter(g => !g.completed);

        if (activeGoals.length > 0) {
          ctx.fillStyle = '#FFD700';
          ctx.fillText(`📋 Personal Goals:`, x + padding, currentY);
          currentY += lineHeight;

          for (const goal of activeGoals.slice(0, 3)) {
            // Goal description
            ctx.fillStyle = '#FFEE99';
            ctx.font = '11px monospace';
            const wrappedDesc = wrapText(goal.description, this.panelWidth - padding * 2 - 10);
            for (const line of wrappedDesc) {
              ctx.fillText(line, x + padding + 10, currentY);
              currentY += 14;
            }

            // Progress bar
            ctx.fillStyle = '#888';
            const barWidth = 100;
            const barHeight = 6;
            const barX = x + padding + 10;
            const barY = currentY - 2;
            ctx.fillRect(barX, barY, barWidth, barHeight);

            // Progress fill
            const progressWidth = (goal.progress / 100) * barWidth;
            ctx.fillStyle = '#FFD700';
            ctx.fillRect(barX, barY, progressWidth, barHeight);

            // Progress text
            ctx.fillStyle = '#FFEE99';
            ctx.fillText(`${goal.progress}%`, barX + barWidth + 5, currentY);
            currentY += 12;

            ctx.font = '12px monospace';
          }

          if (activeGoals.length > 3) {
            ctx.fillStyle = '#888';
            ctx.font = '11px monospace';
            ctx.fillText(`...and ${activeGoals.length - 3} more`, x + padding + 10, currentY);
            currentY += 14;
            ctx.font = '12px monospace';
          }

          currentY += 5;
        }
      }
    }

    // Movement status
    if (movement) {
      const isMoving = movement.velocityX !== 0 || movement.velocityY !== 0;
      const movementStatus = isMoving ? 'Moving' : 'Stationary';
      const statusColor = isMoving ? '#00FF00' : '#888';
      ctx.fillStyle = statusColor;
      ctx.fillText(`Status: ${movementStatus}`, x + padding, currentY);
      if (isMoving) {
        ctx.fillStyle = '#888';
        ctx.font = '11px monospace';
        currentY += lineHeight;
        ctx.fillText(`Speed: ${movement.speed.toFixed(2)} tiles/s`, x + padding, currentY);
        ctx.font = '12px monospace';
      }
      currentY += lineHeight + 5;
    }

    // Divider
    renderSeparator(ctx, x, currentY, this.panelWidth, padding);
    currentY += 10;

    // Needs section
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 14px monospace';
    ctx.fillText('Needs', x + padding, currentY);
    currentY += lineHeight + 5;
    ctx.font = '12px monospace';

    if (needs) {
      currentY = this.renderNeedBar(ctx, x, currentY, 'Hunger', needs.hunger, padding, lineHeight);
      currentY = this.renderNeedBar(ctx, x, currentY, 'Energy', needs.energy, padding, lineHeight);
      currentY = this.renderNeedBar(ctx, x, currentY, 'Health', needs.health, padding, lineHeight);
    } else {
      ctx.fillStyle = '#888';
      ctx.fillText('No needs data', x + padding, currentY);
      currentY += lineHeight;
    }

    currentY += 5;

    // Temperature section
    if (temperature) {
      renderSeparator(ctx, x, currentY, this.panelWidth, padding);
      currentY += 10;

      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 14px monospace';
      ctx.fillText('Temperature', x + padding, currentY);
      currentY += lineHeight + 5;

      ctx.font = '12px monospace';
      ctx.fillStyle = '#FFFFFF';
      ctx.fillText(`Current: ${temperature.currentTemp.toFixed(1)}°C`, x + padding, currentY);
      currentY += lineHeight;

      const stateColor = getTemperatureStateColor(temperature.state);
      ctx.fillStyle = stateColor;
      const stateLabel = temperature.state.replace('_', ' ').toUpperCase();
      ctx.fillText(`State: ${stateLabel}`, x + padding, currentY);
      currentY += lineHeight + 5;
    }

    // Recent Thought section
    if (agent?.lastThought) {
      renderSeparator(ctx, x, currentY, this.panelWidth, padding);
      currentY += 10;

      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 14px monospace';
      ctx.fillText('💭 Thinking', x + padding, currentY);
      currentY += lineHeight + 5;

      ctx.fillStyle = '#FFCC66';
      ctx.font = '11px monospace';
      currentY = renderWrappedText(ctx, agent.lastThought, x, currentY, padding, lineHeight, this.panelWidth - padding * 2, 3);
    }

    // Recent Speech section
    if (agent?.recentSpeech) {
      renderSeparator(ctx, x, currentY, this.panelWidth, padding);
      currentY += 10;

      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 14px monospace';
      ctx.fillText('💬 Said', x + padding, currentY);
      currentY += lineHeight + 5;

      ctx.fillStyle = '#AADDFF';
      ctx.font = '11px monospace';
      currentY = renderWrappedText(ctx, `"${agent.recentSpeech}"`, x, currentY, padding, lineHeight, this.panelWidth - padding * 2, 2);
    }

    // Inventory section
    if (inventory) {
      currentY = this.renderInventorySummary(ctx, x, currentY, inventory, padding, lineHeight);
    }

    // Behavior Queue section
    if (agent?.behaviorQueue && agent.behaviorQueue.length > 0) {
      currentY = this.renderBehaviorQueue(ctx, x, currentY, agent, padding, lineHeight);
    }
  }

  private renderNeedBar(
    ctx: CanvasRenderingContext2D,
    panelX: number,
    y: number,
    label: string,
    value: number,
    padding: number,
    lineHeight: number
  ): number {
    const barWidth = this.panelWidth - padding * 2 - 60;
    const barHeight = 12;
    const barX = panelX + padding + 60;
    const barY = y - 9;

    ctx.fillStyle = '#FFFFFF';
    ctx.font = '12px monospace';
    ctx.fillText(label, panelX + padding, y);

    ctx.fillStyle = 'rgba(50, 50, 50, 0.8)';
    ctx.fillRect(barX, barY, barWidth, barHeight);

    const fillWidth = (barWidth * value) / 100;
    const color = getNeedBarColor(label, value);
    ctx.fillStyle = color;
    ctx.fillRect(barX, barY, fillWidth, barHeight);

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.lineWidth = 1;
    ctx.strokeRect(barX, barY, barWidth, barHeight);

    ctx.fillStyle = '#FFFFFF';
    ctx.font = '10px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(`${value.toFixed(0)}`, barX + barWidth / 2, barY + barHeight - 2);
    ctx.textAlign = 'left';

    return y + lineHeight;
  }

  private renderInventorySummary(
    ctx: CanvasRenderingContext2D,
    panelX: number,
    y: number,
    inventory: InventoryComponentData,
    padding: number,
    lineHeight: number
  ): number {
    if (inventory.maxWeight === undefined) {
      throw new Error("InventoryComponent missing required 'maxWeight' field");
    }
    if (inventory.maxSlots === undefined) {
      throw new Error("InventoryComponent missing required 'maxSlots' field");
    }
    if (inventory.currentWeight === undefined) {
      throw new Error("InventoryComponent missing required 'currentWeight' field");
    }

    renderSeparator(ctx, panelX, y, this.panelWidth, padding);
    y += 10;

    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 14px monospace';
    ctx.fillText('INVENTORY', panelX + padding, y);
    y += lineHeight + 5;

    const resourceCounts = countResourcesByType(inventory.slots);
    const hasAnyResources = Object.values(resourceCounts).some((count) => count > 0);

    ctx.font = '12px monospace';

    if (!hasAnyResources) {
      ctx.fillStyle = '#888';
      ctx.fillText('(empty)', panelX + padding, y);
      y += lineHeight;
    } else {
      const categories = InventorySection.categorizeItems(resourceCounts);
      const categoryIcons: Record<string, string> = {
        Food: '🍎',
        Materials: '🪨',
        Seeds: '🌱',
        Other: '📦',
      };
      const categoryColors: Record<string, string> = {
        Food: '#AAFFAA',
        Materials: '#FFCC88',
        Seeds: '#88DDFF',
        Other: '#CCCCCC',
      };

      for (const [category, data] of Object.entries(categories)) {
        if (data.total > 0) {
          const icon = categoryIcons[category] || '📦';
          ctx.fillStyle = categoryColors[category] || '#FFFFFF';
          ctx.fillText(`${icon} ${category}: ${data.total} (${data.items.length} types)`, panelX + padding, y);
          y += lineHeight;
        }
      }

      const totalItems = Object.values(resourceCounts).reduce((sum, count) => sum + count, 0);
      const uniqueTypes = Object.keys(resourceCounts).length;
      ctx.fillStyle = '#888888';
      ctx.font = '10px monospace';
      ctx.fillText(`Total: ${totalItems} items, ${uniqueTypes} types`, panelX + padding, y);
      y += lineHeight;
      ctx.font = '12px monospace';
    }

    const usedSlots = inventory.slots.filter((s) => s.itemId !== null && s.quantity > 0).length;
    const weightPercent = (inventory.currentWeight / inventory.maxWeight) * 100;
    const slotsPercent = (usedSlots / inventory.maxSlots) * 100;

    let capacityColor = '#FFFFFF';
    if (weightPercent >= 100 || slotsPercent >= 100) {
      capacityColor = '#FF0000';
    } else if (weightPercent >= 80 || slotsPercent >= 80) {
      capacityColor = '#FFFF00';
    }

    ctx.font = '11px monospace';
    ctx.fillStyle = capacityColor;
    const capacityText = `Weight: ${Math.round(inventory.currentWeight)}/${inventory.maxWeight}  Slots: ${usedSlots}/${inventory.maxSlots}`;
    ctx.fillText(capacityText, panelX + padding, y);
    y += lineHeight + 5;

    return y;
  }

  private renderBehaviorQueue(
    ctx: CanvasRenderingContext2D,
    panelX: number,
    y: number,
    agent: AgentComponentData,
    padding: number,
    lineHeight: number
  ): number {
    if (!agent.behaviorQueue || agent.behaviorQueue.length === 0) {
      return y;
    }

    renderSeparator(ctx, panelX, y, this.panelWidth, padding);
    y += 10;

    ctx.font = 'bold 12px monospace';
    ctx.fillStyle = '#FFD700';

    const queueStatus = agent.queuePaused
      ? '⏸️ PAUSED'
      : agent.queueInterruptedBy
        ? `⚠️ INTERRUPTED (${agent.queueInterruptedBy})`
        : '▶️ ACTIVE';

    ctx.fillText(`Behavior Queue (${agent.behaviorQueue.length}) ${queueStatus}`, panelX + padding, y);
    y += lineHeight + 5;

    const maxItems = Math.min(5, agent.behaviorQueue.length);
    const currentIndex = agent.currentQueueIndex ?? 0;

    ctx.font = '11px monospace';
    for (let i = 0; i < maxItems; i++) {
      const queuedBehavior = agent.behaviorQueue[i];
      if (!queuedBehavior) continue;

      const isCurrent = i === currentIndex;
      const isCompleted = i < currentIndex;

      if (isCurrent) {
        ctx.fillStyle = 'rgba(255, 215, 0, 0.15)';
        ctx.fillRect(panelX + padding, y - 11, this.panelWidth - padding * 2, 14);
      }

      ctx.fillStyle = isCompleted
        ? '#888888'
        : isCurrent
          ? '#00FF00'
          : '#FFFFFF';

      const behaviorName = queuedBehavior.label || queuedBehavior.behavior.replace('_', ' ');
      const priorityIndicator =
        queuedBehavior.priority === 'critical'
          ? '🔴'
          : queuedBehavior.priority === 'high'
            ? '🟡'
            : '';

      const repeatInfo =
        queuedBehavior.repeats !== undefined && queuedBehavior.repeats > 1
          ? ` (${(queuedBehavior.currentRepeat ?? 0) + 1}/${queuedBehavior.repeats})`
          : '';

      const statusIcon = isCompleted ? '✓' : isCurrent ? '▶' : '·';
      const displayText = `${statusIcon} ${priorityIndicator}${behaviorName}${repeatInfo}`;

      ctx.fillText(displayText, panelX + padding + 5, y);
      y += 14;
    }

    if (agent.behaviorQueue.length > maxItems) {
      ctx.fillStyle = '#888888';
      ctx.fillText(`... and ${agent.behaviorQueue.length - maxItems} more`, panelX + padding + 5, y);
      y += 14;
    }

    y += 5;
    return y;
  }
}
