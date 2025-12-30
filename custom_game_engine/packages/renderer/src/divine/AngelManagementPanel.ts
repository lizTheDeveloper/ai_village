/**
 * AngelManagementPanel - "The Heavenly Host"
 *
 * Manages divine angels that can autonomously handle prayers.
 * Features:
 * - Angel roster with status indicators
 * - Angel details (level, abilities, performance)
 * - Create new angels
 * - Assign/unassign agents
 * - Configure autonomy settings
 *
 * See: specs/divine-systems-ui.md
 */

import type { IWindowPanel } from '../IWindowPanel.js';
import {
  Angel,
  AngelType,
  AngelDomain,
  AngelStyle,
  AngelAutonomy,
  AngelStatus,
  AngelCreationDraft,
  DivineEnergy,
  DIVINE_COLORS,
  ANGEL_STATUS_ICONS,
  getAngelCreationCost,
} from './DivineUITypes.js';

export interface AngelManagementCallbacks {
  onSelectAngel: (angelId: string | null) => void;
  onCreateAngel: (draft: AngelCreationDraft) => void;
  onToggleAngelRest: (angelId: string) => void;
  onSetAngelAutonomy: (angelId: string, autonomy: AngelAutonomy) => void;
  onToggleAbility: (angelId: string, abilityId: string) => void;
  onAssignAgent: (angelId: string, agentId: string) => void;
  onUnassignAgent: (angelId: string, agentId: string) => void;
  onOpenCreationWizard: () => void;
  onCloseCreationWizard: () => void;
}

export interface AngelManagementState {
  angels: Angel[];
  selectedAngelId: string | null;
  energy: DivineEnergy;
  wizardOpen: boolean;
  wizardStep: number;
  wizardDraft: AngelCreationDraft | null;
  availableAgentsToAssign: Array<{ id: string; name: string }>;
}

export class AngelManagementPanel implements IWindowPanel {
  private visible: boolean = false;
  private state: AngelManagementState;
  private callbacks: AngelManagementCallbacks;

  private scrollOffset: number = 0;
  private readonly lineHeight: number = 64;
  private readonly padding: number = 10;
  private readonly listWidth: number = 200;

  constructor(
    initialState: AngelManagementState,
    callbacks: AngelManagementCallbacks
  ) {
    this.state = initialState;
    this.callbacks = callbacks;
  }

  // ============================================================================
  // IWindowPanel Implementation
  // ============================================================================

  getId(): string {
    return 'divine-angels';
  }

  getTitle(): string {
    const activeCount = this.state.angels.filter(a => a.status === 'working').length;
    return `\u{1F47C} Heavenly Host (${activeCount}/${this.state.angels.length})`;
  }

  getDefaultWidth(): number {
    return 600;
  }

  getDefaultHeight(): number {
    return 450;
  }

  isVisible(): boolean {
    return this.visible;
  }

  setVisible(visible: boolean): void {
    this.visible = visible;
  }

  // ============================================================================
  // State Management
  // ============================================================================

  updateState(newState: Partial<AngelManagementState>): void {
    this.state = { ...this.state, ...newState };
  }

  getState(): AngelManagementState {
    return this.state;
  }

  // ============================================================================
  // Rendering
  // ============================================================================

  render(
    ctx: CanvasRenderingContext2D,
    _x: number,
    _y: number,
    width: number,
    height: number,
    _world?: unknown
  ): void {
    ctx.save();

    if (this.state.wizardOpen) {
      this.renderCreationWizard(ctx, 0, 0, width, height);
    } else {
      // Header with energy and create button
      const headerHeight = this.renderHeaderBar(ctx, width);

      // Main content area
      const contentY = headerHeight;
      const contentHeight = height - headerHeight;

      // Left panel: Angel list
      this.renderAngelList(ctx, 0, contentY, this.listWidth, contentHeight);

      // Divider
      ctx.strokeStyle = '#444444';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(this.listWidth, contentY);
      ctx.lineTo(this.listWidth, height);
      ctx.stroke();

      // Right panel: Angel details
      const detailsX = this.listWidth + 1;
      const detailsWidth = width - this.listWidth - 1;
      this.renderAngelDetails(ctx, detailsX, contentY, detailsWidth, contentHeight);
    }

    ctx.restore();
  }

