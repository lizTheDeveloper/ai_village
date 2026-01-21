/**
 * VisionComposerPanel - UI for composing and sending divine visions/dreams
 *
 * Features:
 * - Vision type selection (dream, waking vision, omen, prophecy)
 * - Target selection (believer, location, group)
 * - Imagery builder (symbols, scenes, emotions)
 * - Message content
 * - Intensity/clarity settings
 * - Delivery scheduling
 * - Vision history
 */

import type { World } from '@ai-village/core';
import { ComponentType as CT } from '@ai-village/core';
import type { IWindowPanel } from './types/WindowTypes.js';

// Component interfaces for type safety
interface DeityComponent {
  controller?: string;
  belief?: {
    currentBelief?: number;
  };
  believers?: string[];
}

interface AgentComponent {
  name?: string;
}

interface SpiritualComponent {
  faith?: number;
}

// ============================================================================
// Types
// ============================================================================

type VisionType = 'dream' | 'waking_vision' | 'omen' | 'prophecy';
type VisionIntensity = 'subtle' | 'clear' | 'vivid' | 'overwhelming';
type SymbolCategory = 'nature' | 'celestial' | 'animal' | 'abstract' | 'human' | 'divine';

interface VisionSymbol {
  id: string;
  name: string;
  category: SymbolCategory;
  description: string;
  beliefCost: number;
}

interface VisionTarget {
  id: string;
  name: string;
  type: 'believer' | 'location' | 'group';
  faithLevel?: number;
}

interface ComposedVision {
  id: string;
  type: VisionType;
  targetId: string;
  targetName: string;
  symbols: string[];
  message: string;
  intensity: VisionIntensity;
  scheduledFor?: number; // game tick
  sent: boolean;
  timestamp: number;
}

interface ClickRegion {
  x: number;
  y: number;
  width: number;
  height: number;
  action: 'select_type' | 'select_target' | 'add_symbol' | 'remove_symbol' | 'set_intensity' | 'send_vision' | 'clear' | 'select_history';
  data?: string;
}

// ============================================================================
// Constants
// ============================================================================

const COLORS = {
  background: 'rgba(15, 15, 25, 0.95)',
  headerBg: 'rgba(30, 30, 50, 0.9)',
  sectionBg: 'rgba(25, 25, 40, 0.8)',
  inputBg: 'rgba(20, 20, 35, 0.9)',
  text: '#FFFFFF',
  textMuted: '#AAAAAA',
  textDim: '#666666',
  accent: '#9966FF',
  dream: '#6688CC',
  vision: '#88AADD',
  omen: '#AA7744',
  prophecy: '#CC66AA',
  symbolNature: '#66AA66',
  symbolCelestial: '#AAAAFF',
  symbolAnimal: '#CCAA66',
  symbolAbstract: '#AA66AA',
  symbolHuman: '#EECC88',
  symbolDivine: '#FFD700',
  border: 'rgba(100, 100, 140, 0.5)',
  button: 'rgba(100, 80, 140, 0.7)',
  buttonHover: 'rgba(120, 100, 160, 0.9)',
};

const SIZES = {
  padding: 12,
  lineHeight: 18,
  headerHeight: 40,
  sectionHeaderHeight: 28,
  typeRowHeight: 36,
  targetRowHeight: 32,
  symbolSize: 48,
  symbolGap: 8,
  intensityRowHeight: 32,
  buttonHeight: 32,
  historyRowHeight: 44,
};

const VISION_TYPES: Array<{ id: VisionType; name: string; cost: number; description: string }> = [
  { id: 'dream', name: 'Dream', cost: 10, description: 'Appears during sleep, easily forgotten' },
  { id: 'waking_vision', name: 'Waking Vision', cost: 25, description: 'Flash of imagery while awake' },
  { id: 'omen', name: 'Omen', cost: 40, description: 'Signs in the physical world' },
  { id: 'prophecy', name: 'Prophecy', cost: 100, description: 'Unmistakable divine message' },
];

const INTENSITIES: Array<{ id: VisionIntensity; name: string; multiplier: number }> = [
  { id: 'subtle', name: 'Subtle', multiplier: 0.5 },
  { id: 'clear', name: 'Clear', multiplier: 1.0 },
  { id: 'vivid', name: 'Vivid', multiplier: 1.5 },
  { id: 'overwhelming', name: 'Overwhelming', multiplier: 2.5 },
];

