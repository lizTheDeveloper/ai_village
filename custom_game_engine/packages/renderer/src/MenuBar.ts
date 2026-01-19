import type { WindowManager } from './WindowManager.js';
import type { Renderer } from './Renderer.js';
import type { WindowMenuCategory, ManagedWindow } from './types/WindowTypes.js';

/**
 * Menu item definition
 */
interface MenuItem {
  type: 'window' | 'action' | 'divider' | 'submenu';
  label?: string;
  windowId?: string;
  action?: string;
  shortcut?: string;
  items?: MenuItem[];
  category?: WindowMenuCategory;
}

/**
 * Menu definition
 */
interface MenuDefinition {
  id: string;
  label: string;
  width: number;
}

/**
 * Category display info
 */
interface CategoryInfo {
  label: string;
  order: number;
}

const CATEGORY_INFO: Record<WindowMenuCategory, CategoryInfo> = {
  info: { label: 'Info Panels', order: 1 },
  economy: { label: 'Economy', order: 2 },
  social: { label: 'Social', order: 3 },
  farming: { label: 'Farming', order: 4 },
  animals: { label: 'Animals', order: 5 },
  research: { label: 'Research', order: 6 },
  magic: { label: 'Magic', order: 7 },
  divinity: { label: 'Divine', order: 8 },
  settings: { label: 'Settings', order: 9 },
  default: { label: 'Other', order: 10 },
  dev: { label: 'Developer', order: 99 },
};

/**
 * Menu bar component that displays at the top of the game screen.
 * Provides access to window management functions via dropdown menus.
 */
export class MenuBar {
  private windowManager: WindowManager;
  private renderer: Renderer | null = null;
  private canvas: HTMLCanvasElement;
  private height: number = 30;
  private openMenuId: string | null = null;
  private hoveredMenuItem: string | null = null;
  private devMode: boolean = true; // Can be toggled

  // Menu definitions
  private menus: MenuDefinition[] = [
    { id: 'file', label: 'File', width: 40 },
    { id: 'agent', label: 'Agent', width: 55 },
    { id: 'economy', label: 'Economy', width: 75 },
    { id: 'farming', label: 'Farming', width: 70 },
    { id: 'animals', label: 'Animals', width: 65 },
    { id: 'research', label: 'Research', width: 75 },
    { id: 'magic', label: 'Magic', width: 55 },
    { id: 'divinity', label: 'Divinity', width: 70 },
    { id: 'dev', label: 'Dev', width: 40 },
  ];

  // Computed menu bounds
  private menuBounds: Map<string, { x: number; y: number; width: number; height: number }> = new Map();

  // View toggle buttons
  private viewToggles = [
    { key: 'showResourceAmounts', emoji: '📊', tooltip: 'Resource Amounts', x: 0, width: 30 },
    { key: 'showBuildingLabels', emoji: '🏠', tooltip: 'Building Labels', x: 0, width: 30 },
    { key: 'showAgentNames', emoji: '👤', tooltip: 'Agent Names', x: 0, width: 30 },
    { key: 'showAgentTasks', emoji: '📋', tooltip: 'Agent Tasks', x: 0, width: 30 },
  ];

  constructor(windowManager: WindowManager, canvas: HTMLCanvasElement) {
    if (!windowManager) {
      throw new Error('WindowManager cannot be null or undefined');
    }
    if (!canvas) {
      throw new Error('Canvas cannot be null or undefined');
    }

    this.windowManager = windowManager;
    this.canvas = canvas;
    this.computeMenuBounds();
  }

  /**
   * Compute menu button positions
   */
  private computeMenuBounds(): void {
    let currentX = 10;
    for (const menu of this.menus) {
      this.menuBounds.set(menu.id, {
        x: currentX,
        y: 0,
        width: menu.width,
        height: this.height,
      });
      currentX += menu.width + 5;
    }

    // Calculate view toggle button positions (after menus)
    currentX += 10;
    for (const toggle of this.viewToggles) {
      toggle.x = currentX;
      currentX += toggle.width + 5;
    }
  }

  /**
   * Set the renderer instance for view toggles.
   */
  setRenderer(renderer: Renderer): void {
    this.renderer = renderer;
  }

