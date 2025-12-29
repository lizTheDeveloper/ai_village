/**
 * MemoriesSection - Renders the Memories tab showing episodic memories, beliefs, etc.
 */

import type {
  SectionRenderContext,
  IdentityComponent,
  EpisodicMemoryComponent,
  SemanticMemoryComponent,
  SocialMemoryComponent,
  ReflectionComponent,
  JournalComponent,
  AgentComponentData,
} from './types.js';
import type { EpisodicMemory } from '@ai-village/core';
import { renderSeparator } from './renderUtils.js';

export class MemoriesSection {
  private scrollOffset = 0;

  getScrollOffset(): number {
    return this.scrollOffset;
  }

  setScrollOffset(offset: number): void {
    this.scrollOffset = offset;
  }

  handleScroll(deltaY: number): void {
    if (deltaY > 0) {
      this.scrollOffset += 3;
    } else {
      this.scrollOffset = Math.max(0, this.scrollOffset - 3);
    }
  }

  render(
    context: SectionRenderContext,
    identity: IdentityComponent | undefined,
    agent: AgentComponentData | undefined,
    episodicMemory: EpisodicMemoryComponent | undefined,
    semanticMemory: SemanticMemoryComponent | undefined,
    socialMemory: SocialMemoryComponent | undefined,
    reflection: ReflectionComponent | undefined,
    journal: JournalComponent | undefined
  ): void {
    const { ctx, x, y, width, height, padding, lineHeight } = context;

    // Calculate scroll offset
    const scrollY = this.scrollOffset * lineHeight;

    // Set clip region
    ctx.save();
    ctx.beginPath();
    ctx.rect(x, y, width, height);
    ctx.clip();

    let currentY = y + padding - scrollY;

    // Title
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 14px monospace';
    ctx.fillText('Memory & Goals', x + padding, currentY + 12);
    currentY += 20;

    // Agent name
    if (identity?.name) {
      ctx.fillStyle = '#FFD700';
      ctx.font = '12px monospace';
      ctx.fillText(`Agent: ${identity.name}`, x + padding, currentY);
      currentY += lineHeight + 5;
    }

    // GOALS SECTION
    if (agent?.personalGoal || agent?.mediumTermGoal || agent?.groupGoal) {
      renderSeparator(ctx, x, currentY, width, padding);
      currentY += 8;

      ctx.fillStyle = '#FFD700';
      ctx.font = 'bold 12px monospace';
      ctx.fillText('Current Goals', x + padding, currentY);
      currentY += lineHeight + 3;

      if (agent.personalGoal) {
        ctx.fillStyle = '#FFEE99';
        ctx.font = '10px monospace';
        ctx.fillText('Personal:', x + padding, currentY);
        currentY += lineHeight - 2;
        ctx.fillStyle = '#FFFFFF';
        currentY = this.renderWrappedText(ctx, agent.personalGoal, x, currentY, width, padding, 2);
      }

      if (agent.mediumTermGoal) {
        ctx.fillStyle = '#88CCFF';
        ctx.font = '10px monospace';
        ctx.fillText('Plan:', x + padding, currentY);
        currentY += lineHeight - 2;
        ctx.fillStyle = '#AADDFF';
        currentY = this.renderWrappedText(ctx, agent.mediumTermGoal, x, currentY, width, padding, 2);
      }

      if (agent.groupGoal) {
        ctx.fillStyle = '#FF88FF';
        ctx.font = '10px monospace';
        ctx.fillText('Team:', x + padding, currentY);
        currentY += lineHeight - 2;
        ctx.fillStyle = '#FFAAFF';
        currentY = this.renderWrappedText(ctx, agent.groupGoal, x, currentY, width, padding, 2);
      }
    }

    // Episodic Memories
    if (episodicMemory) {
      renderSeparator(ctx, x, currentY, width, padding);
      currentY += 8;

      ctx.fillStyle = '#88CCFF';
      ctx.font = 'bold 12px monospace';
      ctx.fillText('Episodic Memories', x + padding, currentY);
      currentY += lineHeight;

      const memories = episodicMemory.episodicMemories || [];
      ctx.fillStyle = '#AAAAAA';
      ctx.font = '10px monospace';
      ctx.fillText(`Total: ${memories.length}`, x + padding, currentY);
      currentY += lineHeight + 3;

      // Show last 5 memories
      const recentMemories = memories.slice(-5).reverse();
      for (const memory of recentMemories) {
        currentY = this.renderMemoryItem(ctx, x, currentY, width, padding, lineHeight, memory);
        if (currentY > y + height + scrollY) break;
      }
    } else {
      ctx.fillStyle = '#666666';
      ctx.font = '11px monospace';
      ctx.fillText('No episodic memory', x + padding, currentY);
      currentY += lineHeight;
    }

    // Semantic Memory (Beliefs)
    if (semanticMemory && currentY < y + height + scrollY) {
      renderSeparator(ctx, x, currentY, width, padding);
      currentY += 8;

      ctx.fillStyle = '#FFCC88';
      ctx.font = 'bold 12px monospace';
      ctx.fillText('Beliefs & Knowledge', x + padding, currentY);
      currentY += lineHeight;

      const beliefs = semanticMemory.beliefs || [];
      ctx.fillStyle = '#AAAAAA';
      ctx.font = '10px monospace';
      ctx.fillText(`Beliefs: ${beliefs.length}`, x + padding, currentY);
      currentY += lineHeight + 3;

      for (const belief of beliefs.slice(0, 3)) {
        ctx.fillStyle = '#FFEEAA';
        ctx.font = '10px monospace';
        const text = `- ${belief.content} (${Math.round(belief.confidence * 100)}%)`;
        currentY = this.renderWrappedText(ctx, text, x, currentY, width, padding, 2);
      }
    }

    // Social Memory
    if (socialMemory && currentY < y + height + scrollY) {
      renderSeparator(ctx, x, currentY, width, padding);
      currentY += 8;

      ctx.fillStyle = '#88FFCC';
      ctx.font = 'bold 12px monospace';
      ctx.fillText('Social Memory', x + padding, currentY);
      currentY += lineHeight;

      const socialMemories = socialMemory.socialMemories as Map<string, any> | undefined;
      const relationshipCount = socialMemories ? socialMemories.size : 0;
      ctx.fillStyle = '#AAAAAA';
      ctx.font = '10px monospace';
      ctx.fillText(`Relationships: ${relationshipCount}`, x + padding, currentY);
      currentY += lineHeight + 3;

      if (socialMemories && socialMemories.size > 0) {
        const relationships = Array.from(socialMemories.entries()).slice(0, 3);
        for (const [agentId, mem] of relationships) {
          ctx.fillStyle = '#AAFFDD';
          ctx.font = '10px monospace';
          const icon = mem.overallSentiment > 0 ? '+' : mem.overallSentiment < 0 ? '-' : '~';
          const trust = Math.round(mem.trust * 100);
          ctx.fillText(`${icon} ${agentId.slice(0, 8)}: trust ${trust}%`, x + padding, currentY);
          currentY += lineHeight;
        }
      }
    }

    // Reflections
    if (reflection && currentY < y + height + scrollY) {
      renderSeparator(ctx, x, currentY, width, padding);
      currentY += 8;

      ctx.fillStyle = '#CC88FF';
      ctx.font = 'bold 12px monospace';
      ctx.fillText('Reflections', x + padding, currentY);
      currentY += lineHeight;

      const reflections = reflection.reflections || [];
      ctx.fillStyle = '#AAAAAA';
      ctx.font = '10px monospace';
      ctx.fillText(`Total: ${reflections.length}`, x + padding, currentY);
      currentY += lineHeight + 3;

      if (reflections.length > 0) {
        const latest = reflections[reflections.length - 1];
        if (latest) {
          ctx.fillStyle = '#DDAAFF';
          ctx.font = '10px monospace';
          currentY = this.renderWrappedText(ctx, latest.text || 'No text', x, currentY, width, padding, 3);
        }
      }
    }

    // Journal
    if (journal && currentY < y + height + scrollY) {
      renderSeparator(ctx, x, currentY, width, padding);
      currentY += 8;

      ctx.fillStyle = '#FFAA66';
      ctx.font = 'bold 12px monospace';
      ctx.fillText('Journal', x + padding, currentY);
      currentY += lineHeight;

      const entries = journal.entries || [];
      ctx.fillStyle = '#AAAAAA';
      ctx.font = '10px monospace';
      ctx.fillText(`Entries: ${entries.length}`, x + padding, currentY);
      currentY += lineHeight + 3;

      if (entries.length > 0) {
        const latest = entries[entries.length - 1];
        if (latest) {
          ctx.fillStyle = '#FFDDAA';
          ctx.font = '10px monospace';
          currentY = this.renderWrappedText(ctx, latest.text || 'No content', x, currentY, width, padding, 2);
        }
      }
    }

    ctx.restore();

    // Scroll indicator
    if (this.scrollOffset > 0) {
      ctx.fillStyle = '#888888';
      ctx.font = '10px monospace';
      ctx.fillText('scroll for more', x + padding, y + height - 5);
    }
  }

