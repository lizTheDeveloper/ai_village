import type { IWindowPanel } from './types/WindowTypes.js';
import type { World, Entity } from '@ai-village/core';
import type {
  AgentComponent,
  IdentityComponent,
  NeedsComponent,
  PositionComponent,
  DeityComponent,
  PlayerControlComponent,
} from '@ai-village/core';

/**
 * AgentSelectionPanel - Select an agent to possess
 *
 * Phase 16: Polish & Player - Player Avatar System
 *
 * Features:
 * - List of all living agents
 * - Shows health, hunger, energy for each
 * - Click to initiate possession (jack-in)
 * - Displays belief cost for possession
 * - Disabled if already possessing another agent
 */
export class AgentSelectionPanel implements IWindowPanel {
  private visible: boolean = false;
  private scrollOffset: number = 0;
  private readonly lineHeight = 60;
  private readonly padding = 10;
  private world: World | null = null;

  private onPossessAgent?: (agentId: string) => void;

  constructor() {}

  getId(): string {
    return 'agent-selection';
  }

  getTitle(): string {
    return 'Jack In - Select Agent';
  }

  getDefaultWidth(): number {
    return 400;
  }

  getDefaultHeight(): number {
    return 500;
  }

  isVisible(): boolean {
    return this.visible;
  }

  setVisible(visible: boolean): void {
    this.visible = visible;
  }

  /**
   * Set callback for when agent is selected for possession
   */
  setOnPossessAgent(callback: (agentId: string) => void): void {
    this.onPossessAgent = callback;
  }

  render(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number,
    world?: World
  ): void {
    if (!this.visible || !world) {
      return;
    }

    // Store world reference for handleContentClick
    this.world = world;

    // Get all agents
    const agents = world
      .query()
      .with('agent', 'identity', 'needs', 'position')
      .executeEntities();

    // Filter to living agents only
    const livingAgents = agents.filter((entity) => {
      const needs = entity.components.get('needs') as NeedsComponent;
      return needs.health > 0;
    });

    if (livingAgents.length === 0) {
      ctx.fillStyle = '#888';
      ctx.font = '14px monospace';
      ctx.fillText('No agents available', x + this.padding, y + 30);
      return;
    }

    // Get player deity info (for belief check)
    const playerEntities = world.query().with('player_control', 'deity').executeEntities();
    const playerEntity = playerEntities[0];
    const deity = playerEntity
      ? (playerEntity.components.get('deity') as DeityComponent)
      : null;

    const currentBelief = deity?.belief.currentBelief ?? 0;
    const initialCost = 10.0; // Must match PossessionSystem.jackIn initial cost

    // Check if already possessing
    const playerControl = playerEntity
      ? (playerEntity.components.get('player_control') as PlayerControlComponent | undefined)
      : null;
    const alreadyPossessing = playerControl?.isPossessed ?? false;

    // Render header
    ctx.fillStyle = '#FFD700';
    ctx.font = 'bold 14px monospace';
    ctx.fillText(`Available Agents: ${livingAgents.length}`, x + this.padding, y + 20);

    // Show current belief
    const beliefColor = currentBelief >= initialCost ? '#00FF00' : '#FF0000';
    ctx.fillStyle = beliefColor;
    ctx.fillText(`Belief: ${Math.round(currentBelief)} (Cost: ${initialCost})`, x + this.padding, y + 40);

    // Warning if already possessing
    if (alreadyPossessing) {
      ctx.fillStyle = '#FF8C00';
      ctx.font = '12px monospace';
      ctx.fillText('⚠ Jack out first to possess another agent', x + this.padding, y + 60);
    }

    // Render agent list
    let currentY = y + 80;
    const visibleHeight = height - 80;
    const startIndex = Math.floor(this.scrollOffset / this.lineHeight);
    const endIndex = Math.ceil((this.scrollOffset + visibleHeight) / this.lineHeight);

    for (let i = startIndex; i < Math.min(endIndex, livingAgents.length); i++) {
      const entity = livingAgents[i];
      if (!entity) continue;

      const itemY = currentY + (i * this.lineHeight) - this.scrollOffset;

      // Skip if out of visible bounds
      if (itemY + this.lineHeight < y + 80 || itemY > y + height) {
        continue;
      }

      this.renderAgentItem(
        ctx,
        entity,
        x + this.padding,
        itemY,
        width - this.padding * 2,
        currentBelief >= initialCost && !alreadyPossessing
      );
    }
  }