  /**
   * Enable/disable dev mode (controls Dev menu visibility)
   */
  setDevMode(enabled: boolean): void {
    this.devMode = enabled;
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
    // Check if clicking on a menu item in the dropdown (must check FIRST, before closing menu)
    if (this.openMenuId) {
      const bounds = this.menuBounds.get(this.openMenuId);
      if (bounds) {
        const dropdownY = bounds.y + bounds.height;
        // If click is below menu bar, check dropdown
        if (y >= dropdownY) {
          return this.handleDropdownClick(this.openMenuId, x, y);
        }
      }
    }

    // Check if click is within menu bar area
    if (y < 0 || y > this.height) {
      // Close menu if clicking outside
      if (this.openMenuId) {
        this.openMenuId = null;
        return true;
      }
      return false;
    }

    // Check if clicking on view toggle buttons
    if (this.renderer) {
      for (const toggle of this.viewToggles) {
        if (x >= toggle.x && x <= toggle.x + toggle.width &&
            y >= 0 && y <= this.height) {
          // Toggle the corresponding view option
          const key = toggle.key as keyof Renderer;
          if (typeof this.renderer[key] === 'boolean') {
            (this.renderer[key] as boolean) = !(this.renderer[key] as boolean);
          }
          return true;
        }
      }
    }

    // Check if clicking on menu buttons
    for (const menu of this.menus) {
      // Skip dev menu if not in dev mode
      if (menu.id === 'dev' && !this.devMode) continue;

      const bounds = this.menuBounds.get(menu.id);
      if (!bounds) continue;

      if (x >= bounds.x && x <= bounds.x + bounds.width &&
          y >= bounds.y && y <= bounds.y + bounds.height) {
        // Toggle this menu
        this.openMenuId = this.openMenuId === menu.id ? null : menu.id;
        return true;
      }
    }

    return false;
  }

  /**
   * Handle click in a dropdown menu
   */
  private handleDropdownClick(menuId: string, x: number, y: number): boolean {
    const bounds = this.menuBounds.get(menuId);
    if (!bounds) return false;

    const dropdownX = bounds.x;
    const dropdownY = bounds.y + bounds.height;
    const dropdownWidth = this.getDropdownWidth(menuId);
    const items = this.getMenuItems(menuId);
    const itemHeight = 24;
    const dropdownHeight = this.calculateDropdownHeight(items);

    // Check if click is within dropdown bounds
    if (x < dropdownX || x > dropdownX + dropdownWidth ||
        y < dropdownY || y > dropdownY + dropdownHeight) {
      this.openMenuId = null;
      return true;
    }

    // Find which item was clicked
    let currentY = dropdownY;
    for (const item of items) {
      if (item.type === 'divider') {
        currentY += itemHeight;
        continue;
      }

      if (y >= currentY && y < currentY + itemHeight) {
        this.handleMenuItemClick(item);
        this.openMenuId = null;
        return true;
      }

      currentY += itemHeight;
    }

    return true;
  }

  /**
   * Handle menu item click
   */
  private handleMenuItemClick(item: MenuItem): void {
    if (item.type === 'window' && item.windowId) {
      this.windowManager.toggleWindow(item.windowId);
    } else if (item.type === 'action' && item.action) {
      this.executeAction(item.action);
    }
  }

  /**
   * Execute a menu action
   */
  private executeAction(action: string): void {
    const windows = Array.from(this.windowManager['windows'].values());

    switch (action) {
      case 'minimize-all':
        for (const window of windows) {
          if (window.visible) {
            this.windowManager.hideWindow(window.id);
          }
        }
        break;
      case 'show-all':
        for (const window of windows) {
          if (!window.visible && window.config.showInWindowList !== false) {
            this.windowManager.showWindow(window.id);
          }
        }
        break;
      case 'cascade':
        this.windowManager.arrangeWindows('cascade');
        break;
      case 'tile':
        this.windowManager.arrangeWindows('tile');
        break;
      case 'reset':
      case 'load-layout':
        this.windowManager.resetLayout();
        break;
      case 'save-layout':
        this.windowManager.saveLayout();
        break;
    }
  }

  /**
   * Get menu items for a specific menu
   */
  private getMenuItems(menuId: string): MenuItem[] {
    switch (menuId) {
      case 'file':
        return this.getFileMenuItems();
      case 'agent':
        return this.getAgentMenuItems();
      case 'economy':
        return this.getEconomyMenuItems();
      case 'farming':
        return this.getFarmingMenuItems();
      case 'animals':
        return this.getAnimalsMenuItems();
      case 'research':
        return this.getResearchMenuItems();
      case 'magic':
        return this.getMagicMenuItems();
      case 'divinity':
        return this.getDivinityMenuItems();
      case 'dev':
        return this.getDevMenuItems();
      default:
        return [];
    }
  }

