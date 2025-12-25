import type { WindowManager } from './WindowManager.js';

/**
 * Menu bar component that displays at the top of the game screen.
 * Provides access to window management functions via dropdown menus.
 */
export class MenuBar {
  private windowManager: WindowManager;
  private canvas: HTMLCanvasElement;
  private height: number = 30;
  private isWindowMenuOpen: boolean = false;
  private hoveredMenuItem: string | null = null;

  // Menu button bounds for click detection
  private windowMenuBounds = { x: 50, y: 0, width: 70, height: 30 };

  constructor(windowManager: WindowManager, canvas: HTMLCanvasElement) {
    if (!windowManager) {
      throw new Error('WindowManager cannot be null or undefined');
    }
    if (!canvas) {
      throw new Error('Canvas cannot be null or undefined');
    }

    this.windowManager = windowManager;
    this.canvas = canvas;
  }

  /**
   * Get the height of the menu bar.
   */
  getHeight(): number {
    return this.height;
  }

  /**
   * Handle click on menu bar.
   * Returns true if click was handled by menu bar.
   */
  handleClick(x: number, y: number): boolean {
    // Check if click is within menu bar area
    if (y < 0 || y > this.height) {
      // Close menu if clicking outside
      if (this.isWindowMenuOpen) {
        this.isWindowMenuOpen = false;
        return true;
      }
      return false;
    }

    // Check if clicking on "Window" menu button
    if (x >= this.windowMenuBounds.x &&
        x <= this.windowMenuBounds.x + this.windowMenuBounds.width &&
        y >= this.windowMenuBounds.y &&
        y <= this.windowMenuBounds.y + this.windowMenuBounds.height) {
      this.isWindowMenuOpen = !this.isWindowMenuOpen;
      return true;
    }

    // Check if clicking on a menu item in the dropdown
    if (this.isWindowMenuOpen && x >= this.windowMenuBounds.x) {
      return this.handleWindowMenuItemClick(x, y);
    }

    return false;
  }

  /**
   * Handle click on an item in the Window menu dropdown.
   */
  private handleWindowMenuItemClick(x: number, y: number): boolean {
    const dropdownX = this.windowMenuBounds.x;
    const dropdownY = this.windowMenuBounds.height;
    const dropdownWidth = 250;
    const itemHeight = 24;

    // Get all windows for the menu
    const windows = Array.from(this.windowManager['windows'].values());
    const menuWindows = windows.filter(w => w.config.showInWindowList !== false);

    // Calculate dropdown height
    const itemCount = menuWindows.length + 6; // Windows + dividers + actions
    const dropdownHeight = itemCount * itemHeight;

    // Check if click is within dropdown bounds
    if (x < dropdownX || x > dropdownX + dropdownWidth ||
        y < dropdownY || y > dropdownY + dropdownHeight) {
      this.isWindowMenuOpen = false;
      return true;
    }

    // Calculate which item was clicked
    const itemIndex = Math.floor((y - dropdownY) / itemHeight);

    if (itemIndex < menuWindows.length) {
      // Clicked on a window item - toggle its visibility
      const window = menuWindows[itemIndex];
      if (!window) {
        return true;
      }
      this.windowManager.toggleWindow(window.id);
      this.isWindowMenuOpen = false;
      return true;
    }

    // Handle action items (Minimize All, Show All, Arrange, Reset)
    const actionIndex = itemIndex - menuWindows.length - 1; // Skip divider

    if (actionIndex === 0) {
      // Minimize All
      for (const window of windows) {
        if (window.visible) {
          this.windowManager.hideWindow(window.id);
        }
      }
      this.isWindowMenuOpen = false;
      return true;
    } else if (actionIndex === 1) {
      // Show All
      for (const window of menuWindows) {
        if (!window.visible) {
          this.windowManager.showWindow(window.id);
        }
      }
      this.isWindowMenuOpen = false;
      return true;
    } else if (actionIndex === 3) {
      // Arrange: Cascade
      this.windowManager.arrangeWindows('cascade');
      this.isWindowMenuOpen = false;
      return true;
    } else if (actionIndex === 4) {
      // Arrange: Tile
      this.windowManager.arrangeWindows('tile');
      this.isWindowMenuOpen = false;
      return true;
    } else if (actionIndex === 6) {
      // Reset to Defaults
      this.windowManager.resetLayout();
      this.isWindowMenuOpen = false;
      return true;
    }

    return true;
  }

  /**
   * Handle mouse move for hover effects.
   */
  handleMouseMove(x: number, y: number): void {
    // Check if hovering over "Window" menu button
    if (x >= this.windowMenuBounds.x &&
        x <= this.windowMenuBounds.x + this.windowMenuBounds.width &&
        y >= this.windowMenuBounds.y &&
        y <= this.windowMenuBounds.y + this.windowMenuBounds.height) {
      this.hoveredMenuItem = 'window';
    } else {
      this.hoveredMenuItem = null;
    }
  }

  /**
   * Render the menu bar.
   */
  render(ctx: CanvasRenderingContext2D): void {
    // Draw menu bar background
    ctx.fillStyle = '#2a2a2a';
    ctx.fillRect(0, 0, this.canvas.width, this.height);

    // Draw menu bar border
    ctx.strokeStyle = '#3a3a3a';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, this.height);
    ctx.lineTo(this.canvas.width, this.height);
    ctx.stroke();

