/**
 * Keyboard handler module - breaks down keyboard handling into focused functions
 * Refactored from main.ts to reduce cyclomatic complexity
 */
import {
  EntityImpl,
  createEntityId,
  createPositionComponent,
  createRenderableComponent,
  PlantComponent,
  queueBehavior,
} from '@ai-village/core';
import { getPlantSpecies } from '@ai-village/world';
import type { GameContext, UIContext } from './types.js';

type DayPhase = 'dawn' | 'day' | 'dusk' | 'night';

function calculatePhase(timeOfDay: number): DayPhase {
  if (timeOfDay >= 5 && timeOfDay < 7) return 'dawn';
  if (timeOfDay >= 7 && timeOfDay < 17) return 'day';
  if (timeOfDay >= 17 && timeOfDay < 19) return 'dusk';
  return 'night'; // 19:00-5:00
}

function calculateLightLevel(timeOfDay: number, phase: DayPhase): number {
  switch (phase) {
    case 'dawn': {
      const progress = (timeOfDay - 5) / 2;
      return 0.3 + (0.7 * progress);
    }
    case 'day':
      return 1.0;
    case 'dusk': {
      const progress = (timeOfDay - 17) / 2;
      return 1.0 - (0.9 * progress);
    }
    case 'night':
      return 0.1;
  }
}

// ============================================================================
// Individual Key Handlers
// ============================================================================

function handleEscape(
  uiContext: UIContext
): boolean {
  const { inventoryUI, windowManager } = uiContext;

  if (inventoryUI.isOpen()) {
    windowManager.hideWindow('inventory');
    return true;
  }
  windowManager.toggleWindow('settings');
  return true;
}

function handleWindowShortcuts(
  key: string,
  uiContext: UIContext
): boolean {
  const { windowManager } = uiContext;

  const windowShortcuts: Record<string, string> = {
    'r': 'resources', 'R': 'resources',
    'm': 'memory', 'M': 'memory',
    't': 'tile-inspector', 'T': 'tile-inspector',
    'h': 'help', 'H': 'controls',
    'e': 'economy', 'E': 'economy',
  };

  if (windowShortcuts[key]) {
    windowManager.toggleWindow(windowShortcuts[key]);
    return true;
  }
  return false;
}

function handleCraftingPanel(
  key: string,
  gameContext: GameContext,
  uiContext: UIContext
): boolean {
  if (key !== 'c' && key !== 'C') return false;

  const { windowManager, craftingUI, agentInfoPanel } = uiContext;

  windowManager.toggleWindow('crafting');
  const visible = windowManager.getWindow('crafting')?.visible ?? false;
  if (visible) {
    const selectedEntityId = agentInfoPanel.getSelectedEntityId();
    if (selectedEntityId) {
      craftingUI.setActiveAgent(selectedEntityId);
    }
  }
  return true;
}

function handleInventory(
  key: string,
  uiContext: UIContext
): boolean {
  if (key === 'i' || key === 'I' || key === 'Tab') {
    uiContext.windowManager.toggleWindow('inventory');
    return true;
  }
  return false;
}

function handleHelpPanel(
  key: string,
  uiContext: UIContext
): boolean {
  if (key === 'h' || key === 'H') {
    uiContext.windowManager.toggleWindow('controls');
    return true;
  }
  return false;
}

function handleTimeSkip(
  key: string,
  gameContext: GameContext
): boolean {
  const { gameLoop, showNotification } = gameContext;
  const timeEntities = gameLoop.world.query().with('time').executeEntities();
  const timeEntity = timeEntities.length > 0 ? timeEntities[0] as EntityImpl : null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const timeComp = timeEntity?.getComponent<any>('time');

  if (!timeComp || !timeEntity) return false;

  if (key === '1') {
    const newTime = (timeComp.timeOfDay + 1) % 24;
    const newPhase = calculatePhase(newTime);
    const newLightLevel = calculateLightLevel(newTime, newPhase);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (timeComp as any).timeOfDay = newTime;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (timeComp as any).phase = newPhase;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (timeComp as any).lightLevel = newLightLevel;
    showNotification(`⏩ Skipped 1 hour → ${Math.floor(newTime)}:00`, '#FFA500');
    return true;
  }

  if (key === '2') {
    const newDay = Math.floor((gameLoop.world.tick * 0.1) / timeComp.dayLength) + 1;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (gameLoop.world.eventBus as any).emit({
      type: 'time:day_changed',
      source: timeEntity.id,
      data: { day: newDay, newDay },
    });
    showNotification(`⏩ Skipped 1 day`, '#FF8C00');
    return true;
  }

  if (key === '3') {
    const baseDay = Math.floor((gameLoop.world.tick * 0.1) / timeComp.dayLength) + 1;
    for (let i = 0; i < 7; i++) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (gameLoop.world.eventBus as any).emit({
        type: 'time:day_changed',
        source: timeEntity.id,
        data: { day: baseDay + i, newDay: baseDay + i },
      });
    }
    showNotification(`⏩ Skipped 7 days`, '#FF4500');
    return true;
  }

  return false;
}