  /**
   * Get File menu items
   */
  private getFileMenuItems(): MenuItem[] {
    const windows = Array.from(this.windowManager['windows'].values()) as ManagedWindow[];
    const settingsWindows = windows.filter(w =>
      w.config.showInWindowList !== false &&
      w.config.menuCategory === 'settings' &&
      w.panel !== null
    );

    const items: MenuItem[] = [];

    // Add settings windows
    for (const window of settingsWindows) {
      items.push({
        type: 'window',
        label: window.panel?.getTitle() || window.id,
        windowId: window.id,
        shortcut: window.config.keyboardShortcut,
      });
    }

    if (items.length > 0) {
      items.push({ type: 'divider' });
    }

    items.push({ type: 'action', label: 'Save Layout', action: 'save-layout' });
    items.push({ type: 'action', label: 'Load Layout', action: 'load-layout' });
    items.push({ type: 'divider' });
    items.push({ type: 'action', label: 'Reset Layout', action: 'reset' });

    return items;
  }

  /**
   * Get Agent menu items (info and social panels)
   */
  private getAgentMenuItems(): MenuItem[] {
    const windows = Array.from(this.windowManager['windows'].values()) as ManagedWindow[];
    const agentWindows = windows.filter(w =>
      w.config.showInWindowList !== false &&
      (w.config.menuCategory === 'info' || w.config.menuCategory === 'social') &&
      w.panel !== null
    );

    const items: MenuItem[] = [];

    // Group by category
    const byCategory = new Map<WindowMenuCategory, ManagedWindow[]>();
    for (const window of agentWindows) {
      const category = window.config.menuCategory ?? 'default';
      if (!byCategory.has(category)) {
        byCategory.set(category, []);
      }
      byCategory.get(category)!.push(window);
    }

    // Sort categories by order
    const sortedCategories = Array.from(byCategory.keys()).sort((a, b) =>
      CATEGORY_INFO[a].order - CATEGORY_INFO[b].order
    );

    // Add windows by category
    for (const category of sortedCategories) {
      const categoryWindows = byCategory.get(category)!;
      if (categoryWindows.length === 0) continue;

      // Add category header
      if (items.length > 0) {
        items.push({ type: 'divider' });
      }
      items.push({
        type: 'action',
        label: `── ${CATEGORY_INFO[category].label} ──`,
        action: '' // Non-clickable header
      });

      // Add windows in this category
      for (const window of categoryWindows) {
        items.push({
          type: 'window',
          label: window.panel?.getTitle() || window.id,
          windowId: window.id,
          shortcut: window.config.keyboardShortcut,
        });
      }
    }

    // Add action items
    if (items.length > 0) {
      items.push({ type: 'divider' });
    }
    items.push({ type: 'action', label: 'Minimize All', action: 'minimize-all' });
    items.push({ type: 'action', label: 'Show All', action: 'show-all' });
    items.push({ type: 'divider' });
    items.push({ type: 'action', label: 'Arrange: Cascade', action: 'cascade' });
    items.push({ type: 'action', label: 'Arrange: Tile', action: 'tile' });

    return items;
  }

  /**
   * Get Economy menu items
   */
  private getEconomyMenuItems(): MenuItem[] {
    const windows = Array.from(this.windowManager['windows'].values()) as ManagedWindow[];
    const economyWindows = windows.filter(w =>
      w.config.showInWindowList !== false &&
      w.config.menuCategory === 'economy' &&
      w.panel !== null
    );

    const items: MenuItem[] = [];

    for (const window of economyWindows) {
      items.push({
        type: 'window',
        label: window.panel?.getTitle() || window.id,
        windowId: window.id,
        shortcut: window.config.keyboardShortcut,
      });
    }

    if (items.length === 0) {
      items.push({ type: 'action', label: '(No panels)', action: '' });
    }

    // Add window actions
    items.push({ type: 'divider' });
    items.push({ type: 'action', label: 'Minimize All', action: 'minimize-all' });
    items.push({ type: 'action', label: 'Show All', action: 'show-all' });
    items.push({ type: 'divider' });
    items.push({ type: 'action', label: 'Arrange: Cascade', action: 'cascade' });
    items.push({ type: 'action', label: 'Arrange: Tile', action: 'tile' });

    return items;
  }

