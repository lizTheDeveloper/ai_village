/**
 * SpellbookPanel - UI for viewing and casting spells
 *
 * Features:
 * - Shows spells from active paradigms
 * - Filter by school/technique/form
 * - Hotkey assignment
 * - Proficiency display
 * - Casting initiation
 * - Mana display
 */

import type { SpellDefinition, PlayerSpellState } from '@ai-village/core';
import { getSpellRegistry, getMagicSystemState } from '@ai-village/core';
import type { IWindowPanel } from './types/WindowTypes.js';

// ============================================================================
// Types
// ============================================================================

interface ClickRegion {
  x: number;
  y: number;
  width: number;
  height: number;
  action: 'select_spell' | 'assign_hotkey' | 'cast_spell' | 'filter';
  data?: string | number;
}

type FilterMode = 'all' | 'fire' | 'protection' | 'restoration' | 'divination' | 'combat';

// ============================================================================
// Constants
// ============================================================================

const COLORS = {
  background: 'rgba(20, 20, 30, 0.95)',
  headerBg: 'rgba(40, 40, 60, 0.9)',
  spellBg: 'rgba(30, 30, 45, 0.8)',
  spellSelected: 'rgba(50, 50, 80, 0.9)',
  text: '#FFFFFF',
  textMuted: '#AAAAAA',
  textDim: '#666666',
  accent: '#9966FF',
  mana: '#4488FF',
  fire: '#FF6644',
  protection: '#44AAFF',
  restoration: '#44FF88',
  divination: '#AA88FF',
  combat: '#FF4444',
  hotkey: '#FFD700',
  border: 'rgba(100, 100, 140, 0.5)',
  profLow: '#FF6666',
  profMed: '#FFAA44',
  profHigh: '#66FF66',
};

const SIZES = {
  padding: 12,
  lineHeight: 18,
  headerHeight: 36,
  manaBarHeight: 24,
  filterHeight: 32,
  spellRowHeight: 60,
  detailHeight: 140,
};

// ============================================================================
// SpellbookPanel
// ============================================================================

export class SpellbookPanel implements IWindowPanel {
  private visible = false;
  private scrollOffset = 0;
  private selectedSpellId: string | null = null;
  private filter: FilterMode = 'all';
  private clickRegions: ClickRegion[] = [];
  private contentHeight = 0;
  private visibleHeight = 0;

  // Player mana (would come from player entity in real implementation)
  private playerMana = 100;
  private playerMaxMana = 100;

  // ========== Visibility ==========


  getId(): string {
    return 'spellbook';
  }

  getTitle(): string {
    return 'Spellbook';
  }

  getDefaultWidth(): number {
    return 500;
  }

  getDefaultHeight(): number {
    return 600;
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

  // ========== Dev/Testing ==========

  setPlayerMana(current: number, max: number): void {
    this.playerMana = current;
    this.playerMaxMana = max;
  }

  // ========== Rendering ==========

  render(ctx: CanvasRenderingContext2D, _x: number, _y: number, width: number, height: number, _world?: any): void {
    this.clickRegions = [];

    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';

    let y = 0;

    // Header
    y = this.renderHeader(ctx, width, y);

    // Mana bar
    y = this.renderManaBar(ctx, width, y);

    // Filter tabs
    y = this.renderFilters(ctx, width, y);

    // Save context for clipping
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, y, width, height - y - (this.selectedSpellId ? SIZES.detailHeight : 0));
    ctx.clip();

    const contentStartY = y;
    y -= this.scrollOffset;

    // Spell list
    y = this.renderSpellList(ctx, width, y);

    ctx.restore();

    this.contentHeight = y + this.scrollOffset - contentStartY;
    this.visibleHeight = height - contentStartY - (this.selectedSpellId ? SIZES.detailHeight : 0);

    // Detail panel (if spell selected)
    if (this.selectedSpellId) {
      this.renderDetailPanel(ctx, width, height);
    }
  }

