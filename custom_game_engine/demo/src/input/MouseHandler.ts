/**
 * Mouse handler module - breaks down mouse handling into focused functions
 * Refactored from main.ts to reduce cyclomatic complexity
 */
import type { GameContext, UIContext } from './types.js';

// ============================================================================
// Entity Selection Helpers
// ============================================================================

function clearAllSelections(uiContext: UIContext): void {
  const {
    agentInfoPanel, animalInfoPanel, plantInfoPanel,
    memoryPanel, relationshipsPanel, windowManager
  } = uiContext;

  agentInfoPanel.setSelectedEntity(null);
  animalInfoPanel.setSelectedEntity(null);
  plantInfoPanel.setSelectedEntity(null);
  memoryPanel.setSelectedEntity(null);
  relationshipsPanel.setSelectedEntity(null);
  windowManager.hideWindow('agent-info');
  windowManager.hideWindow('animal-info');
  windowManager.hideWindow('plant-info');
}

function selectAgent(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  entity: any,
  uiContext: UIContext
): void {
  const {
    agentInfoPanel, animalInfoPanel, plantInfoPanel,
    memoryPanel, relationshipsPanel, craftingUI, windowManager
  } = uiContext;

  agentInfoPanel.setSelectedEntity(entity);
  animalInfoPanel.setSelectedEntity(null);
  plantInfoPanel.setSelectedEntity(null);
  memoryPanel.setSelectedEntity(entity);
  relationshipsPanel.setSelectedEntity(entity);

  if (windowManager.getWindow('crafting')?.visible) {
    craftingUI.setActiveAgent(entity.id);
  }

  windowManager.showWindow('agent-info');
  windowManager.hideWindow('animal-info');
  windowManager.hideWindow('plant-info');
}

function selectAnimal(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  entity: any,
  uiContext: UIContext
): void {
  const {
    agentInfoPanel, animalInfoPanel, plantInfoPanel,
    memoryPanel, relationshipsPanel, windowManager
  } = uiContext;

  animalInfoPanel.setSelectedEntity(entity);
  agentInfoPanel.setSelectedEntity(null);
  plantInfoPanel.setSelectedEntity(null);
  memoryPanel.setSelectedEntity(null);
  relationshipsPanel.setSelectedEntity(null);
  windowManager.showWindow('animal-info');
  windowManager.hideWindow('agent-info');
  windowManager.hideWindow('plant-info');
}

function selectPlant(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  entity: any,
  uiContext: UIContext
): void {
  const {
    agentInfoPanel, animalInfoPanel, plantInfoPanel,
    memoryPanel, relationshipsPanel, windowManager
  } = uiContext;

  plantInfoPanel.setSelectedEntity(entity);
  agentInfoPanel.setSelectedEntity(null);
  animalInfoPanel.setSelectedEntity(null);
  memoryPanel.setSelectedEntity(null);
  relationshipsPanel.setSelectedEntity(null);
  windowManager.showWindow('plant-info');
  windowManager.hideWindow('agent-info');
  windowManager.hideWindow('animal-info');
}

// ============================================================================
// Click Handlers
// ============================================================================

function handleUIClick(
  screenX: number,
  screenY: number,
  uiContext: UIContext
): boolean {
  const { menuBar, windowManager } = uiContext;

  if (menuBar.handleClick(screenX, screenY)) {
    return true;
  }

  if (windowManager.handleDragStart(screenX, screenY)) {
    return true;
  }

  if (windowManager.handleClick(screenX, screenY)) {
    return true;
  }

  return false;
}

function handleRightClick(
  screenX: number,
  screenY: number,
  gameContext: GameContext,
  uiContext: UIContext
): boolean {
  const { gameLoop } = gameContext;
  const { tileInspectorPanel, windowManager } = uiContext;

  const tileData = tileInspectorPanel.findTileAtScreenPosition(screenX, screenY, gameLoop.world);
  if (tileData) {
    tileInspectorPanel.setSelectedTile(tileData.tile, tileData.x, tileData.y);
    windowManager.showWindow('tile-inspector');
  } else {
    tileInspectorPanel.setSelectedTile(null);
    windowManager.hideWindow('tile-inspector');
  }
  return true;
}

function handleEntitySelection(
  screenX: number,
  screenY: number,
  gameContext: GameContext,
  uiContext: UIContext
): boolean {
  const { gameLoop, renderer, showNotification } = gameContext;
  const { agentInfoPanel, shopPanel } = uiContext;

  const entity = renderer.findEntityAtScreenPosition(screenX, screenY, gameLoop.world);

  if (!entity) {
    clearAllSelections(uiContext);
    return false;
  }

  const hasAgent = entity.components.has('agent');
  const hasAnimal = entity.components.has('animal');
  const hasPlant = entity.components.has('plant');
  const hasResource = entity.components.has('resource');
  const hasShop = entity.components.has('shop');
  const hasBuilding = entity.components.has('building');

  // Shop building interaction
  if (hasShop && hasBuilding) {
    const selectedAgent = agentInfoPanel.getSelectedEntity();
    if (selectedAgent) {
      shopPanel.openShop(entity.id, selectedAgent.id);
    } else {
      showNotification('Select an agent first to trade with shops', '#FFA500');
    }
    return true;
  }

  // Entity type selection
  if (hasAgent) {
    selectAgent(entity, uiContext);
    return true;
  }

  if (hasAnimal) {
    selectAnimal(entity, uiContext);
    return true;
  }

  if (hasPlant) {
    selectPlant(entity, uiContext);
    return true;
  }

  if (hasResource) {
    clearAllSelections(uiContext);
    return true;
  }

  return false;
}

// ============================================================================
// Main Handler
// ============================================================================

export function handleMouseClick(
  screenX: number,
  screenY: number,
  button: number,
  gameContext: GameContext,
  uiContext: UIContext
): boolean {
  const { gameLoop, canvas } = gameContext;
  const { placementUI, shopPanel } = uiContext;

  // Left click - window management and menu bar
  if (button === 0) {
    if (handleUIClick(screenX, screenY, uiContext)) {
      return true;
    }
  }

  // Placement UI
  if (placementUI.handleClick(screenX, screenY, button)) {
    return true;
  }

  // Shop panel (modal)
  if (shopPanel.isVisible()) {
    const rect = canvas.getBoundingClientRect();
    if (shopPanel.handleClick(screenX, screenY, gameLoop.world, rect.width, rect.height)) {
      return true;
    }
  }

  // Right click - select tile
  if (button === 2) {
    return handleRightClick(screenX, screenY, gameContext, uiContext);
  }

  // Left click - select entities
  if (button === 0) {
    return handleEntitySelection(screenX, screenY, gameContext, uiContext);
  }

  return false;
}
