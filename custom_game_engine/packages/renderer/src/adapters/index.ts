/**
 * Panel Adapter Configuration and Factory Functions
 *
 * This file provides configuration for all panel types and convenience factory functions
 * to create PanelAdapter instances. This replaces 14 individual adapter classes with a
 * single generic implementation.
 */

import { PanelAdapter, type PanelConfig } from './PanelAdapter.js';
import type { AgentInfoPanel } from '../AgentInfoPanel.js';
import type { AnimalInfoPanel } from '../AnimalInfoPanel.js';
import type { CraftingPanelUI } from '../CraftingPanelUI.js';
import type { EconomyPanel } from '../EconomyPanel.js';
import type { GovernanceDashboardPanel } from '../GovernanceDashboardPanel.js';
import type { InventoryUI } from '../ui/InventoryUI.js';
import type { MemoryPanel } from '../MemoryPanel.js';
import type { NotificationsPanel } from '../NotificationsPanel.js';
import type { PlantInfoPanel } from '../PlantInfoPanel.js';
import type { RelationshipsPanel } from '../RelationshipsPanel.js';
import type { ResourcesPanel } from '../ResourcesPanel.js';
import type { SettingsPanel } from '../SettingsPanel.js';
import type { ShopPanel } from '../ShopPanel.js';
import type { TileInspectorPanel } from '../TileInspectorPanel.js';

// Export the generic adapter and config type
export { PanelAdapter, type PanelConfig };

// ============================================================================
// Panel Configurations
// ============================================================================

/**
 * Configuration for ResourcesPanel adapter.
 * Pattern: Simple - uses internal visible state
 */
export const RESOURCES_PANEL_CONFIG: PanelConfig<ResourcesPanel> = {
  id: 'resources',
  title: 'Village Stockpile',
  defaultWidth: 280,
  defaultHeight: 200,
  renderMethod: (panel, ctx, _x, _y, width, _height, world) => {
    panel.render(ctx, width, world, false);
  },
};

/**
 * Configuration for MemoryPanel adapter.
 * Pattern: Delegate visibility - panel has isVisible/toggle methods
 */
export const MEMORY_PANEL_CONFIG: PanelConfig<MemoryPanel> = {
  id: 'memory',
  title: 'Memory & Goals',
  defaultWidth: 400,
  defaultHeight: 600,
  getVisible: (panel) => panel.isVisible(),
  setVisible: (panel, visible) => {
    if (visible !== panel.isVisible()) {
      panel.toggle();
    }
  },
  renderMethod: (panel, ctx, _x, _y, width, height, world) => {
    panel.render(ctx, width, height, world);
  },
};

/**
 * Configuration for AgentInfoPanel adapter.
 * Pattern: Conditional visibility - requires entity selection
 */
export const AGENT_INFO_PANEL_CONFIG: PanelConfig<AgentInfoPanel & { _adapter?: { visible: boolean; world: any; screenX: number; screenY: number } }> = {
  id: 'agent-info',
  title: 'Agent Info',
  defaultWidth: 300,
  defaultHeight: 530,
  getVisible: (panel) => {
    if (!panel._adapter) return false;
    return panel._adapter.visible && panel.getSelectedEntityId() !== null;
  },
  setVisible: (panel, visible) => {
    if (!panel._adapter) {
      panel._adapter = { visible: false, world: null, screenX: 0, screenY: 0 };
    }
    panel._adapter.visible = visible;
  },
  renderMethod: (panel, ctx, _x, _y, width, height, world) => {
    if (!panel._adapter) return;
    const worldToUse = world || panel._adapter.world;
    if (!worldToUse) return;
    panel.renderAt(ctx, 0, 0, width, height, worldToUse, panel._adapter.screenX, panel._adapter.screenY);
  },
  handleScroll: (panel, deltaY, _contentHeight) => {
    panel.handleScroll(deltaY);
    return true;
  },
  handleContentClick: (panel, x, y, width, _height) => {
    return panel.handleClick(x, y, 0, 0, width);
  },
};

/**
 * Configuration for AnimalInfoPanel adapter.
 * Pattern: Conditional visibility - requires entity selection
 */