  /**
   * Render a single agent list item
   */
  private renderAgentItem(
    ctx: CanvasRenderingContext2D,
    entity: Entity,
    x: number,
    y: number,
    width: number,
    canPossess: boolean
  ): void {
    const identity = entity.components.get('identity') as IdentityComponent;
    const needs = entity.components.get('needs') as NeedsComponent;
    const position = entity.components.get('position') as PositionComponent;
    const agent = entity.components.get('agent') as AgentComponent;

    // Background
    const bgColor = canPossess ? 'rgba(50, 50, 80, 0.3)' : 'rgba(40, 40, 40, 0.3)';
    ctx.fillStyle = bgColor;
    ctx.fillRect(x, y, width, this.lineHeight - 5);

    // Border (highlight if hoverable)
    ctx.strokeStyle = canPossess ? '#87CEEB' : '#555';
    ctx.lineWidth = 1;
    ctx.strokeRect(x, y, width, this.lineHeight - 5);

    // Name
    ctx.fillStyle = canPossess ? '#FFD700' : '#888';
    ctx.font = 'bold 14px monospace';
    ctx.fillText(identity.name, x + 5, y + 18);

    // Behavior
    ctx.fillStyle = '#AAA';
    ctx.font = '12px monospace';
    ctx.fillText(`Task: ${this.formatBehavior(agent.behavior)}`, x + 5, y + 35);

    // Position
    ctx.fillText(
      `Pos: (${Math.round(position.x)}, ${Math.round(position.y)})`,
      x + 5,
      y + 50
    );

    // Health bar
    const barWidth = 80;
    const barHeight = 8;
    const barX = x + width - barWidth - 5;
    const barY1 = y + 8;

    this.renderNeedBar(ctx, 'Health', needs.health, barX, barY1, barWidth, barHeight);

    // Hunger bar
    const barY2 = y + 23;
    this.renderNeedBar(ctx, 'Hunger', 1 - needs.hunger, barX, barY2, barWidth, barHeight);

    // Energy bar
    const barY3 = y + 38;
    this.renderNeedBar(ctx, 'Energy', needs.energy, barX, barY3, barWidth, barHeight);

    // "Click to Jack In" hint (if can possess)
    if (canPossess) {
      ctx.fillStyle = '#87CEEB';
      ctx.font = '11px monospace';
      ctx.fillText('[Click to Jack In]', x + 5, y + this.lineHeight - 10);
    }
  }

  /**
   * Render a need bar (health/hunger/energy)
   */
  private renderNeedBar(
    ctx: CanvasRenderingContext2D,
    _label: string,
    value: number,
    x: number,
    y: number,
    width: number,
    height: number
  ): void {
    // Background
    ctx.fillStyle = '#333';
    ctx.fillRect(x, y, width, height);

    // Fill
    const fillWidth = width * value;
    ctx.fillStyle = this.getNeedColor(value);
    ctx.fillRect(x, y, fillWidth, height);

    // Border
    ctx.strokeStyle = '#666';
    ctx.lineWidth = 1;
    ctx.strokeRect(x, y, width, height);
  }

  /**
   * Get color for need value (0.0 - 1.0)
   */
  private getNeedColor(value: number): string {
    if (value < 0.3) return '#FF0000'; // Critical
    if (value < 0.5) return '#FF8C00'; // Warning
    if (value < 0.7) return '#FFFF00'; // Caution
    return '#00FF00'; // Good
  }

  /**
   * Format behavior name from snake_case to Title Case
   */
  private formatBehavior(behavior: string): string {
    return behavior
      .split('_')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  handleContentClick(_x: number, y: number, _width: number, _height: number): boolean {
    if (!this.world) {
      return false;
    }

    const world = this.world;

    // Get all living agents
    const agents = world
      .query()
      .with('agent', 'identity', 'needs')
      .executeEntities();

    const livingAgents = agents.filter((entity) => {
      const needs = entity.components.get('needs') as NeedsComponent;
      return needs.health > 0;
    });

    // Get player deity info
    const playerEntities = world.query().with('player_control', 'deity').executeEntities();
    const playerEntity = playerEntities[0];
    const deity = playerEntity
      ? (playerEntity.components.get('deity') as DeityComponent)
      : null;

    const currentBelief = deity?.belief.currentBelief ?? 0;
    const initialCost = 10.0;

    // Check if already possessing
    const playerControl = playerEntity
      ? (playerEntity.components.get('player_control') as PlayerControlComponent | undefined)
      : null;
    const alreadyPossessing = playerControl?.isPossessed ?? false;

    // Can't possess if insufficient belief or already possessing
    if (currentBelief < initialCost || alreadyPossessing) {
      return false;
    }

    // Determine which agent was clicked
    const clickY = y + this.scrollOffset - 80; // Offset for header
    const clickedIndex = Math.floor(clickY / this.lineHeight);

    if (clickedIndex >= 0 && clickedIndex < livingAgents.length) {
      const clickedAgent = livingAgents[clickedIndex];

      // Trigger possession callback
      if (this.onPossessAgent && clickedAgent) {
        this.onPossessAgent(clickedAgent.id);
        return true;
      }
    }

    return false;
  }

  handleScroll(deltaY: number, contentHeight: number): boolean {
    const maxScroll = Math.max(0, contentHeight - this.getDefaultHeight() + 100);
    this.scrollOffset = Math.max(0, Math.min(maxScroll, this.scrollOffset + deltaY));
    return true;
  }
}
