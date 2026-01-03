import {
  GameLoop,
  BuildingBlueprintRegistry,
  registerShopBlueprints,
  registerFarmBlueprints,
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
  createTimeComponent,
  FERTILIZERS,
  createBuildingComponent,
  createPositionComponent,
  createRenderableComponent,
  createWeatherComponent,
  createInventoryComponent,
  createNamedLandmarksComponent,
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
  // Phase 13: Research & Discovery
  registerDefaultResearch,
  // Metrics Collection System (with streaming support)
  MetricsCollectionSystem,
  // Live Entity API for dashboard queries
  LiveEntityAPI,
  // Governance Data System (Phase 11)
  GovernanceDataSystem,
  // Auto-save & Time Travel
  checkpointNamingService,
  saveLoadService,
  // Centralized system registration
  registerAllSystems as coreRegisterAllSystems,
  type SystemRegistrationResult as CoreSystemResult,
  // Magic system
  SpellRegistry,
  // Soul creation system
  SoulCreationSystem,
  createSoulLinkComponent,
  type SoulCreationContext,
  type IncarnationComponent,
} from '@ai-village/core';
import {
  Renderer,
  InputHandler,
  KeyboardRegistry,
  BuildingPlacementUI,
  AgentInfoPanel,
  AgentRosterPanel,
  ResearchLibraryPanel,
  AnimalInfoPanel,
  TileInspectorPanel,
  PlantInfoPanel,
  ResourcesPanel,
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
} from '@ai-village/renderer';
import {
  OllamaProvider,
  OpenAICompatProvider,
  ProxyLLMProvider,
  FallbackProvider,
  LLMDecisionQueue,
  StructuredPromptBuilder,
  promptLogger,
  type LLMProvider,
} from '@ai-village/llm';
import { TerrainGenerator, ChunkManager, createLLMAgent, createWanderingAgent, createBerryBush, getPlantSpecies } from '@ai-village/world';

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
  inventoryUI: InventoryUI;
  craftingUI: CraftingPanelUI;
  placementUI: BuildingPlacementUI;
  windowManager: WindowManager;
  menuBar: MenuBar;
  keyboardRegistry: KeyboardRegistry;
  hoverInfoPanel: UnifiedHoverInfoPanel;
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
  const campfireEntity = new EntityImpl(createEntityId(), (world as any)._tick);
  campfireEntity.addComponent(createBuildingComponent('campfire', 1, 100));
  campfireEntity.addComponent(createPositionComponent(-3, -3));
  campfireEntity.addComponent(createRenderableComponent('campfire', 'object'));
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

  // Choose one random agent to have divine connection (could be same as leader)
  const spiritualIndex = Math.floor(Math.random() * agentIds.length);
  const spiritualId = agentIds[spiritualIndex];
  const spiritualEntity = world.getEntity(spiritualId);

  if (spiritualEntity) {
    const currentPersonality = spiritualEntity.getComponent('personality') as any;
    if (currentPersonality) {
      spiritualEntity.updateComponent('personality', (p: any) => ({
        ...p,
        spirituality: 0.90,
        openness: Math.max(p.openness, 0.70),
      }));
    }
  }

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
  universeConfig: UniverseConfig | null
): Promise<void> {
  const soulSystem = gameLoop.systemRegistry.get('soul_creation') as SoulCreationSystem;
  if (!soulSystem) {
    console.warn('[Demo] SoulCreationSystem not found, skipping soul creation');
    return;
  }

  // Set the LLM provider for the Fates to use
  soulSystem.setLLMProvider(llmProvider);

  console.log(`[Demo] Creating souls for ${agentIds.length} initial agents...`);

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

    console.log(`[Demo] Creating soul ${index + 1}/${agentIds.length} for ${name}...`);

    // Wait for this soul to be created before starting the next
    await new Promise<void>((resolve) => {
      let resolved = false;
      let currentCeremonyData: any = null;

      // Subscribe to ceremony events for this soul
      const startSub = gameLoop.world.eventBus.subscribe('soul:ceremony_started', (event: any) => {
        console.log(`🌟 Ceremony started for ${name}`);
        currentCeremonyData = event.data;
        ceremonyModal.startCeremony({
          culture: event.data.context.culture,
          cosmicAlignment: event.data.context.cosmicAlignment,
        });
      });

      const thinkingSub = gameLoop.world.eventBus.subscribe('soul:fate_thinking', (event: any) => {
        ceremonyModal.setThinking(event.data.speaker);
      });

      const speakSub = gameLoop.world.eventBus.subscribe('soul:fate_speaks', (event: any) => {
        console.log(`${event.data.speaker}: ${event.data.text}`);
        ceremonyModal.addSpeech(event.data.speaker, event.data.text, event.data.topic);
      });

      const completeSub = gameLoop.world.eventBus.subscribe('soul:ceremony_complete', (event: any) => {
        console.log(`✨ Soul created for ${name}`);

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

        // Get first memory from universe scenario (not from ceremony transcript!)
        let firstMemory: string | undefined;
        if (universeConfig) {
          const scenario = SCENARIO_PRESETS.find(s => s.id === universeConfig.scenarioPresetId);
          firstMemory = scenario?.description || universeConfig.customScenarioText;
        }

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
            console.log('[SoulCreation] Player rejected soul, generating a new one...');

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
          }
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
  }

  console.log(`[Demo] All souls created successfully`);

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
  deityEntity.addComponent(new DeityComponent('The Nameless', 'player'));

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
    const isEdibleSpecies = species.id === 'berry-bush';

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
    { species: 'sheep', position: { x: -4, y: 3 } },
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
}

async function registerAllSystems(
  gameLoop: GameLoop,
  llmQueue: LLMDecisionQueue | null,
  promptBuilder: StructuredPromptBuilder | null
): Promise<SystemRegistrationResult> {
  // Register default materials and recipes before system registration
  const { registerDefaultMaterials } = await import('@ai-village/core');
  registerDefaultMaterials();
  initializeDefaultRecipes(globalRecipeRegistry);
  registerDefaultResearch();

  // Generate session ID for metrics
  const gameSessionId = `game_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  console.log(`[Demo] Game session ID: ${gameSessionId}`);

  // Use centralized system registration from @ai-village/core
  const coreResult = coreRegisterAllSystems(gameLoop, {
    llmQueue: llmQueue || undefined,
    promptBuilder: promptBuilder || undefined,
    gameSessionId,
    metricsServerUrl: 'ws://localhost:8765',
    enableMetrics: true,
    enableAutoSave: true,
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
      liveEntityAPI.attach(streamClient);
      console.log('[Demo] Live Entity API attached for dashboard queries');
    }
  }

  // Initialize governance data system
  coreResult.governanceDataSystem.initialize(gameLoop.world, gameLoop.world.eventBus);

  console.log('[Demo] All systems registered via centralized registration');

  return {
    soilSystem: coreResult.soilSystem,
    craftingSystem,
    wildAnimalSpawning: coreResult.wildAnimalSpawning,
    governanceDataSystem: coreResult.governanceDataSystem,
    metricsSystem: metricsSystem!,
    promptBuilder,
    coreResult,
  };
}

// ============================================================================
// UI PANEL CREATION
// ============================================================================

interface UIPanelsResult {
  agentInfoPanel: AgentInfoPanel;
  agentRosterPanel: AgentRosterPanel;
  animalInfoPanel: AnimalInfoPanel;
  plantInfoPanel: PlantInfoPanel;
  resourcesPanel: ResourcesPanel;
  memoryPanel: MemoryPanel;
  relationshipsPanel: RelationshipsPanel;
  notificationsPanel: NotificationsPanel;
  economyPanel: EconomyPanel;
  shopPanel: ShopPanel;
  governancePanel: GovernanceDashboardPanel;
  inventoryUI: InventoryUI;
  craftingUI: CraftingPanelUI;
  settingsPanel: SettingsPanel;
  tileInspectorPanel: TileInspectorPanel;
  controlsPanel: ControlsPanel;
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

  const agentRosterPanel = new AgentRosterPanel(renderer.pixelLabLoader);

  const animalInfoPanel = new AnimalInfoPanel();
  const plantInfoPanel = new PlantInfoPanel();
  const resourcesPanel = new ResourcesPanel();
  const memoryPanel = new MemoryPanel();
  const relationshipsPanel = new RelationshipsPanel();
  const notificationsPanel = new NotificationsPanel();
  const economyPanel = new EconomyPanel();
  const shopPanel = new ShopPanel();
  const governancePanel = new GovernanceDashboardPanel();
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
    chunkManager,
    terrainGenerator
  );

  // Create placeholder for controlsPanel - will be initialized after windowManager
  const controlsPanel = null as any;

  return {
    agentInfoPanel,
    agentRosterPanel,
    animalInfoPanel,
    plantInfoPanel,
    resourcesPanel,
    memoryPanel,
    relationshipsPanel,
    notificationsPanel,
    economyPanel,
    shopPanel,
    governancePanel,
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
): { windowManager: WindowManager; menuBar: MenuBar; controlsPanel: ControlsPanel } {
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

  // Agent Roster Panel
  const agentRosterPanel = new AgentRosterPanel();
  windowManager.registerWindow('agent-roster', agentRosterPanel, {
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
    menuCategory: 'info',
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
  const devPanel = new DevPanel();
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

  return { windowManager, menuBar, controlsPanel };
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
    onKeyDown: (key, shiftKey, ctrlKey) => {
      return handleKeyDown(
        key, shiftKey, ctrlKey,
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
  gameContext: GameContext,
  uiContext: UIContext
): boolean {
  const { gameLoop, renderer, showNotification } = gameContext;
  const {
    agentInfoPanel, tileInspectorPanel, inventoryUI, craftingUI,
    placementUI, windowManager, keyboardRegistry
  } = uiContext;

  // Check keyboard registry first
  if (keyboardRegistry.handleKey(key, shiftKey, ctrlKey)) {
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
      const speciesId = 'berry-bush';
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
    placementUI, windowManager, menuBar
  } = uiContext;

  // Left click - window management and menu bar
  if (button === 0) {
    if (menuBar.handleClick(screenX, screenY)) {
      return true;
    }

    if (windowManager.handleDragStart(screenX, screenY)) {
      return true;
    }

    if (windowManager.handleClick(screenX, screenY)) {
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
  resourcesPanel: ResourcesPanel
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

  // Create game loop
  const gameLoop = new GameLoop();

  // Create settings panel
  const settingsPanel = new SettingsPanel();

  // Handle first run
  if (settingsPanel.getIsFirstRun()) {
    await new Promise<void>((resolve) => {
      const originalCallback = settingsPanel['onSettingsChange'];
      settingsPanel.setOnSettingsChange(() => {
        if (originalCallback) {
          settingsPanel.setOnSettingsChange(originalCallback);
        }
        resolve();
      });
      settingsPanel.show();
    });
  }

  const settings = settingsPanel.getSettings();

  // Create LLM provider - use ProxyLLMProvider by default for server-side API calls and rate limiting
  let llmProvider: LLMProvider;

  // Check if we should use the proxy provider (default: yes, unless settings explicitly configure direct provider)
  const useProxy = settings.llm.provider !== 'openai-compat-direct' && settings.llm.provider !== 'ollama';

  if (useProxy) {
    // Default: Use ProxyLLMProvider for server-side API calls with automatic fallback
    console.log('[DEMO] Using ProxyLLMProvider - server handles API keys and rate limiting');
    llmProvider = new ProxyLLMProvider('http://localhost:8766');
  } else {
    // Legacy mode: Direct client-side API calls (for local Ollama or explicit settings)
    console.log('[DEMO] Using direct LLM provider (no proxy)');
    const providers: LLMProvider[] = [];

    // Check for API keys in .env file (legacy client-side mode)
    const groqApiKey = import.meta.env.VITE_GROQ_API_KEY || import.meta.env.GROQ_API_KEY;
    const cerebrasApiKey = import.meta.env.VITE_CEREBRAS_API_KEY || import.meta.env.CEREBRAS_API_KEY;

    // 1. Primary: Cerebras with Qwen 3-32B
    if (cerebrasApiKey) {
      console.log('[DEMO] Provider 1: Cerebras → Qwen 3-32B');
      providers.push(new OpenAICompatProvider(
        'qwen-3-32b',
        'https://api.cerebras.ai/v1',
        cerebrasApiKey
      ));
    }

    // 2. Secondary: Groq with Qwen 3-32B (backup for provider 1)
    if (groqApiKey) {
      console.log('[DEMO] Provider 2: Groq → Qwen 3-32B');
      providers.push(new OpenAICompatProvider(
        'qwen/qwen3-32b',
        'https://api.groq.com/openai/v1',
        groqApiKey
      ));
    }

    // 3. Tertiary: Cerebras with GPT-OSS-120B
    if (cerebrasApiKey) {
      console.log('[DEMO] Provider 3: Cerebras → GPT-OSS-120B');
      providers.push(new OpenAICompatProvider(
        'gpt-oss-120b',
        'https://api.cerebras.ai/v1',
        cerebrasApiKey
      ));
    }

    // 4. Quaternary: Groq with GPT-OSS-120B (last resort)
    if (groqApiKey) {
      console.log('[DEMO] Provider 4: Groq → GPT-OSS-120B (last resort)');
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
      console.log(`[DEMO] Using FallbackProvider with ${providers.length} providers: ${providers.map(p => p.getProviderId()).join(' → ')}`);
      llmProvider = new FallbackProvider(providers, {
        retryAfterMs: 60000,        // Retry failed provider after 1 minute
        maxConsecutiveFailures: 3,   // Disable after 3 consecutive failures
        logFallbacks: true,
      });
    } else {
      llmProvider = providers[0];
    }
  }

  const isLLMAvailable = await llmProvider.isAvailable();
  let llmQueue: LLMDecisionQueue | null = null;
  let promptBuilder: StructuredPromptBuilder | null = null;

  if (isLLMAvailable) {
    llmQueue = new LLMDecisionQueue(llmProvider, 1);
    promptBuilder = new StructuredPromptBuilder();

    // Wire up checkpoint naming service with LLM
    checkpointNamingService.setProvider(llmProvider);
    console.log('[DEMO] Checkpoint naming service configured with LLM');
  } else {
    console.warn(`[DEMO] LLM not available at ${settings.llm.baseUrl}`);
    console.warn('[DEMO] Press ESC to open settings and configure LLM provider');
    console.warn('[DEMO] Checkpoints will use default names (e.g., "Day 5")');
  }

  // Initialize storage backend for save/load system FIRST
  const { IndexedDBStorage } = await import('@ai-village/core');
  const storage = new IndexedDBStorage('ai-village-saves');
  saveLoadService.setStorage(storage);

  // Check for existing saves and auto-load the most recent one
  const existingSaves = await saveLoadService.listSaves();
  let loadedCheckpoint = false;
  let universeSelection: { type: 'new' | 'load'; magicParadigm?: string; checkpointKey?: string };
  let universeConfigScreen: UniverseConfigScreen | null = null;
  let universeConfig: UniverseConfig | null = null;  // Store full config for scenario access

  if (existingSaves.length > 0) {
    // Auto-load the most recent save
    const mostRecent = existingSaves[0]; // Saves are sorted by timestamp descending
    console.log(`[Demo] Auto-loading most recent save: ${mostRecent.name}`);

    const result = await saveLoadService.load(mostRecent.key, gameLoop.world);
    if (result.success) {
      console.log(`[Demo] Successfully loaded: ${result.metadata.name}`);
      loadedCheckpoint = true;
      universeSelection = { type: 'load', checkpointKey: mostRecent.key };
    } else {
      console.error(`[Demo] Failed to load checkpoint: ${result.error}`);
      console.log('[Demo] Falling back to new game creation');
      // Fall back to showing universe creation screen
      universeSelection = await new Promise<{ type: 'new'; magicParadigm: string }>((resolve) => {
        universeConfigScreen = new UniverseConfigScreen();
        universeConfigScreen.show((config) => {
          universeConfig = config;  // Store full config for scenario access
          resolve({ type: 'new', magicParadigm: config.magicParadigmId || 'none' });
        });
      });
    }
  } else {
    // No saves - show universe creation screen
    console.log('[Demo] No existing saves found - showing universe creation');
    universeSelection = await new Promise<{ type: 'new'; magicParadigm: string }>((resolve) => {
      universeConfigScreen = new UniverseConfigScreen();
      universeConfigScreen.show((config) => {
        universeConfig = config;  // Store full config for scenario access
        resolve({ type: 'new', magicParadigm: config.magicParadigmId || 'none' });
      });
    });
  }

  // Register settings change handler NOW (after storage is initialized)
  settingsPanel.setOnSettingsChange(async () => {
    // Take a snapshot (save) before reload to preserve agents and world state
    // This is part of the time travel/multiverse checkpoint system
    try {
      console.log('[Demo] Settings changed - taking snapshot before reload...');
      const timeComp = gameLoop.world.query().with('time').executeEntities()[0]?.getComponent<any>('time');
      const day = timeComp?.day || 0;
      const saveName = `settings_reload_day${day}_${new Date().toISOString().split('T')[1].split('.')[0].replace(/:/g, '-')}`;
      await saveLoadService.save(gameLoop.world, { name: saveName });
      console.log(`[Demo] Snapshot saved: ${saveName}`);
    } catch (error) {
      console.error('[Demo] Failed to save before reload:', error);
      // Continue with reload even if save fails
    }
    window.location.reload();
  });

  // Register all systems
  const systemsResult = await registerAllSystems(gameLoop, llmQueue, promptBuilder);

  // Create renderer
  const renderer = new Renderer(canvas);

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
              showNotification(`Loaded: ${result.metadata.name}`, '#4CAF50');
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
  registerShopBlueprints(blueprintRegistry);
  registerFarmBlueprints(blueprintRegistry);
  (gameLoop.world as any).buildingRegistry = blueprintRegistry;

  const placementValidator = new PlacementValidator();
  const placementUI = new BuildingPlacementUI({
    registry: blueprintRegistry,
    validator: placementValidator,
    camera: renderer.getCamera(),
    eventBus: gameLoop.world.eventBus,
  });

  // Generate terrain
  const terrainGenerator = new TerrainGenerator('phase8-demo');
  const chunkManager = new ChunkManager(3);

  for (let cy = -1; cy <= 1; cy++) {
    for (let cx = -1; cx <= 1; cx++) {
      const chunk = chunkManager.getChunk(cx, cy);
      terrainGenerator.generateChunk(chunk, gameLoop.world as WorldMutator);
    }
  }

  (gameLoop.world as any).setChunkManager(chunkManager);
  (gameLoop.world as any).setTerrainGenerator(terrainGenerator);

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

  // Create UI panels
  const panels = createUIPanels(
    gameLoop, canvas, renderer, chunkManager, terrainGenerator,
    systemsResult.craftingSystem, showNotification, settingsPanel
  );

  // Wire up agent roster panel camera focusing
  panels.agentRosterPanel.setOnAgentClick((agentId: string) => {
    const entity = gameLoop.world.getEntity(agentId);
    if (entity) {
      const pos = entity.components.get('position') as any;
      if (pos && renderer.camera) {
        renderer.camera.centerOn(pos.x, pos.y);
        panels.agentRosterPanel.touchAgent(agentId);
      }
    }
  });

  // Update agent roster panel once per minute
  setInterval(() => {
    panels.agentRosterPanel.updateFromWorld(gameLoop.world);
  }, 60000);

  // Setup window manager
  const { windowManager, menuBar, controlsPanel } = setupWindowManager(
    canvas, renderer, panels, keyboardRegistry, showNotification
  );

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
    inventoryUI: panels.inventoryUI,
    craftingUI: panels.craftingUI,
    placementUI,
    windowManager,
    menuBar,
    keyboardRegistry,
    hoverInfoPanel: panels.hoverInfoPanel,
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
    windowManager.render(ctx, gameLoop.world);
    panels.shopPanel.render(ctx, gameLoop.world);
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

  setInterval(updateStatus, 100);

  // Only initialize new world if we didn't load a checkpoint
  if (!loadedCheckpoint) {
    console.log(`[Demo] Creating new world with magic paradigm: ${universeSelection.magicParadigm || 'none'}`);

    // Create world entity
    const worldEntity = gameLoop.world.createEntity();
    const initialWeather = createWeatherComponent('clear', 0, 120);
    (worldEntity as any).addComponent(initialWeather);

    const initialTime = createTimeComponent(6, 600);
    (worldEntity as any).addComponent(initialTime);

    // Initialize named landmarks registry
    const namedLandmarksComponent = createNamedLandmarksComponent();
    (worldEntity as any).addComponent(namedLandmarksComponent);

    // Note: Magic system is automatically initialized by MagicSystem.initialize()
    // We just need to unlock spells for the selected paradigm
    const selectedParadigm = universeSelection.magicParadigm || 'none';

    if (selectedParadigm !== 'none') {
      console.log(`[Demo] Enabling magic paradigm: ${selectedParadigm}`);

      // Unlock all spells that belong to the selected paradigm
      const spellRegistry = SpellRegistry.getInstance();
      const allSpells = spellRegistry.getAllSpells();

      let unlockedCount = 0;
      for (const spell of allSpells) {
        // Match spells that belong to this paradigm
        if (spell.paradigmId === selectedParadigm) {
          spellRegistry.unlockSpell(spell.id);
          console.log(`[Demo] Unlocked spell: ${spell.name} (${spell.id})`);
          unlockedCount++;
        }
      }

      console.log(`[Demo] Magic system configured with '${selectedParadigm}' paradigm (${unlockedCount} spells unlocked)`);
    } else {
      console.log('[Demo] Magic system disabled (The First World)');
    }

    // Create initial entities
    createInitialBuildings(gameLoop.world);
    const agentIds = createInitialAgents(gameLoop.world, settings.dungeonMasterPrompt);

    // Start game loop BEFORE soul creation so SoulCreationSystem.update() runs
    gameLoop.start();

    // Create souls for the initial agents (displays modal before map loads)
    await createSoulsForInitialAgents(gameLoop, agentIds, llmProvider, renderer, universeConfig);
    console.log('[Demo] All souls created, continuing initialization...');

    // Hide the universe config screen now that all souls are created
    if (universeConfigScreen) {
      universeConfigScreen.hide();
      console.log('[Demo] Universe config screen hidden');
    }

    const playerDeityId = await createPlayerDeity(gameLoop.world);
    console.log('[Demo] Player deity created:', playerDeityId); // Create player deity for belief system

    // Set all agents to believe in the player deity
    const agents = gameLoop.world.query().with('agent').executeEntities();
    for (const agent of agents) {
      const spiritual = agent.components.get('spiritual');
      if (spiritual) {
        (spiritual as any).believedDeity = playerDeityId;
      }
    }

    await createInitialPlants(gameLoop.world);
    await createInitialAnimals(gameLoop.world, systemsResult.wildAnimalSpawning);

    // Spawn berry bushes
    const berryPositions = [
      { x: 6, y: 4 }, { x: -7, y: 5 }, { x: 8, y: -3 },
      { x: -6, y: -4 }, { x: 5, y: 7 }, { x: -8, y: 6 },
      { x: 7, y: -6 }, { x: -5, y: -7 }, { x: 9, y: 2 },
      { x: -9, y: -2 }, { x: 4, y: -8 }, { x: -4, y: 8 },
      { x: 10, y: 0 }, { x: -10, y: 1 }, { x: 0, y: 10 },
    ];
    berryPositions.forEach(pos => createBerryBush(gameLoop.world, pos.x, pos.y));
  } else {
    console.log('[Demo] Skipping world initialization - loaded from checkpoint');
  }

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
    panels.agentInfoPanel, panels.animalInfoPanel, panels.resourcesPanel
  );

  // Game loop already started before soul creation
  console.log('[Demo] Starting render loop - map should now be visible');
  renderLoop();

  // Set up periodic auto-saves every minute
  const AUTOSAVE_INTERVAL_MS = 60000; // 1 minute
  setInterval(async () => {
    console.log('[Demo] Auto-save interval triggered');
    try {
      const timeComp = gameLoop.world.query().with('time').executeEntities()[0]?.getComponent<any>('time');
      const day = timeComp?.day || 0;
      const tick = timeComp?.currentTick || 0;

      const saveName = `autosave_day${day}_${new Date().toISOString().split('T')[1].split('.')[0].replace(/:/g, '-')}`;
      console.log(`[Demo] Calling save with name: ${saveName}`);
      await saveLoadService.save(gameLoop.world, { name: saveName });
      console.log(`[Demo] Auto-save successful: ${saveName}`);
    } catch (error) {
      console.error('[Demo] Auto-save error:', error);
    }
  }, AUTOSAVE_INTERVAL_MS);

  console.log(`[Demo] Auto-save enabled - saving every ${AUTOSAVE_INTERVAL_MS / 1000} seconds`);

  setTimeout(() => {
    showNotification('💡 Tip: Right-click a grass tile, then press T to till it', '#00CED1');
  }, 3000);
}

// Start when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    main().catch(err => console.error('[Demo] FATAL ERROR in main():', err));
  });
} else {
  main().catch(err => console.error('[Demo] FATAL ERROR in main():', err));
}
