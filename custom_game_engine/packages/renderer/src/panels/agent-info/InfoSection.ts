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
import type { PersonalGoal, SpiritualComponent } from '@ai-village/core';
import {
  wrapText,
  renderWrappedText,
  renderSeparator,
  getTemperatureStateColor,
  getNeedBarColor,
} from './renderUtils.js';
import { renderSprite } from '../../SpriteRenderer.js';

export class InfoSection {
  private panelWidth = 360;
  private scrollOffset = 0;
  private navigationTargetBounds: { x: number; y: number; width: number; height: number; targetX: number; targetY: number } | null = null;
  private onNavigateToTarget: ((x: number, y: number) => void) | null = null;

  getScrollOffset(): number {
    return this.scrollOffset;
  }

  setScrollOffset(offset: number): void {
    this.scrollOffset = offset;
  }

  handleScroll(deltaY: number): void {
    if (deltaY > 0) {
      this.scrollOffset += 3;
    } else {
      this.scrollOffset = Math.max(0, this.scrollOffset - 3);
    }
  }

  /**
   * Set callback for when user clicks on navigation target.
   */
  setOnNavigateToTarget(callback: (x: number, y: number) => void): void {
    this.onNavigateToTarget = callback;
  }

  /**
   * Handle click on navigation target.
   */
  handleClick(clickX: number, clickY: number): boolean {
    if (this.navigationTargetBounds && this.onNavigateToTarget) {
      const bounds = this.navigationTargetBounds;
      if (
        clickX >= bounds.x &&
        clickX <= bounds.x + bounds.width &&
        clickY >= bounds.y &&
        clickY <= bounds.y + bounds.height
      ) {
        this.onNavigateToTarget(bounds.targetX, bounds.targetY);
        return true;
      }
    }
    return false;
  }

