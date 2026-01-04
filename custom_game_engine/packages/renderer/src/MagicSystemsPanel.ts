/**
 * MagicSystemsPanel - UI for toggling magic paradigms on/off
 *
 * Features:
 * - Lists all registered magic paradigms
 * - Toggle states: disabled / enabled / active
 * - Shows paradigm info: agents using, player proficiency, spell counts
 * - Expandable sections for each paradigm
 * - Data-driven: no hardcoded paradigm list
 */

import type { MagicParadigm, ParadigmState } from '@ai-village/core';

// Local type for magic source
interface MagicSourceInfo {
  name: string;
}
import { getMagicSystemState } from '@ai-village/core';
import type { IWindowPanel } from './types/WindowTypes.js';

// ============================================================================
// Types
// ============================================================================

/** Click region for hit testing */
interface ClickRegion {
  x: number;
  y: number;
  width: number;
  height: number;
  action: 'toggle-expand' | 'toggle-enabled' | 'toggle-active';
  paradigmId: string;
}

// ============================================================================
// Constants
// ============================================================================

const COLORS = {
  background: 'rgba(20, 20, 30, 0.95)',
  headerBg: 'rgba(40, 40, 60, 0.9)',
  sectionBg: 'rgba(30, 30, 45, 0.8)',
  sectionHover: 'rgba(40, 40, 60, 0.9)',
  text: '#FFFFFF',
  textMuted: '#AAAAAA',
  textDim: '#666666',
  accent: '#FFD700',
  enabled: '#4CAF50',
  active: '#2196F3',
  disabled: '#666666',
  border: 'rgba(100, 100, 140, 0.5)',
  toggleOff: '#444444',
  toggleOn: '#4CAF50',
  toggleActive: '#2196F3',
};

const SIZES = {
  padding: 12,
  lineHeight: 20,
  headerHeight: 36,
  sectionHeaderHeight: 32,
  toggleWidth: 50,
  toggleHeight: 24,
  expandedHeight: 120,
  collapsedHeight: 44,
};

// ============================================================================
// MagicSystemsPanel
// ============================================================================

export class MagicSystemsPanel implements IWindowPanel {
  private visible = false;
  private scrollOffset = 0;
  private expandedParadigms: Set<string> = new Set();
  private clickRegions: ClickRegion[] = [];

  // ========== Visibility ==========


  getId(): string {
    return 'magic-systems';
  }

  getTitle(): string {
    return 'Magic Systems';
  }

  getDefaultWidth(): number {
    return 500;
  }

  getDefaultHeight(): number {
    return 650;
  }

  setVisible(visible: boolean): void {
    this.visible = visible;
  }

  isVisible(): boolean {
    return this.visible;
  }

  toggle(): void {
    this.visible = !this.visible;
  }

  show(): void {
    this.visible = true;
  }

  hide(): void {
    this.visible = false;
  }

  // ========== Expansion ==========

  toggleExpanded(paradigmId: string): void {
    if (this.expandedParadigms.has(paradigmId)) {
      this.expandedParadigms.delete(paradigmId);
    } else {
      this.expandedParadigms.add(paradigmId);
    }
  }

  isExpanded(paradigmId: string): boolean {
    return this.expandedParadigms.has(paradigmId);
  }

  // ========== Rendering ==========

  render(ctx: CanvasRenderingContext2D, _x: number, _y: number, width: number, height: number, _world?: any): void {
    // Clear click regions for this frame
    this.clickRegions = [];

    const stateManager = getMagicSystemState();
    const paradigms = stateManager.getAllParadigms();

    // Set up text rendering
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';

    let y = 0;

    // Header
    y = this.renderHeader(ctx, width, y);

    // Save context for clipping content area
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, y, width, height - y);
    ctx.clip();

    // Apply scroll
    const contentStartY = y;
    y -= this.scrollOffset;

    // Render paradigm sections
    if (paradigms.length === 0) {
      y = this.renderEmptyState(ctx, width, y);
    } else {
      for (const paradigm of paradigms) {
        y = this.renderParadigmSection(ctx, width, y, paradigm, stateManager);
      }
    }

    ctx.restore();