    // Draw menu items
    ctx.fillStyle = '#ffffff';
    ctx.font = '14px sans-serif';
    ctx.textBaseline = 'middle';

    // "File" menu (placeholder - not implemented)
    ctx.fillStyle = this.hoveredMenuItem === 'file' ? '#4a4a4a' : 'transparent';
    ctx.fillRect(10, 0, 40, this.height);
    ctx.fillStyle = '#888888'; // Grayed out
    ctx.fillText('File', 15, this.height / 2);

    // "Window" menu
    ctx.fillStyle = this.hoveredMenuItem === 'window' || this.isWindowMenuOpen ? '#4a4a4a' : 'transparent';
    ctx.fillRect(this.windowMenuBounds.x, this.windowMenuBounds.y, this.windowMenuBounds.width, this.windowMenuBounds.height);
    ctx.fillStyle = '#ffffff';
    ctx.fillText('Window', this.windowMenuBounds.x + 10, this.height / 2);

    // Draw dropdown menu if open
    if (this.isWindowMenuOpen) {
      this.renderWindowMenu(ctx);
    }
  }

  /**
   * Render the Window menu dropdown.
   */
  private renderWindowMenu(ctx: CanvasRenderingContext2D): void {
    const dropdownX = this.windowMenuBounds.x;
    const dropdownY = this.windowMenuBounds.height;
    const dropdownWidth = 250;
    const itemHeight = 24;

    // Get all windows for the menu
    const windows = Array.from(this.windowManager['windows'].values());
    const menuWindows = windows.filter(w => w.config.showInWindowList !== false);

    // Calculate dropdown height
    const itemCount = menuWindows.length + 6; // Windows + dividers + actions
    const dropdownHeight = itemCount * itemHeight;

    // Draw dropdown background
    ctx.fillStyle = '#2a2a2a';
    ctx.fillRect(dropdownX, dropdownY, dropdownWidth, dropdownHeight);

    // Draw dropdown border
    ctx.strokeStyle = '#3a3a3a';
    ctx.lineWidth = 2;
    ctx.strokeRect(dropdownX, dropdownY, dropdownWidth, dropdownHeight);

    // Draw window list
    let currentY = dropdownY;
    ctx.font = '13px sans-serif';
    ctx.textBaseline = 'middle';

    for (const window of menuWindows) {
      // Highlight on hover
      // (hover detection would require mouse tracking - skipped for now)

      // Draw checkmark if window is visible
      ctx.fillStyle = '#ffffff';
      const checkmark = window.visible ? '✓' : ' ';
      ctx.fillText(checkmark, dropdownX + 10, currentY + itemHeight / 2);

      // Draw window title
      ctx.fillText(window.panel.getTitle(), dropdownX + 30, currentY + itemHeight / 2);

      // Draw keyboard shortcut if available
      if (window.config.keyboardShortcut) {
        const shortcut = this.formatShortcut(window.config.keyboardShortcut);
        ctx.fillStyle = '#888888';
        ctx.textAlign = 'right';
        ctx.fillText(shortcut, dropdownX + dropdownWidth - 10, currentY + itemHeight / 2);
        ctx.textAlign = 'left';
        ctx.fillStyle = '#ffffff';
      }

      currentY += itemHeight;
    }

    // Draw divider
    ctx.strokeStyle = '#3a3a3a';
    ctx.beginPath();
    ctx.moveTo(dropdownX + 5, currentY);
    ctx.lineTo(dropdownX + dropdownWidth - 5, currentY);
    ctx.stroke();
    currentY += itemHeight;

    // Draw action items
    const actions = [
      'Minimize All',
      'Show All',
      '---',
      'Arrange: Cascade',
      'Arrange: Tile',
      '---',
      'Reset to Defaults',
    ];

    for (const action of actions) {
      if (action === '---') {
        // Draw divider
        ctx.strokeStyle = '#3a3a3a';
        ctx.beginPath();
        ctx.moveTo(dropdownX + 5, currentY);
        ctx.lineTo(dropdownX + dropdownWidth - 5, currentY);
        ctx.stroke();
      } else {
        ctx.fillStyle = '#ffffff';
        ctx.fillText(action, dropdownX + 10, currentY + itemHeight / 2);
      }
      currentY += itemHeight;
    }
  }

  /**
   * Format keyboard shortcut for display.
   */
  private formatShortcut(shortcut: string): string {
    // Convert "KeyM" to "M", "KeyI" to "I", etc.
    if (shortcut.startsWith('Key')) {
      return shortcut.substring(3);
    }
    // Handle special keys
    if (shortcut === 'Escape') {
      return 'Esc';
    }
    if (shortcut === 'Tab') {
      return 'Tab';
    }
    return shortcut;
  }

  /**
   * Check if the window menu is currently open.
   */
  isMenuOpen(): boolean {
    return this.isWindowMenuOpen;
  }

  /**
   * Close all open menus.
   */
  closeMenus(): void {
    this.isWindowMenuOpen = false;
  }
}