export const ANIMAL_INFO_PANEL_CONFIG: PanelConfig<AnimalInfoPanel & { _adapter?: { visible: boolean; world: any } }> = {
  id: 'animal-info',
  title: 'Animal Info',
  defaultWidth: 300,
  defaultHeight: 450,
  getVisible: (panel) => {
    if (!panel._adapter) return false;
    return panel._adapter.visible && panel.getSelectedEntityId() !== null;
  },
  setVisible: (panel, visible) => {
    if (!panel._adapter) {
      panel._adapter = { visible: false, world: null };
    }
    panel._adapter.visible = visible;
  },
  renderMethod: (panel, ctx, _x, _y, width, height, world) => {
    if (!panel._adapter) return;
    if (!world) return;
    panel._adapter.world = world;
    panel.renderAt(ctx, 0, 0, width, height, world);
  },
  handleScroll: (panel, deltaY, _contentHeight) => {
    panel.handleScroll(deltaY);
    return true;
  },
  handleContentClick: (panel, x, y, width, height) => {
    if (!panel._adapter) return false;
    return panel.handleClickAt(x, y, width, height, panel._adapter.world);
  },
};

/**
 * Configuration for PlantInfoPanel adapter.
 * Pattern: Conditional visibility - requires entity selection
 */
export const PLANT_INFO_PANEL_CONFIG: PanelConfig<PlantInfoPanel> = {
  id: 'plant-info',
  title: 'Plant Info',
  defaultWidth: 320,
  defaultHeight: 480,
  renderMethod: (panel, ctx, _x, _y, width, height, world) => {
    panel.render(ctx, width, height, world, false);
  },
  handleScroll: (panel, deltaY, contentHeight) => {
    return panel.handleScroll(deltaY, contentHeight);
  },
};

/**
 * Configuration for TileInspectorPanel adapter.
 * Pattern: Conditional visibility - requires tile selection
 */
export const TILE_INSPECTOR_PANEL_CONFIG: PanelConfig<TileInspectorPanel & { _adapter?: { visible: boolean } }> = {
  id: 'tile-inspector',
  title: 'Tile Inspector',
  defaultWidth: 384,
  defaultHeight: 504,
  getVisible: (panel) => {
    if (!panel._adapter) return false;
    return panel._adapter.visible && panel.getSelectedTile() !== null;
  },
  setVisible: (panel, visible) => {
    if (!panel._adapter) {
      panel._adapter = { visible: false };
    }
    panel._adapter.visible = visible;
  },
  renderMethod: (panel, ctx, _x, _y, width, height, _world) => {
    panel.renderAt(ctx, 0, 0, width, height);
  },
  handleScroll: (panel, deltaY, _contentHeight) => {
    panel.handleScroll(deltaY);
    return true;
  },
  handleContentClick: (panel, x, y, width, height) => {
    return panel.handleClickAt(x, y, width, height);
  },
};

/**
 * Configuration for EconomyPanel adapter.
 * Pattern: Delegate visibility - panel has isVisible/toggle methods
 */
export const ECONOMY_PANEL_CONFIG: PanelConfig<EconomyPanel> = {
  id: 'economy',
  title: 'Economy Dashboard',
  defaultWidth: 400,
  defaultHeight: 500,
  getVisible: (panel) => panel.isVisible(),
  setVisible: (panel, visible) => {
    if (visible !== panel.isVisible()) {
      panel.toggle();
    }
  },
  renderMethod: (panel, ctx, _x, _y, width, height, world) => {
    panel.render(ctx, width, height, world);
  },
};

/**
 * Configuration for RelationshipsPanel adapter.
 * Pattern: Delegate visibility - panel has isVisible/toggle methods
 */
export const RELATIONSHIPS_PANEL_CONFIG: PanelConfig<RelationshipsPanel> = {
  id: 'relationships',
  title: 'Relationships',
  defaultWidth: 380,
  defaultHeight: 500,
  getVisible: (panel) => panel.isVisible(),
  setVisible: (panel, visible) => {
    if (visible !== panel.isVisible()) {
      panel.toggle();
    }
  },
  renderMethod: (panel, ctx, _x, _y, width, height, world) => {
    panel.render(ctx, width, height, world);
  },
  handleScroll: (panel, deltaY, contentHeight) => {
    return panel.handleScroll(deltaY, contentHeight);
  },
};

/**
 * Configuration for GovernanceDashboardPanel adapter.
 * Pattern: Simple - uses internal visible state
 */
export const GOVERNANCE_DASHBOARD_PANEL_CONFIG: PanelConfig<GovernanceDashboardPanel> = {
  id: 'governance',
  title: 'Governance Dashboard',
  defaultWidth: 400,
  defaultHeight: 500,
  renderMethod: (panel, ctx, _x, _y, width, _height, world) => {
    panel.render(ctx, width, world);
  },
};

/**
 * Configuration for NotificationsPanel adapter.
 * Pattern: Simple - uses internal visible state, dynamic title
 */
