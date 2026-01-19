import {
  GameLoop,
  BuildingBlueprintRegistry,
  PlacementValidator,
  SoilSystem,
  PlantComponent,
  WildAnimalSpawningSystem,
  TillActionHandler,
  PlantActionHandler,
  GatherSeedsActionHandler,
  HarvestActionHandler,
  CraftActionHandler,
  TradeActionHandler,
  GoToActionHandler,
  createTimeComponent,
  createResearchStateComponent,
  FERTILIZERS,
  createBuildingComponent,
  createPositionComponent,
  createRenderableComponent,
  createAnimationComponent,
  createWeatherComponent,
  createInventoryComponent,
  createNamedLandmarksComponent,
  createProtoRealityComponent,
  EntityImpl,
  createEntityId,
  type World,
  type WorldMutator,
  // Crafting systems (Phase 10)
  CraftingSystem,
  initializeDefaultRecipes,
  globalRecipeRegistry,
  // Skill systems (Phase 4 unified)
  CookingSystem,
  ExperimentationSystem,
  // Phase 13: Research & Discovery
  registerDefaultResearch,
  // Metrics Collection System (with streaming support)
  MetricsCollectionSystem,
  // Governance Data System (Phase 11)
  GovernanceDataSystem,
  // Auto-save & Time Travel
  checkpointNamingService,
  snapshotDecayPolicy,
  toSnapshotInfo,
  // Centralized system registration
  registerAllSystems as coreRegisterAllSystems,
  type SystemRegistrationResult as CoreSystemResult,
  type PlantSystemsConfig,
  // Soul creation system
  SoulCreationSystem,
  createSoulLinkComponent,
  type SoulCreationContext,
  type IncarnationComponent,
  // Divine configuration
  createUniverseConfig,
  // Tile-based buildings
  getTileBasedBlueprintRegistry,
  getTileConstructionSystem,
  BuildingType,
  // Microgenerators - God-crafted content discovery
  GodCraftedDiscoverySystem,
  // Agent debug logging
  AgentDebugManager,
  // Chunk spatial query injection functions
  // Injection functions removed - use world.spatialQuery instead
} from '@ai-village/core';
import { saveLoadService, IndexedDBStorage, migrateLocalSaves, checkMigrationStatus } from '@ai-village/persistence';
import { LiveEntityAPI } from '@ai-village/metrics';
import { SpellRegistry } from '@ai-village/magic';
import { GameIntrospectionAPI, ComponentRegistry, MutationService } from '@ai-village/introspection';
// Injection function removed - use world.spatialQuery instead
// Plant systems from @ai-village/botany (completes the extraction from core)
import {
  PlantSystem as BotanyPlantSystem,
  PlantDiscoverySystem as BotanyPlantDiscoverySystem,
  PlantDiseaseSystem as BotanyPlantDiseaseSystem,
  WildPlantPopulationSystem as BotanyWildPlantPopulationSystem,
} from '@ai-village/botany';
import {
  Renderer,
  InputHandler,
  KeyboardRegistry,
  BuildingPlacementUI,
  AgentInfoPanel,
  AgentRosterPanel,
  ResearchLibraryPanel,
  TechTreePanel,
  AnimalInfoPanel,
  AnimalRosterPanel,
  TileInspectorPanel,
  PlantInfoPanel,
  ResourcesPanel,
  CityManagerPanel,
  CityStatsWidget,
  SettingsPanel,
  MemoryPanel,
  RelationshipsPanel,
  NotificationsPanel,
  SoulCeremonyModal,
  InventoryUI,
  CraftingPanelUI,
  ControlsPanel,
  TimeControlsPanel,
  UniverseManagerPanel,
  UnifiedHoverInfoPanel,
  PlayerControlHUD,
  AgentSelectionPanel,
  EconomyPanel,
  WindowManager,
  MenuBar,
  // Panel adapter factory functions
  createAgentInfoPanelAdapter,
  createAnimalInfoPanelAdapter,
  createPlantInfoPanelAdapter,
  createMemoryPanelAdapter,
  createRelationshipsPanelAdapter,
  createResourcesPanelAdapter,
  createSettingsPanelAdapter,
  createTileInspectorPanelAdapter,
  createInventoryPanelAdapter,
  createCraftingPanelAdapter,
  createNotificationsPanelAdapter,
  createEconomyPanelAdapter,
  ShopPanel,
  createShopPanelAdapter,
  GovernanceDashboardPanel,
  TimelinePanel,
  UniverseConfigScreen,
  UniverseBrowserScreen,
  type UniverseBrowserResult,
  SCENARIO_PRESETS,
  type UniverseConfig,
  createGovernanceDashboardPanelAdapter,
  // Magic and Divine panels
  DivinePowersPanel,
  createDivinePowersPanelAdapter,
  DivineChatPanel,
  createDivineChatPanelAdapter,
  VisionComposerPanel,
  createVisionComposerPanelAdapter,
  MagicSystemsPanel,
  createMagicSystemsPanelAdapter,
  SpellbookPanel,
  createSpellbookPanelAdapter,
  SkillTreePanel,
  createSkillTreePanelAdapter,
  DevPanel,
  createDevPanelAdapter,
  // Additional Divine panels
  DivineAnalyticsPanel,
  createDivineAnalyticsPanelAdapter,
  SacredGeographyPanel,
  createSacredGeographyPanelAdapter,
  AngelManagementPanel,
  createAngelManagementPanelAdapter,
  PrayerPanel,
  createPrayerPanelAdapter,
  // LLM Config
  LLMConfigPanel,
  createLLMConfigPanelAdapter,
  // Text Adventure Panel (1D Renderer)
  TextAdventurePanel,
  createTextAdventurePanelAdapter,
  createTextAdventurePanel,
  // Dev Actions Service
  devActionsService,
} from '@ai-village/renderer';
import {
  OllamaProvider,
  OpenAICompatProvider,
  ProxyLLMProvider,
  FallbackProvider,
  LLMDecisionQueue,
  StructuredPromptBuilder,
  TalkerPromptBuilder,
  ExecutorPromptBuilder,
  promptLogger,
  type LLMProvider,
} from '@ai-village/llm';
import { TerrainGenerator, ChunkManager, createBerryBush, getPlantSpecies, ChunkSpatialQuery } from '@ai-village/world';
import { createLLMAgent, createWanderingAgent } from '@ai-village/agents';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

type DayPhase = 'dawn' | 'day' | 'dusk' | 'night';

interface GameContext {
  gameLoop: GameLoop;
  renderer: Renderer;
  canvas: HTMLCanvasElement;
  chunkManager: ChunkManager;
  terrainGenerator: TerrainGenerator;
  showNotification: (message: string, color?: string) => void;
}

