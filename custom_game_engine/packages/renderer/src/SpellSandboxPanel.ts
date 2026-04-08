/**
 * SpellSandboxPanel — Research Casting Circle UI
 *
 * Lets players combine verb + noun tokens within a magic paradigm to discover
 * new spells via LLM generation. Results are displayed as parchment-style scroll
 * cards and collected in a Spellbook section below.
 *
 * Layout:
 *   ┌────────────────────────────────┐
 *   │  Paradigm: [dropdown]          │
 *   │  Verb:  [palette]              │
 *   │  Noun:  [palette]              │
 *   │       [ Cast ]                 │
 *   │  ╔══ Spell Scroll ═══╗         │
 *   │  ║ Title             ║         │
 *   │  ║ Description...    ║         │
 *   │  ╚═══════════════════╝         │
 *   │  ── Spellbook ────────         │
 *   │  • Ember Thought (fire:ignite) │
 *   └────────────────────────────────┘
 */

import type { IWindowPanel } from './types/WindowTypes.js';
import { SpellSandboxService } from '@ai-village/llm';
import type { SpellResult } from '@ai-village/llm';

// ============================================================================
// Token palettes
// ============================================================================

const VERB_TOKENS = [
  'Ignite', 'Bind', 'Reveal', 'Summon', 'Transform',
  'Silence', 'Grow', 'Shatter', 'Mend', 'Banish',
  'Weave', 'Quicken', 'Draw', 'Speak', 'Wither',
];

const NOUN_TOKENS = [
  'Stone', 'Memory', 'Rain', 'Shadow', 'Flame',
  'Bond', 'Time', 'Seed', 'Soul', 'Wind',
  'Iron', 'Grief', 'Light', 'Dream', 'Beast',
];

// Lightweight paradigm list — no heavy magic package import needed in renderer.
// Matches paradigm IDs used in SpellComposition.
const PARADIGMS: Array<{ id: string; name: string; lore: string }> = [
  { id: 'academic',   name: 'The Academies',    lore: 'Magic is a science of precise formulae.' },
  { id: 'tethermancy',   name: 'Tethermancy',          lore: 'Like affects like across any distance.' },
  { id: 'ferromancy',  name: 'Ferromancy',         lore: 'Power is burned from ingested metals.' },
  { id: 'dream',      name: 'Dream Magic',       lore: 'Reality is shaped through lucid dreaming.' },
  { id: 'song',       name: 'Song Magic',        lore: 'Melodies bind and release natural forces.' },
  { id: 'rune',       name: 'Runic Art',         lore: 'Carved symbols channel elemental truths.' },
  { id: 'shinto',     name: 'Shinto Kami',       lore: 'Spirits of place grant boons to the worthy.' },
  { id: 'blood',      name: 'Blood Magic',       lore: 'Vitality itself is the price and the power.' },
  { id: 'animist',    name: 'Animism',           lore: 'Every stone and river holds a living spirit.' },
  { id: 'debt',       name: 'Debt Magic',        lore: 'Power borrowed must always be repaid.' },
  { id: 'belief',     name: 'Belief Weaving',    lore: 'Collective faith reshapes physical truth.' },
  { id: 'silence',    name: 'Silence',           lore: 'In perfect stillness, all things become possible.' },
];

// ============================================================================
// Paradigm visual effects (glow colour + particle palette)
// ============================================================================

interface ParadigmFx {
  glow: string;
  particles: readonly string[];
}