export const NOTIFICATIONS_PANEL_CONFIG: PanelConfig<NotificationsPanel & { _adapter?: { visible: boolean } }> = {
  id: 'notifications',
  title: 'Notifications', // Note: actual title includes count, handled by adapter subclass if needed
  defaultWidth: 400,
  defaultHeight: 300,
  renderMethod: (panel, ctx, x, y, width, height, _world) => {
    panel.render(ctx, x, y, width, height);
  },
  handleScroll: (panel, deltaY, _contentHeight) => {
    panel.handleScroll(deltaY);
    return true;
  },
};

/**
 * Configuration for CraftingPanelUI adapter.
 * Pattern: Direct property visibility
 */
export const CRAFTING_PANEL_CONFIG: PanelConfig<CraftingPanelUI> = {
  id: 'crafting',
  title: 'Crafting',
  defaultWidth: 800,
  defaultHeight: 600,
  getVisible: (panel) => panel.isVisible,
  setVisible: (panel, visible) => {
    panel.isVisible = visible;
  },
  renderMethod: (panel, ctx, x, y, _width, _height, _world) => {
    ctx.save();
    ctx.translate(x, y);
    panel.render(ctx);
    ctx.restore();
  },
  handleContentClick: (panel, x, y, _width, _height) => {
    return panel.handleClick(x, y);
  },
};

/**
 * Configuration for InventoryUI adapter.
 * Pattern: Special - uses isOpen() method and keyboard toggle
 */
export const INVENTORY_PANEL_CONFIG: PanelConfig<InventoryUI> = {
  id: 'inventory',
  title: 'Inventory',
  defaultWidth: 800,
  defaultHeight: 600,
  getVisible: (panel) => panel.isOpen(),
  setVisible: (panel, visible) => {
    if (visible !== panel.isOpen()) {
      panel.handleKeyPress('KeyI', false, false);
    }
  },
  renderMethod: (panel, ctx, x, y, width, height, _world) => {
    ctx.save();
    ctx.translate(x, y);
    panel.render(ctx, width, height);
    ctx.restore();
  },
};

/**
 * Configuration for SettingsPanel adapter.
 * Pattern: Special - uses getIsVisible/toggle, DOM-based (no canvas render)
 */
export const SETTINGS_PANEL_CONFIG: PanelConfig<SettingsPanel> = {
  id: 'settings',
  title: 'Settings',
  defaultWidth: 600,
  defaultHeight: 500,
  getVisible: (panel) => panel.getIsVisible(),
  setVisible: (panel, visible) => {
    if (visible !== panel.getIsVisible()) {
      panel.toggle();
    }
  },
  renderMethod: (_panel, _ctx, _x, _y, _width, _height, _world) => {
    // SettingsPanel uses DOM elements, not canvas rendering
  },
};

/**
 * Configuration for ShopPanel adapter.
 * Pattern: Close-only visibility (opening handled separately)
 */
export const SHOP_PANEL_CONFIG: PanelConfig<ShopPanel> = {
  id: 'shop',
  title: 'Shop',
  defaultWidth: 500,
  defaultHeight: 600,
  getVisible: (panel) => panel.isVisible(),
  setVisible: (panel, visible) => {
    if (!visible) {
      panel.close();
    }
    // Opening is handled via openShop method with shop/agent IDs
  },
  renderMethod: (panel, ctx, _x, _y, _width, _height, world) => {
    panel.render(ctx, world);
  },
  handleScroll: (panel, deltaY, _contentHeight) => {
    return panel.handleScroll(deltaY);
  },
};

// ============================================================================
// Factory Functions (backward compatibility)
// ============================================================================

/**
 * Create a ResourcesPanel adapter (replaces ResourcesPanelAdapter)
 */
export function createResourcesPanelAdapter(panel: ResourcesPanel): PanelAdapter<ResourcesPanel> {
  return new PanelAdapter(panel, RESOURCES_PANEL_CONFIG);
}

/**
 * Create a MemoryPanel adapter (replaces MemoryPanelAdapter)
 */
export function createMemoryPanelAdapter(panel: MemoryPanel): PanelAdapter<MemoryPanel> {
  return new PanelAdapter(panel, MEMORY_PANEL_CONFIG);
}

/**
 * Create an AgentInfoPanel adapter (replaces AgentInfoPanelAdapter)
 */
export function createAgentInfoPanelAdapter(panel: AgentInfoPanel): PanelAdapter<AgentInfoPanel & { _adapter?: { visible: boolean; world: any; screenX: number; screenY: number } }> {
  const adapter = new PanelAdapter(panel as any, AGENT_INFO_PANEL_CONFIG);

  // Add setWorld and setScreenPosition methods for backward compatibility
  (adapter as any).setWorld = (world: any) => {
    if (!(panel as any)._adapter) {
      (panel as any)._adapter = { visible: false, world: null, screenX: 0, screenY: 0 };
    }
    (panel as any)._adapter.world = world;
  };

  (adapter as any).setScreenPosition = (x: number, y: number) => {
    if (!(panel as any)._adapter) {
      (panel as any)._adapter = { visible: false, world: null, screenX: 0, screenY: 0 };
    }
    (panel as any)._adapter.screenX = x;
    (panel as any)._adapter.screenY = y;
  };

  return adapter;
}

