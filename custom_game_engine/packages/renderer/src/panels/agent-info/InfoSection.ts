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
import type { PersonalGoal, SpiritualComponent, SoulIdentityComponent, DeityComponent, Component } from '@ai-village/core';
import { ComponentType as CT } from '@ai-village/core';

/** Type guard for ActionQueue component with methods */
interface ActionQueueWithMethods extends Component {
  isEmpty(): boolean;
  size(): number;
  peek(): QueuedAction | undefined;
  queue: QueuedAction[];
}

/** Queued action from ActionQueue */
interface QueuedAction {
  type: string;
  priority?: number;
  targetId?: string;
  targetPos?: { x: number; y: number };
  [key: string]: unknown;
}

/** Type guard to check if component is an ActionQueue with methods */
function isActionQueue(component: Component | undefined): component is ActionQueueWithMethods {
  if (!component) return false;
  return (
    typeof (component as any).isEmpty === 'function' &&
    typeof (component as any).size === 'function' &&
    typeof (component as any).peek === 'function' &&
    Array.isArray((component as any).queue)
  );
}
import {
  wrapText,
  renderWrappedText,
  renderSeparator,
  getTemperatureStateColor,
  getNeedBarColor,
} from './renderUtils.js';
import { renderSprite } from '../../SpriteRenderer.js';
import { devActionsService } from '../../services/DevActionsService.js';

/** Click region for interactive elements */
interface ClickRegion {
  x: number;
  y: number;
  width: number;
  height: number;
  action: 'need_up' | 'need_down' | 'nav_target';
  needType?: string;
  targetX?: number;
  targetY?: number;
}

export class InfoSection {
  private panelWidth = 360;
  private scrollOffset = 0;
  private navigationTargetBounds: { x: number; y: number; width: number; height: number; targetX: number; targetY: number } | null = null;
  private onNavigateToTarget: ((x: number, y: number) => void) | null = null;
  private clickRegions: ClickRegion[] = [];
  private currentEntityId: string | null = null;
  private devMode = true; // Show dev controls

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
   * Set dev mode (shows/hides edit controls).
   */
  setDevMode(enabled: boolean): void {
    this.devMode = enabled;
  }

