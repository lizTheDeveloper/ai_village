/**
 * DivineTabBar - Bottom tab bar for switching between divine interface sections
 *
 * Provides quick navigation between:
 * - Prayers: The prayer inbox
 * - Angels: Angel management panel
 * - Sacred Sites: Sacred geography map
 * - Insights: Divine analytics dashboard
 *
 * See: specs/divine-systems-ui.md
 */

import { DIVINE_COLORS } from './DivineUITypes.js';

export type DivineTab = 'prayers' | 'angels' | 'sacred' | 'insights';

export interface DivineTabBarCallbacks {
  onTabChange: (tab: DivineTab) => void;
}

export interface DivineTabBarState {
  activeTab: DivineTab;
  unreadPrayers: number;
  activeAngels: number;
  sacredSiteCount: number;
  hasNewInsights: boolean;
}

interface TabDefinition {
  id: DivineTab;
  label: string;
  icon: string;
  windowId: string;
}

const TABS: TabDefinition[] = [
  { id: 'prayers', label: 'Prayers', icon: '\u{1F64F}', windowId: 'divine-prayers' },
  { id: 'angels', label: 'Angels', icon: '\u{1F47C}', windowId: 'divine-angels' },
  { id: 'sacred', label: 'Sacred Sites', icon: '\u{1F5FA}\uFE0F', windowId: 'divine-sacred-geography' },
  { id: 'insights', label: 'Insights', icon: '\u{1F4CA}', windowId: 'divine-analytics' },
];

const SIZES = {
  height: 50,
  tabPadding: 16,
  iconSize: 20,
  labelSize: 11,
  badgeSize: 16,
};

/**
 * DivineTabBar - Renders a tab bar for switching between divine sections
 */
export class DivineTabBar {
  private state: DivineTabBarState;
  private callbacks: DivineTabBarCallbacks;
  private visible: boolean = false;
  private hoveredTab: DivineTab | null = null;

  constructor(
    initialState: DivineTabBarState,
    callbacks: DivineTabBarCallbacks
  ) {
    this.state = initialState;
    this.callbacks = callbacks;
  }

  /**
   * Show the tab bar
   */
  show(): void {
    this.visible = true;
  }

  /**
   * Hide the tab bar
   */
  hide(): void {
    this.visible = false;
  }

  /**
   * Check if tab bar is visible
   */
  isVisible(): boolean {
    return this.visible;
  }

  /**
   * Toggle visibility
   */
  toggle(): void {
    this.visible = !this.visible;
  }

  /**
   * Update state
   */
  updateState(newState: Partial<DivineTabBarState>): void {
    this.state = { ...this.state, ...newState };
  }

  /**
   * Get current state
   */
  getState(): DivineTabBarState {
    return { ...this.state };
  }

  /**
   * Get tab definitions for external use
   */
  getTabs(): TabDefinition[] {
    return TABS;
  }

  /**
   * Get window ID for a tab
   */
  getWindowIdForTab(tab: DivineTab): string {
    const tabDef = TABS.find(t => t.id === tab);
    return tabDef?.windowId ?? '';
  }

  /**
   * Get the height of the tab bar
   */
  getHeight(): number {
    return SIZES.height;
  }

