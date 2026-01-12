/**
 * Game Setup - Shared initialization logic for all execution contexts
 *
 * This module provides unified game setup logic that works in:
 * - Browser windows (main.ts)
 * - SharedWorker (shared-universe-worker.ts)
 * - Node.js headless (headless.ts)
 *
 * Extracted from demo/headless.ts setupGameSystems function.
 */

import {
  GameLoop,
  registerAllSystems,
  registerDefaultMaterials,
  initializeDefaultRecipes,
  globalRecipeRegistry,
  registerDefaultResearch,
  SoilSystem,
  CraftingSystem,
  CookingSystem,
  TillActionHandler,
  PlantActionHandler,
  GatherSeedsActionHandler,
  HarvestActionHandler,
  LiveEntityAPI,
  TalkerPromptBuilder,
  ExecutorPromptBuilder,
  type SystemRegistrationResult,
  type MetricsCollectionSystem,
} from '@ai-village/core';

import type { LLMDecisionQueue } from '@ai-village/llm';
import type { StructuredPromptBuilder } from '@ai-village/llm';
import { getPlantSpecies } from '@ai-village/world';
import {
  PlantSystem,
  PlantDiscoverySystem,
  PlantDiseaseSystem,
  WildPlantPopulationSystem,
} from '@ai-village/botany';

export interface GameSetupConfig {
  /** Session ID for metrics and logging */
  sessionId: string;

  /** LLM queue for agent decision-making (optional - can be null for worker) */
  llmQueue?: LLMDecisionQueue | null;

  /** Prompt builder for LLM requests (optional - can be null for worker) */
  promptBuilder?: StructuredPromptBuilder | null;

  /** Metrics server WebSocket URL */
  metricsServerUrl?: string;

  /** Enable metrics collection */
  enableMetrics?: boolean;

  /** Enable auto-save (disable for headless/worker) */
  enableAutoSave?: boolean;
}

export interface GameSetupResult {
  soilSystem: SoilSystem;
  craftingSystem: CraftingSystem;
  systemRegistration: SystemRegistrationResult;
  metricsSystem: MetricsCollectionSystem | null;
}

/**
 * Set up all game systems with proper initialization
 *
 * This function handles the complete game setup process:
 * 1. Register materials, recipes, and research
 * 2. Register all game systems
 * 3. Configure individual systems
 * 4. Set up action handlers
 * 5. Wire up metrics and Live Entity API
 * 6. Initialize governance data
 *
 * Works in browser, worker, and Node.js contexts.
 */
export async function setupGameSystems(
  gameLoop: GameLoop,
  config: GameSetupConfig
): Promise<GameSetupResult> {
  console.log(`[GameSetup] Initializing game systems (session: ${config.sessionId})`);

  // 1. Register default materials and recipes before system registration
  registerDefaultMaterials();
  initializeDefaultRecipes(globalRecipeRegistry);
  registerDefaultResearch();

  // 2. Use centralized system registration
  const result = registerAllSystems(gameLoop, {
    llmQueue: config.llmQueue || undefined,
    promptBuilder: config.promptBuilder || undefined,
    gameSessionId: config.sessionId,
    metricsServerUrl: config.metricsServerUrl || 'ws://localhost:8765',
    enableMetrics: config.enableMetrics !== false,
    enableAutoSave: config.enableAutoSave !== false,
    plantSystems: {
      PlantSystem,
      PlantDiscoverySystem,
      PlantDiseaseSystem,
      WildPlantPopulationSystem,
    },
  });

  // 3. Set up plant species lookup (injected from world package)
  result.plantSystem.setSpeciesLookup(getPlantSpecies);

  // 4. Register action handlers (these are separate from systems)
  gameLoop.actionRegistry.register(new TillActionHandler(result.soilSystem));
  gameLoop.actionRegistry.register(new PlantActionHandler());
  gameLoop.actionRegistry.register(new GatherSeedsActionHandler());
  gameLoop.actionRegistry.register(new HarvestActionHandler());

  // 5. Set up crafting system with recipe registry
  const craftingSystem = new CraftingSystem();
  craftingSystem.setRecipeRegistry(globalRecipeRegistry);
  gameLoop.systemRegistry.register(craftingSystem);

  // 6. Set up cooking system with recipe registry
  const cookingSystem = new CookingSystem();
  cookingSystem.setRecipeRegistry(globalRecipeRegistry);
  // Note: CookingSystem is already registered by registerAllSystems,
  // but we need to configure it with the recipe registry

  // 7. Set up Live Entity API if metrics is enabled
  const metricsSystem = result.metricsSystem;
  if (metricsSystem && config.enableMetrics) {
    const streamClient = metricsSystem.getStreamClient();
    if (streamClient) {
      const liveEntityAPI = new LiveEntityAPI(gameLoop.world);
      if (config.promptBuilder) {
        liveEntityAPI.setPromptBuilder(config.promptBuilder);
      }
      // Wire up Talker and Executor prompt builders for inspection
      const talkerPromptBuilder = new TalkerPromptBuilder();
      const executorPromptBuilder = new ExecutorPromptBuilder();
      liveEntityAPI.setTalkerPromptBuilder(talkerPromptBuilder);
      liveEntityAPI.setExecutorPromptBuilder(executorPromptBuilder);
      liveEntityAPI.attach(streamClient);
      console.log('[GameSetup] Live Entity API attached');
    }
  }

  // 8. Initialize governance data system
  result.governanceDataSystem.initialize(gameLoop.world, gameLoop.world.eventBus);

  console.log('[GameSetup] All systems initialized successfully');

  return {
    soilSystem: result.soilSystem,
    craftingSystem,
    systemRegistration: result,
    metricsSystem: metricsSystem || null,
  };
}
