/**
 * PrayingAgentIndicators - Visual indicators for agents who are praying
 *
 * Features:
 * - Subtle glow/aura around praying agents
 * - Prayer thought bubbles that bubble up
 * - Urgency-based coloring
 * - Animated effects (pulse, float)
 *
 * See: specs/divine-systems-ui.md
 */

import { PrayerUrgency, URGENCY_COLORS } from './DivineUITypes.js';

export interface PrayingAgent {
  entityId: string;
  agentName: string;
  worldX: number;
  worldY: number;
  prayerContent: string;
  urgency: PrayerUrgency;
  startTime: number;
  domain?: string;
}

export interface PrayingAgentIndicatorsState {
  prayingAgents: PrayingAgent[];
  enabled: boolean;
  showGlow: boolean;
  showBubbles: boolean;
  bubbleDuration: number; // ms before bubble fades
}

const URGENCY_GLOW_INTENSITY: Record<PrayerUrgency, number> = {
  critical: 0.9,
  urgent: 0.7,
  moderate: 0.5,
  gratitude: 0.3,
};

const SIZES = {
  glowRadius: 30,
  bubbleMaxWidth: 120,
  bubbleMaxHeight: 60,
  bubblePadding: 8,
  bubbleOffset: 40,
  iconSize: 16,
};

/**
 * PrayingAgentIndicators - Renders visual indicators for praying agents
 */
export class PrayingAgentIndicators {
  private state: PrayingAgentIndicatorsState;
  private animationTime: number = 0;

  constructor(initialState: PrayingAgentIndicatorsState) {
    this.state = initialState;
  }

  /**
   * Update state
   */
  updateState(newState: Partial<PrayingAgentIndicatorsState>): void {
    this.state = { ...this.state, ...newState };
  }

  /**
   * Get current state
   */
  getState(): PrayingAgentIndicatorsState {
    return { ...this.state };
  }

  /**
   * Add a praying agent
   */
  addPrayingAgent(agent: PrayingAgent): void {
    // Check if already exists
    const exists = this.state.prayingAgents.some(a => a.entityId === agent.entityId);
    if (!exists) {
      this.state.prayingAgents.push(agent);
    }
  }

  /**
   * Remove a praying agent
   */
  removePrayingAgent(entityId: string): void {
    this.state.prayingAgents = this.state.prayingAgents.filter(a => a.entityId !== entityId);
  }

  /**
   * Clear all praying agents
   */
  clearAll(): void {
    this.state.prayingAgents = [];
  }

  /**
   * Update animation state (call this each frame)
   */
  update(deltaTime: number): void {
    this.animationTime += deltaTime * 0.003;

    // Remove expired bubbles
    const now = Date.now();
    this.state.prayingAgents = this.state.prayingAgents.filter(agent => {
      const age = now - agent.startTime;
      return age < this.state.bubbleDuration;
    });
  }

  /**
   * Render all praying agent indicators
   *
   * @param ctx - Canvas context
   * @param worldToScreen - Function to convert world coordinates to screen coordinates
   */
  render(
    ctx: CanvasRenderingContext2D,
    worldToScreen: (wx: number, wy: number) => { x: number; y: number }
  ): void {
    if (!this.state.enabled) return;

    // Render glows first (behind bubbles)
    if (this.state.showGlow) {
      for (const agent of this.state.prayingAgents) {
        const screen = worldToScreen(agent.worldX, agent.worldY);
        this.renderGlow(ctx, agent, screen.x, screen.y);
      }
    }

    // Render bubbles on top
    if (this.state.showBubbles) {
      for (const agent of this.state.prayingAgents) {
        const screen = worldToScreen(agent.worldX, agent.worldY);
        this.renderBubble(ctx, agent, screen.x, screen.y);
      }
    }
  }

