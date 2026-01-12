import type { CircadianComponent } from '@ai-village/core';

/**
 * Handles rendering of agent overlays: sleep indicators, reflection bubbles, behavior labels.
 * Extracted from Renderer.ts to improve maintainability.
 *
 * Responsibilities:
 * - Sleep indicator (ZZZ) for sleeping agents
 * - Reflection indicator (thought bubble) for reflecting agents
 * - Behavior labels showing current agent activity
 */
export class AgentRenderer {
  private ctx: CanvasRenderingContext2D;
  private tileSize: number;
  private camera: { zoom: number };

  constructor(ctx: CanvasRenderingContext2D, tileSize: number, camera: { zoom: number }) {
    this.ctx = ctx;
    this.tileSize = tileSize;
    this.camera = camera;
  }

  /**
   * Draw floating Z's bubble above sleeping agents
   * Positioned above the behavior label for better visibility
   */
  drawSleepingIndicator(screenX: number, screenY: number): void {
    // Only show if zoom is reasonable
    if (this.camera.zoom < 0.5) return;

    const centerX = screenX + (this.tileSize * this.camera.zoom) / 2;
    // Position Z's ABOVE the behavior label (which is at screenY - 8 to -18)
    const baseY = screenY - 40 * this.camera.zoom;

    // Animate Z's with floating effect
    const time = Date.now() / 1000;
    const offset1 = Math.sin(time * 2) * 3 * this.camera.zoom;
    const offset2 = Math.sin(time * 2 + 0.5) * 3 * this.camera.zoom;
    const offset3 = Math.sin(time * 2 + 1.0) * 3 * this.camera.zoom;

    // Draw three Z's of increasing size with bubble effect
    this.ctx.font = `bold ${12 * this.camera.zoom}px Arial`;
    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    this.ctx.textAlign = 'center';

    this.ctx.fillText('Z', centerX - 8 * this.camera.zoom, baseY + offset1);

    this.ctx.font = `bold ${14 * this.camera.zoom}px Arial`;
    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    this.ctx.fillText('Z', centerX + 2 * this.camera.zoom, baseY - 10 * this.camera.zoom + offset2);

    this.ctx.font = `bold ${16 * this.camera.zoom}px Arial`;
    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    this.ctx.fillText('Z', centerX + 12 * this.camera.zoom, baseY - 20 * this.camera.zoom + offset3);

    // Reset
    this.ctx.textAlign = 'left';
  }

  /**
   * Draw reflection indicator above agents who are reflecting
   * Shows a glowing thought bubble effect
   */
  drawReflectionIndicator(screenX: number, screenY: number, reflectionType?: string): void {
    // Only show if zoom is reasonable
    if (this.camera.zoom < 0.5) return;

    const centerX = screenX + (this.tileSize * this.camera.zoom) / 2;
    // Position above the sleeping indicator area
    const baseY = screenY - 60 * this.camera.zoom;

    // Animate with pulsing glow effect
    const time = Date.now() / 1000;
    const pulse = Math.sin(time * 3) * 0.2 + 0.8; // Oscillate between 0.6 and 1.0

    // Draw thought bubble emoji with glow
    this.ctx.font = `bold ${18 * this.camera.zoom}px Arial`;
    this.ctx.textAlign = 'center';

    // Glow effect
    this.ctx.shadowBlur = 8 * pulse * this.camera.zoom;
    this.ctx.shadowColor = '#9370DB'; // Medium purple glow
    this.ctx.fillStyle = `rgba(255, 255, 255, ${pulse})`;

    // Use different emoji based on reflection type
    const emoji = reflectionType === 'deep' ? '🌟' : '💭';
    this.ctx.fillText(emoji, centerX, baseY);

    // Reset shadow
    this.ctx.shadowBlur = 0;
    this.ctx.textAlign = 'left';
  }

  /**
   * Draw agent behavior label above the agent.
   * Shows what the agent is currently doing.
   */
  drawAgentBehavior(
    screenX: number,
    screenY: number,
    behavior: string,
    behaviorState?: Record<string, unknown>,
    circadian?: CircadianComponent
  ): void {
    // Only show if zoom is reasonable
    if (this.camera.zoom < 0.5) return;

    // Check if actually sleeping (from circadian component)
    const isActuallySleeping = circadian?.isSleeping || false;

    // Format behavior for display
    let displayText = behavior.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

    // Override display if actually sleeping (regardless of behavior state)
    if (isActuallySleeping) {
      displayText = 'Sleeping 💤💤💤';
    } else if (behavior === 'gather' && behaviorState?.resourceType) {
      const resourceType = behaviorState.resourceType as string;
      displayText = `Gathering ${resourceType.charAt(0).toUpperCase() + resourceType.slice(1)}`;
    } else if (behavior === 'build' && behaviorState?.buildingType) {
      displayText = `Building ${behaviorState.buildingType as string}`;
    } else if (behavior === 'seek_food') {
      displayText = 'Foraging';
    } else if (behavior === 'wander') {
      displayText = 'Wandering';
    } else if (behavior === 'idle') {
      displayText = 'Idle';
    } else if (behavior === 'talk') {
      displayText = 'Talking';
    } else if (behavior === 'follow_agent') {
      displayText = 'Following';
    } else if (behavior === 'seek_sleep') {
      displayText = 'Seeking Sleep 😴';
    } else if (behavior === 'forced_sleep') {
      displayText = 'Sleeping 💤💤💤';
    }

    // Position above sprite
    const labelX = screenX + (this.tileSize * this.camera.zoom) / 2;
    const labelY = screenY - 8 * this.camera.zoom;

    // Draw background
    this.ctx.font = `${9 * this.camera.zoom}px monospace`;
    const textWidth = this.ctx.measureText(displayText).width;
    const padding = 3 * this.camera.zoom;

    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    this.ctx.fillRect(
      labelX - textWidth / 2 - padding,
      labelY - 10 * this.camera.zoom,
      textWidth + padding * 2,
      12 * this.camera.zoom
    );

    // Draw text
    this.ctx.fillStyle = '#FFFFFF';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.fillText(displayText, labelX, labelY - 4 * this.camera.zoom);

    // Reset
    this.ctx.textAlign = 'left';
    this.ctx.textBaseline = 'alphabetic';
  }
}