const PARADIGM_FX: Record<string, ParadigmFx> = {
  academic:  { glow: '#88CCFF', particles: ['rgba(136,204,255,0.95)', 'rgba(180,225,255,0.85)', 'rgba(255,255,255,0.80)'] },
  tethermancy:  { glow: '#FF88CC', particles: ['rgba(255,136,200,0.95)', 'rgba(255,180,220,0.85)', 'rgba(255,220,240,0.75)'] },
  ferromancy: { glow: '#CCCCCC', particles: ['rgba(180,180,180,0.95)', 'rgba(220,220,220,0.85)', 'rgba(255,220,160,0.80)'] },
  dream:     { glow: '#CC88FF', particles: ['rgba(180,100,255,0.95)', 'rgba(220,160,255,0.85)', 'rgba(255,200,255,0.75)'] },
  song:      { glow: '#88FFCC', particles: ['rgba(100,255,200,0.95)', 'rgba(160,255,220,0.85)', 'rgba(220,255,240,0.75)'] },
  rune:      { glow: '#FF8844', particles: ['rgba(255,120,40,0.95)',  'rgba(255,180,80,0.85)',  'rgba(255,220,140,0.75)'] },
  shinto:    { glow: '#FFDD44', particles: ['rgba(255,220,60,0.95)',  'rgba(255,240,120,0.85)', 'rgba(255,255,200,0.75)'] },
  blood:     { glow: '#FF2244', particles: ['rgba(220,30,50,0.95)',   'rgba(180,20,20,0.88)',   'rgba(255,80,60,0.80)'] },
  animist:   { glow: '#66FF88', particles: ['rgba(80,220,100,0.95)',  'rgba(140,255,160,0.85)', 'rgba(200,255,200,0.75)'] },
  debt:      { glow: '#FF9944', particles: ['rgba(255,140,40,0.95)',  'rgba(255,180,100,0.85)', 'rgba(255,210,160,0.75)'] },
  belief:    { glow: '#FFAAFF', particles: ['rgba(255,140,255,0.95)', 'rgba(220,180,255,0.85)', 'rgba(255,220,255,0.75)'] },
  silence:   { glow: '#AAFFEE', particles: ['rgba(160,255,235,0.95)', 'rgba(200,255,245,0.85)', 'rgba(255,255,255,0.70)'] },
};

const DEFAULT_FX: ParadigmFx = {
  glow: '#9966FF',
  particles: ['rgba(180,100,255,0.95)', 'rgba(220,160,255,0.85)', 'rgba(255,200,255,0.75)'],
};

// ============================================================================
// Screen-space particle system (UI layer — no camera needed)
// ============================================================================

interface UIParticle {
  x: number; y: number;
  vx: number; vy: number;
  life: number;    // ms remaining
  maxLife: number; // ms total
  color: string;
  size: number;    // px radius
}

// ============================================================================
// Colours & sizes
// ============================================================================

const C = {
  bg:            'rgba(10, 7, 20, 0.97)',
  headerBg:      'rgba(20, 12, 40, 0.95)',
  tokenBg:       'rgba(30, 20, 55, 0.85)',
  tokenSelected: 'rgba(90, 50, 170, 0.95)',
  tokenHover:    'rgba(55, 35, 100, 0.9)',
  scrollBg:      'rgba(45, 28, 18, 0.92)',
  scrollBorder:  '#8B6B3D',
  scrollGold:    '#C8A855',
  spellbookBg:   'rgba(15, 10, 30, 0.9)',
  text:          '#F0E8D0',
  textMuted:     '#9A8870',
  textDim:       '#5A5040',
  accent:        '#9966FF',
  accentGlow:    'rgba(153, 102, 255, 0.3)',
  castBtn:       'rgba(100, 50, 200, 0.9)',
  castBtnHover:  'rgba(140, 80, 255, 0.95)',
  castBtnActive: 'rgba(70, 30, 150, 0.95)',
  discovery:     '#FFD700',
  power: {
    minor:     '#888888',
    moderate:  '#4488FF',
    major:     '#AA44FF',
    legendary: '#FFD700',
  } as Record<string, string>,
  border:        'rgba(100, 70, 160, 0.5)',
};

const S = {
  pad:          12,
  headerH:      36,
  tokenH:       26,
  tokenGap:     4,
  tokenPadX:    8,
  castH:        34,
  scrollPad:    14,
  rowH:         22,
  sectionGap:   10,
};

