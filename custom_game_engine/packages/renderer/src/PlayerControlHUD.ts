import type { World, PossessionStatus } from '@ai-village/core';
import type { Entity } from '@ai-village/core';
import type {
  IdentityComponent,
  NeedsComponent,
} from '@ai-village/core';

/**
 * PlayerControlHUD - Displays possession status when player is jacked in
 *
 * Phase 16: Polish & Player - Player Avatar System
 *
 * Shows:
 * - Possessed agent name and avatar
 * - Belief remaining / cost per tick
 * - Time remaining in possession
 * - Agent health / hunger / energy
 * - Warning indicators when belief is low
 */
export class PlayerControlHUD {
  private readonly padding = 12;
  private readonly lineHeight = 16;
  private readonly warningBeliefThreshold = 50; // Show warning when belief < 50

  constructor() {}

  /**
   * Render the possession HUD (top-right corner)
   */
  render(
    ctx: CanvasRenderingContext2D,
    canvasWidth: number,
    _canvasHeight: number,
    _world: World,
    getPossessionStatus: () => PossessionStatus | null,
    getPossessedAgent: () => Entity | null
  ): void {
    const status = getPossessionStatus();

    if (!status) {
      // Not currently possessed - don't render
      return;
    }

    const agent = getPossessedAgent();
    if (!agent) {
      // Agent doesn't exist - don't render
      return;
    }

    // Get agent details
    const identity = agent.components.get('identity') as IdentityComponent | undefined;
    const needs = agent.components.get('needs') as NeedsComponent | undefined;

    const agentName = identity?.name ?? 'Unknown Agent';

    // Calculate HUD dimensions
    const hudWidth = 280;
    const hudHeight = 160;
    const x = canvasWidth - hudWidth - 10; // Top-right corner
    const y = 10;

    // Determine if we should show warning (low belief)
    const showWarning = status.beliefRemaining < this.warningBeliefThreshold;

    // Draw HUD background
    ctx.fillStyle = showWarning ? 'rgba(80, 0, 0, 0.85)' : 'rgba(0, 0, 0, 0.85)';
    ctx.fillRect(x, y, hudWidth, hudHeight);

    // Draw HUD border
    ctx.strokeStyle = showWarning ? '#FF0000' : '#FFD700';
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, hudWidth, hudHeight);

    // Render content
    let currentY = y + this.padding + 12;

    // Title
    ctx.fillStyle = '#FFD700';
    ctx.font = 'bold 14px monospace';
    ctx.fillText('⚡ POSSESSED', x + this.padding, currentY);
    currentY += this.lineHeight + 4;

    // Agent name
    ctx.fillStyle = '#FFF';
    ctx.font = '12px monospace';
    ctx.fillText(`Agent: ${agentName}`, x + this.padding, currentY);
    currentY += this.lineHeight;

    // Belief status
    const beliefPercent = Math.round((status.beliefRemaining / 100) * 100);
    const beliefColor = this.getBeliefColor(status.beliefRemaining);
    ctx.fillStyle = beliefColor;
    ctx.fillText(
      `Belief: ${Math.round(status.beliefRemaining)} (${beliefPercent}%)`,
      x + this.padding,
      currentY
    );
    currentY += this.lineHeight;

    // Belief cost
    ctx.fillStyle = '#AAA';
    ctx.fillText(
      `Cost: ${status.beliefCostPerTick.toFixed(2)}/tick`,
      x + this.padding,
      currentY
    );
    currentY += this.lineHeight + 4;

    // Time remaining
    const secondsRemaining = Math.round(status.ticksRemaining / 20); // Assuming 20 TPS
    const minutesRemaining = Math.floor(secondsRemaining / 60);
    const seconds = secondsRemaining % 60;
    ctx.fillStyle = '#87CEEB';
    ctx.fillText(
      `Time: ${minutesRemaining}:${seconds.toString().padStart(2, '0')}`,
      x + this.padding,
      currentY
    );
    currentY += this.lineHeight + 4;

    // Agent needs (if available)
    if (needs) {
      // Health
      const healthPercent = Math.round(needs.health * 100);
      const healthColor = this.getNeedColor(needs.health);
      ctx.fillStyle = healthColor;
      ctx.fillText(`Health: ${healthPercent}%`, x + this.padding, currentY);
      currentY += this.lineHeight;

      // Hunger
      const hungerPercent = Math.round((1 - needs.hunger) * 100);
      const hungerColor = this.getNeedColor(1 - needs.hunger);
      ctx.fillStyle = hungerColor;
      ctx.fillText(`Hunger: ${hungerPercent}%`, x + this.padding, currentY);
      currentY += this.lineHeight;

      // Energy
      const energyPercent = Math.round(needs.energy * 100);
      const energyColor = this.getNeedColor(needs.energy);
      ctx.fillStyle = energyColor;
      ctx.fillText(`Energy: ${energyPercent}%`, x + this.padding, currentY);
    }

    // Warning message at bottom (if low belief)
    if (showWarning) {
      const warningY = y + hudHeight - this.padding - 2;
      ctx.fillStyle = '#FF0000';
      ctx.font = 'bold 12px monospace';
      const warningText = status.beliefRemaining < 10 ? '⚠ CRITICAL ⚠' : '⚠ LOW BELIEF ⚠';
      const warningWidth = ctx.measureText(warningText).width;
      ctx.fillText(warningText, x + (hudWidth - warningWidth) / 2, warningY);
    }
  }

  /**
   * Get color for belief value
   */
  private getBeliefColor(belief: number): string {
    if (belief < 10) return '#FF0000'; // Critical
    if (belief < 30) return '#FF8C00'; // Warning
    if (belief < 50) return '#FFFF00'; // Caution
    return '#00FF00'; // Good
  }

  /**
   * Get color for need values (0.0 - 1.0)
   */
  private getNeedColor(value: number): string {
    if (value < 0.3) return '#FF0000'; // Critical
    if (value < 0.5) return '#FF8C00'; // Warning
    if (value < 0.7) return '#FFFF00'; // Caution
    return '#00FF00'; // Good
  }
}