function handleSpeedControls(
  key: string,
  gameContext: GameContext
): boolean {
  const { gameLoop, showNotification } = gameContext;
  const timeEntities = gameLoop.world.query().with('time').executeEntities();
  const timeEntity = timeEntities.length > 0 ? timeEntities[0] as EntityImpl : null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const timeComp = timeEntity?.getComponent<any>('time');

  if (!timeComp || !timeEntity) return false;

  const speedSettings: Record<string, { multiplier: number; label: string }> = {
    '1': { multiplier: 1, label: '1x' },
    '2': { multiplier: 2, label: '2x' },
    '3': { multiplier: 4, label: '4x' },
    '4': { multiplier: 8, label: '8x' },
  };

  if (speedSettings[key]) {
    const { multiplier, label } = speedSettings[key];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    timeEntity.updateComponent('time', (current: any) => ({
      ...current,
      speedMultiplier: multiplier,
    }));
    showNotification(`⏱️ Time speed: ${label}`, '#00CED1');
    return true;
  }

  return false;
}

function handleDebugMemoryEvent(
  key: string,
  gameContext: GameContext,
  uiContext: UIContext
): boolean {
  if (key !== 'n' && key !== 'N') return false;

  const { gameLoop, showNotification } = gameContext;
  const { agentInfoPanel } = uiContext;

  const selectedEntityId = agentInfoPanel.getSelectedEntityId();
  if (!selectedEntityId) {
    showNotification(`⚠️ Select an agent first (click one)`, '#FFA500');
    return true;
  }

  const selectedEntity = gameLoop.world.getEntity(selectedEntityId);
  if (selectedEntity && selectedEntity.components.has('agent')) {
    // Use 'any' cast to emit test events that aren't in the typed EventMap
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (gameLoop.world.eventBus as any).emit({
      type: 'test:event',
      source: 'debug',
      data: {
        agentId: selectedEntity.id,
        summary: 'Test memory event triggered manually',
        emotionalIntensity: 0.8,
        novelty: 0.9,
        goalRelevance: 0.7,
        timestamp: Date.now(),
      },
    });
    showNotification(`🧠 Test memory event triggered`, '#9370DB');
  } else {
    showNotification(`⚠️ Select an agent first (click one)`, '#FFA500');
  }
  return true;
}

