/**
 * TextAdventurePanel - 1D Text Renderer Display
 *
 * A panel that displays the text adventure/accessibility output
 * from the TextRenderer (1D Renderer). Supports multiple voice modes
 * and provides a text-based view of the game world.
 *
 * Features:
 * - Real-time text scene descriptions
 * - Voice mode selection (Live, Chronicle, Bardic, Reporter)
 * - Scrollable output history
 * - Screen reader compatible output
 */

import type { World } from '@ai-village/core';
import type { Camera } from './Camera.js';
import type { IWindowPanel } from './types/WindowTypes.js';
import {
  TextRenderer,
  type TextFrame,
  type VoiceMode,
  VOICE_MODE_INFO,
  formatAsTextAdventure,
} from './text/index.js';

// ============================================================================
// Constants
// ============================================================================

const COLORS = {
  background: 'rgba(15, 15, 20, 0.98)',
  headerBg: 'rgba(30, 30, 40, 0.95)',
  sectionBg: 'rgba(20, 20, 30, 0.9)',
  text: '#E0E0E0',
  textMuted: '#AAAAAA',
  textDim: '#666666',
  accent: '#88AAFF',
  scene: '#FFFFFF',
  action: '#AAFFAA',
  dialogue: '#FFDDAA',
  ambience: '#AADDFF',
  entity: '#DDAAFF',
  navigation: '#FFAADD',
  voiceActive: '#4488FF',
  voiceInactive: 'rgba(60, 60, 80, 0.5)',
  scrollbar: 'rgba(100, 100, 140, 0.5)',
  scrollbarThumb: 'rgba(150, 150, 180, 0.7)',
};

const FONTS = {
  header: 'bold 14px "Courier New", monospace',
  text: '13px "Courier New", monospace',
  textSmall: '11px "Courier New", monospace',
  scene: '14px Georgia, serif',
  voiceLabel: '10px Arial, sans-serif',
};

const VOICE_MODES: VoiceMode[] = ['live', 'chronicle', 'bardic', 'reporter'];

// ============================================================================
// TextAdventurePanel Class
// ============================================================================

export class TextAdventurePanel implements IWindowPanel {
  private visible: boolean = false;
  private scrollOffset: number = 0;
  private maxScroll: number = 0;

  // Text renderer instance
  private textRenderer: TextRenderer;
  private camera: Camera | null = null;

  // Current frame data
  private currentFrame: TextFrame | null = null;
  private formattedOutput: string = '';

  // Voice mode UI
  private voiceModeButtons: Array<{ mode: VoiceMode; x: number; y: number; width: number; height: number }> = [];

  constructor() {
    this.textRenderer = new TextRenderer({
      voice: 'live',
      detailLevel: 'standard',
      includeSpeech: true,
      includeAmbience: true,
      includeNavigation: true,
    });
  }

  // ==========================================================================
  // IWindowPanel Implementation
  // ==========================================================================

  getId(): string {
    return 'text-adventure';
  }

  getTitle(): string {
    return 'Text Adventure Mode (1D)';
  }

  getDefaultWidth(): number {
    return 450;
  }

  getDefaultHeight(): number {
    return 500;
  }

  isVisible(): boolean {
    return this.visible;
  }

  setVisible(visible: boolean): void {
    this.visible = visible;
  }

  // ==========================================================================
  // Camera & Configuration
  // ==========================================================================

  /**
   * Set the camera for viewport-based rendering.
   */
  setCamera(camera: Camera): void {
    this.camera = camera;
  }

  /**
   * Get the text renderer for configuration.
   */
  getTextRenderer(): TextRenderer {
    return this.textRenderer;
  }

  /**
   * Set voice mode.
   */
  setVoiceMode(mode: VoiceMode): void {
    this.textRenderer.setVoice(mode);
  }

  /**
   * Get current voice mode.
   */
  getVoiceMode(): VoiceMode {
    return this.textRenderer.getVoice();
  }

  // ==========================================================================
  // Rendering
  // ==========================================================================

  render(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number,
    world?: World
  ): void {
    if (!this.visible) return;

    // Update text output if we have world and camera
    if (world && this.camera) {
      this.currentFrame = this.textRenderer.render(world, this.camera);
      this.formattedOutput = formatAsTextAdventure(this.currentFrame);
    }

    // Draw background
    ctx.fillStyle = COLORS.background;
    ctx.fillRect(x, y, width, height);

    // Draw voice mode selector
    this.renderVoiceModeSelector(ctx, x, y, width);

    // Draw main content
    const contentY = y + 50;
    const contentHeight = height - 50;
    this.renderTextContent(ctx, x, contentY, width, contentHeight);

    // Draw scrollbar
    this.renderScrollbar(ctx, x + width - 12, contentY, 10, contentHeight);
  }