  private renderMemoryItem(
    ctx: CanvasRenderingContext2D,
    panelX: number,
    y: number,
    width: number,
    padding: number,
    lineHeight: number,
    memory: EpisodicMemory
  ): number {
    const importance = Math.max(0, Math.min(1, memory.importance ?? 0));
    ctx.fillStyle = importance > 0.5 ? '#FFD700' : '#AAAAAA';
    ctx.font = '10px monospace';
    ctx.fillText(`${memory.eventType} (${(importance * 100).toFixed(0)}%)`, panelX + padding, y);
    y += lineHeight;

    ctx.fillStyle = '#CCCCCC';
    ctx.font = '9px monospace';
    y = this.renderWrappedText(ctx, memory.summary, panelX, y, width, padding, 2);

    y += 3;
    return y;
  }

  private renderWrappedText(
    ctx: CanvasRenderingContext2D,
    text: string,
    panelX: number,
    y: number,
    width: number,
    padding: number,
    maxLines: number
  ): number {
    const maxWidth = width - padding * 2;
    const words = text.split(' ');
    let line = '';
    let lineCount = 0;
    const lineHeight = 16;

    for (const word of words) {
      const testLine = line + (line ? ' ' : '') + word;
      const metrics = ctx.measureText(testLine);

      if (metrics.width > maxWidth && line) {
        ctx.fillText(line, panelX + padding, y);
        y += lineHeight;
        line = word;
        lineCount++;
        if (lineCount >= maxLines) break;
      } else {
        line = testLine;
      }
    }

    if (line && lineCount < maxLines) {
      ctx.fillText(line, panelX + padding, y);
      y += lineHeight;
    }

    return y;
  }
}
