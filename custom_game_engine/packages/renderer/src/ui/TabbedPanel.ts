/**
 * TabbedPanel - Reusable tab system for canvas panels
 *
 * Handles tab rendering and click detection for multi-tab panels.
 * The actual content rendering is delegated to callbacks.
 */

export interface TabDefinition<T extends string = string> {
  /** Unique identifier for the tab */
  id: T;
  /** Display label for the tab */
  label: string;
  /** Optional: custom render function for the tab button */
  renderTab?: (ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, isActive: boolean) => void;
}

export interface TabbedPanelOptions {
  /** Height of the tab bar */
  tabHeight?: number;
  /** Background color for the tab bar */
  tabBarBackground?: string;
  /** Background color for active tab */
  activeTabBackground?: string;
  /** Background color for inactive tabs */
  inactiveTabBackground?: string;
  /** Text color for active tab */
  activeTabTextColor?: string;
  /** Text color for inactive tabs */
  inactiveTabTextColor?: string;
  /** Border color */
  borderColor?: string;
  /** Font for tab labels */
  font?: string;
}

const DEFAULT_OPTIONS: Required<TabbedPanelOptions> = {
  tabHeight: 28,
  tabBarBackground: 'rgba(40, 40, 50, 0.95)',
  activeTabBackground: 'rgba(60, 60, 80, 0.95)',
  inactiveTabBackground: 'rgba(30, 30, 40, 0.95)',
  activeTabTextColor: '#FFFFFF',
  inactiveTabTextColor: '#AAAAAA',
  borderColor: 'rgba(80, 80, 100, 0.5)',
  font: '11px sans-serif',
};

export class TabbedPanel<T extends string = string> {
  private tabs: TabDefinition<T>[];
  private currentTab: T;
  private options: Required<TabbedPanelOptions>;
  private onTabChange?: (newTab: T, oldTab: T) => void;

  constructor(
    tabs: TabDefinition<T>[],
    initialTab: T,
    options?: TabbedPanelOptions,
    onTabChange?: (newTab: T, oldTab: T) => void
  ) {
    if (tabs.length === 0) {
      throw new Error('TabbedPanel requires at least one tab');
    }

    this.tabs = tabs;
    this.currentTab = initialTab;
    this.options = { ...DEFAULT_OPTIONS, ...options };
    this.onTabChange = onTabChange;
  }

  /**
   * Get the current active tab.
   */
  getCurrentTab(): T {
    return this.currentTab;
  }

  /**
   * Set the current active tab.
   */
  setCurrentTab(tab: T): void {
    if (tab !== this.currentTab) {
      const oldTab = this.currentTab;
      this.currentTab = tab;
      this.onTabChange?.(tab, oldTab);
    }
  }

  /**
   * Get the tab height.
   */
  getTabHeight(): number {
    return this.options.tabHeight;
  }

  /**
   * Render the tab bar.
   *
   * @param ctx - Canvas rendering context
   * @param x - X position of the panel
   * @param y - Y position of the panel
   * @param width - Width of the panel
   */
  renderTabs(ctx: CanvasRenderingContext2D, x: number, y: number, width: number): void {
    const tabWidth = width / this.tabs.length;
    const { tabHeight, activeTabBackground, inactiveTabBackground, activeTabTextColor, inactiveTabTextColor, borderColor, font } = this.options;

    for (let i = 0; i < this.tabs.length; i++) {
      const tab = this.tabs[i];
      if (!tab) {
        continue;
      }
      const tabX = x + i * tabWidth;
      const isActive = tab.id === this.currentTab;

      // Use custom render if provided
      if (tab.renderTab) {
        tab.renderTab(ctx, tabX, y, tabWidth, tabHeight, isActive);
        continue;
      }

      // Default tab rendering
      ctx.fillStyle = isActive ? activeTabBackground : inactiveTabBackground;
      ctx.fillRect(tabX, y, tabWidth, tabHeight);

      // Tab border
      ctx.strokeStyle = borderColor;
      ctx.lineWidth = 1;
      ctx.strokeRect(tabX, y, tabWidth, tabHeight);

      // Tab label
      ctx.fillStyle = isActive ? activeTabTextColor : inactiveTabTextColor;
      ctx.font = font;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(tab.label, tabX + tabWidth / 2, y + tabHeight / 2);
    }

    // Reset text alignment
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
  }

  /**
   * Handle click on the tab bar.
   * Returns true if a tab was clicked, false otherwise.
   *
   * @param clickX - X position of click relative to panel
   * @param clickY - Y position of click relative to panel
   * @param panelX - X position of the panel
   * @param panelY - Y position of the panel
   * @param width - Width of the panel
   */
  handleClick(clickX: number, clickY: number, panelX: number, panelY: number, width: number): boolean {
    const { tabHeight } = this.options;

    // Check if click is within tab bar
    if (clickY < panelY || clickY > panelY + tabHeight) {
      return false;
    }

    const tabWidth = width / this.tabs.length;

    for (let i = 0; i < this.tabs.length; i++) {
      const tabX = panelX + i * tabWidth;
      const tab = this.tabs[i];
      if (clickX >= tabX && clickX < tabX + tabWidth && tab) {
        this.setCurrentTab(tab.id);
        return true;
      }
    }

    return false;
  }

  /**
   * Get tab by ID.
   */
  getTab(id: T): TabDefinition<T> | undefined {
    return this.tabs.find(t => t.id === id);
  }

  /**
   * Get all tabs.
   */
  getTabs(): ReadonlyArray<TabDefinition<T>> {
    return this.tabs;
  }

  /**
   * Add a new tab.
   */
  addTab(tab: TabDefinition<T>): void {
    if (this.tabs.some(t => t.id === tab.id)) {
      throw new Error(`Tab with id "${tab.id}" already exists`);
    }
    this.tabs.push(tab);
  }

  /**
   * Remove a tab by ID.
   */
  removeTab(id: T): boolean {
    const index = this.tabs.findIndex(t => t.id === id);
    if (index === -1) {
      return false;
    }

    this.tabs.splice(index, 1);

    // If current tab was removed, switch to first tab
    const firstTab = this.tabs[0];
    if (this.currentTab === id && this.tabs.length > 0 && firstTab) {
      this.setCurrentTab(firstTab.id);
    }

    return true;
  }
}