// Example symbols (would come from divinity system)
const SYMBOLS: VisionSymbol[] = [
  // Nature
  { id: 'tree', name: 'Great Tree', category: 'nature', description: 'Growth, stability, life', beliefCost: 2 },
  { id: 'river', name: 'Flowing River', category: 'nature', description: 'Change, journey, time', beliefCost: 2 },
  { id: 'mountain', name: 'Mountain Peak', category: 'nature', description: 'Challenge, achievement, isolation', beliefCost: 3 },
  { id: 'storm', name: 'Storm Clouds', category: 'nature', description: 'Turmoil, power, change', beliefCost: 4 },
  // Celestial
  { id: 'sun', name: 'Rising Sun', category: 'celestial', description: 'Hope, truth, revelation', beliefCost: 5 },
  { id: 'moon', name: 'Full Moon', category: 'celestial', description: 'Mystery, cycles, hidden truth', beliefCost: 4 },
  { id: 'stars', name: 'Star Field', category: 'celestial', description: 'Destiny, guidance, eternity', beliefCost: 3 },
  { id: 'eclipse', name: 'Eclipse', category: 'celestial', description: 'Transformation, endings, revelation', beliefCost: 8 },
  // Animal
  { id: 'wolf', name: 'Wolf', category: 'animal', description: 'Loyalty, danger, pack', beliefCost: 3 },
  { id: 'eagle', name: 'Eagle', category: 'animal', description: 'Vision, freedom, power', beliefCost: 4 },
  { id: 'serpent', name: 'Serpent', category: 'animal', description: 'Wisdom, danger, rebirth', beliefCost: 5 },
  { id: 'raven', name: 'Raven', category: 'animal', description: 'Death, prophecy, secrets', beliefCost: 4 },
  // Abstract
  { id: 'flame', name: 'Sacred Flame', category: 'abstract', description: 'Passion, destruction, purification', beliefCost: 3 },
  { id: 'shadow', name: 'Deep Shadow', category: 'abstract', description: 'Hidden, fear, unknown', beliefCost: 2 },
  { id: 'light', name: 'Divine Light', category: 'abstract', description: 'Truth, holiness, guidance', beliefCost: 6 },
  { id: 'void', name: 'Endless Void', category: 'abstract', description: 'Nothingness, potential, fear', beliefCost: 5 },
  // Human
  { id: 'crown', name: 'Crown', category: 'human', description: 'Authority, responsibility, destiny', beliefCost: 4 },
  { id: 'sword', name: 'Sword', category: 'human', description: 'Conflict, justice, power', beliefCost: 3 },
  { id: 'child', name: 'Child Figure', category: 'human', description: 'Innocence, future, hope', beliefCost: 3 },
  { id: 'elder', name: 'Elder Figure', category: 'human', description: 'Wisdom, past, guidance', beliefCost: 3 },
  // Divine
  { id: 'eye', name: 'Divine Eye', category: 'divine', description: 'Watching, judging, knowing', beliefCost: 8 },
  { id: 'hand', name: 'Divine Hand', category: 'divine', description: 'Intervention, blessing, power', beliefCost: 10 },
  { id: 'voice', name: 'Voice from Above', category: 'divine', description: 'Command, truth, authority', beliefCost: 12 },
  { id: 'presence', name: 'Divine Presence', category: 'divine', description: 'Overwhelming awareness of divinity', beliefCost: 15 },
];

// Example targets (would come from game world)
const EXAMPLE_TARGETS: VisionTarget[] = [
  { id: 'believer_1', name: 'Mira the Farmer', type: 'believer', faithLevel: 85 },
  { id: 'believer_2', name: 'Orin the Smith', type: 'believer', faithLevel: 62 },
  { id: 'believer_3', name: 'Elder Thane', type: 'believer', faithLevel: 95 },
  { id: 'location_1', name: 'Sacred Grove', type: 'location' },
  { id: 'location_2', name: 'Village Square', type: 'location' },
  { id: 'group_1', name: 'All Believers', type: 'group' },
];

// ============================================================================
// VisionComposerPanel
// ============================================================================

