/**
 * CivilizationChroniclePanel — scrollable history of civilization milestones.
 *
 * Subscribes to civilization:* EventBus events and displays them in reverse
 * chronological order. Parchment/chronicle visual style.
 *
 * Layout: header → genesis entry (if any) → milestone list (scrollable)
 *
 * Task: MUL-2338 (Drive 2 — Civilization Chronicle UI)
 */

import type { IWindowPanel } from './types/WindowTypes.js';
import type { EventBus } from '@ai-village/core';

// ============================================================================
// Types
// ============================================================================

export interface MilestoneEntry {
  type: string;
  agentName?: string;
  summary: string;
  tick: number;
  timestamp: number; // Date.now() when received
}

// ============================================================================
// Constants
// ============================================================================

const MAX_ENTRIES = 200;

const MILESTONE_ICONS: Record<string, string> = {
  'civilization:biome_discovered':    '🗺️',
  'civilization:biome_settled':       '🏗️',
  'civilization:biome_explored':      '🧭',
  'civilization:terrain_transformed': '🌍',
  'civilization:resource_extracted':  '⛏️',
};

const C = {
  bg:          'rgba(22, 16, 8, 0.97)',
  headerBg:    'rgba(35, 25, 12, 0.95)',
  headerGold:  '#C8A855',
  entryBg:     'rgba(38, 28, 14, 0.85)',
  entryBorder: 'rgba(160, 120, 50, 0.4)',
  entryBgAlt:  'rgba(30, 22, 10, 0.75)',
  text:        '#F0E0C0',
  textMuted:   '#A08860',
  textDim:     '#604830',
  accent:      '#C8A855',
  genesisText: 'rgba(220, 190, 120, 0.9)',
};

const ROW_H = 70;
const HEADER_H = 40;
const PAD = 12;

// ============================================================================
// Helpers
// ============================================================================

function formatMilestoneType(type: string): string {
  return type.replace('civilization:', '').replace(/_/g, ' ');
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let current = '';
  for (const word of words) {
    const test = current ? current + ' ' + word : word;
    if (ctx.measureText(test).width > maxWidth && current) {
      lines.push(current);
      current = word;
    } else {
      current = test;
    }
  }
  if (current) lines.push(current);
  return lines;
}

function formatTimeAgo(timestamp: number): string {
  const diffMs = Date.now() - timestamp;
  const diffS = Math.floor(diffMs / 1000);
  if (diffS < 60) return `${diffS}s ago`;
  const diffM = Math.floor(diffS / 60);
  if (diffM < 60) return `${diffM}m ago`;
  const diffH = Math.floor(diffM / 60);
  if (diffH < 24) return `${diffH}h ago`;
  const diffD = Math.floor(diffH / 24);
  return `${diffD}d ago`;
}

// ============================================================================
// CivilizationChroniclePanel
// ============================================================================

export class CivilizationChroniclePanel implements IWindowPanel {
  private visible = false;
  private milestones: MilestoneEntry[] = [];
  private scrollOffset = 0;
  private connected = false;
  private selectedMilestone: MilestoneEntry | null = null;

  // ── EventBus connection ───────────────────────────────────────────────────

  /**
   * Subscribe to civilization:* EventBus events. Call once after creating the panel.
   */
  connect(eventBus: EventBus): void {
    if (this.connected) return;
    this.connected = true;

    const addEntry = (entry: MilestoneEntry): void => {
      this.milestones.unshift(entry);
      if (this.milestones.length > MAX_ENTRIES) {
        this.milestones.length = MAX_ENTRIES;
      }
      // Reset scroll so next open shows the latest entry
      if (!this.visible) {
        this.scrollOffset = 0;
      }
    };

    eventBus.subscribe('civilization:biome_discovered', (event: any) => {
      const d = event.data ?? {};
      addEntry({
        type: 'civilization:biome_discovered',
        agentName: d.agentName,
        summary: d.summary ?? '',
        tick: d.tick ?? 0,
        timestamp: Date.now(),
      });
    });

    eventBus.subscribe('civilization:biome_settled', (event: any) => {
      const d = event.data ?? {};
      addEntry({
        type: 'civilization:biome_settled',
        agentName: d.agentName,
        summary: d.summary ?? '',
        tick: d.tick ?? 0,
        timestamp: Date.now(),
      });
    });

    eventBus.subscribe('civilization:biome_explored', (event: any) => {
      const d = event.data ?? {};
      addEntry({
        type: 'civilization:biome_explored',
        summary: d.summary ?? '',
        tick: d.tick ?? 0,
        timestamp: Date.now(),
      });
    });

    eventBus.subscribe('civilization:terrain_transformed', (event: any) => {
      const d = event.data ?? {};
      addEntry({
        type: 'civilization:terrain_transformed',
        summary: d.summary ?? '',
        tick: d.tick ?? 0,
        timestamp: Date.now(),
      });
    });

    eventBus.subscribe('civilization:resource_extracted', (event: any) => {
      const d = event.data ?? {};
      addEntry({
        type: 'civilization:resource_extracted',
        agentName: d.agentName,
        summary: d.summary ?? '',
        tick: d.tick ?? 0,
        timestamp: Date.now(),
      });
    });
  }

