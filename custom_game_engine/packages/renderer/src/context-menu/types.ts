/**
 * Context Menu Types
 *
 * Type definitions for the radial context menu system.
 */

import type { World, EventBus } from '@ai-village/core';
import type { MenuContext } from './MenuContext.js';

// ============================================================================
// Menu Item Types
// ============================================================================

/**
 * Animation styles for menu open/close.
 */
export type AnimationStyle = 'fade' | 'scale' | 'rotate_in' | 'pop';

/**
 * Context types for menu detection.
 */
export type ContextType = 'empty_tile' | 'agent' | 'building' | 'resource' | 'terrain';

/**
 * Base menu item definition.
 */
export interface MenuItemBase {
  /** Unique ID for this menu item instance */
  id: string;
  /** Display label */
  label: string;
  /** Action ID to execute */
  actionId: string;
  /** Optional icon identifier */
  icon?: string;
  /** Optional keyboard shortcut */
  shortcut?: string;
  /** Whether item is currently enabled */
  enabled: boolean;
  /** Whether this item has a submenu */
  hasSubmenu?: boolean;
  /** Submenu items (if hasSubmenu is true) */
  submenu?: RadialMenuItem[];
  /** Whether this action requires confirmation */
  requiresConfirmation?: boolean;
  /** Confirmation message */
  confirmationMessage?: string;
  /** Array of consequences to display in confirmation */
  consequences?: string[];
  /** Submenu indicator symbol */
  submenuIndicator?: string;
}

/**
 * Radial menu item with calculated arc angles.
 */
export interface RadialMenuItem extends MenuItemBase {
  /** Start angle in degrees (0-360) */
  startAngle?: number;
  /** End angle in degrees (0-360) */
  endAngle?: number;
  /** Inner radius in pixels */
  innerRadius?: number;
  /** Outer radius in pixels */
  outerRadius?: number;
  /** Whether this item is currently hovered */
  hovered?: boolean;
}

// ============================================================================
// Action Definition Types
// ============================================================================

/**
 * Action definition for the context menu registry.
 */
export interface ContextAction {
  /** Unique action ID */
  id: string;
  /** Display label */
  label: string;
  /** Icon identifier */
  icon: string;
  /** Optional keyboard shortcut */
  shortcut?: string;
  /** Optional action category */
  category?: string;
  /** Whether this action has a submenu */
  hasSubmenu?: boolean;
  /** Submenu actions */
  submenu?: ContextAction[];
  /** Whether this action requires confirmation */
  requiresConfirmation?: boolean;
  /** Confirmation message */
  confirmationMessage?: string;
  /** Array of consequences to display */
  consequences?: string[];
  /** Function to check if action is applicable to context */
  isApplicable: (context: MenuContext) => boolean;
  /** Function to execute the action */
  execute?: (context: MenuContext, world: World, eventBus: EventBus) => void;
}

// ============================================================================
// Menu Configuration
// ============================================================================

/**
 * Configuration for radial menu appearance.
 */
export interface RadialMenuConfig {
  /** Inner radius (dead zone) in pixels */
  innerRadius: number;
  /** Outer radius in pixels */
  outerRadius: number;
  /** Gap between items in degrees */
  itemGap: number;
  /** Normal item color */
  normalColor: string;
  /** Hover item color */
  hoverColor: string;
  /** Disabled item color */
  disabledColor: string;
  /** Background color */
  backgroundColor: string;
  /** Border color */
  borderColor: string;
  /** Border width in pixels */
  borderWidth: number;
  /** Hover scale multiplier */
  hoverScale: number;
  /** Hover brightness multiplier */
  hoverBrightness: number;
  /** Disabled opacity */
  disabledOpacity: number;
  /** Font family */
  fontFamily: string;
  /** Font size in pixels */
  fontSize: number;
  /** Icon size in pixels */
  iconSize: number;
  /** Open animation style */
  openAnimation: AnimationStyle;
  /** Close animation style */
  closeAnimation: AnimationStyle;
  /** Animation duration in milliseconds */
  animationDuration: number;
}

/**
 * Default radial menu configuration.
 */
export const DEFAULT_RADIAL_MENU_CONFIG: RadialMenuConfig = {
  innerRadius: 30,
  outerRadius: 100,
  itemGap: 3,
  normalColor: '#FFFFFF',
  hoverColor: '#FFD700',
  disabledColor: '#888888',
  backgroundColor: '#000000AA',
  borderColor: '#FFFFFFDD',
  borderWidth: 2,
  hoverScale: 1.1,
  hoverBrightness: 1.2,
  disabledOpacity: 0.5,
  fontFamily: '8-bit pixel font, monospace',
  fontSize: 12,
  iconSize: 24,
  openAnimation: 'rotate_in',
  closeAnimation: 'fade',
  animationDuration: 200
};

// ============================================================================
// Menu State Types
// ============================================================================

/**
 * Current state of the context menu.
 */
export interface MenuState {
  /** Whether menu is currently open */
  isOpen: boolean;
  /** Screen position of menu center */
  position: { x: number; y: number };
  /** Current context */
  context: MenuContext | null;
  /** Currently hovered item ID */
  hoveredItemId: string | null;
  /** Hover scale (for visual feedback) */
  hoverScale: number;
  /** Hover brightness (for visual feedback) */
  hoverBrightness: number;
  /** Current menu level (0 = root, 1+ = submenu depth) */
  menuLevel: number;
  /** Animation progress (0-1) */
  animationProgress: number;
  /** Whether menu is currently animating */
  isAnimating: boolean;
}

/**
 * Visual state for rendering.
 */
export interface VisualState {
  /** Whether to show connector line to target */
  showConnectorLine: boolean;
  /** Target position for connector line */
  connectorTarget: { x: number; y: number } | null;
  /** Cursor style */
  cursor: 'default' | 'pointer' | 'not-allowed';
}

/**
 * Item render state for visual feedback.
 */
export interface ItemRenderState {
  /** Opacity (0-1) */
  opacity: number;
  /** Scale multiplier */
  scale: number;
  /** Brightness multiplier */
  brightness: number;
  /** Whether item is being selected (animation) */
  selecting: boolean;
}

/**
 * Menu stack entry for breadcrumb navigation.
 */
export interface MenuStackEntry {
  /** Parent item ID (null for root) */
  parentId: string | null;
  /** Items at this level */
  items: RadialMenuItem[];
  /** Menu position */
  position: { x: number; y: number };
}