export class VisionComposerPanel implements IWindowPanel {
  private visible = false;
  private scrollOffset = 0;
  private contentHeight = 0;
  private visibleHeight = 0;
  private clickRegions: ClickRegion[] = [];

  // World reference for event emission and state reading
  private world?: World;
  private playerDeityId?: string;

  // Real targets from world (believers)
  private realTargets: VisionTarget[] = [];

  // Composition state
  private selectedType: VisionType = 'dream';
  private selectedTargetId: string | null = null;
  private selectedSymbols: string[] = [];
  private message = '';
  private intensity: VisionIntensity = 'clear';

  // Current belief (refreshed from deity state)
  private belief = 0;

  // Vision history
  private history: ComposedVision[] = [];
  private showHistory = false;

  /**
   * Refresh state from the World
   * PERFORMANCE: Uses ECS query to get only deity entities (avoids full scan)
   */
  private refreshFromWorld(world: World): void {
    this.world = world;

    // Find player-controlled deity
    const deityEntities = world.query().with(CT.Deity).executeEntities();
    for (const entity of deityEntities) {
      const deityComp = entity.components.get('deity') as DeityComponent | undefined;
      if (deityComp && deityComp.controller === 'player') {
        this.playerDeityId = entity.id;
        this.belief = deityComp.belief?.currentBelief ?? 0;

        // Build real targets from believers
        this.realTargets = [];
        const believers = deityComp.believers ?? [];
        for (const believerId of believers) {
          const believerEntity = world.getEntity(believerId);
          if (believerEntity) {
            const agentComp = believerEntity.components.get('agent') as AgentComponent | undefined;
            const spiritualComp = believerEntity.components.get('spiritual') as SpiritualComponent | undefined;
            if (agentComp) {
              this.realTargets.push({
                id: believerId,
                name: agentComp.name ?? 'Unknown',
                type: 'believer',
                faithLevel: Math.round((spiritualComp?.faith ?? 0.5) * 100),
              });
            }
          }
        }
        return;
      }
    }

    // No player deity found
    this.playerDeityId = undefined;
    this.belief = 0;
    this.realTargets = [];
  }

  /**
   * Get available targets (real believers if world connected, else examples)
   */
  private getTargets(): VisionTarget[] {
    return this.realTargets.length > 0 ? this.realTargets : EXAMPLE_TARGETS;
  }

  // ========== Visibility ==========


  getId(): string {
    return 'vision-composer';
  }

  getTitle(): string {
    return 'Vision Composer';
  }

  getDefaultWidth(): number {
    return 600;
  }

  getDefaultHeight(): number {
    return 700;
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

  setBelief(amount: number): void {
    this.belief = amount;
  }

  setMessage(msg: string): void {
    this.message = msg;
  }

  getMessage(): string {
    return this.message;
  }

  getHistory(): ComposedVision[] {
    return [...this.history];
  }

  // ========== Rendering ==========

  render(ctx: CanvasRenderingContext2D, _x: number, _y: number, width: number, height: number, world?: any): void {
    // Refresh state from world if available
    if (world) {
      this.refreshFromWorld(world);
    }

    this.clickRegions = [];

    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';

    let y = 0;

    // Header
    y = this.renderHeader(ctx, width, y);

    // Content area with clipping
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, y, width, height - y);
    ctx.clip();

    const contentStartY = y;
    y -= this.scrollOffset;

    if (this.showHistory) {
      y = this.renderHistory(ctx, width, y);
    } else {
      y = this.renderComposer(ctx, width, y);
    }

    ctx.restore();

    this.contentHeight = y + this.scrollOffset - contentStartY;
    this.visibleHeight = height - contentStartY;
  }

