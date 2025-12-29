/**
 * ContextSection - Renders the LLM Context tab with copyable prompt text.
 */

import type { SectionRenderContext, IdentityComponent, AgentComponentData } from './types.js';
import { SelectableText } from '../../ui/index.js';
import { StructuredPromptBuilder } from '@ai-village/llm';
import { renderSeparator } from './renderUtils.js';

export class ContextSection {
  private contextText: SelectableText;
  private promptBuilder = new StructuredPromptBuilder();

  constructor() {
    this.contextText = new SelectableText('agent-context-textarea');
  }

  hide(): void {
    this.contextText.hide();
  }

  destroy(): void {
    this.contextText.destroy();
  }

  render(
    context: SectionRenderContext,
    identity: IdentityComponent | undefined,
    agent: AgentComponentData | undefined,
    selectedEntity: any,
    world: any,
    screenX: number,
    screenY: number
  ): void {
    const { ctx, x, y, width, height, padding, lineHeight } = context;

    let currentY = y + padding;

    // Title
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 14px monospace';
    ctx.fillText('LLM Context (copyable)', x + padding, currentY + 12);
    currentY += 20;

    // Agent name and LLM status
    if (identity?.name) {
      ctx.fillStyle = '#FFD700';
      ctx.font = '12px monospace';
      ctx.fillText(`Agent: ${identity.name}`, x + padding, currentY);
      currentY += lineHeight;
    }

    const usesLLM = agent?.useLLM ?? false;
    ctx.fillStyle = usesLLM ? '#00FF00' : '#FF6666';
    ctx.font = '11px monospace';
    ctx.fillText(`Uses LLM: ${usesLLM ? 'Yes' : 'No'}`, x + padding, currentY);
    currentY += lineHeight + 5;

    if (!usesLLM) {
      ctx.fillStyle = '#888888';
      ctx.font = '11px monospace';
      ctx.fillText('This agent uses scripted behavior.', x + padding, currentY);
      currentY += lineHeight;
      ctx.fillText('No LLM prompt is generated.', x + padding, currentY);
      this.contextText.hide();
      return;
    }

    // Draw separator
    renderSeparator(ctx, x, currentY, width, padding);
    currentY += 8;

    ctx.fillStyle = '#88CCFF';
    ctx.font = 'bold 12px monospace';
    ctx.fillText('Next Prompt Preview:', x + padding, currentY);
    currentY += lineHeight + 5;

    // Calculate textarea position
    const textareaX = x + 2;
    const textareaY = currentY;
    const textareaWidth = width - 4;
    const textareaHeight = Math.max(100, y + height - currentY - 5);

    // Get canvas for positioning
    const canvas = document.querySelector('canvas#game-canvas') || document.querySelector('canvas');
    if (!canvas) {
      this.contextText.hide();
      return;
    }
    const canvasRect = canvas.getBoundingClientRect();

    try {
      const prompt = this.promptBuilder.buildPrompt(selectedEntity, world);
      const content = !prompt || prompt.length === 0
        ? '(No prompt generated - prompt was empty)'
        : prompt;

      this.contextText.show(
        canvasRect,
        screenX,
        screenY,
        textareaX,
        textareaY,
        textareaWidth,
        textareaHeight,
        content
      );
    } catch (e) {
      this.contextText.show(
        canvasRect,
        screenX,
        screenY,
        textareaX,
        textareaY,
        textareaWidth,
        textareaHeight,
        `Error generating prompt:\n${String(e)}`
      );
    }
  }
}
