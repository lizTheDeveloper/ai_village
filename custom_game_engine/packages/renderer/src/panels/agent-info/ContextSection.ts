/**
 * ContextSection - Renders the LLM Context tab with copyable prompt text and custom LLM config.
 */

import type { SectionRenderContext, IdentityComponent, AgentComponentData } from './types.js';
import { SelectableText } from '../../ui/index.js';
import { StructuredPromptBuilder } from '@ai-village/llm';
import { renderSeparator } from './renderUtils.js';

export class ContextSection {
  private contextText: SelectableText;
  private promptBuilder = new StructuredPromptBuilder();
  private onOpenConfigCallback: ((agentEntity: any) => void) | null = null;
  private lastPromptContent: string = '';

  constructor() {
    this.contextText = new SelectableText('agent-context-textarea');
  }

  /**
   * Set callback for when config button is clicked
   */
  setOnOpenConfig(callback: (agentEntity: any) => void): void {
    this.onOpenConfigCallback = callback;
  }

  /**
   * Handle click events - check if click is on config or copy button
   */
  handleClick(canvasX: number, canvasY: number): boolean {
    // Check copy button first
    const copyBounds = (this as any).copyButtonBounds;
    if (copyBounds) {
      if (
        canvasX >= copyBounds.x &&
        canvasX <= copyBounds.x + copyBounds.width &&
        canvasY >= copyBounds.y &&
        canvasY <= copyBounds.y + copyBounds.height
      ) {
        this.copyToClipboard();
        return true;
      }
    }

    // Check config button
    const configBounds = (this as any).configButtonBounds;
    if (!configBounds) {
      console.warn('[ContextSection] No button bounds set');
      return false;
    }


    // Check if click is within config button bounds
    if (
      canvasX >= configBounds.x &&
      canvasX <= configBounds.x + configBounds.width &&
      canvasY >= configBounds.y &&
      canvasY <= configBounds.y + configBounds.height
    ) {
      const agentEntity = configBounds.agentEntity;
      if (this.onOpenConfigCallback && agentEntity) {
        this.onOpenConfigCallback(agentEntity);
      } else {
        console.warn('[ContextSection] No callback or agent entity', {
          hasCallback: !!this.onOpenConfigCallback,
          hasEntity: !!agentEntity
        });
      }
      return true;
    }

    return false;
  }

  /**
   * Copy the LLM context to clipboard
   */
  private copyToClipboard(): void {
    if (!this.lastPromptContent) {
      return;
    }

    navigator.clipboard.writeText(this.lastPromptContent)
      .then(() => {
      })
      .catch(err => {
        console.error('[ContextSection] Failed to copy:', err);
      });
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

    // Custom LLM config status and button
    const hasCustomConfig = agent?.customLLM && (
      agent.customLLM.baseUrl ||
      agent.customLLM.model ||
      agent.customLLM.apiKey ||
      agent.customLLM.customHeaders
    );

    if (hasCustomConfig) {
      ctx.fillStyle = '#FFD700';
      ctx.font = '11px monospace';
      ctx.fillText(`✓ Custom LLM: ${agent?.customLLM?.model || 'configured'}`, x + padding, currentY);
      currentY += lineHeight;
    }

    // Draw clickable config button
    const buttonX = x + padding;
    const buttonY = currentY;
    const buttonWidth = 140;
    const buttonHeight = 20;

    ctx.fillStyle = '#4CAF50';
    ctx.fillRect(buttonX, buttonY, buttonWidth, buttonHeight);
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 11px monospace';
    ctx.fillText('⚙ Configure LLM', buttonX + 8, buttonY + 14);

    // Store config button bounds for click detection
    (this as any).configButtonBounds = {
      x: buttonX,
      y: buttonY,
      width: buttonWidth,
      height: buttonHeight,
      agentEntity: selectedEntity, // Store the entity directly
    };

    // Draw copy button next to config button
    const copyButtonX = buttonX + buttonWidth + 8;
    const copyButtonY = buttonY;
    const copyButtonWidth = 80;
    const copyButtonHeight = 20;

    ctx.fillStyle = '#2196F3';
    ctx.fillRect(copyButtonX, copyButtonY, copyButtonWidth, copyButtonHeight);
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 11px monospace';
    ctx.fillText('📋 Copy', copyButtonX + 10, copyButtonY + 14);

    // Store copy button bounds for click detection
    (this as any).copyButtonBounds = {
      x: copyButtonX,
      y: copyButtonY,
      width: copyButtonWidth,
      height: copyButtonHeight,
    };

    currentY += buttonHeight + 10;

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

      // Store prompt content for copying
      this.lastPromptContent = content;

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
      const errorContent = `Error generating prompt:\n${String(e)}`;
      this.lastPromptContent = errorContent;

      this.contextText.show(
        canvasRect,
        screenX,
        screenY,
        textareaX,
        textareaY,
        textareaWidth,
        textareaHeight,
        errorContent
      );
    }
  }
}
