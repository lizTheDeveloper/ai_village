import type {
  Entity,
  World,
  IdentityComponent,
  EpisodicMemoryComponent,
  EpisodicMemory,
  SemanticMemoryComponent,
  ReflectionComponent,
  JournalComponent,
  AgentComponent,
} from '@ai-village/core';

/**
 * UI Panel displaying episodic memory information for the selected agent.
 * Temporary panel for playtesting the episodic memory system.
 * Toggle with 'M' key.
 */
export class MemoryPanel {
  private selectedEntityId: string | null = null;
  private visible: boolean = false;
  private panelWidth = 400;
  private panelHeight = 600;
  private padding = 12;
  private lineHeight = 16;

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
   * Render the memory panel.
   * @param ctx Canvas rendering context
   * @param canvasWidth Width of the canvas
   * @param canvasHeight Height of the canvas
   * @param world World instance to look up the selected entity
   */
  render(ctx: CanvasRenderingContext2D, _canvasWidth: number, _canvasHeight: number, world: World): void {
    if (!this.visible || !this.selectedEntityId) {
      return; // Nothing to render
    }

    // Guard against undefined world
    if (!world || typeof world.getEntity !== 'function') {
      console.warn('[MemoryPanel] World not available or missing getEntity method');
      return;
    }

    // Look up the entity from the world
    const selectedEntity = world.getEntity(this.selectedEntityId);
    if (!selectedEntity) {
      console.warn('[MemoryPanel] Selected entity not found in world:', this.selectedEntityId);
      this.selectedEntityId = null; // Clear invalid selection
      return;
    }

    // WindowManager handles positioning via translate, so render at (0, 0)
    const x = 0;
    const y = 0;

    // Get components
    const identity = selectedEntity.components.get('identity') as IdentityComponent | undefined;
    const episodicMemory = selectedEntity.components.get('episodic_memory') as EpisodicMemoryComponent | undefined;
    const semanticMemory = selectedEntity.components.get('semantic_memory') as SemanticMemoryComponent | undefined;
    const reflection = selectedEntity.components.get('reflection') as ReflectionComponent | undefined;
    const journal = selectedEntity.components.get('journal') as JournalComponent | undefined;
    const agent = selectedEntity.components.get('agent') as AgentComponent | undefined;

    // Render content
    let currentY = y + this.padding;

    // Title
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 18px monospace';
    ctx.fillText('Memory & Goals', x + this.padding, currentY + 14);
    currentY += 26;

    // Agent name
    if (identity?.name) {
      ctx.fillStyle = '#FFD700';
      ctx.font = 'bold 14px monospace';
      ctx.fillText(`Agent: ${identity.name}`, x + this.padding, currentY);
      currentY += this.lineHeight + 8;
    }

    // Goals section
    if (agent) {
      const hasGoals = agent.personalGoal || agent.mediumTermGoal || agent.groupGoal;
      if (hasGoals) {
        this.renderSeparator(ctx, x, currentY);
        currentY += 10;

        ctx.fillStyle = '#88FF88';
        ctx.font = 'bold 14px monospace';
        ctx.fillText('🎯 Goals', x + this.padding, currentY);
        currentY += this.lineHeight + 5;

        // Personal goal (short-term)
        if (agent.personalGoal) {
          ctx.fillStyle = '#AAFFAA';
          ctx.font = '11px monospace';
          ctx.fillText('Personal:', x + this.padding, currentY);
          currentY += this.lineHeight;
          ctx.fillStyle = '#CCFFCC';
          ctx.font = '10px monospace';
          currentY = this.renderWrappedText(ctx, agent.personalGoal, x, currentY, 2);
        }

        // Medium-term goal
        if (agent.mediumTermGoal) {
          ctx.fillStyle = '#AAFFAA';
          ctx.font = '11px monospace';
          ctx.fillText('Medium-term:', x + this.padding, currentY);
          currentY += this.lineHeight;
          ctx.fillStyle = '#CCFFCC';
          ctx.font = '10px monospace';
          currentY = this.renderWrappedText(ctx, agent.mediumTermGoal, x, currentY, 2);
        }

        // Group goal
        if (agent.groupGoal) {
          ctx.fillStyle = '#AAFFAA';
          ctx.font = '11px monospace';
          ctx.fillText('Group:', x + this.padding, currentY);
          currentY += this.lineHeight;
          ctx.fillStyle = '#CCFFCC';
          ctx.font = '10px monospace';
          currentY = this.renderWrappedText(ctx, agent.groupGoal, x, currentY, 2);
        }
      }
    }

    // Episodic Memories
    if (episodicMemory) {
      this.renderSeparator(ctx, x, currentY);
      currentY += 10;

      ctx.fillStyle = '#88CCFF';
      ctx.font = 'bold 14px monospace';
      ctx.fillText('📝 Episodic Memories', x + this.padding, currentY);
      currentY += this.lineHeight + 5;

      const memories = episodicMemory.episodicMemories || [];
      ctx.fillStyle = '#AAAAAA';
      ctx.font = '12px monospace';
      ctx.fillText(`Total: ${memories.length}`, x + this.padding, currentY);
      currentY += this.lineHeight + 5;

      // Show last 5 memories
      const recentMemories = memories.slice(-5).reverse();
      for (const memory of recentMemories) {
        currentY = this.renderMemory(ctx, x, currentY, memory);
        if (currentY > y + this.panelHeight - 50) break; // Don't overflow panel
      }
    } else {
      ctx.fillStyle = '#FF6666';
      ctx.font = '12px monospace';
      ctx.fillText('No episodic memory component', x + this.padding, currentY);
      currentY += this.lineHeight + 5;
    }

    // Semantic Memory
    if (semanticMemory && currentY < y + this.panelHeight - 100) {
      this.renderSeparator(ctx, x, currentY);
      currentY += 10;

      ctx.fillStyle = '#FFCC88';
      ctx.font = 'bold 14px monospace';
      ctx.fillText('🧠 Beliefs & Knowledge', x + this.padding, currentY);
      currentY += this.lineHeight + 5;

      const beliefs = semanticMemory.beliefs || [];
      const knowledge = semanticMemory.knowledge || [];

      ctx.fillStyle = '#AAAAAA';
      ctx.font = '12px monospace';
      ctx.fillText(`Beliefs: ${beliefs.length}, Knowledge: ${knowledge.length}`, x + this.padding, currentY);
      currentY += this.lineHeight + 5;

      // Show a few beliefs
      for (const belief of beliefs.slice(0, 2)) {
        ctx.fillStyle = '#FFEEAA';
        ctx.font = '11px monospace';
        currentY = this.renderWrappedText(ctx, `• ${belief.content} (${Math.round(belief.confidence * 100)}%)`, x, currentY, 2);
        if (currentY > y + this.panelHeight - 50) break;
      }
    }

    // Reflections
    if (reflection && currentY < y + this.panelHeight - 100) {
      this.renderSeparator(ctx, x, currentY);
      currentY += 10;

      ctx.fillStyle = '#CC88FF';
      ctx.font = 'bold 14px monospace';
      ctx.fillText('💭 Reflections', x + this.padding, currentY);
      currentY += this.lineHeight + 5;

      const reflections = reflection.reflections || [];
      ctx.fillStyle = '#AAAAAA';
      ctx.font = '12px monospace';
      ctx.fillText(`Total: ${reflections.length}`, x + this.padding, currentY);
      currentY += this.lineHeight + 5;

      // Show most recent reflection
      if (reflections.length > 0) {
        const latestReflection = reflections[reflections.length - 1];
        if (latestReflection) {
          ctx.fillStyle = '#DDAAFF';
          ctx.font = '11px monospace';
          currentY = this.renderWrappedText(ctx, latestReflection.text || 'No text', x, currentY, 3);
        }
      }
    }

    // Journal
    if (journal && currentY < y + this.panelHeight - 80) {
      this.renderSeparator(ctx, x, currentY);
      currentY += 10;

      ctx.fillStyle = '#FFAA66';
      ctx.font = 'bold 14px monospace';
      ctx.fillText('📔 Journal', x + this.padding, currentY);
      currentY += this.lineHeight + 5;

      const entries = journal.entries || [];
      ctx.fillStyle = '#AAAAAA';
      ctx.font = '12px monospace';
      ctx.fillText(`Entries: ${entries.length}`, x + this.padding, currentY);
      currentY += this.lineHeight + 5;

      // Show most recent entry
      if (entries.length > 0) {
        const latestEntry = entries[entries.length - 1];
        if (latestEntry) {
          ctx.fillStyle = '#FFDDAA';
          ctx.font = '11px monospace';
          currentY = this.renderWrappedText(ctx, latestEntry.text || 'No content', x, currentY, 2);
        }
      }
    }

    // Help text at bottom
    const helpY = y + this.panelHeight - 20;
    ctx.fillStyle = '#888888';
    ctx.font = '11px monospace';
    ctx.fillText('Press M to close', x + this.padding, helpY);
  }