interface UIContext {
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
  cityStatsWidget: CityStatsWidget;
  inventoryUI: InventoryUI;
  craftingUI: CraftingPanelUI;
  placementUI: BuildingPlacementUI;
  windowManager: WindowManager;
  menuBar: MenuBar;
  keyboardRegistry: KeyboardRegistry;
  hoverInfoPanel: UnifiedHoverInfoPanel;
  skillTreePanel: SkillTreePanel;
  divineChatPanel: DivineChatPanel;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

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
// ENTITY CREATION FUNCTIONS
// ============================================================================

function createInitialBuildings(world: WorldMutator) {
  // Create a completed campfire (provides warmth)
  // Uses PixelLab animated sprite with breathing-idle animation
  const campfireEntity = new EntityImpl(createEntityId(), (world as any)._tick);
  campfireEntity.addComponent(createBuildingComponent('campfire', 1, 100));
  campfireEntity.addComponent(createPositionComponent(-3, -3));
  campfireEntity.addComponent(createRenderableComponent('campfire', 'object'));
  // Animation is handled by SpriteRenderer.tryRenderAnimatedCampfire()
  (world as any)._addEntity(campfireEntity);

  // Create a completed tent (provides shelter)
  const tentEntity = new EntityImpl(createEntityId(), (world as any)._tick);
  tentEntity.addComponent(createBuildingComponent('tent', 1, 100));
  tentEntity.addComponent(createPositionComponent(3, -3));
  tentEntity.addComponent(createRenderableComponent('tent', 'object'));
  (world as any)._addEntity(tentEntity);

  // Create a completed storage-chest for agents to deposit items
  const storageEntity = new EntityImpl(createEntityId(), (world as any)._tick);
  storageEntity.addComponent(createBuildingComponent('storage-chest', 1, 100));
  storageEntity.addComponent(createPositionComponent(0, -5));
  storageEntity.addComponent(createRenderableComponent('storage-chest', 'object'));
  const storageInventory = createInventoryComponent(20, 500);
  storageInventory.slots[0] = { itemId: 'wood', quantity: 50 };
  storageEntity.addComponent(storageInventory);
  (world as any)._addEntity(storageEntity);

  // Create a building under construction (50% complete)
  const constructionEntity = new EntityImpl(createEntityId(), (world as any)._tick);
  constructionEntity.addComponent(createBuildingComponent('storage-box', 1, 50));
  constructionEntity.addComponent(createPositionComponent(-8, 0));
  constructionEntity.addComponent(createRenderableComponent('storage-box', 'object'));
  constructionEntity.addComponent(createInventoryComponent(10, 200));
  (world as any)._addEntity(constructionEntity);
}

function createInitialAgents(world: WorldMutator, dungeonMasterPrompt?: string): string[] {
  const agentCount = 5;
  const centerX = 0;
  const centerY = 0;
  const spread = 2;

  const agentIds: string[] = [];

  for (let i = 0; i < agentCount; i++) {
    const offsetX = (i % 3) - 1;
    const offsetY = Math.floor(i / 3) - 0.5;
    const x = centerX + offsetX * spread + Math.random() * 0.5;
    const y = centerY + offsetY * spread + Math.random() * 0.5;

    const agentId = createLLMAgent(world, x, y, 2.0, dungeonMasterPrompt);
    agentIds.push(agentId);
  }

  // Choose one random agent to be the leader
  const leaderIndex = Math.floor(Math.random() * agentIds.length);
  const leaderId = agentIds[leaderIndex];
  const leaderEntity = world.getEntity(leaderId);

  if (leaderEntity) {
    const currentPersonality = leaderEntity.getComponent('personality') as any;
    if (currentPersonality) {
      leaderEntity.updateComponent('personality', (p: any) => ({
        ...p,
        leadership: 0.95,
        extraversion: Math.max(p.extraversion, 0.75),
        conscientiousness: Math.max(p.conscientiousness, 0.70),
      }));
    }
  }

  // Note: Spirituality is now determined by the Fates during soul creation
  // Agents with 'mystic' archetype or spiritual interests will have high spirituality
  // This replaces the previous random assignment

  return agentIds;
}

/**
 * Create souls for initial agents (adults spawned at game start)
 * These are not newborns, but mature individuals who need souls appropriate for their age
 * Shows ceremonies one at a time in a modal before the game starts
 */
async function createSoulsForInitialAgents(
  gameLoop: GameLoop,
  agentIds: string[],
  llmProvider: LLMProvider,
  renderer: any,
  universeConfig: UniverseConfig | null,
  isLLMAvailable: boolean
): Promise<void> {
  const soulSystem = gameLoop.systemRegistry.get('soul_creation') as SoulCreationSystem;
  if (!soulSystem) {
    console.warn('[Demo] SoulCreationSystem not found, skipping soul creation');
    return;
  }

  // If LLM is unavailable, skip soul creation ceremony entirely
  if (!isLLMAvailable) {
    console.warn('[Demo] LLM unavailable - skipping soul creation ceremony');
    console.warn('[Demo] Game will start with soulless agents (souls can be created later)');
    return;
  }

  // Set the LLM provider for the Fates to use
  soulSystem.setLLMProvider(llmProvider);


  // Create modal to display ceremonies
  const ceremonyModal = new SoulCeremonyModal();

  // Create agent cards to show each created agent
  const { AgentCreationCards } = await import('@ai-village/renderer');
  const agentCards = new AgentCreationCards(renderer.pixelLabLoader);
  agentCards.show();

  // Create souls ONE AT A TIME (sequentially) so we can display each ceremony
  // No timeout - wait indefinitely for ceremony completion (loading animation will be added later)

  for (let index = 0; index < agentIds.length; index++) {
    const agentId = agentIds[index]!;
    const agent = gameLoop.world.getEntity(agentId);
    if (!agent) continue;

    const identity = agent.components.get('identity') as any;
    const name = identity?.name ?? 'Unknown';


    // Wait for this soul to be created before starting the next
    // Add 30-second timeout to prevent hanging
    const ceremonyPromise = new Promise<void>((resolve, reject) => {
      let resolved = false;
      let currentCeremonyData: any = null;

      // Subscribe to ceremony events for this soul
      const startSub = gameLoop.world.eventBus.subscribe('soul:ceremony_started', (event: any) => {
        currentCeremonyData = event.data;
        ceremonyModal.startCeremony({
          culture: event.data.context.culture,
          cosmicAlignment: event.data.context.cosmicAlignment,
          isReforging: event.data.context.isReforging,
          previousWisdom: event.data.context.previousWisdom,
          previousLives: event.data.context.previousLives,
        });
      });

      const thinkingSub = gameLoop.world.eventBus.subscribe('soul:fate_thinking', (event: any) => {
        ceremonyModal.setThinking(event.data.speaker);
      });

      const speakSub = gameLoop.world.eventBus.subscribe('soul:fate_speaks', (event: any) => {
        ceremonyModal.addSpeech(event.data.speaker, event.data.text, event.data.topic);
      });

      const completeSub = gameLoop.world.eventBus.subscribe('soul:ceremony_complete', (event: any) => {

        // Add agent card immediately when ceremony completes
        const appearance = agent.components.get('appearance') as any;
        const spriteFolder = appearance?.spriteFolder || 'villager';
        agentCards.addAgentCard({
          agentId,
          name,
          purpose: event.data.purpose,
          archetype: event.data.archetype,
          interests: event.data.interests,
          spriteFolder,
        });

        // Send soul to server repository for persistence
        fetch('http://localhost:3001/api/save-soul', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            soulId: event.data.soulId,
            agentId: event.data.agentId || event.data.soulId,
            name: event.data.name,
            species: event.data.species,
            archetype: event.data.archetype,
            purpose: event.data.purpose,
            interests: event.data.interests,
            soulBirthTick: gameLoop.world.tick,
          })
        }).then(res => res.json()).then(result => {
          console.log('[Soul Repository] Saved soul to server:', result);
        }).catch(err => {
          console.warn('[Soul Repository] Failed to save soul to server:', err);
        });

        // Get first memory from universe scenario (not from ceremony transcript!)
        let firstMemory: string | undefined;
        if (universeConfig) {
          const scenario = SCENARIO_PRESETS.find(s => s.id === universeConfig.scenarioPresetId);
          firstMemory = scenario?.description || universeConfig.customScenarioText;
        }

        // Get soul sprite folder and reincarnation count
        const spriteFolderId = appearance?.spriteFolderId || appearance?.spriteFolder;
        const soulEntity = gameLoop.world.getEntity(event.data.soulId);
        const soulIdentity = soulEntity?.components.get('soul_identity') as any;
        const reincarnationCount = soulIdentity?.incarnationHistory?.length || 1;

        ceremonyModal.completeCeremony(
          event.data.purpose,
          event.data.interests,
          event.data.destiny,
          event.data.archetype,
          name,  // Pass the agent's name for personalized title
          firstMemory,  // First memory from the Fates
          () => {
            // User accepted this soul - clean up and continue
            if (!resolved) {
              resolved = true;
              startSub();  // Unsubscribe is the function itself
              thinkingSub();
              speakSub();
              completeSub();
              ceremonyModal.hide();

              // Link soul to agent
              const soulLink = createSoulLinkComponent(event.data.soulId, gameLoop.world.tick, true);
              (agent as any).addComponent(soulLink);

              // Update agent's spirituality based on the Fates' decision (archetype/interests)
              // Mystic archetype or spiritual interests = high spirituality
              const isMystic = event.data.archetype === 'mystic';
              const hasSpiritualInterests = (event.data.interests as string[])?.some(
                (i: string) => ['spirituality', 'divinity', 'faith', 'religion', 'prayer'].includes(i.toLowerCase())
              );
              if (isMystic || hasSpiritualInterests) {
                const spiritual = agent.components.get('spiritual') as any;
                if (spiritual) {
                  spiritual.spirituality = isMystic ? 0.95 : 0.8;
                }
              }

              // Update soul's incarnation status
              const soulEntity = gameLoop.world.getEntity(event.data.soulId);
              if (soulEntity) {
                const incarnation = soulEntity.components.get('incarnation') as IncarnationComponent | undefined;
                if (incarnation) {
                  incarnation.currentBindings.push({
                    targetId: agentId,
                    bindingType: 'incarnated',
                    bindingStrength: 1.0,
                    createdTick: gameLoop.world.tick,
                    isPrimary: true,
                  });
                  incarnation.state = 'incarnated';
                  incarnation.primaryBindingId = agentId;
                }
              }

              resolve();
            }
          },
          () => {
            // User rejected this soul - regenerate a new one

            // Hide modal and reset state
            ceremonyModal.hide();
            startSub();
            thinkingSub();
            speakSub();
            completeSub();

            // Trigger a new soul creation ceremony
            // This will loop back and create a new ceremony for the same agent
            const context: SoulCreationContext = {
              culture: 'The First Village',
              cosmicAlignment: 0.5 + (Math.random() - 0.5) * 0.3,
              isReforging: false,
              ceremonyRealm: 'tapestry_of_fate',
              worldEvents: ['The first village is being founded'],
            };

            // Re-request soul creation with same agent
            soulSystem.requestSoulCreation(context, (newSoulId: string) => {
              // New ceremony will fire events and re-trigger this handler
            });
          },
          spriteFolderId,
          reincarnationCount
        );
      });

      // Context for adult soul creation (not a newborn)
      const context: SoulCreationContext = {
        culture: 'The First Village',
        cosmicAlignment: 0.5 + (Math.random() - 0.5) * 0.3, // Slightly positive alignment
        isReforging: false,
        ceremonyRealm: 'tapestry_of_fate',
        worldEvents: ['The first village is being founded'],
      };

      // Request soul creation
      soulSystem.requestSoulCreation(context, (soulEntityId: string) => {
        // Soul creation callback - the ceremony events will handle the rest
      });
    });

    // Add timeout to ceremony
    const timeoutPromise = new Promise<void>((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Soul ceremony for ${name} timed out after 30 seconds`));
      }, 30000);
    });

    try {
      await Promise.race([ceremonyPromise, timeoutPromise]);
    } catch (error) {
      console.error(`[Demo] Soul ceremony failed for ${name}:`, error);
      console.warn(`[Demo] Skipping soul for ${name} and continuing...`);
      // Continue to next agent even if this one fails
    }
  }


  // Cards stay visible - no auto-hide
}

async function createPlayerDeity(world: WorldMutator): Promise<string> {
  const { DeityComponent, createTagsComponent } = await import('@ai-village/core');

  const deityEntity = new EntityImpl(createEntityId(), world.tick);

  // Position (deities exist everywhere, but we need position for ECS)
  deityEntity.addComponent(createPositionComponent(0, 0));

  // Tags
  deityEntity.addComponent(createTagsComponent('deity', 'player_god'));

  // Deity component - starts blank, will be defined by believers
  const deityComp = new DeityComponent('The Nameless', 'player');

  // Give starting belief so player can use divine powers immediately
  // Powers cost: whisper (5), dream_hint (10), clear_vision (50), bless (75), miracle (100)
  deityComp.addBelief(500, world.tick); // Enough for several powers

  deityEntity.addComponent(deityComp);

  // Add to world
  (world as any)._addEntity(deityEntity);

  return deityEntity.id;
}

async function createInitialPlants(world: WorldMutator) {
  const { PlantComponent } = await import('@ai-village/core');
  const { getWildSpawnableSpecies } = await import('@ai-village/world');

  const wildSpecies = getWildSpawnableSpecies();
  const plantCount = 25;

  for (let i = 0; i < plantCount; i++) {
    const x = -15 + Math.random() * 30;
    const y = -15 + Math.random() * 30;
    const species = wildSpecies[Math.floor(Math.random() * wildSpecies.length)];
    const isEdibleSpecies = species.id === 'blueberry-bush' || species.id === 'raspberry-bush' || species.id === 'blackberry-bush';

    let stage: 'sprout' | 'vegetative' | 'mature' | 'seeding';
    let stageProgress = 0;
    let age = 20;

    if (i < 5) {
      if (i < 2) {
        stage = 'seeding';
        age = 25;
        stageProgress = 0.3;
      } else {
        stage = 'mature';
        age = 20;
        stageProgress = 0.9;
      }
    } else if (isEdibleSpecies) {
      stage = 'mature';
      age = 20;
      stageProgress = 0;
    } else {
      const stages: Array<'sprout' | 'vegetative' | 'mature'> = ['sprout', 'vegetative', 'vegetative', 'mature', 'mature'];
      stage = stages[Math.floor(Math.random() * stages.length)] as any;
      age = stage === 'mature' ? 20 : (stage === 'vegetative' ? 10 : 5);
      stageProgress = 0;
    }

    const yieldAmount = species.baseGenetics.yieldAmount;
    const initialSeeds = stage === 'seeding'
      ? Math.floor(species.seedsPerPlant * yieldAmount * 2)
      : (stage === 'mature' ? Math.floor(species.seedsPerPlant * yieldAmount) : 0);

    const initialFruit = (stage === 'mature' && isEdibleSpecies)
      ? 6 + Math.floor(Math.random() * 7)
      : 0;

    const plantEntity = new EntityImpl(createEntityId(), (world as any)._tick);
    const plantComponent = new PlantComponent({
      speciesId: species.id,
      position: { x, y },
      stage,
      stageProgress,
      age,
      generation: 0,
      health: 80 + Math.random() * 20,
      hydration: 50 + Math.random() * 30,
      nutrition: 50 + Math.random() * 30,
      genetics: { ...species.baseGenetics },
      seedsProduced: initialSeeds,
      fruitCount: initialFruit
    });

    (plantComponent as any).entityId = plantEntity.id;

    plantEntity.addComponent(plantComponent);
    plantEntity.addComponent(createPositionComponent(x, y));
    plantEntity.addComponent(createRenderableComponent(species.id, 'plant'));
    (world as any)._addEntity(plantEntity);
  }
}

async function createInitialAnimals(world: WorldMutator, spawningSystem: WildAnimalSpawningSystem) {
  const animalsToSpawn = [
    { species: 'chicken', position: { x: 3, y: 2 } },
    { species: 'sheep_white', position: { x: -4, y: 3 } },
    { species: 'rabbit', position: { x: 5, y: -2 } },
    { species: 'rabbit', position: { x: -3, y: -4 } },
  ];

  for (const animalData of animalsToSpawn) {
    try {
      spawningSystem.spawnSpecificAnimal(world, animalData.species, animalData.position);
    } catch (error) {
      console.error(`Failed to spawn ${animalData.species}:`, error);
    }
  }
}

// ============================================================================
// SYSTEM REGISTRATION
// ============================================================================

interface SystemRegistrationResult {
  soilSystem: SoilSystem;
  craftingSystem: CraftingSystem;
  wildAnimalSpawning: WildAnimalSpawningSystem;
  governanceDataSystem: GovernanceDataSystem;
  metricsSystem: MetricsCollectionSystem;
  promptBuilder: StructuredPromptBuilder | null;
  coreResult: CoreSystemResult;
  chunkLoadingSystem?: CoreSystemResult['chunkLoadingSystem'];
}

async function registerAllSystems(
  gameLoop: GameLoop,
  llmQueue: LLMDecisionQueue | null,
  promptBuilder: StructuredPromptBuilder | null,
  agentDebugManager: AgentDebugManager,
  talkerPromptBuilder: TalkerPromptBuilder | null = null,
  executorPromptBuilder: ExecutorPromptBuilder | null = null,
  chunkManager?: ChunkManager,
  terrainGenerator?: TerrainGenerator
): Promise<SystemRegistrationResult> {
  // Register default materials and recipes before system registration
  const { registerDefaultMaterials } = await import('@ai-village/core');
  registerDefaultMaterials();
  initializeDefaultRecipes(globalRecipeRegistry);
  registerDefaultResearch();

  // Generate session ID for metrics
  const gameSessionId = `game_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

  // Create LLMScheduler and ScheduledDecisionProcessor if LLM is available
  let scheduledProcessor: import('@ai-village/core').ScheduledDecisionProcessor | null = null;
  let scheduler: import('@ai-village/llm').LLMScheduler | null = null;
  if (llmQueue) {
    const { LLMScheduler } = await import('@ai-village/llm');
    const { ScheduledDecisionProcessor } = await import('@ai-village/core');

    scheduler = new LLMScheduler(llmQueue);
    scheduledProcessor = new ScheduledDecisionProcessor(scheduler, llmQueue);

    console.log('[Main] Created LLMScheduler with intelligent layer selection (queue+poll pattern)');
    console.log('[Main] Layer cooldowns - Autonomic: 1s, Talker: 5s, Executor: 10s');
  }

  // Use centralized system registration from @ai-village/core
  // Pass plant systems from @ai-village/botany (completes package extraction)
  const plantSystems: PlantSystemsConfig = {
    PlantSystem: BotanyPlantSystem,
    PlantDiscoverySystem: BotanyPlantDiscoverySystem,
    PlantDiseaseSystem: BotanyPlantDiseaseSystem,
    WildPlantPopulationSystem: BotanyWildPlantPopulationSystem,
  };
  const coreResult = coreRegisterAllSystems(gameLoop, {
    llmQueue: llmQueue || undefined,
    promptBuilder: promptBuilder || undefined,
    scheduledProcessor: scheduledProcessor || undefined,
    gameSessionId,
    metricsServerUrl: 'ws://localhost:8765',
    enableMetrics: true,
    enableAutoSave: true,
    plantSystems,
    chunkManager,
    terrainGenerator,
  });

  // Set up plant species lookup (injected from @ai-village/world)
  const { getPlantSpecies } = await import('@ai-village/world');
  coreResult.plantSystem.setSpeciesLookup(getPlantSpecies);

  // Register action handlers (these are separate from systems)
  gameLoop.actionRegistry.register(new TillActionHandler(coreResult.soilSystem));
  gameLoop.actionRegistry.register(new PlantActionHandler());
  gameLoop.actionRegistry.register(new GatherSeedsActionHandler());
  gameLoop.actionRegistry.register(new HarvestActionHandler());
  gameLoop.actionRegistry.register(new CraftActionHandler());
  gameLoop.actionRegistry.register(new TradeActionHandler());
  gameLoop.actionRegistry.register(new GoToActionHandler());

  // Set up crafting system with recipe registry
  const craftingSystem = new CraftingSystem();
  craftingSystem.setRecipeRegistry(globalRecipeRegistry);
  gameLoop.systemRegistry.register(craftingSystem);
  gameLoop.world.setCraftingSystem(craftingSystem);

  // Set up cooking system with recipe registry
  const cookingSystem = new CookingSystem();
  cookingSystem.setRecipeRegistry(globalRecipeRegistry);
  // Note: CookingSystem is already registered by coreRegisterAllSystems,
  // but we need to configure it with the recipe registry

  // Set up experimentation system with recipe registry
  const experimentationSystem = gameLoop.systemRegistry.get('experimentation');
  if (experimentationSystem instanceof ExperimentationSystem) {
    experimentationSystem.setRecipeRegistry(globalRecipeRegistry);
  }

  // Set up world references for external access
  (gameLoop.world as any).marketEventSystem = coreResult.marketEventSystem;

  // Set up Live Entity API if metrics is enabled
  const metricsSystem = coreResult.metricsSystem;
  if (metricsSystem) {
    const streamClient = metricsSystem.getStreamClient();
    if (streamClient) {
      const liveEntityAPI = new LiveEntityAPI(gameLoop.world);
      if (promptBuilder) {
        liveEntityAPI.setPromptBuilder(promptBuilder);
      }
      // Wire up Talker and Executor prompt builders for inspection
      if (talkerPromptBuilder) {
        liveEntityAPI.setTalkerPromptBuilder(talkerPromptBuilder);
      }
      if (executorPromptBuilder) {
        liveEntityAPI.setExecutorPromptBuilder(executorPromptBuilder);
      }
      // Wire up scheduler for metrics queries and DevPanel
      if (scheduler) {
        liveEntityAPI.setScheduler(scheduler);
        // devPanel may not exist yet - it's created in setupWindowManager after registerAllSystems
        if (devPanel) {
          devPanel.setScheduler(scheduler);
        }
      }
      liveEntityAPI.setAgentDebugManager(agentDebugManager);
      liveEntityAPI.attach(streamClient);

      // Set up Game Introspection API for runtime entity introspection
      const gameIntrospectionAPI = new GameIntrospectionAPI(
        gameLoop.world,
        ComponentRegistry,
        MutationService,
        null, // metricsAPI - not needed for Phase 1
        liveEntityAPI
      );
      gameIntrospectionAPI.attach(streamClient);

      // Store on world for setupDebugAPI access
      (gameLoop.world as any).__introspectionAPI = gameIntrospectionAPI;
    }
  }

  // Initialize governance data system
  coreResult.governanceDataSystem.initialize(gameLoop.world, gameLoop.world.eventBus);


  return {
    soilSystem: coreResult.soilSystem,
    craftingSystem,
    wildAnimalSpawning: coreResult.wildAnimalSpawning,
    governanceDataSystem: coreResult.governanceDataSystem,
    metricsSystem: metricsSystem!,
    promptBuilder,
    coreResult,
    chunkLoadingSystem: coreResult.chunkLoadingSystem,
  };
}

// ============================================================================
// UI PANEL CREATION
// ============================================================================

interface UIPanelsResult {
  agentInfoPanel: AgentInfoPanel;
  agentRosterPanel: AgentRosterPanel;
  animalInfoPanel: AnimalInfoPanel;
  animalRosterPanel: AnimalRosterPanel;
  plantInfoPanel: PlantInfoPanel;
  resourcesPanel: ResourcesPanel;
  memoryPanel: MemoryPanel;
  relationshipsPanel: RelationshipsPanel;
  notificationsPanel: NotificationsPanel;
  economyPanel: EconomyPanel;
  shopPanel: ShopPanel;
  governancePanel: GovernanceDashboardPanel;
  cityManagerPanel: CityManagerPanel;
  cityStatsWidget: CityStatsWidget;
  inventoryUI: InventoryUI;
  craftingUI: CraftingPanelUI;
  settingsPanel: SettingsPanel;
  tileInspectorPanel: TileInspectorPanel;
  controlsPanel: ControlsPanel;
  hoverInfoPanel: UnifiedHoverInfoPanel;
}

function createUIPanels(
  gameLoop: GameLoop,
  canvas: HTMLCanvasElement,
  renderer: Renderer,
  chunkManager: ChunkManager,
  terrainGenerator: TerrainGenerator,
  craftingSystem: CraftingSystem,
  showNotification: (message: string, color?: string) => void,
  settingsPanel: SettingsPanel
): UIPanelsResult {
  const agentInfoPanel = new AgentInfoPanel();

  // Set up reset priorities callback
  agentInfoPanel.setOnResetPriorities((entityId: string) => {
    const entity = gameLoop.world.getEntity(entityId);
    if (!entity) {
      console.warn('[Main] Cannot reset priorities: entity not found', entityId);
      return;
    }

    const entityImpl = entity as EntityImpl;
    const agent = entityImpl.getComponent('agent');
    if (!agent) {
      console.warn('[Main] Cannot reset priorities: no agent component', entityId);
      return;
    }

    entityImpl.updateComponent('agent', (current: any) => ({
      ...current,
      priorities: {
        gathering: 0.2,
        building: 0.2,
        farming: 0.2,
        social: 0.2,
        exploration: 0.2,
        rest: 0.2,
      },
    }));
  });

  // Set up navigation target callback
  agentInfoPanel.setOnNavigateTo((x: number, y: number) => {
    // Convert tile coordinates to world pixels
    const tileSize = renderer.tileSize;
    const worldX = x * tileSize + tileSize / 2;
    const worldY = y * tileSize + tileSize / 2;
    renderer.camera.setPosition(worldX, worldY);
  });

  const agentRosterPanel = new AgentRosterPanel(renderer.pixelLabLoader);

  const animalInfoPanel = new AnimalInfoPanel();
  const animalRosterPanel = new AnimalRosterPanel(renderer.pixelLabLoader);
  const plantInfoPanel = new PlantInfoPanel();
  const resourcesPanel = new ResourcesPanel();
  const memoryPanel = new MemoryPanel();
  const relationshipsPanel = new RelationshipsPanel();
  const notificationsPanel = new NotificationsPanel();
  const economyPanel = new EconomyPanel();
  const shopPanel = new ShopPanel();
  const governancePanel = new GovernanceDashboardPanel();
  const cityManagerPanel = new CityManagerPanel();
  const cityStatsWidget = new CityStatsWidget('top-right');
  const inventoryUI = new InventoryUI(canvas, gameLoop.world);
  const hoverInfoPanel = new UnifiedHoverInfoPanel();

  const craftingUI = new CraftingPanelUI(gameLoop.world, canvas);
  craftingUI.onCraftNow((recipeId: string, quantity: number) => {
    const agentId = craftingUI.activeAgentId;
    if (!agentId) {
      showNotification('No agent selected', '#FFA500');
      return;
    }

    const recipe = globalRecipeRegistry.getRecipe(recipeId);
    try {
      craftingSystem.queueJob(agentId, recipe, quantity);
      showNotification(`Queued: ${recipe.name} x${quantity}`, '#4CAF50');
      craftingUI.refresh();
    } catch (error) {
      showNotification(`Cannot craft: ${(error as Error).message}`, '#F44336');
    }
  });

  const tileInspectorPanel = new TileInspectorPanel(
    gameLoop.world.eventBus,
    renderer.getCamera(),
    chunkManager
  );

  // Create placeholder for controlsPanel - will be initialized after windowManager
  const controlsPanel = null as any;

  return {
    agentInfoPanel,
    agentRosterPanel,
    animalInfoPanel,
    animalRosterPanel,
    plantInfoPanel,
    resourcesPanel,
    memoryPanel,
    relationshipsPanel,
    notificationsPanel,
    economyPanel,
    shopPanel,
    governancePanel,
    cityManagerPanel,
    cityStatsWidget,
    inventoryUI,
    craftingUI,
    settingsPanel,
    tileInspectorPanel,
    controlsPanel,
    hoverInfoPanel,
  };
}

// ============================================================================
// WINDOW MANAGER SETUP
// ============================================================================

function setupWindowManager(
  canvas: HTMLCanvasElement,
  renderer: Renderer,
  panels: UIPanelsResult,
  keyboardRegistry: KeyboardRegistry,
  showNotification: (message: string, color?: string) => void
): { windowManager: WindowManager; menuBar: MenuBar; controlsPanel: ControlsPanel; skillTreePanel: SkillTreePanel; divineChatPanel: DivineChatPanel } {
  const windowManager = new WindowManager(canvas);
  const menuBar = new MenuBar(windowManager, canvas);
  menuBar.setRenderer(renderer);

  // Create adapters
  const agentInfoAdapter = createAgentInfoPanelAdapter(panels.agentInfoPanel);
  const animalInfoAdapter = createAnimalInfoPanelAdapter(panels.animalInfoPanel);
  const plantInfoAdapter = createPlantInfoPanelAdapter(panels.plantInfoPanel);
  const memoryAdapter = createMemoryPanelAdapter(panels.memoryPanel);
  const relationshipsAdapter = createRelationshipsPanelAdapter(panels.relationshipsPanel);
  const resourcesAdapter = createResourcesPanelAdapter(panels.resourcesPanel);
  const notificationsAdapter = createNotificationsPanelAdapter(panels.notificationsPanel);
  const economyAdapter = createEconomyPanelAdapter(panels.economyPanel);
  const shopAdapter = createShopPanelAdapter(panels.shopPanel);
  const governanceAdapter = createGovernanceDashboardPanelAdapter(panels.governancePanel);
  const settingsAdapter = createSettingsPanelAdapter(panels.settingsPanel);
  const tileInspectorAdapter = createTileInspectorPanelAdapter(panels.tileInspectorPanel);
  const inventoryAdapter = createInventoryPanelAdapter(panels.inventoryUI);
  const craftingAdapter = createCraftingPanelAdapter(panels.craftingUI);

  const canvasRect = canvas.getBoundingClientRect();
  const logicalWidth = canvasRect.width;
  const logicalHeight = canvasRect.height;

  windowManager.handleCanvasResize(logicalWidth, logicalHeight);

  // LLM Config Panel (modal) - uses adapter like SettingsPanel
  const llmConfigPanel = new LLMConfigPanel();
  const llmConfigAdapter = createLLMConfigPanelAdapter(llmConfigPanel);
  windowManager.registerWindow('llm-config', llmConfigAdapter, {
    defaultX: 0,
    defaultY: 0,
    defaultWidth: 500,
    defaultHeight: 400,
    isDraggable: false, // Modal, not draggable
    isResizable: false,
    isModal: true, // Modal window - dims background, auto-centers
    showInWindowList: false, // Don't show in menu (opened via agent panel)
  });

  // Set up LLM config callback for agent info panel
  panels.agentInfoPanel.setOnOpenLLMConfig((agentEntity: any) => {
    llmConfigPanel.openForAgent(agentEntity);
    windowManager.showWindow('llm-config');
  });

  // Register windows
  windowManager.registerWindow('agent-info', agentInfoAdapter, {
    defaultX: 10,
    defaultY: 10,
    defaultWidth: 360,
    defaultHeight: 530,
    isDraggable: true,
    isResizable: true,
    minWidth: 300,
    minHeight: 400,
    showInWindowList: true,
    keyboardShortcut: 'A',
    menuCategory: 'info',
  });

  windowManager.registerWindow('animal-info', animalInfoAdapter, {
    defaultX: logicalWidth - 320,
    defaultY: 10,
    defaultWidth: 300,
    defaultHeight: 400,
    isDraggable: true,
    isResizable: true,
    minWidth: 250,
    minHeight: 300,
    showInWindowList: true,
    menuCategory: 'animals',
  });

  windowManager.registerWindow('plant-info', plantInfoAdapter, {
    defaultX: logicalWidth - 340,
    defaultY: 50,
    defaultWidth: 320,
    defaultHeight: 480,
    isDraggable: true,
    isResizable: true,
    minWidth: 250,
    minHeight: 350,
    showInWindowList: true,
    menuCategory: 'farming',
  });

  windowManager.registerWindow('resources', resourcesAdapter, {
    defaultX: logicalWidth - 260,
    defaultY: 10,
    defaultWidth: 250,
    defaultHeight: 200,
    isDraggable: true,
    isResizable: true,
    minWidth: 200,
    minHeight: 150,
    showInWindowList: true,
    keyboardShortcut: 'R',
    menuCategory: 'economy',
  });

  windowManager.registerWindow('memory', memoryAdapter, {
    defaultX: 10,
    defaultY: logicalHeight - 610,
    defaultWidth: 400,
    defaultHeight: 600,
    isDraggable: true,
    isResizable: true,
    minWidth: 300,
    minHeight: 400,
    showInWindowList: true,
    keyboardShortcut: 'M',
    menuCategory: 'social',
  });

  windowManager.registerWindow('relationships', relationshipsAdapter, {
    defaultX: 420,
    defaultY: logicalHeight - 510,
    defaultWidth: 380,
    defaultHeight: 500,
    isDraggable: true,
    isResizable: true,
    minWidth: 300,
    minHeight: 350,
    showInWindowList: true,
    keyboardShortcut: 'L',
    menuCategory: 'social',
  });

  windowManager.registerWindow('tile-inspector', tileInspectorAdapter, {
    defaultX: logicalWidth - 320,
    defaultY: logicalHeight - 410,
    defaultWidth: 300,
    defaultHeight: 400,
    isDraggable: true,
    isResizable: true,
    minWidth: 250,
    minHeight: 300,
    showInWindowList: true,
    keyboardShortcut: 'T',
    menuCategory: 'farming',
  });

  windowManager.registerWindow('inventory', inventoryAdapter, {
    defaultX: 100,
    defaultY: 50,
    defaultWidth: logicalWidth - 200,
    defaultHeight: logicalHeight - 100,
    isDraggable: true,
    isResizable: true,
    minWidth: 400,
    minHeight: 300,
    isModal: true,
    showInWindowList: true,
    keyboardShortcut: 'I',
    menuCategory: 'economy',
  });

  windowManager.registerWindow('settings', settingsAdapter, {
    defaultX: 10,
    defaultY: 10,
    defaultWidth: 400,
    defaultHeight: 300,
    isDraggable: true,
    isResizable: true,
    minWidth: 350,
    minHeight: 250,
    isModal: true,
    showInWindowList: true,
    keyboardShortcut: 'Escape',
    menuCategory: 'settings',
  });

  windowManager.registerWindow('crafting', craftingAdapter, {
    defaultX: 100,
    defaultY: 80,
    defaultWidth: 800,
    defaultHeight: 600,
    isDraggable: true,
    isResizable: true,
    minWidth: 600,
    minHeight: 400,
    isModal: true,
    showInWindowList: true,
    keyboardShortcut: 'C',
    menuCategory: 'economy',
  });

  windowManager.registerWindow('notifications', notificationsAdapter, {
    defaultX: logicalWidth - 420,
    defaultY: logicalHeight - 350,
    defaultWidth: 400,
    defaultHeight: 300,
    isDraggable: true,
    isResizable: true,
    minWidth: 300,
    minHeight: 200,
    showInWindowList: true,
    keyboardShortcut: 'N',
    menuCategory: 'settings',
  });

  windowManager.registerWindow('economy', economyAdapter, {
    defaultX: logicalWidth - 420,
    defaultY: logicalHeight - 520,
    defaultWidth: 400,
    defaultHeight: 500,
    isDraggable: true,
    isResizable: true,
    minWidth: 350,
    minHeight: 400,
    showInWindowList: true,
    keyboardShortcut: 'E',
    menuCategory: 'economy',
  });

  windowManager.registerWindow('shop', shopAdapter, {
    defaultX: (logicalWidth - 500) / 2,
    defaultY: (logicalHeight - 600) / 2,
    defaultWidth: 500,
    defaultHeight: 600,
    isDraggable: false,
    isModal: true,
    showInWindowList: false,
    menuCategory: 'economy',
  });

  windowManager.registerWindow('governance', governanceAdapter, {
    defaultX: logicalWidth - 420,
    defaultY: 10,
    defaultWidth: 400,
    defaultHeight: 500,
    isDraggable: true,
    isResizable: true,
    minWidth: 350,
    minHeight: 400,
    showInWindowList: true,
    keyboardShortcut: 'G',
    menuCategory: 'social',
  });

  // Register governance keyboard shortcut
  keyboardRegistry.register('toggle_governance', {
    key: 'G',
    description: 'Toggle governance dashboard',
    category: 'Windows',
    handler: () => {
      windowManager.toggleWindow('governance');
      return true;
    },
  });

  // City Manager Panel
  windowManager.registerWindow('city-manager', panels.cityManagerPanel, {
    defaultX: logicalWidth - 420,
    defaultY: 120,
    defaultWidth: 360,
    defaultHeight: 500,
    isDraggable: true,
    isResizable: false,
    showInWindowList: true,
    keyboardShortcut: 'C',
    menuCategory: 'social',
  });

  // Register city manager keyboard shortcut
  keyboardRegistry.register('toggle_city_manager', {
    key: 'C',
    description: 'Toggle city manager',
    category: 'Windows',
    handler: () => {
      windowManager.toggleWindow('city-manager');
      return true;
    },
  });

  // Wire up city stats widget click handler
  panels.cityStatsWidget.setOnClick(() => {
    windowManager.toggleWindow('city-manager');
  });

  // Controls panel
  const controlsPanel = new ControlsPanel(windowManager);
  windowManager.registerWindow('controls', controlsPanel, {
    defaultX: 10,
    defaultY: 50,
    defaultWidth: 300,
    defaultHeight: 500,
    isDraggable: true,
    isResizable: true,
    minWidth: 250,
    minHeight: 350,
    showInWindowList: true,
    keyboardShortcut: 'H',
    menuCategory: 'settings',
  });

  // Time Controls Panel
  const timeControlsPanel = new TimeControlsPanel();
  windowManager.registerWindow('time-controls', timeControlsPanel, {
    defaultX: 10,
    defaultY: 50,
    defaultWidth: 220,
    defaultHeight: 180,
    isDraggable: true,
    isResizable: false,
    showInWindowList: true,
    keyboardShortcut: 'T',
    menuCategory: 'settings',
  });

  // Universe Manager Panel
  const universeManagerPanel = new UniverseManagerPanel();
  windowManager.registerWindow('universe-manager', universeManagerPanel, {
    defaultX: 10,
    defaultY: 250,
    defaultWidth: 350,
    defaultHeight: 400,
    isDraggable: true,
    isResizable: true,
    showInWindowList: true,
    keyboardShortcut: 'U',
    menuCategory: 'settings',
  });

  // Agent Roster Panel - use existing panel from panels object (has click callback wired)
  windowManager.registerWindow('agent-roster', panels.agentRosterPanel, {
    defaultX: 10,
    defaultY: 250,
    defaultWidth: 380,
    defaultHeight: 500,
    isDraggable: true,
    isResizable: true,
    showInWindowList: true,
    keyboardShortcut: 'R',
    menuCategory: 'info',
  });

  // Research Library Panel
  const researchLibraryPanel = new ResearchLibraryPanel();
  windowManager.registerWindow('research-library', researchLibraryPanel, {
    defaultX: 400,
    defaultY: 100,
    defaultWidth: 380,
    defaultHeight: 600,
    isDraggable: true,
    isResizable: true,
    showInWindowList: true,
    keyboardShortcut: 'Y',
    menuCategory: 'research',
  });

  // Tech Tree Panel
  const techTreePanel = new TechTreePanel();
  windowManager.registerWindow('tech-tree', techTreePanel, {
    defaultX: 100,
    defaultY: 50,
    defaultWidth: 1200,
    defaultHeight: 1200,
    isDraggable: true,
    isResizable: true,
    showInWindowList: true,
    keyboardShortcut: 'K',
    menuCategory: 'research',
  });

  // Agent Selection Panel (Jack-In)
  const agentSelectionPanel = new AgentSelectionPanel();
  windowManager.registerWindow('agent-selection', agentSelectionPanel, {
    defaultX: 420,
    defaultY: 200,
    defaultWidth: 400,
    defaultHeight: 500,
    isDraggable: true,
    isResizable: true,
    showInWindowList: true,
    keyboardShortcut: 'J',
    menuCategory: 'player',
  });

  // ============================================================================
  // Magic & Divine Panels
  // ============================================================================

  // Magic Systems Panel
  const magicSystemsPanel = new MagicSystemsPanel();
  const magicSystemsAdapter = createMagicSystemsPanelAdapter(magicSystemsPanel);
  windowManager.registerWindow('magic-systems', magicSystemsAdapter, {
    defaultX: 10,
    defaultY: 100,
    defaultWidth: 380,
    defaultHeight: 450,
    isDraggable: true,
    isResizable: true,
    minWidth: 320,
    minHeight: 350,
    showInWindowList: true,
    menuCategory: 'magic',
  });

  // Spellbook Panel
  const spellbookPanel = new SpellbookPanel();
  const spellbookAdapter = createSpellbookPanelAdapter(spellbookPanel);
  windowManager.registerWindow('spellbook', spellbookAdapter, {
    defaultX: 50,
    defaultY: 120,
    defaultWidth: 420,
    defaultHeight: 550,
    isDraggable: true,
    isResizable: true,
    minWidth: 350,
    minHeight: 400,
    showInWindowList: true,
    menuCategory: 'magic',
  });

  // Skill Tree Panel
  const skillTreePanel = new SkillTreePanel(windowManager);
  const skillTreeAdapter = createSkillTreePanelAdapter(skillTreePanel);
  windowManager.registerWindow('skill-tree', skillTreeAdapter, {
    defaultX: 100,
    defaultY: 50,
    defaultWidth: 800,
    defaultHeight: 600,
    isDraggable: true,
    isResizable: true,
    minWidth: 600,
    minHeight: 400,
    showInWindowList: true,
    menuCategory: 'magic',
    keyboardShortcut: 'P', // P for Paradigm skill tree
  });

  // Divine Powers Panel
  const divinePowersPanel = new DivinePowersPanel();
  const divinePowersAdapter = createDivinePowersPanelAdapter(divinePowersPanel);
  windowManager.registerWindow('divine-powers', divinePowersAdapter, {
    defaultX: 100,
    defaultY: 80,
    defaultWidth: 400,
    defaultHeight: 550,
    isDraggable: true,
    isResizable: true,
    minWidth: 350,
    minHeight: 400,
    showInWindowList: true,
    menuCategory: 'divinity',
  });

  // Divine Chat Panel
  const divineChatPanel = new DivineChatPanel();
  const divineChatAdapter = createDivineChatPanelAdapter(divineChatPanel);
  windowManager.registerWindow('divine-chat', divineChatAdapter, {
    defaultX: 520,
    defaultY: 80,
    defaultWidth: 400,
    defaultHeight: 600,
    isDraggable: true,
    isResizable: true,
    minWidth: 350,
    minHeight: 400,
    showInWindowList: true,
    menuCategory: 'divinity',
  });

  // Vision Composer Panel
  const visionComposerPanel = new VisionComposerPanel();
  const visionComposerAdapter = createVisionComposerPanelAdapter(visionComposerPanel);
  windowManager.registerWindow('vision-composer', visionComposerAdapter, {
    defaultX: 150,
    defaultY: 100,
    defaultWidth: 500,
    defaultHeight: 600,
    isDraggable: true,
    isResizable: true,
    minWidth: 400,
    minHeight: 450,
    showInWindowList: true,
    menuCategory: 'divinity',
  });

  // Dev Panel
  devPanel = new DevPanel();
  const devPanelAdapter = createDevPanelAdapter(devPanel);
  windowManager.registerWindow('dev-panel', devPanelAdapter, {
    defaultX: 200,
    defaultY: 50,
    defaultWidth: 450,
    defaultHeight: 650,
    isDraggable: true,
    isResizable: true,
    minWidth: 380,
    minHeight: 500,
    showInWindowList: true,
    menuCategory: 'dev',
  });

  // Wire up agent spawning in dev panel
  devPanel.setAgentSpawnHandler({
    spawnWanderingAgent: (x, y) => createWanderingAgent(gameLoop.world, x, y),
    spawnLLMAgent: (x, y) => createLLMAgent(gameLoop.world, x, y),
    spawnVillage: (count, x, y) => {
      const agentIds: string[] = [];
      for (let i = 0; i < count; i++) {
        const offsetX = x + (i % 5) * 3;
        const offsetY = y + Math.floor(i / 5) * 3;
        agentIds.push(createWanderingAgent(gameLoop.world, offsetX, offsetY));
      }
      return agentIds;
    },
  });

  // Divine Analytics Panel
  const divineAnalyticsPanel = new DivineAnalyticsPanel(
    {
      analytics: {
        faithTrend: [],
        prayersByDomain: {},
        prophecyAccuracy: 0,
        believerGrowth: 0,
        miracleEffectiveness: 0,
      },
      energy: { current: 100, max: 1000, regenRate: 1 },
      selectedTimeRange: '7_days',
      selectedProphecyId: null,
      scrollOffset: 0,
    },
    {
      onSelectProphecy: () => {},
      onExportData: () => {},
      onTimeRangeChange: () => {},
    }
  );
  const divineAnalyticsAdapter = createDivineAnalyticsPanelAdapter(divineAnalyticsPanel);
  windowManager.registerWindow('divine-analytics', divineAnalyticsAdapter, {
    defaultX: 250,
    defaultY: 120,
    defaultWidth: 700,
    defaultHeight: 550,
    isDraggable: true,
    isResizable: true,
    minWidth: 500,
    minHeight: 400,
    showInWindowList: true,
    menuCategory: 'divinity',
  });

  // Sacred Geography Panel
  const sacredGeographyPanel = new SacredGeographyPanel(
    {
      sites: [],
      selectedSiteId: null,
      enabledLayers: new Set(['sacred_sites']),
      faithDensity: [],
      currentEnergy: 100,
      mapBounds: { minX: 0, minY: 0, maxX: 100, maxY: 100 },
      cameraOffset: { x: 0, y: 0 },
      zoom: 1,
    },
    {
      onSelectSite: () => {},
      onBlessSite: () => {},
      onSendMiracle: () => {},
      onViewHistory: () => {},
      onToggleLayer: () => {},
      onCenterOnSite: () => {},
    }
  );
  const sacredGeographyAdapter = createSacredGeographyPanelAdapter(sacredGeographyPanel);
  windowManager.registerWindow('sacred-geography', sacredGeographyAdapter, {
    defaultX: 300,
    defaultY: 140,
    defaultWidth: 600,
    defaultHeight: 500,
    isDraggable: true,
    isResizable: true,
    minWidth: 450,
    minHeight: 350,
    showInWindowList: true,
    menuCategory: 'divinity',
  });

  // Angel Management Panel
  const angelManagementPanel = new AngelManagementPanel(
    {
      angels: [],
      selectedAngelId: null,
      energy: { current: 100, max: 1000, regenRate: 1 },
      wizardOpen: false,
      wizardStep: 0,
      wizardDraft: null,
      availableAgentsToAssign: [],
    },
    {
      onSelectAngel: () => {},
      onCreateAngel: () => {},
      onToggleAngelRest: () => {},
      onSetAngelAutonomy: () => {},
      onToggleAbility: () => {},
      onAssignAgent: () => {},
      onUnassignAgent: () => {},
      onOpenCreationWizard: () => {},
      onCloseCreationWizard: () => {},
    }
  );
  const angelManagementAdapter = createAngelManagementPanelAdapter(angelManagementPanel);
  windowManager.registerWindow('angel-management', angelManagementAdapter, {
    defaultX: 350,
    defaultY: 160,
    defaultWidth: 550,
    defaultHeight: 500,
    isDraggable: true,
    isResizable: true,
    minWidth: 400,
    minHeight: 350,
    showInWindowList: true,
    menuCategory: 'divinity',
  });

  // Prayer Panel
  const prayerPanel = new PrayerPanel(
    {
      prayers: [],
      selectedPrayerId: null,
      selectedPrayerContext: null,
      availableAngels: [],
      currentEnergy: 100,
      filterDomain: 'all',
      filterUrgency: 'all',
    },
    {
      onSendVision: () => {},
      onPerformMiracle: () => {},
      onAssignAngel: () => {},
      onIgnorePrayer: () => {},
      onSelectPrayer: () => {},
    }
  );
  const prayerAdapter = createPrayerPanelAdapter(prayerPanel);
  windowManager.registerWindow('prayers', prayerAdapter, {
    defaultX: 400,
    defaultY: 180,
    defaultWidth: 550,
    defaultHeight: 450,
    isDraggable: true,
    isResizable: true,
    minWidth: 400,
    minHeight: 300,
    showInWindowList: true,
    menuCategory: 'divinity',
  });

  // Text Adventure Panel (1D Renderer - accessibility/narrative output)
  const textAdventurePanel = createTextAdventurePanel();
  textAdventurePanel.setCamera(renderer.camera);
  const textAdventureAdapter = createTextAdventurePanelAdapter(textAdventurePanel);
  windowManager.registerWindow('text-adventure', textAdventureAdapter, {
    defaultX: logicalWidth - 470,
    defaultY: logicalHeight - 520,
    defaultWidth: 450,
    defaultHeight: 500,
    isDraggable: true,
    isResizable: true,
    minWidth: 350,
    minHeight: 400,
    showInWindowList: true,
    keyboardShortcut: '1',
    menuCategory: 'settings',
  });

  // Load saved layout
  windowManager.loadLayout();

  // Event listeners
  windowManager.on('window:auto-closed', (event: any) => {
    showNotification(`Closed "${event.windowTitle}" to make space`, '#FFA500');
  });

  window.addEventListener('mouseup', () => {
    windowManager.handleDragEnd();
  });

  window.addEventListener('resize', () => {
    const rect = canvas.getBoundingClientRect();
    windowManager.handleCanvasResize(rect.width, rect.height);
  });

  return { windowManager, menuBar, controlsPanel, skillTreePanel, divineChatPanel };
}

// ============================================================================
// EVENT HANDLERS SETUP
// ============================================================================

function setupEventHandlers(
  gameContext: GameContext,
  uiContext: UIContext,
  soilSystem: SoilSystem
) {
  const { gameLoop, chunkManager, terrainGenerator, showNotification } = gameContext;
  const { tileInspectorPanel, notificationsPanel } = uiContext;
  const CHUNK_SIZE = 32;

  // Helper to teleport agent to adjacent position
  function teleportAgentAdjacent(agent: any, targetX: number, targetY: number, agentPos: any) {
    const adjacentOffsets = [
      { dx: 1, dy: 0 }, { dx: 0, dy: 1 }, { dx: -1, dy: 0 }, { dx: 0, dy: -1 },
      { dx: 1, dy: 1 }, { dx: -1, dy: 1 }, { dx: 1, dy: -1 }, { dx: -1, dy: -1 },
    ];

    let bestPos = { x: targetX + 1, y: targetY };
    let bestDist = Infinity;

    for (const offset of adjacentOffsets) {
      const adjX = targetX + offset.dx;
      const adjY = targetY + offset.dy;
      const adjDx = adjX - agentPos.x;
      const adjDy = adjY - agentPos.y;
      const adjDist = Math.sqrt(adjDx * adjDx + adjDy * adjDy);

      if (adjDist < bestDist) {
        bestDist = adjDist;
        bestPos = { x: adjX, y: adjY };
      }
    }

    const newChunkX = Math.floor(bestPos.x / 32);
    const newChunkY = Math.floor(bestPos.y / 32);
    agent.updateComponent('position', (current: any) => ({
      ...current,
      x: bestPos.x,
      y: bestPos.y,
      chunkX: newChunkX,
      chunkY: newChunkY,
    }));

    agent.updateComponent('movement', (current: any) => ({
      ...current,
      targetX: null,
      targetY: null,
      velocityX: 0,
      velocityY: 0,
      isMoving: false,
    }));

    return bestPos;
  }

  // action:till handler
  gameLoop.world.eventBus.subscribe('action:till', (event: any) => {
    const { x, y, agentId: requestedAgentId } = event.data;
    const MAX_TILL_DISTANCE = Math.sqrt(2);

    let agentId = requestedAgentId || uiContext.agentInfoPanel.getSelectedEntity()?.id;

    if (!agentId) {
      const agents = gameLoop.world.query().with('agent').with('position').executeEntities();
      let nearestAgent: any = null;
      let nearestDistance = Infinity;

      for (const agent of agents) {
        const pos = agent.getComponent('position') as any;
        if (pos) {
          const dx = pos.x - x;
          const dy = pos.y - y;
          const distance = Math.sqrt(dx * dx + dy * dy);

          if (distance < nearestDistance) {
            nearestDistance = distance;
            nearestAgent = agent;
          }
        }
      }

      if (nearestAgent) {
        agentId = nearestAgent.id;
      } else {
        console.error(`[Main] Cannot till - no agents available`);
        showNotification('No agent available to till', '#FF0000');
        return;
      }
    }

    // Ensure chunk is generated
    const chunkX = Math.floor(x / CHUNK_SIZE);
    const chunkY = Math.floor(y / CHUNK_SIZE);
    const chunk = chunkManager.getChunk(chunkX, chunkY);

    if (!chunk) {
      console.error(`[Main] Cannot till - chunk not found at (${chunkX}, ${chunkY})`);
      showNotification(`Cannot till - chunk not found`, '#FF0000');
      return;
    }

    if (!chunk.generated) {
      terrainGenerator.generateChunk(chunk, gameLoop.world as any);

      // Link tile neighbors for O(1) graph traversal
      chunkManager.linkChunkNeighbors(chunk);
      chunkManager.updateCrossChunkNeighbors(chunk);
    }

    const agent = gameLoop.world.getEntity(agentId);
    if (!agent) {
      console.error(`[Main] Agent ${agentId} not found`);
      showNotification('Agent not found', '#FF0000');
      return;
    }

    const agentPos = agent.getComponent('position') as any;
    if (!agentPos) {
      console.error(`[Main] Agent ${agentId} has no position`);
      showNotification('Agent has no position', '#FF0000');
      return;
    }

    const dx = x - agentPos.x;
    const dy = y - agentPos.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance > MAX_TILL_DISTANCE) {
      teleportAgentAdjacent(agent, x, y, agentPos);
      showNotification(`Agent moved to tile`, '#8B4513');
    }

    try {
      const actionId = gameLoop.actionQueue.submit({
        type: 'till',
        actorId: agentId,
        targetPosition: { x, y },
        parameters: {},
        priority: 1,
      });

      const tillHandler = gameLoop.actionQueue.getHandler('till');
      let durationSeconds = 20;

      if (tillHandler && typeof tillHandler.getDuration === 'function') {
        const durationTicks = tillHandler.getDuration(
          { id: actionId, type: 'till', actorId: agentId, targetPosition: { x, y }, status: 'pending' },
          gameLoop.world
        );
        durationSeconds = durationTicks / 20;
      }

      showNotification(`Agent will till tile at (${x}, ${y}) (${durationSeconds}s)`, '#8B4513');
    } catch (err: any) {
      console.error(`[Main] Failed to submit till action: ${err.message}`);
      showNotification(`Failed to queue tilling: ${err.message}`, '#FF0000');
    }
  });

  // action:plant handler
  gameLoop.world.eventBus.subscribe('action:plant', (event: any) => {
    const { x, y, agentId, seedType, speciesId } = event.data;

    const agent = gameLoop.world.getEntity(agentId);
    if (!agent) {
      console.error(`[Main] Agent ${agentId} not found for planting`);
      return;
    }

    const agentPos = agent.getComponent('position') as any;
    if (!agentPos) {
      console.error(`[Main] Agent ${agentId} has no position`);
      return;
    }

    const dx = x - agentPos.x;
    const dy = y - agentPos.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const MAX_PLANT_DISTANCE = Math.sqrt(2);

    if (distance > MAX_PLANT_DISTANCE) {
      console.warn(`[Main] Agent ${agentId.slice(0, 8)} is too far from plant target`);
      return;
    }

    try {
      const actionId = gameLoop.actionQueue.submit({
        type: 'plant',
        actorId: agentId,
        targetPosition: { x, y },
        parameters: { seedType },
        priority: 1,
      });

      const plantHandler = gameLoop.actionQueue.getHandler('plant');
      let durationSeconds = 3;

      if (plantHandler && typeof plantHandler.getDuration === 'function') {
        const durationTicks = plantHandler.getDuration(
          { id: actionId, type: 'plant', actorId: agentId, targetPosition: { x, y }, status: 'pending' } as any,
          gameLoop.world
        );
        durationSeconds = durationTicks / 20;
      }

      showNotification(`Planting ${speciesId || 'seed'} at (${x}, ${y}) (${durationSeconds}s)`, '#228B22');
    } catch (err: any) {
      console.error(`[Main] Failed to submit plant action: ${err.message}`);
      showNotification(`Failed to queue planting: ${err.message}`, '#FF0000');
    }
  });

  // action:gather_seeds handler
  gameLoop.world.eventBus.subscribe('action:gather_seeds', (event: any) => {
    const { agentId, plantId } = event.data;
    const MAX_GATHER_DISTANCE = Math.sqrt(2);

    const agent = gameLoop.world.getEntity(agentId);
    if (!agent) {
      console.error(`[Main] Agent ${agentId} not found for seed gathering`);
      return;
    }

    const plant = gameLoop.world.getEntity(plantId);
    if (!plant) {
      console.error(`[Main] Plant ${plantId} not found for seed gathering`);
      return;
    }

    const agentPos = agent.getComponent('position') as any;
    const plantPos = plant.getComponent('position') as any;

    if (!agentPos || !plantPos) {
      console.error(`[Main] Agent or plant missing position component`);
      return;
    }

    const dx = plantPos.x - agentPos.x;
    const dy = plantPos.y - agentPos.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance > MAX_GATHER_DISTANCE) {
      teleportAgentAdjacent(agent, plantPos.x, plantPos.y, agentPos);
    }

    try {
      const actionId = gameLoop.actionQueue.submit({
        type: 'gather_seeds',
        actorId: agentId,
        targetId: plantId,
        parameters: {},
        priority: 1,
      });

      const gatherSeedsHandler = gameLoop.actionQueue.getHandler('gather_seeds');
      let durationSeconds = 5;

      if (gatherSeedsHandler && typeof gatherSeedsHandler.getDuration === 'function') {
        const durationTicks = gatherSeedsHandler.getDuration(
          { id: actionId, type: 'gather_seeds', actorId: agentId, targetId: plantId, status: 'pending' },
          gameLoop.world
        );
        durationSeconds = durationTicks / 20;
      }

      const plantComponent = plant.getComponent('plant') as any;
      const speciesName = plantComponent?.speciesId || 'plant';
      showNotification(`Agent gathering seeds from ${speciesName} (${durationSeconds}s)`, '#228B22');
    } catch (err: any) {
      console.error(`[Main] Failed to submit gather_seeds action: ${err.message}`);
      showNotification(`Failed to gather seeds: ${err.message}`, '#FF0000');
    }
  });

  // action:harvest handler
  gameLoop.world.eventBus.subscribe('action:harvest', (event: any) => {
    const { agentId, plantId } = event.data;

    const agent = gameLoop.world.getEntity(agentId);
    if (!agent) {
      console.error(`[Main] Agent ${agentId} not found for harvesting`);
      return;
    }

    const plant = gameLoop.world.getEntity(plantId);
    if (!plant) {
      console.error(`[Main] Plant ${plantId} not found for harvesting`);
      return;
    }

    try {
      const actionId = gameLoop.actionQueue.submit({
        type: 'harvest',
        actorId: agentId,
        targetId: plantId,
        parameters: {},
        priority: 1,
      });

      const harvestHandler = gameLoop.actionQueue.getHandler('harvest');
      let durationSeconds = 8;

      if (harvestHandler && typeof harvestHandler.getDuration === 'function') {
        const durationTicks = harvestHandler.getDuration(
          { id: actionId, type: 'harvest', actorId: agentId, targetId: plantId, status: 'pending' },
          gameLoop.world
        );
        durationSeconds = durationTicks / 20;
      }

      const plantComponent = plant.getComponent('plant') as any;
      const speciesName = plantComponent?.speciesId || 'plant';
      showNotification(`Agent harvesting ${speciesName} (${durationSeconds}s)`, '#FF8C00');
    } catch (err: any) {
      console.error(`[Main] Failed to submit harvest action: ${err.message}`);
      showNotification(`Failed to harvest: ${err.message}`, '#FF0000');
    }
  });

  // action:water handler
  gameLoop.world.eventBus.subscribe('action:water', (event: any) => {
    if (!soilSystem) return;

    const { x, y } = event.data;
    const chunkX = Math.floor(x / CHUNK_SIZE);
    const chunkY = Math.floor(y / CHUNK_SIZE);
    const localX = ((x % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE;
    const localY = ((y % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE;

    const chunk = chunkManager.getChunk(chunkX, chunkY);
    if (!chunk) {
      console.error(`[Main] Cannot water - chunk not found at (${chunkX}, ${chunkY})`);
      showNotification(`Cannot water - chunk not found`, '#FF0000');
      return;
    }

    if (!chunk.generated) {
      terrainGenerator.generateChunk(chunk, gameLoop.world as any);

      // Link tile neighbors for O(1) graph traversal
      chunkManager.linkChunkNeighbors(chunk);
      chunkManager.updateCrossChunkNeighbors(chunk);
    }

    const tileIndex = localY * CHUNK_SIZE + localX;
    const tile = chunk.tiles[tileIndex];

    if (!tile) {
      console.error(`[Main] Cannot water - tile not found at (${x}, ${y})`);
      showNotification(`Cannot water - tile not found`, '#FF0000');
      return;
    }

    try {
      soilSystem.waterTile(gameLoop.world, tile, x, y);
      showNotification(`Watered tile at (${x}, ${y})`, '#1E90FF');

      const refreshedTile = chunk.tiles[tileIndex];
      if (refreshedTile) {
        tileInspectorPanel.setSelectedTile(refreshedTile, x, y);
      }
    } catch (err: any) {
      console.error(`[Main] Failed to water tile: ${err.message}`);
      showNotification(`Failed to water: ${err.message}`, '#FF0000');
    }
  });

  // action:fertilize handler
  gameLoop.world.eventBus.subscribe('action:fertilize', (event: any) => {
    if (!soilSystem) return;

    const { x, y, fertilizerType } = event.data;
    const chunkX = Math.floor(x / CHUNK_SIZE);
    const chunkY = Math.floor(y / CHUNK_SIZE);
    const localX = ((x % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE;
    const localY = ((y % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE;

    const chunk = chunkManager.getChunk(chunkX, chunkY);
    if (!chunk) {
      console.error(`[Main] Cannot fertilize - chunk not found at (${chunkX}, ${chunkY})`);
      showNotification(`Cannot fertilize - chunk not found`, '#FF0000');
      return;
    }

    if (!chunk.generated) {
      terrainGenerator.generateChunk(chunk, gameLoop.world as any);

      // Link tile neighbors for O(1) graph traversal
      chunkManager.linkChunkNeighbors(chunk);
      chunkManager.updateCrossChunkNeighbors(chunk);
    }

    const tileIndex = localY * CHUNK_SIZE + localX;
    const tile = chunk.tiles[tileIndex];

    if (!tile) {
      console.error(`[Main] Cannot fertilize - tile not found at (${x}, ${y})`);
      showNotification(`Cannot fertilize - tile not found`, '#FF0000');
      return;
    }

    const fertilizer = FERTILIZERS[fertilizerType];
    if (!fertilizer) {
      console.error(`[Main] Unknown fertilizer type: ${fertilizerType}`);
      showNotification(`Unknown fertilizer: ${fertilizerType}`, '#FF0000');
      return;
    }

    try {
      soilSystem.fertilizeTile(gameLoop.world, tile, x, y, fertilizer);
      showNotification(`Applied ${fertilizerType} at (${x}, ${y})`, '#FFD700');

      const refreshedTile = chunk.tiles[tileIndex];
      if (refreshedTile) {
        tileInspectorPanel.setSelectedTile(refreshedTile, x, y);
      }
    } catch (err: any) {
      console.error(`[Main] Failed to fertilize tile: ${err.message}`);
      showNotification(`Failed to fertilize: ${err.message}`, '#FF0000');
    }
  });

  // Action completion/failure handlers
  gameLoop.world.eventBus.subscribe('agent:action:completed', (event: any) => {
    const { actionType, actionId, success, reason } = event.data;

    if (actionType === 'till') {
      if (success) {
        showNotification('Tilling completed!', '#8B4513');
      } else {
        console.error(`[Main] Tilling action ${actionId} failed: ${reason}`);
        showNotification(`Tilling failed: ${reason}`, '#FF0000');
      }
    }
  });

  gameLoop.world.eventBus.subscribe('agent:action:failed', (event: any) => {
    console.error('[Main] Action failed:', event);
    const { actionType, reason } = event.data;

    if (actionType === 'till') {
      showNotification(`Cannot till: ${reason}`, '#FF0000');
    } else {
      showNotification(`Action failed: ${reason}`, '#FF0000');
    }
  });

  // Items deposited handler
  gameLoop.world.eventBus.subscribe('items:deposited', (event: any) => {
    const { agentId, items } = event.data;
    const agent = gameLoop.world.getEntity(agentId);
    const identity = agent?.getComponent('identity') as { name: string } | undefined;
    const agentName = identity?.name || `Agent ${agentId.slice(0, 6)}`;
    notificationsPanel.addDeposit(agentName, items);
  });
}

// ============================================================================
// VISUAL EVENT HANDLERS (Floating Text, Particles)
// ============================================================================

function setupVisualEventHandlers(
  gameContext: GameContext,
  uiContext: UIContext
) {
  const { gameLoop, renderer, chunkManager } = gameContext;
  const { tileInspectorPanel } = uiContext;
  const CHUNK_SIZE = 32;
  const floatingTextRenderer = renderer.getFloatingTextRenderer();
  const particleRenderer = renderer.getParticleRenderer();

  // Soil events
  gameLoop.world.eventBus.subscribe('soil:tilled', (event: any) => {
    const { position } = event.data;
    floatingTextRenderer.add('Tilled', position.x * 16, position.y * 16, '#8B4513', 1500);

    const tileCenterX = position.x * 16 + 8;
    const tileCenterY = position.y * 16 + 8;
    particleRenderer.createDustCloud(tileCenterX, tileCenterY, 25);

    // Refresh tile inspector
    const chunkX = Math.floor(position.x / CHUNK_SIZE);
    const chunkY = Math.floor(position.y / CHUNK_SIZE);
    const localX = ((position.x % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE;
    const localY = ((position.y % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE;
    const chunk = chunkManager.getChunk(chunkX, chunkY);
    if (chunk) {
      const tileIndex = localY * CHUNK_SIZE + localX;
      const refreshedTile = chunk.tiles[tileIndex];
      if (refreshedTile) {
        tileInspectorPanel.setSelectedTile(refreshedTile, position.x, position.y);
      }
    }
  });

  gameLoop.world.eventBus.subscribe('soil:watered', (event: any) => {
    const { position } = event.data;
    floatingTextRenderer.add('+Water', position.x * 16, position.y * 16, '#1E90FF', 1500);
  });

  gameLoop.world.eventBus.subscribe('soil:fertilized', (event: any) => {
    const { position, fertilizerType } = event.data;
    floatingTextRenderer.add(`+${fertilizerType}`, position.x * 16, position.y * 16, '#FFD700', 1500);
  });

  // Resource gathering events
  gameLoop.world.eventBus.subscribe('resource:gathered', (event: any) => {
    const { resourceType, amount, sourceEntityId } = event.data;
    const sourceEntity = gameLoop.world.getEntity(sourceEntityId);
    if (!sourceEntity) return;

    const position = sourceEntity.components.get('position') as { x: number; y: number } | undefined;
    if (!position) return;

    const resourceColors: Record<string, string> = {
      wood: '#8B4513', stone: '#A0A0A0', food: '#00FF00', water: '#1E90FF',
    };
    const resourceIcons: Record<string, string> = {
      wood: '🪵', stone: '🪨', food: '🍎', water: '💧',
    };

    const color = resourceColors[resourceType] || '#FFFFFF';
    const icon = resourceIcons[resourceType] || '';
    floatingTextRenderer.add(`+${amount} ${icon}`, position.x * 16, position.y * 16, color, 2000);
  });

  // Plant lifecycle events
  gameLoop.world.eventBus.subscribe('plant:stageChanged', (event: any) => {
    const { to: newStage, entityId } = event.data;
    const plantEntity = gameLoop.world.getEntity(entityId);
    if (!plantEntity) return;

    const position = plantEntity.components.get('position') as { x: number; y: number } | undefined;
    if (!position) return;

    const stageEmojis: Record<string, string> = {
      'germinating': '🌱', 'sprout': '🌱', 'vegetative': '🌿',
      'flowering': '🌸', 'fruiting': '🍇', 'mature': '🌾',
      'seeding': '🌾', 'senescence': '🍂', 'decay': '🥀', 'dead': '💀'
    };

    const emoji = stageEmojis[newStage] || '🌿';
    floatingTextRenderer.add(`${emoji} ${newStage}`, position.x * 16, position.y * 16, '#FFD700', 2000);
  });

  // Seed events
  gameLoop.world.eventBus.subscribe('seed:dispersed', (event: any) => {
    const { position, speciesId, seed } = event.data;

    if (!seed) {
      throw new Error(`seed:dispersed event missing required seed object for ${speciesId}`);
    }
    if (!seed.genetics) {
      throw new Error(`seed:dispersed event seed missing required genetics for ${speciesId}`);
    }

    floatingTextRenderer.add('🌰 Seed', position.x * 16, position.y * 16, '#8B4513', 1500);

    // Create plant entity from dispersed seed
    const worldMutator = (gameLoop as any)._getWorldMutator();
    const plantEntity = worldMutator.createEntity();

    const plantComponent = new PlantComponent({
      speciesId: speciesId,
      position: { x: position.x, y: position.y },
      stage: 'seed',
      age: 0,
      generation: seed.generation,
      genetics: seed.genetics,
      seedsProduced: 0,
      health: 100,
      hydration: 50,
      nutrition: 70,
    });
    worldMutator.addComponent(plantEntity.id, plantComponent);

    const positionComponent = createPositionComponent({ x: position.x, y: position.y });
    worldMutator.addComponent(plantEntity.id, positionComponent);
  });

  gameLoop.world.eventBus.subscribe('seed:germinated', (event: any) => {
    const { position } = event.data;
    floatingTextRenderer.add('🌱 Germinated!', position.x * 16, position.y * 16, '#32CD32', 2000);
  });

  gameLoop.world.eventBus.subscribe('seed:planted', (event: any) => {
    const { speciesId, position } = event.data;
    const worldMutator = gameLoop.world as WorldMutator;

    const species = getPlantSpecies(speciesId);
    if (!species) {
      console.warn(`[Main] Unknown plant species: ${speciesId}`);
    }

    const plantEntity = worldMutator.createEntity(`plant-${speciesId}-${Date.now()}`);

    const plantComponent = new PlantComponent({
      speciesId,
      position: { x: position.x, y: position.y },
      stage: 'seed',
      stageProgress: 0,
      age: 0,
      generation: 0,
      health: 100,
      hydration: 70,
      nutrition: 80,
      planted: true, // Mark as agent-planted for simulation persistence
    });
    worldMutator.addComponent(plantEntity.id, plantComponent);

    const positionComponent = createPositionComponent({ x: position.x, y: position.y });
    worldMutator.addComponent(plantEntity.id, positionComponent);

    floatingTextRenderer.add('🌱 Planted!', position.x * 16, position.y * 16, '#228B22', 1500);
  });

  gameLoop.world.eventBus.subscribe('seed:gathered', (event: any) => {
    const { seedCount, plantId } = event.data;
    if (plantId) {
      const plant = gameLoop.world.getEntity(plantId);
      if (plant) {
        const position = plant.getComponent('position');
        if (position) {
          floatingTextRenderer.add(`🌰 +${seedCount}`, (position as any).x * 16, (position as any).y * 16, '#8B4513', 2000);
        }
      }
    }
  });

  gameLoop.world.eventBus.subscribe('seed:harvested', (event: any) => {
    const { seedsHarvested, plantId } = event.data;
    if (plantId) {
      const plant = gameLoop.world.getEntity(plantId);
      if (plant) {
        const position = plant.getComponent('position');
        if (position) {
          floatingTextRenderer.add(`🌾 +${seedsHarvested} seeds`, (position as any).x * 16, (position as any).y * 16, '#FFD700', 2000);
        }
      }
    }
  });

  gameLoop.world.eventBus.subscribe('plant:healthChanged', (event: any) => {
    const { health, position } = event.data;
    if (health < 30) {
      floatingTextRenderer.add(`⚠️ Health: ${Math.round(health)}`, position.x * 16, position.y * 16, '#FF4500', 2000);
    }
  });

  gameLoop.world.eventBus.subscribe('plant:died', (event: any) => {
    const { position } = event.data;
    floatingTextRenderer.add('💀 Died', position.x * 16, position.y * 16, '#888888', 2000);
  });
}

// ============================================================================
// INPUT HANDLERS SETUP
// ============================================================================

function setupInputHandlers(
  gameContext: GameContext,
  uiContext: UIContext,
  inputHandler: InputHandler
) {
  const { gameLoop, renderer, canvas, chunkManager, terrainGenerator, showNotification } = gameContext;
  const {
    agentInfoPanel, animalInfoPanel, plantInfoPanel, tileInspectorPanel,
    memoryPanel, relationshipsPanel, inventoryUI, craftingUI, shopPanel,
    placementUI, windowManager, menuBar, keyboardRegistry, hoverInfoPanel
  } = uiContext;

  inputHandler.setCallbacks({
    onKeyDown: (key, shiftKey, ctrlKey, metaKey) => {
      return handleKeyDown(
        key, shiftKey, ctrlKey, metaKey,
        gameContext, uiContext
      );
    },
    onMouseClick: (screenX, screenY, button) => {
      return handleMouseClick(
        screenX, screenY, button,
        gameContext, uiContext
      );
    },
    onMouseMove: (screenX, screenY) => {
      const rect = canvas.getBoundingClientRect();

      windowManager.handleDrag(screenX, screenY);
      const inventoryHandled = inventoryUI.handleMouseMove(screenX, screenY, rect.width, rect.height);
      if (inventoryHandled) {
        return;
      }
      placementUI.updateCursorPosition(screenX, screenY, gameLoop.world);

      // Update hover info with entity under cursor
      const hoveredEntity = renderer.findEntityAtScreenPosition(screenX, screenY, gameLoop.world);
      hoverInfoPanel.update(hoveredEntity, screenX, screenY);
    },
    onWheel: (screenX, screenY, deltaY) => {
      return windowManager.handleWheel(screenX, screenY, deltaY);
    },
  });
}

function handleKeyDown(
  key: string,
  shiftKey: boolean,
  ctrlKey: boolean,
  metaKey: boolean,
  gameContext: GameContext,
  uiContext: UIContext
): boolean {
  const { gameLoop, renderer, showNotification } = gameContext;
  const {
    agentInfoPanel, tileInspectorPanel, inventoryUI, craftingUI,
    placementUI, windowManager, keyboardRegistry, divineChatPanel
  } = uiContext;

  // Check if divine chat panel is open and has input focus - forward keyboard events to it
  const divineChatWindow = windowManager.getWindow('divine-chat');
  if (divineChatWindow?.visible && divineChatPanel.isVisible() && divineChatPanel.isInputActive()) {
    // Forward key to divine chat panel - it will handle typing when input is active
    divineChatPanel.handleKeyPress(key);
    // Only consume the key if it's a typing key (single char, Enter, Backspace) and not a system shortcut
    if (!ctrlKey && !metaKey && (key.length === 1 || key === 'Enter' || key === 'Backspace')) {
      return true;
    }
  }

  // Check keyboard registry first (passes metaKey to avoid intercepting system shortcuts like Cmd+V)
  if (keyboardRegistry.handleKey(key, shiftKey, ctrlKey, false, metaKey)) {
    return true;
  }

  // ESC handling
  if (key === 'Escape') {
    // Close inventory
    if (inventoryUI.isOpen()) {
      windowManager.hideWindow('inventory');
      return true;
    }
    // Toggle settings as fallback
    windowManager.toggleWindow('settings');
    return true;
  }

  // Window toggle shortcuts
  const windowShortcuts: Record<string, string> = {
    'r': 'resources', 'R': 'resources',
    'm': 'memory', 'M': 'memory',
    't': 'tile-inspector', 'T': 'tile-inspector',
    'h': 'help', 'H': 'controls',
    'e': 'economy', 'E': 'economy',
    // Divine panels
    'd': 'divine-powers', 'D': 'divine-powers',
    'g': 'divine-chat', 'G': 'divine-chat',
    'a': 'divine-analytics', 'A': 'divine-analytics',
    // Magic panels
    'p': 'skill-tree', 'P': 'skill-tree',
  };

  if (windowShortcuts[key]) {
    windowManager.toggleWindow(windowShortcuts[key]);
    return true;
  }

  // Crafting panel (special handling)
  if (key === 'c' || key === 'C') {
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

  // Inventory
  if (key === 'i' || key === 'I' || key === 'Tab') {
    windowManager.toggleWindow('inventory');
    return true;
  }

  // Help panel
  if (key === 'h' || key === 'H') {
    windowManager.toggleWindow('controls');
    return true;
  }

  // Check placement UI
  if (placementUI.handleKeyDown(key, shiftKey)) {
    return true;
  }

  // Time controls
  const timeEntities = gameLoop.world.query().with('time').executeEntities();
  const timeEntity = timeEntities.length > 0 ? timeEntities[0] as EntityImpl : null;
  const timeComp = timeEntity?.getComponent<any>('time');

  if (shiftKey) {
    // Time skip controls
    if (key === '1' && timeComp) {
      const newTime = (timeComp.timeOfDay + 1) % 24;
      const newPhase = calculatePhase(newTime);
      const newLightLevel = calculateLightLevel(newTime, newPhase);
      (timeComp as any).timeOfDay = newTime;
      (timeComp as any).phase = newPhase;
      (timeComp as any).lightLevel = newLightLevel;
      showNotification(`⏩ Skipped 1 hour → ${Math.floor(newTime)}:00`, '#FFA500');
      return true;
    }

    if (key === '2' && timeComp && timeEntity) {
      gameLoop.world.eventBus.emit({
        type: 'time:day_changed',
        source: timeEntity.id,
        data: { newDay: Math.floor((gameLoop.world.tick * 0.1) / timeComp.dayLength) + 1 },
      });
      showNotification(`⏩ Skipped 1 day`, '#FF8C00');
      return true;
    }

    if (key === '3' && timeComp && timeEntity) {
      for (let i = 0; i < 7; i++) {
        gameLoop.world.eventBus.emit({
          type: 'time:day_changed',
          source: timeEntity.id,
          data: { newDay: Math.floor((gameLoop.world.tick * 0.1) / timeComp.dayLength) + 1 + i },
        });
      }
      showNotification(`⏩ Skipped 7 days`, '#FF4500');
      return true;
    }
  } else {
    // Speed controls
    const speedSettings: Record<string, { multiplier: number; label: string }> = {
      '1': { multiplier: 1, label: '1x' },
      '2': { multiplier: 2, label: '2x' },
      '3': { multiplier: 4, label: '4x' },
      '4': { multiplier: 8, label: '8x' },
    };

    if (speedSettings[key] && timeComp && timeEntity) {
      const { multiplier, label } = speedSettings[key];
      timeEntity.updateComponent('time', (current: any) => ({
        ...current,
        speedMultiplier: multiplier,
      }));
      showNotification(`⏱️ Time speed: ${label}`, '#00CED1');
      return true;
    }
  }

  // Debug: Test memory event (N key)
  if (key === 'n' || key === 'N') {
    const selectedEntity = agentInfoPanel.getSelectedEntity();
    if (selectedEntity && selectedEntity.components.has('agent')) {
      gameLoop.world.eventBus.emit({
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

  // Debug: Queue test behaviors (Q key)
  if (key === 'q' || key === 'Q') {
    const selectedEntityId = agentInfoPanel.getSelectedEntityId();
    if (selectedEntityId) {
      const selectedEntity = gameLoop.world.getEntity(selectedEntityId);
      if (selectedEntity && selectedEntity.components.has('agent')) {
        const agent = selectedEntity.components.get('agent') as any;
        import('@ai-village/core').then(({ queueBehavior }) => {
          let updatedAgent = queueBehavior(agent, 'gather', { label: 'Gather resources', priority: 'normal' });
          updatedAgent = queueBehavior(updatedAgent, 'deposit_items', { label: 'Deposit at storage', priority: 'normal' });
          updatedAgent = queueBehavior(updatedAgent, 'till', { label: 'Till soil', priority: 'normal' });
          updatedAgent = queueBehavior(updatedAgent, 'farm', { label: 'Plant seeds', priority: 'normal', repeats: 3 });
          selectedEntity.components.set('agent', updatedAgent);
          showNotification(`📋 Queued 4 test behaviors`, '#9370DB');
        }).catch(() => {
          showNotification(`❌ Failed to queue behaviors`, '#FF0000');
        });
      } else {
        showNotification(`⚠️ Please select an agent`, '#FFA500');
      }
    } else {
      showNotification(`⚠️ Select an agent first (click one)`, '#FFA500');
    }
    return true;
  }

  // Debug: Spawn test plant (P key)
  if (key === 'p' || key === 'P') {
    (async () => {
      const camera = renderer.getCamera();
      const spawnX = Math.round(camera.x / 16);
      const spawnY = Math.round(camera.y / 16);

      const { PlantComponent } = await import('@ai-village/core');
      const { getPlantSpecies } = await import('@ai-village/world');

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

      (plantComponent as any).entityId = plantEntity.id;

      plantEntity.addComponent(plantComponent);
      plantEntity.addComponent(createPositionComponent(spawnX, spawnY));
      plantEntity.addComponent(createRenderableComponent(speciesId, 'plant'));
      (gameLoop.world as any)._addEntity(plantEntity);

      showNotification(`🌱 Spawned ${species.name} (${stage})`, '#32CD32');
    })();
    return true;
  }

  // Tile action shortcuts
  const selectedTile = tileInspectorPanel.getSelectedTile();

  if ((key === 'w' || key === 'W') && !shiftKey && selectedTile) {
    const { tile, x, y } = selectedTile;
    if (tile.moisture < 100) {
      gameLoop.world.eventBus.emit({ type: 'action:water', source: 'ui', data: { x, y } });
      return true;
    }
  }

  if ((key === 'f' || key === 'F') && selectedTile) {
    const { tile, x, y } = selectedTile;
    if (tile.fertility < 100) {
      gameLoop.world.eventBus.emit({ type: 'action:fertilize', source: 'ui', data: { x, y, fertilizerType: 'compost' } });
      return true;
    }
  }

  return false;
}

// Module-level panels variable (assigned in main())
let panels: UIPanelsResult = null as any;
let devPanel: DevPanel = null as any;
let windowManagerRef: WindowManager | null = null;

/**
 * Handle entity selection by ID (used by both 2D and 3D click handlers).
 * This is called when an entity is selected via the 3D renderer callback.
 */
function handleEntitySelectionById(
  entityId: string | null,
  gameLoop: GameLoop
): void {
  if (!panels || !windowManagerRef) return;

  const {
    agentInfoPanel, animalInfoPanel, plantInfoPanel,
    memoryPanel, relationshipsPanel, agentRosterPanel, animalRosterPanel
  } = panels;

  if (!entityId) {
    // Deselect all
    agentInfoPanel.setSelectedEntity(null);
    animalInfoPanel.setSelectedEntity(null);
    plantInfoPanel.setSelectedEntity(null);
    memoryPanel.setSelectedEntity(null);
    relationshipsPanel.setSelectedEntity(null);
    agentRosterPanel.setSelectedAgent(null);
    animalRosterPanel.setSelectedAnimal(null);
    devPanel?.setSelectedAgentId(null);
    windowManagerRef.hideWindow('agent-info');
    windowManagerRef.hideWindow('animal-info');
    windowManagerRef.hideWindow('plant-info');
    return;
  }

  const entity = gameLoop.world.getEntity(entityId);
  if (!entity) return;

  const hasAgent = entity.components.has('agent');
  const hasAnimal = entity.components.has('animal');
  const hasPlant = entity.components.has('plant');

  if (hasAgent) {
    agentInfoPanel.setSelectedEntity(entity);
    animalInfoPanel.setSelectedEntity(null);
    plantInfoPanel.setSelectedEntity(null);
    memoryPanel.setSelectedEntity(entity);
    relationshipsPanel.setSelectedEntity(entity);
    agentRosterPanel.setSelectedAgent(entity.id);
    animalRosterPanel.setSelectedAnimal(null);
    devPanel?.setSelectedAgentId(entity.id);
    windowManagerRef.showWindow('agent-info');
    windowManagerRef.hideWindow('animal-info');
    windowManagerRef.hideWindow('plant-info');
  } else if (hasAnimal) {
    animalInfoPanel.setSelectedEntity(entity);
    agentInfoPanel.setSelectedEntity(null);
    plantInfoPanel.setSelectedEntity(null);
    memoryPanel.setSelectedEntity(null);
    relationshipsPanel.setSelectedEntity(null);
    agentRosterPanel.setSelectedAgent(null);
    animalRosterPanel.setSelectedAnimal(entity.id);
    devPanel?.setSelectedAgentId(null);
    windowManagerRef.showWindow('animal-info');
    windowManagerRef.hideWindow('agent-info');
    windowManagerRef.hideWindow('plant-info');
  } else if (hasPlant) {
    plantInfoPanel.setSelectedEntity(entity);
    agentInfoPanel.setSelectedEntity(null);
    animalInfoPanel.setSelectedEntity(null);
    memoryPanel.setSelectedEntity(null);
    relationshipsPanel.setSelectedEntity(null);
    agentRosterPanel.setSelectedAgent(null);
    animalRosterPanel.setSelectedAnimal(null);
    devPanel?.setSelectedAgentId(null);
    windowManagerRef.showWindow('plant-info');
    windowManagerRef.hideWindow('agent-info');
    windowManagerRef.hideWindow('animal-info');
  }
}

function handleMouseClick(
  screenX: number,
  screenY: number,
  button: number,
  gameContext: GameContext,
  uiContext: UIContext
): boolean {
  const { gameLoop, renderer, canvas, showNotification } = gameContext;
  const {
    agentInfoPanel, animalInfoPanel, plantInfoPanel, tileInspectorPanel,
    memoryPanel, relationshipsPanel, craftingUI, shopPanel,
    placementUI, windowManager, menuBar, cityStatsWidget, skillTreePanel
  } = uiContext;

  // Left click - window management and menu bar
  if (button === 0) {
    if (menuBar.handleClick(screenX, screenY)) {
      return true;
    }

    // City stats widget click (opens city manager panel)
    if (cityStatsWidget.handleClick(screenX, screenY, canvas.width, canvas.height)) {
      return true;
    }

    if (windowManager.handleDragStart(screenX, screenY)) {
      return true;
    }

    if (windowManager.handleClick(screenX, screenY)) {
      return true;
    }
  }

  // DevPanel click-to-place mode
  if (devPanel.isClickToPlaceActive() && button === 0) {
    const camera = renderer.getCamera();
    const worldPos = camera.screenToWorld(screenX, screenY);
    if (devPanel.handleWorldClick(worldPos.x, worldPos.y)) {
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

  // Left click - select entities
  if (button === 0) {
    // In 3D mode, forward click to 3D renderer for entity selection
    if (renderer.is3DActive()) {
      renderer.forward3DClick(screenX, screenY);
      // 3D selection is handled via callback set up in main()
      return true;
    }

    const entity = renderer.findEntityAtScreenPosition(screenX, screenY, gameLoop.world);
    if (entity) {
      const hasAgent = entity.components.has('agent');
      const hasAnimal = entity.components.has('animal');
      const hasPlant = entity.components.has('plant');
      const hasResource = entity.components.has('resource');
      const hasShop = entity.components.has('shop');
      const hasBuilding = entity.components.has('building');

      if (hasShop && hasBuilding) {
        const selectedAgent = agentInfoPanel.getSelectedEntity();
        if (selectedAgent) {
          shopPanel.openShop(entity.id, selectedAgent.id);
          return true;
        } else {
          showNotification('Select an agent first to trade with shops', '#FFA500');
          return true;
        }
      } else if (hasAgent) {
        agentInfoPanel.setSelectedEntity(entity);
        animalInfoPanel.setSelectedEntity(null);
        plantInfoPanel.setSelectedEntity(null);
        memoryPanel.setSelectedEntity(entity);
        relationshipsPanel.setSelectedEntity(entity);
        skillTreePanel.setSelectedEntity(entity);
        panels.agentRosterPanel.setSelectedAgent(entity.id);
        panels.animalRosterPanel.setSelectedAnimal(null);
        devPanel.setSelectedAgentId(entity.id);
        if (windowManager.getWindow('crafting')?.visible) {
          craftingUI.setActiveAgent(entity.id);
        }
        windowManager.showWindow('agent-info');
        windowManager.hideWindow('animal-info');
        windowManager.hideWindow('plant-info');
        return true;
      } else if (hasAnimal) {
        animalInfoPanel.setSelectedEntity(entity);
        agentInfoPanel.setSelectedEntity(null);
        plantInfoPanel.setSelectedEntity(null);
        memoryPanel.setSelectedEntity(null);
        relationshipsPanel.setSelectedEntity(null);
        skillTreePanel.setSelectedEntity(null);
        panels.agentRosterPanel.setSelectedAgent(null);
        panels.animalRosterPanel.setSelectedAnimal(entity.id);
        devPanel.setSelectedAgentId(null);
        windowManager.showWindow('animal-info');
        windowManager.hideWindow('agent-info');
        windowManager.hideWindow('plant-info');
        return true;
      } else if (hasPlant) {
        plantInfoPanel.setSelectedEntity(entity);
        agentInfoPanel.setSelectedEntity(null);
        animalInfoPanel.setSelectedEntity(null);
        memoryPanel.setSelectedEntity(null);
        relationshipsPanel.setSelectedEntity(null);
        skillTreePanel.setSelectedEntity(null);
        panels.agentRosterPanel.setSelectedAgent(null);
        panels.animalRosterPanel.setSelectedAnimal(null);
        devPanel.setSelectedAgentId(null);
        windowManager.showWindow('plant-info');
        windowManager.hideWindow('agent-info');
        windowManager.hideWindow('animal-info');
        return true;
      } else if (hasResource) {
        agentInfoPanel.setSelectedEntity(null);
        animalInfoPanel.setSelectedEntity(null);
        plantInfoPanel.setSelectedEntity(null);
        memoryPanel.setSelectedEntity(null);
        relationshipsPanel.setSelectedEntity(null);
        skillTreePanel.setSelectedEntity(null);
        panels.agentRosterPanel.setSelectedAgent(null);
        panels.animalRosterPanel.setSelectedAnimal(null);
        devPanel.setSelectedAgentId(null);
        windowManager.hideWindow('agent-info');
        windowManager.hideWindow('animal-info');
        windowManager.hideWindow('plant-info');
        return true;
      }
    } else {
      // Click on empty space - deselect all
      agentInfoPanel.setSelectedEntity(null);
      animalInfoPanel.setSelectedEntity(null);
      plantInfoPanel.setSelectedEntity(null);
      memoryPanel.setSelectedEntity(null);
      relationshipsPanel.setSelectedEntity(null);
      skillTreePanel.setSelectedEntity(null);
      panels.agentRosterPanel.setSelectedAgent(null);
      panels.animalRosterPanel.setSelectedAnimal(null);
      devPanel.setSelectedAgentId(null);
      windowManager.hideWindow('agent-info');
      windowManager.hideWindow('animal-info');
      windowManager.hideWindow('plant-info');
    }
  }

  return false;
}

// ============================================================================
// DEBUG API SETUP
// ============================================================================

function setupDebugAPI(
  gameLoop: GameLoop,
  renderer: Renderer,
  placementUI: BuildingPlacementUI,
  blueprintRegistry: BuildingBlueprintRegistry,
  agentInfoPanel: AgentInfoPanel,
  animalInfoPanel: AnimalInfoPanel,
  resourcesPanel: ResourcesPanel,
  devPanelInstance: DevPanel,
  agentDebugManager: AgentDebugManager,
  skillTreePanel: SkillTreePanel
) {
  (window as any).game = {
    world: gameLoop.world,
    gameLoop,
    renderer,
    placementUI,
    buildingRegistry: blueprintRegistry,
    agentInfoPanel,
    animalInfoPanel,
    resourcesPanel,
    devPanel: devPanelInstance,
    debugManager: agentDebugManager,

    // Skill management API
    grantSkillXP: (agentId: string, amount: number) => {
      const agent = gameLoop.world.getEntity(agentId);
      if (!agent) {
        console.error(`Agent ${agentId} not found`);
        return false;
      }
      const skills = agent.getComponent('skills' as any);
      if (!skills) {
        console.error(`Agent ${agentId} has no skills component`);
        return false;
      }

      const skillNames = Object.keys((skills as any).levels);
      if (skillNames.length === 0) {
        console.error(`Agent ${agentId} has no skills`);
        return false;
      }

      // Grant XP to a random skill
      const randomSkill = skillNames[Math.floor(Math.random() * skillNames.length)]!;
      const currentLevel = (skills as any).levels[randomSkill] || 0;
      const newLevel = currentLevel + (amount / 100); // 100 XP = 1 level

      (gameLoop.world as any).updateComponent(agentId, 'skills', (current: any) => ({
        ...current,
        levels: {
          ...current.levels,
          [randomSkill]: newLevel,
        },
      }));

      console.log(`Granted ${amount} XP to ${agentId} (${randomSkill}: ${currentLevel.toFixed(1)} → ${newLevel.toFixed(1)})`);
      return true;
    },

    getAgentSkills: (agentId: string) => {
      const agent = gameLoop.world.getEntity(agentId);
      if (!agent) return null;
      const skills = agent.getComponent('skills' as any);
      return skills ? (skills as any).levels : null;
    },

    setSelectedAgent: (agentId: string | null) => {
      devPanelInstance.setSelectedAgentId(agentId);
      if (agentId) {
        const agent = gameLoop.world.getEntity(agentId);
        if (agent) {
          agentInfoPanel.setSelectedEntity(agent);
          skillTreePanel.setSelectedEntity(agent);
        }
      } else {
        agentInfoPanel.setSelectedEntity(null);
        skillTreePanel.setSelectedEntity(null);
      }
    },

    getSelectedAgent: () => {
      return devPanelInstance.getSelectedAgentId();
    },

    // Migration API for syncing local saves to server
    checkMigrationStatus: async () => {
      const storage = saveLoadService.getStorageBackend();
      return checkMigrationStatus(storage);
    },

    migrateLocalSaves: async (playerId?: string) => {
      console.log('[Migration] === STARTING MIGRATION ===');
      const storage = saveLoadService.getStorageBackend();
      console.log('[Migration] Storage backend:', storage ? storage.constructor.name : 'NULL');
      if (!storage) {
        throw new Error('No storage backend configured');
      }

      // Get player ID from localStorage (same as what's used for server sync)
      const storedPlayerId = localStorage.getItem('ai-village-player-id');
      const pid = playerId || storedPlayerId || `player:${crypto.randomUUID()}`;
      console.log(`[Migration] Using player ID: ${pid}`);

      // List saves first to see what we have
      const saves = await storage.list();
      console.log(`[Migration] Found ${saves.length} saves in storage`);

      // Load first save to check structure
      if (saves.length > 0) {
        const firstSave = await storage.load(saves[0].key);
        console.log(`[Migration] First save key: ${saves[0].key}`);
        console.log(`[Migration] First save universes:`, firstSave?.universes?.length || 0);
        if (firstSave?.universes?.[0]) {
          console.log(`[Migration] First universe ID:`, firstSave.universes[0].identity?.id);
        }
      }

      console.log('[Migration] Calling migrateLocalSaves function...');
      try {
        const result = await migrateLocalSaves(storage, pid, {
          onProgress: (progress) => {
            console.log(`[Migration] Progress: ${progress.uploaded}/${progress.totalSaves} uploaded, ${progress.skipped} skipped, ${progress.failed} failed`);
          },
        });
        console.log('[Migration] === MIGRATION COMPLETE ===', result);
        return result;
      } catch (error) {
        console.error('[Migration] === MIGRATION ERROR ===', error);
        throw error;
      }
    },

    // Diagnostic migration - tests each step independently
    diagnoseMigration: async () => {
      console.log('[Diagnose] === STEP 1: Storage Backend ===');
      const storage = saveLoadService.getStorageBackend();
      if (!storage) {
        console.error('[Diagnose] No storage backend!');
        return;
      }
      console.log('[Diagnose] Storage:', storage.constructor.name);

      console.log('[Diagnose] === STEP 2: List Saves ===');
      const saves = await storage.list();
      console.log('[Diagnose] Found', saves.length, 'saves');
      if (saves.length === 0) {
        console.log('[Diagnose] No saves to migrate');
        return;
      }

      console.log('[Diagnose] === STEP 3: Load First Save ===');
      const firstSave = await storage.load(saves[0].key);
      console.log('[Diagnose] First save loaded:', !!firstSave);
      if (!firstSave) {
        console.error('[Diagnose] Failed to load first save');
        return;
      }
      const universeId = firstSave.universes?.[0]?.identity?.id;
      console.log('[Diagnose] Universe ID:', universeId);

      console.log('[Diagnose] === STEP 4: Check Server ===');
      const serverUrl = 'http://localhost:3001/api/multiverse/stats';
      try {
        const statsResp = await fetch(serverUrl);
        const stats = await statsResp.json();
        console.log('[Diagnose] Server stats:', stats);
      } catch (e: any) {
        console.error('[Diagnose] Server not available:', e.message);
        return;
      }

      console.log('[Diagnose] === STEP 5: Check Universe on Server ===');
      try {
        const univResp = await fetch(`http://localhost:3001/api/universe/${universeId}`);
        console.log('[Diagnose] Universe check status:', univResp.status);
        if (univResp.status === 404) {
          console.log('[Diagnose] Universe does not exist on server');
        } else {
          const univData = await univResp.json();
          console.log('[Diagnose] Universe data:', univData);
        }
      } catch (e: any) {
        console.error('[Diagnose] Failed to check universe:', e.message);
      }

      console.log('[Diagnose] === STEP 6: Test Snapshot Upload ===');
      const playerId = localStorage.getItem('ai-village-player-id') || 'test-player';

      // Try creating universe if it doesn't exist
      console.log('[Diagnose] Creating test universe...');
      try {
        const createResp = await fetch('http://localhost:3001/api/universe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: universeId,
            name: 'Migration Test Universe',
            ownerId: playerId,
            isPublic: true,
          }),
        });
        console.log('[Diagnose] Create response status:', createResp.status);
        const createData = await createResp.json();
        console.log('[Diagnose] Create response:', createData);
      } catch (e: any) {
        console.error('[Diagnose] Failed to create universe:', e.message);
      }

      // Try uploading a snapshot
      console.log('[Diagnose] Uploading snapshot...');
      const tick = parseInt(firstSave.universes?.[0]?.time?.universeTick || '0', 10);
      console.log('[Diagnose] Snapshot tick:', tick);
      console.log('[Diagnose] Snapshot size:', JSON.stringify(firstSave).length, 'bytes');

      try {
        const uploadResp = await fetch(`http://localhost:3001/api/universe/${universeId}/snapshot`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            snapshot: firstSave,
            tick,
            day: 1,
            type: 'manual',
          }),
        });
        console.log('[Diagnose] Upload response status:', uploadResp.status);
        const uploadData = await uploadResp.text();
        console.log('[Diagnose] Upload response:', uploadData.substring(0, 500));
      } catch (e: any) {
        console.error('[Diagnose] Failed to upload snapshot:', e.message);
      }

      console.log('[Diagnose] === COMPLETE ===');
    },

    // Analyze what's taking up space in saves
    analyzeSaveSize: async () => {
      console.log('[Analyze] === SAVE SIZE ANALYSIS ===');
      const storage = saveLoadService.getStorageBackend();
      if (!storage) {
        console.error('[Analyze] No storage backend!');
        return;
      }

      const saves = await storage.list();
      if (saves.length === 0) {
        console.log('[Analyze] No saves found');
        return;
      }

      const save = await storage.load(saves[0].key);
      if (!save) {
        console.error('[Analyze] Could not load save');
        return;
      }

      const universe = save.universes?.[0];
      if (!universe) {
        console.error('[Analyze] No universe in save');
        return;
      }

      console.log('[Analyze] Total save size:', JSON.stringify(save).length, 'bytes');
      console.log('[Analyze] Universe size:', JSON.stringify(universe).length, 'bytes');
      console.log('[Analyze] Entity count:', universe.entities?.length || 0);

      // Analyze by component type
      const componentSizes: Record<string, { count: number; totalSize: number }> = {};
      for (const entity of universe.entities || []) {
        for (const component of entity.components || []) {
          const type = component.type || 'unknown';
          const size = JSON.stringify(component).length;
          if (!componentSizes[type]) {
            componentSizes[type] = { count: 0, totalSize: 0 };
          }
          componentSizes[type].count++;
          componentSizes[type].totalSize += size;
        }
      }

      // Sort by size
      const sorted = Object.entries(componentSizes)
        .sort((a, b) => b[1].totalSize - a[1].totalSize)
        .slice(0, 20);

      console.log('[Analyze] Top 20 components by size:');
      for (const [type, info] of sorted) {
        const kb = (info.totalSize / 1024).toFixed(1);
        console.log(`  ${type}: ${info.count} instances, ${kb}KB total`);
      }

      // Check worldState
      if (universe.worldState) {
        console.log('[Analyze] WorldState size:', JSON.stringify(universe.worldState).length, 'bytes');
        for (const [key, value] of Object.entries(universe.worldState)) {
          const size = JSON.stringify(value).length;
          if (size > 10000) {
            console.log(`  ${key}: ${(size / 1024).toFixed(1)}KB`);
          }
        }
      }

      console.log('[Analyze] === END ===');
    },

    // Soul corruption cleanup API
    scanCorruptedSouls: () => {
      const result = devActionsService.scanCorruptedSouls();
      if (result.success && result.data) {
        const data = result.data as { count: number; souls: any[] };
        console.log(`[SoulCleanup] Found ${data.count} corrupted souls`);
        if (data.count > 0) {
          console.log('[SoulCleanup] Corrupted souls:');
          for (const soul of data.souls) {
            const issues = [];
            if (soul.purposeCorrupted) issues.push('purpose');
            if (soul.destinyCorrupted) issues.push('destiny');
            console.log(`  - ${soul.soulName} (${soul.soulId.substring(0, 16)}...): ${issues.join(', ')}`);
          }
        }
        return data;
      }
      console.error('[SoulCleanup] Failed to scan:', result.error);
      return null;
    },

    cleanCorruptedSouls: () => {
      const result = devActionsService.cleanCorruptedSouls();
      if (result.success && result.data) {
        const data = result.data as { cleanedCount: number; message: string };
        console.log(`[SoulCleanup] ${data.message}`);
        if (data.cleanedCount > 0) {
          console.log('[SoulCleanup] TIP: Save your game to persist these fixes!');
        }
        return data;
      }
      console.error('[SoulCleanup] Failed to clean:', result.error);
      return null;
    },

    // Diagnostics API
    diagnostics: {
      enable: () => {
        (window as any).__DIAGNOSTICS_ENABLED__ = true;
        console.log('[Diagnostics] Enabled - invalid property/method access will be tracked');
      },
      disable: () => {
        (window as any).__DIAGNOSTICS_ENABLED__ = false;
        console.log('[Diagnostics] Disabled');
      },
      isEnabled: () => {
        return (window as any).__DIAGNOSTICS_ENABLED__ === true;
      },
      summary: () => {
        console.log('[Diagnostics] Visit http://localhost:8766/admin and select Diagnostics tab');
        console.log('[Diagnostics] Or use curl: curl http://localhost:8766/admin/queries/diagnostics/summary?format=json');
      },
      exportJSON: () => {
        console.log('[Diagnostics] Visit: http://localhost:8766/admin/queries/diagnostics/export?format=json');
        console.log('[Diagnostics] Or use: curl http://localhost:8766/admin/queries/diagnostics/export?format=json > diagnostics.json');
      }
    },
  };

  (window as any).__gameTest = {
    world: gameLoop.world,
    gameLoop,
    renderer,
    eventBus: gameLoop.world.eventBus,
    placementUI,
    blueprintRegistry,
    getAllBlueprints: () => blueprintRegistry.getAll(),
    getBlueprintsByCategory: (category: string) => blueprintRegistry.getByCategory(category as any),
    getUnlockedBlueprints: () => blueprintRegistry.getUnlocked(),
    // Soul reincarnation testing
    createAncientSouls: (count: number = 3) => {
      const soulSystem = gameLoop.systemRegistry.get('soul_creation') as SoulCreationSystem;
      if (!soulSystem) {
        console.error('[__gameTest] SoulCreationSystem not found');
        return;
      }
      soulSystem.createAncientSouls(gameLoop.world, count);
    },
    placeBuilding: (blueprintId: string, x: number, y: number) => {
      gameLoop.world.eventBus.emit({
        type: 'building:placement:confirmed',
        source: 'test',
        data: { blueprintId, position: { x, y }, rotation: 0 }
      });
    },
    getBuildings: () => {
      const buildings: any[] = [];
      const entities = gameLoop.world.query().with('building').executeEntities();
      entities.forEach(entity => {
        const building = entity.getComponent('building');
        const position = entity.getComponent('position');
        buildings.push({
          entityId: entity.id,
          type: (building as any).buildingType,
          position: position ? { x: (position as any).x, y: (position as any).y } : null,
          building: building
        });
      });
      return buildings;
    },
    getTier2Stations: () => {
      return blueprintRegistry.getAll().filter(bp => bp.tier === 2).map(bp => ({
        id: bp.id, name: bp.name, category: bp.category, tier: bp.tier,
        width: bp.width, height: bp.height, resourceCost: bp.resourceCost
      }));
    },
    getTier3Stations: () => {
      return blueprintRegistry.getAll().filter(bp => bp.tier === 3).map(bp => ({
        id: bp.id, name: bp.name, category: bp.category, tier: bp.tier,
        width: bp.width, height: bp.height, resourceCost: bp.resourceCost
      }));
    },
    getBlueprintDetails: (id: string) => {
      const blueprint = blueprintRegistry.get(id);
      return {
        id: blueprint.id, name: blueprint.name, description: blueprint.description,
        category: blueprint.category, width: blueprint.width, height: blueprint.height,
        tier: blueprint.tier, resourceCost: blueprint.resourceCost,
        functionality: blueprint.functionality, buildTime: blueprint.buildTime,
        unlocked: blueprint.unlocked
      };
    },
    getCraftingStations: () => {
      return blueprintRegistry.getAll()
        .filter(bp => bp.functionality.some(f => f.type === 'crafting'))
        .map(bp => ({
          id: bp.id, name: bp.name, tier: bp.tier,
          recipes: bp.functionality.filter(f => f.type === 'crafting').flatMap(f => (f as any).recipes),
          speed: bp.functionality.filter(f => f.type === 'crafting').map(f => (f as any).speed)[0] || 1.0
        }));
    },
    agentInfoPanel,
    animalInfoPanel,
    resourcesPanel,

    // Game Introspection API - runtime entity introspection with schema validation
    introspection: (gameLoop.world as any).__introspectionAPI || null,
  };

  (window as any).promptLogger = promptLogger;
}

// ============================================================================
// MAIN FUNCTION
// ============================================================================

async function main() {
  const statusEl = document.getElementById('status');
  const canvas = document.getElementById('canvas') as HTMLCanvasElement;

  if (!canvas) {
    throw new Error('Canvas element not found');
  }

  // Track intervals for cleanup to prevent memory leaks
  const intervalIds: ReturnType<typeof setInterval>[] = [];

  // Check if SharedWorker mode is enabled
  const useSharedWorker = import.meta.env.VITE_USE_SHARED_WORKER === 'true';

  // Create game loop (either direct or via SharedWorker bridge)
  let gameLoop: GameLoop;
  let isSharedWorkerMode = false;

  if (useSharedWorker) {
    console.log('[Main] Using SharedWorker architecture');
    const { gameBridge } = await import('@ai-village/shared-worker');
    await gameBridge.init();
    gameLoop = gameBridge.gameLoop;
    isSharedWorkerMode = true;
    console.log('[Main] SharedWorker bridge initialized');
  } else {
    console.log('[Main] Using direct GameLoop');
    gameLoop = new GameLoop();
    isSharedWorkerMode = false;
  }

  // Create agent debug manager for deep logging
  const agentDebugManager = new AgentDebugManager('logs/agent-debug');

  // Create settings panel
  const settingsPanel = new SettingsPanel();

  // Handle first run - NOTE: We skip the settings panel blocking and proceed directly
  // to universe creation. Settings can be configured later via ESC key.
  const isFirstRun = settingsPanel.getIsFirstRun();

  if (isFirstRun) {
    // Don't block - let the flow continue to universe creation
  }


  const settings = settingsPanel.getSettings();

  // Create LLM provider - use ProxyLLMProvider by default for server-side API calls and rate limiting
  let llmProvider: LLMProvider;

  // Check if we should use the proxy provider (default: yes, unless settings explicitly configure direct provider)
  const useProxy = settings.llm.provider !== 'openai-compat-direct' && settings.llm.provider !== 'ollama';

  if (useProxy) {
    // Default: Use ProxyLLMProvider for server-side API calls with automatic fallback
    llmProvider = new ProxyLLMProvider('http://localhost:8766');
  } else {
    // Legacy mode: Direct client-side API calls (for local Ollama or explicit settings)
    const providers: LLMProvider[] = [];

    // Check for API keys in .env file (legacy client-side mode)
    const groqApiKey = import.meta.env.VITE_GROQ_API_KEY || import.meta.env.GROQ_API_KEY;
    const cerebrasApiKey = import.meta.env.VITE_CEREBRAS_API_KEY || import.meta.env.CEREBRAS_API_KEY;

    // 1. Primary: Cerebras with Qwen 3-32B
    if (cerebrasApiKey) {
      providers.push(new OpenAICompatProvider(
        'qwen-3-32b',
        'https://api.cerebras.ai/v1',
        cerebrasApiKey
      ));
    }

    // 2. Secondary: Groq with Qwen 3-32B (backup for provider 1)
    if (groqApiKey) {
      providers.push(new OpenAICompatProvider(
        'qwen/qwen3-32b',
        'https://api.groq.com/openai/v1',
        groqApiKey
      ));
    }

    // 3. Tertiary: Cerebras with GPT-OSS-120B
    if (cerebrasApiKey) {
      providers.push(new OpenAICompatProvider(
        'gpt-oss-120b',
        'https://api.cerebras.ai/v1',
        cerebrasApiKey
      ));
    }

    // 4. Quaternary: Groq with GPT-OSS-120B (last resort)
    if (groqApiKey) {
      providers.push(new OpenAICompatProvider(
        'openai/gpt-oss-120b',
        'https://api.groq.com/openai/v1',
        groqApiKey
      ));
    }

    // Fallback to settings-based provider if no env keys
    if (providers.length === 0) {
      if (settings.llm.provider === 'openai-compat' || settings.llm.provider === 'openai-compat-direct') {
        providers.push(new OpenAICompatProvider(
          settings.llm.model,
          settings.llm.baseUrl,
          settings.llm.apiKey
        ));
      } else {
        providers.push(new OllamaProvider(settings.llm.model, settings.llm.baseUrl));
      }
    }

    // Use FallbackProvider if we have multiple providers, otherwise use single provider
    if (providers.length > 1) {
      llmProvider = new FallbackProvider(providers, {
        retryAfterMs: 60000,        // Retry failed provider after 1 minute
        maxConsecutiveFailures: 3,   // Disable after 3 consecutive failures
        logFallbacks: true,
      });
    } else {
      llmProvider = providers[0];
    }
  }

  // Check LLM availability with timeout
  const checkAvailability = async (provider: LLMProvider): Promise<boolean> => {
    let timeoutId: number;
    return Promise.race([
      provider.isAvailable().then(result => {
        clearTimeout(timeoutId);
        return result;
      }),
      new Promise<boolean>((resolve) => {
        timeoutId = setTimeout(() => {
          console.warn('[DEMO] LLM availability check timed out after 2s');
          resolve(false);
        }, 2000) as unknown as number;
      })
    ]);
  };

  let isLLMAvailable = await checkAvailability(llmProvider);

  // If proxy mode failed, fall back to direct mode with configured API keys
  if (!isLLMAvailable && useProxy) {
    console.warn('[DEMO] Proxy server unavailable, falling back to direct LLM mode...');

    // Try direct providers with env API keys
    const groqApiKey = import.meta.env.VITE_GROQ_API_KEY || import.meta.env.GROQ_API_KEY;
    const cerebrasApiKey = import.meta.env.VITE_CEREBRAS_API_KEY || import.meta.env.CEREBRAS_API_KEY;

    const directProviders: LLMProvider[] = [];

    if (cerebrasApiKey) {
      directProviders.push(new OpenAICompatProvider(
        'qwen-3-32b',
        'https://api.cerebras.ai/v1',
        cerebrasApiKey
      ));
    }
    if (groqApiKey) {
      directProviders.push(new OpenAICompatProvider(
        'qwen/qwen3-32b',
        'https://api.groq.com/openai/v1',
        groqApiKey
      ));
    }

    // Also try settings-based provider
    if (directProviders.length === 0 && settings.llm.apiKey) {
      directProviders.push(new OpenAICompatProvider(
        settings.llm.model,
        settings.llm.baseUrl,
        settings.llm.apiKey
      ));
    }

    if (directProviders.length > 0) {
      llmProvider = directProviders.length > 1
        ? new FallbackProvider(directProviders, {
            retryAfterMs: 60000,
            maxConsecutiveFailures: 3,
            logFallbacks: true,
          })
        : directProviders[0];

      isLLMAvailable = await checkAvailability(llmProvider);
      if (isLLMAvailable) {
        console.log('[DEMO] Direct LLM mode available, continuing with fallback provider');
      }
    }
  }

  let llmQueue: LLMDecisionQueue | null = null;
  let promptBuilder: StructuredPromptBuilder | null = null;
  let talkerPromptBuilder: TalkerPromptBuilder | null = null;
  let executorPromptBuilder: ExecutorPromptBuilder | null = null;

  if (isLLMAvailable) {
    llmQueue = new LLMDecisionQueue(llmProvider, 1);
    promptBuilder = new StructuredPromptBuilder();
    talkerPromptBuilder = new TalkerPromptBuilder();
    executorPromptBuilder = new ExecutorPromptBuilder();

    // Wire up checkpoint naming service with LLM
    checkpointNamingService.setProvider(llmProvider);
  } else {
    console.warn(`[DEMO] LLM not available at ${settings.llm.baseUrl}`);
    console.warn('[DEMO] Press ESC to open settings and configure LLM provider');
    console.warn('[DEMO] Checkpoints will use default names (e.g., "Day 5")');
  }

  // Initialize storage backend for save/load system FIRST
  const storage = new IndexedDBStorage('ai-village-saves');
  saveLoadService.setStorage(storage);

  // Enable server sync for multiverse persistence
  // Get or create a persistent player ID
  let playerId = localStorage.getItem('ai-village-player-id');
  if (!playerId) {
    playerId = `player:${crypto.randomUUID()}`;
    localStorage.setItem('ai-village-player-id', playerId);
    console.log('[Demo] Created new player ID:', playerId);
  }

  // Try to enable server sync (non-blocking - game works without server)
  saveLoadService.enableServerSync(playerId).then(enabled => {
    if (enabled) {
      console.log('[Demo] Multiverse server sync enabled - saves will be uploaded to server');
    } else {
      console.log('[Demo] Multiverse server not available - saves are local only');
    }
  }).catch(error => {
    console.warn('[Demo] Failed to enable server sync:', error);
  });

  // Check for ?fresh=1 URL parameter to force a new game (skip loading saves)
  const urlParams = new URLSearchParams(window.location.search);
  const forceNewGame = urlParams.get('fresh') === '1';
  if (forceNewGame) {
    console.log('[Demo] ?fresh=1 detected - forcing new game (ignoring saved checkpoints)');
  }

  // Check for existing saves and auto-load the most recent one
  let existingSaves: any[] = [];
  try {
    // Add timeout to prevent hanging on IndexedDB issues
    const listSavesPromise = saveLoadService.listSaves();
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('listSaves timeout after 5s')), 5000)
    );
    const allSaves = await Promise.race([listSavesPromise, timeoutPromise]);
    // Filter out any undefined/null entries
    existingSaves = allSaves.filter(save => save != null && save.name && save.key);
  } catch (error) {
    console.warn('[Demo] Could not load existing saves (this is normal on first run or if IndexedDB is blocked):', error);
    console.log('[Demo] Starting fresh game...');
    existingSaves = [];
  }
  let loadedCheckpoint = false;
  let universeSelection: { type: 'new' | 'load'; magicParadigm?: string; checkpointKey?: string };
  let universeConfigScreen: UniverseConfigScreen | null = null;
  let universeConfig: UniverseConfig | null = null;  // Store full config for scenario access

  // Create god-crafted discovery system first (needed by TerrainGenerator)
  const godCraftedDiscoverySystem = new GodCraftedDiscoverySystem({
    universeId: 'universe:main',
    spawnRate: 0.01, // 1% of chunks contain god-crafted content
    maxPowerLevel: 10, // Maximum power level for spawned content
    seed: Date.now(), // Seed for deterministic chunk-based spawning
  });
  // Register the system immediately after creation
  gameLoop.systemRegistry.register(godCraftedDiscoverySystem);
  console.log('[Main] God-crafted discovery system registered (1% spawn rate per chunk, max power level 10)');

  // Create ChunkManager and TerrainGenerator BEFORE loading saves
  // so terrain can be restored from checkpoints
  const terrainGenerator = new TerrainGenerator('phase8-demo', godCraftedDiscoverySystem);
  const chunkManager = new ChunkManager(3);
  (gameLoop.world as any).setChunkManager(chunkManager);
  (gameLoop.world as any).setTerrainGenerator(terrainGenerator);

  // Create BackgroundChunkGenerator for asynchronous chunk pre-generation
  // Used by SoulCreationSystem to pre-generate chunks during soul ceremonies
  const { BackgroundChunkGenerator, ChunkGenerationWorkerPool } = await import('@ai-village/world');

  // Create worker pool for background chunk generation (2 workers)
  const workerPool = new ChunkGenerationWorkerPool(
    2,  // Number of workers
    'phase8-demo',  // Seed
    undefined  // No planet config for demo
  );
  console.log('[Main] ChunkGenerationWorkerPool created (2 workers)');

  const backgroundChunkGenerator = new BackgroundChunkGenerator(
    chunkManager,
    terrainGenerator,
    2,  // throttleInterval: process 1 chunk every 2 ticks (100ms at 20 TPS)
    18, // minTPS: pause if TPS drops below 18
    19, // resumeTPS: resume when TPS recovers to 19+
    workerPool  // Worker pool for background generation
  );
  (gameLoop.world as any).setBackgroundChunkGenerator(backgroundChunkGenerator);
  console.log('[Main] BackgroundChunkGenerator created (throttle: 2 ticks, pause TPS: <18, resume TPS: 19+, with worker pool)');

  // Show Universe Browser Screen - the gateway to the multiverse
  // This screen allows players to:
  // - Create a new universe (leads to UniverseConfigScreen)
  // - Load a local save
  // - Browse and load from the multiverse server
  const browserResult = await new Promise<UniverseBrowserResult>((resolve) => {
    const browserScreen = new UniverseBrowserScreen();
    browserScreen.show((result) => {
      browserScreen.hide();
      resolve(result);
    });
  });

  if (browserResult.action === 'create_new') {
    // Show universe configuration screen for new universe
    universeSelection = await new Promise<{ type: 'new'; magicParadigm: string }>((resolve) => {
      universeConfigScreen = new UniverseConfigScreen();
      universeConfigScreen.show((config) => {
        universeConfig = config;  // Store full config for scenario access
        resolve({ type: 'new', magicParadigm: config.magicParadigmId || 'none' });
      });
    });
  } else if (browserResult.action === 'load_local' && browserResult.saveKey) {
    // Load a local save
    const result = await saveLoadService.load(browserResult.saveKey, gameLoop.world);
    if (result.success) {
      loadedCheckpoint = true;
      universeSelection = { type: 'load', checkpointKey: browserResult.saveKey };
    } else {
      console.error(`[Demo] Failed to load checkpoint: ${result.error}`);
      // Fall back to showing universe creation screen
      universeSelection = await new Promise<{ type: 'new'; magicParadigm: string }>((resolve) => {
        universeConfigScreen = new UniverseConfigScreen();
        universeConfigScreen.show((config) => {
          universeConfig = config;
          resolve({ type: 'new', magicParadigm: config.magicParadigmId || 'none' });
        });
      });
    }
  } else if (browserResult.action === 'load_server' && browserResult.universeId) {
    // Load from multiverse server
    // TODO: Implement server snapshot loading
    // For now, fetch the snapshot and apply it to the world
    try {
      const API_BASE = 'http://localhost:3001/api';
      const tick = browserResult.snapshotTick ?? 'latest';
      const response = await fetch(`${API_BASE}/universe/${browserResult.universeId}/snapshot/${tick}`);
      if (!response.ok) throw new Error('Failed to fetch snapshot from server');
      const data = await response.json();

      if (data.snapshot) {
        // Apply the snapshot to the world
        // The snapshot is a full SaveFile, so we can use the same load logic
        const worldImpl = gameLoop.world as any;
        worldImpl._entities.clear();

        // Import worldSerializer for deserialization
        const { worldSerializer } = await import('@ai-village/core');
        for (const universeSnapshot of data.snapshot.universes || []) {
          await worldSerializer.deserializeWorld(universeSnapshot, gameLoop.world);
        }

        loadedCheckpoint = true;
        universeSelection = { type: 'load', checkpointKey: `server:${browserResult.universeId}:${tick}` };
        console.log(`[Demo] Loaded universe ${browserResult.universeId} at tick ${tick} from server`);
      } else {
        throw new Error('No snapshot data in response');
      }
    } catch (error) {
      console.error('[Demo] Failed to load from server:', error);
      // Fall back to showing universe creation screen
      universeSelection = await new Promise<{ type: 'new'; magicParadigm: string }>((resolve) => {
        universeConfigScreen = new UniverseConfigScreen();
        universeConfigScreen.show((config) => {
          universeConfig = config;
          resolve({ type: 'new', magicParadigm: config.magicParadigmId || 'none' });
        });
      });
    }
  } else {
    // Fallback - shouldn't happen but just in case
    universeSelection = await new Promise<{ type: 'new'; magicParadigm: string }>((resolve) => {
      universeConfigScreen = new UniverseConfigScreen();
      universeConfigScreen.show((config) => {
        universeConfig = config;
        resolve({ type: 'new', magicParadigm: config.magicParadigmId || 'none' });
      });
    });
  }

  // Register settings change handler NOW (after storage is initialized)
  settingsPanel.setOnSettingsChange(async () => {
    // Guard: Only reload if gameLoop is fully initialized
    // This prevents reload loops during HMR or initialization
    if (!gameLoop || !gameLoop.world) {
      console.warn('[Demo] Settings changed but gameLoop not ready - skipping save');
      window.location.reload();
      return;
    }

    // Take a snapshot (save) before reload to preserve agents and world state
    // This is part of the time travel/multiverse checkpoint system
    try {
      const timeComp = gameLoop.world.query().with('time').executeEntities()[0]?.getComponent<any>('time');
      const day = timeComp?.day || 0;
      const saveName = `settings_reload_day${day}_${new Date().toISOString().split('T')[1].split('.')[0].replace(/:/g, '-')}`;
      await saveLoadService.save(gameLoop.world, { name: saveName });
    } catch (error) {
      console.error('[Demo] Failed to save before reload:', error);
      // Continue with reload even if save fails
    }
    window.location.reload();
  });

  // Register all systems (skip in SharedWorker mode - worker handles this)
  let systemsResult: SystemsResult;

  if (!isSharedWorkerMode) {
    systemsResult = await registerAllSystems(
      gameLoop,
      llmQueue,
      promptBuilder,
      agentDebugManager,
      talkerPromptBuilder,
      executorPromptBuilder,
      chunkManager,
      terrainGenerator
    );
  } else {
    // In SharedWorker mode, create minimal result for compatibility
    console.log('[Main] Skipping system registration (SharedWorker handles this)');
    systemsResult = {
      metricsSystem: null as any,
      promptBuilder: promptBuilder,
      coreResult: {} as any,
    };
  }

  // ============================================================================
  // CHUNK SPATIAL QUERY INJECTION
  // ============================================================================
  // Inject ChunkSpatialQuery for optimized spatial queries
  // This provides chunk-based entity lookups for VisionProcessor, MovementSystem, and FarmBehaviors
  // Performance: Reduces queries from O(N) to O(C × E_avg) where C = chunks in radius
  const chunkSpatialQuery = new ChunkSpatialQuery(
    gameLoop.world,
    chunkManager,
    chunkManager.getChunkCaches()
  );

  // Create ChunkSpatialQuery and attach to world (unified approach)
  (world as any).setSpatialQuery(chunkSpatialQuery);
  console.log('[Main] SpatialQueryService attached to world');

  // Injection functions removed - world.spatialQuery is used instead
  // Set spatialQuery on World - systems/behaviors will access via world.spatialQuery
  world.setSpatialQuery(chunkSpatialQuery);
  console.log('[Main] ChunkSpatialQuery set on world.spatialQuery');

  // Create renderer (pass ChunkManager and TerrainGenerator so it shares the same instances with World)
  const renderer = new Renderer(canvas, chunkManager, terrainGenerator);

  // Initialize combat UI renderers
  renderer.initCombatUI(gameLoop.world, gameLoop.world.eventBus);

  // Set up viewport provider for ChunkLoadingSystem (visual mode)
  // This allows the system to load chunks around the camera viewport
  if (systemsResult.chunkLoadingSystem) {
    systemsResult.chunkLoadingSystem.setViewportProvider(() => ({
      x: renderer.getCamera().x,
      y: renderer.getCamera().y,
      width: canvas.width,
      height: canvas.height,
    }));
    console.log('[Main] ChunkLoadingSystem viewport provider configured');
  }

  // Apply render settings from saved settings
  renderer.set3DDrawDistance(settings.render.drawDistance3D);

  // Create input handler
  const inputHandler = new InputHandler(canvas, renderer.getCamera());

  // Create keyboard registry
  const keyboardRegistry = new KeyboardRegistry();

  // Register debug keyboard shortcut
  keyboardRegistry.register('toggle_temperature', {
    key: 'T',
    shift: true,
    description: 'Toggle temperature overlay on tiles',
    category: 'Debug',
    handler: () => {
      renderer.toggleTemperatureOverlay();
      const enabled = renderer.isTemperatureOverlayEnabled();
      showNotification(enabled ? 'Temperature overlay ON' : 'Temperature overlay OFF', '#4FC3F7');
      return true;
    },
  });

  // Register view mode toggle (V key)
  keyboardRegistry.register('toggle_view_mode', {
    key: 'V',
    description: 'Toggle between top-down and side-view modes',
    category: 'View',
    handler: () => {
      const camera = renderer.getCamera();
      const newMode = camera.toggleViewMode();
      // Show direction-specific name for side-view modes
      const modeNames: Record<string, string> = {
        top_down: 'Top-Down',
        face_north: 'Facing North ↑',
        face_south: 'Facing South ↓',
        face_east: 'Facing East →',
        face_west: 'Facing West ←',
      };
      const modeName = modeNames[newMode] ?? newMode;
      showNotification(`View: ${modeName}`, '#00CED1');
      return true;
    },
  });

  // Register timeline panel shortcut (Shift+L)
  keyboardRegistry.register('open_timeline', {
    key: 'L',
    shift: true,
    description: 'Open timeline/checkpoint browser',
    category: 'Time Travel',
    handler: () => {
      const timelinePanel = new TimelinePanel();

      // Get all checkpoints from save files
      saveLoadService.listSaves().then(saves => {
        // Convert save metadata to checkpoints
        const checkpoints = saves.map(save => ({
          key: save.key,
          name: save.name,
          day: (save as any).day || 0,  // TODO: Add day to save metadata
          tick: (save as any).tick || 0,
          timestamp: save.timestamp,
          universeId: (save as any).universeId || 'unknown',
          magicLawsHash: (save as any).magicLawsHash || 'base',
        }));

        timelinePanel.setTimelines(checkpoints);
        timelinePanel.show(async (checkpointKey) => {
          try {
            const result = await saveLoadService.load(checkpointKey, gameLoop.world);
            if (result.success) {
              showNotification(`Loaded: ${result.save?.header.name}`, '#4CAF50');
            } else {
              showNotification(`Failed to load: ${result.error}`, '#f44336');
            }
          } catch (error) {
            showNotification(`Error loading checkpoint: ${error}`, '#f44336');
          }
        });

        showNotification('Timeline browser opened', '#64B5F6');
      });

      return true;
    },
  });

  // Create building placement system
  const blueprintRegistry = new BuildingBlueprintRegistry();
  blueprintRegistry.registerDefaults();
  blueprintRegistry.registerExampleBuildings();
  // NOTE: Shops, farms, temples, and midwifery buildings are now registered
  // automatically in BuildingBlueprintRegistry constructor
  (gameLoop.world as any).buildingRegistry = blueprintRegistry;

  // Update GameIntrospectionAPI with buildingRegistry for building placement methods
  if ((gameLoop.world as any).__introspectionAPI) {
    (gameLoop.world as any).__introspectionAPI.buildingRegistry = blueprintRegistry;
  }

  const placementValidator = new PlacementValidator();
  const placementUI = new BuildingPlacementUI({
    registry: blueprintRegistry,
    validator: placementValidator,
    camera: renderer.getCamera(),
    eventBus: gameLoop.world.eventBus,
  });

  // Generate terrain only if NOT loading from a checkpoint
  // (terrain is restored from checkpoint by WorldSerializer)
  if (!loadedCheckpoint) {
    // Generate all starting chunks
    for (let cy = -1; cy <= 1; cy++) {
      for (let cx = -1; cx <= 1; cx++) {
        const chunk = chunkManager.getChunk(cx, cy);
        terrainGenerator.generateChunk(chunk, gameLoop.world as WorldMutator);
      }
    }

    // Link tile neighbors for O(1) graph traversal
    for (let cy = -1; cy <= 1; cy++) {
      for (let cx = -1; cx <= 1; cx++) {
        const chunk = chunkManager.getChunk(cx, cy);
        chunkManager.linkChunkNeighbors(chunk);
      }
    }

    // Update cross-chunk neighbors
    for (let cy = -1; cy <= 1; cy++) {
      for (let cx = -1; cx <= 1; cx++) {
        const chunk = chunkManager.getChunk(cx, cy);
        chunkManager.updateCrossChunkNeighbors(chunk);
      }
    }
  } else {
  }

  // Initialize divine configuration for this universe
  // Map magic spectrum preset to divine preset for consistent worldbuilding
  const magicToDivinePresetMap: Record<string, 'high_fantasy' | 'low_fantasy' | 'grimdark' | 'mythic' | 'monotheistic' | 'animistic' | 'deistic' | 'chaotic' | 'dying_gods' | 'ascendant' | 'balanced'> = {
    'mundane': 'deistic',          // No magic = distant gods
    'low_fantasy': 'low_fantasy',  // Rare magic = distant gods
    'classic_fantasy': 'balanced', // Standard D&D-style
    'mythic': 'high_fantasy',      // Gods walk among mortals
    'shinto_animism': 'animistic', // Many spirits
    'hard_magic': 'balanced',      // Magic as science, normal gods
    'literary_surrealism': 'chaotic', // Reality is flexible
    'wild_magic': 'chaotic',       // Unpredictable
    'dead_magic': 'dying_gods',    // Magic fading = gods fading
    'ai_village': 'high_fantasy',  // Rich experience
  };
  const selectedMagicPreset = universeConfigScreen
    ? (universeConfigScreen as any).selectedSpectrumPreset ?? 'ai_village'
    : 'ai_village';
  const divinePreset = magicToDivinePresetMap[selectedMagicPreset] ?? 'balanced';
  // Get universe name from config (set during universe creation) or use default
  const universeName = universeConfig?.universeName || 'Main Universe';

  const divineConfig = createUniverseConfig(
    gameLoop.universeId,
    universeName,
    divinePreset
  );
  (gameLoop.world as any).setDivineConfig(divineConfig);

  // Store universe name on the world for save/checkpoint naming
  (gameLoop.world as any)._universeName = universeName;
  console.log(`[Main] Universe name: "${universeName}"`);

  // Create notification system
  const notificationEl = document.createElement('div');
  notificationEl.style.cssText = `
    position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
    padding: 20px 40px; background-color: rgba(0, 0, 0, 0.85); color: #FFFFFF;
    font-family: monospace; font-size: 16px; border-radius: 8px;
    border: 2px solid #8B4513; display: none; z-index: 10000; pointer-events: none;
  `;
  document.body.appendChild(notificationEl);

  let notificationTimeout: number | null = null;

  function showNotification(message: string, color: string = '#FFFFFF') {
    if (notificationTimeout !== null) {
      clearTimeout(notificationTimeout);
    }

    notificationEl.textContent = message;
    notificationEl.style.borderColor = color;
    notificationEl.style.display = 'block';
    notificationEl.style.visibility = 'visible';
    notificationEl.style.opacity = '1';

    if (color === '#FF0000') {
      notificationEl.style.fontSize = '18px';
      notificationEl.style.fontWeight = 'bold';
      notificationEl.style.boxShadow = '0 0 20px rgba(255, 0, 0, 0.5)';
    } else {
      notificationEl.style.fontSize = '16px';
      notificationEl.style.fontWeight = 'normal';
      notificationEl.style.boxShadow = 'none';
    }

    const duration = color === '#FF0000' ? 3000 : 2000;
    notificationTimeout = window.setTimeout(() => {
      notificationEl.style.display = 'none';
      notificationTimeout = null;
    }, duration);
  }

  // Create UI panels (assign to module-level variable)
  panels = createUIPanels(
    gameLoop, canvas, renderer, chunkManager, terrainGenerator,
    systemsResult.craftingSystem, showNotification, settingsPanel
  );

  // Wire up agent roster panel camera focusing
  panels.agentRosterPanel.setOnAgentClick((agentId: string) => {
    // Properly select the agent (shows info panel, memory, relationships, etc.)
    handleEntitySelectionById(agentId, gameLoop);

    // Focus camera on the agent (works in both 2D and 3D modes)
    const entity = gameLoop.world.getEntity(agentId);
    if (entity) {
      const pos = entity.components.get('position') as any;
      if (pos) {
        renderer.centerCameraOnWorldPosition(pos.x, pos.y, pos.z || 0);
      }
    }
  });

  // Update agent roster panel once per minute
  intervalIds.push(setInterval(() => {
    panels.agentRosterPanel.updateFromWorld(gameLoop.world);
  }, 60000));

  // Wire up animal roster panel camera focusing
  panels.animalRosterPanel.setOnAnimalClick((animalId: string) => {
    // Properly select the animal (shows info panel and hides other panels)
    handleEntitySelectionById(animalId, gameLoop);

    // Focus camera on the animal (works in both 2D and 3D modes)
    const entity = gameLoop.world.getEntity(animalId);
    if (entity) {
      const pos = entity.components.get('position') as any;
      if (pos) {
        renderer.centerCameraOnWorldPosition(pos.x, pos.y, pos.z || 0);
      }
    }
  });

  // Update animal roster panel once per minute
  intervalIds.push(setInterval(() => {
    panels.animalRosterPanel.updateFromWorld(gameLoop.world);
  }, 60000));

  // Setup window manager
  const { windowManager, menuBar, controlsPanel, skillTreePanel, divineChatPanel } = setupWindowManager(
    canvas, renderer, panels, keyboardRegistry, showNotification
  );

  // Store reference for 3D entity selection callback
  windowManagerRef = windowManager;

  // Set up 3D entity selection callback
  renderer.setOnEntitySelected((entityId: string | null) => {
    handleEntitySelectionById(entityId, gameLoop);
  });

  // Build UI context
  const uiContext: UIContext = {
    agentInfoPanel: panels.agentInfoPanel,
    animalInfoPanel: panels.animalInfoPanel,
    plantInfoPanel: panels.plantInfoPanel,
    tileInspectorPanel: panels.tileInspectorPanel,
    memoryPanel: panels.memoryPanel,
    relationshipsPanel: panels.relationshipsPanel,
    notificationsPanel: panels.notificationsPanel,
    economyPanel: panels.economyPanel,
    shopPanel: panels.shopPanel,
    governancePanel: panels.governancePanel,
    cityStatsWidget: panels.cityStatsWidget,
    inventoryUI: panels.inventoryUI,
    craftingUI: panels.craftingUI,
    placementUI,
    windowManager,
    menuBar,
    keyboardRegistry,
    hoverInfoPanel: panels.hoverInfoPanel,
    skillTreePanel,
    divineChatPanel,
  };

  // Build game context
  const gameContext: GameContext = {
    gameLoop,
    renderer,
    canvas,
    chunkManager,
    terrainGenerator,
    showNotification,
  };

  // Setup event handlers
  setupEventHandlers(gameContext, uiContext, systemsResult.soilSystem);
  setupVisualEventHandlers(gameContext, uiContext);
  setupInputHandlers(gameContext, uiContext, inputHandler);

  // Render loop
  function renderLoop() {
    inputHandler.update();

    const selectedEntity = panels.agentInfoPanel.getSelectedEntity() || panels.animalInfoPanel.getSelectedEntity();
    renderer.render(gameLoop.world, selectedEntity);
    placementUI.render(renderer.getContext());

    const selectedAgentId = panels.agentInfoPanel.getSelectedEntityId();
    if (selectedAgentId) {
      const selectedAgentEntity = gameLoop.world.getEntity(selectedAgentId);
      if (selectedAgentEntity) {
        const inventory = selectedAgentEntity.getComponent('inventory');
        if (inventory && inventory.type === 'inventory') {
          panels.inventoryUI.setPlayerInventory(inventory);
        }
      }
    } else {
      const agents = gameLoop.world.query().with('agent').with('inventory').executeEntities();
      if (agents.length > 0) {
        const inventory = agents[0].getComponent('inventory');
        if (inventory && inventory.type === 'inventory') {
          panels.inventoryUI.setPlayerInventory(inventory);
        }
      }
    }

    const ctx = renderer.getContext();

    // Update city manager panel and widget
    panels.cityManagerPanel.update(gameLoop.world);
    panels.cityStatsWidget.update(gameLoop.world);

    windowManager.render(ctx, gameLoop.world);
    panels.shopPanel.render(ctx, gameLoop.world);

    // Render city stats widget
    panels.cityStatsWidget.render(ctx, canvas.width, canvas.height);

    menuBar.render(ctx);

    // Hover info panel (shows entity tooltips on hover)
    panels.hoverInfoPanel.render(ctx, canvas.width, canvas.height);

    requestAnimationFrame(renderLoop);
  }

  // Status update
  function updateStatus() {
    if (!statusEl) return;

    const stats = gameLoop.getStats();
    const timeEntities = gameLoop.world.query().with('time').executeEntities();
    let timeDisplay = '';

    if (timeEntities.length > 0) {
      const timeComp = timeEntities[0].components.get('time') as any;
      if (timeComp) {
        const hours = Math.floor(timeComp.timeOfDay);
        const minutes = Math.floor((timeComp.timeOfDay - hours) * 60);
        const phaseEmoji = timeComp.phase === 'day' ? '☀️' : timeComp.phase === 'night' ? '🌙' : timeComp.phase === 'dawn' ? '🌅' : '🌆';
        timeDisplay = ` | ${phaseEmoji} ${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')} (${timeComp.phase})`;
      }
    }

    statusEl.textContent = `Running - Tick ${stats.currentTick} - Avg: ${stats.avgTickTimeMs.toFixed(2)}ms${timeDisplay}`;
    statusEl.className = 'status running';
  }

  intervalIds.push(setInterval(updateStatus, 100));

  // Agent debug logging - runs every tick (~50ms at 20 TPS)
  // Only logs agents that are actively being tracked
  intervalIds.push(setInterval(() => {
    agentDebugManager.logTick(gameLoop.world);
  }, 50));

  // Only initialize new world if we didn't load a checkpoint
  if (!loadedCheckpoint) {

    // Create world entity
    const worldEntity = gameLoop.world.createEntity();
    const initialWeather = createWeatherComponent('clear', 0, 120);
    (worldEntity as any).addComponent(initialWeather);

    const initialTime = createTimeComponent(6, 600);
    (worldEntity as any).addComponent(initialTime);

    // Initialize named landmarks registry
    const namedLandmarksComponent = createNamedLandmarksComponent();
    (worldEntity as any).addComponent(namedLandmarksComponent);

    // Tag universe as proto-reality (Conservation of Game Matter)
    // During development phase, all universes are proto-realities from "the time before time"
    const protoRealityComponent = createProtoRealityComponent('dev-2026-01-03', {
      era: 'before_time',
      stability: 12,  // Low stability for proto-realities
      lore: 'A universe from the chaotic period when time itself was still being defined. Physics work differently here. Causality is... negotiable.',
      containsPrimordialArtifacts: true,
    });
    (worldEntity as any).addComponent(protoRealityComponent);

    // Initialize research state with some discovered papers for demo
    const researchState = createResearchStateComponent();
    // Add some completed beginner papers from herbal cultivation
    researchState.completed.add('herb_garden_planning');
    researchState.completed.add('soil_for_medicinal_plants');
    researchState.completed.add('herb_seed_selection');
    // Add some in-progress papers
    researchState.inProgress.set('perennial_herb_cultivation', {
      researchId: 'perennial_herb_cultivation',
      totalRequired: 100,
      currentProgress: 0.35, // 35% complete
      assignedAgents: [],
      startedAt: 0,
    });
    researchState.inProgress.set('wood_properties_construction', {
      researchId: 'wood_properties_construction',
      totalRequired: 100,
      currentProgress: 0.62, // 62% complete
      assignedAgents: [],
      startedAt: 0,
    });
    (worldEntity as any).addComponent(researchState);

    // Note: Magic system is automatically initialized by MagicSystem.initialize()
    // We just need to unlock spells for the selected paradigm
    const selectedParadigm = universeSelection.magicParadigm || 'none';

    if (selectedParadigm !== 'none') {

      // Unlock all spells that belong to the selected paradigm
      const spellRegistry = SpellRegistry.getInstance();
      const allSpells = spellRegistry.getAllSpells();

      let unlockedCount = 0;
      for (const spell of allSpells) {
        // Match spells that belong to this paradigm
        if (spell.paradigmId === selectedParadigm) {
          spellRegistry.unlockSpell(spell.id);
          unlockedCount++;
        }
      }

    } else {
    }

    // Create initial entities
    createInitialBuildings(gameLoop.world);
    const agentIds = createInitialAgents(gameLoop.world, settings.dungeonMasterPrompt);

    // Start game loop BEFORE soul creation so SoulCreationSystem.update() runs
    // (skip in SharedWorker mode - worker is already running)
    if (!isSharedWorkerMode) {
      gameLoop.start();
    } else {
      console.log('[Main] SharedWorker already running simulation');
    }

    // Create souls for the initial agents (displays modal before map loads)
    await createSoulsForInitialAgents(gameLoop, agentIds, llmProvider, renderer, universeConfig, isLLMAvailable);

    // Populate the roster panels with initial agents
    panels.agentRosterPanel.updateFromWorld(gameLoop.world);
    panels.animalRosterPanel.updateFromWorld(gameLoop.world);

    // Hide the universe config screen now that all souls are created
    if (universeConfigScreen) {
      universeConfigScreen.hide();
    }

    const playerDeityId = await createPlayerDeity(gameLoop.world);

    // Set the 2 most spiritual agents to believe in the player deity
    // Note: spirituality is on PersonalityComponent, not SpiritualComponent
    const agents = gameLoop.world.query().with('agent').executeEntities();
    const agentsWithSpirituality = agents
      .map(agent => {
        const personality = agent.components.get('personality') as any;
        const spiritual = agent.components.get('spiritual') as any;
        return {
          agent,
          spirituality: personality?.spirituality ?? 0,
          hasSpiritual: !!spiritual,
        };
      })
      .filter(a => a.spirituality > 0 && a.hasSpiritual)
      .sort((a, b) => b.spirituality - a.spirituality);

    // Only the top 2 most spiritual agents believe in the player deity initially
    const believersCount = Math.min(2, agentsWithSpirituality.length);
    const believers: { agent: any; name: string }[] = [];

    for (let i = 0; i < believersCount; i++) {
      const { agent, spirituality } = agentsWithSpirituality[i];
      const spiritual = agent.components.get('spiritual') as any;
      if (spiritual) {
        spiritual.believedDeity = playerDeityId;
        spiritual.faith = Math.max(spiritual.faith ?? 0, 0.5); // Ensure initial faith
        const identity = agent.components.get('identity') as any;
        const name = identity?.name ?? agent.id;
        believers.push({ agent, name });
      }
    }

    // If we have 2 believers, create a shared memory of their faith discussion
    if (believers.length >= 2) {
      const [believer1, believer2] = believers;
      const currentTick = gameLoop.world.tick;

      // Create shared memory of their conversation about faith
      const faithConversationSummary = `Had a deep conversation with ${believer2.name} about our shared faith in the divine presence we both feel. We spoke of signs and visions, and found comfort in knowing we are not alone in our belief.`;
      const faithConversationSummary2 = `Had a deep conversation with ${believer1.name} about our shared faith in the divine presence we both feel. We spoke of signs and visions, and found comfort in knowing we are not alone in our belief.`;

      const episodic1 = believer1.agent.components.get('episodic_memory') as any;
      const episodic2 = believer2.agent.components.get('episodic_memory') as any;

      if (episodic1?.formMemory) {
        episodic1.formMemory({
          eventType: 'conversation',
          summary: faithConversationSummary,
          timestamp: currentTick,
          participants: [believer2.agent.id],
          emotionalValence: 0.7,  // Positive experience
          emotionalIntensity: 0.6,
          socialSignificance: 0.8,  // Very socially significant
          importance: 0.85,  // High importance - foundational shared belief
        });
      }

      if (episodic2?.formMemory) {
        episodic2.formMemory({
          eventType: 'conversation',
          summary: faithConversationSummary2,
          timestamp: currentTick,
          participants: [believer1.agent.id],
          emotionalValence: 0.7,
          emotionalIntensity: 0.6,
          socialSignificance: 0.8,
          importance: 0.85,
        });
      }
    }

    await createInitialPlants(gameLoop.world);
    await createInitialAnimals(gameLoop.world, systemsResult.wildAnimalSpawning);

    // Center camera on spawn location (agents are at 0, 0)
    if (renderer && renderer.camera) {
      const spawnCenterWorldX = 0;
      const spawnCenterWorldY = 0;
      renderer.camera.setPosition(spawnCenterWorldX, spawnCenterWorldY);
      console.log(`[WorldInit] Camera centered on spawn location (${spawnCenterWorldX}, ${spawnCenterWorldY})`);
    }

    // Spawn berry bushes relative to spawn location
    const berrySpawnX = 0;
    const berrySpawnY = 0;
    const berryPositions = [
      { x: 6, y: 4 }, { x: -7, y: 5 }, { x: 8, y: -3 },
      { x: -6, y: -4 }, { x: 5, y: 7 }, { x: -8, y: 6 },
      { x: 7, y: -6 }, { x: -5, y: -7 }, { x: 9, y: 2 },
      { x: -9, y: -2 }, { x: 4, y: -8 }, { x: -4, y: 8 },
      { x: 10, y: 0 }, { x: -10, y: 1 }, { x: 0, y: 10 },
    ];
    berryPositions.forEach(pos => createBerryBush(gameLoop.world, berrySpawnX + pos.x, berrySpawnY + pos.y));

    // Spawn initial buildings at origin
    console.log('[WorldInit] Spawning initial buildings...');

    // Helper function to spawn a fully-built single-tile building
    const spawnBuilding = (type: BuildingType, x: number, y: number) => {
      const entity = gameLoop.world.createEntity();

      // Building component (fully built - progress=100)
      const building = createBuildingComponent(type, 1, 100);
      entity.addComponent(building);

      // Position
      const position = createPositionComponent(x, y);
      entity.addComponent(position);

      // Renderable
      const renderable = createRenderableComponent(type, 'building');
      entity.addComponent(renderable);

      // Add inventory for storage buildings
      if (type === BuildingType.StorageChest || type === BuildingType.StorageBox) {
        const inventory = createInventoryComponent(20, 500);
        entity.addComponent(inventory);
      }

      return entity;
    };

    // Spawn center matches agent spawn location
    const spawnCenterX = 0;
    const spawnCenterY = 0;

    // Campfire at spawn center
    spawnBuilding(BuildingType.Campfire, spawnCenterX, spawnCenterY);

    // Storage chest nearby
    spawnBuilding(BuildingType.StorageChest, spawnCenterX + 2, spawnCenterY);

    // Bedroll (temporary shelter)
    spawnBuilding(BuildingType.Bedroll, spawnCenterX - 2, spawnCenterY);

    // Spawn 5 houses to the right of the berry bush ring (x = 17-18)
    console.log('[WorldInit] Spawning 5 houses near berry ring...');

    // Import VoxelBuildings from core package
    const { SMALL_HOUSE } = await import('@ai-village/core');
    const houseBlueprint = SMALL_HOUSE;

    if (houseBlueprint) {
      const housePositions = [
        { x: 17, y: 0 },   // Center
        { x: 17, y: 5 },   // North
        { x: 17, y: -5 },  // South
        { x: 22, y: 2 },   // East-North
        { x: 22, y: -2 },  // East-South
      ];

      // Use the tile construction system to place houses with proper tile properties
      const tileSystem = getTileConstructionSystem();

      for (const pos of housePositions) {
        // Use stampLayoutInstantly to place tiles with correct properties
        const materials = {
          wall: (houseBlueprint.materials?.wall || 'wood') as any,
          floor: houseBlueprint.materials?.floor || 'wood',
          door: (houseBlueprint.materials?.door || 'wood') as any,
          window: 'glass' as any,
          roof: 'thatch' as any,  // Add roof material
        };

        // Place ground floor
        const tilesPlaced = tileSystem.stampLayoutInstantly(
          gameLoop.world,
          houseBlueprint.layout,
          pos.x,
          pos.y,
          materials,
          `initial_house_${pos.x}_${pos.y}_floor0`
        );

        console.log(`[WorldInit] Placed house ground floor at (${pos.x}, ${pos.y}) with ${tilesPlaced} tiles`);

        // Place upper floors/attics if they exist
        if (houseBlueprint.floors && houseBlueprint.floors.length > 0) {
          for (let floorIdx = 0; floorIdx < houseBlueprint.floors.length; floorIdx++) {
            const floor = houseBlueprint.floors[floorIdx];
            const upperTilesPlaced = tileSystem.stampLayoutInstantly(
              gameLoop.world,
              floor.layout,
              pos.x,
              pos.y,
              materials,
              `initial_house_${pos.x}_${pos.y}_floor${floor.level}`
            );
            console.log(`[WorldInit] Placed house floor ${floor.level} (${floor.name}) at (${pos.x}, ${pos.y}) with ${upperTilesPlaced} tiles`);
          }
        }

        // Scan layout for furniture symbols and spawn them
        for (let row = 0; row < houseBlueprint.layout.length; row++) {
          for (let col = 0; col < houseBlueprint.layout[row].length; col++) {
            const symbol = houseBlueprint.layout[row][col];
            const worldX = pos.x + col;
            const worldY = pos.y + row;

            if (symbol === 'B') {
              // Bed
              spawnBuilding(BuildingType.Bedroll, worldX, worldY);
            } else if (symbol === 'S') {
              // Storage chest
              spawnBuilding(BuildingType.StorageChest, worldX, worldY);
            }
          }
        }
      }
    }

    console.log('[WorldInit] Initial buildings spawned!');
  } else {
    // Start game loop for loaded checkpoints (new games already started it before soul creation)
    // (skip in SharedWorker mode - worker is already running)
    if (!isSharedWorkerMode) {
      gameLoop.start();
    }
  }

  // Expose gameLoop globally for API access (e.g., Interdimensional Cable recordings API)
  (window as any).__gameLoop = gameLoop;

  // Farming action handler
  gameLoop.world.eventBus.subscribe('action:requested', (event: any) => {
    const { eventType, actorId, plantId } = event.data;

    if (eventType === 'gather_seeds:requested') {
      gameLoop.actionQueue.enqueue({ type: 'gather_seeds', actorId, targetId: plantId });
    } else if (eventType === 'harvest:requested') {
      gameLoop.actionQueue.enqueue({ type: 'harvest', actorId, targetId: plantId });
    }
  });

  // Setup debug API
  setupDebugAPI(
    gameLoop, renderer, placementUI, blueprintRegistry,
    panels.agentInfoPanel, panels.animalInfoPanel, panels.resourcesPanel,
    devPanel, agentDebugManager, skillTreePanel
  );

  // Game loop already started before soul creation

  // Take initial snapshot for new universes so reloading returns to the same universe
  if (!loadedCheckpoint) {
    try {
      const worldUniverseName = (gameLoop.world as any)._universeName || 'Universe';
      const initialSaveName = `${worldUniverseName} - Genesis (Day 0)`;
      await saveLoadService.save(gameLoop.world, {
        name: initialSaveName,
        type: 'canonical',  // Mark as canonical so it's never decayed
      });
      console.log(`[InitialSave] Created genesis snapshot: ${initialSaveName}`);
    } catch (error) {
      console.error('[InitialSave] Failed to create initial snapshot:', error);
    }
  }

  renderLoop();

  // Set up periodic auto-saves every 5 minutes (real time)
  // Note: AutoSaveSystem also saves daily at midnight (game time) with canon events
  const AUTOSAVE_INTERVAL_MS = 300000; // 5 minutes
  intervalIds.push(setInterval(async () => {
    try {
      const timeComp = gameLoop.world.query().with('time').executeEntities()[0]?.getComponent<any>('time');
      const day = timeComp?.day || 0;
      const worldUniverseName = (gameLoop.world as any)._universeName || 'Universe';

      // Include universe name for distinguishing saves across different universes
      const saveName = `${worldUniverseName} - Autosave Day ${day}`;
      await saveLoadService.save(gameLoop.world, {
        name: saveName,
        type: 'auto',
      });

      // Run snapshot decay to thin out old saves
      // Progressive decay: Day 1 → every 2nd, Day 3 → every 4th, Day 5+ → midnight only
      try {
        const allSaves = await saveLoadService.listSaves();
        const snapshots = allSaves.map(save => toSnapshotInfo(save.key, {
          name: save.name,
          createdAt: save.createdAt,
          type: save.type as 'auto' | 'manual' | 'canonical' | undefined,
        }));

        const toDelete = snapshotDecayPolicy.getSnapshotsToDelete(snapshots, day);
        for (const snapshot of toDelete) {
          await saveLoadService.deleteSave(snapshot.key);
        }

        if (toDelete.length > 0) {
          console.log(`[SnapshotDecay] Removed ${toDelete.length} old snapshots`);
        }
      } catch (decayError) {
        console.error('[SnapshotDecay] Error during decay:', decayError);
      }
    } catch (error) {
      console.error('[Demo] Auto-save error:', error);
    }
  }, AUTOSAVE_INTERVAL_MS));


  setTimeout(() => {
    showNotification('💡 Tip: Right-click a grass tile, then press T to till it', '#00CED1');
  }, 3000);

  // Clean up intervals on page unload to prevent memory leaks
  window.addEventListener('beforeunload', () => {
    intervalIds.forEach((id) => clearInterval(id));
  });
}

// Start when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    main().catch(err => console.error('[Demo] FATAL ERROR in main():', err));
  });
} else {
  main().catch(err => console.error('[Demo] FATAL ERROR in main():', err));
}
