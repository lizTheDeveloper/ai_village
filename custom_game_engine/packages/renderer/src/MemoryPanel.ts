import type {
  Entity,
  IdentityComponent,
  EpisodicMemoryComponent,
  EpisodicMemory,
  SemanticMemoryComponent,
  ReflectionComponent,
  JournalComponent,
  AgentComponent,
} from '@ai-village/core';
import type { IWindowPanel } from './types/WindowTypes.js';

/**
 * UI Panel displaying episodic memory information for the selected agent.
 * Temporary panel for playtesting the episodic memory system.
 * Toggle with 'M' key.
 */
export class MemoryPanel implements IWindowPanel {
  private selectedEntityId: string | null = null;
  private visible: boolean = false;
  private panelWidth = 420;
  private panelHeight = 640;
  private padding = 12;
  private lineHeight = 16;

  getId(): string {
    return 'memory';
  }

  getTitle(): string {
    return 'Memory & Goals';
  }

  getDefaultWidth(): number {
    return this.panelWidth;
  }

  getDefaultHeight(): number {
    return this.panelHeight;
  }

  /**
   * Set the currently selected agent entity.
   * @param entity Agent entity to display, or null to clear selection
   */
  setSelectedEntity(entity: Entity | null): void {
    this.selectedEntityId = entity ? entity.id : null;
  }

  /**
   * Toggle panel visibility.
   */
  toggle(): void {
    this.visible = !this.visible;
  }

  /**
   * Check if panel is visible.
   */
  isVisible(): boolean {
    return this.visible;
  }

  /**
   * Set the visibility state of the panel.
   */
  setVisible(visible: boolean): void {
    this.visible = visible;
  }

