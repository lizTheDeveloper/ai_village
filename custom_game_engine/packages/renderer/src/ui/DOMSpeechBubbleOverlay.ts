/**
 * DOMSpeechBubbleOverlay - Vanilla TypeScript HTML overlay for speech bubbles with alien text tooltips
 *
 * This component renders speech bubbles as HTML elements positioned over the canvas,
 * showing alien text with hover tooltips that reveal English translations.
 */

import type { AlienWordToken } from '@ai-village/language';

interface SpeechBubble {
  agentId: string;
  agentName: string;
  text: string;
  alienTokens?: AlienWordToken[]; // Alien text with translations
  x: number; // Screen position in pixels
  y: number;
  timestamp: number;
  duration: number; // How long to display (ms)
}

/**
 * Manages a DOM overlay for displaying speech bubbles with alien text tooltips
 */
export class DOMSpeechBubbleOverlay {
  private container: HTMLDivElement;
  private bubbles: Map<string, { bubble: SpeechBubble; element: HTMLDivElement; timer: number }> = new Map();

  constructor(parentElement: HTMLElement) {
    // Create overlay container
    this.container = document.createElement('div');
    this.container.className = 'speech-bubble-overlay';
    this.container.style.position = 'absolute';
    this.container.style.top = '0';
    this.container.style.left = '0';
    this.container.style.width = '100%';
    this.container.style.height = '100%';
    this.container.style.pointerEvents = 'none';
    this.container.style.zIndex = '999';
    parentElement.appendChild(this.container);
  }

  /**
   * Register new speech bubble
   */
  registerSpeech(
    agentId: string,
    agentName: string,
    text: string,
    x: number,
    y: number,
    alienTokens?: AlienWordToken[],
    duration: number = 5000
  ): void {
    // Remove existing bubble for this agent
    this.removeBubble(agentId);

    const bubble: SpeechBubble = {
      agentId,
      agentName,
      text,
      alienTokens,
      x,
      y,
      timestamp: Date.now(),
      duration,
    };

    // Create bubble element
    const element = this.createBubbleElement(bubble);
    this.container.appendChild(element);

    // Set up auto-removal timer
    const timer = window.setTimeout(() => {
      this.removeBubble(agentId);
    }, duration);

    this.bubbles.set(agentId, { bubble, element, timer });
  }

  /**
   * Remove a speech bubble by agent ID
   */
  removeBubble(agentId: string): void {
    const existing = this.bubbles.get(agentId);
    if (existing) {
      window.clearTimeout(existing.timer);
      existing.element.remove();
      this.bubbles.delete(agentId);
    }
  }

  /**
   * Clear all speech bubbles
   */
  clearAll(): void {
    for (const [agentId] of this.bubbles) {
      this.removeBubble(agentId);
    }
  }

  /**
   * Update bubble positions (call when camera moves or screen is resized)
   */
  updatePositions(getScreenPosition: (agentId: string) => { x: number; y: number } | null): void {
    for (const [agentId, { bubble, element }] of this.bubbles) {
      const pos = getScreenPosition(agentId);
      if (pos) {
        bubble.x = pos.x;
        bubble.y = pos.y;
        element.style.left = `${pos.x}px`;
        element.style.top = `${pos.y}px`;
      }
    }
  }

  /**
   * Create HTML element for a speech bubble
   */
  private createBubbleElement(bubble: SpeechBubble): HTMLDivElement {
    const wrapper = document.createElement('div');
    wrapper.className = 'speech-bubble';
    wrapper.style.position = 'absolute';
    wrapper.style.left = `${bubble.x}px`;
    wrapper.style.top = `${bubble.y}px`;
    wrapper.style.transform = 'translate(-50%, -100%)';
    wrapper.style.zIndex = '1000';

    // Allow pointer events only if there's alien text (for hover tooltips)
    const hasAlienText = bubble.alienTokens && bubble.alienTokens.length > 0;
    wrapper.style.pointerEvents = hasAlienText ? 'auto' : 'none';

    const bubbleContent = document.createElement('div');
    bubbleContent.style.backgroundColor = 'rgba(0, 0, 0, 0.85)';
    bubbleContent.style.color = '#ffffff';
    bubbleContent.style.padding = '8px 12px';
    bubbleContent.style.borderRadius = '8px';
    bubbleContent.style.fontSize = '14px';
    bubbleContent.style.fontFamily = 'monospace';
    bubbleContent.style.maxWidth = '200px';
    bubbleContent.style.wordWrap = 'break-word';
    bubbleContent.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.3)';
    bubbleContent.style.border = '1px solid rgba(255, 255, 255, 0.2)';