  // ── IWindowPanel ──────────────────────────────────────────────────────────

  getId(): string { return 'civilization-chronicle'; }
  getTitle(): string { return 'Civilization Chronicle'; }
  getDefaultWidth(): number { return 420; }
  getDefaultHeight(): number { return 580; }
  isVisible(): boolean { return this.visible; }
  setVisible(visible: boolean): void { this.visible = visible; }

  handleScroll(deltaY: number, _contentHeight: number): boolean {
    this.scrollOffset = Math.max(0, this.scrollOffset + deltaY);
    return true;
  }

  handleContentClick(x: number, y: number, _width: number, _height: number): boolean {
    if (this.selectedMilestone !== null) {
      // In detail view: check for "← Back" button (top-left, below header)
      const backBtnY = HEADER_H + PAD;
      const backBtnH = 20;
      if (y >= backBtnY && y <= backBtnY + backBtnH && x >= PAD && x <= PAD + 180) {
        this.selectedMilestone = null;
        return true;
      }
      // Consume all other clicks in detail view
      return true;
    }

    // List view
    if (y < HEADER_H) return false;

    const index = Math.floor((y - HEADER_H + this.scrollOffset) / ROW_H);
    if (index >= 0 && index < this.milestones.length) {
      this.selectedMilestone = this.milestones[index]!;
      return true;
    }
    return false;
  }

  // ── Render ────────────────────────────────────────────────────────────────

  render(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number,
  ): void {
    // Background
    ctx.fillStyle = C.bg;
    ctx.fillRect(x, y, width, height);

    // Header
    ctx.fillStyle = C.headerBg;
    ctx.fillRect(x, y, width, HEADER_H);

    // Header decorations
    ctx.fillStyle = C.accent;
    ctx.font = '13px serif';
    ctx.textAlign = 'left';
    ctx.fillText('✦', x + PAD, y + HEADER_H / 2 + 5);
    ctx.textAlign = 'right';
    ctx.fillText('✦', x + width - PAD, y + HEADER_H / 2 + 5);

    ctx.fillStyle = C.headerGold;
    ctx.font = 'bold 14px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Civilization Chronicle', x + width / 2, y + HEADER_H / 2 + 5);
    ctx.textAlign = 'left';