function handleDebugQueueBehaviors(
  key: string,
  gameContext: GameContext,
  uiContext: UIContext
): boolean {
  if (key !== 'q' && key !== 'Q') return false;

  const { gameLoop, showNotification } = gameContext;
  const { agentInfoPanel } = uiContext;

  const selectedEntityId = agentInfoPanel.getSelectedEntityId();
  if (!selectedEntityId) {
    showNotification(`⚠️ Select an agent first (click one)`, '#FFA500');
    return true;
  }

  const selectedEntity = gameLoop.world.getEntity(selectedEntityId);
  if (!selectedEntity || !selectedEntity.components.has('agent')) {
    showNotification(`⚠️ Please select an agent`, '#FFA500');
    return true;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const agent = selectedEntity.components.get('agent') as any;
  let updatedAgent = queueBehavior(agent, 'gather', { label: 'Gather resources', priority: 'normal' });
  updatedAgent = queueBehavior(updatedAgent, 'deposit_items', { label: 'Deposit at storage', priority: 'normal' });
  updatedAgent = queueBehavior(updatedAgent, 'till', { label: 'Till soil', priority: 'normal' });
  updatedAgent = queueBehavior(updatedAgent, 'farm', { label: 'Plant seeds', priority: 'normal', repeats: 3 });
  // Cast to any to allow mutation - the Entity interface has readonly components
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (selectedEntity.components as any).set('agent', updatedAgent);
  showNotification(`📋 Queued 4 test behaviors`, '#9370DB');

  return true;
}

function handleDebugSpawnPlant(
  key: string,
  gameContext: GameContext
): boolean {
  if (key !== 'p' && key !== 'P') return false;

  const { gameLoop, renderer, showNotification } = gameContext;

  const camera = renderer.getCamera();
  const spawnX = Math.round(camera.x / 16);
  const spawnY = Math.round(camera.y / 16);

  const testStages: Array<'mature' | 'seeding' | 'senescence'> = ['mature', 'seeding', 'senescence'];
  const stage = testStages[Math.floor(Math.random() * testStages.length)];
  const speciesId = 'blueberry-bush';
  const species = getPlantSpecies(speciesId);

  const yieldAmount = species.baseGenetics.yieldAmount;
  let initialSeeds = 0;
  if (stage === 'mature') {
    initialSeeds = Math.floor(species.seedsPerPlant * yieldAmount);
  } else if (stage === 'seeding') {
    initialSeeds = Math.floor(species.seedsPerPlant * yieldAmount * 2);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const plantEntity = new EntityImpl(createEntityId(), (gameLoop.world as any)._tick);
  const plantComponent = new PlantComponent({
    speciesId,
    position: { x: spawnX, y: spawnY },
    stage,
    age: stage === 'senescence' ? 60 : (stage === 'seeding' ? 50 : 40),
    generation: 0,
    health: 90,
    hydration: 70,
    nutrition: 60,
    genetics: { ...species.baseGenetics },
    seedsProduced: initialSeeds
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (plantComponent as any).entityId = plantEntity.id;

  plantEntity.addComponent(plantComponent);
  plantEntity.addComponent(createPositionComponent(spawnX, spawnY));
  plantEntity.addComponent(createRenderableComponent(speciesId, 'object'));
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (gameLoop.world as any)._addEntity(plantEntity);

  showNotification(`🌱 Spawned ${species.name} (${stage})`, '#32CD32');
  return true;
}

function handleTileActions(
  key: string,
  shiftKey: boolean,
  gameContext: GameContext,
  uiContext: UIContext
): boolean {
  const { gameLoop } = gameContext;
  const { tileInspectorPanel } = uiContext;

  const selectedTile = tileInspectorPanel.getSelectedTile();
  if (!selectedTile) return false;

  const { tile, x, y } = selectedTile;

  if ((key === 'w' || key === 'W') && !shiftKey) {
    if (tile.moisture < 100) {
      gameLoop.world.eventBus.emit({ type: 'action:water', source: 'ui', data: { x, y } });
      return true;
    }
  }

  if (key === 'f' || key === 'F') {
    if (tile.fertility < 100) {
      gameLoop.world.eventBus.emit({
        type: 'action:fertilize',
        source: 'ui',
        data: { x, y, fertilizerType: 'compost' }
      });
      return true;
    }
  }

  return false;
}

// ============================================================================
// Main Handler - Dispatches to focused handlers
// ============================================================================

export function handleKeyDown(
  key: string,
  shiftKey: boolean,
  ctrlKey: boolean,
  gameContext: GameContext,
  uiContext: UIContext
): boolean {
  const { keyboardRegistry, placementUI } = uiContext;

  // Check keyboard registry first
  if (keyboardRegistry.handleKey(key, shiftKey, ctrlKey)) {
    return true;
  }

  // ESC handling
  if (key === 'Escape') {
    return handleEscape(uiContext);
  }

  // Window toggle shortcuts
  if (handleWindowShortcuts(key, uiContext)) {
    return true;
  }

  // Crafting panel
  if (handleCraftingPanel(key, gameContext, uiContext)) {
    return true;
  }

  // Inventory
  if (handleInventory(key, uiContext)) {
    return true;
  }

  // Help panel
  if (handleHelpPanel(key, uiContext)) {
    return true;
  }

  // Check placement UI
  if (placementUI.handleKeyDown(key, shiftKey)) {
    return true;
  }

  // Time controls
  if (shiftKey) {
    if (handleTimeSkip(key, gameContext)) {
      return true;
    }
  } else {
    if (handleSpeedControls(key, gameContext)) {
      return true;
    }
  }

  // Debug keys
  if (handleDebugMemoryEvent(key, gameContext, uiContext)) {
    return true;
  }

  if (handleDebugQueueBehaviors(key, gameContext, uiContext)) {
    return true;
  }

  if (handleDebugSpawnPlant(key, gameContext)) {
    return true;
  }

  // Tile actions
  if (handleTileActions(key, shiftKey, gameContext, uiContext)) {
    return true;
  }

  return false;
}