  /**
   * Render the glow/aura around a praying agent
   */
  private renderGlow(
    ctx: CanvasRenderingContext2D,
    agent: PrayingAgent,
    screenX: number,
    screenY: number
  ): void {
    const color = URGENCY_COLORS[agent.urgency];
    const baseIntensity = URGENCY_GLOW_INTENSITY[agent.urgency];

    // Pulsing effect
    const pulseIntensity = baseIntensity * (0.7 + 0.3 * Math.sin(this.animationTime * 2 + agent.startTime * 0.001));

    // Create radial gradient for glow
    const gradient = ctx.createRadialGradient(
      screenX, screenY, 0,
      screenX, screenY, SIZES.glowRadius
    );

    gradient.addColorStop(0, this.hexToRgba(color, pulseIntensity));
    gradient.addColorStop(0.5, this.hexToRgba(color, pulseIntensity * 0.5));
    gradient.addColorStop(1, this.hexToRgba(color, 0));

    // Draw glow
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(screenX, screenY, SIZES.glowRadius, 0, Math.PI * 2);
    ctx.fill();

    // Draw prayer icon
    ctx.font = `${SIZES.iconSize}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = color;

    // Floating effect for icon
    const floatY = Math.sin(this.animationTime * 1.5 + agent.startTime * 0.001) * 3;
    ctx.fillText('\u{1F64F}', screenX, screenY - 20 + floatY);
  }

  /**
   * Render the prayer thought bubble
   */
  private renderBubble(
    ctx: CanvasRenderingContext2D,
    agent: PrayingAgent,
    screenX: number,
    screenY: number
  ): void {
    const age = Date.now() - agent.startTime;
    const fadeProgress = Math.min(1, age / 500); // Fade in
    const fadeOut = Math.max(0, 1 - (age - this.state.bubbleDuration + 1000) / 1000); // Fade out
    const alpha = Math.min(fadeProgress, fadeOut);

    if (alpha <= 0) return;

    ctx.globalAlpha = alpha;

    // Calculate bubble position (floating upward)
    const floatOffset = Math.sin(this.animationTime + agent.startTime * 0.001) * 5;
    const riseOffset = Math.min(20, age * 0.01); // Slowly rise
    const bubbleX = screenX;
    const bubbleY = screenY - SIZES.bubbleOffset - riseOffset + floatOffset;

    // Truncate prayer content
    ctx.font = '11px sans-serif';
    const maxChars = 30;
    let text = agent.prayerContent;
    if (text.length > maxChars) {
      text = text.substring(0, maxChars - 3) + '...';
    }

    // Calculate bubble size
    const textWidth = Math.min(ctx.measureText(text).width, SIZES.bubbleMaxWidth - SIZES.bubblePadding * 2);
    const bubbleWidth = textWidth + SIZES.bubblePadding * 2 + 20; // Extra for icon
    const bubbleHeight = 32;

    // Draw bubble background
    const color = URGENCY_COLORS[agent.urgency];

    ctx.fillStyle = 'rgba(30, 30, 40, 0.9)';
    this.roundRect(ctx, bubbleX - bubbleWidth / 2, bubbleY - bubbleHeight / 2, bubbleWidth, bubbleHeight, 8);
    ctx.fill();

    // Draw border
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    this.roundRect(ctx, bubbleX - bubbleWidth / 2, bubbleY - bubbleHeight / 2, bubbleWidth, bubbleHeight, 8);
    ctx.stroke();

    // Draw bubble pointer
    ctx.fillStyle = 'rgba(30, 30, 40, 0.9)';
    ctx.beginPath();
    ctx.moveTo(bubbleX - 6, bubbleY + bubbleHeight / 2);
    ctx.lineTo(bubbleX, bubbleY + bubbleHeight / 2 + 10);
    ctx.lineTo(bubbleX + 6, bubbleY + bubbleHeight / 2);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = color;
    ctx.beginPath();
    ctx.moveTo(bubbleX - 6, bubbleY + bubbleHeight / 2);
    ctx.lineTo(bubbleX, bubbleY + bubbleHeight / 2 + 10);
    ctx.lineTo(bubbleX + 6, bubbleY + bubbleHeight / 2);
    ctx.stroke();

    // Draw prayer icon
    ctx.font = '14px sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = color;
    ctx.fillText('\u{1F64F}', bubbleX - bubbleWidth / 2 + SIZES.bubblePadding, bubbleY);

    // Draw text
    ctx.font = '11px sans-serif';
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText(
      text,
      bubbleX - bubbleWidth / 2 + SIZES.bubblePadding + 18,
      bubbleY
    );

    ctx.globalAlpha = 1;
  }

  /**
   * Helper to draw rounded rectangle
   */
  private roundRect(
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
   * Convert hex color to rgba
   */
  private hexToRgba(hex: string, alpha: number): string {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  /**
   * Check if an agent is currently praying
   */
  isAgentPraying(entityId: string): boolean {
    return this.state.prayingAgents.some(a => a.entityId === entityId);
  }

  /**
   * Get praying agent by entity ID
   */
  getPrayingAgent(entityId: string): PrayingAgent | undefined {
    return this.state.prayingAgents.find(a => a.entityId === entityId);
  }
}
