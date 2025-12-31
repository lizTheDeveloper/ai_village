/**
 * Shared types for input handling
 */
import type { GameLoop, EntityImpl } from '@ai-village/core';
import type {
  Renderer,
  KeyboardRegistry,
  BuildingPlacementUI,
  AgentInfoPanel,
  AnimalInfoPanel,
  TileInspectorPanel,
  PlantInfoPanel,
  MemoryPanel,
  RelationshipsPanel,
  NotificationsPanel,
  EconomyPanel,
  ShopPanel,
  GovernanceDashboardPanel,
  InventoryUI,
  CraftingPanelUI,
  WindowManager,
  MenuBar,
} from '@ai-village/renderer';
import type { ChunkManager, TerrainGenerator } from '@ai-village/world';

export interface GameContext {
  gameLoop: GameLoop;
  renderer: Renderer;
  canvas: HTMLCanvasElement;
  chunkManager: ChunkManager;
  terrainGenerator: TerrainGenerator;
  showNotification: (message: string, color?: string) => void;
}

export interface UIContext {
  agentInfoPanel: AgentInfoPanel;
  animalInfoPanel: AnimalInfoPanel;
  plantInfoPanel: PlantInfoPanel;
  tileInspectorPanel: TileInspectorPanel;
  memoryPanel: MemoryPanel;
  relationshipsPanel: RelationshipsPanel;
  notificationsPanel: NotificationsPanel;
  economyPanel: EconomyPanel;
  shopPanel: ShopPanel;
  governancePanel: GovernanceDashboardPanel;
  inventoryUI: InventoryUI;
  craftingUI: CraftingPanelUI;
  placementUI: BuildingPlacementUI;
  windowManager: WindowManager;
  menuBar: MenuBar;
  keyboardRegistry: KeyboardRegistry;
}

export type KeyHandler = (
  key: string,
  shiftKey: boolean,
  ctrlKey: boolean,
  gameContext: GameContext,
  uiContext: UIContext
) => boolean;