/**
 * Create an AnimalInfoPanel adapter (replaces AnimalInfoPanelAdapter)
 */
export function createAnimalInfoPanelAdapter(panel: AnimalInfoPanel): PanelAdapter<AnimalInfoPanel & { _adapter?: { visible: boolean; world: any } }> {
  const adapter = new PanelAdapter(panel as any, ANIMAL_INFO_PANEL_CONFIG);

  // Add setWorld method for backward compatibility
  (adapter as any).setWorld = (world: any) => {
    if (!(panel as any)._adapter) {
      (panel as any)._adapter = { visible: false, world: null };
    }
    (panel as any)._adapter.world = world;
  };

  return adapter;
}

/**
 * Create a PlantInfoPanel adapter (replaces PlantInfoPanelAdapter)
 */
export function createPlantInfoPanelAdapter(panel: PlantInfoPanel): PanelAdapter<PlantInfoPanel> {
  return new PanelAdapter(panel, PLANT_INFO_PANEL_CONFIG);
}

/**
 * Create a TileInspectorPanel adapter (replaces TileInspectorPanelAdapter)
 */
export function createTileInspectorPanelAdapter(panel: TileInspectorPanel): PanelAdapter<TileInspectorPanel & { _adapter?: { visible: boolean } }> {
  return new PanelAdapter(panel as any, TILE_INSPECTOR_PANEL_CONFIG);
}

/**
 * Create an EconomyPanel adapter (replaces EconomyPanelAdapter)
 */
export function createEconomyPanelAdapter(panel: EconomyPanel): PanelAdapter<EconomyPanel> {
  return new PanelAdapter(panel, ECONOMY_PANEL_CONFIG);
}

/**
 * Create a RelationshipsPanel adapter (replaces RelationshipsPanelAdapter)
 */
export function createRelationshipsPanelAdapter(panel: RelationshipsPanel): PanelAdapter<RelationshipsPanel> {
  return new PanelAdapter(panel, RELATIONSHIPS_PANEL_CONFIG);
}

/**
 * Create a GovernanceDashboardPanel adapter (replaces GovernanceDashboardPanelAdapter)
 */
export function createGovernanceDashboardPanelAdapter(panel: GovernanceDashboardPanel): PanelAdapter<GovernanceDashboardPanel> {
  return new PanelAdapter(panel, GOVERNANCE_DASHBOARD_PANEL_CONFIG);
}

/**
 * Create a NotificationsPanel adapter (replaces NotificationsPanelAdapter)
 */
export function createNotificationsPanelAdapter(panel: NotificationsPanel): PanelAdapter<NotificationsPanel & { _adapter?: { visible: boolean } }> {
  const adapter = new PanelAdapter(panel as any, NOTIFICATIONS_PANEL_CONFIG);

  // Override getTitle to include notification count
  const originalGetTitle = adapter.getTitle.bind(adapter);
  (adapter as any).getTitle = () => {
    const count = panel.getCount();
    return count > 0 ? `Notifications (${count})` : originalGetTitle();
  };

  return adapter;
}

/**
 * Create a CraftingPanelUI adapter (replaces CraftingPanelUIAdapter)
 */
export function createCraftingPanelAdapter(panel: CraftingPanelUI): PanelAdapter<CraftingPanelUI> {
  return new PanelAdapter(panel, CRAFTING_PANEL_CONFIG);
}

/**
 * Create an InventoryUI adapter (replaces InventoryUIAdapter)
 */
export function createInventoryPanelAdapter(panel: InventoryUI): PanelAdapter<InventoryUI> {
  return new PanelAdapter(panel, INVENTORY_PANEL_CONFIG);
}

/**
 * Create a SettingsPanel adapter (replaces SettingsPanelAdapter)
 */
export function createSettingsPanelAdapter(panel: SettingsPanel): PanelAdapter<SettingsPanel> {
  return new PanelAdapter(panel, SETTINGS_PANEL_CONFIG);
}

/**
 * Create a ShopPanel adapter (replaces ShopPanelAdapter)
 */
export function createShopPanelAdapter(panel: ShopPanel): PanelAdapter<ShopPanel> {
  return new PanelAdapter(panel, SHOP_PANEL_CONFIG);
}
