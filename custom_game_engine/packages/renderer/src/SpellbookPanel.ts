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

import type { SpellDefinition, PlayerSpellState } from '@ai-village/magic';
import { getSpellRegistry, getMagicSystemState } from '@ai-village/magic';
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
  background: 'rgba(12, 8, 28, 0.97)',
  headerBg: 'rgba(18, 12, 38, 0.95)',
  spellBg: 'rgba(20, 15, 38, 0.85)',
  spellSelected: 'rgba(45, 30, 80, 0.95)',
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
  border: 'rgba(100, 80, 160, 0.4)',
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

  renderHeader(ctx: CanvasRenderingContext2D, width: number, y: number): number {
    // Grimoire gradient background
    const headerGrad = ctx.createLinearGradient(0, y, 0, y + SIZES.headerHeight);
    headerGrad.addColorStop(0, 'rgba(35, 18, 70, 0.98)');
    headerGrad.addColorStop(1, 'rgba(18, 10, 45, 0.98)');
    ctx.fillStyle = headerGrad;
    ctx.fillRect(0, y, width, SIZES.headerHeight);

    // Bottom separator with arcane glow
    const sepGrad = ctx.createLinearGradient(0, 0, width, 0);
    sepGrad.addColorStop(0, 'transparent');
    sepGrad.addColorStop(0.3, COLORS.accent);
    sepGrad.addColorStop(0.7, '#CC88FF');
    sepGrad.addColorStop(1, 'transparent');
    ctx.fillStyle = sepGrad;
    ctx.fillRect(0, y + SIZES.headerHeight - 1, width, 1);

    // Arcane rune decorations
    ctx.font = '16px serif';
    ctx.fillStyle = 'rgba(153, 102, 255, 0.25)';
    ctx.fillText('✦', 4, y + 8);
    ctx.fillText('✦', width - 20, y + 8);

    // Title with glow
    ctx.shadowColor = COLORS.accent;
    ctx.shadowBlur = 8;
    ctx.fillStyle = '#C8A0FF';
    ctx.font = 'bold 13px monospace';
    ctx.fillText('📖 SPELLBOOK', SIZES.padding + 18, y + 11);
    ctx.shadowBlur = 0;

    // Spell count
    const registry = getSpellRegistry();
    if (!registry) {
      return y + SIZES.headerHeight;
    }

    const stateManager = getMagicSystemState();
    if (!stateManager) {
      return y + SIZES.headerHeight;
    }

    const activeParadigms = stateManager.getActiveParadigms();
    let spellCount = 0;
    for (const paradigm of activeParadigms) {
      spellCount += registry.getUnlockedSpellsByParadigm(paradigm.id).length;
    }

    ctx.fillStyle = 'rgba(180, 140, 255, 0.7)';
    ctx.font = '10px monospace';
    const countText = `${spellCount} spells`;
    const countWidth = ctx.measureText(countText).width;
    ctx.fillText(countText, width - countWidth - SIZES.padding, y + 13);

    return y + SIZES.headerHeight;
  }

  private renderManaBar(ctx: CanvasRenderingContext2D, width: number, y: number): number {
    const barX = SIZES.padding;
    const barY = y + 5;
    const barW = width - SIZES.padding * 2;
    const barH = SIZES.manaBarHeight - 10;
    const pct = this.playerMana / this.playerMaxMana;
    const fillW = pct * barW;

    // Track background
    ctx.fillStyle = 'rgba(0, 20, 60, 0.7)';
    ctx.beginPath();
    (ctx as any).roundRect(barX, barY, barW, barH, 4);
    ctx.fill();

    // Gradient fill — depleted near 0 goes to dimmer blue
    if (fillW > 0) {
      const manaGrad = ctx.createLinearGradient(barX, 0, barX + fillW, 0);
      manaGrad.addColorStop(0, pct < 0.25 ? '#1a3a6a' : '#1a5acc');
      manaGrad.addColorStop(0.6, pct < 0.25 ? '#4466aa' : '#4499ff');
      manaGrad.addColorStop(1, pct < 0.25 ? '#6688bb' : '#88ccff');
      ctx.fillStyle = manaGrad;
      ctx.beginPath();
      (ctx as any).roundRect(barX, barY, fillW, barH, 4);
      ctx.fill();

      // Shimmer highlight strip at top
      const shimGrad = ctx.createLinearGradient(barX, barY, barX, barY + barH / 2);
      shimGrad.addColorStop(0, 'rgba(255,255,255,0.12)');
      shimGrad.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = shimGrad;
      ctx.beginPath();
      (ctx as any).roundRect(barX, barY, fillW, barH / 2, 4);
      ctx.fill();
    }

    // Animated shimmer pulse (sweeps across full bar when mana > 50%)
    if (pct > 0.5) {
      const now = performance.now();
      const shimmerPos = ((now / 1200) % 1) * barW;
      const shimGrad2 = ctx.createLinearGradient(barX + shimmerPos - 20, 0, barX + shimmerPos + 20, 0);
      shimGrad2.addColorStop(0, 'rgba(180,220,255,0)');
      shimGrad2.addColorStop(0.5, 'rgba(180,220,255,0.18)');
      shimGrad2.addColorStop(1, 'rgba(180,220,255,0)');
      ctx.fillStyle = shimGrad2;
      ctx.beginPath();
      (ctx as any).roundRect(barX, barY, fillW, barH, 4);
      ctx.fill();
    }

    // Border
    ctx.strokeStyle = 'rgba(80, 140, 220, 0.5)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    (ctx as any).roundRect(barX, barY, barW, barH, 4);
    ctx.stroke();

    // Mana text overlay
    ctx.fillStyle = '#e0f0ff';
    ctx.font = 'bold 10px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(
      `✨ ${Math.floor(this.playerMana)} / ${this.playerMaxMana} MANA`,
      width / 2,
      barY + 3
    );
    ctx.textAlign = 'left';

    return y + SIZES.manaBarHeight;
  }

  private renderFilters(ctx: CanvasRenderingContext2D, width: number, y: number): number {
    const filters: { id: FilterMode; label: string; color: string; emoji: string }[] = [
      { id: 'all',        label: 'All',    color: '#c8a0ff', emoji: '✦' },
      { id: 'fire',       label: 'Fire',   color: COLORS.fire,       emoji: '🔥' },
      { id: 'protection', label: 'Ward',   color: COLORS.protection, emoji: '🛡️' },
      { id: 'restoration',label: 'Heal',   color: COLORS.restoration,emoji: '💚' },
      { id: 'divination', label: 'Divine', color: COLORS.divination, emoji: '🔮' },
    ];

    // Strip background
    const stripGrad = ctx.createLinearGradient(0, y, 0, y + SIZES.filterHeight);
    stripGrad.addColorStop(0, 'rgba(25, 15, 55, 0.85)');
    stripGrad.addColorStop(1, 'rgba(15, 10, 40, 0.85)');
    ctx.fillStyle = stripGrad;
    ctx.fillRect(0, y, width, SIZES.filterHeight);

    const tabW = Math.floor((width - SIZES.padding * 2) / filters.length);
    let x = SIZES.padding;

    for (const f of filters) {
      const isActive = this.filter === f.id;
      const tw = tabW - 3;
      const th = SIZES.filterHeight - 6;
      const ty = y + 3;

      // Tab pill
      ctx.beginPath();
      (ctx as any).roundRect(x, ty, tw, th, 5);

      if (isActive) {
        const activeGrad = ctx.createLinearGradient(x, ty, x, ty + th);
        activeGrad.addColorStop(0, 'rgba(130, 70, 220, 0.55)');
        activeGrad.addColorStop(1, 'rgba(80, 40, 150, 0.55)');
        ctx.fillStyle = activeGrad;
        ctx.fill();

        // Glow border
        ctx.shadowColor = f.color;
        ctx.shadowBlur = 6;
        ctx.strokeStyle = f.color;
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.shadowBlur = 0;
      } else {
        ctx.fillStyle = 'rgba(40, 28, 70, 0.4)';
        ctx.fill();
        ctx.strokeStyle = 'rgba(100, 70, 160, 0.3)';
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      // Label
      ctx.fillStyle = isActive ? f.color : COLORS.textMuted;
      ctx.font = isActive ? 'bold 9px monospace' : '9px monospace';
      ctx.textAlign = 'center';
      // Emoji + text
      ctx.fillText(`${f.emoji} ${f.label}`, x + tw / 2, ty + 5);
      ctx.textAlign = 'left';

      this.clickRegions.push({
        x,
        y: ty,
        width: tw,
        height: th,
        action: 'filter',
        data: f.id,
      });

      x += tabW;
    }

    return y + SIZES.filterHeight;
  }

  private renderSpellList(ctx: CanvasRenderingContext2D, width: number, y: number): number {
    const registry = getSpellRegistry();
    if (!registry) {
      return y;
    }

    const stateManager = getMagicSystemState();
    if (!stateManager) {
      return y;
    }

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
    const schoolColor = this.getSchoolColor(spell.school);
    const cardX = SIZES.padding / 2;
    const cardY = y + 2;
    const cardW = width - SIZES.padding;
    const cardH = rowHeight - 4;

    // Card background gradient
    const cardGrad = ctx.createLinearGradient(cardX, cardY, cardX + cardW, cardY);
    if (isSelected) {
      cardGrad.addColorStop(0, 'rgba(60, 35, 100, 0.95)');
      cardGrad.addColorStop(1, 'rgba(35, 20, 65, 0.95)');
    } else {
      cardGrad.addColorStop(0, 'rgba(28, 18, 52, 0.88)');
      cardGrad.addColorStop(1, 'rgba(18, 12, 38, 0.88)');
    }
    ctx.fillStyle = cardGrad;
    ctx.beginPath();
    (ctx as any).roundRect(cardX, cardY, cardW, cardH, 6);
    ctx.fill();

    // 3px school-color left accent bar
    ctx.fillStyle = schoolColor;
    ctx.beginPath();
    (ctx as any).roundRect(cardX, cardY, 3, cardH, [6, 0, 0, 6]);
    ctx.fill();

    // Card border
    if (isSelected) {
      ctx.shadowColor = schoolColor;
      ctx.shadowBlur = 8;
      ctx.strokeStyle = schoolColor;
      ctx.lineWidth = 1.5;
    } else {
      ctx.strokeStyle = 'rgba(100, 70, 160, 0.35)';
      ctx.lineWidth = 1;
    }
    ctx.beginPath();
    (ctx as any).roundRect(cardX, cardY, cardW, cardH, 6);
    ctx.stroke();
    ctx.shadowBlur = 0;

    const textX = cardX + 10;

    // Hotkey badge
    if (state?.hotkey) {
      ctx.fillStyle = 'rgba(255, 215, 0, 0.15)';
      ctx.beginPath();
      (ctx as any).roundRect(textX, cardY + 6, 22, 14, 3);
      ctx.fill();
      ctx.fillStyle = COLORS.hotkey;
      ctx.font = 'bold 9px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(`${state.hotkey}`, textX + 11, cardY + 8);
      ctx.textAlign = 'left';
    }

    // School emoji + spell name
    const nameX = textX + (state?.hotkey ? 26 : 0);
    const schoolEmoji = this.getSchoolEmoji(spell.school);
    ctx.fillStyle = schoolColor;
    ctx.font = 'bold 11px monospace';
    ctx.fillText(`${schoolEmoji} ${spell.name}`, nameX, cardY + 8);

    // Mana cost pill
    const canCast = this.playerMana >= spell.manaCost;
    const costText = `✨${spell.manaCost}`;
    ctx.font = '10px monospace';
    const costW = ctx.measureText(costText).width + 8;
    const costX = cardX + cardW - costW - 4;
    const costY = cardY + 5;

    ctx.fillStyle = canCast ? 'rgba(20, 60, 140, 0.5)' : 'rgba(60, 20, 20, 0.5)';
    ctx.beginPath();
    (ctx as any).roundRect(costX, costY, costW, 14, 4);
    ctx.fill();
    ctx.fillStyle = canCast ? '#88ccff' : '#ff8888';
    ctx.fillText(costText, costX + 4, costY + 2);

    // Description
    ctx.fillStyle = 'rgba(180, 170, 210, 0.75)';
    ctx.font = '9px monospace';
    const maxDescLen = Math.floor((cardW - 16) / 5.5);
    const desc = spell.description.length > maxDescLen
      ? spell.description.substring(0, maxDescLen - 3) + '...'
      : spell.description;
    ctx.fillText(desc, textX, cardY + 24);

    // Proficiency bar (rounded gradient)
    const proficiency = state?.proficiency ?? 0;
    const barX = textX;
    const barY = cardY + 38;
    const barWidth = 90;
    const barHeight = 6;
    const profColor = this.getProficiencyColor(proficiency);

    ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
    ctx.beginPath();
    (ctx as any).roundRect(barX, barY, barWidth, barHeight, 3);
    ctx.fill();

    if (proficiency > 0) {
      const profGrad = ctx.createLinearGradient(barX, 0, barX + barWidth, 0);
      profGrad.addColorStop(0, profColor + '88');
      profGrad.addColorStop(1, profColor);
      ctx.fillStyle = profGrad;
      ctx.beginPath();
      (ctx as any).roundRect(barX, barY, (proficiency / 100) * barWidth, barHeight, 3);
      ctx.fill();
    }

    ctx.fillStyle = 'rgba(180, 180, 200, 0.6)';
    ctx.font = '8px monospace';
    ctx.fillText(`${Math.floor(proficiency)}%`, barX + barWidth + 4, barY);

    // Mishap warning badge
    const spellRegistry = getSpellRegistry();
    if (spellRegistry) {
      const mishapChance = spellRegistry.getMishapChance(spell.id);
      if (mishapChance > 0.05) {
        const mishapText = `⚠ ${Math.floor(mishapChance * 100)}%`;
        const mishapW = ctx.measureText(mishapText).width + 8;
        const mishapX = barX + barWidth + 26;
        const mishapY = barY - 1;
        ctx.fillStyle = 'rgba(180, 40, 40, 0.35)';
        ctx.beginPath();
        (ctx as any).roundRect(mishapX, mishapY, mishapW, 10, 3);
        ctx.fill();
        ctx.fillStyle = '#FF8888';
        ctx.font = '8px monospace';
        ctx.fillText(mishapText, mishapX + 4, mishapY);
      }
    }

    // Click region
    this.clickRegions.push({
      x: cardX,
      y: cardY,
      width: cardW,
      height: cardH,
      action: 'select_spell',
      data: spell.id,
    });

    return y + rowHeight;
  }

  private renderDetailPanel(ctx: CanvasRenderingContext2D, width: number, height: number): void {
    const registry = getSpellRegistry();
    if (!registry) {
      return;
    }

    const spell = registry.getSpell(this.selectedSpellId!);
    const state = registry.getPlayerState(this.selectedSpellId!);

    if (!spell) return;

    const panelY = height - SIZES.detailHeight;
    const schoolColor = this.getSchoolColor(spell.school);
    const canCast = this.playerMana >= spell.manaCost;

    // Background gradient
    const bgGrad = ctx.createLinearGradient(0, panelY, 0, height);
    bgGrad.addColorStop(0, 'rgba(28, 16, 58, 0.98)');
    bgGrad.addColorStop(1, 'rgba(15, 10, 35, 0.98)');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, panelY, width, SIZES.detailHeight);

    // Top accent border — school color glow
    const sepGrad = ctx.createLinearGradient(0, 0, width, 0);
    sepGrad.addColorStop(0, 'transparent');
    sepGrad.addColorStop(0.25, schoolColor);
    sepGrad.addColorStop(0.75, schoolColor);
    sepGrad.addColorStop(1, 'transparent');
    ctx.shadowColor = schoolColor;
    ctx.shadowBlur = 6;
    ctx.fillStyle = sepGrad;
    ctx.fillRect(0, panelY, width, 2);
    ctx.shadowBlur = 0;

    let y = panelY + SIZES.padding;

    // Spell name with school emoji
    const emoji = this.getSchoolEmoji(spell.school);
    ctx.shadowColor = schoolColor;
    ctx.shadowBlur = 6;
    ctx.fillStyle = schoolColor;
    ctx.font = 'bold 13px monospace';
    ctx.fillText(`${emoji} ${spell.name}`, SIZES.padding, y);
    ctx.shadowBlur = 0;

    // CAST button with animated pulse when ready
    const castBtnX = width - 80 - SIZES.padding;
    const castBtnY = y - 4;
    const castBtnW = 80;
    const castBtnH = 24;

    if (canCast) {
      const pulse = 0.7 + 0.3 * Math.abs(Math.sin(performance.now() / 500));
      ctx.shadowColor = COLORS.accent;
      ctx.shadowBlur = 10 * pulse;
      const btnGrad = ctx.createLinearGradient(castBtnX, castBtnY, castBtnX, castBtnY + castBtnH);
      btnGrad.addColorStop(0, `rgba(130, 60, 230, ${0.8 * pulse})`);
      btnGrad.addColorStop(1, `rgba(80, 30, 160, ${0.8 * pulse})`);
      ctx.fillStyle = btnGrad;
    } else {
      ctx.shadowBlur = 0;
      ctx.fillStyle = 'rgba(50, 45, 60, 0.7)';
    }
    ctx.beginPath();
    (ctx as any).roundRect(castBtnX, castBtnY, castBtnW, castBtnH, 5);
    ctx.fill();
    ctx.shadowBlur = 0;

    if (canCast) {
      ctx.strokeStyle = `rgba(180, 120, 255, 0.8)`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      (ctx as any).roundRect(castBtnX, castBtnY, castBtnW, castBtnH, 5);
      ctx.stroke();
    }

    ctx.fillStyle = canCast ? '#e0d0ff' : COLORS.textDim;
    ctx.font = 'bold 11px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('⚡ CAST', castBtnX + castBtnW / 2, castBtnY + 7);
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

    // Description
    ctx.fillStyle = '#d0c8e8';
    ctx.font = '10px monospace';
    const maxLen = Math.floor((width - SIZES.padding * 2 - castBtnW - 8) / 5.5);
    const desc = spell.description.length > maxLen
      ? spell.description.substring(0, maxLen - 3) + '...'
      : spell.description;
    ctx.fillText(desc, SIZES.padding, y);
    y += 16;

    // Stats grid — technique | form | range
    ctx.fillStyle = 'rgba(160, 140, 200, 0.6)';
    ctx.font = '9px monospace';
    ctx.fillText(
      `⚙ ${spell.technique}  ·  ${spell.form}  ·  📍${spell.range}t`,
      SIZES.padding,
      y
    );
    y += 14;

    ctx.fillText(
      `⏱ ${(spell.castTime / 20).toFixed(1)}s cast  ·  ` +
      (spell.duration ? `⏳ ${(spell.duration / 20).toFixed(0)}s duration` : '⚡ Instant'),
      SIZES.padding,
      y
    );
    y += 14;

    // Hotkey assignment hint
    ctx.fillStyle = 'rgba(255, 215, 0, 0.6)';
    ctx.font = '9px monospace';
    if (state?.hotkey) {
      ctx.fillText(`🔑 Hotkey [${state.hotkey}] — press 1–9 to reassign`, SIZES.padding, y);
    } else {
      ctx.fillText('🔑 Press 1–9 to assign hotkey', SIZES.padding, y);
    }
    y += 14;

    // Times cast
    ctx.fillStyle = 'rgba(140, 120, 180, 0.5)';
    ctx.font = '9px monospace';
    ctx.fillText(`✦ Cast ${state?.timesCast ?? 0} times`, SIZES.padding, y);
  }

  private getSchoolEmoji(school?: string): string {
    switch (school) {
      case 'fire': return '🔥';
      case 'protection': return '🛡️';
      case 'restoration': return '💚';
      case 'divination': return '🔮';
      case 'combat': return '⚔️';
      default: return '✦';
    }
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
    const registry = getSpellRegistry();
    if (!registry) {
      return false;
    }

    // Hotkey assignment when spell is selected
    if (this.selectedSpellId && key >= '1' && key <= '9') {
      const hotkey = parseInt(key, 10);
      registry.assignHotkey(this.selectedSpellId, hotkey);
      return true;
    }

    // Quick cast via hotkey
    if (key >= '1' && key <= '9') {
      const hotkey = parseInt(key, 10);
      const spell = registry.getSpellByHotkey(hotkey);
      if (spell) {
        this.castSpell(spell.id);
        return true;
      }
    }

    return false;
  }

  private castSpell(spellId: string): void {
    const registry = getSpellRegistry();
    if (!registry) {
      return;
    }

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