  private renderVoiceModeSelector(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number
  ): void {
    const currentVoice = this.textRenderer.getVoice();
    const buttonWidth = (width - 20) / VOICE_MODES.length;
    const buttonHeight = 35;

    this.voiceModeButtons = [];

    ctx.fillStyle = COLORS.headerBg;
    ctx.fillRect(x, y, width, 45);

    for (let i = 0; i < VOICE_MODES.length; i++) {
      const mode = VOICE_MODES[i]!;
      const bx = x + 5 + i * buttonWidth;
      const by = y + 5;

      // Store button region for click handling
      this.voiceModeButtons.push({
        mode,
        x: bx,
        y: by,
        width: buttonWidth - 5,
        height: buttonHeight,
      });

      // Draw button background
      ctx.fillStyle = mode === currentVoice ? COLORS.voiceActive : COLORS.voiceInactive;
      ctx.fillRect(bx, by, buttonWidth - 5, buttonHeight);

      // Draw button label
      const info = VOICE_MODE_INFO[mode];
      ctx.fillStyle = mode === currentVoice ? '#FFFFFF' : COLORS.textMuted;
      ctx.font = FONTS.header;
      ctx.textAlign = 'center';
      ctx.fillText(info.name, bx + (buttonWidth - 5) / 2, by + 15);

      ctx.font = FONTS.voiceLabel;
      ctx.fillStyle = COLORS.textDim;
      ctx.fillText(info.description.split('.')[0] ?? '', bx + (buttonWidth - 5) / 2, by + 28);
    }

    ctx.textAlign = 'left';
  }

  private renderTextContent(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number
  ): void {
    // Clip to content area
    ctx.save();
    ctx.beginPath();
    ctx.rect(x, y, width - 15, height);
    ctx.clip();

    // Draw text content
    const padding = 10;
    const lineHeight = 18;
    let currentY = y + padding - this.scrollOffset;

    const lines = this.formattedOutput.split('\n');
    let totalHeight = 0;

    for (const line of lines) {
      // Skip lines outside visible area
      if (currentY > y + height + lineHeight) break;

      if (currentY > y - lineHeight) {
        // Determine line color based on content
        let color = COLORS.text;
        if (line.startsWith('═')) {
          color = COLORS.accent;
        } else if (line.includes('DIALOGUE:') || line.includes('says:')) {
          color = COLORS.dialogue;
        } else if (line.includes('NEARBY:') || line.includes('EXITS:')) {
          color = COLORS.entity;
        } else if (line.includes('RECENT EVENTS:')) {
          color = COLORS.action;
        } else if (line.trim().length === 0) {
          // Empty line
        } else if (!line.startsWith(' ')) {
          color = COLORS.scene;
        }

        ctx.fillStyle = color;
        ctx.font = line.startsWith('═') || line.includes('AI VILLAGE') ? FONTS.header : FONTS.text;

        // Word wrap if needed
        const maxWidth = width - padding * 2 - 15;
        const words = line.split(' ');
        let currentLine = '';

        for (const word of words) {
          const testLine = currentLine + (currentLine ? ' ' : '') + word;
          const metrics = ctx.measureText(testLine);

          if (metrics.width > maxWidth && currentLine) {
            ctx.fillText(currentLine, x + padding, currentY);
            currentY += lineHeight;
            totalHeight += lineHeight;
            currentLine = word;
          } else {
            currentLine = testLine;
          }
        }

        if (currentLine) {
          ctx.fillText(currentLine, x + padding, currentY);
          currentY += lineHeight;
          totalHeight += lineHeight;
        }
      } else {
        totalHeight += lineHeight;
        currentY += lineHeight;
      }
    }

    // Update max scroll
    this.maxScroll = Math.max(0, totalHeight - height + padding * 2);

    ctx.restore();

    // Draw content area border
    ctx.strokeStyle = COLORS.headerBg;
    ctx.lineWidth = 1;
    ctx.strokeRect(x, y, width, height);
  }

  private renderScrollbar(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number
  ): void {
    if (this.maxScroll <= 0) return;

    // Draw scrollbar track
    ctx.fillStyle = COLORS.scrollbar;
    ctx.fillRect(x, y, width, height);

    // Calculate thumb size and position
    const visibleRatio = height / (height + this.maxScroll);
    const thumbHeight = Math.max(30, height * visibleRatio);
    const scrollRatio = this.scrollOffset / this.maxScroll;
    const thumbY = y + scrollRatio * (height - thumbHeight);

    // Draw thumb
    ctx.fillStyle = COLORS.scrollbarThumb;
    ctx.fillRect(x, thumbY, width, thumbHeight);
  }

  // ==========================================================================
  // Interaction
  // ==========================================================================

  /**
   * Handle scroll events.
   */
  handleScroll(deltaY: number, contentHeight: number): boolean {
    if (this.maxScroll <= 0) return false;

    this.scrollOffset = Math.max(0, Math.min(this.maxScroll, this.scrollOffset + deltaY));
    return true;
  }

  /**
   * Handle click events.
   */
  handleClick(mouseX: number, mouseY: number): boolean {
    // Check voice mode buttons
    for (const button of this.voiceModeButtons) {
      if (
        mouseX >= button.x &&
        mouseX <= button.x + button.width &&
        mouseY >= button.y &&
        mouseY <= button.y + button.height
      ) {
        this.setVoiceMode(button.mode);
        return true;
      }
    }
    return false;
  }

  /**
   * Get the current text output (for clipboard or screen readers).
   */
  getTextOutput(): string {
    return this.formattedOutput;
  }

  /**
   * Get the current frame data.
   */
  getCurrentFrame(): TextFrame | null {
    return this.currentFrame;
  }
}

// ============================================================================
// Factory Function
// ============================================================================

/**
 * Create a TextAdventurePanel instance.
 */
export function createTextAdventurePanel(): TextAdventurePanel {
  return new TextAdventurePanel();
}