  renderHeader(ctx: CanvasRenderingContext2D, width: number, y: number): number {
    ctx.fillStyle = COLORS.headerBg;
    ctx.fillRect(0, y, width, SIZES.headerHeight);

    ctx.fillStyle = COLORS.accent;
    ctx.font = 'bold 14px monospace';
    ctx.fillText('VISION COMPOSER', SIZES.padding, y + 12);

    // Toggle history button
    const historyBtn = this.showHistory ? 'Compose' : 'History';
    const btnWidth = 70;
    const btnX = width - btnWidth - SIZES.padding;

    ctx.fillStyle = COLORS.button;
    ctx.beginPath();
    ctx.roundRect(btnX, y + 8, btnWidth, 24, 4);
    ctx.fill();

    ctx.fillStyle = COLORS.text;
    ctx.font = '10px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(historyBtn, btnX + btnWidth / 2, y + 15);
    ctx.textAlign = 'left';

    this.clickRegions.push({
      x: btnX,
      y: y + 8,
      width: btnWidth,
      height: 24,
      action: this.showHistory ? 'clear' : 'select_history',
      data: 'toggle',
    });

    // Belief display
    ctx.fillStyle = COLORS.textMuted;
    ctx.font = '10px monospace';
    ctx.fillText(`Belief: ${Math.floor(this.belief)}`, SIZES.padding + 140, y + 14);

    return y + SIZES.headerHeight;
  }

  private renderComposer(ctx: CanvasRenderingContext2D, width: number, y: number): number {
    // Vision Type Section
    y = this.renderSectionHeader(ctx, width, y, 'VISION TYPE');
    y = this.renderTypeSelector(ctx, width, y);

    // Target Section
    y = this.renderSectionHeader(ctx, width, y, 'TARGET');
    y = this.renderTargetSelector(ctx, width, y);

    // Symbols Section
    y = this.renderSectionHeader(ctx, width, y, 'IMAGERY');
    y = this.renderSymbolSelector(ctx, width, y);

    // Intensity Section
    y = this.renderSectionHeader(ctx, width, y, 'INTENSITY');
    y = this.renderIntensitySelector(ctx, width, y);

    // Cost Preview
    y = this.renderCostPreview(ctx, width, y);

    // Send Button
    y = this.renderSendButton(ctx, width, y);

    return y + SIZES.padding;
  }

  private renderSectionHeader(ctx: CanvasRenderingContext2D, width: number, y: number, title: string): number {
    ctx.fillStyle = COLORS.sectionBg;
    ctx.fillRect(0, y, width, SIZES.sectionHeaderHeight);

    ctx.fillStyle = COLORS.textMuted;
    ctx.font = 'bold 10px monospace';
    ctx.fillText(title, SIZES.padding, y + 8);

    return y + SIZES.sectionHeaderHeight;
  }

  private renderTypeSelector(ctx: CanvasRenderingContext2D, width: number, y: number): number {
    const typeWidth = (width - SIZES.padding * 2) / VISION_TYPES.length;

    for (let i = 0; i < VISION_TYPES.length; i++) {
      const vt = VISION_TYPES[i]!;
      const x = SIZES.padding + i * typeWidth;
      const isSelected = this.selectedType === vt.id;

      ctx.fillStyle = isSelected ? COLORS.button : COLORS.inputBg;
      ctx.fillRect(x, y + 4, typeWidth - 4, SIZES.typeRowHeight - 8);

      if (isSelected) {
        ctx.strokeStyle = this.getTypeColor(vt.id);
        ctx.lineWidth = 2;
        ctx.strokeRect(x, y + 4, typeWidth - 4, SIZES.typeRowHeight - 8);
      }

      ctx.fillStyle = isSelected ? this.getTypeColor(vt.id) : COLORS.textMuted;
      ctx.font = isSelected ? 'bold 10px monospace' : '10px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(vt.name, x + (typeWidth - 4) / 2, y + 10);

      ctx.fillStyle = COLORS.textDim;
      ctx.font = '8px monospace';
      ctx.fillText(`${vt.cost}`, x + (typeWidth - 4) / 2, y + 22);
      ctx.textAlign = 'left';

      this.clickRegions.push({
        x,
        y: y + 4,
        width: typeWidth - 4,
        height: SIZES.typeRowHeight - 8,
        action: 'select_type',
        data: vt.id,
      });
    }

    return y + SIZES.typeRowHeight;
  }