  /**
   * Render header with energy status and create button
   */
  private renderHeaderBar(ctx: CanvasRenderingContext2D, width: number): number {
    const headerHeight = 36;

    // Background
    ctx.fillStyle = 'rgba(40, 40, 60, 0.9)';
    ctx.fillRect(0, 0, width, headerHeight);

    // Divine energy display
    let x = this.padding;
    ctx.font = '12px "Segoe UI", sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = DIVINE_COLORS.primary;
    ctx.fillText('\u26A1 Divine Energy:', x, headerHeight / 2);
    x += 100;

    // Energy bar
    const barWidth = 100;
    const barHeight = 12;
    const barY = headerHeight / 2 - barHeight / 2;
    const fillPercent = this.state.energy.current / this.state.energy.max;

    ctx.fillStyle = '#333333';
    ctx.fillRect(x, barY, barWidth, barHeight);

    ctx.fillStyle = fillPercent > 0.3 ? DIVINE_COLORS.primary : DIVINE_COLORS.critical;
    ctx.fillRect(x, barY, barWidth * fillPercent, barHeight);

    ctx.strokeStyle = '#555555';
    ctx.lineWidth = 1;
    ctx.strokeRect(x, barY, barWidth, barHeight);

    x += barWidth + 8;
    ctx.fillStyle = '#AAAAAA';
    ctx.fillText(`${Math.floor(this.state.energy.current)}/${this.state.energy.max}`, x, headerHeight / 2);
    x += 50;

    // Net energy flow
    const net = this.state.energy.regenRate - this.state.energy.consumption;
    const netText = net >= 0 ? `+${net.toFixed(1)}` : net.toFixed(1);
    ctx.fillStyle = net >= 0 ? '#90EE90' : '#FF6B6B';
    ctx.font = '10px "Segoe UI", sans-serif';
    ctx.fillText(`(${netText}/min)`, x, headerHeight / 2);

    // Create Angel button (right side)
    const buttonWidth = 120;
    const buttonHeight = 24;
    const buttonX = width - buttonWidth - this.padding;
    const buttonY = (headerHeight - buttonHeight) / 2;

    const lowestCost = getAngelCreationCost('watcher');
    const canAfford = this.state.energy.current >= lowestCost;

    ctx.fillStyle = canAfford ? 'rgba(255, 215, 0, 0.2)' : 'rgba(100, 100, 100, 0.2)';
    this.roundRect(ctx, buttonX, buttonY, buttonWidth, buttonHeight, 4);
    ctx.fill();

    ctx.strokeStyle = canAfford ? DIVINE_COLORS.primary : '#666666';
    ctx.lineWidth = 1;
    this.roundRect(ctx, buttonX, buttonY, buttonWidth, buttonHeight, 4);
    ctx.stroke();

    ctx.font = '11px "Segoe UI", sans-serif';
    ctx.fillStyle = canAfford ? DIVINE_COLORS.primary : '#888888';
    ctx.textAlign = 'center';
    ctx.fillText(`+ Create Angel (\u26A1${lowestCost}+)`, buttonX + buttonWidth / 2, headerHeight / 2);

    // Bottom border
    ctx.strokeStyle = '#333333';
    ctx.beginPath();
    ctx.moveTo(0, headerHeight);
    ctx.lineTo(width, headerHeight);
    ctx.stroke();

    return headerHeight;
  }

  /**
   * Render the angel list on the left
   */
  private renderAngelList(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number
  ): void {
    ctx.save();

    // Clip to list area
    ctx.beginPath();
    ctx.rect(x, y, width, height);
    ctx.clip();

    if (this.state.angels.length === 0) {
      ctx.font = '12px "Segoe UI", sans-serif';
      ctx.fillStyle = '#666666';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('No angels created', x + width / 2, y + height / 2 - 10);
      ctx.fillText('Click "Create Angel"', x + width / 2, y + height / 2 + 10);
      ctx.restore();
      return;
    }

    // Calculate visible range
    const visibleCount = Math.ceil(height / this.lineHeight) + 1;
    const startIndex = Math.floor(this.scrollOffset / this.lineHeight);
    const endIndex = Math.min(startIndex + visibleCount, this.state.angels.length);

    // Render visible angels
    for (let i = startIndex; i < endIndex; i++) {
      const angel = this.state.angels[i];
      if (!angel) continue;

      const itemY = y + (i * this.lineHeight) - this.scrollOffset;
      this.renderAngelCard(ctx, x, itemY, width, this.lineHeight, angel);
    }

    ctx.restore();
  }