  private renderHeader(ctx: CanvasRenderingContext2D, width: number, y: number): number {
    ctx.fillStyle = COLORS.headerBg;
    ctx.fillRect(0, y, width, SIZES.headerHeight);

    ctx.fillStyle = COLORS.accent;
    ctx.font = 'bold 14px monospace';
    ctx.fillText('SPELLBOOK', SIZES.padding, y + 10);

    // Spell count
    const registry = getSpellRegistry();
    const stateManager = getMagicSystemState();
    const activeParadigms = stateManager.getActiveParadigms();
    let spellCount = 0;
    for (const paradigm of activeParadigms) {
      spellCount += registry.getUnlockedSpellsByParadigm(paradigm.id).length;
    }

    ctx.fillStyle = COLORS.textMuted;
    ctx.font = '11px monospace';
    const countText = `${spellCount} spells available`;
    const countWidth = ctx.measureText(countText).width;
    ctx.fillText(countText, width - countWidth - SIZES.padding, y + 12);

    return y + SIZES.headerHeight;
  }

  private renderManaBar(ctx: CanvasRenderingContext2D, width: number, y: number): number {
    const barWidth = width - SIZES.padding * 2;
    const fillWidth = (this.playerMana / this.playerMaxMana) * barWidth;

    // Background
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(SIZES.padding, y + 4, barWidth, SIZES.manaBarHeight - 8);

    // Fill
    ctx.fillStyle = COLORS.mana;
    ctx.fillRect(SIZES.padding, y + 4, fillWidth, SIZES.manaBarHeight - 8);

    // Border
    ctx.strokeStyle = COLORS.border;
    ctx.lineWidth = 1;
    ctx.strokeRect(SIZES.padding, y + 4, barWidth, SIZES.manaBarHeight - 8);

    // Text
    ctx.fillStyle = COLORS.text;
    ctx.font = 'bold 11px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(
      `MANA: ${Math.floor(this.playerMana)}/${this.playerMaxMana}`,
      width / 2,
      y + 6
    );
    ctx.textAlign = 'left';