  /**
   * Get Farming menu items (Tile Inspector, Plant Info)
   */
  private getFarmingMenuItems(): MenuItem[] {
    const windows = Array.from(this.windowManager['windows'].values()) as ManagedWindow[];
    const farmingWindows = windows.filter(w =>
      w.config.showInWindowList !== false &&
      w.config.menuCategory === 'farming' &&
      w.panel !== null
    );

    const items: MenuItem[] = [];

    for (const window of farmingWindows) {
      items.push({
        type: 'window',
        label: window.panel?.getTitle() || window.id,
        windowId: window.id,
        shortcut: window.config.keyboardShortcut,
      });
    }

    if (items.length === 0) {
      items.push({ type: 'action', label: '(No panels)', action: '' });
    }

    // Add window actions
    items.push({ type: 'divider' });
    items.push({ type: 'action', label: 'Minimize All', action: 'minimize-all' });
    items.push({ type: 'action', label: 'Show All', action: 'show-all' });
    items.push({ type: 'divider' });
    items.push({ type: 'action', label: 'Arrange: Cascade', action: 'cascade' });
    items.push({ type: 'action', label: 'Arrange: Tile', action: 'tile' });

    return items;
  }

  /**
   * Get Animals menu items
   */
  private getAnimalsMenuItems(): MenuItem[] {
    const windows = Array.from(this.windowManager['windows'].values()) as ManagedWindow[];
    const animalWindows = windows.filter(w =>
      w.config.showInWindowList !== false &&
      w.config.menuCategory === 'animals' &&
      w.panel !== null
    );

    const items: MenuItem[] = [];

    for (const window of animalWindows) {
      items.push({
        type: 'window',
        label: window.panel?.getTitle() || window.id,
        windowId: window.id,
        shortcut: window.config.keyboardShortcut,
      });
    }

    if (items.length === 0) {
      items.push({ type: 'action', label: '(No panels)', action: '' });
    }

    // Add window actions
    items.push({ type: 'divider' });
    items.push({ type: 'action', label: 'Minimize All', action: 'minimize-all' });
    items.push({ type: 'action', label: 'Show All', action: 'show-all' });
    items.push({ type: 'divider' });
    items.push({ type: 'action', label: 'Arrange: Cascade', action: 'cascade' });
    items.push({ type: 'action', label: 'Arrange: Tile', action: 'tile' });

    return items;
  }

  /**
   * Get Research menu items
   */
  private getResearchMenuItems(): MenuItem[] {
    const windows = Array.from(this.windowManager['windows'].values()) as ManagedWindow[];
    const researchWindows = windows.filter(w =>
      w.config.showInWindowList !== false &&
      w.config.menuCategory === 'research' &&
      w.panel !== null
    );

    const items: MenuItem[] = [];

    for (const window of researchWindows) {
      items.push({
        type: 'window',
        label: window.panel?.getTitle() || window.id,
        windowId: window.id,
        shortcut: window.config.keyboardShortcut,
      });
    }

    if (items.length === 0) {
      items.push({ type: 'action', label: '(No panels)', action: '' });
    }

    // Add window actions
    items.push({ type: 'divider' });
    items.push({ type: 'action', label: 'Minimize All', action: 'minimize-all' });
    items.push({ type: 'action', label: 'Show All', action: 'show-all' });
    items.push({ type: 'divider' });
    items.push({ type: 'action', label: 'Arrange: Cascade', action: 'cascade' });
    items.push({ type: 'action', label: 'Arrange: Tile', action: 'tile' });

    return items;
  }

  /**
   * Get Magic menu items
   */
  private getMagicMenuItems(): MenuItem[] {
    const windows = Array.from(this.windowManager['windows'].values()) as ManagedWindow[];
    const magicWindows = windows.filter(w =>
      w.config.showInWindowList !== false &&
      w.config.menuCategory === 'magic' &&
      w.panel !== null
    );

    const items: MenuItem[] = [];

    for (const window of magicWindows) {
      items.push({
        type: 'window',
        label: window.panel?.getTitle() || window.id,
        windowId: window.id,
        shortcut: window.config.keyboardShortcut,
      });
    }

    if (items.length === 0) {
      items.push({ type: 'action', label: '(No panels)', action: '' });
    }

    // Add window actions
    items.push({ type: 'divider' });
    items.push({ type: 'action', label: 'Minimize All', action: 'minimize-all' });
    items.push({ type: 'action', label: 'Show All', action: 'show-all' });
    items.push({ type: 'divider' });
    items.push({ type: 'action', label: 'Arrange: Cascade', action: 'cascade' });
    items.push({ type: 'action', label: 'Arrange: Tile', action: 'tile' });

    return items;
  }