    // Agent name
    const nameDiv = document.createElement('div');
    nameDiv.style.fontSize = '11px';
    nameDiv.style.color = '#888';
    nameDiv.style.marginBottom = '4px';
    nameDiv.style.fontWeight = 'bold';
    nameDiv.textContent = bubble.agentName;
    bubbleContent.appendChild(nameDiv);

    // Speech text
    const textDiv = document.createElement('div');
    if (hasAlienText) {
      // Show alien text with tooltips
      this.appendAlienText(textDiv, bubble.alienTokens!);
    } else {
      // Show plain text
      textDiv.textContent = bubble.text;
    }
    bubbleContent.appendChild(textDiv);

    // Speech bubble pointer (triangle)
    const pointer = document.createElement('div');
    pointer.style.position = 'absolute';
    pointer.style.bottom = '-6px';
    pointer.style.left = '50%';
    pointer.style.transform = 'translateX(-50%)';
    pointer.style.width = '0';
    pointer.style.height = '0';
    pointer.style.borderLeft = '6px solid transparent';
    pointer.style.borderRight = '6px solid transparent';
    pointer.style.borderTop = '6px solid rgba(0, 0, 0, 0.85)';
    bubbleContent.appendChild(pointer);

    wrapper.appendChild(bubbleContent);
    return wrapper;
  }

  /**
   * Append alien text with hover tooltips
   */
  private appendAlienText(container: HTMLDivElement, tokens: AlienWordToken[]): void {
    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i];

      // Add space before word (except first word)
      if (i > 0) {
        const space = document.createTextNode(' ');
        container.appendChild(space);
      }

      // Alien word with tooltip
      const span = document.createElement('span');
      span.textContent = token.alien;
      span.style.color = '#8B5CF6'; // Purple for alien text
      span.style.cursor = 'help';
      span.style.position = 'relative';
      span.style.display = 'inline-block';

      // Create tooltip
      const tooltip = document.createElement('div');
      tooltip.className = 'alien-word-tooltip';
      tooltip.style.position = 'absolute';
      tooltip.style.bottom = '100%';
      tooltip.style.left = '50%';
      tooltip.style.transform = 'translateX(-50%)';
      tooltip.style.backgroundColor = 'rgba(0, 0, 0, 0.95)';
      tooltip.style.color = '#fff';
      tooltip.style.padding = '4px 8px';
      tooltip.style.borderRadius = '4px';
      tooltip.style.fontSize = '12px';
      tooltip.style.whiteSpace = 'nowrap';
      tooltip.style.marginBottom = '4px';
      tooltip.style.opacity = '0';
      tooltip.style.pointerEvents = 'none';
      tooltip.style.transition = 'opacity 0.2s';
      tooltip.style.zIndex = '1001';
      tooltip.textContent = token.english;

      // Hover handlers
      let hoverTimeout: number | null = null;
      span.addEventListener('mouseenter', () => {
        hoverTimeout = window.setTimeout(() => {
          tooltip.style.opacity = '1';
        }, 200);
      });
      span.addEventListener('mouseleave', () => {
        if (hoverTimeout !== null) {
          window.clearTimeout(hoverTimeout);
          hoverTimeout = null;
        }
        tooltip.style.opacity = '0';
      });

      span.appendChild(tooltip);
      container.appendChild(span);
    }
  }

  /**
   * Clean up resources
   */
  destroy(): void {
    this.clearAll();
    this.container.remove();
  }
}
