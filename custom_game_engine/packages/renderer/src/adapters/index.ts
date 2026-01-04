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
import type { MagicSystemsPanel } from '../MagicSystemsPanel.js';
import type { SpellbookPanel } from '../SpellbookPanel.js';
import type { DivinePowersPanel } from '../DivinePowersPanel.js';
import type { DivineChatPanel } from '../DivineChatPanel.js';
import type { VisionComposerPanel } from '../VisionComposerPanel.js';
import type { DevPanel } from '../DevPanel.js';
import type { FarmManagementPanel } from '../FarmManagementPanel.js';
import type { DivineAnalyticsPanel } from '../divine/DivineAnalyticsPanel.js';
import type { SacredGeographyPanel } from '../divine/SacredGeographyPanel.js';
import type { AngelManagementPanel } from '../divine/AngelManagementPanel.js';
import type { PrayerPanel } from '../divine/PrayerPanel.js';
import type { LLMConfigPanel } from '../LLMConfigPanel.js';
import type { World } from '@ai-village/core';

// Export the generic adapter and config type
export { PanelAdapter, type PanelConfig };

// Export view-based adapters (Phase 2: Unified Dashboard System)
export { ViewAdapter } from './ViewAdapter.js';
export {
  createPanelFromView,
  createAllViewPanels,
  getViewPanelsByCategory,
  findPanelForView,
  createWindowConfigForView,
  mapViewCategoryToMenuCategory,
} from './ViewPanelFactory.js';

// ============================================================================
// Adapter State Interfaces
// ============================================================================

/** State for AgentInfoPanel adapter */
interface AgentInfoPanelAdapterState {
  visible: boolean;
  world: World | null;
  screenX: number;
  screenY: number;
}

/** State for AnimalInfoPanel adapter */
interface AnimalInfoPanelAdapterState {
  visible: boolean;
  world: World | null;
}

/** State for TileInspectorPanel adapter */
interface TileInspectorPanelAdapterState {
  visible: boolean;
}

/** State for NotificationsPanel adapter */
interface NotificationsPanelAdapterState {
  visible: boolean;
}

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
    if (!world) return;
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
    if (!world) return;
    panel.render(ctx, width, height, world);
  },
};

/**
 * Configuration for AgentInfoPanel adapter.
 * Pattern: Conditional visibility - requires entity selection
 */