  /**
   * Get Divinity menu items
   */
  private getDivinityMenuItems(): MenuItem[] {
    const windows = Array.from(this.windowManager['windows'].values()) as ManagedWindow[];
    const divinityWindows = windows.filter(w =>
      w.config.showInWindowList !== false &&
      w.config.menuCategory === 'divinity' &&
      w.panel !== null
    );

    const items: MenuItem[] = [];

    // Add divinity windows
    for (const window of divinityWindows) {
      items.push({
        type: 'window',
        label: window.panel?.getTitle() || window.id,
        windowId: window.id,
        shortcut: window.config.keyboardShortcut,
      });
    }

    // Show placeholder if empty
    if (items.length === 0) {
      items.push({ type: 'action', label: '(No panels)', action: '' });
    }

    // Add window actions
    items.push({ type: 'divider' });
    items.push({ type: 'action', label: 'Minimize All', action: 'minimize-all' });
    items.push({ type: 'action', label: 'Show All', action: 'show-all' });
    items.push({ type: 'divider' });
    items.push({ type: 'action', label: 'Arrange: Cascade', action: 'cascade' });
    items.push({ type: 'action', label: 'Arrange: Tile', action: 'tile' });

    return items;
  }

  /**
   * Get Dev menu items
   */
  private getDevMenuItems(): MenuItem[] {
    const windows = Array.from(this.windowManager['windows'].values()) as ManagedWindow[];
    const devWindows = windows.filter(w =>
      w.config.showInWindowList !== false &&
      w.config.menuCategory === 'dev' &&
      w.panel !== null
    );

    const items: MenuItem[] = [];

    // Add dev windows
    for (const window of devWindows) {
      items.push({
        type: 'window',
        label: window.panel?.getTitle() || window.id,
        windowId: window.id,
        shortcut: window.config.keyboardShortcut,
      });
    }

    // Show placeholder if empty
    if (items.length === 0) {
      items.push({ type: 'action', label: '(No panels)', action: '' });
    }

    // Add window actions
    items.push({ type: 'divider' });
    items.push({ type: 'action', label: 'Minimize All', action: 'minimize-all' });
    items.push({ type: 'action', label: 'Show All', action: 'show-all' });
    items.push({ type: 'divider' });
    items.push({ type: 'action', label: 'Arrange: Cascade', action: 'cascade' });
    items.push({ type: 'action', label: 'Arrange: Tile', action: 'tile' });

    return items;
  }

  /**
   * Get dropdown width for a menu
   */
  private getDropdownWidth(menuId: string): number {
    switch (menuId) {
      case 'file': return 160;
      case 'agent': return 250;
      case 'economy': return 200;
      case 'farming': return 180;
      case 'animals': return 180;
      case 'magic': return 180;
      case 'divinity': return 200;
      case 'dev': return 180;
      default: return 200;
    }
  }

  /**
   * Calculate dropdown height based on items
   */
  private calculateDropdownHeight(items: MenuItem[]): number {
    const itemHeight = 24;
    return items.length * itemHeight;
  }

