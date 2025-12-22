/**
 * Renders speech bubbles above agents when they speak
 */
export class SpeechBubbleRenderer {
  private activeSpeech: Map<string, { text: string; timestamp: number }> = new Map();
  private readonly DISPLAY_DURATION = 5000; // 5 seconds
  private readonly MAX_WIDTH = 200;
  private readonly PADDING = 8;
  private readonly BUBBLE_OFFSET_Y = -40;

  /**
   * Register speech from an agent
   */
  registerSpeech(agentId: string, text: string): void {
    if (!text || text.trim() === '') return;

    this.activeSpeech.set(agentId, {
      text: text.trim(),
      timestamp: Date.now()
    });
  }

  /**
   * Clear expired speech bubbles
   */
  update(): void {
    const now = Date.now();
    for (const [agentId, speech] of this.activeSpeech.entries()) {
      if (now - speech.timestamp > this.DISPLAY_DURATION) {
        this.activeSpeech.delete(agentId);
      }
    }
  }

  /**
   * Render all active speech bubbles
   */
  render(
    ctx: CanvasRenderingContext2D,
    agents: Array<{ id: string; x: number; y: number; name?: string }>
  ): void {
    ctx.save();

    for (const agent of agents) {
      const speech = this.activeSpeech.get(agent.id);
      if (!speech) continue;

      this.renderBubble(ctx, agent.x, agent.y, speech.text, agent.name);
    }

    ctx.restore();
  }

  /**
   * Render a single speech bubble
   */
  private renderBubble(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    text: string,
    agentName?: string
  ): void {
    // Measure text and wrap if needed
    const lines = this.wrapText(ctx, text, this.MAX_WIDTH - this.PADDING * 2);

    // Calculate bubble dimensions
    const lineHeight = 16;
    const nameHeight = agentName ? 14 : 0;
    const bubbleWidth = this.MAX_WIDTH;
    const bubbleHeight = lines.length * lineHeight + this.PADDING * 2 + nameHeight;

    // Position bubble above agent
    const bubbleX = x - bubbleWidth / 2;
    const bubbleY = y + this.BUBBLE_OFFSET_Y - bubbleHeight;

    // Draw bubble background
    ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
    ctx.strokeStyle = 'rgba(100, 100, 100, 0.8)';
    ctx.lineWidth = 2;

    this.drawRoundedRect(
      ctx,
      bubbleX,
      bubbleY,
      bubbleWidth,
      bubbleHeight,
      8
    );
    ctx.fill();
    ctx.stroke();

    // Draw pointer to agent
    ctx.beginPath();
    ctx.moveTo(x, y + this.BUBBLE_OFFSET_Y);
    ctx.lineTo(x - 8, bubbleY + bubbleHeight);
    ctx.lineTo(x + 8, bubbleY + bubbleHeight);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Draw agent name if provided
    let textStartY = bubbleY + this.PADDING;
    if (agentName) {
      ctx.fillStyle = '#666';
      ctx.font = 'bold 11px sans-serif';
      ctx.fillText(agentName + ':', bubbleX + this.PADDING, textStartY + 10);
      textStartY += nameHeight;
    }

    // Draw text
    ctx.fillStyle = '#000';
    ctx.font = '13px sans-serif';
    lines.forEach((line, i) => {
      ctx.fillText(
        line,
        bubbleX + this.PADDING,
        textStartY + (i + 1) * lineHeight
      );
    });
  }

  /**
   * Draw a rounded rectangle
   */
  private drawRoundedRect(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number,
    radius: number
  ): void {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
  }

  /**
   * Wrap text to fit within max width
   */
  private wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
    const words = text.split(' ');
    const lines: string[] = [];
    let currentLine = '';

    ctx.font = '13px sans-serif';

    for (const word of words) {
      const testLine = currentLine + (currentLine ? ' ' : '') + word;
      const metrics = ctx.measureText(testLine);

      if (metrics.width > maxWidth && currentLine) {
        lines.push(currentLine);
        currentLine = word;
      } else {
        currentLine = testLine;
      }
    }

    if (currentLine) {
      lines.push(currentLine);
    }

    return lines;
  }

  /**
   * Clear all speech bubbles
   */
  clear(): void {
    this.activeSpeech.clear();
  }

  /**
   * Check if an agent has active speech
   */
  hasSpeech(agentId: string): boolean {
    return this.activeSpeech.has(agentId);
  }

  /**
   * Get active speech count
   */
  getActiveCount(): number {
    return this.activeSpeech.size;
  }
}
