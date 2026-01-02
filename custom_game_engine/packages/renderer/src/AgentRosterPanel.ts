import type { IWindowPanel } from './types/WindowTypes.js';
import type { World, Entity } from '@ai-village/core';
import type {
  AgentComponent,
  IdentityComponent,
  NeedsComponent,
  SkillsComponent,
  MoodComponent,
  PositionComponent,
} from '@ai-village/core';

/**
 * AgentRosterPanel - Shows a sortable list of all agents with their status
 *
 * Displays:
 * - Agent name and current behavior
 * - Health, hunger, energy indicators (color-coded)
 * - Mood and position
 * - Sortable by name, behavior, health, etc.
 */
export class AgentRosterPanel implements IWindowPanel {
  private visible: boolean = false;
  private scrollOffset: number = 0;
  private sortBy: 'name' | 'behavior' | 'health' | 'hunger' = 'name';
  private selectedAgentId: string | null = null;
  private readonly padding = 12;
  private readonly rowHeight = 60; // Height per agent row

  constructor() {}

  getId(): string {
    return 'agent-roster';
  }

  getTitle(): string {
    return 'Agent Roster';
  }

  getDefaultWidth(): number {
    return 380;
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

  render(
    ctx: CanvasRenderingContext2D,
    _x: number,
    _y: number,
    width: number,
    height: number,
    world?: World
  ): void {
    if (!this.visible || !world) {
      return;
    }

    // Query all agents
    const agents = world.query().with('agent', 'identity').executeEntities();

    if (agents.length === 0) {
      ctx.fillStyle = '#999';
      ctx.font = '12px monospace';
      ctx.fillText('No agents found', this.padding, 30);
      return;
    }

    // Sort agents
    const sortedAgents = this.sortAgents(agents);

    let y = this.padding;

    // Header with sort controls
    ctx.fillStyle = '#00CED1';
    ctx.font = 'bold 12px monospace';
    ctx.fillText(`Agents: ${agents.length}`, this.padding, y);
    y += 18;

    // Sort buttons
    const sortOptions: Array<{ key: 'name' | 'behavior' | 'health' | 'hunger'; label: string }> = [
      { key: 'name', label: 'Name' },
      { key: 'behavior', label: 'Behavior' },
      { key: 'health', label: 'Health' },
      { key: 'hunger', label: 'Hunger' },
    ];

    ctx.font = '10px monospace';
    let sortX = this.padding;
    sortOptions.forEach(opt => {
      const isActive = this.sortBy === opt.key;
      ctx.fillStyle = isActive ? '#FFD700' : '#666';
      ctx.fillText(opt.label, sortX, y);
      sortX += 70;
    });
    y += 16;

    // Divider
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(this.padding, y);
    ctx.lineTo(width - this.padding, y);
    ctx.stroke();
    y += 8;

    // Calculate visible agents (with scrolling)
    const visibleAreaHeight = height - y;
    const maxVisibleAgents = Math.floor(visibleAreaHeight / this.rowHeight);
    const startIdx = Math.floor(this.scrollOffset);
    const endIdx = Math.min(startIdx + maxVisibleAgents, sortedAgents.length);

    // Render visible agents
    for (let i = startIdx; i < endIdx; i++) {
      const agent = sortedAgents[i];
      if (!agent) continue;

      const rowY = y + ((i - startIdx) * this.rowHeight);
      this.renderAgentRow(ctx, agent, this.padding, rowY, width - this.padding * 2);
    }

    // Scroll indicator
    if (sortedAgents.length > maxVisibleAgents) {
      const scrollbarHeight = 60;
      const scrollbarY = y + ((this.scrollOffset / sortedAgents.length) * (visibleAreaHeight - scrollbarHeight));
      ctx.fillStyle = '#555';
      ctx.fillRect(width - 8, scrollbarY, 4, scrollbarHeight);
    }
  }

  /**
   * Render a single agent row with key information
   */
  private renderAgentRow(
    ctx: CanvasRenderingContext2D,
    agent: Entity,
    x: number,
    y: number,
    width: number
  ): void {
    const identity = agent.components.get('identity') as IdentityComponent | undefined;
    const agentComp = agent.components.get('agent') as AgentComponent | undefined;
    const needs = agent.components.get('needs') as NeedsComponent | undefined;
    const mood = agent.components.get('mood') as MoodComponent | undefined;
    const position = agent.components.get('position') as PositionComponent | undefined;
    const skills = agent.components.get('skills') as SkillsComponent | undefined;

    const name = identity?.name ?? 'Unknown';
    const behavior = agentComp?.behavior ?? 'idle';
    const isSelected = agent.id === this.selectedAgentId;

    // Background for selected agent
    if (isSelected) {
      ctx.fillStyle = 'rgba(0, 206, 209, 0.1)';
      ctx.fillRect(x - 4, y - 2, width + 8, this.rowHeight - 4);
    }

    // Row border
    ctx.strokeStyle = isSelected ? '#00CED1' : '#333';
    ctx.lineWidth = 1;
    ctx.strokeRect(x - 2, y - 2, width + 4, this.rowHeight - 4);

    let currentY = y;

    // Line 1: Name and Behavior
    ctx.fillStyle = '#FFD700';
    ctx.font = 'bold 12px monospace';
    ctx.fillText(name, x, currentY);
    currentY += 14;

    ctx.fillStyle = '#AAA';
    ctx.font = '10px monospace';
    const behaviorText = this.formatBehavior(behavior);
    ctx.fillText(behaviorText, x, currentY);
    currentY += 12;

    // Line 2: Health, Hunger, Energy bars
    if (needs) {
      const barWidth = (width - 20) / 3;
      const barHeight = 8;
      const barY = currentY;

      // Health bar
      this.renderNeedBar(ctx, x, barY, barWidth, barHeight, needs.health, 'Health');

      // Hunger bar (inverted - low hunger is bad)
      this.renderNeedBar(
        ctx,
        x + barWidth + 5,
        barY,
        barWidth,
        barHeight,
        1 - needs.hunger,
        'Hunger'
      );

      // Energy bar
      this.renderNeedBar(
        ctx,
        x + (barWidth + 5) * 2,
        barY,
        barWidth,
        barHeight,
        needs.energy,
        'Energy'
      );

      currentY += barHeight + 10;
    }

    // Line 3: Mood and Position
    let line3 = '';
    if (mood) {
      line3 += `Mood: ${mood.emotionalState}`;
    }
    if (position) {
      if (line3) line3 += ' | ';
      line3 += `Pos: (${Math.floor(position.x)}, ${Math.floor(position.y)})`;
    }
    if (skills) {
      const topSkill = this.getTopSkill(skills);
      if (topSkill && line3) line3 += ' | ';
      if (topSkill) line3 += `${topSkill}`;
    }

    ctx.fillStyle = '#888';
    ctx.font = '9px monospace';
    ctx.fillText(line3, x, currentY);
  }

  /**
   * Render a colored bar for a need (0.0 - 1.0)
   */
  private renderNeedBar(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number,
    value: number,
    label: string
  ): void {
    // Background
    ctx.fillStyle = '#222';
    ctx.fillRect(x, y, width, height);

    // Value bar (color-coded)
    const fillWidth = width * Math.max(0, Math.min(1, value));
    let color = '#00FF00'; // Green (good)
    if (value < 0.3) {
      color = '#FF0000'; // Red (critical)
    } else if (value < 0.6) {
      color = '#FF8C00'; // Orange (warning)
    } else if (value < 0.8) {
      color = '#FFFF00'; // Yellow (ok)
    }

    ctx.fillStyle = color;
    ctx.fillRect(x, y, fillWidth, height);

    // Border
    ctx.strokeStyle = '#555';
    ctx.lineWidth = 1;
    ctx.strokeRect(x, y, width, height);

    // Label
    ctx.fillStyle = '#CCC';
    ctx.font = '7px monospace';
    const labelText = `${label[0]}${label[1]}`; // First two letters
    ctx.fillText(labelText, x + 2, y - 1);
  }

  /**
   * Format behavior for display
   */
  private formatBehavior(behavior: string): string {
    // Convert snake_case to Title Case
    return behavior
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  /**
   * Get the agent's highest skill
   */
  private getTopSkill(skills: SkillsComponent): string | null {
    const skillLevels = skills.levels;
    let topSkill: string | null = null;
    let topLevel = 0;

    for (const [skill, level] of Object.entries(skillLevels)) {
      const levelNum = level as number;
      if (levelNum > topLevel) {
        topLevel = levelNum;
        topSkill = skill;
      }
    }

    if (topSkill && topLevel > 0) {
      return `${topSkill.charAt(0).toUpperCase()}${topSkill.slice(1)}:${topLevel}`;
    }

    return null;
  }

  /**
   * Sort agents based on current sort mode
   */
  private sortAgents(agents: readonly Entity[]): Entity[] {
    const sorted = [...agents];

    sorted.sort((a, b) => {
      switch (this.sortBy) {
        case 'name': {
          const nameA = (a.components.get('identity') as IdentityComponent | undefined)?.name ?? '';
          const nameB = (b.components.get('identity') as IdentityComponent | undefined)?.name ?? '';
          return nameA.localeCompare(nameB);
        }

        case 'behavior': {
          const behaviorA = (a.components.get('agent') as AgentComponent | undefined)?.behavior ?? '';
          const behaviorB = (b.components.get('agent') as AgentComponent | undefined)?.behavior ?? '';
          return behaviorA.localeCompare(behaviorB);
        }

        case 'health': {
          const healthA = (a.components.get('needs') as NeedsComponent | undefined)?.health ?? 0;
          const healthB = (b.components.get('needs') as NeedsComponent | undefined)?.health ?? 0;
          return healthB - healthA; // Descending (highest first)
        }

        case 'hunger': {
          const hungerA = (a.components.get('needs') as NeedsComponent | undefined)?.hunger ?? 1;
          const hungerB = (b.components.get('needs') as NeedsComponent | undefined)?.hunger ?? 1;
          return hungerA - hungerB; // Ascending (most hungry first)
        }

        default:
          return 0;
      }
    });

    return sorted;
  }

  /**
   * Handle clicks on sort buttons or agent rows
   */
  handleContentClick(x: number, y: number, _width: number, height: number, world?: World): boolean {
    if (!this.visible || !world) {
      return false;
    }

    const agents = world.query().with('agent', 'identity').executeEntities();
    if (agents.length === 0) {
      return false;
    }

    // Check sort button clicks
    const sortButtonY = this.padding + 18;
    if (y >= sortButtonY && y <= sortButtonY + 16) {
      const sortOptions: Array<'name' | 'behavior' | 'health' | 'hunger'> = ['name', 'behavior', 'health', 'hunger'];
      const buttonWidth = 70;

      for (let i = 0; i < sortOptions.length; i++) {
        const btnX = this.padding + (i * buttonWidth);
        if (x >= btnX && x <= btnX + buttonWidth) {
          const selectedSort = sortOptions[i];
          if (selectedSort) {
            this.sortBy = selectedSort;
            return true;
          }
        }
      }
    }

    // Check agent row clicks
    const listStartY = this.padding + 18 + 16 + 8 + 8;
    const visibleAreaHeight = height - listStartY;
    const maxVisibleAgents = Math.floor(visibleAreaHeight / this.rowHeight);
    const startIdx = Math.floor(this.scrollOffset);
    const sortedAgents = this.sortAgents(agents);

    for (let i = startIdx; i < Math.min(startIdx + maxVisibleAgents, sortedAgents.length); i++) {
      const rowY = listStartY + ((i - startIdx) * this.rowHeight);
      if (y >= rowY && y <= rowY + this.rowHeight) {
        const agent = sortedAgents[i];
        if (agent) {
          this.selectedAgentId = agent.id;
          return true;
        }
      }
    }

    return false;
  }

  /**
   * Handle scroll events for the agent list
   */
  handleScroll(deltaY: number, contentHeight: number): boolean {
    if (!this.visible) {
      return false;
    }

    // Estimate max scroll based on content height
    const maxVisibleAgents = Math.floor(contentHeight / this.rowHeight);
    const maxScroll = Math.max(0, 20 - maxVisibleAgents); // Assume max 20 agents for scrolling

    this.scrollOffset = Math.max(0, Math.min(maxScroll, this.scrollOffset + deltaY * 0.1));
    return true;
  }
}