  /**
   * Handle mouse move for hover effects.
   */
  handleMouseMove(x: number, y: number): void {
    this.hoveredMenuItem = null;

    for (const menu of this.menus) {
      if (menu.id === 'dev' && !this.devMode) continue;

      const bounds = this.menuBounds.get(menu.id);
      if (!bounds) continue;

      if (x >= bounds.x && x <= bounds.x + bounds.width &&
          y >= bounds.y && y <= bounds.y + bounds.height) {
        this.hoveredMenuItem = menu.id;
        break;
      }
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
    ctx.font = '14px sans-serif';
    ctx.textBaseline = 'middle';

    for (const menu of this.menus) {
      // Skip dev menu if not in dev mode
      if (menu.id === 'dev' && !this.devMode) continue;

      const bounds = this.menuBounds.get(menu.id);
      if (!bounds) continue;

      const isHovered = this.hoveredMenuItem === menu.id;
      const isOpen = this.openMenuId === menu.id;
      const isDisabled = menu.id === 'file'; // File menu placeholder

      // Draw button background
      ctx.fillStyle = isHovered || isOpen ? '#4a4a4a' : 'transparent';
      ctx.fillRect(bounds.x, bounds.y, bounds.width, bounds.height);

      // Draw text
      if (isDisabled) {
        ctx.fillStyle = '#888888';
      } else if (menu.id === 'dev') {
        ctx.fillStyle = '#FF6666'; // Red for dev menu
      } else {
        ctx.fillStyle = '#ffffff';
      }
      ctx.fillText(menu.label, bounds.x + 10, this.height / 2);
    }

    // Draw view toggle buttons
    if (this.renderer) {
      for (const toggle of this.viewToggles) {
        const key = toggle.key as keyof Renderer;
        const isActive = this.renderer[key] as boolean;

        // Button background (green if active, dark if inactive)
        ctx.fillStyle = isActive ? '#4CAF50' : '#3a3a3a';
        ctx.fillRect(toggle.x, 2, toggle.width, this.height - 4);

        // Button border
        ctx.strokeStyle = '#666666';
        ctx.lineWidth = 1;
        ctx.strokeRect(toggle.x, 2, toggle.width, this.height - 4);

        // Draw emoji icon
        ctx.font = '16px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#ffffff';
        ctx.fillText(toggle.emoji, toggle.x + toggle.width / 2, this.height / 2);

        // Reset text alignment
        ctx.textAlign = 'left';
      }
    }

    // Draw dropdown menu if open
    if (this.openMenuId) {
      this.renderDropdown(ctx, this.openMenuId);
    }
  }

  /**
   * Render a dropdown menu
   */
  private renderDropdown(ctx: CanvasRenderingContext2D, menuId: string): void {
    const bounds = this.menuBounds.get(menuId);
    if (!bounds) return;

    const dropdownX = bounds.x;
    const dropdownY = bounds.y + bounds.height;
    const dropdownWidth = this.getDropdownWidth(menuId);
    const items = this.getMenuItems(menuId);
    const itemHeight = 24;
    const dropdownHeight = this.calculateDropdownHeight(items);

    // Draw dropdown background
    ctx.fillStyle = '#2a2a2a';
    ctx.fillRect(dropdownX, dropdownY, dropdownWidth, dropdownHeight);

    // Draw dropdown border
    ctx.strokeStyle = '#3a3a3a';
    ctx.lineWidth = 2;
    ctx.strokeRect(dropdownX, dropdownY, dropdownWidth, dropdownHeight);

    // Draw items
    let currentY = dropdownY;
    ctx.font = '13px sans-serif';
    ctx.textBaseline = 'middle';

    for (const item of items) {
      if (item.type === 'divider') {
        ctx.strokeStyle = '#3a3a3a';
        ctx.beginPath();
        ctx.moveTo(dropdownX + 5, currentY + itemHeight / 2);
        ctx.lineTo(dropdownX + dropdownWidth - 5, currentY + itemHeight / 2);
        ctx.stroke();
      } else {
        // Check if this is a category header (non-clickable)
        const isCategoryHeader = item.type === 'action' && !item.action;

        if (isCategoryHeader) {
          ctx.fillStyle = '#888888';
          ctx.font = 'bold 11px sans-serif';
        } else {
          ctx.fillStyle = '#ffffff';
          ctx.font = '13px sans-serif';
        }

        // Draw checkmark for window items
        if (item.type === 'window' && item.windowId) {
          const window = this.windowManager['windows'].get(item.windowId);
          const checkmark = window?.visible ? '✓' : ' ';
          ctx.fillText(checkmark, dropdownX + 10, currentY + itemHeight / 2);
        }

        // Draw label
        const labelX = item.type === 'window' ? dropdownX + 30 : dropdownX + 10;
        ctx.fillText(item.label ?? '', labelX, currentY + itemHeight / 2);

        // Draw shortcut if available
        if (item.shortcut) {
          const shortcut = this.formatShortcut(item.shortcut);
          ctx.fillStyle = '#888888';
          ctx.textAlign = 'right';
          ctx.fillText(shortcut, dropdownX + dropdownWidth - 10, currentY + itemHeight / 2);
          ctx.textAlign = 'left';
        }
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
   * Check if a menu is currently open.
   */
  isMenuOpen(): boolean {
    return this.openMenuId !== null;
  }

  /**
   * Close all open menus.
   */
  closeMenus(): void {
    this.openMenuId = null;
  }
}
