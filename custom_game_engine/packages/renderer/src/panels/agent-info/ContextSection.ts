/**
 * ContextSection - Renders the LLM Context tab with copyable prompt text, custom LLM config, and prompt type selection.
 */

import type { SectionRenderContext, IdentityComponent, AgentComponentData } from './types.js';
import { SelectableText } from '../../ui/index.js';
import { StructuredPromptBuilder, TalkerPromptBuilder, ExecutorPromptBuilder } from '@ai-village/llm';
import { renderSeparator } from './renderUtils.js';
import type { LLMHistoryComponent } from '@ai-village/core';

type PromptType = 'talker' | 'executor' | 'combined' | 'last_response';

export class ContextSection {
  private contextText: SelectableText;
  private combinedBuilder = new StructuredPromptBuilder();
  private talkerBuilder = new TalkerPromptBuilder();
  private executorBuilder = new ExecutorPromptBuilder();
  private onOpenConfigCallback: ((agentEntity: any) => void) | null = null;
  private lastPromptContent: string = '';
  private selectedPromptType: PromptType = 'combined';

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
   * Handle click events - check if click is on config, copy, or tab buttons
   */
  handleClick(canvasX: number, canvasY: number): boolean {
    // Check prompt type tab buttons
    const tabButtonsBounds = (this as any).tabButtonsBounds;
    if (tabButtonsBounds) {
      for (const tab of tabButtonsBounds) {
        if (
          canvasX >= tab.x &&
          canvasX <= tab.x + tab.width &&
          canvasY >= tab.y &&
          canvasY <= tab.y + tab.height
        ) {
          this.selectedPromptType = tab.type;
          return true; // Trigger re-render
        }
      }
    }

    // Check copy button
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

    // Custom LLM config status
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
      agentEntity: selectedEntity,
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

    // Prompt type tabs
    const tabWidth = 90;
    const tabHeight = 24;
    const tabPadding = 4;
    const tabs: Array<{ type: PromptType; label: string }> = [
      { type: 'talker', label: 'Talker' },
      { type: 'executor', label: 'Executor' },
      { type: 'combined', label: 'Combined' },
      { type: 'last_response', label: 'Last Response' },
    ];

    const tabButtonsBounds: Array<{ x: number; y: number; width: number; height: number; type: PromptType }> = [];
    let tabX = x + padding;

    for (const tab of tabs) {
      const isSelected = this.selectedPromptType === tab.type;

      // Tab background
      ctx.fillStyle = isSelected ? '#FF9800' : '#555555';
      ctx.fillRect(tabX, currentY, tabWidth, tabHeight);

      // Tab border
      ctx.strokeStyle = isSelected ? '#FFC107' : '#777777';
      ctx.lineWidth = 2;
      ctx.strokeRect(tabX, currentY, tabWidth, tabHeight);

      // Tab label
      ctx.fillStyle = isSelected ? '#FFFFFF' : '#AAAAAA';
      ctx.font = isSelected ? 'bold 11px monospace' : '11px monospace';
      const textWidth = ctx.measureText(tab.label).width;
      const textX = tabX + (tabWidth - textWidth) / 2;
      ctx.fillText(tab.label, textX, currentY + 16);

      // Store bounds
      tabButtonsBounds.push({
        x: tabX,
        y: currentY,
        width: tabWidth,
        height: tabHeight,
        type: tab.type,
      });

      tabX += tabWidth + tabPadding;
    }

    (this as any).tabButtonsBounds = tabButtonsBounds;
    currentY += tabHeight + 8;

    // Prompt type description
    ctx.fillStyle = '#88CCFF';
    ctx.font = '11px monospace';
    let description = '';
    switch (this.selectedPromptType) {
      case 'talker':
        description = 'Social/conversational prompt (goals, priorities, social context)';
        break;
      case 'executor':
        description = 'Task execution prompt (actions, resources, building plans)';
        break;
      case 'combined':
        description = 'Full prompt with all context (used for general decisions)';
        break;
      case 'last_response':
        description = 'Last LLM interaction (prompt + thinking + action + speaking)';
        break;
    }
    ctx.fillText(description, x + padding, currentY);
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
      // Build appropriate prompt based on selected type
      let content = '';

      if (this.selectedPromptType === 'last_response') {
        // Special handling for last response - get from llm_history component
        const llmHistory = selectedEntity?.getComponent('llm_history') as LLMHistoryComponent | undefined;

        if (!llmHistory) {
          content = '(No LLM history available - this agent has not made any LLM decisions yet)';
        } else if (typeof llmHistory.getLastAnyInteraction !== 'function') {
          content = '(LLM history component loaded but missing methods - try reloading the save)';
        } else {
          const lastInteraction = llmHistory.getLastAnyInteraction();

          if (!lastInteraction) {
            content = '(No LLM interactions recorded yet)';
          } else {
            // Format the last interaction nicely (not raw JSON)
            const timestamp = new Date(lastInteraction.timestamp).toLocaleString();
            const layer = lastInteraction.layer.toUpperCase();

            content = `=== LAST LLM INTERACTION ===\n`;
            content += `Layer: ${layer}\n`;
            content += `Time: ${timestamp}\n`;
            content += `Success: ${lastInteraction.success ? 'Yes' : 'No'}\n`;
            if (lastInteraction.error) {
              content += `Error: ${lastInteraction.error}\n`;
            }
            content += `\n--- PROMPT ---\n${lastInteraction.prompt}\n\n`;
            content += `--- RESPONSE ---\n`;

            // Format response fields nicely
            if (lastInteraction.response.thinking) {
              content += `Thinking: ${lastInteraction.response.thinking}\n\n`;
            }
            if (lastInteraction.response.action) {
              content += `Action: ${JSON.stringify(lastInteraction.response.action, null, 2)}\n\n`;
            }
            if (lastInteraction.response.speaking) {
              content += `Speaking: "${lastInteraction.response.speaking}"\n\n`;
            }

            // Only show raw response if other fields weren't parsed
            if (!lastInteraction.response.thinking &&
                !lastInteraction.response.action &&
                !lastInteraction.response.speaking) {
              content += `Raw Response:\n${JSON.stringify(lastInteraction.response.rawResponse, null, 2)}`;
            }
          }
        }
      } else {
        // Standard prompt building for other tabs
        let prompt = '';
        switch (this.selectedPromptType) {
          case 'talker':
            prompt = this.talkerBuilder.buildPrompt(selectedEntity, world);
            break;
          case 'executor':
            prompt = this.executorBuilder.buildPrompt(selectedEntity, world);
            break;
          case 'combined':
            prompt = this.combinedBuilder.buildPrompt(selectedEntity, world);
            break;
        }

        content = !prompt || prompt.length === 0
          ? '(No prompt generated - prompt was empty)'
          : prompt;
      }

      // Store content for copying
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
      const errorContent = `Error generating content:\n${String(e)}`;
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