export const AGENT_INFO_PANEL_CONFIG: PanelConfig<AgentInfoPanel & { _adapter?: AgentInfoPanelAdapterState }> = {
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
    const worldToUse = world ?? panel._adapter.world ?? undefined;
    if (!worldToUse) return;
    panel.renderAt(ctx, 0, 0, width, height, worldToUse, panel._adapter.screenX, panel._adapter.screenY);
  },
  handleScroll: (panel, deltaY, contentHeight) => {
    panel.handleScroll(deltaY, contentHeight);
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
export const ANIMAL_INFO_PANEL_CONFIG: PanelConfig<AnimalInfoPanel & { _adapter?: AnimalInfoPanelAdapterState }> = {
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
  handleScroll: (panel, deltaY, contentHeight) => {
    panel.handleScroll(deltaY, contentHeight);
    return true;
  },
  handleContentClick: (panel, x, y, width, height) => {
    if (!panel._adapter) return false;
    return panel.handleClickAt(x, y, width, height, panel._adapter.world ?? undefined);
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
export const TILE_INSPECTOR_PANEL_CONFIG: PanelConfig<TileInspectorPanel & { _adapter?: TileInspectorPanelAdapterState }> = {
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
  handleScroll: (panel, deltaY, contentHeight) => {
    panel.handleScroll(deltaY, contentHeight);
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
    if (!world) return;
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
    if (!world) return;
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
    if (!world) return;
    panel.render(ctx, width, world);
  },
};

/**
 * Configuration for NotificationsPanel adapter.
 * Pattern: Simple - uses internal visible state, dynamic title
 */
export const NOTIFICATIONS_PANEL_CONFIG: PanelConfig<NotificationsPanel & { _adapter?: NotificationsPanelAdapterState }> = {
  id: 'notifications',
  title: 'Notifications', // Note: actual title includes count, handled by adapter subclass if needed
  defaultWidth: 400,
  defaultHeight: 300,
  renderMethod: (panel, ctx, x, y, width, height, _world) => {
    panel.render(ctx, x, y, width, height);
  },
  handleScroll: (panel, deltaY, contentHeight) => {
    panel.handleScroll(deltaY, contentHeight);
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
  getVisible: (panel) => panel.isVisible(),
  setVisible: (panel, visible) => {
    if (visible !== panel.isVisible()) {
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

/**
 * Configuration for MagicSystemsPanel adapter.
 * Pattern: Delegate visibility - panel has isVisible/toggle methods
 */
export const MAGIC_SYSTEMS_PANEL_CONFIG: PanelConfig<MagicSystemsPanel> = {
  id: 'magic-systems',
  title: 'Magic Systems',
  defaultWidth: 380,
  defaultHeight: 450,
  menuCategory: 'magic',
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
  handleContentClick: (panel, x, y, _width, _height) => {
    return panel.handleClick(x, y);
  },
};

/**
 * Configuration for FarmManagementPanel adapter.
 * Pattern: Adapter visibility - visibility stored in _adapter state
 */
interface FarmManagementPanelAdapterState {
  visible: boolean;
}

export const FARM_MANAGEMENT_PANEL_CONFIG: PanelConfig<FarmManagementPanel & { _adapter?: FarmManagementPanelAdapterState }> = {
  id: 'farm-management',
  title: 'Farm Management',
  defaultWidth: 320,
  defaultHeight: 480,
  menuCategory: 'farming',
  getVisible: (panel) => panel._adapter?.visible ?? false,
  setVisible: (panel, visible) => {
    if (!panel._adapter) {
      panel._adapter = { visible: false };
    }
    panel._adapter.visible = visible;
  },
  renderMethod: (panel, ctx, _x, _y, width, height, world) => {
    panel.render(ctx, width, height, world);
  },
  handleScroll: (panel, deltaY, contentHeight) => {
    return panel.handleScroll(deltaY, contentHeight);
  },
  handleContentClick: (panel, x, y, width, _height) => {
    return panel.handleClick(x, y, width);
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
export function createAgentInfoPanelAdapter(panel: AgentInfoPanel): PanelAdapter<AgentInfoPanel & { _adapter?: AgentInfoPanelAdapterState }> & { setWorld: (world: World | null) => void; setScreenPosition: (x: number, y: number) => void } {
  type PanelWithAdapter = AgentInfoPanel & { _adapter?: AgentInfoPanelAdapterState };
  const panelWithAdapter = panel as PanelWithAdapter;
  const adapter = new PanelAdapter(panelWithAdapter, AGENT_INFO_PANEL_CONFIG);

  // Add setWorld and setScreenPosition methods for backward compatibility
  const extendedAdapter = adapter as typeof adapter & {
    setWorld: (world: World | null) => void;
    setScreenPosition: (x: number, y: number) => void;
  };

  extendedAdapter.setWorld = (world: World | null) => {
    if (!panelWithAdapter._adapter) {
      panelWithAdapter._adapter = { visible: false, world: null, screenX: 0, screenY: 0 };
    }
    panelWithAdapter._adapter.world = world;
  };

  extendedAdapter.setScreenPosition = (x: number, y: number) => {
    if (!panelWithAdapter._adapter) {
      panelWithAdapter._adapter = { visible: false, world: null, screenX: 0, screenY: 0 };
    }
    panelWithAdapter._adapter.screenX = x;
    panelWithAdapter._adapter.screenY = y;
  };

  return extendedAdapter;
}

/**
 * Create an AnimalInfoPanel adapter (replaces AnimalInfoPanelAdapter)
 */
export function createAnimalInfoPanelAdapter(panel: AnimalInfoPanel): PanelAdapter<AnimalInfoPanel & { _adapter?: AnimalInfoPanelAdapterState }> & { setWorld: (world: World | null) => void } {
  type PanelWithAdapter = AnimalInfoPanel & { _adapter?: AnimalInfoPanelAdapterState };
  const panelWithAdapter = panel as PanelWithAdapter;
  const adapter = new PanelAdapter(panelWithAdapter, ANIMAL_INFO_PANEL_CONFIG);

  // Add setWorld method for backward compatibility
  const extendedAdapter = adapter as typeof adapter & { setWorld: (world: World | null) => void };

  extendedAdapter.setWorld = (world: World | null) => {
    if (!panelWithAdapter._adapter) {
      panelWithAdapter._adapter = { visible: false, world: null };
    }
    panelWithAdapter._adapter.world = world;
  };

  return extendedAdapter;
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
export function createTileInspectorPanelAdapter(panel: TileInspectorPanel): PanelAdapter<TileInspectorPanel & { _adapter?: TileInspectorPanelAdapterState }> {
  type PanelWithAdapter = TileInspectorPanel & { _adapter?: TileInspectorPanelAdapterState };
  return new PanelAdapter(panel as PanelWithAdapter, TILE_INSPECTOR_PANEL_CONFIG);
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
export function createNotificationsPanelAdapter(panel: NotificationsPanel): PanelAdapter<NotificationsPanel & { _adapter?: NotificationsPanelAdapterState }> & { getTitle: () => string } {
  type PanelWithAdapter = NotificationsPanel & { _adapter?: NotificationsPanelAdapterState };
  const panelWithAdapter = panel as PanelWithAdapter;
  const adapter = new PanelAdapter(panelWithAdapter, NOTIFICATIONS_PANEL_CONFIG);

  // Override getTitle to include notification count
  const originalGetTitle = adapter.getTitle.bind(adapter);
  const extendedAdapter = adapter as typeof adapter & { getTitle: () => string };

  extendedAdapter.getTitle = () => {
    const count = panel.getCount();
    return count > 0 ? `Notifications (${count})` : originalGetTitle();
  };

  return extendedAdapter;
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
 * Configuration for LLMConfigPanel adapter.
 * Pattern: Special - uses getIsVisible/toggle, DOM-based (no canvas render)
 */
export const LLM_CONFIG_PANEL_CONFIG: PanelConfig<LLMConfigPanel> = {
  id: 'llm-config',
  title: 'Custom LLM Config',
  defaultWidth: 500,
  defaultHeight: 400,
  getVisible: (panel) => panel.getIsVisible(),
  setVisible: (panel, visible) => {
    if (visible !== panel.getIsVisible()) {
      panel.toggle();
    }
  },
  renderMethod: (_panel, _ctx, _x, _y, _width, _height, _world) => {
    // LLMConfigPanel uses DOM elements, not canvas rendering
  },
};

/**
 * Create an LLMConfigPanel adapter
 */
export function createLLMConfigPanelAdapter(panel: LLMConfigPanel): PanelAdapter<LLMConfigPanel> {
  return new PanelAdapter(panel, LLM_CONFIG_PANEL_CONFIG);
}

/**
 * Create a ShopPanel adapter (replaces ShopPanelAdapter)
 */
export function createShopPanelAdapter(panel: ShopPanel): PanelAdapter<ShopPanel> {
  return new PanelAdapter(panel, SHOP_PANEL_CONFIG);
}

/**
 * Create a MagicSystemsPanel adapter
 */
export function createMagicSystemsPanelAdapter(panel: MagicSystemsPanel): PanelAdapter<MagicSystemsPanel> {
  return new PanelAdapter(panel, MAGIC_SYSTEMS_PANEL_CONFIG);
}

/**
 * Configuration for SpellbookPanel adapter.
 * Pattern: Delegate visibility - panel has isVisible/toggle methods
 */
export const SPELLBOOK_PANEL_CONFIG: PanelConfig<SpellbookPanel> = {
  id: 'spellbook',
  title: 'Spellbook',
  defaultWidth: 420,
  defaultHeight: 550,
  menuCategory: 'magic',
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
  handleContentClick: (panel, x, y, _width, _height) => {
    return panel.handleClick(x, y);
  },
};

/**
 * Create a SpellbookPanel adapter
 */
export function createSpellbookPanelAdapter(panel: SpellbookPanel): PanelAdapter<SpellbookPanel> {
  return new PanelAdapter(panel, SPELLBOOK_PANEL_CONFIG);
}

/**
 * Configuration for DivinePowersPanel adapter.
 * Pattern: Delegate visibility - panel has isVisible/toggle methods
 */
export const DIVINE_POWERS_PANEL_CONFIG: PanelConfig<DivinePowersPanel> = {
  id: 'divine-powers',
  title: 'Divine Powers',
  defaultWidth: 400,
  defaultHeight: 550,
  menuCategory: 'divinity',
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
  handleContentClick: (panel, x, y, _width, _height) => {
    return panel.handleClick(x, y);
  },
};

/**
 * Create a DivinePowersPanel adapter
 */
export function createDivinePowersPanelAdapter(panel: DivinePowersPanel): PanelAdapter<DivinePowersPanel> {
  return new PanelAdapter(panel, DIVINE_POWERS_PANEL_CONFIG);
}

/**
 * Configuration for DivineChatPanel adapter.
 * Pattern: Delegate visibility - panel has isVisible/show/hide methods
 */
export const DIVINE_CHAT_PANEL_CONFIG: PanelConfig<DivineChatPanel> = {
  id: 'divine-chat',
  title: 'Divine Chat',
  defaultWidth: 400,
  defaultHeight: 600,
  menuCategory: 'divinity',
  getVisible: (panel) => panel.isVisible(),
  setVisible: (panel, visible) => {
    if (visible) {
      panel.show();
    } else {
      panel.hide();
    }
  },
  renderMethod: (panel, ctx, _x, _y, width, height, world) => {
    panel.render(ctx, width, height, world);
  },
  handleScroll: (panel, deltaY, _contentHeight) => {
    panel.handleWheel(deltaY);
    return true;
  },
  handleContentClick: (panel, x, y, width, height) => {
    return panel.handleClick(x, y, width, height);
  },
};

/**
 * Create a DivineChatPanel adapter
 */
export function createDivineChatPanelAdapter(panel: DivineChatPanel): PanelAdapter<DivineChatPanel> {
  return new PanelAdapter(panel, DIVINE_CHAT_PANEL_CONFIG);
}

/**
 * Configuration for VisionComposerPanel adapter.
 * Pattern: Delegate visibility - panel has isVisible/toggle methods
 */
export const VISION_COMPOSER_PANEL_CONFIG: PanelConfig<VisionComposerPanel> = {
  id: 'vision-composer',
  title: 'Vision Composer',
  defaultWidth: 500,
  defaultHeight: 600,
  menuCategory: 'divinity',
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
  handleContentClick: (panel, x, y, _width, _height) => {
    return panel.handleClick(x, y);
  },
};

/**
 * Create a VisionComposerPanel adapter
 */
export function createVisionComposerPanelAdapter(panel: VisionComposerPanel): PanelAdapter<VisionComposerPanel> {
  return new PanelAdapter(panel, VISION_COMPOSER_PANEL_CONFIG);
}

/**
 * Configuration for DevPanel adapter.
 * Pattern: Delegate visibility - panel has isVisible/toggle methods
 */
export const DEV_PANEL_CONFIG: PanelConfig<DevPanel> = {
  id: 'dev-panel',
  title: 'Dev Tools',
  defaultWidth: 450,
  defaultHeight: 650,
  menuCategory: 'dev',
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
  handleContentClick: (panel, x, y, _width, _height) => {
    return panel.handleClick(x, y);
  },
};

/**
 * Create a DevPanel adapter
 */
export function createDevPanelAdapter(panel: DevPanel): PanelAdapter<DevPanel> {
  return new PanelAdapter(panel, DEV_PANEL_CONFIG);
}

// ============================================================================
// Divine Panel Configurations
// ============================================================================

/**
 * Configuration for DivineAnalyticsPanel adapter.
 * Pattern: Delegate visibility - panel has isVisible/setVisible methods
 */
export const DIVINE_ANALYTICS_PANEL_CONFIG: PanelConfig<DivineAnalyticsPanel> = {
  id: 'divine-analytics',
  title: 'Divine Insights',
  defaultWidth: 700,
  defaultHeight: 550,
  menuCategory: 'divinity',
  getVisible: (panel) => panel.isVisible(),
  setVisible: (panel, visible) => panel.setVisible(visible),
  renderMethod: (panel, ctx, x, y, width, height, world) => {
    panel.render(ctx, x, y, width, height, world);
  },
  handleScroll: (panel, deltaY, contentHeight) => {
    return panel.handleScroll ? panel.handleScroll(deltaY, contentHeight) : false;
  },
};

/**
 * Create a DivineAnalyticsPanel adapter
 */
export function createDivineAnalyticsPanelAdapter(panel: DivineAnalyticsPanel): PanelAdapter<DivineAnalyticsPanel> {
  return new PanelAdapter(panel, DIVINE_ANALYTICS_PANEL_CONFIG);
}

/**
 * Configuration for SacredGeographyPanel adapter.
 * Pattern: Delegate visibility - panel has isVisible/setVisible methods
 */
export const SACRED_GEOGRAPHY_PANEL_CONFIG: PanelConfig<SacredGeographyPanel> = {
  id: 'sacred-geography',
  title: 'Sacred Geography',
  defaultWidth: 600,
  defaultHeight: 500,
  menuCategory: 'divinity',
  getVisible: (panel) => panel.isVisible(),
  setVisible: (panel, visible) => panel.setVisible(visible),
  renderMethod: (panel, ctx, x, y, width, height, world) => {
    panel.render(ctx, x, y, width, height, world);
  },
  handleContentClick: (panel, x, y, _width, _height) => {
    return panel.handleClick ? panel.handleClick(x, y) : false;
  },
};

/**
 * Create a SacredGeographyPanel adapter
 */
export function createSacredGeographyPanelAdapter(panel: SacredGeographyPanel): PanelAdapter<SacredGeographyPanel> {
  return new PanelAdapter(panel, SACRED_GEOGRAPHY_PANEL_CONFIG);
}

/**
 * Configuration for AngelManagementPanel adapter.
 * Pattern: Delegate visibility - panel has isVisible/setVisible methods
 */
export const ANGEL_MANAGEMENT_PANEL_CONFIG: PanelConfig<AngelManagementPanel> = {
  id: 'angel-management',
  title: 'Heavenly Host',
  defaultWidth: 550,
  defaultHeight: 500,
  menuCategory: 'divinity',
  getVisible: (panel) => panel.isVisible(),
  setVisible: (panel, visible) => panel.setVisible(visible),
  renderMethod: (panel, ctx, x, y, width, height, world) => {
    panel.render(ctx, x, y, width, height, world);
  },
  handleScroll: (panel, deltaY, contentHeight) => {
    panel.handleScroll(deltaY, contentHeight);
    return true;
  },
  handleContentClick: (panel, x, y, _width, _height) => {
    return panel.handleClick(x, y);
  },
};

/**
 * Create an AngelManagementPanel adapter
 */
export function createAngelManagementPanelAdapter(panel: AngelManagementPanel): PanelAdapter<AngelManagementPanel> {
  return new PanelAdapter(panel, ANGEL_MANAGEMENT_PANEL_CONFIG);
}

/**
 * Configuration for PrayerPanel adapter.
 * Pattern: Delegate visibility - panel has isVisible/setVisible methods
 */
export const PRAYER_PANEL_CONFIG: PanelConfig<PrayerPanel> = {
  id: 'prayers',
  title: 'Prayers & Supplications',
  defaultWidth: 550,
  defaultHeight: 450,
  menuCategory: 'divinity',
  getVisible: (panel) => panel.isVisible(),
  setVisible: (panel, visible) => panel.setVisible(visible),
  renderMethod: (panel, ctx, x, y, width, height, world) => {
    panel.render(ctx, x, y, width, height, world);
  },
  handleScroll: (panel, deltaY, contentHeight) => {
    panel.handleScroll(deltaY, contentHeight);
    return true;
  },
  handleContentClick: (panel, x, y, _width, _height) => {
    return panel.handleClick(x, y);
  },
};

/**
 * Create a PrayerPanel adapter
 */
export function createPrayerPanelAdapter(panel: PrayerPanel): PanelAdapter<PrayerPanel> {
  return new PanelAdapter(panel, PRAYER_PANEL_CONFIG);
}

/**
 * Create a FarmManagementPanel adapter
 */
export function createFarmManagementPanelAdapter(panel: FarmManagementPanel): PanelAdapter<FarmManagementPanel & { _adapter?: FarmManagementPanelAdapterState }> {
  return new PanelAdapter(panel, FARM_MANAGEMENT_PANEL_CONFIG);
}