// ============================================================================
// State & click regions
// ============================================================================

type CastState = 'idle' | 'casting' | 'result' | 'error';

interface ClickRegion {
  x: number; y: number; width: number; height: number;
  action: 'select-verb' | 'select-noun' | 'select-paradigm' | 'cast' | 'scroll-spellbook';
  data?: string;
}

// ============================================================================
// SpellSandboxPanel
// ============================================================================

export class SpellSandboxPanel implements IWindowPanel {
  private visible = false;
  private selectedVerb: string = VERB_TOKENS[0]!;
  private selectedNoun: string = NOUN_TOKENS[0]!;
  private selectedParadigmIdx = 0;
  private castState: CastState = 'idle';
  private castResult: SpellResult | null = null;
  private castError = '';
  /** Callback invoked when a spell with a world effect is cast */
  private onWorldEffectCallback: ((effect: string, spellTitle: string, verb: string, noun: string) => void) | null = null;
  private spellbook: SpellResult[] = [];
  private spellbookScroll = 0;
  private clickRegions: ClickRegion[] = [];
  private castBtnHover = false;
  private scrollUnfurl = 0; // 0..1 animation progress
  private lastFrameTime = 0;
  private animFrameId: number | null = null;
  private service: SpellSandboxService;

  // Visual effects
  private uiParticles: UIParticle[] = [];
  private glowProgress = 0;    // 1 → 0 over ~1.5s after spell result
  private glowColor = '#9966FF';
  private castPulse = 0;       // 0..1 oscillating while casting (sine-driven)
  private lastRenderTime = 0;
  private castBtnCenterX = 0;
  private castBtnCenterY = 0;

  constructor() {
    this.service = SpellSandboxService.getInstance();
  }

  // ── IWindowPanel ──────────────────────────────────────────────────────────

  /**
   * Set callback for when a spell with a world effect is cast.
   * The game layer uses this to dispatch actual world effects via EventBus.
   */
  setOnWorldEffect(cb: (effect: string, spellTitle: string, verb: string, noun: string) => void): void {
    this.onWorldEffectCallback = cb;
  }

  getId(): string { return 'spell-sandbox'; }
  getTitle(): string { return 'Research Casting Circle'; }
  getDefaultWidth(): number { return 440; }
  getDefaultHeight(): number { return 640; }
  isVisible(): boolean { return this.visible; }

  setVisible(visible: boolean): void {
    this.visible = visible;
  }

  toggle(): void {
    this.visible = !this.visible;
  }

  // ── Render ────────────────────────────────────────────────────────────────

  render(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number,
  ): void {
    const now = performance.now();
    const dt = this.lastRenderTime > 0 ? now - this.lastRenderTime : 0;
    this.lastRenderTime = now;

    // Tick effects
    this.tickEffects(dt);

    this.clickRegions = [];
    let cy = y;

    // Background
    ctx.fillStyle = C.bg;
    ctx.fillRect(x, y, width, height);

    // Header
    cy = this.drawHeader(ctx, x, cy, width);

    // Paradigm selector
    cy = this.drawParadigmSelector(ctx, x, cy, width);

    // Token palettes
    cy = this.drawTokenPalette(ctx, x, cy, width, 'Verb', VERB_TOKENS, this.selectedVerb, 'select-verb');
    cy = this.drawTokenPalette(ctx, x, cy, width, 'Noun', NOUN_TOKENS, this.selectedNoun, 'select-noun');

    // Cast button
    cy = this.drawCastButton(ctx, x, cy, width);

    // Spell scroll card
    cy = this.drawSpellScroll(ctx, x, cy, width);

    // Spellbook
    this.drawSpellbook(ctx, x, cy, width, height - (cy - y));

    // UI particles (drawn on top)
    this.renderUIParticles(ctx);
  }

  // ── Draw sections ─────────────────────────────────────────────────────────