  private renderTargetSelector(ctx: CanvasRenderingContext2D, width: number, y: number): number {
    const targets = EXAMPLE_TARGETS;
    const cols = 2;
    const targetWidth = (width - SIZES.padding * 2 - 8) / cols;

    for (let i = 0; i < targets.length; i++) {
      const target = targets[i]!;
      const col = i % cols;
      const row = Math.floor(i / cols);
      const x = SIZES.padding + col * (targetWidth + 8);
      const ty = y + 4 + row * SIZES.targetRowHeight;
      const isSelected = this.selectedTargetId === target.id;

      ctx.fillStyle = isSelected ? COLORS.button : COLORS.inputBg;
      ctx.fillRect(x, ty, targetWidth, SIZES.targetRowHeight - 4);

      if (isSelected) {
        ctx.strokeStyle = COLORS.accent;
        ctx.lineWidth = 2;
        ctx.strokeRect(x, ty, targetWidth, SIZES.targetRowHeight - 4);
      }

      ctx.fillStyle = isSelected ? COLORS.text : COLORS.textMuted;
      ctx.font = '10px monospace';
      ctx.fillText(target.name, x + 6, ty + 6);

      ctx.fillStyle = COLORS.textDim;
      ctx.font = '8px monospace';
      ctx.fillText(target.type, x + 6, ty + 18);

      if (target.faithLevel !== undefined) {
        ctx.fillText(`Faith: ${target.faithLevel}%`, x + 60, ty + 18);
      }

      this.clickRegions.push({
        x,
        y: ty,
        width: targetWidth,
        height: SIZES.targetRowHeight - 4,
        action: 'select_target',
        data: target.id,
      });
    }

    const rows = Math.ceil(targets.length / cols);
    return y + 4 + rows * SIZES.targetRowHeight + 8;
  }

  private renderSymbolSelector(ctx: CanvasRenderingContext2D, width: number, y: number): number {
    // Selected symbols
    ctx.fillStyle = COLORS.textDim;
    ctx.font = '9px monospace';
    ctx.fillText('Selected:', SIZES.padding, y + 4);

    const selectedY = y + 16;
    let sx = SIZES.padding;

    if (this.selectedSymbols.length === 0) {
      ctx.fillStyle = COLORS.textDim;
      ctx.fillText('(none)', sx, selectedY);
    } else {
      for (const symbolId of this.selectedSymbols) {
        const symbol = SYMBOLS.find(s => s.id === symbolId);
        if (!symbol) continue;

        ctx.fillStyle = this.getSymbolColor(symbol.category);
        ctx.fillRect(sx, selectedY, 60, 20);

        ctx.fillStyle = COLORS.text;
        ctx.font = '8px monospace';
        ctx.fillText(symbol.name.substring(0, 8), sx + 4, selectedY + 6);

        // Remove button
        this.clickRegions.push({
          x: sx,
          y: selectedY,
          width: 60,
          height: 20,
          action: 'remove_symbol',
          data: symbolId,
        });

        sx += 64;
      }
    }

    y = selectedY + 28;

    // Available symbols by category
    const categories: SymbolCategory[] = ['nature', 'celestial', 'animal', 'abstract', 'human', 'divine'];
    const symbolsPerRow = Math.floor((width - SIZES.padding * 2) / (SIZES.symbolSize + SIZES.symbolGap));

    for (const category of categories) {
      const categorySymbols = SYMBOLS.filter(s => s.category === category && !this.selectedSymbols.includes(s.id));
      if (categorySymbols.length === 0) continue;

      ctx.fillStyle = this.getSymbolColor(category);
      ctx.font = '8px monospace';
      ctx.fillText(category.toUpperCase(), SIZES.padding, y);
      y += 12;

      let col = 0;
      for (const symbol of categorySymbols) {
        const x = SIZES.padding + col * (SIZES.symbolSize + SIZES.symbolGap);

        ctx.fillStyle = COLORS.inputBg;
        ctx.fillRect(x, y, SIZES.symbolSize, SIZES.symbolSize);

        ctx.strokeStyle = this.getSymbolColor(symbol.category);
        ctx.lineWidth = 1;
        ctx.strokeRect(x, y, SIZES.symbolSize, SIZES.symbolSize);

        ctx.fillStyle = COLORS.text;
        ctx.font = '8px monospace';
        ctx.textAlign = 'center';
        const shortName = symbol.name.length > 7 ? symbol.name.substring(0, 6) + '..' : symbol.name;
        ctx.fillText(shortName, x + SIZES.symbolSize / 2, y + 16);

        ctx.fillStyle = COLORS.textDim;
        ctx.fillText(`${symbol.beliefCost}`, x + SIZES.symbolSize / 2, y + 30);
        ctx.textAlign = 'left';

        this.clickRegions.push({
          x,
          y,
          width: SIZES.symbolSize,
          height: SIZES.symbolSize,
          action: 'add_symbol',
          data: symbol.id,
        });

        col++;
        if (col >= symbolsPerRow) {
          col = 0;
          y += SIZES.symbolSize + SIZES.symbolGap;
        }
      }

      if (col > 0) {
        y += SIZES.symbolSize + SIZES.symbolGap;
      }
      y += 4;
    }

    return y;
  }