  /**
   * Render the memory panel.
   */
  render(ctx: CanvasRenderingContext2D, _x: number, _y: number, _width: number, _height: number, world?: any): void {
    if (!this.visible || !this.selectedEntityId) {
      return;
    }

    if (!world || typeof world.getEntity !== 'function') {
      console.warn('[MemoryPanel] World not available or missing getEntity method');
      return;
    }

    const selectedEntity = world.getEntity(this.selectedEntityId);
    if (!selectedEntity) {
      console.warn('[MemoryPanel] Selected entity not found in world:', this.selectedEntityId);
      this.selectedEntityId = null;
      return;
    }

    // WindowManager handles positioning via translate, so render at (0, 0)
    const x = 0;
    const y = 0;

    const identity = selectedEntity.components.get('identity') as IdentityComponent | undefined;
    const episodicMemory = selectedEntity.components.get('episodic_memory') as EpisodicMemoryComponent | undefined;
    const semanticMemory = selectedEntity.components.get('semantic_memory') as SemanticMemoryComponent | undefined;
    const reflection = selectedEntity.components.get('reflection') as ReflectionComponent | undefined;
    const journal = selectedEntity.components.get('journal') as JournalComponent | undefined;
    const agent = selectedEntity.components.get('agent') as AgentComponent | undefined;

    // --- Background ---
    const bgGrad = ctx.createLinearGradient(x, y, x, y + this.panelHeight);
    bgGrad.addColorStop(0, 'rgba(8,10,24,0.98)');
    bgGrad.addColorStop(1, 'rgba(4,5,14,0.98)');
    ctx.fillStyle = bgGrad;
    ctx.beginPath();
    (ctx as any).roundRect(x, y, this.panelWidth, this.panelHeight, 6);
    ctx.fill();

    ctx.strokeStyle = 'rgba(100,120,220,0.35)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    (ctx as any).roundRect(x, y, this.panelWidth, this.panelHeight, 6);
    ctx.stroke();

    let currentY = y + this.padding;

    // --- Header ---
    const headerGrad = ctx.createLinearGradient(x, currentY, x, currentY + 32);
    headerGrad.addColorStop(0, 'rgba(40,35,80,0.9)');
    headerGrad.addColorStop(1, 'rgba(20,18,48,0.9)');
    ctx.fillStyle = headerGrad;
    ctx.fillRect(x, currentY, this.panelWidth, 32);

    ctx.fillStyle = 'rgba(160,140,255,0.5)';
    ctx.font = '11px monospace';
    ctx.fillText('✦', x + this.padding, currentY + 20);
    ctx.fillText('✦', x + this.panelWidth - this.padding - 10, currentY + 20);

    ctx.shadowColor = 'rgba(160,140,255,0.7)';
    ctx.shadowBlur = 8;
    ctx.fillStyle = '#d8d0ff';
    ctx.font = 'bold 14px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('✧ Memory & Goals ✧', x + this.panelWidth / 2, currentY + 21);
    ctx.shadowBlur = 0;
    ctx.textAlign = 'left';
    currentY += 38;

    // Agent name pill
    if (identity?.name) {
      const nameW = ctx.measureText(identity.name).width + 24;
      const nameX = x + this.panelWidth / 2 - nameW / 2;
      const pillGrad = ctx.createLinearGradient(nameX, currentY - 12, nameX, currentY + 6);
      pillGrad.addColorStop(0, 'rgba(60,50,120,0.8)');
      pillGrad.addColorStop(1, 'rgba(30,25,70,0.8)');
      ctx.fillStyle = pillGrad;
      ctx.beginPath();
      (ctx as any).roundRect(nameX, currentY - 13, nameW, 20, 10);
      ctx.fill();
      ctx.strokeStyle = 'rgba(180,160,255,0.4)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      (ctx as any).roundRect(nameX, currentY - 13, nameW, 20, 10);
      ctx.stroke();
      ctx.fillStyle = '#c8b8ff';
      ctx.font = 'bold 12px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(identity.name, x + this.panelWidth / 2, currentY);
      ctx.textAlign = 'left';
      currentY += 22;
    }

    // --- Goals section ---
    if (agent) {
      const hasGoals = agent.personalGoal || agent.mediumTermGoal || agent.groupGoal;
      if (hasGoals) {
        currentY = this.renderSectionHeader(ctx, x, currentY, '🎯 Goals', '#44dd88', 'rgba(20,50,30,0.7)');

        const goalDefs = [
          { label: 'Personal', color: '#88ffaa', accentColor: 'rgba(50,180,90,0.8)', text: agent.personalGoal },
          { label: 'Mid-term', color: '#aaffcc', accentColor: 'rgba(40,160,100,0.8)', text: agent.mediumTermGoal },
          { label: 'Group', color: '#ccffdd', accentColor: 'rgba(60,200,80,0.8)', text: agent.groupGoal },
        ];

        for (const goal of goalDefs) {
          if (!goal.text) continue;
          if (currentY > y + this.panelHeight - 60) break;

          // Goal card
          const cardGrad = ctx.createLinearGradient(x + this.padding, currentY, x + this.panelWidth - this.padding, currentY);
          cardGrad.addColorStop(0, 'rgba(20,40,28,0.85)');
          cardGrad.addColorStop(1, 'rgba(10,20,14,0.85)');
          ctx.fillStyle = cardGrad;
          ctx.beginPath();
          (ctx as any).roundRect(x + this.padding, currentY, this.panelWidth - this.padding * 2, 34, 4);
          ctx.fill();

          // Left accent bar
          ctx.fillStyle = goal.accentColor;
          ctx.fillRect(x + this.padding, currentY, 3, 34);

          // Label pill
          ctx.fillStyle = 'rgba(30,80,50,0.9)';
          ctx.beginPath();
          (ctx as any).roundRect(x + this.padding + 6, currentY + 4, 52, 14, 4);
          ctx.fill();
          ctx.fillStyle = goal.color;
          ctx.font = 'bold 9px monospace';
          ctx.fillText(goal.label, x + this.padding + 9, currentY + 14);

          // Goal text
          ctx.fillStyle = '#bbddcc';
          ctx.font = '10px monospace';
          const maxW = this.panelWidth - this.padding * 2 - 70;
          let text = goal.text;
          if (ctx.measureText(text).width > maxW) {
            while (ctx.measureText(text + '…').width > maxW && text.length > 0) text = text.slice(0, -1);
            text += '…';
          }
          ctx.fillText(text, x + this.padding + 64, currentY + 14);

          currentY += 38;
        }
      }
    }

    // --- Episodic Memories ---
    if (episodicMemory) {
      if (currentY > y + this.panelHeight - 100) {
        this.renderFooter(ctx, x, y);
        return;
      }
      const memories = episodicMemory.episodicMemories || [];
      currentY = this.renderSectionHeader(ctx, x, currentY, `📝 Episodic Memories  (${memories.length})`, '#88ccff', 'rgba(16,30,55,0.7)');

      const recentMemories = memories.slice(-5).reverse();
      for (const memory of recentMemories) {
        if (currentY > y + this.panelHeight - 55) break;
        currentY = this.renderMemory(ctx, x, currentY, memory, y);
      }
    } else {
      this.renderInfoPill(ctx, x, currentY, 'No episodic memory component', '#ff9977', 'rgba(60,20,20,0.8)');
      currentY += 26;
    }

    // --- Semantic Memory ---
    if (semanticMemory && currentY < y + this.panelHeight - 100) {
      currentY = this.renderSectionHeader(ctx, x, currentY, '🧠 Beliefs & Knowledge', '#ffcc88', 'rgba(40,28,10,0.7)');

      const beliefs = semanticMemory.beliefs || [];
      const knowledge = semanticMemory.knowledge || [];

      // Stats pills
      this.renderStatPill(ctx, x + this.padding, currentY, `Beliefs: ${beliefs.length}`, '#ffddaa', 'rgba(60,40,10,0.8)');
      this.renderStatPill(ctx, x + this.padding + 100, currentY, `Knowledge: ${knowledge.length}`, '#aaddff', 'rgba(10,35,60,0.8)');
      currentY += 24;

      for (const belief of beliefs.slice(0, 3)) {
        if (currentY > y + this.panelHeight - 60) break;
        const conf = Math.max(0, Math.min(1, belief.confidence ?? 0));
        const barW = this.panelWidth - this.padding * 2 - 4;

        // Belief card
        const cardGrad = ctx.createLinearGradient(x + this.padding, currentY, x + this.panelWidth - this.padding, currentY);
        cardGrad.addColorStop(0, 'rgba(40,28,10,0.75)');
        cardGrad.addColorStop(1, 'rgba(20,14,5,0.75)');
        ctx.fillStyle = cardGrad;
        ctx.beginPath();
        (ctx as any).roundRect(x + this.padding, currentY, barW, 38, 4);
        ctx.fill();

        ctx.fillStyle = 'rgba(200,140,30,0.7)';
        ctx.fillRect(x + this.padding, currentY, 3, 38);

        // Belief text
        ctx.fillStyle = '#ffeecc';
        ctx.font = '10px monospace';
        const maxW = barW - 70;
        let txt = `• ${belief.content}`;
        if (ctx.measureText(txt).width > maxW) {
          while (ctx.measureText(txt + '…').width > maxW && txt.length > 0) txt = txt.slice(0, -1);
          txt += '…';
        }
        ctx.fillText(txt, x + this.padding + 6, currentY + 14);

        // Confidence bar
        ctx.fillStyle = 'rgba(255,255,255,0.08)';
        ctx.beginPath();
        (ctx as any).roundRect(x + this.padding + 6, currentY + 22, barW - 12, 8, 3);
        ctx.fill();

        const confColor = conf > 0.7 ? '#44ee88' : conf > 0.4 ? '#ffcc44' : '#ff8844';
        const confFill = ctx.createLinearGradient(x + this.padding + 6, 0, x + this.padding + 6 + (barW - 12) * conf, 0);
        confFill.addColorStop(0, confColor + 'aa');
        confFill.addColorStop(1, confColor);
        ctx.fillStyle = confFill;
        ctx.beginPath();
        (ctx as any).roundRect(x + this.padding + 6, currentY + 22, (barW - 12) * conf, 8, 3);
        ctx.fill();

        // Confidence % right-aligned
        ctx.fillStyle = confColor;
        ctx.font = 'bold 9px monospace';
        ctx.textAlign = 'right';
        ctx.fillText(`${Math.round(conf * 100)}%`, x + this.panelWidth - this.padding - 6, currentY + 29);
        ctx.textAlign = 'left';

        currentY += 42;
      }
    }

    // --- Reflections ---
    if (reflection && currentY < y + this.panelHeight - 90) {
      currentY = this.renderSectionHeader(ctx, x, currentY, '💭 Reflections', '#cc88ff', 'rgba(30,15,50,0.7)');

      const reflections = reflection.reflections || [];
      this.renderStatPill(ctx, x + this.padding, currentY, `Total: ${reflections.length}`, '#ddaaff', 'rgba(50,25,80,0.8)');
      currentY += 24;

      if (reflections.length > 0) {
        const latest = reflections[reflections.length - 1];
        if (latest) {
          const cardGrad = ctx.createLinearGradient(x + this.padding, currentY, x + this.panelWidth - this.padding, currentY);
          cardGrad.addColorStop(0, 'rgba(30,15,50,0.8)');
          cardGrad.addColorStop(1, 'rgba(15,8,28,0.8)');
          ctx.fillStyle = cardGrad;
          const cardH = 42;
          ctx.beginPath();
          (ctx as any).roundRect(x + this.padding, currentY, this.panelWidth - this.padding * 2, cardH, 4);
          ctx.fill();
          ctx.fillStyle = 'rgba(180,100,255,0.7)';
          ctx.fillRect(x + this.padding, currentY, 3, cardH);
          ctx.fillStyle = '#ddaaff';
          ctx.font = '10px monospace';
          currentY = this.renderWrappedText(ctx, latest.text || 'No text', x, currentY + 10, 2);
          currentY += 8;
        }
      }
    }

    // --- Journal ---
    if (journal && currentY < y + this.panelHeight - 70) {
      currentY = this.renderSectionHeader(ctx, x, currentY, '📔 Journal', '#ffaa66', 'rgba(40,20,8,0.7)');

      const entries = journal.entries || [];
      this.renderStatPill(ctx, x + this.padding, currentY, `Entries: ${entries.length}`, '#ffddaa', 'rgba(60,30,10,0.8)');
      currentY += 24;

      if (entries.length > 0) {
        const latest = entries[entries.length - 1];
        if (latest) {
          const cardGrad = ctx.createLinearGradient(x + this.padding, currentY, x + this.panelWidth - this.padding, currentY);
          cardGrad.addColorStop(0, 'rgba(40,20,8,0.8)');
          cardGrad.addColorStop(1, 'rgba(20,10,4,0.8)');
          ctx.fillStyle = cardGrad;
          const cardH = 40;
          ctx.beginPath();
          (ctx as any).roundRect(x + this.padding, currentY, this.panelWidth - this.padding * 2, cardH, 4);
          ctx.fill();
          ctx.fillStyle = 'rgba(220,140,60,0.7)';
          ctx.fillRect(x + this.padding, currentY, 3, cardH);
          ctx.fillStyle = '#ffddaa';
          ctx.font = '10px monospace';
          currentY = this.renderWrappedText(ctx, latest.text || 'No content', x, currentY + 10, 2);
          currentY += 8;
        }
      }
    }

    this.renderFooter(ctx, x, y);
  }