  render(
    context: SectionRenderContext,
    entity: any,
    identity: IdentityComponent | undefined,
    agent: AgentComponentData | undefined,
    needs: NeedsComponentData | undefined,
    position: PositionComponentData | undefined,
    temperature: TemperatureComponentData | undefined,
    movement: MovementComponentData | undefined,
    _inventory: InventoryComponentData | undefined,
    goals?: GoalsComponent,
    world?: any
  ): void {
    const { ctx, x, y, width, height, padding, lineHeight } = context;

    // Save the context state for clipping
    ctx.save();
    ctx.beginPath();
    ctx.rect(x, y, width, height);
    ctx.clip();

    let currentY = y + padding - this.scrollOffset;

    // Sprite rendering in top-right corner
    const spriteSize = 48;
    const spriteX = x + width - spriteSize - padding;
    const spriteY = currentY;

    // Get renderable component for sprite ID
    const renderable = entity.components.get('renderable') as { spriteId: string } | undefined;
    if (renderable?.spriteId) {
      // Draw sprite background
      ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
      ctx.fillRect(spriteX, spriteY, spriteSize, spriteSize);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
      ctx.lineWidth = 1;
      ctx.strokeRect(spriteX, spriteY, spriteSize, spriteSize);

      // Render the sprite
      renderSprite(ctx, renderable.spriteId, spriteX, spriteY, spriteSize);
    }

    // Agent name (if available) - adjusted to not overlap sprite
    const textMaxWidth = width - spriteSize - padding * 3;
    if (identity?.name) {
      ctx.fillStyle = '#FFD700';
      ctx.font = 'bold 18px monospace';

      // Truncate name if too long
      let displayName = identity.name;
      const nameWidth = ctx.measureText(displayName).width;
      if (nameWidth > textMaxWidth) {
        while (ctx.measureText(displayName + '...').width > textMaxWidth && displayName.length > 0) {
          displayName = displayName.slice(0, -1);
        }
        displayName += '...';
      }

      ctx.fillText(displayName, x + padding, currentY + 14);
      currentY += 26;
    } else {
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 16px monospace';
      ctx.fillText('Agent Info', x + padding, currentY + 12);
      currentY += 30;
    }

    // Adjust currentY to be below sprite if name is shorter
    if (spriteSize > 26) {
      currentY = Math.max(currentY, spriteY + spriteSize + 4);
    }

    // Soul information (if available)
    const soulIdentity = entity.components.get('soul_identity') as any;
    if (soulIdentity) {
      ctx.font = '12px monospace';
      ctx.fillStyle = '#AADDFF';
      ctx.fillText(`Soul: ${soulIdentity.soulName}`, x + padding, currentY);
      currentY += lineHeight;

      // Reincarnation count
      const incarnationCount = soulIdentity.incarnationHistory?.length || 0;
      const incarnationText = incarnationCount === 1
        ? 'First incarnation'
        : `Incarnation ${incarnationCount}`;
      ctx.fillStyle = '#88CCFF';
      ctx.font = '11px monospace';
      ctx.fillText(`✦ ${incarnationText}`, x + padding, currentY);

      // Archetype
      if (soulIdentity.archetype) {
        const archetypeText = soulIdentity.archetype.charAt(0).toUpperCase() + soulIdentity.archetype.slice(1);
        ctx.fillStyle = '#FFCC88';
        ctx.fillText(`[${archetypeText}]`, x + padding + 150, currentY);
      }

      currentY += lineHeight + 3;

      // Purpose (if available, truncated)
      if (soulIdentity.purpose) {
        ctx.fillStyle = '#CCCCFF';
        ctx.font = '10px monospace';
        const purposeText = soulIdentity.purpose.length > 45
          ? soulIdentity.purpose.substring(0, 42) + '...'
          : soulIdentity.purpose;
        ctx.fillText(`"${purposeText}"`, x + padding, currentY);
        currentY += 12;
      }

      currentY += 5;
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

    // Home section (assigned bed)
    if (agent && agent.assignedBed && position && world) {
      const bedEntity = world.entities.get(agent.assignedBed);
      if (bedEntity) {
        const bedPos = bedEntity.getComponent('position') as PositionComponentData | undefined;
        if (bedPos) {
          // Calculate distance from home
          const dx = position.x - bedPos.x;
          const dy = position.y - bedPos.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          const homeRadius = agent.homePreferences?.homeRadius || 20;

          ctx.fillStyle = '#AADDFF';
          ctx.font = '12px monospace';
          ctx.fillText(`🏠 Home: (${bedPos.x.toFixed(1)}, ${bedPos.y.toFixed(1)})`, x + padding, currentY);
          currentY += lineHeight;

          // Distance and status
          const withinRadius = distance <= homeRadius;
          const statusColor = withinRadius ? '#00FF00' : '#FFAA00';
          ctx.fillStyle = statusColor;
          ctx.font = '11px monospace';
          const statusText = withinRadius ? '(near home)' : '(away from home)';
          ctx.fillText(`  Distance: ${distance.toFixed(1)} tiles ${statusText}`, x + padding, currentY);
          currentY += lineHeight;
          ctx.font = '12px monospace';
        }
      }
    }

    // Behavior
    if (agent) {
      const behaviorLabel = agent.behavior.replace('_', ' ').toUpperCase();
      ctx.fillStyle = '#FFAA00';
      ctx.fillText(`Behavior: ${behaviorLabel}`, x + padding, currentY);
      currentY += lineHeight;

      // Navigation Target (if agent is moving toward something)
      const navigationTarget = this.getNavigationTarget(entity, world);
      if (navigationTarget) {
        currentY = this.renderNavigationTarget(
          ctx,
          x,
          currentY,
          padding,
          lineHeight,
          navigationTarget,
          position
        );
      }

      // Behavior Queue section - moved here for visibility
      if (agent.behaviorQueue && agent.behaviorQueue.length > 0) {
        currentY = this.renderBehaviorQueue(ctx, x, currentY, agent, padding, lineHeight);
      }

      const llmStatus = agent.useLLM ? 'Yes' : 'No';
      ctx.fillStyle = '#888';
      ctx.font = '11px monospace';
      ctx.fillText(`Uses LLM: ${llmStatus}`, x + padding, currentY);

      // Check if agent believes in the Creator (Supreme Creator deity)
      const believesInCreator = this.checkBelievesInCreator(entity, world);
      const beliefX = x + padding + 100; // Position after "Uses LLM: Yes"
      if (believesInCreator) {
        ctx.fillStyle = '#FFD700'; // Gold for believers
        ctx.font = 'bold 11px monospace';
        ctx.fillText('✦ BELIEVES IN YOU', beliefX, currentY);
      } else {
        ctx.fillStyle = '#666';
        ctx.font = '11px monospace';
        ctx.fillText('(no faith in you)', beliefX, currentY);
      }

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
        const activeGoals = goals.goals.filter((g: PersonalGoal) => !g.completed);

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
      currentY = renderWrappedText(ctx, agent.lastThought, x, currentY, padding, lineHeight, this.panelWidth - padding * 2, 50);
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

    // Planned Builds section
    if (agent?.plannedBuilds && agent.plannedBuilds.length > 0) {
      currentY = this.renderPlannedBuilds(ctx, x, currentY, agent, padding, lineHeight);
    }

    // Action Queue section
    const actionQueue = entity.components.get('action_queue') as any;
    if (actionQueue && !actionQueue.isEmpty()) {
      currentY = this.renderActionQueue(ctx, x, currentY, actionQueue, padding, lineHeight);
    }

    // Restore canvas state
    ctx.restore();
  }

  /**
   * Check if an agent believes in the player deity (the player/AI God).
   */
  private checkBelievesInCreator(entity: any, world: any): boolean {
    if (!world || !entity) return false;

    // Get the agent's spiritual component
    const spiritual = entity.components?.get('spiritual') as SpiritualComponent | undefined;
    if (!spiritual || !spiritual.believedDeity) return false;

    // Find the player deity entity (has deity component with domain 'player' or tag 'player_god')
    let playerDeityId: string | null = null;
    if (typeof world.entities?.values === 'function') {
      for (const ent of world.entities.values()) {
        // Check for player deity by deity component with player domain
        const deity = ent.components?.get('deity');
        if (deity && (deity as any).domain === 'player') {
          playerDeityId = ent.id;
          break;
        }
        // Also check for supreme_creator as fallback
        if (ent.components?.has('supreme_creator')) {
          playerDeityId = ent.id;
          break;
        }
      }
    }

    if (!playerDeityId) return false;

    // Check if the agent believes in the player deity
    return spiritual.believedDeity === playerDeityId;
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

    // NeedsComponent uses 0-1 scale, convert to percentage for display
    const displayValue = value * 100;

    ctx.fillStyle = '#FFFFFF';
    ctx.font = '12px monospace';
    ctx.fillText(label, panelX + padding, y);

    ctx.fillStyle = 'rgba(50, 50, 50, 0.8)';
    ctx.fillRect(barX, barY, barWidth, barHeight);

    const fillWidth = (barWidth * displayValue) / 100;
    const color = getNeedBarColor(label, displayValue);
    ctx.fillStyle = color;
    ctx.fillRect(barX, barY, fillWidth, barHeight);

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.lineWidth = 1;
    ctx.strokeRect(barX, barY, barWidth, barHeight);

    ctx.fillStyle = '#FFFFFF';
    ctx.font = '10px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(`${displayValue.toFixed(0)}`, barX + barWidth / 2, barY + barHeight - 2);
    ctx.textAlign = 'left';

    return y + lineHeight;
  }

  private renderPlannedBuilds(
    ctx: CanvasRenderingContext2D,
    panelX: number,
    y: number,
    agent: AgentComponentData,
    padding: number,
    lineHeight: number
  ): number {
    if (!agent.plannedBuilds || agent.plannedBuilds.length === 0) {
      return y;
    }

    renderSeparator(ctx, panelX, y, this.panelWidth, padding);
    y += 10;

    ctx.font = 'bold 12px monospace';
    ctx.fillStyle = '#88CCFF';
    ctx.fillText(`🏗️ Planned Builds (${agent.plannedBuilds.length})`, panelX + padding, y);
    y += lineHeight + 5;

    const maxItems = Math.min(5, agent.plannedBuilds.length);
    ctx.font = '11px monospace';

    for (let i = 0; i < maxItems; i++) {
      const build = agent.plannedBuilds[i];
      if (!build) continue;

      // Priority color
      const priorityColor =
        build.priority === 'high' ? '#FFD700' :
        build.priority === 'normal' ? '#FFFFFF' :
        '#888888';

      ctx.fillStyle = priorityColor;

      // Building name and position
      const buildingName = build.buildingType.replace('_', ' ');
      const posText = `${buildingName} @ (${build.position.x.toFixed(0)}, ${build.position.y.toFixed(0)})`;
      ctx.fillText(posText, panelX + padding + 5, y);
      y += 14;

      // Reason (if available)
      if (build.reason) {
        ctx.fillStyle = '#888888';
        const wrappedReason = wrapText(build.reason, this.panelWidth - padding * 2 - 10);
        for (const line of wrappedReason.slice(0, 2)) {
          ctx.fillText(`  ${line}`, panelX + padding + 5, y);
          y += 12;
        }
      }
    }

    if (agent.plannedBuilds.length > maxItems) {
      ctx.fillStyle = '#888888';
      ctx.fillText(`... and ${agent.plannedBuilds.length - maxItems} more`, panelX + padding + 5, y);
      y += 14;
    }

    y += 5;
    return y;
  }

  private renderActionQueue(
    ctx: CanvasRenderingContext2D,
    panelX: number,
    y: number,
    actionQueue: any,
    padding: number,
    lineHeight: number
  ): number {
    renderSeparator(ctx, panelX, y, this.panelWidth, padding);
    y += 10;

    ctx.font = 'bold 12px monospace';
    ctx.fillStyle = '#FFAA00';
    ctx.fillText(`⚙️ Action Queue (${actionQueue.size()})`, panelX + padding, y);
    y += lineHeight + 5;

    // Get all actions by accessing the private queue field
    // Since this is a UI display, we'll peek at the internal state
    const actions = (actionQueue as any).queue || [];
    const maxItems = Math.min(5, actions.length);

    ctx.font = '11px monospace';
    for (let i = 0; i < maxItems; i++) {
      const action = actions[i];
      if (!action) continue;

      const isCurrent = i === 0;

      if (isCurrent) {
        ctx.fillStyle = 'rgba(255, 170, 0, 0.15)';
        ctx.fillRect(panelX + padding, y - 11, this.panelWidth - padding * 2, 14);
      }

      ctx.fillStyle = isCurrent ? '#00FF00' : '#FFFFFF';

      const actionName = action.type.replace('_', ' ');
      const priorityText = action.priority ? ` [P${action.priority}]` : '';
      const statusIcon = isCurrent ? '▶' : '·';
      const displayText = `${statusIcon} ${actionName}${priorityText}`;

      ctx.fillText(displayText, panelX + padding + 5, y);
      y += 14;

      // Show target if available
      if (action.targetId || action.targetPos) {
        ctx.fillStyle = '#888888';
        const target = action.targetId
          ? `ID: ${action.targetId.substring(0, 8)}`
          : `Pos: (${action.targetPos?.x?.toFixed(0)}, ${action.targetPos?.y?.toFixed(0)})`;
        ctx.fillText(`  ${target}`, panelX + padding + 5, y);
        y += 12;
      }
    }

    if (actions.length > maxItems) {
      ctx.fillStyle = '#888888';
      ctx.fillText(`... and ${actions.length - maxItems} more`, panelX + padding + 5, y);
      y += 14;
    }

    y += 5;
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

  /**
   * Extract navigation target from entity's steering or action queue.
   */
  private getNavigationTarget(entity: any, world: any): { x: number; y: number; name: string; type: string } | null {
    // Check steering component first
    const steering = entity.components.get('steering');
    if (steering?.target) {
      // Try to find what entity this target belongs to
      const targetInfo = this.findTargetEntityName(steering.target, world);
      return {
        x: steering.target.x,
        y: steering.target.y,
        name: targetInfo.name,
        type: targetInfo.type,
      };
    }

    // Check action queue for targetPos
    const actionQueue = entity.components.get('action_queue');
    if (actionQueue) {
      let actions: any[] = [];

      if (typeof actionQueue.peek === 'function') {
        const current = actionQueue.peek();
        if (current) actions = [current];
      } else if (Array.isArray(actionQueue.queue)) {
        actions = actionQueue.queue;
      } else if (typeof actionQueue.isEmpty === 'function' && !actionQueue.isEmpty()) {
        actions = (actionQueue as any)._queue || (actionQueue as any).actions || [];
      }

      if (actions.length > 0) {
        const currentAction = actions[0];
        if (currentAction?.targetPos) {
          const targetInfo = this.findTargetEntityName(currentAction.targetPos, world);
          return {
            x: currentAction.targetPos.x,
            y: currentAction.targetPos.y,
            name: targetInfo.name,
            type: currentAction.type || targetInfo.type,
          };
        }
      }
    }

    return null;
  }

  /**
   * Find entity at target position and return its name and type.
   */
  private findTargetEntityName(target: { x: number; y: number }, world: any): { name: string; type: string } {
    if (!world || !world.entities) {
      return { name: `(${target.x.toFixed(0)}, ${target.y.toFixed(0)})`, type: 'position' };
    }

    // Search for entities at or near the target position
    for (const [_id, entity] of world.entities) {
      const pos = entity.components.get('position');
      if (!pos) continue;

      const dx = Math.abs(pos.x - target.x);
      const dy = Math.abs(pos.y - target.y);

      // Check if entity is at target (within 1 tile)
      if (dx < 1 && dy < 1) {
        // Try to get entity name/type
        const identity = entity.components.get('identity');
        const building = entity.components.get('building');
        const resource = entity.components.get('resource_node');

        if (identity?.name) {
          return { name: identity.name, type: 'agent' };
        }
        if (building) {
          return { name: building.type || 'Building', type: 'building' };
        }
        if (resource) {
          return { name: resource.resourceType || 'Resource', type: 'resource' };
        }
      }
    }

    return { name: `(${target.x.toFixed(0)}, ${target.y.toFixed(0)})`, type: 'position' };
  }

  /**
   * Render navigation target display with icon, name, and direction.
   */
  private renderNavigationTarget(
    ctx: CanvasRenderingContext2D,
    panelX: number,
    y: number,
    padding: number,
    lineHeight: number,
    target: { x: number; y: number; name: string; type: string },
    agentPos: PositionComponentData | undefined
  ): number {
    // Reset navigation target bounds
    this.navigationTargetBounds = null;

    if (!agentPos) return y;

    // Calculate direction and distance
    const dx = target.x - agentPos.x;
    const dy = target.y - agentPos.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const angle = Math.atan2(dy, dx);

    // Get direction arrow
    const direction = this.getDirectionArrow(angle);

    // Choose icon based on type
    const icon = this.getTargetIcon(target.type);

    // Render clickable target display
    const startY = y;
    const displayHeight = 18;

    // Background highlight
    ctx.fillStyle = 'rgba(0, 204, 255, 0.15)';
    ctx.fillRect(panelX + padding, y - 12, this.panelWidth - padding * 2, displayHeight);

    // Border
    ctx.strokeStyle = 'rgba(0, 204, 255, 0.4)';
    ctx.lineWidth = 1;
    ctx.strokeRect(panelX + padding, y - 12, this.panelWidth - padding * 2, displayHeight);

    // Icon and direction
    ctx.fillStyle = '#00CCFF';
    ctx.font = 'bold 12px monospace';
    ctx.fillText(`${icon} ${direction}`, panelX + padding + 5, y);

    // Target name
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '12px monospace';
    const targetName = target.name.length > 20 ? target.name.substring(0, 17) + '...' : target.name;
    ctx.fillText(targetName, panelX + padding + 45, y);

    // Distance
    ctx.fillStyle = '#AAAAAA';
    ctx.font = '11px monospace';
    ctx.fillText(`${distance.toFixed(1)}t`, panelX + this.panelWidth - padding - 45, y);

    // Store click bounds
    this.navigationTargetBounds = {
      x: panelX + padding,
      y: startY - 12,
      width: this.panelWidth - padding * 2,
      height: displayHeight,
      targetX: target.x,
      targetY: target.y,
    };

    return y + lineHeight;
  }

  /**
   * Get direction arrow based on angle.
   */
  private getDirectionArrow(angle: number): string {
    // Convert angle to 8-direction arrow
    const directions = ['→', '↗', '↑', '↖', '←', '↙', '↓', '↘'];
    const index = Math.round((angle + Math.PI) / (Math.PI / 4)) % 8;
    return directions[index] || '→';
  }

  /**
   * Get icon for target type.
   */
  private getTargetIcon(type: string): string {
    switch (type) {
      case 'agent':
        return '👤';
      case 'building':
        return '🏠';
      case 'resource':
        return '🌲';
      case 'position':
      default:
        return '📍';
    }
  }
}