  private renderIntensitySelector(ctx: CanvasRenderingContext2D, width: number, y: number): number {
    const intensityWidth = (width - SIZES.padding * 2) / INTENSITIES.length;

    for (let i = 0; i < INTENSITIES.length; i++) {
      const int = INTENSITIES[i]!;
      const x = SIZES.padding + i * intensityWidth;
      const isSelected = this.intensity === int.id;

      ctx.fillStyle = isSelected ? COLORS.button : COLORS.inputBg;
      ctx.fillRect(x, y + 4, intensityWidth - 4, SIZES.intensityRowHeight - 8);

      if (isSelected) {
        ctx.strokeStyle = COLORS.accent;
        ctx.lineWidth = 2;
        ctx.strokeRect(x, y + 4, intensityWidth - 4, SIZES.intensityRowHeight - 8);
      }

      ctx.fillStyle = isSelected ? COLORS.text : COLORS.textMuted;
      ctx.font = isSelected ? 'bold 10px monospace' : '10px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(int.name, x + (intensityWidth - 4) / 2, y + 10);

      ctx.fillStyle = COLORS.textDim;
      ctx.font = '8px monospace';
      ctx.fillText(`x${int.multiplier}`, x + (intensityWidth - 4) / 2, y + 20);
      ctx.textAlign = 'left';

      this.clickRegions.push({
        x,
        y: y + 4,
        width: intensityWidth - 4,
        height: SIZES.intensityRowHeight - 8,
        action: 'set_intensity',
        data: int.id,
      });
    }

    return y + SIZES.intensityRowHeight;
  }

  private renderCostPreview(ctx: CanvasRenderingContext2D, width: number, y: number): number {
    const cost = this.calculateCost();
    const canAfford = this.belief >= cost;

    ctx.fillStyle = COLORS.sectionBg;
    ctx.fillRect(0, y, width, 40);

    ctx.fillStyle = COLORS.textMuted;
    ctx.font = '10px monospace';
    ctx.fillText('Total Cost:', SIZES.padding, y + 8);

    ctx.fillStyle = canAfford ? COLORS.accent : '#FF6666';
    ctx.font = 'bold 14px monospace';
    ctx.fillText(`${cost} belief`, SIZES.padding + 80, y + 6);

    if (!canAfford) {
      ctx.fillStyle = '#FF6666';
      ctx.font = '9px monospace';
      ctx.fillText(`(Need ${cost - Math.floor(this.belief)} more)`, SIZES.padding, y + 24);
    }

    // Cost breakdown
    ctx.fillStyle = COLORS.textDim;
    ctx.font = '8px monospace';
    const breakdown = this.getCostBreakdown();
    ctx.fillText(breakdown, width - ctx.measureText(breakdown).width - SIZES.padding, y + 14);

    return y + 40;
  }

  private renderSendButton(ctx: CanvasRenderingContext2D, width: number, y: number): number {
    const canSend = this.canSendVision();
    const btnWidth = width - SIZES.padding * 2;

    ctx.fillStyle = canSend ? COLORS.accent : COLORS.textDim;
    ctx.beginPath();
    ctx.roundRect(SIZES.padding, y + 8, btnWidth, SIZES.buttonHeight, 6);
    ctx.fill();

    ctx.fillStyle = canSend ? COLORS.text : COLORS.textMuted;
    ctx.font = 'bold 12px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('SEND VISION', width / 2, y + 18);
    ctx.textAlign = 'left';

    if (canSend) {
      this.clickRegions.push({
        x: SIZES.padding,
        y: y + 8,
        width: btnWidth,
        height: SIZES.buttonHeight,
        action: 'send_vision',
      });
    }

    // Clear button
    y += SIZES.buttonHeight + 12;
    ctx.fillStyle = COLORS.inputBg;
    ctx.beginPath();
    ctx.roundRect(SIZES.padding, y + 4, btnWidth, 24, 4);
    ctx.fill();

    ctx.fillStyle = COLORS.textMuted;
    ctx.font = '10px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('Clear Composition', width / 2, y + 10);
    ctx.textAlign = 'left';

    this.clickRegions.push({
      x: SIZES.padding,
      y: y + 4,
      width: btnWidth,
      height: 24,
      action: 'clear',
    });

    return y + 32;
  }