  // ---------------------------------------------------------------------------
  // Section header with gradient strip and colored left accent bar
  // ---------------------------------------------------------------------------
  private renderSectionHeader(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    label: string,
    textColor: string,
    bgColor: string,
  ): number {
    // Gradient separator
    const sepGrad = ctx.createLinearGradient(x + this.padding, y, x + this.panelWidth - this.padding, y);
    sepGrad.addColorStop(0, 'rgba(255,255,255,0)');
    sepGrad.addColorStop(0.5, 'rgba(255,255,255,0.12)');
    sepGrad.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.strokeStyle = sepGrad;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x + this.padding, y);
    ctx.lineTo(x + this.panelWidth - this.padding, y);
    ctx.stroke();
    y += 6;

    const stripGrad = ctx.createLinearGradient(x + this.padding, y, x + this.panelWidth - this.padding, y);
    stripGrad.addColorStop(0, bgColor);
    stripGrad.addColorStop(1, 'rgba(4,5,14,0.5)');
    ctx.fillStyle = stripGrad;
    ctx.beginPath();
    (ctx as any).roundRect(x + this.padding, y, this.panelWidth - this.padding * 2, 22, 3);
    ctx.fill();

    ctx.fillStyle = textColor;
    ctx.strokeStyle = textColor;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x + this.padding, y + 3);
    ctx.lineTo(x + this.padding, y + 19);
    ctx.stroke();

    ctx.fillStyle = textColor;
    ctx.font = 'bold 12px monospace';
    ctx.fillText(label, x + this.padding + 6, y + 15);

    return y + 26;
  }

  // ---------------------------------------------------------------------------
  // Render a single episodic memory card
  // ---------------------------------------------------------------------------
  private renderMemory(ctx: CanvasRenderingContext2D, panelX: number, y: number, memory: EpisodicMemory, panelTopY: number): number {
    const importance = Math.max(0, Math.min(1, memory.importance ?? 0));
    const cardH = 56;

    if (y + cardH > panelTopY + this.panelHeight - 30) return y;

    // Card background
    const impColor = importance > 0.7 ? '#FFD700' : importance > 0.5 ? '#FFA500' : importance > 0.3 ? '#FFCC66' : '#888888';
    const cardGrad = ctx.createLinearGradient(panelX + this.padding, y, panelX + this.panelWidth - this.padding, y);
    cardGrad.addColorStop(0, 'rgba(20,18,38,0.9)');
    cardGrad.addColorStop(1, 'rgba(10,9,22,0.9)');
    ctx.fillStyle = cardGrad;
    ctx.beginPath();
    (ctx as any).roundRect(panelX + this.padding, y, this.panelWidth - this.padding * 2, cardH, 4);
    ctx.fill();

    // Left importance accent bar
    ctx.fillStyle = impColor;
    ctx.fillRect(panelX + this.padding, y, 3, cardH);

    // Row 1: event type + importance bar + emotion pill
    const barTrackW = 80;
    const barFillW = barTrackW * importance;

    // Event type label
    ctx.fillStyle = '#aaaacc';
    ctx.font = '10px monospace';
    ctx.fillText(memory.eventType, panelX + this.padding + 6, y + 13);

    // Importance bar (right side)
    const barX = panelX + this.panelWidth - this.padding - barTrackW - 6;
    ctx.fillStyle = 'rgba(255,255,255,0.08)';
    ctx.beginPath();
    (ctx as any).roundRect(barX, y + 5, barTrackW, 7, 3);
    ctx.fill();
    const impGrad = ctx.createLinearGradient(barX, 0, barX + barFillW, 0);
    impGrad.addColorStop(0, impColor + '88');
    impGrad.addColorStop(1, impColor);
    ctx.fillStyle = impGrad;
    ctx.beginPath();
    (ctx as any).roundRect(barX, y + 5, barFillW, 7, 3);
    ctx.fill();

    // Importance star label
    ctx.fillStyle = impColor;
    ctx.font = 'bold 9px monospace';
    ctx.textAlign = 'right';
    ctx.fillText(`★${importance.toFixed(2)}`, barX - 3, y + 13);
    ctx.textAlign = 'left';

    // Row 2: Summary (wrapped, max 2 lines)
    ctx.fillStyle = '#ccccee';
    ctx.font = '10px monospace';
    const sumY = y + 24;
    const maxSumW = this.panelWidth - this.padding * 2 - 10;
    let sumText = memory.summary;
    if (ctx.measureText(sumText).width > maxSumW) {
      while (ctx.measureText(sumText + '…').width > maxSumW && sumText.length > 0) sumText = sumText.slice(0, -1);
      sumText += '…';
    }
    ctx.fillText(sumText, panelX + this.padding + 6, sumY);

    // Row 3: metadata pills
    const valence = memory.emotionalValence ?? 0;
    const intensity = memory.emotionalIntensity ?? 0;
    const clarity = memory.clarity ?? 1.0;
    const emotionGlyph = valence > 0 ? '😊' : valence < 0 ? '😢' : '😐';
    const valenceStr = valence >= 0 ? `+${valence.toFixed(1)}` : valence.toFixed(1);

    const metaY = y + 40;
    let metaX = panelX + this.padding + 6;

    // Emotion pill
    const emotionLabel = `${emotionGlyph} ${valenceStr}`;
    const emotionColor = valence > 0 ? '#44ee88' : valence < 0 ? '#ff8888' : '#aaaaaa';
    metaX = this.renderMiniPill(ctx, metaX, metaY, emotionLabel, emotionColor, 'rgba(20,30,24,0.8)');

    // Intensity
    metaX = this.renderMiniPill(ctx, metaX, metaY, `⚡${intensity.toFixed(1)}`, '#ffdd88', 'rgba(40,30,10,0.8)');

    // Clarity
    const clarityColor = clarity > 0.7 ? '#88ddff' : '#778899';
    metaX = this.renderMiniPill(ctx, metaX, metaY, `🔍${Math.round(clarity * 100)}%`, clarityColor, 'rgba(10,20,35,0.8)');

    // Consolidated
    if (memory.consolidated) {
      this.renderMiniPill(ctx, metaX, metaY, '💾', '#aaddff', 'rgba(10,20,40,0.8)');
    }

    return y + cardH + 4;
  }

  // ---------------------------------------------------------------------------
  // Tiny pill badge
  // ---------------------------------------------------------------------------
  private renderMiniPill(ctx: CanvasRenderingContext2D, x: number, y: number, label: string, textColor: string, bgColor: string): number {
    ctx.font = '9px monospace';
    const w = ctx.measureText(label).width + 8;
    ctx.fillStyle = bgColor;
    ctx.beginPath();
    (ctx as any).roundRect(x, y - 9, w, 12, 5);
    ctx.fill();
    ctx.strokeStyle = textColor + '55';
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    (ctx as any).roundRect(x, y - 9, w, 12, 5);
    ctx.stroke();
    ctx.fillStyle = textColor;
    ctx.fillText(label, x + 4, y);
    return x + w + 4;
  }

  // ---------------------------------------------------------------------------
  // Stat pill badge
  // ---------------------------------------------------------------------------
  private renderStatPill(ctx: CanvasRenderingContext2D, x: number, y: number, label: string, textColor: string, bgColor: string): void {
    ctx.font = '10px monospace';
    const w = ctx.measureText(label).width + 12;
    ctx.fillStyle = bgColor;
    ctx.beginPath();
    (ctx as any).roundRect(x, y - 11, w, 16, 6);
    ctx.fill();
    ctx.strokeStyle = textColor + '44';
    ctx.lineWidth = 1;
    ctx.beginPath();
    (ctx as any).roundRect(x, y - 11, w, 16, 6);
    ctx.stroke();
    ctx.fillStyle = textColor;
    ctx.fillText(label, x + 6, y);
  }

  // ---------------------------------------------------------------------------
  // Info/warning pill
  // ---------------------------------------------------------------------------
  private renderInfoPill(ctx: CanvasRenderingContext2D, x: number, y: number, label: string, textColor: string, bgColor: string): void {
    ctx.font = '11px monospace';
    const w = ctx.measureText(label).width + 16;
    const pillX = x + this.panelWidth / 2 - w / 2;
    ctx.fillStyle = bgColor;
    ctx.beginPath();
    (ctx as any).roundRect(pillX, y, w, 18, 7);
    ctx.fill();
    ctx.fillStyle = textColor;
    ctx.textAlign = 'center';
    ctx.fillText(label, x + this.panelWidth / 2, y + 13);
    ctx.textAlign = 'left';
  }

  // ---------------------------------------------------------------------------
  // Footer hint
  // ---------------------------------------------------------------------------
  private renderFooter(ctx: CanvasRenderingContext2D, x: number, panelTopY: number): void {
    const footerY = panelTopY + this.panelHeight - 18;
    ctx.fillStyle = 'rgba(255,255,255,0.06)';
    ctx.fillRect(x, footerY - 8, this.panelWidth, 26);
    ctx.fillStyle = '#666688';
    ctx.font = '10px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('M — close', x + this.panelWidth / 2, footerY + 6);
    ctx.textAlign = 'left';
  }

  // ---------------------------------------------------------------------------
  // Render wrapped text (simple word wrapping)
  // ---------------------------------------------------------------------------
  private renderWrappedText(ctx: CanvasRenderingContext2D, text: string, panelX: number, y: number, maxLines: number): number {
    const maxWidth = this.panelWidth - this.padding * 2 - 10;
    const words = text.split(' ');
    let line = '';
    let lineCount = 0;

    for (const word of words) {
      const testLine = line + (line ? ' ' : '') + word;
      const metrics = ctx.measureText(testLine);

      if (metrics.width > maxWidth && line) {
        ctx.fillText(line, panelX + this.padding + 6, y);
        y += this.lineHeight;
        line = word;
        lineCount++;

        if (lineCount >= maxLines) {
          if (words.indexOf(word) < words.length - 1) {
            ctx.fillText('…', panelX + this.padding + 6 + ctx.measureText(line).width + 2, y - this.lineHeight);
          }
          break;
        }
      } else {
        line = testLine;
      }
    }

    if (line && lineCount < maxLines) {
      ctx.fillText(line, panelX + this.padding + 6, y);
      y += this.lineHeight;
    }

    return y;
  }
}