  /**
   * Render the tab bar
   */
  render(
    ctx: CanvasRenderingContext2D,
    canvasWidth: number,
    canvasHeight: number
  ): void {
    if (!this.visible) return;

    const y = canvasHeight - SIZES.height;

    // Draw background
    ctx.fillStyle = 'rgba(20, 20, 30, 0.95)';
    ctx.fillRect(0, y, canvasWidth, SIZES.height);

    // Draw top border
    ctx.strokeStyle = DIVINE_COLORS.primary;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(canvasWidth, y);
    ctx.stroke();

    // Draw tabs
    const tabWidth = canvasWidth / TABS.length;

    TABS.forEach((tab, index) => {
      const tabX = index * tabWidth;
      const isActive = this.state.activeTab === tab.id;
      const isHovered = this.hoveredTab === tab.id;

      // Tab background
      if (isActive) {
        ctx.fillStyle = 'rgba(255, 215, 0, 0.2)';
        ctx.fillRect(tabX, y, tabWidth, SIZES.height);
      } else if (isHovered) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.fillRect(tabX, y, tabWidth, SIZES.height);
      }

      // Active indicator
      if (isActive) {
        ctx.fillStyle = DIVINE_COLORS.primary;
        ctx.fillRect(tabX + 10, y, tabWidth - 20, 3);
      }

      // Center content
      const centerX = tabX + tabWidth / 2;
      let contentY = y + 12;

      // Icon
      ctx.font = `${SIZES.iconSize}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillStyle = isActive ? DIVINE_COLORS.primary : '#AAAAAA';
      ctx.fillText(tab.icon, centerX, contentY);

      // Badge
      const badge = this.getBadgeForTab(tab.id);
      if (badge !== null) {
        const badgeX = centerX + SIZES.iconSize / 2 + 2;
        const badgeY = contentY - 2;

        // Badge background
        ctx.fillStyle = badge > 0 ? DIVINE_COLORS.critical : DIVINE_COLORS.secondary;
        ctx.beginPath();
        ctx.arc(badgeX, badgeY + SIZES.badgeSize / 2, SIZES.badgeSize / 2, 0, Math.PI * 2);
        ctx.fill();

        // Badge text
        ctx.font = 'bold 10px sans-serif';
        ctx.fillStyle = '#FFFFFF';
        ctx.fillText(
          badge > 99 ? '99+' : String(badge),
          badgeX,
          badgeY + SIZES.badgeSize / 2 - 4
        );
      }

      // Label
      contentY += SIZES.iconSize + 4;
      ctx.font = `${SIZES.labelSize}px sans-serif`;
      ctx.fillStyle = isActive ? DIVINE_COLORS.primary : '#888888';
      ctx.fillText(tab.label, centerX, contentY);
    });

    // Reset text alignment
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
  }

  /**
   * Get badge value for a tab
   */
  private getBadgeForTab(tab: DivineTab): number | null {
    switch (tab) {
      case 'prayers':
        return this.state.unreadPrayers > 0 ? this.state.unreadPrayers : null;
      case 'angels':
        return this.state.activeAngels > 0 ? this.state.activeAngels : null;
      case 'sacred':
        return this.state.sacredSiteCount > 0 ? this.state.sacredSiteCount : null;
      case 'insights':
        return this.state.hasNewInsights ? 1 : null;
      default:
        return null;
    }
  }

  /**
   * Handle mouse move for hover effects
   */
  handleMouseMove(
    x: number,
    y: number,
    canvasWidth: number,
    canvasHeight: number
  ): void {
    if (!this.visible) {
      this.hoveredTab = null;
      return;
    }

    const tabBarY = canvasHeight - SIZES.height;

    if (y < tabBarY || y > canvasHeight) {
      this.hoveredTab = null;
      return;
    }

    const tabWidth = canvasWidth / TABS.length;
    const tabIndex = Math.floor(x / tabWidth);

    const tab = TABS[tabIndex];
    if (tabIndex >= 0 && tabIndex < TABS.length && tab) {
      this.hoveredTab = tab.id;
    } else {
      this.hoveredTab = null;
    }
  }

  /**
   * Handle click on tab bar
   * Returns true if click was handled
   */
  handleClick(
    x: number,
    y: number,
    canvasWidth: number,
    canvasHeight: number
  ): boolean {
    if (!this.visible) return false;

    const tabBarY = canvasHeight - SIZES.height;

    if (y < tabBarY || y > canvasHeight) {
      return false;
    }

    const tabWidth = canvasWidth / TABS.length;
    const tabIndex = Math.floor(x / tabWidth);
    const clickedTab = TABS[tabIndex];

    if (tabIndex >= 0 && tabIndex < TABS.length && clickedTab) {
      if (clickedTab.id !== this.state.activeTab) {
        this.state.activeTab = clickedTab.id;
        this.callbacks.onTabChange(clickedTab.id);
      }
      return true;
    }

    return false;
  }

  /**
   * Check if a point is within the tab bar area
   */
  isPointInTabBar(
    y: number,
    canvasHeight: number
  ): boolean {
    if (!this.visible) return false;
    const tabBarY = canvasHeight - SIZES.height;
    return y >= tabBarY && y <= canvasHeight;
  }
}
