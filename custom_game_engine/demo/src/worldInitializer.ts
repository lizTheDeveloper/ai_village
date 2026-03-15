/**
 * World initialization functions for the MVEE demo.
 *
 * Creates the initial entities (buildings, agents, souls, deity, plants, animals)
 * that populate a new game world.
 *
 * Extracted from src/main.ts (MUL-1027)
 */

import {
  EntityImpl,
  createEntityId,
  createBuildingComponent,
  createPositionComponent,
  createRenderableComponent,
  createInventoryComponent,
  WildAnimalSpawningSystem,
  SoulCreationSystem,
  createSoulLinkComponent,
  GameLoop,
  type WorldMutator,
  type UniverseConfig,
  type SoulCreationContext,
  type IncarnationComponent,
  canSpawnNPC,
  getMaxNPCs,
  generateSettlementId,
  createSettlementComponent,
} from '@ai-village/core';
import { type LLMProvider } from '@ai-village/llm';
import { createLLMAgent } from '@ai-village/agents';

// ============================================================================
// INITIAL WORLD POPULATION
// ============================================================================

export function createInitialBuildings(world: WorldMutator) {
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

export function createInitialAgents(
  world: WorldMutator,
  dungeonMasterPrompt?: string,
  settlementId?: string
): string[] {
  const agentCount = 5;
  const centerX = 0;
  const centerY = 0;
  const spread = 2;

  const agentIds: string[] = [];

  // Generate settlement ID if not provided
  const effectiveSettlementId = settlementId || generateSettlementId();
  const currentTick = (world as any).tick ?? 0;

  for (let i = 0; i < agentCount; i++) {
    if (!canSpawnNPC(world)) {
      console.warn(`[Agents] NPC cap reached (${getMaxNPCs()}), stopping spawn at ${i}/${agentCount}`);
      break;
    }
    const offsetX = (i % 3) - 1;
    const offsetY = Math.floor(i / 3) - 0.5;
    const x = centerX + offsetX * spread + Math.random() * 0.5;
    const y = centerY + offsetY * spread + Math.random() * 0.5;

    const agentId = createLLMAgent(world, x, y, 2.0, dungeonMasterPrompt);
    agentIds.push(agentId);

    // Add settlement component to each agent
    const agentEntity = world.getEntity(agentId);
    if (agentEntity) {
      const isFounder = i === 0; // First agent is the founder
      agentEntity.addComponent(createSettlementComponent(
        effectiveSettlementId,
        isFounder ? 'founder' : 'member',
        currentTick
      ));
    }
  }

  console.log(`[Agents] Created ${agentCount} agents in settlement ${effectiveSettlementId}`);

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
 * Shows progress messages during creation - no modal dialogs
 */
export async function createSoulsForInitialAgents(
  gameLoop: GameLoop,
  agentIds: string[],
  llmProvider: LLMProvider,
  universeConfig: UniverseConfig | null,
  isLLMAvailable: boolean,
  apiBaseUrl: string,
  onProgress?: (message: string) => void
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

  // Report start of soul weaving
  if (onProgress) {
    onProgress('✨ The Three Fates begin weaving souls...');
  }

  // Create souls in parallel - let them all start at once
  const soulPromises = agentIds.map(async (agentId, _index) => {
    const agent = gameLoop.world.getEntity(agentId);
    if (!agent) return;

    const identity = agent.components.get('identity') as any;
    const name = identity?.name ?? 'Unknown';

    // Report this soul's creation
    if (onProgress) {
      onProgress(`🧵 Weaving soul for ${name}...`);
    }

    // Wait for this soul to be created
    const ceremonyPromise = new Promise<void>((resolve) => {
      // Subscribe to ceremony events for this soul
      const completeSub = gameLoop.world.eventBus.subscribe('soul:ceremony_complete', (event: any) => {
        // Check if this event is for our agent
        if (event.data.agentId !== agentId && event.data.soulId) {
          // Check if soul is linked to this agent
          const soulEntity = gameLoop.world.getEntity(event.data.soulId);
          const incarnation = soulEntity?.components.get('incarnation') as any;
          if (!incarnation || incarnation.primaryBindingId !== agentId) {
            return; // Not our soul, skip
          }
        }

        // This is our soul - process it
        completeSub(); // Unsubscribe

        // Report completion
        if (onProgress) {
          onProgress(`💫 ${name}'s soul woven (${event.data.archetype})`);
        }

        // Send soul to server repository for persistence
        fetch(`${apiBaseUrl}/api/souls/save`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            soulId: event.data.soulId,
            agentId: event.data.agentId || agentId,
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

        // Link soul to agent
        const soulLink = createSoulLinkComponent(event.data.soulId, gameLoop.world.tick, true);
        (agent as any).addComponent(soulLink);

        // Update agent's spirituality based on the Fates' decision (archetype/interests)
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
      soulSystem.requestSoulCreation(context, (_soulEntityId: string) => {
        // Soul creation callback - the ceremony events will handle the rest
      });
    });

    return ceremonyPromise;
  });

  // Wait for all souls to be created
  await Promise.all(soulPromises);

  if (onProgress) {
    onProgress('✅ All souls woven by the Fates!');
  }
}

export async function createPlayerDeity(world: WorldMutator): Promise<string> {
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

export async function createInitialPlants(world: WorldMutator) {
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

export async function createInitialAnimals(world: WorldMutator, spawningSystem: WildAnimalSpawningSystem) {
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