  private renderHistory(ctx: CanvasRenderingContext2D, width: number, y: number): number {
    if (this.history.length === 0) {
      ctx.fillStyle = COLORS.textMuted;
      ctx.font = '12px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('No visions sent yet', width / 2, y + 40);
      ctx.textAlign = 'left';
      return y + 80;
    }

    for (const vision of this.history) {
      ctx.fillStyle = COLORS.inputBg;
      ctx.fillRect(SIZES.padding / 2, y + 2, width - SIZES.padding, SIZES.historyRowHeight - 4);

      ctx.strokeStyle = this.getTypeColor(vision.type);
      ctx.lineWidth = 1;
      ctx.strokeRect(SIZES.padding / 2, y + 2, width - SIZES.padding, SIZES.historyRowHeight - 4);

      // Type
      ctx.fillStyle = this.getTypeColor(vision.type);
      ctx.font = 'bold 10px monospace';
      ctx.fillText(vision.type.replace('_', ' ').toUpperCase(), SIZES.padding, y + 8);

      // Target
      ctx.fillStyle = COLORS.text;
      ctx.font = '10px monospace';
      ctx.fillText(`→ ${vision.targetName}`, SIZES.padding + 100, y + 8);

      // Symbols
      ctx.fillStyle = COLORS.textMuted;
      ctx.font = '9px monospace';
      const symbolNames = vision.symbols.map(id => {
        const s = SYMBOLS.find(sym => sym.id === id);
        return s ? s.name : id;
      });
      ctx.fillText(`Symbols: ${symbolNames.join(', ') || 'none'}`, SIZES.padding, y + 24);

      // Timestamp
      ctx.fillStyle = COLORS.textDim;
      ctx.font = '8px monospace';
      const timeAgo = this.formatTimeAgo(vision.timestamp);
      ctx.fillText(timeAgo, width - ctx.measureText(timeAgo).width - SIZES.padding, y + 8);

      y += SIZES.historyRowHeight;
    }

    return y + SIZES.padding;
  }

  // ========== Helpers ==========

  private getTypeColor(type: VisionType): string {
    switch (type) {
      case 'dream': return COLORS.dream;
      case 'waking_vision': return COLORS.vision;
      case 'omen': return COLORS.omen;
      case 'prophecy': return COLORS.prophecy;
      default: return COLORS.text;
    }
  }

  private getSymbolColor(category: SymbolCategory): string {
    switch (category) {
      case 'nature': return COLORS.symbolNature;
      case 'celestial': return COLORS.symbolCelestial;
      case 'animal': return COLORS.symbolAnimal;
      case 'abstract': return COLORS.symbolAbstract;
      case 'human': return COLORS.symbolHuman;
      case 'divine': return COLORS.symbolDivine;
      default: return COLORS.text;
    }
  }

  private calculateCost(): number {
    const typeData = VISION_TYPES.find(t => t.id === this.selectedType);
    const intensityData = INTENSITIES.find(i => i.id === this.intensity);

    let baseCost = typeData?.cost ?? 10;

    // Add symbol costs
    for (const symbolId of this.selectedSymbols) {
      const symbol = SYMBOLS.find(s => s.id === symbolId);
      if (symbol) {
        baseCost += symbol.beliefCost;
      }
    }

    // Apply intensity multiplier
    baseCost *= intensityData?.multiplier ?? 1;

    return Math.ceil(baseCost);
  }

  private getCostBreakdown(): string {
    const typeData = VISION_TYPES.find(t => t.id === this.selectedType);
    const intensityData = INTENSITIES.find(i => i.id === this.intensity);
    const symbolCost = this.selectedSymbols.reduce((sum, id) => {
      const s = SYMBOLS.find(sym => sym.id === id);
      return sum + (s?.beliefCost ?? 0);
    }, 0);

    return `Type: ${typeData?.cost ?? 0} + Symbols: ${symbolCost} × ${intensityData?.multiplier ?? 1}`;
  }

