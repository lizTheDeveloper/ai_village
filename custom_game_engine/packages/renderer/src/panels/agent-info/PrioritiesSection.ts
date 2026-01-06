/**
 * PrioritiesSection - Renders the Priorities tab showing strategic weights.
 */

import type { SectionRenderContext, IdentityComponent, AgentComponentData } from './types.js';

export interface ResetButtonBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export class PrioritiesSection {
  private resetButtonBounds: ResetButtonBounds | null = null;
  private scrollOffset = 0;

  getResetButtonBounds(): ResetButtonBounds | null {
    return this.resetButtonBounds;
  }

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

  render(
    context: SectionRenderContext,
    identity: IdentityComponent | undefined,
    agent: AgentComponentData | undefined
  ): void {
    const { ctx, x, y, width, height, padding, lineHeight } = context;

    // Save the context state for clipping
    ctx.save();
    ctx.beginPath();
    ctx.rect(x, y, width, height);
    ctx.clip();

    let currentY = y + padding - this.scrollOffset;

    // Agent name header
    if (identity?.name) {
      ctx.fillStyle = '#FFD700';
      ctx.font = 'bold 18px monospace';
      ctx.fillText(`${identity.name}'s Priorities`, x + padding, currentY + 14);
      currentY += 30;
    } else {
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 16px monospace';
      ctx.fillText('Strategic Priorities', x + padding, currentY + 12);
      currentY += 30;
    }

    // Description
    ctx.fillStyle = '#888888';
    ctx.font = '11px monospace';
    ctx.fillText('Weights for automated behavior selection', x + padding, currentY);
    currentY += lineHeight + 10;

    if (!agent) {
      ctx.fillStyle = '#888888';
      ctx.font = '12px monospace';
      ctx.fillText('No agent data', x + padding, currentY);
      return;
    }

    const priorities = agent.priorities || {};

    // Define priority display config
    const priorityConfig: Array<{
      key: keyof typeof priorities;
      label: string;
      icon: string;
      color: string;
      description: string;
    }> = [
      { key: 'gathering', label: 'Gathering', icon: '🪵', color: '#AAFFAA', description: 'Wood, stone, food' },
      { key: 'building', label: 'Building', icon: '🏗️', color: '#FFCC88', description: 'Construction' },
      { key: 'farming', label: 'Farming', icon: '🌾', color: '#88FF88', description: 'Till, plant, water' },
      { key: 'social', label: 'Social', icon: '💬', color: '#FFAAFF', description: 'Talk, meetings' },
      { key: 'exploration', label: 'Exploration', icon: '🧭', color: '#88DDFF', description: 'Wander, explore' },
      { key: 'rest', label: 'Rest', icon: '💤', color: '#DDDDAA', description: 'Idle, sleep' },
    ];

    // Calculate sum of all priorities to normalize to 100%
    const prioritySum = priorityConfig.reduce((sum, config) => {
      return sum + (priorities[config.key] ?? 0.2);
    }, 0);

    const barWidth = 100;
    const barHeight = 12;

    for (const config of priorityConfig) {
      const value = priorities[config.key] ?? 0.2;
      const normalizedValue = prioritySum > 0 ? value / prioritySum : 0;
      const percent = Math.round(normalizedValue * 100);

      // Icon and label
      ctx.fillStyle = config.color;
      ctx.font = 'bold 12px monospace';
      ctx.fillText(`${config.icon} ${config.label}`, x + padding, currentY);
      currentY += lineHeight;

      // Description
      ctx.fillStyle = '#888888';
      ctx.font = '10px monospace';
      ctx.fillText(config.description, x + padding + 10, currentY);
      currentY += lineHeight;

      // Progress bar
      const barX = x + padding;
      const barY = currentY - 5;
      ctx.fillStyle = 'rgba(50, 50, 50, 0.8)';
      ctx.fillRect(barX, barY, barWidth, barHeight);
      ctx.fillStyle = config.color;
      ctx.fillRect(barX, barY, barWidth * normalizedValue, barHeight);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
      ctx.lineWidth = 1;
      ctx.strokeRect(barX, barY, barWidth, barHeight);

      // Percentage
      ctx.fillStyle = '#FFFFFF';
      ctx.font = '11px monospace';
      ctx.fillText(`${percent}%`, barX + barWidth + 10, currentY + 2);

      currentY += lineHeight + 8;
    }

    currentY += 10;

    // Reset button
    const btnWidth = 120;
    const btnHeight = 24;
    const btnX = x + padding;
    const btnY = currentY;
    this.resetButtonBounds = { x: btnX, y: btnY, width: btnWidth, height: btnHeight };

    ctx.fillStyle = 'rgba(80, 60, 60, 0.9)';
    ctx.fillRect(btnX, btnY, btnWidth, btnHeight);
    ctx.strokeStyle = 'rgba(255, 100, 100, 0.6)';
    ctx.lineWidth = 1;
    ctx.strokeRect(btnX, btnY, btnWidth, btnHeight);
    ctx.fillStyle = '#FFAAAA';
    ctx.font = 'bold 11px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('Reset to Default', btnX + btnWidth / 2, btnY + 16);
    ctx.textAlign = 'left';

    // Restore canvas state
    ctx.restore();
  }
}