    return y + SIZES.manaBarHeight;
  }

  private renderFilters(ctx: CanvasRenderingContext2D, width: number, y: number): number {
    const filters: { id: FilterMode; label: string; color: string }[] = [
      { id: 'all', label: 'All', color: COLORS.text },
      { id: 'fire', label: 'Fire', color: COLORS.fire },
      { id: 'protection', label: 'Protect', color: COLORS.protection },
      { id: 'restoration', label: 'Heal', color: COLORS.restoration },
      { id: 'divination', label: 'Divine', color: COLORS.divination },
    ];

    const tabWidth = (width - SIZES.padding * 2) / filters.length;
    let x = SIZES.padding;

    for (const f of filters) {
      const isActive = this.filter === f.id;

      // Tab background
      ctx.fillStyle = isActive ? 'rgba(100, 100, 140, 0.5)' : 'rgba(40, 40, 60, 0.3)';
      ctx.fillRect(x, y, tabWidth - 2, SIZES.filterHeight - 4);

      // Tab text
      ctx.fillStyle = isActive ? f.color : COLORS.textMuted;
      ctx.font = isActive ? 'bold 10px monospace' : '10px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(f.label, x + tabWidth / 2, y + 10);
      ctx.textAlign = 'left';

      // Click region
      this.clickRegions.push({
        x,
        y,
        width: tabWidth - 2,
        height: SIZES.filterHeight - 4,
        action: 'filter',
        data: f.id,
      });

      x += tabWidth;
    }

    return y + SIZES.filterHeight;
  }

  private renderSpellList(ctx: CanvasRenderingContext2D, width: number, y: number): number {
    const registry = getSpellRegistry();
    const stateManager = getMagicSystemState();
    const activeParadigms = stateManager.getActiveParadigms();

    const spells: SpellDefinition[] = [];
    for (const paradigm of activeParadigms) {
      spells.push(...registry.getUnlockedSpellsByParadigm(paradigm.id));
    }

    // Apply filter
    const filtered = spells.filter(s => {
      if (this.filter === 'all') return true;
      return s.school === this.filter;
    });

    if (filtered.length === 0) {
      ctx.fillStyle = COLORS.textMuted;
      ctx.font = '12px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('No spells available', width / 2, y + 20);
      ctx.textAlign = 'left';
      return y + 60;
    }

    for (const spell of filtered) {
      y = this.renderSpellRow(ctx, width, y, spell, registry.getPlayerState(spell.id));
    }

    return y;
  }

  private renderSpellRow(
    ctx: CanvasRenderingContext2D,
    width: number,
    y: number,
    spell: SpellDefinition,
    state: PlayerSpellState | undefined
  ): number {
    const isSelected = this.selectedSpellId === spell.id;
    const rowHeight = SIZES.spellRowHeight;

    // Background
    ctx.fillStyle = isSelected ? COLORS.spellSelected : COLORS.spellBg;
    ctx.fillRect(SIZES.padding / 2, y + 2, width - SIZES.padding, rowHeight - 4);

    // Border
    ctx.strokeStyle = isSelected ? COLORS.accent : COLORS.border;
    ctx.lineWidth = isSelected ? 2 : 1;
    ctx.strokeRect(SIZES.padding / 2, y + 2, width - SIZES.padding, rowHeight - 4);

    // Hotkey badge
    if (state?.hotkey) {
      ctx.fillStyle = COLORS.hotkey;
      ctx.font = 'bold 12px monospace';
      ctx.fillText(`[${state.hotkey}]`, SIZES.padding, y + 8);
    }

    // Spell name
    ctx.fillStyle = this.getSchoolColor(spell.school);
    ctx.font = 'bold 12px monospace';
    ctx.fillText(spell.name, SIZES.padding + (state?.hotkey ? 30 : 0), y + 8);

    // Mana cost
    ctx.fillStyle = COLORS.mana;
    ctx.font = '11px monospace';
    const costText = `${spell.manaCost} mana`;
    const costWidth = ctx.measureText(costText).width;
    ctx.fillText(costText, width - costWidth - SIZES.padding, y + 8);

    // Description
    ctx.fillStyle = COLORS.textMuted;
    ctx.font = '10px monospace';
    const desc = spell.description.length > 50
      ? spell.description.substring(0, 47) + '...'
      : spell.description;
    ctx.fillText(desc, SIZES.padding, y + 26);

    // Proficiency bar
    const proficiency = state?.proficiency ?? 0;
    const barX = SIZES.padding;
    const barY = y + 42;
    const barWidth = 80;
    const barHeight = 8;

    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(barX, barY, barWidth, barHeight);

    ctx.fillStyle = this.getProficiencyColor(proficiency);
    ctx.fillRect(barX, barY, (proficiency / 100) * barWidth, barHeight);

    ctx.fillStyle = COLORS.textDim;
    ctx.font = '9px monospace';
    ctx.fillText(`${Math.floor(proficiency)}%`, barX + barWidth + 5, barY);

    // Mishap chance
    const mishapChance = getSpellRegistry().getMishapChance(spell.id);
    if (mishapChance > 0.05) {
      ctx.fillStyle = '#FF6666';
      ctx.fillText(`${Math.floor(mishapChance * 100)}% mishap`, barX + barWidth + 35, barY);
    }

    // Click region
    this.clickRegions.push({
      x: SIZES.padding / 2,
      y: y + 2,
      width: width - SIZES.padding,
      height: rowHeight - 4,
      action: 'select_spell',
      data: spell.id,
    });

    return y + rowHeight;
  }

  private renderDetailPanel(ctx: CanvasRenderingContext2D, width: number, height: number): void {
    const registry = getSpellRegistry();
    const spell = registry.getSpell(this.selectedSpellId!);
    const state = registry.getPlayerState(this.selectedSpellId!);

    if (!spell) return;

    const panelY = height - SIZES.detailHeight;

    // Background
    ctx.fillStyle = COLORS.headerBg;
    ctx.fillRect(0, panelY, width, SIZES.detailHeight);

    // Border
    ctx.strokeStyle = COLORS.accent;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, panelY);
    ctx.lineTo(width, panelY);
    ctx.stroke();

    let y = panelY + SIZES.padding;

    // Spell name
    ctx.fillStyle = this.getSchoolColor(spell.school);
    ctx.font = 'bold 14px monospace';
    ctx.fillText(spell.name, SIZES.padding, y);

    // Cast button
    const canCast = this.playerMana >= spell.manaCost;
    const castBtnX = width - 80 - SIZES.padding;
    const castBtnY = y - 4;
    const castBtnW = 80;
    const castBtnH = 24;

    ctx.fillStyle = canCast ? COLORS.accent : COLORS.textDim;
    ctx.beginPath();
    ctx.roundRect(castBtnX, castBtnY, castBtnW, castBtnH, 4);
    ctx.fill();

    ctx.fillStyle = canCast ? COLORS.text : COLORS.textMuted;
    ctx.font = 'bold 11px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('CAST', castBtnX + castBtnW / 2, castBtnY + 7);
    ctx.textAlign = 'left';

    this.clickRegions.push({
      x: castBtnX,
      y: castBtnY,
      width: castBtnW,
      height: castBtnH,
      action: 'cast_spell',
      data: spell.id,
    });

    y += 22;

    // Details
    ctx.fillStyle = COLORS.text;
    ctx.font = '11px monospace';
    ctx.fillText(spell.description, SIZES.padding, y);
    y += 18;

    ctx.fillStyle = COLORS.textMuted;
    ctx.font = '10px monospace';
    ctx.fillText(
      `Technique: ${spell.technique} | Form: ${spell.form} | Range: ${spell.range} tiles`,
      SIZES.padding,
      y
    );
    y += 16;

    ctx.fillText(
      `Cast time: ${(spell.castTime / 20).toFixed(1)}s | ` +
      (spell.duration ? `Duration: ${(spell.duration / 20).toFixed(0)}s` : 'Instant'),
      SIZES.padding,
      y
    );
    y += 16;

    // Hotkey assignment
    ctx.fillStyle = COLORS.hotkey;
    ctx.font = '10px monospace';
    if (state?.hotkey) {
      ctx.fillText(`Hotkey: [${state.hotkey}] - Click 1-9 to reassign`, SIZES.padding, y);
    } else {
      ctx.fillText('Press 1-9 to assign hotkey', SIZES.padding, y);
    }
    y += 16;

    // Stats
    ctx.fillStyle = COLORS.textDim;
    ctx.fillText(`Times cast: ${state?.timesCast ?? 0}`, SIZES.padding, y);
  }

  private getSchoolColor(school?: string): string {
    switch (school) {
      case 'fire': return COLORS.fire;
      case 'protection': return COLORS.protection;
      case 'restoration': return COLORS.restoration;
      case 'divination': return COLORS.divination;
      case 'combat': return COLORS.combat;
      default: return COLORS.text;
    }
  }

  private getProficiencyColor(prof: number): string {
    if (prof < 30) return COLORS.profLow;
    if (prof < 70) return COLORS.profMed;
    return COLORS.profHigh;
  }

  // ========== Interaction ==========

  handleScroll(deltaY: number, _contentHeight?: number): boolean {
    const maxScroll = Math.max(0, this.contentHeight - this.visibleHeight);
    this.scrollOffset = Math.max(0, Math.min(maxScroll, this.scrollOffset + deltaY));
    return true;
  }

  handleClick(x: number, y: number): boolean {
    const adjustedY = y + this.scrollOffset;

    for (const region of this.clickRegions) {
      const regionY = region.y + (region.action === 'select_spell' ? this.scrollOffset : 0);

      if (
        x >= region.x &&
        x <= region.x + region.width &&
        adjustedY >= regionY &&
        adjustedY <= regionY + region.height
      ) {
        return this.handleClickAction(region);
      }
    }

    return false;
  }

  private handleClickAction(region: ClickRegion): boolean {
    switch (region.action) {
      case 'select_spell':
        this.selectedSpellId = this.selectedSpellId === region.data ? null : region.data as string;
        return true;

      case 'filter':
        this.filter = region.data as FilterMode;
        return true;

      case 'cast_spell':
        this.castSpell(region.data as string);
        return true;

      case 'assign_hotkey':
        // Handled via keyboard
        return true;
    }
    return false;
  }

  handleKeyPress(key: string): boolean {
    // Hotkey assignment when spell is selected
    if (this.selectedSpellId && key >= '1' && key <= '9') {
      const hotkey = parseInt(key, 10);
      getSpellRegistry().assignHotkey(this.selectedSpellId, hotkey);
      return true;
    }

    // Quick cast via hotkey
    if (key >= '1' && key <= '9') {
      const hotkey = parseInt(key, 10);
      const spell = getSpellRegistry().getSpellByHotkey(hotkey);
      if (spell) {
        this.castSpell(spell.id);
        return true;
      }
    }

    return false;
  }

  private castSpell(spellId: string): void {
    const registry = getSpellRegistry();
    const spell = registry.getSpell(spellId);
    if (!spell) return;

    if (this.playerMana < spell.manaCost) {
      // Not enough mana - would show notification in real implementation
      return;
    }

    // Deduct mana
    this.playerMana -= spell.manaCost;

    // Record cast
    registry.recordCast(spellId, Date.now());

    // In real implementation, this would trigger the spell effect system
  }

  // ========== Selection ==========

  getSelectedSpellId(): string | null {
    return this.selectedSpellId;
  }

  selectSpell(spellId: string | null): void {
    this.selectedSpellId = spellId;
  }
}