  private canSendVision(): boolean {
    if (!this.selectedTargetId) return false;
    if (this.calculateCost() > this.belief) return false;
    return true;
  }

  private formatTimeAgo(timestamp: number): string {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    return `${Math.floor(seconds / 3600)}h ago`;
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
      if (
        x >= region.x &&
        x <= region.x + region.width &&
        adjustedY >= region.y &&
        adjustedY <= region.y + region.height
      ) {
        return this.handleClickAction(region);
      }
    }

    return false;
  }

  private handleClickAction(region: ClickRegion): boolean {
    switch (region.action) {
      case 'select_type':
        this.selectedType = region.data as VisionType;
        return true;

      case 'select_target':
        this.selectedTargetId = region.data ?? null;
        return true;

      case 'add_symbol':
        if (region.data && !this.selectedSymbols.includes(region.data) && this.selectedSymbols.length < 5) {
          this.selectedSymbols.push(region.data);
        }
        return true;

      case 'remove_symbol':
        this.selectedSymbols = this.selectedSymbols.filter(id => id !== region.data);
        return true;

      case 'set_intensity':
        this.intensity = region.data as VisionIntensity;
        return true;

      case 'send_vision':
        this.sendVision();
        return true;

      case 'clear':
        this.clearComposition();
        return true;

      case 'select_history':
        this.showHistory = !this.showHistory;
        this.scrollOffset = 0;
        return true;
    }
    return false;
  }

  private sendVision(): void {
    if (!this.canSendVision()) return;

    const targets = this.getTargets();
    const target = targets.find(t => t.id === this.selectedTargetId);
    if (!target) return;

    // Check if we have world and deity
    if (!this.world || !this.playerDeityId) {
      console.error('[VisionComposerPanel] Cannot send vision: no world or deity');
      return;
    }

    // Create vision record for history
    const vision: ComposedVision = {
      id: `vision_${Date.now()}`,
      type: this.selectedType,
      targetId: target.id,
      targetName: target.name,
      symbols: [...this.selectedSymbols],
      message: this.message,
      intensity: this.intensity,
      sent: true,
      timestamp: Date.now(),
    };

    // Map vision type and intensity to power type
    const powerType = this.mapToPowerType(this.selectedType, this.intensity);

    // Emit event to DivinePowerSystem
    this.world.eventBus.emit({
      type: 'divine_power:request',
      source: 'ui',
      data: {
        deityId: this.playerDeityId,
        powerType,
        targetId: target.id,
        params: {
          message: this.message,
          content: this.buildVisionContent(),
          symbols: this.selectedSymbols,
          intensity: this.intensity,
          visionType: this.selectedType,
        },
      },
    });

    // Add to local history (backend will track its own)
    this.history.unshift(vision);
    if (this.history.length > 20) {
      this.history.pop();
    }

    // Clear composition
    this.clearComposition();
  }

  /**
   * Map vision type and intensity to DivinePowerSystem power type
   */
  private mapToPowerType(visionType: VisionType, intensity: VisionIntensity): string {
    // Map based on type and intensity
    if (visionType === 'dream' && intensity === 'subtle') {
      return 'dream_hint';
    } else if (intensity === 'subtle') {
      return 'whisper';
    } else if (intensity === 'clear' || intensity === 'vivid') {
      return 'clear_vision';
    }
    return 'dream_hint'; // default
  }

  /**
   * Build vision content from message and symbols
   */
  private buildVisionContent(): string {
    let content = this.message;
    if (this.selectedSymbols.length > 0) {
      const symbolMeanings = this.selectedSymbols.map(s => {
        const sym = SYMBOLS.find(so => so.id === s);
        return sym?.description ?? s;
      });
      content += ` (Symbols: ${symbolMeanings.join(', ')})`;
    }
    return content;
  }

  private clearComposition(): void {
    this.selectedType = 'dream';
    this.selectedTargetId = null;
    this.selectedSymbols = [];
    this.message = '';
    this.intensity = 'clear';
    this.showHistory = false;
    this.scrollOffset = 0;
  }
}
