import type { IWindowPanel } from './types/WindowTypes.js';
import type { WindowManager } from './WindowManager.js';

/**
 * Controls panel showing all keyboard shortcuts and game controls.
 * Dynamically reads keybindings from WindowManager.
 * Implements IWindowPanel interface for WindowManager integration.
 */
export class ControlsPanel implements IWindowPanel {
  private visible: boolean = false;
  private windowManager: WindowManager | null = null;
  private scrollOffset: number = 0;
  private totalContentHeight: number = 0;

  constructor(windowManager?: WindowManager) {
    this.windowManager = windowManager ?? null;
  }

  getId(): string {
    return 'controls';
  }

  getTitle(): string {
    return 'Keyboard Shortcuts';
  }

  getDefaultWidth(): number {
    return 300;
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

  render(
    ctx: CanvasRenderingContext2D,
    _x: number,
    _y: number,
    width: number,
    height: number,
    _world?: any
  ): void {
    if (!this.visible) {
      return;
    }

    const padding = 12;
    const lineHeight = 20;

    // Calculate total content height first (for scroll bounds)
    let totalHeight = padding;
    const headerHeight = lineHeight + 4;
    const sectionGap = 8;

    // Count window shortcuts
    let windowCount = 0;
    if (this.windowManager) {
      const windows = this.windowManager.getAllWindows();
      for (const window of windows) {
        if (window.config.keyboardShortcut && window.config.showInWindowList !== false) {
          windowCount++;
        }
      }
    }

    // Calculate total height: Windows section
    totalHeight += headerHeight + (windowCount * lineHeight) + sectionGap;
    // Camera section
    totalHeight += headerHeight + (3 * lineHeight) + sectionGap;
    // Selection section
    totalHeight += headerHeight + (2 * lineHeight) + sectionGap;
    // Time section
    totalHeight += headerHeight + (2 * lineHeight) + sectionGap;
    // Building section
    totalHeight += headerHeight + (2 * lineHeight) + sectionGap;
    // Soil section
    totalHeight += headerHeight + (3 * lineHeight) + sectionGap;
    // Footer
    totalHeight += 12 + lineHeight + padding;

    this.totalContentHeight = totalHeight;

    // Apply scroll offset with bounds
    const maxScroll = Math.max(0, this.totalContentHeight - height);
    this.scrollOffset = Math.max(0, Math.min(this.scrollOffset, maxScroll));

    // Save context and set up clipping
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, width, height);
    ctx.clip();

    // Apply scroll transform
    ctx.translate(0, -this.scrollOffset);

    let lineY = padding;

    // Helper to draw a section header
    const drawHeader = (text: string, color: string) => {
      ctx.fillStyle = color;
      ctx.font = 'bold 13px monospace';
      ctx.fillText(text, padding, lineY);
      lineY += lineHeight + 4;
    };

    // Helper to draw a control line
    const drawControl = (key: string, description: string) => {
      ctx.font = 'bold 12px monospace';
      ctx.fillStyle = '#FFD700'; // Gold for keys
      ctx.fillText(key, padding, lineY);

      ctx.font = '12px monospace';
      ctx.fillStyle = '#CCCCCC';
      const keyWidth = ctx.measureText(key).width;
      ctx.fillText(` - ${description}`, padding + keyWidth, lineY);
      lineY += lineHeight;
    };

    // Window shortcuts section
    drawHeader('Windows:', '#00BFFF');

    // Get all window shortcuts from WindowManager
    if (this.windowManager) {
      const windows = this.windowManager.getAllWindows();
      for (const window of windows) {
        if (window.config.keyboardShortcut && window.config.showInWindowList !== false) {
          const shortcut = window.config.keyboardShortcut;
          const displayKey = shortcut === 'Escape' ? 'Esc' : shortcut.toUpperCase();
          drawControl(displayKey, window.panel.getTitle());
        }
      }
    }

    lineY += 8;

    // Camera controls
    drawHeader('Camera:', '#00CED1');
    drawControl('WASD / Arrows', 'Pan camera');
    drawControl('Mouse Drag', 'Pan camera');
    drawControl('Scroll / +/-', 'Zoom in/out');

    lineY += 8;

    // Selection controls
    drawHeader('Selection:', '#9370DB');
    drawControl('Left Click', 'Select entity');
    drawControl('Right Click', 'Inspect tile');

    lineY += 8;

    // Time controls
    drawHeader('Time:', '#FFB347');
    drawControl('1 / 2 / 3 / 4', 'Speed 1x/2x/4x/8x');
    drawControl('Space', 'Pause/Resume');

    lineY += 8;

    // Building controls
    drawHeader('Building:', '#8B4513');
    drawControl('B', 'Open build menu');
    drawControl('Esc', 'Cancel placement');

    lineY += 8;

    // Soil controls
    drawHeader('Soil Actions:', '#228B22');
    drawControl('T', 'Till selected tile');
    drawControl('W', 'Water selected tile');
    drawControl('F', 'Fertilize tile');

    // Footer
    lineY += 12;
    ctx.fillStyle = '#666666';
    ctx.font = 'italic 11px monospace';
    ctx.fillText('Press H to close', padding, lineY);

    // Restore context
    ctx.restore();

    // Draw scroll indicator if content overflows
    if (this.totalContentHeight > height) {
      const scrollbarHeight = Math.max(30, (height / this.totalContentHeight) * height);
      const scrollbarY = (this.scrollOffset / maxScroll) * (height - scrollbarHeight);

      ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
      ctx.fillRect(width - 6, scrollbarY, 4, scrollbarHeight);
    }
  }

  handleScroll(deltaY: number, contentHeight: number): boolean {
    const maxScroll = Math.max(0, this.totalContentHeight - contentHeight);
    const oldOffset = this.scrollOffset;

    this.scrollOffset = Math.max(0, Math.min(this.scrollOffset + deltaY * 0.5, maxScroll));

    return this.scrollOffset !== oldOffset;
  }
}