  private drawHeader(ctx: CanvasRenderingContext2D, x: number, y: number, w: number): number {
    ctx.fillStyle = C.headerBg;
    ctx.fillRect(x, y, w, S.headerH);

    // Runic decorations
    ctx.fillStyle = C.accent;
    ctx.font = '14px serif';
    ctx.fillText('✦', x + 10, y + S.headerH / 2 + 5);
    ctx.fillText('✦', x + w - 24, y + S.headerH / 2 + 5);

    ctx.fillStyle = C.text;
    ctx.font = 'bold 14px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Research Casting Circle', x + w / 2, y + S.headerH / 2 + 5);
    ctx.textAlign = 'left';

    // Border bottom
    ctx.strokeStyle = C.border;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x, y + S.headerH);
    ctx.lineTo(x + w, y + S.headerH);
    ctx.stroke();

    return y + S.headerH;
  }

  private drawParadigmSelector(ctx: CanvasRenderingContext2D, x: number, y: number, w: number): number {
    const rowY = y + S.sectionGap;
    const paradigm = PARADIGMS[this.selectedParadigmIdx]!;
    const labelW = 60;
    const selectorH = 24;
    const selectorW = w - S.pad * 2 - labelW;

    ctx.fillStyle = C.textMuted;
    ctx.font = '11px sans-serif';
    ctx.fillText('Paradigm:', x + S.pad, rowY + 16);

    const selX = x + S.pad + labelW;
    ctx.fillStyle = C.tokenBg;
    ctx.beginPath();
    roundRect(ctx, selX, rowY, selectorW, selectorH, 4);
    ctx.fill();
    ctx.strokeStyle = C.border;
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.fillStyle = C.text;
    ctx.font = '12px sans-serif';
    ctx.fillText(paradigm.name, selX + 8, rowY + 16);

    // Arrows
    ctx.fillStyle = C.accent;
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText('▾', selX + selectorW - 6, rowY + 16);
    ctx.textAlign = 'left';

    this.clickRegions.push({ x: selX, y: rowY, width: selectorW, height: selectorH, action: 'select-paradigm' });

    // Lore line
    ctx.fillStyle = C.textDim;
    ctx.font = 'italic 10px sans-serif';
    ctx.fillText(paradigm.lore, x + S.pad, rowY + selectorH + 14);

    return rowY + selectorH + 18;
  }

  private drawTokenPalette(
    ctx: CanvasRenderingContext2D,
    x: number, y: number, w: number,
    label: string,
    tokens: string[],
    selected: string,
    action: 'select-verb' | 'select-noun',
  ): number {
    const startY = y + 6;

    ctx.fillStyle = C.textMuted;
    ctx.font = '11px sans-serif';
    ctx.fillText(label + ':', x + S.pad, startY + 14);

    const paletteX = x + S.pad + 38;
    const availW = w - S.pad * 2 - 38;
    let rowX = paletteX;
    let rowY = startY;
    const rowH = S.tokenH;

    // Wrap tokens into rows
    const rows: string[][] = [];
    let curRow: string[] = [];
    let curW = 0;

    for (const tok of tokens) {
      const tw = this.measureToken(ctx, tok);
      if (curW + tw + S.tokenGap > availW && curRow.length > 0) {
        rows.push(curRow);
        curRow = [tok];
        curW = tw + S.tokenGap;
      } else {
        curRow.push(tok);
        curW += tw + S.tokenGap;
      }
    }
    if (curRow.length > 0) rows.push(curRow);

    rowX = paletteX;
    for (const row of rows) {
      for (const tok of row) {
        const tw = this.measureToken(ctx, tok);
        const isSelected = tok === selected;

        ctx.fillStyle = isSelected ? C.tokenSelected : C.tokenBg;
        ctx.beginPath();
        roundRect(ctx, rowX, rowY, tw, rowH, 4);
        ctx.fill();

        if (isSelected) {
          ctx.strokeStyle = C.accent;
          ctx.lineWidth = 1.5;
          ctx.stroke();
          // Glow
          ctx.shadowColor = C.accentGlow;
          ctx.shadowBlur = 6;
        } else {
          ctx.strokeStyle = C.border;
          ctx.lineWidth = 0.5;
          ctx.stroke();
        }
        ctx.shadowBlur = 0;

        ctx.fillStyle = isSelected ? '#FFFFFF' : C.text;
        ctx.font = '11px sans-serif';
        ctx.fillText(tok, rowX + S.tokenPadX, rowY + rowH / 2 + 4);

        this.clickRegions.push({ x: rowX, y: rowY, width: tw, height: rowH, action, data: tok });
        rowX += tw + S.tokenGap;
      }
      rowX = paletteX;
      rowY += rowH + S.tokenGap;
    }

    return rowY + 4;
  }

  private measureToken(ctx: CanvasRenderingContext2D, tok: string): number {
    ctx.font = '11px sans-serif';
    return ctx.measureText(tok).width + S.tokenPadX * 2;
  }

  private drawCastButton(ctx: CanvasRenderingContext2D, x: number, y: number, w: number): number {
    const btnW = 120;
    const btnX = x + (w - btnW) / 2;
    const btnY = y + 8;

    // Track center for particle spawning
    this.castBtnCenterX = btnX + btnW / 2;
    this.castBtnCenterY = btnY + S.castH / 2;

    const isCasting = this.castState === 'casting';

    // Glow aura ring — shown when spell lands (glowProgress > 0) or while casting
    if (this.glowProgress > 0) {
      const radius = 60 + (1 - this.glowProgress) * 20;
      const alpha = this.glowProgress * 0.6;
      const grad = ctx.createRadialGradient(
        this.castBtnCenterX, this.castBtnCenterY, radius * 0.2,
        this.castBtnCenterX, this.castBtnCenterY, radius,
      );
      grad.addColorStop(0, hexToRgba(this.glowColor, alpha));
      grad.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(this.castBtnCenterX, this.castBtnCenterY, radius, 0, Math.PI * 2);
      ctx.fill();
    } else if (isCasting && this.castPulse > 0) {
      // Pulsing ring while casting
      const radius = 44 + this.castPulse * 10;
      const alpha = 0.25 + this.castPulse * 0.2;
      ctx.strokeStyle = C.accent;
      ctx.lineWidth = 2;
      ctx.globalAlpha = alpha;
      ctx.beginPath();
      ctx.arc(this.castBtnCenterX, this.castBtnCenterY, radius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }

    ctx.fillStyle = isCasting ? C.castBtnActive : (this.castBtnHover ? C.castBtnHover : C.castBtn);
    ctx.beginPath();
    roundRect(ctx, btnX, btnY, btnW, S.castH, 6);
    ctx.fill();

    if (!isCasting) {
      ctx.shadowColor = this.glowProgress > 0 ? this.glowColor : C.accentGlow;
      ctx.shadowBlur = this.glowProgress > 0 ? 18 * this.glowProgress : 10;
    }

    ctx.strokeStyle = isCasting ? C.accent : C.scrollGold;
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.shadowBlur = 0;

    ctx.fillStyle = isCasting ? C.textMuted : C.scrollGold;
    ctx.font = `bold 13px sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText(isCasting ? '✦ Casting…' : '✦  Cast  ✦', btnX + btnW / 2, btnY + S.castH / 2 + 5);
    ctx.textAlign = 'left';

    this.clickRegions.push({ x: btnX, y: btnY, width: btnW, height: S.castH, action: 'cast' });

    return btnY + S.castH + 8;
  }

  private drawSpellScroll(ctx: CanvasRenderingContext2D, x: number, y: number, w: number): number {
    if (this.castState === 'idle') return y;

    if (this.castState === 'error') {
      ctx.fillStyle = '#FF6666';
      ctx.font = '11px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('✗ ' + this.castError, x + w / 2, y + 20);
      ctx.textAlign = 'left';
      return y + 36;
    }

    if (this.castState === 'casting') {
      ctx.fillStyle = C.textMuted;
      ctx.font = 'italic 11px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('The circle pulses…', x + w / 2, y + 20);
      ctx.textAlign = 'left';
      return y + 36;
    }

    // result
    const result = this.castResult;
    if (!result) return y;

    const scrollX = x + S.pad;
    const scrollW = w - S.pad * 2;
    const unfurl = this.scrollUnfurl;

    // Parchment background
    const scrollH = Math.round(130 * unfurl);
    ctx.fillStyle = C.scrollBg;
    ctx.beginPath();
    roundRect(ctx, scrollX, y, scrollW, scrollH, 6);
    ctx.fill();

    ctx.strokeStyle = C.scrollBorder;
    ctx.lineWidth = 2;
    ctx.stroke();

    // Scroll decorative lines top/bottom
    ctx.strokeStyle = 'rgba(200, 168, 85, 0.3)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(scrollX + 10, y + 12);
    ctx.lineTo(scrollX + scrollW - 10, y + 12);
    ctx.stroke();

    if (unfurl > 0.85) {
      ctx.beginPath();
      ctx.moveTo(scrollX + 10, y + scrollH - 12);
      ctx.lineTo(scrollX + scrollW - 10, y + scrollH - 12);
      ctx.stroke();
    }

    if (unfurl < 0.5) return y + scrollH + 6;

    const alpha = Math.min(1, (unfurl - 0.5) * 2);
    ctx.globalAlpha = alpha;

    // Power level badge
    const powerColor = (C.power[result.powerLevel] ?? C.power['minor'])!;
    ctx.fillStyle = powerColor;
    ctx.font = 'bold 9px sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(result.powerLevel.toUpperCase(), scrollX + scrollW - S.scrollPad, y + 26);
    ctx.textAlign = 'left';

    // Discovery star
    if (result.isDiscovery) {
      ctx.fillStyle = C.discovery;
      ctx.font = '11px sans-serif';
      ctx.fillText('★ NEW', scrollX + S.scrollPad, y + 26);
    }

    // Title
    ctx.fillStyle = C.scrollGold;
    ctx.font = 'bold 14px serif';
    ctx.textAlign = 'center';
    ctx.fillText(result.title, scrollX + scrollW / 2, y + 46);
    ctx.textAlign = 'left';

    // Description (wrapped)
    ctx.fillStyle = C.text;
    ctx.font = '11px serif';
    const lines = wrapText(ctx, result.description, scrollW - S.scrollPad * 2);
    let textY = y + 64;
    for (const line of lines.slice(0, 4)) {
      ctx.fillText(line, scrollX + S.scrollPad, textY);
      textY += 16;
    }

    // World effect tag
    if (result.worldEffect) {
      ctx.fillStyle = '#88CCFF';
      ctx.font = 'italic 9px sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText('⚡ ' + result.worldEffect.replace(/_/g, ' '), scrollX + scrollW - S.scrollPad, y + scrollH - 18);
      ctx.textAlign = 'left';
    }

    ctx.globalAlpha = 1;
    return y + scrollH + 6;
  }

  private drawSpellbook(
    ctx: CanvasRenderingContext2D,
    x: number, y: number, w: number, h: number,
  ): void {
    if (h < 40) return;

    // Section header
    ctx.fillStyle = C.spellbookBg;
    ctx.fillRect(x, y, w, h);

    ctx.strokeStyle = C.border;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + w, y);
    ctx.stroke();

    ctx.fillStyle = C.textMuted;
    ctx.font = 'bold 10px sans-serif';
    ctx.fillText(`Spellbook  (${this.spellbook.length})`, x + S.pad, y + 14);

    if (this.spellbook.length === 0) {
      ctx.fillStyle = C.textDim;
      ctx.font = 'italic 10px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('No spells discovered yet', x + w / 2, y + 36);
      ctx.textAlign = 'left';
      return;
    }

    const listY = y + 20;
    const listH = h - 22;
    let ry = listY - this.spellbookScroll;

    for (const spell of this.spellbook) {
      if (ry + S.rowH < listY) { ry += S.rowH + 2; continue; }
      if (ry > listY + listH) break;

      const powerColor = (C.power[spell.powerLevel] ?? C.power['minor'])!;
      ctx.fillStyle = powerColor;
      ctx.font = 'bold 10px sans-serif';
      ctx.fillText('●', x + S.pad, ry + 13);

      ctx.fillStyle = spell.isDiscovery ? C.scrollGold : C.text;
      ctx.font = '10px sans-serif';
      ctx.fillText(spell.title, x + S.pad + 12, ry + 13);

      ctx.fillStyle = C.textDim;
      ctx.font = '9px sans-serif';
      const keyParts = spell.compositionKey.split(':');
      const keyLabel = keyParts.length >= 3 ? `${keyParts[1]} + ${keyParts[2]}` : spell.compositionKey;
      ctx.textAlign = 'right';
      ctx.fillText(keyLabel, x + w - S.pad, ry + 13);
      ctx.textAlign = 'left';

      ry += S.rowH + 2;
    }

    this.clickRegions.push({ x, y: listY, width: w, height: listH, action: 'scroll-spellbook' });
  }

  // ── Interaction ───────────────────────────────────────────────────────────

  handleClick(cx: number, cy: number): boolean {
    for (const region of this.clickRegions) {
      if (cx >= region.x && cx <= region.x + region.width &&
          cy >= region.y && cy <= region.y + region.height) {
        switch (region.action) {
          case 'select-verb':
            if (region.data) this.selectedVerb = region.data;
            return true;
          case 'select-noun':
            if (region.data) this.selectedNoun = region.data;
            return true;
          case 'select-paradigm':
            this.selectedParadigmIdx = (this.selectedParadigmIdx + 1) % PARADIGMS.length;
            return true;
          case 'cast':
            if (this.castState !== 'casting') {
              void this.doCast();
            }
            return true;
        }
        return false;
      }
    }
    return false;
  }

  handleScroll(deltaY: number, _contentHeight: number): boolean {
    this.spellbookScroll = Math.max(0, this.spellbookScroll + deltaY);
    return true;
  }

  // ── Casting ───────────────────────────────────────────────────────────────

  private async doCast(): Promise<void> {
    const paradigm = PARADIGMS[this.selectedParadigmIdx]!;
    this.castState = 'casting';
    this.castResult = null;
    this.castError = '';
    this.scrollUnfurl = 0;

    try {
      const result = await this.service.cast({
        verb: this.selectedVerb,
        noun: this.selectedNoun,
        paradigmId: paradigm.id,
        paradigmName: paradigm.name,
        paradigmLore: paradigm.lore,
      });

      this.castResult = result;
      this.castState = 'result';

      // Add to spellbook if not already present
      const exists = this.spellbook.some(s => s.compositionKey === result.compositionKey);
      if (!exists) {
        this.spellbook.unshift(result);
      }

      // Visual feedback: glow + particles
      this.triggerCastEffect(paradigm.id);
      this.startUnfurlAnimation();

      // Dispatch world effect if the spell has one
      if (result.worldEffect && this.onWorldEffectCallback) {
        this.onWorldEffectCallback(result.worldEffect, result.title, this.selectedVerb, this.selectedNoun);
      }
    } catch (err) {
      this.castState = 'error';
      this.castError = err instanceof Error ? err.message : 'Unknown error';
    }
  }

  private startUnfurlAnimation(): void {
    if (this.animFrameId !== null) return;
    this.scrollUnfurl = 0;
    this.lastFrameTime = performance.now();

    const tick = (now: number): void => {
      const dt = (now - this.lastFrameTime) / 1000;
      this.lastFrameTime = now;
      this.scrollUnfurl = Math.min(1, this.scrollUnfurl + dt * 2.5); // ~400ms
      if (this.scrollUnfurl < 1) {
        this.animFrameId = requestAnimationFrame(tick);
      } else {
        this.animFrameId = null;
      }
    };
    this.animFrameId = requestAnimationFrame(tick);
  }

  // ── Visual effects ─────────────────────────────────────────────────────────

  private tickEffects(dtMs: number): void {
    if (dtMs <= 0) return;

    // Decay glow over 1.5s
    if (this.glowProgress > 0) {
      this.glowProgress = Math.max(0, this.glowProgress - dtMs / 1500);
    }

    // Pulse oscillation while casting (0..1 sine)
    if (this.castState === 'casting') {
      this.castPulse = (Math.sin(performance.now() / 250) + 1) / 2;
    } else {
      this.castPulse = 0;
    }

    // Update screen-space particles
    for (const p of this.uiParticles) {
      p.life -= dtMs;
      p.x += p.vx * (dtMs / 16);
      p.y += p.vy * (dtMs / 16);
      p.vy += 0.04 * (dtMs / 16); // light gravity
    }
    // Compact expired
    let w = 0;
    for (let i = 0; i < this.uiParticles.length; i++) {
      if (this.uiParticles[i]!.life > 0) {
        this.uiParticles[w++] = this.uiParticles[i]!;
      }
    }
    this.uiParticles.length = w;
  }

  private triggerCastEffect(paradigmId: string): void {
    const fx = PARADIGM_FX[paradigmId] ?? DEFAULT_FX;
    this.glowColor = fx.glow;
    this.glowProgress = 1;
    this.spawnCastParticles(this.castBtnCenterX, this.castBtnCenterY, fx.particles);
  }

  private spawnCastParticles(cx: number, cy: number, palette: readonly string[]): void {
    const TWO_PI = Math.PI * 2;
    const count = 22;

    for (let i = 0; i < count; i++) {
      const angle = (i / count) * TWO_PI + (Math.random() - 0.5) * 0.4;
      const speed = 1.2 + Math.random() * 2.2;
      const color = palette[Math.floor(Math.random() * palette.length)]!;
      const life = 700 + Math.random() * 600;

      this.uiParticles.push({
        x: cx + (Math.random() - 0.5) * 8,
        y: cy + (Math.random() - 0.5) * 8,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 0.8, // slight upward bias
        life,
        maxLife: life,
        color,
        size: 2 + Math.random() * 2.5,
      });
    }

    // Rune fragment motes — slower, larger, drift up
    for (let i = 0; i < 8; i++) {
      const color = palette[Math.floor(Math.random() * palette.length)]!;
      const life = 1100 + Math.random() * 400;
      this.uiParticles.push({
        x: cx + (Math.random() - 0.5) * 30,
        y: cy + (Math.random() - 0.5) * 20,
        vx: (Math.random() - 0.5) * 0.6,
        vy: -0.5 - Math.random() * 0.8,
        life,
        maxLife: life,
        color,
        size: 3 + Math.random() * 3,
      });
    }
  }

  private renderUIParticles(ctx: CanvasRenderingContext2D): void {
    const TWO_PI = Math.PI * 2;
    for (const p of this.uiParticles) {
      const progress = p.life / p.maxLife; // 1→0 as particle ages
      // late-fade: hold opacity 60%, then fade
      const alpha = progress > 0.4 ? 1.0 : progress / 0.4;
      if (alpha <= 0) continue;

      ctx.globalAlpha = alpha;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * progress + 0.3, 0, TWO_PI);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
}

// ============================================================================
// Canvas helpers
// ============================================================================

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

/** Convert a 6-digit hex colour (#RRGGBB) to rgba() with the given alpha. */
function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha.toFixed(3)})`;
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