    // Header border bottom
    ctx.strokeStyle = C.entryBorder;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x, y + HEADER_H);
    ctx.lineTo(x + width, y + HEADER_H);
    ctx.stroke();

    // Detail view branch
    if (this.selectedMilestone !== null) {
      this.renderDetailView(ctx, x, y, width, height);
      return;
    }

    const listY = y + HEADER_H;
    const listH = height - HEADER_H;

    // Empty state
    if (this.milestones.length === 0) {
      ctx.fillStyle = C.textDim;
      ctx.font = 'italic 11px sans-serif';
      ctx.textAlign = 'center';
      const emptyLines = [
        'No milestones recorded yet.',
        'Explore the world to begin your Chronicle.',
      ];
      let ey = listY + listH / 2 - 12;
      for (const line of emptyLines) {
        ctx.fillText(line, x + width / 2, ey);
        ey += 18;
      }
      ctx.textAlign = 'left';
      return;
    }

    // Clip to list area
    ctx.save();
    ctx.beginPath();
    ctx.rect(x, listY, width, listH);
    ctx.clip();

    // Render milestone rows
    let ry = listY - this.scrollOffset;
    for (let i = 0; i < this.milestones.length; i++) {
      const entry = this.milestones[i]!;

      // Skip rows above visible area
      if (ry + ROW_H < listY) {
        ry += ROW_H;
        continue;
      }
      // Stop rendering rows below visible area
      if (ry > listY + listH) break;

      // Row background (alternating)
      ctx.fillStyle = i % 2 === 0 ? C.entryBg : C.entryBgAlt;
      ctx.fillRect(x, ry, width, ROW_H);

      // Row bottom border
      ctx.strokeStyle = C.entryBorder;
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      ctx.moveTo(x, ry + ROW_H);
      ctx.lineTo(x + width, ry + ROW_H);
      ctx.stroke();

      // Icon
      const icon = MILESTONE_ICONS[entry.type] ?? '✦';
      ctx.font = '22px serif';
      ctx.fillStyle = C.text;
      ctx.textAlign = 'left';
      ctx.fillText(icon, x + PAD, ry + ROW_H / 2 + 8);

      const contentX = x + PAD + 36;
      const contentW = width - PAD * 2 - 36 - 48; // reserve right for tick

      // Type label (uppercase, small monospace)
      ctx.font = 'bold 9px monospace';
      ctx.fillStyle = C.accent;
      ctx.fillText(formatMilestoneType(entry.type).toUpperCase(), contentX, ry + 16);

      // Agent name (if present)
      let summaryY = ry + 30;
      if (entry.agentName) {
        ctx.font = 'bold 11px sans-serif';
        ctx.fillStyle = C.text;
        const nameStr = entry.agentName.length > 22 ? entry.agentName.slice(0, 20) + '…' : entry.agentName;
        ctx.fillText(nameStr, contentX, summaryY);
        summaryY += 14;
      }

      // Summary text (wrapped, max 2 lines)
      ctx.font = '10px sans-serif';
      ctx.fillStyle = C.textMuted;
      const lines = wrapText(ctx, entry.summary, contentW);
      for (const line of lines.slice(0, 2)) {
        if (summaryY + 12 > ry + ROW_H - 2) break;
        ctx.fillText(line, contentX, summaryY);
        summaryY += 13;
      }

      // Tick number (right-aligned)
      ctx.font = '9px monospace';
      ctx.fillStyle = C.textDim;
      ctx.textAlign = 'right';
      ctx.fillText(`t:${entry.tick}`, x + width - PAD, ry + 16);
      ctx.textAlign = 'left';

      ry += ROW_H;
    }

    ctx.restore();
  }

  private renderDetailView(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number,
  ): void {
    const entry = this.selectedMilestone!;
    const listY = y + HEADER_H;
    const listH = height - HEADER_H;

    // Clip to list area
    ctx.save();
    ctx.beginPath();
    ctx.rect(x, listY, width, listH);
    ctx.clip();

    // Detail card background
    const cardX = x + PAD;
    const cardY = listY + PAD;
    const cardW = width - PAD * 2;
    const cardH = listH - PAD * 2;

    ctx.fillStyle = C.entryBg;
    ctx.fillRect(cardX, cardY, cardW, cardH);
    ctx.strokeStyle = C.entryBorder;
    ctx.lineWidth = 1;
    ctx.strokeRect(cardX, cardY, cardW, cardH);

    // "← Back" button
    const backY = listY + PAD + 14;
    ctx.font = 'bold 11px sans-serif';
    ctx.fillStyle = C.accent;
    ctx.textAlign = 'left';
    ctx.fillText('← Back to Chronicle', x + PAD + 8, backY);

    // Separator below back button
    ctx.strokeStyle = C.entryBorder;
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.moveTo(cardX + PAD, backY + 6);
    ctx.lineTo(cardX + cardW - PAD, backY + 6);
    ctx.stroke();

    // Icon (large)
    const icon = MILESTONE_ICONS[entry.type] ?? '✦';
    const iconY = backY + 36;
    ctx.font = '36px serif';
    ctx.fillStyle = C.text;
    ctx.textAlign = 'center';
    ctx.fillText(icon, x + width / 2, iconY);

    // Type label (uppercase, bold)
    const typeY = iconY + 20;
    ctx.font = 'bold 10px monospace';
    ctx.fillStyle = C.accent;
    ctx.textAlign = 'center';
    ctx.fillText(formatMilestoneType(entry.type).toUpperCase(), x + width / 2, typeY);

    // Agent name (if present)
    let detailY = typeY + 18;
    if (entry.agentName) {
      ctx.font = 'bold 13px sans-serif';
      ctx.fillStyle = C.text;
      ctx.textAlign = 'center';
      ctx.fillText(entry.agentName, x + width / 2, detailY);
      detailY += 18;
    }

    // Summary text (wrapped)
    ctx.font = '11px sans-serif';
    ctx.fillStyle = C.textMuted;
    ctx.textAlign = 'left';
    const summaryMaxW = cardW - PAD * 4;
    const summaryX = cardX + PAD * 2;
    const summaryLines = wrapText(ctx, entry.summary, summaryMaxW);
    for (const line of summaryLines) {
      if (detailY + 14 > cardY + cardH - PAD * 3) break;
      ctx.fillText(line, summaryX, detailY);
      detailY += 15;
    }

    // Tick number
    detailY += 8;
    ctx.font = '9px monospace';
    ctx.fillStyle = C.textDim;
    ctx.textAlign = 'left';
    ctx.fillText(`Tick: ${entry.tick}`, summaryX, detailY);

    // Relative timestamp
    ctx.textAlign = 'right';
    ctx.fillText(formatTimeAgo(entry.timestamp), cardX + cardW - PAD * 2, detailY);

    ctx.textAlign = 'left';
    ctx.restore();
  }
}