  /**
   * Handle click on navigation target or dev controls.
   */
  handleClick(clickX: number, clickY: number): boolean {
    // Check click regions first (dev controls)
    for (const region of this.clickRegions) {
      if (
        clickX >= region.x &&
        clickX <= region.x + region.width &&
        clickY >= region.y &&
        clickY <= region.y + region.height
      ) {
        return this.executeAction(region);
      }
    }

    // Then check navigation target
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

  private executeAction(region: ClickRegion): boolean {
    if (!this.currentEntityId) return false;

    switch (region.action) {
      case 'need_up': {
        if (!region.needType) return false;
        const world = devActionsService.getWorld();
        if (!world) return false;
        const entity = world.getEntity(this.currentEntityId);
        if (!entity) return false;
        const needs = entity.components.get('needs') as Record<string, number> | undefined;
        const currentValue = needs?.[region.needType] ?? 0.5;
        const result = devActionsService.setNeed(
          this.currentEntityId,
          region.needType,
          Math.min(1, currentValue + 0.1)
        );
        return result.success;
      }
      case 'need_down': {
        if (!region.needType) return false;
        const world = devActionsService.getWorld();
        if (!world) return false;
        const entity = world.getEntity(this.currentEntityId);
        if (!entity) return false;
        const needs = entity.components.get('needs') as Record<string, number> | undefined;
        const currentValue = needs?.[region.needType] ?? 0.5;
        const result = devActionsService.setNeed(
          this.currentEntityId,
          region.needType,
          Math.max(0, currentValue - 0.1)
        );
        return result.success;
      }
      case 'nav_target': {
        if (region.targetX !== undefined && region.targetY !== undefined && this.onNavigateToTarget) {
          this.onNavigateToTarget(region.targetX, region.targetY);
          return true;
        }
        return false;
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
    inventory: InventoryComponentData | undefined,
    goals?: GoalsComponent,
    world?: any
  ): void {
    const { ctx, x, y, width, height, padding, lineHeight } = context;

    // Clear click regions and store entity ID
    this.clickRegions = [];
    this.currentEntityId = entity?.id || null;

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
    const soulIdentity = entity.components.get('soul_identity') as SoulIdentityComponent | undefined;
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
          // Calculate distance from home (sqrt needed here for display)
          const dx = position.x - bedPos.x;
          const dy = position.y - bedPos.y;
          const distance = Math.sqrt(dx * dx + dy * dy); // Keep sqrt: actual distance displayed to user
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
      const behaviorLabel = this.getBehaviorLabel(agent, world);
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

      // Behavior Queue section - always show for visibility
      currentY = this.renderBehaviorQueue(ctx, x, currentY, agent, padding, lineHeight);

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

    // Inventory section
    if (inventory) {
      currentY = this.renderInventorySection(ctx, x, currentY, inventory, padding, lineHeight);
    }

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
    const actionQueue = entity.components.get('action_queue') as Component | undefined;
    if (actionQueue && isActionQueue(actionQueue) && !actionQueue.isEmpty()) {
      currentY = this.renderActionQueue(ctx, x, currentY, actionQueue, padding, lineHeight);
    }

    // Restore canvas state
    ctx.restore();

    // Restore default fill style for next render
    ctx.fillStyle = '#FFFFFF';
  }

  /**
   * Check if an agent believes in the player deity (the player/AI God).
   * PERFORMANCE: Uses ECS query to get only deity entities (avoids full scan)
   */
  private checkBelievesInCreator(entity: any, world: any): boolean {
    if (!world || !entity) return false;

    // Get the agent's spiritual component
    const spiritual = entity.components?.get('spiritual') as SpiritualComponent | undefined;
    if (!spiritual || !spiritual.believedDeity) return false;

    // Find the player deity entity
    let playerDeityId: string | null = null;
    const deityEntities = world.query().with(CT.Deity).executeEntities();
    for (const ent of deityEntities) {
      const deity = ent.components?.get('deity') as DeityComponent | undefined;
      if (deity) {
        // Primary check: controller === 'player' (matches DivinePowersPanel)
        if (deity.controller === 'player') {
          playerDeityId = ent.id;
          break;
        }
        // Fallback: check domain if available (domain is typed as DeityDomain, but 'player' may not be in the enum)
        const identity = deity.identity as { domain?: string } | undefined;
        if (identity?.domain === 'player') {
          playerDeityId = ent.id;
          break;
        }
      }
      // Also check for supreme_creator as fallback
      if (ent.components?.has('supreme_creator')) {
        playerDeityId = ent.id;
        break;
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
    // Adjust bar width based on dev mode (make room for buttons)
    const buttonSpace = this.devMode ? 50 : 0;
    const barWidth = this.panelWidth - padding * 2 - 60 - buttonSpace;
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

    // Dev controls: [−] [+] buttons
    if (this.devMode) {
      const needType = label.toLowerCase();
      const buttonWidth = 20;
      const buttonHeight = 12;
      const buttonY = barY;
      const controlsX = barX + barWidth + 5;

      // Down button [−]
      if (value > 0) {
        ctx.fillStyle = 'rgba(255, 100, 100, 0.6)';
        ctx.fillRect(controlsX, buttonY, buttonWidth, buttonHeight);
        ctx.strokeStyle = '#FF6666';
        ctx.lineWidth = 1;
        ctx.strokeRect(controlsX, buttonY, buttonWidth, buttonHeight);
        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 10px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('−', controlsX + buttonWidth / 2, barY + buttonHeight - 2);
        ctx.textAlign = 'left';

        this.clickRegions.push({
          x: controlsX,
          y: buttonY,
          width: buttonWidth,
          height: buttonHeight,
          action: 'need_down',
          needType,
        });
      }

      // Up button [+]
      if (value < 1) {
        const upX = controlsX + buttonWidth + 4;
        ctx.fillStyle = 'rgba(100, 255, 100, 0.6)';
        ctx.fillRect(upX, buttonY, buttonWidth, buttonHeight);
        ctx.strokeStyle = '#66FF66';
        ctx.lineWidth = 1;
        ctx.strokeRect(upX, buttonY, buttonWidth, buttonHeight);
        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 10px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('+', upX + buttonWidth / 2, barY + buttonHeight - 2);
        ctx.textAlign = 'left';

        this.clickRegions.push({
          x: upX,
          y: buttonY,
          width: buttonWidth,
          height: buttonHeight,
          action: 'need_up',
          needType,
        });
      }
    }

    return y + lineHeight;
  }

  /**
   * Render inventory section with validation and capacity display.
   */
  private renderInventorySection(
    ctx: CanvasRenderingContext2D,
    panelX: number,
    y: number,
    inventory: InventoryComponentData,
    padding: number,
    lineHeight: number
  ): number {
    // Validate required fields (per CLAUDE.md - no silent fallbacks)
    if (!('maxWeight' in inventory) || inventory.maxWeight === undefined) {
      throw new Error("InventoryComponent missing required 'maxWeight' field");
    }
    if (!('maxSlots' in inventory) || inventory.maxSlots === undefined) {
      throw new Error("InventoryComponent missing required 'maxSlots' field");
    }
    if (!('currentWeight' in inventory) || inventory.currentWeight === undefined) {
      throw new Error("InventoryComponent missing required 'currentWeight' field");
    }
    if (!Array.isArray(inventory.slots)) {
      throw new Error("InventoryComponent 'slots' must be an array");
    }

    // Divider
    renderSeparator(ctx, panelX, y, this.panelWidth, padding);
    y += 10;

    // Section header
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 14px monospace';
    ctx.fillText('INVENTORY', panelX + padding, y);
    y += lineHeight + 5;

    // Resource icons
    const resourceIcons: Record<string, string> = {
      wood: '🪵',
      stone: '🪨',
      food: '🍎',
      water: '💧',
    };

    // Count resources from slots
    const resourceCounts: Record<string, number> = {};
    let usedSlots = 0;

    for (const slot of inventory.slots) {
      if (slot.itemId && slot.quantity > 0) {
        resourceCounts[slot.itemId] = (resourceCounts[slot.itemId] || 0) + slot.quantity;
        usedSlots++;
      }
    }

    // Check if empty
    const isEmpty = usedSlots === 0;

    if (isEmpty) {
      // Empty state
      ctx.fillStyle = '#888';
      ctx.font = '12px monospace';
      ctx.fillText('(empty)', panelX + padding, y);
      y += lineHeight;
    } else {
      // Display resources with icons
      ctx.font = '12px monospace';
      for (const [itemId, quantity] of Object.entries(resourceCounts)) {
        const icon = resourceIcons[itemId] || '📦';
        ctx.fillStyle = '#FFFFFF';
        ctx.fillText(`${icon} ${itemId}: ${quantity}`, panelX + padding, y);
        y += lineHeight;
      }
    }

    y += 5;

    // Capacity display with color warnings
    const weightPercent = (inventory.currentWeight / inventory.maxWeight) * 100;
    const slotsPercent = (usedSlots / inventory.maxSlots) * 100;
    const maxPercent = Math.max(weightPercent, slotsPercent);

    // Determine color based on capacity (per tests)
    let capacityColor = '#FFFFFF'; // < 80%
    if (maxPercent >= 100) {
      capacityColor = '#FF0000'; // >= 100% red
    } else if (maxPercent >= 80) {
      capacityColor = '#FFFF00'; // >= 80% yellow
    }

    ctx.fillStyle = capacityColor;
    ctx.font = '11px monospace';
    ctx.fillText(
      `Weight: ${inventory.currentWeight}/${inventory.maxWeight}  Slots: ${usedSlots}/${inventory.maxSlots}`,
      panelX + padding,
      y
    );
    y += lineHeight + 5;

    return y;
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
    actionQueue: ActionQueueWithMethods,
    padding: number,
    lineHeight: number
  ): number {
    renderSeparator(ctx, panelX, y, this.panelWidth, padding);
    y += 10;

    ctx.font = 'bold 12px monospace';
    ctx.fillStyle = '#FFAA00';

    const queueSize = actionQueue.size();
    ctx.fillText(`⚙️ Action Queue (${queueSize})`, panelX + padding, y);
    y += lineHeight + 5;

    // Get all actions by accessing the internal queue field
    // Since this is a UI display, we'll peek at the internal state
    const actions = actionQueue.queue;
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

      const actionType = action.type || 'unknown';
      const actionName = actionType.replace('_', ' ');
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

  /**
   * Get emoji for autonomic behaviors to make them more visible.
   */
  private getAutonomicEmoji(behavior: string): string {
    switch (behavior) {
      case 'seek_warmth':
        return '🔥 ';
      case 'seek_cooling':
        return '❄️ ';
      case 'seek_food':
        return '🍎 ';
      case 'seek_sleep':
      case 'forced_sleep':
        return '😴 ';
      default:
        return '';
    }
  }

  private renderBehaviorQueue(
    ctx: CanvasRenderingContext2D,
    panelX: number,
    y: number,
    agent: AgentComponentData,
    padding: number,
    lineHeight: number
  ): number {
    renderSeparator(ctx, panelX, y, this.panelWidth, padding);
    y += 10;

    ctx.font = 'bold 12px monospace';
    ctx.fillStyle = '#FFD700';

    const queueLength = agent.behaviorQueue?.length ?? 0;

    if (queueLength === 0) {
      // Show empty queue state
      ctx.fillText('📋 Behavior Queue', panelX + padding, y);
      y += lineHeight + 3;
      ctx.fillStyle = '#888888';
      ctx.font = '11px monospace';
      ctx.fillText('(empty - agent using reactive behavior)', panelX + padding + 5, y);
      y += lineHeight + 5;
      return y;
    }

    // Format queue status with better autonomic behavior labeling
    let queueStatus: string;
    if (agent.queuePaused) {
      queueStatus = '⏸️ PAUSED';
    } else if (agent.queueInterruptedBy) {
      // Add emoji for common autonomic behaviors
      const interruptEmoji = this.getAutonomicEmoji(agent.queueInterruptedBy);
      queueStatus = `⚠️ INTERRUPTED BY ${interruptEmoji}${agent.queueInterruptedBy.replace(/_/g, ' ').toUpperCase()}`;
    } else {
      queueStatus = '▶️ ACTIVE';
    }

    ctx.fillText(`📋 Behavior Queue (${queueLength}) ${queueStatus}`, panelX + padding, y);
    y += lineHeight + 5;

    const maxItems = Math.min(5, queueLength);
    const currentIndex = agent.currentQueueIndex ?? 0;

    ctx.font = '11px monospace';
    for (let i = 0; i < maxItems; i++) {
      const queuedBehavior = agent.behaviorQueue![i];
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

    if (queueLength > maxItems) {
      ctx.fillStyle = '#888888';
      ctx.fillText(`... and ${queueLength - maxItems} more`, panelX + padding + 5, y);
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

    // Check movement component for hasTarget/targetX/targetY
    const movement = entity.components.get('movement');
    if (movement?.hasTarget && movement.targetX !== 0 && movement.targetY !== 0) {
      const targetInfo = this.findTargetEntityName({ x: movement.targetX, y: movement.targetY }, world);
      return {
        x: movement.targetX,
        y: movement.targetY,
        name: targetInfo.name,
        type: targetInfo.type,
      };
    }

    // Check action queue for targetPos
    const actionQueue = entity.components.get('action_queue') as Component | undefined;
    if (actionQueue && isActionQueue(actionQueue)) {
      const currentAction = actionQueue.peek();
      if (currentAction?.targetPos) {
        const targetInfo = this.findTargetEntityName(currentAction.targetPos, world);
        const actionType = currentAction.type || targetInfo.type;
        return {
          x: currentAction.targetPos.x,
          y: currentAction.targetPos.y,
          name: targetInfo.name,
          type: actionType,
        };
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

    // Calculate direction and distance (sqrt needed here for display)
    const dx = target.x - agentPos.x;
    const dy = target.y - agentPos.y;
    const distance = Math.sqrt(dx * dx + dy * dy); // Keep sqrt: actual distance displayed to user
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

  /**
   * Get a contextual behavior label that includes target information.
   */
  private getBehaviorLabel(agent: AgentComponentData, world: any): string {
    const behavior = agent.behavior;
    const state = agent.behaviorState || {};

    // Format the base behavior name
    const baseName = behavior.replace(/_/g, ' ').toUpperCase();

    switch (behavior) {
      case 'follow':
      case 'follow_agent': {
        const targetId = state.targetId as string | undefined;
        if (targetId && world?.entities) {
          const target = world.entities.get(targetId);
          const identity = target?.components.get('identity');
          if (identity?.name) {
            return `FOLLOW ${identity.name.toUpperCase()}`;
          }
        }
        return 'FOLLOW (lost target)';
      }

      case 'build': {
        const buildingType = state.buildingType as string | undefined;
        if (buildingType) {
          return `BUILD ${buildingType.replace(/_/g, ' ').toUpperCase()}`;
        }
        return baseName;
      }

      case 'craft': {
        const recipeId = state.recipeId as string | undefined;
        if (recipeId) {
          return `CRAFT ${recipeId.replace(/_/g, ' ').toUpperCase()}`;
        }
        return baseName;
      }

      case 'gather': {
        const resourceType = state.resourceType as string | undefined;
        if (resourceType) {
          return `GATHER ${resourceType.replace(/_/g, ' ').toUpperCase()}`;
        }
        return baseName;
      }

      case 'talk': {
        const partnerId = state.partnerId as string | undefined;
        if (partnerId && world?.entities) {
          const partner = world.entities.get(partnerId);
          const identity = partner?.components.get('identity');
          if (identity?.name) {
            return `TALK TO ${identity.name.toUpperCase()}`;
          }
        }
        return baseName;
      }

      case 'cast_spell': {
        const spellId = state.spellId as string | undefined;
        if (spellId) {
          return `CAST ${spellId.replace(/_/g, ' ').toUpperCase()}`;
        }
        return baseName;
      }

      case 'navigate': {
        const target = state.target as { x: number; y: number } | undefined;
        if (target) {
          return `NAVIGATE TO (${Math.round(target.x)}, ${Math.round(target.y)})`;
        }
        return baseName;
      }

      case 'plant': {
        const seedType = state.seedType as string | undefined;
        if (seedType) {
          return `PLANT ${seedType.replace(/_/g, ' ').toUpperCase()}`;
        }
        return baseName;
      }

      case 'seek_warmth': {
        return '🔥 SEEKING WARMTH (autonomic)';
      }

      case 'seek_cooling': {
        return '❄️ SEEKING COOLING (autonomic)';
      }

      case 'seek_food': {
        return '🍎 SEEKING FOOD (autonomic)';
      }

      case 'seek_sleep':
      case 'forced_sleep': {
        return '😴 SEEKING SLEEP (autonomic)';
      }

      case 'water': {
        return 'WATERING';
      }

      case 'farm': {
        const farmTask = state.farmTask as string | undefined;
        if (farmTask) {
          return `FARM: ${farmTask.replace(/_/g, ' ').toUpperCase()}`;
        }
        return baseName;
      }

      case 'approach': {
        const targetId = state.targetId as string | undefined;
        if (targetId && world?.entities) {
          const target = world.entities.get(targetId);
          const identity = target?.components.get('identity');
          if (identity?.name) {
            return `APPROACH ${identity.name.toUpperCase()}`;
          }
        }
        return baseName;
      }

      case 'observe': {
        const targetId = state.targetId as string | undefined;
        if (targetId && world?.entities) {
          const target = world.entities.get(targetId);
          const identity = target?.components.get('identity');
          if (identity?.name) {
            return `OBSERVE ${identity.name.toUpperCase()}`;
          }
        }
        return baseName;
      }

      case 'trade': {
        const partnerId = state.partnerId as string | undefined;
        if (partnerId && world?.entities) {
          const partner = world.entities.get(partnerId);
          const identity = partner?.components.get('identity');
          if (identity?.name) {
            return `TRADE WITH ${identity.name.toUpperCase()}`;
          }
        }
        return baseName;
      }

      case 'deposit_items': {
        const buildingType = state.targetBuildingType as string | undefined;
        if (buildingType) {
          return `DEPOSIT TO ${buildingType.replace(/_/g, ' ').toUpperCase()}`;
        }
        return 'DEPOSIT ITEMS';
      }

      case 'material_transport': {
        const phase = state.phase as string | undefined;
        if (phase) {
          return `TRANSPORT: ${phase.replace(/_/g, ' ').toUpperCase()}`;
        }
        return 'MATERIAL TRANSPORT';
      }

      case 'tame_animal': {
        const targetId = state.targetId as string | undefined;
        if (targetId && world?.entities) {
          const target = world.entities.get(targetId);
          const identity = target?.components.get('identity');
          if (identity?.name) {
            return `TAME ${identity.name.toUpperCase()}`;
          }
          const animal = target?.components.get('animal');
          if (animal?.species) {
            return `TAME ${animal.species.toUpperCase()}`;
          }
        }
        return baseName;
      }

      default:
        return baseName;
    }
  }
}