  /**
   * Render a single memory entry
   */
  private renderMemory(ctx: CanvasRenderingContext2D, panelX: number, y: number, memory: EpisodicMemory): number {
    // Event type and importance (defensive clamp to [0,1])
    const importance = Math.max(0, Math.min(1, memory.importance ?? 0));
    ctx.fillStyle = this.getImportanceColor(importance);
    ctx.font = '11px monospace';
    const importanceText = `★${importance.toFixed(2)}`;
    const eventText = `${memory.eventType} ${importanceText}`;
    ctx.fillText(eventText, panelX + this.padding, y);
    y += this.lineHeight;

    // Summary
    ctx.fillStyle = '#CCCCCC';
    ctx.font = '10px monospace';
    y = this.renderWrappedText(ctx, memory.summary, panelX, y, 2);

    // Metadata - show emotional encoding details (with defensive defaults)
    ctx.fillStyle = '#777777';
    ctx.font = '9px monospace';

    // Line 1: Valence and intensity
    const valence = memory.emotionalValence ?? 0;
    const intensity = memory.emotionalIntensity ?? 0;
    const emotionText = valence > 0 ? '😊' : valence < 0 ? '😢' : '😐';
    const valenceText = valence >= 0 ? `+${valence.toFixed(2)}` : valence.toFixed(2);
    const metaLine1 = `${emotionText} valence:${valenceText} intensity:${intensity.toFixed(2)}`;
    ctx.fillText(metaLine1, panelX + this.padding, y);
    y += this.lineHeight;

    // Line 2: Clarity, surprise, consolidation
    const clarity = memory.clarity ?? 1.0;
    const surprise = memory.surprise ?? 0;
    const metaLine2 = `clarity:${Math.round(clarity * 100)}% surprise:${surprise.toFixed(2)} ${memory.consolidated ? '💾' : ''}`;
    ctx.fillText(metaLine2, panelX + this.padding, y);
    y += this.lineHeight;

    // Line 3: Timestamp, location, participants
    const timestamp = new Date(memory.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    const location = memory.location ? `(${memory.location.x.toFixed(0)},${memory.location.y.toFixed(0)})` : '';
    const participants = memory.participants && memory.participants.length > 0 ? `👥${memory.participants.length}` : '';
    const metaLine3 = `${timestamp} ${location} ${participants}`.trim();
    if (metaLine3) {
      ctx.fillText(metaLine3, panelX + this.padding, y);
      y += this.lineHeight;
    }

    y += 3; // Spacing between memories

    return y;
  }

  /**
   * Render wrapped text (simple word wrapping)
   */
  private renderWrappedText(ctx: CanvasRenderingContext2D, text: string, panelX: number, y: number, maxLines: number): number {
    const maxWidth = this.panelWidth - this.padding * 2;
    const words = text.split(' ');
    let line = '';
    let lineCount = 0;

    for (const word of words) {
      const testLine = line + (line ? ' ' : '') + word;
      const metrics = ctx.measureText(testLine);

      if (metrics.width > maxWidth && line) {
        // Draw current line
        ctx.fillText(line, panelX + this.padding, y);
        y += this.lineHeight;
        line = word;
        lineCount++;

        if (lineCount >= maxLines) {
          // Truncate with ellipsis
          if (words.indexOf(word) < words.length - 1) {
            ctx.fillText('...', panelX + this.padding + ctx.measureText(line).width + 3, y - this.lineHeight);
          }
          break;
        }
      } else {
        line = testLine;
      }
    }

    // Draw final line
    if (line && lineCount < maxLines) {
      ctx.fillText(line, panelX + this.padding, y);
      y += this.lineHeight;
    }

    return y;
  }

  /**
   * Render a separator line
   */
  private renderSeparator(ctx: CanvasRenderingContext2D, panelX: number, y: number): void {
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.beginPath();
    ctx.moveTo(panelX + this.padding, y);
    ctx.lineTo(panelX + this.panelWidth - this.padding, y);
    ctx.stroke();
  }

  /**
   * Get color for importance value
   */
  private getImportanceColor(importance: number): string {
    if (importance > 0.7) return '#FFD700'; // Gold for very important
    if (importance > 0.5) return '#FFA500'; // Orange for important
    if (importance > 0.3) return '#FFCC66'; // Light orange for moderate
    return '#AAAAAA'; // Gray for low importance
  }
}