    // Store content height for scrolling
    this.contentHeight = y + this.scrollOffset - contentStartY;
    this.visibleHeight = height - contentStartY;
  }

  private contentHeight = 0;
  private visibleHeight = 0;

  renderHeader(ctx: CanvasRenderingContext2D, width: number, y: number): number {
    // Header background
    ctx.fillStyle = COLORS.headerBg;
    ctx.fillRect(0, y, width, SIZES.headerHeight);

    // Title
    ctx.fillStyle = COLORS.accent;
    ctx.font = 'bold 14px monospace';
    ctx.fillText('MAGIC SYSTEMS', SIZES.padding, y + 10);

    // Subtitle count
    const stateManager = getMagicSystemState();
    const activeCount = stateManager.getActiveParadigms().length;
    const enabledCount = stateManager.getEnabledParadigms().length;

    ctx.fillStyle = COLORS.textMuted;
    ctx.font = '11px monospace';
    const countText = `${activeCount} active / ${enabledCount} enabled`;
    const countWidth = ctx.measureText(countText).width;
    ctx.fillText(countText, width - countWidth - SIZES.padding, y + 12);

    return y + SIZES.headerHeight;
  }

  private renderEmptyState(ctx: CanvasRenderingContext2D, width: number, y: number): number {
    y += SIZES.padding * 2;

    ctx.fillStyle = COLORS.textMuted;
    ctx.font = '12px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('No magic paradigms registered', width / 2, y);
    ctx.textAlign = 'left';

    y += SIZES.lineHeight;
    ctx.fillStyle = COLORS.textDim;
    ctx.font = '11px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('Register paradigms to see them here', width / 2, y);
    ctx.textAlign = 'left';

    return y + SIZES.padding * 2;
  }

  private renderParadigmSection(
    ctx: CanvasRenderingContext2D,
    width: number,
    y: number,
    paradigm: MagicParadigm,
    stateManager: ReturnType<typeof getMagicSystemState>
  ): number {
    const state = stateManager.getState(paradigm.id);
    const runtimeState = stateManager.getRuntimeState(paradigm.id);
    const isExpanded = this.isExpanded(paradigm.id);

    const sectionHeight = isExpanded ? SIZES.expandedHeight : SIZES.collapsedHeight;

    // Section background
    ctx.fillStyle = COLORS.sectionBg;
    ctx.fillRect(SIZES.padding / 2, y + 2, width - SIZES.padding, sectionHeight - 4);

    // Border
    ctx.strokeStyle = COLORS.border;
    ctx.lineWidth = 1;
    ctx.strokeRect(SIZES.padding / 2, y + 2, width - SIZES.padding, sectionHeight - 4);

    // Expand indicator and name
    const headerY = y + 8;
    ctx.fillStyle = COLORS.text;
    ctx.font = '12px monospace';

    const expandIcon = isExpanded ? '▼' : '▶';
    ctx.fillText(expandIcon, SIZES.padding, headerY);

    // Add click region for expand/collapse
    this.clickRegions.push({
      x: 0,
      y: y,
      width: width - SIZES.toggleWidth * 2 - SIZES.padding * 2,
      height: SIZES.sectionHeaderHeight,
      action: 'toggle-expand',
      paradigmId: paradigm.id,
    });

    // Paradigm name
    ctx.fillStyle = this.getStateColor(state);
    ctx.font = 'bold 12px monospace';
    ctx.fillText(paradigm.name, SIZES.padding + 16, headerY);

    // State indicator
    const stateText = state.toUpperCase();
    ctx.font = '10px monospace';
    ctx.fillStyle = this.getStateColor(state);
    ctx.fillText(stateText, SIZES.padding + 16 + ctx.measureText(paradigm.name).width + 10, headerY + 2);

    // Toggle buttons
    const toggleY = y + 8;
    const activeToggleX = width - SIZES.toggleWidth - SIZES.padding;
    const enabledToggleX = activeToggleX - SIZES.toggleWidth - 8;

    // Enabled toggle
    this.renderToggle(ctx, enabledToggleX, toggleY, state !== 'disabled', 'E', paradigm.id, 'toggle-enabled');

    // Active toggle
    this.renderToggle(ctx, activeToggleX, toggleY, state === 'active', 'A', paradigm.id, 'toggle-active');

    let contentY = y + SIZES.sectionHeaderHeight + 4;

    if (isExpanded) {
      // Description
      ctx.fillStyle = COLORS.textMuted;
      ctx.font = '11px monospace';
      const desc = paradigm.description.length > 60
        ? paradigm.description.substring(0, 57) + '...'
        : paradigm.description;
      ctx.fillText(desc, SIZES.padding + 8, contentY);
      contentY += SIZES.lineHeight;

      // Stats
      if (runtimeState) {
        ctx.fillStyle = COLORS.textDim;
        ctx.font = '10px monospace';

        const stats = [
          `Agents: ${runtimeState.agentCount}`,
          `Proficiency: ${runtimeState.playerProficiency}%`,
          `Casts: ${runtimeState.totalSpellsCast}`,
        ];

        let statX = SIZES.padding + 8;
        for (const stat of stats) {
          ctx.fillText(stat, statX, contentY);
          statX += ctx.measureText(stat).width + 16;
        }
        contentY += SIZES.lineHeight;

        // Mishaps if any
        if (runtimeState.totalMishaps > 0) {
          ctx.fillStyle = '#FF6B6B';
          ctx.fillText(`Mishaps: ${runtimeState.totalMishaps}`, SIZES.padding + 8, contentY);
          contentY += SIZES.lineHeight;
        }
      }

      // Sources/costs preview
      ctx.fillStyle = COLORS.textDim;
      ctx.font = '10px monospace';
      const sources = paradigm.sources.map((s: MagicSourceInfo) => s.name).join(', ');
      const sourcesText = `Sources: ${sources.length > 40 ? sources.substring(0, 37) + '...' : sources}`;
      ctx.fillText(sourcesText, SIZES.padding + 8, contentY);
    }

    return y + sectionHeight;
  }

  private renderToggle(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    isOn: boolean,
    label: string,
    paradigmId: string,
    action: 'toggle-enabled' | 'toggle-active'
  ): void {
    const toggleW = SIZES.toggleWidth;
    const toggleH = SIZES.toggleHeight;

    // Background
    ctx.fillStyle = isOn
      ? (action === 'toggle-active' ? COLORS.toggleActive : COLORS.toggleOn)
      : COLORS.toggleOff;
    ctx.beginPath();
    ctx.roundRect(x, y, toggleW, toggleH, 4);
    ctx.fill();

    // Label
    ctx.fillStyle = isOn ? '#FFFFFF' : COLORS.textMuted;
    ctx.font = 'bold 10px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(label, x + toggleW / 2, y + 7);
    ctx.textAlign = 'left';

    // Click region
    this.clickRegions.push({
      x,
      y,
      width: toggleW,
      height: toggleH,
      action,
      paradigmId,
    });
  }

  private getStateColor(state: ParadigmState): string {
    switch (state) {
      case 'active':
        return COLORS.active;
      case 'enabled':
        return COLORS.enabled;
      case 'disabled':
      default:
        return COLORS.disabled;
    }
  }

  // ========== Interaction ==========

  handleScroll(deltaY: number, _contentHeight?: number): boolean {
    const maxScroll = Math.max(0, this.contentHeight - this.visibleHeight);
    this.scrollOffset = Math.max(0, Math.min(maxScroll, this.scrollOffset + deltaY));
    return true;
  }

  handleClick(x: number, y: number): boolean {
    // Adjust y for scroll
    const adjustedY = y + this.scrollOffset;

    for (const region of this.clickRegions) {
      // Regions are stored with scroll-adjusted coordinates
      const regionY = region.y + this.scrollOffset;

      if (
        x >= region.x &&
        x <= region.x + region.width &&
        adjustedY >= regionY &&
        adjustedY <= regionY + region.height
      ) {
        this.handleClickAction(region);
        return true;
      }
    }

    return false;
  }

  private handleClickAction(region: ClickRegion): void {
    const stateManager = getMagicSystemState();

    switch (region.action) {
      case 'toggle-expand':
        this.toggleExpanded(region.paradigmId);
        break;

      case 'toggle-enabled':
        stateManager.toggleEnabled(region.paradigmId);
        break;

      case 'toggle-active':
        stateManager.toggleActive(region.paradigmId);
        break;
    }
  }

}
