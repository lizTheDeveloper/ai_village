import {
  EntityImpl,
  createEntityId,
  type WorldMutator,
  createPositionComponent,
  createPhysicsComponent,
  createRenderableComponent,
  createTagsComponent,
  createAgentComponent,
  createMovementComponent,
  createNeedsComponent,
  createMemoryComponent,
  createVisionComponent,
  createConversationComponent,
  createRelationshipComponent,
  createInventoryComponent,
  createTemperatureComponent,
  createCircadianComponent,
  generateRandomPersonality,
  generateRandomName,
  createIdentityComponent,
  EpisodicMemoryComponent,
  SemanticMemoryComponent,
  SocialMemoryComponent,
  ReflectionComponent,
  JournalComponent,
  // Navigation & Exploration components
  SpatialMemoryComponent,
  TrustNetworkComponent,
  BeliefComponent,
  SocialGradientComponent,
  ExplorationStateComponent,
  createSteeringComponent,
  createVelocityComponent,
} from '@ai-village/core';

/**
 * Generate a unique think offset for an agent based on their entity ID
 * This prevents all agents from thinking at the same time (thundering herd)
 */
function generateThinkOffset(entityId: string, maxOffset: number = 40): number {
  // Simple hash of entity ID to get consistent but distributed offset
  let hash = 0;
  for (let i = 0; i < entityId.length; i++) {
    hash = ((hash << 5) - hash) + entityId.charCodeAt(i);
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash) % maxOffset;
}

export function createWanderingAgent(
  world: WorldMutator,
  x: number,
  y: number,
  speed: number = 2.0
): string {
  const entity = new EntityImpl(createEntityId(), world.tick);

  // Position
  entity.addComponent(createPositionComponent(x, y));

  // Physics - agents are not solid (can pass through each other)
  entity.addComponent(createPhysicsComponent(false, 1, 1));

  // Renderable
  entity.addComponent(createRenderableComponent('agent', 'entity'));

  // Tags
  entity.addComponent(createTagsComponent('agent', 'wanderer'));

  // Identity - give agent a name
  entity.addComponent(createIdentityComponent(generateRandomName()));

  // Personality - random personality traits
  entity.addComponent(generateRandomPersonality());

  // Agent behavior - with staggered think offset to prevent thundering herd
  const thinkInterval = 20;
  const thinkOffset = generateThinkOffset(entity.id, thinkInterval * 2);
  entity.addComponent(createAgentComponent('wander', thinkInterval, false, thinkOffset));

  // Movement
  entity.addComponent(createMovementComponent(speed, 0, 0));

  // Needs - hunger, energy, health, decay rates
  // Note: Energy depletion is now handled by NeedsSystem based on activity level and game time
  // Hunger decay rate: 0.42 points/second at 1x speed (48s/day) = once per game day eating (50→30 in 48s)
  entity.addComponent(createNeedsComponent(
    100,    // hunger (start full)
    80,     // energy (start at 80 - well-rested but not max)
    100,    // health (start healthy)
    0.42,   // hungerDecayRate (points per second) - adjusted for 48s game day
    0.5     // energyDecayRate (deprecated, kept for compatibility)
  ));

  // Memory - remember up to 20 things, decay 1 point/sec
  entity.addComponent(createMemoryComponent(20, 1.0));

  // Vision - see 10 tiles around, can see both agents and resources
  entity.addComponent(createVisionComponent(10, 360, true, true));

  // Conversation - can talk to other agents, remember last 10 messages
  entity.addComponent(createConversationComponent(10));

  // Relationships - track familiarity with other agents
  entity.addComponent(createRelationshipComponent());

  // Inventory - carry resources (24 slots per spec REQ-INV-003, 100 weight capacity)
  const inventory = createInventoryComponent(24, 100);
  // Add starting items for playtest verification (per playtest agent feedback)
  inventory.slots[0] = { itemId: 'wood', quantity: 5 };
  inventory.slots[1] = { itemId: 'stone', quantity: 3 };
  inventory.slots[2] = { itemId: 'berry', quantity: 8 };
  entity.addComponent(inventory);

  // Temperature - comfort range 18-24°C, tolerance 0-35°C
  entity.addComponent(
    createTemperatureComponent(
      20, // currentTemp (start at comfortable room temp)
      18, // comfortMin
      24, // comfortMax
      0,  // toleranceMin
      35  // toleranceMax
    )
  );

  // Circadian rhythm - sleep drive and preferred sleep time
  entity.addComponent(createCircadianComponent());

  // Episodic memory system (Phase 10)
  entity.addComponent(new EpisodicMemoryComponent({ maxMemories: 1000 }));
  entity.addComponent(new SemanticMemoryComponent());
  entity.addComponent(new SocialMemoryComponent());
  entity.addComponent(new ReflectionComponent());
  entity.addComponent(new JournalComponent());

  // Navigation & Exploration components (Phase 4.5)
  entity.addComponent(new SpatialMemoryComponent());
  entity.addComponent(new TrustNetworkComponent());
  entity.addComponent(new BeliefComponent());
  entity.addComponent(new SocialGradientComponent());
  entity.addComponent(new ExplorationStateComponent());
  entity.addComponent(createSteeringComponent('wander', speed, speed * 2));
  entity.addComponent(createVelocityComponent(0, 0));

  // Add to world
  (world as any)._addEntity(entity);

  return entity.id;
}