  /**
   * Render a single angel card in the list
   */
  private renderAngelCard(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number,
    angel: Angel
  ): void {
    const isSelected = angel.id === this.state.selectedAngelId;

    // Background
    ctx.fillStyle = isSelected ? 'rgba(230, 230, 250, 0.15)' : 'transparent';
    ctx.fillRect(x, y, width, height);

    // Status indicator (left edge)
    const statusColor = this.getStatusColor(angel.status);
    ctx.fillStyle = statusColor;
    ctx.fillRect(x, y, 3, height);

    // Content
    const contentX = x + this.padding;
    let contentY = y + 8;

    // Name and status icon
    ctx.font = 'bold 12px "Segoe UI", sans-serif';
    ctx.fillStyle = '#FFFFFF';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';

    const statusIcon = ANGEL_STATUS_ICONS[angel.status];
    ctx.fillText(`${statusIcon} ${angel.name}`, contentX, contentY);
    contentY += 16;

    // Type and domain
    ctx.font = '10px "Segoe UI", sans-serif';
    ctx.fillStyle = '#AAAAAA';
    ctx.fillText(`${this.formatAngelType(angel.type)} - ${this.formatDomain(angel.domain)}`, contentX, contentY);
    contentY += 14;

    // Level and energy bar
    ctx.fillText(`Lv.${angel.level}`, contentX, contentY);

    const energyBarX = contentX + 30;
    const energyBarWidth = width - 55;
    const energyBarHeight = 6;
    const energyFill = angel.energy / angel.maxEnergy;

    ctx.fillStyle = '#333333';
    ctx.fillRect(energyBarX, contentY + 2, energyBarWidth, energyBarHeight);

    ctx.fillStyle = energyFill > 0.3 ? DIVINE_COLORS.secondary : DIVINE_COLORS.critical;
    ctx.fillRect(energyBarX, contentY + 2, energyBarWidth * energyFill, energyBarHeight);

    // Assigned count
    contentY += 14;
    ctx.fillStyle = '#888888';
    ctx.font = '9px "Segoe UI", sans-serif';
    ctx.fillText(`${angel.assignedAgentIds.length}/${angel.maxAssignedAgents} assigned`, contentX, contentY);

    // Bottom border
    ctx.strokeStyle = '#333333';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x, y + height);
    ctx.lineTo(x + width, y + height);
    ctx.stroke();
  }

  /**
   * Render angel details on the right
   */
  private renderAngelDetails(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number
  ): void {
    if (!this.state.selectedAngelId) {
      ctx.font = '14px "Segoe UI", sans-serif';
      ctx.fillStyle = '#666666';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('Select an angel to view details', x + width / 2, y + height / 2);
      return;
    }

    const angel = this.state.angels.find(a => a.id === this.state.selectedAngelId);
    if (!angel) return;

    let currentY = y + this.padding;
    const contentX = x + this.padding;
    const contentWidth = width - this.padding * 2;

    // Angel name and type
    ctx.font = 'bold 16px "Segoe UI", sans-serif';
    ctx.fillStyle = DIVINE_COLORS.secondary;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(`${ANGEL_STATUS_ICONS[angel.status]} ${angel.name}`, contentX, currentY);
    currentY += 22;

    ctx.font = '12px "Segoe UI", sans-serif';
    ctx.fillStyle = '#AAAAAA';
    ctx.fillText(`${this.formatAngelType(angel.type)} of ${this.formatDomain(angel.domain)}`, contentX, currentY);
    currentY += 20;

    // Divider
    this.renderDivider(ctx, contentX, currentY, contentWidth);
    currentY += 10;

    // Level and XP section
    ctx.font = 'bold 11px "Segoe UI", sans-serif';
    ctx.fillStyle = '#CCCCCC';
    ctx.fillText('Progression', contentX, currentY);
    currentY += 16;

    ctx.font = '11px "Segoe UI", sans-serif';
    ctx.fillStyle = '#AAAAAA';
    ctx.fillText(`Level ${angel.level}`, contentX, currentY);

    // XP bar
    const xpBarX = contentX + 50;
    const xpBarWidth = 120;
    const xpFill = angel.xp / angel.xpToNextLevel;
    this.renderProgressBar(ctx, xpBarX, currentY - 2, xpBarWidth, 12, xpFill, DIVINE_COLORS.primary);

    ctx.fillStyle = '#888888';
    ctx.font = '10px "Segoe UI", sans-serif';
    ctx.fillText(`${angel.xp}/${angel.xpToNextLevel} XP`, xpBarX + xpBarWidth + 8, currentY);
    currentY += 20;

    // Energy section
    ctx.font = '11px "Segoe UI", sans-serif';
    ctx.fillStyle = '#AAAAAA';
    ctx.fillText('Energy:', contentX, currentY);

    const angelEnergyBarX = contentX + 50;
    const angelEnergyFill = angel.energy / angel.maxEnergy;
    this.renderProgressBar(ctx, angelEnergyBarX, currentY - 2, xpBarWidth, 12, angelEnergyFill,
      angelEnergyFill > 0.3 ? DIVINE_COLORS.secondary : DIVINE_COLORS.critical);

    ctx.fillStyle = '#888888';
    ctx.font = '10px "Segoe UI", sans-serif';
    ctx.fillText(`${Math.floor(angel.energy)}/${angel.maxEnergy} (-${angel.energyConsumption}/min)`,
      angelEnergyBarX + xpBarWidth + 8, currentY);
    currentY += 25;

    // Divider
    this.renderDivider(ctx, contentX, currentY, contentWidth);
    currentY += 10;

    // Performance stats
    ctx.font = 'bold 11px "Segoe UI", sans-serif';
    ctx.fillStyle = '#CCCCCC';
    ctx.fillText('Performance', contentX, currentY);
    currentY += 16;

    const stats = [
      { label: 'Success Rate', value: angel.successRate, suffix: '%' },
      { label: 'Satisfaction', value: angel.satisfaction, suffix: '%' },
      { label: 'Efficiency', value: angel.efficiency, suffix: '%' },
      { label: 'Prayers Handled', value: angel.prayersHandled, suffix: '' },
    ];

    ctx.font = '10px "Segoe UI", sans-serif';
    const colWidth = contentWidth / 2;
    for (let i = 0; i < stats.length; i++) {
      const stat = stats[i];
      if (!stat) continue;
      const col = i % 2;
      const row = Math.floor(i / 2);
      const statX = contentX + col * colWidth;
      const statY = currentY + row * 14;

      ctx.fillStyle = '#888888';
      ctx.fillText(stat.label + ':', statX, statY);

      let color = '#90EE90';
      if (stat.suffix === '%') {
        if (stat.value < 50) color = DIVINE_COLORS.critical;
        else if (stat.value < 75) color = DIVINE_COLORS.warning;
      }
      ctx.fillStyle = color;
      ctx.fillText(`${stat.value}${stat.suffix}`, statX + 80, statY);
    }
    currentY += 35;

    // Divider
    this.renderDivider(ctx, contentX, currentY, contentWidth);
    currentY += 10;

    // Assigned agents
    ctx.font = 'bold 11px "Segoe UI", sans-serif';
    ctx.fillStyle = '#CCCCCC';
    ctx.fillText(`Assigned Agents (${angel.assignedAgentIds.length}/${angel.maxAssignedAgents})`, contentX, currentY);
    currentY += 16;

    if (angel.assignedAgentIds.length === 0) {
      ctx.font = '10px "Segoe UI", sans-serif';
      ctx.fillStyle = '#666666';
      ctx.fillText('No agents assigned', contentX, currentY);
    } else {
      ctx.font = '10px "Segoe UI", sans-serif';
      ctx.fillStyle = '#AAAAAA';
      // Show first few assigned agent IDs (truncated)
      const displayIds = angel.assignedAgentIds.slice(0, 3);
      ctx.fillText(displayIds.join(', ') + (angel.assignedAgentIds.length > 3 ? '...' : ''), contentX, currentY);
    }
    currentY += 20;

    // Divider
    this.renderDivider(ctx, contentX, currentY, contentWidth);
    currentY += 10;

    // Abilities section
    ctx.font = 'bold 11px "Segoe UI", sans-serif';
    ctx.fillStyle = '#CCCCCC';
    ctx.fillText('Abilities', contentX, currentY);
    currentY += 16;

    if (angel.abilities.length === 0) {
      ctx.font = '10px "Segoe UI", sans-serif';
      ctx.fillStyle = '#666666';
      ctx.fillText('No abilities unlocked yet', contentX, currentY);
    } else {
      for (const ability of angel.abilities.slice(0, 3)) {
        ctx.font = '10px "Segoe UI", sans-serif';
        const abilityColor = ability.enabled ? '#90EE90' : '#888888';
        ctx.fillStyle = abilityColor;
        ctx.fillText(`${ability.enabled ? '\u2713' : '\u2717'} ${ability.name}`, contentX, currentY);
        currentY += 12;
      }
    }
    currentY += 10;

    // Divider
    this.renderDivider(ctx, contentX, currentY, contentWidth);
    currentY += 10;

    // Autonomy and style settings
    ctx.font = 'bold 11px "Segoe UI", sans-serif';
    ctx.fillStyle = '#CCCCCC';
    ctx.fillText('Configuration', contentX, currentY);
    currentY += 16;

    ctx.font = '10px "Segoe UI", sans-serif';
    ctx.fillStyle = '#AAAAAA';
    ctx.fillText(`Style: ${this.formatStyle(angel.style)}`, contentX, currentY);
    ctx.fillText(`Autonomy: ${this.formatAutonomy(angel.autonomy)}`, contentX + 120, currentY);
    currentY += 14;

    if (angel.corruption > 0) {
      ctx.fillStyle = angel.corruption > 50 ? DIVINE_COLORS.critical : DIVINE_COLORS.warning;
      ctx.fillText(`Corruption: ${angel.corruption}%`, contentX, currentY);
    }
    currentY += 20;

    // Action buttons at bottom
    const buttonWidth = (contentWidth - 12) / 2;
    const buttonHeight = 28;
    const buttonY = y + height - buttonHeight - this.padding;

    // Rest/Wake button
    const isResting = angel.status === 'resting';
    this.renderButton(ctx, contentX, buttonY, buttonWidth, buttonHeight,
      isResting ? '\u{25B6} Wake' : '\u{1F4A4} Rest',
      '', DIVINE_COLORS.secondary);

    // Unassign all button
    const hasAssigned = angel.assignedAgentIds.length > 0;
    this.renderButton(ctx, contentX + buttonWidth + 12, buttonY, buttonWidth, buttonHeight,
      '\u{1F517} Unassign All',
      '', hasAssigned ? DIVINE_COLORS.accent : '#555555');
  }

  /**
   * Render the angel creation wizard
   */
  private renderCreationWizard(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number
  ): void {
    // Background
    ctx.fillStyle = 'rgba(20, 20, 40, 0.95)';
    ctx.fillRect(x, y, width, height);

    // Title
    ctx.font = 'bold 16px "Segoe UI", sans-serif';
    ctx.fillStyle = DIVINE_COLORS.primary;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText('\u{1F47C} Create New Angel', x + width / 2, y + 15);

    // Step indicator
    const steps = ['Type', 'Domain', 'Style', 'Confirm'];
    const stepY = y + 45;
    const stepWidth = width / steps.length;

    for (let i = 0; i < steps.length; i++) {
      const stepX = x + stepWidth * i + stepWidth / 2;
      const isActive = i === this.state.wizardStep;
      const isPast = i < this.state.wizardStep;

      // Circle
      ctx.beginPath();
      ctx.arc(stepX, stepY, 12, 0, Math.PI * 2);
      ctx.fillStyle = isActive ? DIVINE_COLORS.primary : (isPast ? '#666666' : '#333333');
      ctx.fill();

      // Number
      ctx.font = 'bold 10px "Segoe UI", sans-serif';
      ctx.fillStyle = isActive ? '#000000' : '#FFFFFF';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(`${i + 1}`, stepX, stepY);

      // Label
      ctx.font = '10px "Segoe UI", sans-serif';
      ctx.fillStyle = isActive ? DIVINE_COLORS.primary : '#888888';
      ctx.fillText(steps[i] ?? '', stepX, stepY + 22);
    }

    // Content area
    const contentY = stepY + 50;
    const contentHeight = height - contentY - 60;
    const contentX = x + this.padding * 2;
    const contentWidth = width - this.padding * 4;

    // Render current step
    switch (this.state.wizardStep) {
      case 0:
        this.renderWizardTypeStep(ctx, contentX, contentY, contentWidth, contentHeight);
        break;
      case 1:
        this.renderWizardDomainStep(ctx, contentX, contentY, contentWidth, contentHeight);
        break;
      case 2:
        this.renderWizardStyleStep(ctx, contentX, contentY, contentWidth, contentHeight);
        break;
      case 3:
        this.renderWizardConfirmStep(ctx, contentX, contentY, contentWidth, contentHeight);
        break;
    }

    // Cancel button
    const cancelWidth = 80;
    const cancelHeight = 28;
    const cancelX = x + this.padding;
    const cancelY = y + height - cancelHeight - this.padding;

    this.renderButton(ctx, cancelX, cancelY, cancelWidth, cancelHeight, 'Cancel', '', '#888888');
  }

  /**
   * Render wizard step 1: Angel Type selection
   */
  private renderWizardTypeStep(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    _height: number
  ): void {
    ctx.font = '12px "Segoe UI", sans-serif';
    ctx.fillStyle = '#CCCCCC';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText('Choose an angel type:', x, y);

    const types: Array<{ type: AngelType; desc: string; cost: number }> = [
      { type: 'watcher', desc: 'Observes and reports, low energy', cost: getAngelCreationCost('watcher') },
      { type: 'messenger', desc: 'Delivers visions efficiently', cost: getAngelCreationCost('messenger') },
      { type: 'guardian', desc: 'Protects assigned agents', cost: getAngelCreationCost('guardian') },
      { type: 'specialist', desc: 'Excels in one domain', cost: getAngelCreationCost('specialist') },
      { type: 'archangel', desc: 'Powerful, leads other angels', cost: getAngelCreationCost('archangel') },
    ];

    const buttonWidth = width;
    const buttonHeight = 40;
    let currentY = y + 25;

    for (const item of types) {
      const canAfford = this.state.energy.current >= item.cost;
      const isSelected = this.state.wizardDraft?.type === item.type;

      ctx.fillStyle = isSelected ? 'rgba(255, 215, 0, 0.2)' : 'rgba(60, 60, 80, 0.5)';
      this.roundRect(ctx, x, currentY, buttonWidth, buttonHeight, 6);
      ctx.fill();

      ctx.strokeStyle = isSelected ? DIVINE_COLORS.primary : (canAfford ? '#555555' : '#333333');
      ctx.lineWidth = isSelected ? 2 : 1;
      this.roundRect(ctx, x, currentY, buttonWidth, buttonHeight, 6);
      ctx.stroke();

      ctx.font = 'bold 12px "Segoe UI", sans-serif';
      ctx.fillStyle = canAfford ? '#FFFFFF' : '#666666';
      ctx.textAlign = 'left';
      ctx.fillText(this.formatAngelType(item.type), x + 10, currentY + 8);

      ctx.font = '10px "Segoe UI", sans-serif';
      ctx.fillStyle = '#888888';
      ctx.fillText(item.desc, x + 10, currentY + 24);

      ctx.textAlign = 'right';
      ctx.fillStyle = canAfford ? DIVINE_COLORS.primary : '#555555';
      ctx.fillText(`\u26A1 ${item.cost}`, x + buttonWidth - 10, currentY + 15);

      currentY += buttonHeight + 8;
    }
  }

  /**
   * Render wizard step 2: Domain selection
   */
  private renderWizardDomainStep(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    _height: number
  ): void {
    ctx.font = '12px "Segoe UI", sans-serif';
    ctx.fillStyle = '#CCCCCC';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText('Choose a domain specialization:', x, y);

    const domains: Array<{ domain: AngelDomain; desc: string }> = [
      { domain: 'survival', desc: 'Food, water, shelter needs' },
      { domain: 'healing', desc: 'Injuries and illness' },
      { domain: 'social', desc: 'Relationships and conflicts' },
      { domain: 'environment', desc: 'Weather and natural events' },
      { domain: 'agriculture', desc: 'Farming and harvests' },
      { domain: 'spiritual', desc: 'Faith and enlightenment' },
    ];

    const buttonWidth = (width - 10) / 2;
    const buttonHeight = 50;
    let currentY = y + 25;

    for (let i = 0; i < domains.length; i += 2) {
      for (let j = 0; j < 2; j++) {
        const item = domains[i + j];
        if (!item) continue;

        const buttonX = x + j * (buttonWidth + 10);
        const isSelected = this.state.wizardDraft?.domain === item.domain;

        ctx.fillStyle = isSelected ? 'rgba(255, 215, 0, 0.2)' : 'rgba(60, 60, 80, 0.5)';
        this.roundRect(ctx, buttonX, currentY, buttonWidth, buttonHeight, 6);
        ctx.fill();

        ctx.strokeStyle = isSelected ? DIVINE_COLORS.primary : '#555555';
        ctx.lineWidth = isSelected ? 2 : 1;
        this.roundRect(ctx, buttonX, currentY, buttonWidth, buttonHeight, 6);
        ctx.stroke();

        ctx.font = 'bold 11px "Segoe UI", sans-serif';
        ctx.fillStyle = '#FFFFFF';
        ctx.textAlign = 'center';
        ctx.fillText(this.formatDomain(item.domain), buttonX + buttonWidth / 2, currentY + 12);

        ctx.font = '9px "Segoe UI", sans-serif';
        ctx.fillStyle = '#888888';
        ctx.fillText(item.desc, buttonX + buttonWidth / 2, currentY + 30);
      }
      currentY += buttonHeight + 8;
    }
  }

  /**
   * Render wizard step 3: Style and autonomy
   */
  private renderWizardStyleStep(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    _height: number
  ): void {
    let currentY = y;

    // Style section
    ctx.font = '12px "Segoe UI", sans-serif';
    ctx.fillStyle = '#CCCCCC';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText('Communication style:', x, currentY);
    currentY += 20;

    const styles: Array<{ style: AngelStyle; desc: string }> = [
      { style: 'gentle', desc: 'Kind and nurturing' },
      { style: 'stern', desc: 'Firm but fair' },
      { style: 'cryptic', desc: 'Mysterious messages' },
      { style: 'direct', desc: 'Clear and simple' },
    ];

    const styleWidth = (width - 15) / 2;
    const styleHeight = 36;

    for (let i = 0; i < styles.length; i += 2) {
      for (let j = 0; j < 2; j++) {
        const item = styles[i + j];
        if (!item) continue;

        const buttonX = x + j * (styleWidth + 15);
        const isSelected = this.state.wizardDraft?.style === item.style;

        ctx.fillStyle = isSelected ? 'rgba(255, 215, 0, 0.2)' : 'rgba(60, 60, 80, 0.5)';
        this.roundRect(ctx, buttonX, currentY, styleWidth, styleHeight, 4);
        ctx.fill();

        ctx.strokeStyle = isSelected ? DIVINE_COLORS.primary : '#555555';
        ctx.lineWidth = 1;
        this.roundRect(ctx, buttonX, currentY, styleWidth, styleHeight, 4);
        ctx.stroke();

        ctx.font = 'bold 11px "Segoe UI", sans-serif';
        ctx.fillStyle = '#FFFFFF';
        ctx.textAlign = 'center';
        ctx.fillText(this.formatStyle(item.style), buttonX + styleWidth / 2, currentY + 8);

        ctx.font = '9px "Segoe UI", sans-serif';
        ctx.fillStyle = '#888888';
        ctx.fillText(item.desc, buttonX + styleWidth / 2, currentY + 22);
      }
      currentY += styleHeight + 6;
    }

    currentY += 15;

    // Autonomy section
    ctx.font = '12px "Segoe UI", sans-serif';
    ctx.fillStyle = '#CCCCCC';
    ctx.textAlign = 'left';
    ctx.fillText('Autonomy level:', x, currentY);
    currentY += 20;

    const autonomies: Array<{ autonomy: AngelAutonomy; desc: string }> = [
      { autonomy: 'supervised', desc: 'Requires approval for all actions' },
      { autonomy: 'semi_autonomous', desc: 'Handles routine, asks for major' },
      { autonomy: 'fully_autonomous', desc: 'Acts independently' },
    ];

    const autoHeight = 44;

    for (const item of autonomies) {
      const isSelected = this.state.wizardDraft?.autonomy === item.autonomy;

      ctx.fillStyle = isSelected ? 'rgba(255, 215, 0, 0.2)' : 'rgba(60, 60, 80, 0.5)';
      this.roundRect(ctx, x, currentY, width, autoHeight, 4);
      ctx.fill();

      ctx.strokeStyle = isSelected ? DIVINE_COLORS.primary : '#555555';
      ctx.lineWidth = 1;
      this.roundRect(ctx, x, currentY, width, autoHeight, 4);
      ctx.stroke();

      ctx.font = 'bold 11px "Segoe UI", sans-serif';
      ctx.fillStyle = '#FFFFFF';
      ctx.textAlign = 'left';
      ctx.fillText(this.formatAutonomy(item.autonomy), x + 10, currentY + 10);

      ctx.font = '9px "Segoe UI", sans-serif';
      ctx.fillStyle = '#888888';
      ctx.fillText(item.desc, x + 10, currentY + 26);

      currentY += autoHeight + 6;
    }
  }

  /**
   * Render wizard step 4: Confirmation
   */
  private renderWizardConfirmStep(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    _height: number
  ): void {
    if (!this.state.wizardDraft) return;

    const draft = this.state.wizardDraft;
    const cost = getAngelCreationCost(draft.type);
    const canAfford = this.state.energy.current >= cost;

    ctx.font = 'bold 14px "Segoe UI", sans-serif';
    ctx.fillStyle = DIVINE_COLORS.secondary;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText('Confirm Your Angel', x + width / 2, y);

    let currentY = y + 35;

    // Summary box
    ctx.fillStyle = 'rgba(60, 60, 80, 0.5)';
    this.roundRect(ctx, x, currentY, width, 120, 8);
    ctx.fill();

    ctx.strokeStyle = DIVINE_COLORS.primary;
    ctx.lineWidth = 1;
    this.roundRect(ctx, x, currentY, width, 120, 8);
    ctx.stroke();

    currentY += 15;
    ctx.textAlign = 'left';

    const fields = [
      { label: 'Name', value: draft.name || 'Unnamed Angel' },
      { label: 'Type', value: this.formatAngelType(draft.type) },
      { label: 'Domain', value: this.formatDomain(draft.domain) },
      { label: 'Style', value: this.formatStyle(draft.style) },
      { label: 'Autonomy', value: this.formatAutonomy(draft.autonomy) },
    ];

    for (const field of fields) {
      ctx.font = '11px "Segoe UI", sans-serif';
      ctx.fillStyle = '#888888';
      ctx.fillText(field.label + ':', x + 15, currentY);

      ctx.fillStyle = '#FFFFFF';
      ctx.fillText(field.value, x + 100, currentY);

      currentY += 18;
    }

    currentY += 20;

    // Cost display
    ctx.font = 'bold 14px "Segoe UI", sans-serif';
    ctx.fillStyle = canAfford ? DIVINE_COLORS.primary : DIVINE_COLORS.critical;
    ctx.textAlign = 'center';
    ctx.fillText(`Cost: \u26A1 ${cost}`, x + width / 2, currentY);

    if (!canAfford) {
      currentY += 20;
      ctx.font = '11px "Segoe UI", sans-serif';
      ctx.fillStyle = DIVINE_COLORS.critical;
      ctx.fillText('Insufficient divine energy!', x + width / 2, currentY);
    }

    // Create button
    currentY += 30;
    const buttonWidth = 150;
    const buttonHeight = 36;
    const buttonX = x + (width - buttonWidth) / 2;

    ctx.fillStyle = canAfford ? 'rgba(255, 215, 0, 0.3)' : 'rgba(100, 100, 100, 0.3)';
    this.roundRect(ctx, buttonX, currentY, buttonWidth, buttonHeight, 6);
    ctx.fill();

    ctx.strokeStyle = canAfford ? DIVINE_COLORS.primary : '#555555';
    ctx.lineWidth = 2;
    this.roundRect(ctx, buttonX, currentY, buttonWidth, buttonHeight, 6);
    ctx.stroke();

    ctx.font = 'bold 13px "Segoe UI", sans-serif';
    ctx.fillStyle = canAfford ? DIVINE_COLORS.primary : '#666666';
    ctx.fillText('\u{1F47C} Create Angel', buttonX + buttonWidth / 2, currentY + buttonHeight / 2 - 6);
  }

  // ============================================================================
  // Click Handling
  // ============================================================================

  handleClick(x: number, y: number, _world?: unknown): boolean {
    if (this.state.wizardOpen) {
      return this.handleWizardClick(x, y);
    }

    const headerHeight = 36;

    // Check create button in header
    const buttonWidth = 120;
    const buttonX = this.getDefaultWidth() - buttonWidth - this.padding;

    if (y < headerHeight && x >= buttonX && x <= buttonX + buttonWidth) {
      this.callbacks.onOpenCreationWizard();
      return true;
    }

    // Check if click is in angel list
    if (x < this.listWidth && y > headerHeight) {
      const listY = y - headerHeight;
      const clickedIndex = Math.floor((listY + this.scrollOffset) / this.lineHeight);

      if (clickedIndex >= 0 && clickedIndex < this.state.angels.length) {
        const angel = this.state.angels[clickedIndex];
        if (angel) {
          this.callbacks.onSelectAngel(angel.id);
          return true;
        }
      }
    }

    // Check buttons in details area
    if (x > this.listWidth && this.state.selectedAngelId) {
      const buttonY = this.getDefaultHeight() - 28 - this.padding;
      if (y >= buttonY && y <= buttonY + 28) {
        const detailsX = this.listWidth + 1;
        const detailsWidth = this.getDefaultWidth() - this.listWidth - 1;
        const contentX = detailsX + this.padding;
        const contentWidth = detailsWidth - this.padding * 2;
        const buttonWidth = (contentWidth - 12) / 2;

        if (x >= contentX && x <= contentX + buttonWidth) {
          // Rest/Wake button
          this.callbacks.onToggleAngelRest(this.state.selectedAngelId);
          return true;
        } else if (x >= contentX + buttonWidth + 12) {
          // Unassign all button - would need implementation
          return true;
        }
      }
    }

    return false;
  }

  /**
   * Handle clicks in the creation wizard
   */
  private handleWizardClick(x: number, y: number): boolean {
    // Cancel button (bottom left)
    if (y > this.getDefaultHeight() - 40 && x < 90) {
      this.callbacks.onCloseCreationWizard();
      return true;
    }

    // For now, simplified click handling
    // In a full implementation, would track all button bounds
    return true;
  }

  /**
   * Handle scroll wheel
   */
  handleScroll(deltaY: number): void {
    if (this.state.wizardOpen) return;

    const maxScroll = Math.max(0, this.state.angels.length * this.lineHeight - 300);
    this.scrollOffset = Math.max(0, Math.min(maxScroll, this.scrollOffset + deltaY));
  }

  // ============================================================================
  // Helper Functions
  // ============================================================================

  private getStatusColor(status: AngelStatus): string {
    switch (status) {
      case 'working': return '#4CAF50';
      case 'available': return '#90EE90';
      case 'depleted': return DIVINE_COLORS.critical;
      case 'overloaded': return DIVINE_COLORS.warning;
      case 'resting': return '#666666';
      case 'leveling': return DIVINE_COLORS.primary;
      case 'corrupt': return '#8B0000';
      default: return '#888888';
    }
  }

  private formatAngelType(type: AngelType): string {
    const names: Record<AngelType, string> = {
      watcher: 'Watcher',
      messenger: 'Messenger',
      guardian: 'Guardian',
      specialist: 'Specialist',
      archangel: 'Archangel',
    };
    return names[type] || type;
  }

  private formatDomain(domain: string): string {
    return domain.charAt(0).toUpperCase() + domain.slice(1);
  }

  private formatStyle(style: AngelStyle): string {
    const names: Record<AngelStyle, string> = {
      gentle: 'Gentle',
      stern: 'Stern',
      cryptic: 'Cryptic',
      direct: 'Direct',
    };
    return names[style] || style;
  }

  private formatAutonomy(autonomy: AngelAutonomy): string {
    const names: Record<AngelAutonomy, string> = {
      supervised: 'Supervised',
      semi_autonomous: 'Semi-Autonomous',
      fully_autonomous: 'Fully Autonomous',
    };
    return names[autonomy] || autonomy;
  }

  private renderProgressBar(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number,
    fill: number,
    color: string
  ): void {
    ctx.fillStyle = '#333333';
    ctx.fillRect(x, y, width, height);

    ctx.fillStyle = color;
    ctx.fillRect(x, y, width * Math.max(0, Math.min(1, fill)), height);

    ctx.strokeStyle = '#555555';
    ctx.lineWidth = 1;
    ctx.strokeRect(x, y, width, height);
  }

  private renderDivider(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number
  ): void {
    ctx.strokeStyle = '#444444';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + width, y);
    ctx.stroke();
  }

  private renderButton(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number,
    label: string,
    subLabel: string,
    color: string
  ): void {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    this.roundRect(ctx, x, y, width, height, 4);
    ctx.fill();

    ctx.strokeStyle = color;
    ctx.lineWidth = 1;
    this.roundRect(ctx, x, y, width, height, 4);
    ctx.stroke();

    ctx.font = '11px "Segoe UI", sans-serif';
    ctx.fillStyle = color;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, x + width / 2, y + height / 2 - (subLabel ? 4 : 0));

    if (subLabel) {
      ctx.font = '9px "Segoe UI", sans-serif';
      ctx.fillStyle = '#888888';
      ctx.fillText(subLabel, x + width / 2, y + height / 2 + 8);
    }
  }

  private roundRect(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number,
    radius: number
  ): void {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
  }
}