/**
 * Create an LLM-controlled agent that uses an AI model for decision making.
 */
export function createLLMAgent(
  world: WorldMutator,
  x: number,
  y: number,
  speed: number = 2.0,
  dungeonMasterPrompt?: string
): string {
  const entity = new EntityImpl(createEntityId(), world.tick);

  // Position
  entity.addComponent(createPositionComponent(x, y));

  // Physics - agents are not solid (can pass through each other)
  entity.addComponent(createPhysicsComponent(false, 1, 1));

  // Renderable
  entity.addComponent(createRenderableComponent('agent', 'entity'));

  // Tags
  entity.addComponent(createTagsComponent('agent', 'llm_agent'));

  // Identity - give agent a name
  entity.addComponent(createIdentityComponent(generateRandomName()));

  // Personality - random personality traits
  entity.addComponent(generateRandomPersonality());

  // Agent behavior - LLM-controlled with staggered think offset to prevent thundering herd
  const thinkInterval = 20;
  const thinkOffset = generateThinkOffset(entity.id, thinkInterval * 2);
  entity.addComponent(createAgentComponent('wander', thinkInterval, true, thinkOffset)); // useLLM = true

  // Movement
  entity.addComponent(createMovementComponent(speed, 0, 0));

  // Needs - hunger, energy, health, decay rates
  // Note: Energy depletion is now handled by NeedsSystem based on activity level and game time
  // Hunger decay rate: 0.42 points/second at 1x speed (48s/day) = once per game day eating (50→30 in 48s)
  entity.addComponent(createNeedsComponent(
    100,    // hunger (start full)
    80,     // energy (start at 80 - well-rested but not max)
    100,    // health (start healthy)
    0.42,   // hungerDecayRate (points per second) - adjusted for 48s game day
    0.5     // energyDecayRate (deprecated, kept for compatibility)
  ));

  // Memory - remember up to 20 things, decay 1 point/sec
  entity.addComponent(createMemoryComponent(20, 1.0));

  // Vision - see 10 tiles around, can see both agents and resources
  entity.addComponent(createVisionComponent(10, 360, true, true));

  // Conversation - can talk to other agents, remember last 10 messages
  entity.addComponent(createConversationComponent(10));

  // Relationships - track familiarity with other agents
  entity.addComponent(createRelationshipComponent());

  // Inventory - carry resources (24 slots per spec REQ-INV-003, 100 weight capacity)
  const inventory = createInventoryComponent(24, 100);
  // Add starting items for playtest verification (per playtest agent feedback)
  inventory.slots[0] = { itemId: 'wood', quantity: 5 };
  inventory.slots[1] = { itemId: 'stone', quantity: 3 };
  inventory.slots[2] = { itemId: 'berry', quantity: 8 };
  entity.addComponent(inventory);

  // Temperature - comfort range 18-24°C, tolerance 0-35°C
  entity.addComponent(
    createTemperatureComponent(
      20, // currentTemp (start at comfortable room temp)
      18, // comfortMin
      24, // comfortMax
      0,  // toleranceMin
      35  // toleranceMax
    )
  );

  // Circadian rhythm - sleep drive and preferred sleep time
  entity.addComponent(createCircadianComponent());

  // Episodic memory system (Phase 10)
  const episodicMemory = new EpisodicMemoryComponent({ maxMemories: 1000 });
  entity.addComponent(episodicMemory);
  entity.addComponent(new SemanticMemoryComponent());
  entity.addComponent(new SocialMemoryComponent());
  entity.addComponent(new ReflectionComponent());
  entity.addComponent(new JournalComponent());

  // Navigation & Exploration components (Phase 4.5)
  entity.addComponent(new SpatialMemoryComponent());
  entity.addComponent(new TrustNetworkComponent());
  entity.addComponent(new BeliefComponent());
  entity.addComponent(new SocialGradientComponent());
  entity.addComponent(new ExplorationStateComponent());
  entity.addComponent(createSteeringComponent('wander', speed, speed * 2));
  entity.addComponent(createVelocityComponent(0, 0));

  // Add initial "waking up" memory from Dungeon Master prompt
  if (dungeonMasterPrompt) {
    episodicMemory.formMemory({
      eventType: 'awakening',
      summary: dungeonMasterPrompt,
      timestamp: world.tick,
      location: { x, y },
      emotionalValence: 0.2, // Slightly positive - hopeful beginning
      emotionalIntensity: 0.7, // Quite intense - first memory
      surprise: 0.9, // Very surprising - just woke up!
      importance: 1.0, // Maximum importance - defines their origin story
      novelty: 1.0, // Completely novel - first experience
      socialSignificance: 0.8, // High social - mentions working together
      survivalRelevance: 0.9, // High survival - mentions survival and making a village
      clarity: 1.0, // Crystal clear
      consolidated: true, // Immediately consolidated - this is foundational
      markedForConsolidation: false, // Already consolidated
    });
  }

  // Add to world
  (world as any)._addEntity(entity);

  return entity.id;
}
